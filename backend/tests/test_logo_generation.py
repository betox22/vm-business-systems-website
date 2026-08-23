import asyncio
import base64
import unittest
from types import SimpleNamespace
from unittest.mock import Mock

from app.logo_generation import build_logo_prompt, generate_and_store_ai_logo
from app.main import build_schema_from_state
from app.models import ProjectState


class _FakeImages:
    def __init__(self, *, image_bytes: bytes | None = None, error: Exception | None = None) -> None:
        self.image_bytes = image_bytes
        self.error = error
        self.calls = []

    async def generate(self, **kwargs):
        self.calls.append(kwargs)
        if self.error:
            raise self.error
        return SimpleNamespace(data=[SimpleNamespace(
            b64_json=base64.b64encode(self.image_bytes or b"png-image").decode("ascii")
        )])


class LogoGenerationTests(unittest.TestCase):
    def test_logo_prompt_preserves_explicit_bad_initials(self) -> None:
        prompt = build_logo_prompt(ProjectState(
            businessName="Bath All Day",
            industry="beauty",
            logoPreference="generate_ai_logo",
            logoBrief="Quiero un logo con las iniciales BAD.",
        ))

        self.assertIn("initials BAD", prompt)
        self.assertIn("central monogram", prompt)
        self.assertNotIn("no rendered words or letters", prompt)

    def test_logo_prompt_requires_original_non_trademarked_design(self) -> None:
        prompt = build_logo_prompt(ProjectState(
            businessName="Turbo Parts VE",
            industry="automotive",
            logoPreference="generate_ai_logo",
        ))

        self.assertIn("100% original", prompt)
        self.assertIn("must not imitate, reference, remix, or reuse", prompt)
        self.assertIn("brand, logo, trademark, trade dress, or competitor", prompt)
        self.assertIn("independent visual identity from first principles", prompt)
        self.assertIn("discard it and create a substantially different original concept", prompt)
        self.assertIn("senior brand identity designer and marketing strategist", prompt)
        self.assertIn("emotional promise", prompt)
        self.assertIn("purposeful symbol, monogram, or typographic composition", prompt)
        self.assertIn("Avoid clip art", prompt)
        self.assertIn("one central metaphor", prompt)
        self.assertIn("at most two or three visual elements", prompt)
        self.assertIn("No gradients, glow, shadows", prompt)

    def test_logo_prompt_uses_business_positioning_inputs(self) -> None:
        prompt = build_logo_prompt(ProjectState(
            businessName="NexusOps",
            businessDescription="B2B automation platform for operations teams.",
            industry="enterprise technology",
            servicesProducts=["workflow automation", "analytics", "integrations"],
            targetAudience="operations leaders at mid-market companies",
            preferredTone="precise, trustworthy, modern",
            logoPreference="generate_ai_logo",
        ))

        self.assertIn("workflow automation, analytics, integrations", prompt)
        self.assertIn("operations leaders at mid-market companies", prompt)
        self.assertIn("precise, trustworthy, modern", prompt)
        self.assertIn("symbol, wordmark, or combination mark", prompt)
        self.assertIn("exact business name 'NexusOps'", prompt)

    def test_openai_logo_is_uploaded_and_attached_to_state(self) -> None:
        images = _FakeImages(image_bytes=b"generated-png")
        client = SimpleNamespace(images=images)
        uploader = Mock(return_value="https://storage.example.com/site-assets/bath/logo.png")
        state = ProjectState(
            businessName="Bath All Day",
            businessDescription="Handmade soaps, candles, and bath products.",
            industry="beauty",
            preferredColors="lavender and sage",
            colorProvenance={"anchorColor": "#7C6AA6", "anchorSource": "explicit_client"},
            colors={"primary": "#7C6AA6", "secondary": "#A8B89A", "accent": "#F4C7D9"},
            logoPreference="generate_ai_logo",
        )

        outcome = asyncio.run(generate_and_store_ai_logo(
            state,
            business_id="bath-all-day",
            site_id="site-test",
            client=client,
            uploader=uploader,
        ))

        self.assertEqual(outcome.status, "generated")
        self.assertEqual(state.logoUrl, uploader.return_value)
        self.assertEqual(state.logoGenerationStatus, "generated")
        self.assertEqual(images.calls[0]["model"], "gpt-image-2")
        self.assertEqual(images.calls[0]["quality"], "low")
        self.assertEqual(images.calls[0]["size"], "1024x1024")
        self.assertEqual(images.calls[0]["background"], "transparent")
        self.assertIn("#7C6AA6", images.calls[0]["prompt"])
        self.assertIn("100% original", images.calls[0]["prompt"])
        self.assertIn("must not imitate", images.calls[0]["prompt"])
        uploader.assert_called_once()
        self.assertEqual(uploader.call_args.kwargs["data"], b"generated-png")

        schema = build_schema_from_state(state, catalog_items=[], catalog_source="seed_fallback")
        self.assertEqual(schema["brand"]["logoUrl"], uploader.return_value)
        self.assertEqual(schema["generation_metadata"]["logo_status"], "generated")

    def test_openai_failure_keeps_site_generation_working_without_logo(self) -> None:
        client = SimpleNamespace(images=_FakeImages(error=RuntimeError("rate limit")))
        uploader = Mock()
        state = ProjectState(
            businessName="Bath All Day",
            businessDescription="Handmade bath products.",
            industry="beauty",
            logoPreference="generate_ai_logo",
        )

        outcome = asyncio.run(generate_and_store_ai_logo(
            state,
            business_id="bath-all-day",
            site_id="site-test",
            client=client,
            uploader=uploader,
        ))
        schema = build_schema_from_state(state, catalog_items=[], catalog_source="seed_fallback")

        self.assertEqual(outcome.status, "generation_failed")
        self.assertIsNone(state.logoUrl)
        self.assertEqual(schema["generation_metadata"]["logo_status"], "generation_failed")
        self.assertFalse(schema["generation_metadata"]["logo_pending_generation"])
        self.assertTrue(schema["pages"])
        uploader.assert_not_called()


if __name__ == "__main__":
    unittest.main()
