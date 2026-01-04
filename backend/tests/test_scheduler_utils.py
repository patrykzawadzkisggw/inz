import os
import json

import pytest

import scheduler_utils as su
from fastapi import HTTPException


def test__extract_path_with_dict_and_object():
    data = {'payload': {'sub': 'user123'}, 'userId': 'u2'}
    assert su._extract_path(data, ['payload', 'sub']) == 'user123'
    class Obj:
        def __init__(self):
            self.sub = 'o1'

    assert su._extract_path(Obj(), ['sub']) == 'o1'
    assert su._extract_path({}, ['nope']) is None


def test_extract_user_id_various_shapes():
    d = {'payload': {'sub': 's1'}}
    assert su.extract_user_id(d) == 's1'

    d2 = {'userId': 'u1'}
    assert su.extract_user_id(d2) == 'u1'

    class O:
        def __init__(self):
            self.payload = {'sub': 'p1'}

    assert su.extract_user_id(O()) == 'p1'

    with pytest.raises(HTTPException):
        su.extract_user_id({})


def test_clean_user_functions_and_generate_source_and_save(tmp_path, monkeypatch):
    snippets = [
        "from econ_runtime import *\n\ndef f():\n    return 1\n",
        "\n# comment\n"]
    cleaned = su.clean_user_functions(snippets)
    assert all('econ_runtime' not in s for s in cleaned)

    gen = su.generate_source_code(cleaned)
    assert gen.startswith('from econ_runtime import *')

    monkeypatch.setattr(su.os.path, 'dirname', lambda _: str(tmp_path))
    out = su.save_user_functions('testuser', gen)
    assert os.path.exists(out)
    with open(out, 'r', encoding='utf-8') as f:
        content = f.read()
    assert 'def f()' in content


def test_ensure_user_file_creates_file(tmp_path, monkeypatch):
    monkeypatch.setattr(su.os.path, 'dirname', lambda _: str(tmp_path))
    users_dir = tmp_path / 'users'
    if users_dir.exists():
        for p in users_dir.iterdir():
            p.unlink()
        users_dir.rmdir()

    su.ensure_user_file('u_abc')
    created = users_dir / 'u_abc.py'
    assert created.exists()
    assert created.stat().st_size == 0


def test_transpile_or_run_executes_and_captures(monkeypatch, tmp_path):
    su._reset_magic_results()
    monkeypatch.setattr(su.os.path, 'dirname', lambda _: str(tmp_path))
    monkeypatch.setattr(su, 'ensure_user_file', lambda uid: (_ for _ in ()).throw(Exception('fs fail')))

    class FakePayload:
        def __init__(self, code, run=False):
            self.code = code
            self.run = run
            self.execute = False

    monkeypatch.setattr(su, 'transpile', lambda code, uid: code)

    payload = FakePayload('_EVAL_RESULTS.append({"type": "text", "text": "hi"})', run=True)
    res = su.transpile_or_run(payload, 'u1')
    assert res.output == ''
    assert res.results and res.results[-1]['text'] == 'hi'

    assert hasattr(res, 'results')

    monkeypatch.setattr(su, 'transpile', lambda code, uid: (_ for _ in ()).throw(Exception('boom')))
    with pytest.raises(HTTPException):
        su.transpile_or_run(FakePayload('x'), 'u1')

    def bad_transpile(code, uid):
        return 'def bad(:\n    pass'
    monkeypatch.setattr(su, 'transpile', bad_transpile)
    with pytest.raises(HTTPException):
        su.transpile_or_run(FakePayload('x'), 'u1')

    monkeypatch.setattr(su, 'transpile', lambda code, uid: 'raise RuntimeError("rt")')
    with pytest.raises(HTTPException):
        su.transpile_or_run(FakePayload('x', run=True), 'u1')

    monkeypatch.setattr(su, 'transpile', lambda code, uid: 'x=1')
    out = su.transpile_or_run(FakePayload('x', run=False), 'u1')
    assert isinstance(out, dict) and 'python' in out

    payload.run = True
    monkeypatch.setattr(su.econ_rt, 'set_current_user', lambda u: (_ for _ in ()).throw(Exception('set user fail')))
    monkeypatch.setattr(su.econ_rt, 'set_db_connect', lambda c: (_ for _ in ()).throw(Exception('db set fail')))
    res2 = su.transpile_or_run(payload, 'u1')
    assert hasattr(res2, 'output')


def test_execute_python_code_paths(monkeypatch):
    class FakePayload:
        def __init__(self, py):
            self.python = py

    monkeypatch.setattr(su.econ_rt, 'set_db_connect', lambda c: (_ for _ in ()).throw(Exception('db set fail')))
    ok = su.execute_python_code(FakePayload('x=1'))
    assert ok.output == ''

    with pytest.raises(HTTPException):
        su.execute_python_code(FakePayload('def bad(:'))

    with pytest.raises(HTTPException):
        su.execute_python_code(FakePayload('raise RuntimeError("boom")'))


def test_update_user_fn_success_and_error(monkeypatch, tmp_path):
    monkeypatch.setattr(su.os.path, 'dirname', lambda _: str(tmp_path))
    rows = ['from econ_runtime import *\n\ndef f():\n    return 1']
    monkeypatch.setattr(su, 'fetch_user_functions', lambda uid: rows)
    out = su.update_user_fn('uX')
    assert out['status'] == 'ok'
    monkeypatch.setattr(su, 'fetch_user_functions', lambda uid: (_ for _ in ()).throw(HTTPException(status_code=400, detail='bad')))
    with pytest.raises(HTTPException):
        su.update_user_fn('uX')

    monkeypatch.setattr(su, 'fetch_user_functions', lambda uid: (_ for _ in ()).throw(Exception('db fail')))
    with pytest.raises(HTTPException):
        su.update_user_fn('uX')
