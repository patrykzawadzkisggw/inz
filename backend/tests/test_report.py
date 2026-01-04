import datetime
import io
import types
import os
import pytest
import report


def test_get_html_table_and_to_numeric_and_expand_series():
    res = {'columns': ['a', 'b'], 'rows': [{'a': 1, 'b': 2}, {'a': 3, 'b': 4}]}
    html = report.get_html_table(res)
    assert '<table' in html and 'a' in html

    assert report.to_numeric_list([1, '2', 'x']) == [1.0, 2.0]



def test_get_html_table_and_to_numeric_and_expand_series():
    res = {'columns': ['a', 'b'], 'rows': [{'a': 1, 'b': 2}, {'a': 3, 'b': 4}]}
    html = report.get_html_table(res)
    assert '<table' in html and 'a' in html

    assert report.to_numeric_list([1, '2', 'x']) == [1.0, 2.0]

    nested = {'col': [{'x': 1, 'y': 2}, {'x': 3, 'y': 4}]}
    exp = report.expand_series(nested)
    assert 'x' in exp and 'y' in exp


def test_get_html_chart_renders(monkeypatch):
    inline = []
    widget = {'chartType': 'line', 'data': {'series': {'s1': [1, 2, 3]}}}
    html = report.get_html_chart(widget, inline)
    assert 'img' in html or '<div' in html
    assert inline and inline[0][2] == 'image/png'


def test_run_report_job_sends_mail_and_updates(monkeypatch):
    monkeypatch.setattr(report, 'fetch_report', lambda rid: {'id': rid, 'enabled': True, 'userId': 'u1', 'name': 'R'})
    monkeypatch.setattr(report, 'fetch_user', lambda uid: {'email': 'to@example.com'})
    monkeypatch.setattr(report, 'ensure_user_file', lambda uid: None)

    class ER:
        _EVAL_RESULTS = [
            {'type': 'text', 'text': 'hello'},
            {'type': 'table', 'columns': ['a'], 'rows': [{'a': 1}]}
        ]

        def _reset_magic_results(self):
            return None

    monkeypatch.setattr(report, '_econ_rt', ER)

    sent = {}
    def fake_send(to, subject, body, inline_images=None):
        sent['to'] = to
        sent['subject'] = subject
        sent['body'] = body

    monkeypatch.setattr(report, 'wyslij_mail', fake_send)

    updated = {}
    def upd_fn(rid, now, nxt):
        updated['rid'] = rid
        updated['now'] = now

    report.run_report_job('r1', upd_fn, datetime.timezone.utc)
    assert sent.get('to') == 'to@example.com'
    assert updated.get('rid') == 'r1'


def test_get_html_table_infers_columns():
    rows = [{'a': 1, 'b': 2}, {'a': 3, 'c': 4}]
    html = report.get_html_table({'columns': [], 'rows': rows})
    assert '<table' in html and 'a' in html and 'b' in html and 'c' in html


def test_to_numeric_list_and_expand_series():
    out = report.to_numeric_list({'x': '1', 'y': '2'})
    assert out == [1.0, 2.0]
    assert report.to_numeric_list('3') == [3.0]
    assert report.to_numeric_list(['a', '1']) == [1.0]

    inp = {'col': [{'k': 1, 'm': 2}, {'k': 3, 'm': 4}]}
    exp = report.expand_series(inp)
    assert 'k' in exp and 'm' in exp

    already = {'a': [1, 2], 'b': [3, 4]}
    assert report.expand_series(already) == already


@pytest.mark.parametrize('chart_type', ['line', 'area', 'bar', 'pie', 'scatter', 'unknown'])
def test_get_html_chart_various(chart_type):
    series = {'s1': [1, 2, 3]}
    res = {'chartType': chart_type, 'data': {'series': series}}
    inline = []
    html = report.get_html_chart(res, inline)
    assert ('img' in html) or ('pusta seria' in html) or ('chart' in html)
    if series:
        assert inline, 'inline images should be populated for non-empty series'


def test_get_html_chart_empty_series():
    res = {'chartType': 'line', 'data': {'series': {}}}
    html = report.get_html_chart(res, [])
    assert '(pusta seria)' in html


def test_run_report_job_sends_email_and_updates(monkeypatch, tmp_path):
    called = {}
    rpt = {
        'id': 'r1', 'enabled': True, 'userId': 'u1',
        'conditionFormula2': '', 'messageTemplate2': ''
    }

    monkeypatch.setattr(report, 'fetch_report', lambda rid: rpt)
    monkeypatch.setattr(report, 'ensure_user_file', lambda uid: None)
    monkeypatch.setattr(report, 'fetch_user', lambda uid: {'email': 'a@x.com'})

    report._econ_rt._EVAL_RESULTS = [
        {'type': 'text', 'text': 'hello'},
        {'type': 'table', 'columns': ['c1'], 'rows': [{'c1': 'v1'}]},
        {'type': 'chart', 'chartType': 'line', 'data': {'series': {'s': [1, 2]}}}
    ]

    def fake_mail(recipient, subject, body, inline_images=None):
        called['mail'] = (recipient, subject, body, inline_images)

    monkeypatch.setattr(report, 'wyslij_mail', fake_mail)

    def upd(rid, now, none):
        called['update'] = (rid, now)

    report.run_report_job('r1', upd, datetime.timezone.utc)
    assert 'mail' in called
    assert called['mail'][0] == 'a@x.com'
    assert 'update' in called and called['update'][0] == 'r1'


def test_run_report_job_no_recipient_or_not_allowed(monkeypatch):
    monkeypatch.setattr(report, 'fetch_report', lambda rid: None)
    report.run_report_job('none', lambda *a: None, datetime.timezone.utc)

    rpt = {'id': 'r2', 'enabled': True, 'userId': 'u2', 'conditionFormula2': '', 'messageTemplate2': ''}
    monkeypatch.setattr(report, 'fetch_report', lambda rid: rpt)
    monkeypatch.setattr(report, 'fetch_user', lambda uid: {})
    report._econ_rt._EVAL_RESULTS = []
    called = {}
    report.run_report_job('r2', lambda *a: called.setdefault('u', True), datetime.timezone.utc)
    assert 'u' in called

    rpt2 = {'id': 'r3', 'enabled': True, 'userId': 'u3', 'conditionFormula2': 'def onSent():\\n    return False', 'messageTemplate2': ''}
    monkeypatch.setattr(report, 'fetch_report', lambda rid: rpt2)
    monkeypatch.setattr(report, 'fetch_user', lambda uid: {'email': 'b@x.com'})
    called2 = {}
    report.run_report_job('r3', lambda *a: called2.setdefault('u', True), datetime.timezone.utc)
    assert 'u' in called2
