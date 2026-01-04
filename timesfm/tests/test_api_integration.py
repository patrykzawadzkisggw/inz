from fastapi.testclient import TestClient
import api


def test_predict_endpoint_returns_response(monkeypatch):
    expected = {
        "predictions": [
            {"date": "2024-01-01T00:00:00", "low": 1.0, "median": 2.0, "high": 3.0, "mean": 4.0}
        ]
    }

    def fake_predict(req, forecast_method):
        assert isinstance(req, api.PredictRequest)
        assert req.context == "value"
        assert req.date_column == "date"
        return expected

    monkeypatch.setattr(api, "predict", fake_predict)

    client = TestClient(api.app)
    payload = {
        "csv_content": "date,value\n2020-01-01,1\n2020-01-02,2",
        "context": "value",
        "date_column": "date",
        "prediction_length": 1,
    }

    response = client.post("/predict", json=payload)

    assert response.status_code == 200
    assert response.json() == expected
