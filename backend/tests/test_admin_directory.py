from __future__ import annotations

from unittest.mock import Mock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app import main
from app.admin_directory import fetch_supabase_admin_users
from app.db import Base, get_session
from app.db_models import AdminAuditEvent, GeneratedSite, Store


ADMIN_USER = {
    "id": "admin-1",
    "email": "support@kreaton.test",
    "app_metadata": {"kreaton_role": "support"},
}


@pytest.fixture()
def admin_directory_database():
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


def _auth_users():
    return [
        {
            "id": "user-store",
            "email": "owner@example.com",
            "created_at": "2026-08-20T10:00:00Z",
            "last_sign_in_at": "2026-08-22T10:00:00Z",
            "email_confirmed_at": "2026-08-20T10:05:00Z",
        },
        {
            "id": "user-empty",
            "email": "new@example.com",
            "created_at": "2026-08-21T10:00:00Z",
            "email_confirmed_at": "2026-08-21T10:05:00Z",
        },
        {
            "id": "user-unverified",
            "email": "waiting@example.com",
            "created_at": "2026-08-19T10:00:00Z",
        },
    ]


def _seed_project(session_factory):
    with session_factory() as session:
        store = Store(
            id="store-1",
            owner_user_id="user-store",
            owner_email="owner@example.com",
            name="Bath All Day",
            business_type="bath_products",
            public_url="bath-all-day.usekreaton.com",
            status="published",
        )
        site = GeneratedSite(
            id="site-1",
            store_id=store.id,
            owner_user_id="user-store",
            owner_email="owner@example.com",
            business_name="Bath All Day",
            business_type="bath_products",
            template_id="premium-product-store",
            template_name="Premium Product Store",
            template_mode="store",
            domain_slug="bath-all-day",
            public_url="bath-all-day.usekreaton.com",
            status="draft",
        )
        session.add_all([store, site])
        session.commit()


def test_directory_includes_auth_accounts_without_projects_and_audits_query(
    admin_directory_database,
):
    _seed_project(admin_directory_database)
    with (
        patch.object(main, "supabase_auth_configured", return_value=True),
        patch.object(main, "fetch_supabase_user", return_value=ADMIN_USER),
        patch.object(main, "fetch_supabase_admin_users", return_value=_auth_users()),
        TestClient(main.app, base_url="https://api.vmbusinesssystems.com") as client,
    ):
        response = client.get(
            "/api/admin/clients",
            headers={"Authorization": "Bearer valid-admin", "X-Request-ID": "req-directory-1"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["pagination"]["total"] == 3
    empty = next(item for item in body["clients"] if item["id"] == "user-empty")
    assert empty["projectCount"] == 0
    assert empty["businessName"] == ""
    owner = next(item for item in body["clients"] if item["id"] == "user-store")
    assert owner["businessName"] == "Bath All Day"
    assert owner["templateIds"] == ["premium-product-store"]
    assert owner["projects"][0]["status"] == "draft"

    with admin_directory_database() as session:
        event = session.scalar(select(AdminAuditEvent))
    assert event is not None
    assert event.action == "admin.clients.queried"
    assert event.outcome == "success"
    assert event.request_id == "req-directory-1"
    assert "valid-admin" not in event.metadata_json


def test_directory_searches_business_and_filters_status_and_template(
    admin_directory_database,
):
    _seed_project(admin_directory_database)
    with (
        patch.object(main, "supabase_auth_configured", return_value=True),
        patch.object(main, "fetch_supabase_user", return_value=ADMIN_USER),
        patch.object(main, "fetch_supabase_admin_users", return_value=_auth_users()),
        TestClient(main.app, base_url="https://api.vmbusinesssystems.com") as client,
    ):
        business = client.get("/api/admin/clients?q=bath", headers={"Authorization": "Bearer admin"})
        template = client.get(
            "/api/admin/clients?template_id=premium-product-store",
            headers={"Authorization": "Bearer admin"},
        )
        unverified = client.get(
            "/api/admin/clients?status=unverified",
            headers={"Authorization": "Bearer admin"},
        )
        no_projects = client.get(
            "/api/admin/clients?status=no_projects",
            headers={"Authorization": "Bearer admin"},
        )

    assert [item["id"] for item in business.json()["clients"]] == ["user-store"]
    assert [item["id"] for item in template.json()["clients"]] == ["user-store"]
    assert [item["id"] for item in unverified.json()["clients"]] == ["user-unverified"]
    assert {item["id"] for item in no_projects.json()["clients"]} == {
        "user-empty",
        "user-unverified",
    }
    with admin_directory_database() as session:
        events = session.scalars(select(AdminAuditEvent)).all()
    assert len(events) == 4
    assert all(event.action == "admin.clients.queried" for event in events)


def test_directory_audits_supabase_failure_without_exposing_details(admin_directory_database):
    with (
        patch.object(main, "supabase_auth_configured", return_value=True),
        patch.object(main, "fetch_supabase_user", return_value=ADMIN_USER),
        patch.object(
            main,
            "fetch_supabase_admin_users",
            side_effect=main.SupabaseAdminDirectoryError("secret upstream detail"),
        ),
        TestClient(main.app, base_url="https://api.vmbusinesssystems.com") as client,
    ):
        response = client.get(
            "/api/admin/clients",
            headers={"Authorization": "Bearer valid-admin", "X-Request-ID": "req-directory-fail"},
        )

    assert response.status_code == 502
    assert response.json()["detail"] == "Client directory is temporarily unavailable."
    with admin_directory_database() as session:
        event = session.scalar(select(AdminAuditEvent))
    assert event is not None
    assert event.outcome == "failure"
    assert "secret upstream detail" not in event.metadata_json


def test_supabase_admin_users_use_service_role_only_server_side(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://project.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "server-secret")
    first = Mock(status_code=200)
    first.json.return_value = {"users": [{"id": "one"}, {"id": "two"}]}
    second = Mock(status_code=200)
    second.json.return_value = {"users": [{"id": "three"}]}

    with patch("app.admin_directory.httpx.get", side_effect=[first, second]) as get:
        users = fetch_supabase_admin_users(page_size=2)

    assert [user["id"] for user in users] == ["one", "two", "three"]
    assert get.call_count == 2
    assert get.call_args_list[0].kwargs["headers"] == {
        "Authorization": "Bearer server-secret",
        "apikey": "server-secret",
    }
    assert get.call_args_list[0].kwargs["params"] == {"page": 1, "per_page": 2}
    assert get.call_args_list[1].kwargs["params"] == {"page": 2, "per_page": 2}
