from __future__ import annotations

import uuid
from pathlib import Path
from typing import Any, Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .agents import split_items
from .models import LumaChatRequest, LumaChatResponse, WebsiteGenerationRequest, WebsiteGenerationResponse
from .orchestrator import (
    LyraOrchestrator,
    assistant_message_for_state,
    next_question_for_state,
    normalize_state_payload,
    site_plan_from_state,
)


ROOT_DIR = Path(__file__).resolve().parents[2]
orchestrator = LyraOrchestrator()

app = FastAPI(title="KREATON LYRA API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz")
@app.get("/")
async def healthz() -> Dict[str, Any]:
    return {"status": "ok", "service": "kreaton-lyra-api"}


@app.post("/api/luma/chat", response_model=LumaChatResponse)
@app.post("/api/ai/intake-assistant", response_model=LumaChatResponse)
async def luma_chat(request: LumaChatRequest) -> LumaChatResponse:
    state = normalize_state_payload(request.current)
    if request.selectedTemplateId and not state.selectedTemplateId:
        state.selectedTemplateId = request.selectedTemplateId

    final_state = await orchestrator.run(request.message, state)
    ready = not final_state.missingImportantFields
    plan = site_plan_from_state(final_state)

    return LumaChatResponse(
        assistantMessage=assistant_message_for_state(final_state),
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
            "websiteType": final_state.websiteType,
            "selectedTemplateId": final_state.selectedTemplateId,
            "selectedTemplateName": final_state.selectedTemplateName,
            "catalogType": final_state.catalogType,
            "colors": final_state.colors,
            "typography": final_state.typography,
            "generatedCopy": final_state.generatedCopy,
            "catalogItems": final_state.catalogItems,
            "sitePlan": plan,
        },
        nextQuestion=next_question_for_state(final_state),
        readyToGenerate=ready,
        missingImportantFields=final_state.missingImportantFields,
        confidence=final_state.confidence,
        selectedTemplateId=final_state.selectedTemplateId,
        selected_template_id=final_state.selectedTemplateId,
        sitePlan=plan,
        used_dev_fallback=False,
    )


@app.post("/ai/website-builder", response_model=WebsiteGenerationResponse)
async def website_builder(request: WebsiteGenerationRequest) -> WebsiteGenerationResponse:
    payload = request.model_dump()
    state = normalize_state_payload({
        "businessName": request.businessName or request.business_name,
        "businessDescription": request.businessDescription or request.business_description,
        "industry": request.industry,
        "location": request.location,
        "servicesProducts": request.servicesProducts or request.services_products,
        "targetAudience": request.targetAudience or request.target_audience,
        "preferredTone": request.preferredTone or request.preferred_tone,
        "preferredColors": request.preferredColors or request.preferred_colors,
        "contactInfo": request.contactInfo or request.contact_info,
        "logoUrl": request.logoUrl,
        "photoUrls": request.photoUrls,
        "selectedLanguage": request.selectedLanguage,
        "selectedTemplateId": request.selected_template_id or request.designStrategy.get("selectedTemplateId"),
    })
    prompt_context = " ".join(str(value) for value in payload.values() if value)
    final_state = await orchestrator.run(prompt_context, state)
    schema = build_schema_from_state(final_state)
    return WebsiteGenerationResponse(
        website_schema=schema,
        storage_status="generated",
        used_dev_mock=False,
        business_id=f"biz_{uuid.uuid4().hex[:10]}",
        site_id=f"site_{uuid.uuid4().hex[:10]}",
        generation_id=f"gen_{uuid.uuid4().hex[:10]}",
    )


def build_schema_from_state(state) -> Dict[str, Any]:
    name = state.businessName or "Your Business"
    template_id = state.selectedTemplateId or "modern-store"
    copy = state.generatedCopy.get("hero", {})
    headline = copy.get("headline") or name
    subheadline = copy.get("subheadline") or state.businessDescription or ""
    primary_cta = copy.get("primaryCta") or "Explore"
    items = state.catalogItems or []
    colors = state.colors or {}

    return {
        "version": "1.0",
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
        "catalog_items": items,
        "global_components": {"logo_url": state.logoUrl or ""},
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
