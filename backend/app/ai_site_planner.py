from __future__ import annotations

import json
import os
import re
from typing import Any, Dict, List, Literal, Optional
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator

from .agents import TEMPLATE_CATALOG, normalize_template_id, semantic_seed_catalog, state_is_commerce_seed_target, unsplash_seed_url
from .color_theory import build_palette
from .typography_theory import build_typography_scale
from .image_assets import attach_image_asset
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
    "QuoteRequestForm",
    "CapabilitiesEquipment",
    "PortfolioGallery",
    "VideoShowcase",
    "CourseOffering",
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
    "quote_request_form": "QuoteRequestForm",
    "capabilities_equipment": "CapabilitiesEquipment",
    "portfolio_gallery": "PortfolioGallery",
    "video_showcase": "VideoShowcase",
    "QuoteRequestForm": "QuoteRequestForm",
    "CapabilitiesEquipment": "CapabilitiesEquipment",
    "PortfolioGallery": "PortfolioGallery",
    "VideoShowcase": "VideoShowcase",
    "course_offering": "CourseOffering",
    "CourseOffering": "CourseOffering",
}


SalesFlow = Literal[
    "online_sales",
    "quote_request",
    "booking",
    "lead_capture",
    "informational",
]

PaletteStyle = Literal["elegante", "organico", "tecnologico", "calido"]

CatalogStrategy = Literal[
    "dense_marketplace_catalog",
    "single_vendor_dense_catalog",
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


class LogoConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    requires_ai_generation: bool
    generation_prompt: str = Field(min_length=80, max_length=600)


class BrandIdentity(BaseModel):
    model_config = ConfigDict(extra="forbid")

    palette_style: PaletteStyle
    font_family_headings: str = Field(min_length=2, max_length=80)
    font_family_body: str = Field(min_length=2, max_length=80)
    logo_config: LogoConfig


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


class MarketplaceGridItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str = Field(min_length=2, max_length=90)
    category: str = Field(min_length=2, max_length=60)
    description: str = Field(min_length=8, max_length=180)
    price: str = Field(min_length=1, max_length=32)
    rating: float = Field(ge=4.2, le=5.0)
    badge: str = Field(min_length=2, max_length=40)
    imageSearchQuery: str = Field(min_length=4, max_length=140)


class MarketplaceGridBinding(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: List[MarketplaceGridItem] = Field(min_length=12, max_length=16)


class RestaurantMenuItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=2, max_length=80)
    description: str = Field(min_length=8, max_length=180)
    price: str = Field(min_length=1, max_length=32)
    tags: List[str] = Field(default_factory=list, max_length=4)


class RestaurantMenuCategory(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=2, max_length=60)
    items: List[RestaurantMenuItem] = Field(min_length=3, max_length=8)


class RestaurantMenuBinding(BaseModel):
    model_config = ConfigDict(extra="forbid")

    categories: List[RestaurantMenuCategory] = Field(min_length=3, max_length=6)


class SpecItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    specLabel: str = Field(min_length=2, max_length=50)
    specValue: str = Field(min_length=1, max_length=80)


class SpecsShowcaseBinding(BaseModel):
    model_config = ConfigDict(extra="forbid")

    specs: List[SpecItem] = Field(min_length=4, max_length=8)


class VideoShowcaseBinding(BaseModel):
    model_config = ConfigDict(extra="forbid")

    videoUrl: str

    @field_validator("videoUrl")
    @classmethod
    def video_url_must_be_supported(cls, value: str) -> str:
        parsed = urlparse(value)
        host = (parsed.hostname or "").lower()
        if parsed.scheme not in {"http", "https"}:
            raise ValueError("Video URL must use HTTP(S)")
        if host == "youtu.be":
            video_id = parsed.path.strip("/").split("/")[0]
            if re.fullmatch(r"[A-Za-z0-9_-]{6,}", video_id or ""):
                return value
        if host in {"youtube.com", "www.youtube.com"}:
            query_match = re.search(r"(?:^|&)v=([A-Za-z0-9_-]{6,})(?:&|$)", parsed.query)
            path_match = re.fullmatch(r"/(?:embed|shorts)/([A-Za-z0-9_-]{6,})/?", parsed.path)
            if query_match or path_match:
                return value
        if host in {"vimeo.com", "www.vimeo.com", "player.vimeo.com"}:
            if re.fullmatch(r"/(?:video/)?\d+/?", parsed.path):
                return value
        raise ValueError("Video URL must point to a valid YouTube or Vimeo video")


class CourseOfferingBinding(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=2, max_length=120)
    description: str = Field(min_length=8, max_length=500)
    audience: str = Field(default="", max_length=180)
    includes: List[str] = Field(default_factory=list, max_length=8)
    videoUrl: Optional[str] = None
    ctaLabel: str = Field(min_length=2, max_length=60)
    ctaMode: Literal["purchase", "inquiry"] = "inquiry"
    priceLabel: Optional[str] = Field(default=None, max_length=40)
    itemId: Optional[str] = Field(default=None, max_length=120)

    @field_validator("videoUrl")
    @classmethod
    def optional_video_url_must_be_supported(cls, value: Optional[str]) -> Optional[str]:
        if not value:
            return None
        return VideoShowcaseBinding(videoUrl=value).videoUrl


DATA_BINDING_SCHEMAS = {
    "product_grid_4x": MarketplaceGridBinding,
    "featured_products": MarketplaceGridBinding,
    "restaurant_menu": RestaurantMenuBinding,
    "feature_spotlight": SpecsShowcaseBinding,
    "video_showcase": VideoShowcaseBinding,
    "VideoShowcase": VideoShowcaseBinding,
    "course_offering": CourseOfferingBinding,
    "CourseOffering": CourseOfferingBinding,
}


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

    @model_validator(mode="after")
    def required_data_binding_must_match_component(self) -> "SectionBlock":
        schema = DATA_BINDING_SCHEMAS.get(self.componentType)
        if schema:
            schema.model_validate(self.dataBinding)
        return self


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
    primaryOfferingCategory: Optional[str] = None
    secondaryOfferingCategories: List[str] = Field(default_factory=list)
    websiteType: WebsiteType
    catalogStrategy: CatalogStrategy
    salesFlow: SalesFlow
    targetAudience: str
    brand_identity: BrandIdentity
    pages: List[PageSchema] = Field(default_factory=list)
    catalogCategories: List[str] = Field(default_factory=list)
    catalogItems: List[Dict[str, Any]] = Field(default_factory=list)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)

    @field_validator("templateId", "primaryOfferingCategory", mode="before")
    @classmethod
    def template_must_exist(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        value = normalize_template_id(str(value or ""))
        if value not in TEMPLATE_CATALOG:
            raise ValueError(f"Unsupported template id: {value}")
        return value

    @field_validator("secondaryOfferingCategories", mode="before")
    @classmethod
    def secondary_templates_must_exist(cls, value: Any) -> List[str]:
        normalized: List[str] = []
        for item in value or []:
            template_id = normalize_template_id(str(item or ""))
            if template_id not in TEMPLATE_CATALOG:
                raise ValueError(f"Unsupported secondary offering category: {template_id}")
            if template_id not in normalized:
                normalized.append(template_id)
        return normalized

    @model_validator(mode="after")
    def catalog_strategy_must_match_template(self) -> "AIWebGenerationResponse":
        if self.primaryOfferingCategory and self.primaryOfferingCategory != self.templateId:
            raise ValueError("primaryOfferingCategory must match templateId")
        self.primaryOfferingCategory = self.primaryOfferingCategory or self.templateId
        self.secondaryOfferingCategories = [
            template_id
            for template_id in self.secondaryOfferingCategories
            if template_id != self.primaryOfferingCategory
        ]
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
        "selectedTemplateId": normalize_template_id(state.selectedTemplateId),
        "primaryOfferingCategory": normalize_template_id(state.primaryOfferingCategory),
        "secondaryOfferingCategories": state.secondaryOfferingCategories,
    }


COURSE_SIGNAL_RE = re.compile(
    r"\b(cursos?|courses?|academy|academia|clases?|training|formacion|taller(?:es)?|workshops?)\b",
    re.IGNORECASE,
)


def _course_page_labels(language: str) -> Dict[str, Any]:
    labels = {
        "en": {
            "page": "Courses",
            "description": "Practical instruction built around the products, tools, and methods of this business.",
            "audience": "For customers who want guided, hands-on learning.",
            "includes": ["Step-by-step instruction", "Materials and tools", "Practical project"],
            "purchase": "Enroll now",
            "inquiry": "Request course information",
        },
        "es": {
            "page": "Cursos",
            "description": "Formacion practica basada en los productos, herramientas y metodos de este negocio.",
            "audience": "Para clientes que buscan aprendizaje guiado y practico.",
            "includes": ["Instruccion paso a paso", "Materiales y herramientas", "Proyecto practico"],
            "purchase": "Inscribirme",
            "inquiry": "Solicitar informacion",
        },
        "fr": {
            "page": "Cours",
            "description": "Formation pratique autour des produits, outils et methodes de cette entreprise.",
            "audience": "Pour les clients qui souhaitent un apprentissage guide et pratique.",
            "includes": ["Instructions pas a pas", "Materiels et outils", "Projet pratique"],
            "purchase": "S'inscrire",
            "inquiry": "Demander des informations",
        },
        "pt": {
            "page": "Cursos",
            "description": "Formacao pratica baseada nos produtos, ferramentas e metodos deste negocio.",
            "audience": "Para clientes que desejam aprendizagem guiada e pratica.",
            "includes": ["Instrucao passo a passo", "Materiais e ferramentas", "Projeto pratico"],
            "purchase": "Inscrever-se",
            "inquiry": "Solicitar informacoes",
        },
    }
    return labels.get(language, labels["en"])


def _mark_course_catalog_items(
    catalog_items: List[Dict[str, Any]],
    state: Optional[ProjectState],
) -> None:
    if not state:
        return
    course_names = [
        _normalized_offering_name(item)
        for item in state.servicesProducts
        if COURSE_SIGNAL_RE.search(str(item or ""))
    ]
    for item in catalog_items:
        item_name = _normalized_offering_name(item.get("name"))
        if item_name and any(name == item_name or name in item_name or item_name in name for name in course_names):
            item["offer_type"] = "course"
            item["display_in_catalog"] = False


def _ensure_course_page(
    pages: List[Dict[str, Any]],
    state: Optional[ProjectState],
    catalog_items: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    if not state:
        return pages
    context = " ".join(filter(None, [
        state.businessDescription,
        state.industry,
        " ".join(state.servicesProducts),
    ]))
    if not COURSE_SIGNAL_RE.search(context):
        return pages

    labels = _course_page_labels(state.selectedLanguage or "en")
    named_courses = [str(item).strip() for item in state.servicesProducts if COURSE_SIGNAL_RE.search(str(item or ""))]
    if not named_courses:
        named_courses = [f"{labels['page']} - {state.businessName or 'Business'}"]

    video_urls: List[str] = []
    for page in pages:
        for section in page.get("sections", []):
            if section.get("type") != "VideoShowcase":
                continue
            editable = section.get("editable") or {}
            video_url = str(editable.get("videoUrl") or editable.get("video_url") or "").strip()
            if video_url:
                video_urls.append(video_url)

    purchase_mode = state.salesFlow == "online_sales"
    sections = []
    for index, course_name in enumerate(named_courses[:6]):
        matching_item = next(
            (item for item in catalog_items if _normalized_offering_name(course_name) in _normalized_offering_name(item.get("name"))),
            {},
        )
        binding = {
            "title": course_name[:120],
            "description": labels["description"],
            "audience": labels["audience"],
            "includes": labels["includes"],
            "videoUrl": video_urls[index] if index < len(video_urls) else None,
            "ctaLabel": labels["purchase"] if purchase_mode else labels["inquiry"],
            "ctaMode": "purchase" if purchase_mode else "inquiry",
            "priceLabel": str(matching_item.get("price_label") or "") or None,
            "itemId": str(matching_item.get("id") or f"course-{index + 1}"),
        }
        sections.append({
            "id": f"course-offering-{index + 1}",
            "sectionId": f"course-offering-{index + 1}",
            "type": "CourseOffering",
            "component": "CourseOffering",
            "componentType": "course_offering",
            "order": index + 1,
            "editable": {**binding, "dataBinding": binding},
            "dataBinding": binding,
            "settings": {"layout": "course_media_detail", "container_width": "wide"},
        })

    course_page = next((page for page in pages if page.get("page_key") in {"courses", "academy"}), None)
    if course_page:
        existing_types = {section.get("type") for section in course_page.get("sections", [])}
        if "CourseOffering" not in existing_types:
            course_page.setdefault("sections", []).extend(sections)
        return pages

    insert_at = next((index for index, page in enumerate(pages) if page.get("page_key") == "contact"), len(pages))
    pages.insert(insert_at, {
        "page_key": "courses",
        "pageKey": "courses",
        "pageId": "courses",
        "title": labels["page"],
        "slug": "/courses",
        "order": insert_at + 1,
        "sections": sections,
    })
    for index, page in enumerate(pages):
        page["order"] = index + 1
    return pages


def site_plan_to_updates(plan: AISitePlan, state: Optional[ProjectState] = None) -> Dict[str, Any]:
    template = TEMPLATE_CATALOG[plan.templateId]
    enrichment_context = " ".join([
        str(plan.templateId or ""),
        str(plan.catalogStrategy or ""),
        str(plan.websiteType or ""),
        str(plan.targetAudience or ""),
        str(state.businessName or "") if state else "",
        str(state.businessDescription or "") if state else "",
        str(state.industry or "") if state else "",
        " ".join(state.servicesProducts) if state else "",
        str(state.preferredColors or "") if state else "",
    ])
    catalog_items = []
    for index, item in enumerate(plan.catalogItems[:6]):
        name = str(item.get("name") or item.get("title") or f"Item {index + 1}").strip()
        if not name:
            continue
        image_query = str(item.get("imageSearchQuery") or item.get("image_search_query") or name)
        price_value = parse_price_amount(item.get("price_amount") or item.get("price"), None)
        normalized_item = {
            "id": str(item.get("id") or f"ai_item_{index + 1}"),
            "sku": str(item.get("sku") or f"AI-{index + 1:03d}"),
            "name": name[:80],
            "description": str(item.get("description") or ""),
            "category": str(item.get("category") or (plan.catalogCategories[index % len(plan.catalogCategories)] if plan.catalogCategories else "Featured")),
            "price_type": str(item.get("price_type") or "fixed"),
            "price": price_value if price_value is not None else "",
            "price_amount": price_value if price_value is not None else "",
            "currency": str(item.get("currency") or "USD"),
            "price_label": str(item.get("price_label") or (f"USD {price_value:.2f}" if price_value is not None else "")),
            "rating": item.get("rating") or 4.7,
            "badge": str(item.get("badge") or "Featured"),
            "imageSearchQuery": image_query,
            "image_url": unsplash_seed_url(image_query),
            "is_active": bool(item.get("is_active", True)),
            "is_featured": bool(item.get("is_featured", index < 4)),
            "sort_order": int(item.get("sort_order", index)),
        }
        catalog_items.append(attach_image_asset(normalized_item, context=enrichment_context))
    catalog_source = "ai_generated"
    if state:
        catalog_items, catalog_source = ensure_plan_seed_catalog_with_source(catalog_items, state, plan)
    _mark_course_catalog_items(catalog_items, state)

    pages = []
    hero_copy: Dict[str, str] = {}
    for page in plan.pages:
        sections = []
        for section in page.sections:
            renderer_component = ALLOWED_SECTION_COMPONENT_TYPES[section.componentType]
            section_copy = section.copyProps.model_dump(exclude_none=True)
            section_media = section.media.model_dump(exclude_none=True) if section.media else {}
            if not hero_copy and section_copy and renderer_component in {"Hero", "MarketplaceHero"}:
                hero_copy = section_copy
            sections.append({
                "id": section.sectionId,
                "sectionId": section.sectionId,
                "type": renderer_component,
                "component": renderer_component,
                "componentType": section.componentType,
                "variant": section.variant,
                "purpose": section.purpose,
                "dataBinding": section.dataBinding,
                "editable": {
                    **section_copy,
                    **section_media,
                    **section.dataBinding,
                    "copy": section_copy,
                    "media": section_media,
                    "dataBinding": section.dataBinding,
                },
            })
        pages.append({
            "page_key": page.pageId,
            "pageKey": page.pageId,
            "pageId": page.pageId,
            "title": page.title,
            "slug": page.slug,
            "order": len(pages) + 1,
            "sections": sections,
        })

    pages = _ensure_course_page(pages, state, catalog_items)

    anchor_color = state.colorProvenance.anchorColor if state else None
    niche_hint = " ".join(filter(None, [
        state.industry if state else "",
        state.businessDescription if state else "",
        " ".join(state.servicesProducts) if state else "",
        plan.templateId,
        plan.targetAudience,
    ]))
    palette = build_palette(anchor_color, plan.brand_identity.palette_style, niche_hint)
    typography_scale = build_typography_scale(plan.brand_identity.palette_style)
    brand_identity = {
        **plan.brand_identity.model_dump(),
        "primary_color": palette["primary"],
        "secondary_color": palette["accent"],
    }

    return {
        "websiteType": plan.websiteType,
        "selectedTemplateId": plan.templateId,
        "selectedTemplateName": template["name"],
        "primaryOfferingCategory": plan.primaryOfferingCategory,
        "secondaryOfferingCategories": plan.secondaryOfferingCategories,
        "catalogType": plan.catalogStrategy,
        "salesFlow": plan.salesFlow,
        "targetAudience": plan.targetAudience,
        "brand_identity": brand_identity,
        "colors": palette,
        "typography": {
            "heading": plan.brand_identity.font_family_headings,
            "body": plan.brand_identity.font_family_body,
        },
        "typographyScale": typography_scale,
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
            "brandIdentity": brand_identity,
        },
        "catalogItems": catalog_items,
        "catalogSource": catalog_source,
        "confidence": plan.confidence,
    }


def parse_price_amount(value: Any, fallback: Optional[float] = None) -> Optional[float]:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return round(float(value), 2)
    match = re.search(r"\d+(?:[.,]\d+)?", str(value or ""))
    if match:
        return round(float(match.group(0).replace(",", ".")), 2)
    return fallback


def ensure_plan_seed_catalog(catalog_items: List[Dict[str, Any]], state: ProjectState, plan: AISitePlan) -> List[Dict[str, Any]]:
    catalog, _catalog_source = ensure_plan_seed_catalog_with_source(catalog_items, state, plan)
    return catalog


def _normalized_offering_name(value: Any) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(value or "").lower()).strip()


def _client_offering_names(state: ProjectState) -> List[str]:
    names: List[str] = []
    seen: set[str] = set()
    for value in state.servicesProducts:
        name = str(value or "").strip()
        normalized = _normalized_offering_name(name)
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        names.append(name[:80])
        if len(names) == 6:
            break
    return names


def _matching_catalog_item(
    client_name: str,
    catalog_items: List[Dict[str, Any]],
    used_indexes: set[int],
) -> tuple[Optional[Dict[str, Any]], Optional[int]]:
    client_normalized = _normalized_offering_name(client_name)
    client_tokens = set(client_normalized.split())
    best_index: Optional[int] = None
    best_score = 0.0
    for index, item in enumerate(catalog_items):
        if index in used_indexes:
            continue
        item_normalized = _normalized_offering_name(item.get("name"))
        if not item_normalized:
            continue
        if item_normalized == client_normalized:
            return item, index
        item_tokens = set(item_normalized.split())
        score = len(client_tokens & item_tokens) / max(1, len(client_tokens))
        if (client_normalized in item_normalized or item_normalized in client_normalized) and score >= 0.5:
            score = max(score, 0.9)
        if score > best_score:
            best_score = score
            best_index = index
    if best_index is not None and best_score >= 0.6:
        return catalog_items[best_index], best_index
    return None, None


def _reconcile_client_catalog(
    catalog_items: List[Dict[str, Any]],
    seed: List[Dict[str, Any]],
    client_names: List[str],
    context: str,
) -> tuple[List[Dict[str, Any]], bool]:
    reconciled: List[Dict[str, Any]] = []
    used_model_indexes: set[int] = set()
    used_names = {_normalized_offering_name(name) for name in client_names}
    used_seed_fallback = False

    for index, client_name in enumerate(client_names):
        matched, matched_index = _matching_catalog_item(client_name, catalog_items, used_model_indexes)
        if matched_index is not None:
            used_model_indexes.add(matched_index)
        fallback = seed[index % len(seed)] if seed else {
            "id": f"client_item_{index + 1}",
            "sku": f"CLIENT-{index + 1:03d}",
            "name": client_name,
            "description": f"{client_name} presented with clear details and a professional customer experience.",
            "category": "Services",
            "price_amount": 99.0,
            "rating": 4.7,
            "badge": "Featured",
            "imageSearchQuery": client_name,
        }
        source = matched or fallback
        if matched is None:
            used_seed_fallback = True
        price = parse_price_amount(source.get("price_amount") or source.get("price"), float(fallback["price_amount"]))
        image_query = str(
            source.get("imageSearchQuery") or source.get("image_search_query") or client_name
        ) if matched else client_name
        item = {
            **source,
            "id": str(source.get("id") or f"client_item_{index + 1}") if matched else f"client_item_{index + 1}",
            "sku": str(source.get("sku") or f"CLIENT-{index + 1:03d}") if matched else f"CLIENT-{index + 1:03d}",
            "name": client_name,
            "description": str(source.get("description") or fallback["description"]),
            "category": str(source.get("category") or fallback["category"]),
            "price_type": str(source.get("price_type") or "fixed"),
            "price": price,
            "price_amount": price,
            "currency": str(source.get("currency") or "USD"),
            "price_label": str(source.get("price_label") or f"USD {float(price):.2f}"),
            "rating": source.get("rating") or fallback["rating"],
            "badge": str(source.get("badge") or fallback["badge"]),
            "imageSearchQuery": image_query,
            "image_url": unsplash_seed_url(image_query),
            "is_active": source.get("is_active", True),
            "is_featured": source.get("is_featured", index < 4),
            "sort_order": index,
        }
        reconciled.append(attach_image_asset(item, context=context))

    target_count = min(6, max(4, len(client_names)))
    extra_candidates = seed or [
        item for index, item in enumerate(catalog_items) if index not in used_model_indexes
    ]
    for fallback in extra_candidates:
        if len(reconciled) >= target_count:
            break
        fallback_name = _normalized_offering_name(fallback.get("name"))
        if not fallback_name or fallback_name in used_names:
            continue
        used_names.add(fallback_name)
        extra = {**fallback, "sort_order": len(reconciled)}
        reconciled.append(attach_image_asset(extra, context=context))
        used_seed_fallback = True

    return reconciled, used_seed_fallback


def ensure_plan_seed_catalog_with_source(
    catalog_items: List[Dict[str, Any]],
    state: ProjectState,
    plan: AISitePlan,
) -> tuple[List[Dict[str, Any]], Literal["ai_generated", "seed_fallback"]]:
    """Guarantee complete commerce seed data even if the model returns sparse catalogItems."""

    commerce_text = " ".join([
        plan.templateId,
        plan.catalogStrategy,
        plan.websiteType,
        state.businessDescription or "",
        state.industry or "",
        " ".join(state.servicesProducts),
    ])
    seed_context = " ".join([
        state.businessName or "",
        state.businessDescription or "",
        state.industry or "",
        " ".join(state.servicesProducts),
        state.targetAudience or "",
        state.preferredTone or "",
        state.preferredColors or "",
    ])
    is_commerce = state_is_commerce_seed_target(state, commerce_text) or any(term in commerce_text.lower() for term in [
        "marketplace",
        "store",
        "retail",
        "catalog",
        "product",
        "restaurant",
        "menu",
        "fashion",
        "luxury",
        "online",
        "tienda",
    ])
    generic = 0
    generic_name_pattern = re.compile(
        r"^(item|product|producto|featured item|new arrival|signature starter pack|pack inicial signature|customer favorite bundle|bundle favorito del cliente|premium upgrade|upgrade premium|limited edition drop|drop de edicion limitada|everyday essential|esencial de uso diario|gift ready selection|seleccion lista para regalo)$",
        re.IGNORECASE,
    )
    for item in catalog_items:
        name = str(item.get("name") or "").strip().lower()
        description = str(item.get("description") or "").strip().lower()
        price = item.get("price_amount") or item.get("price")
        if (
            not name
            or generic_name_pattern.search(name)
            or "editable product" in description
            or "price to be set" in description
            or "placeholder" in description
            or not description
            or not price
        ):
            generic += 1

    client_names = _client_offering_names(state)
    seed = semantic_seed_catalog(state, seed_context, count=6) if is_commerce else []
    if client_names:
        reconciled, used_seed_fallback = _reconcile_client_catalog(
            catalog_items,
            seed,
            client_names,
            seed_context,
        )
        return reconciled, "seed_fallback" if used_seed_fallback else "ai_generated"

    if not is_commerce:
        return catalog_items, "ai_generated"

    if len(catalog_items) < 4 or generic >= max(1, len(catalog_items) // 2):
        return seed, "seed_fallback"

    merged: List[Dict[str, Any]] = []
    used_seed_fill = False
    for index, item in enumerate(catalog_items[:6]):
        fallback = seed[index % len(seed)]
        price = parse_price_amount(item.get("price_amount") or item.get("price"), float(fallback["price_amount"]))
        image_query = item.get("imageSearchQuery") or item.get("image_search_query") or fallback["imageSearchQuery"]
        if (
            not item.get("name")
            or not item.get("description")
            or not item.get("category")
            or not (item.get("price_amount") or item.get("price"))
            or not (item.get("imageSearchQuery") or item.get("image_search_query"))
        ):
            used_seed_fill = True
        merged_item = {
            **item,
            "id": item.get("id") or fallback["id"],
            "sku": item.get("sku") or fallback["sku"],
            "name": item.get("name") or fallback["name"],
            "description": item.get("description") or fallback["description"],
            "category": item.get("category") or fallback["category"],
            "price_type": item.get("price_type") or "fixed",
            "price": price,
            "price_amount": price,
            "currency": item.get("currency") or "USD",
            "price_label": item.get("price_label") or f"USD {float(price):.2f}",
            "rating": item.get("rating") or fallback["rating"],
            "badge": item.get("badge") or fallback["badge"],
            "imageSearchQuery": image_query,
            "image_url": unsplash_seed_url(str(image_query)),
            "is_active": item.get("is_active", True),
            "is_featured": item.get("is_featured", index < 4),
            "sort_order": int(item.get("sort_order", index)),
        }
        merged.append(attach_image_asset(merged_item, context=seed_context))
    return merged, "seed_fallback" if used_seed_fill else "ai_generated"


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
                "primaryOfferingCategory": "the one allowed template id that matches the business's primary revenue offer; must equal templateId",
                "secondaryOfferingCategories": "zero or more other allowed template ids for meaningful secondary offers",
                "catalogStrategy": "matching catalog model",
                "targetAudience": "specific buyer profile",
                "salesFlow": "online_sales | quote_request | booking | lead_capture | informational",
                "brand_identity": {
                    "palette_style": "elegante | organico | tecnologico | calido",
                    "font_family_headings": "Google Font for headings",
                    "font_family_body": "Google Font for body text",
                    "logo_config": {
                        "requires_ai_generation": "true if user asks for an AI logo or has no logo and wants Lyra/KREATON to create one; otherwise false",
                        "generation_prompt": "Minimalist flat vector logo for a [niche] brand named [Name], [palette_style] style, geometric clean shapes, solid colors, no gradients, high detail, white background, trending on Dribbble --vector",
                    },
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
                "catalogItems": [{
                    "id": "prod_001",
                    "name": "specific commercial product name",
                    "description": "2 to 3 lines of persuasive public product copy",
                    "category": "specific category",
                    "price": 39.99,
                    "price_amount": 39.99,
                    "price_label": "USD 39.99",
                    "imageSearchQuery": "english-search-keyword"
                }],
                "reasoningSummary": "short internal reason",
                "confidence": 0.0,
            },
            "requiredDataBindingSchemas": {
                "product_grid_4x_or_featured_products": {
                    "items": "12 to 16 products. Each product requires id, name, category, description, price, rating from 4.2 to 5.0, badge, imageSearchQuery."
                },
                "restaurant_menu": {
                    "categories": "3 to 6 categories such as Entradas, Principales, Bebidas. Each category requires 3 to 8 items with name, description, price, tags."
                },
                "feature_spotlight": {
                    "specs": "4 to 8 specs. Each spec requires specLabel and specValue."
                },
                "quote_request_form": {
                    "fields": "Optional configurable fields with name, label, type, placeholder and required."
                },
                "capabilities_equipment": {
                    "items": "3 to 8 capabilities or equipment items with icon, title and description."
                },
                "portfolio_gallery": {
                    "items": "3 to 8 portfolio items with title, description, imageUrl and optional price or beforeImageUrl/afterImageUrl."
                },
                "video_showcase": {
                    "videoUrl": "A verified YouTube or Vimeo URL."
                },
                "course_offering": {
                    "title": "Course name",
                    "description": "What the course includes",
                    "audience": "Who the course is for",
                    "includes": "Up to 8 concrete learning inclusions",
                    "videoUrl": "Optional verified YouTube or Vimeo URL",
                    "ctaLabel": "Enrollment or information CTA",
                    "ctaMode": "purchase or inquiry",
                    "priceLabel": "Optional displayed price",
                },
            },
        }

        try:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(user_payload, ensure_ascii=False)},
            ]
            try:
                response = await self.client.chat.completions.create(
                    model=self.model,
                    temperature=0.15,
                    response_format=self._strict_response_format(),
                    messages=messages,
                )
            except Exception:
                response = await self.client.chat.completions.create(
                    model=self.model,
                    temperature=0.15,
                    response_format={"type": "json_object"},
                    messages=messages,
                )
            raw = response.choices[0].message.content or "{}"
            parsed = json.loads(raw)
            plan = AISitePlan.model_validate(parsed)
            return AgentResult(
                agentName=self.name,
                updates=site_plan_to_updates(plan, state),
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
    def _strict_response_format() -> Dict[str, Any]:
        return {
            "type": "json_schema",
            "json_schema": {
                "name": "kreaton_ai_site_plan",
                "strict": True,
                "schema": AIWebGenerationResponse.model_json_schema(),
            },
        }

    @staticmethod
    def _system_prompt() -> str:
        return """
You are LYRA, a senior UI/UX director and ecommerce strategist for KREATON.

You must design by selecting from the provided catalog only.

Hard rules:
- Return ONLY valid JSON. No markdown.
- Never return HTML, CSS, class names, JavaScript, or invented renderer components.
- templateId must be exactly one id from allowedTemplates.
- primaryOfferingCategory must identify the business's main revenue offer and MUST equal templateId. Decide the primary offer from the complete business model, not from isolated words.
- secondaryOfferingCategories may contain other allowed template ids only when those offers are genuinely secondary. Secondary signals must never override the primary business architecture.
- A pure course or academy remains education-course-academy-pro when downloadable materials support the teaching offer. A product retailer remains a commerce template when classes support product sales. A fashion boutique with styling classes remains fashion-first; a physical equipment retailer with training remains product-first.
- sections[].componentType must be exactly one allowed component type.
- For product_grid_4x and featured_products, dataBinding.items is required with 12 to 16 realistic complete products.
- For restaurant_menu, dataBinding.categories is required with complete menu categories and dishes.
- For feature_spotlight, dataBinding.specs is required with complete product/service specifications.
- Use quote_request_form for configurable quote capture, capabilities_equipment for reusable capability or equipment cards, portfolio_gallery for editorial/project/before-after work, and video_showcase only for verified YouTube or Vimeo URLs.
- When courses or training are a secondary offer beside physical products, keep the physical-commerce template and create a separate Courses page using one course_offering block per real course. Never turn physical products into course modules.
- Treat the client's intake as private strategy, not public copy.
- Do not paste raw client notes into visible website text.
- Identify the exact niche from the business name, industry, products/services and description before writing catalog or copy.
- The root JSON MUST include brand_identity.
- brand_identity.palette_style MUST be exactly one of: elegante, organico, tecnologico, calido.
- Infer palette_style from the client request. If unclear, choose the style that best fits the niche and target audience.
- Do not choose or return HEX colors or designTokens. KREATON calculates the complete palette deterministically from palette_style, niche, and verified client/logo color evidence.
- brand_identity.font_family_headings MUST be a real Google Font that fits the style. Examples: Playfair Display or Cinzel for elegante; Fraunces or Lora for organico; Space Grotesk or Sora for tecnologico; Manrope or Plus Jakarta Sans for calido.
- brand_identity.font_family_body MUST be a clean real Google Font such as Inter, Plus Jakarta Sans, Roboto, Manrope, or Source Sans 3.
- brand_identity.logo_config.requires_ai_generation MUST be true when the client asks for an AI logo, says they do not have a logo but wants one created, or asks Lyra/KREATON to create the brand identity. Otherwise it must be false.
- brand_identity.logo_config.generation_prompt MUST always be present and must follow this exact structure with real niche/name/style substitutions: "Minimalist flat vector logo for a [niche] brand named [Name], [palette_style] style, geometric clean shapes, solid colors, no gradients, high detail, white background, trending on Dribbble --vector"
- For commerce templates, catalogItems must contain exactly 4 to 6 real, niche-specific products. Do not use "Product 1", "Featured item", "Price editable", Lorem Ipsum, or empty fields.
- If clientSummary.servicesProducts or clientSummary.businessDescription names concrete products or services, catalogItems MUST preserve those real names as the catalog foundation. Polish only their public description, category, price, price label, and imageSearchQuery. Never replace a client-named offering with a different invented offering.
- This does not conflict with the private-notes rule: do not paste the client's raw sentences as public copy, but always preserve the identity and name of each concrete product or service they actually offer.
- Only when the client supplied fewer than 4 concrete offerings may you add niche-plausible offerings to reach the minimum of 4. Client-named offerings always come first and are never discarded.
- Each catalogItems object must include id, name, description, category, numeric price, price_amount, price_label, and imageSearchQuery.
- Do not generate image_url, imageUrl, stock image URLs, Unsplash URLs, CDN URLs, or any other image URL in catalogItems. KREATON resolves product imagery server-side from imageSearchQuery.
- If a client sells a focused product family such as jewelry, handmade accessories, fashion, candles, beauty, or crafts, choose a focused store/showroom template, not a broad marketplace.
- Choose a broad marketplace only for explicit Amazon/general-store intent or unrelated multi-category catalogs.
- Generate polished public copy in selectedLanguage.
- Generate category names that match the actual product/service category.
- Keep the output editable: page titles, section blocks, copy, media intent, catalog categories and items must be represented as JSON values.
- You may use media.imageSearchQuery and media.visualDirection for sections. For catalogItems, provide only imageSearchQuery; never provide image_url.
""".strip()
