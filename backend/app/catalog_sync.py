"""Archive-and-replace imports; transaction ownership stays with the caller."""

import json
from decimal import Decimal, InvalidOperation

from fastapi import HTTPException
from sqlalchemy import update
from sqlalchemy.orm import Session

from .commerce import price_to_cents
from .db_models import GeneratedSite, Product


def sync_site_catalog_to_commerce(session: Session, site: GeneratedSite) -> None:
    catalog = json.loads(site.generated_config).get("catalog_items", [])
    if not isinstance(catalog, list):
        raise HTTPException(status_code=422, detail="catalog_items must be a list.")
    products = []
    for item in catalog:
        if not isinstance(item, dict) or not isinstance(item.get("name"), str) or not item["name"].strip():
            raise HTTPException(status_code=422, detail="Catalog products require a name.")
        amount = item.get("price_amount")
        if amount is None or amount == "":
            amount = item.get("price")
        price_type = item.get("price_type") or ("quote_only" if amount in (None, "") else "fixed")
        if price_type not in {"fixed", "starting_at", "quote_only"}:
            raise HTTPException(status_code=422, detail="Unsupported catalog price_type.")
        if price_type == "quote_only" and amount not in (None, ""):
            raise HTTPException(status_code=422, detail="Quote-only catalog products require a null price.")
        cents = None
        if price_type != "quote_only":
            try:
                number = Decimal(str(amount))
                if not number.is_finite() or number <= 0:
                    raise ValueError()
                cents = price_to_cents(number)
                if cents <= 0:
                    raise ValueError()
            except (InvalidOperation, ValueError, TypeError):
                raise HTTPException(status_code=422, detail=f"Catalog product {item['name']} requires a positive price.")
        metadata = item.get("metadata") or {}
        if not isinstance(metadata, dict):
            raise HTTPException(status_code=422, detail="Catalog product metadata must be an object.")
        inventory = item.get("inventory_quantity", metadata.get("inventory_quantity"))
        if inventory is None:
            inventory = 0
        if isinstance(inventory, bool) or not isinstance(inventory, int) or inventory < 0:
            raise HTTPException(status_code=422, detail="Catalog inventory must be a nonnegative integer.")
        product = Product(
            store_id=site.store_id, site_id=site.id, source="ai_generated",
            name=item["name"].strip(), category=str(item.get("category") or "uncategorized"),
            description=item.get("description"), image_url=item.get("image_url"),
            price_cents=cents, quote_only=price_type == "quote_only",
            price_is_approximate=price_type == "starting_at", inventory=inventory,
            status="Published" if item.get("is_active", True) else "Archived",
        )
        if item.get("sku"):
            product.sku = str(item["sku"])
        products.append(product)
    # Keep rows referenced by historical orders and protect manual versions.
    session.execute(update(Product).where(
        Product.site_id == site.id, Product.source == "ai_generated",
    ).values(status="Archived"))
    session.add_all(products)
