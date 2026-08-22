import unittest

from app.agents import FLAGSHIP_TEMPLATE_IDS, TEMPLATE_CATALOG
from app.ai_site_planner import AIWebGenerationResponse, resolve_planner_template


def _plan(**overrides) -> AIWebGenerationResponse:
    payload = {
        "reasoningSummary": "Template intent test",
        "templateId": "corporate-company-pro",
        "primaryCatalogType": "company_services_catalog",
        "confidenceScore": 0.9,
        "alternativeCatalogTypes": [],
        "websiteType": "corporate",
        "catalogStrategy": "company_services_catalog",
        "salesFlow": "informational",
        "targetAudience": "Business customers",
        "brand_identity": {
            "palette_style": "elegante",
            "font_family_headings": "Space Grotesk",
            "font_family_body": "Inter",
            "logo_config": {
                "requires_ai_generation": False,
                "generation_prompt": "Minimalist flat vector logo for a professional business brand, elegant style, geometric clean shapes, solid colors, no gradients, high detail, white background, trending on Dribbble --vector",
            },
        },
        "pages": [],
        "catalogCategories": [],
        "catalogItems": [],
        "confidence": 0.9,
    }
    payload.update(overrides)
    return AIWebGenerationResponse.model_validate(payload)


class TemplateMaturityTests(unittest.TestCase):
    def test_only_approved_templates_are_flagship(self) -> None:
        actual = {
            template_id
            for template_id, metadata in TEMPLATE_CATALOG.items()
            if metadata["design_maturity"] == "flagship"
        }

        self.assertEqual(actual, set(FLAGSHIP_TEMPLATE_IDS))

    def test_vague_short_text_uses_generic_flagship(self) -> None:
        resolved = resolve_planner_template(
            _plan(confidenceScore=0.92),
            "Necesito una web",
        )

        self.assertEqual(resolved.templateId, "premium-product-store")
        self.assertEqual(TEMPLATE_CATALOG[resolved.templateId]["design_maturity"], "flagship")

    def test_close_fit_prefers_flagship_over_standard(self) -> None:
        resolved = resolve_planner_template(
            _plan(
                primaryCatalogType="company_services_catalog",
                alternativeCatalogTypes=["service_area_catalog"],
                confidenceScore=0.84,
            ),
            "Empresa local con consultoria, implementacion y soporte para comercios en crecimiento.",
        )

        self.assertEqual(resolved.templateId, "local-services-pro-plus")
        self.assertEqual(resolved.catalogStrategy, "service_area_catalog")


if __name__ == "__main__":
    unittest.main()
