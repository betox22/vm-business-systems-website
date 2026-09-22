import asyncio
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from starlette.requests import Request

from app import main, section_composer, section_composition
from app.db import Base
from app.db_models import GeneratedSite, Store
from app.models import ProjectState, WebsiteGenerationRequest


OWNER = {"id": "section-owner", "email": "section-owner@example.test"}


@pytest.fixture
def generation(monkeypatch):
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    state = ProjectState(
        businessName="Maker Studio",
        businessDescription="3D printing tools and supplies",
        industry="3D printing",
        servicesProducts=["Printer filament"],
        selectedTemplateId="corporate-company-pro",
        selectedTemplateName="Corporate Company",
        websiteType="corporate",
        catalogType="company_services_catalog",
        logoPreference="explicit_skip",
    )
    request = WebsiteGenerationRequest(
        businessName="Maker Studio",
        businessDescription="3D printing tools and supplies",
        industry="3D printing",
        servicesProducts=["Printer filament"],
        preferredTone="modern",
        logoPreference="explicit_skip",
        salesFlow="catalog_or_quotes",
        selectedLanguage="en",
    )
    http_request = Request({
        "type": "http", "method": "POST", "path": "/ai/website-builder",
        "headers": [], "client": ("10.99.0.1", 12345),
        "scheme": "http", "server": ("testserver", 80),
    })
    monkeypatch.setattr(main, "_enforce_rate_limit", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(main.intake_engine, "missing_fields_from_state", lambda *_args: [])
    monkeypatch.setattr(main, "unblock_niche_intake_loop", lambda _state, fields: fields)
    monkeypatch.setattr(main.orchestrator, "run", AsyncMock(return_value=state))
    monkeypatch.setattr(main, "resolve_catalog_items_and_source", lambda _state: ([], "ai_generated"))
    monkeypatch.setattr(main, "authenticated_client_user", lambda *_args, **_kwargs: OWNER)
    yield session, request, http_request, state
    session.close()
    engine.dispose()


def generate(generation):
    session, request, http_request, _state = generation
    return asyncio.run(main.website_builder(
        request, http_request, authorization="", luma_client_session="", session=session,
    ))


def composed_proposal(_brief, archetypes, **kwargs):
    assert "custom_order_upload" in archetypes
    assert {"quote_upload", "header", "footer"}.issubset(kwargs["excluded_section_types"])
    assert kwargs["require_complete_bindings"] is True
    return {"sections": [
        {
            "section_id": "home-services-premium--home--home-service-hero",
            "copy": {"headline": "Designed for makers", "subtitle": "Tools for building",
                     "primary_button": "Explore", "secondary_button": "Contact"},
            "image_requests": [
                {"slot_id": "image_1", "image_role": "hero_candidate", "category": "maker workshop"},
            ],
        },
        {
            "section_id": "premium-product-store--home--premium-cta",
            "copy": {"title": "Materials with character", "text": "Explore our workshop"},
            "image_requests": [
                {"slot_id": "image_1", "image_role": "texture_atmosphere", "category": "workshop surface"},
            ],
        },
    ]}


def resolved_images(requests, context):
    return [
        {"slot_id": request["slot_id"], "image_role": request["image_role"],
         "asset_url": f"https://images.example.test/{request['slot_id']}.png",
         "source": "generated" if request["image_role"] == "texture_atmosphere" else "stock"}
        for request in requests
    ]


def test_flag_off_keeps_legacy_schema_and_does_not_call_composer(generation, monkeypatch):
    monkeypatch.delenv("KREATON_SECTION_COMPOSITION_ENABLED", raising=False)
    monkeypatch.setattr(main, "prepare_composed_schema", lambda *_args: pytest.fail("composer called with flag off"))

    response = generate(generation)
    session, _request, _http_request, state = generation
    expected = main.build_schema_from_state(state, catalog_items=[], catalog_source="ai_generated")
    site = session.scalars(select(GeneratedSite)).one()

    assert response.website_schema == expected
    assert json.loads(site.generated_config) == expected


def test_enabled_path_resolves_stock_before_persist_and_texture_after_ids(generation, monkeypatch):
    monkeypatch.setenv("KREATON_SECTION_COMPOSITION_ENABLED", "1")
    generation[1].selected_template_id = "premium-product-store"
    generation[3].generatedCopy["pages"] = [
        {"page_key": "home", "title": "Home", "slug": "/", "order": 1, "sections": []},
    ]
    calls = []
    monkeypatch.setattr(section_composition.section_composer, "compose_layout", composed_proposal)

    def resolve(requests, context):
        calls.append((requests, dict(context)))
        return resolved_images(requests, context)

    monkeypatch.setattr(section_composition.image_request_resolver, "resolve_image_requests", resolve)
    response = generate(generation)
    session = generation[0]
    site = session.scalars(select(GeneratedSite)).one()
    store = session.scalars(select(Store)).one()
    sections = [item for item in response.website_schema["pages"][0]["sections"] if item["type"] == "composed"]

    assert sections[0] == {
        "id": "composed-1-home-services-premium--home--home-service-hero",
        "type": "composed", "order": 1,
        "section_id": "home-services-premium--home--home-service-hero",
        "copy_bindings": {"headline": "Designed for makers", "subtitle": "Tools for building",
                          "primary_button": "Explore", "secondary_button": "Contact"},
        "image_bindings": {"image_1": "https://images.example.test/image_1.png"},
    }
    assert sections[1]["section_id"] == "premium-product-store--home--premium-cta"
    assert sections[1]["copy_bindings"] == {"title": "Materials with character", "text": "Explore our workshop"}
    assert sections[1]["image_bindings"] == {"image_1": "https://images.example.test/image_1.png"}
    assert calls[0][0][0]["image_role"] == "hero_candidate"
    assert "business_id" not in calls[0][1] and "site_id" not in calls[0][1]
    assert calls[1][0][0]["image_role"] == "texture_atmosphere"
    assert calls[1][1]["business_id"] == store.id
    assert calls[1][1]["site_id"] == site.id
    assert json.loads(site.generated_config) == response.website_schema
    assert response.business_id == store.id and response.site_id == site.id
    assert response.website_schema["selected_template"]["id"] == "corporate-company-pro"


@pytest.mark.parametrize("failure", ["composer", "stock", "texture", "invalid_binding"])
def test_enabled_path_falls_back_without_partial_site(generation, monkeypatch, failure):
    monkeypatch.setenv("KREATON_SECTION_COMPOSITION_ENABLED", "1")

    def compose(*args, **kwargs):
        if failure == "composer":
            raise RuntimeError("OpenAI unavailable")
        return composed_proposal(*args, **kwargs)

    def resolve(requests, context):
        if failure == "stock" and requests[0]["image_role"] == "hero_candidate":
            raise RuntimeError("Stock unavailable")
        if failure == "texture" and requests[0]["image_role"] == "texture_atmosphere":
            raise RuntimeError("Texture unavailable")
        if failure == "invalid_binding":
            return [{"slot_id": "wrong", "image_role": requests[0]["image_role"], "asset_url": "https://images.example.test/x.png"}]
        return resolved_images(requests, context)

    monkeypatch.setattr(section_composition.section_composer, "compose_layout", compose)
    monkeypatch.setattr(section_composition.image_request_resolver, "resolve_image_requests", resolve)
    response = generate(generation)
    session = generation[0]
    sites = session.scalars(select(GeneratedSite)).all()

    assert len(sites) == 1
    assert response.website_schema == json.loads(sites[0].generated_config)
    assert all(item["type"] != "composed" for page in response.website_schema["pages"] for item in page["sections"])


def test_production_eligibility_excludes_quote_upload_and_incomplete_partials():
    eligible = section_composer._load_eligible_sections(
        {"custom_order_upload"}, excluded_section_types={"quote_upload"}, require_complete_bindings=True,
    )

    assert eligible
    assert all(manifest["section_type"] != "quote_upload" for manifest in eligible.values())
    assert "quote-upload--custom-order" not in eligible
    assert "corporate-company-pro--home--corporate-hero" not in eligible


def test_fixed_home_roles_are_excluded_before_composition(generation, monkeypatch):
    monkeypatch.setenv("KREATON_SECTION_COMPOSITION_ENABLED", "1")
    offered = {}

    def compose(_brief, _archetypes, **kwargs):
        offered.update(kwargs)
        return {"sections": [{
            "section_id": "corporate-company-pro--home--corporate-process",
            "copy": {"title": "Our process", "text": "Design and deliver"},
            "image_requests": [],
        }]}

    monkeypatch.setattr(section_composition.section_composer, "compose_layout", compose)
    response = generate(generation)
    sections = response.website_schema["pages"][0]["sections"]

    assert {"hero", "catalog", "header", "footer", "quote_upload"}.issubset(offered["excluded_section_types"])
    assert "process" not in offered["excluded_section_types"]
    eligible = section_composer._load_eligible_sections(
        {"custom_order_upload"}, excluded_section_types=offered["excluded_section_types"],
        require_complete_bindings=True,
    )
    assert not {"hero", "catalog"} & {manifest["section_type"] for manifest in eligible.values()}
    assert [section["type"] for section in sections] == ["Hero", "ProductGrid", "composed"]


@pytest.mark.parametrize("template_id,roles", [
    ("mega-retail-store", {"hero", "catalog"}),
    ("b2b-saas-enterprise-pro", {"hero", "catalog", "feature"}),
])
def test_renderer_owned_roles_count_without_explicit_sections(template_id, roles):
    schema = {"active_template": {"id": template_id}}
    covered = section_composition.covered_section_types(schema, {"sections": []})

    assert roles.issubset(covered)
    assert {"header", "footer", "quote_upload"}.issubset(covered)


def test_ambiguous_fixed_sections_are_not_silently_equated():
    covered = section_composition.covered_section_types({}, {"sections": [
        {"type": "TrustStrip"}, {"type": "FashionCollectionRail"},
        {"type": "BookingAvailability"},
    ]})

    assert not {"feature", "catalog", "about", "contact", "process"} & covered


@pytest.mark.parametrize("fixed_type", [
    "CorporateServices", "RestaurantSignatureMenu", "HomeServiceCategories",
    "BookingServices", "DigitalBundle", "LuxuryCollection", "AcademyPrograms",
    "ClinicServices", "ProfessionalPracticeAreas", "EnterpriseSolutions",
    "ListingFeatured", "FunnelOffer", "IndustrialSpecCatalog",
])
def test_product_rendering_fixed_sections_cover_catalog(fixed_type):
    covered = section_composition.covered_section_types({}, {"sections": [{"type": fixed_type}]})

    assert "catalog" in covered


def test_provider_receives_only_renderable_sections_without_quote_upload(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-only-key")
    monkeypatch.setattr(section_composer.agents, "OpenAI", lambda **_kwargs: object())
    seen = {}

    def completion(_client, **kwargs):
        seen.update(kwargs)
        proposal = {"sections": [{
            "section_id": "home-services-premium--home--home-service-hero",
            "copy": [
                {"field": field, "value": field.title()}
                for field in ("headline", "subtitle", "primary_button", "secondary_button")
            ],
            "image_requests": [
                {"slot_id": "image_1", "image_role": "hero_candidate", "category": "workshop"},
            ],
        }]}
        return SimpleNamespace(choices=[SimpleNamespace(
            finish_reason="stop", message=SimpleNamespace(content=json.dumps(proposal), refusal=None, tool_calls=None),
        )])

    monkeypatch.setattr(section_composer.agents, "create_sync_chat_completion_with_retry", completion)
    result = section_composer.compose_layout(
        {"business": {"name": "Maker Studio"}}, {"custom_order_upload"},
        excluded_section_types={"quote_upload"}, require_complete_bindings=True,
    )
    offered = json.loads(seen["messages"][1]["content"])["eligible_sections"]
    allowed_ids = {item["section_id"] for item in offered}

    assert result["sections"][0]["section_id"] in allowed_ids
    assert "quote-upload--custom-order" not in allowed_ids
    assert "corporate-company-pro--home--corporate-hero" not in allowed_ids
    assert "quote-upload--custom-order" not in seen["response_format"]["json_schema"]["schema"]["properties"]["sections"]["items"]["properties"]["section_id"]["enum"]
