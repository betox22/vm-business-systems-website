from __future__ import annotations

from typing import Any, Dict, Iterable, Mapping
from urllib.parse import urlparse

from sqlalchemy import select
from sqlalchemy.orm import Session

from .agents import TEMPLATE_CATALOG
from .db_models import TemplateRuntimeOverride, TemplateRuntimeProfile


class TemplateRuntimeError(ValueError):
    pass


DEFAULT_TEMPLATE_PREVIEWS = {
    "mega-marketplace": "/templates-preview/screenshots/mega-marketplace.png",
    "mega-retail-store": "/templates-preview/screenshots/mega-retail-store-desktop.png",
    "listing-marketplace-pro": "/templates-preview/screenshots/listing-marketplace.png",
    "premium-product-store": "/templates-preview/screenshots/premium-product.png",
    "fashion-drop-pro": "/templates-preview/screenshots/premium.png",
    "restaurant-food-business": "/templates-preview/screenshots/services.png",
    "booking-appointment-pro": "/templates-preview/screenshots/booking.png",
    "home-services-premium": "/templates-preview/screenshots/services.png",
    "local-services-pro-plus": "/templates-preview/screenshots/services.png",
    "corporate-company-pro": "/templates-preview/screenshots/b2b.png",
    "lead-funnel-pro": "/templates-preview/screenshots/services.png",
    "digital-products-store": "/templates-preview/screenshots/premium-product.png",
    "real-estate-listings-pro": "/templates-preview/screenshots/listing-marketplace.png",
    "luxury-high-ticket-pro": "/templates-preview/screenshots/premium.png",
    "education-course-academy-pro": "/templates-preview/screenshots/education.png",
    "medical-wellness-clinic-pro": "/templates-preview/screenshots/clinic.png",
    "legal-professional-services-pro": "/templates-preview/screenshots/professional.png",
    "b2b-saas-enterprise-pro": "/templates-preview/screenshots/b2b-saas-enterprise-desktop.png",
    "manufacturing-industrial-supplier-pro": "/templates-preview/screenshots/industrial.png",
}


def default_template_preview_url(template_id: str) -> str:
    return DEFAULT_TEMPLATE_PREVIEWS.get(
        template_id,
        "/templates-preview/screenshots/all-templates-contact-sheet.jpg",
    )


def _validated_preview_url(value: str, template_id: str) -> str:
    clean = str(value or "").strip()
    if not clean:
        return default_template_preview_url(template_id)
    if clean.startswith("/") and not clean.startswith("//"):
        return clean
    parsed = urlparse(clean)
    if parsed.scheme == "https" and parsed.netloc:
        return clean
    raise TemplateRuntimeError("Preview URL must be a site-relative path or an HTTPS URL.")


def runtime_template_records(session: Session) -> list[Dict[str, Any]]:
    overrides = {
        row.template_id: row
        for row in session.scalars(select(TemplateRuntimeOverride)).all()
    }
    profiles = {
        row.template_id: row
        for row in session.scalars(select(TemplateRuntimeProfile)).all()
    }
    records: list[Dict[str, Any]] = []
    for template_id, definition in TEMPLATE_CATALOG.items():
        override = overrides.get(template_id)
        profile = profiles.get(template_id)
        records.append({
            "templateId": template_id,
            "name": profile.display_name if profile and profile.display_name else definition["name"],
            "websiteType": definition["websiteType"],
            "catalogType": definition["catalogType"],
            "designMaturity": definition["design_maturity"],
            "audience": profile.audience if profile and profile.audience else definition["audience"],
            "previewUrl": profile.preview_url if profile and profile.preview_url else default_template_preview_url(template_id),
            "interactivePreviewUrl": f"/templates-preview/live-preview.html?template={template_id}",
            "replacementTemplateId": profile.replacement_template_id if profile else None,
            "enabled": override.enabled if override else True,
            "reason": override.reason if override else "",
            "actor": {
                "id": override.actor_user_id,
                "email": override.actor_email,
            } if override else None,
            "updatedAt": override.updated_at if override else None,
        })
    return records


def update_template_profile(
    session: Session,
    *,
    template_id: str,
    name: str,
    audience: str,
    preview_url: str,
    replacement_template_id: str | None,
    actor: Mapping[str, Any],
) -> TemplateRuntimeProfile:
    normalized_id = str(template_id or "").strip()
    if normalized_id not in TEMPLATE_CATALOG:
        raise TemplateRuntimeError("Unknown template id.")
    clean_name = str(name or "").strip()
    clean_audience = str(audience or "").strip()
    if len(clean_name) < 2 or len(clean_audience) < 2:
        raise TemplateRuntimeError("Template name and audience are required.")
    replacement_id = str(replacement_template_id or "").strip() or None
    if replacement_id:
        if replacement_id not in TEMPLATE_CATALOG:
            raise TemplateRuntimeError("Replacement template does not exist.")
        if replacement_id == normalized_id:
            raise TemplateRuntimeError("A template cannot replace itself.")
        if replacement_id not in set(enabled_template_ids(session)):
            raise TemplateRuntimeError("Replacement template must be enabled.")

    profile = session.get(TemplateRuntimeProfile, normalized_id)
    if not profile:
        profile = TemplateRuntimeProfile(template_id=normalized_id)
        session.add(profile)
    profile.display_name = clean_name
    profile.audience = clean_audience
    profile.preview_url = _validated_preview_url(preview_url, normalized_id)
    profile.replacement_template_id = replacement_id
    profile.actor_user_id = str(actor.get("id") or "").strip()
    profile.actor_email = str(actor.get("email") or "").strip().lower()
    try:
        session.commit()
        session.refresh(profile)
    except Exception:
        session.rollback()
        raise
    return profile


def enabled_template_ids(session: Session) -> list[str]:
    return [record["templateId"] for record in runtime_template_records(session) if record["enabled"]]


def runtime_template_replacements(session: Session) -> Dict[str, str]:
    records = runtime_template_records(session)
    enabled = {record["templateId"] for record in records if record["enabled"]}
    return {
        record["templateId"]: record["replacementTemplateId"]
        for record in records
        if not record["enabled"] and record["replacementTemplateId"] in enabled
    }


def replacement_template_for_new_project(session: Session, template_id: str | None) -> str | None:
    normalized_id = str(template_id or "").strip()
    if not normalized_id:
        return None
    return runtime_template_replacements(session).get(normalized_id)


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
