import types
import pytest

import transpiler


def test_normalize_sql_tokens_basic():
    t = transpiler.Transpiler('u')
    raw = 'select"a"from tbl where a=1+2 and b>3'
    out = t._normalize_sql_tokens(raw)
    assert 'select' in out
    assert 'from' in out
    assert 'where' in out
    assert 'a = 1 + 2' in out
    assert '"a"' in out


class _FTok:
    def __init__(self, text):
        self._t = text

    def getText(self):
        return self._t


class _FakeSop:
    def __init__(self, union=None, allkw=None, intersect=None, exceptkw=None):
        self._union = _FTok(union) if union else None
        self._all = _FTok(allkw) if allkw else None
        self._intersect = _FTok(intersect) if intersect else None
        self._except = _FTok(exceptkw) if exceptkw else None

    def UNIONKW(self):
        return self._union

    def ALLKW(self):
        return self._all

    def INTERSECTKW(self):
        return self._intersect

    def EXCEPTKW(self):
        return self._except


def test_render_set_operator_variants():
    t = transpiler.Transpiler('u')
    s1 = _FakeSop(union='UNION')
    assert t._render_set_operator(s1) == 'union'

    s2 = _FakeSop(union='UNION', allkw='ALL')
    assert t._render_set_operator(s2) == 'union all'

    s3 = _FakeSop(intersect='INTERSECT')
    assert t._render_set_operator(s3) == 'intersect'


def test_visit_data_load_csv_with_and_without_columns():
    t = transpiler.Transpiler('u')

    class FakeStr:
        def __init__(self, text):
            self._text = text

        def getText(self):
            return self._text

    class FakeColumns:
        def __init__(self, names):
            self._names = names

        def ID(self):
            return [types.SimpleNamespace(getText=lambda n=n: n) for n in self._names]

    class FakeCtx:
        def __init__(self, fmt, path, cols=None):
            self._fmt = fmt
            self._path = path
            self._cols = cols

        def getChild(self, i):
            if i == 2:
                return types.SimpleNamespace(getText=lambda: self._fmt)
            return None

        def STRING(self):
            return FakeStr(self._path)

        def columns(self):
            return FakeColumns(self._cols) if self._cols else None

    ctx1 = FakeCtx('csv', "'/tmp/data.csv'")
    out1 = t.visitDataLoad(ctx1)
    assert out1 == "load_csv('/tmp/data.csv')"

    ctx2 = FakeCtx('csv', "'/tmp/data.csv'", cols=['col1', 'col2'])
    out2 = t.visitDataLoad(ctx2)
    assert out2 == "load_csv('/tmp/data.csv', ['col1', 'col2'])"


def test_transpile_raises_on_listener_errors(monkeypatch):
    class FakeLexer:
        def __init__(self, inp):
            pass

        def removeErrorListeners(self):
            pass

        def addErrorListener(self, l):
            pass

    class FakeTokens:
        def __init__(self, lexer):
            pass

    class FakeParser:
        def __init__(self, tokens):
            pass

        def removeErrorListeners(self):
            pass

        def addErrorListener(self, l):
            pass

        def program(self):
            return object()

    class ErrListener:
        def __init__(self):
            self.errors = ['bad']

    monkeypatch.setattr(transpiler, 'EconLangLexer', FakeLexer)
    monkeypatch.setattr(transpiler, 'CommonTokenStream', FakeTokens)
    monkeypatch.setattr(transpiler, 'EconLangParser', FakeParser)
    monkeypatch.setattr(transpiler, '_CollectingErrorListener', ErrListener)

    with pytest.raises(SyntaxError):
        transpiler.transpile('x = 1', 'u1')


def test_transpile_returns_code_when_no_errors(monkeypatch):
    class FakeLexer:
        def __init__(self, inp):
            pass

        def removeErrorListeners(self):
            pass

        def addErrorListener(self, l):
            pass

    class FakeTokens:
        def __init__(self, lexer):
            pass

    class FakeTree:
        def statement(self):
            return []

    class FakeParser:
        def __init__(self, tokens):
            pass

        def removeErrorListeners(self):
            pass

        def addErrorListener(self, l):
            pass

        def program(self):
            return FakeTree()

    class GoodListener:
        def __init__(self):
            self.errors = []

    monkeypatch.setattr(transpiler, 'EconLangLexer', FakeLexer)
    monkeypatch.setattr(transpiler, 'CommonTokenStream', FakeTokens)
    monkeypatch.setattr(transpiler, 'EconLangParser', FakeParser)
    monkeypatch.setattr(transpiler, '_CollectingErrorListener', GoodListener)

    code = transpiler.transpile(' ', 'user123')
    assert 'from econ_runtime import *' in code
    assert "set_current_user('user123')" in code


class SimpleToken:
    def __init__(self, txt):
        self._txt = txt

    def getText(self):
        return self._txt


class SimpleTranspiler(transpiler.Transpiler):
    def visit(self, node):
        if node is None:
            return ''
        if hasattr(node, 'getText'):
            return node.getText()
        if isinstance(node, (list, tuple)):
            return [self.visit(n) for n in node]
        return str(node)


def test_visit_primary_string_and_at_var(monkeypatch):
    t = SimpleTranspiler('u')
    monkeypatch.setattr(transpiler.Transpiler, '_maybe_template', lambda self, s: s)

    class Ctx:
        def sqlQuery(self):
            return None

        def caseExpr(self):
            return None

        def functionCall(self):
            return None

        def dataLoad(self):
            return None

        def forecastCall(self):
            return None

        def indicatorCall(self):
            return None

        def arrayExpr(self):
            return None

        def AT_VAR(self):
            return None

        def qid(self):
            return None

        def ID(self):
            return None

        def NUMBER(self):
            return None

        def STRING(self):
            return SimpleToken('"abc"')

        def DATE(self):
            return None

        def expression(self, i=None):
            return []

    assert t.visitPrimary(Ctx()) == "'abc'"

    class Ctx2:
        def sqlQuery(self):
            return None

        def caseExpr(self):
            return None

        def functionCall(self):
            return None

        def dataLoad(self):
            return None

        def forecastCall(self):
            return None

        def indicatorCall(self):
            return None

        def arrayExpr(self):
            return None

        def AT_VAR(self):
            return SimpleToken('@foo')

        def qid(self):
            return None

        def ID(self):
            return None

        def NUMBER(self):
            return None

        def STRING(self):
            return None

        def DATE(self):
            return None

        def expression(self, i=None):
            return []

    assert t.visitPrimary(Ctx2()) == '@foo'


def test_visit_function_call_variants():
    t = SimpleTranspiler('u')

    class FuncName:
        def getText(self):
            return 'sum'

    class Ctx:
        def funcName(self):
            return FuncName()

        def funcArgs(self):
            return None

        def argList(self):
            return None

    assert t.visitFunctionCall(Ctx()) == 'sum()'

    class Arg:
        def __init__(self, name):
            self._name = name

        def getText(self):
            return self._name

    class FA:
        def DISTINCTKW(self):
            return SimpleToken('DISTINCT')

        def arg(self):
            return [Arg('x')]

    class Ctx2(Ctx):
        def funcArgs(self):
            return FA()

    assert t.visitFunctionCall(Ctx2()) == 'sum(distinct x)'


def test_visit_forecast_and_indicator_calls():
    t = SimpleTranspiler('u')

    class CtxF:
        def getChild(self, i):
            return SimpleToken('algo')

        def series(self):
            return SimpleToken('s')

        class P:
            def ID(self, i=None):
                if i is None:
                    return [SimpleToken('p')]
                return SimpleToken('p')

            def NUMBER(self, i=None):
                if i is None:
                    return [SimpleToken('10')]
                return SimpleToken('10')

        def params(self):
            return CtxF.P()

    assert t.visitForecastCall(CtxF()) == 'forecast_algo(s, p=10)'

    class CtxI:
        def getChild(self, i):
            return SimpleToken('RSI')

        def series(self):
            return SimpleToken('s')

        def period(self):
            return SimpleToken('14')

    assert t.visitIndicatorCall(CtxI()) == 'indicator_RSI(s, 14)'


def test_visit_seriesop_filter_and_shift():
    t = SimpleTranspiler('u')

    class CtxAgg:
        def getChild(self, i):
            if i == 1:
                return SimpleToken('agg')
            if i == 3:
                return SimpleToken('sum')
            return SimpleToken('')

        def ID(self, i=0):
            return SimpleToken('val')

        def window(self):
            return None

    assert t.visitSeriesOp(CtxAgg()) == "agg(val, 'sum', None)"

    class CtxShift:
        def getChild(self, i):
            if i == 2:
                return SimpleToken('shift')
            return SimpleToken('')

        def ID(self, i=0):
            return SimpleToken('x')

        def NUMBER(self):
            return SimpleToken('3')

    assert t.visitSeriesOp(CtxShift()) == 'shift_series(x, 3)'


def test_visit_array_expr_and_unary_and_series_period():
    t = SimpleTranspiler('u')

    class CtxArr:
        def getChild(self, i):
            if i == 0:
                return SimpleToken('[')

        def expression(self):
            return [SimpleToken('1'), SimpleToken('2')]

    assert t.visitArrayExpr(CtxArr()) == "[1, 2]"

    class CtxNot:
        def NOT(self):
            return True

        def unaryExpr(self):
            return SimpleToken('cond')

    assert t.visitUnaryExpr(CtxNot()) == 'not cond'

    class CtxSeries:
        def ID(self):
            return SimpleToken('s1')

    assert t.visitSeries(CtxSeries()) == 's1'

    class CtxPeriod:
        def NUMBER(self):
            return SimpleToken('7')

    assert t.visitPeriod(CtxPeriod()) == '7'


def test_visit_case_expr_searched():
    t = SimpleTranspiler('u')

    class When:
        def __init__(self, a, b):
            self._a = SimpleToken(a)
            self._b = SimpleToken(b)

        def expression(self, i=0):
            return self._a if i == 0 else self._b

    class ElseC:
        def expression(self):
            return SimpleToken('elsev')

    class Ctx:
        def whenClause(self):
            return [When('c1', 'v1'), When('c2', 'v2')]

        def elseClause(self):
            return ElseC()

        def expression(self, i=None):
            return []

    out = t.visitCaseExpr(Ctx())
    assert 'v1' in out and 'v2' in out and 'elsev' in out


def test_visit_relational_expr_in_variants():
    t = SimpleTranspiler('u')

    class CtxSubq:
        def EXISTSKW(self):
            return None

        def IN(self):
            return True

        def additiveExpr(self, i=0):
            return SimpleToken('left')

        def sqlQuery(self, i=0):
            return SimpleToken('select 1')

        def exprList(self, idx=None):
            return None

    assert t.visitRelationalExpr(CtxSubq()) == 'left IN (select 1)'

    class FakeExprList:
        def expression(self):
            return [SimpleToken('1'), SimpleToken('2')]

    class CtxExprList(CtxSubq):
        def sqlQuery(self, i=0):
            return None

        def exprList(self, idx=None):
            return FakeExprList()

    assert t.visitRelationalExpr(CtxExprList()) == 'left IN (1, 2)'


def test_primary_qid_and_parenthesized_sql(monkeypatch):
    t = transpiler.Transpiler('u')
    t._sql_where = True
    t._sql_dfvar = 'df'

    class QidCtx:
        def sqlQuery(self):
            return None

        def caseExpr(self):
            return None

        def functionCall(self):
            return None

        def dataLoad(self):
            return None

        def forecastCall(self):
            return None

        def indicatorCall(self):
            return None

        def arrayExpr(self):
            return None

        def AT_VAR(self):
            return None

        def qid(self):
            return SimpleToken('col')

        def ID(self):
            return None

        def NUMBER(self):
            return None

        def STRING(self):
            return None

        def DATE(self):
            return None

        def expression(self, i=None):
            return []

    assert t.visitPrimary(QidCtx()) == "df['col']"

    class SqlParenCtx(QidCtx):
        def __init__(self):
            self._child0 = SimpleToken('(')

        def sqlQuery(self):
            class FakeSql:
                def accept(self, visitor):
                    return 'select 1'
            return FakeSql()

        def getChild(self, i):
            return self._child0

    out = t.visitPrimary(SqlParenCtx())
    assert out == '(select 1)'


def test_primary_string_template(monkeypatch):
    t = transpiler.Transpiler('u')
    monkeypatch.setattr(transpiler.Transpiler, '_maybe_template', lambda self, s: 'f"hi {x}"')

    class Ctx:
        def sqlQuery(self):
            return None

        def caseExpr(self):
            return None

        def functionCall(self):
            return None

        def dataLoad(self):
            return None

        def forecastCall(self):
            return None

        def indicatorCall(self):
            return None

        def arrayExpr(self):
            return None

        def AT_VAR(self):
            return None

        def qid(self):
            return None

        def ID(self):
            return None

        def NUMBER(self):
            return None

        def STRING(self):
            return SimpleToken('"hi {x}"')

        def DATE(self):
            return None

        def expression(self, i=None):
            return []

    assert t.visitPrimary(Ctx()) == "f'hi {x}'"


def test_render_table_ref_and_alias(monkeypatch):
    t = transpiler.Transpiler('u')
    monkeypatch.setattr(t, 'visit', lambda node: 'func()')

    class SrcFunc:
        def functionCall(self):
            return object()

        def dataLoad(self):
            return None

        def sqlQuery(self):
            return None

        def ID(self):
            return None

    class TRefFunc:
        def source(self):
            return SrcFunc()

        def alias(self):
            return None

    base = t._render_table_ref(TRefFunc())
    assert base.startswith('__tbl_')
    assert any('register_table' in ln for ln in t.lines)

    class Alias:
        def __init__(self, text, as_kw=True):
            self._text = text
            self._as = as_kw

        def getChildCount(self):
            return 2 if self._as else 1

        def getChild(self, i):
            return SimpleToken('as') if i == 0 else None

        def ID(self):
            return SimpleToken(self._text)

        def getText(self):
            return self._text

    class SrcId:
        def functionCall(self):
            return None

        def dataLoad(self):
            return None

        def sqlQuery(self):
            return None

        def ID(self):
            return SimpleToken('tbl')

    class TRefAlias:
        def __init__(self, as_kw=True):
            self._alias = Alias('t1', as_kw)

        def source(self):
            return SrcId()

        def alias(self):
            return self._alias

    assert t._render_table_ref(TRefAlias(True)) == 'tbl t1'
    assert t._render_table_ref(TRefAlias(False)) == 'tbl t1'


def test_render_join_clause_on_and_using(monkeypatch):
    t = transpiler.Transpiler('u')
    monkeypatch.setattr(t, 'visit', lambda node: 'cond')

    class JOn:
        def NATURALKW(self):
            return None

        def INNERKW(self):
            return None

        def LEFTKW(self):
            return None

        def RIGHTKW(self):
            return None

        def FULLKW(self):
            return None

        def CROSSKW(self):
            return None

        def OUTERKW(self):
            return None

        def JOINKW(self):
            return SimpleToken('join')

        def tableRef(self):
            return types.SimpleNamespace(source=lambda: types.SimpleNamespace(
                functionCall=lambda: None,
                dataLoad=lambda: None,
                sqlQuery=lambda: None,
                ID=lambda: SimpleToken('t')
            ), alias=lambda: None)

        def ONKW(self):
            return True

        def expression(self):
            return [SimpleToken('x')]

        def USINGKW(self):
            return None

        def idList(self):
            return None

    out_on = t._render_join_clause(JOn())
    assert out_on.endswith('on cond')

    class JUsing(JOn):
        def ONKW(self):
            return None

        def USINGKW(self):
            return True

        def idList(self):
            return types.SimpleNamespace(getText=lambda: 'a,b')

        def expression(self):
            return []

    out_using = t._render_join_clause(JUsing())
    assert 'using(a, b)' in out_using


def test_visit_case_expr_sql_mode():
    t = SimpleTranspiler('u')
    t._in_sql = True

    class When:
        def __init__(self, c, v):
            self._c = SimpleToken(c)
            self._v = SimpleToken(v)

        def expression(self, i=0):
            return self._c if i == 0 else self._v

    class ElseC:
        def expression(self):
            return SimpleToken('els')

    class Ctx:
        def __init__(self):
            self._child0 = SimpleToken('case')
            self._child1 = SimpleToken('base')

        def whenClause(self):
            return [When('c1', 'v1'), When('c2', 'v2')]

        def elseClause(self):
            return ElseC()

        def expression(self, i=None):
            if i is None:
                return [SimpleToken('base')]
            return SimpleToken('base')

        def getChildCount(self):
            return 3

        def getChild(self, i):
            return self._child1 if i == 1 else self._child0

    out = t.visitCaseExpr(Ctx())
    assert out.startswith('case base when c1 then v1')
    assert out.endswith('else els end')


def test_visit_sql_query_forced_udf_and_limit_offset(monkeypatch):
    t = transpiler.Transpiler('u')
    t._render_select_core = types.MethodType(lambda self, core: 'select @foo(1)', t)
    t.visit = types.MethodType(lambda self, node=None: 'col', t)

    class FakeOrderItem:
        def __init__(self, is_num=False):
            self._is_num = is_num

        def expression(self):
            return None if self._is_num else SimpleToken('c')

        def NUMBER(self):
            return SimpleToken('2') if self._is_num else None

        def ASC(self):
            return True

        def DESC(self):
            return False

        def NULLS(self):
            return True

        def FIRST(self):
            return True

        def LAST(self):
            return None

    class FakeOrderList:
        def orderItem(self):
            return [FakeOrderItem(), FakeOrderItem(is_num=True)]

    class FakeLimit:
        def __init__(self, parts):
            self._parts = parts

        def getChildCount(self):
            return len(self._parts)

        def getChild(self, i):
            return SimpleToken(self._parts[i])

    class Ctx:
        def __init__(self):
            self._cores = [object()]
            self._ops = []

        def selectCore(self, i=None):
            return self._cores if i is None else self._cores[i]

        def setOperator(self, i=None):
            return self._ops if i is None else self._ops[i]

        def orderList(self):
            return FakeOrderList()

        def limitClause(self):
            return FakeLimit(['limit', '5', 'offset', '@v'])

    sql_call = t.visitSqlQuery(Ctx())
    assert 'exec_sql' in sql_call
    assert 'limit 5' in sql_call
    assert '{v}' in sql_call  
    assert any('register_udf' in ln for ln in t.lines)
    assert 'foo' in t._registered_udfs

    t2 = transpiler.Transpiler('u')
    t2._in_sql = True
    t2._render_select_core = types.MethodType(lambda self, core: 'select 1', t2)
    t2.visit = types.MethodType(lambda self, node=None: 'c', t2)

    class CtxNested(Ctx):
        def orderList(self):
            return None

        def limitClause(self):
            return None

    raw_sql = t2.visitSqlQuery(CtxNested())
    assert raw_sql.strip().startswith('select')


def test_visit_relational_expr_variants(monkeypatch):
    t = SimpleTranspiler('u')

    class CtxExists:
        def EXISTSKW(self):
            return True

        def sqlQuery(self, i=0):
            return SimpleToken('select 1')

    assert t.visitRelationalExpr(CtxExists()) == 'EXISTS(select 1)'

    class CtxInSql:
        def IN(self):
            return True

        def additiveExpr(self, i=0):
            return SimpleToken('x')

        def sqlQuery(self, i=0):
            return SimpleToken('select 2')

        def exprList(self):
            return None

        def EXISTSKW(self):
            return None

        def getChildCount(self):
            return 0

    assert t.visitRelationalExpr(CtxInSql()) == 'x IN (select 2)'

    class FakeExprList:
        def expression(self):
            return [SimpleToken('1'), SimpleToken('2')]

    class CtxInList(CtxInSql):
        def __init__(self):
            self._lst = FakeExprList()

        def sqlQuery(self, i=0):
            return None

        def exprList(self, idx=None):
            return self._lst

        def EXISTSKW(self):
            return None

    assert t.visitRelationalExpr(CtxInList()) == 'x IN (1, 2)'

    class CtxBetween:
        def IN(self):
            return False

        def EXISTSKW(self):
            return None

        def additiveExpr(self, i=0):
            return SimpleToken(['a', 'b', 'c'][i])

        def getChildCount(self):
            return 5

        def getChild(self, i):
            seq = ['a', 'between', 'b', 'and', 'c']
            txt = seq[i]
            return SimpleToken(txt) if i % 2 == 1 else self  

        def getText(self):
            return 'between'

    out_between = t.visitRelationalExpr(CtxBetween())
    assert 'between' in out_between.lower()


def test_render_join_clause_with_prefix_and_on(monkeypatch):
    t = transpiler.Transpiler('u')
    monkeypatch.setattr(t, 'visit', lambda node: 'cond')
    monkeypatch.setattr(t, '_render_table_ref', lambda tr: 'tbl')

    class Tok:
        def __init__(self, txt):
            self._txt = txt

        def getText(self):
            return self._txt

    class J:
        def NATURALKW(self):
            return Tok('natural')

        def INNERKW(self):
            return Tok('inner')

        def LEFTKW(self):
            return None

        def RIGHTKW(self):
            return None

        def FULLKW(self):
            return None

        def CROSSKW(self):
            return None

        def OUTERKW(self):
            return Tok('outer')

        def JOINKW(self):
            return Tok('join')

        def tableRef(self):
            return object()

        def ONKW(self):
            return True

        def USINGKW(self):
            return None

        def expression(self):
            return [SimpleToken('x')]

        def idList(self):
            return None

    out = t._render_join_clause(J())
    assert out.startswith('natural inner outer join tbl')
    assert out.endswith('on cond')


def test_render_table_ref_function_and_alias(monkeypatch):
    t = transpiler.Transpiler('u')
    monkeypatch.setattr(t, 'visit', lambda node: 'fn()')

    class Src:
        def functionCall(self):
            return object()

        def dataLoad(self):
            return None

        def sqlQuery(self):
            return None

        def ID(self):
            return None

    class Alias:
        def __init__(self, txt, as_kw=True):
            self._txt = txt
            self._as = as_kw

        def getChildCount(self):
            return 2 if self._as else 1

        def getChild(self, i):
            return SimpleToken('as') if i == 0 and self._as else None

        def ID(self):
            return SimpleToken(self._txt)

        def getText(self):
            return self._txt

    class TRef:
        def __init__(self, as_kw=True):
            self._alias = Alias('a1', as_kw)

        def source(self):
            return Src()

        def alias(self):
            return self._alias

    out_as = t._render_table_ref(TRef(True))
    assert out_as.endswith('a1')
    assert any('register_table' in ln for ln in t.lines)

    t.lines.clear()
    out_plain = t._render_table_ref(TRef(False))
    assert out_plain.endswith('a1')


def test_function_call_distinct_and_args():
    t = transpiler.Transpiler('u')

    class Arg:
        def __init__(self, val):
            self._val = val

        def getText(self):
            return self._val

        def accept(self, visitor):
            return self.getText()

    class FA:
        def __init__(self, distinct=False):
            self._distinct = distinct

        def DISTINCTKW(self):
            return SimpleToken('DISTINCT') if self._distinct else None

        def arg(self):
            return [Arg('x')]

        def argList(self):
            return None

    class Ctx:
        def __init__(self, distinct=False):
            self._fa = FA(distinct)

        def funcName(self):
            return SimpleToken('sum')

        def funcArgs(self):
            return self._fa

        def argList(self):
            return None

    out_distinct = t.visitFunctionCall(Ctx(True))
    assert out_distinct == 'sum(distinct x)'

    class FAList(FA):
        def __init__(self):
            pass

        def DISTINCTKW(self):
            return None

        def argList(self):
            return types.SimpleNamespace(arg=lambda: [Arg('a'), Arg('b')])

    class CtxList(Ctx):
        def __init__(self):
            self._fa = FAList()

    out_list = t.visitFunctionCall(CtxList())
    assert out_list == 'sum(a, b)'


def test_visit_primary_paren_sql_and_template(monkeypatch):
    t = transpiler.Transpiler('u')

    class SqlCtx:
        def __init__(self, paren=True):
            self._paren = paren
            self._child0 = SimpleToken('(')

        def sqlQuery(self):
            return types.SimpleNamespace(accept=lambda visitor: 'select 1')

        def getChild(self, i):
            return self._child0 if self._paren else SimpleToken('')

        def caseExpr(self):
            return None

        def functionCall(self):
            return None

        def dataLoad(self):
            return None

        def forecastCall(self):
            return None

        def indicatorCall(self):
            return None

        def arrayExpr(self):
            return None

        def AT_VAR(self):
            return None

        def qid(self):
            return None

        def ID(self):
            return None

        def NUMBER(self):
            return None

        def STRING(self):
            return None

        def DATE(self):
            return None

        def expression(self, i=None):
            return []

    assert t.visitPrimary(SqlCtx(True)) == '(select 1)'
    assert t.visitPrimary(SqlCtx(False)) == 'select 1'

    class StrCtx(SqlCtx):
        def __init__(self):
            pass

        def sqlQuery(self):
            return None

        def STRING(self):
            return SimpleToken('"hi {x}"')

    monkeypatch.setattr(transpiler.Transpiler, '_maybe_template', lambda self, s: 'f"hi {x}"')
    assert transpiler.Transpiler('u').visitPrimary(StrCtx()) == "f'hi {x}'"


def test_visit_data_load_json_with_columns():
    t = transpiler.Transpiler('u')

    class Cols:
        def ID(self):
            return [SimpleToken('a'), SimpleToken('b')]

    class Ctx:
        def getChild(self, i):
            return SimpleToken('json') if i == 2 else None

        def STRING(self):
            return SimpleToken('"/tmp/x.json"')

        def columns(self):
            return Cols()

    out = t.visitDataLoad(Ctx())
    assert "load_json(\"/tmp/x.json\", ['a', 'b'])" in out


def test_visit_program_and_statement_branches():
    t = transpiler.Transpiler('u')

    class Tok:
        def __init__(self, txt):
            self._txt = txt

        def getText(self):
            return self._txt

    class FakeExpr:
        def __init__(self, txt='x'):
            self._txt = txt

        def accept(self, visitor):
            return self._txt

    class FakeBlock:
        def __init__(self, stmts=None):
            self._stmts = stmts or []

        def statement(self):
            return self._stmts

        def accept(self, visitor):
            return visitor.visitBlock(self)

    class DeclCtx:
        def ID(self):
            return Tok('a')

        def expression(self):
            return FakeExpr('1')

        def accept(self, visitor):
            return visitor.visitDeclaration(self)

    class AssignCtx(DeclCtx):
        def ID(self):
            return Tok('b')

        def accept(self, visitor):
            return visitor.visitAssignment(self)

    class FuncDefCtx:
        def __init__(self):
            self._block = FakeBlock()

        def ID(self):
            return Tok('f')

        def paramList(self):
            return types.SimpleNamespace(ID=lambda: [Tok('p1'), Tok('p2')])

        def block(self):
            return self._block

        def accept(self, visitor):
            return visitor.visitFunctionDef(self)

    class IfCtx:
        def __init__(self):
            self._b0 = FakeBlock()
            self._b1 = FakeBlock()

        def expression(self):
            return FakeExpr('cond')

        def block(self, idx):
            return self._b0 if idx == 0 else self._b1

        def accept(self, visitor):
            return visitor.visitIfStatement(self)

    class LoopCtx:
        def __init__(self, kind='for'):
            self._kind = kind
            self._block = FakeBlock()

        def getChild(self, i):
            return Tok(self._kind)

        def ID(self):
            return Tok('i')

        def expression(self):
            return FakeExpr('items')

        def block(self):
            return self._block

        def accept(self, visitor):
            return visitor.visitLoopStatement(self)

    class ReturnCtx:
        def expression(self):
            return FakeExpr('ret')

        def accept(self, visitor):
            return visitor.visitReturnStatement(self)

    class AlertCtx:
        def expression(self):
            return FakeExpr('c')

        def STRING(self):
            return Tok('"addr"')

        def accept(self, visitor):
            return visitor.visitAlertStatement(self)

    class ExprCtx:
        def expression(self):
            return FakeExpr('e')

        def accept(self, visitor):
            return 'e'

    class BaseStmt:
        def __init__(self, **kw):
            self._decl = kw.get('decl')
            self._assign = kw.get('assign')
            self._func = kw.get('func')
            self._if = kw.get('ifctx')
            self._loop = kw.get('loop')
            self._ret = kw.get('ret')
            self._alert = kw.get('alert')
            self._expr = kw.get('expr')

        def accept(self, visitor):
            return visitor.visitStatement(self)

        def declaration(self):
            return self._decl

        def assignment(self):
            return self._assign

        def functionDef(self):
            return self._func

        def ifStatement(self):
            return self._if

        def loopStatement(self):
            return self._loop

        def returnStatement(self):
            return self._ret

        def alertStatement(self):
            return self._alert

        def expression(self):
            return self._expr

    stmts = [
        BaseStmt(decl=DeclCtx()),
        BaseStmt(assign=AssignCtx()),
        BaseStmt(func=FuncDefCtx()),
        BaseStmt(ifctx=IfCtx()),
        BaseStmt(loop=LoopCtx('for')),
        BaseStmt(loop=LoopCtx('while')),
        BaseStmt(ret=ReturnCtx()),
        BaseStmt(alert=AlertCtx()),
        BaseStmt(expr=ExprCtx()),
    ]

    class Prog:
        def statement(self):
            return stmts

    out = t.visitProgram(Prog())
    assert 'from econ_runtime import *' in out
    assert 'from users.u import *' in out
    assert 'set_current_user' in out
    assert any('def f(' in ln for ln in out.splitlines())
    assert any('__rows' in ln for ln in out.splitlines())


def test_expression_and_select_helpers(monkeypatch):
    t = transpiler.Transpiler('u')

    class St:
        def accept(self, visitor):
            return 'noop'

    t.visitBlock(types.SimpleNamespace(statement=lambda: [St()]))

    t._sql_where = True

    class AndNode:
        def __init__(self, txt):
            self._txt = txt

        def accept(self, visitor):
            return self._txt

    class OrCtx:
        def andExpr(self):
            return [AndNode('a'), AndNode('b')]

    assert t.visitOrExpr(OrCtx()) == '(a) | (b)'

    class AndCtx:
        def equalityExpr(self):
            return [AndNode('c'), AndNode('d')]

    assert t.visitAndExpr(AndCtx()) == '(c) & (d)'

    class RelCtx:
        def __init__(self, vals):
            self._vals = vals

        def relationalExpr(self, i=None):
            if i is None:
                return self._vals
            return self._vals[i]

        def getChild(self, idx):
            return SimpleToken('==')

    eq_out = t.visitEqualityExpr(RelCtx([AndNode('x'), AndNode('y')]))
    assert '==' in eq_out

    class AddCtx:
        def multiplicativeExpr(self):
            class Tok(SimpleToken):
                def accept(self_inner, visitor):
                    return self_inner.getText()
            return [Tok('"s"'), Tok('1')]

        def getChild(self, idx):
            return SimpleToken('+')

    assert 'str(1)' in t.visitAdditiveExpr(AddCtx())

    class MulCtx:
        def unaryExpr(self, i=None):
            class Tok(SimpleToken):
                def accept(self_inner, visitor):
                    return self_inner.getText()
            vals = [Tok('u1'), Tok('u2')]
            return vals if i is None else vals[i]

        def getChild(self, idx):
            return SimpleToken('*')

    assert t.visitMultiplicativeExpr(MulCtx()) == 'u1 * u2'

    class UCtx:
        def NOT(self):
            return True

        def unaryExpr(self):
            return AndNode('z')

        def primary(self):
            return None

    assert t.visitUnaryExpr(UCtx()) == 'not z'


    t._in_sql = True

    class Tok(SimpleToken):
        def accept(self_inner, visitor):
            return self_inner.getText()

    class When:
        def __init__(self, a, b):
            self._a = Tok(a)
            self._b = Tok(b)

        def expression(self, i=0):
            return self._a if i == 0 else self._b

    class Else:
        def expression(self):
            return Tok('elsev')

    class CaseCtx:
        def __init__(self):
            self._child0 = SimpleToken('case')
            self._child1 = SimpleToken('base')

        def whenClause(self):
            return [When('c1', 'v1')]

        def elseClause(self):
            return Else()

        def expression(self, i=None):
            if i is None:
                return [Tok('base')]
            return Tok('base')

        def getChildCount(self):
            return 3

        def getChild(self, i):
            return self._child1 if i == 1 else self._child0

    sql_case = t.visitCaseExpr(CaseCtx())
    assert sql_case.startswith('case base when')

    t._in_sql = False

    class Core:
        def DISTINCTKW(self):
            return True

        def ALLKW(self):
            return None

        def selectItems(self):
            return None

        def tableRef(self):
            return types.SimpleNamespace(source=lambda: types.SimpleNamespace(functionCall=lambda: None, dataLoad=lambda: None, sqlQuery=lambda: None, ID=lambda: SimpleToken('t')),
                                         alias=lambda: None)

        def joinClause(self):
            return []

        def expression(self):
            return [AndNode('w'), AndNode('h')]

        def WHEREKW(self):
            return True

        def groupByList(self):
            return types.SimpleNamespace(expression=lambda: [AndNode('g')])

        def HAVINGKW(self):
            return True

    monkeypatch.setattr(t, '_render_select_items', lambda si: 'cols')
    core_sql = t._render_select_core(Core())
    assert 'distinct' in core_sql and 'where' in core_sql and 'having' in core_sql

    class OrderItem:
        def __init__(self, expr=True):
            self._expr = expr

        def expression(self):
            return AndNode('ord') if self._expr else None

        def NUMBER(self):
            return SimpleToken('2')

        def ASC(self):
            return None

        def DESC(self):
            return True

        def NULLS(self):
            return True

        def FIRST(self):
            return None

        def LAST(self):
            return True

    class OrderList:
        def orderItem(self):
            return [OrderItem(expr=False)]

    class Limit:
        def __init__(self, parts):
            self._parts = parts

        def getChildCount(self):
            return len(self._parts)

        def getChild(self, i):
            return SimpleToken(self._parts[i])

    class SqlCore(Core):
        def __init__(self):
            super().__init__()
            self._ops = []
            self._cores = [object()]

        def selectCore(self, i=None):
            return self._cores if i is None else self._cores[i]

        def setOperator(self, i=None):
            return self._ops if i is None else self._ops[i]

        def orderList(self):
            return OrderList()

        def limitClause(self):
            return Limit(['limit', '@n', 'offset', '5'])

    monkeypatch.setattr(t, '_render_select_core', lambda core: 'select 1')
    t.visit = lambda node=None: 'expr'
    sql_call = t.visitSqlQuery(SqlCore())
    assert 'limit' in sql_call and 'offset' in sql_call


def test_transpiler_misc_branches(monkeypatch):
    t = transpiler.Transpiler('u')

    class Tok(SimpleToken):
        def accept(self_inner, visitor):
            return self_inner.getText()

    class Core:
        def __init__(self):
            self._cores = [object()]
            self._ops = []

        def selectCore(self, i=None):
            return self._cores if i is None else self._cores[i]

        def setOperator(self, i=None):
            return self._ops if i is None else self._ops[i]

        def orderList(self):
            return None

        def limitClause(self):
            return None

    t._in_sql = True
    monkeypatch.setattr(t, '_render_select_core', lambda core: 'select @f(1)')
    raw_sql = t.visitSqlQuery(Core())
    assert raw_sql.startswith('select')

    class SrcCtx:
        def __init__(self, kind):
            self.kind = kind

        def ID(self):
            return Tok('id') if self.kind == 'id' else None

        def functionCall(self):
            return Tok('fn') if self.kind == 'fn' else None

        def dataLoad(self):
            return Tok('dl') if self.kind == 'dl' else None

        def sqlQuery(self):
            return Tok('select 1') if self.kind == 'sql' else None

    assert t.visitSource(SrcCtx('id')) == 'id'
    assert t.visitSource(SrcCtx('fn')) == '(fn)'
    assert t.visitSource(SrcCtx('dl')) == '(dl)'
    assert t.visitSource(SrcCtx('sql')) == '(select 1)'

    class ArgTok(Tok):
        pass

    class ArgList:
        def arg(self):
            return [ArgTok('x'), ArgTok('y')]

    class FunCtx:
        def funcName(self):
            return Tok('foo')

        def funcArgs(self):
            return None

        def argList(self):
            return ArgList()

    assert t.visitFunctionCall(FunCtx()) == 'foo(x, y)'

    class Cols:
        def ID(self):
            return [Tok('c1'), Tok('c2')]

    class DLJson:
        def getChild(self, i):
            return Tok('json')

        def STRING(self):
            return Tok('"/p.json"')

        def columns(self):
            return None

    class DLCsv:
        def getChild(self, i):
            return Tok('csv')

        def STRING(self):
            return Tok('"/p.csv"')

        def columns(self):
            return Cols()

    assert 'load_json("/p.json")' == t.visitDataLoad(DLJson())
    assert "load_csv(\"/p.csv\", ['c1', 'c2'])" == t.visitDataLoad(DLCsv())

    class FParams:
        def ID(self, i=None):
            return [Tok('p')] if i is None else Tok('p')

        def NUMBER(self, i=None):
            return [Tok('10')] if i is None else Tok('10')

    class FCtx:
        def getChild(self, i):
            return Tok('algo')

        def series(self):
            return Tok('s')

        def params(self):
            return FParams()

    assert 'forecast_algo(s, p=10)' == t.visitForecastCall(FCtx())

    class Ictx:
        def getChild(self, i):
            return Tok('RSI')

        def series(self):
            return Tok('s')

        def period(self):
            return Tok('14')

    assert 'indicator_RSI(s, 14)' == t.visitIndicatorCall(Ictx())

    class SCtx:
        def ID(self):
            return Tok('sid')

    assert t.visitSeries(SCtx()) == 'sid'

    class ArrCtx:
        def getChild(self, i):
            return Tok('[')

        def expression(self):
            return [Tok('1'), Tok('2')]

    assert t.visitArrayExpr(ArrCtx()) == "[1, 2]"

    class Win:
        def DATE(self, i):
            return Tok('2020-01-01')

    class SeriesAgg:
        def getChild(self, i):
            vals = ['x', 'agg', 'y', 'sum']
            return Tok(vals[i])

        def ID(self, i):
            return Tok('s')

        def window(self):
            return Win()

    assert "agg(s, 'sum', {'from': '2020-01-01', 'to': '2020-01-01'})" == t.visitSeriesOp(SeriesAgg())


def test_transpiler_additional_branches():
    t = transpiler.Transpiler('u')

    class Tok(SimpleToken):
        def accept(self_inner, visitor):
            return self_inner.getText()

    class RetCtx:
        def expression(self):
            return Tok('42')

    assert t.visitReturnStatement(RetCtx()) == 'return 42'

    class AlertCtx:
        def expression(self):
            return Tok('cond')

        def STRING(self):
            return Tok('"addr"')

    assert 'send_alert_email' in t.visitAlertStatement(AlertCtx())

    t._sql_where = False

    class AndNode:
        def __init__(self, txt):
            self._txt = txt

        def accept(self_inner, visitor):
            return self_inner._txt

    class OrCtx:
        def andExpr(self):
            return [AndNode('a'), AndNode('b')]

    assert t.visitOrExpr(OrCtx()) == 'a or b'

    class AndCtx:
        def equalityExpr(self):
            return [AndNode('c'), AndNode('d')]

    assert t.visitAndExpr(AndCtx()) == 'c and d'

    class Rel:
        def additiveExpr(self, i=0):
            return Tok(['l', 'r'][i])

        def IN(self):
            return False

        def EXISTSKW(self):
            return None

        def getChildCount(self):
            return 3

        def getChild(self, idx):
            return Tok(['l', 'between', 'r'][idx])

    rel_out = t.visitRelationalExpr(Rel())
    assert 'between' in rel_out.lower()

    class EqCtx:
        def relationalExpr(self, i=None):
            vals = [Tok('l'), Tok('r')]
            return vals if i is None else vals[i]

        def getChild(self, idx):
            return Tok('>=')

    assert '>=' in t.visitEqualityExpr(EqCtx())

    class AddCtx:
        def multiplicativeExpr(self):
            return [Tok('1'), Tok('2')]

        def getChild(self, idx):
            return Tok('-')

    assert t.visitAdditiveExpr(AddCtx()) == '1 - 2'

    t._sql_where = True
    t._sql_dfvar = 'df'

    class QidCtx:
        def sqlQuery(self):
            return None

        def caseExpr(self):
            return None

        def functionCall(self):
            return None

        def dataLoad(self):
            return None

        def forecastCall(self):
            return None

        def indicatorCall(self):
            return None

        def arrayExpr(self):
            return None

        def AT_VAR(self):
            return None

        def qid(self):
            return Tok('col')

        def ID(self):
            return None

        def NUMBER(self):
            return None

        def STRING(self):
            return None

        def DATE(self):
            return None

        def expression(self, i=None):
            return []

    assert t.visitPrimary(QidCtx()) == "df['col']"

    class DateCtx(QidCtx):
        def qid(self):
            return None

        def DATE(self):
            return Tok('2020-01-01')

    assert "'2020-01-01'" == t.visitPrimary(DateCtx())

    t._in_sql = False

    class When:
        def __init__(self, cond, val):
            self._c = Tok(cond)
            self._v = Tok(val)

        def expression(self, i=0):
            return self._c if i == 0 else self._v

    class Else:
        def expression(self):
            return Tok('e')

    class Case:
        def whenClause(self):
            return [When('c', 'v')]

        def elseClause(self):
            return Else()

        def expression(self, i=None):
            return []

    out_case = t.visitCaseExpr(Case())
    assert 'if' in out_case and 'else' in out_case

    class SeriesOpCtx:
        def accept(self_inner, visitor):
            return 'sop'

    class ArrCtx:
        def getChild(self, i):
            return Tok('not[')

        def seriesOp(self):
            return SeriesOpCtx()

    assert t.visitArrayExpr(ArrCtx()) == 'sop'

    class SeriesFilter:
        def getChild(self, i):
            vals = ['s', 'x', 'filter', 'n']
            return Tok(vals[i])

        def ID(self, i):
            return Tok('s')

        def window(self):
            return None

        def NUMBER(self):
            return Tok('5')

    assert t.visitSeriesOp(SeriesFilter()) == 'filter_series(s, 5)'
