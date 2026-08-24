from __future__ import annotations

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import main
from app.agents import StrategyAgent, TEMPLATE_CATALOG, template_catalog_for_state
from app.ai_site_planner import AIWebGenerationResponse, resolve_planner_template
from app.db import Base, get_session
from app.db_models import (
    AdminAuditEvent,
    GeneratedSite,
    Store,
    TemplateRuntimeOverride,
    TemplateRuntimeProfile,
)
from app.models import ProjectState
from app.template_runtime import (
    apply_template_override,
    enabled_template_ids,
    replacement_template_for_new_project,
    runtime_template_records,
    runtime_template_replacements,
)


def _admin_user(role: str):
    return {
        "id": f"admin-{role}",
        "email": f"{role}@kreaton.test",
        "app_metadata": {"kreaton_role": role},
    }


@pytest.fixture()
def runtime_database():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(bind=engine)

    def override_get_session():
        with session_factory() as session:
            yield session

    main.app.dependency_overrides[get_session] = override_get_session
    try:
        yield session_factory
    finally:
        main.app.dependency_overrides.pop(get_session, None)
        engine.dispose()


def _request(client: TestClient, method: str, path: str, *, role: str, json=None):
    with (
        patch.object(main, "supabase_auth_configured", return_value=True),
        patch.object(main, "fetch_supabase_user", return_value=_admin_user(role)),
    ):
        return client.request(
            method,
            path,
            json=json,
            headers={"Authorization": "Bearer admin-token", "X-Request-ID": "req-template-runtime"},
        )


def _plan(template_id: str = "premium-product-store") -> AIWebGenerationResponse:
    template = TEMPLATE_CATALOG[template_id]
    return AIWebGenerationResponse.model_validate({
        "reasoningSummary": "Runtime selection test",
        "templateId": template_id,
        "primaryCatalogType": template["catalogType"],
        "confidenceScore": 0.9,
        "alternativeCatalogTypes": [],
        "websiteType": template["websiteType"],
        "catalogStrategy": template["catalogType"],
        "salesFlow": "online_sales",
        "targetAudience": "Buyers",
        "brand_identity": {
            "palette_style": "elegante",
            "font_family_headings": "Inter",
            "font_family_body": "Inter",
            "logo_config": {
                "requires_ai_generation": False,
                "generation_prompt": "Create an original professional identity with clear typography and niche-relevant symbolism.",
            },
        },
        "pages": [],
        "catalogCategories": [],
        "catalogItems": [],
        "confidence": 0.9,
    })


def test_super_admin_can_disable_and_enable_template_with_durable_audit(runtime_database):
    with TestClient(main.app, base_url="https://api.vmbusinesssystems.com") as client:
        disabled = _request(
            client,
            "PATCH",
            "/api/admin/templates/premium-product-store",
            role="super_admin",
            json={"enabled": False, "reason": "Temporary quality review"},
        )
        public = client.get("/api/templates/availability")
        enabled = _request(
            client,
            "PATCH",
            "/api/admin/templates/premium-product-store",
            role="super_admin",
            json={"enabled": True, "reason": "Quality review passed"},
        )

    assert disabled.status_code == 200
    assert disabled.json()["template"]["enabled"] is False
    assert "premium-product-store" not in public.json()["enabledTemplateIds"]
    assert enabled.status_code == 200
    assert enabled.json()["template"]["enabled"] is True
    with runtime_database() as session:
        override = session.get(TemplateRuntimeOverride, "premium-product-store")
        audits = session.scalars(select(AdminAuditEvent).order_by(AdminAuditEvent.created_at)).all()
    assert override is not None
    assert override.reason == "Quality review passed"
    assert override.actor_user_id == "admin-super_admin"
    assert [event.action for event in audits] == ["admin.template.disabled", "admin.template.enabled"]
    assert all(event.outcome == "success" for event in audits)


def test_support_cannot_list_or_change_template_availability(runtime_database):
    with TestClient(main.app, base_url="https://api.vmbusinesssystems.com") as client:
        listing = _request(client, "GET", "/api/admin/templates", role="support")
        update = _request(
            client,
            "PATCH",
            "/api/admin/templates/premium-product-store",
            role="support",
            json={"enabled": False, "reason": "Not authorized"},
        )

    assert listing.status_code == 403
    assert update.status_code == 403
    with runtime_database() as session:
        assert session.get(TemplateRuntimeOverride, "premium-product-store") is None
        audits = session.scalars(select(AdminAuditEvent)).all()
    assert len(audits) == 2
    assert all(event.outcome == "denied" for event in audits)


def test_disabled_template_is_excluded_from_new_strategy_and_planner(runtime_database):
    with runtime_database() as session:
        session.add(TemplateRuntimeOverride(
            template_id="premium-product-store",
            enabled=False,
            reason="Temporarily hidden",
            actor_user_id="admin-1",
            actor_email="admin@kreaton.test",
        ))
        session.commit()
        available = enabled_template_ids(session)

    state = ProjectState(runtimeAvailableTemplateIds=available)
    catalog = template_catalog_for_state(state)
    selected, _reason = StrategyAgent()._select_template_id(
        "handmade soaps candles and bath bombs online store",
        3,
        None,
        catalog,
    )
    resolved = resolve_planner_template(
        _plan(),
        "Handmade soaps, candles and bath bombs sold online",
        catalog,
    )

    assert "premium-product-store" not in catalog
    assert selected != "premium-product-store"
    assert resolved.templateId != "premium-product-store"


def test_existing_project_can_preserve_disabled_template_definition(runtime_database):
    with runtime_database() as session:
        session.add(TemplateRuntimeOverride(
            template_id="premium-product-store",
            enabled=False,
            reason="Unavailable for new work",
            actor_user_id="admin-1",
            actor_email="admin@kreaton.test",
        ))
        session.commit()
        available_for_new = enabled_template_ids(session)

    existing_state = ProjectState(
        selectedTemplateId="premium-product-store",
        runtimeAvailableTemplateIds=[*available_for_new, "premium-product-store"],
    )
    assert "premium-product-store" not in available_for_new
    assert "premium-product-store" in template_catalog_for_state(existing_state)


def test_disabled_template_does_not_break_an_existing_published_site(runtime_database):
    with runtime_database() as session:
        store = Store(
            id="store-existing",
            owner_user_id="client-1",
            owner_email="client@example.com",
            name="Existing Store",
            business_type="retail",
            public_url="existing.usekreaton.com",
        )
        site = GeneratedSite(
            id="site-existing",
            store_id=store.id,
            owner_user_id="client-1",
            owner_email="client@example.com",
            business_name="Existing Store",
            business_type="retail",
            template_id="premium-product-store",
            template_name="Premium Product Store",
            template_mode="commerce",
            domain_slug="existing",
            public_url="existing.usekreaton.com",
            generated_config='{"selected_template":{"id":"premium-product-store"},"pages":[]}',
        )
        session.add_all([
            store,
            site,
            TemplateRuntimeOverride(
                template_id="premium-product-store",
                enabled=False,
                reason="Unavailable for new projects",
                actor_user_id="admin-1",
                actor_email="admin@kreaton.test",
            ),
        ])
        session.commit()

    with TestClient(main.app, base_url="https://api.vmbusinesssystems.com") as client:
        response = client.get("/public/sites/site-existing")

    assert response.status_code == 200
    assert response.json()["schema"]["selected_template"]["id"] == "premium-product-store"


def test_unknown_template_is_rejected_and_audited(runtime_database):
    with TestClient(main.app, base_url="https://api.vmbusinesssystems.com") as client:
        response = _request(
            client,
            "PATCH",
            "/api/admin/templates/not-a-template",
            role="super_admin",
            json={"enabled": False, "reason": "Unknown"},
        )

    assert response.status_code == 404
    with runtime_database() as session:
        audit = session.scalar(select(AdminAuditEvent))
    assert audit is not None
    assert audit.outcome == "failure"


def test_template_override_survives_database_reconnect(tmp_path):
    database_path = tmp_path / "runtime-overrides.db"
    database_url = f"sqlite:///{database_path}"
    first_engine = create_engine(database_url)
    Base.metadata.create_all(bind=first_engine)
    first_session_factory = sessionmaker(bind=first_engine)
    with first_session_factory() as session:
        apply_template_override(
            session,
            template_id="premium-product-store",
            enabled=False,
            reason="Persist across application restart",
            actor={"id": "admin-persist", "email": "admin@kreaton.test"},
        )
    first_engine.dispose()

    restarted_engine = create_engine(database_url)
    restarted_session_factory = sessionmaker(bind=restarted_engine)
    with restarted_session_factory() as session:
        override = session.get(TemplateRuntimeOverride, "premium-product-store")
        available = enabled_template_ids(session)
    restarted_engine.dispose()

    assert override is not None
    assert override.reason == "Persist across application restart"
    assert "premium-product-store" not in available


def test_template_gallery_returns_real_preview_for_every_registered_template(runtime_database):
    with runtime_database() as session:
        records = runtime_template_records(session)

    assert len(records) == len(TEMPLATE_CATALOG)
    assert all(record["previewUrl"].startswith("/templates-preview/screenshots/") for record in records)
    assert all(record["interactivePreviewUrl"].startswith("/templates-preview/live-preview.html?template=") for record in records)
    assert all(record["name"] and record["audience"] for record in records)


def test_super_admin_can_edit_template_profile_and_assign_enabled_replacement(runtime_database):
    with TestClient(main.app, base_url="https://api.vmbusinesssystems.com") as client:
        response = _request(
            client,
            "PATCH",
            "/api/admin/templates/premium-product-store/profile",
            role="super_admin",
            json={
                "name": "Premium Product Editorial",
                "audience": "Focused product brands with strong visual storytelling.",
                "previewUrl": "/templates-preview/live-preview.html?template=premium-product-store",
                "replacementTemplateId": "mega-retail-store",
                "reason": "Refresh gallery identity and define operational replacement",
            },
        )

    assert response.status_code == 200
    assert response.json()["template"]["name"] == "Premium Product Editorial"
    assert response.json()["template"]["replacementTemplateId"] == "mega-retail-store"
    with runtime_database() as session:
        profile = session.get(TemplateRuntimeProfile, "premium-product-store")
        audit = session.scalar(select(AdminAuditEvent))
    assert profile is not None
    assert profile.actor_user_id == "admin-super_admin"
    assert audit is not None
    assert audit.action == "admin.template.profile_updated"
    assert audit.outcome == "success"


def test_disabled_template_replacement_applies_to_new_projects_only(runtime_database):
    with runtime_database() as session:
        session.add_all([
            TemplateRuntimeOverride(
                template_id="premium-product-store",
                enabled=False,
                reason="Replaced after quality review",
                actor_user_id="admin-1",
                actor_email="admin@kreaton.test",
            ),
            TemplateRuntimeProfile(
                template_id="premium-product-store",
                display_name="Premium Product",
                audience="Focused product brands",
                preview_url="/templates-preview/screenshots/premium-product.png",
                replacement_template_id="mega-retail-store",
                actor_user_id="admin-1",
                actor_email="admin@kreaton.test",
            ),
        ])
        session.commit()
        replacements = runtime_template_replacements(session)
        replacement = replacement_template_for_new_project(session, "premium-product-store")

    assert replacements == {"premium-product-store": "mega-retail-store"}
    assert replacement == "mega-retail-store"


@pytest.mark.parametrize(
    ("preview_url", "replacement_id"),
    [
        ("javascript:alert(1)", None),
        ("https://safe.example/preview", "premium-product-store"),
        ("https://safe.example/preview", "missing-template"),
    ],
)
def test_template_profile_rejects_unsafe_preview_and_invalid_replacements(
    runtime_database,
    preview_url,
    replacement_id,
):
    with TestClient(main.app, base_url="https://api.vmbusinesssystems.com") as client:
        response = _request(
            client,
            "PATCH",
            "/api/admin/templates/premium-product-store/profile",
            role="super_admin",
            json={
                "name": "Premium Product",
                "audience": "Focused commerce brands",
                "previewUrl": preview_url,
                "replacementTemplateId": replacement_id,
                "reason": "Validation test",
            },
        )

    assert response.status_code == 409
