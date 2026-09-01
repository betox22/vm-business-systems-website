import unittest

from pydantic import ValidationError

from app.ai_site_planner import (
    AIWebGenerationResponse,
    OpenAISitePlanAgent,
    PageSchema,
    SectionBlock,
    SectionMotionPlan,
    site_plan_to_updates,
)


def _motion(animate=True):
    return {
        "animate": animate,
        "conversionGoal": "Move visitors toward the primary offer" if animate else "none",
        "trigger": "scroll" if animate else "none",
        "target": "section_content" if animate else "none",
        "treatment": "stagger_cards" if animate else "static",
    }


class MotionPlannerTests(unittest.TestCase):
    def test_animated_section_requires_one_conversion_goal(self):
        with self.assertRaises(ValidationError):
            SectionMotionPlan.model_validate({
                "animate": True,
                "conversionGoal": "none",
                "trigger": "scroll",
                "target": "section_content",
                "treatment": "reveal_up",
            })

    def test_page_rejects_more_than_three_animated_sections(self):
        with self.assertRaises(ValidationError):
            PageSchema.model_validate({
                "pageId": "home",
                "title": "Home",
                "slug": "/",
                "sections": [
                    {"sectionId": f"section-{index}", "componentType": "feature_band", "motion": _motion()}
                    for index in range(4)
                ],
            })

    def test_motion_decision_survives_into_generated_schema(self):
        plan = AIWebGenerationResponse.model_validate({
            "reasoningSummary": "Focused B2B conversion plan",
            "templateId": "b2b-saas-enterprise-pro",
            "primaryOfferingCategory": "b2b-saas-enterprise-pro",
            "websiteType": "b2b",
            "catalogStrategy": "b2b_solution_catalog",
            "salesFlow": "lead_capture",
            "targetAudience": "Operations leaders",
            "brand_identity": {
                "palette_style": "tecnologico",
                "font_family_headings": "Space Grotesk",
                "font_family_body": "Inter",
                "logo_config": {
                    "requires_ai_generation": False,
                    "generation_prompt": "Original professional B2B software logo with a meaningful operations symbol and clean typography",
                },
            },
            "pages": [{
                "pageId": "home",
                "title": "Home",
                "slug": "/",
                "sections": [{
                    "sectionId": "home-hero",
                    "componentType": "hero_split_conversion",
                    "motion": {
                        "animate": True,
                        "conversionGoal": "Clarify the product promise and focus the demo CTA",
                        "trigger": "load",
                        "target": "headline_and_cta",
                        "treatment": "hero_enter",
                    },
                    "copy": {"headline": "Operational clarity without status meetings"},
                }],
            }],
            "catalogCategories": [],
            "catalogItems": [],
            "confidence": 0.91,
        })

        section = site_plan_to_updates(plan)["generatedCopy"]["pages"][0]["sections"][0]

        self.assertEqual(section["motion"]["treatment"], "hero_enter")
        self.assertEqual(section["motion"]["conversionGoal"], "Clarify the product promise and focus the demo CTA")

    def test_prompt_limits_motion_to_conversion_work(self):
        prompt = OpenAISitePlanAgent._system_prompt()

        self.assertIn("Animate at most 3 sections", prompt)
        self.assertIn("exactly one short conversionGoal", prompt)
        self.assertIn("never decoration", prompt)


if __name__ == "__main__":
    unittest.main()
