from __future__ import annotations
from typing import List
from antlr4 import CommonTokenStream, InputStream
import ast
from antlr4.error.ErrorListener import ErrorListener
from transpiler_utils import _CollectingErrorListener, _maybe_template
from EconLangLexer import EconLangLexer
from EconLangParser import EconLangParser
from EconLangVisitor import EconLangVisitor
from typing import Optional, List as _List
from transpiler_utils import (
    _render_select_items,
    _render_select_item,
    _source_sql,
    _id_list,
    _extract_id_list_from_arg,
)


BIN_OP_MAP = {
    'MUL': '*', 'DIV': '/', 'ADD': '+', 'SUB': '-',
}
CMP_OP_MAP = {'EQ': '==', 'NEQ': '!=', 'LT': '<', 'LE': '<=', 'GT': '>', 'GE': '>='}

class Transpiler(EconLangVisitor):
    def __init__(self, uid):
        self.lines = []
        self.indent = 0
        self._sql_where = False
        self._sql_dfvar = None
        self._user_id = uid
        self._registered_udfs = set()
        self._in_sql = False  # generic flag: we're rendering SQL parts (expressions should stay SQL-ish)
        try:
            import econ_runtime as _rt 
            rt_all = getattr(_rt, '__all__', None)
            if rt_all is None:
                self.runtime_funcs = {k for k in dir(_rt) if not k.startswith('_')}
            else:
                self.runtime_funcs = set(rt_all)
        except Exception:
            self.runtime_funcs = set()
        self.user_funcs = set() 

    def emit(self, line: str = ""):
        self.lines.append("    " * self.indent + line)

    def _normalize_sql_tokens(self, sql: str) -> str:
        """Insert spaces around SQL keywords/operators to avoid glued tokens.
        This preserves double-quoted string literals by temporarily replacing
        them with placeholders.
        """
        import re
        # Extract double-quoted string literals
        strs = []
        def _str_repl(m):
            i = len(strs)
            strs.append(m.group(0))
            return f"__STR_{i}__"
        without_strs = re.sub(r'"(?:[^"\\]|\\.)*"', _str_repl, sql)

        # Keywords to ensure spacing around (lowercased list). Use word-boundary
        # matching to avoid inserting spaces inside identifiers (e.g. don't split
        # 'join' into 'jo in'). We use a single substitution per keyword and
        # surround matches with spaces, then collapse runs of spaces.
        kws = [
            'case','when','then','else','end','select','from','where','group','by',
            'order','limit','offset','union','intersect','except','join','on','using',
            'distinct','as','count','sum','avg','min','max','in','exists','between',
            'and','or','not'
        ]
        t = without_strs
        import re as _re
        for kw in kws:
            pattern = r'(?i)\b' + _re.escape(kw) + r'\b'
            t = _re.sub(pattern, lambda m: ' ' + m.group(0) + ' ', t)

        # Also ensure operators have spaces: = <> != <= >= < > + - * / ( ) ,
        t = re.sub(r'([=<>!]+)', r' \1 ', t)
        t = re.sub(r'([+\-*/(),])', r' \1 ', t)

        # Collapse multiple spaces to single
        t = re.sub(r'\s+', ' ', t).strip()

        # Restore string literals
        for i, s in enumerate(strs):
            t = t.replace(f'__STR_{i}__', s)
        return t

    def visitProgram(self, ctx: EconLangParser.ProgramContext):
        self.emit("from econ_runtime import *")
        self.emit(f"from users.{self._user_id} import *")
        self.emit(f"set_current_user('{self._user_id}')")
        for st in ctx.statement():
            if st.functionDef():
                self.user_funcs.add(st.functionDef().ID().getText())
        for st in ctx.statement():
            self.visit(st)
        return "\n".join(self.lines) + "\n"

    def visitStatement(self, ctx: EconLangParser.StatementContext):
        if ctx.declaration():
            code = self.visit(ctx.declaration())
            self.emit(code)
        elif ctx.assignment():
            code = self.visit(ctx.assignment())
            self.emit(code)
        elif ctx.functionDef():
            self.visit(ctx.functionDef())
        elif ctx.ifStatement():
            self.visit(ctx.ifStatement())
        elif ctx.loopStatement():
            self.visit(ctx.loopStatement())
        elif ctx.returnStatement():
            self.emit(self.visit(ctx.returnStatement()))
        elif ctx.alertStatement():
            self.emit(self.visit(ctx.alertStatement()))
        elif ctx.expression():
            self.emit(self.visit(ctx.expression()))
        return None

    def visitDeclaration(self, ctx: EconLangParser.DeclarationContext):
        return f"{ctx.ID().getText()} = {self.visit(ctx.expression())}"

    def visitAssignment(self, ctx: EconLangParser.AssignmentContext):
        return f"{ctx.ID().getText()} = {self.visit(ctx.expression())}"

    def visitFunctionDef(self, ctx: EconLangParser.FunctionDefContext):
        name = ctx.ID().getText()
        params = []
        if ctx.paramList():
            params = [t.getText() for t in ctx.paramList().ID()]
        self.emit(f"def {name}({', '.join(params)}):")
        self.indent += 1
        self.visit(ctx.block())
        self.indent -= 1
        return None

    def visitIfStatement(self, ctx: EconLangParser.IfStatementContext):
        cond = self.visit(ctx.expression())
        self.emit(f"if {cond}:")
        self.indent += 1
        self.visit(ctx.block(0))
        self.indent -= 1
        if ctx.block(1):
            self.emit("else:")
            self.indent += 1
            self.visit(ctx.block(1))
            self.indent -= 1
        return None

    def visitLoopStatement(self, ctx: EconLangParser.LoopStatementContext):
        if ctx.getChild(0).getText() == 'for':
            it_var = ctx.ID().getText()
            iterable = self.visit(ctx.expression())
            # Wrap iterables with __rows(...) so `for p in y` iterates rows when y is a DataFrame
            self.emit(f"for {it_var} in __rows({iterable}):")
            self.indent += 1
            self.visit(ctx.block())
            self.indent -= 1
        else:
            cond = self.visit(ctx.expression())
            self.emit(f"while {cond}:")
            self.indent += 1
            self.visit(ctx.block())
            self.indent -= 1
        return None

    def visitBlock(self, ctx: EconLangParser.BlockContext):
        for st in ctx.statement():
            self.visit(st)
        return None

    def visitReturnStatement(self, ctx: EconLangParser.ReturnStatementContext):
        return f"return {self.visit(ctx.expression())}"

    def visitAlertStatement(self, ctx: EconLangParser.AlertStatementContext):
        cond = self.visit(ctx.expression())
        addr = ctx.STRING().getText()
        return f"send_alert_email(f'Condition met: {cond} -> {addr}')"

    def visitExpression(self, ctx: EconLangParser.ExpressionContext):
        return self.visit(ctx.orExpr())

    def visitOrExpr(self, ctx: EconLangParser.OrExprContext):
        parts = [self.visit(c) for c in ctx.andExpr()]
        if getattr(self, "_sql_where", False):
            return " | ".join(f"({p})" for p in parts)
        return " or ".join(parts)

    def visitAndExpr(self, ctx: EconLangParser.AndExprContext):
        parts = [self.visit(c) for c in ctx.equalityExpr()]
        if getattr(self, "_sql_where", False):
            return " & ".join(f"({p})" for p in parts)
        return " and ".join(parts)

    def visitEqualityExpr(self, ctx: EconLangParser.EqualityExprContext):
        out = [self.visit(ctx.relationalExpr(0))]
        for i in range(1, len(ctx.relationalExpr())):
            op_token = ctx.getChild(2*i - 1).getText()
            out.append(op_token)
            out.append(self.visit(ctx.relationalExpr(i)))
        return " ".join(out)

    def visitRelationalExpr(self, ctx: EconLangParser.RelationalExprContext):
        # Handle several relational patterns explicitly: IN (list|subquery), BETWEEN, IS NULL, EXISTS(subquery)
        # EXISTS case
        if ctx.EXISTSKW():
            # EXISTS '(' sqlQuery ')'
            try:
                return f"EXISTS({self.visit(ctx.sqlQuery(0))})"
            except Exception:
                return ctx.getText()

        # IN case (could be IN (exprList) or IN (sqlQuery))
        if ctx.IN():
            left = self.visit(ctx.additiveExpr(0))
            # prefer sqlQuery inside IN
            try:
                if ctx.sqlQuery():
                    right_sql = self.visit(ctx.sqlQuery(0))
                    return f"{left} IN ({right_sql})"
            except Exception:
                pass
            # try exprList
            try:
                if ctx.exprList():
                    items = [self.visit(e) for e in ctx.exprList(0).expression()]
                    return f"{left} IN ({', '.join(items)})"
            except Exception:
                pass

        # BETWEEN, IS NULL, LIKE and simple comparisons are handled by walking additiveExpr parts
        out = [self.visit(ctx.additiveExpr(0))]
        # Iterate through children to preserve mixed operators (use getChild to capture tokens)
        child_count = ctx.getChildCount()
        i = 1
        # We already consumed additiveExpr(0); now scan remaining children
        while i < child_count:
            ch = ctx.getChild(i)
            txt = ch.getText()
            # If child is a rule (additiveExpr), render it
            # Terminal tokens (like BETWEEN, AND, IS, LIKE, comparison ops) are included via txt
            out.append(txt)
            i += 1
            # if next child is a rule (e.g., additiveExpr) include its rendered form
            if i < child_count:
                nxt = ctx.getChild(i)
                # If this child has children, it's likely a rule context
                if getattr(nxt, 'getChildCount', lambda: 0)() > 0:
                    out.append(self.visit(nxt))
                    i += 1
        # join with spaces and normalize multiple spaces
        return " ".join(out)

    def visitAdditiveExpr(self, ctx: EconLangParser.AdditiveExprContext):
        terms = [self.visit(m) for m in ctx.multiplicativeExpr()]
        ops = [ctx.getChild(2*i - 1).getText() for i in range(1, len(ctx.multiplicativeExpr()))]
        if ops and all(op == '+' for op in ops):
            def _is_str_lit(t: str) -> bool:
                return (len(t) >= 2 and ((t.startswith('"') and t.endswith('"')) or (t.startswith("'") and t.endswith("'"))))
            if any(_is_str_lit(t) for t in terms):
                coerced = [t if _is_str_lit(t) else f"str({t})" for t in terms]
                return " + ".join(coerced)
        out = [terms[0]]
        for i, op in enumerate(ops, start=1):
            out.append(op)
            out.append(terms[i])
        return " ".join(out)

    def visitMultiplicativeExpr(self, ctx: EconLangParser.MultiplicativeExprContext):
        out = [self.visit(ctx.unaryExpr(0))]
        for i in range(1, len(ctx.unaryExpr())):
            op_token = ctx.getChild(2*i - 1).getText()
            out.append(op_token)
            out.append(self.visit(ctx.unaryExpr(i)))
        return " ".join(out)

    def visitUnaryExpr(self, ctx: EconLangParser.UnaryExprContext):
        if ctx.NOT():
            return f"not {self.visit(ctx.unaryExpr())}"
        return self.visit(ctx.primary())

    def visitPrimary(self, ctx: EconLangParser.PrimaryContext):
        if ctx.sqlQuery():
            # Preserve explicit parentheses around a subquery: if primary was written as
            # '(' sqlQuery ')' we should return the inner SQL wrapped in parentheses so
            # the outer SQL remains valid (e.g. WHERE col = (select ...)).
            try:
                if ctx.getChild(0).getText() == '(':
                    return '(' + self.visit(ctx.sqlQuery()) + ')'
            except Exception:
                pass
            return self.visit(ctx.sqlQuery())
        if ctx.caseExpr():
            return self.visit(ctx.caseExpr())
        if ctx.functionCall():
            return self.visit(ctx.functionCall())
        if ctx.dataLoad():
            return self.visit(ctx.dataLoad())
        if ctx.forecastCall():
            return self.visit(ctx.forecastCall())
        if ctx.indicatorCall():
            return self.visit(ctx.indicatorCall())
        if ctx.arrayExpr():
            return self.visit(ctx.arrayExpr())
        # AT_VAR token: variable injection marker like @a
        if ctx.AT_VAR():
            # return raw token (e.g. '@a') so later processing can convert it into
            # a python f-string placeholder or treat it as a function name.
            return ctx.AT_VAR().getText()
        # Handle identifiers: support qualified ids via qid (e.g. a.ds)
        if getattr(ctx, 'qid', None) and ctx.qid():
            qname = ctx.qid().getText()
            # If we're in a SQL-style WHERE mapped to a dataframe var and the
            # qname is a plain identifier (no dot), map to dataframe lookup
            if self._sql_where and self._sql_dfvar and '.' not in qname:
                return f"{self._sql_dfvar}[{repr(qname)}]"
            return qname
        id_accessor = getattr(ctx, 'ID', None)
        if id_accessor and id_accessor():
            name = id_accessor().getText()
            if self._sql_where and self._sql_dfvar:
                return f"{self._sql_dfvar}[{repr(name)}]"
            return name
        if ctx.NUMBER():
            return ctx.NUMBER().getText()
        if ctx.STRING():
            # Convert DSL double-quoted strings into SQL-safe single-quoted literals.
            raw = ctx.STRING().getText()  # includes surrounding quotes
            # Allow template/f-strings: _maybe_template would return an f-prefixed string.
            maybe = self._maybe_template(raw)
            if isinstance(maybe, str) and maybe.startswith('f'):
                # maybe looks like f"..." or f'...'
                # extract inner text without leading f and surrounding quotes
                q = maybe[1]
                inner = maybe[2:-1]
                # escape single quotes for SQL
                inner_escaped = inner.replace("'", "''")
                return "f'" + inner_escaped + "'"
            # Non-template: evaluate escape sequences and produce SQL single-quoted literal
            try:
                val = ast.literal_eval(raw)
            except Exception:
                # fallback: strip surrounding quotes naively
                val = raw[1:-1]
            sql_lit = "'" + val.replace("'", "''") + "'"
            return sql_lit
        if ctx.DATE():
            return repr(ctx.DATE().getText())
        if ctx.expression():
            return f"({self.visit(ctx.expression())})"
        return ""

    def visitSqlQuery(self, ctx: EconLangParser.SqlQueryContext):
        # New grammar: sqlQuery -> selectCore (setOperator selectCore)* (ORDER BY ...)? limitClause?
        # Track whether we're nested inside another SQL render. If nested, return raw SQL
        # so it can be embedded in the outer query instead of being wrapped in exec_sql().
        was_in_sql = self._in_sql
        self._in_sql = True
        cores = [ctx.selectCore(i) for i in range(len(ctx.selectCore()))]
        sql_parts: list[str] = []
        # Render first core
        if cores:
            sql_parts.append(self._render_select_core(cores[0]))
        # Set operators (render tokens with spaces, e.g. 'union all')
        sc_index = 1
        for i in range(len(ctx.setOperator())):
            sop = ctx.setOperator(i)
            op_text = self._render_set_operator(sop)
            sql_parts.append(op_text)
            sql_parts.append(self._render_select_core(cores[sc_index]))
            sc_index += 1
        # ORDER BY
        if ctx.orderList():
            order_items = []
            for oi in ctx.orderList().orderItem():
                # orderItem: (expression | NUMBER) (ASC | DESC)? (NULLS (FIRST | LAST))?
                if oi.expression():
                    expr = self.visit(oi.expression())
                else:
                    # NUMBER literal
                    expr = oi.NUMBER().getText()
                if getattr(oi, 'ASC', None) and oi.ASC():
                    expr = expr + ' asc'
                if getattr(oi, 'DESC', None) and oi.DESC():
                    expr = expr + ' desc'
                if getattr(oi, 'NULLS', None) and oi.NULLS():
                    if getattr(oi, 'FIRST', None) and oi.FIRST():
                        expr = expr + ' nulls first'
                    elif getattr(oi, 'LAST', None) and oi.LAST():
                        expr = expr + ' nulls last'
                order_items.append(expr)
            sql_parts.append('order by ' + ', '.join(order_items))
        # LIMIT/OFFSET
        if ctx.limitClause():
            lc = ctx.limitClause()
            # Grammar supports LIMIT/OFFSET in either order and accepts NUMBER or @var.
            # Extract raw child texts in order and pick limit/offset values by keyword.
            child_texts = [lc.getChild(i).getText() for i in range(lc.getChildCount())]
            lowered = [t.lower() for t in child_texts]
            if 'limit' in lowered:
                i = lowered.index('limit')
                if i + 1 < len(child_texts):
                    sql_parts.append('limit ' + child_texts[i+1])
            if 'offset' in lowered:
                i = lowered.index('offset')
                if i + 1 < len(child_texts):
                    sql_parts.append('offset ' + child_texts[i+1])
        # Join parts and normalize token spacing to avoid glued keywords
        sql = ' '.join(sql_parts)
        sql = self._normalize_sql_tokens(sql)
        sql_escaped = sql.replace('"', '""')
        import re
        forced_funcs = set()
        def _at_func_repl(m):
            fname = m.group(1)
            forced_funcs.add(fname)
            return fname + '('
        sql_after_funcs = re.sub(r'@([A-Za-z_][A-Za-z0-9_]*)\s*\(', _at_func_repl, sql_escaped)
        def _at_var_repl(m):
            name = m.group(1)
            if name in forced_funcs:
                return '@'+name 
            return '{' + name + '}'
        sql_final = re.sub(r'@([A-Za-z_][A-Za-z0-9_]*)', _at_var_repl, sql_after_funcs)
        sql_final = re.sub(r'@([A-Za-z_][A-Za-z0-9_]*)\(', r'\1(', sql_final)
        if (sql_final != sql_escaped) or forced_funcs:
            # Emit compact UDF registration calls that delegate actual DuckDB
            # registration to the runtime helper `register_udf`. This keeps
            # generated code small and readable while still registering only
            # the functions that are actually used.
            for fn in sorted(forced_funcs):
                if fn in self._registered_udfs:
                    continue
                self._registered_udfs.add(fn)
                # register_udf is safe and returns False on failure; no try/except
                # wrapper needed in generated code.
                self.emit("# auto-register UDF for @" + fn)
                self.emit(f"register_udf('{fn}', {fn})")
            # if this call is nested inside another SQL rendering, return raw SQL text
            if was_in_sql:
                self._in_sql = was_in_sql
                return sql
            self._in_sql = was_in_sql
            return f"exec_sql(f\"{sql_final}\")"
        # not using forced funcs
        if was_in_sql:
            self._in_sql = was_in_sql
            return sql
        self._in_sql = was_in_sql
        return f"exec_sql(\"{sql_escaped}\")"

    def _render_set_operator(self, sop):
        # Render set operator with spaces between tokens (handles UNION [ALL], INTERSECT, EXCEPT)
        parts = []
        if getattr(sop, 'UNIONKW', None) and sop.UNIONKW():
            parts.append(sop.UNIONKW().getText().lower())
        if getattr(sop, 'ALLKW', None) and sop.ALLKW():
            parts.append(sop.ALLKW().getText().lower())
        if getattr(sop, 'INTERSECTKW', None) and sop.INTERSECTKW():
            parts.append(sop.INTERSECTKW().getText().lower())
        if getattr(sop, 'EXCEPTKW', None) and sop.EXCEPTKW():
            parts.append(sop.EXCEPTKW().getText().lower())
        return ' '.join(parts)

    def _render_select_core(self, core):
        # selectCore: SELECTKW (DISTINCTKW | ALLKW)? selectItems (FROM tableRef (joinClause)*)? (WHEREKW expression)? (GROUPKW BYKW groupByList)? (HAVINGKW expression)?
        parts: list[str] = ['select']
        # DISTINCT / ALL
        if core.DISTINCTKW():
            parts.append('distinct')
        elif core.ALLKW():
            parts.append('all')
        # items
        parts.append(self._render_select_items(core.selectItems()))
        # FROM and joins
        if core.tableRef():
            parts.append('from')
            parts.append(self._render_table_ref(core.tableRef()))
            for j in core.joinClause():
                parts.append(self._render_join_clause(j))
        # Collect expressions in order (WHERE then HAVING if present)
        expr_ctxs = list(core.expression())  # returns list-like; ORDER is grammar sequence
        idx = 0
        if core.WHEREKW():
            if idx < len(expr_ctxs):
                parts.append('where')
                parts.append(self.visit(expr_ctxs[idx]))
                idx += 1
        # GROUP BY
        if core.groupByList():
            parts.append('group by')
            parts.append(', '.join(self.visit(e) for e in core.groupByList().expression()))
        # HAVING
        if core.HAVINGKW():
            # HAVING expression is next (or only) expression after WHERE/group by
            # If WHERE absent idx==0; if WHERE present idx==1
            if idx < len(expr_ctxs):
                parts.append('having')
                parts.append(self.visit(expr_ctxs[idx]))
        return ' '.join(parts)

    def _render_table_ref(self, tref):
        src = tref.source()
        # Function/data load: register temp table
        if src.functionCall() or src.dataLoad():
            py_expr = self.visit(src.functionCall() or src.dataLoad())
            tmp_name = f"__tbl_{len(self.lines)}"
            self.emit(f"{tmp_name} = {py_expr}")
            self.emit(f"register_table('{tmp_name}', {tmp_name})")
            base = tmp_name
        elif src.sqlQuery():
            base = f"({self.visit(src.sqlQuery())})"
        else:
            base = src.ID().getText()
        if tref.alias():
            a = tref.alias()
            if a.getChildCount() == 2 and a.getChild(0).getText().lower() == 'as':
                return f"{base} {a.ID().getText()}"
            return f"{base} {a.getText()}"
        return base

    def _render_join_clause(self, j):
        # joinClause: (NATURALKW)? (INNERKW | LEFTKW | RIGHTKW | FULLKW | CROSSKW)? (OUTERKW)? JOINKW tableRef (ONKW expression | USINGKW '(' idList ')')
        parts: list[str] = []
        prefix_tokens = []
        for t in ['NATURALKW','INNERKW','LEFTKW','RIGHTKW','FULLKW','CROSSKW','OUTERKW']:
            tok = getattr(j, t)()
            if tok:
                prefix_tokens.append(tok.getText().lower())
        parts.extend(prefix_tokens)
        parts.append('join')
        parts.append(self._render_table_ref(j.tableRef()))
        # ON / USING
        if j.ONKW():
            # expression after ON is j.expression(0)
            parts.append('on')
            # expression() may return a single context or a list-like; handle both
            exprs = []
            try:
                exprs = list(j.expression())
            except TypeError:
                maybe = j.expression()
                if maybe is not None:
                    exprs = [maybe]
            if exprs:
                parts.append(self.visit(exprs[0]))
        elif j.USINGKW():
            parts.append('using(' + ', '.join(j.idList().getText().split(',')) + ')')
        return ' '.join(parts)

    def visitCaseExpr(self, ctx: EconLangParser.CaseExprContext):
        # Render CASE expression as SQL if inside SQL; else convert to Python conditional chain.
        if self._in_sql:
                parts: list[str] = ["case"]
                when_clauses = list(ctx.whenClause())
                else_clause = ctx.elseClause()

                # Detect optional base expression: grammar is CASE expression? whenClause+ ...
                has_base = False
                # child(1) will be the base expression if present, otherwise a WhenClause
                if ctx.getChildCount() > 1 and type(ctx.getChild(1)).__name__ != 'WhenClauseContext':
                    # safe to fetch expression(0) as base
                    if ctx.expression() and ctx.expression(0):
                        base_expr = ctx.expression(0)
                        parts.append(self.visit(base_expr))
                        has_base = True

                # WHEN ... THEN ... pairs
                for w in when_clauses:
                    cond = self.visit(w.expression(0))
                    val = self.visit(w.expression(1))
                    parts.extend(["when", cond, "then", val])

                # ELSE ...
                if else_clause:
                    parts.extend(["else", self.visit(else_clause.expression())])

                parts.append("end")
                # Join with single spaces and return
                return " ".join(parts)
        when_clauses = ctx.whenClause()
        else_clause = ctx.elseClause()
        base_expr = ctx.expression(0) if ctx.expression() and (len(ctx.expression()) - len(when_clauses) - (1 if else_clause else 0)) == 1 else None
        # Distinguish simple vs searched CASE: If first expression precedes WHENs treat as base
        if base_expr and (base_expr.getText() == when_clauses[0].getChild(1).getText()):
            base_expr = None  # fallback if ambiguous
        if base_expr:
            bx = self.visit(base_expr)
            pairs = []
            for w in when_clauses:
                cond = self.visit(w.expression(0))
                val = self.visit(w.expression(1))
                pairs.append((cond, val))
            else_val = self.visit(else_clause.expression()) if else_clause else "None"
            # Simple CASE: compare base_expr to each WHEN expression
            chain = else_val
            for cond, val in reversed(pairs):
                chain = f"({val} if {bx} == {cond} else {chain})"
            return chain
        # Searched CASE
        pairs = []
        for w in when_clauses:
            cond = self.visit(w.expression(0))
            val = self.visit(w.expression(1))
            pairs.append((cond, val))
        else_val = self.visit(else_clause.expression()) if else_clause else "None"
        chain = else_val
        for cond, val in reversed(pairs):
            chain = f"({val} if {cond} else {chain})"
        return chain

    def _render_select_items(self, sctx): 
        return _render_select_items(self, sctx)

    def _render_select_item(self, si):
        return _render_select_item(self, si)

    def _source_sql(self, ctx: EconLangParser.SourceContext) -> str:
        return _source_sql(self, ctx)

    def _id_list(self, lctx):
        return _id_list(lctx)


    def visitSource(self, ctx: EconLangParser.SourceContext):
        if ctx.ID():
            return ctx.ID().getText()
        if ctx.functionCall():
            return '(' + self.visit(ctx.functionCall()) + ')'
        if ctx.dataLoad():
            return '(' + self.visit(ctx.dataLoad()) + ')'
        if ctx.sqlQuery():
            inner = self.visit(ctx.sqlQuery())
            return '(' + inner + ')'
        return ''

    def visitFunctionCall(self, ctx: EconLangParser.FunctionCallContext):
        fname = ctx.funcName().getText()
        args: list[str] = []
        prefix = ''
        # Support DISTINCT inside aggregate calls: funcArgs: DISTINCT arg (',' arg)* | argList
        if getattr(ctx, 'funcArgs', None) and ctx.funcArgs():
            fa = ctx.funcArgs()
            # When grammar exposes DISTINCTKW directly under funcArgs
            if hasattr(fa, 'DISTINCTKW') and fa.DISTINCTKW():
                args = [self.visit(a) for a in fa.arg()]
                prefix = 'distinct '
            elif hasattr(fa, 'argList') and fa.argList():
                args = [self.visit(a) for a in fa.argList().arg()]
        else:
            # Back-compat if grammar exposes argList directly (older artifacts)
            if hasattr(ctx, 'argList') and ctx.argList():
                args = [self.visit(a) for a in ctx.argList().arg()]
        if prefix:
            if args:
                return f"{fname}({prefix}{', '.join(args)})"
            else:
                return f"{fname}({prefix})"
        return f"{fname}({', '.join(args)})"

    def _extract_id_list_from_arg(self, a: EconLangParser.ArgContext) -> Optional[_List[str]]:
        return _extract_id_list_from_arg(self, a)

    def visitArg(self, ctx: EconLangParser.ArgContext):
        if ctx.namedArg():
            return self.visit(ctx.namedArg())
        return self.visit(ctx.expression())

    def visitNamedArg(self, ctx: EconLangParser.NamedArgContext):
        return f"{ctx.ID().getText()}={self.visit(ctx.expression())}"

    def visitDataLoad(self, ctx: EconLangParser.DataLoadContext):
        fmt = ctx.getChild(2).getText()
        path = ctx.STRING().getText()
        if fmt == 'csv':
            if ctx.columns():
                cols = ", ".join([repr(t.getText()) for t in ctx.columns().ID()])
                return f"load_csv({path}, [{cols}])"
            return f"load_csv({path})"
        else:
            if ctx.columns():
                cols = ", ".join([repr(t.getText()) for t in ctx.columns().ID()])
                return f"load_json({path}, [{cols}])"
            return f"load_json({path})"

    def visitForecastCall(self, ctx: EconLangParser.ForecastCallContext):
        alg = ctx.getChild(2).getText()
        series = self.visit(ctx.series())
        kwargs = []
        for i in range(len(ctx.params().ID())):
            k = ctx.params().ID(i).getText()
            v = ctx.params().NUMBER(i).getText()
            kwargs.append(f"{k}={v}")
        return f"forecast_{alg}({series}{', ' if kwargs else ''}{', '.join(kwargs)})"

    def visitIndicatorCall(self, ctx: EconLangParser.IndicatorCallContext):
        name = ctx.getChild(2).getText()
        series = self.visit(ctx.series())
        period = self.visit(ctx.period())
        return f"indicator_{name}({series}, {period})"

    def visitSeries(self, ctx: EconLangParser.SeriesContext):
        if ctx.ID():
            return ctx.ID().getText()
        return self.visit(ctx.expression())

    def visitPeriod(self, ctx: EconLangParser.PeriodContext):
        return ctx.NUMBER().getText()

    def visitArrayExpr(self, ctx: EconLangParser.ArrayExprContext):
        if ctx.getChild(0).getText() == '[':
            exprs = ctx.expression()
            return '[' + ', '.join(self.visit(e) for e in exprs) + ']'
        return self.visit(ctx.seriesOp())

    def visitSeriesOp(self, ctx: EconLangParser.SeriesOpContext):
        if ctx.getChild(1).getText() == 'agg':
            name = ctx.ID(0).getText()
            op = ctx.getChild(3).getText()
            if ctx.window():
                w = ctx.window()
                win = f"{{'from': '{w.DATE(0).getText()}', 'to': '{w.DATE(1).getText()}'}}"
            else:
                win = 'None'
            return f"agg({name}, '{op}', {win})"
        name = ctx.ID(0).getText()
        method = ctx.getChild(2).getText()
        n = ctx.NUMBER().getText()
        if method == 'filter':
            return f"filter_series({name}, {n})"
        else:
            return f"shift_series({name}, {n})"


Transpiler._maybe_template = _maybe_template

def transpile(src: str, user_id: str) -> str:
    input_stream = InputStream(src)
    lexer = EconLangLexer(input_stream)
    listener = _CollectingErrorListener()
    lexer.removeErrorListeners()
    lexer.addErrorListener(listener)
    tokens = CommonTokenStream(lexer)
    parser = EconLangParser(tokens)
    parser.removeErrorListeners()
    parser.addErrorListener(listener)
    tree = parser.program()
    if listener.errors:
        raise SyntaxError("\n".join(listener.errors))
    tr = Transpiler(user_id)
    return tr.visitProgram(tree)
