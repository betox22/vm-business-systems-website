from __future__ import annotations

import re
import time
import unicodedata
from typing import Dict, List, Literal, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import get_session
from .db_models import DomainReservation, GeneratedSite, Store

"""Domain search / availability / reservation.

Ported from the Codex `site-source` prototype (app/api/business-state/route.ts,
`checkDomainSearch` / `checkDomainAvailability` / `assignDomainToStore` and
their helpers). That version checked availability against Cloudflare D1 tables
(`generated_sites`, `stores`, `domain_reservations`) plus a hardcoded taken-list
as a stand-in for a real registrar API. This keeps the same heuristic (there is
still no live registrar integration -- `knownTakenDomains` below is the same
placeholder set) but persists reservations via the SQLAlchemy layer in
`db.py`/`db_models.py` instead of D1, so it works on the existing Render
Python service.

See docs/AGENT_LOG.md (2026-07-18 entry) for context on why this exists and
what commerce.py still needs before these tables are the single source of
truth for orders/products.
"""

router = APIRouter(prefix="/api/v1/domains", tags=["domains"])

DomainStatus = Literal["available", "included", "premium", "taken"]
DomainSource = Literal["custom", "vmstores"]

KNOWN_TAKEN_DOMAINS = {
    "amazon.com",
    "apple.com",
    "crazybox.com",
    "facebook.com",
    "google.com",
    "instagram.com",
    "shopify.com",
    "wix.com",
}

_TLD_BASE_PRICES: Dict[str, Tuple[int, int]] = {
    ".com": (1200, 2500),
    ".io": (4500, 6900),
    ".net": (1400, 2800),
    ".store": (3900, 5900),
    ".us": (900, 1900),
}
_DEFAULT_TLD_PRICE: Tuple[int, int] = (1600, 3200)


class DomainOption(BaseModel):
    available: bool
    currency: str = "USD"
    domain: str
    price: str
    priceCents: int
    reason: str
    registrar: str
    renewalLabel: str
    retailPriceCents: int
    source: DomainSource
    status: DomainStatus


class DomainSearchResponse(BaseModel):
    query: str
    options: List[DomainOption]
    selectedDomain: str


class DomainReserveRequest(BaseModel):
    ownerEmail: str = Field(min_length=5, max_length=200)
    domain: str = Field(min_length=3, max_length=253)
    storeId: Optional[str] = None
    generatedSiteId: Optional[str] = None


class DomainReservationOut(BaseModel):
    id: str
    ownerEmail: str
    requestedDomain: str
    assignedDomain: str
    source: str
    registrar: str
    availabilityStatus: str
    purchaseStatus: str
    priceCents: int
    retailPriceCents: int
    currency: str
    renewalAt: Optional[str] = None


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value or "")
    without_accents = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    slug = re.sub(r"[^a-z0-9]+", "-", without_accents.lower())
    slug = slug.strip("-")
    return (slug or "nueva-web")[:42]


def normalize_domain_input(value: str, fallback_base: str) -> str:
    fallback = f"{slugify(fallback_base)}.com"
    clean = (value or fallback).strip().lower()
    clean = re.sub(r"^https?://", "", clean)
    clean = re.sub(r"^www\.", "", clean)
    clean = clean.split("/")[0].split("?")[0].split("#")[0]
    clean = re.sub(r"[^a-z0-9.-]", "", clean)
    clean = re.sub(r"\.+", ".", clean)
    clean = clean.strip("-")
    if not clean:
        clean = fallback
    if "." not in clean:
        clean = f"{slugify(clean)}.com"
    if clean.endswith(".vmstores.com"):
        base = slugify(clean[: -len(".vmstores.com")])
        return f"{base}.vmstores.com"
    labels = [slugify(label)[:63] for label in clean.split(".") if label]
    if len(labels) < 2:
        return fallback
    return ".".join(labels)[:253]


def domain_base(domain: str) -> str:
    normalized = normalize_domain_input(domain, "nueva-web")
    if normalized.endswith(".vmstores.com"):
        return slugify(normalized[: -len(".vmstores.com")])
    parts = normalized.split(".")
    return slugify("-".join(parts[:-1]) or parts[0] or "nueva-web")


def build_domain_candidates(requested_domain: str) -> List[str]:
    base = domain_base(requested_domain)
    raw_candidates = [
        requested_domain,
        f"{base}shop.com",
        f"{base}store.com",
        f"get{base}.com",
        f"{base}.store",
        f"{base}.us",
        f"{base}.vmstores.com",
    ]
    seen: List[str] = []
    for candidate in raw_candidates:
        normalized = normalize_domain_input(candidate, base)
        if normalized not in seen:
            seen.append(normalized)
    return seen


def domain_price_for(domain: str) -> Dict[str, int]:
    if domain.endswith(".vmstores.com"):
        return {
            "priceCents": 0,
            "retailPriceCents": 0,
            "premiumPriceCents": 0,
            "premiumRetailPriceCents": 0,
        }
    tld = domain[domain.rfind(".") :]
    price_cents, retail_price_cents = _TLD_BASE_PRICES.get(tld, _DEFAULT_TLD_PRICE)
    return {
        "priceCents": price_cents,
        "retailPriceCents": retail_price_cents,
        "premiumPriceCents": round(price_cents * 3.5),
        "premiumRetailPriceCents": round(retail_price_cents * 3.2),
    }


def is_premium_domain(domain: str) -> bool:
    base = domain_base(domain)
    return domain.endswith(".com") and (len(base) <= 5 or bool(re.search(r"premium|prime|lux|ai$", base)))


def format_money(cents: int) -> str:
    return f"${cents / 100:.2f}"


def check_domain_availability(
    session: Session,
    raw_domain: str,
    owner_email: str,
    store_id: Optional[str],
    current_site_id: Optional[str] = None,
) -> DomainOption:
    domain = normalize_domain_input(raw_domain, "nueva-web")
    source: DomainSource = "vmstores" if domain.endswith(".vmstores.com") else "custom"
    registrar = "V&M subdominios" if source == "vmstores" else "Registrar API"
    price = domain_price_for(domain)

    generated_owner = session.execute(
        select(GeneratedSite).where(GeneratedSite.public_url == domain)
    ).scalar_one_or_none()
    store_owner = session.execute(
        select(Store).where(Store.public_url == domain)
    ).scalar_one_or_none()
    reservation_owner = session.execute(
        select(DomainReservation).where(DomainReservation.assigned_domain == domain)
    ).scalar_one_or_none()

    generated_conflict = bool(
        generated_owner
        and generated_owner.id != current_site_id
        and not (generated_owner.owner_email == owner_email and generated_owner.store_id == store_id)
    )
    store_conflict = bool(store_owner and store_owner.id != store_id)
    reservation_conflict = bool(
        reservation_owner
        and reservation_owner.store_id != store_id
        and reservation_owner.purchase_status == "active"
    )
    taken = domain in KNOWN_TAKEN_DOMAINS or generated_conflict or store_conflict or reservation_conflict
    premium = (not taken) and source == "custom" and is_premium_domain(domain)
    status: DomainStatus = "taken" if taken else "included" if source == "vmstores" else "premium" if premium else "available"

    price_cents = price["premiumPriceCents"] if premium else price["priceCents"]
    retail_price_cents = price["premiumRetailPriceCents"] if premium else price["retailPriceCents"]
    reason = (
        "Ya esta registrado o reservado."
        if taken
        else "Incluido con la plataforma."
        if source == "vmstores"
        else "Disponible con precio premium."
        if premium
        else "Disponible para registro."
    )

    return DomainOption(
        available=not taken,
        currency="USD",
        domain=domain,
        price=format_money(retail_price_cents),
        priceCents=price_cents,
        reason=reason,
        registrar=registrar,
        renewalLabel="Incluido" if source == "vmstores" else "Renovacion anual",
        retailPriceCents=retail_price_cents,
        source=source,
        status=status,
    )


@router.get("/search", response_model=DomainSearchResponse)
async def search_domains(
    domain: str,
    ownerEmail: str,
    storeId: Optional[str] = None,
    currentSiteId: Optional[str] = None,
    session: Session = Depends(get_session),
) -> DomainSearchResponse:
    requested_domain = normalize_domain_input(domain, "nueva-web")
    options = [
        check_domain_availability(session, candidate, ownerEmail, storeId, currentSiteId)
        for candidate in build_domain_candidates(requested_domain)
    ]
    selected = next((option for option in options if option.available), None)
    return DomainSearchResponse(
        query=requested_domain,
        options=options,
        selectedDomain=(selected.domain if selected else requested_domain),
    )


def _reservation_out(reservation: DomainReservation) -> DomainReservationOut:
    return DomainReservationOut(
        id=reservation.id,
        ownerEmail=reservation.owner_email,
        requestedDomain=reservation.requested_domain,
        assignedDomain=reservation.assigned_domain,
        source=reservation.source,
        registrar=reservation.registrar,
        availabilityStatus=reservation.availability_status,
        purchaseStatus=reservation.purchase_status,
        priceCents=reservation.price_cents,
        retailPriceCents=reservation.retail_price_cents,
        currency=reservation.currency,
        renewalAt=reservation.renewal_at,
    )


@router.post("/reservations", response_model=DomainReservationOut)
async def reserve_domain(
    payload: DomainReserveRequest,
    session: Session = Depends(get_session),
) -> DomainReservationOut:
    option = check_domain_availability(session, payload.domain, payload.ownerEmail, payload.storeId)
    if not option.available:
        raise HTTPException(status_code=409, detail="domain_unavailable")

    existing = session.execute(
        select(DomainReservation).where(DomainReservation.assigned_domain == option.domain)
    ).scalar_one_or_none()

    renewal_at = None if option.source == "vmstores" else "in 1 year"
    if existing:
        if existing.store_id and existing.store_id != payload.storeId:
            raise HTTPException(status_code=409, detail="domain_unavailable")
        existing.generated_site_id = payload.generatedSiteId or existing.generated_site_id
        existing.requested_domain = option.domain
        existing.source = option.source
        existing.registrar = option.registrar
        existing.availability_status = option.status
        existing.purchase_status = "active"
        existing.price_cents = option.priceCents
        existing.retail_price_cents = option.retailPriceCents
        existing.currency = option.currency
        existing.renewal_at = existing.renewal_at or renewal_at
        existing.checked_at = int(time.time())
        session.commit()
        session.refresh(existing)
        return _reservation_out(existing)

    reservation = DomainReservation(
        generated_site_id=payload.generatedSiteId,
        store_id=payload.storeId,
        owner_email=payload.ownerEmail,
        requested_domain=option.domain,
        assigned_domain=option.domain,
        source=option.source,
        registrar=option.registrar,
        availability_status=option.status,
        purchase_status="active",
        price_cents=option.priceCents,
        retail_price_cents=option.retailPriceCents,
        currency=option.currency,
        renewal_at=renewal_at,
    )
    session.add(reservation)
    session.commit()
    session.refresh(reservation)
    return _reservation_out(reservation)


@router.get("/reservations", response_model=List[DomainReservationOut])
async def list_reservations(
    ownerEmail: str,
    session: Session = Depends(get_session),
) -> List[DomainReservationOut]:
    reservations = session.execute(
        select(DomainReservation).where(DomainReservation.owner_email == ownerEmail)
    ).scalars().all()
    return [_reservation_out(reservation) for reservation in reservations]
