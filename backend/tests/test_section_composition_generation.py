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


@pytest.mark.parametrize("template_id", ["mega-retail-store", "b2b-saas-enterprise-pro"])
def test_commerce_templates_get_shared_shell_with_composer_disabled(generation, monkeypatch, template_id):
    monkeypatch.delenv("KREATON_SECTION_COMPOSITION_ENABLED", raising=False)
    monkeypatch.setattr(main, "prepare_composed_schema", lambda *_args: pytest.fail("composer called"))
    generation[3].selectedTemplateId = template_id
    generation[3].selectedTemplateName = template_id

    response = generate(generation)
    sections = response.website_schema["pages"][0]["sections"]
    shell = [section for section in sections if section.get("section_id") in {"shared--header", "shared--footer"}]

    assert {section["section_id"] for section in shell} == {"shared--header", "shared--footer"}
    assert shell[0]["list_bindings"]["navigation"]
    assert response.website_schema == main.ensure_shared_commerce_shell(response.website_schema)
    assert json.loads(generation[0].scalars(select(GeneratedSite)).one().generated_config) == response.website_schema


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
    body_sections = [item for item in sections if item["section_id"] not in {"shared--header", "shared--footer"}]

    assert [sections[0]["section_id"], sections[-1]["section_id"]] == ["shared--header", "shared--footer"]
    assert sections[0]["list_bindings"]["navigation"]
    assert body_sections[0] == {
        "id": "composed-1-home-services-premium--home--home-service-hero",
        "type": "composed", "order": 1,
        "section_id": "home-services-premium--home--home-service-hero",
        "copy_bindings": {"headline": "Designed for makers", "subtitle": "Tools for building",
                          "primary_button": "Explore", "secondary_button": "Contact"},
        "image_bindings": {"image_1": "https://images.example.test/image_1.png"},
    }
    assert body_sections[1]["section_id"] == "premium-product-store--home--premium-cta"
    assert body_sections[1]["copy_bindings"] == {"title": "Materials with character", "text": "Explore our workshop"}
    assert body_sections[1]["image_bindings"] == {"image_1": "https://images.example.test/image_1.png"}
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
    assert [section["type"] for section in sections] == ["Hero", "ProductGrid", "composed", "composed", "composed"]
    assert [section["section_id"] for section in sections if section["type"] == "composed"] == [
        "shared--header", "corporate-company-pro--home--corporate-process", "shared--footer",
    ]


@pytest.mark.parametrize("template_id,roles", [
    ("mega-retail-store", {"hero", "catalog"}),
    ("b2b-saas-enterprise-pro", {"hero", "catalog", "feature"}),
])
def test_renderer_owned_roles_count_without_explicit_sections(template_id, roles):
    schema = {"active_template": {"id": template_id}}
    covered = section_composition.covered_section_types(schema, {"sections": []})

    assert roles.issubset(covered)
    assert "quote_upload" in covered
    assert not {"header", "footer"} & covered


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
                {"field": field, "value": value}
                for field, value in (
                    ("service_category", "3D printing"),
                    ("headline", "Custom production"),
                    ("subtitle", "Explore available services"),
                    ("primary_button", "Services"),
                    ("primary_page_key", "services"),
                    ("secondary_button", "Contact"),
                    ("secondary_page_key", "contact"),
                    ("image_alt", "Workshop equipment"),
                )
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
        {"business": {"name": "Maker Studio"}}, {"custom_order_upload", "services"},
        excluded_section_types={"quote_upload"}, require_complete_bindings=True,
    )
    offered = json.loads(seen["messages"][1]["content"])["eligible_sections"]
    allowed_ids = {item["section_id"] for item in offered}

    assert result["sections"][0]["section_id"] in allowed_ids
    assert "quote-upload--custom-order" not in allowed_ids
    assert "corporate-company-pro--home--corporate-hero" not in allowed_ids
    assert "quote-upload--custom-order" not in seen["response_format"]["json_schema"]["schema"]["properties"]["sections"]["items"]["properties"]["section_id"]["enum"]


@pytest.mark.parametrize("page_count", [1, 2, 5])
def test_composed_shell_uses_every_real_page_and_keeps_body(generation, monkeypatch, page_count):
    monkeypatch.setenv("KREATON_SECTION_COMPOSITION_ENABLED", "1")
    monkeypatch.setattr(section_composition.section_composer, "compose_layout", lambda *_args, **_kwargs: {
        "sections": [{"section_id": "corporate-company-pro--home--corporate-process",
                      "copy": {"title": "Our process", "text": "Design and deliver"},
                      "image_requests": []}],
    })
    state = generation[3]
    state.generatedCopy["pages"] = [
        {"page_key": "home" if index == 0 else f"page_{index}",
         "title": "Home" if index == 0 else f"Page {index}",
         "slug": "/" if index == 0 else f"/page-{index}", "order": index + 1, "sections": []}
        for index in range(page_count)
    ]
    state.generatedCopy["navigation"] = [
        {"page_key": page["page_key"], "label": f"Navigation {index}"}
        for index, page in enumerate(state.generatedCopy["pages"])
    ]
    response = generate(generation)
    sections = response.website_schema["pages"][0]["sections"]
    header = next(section for section in sections if section.get("section_id") == "shared--header")
    footer = next(section for section in sections if section.get("section_id") == "shared--footer")
    labels = {item["page_key"]: item["label"] for item in response.website_schema.get("navigation") or []}
    expected = [{"label": labels.get(page["page_key"], page["title"]), "page_key": page["page_key"]}
                for page in response.website_schema["pages"]]

    assert header["list_bindings"]["navigation"] == expected
    assert footer["list_bindings"]["navigation"] == expected
    assert any(section.get("section_id") == "corporate-company-pro--home--corporate-process" for section in sections)
    assert json.loads(generation[0].scalars(select(GeneratedSite)).one().generated_config) == response.website_schema


def test_composed_shell_respects_edited_navigation_labels():
    schema = {
        "pages": [
            {"page_key": "home", "title": "Home", "order": 1},
            {"page_key": "contact", "title": "Contact", "order": 2},
        ],
        "navigation": [{"page_key": "contact", "label": "Hablar con nosotros"}],
        "global_components": {"footer_text": "Estudio Norte"},
    }
    header, footer = section_composition._shared_shell(schema, {"name": "Estudio Norte", "selectedLanguage": "es"})

    assert header["list_bindings"]["navigation"] == [
        {"label": "Home", "page_key": "home"},
        {"label": "Hablar con nosotros", "page_key": "contact"},
    ]
    assert footer["list_bindings"] == header["list_bindings"]
    assert header["copy_bindings"]["navigation_label"] == "Navegación del sitio"
    assert footer["copy_bindings"]["footer_text"] == "Estudio Norte"


def test_composed_mega_retail_shell_binds_commerce_controls_from_real_catalog():
    schema = {
        "active_template": {"id": "mega-retail-store"},
        "pages": [{"page_key": "home", "title": "Home", "order": 1}],
        "catalog_items": [{"name": "Drill", "category": "Tools"}, {"name": "Saw", "category": "Tools"}],
        "brand": {"logoUrl": "/assets/electrohub.png"},
        "global_components": {"footer_text": "ElectroHub"},
    }
    header, footer = section_composition._shared_shell(
        schema, {"name": "ElectroHub", "salesMode": "online_sales", "selectedLanguage": "en"}
    )
    assert header["control_bindings"] == {
        "departments": {"label": "Departments", "items": [{"label": "Tools", "category": "Tools"}]},
        "search": {"label": "Search products and departments"},
        "cart": {"label": "Cart"},
        "account": {"label": "Sign in", "action": "modal"},
    }
    assert footer["control_bindings"]["newsletter"]["button_label"] == "Subscribe"
    assert header["image_bindings"] == {"brand_logo": "/assets/electrohub.png"}
    assert footer["image_bindings"] == {"brand_logo": "/assets/electrohub.png"}
    quote_header, _ = section_composition._shared_shell(
        schema, {"name": "ElectroHub"}, sales_mode="catalog_or_quotes"
    )
    assert "cart" not in quote_header["control_bindings"]
    assert "search" not in quote_header["control_bindings"]
    assert "account" not in quote_header["control_bindings"]


def test_composed_b2b_shell_preserves_account_and_start_navigation_without_cart():
    schema = {
        "active_template": {"id": "b2b-saas-enterprise-pro"},
        "pages": [
            {"page_key": "home", "title": "Home", "order": 1},
            {"page_key": "pricing", "title": "Pricing", "order": 2},
            {"page_key": "login", "title": "Sign in", "order": 3},
        ],
        "catalog_items": [
            {"name": f"Plan {index}", "price": index * 10, "recurring": True}
            for index in range(1, 4)
        ],
    }
    header, _ = section_composition._shared_shell(schema, {"name": "Northstar"})
    assert header["control_bindings"] == {
        "account": {"label": "Sign in", "action": "page", "page_key": "login"},
        "primary_action": {"label": "Start free", "page_key": "pricing"},
    }
    schema["catalog_items"] = []
    header, _ = section_composition._shared_shell(schema, {"name": "Northstar"})
    assert header["control_bindings"]["primary_action"]["page_key"] == "home"


def test_real_mega_retail_composition_places_shared_shell_around_body(monkeypatch):
    schema = {
        "active_template": {"id": "mega-retail-store"},
        "business": {"name": "ElectroHub QA", "selectedLanguage": "en"},
        "pages": [{"page_key": "home", "title": "Home", "order": 1, "sections": [
            {"id": "fixed-hero", "type": "MarketplaceHero", "order": 1},
            {"id": "fixed-catalog", "type": "ProductGrid", "order": 2},
        ]}],
        "catalog_items": [{"name": "Cordless drill", "category": "Tools"}],
    }
    offered = {}

    def compose(_brief, _archetypes, **kwargs):
        offered.update(kwargs)
        return {"sections": [{
            "section_id": "corporate-company-pro--home--corporate-process",
            "copy": {"title": "Our process", "text": "Design and deliver"},
            "image_requests": [],
        }]}

    monkeypatch.setattr(section_composition.section_composer, "compose_layout", compose)
    result, pending = section_composition.prepare_composed_schema(
        schema, "online tools store", sales_mode="online_sales"
    )
    sections = result["pages"][0]["sections"]
    assert [item["section_id"] for item in sections if item["type"] == "composed"] == [
        "shared--header", "corporate-company-pro--home--corporate-process", "shared--footer",
    ]
    assert "hero" in offered["excluded_section_types"]
    assert "catalog" in offered["excluded_section_types"]
    assert sections[-3]["control_bindings"]["cart"] == {"label": "Cart"}
    assert sections[-1]["control_bindings"]["newsletter"]["button_label"] == "Subscribe"
    assert pending == []
    assert schema["pages"][0]["sections"] == [
        {"id": "fixed-hero", "type": "MarketplaceHero", "order": 1},
        {"id": "fixed-catalog", "type": "ProductGrid", "order": 2},
    ]
