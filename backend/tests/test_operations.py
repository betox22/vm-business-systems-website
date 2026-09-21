from __future__ import annotations

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import main, operations
from app.db import Base, get_session
from app.db_models import GeneratedSite, Order, PlatformSubscription, Product, Store
from app.operations_auth import operations_identity_from_user


@pytest.fixture()
def operations_database():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    factory = sessionmaker(bind=engine)

    def override_get_session():
        with factory() as session:
            yield session

    main.app.dependency_overrides[get_session] = override_get_session
    try:
        yield factory
    finally:
        main.app.dependency_overrides.pop(get_session, None)
        engine.dispose()


def _user(role="vm_super_admin"):
    return {"id": "vm-admin-1", "email": "owner@example.com", "app_metadata": {"vm_role": role}}


def _seed(factory):
    with factory() as session:
        store = Store(id="store-ops", owner_email="client@example.com", name="Bath All Day", business_type="retail", public_url="bath.usekreaton.com", status="published")
        session.add(store)
        session.flush()
        session.add_all([
            PlatformSubscription(id="sub-k", product="kreaton", business_ref=store.id, plan_id="level_a", status="trialing"),
            PlatformSubscription(id="sub-other", product="listo_pos", business_ref=store.id, status="active"),
            Product(id="prod-ops", store_id=store.id, name="Bath Bomb", category="Bath", price_cents=1200, inventory=8, status="Published"),
            Order(id="ord-ops", store_id=store.id, order_number="K-100", item_count=1, total_cents=1200, status="paid", payment_json='{"provider":"stripe"}'),
            GeneratedSite(id="site-ops", store_id=store.id, owner_email="client@example.com", business_name="Bath All Day", business_type="retail", template_id="premium-product-store", template_name="Premium Product", template_mode="store", domain_slug="bath", public_url="bath.usekreaton.com", status="published"),
        ])
        session.commit()


def test_operations_role_is_separate_and_support_cannot_read_payments():
    support = operations_identity_from_user(_user("vm_support"))
    assert support is not None
    assert "payments:read" not in support["permissions"]
    assert operations_identity_from_user({"id": "x", "app_metadata": {"kreaton_role": "support"}}) is None


def test_legacy_kreaton_super_admin_bridge_is_explicit():
    identity = operations_identity_from_user({"id": "owner", "email": "owner@example.com", "app_metadata": {"kreaton_role": "super_admin"}})
    assert identity is not None
    assert identity["role"] == "vm_super_admin"
    assert identity["legacyRoleBridge"] is True


def test_operations_session_uses_its_own_secure_cookie(operations_database):
    with (
        patch.object(operations, "supabase_auth_configured", return_value=True),
        patch.object(operations, "fetch_supabase_user", return_value=_user()),
        TestClient(main.app, base_url="https://api.vmbusinesssystems.com") as client,
    ):
        response = client.post("/api/operations/auth/session", json={"access_token": "token"})
    assert response.status_code == 200
    cookie = response.headers["set-cookie"]
    assert "vm_operations_session=" in cookie
    assert "kreaton_admin_session=" not in cookie
    assert "Path=/api/operations" in cookie
    assert "HttpOnly" in cookie


def test_operations_overview_and_payments_use_real_database_rows(operations_database):
    _seed(operations_database)
    with (
        patch.object(operations, "supabase_auth_configured", return_value=True),
        patch.object(operations, "fetch_supabase_user", return_value=_user()),
        TestClient(main.app, base_url="https://api.vmbusinesssystems.com") as client,
    ):
        overview = client.get("/api/operations/overview", headers={"Authorization": "Bearer token"})
        payments = client.get("/api/operations/payments", headers={"Authorization": "Bearer token"})

    assert overview.status_code == 200
    assert overview.json()["businesses"] == 1
    assert not {"revenueCents", "orders", "pendingPayments"} & overview.json().keys()
    assert payments.status_code == 200
    assert payments.json()["source"] == "platform_subscriptions"
    assert payments.json()["items"] == [{"id": "sub-k", "business": "Bath All Day",
        "planId": "level_a", "status": "trialing", "paymentMethod": "stripe",
        "stripePriceId": None, "trialEnd": None, "currentPeriodEnd": None}]
    assert "ord-ops" not in payments.text and "K-100" not in payments.text


@pytest.mark.parametrize("role", ["vm_super_admin", "vm_operations", "vm_finance", "vm_support"])
def test_corporate_roles_cannot_read_store_orders(operations_database, role):
    _seed(operations_database)
    with patch.object(operations, "supabase_auth_configured", return_value=True), \
         patch.object(operations, "fetch_supabase_user", return_value=_user(role)), \
         TestClient(main.app) as client:
        response = client.get("/api/operations/orders", headers={"Authorization": "Bearer token"})
    assert response.status_code == 403
    assert "ord-ops" not in response.text


def test_vm_support_is_denied_finance_view(operations_database):
    with (
        patch.object(operations, "supabase_auth_configured", return_value=True),
        patch.object(operations, "fetch_supabase_user", return_value=_user("vm_support")),
        TestClient(main.app, base_url="https://api.vmbusinesssystems.com") as client,
    ):
        response = client.get("/api/operations/payments", headers={"Authorization": "Bearer token"})
    assert response.status_code == 403
