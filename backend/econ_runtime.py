# Minimal runtime helpers for EconLang -> Python
from __future__ import annotations
from typing import Any, Iterable, List, Optional, Sequence, Mapping
import contextvars as _ctx
import io as _io
import json as _json
import pandas as pd
import duckdb


# Per-request/task context state (safe for async concurrency)
_CTX_USER: _ctx.ContextVar[Optional[str]] = _ctx.ContextVar("ECON_USER_ID", default=None)
_CTX_DB_CONNECT: _ctx.ContextVar[Any] = _ctx.ContextVar("ECON_DB_CONNECT", default=None)
_CTX_DUCK_CONN: _ctx.ContextVar[Any] = _ctx.ContextVar("ECON_DUCK_CONN", default=None)

def set_current_user(user_id: str):
    """Set current executing user id for helper wrappers (ModelData, etc.).

    Uses ContextVar so concurrent requests do not leak state.
    """
    if user_id:
        _CTX_USER.set(str(user_id).strip())

def get_current_user() -> Optional[str]:
    """Return active user id for this execution context (or None)."""
    return _CTX_USER.get()

def _get_duck_conn():
    """Return (and lazily create) per-context in-memory DuckDB connection."""
    if duckdb is None:
        raise RuntimeError("duckdb is not installed (pip install duckdb)")
    con = _CTX_DUCK_CONN.get()
    if con is None:
        con = duckdb.connect(database=':memory:')
        _CTX_DUCK_CONN.set(con)
    return con


def register_udf(name: str, pyfunc: Any) -> bool:
    """Register a Python callable as a DuckDB scalar function if possible.

    Returns True on success, False on failure. This central helper is used by
    generated code to register only those UDFs that are actually used in SQL
    (e.g. when the transpiler detects `@fn(...)`).
    """
    try:
        con = _get_duck_conn()
    except Exception:
        return False
    # Try the simple replace=True path first
    try:
        con.create_function(name, pyfunc, replace=True)
        try:
            con.create_function(name.lower(), pyfunc, replace=True)
        except Exception:
            pass
        return True
    except TypeError:
        # Some callables require the simpler signature
        try:
            con.create_function(name, pyfunc)
            try:
                con.create_function(name.lower(), pyfunc)
            except Exception:
                pass
            return True
        except Exception:
            return False
    except Exception:
        # Last-ditch: try common explicit signatures
        try:
            for t in ("DOUBLE", "BIGINT", "VARCHAR"):
                try:
                    con.create_function(name, pyfunc, [t], t, replace=True)  # type: ignore[arg-type]
                    try:
                        con.create_function(name.lower(), pyfunc, [t], t, replace=True)  # type: ignore[arg-type]
                    except Exception:
                        pass
                    return True
                except Exception:
                    continue
        except Exception:
            pass
    return False

def register_table(name: str, obj: Any):
    """Register Python object (DataFrame / list / list[dict]) as a DuckDB view."""
    con = _get_duck_conn()
    if pd is not None and isinstance(obj, pd.DataFrame):
        try:
            con.unregister(name)
        except Exception:
            pass
        con.register(name, obj)
        return
    if pd is None:
        raise RuntimeError("pandas required to register non-DataFrame objects")
    if isinstance(obj, list) and obj and isinstance(obj[0], dict):
        df = pd.DataFrame(obj)
    elif isinstance(obj, list):
        df = pd.DataFrame({'value': obj})
    else:
        df = pd.DataFrame({'value': [obj]})
    try:
        con.unregister(name)
    except Exception:
        pass
    con.register(name, df)

def exec_sql(sql: str):
    """Execute SQL text using DuckDB; auto-register current global & local DataFrames.

    Returns pandas DataFrame if pandas is available else list of tuples.
    User / runtime functions that were defined in Python are exposed as UDFs automatically
    (best-effort – signature mismatches are skipped).
    """
    import inspect
    import builtins as _b
    frame = inspect.currentframe().f_back  # caller
    globs = frame.f_globals
    locs = frame.f_locals
    con = _get_duck_conn()
    # Register dataframes
    seen = set()
    for scope in (globs, locs):
        for k, v in scope.items():
            if k.startswith('_'):
                continue
            if pd is not None and isinstance(v, pd.DataFrame) and k not in seen:
                try:
                    con.unregister(k)
                except Exception:
                    pass
                con.register(k, v)
                seen.add(k)
    # Expose callables as UDFs (user + runtime functions). Register both original and lowercase
    # names to avoid case-sensitivity surprises in SQL (DuckDB normalizes identifiers).
    def _register_all():
        for scope in (globs, locs):
            for k, v in scope.items():
                if k.startswith('_'):
                    continue
                if not callable(v):
                    continue
                import types as _types
                if isinstance(v, (_types.ModuleType, type)):
                    continue
                if k in ("print", "exec_sql", "load_csv", "load_json"):
                    continue
                # DEBUG: show registration attempt
                try:
                   pass
                except Exception:
                    pass
                for reg_name in {k, k.lower()}:
                    try:
                        con.create_function(reg_name, v, replace=True)
                        try:
                            pass
                        except Exception:
                            pass
                    except Exception:
                        # Attempt alternative explicit signature common types
                        try:
                            for t in ("DOUBLE", "BIGINT", "VARCHAR"):
                                try:
                                    con.create_function(reg_name, v, [t], t, replace=True)  # type: ignore[arg-type]
                                    _b.print(f"[exec_sql] registered alt {reg_name} as {t}")
                                    raise StopIteration
                                except Exception:
                                    continue
                        except StopIteration:
                            continue
                        except Exception as ie:
                            if k.lower() == 'my_function':
                                try:
                                    pass
                                except Exception:
                                    pass
                        if k.lower() == 'my_function':
                            try:
                                pass
                            except Exception:
                                pass
    _register_all()

    def _try_again_on_missing(e) -> bool:
        """Return True if we registered something and should retry."""
        msg = str(e)
        marker = 'Scalar Function with name '
        if marker not in msg:
            return False
        # extract name between marker and ' does not exist'
        try:
            part = msg.split(marker,1)[1]
            fname = part.split(' does not exist',1)[0].strip('" ')
        except Exception:
            return False
        target_lower = fname.lower()
        # search python callables case-insensitively
        found = None
        for scope in (globs, locs):
            for k,v in scope.items():
                if k.lower() == target_lower and callable(v):
                    found = (k,v)
                    break
            if found: break
        if not found:
            return False
        k,v = found
        for reg_name in {k, k.lower()}:
            try:
                con.create_function(reg_name, v, replace=True)
            except Exception:
                pass
        return True

    try:
        # Execute and normalize result: if the query returns a single cell (1 row x 1 col)
        # return the scalar value instead of a DataFrame or single-row list. This makes
        # common aggregate patterns like `select max(x) ...` behave as scalars.
        if pd is not None:
            _df = con.execute(sql).fetch_df()
            if getattr(_df, 'shape', None) == (1, 1):
                return _df.iloc[0, 0]
            return _df
        else:
            _rows = con.execute(sql).fetchall()
            if isinstance(_rows, list) and len(_rows) == 1 and isinstance(_rows[0], (list, tuple)) and len(_rows[0]) == 1:
                return _rows[0][0]
            return _rows
    except Exception as e:
        # Only retry once if missing function
        did_retry = False
        try:
            import duckdb as _ddb  # type: ignore
            if isinstance(e, Exception) and _try_again_on_missing(e):
                did_retry = True
                try:
                    if pd is not None:
                        _df = con.execute(sql).fetch_df()
                        if getattr(_df, 'shape', None) == (1, 1):
                            return _df.iloc[0, 0]
                        return _df
                    else:
                        _rows = con.execute(sql).fetchall()
                        if isinstance(_rows, list) and len(_rows) == 1 and isinstance(_rows[0], (list, tuple)) and len(_rows[0]) == 1:
                            return _rows[0][0]
                        return _rows
                except Exception as e2:
                    # proceed to fallback
                    pass
        except Exception:
            did_retry = False
        # Fallback: emulate simple scalar python functions in SELECT list if registration failed
        import re as _re
        msg = str(e).lower()
        # Always attempt fallback emulation if pandas available
        if pd is not None:
            try:
                _b.print('[exec_sql] fallback emulation path triggered')
            except Exception:
                pass
            # Extract select clause (naive)
            lowered = sql.lower()
            if 'select' in lowered and 'from' in lowered:
                sel_part = sql[lowered.index('select')+6: lowered.index('from')].strip()
                # Find function calls of form FuncName(col)
                calls = []  # list of (full_expr, func, col)
                for m in _re.finditer(r'([A-Za-z_][A-Za-z0-9_]*)\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)', sel_part):
                    func, col = m.group(1), m.group(2)
                    if func in globs and callable(globs[func]):
                        calls.append((m.group(0), func, col))
                    elif func in locs and callable(locs[func]):
                        calls.append((m.group(0), func, col))
                if calls:
                    # Replace each function call with just its column to let DuckDB run
                    simplified_sel = sel_part
                    for full_expr, func, col in calls:
                        simplified_sel = simplified_sel.replace(full_expr, col)
                    new_sql = sql.replace(sel_part, simplified_sel)
                    try:
                        base_df = con.execute(new_sql).fetch_df()
                        # Apply python functions to produce original expression columns
                        # Also detect aliases in the original select (e.g. "expr AS alias")
                        alias_map = {}
                        tokens = [t.strip() for t in sel_part.split(',')]
                        for tok in tokens:
                            m = _re.match(r'(?i)^(.*)\s+as\s+([A-Za-z_][A-Za-z0-9_]*)$', tok)
                            if m:
                                expr_raw = m.group(1).strip()
                                alias = m.group(2)
                                # find which call (if any) matches expr_raw
                                for full_expr, func, col in calls:
                                    if expr_raw == full_expr or expr_raw == func + '(' + col + ')':
                                        alias_map[full_expr] = alias
                                        break
                                else:
                                    # not a function call: remember alias for plain column
                                    alias_map[expr_raw] = alias

                        for full_expr, func, col in calls:
                            pyf = globs.get(func) or locs.get(func)
                            if col in base_df.columns:
                                try:
                                    base_df[full_expr] = base_df[col].apply(pyf)
                                except Exception:
                                    base_df[full_expr] = None
                                # if this function call had an alias in the select, copy to alias name
                                if full_expr in alias_map:
                                    try:
                                        base_df[alias_map[full_expr]] = base_df[full_expr]
                                    except Exception:
                                        pass

                        # Reorder columns to match original select order (approx)
                        desired = []
                        for token in tokens:
                            # handle "expr AS alias" tokens
                            m = _re.match(r'(?i)^(.*)\s+as\s+([A-Za-z_][A-Za-z0-9_]*)$', token)
                            if m:
                                expr_raw = m.group(1).strip()
                                alias = m.group(2)
                                if alias in base_df.columns:
                                    desired.append(alias)
                                elif expr_raw in base_df.columns:
                                    # promote to alias
                                    base_df[alias] = base_df[expr_raw]
                                    desired.append(alias)
                                elif expr_raw in [c[0] for c in calls]:
                                    # use the computed expression column
                                    desired.append(expr_raw)
                                continue
                            # plain token
                            if token in base_df.columns:
                                desired.append(token)
                            elif token in [c[0] for c in calls]:
                                desired.append(token)
                        base_df = base_df[[c for c in desired if c in base_df.columns]]
                        return base_df
                    except Exception:
                        pass
        raise
    # unreachable


def __rows(obj: Any):
    """Return an iterator over row-like objects for use in `for p in __rows(x)`.

    - If obj is a pandas DataFrame -> yields SimpleNamespace(**row) for each record.
    - If obj is a pandas Series -> yields values.
    - If obj is list[dict] -> yields SimpleNamespace(**d) for each dict.
    - If obj is list/tuple of tuples -> yields tuples.
    - Otherwise yields items from obj if iterable.
    """
    from types import SimpleNamespace
    # Pandas DataFrame
    try:
        if pd is not None and hasattr(obj, 'to_dict') and hasattr(obj, 'columns'):
            for r in obj.to_dict(orient='records'):
                # convert each dict to a simple object with attribute access
                yield SimpleNamespace(**r)
            return
    except Exception:
        pass
    # Pandas Series
    try:
        if pd is not None and 'Series' in str(type(obj)):
            for v in list(obj):
                yield v
            return
    except Exception:
        pass
    # list of dicts
    if isinstance(obj, list) and obj and isinstance(obj[0], dict):
        for d in obj:
            yield SimpleNamespace(**d)
        return
    # list/tuple
    if isinstance(obj, (list, tuple)):
        for v in obj:
            yield v
        return
    # fallback: try to iterate
    try:
        for v in obj:
            yield v
    except Exception:
        # not iterable: yield the object itself
        yield obj


def _as_series(x: Any):
    if pd is not None:
        if isinstance(x, (list, tuple)):
            return pd.Series(list(x))
        if isinstance(x, pd.Series):
            return x
        if isinstance(x, pd.DataFrame) and x.shape[1] == 1:
            return x.iloc[:, 0]
    return x


def load_csv(path: str, columns: Optional[Sequence[str]] = None):
    if pd is None:
        # Fallback: naive CSV reader
        import csv
        with open(path, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            rows = list(reader)
        if columns:
            return [{k: r.get(k) for k in columns} for r in rows]
        return rows
    df = pd.read_csv(path)
    if columns:
        try:
            return df[list(columns)]
        except Exception:
            # If names missing, try to coerce
            cols = [str(c) for c in columns]
            return df[cols]
    return df


def load_json(path: str, columns: Optional[Sequence[str]] = None):
    import json
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    if pd is not None and isinstance(data, list):
        df = pd.DataFrame(data)
        if columns:
            return df[list(columns)]
        return df
    return data


def forecast_arima(series: Any, **params):
    # Stub: return series unchanged; users can replace with statsmodels
    return series


def indicator_rsi(series: Any, period: int = 14):
    s = _as_series(series)
    if pd is None or not hasattr(s, 'diff'):
        # Pure python fallback
        vals = list(s)
        gains = [max(0.0, vals[i] - vals[i-1]) if i > 0 else 0.0 for i in range(len(vals))]
        losses = [max(0.0, vals[i-1] - vals[i]) if i > 0 else 0.0 for i in range(len(vals))]
        def sma(arr, n):
            out = []
            for i in range(len(arr)):
                window = arr[max(0, i-n+1):i+1]
                out.append(sum(window)/len(window) if window else 0.0)
            return out
        avg_gain = sma(gains, period)
        avg_loss = sma(losses, period)
        rsi = []
        for g, l in zip(avg_gain, avg_loss):
            rs = (g / l) if l != 0 else float('inf')
            rsi.append(100 - (100 / (1 + rs)))
        return rsi
    delta = s.diff()
    gain = (delta.where(delta > 0, 0.0)).rolling(window=period, min_periods=1).mean()
    loss = (-delta.where(delta < 0, 0.0)).rolling(window=period, min_periods=1).mean()
    rs = gain / loss.replace(0, float('inf'))
    rsi = 100 - (100 / (1 + rs))
    return rsi


def agg(series: Any, op: str, window: Optional[dict] = None):
    s = _as_series(series)
    if pd is None or not hasattr(s, 'mean'):
        vals = list(s)
        if op == 'mean':
            return sum(vals)/len(vals) if vals else 0
        if op == 'sum':
            return sum(vals)
        if op == 'std':
            import statistics
            return statistics.pstdev(vals) if len(vals) > 1 else 0.0
        raise ValueError(f"Unknown op: {op}")
    # Ignore window for simplicity; users can filter by date externally
    if op == 'mean':
        return s.mean()
    if op == 'sum':
        return s.sum()
    if op == 'std':
        return s.std()
    raise ValueError(f"Unknown op: {op}")


def shift_series(series: Any, n: int):
    s = _as_series(series)
    if pd is None or not hasattr(s, 'shift'):
        vals = list(s)
        return [None]*n + vals[:-n] if n > 0 else vals[-n:] + [None]*(-n)
    return s.shift(n)


def filter_series(series: Any, n: int):
    # Interpret filter(n) as simple moving average
    s = _as_series(series)
    if pd is None or not hasattr(s, 'rolling'):
        vals = list(s)
        out = []
        for i in range(len(vals)):
            window = vals[max(0, i-n+1):i+1]
            out.append(sum(window)/len(window) if window else None)
        return out
    return s.rolling(window=n, min_periods=1).mean()


def send_alert_email(message: str):
    # Stub: print instead of sending email
    print(f"ALERT: {message}")


# ------------------------------------------------------------
# Additional runtime helper functions (Access/VBA style)
# Financial functions
# ------------------------------------------------------------
import math, datetime, random
from statistics import mean as _stat_mean

def _to_float(x):
    try:
        return float(x)
    except Exception:
        return 0.0

# Double Declining Balance depreciation
def ddb(cost, salvage, life, period, factor=2.0):
    cost = _to_float(cost); salvage = _to_float(salvage)
    life = _to_float(life); period = _to_float(period); factor = _to_float(factor)
    if period < 1 or period > life or life <= 0:
        return 0.0
    book = cost
    dep = 0.0
    for p in range(1, int(period)+1):
        dep = (book * factor) / life
        # prevent depreciating below salvage
        if book - dep < salvage:
            dep = book - salvage
        book -= dep
    return dep

def fv(rate, nper, pmt, pv=0.0, type=0):
    rate = _to_float(rate); nper = int(nper)
    pmt = _to_float(pmt); pv = _to_float(pv); type = int(type)
    if rate == 0:
        return -(pv + pmt * nper)
    return -(pv * (1 + rate)**nper + pmt * (1 + rate * type) * ((1 + rate)**nper - 1) / rate)

def pmt(rate, nper, pv, fv=0.0, type=0):
    rate = _to_float(rate); nper = int(nper)
    pv = _to_float(pv); fv = _to_float(fv); type = int(type)
    if rate == 0:
        return -(pv + fv) / nper
    fact = (1 + rate)**nper
    return -(pv * fact + fv) * rate / ((1 + rate * type) * (fact - 1))

def ipmt(rate, per, nper, pv, fv=0.0, type=0):
    rate = _to_float(rate); per = int(per); nper = int(nper)
    pv = _to_float(pv); fv = _to_float(fv); type = int(type)
    if per < 1 or per > nper:
        return 0.0
    p = pmt(rate, nper, pv, fv, type)
    if rate == 0:
        return 0.0
    if type == 1 and per == 1:
        return 0.0
    # balance before this period payment
    bal = pv
    if type == 1:
        bal += p
    for _ in range(1, per):
        interest = bal * rate
        principal = p - interest
        bal += principal
    return bal * rate

def ppmt(rate, per, nper, pv, fv=0.0, type=0):
    return pmt(rate, nper, pv, fv, type) - ipmt(rate, per, nper, pv, fv, type)

def pv(rate, nper, pmt, fv=0.0, type=0):
    rate = _to_float(rate); nper = int(nper)
    pmt = _to_float(pmt); fv = _to_float(fv); type = int(type)
    if rate == 0:
        return -(pmt * nper + fv)
    fact = (1 + rate)**nper
    return -(pmt * (1 + rate * type) * (fact - 1) / rate + fv) / fact

def nper(rate, pmt, pv, fv=0.0, type=0):
    rate = _to_float(rate); pmt = _to_float(pmt); pv = _to_float(pv); fv = _to_float(fv); type = int(type)
    if rate == 0:
        if pmt == 0:
            return 0
        return -(pv + fv) / pmt
    A = pmt * (1 + rate * type) / rate
    B = -(fv + pv)
    try:
        return math.log((A + B * rate / pmt) / (A - pv)) / math.log(1 + rate)
    except Exception:
        # fallback iterative
        guess = 10.0
        for _ in range(100):
            f = pv * (1 + rate)**guess + A * ((1 + rate)**guess - 1) - (-fv)
            df = pv * (1 + rate)**guess * math.log(1 + rate) + A * (1 + rate)**guess * math.log(1 + rate)
            if abs(df) < 1e-9:
                break
            guess -= f / df
        return guess

# alias potential typo
def npeer(rate, pmt, pv, fv=0.0, type=0):
    return nper(rate, pmt, pv, fv, type)

def rate(nper, pmt, pv, fv=0.0, type=0, guess=0.1, tol=1e-7, maxiter=100):
    nper = int(nper); pmt = _to_float(pmt); pv = _to_float(pv); fv = _to_float(fv); type = int(type)
    r = guess
    for _ in range(maxiter):
        if r == 0:
            r = 1e-6
        fact = (1 + r)**nper
        f = pv * fact + pmt * (1 + r * type) * (fact - 1) / r + fv
        df = pv * nper * (1 + r)**(nper - 1) + pmt * (1 + r * type) * ((fact - 1)/r**2 - nper * fact / r) + pmt * type * (fact - 1)/r
        nr = r - f / df if df != 0 else r
        if abs(nr - r) < tol:
            return nr
        r = nr
    return r

def npv(rate, *cashflows):
    rate = _to_float(rate)
    return sum(_to_float(cf) / ((1 + rate)**(i + 1)) for i, cf in enumerate(cashflows))

def irr(cashflows, guess=0.1, tol=1e-7, maxiter=200):
    flows = [ _to_float(c) for c in cashflows ]
    r = guess
    for _ in range(maxiter):
        # NPV including time 0
        npv_val = sum(flows[i] / (1 + r)**i for i in range(len(flows)))
        dnpv = sum(-i * flows[i] / (1 + r)**(i + 1) for i in range(1, len(flows)))
        if abs(dnpv) < 1e-12:
            break
        nr = r - npv_val / dnpv
        if abs(nr - r) < tol:
            return nr
        r = nr
    return r

def mirr(cashflows, finance_rate, reinvest_rate):
    flows = [ _to_float(c) for c in cashflows ]
    finance_rate = _to_float(finance_rate); reinvest_rate = _to_float(reinvest_rate)
    pos = [flows[i] * (1 + reinvest_rate)**(len(flows) - 1 - i) for i in range(len(flows)) if flows[i] > 0]
    neg = [flows[i] / (1 + finance_rate)**i for i in range(len(flows)) if flows[i] < 0]
    if not pos or not neg:
        return 0.0
    return (sum(pos)/-sum(neg))**(1/(len(flows)-1)) - 1

def sln(cost, salvage, life):
    cost = _to_float(cost); salvage = _to_float(salvage); life = _to_float(life)
    if life == 0:
        return 0.0
    return (cost - salvage) / life

def syd(cost, salvage, life, period):
    cost = _to_float(cost); salvage = _to_float(salvage); life = int(life); period = int(period)
    if period < 1 or period > life:
        return 0.0
    denom = life * (life + 1) / 2
    return (life - period + 1) / denom * (cost - salvage)

# ------------------------------------------------------------
# Mathematical helpers / wrappers
# ------------------------------------------------------------
def atn(x): return math.atan(_to_float(x))
def cos(x): return math.cos(_to_float(x))
def exp(x): return math.exp(_to_float(x))
def fix(x):
    x = _to_float(x)
    return math.trunc(x)
def int_(x):  # avoid shadowing built-in int
    return int(_to_float(x))
def log(x, base=math.e):
    x = _to_float(x)
    return math.log(x, base)
def rnd(): return random.random()
def sgn(x):
    x = _to_float(x)
    return 1 if x > 0 else (-1 if x < 0 else 0)
def sin(x): return math.sin(_to_float(x))
def sqr(x): return math.sqrt(_to_float(x))
def tan(x): return math.tan(_to_float(x))
def avg(seq):
    try:
        return _stat_mean([_to_float(v) for v in seq])
    except Exception:
        return 0.0
# Provide aliases matching requested names even if Python built-ins exist
_builtin_abs = abs; _builtin_min = min; _builtin_max = max; _builtin_round = round
def abs_(x): return _builtin_abs(_to_float(x))
def min_(*args): return _builtin_min(*args)
def max_(*args): return _builtin_max(*args)
def round_(x, n=0): return _builtin_round(_to_float(x), int(n))

# Additional generic helpers to avoid grammar reserved lowercase tokens (avg, min, max, sum, mean, count)
def average(seq):
    return avg(seq)
def count(seq):
    try:
        return len(seq)
    except Exception:
        return 0

# Uppercase aliases (parser treats uppercase names as ID, while lowercase are reserved tokens in grammar)
def AVG(seq): return avg(seq)
def MIN(*args): return min_(*args)
def MAX(*args): return max_(*args)
def SUM(seq):
    try: return sum(seq)
    except Exception: return 0
def MEAN(seq): return avg(seq)
def COUNT(seq): return count(seq)

# ------------------------------------------------------------
# Date / Time helpers
# ------------------------------------------------------------
_MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"]

def _parse_date(val):
    if isinstance(val, (datetime.date, datetime.datetime)):
        return val
    if isinstance(val, str):
        for fmt in ("%Y-%m-%d","%Y/%m/%d","%d-%m-%Y","%d/%m/%Y","%Y-%m-%d %H:%M:%S","%Y/%m/%d %H:%M:%S"):
            try:
                return datetime.datetime.strptime(val, fmt)
            except Exception:
                continue
    return None

def cdate(val): return _parse_date(val)
def cvdate(val): return _parse_date(val)
def date(): return datetime.date.today()
def now(): return datetime.datetime.now()
def time(): return datetime.datetime.now().time()
def dateadd(interval, number, dt):
    dt = _parse_date(dt) or datetime.datetime.now()
    number = int(number)
    if interval in ('yyyy','y','year'): return dt + datetime.timedelta(days=365*number)
    if interval in ('m','month'):  # naive month add
        month = dt.month - 1 + number
        year = dt.year + month // 12
        month = month % 12 + 1
        day = min(dt.day, [31,29 if year%4==0 and (year%100!=0 or year%400==0) else 28,31,30,31,30,31,31,30,31,30,31][month-1])
        return dt.replace(year=year, month=month, day=day)
    if interval in ('d','day','yday'): return dt + datetime.timedelta(days=number)
    if interval in ('h','hour'): return dt + datetime.timedelta(hours=number)
    if interval in ('n','min','minute'): return dt + datetime.timedelta(minutes=number)
    if interval in ('s','sec','second'): return dt + datetime.timedelta(seconds=number)
    return dt
def datediff(interval, start, end):
    s = _parse_date(start); e = _parse_date(end)
    if not s or not e: return None
    delta = e - s
    if interval in ('d','day'): return delta.days
    if interval in ('s','sec','second'): return int(delta.total_seconds())
    if interval in ('h','hour'): return int(delta.total_seconds()//3600)
    if interval in ('n','min','minute'): return int(delta.total_seconds()//60)
    if interval in ('m','month'): return (e.year - s.year)*12 + (e.month - s.month)
    if interval in ('yyyy','y','year'): return e.year - s.year
    return delta.days
def datepart(part, dt):
    dt = _parse_date(dt) or datetime.datetime.now()
    mapping = {
        'yyyy': dt.year,
        'y': dt.year,
        'year': dt.year,
        'm': dt.month,
        'month': dt.month,
        'd': dt.day,
        'day': dt.day,
        'h': dt.hour,
        'hour': dt.hour,
        'n': dt.minute,
        'minute': dt.minute,
        's': dt.second,
        'second': dt.second,
        'w': dt.isoweekday(),
    }
    return mapping.get(part, None)
def dateSerial(year, month, day):
    return datetime.date(int(year), int(month), int(day))
def DateValue(val): return cdate(val)
def day(dt):
    dt = _parse_date(dt) or datetime.datetime.now()
    return dt.day
def hour(dt):
    dt = _parse_date(dt) or datetime.datetime.now()
    return dt.hour
def minute(dt):
    dt = _parse_date(dt) or datetime.datetime.now()
    return dt.minute
def month(dt):
    dt = _parse_date(dt) or datetime.datetime.now()
    return dt.month
def monthname(m):
    m = int(m)
    if 1 <= m <= 12: return _MONTH_NAMES[m-1]
    return ''
def second(dt):
    dt = _parse_date(dt) or datetime.datetime.now()
    return dt.second
def timeserial(h, m, s):
    return datetime.time(int(h), int(m), int(s))
def timevalue(val):
    d = _parse_date(val)
    if isinstance(d, datetime.datetime): return d.time()
    return None
def weekday(dt):
    dt = _parse_date(dt) or datetime.datetime.now()
    # VBA: Sunday=1 ... Saturday=7 ; Python isoweekday Monday=1
    wd = (dt.isoweekday() % 7) + 1
    return wd
def weekdayname(wd):
    names = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]
    wd = int(wd)
    if 1 <= wd <= 7: return names[wd-1]
    return ''
# alias for potential typo
def weekdaynme(wd): return weekdayname(wd)
def year(dt):
    dt = _parse_date(dt) or datetime.datetime.now()
    return dt.year
def isdate(val):
    return _parse_date(val) is not None

# ------------------------------------------------------------
# Checking / type predicates
# ------------------------------------------------------------
def isarray(val): return isinstance(val, (list, tuple))
def isempty(val):
    return val is None or (hasattr(val, '__len__') and len(val) == 0)
def iserror(val):
    return isinstance(val, BaseException)
def ismissing(val):
    return val is None
def isnull(val):
    return val is None
def isnumeric(val):
    try:
        float(val)
        return True
    except Exception:
        return False
def isobject(val):
    # In Python almost everything is an object; treat primitives differently if desired
    return hasattr(val, '__dict__')
def typename(val):
    return type(val).__name__
def vartype(val):
    # Simplified variant-style codes (string labels)
    if val is None: return 'Null'
    if isinstance(val, bool): return 'Boolean'
    if isinstance(val, (int, float)): return 'Number'
    if isinstance(val, str): return 'String'
    if isinstance(val, (list, tuple, set)): return 'Array'
    return 'Object'

# ------------------------------------------------------------
# Text helpers
# ------------------------------------------------------------
def asc(s):
    if not s: return 0
    return ord(str(s)[0])
def chr_(code):
    try: return chr(int(code))
    except Exception: return ''
def format_(val, fmt):
    # Simple handling: if datetime/date use strftime; else use format
    if isinstance(val, (datetime.datetime, datetime.date)):
        return val.strftime(fmt)
    try:
        return ("{:" + fmt + "}").format(val)
    except Exception:
        return str(val)
def instr(start, string, substring):
    if substring == '': return 1
    pos = str(string).find(str(substring), int(start)-1 if start else 0)
    return pos + 1 if pos >= 0 else 0
def lowecase(s): return str(s).lower()  # misspelled alias retained
def lowercase(s): return str(s).lower()
def uppercase(s): return str(s).upper()
def left(s, n): return str(s)[:int(n)]
def right(s, n): return str(s)[-int(n):]
def len_(s):
    try:
        return len(s)
    except Exception:
        return 0
def replace_(s, old, new): return str(s).replace(str(old), str(new))
def reverse(s): return str(s)[::-1]
def trim(s): return str(s).strip()

# Provide alias names matching original list where Python built-ins differ
chr = chr_  # type: ignore
format = format_  # type: ignore
# NIE nadpisujemy wbudowanego len – dodajemy własne aliasy
Len = len_  # zachowaj funkcję DSL jako Len
LEN = len_  # opcjonalny wielkie litery alias
replace = replace_  # type: ignore
abs = abs_  # type: ignore
min = min_  # type: ignore
max = max_  # type: ignore
round = round_  # type: ignore

"""Runtime helpers + 'magic' output collection for interpreter UI."""

# --- Magic output accumulator (per-context proxy) ---
class _MagicResultsProxy:
    def __init__(self):
        self._var: _ctx.ContextVar[Optional[List[dict]]] = _ctx.ContextVar("ECON_EVAL_RESULTS", default=None)

    def _ensure(self) -> List[dict]:
        lst = self._var.get()
        if lst is None:
            lst = []
            self._var.set(lst)
        return lst

    # list-like api
    def append(self, rec: dict):
        self._ensure().append(rec)

    def clear(self):
        self._ensure().clear()

    def copy(self) -> List[dict]:
        return list(self._ensure())

    def __len__(self) -> int:
        return len(self._ensure())

    def __iter__(self):
        return iter(self._ensure())

    def __getitem__(self, i):
        return self._ensure()[i]


_EVAL_RESULTS: Any = _MagicResultsProxy()

def _reset_magic_results():
    _EVAL_RESULTS.clear()

def _append_result(rec: dict):
    _EVAL_RESULTS.append(rec)
    return rec

# Safe print (legacy) – nie kolekcjonuje automatycznie
import builtins as _builtins
def print(*args, sep=' ', end='\n'):
    _builtins.print(*args, sep=sep, end=end)

# Magic Print -> dodaje rekord typu text
def Print(*args, sep=' ', end='\n'):
    text = sep.join(map(str, args))
    return _append_result({'type': 'text', 'text': text})

def DisplayTable(data):
    """Zwraca strukturę tabeli w JSON (columns, rows). Akceptuje DataFrame, list[dict], list lub pojedynczą wartość."""
    columns: List[str] = []
    rows: List[dict] = []
    # Pandas DataFrame
    if pd is not None and hasattr(data, 'to_dict') and hasattr(data, 'columns'):
        try:
            columns = list(data.columns)
            # użyj orient='records' – mniej wrażliwe na nietypowy index / iloc błędy
            rows = data.to_dict(orient='records')  # type: ignore
        except Exception:
            columns = ['value']
            rows = [{'value': str(data)}]
    # Pandas Series
    elif pd is not None and 'Series' in str(type(data)):
        try:
            columns = ['value']
            rows = [{'value': v} for v in list(data)]
        except Exception:
            columns = ['value']
            rows = [{'value': str(data)}]
    # List of dict
    elif isinstance(data, list) and data and isinstance(data[0], dict):
        col_set = set()
        for r in data:
            col_set.update(r.keys())
        columns = sorted(col_set)
        rows = data
    # List of lists / tuples
    elif isinstance(data, list) and data and isinstance(data[0], (list, tuple)):
        width = max(len(r) for r in data)
        columns = [f'C{i}' for i in range(width)]
        for r in data:
            row = {f'C{i}': (r[i] if i < len(r) else None) for i in range(width)}
            rows.append(row)
    # Flat list
    elif isinstance(data, (list, tuple)):
        columns = ['value']
        rows = [{'value': v} for v in data]
    else:
        columns = ['value']
        rows = [{'value': data}]
    return _append_result({'type': 'table', 'columns': columns, 'rows': rows})

def DisplayChart(data, chartType: Optional[str] = None):
    """Zbiera dane do prostego wykresu (domyślnie line). data może być: DataFrame, Series, list, dict."""
    chartType = chartType or 'line'
    payload: dict[str, Any]
    if pd is not None and 'DataFrame' in str(type(data)):
        # reprezentuj jako {series: {col: [..]}}
        try:
            payload = { 'series': {col: list(data[col]) for col in data.columns} }
        except Exception:
            payload = { 'series': {'value': str(data)} }
    elif pd is not None and 'Series' in str(type(data)):
        try:
            payload = { 'series': {'value': list(data)} }
        except Exception:
            payload = { 'series': {'value': []} }
    elif isinstance(data, dict):
        payload = { 'series': {k: (list(v) if isinstance(v, (list, tuple)) else v) for k, v in data.items()} }
    elif isinstance(data, (list, tuple)):
        payload = { 'series': {'value': list(data)} }
    else:
        payload = { 'series': {'value': [data]} }
    return _append_result({'type': 'chart', 'chartType': chartType, 'data': payload})







def CreateDF(*a):
    import pandas as pd
    if not a:
        return pd.DataFrame()
    pair = (len(a) % 2 == 0) and all(isinstance(n, str) for n in a[1::2])
    if pair:
        return pd.concat([
            ((x.iloc[:,0] if isinstance(x, pd.DataFrame) else (x if isinstance(x, pd.Series) else pd.Series(x))).rename(n))
            for x, n in zip(a[0::2], a[1::2])
        ], axis=1)
    return pd.concat([
        (x.reset_index(drop=True) if isinstance(x, pd.DataFrame) else
         (x.to_frame() if isinstance(x, pd.Series) else pd.Series(x).to_frame()))
        for x in a
    ], axis=1)


    



# ------------------------------------------------------------
# Economic & Statistical helpers
# ------------------------------------------------------------
def _to_iter(seq):
    if pd is not None and isinstance(seq, (pd.Series, pd.DataFrame)):
        if isinstance(seq, pd.DataFrame):
            if seq.shape[1] == 1:
                return seq.iloc[:,0]
            raise ValueError("DataFrame must have exactly one column for this operation")
        return seq
    return list(seq)

def simple_returns(series):
    s = _to_iter(series)
    if pd is not None and hasattr(s, 'pct_change'):
        return s.pct_change().dropna()
    out = []
    prev = None
    for v in s:
        if prev is not None and prev not in (0, None):
            out.append((v - prev)/prev)
        prev = v
    return out

def log_returns(series):
    s = _to_iter(series)
    if pd is not None and hasattr(s, 'shift'):
        import numpy as _np  # type: ignore
        return (_np.log(s / s.shift(1))).dropna()
    out = []
    import math as _m
    prev = None
    for v in s:
        if prev is not None and prev not in (0, None):
            out.append(math.log(v/prev))
        prev = v
    return out

def drawdown_series(series):
    s = _to_iter(series)
    if pd is not None and hasattr(s, 'cummax'):
        cummax = s.cummax()
        return (s - cummax) / cummax
    out = []
    max_so_far = None
    for v in s:
        if max_so_far is None or v > max_so_far:
            max_so_far = v
        out.append((v - max_so_far)/max_so_far if max_so_far not in (0,None) else 0)
    return out

def max_drawdown(series):
    dd = drawdown_series(series)
    if pd is not None and hasattr(dd, 'min'):
        return float(dd.min())
    return min(dd) if dd else 0.0

def cagr(series, periods_per_year=252):
    s = _to_iter(series)
    if len(s) < 2:
        return 0.0
    start = s[0]
    end = s[-1]
    if start in (0, None):
        return 0.0
    years = len(s)/periods_per_year
    return (end/start)**(1/years) - 1 if years > 0 else 0.0

def volatility(returns, periods_per_year=252):
    r = _to_iter(returns)
    if pd is not None and isinstance(r, pd.Series):
        return float(r.std() * math.sqrt(periods_per_year))
    import statistics
    if len(r) < 2:
        return 0.0
    return statistics.pstdev(r) * math.sqrt(periods_per_year)

def sharpe_ratio(returns, risk_free=0.0, periods_per_year=252):
    r = _to_iter(returns)
    if len(r) == 0:
        return 0.0
    if pd is not None and isinstance(r, pd.Series):
        excess = r - risk_free/periods_per_year
        sd = excess.std()
        if sd == 0 or math.isnan(sd):
            return 0.0
        return float((excess.mean() / sd) * math.sqrt(periods_per_year))
    import statistics
    excess = [v - risk_free/periods_per_year for v in r]
    sd = statistics.pstdev(excess) if len(excess) > 1 else 0
    if sd == 0:
        return 0.0
    return (sum(excess)/len(excess)) / sd * math.sqrt(periods_per_year)

def sortino_ratio(returns, risk_free=0.0, periods_per_year=252):
    r = _to_iter(returns)
    if len(r) == 0:
        return 0.0
    downside = [max(0.0, risk_free/periods_per_year - v) for v in r]
    import statistics
    dd = statistics.pstdev(downside) if len(downside) > 1 else 0
    if dd == 0:
        return 0.0
    avg = (sum(r)/len(r)) - risk_free/periods_per_year
    return avg / dd * math.sqrt(periods_per_year)

def beta(asset_returns, market_returns):
    ar = _to_iter(asset_returns)
    mr = _to_iter(market_returns)
    n = min(len(ar), len(mr))
    if n < 2:
        return 0.0
    ar = ar[-n:]; mr = mr[-n:]
    if pd is not None and isinstance(ar, pd.Series) and isinstance(mr, pd.Series):
        cov = ar.cov(mr)
        var = mr.var()
        return float(cov/var) if var else 0.0
    mean_ar = sum(ar)/n; mean_mr = sum(mr)/n
    cov = sum((ar[i]-mean_ar)*(mr[i]-mean_mr) for i in range(n))/n
    var = sum((mr[i]-mean_mr)**2 for i in range(n))/n
    return cov/var if var else 0.0

def alpha(asset_returns, market_returns, risk_free=0.0, periods_per_year=252):
    b = beta(asset_returns, market_returns)
    ar = _to_iter(asset_returns)
    mr = _to_iter(market_returns)
    if len(ar)==0 or len(mr)==0:
        return 0.0
    avg_ar = sum(ar)/len(ar)*periods_per_year
    avg_mr = sum(mr)/len(mr)*periods_per_year
    return (avg_ar - risk_free) - b*(avg_mr - risk_free)

def variance(seq):
    s = _to_iter(seq)
    import statistics
    return statistics.pvariance(s) if len(s) > 1 else 0.0
def var(seq): return variance(seq)

def median(seq):
    s = _to_iter(seq)
    import statistics
    return statistics.median(s) if s else 0.0

def quantile(seq, q):
    s = _to_iter(seq)
    # Avoid truthiness on pandas objects; rely on length instead.
    try:
        length = len(s)
    except Exception:
        length = 0
    if not 0 <= q <= 1 or length == 0:
        return 0.0
    if pd is not None and isinstance(s, pd.Series):
        return float(s.quantile(q))
    s_sorted = sorted(s)
    pos = q*(len(s_sorted)-1)
    lo = int(math.floor(pos)); hi = int(math.ceil(pos))
    if lo == hi:
        return s_sorted[lo]
    frac = pos - lo
    return s_sorted[lo]*(1-frac) + s_sorted[hi]*frac

def covariance(a, b):
    a = _to_iter(a); b = _to_iter(b)
    n = min(len(a), len(b))
    if n < 2: return 0.0
    a = a[:n]; b = b[:n]
    mean_a = sum(a)/n; mean_b = sum(b)/n
    return sum((a[i]-mean_a)*(b[i]-mean_b) for i in range(n))/n

def correlation(a, b):
    cov = covariance(a, b)
    import math as _m
    a = _to_iter(a); b = _to_iter(b)
    if len(a) < 2 or len(b) < 2:
        return 0.0
    import statistics
    sa = statistics.pstdev(a) if len(a)>1 else 0
    sb = statistics.pstdev(b) if len(b)>1 else 0
    if sa == 0 or sb == 0:
        return 0.0
    return cov/(sa*sb)

def skewness(seq):
    s = _to_iter(seq)
    n = len(s)
    if n < 3: return 0.0
    mean_s = sum(s)/n
    m2 = sum((x-mean_s)**2 for x in s)/n
    if m2 == 0: return 0.0
    m3 = sum((x-mean_s)**3 for x in s)/n
    return (m3 / (m2**1.5))

def kurtosis(seq):
    s = _to_iter(seq)
    n = len(s)
    if n < 4: return 0.0
    mean_s = sum(s)/n
    m2 = sum((x-mean_s)**2 for x in s)/n
    if m2 == 0: return 0.0
    m4 = sum((x-mean_s)**4 for x in s)/n
    return m4/(m2*m2) - 3  # excess kurtosis

def zscore(seq):
    s = _to_iter(seq)
    if not s: return []
    mean_s = sum(s)/len(s)
    import math as _m
    var = sum((x-mean_s)**2 for x in s)/len(s)
    if var == 0: return [0 for _ in s]
    sd = math.sqrt(var)
    return [(x-mean_s)/sd for x in s]

def normalize_minmax(seq):
    s = _to_iter(seq)
    if not s: return []
    lo = min(s); hi = max(s)
    if hi == lo:
        return [0 for _ in s]
    return [(x-lo)/(hi-lo) for x in s]

def value_at_risk(returns, level=0.95, method='historical'):
    r = _to_iter(returns)
    try:
        length = len(r)
    except Exception:
        length = 0
    if length == 0:
        return 0.0
    if method == 'historical':
        if pd is not None and isinstance(r, pd.Series):
            return float(r.quantile(1-level))
        rs = sorted(r)
        idx = int((1-level)*len(rs))
        return rs[idx]
    # normal approximation
    import statistics, math
    mu = sum(r)/len(r)
    sd = statistics.pstdev(r) if len(r)>1 else 0
    if sd == 0: return 0.0
    # inverse CDF (approx) using scipy not available -> simple z for common levels
    z_map = {0.90:1.2816,0.95:1.6449,0.975:1.96,0.99:2.3263}
    z = z_map.get(level, 1.6449)
    return mu - z*sd

def expected_shortfall(returns, level=0.95):
    r = _to_iter(returns)
    try:
        length = len(r)
    except Exception:
        length = 0
    if length == 0:
        return 0.0
    if pd is not None and isinstance(r, pd.Series):
        cutoff = r.quantile(1-level)
        tail = r[r <= cutoff]
        return float(tail.mean()) if len(tail)>0 else 0.0
    rs = sorted(r)
    cutoff_index = int((1-level)*len(rs))
    tail = rs[:cutoff_index+1]
    return sum(tail)/len(tail) if tail else 0.0



# ------------------------------------------------------------
# DB-backed helpers: user models access
# ------------------------------------------------------------
try:
    # Reuse the existing DB connection helper (module-level fallback)
    from db import _connect as _db_connect  # type: ignore
except Exception:  # pragma: no cover
    _db_connect = None  # type: ignore


def set_db_connect(connect_callable):
    """Set a DB connect() provider for the current context.

    Accepts a zero-arg callable returning a DB connection. Safe for concurrency.
    """
    _CTX_DB_CONNECT.set(connect_callable)


class UserModels:
    """Convenience helper bound to a specific user.

    Usage:
        um = UserModels(user_id)
        df_pred = um.ModelPredictions("MyModel")
        df_data = um.ModelData("MyModel")
    """

    def __init__(self, user_id: str):
        self.user_id = str(user_id)

    # internal: find model id by user and name
    def _find_model_id(self, modelname: str) -> Optional[str]:
        dbc = _CTX_DB_CONNECT.get() or _db_connect
        if dbc is None:
            return None
        sql = (
            "SELECT id FROM model WHERE ownerId=%s AND name=%s "
            "ORDER BY updatedAt DESC, createdAt DESC LIMIT 1"
        )
        try:
            with dbc() as conn:
                with conn.cursor() as cur:
                    cur.execute(sql, (self.user_id, modelname))
                    row = cur.fetchone()
                    if row:
                        # row may be tuple or dict
                        return row[0] if not isinstance(row, dict) else row.get("id")
        except Exception:
            return None
        return None

    def ModelPredictions(self, modelname: str):
        """Return latest prediction payload as a pandas DataFrame (if pandas is available).

        Reads prediction.payloadJson (JSON with key 'predictions': list[dict]) for the
        latest prediction on the user's model with the given name.
        """
        mid = self._find_model_id(modelname)
        if not mid:
            return pd.DataFrame() if pd is not None else []
        dbc = _CTX_DB_CONNECT.get() or _db_connect
        if dbc is None:
            return pd.DataFrame() if pd is not None else []
        sql = (
            "SELECT payloadJson FROM prediction WHERE modelId=%s "
            "ORDER BY createdAt DESC LIMIT 1"
        )
        payload = None
        try:
            with dbc() as conn:
                with conn.cursor() as cur:
                    cur.execute(sql, (mid,))
                    row = cur.fetchone()
                    if row:
                        payload = row[0] if not isinstance(row, dict) else row.get("payloadJson")
        except Exception:
            payload = None
        try:
            data = _json.loads(payload) if isinstance(payload, (str, bytes, bytearray)) else None
        except Exception:
            data = None
        preds = []
        if isinstance(data, dict) and isinstance(data.get("predictions"), list):
            preds = data["predictions"]
        if pd is not None:
            try:
                return pd.DataFrame(preds)
            except Exception:
                return pd.DataFrame()
        return preds

    def ModelData(self, modelname: str):
        """Return latest data import (CSV) as a pandas DataFrame if available.

        Reads dataimport.dataBlob (CSV stored as blob) for the latest import of the
        user's model with the given name.
        """
        mid = self._find_model_id(modelname)
        if not mid:
            return pd.DataFrame() if pd is not None else []
        dbc = _CTX_DB_CONNECT.get() or _db_connect
        if dbc is None:
            return pd.DataFrame() if pd is not None else []
        sql = (
            "SELECT dataBlob FROM dataimport WHERE modelId=%s AND dataBlob IS NOT NULL "
            "ORDER BY createdAt DESC, finishedAt DESC LIMIT 1"
        )
        blob = None
        try:
            with dbc() as conn:
                with conn.cursor() as cur:
                    cur.execute(sql, (mid,))
                    row = cur.fetchone()
                    if row:
                        blob = row[0] if not isinstance(row, dict) else row.get("dataBlob")
        except Exception:
            blob = None
        if blob is None:
            return pd.DataFrame() if pd is not None else []
        # Parse CSV
        try:
            if isinstance(blob, (bytes, bytearray)):
                if pd is not None:
                    return pd.read_csv(_io.BytesIO(blob))
                else:
                    import csv as _csv
                    text = blob.decode("utf-8", errors="replace")
                    reader = _csv.DictReader(text.splitlines())
                    return [dict(r) for r in reader]
            else:
                # Some drivers may return str
                text = str(blob)
                if pd is not None:
                    return pd.read_csv(_io.StringIO(text))
                import csv as _csv
                reader = _csv.DictReader(text.splitlines())
                return [dict(r) for r in reader]
        except Exception:
            return pd.DataFrame() if pd is not None else []

    def getWidget(self, widgetid: str):
        """Execute Python stored in widget.content2 for this user and return collected results.

        Returns a list of result records like those produced by Print/DisplayTable/DisplayChart.
        """
        dbc = _CTX_DB_CONNECT.get() or _db_connect
        if dbc is None:
            return []
        sql = (
            "SELECT content2 FROM widget WHERE id=%s AND userId=%s "
            "ORDER BY updatedAt DESC, createdAt DESC LIMIT 1"
        )
        code = None
        try:
            with dbc() as conn:
                with conn.cursor() as cur:
                    cur.execute(sql, (widgetid, self.user_id))
                    row = cur.fetchone()
                    if row:
                        code = row[0] if not isinstance(row, dict) else row.get("content2")
        except Exception:
            code = None
        if not code:
            return []
        # Prepare execution context
        try:
            # Don't reset global results; preserve outer Display*/Print outputs.
            _start_idx = len(_EVAL_RESULTS)
            glb: dict[str, Any] = {k: globals()[k] for k in globals().keys() if not k.startswith('_') or k in ("__builtins__",)}
            # Import user module and merge symbols
            try:
                from importlib import import_module
                base = str(self.user_id).strip()
                if base.endswith('.py'):
                    base = base[:-3]
                base = base.replace('/', '').replace('\\', '')
                if not base.startswith('user_'):
                    base = 'user_' + base
                mod = import_module(f"users.{base}")
                for name in dir(mod):
                    if not name.startswith('_'):
                        glb[name] = getattr(mod, name)
            except Exception:
                pass
            compiled = compile(code, f"<widget {widgetid}>", "exec")
            loc: dict[str, Any] = {}
            exec(compiled, glb, loc)
            # Return only results produced by this widget code
            return _EVAL_RESULTS[_start_idx:].copy()
        except Exception as e:
            return [{"type": "text", "text": f"error: {e}"}]

def ModelPredictions(modelname: str):
    uid = get_current_user()
    if not uid:
        return pd.DataFrame() if pd is not None else []
    return UserModels(uid).ModelPredictions(modelname)

def ModelData(modelname: str):
    uid = get_current_user()
    if not uid:
        return pd.DataFrame() if pd is not None else []
    return UserModels(uid).ModelData(modelname)

def GetWidget(widgetid: str):
    uid = get_current_user()
    if not uid:
        return []
    return UserModels(uid).getWidget(widgetid)

def Value(df):
    if df.shape == (1, 1):
        return df.iloc[0, 0]
    else:
        raise ValueError("DataFrame musi mieć dokładnie jeden wiersz i jedną kolumnę.")

__all__ = [name for name in globals().keys() if not name.startswith('_')]
# Ensure helpers expected by transpiled code are exported even if they start with
# an underscore-like name. Transpiler emits calls to `__rows(...)`, and many
# generated modules do `from econ_runtime import *`, so include __rows here.
if '__rows' not in __all__:
    __all__.append('__rows')