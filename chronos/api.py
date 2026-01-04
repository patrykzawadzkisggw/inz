import pandas as pd
import torch
from chronos import BaseChronosPipeline
from fastapi import FastAPI
from typing import  Optional
from custom_lib import (PredictRequest, predict)

app = FastAPI(title="Chronos API")
_PIPELINE: Optional[BaseChronosPipeline] = None

def _get_pipeline() -> BaseChronosPipeline:
    global _PIPELINE
    if _PIPELINE is None:
        _PIPELINE = BaseChronosPipeline.from_pretrained("amazon/chronos-bolt-small")
    return _PIPELINE

def chronos_predict(prediction_length: int = 12, series: pd.Series | None = None):
    pipeline = _get_pipeline()
    with torch.inference_mode():
        quantiles, mean = pipeline.predict_quantiles(
            context=torch.tensor(series.values, dtype=torch.float32),
            prediction_length=prediction_length,
            quantile_levels=[0.1, 0.5, 0.9],
        )
    low, median, high = quantiles[0, :, 0], quantiles[0, :, 1], quantiles[0, :, 2]
    return low.tolist(), median.tolist(), high.tolist(), mean[0].tolist()

@app.post("/predict")
def predict1(req: PredictRequest):
    return predict(req, chronos_predict)