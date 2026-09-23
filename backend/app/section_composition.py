from __future__ import annotations

from copy import deepcopy
import re
from typing import Any

from .agents import detect_business_archetypes
from . import image_request_resolver, section_composer


def covered_section_types(schema: dict[str, Any], home: dict[str, Any]) -> set[str]:
    covered = {"quote_upload"}
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


def _positive_price(item: dict[str, Any]) -> bool:
    try:
        return float(item.get("price_amount") if item.get("price_amount") is not None else item.get("price")) > 0
    except (TypeError, ValueError):
        return False


def _shared_shell(schema: dict[str, Any], business: dict[str, Any], sales_mode: str | None = None) -> tuple[dict, dict]:
    pages = sorted(schema["pages"], key=lambda page: page.get("order", 0))
    labels = {
        item["page_key"]: item["label"] for item in schema.get("navigation") or []
        if isinstance(item, dict) and isinstance(item.get("page_key"), str)
        and isinstance(item.get("label"), str) and item["label"].strip()
    }
    navigation = [
        {"label": labels.get(page["page_key"]) or str(page.get("title") or page["page_key"]),
         "page_key": page["page_key"]}
        for page in pages if isinstance(page.get("page_key"), str) and page["page_key"]
    ]
    if not navigation:
        raise ValueError("Composed shell requires at least one page")
    if len(navigation) > 50:
        raise ValueError("Composed shell supports at most 50 pages")
    if (len({item["page_key"] for item in navigation}) != len(navigation)
            or any(not re.fullmatch(r"[a-z0-9][a-z0-9_-]*", item["page_key"], re.IGNORECASE)
                   for item in navigation)):
        raise ValueError("Composed shell requires distinct safe page keys")
    home_key = next((page["page_key"] for page in pages if page["page_key"] == "home"), navigation[0]["page_key"])
    name = str(business.get("name") or "")
    common = {"business.name": name, "home_page_key": home_key}
    language = business.get("selectedLanguage") or "en"
    navigation_label, footer_navigation_label = {
        "es": ("Navegación del sitio", "Enlaces del sitio"),
        "fr": ("Navigation du site", "Liens du site"),
        "pt": ("Navegação do site", "Links do site"),
    }.get(language, ("Site navigation", "Site links"))
    header = {
        "id": "composed-shared-header", "type": "composed", "order": -1,
        "section_id": "shared--header",
        "copy_bindings": {**common, "navigation_label": navigation_label},
        "list_bindings": {"navigation": navigation}, "image_bindings": {},
    }
    footer = {
        "id": "composed-shared-footer", "type": "composed", "order": 1_000_000,
        "section_id": "shared--footer",
        "copy_bindings": {**common, "footer_navigation_label": footer_navigation_label,
                          "footer_text": str((schema.get("global_components") or {}).get("footer_text") or "")},
        "list_bindings": {"navigation": navigation}, "image_bindings": {},
    }
    logo = (schema.get("brand") or {}).get("logoUrl") or (schema.get("global_components") or {}).get("logo_url")
    if isinstance(logo, str) and re.match(
        r"^(?:https?://|/(?!/)|data:image/(?:png|jpeg|webp);base64,[a-z0-9+/]+=*$)", logo, re.I,
    ):
        header["image_bindings"]["brand_logo"] = logo
        footer["image_bindings"]["brand_logo"] = logo
    template_id = (schema.get("active_template") or schema.get("selected_template") or {}).get("id")
    if template_id == "mega-retail-store":
        mode = str(sales_mode if sales_mode is not None else business.get("salesMode") or business.get("salesFlow") or "").lower()
        online = not mode or bool(re.search(r"online|ecommerce|e-commerce|carrito|checkout|tienda|sell", mode))
        labels = {
            "es": ("Buscar productos y departamentos", "Carrito", "Ingresar", "Departamentos",
                   "Recibe las mejores ofertas", "Novedades y promociones directo en tu correo.", "Suscribirse"),
        }.get(language, ("Search products and departments", "Cart", "Sign in", "Departments",
                          "Get the best deals", "New arrivals and special offers in your inbox.", "Subscribe"))
        categories = list(dict.fromkeys(
            str(item.get("category") or "").strip() for item in schema.get("catalog_items") or []
            if isinstance(item, dict) and str(item.get("category") or "").strip()
        ))[:5]
        controls = {}
        if categories:
            controls["departments"] = {"label": labels[3], "items": [
                {"label": category, "category": category} for category in categories
            ]}
        if online:
            controls.update({"search": {"label": labels[0]}, "cart": {"label": labels[1]},
                             "account": {"label": labels[2], "action": "modal"}})
        header["control_bindings"] = controls
        contact = schema.get("contact") or {}
        socials = []
        for key, domain in (("instagram", "instagram.com"), ("facebook", "facebook.com"),
                            ("tiktok", "tiktok.com"), ("twitter", "x.com")):
            raw = str(contact.get(key) or "").strip()
            if raw:
                url = ("https://" + raw[7:]) if raw.startswith("http://") else (
                    raw if raw.startswith("https://") else f"https://{domain}/{raw.lstrip('@')}")
                if re.fullmatch(r"https://[^\s<>\"']+", url):
                    socials.append({"label": key.title(), "url": url})
        features = (schema.get("global_components") or {}).get("mega_retail_features") or {}
        contact_page = next((item["page_key"] for item in navigation if "contact" in item["page_key"].lower()), home_key)
        help_labels = (["Envíos", "Devoluciones", "Contacto", "Preguntas frecuentes"] if language == "es"
                       else ["Shipping", "Returns", "Contact", "Frequently asked questions"])
        extras = {"help_links": [{"label": label, "page_key": contact_page} for label in help_labels]}
        if features.get("socials") is not False and socials:
            extras["social_links"] = socials
        if features.get("newsletter") is not False:
            extras["newsletter"] = {"title": labels[4], "text": labels[5], "button_label": labels[6]}
        footer["control_bindings"] = extras
    elif template_id == "b2b-saas-enterprise-pro":
        controls = {}
        action_labels = {
            "es": ("Iniciar sesión", "Empezar gratis"),
            "fr": ("Se connecter", "Commencer"),
            "pt": ("Entrar", "Começar grátis"),
        }.get(language, ("Sign in", "Start free"))
        login_page = next((item for item in navigation if re.search(
            r"login|sign[ -]?in|account|cuenta|ingresar", item["page_key"] + " " + item["label"], re.I)), None)
        contact_page = next((item for item in navigation if re.search(
            r"contact|demo|consulta", item["page_key"] + " " + item["label"], re.I)), None)
        pricing_page = next((item for item in navigation if re.search(
            r"pricing|price|precio|plan", item["page_key"] + " " + item["label"], re.I)), None)
        if login_page:
            controls["account"] = {"label": action_labels[0],
                                   "action": "page", "page_key": login_page["page_key"]}
        recurring = re.compile(r"^(?:recurring|subscription|monthly|annual|yearly|month|year|mensual|anual|mes|ano)$", re.I)
        recurring_label = re.compile(r"(?:/\s*(?:mo|month|mes|yr|year|ano)|\b(?:per month|per year|monthly|annual|yearly|mensual|anual|cada mes|cada ano)\b)", re.I)
        plans = [item for item in schema.get("catalog_items") or [] if isinstance(item, dict)
                 and item.get("is_active") is not False and item.get("display_in_catalog") is not False
                 and (item.get("recurring") is True or item.get("subscription") is True
                      or any(recurring.fullmatch(str(item.get(key) or "")) for key in
                             ("price_type", "billing_interval", "billing_period", "interval", "cadence"))
                      or recurring_label.search(str(item.get("price_label") or "")))
                 and _positive_price(item)]
        start_page = (pricing_page if len(plans) >= 3 else None) or contact_page or navigation[0]
        controls["primary_action"] = {"label": action_labels[1],
                                      "page_key": start_page["page_key"]}
        header["control_bindings"] = controls
    return header, footer


def ensure_shared_commerce_shell(schema: dict[str, Any], sales_mode: str | None = None) -> dict[str, Any]:
    template_id = (schema.get("active_template") or schema.get("selected_template") or {}).get("id")
    if template_id not in {"mega-retail-store", "b2b-saas-enterprise-pro"}:
        return schema
    home = next((page for page in schema.get("pages", []) if page.get("page_key") == "home"), None)
    if home is None or not isinstance(home.get("sections"), list):
        return schema
    existing = {section.get("section_id") for section in home["sections"] if section.get("type") == "composed"}
    if {"shared--header", "shared--footer"}.issubset(existing):
        return schema
    result = deepcopy(schema)
    home = next(page for page in result["pages"] if page.get("page_key") == "home")
    header, footer = _shared_shell(result, result.get("business") or {}, sales_mode)
    if "shared--header" not in existing:
        home["sections"].append(header)
    if "shared--footer" not in existing:
        home["sections"].append(footer)
    return result


def prepare_composed_schema(
    schema: dict[str, Any], business_text: str, *, sales_mode: str | None = None,
) -> tuple[dict[str, Any], list[dict]]:
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
        excluded_section_types=covered_section_types(result, home) | {"header", "footer"},
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
    header, footer = _shared_shell(result, business, sales_mode)
    existing = {item.get("section_id") for item in home["sections"] if item.get("type") == "composed"}
    if "shared--header" not in existing:
        home["sections"].append(header)
    home["sections"].extend(sections)
    if "shared--footer" not in existing:
        home["sections"].append(footer)
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
