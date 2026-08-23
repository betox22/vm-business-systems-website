import unittest
from unittest.mock import patch

from fastapi import HTTPException
from sqlalchemy import create_engine, event, select
from sqlalchemy.orm import sessionmaker

from app import main
from app.db import Base
from app.db_models import DomainReservation, GeneratedSite, Store
from app.models import ClientProjectDeleteRequest


class ClientProjectDeleteTests(unittest.IsolatedAsyncioTestCase):
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
        self.store = Store(
            id="store_owner",
            owner_user_id="owner-1",
            owner_email="owner@example.com",
            name="Bath All Day",
            business_type="beauty",
            public_url="bath-all-day.usekreaton.com",
            status="draft",
        )
        self.site = GeneratedSite(
            id="site_bath",
            store_id=self.store.id,
            owner_user_id="owner-1",
            owner_email="owner@example.com",
            business_name="Bath All Day",
            business_type="beauty",
            template_id="premium-product-store",
            template_name="Premium Product Store",
            template_mode="commerce",
            domain_slug="bath-all-day",
            public_url="bath-all-day.usekreaton.com",
            status="draft",
            generated_config='{"business":{"name":"Bath All Day"}}',
        )
        self.session.add(self.store)
        self.session.flush()
        self.session.add(self.site)
        self.session.commit()
        main.client_intake_sessions.clear()

    def tearDown(self) -> None:
        main.client_intake_sessions.clear()
        self.session.close()
        self.engine.dispose()

    async def _delete(self, *, project_id="site_bath", business_name="Bath All Day", user=None):
        user = user or {"id": "owner-1", "email": "owner@example.com"}
        with (
            patch.object(main, "authenticated_client_user", return_value=user),
            patch.object(main, "delete_site_assets_from_supabase", return_value=3) as delete_assets,
        ):
            result = await main.delete_client_project(
                project_id,
                ClientProjectDeleteRequest(businessName=business_name),
                authorization="Bearer token",
                session=self.session,
            )
        return result, delete_assets

    async def test_owner_can_delete_project_with_matching_business_name(self) -> None:
        result, delete_assets = await self._delete()

        self.assertTrue(result["deleted"])
        self.assertEqual(result["project_id"], "site_bath")
        delete_assets.assert_called_once_with(business_id="store_owner", site_id="site_bath")

    async def test_wrong_business_name_is_rejected_without_deleting(self) -> None:
        with (
            patch.object(main, "authenticated_client_user", return_value={"id": "owner-1", "email": "owner@example.com"}),
            patch.object(main, "delete_site_assets_from_supabase") as delete_assets,
        ):
            with self.assertRaises(HTTPException) as context:
                await main.delete_client_project(
                    "site_bath",
                    ClientProjectDeleteRequest(businessName="Different Business"),
                    authorization="Bearer token",
                    session=self.session,
                )

        self.assertEqual(context.exception.status_code, 409)
        self.assertIsNotNone(self.session.get(GeneratedSite, "site_bath"))
        delete_assets.assert_not_called()

    async def test_complete_delete_removes_site_assets_and_intake_but_preserves_store(self) -> None:
        reservation = DomainReservation(
            id="domain_bath",
            generated_site_id="site_bath",
            store_id="store_owner",
            owner_email="owner@example.com",
            requested_domain="bathallday.com",
            assigned_domain="bath-all-day.usekreaton.com",
            availability_status="assigned",
            purchase_status="pending",
            price_cents=0,
            retail_price_cents=0,
        )
        self.session.add(reservation)
        self.session.commit()
        main.client_intake_sessions["owner@example.com:req-1"] = {
            "clientEmail": "owner@example.com",
            "projectId": "site_bath",
            "requestId": "req-1",
        }

        result, _delete_assets = await self._delete()

        self.assertEqual(result["deleted_assets"], 3)
        self.assertEqual(result["deleted_intake_sessions"], 1)
        self.assertIsNone(self.session.get(GeneratedSite, "site_bath"))
        self.assertIsNotNone(self.session.get(Store, "store_owner"))
        self.assertIsNone(self.session.get(DomainReservation, "domain_bath").generated_site_id)
        self.assertNotIn("owner@example.com:req-1", main.client_intake_sessions)

    async def test_project_owned_by_another_account_is_not_found(self) -> None:
        with (
            patch.object(main, "authenticated_client_user", return_value={"id": "other", "email": "other@example.com"}),
            patch.object(main, "delete_site_assets_from_supabase") as delete_assets,
        ):
            with self.assertRaises(HTTPException) as context:
                await main.delete_client_project(
                    "site_bath",
                    ClientProjectDeleteRequest(businessName="Bath All Day"),
                    authorization="Bearer token",
                    session=self.session,
                )

        self.assertEqual(context.exception.status_code, 404)
        delete_assets.assert_not_called()

    async def test_missing_project_returns_not_found(self) -> None:
        with patch.object(main, "authenticated_client_user", return_value={"id": "owner-1", "email": "owner@example.com"}):
            with self.assertRaises(HTTPException) as context:
                await main.delete_client_project(
                    "site_missing",
                    ClientProjectDeleteRequest(businessName="Missing"),
                    authorization="Bearer token",
                    session=self.session,
                )

        self.assertEqual(context.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
