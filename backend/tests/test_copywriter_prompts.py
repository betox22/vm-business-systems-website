import json
import os
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from app import agents
from app.agents import CopywriterAgent, GeneratedHeroCopy, detect_business_archetypes
from app.copywriter_prompts import BASE_PROMPT, WEBSITE_TYPE_PROFILES, copywriter_system_prompt
from app.models import ProjectState


def _state(website_type, description, offerings):
    return ProjectState(
        businessName="Cobalto Atelier",
        businessDescription=description,
        industry="handcrafted home lighting",
        servicesProducts=offerings,
        preferredTone="editorial, precise and warm",
        websiteType=website_type,
        selectedLanguage="en",
    )


def _response(copy):
    return SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content=json.dumps(copy)))],
        usage=None,
    )


class CopywriterPromptTests(unittest.TestCase):
    def test_existing_archetype_detection_only_covers_custom_order_upload(self):
        self.assertEqual(set(agents.BUSINESS_ARCHETYPE_PATTERNS), {"custom_order_upload"})
        self.assertEqual(
            detect_business_archetypes("Impresión 3D de piezas a partir de archivos STL"),
            {"custom_order_upload"},
        )

    def test_sector_profiles_share_one_base_and_use_existing_website_type(self):
        examples = {
            "online_store": "retail",
            "premium_product": "retail",
            "services": "professional_services",
            "legal": "professional_services",
            "restaurant": "restaurant",
            "industrial": "consultative_b2b",
        }
        for website_type, profile in examples.items():
            with self.subTest(website_type=website_type):
                self.assertEqual(WEBSITE_TYPE_PROFILES[website_type], profile)
                prompt = copywriter_system_prompt(website_type, set())
                self.assertTrue(prompt.startswith(BASE_PROMPT))
                self.assertNotEqual(prompt, BASE_PROMPT)
        self.assertEqual(copywriter_system_prompt("education", set()), BASE_PROMPT)

    def test_detected_custom_order_takes_precedence_without_inventing_workflow(self):
        prompt = copywriter_system_prompt(
            "premium_product", detect_business_archetypes("Custom 3D printing from STL files")
        )
        self.assertIn("made-to-order", prompt)
        self.assertIn("only if the brief confirms", prompt)
        self.assertNotIn("Point the CTA to the products", prompt)


class CopywriterAgentPromptTests(unittest.IsolatedAsyncioTestCase):
    async def test_mocked_agent_selects_each_sector_from_state_and_existing_detector(self):
        copy = {
            "headline": "A specific offering for the right buyer",
            "subheadline": "A concise description of the offering and the next action for its customer.",
            "primaryCta": "Explore the offering",
        }
        completion = AsyncMock(return_value=_response(copy))
        client = SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=completion)))
        cases = (
            ("restaurant", "A neighborhood restaurant serving handmade pasta.", ["Handmade pasta"], "actual dish"),
            ("services", "A home services business offering plumbing repairs.", ["Plumbing repairs"], "specific service"),
            ("industrial", "An industrial supplier offering machine parts.", ["Machine parts"], "business buyer"),
            ("premium_product", "A studio offering custom 3D printing from STL files.", ["3D printing"], "made-to-order"),
        )
        with (
            patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}),
            patch.object(agents, "AsyncOpenAI", return_value=client),
        ):
            for website_type, description, offerings, expected in cases:
                with self.subTest(website_type=website_type):
                    result = await CopywriterAgent().run(_state(website_type, description, offerings), "Build our website")
                    self.assertEqual(result.updates["generatedCopy"]["hero"], copy)
                    self.assertIn(expected, completion.await_args.kwargs["messages"][0]["content"])

        self.assertEqual(completion.await_count, len(cases))

    async def test_mocked_request_uses_sector_profile_and_keeps_generated_hero_contract(self):
        copy = {
            "headline": "Ceramic desk lamps, shaped by hand",
            "subheadline": "Meet Arc, Fold and Cone: three desk lamps made in small batches by Cobalto Atelier.",
            "primaryCta": "Explore the lamps",
        }
        completion = AsyncMock(return_value=_response(copy))
        client = SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=completion)))
        state = _state(
            "premium_product",
            "Small design workshop selling handcrafted ceramic desk lamps online.",
            ["Arc ceramic desk lamp", "Fold ceramic desk lamp", "Cone ceramic desk lamp"],
        )
        with (
            patch.dict(os.environ, {"OPENAI_API_KEY": "test-key", "OPENAI_MODEL": "", "OPENAI_COPYWRITER_MODEL": ""}),
            patch.object(agents, "AsyncOpenAI", return_value=client),
        ):
            result = await CopywriterAgent().run(state, "Build our website")

        completion.assert_awaited_once()
        request = completion.await_args.kwargs
        self.assertEqual(request["model"], "gpt-6-astra")
        self.assertEqual(request["response_format"]["json_schema"]["name"], "kreaton_hero_copy")
        self.assertEqual(
            set(request["response_format"]["json_schema"]["schema"]["properties"]),
            set(GeneratedHeroCopy.model_fields),
        )
        self.assertIn("named product or product family", request["messages"][0]["content"])
        self.assertNotIn("Cobalto Atelier", request["messages"][0]["content"])
        self.assertEqual(json.loads(request["messages"][1]["content"])["servicesProducts"], state.servicesProducts)
        self.assertEqual(result.updates["generatedCopy"]["hero"], copy)

    async def test_invalid_mocked_copy_still_uses_existing_fallback(self):
        completion = AsyncMock(return_value=_response({"headline": "Too short"}))
        client = SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=completion)))
        state = _state("restaurant", "A neighborhood restaurant serving handmade pasta.", ["Handmade pasta"])
        with (
            patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}),
            patch.object(agents, "AsyncOpenAI", return_value=client),
        ):
            agent = CopywriterAgent()
            result = await agent.run(state, "Build our website")
            expected = await agent._run_deterministic(state, "Build our website")

        completion.assert_awaited_once()
        self.assertEqual(result, expected)
