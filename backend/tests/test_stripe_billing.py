import asyncio
import unittest
from unittest.mock import MagicMock, patch
from types import SimpleNamespace

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
            product="kreaton", businessRef="store_1", successUrl="https://example.test/success", cancelUrl="https://example.test/cancel"
        )
        with (
            patch.object(billing, "_user", return_value={"id": "user_1", "email": "owner@example.com"}),
            patch.dict("os.environ", {"STRIPE_KREATON_MONTHLY_PRICE_ID": "price_kreaton_test"}),
            patch.object(billing, "checkout_session", return_value={"url": "https://checkout.stripe.test/session"}) as checkout,
        ):
            result = asyncio.run(billing.subscription_checkout(payload, session=self.session))
        self.assertEqual(result["status"], "checkout_pending")
        self.assertEqual(checkout.call_args.kwargs["mode"], "subscription")
        self.assertEqual(checkout.call_args.kwargs["line_items"], [{"price": "price_kreaton_test", "quantity": 1}])

    def test_listo_manual_method_is_explicit_and_does_not_call_stripe(self) -> None:
        payload = billing.SubscriptionCheckoutRequest(
            product="listo_kds", businessRef="business_99", ownerEmail="listo@example.com", countryCode="VE",
            paymentMethod="manual", successUrl="https://example.test/success", cancelUrl="https://example.test/cancel",
        )
        with patch.dict("os.environ", {"LISTO_BILLING_API_KEY": "server-secret"}), patch.object(billing, "checkout_session") as checkout:
            result = asyncio.run(billing.subscription_checkout(payload, listo_billing_key="server-secret", session=self.session))
        self.assertEqual(result["status"], "pending_manual_confirmation")
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


if __name__ == "__main__":
    unittest.main()
