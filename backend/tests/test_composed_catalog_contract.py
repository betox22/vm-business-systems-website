from app.section_composer import _load_eligible_sections
from test_store_owner_session import client


def test_storefront_catalog_contract_uses_persisted_products(client):
    client.cookies.set("luma_client_session", "owner-token")
    fixed = client.post("/api/v1/store-owner/owned/products", json={
        "name": "Milling machine", "categoryId": "Equipment", "description": "Compact model",
        "price": 125.5, "stock": 7, "sku": "MILL-1",
        "imageUrl": "https://images.example.test/mill.jpg",
    })
    quoted = client.post("/api/v1/store-owner/owned/products", json={
        "name": "Installation service", "categoryId": "Services", "description": "Site assessment",
        "quoteOnly": True, "stock": 0, "sku": "INSTALL-1",
    })
    archived = client.post("/api/v1/store-owner/owned/products", json={
        "name": "Archived item", "categoryId": "Equipment", "description": "Not public",
        "price": 10, "stock": 1, "active": False, "published": False,
    })
    assert all(response.status_code == 200 for response in (fixed, quoted, archived))
    client.cookies.clear()
    response = client.get("/api/v1/storefront/owned/products")
    assert response.status_code == 200
    products = {product["id"]: product for product in response.json()["products"]}
    assert set(products) == {fixed.json()["id"], quoted.json()["id"]}
    assert (products[fixed.json()["id"]]["price"], products[fixed.json()["id"]]["stock"],
            products[fixed.json()["id"]]["imageUrl"]) == (125.5, 7, "https://images.example.test/mill.jpg")
    assert products[quoted.json()["id"]]["quoteOnly"] is True
    assert products[quoted.json()["id"]]["price"] is None
    assert all(product["businessId"] == "owned" and product["status"] == "Published"
               for product in products.values())


def test_catalog_partials_require_storefront_collection():
    for archetype, section_id in [
        ("retail", "mega-retail-store--home--catalog"),
        ("digital", "digital-products-store--catalog--digital-catalog"),
        ("corporate", "corporate-company-pro--catalog--services-grid"),
    ]:
        section = _load_eligible_sections({archetype}, require_complete_bindings=True)[section_id]
        assert section["image_slots"] == []
        assert section["collection_bindings"]["catalog_items"]["source"] == "storefront_products"
