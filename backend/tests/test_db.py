import json
import datetime
import uuid

import pytest

import db


class DummyCursor:
    def __init__(self, fetchone_result=None, fetchall_result=None, description=None):
        self._fetchone = fetchone_result
        self._fetchall = fetchall_result or []
        self.description = description
        self.last_sql = None
        self.last_params = None
        self.executed = []

    def execute(self, sql, params=None):
        self.last_sql = sql
        self.last_params = params
        self.executed.append((sql, params))

    def fetchone(self):
        return self._fetchone

    def fetchall(self):
        return self._fetchall

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


class DummyConnection:
    def __init__(self, cursor: DummyCursor):
        self._cursor = cursor

    def cursor(self):
        return self._cursor

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


def make_connect(monkeypatch, cursor: DummyCursor):
    def _connect(**kwargs):
        return DummyConnection(cursor)

    monkeypatch.setattr(db, "_connect", _connect)


def test_fetch_report_not_found(monkeypatch):
    cur = DummyCursor(fetchone_result=None, description=None)
    make_connect(monkeypatch, cur)
    assert db.fetch_report("missing") is None


def test_fetch_report_found(monkeypatch):
    desc = [("id",), ("name",)]
    row = ("r1", "rep")
    cur = DummyCursor(fetchone_result=row, description=desc)
    make_connect(monkeypatch, cur)
    res = db.fetch_report("r1")
    assert isinstance(res, dict)
    assert res["id"] == "r1"
    assert res["name"] == "rep"


def test_fetch_enabled_reports(monkeypatch):
    desc = [("id",), ("enabled",)]
    rows = [("r1", 1), ("r2", 1)]
    cur = DummyCursor(fetchall_result=rows, description=desc)
    make_connect(monkeypatch, cur)
    res = db.fetch_enabled_reports()
    assert isinstance(res, list)
    assert len(res) == 2
    assert res[0]["id"] == "r1"


def test_fetch_datafeed_model_latest_dataimport(monkeypatch):
    desc = [("id",), ("active",), ("modelId",)]
    row = ("f1", 1, "m1")
    cur = DummyCursor(fetchone_result=row, description=desc)
    make_connect(monkeypatch, cur)
    res = db.fetch_datafeed("f1")
    assert res["id"] == "f1"

    desc_m = [("id",), ("type",)]
    row_m = ("m1", "chronos")
    cur2 = DummyCursor(fetchone_result=row_m, description=desc_m)
    make_connect(monkeypatch, cur2)
    m = db.fetch_model("m1")
    assert m["type"] == "chronos"

    desc_di = [("id",), ("modelId",)]
    row_di = ("di1", "m1")
    cur3 = DummyCursor(fetchone_result=row_di, description=desc_di)
    make_connect(monkeypatch, cur3)
    di = db.fetch_latest_dataimport("m1")
    assert di["id"] == "di1"


def test_update_datafeed_run_times_executes_update(monkeypatch):
    cur = DummyCursor()
    make_connect(monkeypatch, cur)
    now = datetime.datetime.now()
    db.update_datafeed_run_times("fid", now)
    assert cur.last_sql is not None
    assert "UPDATE datafeed SET lastRunAt" in cur.last_sql
    assert cur.last_params[-1] == "fid"


def test_update_dataimport_datablob_and_fetch_datafeeds_by_model(monkeypatch):
    cur = DummyCursor()
    make_connect(monkeypatch, cur)
    csv_text = "a,b\n1,2\n"
    db.update_dataimport_datablob("did", csv_text)
    assert isinstance(cur.last_params[0], (bytes, bytearray))
    assert cur.last_params[1] == "did"

    desc = [("id",), ("modelId",)]
    rows = [("f1", "m1"), ("f2", "m1")]
    cur2 = DummyCursor(fetchall_result=rows, description=desc)
    make_connect(monkeypatch, cur2)
    feeds = db.fetch_datafeeds_by_model("m1")
    assert len(feeds) == 2
    assert feeds[0]["id"] == "f1"


def test_fetch_user_functions_and_user_and_reports_models_and_delete_user_data(monkeypatch):
    rows = [("def f(): pass",), (None,), ("print(1)",)]
    cur = DummyCursor(fetchall_result=rows)
    make_connect(monkeypatch, cur)
    funcs = db.fetch_user_functions("u1")
    assert isinstance(funcs, list)
    assert "def f(): pass" in funcs

    desc = [("id",), ("email",)]
    row = ("u1", "u1@example.com")
    cur2 = DummyCursor(fetchone_result=row, description=desc)
    make_connect(monkeypatch, cur2)
    user = db.fetch_user("u1")
    assert user["email"] == "u1@example.com"

    desc_r = [("id",), ("userId",)]
    rows_r = [("r1", "u1"), ("r2", "u1")]
    cur3 = DummyCursor(fetchall_result=rows_r, description=desc_r)
    make_connect(monkeypatch, cur3)
    reps = db.fetch_reports_by_user("u1")
    assert len(reps) == 2

    desc_m = [("id",), ("ownerId",)]
    rows_m = [("m1", "u1")]
    cur4 = DummyCursor(fetchall_result=rows_m, description=desc_m)
    make_connect(monkeypatch, cur4)
    mods = db.fetch_models_by_user("u1")
    assert len(mods) == 1

    cur5 = DummyCursor()
    make_connect(monkeypatch, cur5)
    db.delete_user_data("u1")
    assert len(cur5.executed) >= 4
    assert "DELETE FROM user WHERE id=%s" in cur5.executed[-1][0]


def test_update_run_times_executes_update(monkeypatch):
    cur = DummyCursor()
    make_connect(monkeypatch, cur)
    now = datetime.datetime.now()
    db.update_run_times("rid", now, None)
    assert cur.last_sql is not None
    assert "UPDATE report SET lastRunAt" in cur.last_sql
    assert cur.last_params[-1] == "rid"


def test_insert_prediction_and_payload(monkeypatch):
    cur = DummyCursor()
    make_connect(monkeypatch, cur)
    payload = {"a": 1, "b": "x"}
    pid = db.insert_prediction("m1", payload)
    assert isinstance(pid, str)
    assert len(pid) == 32
    assert cur.last_params[0] == pid
    assert cur.last_params[1] == "m1"
    payload_json = cur.last_params[2]
    parsed = json.loads(payload_json)
    assert parsed == payload
