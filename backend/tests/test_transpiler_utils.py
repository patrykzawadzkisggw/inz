import pytest

import transpiler_utils as tu


class _FT:
    def __init__(self, txt):
        self._txt = txt

    def getText(self):
        return self._txt


class _Child:
    def __init__(self, txt):
        self._txt = txt

    def getText(self):
        return self._txt


def test_validate_fstring_valid_and_invalid():
    s = "'{1+1}'"
    assert tu._validate_fstring(s) is True

    s_bad = "'{1+}'"
    assert tu._validate_fstring(s_bad) is False


def test_maybe_template_prefixes_f_when_possible():
    s = "'{value}'"
    out = tu._maybe_template(None, s)
    assert out.startswith('f') and "{value}" in out

    s_bad = "'{1+}'"
    assert tu._maybe_template(None, s_bad) == s_bad


def test_collecting_error_listener_records_errors():
    el = tu._CollectingErrorListener()
    el.syntaxError(None, None, 2, 4, "bad token", None)
    assert any('line 2:4 bad token' in e for e in el.errors)


def test_render_select_items_star_and_items():
    class StarCtx:
        def getChildCount(self):
            return 1

        def getChild(self, i):
            return _Child('*')

    assert tu._render_select_items(None, StarCtx()) == '*'

    class SI1:
        def expression(self):
            return 'exprnode'

        def getText(self):
            return 'si1text'

        def getChildCount(self):
            return 1

    class SI2:
        def expression(self):
            return None

        def getText(self):
            return 'col2'

        def getChildCount(self):
            return 1

    class Sctx:
        def selectItem(self):
            return [SI1(), SI2()]

        def getChildCount(self):
            return 2

        def getChild(self, i):
            items = self.selectItem()
            return items[i]

    class Visitor:
        def visit(self, node):
            return 'VISITED_EXPR'

    out = tu._render_select_items(Visitor(), Sctx())
    assert 'VISITED_EXPR' in out and 'col2' in out


def test_render_select_item_with_alias():
    class AliasSI:
        def expression(self):
            return 'e'

        def getText(self):
            return 'ignored'

        def getChildCount(self):
            return 3

        def getChild(self, i):
            if i == 1:
                return _Child('AS')
            if i == 2:
                return _Child('alias')
            return _Child('x')

    class V:
        def visit(self, node):
            return 'CORE'

    assert tu._render_select_item(V(), AliasSI()) == 'CORE AS alias'


def test_source_sql_variants():
    class C1:
        def ID(self):
            return _FT('tbl')

        def functionCall(self):
            return None

        def dataLoad(self):
            return None

        def sqlQuery(self):
            return None

    assert tu._source_sql(None, C1()) == 'tbl'

    class C2:
        def ID(self):
            return None

        def functionCall(self):
            return True

    class V:
        def visit(self, node):
            return 'FUNC()'

    assert tu._source_sql(V(), C2()) == 'FUNC()'

    class C3:
        def ID(self):
            return None

        def functionCall(self):
            return None

        def dataLoad(self):
            return None

        def sqlQuery(self):
            return True

    class V2:
        def visit(self, node):
            return 'SELECT 1'

    assert tu._source_sql(V2(), C3()) == '(SELECT 1)'


def test_id_list_simple():
    class L:
        def ID(self):
            return [_FT('a'), _FT('b')]

    assert tu._id_list(L()) == ['a', 'b']


def test_extract_id_list_from_arg_happy_path():
    class PrimaryInner:
        def __init__(self, name):
            self._name = name

        def ID(self):
            return _FT(self._name)

    class ChainExpr:
        def __init__(self, primary):
            self._primary = primary

        def orExpr(self):
            return self

        def andExpr(self, i):
            return self

        def equalityExpr(self, i):
            return self

        def relationalExpr(self, i):
            return self

        def additiveExpr(self, i):
            return self

        def multiplicativeExpr(self, i):
            return self

        def unaryExpr(self, i):
            return self

        def primary(self):
            return self._primary

    class ExprWrapper:
        def __init__(self, primary_inner):
            self._prim = ChainExpr(primary_inner)

        def orExpr(self):
            return self

        def andExpr(self, i):
            return self

        def equalityExpr(self, i):
            return self

        def relationalExpr(self, i):
            return self

        def additiveExpr(self, i):
            return self

        def multiplicativeExpr(self, i):
            return self

        def unaryExpr(self, i):
            return self

        def primary(self):
            return self._prim.primary()

    class Array:
        def __init__(self, exprs):
            self._exprs = exprs

        def expression(self):
            return self._exprs

    class PrimaryOuter:
        def __init__(self, array):
            self._array = array

        def arrayExpr(self):
            return self._array

    class E:
        def __init__(self, primary_outer):
            self._primary_outer = primary_outer

        def orExpr(self):
            return self

        def andExpr(self, i):
            return self

        def equalityExpr(self, i):
            return self

        def relationalExpr(self, i):
            return self

        def additiveExpr(self, i):
            return self

        def multiplicativeExpr(self, i):
            return self

        def unaryExpr(self, i):
            return self

        def primary(self):
            return self._primary_outer

    class Arg:
        def __init__(self, e):
            self._e = e

        def expression(self):
            return self._e

    prim_a = PrimaryInner('colA')
    prim_b = PrimaryInner('colB')
    expr1 = ExprWrapper(prim_a)
    expr2 = ExprWrapper(prim_b)
    arr = Array([expr1, expr2])
    p_outer = PrimaryOuter(arr)
    e = E(p_outer)
    a = Arg(e)

    cols = tu._extract_id_list_from_arg(None, a)
    assert cols == ['colA', 'colB']
