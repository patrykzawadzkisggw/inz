import os
from typing import Optional
import pandas as pd
import torch
from fastapi import FastAPI
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
os.environ["HF_HUB_DISABLE_SYMLINKS"] = "1"
import timesfm
from custom_lib import (PredictRequest, predict)

app = FastAPI(title="TimesFM API")
_TFM: Optional[timesfm.TimesFm] = None

def _get_model(pred_len: int) -> timesfm.TimesFm:
    global _TFM
    if _TFM is None:
        _TFM = timesfm.TimesFm(hparams=timesfm.TimesFmHparams(
                backend="cpu",
                per_core_batch_size=1,
                horizon_len=pred_len,
                context_len=2048,
                use_positional_embedding=True 
                ),
            checkpoint=timesfm.TimesFmCheckpoint(huggingface_repo_id="google/timesfm-1.0-200m-pytorch")
        )
    return _TFM

def timesfm_predict(prediction_length: int, series: pd.Series):
    model = _get_model(prediction_length)
    with torch.no_grad():
        _, full_forecast = model.forecast([series.values.astype("float32")], freq=[0])
    full = full_forecast[0]
    q_list = list(model.hparams.quantiles)

    def nearest_q(target: float):
        return min(range(len(q_list)), key=lambda i: abs(q_list[i] - target))

    idx_q10, idx_q50, idx_q90 = map(nearest_q, (0.1, 0.5, 0.9))
    low, median, high, mean = (
        full[:, 1 + idx_q10].astype(float),
        full[:, 1 + idx_q50].astype(float),
        full[:, 1 + idx_q90].astype(float),
        full[:, 0].astype(float),
    )
    return low.tolist(), median.tolist(), high.tolist(), mean.tolist()

@app.post("/predict")
def predict1(req: PredictRequest):
    return predict(req, timesfm_predict)