import os
import json
import uuid
import datetime
from typing import Optional, Dict, Any, List, Tuple
from dotenv import load_dotenv
import pymysql

load_dotenv()

DB_HOST = os.getenv('DB_HOST')
DB_USER = os.getenv('DB_USER')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_NAME = os.getenv('DB_NAME')

def _connect():
    return pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        autocommit=True,
    )

def _fetch_by_id(sql: str, params: Tuple):
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            row = cur.fetchone()
            if not row:
                return None
            cols = [d[0] for d in cur.description]
            return dict(zip(cols, row))

def _fetch_all(sql: str, params: Optional[Tuple] = None):
    with _connect() as conn:
        with conn.cursor() as cur:
            if params:
                cur.execute(sql, params)
            else:
                cur.execute(sql)
            rows = cur.fetchall()
            cols = [d[0] for d in cur.description]
            return [dict(zip(cols, r)) for r in rows]

def _update(sql: str, params: Tuple):
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)

def fetch_report(report_id: str) -> Optional[Dict[str, Any]]:
    return _fetch_by_id("SELECT * FROM report WHERE id=%s", (report_id,))

def fetch_enabled_reports():
    return _fetch_all("SELECT * FROM report WHERE enabled=1")

def update_run_times(report_id: str, last_run: datetime.datetime, next_run: Optional[datetime.datetime]):
    sql = "UPDATE report SET lastRunAt=%s, nextRunAt=%s, updatedAt=NOW(3) WHERE id=%s"
    _update(sql, (last_run, next_run, report_id))

def fetch_active_datafeeds() -> List[Dict[str, Any]]:
    return _fetch_all("SELECT * FROM datafeed WHERE active=1")

def fetch_datafeed(feed_id: str) -> Optional[Dict[str, Any]]:
    return _fetch_by_id("SELECT * FROM datafeed WHERE id=%s", (feed_id,))

def fetch_model(model_id: str) -> Optional[Dict[str, Any]]:
    return _fetch_by_id("SELECT * FROM model WHERE id=%s", (model_id,))

def fetch_latest_dataimport(model_id: str) -> Optional[Dict[str, Any]]:
    return _fetch_by_id("SELECT * FROM dataimport WHERE modelId=%s ORDER BY createdAt DESC LIMIT 1", (model_id,))

def update_datafeed_run_times(feed_id: str, last_run: datetime.datetime):
    _update("UPDATE datafeed SET lastRunAt=%s, updatedAt=NOW(3) WHERE id=%s", (last_run, feed_id))

def update_dataimport_datablob(dataimport_id: str, csv_content: str):
    sql = "UPDATE dataimport SET dataBlob=%s WHERE id=%s"
    data_bytes = csv_content.encode('utf-8')
    _update(sql, (data_bytes, dataimport_id))

def insert_prediction(model_id: str, payload: Dict[str, Any]):
    sql = "INSERT INTO prediction (id, modelId, payloadJson, createdAt) VALUES (%s, %s, %s, NOW(3))"
    pid = uuid.uuid4().hex
    payload_json = json.dumps(payload, ensure_ascii=False)
    _update(sql, (pid, model_id, payload_json))
    return pid

def fetch_datafeeds_by_model(model_id: str) -> List[Dict[str, Any]]:
    return _fetch_all("SELECT * FROM datafeed WHERE modelId=%s", (model_id,))

def fetch_user_functions(user_id: str) -> List[str]:
    rows: List[str] = []
    sql = "SELECT body2 FROM customfunction WHERE userId=%s"
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (user_id,))
            for (body2,) in cur.fetchall() or []:
                if body2 is None:
                    continue
                rows.append(str(body2))
    return rows

def fetch_user(user_id: str) -> Optional[Dict[str, Any]]:
    return _fetch_by_id("SELECT * FROM user WHERE id=%s", (user_id,))

def fetch_reports_by_user(user_id: str) -> List[Dict[str, Any]]:
    return _fetch_all("SELECT * FROM report WHERE userId=%s", (user_id,))

def fetch_models_by_user(user_id: str) -> List[Dict[str, Any]]:
    models = _fetch_all("SELECT * FROM model WHERE ownerId=%s", (user_id,))
    return models

def delete_user_data(user_id: str):
    _update("DELETE FROM report WHERE userId=%s", (user_id,))
    _update("DELETE FROM widget WHERE userId=%s", (user_id,))
    _update("DELETE FROM model WHERE ownerId=%s", (user_id,))
    _update("DELETE FROM customfunction WHERE userId=%s", (user_id,))
    _update("DELETE FROM user WHERE id=%s", (user_id,))
    