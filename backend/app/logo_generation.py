from __future__ import annotations

import base64
import logging
import os
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
    return (
        f"Create one professional flat vector brand symbol for {state.businessName or 'this business'}. "
        f"Industry: {state.industry or 'general business'}. "
        f"Business context: {state.businessDescription or 'professional independent business'}. "
        f"Use this exact color direction: {palette_instruction}. "
        "Design a distinctive, simple, scalable icon that remains recognizable at favicon size. "
        "Transparent background, centered composition, solid colors, crisp geometric forms, no gradients, "
        "no mockup, no photograph, no watermark, no border, and no rendered words or letters."
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
