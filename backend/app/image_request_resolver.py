from __future__ import annotations

import base64
import os
from typing import Any

from openai import OpenAI

from .image_assets import build_image_asset, resolve_product_category
from .openai_usage import call_sync, observed_http_client
from .storage import upload_asset_to_supabase, validate_upload


STOCK_ROLES = {
    "hero_candidate": "hero_editorial",
    "product_card": "product_packshot",
    "process_shot": "category_lifestyle",
    "portrait": "category_lifestyle",
}

TEXTURE_MATERIALS = {
    "impresion-3d": "fine layered polymer filament and workshop surfaces",
    "industrial": "brushed metal, concrete, and workshop surfaces",
    "belleza": "soft mineral and botanical surfaces",
    "tecnologia": "precision-machined surfaces and diffuse light",
}


def _generate_texture_asset_url(category: str, business_context: dict) -> str:
    business_id = business_context.get("business_id")
    site_id = business_context.get("site_id")
    if not isinstance(business_id, str) or not business_id.strip():
        raise ValueError("business_context.business_id is required for generated images")
    if not isinstance(site_id, str) or not site_id.strip():
        raise ValueError("business_context.site_id is required for generated images")

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OpenAI image generation is not configured")

    industry = business_context.get("industry")
    industry_text = industry if isinstance(industry, str) else ""
    resolved_category = resolve_product_category({"category": category})
    if resolved_category == "producto-general":
        resolved_category = resolve_product_category({"category": industry_text})
    material = TEXTURE_MATERIALS.get(resolved_category, "abstract layered material surfaces")
    prompt = (
        f"Create an abstract, non-representational atmospheric texture inspired by {material}. "
        "Focus on material, light, depth, and composition. No identifiable products, "
        "people, logos, brands, text, packaging, or client-specific objects."
    )
    client = OpenAI(api_key=api_key, timeout=90.0, http_client=observed_http_client(asynchronous=False))
    model = os.getenv("OPENAI_IMAGE_MODEL") or os.getenv("OPENAI_LOGO_MODEL") or "gpt-image-2"
    response = call_sync("texture_generation", model, lambda: client.images.generate(
        model=model,
        prompt=prompt,
        size="1024x1024",
        quality="low",
        output_format="png",
        n=1,
    ))
    data = getattr(response, "data", None) or []
    encoded = getattr(data[0], "b64_json", None) if data else None
    if not encoded:
        raise ValueError("OpenAI image generation returned no image data")
    image_bytes = base64.b64decode(encoded, validate=True)
    validate_upload(asset_type="image", content_type="image/png", data=image_bytes)
    return upload_asset_to_supabase(
        business_id=business_id.strip(),
        site_id=site_id.strip(),
        asset_type="image",
        file_name="ai-generated-texture.png",
        content_type="image/png",
        data=image_bytes,
    )


def resolve_image_requests(image_requests: list[dict], business_context: dict) -> list[dict]:
    if not isinstance(image_requests, list) or not isinstance(business_context, dict):
        raise ValueError("image_requests must be a list and business_context must be a dict")

    resolved: list[dict[str, Any]] = []
    for request in image_requests:
        if not isinstance(request, dict):
            raise ValueError("Each image request must be a dict")
        slot_id = request.get("slot_id")
        role = request.get("image_role")
        category = request.get("category")
        if not isinstance(slot_id, str) or not slot_id.strip():
            raise ValueError("Each image request requires a slot_id")
        if not isinstance(category, str) or not category.strip():
            raise ValueError("Each image request requires a category")

        if role == "texture_atmosphere":
            asset_url = _generate_texture_asset_url(category.strip(), business_context)
            source = "generated"
        elif role in STOCK_ROLES:
            asset = build_image_asset({
                "category": category.strip(),
                "imageSearchQuery": category.strip(),
                "imageRole": STOCK_ROLES[role],
            })
            asset_url = asset["url"]
            source = "stock"
        else:
            raise ValueError(f"Unsupported image_role: {role}")

        resolved.append({
            "slot_id": slot_id,
            "image_role": role,
            "asset_url": asset_url,
            "source": source,
        })
    return resolved
