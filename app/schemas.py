from pydantic import BaseModel, ConfigDict, Field


class TenantOut(BaseModel):
    id: int
    name: str
    subdomain: str | None = None
    custom_domain: str | None = None

    class Config:
        from_attributes = True


class ProductOut(BaseModel):
    id: int
    name: str
    price: float
    image_url: str | None = None

    class Config:
        from_attributes = True


class StorePageOut(BaseModel):
    id: int
    title: str
    slug: str
    page_type: str
    status: str
    config: dict

    class Config:
        from_attributes = True


class CustomerOut(BaseModel):
    id: int
    name: str
    phone: str | None = None
    email: str | None = None
    address: str | None = None

    class Config:
        from_attributes = True


class OrderItemOut(BaseModel):
    id: int
    product_id: int | None = None
    name: str
    quantity: int
    unit_price: float

    class Config:
        from_attributes = True


class OrderOut(BaseModel):
    id: int
    order_number: str
    status: str
    total: float
    payment_status: str
    notes: str | None = None
    customer: CustomerOut | None = None
    items: list[OrderItemOut] = []

    class Config:
        from_attributes = True


class StoreDesignRequest(BaseModel):
    description: str = Field(min_length=6, max_length=800)


class StoreDesign(BaseModel):
    palette: dict[str, str]
    typography: dict[str, str]
    sections: list[str]
    tone: str


class GeneratedStoreConfig(BaseModel):
    schema_version: str = "1.1"
    store_type: str
    store: dict
    theme: dict
    layout_mode: dict
    integrations: dict
    custom_logic: dict
    sections: list[dict]
    products: list[dict]


class DesignConfigPayload(BaseModel):
    store_type: str = "retail"
    colors: dict[str, str] = Field(default_factory=dict)
    fonts: dict[str, str] = Field(default_factory=dict)
    section_order: list[str] = Field(default_factory=list)
    layout_mode: dict = Field(default_factory=dict)
    domain_config: dict[str, str] = Field(default_factory=dict)
    integrations: dict = Field(default_factory=dict)
    print_credentials: dict[str, str] = Field(default_factory=dict)
    custom_logic: dict = Field(default_factory=dict)
    raw_config: dict = Field(default_factory=dict)


class DesignConfigOut(DesignConfigPayload):
    id: int
    tenant_id: int

    class Config:
        from_attributes = True


class TicketProduct(BaseModel):
    name: str
    quantity: int = Field(ge=1)
    unit_price: float = Field(ge=0)


class TicketRequest(BaseModel):
    customer: str
    products: list[TicketProduct]
    total: float = Field(ge=0)
    notes: str | None = None
    business_name: str = "Mi tienda"


class WebsiteAssetInput(BaseModel):
    asset_type: str = Field(pattern="^(logo|photo)$")
    label: str = ""
    url: str


class AssetUploadPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    business_id: str | None = Field(default=None, alias="businessId")
    site_id: str | None = Field(default=None, alias="siteId")
    asset_type: str = Field(default="photo", alias="assetType", pattern="^(logo|photo|catalog)$")
    file_name: str = Field(alias="fileName", min_length=1, max_length=240)
    content_type: str = Field(alias="contentType", min_length=3, max_length=120)
    data_url: str = Field(alias="dataUrl", min_length=20)
    label: str = Field(default="", max_length=180)


class AssetUploadResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    url: str
    path: str
    bucket: str
    asset_id: str | None = Field(default=None, alias="assetId")


class CatalogItemInput(BaseModel):
    id: str | None = None
    name: str = Field(min_length=1, max_length=180)
    description: str = ""
    price_label: str = ""
    price_value: float | None = None
    price_type: str = Field(default="quote_only", pattern="^(fixed|starting_at|quote_only)$")
    image_url: str = ""
    button_label: str = "Request info"
    is_active: bool = True
    is_featured: bool = False
    sort_order: int = 0


class ClientPortalCatalogItemPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    site_id: str | None = Field(default=None, alias="siteId")
    name: str = Field(min_length=1, max_length=180)
    description: str = Field(default="", max_length=3000)
    price_type: str = Field(default="fixed", alias="priceType", pattern="^(fixed|starting_at|quote_only)$")
    price_value: float | None = Field(default=None, alias="priceValue")
    price_label: str = Field(default="", alias="priceLabel", max_length=120)
    image_url: str = Field(default="", alias="imageUrl", max_length=3000)
    button_label: str = Field(default="Comprar", alias="buttonLabel", max_length=80)
    is_active: bool = Field(default=True, alias="isActive")
    is_featured: bool = Field(default=False, alias="isFeatured")
    sort_order: int = Field(default=0, alias="sortOrder")
    sku: str = Field(default="", max_length=120)
    category: str = Field(default="", max_length=160)
    inventory_quantity: int | None = Field(default=None, alias="inventoryQuantity")
    compare_at_price: float | None = Field(default=None, alias="compareAtPrice")
    sale_price: float | None = Field(default=None, alias="salePrice")
    sale_label: str = Field(default="", alias="saleLabel", max_length=120)
    sale_starts_at: str = Field(default="", alias="saleStartsAt", max_length=80)
    sale_ends_at: str = Field(default="", alias="saleEndsAt", max_length=80)
    tags: list[str] = Field(default_factory=list)


class ClientPortalCatalogMutationResponse(BaseModel):
    id: str
    storage_status: str
    item: dict


class ClientPortalOverviewResponse(BaseModel):
    business: dict
    member: dict = Field(default_factory=dict)
    permissions: list[str] = Field(default_factory=list)
    sites: list[dict] = Field(default_factory=list)
    catalog_items: list[dict] = Field(default_factory=list)
    leads: list[dict] = Field(default_factory=list)
    domains: list[dict] = Field(default_factory=list)


class ClientLoginPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    email: str = Field(min_length=3, max_length=240)
    password: str = Field(min_length=1, max_length=240)
    business_id: str | None = Field(default=None, alias="businessId")


class ClientLoginResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    access_token: str = Field(alias="accessToken")
    refresh_token: str = Field(default="", alias="refreshToken")
    expires_in: int = Field(default=0, alias="expiresIn")
    user: dict = Field(default_factory=dict)
    memberships: list[dict] = Field(default_factory=list)


class ClientRequestPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    business_name: str = Field(default="", alias="businessName", max_length=160)
    business_description: str = Field(
        default="",
        alias="businessDescription",
        max_length=2000,
    )
    industry: str = Field(default="", max_length=120)
    location: str = Field(default="", max_length=160)
    services_products: list[str] = Field(default_factory=list, alias="servicesProducts")
    target_audience: str = Field(default="", alias="targetAudience", max_length=500)
    preferred_tone: str = Field(default="", alias="preferredTone", max_length=160)
    preferred_colors: list[str] = Field(default_factory=list, alias="preferredColors")
    contact_info: dict[str, str] = Field(default_factory=dict, alias="contactInfo")
    logo_url: str = Field(default="", alias="logoUrl", max_length=2000)
    photo_urls: list[str] = Field(default_factory=list, alias="photoUrls")
    selected_language: str = Field(default="en", alias="selectedLanguage", pattern="^(en|es|fr|pt)$")
    desired_domain: str = Field(default="", alias="desiredDomain", max_length=255)
    has_logo: bool = Field(default=False, alias="hasLogo")
    has_photos: bool = Field(default=False, alias="hasPhotos")
    sales_mode: str = Field(default="", alias="salesMode", max_length=80)
    has_logo_photos: str = Field(default="", alias="hasLogoPhotos", max_length=160)
    sections_preference: str = Field(default="", alias="sectionsPreference", max_length=300)
    source: str = "ai_guided_setup"
    status: str = "ready_to_generate"


class ClientRequestResponse(BaseModel):
    request_id: str | None = None
    request_number: str | None = None
    storage_status: str


class AdminLoginPayload(BaseModel):
    email: str = Field(min_length=3, max_length=240)
    password: str = Field(min_length=1, max_length=240)


class AdminPasswordChangePayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    new_password: str = Field(alias="newPassword", min_length=8, max_length=240)


class AdminUserOut(BaseModel):
    id: str
    email: str = ""
    role: str = "admin"


class AdminLoginResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    access_token: str = Field(alias="accessToken")
    refresh_token: str = Field(default="", alias="refreshToken")
    expires_in: int = Field(default=0, alias="expiresIn")
    user: AdminUserOut


class DomainPayload(BaseModel):
    business_id: str = Field(alias="businessId")
    domain: str = Field(min_length=3, max_length=255)
    site_id: str | None = Field(default=None, alias="siteId")
    domain_type: str = Field(default="custom", alias="domainType", pattern="^(subdomain|custom)$")


class DomainSearchResponse(BaseModel):
    query: str
    provider: str
    exact_availability: bool = False
    results: list[dict] = Field(default_factory=list)


class DomainOrderPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    business_id: str | None = Field(default=None, alias="businessId")
    site_id: str | None = Field(default=None, alias="siteId")
    client_request_id: str | None = Field(default=None, alias="clientRequestId")
    requested_domain: str = Field(alias="requestedDomain", min_length=3, max_length=255)
    owner_email: str = Field(default="", alias="ownerEmail", max_length=240)
    owner_name: str = Field(default="", alias="ownerName", max_length=180)
    package_code: str = Field(default="starter", alias="packageCode", max_length=80)
    selected_result: dict = Field(default_factory=dict, alias="selectedResult")


class DomainOrderResponse(BaseModel):
    id: str | None = None
    storage_status: str
    order: dict = Field(default_factory=dict)


class DomainOut(BaseModel):
    id: str
    business_id: str
    site_id: str | None = None
    domain: str
    normalized_domain: str
    domain_type: str
    status: str
    verification_token: str
    verification_method: str
    created_at: str | None = None
    updated_at: str | None = None


class IntakeAssistantRequest(BaseModel):
    current: ClientRequestPayload = Field(default_factory=ClientRequestPayload)
    message: str = ""
    current_step: str = "businessName"
    history: list[dict] = Field(default_factory=list)


class IntakeAssistantResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    message: str
    updates: dict = Field(default_factory=dict)
    next_step: str = ""
    next_question: str = ""
    missing_fields: list[str] = Field(default_factory=list)
    used_dev_fallback: bool = False
    assistant_message: str = Field(default="", alias="assistantMessage")
    emotion: str = Field(default="neutral", pattern="^(neutral|happy|thinking|listening|speaking|alert|success)$")
    updated_fields: dict = Field(default_factory=dict, alias="updatedFields")
    ready_to_generate: bool = Field(default=False, alias="readyToGenerate")
    missing_important_fields: list[str] = Field(default_factory=list, alias="missingImportantFields")
    confidence: float = 0


class AiWebsiteBuilderRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    request_id: str | None = Field(default=None, alias="requestId")
    business_name: str = Field(alias="businessName", min_length=1, max_length=160)
    business_description: str = Field(alias="businessDescription", min_length=8, max_length=2000)
    industry: str = Field(min_length=1, max_length=120)
    location: str = Field(default="", max_length=160)
    services_products: list[str] = Field(default_factory=list, alias="servicesProducts")
    target_audience: str = Field(default="", alias="targetAudience", max_length=500)
    preferred_tone: str = Field(default="", alias="preferredTone", max_length=120)
    preferred_colors: list[str] = Field(default_factory=list, alias="preferredColors")
    contact_info: dict[str, str] = Field(default_factory=dict, alias="contactInfo")
    selected_language: str = Field(default="en", alias="selectedLanguage", pattern="^(en|es|fr|pt)$")
    template_id: str = Field(default="", alias="templateId", max_length=120)
    template_intent: str = Field(default="", alias="templateIntent", max_length=160)
    catalog_type: str = Field(default="", alias="catalogType", max_length=120)
    selected_template: dict = Field(default_factory=dict, alias="selectedTemplate")
    catalog_items: list[CatalogItemInput] = Field(default_factory=list, alias="catalogItems")
    assets: list[WebsiteAssetInput] = Field(default_factory=list)
    logo_palette: list[str] = Field(default_factory=list, alias="logoPalette")
    brand: dict = Field(default_factory=dict)
    design_strategy: dict = Field(default_factory=dict, alias="designStrategy")
    quality_rules: list[str] = Field(default_factory=list, alias="qualityRules")
    requested_adjustments: list[str] = Field(default_factory=list, alias="requestedAdjustments")
    site_plan: dict | None = Field(default=None, alias="sitePlan")
    site_plan_approved: bool = Field(default=False, alias="sitePlanApproved")
    brand_context_note: str = Field(default="", alias="brandContextNote", max_length=1000)
    revision_mode: str = Field(default="", alias="revisionMode", max_length=80)
    revision_instructions: dict | None = Field(default=None, alias="revisionInstructions")
    previous_schema: dict | None = Field(default=None, alias="previousSchema")


class WebsiteSectionSchema(BaseModel):
    id: str
    type: str
    order: int
    editable: dict
    settings: dict = Field(default_factory=dict)


class WebsitePageSchema(BaseModel):
    page_key: str
    title: str
    slug: str
    order: int
    sections: list[WebsiteSectionSchema]


class WebsiteSchema(BaseModel):
    schema_version: str = "2.0"
    site_type: str = "online_store"
    business: dict
    theme: dict
    layout_mode: dict = Field(default_factory=dict)
    integrations: dict = Field(default_factory=dict)
    custom_logic: dict = Field(default_factory=dict)
    navigation: list[dict]
    pages: list[WebsitePageSchema]
    global_components: dict = Field(default_factory=dict)
    design_variants: list[dict] = Field(default_factory=list)
    selected_template: dict = Field(default_factory=dict)
    catalog_model: dict = Field(default_factory=dict)
    products_services: list[dict] = Field(default_factory=list)
    contact: dict = Field(default_factory=dict)
    editable_fields: list[str] = Field(default_factory=list)


class AiWebsiteBuilderResponse(BaseModel):
    business_id: str | None = None
    site_id: str | None = None
    generation_id: str | None = None
    storage_status: str
    schema: WebsiteSchema
    used_dev_mock: bool = False


class SaveSiteSchemaRequest(BaseModel):
    schema: WebsiteSchema
    catalog_items: list[CatalogItemInput] = Field(default_factory=list)


class PublishSiteRequest(BaseModel):
    schema: WebsiteSchema | None = None
    catalog_items: list[CatalogItemInput] | None = None


class SiteMutationResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    site_id: str
    storage_status: str
    public_url: str | None = None
    final_url: str | None = Field(default=None, alias="finalUrl")
    domain: dict | None = None
    schema: WebsiteSchema | None = None


class PublicLeadPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    site_id: str = Field(alias="siteId")
    business_id: str | None = Field(default=None, alias="businessId")
    customer_name: str = Field(default="", alias="customerName", max_length=180)
    email: str = Field(default="", max_length=240)
    phone: str = Field(default="", max_length=80)
    message: str = Field(default="", max_length=2000)
    source: str = Field(default="public_site", max_length=80)
    catalog_item_id: str | None = Field(default=None, alias="catalogItemId")
    catalog_item_name: str = Field(default="", alias="catalogItemName", max_length=240)


class PublicLeadResponse(BaseModel):
    id: str | None = None
    storage_status: str


class LeadUpdatePayload(BaseModel):
    status: str | None = Field(
        default=None,
        pattern="^(new|contacted|qualified|draft_generated|in_review|changes_requested|approved|won|lost|archived|pending_payment|paid|processing|shipped|delivered|cancelled)$",
    )
    internal_notes: str | None = Field(default=None, alias="internalNotes", max_length=4000)


class LeadMutationResponse(BaseModel):
    id: str
    storage_status: str
    lead: dict


class BusinessUpdatePayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    business_name: str | None = Field(default=None, alias="businessName", max_length=180)
    business_description: str | None = Field(default=None, alias="businessDescription", max_length=3000)
    industry: str | None = Field(default=None, max_length=180)
    location: str | None = Field(default=None, max_length=180)
    target_audience: str | None = Field(default=None, alias="targetAudience", max_length=800)
    preferred_tone: str | None = Field(default=None, alias="preferredTone", max_length=240)
    plan_code: str | None = Field(default=None, alias="planCode", pattern="^(starter|business|pro)$")
    tenant_status: str | None = Field(
        default=None,
        alias="tenantStatus",
        pattern="^(trial|active|past_due|suspended|cancelled)$",
    )
    billing_email: str | None = Field(default=None, alias="billingEmail", max_length=240)
    internal_notes: str | None = Field(default=None, alias="internalNotes", max_length=4000)
    contact_info: dict[str, str] | None = Field(default=None, alias="contactInfo")


class BusinessMutationResponse(BaseModel):
    id: str
    storage_status: str
    business: dict


class BusinessMemberPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    email: str = Field(min_length=3, max_length=240)
    role: str = Field(pattern="^(owner|manager|catalog_manager|seller|fulfillment|viewer|admin|staff)$")
    status: str = Field(default="invited", pattern="^(invited|active|disabled)$")
    user_id: str | None = Field(default=None, alias="userId")


class BusinessMemberUpdatePayload(BaseModel):
    role: str | None = Field(default=None, pattern="^(owner|manager|catalog_manager|seller|fulfillment|viewer|admin|staff)$")
    status: str | None = Field(default=None, pattern="^(invited|active|disabled)$")


class BusinessMemberMutationResponse(BaseModel):
    id: str
    storage_status: str
    member: dict


class BusinessMemberInviteResponse(BaseModel):
    id: str
    storage_status: str
    invite_url: str = Field(alias="inviteUrl")
    member: dict


class SiteAdminUpdatePayload(BaseModel):
    name: str | None = Field(default=None, max_length=180)
    status: str | None = Field(default=None, pattern="^(draft|published|archived|disabled)$")


class SiteAdminMutationResponse(BaseModel):
    id: str
    storage_status: str
    site: dict
