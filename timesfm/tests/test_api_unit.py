import numpy as np
import pandas as pd
import api


def test_get_model_memoizes_single_instance(monkeypatch):
    class DummyHparams:
        def __init__(self, **kwargs):
            self.kwargs = kwargs

    class DummyCheckpoint:
        def __init__(self, huggingface_repo_id):
            self.repo_id = huggingface_repo_id

    class DummyTimesFm:
        calls = 0

        def __init__(self, hparams, checkpoint):
            type(self).calls += 1
            self.hparams = hparams
            self.checkpoint = checkpoint

    monkeypatch.setattr(api, "_TFM", None)
    monkeypatch.setattr(api.timesfm, "TimesFm", DummyTimesFm)
    monkeypatch.setattr(api.timesfm, "TimesFmHparams", DummyHparams)
    monkeypatch.setattr(api.timesfm, "TimesFmCheckpoint", DummyCheckpoint)

    model_first = api._get_model(pred_len=5)
    model_second = api._get_model(pred_len=10)

    assert model_first is model_second
    assert model_first.hparams.kwargs["horizon_len"] == 5
    assert DummyTimesFm.calls == 1


def test_timesfm_predict_returns_expected_quantiles(monkeypatch):
    class FakeHparams:
        def __init__(self, quantiles):
            self.quantiles = quantiles

    class FakeModel:
        def __init__(self):
            self.hparams = FakeHparams([0.05, 0.1, 0.55, 0.9])

        def forecast(self, values, freq=None):
            full = np.array([
                [1.0, 10.0, 20.0, 30.0, 40.0],
                [1.5, 15.0, 25.0, 35.0, 45.0],
            ], dtype=float)
            return None, [full]

    class DummyNoGrad:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc_value, traceback):
            return False

    fake_model = FakeModel()
    monkeypatch.setattr(api, "_get_model", lambda prediction_length: fake_model)
    monkeypatch.setattr(api.torch, "no_grad", lambda: DummyNoGrad())

    series = pd.Series([10, 20, 30])

    low, median, high, mean = api.timesfm_predict(prediction_length=2, series=series)

    assert low == [20.0, 25.0]
    assert median == [30.0, 35.0]
    assert high == [40.0, 45.0]
    assert mean == [1.0, 1.5]
