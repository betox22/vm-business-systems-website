from __future__ import annotations

import base64
import logging
import os
import re
from dataclasses import dataclass
from typing import Any, Callable, Optional

from .models import ProjectState
from .storage import upload_asset_to_supabase, validate_upload


logger = logging.getLogger("kreaton")

try:
    from openai import AsyncOpenAI
except Exception:  # pragma: no cover - dependency may be absent in local dev
    AsyncOpenAI = None  # type: ignore[assignment]


OPENAI_LOGO_MODEL = os.getenv("OPENAI_LOGO_MODEL", "gpt-image-2")
OPENAI_LOGO_SIZE = "1024x1024"
OPENAI_LOGO_QUALITY = "low"


@dataclass(frozen=True)
class LogoGenerationOutcome:
    status: str
    url: Optional[str] = None
    warning: Optional[str] = None


def build_logo_prompt(state: ProjectState) -> str:
    business_name = str(state.businessName or "this business").strip()
    provenance = state.colorProvenance
    anchor_color = getattr(provenance, "anchorColor", None)
    palette = [
        state.preferredColors,
        anchor_color,
        state.colors.get("primary"),
        state.colors.get("secondary"),
        state.colors.get("accent"),
        *state.logoPalette,
    ]
    palette_values = list(dict.fromkeys(str(value).strip() for value in palette if str(value or "").strip()))
    palette_instruction = ", ".join(palette_values[:6]) or "the brand palette selected for this business niche"
    logo_brief = str(state.logoBrief or "").strip()
    offerings = ", ".join(str(item).strip() for item in state.servicesProducts if str(item).strip())
    initials_match = re.search(r"\b(?:initials?|iniciales?)\s*[\"':-]*\s*([A-Z0-9]{2,6})\b", logo_brief, re.I)
    mark_instruction = (
        f"The client explicitly requested the initials {initials_match.group(1).upper()}; integrate exactly those initials as the central monogram, with no other words. "
        if initials_match
        else f"Choose the strongest format for the strategy: symbol, wordmark, or combination mark. If text is used, render only the exact business name '{business_name}', spelled correctly, with no slogan or extra words. "
    )
    brief_instruction = f"Client logo direction: {logo_brief}. " if logo_brief else ""
    return (
        "Act as a senior brand identity designer and marketing strategist, not an illustration generator. "
        f"Create one market-ready flat vector identity for {business_name}. "
        f"Industry: {state.industry or 'general business'}. "
        f"Business context: {state.businessDescription or 'professional independent business'}. "
        f"Products or services: {offerings or 'infer the core offering from the business context'}. "
        f"Audience: {state.targetAudience or 'the business primary customers'}. "
        f"Desired brand tone: {state.preferredTone or 'infer the most credible tone for this market'}. "
        f"{brief_instruction}"
        f"Use this exact color direction: {palette_instruction}. "
        f"{mark_instruction}"
        "First identify the emotional promise the brand should communicate, such as calm, craftsmanship, trust, luxury, energy, or technical precision, based on this specific business. "
        "Translate that positioning into one ownable visual idea: a purposeful symbol, monogram, or typographic composition with a clear meaning connected to the actual offering and audience. "
        "Choose one central metaphor and reduce it to one cohesive mark with at most two or three visual elements; do not illustrate a scene, collection of products, or collage of category symbols. "
        "Use typography with distinctive character appropriate to the brand tone, with intentional custom letterforms when letters are requested. "
        "The result must feel art-directed, balanced, memorable, and commercially credible at the standard of a professional identity used in the real market. "
        "Avoid clip art, stock-logo conventions, meaningless geometric marks, arbitrary abstract shapes, literal collages, generic initial monograms, and generic industry icons with no strategic connection. "
        "Do not default to a letter inside a geometric frame unless the client explicitly requested initials and the letterform itself carries a distinctive strategic idea. "
        "Keep the composition clean and scalable, with strong silhouette, controlled negative space, and legibility from storefront or website header down to favicon size. "
        "The design must be 100% original and must not imitate, reference, remix, or reuse any element "
        "from an existing or recognizable brand, logo, trademark, trade dress, or competitor in this industry. "
        "Do not use icons, silhouettes, letterforms, typography, compositions, or visual signatures that could "
        "reasonably evoke a known real-world brand. Create an independent visual identity from first principles. "
        "If any candidate concept resembles a known brand, discard it and create a substantially different original concept before returning the image. "
        "Transparent background, centered composition, flat two-dimensional vector execution, solid colors, and crisp forms. "
        "No gradients, glow, shadows, lighting effects, texture, atmosphere, mockup, photograph, watermark, border, or decorative background."
    )


def _image_bytes_from_response(response: Any) -> bytes:
    data = getattr(response, "data", None) or []
    first = data[0] if data else None
    encoded = getattr(first, "b64_json", None) if first is not None else None
    if encoded is None and isinstance(first, dict):
        encoded = first.get("b64_json")
    if not encoded:
        raise ValueError("OpenAI image generation returned no b64_json data.")
    return base64.b64decode(encoded, validate=True)


async def generate_and_store_ai_logo(
    state: ProjectState,
    *,
    business_id: str,
    site_id: str,
    client: Any = None,
    uploader: Optional[Callable[..., str]] = None,
) -> LogoGenerationOutcome:
    if state.logoPreference != "generate_ai_logo" or state.logoUrl:
        return LogoGenerationOutcome(status="not_requested", url=state.logoUrl)

    try:
        if client is None:
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key or AsyncOpenAI is None:
                raise RuntimeError("OpenAI image generation is not configured.")
            client = AsyncOpenAI(api_key=api_key, timeout=90.0)

        response = await client.images.generate(
            model=OPENAI_LOGO_MODEL,
            prompt=build_logo_prompt(state),
            size=OPENAI_LOGO_SIZE,
            quality=OPENAI_LOGO_QUALITY,
            background="transparent",
            output_format="png",
            n=1,
        )
        image_bytes = _image_bytes_from_response(response)
        validate_upload(asset_type="logo", content_type="image/png", data=image_bytes)
        upload = uploader or upload_asset_to_supabase
        public_url = upload(
            business_id=business_id,
            site_id=site_id,
            asset_type="logo",
            file_name="ai-generated-logo.png",
            content_type="image/png",
            data=image_bytes,
        )
        state.logoUrl = public_url
        state.logoGenerationStatus = "generated"
        logger.info(
            "LYRA AI logo generated model=%s quality=%s business=%s",
            OPENAI_LOGO_MODEL,
            OPENAI_LOGO_QUALITY,
            state.businessName or "unknown",
        )
        return LogoGenerationOutcome(status="generated", url=public_url)
    except Exception as error:
        state.logoUrl = None
        state.logoGenerationStatus = "generation_failed"
        warning = str(error)
        logger.warning(
            "LYRA AI logo generation failed model=%s business=%s reason=%s",
            OPENAI_LOGO_MODEL,
            state.businessName or "unknown",
            warning,
            exc_info=True,
        )
        return LogoGenerationOutcome(status="generation_failed", warning=warning)
