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

from fastapi import APIRouter, Header, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, Field


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
BUSINESSES: Dict[str, Dict[str, Any]] = {
    BUSINESS_ID: {
        "id": BUSINESS_ID,
        "name": "KREATON Premium",
        "currency": "USD",
        "templateId": "premium-product-store",
    }
}

CATEGORIES: Dict[str, Category] = {
    "flagship": Category(id="flagship", name="Flagship devices", description="Hero products and premium models.", productCount=3),
    "accessories": Category(id="accessories", name="Accessories", description="Cases, docks, chargers, and add-on kits.", productCount=1),
    "bundles": Category(id="bundles", name="Bundles", description="Curated kits and launch bundles.", productCount=0),
    "care": Category(id="care", name="Care plans", description="Warranty, support, and replacement plans.", productCount=0),
}

PRODUCTS: Dict[str, Product] = {
    "nova-air": Product(
        id="nova-air",
        businessId=BUSINESS_ID,
        slug="nova-air",
        name="Nova Air",
        categoryId="flagship",
        description="Lightweight premium model for everyday use.",
        price=799,
        sku="NVA-AIR-256",
        stock=42,
        badge="Lightweight",
        specs={"Storage": "256 GB", "Battery": "28h battery", "Finish": "Sky graphite"},
    ),
    "nova-pro": Product(
        id="nova-pro",
        businessId=BUSINESS_ID,
        slug="nova-pro",
        name="Nova Pro",
        categoryId="flagship",
        description="Best-fit premium model with balanced performance and storage.",
        price=1099,
        sku="NVA-PRO-512",
        stock=18,
        badge="Best fit",
        specs={"Storage": "512 GB", "Battery": "36h battery", "Finish": "Titanium violet"},
    ),
    "nova-studio": Product(
        id="nova-studio",
        businessId=BUSINESS_ID,
        slug="nova-studio",
        name="Nova Studio",
        categoryId="flagship",
        description="Creator-focused model with maximum storage and battery.",
        price=1499,
        sku="NVA-STU-1TB",
        stock=8,
        badge="Creator",
        specs={"Storage": "1 TB", "Battery": "42h battery", "Finish": "Obsidian blue"},
    ),
    "dock-kit": Product(
        id="dock-kit",
        businessId=BUSINESS_ID,
        slug="magsafe-dock-kit",
        name="MagSafe Dock Kit",
        categoryId="accessories",
        description="Premium desk dock accessory kit.",
        price=129,
        sku="ACC-DOCK-001",
        stock=126,
        published=False,
        status="Draft",
        badge="Accessory",
        specs={"Compatibility": "Nova Series", "Included": "Dock, cable, stand"},
    ),
}

CARTS: Dict[str, List[Dict[str, Any]]] = {}
ORDERS: Dict[str, Dict[str, Any]] = {}
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


def assert_business(business_id: str) -> None:
    if business_id not in BUSINESSES:
        raise HTTPException(status_code=404, detail="Business not found.")


def public_products(business_id: str) -> list[Product]:
    assert_business(business_id)
    return [
        product
        for product in PRODUCTS.values()
        if product.businessId == business_id and product.active and product.published
    ]


def cart_lines(cart_id: str) -> list[Dict[str, Any]]:
    return CARTS.setdefault(cart_id, [])


def reserved_quantity(product_id: str) -> int:
    reserved_statuses = {"pending_payment", "payment_processing"}
    return sum(
        int(item["quantity"])
        for order in ORDERS.values()
        if order.get("inventoryReserved")
        and not order.get("inventoryDeducted")
        and order.get("status") in reserved_statuses
        for item in order.get("items", [])
        if item.get("productId") == product_id
    )


def available_stock(product: Product) -> int:
    return max(0, product.stock - reserved_quantity(product.id))


def cart_response(cart_id: str) -> Dict[str, Any]:
    lines = []
    subtotal = money(0)
    for line in cart_lines(cart_id):
        product = PRODUCTS.get(line["productId"])
        if not product:
            continue
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
                "stockAvailable": available_stock(product),
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


def create_order_from_cart(
    cart_id: str,
    business_id: str,
    customer: CustomerInfo,
    shipping_address: ShippingAddress,
    status: OrderStatus,
    payment: Dict[str, Any],
) -> Dict[str, Any]:
    quote = cart_response(cart_id)
    if not quote["checkoutEligible"]:
        raise HTTPException(status_code=400, detail="Cart is empty.")
    for item in quote["items"]:
        product = PRODUCTS[item["productId"]]
        if available_stock(product) < item["quantity"]:
            raise HTTPException(status_code=409, detail=f"{product.name} does not have enough stock.")

    order_id = f"ord_{uuid.uuid4().hex[:12]}"
    order_number = f"KR-{uuid.uuid4().hex[:6].upper()}"
    order = {
        "id": order_id,
        "orderNumber": order_number,
        "businessId": business_id,
        "customer": customer.model_dump(),
        "shippingAddress": shipping_address.model_dump(),
        "items": quote["items"],
        "subtotal": quote["subtotal"],
        "shippingAmount": quote["shippingEstimate"],
        "taxAmount": quote["taxEstimate"],
        "total": quote["total"],
        "status": status,
        "payment": payment,
        "tracking": None,
        "inventoryReserved": status in {"payment_processing", "pending_payment"},
        "inventoryDeducted": False,
        "createdAt": int(time.time()),
    }
    ORDERS[order_id] = order
    return order


def deduct_inventory_for_order(order: Dict[str, Any], actor: str) -> None:
    if order.get("inventoryDeducted"):
        return

    for item in order["items"]:
        product = PRODUCTS[item["productId"]]
        if product.stock < item["quantity"]:
            raise HTTPException(status_code=409, detail=f"{product.name} does not have enough stock.")

    movements = []
    for item in order["items"]:
        product = PRODUCTS[item["productId"]]
        before = product.stock
        product.stock = max(0, product.stock - item["quantity"])
        movements.append(
            {
                "productId": product.id,
                "sku": product.sku,
                "quantity": item["quantity"],
                "before": before,
                "after": product.stock,
            }
        )
    order["inventoryDeducted"] = True
    order["inventoryReserved"] = False
    audit(actor, "inventory_deducted", order["businessId"], {"orderId": order["id"], "movements": movements})


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
async def storefront_home(business_id: str) -> Dict[str, Any]:
    assert_business(business_id)
    products = public_products(business_id)
    return {
        "business": BUSINESSES[business_id],
        "heroProduct": products[1].model_dump() if len(products) > 1 else (products[0].model_dump() if products else None),
        "categories": [category.model_dump() for category in CATEGORIES.values()],
        "featuredProducts": [product.model_dump() for product in products[:8]],
    }


@router.get("/storefront/{business_id}/categories")
async def storefront_categories(business_id: str) -> Dict[str, Any]:
    assert_business(business_id)
    return {"businessId": business_id, "categories": [category.model_dump() for category in CATEGORIES.values()]}


@router.get("/storefront/{business_id}/featured-products")
async def storefront_featured_products(business_id: str) -> Dict[str, Any]:
    products = public_products(business_id)
    featured = [product.model_dump() for product in products if product.badge][:8]
    return {"businessId": business_id, "products": featured or [product.model_dump() for product in products[:8]]}


@router.get("/storefront/{business_id}/products")
async def storefront_products(business_id: str, category: Optional[str] = None) -> Dict[str, Any]:
    products = public_products(business_id)
    if category:
        products = [product for product in products if product.categoryId == category]
    return {"businessId": business_id, "products": [product.model_dump() for product in products]}


@router.get("/storefront/{business_id}/products/{product_slug}")
async def storefront_product_detail(business_id: str, product_slug: str) -> Dict[str, Any]:
    product = next(
        (
            item
            for item in public_products(business_id)
            if item.slug == product_slug or item.id == product_slug
        ),
        None,
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    related = [
        item.model_dump()
        for item in public_products(business_id)
        if item.categoryId == product.categoryId and item.id != product.id
    ]
    return {"product": product.model_dump(), "related": related}


@router.get("/storefront/{business_id}/products/{product_slug}/related")
async def storefront_product_related(business_id: str, product_slug: str) -> Dict[str, Any]:
    detail = await storefront_product_detail(business_id, product_slug)
    return {"businessId": business_id, "related": detail["related"]}


@router.get("/checkout/cart")
async def get_cart(cart_id: str = "demo-cart") -> Dict[str, Any]:
    return cart_response(cart_id)


@router.post("/checkout/cart/items")
async def add_cart_item(payload: AddCartItemRequest) -> Dict[str, Any]:
    assert_business(payload.businessId)
    product = PRODUCTS.get(payload.productId)
    if not product or product.businessId != payload.businessId or not product.active:
        raise HTTPException(status_code=404, detail="Product not found.")
    if available_stock(product) < payload.quantity:
        raise HTTPException(status_code=409, detail="Not enough stock.")

    lines = cart_lines(payload.cartId)
    existing = next((line for line in lines if line["productId"] == product.id), None)
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
    return cart_response(payload.cartId)


@router.patch("/checkout/cart/items/{cart_item_id}")
async def update_cart_item(cart_item_id: str, payload: UpdateCartItemRequest, cart_id: str = "demo-cart") -> Dict[str, Any]:
    line = next((item for item in cart_lines(cart_id) if item["cartItemId"] == cart_item_id), None)
    if not line:
        raise HTTPException(status_code=404, detail="Cart item not found.")
    line["quantity"] = payload.quantity
    return cart_response(cart_id)


@router.delete("/checkout/cart/items/{cart_item_id}")
async def delete_cart_item(cart_item_id: str, cart_id: str = "demo-cart") -> Dict[str, Any]:
    CARTS[cart_id] = [item for item in cart_lines(cart_id) if item["cartItemId"] != cart_item_id]
    return cart_response(cart_id)


@router.post("/checkout/quote")
async def checkout_quote(payload: CheckoutQuoteRequest) -> Dict[str, Any]:
    return cart_response(payload.cartId)


@router.post("/checkout/create-session")
async def create_checkout_session(
    payload: CheckoutSessionRequest,
    idempotency_key: Optional[str] = Header(default=None, alias="Idempotency-Key"),
) -> Dict[str, Any]:
    if not idempotency_key:
        raise HTTPException(status_code=400, detail="Idempotency-Key header is required.")
    if idempotency_key in IDEMPOTENCY_KEYS:
        order = ORDERS[IDEMPOTENCY_KEYS[idempotency_key]]
        return {"order": order, "payment": order["payment"], "idempotentReplay": True}

    order = create_order_from_cart(
        payload.cartId,
        payload.businessId,
        payload.customer,
        payload.shippingAddress,
        "payment_processing",
        {"provider": "stripe", "providerStatus": "creating_session"},
    )
    payment = stripe_checkout_session(order, payload.successUrl, payload.cancelUrl)
    if payment.get("providerStatus") == "not_configured":
        order["status"] = "pending_payment"
    order["payment"] = payment
    IDEMPOTENCY_KEYS[idempotency_key] = order["id"]
    audit(payload.customer.email, "checkout_session_created", payload.businessId, {"orderId": order["id"], "payment": payment})
    return {"order": order, "payment": payment, "idempotentReplay": False}


@router.post("/checkout/place-manual-order")
async def place_manual_order(payload: ManualOrderRequest) -> Dict[str, Any]:
    if not payload.paymentInstructionsAccepted:
        raise HTTPException(status_code=400, detail="Manual payment instructions must be accepted.")
    order = create_order_from_cart(
        payload.cartId,
        payload.businessId,
        payload.customer,
        payload.shippingAddress,
        "pending_payment",
        {"provider": "manual", "providerStatus": "pending_verification"},
    )
    audit(payload.customer.email, "manual_order_created", payload.businessId, {"orderId": order["id"]})
    return {"order": order}


@router.post("/payments/stripe/webhook")
async def stripe_webhook(request: Request, stripe_signature: Optional[str] = Header(default=None, alias="Stripe-Signature")) -> Dict[str, Any]:
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    raw = await request.body()
    if not webhook_secret:
        raise HTTPException(status_code=503, detail="STRIPE_WEBHOOK_SECRET is not configured.")
    if not stripe_signature or not verify_stripe_signature(raw, stripe_signature, webhook_secret):
        raise HTTPException(status_code=400, detail="Invalid Stripe signature.")

    event = json.loads(raw.decode("utf-8"))
    event_type = event.get("type")
    session = event.get("data", {}).get("object", {})
    order_id = session.get("metadata", {}).get("order_id")
    if order_id and order_id in ORDERS and event_type == "checkout.session.completed":
        order = ORDERS[order_id]
        deduct_inventory_for_order(order, "stripe_webhook")
        order["status"] = "paid"
        order["payment"]["providerStatus"] = "paid"
        audit("stripe_webhook", "order_paid", order["businessId"], {"orderId": order_id})
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
async def customer_orders(x_user_id: str = Header(default="demo-customer")) -> Dict[str, Any]:
    profile = await customer_me(x_user_id)
    orders = [order for order in ORDERS.values() if order.get("customer", {}).get("email") == profile.get("email")]
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
async def customer_order_detail(order_number: str, x_user_id: str = Header(default="demo-customer")) -> Dict[str, Any]:
    profile = await customer_me(x_user_id)
    order = next(
        (
            item
            for item in ORDERS.values()
            if item.get("orderNumber") == order_number and item.get("customer", {}).get("email") == profile.get("email")
        ),
        None,
    )
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
async def owner_dashboard(business_id: str, x_user_role: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    assert_business(business_id)
    require_store_role(x_user_role)
    business_orders = [order for order in ORDERS.values() if order["businessId"] == business_id]
    return {
        "businessId": business_id,
        "salesToday": round(sum(order["total"] for order in business_orders if order["status"] in {"paid", "fulfilled"}), 2),
        "openOrders": len([order for order in business_orders if order["status"] not in {"fulfilled", "cancelled", "refunded"}]),
        "lowStock": len([product for product in PRODUCTS.values() if product.businessId == business_id and product.stock <= 10]),
        "pendingPayments": len([order for order in business_orders if order["status"] == "pending_payment"]),
    }


@router.get("/store-owner/{business_id}/products")
async def owner_products(business_id: str, x_user_role: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    assert_business(business_id)
    require_store_role(x_user_role)
    products = [product.model_dump() for product in PRODUCTS.values() if product.businessId == business_id]
    return {"businessId": business_id, "products": products}


@router.post("/store-owner/{business_id}/products")
async def owner_create_product(
    business_id: str,
    payload: ProductCreate,
    x_user_role: Optional[str] = Header(default=None),
    x_user_id: str = Header(default="demo-owner"),
) -> Dict[str, Any]:
    assert_business(business_id)
    require_store_role(x_user_role)
    product_id = f"prod_{uuid.uuid4().hex[:10]}"
    product = Product(
        id=product_id,
        businessId=business_id,
        slug=payload.name.lower().replace(" ", "-")[:80],
        status="Published" if payload.published else "Draft",
        **payload.model_dump(),
    )
    PRODUCTS[product_id] = product
    audit(x_user_id, "product_created", business_id, {"productId": product_id})
    return product.model_dump()


@router.patch("/store-owner/{business_id}/products/{product_id}")
async def owner_update_product(
    business_id: str,
    product_id: str,
    payload: ProductUpdate,
    x_user_role: Optional[str] = Header(default=None),
    x_user_id: str = Header(default="demo-owner"),
) -> Dict[str, Any]:
    assert_business(business_id)
    require_store_role(x_user_role)
    product = PRODUCTS.get(product_id)
    if not product or product.businessId != business_id:
        raise HTTPException(status_code=404, detail="Product not found.")
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(product, key, value)
    if "published" in updates:
        product.status = "Published" if product.published else "Draft"
    audit(x_user_id, "product_updated", business_id, {"productId": product_id, "updates": updates})
    return product.model_dump()


@router.get("/store-owner/{business_id}/orders")
async def owner_orders(business_id: str, x_user_role: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    assert_business(business_id)
    require_store_role(x_user_role)
    return {"businessId": business_id, "orders": [order for order in ORDERS.values() if order["businessId"] == business_id]}


@router.patch("/store-owner/{business_id}/orders/{order_id}/status")
async def owner_update_order_status(
    business_id: str,
    order_id: str,
    payload: OrderStatusPatch,
    x_user_role: Optional[str] = Header(default=None),
    x_user_id: str = Header(default="demo-owner"),
) -> Dict[str, Any]:
    assert_business(business_id)
    require_store_role(x_user_role)
    order = ORDERS.get(order_id)
    if not order or order["businessId"] != business_id:
        raise HTTPException(status_code=404, detail="Order not found.")
    if payload.status == "paid":
        deduct_inventory_for_order(order, x_user_id)
    if payload.status in {"cancelled", "failed"} and not order.get("inventoryDeducted"):
        order["inventoryReserved"] = False
    order["status"] = payload.status
    audit(x_user_id, "order_status_updated", business_id, {"orderId": order_id, "status": payload.status})
    return order


@router.get("/store-owner/{business_id}/payments")
async def owner_payments(business_id: str, x_user_role: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    assert_business(business_id)
    require_store_role(x_user_role)
    methods = PAYMENT_METHODS[business_id]
    payment_events = [
        {"orderId": order["id"], "orderNumber": order["orderNumber"], "status": order["status"], "payment": order["payment"]}
        for order in ORDERS.values()
        if order["businessId"] == business_id
    ]
    return {"businessId": business_id, "methods": methods, "events": payment_events}


@router.patch("/store-owner/{business_id}/payment-methods")
async def owner_update_payment_methods(
    business_id: str,
    payload: PaymentMethodPatch,
    x_user_role: Optional[str] = Header(default=None),
    x_user_id: str = Header(default="demo-owner"),
) -> Dict[str, Any]:
    assert_business(business_id)
    require_store_role(x_user_role)
    PAYMENT_METHODS[business_id].update(payload.model_dump())
    PAYMENT_METHODS[business_id]["providerConfigured"] = bool(os.getenv("STRIPE_SECRET_KEY"))
    audit(x_user_id, "payment_methods_updated", business_id, payload.model_dump())
    return PAYMENT_METHODS[business_id]


@router.get("/store-owner/{business_id}/shipping")
async def owner_shipping(business_id: str, x_user_role: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    assert_business(business_id)
    require_store_role(x_user_role)
    return {
        "businessId": business_id,
        "providerStrategy": "adapter",
        "recommendedAggregator": "easypost",
        "shipments": [
            {"orderId": order["id"], "tracking": order.get("tracking"), "status": order["status"]}
            for order in ORDERS.values()
            if order["businessId"] == business_id
        ],
    }


@router.patch("/store-owner/{business_id}/shipping/{order_id}")
async def owner_update_shipping(
    business_id: str,
    order_id: str,
    payload: ShippingPatch,
    x_user_role: Optional[str] = Header(default=None),
    x_user_id: str = Header(default="demo-owner"),
) -> Dict[str, Any]:
    assert_business(business_id)
    require_store_role(x_user_role)
    order = ORDERS.get(order_id)
    if not order or order["businessId"] != business_id:
        raise HTTPException(status_code=404, detail="Order not found.")
    order["tracking"] = payload.model_dump(exclude_none=True)
    audit(x_user_id, "shipping_updated", business_id, {"orderId": order_id, "tracking": order["tracking"]})
    return order


@router.get("/store-owner/{business_id}/audit-log")
async def owner_audit_log(business_id: str, x_user_role: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    assert_business(business_id)
    require_store_role(x_user_role)
    return {"businessId": business_id, "events": [event for event in AUDIT_LOG if event["businessId"] == business_id]}


@router.options("/{path:path}")
async def options_preflight(path: str) -> Response:
    return Response(status_code=204)
