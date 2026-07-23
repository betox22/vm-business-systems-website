from __future__ import annotations

import re
from typing import Any, Dict, List, Literal, Mapping, Optional

from pydantic import BaseModel, ConfigDict, Field

from .taxonomy import CATEGORY_KEYWORDS, TAXONOMY, normalize_image_text


ImageAssetSource = Literal[
    "seed_bank",
    "client_upload",
    "ai_generated",
    "external_url",
    "fallback_stock",
]


class ImageAsset(BaseModel):
    """Editable image metadata used by Lyra without changing the render contract.

    `image_url` remains the primary renderer field. This metadata is the bridge
    for the future storage/CDN image bank, AI image jobs, and client uploads.
    """

    model_config = ConfigDict(extra="forbid")

    source: ImageAssetSource = "seed_bank"
    provider: str = "kreaton_seed_bank"
    category: str = "producto-general"
    query: str = ""
    url: str
    alt: str = ""
    attribution: Optional[str] = None
    license_note: str = (
        "Prototype seed image. Replace with licensed, client-owned, or generated "
        "asset before final production publishing."
    )
    variants: Dict[str, str] = Field(default_factory=dict)
    is_editable: bool = True


STABLE_IMAGE_URLS: List[Dict[str, str]] = [
    {
        "match": r"necklace|collar|jewel|joya|bisuter|crystal|cristal|gift-box|regalo",
        "url": "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=82",
    },
    {
        "match": r"bracelet|pulsera|pearl|perla|charm",
        "url": "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=900&q=82",
    },
    {
        "match": r"earring|arete",
        "url": "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=900&q=82",
    },
    {
        "match": r"ring|anillo",
        "url": "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=900&q=82",
    },
    {
        "match": r"streetwear|jacket|chaqueta|fashion|moda|ropa|sneaker|denim|cap|bolso|bag",
        "url": "https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=900&q=82",
    },
    {
        "match": r"usb|phone|gadget|tech|keyboard|lamp|projector|electronics|gaming|rgb",
        "url": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=82",
    },
    {
        "match": r"truck|bumper|4x4|off-road|auto|car|automotive|camioneta",
        "url": "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=82",
    },
    {
        "match": r"coffee|espresso|brew|latte|cafe",
        "url": "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=82",
    },
    {
        "match": r"restaurant|food|menu|pizza|dish|comida|tacos|salad|dessert|meal",
        "url": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=82",
    },
    {
        "match": r"home|decor|furniture|mueble|hogar|lamp|organizer",
        "url": "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=82",
    },
    {
        "match": r"spa-bath-towel|bath-towel|toalla|towel",
        "url": "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=82",
    },
    {
        "match": r"handmade-soap|soap-bar|jabon|jabón|jabones|soap",
        "url": "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=82",
    },
    {
        "match": r"bath-salts|sales-de-bano|sales de bano|sales de baño",
        "url": "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=82",
    },
    {
        "match": r"bath-sponge|bano-sponge|natural-bath-sponge|esponja",
        "url": "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=82",
    },
    {
        "match": r"body-oil|aceite-corporal|body oil",
        "url": "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=82",
    },
    {
        "match": r"bath-bomb|bath bomb|bombas-de-bano|bombas de bano|bombas de baño",
        "url": "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=82",
    },
    {
        "match": r"aromatic-candle|scented-candle|candle|candles|vela|velas",
        "url": "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=82",
    },
    {
        "match": r"soap|jabon|jabón|jabones|bath|bath-bomb|bath bomb|bombas-de-bano|bombas de bano|bombas de baño|body-care|body care|candle|candles|vela|velas|beauty|skincare|cosmetic|belleza|makeup|spa",
        "url": "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=82",
    },
]


def stable_seed_image_url(keyword: str) -> str:
    clean = re.sub(r"[^a-z0-9]+", "-", normalize_image_text(keyword) or "premium product").strip("-")
    for fallback in STABLE_IMAGE_URLS:
        if re.search(fallback["match"], clean):
            return fallback["url"]
    return "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=900&q=82"


def is_legacy_or_unstable_image_url(url: Any) -> bool:
    """Reject missing or historically brittle external image URLs.

    LLM-generated catalog URLs are ignored before this module runs. This guard
    remains for other entry points, such as imported products or user-provided
    URLs, so a known-brittle external URL falls back to the stable seed bank.
    """
    value = str(url or "").strip()
    if not value:
        return True
    if "/featured/600x600" in value or "/source/" in value or "source.unsplash.com" in value:
        return True
    if "photo-1523275335684-37898b6baf30" in value:
        return True
    return False


def resolve_product_category(product: Mapping[str, Any], context: str = "") -> str:
    product_core_text = normalize_image_text(
        " ".join(
            [
                str(product.get("name") or ""),
                str(product.get("category") or ""),
                str(product.get("imageSearchQuery") or product.get("image_search_query") or ""),
            ]
        )
    )

    for category, pattern in CATEGORY_KEYWORDS.items():
        if re.search(pattern, product_core_text):
            return category

    for broad, subcategories in TAXONOMY.items():
        for subcategory in subcategories:
            if subcategory.replace("-", " ") in product_core_text:
                return subcategory
        if broad in product_core_text:
            return broad

    product_text = normalize_image_text(
        " ".join(
            [
                product_core_text,
                str(product.get("description") or ""),
            ]
        )
    )

    for category, pattern in CATEGORY_KEYWORDS.items():
        if re.search(pattern, product_text):
            return category

    for broad, subcategories in TAXONOMY.items():
        for subcategory in subcategories:
            if subcategory.replace("-", " ") in product_text:
                return subcategory
        if broad in product_text:
            return broad

    context_text = normalize_image_text(context)
    for category, pattern in CATEGORY_KEYWORDS.items():
        if re.search(pattern, context_text):
            return category

    for broad, subcategories in TAXONOMY.items():
        for subcategory in subcategories:
            if subcategory.replace("-", " ") in context_text:
                return subcategory
        if broad in context_text:
            return broad

    return "producto-general"


def resolve_product_image_url(product: Mapping[str, Any], context: str = "") -> str:
    category = resolve_product_category(product, context)
    query = str(
        product.get("imageSearchQuery")
        or product.get("image_search_query")
        or product.get("category")
        or product.get("name")
        or context
        or "premium product"
    )
    url = product.get("image_url") or product.get("imageUrl")
    if not is_legacy_or_unstable_image_url(url):
        return str(url)
    return stable_seed_image_url(f"{category} {query}")


def build_image_asset(product: Mapping[str, Any], context: str = "") -> Dict[str, Any]:
    category = resolve_product_category(product, context)
    query = str(
        product.get("imageSearchQuery")
        or product.get("image_search_query")
        or product.get("category")
        or product.get("name")
        or category
    )
    seed_url = stable_seed_image_url(f"{category} {query}")
    url = resolve_product_image_url(product, context)
    existing_url = str(product.get("image_url") or product.get("imageUrl") or "")
    stable_urls = {entry["url"] for entry in STABLE_IMAGE_URLS}
    source: ImageAssetSource = (
        "seed_bank"
        if is_legacy_or_unstable_image_url(existing_url) or url == seed_url or url in stable_urls
        else "external_url"
    )

    asset = ImageAsset(
        source=source,
        provider="kreaton_seed_bank" if source == "seed_bank" else "provided_url",
        category=category,
        query=query,
        url=url,
        alt=str(product.get("name") or query),
        variants={"thumb": url, "card": url, "full": url},
    )
    return asset.model_dump(exclude_none=True)


def attach_image_asset(product: Mapping[str, Any], context: str = "") -> Dict[str, Any]:
    enriched = dict(product)
    asset = enriched.get("image_asset")
    if isinstance(asset, dict) and asset.get("url"):
        enriched["image_url"] = str(asset["url"])
        return enriched

    new_asset = build_image_asset(enriched, context)
    enriched["image_url"] = new_asset["url"]
    enriched["image_asset"] = new_asset
    return enriched


def attach_image_assets_to_catalog(items: List[Dict[str, Any]], context: str = "") -> List[Dict[str, Any]]:
    return [attach_image_asset(item, context) for item in items]
