from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator

from .agents import TEMPLATE_CATALOG
from .models import AgentResult, ProjectState, WebsiteType


try:
    from openai import AsyncOpenAI
except Exception:  # pragma: no cover - dependency may be absent in local dev
    AsyncOpenAI = None  # type: ignore[assignment]


ALLOWED_RENDERER_COMPONENTS = {
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


ALLOWED_SECTION_COMPONENT_TYPES = {
    "hero_split_conversion": "Hero",
    "hero_marketplace_search": "MarketplaceHero",
    "hero_editorial_product": "Hero",
    "category_rail": "CategoryRail",
    "product_grid_4x": "ProductGrid",
    "featured_products": "FeaturedProducts",
    "lookbook_strip": "Lookbook",
    "trust_strip": "TrustStrip",
    "story_block": "StoryBlock",
    "feature_spotlight": "FeatureSpotlight",
    "contact_panel": "Contact",
    "faq_block": "FAQ",
    "cta_band": "CTA",
    "booking_services": "BookingServices",
    "restaurant_menu": "RestaurantMenu",
    "service_areas": "ServiceAreas",
    "proof_panel": "ProofPanel",
}


SalesFlow = Literal[
    "online_sales",
    "quote_request",
    "booking",
    "lead_capture",
    "informational",
]

CatalogStrategy = Literal[
    "dense_marketplace_catalog",
    "listing_marketplace_catalog",
    "focused_online_store",
    "premium_editorial_catalog",
    "lookbook_collection_catalog",
    "restaurant_menu_catalog",
    "booking_menu_catalog",
    "booking_service_catalog",
    "home_services_quote_catalog",
    "service_lead_catalog",
    "service_area_catalog",
    "company_services_catalog",
    "digital_offer_catalog",
    "b2b_solution_catalog",
    "industrial_supplier_catalog",
    "real_estate_listing_catalog",
    "luxury_high_ticket_catalog",
    "education_course_catalog",
    "medical_wellness_service_catalog",
    "legal_professional_services_catalog",
    "lead_funnel_offer_catalog",
]


class DesignTokens(BaseModel):
    model_config = ConfigDict(extra="forbid")

    background: str = "#ffffff"
    surface: str = "#f8fafc"
    primary: str = "#111827"
    secondary: str = "#475569"
    accent: str = "#14b8a6"
    text: str = "#0f172a"
    headingFont: str = "Inter"
    bodyFont: str = "Inter"


class CopyProps(BaseModel):
    model_config = ConfigDict(extra="forbid")

    badge: Optional[str] = None
    headline: Optional[str] = None
    subheadline: Optional[str] = None
    body: Optional[str] = None
    ctaPrimary: Optional[str] = None
    ctaSecondary: Optional[str] = None


class MediaProps(BaseModel):
    model_config = ConfigDict(extra="forbid")

    imageSearchQuery: Optional[str] = None
    imageUrl: Optional[str] = None
    alt: Optional[str] = None
    visualDirection: Optional[str] = None


class SectionBlock(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    sectionId: str
    componentType: str
    variant: str = "default"
    purpose: str = ""
    copyProps: CopyProps = Field(default_factory=CopyProps, alias="copy")
    media: Optional[MediaProps] = None
    dataBinding: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("componentType")
    @classmethod
    def component_type_must_be_known(cls, value: str) -> str:
        if value not in ALLOWED_SECTION_COMPONENT_TYPES:
            raise ValueError(f"Unsupported component type: {value}")
        return value


class PageSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    pageId: str
    title: str
    slug: str
    sections: List[SectionBlock] = Field(default_factory=list)


class AIWebGenerationResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reasoningSummary: str
    templateId: str
    websiteType: WebsiteType
    catalogStrategy: CatalogStrategy
    salesFlow: SalesFlow
    targetAudience: str
    designTokens: DesignTokens = Field(default_factory=DesignTokens)
    pages: List[PageSchema] = Field(default_factory=list)
    catalogCategories: List[str] = Field(default_factory=list)
    catalogItems: List[Dict[str, Any]] = Field(default_factory=list)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)

    @field_validator("templateId")
    @classmethod
    def template_must_exist(cls, value: str) -> str:
        if value not in TEMPLATE_CATALOG:
            raise ValueError(f"Unsupported template id: {value}")
        return value

    @model_validator(mode="after")
    def catalog_strategy_must_match_template(self) -> "AIWebGenerationResponse":
        expected = TEMPLATE_CATALOG[self.templateId]["catalogType"]
        if self.catalogStrategy != expected:
            raise ValueError(
                f"catalogStrategy must match selected template catalogType: expected {expected}, got {self.catalogStrategy}"
            )
        return self


AISitePlan = AIWebGenerationResponse


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
    template = TEMPLATE_CATALOG[plan.templateId]
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

    pages = []
    hero_copy: Dict[str, str] = {}
    for page in plan.pages:
        sections = []
        for section in page.sections:
            renderer_component = ALLOWED_SECTION_COMPONENT_TYPES[section.componentType]
            section_copy = section.copyProps.model_dump(exclude_none=True)
            if not hero_copy and section_copy and renderer_component in {"Hero", "MarketplaceHero"}:
                hero_copy = section_copy
            sections.append({
                "sectionId": section.sectionId,
                "component": renderer_component,
                "componentType": section.componentType,
                "variant": section.variant,
                "purpose": section.purpose,
                "editable": {
                    "copy": section_copy,
                    "media": section.media.model_dump(exclude_none=True) if section.media else {},
                    "dataBinding": section.dataBinding,
                },
            })
        pages.append({
            "pageKey": page.pageId,
            "pageId": page.pageId,
            "title": page.title,
            "slug": page.slug,
            "sections": sections,
        })

    return {
        "websiteType": plan.websiteType,
        "selectedTemplateId": plan.templateId,
        "selectedTemplateName": template["name"],
        "catalogType": plan.catalogStrategy,
        "salesFlow": plan.salesFlow,
        "targetAudience": plan.targetAudience,
        "colors": {
            "background": plan.designTokens.background,
            "surface": plan.designTokens.surface,
            "primary": plan.designTokens.primary,
            "secondary": plan.designTokens.secondary,
            "accent": plan.designTokens.accent,
            "text": plan.designTokens.text,
        },
        "typography": {
            "heading": plan.designTokens.headingFont,
            "body": plan.designTokens.bodyFont,
        },
        "generatedCopy": {
            "hero": {
                "headline": hero_copy.get("headline", ""),
                "subheadline": hero_copy.get("subheadline", ""),
                "primaryCta": hero_copy.get("ctaPrimary", ""),
                "secondaryCta": hero_copy.get("ctaSecondary", ""),
            },
            "pages": pages,
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
            "allowedComponentTypes": sorted(ALLOWED_SECTION_COMPONENT_TYPES),
            "requiredOutput": {
                "websiteType": "one allowed WebsiteType",
                "templateId": "one id from allowedTemplates",
                "catalogStrategy": "matching catalog model",
                "targetAudience": "specific buyer profile",
                "salesFlow": "online_sales | quote_request | booking | lead_capture | informational",
                "designTokens": {
                    "background": "#hex",
                    "surface": "#hex",
                    "primary": "#hex",
                    "secondary": "#hex",
                    "accent": "#hex",
                    "text": "#hex",
                    "headingFont": "font name",
                    "bodyFont": "font name",
                },
                "pages": [{
                    "pageId": "home",
                    "title": "Home",
                    "slug": "/",
                    "sections": [{
                        "sectionId": "home-hero",
                        "componentType": "hero_split_conversion",
                        "variant": "template-aware variant",
                        "purpose": "why this section exists",
                        "copy": {
                            "badge": "public copy",
                            "headline": "public copy",
                            "subheadline": "public copy",
                            "ctaPrimary": "button",
                            "ctaSecondary": "button",
                        },
                        "media": {
                            "imageSearchQuery": "visual search phrase",
                            "visualDirection": "art direction",
                        },
                        "dataBinding": {"source": "catalogItems"},
                    }],
                }],
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
- templateId must be exactly one id from allowedTemplates.
- sections[].componentType must be exactly one allowed component type.
- Treat the client's intake as private strategy, not public copy.
- Do not paste raw client notes into visible website text.
- If a client sells a focused product family such as jewelry, handmade accessories, fashion, candles, beauty, or crafts, choose a focused store/showroom template, not a broad marketplace.
- Choose a broad marketplace only for explicit Amazon/general-store intent or unrelated multi-category catalogs.
- Generate polished public copy in selectedLanguage.
- Generate category names that match the actual product/service category.
- Keep the output editable: page titles, section blocks, copy, media intent, catalog categories and items must be represented as JSON values.
- You may use media.imageSearchQuery and media.visualDirection, but do not fabricate final image URLs unless provided by the client.
""".strip()
