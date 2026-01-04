import os
from fastapi.testclient import TestClient
import pytest

import api


@pytest.fixture(autouse=True)
def patch_startup(monkeypatch):
    monkeypatch.setattr(api, 'init_scheduler', lambda: None)
    monkeypatch.setattr(api, 'init_datafeeds_scheduler', lambda: None)
    monkeypatch.setattr(api, 'clerk_authenticate_request', lambda req, opts: {'sub': 'user_1'})
    yield


def auth_headers():
    return {'Authorization': 'Bearer faketoken'}


def test_transpile_endpoint_monkeypatched(monkeypatch):
    client = TestClient(api.app)

    monkeypatch.setattr(api, 'transpile_or_run', lambda payload, uid: {'result': 'ok', 'user': uid})
    monkeypatch.setattr(api, 'extract_user_id', lambda p: 'user_1')

    resp = client.post('/transpile', json={'code': 'x=1'}, headers=auth_headers())
    assert resp.status_code == 200
    assert resp.json() == {'result': 'ok', 'user': 'user_1'}


def test_run_python_endpoint(monkeypatch):
    client = TestClient(api.app)
    monkeypatch.setattr(api, 'execute_python_code', lambda payload: {'output': 'ran', 'results': None})
    resp = client.post('/run/python', json={'python': 'print(1)'}, headers=auth_headers())
    assert resp.status_code == 200
    assert resp.json() == {'output': 'ran', 'results': None}


def test_sync_job_from_db(monkeypatch):
    client = TestClient(api.app)
    monkeypatch.setattr(api, 'schedule_single_from_db', lambda jid: {'job': jid})
    resp = client.post('/jobs/abc123', headers=auth_headers())
    assert resp.status_code == 200
    assert resp.json() == {'job': 'abc123'}


def test_add_model_prediction_jobs(monkeypatch):
    client = TestClient(api.app)
    called = {}
    def fake_schedule(mid):
        called['scheduled'] = mid

    monkeypatch.setattr(api, 'schedule_prediction_jobs_for_model', fake_schedule)
    monkeypatch.setattr(api, 'predict_for_model_now', lambda mid: {'predicted': mid})

    resp = client.post('/models/m1/jobs', headers=auth_headers())
    assert resp.status_code == 200
    assert resp.json() == {'predicted': 'm1'}
    assert called.get('scheduled') == 'm1'


def test_sync_model_prediction_jobs(monkeypatch):
    client = TestClient(api.app)
    monkeypatch.setattr(api, 'sync_prediction_jobs_for_model', lambda mid: {'synced': mid})
    resp = client.post('/models/m2/jobs/sync', headers=auth_headers())
    assert resp.status_code == 200
    assert resp.json() == {'synced': 'm2'}


def test_update_user_functions_and_delete(monkeypatch):
    client = TestClient(api.app)
    monkeypatch.setattr(api, 'update_user_fn', lambda uid: {'updated': uid})
    monkeypatch.setattr(api, 'delete_user', lambda uid: {'deleted': uid})
    monkeypatch.setattr(api, 'extract_user_id', lambda p: 'uX')

    resp = client.post('/users/functions/update', headers=auth_headers())
    assert resp.status_code == 200
    assert resp.json() == {'updated': 'uX'}

    resp2 = client.delete('/users', headers=auth_headers())
    assert resp2.status_code == 200
    assert resp2.json() == {'deleted': 'uX'}



def make_client(monkeypatch):
    monkeypatch.setattr(api, 'init_scheduler', lambda: None)
    monkeypatch.setattr(api, 'init_datafeeds_scheduler', lambda: None)
    client = TestClient(api.app)
    return client


def test_add_model_prediction_jobs(monkeypatch):
    client = make_client(monkeypatch)

    api.app.dependency_overrides[api.get_current_user] = lambda: {"sub": "u1", "id": "u1"}

    called = {}

    def fake_schedule(model_id):
        called['scheduled'] = model_id

    def fake_predict(model_id):
        called['predicted'] = model_id
        return {"status": "ok", "modelId": model_id}

    monkeypatch.setattr(api, 'schedule_prediction_jobs_for_model', fake_schedule)
    monkeypatch.setattr(api, 'predict_for_model_now', fake_predict)

    resp = client.post('/models/m123/jobs')
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok", "modelId": "m123"}
    assert called.get('scheduled') == 'm123'
    assert called.get('predicted') == 'm123'


def test_sync_job_from_db_and_delete_user(monkeypatch):
    client = make_client(monkeypatch)
    api.app.dependency_overrides[api.get_current_user] = lambda: {"sub": "u1", "id": "u1"}

    monkeypatch.setattr(api, 'schedule_single_from_db', lambda job_id: {"status": "ok", "id": job_id})
    r = client.post('/jobs/job42')
    assert r.status_code == 200
    assert r.json()['id'] == 'job42'

    monkeypatch.setattr(api, 'delete_user', lambda uid: {"status": "deleted", "user": uid})
    r2 = client.delete('/users')
    assert r2.status_code == 200
    assert r2.json()['status'] == 'deleted'


def test_transpile_and_run_endpoints(monkeypatch):
    client = make_client(monkeypatch)
    api.app.dependency_overrides[api.get_current_user] = lambda: {"sub": "u1", "id": "u1"}

    monkeypatch.setattr(api, 'transpile_or_run', lambda payload, uid: {"python": "print(1)"})
    resp = client.post('/transpile', json={"code": "x=1"})
    assert resp.status_code == 200
    assert resp.json().get('python') == 'print(1)'

    monkeypatch.setattr(api, 'execute_python_code', lambda payload: {"output": "ok", "results": None})
    resp2 = client.post('/run/python', json={"python": "print(\"ok\")"})
    assert resp2.status_code == 200
    assert resp2.json().get('output') == 'ok'
