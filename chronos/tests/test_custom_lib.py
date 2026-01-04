import pytest
import pandas as pd
import numpy as np
from datetime import datetime
from fastapi import HTTPException

import custom_lib as cl


def test_handle_missing_interpolate():
    idx = pd.date_range("2025-01-01", periods=5, freq="D")
    s = pd.Series([1.0, None, None, 4.0, 5.0], index=idx)
    res = cl.handle_missing(s, "interpolate")
    assert not res.isna().any()
    assert pytest.approx(res.iloc[1]) == 2.0


@pytest.mark.parametrize("strategy, expected_middle", [
    ("ffill", 1.0),
    ("bfill", 3.0),
    ("zero", 0.0),
])
def test_handle_missing_strategies(strategy, expected_middle):
    idx = pd.date_range("2025-01-01", periods=3, freq="D")
    s = pd.Series([1.0, None, 3.0], index=idx)
    res = cl.handle_missing(s, strategy)
    assert not res.isna().any()
    assert res.iloc[1] == expected_middle


def test_handle_missing_mean_median_drop():
    idx = pd.date_range("2025-02-01", periods=5, freq="D")
    s = pd.Series([1.0, None, 3.0, None, 5.0], index=idx)

    m = cl.handle_missing(s, "mean")
    assert not m.isna().any()
    assert pytest.approx(m.mean()) == m.mean()

    med = cl.handle_missing(s, "median")
    assert not med.isna().any()
    assert med.iloc[1] == pytest.approx(np.median([1.0, 3.0, 5.0]))

    dropped = cl.handle_missing(s, "drop")
    assert dropped.isna().sum() == 0
    assert len(dropped) < len(s)


def test_handle_missing_non_datetime_interpolate():
    idx = pd.Index([0, 1, 2, 3])
    s = pd.Series([0.0, None, 2.0, 3.0], index=idx)
    r = cl.handle_missing(s, "interpolate")
    assert r.iloc[1] == pytest.approx(1.0)


def test_infer_freq_business_day():
    idx = pd.bdate_range("2025-01-01", periods=10)
    f = cl.infer_freq(idx)
    assert f == "B"


def test_infer_freq_single_none():
    idx = pd.DatetimeIndex([pd.Timestamp("2025-01-01")])
    assert cl.infer_freq(idx) is None


def test_infer_freq_hourly_and_three_day():
    idx_h = pd.date_range("2025-01-01", periods=4, freq="H")
    assert cl.infer_freq(idx_h) in ("H", "h")

    idx_3d = pd.date_range("2025-01-01", periods=4, freq="3D")
    f = cl.infer_freq(idx_3d)
    assert f is not None


def test_infer_freq_monkeypatched_for_delta_branch(monkeypatch):
    idx = pd.date_range("2025-01-01", periods=4, freq="2D")
    monkeypatch.setattr(pd, "infer_freq", lambda x: None)
    f = cl.infer_freq(idx)
    assert f is not None


def test_parse_holiday_dates_and_invalid():
    good = ["2025-12-25", "2025-01-01"]
    s = cl._parse_holiday_dates(good)
    assert all(isinstance(x, pd.Timestamp) for x in s)

    with pytest.raises(cl.DataPreparationError):
        cl._parse_holiday_dates(["not-a-date"])


def test_parse_holiday_dates_none_and_country_none():
    assert cl._parse_holiday_dates(None) == set()
    assert cl._country_holidays(None, [2025]) == set()


def test_country_holidays_monkeypatch(monkeypatch):
    def fake_country_holidays(country, years=None):
        return ["2025-01-01", "2025-12-25"]

    monkeypatch.setattr(cl.pyholidays, "country_holidays", fake_country_holidays)
    res = cl._country_holidays("PL", [2025])
    assert pd.Timestamp("2025-01-01") in res


def test_country_holidays_exception_returns_empty(monkeypatch):
    def raiser(country, years=None):
        raise RuntimeError("boom")

    monkeypatch.setattr(cl.pyholidays, "country_holidays", raiser)
    res = cl._country_holidays("PL", [2025])
    assert res == set()


def test_neutralize_holidays():
    idx = pd.date_range("2025-12-20", periods=7, freq="D")
    values = [10, 11, 12, 1000, 13, 14, 15]
    s = pd.Series(values, index=idx)
    holiday = idx[3].strftime("%Y-%m-%d")
    res = cl.neutralize_holidays(s, [holiday])
    assert res.iloc[3] != 1000


def test_neutralize_holidays_non_datetime_index():
    s = pd.Series([1, 2, 3], index=pd.Index(["a", "b", "c"]))
    out = cl.neutralize_holidays(s, ["2025-01-01"])
    assert out.equals(s)


def test_build_forecast_dates_businessday_with_holidays(monkeypatch):
    last = pd.Timestamp("2025-12-24")
    dates = cl.build_forecast_dates(last, "B", 3, holiday_dates=["2025-12-25"], holiday_country=None)
    assert len(dates) == 3
    assert all(d.normalize() != pd.Timestamp("2025-12-25") for d in dates)


def test_build_forecast_dates_invalid_freq_fallback():
    last = pd.Timestamp("2025-06-30")
    dates = cl.build_forecast_dates(last, "INVALID", 2)
    assert len(dates) == 2
    assert dates[0] == last + pd.Timedelta(days=1)


def test_conditional_error_raises():
    with pytest.raises(cl.DataPreparationError):
        cl.conditional_error(True, "err")


def test_preprocess_timeseries_csv_errors():
    csv = "badcol,value\n1,2\n"
    with pytest.raises(cl.DataPreparationError):
        cl.preprocess_timeseries_csv(csv_content=csv, date_column="date", context="value")


def test_preprocess_build_index_failure_invalid_freq():
    csv = "date,value\n2025-01-01,1\n2025-01-02,2\n"
    with pytest.raises(cl.DataPreparationError):
        cl.preprocess_timeseries_csv(csv_content=csv, date_column="date", context="value", frequency="INVALID")


def test_preprocess_all_non_numeric_target():
    csv = "date,value\n2025-01-01,foo\n2025-01-02,bar\n"
    with pytest.raises(cl.DataPreparationError):
        cl.preprocess_timeseries_csv(csv_content=csv, date_column="date", context="value", frequency="D")


def test_preprocess_no_valid_dates():
    csv = "date,value\nnotadate,1\nalso,2\n"
    with pytest.raises(cl.DataPreparationError):
        cl.preprocess_timeseries_csv(csv_content=csv, date_column="date", context="value")


def test_preprocess_neutralize_holiday_treatment(monkeypatch):
    csv = "date,value\n2025-12-24,10\n2025-12-25,1000\n2025-12-26,12\n"
    def fake_country_holidays(country, years=None):
        return ["2025-12-25"]

    monkeypatch.setattr(cl.pyholidays, "country_holidays", fake_country_holidays)

    series, freq = cl.preprocess_timeseries_csv(csv_content=csv, date_column="date", context="value", frequency="D", holiday_treatment="neutralize", holiday_dates=["2025-12-25"], holiday_country="PL")
    assert series.loc[pd.Timestamp("2025-12-25")] != 1000


def test_preprocess_timeseries_csv_and_predict_integration():
    csv = "date,value\n2025-01-01,1\n2025-01-02,\n2025-01-03,3\n"
    series, freq = cl.preprocess_timeseries_csv(csv_content=csv, date_column="date", context="value", missing_strategy="interpolate", frequency="D")
    assert isinstance(series, pd.Series)
    assert freq == "D"

    class Dummy:
        csv_content = csv
        context = "value"
        date_column = "date"
        prediction_length = 2
        holiday_dates = None
        missing_strategy = "interpolate"
        frequency = "D"
        holiday_treatment = "none"
        holiday_country = None

    req = cl.PredictRequest(**Dummy.__dict__)

    def forecast_method(prediction_length, series):
        low = [0.0] * prediction_length
        median = [1.0] * prediction_length
        high = [2.0] * prediction_length
        mean = [1.0] * prediction_length
        return low, median, high, mean

    out = cl.predict(req, forecast_method)
    assert "predictions" in out
    assert len(out["predictions"]) == req.prediction_length


def test_predict_raises_http_exception_on_bad_input():
    data = {
        "csv_content": "not,a,valid,csv",
        "context": "value",
        "date_column": "date",
        "prediction_length": 1,
    }
    req = cl.PredictRequest(**{**data})
    with pytest.raises(HTTPException) as exc:
        cl.predict(req, lambda **kwargs: ([], [], [], []))
    assert exc.value.status_code == 400



