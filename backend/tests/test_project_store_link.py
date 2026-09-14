from unittest.mock import patch

from app import client_auth, main
from app.db import get_session
from test_client_site_update import OWNER, OTHER_OWNER, _client_and_session


def test_project_listing_exposes_store_id_and_preserves_owner_boundary():
    engine, factory, client = _client_and_session()
    try:
        client.cookies.set("luma_client_session", "valid-session")
        with patch.object(client_auth, "supabase_auth_configured", return_value=True), patch.object(client_auth, "fetch_supabase_user", return_value=OWNER):
            response = client.get("/api/client/projects")
            assert response.status_code == 200
            assert response.json()["projects"][0]["store_id"] == "store-owner"
            assert response.json()["projects"][0]["id"] == "site-owner"
            assert client.get("/api/client/projects/site-owner").status_code == 200
        with patch.object(client_auth, "supabase_auth_configured", return_value=True), patch.object(client_auth, "fetch_supabase_user", return_value=OTHER_OWNER):
            assert client.get("/api/client/projects").json()["projects"] == []
            assert client.get("/api/client/projects/site-owner").status_code == 404
    finally:
        client.close()
        main.app.dependency_overrides.pop(get_session, None)
        engine.dispose()
