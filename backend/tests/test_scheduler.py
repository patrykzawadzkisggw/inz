import datetime
import os
import sys
import types
import pytest
import scheduler


def test_interval_parsers():
    rec = {'frequencyValue': '15', 'frequencyUnit': 'm'}
    kw = scheduler._interval_kwargs_from_frequency(rec)
    assert kw == {'minutes': 15}

    spec = '30s'
    kw2 = scheduler._interval_kwargs_from_spec(spec)
    assert kw2 == {'seconds': 30}


def test_submit_job_calls_add_job(monkeypatch):
    dummy = FakeScheduler()
    monkeypatch.setattr(scheduler, 'scheduler', dummy)

    start = datetime.datetime.now(datetime.timezone.utc)

    def f():
        return 'ok'

    scheduler._submit_job('job1', f, {'seconds': 2}, start, args=[1, 2])
    assert len(dummy.added) == 1
    func, kwargs = dummy.added[0]
    assert func is f
    assert kwargs['id'] == 'job1'
    assert kwargs['args'] == [1, 2]


def test_schedule_record_and_datafeed_use_submit(monkeypatch):
    monkeypatch.setattr(scheduler, 'scheduler', object())

    recorded = {}

    def fake_submit(job_id, func, interval_kwargs, start_at, args=None):
        recorded['job_id'] = job_id
        recorded['func'] = func
        recorded['interval_kwargs'] = interval_kwargs
        recorded['args'] = args

    monkeypatch.setattr(scheduler, '_submit_job', fake_submit)

    rec = {'id': 'r1', 'enabled': True, 'frequencyValue': '1', 'frequencyUnit': 'h', 'nextRunAt': None, 'lastRunAt': None}
    scheduler.schedule_record(rec)
    assert recorded['job_id'] == 'r1'
    assert recorded['func'] == scheduler.report.run_report_job
    assert 'hours' in recorded['interval_kwargs'] and recorded['interval_kwargs']['hours'] == 1

    recorded.clear()
    rec2 = {'id': 'f1', 'active': True, 'intervalSpec': '5m', 'nextRunAt': None, 'lastRunAt': None}
    scheduler.schedule_datafeed_record(rec2)
    assert recorded['job_id'] == 'datafeed:f1'
    assert recorded['func'] == scheduler.dp.run_datafeed_job
    assert recorded['interval_kwargs'] == {'minutes': 5}


def test_schedule_single_from_db(monkeypatch):
    monkeypatch.setattr(scheduler, 'fetch_report', lambda rid: None)
    res = scheduler.schedule_single_from_db('nope')
    assert res['status'] == 'not_found'

    monkeypatch.setattr(scheduler, 'fetch_report', lambda rid: {'id': rid, 'enabled': False})
    res2 = scheduler.schedule_single_from_db('rid')
    assert res2['status'] == 'disabled'

    called = {}
    monkeypatch.setattr(scheduler, 'fetch_report', lambda rid: {'id': rid, 'enabled': True, 'frequencyValue': '1', 'frequencyUnit': 'h'})
    monkeypatch.setattr(scheduler, 'schedule_record', lambda rec: called.setdefault('ok', rec['id']))
    res3 = scheduler.schedule_single_from_db('rid')
    assert res3['status'] == 'scheduled'


class FakeScheduler:
    def __init__(self, timezone=None):
        self.timezone = timezone
        self.started = False
        self.added = []
        self.removed = []

    def start(self):
        self.started = True

    def add_job(self, *args, **kwargs):
        func = args[0] if args else kwargs.get('func')
        self.added.append((func, kwargs))

    def remove_job(self, job_id):
        if job_id == 'raise':
            raise RuntimeError('boom')
        self.removed.append(job_id)


def test_parse_iso_valid_and_invalid():
    assert scheduler._parse_iso(None) is None
    dt = scheduler._parse_iso('2020-01-01T00:00:00Z')
    assert dt.tzinfo is not None
    dt2 = scheduler._parse_iso('2020-01-01T00:00:00')
    assert dt2.tzinfo == scheduler.UTC
    assert scheduler._parse_iso('not a date') is None


def test_interval_kwargs_from_frequency_more():
    rec = {'frequencyValue': '15', 'frequencyUnit': 'm'}
    assert scheduler._interval_kwargs_from_frequency(rec) == {'minutes': 15}
    rec2 = {'frequencyValue': 5, 'frequencyUnit': 'h'}
    assert scheduler._interval_kwargs_from_frequency(rec2) == {'hours': 5}
    assert scheduler._interval_kwargs_from_frequency({'frequencyValue': 'x', 'frequencyUnit': 'm'}) is None
    assert scheduler._interval_kwargs_from_frequency({'frequencyValue': 1}) is None


def test_interval_kwargs_from_spec_more():
    assert scheduler._interval_kwargs_from_spec('15m') == {'minutes': 15}
    assert scheduler._interval_kwargs_from_spec('1h') == {'hours': 1}
    assert scheduler._interval_kwargs_from_spec('30s') == {'seconds': 30}
    assert scheduler._interval_kwargs_from_spec('15min') == {'minutes': 15}
    assert scheduler._interval_kwargs_from_spec('') is None
    assert scheduler._interval_kwargs_from_spec('bad') is None


def test_submit_and_schedule_record(monkeypatch, tmp_path):
    fake = FakeScheduler()
    monkeypatch.setattr(scheduler, 'scheduler', fake)

    rec = {'id': 'r1', 'enabled': True, 'frequencyValue': 1, 'frequencyUnit': 'm', 'nextRunAt': None, 'lastRunAt': None}
    scheduler.schedule_record(rec)
    assert fake.added, 'expected a job to be scheduled'
    func, kwargs = fake.added[-1]
    assert kwargs.get('id') == 'r1'
    assert kwargs.get('args')[0] == 'r1'

    fake.added.clear()
    scheduler.schedule_record({'id': 'r2', 'enabled': False})
    assert not fake.added


def test_schedule_single_from_db_more(monkeypatch):
    fake = FakeScheduler()
    monkeypatch.setattr(scheduler, 'scheduler', fake)

    monkeypatch.setattr(scheduler, 'fetch_report', lambda rid: None)
    res = scheduler.schedule_single_from_db('x')
    assert res['status'] == 'not_found'

    monkeypatch.setattr(scheduler, 'fetch_report', lambda rid: {'id': rid, 'enabled': False})
    res2 = scheduler.schedule_single_from_db('y')
    assert res2['status'] == 'disabled'

    monkeypatch.setattr(scheduler, 'fetch_report', lambda rid: {'id': rid, 'enabled': True, 'frequencyValue': 1, 'frequencyUnit': 'm'})
    res3 = scheduler.schedule_single_from_db('z')
    assert res3['status'] == 'scheduled'


def test_schedule_datafeed_and_init_datafeeds(monkeypatch):
    fake = FakeScheduler()
    monkeypatch.setattr(scheduler, 'scheduler', fake)
    rec = {'id': 'f1', 'active': True, 'intervalSpec': '15m'}
    scheduler.schedule_datafeed_record(rec)
    assert fake.added and fake.added[-1][1].get('id') == 'datafeed:f1'

    fake.added.clear()
    scheduler.schedule_datafeed_record({'id': 'f2', 'active': False, 'intervalSpec': '15m'})
    assert not fake.added

    monkeypatch.setattr(scheduler, 'fetch_active_datafeeds', lambda: [rec])
    fake.added.clear()
    scheduler.init_datafeeds_scheduler()
    assert fake.added


def test_init_scheduler_and_schedule_prediction_flow(monkeypatch):
    monkeypatch.setattr(scheduler, 'AsyncIOScheduler', FakeScheduler)
    monkeypatch.setattr(scheduler, 'fetch_enabled_reports', lambda: [{'id': 'rA', 'enabled': True, 'frequencyValue': 1, 'frequencyUnit': 'm'}])
    monkeypatch.setattr(scheduler, 'scheduler', None)
    scheduler.init_scheduler()
    assert isinstance(scheduler.scheduler, FakeScheduler)
    assert scheduler.scheduler.started

    monkeypatch.setattr(scheduler, 'fetch_datafeeds_by_model', lambda mid: [])
    out = scheduler.schedule_prediction_jobs_for_model('m1')
    assert out['status'] == 'no_datafeeds'

    monkeypatch.setattr(scheduler, 'fetch_datafeeds_by_model', lambda mid: [{'id': 'a', 'active': True, 'intervalSpec': '1m'}, {'id': 'b', 'active': False, 'intervalSpec': '1m'}])
    res = scheduler.schedule_prediction_jobs_for_model('m2')
    assert res['status'] == 'scheduled' and 'a' in res['feedIds']


def test_remove_and_sync_prediction_jobs(monkeypatch):
    fake = FakeScheduler()
    monkeypatch.setattr(scheduler, 'scheduler', fake)
    monkeypatch.setattr(scheduler, 'fetch_datafeeds_by_model', lambda mid: [{'id': 'x1'}, {'id': 'x2'}])
    fake.removed.clear()
    out = scheduler.remove_prediction_jobs_for_model('m')
    assert out['status'] == 'removed'

    monkeypatch.setattr(scheduler, 'fetch_datafeeds_by_model', lambda mid: [{'id': 's1', 'active': True, 'intervalSpec': '1m'}, {'id': 's2', 'active': False, 'intervalSpec': '1m'}])
    res = scheduler.sync_prediction_jobs_for_model('m')
    assert res['status'] == 'ok'


def test_delete_user_flow(monkeypatch, tmp_path):
    fake = FakeScheduler()
    monkeypatch.setattr(scheduler, 'scheduler', fake)
    users_dir = os.path.join(os.path.dirname(scheduler.__file__), 'users')
    os.makedirs(users_dir, exist_ok=True)
    uid = 'tuuser'
    path = os.path.join(users_dir, f"{uid}.py")
    with open(path, 'w', encoding='utf-8') as f:
        f.write('#user')

    monkeypatch.setattr(scheduler, 'fetch_reports_by_user', lambda u: [{'id': 'r1'}])
    monkeypatch.setattr(scheduler, 'fetch_models_by_user', lambda u: [{'id': 'm1'}])
    called = {}
    monkeypatch.setattr(scheduler, 'delete_user_data', lambda u: called.setdefault('deleted', u))

    res = scheduler.delete_user(uid)
    assert res['status'] == 'deleted' and res['user'] == uid
    assert not os.path.exists(path)
    assert called.get('deleted') == uid
