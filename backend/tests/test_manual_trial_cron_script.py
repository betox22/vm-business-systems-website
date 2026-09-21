import json
import os
from pathlib import Path
import subprocess
import sys
import time

import pytest
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session

from app.db import Base
from app.db_models import AdminAuditEvent, PlatformSubscription


BACKEND = Path(__file__).resolve().parents[1]
SCRIPT = BACKEND / "scripts/expire_manual_trials.py"


@pytest.fixture
def database(tmp_path):
    url = f"sqlite:///{tmp_path / 'cron.db'}"
    engine = create_engine(url)
    Base.metadata.create_all(engine)
    yield engine, url
    engine.dispose()


def invoke(url, *args, cwd=None):
    env = dict(os.environ)
    if url is None:
        env.pop("DATABASE_URL", None)
    else:
        env["DATABASE_URL"] = url
    env.pop("INTERNAL_CRON_SECRET", None)
    return subprocess.run([sys.executable, str(SCRIPT), *args], cwd=cwd or BACKEND,
        env=env, capture_output=True, text=True, timeout=30)


def seed(engine, **kwargs):
    with Session(engine) as session:
        session.add(PlatformSubscription(**{"id": "expired", "business_ref": kwargs.get("id", "expired"),
            "product": "kreaton", "payment_method": "manual",
            "status": "pending_manual_confirmation", "trial_end": int(time.time()) - 3600,
            **kwargs}))
        session.commit()


def test_real_script_expires_only_eligible_rows_and_audits_as_system(database, tmp_path):
    engine, url = database
    seed(engine)
    seed(engine, id="trialing", status="trialing")
    seed(engine, id="future", trial_end=int(time.time()) + 86400)
    seed(engine, id="active", status="active")
    seed(engine, id="no-deadline", trial_end=None)
    seed(engine, id="stripe", payment_method="stripe")
    seed(engine, id="stripe-subscription", stripe_subscription_id="sub_synthetic")
    seed(engine, id="other-product", product="listo_pos")
    with Session(engine) as session:
        original = {row.id: row.status for row in session.scalars(select(PlatformSubscription))}
    completed = invoke(url, cwd=tmp_path)
    assert completed.returncode == 0, completed.stderr
    assert completed.stderr == ""
    result = json.loads(completed.stdout)
    assert result["status"] == "ok" and result["expiredCount"] == 2
    assert set(result["expiredIds"]) == {"expired", "trialing"}
    with Session(engine) as session:
        for row in session.scalars(select(PlatformSubscription)):
            assert row.status == ("past_due" if row.id in result["expiredIds"] else original[row.id])
        audits = session.scalars(select(AdminAuditEvent)).all()
        assert len(audits) == 3
        assert all(row.actor_user_id == "system:manual-trial-expiry" and row.actor_role == "system"
            and row.request_id == result["requestId"] for row in audits)
        expired = [row for row in audits if row.action == "admin.subscription.manual_trial_expired"]
        assert len(expired) == 2
        assert all(json.loads(row.metadata_json)["toStatus"] == "past_due" for row in expired)
    repeated = invoke(url)
    assert repeated.returncode == 0
    assert json.loads(repeated.stdout)["expiredCount"] == 0
    with Session(engine) as session:
        assert len(session.scalars(select(AdminAuditEvent).where(
            AdminAuditEvent.action == "admin.subscription.manual_trial_expired")).all()) == 2


def test_batch_limit_bounds_work(database):
    engine, url = database
    seed(engine)
    seed(engine, id="second")
    completed = invoke(url, "--limit", "1")
    assert completed.returncode == 0
    assert json.loads(completed.stdout)["expiredCount"] == 1


@pytest.mark.parametrize("value", ["0", "501", "wrong"])
def test_invalid_limit_exits_two(database, value):
    _, url = database
    completed = invoke(url, "--limit", value)
    assert completed.returncode == 2 and completed.stdout == ""


def test_missing_database_fails_closed_without_sqlite_fallback(tmp_path):
    completed = invoke(None, cwd=tmp_path)
    assert completed.returncode == 2
    assert json.loads(completed.stderr)["error"] == "missing_database_url"
    assert list(tmp_path.iterdir()) == []


def test_database_failure_exits_one_without_leaking_sql(database):
    engine, url = database
    seed(engine)
    with engine.begin() as connection:
        connection.execute(text("""CREATE TRIGGER fail_expiry_audit BEFORE INSERT ON admin_audit_events
            BEGIN SELECT RAISE(ABORT, 'PRIVATE_QA_DB_DETAIL'); END"""))
    completed = invoke(url)
    assert completed.returncode == 1 and completed.stdout == ""
    assert json.loads(completed.stderr)["status"] == "error"
    assert "PRIVATE_QA_DB_DETAIL" not in completed.stderr
    assert url not in completed.stderr and "INSERT" not in completed.stderr
    with Session(engine) as session:
        assert session.get(PlatformSubscription, "expired").status == "pending_manual_confirmation"
        assert session.scalars(select(AdminAuditEvent)).all() == []


def test_script_does_not_create_or_migrate_schema(tmp_path):
    completed = invoke(f"sqlite:///{tmp_path / 'empty.db'}")
    assert completed.returncode == 1
    assert json.loads(completed.stderr)["error"] == "OperationalError"
