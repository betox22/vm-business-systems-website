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
from .shipping_gateway import shipping_rates_configured

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
# Shipping has two layers now (task #54): the simple flat rate from #53 is
# still the fallback whenever real rate shopping cannot run (no EasyPost key
# configured, or the origin address below isn't fully filled in), and the
# `origin`/`defaultParcel` fields here feed the real per-order EasyPost rate
# quote in commerce.py's /checkout/shipping-rates. `origin` is a real,
# structured "ship from" address (separate from `business.address`, which is
# just the public-facing text shown to customers and isn't necessarily a
# valid mailing address). `defaultParcel` is one store-wide box size used for
# every order -- real per-product dimensions/bin-packing is a further
# refinement, not required for a first real integration; per-product weight
# (Product.weight_oz) is summed for real though, since that materially
# changes the quoted price.
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
    "shipping.origin_street1": "",
    "shipping.origin_city": "",
    "shipping.origin_state": "",
    "shipping.origin_zip": "",
    "shipping.origin_country": "US",
    "shipping.default_parcel_length_in": "9",
    "shipping.default_parcel_width_in": "6",
    "shipping.default_parcel_height_in": "4",
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


def real_shipping_rates_available(raw: Dict[str, str]) -> bool:
    """Whether real EasyPost rate shopping can run for this store right now.

    Requires both an EasyPost key configured on the server AND a fully
    filled-in origin address -- either one missing means checkout must fall
    back to the store's flat rate instead of erroring out.
    """

    if not shipping_rates_configured():
        return False
    required = (
        "shipping.origin_street1",
        "shipping.origin_city",
        "shipping.origin_state",
        "shipping.origin_zip",
    )
    return all(raw.get(key, "").strip() for key in required)


def get_shipping_origin_and_parcel(session: Session, business_id: str) -> Optional[Dict[str, Any]]:
    """Convenience for commerce.py: the EasyPost-shaped origin address + the
    store's default parcel dimensions, or None if real rate shopping isn't
    usable yet (see `real_shipping_rates_available`)."""

    raw = _load_settings_map(session, business_id)
    if not real_shipping_rates_available(raw):
        return None
    return {
        "from_address": {
            "street1": raw["shipping.origin_street1"],
            "city": raw["shipping.origin_city"],
            "state": raw["shipping.origin_state"],
            "zip": raw["shipping.origin_zip"],
            "country": raw.get("shipping.origin_country") or "US",
        },
        "length_in": float(raw.get("shipping.default_parcel_length_in") or "9"),
        "width_in": float(raw.get("shipping.default_parcel_width_in") or "6"),
        "height_in": float(raw.get("shipping.default_parcel_height_in") or "4"),
    }


def get_flat_shipping_rate_cents(session: Session, business_id: str) -> tuple[int, Optional[int]]:
    """The #53 fallback: (flat_rate_cents, free_threshold_cents_or_None)."""

    raw = _load_settings_map(session, business_id)
    flat_rate = int(raw.get("shipping.flat_rate_cents") or "0")
    threshold_raw = raw.get("shipping.free_threshold_cents", "").strip()
    threshold = int(threshold_raw) if threshold_raw else None
    return flat_rate, threshold


class BusinessSettings(BaseModel):
    publicName: str
    currency: str
    hours: str
    contactEmail: str
    contactPhone: str
    address: str


class ShippingOrigin(BaseModel):
    street1: str
    city: str
    state: str
    zip: str
    country: str


class DefaultParcel(BaseModel):
    lengthIn: float
    widthIn: float
    heightIn: float


class ShippingSettings(BaseModel):
    flatRate: float
    freeShippingThreshold: Optional[float] = None
    origin: ShippingOrigin
    defaultParcel: DefaultParcel
    realRatesConfigured: bool


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


class ShippingOriginPatch(BaseModel):
    street1: Optional[str] = Field(default=None, max_length=240)
    city: Optional[str] = Field(default=None, max_length=120)
    state: Optional[str] = Field(default=None, max_length=120)
    zip: Optional[str] = Field(default=None, max_length=40)
    country: Optional[str] = Field(default=None, min_length=2, max_length=2)


class DefaultParcelPatch(BaseModel):
    lengthIn: Optional[float] = Field(default=None, gt=0)
    widthIn: Optional[float] = Field(default=None, gt=0)
    heightIn: Optional[float] = Field(default=None, gt=0)


class ShippingSettingsPatch(BaseModel):
    flatRate: Optional[float] = Field(default=None, ge=0)
    freeShippingThreshold: Optional[float] = Field(default=None, ge=0)
    clearFreeShippingThreshold: bool = False
    origin: Optional[ShippingOriginPatch] = None
    defaultParcel: Optional[DefaultParcelPatch] = None


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
            origin=ShippingOrigin(
                street1=get("shipping.origin_street1"),
                city=get("shipping.origin_city"),
                state=get("shipping.origin_state"),
                zip=get("shipping.origin_zip"),
                country=get("shipping.origin_country") or "US",
            ),
            defaultParcel=DefaultParcel(
                lengthIn=float(get("shipping.default_parcel_length_in") or "9"),
                widthIn=float(get("shipping.default_parcel_width_in") or "6"),
                heightIn=float(get("shipping.default_parcel_height_in") or "4"),
            ),
            realRatesConfigured=real_shipping_rates_available(raw),
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
        if s.origin is not None:
            o = s.origin
            if o.street1 is not None:
                _upsert_setting(session, business_id, "shipping.origin_street1", o.street1.strip())
            if o.city is not None:
                _upsert_setting(session, business_id, "shipping.origin_city", o.city.strip())
            if o.state is not None:
                _upsert_setting(session, business_id, "shipping.origin_state", o.state.strip())
            if o.zip is not None:
                _upsert_setting(session, business_id, "shipping.origin_zip", o.zip.strip())
            if o.country is not None:
                _upsert_setting(session, business_id, "shipping.origin_country", o.country.strip().upper())
        if s.defaultParcel is not None:
            p = s.defaultParcel
            if p.lengthIn is not None:
                _upsert_setting(session, business_id, "shipping.default_parcel_length_in", str(p.lengthIn))
            if p.widthIn is not None:
                _upsert_setting(session, business_id, "shipping.default_parcel_width_in", str(p.widthIn))
            if p.heightIn is not None:
                _upsert_setting(session, business_id, "shipping.default_parcel_height_in", str(p.heightIn))

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
