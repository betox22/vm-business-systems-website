import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db import Base
from app.domains import (
    build_domain_candidates,
    check_domain_availability,
    domain_price_for,
    is_premium_domain,
    normalize_domain_input,
    slugify,
)
from app import db_models  # noqa: F401  ensures tables are registered on Base


def _memory_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


class DomainHelperTests(unittest.TestCase):
    def test_slugify_strips_accents_and_symbols(self) -> None:
        self.assertEqual(slugify("Café Crazy Box!"), "cafe-crazy-box")

    def test_normalize_domain_input_adds_default_tld(self) -> None:
        self.assertEqual(normalize_domain_input("MiTienda", "mi-tienda"), "mitienda.com")

    def test_normalize_domain_input_strips_protocol_and_www(self) -> None:
        self.assertEqual(
            normalize_domain_input("https://www.Mi-Tienda.com/path?x=1", "fallback"),
            "mi-tienda.com",
        )

    def test_domain_price_for_known_and_unknown_tld(self) -> None:
        com_price = domain_price_for("crazybox.com")
        self.assertEqual(com_price["priceCents"], 1200)
        unknown_price = domain_price_for("crazybox.xyz")
        self.assertEqual(unknown_price["priceCents"], 1600)

    def test_vmstores_subdomain_is_free(self) -> None:
        price = domain_price_for("crazybox.vmstores.com")
        self.assertEqual(price["priceCents"], 0)

    def test_is_premium_domain_short_or_keyword(self) -> None:
        self.assertTrue(is_premium_domain("abcd.com"))
        self.assertTrue(is_premium_domain("primeshop.com"))
        self.assertFalse(is_premium_domain("a-normal-length-shop.com"))

    def test_build_domain_candidates_includes_vmstores_option(self) -> None:
        candidates = build_domain_candidates("crazybox.com")
        self.assertIn("crazybox.vmstores.com", candidates)
        self.assertIn("crazybox.com", candidates)


class DomainAvailabilityTests(unittest.TestCase):
    def setUp(self) -> None:
        self.session = _memory_session()

    def tearDown(self) -> None:
        self.session.close()

    def test_known_taken_domain_is_marked_taken(self) -> None:
        option = check_domain_availability(self.session, "amazon.com", "owner@example.com", None)
        self.assertFalse(option.available)
        self.assertEqual(option.status, "taken")

    def test_vmstores_subdomain_is_included_and_available(self) -> None:
        option = check_domain_availability(self.session, "crazybox.vmstores.com", "owner@example.com", None)
        self.assertTrue(option.available)
        self.assertEqual(option.status, "included")
        self.assertEqual(option.priceCents, 0)

    def test_reserved_domain_blocks_other_stores(self) -> None:
        from app.db_models import DomainReservation

        self.session.add(
            DomainReservation(
                owner_email="first-owner@example.com",
                store_id="store_a",
                requested_domain="crazyshop.com",
                assigned_domain="crazyshop.com",
                source="custom",
                registrar="Registrar API",
                availability_status="available",
                purchase_status="active",
                price_cents=1200,
                retail_price_cents=2500,
            )
        )
        self.session.commit()

        option = check_domain_availability(
            self.session, "crazyshop.com", "second-owner@example.com", "store_b"
        )
        self.assertFalse(option.available)
        self.assertEqual(option.status, "taken")

        same_store_option = check_domain_availability(
            self.session, "crazyshop.com", "first-owner@example.com", "store_a"
        )
        self.assertTrue(same_store_option.available)


if __name__ == "__main__":
    unittest.main()
