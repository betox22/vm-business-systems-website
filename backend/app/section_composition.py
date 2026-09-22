from __future__ import annotations

from copy import deepcopy
from typing import Any

from .agents import detect_business_archetypes
from . import image_request_resolver, section_composer


def covered_section_types(schema: dict[str, Any], home: dict[str, Any]) -> set[str]:
    covered = {"quote_upload", "header", "footer"}
    for section in home["sections"]:
        section_type = section.get("type") or ""
        if section_type == "Hero" or section_type.endswith("Hero"):
            covered.add("hero")
        elif section_type in {
            "ProductGrid", "ServiceList", "IndustrialSpecCatalog", "CorporateServices",
            "RestaurantSignatureMenu", "HomeServiceCategories", "BookingServices",
            "DigitalBundle", "LuxuryCollection", "AcademyPrograms", "ClinicServices",
            "ProfessionalPracticeAreas", "EnterpriseSolutions", "ListingFeatured",
            "FunnelOffer",
        }:
            covered.add("catalog")
        elif section_type == "Contact" or section_type.endswith("Contact"):
            covered.add("contact")
        elif section_type == "About":
            covered.add("about")
        elif section_type == "FeatureBand" or section_type == "FeatureShowcase":
            covered.add("feature")
        elif section_type == "Gallery" or section_type.endswith("Gallery"):
            covered.add("gallery")
        elif section_type.endswith("Process"):
            covered.add("process")
        elif section_type.endswith("FAQ"):
            covered.add("faq")
    template_id = (schema.get("active_template") or schema.get("selected_template") or {}).get("id")
    if template_id == "mega-retail-store":
        covered.update({"hero", "catalog"})
    elif template_id == "b2b-saas-enterprise-pro":
        covered.update({"hero", "catalog", "feature"})
    return covered


def _bindings(requests: list[dict], results: list[dict]) -> dict[str, str]:
    expected = {request["slot_id"]: request["image_role"] for request in requests}
    if len(expected) != len(requests) or len(results) != len(requests):
        raise ValueError("Image resolution did not match the requested slots")
    bindings: dict[str, str] = {}
    for result in results:
        slot_id = result.get("slot_id")
        url = result.get("asset_url")
        if (slot_id not in expected or slot_id in bindings
                or result.get("image_role") != expected[slot_id]
                or not isinstance(url, str)
                or not (url.startswith(("https://", "http://")) or url.startswith("/") and not url.startswith("//"))):
            raise ValueError("Image resolution returned an invalid asset")
        bindings[slot_id] = url
    return bindings


def prepare_composed_schema(schema: dict[str, Any], business_text: str) -> tuple[dict[str, Any], list[dict]]:
    result = deepcopy(schema)
    business = result.get("business") or {}
    products = result.get("catalog_items") or []
    home = next((page for page in result.get("pages", []) if page.get("page_key") == "home"), None)
    if home is None or not isinstance(home.get("sections"), list):
        raise ValueError("Composed layout requires a home page")
    brief = {
        "business": {key: business.get(key) for key in ("name", "description", "industry", "tone", "selectedLanguage")},
        "products": [
            {key: product.get(key) for key in ("name", "description", "category")}
            for product in products[:12] if isinstance(product, dict)
        ],
    }
    layout = section_composer.compose_layout(
        brief,
        detect_business_archetypes(business_text),
        excluded_section_types=covered_section_types(result, home),
        require_complete_bindings=True,
    )
    sections = []
    pending = []
    starting_order = max((int(section.get("order") or 0) for section in home["sections"]), default=0)
    for index, selected in enumerate(layout["sections"], start=1):
        section_id = selected["section_id"]
        requests = selected["image_requests"]
        immediate = [request for request in requests if request["image_role"] != "texture_atmosphere"]
        deferred = [request for request in requests if request["image_role"] == "texture_atmosphere"]
        resolved = image_request_resolver.resolve_image_requests(immediate, {"industry": business.get("industry") or ""}) if immediate else []
        bindings = _bindings(immediate, resolved)
        sections.append({
            "id": f"composed-{index}-{section_id}",
            "type": "composed",
            "order": starting_order + index,
            "section_id": section_id,
            "copy_bindings": dict(selected["copy"]),
            "image_bindings": bindings,
        })
        pending.extend({"section_id": section_id, **request} for request in deferred)
    home["sections"].extend(sections)
    return result, pending


def resolve_deferred_textures(
    schema: dict[str, Any], pending: list[dict], *, business_id: str, site_id: str,
) -> dict[str, Any]:
    result = deepcopy(schema)
    business = result.get("business") or {}
    sections = {
        section["section_id"]: section
        for page in result.get("pages", [])
        for section in page.get("sections", [])
        if section.get("type") == "composed"
    }
    for section_id in dict.fromkeys(item["section_id"] for item in pending):
        section = sections.get(section_id)
        if section is None:
            raise ValueError("Deferred section is missing")
        requests = [
            {key: item[key] for key in ("slot_id", "image_role", "category")}
            for item in pending if item["section_id"] == section_id
        ]
        resolved = image_request_resolver.resolve_image_requests(requests, {
            "business_id": business_id,
            "site_id": site_id,
            "industry": business.get("industry") or "",
        })
        section["image_bindings"].update(_bindings(requests, resolved))
    return result
