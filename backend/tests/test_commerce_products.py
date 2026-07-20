import asyncio
import unittest
from unittest.mock import patch

from fastapi import HTTPException
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app import commerce
from app.db import Base
from app.db_models import Product as DbProduct
from app.db_models import Store


def _memory_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


class StoreOwnerProductTests(unittest.TestCase):
    def setUp(self) -> None:
        self.session = _memory_session()
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


if __name__ == "__main__":
    unittest.main()
