from __future__ import annotations

import uuid
import re
import os
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .agents import semantic_seed_catalog, split_items, state_is_commerce_seed_target
from .commerce import router as commerce_router
from .models import (
    LumaChatRequest,
    LumaChatResponse,
    LyraEditRequest,
    LyraEditResponse,
    CatalogSource,
    WebsiteGenerationRequest,
    WebsiteGenerationResponse,
)
from .lyra_edit_engine import LyraEditEngine
from .lyra_intake_engine import LyraIntakeDecision, LyraIntakeEngine
from .orchestrator import (
    LyraOrchestrator,
    assistant_message_for_state,
    next_question_for_state,
    normalize_state_payload,
    site_plan_from_state,
)
from .taxonomy import infer_seed_profile


ROOT_DIR = Path(__file__).resolve().parents[2]
orchestrator = LyraOrchestrator()
intake_engine = LyraIntakeEngine()
edit_engine = LyraEditEngine()
client_intake_sessions: Dict[str, Dict[str, Any]] = {}


CLIENT_DRAFT_KEYS = {
    "websiteIntent",
    "businessName",
    "businessDescription",
    "industry",
    "location",
    "servicesProducts",
    "targetAudience",
    "preferredTone",
    "preferredColors",
    "contactInfo",
    "desiredDomain",
    "logoUrl",
    "logoPreference",
    "photoUrls",
    "logoPalette",
    "selectedLanguage",
    "hasLogo",
    "hasPhotos",
    "salesMode",
    "hasLogoPhotos",
    "sectionsPreference",
    "selectedTemplateId",
    "selectedTemplateName",
    "catalogType",
    "websiteType",
    "salesFlow",
    "brandStyle",
    "intakeFollowupAnswer",
    "fieldMeta",
}


def _trim_text(value: Any, limit: int = 1200) -> str:
    text = str(value or "").strip()
    return text[:limit]


def _safe_list(value: Any, limit: int = 20) -> list[Any]:
    if isinstance(value, list):
        return value[:limit]
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []


def sanitize_client_draft(raw: Any) -> Dict[str, Any]:
    """Keep client sessions small and restoreable.

    The public login gate only needs intake fields. Large generated objects such
    as sitePlan, aiStudioPlan, designStrategy, qualityRules and previous schemas
    are intentionally excluded because older sessions can grow enough to stall
    mobile restore.
    """

    if not isinstance(raw, dict):
        return {}
    draft: Dict[str, Any] = {}
    for key in CLIENT_DRAFT_KEYS:
        if key not in raw:
            continue
        value = raw.get(key)
        if key in {"servicesProducts", "preferredColors", "photoUrls", "logoPalette"}:
            draft[key] = _safe_list(value)
        elif key == "contactInfo":
            info = value if isinstance(value, dict) else {}
            draft[key] = {
                "name": _trim_text(info.get("name"), 160),
                "email": _trim_text(info.get("email"), 200),
                "phone": _trim_text(info.get("phone"), 80),
                "whatsapp": _trim_text(info.get("whatsapp"), 80),
                "instagram": _trim_text(info.get("instagram"), 120),
                "website": _trim_text(info.get("website"), 200),
                "notes": _trim_text(info.get("notes"), 700),
            }
        elif key == "fieldMeta":
            meta = value if isinstance(value, dict) else {}
            draft[key] = {
                str(field)[:80]: {
                    "source": _trim_text((field_meta or {}).get("source"), 40) if isinstance(field_meta, dict) else "",
                    "confidence": (field_meta or {}).get("confidence", 0) if isinstance(field_meta, dict) else 0,
                }
                for field, field_meta in list(meta.items())[:40]
            }
        elif key in {"hasLogo", "hasPhotos"}:
            draft[key] = bool(value)
        else:
            draft[key] = _trim_text(value)
    return draft


def _has_form_value(value: Any) -> bool:
    if isinstance(value, list):
        return any(_has_form_value(item) for item in value)
    if isinstance(value, dict):
        return any(_has_form_value(item) for item in value.values())
    return bool(str(value or "").strip())


def _explicit_meta(source: str = "explicit", confidence: float = 1.0) -> Dict[str, Any]:
    return {"source": source, "confidence": confidence}


def _inferred_meta(confidence: float = 0.5) -> Dict[str, Any]:
    return _explicit_meta("inferred", confidence)


def build_generation_field_meta(request: WebsiteGenerationRequest) -> Dict[str, Dict[str, Any]]:
    """Treat structured form fields as explicit evidence for the intake gate."""

    meta: Dict[str, Dict[str, Any]] = {
        key: value
        for key, value in (request.fieldMeta or {}).items()
        if isinstance(value, dict)
    }
    preferred_tone = request.preferredTone or request.preferred_tone or request.brandStyle
    preferred_colors = request.preferredColors or request.preferred_colors
    logo_preference = request.logoPreference

    if _has_form_value(preferred_tone):
        meta["preferredTone"] = _explicit_meta()
        meta["brand_style"] = _explicit_meta()
    if _has_form_value(preferred_colors):
        meta["preferredColors"] = _explicit_meta()
        meta["brand_style"] = _explicit_meta()
    if _has_form_value(request.logoUrl):
        meta["logo"] = _explicit_meta()
    if _has_form_value(logo_preference):
        meta["logo"] = _explicit_meta()
        meta["logoPreference"] = _explicit_meta()
    return meta


def _generation_context_text(request: WebsiteGenerationRequest) -> str:
    values = [
        request.businessName or request.business_name or "",
        request.businessDescription or request.business_description or "",
        request.industry or "",
        request.servicesProducts or request.services_products or "",
    ]
    return " ".join(str(value) for value in values if value)


def infer_generation_industry(request: WebsiteGenerationRequest) -> str:
    if _has_form_value(request.industry):
        return str(request.industry)
    profile = infer_seed_profile(_generation_context_text(request))
    return "" if profile == "default" else profile


def infer_generation_sales_flow_with_meta(request: WebsiteGenerationRequest) -> tuple[str, Optional[Dict[str, Any]]]:
    explicit = request.salesFlow or request.sales_flow or request.designStrategy.get("salesFlow") or request.designStrategy.get("salesMode")
    if _has_form_value(explicit):
        return str(explicit), _explicit_meta()

    text = _generation_context_text(request).lower()
    if re.search(r"\b(reserva|reservas|booking|cita|citas|appointment)\b", text):
        return "booking", _inferred_meta()
    if re.search(r"\b(cotiza|cotizacion|cotización|quote|presupuesto)\b", text):
        return "quote_request", _inferred_meta()
    if re.search(r"\b(vendo|vender|venta|ventas|tienda|shop|store|online|comprar|producto|productos|catalogo|catálogo)\b", text):
        return "online_sales", _inferred_meta()
    return "", None


def infer_generation_sales_flow(request: WebsiteGenerationRequest) -> str:
    sales_flow, _meta = infer_generation_sales_flow_with_meta(request)
    return sales_flow

app = FastAPI(title="KREATON LYRA API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(commerce_router)


@app.get("/healthz")
@app.get("/")
async def healthz() -> Dict[str, Any]:
    return {"status": "ok", "service": "kreaton-lyra-api"}


def storage_is_configured() -> bool:
    """Report whether a server-side storage provider appears configured.

    The current backend does not initialize a storage client yet, so this
    checks the environment variables expected by the rebuild kit and common
    S3/R2-compatible storage providers without exposing secret values.
    """

    supabase_ready = bool(os.getenv("SUPABASE_URL")) and bool(os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
    object_storage_ready = bool(
        os.getenv("STORAGE_BUCKET") or os.getenv("S3_BUCKET") or os.getenv("R2_BUCKET")
    ) and bool(
        os.getenv("STORAGE_ENDPOINT")
        or os.getenv("S3_ENDPOINT_URL")
        or os.getenv("R2_ENDPOINT")
        or os.getenv("AWS_ENDPOINT_URL")
    )
    return supabase_ready or object_storage_ready


@app.get("/api/ai-status")
async def ai_status() -> Dict[str, bool]:
    planner = getattr(orchestrator, "ai_site_planner", None)
    return {
        "openaiConfigured": bool(os.getenv("OPENAI_API_KEY")),
        "intakeAIAvailable": getattr(intake_engine, "client", None) is not None,
        "plannerAIAvailable": getattr(planner, "client", None) is not None,
        "storageConfigured": storage_is_configured(),
    }


@app.get("/api/build-info")
async def build_info() -> Dict[str, Any]:
    return {
        "service": os.getenv("RENDER_SERVICE_NAME") or "kreaton-lyra-api",
        "commit": os.getenv("RENDER_GIT_COMMIT") or os.getenv("GIT_COMMIT") or "",
        "branch": os.getenv("RENDER_GIT_BRANCH") or os.getenv("GIT_BRANCH") or "",
        "version": app.version,
    }


@app.post("/api/luma/chat", response_model=LumaChatResponse)
@app.post("/api/ai/intake-assistant", response_model=LumaChatResponse)
async def luma_chat(request: LumaChatRequest) -> LumaChatResponse:
    state = normalize_state_payload(request.current)
    if request.selectedTemplateId and not state.selectedTemplateId:
        state.selectedTemplateId = request.selectedTemplateId
    apply_current_step_hint(state, request)

    intake_decision = await intake_engine.run(
        message=request.message,
        state=state,
        conversation_history=request.history,
        selected_language=state.selectedLanguage,
    )
    state = intake_engine.apply_decision(state, intake_decision)

    if intake_decision.canGenerate:
        final_state = await orchestrator.run(request.message, state, skip_intake_strategy=True)
        ready = not final_state.missingImportantFields
        plan = site_plan_from_state(final_state)
        assistant_message = assistant_message_for_state(final_state)
        next_question = intake_decision.nextQuestion or next_question_for_state(final_state)
    else:
        final_state = state
        ready = False
        plan = {}
        assistant_message = intake_message_for_decision(intake_decision, final_state)
        next_question = intake_decision.nextQuestion or next_question_for_state(final_state)

    return LumaChatResponse(
        assistantMessage=assistant_message,
        emotion="success" if ready else "speaking",
        updatedFields={
            "businessName": final_state.businessName,
            "businessDescription": final_state.businessDescription,
            "industry": final_state.industry,
            "location": final_state.location,
            "servicesProducts": final_state.servicesProducts,
            "targetAudience": final_state.targetAudience,
            "preferredTone": final_state.preferredTone,
            "preferredColors": final_state.preferredColors,
            "salesFlow": final_state.salesFlow,
            "websiteIntent": final_state.websiteIntent,
            "websiteType": final_state.websiteType,
            "selectedTemplateId": final_state.selectedTemplateId,
            "selectedTemplateName": final_state.selectedTemplateName,
            "catalogType": final_state.catalogType,
            "colors": final_state.colors,
            "typography": final_state.typography,
            "generatedCopy": final_state.generatedCopy,
            "catalogItems": final_state.catalogItems,
            "fieldMeta": final_state.fieldMeta,
            "detectedIntent": intake_decision.detectedIntent.model_dump(),
            "intakeCanGenerate": intake_decision.canGenerate,
            "sitePlan": plan,
        },
        nextQuestion=next_question,
        readyToGenerate=ready,
        missingImportantFields=intake_decision.missingCriticalFields if not ready else final_state.missingImportantFields,
        confidence=final_state.confidence,
        selectedTemplateId=final_state.selectedTemplateId,
        selected_template_id=final_state.selectedTemplateId,
        sitePlan=plan,
        used_dev_fallback=not intake_decision.usedAI,
    )


def intake_message_for_decision(decision: LyraIntakeDecision, state: Any) -> str:
    if decision.warning:
        return {
            "es": "No pude procesar eso con suficiente precision.",
            "fr": "Je n'ai pas pu traiter cela avec assez de precision.",
            "pt": "Nao consegui processar isso com precisao suficiente.",
        }.get(state.selectedLanguage, "I could not process that with enough precision.")
    return {
        "es": "Entendido. Actualice lo que pude confirmar.",
        "fr": "Compris. J'ai mis a jour ce que je peux confirmer.",
        "pt": "Entendido. Atualizei o que pude confirmar.",
    }.get(state.selectedLanguage, "Got it. I updated what I could confirm.")


def apply_current_step_hint(state: Any, request: LumaChatRequest) -> None:
    """Use the active guided step as a deterministic hint before AI extraction.

    This prevents short answers like "Crazy Box" from being ignored just because
    they do not match a natural-language regex.
    """
    step = request.currentStep or request.current_step or ""
    message = str(request.message or "").strip()
    if not message:
        return

    if step == "websiteIntent" and not state.websiteIntent:
        state.websiteIntent = message
        mark_field_meta(state, "websiteIntent", "explicit", 0.95)
    elif step == "businessName" and not state.businessName and len(message) <= 70:
        state.businessName = message
        mark_field_meta(state, "businessName", "explicit", 0.95)
    elif step == "businessDescription" and not state.businessDescription:
        state.businessDescription = message
        mark_field_meta(state, "businessDescription", "explicit", 0.92)
    elif step == "servicesProducts" and not state.servicesProducts:
        state.servicesProducts = [item.strip() for item in re.split(r"[,;\n]+", message) if item.strip()]
        mark_field_meta(state, "servicesProducts", "explicit", 0.9)
    elif step == "preferredColors" and not state.preferredColors:
        state.preferredColors = message
        mark_field_meta(state, "preferredColors", "explicit", 0.9)
        brand_source = "explicit_delegation" if re.search(r"\b(tu decides|tú decides|decide tu|decide tú|sorprendeme|sorpréndeme|you decide)\b", message, re.I) else "explicit"
        mark_field_meta(state, "brand_style", brand_source, 0.9)
    elif step in {"preferredTone", "brand_style"} and not state.preferredTone:
        state.preferredTone = message
        brand_source = "explicit_delegation" if re.search(r"\b(tu decides|tú decides|decide tu|decide tú|sorprendeme|sorpréndeme|you decide)\b", message, re.I) else "explicit"
        mark_field_meta(state, "preferredTone", brand_source, 0.9)
        mark_field_meta(state, "brand_style", brand_source, 0.9)
    elif step in {"hasLogoPhotos", "logo"}:
        logo_source = "explicit"
        mark_field_meta(state, "logo", logo_source, 0.9)


def mark_field_meta(state: Any, field: str, source: str, confidence: float) -> None:
    meta = dict(getattr(state, "fieldMeta", {}) or {})
    meta[field] = {"source": source, "confidence": confidence}
    state.fieldMeta = meta


@app.post("/api/client/intake-session")
async def client_intake_session(payload: Dict[str, Any]) -> Dict[str, Any]:
    email = str(payload.get("email") or "").strip().lower()
    if "@" not in email or "." not in email.rsplit("@", 1)[-1]:
        raise HTTPException(status_code=400, detail="A complete email is required.")

    force_new = bool(payload.get("forceNew"))
    existing = client_intake_sessions.get(email)
    draft = sanitize_client_draft(payload.get("draft"))
    name = str(payload.get("name") or draft.get("businessName") or "").strip()
    selected_language = payload.get("selectedLanguage") or draft.get("selectedLanguage") or "en"

    if force_new or not existing:
        request_id = payload.get("requestId") or f"req_{uuid.uuid4().hex[:12]}"
        session = {
            "requestId": request_id,
            "request_id": request_id,
            "requestNumber": f"KR-{uuid.uuid4().hex[:6].upper()}",
            "request_number": "",
            "clientEmail": email,
            "client_email": email,
            "clientName": name,
            "selectedLanguage": selected_language,
            "draft": draft,
            "restored": False,
            "storageStatus": "stored",
            "storage_status": "stored",
        }
        session["request_number"] = session["requestNumber"]
        client_intake_sessions[email] = session
        return session

    existing["draft"] = sanitize_client_draft({**sanitize_client_draft(existing.get("draft")), **draft})
    existing["clientName"] = name or existing.get("clientName") or ""
    existing["selectedLanguage"] = selected_language
    existing["restored"] = True
    existing["storageStatus"] = "stored"
    existing["storage_status"] = "stored"
    return existing


@app.post("/api/luma/edit", response_model=LyraEditResponse)
async def luma_edit(request: LyraEditRequest) -> LyraEditResponse:
    try:
        result = await edit_engine.run(
            current_schema=request.currentSchema,
            instruction=request.instruction,
            selected_language=request.selectedLanguage,
            user_context=request.userContext,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Lyra edit failed: {error}") from error

    return LyraEditResponse(**result)


@app.post("/ai/website-builder", response_model=WebsiteGenerationResponse)
async def website_builder(request: WebsiteGenerationRequest) -> WebsiteGenerationResponse:
    payload = request.model_dump()
    field_meta = build_generation_field_meta(request)
    sales_flow, sales_flow_meta = infer_generation_sales_flow_with_meta(request)
    if sales_flow_meta:
        existing_sales_meta = field_meta.get("salesFlow") or field_meta.get("sales_flow")
        normalized_sales_meta = existing_sales_meta if isinstance(existing_sales_meta, dict) else sales_flow_meta
        field_meta["salesFlow"] = normalized_sales_meta
        field_meta["sales_flow"] = normalized_sales_meta
    state = normalize_state_payload({
        "businessName": request.businessName or request.business_name,
        "businessDescription": request.businessDescription or request.business_description,
        "industry": infer_generation_industry(request),
        "location": request.location,
        "servicesProducts": request.servicesProducts or request.services_products,
        "targetAudience": request.targetAudience or request.target_audience,
        "preferredTone": request.preferredTone or request.preferred_tone or request.brandStyle,
        "preferredColors": request.preferredColors or request.preferred_colors,
        "contactInfo": request.contactInfo or request.contact_info,
        "logoUrl": request.logoUrl,
        "logoPreference": request.logoPreference,
        "photoUrls": request.photoUrls,
        "selectedLanguage": request.selectedLanguage,
        "selectedTemplateId": request.selected_template_id or request.designStrategy.get("selectedTemplateId"),
        "salesFlow": sales_flow,
        "fieldMeta": field_meta,
    })
    missing_fields = intake_engine.missing_fields_from_state(state, {}, field_meta)
    if missing_fields:
        return WebsiteGenerationResponse(
            website_schema={},
            catalog_source="seed_fallback",
            needs_more_info=True,
            missing_fields=missing_fields,
            next_question=intake_engine.fallback_question_for_missing(missing_fields, state.selectedLanguage),
            storage_status="needs_more_info",
            used_dev_mock=False,
        )
    prompt_context = " ".join(str(value) for value in payload.values() if value)
    final_state = await orchestrator.run(prompt_context, state)
    catalog_items, catalog_source = resolve_catalog_items_and_source(final_state)
    schema = build_schema_from_state(final_state, catalog_items=catalog_items, catalog_source=catalog_source)
    return WebsiteGenerationResponse(
        website_schema=schema,
        catalog_source=catalog_source,
        storage_status="generated",
        used_dev_mock=False,
        business_id=f"biz_{uuid.uuid4().hex[:10]}",
        site_id=f"site_{uuid.uuid4().hex[:10]}",
        generation_id=f"gen_{uuid.uuid4().hex[:10]}",
    )


def resolve_catalog_items_and_source(state) -> tuple[list[Dict[str, Any]], CatalogSource]:
    fallback_context = " ".join([
        state.businessName or "",
        state.businessDescription or "",
        state.industry or "",
        " ".join(state.servicesProducts),
    ])
    if state.catalogItems:
        return state.catalogItems, getattr(state, "catalogSource", None) or "seed_fallback"
    if state_is_commerce_seed_target(state, fallback_context):
        return semantic_seed_catalog(state, fallback_context, count=6), "seed_fallback"
    return [], getattr(state, "catalogSource", None) or "seed_fallback"


def build_schema_from_state(
    state,
    *,
    catalog_items: list[Dict[str, Any]] | None = None,
    catalog_source: CatalogSource | None = None,
) -> Dict[str, Any]:
    name = state.businessName or "Your Business"
    template_id = state.selectedTemplateId or "corporate-company-pro"
    copy = state.generatedCopy.get("hero", {})
    headline = copy.get("headline") or name
    subheadline = copy.get("subheadline") or state.businessDescription or ""
    primary_cta = copy.get("primaryCta") or "Explore"
    if catalog_items is None or catalog_source is None:
        catalog_items, catalog_source = resolve_catalog_items_and_source(state)
    colors = state.colors or {}
    logo_preference = state.logoPreference or ""
    logo_pending_generation = bool(logo_preference and not state.logoUrl)
    logo_status = "provided" if state.logoUrl else "pending_ai_generation" if logo_pending_generation else "not_provided"

    return {
        "version": "1.0",
        "generation_metadata": {
            "catalog_source": catalog_source,
            "logo_status": logo_status,
            "logo_pending_generation": logo_pending_generation,
        },
        "business": {
            "name": name,
            "description": state.businessDescription or subheadline,
            "industry": state.industry or "",
            "location": state.location or "",
            "selectedLanguage": state.selectedLanguage,
            "tone": state.preferredTone or "",
        },
        "brand": {
            "logoUrl": state.logoUrl or "",
            "logoPreference": logo_preference,
            "logoStatus": logo_status,
            "logoPendingGeneration": logo_pending_generation,
            "preferredColors": state.preferredColors or "",
        },
        "theme": {
            "background": colors.get("background", "#F8FAFC"),
            "surface": colors.get("surface", "#FFFFFF"),
            "primary": colors.get("primary", "#0F172A"),
            "secondary": colors.get("secondary", "#E2E8F0"),
            "accent": colors.get("accent", "#14B8A6"),
            "text": colors.get("text", "#111827"),
            "heading_font": state.typography.get("heading", "Inter"),
            "body_font": state.typography.get("body", "Inter"),
            "buttons": {"primary_label": primary_cta},
        },
        "selected_template": {
            "id": template_id,
            "name": state.selectedTemplateName or template_id,
            "category": state.websiteType or "website",
            "intent": state.catalogType or "",
            "reason": "Selected by LYRA orchestrator from business intake.",
        },
        "active_template": {
            "id": template_id,
            "name": state.selectedTemplateName or template_id,
        },
        "layout_mode": {
            "template_id": template_id,
            "catalog_type": state.catalogType or "",
            "intent": state.websiteType or "",
            "navigation": {"sticky_header": True},
        },
        "catalog_model": {"catalogType": state.catalogType or "standard_catalog"},
        "navigation": [
            {"label": "Home", "page_key": "home"},
            {"label": "Catalog", "page_key": "catalog"},
            {"label": "Contact", "page_key": "contact"},
        ],
        "pages": [
            {
                "page_key": "home",
                "title": "Home",
                "slug": "/",
                "order": 1,
                "sections": [
                    {
                        "id": "hero",
                        "type": "MarketplaceHero" if state.websiteType == "marketplace" else "Hero",
                        "order": 1,
                        "editable": {
                            "headline": headline,
                            "subtitle": subheadline,
                            "primary_button": primary_cta,
                            "secondary_button": "View categories",
                        },
                        "settings": {"layout": "commerce", "container_width": "wide"},
                    },
                    {
                        "id": "catalog",
                        "type": "ProductGrid",
                        "order": 2,
                        "editable": {
                            "title": "Featured products",
                            "text": "Editable products generated from the business strategy.",
                        },
                        "settings": {"layout": "marketplace_grid", "columns": 4},
                    },
                ],
            },
            {
                "page_key": "catalog",
                "title": "Catalog",
                "slug": "/catalog",
                "order": 2,
                "sections": [
                    {
                        "id": "catalog_grid",
                        "type": "ProductGrid",
                        "order": 1,
                        "editable": {"title": "Catalog", "text": "Browse available products."},
                        "settings": {"layout": "marketplace_grid", "columns": 4},
                    }
                ],
            },
            {
                "page_key": "contact",
                "title": "Contact",
                "slug": "/contact",
                "order": 3,
                "sections": [
                    {
                        "id": "contact",
                        "type": "Contact",
                        "order": 1,
                        "editable": {"title": "Contact us", "text": "Send a question or request."},
                        "settings": {"layout": "simple"},
                    }
                ],
            },
        ],
        "catalog_items": catalog_items,
        "global_components": {
            "logo_url": state.logoUrl or "",
            "logo_status": logo_status,
            "logo_pending_generation": logo_pending_generation,
            "logo_preference": logo_preference,
        },
        "quality_rules": {
            "intakeIsStrategyOnly": True,
            "visibleCopyPolicy": "Never paste raw intake notes verbatim.",
        },
    }


# Optional static hosting for a single Render service. It is harmless for API-only
# deployment and useful if we later point Render at this FastAPI app.
if ROOT_DIR.exists():
    app.mount("/assets", StaticFiles(directory=ROOT_DIR / "assets"), name="assets")
    app.mount("/css", StaticFiles(directory=ROOT_DIR / "css"), name="css")
    app.mount("/js", StaticFiles(directory=ROOT_DIR / "js"), name="js")
    app.mount("/client", StaticFiles(directory=ROOT_DIR / "client", html=True), name="client")
    app.mount("/start", StaticFiles(directory=ROOT_DIR / "start", html=True), name="start")
    app.mount("/", StaticFiles(directory=ROOT_DIR, html=True), name="static")
