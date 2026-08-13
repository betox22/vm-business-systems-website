import unittest

from sqlalchemy import create_engine, event, select
from sqlalchemy.orm import sessionmaker

from app.db import Base
from app.db_models import GeneratedSite, Store
from app.main import persist_generated_site
from app.models import WebsiteGenerationRequest


class PersistGeneratedSiteTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
        )

        @event.listens_for(self.engine, "connect")
        def enable_foreign_keys(dbapi_connection, _connection_record) -> None:
            dbapi_connection.execute("PRAGMA foreign_keys=ON")

        Base.metadata.create_all(bind=self.engine)
        self.session = sessionmaker(bind=self.engine)()

    def tearDown(self) -> None:
        self.session.close()
        self.engine.dispose()

    def test_first_generated_site_persists_new_store_before_foreign_key_reference(self) -> None:
        self.assertIsNone(self.session.execute(select(Store)).scalar_one_or_none())

        schema = {
            "business": {
                "name": "Bath All Day",
                "industry": "handmade beauty",
                "description": "Handmade soaps, candles, and bath bombs.",
            },
            "selectedTemplate": {
                "id": "premium-product-store",
                "name": "Premium Product Store",
                "category": "premium_product",
            },
            "theme": {
                "colors": {
                    "primary": "#1D6E91",
                    "accent": "#E2A76F",
                }
            },
            "pages": [
                {
                    "title": "Home",
                    "sections": [
                        {
                            "type": "hero",
                            "editable": {
                                "headline": "Handmade comfort for every bath",
                                "subtitle": "Discover soaps, candles, and bath bombs.",
                            },
                        }
                    ],
                }
            ],
            "navigation": [{"label": "Home"}],
        }

        site = persist_generated_site(
            self.session,
            user={"id": "user_new_account", "email": "new-account@example.com"},
            request=WebsiteGenerationRequest(businessName="Bath All Day"),
            schema=schema,
        )

        store = self.session.execute(select(Store)).scalar_one()
        persisted_site = self.session.execute(
            select(GeneratedSite).where(GeneratedSite.id == site.id)
        ).scalar_one()

        self.assertEqual(store.owner_user_id, "user_new_account")
        self.assertEqual(store.owner_email, "new-account@example.com")
        self.assertEqual(persisted_site.store_id, store.id)
        self.assertEqual(site.store_id, store.id)


if __name__ == "__main__":
    unittest.main()
