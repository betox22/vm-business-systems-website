from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from .client_auth import require_client_user
from .commerce import cents_to_price, price_to_cents, require_store_owner
from .db import get_session
from .db_models import Setting as DbSetting
from .db_models import Store
from .db_models import TeamMember as DbTeamMember

router = APIRouter(prefix="/api/v1", tags=["team-settings"])

TeamRole = Literal["manager", "staff", "viewer"]

# ---------------------------------------------------------------------------
# Team members
#
# Design note (2026-09-20, task #53): this is deliberately a labeled roster,
# not a real multi-user auth system. TeamMember has no email/password/session
# of its own -- it exists so a store owner can keep track of who is on their
# team and what they are responsible for. Nothing in this backend grants a
# team member their own login or checks their role before allowing an
# action; the only real authenticated identity for a store today is its
# owner (a Supabase user, via require_client_user/require_store_owner).
#
# `role` is restricted to a small fixed set (see TeamRole) rather than free
# text so that a future real-access-control feature can build permission
# enforcement on top of these same role labels instead of a schema rewrite.
# `scope` stays free text -- it is a human description of what this person
# actually does ("atiende el mostrador los fines de semana"), not a
# permission string, and is unrelated to task #54 (real carrier shipping).
# ---------------------------------------------------------------------------


class TeamMemberCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    role: TeamRole
    scope: str = Field(default="", max_length=500)


class TeamMemberUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    role: Optional[TeamRole] = None
    scope: Optional[str] = Field(default=None, max_length=500)


def team_member_to_api(member: DbTeamMember) -> Dict[str, Any]:
    return {
        "id": member.id,
        "name": member.name,
        "role": member.role,
        "scope": member.scope,
        "createdAt": member.created_at,
    }


@router.get("/store-owner/{business_id}/team")
async def list_team_members(
    business_id: str,
    user: Dict[str, Any] = Depends(require_client_user),
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    require_store_owner(session, business_id, user)
    members: List[Dict[str, Any]] = [
        team_member_to_api(member)
        for member in session.execute(
            select(DbTeamMember)
            .where(DbTeamMember.store_id == business_id)
            .order_by(DbTeamMember.created_at.asc())
        ).scalars()
    ]
    return {"businessId": business_id, "members": members}


@router.post("/store-owner/{business_id}/team")
async def create_team_member(
    business_id: str,
    payload: TeamMemberCreate,
    user: Dict[str, Any] = Depends(require_client_user),
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    require_store_owner(session, business_id, user)
    member = DbTeamMember(
        store_id=business_id,
        name=payload.name.strip(),
        role=payload.role,
        scope=payload.scope.strip(),
    )
    session.add(member)
    session.commit()
    session.refresh(member)
    return team_member_to_api(member)


@router.patch("/store-owner/{business_id}/team/{member_id}")
async def update_team_member(
    business_id: str,
    member_id: str,
    payload: TeamMemberUpdate,
    user: Dict[str, Any] = Depends(require_client_user),
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    require_store_owner(session, business_id, user)
    member = session.get(DbTeamMember, member_id)
    if not member or member.store_id != business_id:
        raise HTTPException(status_code=404, detail="Team member not found.")
    if payload.name is not None:
        member.name = payload.name.strip()
    if payload.role is not None:
        member.role = payload.role
    if payload.scope is not None:
        member.scope = payload.scope.strip()
    session.commit()
    session.refresh(member)
    return team_member_to_api(member)


@router.delete("/store-owner/{business_id}/team/{member_id}")
async def delete_team_member(
    business_id: str,
    member_id: str,
    user: Dict[str, Any] = Depends(require_client_user),
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    require_store_owner(session, business_id, user)
    member = session.get(DbTeamMember, member_id)
    if not member or member.store_id != business_id:
        raise HTTPException(status_code=404, detail="Team member not found.")
    session.delete(member)
    session.commit()
    return {"id": member_id, "deleted": True}


# ---------------------------------------------------------------------------
# Store settings
#
# Backed by the generic Setting(store_id, key, value) key/value table so
# adding a new setting later never needs a schema migration. Keys are
# namespaced (business.*, shipping.*, notifications.*) purely for
# readability in the database; the API always speaks the grouped shape
# below, never raw keys, so the storage layout can change later without
# breaking callers.
#
# Shipping here is deliberately the simple case only: one flat rate, plus an
# optional dollar threshold above which shipping is free. Real carrier rate
# shopping and label purchase/printing (EasyPost/Shippo, per-product
# weight/dimensions, buying real postage) is out of scope -- see task #54.
# ---------------------------------------------------------------------------

_SETTING_KEYS: Dict[str, str] = {
    "business.public_name": "",
    "business.currency": "USD",
    "business.hours": "",
    "business.contact_email": "",
    "business.contact_phone": "",
    "business.address": "",
    "shipping.flat_rate_cents": "0",
    "shipping.free_threshold_cents": "",
    "notifications.new_order_email": "true",
    "notifications.low_stock_email": "true",
    "notifications.notify_email": "",
}


def _load_settings_map(session: Session, business_id: str) -> Dict[str, str]:
    rows = session.execute(
        select(DbSetting).where(DbSetting.store_id == business_id, DbSetting.key.in_(_SETTING_KEYS))
    ).scalars()
    return {row.key: row.value for row in rows}


def _bool_from_setting(value: str, default: bool) -> bool:
    if value == "":
        return default
    return value.strip().lower() == "true"


class BusinessSettings(BaseModel):
    publicName: str
    currency: str
    hours: str
    contactEmail: str
    contactPhone: str
    address: str


class ShippingSettings(BaseModel):
    flatRate: float
    freeShippingThreshold: Optional[float] = None


class NotificationSettings(BaseModel):
    newOrderEmail: bool
    lowStockEmail: bool
    notifyEmail: str


class StoreSettingsOut(BaseModel):
    businessId: str
    business: BusinessSettings
    shipping: ShippingSettings
    notifications: NotificationSettings


class BusinessSettingsPatch(BaseModel):
    publicName: Optional[str] = Field(default=None, max_length=200)
    currency: Optional[str] = Field(default=None, min_length=3, max_length=3)
    hours: Optional[str] = Field(default=None, max_length=500)
    contactEmail: Optional[str] = Field(default=None, max_length=254)
    contactPhone: Optional[str] = Field(default=None, max_length=40)
    address: Optional[str] = Field(default=None, max_length=500)


class ShippingSettingsPatch(BaseModel):
    flatRate: Optional[float] = Field(default=None, ge=0)
    freeShippingThreshold: Optional[float] = Field(default=None, ge=0)
    clearFreeShippingThreshold: bool = False


class NotificationSettingsPatch(BaseModel):
    newOrderEmail: Optional[bool] = None
    lowStockEmail: Optional[bool] = None
    notifyEmail: Optional[str] = Field(default=None, max_length=254)


class StoreSettingsPatch(BaseModel):
    business: Optional[BusinessSettingsPatch] = None
    shipping: Optional[ShippingSettingsPatch] = None
    notifications: Optional[NotificationSettingsPatch] = None


def _settings_to_api(store: Store, raw: Dict[str, str]) -> StoreSettingsOut:
    def get(key: str) -> str:
        return raw.get(key, _SETTING_KEYS[key])

    free_threshold_raw = get("shipping.free_threshold_cents").strip()
    free_threshold = cents_to_price(int(free_threshold_raw)) if free_threshold_raw else None

    return StoreSettingsOut(
        businessId=store.id,
        business=BusinessSettings(
            publicName=get("business.public_name") or store.name,
            currency=get("business.currency") or "USD",
            hours=get("business.hours"),
            contactEmail=get("business.contact_email") or store.owner_email,
            contactPhone=get("business.contact_phone"),
            address=get("business.address"),
        ),
        shipping=ShippingSettings(
            flatRate=cents_to_price(int(get("shipping.flat_rate_cents") or "0")),
            freeShippingThreshold=free_threshold,
        ),
        notifications=NotificationSettings(
            newOrderEmail=_bool_from_setting(get("notifications.new_order_email"), True),
            lowStockEmail=_bool_from_setting(get("notifications.low_stock_email"), True),
            notifyEmail=get("notifications.notify_email") or store.owner_email,
        ),
    )


def _upsert_setting(session: Session, business_id: str, key: str, value: str) -> None:
    existing = session.execute(
        select(DbSetting).where(DbSetting.store_id == business_id, DbSetting.key == key)
    ).scalar_one_or_none()
    if existing:
        existing.value = value
    else:
        session.add(DbSetting(store_id=business_id, key=key, value=value))


@router.get("/store-owner/{business_id}/settings")
async def get_store_settings(
    business_id: str,
    user: Dict[str, Any] = Depends(require_client_user),
    session: Session = Depends(get_session),
) -> StoreSettingsOut:
    store, _ = require_store_owner(session, business_id, user)
    raw = _load_settings_map(session, business_id)
    return _settings_to_api(store, raw)


@router.patch("/store-owner/{business_id}/settings")
async def update_store_settings(
    business_id: str,
    payload: StoreSettingsPatch,
    user: Dict[str, Any] = Depends(require_client_user),
    session: Session = Depends(get_session),
) -> StoreSettingsOut:
    store, _ = require_store_owner(session, business_id, user)

    if payload.business is not None:
        b = payload.business
        if b.publicName is not None:
            _upsert_setting(session, business_id, "business.public_name", b.publicName.strip())
        if b.currency is not None:
            _upsert_setting(session, business_id, "business.currency", b.currency.strip().upper())
        if b.hours is not None:
            _upsert_setting(session, business_id, "business.hours", b.hours.strip())
        if b.contactEmail is not None:
            _upsert_setting(session, business_id, "business.contact_email", b.contactEmail.strip())
        if b.contactPhone is not None:
            _upsert_setting(session, business_id, "business.contact_phone", b.contactPhone.strip())
        if b.address is not None:
            _upsert_setting(session, business_id, "business.address", b.address.strip())

    if payload.shipping is not None:
        s = payload.shipping
        if s.flatRate is not None:
            _upsert_setting(session, business_id, "shipping.flat_rate_cents", str(price_to_cents(s.flatRate)))
        if s.clearFreeShippingThreshold:
            _upsert_setting(session, business_id, "shipping.free_threshold_cents", "")
        elif s.freeShippingThreshold is not None:
            _upsert_setting(
                session, business_id, "shipping.free_threshold_cents", str(price_to_cents(s.freeShippingThreshold))
            )

    if payload.notifications is not None:
        n = payload.notifications
        if n.newOrderEmail is not None:
            _upsert_setting(
                session, business_id, "notifications.new_order_email", "true" if n.newOrderEmail else "false"
            )
        if n.lowStockEmail is not None:
            _upsert_setting(
                session, business_id, "notifications.low_stock_email", "true" if n.lowStockEmail else "false"
            )
        if n.notifyEmail is not None:
            _upsert_setting(session, business_id, "notifications.notify_email", n.notifyEmail.strip())

    session.commit()
    raw = _load_settings_map(session, business_id)
    return _settings_to_api(store, raw)
