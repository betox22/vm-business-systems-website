import asyncio
import unittest
from unittest.mock import patch

from starlette.requests import Request

from app import main
from app.logo_generation import LogoGenerationOutcome
from app.models import WebsiteGenerationRequest


def _http_request() -> Request:
    return Request({
        "type": "http",
        "method": "POST",
        "path": "/api/client/logo/generate",
        "headers": [],
        "client": ("127.0.0.1", 49321),
        "scheme": "http",
        "server": ("testserver", 80),
    })


class LogoReviewEndpointTests(unittest.TestCase):
    def test_logo_is_generated_for_review_before_website_generation(self) -> None:
        captured = {}

        async def generate_logo(state, **kwargs):
            captured["state"] = state
            captured["kwargs"] = kwargs
            state.logoUrl = "https://storage.example/bath-all-day-logo.png"
            state.logoGenerationStatus = "generated"
            return LogoGenerationOutcome(status="generated", url=state.logoUrl)

        request = WebsiteGenerationRequest(
            businessName="Bath All Day",
            businessDescription="Handmade soaps, candles and bath bombs.",
            industry="beauty",
            logoPreference="generate_ai_logo",
            logoBrief="Use the initials BAD.",
            preferredColors=["aqua", "white"],
        )

        with (
            patch.object(main, "authenticated_client_user", return_value={"sub": "client-123"}),
            patch.object(main, "generate_and_store_ai_logo", side_effect=generate_logo),
        ):
            response = asyncio.run(main.generate_client_logo(
                request,
                _http_request(),
                authorization="Bearer test",
                luma_client_session="",
            ))

        self.assertEqual(response["status"], "generated")
        self.assertEqual(response["logoUrl"], "https://storage.example/bath-all-day-logo.png")
        self.assertEqual(captured["state"].logoBrief, "Use the initials BAD.")
        self.assertEqual(captured["kwargs"]["business_id"], "client-123")

    def test_logo_failure_is_reported_without_raising(self) -> None:
        async def fail_logo(state, **_kwargs):
            state.logoGenerationStatus = "generation_failed"
            return LogoGenerationOutcome(status="generation_failed", warning="rate limit")

        with (
            patch.object(main, "authenticated_client_user", return_value={"sub": "client-123"}),
            patch.object(main, "generate_and_store_ai_logo", side_effect=fail_logo),
        ):
            response = asyncio.run(main.generate_client_logo(
                WebsiteGenerationRequest(
                    businessName="Bath All Day",
                    logoPreference="generate_ai_logo",
                ),
                _http_request(),
                authorization="Bearer test",
                luma_client_session="",
            ))

        self.assertEqual(response["status"], "generation_failed")
        self.assertEqual(response["logoUrl"], "")


if __name__ == "__main__":
    unittest.main()
