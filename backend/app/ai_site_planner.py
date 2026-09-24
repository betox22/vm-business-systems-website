from __future__ import annotations

import json
import logging
import os
import re
from difflib import SequenceMatcher
from typing import Any, Dict, List, Literal, Optional, Union
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter, ValidationError, field_validator, model_validator

from .agents import (
    OPENAI_LONG_REQUEST_TIMEOUT_SECONDS,
    TEMPLATE_CATALOG,
    create_chat_completion_with_retry,
    normalize_template_id,
    semantic_seed_catalog,
    state_is_commerce_seed_target,
    template_catalog_for_state,
    unsplash_seed_url,
)
from .color_theory import build_palette, resolve_color
from .typography_theory import build_typography_scale
from .image_assets import ImageAssetRole, attach_image_asset, build_image_asset
from .models import AgentResult, ProjectState, WebsiteType
from .openai_usage import observed_http_client
from .openai_schema import make_openai_strict_schema


logger = logging.getLogger("kreaton")


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

EXECUTABLE_HOME_HERO_IDS = {
    "mega-retail-store": "retail_hero",
    "mega-marketplace": "marketplace_hero",
    "premium-product-store": "premium_hero",
    "luxury-high-ticket-pro": "luxury_hero",
    "education-course-academy-pro": "academy_hero",
    "medical-wellness-clinic-pro": "clinic_hero",
    "legal-professional-services-pro": "professional_hero",
    "b2b-saas-enterprise-pro": "enterprise_hero",
    "manufacturing-industrial-supplier-pro": "industrial_hero",
    "fashion-drop-pro": "fashion_hero",
    "corporate-company-pro": "corporate_hero",
    "home-services-premium": "home_service_hero",
    "local-services-pro-plus": "home_service_hero",
    "booking-appointment-pro": "booking_hero",
    "restaurant-food-business": "restaurant_hero",
    "digital-products-store": "digital_hero",
    "real-estate-listings-pro": "listing_hero",
    "lead-funnel-pro": "funnel_hero",
}

PLANNED_HERO_COMPONENT_TYPES = frozenset({
    "hero_split_conversion",
    "hero_marketplace_search",
    "hero_editorial_product",
})


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
    imageRole: Optional[ImageAssetRole] = None
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


class QuoteFieldBinding(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    label: str
    type: str
    placeholder: Optional[str] = None
    required: bool


class QuoteRequestBinding(BaseModel):
    model_config = ConfigDict(extra="forbid")

    fields: List[QuoteFieldBinding]


class CapabilityBindingItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    icon: Optional[str] = None
    title: str
    description: str


class CapabilitiesBinding(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: List[CapabilityBindingItem]


class PortfolioBindingItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str
    description: str
    imageUrl: str
    price: Optional[str] = None
    beforeImageUrl: Optional[str] = None
    afterImageUrl: Optional[str] = None


class PortfolioBinding(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: List[PortfolioBindingItem]


class CatalogSourceBinding(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source: str


class EmptyDataBinding(BaseModel):
    model_config = ConfigDict(extra="forbid")


class PlannerCatalogItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    description: str
    category: str
    price: Optional[float] = None
    price_amount: Optional[float] = None
    price_label: Optional[str] = None
    price_type: Literal["fixed", "starting_at", "quote_only"] = "quote_only"
    content_origin: Literal["client_declared", "ai_enriched", "seed_added"] = "ai_enriched"
    imageSearchQuery: str


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


class SectionMotionPlan(BaseModel):
    model_config = ConfigDict(extra="forbid")

    animate: bool = False
    conversionGoal: str = Field(default="none", max_length=120)
    trigger: Literal["load", "scroll", "interaction", "none"] = "none"
    target: Literal["headline_and_cta", "section_content", "primary_cta", "none"] = "none"
    treatment: Literal["hero_enter", "reveal_up", "stagger_cards", "cta_emphasis", "static"] = "static"

    @model_validator(mode="after")
    def motion_plan_must_be_purposeful(self) -> "SectionMotionPlan":
        goal = self.conversionGoal.strip()
        if not self.animate:
            if self.trigger != "none" or self.target != "none" or self.treatment != "static":
                raise ValueError("Static sections cannot declare an animation trigger, target, or treatment")
            self.conversionGoal = "none"
            return self
        if not goal or goal.lower() == "none":
            raise ValueError("Animated sections require one concrete conversionGoal")
        if self.trigger == "none" or self.target == "none" or self.treatment == "static":
            raise ValueError("Animated sections require a trigger, target, and non-static treatment")
        self.conversionGoal = goal
        return self


class SectionBlock(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    sectionId: str
    componentType: str
    variant: str = "default"
    purpose: str = ""
    motion: SectionMotionPlan = Field(default_factory=SectionMotionPlan)
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

    @model_validator(mode="after")
    def page_motion_budget_must_stay_focused(self) -> "PageSchema":
        if sum(1 for section in self.sections if section.motion.animate) > 3:
            raise ValueError("A page may animate at most 3 conversion-focused sections")
        return self


class AIWebGenerationResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reasoningSummary: str
    publicBusinessDescription: Optional[str] = None
    templateId: str
    primaryCatalogType: Optional[str] = None
    confidenceScore: float = Field(default=0.0, ge=0.0, le=1.0)
    alternativeCatalogTypes: List[str] = Field(default_factory=list, max_length=2)
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

    @field_validator("primaryCatalogType", mode="before")
    @classmethod
    def primary_catalog_type_must_exist(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = str(value or "").strip()
        allowed = {data["catalogType"] for data in TEMPLATE_CATALOG.values()}
        if normalized not in allowed:
            raise ValueError(f"Unsupported primary catalog type: {normalized}")
        return normalized

    @field_validator("alternativeCatalogTypes", mode="before")
    @classmethod
    def alternative_catalog_types_must_exist(cls, value: Any) -> List[str]:
        allowed = {data["catalogType"] for data in TEMPLATE_CATALOG.values()}
        normalized: List[str] = []
        for item in value or []:
            catalog_type = str(item or "").strip()
            if catalog_type not in allowed:
                raise ValueError(f"Unsupported alternative catalog type: {catalog_type}")
            if catalog_type not in normalized:
                normalized.append(catalog_type)
        return normalized[:2]

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


PlannerDataBinding = Union[
    MarketplaceGridBinding,
    RestaurantMenuBinding,
    SpecsShowcaseBinding,
    VideoShowcaseBinding,
    CourseOfferingBinding,
    QuoteRequestBinding,
    CapabilitiesBinding,
    PortfolioBinding,
    CatalogSourceBinding,
    EmptyDataBinding,
]


def site_plan_json_schema() -> Dict[str, Any]:
    """Return the planner model schema with closed shapes for dynamic payloads."""

    schema = AIWebGenerationResponse.model_json_schema(ref_template="#/$defs/{model}")
    definitions = schema.setdefault("$defs", {})

    binding_schema = TypeAdapter(PlannerDataBinding).json_schema(ref_template="#/$defs/{model}")
    definitions.update(binding_schema.pop("$defs", {}))
    definitions["SectionBlock"]["properties"]["dataBinding"] = binding_schema

    catalog_schema = PlannerCatalogItem.model_json_schema(ref_template="#/$defs/{model}")
    definitions.update(catalog_schema.pop("$defs", {}))
    definitions["PlannerCatalogItem"] = catalog_schema
    schema["properties"]["catalogItems"]["items"] = {"$ref": "#/$defs/PlannerCatalogItem"}
    return schema


def compact_template_catalog(
    template_catalog: Dict[str, Dict[str, str]] | None = None,
) -> List[Dict[str, Any]]:
    """Small catalog for prompts. Avoid sending full frontend templates."""

    return [
        {
            "id": template_id,
            "name": data["name"],
            "websiteType": data["websiteType"],
            "catalogType": data["catalogType"],
            "design_maturity": data["design_maturity"],
            "bestFor": data["audience"],
        }
        for template_id, data in (template_catalog or TEMPLATE_CATALOG).items()
    ]


PLANNER_LOW_CONFIDENCE_THRESHOLD = 0.58


def resolve_planner_template(
    plan: AIWebGenerationResponse,
    business_context: str,
    template_catalog: Dict[str, Dict[str, str]] | None = None,
) -> AIWebGenerationResponse:
    """Resolve the AI's catalog intent to one stable template decision."""

    template_catalog = TEMPLATE_CATALOG if template_catalog is None else template_catalog
    if not template_catalog:
        raise ValueError("No runtime-enabled templates are available.")
    compact_context = re.sub(r"\s+", " ", str(business_context or "").strip())
    meaningful_words = re.findall(r"[\wÀ-ÿ]+", compact_context, flags=re.UNICODE)
    is_very_short = len(compact_context) < 32 or len(meaningful_words) < 5
    confidence = plan.confidenceScore

    fallback_template_id = next(
        (template_id for template_id in ("premium-product-store", "corporate-company-pro") if template_id in template_catalog),
        next(iter(template_catalog)),
    )
    if is_very_short or confidence < PLANNER_LOW_CONFIDENCE_THRESHOLD:
        selected_template_id = fallback_template_id
    else:
        catalog_types = [
            plan.primaryCatalogType or plan.catalogStrategy,
            *plan.alternativeCatalogTypes,
        ]
        candidates: List[str] = []
        for catalog_type in catalog_types:
            for template_id, template in template_catalog.items():
                if template["catalogType"] == catalog_type and template_id not in candidates:
                    candidates.append(template_id)

        flagship_candidates = [
            template_id
            for template_id in candidates
            if template_catalog[template_id]["design_maturity"] == "flagship"
        ]
        selected_template_id = (
            flagship_candidates[0]
            if flagship_candidates
            else candidates[0] if candidates
            else fallback_template_id
        )

    selected = template_catalog[selected_template_id]
    secondary_templates: List[str] = []
    for catalog_type in plan.alternativeCatalogTypes:
        template_id = next(
            (
                candidate_id
                for candidate_id, template in template_catalog.items()
                if template["catalogType"] == catalog_type
            ),
            None,
        )
        if template_id and template_id != selected_template_id and template_id not in secondary_templates:
            secondary_templates.append(template_id)

    return plan.model_copy(update={
        "templateId": selected_template_id,
        "primaryCatalogType": selected["catalogType"],
        "primaryOfferingCategory": selected_template_id,
        "secondaryOfferingCategories": secondary_templates[:2],
        "websiteType": selected["websiteType"],
        "catalogStrategy": selected["catalogType"],
        "confidence": max(plan.confidence, confidence),
    })


def state_to_client_summary(state: ProjectState, user_input: str) -> Dict[str, Any]:
    contact_info = {
        key: str(value).strip()
        for key, value in (state.contactInfo or {}).items()
        if value is not None and str(value).strip()
    }
    return {
        "userInput": user_input,
        "businessName": state.businessName,
        "businessDescription": state.businessDescription,
        "industry": state.industry,
        "location": state.location,
        "servicesProducts": state.servicesProducts,
        "brandsCarried": state.brandsCarried,
        "targetAudience": state.targetAudience,
        "preferredTone": state.preferredTone,
        "preferredColors": state.preferredColors,
        "contactInfo": contact_info,
        "photoUrls": list(state.photoUrls or []),
        "videoUrls": list(state.videoUrls or []),
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

EXPLICIT_CATALOG_PRICE_RE = re.compile(
    r"(?:[$€£]\s*\d|\b(?:usd|eur|gbp|precio|price|cuesta|costs?)\b\s*[:=]?\s*\d|\d\s*(?:usd|eur|gbp|dolares?|dollars?|euros?)\b)",
    re.IGNORECASE,
)


def _state_has_explicit_catalog_pricing(state: ProjectState) -> bool:
    source = " ".join([
        state.businessDescription or "",
        *[str(item or "") for item in state.servicesProducts],
    ])
    return bool(EXPLICIT_CATALOG_PRICE_RE.search(source))


def _price_confirmation_label(language: str) -> str:
    return {
        "es": "Precio por confirmar",
        "fr": "Prix a confirmer",
        "pt": "Preco a confirmar",
    }.get(language, "Price to confirm")


def _without_invented_catalog_commerce_metadata(item: Dict[str, Any], language: str) -> Dict[str, Any]:
    cleaned = {
        key: value
        for key, value in item.items()
        if key not in {"rating", "review_count", "inventory_quantity", "stock"}
    }
    cleaned.update({
        "price": None,
        "price_value": None,
        "price_amount": None,
        "price_type": "quote_only",
        "price_label": _price_confirmation_label(language),
        "track_inventory": False,
    })
    return cleaned


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


def _premium_renderer_component(component_type: str, renderer_component: str, template_id: str) -> str:
    if template_id != "premium-product-store":
        return renderer_component
    if renderer_component in {"Hero", "MarketplaceHero"}:
        return "PremiumHero"
    if renderer_component == "StoryBlock":
        return "ProductStory"
    if renderer_component == "FeatureSpotlight":
        return "FeatureShowcase"
    return {
        "hero_editorial_product": "PremiumHero",
        "story_block": "ProductStory",
        "feature_spotlight": "FeatureShowcase",
    }.get(component_type, renderer_component)


def _section_image_role(component_type: str, renderer_component: str) -> ImageAssetRole:
    if renderer_component in {"PremiumHero", "Hero", "MarketplaceHero"}:
        return "hero_editorial"
    if renderer_component in {"ProductStory", "StoryBlock", "FeatureShowcase", "FeatureSpotlight"}:
        return "detail_texture"
    if renderer_component in {"CategoryRail", "Lookbook", "PortfolioGallery"}:
        return "category_lifestyle"
    if component_type in {"product_grid_4x", "featured_products"}:
        return "product_packshot"
    return "category_lifestyle"


def _resolve_section_media(
    section_media: Dict[str, Any],
    *,
    component_type: str,
    renderer_component: str,
    state: Optional[ProjectState],
    enrichment_context: str,
) -> Dict[str, Any]:
    role = _section_image_role(component_type, renderer_component)
    query = str(section_media.get("imageSearchQuery") or "").strip()
    if not query:
        offerings = " ".join(state.servicesProducts[:3]) if state else ""
        query = " ".join(filter(None, [
            state.businessName if state else "",
            state.industry if state else "",
            offerings,
            renderer_component,
        ]))
    if not query:
        return {**section_media, "imageRole": role}

    asset_input = {
        "name": str(section_media.get("alt") or (state.businessName if state else "") or query),
        "imageSearchQuery": query,
        "imageRole": role,
        "image_url": str(section_media.get("imageUrl") or ""),
    }
    asset = build_image_asset(asset_input, context=enrichment_context)
    return {
        **section_media,
        "imageSearchQuery": query,
        "imageRole": role,
        "imageUrl": asset["url"],
        "image_url": asset["url"],
        "imageAsset": asset,
    }


def _limit_premium_headline(copy: Dict[str, Any], maximum_words: int = 12) -> Dict[str, Any]:
    headline = str(copy.get("headline") or "").strip()
    words = headline.split()
    if len(words) > maximum_words:
        copy = {**copy, "headline": " ".join(words[:maximum_words]).rstrip(".,;:")}
    return copy


def _order_premium_sections(sections: List[Dict[str, Any]], template_id: str) -> List[Dict[str, Any]]:
    if template_id != "premium-product-store":
        return sections
    rank = {
        "PremiumHero": 0,
        "TrustStrip": 1,
        "ProductGrid": 2,
        "FeaturedProducts": 2,
        "ProductStory": 3,
        "FeatureShowcase": 4,
        "ProofPanel": 5,
        "Testimonials": 5,
        "CTA": 6,
    }
    ordered = sorted(
        enumerate(sections),
        key=lambda pair: (rank.get(pair[1].get("type"), 4), pair[0]),
    )
    return [section for _, section in ordered]


def _ensure_premium_home_sections(
    pages: List[Dict[str, Any]],
    *,
    template_id: str,
    state: Optional[ProjectState],
    catalog_items: List[Dict[str, Any]],
    hero_copy: Dict[str, str],
    enrichment_context: str,
) -> List[Dict[str, Any]]:
    if template_id != "premium-product-store" or not pages:
        return pages
    home = next((page for page in pages if page.get("page_key") == "home" or page.get("slug") == "/"), pages[0])
    sections = list(home.get("sections") or [])
    existing = {str(section.get("type") or "") for section in sections}
    language = state.selectedLanguage if state else "en"
    es = language == "es"
    business_name = str(state.businessName or "") if state else ""
    description = str(state.publicBusinessDescription or state.businessDescription or "") if state else ""
    offering_names = [str(item.get("name") or "").strip() for item in catalog_items[:3] if item.get("name")]
    trust_items = [
        "Disponibilidad consultable" if es else "Availability by inquiry",
        "Catalogo basado en la oferta real" if es else "Catalog based on the real offer",
    ]
    if state and state.salesFlow == "online_sales":
        trust_items.append("Venta en linea" if es else "Online ordering")
    if state and state.location:
        trust_items.append(str(state.location))

    if "TrustStrip" not in existing:
        sections.append({
            "id": "premium-trust",
            "sectionId": "premium-trust",
            "type": "TrustStrip",
            "component": "TrustStrip",
            "componentType": "trust_strip",
            "variant": "compact",
            "purpose": "Clarify the path from product discovery to availability inquiry.",
            "motion": SectionMotionPlan().model_dump(),
            "dataBinding": {},
            "editable": {
                "title": "Compra con informacion clara" if es else "Shop with clear information",
                "text": "Explora el catalogo y consulta disponibilidad antes de decidir." if es else "Explore the catalog and confirm availability before deciding.",
                "items": trust_items,
                "copy": {}, "media": {}, "dataBinding": {},
            },
        })
    if not existing.intersection({"ProductGrid", "FeaturedProducts"}):
        sections.append({
            "id": "premium-products",
            "sectionId": "premium-products",
            "type": "ProductGrid",
            "component": "ProductGrid",
            "componentType": "product_grid_4x",
            "variant": "premium_editorial",
            "purpose": "Present the client-declared catalog as the primary shopping path.",
            "motion": SectionMotionPlan().model_dump(),
            "dataBinding": {"source": "catalogItems"},
            "editable": {
                "title": "Seleccion destacada" if es else "Featured selection",
                "text": ", ".join(offering_names),
                "copy": {}, "media": {}, "dataBinding": {"source": "catalogItems"},
            },
        })
    if "ProductStory" not in existing:
        story_media = _resolve_section_media(
            {"imageSearchQuery": " ".join(filter(None, [business_name, *offering_names, "materials detail"]))},
            component_type="story_block",
            renderer_component="ProductStory",
            state=state,
            enrichment_context=enrichment_context,
        )
        sections.append({
            "id": "premium-story",
            "sectionId": "premium-story",
            "type": "ProductStory",
            "component": "ProductStory",
            "componentType": "story_block",
            "variant": "editorial_split",
            "purpose": "Explain the concrete offer and why it belongs in the buyer's day.",
            "motion": SectionMotionPlan().model_dump(),
            "dataBinding": {},
            "editable": {
                "title": "Elegidos para tu dia a dia" if es else "Selected for everyday use",
                "text": description,
                **story_media,
                "copy": {}, "media": story_media, "dataBinding": {},
            },
        })
    if "FeatureShowcase" not in existing:
        sections.append({
            "id": "premium-features",
            "sectionId": "premium-features",
            "type": "FeatureShowcase",
            "component": "FeatureShowcase",
            "componentType": "feature_spotlight",
            "variant": "feature_focus",
            "purpose": "Turn concrete catalog details into useful buying context.",
            "motion": SectionMotionPlan().model_dump(),
            "dataBinding": {},
            "editable": {
                "title": "Detalles que ayudan a elegir" if es else "Details that help you choose",
                "text": ", ".join(offering_names),
                "copy": {}, "media": {}, "dataBinding": {},
            },
        })
    if "CTA" not in existing:
        sections.append({
            "id": "premium-cta",
            "sectionId": "premium-cta",
            "type": "CTA",
            "component": "CTA",
            "componentType": "cta_band",
            "variant": "centered",
            "purpose": "Give the visitor one concrete next action.",
            "motion": SectionMotionPlan().model_dump(),
            "dataBinding": {},
            "editable": {
                "title": hero_copy.get("headline") or business_name,
                "text": hero_copy.get("subheadline") or description,
                "primary_button": "Consultar disponibilidad" if es else "Check availability",
                "copy": {}, "media": {}, "dataBinding": {},
            },
        })

    home["sections"] = _order_premium_sections(sections, template_id)
    for index, section in enumerate(home["sections"]):
        section["order"] = index + 1
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
        has_price = price_value is not None
        normalized_item = {
            "id": str(item.get("id") or f"ai_item_{index + 1}"),
            "sku": str(item.get("sku") or f"AI-{index + 1:03d}"),
            "name": name[:80],
            "description": str(item.get("description") or ""),
            "category": str(item.get("category") or (plan.catalogCategories[index % len(plan.catalogCategories)] if plan.catalogCategories else "Featured")),
            "price_type": str(item.get("price_type") or ("fixed" if has_price else "quote_only")),
            "price": price_value if price_value is not None else "",
            "price_amount": price_value if price_value is not None else "",
            "currency": str(item.get("currency") or "USD"),
            "price_label": str(item.get("price_label") or (f"USD {price_value:.2f}" if has_price else "")),
            "imageSearchQuery": image_query,
            "imageRole": "product_packshot",
            "content_origin": str(item.get("content_origin") or "ai_enriched"),
            "image_url": unsplash_seed_url(image_query),
            "is_active": bool(item.get("is_active", True)),
            "is_featured": bool(item.get("is_featured", index < 4)),
            "sort_order": int(item.get("sort_order", index)),
        }
        catalog_items.append(attach_image_asset(normalized_item, context=enrichment_context))
    catalog_source = "ai_generated"
    if state:
        catalog_items, catalog_source = ensure_plan_seed_catalog_with_source(catalog_items, state, plan)
    catalog_items = enforce_client_declared_catalog_facts(catalog_items, state)
    if state:
        if not _state_has_explicit_catalog_pricing(state):
            catalog_items = [_without_invented_catalog_commerce_metadata(item, state.selectedLanguage) for item in catalog_items]
    _mark_course_catalog_items(catalog_items, state)

    pages = []
    hero_copy: Dict[str, str] = {}
    for page in plan.pages:
        sections = []
        planned_home_heroes = [
            section for section in page.sections
            if section.componentType in PLANNED_HERO_COMPONENT_TYPES
        ] if page.pageId == "home" else []
        executable_hero_id = EXECUTABLE_HOME_HERO_IDS.get(plan.templateId)
        if len(planned_home_heroes) != 1 or any(
            section.sectionId == executable_hero_id and section is not planned_home_heroes[0]
            for section in page.sections
        ):
            executable_hero_id = None
        for section in page.sections:
            base_renderer_component = ALLOWED_SECTION_COMPONENT_TYPES[section.componentType]
            renderer_component = _premium_renderer_component(
                section.componentType,
                base_renderer_component,
                plan.templateId,
            )
            section_copy = section.copyProps.model_dump(exclude_none=True)
            if renderer_component == "PremiumHero":
                section_copy = _limit_premium_headline(section_copy)
            editable_copy = dict(section_copy)
            for source, target in (
                ("subheadline", "subtitle"),
                ("ctaPrimary", "primary_button"),
                ("ctaSecondary", "secondary_button"),
            ):
                if source in section_copy:
                    editable_copy[target] = section_copy[source]
            if section.componentType not in PLANNED_HERO_COMPONENT_TYPES:
                if "headline" in section_copy:
                    editable_copy["title"] = section_copy["headline"]
                if "body" in section_copy:
                    editable_copy["text"] = section_copy["body"]
            section_media = section.media.model_dump(exclude_none=True) if section.media else {}
            section_media = _resolve_section_media(
                section_media,
                component_type=section.componentType,
                renderer_component=renderer_component,
                state=state,
                enrichment_context=enrichment_context,
            )
            if not hero_copy and section_copy and renderer_component in {"Hero", "MarketplaceHero", "PremiumHero"}:
                hero_copy = section_copy
            section_id = (
                executable_hero_id
                if executable_hero_id and section is planned_home_heroes[0]
                else section.sectionId
            )
            sections.append({
                "id": section_id,
                "sectionId": section_id,
                "type": renderer_component,
                "component": renderer_component,
                "componentType": section.componentType,
                "variant": section.variant,
                "purpose": section.purpose,
                "motion": section.motion.model_dump(),
                "dataBinding": section.dataBinding,
                "editable": {
                    **editable_copy,
                    **section_media,
                    **section.dataBinding,
                    "copy": section_copy,
                    "media": section_media,
                    "dataBinding": section.dataBinding,
                },
            })
        sections = _order_premium_sections(sections, plan.templateId)
        for section_index, output_section in enumerate(sections):
            output_section["order"] = section_index + 1
        pages.append({
            "page_key": page.pageId,
            "pageKey": page.pageId,
            "pageId": page.pageId,
            "title": page.title,
            "slug": page.slug,
            "order": len(pages) + 1,
            "sections": sections,
        })

    pages = _ensure_premium_home_sections(
        pages,
        template_id=plan.templateId,
        state=state,
        catalog_items=catalog_items,
        hero_copy=hero_copy,
        enrichment_context=enrichment_context,
    )
    pages = _ensure_course_page(pages, state, catalog_items)

    anchor_color = state.colorProvenance.anchorColor if state else None
    niche_hint = " ".join(filter(None, [
        state.industry if state else "",
        state.businessDescription if state else "",
        " ".join(state.servicesProducts) if state else "",
        plan.templateId,
        plan.targetAudience,
    ]))
    supporting_colors = [
        evidence.color
        for evidence in (state.colorProvenance.colors if state else [])
        if evidence.source == "explicit_client" and evidence.color != anchor_color
    ]
    palette = build_palette(
        anchor_color,
        plan.brand_identity.palette_style,
        niche_hint,
        supporting_colors=supporting_colors,
    )
    explicit_secondary = resolve_color(state.colorProvenance.secondaryColor) if state else None
    if explicit_secondary:
        palette["secondary"] = explicit_secondary
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
        "publicBusinessDescription": str(plan.publicBusinessDescription or hero_copy.get("subheadline") or "").strip(),
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


DECLARED_PRICE_RE = re.compile(
    r"(?:\b(?:usd|eur|dolares?|dólares?|euros?|bs\.?|ves)\b|[$€])\s*(\d+(?:[.,]\d{1,2})?)"
    r"|(\d+(?:[.,]\d{1,2})?)\s*(?:\b(?:usd|eur|dolares?|dólares?|euros?|bs\.?|ves)\b|[$€])",
    re.IGNORECASE,
)


def _declared_price_for_item(name: str, state: Optional[ProjectState]) -> Optional[float]:
    if not state:
        return None
    name_tokens = _offering_match_tokens(name)
    sources = [*state.servicesProducts, state.businessDescription or ""]
    for source in sources:
        source_text = str(source or "")
        if name_tokens and not (name_tokens & _offering_match_tokens(source_text)):
            continue
        match = DECLARED_PRICE_RE.search(source_text)
        if match:
            return parse_price_amount(match.group(1) or match.group(2), None)
    return None


def _pending_price_label(language: str) -> str:
    return {
        "es": "Precio por confirmar",
        "fr": "Prix a confirmer",
        "pt": "Preco a confirmar",
    }.get(language, "Price to confirm")


def _client_declared_description(name: str, language: str) -> str:
    return {
        "es": f"Consulta disponibilidad, opciones y detalles de {name} directamente con el negocio.",
        "fr": f"Consultez la disponibilite, les options et les details de {name} directement aupres de l'entreprise.",
        "pt": f"Consulte disponibilidade, opcoes e detalhes de {name} diretamente com a empresa.",
    }.get(language, f"Ask the business about availability, options, and details for {name}.")


def _declared_catalog_name(name: object, client_names: List[str]) -> Optional[str]:
    normalized = _normalized_offering_name(name)
    exact = next((candidate for candidate in client_names if _normalized_offering_name(candidate) == normalized), None)
    if exact:
        return exact
    item_tokens = _offering_match_tokens(name)
    candidates = [
        candidate
        for candidate in client_names
        if item_tokens
        and item_tokens <= _offering_match_tokens(candidate)
        and len(item_tokens) >= 1
    ]
    return min(candidates, key=len) if candidates else None


CATALOG_MODEL_TOKEN_RE = re.compile(r"\b(?=[A-Za-z0-9-]*[A-Za-z])(?=[A-Za-z0-9-]*\d)[A-Za-z0-9][A-Za-z0-9-]{1,}\b")
CATALOG_BRAND_TOKEN_RE = re.compile(r"\b(?:[A-Z]{2,}|[A-Z][a-z]+[A-Z][A-Za-z]*)\b")
CATALOG_LEADING_IDENTITY_RE = re.compile(
    r"^([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ-]*(?:\s+[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ-]*){1,5})"
    r"\s+(?:offers?|combines?|features?|delivers?|provides?|is|ofrece|combina|incluye|brinda|es)\b"
)


def _description_introduces_undeclared_identity(description: object, state: Optional[ProjectState]) -> bool:
    text = str(description or "").strip()
    if not text or not state:
        return False
    client_context = " ".join([
        state.businessDescription or "",
        *state.servicesProducts,
        *getattr(state, "brandsCarried", []),
    ])
    normalized_context = _normalized_offering_name(client_context)
    suspect_tokens = [
        *CATALOG_MODEL_TOKEN_RE.findall(text),
        *CATALOG_BRAND_TOKEN_RE.findall(text),
    ]
    leading_identity = CATALOG_LEADING_IDENTITY_RE.search(text)
    if leading_identity:
        suspect_tokens.append(leading_identity.group(1))
    return any(_normalized_offering_name(token) not in normalized_context for token in suspect_tokens)


def enforce_client_declared_catalog_facts(
    catalog_items: List[Dict[str, Any]],
    state: Optional[ProjectState],
) -> List[Dict[str, Any]]:
    """Remove prices and product claims that were not supplied by the client."""

    language = state.selectedLanguage if state else "en"
    client_names = _client_offering_names(state) if state else []
    normalized: List[Dict[str, Any]] = []
    for source in catalog_items:
        item = dict(source)
        declared_name = _declared_catalog_name(item.get("name"), client_names)
        if declared_name:
            item["name"] = declared_name
            trusted_origin = item.get("content_origin") in {"client_declared", "ai_enriched"}
            if not trusted_origin or _description_introduces_undeclared_identity(item.get("description"), state):
                item["description"] = _client_declared_description(declared_name, language)
                item["content_origin"] = "client_declared"
            else:
                item["content_origin"] = item.get("content_origin") or "ai_enriched"
        else:
            item["content_origin"] = item.get("content_origin") or "seed_added"

        declared_price = _declared_price_for_item(str(item.get("name") or ""), state)
        if declared_price is None:
            item.update({
                "price_type": "quote_only",
                "price": None,
                "price_value": None,
                "price_amount": None,
                "price_label": _pending_price_label(language),
                "inventory_quantity": None,
                "track_inventory": False,
            })
        else:
            item.update({
                "price_type": "fixed",
                "price": declared_price,
                "price_value": declared_price,
                "price_amount": declared_price,
                "price_label": f"USD {declared_price:.2f}",
            })
        normalized.append(item)
    return normalized


def ensure_plan_seed_catalog(catalog_items: List[Dict[str, Any]], state: ProjectState, plan: AISitePlan) -> List[Dict[str, Any]]:
    catalog, _catalog_source = ensure_plan_seed_catalog_with_source(catalog_items, state, plan)
    return catalog


def _normalized_offering_name(value: Any) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(value or "").lower()).strip()


OFFERING_MATCH_STOPWORDS = {
    "a", "and", "como", "con", "de", "del", "el", "en", "for", "hacer", "how",
    "la", "las", "los", "online", "para", "the", "to", "y",
}

AMBIGUOUS_OFFERING_MATCH_TOKENS = {
    "accessori", "equipment", "equipo", "material", "product", "producto",
    "service", "servicio",
}

REQUIRED_OFFERING_CONCEPT_TOKENS = {"accessory", "course", "equipment", "material"}

OFFERING_MATCH_TOKEN_ALIASES = {
    "accessories": "accessory",
    "accessori": "accessory",
    "accesorio": "accessory",
    "curso": "course",
    "entrenamiento": "course",
    "equipo": "equipment",
    "filament": "material",
    "filamento": "material",
    "impresion": "print",
    "impresora": "print",
    "imprimir": "print",
    "kit": "equipment",
    "printer": "print",
    "printing": "print",
    "producto": "product",
    "resina": "material",
    "training": "course",
}


def _offering_match_tokens(value: Any) -> set[str]:
    tokens: set[str] = set()
    for token in _normalized_offering_name(value).split():
        if token in OFFERING_MATCH_STOPWORDS or len(token) < 3:
            continue
        if token.endswith("es") and len(token) > 5:
            token = token[:-2]
        elif token.endswith("s") and len(token) > 4:
            token = token[:-1]
        token = OFFERING_MATCH_TOKEN_ALIASES.get(token, token)
        tokens.add(token)
    return tokens


def _catalog_item_matches_offering(item: Dict[str, Any], client_name: str) -> bool:
    item_text = " ".join(str(item.get(key) or "") for key in (
        "name", "description", "category", "imageSearchQuery", "image_search_query"
    ))
    return bool(_offering_match_tokens(client_name) & _offering_match_tokens(item_text))


def _catalog_item_match_score(
    client_name: str,
    item: Dict[str, Any],
    context: str = "",
) -> Optional[float]:
    client_normalized = _normalized_offering_name(client_name)
    item_name_normalized = _normalized_offering_name(item.get("name"))
    if not client_normalized or not item_name_normalized:
        return None

    item_text = " ".join(str(item.get(key) or "") for key in (
        "name", "description", "category", "imageSearchQuery", "image_search_query"
    ))
    client_tokens = _offering_match_tokens(client_name)
    item_tokens = _offering_match_tokens(item_text)
    if not client_tokens:
        return None

    token_score = len(client_tokens & item_tokens) / len(client_tokens)
    name_ratio = SequenceMatcher(None, client_normalized, item_name_normalized).ratio()
    has_substring = client_normalized in item_name_normalized or item_name_normalized in client_normalized

    required_concepts = client_tokens & REQUIRED_OFFERING_CONCEPT_TOKENS
    if required_concepts and not required_concepts <= item_tokens:
        return None

    # A lone broad noun such as "materiales" is not enough to connect an
    # unrelated category. Require the candidate to also share business context.
    if len(client_tokens) == 1 and client_tokens <= AMBIGUOUS_OFFERING_MATCH_TOKENS:
        context_tokens = _offering_match_tokens(context) - client_tokens
        if item_name_normalized != client_normalized and not (context_tokens & item_tokens):
            return None

    if token_score >= 0.4 or name_ratio >= 0.55 or (has_substring and token_score >= 0.4):
        return max(token_score, name_ratio, 0.9 if has_substring and token_score >= 0.4 else 0.0)
    return None


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
    *,
    allow_used: bool = False,
    context: str = "",
) -> tuple[Optional[Dict[str, Any]], Optional[int]]:
    best_index: Optional[int] = None
    best_score = 0.0
    for index, item in enumerate(catalog_items):
        if not allow_used and index in used_indexes:
            continue
        score = _catalog_item_match_score(client_name, item, context)
        if score is None:
            continue
        if score > best_score:
            best_score = score
            best_index = index
    if best_index is not None:
        return catalog_items[best_index], best_index
    return None, None


def _reconcile_client_catalog(
    catalog_items: List[Dict[str, Any]],
    seed: List[Dict[str, Any]],
    client_names: List[str],
    context: str,
    business_name: str = "unknown",
) -> tuple[List[Dict[str, Any]], bool]:
    reconciled: List[Dict[str, Any]] = []
    used_model_indexes: set[int] = set()
    used_names = {_normalized_offering_name(name) for name in client_names}
    genuinely_matched_count = 0

    for index, client_name in enumerate(client_names):
        matched: Optional[Dict[str, Any]] = None
        matched_index: Optional[int] = None
        if index < len(catalog_items):
            ordinal_candidate = catalog_items[index]
            if (
                index not in used_model_indexes
                and _catalog_item_match_score(client_name, ordinal_candidate, context) is not None
            ):
                matched = ordinal_candidate
                matched_index = index
        if matched is None:
            matched, matched_index = _matching_catalog_item(
                client_name,
                catalog_items,
                used_model_indexes,
                context=context,
            )
        if matched is None:
            matched, matched_index = _matching_catalog_item(
                client_name,
                catalog_items,
                used_model_indexes,
                allow_used=True,
                context=context,
            )
        if matched_index is not None:
            used_model_indexes.add(matched_index)
            genuinely_matched_count += 1
        source = matched or {}
        if matched is None:
            logger.warning(
                "LYRA catalog item preserved without AI enrichment offering=%s business=%s",
                client_name,
                business_name or "unknown",
            )
        image_query = str(
            source.get("imageSearchQuery") or source.get("image_search_query") or client_name
        )
        if matched:
            price = parse_price_amount(source.get("price_amount") or source.get("price"), None)
            item = {
                **source,
                "id": str(source.get("id") or f"client_item_{index + 1}"),
                "sku": str(source.get("sku") or f"CLIENT-{index + 1:03d}"),
                "name": client_name,
                "description": str(source.get("description") or ""),
                "category": str(source.get("category") or client_name),
                "price_type": str(source.get("price_type") or ("fixed" if price is not None else "quote_only")),
                "price": price,
                "price_amount": price,
                "currency": str(source.get("currency") or "USD"),
                "price_label": str(source.get("price_label") or (f"USD {float(price):.2f}" if price is not None else "")),
                "imageSearchQuery": image_query,
                "image_url": unsplash_seed_url(image_query),
                "content_origin": "ai_enriched",
                "is_active": source.get("is_active", True),
                "is_featured": source.get("is_featured", index < 4),
                "sort_order": index,
            }
        else:
            item = {
                "id": f"client_item_{index + 1}",
                "sku": f"CLIENT-{index + 1:03d}",
                "name": client_name,
                "description": "",
                "category": client_name,
                "price_type": "quote_only",
                "price": None,
                "price_amount": None,
                "currency": "USD",
                "price_label": "",
                "rating": None,
                "review_count": None,
                "badge": "",
                "inventory_quantity": None,
                "track_inventory": False,
                "imageSearchQuery": client_name,
                "image_url": unsplash_seed_url(client_name),
                "content_origin": "client_declared",
                "is_active": True,
                "is_featured": index < 4,
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
        extra = {**fallback, "content_origin": "seed_added", "sort_order": len(reconciled)}
        reconciled.append(attach_image_asset(extra, context=context))

    used_seed_fallback = genuinely_matched_count * 2 < len(client_names)
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
    reusable_seed = state.catalogItems if state.catalogItems and all(
        isinstance(item, dict) and all(item.get(field) is not None for field in (
            "id", "sku", "name", "description", "category", "price_amount",
            "rating", "badge", "imageSearchQuery",
        ))
        for item in state.catalogItems
    ) else []
    seed = (reusable_seed or semantic_seed_catalog(state, seed_context, count=6)) if is_commerce else []
    if client_names:
        reconciled, used_seed_fallback = _reconcile_client_catalog(
            catalog_items,
            seed,
            client_names,
            seed_context,
            state.businessName or "unknown",
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
        self.model = os.getenv("OPENAI_SITE_PLANNER_MODEL") or os.getenv("OPENAI_MODEL") or "gpt-6-astra"
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.client = (
            AsyncOpenAI(api_key=self.api_key, timeout=OPENAI_LONG_REQUEST_TIMEOUT_SECONDS, http_client=observed_http_client(asynchronous=True))
            if AsyncOpenAI and self.api_key
            else None
        )

    async def run(self, state: ProjectState, user_input: str) -> AgentResult:
        if not self.client:
            return AgentResult(
                agentName=self.name,
                updates={},
                reasoningSummary="OpenAI planner skipped because OPENAI_API_KEY or openai package is not configured.",
                warnings=["OPENAI_API_KEY missing or OpenAI SDK unavailable"],
                confidence=0.0,
            )

        template_catalog = template_catalog_for_state(state)
        if not template_catalog:
            return AgentResult(
                agentName=self.name,
                updates={},
                reasoningSummary="OpenAI planner skipped because no runtime-enabled templates are available.",
                warnings=["No runtime-enabled templates are available."],
                confidence=0.0,
            )

        system_prompt = self._system_prompt()
        user_payload = {
            "clientSummary": state_to_client_summary(state, user_input),
            "allowedTemplates": compact_template_catalog(template_catalog),
            "allowedComponentTypes": sorted(ALLOWED_SECTION_COMPONENT_TYPES),
            "requiredOutput": {
                "publicBusinessDescription": "polished public-facing business summary in selectedLanguage; never raw intake text",
                "websiteType": "one allowed WebsiteType",
                "templateId": "one id from allowedTemplates",
                "primaryCatalogType": "catalogType for the business's main revenue offer",
                "confidenceScore": "confidence from 0 to 1 in the primary catalog decision",
                "alternativeCatalogTypes": "up to two plausible alternative catalogType values",
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
                        "motion": {
                            "animate": True,
                            "conversionGoal": "Focus attention on the primary offer and CTA",
                            "trigger": "load",
                            "target": "headline_and_cta",
                            "treatment": "hero_enter",
                        },
                        "copy": {
                            "badge": "public copy",
                            "headline": "public copy",
                            "subheadline": "public copy",
                            "ctaPrimary": "button",
                            "ctaSecondary": "button",
                        },
                        "media": {
                            "imageSearchQuery": "visual search phrase",
                            "imageRole": "hero_editorial",
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
                    "price": None,
                    "price_amount": None,
                    "price_label": "Price to confirm",
                    "price_type": "quote_only",
                    "content_origin": "client_declared",
                    "imageSearchQuery": "english-search-keyword"
                }],
                "reasoningSummary": "short internal reason",
                "confidence": 0.0,
            },
            "requiredDataBindingSchemas": {
                "product_grid_4x_or_featured_products": {
                    "items": "4 to 16 products. Each product requires id, name, category, description and imageSearchQuery. Price fields are nullable and quote_only unless the client supplied a price. Never invent ratings, badges, reviews or stock."
                },
                "restaurant_menu": {
                    "categories": "3 to 6 categories such as Entradas, Principales, Bebidas. Each category requires 3 to 8 items with name, description and tags. Price is nullable and must appear only when the client supplied it."
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

        fallback_warnings: List[str] = []
        try:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(user_payload, ensure_ascii=False)},
            ]
            try:
                response = await create_chat_completion_with_retry(
                    self.client,
                    stage="site_plan",
                    model=self.model,
                    temperature=0.15,
                    response_format=self._strict_response_format(),
                    messages=messages,
                )
            except Exception as strict_error:
                fallback_warnings.append(
                    "OpenAI planner strict response_format failed; used json_object fallback: "
                    f"{type(strict_error).__name__}: {strict_error}"
                )
                response = await create_chat_completion_with_retry(
                    self.client,
                    stage="site_plan_fallback",
                    model=self.model,
                    temperature=0.15,
                    response_format={"type": "json_object"},
                    messages=messages,
                )
            raw = response.choices[0].message.content or "{}"
            parsed = json.loads(raw)
            plan = AISitePlan.model_validate(parsed)
            plan = resolve_planner_template(
                plan,
                " ".join(filter(None, [
                    user_input,
                    state.businessName or "",
                    state.businessDescription or "",
                    state.industry or "",
                    " ".join(state.servicesProducts),
                ])),
                template_catalog,
            )
            updates = site_plan_to_updates(plan, state)
            if updates.get("catalogSource") == "seed_fallback":
                fallback_warnings.append("OpenAI planner catalog reconciliation used seed_fallback")
            return AgentResult(
                agentName=self.name,
                updates=updates,
                reasoningSummary=f"OpenAI site plan: {plan.reasoningSummary}",
                warnings=fallback_warnings,
                confidence=plan.confidence,
            )
        except (json.JSONDecodeError, ValidationError, Exception) as error:
            return AgentResult(
                agentName=self.name,
                updates={},
                reasoningSummary="OpenAI planner failed validation; local deterministic agents kept the flow usable.",
                warnings=[*fallback_warnings, str(error)],
                confidence=0.0,
            )

    @staticmethod
    def _strict_response_format() -> Dict[str, Any]:
        return {
            "type": "json_schema",
            "json_schema": {
                "name": "kreaton_ai_site_plan",
                "strict": True,
                "schema": make_openai_strict_schema(site_plan_json_schema()),
            },
        }

    @staticmethod
    def _system_prompt() -> str:
        return """
You are LYRA, a senior UI/UX director and ecommerce strategist for KREATON.

You must design by selecting from the provided catalog only.

COPY QUALITY GATE (hard validity requirement):
- Treat visible copy as invalid and rewrite it before returning JSON if it could describe an unrelated business after swapping the brand name.
- Never use these phrases anywhere in visible copy, including badges and CTAs: "Transform your", "Streamline your", "Unlock", "Elevate", "cutting-edge", "industry-leading", "Learn more", "Discover more", "Get started", "quality you can trust", or "solutions tailored to your needs".
- Run a silent specificity check before returning: the hero must contain at least one verified offer, buyer problem/outcome, use case, material/process, or differentiator that belongs to this client. The hero CTA must name the concrete next action or value.
- When clientSummary.servicesProducts is non-empty, the hero headline or subheadline MUST name at least one offering from that list using the client's real product/service words. Do not hide all concrete offerings behind an abstract category or lifestyle phrase.

Hard rules:
- Return ONLY valid JSON. No markdown.
- publicBusinessDescription must be a concise, polished customer-facing summary in selectedLanguage. Rewrite it from verified facts; never repeat the client's raw intake paragraph verbatim.
- Never return HTML, CSS, class names, JavaScript, or invented renderer components.
- templateId must be exactly one id from allowedTemplates.
- primaryCatalogType must be the catalogType that best describes the main revenue offer.
- confidenceScore must reflect how certain you are about primaryCatalogType, from 0 to 1.
- alternativeCatalogTypes may contain at most two allowed catalogType values and only when the fit is genuinely close.
- Prefer a flagship design_maturity template over a standard template when both are plausible for the same business context.
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
- clientSummary.brandsCarried is commercial context only. Never turn a carried brand into a catalog item unless the client explicitly named a concrete branded product model. Use the brands only to understand compatibility, assortment, and public copy without imitating their trademarks.
- This does not conflict with the private-notes rule: do not paste the client's raw sentences as public copy, but always preserve the identity and name of each concrete product or service they actually offer.
- Only when the client supplied fewer than 4 concrete offerings may you add niche-plausible offerings to reach the minimum of 4. Client-named offerings always come first and are never discarded.
- clientSummary.contactInfo contains verified public contact details supplied by the client. Contact sections must use those exact values when present; never invent a phone number, email, social handle, WhatsApp number, or address.
- clientSummary.photoUrls contains client-owned photos. Prefer those exact URLs in section media.imageUrl, starting with the hero or strongest primary visual, instead of replacing them with generic stock imagery. Never alter or invent a client photo URL.
- clientSummary.videoUrls contains client-provided videos. Use only those exact URLs for relevant VideoShowcase sections; never invent a video URL.
- Never invent a price, model number, brand, technical specification, capacity, rating, inventory quantity, discount, or shipping promise. Only use those facts when clientSummary explicitly contains them.
- Each catalogItems object must include id, name, description, category, imageSearchQuery, price, price_amount, price_label, price_type and content_origin. When no client-provided price exists, return null for all price values, price_type="quote_only", and a localized equivalent of "Price to confirm".
- Every visual section must assign media.imageRole to exactly one of hero_editorial, product_packshot, category_lifestyle, or detail_texture. Generate an independent imageSearchQuery for that section's conversion job; never reuse the first catalog product image as the hero or story visual.
- hero_editorial is a wide real-life editorial composition showing the offer in context; product_packshot is a clean individual product photograph; category_lifestyle shows a category in use; detail_texture is a close material/process/detail photograph. Do not ask for abstract gradients, 3D blobs, floating UI objects, or fantasy renders.
- For premium-product-store, use hero_editorial_product with a headline of 7 to 12 words, then trust_strip, product_grid_4x or featured_products, story_block with detail_texture, feature_spotlight for materials/differentiators, proof_panel only when clientSummary contains real proof, and a final cta_band. Do not fabricate testimonials or social proof to fill the sequence.
- Each catalogItems object must include id, name, description, category, price, price_amount, price_label, price_type, and imageSearchQuery.
- Prices are evidence-bound. Only return a numeric price/price_amount when the client explicitly supplied that price. Otherwise return null for price and price_amount, set price_type to "quote_only", and use the selected-language equivalent of "Price to confirm". Never estimate a plausible market price.
- Do not invent ratings, review counts, stock, inventory quantities, shipping promises, discounts, or badges that imply unverified facts.
- Do not generate image_url, imageUrl, stock image URLs, Unsplash URLs, CDN URLs, or any other image URL in catalogItems. KREATON resolves product imagery server-side from imageSearchQuery.
- If a client sells a focused product family such as jewelry, handmade accessories, fashion, candles, beauty, or crafts, choose a focused store/showroom template, not a broad marketplace.
- Choose a broad marketplace only for explicit Amazon/general-store intent or unrelated multi-category catalogs.
- Write as a senior direct-response copywriter and brand strategist, not as a generic website generator.
- Before writing visible copy, infer from verified client facts: the primary buyer, their concrete problem or desired outcome, the specific offer, the credible differentiator, and the next conversion action. Use this strategy internally; do not output framework labels or private reasoning in public copy.
- Every headline must be specific enough that it could not be pasted unchanged onto an unrelated competitor's website. Ground it in the client's real product/service, audience, use case, method, location, material, speed, specialization, or other verified differentiator. When concrete offerings and differentiators are available, the hero headline plus subheadline MUST name at least one real offering and one verified differentiator or buyer outcome.
- Structure the hero with AIDA: headline earns attention with a concrete outcome or differentiator; subheadline builds interest and desire by explaining what the business offers, for whom, and why it is meaningfully different; the primary CTA states the next action and its value.
- When the offer solves a clear operational or emotional pain, PAS may guide the hero or problem section: identify the real problem, make its consequence tangible without fearmongering, then present the client's verified offer as the solution. Never print "AIDA", "PAS", "Problem", "Agitate", or "Solution" as public labels.
- CTA labels must describe a specific action or outcome, such as exploring the named collection, booking the named service, requesting a tailored quote, or seeing the product in action. Never use vague buttons such as "Learn more", "Discover more", "Get started", or "Submit".
- Give every section one distinct conversion job: hero = differentiated promise; offer/catalog = concrete choice; story = credible reason to believe; proof = evidence; FAQ = remove objections; final CTA = decisive next step. Do not repeat the hero claim with different adjectives in every section.
- Every section MUST include a motion decision. Motion is a conversion tool, never decoration: set motion.animate=true only when movement helps the section's single conversion job, otherwise return the static motion object with animate=false, conversionGoal="none", trigger="none", target="none", treatment="static".
- Animate at most 3 sections on a page. Prefer hero_enter for the primary hero promise and CTA, reveal_up or stagger_cards for one high-value features/testimonials/pricing section, and cta_emphasis only for a decisive final action. Keep repeated, decorative, informational, or low-priority sections static.
- Each animated section gets exactly one short conversionGoal. Never request loops, parallax, autoplay decoration, continuous motion, or animation of every element. Motion targets must be headline_and_cta, section_content, or primary_cta and treatments must be hero_enter, reveal_up, stagger_cards, or cta_emphasis.
- Product and service descriptions must connect concrete features to buyer value. Prefer specific materials, process, fit, use case, deliverable, or operational outcome that the client actually supplied over empty superlatives.
- Never invent awards, customer counts, percentages, guarantees, certifications, scarcity, testimonials, performance claims, or competitive superiority. Persuasion must come from verified specificity, not fabricated proof.
- Never describe products as natural, organic, sustainable, eco-friendly, non-toxic, clinically proven, award-winning, fastest, safest, or best unless that exact attribute is supported by clientSummary.
- Avoid interchangeable filler and stock phrases, including "Transform your...", "Streamline your...", "Unlock...", "Elevate...", "cutting-edge", "leading", "solutions tailored to your needs", "quality you can trust", "take your business to the next level", "discover the difference", "something for everyone", "premium quality", and generic lifestyle lines that do not name a real offer or benefit.
- Match sentence rhythm and vocabulary to brand_identity.palette_style, preferred tone, audience sophistication, and selectedLanguage. Keep headlines concise, subheadlines concrete, and body copy natural rather than adjective-heavy.
- Generate polished public copy in selectedLanguage.
- Generate category names that match the actual product/service category.
- Keep the output editable: page titles, section blocks, copy, media intent, catalog categories and items must be represented as JSON values.
- You may use media.imageSearchQuery and media.visualDirection for sections. For catalogItems, provide only imageSearchQuery; never provide image_url.
""".strip()
