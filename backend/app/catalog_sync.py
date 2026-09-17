"""Archive-and-replace imports; transaction ownership stays with the caller."""

import json
import logging
from collections import Counter
from copy import deepcopy
from decimal import Decimal, InvalidOperation

from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from .commerce import price_to_cents
from .db_models import GeneratedSite, Product


logger = logging.getLogger("kreaton")


def sync_site_catalog_to_commerce(session: Session, site: GeneratedSite) -> None:
    catalog = json.loads(site.generated_config).get("catalog_items", [])
    if not isinstance(catalog, list):
        raise HTTPException(status_code=422, detail="catalog_items must be a list.")
    products = []
    for catalog_index, item in enumerate(catalog):
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
            catalog_index=catalog_index,
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


def apply_commerce_overlay(catalog_items: list, site: GeneratedSite, session: Session) -> list:
    """Project only current commerce values; never mutate the stored catalog."""
    result = deepcopy(catalog_items)
    # Checkout bindings are derived from verified rows, never trusted from JSON.
    for item in result:
        if isinstance(item, dict):
            item.pop("business_id", None)
            item.pop("product_id", None)
    products = list(session.scalars(select(Product).where(
        Product.site_id == site.id, Product.store_id == site.store_id,
        Product.status == "Published",
    ).order_by(Product.catalog_index, Product.id)))
    if not products:
        return result
    if len(products) != len(result):
        logger.warning("Commerce overlay skipped: site_id=%s count mismatch products=%s catalog=%s",
                       site.id, len(products), len(result))
        return result
    counts = Counter(product.catalog_index for product in products)
    schema = json.loads(site.generated_config or "{}")
    business = schema.get("business") if isinstance(schema, dict) else None
    language = str((business.get("selectedLanguage") if isinstance(business, dict) else None) or "en").lower().split("-")[0]
    quote_label, from_label = {
        "es": ("Precio por confirmar", "Desde"),
        "en": ("Price to confirm", "From"),
        "fr": ("Prix a confirmer", "A partir de"),
        "pt": ("Preco a confirmar", "A partir de"),
    }.get(language, ("Price to confirm", "From"))
    for product in products:
        index = product.catalog_index
        if (index is None or index < 0 or index >= len(result)
                or counts[index] != 1 or not isinstance(result[index], dict)):
            logger.warning("Commerce overlay item skipped: site_id=%s product_id=%s invalid or ambiguous catalog_index=%s",
                           site.id, product.id, index)
            continue
        if not product.quote_only and (product.price_cents is None or product.price_cents <= 0):
            logger.warning("Commerce overlay item skipped: site_id=%s product_id=%s invalid fixed price", site.id, product.id)
            continue
        item = result[index]
        amount = None if product.quote_only else float(Decimal(product.price_cents) / 100)
        price_type = "quote_only" if product.quote_only else "starting_at" if product.price_is_approximate else "fixed"
        currency = item.get("currency") or "USD"
        label = quote_label if product.quote_only else f"{currency} {Decimal(product.price_cents) / 100:.2f}"
        if price_type == "starting_at":
            label = f"{from_label} {label}"
        item.update(
            name=product.name, description=product.description, image_url=product.image_url,
            category=product.category,
            price=amount, price_amount=amount, price_value=amount,
            price_type=price_type, price_label=label, inventory_quantity=product.inventory,
        )
        if not product.quote_only:
            item.update(business_id=site.store_id, product_id=product.id)
    return result
