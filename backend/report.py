import numpy as _np
import io
import datetime
import contextlib
from typing import Dict, Any, List, Tuple, Optional, Callable
import econ_runtime as _econ_rt
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from smtp import wyslij_mail
from db import fetch_report, fetch_user
from scheduler_utils import ensure_user_file
from html import escape
import pandas as pd

def get_html_table(res: dict) -> str:
    columns = list(res.get('columns') or [])
    rows = res.get('rows') or []
    if not columns and rows and isinstance(rows, list) and isinstance(rows[0], dict):
        all_keys = set()
        for row in rows:
            all_keys.update(row.keys())
        columns = sorted(all_keys)
    MAX_ROWS = 200
    display_rows = rows[:MAX_ROWS]
    header_html = ''.join(
        f'<th style="padding:4px 8px;border:1px solid #ccc;background:#f5f5f5">{escape(str(c))}</th>'
        for c in columns)
    body_rows = []
    for row in display_rows:
        body_cells = ''.join(
            f'<td style="padding:4px 8px;border:1px solid #ddd">{escape(str(row.get(col, "")))}</td>'
            for col in columns)
        body_rows.append(f'<tr>{body_cells}</tr>')
    more = ''
    if len(rows) > MAX_ROWS:
        more = f'<caption style="caption-side:bottom;font-size:12px;color:#666">(obcięto {len(rows)-MAX_ROWS} wierszy)</caption>'
    return (
        f'<table style="border-collapse:collapse;margin:8px 0;font-family:Arial,sans-serif;font-size:13px">'
        f'{more}<thead><tr>{header_html}</tr></thead><tbody>{"".join(body_rows)}</tbody></table>')

def to_numeric_list(input_data) -> List[float]:
    if isinstance(input_data, dict):
        input_data = list(input_data.values())
    elif not isinstance(input_data, (list, tuple)):
        input_data = [input_data]
    return [float(x) for x in pd.to_numeric(input_data, errors='coerce') if pd.notna(x)]

def expand_series(input_series: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(input_series, dict) or not input_series:
        return {}
    try:
        if len(input_series) == 1:
            single_column_name, nested_list = next(iter(input_series.items()))
            if isinstance(nested_list, list) and nested_list and isinstance(nested_list[0], dict):
                all_keys = set()
                for row in nested_list:
                    all_keys.update(row.keys())
                expanded_series: Dict[str, Any] = {}
                for key in sorted(all_keys):
                    column_values = [row.get(key) for row in nested_list]
                    expanded_series[key] = column_values
                return expanded_series
            return dict(input_series)
        result: Dict[str, Any] = {}
        was_expanded = False
        for column_name, values in input_series.items():
            if isinstance(values, list) and values and isinstance(values[0], dict):
                nested_keys = set()
                for row in values:
                    nested_keys.update(row.keys())
                for nested_key in sorted(nested_keys):
                    result[f"{column_name}.{nested_key}"] = [row.get(nested_key) for row in values]
                was_expanded = True
            else:
                result[column_name] = values
        return result if was_expanded else dict(input_series)
    except Exception:
        return dict(input_series)

def render_line_or_area_chart(ax, data_series: Dict[str, Any], max_points: int, chart_type: str) -> None:
    for series_name, values in data_series.items():
        numeric_values = to_numeric_list(values)[:max_points]
        ax.plot(range(len(numeric_values)), numeric_values, label=str(series_name))
        if chart_type == 'area':
            ax.fill_between(range(len(numeric_values)), numeric_values, alpha=0.25)

def render_bar_chart(ax, data_series: Dict[str, Any], max_points: int) -> None:
    series_names = list(data_series.keys())
    values_lists: List[List[float]] = []
    max_length = 0
    for raw_values in data_series.values():
        numeric_values = to_numeric_list(raw_values)
        numeric_values = numeric_values[:max_points]
        values_lists.append(numeric_values)
        max_length = max(max_length, len(numeric_values))
    positions = _np.arange(max_length)
    bar_width = 0.8 / max(1, len(values_lists))
    for series_index, numeric_values in enumerate(values_lists):
        ax.bar(positions + series_index*bar_width, numeric_values + [0]*(max_length-len(numeric_values)), width=bar_width, label=series_names[series_index])

def render_pie_chart(ax, data_series: Dict[str, Any]) -> None:
    series_name, raw_values = next(iter(data_series.items()))
    numeric_values = to_numeric_list(raw_values)
    labels = [f'{series_name}_{i}' for i in range(len(numeric_values))]
    ax.pie(numeric_values, labels=labels, autopct='%1.0f%%')

def render_scatter_chart(ax, data_series: Dict[str, Any], max_points: int) -> None:
    for series_name, raw_values in data_series.items():
        numeric_values = to_numeric_list(raw_values)
        x_positions = list(range(len(numeric_values)))
        ax.scatter(x_positions[:max_points], numeric_values[:max_points], label=str(series_name), s=12)

def render_default_chart(ax, data_series: Dict[str, Any], max_points: int) -> None:
    for series_name, raw_values in data_series.items():
        numeric_values = to_numeric_list(raw_values)[:max_points]
        ax.plot(range(len(numeric_values)), numeric_values, label=str(series_name))

def get_html_chart(res: dict, inline_images: List[Tuple[str, bytes, str]]) -> str:
    chart_type = (res.get('chartType') or 'line').lower()
    data = res.get('data') or {}
    series = data.get('series') if isinstance(data, dict) else {}
    if not isinstance(series, dict) or not series:
        return '<div>(pusta seria)</div>'
    series = expand_series(series)

    MAX_POINTS = 500
    fig, ax = plt.subplots(figsize=(6, 3.2), dpi=120)
    try:
        if chart_type in ('line', 'area'):
            render_line_or_area_chart(ax, series, MAX_POINTS, chart_type)
        elif chart_type == 'bar':
            render_bar_chart(ax, series, MAX_POINTS)
        elif chart_type == 'pie':
            render_pie_chart(ax, series)
        elif chart_type == 'scatter':
            render_scatter_chart(ax, series, MAX_POINTS)
        else:
            render_default_chart(ax, series, MAX_POINTS)

        ax.set_title(f"{chart_type.capitalize()} chart")
        if len(series) > 1 and chart_type != 'pie':
            ax.legend(fontsize=8, loc='best')
        ax.grid(alpha=0.3, linestyle='--', linewidth=0.5)
        fig.tight_layout()

        buf = io.BytesIO()
        fig.savefig(buf, format='png')
        plt.close(fig)
        buf.seek(0)
        png_bytes = buf.read()
        cid = f'chart{len(inline_images)+1}'
        inline_images.append((cid, png_bytes, 'image/png'))
        return f'<div style="margin:6px 0"><img alt="chart" style="max-width:100%;border:1px solid #ddd" src="cid:{cid}"/></div>'
    except Exception as e:
        try:
            plt.close(fig)
        except Exception:
            pass
        return f'<div style="color:#b00">Błąd renderowania wykresu: {escape(str(e))}</div>'


def run_report_job(
    report_id: str,
    update_run_times_fn: Callable[[str, datetime.datetime, Optional[datetime.datetime]], None],
    utc: datetime.tzinfo,
):
    """Generuje i wysyła raport dla danego report_id."""
    report = fetch_report(report_id)
    if (not report) or (not report.get('enabled')):
        return

    user_id = report.get('userId')
    try:
        ensure_user_file(user_id)
        import importlib, sys
        importlib.invalidate_caches()
        modname = f"users.{user_id}"
        if modname in sys.modules:
            del sys.modules[modname]
        try:
            mod = importlib.import_module(modname)
        except Exception:
            mod = None
    except Exception:
        mod = None
   

    condition_code = report.get('conditionFormula2') or ''
    message_code = report.get('messageTemplate2') or ''
    allowed = True

    glb = {}
    loc: Dict[str, Any] = {}

    output_buffer = io.StringIO()
    try:
        if user_id and 'mod' in locals() and mod is not None:
            for name in dir(mod):
                if not name.startswith('_'):
                    glb[name] = getattr(mod, name)
    except Exception:
        pass

    if hasattr(_econ_rt, '_reset_magic_results'):
        try:
            _econ_rt._reset_magic_results() 
        except Exception:
            pass

    try:
        with contextlib.redirect_stdout(output_buffer):
            if condition_code.strip():
                exec(compile(condition_code, '<condition>', 'exec'), glb, loc)
                fn = loc.get('onSent') or glb.get('onSent')
                if callable(fn):
                    try:
                        allowed = bool(fn())
                    except Exception:
                        allowed = False
            if allowed and message_code.strip():
                exec(compile(message_code, '<message>', 'exec'), glb, loc)
    except Exception as e:
        output_buffer.write(f'Błąd wykonania: {e}\n')

    raw_stdout = output_buffer.getvalue().strip()
    results: List[dict] = getattr(_econ_rt, '_EVAL_RESULTS', []) 

    text_magic_parts: List[str] = []
    html_sections: List[str] = []

    inline_images: List[Tuple[str, bytes, str]] = []

    for widget in results:
        widget_type = widget.get('type')
        if widget_type == 'text':
            txt = str(widget.get('text', '')).strip()
            if txt:
                text_magic_parts.append(txt)
                html_sections.append(f'<pre>{escape(txt)}</pre>')
        elif widget_type == 'table':
            text_magic_parts.append("[tabela]")
            try:
                html_sections.append(get_html_table(widget))
            except Exception as e:
                html_sections.append(f'<div style="color:#b00">Błąd tabeli: {escape(str(e))}</div>')
        elif widget_type == 'chart':
            text_magic_parts.append("[wykres]")
            try:
                html_sections.append(get_html_chart(widget, inline_images))
            except Exception as e:
                html_sections.append(f'<div style="color:#b00">Błąd wykresu: {escape(str(e))}</div>')

    text_sections: List[str] = []
    if raw_stdout:
        text_sections.append( raw_stdout)
    if text_magic_parts:
        text_sections.append('\n\n'.join(text_magic_parts))
    body_text = ('\n\n'.join(text_sections)).strip() or '(brak treści)'

    html_wrapper_parts: List[str] = []
    if raw_stdout:
        html_wrapper_parts.append(f'<pre>{escape(raw_stdout)}</pre>')
    if html_sections:
        html_wrapper_parts.extend(html_sections)
    body_html = ("<html><head><meta charset='utf-8'></head><body style='font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222'>" + '\n'.join(html_wrapper_parts) + '</body></html>')

    body = body_html if html_sections or raw_stdout else body_text

    user = fetch_user(report.get('userId'))
    recipient = user.get('email')

    if allowed and recipient:
        try:
            imgs_payload = [ {'cid': cid, 'content': content, 'mime': mime} for cid, content, mime in inline_images ] if inline_images else None
            wyslij_mail(recipient, report.get('name', f'Raport {report_id}'), body, inline_images=imgs_payload)
        except Exception:
            pass

    now = datetime.datetime.now(utc)
    update_run_times_fn(report_id, now, None)
