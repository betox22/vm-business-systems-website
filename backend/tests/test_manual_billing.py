import json
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import billing, main, db as database
from app.db import Base, get_session
from app.db_models import AdminAuditEvent, PlatformSubscription, Store


OWNER = {"id": "owner", "email": "owner@example.test", "app_metadata": {},
         "user_metadata": {"kreaton_role": "super_admin"}}
ADMIN = {"id": "admin", "email": "admin@example.test", "app_metadata": {"kreaton_role": "super_admin"}}
SUPPORT = {"id": "support", "email": "support@example.test", "app_metadata": {"kreaton_role": "support"}}


@pytest.fixture
def api():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    factory = sessionmaker(engine)
    with factory() as session:
        session.add(Store(id="manual-store", owner_user_id="owner", owner_email=OWNER["email"],
                          name="Manual", business_type="retail", public_url="manual.example.test"))
        session.commit()

    def sessions():
        with factory() as session:
            yield session

    def user(token):
        return {"owner-token": OWNER, "admin-token": ADMIN, "support-token": SUPPORT}.get(token)

    main.app.dependency_overrides[get_session] = sessions
    try:
        with patch.object(main, "_enforce_rate_limit"), patch.object(main, "supabase_auth_configured", return_value=True), patch.object(main, "fetch_supabase_user", side_effect=user), patch.object(billing, "supabase_auth_configured", return_value=True), patch.object(billing, "fetch_supabase_user", side_effect=user), patch.dict("os.environ", {"STRIPE_KREATON_TRIAL_DAYS": "7"}), patch.object(billing, "checkout_session") as stripe:
            client = TestClient(main.app, base_url="https://api.vmbusinesssystems.com", raise_server_exceptions=False)
            yield client, factory, stripe
            client.close()
    finally:
        main.app.dependency_overrides.pop(get_session, None)
        engine.dispose()


def request_manual(client, **overrides):
    payload = dict(product="kreaton", planId="level_a", businessRef="manual-store", paymentMethod="manual",
                   successUrl="https://example.test", cancelUrl="https://example.test", countryCode="VE",
                   legalConsent=True, legalConsentVersion="es:test", manualPaymentReference="Transferencia / ref 123")
    payload.update(overrides)
    return client.post("/api/v1/billing/subscriptions/checkout", json=payload,
                       headers={"Authorization": "Bearer owner-token"})


def pending(client):
    response = request_manual(client)
    assert response.status_code == 200, response.text
    return response.json()["subscriptionId"]


def confirm(client, subscription_id, token="admin-token"):
    headers = {"X-Request-ID": "manual-confirm-test"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return client.post(f"/api/admin/subscriptions/{subscription_id}/confirm-manual", headers=headers)


@pytest.mark.parametrize("country", ["VE", "US"])
def test_manual_accepted_with_reference_plan_and_local_trial_without_stripe(api, country):
    client, factory, stripe = api
    with patch.object(billing.time, "time", return_value=1800000000):
        response = request_manual(client, countryCode=country, status="active")
    assert response.status_code == 200, response.text
    assert response.json()["status"] == "pending_manual_confirmation"
    with factory() as session:
        row = session.get(PlatformSubscription, response.json()["subscriptionId"])
        assert row.plan_id == "level_a"
        assert row.manual_payment_reference == "Transferencia / ref 123"
        assert row.trial_end == 1800000000 + 7 * 86400
        assert row.payment_method == "manual" and row.stripe_subscription_id is None
    stripe.assert_not_called()


def test_reference_optional_and_trial_zero_means_no_grace_period(api):
    client, factory, _ = api
    with patch.dict("os.environ", {"STRIPE_KREATON_TRIAL_DAYS": "0"}), patch.object(billing.time, "time", return_value=1800000000):
        response = request_manual(client, manualPaymentReference=None)
    with factory() as session:
        row = session.get(PlatformSubscription, response.json()["subscriptionId"])
        assert row.trial_end == 1800000000
        assert row.manual_payment_reference is None


@pytest.mark.parametrize("fields", [{"planId": ""}, {"manualPaymentReference": "x" * 241}])
def test_manual_request_validation(api, fields):
    client, factory, stripe = api
    assert request_manual(client, **fields).status_code == 422
    with factory() as session:
        assert session.scalar(select(PlatformSubscription)) is None
    stripe.assert_not_called()


@pytest.mark.parametrize("token,status", [(None, 401), ("expired", 401), ("owner-token", 403), ("support-token", 403)])
def test_confirmation_rejects_anon_invalid_owner_and_support(api, token, status):
    client, factory, _ = api
    sub_id = pending(client)
    response = confirm(client, sub_id, token)
    assert response.status_code == status, response.text
    with factory() as session:
        assert session.get(PlatformSubscription, sub_id).status == "pending_manual_confirmation"
        if token == "support-token":
            assert session.scalar(select(AdminAuditEvent)).outcome == "denied"


@pytest.mark.parametrize("cookie", [False, True])
def test_admin_confirmation_persists_with_audit_and_no_reconfirmation(api, cookie):
    client, factory, _ = api
    sub_id = pending(client)
    if cookie:
        client.cookies.set("kreaton_admin_session", "admin-token")
    response = confirm(client, sub_id, None if cookie else "admin-token")
    assert response.status_code == 200, response.text
    assert response.json()["confirmedBy"] == "admin"
    with factory() as session:
        row = session.get(PlatformSubscription, sub_id)
        assert row.status == "active"
        audit = session.get(AdminAuditEvent, response.json()["auditEventId"])
        assert audit.actor_user_id == "admin" and audit.actor_role == "super_admin"
        assert audit.created_at == response.json()["confirmedAt"]
        assert audit.target_id == sub_id and audit.request_id == "manual-confirm-test"
        assert audit.outcome == "success"
        assert json.loads(audit.metadata_json)["fromStatus"] == "pending_manual_confirmation"
        assert "ref 123" not in audit.metadata_json
    assert confirm(client, sub_id).status_code == 409
    assert request_manual(client).status_code == 409  # Owner cannot demote/restart it.
    with factory() as session:
        successes = session.scalars(select(AdminAuditEvent).where(AdminAuditEvent.outcome == "success")).all()
        assert len(successes) == 1


def test_pending_retry_does_not_extend_trial_or_create_second_record(api):
    client, factory, _ = api
    with patch.object(billing.time, "time", return_value=1800000000):
        sub_id = pending(client)
    with patch.object(billing.time, "time", return_value=1900000000):
        response = request_manual(client, manualPaymentReference="Nueva referencia")
    assert response.json()["subscriptionId"] == sub_id
    with factory() as session:
        rows = session.scalars(select(PlatformSubscription)).all()
        assert len(rows) == 1 and rows[0].trial_end == 1800000000 + 7 * 86400


@pytest.mark.parametrize("event_type", ["checkout.session.completed", "invoice.paid", "invoice.payment_failed",
    "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"])
def test_stripe_events_cannot_confirm_or_overwrite_manual_trial(api, event_type):
    client, factory, _ = api
    sub_id = pending(client)
    with factory() as session:
        row = session.get(PlatformSubscription, sub_id)
        original_trial = row.trial_end
        billing.process_billing_event(session, {"id": "evt_test_manual", "type": event_type,
            "data": {"object": {"id": "sub_test", "status": "active", "trial_end": 1,
                               "metadata": {"platform_subscription_id": sub_id}}}})
        session.expire_all()
        assert row.trial_end == original_trial and row.status == "pending_manual_confirmation"
        assert row.stripe_subscription_id is None


def test_confirmation_requires_pending_manual_kreaton_and_rolls_back_on_audit_failure(api):
    client, factory, _ = api
    assert confirm(client, "missing").status_code == 404
    sub_id = pending(client)
    def fail_audit(mapper, connection, target):
        raise RuntimeError("audit unavailable")
    event.listen(AdminAuditEvent, "before_insert", fail_audit)
    try:
        assert confirm(client, sub_id).status_code == 500
    finally:
        event.remove(AdminAuditEvent, "before_insert", fail_audit)
    with factory() as session:
        row = session.get(PlatformSubscription, sub_id)
        assert row.status == "pending_manual_confirmation"
        row.payment_method = "stripe"
        session.commit()
    assert confirm(client, sub_id).status_code == 409
    with factory() as session:
        row = session.get(PlatformSubscription, sub_id)
        row.product = "listo_pos"
        session.commit()
    assert confirm(client, sub_id).status_code == 404


def test_manual_reference_migration_is_additive_repeatable(monkeypatch):
    engine = create_engine("sqlite://")
    try:
        with engine.begin() as connection:
            connection.exec_driver_sql("CREATE TABLE platform_subscriptions (id TEXT PRIMARY KEY)")
            connection.exec_driver_sql("INSERT INTO platform_subscriptions VALUES ('legacy')")
        monkeypatch.setattr(database, "engine", engine)
        database._ensure_additive_columns()
        database._ensure_additive_columns()
        with engine.connect() as connection:
            assert connection.exec_driver_sql("SELECT manual_payment_reference FROM platform_subscriptions WHERE id='legacy'").scalar_one() is None
    finally:
        engine.dispose()
