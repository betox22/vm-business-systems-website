from __future__ import annotations

import re
from typing import Any, Dict, List


TAXONOMY: Dict[str, List[str]] = {
    "moda": ["ropa", "zapatos", "sombreros", "bolsos", "accesorios-textiles", "streetwear"],
    "joyeria": ["aretes", "collares", "pulseras", "anillos", "relojes", "bisuteria"],
    "automotriz": ["repuestos-auto", "accesorios-auto", "llantas", "audio-auto", "off-road", "4x4"],
    "motos": ["repuestos-moto", "cascos", "accesorios-moto"],
    "hogar": ["velas", "decoracion", "textiles-hogar", "cocina", "organizacion", "muebles"],
    "belleza": ["jabones", "soap", "velas", "candles", "bath-bombs", "skincare", "cosmeticos", "cuidado-personal", "makeup", "bath"],
    "plantas": ["plantas-interior", "macetas", "jardineria", "semillas"],
    "manualidades": ["hilos", "telas", "botones", "abalorios"],
    "materiales": ["metal", "madera", "ceramica", "vidrio", "cuero"],
    "salud": ["suplementos", "equipo-medico", "cuidado-personal-salud"],
    "tecnologia": ["gadgets", "accesorios-celular", "audio", "computo", "gaming", "electronica"],
    "comida": ["cafe", "reposteria", "snacks", "bebidas", "restaurant", "menu"],
    "mascotas": ["accesorios-mascota", "alimento-mascota", "juguetes-mascota"],
    "industrial": ["electrico", "plomeria", "herramientas", "tornilleria", "seguridad-industrial"],
}


CATEGORY_KEYWORDS: Dict[str, str] = {
    "collares": r"\b(?:necklace|collar|collares|cadena|crystal|cristal)\b",
    "pulseras": r"\b(?:bracelet|pulsera|pulseras|pearl|perla|charm|dije)\b",
    "aretes": r"\b(?:earring|arete|aretes|zarcillo|zarcillos)\b",
    "anillos": r"\b(?:ring|anillo|anillos)\b",
    "bisuteria": r"\b(?:jewel|joya|joyeria|jewelry|bisuteria)\b",
    "ropa": r"\b(?:streetwear|jacket|chaqueta|fashion|moda|ropa|denim|camiseta|tshirt|apparel|clothing)\b",
    "zapatos": r"\b(?:sneaker|zapato|calzado|shoe|shoes)\b",
    "bolsos": r"\b(?:bag|bolso|crossbody|cartera)\b",
    "tecnologia": r"\b(?:usb|phone|gadget|tech|keyboard|projector|electronics|laptop|gaming|rgb)\b",
    "automotriz": r"\b(?:truck|bumper|parachoques|4x4|off-road|auto|car|automotive|camioneta|led-light)\b",
    "cafe": r"\b(?:coffee|espresso|brew|latte|cafe|cold-brew)\b",
    "restaurant": r"\b(?:restaurant|food|menu|pizza|dish|comida|tacos|salad|dessert|meal)\b",
    "hogar": r"\b(?:home|decor|furniture|mueble|hogar|lamp|cocina|organizer)\b",
    "belleza": r"\b(?:beauty|belleza|skincare|cosmetics?|makeup|maquillaje|spa|jabones|jabon|jabón|soap|velas|vela|candles?|bath|bath-bomb|bath bomb|bombas de bano|bombas de baño|body-care|body care)\b",
    "plantas": r"\b(?:plant|planta|jardin|garden|maceta)\b",
    "manualidades": r"\b(?:craft|handmade|hilo|tela|abalorio|button|boton)\b",
    "seguridad-industrial": r"\b(?:safety glasses|protective eyewear|ppe|hard hat|safety helmet|work gloves|respirator|industrial safety)\b",
    "electrico": r"\b(?:electrical|electric|wire|wiring|cable|breaker|outlet|switch|conduit)\b",
    "plomeria": r"\b(?:plumbing|plumber|pvc|pipe|pipes|faucet|valve|drain)\b",
    "herramientas": r"\b(?:power tools|hand tools|tool|tools|drill|saw|grinder|wrench|hammer)\b",
    "tornilleria": r"\b(?:fastener|fasteners|bolt|bolts|screw|screws|anchor|anchors|nut|nuts|washer|washers)\b",
}


NICHE_TAXONOMY_LIST = (
    "general",
    "fashion",
    "jewelry",
    "beauty",
    "technology",
    "automotive",
    "motorcycle",
    "home_decor",
    "restaurant_food",
    "coffee",
    "bakery",
    "health_wellness",
    "clinic",
    "legal_services",
    "professional_services",
    "local_services",
    "home_services",
    "real_estate",
    "education",
    "digital_products",
    "b2b_saas",
    "industrial_supplier",
    "pets",
    "plants",
    "handmade",
    "art",
    "fitness",
    "luxury_goods",
)


NICHE_ALIASES = {
    "bisuteria": "jewelry",
    "bisutería": "jewelry",
    "joyeria": "jewelry",
    "joyería": "jewelry",
    "jewelry": "jewelry",
    "accessories": "fashion",
    "accesorios": "fashion",
    "ropa": "fashion",
    "moda": "fashion",
    "fashion": "fashion",
    "belleza": "beauty",
    "beauty": "beauty",
    "salon": "beauty",
    "salón": "beauty",
    "spa": "beauty",
    "hair": "beauty",
    "barber": "beauty",
    "barberia": "beauty",
    "barbería": "beauty",
    "cosmeticos": "beauty",
    "cosméticos": "beauty",
    "skincare": "beauty",
    "bath": "beauty",
    "body care": "beauty",
    "tech": "technology",
    "tecnologia": "technology",
    "tecnología": "technology",
    "electronics": "technology",
    "electronica": "technology",
    "electrónica": "technology",
    "auto": "automotive",
    "automotive": "automotive",
    "carros": "automotive",
    "cars": "automotive",
    "motos": "motorcycle",
    "motorcycle": "motorcycle",
    "hogar": "home_decor",
    "decoracion": "home_decor",
    "decoración": "home_decor",
    "restaurant": "restaurant_food",
    "restaurante": "restaurant_food",
    "comida": "restaurant_food",
    "food": "restaurant_food",
    "cafe": "coffee",
    "café": "coffee",
    "coffee": "coffee",
    "panaderia": "bakery",
    "panadería": "bakery",
    "bakery": "bakery",
    "salud": "health_wellness",
    "wellness": "health_wellness",
    "clinic": "clinic",
    "clinica": "clinic",
    "clínica": "clinic",
    "legal": "legal_services",
    "abogado": "legal_services",
    "abogados": "legal_services",
    "law": "legal_services",
    "servicios": "professional_services",
    "services": "professional_services",
    "real estate": "real_estate",
    "inmobiliaria": "real_estate",
    "course": "education",
    "curso": "education",
    "education": "education",
    "digital": "digital_products",
    "saas": "b2b_saas",
    "b2b": "b2b_saas",
    "industrial": "industrial_supplier",
    "mascotas": "pets",
    "pets": "pets",
    "plantas": "plants",
    "plants": "plants",
    "hecho a mano": "handmade",
    "handmade": "handmade",
    "arte": "art",
    "art": "art",
    "fitness": "fitness",
    "gym": "fitness",
    "gimnasio": "fitness",
    "entrenamiento": "fitness",
    "pet": "pets",
    "pet grooming": "pets",
    "grooming": "pets",
    "tutoria": "education",
    "tutoría": "education",
    "tutoring": "education",
    "fotografia": "professional_services",
    "fotografía": "professional_services",
    "photography": "professional_services",
    "limpieza": "home_services",
    "cleaning": "home_services",
    "jardineria": "home_services",
    "jardinería": "home_services",
    "landscaping": "home_services",
    "lujo": "luxury_goods",
    "luxury": "luxury_goods",
}


def normalize_image_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip().lower())


def normalize_niche(value: Any) -> str:
    text = str(value or "").strip().lower().replace("-", "_").replace(" ", "_")
    if text in NICHE_TAXONOMY_LIST:
        return text
    plain = str(value or "").strip().lower()
    for needle, niche in NICHE_ALIASES.items():
        if needle in plain:
            return niche
    return "general"


def infer_seed_profile(text: str, is_broad_marketplace: bool = False, is_jewelry: bool = False) -> str:
    value = normalize_image_text(text)
    if is_broad_marketplace:
        return "marketplace"
    if is_jewelry:
        return "jewelry"
    if re.search(r"\b(tipo amazon|como amazon|mega tienda|catalogo variado|productos variados|muchas categorias|todo tipo|de todo)\b", value):
        return "marketplace"
    if re.search(r"\b(restaurante|restaurant|menu|food|comida|pizza|bar|bakery)\b", value):
        return "restaurant"
    if re.search(r"\b(cafe|coffee|espresso|cold brew)\b", value):
        return "coffee"
    if re.search(r"\b(bisuteria|bijouterie|joyeria|jewelry|jewellery|collar|collares|pulsera|pulseras|arete|aretes|zarcillo|zarcillos|anillo|anillos|cadena|cadenas|dije|dijes|charm|charms|handmade accessories|handmade jewelry)\b", value):
        return "jewelry"
    if re.search(r"\b(bath|bano|baño|body care|beauty|belleza|skincare|cosmet|maquillaje|spa|jabon|jabón|jabones|soap|vela|velas|candle|candles|sales de bano|sales de baño)\b", value):
        return "beauty"
    if re.search(r"\b(parachoques|bumper|4x4|off road|off-road|repuestos|automotriz|camioneta|truck|auto accessories)\b", value):
        return "auto"
    if re.search(r"\b(ropa|fashion|moda|streetwear|sneaker|zapato|camiseta|clothing|boutique)\b", value):
        return "fashion"
    if re.search(r"\b(decor|hogar|home|furniture|muebles|interior|lampara|casa)\b", value):
        return "home"
    if re.search(r"\b(tech|tecnologia|gadget|electron|gaming|usb|phone|laptop|anime|juguete|toy|curioso|raro|inusual|cyberpunk)\b", value):
        return "tech"
    return "default"
