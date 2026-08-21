from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, ConfigDict


SupportedLanguage = Literal["en", "es", "fr", "pt"]
WebsiteType = Literal[
    "marketplace",
    "online_store",
    "premium_product",
    "restaurant",
    "booking",
    "services",
    "home_services",
    "corporate",
    "portfolio",
    "landing",
    "lead_funnel",
    "digital_products",
    "fashion",
    "b2b",
    "industrial",
    "real_estate",
    "luxury",
    "education",
    "clinic",
    "legal",
]
AssistantEmotion = Literal[
    "neutral",
    "happy",
    "thinking",
    "listening",
    "speaking",
    "building",
    "optimize",
    "success",
    "alert",
    "confused",
]
CatalogSource = Literal["ai_generated", "seed_fallback"]
ColorSource = Literal["explicit_client", "logo_extracted", "local_suggestion", "unknown"]


class ColorEvidence(BaseModel):
    model_config = ConfigDict(extra="ignore")

    color: str
    source: ColorSource


class ColorProvenance(BaseModel):
    model_config = ConfigDict(extra="ignore")

    anchorColor: Optional[str] = None
    anchorSource: ColorSource = "unknown"
    colors: List[ColorEvidence] = Field(default_factory=list)


class ProjectState(BaseModel):
    """Shared state every agent reads and updates.

    Field names stay stable and English because the frontend/database payloads
    already depend on that convention. Visible values can use selectedLanguage.
    """

    model_config = ConfigDict(extra="ignore")

    businessName: Optional[str] = None
    businessDescription: Optional[str] = None
    industry: Optional[str] = None
    location: Optional[str] = None
    servicesProducts: List[str] = Field(default_factory=list)
    targetAudience: Optional[str] = None
    preferredTone: Optional[str] = None
    preferredColors: Optional[str] = None
    contactInfo: Dict[str, Any] = Field(default_factory=dict)
    logoUrl: Optional[str] = None
    logoPreference: Optional[str] = None
    logoGenerationStatus: Optional[str] = None
    logoPalette: List[str] = Field(default_factory=list)
    colorProvenance: ColorProvenance = Field(default_factory=ColorProvenance)
    photoUrls: List[str] = Field(default_factory=list)
    videoUrls: List[str] = Field(default_factory=list)
    selectedLanguage: SupportedLanguage = "en"

    websiteIntent: Optional[str] = None
    websiteType: Optional[WebsiteType] = None
    selectedTemplateId: Optional[str] = None
    selectedTemplateName: Optional[str] = None
    primaryOfferingCategory: Optional[str] = None
    secondaryOfferingCategories: List[str] = Field(default_factory=list)
    catalogType: Optional[str] = None
    salesFlow: Optional[str] = None

    colors: Dict[str, str] = Field(default_factory=dict)
    typography: Dict[str, str] = Field(default_factory=dict)
    typographyScale: Dict[str, str] = Field(default_factory=dict)
    generatedCopy: Dict[str, Any] = Field(default_factory=dict)
    catalogItems: List[Dict[str, Any]] = Field(default_factory=list)
    catalogSource: Optional[CatalogSource] = None
    assets: Dict[str, Any] = Field(default_factory=dict)
    fieldMeta: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    missingImportantFields: List[str] = Field(default_factory=list)
    confidence: float = 0.0
    notes: List[str] = Field(default_factory=list)

    def update_safe(self, updates: Dict[str, Any]) -> None:
        valid_fields = set(self.model_fields.keys())
        for key, value in updates.items():
            if key in valid_fields and value is not None:
                setattr(self, key, value)


class AgentResult(BaseModel):
    model_config = ConfigDict(extra="ignore")

    agentName: str
    updates: Dict[str, Any] = Field(default_factory=dict)
    reasoningSummary: Optional[str] = None
    warnings: List[str] = Field(default_factory=list)
    confidence: float = 0.0


class LumaChatRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    current: Dict[str, Any] = Field(default_factory=dict)
    message: str = ""
    currentStep: Optional[str] = None
    current_step: Optional[str] = None
    history: List[Dict[str, Any]] = Field(default_factory=list)
    selectedTemplateId: Optional[str] = None
    sitePlan: Optional[Dict[str, Any]] = None
    previousSchema: Optional[Dict[str, Any]] = None


class LumaChatResponse(BaseModel):
    assistantMessage: str
    emotion: AssistantEmotion = "speaking"
    updatedFields: Dict[str, Any] = Field(default_factory=dict)
    nextQuestion: str = ""
    readyToGenerate: bool = False
    missingImportantFields: List[str] = Field(default_factory=list)
    confidence: float = 0.0
    selectedTemplateId: Optional[str] = None
    selected_template_id: Optional[str] = None
    sitePlan: Dict[str, Any] = Field(default_factory=dict)
    used_dev_fallback: bool = False


class WebsiteGenerationRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    business_name: Optional[str] = None
    businessName: Optional[str] = None
    business_description: Optional[str] = None
    businessDescription: Optional[str] = None
    industry: Optional[str] = None
    location: Optional[str] = None
    services_products: List[str] | str | None = None
    servicesProducts: List[str] | str | None = None
    target_audience: Optional[str] = None
    targetAudience: Optional[str] = None
    preferred_tone: Optional[str] = None
    preferredTone: Optional[str] = None
    preferred_colors: List[str] | str | None = None
    preferredColors: List[str] | str | None = None
    contact_info: Dict[str, Any] | str | None = None
    contactInfo: Dict[str, Any] | str | None = None
    logoUrl: Optional[str] = None
    logoPreference: Optional[str] = None
    logoPalette: List[str] = Field(default_factory=list)
    colorProvenance: ColorProvenance = Field(default_factory=ColorProvenance)
    brandStyle: Optional[str] = None
    intakeFollowupAnswer: Optional[str] = None
    photoUrls: List[str] = Field(default_factory=list)
    videoUrls: List[str] = Field(default_factory=list)
    selectedLanguage: SupportedLanguage = "en"
    selected_template_id: Optional[str] = None
    generatedSiteId: Optional[str] = None
    generated_site_id: Optional[str] = None
    projectId: Optional[str] = None
    project_id: Optional[str] = None
    sales_flow: Optional[str] = None
    salesFlow: Optional[str] = None
    fieldMeta: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    designStrategy: Dict[str, Any] = Field(default_factory=dict)


class WebsiteGenerationResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    website_schema: Dict[str, Any] = Field(alias="schema")
    catalog_source: CatalogSource = "seed_fallback"
    needs_more_info: bool = False
    missing_fields: List[str] = Field(default_factory=list)
    next_question: Optional[str] = None
    storage_status: str = "generated"
    used_dev_mock: bool = False
    business_id: Optional[str] = None
    site_id: Optional[str] = None
    generatedSiteId: Optional[str] = None
    projectId: Optional[str] = None
    generation_id: Optional[str] = None


class LyraEditRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    currentSchema: Dict[str, Any] = Field(default_factory=dict)
    instruction: str = ""
    selectedLanguage: SupportedLanguage = "en"
    userContext: Dict[str, Any] = Field(default_factory=dict)


class LyraEditResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    patchedSchema: Dict[str, Any] = Field(default_factory=dict)
    patchOperations: List[Dict[str, Any]] = Field(default_factory=list)
    patchSummary: str = ""
    changedFields: List[str] = Field(default_factory=list)
    usedAI: bool = False


class AssetUploadRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    businessId: str = ""
    siteId: str = ""
    assetType: str = "photo"
    fileName: str = "asset"
    contentType: str = "application/octet-stream"
    dataUrl: str = ""
    label: str = ""


class AssetUploadResponse(BaseModel):
    url: str
    provider: str = "supabase"
    assetType: str = ""
    fileName: str = ""
