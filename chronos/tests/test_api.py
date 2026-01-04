import pytest
import pandas as pd
import torch
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import api


def test_get_pipeline_caches_pipeline(monkeypatch):
    monkeypatch.setattr(api, '_PIPELINE', None)
    
    mock_pipeline = MagicMock()
    with patch('api.BaseChronosPipeline.from_pretrained', return_value=mock_pipeline) as mock_from_pretrained:
        pipeline1 = api._get_pipeline()
        pipeline2 = api._get_pipeline()
        
        mock_from_pretrained.assert_called_once_with("amazon/chronos-bolt-small")
        assert pipeline1 is pipeline2
        assert pipeline1 is mock_pipeline


def test_chronos_predict(monkeypatch):
    mock_pipeline = MagicMock()
    mock_quantiles = torch.tensor([[[1.0, 2.0, 3.0], [4.0, 5.0, 6.0]]])
    mock_mean = torch.tensor([[2.5, 5.5]])
    mock_pipeline.predict_quantiles.return_value = (mock_quantiles, mock_mean)
    
    monkeypatch.setattr(api, '_PIPELINE', mock_pipeline)
    
    series = pd.Series([1.0, 2.0, 3.0])
    low, median, high, mean = api.chronos_predict(prediction_length=2, series=series)
    
    assert low == [1.0, 4.0]
    assert median == [2.0, 5.0]
    assert high == [3.0, 6.0]
    assert mean == [2.5, 5.5]
    
    mock_pipeline.predict_quantiles.assert_called_once()
    args, kwargs = mock_pipeline.predict_quantiles.call_args
    assert kwargs['prediction_length'] == 2
    assert torch.equal(kwargs['context'], torch.tensor([1.0, 2.0, 3.0], dtype=torch.float32))


def test_predict_endpoint_success(monkeypatch):
    mock_predict_result = {"predictions": [1.0, 2.0], "frequency": "D"}
    with patch('api.predict', return_value=mock_predict_result) as mock_predict:
        client = TestClient(api.app)
        
        request_data = {
            "csv_content": "date,value\n2025-01-01,1\n2025-01-02,2\n",
            "context": "value",
            "date_column": "date",
            "prediction_length": 2,
            "holiday_dates": None,
            "missing_strategy": "interpolate",
            "frequency": "D",
            "holiday_treatment": "none",
            "holiday_country": None
        }
        
        response = client.post("/predict", json=request_data)
        
        assert response.status_code == 200
        assert response.json() == mock_predict_result
        mock_predict.assert_called_once()


def test_predict_endpoint_invalid_request():
    client = TestClient(api.app)
    
    request_data = {"invalid": "data"}
    
    response = client.post("/predict", json=request_data)
    
    assert response.status_code == 422


def test_predict_endpoint_integration(monkeypatch):
    mock_pipeline = MagicMock()
    mock_quantiles = torch.tensor([[[0.5, 1.0, 1.5], [1.5, 2.0, 2.5]]]) 
    mock_mean = torch.tensor([[1.0, 2.0]])
    mock_pipeline.predict_quantiles.return_value = (mock_quantiles, mock_mean)
    
    monkeypatch.setattr(api, '_PIPELINE', mock_pipeline)
    
    client = TestClient(api.app)
    
    request_data = {
        "csv_content": "date,value\n2025-01-01,1.0\n2025-01-02,2.0\n2025-01-03,3.0\n",
        "context": "value",
        "date_column": "date",
        "prediction_length": 2,
        "holiday_dates": None,
        "missing_strategy": "interpolate",
        "frequency": "D",
        "holiday_treatment": "none",
        "holiday_country": None
    }
    
    response = client.post("/predict", json=request_data)
    
    assert response.status_code == 200
    data = response.json()
    assert "predictions" in data
    assert len(data["predictions"]) == 2
    pred = data["predictions"][0]
    assert "low" in pred
    assert "median" in pred
    assert "high" in pred
    assert "mean" in pred
    assert pred["low"] == 0.5
    assert pred["median"] == 1.0
    assert pred["high"] == 1.5
    assert pred["mean"] == 1.0