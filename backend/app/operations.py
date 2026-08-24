from __future__ import annotations

import json
import os
from typing import Any, Dict

from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Request, Response
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .admin_audit import list_admin_audit_events, record_admin_audit_event
from .client_auth import fetch_supabase_user, supabase_auth_configured
from .db import get_session
from .db_models import AdminAuditEvent, GeneratedSite, Order, Product, Store
from .operations_auth import (
    OPERATIONS_SESSION_COOKIE_NAME,
    clear_operations_session_cookie,
    operations_identity_from_user,
    require_operations_permission,
    set_operations_session_cookie,
)


router = APIRouter(prefix="/api/operations", tags=["operations"])


class OperationsAuthSessionRequest(BaseModel):
    access_token: str


def _token(authorization: str, cookie: str) -> str:
    if authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    return cookie.strip()


def _identity(authorization: str = "", cookie: str = "") -> Dict[str, Any]:
    token = _token(authorization, cookie)
    if not token:
        raise HTTPException(status_code=401, detail="Missing operations access token.")
    if not supabase_auth_configured():
        raise HTTPException(status_code=503, detail="Operations login is not configured.")
    user = fetch_supabase_user(token)
    identity = operations_identity_from_user(user or {})
    if not identity:
        raise HTTPException(status_code=403, detail="This account does not have VM Operations access.")
    return identity


def _audit_query(session: Session, request: Request, identity: Dict[str, Any], action: str, count: int) -> None:
    record_admin_audit_event(
        session,
        actor=identity,
        action=action,
        target_type="vm_operations",
        target_id="kreaton",
        outcome="success",
        request_id=getattr(request.state, "request_id", ""),
        metadata={"resultCount": count},
    )


def _json(value: str, fallback: Any) -> Any:
    try:
        parsed = json.loads(value or "")
    except (TypeError, ValueError):
        return fallback
    return parsed


@router.post("/auth/session")
def operations_auth_session(
    payload: OperationsAuthSessionRequest,
    request: Request,
    response: Response,
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    identity = _identity(f"Bearer {payload.access_token}")
    record_admin_audit_event(
        session,
        actor=identity,
        action="operations.auth.session_started",
        target_type="operations_account",
        target_id=identity["id"],
        outcome="success",
        request_id=getattr(request.state, "request_id", ""),
        metadata={"legacyRoleBridge": identity.get("legacyRoleBridge", False)},
    )
    set_operations_session_cookie(response, payload.access_token)
    return identity


@router.get("/auth/me")
def operations_auth_me(
    authorization: str = Header(default=""),
    vm_operations_session: str = Cookie(default="", alias=OPERATIONS_SESSION_COOKIE_NAME),
) -> Dict[str, Any]:
    return _identity(authorization, vm_operations_session)


@router.post("/auth/logout")
def operations_auth_logout(
    request: Request,
    response: Response,
    authorization: str = Header(default=""),
    vm_operations_session: str = Cookie(default="", alias=OPERATIONS_SESSION_COOKIE_NAME),
    session: Session = Depends(get_session),
) -> Dict[str, str]:
    try:
        identity = _identity(authorization, vm_operations_session)
    except HTTPException:
        identity = None
    if identity:
        record_admin_audit_event(
            session,
            actor=identity,
            action="operations.auth.session_ended",
            target_type="operations_account",
            target_id=identity["id"],
            outcome="success",
            request_id=getattr(request.state, "request_id", ""),
        )
    clear_operations_session_cookie(response)
    return {"status": "logged_out"}


@router.get("/overview")
def operations_overview(
    request: Request,
    authorization: str = Header(default=""),
    vm_operations_session: str = Cookie(default="", alias=OPERATIONS_SESSION_COOKIE_NAME),
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    identity = _identity(authorization, vm_operations_session)
    require_operations_permission(identity, "overview:read")
    paid = {"paid", "partially_fulfilled", "fulfilled"}
    orders = session.scalars(select(Order)).all()
    payload = {
        "businesses": int(session.scalar(select(func.count()).select_from(Store)) or 0),
        "sites": int(session.scalar(select(func.count()).select_from(GeneratedSite)) or 0),
        "publishedSites": int(session.scalar(select(func.count()).select_from(GeneratedSite).where(GeneratedSite.status == "published")) or 0),
        "orders": len(orders),
        "revenueCents": sum(order.total_cents for order in orders if order.status in paid),
        "pendingPayments": sum(1 for order in orders if order.status == "pending_payment"),
        "products": int(session.scalar(select(func.count()).select_from(Product)) or 0),
        "productsStatus": [
            {"id": "kreaton", "name": "KREATON", "status": "connected", "url": "/admin/"},
            {"id": "listo", "name": "Listo", "status": "separate", "url": os.getenv("LISTO_ADMIN_URL", "https://listo.vmbusinesssystems.com/admin/")},
        ],
    }
    _audit_query(session, request, identity, "operations.overview.queried", 1)
    return payload


@router.get("/requests")
def operations_requests(request: Request, authorization: str = Header(default=""), vm_operations_session: str = Cookie(default="", alias=OPERATIONS_SESSION_COOKIE_NAME), session: Session = Depends(get_session)) -> Dict[str, Any]:
    identity = _identity(authorization, vm_operations_session)
    require_operations_permission(identity, "requests:read")
    rows = session.scalars(select(GeneratedSite).where(GeneratedSite.status != "published").order_by(GeneratedSite.updated_at.desc()).limit(200)).all()
    items = [{"id": row.id, "businessName": row.business_name, "email": row.owner_email, "template": row.template_name or row.template_id, "status": row.status, "updatedAt": row.updated_at} for row in rows]
    _audit_query(session, request, identity, "operations.requests.queried", len(items))
    return {"items": items, "source": "generated_sites"}


@router.get("/businesses")
def operations_businesses(request: Request, authorization: str = Header(default=""), vm_operations_session: str = Cookie(default="", alias=OPERATIONS_SESSION_COOKIE_NAME), session: Session = Depends(get_session)) -> Dict[str, Any]:
    identity = _identity(authorization, vm_operations_session)
    require_operations_permission(identity, "businesses:read")
    rows = session.scalars(select(Store).order_by(Store.updated_at.desc()).limit(500)).all()
    items = [{"id": row.id, "name": row.name, "email": row.owner_email, "type": row.business_type, "status": row.status, "publicUrl": row.public_url, "updatedAt": row.updated_at} for row in rows]
    _audit_query(session, request, identity, "operations.businesses.queried", len(items))
    return {"items": items}


@router.get("/orders")
def operations_orders(request: Request, authorization: str = Header(default=""), vm_operations_session: str = Cookie(default="", alias=OPERATIONS_SESSION_COOKIE_NAME), session: Session = Depends(get_session)) -> Dict[str, Any]:
    identity = _identity(authorization, vm_operations_session)
    require_operations_permission(identity, "orders:read")
    stores = {row.id: row.name for row in session.scalars(select(Store)).all()}
    rows = session.scalars(select(Order).order_by(Order.created_at.desc()).limit(500)).all()
    items = [{"id": row.id, "number": row.order_number, "business": stores.get(row.store_id, row.store_id), "items": row.item_count, "totalCents": row.total_cents, "status": row.status, "createdAt": row.created_at} for row in rows]
    _audit_query(session, request, identity, "operations.orders.queried", len(items))
    return {"items": items}


@router.get("/sites")
def operations_sites(request: Request, authorization: str = Header(default=""), vm_operations_session: str = Cookie(default="", alias=OPERATIONS_SESSION_COOKIE_NAME), session: Session = Depends(get_session)) -> Dict[str, Any]:
    identity = _identity(authorization, vm_operations_session)
    require_operations_permission(identity, "sites:read")
    rows = session.scalars(select(GeneratedSite).order_by(GeneratedSite.updated_at.desc()).limit(500)).all()
    items = [{"id": row.id, "businessName": row.business_name, "email": row.owner_email, "template": row.template_name or row.template_id, "status": row.status, "publicUrl": row.public_url, "updatedAt": row.updated_at} for row in rows]
    _audit_query(session, request, identity, "operations.sites.queried", len(items))
    return {"items": items}


@router.get("/products")
def operations_products(request: Request, authorization: str = Header(default=""), vm_operations_session: str = Cookie(default="", alias=OPERATIONS_SESSION_COOKIE_NAME), session: Session = Depends(get_session)) -> Dict[str, Any]:
    identity = _identity(authorization, vm_operations_session)
    require_operations_permission(identity, "products:read")
    stores = {row.id: row.name for row in session.scalars(select(Store)).all()}
    rows = session.scalars(select(Product).order_by(Product.created_at.desc()).limit(500)).all()
    items = [{"id": row.id, "name": row.name, "business": stores.get(row.store_id, row.store_id), "category": row.category, "priceCents": row.price_cents, "inventory": row.inventory, "status": row.status} for row in rows]
    _audit_query(session, request, identity, "operations.products.queried", len(items))
    return {"items": items}


@router.get("/payments")
def operations_payments(request: Request, authorization: str = Header(default=""), vm_operations_session: str = Cookie(default="", alias=OPERATIONS_SESSION_COOKIE_NAME), session: Session = Depends(get_session)) -> Dict[str, Any]:
    identity = _identity(authorization, vm_operations_session)
    require_operations_permission(identity, "payments:read")
    stores = {row.id: row.name for row in session.scalars(select(Store)).all()}
    rows = session.scalars(select(Order).order_by(Order.created_at.desc()).limit(500)).all()
    items = [{"orderId": row.id, "number": row.order_number, "business": stores.get(row.store_id, row.store_id), "amountCents": row.total_cents, "status": row.status, "provider": (_json(row.payment_json, {}) or {}).get("provider", "not_recorded"), "createdAt": row.created_at} for row in rows]
    _audit_query(session, request, identity, "operations.payments.queried", len(items))
    return {"items": items, "currency": "USD"}


@router.get("/config")
def operations_config(request: Request, authorization: str = Header(default=""), vm_operations_session: str = Cookie(default="", alias=OPERATIONS_SESSION_COOKIE_NAME), session: Session = Depends(get_session)) -> Dict[str, Any]:
    identity = _identity(authorization, vm_operations_session)
    require_operations_permission(identity, "config:read")
    items = [
        {"key": "database", "label": "Base de datos persistente", "configured": bool(os.getenv("DATABASE_URL"))},
        {"key": "supabase", "label": "Supabase Auth", "configured": supabase_auth_configured()},
        {"key": "openai", "label": "OpenAI", "configured": bool(os.getenv("OPENAI_API_KEY"))},
        {"key": "stripe", "label": "Stripe", "configured": bool(os.getenv("STRIPE_SECRET_KEY"))},
        {"key": "listo", "label": "Panel Listo separado", "configured": bool(os.getenv("LISTO_ADMIN_URL")), "url": os.getenv("LISTO_ADMIN_URL", "https://listo.vmbusinesssystems.com/admin/")},
    ]
    _audit_query(session, request, identity, "operations.config.queried", len(items))
    return {"items": items, "readOnly": True}


@router.get("/audit")
def operations_audit(request: Request, authorization: str = Header(default=""), vm_operations_session: str = Cookie(default="", alias=OPERATIONS_SESSION_COOKIE_NAME), session: Session = Depends(get_session)) -> Dict[str, Any]:
    identity = _identity(authorization, vm_operations_session)
    require_operations_permission(identity, "audit:read")
    events, total = list_admin_audit_events(session, query="operations.", page=1, per_page=100)
    _audit_query(session, request, identity, "operations.audit.queried", len(events))
    return {"items": events, "total": total}
