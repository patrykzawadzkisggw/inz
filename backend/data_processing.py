import os
import io
import csv
import json
import datetime
from typing import Dict, Any, List, Tuple, Optional
import requests
from db import (
    fetch_datafeed,
    fetch_model,
    fetch_latest_dataimport,
    update_datafeed_run_times,
    insert_prediction,
    fetch_datafeeds_by_model,
    update_dataimport_datablob
)

MODEL_URL_MAP = {
    'chronos': os.getenv('MODEL_URL_CHRONOS', 'http://localhost:8080'),
    'morai': os.getenv('MODEL_URL_MORAI', 'http://localhost:8081'),
    'timesfm': os.getenv('MODEL_URL_TIMESFM', 'http://localhost:8082'),
}

UTC = datetime.timezone.utc

def process_csv_from_url(import_opts: Dict[str, Any], schema: List[Dict[str, Any]]) -> Tuple[str, str, str]:
    """Download CSV from URL and extract date/value columns according to schema.
    Returns (csv_text, date_col_name, value_col_name). Output CSV contains only those two columns.
    """
    url = import_opts.get('urlValue')
    if not url:
        raise RuntimeError("Brak 'urlValue' w importOptionsJson")
    separator = import_opts.get('separator') or import_opts.get('delimiter') or ','
    has_header = bool(import_opts.get('headerRow', True))

    response = requests.get(url, timeout=30)
    response.raise_for_status()
    csv_text = response.text

    reader = csv.reader(io.StringIO(csv_text))
    rows = list(reader)
    if not rows:
        raise RuntimeError('Pusty plik CSV z URL')

    if has_header:
        headers_in = rows[0]
        data_rows = rows[1:]
    else:
        headers_in = [f'col{i+1}' for i in range(len(rows[0]))]
        data_rows = rows

    date_entry = next((c for c in schema if not c.get('removed') and (c.get('type') == 'date')), None)
    val_entry = next((c for c in schema if not c.get('removed') and (c.get('type') == 'number')), None)
    if not date_entry or not val_entry:
        raise RuntimeError('Brak wymaganych kolumn date/number w processedSchemaJson')

    date_key = date_entry.get('key') or date_entry.get('name')
    value_key = val_entry.get('key') or val_entry.get('name')
    date_out = date_entry.get('name') or 'ds'
    value_out = val_entry.get('name') or 'y'
    try:
        date_index = headers_in.index(date_key)
        value_index = headers_in.index(value_key)
    except ValueError:
        try:
            date_index = headers_in.index(date_out)
            value_index = headers_in.index(value_out)
        except ValueError:
            raise RuntimeError('Nie znaleziono kolumn wg processedSchemaJson w źródle CSV')

    output_buffer = io.StringIO()
    csv_writer = csv.writer(output_buffer)
    csv_writer.writerow([date_out, value_out])
    for row in data_rows:
        if len(row) <= max(date_index, value_index):
            continue
        date_value = row[date_index]
        value_value = row[value_index]
        if (date_value is None or str(date_value).strip() == '') or (value_value is None or str(value_value).strip() == ''):
            continue
        csv_writer.writerow([date_value, value_value])
    return output_buffer.getvalue(), date_out, value_out

def csv_from_datablob(datablob: Optional[bytes]) -> str:
    if not datablob:
        raise RuntimeError('Brak dataBlob dla źródła file')
    try:
        return datablob.decode('utf-8')
    except Exception:
        return datablob.decode('latin-1')

def get_ds_y_columns(schema: List[Dict[str, Any]], csv_text: str) -> Tuple[str, str]:
    date_entry = next((c for c in schema if not c.get('removed') and (c.get('type') == 'date')), None)
    val_entry = next((c for c in schema if not c.get('removed') and (c.get('type') == 'number')), None)
    if date_entry and val_entry:
        date_col = date_entry.get('name') or 'ds'
        value_col = val_entry.get('name') or 'y'
        return date_col, value_col
    csv_reader = csv.reader(io.StringIO(csv_text))
    rows = list(csv_reader)
    if rows:
        headers = rows[0]
        if len(headers) >= 2:
            return headers[0], headers[1]
    return 'ds', 'y'

def model_endpoint_url(model: Dict[str, Any], datafeed: Dict[str, Any]) -> str:
    if datafeed.get('endpointUrl'):
        base_url = datafeed['endpointUrl']
    else:
        model_type = (model.get('type') or '').lower()
        base_url = MODEL_URL_MAP.get(model_type)
        if not base_url:
            raise RuntimeError(f"Nieznany typ modelu: {model.get('type')}")
    if base_url.endswith('/'):
        base_url = base_url[:-1]
    return base_url + '/predict'

def build_predict_payload(model: Dict[str, Any], csv_text: str, date_col: str, value_col: str) -> Dict[str, Any]:
    config: Dict[str, Any] = {}
    try:
        if model.get('configJson'):
            config = json.loads(model['configJson'])
            if not isinstance(config, dict):
                config = {}
    except Exception:
        config = {}
    payload: Dict[str, Any] = {
        'csv_content': csv_text,
        'context': value_col,
        'date_column': date_col,
    }
    for key in ['prediction_length', 'missing_strategy', 'holiday_treatment', 'frequency']:
        if key in config:
            payload[key] = config[key]
    if config.get('holiday_enabled') and 'holiday_dates' in config:
        payload['holiday_dates'] = config.get('holiday_dates')
    return payload

def parse_import_options_and_schema(data_import: Dict[str, Any]) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    import_options: Dict[str, Any] = {}
    schema: List[Dict[str, Any]] = []
    try:
        if data_import.get('importOptionsJson'):
            import_options = json.loads(data_import['importOptionsJson'])
    except Exception:
        import_options = {}
    try:
        if data_import.get('processedSchemaJson'):
            schema = json.loads(data_import['processedSchemaJson'])
            if not isinstance(schema, list):
                schema = []
    except Exception:
        schema = []
    return import_options, schema

def prepare_csv_and_columns(dataimp: Dict[str, Any]) -> Tuple[str, str, str, bool]:
    """Given a dataimport record, returns (csv_text, date_col, value_col, should_update_datablob).
    If the source is URL, should_update_datablob=True to indicate the processed CSV should be persisted.
    """
    import_opts, schema = parse_import_options_and_schema(dataimp)
    source_type = (import_opts.get('sourceType') or '').lower()
    if source_type == 'url':
        csv_text, date_col, value_col = process_csv_from_url(import_opts, schema)
        return csv_text, date_col, value_col, True
    csv_text = csv_from_datablob(dataimp.get('dataBlob'))
    date_col, value_col = get_ds_y_columns(schema, csv_text)
    return csv_text, date_col, value_col, False

def perform_prediction(model: Dict[str, Any], dataimp: Dict[str, Any], endpoint_ctx: Dict[str, Any]) -> Dict[str, Any]:
    try:
        csv_text, date_col, value_col, should_update = prepare_csv_and_columns(dataimp)
    except Exception as e:
        err_key = "data_fetch_or_process_failed" if 'urlValue' in (dataimp.get('importOptionsJson') or '') else "no_datablob"
        return {"error": f"{err_key}: {e}"}
    if should_update:
        try:
            update_dataimport_datablob(dataimp['id'], csv_text)
        except Exception:
            pass
    try:
        url = model_endpoint_url(model, endpoint_ctx)
        payload = build_predict_payload(model, csv_text, date_col, value_col)
        response = requests.post(url, json=payload, timeout=60)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        return {"error": str(e)}


def run_datafeed_job(feed_id: str):
    rec = fetch_datafeed(feed_id)
    if not rec or not rec.get('active'):
        return
    model = fetch_model(rec['modelId'])
    if not model:
        return
    dataimp = fetch_latest_dataimport(model['id'])
    if not dataimp or not model:
        return
    result_payload = perform_prediction(model, dataimp, rec)
    try:
        insert_prediction(model['id'], result_payload)
    except Exception:
        pass
    now = datetime.datetime.now(UTC)
    try:
        update_datafeed_run_times(feed_id, now)
    except Exception:
        pass


def predict_for_model_now(model_id: str) -> Dict[str, Any]:
    """Uruchamia predykcję natychmiast na podstawie ostatniego dataimport; zapisuje w prediction; zwraca payload (albo error)."""
    model = fetch_model(model_id)
    if not model:
        return {"error": "model_not_found", "modelId": model_id}
    dataimp = fetch_latest_dataimport(model_id)
    if not dataimp:
        return {"error": "dataimport_not_found", "modelId": model_id}

    feeds = fetch_datafeeds_by_model(model_id)
    datafeed_stub = feeds[0] if feeds else {"endpointUrl": None}

    result_payload = perform_prediction(model, dataimp, datafeed_stub)

    try:
        insert_prediction(model_id, result_payload)
    except Exception:
        pass
    return result_payload
