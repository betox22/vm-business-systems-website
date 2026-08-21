import unittest

from pydantic import ValidationError

from app.ai_site_planner import AIWebGenerationResponse, site_plan_to_updates, state_to_client_summary
from app.models import ProjectState


class SitePlanSectionTests(unittest.TestCase):
    @staticmethod
    def _base_plan() -> AIWebGenerationResponse:
        return AIWebGenerationResponse.model_validate({
            "reasoningSummary": "Physical store with secondary training",
            "templateId": "premium-product-store",
            "primaryOfferingCategory": "premium-product-store",
            "secondaryOfferingCategories": ["education-course-academy-pro"],
            "websiteType": "premium_product",
            "catalogStrategy": "premium_editorial_catalog",
            "salesFlow": "online_sales",
            "targetAudience": "3D printing customers",
            "brand_identity": {
                "palette_style": "tecnologico",
                "font_family_headings": "Space Grotesk",
                "font_family_body": "Inter",
                "logo_config": {
                    "requires_ai_generation": False,
                    "generation_prompt": "Minimalist flat vector logo for a 3D printing brand named Mi Mundo 3D, tecnologico style, geometric clean shapes, solid colors, no gradients, high detail, white background, trending on Dribbble --vector",
                },
            },
            "pages": [{
                "pageId": "home",
                "title": "Home",
                "slug": "/",
                "sections": [{
                    "sectionId": "hero",
                    "componentType": "hero_editorial_product",
                    "copy": {"headline": "Mi Mundo 3D"},
                }],
            }],
            "catalogCategories": ["Printers", "Training"],
            "catalogItems": [{
                "id": "printer",
                "name": "Impresoras 3D",
                "description": "Reliable printers for practical fabrication projects.",
                "category": "Printers",
                "price": 499,
                "price_amount": 499,
                "price_label": "USD 499",
                "imageSearchQuery": "professional 3D printer",
            }],
            "confidence": 0.9,
        })

    def test_ai_offering_intent_is_preserved_in_project_updates(self) -> None:
        updates = site_plan_to_updates(self._base_plan(), ProjectState())

        self.assertEqual(updates["primaryOfferingCategory"], "premium-product-store")
        self.assertEqual(updates["secondaryOfferingCategories"], ["education-course-academy-pro"])

    def test_client_summary_includes_contact_and_uploaded_media(self) -> None:
        state = ProjectState(
            businessName="Northstar Studio",
            contactInfo={
                "phone": "+1 305 555 0100",
                "whatsapp": "+1 305 555 0101",
                "email": "hello@northstar.example",
            },
            photoUrls=["https://cdn.example.com/client-hero.jpg"],
            videoUrls=["https://www.youtube.com/watch?v=abc12345"],
        )

        summary = state_to_client_summary(state, "Build my site")

        self.assertEqual(summary["contactInfo"], state.contactInfo)
        self.assertEqual(summary["photoUrls"], state.photoUrls)
        self.assertEqual(summary["videoUrls"], state.videoUrls)

    def test_secondary_courses_create_a_dedicated_repeatable_course_page(self) -> None:
        state = ProjectState(
            businessName="Mi Mundo 3D",
            businessDescription="Venta de impresoras, materiales y cursos practicos.",
            servicesProducts=["Impresoras 3D", "Materiales y equipos", "Curso de fabricacion 3D"],
            salesFlow="online_sales",
            selectedLanguage="es",
        )

        updates = site_plan_to_updates(self._base_plan(), state)
        pages = updates["generatedCopy"]["pages"]
        course_page = next(page for page in pages if page["page_key"] == "courses")
        course_item = next(item for item in updates["catalogItems"] if item["name"] == "Curso de fabricacion 3D")

        self.assertEqual(course_page["title"], "Cursos")
        self.assertEqual(course_page["sections"][0]["type"], "CourseOffering")
        self.assertEqual(course_page["sections"][0]["editable"]["title"], "Curso de fabricacion 3D")
        self.assertEqual(course_page["sections"][0]["editable"]["ctaMode"], "purchase")
        self.assertEqual(course_item["offer_type"], "course")
        self.assertFalse(course_item["display_in_catalog"])

    def test_business_without_training_does_not_get_a_course_page(self) -> None:
        state = ProjectState(
            businessName="Mi Mundo 3D",
            businessDescription="Venta de impresoras y materiales.",
            servicesProducts=["Impresoras 3D", "Materiales y equipos"],
            salesFlow="online_sales",
        )

        pages = site_plan_to_updates(self._base_plan(), state)["generatedCopy"]["pages"]

        self.assertNotIn("courses", [page["page_key"] for page in pages])

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

    def test_copy_driven_sections_keep_content_with_empty_data_binding(self) -> None:
        component_types = (
            "faq_block",
            "cta_band",
            "contact_panel",
            "service_areas",
            "proof_panel",
            "booking_services",
        )
        payload = self._base_plan().model_dump(by_alias=True)
        payload["pages"][0]["sections"] = [
            {
                "sectionId": component_type,
                "componentType": component_type,
                "copy": {
                    "headline": f"Real headline for {component_type}",
                    "body": f"Real body copy for {component_type}",
                    "ctaPrimary": f"Action for {component_type}",
                },
                "dataBinding": {},
            }
            for component_type in component_types
        ]

        plan = AIWebGenerationResponse.model_validate(payload)
        sections = site_plan_to_updates(plan)["generatedCopy"]["pages"][0]["sections"]

        self.assertEqual(len(sections), len(component_types))
        for section, component_type in zip(sections, component_types):
            with self.subTest(component_type=component_type):
                self.assertEqual(section["dataBinding"], {})
                self.assertEqual(section["editable"]["headline"], f"Real headline for {component_type}")
                self.assertEqual(section["editable"]["body"], f"Real body copy for {component_type}")
                self.assertEqual(section["editable"]["ctaPrimary"], f"Action for {component_type}")

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
