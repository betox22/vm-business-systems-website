import json
import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from app import agents
from app.agents import CatalogAgent, SEED_PRODUCT_LIBRARY, generate_ai_seed_catalog
from app.image_assets import resolve_product_image_url
from app.models import ProjectState


NICHE_CASES = {
    "hardware and construction supplies": [
        ("Cordless Hammer Drill", "Power Tools", "drilling concrete and masonry", 149.0, "cordless hammer drill"),
        ("Galvanized Hex Bolt Pack", "Fasteners", "structural fastening", 18.5, "galvanized hex bolts"),
    ],
    "plumbing contractor and plumbing supplies": [
        ("Brass Ball Valve", "Valves", "reliable water shutoff", 24.0, "brass plumbing valve"),
        ("Drain Cleaning Service", "Plumbing Services", "clear blocked residential drains", 95.0, "plumber drain service"),
    ],
    "veterinary clinic": [
        ("Preventive Pet Exam", "Veterinary Care", "wellness examination for dogs and cats", 65.0, "veterinarian pet exam"),
        ("Core Vaccination Visit", "Vaccinations", "essential vaccines and guidance", 48.0, "veterinarian vaccination"),
    ],
    "law firm for business contracts": [
        ("Commercial Contract Review", "Business Law", "review terms and identify legal risk", 350.0, "lawyer contract review"),
        ("Company Formation Counsel", "Corporate Law", "choose and form the right entity", 750.0, "business lawyer consultation"),
    ],
}


def _response(items):
    payload = {
        "items": [
            {
                "name": name,
                "category": category,
                "description": description,
                "price": price,
                "image_search_query": query,
            }
            for name, category, description, price, query in items
        ]
    }
    return SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content=json.dumps(payload)))]
    )


class _NicheCompletions:
    def __init__(self):
        self.calls = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        prompt = kwargs["messages"][-1]["content"].lower()
        for niche, items in NICHE_CASES.items():
            signature = niche.split()[0]
            if signature in prompt:
                return _response(items)
        raise AssertionError(f"Unexpected catalog prompt: {prompt}")


class _FakeOpenAI:
    completions = None

    def __init__(self, **_kwargs):
        self.chat = SimpleNamespace(completions=self.completions)


class RealAICatalogTests(unittest.IsolatedAsyncioTestCase):
    async def test_unrecognized_valid_niches_use_structured_ai_catalog(self):
        completions = _NicheCompletions()
        _FakeOpenAI.completions = completions

        with (
            patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}),
            patch.object(agents, "OpenAI", _FakeOpenAI),
            patch("app.image_assets._search_unsplash_photo", return_value=None),
        ):
            for niche, expected in NICHE_CASES.items():
                with self.subTest(niche=niche):
                    state = ProjectState(
                        businessName=f"Test {niche}",
                        businessDescription=niche,
                        industry=niche,
                        servicesProducts=[],
                        selectedLanguage="en",
                        websiteType="online_store",
                        salesFlow="online_sales",
                    )
                    result = await CatalogAgent().run(state, niche)
                    catalog = result.updates["catalogItems"][:2]
                    combined = " ".join(
                        f"{item['name']} {item['category']} {item['description']}"
                        for item in catalog
                    ).lower()

                    self.assertEqual([item[0] for item in expected], [item["name"] for item in catalog])
                    self.assertEqual(result.updates["catalogSource"], "ai_generated")
                    self.assertFalse(any(seed["name"]["en"].lower() in combined for seed in SEED_PRODUCT_LIBRARY["default"]))
                    self.assertTrue(all(item["image_url"] != resolve_product_image_url({"name": "luxury car"}) for item in catalog))

        self.assertEqual(len(completions.calls), 4)
        self.assertTrue(all(call["model"] == "gpt-6-astra" for call in completions.calls))
        self.assertTrue(all(call["response_format"]["type"] == "json_schema" for call in completions.calls))

    async def test_no_api_key_keeps_static_default_as_last_resort(self):
        with patch.dict(os.environ, {"OPENAI_API_KEY": ""}):
            state = ProjectState(
                businessDescription="hardware and construction supplies",
                industry="hardware and construction supplies",
                websiteType="online_store",
                salesFlow="online_sales",
            )
            result = await CatalogAgent().run(state, "hardware store")
            catalog = result.updates["catalogItems"]

        self.assertEqual(catalog[0]["name"], SEED_PRODUCT_LIBRARY["default"][0]["name"]["en"])

    def test_gift_card_does_not_match_car_asset_and_unknown_uses_neutral_placeholder(self):
        gift_card = resolve_product_image_url({
            "name": "Matte Gift Card Set",
            "category": "Gift details",
            "imageSearchQuery": "minimal-gift-card-set",
        })
        unknown = resolve_product_image_url({
            "name": "Specialized Component",
            "category": "Unmapped inventory",
            "imageSearchQuery": "specialized component",
        })

        self.assertNotIn("photo-1503376780353", gift_card)
        self.assertEqual(gift_card, "/images/product-placeholder.svg")
        self.assertEqual(unknown, "/images/product-placeholder.svg")

    def test_generate_ai_seed_catalog_logs_failure_and_returns_none(self):
        class _Failing:
            def __init__(self, **_kwargs):
                self.chat = SimpleNamespace(
                    completions=SimpleNamespace(create=lambda **_kwargs: (_ for _ in ()).throw(TimeoutError("timeout")))
                )

        with (
            patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}),
            patch.object(agents, "OpenAI", _Failing),
            patch("app.agents.time.sleep"),
            self.assertLogs("app.agents", level="WARNING") as logs,
        ):
            result = generate_ai_seed_catalog("hardware and construction supplies", "en", 2)

        self.assertIsNone(result)
        self.assertTrue(any("using static fallback" in entry for entry in logs.output))


if __name__ == "__main__":
    unittest.main()
