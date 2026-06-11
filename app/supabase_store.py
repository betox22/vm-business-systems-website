import json
import re
from datetime import UTC, datetime
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import ProxyHandler, Request, build_opener

from .config import get_settings
from .schemas import (
    AiWebsiteBuilderRequest,
    CatalogItemInput,
    ClientRequestPayload,
    ClientPortalCatalogItemPayload,
    DomainPayload,
    PublicLeadPayload,
    WebsiteAssetInput,
    WebsiteSchema,
)


class SupabaseNotConfiguredError(RuntimeError):
    pass


_NO_PROXY_OPENER = build_opener(ProxyHandler({}))


def _open_no_proxy(request: Request, timeout: int = 20):
    return _NO_PROXY_OPENER.open(request, timeout=timeout)


def create_client_request(payload: ClientRequestPayload) -> dict[str, Any]:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise SupabaseNotConfiguredError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required."
        )

    contact = payload.contact_info
    request_number = f"REQ-{datetime.now(UTC).strftime('%Y%m%d%H%M%S')}"
    return _insert(
        "client_requests",
        {
            "request_number": request_number,
            "client_name": payload.business_name or "New client",
            "contact_name": contact.get("name", ""),
            "contact_email": contact.get("email", ""),
            "contact_phone": contact.get("phone", contact.get("whatsapp", "")),
            "business_name": payload.business_name,
            "industry": payload.industry,
            "description": payload.business_description,
            "location": payload.location,
            "services_products": payload.services_products,
            "social_links": {
                "instagram": contact.get("instagram", ""),
                "facebook": contact.get("facebook", ""),
                "tiktok": contact.get("tiktok", ""),
                "website": contact.get("website", ""),
            },
            "preferred_colors": payload.preferred_colors,
            "selected_language": payload.selected_language,
            "tone_style": payload.preferred_tone,
            "status": payload.status or "ready_to_generate",
            "internal_notes": json.dumps(
                {
                    "source": payload.source,
                    "targetAudience": payload.target_audience,
                    "selectedLanguage": payload.selected_language,
                    "salesMode": payload.sales_mode,
                    "hasLogo": payload.has_logo,
                    "hasPhotos": payload.has_photos,
                    "hasLogoPhotos": payload.has_logo_photos,
                    "sectionsPreference": payload.sections_preference,
                    "logoUrl": payload.logo_url,
                    "photoUrls": payload.photo_urls,
                    "contactInfo": payload.contact_info,
                },
                ensure_ascii=False,
            ),
        },
    )


def store_ai_website_generation(
    payload: AiWebsiteBuilderRequest,
    schema: WebsiteSchema,
    *,
    provider: str,
    model: str,
) -> dict[str, str]:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise SupabaseNotConfiguredError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required."
        )

    business = _insert(
        "businesses",
        {
            "business_name": payload.business_name,
            "client_request_id": _uuid_or_none(payload.request_id),
            "client_request_ref": payload.request_id,
            "business_description": payload.business_description,
            "industry": payload.industry,
            "location": payload.location,
            "services_products": payload.services_products,
            "target_audience": payload.target_audience,
            "preferred_tone": payload.preferred_tone,
            "preferred_colors": payload.preferred_colors,
            "selected_language": payload.selected_language,
            "contact_info": payload.contact_info,
        },
    )

    site = _insert(
        "sites",
        {
            "business_id": business["id"],
            "client_request_id": _uuid_or_none(payload.request_id),
            "client_request_ref": payload.request_id,
            "name": schema.business.get("name", payload.business_name),
            "status": "draft",
            "selected_language": payload.selected_language,
            "schema": schema.model_dump(),
        },
    )

    for page in schema.pages:
        _insert(
            "site_pages",
            {
                "site_id": site["id"],
                "page_key": page.page_key,
                "title": page.title,
                "slug": page.slug,
                "sort_order": page.order,
                "schema": page.model_dump(),
            },
        )

    _replace_site_concepts(site["id"], schema)
    _replace_catalog_items(site["id"], business["id"], _catalog_items_from_payload(payload, schema))

    for asset in payload.assets:
        _store_asset(asset, business["id"], site["id"])

    generation = _insert(
        "ai_generations",
        {
            "business_id": business["id"],
            "client_request_id": _uuid_or_none(payload.request_id),
            "client_request_ref": payload.request_id,
            "site_id": site["id"],
            "provider": provider,
            "model": model,
            "prompt": payload.model_dump(),
            "response": schema.model_dump(),
            "status": "completed",
        },
    )

    return {
        "business_id": business["id"],
        "site_id": site["id"],
        "generation_id": generation["id"],
    }


def update_site_schema(
    site_id: str,
    schema: WebsiteSchema,
    catalog_items: list[CatalogItemInput] | None = None,
) -> dict[str, Any]:
    updated = _update(
        "sites",
        site_id,
        {
            "name": schema.business.get("name", "Generated site"),
            "schema": schema.model_dump(),
            "selected_language": _language_from_schema(schema),
            "updated_at": _now_iso(),
        },
    )
    _replace_site_pages(site_id, schema)
    _replace_site_concepts(site_id, schema)
    if catalog_items is not None:
        _replace_catalog_items(site_id, None, catalog_items)
    return updated


def publish_site(
    site_id: str,
    schema: WebsiteSchema | None = None,
    catalog_items: list[CatalogItemInput] | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "status": "published",
        "published_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    if schema is not None:
        payload["name"] = schema.business.get("name", "Generated site")
        payload["schema"] = schema.model_dump()
        payload["selected_language"] = _language_from_schema(schema)
    updated = _update("sites", site_id, payload)
    if schema is not None:
        _replace_site_pages(site_id, schema)
        _replace_site_concepts(site_id, schema)
    if catalog_items is not None:
        _replace_catalog_items(site_id, None, catalog_items)
    return updated


def update_site_admin(site_id: str, *, name: str | None = None, status: str | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {"updated_at": _now_iso()}
    if name is not None:
        payload["name"] = name
    if status is not None:
        payload["status"] = status
        if status == "published":
            payload["published_at"] = _now_iso()
    return _update("sites", site_id, payload)


def duplicate_site(site_id: str) -> dict[str, Any]:
    rows = _select(
        "sites",
        f"id=eq.{quote(site_id)}&select=*&limit=1",
    )
    if not rows:
        raise RuntimeError("Site not found.")
    source = rows[0]
    duplicate = _insert(
        "sites",
        {
            "business_id": source["business_id"],
            "client_request_id": source.get("client_request_id"),
            "client_request_ref": source.get("client_request_ref") or "",
            "name": f"{source.get('name') or 'Site'} copy",
            "status": "draft",
            "selected_language": source.get("selected_language") or "en",
            "schema": source.get("schema") or {},
            "updated_at": _now_iso(),
        },
    )
    _copy_site_pages(site_id, duplicate["id"])
    _copy_site_concepts(site_id, duplicate["id"])
    _copy_catalog_items(site_id, duplicate["id"], source["business_id"])
    return duplicate


def publish_site_with_default_domain(
    site_id: str,
    schema: WebsiteSchema | None = None,
    catalog_items: list[CatalogItemInput] | None = None,
) -> dict[str, Any]:
    site = publish_site(site_id, schema, catalog_items)
    domain = get_active_domain_for_site(site["id"], site.get("business_id"))
    if not domain:
        domain = create_internal_subdomain_for_site(site)
    return {
        "site": site,
        "domain": domain,
        "final_url": f"https://{domain['domain']}" if domain else "",
    }


def _copy_site_pages(source_site_id: str, target_site_id: str) -> None:
    pages = _select(
        "site_pages",
        f"site_id=eq.{quote(source_site_id)}&select=page_key,title,slug,sort_order,schema",
    )
    for page in pages:
        _insert("site_pages", {**page, "site_id": target_site_id})


def _copy_site_concepts(source_site_id: str, target_site_id: str) -> None:
    concepts = _select(
        "site_concepts",
        f"site_id=eq.{quote(source_site_id)}&select=concept_key,name,description,theme,layout_config,logo_style,background_style,sort_order,is_selected",
    )
    for concept in concepts:
        _insert("site_concepts", {**concept, "site_id": target_site_id})


def _copy_catalog_items(source_site_id: str, target_site_id: str, business_id: str) -> None:
    items = _select(
        "catalog_items",
        f"site_id=eq.{quote(source_site_id)}&select=name,description,price_type,price_value,price_label,image_url,button_label,is_active,is_featured,sort_order,metadata",
    )
    for item in items:
        _insert("catalog_items", {**item, "site_id": target_site_id, "business_id": business_id})


def get_active_domain_for_site(site_id: str, business_id: str | None = None) -> dict[str, Any] | None:
    filters = [f"site_id=eq.{quote(site_id)}"]
    if business_id:
        filters.append(f"business_id=eq.{quote(business_id)}")
    for filter_query in filters:
        rows = _select(
            "domains",
            f"{filter_query}&status=eq.active&select=*&order=updated_at.desc&limit=1",
        )
        if rows:
            return rows[0]
    return None


def create_internal_subdomain_for_site(site: dict[str, Any]) -> dict[str, Any]:
    settings = get_settings()
    business_id = site.get("business_id")
    if not business_id:
        raise RuntimeError("Published site is missing business_id.")
    business = _select(
        "businesses",
        f"id=eq.{quote(business_id)}&select=id,business_name&limit=1",
    )
    base_name = business[0].get("business_name") if business else site.get("name", "site")
    base_slug = slugify_domain_label(base_name or "site")
    root = normalize_domain(settings.public_root_domain)
    for index in range(0, 20):
        label = base_slug if index == 0 else f"{base_slug}-{index + 1}"
        domain = f"{label}.{root}"
        existing = _select(
            "domains",
            f"normalized_domain=eq.{quote(domain)}&select=id&limit=1",
        )
        if existing:
            continue
        return _insert(
            "domains",
            {
                "business_id": business_id,
                "site_id": site["id"],
                "domain": domain,
                "normalized_domain": domain,
                "domain_type": "subdomain",
                "status": "active",
                "verification_method": "internal",
                "verification_token": "",
                "verified_at": _now_iso(),
                "updated_at": _now_iso(),
            },
        )
    raise RuntimeError("Could not generate a unique internal subdomain.")


def list_domains() -> list[dict[str, Any]]:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise SupabaseNotConfiguredError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required."
        )
    return _select(
        "domains",
        "select=*&order=created_at.desc&limit=500",
    )


def upsert_domain(payload: DomainPayload) -> dict[str, Any]:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise SupabaseNotConfiguredError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required."
        )

    normalized = normalize_domain(payload.domain)
    existing = _select(
        "domains",
        f"normalized_domain=eq.{quote(normalized)}&select=*&limit=1",
    )
    data = {
        "business_id": payload.business_id,
        "site_id": payload.site_id,
        "domain": payload.domain.strip(),
        "normalized_domain": normalized,
        "domain_type": payload.domain_type,
        "status": "pending",
        "verification_method": "dns_txt",
        "updated_at": _now_iso(),
    }
    if existing:
        return _update("domains", existing[0]["id"], data)

    data["verification_token"] = _verification_token(normalized)
    return _insert("domains", data)


def activate_domain(domain_id: str) -> dict[str, Any]:
    return _update(
        "domains",
        domain_id,
        {
            "status": "active",
            "verified_at": _now_iso(),
            "updated_at": _now_iso(),
        },
    )


def get_public_site(site_id: str) -> dict[str, Any]:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise SupabaseNotConfiguredError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required."
        )

    url = (
        f"{settings.supabase_url.rstrip('/')}/rest/v1/sites"
        f"?id=eq.{quote(site_id)}"
        "&select=id,name,status,selected_language,schema,catalog_items(*)"
    )
    request = Request(
        url,
        method="GET",
        headers={
            "apikey": settings.supabase_service_role_key or "",
            "authorization": f"Bearer {settings.supabase_service_role_key}",
            "content-type": "application/json",
        },
    )
    try:
        with _open_no_proxy(request, timeout=20) as response:
            decoded = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        details = error.read().decode("utf-8")
        raise RuntimeError(f"Supabase public site lookup failed: {details}") from error
    except URLError as error:
        raise RuntimeError(f"Supabase public site lookup unavailable: {error.reason}") from error
    if not decoded:
        raise RuntimeError("Site not found.")
    return decoded[0]


def get_public_site_by_host(host: str) -> dict[str, Any]:
    normalized = normalize_domain(host)
    if not normalized:
        raise RuntimeError("Host is required.")

    matches = _select(
        "domains",
        f"normalized_domain=eq.{quote(normalized)}&status=eq.active&select=*&limit=1",
    )
    if not matches:
        raise RuntimeError("Active domain not found.")

    domain = matches[0]
    site = _find_published_site_for_domain(domain)
    if not site:
        raise RuntimeError("Published site not found for domain.")

    site["domain"] = domain["domain"]
    site["domain_status"] = domain["status"]
    return site


def get_admin_overview() -> dict[str, Any]:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise SupabaseNotConfiguredError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required."
        )

    return {
        "client_requests": _select(
            "client_requests",
            "select=*&order=created_at.desc&limit=100",
        ),
        "businesses": _select(
            "businesses",
            "select=*&order=created_at.desc&limit=100",
        ),
        "sites": _select(
            "sites",
            "select=*&order=created_at.desc&limit=100",
        ),
        "catalog_items": _select(
            "catalog_items",
            "select=*&order=sort_order.asc&limit=500",
        ),
        "ai_generations": _select(
            "ai_generations",
            "select=id,business_id,site_id,client_request_id,created_at,status,provider,model&order=created_at.desc&limit=100",
        ),
        "domains": _select(
            "domains",
            "select=*&order=created_at.desc&limit=500",
        ),
        "plan_limits": _select(
            "plan_limits",
            "select=*&order=monthly_price.asc",
        ),
        "subscriptions": _select(
            "subscriptions",
            "select=*&order=created_at.desc&limit=500",
        ),
        "leads": _select(
            "leads",
            "select=*&order=created_at.desc&limit=500",
        ),
    }


def get_client_portal_overview(business_id: str) -> dict[str, Any]:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise SupabaseNotConfiguredError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required."
        )

    business = _get_business_or_raise(business_id)
    return {
        "business": business,
        "sites": _select(
            "sites",
            f"business_id=eq.{quote(business_id)}&select=id,business_id,name,status,selected_language,public_slug,published_at,created_at,updated_at&order=updated_at.desc&limit=50",
        ),
        "catalog_items": _select(
            "catalog_items",
            f"business_id=eq.{quote(business_id)}&select=*&order=sort_order.asc,created_at.asc&limit=1000",
        ),
        "leads": _select(
            "leads",
            f"business_id=eq.{quote(business_id)}&select=*&order=created_at.desc&limit=250",
        ),
        "domains": _select(
            "domains",
            f"business_id=eq.{quote(business_id)}&select=*&order=created_at.desc&limit=50",
        ),
    }


def create_client_catalog_item(business_id: str, payload: ClientPortalCatalogItemPayload) -> dict[str, Any]:
    _get_business_or_raise(business_id)
    site_id = payload.site_id or _primary_site_id_for_business(business_id)
    if not site_id:
        raise RuntimeError("No site exists for this business yet.")
    _ensure_site_belongs_to_business(site_id, business_id)
    return _insert("catalog_items", _catalog_payload(business_id, site_id, payload))


def update_client_catalog_item(
    business_id: str,
    item_id: str,
    payload: ClientPortalCatalogItemPayload,
) -> dict[str, Any]:
    existing = _get_catalog_item_for_business(business_id, item_id)
    site_id = payload.site_id or existing.get("site_id") or _primary_site_id_for_business(business_id)
    if not site_id:
        raise RuntimeError("No site exists for this business yet.")
    _ensure_site_belongs_to_business(site_id, business_id)
    return _update("catalog_items", item_id, _catalog_payload(business_id, site_id, payload))


def delete_client_catalog_item(business_id: str, item_id: str) -> dict[str, Any]:
    existing = _get_catalog_item_for_business(business_id, item_id)
    _delete("catalog_items", "id", item_id)
    return existing


def create_public_lead(payload: PublicLeadPayload) -> dict[str, Any]:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise SupabaseNotConfiguredError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required."
        )

    business_id = _uuid_or_none(payload.business_id) or _business_id_for_site(payload.site_id)
    return _insert(
        "leads",
        {
            "site_id": payload.site_id,
            "business_id": business_id,
            "customer_name": payload.customer_name.strip(),
            "email": payload.email.strip(),
            "phone": payload.phone.strip(),
            "message": payload.message.strip(),
            "status": "new",
            "metadata": {
                "source": payload.source,
                "catalog_item_id": payload.catalog_item_id,
                "catalog_item_name": payload.catalog_item_name,
            },
        },
    )


def update_lead(lead_id: str, *, status: str | None = None, internal_notes: str | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {"updated_at": _now_iso()}
    if status is not None:
        payload["status"] = status
        if status in {"contacted", "qualified"}:
            payload["contacted_at"] = _now_iso()
        if status in {"won", "lost", "archived", "cancelled", "delivered"}:
            payload["closed_at"] = _now_iso()
    if internal_notes is not None:
        payload["internal_notes"] = internal_notes
    return _update("leads", lead_id, payload)


def update_business(business_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    data = {key: value for key, value in payload.items() if value is not None}
    data["updated_at"] = _now_iso()
    return _update("businesses", business_id, data)


def normalize_domain(value: str) -> str:
    domain = (value or "").strip().lower()
    domain = re.sub(r"^https?://", "", domain)
    domain = domain.split("/", 1)[0]
    domain = domain.split(":", 1)[0]
    domain = domain.removeprefix("www.")
    return domain.rstrip(".")


def slugify_domain_label(value: str) -> str:
    label = re.sub(r"[^a-z0-9]+", "-", (value or "").lower()).strip("-")
    label = re.sub(r"-+", "-", label)
    if not label:
        label = "site"
    if len(label) > 48:
        label = label[:48].strip("-")
    return label or "site"


def _find_published_site_for_domain(domain: dict[str, Any]) -> dict[str, Any] | None:
    filters = []
    if domain.get("site_id"):
        filters.append(f"id=eq.{quote(domain['site_id'])}")
    filters.append(f"business_id=eq.{quote(domain['business_id'])}")

    for filter_query in filters:
        rows = _select(
            "sites",
            f"{filter_query}&status=eq.published&select=id,business_id,name,status,selected_language,schema,catalog_items(*)&order=published_at.desc.nullslast,updated_at.desc&limit=1",
        )
        if rows:
            return rows[0]
    return None


def _verification_token(normalized_domain: str) -> str:
    compact = re.sub(r"[^a-z0-9]", "", normalized_domain)[:24] or "domain"
    timestamp = datetime.now(UTC).strftime("%Y%m%d%H%M%S")
    return f"luma-verify-{compact}-{timestamp}"


def _business_id_for_site(site_id: str) -> str | None:
    rows = _select(
        "sites",
        f"id=eq.{quote(site_id)}&select=business_id&limit=1",
    )
    return rows[0].get("business_id") if rows else None


def _get_business_or_raise(business_id: str) -> dict[str, Any]:
    rows = _select(
        "businesses",
        f"id=eq.{quote(business_id)}&select=*&limit=1",
    )
    if not rows:
        raise RuntimeError("Business not found.")
    return rows[0]


def _primary_site_id_for_business(business_id: str) -> str | None:
    rows = _select(
        "sites",
        f"business_id=eq.{quote(business_id)}&select=id,status,updated_at&order=published_at.desc.nullslast,updated_at.desc&limit=1",
    )
    return rows[0].get("id") if rows else None


def _ensure_site_belongs_to_business(site_id: str, business_id: str) -> None:
    rows = _select(
        "sites",
        f"id=eq.{quote(site_id)}&business_id=eq.{quote(business_id)}&select=id&limit=1",
    )
    if not rows:
        raise RuntimeError("Site does not belong to this business.")


def _get_catalog_item_for_business(business_id: str, item_id: str) -> dict[str, Any]:
    rows = _select(
        "catalog_items",
        f"id=eq.{quote(item_id)}&business_id=eq.{quote(business_id)}&select=*&limit=1",
    )
    if not rows:
        raise RuntimeError("Catalog item not found for this business.")
    return rows[0]


def _catalog_payload(
    business_id: str,
    site_id: str,
    item: ClientPortalCatalogItemPayload,
) -> dict[str, Any]:
    metadata = {
        "sku": item.sku,
        "category": item.category,
        "inventory_quantity": item.inventory_quantity,
        "compare_at_price": item.compare_at_price,
        "sale_price": item.sale_price,
        "sale_label": item.sale_label,
        "sale_starts_at": item.sale_starts_at,
        "sale_ends_at": item.sale_ends_at,
        "tags": item.tags,
    }
    return {
        "business_id": business_id,
        "site_id": site_id,
        "name": item.name.strip(),
        "description": item.description.strip(),
        "price_type": item.price_type,
        "price_value": item.price_value,
        "price_label": item.price_label.strip(),
        "image_url": item.image_url.strip(),
        "button_label": item.button_label.strip() or "Comprar",
        "is_active": item.is_active,
        "is_featured": item.is_featured,
        "sort_order": item.sort_order,
        "metadata": metadata,
        "updated_at": _now_iso(),
    }


def _store_asset(asset: WebsiteAssetInput, business_id: str, site_id: str) -> None:
    payload = {
        "site_id": site_id,
        "business_id": business_id,
        "asset_type": asset.asset_type,
        "label": asset.label,
        "url": asset.url,
        "metadata": {},
    }
    _insert(
        "site_assets",
        payload,
    )
    _insert("assets", payload)


def _replace_site_pages(site_id: str, schema: WebsiteSchema) -> None:
    _delete("site_pages", "site_id", site_id)
    for page in schema.pages:
        _insert(
            "site_pages",
            {
                "site_id": site_id,
                "page_key": page.page_key,
                "title": page.title,
                "slug": page.slug,
                "sort_order": page.order,
                "schema": page.model_dump(),
            },
        )


def _replace_site_concepts(site_id: str, schema: WebsiteSchema) -> None:
    _delete("site_concepts", "site_id", site_id)
    for index, concept in enumerate(schema.design_variants):
        _insert(
            "site_concepts",
            {
                "site_id": site_id,
                "concept_key": concept.get("id") or f"concept_{index + 1}",
                "name": concept.get("name") or f"Concept {index + 1}",
                "description": concept.get("description") or "",
                "theme": concept.get("theme") or {},
                "layout_config": {
                    "layout_mode_id": concept.get("layout_mode_id") or "",
                    "hero_layout": concept.get("hero_layout") or "",
                    "product_layout": concept.get("product_layout") or "",
                    "section_density": concept.get("section_density") or "",
                },
                "logo_style": concept.get("logo_style") or "",
                "background_style": concept.get("background_style") or "",
                "sort_order": index + 1,
                "is_selected": index == 0,
            },
        )


def _replace_catalog_items(
    site_id: str,
    business_id: str | None,
    catalog_items: list[CatalogItemInput],
) -> None:
    _delete("catalog_items", "site_id", site_id)
    for index, item in enumerate(catalog_items):
        _insert(
            "catalog_items",
            {
                "site_id": site_id,
                "business_id": business_id,
                "name": item.name,
                "description": item.description,
                "price_type": item.price_type,
                "price_value": item.price_value,
                "price_label": item.price_label,
                "image_url": item.image_url,
                "button_label": item.button_label,
                "is_active": item.is_active,
                "is_featured": item.is_featured,
                "sort_order": item.sort_order or index + 1,
                "metadata": {"source_id": item.id},
            },
        )


def _catalog_items_from_payload(
    payload: AiWebsiteBuilderRequest,
    schema: WebsiteSchema,
) -> list[CatalogItemInput]:
    if payload.catalog_items:
        return payload.catalog_items
    return [
        CatalogItemInput(
            name=item.get("name", "Catalog item"),
            description=item.get("description", ""),
            price_label=item.get("price_label", ""),
            price_type="quote_only",
            image_url=item.get("image_url", ""),
            button_label=item.get("button_label", "Request info"),
            is_active=True,
            is_featured=index < 3,
            sort_order=index + 1,
        )
        for index, item in enumerate(schema.products_services)
    ]


def _insert(table: str, payload: dict[str, Any]) -> dict[str, Any]:
    settings = get_settings()
    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/{table}"
    body = json.dumps(payload).encode("utf-8")
    request = Request(
        url,
        data=body,
        method="POST",
        headers={
            "apikey": settings.supabase_service_role_key or "",
            "authorization": f"Bearer {settings.supabase_service_role_key}",
            "content-type": "application/json",
            "prefer": "return=representation",
        },
    )

    try:
        with _open_no_proxy(request, timeout=20) as response:
            decoded = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        details = error.read().decode("utf-8")
        raise RuntimeError(f"Supabase insert failed for {table}: {details}") from error
    except URLError as error:
        raise RuntimeError(f"Supabase insert unavailable for {table}: {error.reason}") from error

    if not decoded:
        raise RuntimeError(f"Supabase insert returned no row for {table}.")
    return decoded[0]


def _select(table: str, query: str) -> list[dict[str, Any]]:
    settings = get_settings()
    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/{table}?{query}"
    request = Request(
        url,
        method="GET",
        headers={
            "apikey": settings.supabase_service_role_key or "",
            "authorization": f"Bearer {settings.supabase_service_role_key}",
            "content-type": "application/json",
        },
    )
    try:
        with _open_no_proxy(request, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        details = error.read().decode("utf-8")
        raise RuntimeError(f"Supabase select failed for {table}: {details}") from error
    except URLError as error:
        raise RuntimeError(f"Supabase select unavailable for {table}: {error.reason}") from error


def _update(table: str, row_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise SupabaseNotConfiguredError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required."
        )

    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/{table}?id=eq.{quote(row_id)}"
    body = json.dumps(payload).encode("utf-8")
    request = Request(
        url,
        data=body,
        method="PATCH",
        headers={
            "apikey": settings.supabase_service_role_key or "",
            "authorization": f"Bearer {settings.supabase_service_role_key}",
            "content-type": "application/json",
            "prefer": "return=representation",
        },
    )
    try:
        with _open_no_proxy(request, timeout=20) as response:
            decoded = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        details = error.read().decode("utf-8")
        raise RuntimeError(f"Supabase update failed for {table}: {details}") from error
    except URLError as error:
        raise RuntimeError(f"Supabase update unavailable for {table}: {error.reason}") from error

    if not decoded:
        raise RuntimeError(f"Supabase update returned no row for {table}.")
    return decoded[0]


def _delete(table: str, column: str, value: str) -> None:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise SupabaseNotConfiguredError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required."
        )

    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/{table}?{quote(column)}=eq.{quote(value)}"
    request = Request(
        url,
        method="DELETE",
        headers={
            "apikey": settings.supabase_service_role_key or "",
            "authorization": f"Bearer {settings.supabase_service_role_key}",
            "content-type": "application/json",
        },
    )
    try:
        with _open_no_proxy(request, timeout=20) as response:
            response.read()
    except HTTPError as error:
        details = error.read().decode("utf-8")
        raise RuntimeError(f"Supabase delete failed for {table}: {details}") from error
    except URLError as error:
        raise RuntimeError(f"Supabase delete unavailable for {table}: {error.reason}") from error


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _uuid_or_none(value: str | None) -> str | None:
    if not value:
        return None
    if re.fullmatch(
        r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}",
        value,
    ):
        return value
    return None


def _language_from_schema(schema: WebsiteSchema) -> str:
    value = schema.business.get("selectedLanguage") or schema.business.get("selected_language")
    return value if value in {"en", "es", "fr", "pt"} else "en"
