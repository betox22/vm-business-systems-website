from __future__ import annotations

import asyncio
import base64
import io
import os
from typing import Any, Dict, List, Tuple

from openai import AsyncOpenAI
from PIL import Image, ImageDraw, ImageFont


LOGO_VARIANT_STYLES = (
    "rounded organic shapes, friendly balanced mark",
    "sharp geometric shapes, refined minimal construction",
    "emblem badge composition with a subtle enclosing border",
)


def build_logo_prompts(
    business_name: str,
    niche: str,
    palette_style: str,
    primary_color: str,
    secondary_color: str,
) -> List[str]:
    base = (
        f"Minimalist flat vector logo for a {niche or 'modern'} brand named {business_name}, "
        f"{palette_style or 'elegant'} style, use {primary_color or '#111111'} as the primary color "
        f"and {secondary_color or '#FFFFFF'} as the accent, solid colors, no gradients, "
        "no mockup, no watermark, no text outside the brand name, white background, high detail"
    )
    return [f"{base}, {style}" for style in LOGO_VARIANT_STYLES]


def _image_bytes_from_response(response: Any) -> bytes:
    data = getattr(response, "data", None) or []
    item = data[0] if data else None
    encoded = getattr(item, "b64_json", None) if item else None
    if not encoded:
        raise ValueError("The image provider did not return b64_json data.")
    return base64.b64decode(encoded)


async def generate_logo_images(prompts: List[str]) -> Tuple[List[Tuple[int, bytes]], List[str]]:
    """Generate each variation independently so one provider failure is isolated."""

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return [], ["OPENAI_API_KEY is not configured."]
    client = AsyncOpenAI(api_key=api_key)
    model = os.getenv("OPENAI_LOGO_MODEL", "gpt-image-1")

    async def generate_one(prompt: str) -> Tuple[bytes | None, str | None]:
        try:
            response = await client.images.generate(
                model=model,
                prompt=prompt,
                size="1024x1024",
                n=1,
                response_format="b64_json",
            )
            return _image_bytes_from_response(response), None
        except Exception as error:  # Provider availability is outside our control.
            # New accounts sometimes do not have gpt-image-1 enabled yet.
            # DALL-E 3 is a compatible, configurable fallback for that case.
            if model == "gpt-image-1":
                try:
                    response = await client.images.generate(
                        model="dall-e-3",
                        prompt=prompt,
                        size="1024x1024",
                        n=1,
                        response_format="b64_json",
                    )
                    return _image_bytes_from_response(response), None
                except Exception as fallback_error:
                    return None, f"{error}; fallback dall-e-3: {fallback_error}"
            return None, str(error)

    results = await asyncio.gather(*(generate_one(prompt) for prompt in prompts))
    images = [(index, image) for index, (image, _warning) in enumerate(results) if image]
    warnings = [warning for _image, warning in results if warning]
    return images, warnings


def add_watermark(image_bytes: bytes) -> bytes:
    """Make a deliberately low-fidelity preview with watermark coverage across it."""

    with Image.open(io.BytesIO(image_bytes)).convert("RGBA") as source:
        source.thumbnail((640, 640), Image.Resampling.LANCZOS)
        canvas = source.copy()
        overlay = Image.new("RGBA", canvas.size, (255, 255, 255, 0))
        draw = ImageDraw.Draw(overlay)
        font = ImageFont.load_default()
        label = "KREATON · PREVIEW"
        step = max(115, canvas.width // 3)
        for y in range(-canvas.height, canvas.height * 2, step):
            for x in range(-canvas.width, canvas.width * 2, step):
                draw.text((x, y), label, font=font, fill=(255, 255, 255, 116), stroke_width=1, stroke_fill=(0, 0, 0, 64))
        # Rotate the tiled surface so a straight crop cannot remove a single band.
        overlay = overlay.rotate(28, resample=Image.Resampling.BICUBIC, expand=False)
        canvas = Image.alpha_composite(canvas, overlay).convert("RGB")
        output = io.BytesIO()
        canvas.save(output, format="JPEG", quality=70, optimize=True)
        return output.getvalue()
