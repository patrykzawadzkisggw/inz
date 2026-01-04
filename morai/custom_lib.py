import io
from typing import Iterable, Tuple
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import holidays as pyholidays
import pandas as pd
from pandas.tseries.frequencies import to_offset
from pandas.tseries.offsets import CustomBusinessDay
from fastapi import HTTPException


class PredictRequest(BaseModel):
    csv_content: str 
    context: str   # nazwa kolumny prognozy
    date_column: str  # nazwa kolumny z datą
    prediction_length: int = Field(12, ge=1, le=12)
    holiday_dates: Optional[List[str]] = None  # lista dat świąt (YYYY-MM-DD)
    missing_strategy: Literal["interpolate", "ffill", "bfill", "zero", "mean", "median", "drop"] = "interpolate"
    frequency: Optional[Literal["D", "W", "MS", "H", "B"]] = None
    holiday_treatment: Literal["none", "neutralize"] = "none"
    holiday_country: Optional[
        Literal["PL","US","GB","DE","FR","ES","IT","NL","SE","NO","DK","FI","CZ","SK","UA"]] = None

class DataPreparationError(ValueError):
    """Błąd przygotowania danych"""


def handle_missing(series: pd.Series, strategy: str) -> pd.Series:
    """Obsługuje wartości brakujące w szeregu zgodnie z wybraną strategią"""
    s = series.copy()

    strategyList = {
        "ffill": lambda x: x.ffill(),
        "bfill": lambda x: x.bfill(),
        "zero": lambda x: x.fillna(0),
        "mean": lambda x: x.fillna(x.mean()),
        "median": lambda x: x.fillna(x.median()),
        "drop": lambda x: x.dropna(),
    }

    if strategy in strategyList: return strategyList[strategy](s)
    
    method = "time" if isinstance(s.index, pd.DatetimeIndex) else "linear"
    return s.interpolate(method=method, limit_direction="both")


def infer_freq(idx: pd.DatetimeIndex) -> Optional[str]:
    """Próbuje wywnioskować częstotliwość obserwacji"""
    try:
        inferred = pd.infer_freq(idx)
    except Exception:
        inferred = None
        
    if inferred:      return inferred
    if len(idx) < 2:  return None

    deltas = pd.Series(idx).diff().dropna()
    if deltas.empty:  return None
    try:
        contains_weekend = any(ts.weekday() >= 5 for ts in idx)
    except Exception:
        contains_weekend = False

    most_common_days = None
    try:
        deltas_days = (deltas.dt.total_seconds() / 86400.0) if hasattr(deltas, "dt") else (deltas / pd.Timedelta(days=1))
        most_common_days = float(pd.Series(deltas_days).round(6).mode()[0])
    except Exception:
        most_common_days = None

    if not contains_weekend and (most_common_days in (1.0, 3.0)): return "B"

    try:
        most_common_delta = deltas.value_counts().index[0]
        return to_offset(most_common_delta).freqstr
    except Exception:
        return None


def _parse_holiday_dates(holiday_dates: Optional[Iterable[str]]) -> set:
    """Zamienia listę stringów dat (YYYY-MM-DD) na zbiór znormalizowanych Timestamp"""
    if not holiday_dates: return set()
    try:
        return {pd.to_datetime(d).normalize() for d in holiday_dates}
    except Exception as e:
        raise DataPreparationError("Nieprawidłowy format daty") from e


def _country_holidays(country: Optional[str], years: Iterable[int]) -> set:
    """Zwraca zbiór dni świątecznych dla danego kraju"""
    if not country: return set()
    try:
        return {pd.to_datetime(date).normalize() for date in pyholidays.country_holidays(country, years=set(years))}
    except Exception:
        return set()


def neutralize_holidays(series: pd.Series, holiday_dates: Optional[Iterable[str]]) -> pd.Series:
    """Neutralizuje wartości w dniach świątecznych, zastępując je lokalną medianą"""
    if not isinstance(series.index, pd.DatetimeIndex): return series
    holiday_set = _parse_holiday_dates(holiday_dates)
    if not holiday_set: return series
    s = series.copy()
    for ts in s.index:
        if ts.normalize() in holiday_set:
            try:
                left = s.loc[:ts].tail(4)
            except Exception:
                left = s
            try:
                right = s.loc[ts:].head(4)
            except Exception:
                right = s
            window = pd.concat([left, right])
            window = window.drop(index=[ts], errors="ignore").dropna()
            if not window.empty:
                s.at[ts] = window.median()
    return s


def build_forecast_dates(
    last_ts: pd.Timestamp,
    freq: str,
    periods: int,
    holiday_dates: Optional[Iterable[str]] = None,
    holiday_country: Optional[str] = None
) -> pd.DatetimeIndex:
    """Buduje zakres dat prognozy od następnego kroku po ostatniej dacie"""
    last = pd.to_datetime(last_ts)
    years = range(last.year, last.year + 3)
    holidays = _parse_holiday_dates(holiday_dates) | _country_holidays(holiday_country, years)

    if freq == "B" and holidays:
        cbd = CustomBusinessDay(holidays=sorted(holidays))
        start = last + cbd
        return pd.date_range(start=start, periods=periods, freq=cbd)

    try:
        offset = to_offset(freq)
    except Exception:
        offset = pd.Timedelta(days=1)
        freq = "D"

    start = last + offset
    return pd.date_range(start=start, periods=periods, freq=freq)

def conditional_error(condition: bool, message: str):
    if condition:
        raise DataPreparationError(message)

def preprocess_timeseries_csv(
    *,
    csv_content: str,
    date_column: str,
    context: str,
    missing_strategy: str = "interpolate",
    frequency: Optional[str] = None,
    holiday_treatment: str = "none",
    holiday_dates: Optional[Iterable[str]] = None,
    holiday_country: Optional[str] = None, **kwargs
) -> Tuple[pd.Series, str]:
    """Wczytuje i przygotowuje jednowymiarowy szereg czasowy z CSV"""
    try:
        df = pd.read_csv(io.StringIO(csv_content))
    except Exception as e:
        raise DataPreparationError("Nie udało się wczytać CSV") from e

    conditional_error(date_column not in df.columns, "Kolumna daty nie istnieje w danych")
    conditional_error(context not in df.columns, "Kolumna celu nie istnieje w danych")

    df[date_column] = pd.to_datetime(df[date_column], errors="coerce")
    df = df.dropna(subset=[date_column])
    conditional_error(df.empty, "Brak poprawnych dat")
    df = df.sort_values(date_column).set_index(date_column)

    df[context] = pd.to_numeric(df[context], errors="coerce")
    conditional_error(df[context].isna().all(), "Kolumna celu ma niepoprawne dane")

    series = df[context].copy()

    freq = frequency or (infer_freq(series.index) if isinstance(series.index, pd.DatetimeIndex) else None)
    conditional_error(not freq, "Nie udało się wywnioskować częstotliwości")

    try:
        full_index = pd.date_range(start=series.index.min(), end=series.index.max(), freq=freq)
    except Exception:
        raise DataPreparationError("Nie udało się zbudować siatki czasu")
    series = series.reindex(full_index)

    series = handle_missing(series, missing_strategy)
    conditional_error(series.dropna().shape[0] < 2, "Za mało punktów danych")

    if holiday_treatment == "neutralize":
        hist_years = range(series.index.min().year, series.index.max().year + 1)
        hol_set = _parse_holiday_dates(holiday_dates) | _country_holidays(holiday_country, hist_years)
        hol_list = [d.strftime("%Y-%m-%d") for d in sorted(hol_set)]
        series = neutralize_holidays(series, hol_list)

    return series, freq

def predict(req: PredictRequest, forecast_method):
    try:
        series, freq = preprocess_timeseries_csv(**req.model_dump())
    except DataPreparationError as e:
        raise HTTPException(status_code=400, detail=str(e))

    low, median, high, mean = forecast_method(prediction_length=req.prediction_length, series=series)
    dates = build_forecast_dates(series.index[-1], freq, req.prediction_length, req.holiday_dates, req.holiday_country)
    predictions = [
        {
            "date": dates[i].isoformat(),
            "low": low[i],
            "median": median[i],
            "high": high[i],
            "mean": mean[i],
        }
        for i in range(req.prediction_length)
    ]

    return {"predictions": predictions}