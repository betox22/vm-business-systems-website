from __future__ import annotations

from typing import Any, Dict, Iterable, Mapping

from sqlalchemy import select
from sqlalchemy.orm import Session

from .agents import TEMPLATE_CATALOG
from .db_models import TemplateRuntimeOverride


class TemplateRuntimeError(ValueError):
    pass


def runtime_template_records(session: Session) -> list[Dict[str, Any]]:
    overrides = {
        row.template_id: row
        for row in session.scalars(select(TemplateRuntimeOverride)).all()
    }
    records: list[Dict[str, Any]] = []
    for template_id, definition in TEMPLATE_CATALOG.items():
        override = overrides.get(template_id)
        records.append({
            "templateId": template_id,
            "name": definition["name"],
            "websiteType": definition["websiteType"],
            "catalogType": definition["catalogType"],
            "designMaturity": definition["design_maturity"],
            "audience": definition["audience"],
            "enabled": override.enabled if override else True,
            "reason": override.reason if override else "",
            "actor": {
                "id": override.actor_user_id,
                "email": override.actor_email,
            } if override else None,
            "updatedAt": override.updated_at if override else None,
        })
    return records


def enabled_template_ids(session: Session) -> list[str]:
    return [record["templateId"] for record in runtime_template_records(session) if record["enabled"]]


def apply_template_override(
    session: Session,
    *,
    template_id: str,
    enabled: bool,
    reason: str,
    actor: Mapping[str, Any],
) -> TemplateRuntimeOverride:
    normalized_id = str(template_id or "").strip()
    if normalized_id not in TEMPLATE_CATALOG:
        raise TemplateRuntimeError("Unknown template id.")
    normalized_reason = str(reason or "").strip()
    if not normalized_reason:
        raise TemplateRuntimeError("A reason is required for template availability changes.")

    currently_enabled = set(enabled_template_ids(session))
    if not enabled and normalized_id in currently_enabled and len(currently_enabled) == 1:
        raise TemplateRuntimeError("At least one template must remain enabled.")

    override = session.get(TemplateRuntimeOverride, normalized_id)
    if not override:
        override = TemplateRuntimeOverride(
            template_id=normalized_id,
            enabled=enabled,
            reason=normalized_reason,
            actor_user_id=str(actor.get("id") or "").strip(),
            actor_email=str(actor.get("email") or "").strip().lower(),
        )
        session.add(override)
    else:
        override.enabled = enabled
        override.reason = normalized_reason
        override.actor_user_id = str(actor.get("id") or "").strip()
        override.actor_email = str(actor.get("email") or "").strip().lower()
    try:
        session.commit()
        session.refresh(override)
    except Exception:
        session.rollback()
        raise
    return override


def template_ids_for_generation(
    session: Session | Any,
    *,
    preserve_template_ids: Iterable[str] = (),
) -> list[str]:
    # Some unit tests and internal callers invoke route functions directly,
    # outside FastAPI's dependency injection. Preserve the built-in catalog in
    # that context; real HTTP requests always receive a SQLAlchemy Session.
    if not hasattr(session, "scalars"):
        return list(TEMPLATE_CATALOG)
    allowed = set(enabled_template_ids(session))
    allowed.update(
        template_id
        for template_id in preserve_template_ids
        if template_id in TEMPLATE_CATALOG
    )
    return [template_id for template_id in TEMPLATE_CATALOG if template_id in allowed]
