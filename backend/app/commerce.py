from __future__ import annotations

import hashlib
import hmac
import json
import os
import time
import uuid
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, List, Literal, Optional
from urllib import parse, request as urllib_request

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .client_auth import fetch_supabase_user, supabase_auth_configured
from .db import get_session
from .db_models import Customer as DbCustomer
from .db_models import Order as DbOrder
from .db_models import Product as DbProduct
from .db_models import Store

router = APIRouter(prefix="/api/v1", tags=["commerce"])

Money = Decimal
OrderStatus = Literal[
    "draft",
    "pending_payment",
    "payment_processing",
    "paid",
    "partially_fulfilled",
    "fulfilled",
    "cancelled",
    "refunded",
    "failed",
]


def money(value: Decimal | int | float | str) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def money_float(value: Decimal | int | float | str) -> float:
    return float(money(value))


class Category(BaseModel):
    id: str
    name: str
    description: str
    productCount: int = 0


class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    businessId: str
    slug: str
    name: str
    categoryId: str
    description: str
    price: float
    currency: str = "USD"
    sku: str
    stock: int
    active: bool = True
    published: bool = True
    status: str = "Published"
    badge: Optional[str] = None
    specs: Dict[str, str] = Field(default_factory=dict)
    imageUrl: Optional[str] = None


class ProductCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    categoryId: str
    description: str = Field(default="", max_length=1200)
    price: float = Field(gt=0)
    currency: str = "USD"
    sku: str = Field(min_length=2, max_length=80)
    stock: int = Field(ge=0)
    active: bool = True
    published: bool = True
    badge: Optional[str] = None
    specs: Dict[str, str] = Field(default_factory=dict)
    imageUrl: Optional[str] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=160)
    categoryId: Optional[str] = None
    description: Optional[str] = Field(default=None, max_length=1200)
    price: Optional[float] = Field(default=None, gt=0)
    currency: Optional[str] = None
    sku: Optional[str] = Field(default=None, min_length=2, max_length=80)
    stock: Optional[int] = Field(default=None, ge=0)
    active: Optional[bool] = None
    published: Optional[bool] = None
    badge: Optional[str] = None
    specs: Optional[Dict[str, str]] = None
    imageUrl: Optional[str] = None


class AddCartItemRequest(BaseModel):
    businessId: str = "demo-premium"
    cartId: str = "demo-cart"
    productId: str
    quantity: int = Field(default=1, ge=1, le=99)


class UpdateCartItemRequest(BaseModel):
    quantity: int = Field(ge=1, le=99)


class CheckoutQuoteRequest(BaseModel):
    cartId: str = "demo-cart"


class CustomerInfo(BaseModel):
    email: str = Field(min_length=5, max_length=200)
    firstName: str = Field(default="", max_length=100)
    lastName: str = Field(default="", max_length=100)


class ShippingAddress(BaseModel):
    line1: str = Field(min_length=2, max_length=240)
    city: str = Field(default="", max_length=120)
    region: str = Field(default="", max_length=120)
    postalCode: str = Field(default="", max_length=40)
    country: str = Field(default="US", max_length=2)


class CheckoutSessionRequest(BaseModel):
    cartId: str = "demo-cart"
    businessId: str = "demo-premium"
    customer: CustomerInfo
    shippingAddress: ShippingAddress
    successUrl: str = "https://example.com/order/success"
    cancelUrl: str = "https://example.com/cart"


class ManualOrderRequest(CheckoutSessionRequest):
    paymentInstructionsAccepted: bool = False


class PaymentMethodPatch(BaseModel):
    enabledMethods: List[str] = Field(default_factory=list)
    currency: str = "USD"
    captureMode: Literal["automatic", "manual"] = "automatic"
    manualInstructions: Optional[str] = None


class OrderStatusPatch(BaseModel):
    status: OrderStatus


class ShippingPatch(BaseModel):
    carrier: Optional[str] = None
    trackingNumber: Optional[str] = None
    status: Optional[str] = None


class SupportRequest(BaseModel):
    subject: str = Field(min_length=2, max_length=160)
    message: str = Field(min_length=2, max_length=2000)


class CustomerProfilePatch(BaseModel):
    email: Optional[str] = Field(default=None, min_length=5, max_length=200)
    name: Optional[str] = Field(default=None, max_length=160)
    phone: Optional[str] = Field(default=None, max_length=80)


class CustomerAddressCreate(BaseModel):
    label: str = Field(default="Default", max_length=80)
    line1: str = Field(min_length=2, max_length=240)
    city: str = Field(default="", max_length=120)
    region: str = Field(default="", max_length=120)
    postalCode: str = Field(default="", max_length=40)
    country: str = Field(default="US", max_length=2)


BUSINESS_ID = "demo-premium"
# Cleanup (2026-07-20): the old BUSINESSES/PRODUCTS in-memory seed dicts were
# removed here. assert_business() and the storefront/checkout endpoints read
# real Store/Product rows from the database now (see the Fase 1/Fase 2 log
# entries below); BUSINESS_ID stays only because the still-in-memory
# customer/{me,addresses} endpoints and the PAYMENT_METHODS seed use it as a
# placeholder businessId, and those weren't in scope for Fase 1/2.

CATEGORIES: Dict[str, Category] = {
    "flagship": Category(id="flagship", name="Flagship devices", description="Hero products and premium models.", productCount=3),
    "accessories": Category(id="accessories", name="Accessories", description="Cases, docks, chargers, and add-on kits.", productCount=1),
    "bundles": Category(id="bundles", name="Bundles", description="Curated kits and launch bundles.", productCount=0),
    "care": Category(id="care", name="Care plans", description="Warranty, support, and replacement plans.", productCount=0),
}

CARTS: Dict[str, List[Dict[str, Any]]] = {}
IDEMPOTENCY_KEYS: Dict[str, str] = {}
PAYMENT_METHODS: Dict[str, Dict[str, Any]] = {
    BUSINESS_ID: {
        "businessId": BUSINESS_ID,
        "enabledMethods": ["card", "apple_pay", "google_pay"],
        "currency": "USD",
        "captureMode": "automatic",
        "manualInstructions": "",
        "provider": "stripe",
        "providerConfigured": bool(os.getenv("STRIPE_SECRET_KEY")),
    }
}
AUDIT_LOG: List[Dict[str, Any]] = []
SUPPORT_TICKETS: List[Dict[str, Any]] = []
CUSTOMER_PROFILES: Dict[str, Dict[str, Any]] = {
    "demo-customer": {
        "userId": "demo-customer",
        "email": "customer@example.com",
        "name": "Alex Rivera",
        "phone": "",
        "roles": ["customer"],
    }
}
CUSTOMER_ADDRESSES: Dict[str, List[Dict[str, Any]]] = {
    "demo-customer": [
        {"id": "addr_demo", "label": "Default", "line1": "120 Market Street", "city": "Miami", "region": "FL", "postalCode": "33101", "country": "US"}
    ]
}


def assert_business(session: Session, business_id: str) -> Store:
    store = session.get(Store, business_id)
    if not store:
        raise HTTPException(status_code=404, detail="Business not found.")
    return store


def store_to_api(store: Store) -> Dict[str, Any]:
    return {
        "id": store.id,
        "name": store.name,
        "currency": "USD",
        "templateId": store.business_type or "premium-product-store",
        "publicUrl": store.public_url,
        "status": store.status,
    }


def public_products(session: Session, business_id: str) -> list[Product]:
    assert_business(session, business_id)
    return [
        db_product_to_api(product)
        for product in session.execute(
            select(DbProduct)
            .where(DbProduct.store_id == business_id, DbProduct.status == "Published")
            .order_by(DbProduct.created_at.desc())
        ).scalars()
    ]


def public_categories_from_products(products: list[Product]) -> list[Category]:
    counts: Dict[str, int] = {}
    for product in products:
        counts[product.categoryId] = counts.get(product.categoryId, 0) + 1

    categories: list[Category] = []
    for category_id, count in sorted(counts.items()):
        default = CATEGORIES.get(category_id)
        if default:
            categories.append(default.model_copy(update={"productCount": count}))
        else:
            categories.append(
                Category(
                    id=category_id,
                    name=category_id.replace("-", " ").replace("_", " ").title(),
                    description="",
                    productCount=count,
                )
            )
    return categories


def cart_lines(cart_id: str) -> list[Dict[str, Any]]:
    return CARTS.setdefault(cart_id, [])


def payment_methods_for_business(business_id: str) -> Dict[str, Any]:
    methods = PAYMENT_METHODS.setdefault(
        business_id,
        {
            "businessId": business_id,
            "enabledMethods": ["card"],
            "currency": "USD",
            "captureMode": "automatic",
            "manualInstructions": "",
            "provider": "stripe",
            "providerConfigured": False,
        },
    )
    methods["providerConfigured"] = bool(os.getenv("STRIPE_SECRET_KEY"))
    return methods


def db_product_for_cart(session: Session, business_id: str, product_id: str) -> DbProduct:
    product = session.get(DbProduct, product_id)
    if not product or product.store_id != business_id or product.status != "Published":
        raise HTTPException(status_code=404, detail="Product not found.")
    return product


def cart_response(cart_id: str, session: Session, business_id: Optional[str] = None) -> Dict[str, Any]:
    # Cleanup (2026-07-20): this used to have an in-memory PRODUCTS fallback
    # for when `session` wasn't passed. Every call site has passed a real
    # session since Fase 2, so `session` is now required and the cart always
    # validates against real DB products -- no more silent stale-data path.
    lines = []
    subtotal = money(0)
    for line in cart_lines(cart_id):
        if business_id and line.get("businessId") != business_id:
            continue

        store_id = str(line.get("businessId") or "")
        db_product = session.get(DbProduct, line["productId"])
        if not db_product or db_product.store_id != store_id or db_product.status != "Published":
            continue
        product = db_product_to_api(db_product)
        stock_available = max(0, int(db_product.inventory or 0))

        qty = int(line["quantity"])
        line_total = money(product.price) * qty
        subtotal += line_total
        lines.append(
            {
                "cartItemId": line["cartItemId"],
                "productId": product.id,
                "name": product.name,
                "sku": product.sku,
                "quantity": qty,
                "unitPrice": money_float(product.price),
                "lineTotal": money_float(line_total),
                "stockAvailable": stock_available,
            }
        )
    shipping = money(0) if subtotal else money(0)
    tax = money(subtotal * Decimal("0.07"))
    total = money(subtotal + shipping + tax)
    return {
        "cartId": cart_id,
        "items": lines,
        "subtotal": money_float(subtotal),
        "shippingEstimate": money_float(shipping),
        "taxEstimate": money_float(tax),
        "total": money_float(total),
        "checkoutEligible": bool(lines),
    }


def require_store_role(role: Optional[str]) -> None:
    if role not in {"admin", "store_owner", "manager"}:
        raise HTTPException(status_code=403, detail="Store owner or manager role required.")


def _bearer_token(authorization: str) -> str:
    return authorization[7:].strip() if authorization.lower().startswith("bearer ") else ""


def authenticated_store_user(authorization: str) -> Dict[str, Any]:
    token = _bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Missing access token.")
    if not supabase_auth_configured():
        raise HTTPException(status_code=503, detail="Account login is not configured on the server yet.")
    user = fetch_supabase_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")
    return user


def require_store_owner(session: Session, business_id: str, authorization: str) -> tuple[Store, Dict[str, Any]]:
    user = authenticated_store_user(authorization)
    store = session.get(Store, business_id)
    if not store:
        raise HTTPException(status_code=404, detail="Business not found.")

    owner_user_id = str(user.get("id") or "").strip()
    owner_email = str(user.get("email") or "").strip().lower()
    store_owner_user_id = str(store.owner_user_id or "").strip()
    store_owner_email = str(store.owner_email or "").strip().lower()

    owns_by_user_id = bool(owner_user_id and store_owner_user_id and owner_user_id == store_owner_user_id)
    owns_by_email = bool(owner_email and store_owner_email and owner_email == store_owner_email)
    if not owns_by_user_id and not owns_by_email:
        raise HTTPException(status_code=403, detail="Store does not belong to this account.")
    return store, user


def price_to_cents(price: Decimal | int | float | str) -> int:
    return int((money(price) * 100).to_integral_value(rounding=ROUND_HALF_UP))


def cents_to_price(cents: int) -> float:
    return money_float(Decimal(int(cents or 0)) / Decimal("100"))


def product_slug(value: str) -> str:
    slug = "".join(character if character.isalnum() else "-" for character in (value or "").lower())
    slug = "-".join(part for part in slug.split("-") if part)
    return (slug or "product")[:80]


def product_status(*, active: bool, published: bool) -> str:
    if not active:
        return "Archived"
    return "Published" if published else "Draft"


def db_product_to_api(product: DbProduct) -> Product:
    status = product.status or "Published"
    return Product(
        id=product.id,
        businessId=product.store_id,
        slug=product_slug(product.name),
        name=product.name,
        categoryId=product.category,
        description="",
        price=cents_to_price(product.price_cents),
        sku=product.id,
        stock=int(product.inventory or 0),
        active=status != "Archived",
        published=status == "Published",
        status=status,
    )


def audit(actor: str, action: str, business_id: str, payload: Dict[str, Any]) -> None:
    AUDIT_LOG.append(
        {
            "id": f"audit_{uuid.uuid4().hex[:10]}",
            "actor": actor,
            "action": action,
            "businessId": business_id,
            "payload": payload,
            "createdAt": int(time.time()),
        }
    )


def json_field(value: Any, fallback: Any) -> Any:
    if not value:
        return fallback
    try:
        parsed = json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return fallback
    return parsed


def order_tracking(order: DbOrder) -> Optional[Dict[str, str]]:
    if not order.shipping_carrier and not order.tracking_code:
        return None
    return {
        "carrier": order.shipping_carrier or "",
        "trackingNumber": order.tracking_code or "",
    }


def order_to_api(order: DbOrder) -> Dict[str, Any]:
    items = json_field(order.items_json, [])
    customer = json_field(order.customer_snapshot_json, {})
    shipping_address = json_field(order.shipping_address_json, {})
    payment = json_field(order.payment_json, {})
    subtotal = money(sum(money(item.get("lineTotal", 0)) for item in items))
    total = money(cents_to_price(order.total_cents))
    tax = money(max(Decimal("0"), total - subtotal))
    return {
        "id": order.id,
        "orderNumber": order.order_number,
        "businessId": order.store_id,
        "customer": customer,
        "shippingAddress": shipping_address,
        "items": items,
        "subtotal": money_float(subtotal),
        "shippingAmount": 0,
        "taxAmount": money_float(tax),
        "total": money_float(total),
        "status": order.status,
        "payment": payment,
        "tracking": order_tracking(order),
        "inventoryReserved": False,
        "inventoryDeducted": True,
        "createdAt": order.created_at,
    }


def customer_display_name(customer: CustomerInfo) -> str:
    name = f"{customer.firstName} {customer.lastName}".strip()
    return name or customer.email


def find_or_create_customer(session: Session, business_id: str, customer: CustomerInfo) -> DbCustomer:
    email = customer.email.strip().lower()
    existing = session.execute(
        select(DbCustomer).where(
            DbCustomer.store_id == business_id,
            func.lower(DbCustomer.email) == email,
        )
    ).scalar_one_or_none()
    name = customer_display_name(customer)
    if existing:
        existing.email = email
        if name and existing.name != name:
            existing.name = name
        return existing

    db_customer = DbCustomer(
        id=f"cust_{uuid.uuid4().hex[:12]}",
        store_id=business_id,
        name=name,
        email=email,
    )
    session.add(db_customer)
    return db_customer


def generate_order_number(session: Session) -> str:
    for _ in range(20):
        order_number = f"KR-{uuid.uuid4().hex[:6].upper()}"
        existing = session.scalar(select(DbOrder.id).where(DbOrder.order_number == order_number))
        if not existing:
            return order_number
    raise HTTPException(status_code=500, detail="Could not allocate order number.")


def create_order_from_cart(
    session: Session,
    cart_id: str,
    business_id: str,
    customer: CustomerInfo,
    shipping_address: ShippingAddress,
    status: OrderStatus,
    payment: Dict[str, Any],
) -> DbOrder:
    assert_business(session, business_id)
    quote = cart_response(cart_id, session, business_id)
    if not quote["checkoutEligible"]:
        raise HTTPException(status_code=400, detail="Cart is empty.")

    products_by_id: Dict[str, DbProduct] = {}
    for item in quote["items"]:
        product = db_product_for_cart(session, business_id, item["productId"])
        if int(product.inventory or 0) < int(item["quantity"]):
            raise HTTPException(status_code=409, detail=f"{product.name} does not have enough stock.")
        products_by_id[item["productId"]] = product

    movements = []
    for item in quote["items"]:
        product = products_by_id[item["productId"]]
        before = int(product.inventory or 0)
        product.inventory = before - int(item["quantity"])
        movements.append(
            {
                "productId": product.id,
                "sku": product.id,
                "quantity": int(item["quantity"]),
                "before": before,
                "after": product.inventory,
            }
        )

    db_customer = find_or_create_customer(session, business_id, customer)
    order_id = f"ord_{uuid.uuid4().hex[:12]}"
    order = DbOrder(
        id=order_id,
        store_id=business_id,
        customer_id=db_customer.id,
        order_number=generate_order_number(session),
        item_count=sum(int(item["quantity"]) for item in quote["items"]),
        total_cents=price_to_cents(quote["total"]),
        status=status,
        placed_at_label="",
        items_json=json.dumps(quote["items"]),
        shipping_address_json=json.dumps(shipping_address.model_dump()),
        customer_snapshot_json=json.dumps(customer.model_dump()),
        payment_json=json.dumps(payment),
    )
    session.add(order)
    session.commit()
    session.refresh(order)
    audit(customer.email, "inventory_deducted", business_id, {"orderId": order.id, "movements": movements})
    return order


def restock_order_inventory(session: Session, order: DbOrder, business_id: str) -> list[Dict[str, Any]]:
    if order.inventory_restocked:
        return []

    movements = []
    for item in json_field(order.items_json, []):
        product_id = str(item.get("productId") or "")
        quantity = int(item.get("quantity") or 0)
        if not product_id or quantity <= 0:
            continue
        product = session.get(DbProduct, product_id)
        if not product or product.store_id != business_id:
            continue
        before = int(product.inventory or 0)
        product.inventory = before + quantity
        movements.append(
            {
                "productId": product.id,
                "sku": product.id,
                "quantity": quantity,
                "before": before,
                "after": product.inventory,
            }
        )

    order.inventory_restocked = True
    return movements


def stripe_checkout_session(order: Dict[str, Any], success_url: str, cancel_url: str) -> Dict[str, Any]:
    secret_key = os.getenv("STRIPE_SECRET_KEY")
    if not secret_key:
        return {
            "provider": "stripe",
            "providerStatus": "not_configured",
            "message": "STRIPE_SECRET_KEY is not configured. Store admin must connect payments before live checkout.",
        }

    fields: Dict[str, Any] = {
        "mode": "payment",
        "success_url": success_url,
        "cancel_url": cancel_url,
        "metadata[order_id]": order["id"],
        "metadata[order_number]": order["orderNumber"],
    }
    for index, item in enumerate(order["items"]):
        unit_amount = int(money(item["unitPrice"]) * 100)
        fields[f"line_items[{index}][price_data][currency]"] = "usd"
        fields[f"line_items[{index}][price_data][product_data][name]"] = item["name"]
        fields[f"line_items[{index}][price_data][unit_amount]"] = str(unit_amount)
        fields[f"line_items[{index}][quantity]"] = str(item["quantity"])

    encoded = parse.urlencode(fields).encode("utf-8")
    req = urllib_request.Request(
        "https://api.stripe.com/v1/checkout/sessions",
        data=encoded,
        headers={
            "Authorization": f"Bearer {secret_key}",
            "Stripe-Version": "2026-02-25.clover",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        method="POST",
    )
    try:
        with urllib_request.urlopen(req, timeout=12) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception as exc:  # pragma: no cover - depends on live provider/network
        raise HTTPException(status_code=502, detail=f"Stripe checkout session failed: {exc}") from exc

    return {
        "provider": "stripe",
        "providerStatus": "session_created",
        "sessionId": payload.get("id"),
        "checkoutUrl": payload.get("url"),
    }


def verify_stripe_signature(raw_body: bytes, signature_header: str, secret: str) -> bool:
    parts = dict(part.split("=", 1) for part in signature_header.split(",") if "=" in part)
    timestamp = parts.get("t")
    signature = parts.get("v1")
    if not timestamp or not signature:
        return False
    signed_payload = f"{timestamp}.{raw_body.decode('utf-8')}".encode("utf-8")
    expected = hmac.new(secret.encode("utf-8"), signed_payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


@router.get("/storefront/{business_id}/home")
async def storefront_home(business_id: str, session: Session = Depends(get_session)) -> Dict[str, Any]:
    store = assert_business(session, business_id)
    products = public_products(session, business_id)
    categories = public_categories_from_products(products)
    return {
        "business": store_to_api(store),
        "heroProduct": products[1].model_dump() if len(products) > 1 else (products[0].model_dump() if products else None),
        "categories": [category.model_dump() for category in categories],
        "featuredProducts": [product.model_dump() for product in products[:8]],
    }


@router.get("/storefront/{business_id}/categories")
async def storefront_categories(business_id: str, session: Session = Depends(get_session)) -> Dict[str, Any]:
    assert_business(session, business_id)
    products = public_products(session, business_id)
    categories = public_categories_from_products(products)
    return {"businessId": business_id, "categories": [category.model_dump() for category in categories]}


@router.get("/storefront/{business_id}/featured-products")
async def storefront_featured_products(business_id: str, session: Session = Depends(get_session)) -> Dict[str, Any]:
    products = public_products(session, business_id)
    featured = [product.model_dump() for product in products if product.badge][:8]
    return {"businessId": business_id, "products": featured or [product.model_dump() for product in products[:8]]}


@router.get("/storefront/{business_id}/products")
async def storefront_products(
    business_id: str,
    category: Optional[str] = None,
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    products = public_products(session, business_id)
    if category:
        products = [product for product in products if product.categoryId == category]
    return {"businessId": business_id, "products": [product.model_dump() for product in products]}


@router.get("/storefront/{business_id}/products/{product_slug}")
async def storefront_product_detail(
    business_id: str,
    product_slug: str,
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    product = next(
        (
            item
            for item in public_products(session, business_id)
            if item.slug == product_slug or item.id == product_slug
        ),
        None,
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    related = [
        item.model_dump()
        for item in public_products(session, business_id)
        if item.categoryId == product.categoryId and item.id != product.id
    ]
    return {"product": product.model_dump(), "related": related}


@router.get("/storefront/{business_id}/products/{product_slug}/related")
async def storefront_product_related(
    business_id: str,
    product_slug: str,
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    detail = await storefront_product_detail(business_id, product_slug, session)
    return {"businessId": business_id, "related": detail["related"]}


@router.get("/checkout/cart")
async def get_cart(cart_id: str = "demo-cart", session: Session = Depends(get_session)) -> Dict[str, Any]:
    return cart_response(cart_id, session)


@router.post("/checkout/cart/items")
async def add_cart_item(payload: AddCartItemRequest, session: Session = Depends(get_session)) -> Dict[str, Any]:
    assert_business(session, payload.businessId)
    product = db_product_for_cart(session, payload.businessId, payload.productId)
    lines = cart_lines(payload.cartId)
    existing = next(
        (
            line
            for line in lines
            if line["productId"] == product.id and line.get("businessId") == payload.businessId
        ),
        None,
    )
    existing_quantity = int(existing["quantity"]) if existing else 0
    if int(product.inventory or 0) < existing_quantity + payload.quantity:
        raise HTTPException(status_code=409, detail="Not enough stock.")

    if existing:
        existing["quantity"] += payload.quantity
    else:
        lines.append(
            {
                "cartItemId": f"ci_{uuid.uuid4().hex[:10]}",
                "businessId": payload.businessId,
                "productId": product.id,
                "quantity": payload.quantity,
            }
        )
    return cart_response(payload.cartId, session)


@router.patch("/checkout/cart/items/{cart_item_id}")
async def update_cart_item(
    cart_item_id: str,
    payload: UpdateCartItemRequest,
    cart_id: str = "demo-cart",
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    line = next((item for item in cart_lines(cart_id) if item["cartItemId"] == cart_item_id), None)
    if not line:
        raise HTTPException(status_code=404, detail="Cart item not found.")
    product = db_product_for_cart(session, str(line.get("businessId") or ""), line["productId"])
    if int(product.inventory or 0) < payload.quantity:
        raise HTTPException(status_code=409, detail="Not enough stock.")
    line["quantity"] = payload.quantity
    return cart_response(cart_id, session)


@router.delete("/checkout/cart/items/{cart_item_id}")
async def delete_cart_item(
    cart_item_id: str,
    cart_id: str = "demo-cart",
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    CARTS[cart_id] = [item for item in cart_lines(cart_id) if item["cartItemId"] != cart_item_id]
    return cart_response(cart_id, session)


@router.post("/checkout/quote")
async def checkout_quote(payload: CheckoutQuoteRequest, session: Session = Depends(get_session)) -> Dict[str, Any]:
    return cart_response(payload.cartId, session)


@router.post("/checkout/create-session")
async def create_checkout_session(
    payload: CheckoutSessionRequest,
    idempotency_key: Optional[str] = Header(default=None, alias="Idempotency-Key"),
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    if not idempotency_key:
        raise HTTPException(status_code=400, detail="Idempotency-Key header is required.")
    if idempotency_key in IDEMPOTENCY_KEYS:
        order = session.get(DbOrder, IDEMPOTENCY_KEYS[idempotency_key])
        if not order:
            raise HTTPException(status_code=404, detail="Order not found.")
        api_order = order_to_api(order)
        return {"order": api_order, "payment": api_order["payment"], "idempotentReplay": True}

    order = create_order_from_cart(
        session,
        payload.cartId,
        payload.businessId,
        payload.customer,
        payload.shippingAddress,
        "payment_processing",
        {"provider": "stripe", "providerStatus": "creating_session"},
    )
    api_order = order_to_api(order)
    payment = stripe_checkout_session(api_order, payload.successUrl, payload.cancelUrl)
    if payment.get("providerStatus") == "not_configured":
        order.status = "pending_payment"
    order.payment_json = json.dumps(payment)
    session.commit()
    session.refresh(order)
    api_order = order_to_api(order)
    IDEMPOTENCY_KEYS[idempotency_key] = order.id
    audit(payload.customer.email, "checkout_session_created", payload.businessId, {"orderId": order.id, "payment": payment})
    return {"order": api_order, "payment": payment, "idempotentReplay": False}


@router.post("/checkout/place-manual-order")
async def place_manual_order(payload: ManualOrderRequest, session: Session = Depends(get_session)) -> Dict[str, Any]:
    if not payload.paymentInstructionsAccepted:
        raise HTTPException(status_code=400, detail="Manual payment instructions must be accepted.")
    order = create_order_from_cart(
        session,
        payload.cartId,
        payload.businessId,
        payload.customer,
        payload.shippingAddress,
        "pending_payment",
        {"provider": "manual", "providerStatus": "pending_verification"},
    )
    audit(payload.customer.email, "manual_order_created", payload.businessId, {"orderId": order.id})
    return {"order": order_to_api(order)}


@router.post("/payments/stripe/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(default=None, alias="Stripe-Signature"),
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    raw = await request.body()
    if not webhook_secret:
        raise HTTPException(status_code=503, detail="STRIPE_WEBHOOK_SECRET is not configured.")
    if not stripe_signature or not verify_stripe_signature(raw, stripe_signature, webhook_secret):
        raise HTTPException(status_code=400, detail="Invalid Stripe signature.")

    event = json.loads(raw.decode("utf-8"))
    event_type = event.get("type")
    stripe_session = event.get("data", {}).get("object", {})
    order_id = stripe_session.get("metadata", {}).get("order_id")
    if order_id and event_type == "checkout.session.completed":
        order = session.get(DbOrder, order_id)
        if order:
            payment = json_field(order.payment_json, {})
            payment["providerStatus"] = "paid"
            order.status = "paid"
            order.payment_json = json.dumps(payment)
            session.commit()
            audit("stripe_webhook", "order_paid", order.store_id, {"orderId": order_id})
    return {"received": True}


@router.get("/customer/me")
async def customer_me(x_user_id: str = Header(default="demo-customer")) -> Dict[str, Any]:
    return CUSTOMER_PROFILES.setdefault(
        x_user_id,
        {"userId": x_user_id, "email": "customer@example.com", "name": "Customer", "phone": "", "roles": ["customer"]},
    )


@router.patch("/customer/me")
async def update_customer_me(payload: CustomerProfilePatch, x_user_id: str = Header(default="demo-customer")) -> Dict[str, Any]:
    profile = await customer_me(x_user_id)
    updates = payload.model_dump(exclude_unset=True)
    profile.update(updates)
    audit(x_user_id, "customer_profile_updated", BUSINESS_ID, {"updates": updates})
    return profile


@router.get("/customer/orders")
async def customer_orders(
    x_user_id: str = Header(default="demo-customer"),
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    profile = await customer_me(x_user_id)
    email = str(profile.get("email") or "").strip().lower()
    db_orders = []
    if email:
        db_orders = [
            order_to_api(order)
            for order in session.execute(
                select(DbOrder)
                .join(DbCustomer, DbOrder.customer_id == DbCustomer.id)
                .where(func.lower(DbCustomer.email) == email)
                .order_by(DbOrder.created_at.desc())
            ).scalars()
        ]
    orders = db_orders
    if not orders:
        orders = [
            {
                "orderNumber": "KR-2048",
                "status": "in_transit",
                "total": 1176,
                "tracking": {"carrier": "UPS", "trackingNumber": "1Z88942"},
            }
        ]
    return {"userId": x_user_id, "orders": orders}


@router.get("/customer/orders/{order_number}")
async def customer_order_detail(
    order_number: str,
    x_user_id: str = Header(default="demo-customer"),
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    profile = await customer_me(x_user_id)
    email = str(profile.get("email") or "").strip().lower()
    order = None
    if email:
        db_order = session.execute(
            select(DbOrder)
            .join(DbCustomer, DbOrder.customer_id == DbCustomer.id)
            .where(DbOrder.order_number == order_number, func.lower(DbCustomer.email) == email)
        ).scalar_one_or_none()
        order = order_to_api(db_order) if db_order else None
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")
    return order


@router.get("/customer/addresses")
async def customer_addresses(x_user_id: str = Header(default="demo-customer")) -> Dict[str, Any]:
    return {"userId": x_user_id, "addresses": CUSTOMER_ADDRESSES.setdefault(x_user_id, [])}


@router.post("/customer/addresses")
async def create_customer_address(payload: CustomerAddressCreate, x_user_id: str = Header(default="demo-customer")) -> Dict[str, Any]:
    address = {"id": f"addr_{uuid.uuid4().hex[:10]}", **payload.model_dump()}
    CUSTOMER_ADDRESSES.setdefault(x_user_id, []).append(address)
    audit(x_user_id, "customer_address_created", BUSINESS_ID, {"addressId": address["id"]})
    return address


@router.get("/customer/support")
async def customer_support(x_user_id: str = Header(default="demo-customer")) -> Dict[str, Any]:
    return {"userId": x_user_id, "tickets": [ticket for ticket in SUPPORT_TICKETS if ticket.get("userId") == x_user_id]}


@router.post("/customer/support")
async def create_customer_support(payload: SupportRequest, x_user_id: str = Header(default="demo-customer")) -> Dict[str, Any]:
    ticket = {"id": f"sup_{uuid.uuid4().hex[:10]}", "userId": x_user_id, **payload.model_dump(), "status": "open"}
    SUPPORT_TICKETS.append(ticket)
    return ticket


@router.get("/store-owner/{business_id}/dashboard")
async def owner_dashboard(
    business_id: str,
    authorization: str = Header(default=""),
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    require_store_owner(session, business_id, authorization)
    low_stock = session.scalar(
        select(func.count())
        .select_from(DbProduct)
        .where(DbProduct.store_id == business_id, DbProduct.inventory <= 10)
    ) or 0
    orders = list(
        session.execute(
            select(DbOrder).where(DbOrder.store_id == business_id)
        ).scalars()
    )
    paid_statuses = {"paid", "partially_fulfilled", "fulfilled"}
    closed_statuses = {"fulfilled", "cancelled", "refunded", "failed"}
    return {
        "businessId": business_id,
        "salesToday": cents_to_price(sum(order.total_cents for order in orders if order.status in paid_statuses)),
        "openOrders": sum(1 for order in orders if order.status not in closed_statuses),
        "lowStock": int(low_stock),
        "pendingPayments": sum(1 for order in orders if order.status == "pending_payment"),
    }


@router.get("/store-owner/{business_id}/products")
async def owner_products(
    business_id: str,
    authorization: str = Header(default=""),
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    require_store_owner(session, business_id, authorization)
    products = [
        db_product_to_api(product).model_dump()
        for product in session.execute(
            select(DbProduct)
            .where(DbProduct.store_id == business_id)
            .order_by(DbProduct.created_at.desc())
        ).scalars()
    ]
    return {"businessId": business_id, "products": products}


@router.post("/store-owner/{business_id}/products")
async def owner_create_product(
    business_id: str,
    payload: ProductCreate,
    authorization: str = Header(default=""),
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    _, user = require_store_owner(session, business_id, authorization)
    product_id = f"prod_{uuid.uuid4().hex[:10]}"
    product = DbProduct(
        id=product_id,
        store_id=business_id,
        name=payload.name,
        category=payload.categoryId,
        price_cents=price_to_cents(payload.price),
        inventory=payload.stock,
        status=product_status(active=payload.active, published=payload.published),
    )
    session.add(product)
    session.commit()
    session.refresh(product)
    audit(str(user.get("id") or user.get("email") or "store-owner"), "product_created", business_id, {"productId": product_id})
    return db_product_to_api(product).model_dump()


@router.patch("/store-owner/{business_id}/products/{product_id}")
async def owner_update_product(
    business_id: str,
    product_id: str,
    payload: ProductUpdate,
    authorization: str = Header(default=""),
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    _, user = require_store_owner(session, business_id, authorization)
    product = session.get(DbProduct, product_id)
    if not product or product.store_id != business_id:
        raise HTTPException(status_code=404, detail="Product not found.")
    updates = payload.model_dump(exclude_unset=True)
    if "name" in updates:
        product.name = updates["name"]
    if "categoryId" in updates:
        product.category = updates["categoryId"]
    if "price" in updates:
        product.price_cents = price_to_cents(updates["price"])
    if "stock" in updates:
        product.inventory = updates["stock"]
    if "active" in updates or "published" in updates:
        active = bool(updates.get("active", product.status != "Archived"))
        published = bool(updates.get("published", product.status == "Published"))
        product.status = product_status(active=active, published=published)
    session.commit()
    session.refresh(product)
    audit(str(user.get("id") or user.get("email") or "store-owner"), "product_updated", business_id, {"productId": product_id, "updates": updates})
    return db_product_to_api(product).model_dump()


@router.get("/store-owner/{business_id}/orders")
async def owner_orders(
    business_id: str,
    authorization: str = Header(default=""),
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    require_store_owner(session, business_id, authorization)
    orders = [
        order_to_api(order)
        for order in session.execute(
            select(DbOrder)
            .where(DbOrder.store_id == business_id)
            .order_by(DbOrder.created_at.desc())
        ).scalars()
    ]
    return {"businessId": business_id, "orders": orders}


@router.patch("/store-owner/{business_id}/orders/{order_id}/status")
async def owner_update_order_status(
    business_id: str,
    order_id: str,
    payload: OrderStatusPatch,
    authorization: str = Header(default=""),
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    _, user = require_store_owner(session, business_id, authorization)
    order = session.get(DbOrder, order_id)
    if not order or order.store_id != business_id:
        raise HTTPException(status_code=404, detail="Order not found.")
    movements = []
    if payload.status in {"cancelled", "refunded", "failed"}:
        movements = restock_order_inventory(session, order, business_id)
    order.status = payload.status
    payment = json_field(order.payment_json, {})
    if payload.status in {"paid", "refunded", "failed"}:
        payment["providerStatus"] = payload.status
        order.payment_json = json.dumps(payment)
    session.commit()
    session.refresh(order)
    actor = str(user.get("id") or user.get("email") or "store-owner")
    audit(actor, "order_status_updated", business_id, {"orderId": order_id, "status": payload.status})
    if movements:
        audit(actor, "inventory_restocked", business_id, {"orderId": order_id, "movements": movements})
    return order_to_api(order)


@router.get("/store-owner/{business_id}/payments")
async def owner_payments(
    business_id: str,
    authorization: str = Header(default=""),
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    require_store_owner(session, business_id, authorization)
    methods = payment_methods_for_business(business_id)
    payment_events = [
        {
            "orderId": order.id,
            "orderNumber": order.order_number,
            "status": order.status,
            "payment": json_field(order.payment_json, {}),
        }
        for order in session.execute(
            select(DbOrder)
            .where(DbOrder.store_id == business_id)
            .order_by(DbOrder.created_at.desc())
        ).scalars()
    ]
    return {"businessId": business_id, "methods": methods, "events": payment_events}


@router.patch("/store-owner/{business_id}/payment-methods")
async def owner_update_payment_methods(
    business_id: str,
    payload: PaymentMethodPatch,
    authorization: str = Header(default=""),
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    _, user = require_store_owner(session, business_id, authorization)
    methods = payment_methods_for_business(business_id)
    methods.update(payload.model_dump())
    methods["providerConfigured"] = bool(os.getenv("STRIPE_SECRET_KEY"))
    audit(str(user.get("id") or user.get("email") or "store-owner"), "payment_methods_updated", business_id, payload.model_dump())
    return methods


@router.get("/store-owner/{business_id}/shipping")
async def owner_shipping(
    business_id: str,
    authorization: str = Header(default=""),
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    require_store_owner(session, business_id, authorization)
    return {
        "businessId": business_id,
        "providerStrategy": "adapter",
        "recommendedAggregator": "easypost",
        "shipments": [
            {"orderId": order.id, "tracking": order_tracking(order), "status": order.status}
            for order in session.execute(
                select(DbOrder)
                .where(DbOrder.store_id == business_id)
                .order_by(DbOrder.created_at.desc())
            ).scalars()
        ],
    }


@router.patch("/store-owner/{business_id}/shipping/{order_id}")
async def owner_update_shipping(
    business_id: str,
    order_id: str,
    payload: ShippingPatch,
    authorization: str = Header(default=""),
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    _, user = require_store_owner(session, business_id, authorization)
    order = session.get(DbOrder, order_id)
    if not order or order.store_id != business_id:
        raise HTTPException(status_code=404, detail="Order not found.")
    updates = payload.model_dump(exclude_none=True)
    order.shipping_carrier = payload.carrier if payload.carrier is not None else order.shipping_carrier
    order.tracking_code = payload.trackingNumber if payload.trackingNumber is not None else order.tracking_code
    if payload.status:
        order.status = payload.status
    session.commit()
    session.refresh(order)
    actor = str(user.get("id") or user.get("email") or "store-owner")
    audit(actor, "shipping_updated", business_id, {"orderId": order_id, "tracking": updates})
    return order_to_api(order)


@router.get("/store-owner/{business_id}/audit-log")
async def owner_audit_log(
    business_id: str,
    authorization: str = Header(default=""),
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    require_store_owner(session, business_id, authorization)
    return {"businessId": business_id, "events": [event for event in AUDIT_LOG if event["businessId"] == business_id]}


@router.options("/{path:path}")
async def options_preflight(path: str) -> Response:
    return Response(status_code=204)
