import json
import re

import httpx
from openai import OpenAI

from .ai_intake import _infer_broad_updates, _language, _merge_current_updates
from .config import get_settings
from .schemas import LumaAgentRequest, LumaAgentResponse


REQUIRED_FOR_DRAFT = ["businessName", "businessDescription", "servicesProducts"]
IMPORTANT_FOR_LAUNCH = ["contactInfo"]

TEMPLATE_CATALOG_TYPES = {
    "mega-marketplace": "dense_marketplace_catalog",
    "listing-marketplace-pro": "listing_marketplace_catalog",
    "restaurant-food-business": "restaurant_menu_catalog",
    "booking-appointment-pro": "booking_services_catalog",
    "local-services-pro-plus": "service_quote_catalog",
    "digital-products-store": "digital_product_catalog",
    "fashion-drop-pro": "fashion_collection_catalog",
    "apple-premium-product": "premium_editorial_catalog",
    "corporate-company-pro": "company_services_catalog",
    "legal-professional-services-pro": "professional_services_catalog",
    "medical-wellness-clinic-pro": "medical_services_catalog",
    "b2b-saas-enterprise-pro": "b2b_solution_catalog",
    "manufacturing-industrial-supplier-pro": "industrial_supplier_catalog",
    "education-course-academy-pro": "education_catalog",
    "luxury-high-ticket-pro": "luxury_high_ticket_catalog",
}


def chat_with_luma(payload: LumaAgentRequest) -> LumaAgentResponse:
    selected_language = _language(payload.current.selected_language)
    current_step = payload.current_step_snake or payload.current_step or "websiteIntent"
    current = payload.current.model_dump(by_alias=True)
    local_updates = _clean_local_updates(
        _infer_broad_updates(payload.message or "", selected_language),
        current_step,
    )

    settings = get_settings()
    if not settings.openai_api_key:
        return _fallback_response(payload, current_step, selected_language, local_updates, True)

    client = OpenAI(
        api_key=settings.openai_api_key,
        timeout=30.0,
        max_retries=0,
        http_client=httpx.Client(trust_env=False),
    )
    try:
        response = client.responses.create(
            model=settings.openai_model,
            input=[
                {
                    "role": "system",
                    "content": _system_prompt(selected_language),
                },
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            "current": current,
                            "message": payload.message,
                            "currentStep": current_step,
                            "selectedLanguage": selected_language,
                            "selectedTemplateId": payload.selected_template_id,
                            "sitePlan": payload.site_plan,
                            "hasPreviousSchema": bool(payload.previous_schema),
                            "history": payload.history[-10:],
                            "availableTemplates": list(TEMPLATE_CATALOG_TYPES.keys()),
                        },
                        ensure_ascii=False,
                    ),
                },
            ],
        )
        data = _parse_json(response.output_text)
    except Exception:
        return _fallback_response(payload, current_step, selected_language, local_updates, True)

    updated_fields = _clean_local_updates(
        data.get("updatedFields") or data.get("updates") or {},
        current_step,
    )
    merged_updates = _merge_current_updates(local_updates, updated_fields)
    merged_current = _merge_current_updates(current, merged_updates)
    selected_template_id, template_reason = _choose_template(
        merged_current,
        payload.message,
        data.get("selectedTemplateId") or payload.selected_template_id,
        data.get("selectedTemplateReason") or "",
    )
    missing = _missing_important_fields(merged_current)
    ready = not any(field in missing for field in REQUIRED_FOR_DRAFT)
    next_step = "review" if ready else _next_step(merged_current, current_step)
    next_question = data.get("nextQuestion") or data.get("next_question") or _question_for(selected_language, next_step)
    assistant_message = data.get("assistantMessage") or data.get("message") or _message_for(selected_language, ready)
    catalog_type = TEMPLATE_CATALOG_TYPES.get(selected_template_id, "")
    site_plan = _site_plan_for(selected_template_id, catalog_type, selected_language, merged_current) if selected_template_id else None
    intent = data.get("intent") or ("select_template" if selected_template_id else "collect_info")

    return LumaAgentResponse(
        assistantMessage=assistant_message,
        message=assistant_message,
        emotion=data.get("emotion") or ("success" if ready else "speaking"),
        intent=intent,
        updatedFields=merged_updates,
        updates=merged_updates,
        next_step=next_step,
        nextStep=next_step,
        next_question=next_question,
        nextQuestion=next_question,
        readyToGenerate=ready,
        missingImportantFields=missing,
        confidence=float(data.get("confidence") or 0.82),
        selectedTemplateId=selected_template_id,
        selectedTemplateReason=template_reason,
        catalogType=catalog_type,
        designStrategy=_design_strategy(selected_template_id, catalog_type, template_reason, merged_current),
        sitePlan=site_plan,
        actions=data.get("actions") or [],
        usedDevFallback=False,
    )


def _system_prompt(selected_language: str) -> str:
    return (
        "You are Luma, a senior ecommerce strategist, product designer, and AI website builder. "
        "You are not a form. You behave like ChatGPT in designer mode: understand the business, infer missing fields, "
        "ask one useful question at a time, and decide the correct website/store architecture. "
        f"Respond in selectedLanguage={selected_language}. Keep JSON keys in English. "
        "The user's intake answers are internal strategy notes, never public website copy. Do not paste rough user text into page headlines or paragraphs. "
        "Rewrite everything as polished customer-facing strategy later. "
        "If the user gives many details in one message, extract all fields and only ask what is truly missing. "
        "For broad varied products, unusual mixed items, many categories, marketplace, Amazon-like, or general online store with many categories, select mega-marketplace. "
        "For one hero product, one product line, niche product variants, or premium product storytelling, select apple-premium-product. "
        "For clothing/fashion drops, select fashion-drop-pro. For restaurants/menu, select restaurant-food-business. "
        "For appointments/bookings, select booking-appointment-pro. For services/quotes, select local-services-pro-plus. "
        "For company-only websites with no shopping/catalog need, select corporate-company-pro. "
        "Return JSON only with this shape: assistantMessage, emotion, intent, updatedFields, nextStep, nextQuestion, "
        "readyToGenerate, missingImportantFields, confidence, selectedTemplateId, selectedTemplateReason, catalogType, designStrategy, sitePlan, actions. "
        "updatedFields may include businessName, businessDescription, industry, location, servicesProducts, targetAudience, preferredTone, "
        "preferredColors, contactInfo, salesMode, hasLogo, hasPhotos, hasLogoPhotos, desiredDomain, sectionsPreference. "
        "servicesProducts, preferredColors, photoUrls must be arrays. contactInfo must be an object. "
        "Do not call anything Apple style; if referencing that base, call it Premium Product Showcase."
    )


def _parse_json(text: str) -> dict:
    cleaned = (text or "").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, flags=re.S)
        if match:
            return json.loads(match.group(0))
    return {}


def _clean_local_updates(updates: dict, current_step: str) -> dict:
    cleaned = dict(updates or {})
    contact = cleaned.get("contactInfo")
    if (
        current_step != "contactInfo"
        and isinstance(contact, dict)
        and set(contact.keys()) == {"notes"}
    ):
        cleaned.pop("contactInfo", None)
    return cleaned


def _fallback_response(
    payload: LumaAgentRequest,
    current_step: str,
    selected_language: str,
    local_updates: dict,
    used_dev_fallback: bool,
) -> LumaAgentResponse:
    current = payload.current.model_dump(by_alias=True)
    merged_current = _merge_current_updates(current, local_updates)
    selected_template_id, template_reason = _choose_template(
        merged_current,
        payload.message,
        payload.selected_template_id,
        "",
    )
    catalog_type = TEMPLATE_CATALOG_TYPES.get(selected_template_id, "")
    missing = _missing_important_fields(merged_current)
    ready = not any(field in missing for field in REQUIRED_FOR_DRAFT)
    next_step = "review" if ready else _next_step(merged_current, current_step)
    message = _message_for(selected_language, ready)
    return LumaAgentResponse(
        assistantMessage=message,
        message=message,
        emotion="success" if ready else "speaking",
        intent="select_template" if selected_template_id else "collect_info",
        updatedFields=local_updates,
        updates=local_updates,
        next_step=next_step,
        nextStep=next_step,
        next_question=_question_for(selected_language, next_step),
        nextQuestion=_question_for(selected_language, next_step),
        readyToGenerate=ready,
        missingImportantFields=missing,
        confidence=0.58,
        selectedTemplateId=selected_template_id,
        selectedTemplateReason=template_reason,
        catalogType=catalog_type,
        designStrategy=_design_strategy(selected_template_id, catalog_type, template_reason, merged_current),
        sitePlan=_site_plan_for(selected_template_id, catalog_type, selected_language, merged_current) if selected_template_id else None,
        usedDevFallback=used_dev_fallback,
    )


def _choose_template(current: dict, message: str, ai_template_id: str, ai_reason: str) -> tuple[str, str]:
    text = _normalized_context(current, message)
    deterministic = _infer_template_id(text, current)
    if deterministic:
        return deterministic, _template_reason(deterministic, text)
    if ai_template_id in TEMPLATE_CATALOG_TYPES:
        return ai_template_id, ai_reason or "Selected from AI business interpretation"
    return "", "Waiting for clearer offer/catalog context"


def _infer_template_id(text: str, current: dict) -> str:
    products = _meaningful_products(current.get("servicesProducts") or [])
    if _is_broad_marketplace(text, products):
        return "mega-marketplace"
    if _has_any(text, ["restaurante", "restaurant", "menu", "menú", "comida", "food", "cafe", "cafeteria", "delivery"]):
        return "restaurant-food-business"
    if _has_any(text, ["cita", "reserva", "booking", "appointment", "barber", "barberia", "salon", "spa"]):
        return "booking-appointment-pro"
    if _has_any(text, ["clasificados", "listing", "listados", "ebay", "vendedores", "usado", "seller"]):
        return "listing-marketplace-pro"
    if _has_any(text, ["ropa", "moda", "fashion", "boutique", "streetwear", "zapato", "sneaker", "accesorio"]):
        return "fashion-drop-pro"
    if _has_any(text, ["curso", "academy", "academia", "bootcamp", "training", "clases", "masterclass"]):
        return "education-course-academy-pro"
    if _has_any(text, ["digital", "ebook", "templates", "plantillas", "descarga", "download", "membresia", "membership"]):
        return "digital-products-store"
    if _has_any(text, ["saas", "software", "enterprise", "automatizacion", "platform", "plataforma", "crm", "erp"]):
        return "b2b-saas-enterprise-pro"
    if _has_any(text, ["industrial", "manufactur", "fabrica", "maquinaria", "repuestos", "suministros"]):
        return "manufacturing-industrial-supplier-pro"
    if _has_any(text, ["abogado", "legal", "lawyer", "contador", "tax", "consultoria", "consulting", "seguros"]):
        return "legal-professional-services-pro"
    if _has_any(text, ["clinica", "clinic", "med spa", "wellness", "dental", "doctor", "estetica", "salud", "therapy"]):
        return "medical-wellness-clinic-pro"
    if _is_focused_product(text, products):
        return "apple-premium-product"
    if _has_any(text, ["servicio", "service", "contractor", "limpieza", "repair", "reparacion", "cotizacion", "quote"]):
        return "local-services-pro-plus"
    if _has_any(text, ["empresa", "company", "corporate", "corporativo", "agencia", "firma"]):
        return "corporate-company-pro"
    return ""


def _normalized_context(current: dict, message: str) -> str:
    parts = [
        message,
        current.get("businessName"),
        current.get("businessDescription"),
        current.get("industry"),
        current.get("salesMode"),
        current.get("targetAudience"),
        " ".join(current.get("servicesProducts") or []),
    ]
    return _normalize(" ".join(str(part or "") for part in parts))


def _normalize(value: str) -> str:
    text = (value or "").lower()
    replacements = str.maketrans("áéíóúñ", "aeioun")
    return re.sub(r"\s+", " ", text.translate(replacements)).strip()


def _has_any(text: str, words: list[str]) -> bool:
    return any(word in text for word in words)


def _meaningful_products(values: list[str]) -> list[str]:
    generic = {"online", "internet", "web", "ecommerce", "venta", "ventas", "productos", "products", "servicios", "services", "tienda", "store"}
    return [item for item in values if _normalize(item) not in generic and len(_normalize(item)) > 1]


def _is_broad_marketplace(text: str, products: list[str]) -> bool:
    broad_words = [
        "amazon", "marketplace", "mercado", "de todo", "todo tipo", "variado", "variados", "variedad",
        "muchas categorias", "multi categoria", "multi-categoria", "catalogo amplio", "productos variados",
        "curiosos", "inusual", "inusuales", "nada comun", "accesorios", "ropa", "carros", "juguetes",
    ]
    return len(products) >= 5 or sum(1 for word in broad_words if word in text) >= 2


def _is_focused_product(text: str, products: list[str]) -> bool:
    focused_words = [
        "un solo producto", "solo un producto", "producto unico", "producto estrella", "flagship",
        "single product", "one product", "linea de", "coleccion de", "parachoques", "modelos",
        "producto premium", "showcase", "presentacion premium",
    ]
    return (0 < len(products) <= 2 and not _is_broad_marketplace(text, products)) or _has_any(text, focused_words)


def _missing_important_fields(current: dict) -> list[str]:
    missing = []
    for field in [*REQUIRED_FOR_DRAFT, *IMPORTANT_FOR_LAUNCH]:
        value = current.get(field)
        if value in ("", None, [], {}):
            missing.append(field)
    return missing


def _next_step(current: dict, current_step: str) -> str:
    if not current.get("businessName"):
        return "businessName"
    if not current.get("businessDescription"):
        return "businessDescription"
    if not current.get("servicesProducts"):
        return "servicesProducts"
    if not current.get("contactInfo"):
        return "contactInfo"
    return "review"


def _question_for(language: str, step: str) -> str:
    questions = {
        "en": {
            "businessName": "What should I call the business?",
            "businessDescription": "Tell me what the business sells or does. You can include products, style, city, and contact in one message.",
            "servicesProducts": "What are the main products, categories, or services?",
            "contactInfo": "What contact should the website use: WhatsApp, phone, email, or Instagram?",
            "review": "I have enough to create the first draft. Do you want to add a logo/photos or generate it now?",
        },
        "es": {
            "businessName": "¿Cómo se llama el negocio?",
            "businessDescription": "Cuéntame qué vende o qué hace. Puedes incluir productos, estilo, ciudad y contacto en un solo mensaje.",
            "servicesProducts": "¿Cuáles son los productos, categorías o servicios principales?",
            "contactInfo": "¿Qué contacto debe usar la página: WhatsApp, teléfono, email o Instagram?",
            "review": "Ya tengo suficiente para crear el primer borrador. ¿Quieres subir logo/fotos o generarlo ahora?",
        },
        "fr": {
            "businessName": "Quel est le nom de l'entreprise ?",
            "businessDescription": "Dites-moi ce qu'elle vend ou propose. Vous pouvez inclure produits, style, ville et contact.",
            "servicesProducts": "Quels sont les principaux produits, catégories ou services ?",
            "contactInfo": "Quel contact doit apparaître : WhatsApp, téléphone, email ou Instagram ?",
            "review": "J'ai assez d'informations pour créer le premier brouillon. Voulez-vous ajouter logo/photos ou générer maintenant ?",
        },
        "pt": {
            "businessName": "Qual é o nome do negócio?",
            "businessDescription": "Conte o que ele vende ou faz. Pode incluir produtos, estilo, cidade e contato em uma mensagem.",
            "servicesProducts": "Quais são os principais produtos, categorias ou serviços?",
            "contactInfo": "Qual contato deve aparecer: WhatsApp, telefone, email ou Instagram?",
            "review": "Já tenho o suficiente para criar o primeiro rascunho. Quer enviar logo/fotos ou gerar agora?",
        },
    }
    return questions.get(language, questions["en"]).get(step, questions.get(language, questions["en"])["review"])


def _message_for(language: str, ready: bool) -> str:
    if ready:
        return {
            "en": "Good. I have enough context to choose the right structure and generate a polished editable draft.",
            "es": "Bien. Ya tengo suficiente contexto para elegir la estructura correcta y generar un borrador profesional editable.",
            "fr": "Bien. J'ai assez de contexte pour choisir la bonne structure et générer un brouillon professionnel modifiable.",
            "pt": "Bom. Já tenho contexto suficiente para escolher a estrutura certa e gerar um rascunho profissional editável.",
        }.get(language, "")
    return {
        "en": "Got it. I updated the build context.",
        "es": "Entendido. Actualicé el contexto de construcción.",
        "fr": "Compris. J'ai mis à jour le contexte de création.",
        "pt": "Entendido. Atualizei o contexto de construção.",
    }.get(language, "Got it.")


def _template_reason(template_id: str, text: str) -> str:
    if template_id == "mega-marketplace":
        return "Broad or varied catalog detected; using search-first marketplace architecture."
    if template_id == "apple-premium-product":
        return "Focused product line detected; using premium product-story architecture."
    return "Selected from business type and offer context."


def _design_strategy(template_id: str, catalog_type: str, reason: str, current: dict) -> dict:
    return {
        "designerMode": True,
        "selectedTemplateId": template_id,
        "selectedCatalogType": catalog_type,
        "selectedTemplateReason": reason,
        "templateUsePolicy": "Use this as reference architecture only; adapt copy, sections, products, CTAs, colors and layout to the business.",
        "publicCopyPolicy": "Never paste intake answers verbatim. Rewrite as polished customer-facing copy.",
        "catalogComplexity": "broad_multi_category_catalog" if template_id == "mega-marketplace" else "focused_or_standard_catalog",
        "businessSignal": {
            "industry": current.get("industry") or "",
            "salesMode": current.get("salesMode") or "",
            "offerCount": len(current.get("servicesProducts") or []),
        },
    }


def _site_plan_for(template_id: str, catalog_type: str, language: str, current: dict) -> dict:
    pages_by_template = {
        "mega-marketplace": ["Home", "Catalog", "Deals", "Categories", "Contact"],
        "apple-premium-product": ["Home", "Product", "Details", "Story", "Buy"],
        "fashion-drop-pro": ["Home", "Collections", "Lookbook", "Shop", "Contact"],
        "restaurant-food-business": ["Home", "Menu", "Specials", "Location", "Order"],
        "booking-appointment-pro": ["Home", "Services", "Availability", "Booking", "Contact"],
        "corporate-company-pro": ["Home", "Services", "About", "Proof", "Contact"],
    }
    pages = pages_by_template.get(template_id, ["Home", "Catalog", "About", "Contact"])
    return {
        "templateId": template_id,
        "catalogType": catalog_type,
        "templateName": template_id.replace("-", " ").title(),
        "strategy": _template_reason(template_id, ""),
        "pages": [
            {
                "key": re.sub(r"[^a-z0-9]+", "-", page.lower()).strip("-"),
                "title": page,
                "purpose": "Editable page generated from the selected structure.",
            }
            for page in pages
        ],
        "language": language,
        "businessName": current.get("businessName") or "",
    }
