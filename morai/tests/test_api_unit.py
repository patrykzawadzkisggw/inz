import pandas as pd
import torch
from custom_lib import PredictRequest
from api import moirai_predict, predict1


def test_moirai_predict_returns_quantiles(monkeypatch):
    series = pd.Series(
        [1.0, 2.0, 3.0, 4.0],
        index=pd.date_range("2024-01-01", periods=4, freq="D"),
    )

    class DummyModule:
        @staticmethod
        def from_pretrained(name):
            return DummyModule()

    class DummyForecast:
        def __init__(self, *args, **kwargs):
            self.prediction_length = kwargs["prediction_length"]

        def __call__(self, past_target, past_observed_target, past_is_pad):
            base = torch.arange(1, self.prediction_length + 1, dtype=torch.float32)
            samples = base.repeat(100, 1)
            return [samples]

    monkeypatch.setattr("api.MoiraiModule", DummyModule)
    monkeypatch.setattr("api.MoiraiForecast", DummyForecast)

    low, median, high, mean = moirai_predict(prediction_length=3, series=series)

    assert low == [1.0, 2.0, 3.0]
    assert median == [1.0, 2.0, 3.0]
    assert high == [1.0, 2.0, 3.0]
    assert mean == [1.0, 2.0, 3.0]


def test_predict1_delegates_to_predict(monkeypatch):
    request_model = PredictRequest(
        csv_content="date,value\n2024-01-01,1",
        context="value",
        date_column="date",
        prediction_length=1,
    )

    captured = {}

    def fake_predict(req, forecast_fn):
        captured["req"] = req
        captured["forecast_fn"] = forecast_fn
        return {
            "predictions": [
                {
                    "date": "2024-01-02T00:00:00",
                    "low": 0,
                    "median": 1,
                    "high": 2,
                    "mean": 1,
                }
            ]
        }

    monkeypatch.setattr("api.predict", fake_predict)

    result = predict1(request_model)

    assert result["predictions"][0]["median"] == 1
    assert captured["req"] is request_model
    assert captured["forecast_fn"] is moirai_predict
