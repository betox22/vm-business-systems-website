from __future__ import annotations

import json
import logging
from typing import Any, Dict, Mapping, Optional

from sqlalchemy import func, or_, select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from .db_models import AdminAuditEvent


logger = logging.getLogger(__name__)

_SENSITIVE_KEY_FRAGMENTS = (
    "authorization",
    "cookie",
    "password",
    "refresh_token",
    "access_token",
    "service_role",
    "secret",
    "token",
    "schema",
    "generated_config",
    "request_body",
    "payload",
    "catalog_items",
    "sections",
)
_MAX_DEPTH = 4
_MAX_MAPPING_ITEMS = 40
_MAX_SEQUENCE_ITEMS = 20
_MAX_STRING_LENGTH = 256


def ensure_admin_audit_append_only(engine: Engine) -> None:
    """Install database-level guards against updating or deleting audit rows."""

    dialect = engine.dialect.name
    with engine.begin() as connection:
        if dialect == "sqlite":
            connection.exec_driver_sql(
                """
                CREATE TRIGGER IF NOT EXISTS admin_audit_events_prevent_update
                BEFORE UPDATE ON admin_audit_events
                BEGIN
                    SELECT RAISE(ABORT, 'admin_audit_events is append-only');
                END
                """
            )
            connection.exec_driver_sql(
                """
                CREATE TRIGGER IF NOT EXISTS admin_audit_events_prevent_delete
                BEFORE DELETE ON admin_audit_events
                BEGIN
                    SELECT RAISE(ABORT, 'admin_audit_events is append-only');
                END
                """
            )
            return
        if dialect == "postgresql":
            connection.exec_driver_sql(
                """
                CREATE OR REPLACE FUNCTION kreaton_prevent_admin_audit_mutation()
                RETURNS trigger AS $$
                BEGIN
                    RAISE EXCEPTION 'admin_audit_events is append-only';
                END;
                $$ LANGUAGE plpgsql
                """
            )
            connection.exec_driver_sql(
                "DROP TRIGGER IF EXISTS admin_audit_events_append_only ON admin_audit_events"
            )
            connection.exec_driver_sql(
                """
                CREATE TRIGGER admin_audit_events_append_only
                BEFORE UPDATE OR DELETE ON admin_audit_events
                FOR EACH ROW EXECUTE FUNCTION kreaton_prevent_admin_audit_mutation()
                """
            )
            return
    logger.warning("Admin audit database trigger is not available for dialect=%s", dialect)


def _is_sensitive_key(key: str) -> bool:
    normalized = key.strip().lower().replace("-", "_")
    return any(fragment in normalized for fragment in _SENSITIVE_KEY_FRAGMENTS)


def sanitize_admin_audit_metadata(value: Any, *, _depth: int = 0) -> Any:
    """Return a bounded JSON-safe value with credentials and schemas removed."""

    if _depth >= _MAX_DEPTH:
        return "[TRUNCATED]"
    if value is None or isinstance(value, (bool, int, float)):
        return value
    if isinstance(value, str):
        return value[:_MAX_STRING_LENGTH]
    if isinstance(value, Mapping):
        sanitized: Dict[str, Any] = {}
        for raw_key, item in list(value.items())[:_MAX_MAPPING_ITEMS]:
            key = str(raw_key)[:64]
            if _is_sensitive_key(key):
                continue
            sanitized[key] = sanitize_admin_audit_metadata(item, _depth=_depth + 1)
        return sanitized
    if isinstance(value, (list, tuple, set)):
        return [
            sanitize_admin_audit_metadata(item, _depth=_depth + 1)
            for item in list(value)[:_MAX_SEQUENCE_ITEMS]
        ]
    return f"[{type(value).__name__}]"


def record_admin_audit_event(
    session: Session,
    *,
    actor: Mapping[str, Any],
    action: str,
    target_type: str,
    target_id: str,
    outcome: str,
    request_id: str = "",
    metadata: Optional[Mapping[str, Any]] = None,
) -> AdminAuditEvent:
    sanitized_metadata = sanitize_admin_audit_metadata(dict(metadata or {}))
    event = AdminAuditEvent(
        actor_user_id=str(actor.get("id") or "").strip(),
        actor_email=str(actor.get("email") or "").strip().lower(),
        actor_role=str(actor.get("role") or "").strip().lower(),
        action=str(action).strip()[:120],
        target_type=str(target_type).strip()[:80],
        target_id=str(target_id).strip()[:160],
        outcome=str(outcome).strip().lower()[:40],
        request_id=str(request_id).strip()[:96],
        metadata_json=json.dumps(sanitized_metadata, ensure_ascii=True, separators=(",", ":"), sort_keys=True),
    )
    if not event.actor_user_id or not event.actor_role or not event.action:
        raise ValueError("Admin audit events require an actor, role, and action.")
    try:
        session.add(event)
        session.commit()
        session.refresh(event)
    except Exception:
        session.rollback()
        raise
    logger.info(
        "admin_audit_event action=%s outcome=%s actor=%s target=%s:%s request_id=%s",
        event.action,
        event.outcome,
        event.actor_user_id,
        event.target_type,
        event.target_id,
        event.request_id,
    )
    return event


def list_admin_audit_events(
    session: Session,
    *,
    query: str = "",
    action: str = "",
    outcome: str = "",
    page: int = 1,
    per_page: int = 50,
) -> tuple[list[Dict[str, Any]], int]:
    """Return a bounded newest-first audit view for the internal dashboard."""

    filters = []
    search = str(query or "").strip().lower()
    if search:
        like = f"%{search}%"
        filters.append(or_(
            func.lower(AdminAuditEvent.actor_email).like(like),
            func.lower(AdminAuditEvent.action).like(like),
            func.lower(AdminAuditEvent.target_type).like(like),
            func.lower(AdminAuditEvent.target_id).like(like),
            func.lower(AdminAuditEvent.request_id).like(like),
        ))
    normalized_action = str(action or "").strip().lower()
    if normalized_action:
        filters.append(func.lower(AdminAuditEvent.action) == normalized_action)
    normalized_outcome = str(outcome or "").strip().lower()
    if normalized_outcome:
        filters.append(func.lower(AdminAuditEvent.outcome) == normalized_outcome)

    count_statement = select(func.count()).select_from(AdminAuditEvent)
    statement = select(AdminAuditEvent)
    if filters:
        count_statement = count_statement.where(*filters)
        statement = statement.where(*filters)
    total = int(session.scalar(count_statement) or 0)
    rows = session.scalars(
        statement
        .order_by(AdminAuditEvent.created_at.desc(), AdminAuditEvent.id.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    ).all()
    events = []
    for row in rows:
        try:
            metadata = json.loads(row.metadata_json or "{}")
        except (TypeError, ValueError):
            metadata = {}
        events.append({
            "id": row.id,
            "actor": {
                "id": row.actor_user_id,
                "email": row.actor_email,
                "role": row.actor_role,
            },
            "action": row.action,
            "target": {"type": row.target_type, "id": row.target_id},
            "outcome": row.outcome,
            "requestId": row.request_id,
            "metadata": metadata if isinstance(metadata, dict) else {},
            "createdAt": row.created_at,
        })
    return events, total
