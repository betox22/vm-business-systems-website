import asyncio
import unittest
from unittest.mock import patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from starlette.requests import Request

from app import main
from app.db import Base
from app.models import WebsiteGenerationRequest


def _memory_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


def _http_request() -> Request:
    return Request({
        "type": "http",
        "method": "POST",
        "path": "/ai/website-builder",
        "headers": [],
        "client": ("127.0.0.1", 49152),
        "scheme": "http",
        "server": ("testserver", 80),
    })


class WebsiteBuilderIntakeTests(unittest.TestCase):
    def setUp(self) -> None:
        self.session = _memory_session()

    def tearDown(self) -> None:
        self.session.close()

    def test_chat_ready_state_generates_without_second_intake_question(self) -> None:
        request = WebsiteGenerationRequest(
            business_name="Bath All Day",
            business_description="Handmade soaps, candles, and bath bombs sold online.",
            industry="beauty",
            services_products=["Lavender soap", "Vanilla candle", "Bath bomb"],
            preferred_tone="organic and warm",
            logoPalette=["#5B7F55", "#F4E7D3"],
            colorProvenance={
                "anchorColor": "#5B7F55",
                "anchorSource": "logo_extracted",
                "colors": [
                    {"color": "#5B7F55", "source": "logo_extracted"},
                    {"color": "#F4E7D3", "source": "logo_extracted"},
                ],
            },
            logoPreference="explicit_skip",
            salesFlow="online_sales",
            selectedLanguage="en",
            fieldMeta={
                "business_name": {"source": "explicit", "confidence": 0.95},
                "business_description": {"source": "explicit", "confidence": 0.95},
                "niche": {"source": "inferred", "confidence": 0.86},
                "industry": {"source": "inferred", "confidence": 0.86},
                "salesFlow": {"source": "ai_recommended", "confidence": 0.9},
                "sales_flow": {"source": "ai_recommended", "confidence": 0.9},
                "brand_style": {"source": "explicit", "confidence": 0.95},
                "preferredTone": {"source": "explicit", "confidence": 0.95},
                "logo": {"source": "explicit", "confidence": 0.95},
            },
        )

        captured_state = {}

        async def keep_validated_state(_prompt, state, **_kwargs):
            captured_state["state"] = state
            return state

        with patch.object(main.orchestrator, "run", side_effect=keep_validated_state):
            response = asyncio.run(main.website_builder(
                request,
                _http_request(),
                authorization="",
                luma_client_session="",
                session=self.session,
            ))

        self.assertFalse(response.needs_more_info)
        self.assertEqual(response.missing_fields, [])
        self.assertTrue(response.website_schema)
        self.assertEqual(response.website_schema["business"]["name"], "Bath All Day")
        self.assertEqual(captured_state["state"].logoPalette, ["#5B7F55", "#F4E7D3"])
        self.assertEqual(captured_state["state"].colorProvenance.anchorSource, "logo_extracted")
        self.assertEqual(response.website_schema["generation_metadata"]["theme_source"], "backend_generated")
        self.assertEqual(response.website_schema["brand"]["logoPalette"], ["#5B7F55", "#F4E7D3"])
        self.assertEqual(
            response.website_schema["brand"]["colorProvenance"]["anchorColor"],
            "#5B7F55",
        )

    def test_real_missing_fields_are_named_in_generation_response(self) -> None:
        request = WebsiteGenerationRequest(
            business_name="Bath All Day",
            business_description="Handmade soaps and candles.",
            industry="beauty",
            salesFlow="online_sales",
            selectedLanguage="en",
            fieldMeta={
                "niche": {"source": "explicit", "confidence": 1},
                "sales_flow": {"source": "explicit", "confidence": 1},
            },
        )

        response = asyncio.run(main.website_builder(
            request,
            _http_request(),
            authorization="",
            luma_client_session="",
            session=self.session,
        ))

        self.assertTrue(response.needs_more_info)
        self.assertEqual(response.missing_fields, ["services_products", "brand_style", "logo"])
        self.assertIn("products or services", response.next_question or "")
        self.assertIn("brand style", response.next_question or "")
        self.assertIn("logo", response.next_question or "")


if __name__ == "__main__":
    unittest.main()
