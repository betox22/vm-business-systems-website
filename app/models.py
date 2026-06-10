from sqlalchemy import Boolean, ForeignKey, Integer, JSON, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Tenant(Base):
    __tablename__ = "tenants"
    __table_args__ = (
        UniqueConstraint("subdomain", name="uq_tenants_subdomain"),
        UniqueConstraint("custom_domain", name="uq_tenants_custom_domain"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    subdomain: Mapped[str | None] = mapped_column(String(80), nullable=True)
    custom_domain: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    products: Mapped[list["Product"]] = relationship(back_populates="tenant")
    pages: Mapped[list["StorePage"]] = relationship(back_populates="tenant")
    customers: Mapped[list["StoreCustomer"]] = relationship(back_populates="tenant")
    orders: Mapped[list["Order"]] = relationship(back_populates="tenant")
    design_config: Mapped["StoreDesignConfig | None"] = relationship(
        back_populates="tenant",
        cascade="all, delete-orphan",
        uselist=False,
    )


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    price: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    tenant: Mapped[Tenant] = relationship(back_populates="products")


class StoreDesignConfig(Base):
    __tablename__ = "store_design_configs"
    __table_args__ = (UniqueConstraint("tenant_id", name="uq_design_configs_tenant"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    store_type: Mapped[str] = mapped_column(String(40), nullable=False, default="retail")
    colors: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    fonts: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    section_order: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    layout_mode: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    domain_config: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    integrations: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    print_credentials: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    custom_logic: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    raw_config: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    tenant: Mapped[Tenant] = relationship(back_populates="design_config")


class StorePage(Base):
    __tablename__ = "store_pages"
    __table_args__ = (UniqueConstraint("tenant_id", "slug", name="uq_pages_tenant_slug"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    slug: Mapped[str] = mapped_column(String(160), nullable=False)
    page_type: Mapped[str] = mapped_column(String(60), nullable=False, default="custom")
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="draft")
    config: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    tenant: Mapped[Tenant] = relationship(back_populates="pages")


class StoreCustomer(Base):
    __tablename__ = "store_customers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(60), nullable=True)
    email: Mapped[str | None] = mapped_column(String(160), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)

    tenant: Mapped[Tenant] = relationship(back_populates="customers")
    orders: Mapped[list["Order"]] = relationship(back_populates="customer")


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    customer_id: Mapped[int | None] = mapped_column(ForeignKey("store_customers.id"), nullable=True)
    order_number: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="new")
    total: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    payment_status: Mapped[str] = mapped_column(String(40), nullable=False, default="pending")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    tenant: Mapped[Tenant] = relationship(back_populates="orders")
    customer: Mapped[StoreCustomer | None] = relationship(back_populates="orders")
    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order",
        cascade="all, delete-orphan",
    )


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), nullable=False, index=True)
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    unit_price: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0)

    order: Mapped[Order] = relationship(back_populates="items")
