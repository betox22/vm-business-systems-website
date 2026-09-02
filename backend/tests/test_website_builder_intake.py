import asyncio
import unittest
from unittest.mock import AsyncMock, patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from starlette.requests import Request

from app import main
from app.db import Base
from app.models import WebsiteGenerationRequest
from app.models import ProjectState


def _memory_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


def _http_request() -> Request:
    return Request({
        "type": "http",
        "method": "POST",
        "path": "/ai/website-builder",
        "headers": [],
        "client": ("127.0.0.1", 49152),
        "scheme": "http",
        "server": ("testserver", 80),
    })


class WebsiteBuilderIntakeTests(unittest.TestCase):
    def setUp(self) -> None:
        self.session = _memory_session()

    def tearDown(self) -> None:
        self.session.close()

    def test_chat_ready_state_generates_without_second_intake_question(self) -> None:
        request = WebsiteGenerationRequest(
            business_name="Bath All Day",
            business_description="Handmade soaps, candles, and bath bombs sold online.",
            industry="beauty",
            services_products=["Lavender soap", "Vanilla candle", "Bath bomb"],
            preferred_tone="organic and warm",
            logoPalette=["#5B7F55", "#F4E7D3"],
            colorProvenance={
                "anchorColor": "#5B7F55",
                "anchorSource": "logo_extracted",
                "colors": [
                    {"color": "#5B7F55", "source": "logo_extracted"},
                    {"color": "#F4E7D3", "source": "logo_extracted"},
                ],
            },
            logoPreference="explicit_skip",
            salesFlow="online_sales",
            selectedLanguage="en",
            fieldMeta={
                "business_name": {"source": "explicit", "confidence": 0.95},
                "business_description": {"source": "explicit", "confidence": 0.95},
                "niche": {"source": "inferred", "confidence": 0.86},
                "industry": {"source": "inferred", "confidence": 0.86},
                "salesFlow": {"source": "ai_recommended", "confidence": 0.9},
                "sales_flow": {"source": "ai_recommended", "confidence": 0.9},
                "brand_style": {"source": "explicit", "confidence": 0.95},
                "preferredTone": {"source": "explicit", "confidence": 0.95},
                "logo": {"source": "explicit", "confidence": 0.95},
            },
        )

        captured_state = {}

        async def keep_validated_state(_prompt, state, **_kwargs):
            captured_state["state"] = state
            return state

        with (
            patch.object(main.orchestrator, "run", side_effect=keep_validated_state),
            patch.object(main.orchestrator, "retry_site_planner", side_effect=lambda _prompt, state: state),
        ):
            response = asyncio.run(main.website_builder(
                request,
                _http_request(),
                authorization="",
                luma_client_session="",
                session=self.session,
            ))

        self.assertFalse(response.needs_more_info)
        self.assertEqual(response.missing_fields, [])
        self.assertTrue(response.website_schema)
        self.assertEqual(response.website_schema["business"]["name"], "Bath All Day")
        self.assertEqual(captured_state["state"].logoPalette, ["#5B7F55", "#F4E7D3"])
        self.assertEqual(captured_state["state"].colorProvenance.anchorSource, "logo_extracted")
        self.assertEqual(response.website_schema["generation_metadata"]["theme_source"], "backend_generated")
        self.assertEqual(response.website_schema["brand"]["logoPalette"], ["#5B7F55", "#F4E7D3"])
        self.assertEqual(
            response.website_schema["brand"]["colorProvenance"]["anchorColor"],
            "#5B7F55",
        )

    def test_real_missing_fields_are_named_in_generation_response(self) -> None:
        request = WebsiteGenerationRequest(
            business_name="Bath All Day",
            business_description="Handmade soaps and candles.",
            industry="beauty",
            salesFlow="online_sales",
            selectedLanguage="en",
            fieldMeta={
                "niche": {"source": "explicit", "confidence": 1},
                "sales_flow": {"source": "explicit", "confidence": 1},
            },
        )

        response = asyncio.run(main.website_builder(
            request,
            _http_request(),
            authorization="",
            luma_client_session="",
            session=self.session,
        ))

        self.assertTrue(response.needs_more_info)
        self.assertEqual(response.missing_fields, ["services_products", "brand_style", "logo"])
        self.assertIn("products or services", response.next_question or "")
        self.assertIn("brand style", response.next_question or "")
        self.assertIn("logo", response.next_question or "")

    def test_seed_fallback_retries_planner_once_and_uses_successful_catalog(self) -> None:
        request = WebsiteGenerationRequest(
            business_name="Mi Mundo 3D",
            business_description="3D printers, materials, equipment, and online courses.",
            industry="technology",
            services_products=["3D printers", "Printing materials", "Online courses"],
            preferred_tone="explicit_delegation",
            logoPreference="explicit_skip",
            salesFlow="online_sales",
            selectedLanguage="en",
            fieldMeta={
                "niche": {"source": "explicit", "confidence": 1},
                "sales_flow": {"source": "explicit", "confidence": 1},
                "brand_style": {"source": "explicit_delegation", "confidence": 1},
                "logo": {"source": "explicit", "confidence": 1},
            },
        )
        first_state = ProjectState(
            businessName="Mi Mundo 3D",
            businessDescription=request.business_description,
            industry="technology",
            servicesProducts=request.services_products,
            preferredTone="explicit_delegation",
            logoPreference="explicit_skip",
            salesFlow="online_sales",
            websiteType="online_store",
            selectedTemplateId="mega-retail-store",
            catalogItems=[{"name": "Generic tech accessory", "category": "Tech"}],
            catalogSource="seed_fallback",
        )
        retry_state = first_state.model_copy(deep=True)
        retry_state.catalogItems = [
            {"name": "3D Printer", "category": "3D Printers", "price": 499.0},
            {"name": "PLA Filament", "category": "Materials", "price": 24.0},
        ]
        retry_state.catalogSource = "ai_generated"
        retry = AsyncMock(return_value=retry_state)

        with (
            patch.object(main.orchestrator, "run", new=AsyncMock(return_value=first_state)),
            patch.object(main.orchestrator, "retry_site_planner", new=retry),
        ):
            response = asyncio.run(main.website_builder(
                request,
                _http_request(),
                authorization="",
                luma_client_session="",
                session=self.session,
            ))

        retry.assert_awaited_once()
        self.assertEqual(response.catalog_source, "ai_generated")
        first_item = response.website_schema["catalog_items"][0]
        self.assertEqual(first_item["name"], "3D printers")
        self.assertEqual(first_item["price_type"], "quote_only")
        self.assertIsNone(first_item["price_amount"])

    def test_seed_fallback_stops_after_one_planner_retry(self) -> None:
        request = WebsiteGenerationRequest(
            business_name="Mi Mundo 3D",
            business_description="3D printers, materials, equipment, and online courses.",
            industry="technology",
            services_products=["3D printers", "Printing materials", "Online courses"],
            preferred_tone="explicit_delegation",
            logoPreference="explicit_skip",
            salesFlow="online_sales",
            selectedLanguage="en",
            fieldMeta={
                "niche": {"source": "explicit", "confidence": 1},
                "sales_flow": {"source": "explicit", "confidence": 1},
                "brand_style": {"source": "explicit_delegation", "confidence": 1},
                "logo": {"source": "explicit", "confidence": 1},
            },
        )
        fallback_state = ProjectState(
            businessName="Mi Mundo 3D",
            businessDescription=request.business_description,
            industry="technology",
            servicesProducts=request.services_products,
            preferredTone="explicit_delegation",
            logoPreference="explicit_skip",
            salesFlow="online_sales",
            websiteType="online_store",
            selectedTemplateId="mega-retail-store",
            catalogItems=[{"name": "Fallback item", "category": "Tech"}],
            catalogSource="seed_fallback",
        )
        retry = AsyncMock(return_value=fallback_state)

        with (
            patch.object(main.orchestrator, "run", new=AsyncMock(return_value=fallback_state)),
            patch.object(main.orchestrator, "retry_site_planner", new=retry),
        ):
            response = asyncio.run(main.website_builder(
                request,
                _http_request(),
                authorization="",
                luma_client_session="",
                session=self.session,
            ))

        retry.assert_awaited_once()
        self.assertEqual(response.catalog_source, "seed_fallback")

    def test_replaced_business_reaches_generation_with_only_new_offerings(self) -> None:
        new_offerings = [
            "Repuestos y piezas de carro usados y nuevos",
            "Filtros",
            "Frenos",
            "Aceite",
            "Bujias",
        ]
        request = WebsiteGenerationRequest(
            business_name="Turbo Parts VE",
            business_description=(
                "Repuestos y piezas de carro usados y nuevos, filtros, frenos, "
                "aceite y bujias, con venta online y taller fisico en Caracas."
            ),
            industry="automotive",
            location="Caracas",
            services_products=new_offerings,
            target_audience="Mecanicos y duenos de carros",
            preferred_tone="Moderno, oscuro y agresivo",
            logoPreference="explicit_skip",
            salesFlow="online_sales",
            selectedLanguage="es",
            fieldMeta={
                "niche": {"source": "explicit", "confidence": 1},
                "sales_flow": {"source": "explicit", "confidence": 1},
                "brand_style": {"source": "explicit", "confidence": 1},
                "logo": {"source": "explicit", "confidence": 1},
            },
        )
        captured_state = {}

        async def generate_turbo_parts(_prompt, state, **_kwargs):
            captured_state["servicesProducts"] = list(state.servicesProducts)
            state.websiteType = "online_store"
            state.selectedTemplateId = "premium-product-store"
            state.catalogItems = [
                {"name": "Filtro de aceite premium", "category": "Filtros", "price": 18.0},
                {"name": "Pastillas de freno delanteras", "category": "Frenos", "price": 42.0},
                {"name": "Aceite sintetico 5W-30", "category": "Aceites", "price": 29.0},
                {"name": "Juego de bujias", "category": "Encendido", "price": 24.0},
            ]
            state.catalogSource = "ai_generated"
            return state

        with patch.object(main.orchestrator, "run", side_effect=generate_turbo_parts):
            response = asyncio.run(main.website_builder(
                request,
                _http_request(),
                authorization="",
                luma_client_session="",
                session=self.session,
            ))

        self.assertEqual(captured_state["servicesProducts"], new_offerings)
        self.assertEqual(response.catalog_source, "ai_generated")
        catalog_names = [item["name"] for item in response.website_schema["catalog_items"]]
        self.assertEqual(catalog_names, [
            "Filtro de aceite premium",
            "Pastillas de freno delanteras",
            "Aceite sintetico 5W-30",
            "Juego de bujias",
        ])
        contaminated = " ".join(catalog_names).lower()
        for stale_term in ("impresiones 3d", "regalos", "accessories", "gifts", "toys"):
            self.assertNotIn(stale_term, contaminated)


if __name__ == "__main__":
    unittest.main()
