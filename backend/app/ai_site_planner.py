from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

from .agents import TEMPLATE_CATALOG
from .models import AgentResult, ProjectState, WebsiteType


try:
    from openai import AsyncOpenAI
except Exception:  # pragma: no cover - dependency may be absent in local dev
    AsyncOpenAI = None  # type: ignore[assignment]


ALLOWED_SECTION_COMPONENTS = {
    "Hero",
    "MarketplaceHero",
    "ProductGrid",
    "CategoryRail",
    "FeaturedProducts",
    "Lookbook",
    "TrustStrip",
    "StoryBlock",
    "FeatureSpotlight",
    "Contact",
    "FAQ",
    "CTA",
    "BookingServices",
    "RestaurantMenu",
    "ServiceAreas",
    "ProofPanel",
}


class PlannedSection(BaseModel):
    model_config = ConfigDict(extra="forbid")

    component: str
    variant: str = "default"
    purpose: str = ""
    editable: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("component")
    @classmethod
    def component_must_be_known(cls, value: str) -> str:
        if value not in ALLOWED_SECTION_COMPONENTS:
            raise ValueError(f"Unsupported component: {value}")
        return value


class PlannedPage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    pageKey: str
    title: str
    slug: str
    sections: List[PlannedSection] = Field(default_factory=list)


class AISitePlan(BaseModel):
    model_config = ConfigDict(extra="forbid")

    websiteType: WebsiteType
    selectedTemplateId: str
    catalogType: str
    targetAudience: str
    salesFlow: str
    colors: Dict[str, str] = Field(default_factory=dict)
    typography: Dict[str, str] = Field(default_factory=dict)
    hero: Dict[str, str] = Field(default_factory=dict)
    pages: List[PlannedPage] = Field(default_factory=list)
    catalogCategories: List[str] = Field(default_factory=list)
    catalogItems: List[Dict[str, Any]] = Field(default_factory=list)
    reasoningSummary: str
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)

    @field_validator("selectedTemplateId")
    @classmethod
    def template_must_exist(cls, value: str) -> str:
        if value not in TEMPLATE_CATALOG:
            raise ValueError(f"Unsupported template id: {value}")
        return value


def compact_template_catalog() -> List[Dict[str, Any]]:
    """Small catalog for prompts. Avoid sending full frontend templates."""

    return [
        {
            "id": template_id,
            "name": data["name"],
            "websiteType": data["websiteType"],
            "catalogType": data["catalogType"],
            "bestFor": data["audience"],
        }
        for template_id, data in TEMPLATE_CATALOG.items()
    ]


def state_to_client_summary(state: ProjectState, user_input: str) -> Dict[str, Any]:
    return {
        "userInput": user_input,
        "businessName": state.businessName,
        "businessDescription": state.businessDescription,
        "industry": state.industry,
        "location": state.location,
        "servicesProducts": state.servicesProducts,
        "targetAudience": state.targetAudience,
        "preferredTone": state.preferredTone,
        "preferredColors": state.preferredColors,
        "selectedLanguage": state.selectedLanguage,
        "salesFlow": state.salesFlow,
        "selectedTemplateId": state.selectedTemplateId,
    }


def site_plan_to_updates(plan: AISitePlan) -> Dict[str, Any]:
    template = TEMPLATE_CATALOG[plan.selectedTemplateId]
    catalog_items = []
    for index, item in enumerate(plan.catalogItems[:12]):
        name = str(item.get("name") or item.get("title") or f"Item {index + 1}").strip()
        if not name:
            continue
        catalog_items.append({
            "id": str(item.get("id") or f"ai_item_{index + 1}"),
            "sku": str(item.get("sku") or f"AI-{index + 1:03d}"),
            "name": name[:80],
            "description": str(item.get("description") or "Editable product or service generated from the strategy."),
            "category": str(item.get("category") or (plan.catalogCategories[index % len(plan.catalogCategories)] if plan.catalogCategories else "Featured")),
            "price_type": str(item.get("price_type") or "fixed"),
            "price_amount": item.get("price_amount") or "",
            "currency": str(item.get("currency") or "USD"),
            "price_label": str(item.get("price_label") or "Price editable"),
            "is_active": bool(item.get("is_active", True)),
            "is_featured": bool(item.get("is_featured", index < 4)),
            "sort_order": int(item.get("sort_order", index)),
        })

    return {
        "websiteType": plan.websiteType,
        "selectedTemplateId": plan.selectedTemplateId,
        "selectedTemplateName": template["name"],
        "catalogType": plan.catalogType,
        "salesFlow": plan.salesFlow,
        "targetAudience": plan.targetAudience,
        "colors": plan.colors,
        "typography": plan.typography,
        "generatedCopy": {
            "hero": {
                "headline": plan.hero.get("headline", ""),
                "subheadline": plan.hero.get("subheadline", ""),
                "primaryCta": plan.hero.get("primaryCta", ""),
                "secondaryCta": plan.hero.get("secondaryCta", ""),
            },
            "pages": [page.model_dump() for page in plan.pages],
            "templateUse": template["name"],
            "catalogCategories": plan.catalogCategories,
        },
        "catalogItems": catalog_items,
        "confidence": plan.confidence,
    }


class OpenAISitePlanAgent:
    """Server-side AI design director.

    This agent never returns HTML or CSS. It only returns a strict editable JSON
    plan using known templates and known renderer components.
    """

    name = "openai_site_planner"

    def __init__(self) -> None:
        self.model = os.getenv("OPENAI_SITE_PLANNER_MODEL") or os.getenv("OPENAI_MODEL") or "gpt-4o"
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.client = AsyncOpenAI(api_key=self.api_key) if AsyncOpenAI and self.api_key else None

    async def run(self, state: ProjectState, user_input: str) -> AgentResult:
        if not self.client:
            return AgentResult(
                agentName=self.name,
                updates={},
                reasoningSummary="OpenAI planner skipped because OPENAI_API_KEY or openai package is not configured.",
                warnings=["OPENAI_API_KEY missing or OpenAI SDK unavailable"],
                confidence=0.0,
            )

        system_prompt = self._system_prompt()
        user_payload = {
            "clientSummary": state_to_client_summary(state, user_input),
            "allowedTemplates": compact_template_catalog(),
            "allowedComponents": sorted(ALLOWED_SECTION_COMPONENTS),
            "requiredOutput": {
                "websiteType": "one allowed WebsiteType",
                "selectedTemplateId": "one id from allowedTemplates",
                "catalogType": "matching catalog model",
                "targetAudience": "specific buyer profile",
                "salesFlow": "online_sales | quote_request | booking | lead_capture | informational",
                "colors": {"background": "#hex", "surface": "#hex", "primary": "#hex", "secondary": "#hex", "accent": "#hex", "text": "#hex"},
                "typography": {"heading": "font name", "body": "font name"},
                "hero": {"headline": "public copy", "subheadline": "public copy", "primaryCta": "button", "secondaryCta": "button"},
                "pages": [{"pageKey": "home", "title": "Home", "slug": "/", "sections": [{"component": "Hero", "variant": "name", "purpose": "why", "editable": {}}]}],
                "catalogCategories": ["category names"],
                "catalogItems": [{"name": "item", "description": "public copy", "category": "category"}],
                "reasoningSummary": "short internal reason",
                "confidence": 0.0,
            },
        }

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                temperature=0.15,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": json.dumps(user_payload, ensure_ascii=False)},
                ],
            )
            raw = response.choices[0].message.content or "{}"
            parsed = json.loads(raw)
            plan = AISitePlan.model_validate(parsed)
            return AgentResult(
                agentName=self.name,
                updates=site_plan_to_updates(plan),
                reasoningSummary=f"OpenAI site plan: {plan.reasoningSummary}",
                confidence=plan.confidence,
            )
        except (json.JSONDecodeError, ValidationError, Exception) as error:
            return AgentResult(
                agentName=self.name,
                updates={},
                reasoningSummary="OpenAI planner failed validation; local deterministic agents kept the flow usable.",
                warnings=[str(error)],
                confidence=0.0,
            )

    @staticmethod
    def _system_prompt() -> str:
        return """
You are LYRA, a senior UI/UX director and ecommerce strategist for KREATON.

You must design by selecting from the provided catalog only.

Hard rules:
- Return ONLY valid JSON. No markdown.
- Never return HTML, CSS, class names, JavaScript, or invented renderer components.
- selectedTemplateId must be exactly one id from allowedTemplates.
- sections[].component must be exactly one allowed component.
- Treat the client's intake as private strategy, not public copy.
- Do not paste raw client notes into visible website text.
- If a client sells a focused product family such as jewelry, handmade accessories, fashion, candles, beauty, or crafts, choose a focused store/showroom template, not a broad marketplace.
- Choose a broad marketplace only for explicit Amazon/general-store intent or unrelated multi-category catalogs.
- Generate polished public copy in selectedLanguage.
- Generate category names that match the actual product/service category.
- Keep the output editable: page titles, sections, copy, catalog categories and items must be represented as JSON values.
""".strip()
