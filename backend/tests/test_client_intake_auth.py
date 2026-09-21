from __future__ import annotations

from unittest.mock import patch

from fastapi.testclient import TestClient

from app import client_auth, main


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
        patch.object(client_auth, "supabase_auth_configured", return_value=True),
        patch.object(client_auth, "fetch_supabase_user", return_value=None),
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
        patch.object(client_auth, "supabase_auth_configured", return_value=True),
        patch.object(client_auth, "fetch_supabase_user", return_value=user),
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


def test_client_intake_session_survives_in_memory_cache_being_cleared():
    # Task #62: a Render restart wipes main.client_intake_sessions (a plain
    # in-memory dict) with nothing to fall back to, so a client mid-intake
    # would silently restart from a blank form (confirmed live via Render
    # logs -- a tester's session died on a deploy restart and the next
    # /api/client/intake-session call started a brand new, empty session).
    # This simulates exactly that: clear only the in-memory cache (not the
    # database) between two calls, and confirm the second call restores the
    # first call's draft instead of losing it.
    main.client_intake_sessions.clear()
    user = {"id": "user-1", "email": "owner@example.com"}
    with (
        patch.object(client_auth, "supabase_auth_configured", return_value=True),
        patch.object(client_auth, "fetch_supabase_user", return_value=user),
        TestClient(main.app) as client,
    ):
        first = client.post(
            "/api/client/intake-session",
            json={
                "name": "Reel Deal Marine",
                "draft": {"businessName": "Reel Deal Marine", "industry": "fishing gear"},
            },
            headers={"Authorization": "Bearer valid-token"},
        )
        assert first.status_code == 200
        first_body = first.json()
        assert first_body["clientEmail"] == "owner@example.com"

        # Simulate the process restarting: the in-memory cache is gone, but
        # the durable table (same sqlite file the TestClient's app is using)
        # is not.
        main.client_intake_sessions.clear()

        second = client.post(
            "/api/client/intake-session",
            json={"requestId": first_body["requestId"], "draft": {}},
            headers={"Authorization": "Bearer valid-token"},
        )

    assert second.status_code == 200
    second_body = second.json()
    assert second_body["requestId"] == first_body["requestId"]
    assert second_body["draft"]["businessName"] == "Reel Deal Marine"
    assert second_body["draft"]["industry"] == "fishing gear"
    assert second_body["restored"] is True
    main.client_intake_sessions.clear()
