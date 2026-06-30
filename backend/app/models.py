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
    photoUrls: List[str] = Field(default_factory=list)
    selectedLanguage: SupportedLanguage = "en"

    websiteType: Optional[WebsiteType] = None
    selectedTemplateId: Optional[str] = None
    selectedTemplateName: Optional[str] = None
    catalogType: Optional[str] = None
    salesFlow: Optional[str] = None

    colors: Dict[str, str] = Field(default_factory=dict)
    typography: Dict[str, str] = Field(default_factory=dict)
    generatedCopy: Dict[str, Any] = Field(default_factory=dict)
    catalogItems: List[Dict[str, Any]] = Field(default_factory=list)
    assets: Dict[str, Any] = Field(default_factory=dict)
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
    preferred_colors: Optional[str] = None
    preferredColors: Optional[str] = None
    contact_info: Dict[str, Any] | str | None = None
    contactInfo: Dict[str, Any] | str | None = None
    logoUrl: Optional[str] = None
    photoUrls: List[str] = Field(default_factory=list)
    selectedLanguage: SupportedLanguage = "en"
    selected_template_id: Optional[str] = None
    designStrategy: Dict[str, Any] = Field(default_factory=dict)


class WebsiteGenerationResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    website_schema: Dict[str, Any] = Field(alias="schema")
    storage_status: str = "generated"
    used_dev_mock: bool = False
    business_id: Optional[str] = None
    site_id: Optional[str] = None
    generation_id: Optional[str] = None
