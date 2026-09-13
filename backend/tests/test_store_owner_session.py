from unittest.mock import patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import client_auth, commerce
from app.db import Base, get_session
from app.db_models import Store


@pytest.fixture
def client():
    engine = create_engine("sqlite://", poolclass=StaticPool,
                           connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine)
    with sessions() as db:
        for store_id, owner_id in [("owned", "owner"), ("other", "other"), ("legacy", None)]:
            db.add(Store(id=store_id, owner_user_id=owner_id,
                         owner_email="owner@example.com", name=store_id,
                         business_type="retail", public_url="example.com"))
        db.commit()

    def database():
        with sessions() as db:
            yield db

    app = FastAPI()
    app.include_router(commerce.router)
    app.dependency_overrides[get_session] = database
    users = {
        "owner-token": {"id": "owner", "email": "owner@example.com"},
        "intruder-token": {"id": "intruder", "email": "intruder@example.com"},
    }
    with (
        patch.object(client_auth, "supabase_auth_configured", return_value=True),
        patch.object(client_auth, "fetch_supabase_user", side_effect=users.get),
        TestClient(app) as http,
    ):
        yield http
    engine.dispose()


@pytest.mark.parametrize("store,token,bearer,expected", [
    ("owned", "owner-token", False, 200),
    ("owned", "intruder-token", False, 403),
    ("owned", "owner-token", True, 200),
    ("owned", None, False, 401),
    ("legacy", "owner-token", False, 200),
    ("other", "owner-token", False, 403),
    ("owned", "invalid-token", False, 401),
    ("owned", "invalid-token", True, 401),
])
def test_owner_session_contract(client, store, token, bearer, expected):
    headers = {}
    if token and bearer:
        headers["Authorization"] = f"Bearer {token}"
    elif token:
        client.cookies.set("luma_client_session", token)
    response = client.get(f"/api/v1/store-owner/{store}/products", headers=headers)
    assert response.status_code == expected, response.text
    if expected == 200:
        assert response.json() == {"businessId": store, "products": []}


def test_invalid_bearer_does_not_fall_back_to_valid_cookie(client):
    client.cookies.set("luma_client_session", "owner-token")
    response = client.get("/api/v1/store-owner/owned/products",
                          headers={"Authorization": "Bearer invalid-token"})
    assert response.status_code == 401


OWNER_ROUTES = [route for route in commerce.router.routes
                if route.path.startswith("/api/v1/store-owner/")]


@pytest.mark.parametrize("route", OWNER_ROUTES, ids=lambda route: route.name)
def test_every_owner_route_requires_shared_session(client, route):
    assert any(dependency.call is client_auth.require_client_user
               for dependency in route.dependant.dependencies)
    path = route.path.format(business_id="owned", product_id="unknown", order_id="unknown")
    method = sorted(route.methods)[0]
    assert client.request(method, path, json={}).status_code == 401
    client.cookies.set("luma_client_session", "intruder-token")
    # GET handlers need no body and must reach the ownership check.
    if method == "GET":
        assert client.get(path).status_code == 403
