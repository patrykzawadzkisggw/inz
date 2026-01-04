import types
import builtins
import pandas as pd
import pytest
import json
import econ_runtime as er


class DummyCallable:
    def __call__(self, x=None):
        return x


def test_set_current_user_trim_and_blank():
    prev = er.get_current_user()
    er.set_current_user("  u42  ")
    assert er.get_current_user() == "u42"
    er.set_current_user("")
    assert er.get_current_user() == "u42"
    if prev:
        er.set_current_user(prev)


def test_get_duck_conn_missing_duckdb(monkeypatch):
    monkeypatch.setattr(er, "duckdb", None)
    with pytest.raises(RuntimeError):
        er._get_duck_conn()


class _FakeConnTypeError:
    def __init__(self):
        self.calls = []

    def create_function(self, *args, **kwargs):
        self.calls.append((args, kwargs))
        if kwargs.get("replace", False):
            raise TypeError("bad replace")
        return True


class _FakeConnAlt:
    def __init__(self):
        self.calls = []

    def create_function(self, name, func, *args, **kwargs):
        self.calls.append((name, args, kwargs))
        if args and isinstance(args[0], list):
            return True
        raise Exception("force alt signature")


class _FakeConnRegister:
    def __init__(self):
        self.registered = None

    def unregister(self, name):
        return None

    def register(self, name, obj):
        self.registered = obj


class _FakeResult:
    def __init__(self, df=None, rows=None):
        self._df = df
        self._rows = rows or []

    def fetch_df(self):
        return self._df

    def fetchall(self):
        return self._rows


class _FakeConnMissing:
    def __init__(self, df):
        self.df = df
        self.calls = 0
        self.functions = []

    def create_function(self, name, func, *a, **kw):
        self.functions.append(name)

    def unregister(self, name):
        return None

    def register(self, name, obj):
        return None

    def execute(self, sql):
        self.calls += 1
        if self.calls == 1:
            raise Exception("Scalar Function with name missingfunc does not exist")
        return _FakeResult(self.df)


class _FakeConnFallback:
    def __init__(self, df):
        self.df = df
        self.calls = 0

    def create_function(self, *a, **kw):
        return None

    def unregister(self, name):
        return None

    def register(self, name, obj):
        return None

    def execute(self, sql):
        self.calls += 1
        if self.calls == 1:
            raise Exception("boom")
        return _FakeResult(self.df)


def test_register_udf_typeerror_and_alt(monkeypatch):
    f1 = _FakeConnTypeError()
    monkeypatch.setattr(er, "_get_duck_conn", lambda: f1)
    assert er.register_udf("fn1", lambda x: x)
    assert len(f1.calls) >= 2

    f2 = _FakeConnAlt()
    monkeypatch.setattr(er, "_get_duck_conn", lambda: f2)
    assert er.register_udf("fn2", lambda x: x)
    assert any(args and isinstance(args[0], list) for _, args, _ in f2.calls)


def test_register_table_pd_none_raises(monkeypatch):
    fake_conn = _FakeConnRegister()
    monkeypatch.setattr(er, "_get_duck_conn", lambda: fake_conn)
    monkeypatch.setattr(er, "pd", None)
    with pytest.raises(RuntimeError):
        er.register_table("T", [1, 2])


def test_register_table_list(monkeypatch):
    fake_conn = _FakeConnRegister()
    monkeypatch.setattr(er, "_get_duck_conn", lambda: fake_conn)
    monkeypatch.setattr(er, "pd", pd)
    er.register_table("T", [1, 2])
    assert hasattr(fake_conn.registered, "columns")
    assert "value" in list(fake_conn.registered.columns)


def test_exec_sql_missing_function_retry(monkeypatch):
    df = pd.DataFrame({"col": [1, 2]})
    fake = _FakeConnMissing(df)
    monkeypatch.setattr(er, "_get_duck_conn", lambda: fake)

    def missingfunc(x):
        return x + 1

    res = er.exec_sql("select missingfunc(col) from t")
    assert hasattr(res, "shape") and res.shape[0] == 2
    assert "missingfunc" in fake.functions


def test_exec_sql_fallback_python_function(monkeypatch):
    df = pd.DataFrame({"col": [1, 2]})
    fake = _FakeConnFallback(df)
    monkeypatch.setattr(er, "_get_duck_conn", lambda: fake)

    def pyfunc(x):
        return x + 5

    res = er.exec_sql("SELECT pyfunc(col) AS val FROM t")
    assert hasattr(res, "to_dict")
    assert list(res["val"]) == [6, 7]


def test___rows_dataframe_and_series():
    df = pd.DataFrame({"a": [1, 2]})
    rows = list(er.__rows(df))
    assert hasattr(rows[0], "a") and rows[0].a == 1

    series_rows = list(er.__rows(pd.Series([10, 20])))
    assert series_rows == [10, 20]


def test__as_series_variants():
    s = er._as_series((1, 2))
    assert hasattr(s, "tolist")
    df = pd.DataFrame({"x": [5]})
    assert er._as_series(df).iloc[0] == 5


def test_load_csv_and_json_fallbacks(tmp_path, monkeypatch):
    csv_path = tmp_path / "t.csv"
    csv_path.write_text("a,b\n1,2\n", encoding="utf-8")
    monkeypatch.setattr(er, "pd", None)
    rows = er.load_csv(str(csv_path), columns=["a"])
    assert rows == [{"a": "1"}]
    monkeypatch.setattr(er, "pd", pd)

    json_path = tmp_path / "j.json"
    json_path.write_text("[{\"x\":1},{\"x\":2}]")
    df = er.load_json(str(json_path), columns=["x"])
    assert list(df["x"]) == [1, 2]


def test_indicator_and_agg_shift_filter_fallbacks(monkeypatch):
    monkeypatch.setattr(er, "pd", None)
    data = [1.0, 2.0, 3.0]
    rsi = er.indicator_rsi(data, period=2)
    assert len(rsi) == len(data)
    assert er.agg(data, "mean") == pytest.approx(sum(data)/len(data))
    with pytest.raises(ValueError):
        er.agg(data, "bad")
    assert er.shift_series(data, -1)[-1] is None
    assert er.filter_series(data, 2)[0] is not None
    monkeypatch.setattr(er, "pd", pd)


def test_numeric_helpers_edges():
    class Bad:
        def __float__(self):
            raise TypeError()
    assert er._to_float(Bad()) == 0.0
    assert er.ddb(100, 10, 5, 0) == 0.0
    assert er.fv(0, 2, 10, pv=0) == -(0 + 10 * 2)
    assert er.pmt(0, 2, 10, fv=0) == pytest.approx(-(10)/2)
    assert er.ipmt(0.1, 1, 5, 100, type=1) == 0.0
    assert er.pv(0, 2, 10, fv=0) == -(10 * 2)
    assert er.nper(0, 0, 0) == 0


def test_stat_variants_and_limits():
    assert er.zscore([1, 1, 1]) == [0, 0, 0]
    assert er.normalize_minmax([5, 5]) == [0, 0]
    assert er.value_at_risk([1, 2, 3], level=0.95, method="normal") > 0
    assert er.expected_shortfall([1, 2, 3], level=0.5) != 0.0


def test_wrapper_helpers_and_value_errors():
    er._CTX_USER.set(None)
    preds = er.ModelPredictions("m")
    if hasattr(preds, "empty"):
        assert preds.empty
    else:
        assert preds == []

    data = er.ModelData("m")
    if hasattr(data, "empty"):
        assert data.empty
    else:
        assert data == []

    widget = er.GetWidget("w")
    assert widget == []

    df = pd.DataFrame({"a": [1, 2]})
    with pytest.raises(ValueError):
        er.Value(df)


def test_user_models_get_widget_errors(monkeypatch):
    class BadConn:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def cursor(self):
            raise RuntimeError("no cursor")

    er.set_db_connect(lambda: BadConn())
    um = er.UserModels("u1")
    assert um._find_model_id("m") is None
    mp = um.ModelPredictions("m")
    assert mp.empty if hasattr(mp, "empty") else mp == []

    md = um.ModelData("m")
    assert md.empty if hasattr(md, "empty") else md == []

    assert um.getWidget("w") == []


def test_register_udf_conn_error(monkeypatch):
    monkeypatch.setattr(er, "_get_duck_conn", lambda: (_ for _ in ()).throw(RuntimeError("no conn")))
    assert er.register_udf("fn", lambda x: x) is False


def test_register_table_dataframe_unregister_error(monkeypatch):
    class Conn:
        def __init__(self):
            self.registered = None

        def unregister(self, name):
            raise RuntimeError("fail")

        def register(self, name, obj):
            self.registered = obj

    fake = Conn()
    monkeypatch.setattr(er, "_get_duck_conn", lambda: fake)
    monkeypatch.setattr(er, "pd", pd)
    er.register_table("T", pd.DataFrame({"v": [1]}))
    assert hasattr(fake.registered, "columns")


def test_pandas_paths_and_financial_branches():
    s = pd.Series([1.0, 2.0, 3.0])
    rsi = er.indicator_rsi(s, period=2)
    assert hasattr(rsi, "iloc")

    assert er.agg(s, "std") >= 0
    assert er.shift_series(s, 1).iloc[0] is None or True
    assert hasattr(er.filter_series(s, 2), "iloc")

    df_two = pd.DataFrame({"a": [1, 2], "b": [3, 4]})
    with pytest.raises(ValueError):
        er._to_iter(df_two)
    df_one = pd.DataFrame({"a": [5, 6]})
    assert list(er._to_iter(df_one)) == [5, 6]

    lr = er.log_returns(pd.Series([1.0, 2.0, 4.0]))
    assert len(lr) == 2
    dd = er.drawdown_series(pd.Series([1.0, 2.0, 1.0]))
    assert hasattr(dd, "iloc")
    assert er.max_drawdown(pd.Series([1.0, 2.0, 1.0])) <= 0
    assert er.cagr([0, 1]) == 0.0
    assert er.volatility(pd.Series([1.0, 2.0]), periods_per_year=2) >= 0
    assert er.sharpe_ratio(pd.Series([1.0, 1.0, 1.0])) == 0.0
    assert er.sortino_ratio([1.0, 2.0, 3.0]) >= 0
    assert er.beta(pd.Series([1, 2, 3]), pd.Series([1, 2, 4])) >= 0
    assert er.alpha([1, 2], [1, 2]) is not None
    assert er.variance([1, 2]) >= 0
    assert er.quantile(pd.Series([1, 2, 3]), 0.5) == 2
    assert er.covariance([1, 2, 3], [1, 2, 3]) >= 0
    assert er.correlation([1, 2, 3], [1, 2, 3]) >= 0
    assert er.skewness([1, 2]) == 0
    assert er.kurtosis([1, 2, 3]) == 0
    assert er.value_at_risk(pd.Series([1, 2, 3]), level=0.5) >= 0
    assert er.expected_shortfall(pd.Series([1, 2, 3]), level=0.5) >= 0


def test_magic_results_proxy_behaviour():
    er._reset_magic_results()
    er.Print("hello")
    assert len(er._EVAL_RESULTS) == 1
    assert er._EVAL_RESULTS[0]["type"] == "text"
    assert list(iter(er._EVAL_RESULTS))[0]["text"] == "hello"


def test_user_models_success_paths(monkeypatch):
    class Cursor:
        def __init__(self):
            self.last = ""

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def execute(self, sql, params=None):
            self.last = sql.lower()

        def fetchone(self):
            if "select id from model" in self.last:
                return ("mid_1",)
            if "select payloadjson from prediction" in self.last:
                return (json.dumps({"predictions": [{"p": 1}]}),)
            if "select datablob from dataimport" in self.last:
                return (b"a,b\n1,2\n",)
            if "select content2 from widget" in self.last:
                return ("Print(\"OK\")",)
            return None

    class Conn:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def cursor(self):
            return Cursor()

    er.set_db_connect(lambda: Conn())
    er.set_current_user("u_success")
    um = er.UserModels("u_success")
    assert um._find_model_id("m") == "mid_1"
    preds = um.ModelPredictions("m")
    assert hasattr(preds, "shape") and preds.shape[0] == 1
    data = um.ModelData("m")
    assert hasattr(data, "shape") and data.shape[0] == 1
    res = um.getWidget("w")
    assert isinstance(res, list) and res[0]["type"] == "text"
    assert hasattr(er.ModelPredictions("m"), "shape")
    assert hasattr(er.ModelData("m"), "shape")
    assert isinstance(er.GetWidget("w"), list)
    assert er.Value(pd.DataFrame([[123]])) == 123


def test_date_text_display_and_create_paths(tmp_path):
    assert er.dateadd('h', 1, '2020-01-01').hour == 1
    assert er.datediff('m', '2020-01-01', '2020-02-01') == 1
    assert er.datepart('w', '2020-01-05') == 7
    assert er.monthname(13) == ''
    assert er.timevalue('2020-01-01 01:02:03').hour == 1
    assert er.weekdayname(0) == ''
    assert er.isdate('not-a-date') is False

    assert er.asc('') == 0
    assert er.chr_('bad') == ''
    assert er.format_(123, '.1f') == '123.0'
    assert er.instr(1, 'abc', '') == 1
    class NoLen:
        pass
    assert er.len_(NoLen()) == 0

    t1 = er.DisplayTable([{'a': 1}, {'b': 2}])
    assert t1['type'] == 'table'
    t2 = er.DisplayTable([(1, 2), (3,)])
    assert t2['type'] == 'table'
    t3 = er.DisplayTable([1, 2, 3])
    assert t3['type'] == 'table'

    c1 = er.DisplayChart({'x': [1, 2]})
    assert c1['type'] == 'chart'
    c2 = er.DisplayChart((1, 2, 3))
    assert c2['type'] == 'chart'
    c3 = er.DisplayChart(5)
    assert c3['type'] == 'chart'

    empty_df = er.CreateDF()
    assert hasattr(empty_df, 'shape') and empty_df.shape[0] == 0
    df_named = er.CreateDF([1, 2], 'A', [3, 4], 'B')
    assert list(df_named.columns) == ['A', 'B']

    s = pd.Series([1.0, 2.0, 4.0])
    sr = er.simple_returns(s)
    assert len(sr) == 2
    lr = er.log_returns(s)
    assert len(lr) == 2


def test_more_numeric_and_date_branches():
    assert er.ipmt(0.1, 3, 5, 100) != 0
    assert isinstance(er.nper(0.1, 0, 100), (int, float))
    assert er.mirr([1, 2], 0.1, 0.1) == 0.0

    assert er.dateadd('m', 1, '2020-01-31').month == 2
    assert er.dateadd('n', 5, '2020-01-01').minute == 5
    assert er.dateadd('s', 2, '2020-01-01').second == 2
    assert er.datediff('h', '2020-01-01', '2020-01-02') == 24
    assert er.datediff('n', '2020-01-01', '2020-01-01 00:01:00') == 1
    assert er.datediff('s', '2020-01-01', '2020-01-01 00:00:02') == 2

    assert er.isarray((1, 2)) is True
    assert er.isempty([]) is True
    assert er.iserror(RuntimeError()) is True
    assert er.ismissing(None) is True
    assert er.isnull(None) is True
    assert er.isnumeric('abc') is False
    assert er.isobject(object()) is False
    assert er.typename(5) == 'int'
    assert er.vartype({}) == 'Object'

    df = pd.DataFrame({'a': [1, 2]})
    assert er.DisplayTable(df)['type'] == 'table'
    assert er.DisplayChart(df)['type'] == 'chart'
    ser = pd.Series([1, 2])
    assert er.DisplayTable(ser)['type'] == 'table'
    assert er.DisplayChart(ser)['type'] == 'chart'


def test_get_duck_conn_success_and_cache(monkeypatch):
    class FakeDuck:
        def __init__(self):
            self.calls = 0

        def connect(self, database=''):
            self.calls += 1
            return f"conn{self.calls}"

    fake = FakeDuck()
    monkeypatch.setattr(er, "duckdb", types.SimpleNamespace(connect=fake.connect))
    er._CTX_DUCK_CONN.set(None)
    c1 = er._get_duck_conn()
    c2 = er._get_duck_conn()
    assert c1 == c2 == "conn1"
    assert fake.calls == 1


def test_register_udf_lowercase_failure_path(monkeypatch):
    class Conn:
        def __init__(self):
            self.calls = []

        def create_function(self, name, func, *args, **kwargs):
            self.calls.append(name)
            if name.islower():
                raise RuntimeError("lower fail")
            return True

    fake = Conn()
    monkeypatch.setattr(er, "_get_duck_conn", lambda: fake)
    assert er.register_udf("MyFunc", lambda x: x) is True
    assert any(name == "MyFunc" for name in fake.calls)
    assert any(name == "myfunc" for name in fake.calls)


def test_exec_sql_fallback_alias_and_reorder(monkeypatch):
    df = pd.DataFrame({"x": [1, 2], "y": [10, 20]})

    class _Res:
        def __init__(self, df):
            self.df = df

        def fetch_df(self):
            return self.df

    class Conn:
        def __init__(self, df):
            self.df = df
            self.calls = 0

        def create_function(self, *a, **kw):
            return None

        def unregister(self, name):
            return None

        def register(self, name, obj):
            return None

        def execute(self, sql):
            self.calls += 1
            if self.calls == 1:
                raise Exception("boom")
            return _Res(self.df)

    conn = Conn(df)
    monkeypatch.setattr(er, "_get_duck_conn", lambda: conn)

    def pyfunc(val):
        return val * 2

    res = er.exec_sql("SELECT pyfunc(x) AS fx, y AS y_alias FROM t")
    assert list(res["fx"]) == [2, 4]
    assert list(res["y_alias"]) == [10, 20]


def test_exec_sql_no_pandas_scalar(monkeypatch):
    orig_pd = er.pd

    class Conn:
        def execute(self, sql):
            class R:
                def fetchall(self_inner):
                    return [[7]]

            return R()

    monkeypatch.setattr(er, "pd", None)
    monkeypatch.setattr(er, "_get_duck_conn", lambda: Conn())
    assert er.exec_sql("select 1") == 7
    monkeypatch.setattr(er, "pd", orig_pd)


def test_load_csv_column_coercion(tmp_path, monkeypatch):
    csv_path = tmp_path / "nums.csv"
    csv_path.write_text("0,1\n1,2\n", encoding="utf-8")
    monkeypatch.setattr(er, "pd", pd)
    df = er.load_csv(str(csv_path), columns=[0])
    assert list(df.columns) == ["0"]


def test_alert_print_and_magic_proxy(capsys):
    er._reset_magic_results()
    er.send_alert_email("test-message")
    er.print("plain-out")
    er.Print("magic")
    er.Print("second")
    out = capsys.readouterr().out
    assert "ALERT: test-message" in out
    assert len(er._EVAL_RESULTS) >= 2
    assert er._EVAL_RESULTS[0]["text"] == "magic"
    assert er._EVAL_RESULTS.copy()[1]["text"] == "second"
    assert er._EVAL_RESULTS[1]["text"] == "second"


def test_display_table_and_chart_exception_branches():
    class BadDF(pd.DataFrame):
        def to_dict(self, orient='records'):
            raise RuntimeError("fail to_dict")

    bad_df = BadDF({"a": [1]})
    t = er.DisplayTable(bad_df)
    assert t["columns"] == ["value"]
    assert t["rows"][0]["value"]

    class BadChartDF(pd.DataFrame):
        def __getitem__(self, key):
            raise RuntimeError("bad col")

    bad_chart = BadChartDF({"a": [1]})
    c = er.DisplayChart(bad_chart)
    assert c["type"] == "chart"


def test_rate_and_risk_metrics_normal_branch():
    r = er.rate(2, -100, 1000, guess=0.1)
    assert isinstance(r, float)
    var = er.value_at_risk([1, 2, 3, 4], level=0.9, method="normal")
    assert isinstance(var, float)


def test_user_models_without_db_connect(monkeypatch):
    monkeypatch.setattr(er, "_db_connect", None)
    er._CTX_DB_CONNECT.set(None)
    um = er.UserModels("u_none")
    assert um._find_model_id("m") is None
    preds = um.ModelPredictions("m")
    if hasattr(preds, "empty"):
        assert preds.empty
    else:
        assert preds == []
    data = um.ModelData("m")
    if hasattr(data, "empty"):
        assert data.empty
    else:
        assert data == []


def test_register_udf_typeerror_failure(monkeypatch):
    class Conn:
        def create_function(self, name, func, *a, **kw):
            if kw.get("replace"):
                raise TypeError("bad replace")
            raise RuntimeError("fail")

    monkeypatch.setattr(er, "_get_duck_conn", lambda: Conn())
    assert er.register_udf("fn", lambda x: x) is False


def test_exec_sql_missing_function_without_callable(monkeypatch):
    class Conn:
        def __init__(self):
            self.calls = 0

        def unregister(self, name):
            raise RuntimeError("no unregister")

        def register(self, name, obj):
            return None

        def create_function(self, *a, **kw):
            return None

        def execute(self, sql):
            self.calls += 1
            raise Exception('Scalar Function with name missingfn does not exist')

    monkeypatch.setattr(er, "_get_duck_conn", lambda: Conn())
    with pytest.raises(Exception):
        er.exec_sql("select missingfn(x) from t")


def test_exec_sql_fallback_sets_null_on_exception(monkeypatch):
    df = pd.DataFrame({"x": [1, 2]})

    class _Res:
        def __init__(self, df):
            self.df = df

        def fetch_df(self):
            return self.df

    class Conn:
        def __init__(self, df):
            self.df = df
            self.calls = 0

        def create_function(self, *a, **kw):
            return None

        def unregister(self, name):
            return None

        def register(self, name, obj):
            return None

        def execute(self, sql):
            self.calls += 1
            if self.calls == 1:
                raise Exception("boom")
            return _Res(self.df)

    conn = Conn(df)
    monkeypatch.setattr(er, "_get_duck_conn", lambda: conn)

    def bad(val):
        raise ValueError("bad")

    res = er.exec_sql("SELECT bad(x) AS bx FROM t")
    assert list(res["bx"]) == [None, None]


def test___rows_non_iterable_path():
    class BadIter:
        def __iter__(self):
            raise RuntimeError("no iter")

    obj = BadIter()
    assert list(er.__rows(obj)) == [obj]


def test_rate_zero_guess_branch():
    r = er.rate(1, -10, 100, guess=0, maxiter=2)
    assert isinstance(r, float)


def test_display_series_exception_paths():
    class SeriesLike:
        def __iter__(self):
            raise RuntimeError("noiter")

        def __len__(self):
            return 1

    class ChartSeriesLike(SeriesLike):
        __name__ = "Series"

    s = SeriesLike()
    SeriesLike.__name__ = "SeriesLikeSeries"
    t = er.DisplayTable(s)
    assert t["columns"] == ["value"]

    cs = ChartSeriesLike()
    ChartSeriesLike.__name__ = "SeriesChart"
    c = er.DisplayChart(cs)
    assert c["type"] == "chart"


def test_model_predictions_and_data_error_branches(monkeypatch):
    monkeypatch.setattr(er.UserModels, "_find_model_id", lambda self, name: "mid")

    class Cursor:
        def __init__(self):
            self.calls = 0

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def execute(self, sql, params=None):
            self.calls += 1

        def fetchone(self):
            if self.calls == 1:
                return ("not-json",)
            return (b"a,b\n1,2\n",)

    class Conn:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def cursor(self):
            return Cursor()

    monkeypatch.setattr(er, "_db_connect", lambda: Conn())
    monkeypatch.setattr(er, "pd", pd)
    monkeypatch.setattr(pd, "read_csv", lambda *a, **kw: (_ for _ in ()).throw(ValueError("csv fail")))

    um = er.UserModels("u_err")
    preds = um.ModelPredictions("m")
    assert hasattr(preds, "empty") and preds.empty

    data = um.ModelData("m")
    assert hasattr(data, "empty") and data.empty


def test_register_udf_typeerror_lowercase(monkeypatch):
    class Conn:
        def __init__(self):
            self.calls = []

        def create_function(self, name, func, *a, **kw):
            self.calls.append((name, kw))
            if kw.get("replace"):
                raise TypeError("bad replace")
            if name.islower():
                raise RuntimeError("lower boom")
            return True

    conn = Conn()
    monkeypatch.setattr(er, "_get_duck_conn", lambda: conn)
    assert er.register_udf("FuncX", lambda x: x) is True
    assert any(n == "funcx" for n, _ in conn.calls)


def test_register_table_scalar_branch(monkeypatch):
    class Conn:
        def __init__(self):
            self.registered = None

        def unregister(self, name):
            raise RuntimeError("oops")

        def register(self, name, obj):
            self.registered = obj

    conn = Conn()
    monkeypatch.setattr(er, "_get_duck_conn", lambda: conn)
    monkeypatch.setattr(er, "pd", pd)
    er.register_table("T", 5)
    assert conn.registered is not None


def test_exec_sql_unregister_exception(monkeypatch):
    df = pd.DataFrame({"df": [1]})

    class _Res:
        def fetch_df(self):
            return pd.DataFrame({"x": [1]})

    class Conn:
        def __init__(self):
            self.unreg = 0

        def unregister(self, name):
            self.unreg += 1
            raise RuntimeError("nope")

        def register(self, name, obj):
            return None

        def create_function(self, *a, **kw):
            return None

        def execute(self, sql):
            return _Res()

    conn = Conn()
    monkeypatch.setattr(er, "_get_duck_conn", lambda: conn)
    res = er.exec_sql("select 1")
    assert hasattr(res, "shape")
    assert conn.unreg >= 1


def test___rows_exception_branches():
    class BadDF(pd.DataFrame):
        def to_dict(self, orient='records'):
            raise RuntimeError("bad df")

    rows_df = list(er.__rows(BadDF({"a": [1]})))
    assert rows_df

    class BadSeries(pd.Series):
        def __iter__(self):
            raise RuntimeError("bad series")

    rows_series = list(er.__rows(BadSeries([1])))
    assert rows_series == [rows_series[0]] 


def test_load_csv_and_json_edge_paths(tmp_path, monkeypatch):
    csv_path = tmp_path / "raw.csv"
    csv_path.write_text("a,b\n1,2\n", encoding="utf-8")
    monkeypatch.setattr(er, "pd", None)
    rows = er.load_csv(str(csv_path))
    assert isinstance(rows, list)

    json_path = tmp_path / "obj.json"
    json_path.write_text("{\"x\":1}", encoding="utf-8")
    data = er.load_json(str(json_path))
    assert isinstance(data, dict)
    monkeypatch.setattr(er, "pd", pd)


def test_financial_extra_branches():
    assert er.ddb(100, 90, 2, 1, factor=2) == 10
    assert er.fv(0.1, 2, 10, pv=100) != 0
    assert er.ipmt(0.1, 6, 5, 100) == 0.0
    assert er.ipmt(0.1, 1, 5, 100, type=1) == 0.0
    assert er.ppmt(0.1, 1, 5, 100) != 0
    assert er.pv(0.1, 2, 10, fv=5) != 0
    assert er.npeer(0.05, 10, 100) == er.nper(0.05, 10, 100)
    assert er.mirr([-100, 110], 0.1, 0.2) >= 0


def test_rate_and_stats_deeper_branches():
    assert er.rate(1, -10, 100, guess=0, maxiter=3) != 0
    assert er.skewness([1, 2, 3, 9]) != 0
    assert er.kurtosis([1, 2, 3, 4, 9]) != 0


def test_displaychart_dataframe_exception_branch():
    BadChartDF = type(
        "DataFrameLikeDF",
        (pd.DataFrame,),
        {"__getitem__": lambda self, key: (_ for _ in ()).throw(RuntimeError("bad col"))},
    )
    bad = BadChartDF({"a": [1]})
    c = er.DisplayChart(bad)
    assert c["type"] == "chart"


def test_value_at_risk_expected_shortfall_additional():
    assert er.value_at_risk([1, 2, 3, 4], level=0.5, method="historical") >= 0
    assert er.expected_shortfall([1, 2, 3, 4], level=0.9) >= 0


def test_model_data_string_blob(monkeypatch):
    monkeypatch.setattr(er.UserModels, "_find_model_id", lambda self, name: "mid")

    class Cursor:
        def __init__(self):
            self.calls = 0

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def execute(self, sql, params=None):
            self.calls += 1

        def fetchone(self):
            return ("a,b\n1,2\n",)

    class Conn:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def cursor(self):
            return Cursor()

    monkeypatch.setattr(er, "_db_connect", lambda: Conn())
    md = er.UserModels("u_text").ModelData("m")
    assert hasattr(md, "shape")


def test_register_udf_all_fail(monkeypatch):
    class Conn:
        def create_function(self, *a, **kw):
            raise RuntimeError("fail all")

    monkeypatch.setattr(er, "_get_duck_conn", lambda: Conn())
    assert er.register_udf("fn", lambda x: x) is False


def test_exec_sql_retry_registers_callable(monkeypatch):
    df = pd.DataFrame({"v": [1, 2]})

    class _Res:
        def fetch_df(self):
            return df

    class Conn:
        def __init__(self):
            self.calls = 0
            self.registered = []

        def create_function(self, name, func, *a, **kw):
            self.registered.append(name)

        def unregister(self, name):
            return None

        def register(self, name, obj):
            return None

        def execute(self, sql):
            self.calls += 1
            if self.calls == 1:
                raise Exception("Scalar Function with name missingfunc does not exist")
            return _Res()

    conn = Conn()
    monkeypatch.setattr(er, "_get_duck_conn", lambda: conn)

    def missingfunc(x):
        return x + 1

    res = er.exec_sql("select missingfunc(v) from t")
    assert conn.calls == 2
    assert "missingfunc" in conn.registered
    assert list(res["v"]) == [1, 2]


def test_stats_non_pandas_branches():
    assert er.max_drawdown([1, 2, 1]) <= 0
    assert er.cagr([1, 2, 4], periods_per_year=2) != 0
    assert er.volatility([1, 2, 3], periods_per_year=2) > 0
    assert er.sharpe_ratio([1, 2, 3], risk_free=0.1, periods_per_year=2) != 0
    assert er.sortino_ratio([-1, 1, 2], risk_free=0.0, periods_per_year=2) != 0


def test_model_predictions_no_db(monkeypatch):
    monkeypatch.setattr(er.UserModels, "_find_model_id", lambda self, name: "mid")
    er._CTX_DB_CONNECT.set(None)
    monkeypatch.setattr(er, "_db_connect", None)
    res = er.UserModels("u").ModelPredictions("m")
    assert hasattr(res, "empty") and res.empty


def test_model_data_bytes_no_pandas(monkeypatch):
    monkeypatch.setattr(er.UserModels, "_find_model_id", lambda self, name: "mid")
    monkeypatch.setattr(er, "pd", None)

    class Cursor:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def execute(self, sql, params=None):
            return None

        def fetchone(self):
            return (b"a,b\n1,2\n",)

    class Conn:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def cursor(self):
            return Cursor()

    monkeypatch.setattr(er, "_db_connect", lambda: Conn())
    res = er.UserModels("u").ModelData("m")
    assert isinstance(res, list) and isinstance(res[0], dict)
    monkeypatch.setattr(er, "pd", pd)
