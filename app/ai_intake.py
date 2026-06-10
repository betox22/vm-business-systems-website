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

QUESTION_BY_LANGUAGE = {
    "en": {
        "businessName": "What is the business name?",
        "businessDescription": "Tell me in one sentence what it sells or does.",
        "industry": "What industry or category best fits it?",
        "location": "Where is it located or where does it serve customers?",
        "servicesProducts": "Which main products or services should the site show?",
        "targetAudience": "Who is the main customer? You can also let AI decide.",
        "preferredTone": "What style should it feel like: elegant, modern, friendly, premium? Or should AI decide?",
        "preferredColors": "Any preferred colors? You can write luxury, pastel, neon, or let AI decide.",
        "contactInfo": "What contact details should appear: email, phone, Instagram, or WhatsApp?",
        "salesMode": "Should the site support online sales, quote requests, or both?",
        "hasLogoPhotos": "Do you have a logo or photos ready to use?",
        "review": "Review the summary. If it looks right, generate the site.",
    },
    "es": {
        "businessName": "Como se llama el negocio?",
        "businessDescription": "Cuentame en una frase que vende o que hace.",
        "industry": "En que industria o categoria lo pondrias?",
        "location": "Donde atiende o donde esta ubicado?",
        "servicesProducts": "Que productos o servicios principales quieres mostrar?",
        "targetAudience": "A quien le vendes principalmente? Tambien puedes dejar que IA decida.",
        "preferredTone": "Que estilo quieres: elegante, moderno, cercano, premium? O dejo que IA decida?",
        "preferredColors": "Tienes colores preferidos? Puedes escribir lujo, pastel, neon o dejar que IA decida.",
        "contactInfo": "Que contacto quieres mostrar: email, telefono, Instagram o WhatsApp?",
        "salesMode": "Quieres ventas online, solicitudes de cotizacion, o ambos?",
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
                    "Extract business details into a "
                    "structured JSON update. Never require every field. Infer missing values "
                        "when the user gives enough context. Respect 'Let AI decide' for "
                        "targetAudience, preferredTone, preferredColors, and sectionsPreference. "
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

    next_step = data.get("next_step") or _next_step(payload.current_step)
    message = data.get("assistantMessage") or data.get("message") or _updated_message(selected_language)
    updates = data.get("updatedFields") or data.get("updates") or {}
    missing = data.get("missingImportantFields") or data.get("missing_fields") or _missing_fields(
        payload.current.model_dump(by_alias=True),
    )
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
    current = payload.current.model_dump(by_alias=True)
    updates = _infer_updates(payload.current_step, payload.message, selected_language)
    merged = {**current, **updates}
    next_step = _first_missing_after(payload.current_step, merged)
    if next_step == payload.current_step:
        next_step = _next_step(payload.current_step)

    missing = _missing_fields(merged)
    message = _ready_message(selected_language) if not missing else _fallback_chat_message(selected_language)
    emotion = "success" if not missing else "alert"
    return IntakeAssistantResponse(
        message=message,
        updates=updates,
        next_step=next_step,
        next_question=_question(selected_language, next_step),
        missing_fields=missing,
        used_dev_fallback=True,
        assistantMessage=message,
        emotion=emotion,
        updatedFields=updates,
        readyToGenerate=not missing,
        missingImportantFields=missing,
        confidence=0.45,
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

    if step == "servicesProducts":
        return {"servicesProducts": _split_items(text)}
    if step == "preferredColors":
        return {"preferredColors": _split_items(text)}
    if step == "contactInfo":
        return {"contactInfo": _extract_contact(text)}
    if step == "salesMode":
        return {"salesMode": _sales_mode(text)}
    if step == "hasLogoPhotos":
        lowered_assets = text.lower()
        has_logo = any(word in lowered_assets for word in ["logo", "logotipo", "brand", "marca"])
        has_photos = any(word in lowered_assets for word in ["foto", "photo", "imagen", "image"])
        return {"hasLogoPhotos": text, "hasLogo": has_logo, "hasPhotos": has_photos}

    key_by_step = {
        "businessName": "businessName",
        "businessDescription": "businessDescription",
        "industry": "industry",
        "location": "location",
        "targetAudience": "targetAudience",
        "preferredTone": "preferredTone",
    }
    key = key_by_step.get(step)
    return {key: text} if key else {}


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
        contact["instagram"] = instagram_match.group(0)
    if not contact:
        contact["notes"] = text
    return contact


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
    optional = {"logoUrl", "photoUrls", "targetAudience", "preferredTone", "preferredColors", "sectionsPreference"}
    missing = []
    for key in GUIDED_STEPS:
        if key == "review" or key in optional:
            continue
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
        "en": "Development mode: OPENAI_API_KEY is missing or OpenAI is unavailable. I used simple local inference to keep the intake moving.",
        "es": "Modo desarrollo: falta OPENAI_API_KEY o OpenAI no esta disponible. Use una inferencia local simple para avanzar el intake.",
        "fr": "Mode développement : OPENAI_API_KEY manque ou OpenAI est indisponible. J'ai utilisé une inférence locale simple pour continuer l'intake.",
        "pt": "Modo desenvolvimento: OPENAI_API_KEY está ausente ou a OpenAI está indisponível. Usei uma inferência local simples para continuar o intake.",
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
