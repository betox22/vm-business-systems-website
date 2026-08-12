from __future__ import annotations

import colorsys
import re
import unicodedata
from typing import Dict, Iterable, Literal, Optional, Tuple


HSL = Tuple[float, float, float]
HarmonyScheme = Literal["complementary", "analogous", "triadic", "split_complementary"]


STYLE_ALIASES = {
    "elegant": "elegante",
    "elegante": "elegante",
    "luxury": "elegante",
    "premium": "elegante",
    "organic": "organico",
    "organico": "organico",
    "natural": "organico",
    "technology": "tecnologico",
    "technological": "tecnologico",
    "tecnologico": "tecnologico",
    "cyberpunk": "tecnologico",
    "warm": "calido",
    "calido": "calido",
}

STYLE_RULES = {
    "elegante": {"scheme": "analogous", "saturation": 0.48},
    "organico": {"scheme": "analogous", "saturation": 0.56},
    "tecnologico": {"scheme": "complementary", "saturation": 0.86},
    "calido": {"scheme": "split_complementary", "saturation": 0.72},
}

NICHE_HUES = (
    (("beauty", "salon", "spa", "cosmetic", "skincare", "belleza"), 330.0),
    (("restaurant", "food", "cafe", "bakery", "comida"), 24.0),
    (("health", "medical", "clinic", "wellness", "salud"), 164.0),
    (("home", "decor", "furniture", "hogar"), 36.0),
    (("legal", "law", "finance", "consulting"), 218.0),
    (("technology", "software", "saas", "cyber", "tech"), 208.0),
    (("fashion", "jewelry", "boutique", "moda", "joyeria"), 292.0),
    (("fitness", "gym", "sport", "gimnasio"), 138.0),
    (("education", "academy", "school", "tutoring"), 46.0),
    (("pet", "grooming", "veterinary", "mascota"), 112.0),
    (("real estate", "property", "inmobiliaria"), 198.0),
)


def _clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
    return max(minimum, min(maximum, value))


def normalize_hex(value: object) -> Optional[str]:
    text = str(value or "").strip()
    if re.fullmatch(r"#[0-9A-Fa-f]{3}", text):
        text = "#" + "".join(character * 2 for character in text[1:])
    if not re.fullmatch(r"#[0-9A-Fa-f]{6}", text):
        return None
    return text.upper()


def hex_to_hsl(value: str) -> HSL:
    normalized = normalize_hex(value)
    if not normalized:
        raise ValueError(f"Invalid HEX color: {value}")
    red = int(normalized[1:3], 16) / 255.0
    green = int(normalized[3:5], 16) / 255.0
    blue = int(normalized[5:7], 16) / 255.0
    hue, lightness, saturation = colorsys.rgb_to_hls(red, green, blue)
    return ((hue * 360.0) % 360.0, saturation, lightness)


def hsl_to_hex(value: HSL) -> str:
    hue, saturation, lightness = value
    red, green, blue = colorsys.hls_to_rgb(
        (hue % 360.0) / 360.0,
        _clamp(lightness),
        _clamp(saturation),
    )
    return f"#{round(red * 255):02X}{round(green * 255):02X}{round(blue * 255):02X}"


def generate_harmony(anchor_hsl: HSL, scheme: HarmonyScheme) -> list[HSL]:
    hue, saturation, lightness = anchor_hsl
    rotations = {
        "complementary": (0.0, 180.0),
        "analogous": (0.0, -30.0, 30.0),
        "triadic": (0.0, 120.0, 240.0),
        "split_complementary": (0.0, 150.0, 210.0),
    }
    if scheme not in rotations:
        raise ValueError(f"Unsupported harmony scheme: {scheme}")
    return [((hue + rotation) % 360.0, saturation, lightness) for rotation in rotations[scheme]]


def _linear_channel(channel: int) -> float:
    value = channel / 255.0
    return value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4


def _relative_luminance(value: str) -> float:
    normalized = normalize_hex(value)
    if not normalized:
        raise ValueError(f"Invalid HEX color: {value}")
    red = _linear_channel(int(normalized[1:3], 16))
    green = _linear_channel(int(normalized[3:5], 16))
    blue = _linear_channel(int(normalized[5:7], 16))
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue


def contrast_ratio(first: str, second: str) -> float:
    first_luminance = _relative_luminance(first)
    second_luminance = _relative_luminance(second)
    lighter = max(first_luminance, second_luminance)
    darker = min(first_luminance, second_luminance)
    return (lighter + 0.05) / (darker + 0.05)


def adjust_lightness_for_contrast(
    foreground: str,
    background: str,
    minimum_ratio: float = 4.5,
) -> str:
    normalized = normalize_hex(foreground)
    if not normalized:
        raise ValueError(f"Invalid HEX color: {foreground}")
    if contrast_ratio(normalized, background) >= minimum_ratio:
        return normalized

    hue, saturation, lightness = hex_to_hsl(normalized)
    candidates: list[tuple[float, str]] = []
    for step in range(1, 101):
        delta = step / 100.0
        for candidate_lightness in (lightness - delta, lightness + delta):
            if not 0.0 <= candidate_lightness <= 1.0:
                continue
            candidate = hsl_to_hex((hue, saturation, candidate_lightness))
            if contrast_ratio(candidate, background) >= minimum_ratio:
                candidates.append((abs(candidate_lightness - lightness), candidate))
        if candidates:
            return min(candidates, key=lambda item: item[0])[1]

    black_or_white = ("#000000", "#FFFFFF")
    return max(black_or_white, key=lambda candidate: contrast_ratio(candidate, background))


def _normalize_style(palette_style: object) -> str:
    normalized = unicodedata.normalize("NFKD", str(palette_style or "").lower())
    normalized = "".join(character for character in normalized if not unicodedata.combining(character))
    return STYLE_ALIASES.get(normalized.strip(), "elegante")


def _default_hue(niche_hint: object, palette_style: str) -> float:
    normalized = unicodedata.normalize("NFKD", str(niche_hint or "").lower())
    normalized = "".join(character for character in normalized if not unicodedata.combining(character))
    for terms, hue in NICHE_HUES:
        if any(term in normalized for term in terms):
            return hue
    return {
        "elegante": 220.0,
        "organico": 96.0,
        "tecnologico": 205.0,
        "calido": 20.0,
    }[palette_style]


def _accessible_text(base_hsl: HSL, backgrounds: Iterable[str]) -> str:
    backgrounds = list(backgrounds)
    hue, saturation, _ = base_hsl
    candidates = [
        hsl_to_hex((hue, min(saturation, 0.28), lightness))
        for lightness in (0.12, 0.08, 0.18, 0.92, 0.96, 1.0, 0.0)
    ]
    valid = [
        candidate
        for candidate in candidates
        if all(contrast_ratio(candidate, background) >= 4.5 for background in backgrounds)
    ]
    if valid:
        return valid[0]
    return max(
        ("#000000", "#FFFFFF"),
        key=lambda candidate: min(contrast_ratio(candidate, bg) for bg in backgrounds),
    )


def build_palette(
    anchor_hex_or_none: Optional[str],
    palette_style: str,
    niche_hint: object = "",
) -> Dict[str, str]:
    style = _normalize_style(palette_style)
    rule = STYLE_RULES[style]
    normalized_anchor = normalize_hex(anchor_hex_or_none)
    if normalized_anchor:
        anchor_hsl = hex_to_hsl(normalized_anchor)
    else:
        anchor_hsl = (_default_hue(niche_hint, style), rule["saturation"], 0.42)
        normalized_anchor = hsl_to_hex(anchor_hsl)

    anchor_hue, anchor_saturation, anchor_lightness = anchor_hsl
    harmony = generate_harmony(anchor_hsl, rule["scheme"])
    styled_saturation = _clamp(
        (anchor_saturation * 0.45) + (rule["saturation"] * 0.55),
        0.28,
        0.92,
    )

    secondary_hue = harmony[1][0]
    accent_hue = harmony[-1][0]
    if style == "tecnologico":
        background = hsl_to_hex((anchor_hue, 0.28, 0.07))
        surface = hsl_to_hex((anchor_hue, 0.22, 0.12))
        secondary_lightness = 0.62
        accent_lightness = 0.58
    else:
        background_saturation = 0.10 if style == "elegante" else 0.16
        background = hsl_to_hex((anchor_hue, background_saturation, 0.97))
        surface = hsl_to_hex((anchor_hue, background_saturation * 0.75, 0.995))
        secondary_lightness = _clamp(anchor_lightness + 0.10, 0.34, 0.62)
        accent_lightness = _clamp(anchor_lightness - 0.02, 0.34, 0.56)

    secondary = hsl_to_hex((secondary_hue, styled_saturation * 0.82, secondary_lightness))
    accent = hsl_to_hex((accent_hue, styled_saturation, accent_lightness))
    text = _accessible_text((anchor_hue, styled_saturation, anchor_lightness), (background, surface))

    semantic_saturation = _clamp(0.48 + styled_saturation * 0.28, 0.52, 0.74)
    semantic_lightness = 0.38 if style != "tecnologico" else 0.66
    semantic_colors = {
        "success": hsl_to_hex((138.0, semantic_saturation, semantic_lightness)),
        "warning": hsl_to_hex((42.0, semantic_saturation, semantic_lightness)),
        "error": hsl_to_hex((4.0, semantic_saturation, semantic_lightness)),
        "info": hsl_to_hex((210.0, semantic_saturation, semantic_lightness)),
    }
    for name, color in semantic_colors.items():
        accessible = adjust_lightness_for_contrast(color, background)
        semantic_colors[name] = adjust_lightness_for_contrast(accessible, surface)

    return {
        "background": background,
        "surface": surface,
        "primary": normalized_anchor,
        "secondary": secondary,
        "accent": accent,
        "text": text,
        **semantic_colors,
    }
