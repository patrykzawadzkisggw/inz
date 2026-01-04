import os
import io
import contextlib
from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from fastapi import HTTPException
from transpiler import transpile
from econ_runtime import _EVAL_RESULTS, _reset_magic_results 
import econ_runtime as econ_rt
from db import (
    _connect,
    fetch_user_functions,
)

def ensure_user_file(user_id: str) -> None:
    USERS_DIR = os.path.join(os.path.dirname(__file__), "users")
    os.makedirs(USERS_DIR, exist_ok=True)
    path = os.path.join(USERS_DIR, f"{user_id}.py")
    if not os.path.exists(path):
        open(path, "a", encoding="utf-8").close()

class TranspileRequest(BaseModel):
    code: str
    execute: bool = False
    run: bool = False

class TranspileResponse(BaseModel):
    python: str

class RunRequest(BaseModel):
    code: str

class RunResponse(BaseModel):
    output: str
    results: list | None = None

class RunPythonRequest(BaseModel):
    python: str

def _extract_path(obj, path):
    cur = obj
    for key in path:
        if cur is None:
            return None
        if isinstance(cur, dict):
            cur = cur.get(key)
        else:
            cur = getattr(cur, key, None)
    return cur

def extract_user_id(auth_obj) -> str | None:
    """Try common locations for the authenticated user's identifier.
    Prefers JWT 'sub', but also supports 'userId' / 'user_id'. Works for dicts or objects.
    """
    candidates = [
        ["payload", "sub"],
        ["sub"],
        ["sessionClaims", "sub"],
        ["claims", "sub"],
        ["user", "payload", "sub"],
        ["user", "sub"],
        ["userId"],
        ["user_id"],
        ["payload", "userId"],
        ["payload", "user_id"],
    ]
    for path in candidates:
        val = _extract_path(auth_obj, path)
        if isinstance(val, (str, int)) and str(val):
            return str(val)
    raise HTTPException(status_code=401, detail="Brak userId (sub) w tokenie")

def transpile_or_run(payload: TranspileRequest, user_id: str):
    try:
        if user_id:
            ensure_user_file(user_id)
    except Exception:
        pass
    try:
        py_code = transpile(payload.code, user_id)
        print(py_code)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"transpile error: {e}")

    try:
        compiled = compile(py_code, '<transpiled>', 'exec')
    except SyntaxError as e:
        raise HTTPException(status_code=400, detail=f"python syntax error: {e.msg} (line {e.lineno})")

    if getattr(payload, 'run', False):
        try:
            if hasattr(econ_rt, 'set_current_user') and user_id:
                econ_rt.set_current_user(user_id)
            try:
                if hasattr(econ_rt, 'set_db_connect'):
                    try:
                        econ_rt.set_db_connect(_connect)
                    except Exception:
                        pass
                setattr(econ_rt, '_db_connect', _connect)
            except Exception:
                pass
        except Exception:
            pass
        try:
            if user_id:
                import importlib, sys
                importlib.invalidate_caches()
                modname = f"users.{user_id}"
                if modname in sys.modules:
                    del sys.modules[modname]
        except Exception:
            pass
        glb = {k: getattr(econ_rt, k) for k in getattr(econ_rt, '__all__', [])}
        glb['_EVAL_RESULTS'] = _EVAL_RESULTS
        loc: dict = {}
        buf_out = io.StringIO()
        try:
            _reset_magic_results()
            with contextlib.redirect_stdout(buf_out):
                exec(compiled, glb, loc)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"runtime error: {e}")
        results = _EVAL_RESULTS.copy() if _EVAL_RESULTS else None
        return RunResponse(output=buf_out.getvalue(), results=results)

    return {"python": py_code}

def execute_python_code(payload: RunPythonRequest):
    code = payload.python
    try:
        compiled = compile(code, '<run-python>', 'exec')
    except SyntaxError as e:
        raise HTTPException(status_code=400, detail=f"python syntax error: {e.msg} (line {e.lineno})")
    try:
        if hasattr(econ_rt, 'set_db_connect'):
            try:
                econ_rt.set_db_connect(_connect)
            except Exception:
                pass
        setattr(econ_rt, '_db_connect', _connect)
    except Exception:
        pass
    glb = {k: getattr(econ_rt, k) for k in getattr(econ_rt, '__all__', [])}
    glb['_EVAL_RESULTS'] = _EVAL_RESULTS
    loc: dict = {}
    buf_out = io.StringIO()
    try:
        _reset_magic_results()
        with contextlib.redirect_stdout(buf_out):
            exec(compiled, glb, loc)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"runtime error: {e}")
    results = _EVAL_RESULTS.copy() if _EVAL_RESULTS else None
    return RunResponse(output=buf_out.getvalue(), results=results)

def update_user_fn(user_id: str):
    try:
        rows = fetch_user_functions(user_id)
        cleaned = clean_user_functions(rows)
        content = generate_source_code(cleaned)
        out_path = save_user_functions(user_id, content)
        return {"status": "ok", "file": out_path, "functions": len(rows)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"user functions update failed: {e}")

def clean_user_functions(snippets: List[str]) -> List[str]:
    import re
    cleaned: List[str] = []
    pattern = re.compile(r"^\s*from\s+econ_runtime\s+import\s+\*\s*$", re.IGNORECASE)
    for sn in snippets:
        lines = sn.splitlines()
        filt = [l for l in lines if not pattern.match(l)]
        while filt and filt[0].strip() == "":
            filt.pop(0)
        while filt and filt[-1].strip() == "":
            filt.pop()
        cleaned.append("\n".join(filt))
    return cleaned

def generate_source_code(cleaned_snippets: List[str]) -> str:
    content_parts = ["from econ_runtime import *", ""]
    content_parts.extend([s for s in cleaned_snippets if s is not None and s.strip() != ""])
    content = ("\n\n".join(content_parts) + "\n").replace("\r\n", "\n")
    return content

def save_user_functions(user_id: str, content: str) -> str:
    base_dir = os.path.join(os.path.dirname(__file__), "users")
    os.makedirs(base_dir, exist_ok=True)
    out_path = os.path.join(base_dir, f"{user_id}.py")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(content)
    return out_path