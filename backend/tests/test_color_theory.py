import asyncio
import unittest

from app.agents import ArtDirectorAgent
from app.ai_site_planner import AIWebGenerationResponse, site_plan_to_updates
from app.color_theory import (
    adjust_lightness_for_contrast,
    build_palette,
    contrast_ratio,
    generate_harmony,
    hex_to_hsl,
)
from app.main import build_schema_from_state
from app.models import ProjectState


def _hue_distance(first: float, second: float) -> float:
    difference = abs(first - second) % 360
    return min(difference, 360 - difference)


def _minimal_plan(palette_style: str = "organico") -> AIWebGenerationResponse:
    return AIWebGenerationResponse.model_validate({
        "reasoningSummary": "Focused bath and self-care store",
        "templateId": "premium-product-store",
        "websiteType": "premium_product",
        "catalogStrategy": "premium_editorial_catalog",
        "salesFlow": "online_sales",
        "targetAudience": "Customers seeking handmade bath products",
        "brand_identity": {
            "palette_style": palette_style,
            "font_family_headings": "Fraunces",
            "font_family_body": "Inter",
            "logo_config": {
                "requires_ai_generation": False,
                "generation_prompt": "Minimalist flat vector logo for a beauty brand named Bath All Day, organic style, geometric clean shapes, solid colors, no gradients, high detail, white background, trending on Dribbble --vector",
            },
        },
        "pages": [],
        "catalogCategories": [],
        "catalogItems": [],
        "confidence": 0.91,
    })


class ColorTheoryTests(unittest.TestCase):
    def test_openai_plan_schema_does_not_accept_llm_color_tokens(self) -> None:
        schema = AIWebGenerationResponse.model_json_schema()

        self.assertNotIn("designTokens", schema["properties"])
        brand_schema = schema["$defs"]["BrandIdentity"]["properties"]
        self.assertNotIn("primary_color", brand_schema)
        self.assertNotIn("secondary_color", brand_schema)

    def test_complementary_harmony_rotates_hue_exactly_180_degrees(self) -> None:
        harmony = generate_harmony((27.0, 0.65, 0.44), "complementary")

        self.assertEqual(harmony[0][0], 27.0)
        self.assertEqual(harmony[1][0], 207.0)

    def test_palette_text_meets_wcag_aa_on_background_and_surface(self) -> None:
        for style in ("elegante", "organico", "tecnologico", "calido"):
            palette = build_palette("#5B7F55", style, "beauty spa")
            self.assertGreaterEqual(contrast_ratio(palette["text"], palette["background"]), 4.5)
            self.assertGreaterEqual(contrast_ratio(palette["text"], palette["surface"]), 4.5)
            for semantic in ("success", "warning", "error", "info"):
                self.assertGreaterEqual(contrast_ratio(palette[semantic], palette["background"]), 4.5)
                self.assertGreaterEqual(contrast_ratio(palette[semantic], palette["surface"]), 4.5)

    def test_lightness_adjustment_supports_normal_and_large_text_thresholds(self) -> None:
        normal_text = adjust_lightness_for_contrast("#A0A0A0", "#FFFFFF", 4.5)
        large_text = adjust_lightness_for_contrast("#A0A0A0", "#FFFFFF", 3.0)

        self.assertGreaterEqual(contrast_ratio(normal_text, "#FFFFFF"), 4.5)
        self.assertGreaterEqual(contrast_ratio(large_text, "#FFFFFF"), 3.0)

    def test_semantic_colors_keep_recognizable_hues(self) -> None:
        palette = build_palette("#7157C8", "elegante", "legal consulting")
        expected_hues = {"success": 138.0, "warning": 42.0, "error": 4.0, "info": 210.0}

        for key, expected_hue in expected_hues.items():
            actual_hue, _saturation, _lightness = hex_to_hsl(palette[key])
            self.assertLessEqual(_hue_distance(actual_hue, expected_hue), 2.0, key)

    def test_palette_generation_is_deterministic(self) -> None:
        first = build_palette("#C75B39", "calido", "restaurant bakery")
        second = build_palette("#C75B39", "calido", "restaurant bakery")

        self.assertEqual(first, second)

    def test_logo_extracted_anchor_drives_planner_palette(self) -> None:
        state = ProjectState(
            businessName="Bath All Day",
            businessDescription="Handmade soaps, candles and bath bombs.",
            industry="beauty",
            servicesProducts=["Lavender soap", "Vanilla candle"],
            logoPalette=["#5B7F55", "#F4E7D3"],
            colorProvenance={
                "anchorColor": "#5B7F55",
                "anchorSource": "logo_extracted",
                "colors": [{"color": "#5B7F55", "source": "logo_extracted"}],
            },
        )

        updates = site_plan_to_updates(_minimal_plan(), state)

        self.assertEqual(updates["colors"]["primary"], "#5B7F55")
        self.assertEqual(updates["brand_identity"]["primary_color"], "#5B7F55")
        self.assertEqual(len(updates["colors"]), 10)

    def test_art_director_uses_same_logo_anchor_in_fallback(self) -> None:
        state = ProjectState(
            businessDescription="Natural handmade skincare and bath products.",
            industry="beauty",
            preferredTone="organic and calm",
            colorProvenance={
                "anchorColor": "#5B7F55",
                "anchorSource": "logo_extracted",
            },
        )

        result = asyncio.run(ArtDirectorAgent().run(state, "organic beauty shop"))

        self.assertEqual(result.updates["colors"]["primary"], "#5B7F55")
        self.assertEqual(len(result.updates["colors"]), 10)

    def test_public_schema_keeps_all_ten_palette_keys(self) -> None:
        colors = build_palette("#2F6FED", "tecnologico", "software platform")
        state = ProjectState(
            businessName="Signal Stack",
            businessDescription="B2B software platform.",
            colors=colors,
        )

        schema = build_schema_from_state(state, catalog_items=[], catalog_source="seed_fallback")

        self.assertEqual(schema["theme"]["colors"], colors)


if __name__ == "__main__":
    unittest.main()
