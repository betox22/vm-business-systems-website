from __future__ import annotations

from dataclasses import dataclass
import re
import unicodedata
from typing import Any, Dict, Iterable, List, Sequence, Tuple


TEXT_FIELDS = {
    "headline",
    "title",
    "subtitle",
    "text",
    "description",
    "eyebrow",
    "primary_button",
    "secondary_button",
    "button_label",
}
IMAGE_FIELDS = {"image", "image_url", "imageUrl", "images", "background_image", "hero_image"}
PRODUCT_FIELDS = {
    "name",
    "description",
    "category",
    "price",
    "price_amount",
    "price_label",
    "image_url",
    "imageUrl",
    "imageSearchQuery",
    "image_search_query",
}


@dataclass(frozen=True)
class SurgicalEditIntent:
    kind: str
    fields: Tuple[str, ...] = ()
    section_targets: Tuple[Tuple[int, int], ...] = ()
    product_targets: Tuple[int, ...] = ()
    confidence: float = 0.0

    def as_dict(self) -> Dict[str, Any]:
        return {
            "kind": self.kind,
            "fields": list(self.fields),
            "sectionTargets": [
                {"pageIndex": page_index, "sectionIndex": section_index}
                for page_index, section_index in self.section_targets
            ],
            "productTargets": list(self.product_targets),
            "confidence": self.confidence,
        }


def normalize_edit_text(value: Any) -> str:
    text = unicodedata.normalize("NFKD", str(value or ""))
    text = "".join(char for char in text if not unicodedata.combining(char))
    return re.sub(r"\s+", " ", text.lower()).strip()


def detect_surgical_edit_intent(
    instruction: str,
    schema: Dict[str, Any],
) -> SurgicalEditIntent:
    text = normalize_edit_text(instruction)
    product_targets = tuple(_matching_product_indexes(text, schema))
    section_targets = tuple(_matching_section_indexes(text, schema))

    if re.search(r"\b(logo|logotipo|marca grafica|brand mark)\b", text):
        return SurgicalEditIntent("logo", ("logo",), confidence=0.98)

    if re.search(r"\b(imagen|image|foto|photo|fotografia|picture)\b", text):
        return SurgicalEditIntent(
            "image",
            ("image",),
            section_targets=() if product_targets else (section_targets or tuple(_default_hero_target(schema))),
            product_targets=product_targets,
            confidence=0.97,
        )

    if re.search(r"\b(color|colores|paleta|azul|blue|rojo|red|verde|green|morado|purple|violeta|negro|black|blanco|white|amarillo|yellow|naranja|orange|rosa|pink)\b", text):
        return SurgicalEditIntent("color", (_requested_color_field(text),), confidence=0.98)

    if re.search(r"\b(producto|productos|product|item|articulo|servicio|service)\b", text):
        return SurgicalEditIntent(
            "product",
            (_requested_product_field(text),),
            product_targets=product_targets,
            confidence=0.95 if product_targets else 0.72,
        )

    if re.search(r"\b(texto|text|copy|titulo|title|headline|subtitulo|subtitle|slogan|frase|descripcion|description)\b", text):
        return SurgicalEditIntent(
            "section_text",
            (_requested_text_field(text),),
            section_targets=section_targets or tuple(_default_hero_target(schema)),
            confidence=0.94,
        )

    if re.search(r"\b(plantilla|template|layout|estructura|redisena|redesign|overlap|superpuest|encim|solap|cortad|clipping|espaciado|spacing)\b", text):
        return SurgicalEditIntent("layout", confidence=0.9)

    return SurgicalEditIntent("unknown", confidence=0.0)


def filter_operations_for_intent(
    operations: Iterable[Any],
    intent: SurgicalEditIntent,
) -> List[Any]:
    limits = {
        "color": 4,
        "section_text": 2,
        "product": 2,
        "image": 2,
        "logo": 3,
        "layout": 16,
        "unknown": 0,
    }
    accepted: List[Any] = []
    for operation in operations:
        if operation_allowed_for_intent(getattr(operation, "path", ""), intent):
            accepted.append(operation)
            if len(accepted) >= limits.get(intent.kind, 0):
                break
    return accepted


def synchronize_color_mirrors(
    original_schema: Dict[str, Any],
    patched_schema: Dict[str, Any],
    intent: SurgicalEditIntent,
) -> List[str]:
    if intent.kind != "color" or not intent.fields:
        return []
    field = intent.fields[0]
    brand_field = {
        "primary": "primaryColor",
        "secondary": "secondaryColor",
        "accent": "accentColor",
        "background": "backgroundColor",
        "text": "textColor",
    }.get(field)
    original_theme = original_schema.get("theme") if isinstance(original_schema.get("theme"), dict) else {}
    original_colors = original_theme.get("colors") if isinstance(original_theme.get("colors"), dict) else {}
    patched_theme = patched_schema.setdefault("theme", {})
    patched_colors = patched_theme.setdefault("colors", {})
    original_brand = original_schema.get("brand") if isinstance(original_schema.get("brand"), dict) else {}
    patched_brand = patched_schema.setdefault("brand", {})
    patched_brand_colors = patched_brand.get("colors") if isinstance(patched_brand.get("colors"), dict) else None

    new_color = patched_colors.get(field)
    if not new_color and brand_field:
        new_color = patched_brand.get(brand_field)
    if not new_color and patched_brand_colors:
        new_color = patched_brand_colors.get(field)
    if not new_color:
        return []

    changed: List[str] = []
    if patched_colors.get(field) != new_color:
        patched_colors[field] = new_color
        changed.append(f"/theme/colors/{field}")
    old_color = original_colors.get(field)
    if brand_field and original_brand.get(brand_field) in {None, "", old_color} and patched_brand.get(brand_field) != new_color:
        patched_brand[brand_field] = new_color
        changed.append(f"/brand/{brand_field}")
    if patched_brand_colors is not None:
        original_brand_colors = original_brand.get("colors") if isinstance(original_brand.get("colors"), dict) else {}
        if original_brand_colors.get(field) in {None, "", old_color} and patched_brand_colors.get(field) != new_color:
            patched_brand_colors[field] = new_color
            changed.append(f"/brand/colors/{field}")
    if field == "primary" and original_brand.get("buttonColor") in {None, "", old_color} and patched_brand.get("buttonColor") != new_color:
        patched_brand["buttonColor"] = new_color
        changed.append("/brand/buttonColor")
    return changed


def operation_allowed_for_intent(path: str, intent: SurgicalEditIntent) -> bool:
    parts = _json_pointer_parts(path)
    if not parts:
        return False

    if intent.kind == "color":
        requested = set(intent.fields)
        if len(parts) == 3 and parts[:2] == ["theme", "colors"]:
            return parts[2] in requested
        if len(parts) == 3 and parts[:2] == ["brand", "colors"]:
            return parts[2] in requested
        brand_field = {
            "primaryColor": "primary",
            "secondaryColor": "secondary",
            "accentColor": "accent",
            "backgroundColor": "background",
            "textColor": "text",
        }
        return len(parts) == 2 and parts[0] == "brand" and brand_field.get(parts[1]) in requested

    if intent.kind == "section_text":
        target = _section_path_target(parts)
        return bool(
            target
            and target in set(intent.section_targets)
            and len(parts) == 6
            and parts[4] in {"editable", "copyProps"}
            and parts[5] in set(intent.fields).intersection(TEXT_FIELDS)
        )

    if intent.kind == "product":
        target = _product_path_target(parts)
        return bool(
            target is not None
            and target in set(intent.product_targets)
            and len(parts) == 3
            and parts[2] in set(intent.fields).intersection(PRODUCT_FIELDS)
        )

    if intent.kind == "image":
        product_target = _product_path_target(parts)
        if product_target is not None:
            return bool(
                product_target in set(intent.product_targets)
                and len(parts) == 3
                and parts[2] in IMAGE_FIELDS.union({"imageSearchQuery", "image_search_query"})
            )
        section_target = _section_path_target(parts)
        return bool(
            section_target
            and section_target in set(intent.section_targets)
            and len(parts) == 6
            and parts[4] in {"editable", "settings"}
            and parts[5] in IMAGE_FIELDS
        )

    if intent.kind == "logo":
        return bool(
            (parts[0] == "brand" and any("logo" in part.lower() for part in parts[1:]))
            or (parts[0] == "business" and any("logo" in part.lower() for part in parts[1:]))
        )

    if intent.kind == "layout":
        return parts[0] in {
            "pages",
            "navigation",
            "selected_template",
            "active_template",
            "layout_mode",
            "design_variants",
        }

    return False


def _requested_color_field(text: str) -> str:
    if re.search(r"\b(fondo|background)\b", text):
        return "background"
    if re.search(r"\b(acento|accent)\b", text):
        return "accent"
    if re.search(r"\b(secundari[oa]|secondary)\b", text):
        return "secondary"
    if re.search(r"\b(texto|text)\b", text):
        return "text"
    return "primary"


def _requested_text_field(text: str) -> str:
    if re.search(r"\b(subtitulo|subtitle)\b", text):
        return "subtitle"
    if re.search(r"\b(titulo|title|headline|slogan)\b", text):
        return "headline"
    if re.search(r"\b(descripcion|description)\b", text):
        return "description"
    return "text"


def _requested_product_field(text: str) -> str:
    if re.search(r"\b(imagen|image|foto|photo)\b", text):
        return "image_url"
    if re.search(r"\b(precio|price)\b", text):
        return "price"
    if re.search(r"\b(categoria|category)\b", text):
        return "category"
    if re.search(r"\b(descripcion|description)\b", text):
        return "description"
    return "name"


def _matching_product_indexes(text: str, schema: Dict[str, Any]) -> Sequence[int]:
    matches: List[int] = []
    catalog = schema.get("catalog_items")
    if not isinstance(catalog, list):
        return matches
    for index, item in enumerate(catalog):
        if not isinstance(item, dict):
            continue
        name = normalize_edit_text(item.get("name"))
        significant = [token for token in name.split() if len(token) >= 4]
        if name and (name in text or (significant and all(token in text for token in significant))):
            matches.append(index)
    if not matches and len(catalog) == 1:
        matches.append(0)
    return matches


def _matching_section_indexes(text: str, schema: Dict[str, Any]) -> Sequence[Tuple[int, int]]:
    aliases = {
        "hero": ("hero", "portada", "principal", "inicio", "home"),
        "about": ("about", "nosotros", "historia", "story", "quienes somos"),
        "contact": ("contact", "contacto"),
        "faq": ("faq", "preguntas", "frecuentes"),
        "product": ("producto", "productos", "catalog", "tienda", "shop"),
        "service": ("servicio", "servicios", "service"),
        "gallery": ("galeria", "gallery", "portfolio"),
        "testimonial": ("testimonio", "resena", "review", "testimonial"),
    }
    requested_groups = {
        group for group, tokens in aliases.items() if any(token in text for token in tokens)
    }
    matches: List[Tuple[int, int]] = []
    pages = schema.get("pages")
    if not isinstance(pages, list):
        return matches
    for page_index, page in enumerate(pages):
        sections = page.get("sections") if isinstance(page, dict) else None
        if not isinstance(sections, list):
            continue
        for section_index, section in enumerate(sections):
            if not isinstance(section, dict):
                continue
            haystack = normalize_edit_text(" ".join(str(section.get(key) or "") for key in ("type", "id", "name", "label")))
            if any(
                any(token in haystack for token in aliases[group])
                for group in requested_groups
            ):
                matches.append((page_index, section_index))
    return matches


def _default_hero_target(schema: Dict[str, Any]) -> Sequence[Tuple[int, int]]:
    pages = schema.get("pages")
    if not isinstance(pages, list):
        return []
    for page_index, page in enumerate(pages):
        sections = page.get("sections") if isinstance(page, dict) else None
        if not isinstance(sections, list):
            continue
        for section_index, section in enumerate(sections):
            if isinstance(section, dict) and "hero" in normalize_edit_text(section.get("type")):
                return [(page_index, section_index)]
    return []


def _section_path_target(parts: Sequence[str]) -> Tuple[int, int] | None:
    if len(parts) < 4 or parts[0] != "pages" or parts[2] != "sections":
        return None
    try:
        return int(parts[1]), int(parts[3])
    except ValueError:
        return None


def _product_path_target(parts: Sequence[str]) -> int | None:
    if len(parts) < 2 or parts[0] != "catalog_items":
        return None
    try:
        return int(parts[1])
    except ValueError:
        return None


def _json_pointer_parts(path: str) -> List[str]:
    if not path.startswith("/"):
        return []
    return [part.replace("~1", "/").replace("~0", "~") for part in path.split("/")[1:]]
