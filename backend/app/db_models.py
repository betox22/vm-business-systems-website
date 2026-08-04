from __future__ import annotations

import time
import uuid
from typing import Optional

from sqlalchemy import ForeignKey, Index, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base

"""ORM tables adapted from the Codex `site-source` prototype's Drizzle schema
(`db/schema.ts`). Field names are translated from camelCase to snake_case and
ids are UUID strings (matching the style already used by commerce.py's
in-memory records, e.g. `ord_...`, `prod_...`) instead of autoincrement ints,
so these tables can later store the same ids commerce.py already hands out to
the frontend without a breaking rename.

These tables are additive: nothing in commerce.py reads from them yet. See
docs/AGENT_LOG.md (2026-07-18 entry) for the migration plan that wires
commerce.py's in-memory dicts (PRODUCTS, ORDERS, CARTS, ...) to this layer.
"""


def _id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def _now() -> int:
    return int(time.time())


class Store(Base):
    __tablename__ = "stores"

    # Design note (2026-07-19): this used to have UniqueConstraint("owner_email"),
    # which meant one email could only ever own a single store/project -- a
    # structural block on a client working on more than one site at a time.
    # Nothing reads from this table yet (see module docstring), so dropping the
    # constraint here is safe/additive. `owner_user_id` is the real Supabase
    # auth user id (the `sub` claim from /api/client/auth/me) and is what
    # multi-project lookups should key off going forward; `owner_email` is kept
    # for display/search but is no longer treated as a unique identity. See
    # docs/AGENT_LOG.md for the still-open project-switcher UI this enables.
    id: Mapped[str] = mapped_column(primary_key=True, default=lambda: _id("store"))
    owner_user_id: Mapped[Optional[str]] = mapped_column(index=True, default=None)
    owner_email: Mapped[str] = mapped_column(index=True)
    name: Mapped[str]
    business_type: Mapped[str]
    public_url: Mapped[str]
    status: Mapped[str] = mapped_column(default="published")
    created_at: Mapped[int] = mapped_column(default=_now)
    updated_at: Mapped[int] = mapped_column(default=_now, onupdate=_now)


class Product(Base):
    __tablename__ = "products"

    id: Mapped[str] = mapped_column(primary_key=True, default=lambda: _id("prod"))
    store_id: Mapped[str] = mapped_column(ForeignKey("stores.id"), index=True)
    name: Mapped[str]
    category: Mapped[str]
    price_cents: Mapped[int]
    inventory: Mapped[int] = mapped_column(default=0)
    status: Mapped[str] = mapped_column(default="Published")
    created_at: Mapped[int] = mapped_column(default=_now)


class Customer(Base):
    __tablename__ = "customers"
    __table_args__ = (UniqueConstraint("store_id", "email", name="customers_store_email_key"),)

    id: Mapped[str] = mapped_column(primary_key=True, default=lambda: _id("cust"))
    store_id: Mapped[str] = mapped_column(ForeignKey("stores.id"), index=True)
    name: Mapped[str]
    email: Mapped[str]
    segment: Mapped[str] = mapped_column(default="Nuevo")
    points: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[int] = mapped_column(default=_now)


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (UniqueConstraint("order_number", name="orders_order_number_key"),)

    id: Mapped[str] = mapped_column(primary_key=True, default=lambda: _id("ord"))
    store_id: Mapped[str] = mapped_column(ForeignKey("stores.id"), index=True)
    customer_id: Mapped[Optional[str]] = mapped_column(ForeignKey("customers.id"), nullable=True)
    order_number: Mapped[str]
    item_count: Mapped[int]
    total_cents: Mapped[int]
    status: Mapped[str]
    placed_at_label: Mapped[str] = mapped_column(default="")
    items_json: Mapped[str] = mapped_column(default="[]")
    shipping_address_json: Mapped[str] = mapped_column(default="{}")
    customer_snapshot_json: Mapped[str] = mapped_column(default="{}")
    payment_json: Mapped[str] = mapped_column(default="{}")
    inventory_restocked: Mapped[bool] = mapped_column(default=False)
    shipping_carrier: Mapped[Optional[str]] = mapped_column(nullable=True)
    tracking_code: Mapped[Optional[str]] = mapped_column(nullable=True)
    created_at: Mapped[int] = mapped_column(default=_now)


class CustomerNotification(Base):
    __tablename__ = "customer_notifications"
    __table_args__ = (
        Index("customer_notifications_store_id_idx", "store_id"),
        Index("customer_notifications_order_id_idx", "order_id"),
    )

    id: Mapped[str] = mapped_column(primary_key=True, default=lambda: _id("notif"))
    store_id: Mapped[str] = mapped_column(ForeignKey("stores.id"))
    order_id: Mapped[str] = mapped_column(ForeignKey("orders.id"))
    customer_id: Mapped[str] = mapped_column(ForeignKey("customers.id"))
    channel: Mapped[str] = mapped_column(default="email")
    subject: Mapped[str]
    body: Mapped[str]
    status: Mapped[str] = mapped_column(default="queued")
    created_at: Mapped[int] = mapped_column(default=_now)


class TeamMember(Base):
    __tablename__ = "team_members"

    id: Mapped[str] = mapped_column(primary_key=True, default=lambda: _id("team"))
    store_id: Mapped[str] = mapped_column(ForeignKey("stores.id"), index=True)
    name: Mapped[str]
    role: Mapped[str]
    scope: Mapped[str]
    created_at: Mapped[int] = mapped_column(default=_now)


class Setting(Base):
    __tablename__ = "settings"

    id: Mapped[str] = mapped_column(primary_key=True, default=lambda: _id("set"))
    store_id: Mapped[str] = mapped_column(ForeignKey("stores.id"), index=True)
    key: Mapped[str]
    value: Mapped[str]
    updated_at: Mapped[int] = mapped_column(default=_now, onupdate=_now)


class GeneratedSite(Base):
    __tablename__ = "generated_sites"
    __table_args__ = (
        Index("generated_sites_owner_email_idx", "owner_email"),
        Index("generated_sites_owner_user_id_idx", "owner_user_id"),
        Index("generated_sites_store_id_idx", "store_id"),
        UniqueConstraint("public_url", name="generated_sites_public_url_key"),
    )

    id: Mapped[str] = mapped_column(primary_key=True, default=lambda: _id("site"))
    store_id: Mapped[str] = mapped_column(ForeignKey("stores.id"))
    owner_user_id: Mapped[Optional[str]] = mapped_column(index=True, default=None)
    owner_email: Mapped[str]
    business_name: Mapped[str]
    business_type: Mapped[str]
    template_id: Mapped[str]
    template_name: Mapped[str]
    template_mode: Mapped[str]
    description: Mapped[str] = mapped_column(default="")
    hero_title: Mapped[str] = mapped_column(default="")
    hero_body: Mapped[str] = mapped_column(default="")
    announcement: Mapped[str] = mapped_column(default="")
    accent_color: Mapped[str] = mapped_column(default="")
    domain_slug: Mapped[str]
    public_url: Mapped[str]
    status: Mapped[str] = mapped_column(default="published")
    generated_config: Mapped[str] = mapped_column(default="{}")
    created_at: Mapped[int] = mapped_column(default=_now)
    updated_at: Mapped[int] = mapped_column(default=_now, onupdate=_now)


class GeneratedLogo(Base):
    """A paid logo asset attached to one generated KREATON site.

    Clean source paths stay private. `variants_json` only gains a public
    `publishedUrl` after the Stripe webhook has marked this record paid.
    """

    __tablename__ = "generated_logos"
    __table_args__ = (
        Index("generated_logos_owner_user_id_idx", "owner_user_id"),
        Index("generated_logos_store_id_idx", "store_id"),
        Index("generated_logos_site_id_idx", "site_id"),
    )

    id: Mapped[str] = mapped_column(primary_key=True, default=lambda: _id("logo"))
    site_id: Mapped[str] = mapped_column(ForeignKey("generated_sites.id"), index=True)
    store_id: Mapped[Optional[str]] = mapped_column(ForeignKey("stores.id"), nullable=True)
    owner_user_id: Mapped[Optional[str]] = mapped_column(index=True, default=None)
    owner_email: Mapped[str] = mapped_column(index=True)
    business_name: Mapped[str]
    generation_prompt: Mapped[str] = mapped_column(default="")
    variants_json: Mapped[str] = mapped_column(default="[]")
    selected_variant_index: Mapped[Optional[int]] = mapped_column(nullable=True)
    status: Mapped[str] = mapped_column(default="pending_selection")
    payment_json: Mapped[str] = mapped_column(default="{}")
    created_at: Mapped[int] = mapped_column(default=_now)
    updated_at: Mapped[int] = mapped_column(default=_now, onupdate=_now)


class DomainReservation(Base):
    __tablename__ = "domain_reservations"
    __table_args__ = (
        Index("domain_reservations_owner_email_idx", "owner_email"),
        Index("domain_reservations_store_id_idx", "store_id"),
        UniqueConstraint("assigned_domain", name="domain_reservations_assigned_domain_key"),
    )

    id: Mapped[str] = mapped_column(primary_key=True, default=lambda: _id("dom"))
    generated_site_id: Mapped[Optional[str]] = mapped_column(ForeignKey("generated_sites.id"), nullable=True)
    store_id: Mapped[Optional[str]] = mapped_column(ForeignKey("stores.id"), nullable=True)
    owner_email: Mapped[str]
    requested_domain: Mapped[str]
    assigned_domain: Mapped[str]
    source: Mapped[str] = mapped_column(default="vmstores")
    registrar: Mapped[str] = mapped_column(default="vmstores")
    availability_status: Mapped[str]
    purchase_status: Mapped[str] = mapped_column(default="pending")
    price_cents: Mapped[int]
    retail_price_cents: Mapped[int]
    currency: Mapped[str] = mapped_column(default="USD")
    renewal_at: Mapped[Optional[str]] = mapped_column(nullable=True)
    checked_at: Mapped[int] = mapped_column(default=_now)
    created_at: Mapped[int] = mapped_column(default=_now)
    updated_at: Mapped[int] = mapped_column(default=_now, onupdate=_now)
