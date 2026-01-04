import datetime
import sys
from typing import Optional, Dict, Any
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from fastapi import HTTPException
import report 
import data_processing as dp
import os
from db import (
    fetch_models_by_user,
    fetch_report,
    fetch_enabled_reports,
    fetch_reports_by_user,
    update_run_times,
    fetch_active_datafeeds,
    fetch_datafeeds_by_model,
    delete_user_data,
)

UNITS_MAP = {
    's': 'seconds',
    'sec': 'seconds',
    'second': 'seconds',
    'm': 'minutes',
    'min': 'minutes',
    'h': 'hours',
    'd': 'days'
}

scheduler: Optional[AsyncIOScheduler] = None
UTC = datetime.timezone.utc


def _submit_job(job_id: str, func, interval_kwargs: Dict[str, int], start_at: datetime.datetime, args: Optional[list] = None):
    if not scheduler:
        return
    scheduler.add_job( func,
        trigger=IntervalTrigger(timezone=UTC, **interval_kwargs),
        id=job_id, replace_existing=True,
        args=args or [], next_run_time=start_at,
        coalesce=True, misfire_grace_time=None)

def schedule_record(rec: Dict[str, Any]):
    if not scheduler or not rec.get('enabled'):
        return

    interval_kwargs = _interval_kwargs_from_frequency(rec)
    if not interval_kwargs:
        return

    report_id = rec['id']
    start_at = _parse_iso(rec.get('nextRunAt')) or _parse_iso(rec.get('lastRunAt')) or datetime.datetime.now(UTC)

    _submit_job( job_id=report_id, func=report.run_report_job,
        interval_kwargs=interval_kwargs, start_at=start_at,
        args=[report_id, update_run_times, UTC])

def _parse_iso(dt_str: Optional[str]) -> Optional[datetime.datetime]:
    """Parse ISO string with Z -> UTC, add timezone if missing."""
    if not dt_str:
        return None
    try:
        dt = datetime.datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
        if dt.tzinfo is None:
            return dt.replace(tzinfo=UTC)
        return dt
    except Exception:
        return None


def _interval_kwargs_from_frequency(rec: Dict[str, Any]) -> Optional[Dict[str, int]]:
    fv = rec.get('frequencyValue')
    fu = rec.get('frequencyUnit')
    if fv is None or not fu:
        return None
    try:
        fv = int(fv)
    except (ValueError, TypeError):
        return None
    unit = UNITS_MAP.get(str(fu).lower())
    if not unit:
        return None
    return {unit: fv}



def init_scheduler():
    global scheduler
    if scheduler is None:
        scheduler = AsyncIOScheduler(timezone=UTC)
        scheduler.start()
        for rec in fetch_enabled_reports():
            schedule_record(rec)

def remove_job(job_id: str):
    if scheduler:
        try:
            scheduler.remove_job(job_id)
        except Exception:
            pass
def _interval_kwargs_from_spec(spec: Optional[str]) -> Optional[Dict[str, int]]:
    """Parsuje zapis interwału (np. '15m', '1h', '2d', '30s' lub '15min') do argumentów IntervalTrigger."""
    if not spec:
        return None
    try:
        import re
        m = re.fullmatch(r"\s*(\d+)\s*([a-z]+)\s*", spec.strip().lower())
        if not m:
            return None
        unit = UNITS_MAP.get(m.group(2))
        return {unit: int(m.group(1))} if unit else None
    except Exception:
        return None
    
def schedule_single_from_db(report_id: str):
    rec = fetch_report(report_id)
    if not rec:
        return {"status": "not_found", "id": report_id}
    if not rec.get('enabled'):
        if scheduler:
            try:
                scheduler.remove_job(report_id)
            except Exception:
                pass
        return {"status": "disabled", "id": report_id}
    schedule_record(rec)
    return {"status": "scheduled", "id": report_id}

def schedule_datafeed_record(rec: Dict[str, Any]):
    if not scheduler:
        return
    if not rec.get('active'):
        return
    feed_id = rec['id']
    interval_kwargs = _interval_kwargs_from_spec(rec.get('intervalSpec'))
    if not interval_kwargs:
        return

    start_at = _parse_iso(rec.get('nextRunAt')) or _parse_iso(rec.get('lastRunAt')) or datetime.datetime.now(UTC)

    _submit_job(
        job_id=f'datafeed:{feed_id}',
        func=dp.run_datafeed_job,
        interval_kwargs=interval_kwargs,
        start_at=start_at,
        args=[feed_id],
    )

def init_datafeeds_scheduler():
    for rec in fetch_active_datafeeds():
        schedule_datafeed_record(rec)

def schedule_prediction_jobs_for_model(model_id: str) -> Dict[str, Any]:
    feeds = fetch_datafeeds_by_model(model_id)
    if not feeds:
        return {"status": "no_datafeeds", "modelId": model_id}
    scheduled = []
    for rec in feeds:
        if rec.get('active'):
            schedule_datafeed_record(rec)
            scheduled.append(rec['id'])
    return {"status": "scheduled", "modelId": model_id, "feedIds": scheduled}

def remove_prediction_jobs_for_model(model_id: str) -> Dict[str, Any]:
    feeds = fetch_datafeeds_by_model(model_id)
    removed = []
    if scheduler:
        for rec in feeds:
            job_id = f"datafeed:{rec['id']}"
            try:
                scheduler.remove_job(job_id)
                removed.append(job_id)
            except Exception:
                pass
    return {"status": "removed", "modelId": model_id, "jobIds": removed}


def sync_prediction_jobs_for_model(model_id: str) -> Dict[str, Any]:
    """Aktualizuje zadania w schedulerze zgodnie z DB dla danego modelu.
    Dla feedów active=1 planuje zadania; dla inactive usuwa je.
    """
    feeds = fetch_datafeeds_by_model(model_id)
    if not feeds:
        return {"status": "no_datafeeds", "modelId": model_id, "scheduled": [], "removed": []}
    scheduled, removed = [], []
    if scheduler:
        for rec in feeds:
            fid = rec['id']
            job_id = f"datafeed:{fid}"
            if rec.get('active'):
                schedule_datafeed_record(rec)
                scheduled.append(fid)
            else:
                try:
                    scheduler.remove_job(job_id)
                    removed.append(fid)
                except Exception:
                    pass
    return {"status": "ok", "modelId": model_id, "scheduled": scheduled, "removed": removed}

def delete_user(user_id: str):
    try:
        reports = fetch_reports_by_user(user_id)
        for report in reports:
            remove_job(report.get('id'))

        models = fetch_models_by_user(user_id)
        for model in models:
            remove_prediction_jobs_for_model(model.get('id'))

        users_dir = os.path.join(os.path.dirname(__file__), "users")
        user_file = os.path.join(users_dir, f"{user_id}.py")
        if os.path.exists(user_file):
            os.remove(user_file)
    except Exception:
        pass

    mod_name = f"users.{user_id}"
    if mod_name in sys.modules:
        try:
            del sys.modules[mod_name]
        except Exception:
            pass

    try:
        delete_user_data(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"error: {e}")

    return {"status": "deleted", "user": user_id}