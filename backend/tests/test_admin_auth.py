from __future__ import annotations

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app import main
from app.db import Base, get_session
from app.db_models import AdminAuditEvent


@pytest.fixture(autouse=True)
def isolated_admin_database():
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


def _supabase_user(role: str | None, *, user_metadata_role: str | None = None):
    app_metadata = {"provider": "google"}
    if role:
        app_metadata["kreaton_role"] = role
    user_metadata = {}
    if user_metadata_role:
        user_metadata["kreaton_role"] = user_metadata_role
    return {
        "id": "admin-user-1",
        "email": "admin@example.com",
        "app_metadata": app_metadata,
        "user_metadata": user_metadata,
    }


def test_super_admin_session_sets_separate_secure_cookie_and_permissions(isolated_admin_database):
    with (
        patch.object(main, "supabase_auth_configured", return_value=True),
        patch.object(main, "fetch_supabase_user", return_value=_supabase_user("super_admin")),
        TestClient(main.app, base_url="https://api.vmbusinesssystems.com") as client,
    ):
        response = client.post(
            "/api/admin/auth/session",
            json={"access_token": "valid-token"},
            headers={"X-Request-ID": "req-admin-login-1"},
        )

    assert response.status_code == 200
    assert response.json()["role"] == "super_admin"
    assert "sites:delete" in response.json()["permissions"]
    assert "roles:write" in response.json()["permissions"]
    cookie = response.headers["set-cookie"]
    assert "kreaton_admin_session=" in cookie
    assert "luma_client_session=" not in cookie
    assert "HttpOnly" in cookie
    assert "Secure" in cookie
    assert "SameSite=none" in cookie
    assert "Path=/api/admin" in cookie
    assert response.headers["X-Request-ID"] == "req-admin-login-1"
    with isolated_admin_database() as session:
        event = session.scalar(select(AdminAuditEvent))
    assert event is not None
    assert event.action == "admin.auth.session_started"
    assert event.actor_role == "super_admin"
    assert event.request_id == "req-admin-login-1"


def test_support_session_is_read_only_and_me_accepts_admin_cookie():
    with (
        patch.object(main, "supabase_auth_configured", return_value=True),
        patch.object(main, "fetch_supabase_user", return_value=_supabase_user("support")),
        TestClient(main.app, base_url="https://api.vmbusinesssystems.com") as client,
    ):
        session_response = client.post("/api/admin/auth/session", json={"access_token": "valid-token"})
        me_response = client.get("/api/admin/auth/me")

    assert session_response.status_code == 200
    assert me_response.status_code == 200
    assert me_response.json()["role"] == "support"
    assert "clients:read" in me_response.json()["permissions"]
    assert "sites:delete" not in me_response.json()["permissions"]
    assert "roles:write" not in me_response.json()["permissions"]
    assert "templates:write" not in me_response.json()["permissions"]


def test_user_metadata_cannot_grant_admin_access():
    forged_user = _supabase_user(None, user_metadata_role="super_admin")
    with (
        patch.object(main, "supabase_auth_configured", return_value=True),
        patch.object(main, "fetch_supabase_user", return_value=forged_user),
        TestClient(main.app, base_url="https://api.vmbusinesssystems.com") as client,
    ):
        response = client.post("/api/admin/auth/session", json={"access_token": "valid-token"})

    assert response.status_code == 403
    assert "kreaton_admin_session=" not in response.headers.get("set-cookie", "")


def test_vm_super_admin_can_manage_integrated_kreaton_modules():
    user = _supabase_user(None)
    user["app_metadata"]["vm_role"] = "vm_super_admin"
    with (
        patch.object(main, "supabase_auth_configured", return_value=True),
        patch.object(main, "fetch_supabase_user", return_value=user),
        TestClient(main.app, base_url="https://api.vmbusinesssystems.com") as client,
    ):
        response = client.get("/api/admin/auth/me", headers={"Authorization": "Bearer vm-token"})

    assert response.status_code == 200
    assert response.json()["role"] == "super_admin"
    assert "templates:write" in response.json()["permissions"]


def test_admin_me_rejects_client_without_admin_role():
    with (
        patch.object(main, "supabase_auth_configured", return_value=True),
        patch.object(main, "fetch_supabase_user", return_value=_supabase_user(None)),
        TestClient(main.app, base_url="https://api.vmbusinesssystems.com") as client,
    ):
        response = client.get("/api/admin/auth/me", headers={"Authorization": "Bearer client-token"})

    assert response.status_code == 403


def test_admin_logout_only_clears_admin_cookie():
    with TestClient(main.app, base_url="https://api.vmbusinesssystems.com") as client:
        response = client.post("/api/admin/auth/logout")

    assert response.status_code == 200
    cookie = response.headers["set-cookie"]
    assert "kreaton_admin_session=" in cookie
    assert "luma_client_session=" not in cookie
    assert "Max-Age=0" in cookie
