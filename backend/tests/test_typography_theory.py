import re
import unittest

from app.ai_site_planner import AIWebGenerationResponse, site_plan_to_updates
from app.main import build_schema_from_state
from app.models import ProjectState
from app.typography_theory import build_typography_scale


STYLES = ("elegante", "organico", "tecnologico", "calido")
ORDERED_ROLES = ("h1", "h2", "h3", "h4", "h5", "h6", "body", "small", "caption")


def _max_rem(scale: dict[str, str], role: str) -> float:
    value = scale[f"--type-{role}-size"]
    matches = re.findall(r"([0-9.]+)rem", value)
    if not matches:
        raise AssertionError(f"No rem value found in {value!r}")
    return float(matches[-1])


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


class TypographyTheoryTests(unittest.TestCase):
    def test_all_styles_produce_valid_distinct_scales(self) -> None:
        scales = {style: build_typography_scale(style) for style in STYLES}

        for style, scale in scales.items():
            self.assertTrue(scale, style)
            for role in ORDERED_ROLES:
                self.assertIn(f"--type-{role}-size", scale)
            self.assertIn("--type-button-size", scale)
            self.assertIn("--type-label-size", scale)

        self.assertEqual(len({tuple(sorted(scale.items())) for scale in scales.values()}), len(STYLES))

    def test_type_sizes_are_monotonic_for_every_style(self) -> None:
        for style in STYLES:
            scale = build_typography_scale(style)
            sizes = [_max_rem(scale, role) for role in ORDERED_ROLES]
            self.assertTrue(
                all(first > second for first, second in zip(sizes, sizes[1:])),
                f"{style}: {sizes}",
            )

    def test_unknown_style_falls_back_to_elegante(self) -> None:
        self.assertEqual(build_typography_scale("unknown"), build_typography_scale("elegante"))

    def test_public_schema_exposes_non_empty_font_scale(self) -> None:
        scale = build_typography_scale("tecnologico")
        state = ProjectState(
            businessName="Signal Stack",
            businessDescription="B2B software platform.",
            typography={"heading": "Space Grotesk", "body": "Inter"},
            typographyScale=scale,
        )

        schema = build_schema_from_state(state, catalog_items=[], catalog_source="seed_fallback")

        self.assertEqual(schema["theme"]["fonts"]["scale"], scale)

    def test_site_plan_updates_include_typography_scale(self) -> None:
        state = ProjectState(
            businessName="Bath All Day",
            businessDescription="Handmade soaps and candles.",
            industry="beauty",
            servicesProducts=["Lavender soap", "Vanilla candle"],
        )

        updates = site_plan_to_updates(_minimal_plan("organico"), state)

        self.assertEqual(updates["typographyScale"], build_typography_scale("organico"))


if __name__ == "__main__":
    unittest.main()
