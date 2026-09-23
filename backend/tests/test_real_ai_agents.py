import json
import os
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from app import agents
from app.agents import ArtDirectorAgent, CopywriterAgent, IntakeExtractionAgent
from app.models import ProjectState


def _response(payload):
    return SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content=json.dumps(payload)))]
    )


class _BusinessAwareCompletions:
    def __init__(self):
        self.calls = []

    async def create(self, **kwargs):
        self.calls.append(kwargs)
        schema_name = kwargs["response_format"]["json_schema"]["name"]
        user_payload = kwargs["messages"][-1]["content"]
        payload = json.loads(user_payload) if user_payload.startswith("{") else {}
        business = payload.get("businessName", "")
        if schema_name == "kreaton_hero_copy":
            if business == "Harbor Legal":
                return _response({
                    "headline": "Protect your maritime contracts before disputes leave the dock",
                    "subheadline": "Harbor Legal reviews charter agreements and cargo claims for coastal operators who need practical answers.",
                    "primaryCta": "Review my maritime contract",
                })
            return _response({
                "headline": "Turn missed appointments into a calmer grooming day",
                "subheadline": "Happy Paws combines mobile dog grooming and gentle coat care at your client's doorstep.",
                "primaryCta": "Book mobile grooming",
            })
        if schema_name == "kreaton_art_direction":
            if business == "Harbor Legal":
                return _response({
                    "anchorColor": "#17324D",
                    "supportingColors": ["#C49A5A"],
                    "paletteStyle": "elegante",
                    "headingFont": "Merriweather",
                    "bodyFont": "Source Sans 3",
                    "visualDirection": "Use restrained maritime geometry and document-focused layouts to communicate precise counsel without nautical clichés.",
                })
            return _response({
                "anchorColor": "#397A59",
                "supportingColors": ["#F2B880"],
                "paletteStyle": "organico",
                "headingFont": "Fraunces",
                "bodyFont": "Nunito Sans",
                "visualDirection": "Use friendly close-up pet photography and soft rounded framing to make mobile grooming feel calm and personal.",
            })
        if schema_name == "kreaton_intake_extraction":
            return _response({
                "businessName": "Luna Ceramics",
                "servicesProducts": ["hand-thrown mugs", "custom dinnerware"],
                "location": "Austin, Texas",
                "preferredTone": "warm and artisanal",
                "preferredColors": "terracotta and cream",
                "websiteIntent": "sell handmade ceramics online",
                "confidence": 0.94,
            })
        raise AssertionError(f"Unexpected schema: {schema_name}")


class _FakeClient:
    def __init__(self, completions):
        self.chat = SimpleNamespace(completions=completions)


class _FailingCompletions:
    def __init__(self):
        self.calls = 0

    async def create(self, **_kwargs):
        self.calls += 1
        raise TimeoutError("transient OpenAI timeout")


def _state(name, description, industry, offerings):
    return ProjectState(
        businessName=name,
        businessDescription=description,
        industry=industry,
        servicesProducts=offerings,
        preferredTone="professional and approachable",
        websiteType="services",
        selectedLanguage="en",
        selectedTemplateName="Professional Services",
    )


class RealAIAgentTests(unittest.IsolatedAsyncioTestCase):
    async def test_copy_and_art_are_business_specific_with_openai_configured(self):
        completions = _BusinessAwareCompletions()
        fake_client = _FakeClient(completions)
        legal = _state("Harbor Legal", "Maritime contract and cargo claim counsel.", "legal", ["Contract review", "Cargo claims"])
        grooming = _state("Happy Paws", "Mobile gentle grooming for dogs.", "pet services", ["Mobile grooming", "Coat care"])

        with (
            patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}),
            patch.object(agents, "AsyncOpenAI", return_value=fake_client) as client_factory,
        ):
            legal_copy = await CopywriterAgent().run(legal, "Build our website")
            grooming_copy = await CopywriterAgent().run(grooming, "Build our website")
            legal_art = await ArtDirectorAgent().run(legal, "Build our website")
            grooming_art = await ArtDirectorAgent().run(grooming, "Build our website")

        self.assertNotEqual(
            legal_copy.updates["generatedCopy"]["hero"],
            grooming_copy.updates["generatedCopy"]["hero"],
        )
        self.assertNotEqual(legal_art.updates["colors"], grooming_art.updates["colors"])
        self.assertNotEqual(legal_art.reasoningSummary, grooming_art.reasoningSummary)
        self.assertTrue(all(call["response_format"]["type"] == "json_schema" for call in completions.calls))
        self.assertTrue(all(call["model"] == "gpt-6-astra" for call in completions.calls))
        self.assertTrue(all(factory.kwargs["timeout"] == agents.OPENAI_REQUEST_TIMEOUT_SECONDS for factory in client_factory.call_args_list))

    async def test_intake_uses_high_confidence_structured_extraction(self):
        completions = _BusinessAwareCompletions()
        with (
            patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}),
            patch.object(agents, "AsyncOpenAI", return_value=_FakeClient(completions)),
        ):
            result = await IntakeExtractionAgent().run(
                ProjectState(),
                "We are Luna Ceramics in Austin and sell hand-thrown mugs and custom dinnerware.",
            )

        self.assertEqual(result.updates["businessName"], "Luna Ceramics")
        self.assertEqual(result.updates["servicesProducts"], ["hand-thrown mugs", "custom dinnerware"])
        self.assertEqual(result.updates["location"], "Austin, Texas")
        self.assertEqual(result.confidence, 0.94)

    async def test_missing_api_key_preserves_exact_deterministic_fallbacks(self):
        state = _state("Harbor Legal", "Maritime contract counsel.", "legal", ["Contract review"])
        with patch.dict(os.environ, {"OPENAI_API_KEY": ""}):
            for agent_type in (IntakeExtractionAgent, ArtDirectorAgent, CopywriterAgent):
                agent = agent_type()
                actual = await agent.run(state, "We need a professional services website")
                expected = await agent._run_deterministic(state, "We need a professional services website")
                self.assertEqual(actual, expected)

    async def test_openai_failure_preserves_exact_deterministic_fallbacks(self):
        state = _state("Harbor Legal", "Maritime contract counsel.", "legal", ["Contract review"])
        with patch("app.agents.asyncio.sleep", new=AsyncMock()):
            for agent_type in (IntakeExtractionAgent, ArtDirectorAgent, CopywriterAgent):
                agent = agent_type()
                failing = _FailingCompletions()
                agent.client = _FakeClient(failing)
                actual = await agent.run(state, "We need a professional services website")
                expected = await agent._run_deterministic(state, "We need a professional services website")
                self.assertEqual(actual, expected)
                self.assertEqual(failing.calls, 2)


if __name__ == "__main__":
    unittest.main()
