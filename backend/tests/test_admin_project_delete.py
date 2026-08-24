from __future__ import annotations

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import main
from app.db import Base, get_session
from app.db_models import AdminAuditEvent, DomainReservation, GeneratedSite, Store
from app.storage import StorageError


def _admin_user(role: str):
    return {
        "id": f"admin-{role}",
        "email": f"{role}@kreaton.test",
        "app_metadata": {"kreaton_role": role},
    }


@pytest.fixture()
def admin_project_database():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(bind=engine)
    with session_factory() as session:
        store = Store(
            id="store-client",
            owner_user_id="client-1",
            owner_email="client@example.com",
            name="Bath All Day",
            business_type="beauty",
            public_url="bath-all-day.usekreaton.com",
            status="draft",
        )
        site = GeneratedSite(
            id="site-client",
            store_id=store.id,
            owner_user_id="client-1",
            owner_email="client@example.com",
            business_name="Bath All Day",
            business_type="beauty",
            template_id="premium-product-store",
            template_name="Premium Product Store",
            template_mode="commerce",
            domain_slug="bath-all-day",
            public_url="bath-all-day.usekreaton.com",
            status="draft",
        )
        reservation = DomainReservation(
            id="domain-client",
            generated_site_id=site.id,
            store_id=store.id,
            owner_email="client@example.com",
            requested_domain="bathallday.com",
            assigned_domain="bath-all-day.usekreaton.com",
            availability_status="assigned",
            purchase_status="pending",
            price_cents=0,
            retail_price_cents=0,
        )
        session.add_all([store, site, reservation])
        session.commit()

    def override_get_session():
        with session_factory() as session:
            yield session

    main.app.dependency_overrides[get_session] = override_get_session
    main.client_intake_sessions.clear()
    main.client_intake_sessions["client@example.com:site-client"] = {
        "clientEmail": "client@example.com",
        "projectId": "site-client",
    }
    try:
        yield session_factory
    finally:
        main.client_intake_sessions.clear()
        main.app.dependency_overrides.pop(get_session, None)
        engine.dispose()


def _delete(client: TestClient, business_name: str = "Bath All Day"):
    return client.request(
        "DELETE",
        "/api/admin/clients/site-client",
        json={"businessName": business_name},
        headers={"Authorization": "Bearer admin-token", "X-Request-ID": "req-admin-delete"},
    )


def test_super_admin_can_delete_another_clients_project_completely(admin_project_database):
    with (
        patch.object(main, "supabase_auth_configured", return_value=True),
        patch.object(main, "fetch_supabase_user", return_value=_admin_user("super_admin")),
        patch.object(main, "delete_site_assets_from_supabase", return_value=4) as delete_assets,
        TestClient(main.app, base_url="https://api.vmbusinesssystems.com") as client,
    ):
        response = _delete(client)

    assert response.status_code == 200
    assert response.json() == {
        "deleted": True,
        "project_id": "site-client",
        "business_name": "Bath All Day",
        "deleted_assets": 4,
        "deleted_intake_sessions": 1,
    }
    delete_assets.assert_called_once_with(business_id="store-client", site_id="site-client")
    with admin_project_database() as session:
        assert session.get(GeneratedSite, "site-client") is None
        assert session.get(Store, "store-client") is not None
        assert session.get(DomainReservation, "domain-client").generated_site_id is None
        audit = session.scalar(select(AdminAuditEvent))
    assert audit is not None
    assert audit.action == "admin.project.deleted"
    assert audit.outcome == "success"
    assert audit.actor_role == "super_admin"
    assert audit.request_id == "req-admin-delete"
    assert "client@example.com:site-client" not in main.client_intake_sessions


def test_support_cannot_delete_client_project_and_denial_is_audited(admin_project_database):
    with (
        patch.object(main, "supabase_auth_configured", return_value=True),
        patch.object(main, "fetch_supabase_user", return_value=_admin_user("support")),
        patch.object(main, "delete_site_assets_from_supabase") as delete_assets,
        TestClient(main.app, base_url="https://api.vmbusinesssystems.com") as client,
    ):
        response = _delete(client)

    assert response.status_code == 403
    delete_assets.assert_not_called()
    with admin_project_database() as session:
        assert session.get(GeneratedSite, "site-client") is not None
        audit = session.scalar(select(AdminAuditEvent))
    assert audit is not None
    assert audit.outcome == "denied"
    assert audit.actor_role == "support"


def test_admin_delete_requires_exact_business_name_and_audits_failure(admin_project_database):
    with (
        patch.object(main, "supabase_auth_configured", return_value=True),
        patch.object(main, "fetch_supabase_user", return_value=_admin_user("super_admin")),
        patch.object(main, "delete_site_assets_from_supabase") as delete_assets,
        TestClient(main.app, base_url="https://api.vmbusinesssystems.com") as client,
    ):
        response = _delete(client, "Different Business")

    assert response.status_code == 409
    delete_assets.assert_not_called()
    with admin_project_database() as session:
        assert session.get(GeneratedSite, "site-client") is not None
        audit = session.scalar(select(AdminAuditEvent))
    assert audit is not None
    assert audit.outcome == "failure"
    assert "business_name_mismatch" in audit.metadata_json


def test_admin_delete_missing_project_is_audited(admin_project_database):
    with (
        patch.object(main, "supabase_auth_configured", return_value=True),
        patch.object(main, "fetch_supabase_user", return_value=_admin_user("super_admin")),
        TestClient(main.app, base_url="https://api.vmbusinesssystems.com") as client,
    ):
        response = client.request(
            "DELETE",
            "/api/admin/clients/site-missing",
            json={"businessName": "Missing"},
            headers={"Authorization": "Bearer admin-token"},
        )

    assert response.status_code == 404
    with admin_project_database() as session:
        audit = session.scalar(select(AdminAuditEvent))
    assert audit is not None
    assert audit.target_id == "site-missing"
    assert "not_found" in audit.metadata_json


def test_admin_delete_asset_failure_keeps_project_and_is_audited(admin_project_database):
    with (
        patch.object(main, "supabase_auth_configured", return_value=True),
        patch.object(main, "fetch_supabase_user", return_value=_admin_user("super_admin")),
        patch.object(
            main,
            "delete_site_assets_from_supabase",
            side_effect=StorageError("storage unavailable"),
        ),
        TestClient(main.app, base_url="https://api.vmbusinesssystems.com") as client,
    ):
        response = _delete(client)

    assert response.status_code == 502
    with admin_project_database() as session:
        assert session.get(GeneratedSite, "site-client") is not None
        audit = session.scalar(select(AdminAuditEvent))
    assert audit is not None
    assert audit.outcome == "failure"
    assert "asset_deletion_failed" in audit.metadata_json
    assert "storage unavailable" not in audit.metadata_json
