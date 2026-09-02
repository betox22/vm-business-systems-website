from __future__ import annotations

from unittest.mock import patch

from fastapi.testclient import TestClient

from app import main


def _payload(email: str = "forged@example.com") -> dict:
    return {
        "email": email,
        "name": "Cached project",
        "draft": {"businessName": "Cached project"},
    }


def test_client_intake_session_rejects_cached_email_without_confirmed_auth():
    main.client_intake_sessions.clear()
    with TestClient(main.app) as client:
        response = client.post("/api/client/intake-session", json=_payload())

    assert response.status_code == 401
    assert response.json()["detail"] == "Missing access token."
    assert main.client_intake_sessions == {}


def test_client_intake_session_rejects_invalid_token_without_mutating_cached_account():
    main.client_intake_sessions.clear()
    with (
        patch.object(main, "supabase_auth_configured", return_value=True),
        patch.object(main, "fetch_supabase_user", return_value=None),
        TestClient(main.app) as client,
    ):
        response = client.post(
            "/api/client/intake-session",
            json=_payload("victim@example.com"),
            headers={"Authorization": "Bearer expired-token"},
        )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid or expired session."
    assert main.client_intake_sessions == {}


def test_client_intake_session_uses_confirmed_identity_not_payload_email():
    main.client_intake_sessions.clear()
    user = {"id": "user-1", "email": "owner@example.com"}
    with (
        patch.object(main, "supabase_auth_configured", return_value=True),
        patch.object(main, "fetch_supabase_user", return_value=user),
        TestClient(main.app) as client,
    ):
        response = client.post(
            "/api/client/intake-session",
            json=_payload("forged@example.com"),
            headers={"Authorization": "Bearer valid-token"},
        )

    assert response.status_code == 200
    assert response.json()["clientEmail"] == "owner@example.com"
    assert all("forged@example.com" not in key for key in main.client_intake_sessions)
    main.client_intake_sessions.clear()
