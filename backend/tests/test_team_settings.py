from __future__ import annotations

import asyncio
import unittest
from unittest.mock import patch

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import client_auth, team_settings
from app.db import Base
from app.db_models import Store


def _memory_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


class TeamSettingsTestsBase(unittest.TestCase):
    def setUp(self) -> None:
        self.session = _memory_session()
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
        self.session.add(
            Store(
                id="store_other",
                owner_user_id="user_other",
                owner_email="other@example.com",
                name="Other Store",
                business_type="retail",
                public_url="other.usekreaton.com",
            )
        )
        self.session.commit()

    def tearDown(self) -> None:
        self.session.close()

    def _owner_auth(self):
        return patch.multiple(
            client_auth,
            supabase_auth_configured=lambda: True,
            fetch_supabase_user=lambda token: {"id": "user_owner", "email": "owner@example.com"},
        )

    def _intruder_auth(self):
        return patch.multiple(
            client_auth,
            supabase_auth_configured=lambda: True,
            fetch_supabase_user=lambda token: {"id": "user_other", "email": "other@example.com"},
        )

    def _owner_user(self):
        return client_auth.authenticated_client_user("Bearer token")


class TeamMemberTests(TeamSettingsTestsBase):
    def test_owner_can_create_list_update_delete_team_member(self) -> None:
        with self._owner_auth():
            created = asyncio.run(
                team_settings.create_team_member(
                    "store_owner",
                    team_settings.TeamMemberCreate(name="Ana Perez", role="manager", scope="Atiende pedidos"),
                    user=self._owner_user(),
                    session=self.session,
                )
            )
            self.assertEqual(created["name"], "Ana Perez")
            self.assertEqual(created["role"], "manager")
            self.assertEqual(created["scope"], "Atiende pedidos")
            self.assertIsInstance(created["createdAt"], int)

            listed = asyncio.run(
                team_settings.list_team_members("store_owner", user=self._owner_user(), session=self.session)
            )
            self.assertEqual([m["id"] for m in listed["members"]], [created["id"]])

            updated = asyncio.run(
                team_settings.update_team_member(
                    "store_owner",
                    created["id"],
                    team_settings.TeamMemberUpdate(role="viewer"),
                    user=self._owner_user(),
                    session=self.session,
                )
            )
            self.assertEqual(updated["role"], "viewer")
            self.assertEqual(updated["name"], "Ana Perez")  # untouched field preserved

            deleted = asyncio.run(
                team_settings.delete_team_member(
                    "store_owner", created["id"], user=self._owner_user(), session=self.session
                )
            )
            self.assertEqual(deleted, {"id": created["id"], "deleted": True})

            listed_after = asyncio.run(
                team_settings.list_team_members("store_owner", user=self._owner_user(), session=self.session)
            )
            self.assertEqual(listed_after["members"], [])

    def test_team_member_rejects_non_owner(self) -> None:
        with self._owner_auth():
            created = asyncio.run(
                team_settings.create_team_member(
                    "store_owner",
                    team_settings.TeamMemberCreate(name="Ana Perez", role="manager"),
                    user=self._owner_user(),
                    session=self.session,
                )
            )

        with self._intruder_auth():
            with self.assertRaises(HTTPException) as error:
                asyncio.run(
                    team_settings.list_team_members("store_owner", user=self._owner_user(), session=self.session)
                )
            self.assertEqual(error.exception.status_code, 403)

            with self.assertRaises(HTTPException) as error:
                asyncio.run(
                    team_settings.update_team_member(
                        "store_owner",
                        created["id"],
                        team_settings.TeamMemberUpdate(role="viewer"),
                        user=self._owner_user(),
                        session=self.session,
                    )
                )
            self.assertEqual(error.exception.status_code, 403)

    def test_team_member_from_another_store_not_found(self) -> None:
        with self._owner_auth():
            created = asyncio.run(
                team_settings.create_team_member(
                    "store_owner",
                    team_settings.TeamMemberCreate(name="Ana Perez", role="manager"),
                    user=self._owner_user(),
                    session=self.session,
                )
            )

        with patch.multiple(
            client_auth,
            supabase_auth_configured=lambda: True,
            fetch_supabase_user=lambda token: {"id": "user_other", "email": "other@example.com"},
        ):
            with self.assertRaises(HTTPException) as error:
                asyncio.run(
                    team_settings.update_team_member(
                        "store_other",
                        created["id"],
                        team_settings.TeamMemberUpdate(role="viewer"),
                        user=self._owner_user(),
                        session=self.session,
                    )
                )
            # Wrong store entirely for this member -> 404, not leaked cross-store.
            self.assertEqual(error.exception.status_code, 404)

    def test_invalid_role_rejected_by_schema(self) -> None:
        with self.assertRaises(ValidationError):
            team_settings.TeamMemberCreate(name="Ana Perez", role="super_admin")


class StoreSettingsTests(TeamSettingsTestsBase):
    def test_defaults_when_nothing_configured(self) -> None:
        with self._owner_auth():
            settings = asyncio.run(
                team_settings.get_store_settings("store_owner", user=self._owner_user(), session=self.session)
            )
        self.assertEqual(settings.business.publicName, "Owner Store")
        self.assertEqual(settings.business.currency, "USD")
        self.assertEqual(settings.business.contactEmail, "owner@example.com")
        self.assertEqual(settings.shipping.flatRate, 0.0)
        self.assertIsNone(settings.shipping.freeShippingThreshold)
        self.assertTrue(settings.notifications.newOrderEmail)
        self.assertTrue(settings.notifications.lowStockEmail)
        self.assertEqual(settings.notifications.notifyEmail, "owner@example.com")

    def test_patch_updates_only_provided_fields(self) -> None:
        with self._owner_auth():
            asyncio.run(
                team_settings.update_store_settings(
                    "store_owner",
                    team_settings.StoreSettingsPatch(
                        business=team_settings.BusinessSettingsPatch(publicName="Tienda Ana")
                    ),
                    user=self._owner_user(),
                    session=self.session,
                )
            )
            settings = asyncio.run(
                team_settings.get_store_settings("store_owner", user=self._owner_user(), session=self.session)
            )
        self.assertEqual(settings.business.publicName, "Tienda Ana")
        # Untouched groups keep their defaults.
        self.assertEqual(settings.business.currency, "USD")
        self.assertEqual(settings.shipping.flatRate, 0.0)
        self.assertTrue(settings.notifications.newOrderEmail)

    def test_shipping_dollars_roundtrip_through_cents(self) -> None:
        with self._owner_auth():
            asyncio.run(
                team_settings.update_store_settings(
                    "store_owner",
                    team_settings.StoreSettingsPatch(
                        shipping=team_settings.ShippingSettingsPatch(flatRate=7.5, freeShippingThreshold=50)
                    ),
                    user=self._owner_user(),
                    session=self.session,
                )
            )
            settings = asyncio.run(
                team_settings.get_store_settings("store_owner", user=self._owner_user(), session=self.session)
            )
        self.assertEqual(settings.shipping.flatRate, 7.5)
        self.assertEqual(settings.shipping.freeShippingThreshold, 50.0)

    def test_clear_free_shipping_threshold(self) -> None:
        with self._owner_auth():
            asyncio.run(
                team_settings.update_store_settings(
                    "store_owner",
                    team_settings.StoreSettingsPatch(
                        shipping=team_settings.ShippingSettingsPatch(freeShippingThreshold=50)
                    ),
                    user=self._owner_user(),
                    session=self.session,
                )
            )
            asyncio.run(
                team_settings.update_store_settings(
                    "store_owner",
                    team_settings.StoreSettingsPatch(
                        shipping=team_settings.ShippingSettingsPatch(clearFreeShippingThreshold=True)
                    ),
                    user=self._owner_user(),
                    session=self.session,
                )
            )
            settings = asyncio.run(
                team_settings.get_store_settings("store_owner", user=self._owner_user(), session=self.session)
            )
        self.assertIsNone(settings.shipping.freeShippingThreshold)

    def test_negative_flat_rate_rejected_by_schema(self) -> None:
        with self.assertRaises(ValidationError):
            team_settings.ShippingSettingsPatch(flatRate=-5)

    def test_settings_rejects_non_owner(self) -> None:
        with self._intruder_auth():
            with self.assertRaises(HTTPException) as error:
                asyncio.run(
                    team_settings.get_store_settings("store_owner", user=self._owner_user(), session=self.session)
                )
            self.assertEqual(error.exception.status_code, 403)

    def test_settings_are_isolated_per_store(self) -> None:
        with self._owner_auth():
            asyncio.run(
                team_settings.update_store_settings(
                    "store_owner",
                    team_settings.StoreSettingsPatch(
                        business=team_settings.BusinessSettingsPatch(publicName="Tienda Ana")
                    ),
                    user=self._owner_user(),
                    session=self.session,
                )
            )

        with self._intruder_auth():
            other_settings = asyncio.run(
                team_settings.get_store_settings("store_other", user=self._owner_user(), session=self.session)
            )
        self.assertEqual(other_settings.business.publicName, "Other Store")


if __name__ == "__main__":
    unittest.main()
