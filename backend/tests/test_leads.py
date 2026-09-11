import asyncio
import unittest
from unittest.mock import AsyncMock, patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from starlette.requests import Request

from app import leads
from app.db import Base
from app.db_models import Lead


def request() -> Request:
    return Request({"type": "http", "method": "POST", "path": "/api/v1/leads", "headers": [], "client": ("127.0.0.1", 1234)})


class LeadTests(unittest.TestCase):
    def setUp(self) -> None:
        engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        Base.metadata.create_all(bind=engine)
        self.session = sessionmaker(bind=engine)()

    def tearDown(self) -> None:
        self.session.close()

    def payload(self, **updates):
        data = {
            "businessName": "Café Central", "contactName": "Ana Pérez", "contactEmail": "ana@example.com",
            "phone": "+1 305 555 0182", "solutionType": "solution", "location": "Miami, US",
        }
        data.update(updates)
        return leads.LeadCreate(**data)

    def test_lead_is_saved_before_notification_and_returns_reference(self) -> None:
        with patch.object(leads, "_notify_lead", new=AsyncMock(return_value="not_configured")):
            result = asyncio.run(leads.create_lead(self.payload(), request(), self.session))
        saved = self.session.query(Lead).one()
        self.assertTrue(result["reference"].startswith("SOL-"))
        self.assertEqual(saved.business_name, "Café Central")
        self.assertEqual(saved.notification_status, "not_configured")

    def test_honeypot_returns_neutral_success_without_saving(self) -> None:
        result = asyncio.run(leads.create_lead(self.payload(website="spam.example"), request(), self.session))
        self.assertEqual(result, {"received": True, "reference": "SOL-RECIBIDA"})
        self.assertEqual(self.session.query(Lead).count(), 0)

    def test_notification_failure_does_not_lose_saved_lead(self) -> None:
        with patch.object(leads, "_notify_lead", new=AsyncMock(return_value="failed")):
            result = asyncio.run(leads.create_lead(self.payload(), request(), self.session))
        self.assertTrue(result["received"])
        self.assertEqual(self.session.query(Lead).one().notification_status, "failed")


if __name__ == "__main__":
    unittest.main()
