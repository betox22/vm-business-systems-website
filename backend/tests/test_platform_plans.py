import json
from unittest.mock import patch, MagicMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import main, billing, platform_plans, stripe_gateway
from app.db import Base, get_session
from app.db_models import PlatformPlan, PlatformSubscription, AdminAuditEvent, Store
from app.manual_trial_expiry import expire_manual_trials

ADMIN = {"id": "admin", "email": "admin@test.invalid", "app_metadata": {"kreaton_role": "super_admin"}}
SUPPORT = {**ADMIN, "id": "support", "app_metadata": {"kreaton_role": "support"}}
OWNER = {"id": "owner", "email": "owner@test.invalid", "app_metadata": {}}
ACTOR = {"id": "admin", "email": ADMIN["email"], "role": "super_admin"}


@pytest.fixture
def api():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    factory = sessionmaker(engine)
    def sessions():
        with factory() as session:
            yield session
    main.app.dependency_overrides[get_session] = sessions
    with factory() as session:
        session.add(Store(id="s", owner_user_id="owner", owner_email=OWNER["email"], name="Test", business_type="retail", public_url=""))
        session.commit()
    lookup = lambda token: {"admin": ADMIN, "support": SUPPORT, "owner": OWNER}.get(token)
    try:
        with patch.object(main, "_enforce_rate_limit"), patch.object(main, "supabase_auth_configured", return_value=True), patch.object(main, "fetch_supabase_user", side_effect=lookup), patch.object(billing, "supabase_auth_configured", return_value=True), patch.object(billing, "fetch_supabase_user", side_effect=lookup):
            with TestClient(main.app, base_url="https://test.invalid") as client:
                yield client, factory, engine
    finally:
        main.app.dependency_overrides.pop(get_session, None)
        engine.dispose()


def headers(token="admin"):
    return {"Authorization": f"Bearer {token}"} if token else {}


def create(client):
    with patch.object(platform_plans, "read_plan_price", return_value={}):
        response = client.post("/api/admin/plans", headers=headers(), json={
            "planId": "level_a", "displayName": "Level A", "stripePriceId": "price_old", "trialDays": 14})
    assert response.status_code == 200, response.text
    return response.json()["plan"]


@pytest.mark.parametrize("token,status", [(None, 401), ("owner", 403), ("support", 403)])
def test_plan_writes_require_superadmin(api, token, status):
    client, _, _ = api
    result = client.post("/api/admin/plans", headers=headers(token), json={
        "planId": "a", "displayName": "A", "stripePriceId": "price_test", "trialDays": 0})
    assert result.status_code == status


def test_plan_crud_audit_price_replacement_and_existing_sub_unchanged(api):
    client, factory, _ = api
    plan = create(client)
    with factory() as session:
        session.add(PlatformSubscription(id="existing", product="kreaton", business_ref="s", stripe_price_id="price_old", status="active"))
        session.commit()
    result = client.get("/api/admin/plans", headers=headers("support"))
    assert result.json()["canWrite"] is False
    assert result.json()["plans"][0]["planId"] == "level_a"
    with patch.object(platform_plans, "create_plan_price", return_value="price_new") as price:
        response = client.post("/api/admin/plans/level_a/price", headers=headers(), json={"version": 1, "amountCents": 2500})
        assert response.status_code == 200, response.text
        price.assert_called_once()
        stale = client.post("/api/admin/plans/level_a/price", headers=headers(), json={"version": 1, "amountCents": 2500})
        assert stale.status_code == 409
        price.assert_called_once()
    response = client.patch("/api/admin/plans/level_a", headers=headers(), json={"version": 2, "displayName": "New name", "trialDays": 3, "active": False})
    assert response.status_code == 200
    with factory() as session:
        assert session.get(PlatformSubscription, "existing").stripe_price_id == "price_old"
        plan = session.get(PlatformPlan, ("kreaton", "level_a"))
        assert plan.stripe_price_id == "price_new" and not plan.active
        events = session.scalars(select(AdminAuditEvent).where(AdminAuditEvent.action == "admin.plan.price_replaced")).all()
        assert len(events) == 1
        assert json.loads(events[0].metadata_json)["before"]["stripePriceId"] == "price_old"
        with pytest.raises(Exception) as exc:
            platform_plans.resolve_plan(session, "level_a", manual=False)
        assert exc.value.status_code == 409


def test_registry_overrides_env_for_checkout_and_manual_trial(api):
    client, factory, _ = api
    create(client)
    payload = dict(product="kreaton", businessRef="s", planId="level_a", legalConsent=True,
                   legalConsentVersion="test", successUrl="https://test.invalid", cancelUrl="https://test.invalid")
    with patch.dict("os.environ", {"STRIPE_KREATON_LEVEL_A_PRICE_ID": "price_wrong", "STRIPE_KREATON_TRIAL_DAYS": "2"}), patch.object(billing, "checkout_session", return_value={"url": "https://checkout.stripe.com/test"}) as stripe:
        response = client.post("/api/v1/billing/subscriptions/checkout", headers=headers("owner"), json=payload)
        assert response.status_code == 200, response.text
        assert stripe.call_args.kwargs["line_items"] == [{"price": "price_old", "quantity": 1}]
        assert stripe.call_args.kwargs["trial_period_days"] == 14
    with factory() as session:
        session.delete(session.scalar(select(PlatformSubscription)))
        session.commit()
    with patch.object(billing.time, "time", return_value=1800000000):
        response = client.post("/api/v1/billing/subscriptions/checkout", headers=headers("owner"), json={**payload, "paymentMethod": "manual"})
    assert response.status_code == 200
    with factory() as session:
        assert session.scalar(select(PlatformSubscription)).trial_end == 1800000000 + 14 * 86400


def test_bootstrap_is_idempotent_and_preserves_admin_edits(api):
    _, factory, engine = api
    with patch.dict("os.environ", {"STRIPE_KREATON_LEVEL_A_PRICE_ID": "price_seed", "STRIPE_KREATON_TRIAL_DAYS": "7"}):
        platform_plans.bootstrap_plans(engine)
        with factory() as session:
            plan = session.get(PlatformPlan, ("kreaton", "level_a"))
            plan.active = False; plan.trial_days = 21
            session.commit()
        platform_plans.bootstrap_plans(engine)
    with factory() as session:
        plans = session.scalars(select(PlatformPlan)).all()
        assert len(plans) == 1 and plans[0].trial_days == 21 and not plans[0].active


def test_stripe_replacement_creates_never_updates_and_reuses_interval(monkeypatch):
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_fixture")
    client = MagicMock()
    original = dict(id="price_old", livemode=False, active=True, type="recurring", billing_scheme="per_unit", currency="usd", unit_amount=1000,
                    product="prod_plan", recurring={"interval": "month", "interval_count": 1, "usage_type": "licensed"})
    client.v1.prices.retrieve.return_value.to_dict_recursive.return_value = original
    client.v1.prices.create.return_value.id = "price_new"
    with patch.object(stripe_gateway, "_client", return_value=client):
        assert stripe_gateway.create_plan_price("price_old", 2500, "retry") == "price_new"
    client.v1.prices.update.assert_not_called()
    assert client.v1.prices.create.call_args.args[0]["unit_amount"] == 2500
    assert client.v1.prices.create.call_args.kwargs["options"]["idempotency_key"] == "kreaton-plan-retry"


def test_plan_gateway_rejects_live_before_any_api_call(monkeypatch):
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_live_NOT_A_REAL_KEY")
    with patch.object(stripe_gateway, "_client") as client, pytest.raises(Exception) as error:
        stripe_gateway.read_plan_price("price_test")
    assert error.value.status_code == 503
    client.assert_not_called()


def test_manual_expiry_scoped_durable_idempotent(api):
    client, factory, _ = api
    cases = [
        ("expire", "kreaton", "manual", "pending_manual_confirmation", 99, None),
        ("trial", "kreaton", "manual", "trialing", 100, None),
        ("future", "kreaton", "manual", "pending_manual_confirmation", 101, None),
        ("paid", "kreaton", "manual", "active", 99, None),
        ("stripe", "kreaton", "stripe", "trialing", 99, "sub_stripe"),
        ("listo", "listo_pos", "manual", "pending_manual_confirmation", 99, None),
        ("null", "kreaton", "manual", "pending_manual_confirmation", None, None),
    ]
    with factory() as session:
        for id, product, method, status, end, stripe_id in cases:
            session.add(PlatformSubscription(id=id, business_ref=id, product=product, payment_method=method, status=status, trial_end=end, stripe_subscription_id=stripe_id))
        session.commit()
        result = expire_manual_trials(session, ACTOR, "test", now=100)
        assert set(result["expiredIds"]) == {"expire", "trial"}
    with factory() as session:
        assert expire_manual_trials(session, ACTOR, "retry", now=100)["expiredCount"] == 0
        assert session.get(PlatformSubscription, "expire").status == "past_due"
        for id, _, _, status, _, _ in cases[2:]:
            assert session.get(PlatformSubscription, id).status == status
        assert len(session.scalars(select(AdminAuditEvent).where(AdminAuditEvent.action == "admin.subscription.manual_trial_expired")).all()) == 2


@pytest.mark.parametrize("token,status", [(None, 401), ("owner", 403), ("support", 403), ("admin", 200)])
def test_expiry_endpoint_permissions(api, token, status):
    client, _, _ = api
    assert client.post("/api/admin/subscriptions/expire-manual-trials", headers=headers(token)).status_code == status


def test_registered_plans_reject_unknown_manual_plan(api):
    client, factory, _ = api
    create(client)
    with factory() as session, pytest.raises(Exception) as error:
        platform_plans.resolve_plan(session, "unknown", manual=True)
    assert error.value.status_code == 404


def test_cookie_plan_session_and_price_detail(api):
    client, _, _ = api
    create(client)
    client.cookies.set("kreaton_admin_session", "admin")
    assert client.get("/api/admin/plans").status_code == 200
    with patch.object(stripe_gateway, "read_plan_price", return_value={"id":"price_old","unit_amount":1000,"currency":"usd","recurring":{"interval":"month","interval_count":1}}):
        assert client.get("/api/admin/plans/level_a/price").json()["amountCents"] == 1000


def test_expiry_rollback_on_audit_failure(api):
    _, factory, _ = api
    with factory() as session:
        session.add(PlatformSubscription(id="expire", product="kreaton", business_ref="s", payment_method="manual", status="trialing", trial_end=1))
        session.commit()
        with patch.object(session, "commit", side_effect=RuntimeError("audit unavailable")), pytest.raises(RuntimeError):
            expire_manual_trials(session, ACTOR, "failure", now=10)
    with factory() as session:
        assert session.get(PlatformSubscription, "expire").status == "trialing"
