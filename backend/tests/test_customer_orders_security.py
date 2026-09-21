from __future__ import annotations

import asyncio
import unittest

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from starlette.requests import Request

from app import commerce
from app.db import Base
from app.db_models import Customer as DbCustomer
from app.db_models import Order as DbOrder
from app.db_models import Store


def _memory_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


def _fake_request(client_ip: str = "203.0.113.5", *, x_forwarded_for: str | None = None) -> Request:
    headers = []
    if x_forwarded_for:
        headers.append((b"x-forwarded-for", x_forwarded_for.encode()))
    scope = {
        "type": "http",
        "headers": headers,
        "client": (client_ip, 12345),
        "method": "GET",
        "path": "/api/v1/customer/orders/whatever",
    }
    return Request(scope)


class CustomerOrdersSecurityTests(unittest.TestCase):
    """Regression coverage for the 2026-09-20 unauthenticated PII leak.

    Original bug: GET /customer/orders and GET /customer/orders/{order_number}
    resolved the caller's email from the unauthenticated `x_user_id` header via
    the in-memory CUSTOMER_PROFILES mock (which anyone could poison to an
    arbitrary email via PATCH /customer/me), then queried real orders across
    every store on the platform by that email alone -- no store scoping and
    no real authentication at all.
    """

    def setUp(self) -> None:
        self.session = _memory_session()
        commerce.CUSTOMER_PROFILES.clear()
        commerce.CUSTOMER_PROFILES["demo-customer"] = {
            "userId": "demo-customer",
            "email": "customer@example.com",
            "name": "Alex Rivera",
            "phone": "",
            "roles": ["customer"],
        }
        commerce.CUSTOMER_ADDRESSES.clear()
        commerce._CUSTOMER_ORDER_LOOKUP_BUCKETS.clear()

    def tearDown(self) -> None:
        self.session.close()
        commerce._CUSTOMER_ORDER_LOOKUP_BUCKETS.clear()

    def _seed_order(self, *, store_id: str, customer_email: str, order_number: str, business_name: str) -> None:
        self.session.add(
            Store(
                id=store_id,
                owner_user_id=f"owner_{store_id}",
                owner_email=f"owner_{store_id}@example.com",
                name=business_name,
                business_type="retail",
                public_url=f"{store_id}.usekreaton.com",
            )
        )
        customer = DbCustomer(id=f"cust_{store_id}", store_id=store_id, email=customer_email, name="Real Customer")
        self.session.add(customer)
        self.session.flush()
        self.session.add(
            DbOrder(
                id=f"ord_{store_id}",
                store_id=store_id,
                customer_id=customer.id,
                order_number=order_number,
                item_count=1,
                total_cents=5000,
                status="paid",
                customer_snapshot_json='{"email": "%s", "name": "Real Customer", "phone": "+1-555-0100"}' % customer_email,
                shipping_address_json='{"line1": "123 Real Street", "city": "Miami"}',
            )
        )
        self.session.commit()

    def test_forged_profile_no_longer_leaks_real_orders(self):
        # Reproduces the exact original attack chain: poison the fake profile
        # via PATCH /customer/me with a victim's real email, then call
        # GET /customer/orders with the same forged x_user_id.
        self._seed_order(
            store_id="store_victim",
            customer_email="victim@company.com",
            order_number="KR-REALVIC",
            business_name="Victim's Boutique",
        )
        patch_payload = commerce.CustomerProfilePatch(email="victim@company.com")
        profile = asyncio.run(commerce.update_customer_me(patch_payload, x_user_id="attacker-chosen-id"))
        self.assertEqual(profile["email"], "victim@company.com")

        result = asyncio.run(commerce.customer_orders(x_user_id="attacker-chosen-id"))
        self.assertEqual(
            result["orders"],
            [
                {
                    "orderNumber": "KR-2048",
                    "status": "in_transit",
                    "total": 1176,
                    "tracking": {"carrier": "UPS", "trackingNumber": "1Z88942"},
                }
            ],
        )
        serialized = str(result)
        self.assertNotIn("victim@company.com", serialized)
        self.assertNotIn("123 Real Street", serialized)

    def test_order_detail_requires_matching_email(self):
        self._seed_order(
            store_id="store_a", customer_email="real.customer@example.com",
            order_number="KR-AAA111", business_name="Store A",
        )
        order = asyncio.run(
            commerce.customer_order_detail(
                "KR-AAA111", _fake_request(), email="real.customer@example.com", session=self.session
            )
        )
        self.assertEqual(order["orderNumber"], "KR-AAA111")
        self.assertEqual(order["customer"]["email"], "real.customer@example.com")

        with self.assertRaises(HTTPException) as exc:
            asyncio.run(
                commerce.customer_order_detail(
                    "KR-AAA111", _fake_request(client_ip="203.0.113.6"),
                    email="not-the-owner@example.com", session=self.session,
                )
            )
        self.assertEqual(exc.exception.status_code, 404)

    def test_order_detail_does_not_leak_across_stores(self):
        self._seed_order(
            store_id="store_a", customer_email="alice@example.com",
            order_number="KR-STOREA1", business_name="Store A",
        )
        self._seed_order(
            store_id="store_b", customer_email="bob@example.com",
            order_number="KR-STOREB1", business_name="Store B",
        )
        # Alice's real email must not unlock Bob's order even if she guesses
        # Bob's order number.
        with self.assertRaises(HTTPException) as exc:
            asyncio.run(
                commerce.customer_order_detail(
                    "KR-STOREB1", _fake_request(client_ip="203.0.113.7"),
                    email="alice@example.com", session=self.session,
                )
            )
        self.assertEqual(exc.exception.status_code, 404)

        bob_order = asyncio.run(
            commerce.customer_order_detail(
                "KR-STOREB1", _fake_request(client_ip="203.0.113.8"),
                email="bob@example.com", session=self.session,
            )
        )
        self.assertEqual(bob_order["orderNumber"], "KR-STOREB1")

    def test_order_lookup_is_rate_limited_per_ip(self):
        self._seed_order(
            store_id="store_a", customer_email="real.customer@example.com",
            order_number="KR-AAA111", business_name="Store A",
        )
        client_ip = "198.51.100.9"
        for _ in range(20):
            with self.assertRaises(HTTPException) as exc:
                asyncio.run(
                    commerce.customer_order_detail(
                        "KR-AAA111", _fake_request(client_ip=client_ip),
                        email="wrong-guess@example.com", session=self.session,
                    )
                )
            self.assertEqual(exc.exception.status_code, 404)
        with self.assertRaises(HTTPException) as exc:
            asyncio.run(
                commerce.customer_order_detail(
                    "KR-AAA111", _fake_request(client_ip=client_ip),
                    email="wrong-guess@example.com", session=self.session,
                )
            )
        self.assertEqual(exc.exception.status_code, 429)

        # A different IP is not affected by the first IP's throttling.
        fresh_ip_attempt = asyncio.run(
            commerce.customer_order_detail(
                "KR-AAA111", _fake_request(client_ip="198.51.100.10"),
                email="real.customer@example.com", session=self.session,
            )
        )
        self.assertEqual(fresh_ip_attempt["orderNumber"], "KR-AAA111")

    def test_mock_profile_and_address_endpoints_are_unaffected(self):
        # Regression guard: only the two DB-backed routes changed behavior.
        profile = asyncio.run(commerce.customer_me(x_user_id="shopper-1"))
        self.assertEqual(profile["userId"], "shopper-1")

        addresses = asyncio.run(commerce.customer_addresses(x_user_id="shopper-1"))
        self.assertEqual(addresses, {"userId": "shopper-1", "addresses": []})


if __name__ == "__main__":
    unittest.main()
