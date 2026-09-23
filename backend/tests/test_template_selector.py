import asyncio
import json
from types import SimpleNamespace

import pytest

from app import template_selector
from app.agents import StrategyAgent, TEMPLATE_CATALOG, normalize_text
from app.models import ProjectState


@pytest.fixture
def boutique_coffee():
    products = [
        f"Cafe de especialidad {origin} {weight}"
        for origin in ("Colombia", "Etiopia", "Guatemala")
        for weight in ("250 g", "500 g", "1 kg", "pack")
    ]
    return ProjectState(
        businessName="Origen Cafe",
        businessDescription="Cafeteria boutique de cafe de especialidad de una sola linea, con variantes de origen y peso.",
        industry="coffee",
        servicesProducts=products,
        preferredTone="premium and personal",
        preferredColors="espresso and ivory",
    )


@pytest.fixture
def broad_retail():
    return ProjectState(
        businessName="Mercado Central",
        businessDescription="Tienda de un solo vendedor con categorias independientes de ropa, electronica y hogar.",
        industry="retail",
        servicesProducts=["Ropa", "Electronica", "Hogar"],
    )


@pytest.fixture
def hybrid_wholesale():
    return ProjectState(
        businessName="Casa Te",
        businessDescription="Marca de te con venta directa y programas de mayoreo y marca privada.",
        industry="tea",
        servicesProducts=["Te verde", "Te negro", "Te oolong"],
        salesFlow="online_sales",
        salesMode="Quiero vender online, recibir solicitudes de cotizacion al mayor y ofrecer rebranding para otras marcas.",
    )


@pytest.fixture
def ambiguous_business():
    return ProjectState(
        businessName="Norte Concept",
        businessDescription="Tienda concepto con cafe, regalos y objetos para el hogar; el catalogo final aun no esta definido.",
        industry="retail",
        servicesProducts=["Cafe", "Tazas", "Regalos"],
    )


@pytest.fixture
def openai_reply(monkeypatch):
    calls = []

    def set_reply(template_id, reasoning="Fits the business model"):
        class Client:
            def __init__(self, **kwargs):
                calls.append({"client": kwargs})
                self.chat = SimpleNamespace(completions=SimpleNamespace(create=self.create))

            def create(self, **kwargs):
                calls.append({"request": kwargs})
                return SimpleNamespace(choices=[SimpleNamespace(
                    finish_reason="stop",
                    message=SimpleNamespace(
                        content=json.dumps({"template_id": template_id, "reasoning": reasoning}),
                        refusal=None,
                        tool_calls=None,
                        function_call=None,
                    ),
                )])

        monkeypatch.setenv("OPENAI_API_KEY", "test-only-key")
        monkeypatch.setattr(template_selector.agents, "OpenAI", Client)
        return calls

    return set_reply


def test_boutique_coffee_variants_select_focused_template(boutique_coffee, openai_reply, monkeypatch):
    calls = openai_reply("premium-product-store", "Twelve SKUs are variants of one coffee line")
    monkeypatch.setenv("OPENAI_TEMPLATE_SELECTOR_MODEL", "selector-test-model")
    boutique_coffee.runtimeAvailableTemplateIds = ["premium-product-store", "mega-retail-store"]

    result = asyncio.run(StrategyAgent().run(boutique_coffee, boutique_coffee.businessDescription))

    assert result.updates["selectedTemplateId"] == "premium-product-store"
    assert calls[0]["client"]["timeout"] == template_selector.agents.OPENAI_CLASSIFICATION_TIMEOUT_SECONDS
    request = calls[-1]["request"]
    assert request["model"] == "selector-test-model"
    assert request["response_format"]["type"] == "json_schema"
    assert request["response_format"]["json_schema"]["strict"] is True
    assert request["response_format"]["json_schema"]["schema"]["properties"]["template_id"]["enum"] == [
        "mega-retail-store", "premium-product-store"
    ]
    brief = json.loads(request["messages"][1]["content"])["business_brief"]
    assert brief == {
        "businessName": "Origen Cafe",
        "businessDescription": boutique_coffee.businessDescription,
        "industry": "coffee",
        "servicesProducts": boutique_coffee.servicesProducts,
        "preferredTone": "premium and personal",
        "preferredColors": "espresso and ivory",
        "salesMode": "",
        "productCount": 12,
    }
    assert "variants of ONE product family" in request["messages"][0]["content"]
    assert "untrusted data" in request["messages"][0]["content"]


def test_distinct_categories_select_mega_retail(broad_retail, openai_reply):
    openai_reply("mega-retail-store", "Three distinct retail categories")

    result = asyncio.run(StrategyAgent().run(broad_retail, broad_retail.businessDescription))

    assert result.updates["selectedTemplateId"] == "mega-retail-store"
    assert "Three distinct retail categories" in result.reasoningSummary


def test_hybrid_sales_mode_keeps_wholesale_and_private_label_in_selector(hybrid_wholesale, openai_reply):
    calls = openai_reply("corporate-company-pro", "Wholesale quote and private-label inquiry are the dominant first-version journey")
    hybrid_wholesale.runtimeAvailableTemplateIds = ["mega-retail-store", "corporate-company-pro"]

    result = asyncio.run(StrategyAgent().run(hybrid_wholesale, hybrid_wholesale.businessDescription))

    assert result.updates["selectedTemplateId"] == "corporate-company-pro"
    request = calls[-1]["request"]
    brief = json.loads(request["messages"][1]["content"])["business_brief"]
    assert brief["salesMode"] == hybrid_wholesale.salesMode
    assert brief["productCount"] == 3
    prompt = request["messages"][0]["content"]
    assert "salesMode as the primary signal" in prompt
    assert "dominant model for the first site version" in prompt
    assert "wholesale" in prompt
    assert "private-label" in prompt
    assert request["response_format"]["json_schema"]["schema"]["properties"]["template_id"]["enum"] == [
        "mega-retail-store", "corporate-company-pro"
    ]


def test_api_failure_uses_unchanged_legacy_selector(ambiguous_business, monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-only-key")

    def fail(*args, **kwargs):
        raise RuntimeError("provider unavailable")

    monkeypatch.setattr(template_selector, "select_template", fail)
    expected = StrategyAgent()._select_template_id(
        normalize_text(" ".join([
            ambiguous_business.businessDescription,
            ambiguous_business.businessDescription,
            ambiguous_business.industry,
            " ".join(ambiguous_business.servicesProducts),
        ])),
        len(ambiguous_business.servicesProducts),
        None,
        {template_id: TEMPLATE_CATALOG[template_id] for template_id in TEMPLATE_CATALOG},
    )[0]

    result = asyncio.run(StrategyAgent().run(ambiguous_business, ambiguous_business.businessDescription))

    assert result.updates["selectedTemplateId"] == expected


def test_selector_rejects_id_outside_active_catalog(openai_reply):
    openai_reply("mega-retail-store")

    with pytest.raises(ValueError, match="inactive template_id"):
        template_selector.select_template(
            {"businessName": "Origen Cafe", "productCount": 12},
            {"premium-product-store": TEMPLATE_CATALOG["premium-product-store"]},
        )


def test_invalid_model_id_falls_back_to_legacy_selector(boutique_coffee, openai_reply):
    openai_reply("not-a-template")
    expected = StrategyAgent()._select_template_id(
        normalize_text(" ".join([
            boutique_coffee.businessDescription,
            boutique_coffee.businessDescription,
            boutique_coffee.industry,
            " ".join(boutique_coffee.servicesProducts),
            boutique_coffee.preferredTone,
            boutique_coffee.preferredColors,
        ])),
        len(boutique_coffee.servicesProducts),
        None,
    )[0]

    result = asyncio.run(StrategyAgent().run(boutique_coffee, boutique_coffee.businessDescription))

    assert result.updates["selectedTemplateId"] == expected


def test_catalog_rows_determine_product_count(boutique_coffee, openai_reply):
    calls = openai_reply("premium-product-store")
    boutique_coffee.catalogItems = [{"name": "Cafe Colombia"}, {"name": "Cafe Etiopia"}]

    asyncio.run(StrategyAgent().run(boutique_coffee, boutique_coffee.businessDescription))

    brief = json.loads(calls[-1]["request"]["messages"][1]["content"])["business_brief"]
    assert brief["productCount"] == 2


def test_planner_choice_remains_authoritative_without_selector_call(monkeypatch, broad_retail):
    def fail(*args, **kwargs):
        raise AssertionError("selector should not run for authoritative planner choice")

    monkeypatch.setattr(template_selector, "select_template", fail)
    broad_retail.primaryOfferingCategory = "fashion-drop-pro"

    result = asyncio.run(StrategyAgent().run(broad_retail, broad_retail.businessDescription))

    assert result.updates["selectedTemplateId"] == "fashion-drop-pro"


def test_missing_api_key_uses_legacy_selector(monkeypatch, broad_retail):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    expected = StrategyAgent()._select_template_id(
        normalize_text(" ".join([
            broad_retail.businessDescription,
            broad_retail.businessDescription,
            broad_retail.industry,
            " ".join(broad_retail.servicesProducts),
        ])),
        len(broad_retail.servicesProducts),
        None,
    )[0]

    result = asyncio.run(StrategyAgent().run(broad_retail, broad_retail.businessDescription))

    assert result.updates["selectedTemplateId"] == expected
