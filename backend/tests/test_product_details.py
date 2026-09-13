from unittest.mock import patch

import pytest
from fastapi import HTTPException
from sqlalchemy import func, select

from app import commerce
from app.db import get_session
from app.db_models import Order, Product
from test_store_owner_session import client


def create_product(client, **updates):
    client.cookies.set("luma_client_session", "owner-token")
    payload = dict(name="Workshop consultation", categoryId="services", price=25,
                   stock=4, description="On-site advice", imageUrl="https://example.com/tool.jpg",
                   sku="CONSULT-REAL")
    payload.update(updates)
    return client.post("/api/v1/store-owner/owned/products", json=payload)


def test_product_details_round_trip_and_patch(client):
    created = create_product(client)
    assert created.status_code == 200, created.text
    product = created.json()
    url = f"/api/v1/store-owner/owned/products/{product['id']}"
    assert client.patch(url, json={"stock": 5}).status_code == 200
    listed = client.get("/api/v1/store-owner/owned/products").json()["products"][0]
    assert (listed["description"], listed["imageUrl"], listed["sku"]) == (
        "On-site advice", "https://example.com/tool.jpg", "CONSULT-REAL")
    updates = {"description": "Updated advice", "imageUrl": "https://example.com/new.jpg", "sku": "NEW-SKU"}
    assert client.patch(url, json=updates).status_code == 200
    listed = client.get("/api/v1/store-owner/owned/products").json()["products"][0]
    for key, value in updates.items():
        assert listed[key] == value
    db_iterator = client.app.dependency_overrides[get_session]()
    with next(db_iterator) as db:
        saved = db.get(Product, product["id"])
        assert (saved.description, saved.image_url, saved.sku) == tuple(updates.values())
    db_iterator.close()


def test_missing_sku_is_generated_and_persisted(client):
    product = create_product(client, sku=None).json()
    assert product["sku"].startswith("SKU-")
    assert product["sku"] != product["id"]
    assert client.get("/api/v1/store-owner/owned/products").json()["products"][0]["sku"] == product["sku"]


def test_quote_only_is_nullable_and_rejected_by_cart(client):
    created = create_product(client, quote_only=True, price=None)
    assert created.status_code == 200, created.text
    product = created.json()
    assert product["price"] is None and product["quoteOnly"] is True
    public = client.get("/api/v1/storefront/owned/products").json()["products"][0]
    assert public["price"] is None and public["quoteOnly"] is True
    response = client.post("/api/v1/checkout/cart/items", json={
        "businessId": "owned", "productId": product["id"], "quantity": 1, "cartId": "quote-test",
    })
    assert response.status_code == 409, response.text
    assert response.json()["detail"]["code"] == "product_requires_quote"
    assert not commerce.CARTS.get("quote-test")


@pytest.mark.parametrize("fields", [
    {"quoteOnly": True, "price": 25},
    {"quote_only": True, "price_cents": 2500, "price": None},
    {"quoteOnly": False, "price": None},
    {"quoteOnly": False, "price": 0},
    {"quoteOnly": False, "price": 0.001},
])
def test_invalid_create_price_combinations(client, fields):
    assert create_product(client, **fields).status_code == 422


def test_patch_validates_final_state_and_existing_cart(client):
    product = create_product(client).json()
    product_url = f"/api/v1/store-owner/owned/products/{product['id']}"
    cart_id = "changing-product"
    commerce.CARTS.pop(cart_id, None)
    try:
        response = client.post("/api/v1/checkout/cart/items", json={
            "businessId": "owned", "productId": product["id"], "quantity": 1, "cartId": cart_id,
        })
        assert response.status_code == 200, response.text
        assert client.patch(product_url, json={"quoteOnly": True}).status_code == 422
        assert client.patch(product_url, json={"price": None}).status_code == 422
        assert client.get("/api/v1/store-owner/owned/products").json()["products"][0]["price"] == 25
        response = client.patch(product_url, json={"quoteOnly": True, "price": None})
        assert response.status_code == 200, response.text
        assert client.get(f"/api/v1/checkout/cart?cart_id={cart_id}").status_code == 409
        assert client.post("/api/v1/checkout/quote", json={"cartId": cart_id}).status_code == 409
        response = client.post("/api/v1/checkout/place-manual-order", json={
            "cartId": cart_id, "businessId": "owned", "customer": {"email": "buyer@example.com"},
            "shippingAddress": {"line1": "10 Main Street"}, "paymentInstructionsAccepted": True,
        })
        assert response.status_code == 409, response.text
        db_iterator = client.app.dependency_overrides[get_session]()
        with next(db_iterator) as db:
            assert db.scalar(select(func.count()).select_from(Order)) == 0
            assert db.get(Product, product["id"]).inventory == 4
        db_iterator.close()
        response = client.patch(product_url, json={"quoteOnly": False})
        assert response.status_code == 422
        assert client.patch(product_url, json={"quoteOnly": False, "price": 30}).status_code == 200
        assert client.get(f"/api/v1/checkout/cart?cart_id={cart_id}").status_code == 200
    finally:
        commerce.CARTS.pop(cart_id, None)


@pytest.mark.parametrize("line", [
    {"unitPrice": None}, {"unitPrice": 0}, {"unitPrice": 25, "quoteOnly": True},
])
def test_stripe_guard_runs_before_provider_call(line):
    with patch.object(commerce, "create_stripe_session") as stripe:
        with pytest.raises(HTTPException) as error:
            commerce.stripe_checkout_session({"items": [line]}, "https://example.com", "https://example.com")
        assert error.value.status_code == 409
        stripe.assert_not_called()
