import json
import unittest

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app.db import Base
from app.db_models import GeneratedSite, Store
from app.main import _public_site_payload


def _memory_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


class PublicSitePayloadTests(unittest.TestCase):
    def setUp(self) -> None:
        self.session = _memory_session()
        self.session.add(
            Store(
                id="store_1",
                owner_user_id="user_1",
                owner_email="owner@example.com",
                name="Copper Kettle Coffee Roasters",
                business_type="restaurant",
                public_url="copper-kettle.usekreaton.com",
            )
        )
        self.session.add(
            GeneratedSite(
                id="site_1",
                store_id="store_1",
                owner_user_id="user_1",
                owner_email="owner@example.com",
                business_name="Copper Kettle Coffee Roasters",
                business_type="restaurant",
                template_id="restaurant-food-business",
                template_name="Restaurant & Food Business",
                template_mode="visual_prototype",
                domain_slug="copper-kettle",
                public_url="copper-kettle-abc123.usekreaton.com",
                status="draft",
                generated_config=json.dumps({
                    "pages": [{"pageId": "home"}],
                    "catalog_items": [{"id": "prod_1", "name": "House Blend"}],
                }),
            )
        )
        self.session.commit()

    def test_resolve_by_id_returns_public_safe_payload(self) -> None:
        site = self.session.execute(
            select(GeneratedSite).where(GeneratedSite.id == "site_1")
        ).scalar_one_or_none()
        self.assertIsNotNone(site)

        payload = _public_site_payload(site)

        self.assertEqual(payload["site_id"], "site_1")
        self.assertEqual(payload["business_name"], "Copper Kettle Coffee Roasters")
        self.assertEqual(payload["public_url"], "copper-kettle-abc123.usekreaton.com")
        self.assertEqual(payload["schema"]["pages"][0]["pageId"], "home")
        self.assertEqual(payload["catalog_items"][0]["name"], "House Blend")
        # Nothing that identifies the owning account should leak into the
        # public payload.
        self.assertNotIn("owner_email", payload)
        self.assertNotIn("owner_user_id", payload)
        self.assertNotIn("store_id", payload)

    def test_resolve_by_host_matches_public_url(self) -> None:
        site = self.session.execute(
            select(GeneratedSite).where(GeneratedSite.public_url == "copper-kettle-abc123.usekreaton.com")
        ).scalar_one_or_none()
        self.assertIsNotNone(site)
        self.assertEqual(site.id, "site_1")

    def test_unknown_id_and_host_resolve_to_nothing(self) -> None:
        by_id = self.session.execute(
            select(GeneratedSite).where(GeneratedSite.id == "does_not_exist")
        ).scalar_one_or_none()
        by_host = self.session.execute(
            select(GeneratedSite).where(GeneratedSite.public_url == "nope.usekreaton.com")
        ).scalar_one_or_none()
        self.assertIsNone(by_id)
        self.assertIsNone(by_host)

    def test_malformed_generated_config_falls_back_to_empty_schema(self) -> None:
        self.session.add(
            GeneratedSite(
                id="site_2",
                store_id="store_1",
                owner_user_id="user_1",
                owner_email="owner@example.com",
                business_name="Broken Config Co",
                business_type="restaurant",
                template_id="restaurant-food-business",
                template_name="Restaurant & Food Business",
                template_mode="visual_prototype",
                domain_slug="broken-config",
                public_url="broken-config.usekreaton.com",
                status="draft",
                generated_config="not valid json",
            )
        )
        self.session.commit()
        site = self.session.execute(
            select(GeneratedSite).where(GeneratedSite.id == "site_2")
        ).scalar_one_or_none()

        payload = _public_site_payload(site)

        self.assertEqual(payload["schema"], {})
        self.assertEqual(payload["catalog_items"], [])


if __name__ == "__main__":
    unittest.main()
