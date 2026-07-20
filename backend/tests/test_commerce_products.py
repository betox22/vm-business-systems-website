import asyncio
import json
import unittest
from unittest.mock import patch

from fastapi import HTTPException
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app import commerce
from app.db import Base
from app.db_models import Customer as DbCustomer
from app.db_models import Order as DbOrder
from app.db_models import Product as DbProduct
from app.db_models import Store


def _memory_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


class StoreOwnerProductTests(unittest.TestCase):
    def setUp(self) -> None:
        self.session = _memory_session()
        commerce.CARTS.clear()
        commerce.IDEMPOTENCY_KEYS.clear()
        commerce.AUDIT_LOG.clear()
        commerce.CUSTOMER_PROFILES.pop("buyer-user", None)
        self.session.add(
            Store(
                id="store_owner",
                owner_user_id="user_owner",
                owner_email="owner@example.com",
                name="Owner Store",
                business_type="retail",
                public_url="owner.vmstores.com",
            )
        )
        self.session.add(
            Store(
                id="store_other",
                owner_user_id="user_other",
                owner_email="other@example.com",
                name="Other Store",
                business_type="retail",
                public_url="other.vmstores.com",
            )
        )
        self.session.add(
            DbProduct(
                id="prod_other",
                store_id="store_other",
                name="Other Product",
                category="other",
                price_cents=9900,
                inventory=2,
                status="Published",
            )
        )
        self.session.commit()

    def tearDown(self) -> None:
        self.session.close()

    def _owner_auth(self):
        return patch.multiple(
            commerce,
            supabase_auth_configured=lambda: True,
            fetch_supabase_user=lambda token: {"id": "user_owner", "email": "owner@example.com"},
        )

    def _add_owner_product(
        self,
        *,
        product_id: str = "prod_owner",
        name: str = "Crystal Soap Bar",
        category: str = "bath",
        price_cents: int = 1250,
        inventory: int = 8,
        status: str = "Published",
    ) -> DbProduct:
        product = DbProduct(
            id=product_id,
            store_id="store_owner",
            name=name,
            category=category,
            price_cents=price_cents,
            inventory=inventory,
            status=status,
        )
        self.session.add(product)
        self.session.commit()
        return product

    def test_owner_can_create_and_list_real_db_products(self) -> None:
        with self._owner_auth():
            created = asyncio.run(
                commerce.owner_create_product(
                    "store_owner",
                    commerce.ProductCreate(
                        name="Crystal Soap Bar",
                        categoryId="bath",
                        description="Ignored until product schema grows.",
                        price=12.5,
                        sku="SOAP-001",
                        stock=8,
                        active=True,
                        published=True,
                    ),
                    authorization="Bearer token",
                    session=self.session,
                )
            )
            listed = asyncio.run(
                commerce.owner_products(
                    "store_owner",
                    authorization="Bearer token",
                    session=self.session,
                )
            )

        stored = self.session.scalar(select(DbProduct).where(DbProduct.id == created["id"]))
        self.assertIsNotNone(stored)
        self.assertEqual(stored.store_id, "store_owner")
        self.assertEqual(stored.price_cents, 1250)
        self.assertEqual(stored.inventory, 8)
        self.assertEqual(created["price"], 12.5)
        self.assertEqual(created["stock"], 8)
        self.assertEqual([product["id"] for product in listed["products"]], [created["id"]])

    def test_owner_products_rejects_non_owner(self) -> None:
        with patch.multiple(
            commerce,
            supabase_auth_configured=lambda: True,
            fetch_supabase_user=lambda token: {"id": "intruder", "email": "intruder@example.com"},
        ):
            with self.assertRaises(HTTPException) as error:
                asyncio.run(
                    commerce.owner_products(
                        "store_owner",
                        authorization="Bearer token",
                        session=self.session,
                    )
                )

        self.assertEqual(error.exception.status_code, 403)

    def test_public_storefront_reads_real_store_products(self) -> None:
        self._add_owner_product()
        self._add_owner_product(product_id="prod_related", name="Bath Towel", inventory=4)

        home = asyncio.run(commerce.storefront_home("store_owner", session=self.session))
        products = asyncio.run(commerce.storefront_products("store_owner", session=self.session))
        detail = asyncio.run(
            commerce.storefront_product_detail(
                "store_owner",
                "crystal-soap-bar",
                session=self.session,
            )
        )
        categories = asyncio.run(commerce.storefront_categories("store_owner", session=self.session))

        self.assertEqual(home["business"]["id"], "store_owner")
        self.assertEqual(home["business"]["name"], "Owner Store")
        self.assertEqual({product["id"] for product in products["products"]}, {"prod_owner", "prod_related"})
        self.assertEqual(detail["product"]["id"], "prod_owner")
        self.assertEqual([product["id"] for product in detail["related"]], ["prod_related"])
        self.assertEqual(categories["categories"][0]["id"], "bath")
        self.assertEqual(categories["categories"][0]["productCount"], 2)

        with self.assertRaises(HTTPException) as error:
            asyncio.run(commerce.storefront_products("missing_store", session=self.session))
        self.assertEqual(error.exception.status_code, 404)

    def test_checkout_creates_real_order_customer_and_decrements_inventory(self) -> None:
        self._add_owner_product(inventory=5)
        cart = asyncio.run(
            commerce.add_cart_item(
                commerce.AddCartItemRequest(
                    businessId="store_owner",
                    cartId="cart_real",
                    productId="prod_owner",
                    quantity=2,
                ),
                session=self.session,
            )
        )
        self.assertEqual(cart["items"][0]["productId"], "prod_owner")
        self.assertEqual(cart["items"][0]["stockAvailable"], 5)

        checkout_payload = commerce.CheckoutSessionRequest(
            cartId="cart_real",
            businessId="store_owner",
            customer=commerce.CustomerInfo(email="BUYER@example.com", firstName="Bea", lastName="Rivera"),
            shippingAddress=commerce.ShippingAddress(line1="120 Market Street", city="Miami", region="FL", postalCode="33101"),
            successUrl="https://example.com/success",
            cancelUrl="https://example.com/cart",
        )
        with patch.dict("os.environ", {"STRIPE_SECRET_KEY": ""}):
            checkout = asyncio.run(
                commerce.create_checkout_session(
                    checkout_payload,
                    idempotency_key="idem-real-order",
                    session=self.session,
                )
            )

        order_id = checkout["order"]["id"]
        stored_order = self.session.get(DbOrder, order_id)
        stored_product = self.session.get(DbProduct, "prod_owner")
        customer = self.session.execute(
            select(DbCustomer).where(DbCustomer.store_id == "store_owner", DbCustomer.email == "buyer@example.com")
        ).scalar_one()

        self.assertIsNotNone(stored_order)
        self.assertEqual(stored_order.store_id, "store_owner")
        self.assertEqual(stored_order.customer_id, customer.id)
        self.assertEqual(stored_product.inventory, 3)
        self.assertEqual(json.loads(stored_order.items_json)[0]["productId"], "prod_owner")
        self.assertEqual(json.loads(stored_order.payment_json)["providerStatus"], "not_configured")
        self.assertEqual(checkout["order"]["status"], "pending_payment")

        commerce.CUSTOMER_PROFILES["buyer-user"] = {
            "userId": "buyer-user",
            "email": "buyer@example.com",
            "name": "Bea Rivera",
            "phone": "",
            "roles": ["customer"],
        }
        customer_orders = asyncio.run(commerce.customer_orders("buyer-user", session=self.session))
        self.assertEqual(customer_orders["orders"][0]["id"], order_id)

        with self._owner_auth():
            owner_orders = asyncio.run(
                commerce.owner_orders("store_owner", authorization="Bearer token", session=self.session)
            )
            payments = asyncio.run(
                commerce.owner_payments("store_owner", authorization="Bearer token", session=self.session)
            )
            shipping = asyncio.run(
                commerce.owner_update_shipping(
                    "store_owner",
                    order_id,
                    commerce.ShippingPatch(carrier="UPS", trackingNumber="1Z88942", status="partially_fulfilled"),
                    authorization="Bearer token",
                    session=self.session,
                )
            )

        self.assertEqual(owner_orders["orders"][0]["id"], order_id)
        self.assertEqual(payments["events"][0]["orderId"], order_id)
        self.assertEqual(shipping["tracking"], {"carrier": "UPS", "trackingNumber": "1Z88942"})

    def test_cancelled_order_restores_inventory_once(self) -> None:
        self._add_owner_product(inventory=5)
        asyncio.run(
            commerce.add_cart_item(
                commerce.AddCartItemRequest(
                    businessId="store_owner",
                    cartId="cart_restock",
                    productId="prod_owner",
                    quantity=2,
                ),
                session=self.session,
            )
        )

        checkout_payload = commerce.CheckoutSessionRequest(
            cartId="cart_restock",
            businessId="store_owner",
            customer=commerce.CustomerInfo(email="buyer@example.com", firstName="Bea", lastName="Rivera"),
            shippingAddress=commerce.ShippingAddress(line1="120 Market Street", city="Miami", region="FL", postalCode="33101"),
            successUrl="https://example.com/success",
            cancelUrl="https://example.com/cart",
        )
        with patch.dict("os.environ", {"STRIPE_SECRET_KEY": ""}):
            checkout = asyncio.run(
                commerce.create_checkout_session(
                    checkout_payload,
                    idempotency_key="idem-restock-order",
                    session=self.session,
                )
            )

        order_id = checkout["order"]["id"]
        self.assertEqual(self.session.get(DbProduct, "prod_owner").inventory, 3)

        with self._owner_auth():
            cancelled = asyncio.run(
                commerce.owner_update_order_status(
                    "store_owner",
                    order_id,
                    commerce.OrderStatusPatch(status="cancelled"),
                    authorization="Bearer token",
                    session=self.session,
                )
            )

        self.assertEqual(cancelled["status"], "cancelled")
        self.assertEqual(self.session.get(DbProduct, "prod_owner").inventory, 5)
        self.assertTrue(self.session.get(DbOrder, order_id).inventory_restocked)

        with self._owner_auth():
            asyncio.run(
                commerce.owner_update_order_status(
                    "store_owner",
                    order_id,
                    commerce.OrderStatusPatch(status="cancelled"),
                    authorization="Bearer token",
                    session=self.session,
                )
            )

        self.assertEqual(self.session.get(DbProduct, "prod_owner").inventory, 5)


if __name__ == "__main__":
    unittest.main()
