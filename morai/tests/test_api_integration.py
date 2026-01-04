from fastapi.testclient import TestClient
from api import app


def test_predict_endpoint_success(monkeypatch):
    def fake_moirai_predict(prediction_length, series):
        return (
            [0.0] * prediction_length,
            [1.0] * prediction_length,
            [2.0] * prediction_length,
            [1.5] * prediction_length,
        )

    monkeypatch.setattr("api.moirai_predict", fake_moirai_predict)

    client = TestClient(app)

    response = client.post(
        "/predict",
        json={
            "csv_content": "date,value\n2024-01-01,1\n2024-01-02,2\n2024-01-03,3",
            "context": "value",
            "date_column": "date",
            "prediction_length": 2,
            "missing_strategy": "ffill",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert "predictions" in payload
    assert len(payload["predictions"]) == 2
    assert all(item["median"] == 1.0 for item in payload["predictions"])


def test_predict_endpoint_returns_error_for_bad_input(monkeypatch):
    # moirai_predict will not be reached when validation fails
    client = TestClient(app)

    response = client.post(
        "/predict",
        json={
            "csv_content": "date,value\n2024-01-01,1\n2024-01-02,2",
            "context": "value",
            "date_column": "missing_date",
            "prediction_length": 2,
        },
    )

    assert response.status_code == 400
    body = response.json()
    assert body.get("detail") == "Kolumna daty nie istnieje w danych"
