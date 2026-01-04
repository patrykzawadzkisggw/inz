from antlr4.error.ErrorListener import ErrorListener
from typing import List
from typing import Optional, Any
import re


def _render_select_items(tr: Any, sctx) -> str:
    # '*' shortcut
    if sctx.getChildCount() == 1 and sctx.getChild(0).getText() == '*':
        return '*'
    out: list[str] = []
    items = [c for c in sctx.selectItem()]
    for si in items:
        out.append(_render_select_item(tr, si))
    return ', '.join(out)


def _render_select_item(tr: Any, si) -> str:
    # Prefer using the visitor to render the expression so spacing and
    # operator normalization are consistent (e.g. BETWEEN, DISTINCT inside
    # aggregates, IN (...), etc.). The grammar for selectItem is:
    #   selectItem: expression (AS ID)? ;
    alias = None
    if si.getChildCount() >= 2:
        # check for AS alias at the end
        last = si.getChild(si.getChildCount() - 2).getText()
        if last.lower() == 'as':
            alias = si.getChild(si.getChildCount() - 1).getText()

    try:
        # If an expression() node exists, use the transpiler visitor to render it.
        if hasattr(si, 'expression') and si.expression():
            core = tr.visit(si.expression())
        else:
            core = si.getText()
    except Exception:
        core = si.getText()

    if alias:
        return f"{core} AS {alias}"
    return core


def _source_sql(tr: Any, ctx) -> str:
    if ctx.ID():
        return ctx.ID().getText()
    if ctx.functionCall():
        return tr.visit(ctx.functionCall())
    if ctx.dataLoad():
        return tr.visit(ctx.dataLoad())
    if ctx.sqlQuery():
        inner = tr.visit(ctx.sqlQuery())
        return f"({inner})"
    return ''


def _id_list(lctx) -> list[str]:
    return [t.getText() for t in lctx.ID()]



def _extract_id_list_from_arg(tr: Any, a) -> Optional[list[str]]:
    if a.expression() is None:
        return None
    e = a.expression()
    try:
        p = e.orExpr().andExpr(0).equalityExpr(0).relationalExpr(0).additiveExpr(0).multiplicativeExpr(0).unaryExpr(0).primary()
    except Exception:
        return None
    if p is None or p.arrayExpr() is None:
        return None
    arr = p.arrayExpr()
    exprs = arr.expression()
    cols: list[str] = []
    for ex in exprs:
        try:
            prim = ex.orExpr().andExpr(0).equalityExpr(0).relationalExpr(0).additiveExpr(0).multiplicativeExpr(0).unaryExpr(0).primary()
            if prim.ID():
                cols.append(prim.ID().getText())
            else:
                return None
        except Exception:
            return None
    return cols


class _CollectingErrorListener(ErrorListener):
    def __init__(self):
        super().__init__()
        self.errors: List[str] = []

    def syntaxError(self, recognizer, offendingSymbol, line, column, msg, e):  # type: ignore[override]
        self.errors.append(f"line {line}:{column} {msg}")


def _validate_fstring(s: str) -> bool:
    """Best-effort check whether prefixing with f is safe.
    We attempt to compile; if Python rejects it, fall back to plain string.
    """
    try:
        compile(f"f{s}", "<tmpl>", "eval")
        return True
    except Exception:
        return False


def _maybe_template(self, s: str) -> str:  # type: ignore[override]
    # Quick heuristic: treat any balanced {...} inside as placeholders.
    if '{' in s and '}' in s:
        # Avoid converting already f-prefixed (user could write it manually in future) – though lexer gives raw token without prefix.
        if _validate_fstring(s):
            return 'f' + s
    return s
