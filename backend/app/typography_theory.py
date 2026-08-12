from __future__ import annotations

from typing import Dict


# Distance (in scale-steps) of each typographic role from the body anchor
# (step 0). Larger step = larger size. H1 jumps further than a pure linear
# scale would (6.4 instead of ~5) so the hero heading keeps real visual
# impact instead of just being "one more step" like h2/h3.
ROLE_STEPS: Dict[str, float] = {
    "caption": -2.0,
    "small": -1.0,
    "label": -0.5,
    "body": 0.0,
    "button": 0.25,
    "h6": 1.0,
    "h5": 1.8,
    "h4": 2.6,
    "h3": 3.6,
    "h2": 4.8,
    "h1": 6.4,
}

# Display headings compress more aggressively on small viewports than body
# copy, which should stay close to its desktop size for readability.
MOBILE_SHRINK_FACTOR: Dict[str, float] = {
    "caption": 0.92,
    "small": 0.94,
    "label": 0.92,
    "body": 0.95,
    "button": 0.94,
    "h6": 0.88,
    "h5": 0.82,
    "h4": 0.76,
    "h3": 0.68,
    "h2": 0.62,
    "h1": 0.56,
}

TYPOGRAPHY_STYLE_RULES: Dict[str, dict] = {
    "elegante": {
        "ratio": 1.333,
        "body_size_px": 17.0,
        "body_line_height": 1.65,
        "heading_line_height": {"h1": 1.05, "h2": 1.1, "h3": 1.15, "h4": 1.2, "h5": 1.25, "h6": 1.3},
        "heading_tracking_em": {"h1": -0.02, "h2": -0.02, "h3": -0.01, "h4": 0.0, "h5": 0.0, "h6": 0.0},
        "heading_weight": {"h1": 700, "h2": 700, "h3": 600, "h4": 600, "h5": 600, "h6": 600},
        "body_weight": 400,
        "label_tracking_em": 0.08,
        "label_weight": 600,
        "button_weight": 600,
    },
    "organico": {
        "ratio": 1.25,
        "body_size_px": 16.0,
        "body_line_height": 1.7,
        "heading_line_height": {"h1": 1.12, "h2": 1.18, "h3": 1.22, "h4": 1.28, "h5": 1.3, "h6": 1.32},
        "heading_tracking_em": {"h1": -0.01, "h2": -0.005, "h3": 0.0, "h4": 0.0, "h5": 0.0, "h6": 0.0},
        "heading_weight": {"h1": 700, "h2": 600, "h3": 600, "h4": 500, "h5": 500, "h6": 500},
        "body_weight": 400,
        "label_tracking_em": 0.04,
        "label_weight": 600,
        "button_weight": 600,
    },
    "tecnologico": {
        "ratio": 1.2,
        "body_size_px": 16.0,
        "body_line_height": 1.5,
        "heading_line_height": {"h1": 1.0, "h2": 1.08, "h3": 1.12, "h4": 1.2, "h5": 1.25, "h6": 1.3},
        "heading_tracking_em": {"h1": -0.03, "h2": -0.03, "h3": -0.015, "h4": -0.005, "h5": -0.005, "h6": 0.0},
        "heading_weight": {"h1": 800, "h2": 700, "h3": 700, "h4": 600, "h5": 600, "h6": 600},
        "body_weight": 400,
        "label_tracking_em": 0.06,
        "label_weight": 600,
        "button_weight": 600,
    },
    "calido": {
        "ratio": 1.25,
        "body_size_px": 17.0,
        "body_line_height": 1.68,
        "heading_line_height": {"h1": 1.1, "h2": 1.18, "h3": 1.22, "h4": 1.28, "h5": 1.3, "h6": 1.32},
        "heading_tracking_em": {"h1": -0.01, "h2": 0.0, "h3": 0.0, "h4": 0.0, "h5": 0.0, "h6": 0.0},
        "heading_weight": {"h1": 700, "h2": 600, "h3": 600, "h4": 500, "h5": 500, "h6": 500},
        "body_weight": 400,
        "label_tracking_em": 0.05,
        "label_weight": 600,
        "button_weight": 600,
    },
}

VIEWPORT_MIN_PX = 360.0
VIEWPORT_MAX_PX = 1280.0


def _format_em(value: float) -> str:
    if value == 0:
        return "0em"
    return f"{value:g}em"


def _fluid_clamp(min_px: float, max_px: float) -> str:
    """CSS clamp() that scales linearly between VIEWPORT_MIN_PX and
    VIEWPORT_MAX_PX, expressed in rem + vw so it still respects the user's
    browser font-size setting (a pure px clamp would not)."""
    min_rem = min_px / 16.0
    max_rem = max_px / 16.0
    if max_px <= min_px:
        return f"{max_rem:.4f}rem"
    slope = (max_px - min_px) / (VIEWPORT_MAX_PX - VIEWPORT_MIN_PX)
    intercept_px = min_px - slope * VIEWPORT_MIN_PX
    intercept_rem = intercept_px / 16.0
    slope_vw = slope * 100.0
    preferred = f"{intercept_rem:.4f}rem + {slope_vw:.4f}vw"
    return f"clamp({min_rem:.4f}rem, {preferred}, {max_rem:.4f}rem)"


def build_typography_scale(palette_style: str) -> Dict[str, str]:
    """Deterministic type-scale generator. Mirrors color_theory.build_palette:
    the LLM only ever picks a style personality (elegante/organico/tecnologico/
    calido - the same field already used for color), every size, line-height,
    letter-spacing and weight below is computed in code, never guessed by the
    model. Output is a flat dict of CSS custom property name -> value, meant
    to be spread into themeVars() alongside the existing --site-* color vars.
    """
    style = palette_style if palette_style in TYPOGRAPHY_STYLE_RULES else "elegante"
    rule = TYPOGRAPHY_STYLE_RULES[style]
    ratio = rule["ratio"]
    body_px = rule["body_size_px"]

    sizes_px = {role: body_px * (ratio ** step) for role, step in ROLE_STEPS.items()}

    tokens: Dict[str, str] = {}
    for role, max_px in sizes_px.items():
        min_px = max_px * MOBILE_SHRINK_FACTOR[role]
        tokens[f"--type-{role}-size"] = _fluid_clamp(min_px, max_px)

    for role in ("h1", "h2", "h3", "h4", "h5", "h6"):
        tokens[f"--type-{role}-line-height"] = str(rule["heading_line_height"][role])
        tokens[f"--type-{role}-tracking"] = _format_em(rule["heading_tracking_em"][role])
        tokens[f"--type-{role}-weight"] = str(rule["heading_weight"][role])

    tokens["--type-body-line-height"] = str(rule["body_line_height"])
    tokens["--type-body-weight"] = str(rule["body_weight"])
    tokens["--type-small-line-height"] = str(round(rule["body_line_height"] - 0.1, 2))
    tokens["--type-small-weight"] = str(rule["body_weight"])
    tokens["--type-caption-line-height"] = str(round(rule["body_line_height"] - 0.2, 2))
    tokens["--type-caption-weight"] = str(rule["body_weight"])
    tokens["--type-label-line-height"] = "1.2"
    tokens["--type-label-weight"] = str(rule["label_weight"])
    tokens["--type-label-tracking"] = _format_em(rule["label_tracking_em"])
    tokens["--type-label-transform"] = "uppercase"
    tokens["--type-button-line-height"] = "1.2"
    tokens["--type-button-weight"] = str(rule["button_weight"])
    tokens["--type-button-tracking"] = "0.01em"

    return tokens
