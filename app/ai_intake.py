import json
import re

import httpx
from openai import OpenAI

from .config import get_settings
from .schemas import IntakeAssistantRequest, IntakeAssistantResponse


GUIDED_STEPS = [
    "businessName",
    "businessDescription",
    "industry",
    "location",
    "servicesProducts",
    "targetAudience",
    "preferredTone",
    "preferredColors",
    "contactInfo",
    "salesMode",
    "hasLogoPhotos",
    "review",
]

REQUIRED_STEPS = [
    "businessName",
    "businessDescription",
    "servicesProducts",
    "contactInfo",
]

SMART_STEP_PRIORITY = [
    "businessName",
    "businessDescription",
    "servicesProducts",
    "contactInfo",
    "salesMode",
    "industry",
    "location",
    "preferredTone",
    "preferredColors",
    "targetAudience",
]

OPTIONAL_STEPS = {
    "industry",
    "location",
    "targetAudience",
    "preferredTone",
    "preferredColors",
    "salesMode",
    "hasLogoPhotos",
}

QUESTION_BY_LANGUAGE = {
    "en": {
        "businessName": "What is the business name?",
        "businessDescription": "Tell me what it sells or does. If you already know the style, products, location, or contact info, you can include everything in one message.",
        "industry": "What industry or category best fits it?",
        "location": "Where is it located or where does it serve customers?",
        "servicesProducts": "Which main products or services should the site show?",
        "targetAudience": "Who is the main customer? You can also let AI decide.",
        "preferredTone": "What style should it feel like: elegant, modern, friendly, premium? Or should AI decide?",
        "preferredColors": "Any preferred colors, or do you want to upload a logo so Luma can extract the palette?",
        "contactInfo": "What contact details should appear: email, phone, Instagram, or WhatsApp?",
        "salesMode": "Should the site support online sales, quote requests, in-person visits, or a mix?",
        "hasLogoPhotos": "Do you have a logo or photos ready to use?",
        "review": "Review the summary. If it looks right, generate the site.",
    },
    "es": {
        "businessName": "Como se llama el negocio?",
        "businessDescription": "Cuéntame qué vende o qué hace. Si ya sabes estilo, productos, ubicación o contacto, puedes ponerlo todo en un solo mensaje.",
        "industry": "En que industria o categoria lo pondrias?",
        "location": "Donde atiende o donde esta ubicado?",
        "servicesProducts": "Que productos o servicios principales quieres mostrar?",
        "targetAudience": "A quien le vendes principalmente? Tambien puedes dejar que IA decida.",
        "preferredTone": "Que estilo quieres: elegante, moderno, cercano, premium? O dejo que IA decida?",
        "preferredColors": "¿Tienes colores preferidos o quieres subir un logo para que Luma saque la paleta?",
        "contactInfo": "Que contacto quieres mostrar: email, telefono, Instagram o WhatsApp?",
        "salesMode": "¿Quieres ventas online, solicitudes de cotización, visitas presenciales o una mezcla?",
        "hasLogoPhotos": "Tienes logo o fotos listas para usar?",
        "review": "Revisa el resumen. Si esta bien, puedes generar el sitio.",
    },
    "fr": {
        "businessName": "Quel est le nom de l'entreprise?",
        "businessDescription": "Décrivez en une phrase ce qu'elle vend ou propose.",
        "industry": "Dans quel secteur ou catégorie la placeriez-vous?",
        "location": "Où se trouve-t-elle ou où sert-elle ses clients?",
        "servicesProducts": "Quels produits ou services principaux faut-il afficher?",
        "targetAudience": "Qui est le client principal? Vous pouvez aussi laisser l'IA décider.",
        "preferredTone": "Quel style voulez-vous: élégant, moderne, chaleureux, premium? Ou l'IA décide?",
        "preferredColors": "Des couleurs préférées? Vous pouvez écrire luxe, pastel, néon, ou laisser l'IA décider.",
        "contactInfo": "Quelles coordonnées afficher: email, téléphone, Instagram ou WhatsApp?",
        "salesMode": "Le site doit-il proposer la vente en ligne, les demandes de devis, ou les deux?",
        "hasLogoPhotos": "Avez-vous un logo ou des photos prêts à utiliser?",
        "review": "Vérifiez le résumé. Si tout est bon, générez le site.",
    },
    "pt": {
        "businessName": "Qual é o nome do negócio?",
        "businessDescription": "Conte em uma frase o que ele vende ou faz.",
        "industry": "Em qual setor ou categoria ele se encaixa?",
        "location": "Onde fica ou onde atende clientes?",
        "servicesProducts": "Quais produtos ou serviços principais devem aparecer?",
        "targetAudience": "Quem é o cliente principal? Você também pode deixar a IA decidir.",
        "preferredTone": "Qual estilo você quer: elegante, moderno, próximo, premium? Ou a IA decide?",
        "preferredColors": "Tem cores preferidas? Pode escrever luxo, pastel, neon, ou deixar a IA decidir.",
        "contactInfo": "Quais contatos devem aparecer: email, telefone, Instagram ou WhatsApp?",
        "salesMode": "O site deve aceitar vendas online, pedidos de orçamento, ou ambos?",
        "hasLogoPhotos": "Você tem logo ou fotos prontas para usar?",
        "review": "Revise o resumo. Se estiver certo, gere o site.",
    },
}


def guide_intake(payload: IntakeAssistantRequest) -> IntakeAssistantResponse:
    selected_language = _language(payload.current.selected_language)
    settings = get_settings()
    if not settings.openai_api_key:
        return _development_fallback(payload)

    client = OpenAI(
        api_key=settings.openai_api_key,
        timeout=25.0,
        max_retries=0,
        http_client=httpx.Client(trust_env=False),
    )
    try:
        response = client.responses.create(
            model=settings.openai_model,
            input=[
                {
                    "role": "system",
                    "content": (
                    "You are a friendly intake assistant for an internal AI website builder. "
                    f"Ask short, plain questions in the selected language ({selected_language}). "
                    "Behave like a real chat interviewer, not a form. "
                    "Extract every useful detail from the user's message, even if the user answers several fields at once. "
                    "Do not ask for information that is already present in current or in the latest user message. "
                    "Ask at most one next question. Do not repeat the same topic twice. "
                    "Only required fields are businessName, businessDescription, servicesProducts, and contactInfo. "
                    "Everything else is optional; infer it when possible or let AI decide. "
                    "When the user mentions logo, photos, colors, brand identity, or says they want to upload assets, "
                    "acknowledge it and set hasLogoPhotos/hasLogo/hasPhotos when appropriate; do not turn that into page copy. "
                    "Business description and brand notes are strategy context, not text to copy literally onto the website. "
                    "Respect 'Let AI decide' for targetAudience, preferredTone, preferredColors, and sectionsPreference. "
                    "Return JSON only with: assistantMessage, emotion, updatedFields, next_step, next_question, "
                    "readyToGenerate, missingImportantFields, confidence. "
                    "emotion must be one of neutral, happy, thinking, listening, speaking, alert, success. "
                        "updates must use camelCase keys compatible with the frontend payload: "
                    "businessName, businessDescription, industry, location, servicesProducts, "
                    "targetAudience, preferredTone, preferredColors, contactInfo, logoUrl, photoUrls, "
                    "salesMode, hasLogo, hasPhotos, hasLogoPhotos, sectionsPreference. servicesProducts, preferredColors, "
                    "and photoUrls are arrays. contactInfo is an object. JSON keys must stay in English. "
                    "Human-readable field values and all assistant messages must be in the selected language."
                ),
            },
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "current": payload.current.model_dump(by_alias=True),
                        "selectedLanguage": selected_language,
                        "message": payload.message,
                            "current_step": payload.current_step,
                            "history": payload.history[-8:],
                            "guided_steps": GUIDED_STEPS,
                        },
                        ensure_ascii=False,
                    ),
                },
            ],
        )
    except Exception:
        return _development_fallback(payload)
    try:
        data = json.loads(response.output_text)
    except json.JSONDecodeError:
        return _development_fallback(payload)

    message = data.get("assistantMessage") or data.get("message") or _updated_message(selected_language)
    updates = data.get("updatedFields") or data.get("updates") or {}
    current = payload.current.model_dump(by_alias=True)
    merged = _merge_current_updates(current, updates)
    missing = _missing_fields(merged)
    next_step = _smart_next_step(data.get("next_step") or payload.current_step, merged)
    emotion = _emotion(data.get("emotion"), ready=not missing)
    return IntakeAssistantResponse(
        message=message,
        updates=updates,
        next_step=next_step,
        next_question=data.get("next_question") or _question(selected_language, next_step),
        missing_fields=missing,
        used_dev_fallback=False,
        assistantMessage=message,
        emotion=emotion,
        updatedFields=updates,
        readyToGenerate=not missing,
        missingImportantFields=missing,
        confidence=float(data.get("confidence") or 0.75),
    )


def _development_fallback(payload: IntakeAssistantRequest) -> IntakeAssistantResponse:
    selected_language = _language(payload.current.selected_language)
    return _local_intake_response(payload, selected_language, used_dev_fallback=True, confidence=0.45)


def _quick_intake_response(payload: IntakeAssistantRequest, selected_language: str) -> IntakeAssistantResponse | None:
    updates = _infer_updates(payload.current_step, payload.message, selected_language)
    useful_update_count = len([key for key, value in updates.items() if value not in ("", None, [], {})])
    if useful_update_count < 2 and payload.current_step not in REQUIRED_STEPS and payload.current_step not in OPTIONAL_STEPS:
        return None
    return _local_intake_response(
        payload,
        selected_language,
        updates=updates,
        used_dev_fallback=False,
        confidence=0.72 if useful_update_count >= 2 else 0.62,
    )


def _local_intake_response(
    payload: IntakeAssistantRequest,
    selected_language: str,
    *,
    updates: dict | None = None,
    used_dev_fallback: bool,
    confidence: float,
) -> IntakeAssistantResponse:
    current = payload.current.model_dump(by_alias=True)
    updates = updates if updates is not None else _infer_updates(payload.current_step, payload.message, selected_language)
    merged = _merge_current_updates(current, updates)
    next_step = _smart_next_step(payload.current_step, merged)

    missing = _missing_fields(merged)
    message = _ready_message(selected_language) if not missing else _fallback_chat_message(selected_language)
    emotion = "success" if not missing else "alert"
    return IntakeAssistantResponse(
        message=message,
        updates=updates,
        next_step=next_step,
        next_question=_question(selected_language, next_step),
        missing_fields=missing,
        used_dev_fallback=used_dev_fallback,
        assistantMessage=message,
        emotion=emotion,
        updatedFields=updates,
        readyToGenerate=not missing,
        missingImportantFields=missing,
        confidence=confidence,
    )


def _infer_updates(step: str, message: str, selected_language: str) -> dict:
    text = message.strip()
    if not text:
        return {}

    lowered = text.lower()
    if (
        "let ai decide" in lowered
        or "ia decida" in lowered
        or "l'ia décider" in lowered
        or "ia decidir" in lowered
        or "decide" == lowered
    ):
        decision = _let_ai_decide(selected_language)
        if step == "targetAudience":
            return {"targetAudience": decision}
        if step == "preferredTone":
            return {"preferredTone": decision}
        if step == "preferredColors":
            return {"preferredColors": [decision]}
        return {"sectionsPreference": decision}

    broad_updates = _infer_broad_updates(text, selected_language)
    if step == "servicesProducts":
        broad_updates["servicesProducts"] = _split_items(text)
        return broad_updates
    if step == "preferredColors":
        broad_updates["preferredColors"] = _split_items(text)
        return broad_updates
    if step == "contactInfo":
        broad_updates["contactInfo"] = _extract_contact(text)
        return broad_updates
    if step == "salesMode":
        broad_updates["salesMode"] = _sales_mode(text)
        return broad_updates
    if step == "hasLogoPhotos":
        lowered_assets = text.lower()
        has_logo = any(word in lowered_assets for word in ["logo", "logotipo", "brand", "marca"])
        has_photos = any(word in lowered_assets for word in ["foto", "photo", "imagen", "image"])
        broad_updates.update({"hasLogoPhotos": text, "hasLogo": has_logo, "hasPhotos": has_photos})
        return broad_updates

    key_by_step = {
        "businessName": "businessName",
        "businessDescription": "businessDescription",
        "industry": "industry",
        "location": "location",
        "targetAudience": "targetAudience",
        "preferredTone": "preferredTone",
    }
    key = key_by_step.get(step)
    if key and not (key == "businessName" and len(text) > 80):
        broad_updates.setdefault(key, text)
    return broad_updates


def _infer_broad_updates(text: str, selected_language: str) -> dict:
    lowered = text.lower()
    updates: dict = {}
    contact = _extract_contact(text)
    if contact:
        updates["contactInfo"] = contact
    services = _extract_services(text)
    if services:
        updates["servicesProducts"] = services
    name = _extract_business_name(text)
    if name:
        updates["businessName"] = name
    industry = _infer_industry(text)
    if industry:
        updates["industry"] = industry
    location = _extract_location(text)
    if location:
        updates["location"] = location
    tone = _extract_tone(text)
    if tone:
        updates["preferredTone"] = tone
    colors = _extract_colors(text)
    if colors:
        updates["preferredColors"] = colors
    sales_mode = _sales_mode(text)
    if sales_mode != "unknown":
        updates["salesMode"] = sales_mode
    if any(word in lowered for word in ["logo", "logotipo", "brand", "marca", "foto", "photo", "imagen", "image"]):
        updates["hasLogoPhotos"] = {
            "en": "Client mentioned logo/photos",
            "es": "El cliente mencionó logo/fotos",
            "fr": "Le client a mentionné logo/photos",
            "pt": "O cliente mencionou logo/fotos",
        }.get(selected_language, "Client mentioned logo/photos")
        updates["hasLogo"] = any(word in lowered for word in ["logo", "logotipo", "brand", "marca"])
        updates["hasPhotos"] = any(word in lowered for word in ["foto", "photo", "imagen", "image"])
    if len(text) > 50:
        updates.setdefault("businessDescription", text[:600])
    return updates


def _extract_contact(text: str) -> dict[str, str]:
    contact: dict[str, str] = {}
    email_match = re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", text)
    phone_match = re.search(r"(\+?\d[\d\s().-]{6,}\d)", text)
    instagram_match = re.search(r"@[\w.]+", text)
    if email_match:
        contact["email"] = email_match.group(0)
    if phone_match:
        contact["phone"] = phone_match.group(1).strip()
    if instagram_match:
        contact["instagram"] = instagram_match.group(0).rstrip(".")
    if not contact:
        contact["notes"] = text
    return contact


def _extract_business_name(text: str) -> str:
    patterns = [
        r"(?:nombre(?: del negocio)?|negocio|tienda|marca|empresa)\s*(?:es|se llama|:|-)\s*([^.,;\n]+)",
        r"(?:business(?: name)?|store|brand|company)\s*(?:is|called|:|-)\s*([^.,;\n]+)",
        r"(?:se llama|called)\s+([^.,;\n]+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.I)
        if match:
            name = re.split(
                r"\s+(?:y\s+)?(?:vende|vendo|vendemos|ofrece|ofrecemos|hace|tiene|con|para)\b",
                match.group(1),
                maxsplit=1,
                flags=re.I,
            )[0]
            return _clean(name, 56)
    return ""


def _extract_location(text: str) -> str:
    patterns = [
        r"(?:ubicaci[oó]n|ubicado en|est[aá] en|atiende en|localidad|ciudad|zona)\s*(?:es|:|-)?\s*([^.,;\n]+)",
        r"(?:en|desde)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,2})(?:\s|,|\.|;|$)",
        r"(?:location|located in|serves|city|area)\s*(?:is|:|-)?\s*([^.,;\n]+)",
        r"(?:in|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})(?:\s|,|\.|;|$)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.I)
        if match:
            return _clean(match.group(1), 70)
    return ""


def _extract_services(text: str) -> list[str]:
    patterns = [
        r"(?:productos?|servicios?|vende\b|vendo\b|vendemos\b|ofrece\b|ofrecemos\b|catalogo|cat[aá]logo)\s*(?:son|es|:|-)?\s*([^.;\n]+)",
        r"(?:tienda|negocio|marca|empresa|pagina|p[aá]gina|web)\s+de\s+([^.;\n]+)",
        r"(?:products?|services?|sells|offers|catalog)\s*(?:are|is|:|-)?\s*([^.;\n]+)",
        r"(?:store|shop|business|brand|website)\s+(?:for|of)\s+([^.;\n]+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.I)
        if match:
            product_phrase = _trim_product_phrase(match.group(1))
            return [_clean(item, 52) for item in _split_items(product_phrase) if _clean(item, 52)]
    return []


def _trim_product_phrase(value: str) -> str:
    return re.split(
        r"\b(?:quiero|estilo|style|contacto|contact|whatsapp|instagram|tel[eé]fono|phone|email|ubicaci[oó]n|location)\b|\s+en\s+[A-ZÁÉÍÓÚÑ]",
        value or "",
        maxsplit=1,
        flags=re.I,
    )[0]


def _infer_industry(text: str) -> str:
    lowered = text.lower()
    mappings = [
        (["ropa", "moda", "fashion", "boutique", "zapato", "accesorio"], "Fashion / retail"),
        (["comida", "restaurante", "restaurant", "menu", "menú", "cafe", "café"], "Restaurant / food"),
        (["barber", "barbero", "salon", "salón", "spa", "belleza"], "Beauty / appointments"),
        (["servicio", "service", "reparacion", "reparación", "limpieza"], "Local services"),
        (["digital", "curso", "ebook", "software"], "Digital products"),
        (["marketplace", "amazon", "ebay"], "Marketplace"),
    ]
    for words, label in mappings:
        if any(word in lowered for word in words):
            return label
    return ""


def _extract_tone(text: str) -> str:
    styles = [
        "elegante", "moderno", "premium", "minimalista", "lujoso", "juvenil", "profesional",
        "futurista", "cyberpunk", "neon", "neón", "friendly", "modern", "luxury", "minimal",
        "bold", "clean",
    ]
    found = [style for style in styles if re.search(rf"\b{re.escape(style)}\b", text, flags=re.I)]
    return ", ".join(dict.fromkeys(found))


def _extract_colors(text: str) -> list[str]:
    hex_colors = re.findall(r"#[0-9a-f]{3,8}\b", text, flags=re.I)
    names = [
        "rojo", "azul", "verde", "negro", "blanco", "gris", "dorado", "amarillo", "naranja", "morado", "violeta", "rosa", "beige",
        "red", "blue", "green", "black", "white", "gray", "grey", "gold", "yellow", "orange", "purple", "pink", "cyan",
    ]
    found = [name for name in names if re.search(rf"\b{re.escape(name)}\b", text, flags=re.I)]
    phrase_match = re.search(r"(?:colores?|colors?|paleta|palette)\s*(?:son|es|:|-)?\s*([^.;\n]+)", text, flags=re.I)
    phrase_items = _split_items(phrase_match.group(1)) if phrase_match else []
    return list(dict.fromkeys([*_clean_list(hex_colors), *_clean_list(phrase_items), *_clean_list(found)]))[:8]


def _clean(value: str, max_length: int) -> str:
    return re.sub(r"\s+", " ", value or "").strip(" .,:;-")[:max_length].strip()


def _clean_list(values: list[str]) -> list[str]:
    return [item for item in (_clean(value, 36) for value in values) if item]


def _sales_mode(text: str) -> str:
    lowered = text.lower()
    has_sales = any(word in lowered for word in ["venta", "comprar", "online", "tienda", "sell", "buy", "vender"])
    has_quote = any(word in lowered for word in ["cotizacion", "cotizar", "quote", "presupuesto", "devis", "orçamento", "orcamento"])
    if has_sales and has_quote:
        return "both"
    if has_sales:
        return "online_sales"
    if has_quote:
        return "quote_requests"
    return "unknown"


def _split_items(text: str) -> list[str]:
    return [item.strip() for item in re.split(r"[\n,;]", text) if item.strip()]


def _merge_current_updates(current: dict, updates: dict) -> dict:
    merged = dict(current or {})
    for key, value in (updates or {}).items():
        if value in ("", None, [], {}):
            continue
        if key == "contactInfo":
            merged[key] = {**(merged.get(key) or {}), **(value or {})}
        elif key in {"servicesProducts", "preferredColors", "photoUrls"}:
            existing = merged.get(key) or []
            incoming = value if isinstance(value, list) else _split_items(str(value))
            merged[key] = list(dict.fromkeys([*existing, *incoming]))
        else:
            merged[key] = value
    return merged


def _smart_next_step(reference_step: str, current: dict) -> str:
    for step in REQUIRED_STEPS:
        if current.get(step) in ("", None, [], {}):
            return step
    try:
        start = SMART_STEP_PRIORITY.index(reference_step) + 1
    except ValueError:
        start = 0
    ordered = SMART_STEP_PRIORITY[start:] + SMART_STEP_PRIORITY[:start]
    for step in ordered:
        if step not in OPTIONAL_STEPS:
            continue
        if current.get(step) in ("", None, [], {}):
            return step
    return "review"


def _first_missing_after(step: str, current: dict) -> str:
    try:
        start = GUIDED_STEPS.index(step)
    except ValueError:
        start = 0
    for key in GUIDED_STEPS[start:]:
        if key == "review":
            return key
        value = current.get(key)
        if value in ("", None, [], {}):
            return key
    return "review"


def _next_step(step: str) -> str:
    try:
        index = GUIDED_STEPS.index(step)
    except ValueError:
        return GUIDED_STEPS[0]
    return GUIDED_STEPS[min(index + 1, len(GUIDED_STEPS) - 1)]


def _missing_fields(current: dict) -> list[str]:
    missing = []
    for key in REQUIRED_STEPS:
        if current.get(key) in ("", None, [], {}):
            missing.append(key)
    return missing


def _language(value: str | None) -> str:
    return value if value in {"en", "es", "fr", "pt"} else "en"


def _question(language: str, step: str) -> str:
    return QUESTION_BY_LANGUAGE.get(language, QUESTION_BY_LANGUAGE["en"]).get(
        step,
        QUESTION_BY_LANGUAGE.get(language, QUESTION_BY_LANGUAGE["en"])["review"],
    )


def _fallback_message(language: str) -> str:
    messages = {
        "en": "I saved that detail and will keep guiding you while the smart assistant reconnects.",
        "es": "Guardé ese dato y seguiré guiándote mientras el asistente inteligente reconecta.",
        "fr": "J'ai enregistré ce détail et je continue à vous guider pendant que l'assistant intelligent se reconnecte.",
        "pt": "Salvei esse detalhe e vou continuar guiando você enquanto o assistente inteligente reconecta.",
    }
    return messages.get(language, messages["en"])


def _fallback_chat_message(language: str) -> str:
    messages = {
        "en": "Perfect, I saved that detail.",
        "es": "Perfecto, guarde ese dato.",
        "fr": "Parfait, j'ai gardé ce détail.",
        "pt": "Perfeito, guardei esse detalhe.",
    }
    return messages.get(language, messages["en"])


def _updated_message(language: str) -> str:
    messages = {
        "en": "Perfect, I updated the summary.",
        "es": "Perfecto, actualice el resumen.",
        "fr": "Parfait, j'ai mis le résumé à jour.",
        "pt": "Perfeito, atualizei o resumo.",
    }
    return messages.get(language, messages["en"])


def _let_ai_decide(language: str) -> str:
    values = {
        "en": "Let AI decide",
        "es": "Que IA decida",
        "fr": "Laisser l'IA décider",
        "pt": "Deixar a IA decidir",
    }
    return values.get(language, values["en"])


def _ready_message(language: str) -> str:
    messages = {
        "en": "Perfect. I have enough information to create your first website draft.",
        "es": "Perfecto. Ya tengo suficiente informacion para crear tu primer borrador de sitio web.",
        "fr": "Parfait. J'ai assez d'informations pour créer votre première ébauche de site.",
        "pt": "Perfeito. Tenho informações suficientes para criar o primeiro rascunho do seu site.",
    }
    return messages.get(language, messages["en"])


def _emotion(value: str | None, *, ready: bool = False) -> str:
    if ready:
        return "success"
    if value in {"neutral", "happy", "thinking", "listening", "speaking", "alert", "success"}:
        return value
    return "speaking"
