from fastapi import HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import get_settings
from .models import Tenant


def normalize_host(host: str) -> str:
    return host.split(":", 1)[0].strip().lower().rstrip(".")


def subdomain_from_host(host: str, root_domain: str) -> str | None:
    host = normalize_host(host)
    root_domain = normalize_host(root_domain)
    suffix = f".{root_domain}"

    if host == root_domain or not host.endswith(suffix):
        return None

    subdomain = host[: -len(suffix)]
    if not subdomain or "." in subdomain:
        return None
    return subdomain


def resolve_tenant_from_host(host: str, db: Session) -> Tenant:
    normalized_host = normalize_host(host)
    settings = get_settings()

    tenant = db.scalar(
        select(Tenant).where(
            Tenant.custom_domain == normalized_host,
            Tenant.is_active.is_(True),
        )
    )
    if tenant:
        return tenant

    subdomain = subdomain_from_host(normalized_host, settings.default_root_domain)
    if subdomain:
        tenant = db.scalar(
            select(Tenant).where(
                Tenant.subdomain == subdomain,
                Tenant.is_active.is_(True),
            )
        )
        if tenant:
            return tenant

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Tienda no encontrada para este dominio.",
    )


def get_current_tenant(request: Request, db: Session) -> Tenant:
    forwarded_host = request.headers.get("x-forwarded-host")
    host = forwarded_host or request.headers.get("host") or ""
    return resolve_tenant_from_host(host, db)
