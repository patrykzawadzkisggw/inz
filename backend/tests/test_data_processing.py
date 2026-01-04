import io
import types
import pytest
import requests
import datetime
import data_processing as dp
import json

class DummyResp:
    def __init__(self, text='', status_code=200, json_obj=None):
        self.text = text
        self.status_code = status_code
        self._json = json_obj or {}

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.HTTPError(f'status {self.status_code}')

    def json(self):
        return self._json


def test_process_csv_from_url_basic(monkeypatch):
    sample = 'date,val\n2020-01-01,1\n2020-01-02,2\n'
    monkeypatch.setattr(dp.requests, 'get', lambda url, timeout: DummyResp(text=sample))
    schema = [{'name': 'ds', 'type': 'date'}, {'name': 'y', 'type': 'number'}]
    csv_text, dcol, vcol = dp.process_csv_from_url({'urlValue': 'http://x'}, schema)
    assert '2020-01-01' in csv_text
    assert dcol == 'ds' and vcol == 'y'


def test_process_csv_from_url_missing_url():
    with pytest.raises(RuntimeError):
        dp.process_csv_from_url({}, [])


def test_csv_from_datablob_utf8_and_latin1():
    b = 'a,b,c'.encode('utf-8')
    assert dp.csv_from_datablob(b) == 'a,b,c'
    latin = bytes([0xE9])
    assert dp.csv_from_datablob(latin) == latin.decode('latin-1')


def test_get_ds_y_columns_with_schema_and_from_header():
    schema = [{'name': 'd', 'type': 'date'}, {'name': 'v', 'type': 'number'}]
    csv = 'a,b\n1,2\n'
    assert dp.get_ds_y_columns(schema, csv) == ('d', 'v')
    assert dp.get_ds_y_columns([], 'h1,h2\n1,2') == ('h1', 'h2')
    assert dp.get_ds_y_columns([], '') == ('ds', 'y')


def test_model_endpoint_url_and_unknown_type():
    m = {'type': 'chronos'}
    df = {}
    url = dp.model_endpoint_url(m, df)
    assert url.endswith('/predict')
    with pytest.raises(RuntimeError):
        dp.model_endpoint_url({'type': 'nope'}, {})


def test_build_predict_payload_and_holidays():
    model = {'configJson': '{"prediction_length": 5, "holiday_enabled": true, "holiday_dates": ["2020-01-01"]}'}
    payload = dp.build_predict_payload(model, 'csv', 'ds', 'y')
    assert payload['prediction_length'] == 5
    assert 'holiday_dates' in payload


def test_parse_import_options_and_schema_bad_json():
    di = {'importOptionsJson': '{bad', 'processedSchemaJson': '[]x'}
    opts, schema = dp.parse_import_options_and_schema(di)
    assert opts == {} and schema == []


def test_prepare_csv_and_columns_url_and_file(monkeypatch):
    monkeypatch.setattr(dp, 'process_csv_from_url', lambda opts, s: ('a', 'ds', 'y'))
    csv, d, v, should_update = dp.prepare_csv_and_columns({'importOptionsJson': '{"sourceType":"url","urlValue":"http://x"}'})
    assert csv == 'a' and should_update
    dataimp = {'dataBlob': b'ds,y\n2020-01-01,1'}
    csv2, d2, v2, upd2 = dp.prepare_csv_and_columns(dataimp)
    assert '2020-01-01' in csv2 and not upd2


def test_perform_prediction_success_and_failure(monkeypatch):
    monkeypatch.setattr(dp, 'prepare_csv_and_columns', lambda di: ('csv', 'ds', 'y', False))
    monkeypatch.setattr(dp, 'model_endpoint_url', lambda m, d: 'http://model/predict')
    monkeypatch.setattr(dp.requests, 'post', lambda url, json, timeout: DummyResp(json_obj={'ok': True}))
    res = dp.perform_prediction({'id': 'm1'}, {'id': 'd1'}, {})
    assert res == {'ok': True}

    monkeypatch.setattr(dp, 'prepare_csv_and_columns', lambda di: (_ for _ in ()).throw(RuntimeError('no blob')))
    err = dp.perform_prediction({'id': 'm1'}, {'importOptionsJson': ''}, {})
    assert 'error' in err


def test_process_csv_from_url_no_header_and_blank_rows(monkeypatch):
    sample = '2020-01-01,1\n,\n2020-01-03,3\n'
    monkeypatch.setattr(dp.requests, 'get', lambda url, timeout: DummyResp(text=sample))
    schema = [{'name': 'col1', 'type': 'date'}, {'name': 'col2', 'type': 'number'}]
    csv_text, dcol, vcol = dp.process_csv_from_url({'urlValue': 'http://x', 'headerRow': False}, schema)
    assert '2020-01-01' in csv_text and '2020-01-03' in csv_text


def test_process_csv_from_url_missing_required_columns(monkeypatch):
    sample = 'date,val\n2020-01-01,1\n'
    monkeypatch.setattr(dp.requests, 'get', lambda url, timeout: DummyResp(text=sample))
    schema = [{'name': 'only', 'type': 'string'}]
    with pytest.raises(RuntimeError):
        dp.process_csv_from_url({'urlValue': 'http://x'}, schema)


def test_model_endpoint_url_with_endpoint_override():
    m = {'type': 'chronos'}
    df = {'endpointUrl': 'http://example.com/'}
    assert dp.model_endpoint_url(m, df) == 'http://example.com/predict'


def test_build_predict_payload_extra_keys():
    model = {'configJson': json.dumps({'prediction_length': 7, 'missing_strategy': 'drop', 'holiday_treatment': 'none', 'frequency': 'D', 'holiday_enabled': False})}
    p = dp.build_predict_payload(model, 'csv', 'ds', 'y')
    assert p['prediction_length'] == 7 and p['missing_strategy'] == 'drop' and p['frequency'] == 'D'


def test_parse_import_options_and_schema_valid():
    di = {'importOptionsJson': json.dumps({'sourceType': 'url'}), 'processedSchemaJson': json.dumps([{'name': 'ds', 'type': 'date'}])}
    opts, schema = dp.parse_import_options_and_schema(di)
    assert opts.get('sourceType') == 'url' and isinstance(schema, list)


def test_prepare_csv_and_columns_case_insensitive_source(monkeypatch):
    monkeypatch.setattr(dp, 'process_csv_from_url', lambda opts, s: ('a', 'ds', 'y'))
    di = {'importOptionsJson': json.dumps({'sourceType': 'URL', 'urlValue': 'http://x'})}
    csv, d, v, should_update = dp.prepare_csv_and_columns(di)
    assert should_update and csv == 'a'


def test_perform_prediction_should_update_calls_datablob(monkeypatch):
    called = {}
    monkeypatch.setattr(dp, 'prepare_csv_and_columns', lambda di: ('csvtxt', 'ds', 'y', True))
    monkeypatch.setattr(dp, 'model_endpoint_url', lambda m, d: 'http://model/predict')
    monkeypatch.setattr(dp.requests, 'post', lambda url, json, timeout: DummyResp(json_obj={'ok': True}))
    monkeypatch.setattr(dp, 'update_dataimport_datablob', lambda id, csv: called.setdefault('updated', (id, csv)))
    res = dp.perform_prediction({'id': 'm1'}, {'id': 'did'}, {})
    assert res == {'ok': True}
    assert called.get('updated')[0] == 'did'


def test_perform_prediction_request_failure(monkeypatch):
    monkeypatch.setattr(dp, 'prepare_csv_and_columns', lambda di: ('csv', 'ds', 'y', False))
    monkeypatch.setattr(dp, 'model_endpoint_url', lambda m, d: 'http://model/predict')

    class Bad:
        def raise_for_status(self):
            raise requests.HTTPError('bad')

    monkeypatch.setattr(dp.requests, 'post', lambda url, json, timeout: Bad())
    res = dp.perform_prediction({'id': 'm1'}, {'id': 'd1'}, {})
    assert 'error' in res


def test_run_datafeed_job_and_predict_for_model_now(monkeypatch):
    calls = {}
    monkeypatch.setattr(dp, 'fetch_datafeed', lambda fid: {'id': fid, 'active': True, 'modelId': 'mod1'})
    monkeypatch.setattr(dp, 'fetch_model', lambda mid: {'id': mid})
    monkeypatch.setattr(dp, 'fetch_latest_dataimport', lambda mid: {'id': 'did'})
    monkeypatch.setattr(dp, 'perform_prediction', lambda m, d, rec: {'res': True})
    monkeypatch.setattr(dp, 'insert_prediction', lambda mid, payload: calls.setdefault('inserted', (mid, payload)))
    monkeypatch.setattr(dp, 'update_datafeed_run_times', lambda fid, now: calls.setdefault('updated', (fid, now)))

    dp.run_datafeed_job('feed1')
    assert calls.get('inserted')[0] == 'mod1'
    assert calls.get('updated')[0] == 'feed1'

    monkeypatch.setattr(dp, 'fetch_model', lambda mid: None)
    res = dp.predict_for_model_now('x')
    assert res.get('error') == 'model_not_found'

    monkeypatch.setattr(dp, 'fetch_model', lambda mid: {'id': 'm2'})
    monkeypatch.setattr(dp, 'fetch_latest_dataimport', lambda mid: None)
    res2 = dp.predict_for_model_now('m2')
    assert res2.get('error') == 'dataimport_not_found'

    monkeypatch.setattr(dp, 'fetch_latest_dataimport', lambda mid: {'id': 'did2'})
    monkeypatch.setattr(dp, 'fetch_datafeeds_by_model', lambda mid: [])
    monkeypatch.setattr(dp, 'perform_prediction', lambda m, d, rec: {'ok': True})
    monkeypatch.setattr(dp, 'insert_prediction', lambda mid, payload: calls.setdefault('ins2', (mid, payload)))
    final = dp.predict_for_model_now('m2')
    assert final == {'ok': True}



class DummyResponse:
    def __init__(self, text='', status_code=200, json_data=None):
        self.text = text
        self.status_code = status_code
        self._json = json_data or {}

    def raise_for_status(self):
        if self.status_code >= 400:
            raise Exception(f'status {self.status_code}')

    def json(self):
        return self._json


def test_process_csv_from_url_basic(monkeypatch):
    csv_text = 'date,val,other\n2020-01-01,1,x\n2020-01-02,2,y\n'
    resp = DummyResponse(text=csv_text)
    monkeypatch.setattr(dp.requests, 'get', lambda url, timeout=30: resp)

    import_opts = {'urlValue': 'http://example.com/data.csv', 'headerRow': True}
    schema = [
        {'type': 'date', 'key': 'date', 'name': 'ds'},
        {'type': 'number', 'key': 'val', 'name': 'y'},
    ]
    out_csv, date_col, val_col = dp.process_csv_from_url(import_opts, schema)
    assert 'ds' in out_csv
    assert '2020-01-01' in out_csv
    assert date_col == 'ds'
    assert val_col == 'y'


def test_csv_from_datablob_decoding():
    b = 'a,b\n1,2'.encode('utf-8')
    assert dp.csv_from_datablob(b).startswith('a,b')
    b2 = 'a,b\ná,ç'.encode('latin-1')
    assert 'á' in dp.csv_from_datablob(b2)


def test_get_ds_y_columns_with_schema_and_headers():
    schema = [{'type': 'date', 'name': 'ds'}, {'type': 'number', 'name': 'y'}]
    csv_text = 'ds,y\n1,2\n'
    assert dp.get_ds_y_columns(schema, csv_text) == ('ds', 'y')

    assert dp.get_ds_y_columns([], 'a,b\n1,2') == ('a', 'b')


def test_model_endpoint_url_and_build_payload():
    model = {'type': 'chronos', 'configJson': json.dumps({'prediction_length': 5, 'holiday_enabled': True, 'holiday_dates': ['2020-01-01']})}
    datafeed = {}
    url = dp.model_endpoint_url(model, datafeed)
    assert url.endswith('/predict')

    payload = dp.build_predict_payload(model, 'csvtext', 'ds', 'y')
    assert payload['csv_content'] == 'csvtext'
    assert payload['prediction_length'] == 5
    assert 'holiday_dates' in payload


def test_parse_import_options_and_prepare(monkeypatch):
    di = {'importOptionsJson': json.dumps({'sourceType': 'url', 'urlValue': 'http://x'}), 'processedSchemaJson': json.dumps([{'type': 'date', 'name': 'ds'}, {'type': 'number', 'name': 'y'}])}
    res_opts, res_schema = dp.parse_import_options_and_schema(di)
    assert res_opts['urlValue'] == 'http://x'
    assert isinstance(res_schema, list)

    monkeypatch.setattr(dp, 'process_csv_from_url', lambda opts, schema: ('ds,y\n2020-01-01,1\n', 'ds', 'y'))
    csv_text, date_col, value_col, should_update = dp.prepare_csv_and_columns(di)
    assert should_update is True
    assert '2020-01-01' in csv_text


def test_perform_prediction_success_and_failure(monkeypatch):
    monkeypatch.setattr(dp, 'prepare_csv_and_columns', lambda dataimp: ('ds,y\n2020-01-01,1\n', 'ds', 'y', True))
    called = {}
    monkeypatch.setattr(dp, 'update_dataimport_datablob', lambda did, csv: called.setdefault('updated', True))

    class FakeResp(DummyResponse):
        def __init__(self):
            super().__init__(text='', status_code=200, json_data={'pred': 1})

    monkeypatch.setattr(dp.requests, 'post', lambda url, json, timeout: FakeResp())

    model = {'type': 'chronos'}
    dataimp = {'id': 'did', 'importOptionsJson': ''}
    res = dp.perform_prediction(model, dataimp, {})
    assert isinstance(res, dict)
    assert res.get('pred') == 1
    assert called.get('updated') is True

    def bad_post(url, json, timeout):
        raise Exception('conn')

    monkeypatch.setattr(dp.requests, 'post', bad_post)
    res2 = dp.perform_prediction(model, dataimp, {})
    assert 'error' in res2


def test_run_datafeed_and_predict_now(monkeypatch):
    monkeypatch.setattr(dp, 'fetch_datafeed', lambda fid: {'id': fid, 'active': True, 'modelId': 'm1'})
    monkeypatch.setattr(dp, 'fetch_model', lambda mid: {'id': mid, 'type': 'chronos'})
    monkeypatch.setattr(dp, 'fetch_latest_dataimport', lambda mid: {'id': 'di1'})
    monkeypatch.setattr(dp, 'perform_prediction', lambda model, dataimp, rec: {'ok': True})
    recorded = {}
    monkeypatch.setattr(dp, 'insert_prediction', lambda mid, payload: recorded.setdefault('inserted', (mid, payload)))
    monkeypatch.setattr(dp, 'update_datafeed_run_times', lambda fid, now: recorded.setdefault('updated', (fid, now)))

    dp.run_datafeed_job('f1')
    assert recorded.get('inserted')[0] == 'm1'
    assert recorded.get('updated')[0] == 'f1'

    monkeypatch.setattr(dp, 'fetch_model', lambda mid: {'id': mid, 'type': 'chronos'})
    monkeypatch.setattr(dp, 'fetch_latest_dataimport', lambda mid: {'id': 'di1'})
    monkeypatch.setattr(dp, 'fetch_datafeeds_by_model', lambda mid: [{'endpointUrl': None}])
    recorded.clear()
    dp.predict_for_model_now('m1')
