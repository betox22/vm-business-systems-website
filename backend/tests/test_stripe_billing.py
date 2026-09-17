import asyncio
import unittest
from unittest.mock import MagicMock, patch
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import billing
from app import stripe_gateway
from app.db import Base
from app.db_models import PlatformSubscription, Store, StripeEvent


class StripeBillingTests(unittest.TestCase):
    def setUp(self) -> None:
        engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        Base.metadata.create_all(bind=engine)
        self.session = sessionmaker(bind=engine)()
        self.session.add(Store(id="store_1", owner_user_id="user_1", owner_email="owner@example.com", name="Owner Store", business_type="retail", public_url="store.test"))
        self.session.commit()

    def tearDown(self) -> None:
        self.session.close()

    def test_kreaton_subscription_uses_checkout_subscription_mode(self) -> None:
        payload = billing.SubscriptionCheckoutRequest(
            product="kreaton", planId="level_a", businessRef="store_1", successUrl="https://example.test/success", cancelUrl="https://example.test/cancel",
            legalConsent=True, legalConsentVersion="en:2026-09-11", legalConsentLanguage="en",
        )
        with (
            patch.object(billing, "_user", return_value={"id": "user_1", "email": "owner@example.com"}),
            patch.dict("os.environ", {"STRIPE_KREATON_LEVEL_A_PRICE_ID": "price_kreaton_test", "STRIPE_KREATON_TRIAL_DAYS": "14"}),
            patch.object(billing, "checkout_session", return_value={"url": "https://checkout.stripe.test/session"}) as checkout,
        ):
            result = asyncio.run(billing.subscription_checkout(payload, session=self.session))
        self.assertEqual(result["status"], "checkout_pending")
        self.assertEqual(checkout.call_args.kwargs["mode"], "subscription")
        self.assertEqual(checkout.call_args.kwargs["trial_period_days"], 14)
        self.assertEqual(checkout.call_args.kwargs["line_items"], [{"price": "price_kreaton_test", "quantity": 1}])
        record = self.session.query(PlatformSubscription).filter_by(product="kreaton", business_ref="store_1").one()
        self.assertEqual(record.legal_consent_version, "en:2026-09-11")
        self.assertEqual(record.legal_consent_language, "en")
        self.assertIsNotNone(record.legal_accepted_at)
        self.assertEqual(record.plan_id, "level_a")
        self.assertIsNone(record.trial_end)  # Only Stripe knows when an accepted trial ends.

    def test_kreaton_subscription_rejects_missing_legal_consent(self) -> None:
        payload = billing.SubscriptionCheckoutRequest(
            product="kreaton", planId="level_a", businessRef="store_1", successUrl="https://example.test/success", cancelUrl="https://example.test/cancel"
        )
        with patch.object(billing, "_user", return_value={"id": "user_1", "email": "owner@example.com"}):
            with self.assertRaisesRegex(Exception, "acceptance is required"):
                asyncio.run(billing.subscription_checkout(payload, session=self.session))

    def test_listo_manual_method_is_explicit_and_does_not_call_stripe(self) -> None:
        payload = billing.SubscriptionCheckoutRequest(
            product="listo_kds", businessRef="business_99", ownerEmail="listo@example.com", countryCode="VE",
            paymentMethod="manual", successUrl="https://example.test/success", cancelUrl="https://example.test/cancel",
        )
        with patch.dict("os.environ", {"LISTO_BILLING_API_KEY": "server-secret"}), patch.object(billing, "checkout_session") as checkout:
            result = asyncio.run(billing.subscription_checkout(payload, listo_billing_key="server-secret", session=self.session))
        self.assertEqual(result["status"], "pending_manual_confirmation")
        checkout.assert_not_called()

    def test_plans_and_trial_reach_sdk_without_losing_subscription_metadata(self):
        sdk = MagicMock()
        sdk.v1.checkout.sessions.create.return_value = SimpleNamespace(id="cs_test_kb1", url="https://example.test/checkout")
        with (
            patch.object(billing, "_user", return_value={"id": "user_1", "email": "owner@example.com"}),
            patch.object(stripe_gateway, "_client", return_value=sdk),
            patch.dict("os.environ", {"STRIPE_KREATON_LEVEL_A_PRICE_ID": "price_test_a", "STRIPE_KREATON_LEVEL_B_PRICE_ID": "price_test_b", "STRIPE_KREATON_TRIAL_DAYS": "12"}),
        ):
            for plan, price in [("level_a", "price_test_a"), ("LEVEL_B", "price_test_b")]:
                payload = billing.SubscriptionCheckoutRequest(product="kreaton", planId=plan, businessRef="store_1",
                    successUrl="https://example.test/success", cancelUrl="https://example.test/cancel",
                    legalConsent=True, legalConsentVersion="en:test")
                result = asyncio.run(billing.subscription_checkout(payload, session=self.session))
                params = sdk.v1.checkout.sessions.create.call_args.args[0]
                self.assertEqual(params["line_items"], [{"price": price, "quantity": 1}])
                self.assertEqual(params["subscription_data"]["trial_period_days"], 12)
                self.assertEqual(params["subscription_data"]["metadata"]["platform_subscription_id"], result["subscriptionId"])
                self.session.expire_all()
                record = self.session.get(PlatformSubscription, result["subscriptionId"])
                self.assertEqual(record.plan_id, plan.lower())
                self.assertEqual(record.stripe_price_id, price)

    def test_trialing_and_trial_end_persist_from_subscription_webhook(self):
        record = PlatformSubscription(product="kreaton", plan_id="level_a", business_ref="store_1")
        self.session.add(record)
        self.session.commit()
        expiry = 2200000000
        event = {"id": "evt_trial", "type": "customer.subscription.updated", "livemode": False,
                 "data": {"object": {"id": "sub_test_trial", "status": "trialing", "trial_end": expiry,
                    "metadata": {"platform_subscription_id": record.id}}}}
        billing.process_billing_event(self.session, event)
        self.session.expire_all()
        self.assertEqual(record.status, "trialing")
        self.assertEqual(record.trial_end, expiry)
        self.assertEqual(record.plan_id, "level_a")
        for event_type in ("checkout.session.completed", "invoice.paid"):
            billing.process_billing_event(self.session, {"id": event_type, "type": event_type,
                "data": {"object": {"subscription": "sub_test_trial"}}})
            self.assertEqual(record.status, "trialing")
        # Explicit null clears the date; absent fields do not clear it.
        event["id"] = "evt_trial_missing_date"
        del event["data"]["object"]["trial_end"]
        billing.process_billing_event(self.session, event)
        self.assertEqual(record.trial_end, expiry)
        event["id"] = "evt_trial_end"
        event["data"]["object"].update(status="active", trial_end=None)
        billing.process_billing_event(self.session, event)
        self.assertEqual(record.status, "active")
        self.assertIsNone(record.trial_end)

    def test_subscription_created_records_initial_trial(self):
        record = PlatformSubscription(product="kreaton", business_ref="store_1")
        self.session.add(record)
        self.session.commit()
        billing.process_billing_event(self.session, {"id": "evt_created", "type": "customer.subscription.created",
            "data": {"object": {"id": "sub_test_new", "status": "trialing", "trial_end": 2200000000,
                               "metadata": {"platform_subscription_id": record.id}}}})
        self.assertEqual((record.status, record.trial_end), ("trialing", 2200000000))

    def test_other_products_keep_existing_price_contract_without_trial(self):
        for product, key in [("listo_pos", "STRIPE_LISTO_POS_MONTHLY_PRICE_ID"), ("listo_kds", "STRIPE_LISTO_KDS_MONTHLY_PRICE_ID")]:
            payload = billing.SubscriptionCheckoutRequest(product=product, businessRef=product, ownerEmail="test@example.com",
                successUrl="https://example.test/success", cancelUrl="https://example.test/cancel")
            with patch.dict("os.environ", {key: "price_test_unchanged", "LISTO_BILLING_API_KEY": "test", "STRIPE_KREATON_TRIAL_DAYS": "invalid"}), patch.object(billing, "checkout_session", return_value={"url": "https://example.test"}) as checkout:
                asyncio.run(billing.subscription_checkout(payload, listo_billing_key="test", session=self.session))
                self.assertNotIn("trial_period_days", checkout.call_args.kwargs)
                self.assertEqual(checkout.call_args.kwargs["line_items"][0]["price"], "price_test_unchanged")

    def test_unknown_plan_has_no_old_monthly_fallback(self):
        payload = billing.SubscriptionCheckoutRequest(product="kreaton", planId="unconfigured", businessRef="store_1",
            successUrl="https://example.test", cancelUrl="https://example.test", legalConsent=True, legalConsentVersion="en:test")
        with patch.object(billing, "_user", return_value={"id": "user_1"}), patch.dict("os.environ", {"STRIPE_KREATON_MONTHLY_PRICE_ID": "price_old"}, clear=True), patch.object(billing, "checkout_session") as checkout:
            with self.assertRaisesRegex(Exception, "STRIPE_KREATON_UNCONFIGURED_PRICE_ID"):
                asyncio.run(billing.subscription_checkout(payload, session=self.session))
            checkout.assert_not_called()

    def test_zero_trial_omits_stripe_parameter_and_method_switch_is_rejected(self):
        payload = billing.SubscriptionCheckoutRequest(product="kreaton", planId="level_a", businessRef="store_1",
            successUrl="https://example.test", cancelUrl="https://example.test", legalConsent=True, legalConsentVersion="en:test")
        with patch.object(billing, "_user", return_value={"id": "user_1"}), patch.dict("os.environ", {"STRIPE_KREATON_LEVEL_A_PRICE_ID": "price_test_a", "STRIPE_KREATON_TRIAL_DAYS": "0"}), patch.object(billing, "checkout_session", return_value={"url": "https://example.test"}) as checkout:
            asyncio.run(billing.subscription_checkout(payload, session=self.session))
            self.assertNotIn("trial_period_days", checkout.call_args.kwargs)
            checkout.reset_mock()
            payload.paymentMethod = "manual"
            with self.assertRaisesRegex(Exception, "explicit subscription migration"):
                asyncio.run(billing.subscription_checkout(payload, session=self.session))
            checkout.assert_not_called()

    def test_webhooks_update_subscription_once(self) -> None:
        record = PlatformSubscription(product="listo_pos", business_ref="business_7", owner_email="owner@example.com")
        self.session.add(record)
        self.session.commit()
        event = {
            "id": "evt_checkout_1", "type": "checkout.session.completed", "livemode": False,
            "data": {"object": {"customer": "cus_test", "subscription": "sub_test", "metadata": {"platform_subscription_id": record.id}}},
        }
        billing.process_billing_event(self.session, event)
        billing.process_billing_event(self.session, event)
        self.session.refresh(record)
        self.assertEqual(record.status, "active")
        self.assertEqual(record.stripe_customer_id, "cus_test")
        self.assertEqual(self.session.query(StripeEvent).count(), 1)

    def test_connect_uses_accounts_v2_and_v2_hosted_onboarding(self) -> None:
        client = MagicMock()
        client.v2.core.accounts.create.return_value = SimpleNamespace(id="acct_test")
        client.v2.core.account_links.create.return_value = SimpleNamespace(url="https://connect.stripe.test/onboard")
        with patch.object(stripe_gateway, "_client", return_value=client):
            account_id = stripe_gateway.create_connected_account(email="merchant@example.com", display_name="Merchant", country="US")
            url = stripe_gateway.create_account_link(account_id=account_id, refresh_url="https://example.test/refresh", return_url="https://example.test/return")
        self.assertEqual(account_id, "acct_test")
        self.assertEqual(url, "https://connect.stripe.test/onboard")
        account_params = client.v2.core.accounts.create.call_args.args[0]
        self.assertEqual(account_params["dashboard"], "full")
        self.assertEqual(account_params["defaults"]["responsibilities"]["fees_collector"], "stripe")
        link_params = client.v2.core.account_links.create.call_args.args[0]
        self.assertEqual(link_params["use_case"]["account_onboarding"]["configurations"], ["merchant"])


@pytest.mark.parametrize("plan", ["", " ", "a-b", "a.b", "../a", "a b"])
def test_invalid_or_missing_kreaton_plan_rejected(plan):
    with pytest.raises(ValidationError):
        billing.SubscriptionCheckoutRequest(product="kreaton", planId=plan, businessRef="store", successUrl="https://example.test", cancelUrl="https://example.test")


@pytest.mark.parametrize("days", ["-1", "731", "1.5", "abc", ""])
def test_invalid_trial_configuration_is_explicit_503(days):
    with patch.dict("os.environ", {"STRIPE_KREATON_TRIAL_DAYS": days}):
        with pytest.raises(Exception) as error:
            billing.kreaton_trial_days()
        assert error.value.status_code == 503


def test_trial_configuration_default_and_explicit_zero():
    with patch.dict("os.environ", {}, clear=True):
        assert billing.kreaton_trial_days() == 7
    with patch.dict("os.environ", {"STRIPE_KREATON_TRIAL_DAYS": "0"}):
        assert billing.kreaton_trial_days() == 0


def test_subscription_columns_migrate_legacy_rows_idempotently(monkeypatch):
    from app import db
    engine = create_engine("sqlite://")
    try:
        with engine.begin() as connection:
            connection.exec_driver_sql("CREATE TABLE platform_subscriptions (id TEXT PRIMARY KEY)")
            connection.exec_driver_sql("INSERT INTO platform_subscriptions (id) VALUES ('legacy')")
        monkeypatch.setattr(db, "engine", engine)
        db._ensure_additive_columns()
        db._ensure_additive_columns()
        with engine.connect() as connection:
            assert tuple(connection.exec_driver_sql("SELECT plan_id, trial_end FROM platform_subscriptions").one()) == ("", None)
    finally:
        engine.dispose()


if __name__ == "__main__":
    unittest.main()
