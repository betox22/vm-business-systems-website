from __future__ import annotations

import asyncio
import unittest
from decimal import Decimal
from unittest.mock import MagicMock, patch

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import client_auth, commerce, shipping_gateway, team_settings
from app.commerce_webhooks import process_payment_event
from app.db import Base
from app.db_models import Customer as DbCustomer
from app.db_models import Order as DbOrder
from app.db_models import Product as DbProduct
from app.db_models import Store


def _memory_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


class ShippingTestsBase(unittest.TestCase):
    def setUp(self) -> None:
        self.session = _memory_session()
        commerce.CARTS.clear()
        commerce.SHIPPING_QUOTES.clear()
        self.session.add(
            Store(
                id="store_owner",
                owner_user_id="user_owner",
                owner_email="owner@example.com",
                name="Owner Store",
                business_type="retail",
                public_url="owner.usekreaton.com",
            )
        )
        self.session.commit()

    def tearDown(self) -> None:
        self.session.close()
        commerce.CARTS.clear()
        commerce.SHIPPING_QUOTES.clear()

    def _owner_auth(self):
        return patch.multiple(
            client_auth,
            supabase_auth_configured=lambda: True,
            fetch_supabase_user=lambda token: {"id": "user_owner", "email": "owner@example.com"},
        )

    def _owner_user(self):
        return client_auth.authenticated_client_user("Bearer token")

    def _add_product(self, product_id: str = "prod_a", *, weight_oz=None, price_cents=1000, inventory=10) -> DbProduct:
        product = DbProduct(
            id=product_id,
            store_id="store_owner",
            name="Widget",
            category="misc",
            price_cents=price_cents,
            inventory=inventory,
            status="Published",
            weight_oz=weight_oz,
        )
        self.session.add(product)
        self.session.commit()
        return product

    def _configure_full_origin(self) -> None:
        with self._owner_auth():
            asyncio.run(
                team_settings.update_store_settings(
                    "store_owner",
                    team_settings.StoreSettingsPatch(
                        shipping=team_settings.ShippingSettingsPatch(
                            origin=team_settings.ShippingOriginPatch(
                                street1="1 Main St", city="Miami", state="FL", zip="33101", country="US"
                            )
                        )
                    ),
                    user=self._owner_user(),
                    session=self.session,
                )
            )

    def _shipping_addr(self) -> commerce.ShippingAddress:
        return commerce.ShippingAddress(line1="120 Market Street", city="Austin", region="TX", postalCode="73301")


class ShippingRatesEndpointTests(ShippingTestsBase):
    def test_falls_back_to_flat_when_easypost_not_configured(self):
        self._add_product(weight_oz=16)
        self._configure_full_origin()
        commerce.CARTS["cart1"] = [{"cartItemId": "ci1", "businessId": "store_owner", "productId": "prod_a", "quantity": 1}]

        with patch.dict("os.environ", {"EASYPOST_API_KEY": ""}):
            result = asyncio.run(
                commerce.checkout_shipping_rates(
                    commerce.ShippingRatesRequest(
                        cartId="cart1", businessId="store_owner", shippingAddress=self._shipping_addr()
                    ),
                    session=self.session,
                )
            )
        self.assertEqual(result["mode"], "flat")
        self.assertEqual(result["options"][0]["rateId"], "flat")

    def test_falls_back_to_flat_when_origin_incomplete(self):
        self._add_product(weight_oz=16)
        # Origin never configured -- still defaults ("") for street/city/etc.
        commerce.CARTS["cart1"] = [{"cartItemId": "ci1", "businessId": "store_owner", "productId": "prod_a", "quantity": 1}]

        with patch.dict("os.environ", {"EASYPOST_API_KEY": "EZTK_fake"}):
            result = asyncio.run(
                commerce.checkout_shipping_rates(
                    commerce.ShippingRatesRequest(
                        cartId="cart1", businessId="store_owner", shippingAddress=self._shipping_addr()
                    ),
                    session=self.session,
                )
            )
        self.assertEqual(result["mode"], "flat")

    def test_falls_back_to_flat_when_product_weight_missing(self):
        self._add_product(weight_oz=None)
        self._configure_full_origin()
        commerce.CARTS["cart1"] = [{"cartItemId": "ci1", "businessId": "store_owner", "productId": "prod_a", "quantity": 1}]

        with patch.dict("os.environ", {"EASYPOST_API_KEY": "EZTK_fake"}):
            result = asyncio.run(
                commerce.checkout_shipping_rates(
                    commerce.ShippingRatesRequest(
                        cartId="cart1", businessId="store_owner", shippingAddress=self._shipping_addr()
                    ),
                    session=self.session,
                )
            )
        self.assertEqual(result["mode"], "flat")

    def test_real_rates_returned_and_cached_when_fully_configured(self):
        self._add_product(weight_oz=16)
        self._configure_full_origin()
        commerce.CARTS["cart1"] = [{"cartItemId": "ci1", "businessId": "store_owner", "productId": "prod_a", "quantity": 2}]

        fake_rates = {
            "shipmentId": "shp_123",
            "rates": [
                {"rateId": "rate_1", "carrier": "USPS", "service": "Priority", "rateCents": 820, "deliveryDays": 2},
                {"rateId": "rate_2", "carrier": "UPS", "service": "Ground", "rateCents": 650, "deliveryDays": 5},
            ],
        }
        with patch.dict("os.environ", {"EASYPOST_API_KEY": "EZTK_fake"}), patch.object(
            commerce, "get_shipping_rates", return_value=fake_rates
        ) as mocked:
            result = asyncio.run(
                commerce.checkout_shipping_rates(
                    commerce.ShippingRatesRequest(
                        cartId="cart1", businessId="store_owner", shippingAddress=self._shipping_addr()
                    ),
                    session=self.session,
                )
            )
        self.assertEqual(result["mode"], "real")
        self.assertEqual([o["rateId"] for o in result["options"]], ["rate_1", "rate_2"])
        # weight_oz(16) * quantity(2) = 32oz passed through.
        self.assertEqual(mocked.call_args.kwargs["weight_oz"], 32.0)
        self.assertEqual(commerce.SHIPPING_QUOTES["cart1"]["shipmentId"], "shp_123")
        # task #55: the customer-facing rate is marked up 10% over EasyPost's
        # raw cost, and never sees the raw cost field at all.
        self.assertEqual([o["rateCents"] for o in result["options"]], [902, 715])
        self.assertNotIn("carrierCostCents", result["options"][0])
        cached = commerce.SHIPPING_QUOTES["cart1"]["options"]
        self.assertEqual([o["carrierCostCents"] for o in cached], [820, 650])
        self.assertEqual([o["rateCents"] for o in cached], [902, 715])

    def test_free_shipping_threshold_zeroes_out_flat_rate(self):
        self._add_product(weight_oz=16, price_cents=10000)
        with self._owner_auth():
            asyncio.run(
                team_settings.update_store_settings(
                    "store_owner",
                    team_settings.StoreSettingsPatch(
                        shipping=team_settings.ShippingSettingsPatch(flatRate=9.99, freeShippingThreshold=50)
                    ),
                    user=self._owner_user(),
                    session=self.session,
                )
            )
        commerce.CARTS["cart1"] = [{"cartItemId": "ci1", "businessId": "store_owner", "productId": "prod_a", "quantity": 1}]
        with patch.dict("os.environ", {"EASYPOST_API_KEY": ""}):
            result = asyncio.run(
                commerce.checkout_shipping_rates(
                    commerce.ShippingRatesRequest(
                        cartId="cart1", businessId="store_owner", shippingAddress=self._shipping_addr()
                    ),
                    session=self.session,
                )
            )
        self.assertEqual(result["options"][0]["rateCents"], 0)


class ResolveCheckoutShippingTests(ShippingTestsBase):
    def test_defaults_to_flat_when_no_quote_cached(self):
        self._add_product(weight_oz=16)
        commerce.CARTS["cart1"] = [{"cartItemId": "ci1", "businessId": "store_owner", "productId": "prod_a", "quantity": 1}]
        cents, meta = commerce.resolve_checkout_shipping(self.session, "store_owner", "cart1", "whatever")
        self.assertEqual(cents, 0)  # no flat rate configured -> defaults to 0
        self.assertEqual(meta["mode"], "flat")

    def test_uses_cached_real_rate(self):
        commerce.SHIPPING_QUOTES["cart1"] = {
            "businessId": "store_owner",
            "mode": "real",
            "shipmentId": "shp_1",
            "options": [{
                "rateId": "rate_1", "carrier": "USPS", "service": "Priority",
                "rateCents": 902, "carrierCostCents": 820, "deliveryDays": 2,
            }],
        }
        cents, meta = commerce.resolve_checkout_shipping(self.session, "store_owner", "cart1", "rate_1")
        self.assertEqual(cents, 902)  # what the customer is charged (already marked up)
        self.assertEqual(meta, {
            "mode": "real", "shipmentId": "shp_1", "rateId": "rate_1",
            "carrier": "USPS", "service": "Priority", "rateCents": 902,
            "carrierCostCents": 820, "purchaseStatus": "pending",
        })

    def test_wrong_business_id_ignored(self):
        commerce.SHIPPING_QUOTES["cart1"] = {
            "businessId": "store_other", "mode": "real", "shipmentId": "shp_1",
            "options": [{"rateId": "rate_1", "carrier": "USPS", "service": "Priority", "rateCents": 820, "deliveryDays": 2}],
        }
        self._add_product(weight_oz=16)
        cents, meta = commerce.resolve_checkout_shipping(self.session, "store_owner", "cart1", "rate_1")
        self.assertEqual(meta["mode"], "flat")


class CheckoutTotalIncludesShippingTests(ShippingTestsBase):
    def test_checkout_session_total_includes_selected_real_rate(self):
        self._add_product(weight_oz=16, price_cents=1000, inventory=5)
        commerce.SHIPPING_QUOTES["cart_real"] = {
            "businessId": "store_owner",
            "mode": "real",
            "shipmentId": "shp_9",
            "options": [{
                "rateId": "rate_9", "carrier": "UPS", "service": "Ground",
                "rateCents": 650, "carrierCostCents": 591, "deliveryDays": 5,
            }],
        }
        asyncio.run(
            commerce.add_cart_item(
                commerce.AddCartItemRequest(businessId="store_owner", cartId="cart_real", productId="prod_a", quantity=1),
                session=self.session,
            )
        )
        payload = commerce.CheckoutSessionRequest(
            cartId="cart_real",
            businessId="store_owner",
            customer=commerce.CustomerInfo(email="buyer@example.com", firstName="Bea", lastName="Rivera"),
            shippingAddress=self._shipping_addr(),
            shippingOptionId="rate_9",
            successUrl="https://example.com/success",
            cancelUrl="https://example.com/cart",
        )
        with patch.dict("os.environ", {"STRIPE_SECRET_KEY": ""}):
            checkout = asyncio.run(
                commerce.create_checkout_session(payload, idempotency_key="idem-1", session=self.session)
            )
        order = self.session.get(DbOrder, checkout["order"]["id"])
        self.assertEqual(order.total_cents, 1000 + 650)  # 1 unit @ $10 + marked-up $6.50 shipping
        self.assertEqual(checkout["order"]["shippingAmount"], 6.5)
        self.assertEqual(checkout["order"]["shippingMode"], "real")
        meta = commerce.json_field(order.shipping_json, {})
        self.assertEqual(meta["purchaseStatus"], "pending")
        self.assertEqual(meta["shipmentId"], "shp_9")
        self.assertEqual(meta["carrierCostCents"], 591)


class AutomaticPurchaseTests(ShippingTestsBase):
    def _seed_paid_real_order(self, purchase_status="pending"):
        self.session.add(DbCustomer(id="cust_1", store_id="store_owner", email="buyer@example.com", name="Bea"))
        self.session.flush()
        order = DbOrder(
            id="ord_1", store_id="store_owner", customer_id="cust_1", order_number="KR-AAA111",
            item_count=1, total_cents=1650, status="paid",
            shipping_json=commerce.json.dumps({
                "mode": "real", "shipmentId": "shp_1", "rateId": "rate_1",
                "carrier": "UPS", "service": "Ground", "rateCents": 650, "purchaseStatus": purchase_status,
            }),
        )
        self.session.add(order)
        self.session.commit()
        return order

    def test_success_populates_tracking_and_label(self):
        order = self._seed_paid_real_order()
        # Deliberately different from the 650 the customer was quoted/charged,
        # to prove the purchase result never rewrites what the customer paid.
        fake_result = {"carrier": "UPS", "service": "Ground", "rateCents": 675,
                       "trackingCode": "1Z999", "labelUrl": "https://easypost.example/label.pdf"}
        with patch.object(commerce, "buy_shipment", return_value=fake_result) as mocked:
            commerce.attempt_automatic_shipping_purchase(self.session, order)
        mocked.assert_called_once_with(shipment_id="shp_1", rate_id="rate_1")
        self.assertEqual(order.shipping_carrier, "UPS")
        self.assertEqual(order.tracking_code, "1Z999")
        self.assertEqual(order.shipping_label_url, "https://easypost.example/label.pdf")
        self.assertFalse(order.needs_shipping_attention)
        # task #55: the customer-charged amount (rateCents) must never change
        # after purchase -- only carrierCostCents (KREATON's own bookkeeping
        # of the real, final EasyPost cost) reflects the actual purchase.
        meta = commerce.json_field(order.shipping_json, {})
        self.assertEqual(meta["rateCents"], 650)
        self.assertEqual(meta["carrierCostCents"], 675)

    def test_failure_flags_order_without_raising(self):
        order = self._seed_paid_real_order()
        with patch.object(commerce, "buy_shipment", side_effect=HTTPException(502, "boom")):
            commerce.attempt_automatic_shipping_purchase(self.session, order)  # must not raise
        self.assertTrue(order.needs_shipping_attention)
        meta = commerce.json_field(order.shipping_json, {})
        self.assertEqual(meta["purchaseStatus"], "failed")
        self.assertIsNone(order.tracking_code)

    def test_idempotent_when_already_purchased(self):
        order = self._seed_paid_real_order(purchase_status="purchased")
        with patch.object(commerce, "buy_shipment") as mocked:
            commerce.attempt_automatic_shipping_purchase(self.session, order)
        mocked.assert_not_called()

    def test_flat_mode_order_is_a_no_op(self):
        order = self._seed_paid_real_order()
        order.shipping_json = commerce.json.dumps({"mode": "flat", "rateCents": 500})
        with patch.object(commerce, "buy_shipment") as mocked:
            commerce.attempt_automatic_shipping_purchase(self.session, order)
        mocked.assert_not_called()


class WebhookHookTests(ShippingTestsBase):
    def test_paid_transition_triggers_automatic_purchase(self):
        self.session.add(DbCustomer(id="cust_1", store_id="store_owner", email="buyer@example.com", name="Bea"))
        self.session.flush()
        order = DbOrder(
            id="ord_1", store_id="store_owner", customer_id="cust_1", order_number="KR-BBB222",
            item_count=1, total_cents=1000, status="payment_processing",
            payment_json=commerce.json.dumps({"provider": "stripe", "sessionId": "cs_1", "connectedAccountId": None}),
            shipping_json=commerce.json.dumps({
                "mode": "real", "shipmentId": "shp_2", "rateId": "rate_2",
                "carrier": "USPS", "service": "Priority", "rateCents": 0, "purchaseStatus": "pending",
            }),
        )
        self.session.add(order)
        self.session.commit()

        session_obj = {
            "id": "cs_1", "status": "complete", "payment_status": "paid",
            "metadata": {"order_id": "ord_1", "ledger": "store_commerce"},
            "livemode": False, "amount_total": 1000, "currency": "usd", "mode": "payment",
        }
        event = {
            "type": "checkout.session.completed",
            "livemode": False,
            "account": None,
            "data": {"object": session_obj},
        }
        with patch.dict("os.environ", {"STRIPE_SECRET_KEY": "sk_test_fake"}), \
             patch("app.commerce_webhooks.retrieve_store_checkout", return_value=session_obj), \
             patch("app.commerce_webhooks.attempt_automatic_shipping_purchase") as mocked:
            result = process_payment_event(self.session, event)

        self.assertEqual(result["status"], "paid")
        mocked.assert_called_once_with(self.session, order)

    def test_non_paid_transition_does_not_trigger_purchase(self):
        self.session.add(DbCustomer(id="cust_1", store_id="store_owner", email="buyer@example.com", name="Bea"))
        self.session.flush()
        order = DbOrder(
            id="ord_2", store_id="store_owner", customer_id="cust_1", order_number="KR-CCC333",
            item_count=1, total_cents=1000, status="payment_processing",
            payment_json=commerce.json.dumps({"provider": "stripe", "sessionId": "cs_2", "connectedAccountId": None}),
        )
        self.session.add(order)
        self.session.commit()

        session_obj = {
            "id": "cs_2", "status": "open", "payment_status": "unpaid",
            "metadata": {"order_id": "ord_2", "ledger": "store_commerce"},
            "livemode": False, "amount_total": 1000, "currency": "usd", "mode": "payment",
        }
        event = {
            "type": "checkout.session.completed",
            "livemode": False,
            "account": None,
            "data": {"object": session_obj},
        }
        with patch.dict("os.environ", {"STRIPE_SECRET_KEY": "sk_test_fake"}), \
             patch("app.commerce_webhooks.retrieve_store_checkout", return_value=session_obj), \
             patch("app.commerce_webhooks.attempt_automatic_shipping_purchase") as mocked:
            process_payment_event(self.session, event)
        mocked.assert_not_called()


class OwnerManualRetryTests(ShippingTestsBase):
    def _seed_order(self, *, status="paid", mode="real", purchase_status="failed"):
        self.session.add(DbCustomer(id="cust_1", store_id="store_owner", email="buyer@example.com", name="Bea"))
        self.session.flush()
        order = DbOrder(
            id="ord_1", store_id="store_owner", customer_id="cust_1", order_number="KR-DDD444",
            item_count=1, total_cents=1650, status=status,
            shipping_json=commerce.json.dumps({
                "mode": mode, "shipmentId": "shp_1", "rateId": "rate_1",
                "carrier": "UPS", "service": "Ground", "rateCents": 650, "purchaseStatus": purchase_status,
            }) if mode == "real" else commerce.json.dumps({"mode": "flat", "rateCents": 500}),
        )
        self.session.add(order)
        self.session.commit()
        return order

    def test_retries_and_succeeds(self):
        self._seed_order()
        fake_result = {"carrier": "UPS", "service": "Ground", "rateCents": 650,
                       "trackingCode": "1Z999", "labelUrl": "https://easypost.example/label.pdf"}
        with self._owner_auth(), patch.object(commerce, "buy_shipment", return_value=fake_result):
            result = asyncio.run(
                commerce.owner_purchase_shipping_label(
                    "store_owner", "ord_1", user=self._owner_user(), session=self.session
                )
            )
        self.assertEqual(result["tracking"], {"carrier": "UPS", "trackingNumber": "1Z999"})
        self.assertFalse(result["needsShippingAttention"])

    def test_404_for_wrong_store(self):
        self._seed_order()
        with self._owner_auth():
            with self.assertRaises(HTTPException) as error:
                asyncio.run(
                    commerce.owner_purchase_shipping_label(
                        "store_owner", "missing_order", user=self._owner_user(), session=self.session
                    )
                )
        self.assertEqual(error.exception.status_code, 404)

    def test_409_when_not_paid(self):
        self._seed_order(status="pending_payment")
        with self._owner_auth():
            with self.assertRaises(HTTPException) as error:
                asyncio.run(
                    commerce.owner_purchase_shipping_label(
                        "store_owner", "ord_1", user=self._owner_user(), session=self.session
                    )
                )
        self.assertEqual(error.exception.status_code, 409)

    def test_409_when_not_real_mode(self):
        self._seed_order(mode="flat")
        with self._owner_auth():
            with self.assertRaises(HTTPException) as error:
                asyncio.run(
                    commerce.owner_purchase_shipping_label(
                        "store_owner", "ord_1", user=self._owner_user(), session=self.session
                    )
                )
        self.assertEqual(error.exception.status_code, 409)


class ShippingGatewayTests(unittest.TestCase):
    def test_not_configured_without_key(self):
        with patch.dict("os.environ", {"EASYPOST_API_KEY": ""}):
            self.assertFalse(shipping_gateway.shipping_rates_configured())
            with self.assertRaises(HTTPException) as error:
                shipping_gateway._api_key()
            self.assertEqual(error.exception.status_code, 503)

    def test_get_shipping_rates_parses_response(self):
        fake_response = MagicMock(status_code=200)
        fake_response.json.return_value = {
            "id": "shp_1",
            "rates": [
                {"id": "rate_1", "carrier": "USPS", "service": "Priority", "rate": "8.20", "delivery_days": 2},
                {"id": None, "carrier": "BadOne", "service": "X", "rate": None, "delivery_days": None},
            ],
        }
        with patch.dict("os.environ", {"EASYPOST_API_KEY": "EZTK_fake"}):
            with patch.object(shipping_gateway.httpx, "Client") as mock_client_cls:
                mock_client = MagicMock()
                mock_client.post.return_value = fake_response
                mock_client_cls.return_value.__enter__.return_value = mock_client
                result = shipping_gateway.get_shipping_rates(
                    from_address={"street1": "1 Main St", "city": "Miami", "state": "FL", "zip": "33101", "country": "US"},
                    to_address={"street1": "2 Elm St", "city": "Austin", "state": "TX", "zip": "73301", "country": "US"},
                    weight_oz=16,
                    length_in=9,
                    width_in=6,
                    height_in=4,
                )
        self.assertEqual(result["shipmentId"], "shp_1")
        # The malformed second rate (no id, no rate) is dropped.
        self.assertEqual(result["rates"], [
            {"rateId": "rate_1", "carrier": "USPS", "service": "Priority", "rateCents": 820, "deliveryDays": 2}
        ])

    def test_get_shipping_rates_raises_422_when_no_rates(self):
        fake_response = MagicMock(status_code=200)
        fake_response.json.return_value = {"id": "shp_1", "rates": []}
        with patch.dict("os.environ", {"EASYPOST_API_KEY": "EZTK_fake"}):
            with patch.object(shipping_gateway.httpx, "Client") as mock_client_cls:
                mock_client = MagicMock()
                mock_client.post.return_value = fake_response
                mock_client_cls.return_value.__enter__.return_value = mock_client
                with self.assertRaises(HTTPException) as error:
                    shipping_gateway.get_shipping_rates(
                        from_address={}, to_address={}, weight_oz=16, length_in=9, width_in=6, height_in=4
                    )
        self.assertEqual(error.exception.status_code, 422)

    def test_buy_shipment_parses_response(self):
        fake_response = MagicMock(status_code=200)
        fake_response.json.return_value = {
            "selected_rate": {"carrier": "UPS", "service": "Ground", "rate": "6.50"},
            "postage_label": {"label_url": "https://easypost.example/label.pdf"},
            "tracking_code": "1Z999",
        }
        with patch.dict("os.environ", {"EASYPOST_API_KEY": "EZTK_fake"}):
            with patch.object(shipping_gateway.httpx, "Client") as mock_client_cls:
                mock_client = MagicMock()
                mock_client.post.return_value = fake_response
                mock_client_cls.return_value.__enter__.return_value = mock_client
                result = shipping_gateway.buy_shipment(shipment_id="shp_1", rate_id="rate_1")
        self.assertEqual(result, {
            "carrier": "UPS", "service": "Ground", "rateCents": 650,
            "trackingCode": "1Z999", "labelUrl": "https://easypost.example/label.pdf",
        })

    def test_buy_shipment_raises_502_on_incomplete_response(self):
        fake_response = MagicMock(status_code=200)
        fake_response.json.return_value = {"selected_rate": {}, "postage_label": {}, "tracking_code": None}
        with patch.dict("os.environ", {"EASYPOST_API_KEY": "EZTK_fake"}):
            with patch.object(shipping_gateway.httpx, "Client") as mock_client_cls:
                mock_client = MagicMock()
                mock_client.post.return_value = fake_response
                mock_client_cls.return_value.__enter__.return_value = mock_client
                with self.assertRaises(HTTPException) as error:
                    shipping_gateway.buy_shipment(shipment_id="shp_1", rate_id="rate_1")
        self.assertEqual(error.exception.status_code, 502)


class ShippingMarkupTests(unittest.TestCase):
    def test_default_markup_env_var_is_10_percent(self):
        # SHIPPING_RATE_MARKUP_BPS is read once at import time (like the
        # existing STRIPE_CONNECT_APPLICATION_FEE_BPS pattern); this asserts
        # the documented default agreed with Beto, not a live-patchable env.
        self.assertEqual(commerce.SHIPPING_RATE_MARKUP_BPS, 1000)

    def test_apply_shipping_markup_math(self):
        with patch.object(commerce, "SHIPPING_RATE_MARKUP_BPS", 1000):
            self.assertEqual(commerce._apply_shipping_markup(1000), 1100)
            self.assertEqual(commerce._apply_shipping_markup(820), 902)
            self.assertEqual(commerce._apply_shipping_markup(650), 715)
            self.assertEqual(commerce._apply_shipping_markup(0), 0)
        with patch.object(commerce, "SHIPPING_RATE_MARKUP_BPS", 0):
            self.assertEqual(commerce._apply_shipping_markup(1000), 1000)


class StripeApplicationFeeShippingRecoveryTests(unittest.TestCase):
    """task #55: the Stripe Connect application fee recovers the full
    marked-up shipping charge (raw EasyPost cost + margin) on top of the
    usual percentage platform commission, whenever an order used a real
    carrier rate -- so KREATON's single central EasyPost wallet is
    reimbursed with a profit per shipment instead of absorbing the cost."""

    def _base_order(self, *, shipping_mode: str, shipping_amount: float):
        return {
            "id": "ord_1", "orderNumber": "KR-1",
            "items": [{"name": "Widget", "unitPrice": 10, "quantity": 1}],
            "taxAmount": 0, "shippingAmount": shipping_amount, "shippingMode": shipping_mode,
            "total": Decimal("10") + Decimal(str(shipping_amount)),
        }

    def test_real_shipping_recovers_full_marked_up_amount_plus_commission(self):
        order = self._base_order(shipping_mode="real", shipping_amount=6.50)
        with patch.dict("os.environ", {"STRIPE_SECRET_KEY": "sk_test_x", "STRIPE_CONNECT_APPLICATION_FEE_BPS": "500"}), \
             patch.object(commerce, "create_stripe_session", return_value={}) as stripe:
            commerce.stripe_checkout_session(
                order, "https://example.invalid/success", "https://example.invalid/cancel",
                connected_account_id="acct_123",
            )
        # 5% of $16.50 total = 82 (rounded) + the full $6.50 marked-up shipping = 650
        expected_commission = int(Decimal("16.50") * 100 * 500 / 10000)
        self.assertEqual(stripe.call_args.kwargs["application_fee_amount"], expected_commission + 650)

    def test_flat_shipping_recovers_commission_only_not_shipping(self):
        order = self._base_order(shipping_mode="flat", shipping_amount=5.00)
        with patch.dict("os.environ", {"STRIPE_SECRET_KEY": "sk_test_x", "STRIPE_CONNECT_APPLICATION_FEE_BPS": "500"}), \
             patch.object(commerce, "create_stripe_session", return_value={}) as stripe:
            commerce.stripe_checkout_session(
                order, "https://example.invalid/success", "https://example.invalid/cancel",
                connected_account_id="acct_123",
            )
        expected_commission = int(Decimal("15.00") * 100 * 500 / 10000)
        self.assertEqual(stripe.call_args.kwargs["application_fee_amount"], expected_commission)

    def test_real_shipping_recovered_even_with_zero_percent_commission(self):
        order = self._base_order(shipping_mode="real", shipping_amount=6.50)
        with patch.dict("os.environ", {"STRIPE_SECRET_KEY": "sk_test_x", "STRIPE_CONNECT_APPLICATION_FEE_BPS": "0"}), \
             patch.object(commerce, "create_stripe_session", return_value={}) as stripe:
            commerce.stripe_checkout_session(
                order, "https://example.invalid/success", "https://example.invalid/cancel",
                connected_account_id="acct_123",
            )
        self.assertEqual(stripe.call_args.kwargs["application_fee_amount"], 650)

    def test_no_connected_account_means_no_fee_at_all(self):
        order = self._base_order(shipping_mode="real", shipping_amount=6.50)
        with patch.dict("os.environ", {"STRIPE_SECRET_KEY": "sk_test_x", "STRIPE_CONNECT_APPLICATION_FEE_BPS": "500"}), \
             patch.object(commerce, "create_stripe_session", return_value={}) as stripe:
            commerce.stripe_checkout_session(
                order, "https://example.invalid/success", "https://example.invalid/cancel",
                connected_account_id=None,
            )
        self.assertIsNone(stripe.call_args.kwargs["application_fee_amount"])


class TeamSettingsShippingHelperTests(ShippingTestsBase):
    def test_real_rates_available_requires_key_and_full_origin(self):
        raw = {}
        with patch.dict("os.environ", {"EASYPOST_API_KEY": ""}):
            self.assertFalse(team_settings.real_shipping_rates_available(raw))
        with patch.dict("os.environ", {"EASYPOST_API_KEY": "EZTK_fake"}):
            self.assertFalse(team_settings.real_shipping_rates_available(raw))
            raw = {
                "shipping.origin_street1": "1 Main St", "shipping.origin_city": "Miami",
                "shipping.origin_state": "FL", "shipping.origin_zip": "33101",
            }
            self.assertTrue(team_settings.real_shipping_rates_available(raw))

    def test_get_shipping_origin_and_parcel_none_when_unavailable(self):
        with patch.dict("os.environ", {"EASYPOST_API_KEY": ""}):
            self.assertIsNone(team_settings.get_shipping_origin_and_parcel(self.session, "store_owner"))

    def test_get_shipping_origin_and_parcel_returns_easypost_shape(self):
        self._configure_full_origin()
        with patch.dict("os.environ", {"EASYPOST_API_KEY": "EZTK_fake"}):
            origin = team_settings.get_shipping_origin_and_parcel(self.session, "store_owner")
        self.assertEqual(origin["from_address"]["street1"], "1 Main St")
        self.assertEqual(origin["length_in"], 9.0)


if __name__ == "__main__":
    unittest.main()
