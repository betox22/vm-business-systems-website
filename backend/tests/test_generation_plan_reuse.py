import asyncio
import json
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import main
from app.ai_site_planner import ensure_plan_seed_catalog_with_source
from app.agents import CatalogAgent
from app.db import Base
from app.db_models import PreparedGenerationRecord
from app.models import ProjectState


class FakeCompletions:
    async def create(self, **_kwargs):
        payload = {
            "updatedFields": {"logo": {"value": {"path": "explicit_skip"}, "source": "explicit", "confidence": 0.95}},
            "detectedIntent": {
                "businessModel": "online_store",
                "commerceMode": "single_vendor",
                "salesFlow": "online_sales",
                "niche": "beauty",
                "confidence": 0.95,
            },
            "missingCriticalFields": [],
            "reasoning": "The business details are complete.",
            "nextQuestion": "",
            "canGenerate": True,
            "templateRecommendation": None,
        }
        call = SimpleNamespace(function=SimpleNamespace(arguments=json.dumps(payload)))
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(tool_calls=[call]))])


@pytest.mark.parametrize(
    ("change", "expected_runs"),
    [
        ({}, 1),
        ({"businessDescription": "Handmade soaps and in-person workshops."}, 2),
        ({"preparedPlanToken": "invalid-token"}, 2),
        ({"preparedPlanToken": ""}, 2),
        ({"selected_template_id": "restaurant-food-business"}, 2),
        ({"expire_receipt": True}, 2),
        ({"logoUrl": "https://example.test/new-logo.png"}, 2),
        ({"server_targetAudience": "Customers who value handmade bath products"}, 1),
        ({"server_targetAudience": "Customers who value handmade bath products", "targetAudience": "Wholesale buyers"}, 2),
        ({"logoBrief": "A new logo direction"}, 2),
        ({"server_logoBrief": "Use a leaf symbol"}, 1),
        ({"server_salesMode": "online_sales and local pickup"}, 1),
        ({"server_servicesProducts": ["Bath bomb", "Lavender soap", "Vanilla candle"]}, 1),
    ],
)
def test_ready_intake_then_generate_runs_orchestrator_once(change, expected_runs):
    engine = create_engine(
        "sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)

    def get_test_session():
        with session_factory() as session:
            yield session

    main.app.dependency_overrides[main.get_session] = get_test_session
    calls = []
    reviews = []
    product = {"id": "prod_001", "name": "Lavender soap", "price_amount": 12.0}

    async def run_orchestrator(_message, state, **kwargs):
        calls.append(kwargs)
        state.selectedTemplateId = "mega-retail-store"
        if change.get("server_targetAudience"):
            state.targetAudience = change["server_targetAudience"]
        if change.get("server_logoBrief"):
            state.logoBrief = change["server_logoBrief"]
        if change.get("server_salesMode"):
            state.salesMode = change["server_salesMode"]
        if change.get("server_servicesProducts"):
            state.servicesProducts = change["server_servicesProducts"]
        return state

    async def review_prepared(_message, state):
        reviews.append(state.selectedTemplateId)
        return state

    current = {
        "businessName": "Bath All Day",
        "businessDescription": "Handmade soaps, candles, and bath bombs sold online.",
        "industry": "beauty",
        "servicesProducts": ["Lavender soap", "Vanilla candle", "Bath bomb"],
        "salesFlow": "online_sales",
        "preferredTone": "organic and warm",
        "logoPreference": "explicit_skip",
        "selectedLanguage": "en",
        "fieldMeta": {
            "business_name": {"source": "explicit", "confidence": 0.95},
            "business_description": {"source": "explicit", "confidence": 0.95},
            "niche": {"source": "explicit", "confidence": 0.95},
            "industry": {"source": "explicit", "confidence": 0.95},
            "salesFlow": {"source": "explicit", "confidence": 0.95},
            "sales_flow": {"source": "explicit", "confidence": 0.95},
            "brand_style": {"source": "explicit", "confidence": 0.95},
            "preferredTone": {"source": "explicit", "confidence": 0.95},
            "logo": {"source": "explicit", "confidence": 0.95},
        },
    }
    try:
        with (
            patch.object(main.intake_engine, "client", SimpleNamespace(chat=SimpleNamespace(completions=FakeCompletions()))),
            patch.object(main.orchestrator, "run", side_effect=run_orchestrator),
            patch.object(main.orchestrator, "review_prepared", side_effect=review_prepared),
            patch.object(main, "resolve_catalog_items_and_source", return_value=([product], "ai_generated")),
            patch.object(main, "_enforce_rate_limit"),
            patch.object(main, "template_ids_for_generation", return_value=["mega-retail-store", "restaurant-food-business"]),
        ):
            client = TestClient(main.app)
            chat = client.post("/api/luma/chat", json={"current": current, "message": "Continue without a logo."})
            assert chat.status_code == 200, chat.text
            assert chat.json()["readyToGenerate"] is True
            assert chat.json()["preparedPlanToken"]
            assert chat.json()["generationId"].startswith("gen_")
            details = chat.json()["updatedFields"]
            from app.generation_plan_cache import CLIENT_RETURNED_FIELDS

            assert set(CLIENT_RETURNED_FIELDS) <= details.keys()
            if change.get("expire_receipt"):
                with session_factory() as session:
                    record = session.query(PreparedGenerationRecord).one()
                    record.expires_at = 1
                    session.commit()
            generation_payload = {
                "preparedPlanToken": chat.json()["preparedPlanToken"],
                "businessName": details["businessName"],
                "businessDescription": details["businessDescription"],
                "industry": details["industry"],
                "servicesProducts": list(dict.fromkeys([*current["servicesProducts"], *details["servicesProducts"]])),
                "salesFlow": details["salesFlow"],
                "salesMode": details["salesMode"],
                "targetAudience": details["targetAudience"],
                "logoBrief": details["logoBrief"],
                "preferredTone": details["preferredTone"],
                "logoPreference": details["logoPreference"],
                "selectedLanguage": current["selectedLanguage"],
                "fieldMeta": details["fieldMeta"],
            }
            generation_payload.update({key: value for key, value in change.items() if not key.startswith("server_") and key != "expire_receipt"})
            generation = client.post(
                "/ai/website-builder", json=generation_payload,
                headers={"X-Generation-ID": chat.json()["generationId"]},
            )
            assert generation.status_code == 200, generation.text
            assert generation.json()["generation_id"] == chat.json()["generationId"]
            schema = generation.json()["schema"]
            assert schema["business"]["name"] == "Bath All Day"
            assert schema["selected_template"]["id"] == "mega-retail-store"
            assert schema["pages"][0]["page_key"] == "home"
            assert schema["catalog_items"] == [product]
        assert len(calls) == expected_runs, calls
        assert reviews == (["mega-retail-store"] if expected_runs == 1 else [])
    finally:
        main.app.dependency_overrides.pop(main.get_session, None)
        engine.dispose()


def test_approved_generated_logo_does_not_repeat_orchestration():
    source = ProjectState(businessName="Bath All Day", logoPreference="generate_ai_logo")
    generated = source.model_copy(deep=True)
    current = source.model_copy(deep=True)
    current.logoUrl = "https://example.test/generated-logo.png"
    current.logoGenerationStatus = "generated"
    current.runtimeAvailableTemplateIds = ["mega-retail-store"]
    generated.selectedTemplateId = "mega-retail-store"
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    try:
        with sessionmaker(bind=engine)() as session:
            from app.generation_plan_cache import load_prepared_generation, store_prepared_generation

            token = store_prepared_generation(session, source, generated)
            reused = load_prepared_generation(session, token, current)
            assert reused is not None
            assert reused.logoUrl == current.logoUrl
            assert reused.logoGenerationStatus == "generated"
    finally:
        engine.dispose()


def test_planner_reuses_complete_catalog_agent_seed():
    seed = {
        "id": "prod_001", "sku": "AI-001", "name": "Lavender soap",
        "description": "Handmade lavender soap.", "category": "Bath",
        "price_amount": 12.0, "price": 12.0, "rating": 4.5,
        "badge": "Featured", "imageSearchQuery": "lavender soap",
    }
    state = ProjectState(businessName="Bath All Day", catalogItems=[seed])
    plan = SimpleNamespace(templateId="mega-retail-store", catalogStrategy="retail", websiteType="online_store")
    with patch("app.ai_site_planner.semantic_seed_catalog") as create_seed:
        catalog, source = ensure_plan_seed_catalog_with_source([], state, plan)
    create_seed.assert_not_called()
    assert catalog == [seed]
    assert source == "seed_fallback"


def test_planner_regenerates_incomplete_catalog_seed():
    seed = {
        "id": "prod_001", "sku": "AI-001", "name": "Lavender soap",
        "description": "Handmade lavender soap.", "category": "Bath",
        "price_amount": 12.0, "price": 12.0, "rating": 4.5,
        "badge": "Featured", "imageSearchQuery": "lavender soap",
    }
    state = ProjectState(businessName="Bath All Day", catalogItems=[{"name": "Incomplete"}])
    plan = SimpleNamespace(templateId="mega-retail-store", catalogStrategy="retail", websiteType="online_store")
    with patch("app.ai_site_planner.semantic_seed_catalog", return_value=[seed]) as create_seed:
        catalog, source = ensure_plan_seed_catalog_with_source([], state, plan)
    create_seed.assert_called_once()
    assert catalog == [seed]
    assert source == "seed_fallback"


def test_catalog_agent_and_planner_share_one_seed_request():
    seed = {
        "id": "prod_001", "sku": "AI-001", "name": "Lavender soap",
        "description": "Handmade lavender soap.", "category": "Bath",
        "price_amount": 12.0, "price": 12.0, "rating": 4.5,
        "badge": "Featured", "imageSearchQuery": "lavender soap",
    }
    state = ProjectState(
        businessName="Bath All Day", businessDescription="Handmade soaps sold online.",
        servicesProducts=["Lavender soap"], websiteType="online_store",
        selectedTemplateId="mega-retail-store",
    )
    plan = SimpleNamespace(templateId="mega-retail-store", catalogStrategy="retail", websiteType="online_store")
    with (
        patch("app.agents.semantic_seed_catalog", return_value=[seed]) as agent_seed,
        patch("app.ai_site_planner.semantic_seed_catalog") as planner_seed,
    ):
        result = asyncio.run(CatalogAgent().run(state, "Handmade soaps"))
        state.catalogItems = result.updates["catalogItems"]
        catalog, source = ensure_plan_seed_catalog_with_source([], state, plan)
    agent_seed.assert_called_once()
    planner_seed.assert_not_called()
    assert len(catalog) == 1
    assert catalog[0]["name"] == "Lavender soap"
    assert catalog[0]["content_origin"] == "client_declared"
    assert source == "seed_fallback"
