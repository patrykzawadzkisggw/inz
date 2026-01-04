from fastapi.testclient import TestClient
import api


AUTH = {"Authorization": "Bearer testtoken"}


def make_client(monkeypatch):
    monkeypatch.setattr(api, "init_scheduler", lambda: None)
    monkeypatch.setattr(api, "init_datafeeds_scheduler", lambda: None)
    monkeypatch.setattr(api, 'clerk_authenticate_request', lambda req, opts: {'sub': 'u_integration'})
    monkeypatch.setattr(api, 'extract_user_id', lambda p: 'u_integration')
    return TestClient(api.app)


def test_transpile_and_run_flow(monkeypatch):
    client = make_client(monkeypatch)

    def mock_transpile_or_run(payload, uid):
        if payload.run:
            return {"output": "", "results": [{"type": "text", "text": "1"}]}
        return {"python": "Print(1)"}
    monkeypatch.setattr(api, 'transpile_or_run', mock_transpile_or_run)

    def mock_execute_python_code(payload):
        return {"output": "hello\n", "results": None}
    monkeypatch.setattr(api, 'execute_python_code', mock_execute_python_code)

    resp = client.post(
        "/transpile",
        json={"code": "Print(1)", "run": True},
        headers=AUTH,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body.get("output") == ""
    results = body.get("results") or []
    assert results and results[0].get("text") == "1"

    resp2 = client.post(
        "/run/python",
        json={"python": "print('hello')"},
        headers=AUTH,
    )
    assert resp2.status_code == 200
    out = resp2.json()
    assert "hello" in out.get("output", "")
    assert out.get("results") is None


def test_job_and_model_endpoints(monkeypatch):
    client = make_client(monkeypatch)
    calls = {}

    def mock_schedule_single_from_db(jid):
        calls["job"] = jid
        return {"status": "ok", "id": jid}
    monkeypatch.setattr(api, "schedule_single_from_db", mock_schedule_single_from_db)

    def mock_schedule_prediction_jobs_for_model(mid):
        calls["sched"] = mid
    monkeypatch.setattr(api, "schedule_prediction_jobs_for_model", mock_schedule_prediction_jobs_for_model)

    def mock_predict_for_model_now(mid):
        calls["predict"] = mid
        return {"pred": mid}
    monkeypatch.setattr(api, "predict_for_model_now", mock_predict_for_model_now)

    def mock_sync_prediction_jobs_for_model(mid):
        calls["sync"] = mid
        return {"synced": mid}
    monkeypatch.setattr(api, "sync_prediction_jobs_for_model", mock_sync_prediction_jobs_for_model)

    r1 = client.post("/jobs/j123", headers=AUTH)
    assert r1.status_code == 200 and r1.json()["id"] == "j123"

    r2 = client.post("/models/m1/jobs", headers=AUTH)
    assert r2.status_code == 200 and r2.json()["pred"] == "m1"

    r3 = client.post("/models/m1/jobs/sync", headers=AUTH)
    assert r3.status_code == 200 and r3.json()["synced"] == "m1"

    assert calls == {"job": "j123", "sched": "m1", "predict": "m1", "sync": "m1"}


def test_user_functions_update_and_delete(monkeypatch):
    client = make_client(monkeypatch)
    calls = {}

    def mock_update_user_fn(uid):
        calls["update"] = uid
        return {"updated": uid}
    monkeypatch.setattr(api, "update_user_fn", mock_update_user_fn)

    def mock_delete_user(uid):
        calls["delete"] = uid
        return {"deleted": uid}
    monkeypatch.setattr(api, "delete_user", mock_delete_user)

    monkeypatch.setattr(api, "extract_user_id", lambda p: "u_integration")

    r1 = client.post("/users/functions/update", headers=AUTH)
    assert r1.status_code == 200 and r1.json()["updated"] == "u_integration"

    r2 = client.delete("/users", headers=AUTH)
    assert r2.status_code == 200 and r2.json()["deleted"] == "u_integration"

    assert calls == {"update": "u_integration", "delete": "u_integration"}
