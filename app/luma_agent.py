import json
import re

import httpx
from openai import OpenAI

from .ai_intake import _infer_broad_updates, _language, _merge_current_updates
from .config import get_settings
from .schemas import LumaAgentRequest, LumaAgentResponse


REQUIRED_FOR_DRAFT = ["businessName", "businessDescription", "servicesProducts", "preferredColors"]
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
        payload.message,
    )

    if _can_answer_intake_locally(payload, current, local_updates):
        return _fallback_response(payload, current_step, selected_language, local_updates, False)

    settings = get_settings()
    if not settings.openai_api_key:
        return _fallback_response(payload, current_step, selected_language, local_updates, True)

    client = OpenAI(
        api_key=settings.openai_api_key,
        timeout=settings.openai_chat_timeout,
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
        payload.message,
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
    catalog_type = TEMPLATE_CATALOG_TYPES.get(selected_template_id, "")
    analysis = _analyze_business_context(merged_current, payload.message, selected_template_id, catalog_type, missing, ready)
    next_question = _contextual_question(selected_language, next_step, analysis, merged_current)
    assistant_message = _contextual_message(selected_language, ready, analysis, selected_template_id)
    site_plan = _site_plan_for(selected_template_id, catalog_type, selected_language, merged_current) if selected_template_id else None
    intent = data.get("intent") or ("select_template" if selected_template_id else "collect_info")

    return LumaAgentResponse(
        assistantMessage=assistant_message,
        message=assistant_message,
        emotion=_normalize_emotion(data.get("emotion"), ready),
        intent=intent,
        updatedFields=merged_updates,
        updates=merged_updates,
        next_step=next_step,
        nextStep=next_step,
        next_question=next_question,
        nextQuestion=next_question,
        readyToGenerate=ready,
        missingImportantFields=missing,
        confidence=float(data.get("confidence") or analysis.get("confidence") or 0.82),
        selectedTemplateId=selected_template_id,
        selectedTemplateReason=template_reason,
        catalogType=catalog_type,
        designStrategy=_design_strategy(selected_template_id, catalog_type, template_reason, merged_current, analysis),
        sitePlan=site_plan,
        actions=_normalize_actions(data.get("actions") or []),
        usedDevFallback=False,
    )


def _system_prompt(selected_language: str) -> str:
    return (
        "You are Luma, a senior ecommerce strategist, product designer, and AI website builder. "
        "You are not a form. You behave like ChatGPT in designer mode: understand the business, infer missing fields, "
        "ask one useful question at a time, and decide the correct website/store architecture. "
        f"Respond in selectedLanguage={selected_language}. Keep JSON keys in English. "
        "Start from a neutral standard discovery mode. Do not choose a final template from generic phrases like "
        "'online store', 'sell products online', 'website', or 'catalog' alone. First understand the actual offer, "
        "catalog breadth, audience, and brand direction. "
        "The user's intake answers are internal strategy notes, never public website copy. Do not paste rough user text into page headlines or paragraphs. "
        "Rewrite everything as polished customer-facing strategy later. "
        "If the user gives many details in one message, extract all fields and only ask what is truly missing. "
        "Before readyToGenerate=true, make sure you have brand direction: either preferredColors, a logo/photo note, "
        "or an explicit 'let AI decide'. If missing, ask for logo/colors/style instead of generating. "
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


def _can_answer_intake_locally(payload: LumaAgentRequest, current: dict, local_updates: dict) -> bool:
    if payload.previous_schema:
        return False
    message = _normalize(payload.message or "")
    if not message:
        return True
    complex_change_words = [
        "cambia solo",
        "modifica solo",
        "replace",
        "change only",
        "make it more",
        "hazlo mas",
        "rediseña",
        "redesign",
        "copy",
        "texto",
        "section",
        "seccion",
    ]
    if _has_any(message, complex_change_words):
        return False
    if local_updates:
        return True
    if _infer_template_id(_normalized_context(current, payload.message), current):
        return True
    return (payload.current_step_snake or payload.current_step) in {
        "websiteIntent",
        "businessName",
        "businessDescription",
        "servicesProducts",
        "preferredColors",
        "contactInfo",
        "salesMode",
    }


def _clean_local_updates(updates: dict, current_step: str, message: str = "") -> dict:
    cleaned = dict(updates or {})
    contact = cleaned.get("contactInfo")
    if (
        current_step != "contactInfo"
        and isinstance(contact, dict)
        and set(contact.keys()) == {"notes"}
    ):
        cleaned.pop("contactInfo", None)
    if current_step != "preferredColors" and not _message_mentions_brand_direction(message):
        cleaned.pop("preferredColors", None)
    if not _message_mentions_assets(message):
        cleaned.pop("hasLogo", None)
        cleaned.pop("hasPhotos", None)
        cleaned.pop("hasLogoPhotos", None)
    return cleaned


def _normalize_emotion(value: str | None, ready: bool = False) -> str:
    allowed = {"neutral", "happy", "thinking", "listening", "speaking", "alert", "success"}
    normalized = (value or "").strip().lower()
    if normalized in allowed:
        return normalized
    if normalized in {"enthusiastic", "excited", "celebrating", "confident"}:
        return "success" if ready else "happy"
    if normalized in {"warning", "concerned", "confused", "error"}:
        return "alert"
    return "success" if ready else "speaking"


def _normalize_actions(actions: list) -> list[dict]:
    normalized = []
    for index, action in enumerate(actions or []):
        if isinstance(action, dict):
            normalized.append(action)
        elif action:
            normalized.append({"type": "suggestion", "label": str(action), "order": index})
    return normalized


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
    analysis = _analyze_business_context(merged_current, payload.message, selected_template_id, catalog_type, missing, ready)
    message = _contextual_message(selected_language, ready, analysis, selected_template_id)
    next_question = _contextual_question(selected_language, next_step, analysis, merged_current)
    return LumaAgentResponse(
        assistantMessage=message,
        message=message,
        emotion="success" if ready else "speaking",
        intent="select_template" if selected_template_id else "collect_info",
        updatedFields=local_updates,
        updates=local_updates,
        next_step=next_step,
        nextStep=next_step,
        next_question=next_question,
        nextQuestion=next_question,
        readyToGenerate=ready,
        missingImportantFields=missing,
        confidence=analysis.get("confidence") if not used_dev_fallback else 0.58,
        selectedTemplateId=selected_template_id,
        selectedTemplateReason=template_reason,
        catalogType=catalog_type,
        designStrategy=_design_strategy(selected_template_id, catalog_type, template_reason, merged_current, analysis),
        sitePlan=_site_plan_for(selected_template_id, catalog_type, selected_language, merged_current) if selected_template_id else None,
        usedDevFallback=used_dev_fallback,
    )


def _choose_template(current: dict, message: str, ai_template_id: str, ai_reason: str) -> tuple[str, str]:
    text = _normalized_context(current, message)
    deterministic = _infer_template_id(text, current)
    if deterministic:
        return deterministic, _template_reason(deterministic, text)
    if ai_template_id in TEMPLATE_CATALOG_TYPES and _has_structural_evidence(text, current):
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
    return _has_any(text, focused_words)


def _message_mentions_brand_direction(message: str) -> bool:
    text = _normalize(message)
    brand_words = [
        "color", "colores", "palette", "paleta", "logo", "brand", "marca", "style", "estilo",
        "minimal", "premium", "elegante", "moderno", "futurista", "cyberpunk", "neon", "pastel",
        "lujo", "ai decide", "ia decida", "que la ia decida", "let ai decide",
    ]
    hex_color = re.search(r"#[0-9a-f]{3,8}\b", text)
    return bool(hex_color) or _has_any(text, brand_words)


def _message_mentions_assets(message: str) -> bool:
    text = _normalize(message)
    return _has_any(text, ["logo", "foto", "fotos", "photo", "photos", "imagen", "imagenes", "image", "images"])


def _has_structural_evidence(text: str, current: dict) -> bool:
    products = _meaningful_products(current.get("servicesProducts") or [])
    if products:
        return True
    if len(_normalize(current.get("businessDescription") or "")) >= 40:
        return True
    structural_words = [
        "marketplace", "catalogo", "catalog", "restaurante", "restaurant", "booking", "reserva",
        "servicio", "service", "empresa", "company", "curso", "academy", "digital", "fashion",
        "ropa", "moda", "parachoques", "repuestos", "software", "clinica", "legal",
    ]
    return _has_any(text, structural_words)


def _missing_important_fields(current: dict) -> list[str]:
    missing = []
    for field in [*REQUIRED_FOR_DRAFT, *IMPORTANT_FOR_LAUNCH]:
        value = current.get(field)
        if field == "preferredColors":
            if not _has_brand_direction(current):
                missing.append(field)
            continue
        if value in ("", None, [], {}):
            missing.append(field)
    return missing


def _has_brand_direction(current: dict) -> bool:
    colors = current.get("preferredColors") or []
    if isinstance(colors, str):
        colors = [colors] if colors.strip() else []
    if colors:
        return True
    if current.get("logoUrl") or current.get("hasLogo") or current.get("hasPhotos") or current.get("hasLogoPhotos"):
        return True
    text = _normalize(" ".join(str(current.get(key) or "") for key in ["preferredTone", "businessDescription", "industry"]))
    return _has_any(text, ["ai decide", "ia decida", "que la ia decida", "let ai decide", "minimal", "premium", "elegante", "moderno", "futurista", "cyberpunk", "neon", "pastel", "lujo"])


def _next_step(current: dict, current_step: str) -> str:
    if not current.get("businessName"):
        return "businessName"
    if not current.get("businessDescription"):
        return "businessDescription"
    if not current.get("servicesProducts"):
        return "servicesProducts"
    if not _has_brand_direction(current):
        return "preferredColors"
    if not current.get("contactInfo"):
        return "contactInfo"
    return "review"


def _question_for(language: str, step: str) -> str:
    questions = {
        "en": {
            "businessName": "What should I call the business?",
            "businessDescription": "Tell me what the business sells or does. You can include products, style, city, and contact in one message.",
            "servicesProducts": "What are the main products, categories, or services?",
            "preferredColors": "Do you have a logo, brand colors, or a style direction? You can also say: let AI decide.",
            "contactInfo": "What contact should the website use: WhatsApp, phone, email, or Instagram?",
            "review": "I have enough to create the first draft. Do you want to add a logo/photos or generate it now?",
        },
        "es": {
            "businessName": "¿Cómo se llama el negocio?",
            "businessDescription": "Cuéntame qué vende o qué hace. Puedes incluir productos, estilo, ciudad y contacto en un solo mensaje.",
            "servicesProducts": "¿Cuáles son los productos, categorías o servicios principales?",
            "preferredColors": "¿Tienes logo, colores de marca o una dirección de estilo? También puedes decir: que la IA decida.",
            "contactInfo": "¿Qué contacto debe usar la página: WhatsApp, teléfono, email o Instagram?",
            "review": "Ya tengo suficiente para crear el primer borrador. ¿Quieres subir logo/fotos o generarlo ahora?",
        },
        "fr": {
            "businessName": "Quel est le nom de l'entreprise ?",
            "businessDescription": "Dites-moi ce qu'elle vend ou propose. Vous pouvez inclure produits, style, ville et contact.",
            "servicesProducts": "Quels sont les principaux produits, catégories ou services ?",
            "preferredColors": "Avez-vous un logo, des couleurs de marque ou une direction de style ? Vous pouvez aussi dire : laisser l'IA décider.",
            "contactInfo": "Quel contact doit apparaître : WhatsApp, téléphone, email ou Instagram ?",
            "review": "J'ai assez d'informations pour créer le premier brouillon. Voulez-vous ajouter logo/photos ou générer maintenant ?",
        },
        "pt": {
            "businessName": "Qual é o nome do negócio?",
            "businessDescription": "Conte o que ele vende ou faz. Pode incluir produtos, estilo, cidade e contato em uma mensagem.",
            "servicesProducts": "Quais são os principais produtos, categorias ou serviços?",
            "preferredColors": "Você tem logo, cores da marca ou uma direção de estilo? Também pode dizer: deixar a IA decidir.",
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


def _analyze_business_context(
    current: dict,
    message: str,
    template_id: str,
    catalog_type: str,
    missing: list[str],
    ready: bool,
) -> dict:
    text = _normalized_context(current, message)
    products = _meaningful_products(current.get("servicesProducts") or [])
    broad_score = sum(
        1
        for word in [
            "amazon",
            "marketplace",
            "de todo",
            "todo tipo",
            "variado",
            "variedad",
            "muchas categorias",
            "multi categoria",
            "catalogo amplio",
            "raros",
            "inusual",
            "accesorios",
            "ropa",
            "carros",
            "juguetes",
        ]
        if word in text
    ) + max(0, len(products) - 2)
    focused_score = sum(
        1
        for word in [
            "un solo producto",
            "producto estrella",
            "linea de",
            "coleccion de",
            "parachoques",
            "modelos",
            "premium",
            "showcase",
        ]
        if word in text
    )
    service_score = sum(1 for word in ["servicio", "service", "cita", "reserva", "booking", "quote", "cotizacion"] if word in text)

    if template_id == "mega-marketplace" or broad_score >= 2:
        catalog_breadth = "broad_multi_category"
    elif template_id == "apple-premium-product" or focused_score >= 1:
        catalog_breadth = "focused_product_line"
    elif service_score >= 1:
        catalog_breadth = "service_or_booking"
    elif products:
        catalog_breadth = "standard_catalog"
    else:
        catalog_breadth = "unknown"

    core_missing = any(field in missing for field in ["businessName", "businessDescription", "servicesProducts"])
    if ready:
        decision_state = "ready_to_generate"
    elif core_missing:
        decision_state = "needs_business_context"
    elif "preferredColors" in missing:
        decision_state = "needs_brand_direction"
    else:
        decision_state = "needs_business_context"
    signals = []
    if broad_score:
        signals.append("broad_catalog_signals")
    if focused_score:
        signals.append("focused_product_signals")
    if _has_brand_direction(current):
        signals.append("brand_direction_present")
    if current.get("businessName"):
        signals.append("business_name_present")
    if products:
        signals.append("products_or_services_present")

    confidence = 0.55
    if template_id:
        confidence += 0.18
    if catalog_breadth != "unknown":
        confidence += 0.12
    if _has_brand_direction(current):
        confidence += 0.08
    if current.get("businessDescription"):
        confidence += 0.07

    return {
        "decisionState": decision_state,
        "catalogBreadth": catalog_breadth,
        "catalogSignals": signals,
        "recommendedTemplateId": template_id,
        "recommendedCatalogType": catalog_type,
        "missingBeforeDraft": missing,
        "confidence": round(min(confidence, 0.94), 2),
        "reasoningSummary": _reasoning_summary(catalog_breadth, template_id, decision_state),
    }


def _reasoning_summary(catalog_breadth: str, template_id: str, decision_state: str) -> str:
    if decision_state == "needs_brand_direction":
        return "Luma has enough offer context to choose structure, but needs visual direction before drafting."
    if catalog_breadth == "broad_multi_category":
        return "The offer looks like a broad catalog, so Luma should use a marketplace/search-first structure."
    if catalog_breadth == "focused_product_line":
        return "The offer looks focused, so Luma should use a premium product-story structure."
    if template_id:
        return "Luma selected a structure from the business type and offer context."
    return "Luma needs more business context before choosing a final structure."


def _contextual_message(language: str, ready: bool, analysis: dict, template_id: str) -> str:
    catalog_breadth = analysis.get("catalogBreadth")
    decision_state = analysis.get("decisionState")
    if ready:
        messages = {
            "en": "I have enough context now. I will use the selected structure as the base and rewrite the copy professionally instead of pasting your notes.",
            "es": "Ya tengo suficiente contexto. Voy a usar la estructura seleccionada como base y redactar la página de forma profesional, sin copiar tus notas tal cual.",
            "fr": "J'ai assez de contexte. Je vais utiliser la structure choisie comme base et rédiger le site de façon professionnelle, sans copier vos notes.",
            "pt": "Já tenho contexto suficiente. Vou usar a estrutura selecionada como base e escrever a página de forma profissional, sem copiar suas notas literalmente.",
        }
        return messages.get(language, messages["en"])
    if decision_state == "needs_brand_direction":
        messages = {
            "en": "I understand the business model and the right structure. Now I need visual direction so the draft does not feel random.",
            "es": "Ya entiendo el tipo de negocio y la estructura correcta. Ahora necesito dirección visual para que el borrador no salga al azar.",
            "fr": "Je comprends le modèle et la bonne structure. Il me faut maintenant une direction visuelle pour éviter un brouillon au hasard.",
            "pt": "Já entendi o tipo de negócio e a estrutura certa. Agora preciso de direção visual para o rascunho não parecer aleatório.",
        }
        return messages.get(language, messages["en"])
    if catalog_breadth == "broad_multi_category" and template_id == "mega-marketplace":
        messages = {
            "en": "This sounds like a broad catalog, so I am treating it as a marketplace-style store instead of a single-product page.",
            "es": "Esto suena como un catálogo amplio, así que lo estoy tratando como una tienda tipo marketplace, no como una página de un solo producto.",
            "fr": "Cela ressemble à un catalogue large, donc je le traite comme une boutique type marketplace, pas comme une page produit unique.",
            "pt": "Isso parece um catálogo amplo, então estou tratando como uma loja estilo marketplace, não como uma página de produto único.",
        }
        return messages.get(language, messages["en"])
    return _message_for(language, ready)


def _contextual_question(language: str, step: str, analysis: dict, current: dict) -> str:
    if step == "preferredColors":
        questions = {
            "en": "Do you have a logo, brand colors, or a style direction? You can say exact colors, describe the vibe, upload a logo later, or tell me to let AI decide.",
            "es": "¿Tienes logo, colores de marca o una dirección de estilo? Puedes decir colores exactos, describir el estilo, subir logo después o decirme que la IA decida.",
            "fr": "Avez-vous un logo, des couleurs de marque ou une direction de style ? Vous pouvez donner des couleurs, décrire le style, ajouter un logo plus tard ou laisser l'IA décider.",
            "pt": "Você tem logo, cores da marca ou uma direção de estilo? Pode dizer cores exatas, descrever o estilo, enviar logo depois ou pedir para a IA decidir.",
        }
        return questions.get(language, questions["en"])
    if step == "servicesProducts" and analysis.get("catalogBreadth") == "unknown":
        questions = {
            "en": "What will you offer: one main product, a small product line, many categories, services, bookings, or a full marketplace?",
            "es": "¿Qué vas a ofrecer: un producto principal, una línea pequeña, muchas categorías, servicios, reservas o un marketplace completo?",
            "fr": "Que voulez-vous proposer : un produit principal, une petite gamme, plusieurs catégories, des services, des réservations ou une marketplace complète ?",
            "pt": "O que você vai oferecer: um produto principal, uma linha pequena, muitas categorias, serviços, agendamentos ou um marketplace completo?",
        }
        return questions.get(language, questions["en"])
    return _question_for(language, step)


def _template_reason(template_id: str, text: str) -> str:
    if template_id == "mega-marketplace":
        return "Broad or varied catalog detected; using search-first marketplace architecture."
    if template_id == "apple-premium-product":
        return "Focused product line detected; using premium product-story architecture."
    return "Selected from business type and offer context."


def _design_strategy(template_id: str, catalog_type: str, reason: str, current: dict, analysis: dict | None = None) -> dict:
    analysis = analysis or {}
    return {
        "designerMode": True,
        "reasoningMode": "strategic_diagnosis_then_structure_selection",
        "selectedTemplateId": template_id,
        "selectedCatalogType": catalog_type,
        "selectedTemplateReason": reason,
        "templateUsePolicy": "Use this as reference architecture only; adapt copy, sections, products, CTAs, colors and layout to the business.",
        "publicCopyPolicy": "Never paste intake answers verbatim. Rewrite as polished customer-facing copy.",
        "catalogComplexity": analysis.get("catalogBreadth") or ("broad_multi_category_catalog" if template_id == "mega-marketplace" else "focused_or_standard_catalog"),
        "diagnosis": analysis,
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
