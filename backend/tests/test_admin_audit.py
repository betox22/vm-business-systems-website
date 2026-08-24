from __future__ import annotations

import json

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.exc import DatabaseError
from sqlalchemy.orm import Session

from app.admin_audit import (
    ensure_admin_audit_append_only,
    record_admin_audit_event,
    sanitize_admin_audit_metadata,
)
from app.db import Base
from app.db_models import AdminAuditEvent


ACTOR = {
    "id": "admin-123",
    "email": "beto@example.com",
    "role": "super_admin",
}


def test_metadata_is_bounded_and_removes_credentials_and_full_schemas():
    metadata = sanitize_admin_audit_metadata(
        {
            "reason": "customer request",
            "accessToken": "must-not-survive",
            "password": "must-not-survive",
            "generatedSchema": {"pages": ["must-not-survive"]},
            "payload": {"pages": ["must-not-survive"]},
            "nested": {"authorization": "Bearer secret", "safe": "yes"},
            "long": "x" * 400,
        }
    )

    serialized = json.dumps(metadata)
    assert metadata["reason"] == "customer request"
    assert metadata["nested"] == {"safe": "yes"}
    assert len(metadata["long"]) == 256
    assert "must-not-survive" not in serialized
    assert "Bearer secret" not in serialized


def test_admin_audit_events_are_append_only():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(bind=engine)
    with Session(engine) as session:
        event = record_admin_audit_event(
            session,
            actor=ACTOR,
            action="admin.site.viewed",
            target_type="generated_site",
            target_id="site-1",
            outcome="success",
        )
        event.outcome = "changed"
        with pytest.raises(ValueError, match="append-only"):
            session.commit()
        session.rollback()

        stored = session.get(AdminAuditEvent, event.id)
        session.delete(stored)
        with pytest.raises(ValueError, match="append-only"):
            session.commit()
        session.rollback()


def test_admin_audit_event_survives_database_engine_restart(tmp_path):
    database_path = tmp_path / "admin-audit-restart.db"
    database_url = f"sqlite:///{database_path.as_posix()}"

    first_engine = create_engine(database_url)
    Base.metadata.create_all(bind=first_engine)
    ensure_admin_audit_append_only(first_engine)
    with Session(first_engine) as session:
        created = record_admin_audit_event(
            session,
            actor=ACTOR,
            action="admin.site.deleted",
            target_type="generated_site",
            target_id="site-restart-proof",
            outcome="success",
            request_id="req-restart-proof",
            metadata={"businessName": "Restart Proof"},
        )
        event_id = created.id
    first_engine.dispose()

    restarted_engine = create_engine(database_url)
    with Session(restarted_engine) as session:
        persisted = session.scalar(
            select(AdminAuditEvent).where(AdminAuditEvent.id == event_id)
        )
    assert persisted is not None
    assert persisted.action == "admin.site.deleted"
    assert persisted.target_id == "site-restart-proof"
    assert persisted.request_id == "req-restart-proof"

    with pytest.raises(DatabaseError, match="append-only"):
        with restarted_engine.begin() as connection:
            connection.exec_driver_sql(
                "UPDATE admin_audit_events SET outcome = 'changed' WHERE id = ?",
                (event_id,),
            )
    restarted_engine.dispose()
