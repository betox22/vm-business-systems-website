from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from openai import AuthenticationError, OpenAIError
from sqlalchemy import select
from sqlalchemy.orm import Session

from .ai_design import generate_store_config, generate_store_design
from .ai_intake import guide_intake
from .ai_website_builder import generate_ai_website_schema
from .auth_store import (
    AuthError,
    AuthNotConfiguredError,
    demo_client_member,
    login_client,
    login_admin,
    permissions_for_role,
    verify_admin_bearer,
    verify_client_member,
)
from .database import Base, SessionLocal, engine, get_db
from .domain_provider import search_domains as search_domain_provider
from .models import Order, Product, StoreCustomer, StoreDesignConfig, StorePage, Tenant
from .schemas import (
    AdminLoginPayload,
    AdminLoginResponse,
    AssetUploadPayload,
    AssetUploadResponse,
    BusinessMutationResponse,
    BusinessUpdatePayload,
    ClientPortalCatalogItemPayload,
    ClientPortalCatalogMutationResponse,
    ClientLoginPayload,
    ClientLoginResponse,
    ClientPortalOverviewResponse,
    CustomerOut,
    AiWebsiteBuilderRequest,
    AiWebsiteBuilderResponse,
    ClientRequestPayload,
    ClientRequestResponse,
    DomainOut,
    DomainOrderPayload,
    DomainOrderResponse,
    DomainPayload,
    DomainSearchResponse,
    GeneratedStoreConfig,
    DesignConfigOut,
    DesignConfigPayload,
    IntakeAssistantRequest,
    IntakeAssistantResponse,
    LeadMutationResponse,
    LeadUpdatePayload,
    OrderOut,
    ProductOut,
    PublicLeadPayload,
    PublicLeadResponse,
    PublishSiteRequest,
    SaveSiteSchemaRequest,
    SiteMutationResponse,
    SiteAdminMutationResponse,
    SiteAdminUpdatePayload,
    StorePageOut,
    StoreDesign,
    StoreDesignRequest,
    TenantOut,
    TicketRequest,
)
from .seed import seed_demo_data
from .config import get_settings
from .storage_store import upload_site_asset
from .supabase_store import (
    SupabaseNotConfiguredError,
    activate_domain,
    create_domain_order,
    create_client_catalog_item,
    create_public_lead,
    create_client_request,
    delete_client_catalog_item,
    duplicate_site,
    get_admin_overview,
    get_client_portal_overview,
    get_public_site,
    get_public_site_by_host,
    list_domains,
    publish_site,
    publish_site_with_default_domain,
    store_ai_website_generation,
    update_lead,
    update_business,
    update_client_catalog_item,
    update_site_admin,
    update_site_schema,
    upsert_domain,
)
from .tenant import get_current_tenant
from .ticket import render_thermal_ticket_html

def configured_origins() -> list[str]:
    settings = get_settings()
    return [origin.strip() for origin in settings.allowed_origins.split(",") if origin.strip()]


app = FastAPI(title="Store Page Generator API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=configured_origins(),
    allow_origin_regex=r"https://.*\.trycloudflare\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def healthcheck() -> dict:
    settings = get_settings()
    return {
        "status": "ok",
        "supabaseConfigured": bool(settings.supabase_url and settings.supabase_service_role_key),
        "openaiConfigured": bool(settings.openai_api_key),
    }


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_demo_data(db)


def tenant_dependency(request: Request, db: Session = Depends(get_db)) -> Tenant:
    return get_current_tenant(request, db)


def require_admin(request: Request) -> None:
    settings = get_settings()
    header_token = request.headers.get("x-admin-token", "")
    authorization = request.headers.get("authorization", "")
    bearer_token = authorization.removeprefix("Bearer ").strip()
    if settings.admin_api_token and (
        header_token == settings.admin_api_token or bearer_token == settings.admin_api_token
    ):
        return
    if bearer_token:
        try:
            verify_admin_bearer(bearer_token)
            return
        except (AuthError, AuthNotConfiguredError):
            pass
    if not settings.admin_api_token and not bearer_token:
        return
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Admin authorization required.",
    )


def client_portal_context(
    request: Request,
    business_id: str,
    required_permission: str,
) -> dict:
    authorization = request.headers.get("authorization", "")
    bearer_token = authorization.removeprefix("Bearer ").strip()
    if bearer_token:
        try:
            return verify_client_member(bearer_token, business_id, required_permission)
        except (AuthError, AuthNotConfiguredError) as error:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=str(error),
            ) from error

    member = demo_client_member("owner")
    member["business_id"] = business_id
    permissions = sorted(permissions_for_role(member["role"]))
    if required_permission and required_permission not in permissions:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This role does not have permission for that action.",
        )
    return {"user": {}, "member": member, "permissions": permissions}


@app.post("/api/auth/login", response_model=AdminLoginResponse)
def login_admin_user(payload: AdminLoginPayload) -> AdminLoginResponse:
    try:
        return AdminLoginResponse(**login_admin(payload.email, payload.password))
    except AuthNotConfiguredError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
    except AuthError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(error),
        ) from error


@app.post("/api/client/auth/login", response_model=ClientLoginResponse)
def login_client_user(payload: ClientLoginPayload) -> ClientLoginResponse:
    try:
        return ClientLoginResponse(**login_client(payload.email, payload.password, payload.business_id))
    except AuthNotConfiguredError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
    except AuthError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(error),
        ) from error


@app.get("/tenant", response_model=TenantOut)
def read_tenant(tenant: Tenant = Depends(tenant_dependency)) -> Tenant:
    return tenant


@app.get("/products", response_model=list[ProductOut])
def read_products(
    tenant: Tenant = Depends(tenant_dependency),
    db: Session = Depends(get_db),
) -> list[Product]:
    return list(
        db.scalars(
            select(Product)
            .where(Product.tenant_id == tenant.id, Product.is_active.is_(True))
            .order_by(Product.name.asc())
        )
    )


@app.get("/pages", response_model=list[StorePageOut])
def read_pages(
    tenant: Tenant = Depends(tenant_dependency),
    db: Session = Depends(get_db),
) -> list[StorePage]:
    return list(
        db.scalars(
            select(StorePage)
            .where(StorePage.tenant_id == tenant.id)
            .order_by(StorePage.page_type.asc(), StorePage.title.asc())
        )
    )


@app.get("/customers", response_model=list[CustomerOut])
def read_customers(
    tenant: Tenant = Depends(tenant_dependency),
    db: Session = Depends(get_db),
) -> list[StoreCustomer]:
    return list(
        db.scalars(
            select(StoreCustomer)
            .where(StoreCustomer.tenant_id == tenant.id)
            .order_by(StoreCustomer.name.asc())
        )
    )


@app.get("/orders", response_model=list[OrderOut])
def read_orders(
    status_filter: str | None = None,
    tenant: Tenant = Depends(tenant_dependency),
    db: Session = Depends(get_db),
) -> list[Order]:
    query = select(Order).where(Order.tenant_id == tenant.id)
    if status_filter:
        query = query.where(Order.status == status_filter)
    return list(db.scalars(query.order_by(Order.id.desc())))


@app.patch("/orders/{order_id}/status", response_model=OrderOut)
def update_order_status(
    order_id: int,
    payload: dict[str, str],
    tenant: Tenant = Depends(tenant_dependency),
    db: Session = Depends(get_db),
) -> Order:
    order = db.scalar(
        select(Order).where(Order.id == order_id, Order.tenant_id == tenant.id)
    )
    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido no encontrado.",
        )

    next_status = payload.get("status", "").strip()
    if next_status not in {
        "new",
        "pending_payment",
        "paid",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
    }:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Estado de pedido no valido.",
        )

    order.status = next_status
    if next_status == "paid":
        order.payment_status = "paid"
    db.commit()
    db.refresh(order)
    return order


@app.get("/design-config", response_model=DesignConfigOut)
def read_design_config(
    tenant: Tenant = Depends(tenant_dependency),
    db: Session = Depends(get_db),
) -> StoreDesignConfig:
    config = db.scalar(
        select(StoreDesignConfig).where(StoreDesignConfig.tenant_id == tenant.id)
    )
    if config:
        return config

    config = StoreDesignConfig(
        tenant_id=tenant.id,
        store_type="retail",
        colors={
            "background": "#fbfcfb",
            "surface": "#ffffff",
            "primary": "#0E7C66",
            "secondary": "#DDEBE6",
            "text": "#17211E",
        },
        fonts={"heading": "Inter", "body": "Inter"},
        section_order=["Hero", "ProductGrid", "Footer"],
        layout_mode={
            "id": "standard_storefront",
            "cart_behavior": "top_cart_icon",
            "checkout_behavior": "cart_checkout",
        },
        domain_config={
            "subdomain": tenant.subdomain or "",
            "custom_domain": tenant.custom_domain or "",
        },
        integrations={},
        print_credentials={},
        custom_logic={
            "enabled": False,
            "risk_level": "restricted",
            "automations": [],
            "scripts": [],
        },
        raw_config={},
    )
    db.add(config)
    db.commit()
    db.refresh(config)
    return config


@app.put("/design-config", response_model=DesignConfigOut)
def upsert_design_config(
    payload: DesignConfigPayload,
    tenant: Tenant = Depends(tenant_dependency),
    db: Session = Depends(get_db),
) -> StoreDesignConfig:
    config = db.scalar(
        select(StoreDesignConfig).where(StoreDesignConfig.tenant_id == tenant.id)
    )
    if config is None:
        config = StoreDesignConfig(tenant_id=tenant.id)
        db.add(config)

    config.store_type = payload.store_type
    config.colors = payload.colors
    config.fonts = payload.fonts
    config.section_order = payload.section_order
    config.layout_mode = payload.layout_mode
    config.domain_config = payload.domain_config
    config.integrations = payload.integrations
    config.print_credentials = payload.print_credentials
    config.custom_logic = payload.custom_logic
    config.raw_config = payload.raw_config

    db.commit()
    db.refresh(config)
    return config


@app.post("/ai/design", response_model=StoreDesign)
def create_design(payload: StoreDesignRequest) -> StoreDesign:
    return generate_store_design(payload.description)


@app.post("/ai/store-config", response_model=GeneratedStoreConfig)
def create_store_config(payload: StoreDesignRequest) -> GeneratedStoreConfig:
    return generate_store_config(payload.description)


@app.post("/ai/intake-assistant", response_model=IntakeAssistantResponse)
def run_intake_assistant(payload: IntakeAssistantRequest) -> IntakeAssistantResponse:
    return guide_intake(payload)


@app.post("/api/ai/intake-assistant", response_model=IntakeAssistantResponse)
def run_api_intake_assistant(payload: IntakeAssistantRequest) -> IntakeAssistantResponse:
    return guide_intake(payload)


@app.post("/client-requests", response_model=ClientRequestResponse)
def create_request(payload: ClientRequestPayload) -> ClientRequestResponse:
    try:
        request = create_client_request(payload)
    except SupabaseNotConfiguredError:
        return ClientRequestResponse(storage_status="supabase_not_configured")
    except RuntimeError:
        return ClientRequestResponse(storage_status="cloud_save_failed")

    return ClientRequestResponse(
        request_id=request.get("id"),
        request_number=request.get("request_number"),
        storage_status="stored",
    )


@app.get("/api/admin/overview", dependencies=[Depends(require_admin)])
def read_admin_overview() -> dict:
    try:
        overview = get_admin_overview()
        overview["security"] = {
            "tokenConfigured": bool(get_settings().admin_api_token),
        }
        return overview
    except SupabaseNotConfiguredError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error


@app.get("/api/admin/domains", response_model=list[DomainOut], dependencies=[Depends(require_admin)])
def read_domains() -> list[dict]:
    try:
        return list_domains()
    except SupabaseNotConfiguredError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error


@app.get("/api/admin/domain-search", response_model=DomainSearchResponse, dependencies=[Depends(require_admin)])
def search_domains(q: str) -> DomainSearchResponse:
    if not q.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Domain search query is required.",
        )
    try:
        return DomainSearchResponse(**search_domain_provider(q))
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error


@app.get("/public/domain-search", response_model=DomainSearchResponse)
def public_search_domains(q: str) -> DomainSearchResponse:
    if not q.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Domain search query is required.",
        )
    try:
        return DomainSearchResponse(**search_domain_provider(q))
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error


@app.post("/domain-orders", response_model=DomainOrderResponse)
def save_domain_order(payload: DomainOrderPayload) -> DomainOrderResponse:
    try:
        order = create_domain_order(payload)
    except SupabaseNotConfiguredError:
        return DomainOrderResponse(storage_status="supabase_not_configured")
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error
    status_label = "stored_fallback" if order.get("storage_fallback") else "stored"
    return DomainOrderResponse(id=order.get("id"), storage_status=status_label, order=order)


@app.post("/api/admin/domains", response_model=DomainOut, dependencies=[Depends(require_admin)])
def save_domain(payload: DomainPayload) -> dict:
    try:
        return upsert_domain(payload)
    except SupabaseNotConfiguredError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error


@app.post("/api/admin/domains/{domain_id}/activate", response_model=DomainOut, dependencies=[Depends(require_admin)])
def mark_domain_active(domain_id: str) -> dict:
    try:
        return activate_domain(domain_id)
    except SupabaseNotConfiguredError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error


@app.patch("/api/admin/leads/{lead_id}", response_model=LeadMutationResponse, dependencies=[Depends(require_admin)])
def update_admin_lead(lead_id: str, payload: LeadUpdatePayload) -> LeadMutationResponse:
    try:
        lead = update_lead(
            lead_id,
            status=payload.status,
            internal_notes=payload.internal_notes,
        )
    except SupabaseNotConfiguredError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error
    return LeadMutationResponse(id=lead["id"], storage_status="stored", lead=lead)


@app.patch("/api/admin/businesses/{business_id}", response_model=BusinessMutationResponse, dependencies=[Depends(require_admin)])
def update_admin_business(business_id: str, payload: BusinessUpdatePayload) -> BusinessMutationResponse:
    metadata = None
    if payload.internal_notes is not None:
        metadata = {"internal_notes": payload.internal_notes}
    data = {
        "business_name": payload.business_name,
        "business_description": payload.business_description,
        "industry": payload.industry,
        "location": payload.location,
        "target_audience": payload.target_audience,
        "preferred_tone": payload.preferred_tone,
        "plan_code": payload.plan_code,
        "tenant_status": payload.tenant_status,
        "billing_email": payload.billing_email,
        "contact_info": payload.contact_info,
        "metadata": metadata,
    }
    try:
        business = update_business(business_id, data)
    except SupabaseNotConfiguredError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error
    return BusinessMutationResponse(id=business["id"], storage_status="stored", business=business)


@app.patch("/api/admin/sites/{site_id}", response_model=SiteAdminMutationResponse, dependencies=[Depends(require_admin)])
def update_admin_site(site_id: str, payload: SiteAdminUpdatePayload) -> SiteAdminMutationResponse:
    try:
        site = update_site_admin(site_id, name=payload.name, status=payload.status)
    except SupabaseNotConfiguredError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error
    return SiteAdminMutationResponse(id=site["id"], storage_status="stored", site=site)


@app.post("/api/admin/sites/{site_id}/duplicate", response_model=SiteAdminMutationResponse, dependencies=[Depends(require_admin)])
def duplicate_admin_site(site_id: str) -> SiteAdminMutationResponse:
    try:
        site = duplicate_site(site_id)
    except SupabaseNotConfiguredError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error
    return SiteAdminMutationResponse(id=site["id"], storage_status="stored", site=site)


@app.post("/api/admin/assets/upload", response_model=AssetUploadResponse, dependencies=[Depends(require_admin)])
def upload_admin_asset(payload: AssetUploadPayload) -> AssetUploadResponse:
    try:
        result = upload_site_asset(payload)
    except SupabaseNotConfiguredError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error
    return AssetUploadResponse(**result)


@app.post("/ai/website-builder", response_model=AiWebsiteBuilderResponse)
def create_ai_website(payload: AiWebsiteBuilderRequest) -> AiWebsiteBuilderResponse:
    try:
        schema, used_dev_mock, provider = generate_ai_website_schema(payload)
    except AuthenticationError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OpenAI API key is invalid or expired. Update OPENAI_API_KEY on the server.",
        ) from error
    except OpenAIError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"OpenAI generation failed: {error.__class__.__name__}",
        ) from error
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error

    storage_status = "stored"
    business_id = site_id = generation_id = None

    try:
        stored = store_ai_website_generation(
            payload,
            schema,
            provider=provider,
            model="development_mock" if used_dev_mock else "openai",
        )
        business_id = stored["business_id"]
        site_id = stored["site_id"]
        generation_id = stored["generation_id"]
    except SupabaseNotConfiguredError:
        storage_status = "supabase_not_configured"
    except RuntimeError:
        storage_status = "cloud_save_failed"

    return AiWebsiteBuilderResponse(
        business_id=business_id,
        site_id=site_id,
        generation_id=generation_id,
        storage_status=storage_status,
        schema=schema,
        used_dev_mock=used_dev_mock,
    )


@app.put("/sites/{site_id}/schema", response_model=SiteMutationResponse, dependencies=[Depends(require_admin)])
def save_site_schema(site_id: str, payload: SaveSiteSchemaRequest) -> SiteMutationResponse:
    try:
        updated = update_site_schema(site_id, payload.schema, payload.catalog_items)
    except SupabaseNotConfiguredError:
        return SiteMutationResponse(site_id=site_id, storage_status="supabase_not_configured")
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error

    return SiteMutationResponse(
        site_id=updated["id"],
        storage_status="stored",
        schema=payload.schema,
    )


@app.post("/sites/{site_id}/publish", response_model=SiteMutationResponse, dependencies=[Depends(require_admin)])
def publish_generated_site(site_id: str, payload: PublishSiteRequest) -> SiteMutationResponse:
    try:
        updated = publish_site(site_id, payload.schema, payload.catalog_items)
    except SupabaseNotConfiguredError:
        return SiteMutationResponse(site_id=site_id, storage_status="supabase_not_configured")
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error

    public_url = f"{get_settings().public_site_base_url}?site_id={updated['id']}"
    return SiteMutationResponse(
        site_id=updated["id"],
        storage_status="published",
        public_url=public_url,
        schema=payload.schema,
    )


@app.post("/sites/{site_id}/publish-complete", response_model=SiteMutationResponse, dependencies=[Depends(require_admin)])
def publish_site_complete(site_id: str, payload: PublishSiteRequest) -> SiteMutationResponse:
    try:
        result = publish_site_with_default_domain(site_id, payload.schema, payload.catalog_items)
    except SupabaseNotConfiguredError:
        return SiteMutationResponse(site_id=site_id, storage_status="supabase_not_configured")
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error

    site = result["site"]
    public_url = f"{get_settings().public_site_base_url}?site_id={site['id']}"
    return SiteMutationResponse(
        site_id=site["id"],
        storage_status="published",
        public_url=public_url,
        final_url=result.get("final_url") or public_url,
        domain=result.get("domain"),
        schema=payload.schema,
    )


@app.get("/api/client/portal", response_model=ClientPortalOverviewResponse)
def read_client_portal(request: Request, business_id: str) -> ClientPortalOverviewResponse:
    context = client_portal_context(request, business_id, "catalog:read")
    try:
        overview = get_client_portal_overview(business_id)
    except SupabaseNotConfiguredError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error
    overview["member"] = context["member"]
    overview["permissions"] = context["permissions"]
    return ClientPortalOverviewResponse(**overview)


@app.post("/api/client/catalog-items", response_model=ClientPortalCatalogMutationResponse)
def create_client_catalog_item_route(
    request: Request,
    business_id: str,
    payload: ClientPortalCatalogItemPayload,
) -> ClientPortalCatalogMutationResponse:
    client_portal_context(request, business_id, "catalog:create")
    try:
        item = create_client_catalog_item(business_id, payload)
    except SupabaseNotConfiguredError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    return ClientPortalCatalogMutationResponse(id=item["id"], storage_status="stored", item=item)


@app.patch("/api/client/catalog-items/{item_id}", response_model=ClientPortalCatalogMutationResponse)
def update_client_catalog_item_route(
    request: Request,
    item_id: str,
    business_id: str,
    payload: ClientPortalCatalogItemPayload,
) -> ClientPortalCatalogMutationResponse:
    client_portal_context(request, business_id, "catalog:update")
    try:
        item = update_client_catalog_item(business_id, item_id, payload)
    except SupabaseNotConfiguredError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    return ClientPortalCatalogMutationResponse(id=item["id"], storage_status="stored", item=item)


@app.delete("/api/client/catalog-items/{item_id}", response_model=ClientPortalCatalogMutationResponse)
def delete_client_catalog_item_route(
    request: Request,
    item_id: str,
    business_id: str,
) -> ClientPortalCatalogMutationResponse:
    client_portal_context(request, business_id, "catalog:delete")
    try:
        item = delete_client_catalog_item(business_id, item_id)
    except SupabaseNotConfiguredError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    return ClientPortalCatalogMutationResponse(id=item["id"], storage_status="deleted", item=item)


@app.post("/api/client/assets/upload", response_model=AssetUploadResponse)
def upload_client_asset(request: Request, business_id: str, payload: AssetUploadPayload) -> AssetUploadResponse:
    client_portal_context(request, business_id, "assets:upload")
    if payload.business_id and payload.business_id != business_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Asset business does not match portal business.",
        )
    payload.business_id = business_id
    payload.asset_type = payload.asset_type or "catalog"
    try:
        result = upload_site_asset(payload)
    except SupabaseNotConfiguredError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error
    return AssetUploadResponse(**result)


@app.get("/public/sites/{site_id}")
def read_public_site(site_id: str) -> dict:
    try:
        site = get_public_site(site_id)
    except SupabaseNotConfiguredError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
    except RuntimeError as error:
        code = (
            status.HTTP_502_BAD_GATEWAY
            if "unavailable" in str(error).lower()
            else status.HTTP_404_NOT_FOUND
        )
        raise HTTPException(
            status_code=code,
            detail=str(error),
        ) from error
    if site.get("status") != "published":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Published site not found.",
        )
    return site


@app.get("/public/resolve-site")
def resolve_public_site(request: Request, host: str | None = None) -> dict:
    lookup_host = host or request.headers.get("x-forwarded-host") or request.headers.get("host", "")
    try:
        site = get_public_site_by_host(lookup_host)
    except SupabaseNotConfiguredError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
    except RuntimeError as error:
        code = (
            status.HTTP_502_BAD_GATEWAY
            if "unavailable" in str(error).lower()
            else status.HTTP_404_NOT_FOUND
        )
        raise HTTPException(
            status_code=code,
            detail=str(error),
        ) from error
    return {
        "business_id": site["business_id"],
        "site_id": site["id"],
        "domain": site.get("domain"),
        "domain_status": site.get("domain_status"),
        "schema": site["schema"],
        "catalog_items": site.get("catalog_items") or [],
    }


@app.post("/public/leads", response_model=PublicLeadResponse)
def submit_public_lead(payload: PublicLeadPayload) -> PublicLeadResponse:
    if not payload.customer_name.strip() and not payload.email.strip() and not payload.phone.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name, email or phone is required.",
        )
    if not payload.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message is required.",
        )
    try:
        lead = create_public_lead(payload)
    except SupabaseNotConfiguredError:
        return PublicLeadResponse(storage_status="supabase_not_configured")
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error
    return PublicLeadResponse(id=lead.get("id"), storage_status="stored")


@app.post("/tickets/thermal", response_class=HTMLResponse)
def create_thermal_ticket(payload: TicketRequest) -> str:
    return render_thermal_ticket_html(payload)


def _public_site_shell() -> str:
    return """<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Published site</title>
    <link rel="stylesheet" href="https://vmbusinesssystems.com/ai-builder.css">
    <style>
      body { margin: 0; background: #fff; }
      .site-preview { min-height: 100vh; }
      .public-empty {
        display: grid;
        min-height: 100vh;
        place-items: center;
        color: #667085;
        font-family: Inter, ui-sans-serif, system-ui, sans-serif;
      }
      .lead-modal {
        position: fixed;
        inset: 0;
        z-index: 50;
        display: grid;
        place-items: center;
        padding: 20px;
        background: rgba(15, 23, 42, 0.58);
      }
      .lead-modal-card {
        width: min(460px, 100%);
        display: grid;
        gap: 12px;
        padding: 18px;
        border-radius: 14px;
        background: #fff;
        color: #111827;
        box-shadow: 0 24px 70px rgba(15, 23, 42, 0.26);
        font-family: Inter, ui-sans-serif, system-ui, sans-serif;
      }
      .lead-modal-card > div {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .lead-modal-card label {
        display: grid;
        gap: 6px;
        color: #475467;
        font-size: 13px;
      }
      .lead-modal-card input,
      .lead-modal-card textarea {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #d0d5dd;
        border-radius: 10px;
        padding: 10px 12px;
        font: inherit;
        color: #101828;
      }
      .lead-modal-card [data-close-lead] {
        border: 0;
        background: transparent;
        color: #475467;
        font-size: 24px;
        cursor: pointer;
      }
      .lead-status {
        min-height: 18px;
        color: #0e7c66;
        font-size: 13px;
      }
    </style>
  </head>
  <body>
    <main id="publicSite" class="site-preview">
      <div class="public-empty">Loading published site...</div>
    </main>
    <script>window.LUMA_API_BASE_URL = "https://luma-api.vmbusinesssystems.com";</script>
    <script src="https://vmbusinesssystems.com/site-viewer.js?v=2"></script>
  </body>
</html>"""


@app.get("/", response_class=HTMLResponse)
def serve_public_site_shell() -> str:
    return _public_site_shell()


@app.get("/{path:path}", response_class=HTMLResponse, include_in_schema=False)
def serve_public_site_shell_path(path: str) -> str:
    return _public_site_shell()
