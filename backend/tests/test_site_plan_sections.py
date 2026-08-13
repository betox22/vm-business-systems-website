import unittest

from pydantic import ValidationError

from app.ai_site_planner import AIWebGenerationResponse, site_plan_to_updates


class SitePlanSectionTests(unittest.TestCase):
    def test_reusable_section_types_are_accepted_and_mapped_to_renderers(self) -> None:
        component_types = [
            ("quote_request_form", "QuoteRequestForm", {"fields": ["Service", "Email"]}),
            ("capabilities_equipment", "CapabilitiesEquipment", {"items": [{"title": "CNC"}]}),
            ("portfolio_gallery", "PortfolioGallery", {"items": [{"title": "Project one"}]}),
            ("video_showcase", "VideoShowcase", {"videoUrl": "https://youtu.be/abcdefghijk"}),
        ]
        plan = AIWebGenerationResponse.model_validate({
            "reasoningSummary": "Reusable sections",
            "templateId": "corporate-company-pro",
            "websiteType": "corporate",
            "catalogStrategy": "company_services_catalog",
            "salesFlow": "lead_capture",
            "targetAudience": "Business buyers",
            "brand_identity": {
                "palette_style": "elegante",
                "font_family_headings": "Playfair Display",
                "font_family_body": "Inter",
                "logo_config": {
                    "requires_ai_generation": False,
                    "generation_prompt": "Minimalist flat vector logo for a professional brand named Northstar, elegante style, geometric clean shapes, solid colors, no gradients, high detail, white background, trending on Dribbble --vector",
                },
            },
            "pages": [{
                "pageId": "home",
                "title": "Home",
                "slug": "/",
                "sections": [{
                    "sectionId": f"section-{index}",
                    "componentType": component_type,
                    "variant": "default",
                    "purpose": "Test reusable section",
                    "copy": {"headline": renderer_type},
                    "dataBinding": binding,
                } for index, (component_type, renderer_type, binding) in enumerate(component_types)],
            }],
            "catalogCategories": [],
            "catalogItems": [],
            "confidence": 0.9,
        })

        sections = site_plan_to_updates(plan)["generatedCopy"]["pages"][0]["sections"]

        self.assertEqual([section["type"] for section in sections], [item[1] for item in component_types])
        self.assertTrue(all(section["id"] == section["sectionId"] for section in sections))
        self.assertEqual(sections[-1]["editable"]["videoUrl"], "https://youtu.be/abcdefghijk")

    def test_video_showcase_rejects_non_video_hosts(self) -> None:
        payload = {
            "reasoningSummary": "Unsafe video",
            "templateId": "corporate-company-pro",
            "websiteType": "corporate",
            "catalogStrategy": "company_services_catalog",
            "salesFlow": "lead_capture",
            "targetAudience": "Business buyers",
            "brand_identity": {
                "palette_style": "elegante",
                "font_family_headings": "Playfair Display",
                "font_family_body": "Inter",
                "logo_config": {
                    "requires_ai_generation": False,
                    "generation_prompt": "Minimalist flat vector logo for Northstar, clean shapes, solid colors, white background --vector",
                },
            },
            "pages": [{
                "pageId": "home",
                "title": "Home",
                "slug": "/",
                "sections": [{
                    "sectionId": "video",
                    "componentType": "video_showcase",
                    "dataBinding": {"videoUrl": "https://example.com/tracker"},
                }],
            }],
            "catalogCategories": [],
            "catalogItems": [],
            "confidence": 0.9,
        }

        for component_type in ("video_showcase", "VideoShowcase"):
            with self.subTest(component_type=component_type):
                payload["pages"][0]["sections"][0]["componentType"] = component_type
                with self.assertRaises(ValidationError):
                    AIWebGenerationResponse.model_validate(payload)

    def test_video_showcase_rejects_malformed_or_deceptive_urls(self) -> None:
        invalid_urls = (
            "https://youtube.com.evil.com/watch?v=abcdefghijk",
            "javascript:alert(1)",
            "https://vimeo.com/abc",
            "https://youtube.com@evil.com/watch?v=abcdefghijk",
        )
        payload = {
            "reasoningSummary": "Unsafe video URL",
            "templateId": "corporate-company-pro",
            "websiteType": "corporate",
            "catalogStrategy": "company_services_catalog",
            "salesFlow": "lead_capture",
            "targetAudience": "Business buyers",
            "brand_identity": {
                "palette_style": "elegante",
                "font_family_headings": "Playfair Display",
                "font_family_body": "Inter",
                "logo_config": {
                    "requires_ai_generation": False,
                    "generation_prompt": "Minimalist flat vector logo for Northstar, clean shapes, solid colors, white background --vector",
                },
            },
            "pages": [{
                "pageId": "home",
                "title": "Home",
                "slug": "/",
                "sections": [{
                    "sectionId": "video",
                    "componentType": "video_showcase",
                    "dataBinding": {"videoUrl": ""},
                }],
            }],
            "catalogCategories": [],
            "catalogItems": [],
            "confidence": 0.9,
        }

        for invalid_url in invalid_urls:
            with self.subTest(video_url=invalid_url):
                payload["pages"][0]["sections"][0]["dataBinding"]["videoUrl"] = invalid_url
                with self.assertRaises(ValidationError):
                    AIWebGenerationResponse.model_validate(payload)


if __name__ == "__main__":
    unittest.main()
