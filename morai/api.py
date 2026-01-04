import pandas as pd
import torch
import numpy as np 
from einops import rearrange 
from fastapi import FastAPI
from uni2ts.model.moirai import MoiraiForecast, MoiraiModule
import warnings

warnings.filterwarnings('ignore')
from custom_lib import (PredictRequest, predict)
app = FastAPI(title="Moirai API")

def moirai_predict(prediction_length: int = 12, series: pd.Series = None):
    values = series.to_numpy(dtype=np.float32)
    context_length = len(values)
    model = MoiraiForecast(
        module=MoiraiModule.from_pretrained("Salesforce/moirai-1.1-R-small"),
        prediction_length=prediction_length,
        context_length=context_length,
        patch_size=32,
        num_samples=100,
        target_dim=1,
        feat_dynamic_real_dim=0,
        past_feat_dynamic_real_dim=0
    )

    past_target = rearrange(torch.as_tensor(values, dtype=torch.float32), "t -> 1 t 1")
    past_observed_target = torch.ones_like(past_target, dtype=torch.bool)
    past_is_pad = torch.zeros_like(past_target, dtype=torch.bool).squeeze(-1)
    forecast = model(past_target=past_target, past_observed_target=past_observed_target, past_is_pad=past_is_pad)
    forecast_samples = forecast[0].detach().cpu().numpy()
    low = np.quantile(forecast_samples, 0.1, axis=0)
    median = np.median(forecast_samples, axis=0)
    high = np.quantile(forecast_samples, 0.9, axis=0)
    mean = np.mean(forecast_samples, axis=0)
    return low.tolist(), median.tolist(), high.tolist(), mean.tolist()

@app.post("/predict")
def predict1(req: PredictRequest):
    return predict(req, moirai_predict)