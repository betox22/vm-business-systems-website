import json
from unittest.mock import patch

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app import client_auth, main
from app.catalog_sync import sync_site_catalog_to_commerce
from app.db import get_session
from app.db_models import GeneratedSite, Product
from test_catalog_sync import item
from test_client_site_update import OWNER, _client_and_session, _schema


def test_password_login_success():
    main._rate_limit_buckets.clear()
    result = {"access_token": "test-access", "refresh_token": "test-refresh", "user": OWNER}
    with patch.dict("os.environ", {"SUPABASE_URL": "https://auth.example", "SUPABASE_SERVICE_ROLE_KEY": "server-key"}), patch.object(client_auth.httpx, "post", return_value=httpx.Response(200, json=result)) as upstream:
        response = TestClient(main.app).post("/api/client/auth/login", json={"email": " owner@example.com ", "password": "test-password", "businessId": "untrusted"})
    assert response.status_code == 200
    assert response.json() == result
    assert response.headers["cache-control"] == "no-store"
    assert upstream.call_args.args == ("https://auth.example/auth/v1/token?grant_type=password",)
    assert upstream.call_args.kwargs["json"] == {"email": "owner@example.com", "password": "test-password"}
    assert upstream.call_args.kwargs["headers"] == {"apikey": "server-key"}


@pytest.mark.parametrize("failure", [httpx.Response(400, json={"message": "Internal auth details"}), httpx.Response(200, json={}), httpx.ConnectError("private upstream error")])
def test_password_login_generic_failure(failure, caplog):
    main._rate_limit_buckets.clear()
    with patch.object(client_auth, "supabase_auth_configured", return_value=True), patch.dict("os.environ", {"SUPABASE_URL": "https://auth.example", "SUPABASE_SERVICE_ROLE_KEY": "key"}), patch.object(client_auth.httpx, "post", **({"side_effect": failure} if isinstance(failure, Exception) else {"return_value": failure})):
        response = TestClient(main.app).post("/api/client/auth/login", json={"email": "owner@example.com", "password": "secret-password"})
    assert response.status_code == 401
    assert response.json() == {"detail": "Credenciales invalidas"}
    assert "secret-password" not in caplog.text
    assert "Internal auth" not in caplog.text


def test_password_login_unconfigured():
    main._rate_limit_buckets.clear()
    with patch.object(client_auth, "supabase_auth_configured", return_value=False), patch.object(client_auth.httpx, "post") as upstream:
        response = TestClient(main.app).post("/api/client/auth/login", json={"email": "owner@example.com", "password": "test"})
    assert response.status_code == 503
    upstream.assert_not_called()


def test_login_cookie_product_patch_reload_public_overlay():
    """Real HTTP handlers and DB; only external Supabase is mocked, not a live login."""
    engine, factory, client = _client_and_session()
    client.base_url = httpx.URL("https://luma-api.vmbusinesssystems.com")
    main._rate_limit_buckets.clear()
    try:
        with factory() as db:
            row = db.get(GeneratedSite, "site-owner")
            schema = _schema("Owner store")
            schema["catalog_items"] = [item()]
            row.generated_config = json.dumps(schema)
            sync_site_catalog_to_commerce(db, row)
            db.commit()
            product_id = db.scalar(select(Product)).id
        with patch.dict("os.environ", {"SUPABASE_URL": "https://auth.example", "SUPABASE_SERVICE_ROLE_KEY": "key"}), patch.object(client_auth.httpx, "post", return_value=httpx.Response(200, json={"access_token": "test-token", "refresh_token": "refresh", "user": OWNER})), patch.object(client_auth, "fetch_supabase_user", return_value=OWNER), patch.object(main, "fetch_supabase_user", return_value=OWNER):
            login = client.post("/api/client/auth/login", json={"email": OWNER["email"], "password": "test"})
            assert login.status_code == 200
            assert client.post("/api/client/auth/session", json={"access_token": login.json()["access_token"]}).status_code == 200
            assert client.get("/api/client/auth/me").status_code == 200
            path = "/api/v1/store-owner/store-owner/products"
            assert client.patch(f"{path}/{product_id}", json={"name": "Updated from portal", "price": 38.25}).status_code == 200
            reloaded = client.get(path).json()["products"]
            assert next(p for p in reloaded if p["id"] == product_id)["price"] == 38.25
            public = client.get("/public/sites/site-owner").json()
            assert public["catalog_items"][0]["name"] == "Updated from portal"
            assert public["catalog_items"][0]["price"] == 38.25
    finally:
        client.close()
        main.app.dependency_overrides.pop(get_session, None)
        engine.dispose()
