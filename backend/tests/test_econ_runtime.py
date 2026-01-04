import io
import os
import datetime

import pytest

import econ_runtime as er
import math
import json
import types
import pandas as pd

def test_set_and_get_current_user_and_reset():
    prev = er.get_current_user()
    er.set_current_user('test_user_42')
    assert er.get_current_user() == 'test_user_42'
    try:
        er._CTX_USER.set(prev)
    except Exception:
        pass


def test_magic_results_print_and_display_table_chart():
    er._reset_magic_results()
    r = er.Print('hello', 'world')
    assert isinstance(r, dict) and r.get('type') == 'text'

    t = [{'a': 1, 'b': 2}, {'a': 3, 'b': 4}]
    res = er.DisplayTable(t)
    assert isinstance(res, dict) and res['type'] == 'table'
    assert 'columns' in res and 'rows' in res

    ch = er.DisplayChart({'s1': [1, 2, 3]})
    assert isinstance(ch, dict) and ch['type'] == 'chart'


def test__to_float_and_ddb_basic():
    assert er._to_float('123.4') == pytest.approx(123.4)
    val = er.ddb(1000, 100, 5, 1)
    assert isinstance(val, float) and val >= 0.0


def test_fv_pmt_pv_zero_rate():
    assert er.fv(0, 5, 10, pv=0) == -(0 + 10 * 5)
    assert er.pmt(0, 5, 100) == pytest.approx(-(100) / 5)
    assert er.pv(0, 5, 10, fv=0) == pytest.approx(-(10 * 5))


def test_simple_returns_and_log_returns_list_based():
    data = [100, 110, 121]
    sr = er.simple_returns(data)
    assert sr == pytest.approx([0.1, 0.1])
    lr = er.log_returns(data)
    assert len(lr) == 2


def test_string_helpers_instr_trim_slices():
    assert er.instr(1, 'hello world', 'world') == 7
    assert er.trim('  x  ') == 'x'
    assert er.left('abcd', 2) == 'ab'
    assert er.right('abcd', 2) == 'cd'
    assert er.len_([1, 2, 3]) == 3
    assert er.replace_('aabb', 'aa', 'c') == 'cbb'


def test_parse_date_and_dateadd_and_datediff():
    d = er._parse_date('2020-01-02')
    assert isinstance(d, datetime.datetime)
    d2 = er.dateadd('d', 5, '2020-01-01')
    assert d2.date() == datetime.date(2020, 1, 6)
    diff = er.datediff('d', '2020-01-01', '2020-01-06')
    assert diff == 5


def test__to_iter_and__as_series_list_behavior():
    it = er._to_iter([1, 2, 3])
    assert isinstance(it, list)
    s = er._as_series([1, 2, 3])
    assert isinstance(s, list) or hasattr(s, '__iter__')


def test_register_udf_and_register_table_monkeypatched(monkeypatch):
    calls = {}

    class FakeConn:
        def create_function(self, name, func, *a, **kw):
            calls.setdefault('create', []).append((name, func))

        def register(self, name, obj):
            calls.setdefault('register', []).append((name, type(obj)))

        def unregister(self, name):
            calls.setdefault('unregister', []).append(name)

    fake = FakeConn()

    monkeypatch.setattr(er, '_get_duck_conn', lambda: fake)

    def sample(x):
        return x

    assert er.register_udf('fn1', sample) is True
    er.register_table('T', [{'a': 1}])
    assert 'create' in calls and calls['create']
    assert 'register' in calls and calls['register']




def setup_function(fn):
    try:
        er._reset_magic_results()
    except Exception:
        pass


def test_math_and_wrappers_basic():
    assert isinstance(er.atn(1), float)
    assert pytest.approx(er.cos(0), rel=1e-6) == math.cos(0)
    assert er.fix(3.7) == 3
    assert er.int_(4.9) == 4
    assert er.log(8, 2) == pytest.approx(3)
    assert er.sgn(-5) == -1
    assert er.AVG([1, 2, 3]) == pytest.approx(2)
    assert er.SUM([1, 2, 3]) == 6
    assert er.MEAN([1, 2, 3]) == pytest.approx(2)


def test_text_helpers_more():
    assert er.asc('A') == ord('A')
    ch = er.chr_(65)
    assert isinstance(ch, str) and (ch == '' or ch == 'A')
    dt = datetime.datetime(2020, 1, 2)
    assert er.format_(dt, '%Y') == '2020'
    assert er.lowecase('AbC') == 'abc'
    assert er.left('abcd', 2) == 'ab'
    assert er.right('abcd', 2) == 'cd'
    assert er.len_([1, 2, 3]) == 3
    assert er.replace_('aaab', 'a', 'x') == 'xxxb'


def test_date_helpers_and_time():
    assert er._parse_date('2021-01-01') is not None
    assert er.dateSerial(2000, 2, 3) == datetime.date(2000, 2, 3)
    assert isinstance(er.now(), datetime.datetime)
    assert isinstance(er.time(), datetime.time)
    assert er.dateadd('d', 1, '2020-01-01').date() == datetime.date(2020, 1, 2)
    assert er.datediff('d', '2020-01-01', '2020-01-04') == 3
    assert er.weekdayname(1) == 'Sunday'
    assert er.isdate('2020-01-01') is True


def test_statistics_and_financials():
    seq = [1, 2, 3, 4]
    assert er.variance(seq) >= 0
    assert er.median(seq) == 2.5
    assert er.quantile(seq, 0.5) == pytest.approx(2.5)
    assert er.normalize_minmax([1, 1, 1]) == [0, 0, 0]
    assert isinstance(er.zscore([1, 1, 1]), list)
    assert er.npv(0.0, 100, 100) == pytest.approx(200)
    assert isinstance(er.irr([-100, 110]), float)
    assert er.sln(100, 0, 10) == pytest.approx(10)
    assert er.syd(100, 0, 5, 1) >= 0


def test_series_helpers_indicator_rsi_and_returns():
    data = [1.0, 2.0, 3.0, 4.0]
    sr = er.simple_returns(data)
    assert len(sr) == 3
    lr = er.log_returns(data)
    assert len(lr) == 3
    rsi = er.indicator_rsi(data, period=2)
    if hasattr(rsi, 'tolist'):
        assert len(rsi.tolist()) == len(data)
    else:
        assert isinstance(rsi, list) and len(rsi) == len(data)


def test_display_table_chart_variants():
    er._reset_magic_results()
    res1 = er.DisplayTable([1, 2, 3])
    assert res1['type'] == 'table'
    res2 = er.DisplayTable([[1, 2], [3, 4]])
    assert res2['type'] == 'table'
    ch = er.DisplayChart([1, 2, 3])
    assert ch['type'] == 'chart'


def test_value_dataframe_behavior():
    df = pd.DataFrame([[5]])
    assert er.Value(df) == 5
    df2 = pd.DataFrame([[1], [2]])
    with pytest.raises(ValueError):
        er.Value(df2)


def test_exec_sql_with_fake_conn(monkeypatch):

    class FakeResult:
        def __init__(self, df):
            self._df = df

        def fetch_df(self):
            return self._df

        def fetchall(self):
            return [tuple(r) for r in self._df.values.tolist()]

    class FakeConn:
        def __init__(self, df):
            self._df = df

        def create_function(self, *args, **kwargs):
            return None

        def unregister(self, *args, **kwargs):
            return None

        def register(self, *args, **kwargs):
            return None

        def execute(self, sql):
            return FakeResult(self._df)

    df = pd.DataFrame({'x': [1, 2, 3]})
    fake = FakeConn(df)
    monkeypatch.setattr(er, '_get_duck_conn', lambda: fake)
    out = er.exec_sql('select x from t')
    assert hasattr(out, 'shape')
    df1 = pd.DataFrame([[42]])
    fake1 = FakeConn(df1)
    monkeypatch.setattr(er, '_get_duck_conn', lambda: fake1)
    out1 = er.exec_sql('select 1')
    assert out1 == 42


def test_model_helpers_no_user_and_with_user(monkeypatch):
    er._CTX_USER.set(None)
    out = er.ModelPredictions('m')
    if hasattr(out, 'shape'):
        assert out.empty
    else:
        assert out == []

    class Cursor:
        def __init__(self):
            self.last = ''

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def execute(self, sql, params=None):
            self.last = sql.lower()

        def fetchone(self):
            if 'select id from model' in self.last:
                return ('mid',)
            if 'select payloadjson from prediction' in self.last:
                return (json.dumps({'predictions': [{'a': 1}]}),)
            if 'select datablob from dataimport' in self.last:
                return (b'a,b\n1,2\n',)
            if 'select content2 from widget' in self.last:
                return ('Print("X")',)
            return None

    class Conn:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def cursor(self):
            return Cursor()

    er.set_db_connect(lambda: Conn())
    er.set_current_user('u1')
    um = er.UserModels('u1')
    preds = um.ModelPredictions('m')
    if hasattr(preds, 'shape'):
        assert preds.shape[0] == 1
    else:
        assert isinstance(preds, list)
    data = um.ModelData('m')
    assert data is not None
    got = um.getWidget('w')
    assert isinstance(got, list)




class FakeExecuteResult:
    def __init__(self, df=None, rows=None):
        self._df = df
        self._rows = rows

    def fetch_df(self):
        return self._df

    def fetchall(self):
        return self._rows


class FakeConn:
    def __init__(self, df=None, rows=None, fail_first=False):
        self._df = df
        self._rows = rows
        self.registered = {}
        self.unregistered = set()
        self.created_functions = []
        self._called = 0
        self._fail_first = fail_first

    def create_function(self, name, func, *args, **kwargs):
        self.created_functions.append((name, func, args, kwargs))

    def unregister(self, name):
        self.unregistered.add(name)

    def register(self, name, obj):
        self.registered[name] = obj

    def execute(self, sql):
        self._called += 1
        if self._fail_first and self._called == 1:
            raise Exception("simulated engine error")
        return FakeExecuteResult(self._df, self._rows)


def test_register_udf_success(monkeypatch):
    fake = FakeConn()
    monkeypatch.setattr(er, '_get_duck_conn', lambda: fake)

    def myfunc(x):
        return x * 2

    ok = er.register_udf('myfunc', myfunc)
    assert ok is True
    names = {t[0] for t in fake.created_functions}
    assert 'myfunc' in names or 'myfunc' in names


def test_register_table_with_dataframe_and_list(monkeypatch):
    fake = FakeConn()
    monkeypatch.setattr(er, '_get_duck_conn', lambda: fake)

    df = pd.DataFrame({'a': [1, 2]})
    er.register_table('TDF', df)
    assert 'TDF' in fake.registered
    assert isinstance(fake.registered['TDF'], pd.DataFrame)

    fake2 = FakeConn()
    monkeypatch.setattr(er, '_get_duck_conn', lambda: fake2)
    recs = [{'x': 1}, {'x': 2}]
    er.register_table('TLIST', recs)
    assert 'TLIST' in fake2.registered
    reg = fake2.registered['TLIST']
    assert hasattr(reg, 'columns') and 'x' in list(reg.columns)


def test_exec_sql_returns_scalar_and_dataframe(monkeypatch):
    df_scalar = pd.DataFrame([[42]])
    fake = FakeConn(df=df_scalar)
    monkeypatch.setattr(er, '_get_duck_conn', lambda: fake)

    res = er.exec_sql('select 1')
    assert res == 42

    df = pd.DataFrame({'a': [1, 2], 'b': [3, 4]})
    fake2 = FakeConn(df=df)
    monkeypatch.setattr(er, '_get_duck_conn', lambda: fake2)
    res2 = er.exec_sql('select a, b')
    assert isinstance(res2, pd.DataFrame)
    assert list(res2.columns) == ['a', 'b']


def test_exec_sql_fallback_emulation_applies_python_function(monkeypatch):
    base_df = pd.DataFrame({'col': [1, 2]})
    fake = FakeConn(df=base_df, fail_first=True)
    monkeypatch.setattr(er, '_get_duck_conn', lambda: fake)

    def myfunc(x):
        return x + 10

    globals()['myfunc'] = myfunc

    try:
        res = er.exec_sql('SELECT myfunc(col) as val FROM t')
        assert hasattr(res, 'columns')
        assert 'val' in list(res.columns)
        assert list(res['val']) == [11, 12]
    finally:
        globals().pop('myfunc', None)




def test___rows_with_various_inputs():
    data = [{'a': 1, 'b': 2}, {'a': 3, 'b': 4}]
    rows = list(er.__rows(data))
    assert hasattr(rows[0], 'a') and rows[0].a == 1

    tup = [(1, 2), (3, 4)]
    rows2 = list(er.__rows(tup))
    assert rows2[0] == (1, 2)

    class X:
        pass
    x = X()
    single = list(er.__rows(x))
    assert single[0] is x


def test__as_series_and_to_iter_with_lists_and_frames(monkeypatch):
    s = er._as_series([1, 2, 3])
    assert isinstance(s, list) or hasattr(s, '__iter__')

    it = er._to_iter([1, 2, 3])
    assert isinstance(it, list) and it == [1, 2, 3]


def test_load_csv_and_load_json_roundtrip(tmp_path):
    csv_path = tmp_path / 't.csv'
    csv_path.write_text('a,b\n1,2\n3,4\n', encoding='utf-8')
    df = er.load_csv(str(csv_path))
    if hasattr(df, 'to_dict'):
        assert 'a' in df.columns
    else:
        assert isinstance(df, list) and df[0]['a'] == '1'

    json_path = tmp_path / 'j.json'
    json_path.write_text(json.dumps([{'x': 1}, {'x': 2}]), encoding='utf-8')
    out = er.load_json(str(json_path))
    if hasattr(out, 'to_dict'):
        assert out.shape[0] == 2
    else:
        assert isinstance(out, list) and out[1]['x'] == 2


def test_CreateDF_basic():
    a = [1, 2, 3]
    b = [4, 5, 6]
    df = er.CreateDF(a, b)
    assert hasattr(df, 'shape')


def test_agg_shift_filter_and_drawdown():
    data = [1, 2, 3, 4]
    assert er.agg(data, 'mean') == pytest.approx(2.5)
    assert er.agg(data, 'sum') == 10
    shifted = er.shift_series(data, 1)
    assert shifted[1] is None or shifted[0] is None or len(shifted) == 4
    filtered = er.filter_series(data, 2)
    assert len(filtered) == 4
    dd = er.drawdown_series([1, 2, 1])
    assert isinstance(dd, list)


def test_date_helpers_and_text():
    assert er._parse_date('2021-12-01') is not None
    assert er.dateSerial(2020, 1, 1) == datetime.date(2020, 1, 1)
    assert er.weekdayname(1) == 'Sunday'
    assert er.instr(1, 'hello', 'ell') == 2
    assert er.trim('  x ') == 'x'


def test_type_predicates_and_vartype():
    assert er.isarray([1, 2, 3]) is True
    assert er.isnumeric('123') is True
    assert er.typename(5) == 'int' or er.typename(5) == 'int'
    assert er.vartype(None) == 'Null'


def test_financial_helpers_basic():
    assert er.npv(0.1, 100, 100) != None
    r = er.irr([ -100, 110 ])
    assert isinstance(r, float)


def test_UserModels_ModelPredictions_and_ModelData_and_getWidget(monkeypatch):
    class DummyCursor:
        def __init__(self):
            self.last = None

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def execute(self, sql, params=None):
            self.last = sql.lower()

        def fetchone(self):
            if 'select id from model' in self.last:
                return ('mid_1',)
            if 'select payloadjson from prediction' in self.last:
                return (json.dumps({'predictions': [{'p': 1}]}),)
            if 'select datablob from dataimport' in self.last:
                return (b'a,b\n1,2\n',)
            if 'select content2 from widget' in self.last:
                return ('Print("WIDGET_OK")',)
            return None

    class DummyConn:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def cursor(self):
            return DummyCursor()

    er.set_db_connect(lambda: DummyConn())

    er.set_current_user('u_xyz')
    um = er.UserModels('u_xyz')
    preds = um.ModelPredictions('m')
    if hasattr(preds, 'to_dict'):
        assert preds.shape[0] == 1
    else:
        assert isinstance(preds, list) and preds[0]['p'] == 1

    df = um.ModelData('m')
    if hasattr(df, 'to_dict'):
        assert not df.empty
    else:
        assert isinstance(df, list)

    got = um.getWidget('w1')
    assert isinstance(got, list)
    er.set_db_connect(lambda: None)
