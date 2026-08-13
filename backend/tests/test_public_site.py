import json
import unittest
from pathlib import Path

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app.db import Base
from app.db_models import GeneratedSite, Store
from app.main import _public_site_payload, _schema_summary, build_schema_from_state
from app.models import ProjectState


def _memory_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


class PublicSitePayloadTests(unittest.TestCase):
    def setUp(self) -> None:
        self.session = _memory_session()
        self.session.add(
            Store(
                id="store_1",
                owner_user_id="user_1",
                owner_email="owner@example.com",
                name="Copper Kettle Coffee Roasters",
                business_type="restaurant",
                public_url="copper-kettle.usekreaton.com",
            )
        )
        self.session.add(
            GeneratedSite(
                id="site_1",
                store_id="store_1",
                owner_user_id="user_1",
                owner_email="owner@example.com",
                business_name="Copper Kettle Coffee Roasters",
                business_type="restaurant",
                template_id="restaurant-food-business",
                template_name="Restaurant & Food Business",
                template_mode="visual_prototype",
                domain_slug="copper-kettle",
                public_url="copper-kettle-abc123.usekreaton.com",
                status="draft",
                generated_config=json.dumps({
                    "pages": [{"pageId": "home"}],
                    "catalog_items": [{"id": "prod_1", "name": "House Blend"}],
                }),
            )
        )
        self.session.commit()

    def test_resolve_by_id_returns_public_safe_payload(self) -> None:
        site = self.session.execute(
            select(GeneratedSite).where(GeneratedSite.id == "site_1")
        ).scalar_one_or_none()
        self.assertIsNotNone(site)

        payload = _public_site_payload(site)

        self.assertEqual(payload["site_id"], "site_1")
        self.assertEqual(payload["business_name"], "Copper Kettle Coffee Roasters")
        self.assertEqual(payload["public_url"], "copper-kettle-abc123.usekreaton.com")
        self.assertEqual(payload["schema"]["pages"][0]["pageId"], "home")
        self.assertEqual(payload["catalog_items"][0]["name"], "House Blend")
        # Nothing that identifies the owning account should leak into the
        # public payload.
        self.assertNotIn("owner_email", payload)
        self.assertNotIn("owner_user_id", payload)
        self.assertNotIn("store_id", payload)

    def test_resolve_by_host_matches_public_url(self) -> None:
        site = self.session.execute(
            select(GeneratedSite).where(GeneratedSite.public_url == "copper-kettle-abc123.usekreaton.com")
        ).scalar_one_or_none()
        self.assertIsNotNone(site)
        self.assertEqual(site.id, "site_1")

    def test_unknown_id_and_host_resolve_to_nothing(self) -> None:
        by_id = self.session.execute(
            select(GeneratedSite).where(GeneratedSite.id == "does_not_exist")
        ).scalar_one_or_none()
        by_host = self.session.execute(
            select(GeneratedSite).where(GeneratedSite.public_url == "nope.usekreaton.com")
        ).scalar_one_or_none()
        self.assertIsNone(by_id)
        self.assertIsNone(by_host)

    def test_malformed_generated_config_falls_back_to_empty_schema(self) -> None:
        self.session.add(
            GeneratedSite(
                id="site_2",
                store_id="store_1",
                owner_user_id="user_1",
                owner_email="owner@example.com",
                business_name="Broken Config Co",
                business_type="restaurant",
                template_id="restaurant-food-business",
                template_name="Restaurant & Food Business",
                template_mode="visual_prototype",
                domain_slug="broken-config",
                public_url="broken-config.usekreaton.com",
                status="draft",
                generated_config="not valid json",
            )
        )
        self.session.commit()
        site = self.session.execute(
            select(GeneratedSite).where(GeneratedSite.id == "site_2")
        ).scalar_one_or_none()

        payload = _public_site_payload(site)

        self.assertEqual(payload["schema"], {})
        self.assertEqual(payload["catalog_items"], [])

    def test_generated_theme_uses_renderer_contract_and_survives_public_payload(self) -> None:
        state = ProjectState(
            businessName="Chromatic Studio",
            businessDescription="A design studio with a custom visual identity.",
            colors={
                "background": "#FFF7ED",
                "surface": "#FFFFFF",
                "primary": "#7C2D12",
                "secondary": "#FDBA74",
                "accent": "#0F766E",
                "text": "#1C1917",
            },
            typography={"heading": "Playfair Display", "body": "Source Sans 3"},
        )

        schema = build_schema_from_state(
            state,
            catalog_items=[],
            catalog_source="seed_fallback",
        )
        theme = schema["theme"]

        self.assertEqual(theme["colors"]["primary"], "#7C2D12")
        self.assertEqual(theme["colors"]["accent"], "#0F766E")
        self.assertEqual(theme["fonts"]["heading"], "Playfair Display")
        self.assertEqual(theme["fonts"]["body"], "Source Sans 3")
        self.assertNotIn("primary", theme)
        self.assertNotIn("heading_font", theme)

        site = self.session.execute(
            select(GeneratedSite).where(GeneratedSite.id == "site_1")
        ).scalar_one()
        site.generated_config = json.dumps(schema)
        self.session.commit()

        public_schema = _public_site_payload(site)["schema"]
        self.assertEqual(public_schema["theme"]["colors"], theme["colors"])
        self.assertEqual(public_schema["theme"]["fonts"], theme["fonts"])
        self.assertEqual(_schema_summary(public_schema)["accent_color"], "#0F766E")
        self.assertEqual(_schema_summary({"theme": {"accent": "#AABBCC"}})["accent_color"], "#AABBCC")

    def test_frontend_theme_consumers_use_nested_colors_and_fonts(self) -> None:
        repo_root = Path(__file__).resolve().parents[2]
        renderer_source = (repo_root / "src" / "ai-builder" / "renderers.js").read_text(encoding="utf-8")
        viewer_source = (repo_root / "site-viewer.js").read_text(encoding="utf-8")
        editor_source = (repo_root / "src" / "ai-builder" / "index.js").read_text(encoding="utf-8")

        self.assertIn("theme.colors = theme.colors || {}", renderer_source)
        self.assertIn("theme.fonts = theme.fonts || {}", renderer_source)
        self.assertIn("const colors = theme.colors || {}", viewer_source)
        self.assertIn("const fonts = theme.fonts || {}", viewer_source)
        self.assertIn('"theme.colors.primary"', editor_source)
        self.assertIn('"theme.colors.background"', editor_source)

    def test_planner_pages_and_new_section_types_reach_the_generated_schema(self) -> None:
        planned_pages = [{
            "page_key": "home",
            "pageKey": "home",
            "title": "Home",
            "slug": "/",
            "sections": [{
                "id": "work",
                "sectionId": "work",
                "type": "PortfolioGallery",
                "component": "PortfolioGallery",
                "componentType": "portfolio_gallery",
                "editable": {"copy": {"headline": "Selected work"}, "dataBinding": {"items": []}},
            }],
        }]
        state = ProjectState(
            businessName="Northstar Studio",
            businessDescription="Architecture and interiors.",
            generatedCopy={"pages": planned_pages},
        )

        schema = build_schema_from_state(state, catalog_items=[], catalog_source="seed_fallback")

        self.assertEqual(schema["pages"], planned_pages)
        self.assertEqual(schema["pages"][0]["sections"][0]["type"], "PortfolioGallery")

    def test_frontend_keeps_and_renders_optional_planner_sections(self) -> None:
        repo_root = Path(__file__).resolve().parents[2]
        renderer_source = (repo_root / "src" / "ai-builder" / "renderers.js").read_text(encoding="utf-8")
        editor_source = (repo_root / "src" / "ai-builder" / "index.js").read_text(encoding="utf-8")
        viewer_source = (repo_root / "site-viewer.js").read_text(encoding="utf-8")

        for component in ("QuoteRequestForm", "CapabilitiesEquipment", "PortfolioGallery", "VideoShowcase"):
            self.assertIn(component, renderer_source)
            self.assertIn(component, viewer_source)
            self.assertIn(component, editor_source)
        self.assertIn('host === "youtu.be"', renderer_source)
        self.assertNotIn('host.endsWith("youtube.com")', renderer_source)
        self.assertIn("marketplace-category-groups", renderer_source)
        self.assertIn("marketplace-category-groups", viewer_source)
        self.assertIn('id: "marketplace_gallery"', editor_source)
        self.assertIn("copy.featuredProducts", editor_source)


if __name__ == "__main__":
    unittest.main()
