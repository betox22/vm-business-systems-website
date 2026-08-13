from __future__ import annotations

import json
import os
import re
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from .color_theory import build_palette
from .typography_theory import build_typography_scale
from .image_assets import attach_image_asset, stable_seed_image_url
from .models import AgentResult, ProjectState, WebsiteType
from .taxonomy import infer_seed_profile

try:
    from openai import AsyncOpenAI, OpenAI
except Exception:  # pragma: no cover - optional dependency guard
    AsyncOpenAI = None  # type: ignore[assignment]
    OpenAI = None  # type: ignore[assignment]


TEMPLATE_CATALOG: Dict[str, Dict[str, str]] = {
    "mega-marketplace": {
        "name": "Mega Marketplace",
        "websiteType": "marketplace",
        "catalogType": "dense_marketplace_catalog",
        "audience": "Shoppers comparing many categories, deals, novelty products and fast-buy options.",
    },
    "mega-retail-store": {
        "name": "Mega Retail Store",
        "websiteType": "online_store",
        "catalogType": "single_vendor_dense_catalog",
        "audience": "Shoppers browsing a broad catalog owned and fulfilled by one business.",
    },
    "listing-marketplace-pro": {
        "name": "Listing Marketplace",
        "websiteType": "marketplace",
        "catalogType": "listing_marketplace_catalog",
        "audience": "Buyers comparing listings, sellers, conditions, prices and availability.",
    },
    "premium-product-store": {
        "name": "Premium Product",
        "websiteType": "premium_product",
        "catalogType": "premium_editorial_catalog",
        "audience": "Buyers evaluating a focused high-value product line with strong visual proof.",
    },
    "fashion-drop-pro": {
        "name": "Fashion Drop",
        "websiteType": "fashion",
        "catalogType": "lookbook_collection_catalog",
        "audience": "Style-driven shoppers browsing collections, drops, looks and limited releases.",
    },
    "restaurant-food-business": {
        "name": "Restaurant Menu",
        "websiteType": "restaurant",
        "catalogType": "restaurant_menu_catalog",
        "audience": "Local diners checking menu, specials, hours, location and ordering options.",
    },
    "booking-appointment-pro": {
        "name": "Booking",
        "websiteType": "booking",
        "catalogType": "booking_menu_catalog",
        "audience": "Customers choosing services, availability and appointment options.",
    },
    "home-services-premium": {
        "name": "Local Services Premium",
        "websiteType": "home_services",
        "catalogType": "home_services_quote_catalog",
        "audience": "Local customers comparing service areas, proof, reviews and quote options.",
    },
    "local-services-pro-plus": {
        "name": "Local Services",
        "websiteType": "services",
        "catalogType": "service_area_catalog",
        "audience": "Customers who need a clear service offer, trust signals and contact path.",
    },
    "corporate-company-pro": {
        "name": "Corporate Company",
        "websiteType": "corporate",
        "catalogType": "company_services_catalog",
        "audience": "Business visitors evaluating services, process, credibility and contact fit.",
    },
    "lead-funnel-pro": {
        "name": "Lead Funnel",
        "websiteType": "lead_funnel",
        "catalogType": "lead_funnel_offer_catalog",
        "audience": "Prospects deciding on one clear offer through benefits, proof and lead capture.",
    },
    "digital-products-store": {
        "name": "Digital Products",
        "websiteType": "digital_products",
        "catalogType": "digital_offer_catalog",
        "audience": "Customers buying downloads, courses, templates, software or digital bundles.",
    },
    "real-estate-listings-pro": {
        "name": "Real Estate / Listings",
        "websiteType": "real_estate",
        "catalogType": "real_estate_listing_catalog",
        "audience": "Buyers or renters searching listings by location, specs, price and availability.",
    },
    "luxury-high-ticket-pro": {
        "name": "Luxury High Ticket",
        "websiteType": "luxury",
        "catalogType": "luxury_high_ticket_catalog",
        "audience": "High-intent buyers who need exclusivity, trust, details and private inquiry.",
    },
    "education-course-academy-pro": {
        "name": "Course Academy",
        "websiteType": "education",
        "catalogType": "education_course_catalog",
        "audience": "Students or professionals comparing courses, outcomes, modules and enrollment.",
    },
    "medical-wellness-clinic-pro": {
        "name": "Clinic / Wellness",
        "websiteType": "clinic",
        "catalogType": "medical_wellness_service_catalog",
        "audience": "Patients or wellness clients looking for treatments, trust, staff and booking.",
    },
    "legal-professional-services-pro": {
        "name": "Legal / Professional",
        "websiteType": "legal",
        "catalogType": "legal_professional_services_catalog",
        "audience": "Clients evaluating professional authority, services, trust and consultation.",
    },
    "b2b-saas-enterprise-pro": {
        "name": "B2B SaaS / Enterprise",
        "websiteType": "b2b",
        "catalogType": "b2b_solution_catalog",
        "audience": "Business decision-makers comparing software, automation, dashboards and ROI.",
    },
    "manufacturing-industrial-supplier-pro": {
        "name": "Industrial Supplier",
        "websiteType": "industrial",
        "catalogType": "industrial_supplier_catalog",
        "audience": "Procurement teams and operators comparing specs, availability and RFQ options.",
    },
}

TEMPLATE_ID_ALIASES: Dict[str, str] = {
    "apple-premium-product": "premium-product-store",
    "premium-product-showcase": "premium-product-store",
    "luxury-product-store": "premium-product-store",
}


def normalize_template_id(template_id: str | None) -> str:
    value = (template_id or "").strip()
    return TEMPLATE_ID_ALIASES.get(value, value)


def normalize_text(value: str | None) -> str:
    return re.sub(r"\s+", " ", (value or "").strip().lower())


def split_items(value: str | List[str] | None) -> List[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if not value:
        return []
    return [
        part.strip()
        for part in re.split(r",|\n|;|\by\b|\band\b", str(value), flags=re.IGNORECASE)
        if part.strip()
    ]


def suggests_jewelry_or_handmade_accessories(text: str) -> bool:
    if re.search(r"\b(accesorios? (para|de) (carros|autos|automotriz|automotrices|camionetas|motos|4x4))\b", text):
        return False
    # NOTE: bare "artesanal"/"hecho a mano" (handmade, with no jewelry-specific
    # word nearby) is intentionally excluded here — it is a generic craft
    # signal shared by many product types (soap, candles, pottery, jewelry),
    # not a jewelry indicator on its own. See suggests_handmade_beauty_or_home_goods
    # and suggests_focused_commerce for the generic handmade/craft handling.
    return bool(re.search(
        r"\b(bisuteria|bijouterie|joyeria|jewelry|jewellery|collar|collares|pulsera|pulseras|arete|aretes|zarcillo|zarcillos|anillo|anillos|cadena|cadenas|dije|dijes|charm|charms|handmade accessories|handmade jewelry)\b",
        text,
    ))


def suggests_handmade_beauty_or_home_goods(text: str) -> bool:
    return bool(re.search(
        r"\b(jabon|jabones|soap|bar soap|bath bomb|bath bombs|bomba de bano|bombas de bano|sales de bano|body butter|body scrub|exfoliante|locion|lotion|fragancia artesanal|home fragrance|aromaterapia|skincare artesanal)\b",
        text,
    ))


def suggests_focused_commerce(text: str) -> bool:
    return (
        suggests_jewelry_or_handmade_accessories(text)
        or suggests_handmade_beauty_or_home_goods(text)
        or bool(re.search(
            r"\b(ropa|fashion|moda|boutique|streetwear|zapatos|sneaker|apparel|clothing|beauty|belleza|skincare|cosmeticos|velas|candles|decoracion|ceramica|manualidades|crafts|productos artesanales|coleccion propia)\b",
            text,
        ))
    )


def suggests_broad_marketplace(text: str, product_count: int = 0) -> bool:
    explicit = bool(re.search(r"\b(amazon|tipo amazon|como amazon|mega tienda|mega store|mega marketplace)\b", text))
    explicit_marketplace = bool(re.search(r"\b(marketplace|market place|mercado online|multi vendedor|multi-vendedor|multi seller|multiseller)\b", text)) and not bool(
        re.search(r"\b(ebay|tipo ebay|como ebay|clasificados|classifieds|listados|listings|segunda mano|usado|used)\b", text)
    )
    cross_category = bool(re.search(r"(ropa|accesorios).*(carros|autos|juguetes|anime|gadgets)|(carros|autos|juguetes|anime|gadgets).*(ropa|accesorios)", text))
    broad_words = bool(re.search(r"\b(de todo|productos variados|catalogo grande|catalogo variado|muchas categorias|multi categoria|cosas raras|gadgets|anime|juguetes)\b", text))
    if explicit or explicit_marketplace or cross_category:
        return True
    if suggests_focused_commerce(text):
        return False
    # A small boutique can easily list 5-6 product lines (soap, candles, bath
    # bombs, gift sets, lotions) without being a broad multi-category catalog.
    # Only treat raw product count as a "mega catalog" signal once it is large
    # enough that it stops looking like a focused product range.
    return broad_words or product_count >= 10


def suggests_multi_vendor_marketplace(text: str) -> bool:
    return bool(re.search(
        r"\b(multi vendedor|multi-vendedor|multi seller|multiseller|vendedores externos|external sellers|third party sellers|otros vendedores|seller onboarding|vendor onboarding|vendor payout|payouts|comisiones a vendedores)\b",
        text,
    ))


IMAGE_SEED_FALLBACKS: List[Dict[str, str]] = [
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
        "match": r"streetwear|jacket|chaqueta|fashion|moda|ropa|sneaker|denim|cap",
        "url": "https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=900&q=82",
    },
    {
        "match": r"usb|phone|gadget|tech|keyboard|lamp|projector|electronics",
        "url": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=82",
    },
    {
        "match": r"truck|bumper|4x4|off-road|auto|car|automotive",
        "url": "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=82",
    },
    {
        "match": r"coffee|espresso|brew|latte|cafe",
        "url": "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=82",
    },
    {
        "match": r"restaurant|food|menu|pizza|dish|comida",
        "url": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=82",
    },
    {
        "match": r"home|decor|furniture|mueble|hogar|lamp",
        "url": "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=82",
    },
    {
        "match": r"beauty|skincare|cosmetic|belleza|makeup",
        "url": "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=82",
    },
]


def unsplash_seed_url(keyword: str) -> str:
    return stable_seed_image_url(keyword)


SEED_PRODUCT_LIBRARY: Dict[str, List[Dict[str, Any]]] = {
    "jewelry": [
        {"name": {"es": "Collar Aurora de Cristal", "en": "Aurora Crystal Necklace"}, "category": {"es": "Collares", "en": "Necklaces"}, "price": 42.0, "keyword": "handmade-crystal-necklace", "description": {"es": "Collar en capas con brillo delicado para uso diario y looks especiales. Ligero, listo para regalo y facil de combinar.", "en": "A luminous layered necklace designed for everyday shine and special looks. Lightweight, gift-ready, and easy to combine."}},
        {"name": {"es": "Pulsera Luna con Dijes Perla", "en": "Luna Pearl Charm Bracelet"}, "category": {"es": "Pulseras", "en": "Bracelets"}, "price": 34.5, "keyword": "pearl-charm-bracelet", "description": {"es": "Pulsera pulida con detalles tipo perla y ajuste comodo. Refina cualquier outfit sin sentirse demasiado formal.", "en": "A polished bracelet with soft pearl accents and adjustable comfort. It refines any outfit without feeling too formal."}},
        {"name": {"es": "Aretes Noir Statement", "en": "Noir Statement Earrings"}, "category": {"es": "Aretes", "en": "Earrings"}, "price": 29.99, "keyword": "statement-earrings", "description": {"es": "Aretes llamativos con acabado boutique para salidas, eventos y fotografia de producto de alto impacto.", "en": "Bold boutique-style earrings for nights out, events, and high-impact product photography."}},
        {"name": {"es": "Set de Anillos Sol Minimal", "en": "Sol Minimal Ring Set"}, "category": {"es": "Anillos", "en": "Rings"}, "price": 26.0, "keyword": "minimal-ring-set", "description": {"es": "Set de anillos apilables con acabado limpio. Se puede usar por separado o como combinacion completa.", "en": "A stackable ring set with a clean finish. Wear one piece alone or combine the full set."}},
        {"name": {"es": "Caja Regalo Celeste de Bisuteria", "en": "Celeste Jewelry Gift Box"}, "category": {"es": "Sets de regalo", "en": "Gift sets"}, "price": 58.0, "keyword": "jewelry-gift-box", "description": {"es": "Set coordinado listo para regalar con presentacion premium. Perfecto para fechas especiales y compras rapidas online.", "en": "A coordinated gift-ready set with premium presentation. Perfect for special dates and fast online gifting."}},
        {"name": {"es": "Charm Muse con Inicial Personalizada", "en": "Muse Custom Initial Charm"}, "category": {"es": "Piezas personalizadas", "en": "Custom pieces"}, "price": 21.5, "keyword": "custom-initial-charm", "description": {"es": "Charm personal para cadenas, pulseras o sets de regalo. Pequeno, memorable e ideal para recompra.", "en": "A personal charm for chains, bracelets, or gift sets. Small, memorable, and ideal for repeat purchases."}},
    ],
    "fashion": [
        {"name": {"es": "Chaqueta Street NeoFlex", "en": "NeoFlex Street Jacket"}, "category": {"es": "Abrigos", "en": "Outerwear"}, "price": 79.0, "keyword": "streetwear-jacket", "description": {"es": "Chaqueta ligera con energia urbana y comodidad diaria. Pieza protagonista para drops, combos y redes.", "en": "A lightweight jacket with urban energy and everyday comfort. A hero piece for drops, bundles, and social content."}},
        {"name": {"es": "Camiseta Grafica Core Oversized", "en": "Core Oversized Graphic Tee"}, "category": {"es": "Camisetas", "en": "T-shirts"}, "price": 32.0, "keyword": "oversized-graphic-tshirt", "description": {"es": "Camiseta oversized suave con presencia grafica fuerte. Facil de combinar y lista para drops por temporada.", "en": "A soft oversized tee with a strong graphic presence. Easy to style and ready for seasonal drops."}},
        {"name": {"es": "Bolso Cruzado Pulse Utility", "en": "Pulse Utility Crossbody"}, "category": {"es": "Accesorios", "en": "Accessories"}, "price": 46.5, "keyword": "utility-crossbody-bag", "description": {"es": "Bolso compacto para lo esencial con perfil moderno. Complementa outfits diarios sin perder utilidad.", "en": "Compact storage for essentials with a modern profile. It completes daily outfits without losing utility."}},
        {"name": {"es": "Jean Cargo Apex", "en": "Apex Cargo Denim"}, "category": {"es": "Denim", "en": "Denim"}, "price": 68.0, "keyword": "cargo-denim-jeans", "description": {"es": "Denim cargo estructurado con detalles utilitarios. Candidato a best seller para clientes que quieren estilo y funcion.", "en": "Structured cargo denim with utility details. A best-seller candidate for customers who want style and function."}},
        {"name": {"es": "Sneaker Orbit Low", "en": "Orbit Sneaker Low"}, "category": {"es": "Calzado", "en": "Footwear"}, "price": 89.0, "keyword": "modern-sneakers", "description": {"es": "Sneaker versatil con perfil limpio para movimiento diario. Completa looks casuales, streetwear y de viaje.", "en": "A versatile sneaker with a crisp profile for daily movement. It anchors casual, streetwear, and travel looks."}},
        {"name": {"es": "Gorra Nova Drop", "en": "Nova Drop Cap"}, "category": {"es": "Accesorios", "en": "Accessories"}, "price": 24.0, "keyword": "fashion-cap", "description": {"es": "Gorra de temporada con acabado limpio y facil de vender como complemento de carrito.", "en": "A seasonal cap with a clean finish and easy cart add-on potential."}},
    ],
    "auto": [
        {"name": {"es": "Parachoques Frontal TrailGuard 4x4", "en": "TrailGuard 4x4 Front Bumper"}, "category": {"es": "Parachoques", "en": "Bumpers"}, "price": 649.0, "keyword": "off-road-front-bumper", "description": {"es": "Proteccion frontal reforzada para camionetas 4x4, rutas off-road y estilo agresivo.", "en": "Heavy-duty front protection for 4x4 trucks, trail routes, and aggressive styling."}},
        {"name": {"es": "Kit Protector RaptorLine Skid Plate", "en": "RaptorLine Skid Plate Kit"}, "category": {"es": "Proteccion", "en": "Protection"}, "price": 289.0, "keyword": "truck-skid-plate", "description": {"es": "Proteccion inferior para terrenos rocosos y camionetas de trabajo. Mejora practica fuera del asfalto.", "en": "Underbody protection for rocky terrain and work-ready trucks. A practical upgrade beyond pavement."}},
        {"name": {"es": "Barra LED AeroMax", "en": "AeroMax LED Light Bar"}, "category": {"es": "Iluminacion", "en": "Lighting"}, "price": 159.99, "keyword": "led-light-bar-truck", "description": {"es": "Iluminacion potente para rutas nocturnas, trabajo y builds robustas. Agrega visibilidad y presencia.", "en": "High-output lighting for night trails, job sites, and rugged builds. It adds visibility and presence."}},
        {"name": {"es": "Set de Eslingas Overland Recovery", "en": "Overland Recovery Strap Set"}, "category": {"es": "Rescate", "en": "Recovery"}, "price": 74.5, "keyword": "off-road-recovery-strap", "description": {"es": "Eslingas y herrajes para seguridad de ruta y respuesta rapida. Complemento de alta confianza.", "en": "Recovery straps and hardware for trail safety and fast response. A high-trust add-on."}},
        {"name": {"es": "Extensiones Fender RidgeFit", "en": "RidgeFit Fender Flares"}, "category": {"es": "Exterior", "en": "Exterior"}, "price": 219.0, "keyword": "truck-fender-flares", "description": {"es": "Cobertura de guardafangos para rines anchos y presencia robusta. Ideal para filtrar por modelo.", "en": "Bold fender coverage for wider wheels and rugged stance. Ideal for model-based filtering."}},
        {"name": {"es": "Organizador de Cabina CabinVault", "en": "CabinVault Cargo Organizer"}, "category": {"es": "Interior", "en": "Interior"}, "price": 54.99, "keyword": "car-cargo-organizer", "description": {"es": "Organizador practico para herramientas, cables, emergencia y viaje. Util para subir ticket promedio.", "en": "A practical organizer for tools, cables, emergency kits, and travel gear. Good for raising order value."}},
    ],
    "tech": [
        {"name": {"es": "Base Magnetica HoloGrip", "en": "HoloGrip Magnetic Phone Stand"}, "category": {"es": "Accesorios moviles", "en": "Mobile accessories"}, "price": 19.99, "keyword": "magsafe-phone-stand", "description": {"es": "Base magnetica compacta para escritorio, videollamadas y uso manos libres. Pequena, util y facil de vender.", "en": "A compact magnetic stand for desk setups, video calls, and hands-free viewing. Small, useful, and easy to sell."}},
        {"name": {"es": "Cable USB-C Turbo PulseDrive", "en": "PulseDrive USB-C Turbo Cable"}, "category": {"es": "Carga", "en": "Charging"}, "price": 12.5, "keyword": "usb-c-fast-charging-cable", "description": {"es": "Cable trenzado de carga rapida para uso diario. Esencial confiable para compradores tech.", "en": "A braided fast-charge cable for daily use. A reliable essential for tech shoppers."}},
        {"name": {"es": "Mini Proyector Nebula", "en": "Mini Nebula Projector"}, "category": {"es": "Entretenimiento", "en": "Entertainment"}, "price": 129.0, "keyword": "mini-portable-projector", "description": {"es": "Proyector portatil para habitaciones, viajes y entretenimiento rapido. Producto visual fuerte.", "en": "A portable projector for rooms, trips, and quick entertainment setups. Strong visual product."}},
        {"name": {"es": "Set de Keycaps Retro Reactor", "en": "Retro Reactor Keycap Set"}, "category": {"es": "Gaming", "en": "Gaming"}, "price": 49.0, "keyword": "mechanical-keyboard-keycaps", "description": {"es": "Set limitado de keycaps con alto impacto visual para gamers, creadores y setups personalizados.", "en": "A limited-run keycap set with bright desk appeal for gamers, creators, and custom setups."}},
        {"name": {"es": "Lampara CyberLamp RGB", "en": "CyberLamp RGB Desk Light"}, "category": {"es": "Setup de escritorio", "en": "Desk setup"}, "price": 59.0, "keyword": "rgb-desk-lamp", "description": {"es": "Luz ambiental personalizable para escritorios y streaming. Agrega atmosfera y mejora el carrito.", "en": "Customizable ambient lighting for desks and streaming spaces. It adds mood and cart value."}},
        {"name": {"es": "Pack Stickers GlowPatch", "en": "GlowPatch Sticker Pack"}, "category": {"es": "Coleccionables", "en": "Collectibles"}, "price": 9.99, "keyword": "holographic-sticker-pack", "description": {"es": "Stickers estilo glow para laptops, botellas, carros y regalos. Ideal como add-on accesible.", "en": "Glow-style stickers for laptops, bottles, cars, and gifts. Ideal as an affordable add-on."}},
    ],
    "coffee": [
        {"name": {"es": "Blend Espresso Origen Unico", "en": "Single Origin Espresso Blend"}, "category": {"es": "Cafe en grano", "en": "Coffee beans"}, "price": 18.5, "keyword": "single-origin-coffee-beans", "description": {"es": "Blend balanceado con notas de cacao, cuerpo suave y final limpio. Cafe de calidad en casa.", "en": "A balanced blend with cocoa notes, smooth body, and a clean finish. Cafe-quality coffee at home."}},
        {"name": {"es": "Concentrado Cold Brew", "en": "Cold Brew Concentrate"}, "category": {"es": "Listo para tomar", "en": "Ready to drink"}, "price": 14.99, "keyword": "cold-brew-coffee", "description": {"es": "Concentrado suave para bebidas frias premium. Mezcla con agua, leche o siropes de autor.", "en": "A smooth concentrate for premium iced drinks. Mix with water, milk, or signature syrups."}},
        {"name": {"es": "Kit Pour Over Ceramico", "en": "Ceramic Pour-Over Kit"}, "category": {"es": "Equipo de preparacion", "en": "Brewing gear"}, "price": 38.0, "keyword": "ceramic-pour-over-coffee", "description": {"es": "Kit de preparacion para rituales de cafe lento y regalos de casa. Controla extraccion y aroma.", "en": "A brewing kit for slow coffee rituals and giftable home setups. Control extraction and aroma."}},
        {"name": {"es": "Pack Latte Avena Vainilla", "en": "Vanilla Oat Latte Pack"}, "category": {"es": "Combos", "en": "Bundles"}, "price": 24.0, "keyword": "vanilla-oat-latte", "description": {"es": "Combo latte con notas de vainilla y opcion sin lacteos. Disenado para recompra.", "en": "A latte bundle with vanilla notes and dairy-free flexibility. Designed for repeat orders."}},
        {"name": {"es": "Suscripcion House Roast", "en": "House Roast Subscription"}, "category": {"es": "Suscripciones", "en": "Subscriptions"}, "price": 29.0, "keyword": "coffee-subscription-box", "description": {"es": "Cafe recien tostado entregado de forma recurrente. Producto fuerte de retencion.", "en": "Fresh roasted coffee delivered on a recurring schedule. Strong retention product."}},
        {"name": {"es": "Flight de Cata Signature", "en": "Signature Tasting Flight"}, "category": {"es": "Sets de regalo", "en": "Gift sets"}, "price": 36.0, "keyword": "coffee-tasting-set", "description": {"es": "Caja de cata con varios perfiles de tueste y notas claras. Perfecta para regalar.", "en": "A tasting box with multiple roast profiles and clear flavor notes. Perfect for gifting."}},
    ],
    "restaurant": [
        {"name": {"es": "Tacos de Brisket Ahumado", "en": "Smoked Brisket Tacos"}, "category": {"es": "Principales", "en": "Mains"}, "price": 16.0, "keyword": "brisket-tacos", "description": {"es": "Brisket ahumado en tortillas calientes con toppings frescos y salsa de la casa.", "en": "Slow-smoked brisket in warm tortillas with fresh toppings and house sauce."}},
        {"name": {"es": "Ensalada Citrus Avocado", "en": "Citrus Avocado Salad"}, "category": {"es": "Entradas", "en": "Starters"}, "price": 12.5, "keyword": "avocado-citrus-salad", "description": {"es": "Verdes frescos, aguacate y citricos para una entrada ligera y visual.", "en": "Fresh greens, avocado, and citrus for a bright starter."}},
        {"name": {"es": "Flatbread de Hongos Trufados", "en": "Truffle Mushroom Flatbread"}, "category": {"es": "Especiales", "en": "Specials"}, "price": 18.0, "keyword": "mushroom-flatbread", "description": {"es": "Flatbread crujiente con hongos, queso fundido y aroma de trufa.", "en": "Crisp flatbread with mushrooms, melted cheese, and truffle aroma."}},
        {"name": {"es": "Refrescante de Lima de la Casa", "en": "House Lime Refresher"}, "category": {"es": "Bebidas", "en": "Drinks"}, "price": 6.5, "keyword": "lime-mocktail", "description": {"es": "Bebida de la casa con lima, hierbas y final limpio.", "en": "A bright house drink with lime, herbs, and a clean finish."}},
        {"name": {"es": "Postre del Chef en Jar", "en": "Chef's Dessert Jar"}, "category": {"es": "Postres", "en": "Desserts"}, "price": 8.0, "keyword": "dessert-jar", "description": {"es": "Postre en capas pensado para delivery y fotos atractivas.", "en": "A layered dessert jar built for delivery stability and strong photos."}},
        {"name": {"es": "Combo Familiar Box", "en": "Family Combo Box"}, "category": {"es": "Combos", "en": "Combos"}, "price": 42.0, "keyword": "family-meal-box", "description": {"es": "Caja para compartir con principales, acompanantes y bebidas.", "en": "A shareable meal box with mains, sides, and drinks."}},
    ],
    "beauty": [
        {"name": {"es": "Set de Toallas de Bano Spa", "en": "Spa Bath Towel Set"}, "category": {"es": "Toallas", "en": "Towels"}, "price": 32.0, "keyword": "spa-bath-towel-set", "description": {"es": "Set de toallas suaves de alta absorcion pensado para rutinas de bano diarias y regalo.", "en": "A soft, highly absorbent towel set built for daily bath routines and gifting."}},
        {"name": {"es": "Barra de Jabon Artesanal", "en": "Handmade Bath Soap Bar"}, "category": {"es": "Jabones", "en": "Soaps"}, "price": 9.5, "keyword": "handmade-soap-bar", "description": {"es": "Jabon artesanal con aroma suave, ideal para uso diario o sets de regalo de bano.", "en": "A handmade soap bar with a gentle scent, ideal for daily use or bath gift sets."}},
        {"name": {"es": "Kit de Sales de Bano Relajantes", "en": "Relaxing Bath Salts Kit"}, "category": {"es": "Cuidado de bano", "en": "Bath care"}, "price": 18.0, "keyword": "bath-salts-jar", "description": {"es": "Sales de bano para relajar musculos y crear una rutina de autocuidado en casa.", "en": "Bath salts designed to soothe muscles and build a relaxing self-care routine at home."}},
        {"name": {"es": "Esponja Natural de Bano", "en": "Natural Bath Sponge"}, "category": {"es": "Accesorios de bano", "en": "Bath accessories"}, "price": 12.0, "keyword": "natural-bath-sponge", "description": {"es": "Esponja suave para exfoliar y limpiar la piel durante la ducha o el bano.", "en": "A gentle sponge for exfoliating and cleansing skin during a shower or bath."}},
        {"name": {"es": "Aceite Corporal Hidratante", "en": "Hydrating Body Oil"}, "category": {"es": "Cuidado corporal", "en": "Body care"}, "price": 24.0, "keyword": "body-oil-bottle", "description": {"es": "Aceite corporal ligero para hidratar la piel despues del bano o la ducha.", "en": "A lightweight body oil to hydrate skin right after a bath or shower."}},
        {"name": {"es": "Bomba de Bano Aromatica", "en": "Aromatic Bath Bomb Set"}, "category": {"es": "Sets de regalo", "en": "Gift sets"}, "price": 21.0, "keyword": "bath-bomb-set", "description": {"es": "Set de bombas de bano aromaticas listas para regalar o para una rutina de relajacion.", "en": "A set of aromatic bath bombs ready for gifting or a relaxing self-care night."}},
    ],
    "home": [
        {"name": {"es": "Lampara de Mesa Nordica", "en": "Nordic Table Lamp"}, "category": {"es": "Iluminacion", "en": "Lighting"}, "price": 54.0, "keyword": "nordic-table-lamp", "description": {"es": "Lampara de mesa con lineas simples para salas, dormitorios y espacios de lectura.", "en": "A table lamp with clean lines for living rooms, bedrooms, and reading nooks."}},
        {"name": {"es": "Set de Velas Aromaticas", "en": "Aromatic Candle Set"}, "category": {"es": "Decor", "en": "Decor"}, "price": 28.0, "keyword": "aromatic-candle-set", "description": {"es": "Velas aromaticas para ambientar cualquier espacio del hogar.", "en": "Aromatic candles that set the mood in any room of the home."}},
        {"name": {"es": "Manta de Punto Suave", "en": "Soft Knit Throw Blanket"}, "category": {"es": "Textiles", "en": "Textiles"}, "price": 46.0, "keyword": "knit-throw-blanket", "description": {"es": "Manta tejida suave para sofa o cama, ideal para dias frios.", "en": "A soft knit throw for the sofa or bed, perfect for cold days."}},
        {"name": {"es": "Set de Macetas Ceramicas", "en": "Ceramic Planter Set"}, "category": {"es": "Jardin interior", "en": "Indoor garden"}, "price": 34.0, "keyword": "ceramic-planter-set", "description": {"es": "Macetas ceramicas minimalistas para plantas de interior.", "en": "Minimalist ceramic planters for indoor plants."}},
        {"name": {"es": "Marco de Fotos Minimalista", "en": "Minimalist Photo Frame Set"}, "category": {"es": "Decor de pared", "en": "Wall decor"}, "price": 22.0, "keyword": "minimalist-photo-frames", "description": {"es": "Set de marcos limpios para fotos y recuerdos familiares.", "en": "A clean frame set for photos and family memories."}},
        {"name": {"es": "Difusor de Aromas Ceramico", "en": "Ceramic Aroma Diffuser"}, "category": {"es": "Ambiente", "en": "Ambience"}, "price": 39.0, "keyword": "ceramic-aroma-diffuser", "description": {"es": "Difusor ceramico para aceites esenciales y ambientes relajantes en casa.", "en": "A ceramic diffuser for essential oils and a relaxing home atmosphere."}},
    ],
    "default": [
        {"name": {"es": "Bolso Tote Studio", "en": "Studio Carry Tote"}, "category": {"es": "Accesorios", "en": "Accessories"}, "price": 39.0, "keyword": "minimal-canvas-tote-bag", "description": {"es": "Bolso tote limpio para uso diario, con asas resistentes y apariencia retail pulida.", "en": "A clean everyday tote with sturdy handles and a polished retail look."}},
        {"name": {"es": "Bandeja Ceramica de Escritorio", "en": "Ceramic Desk Tray"}, "category": {"es": "Oficina en casa", "en": "Home office"}, "price": 28.0, "keyword": "ceramic-desk-tray", "description": {"es": "Bandeja refinada para llaves, bisuteria, papeleria o esenciales diarios.", "en": "A refined tray for keys, jewelry, stationery, or daily essentials."}},
        {"name": {"es": "Pouch de Lino Soft", "en": "Soft Linen Pouch"}, "category": {"es": "Organizacion", "en": "Storage"}, "price": 24.0, "keyword": "linen-zip-pouch", "description": {"es": "Pouch suave con cierre para viaje, cosmeticos, accesorios o herramientas pequenas.", "en": "A soft zip pouch for travel, cosmetics, accessories, or small tools."}},
        {"name": {"es": "Set de Tarjetas Regalo Matte", "en": "Matte Gift Card Set"}, "category": {"es": "Detalles de regalo", "en": "Gift details"}, "price": 18.0, "keyword": "minimal-gift-card-set", "description": {"es": "Set de tarjetas sobrias para envoltorios, notas de agradecimiento y pedidos curados.", "en": "A tasteful card set for wrapping, thank-you notes, and curated orders."}},
        {"name": {"es": "Base de Exhibicion Moderna", "en": "Modern Display Stand"}, "category": {"es": "Exhibicion", "en": "Display"}, "price": 34.0, "keyword": "minimal-product-display-stand", "description": {"es": "Base compacta para exhibir productos pequenos, muestras o piezas destacadas.", "en": "A compact display stand for showcasing small products, samples, or featured pieces."}},
        {"name": {"es": "Kit de Cuidado Signature", "en": "Signature Care Kit"}, "category": {"es": "Cuidado", "en": "Care"}, "price": 22.0, "keyword": "product-care-kit", "description": {"es": "Kit simple para mantener productos limpios, guardados y listos para usar.", "en": "A simple care kit for keeping products clean, stored, and ready to use."}},
    ],
}


def localized_seed(value: Dict[str, str], language: str) -> str:
    return value.get(language) or value.get("es") or value.get("en") or next(iter(value.values()), "")


def generate_ai_seed_catalog(context: str, language: str, count: int = 6) -> Optional[List[Dict[str, Any]]]:
    """LLM fallback for niches outside the hand-authored SEED_PRODUCT_LIBRARY.

    infer_seed_profile() only recognizes a handful of hardcoded categories
    (jewelry, fashion, coffee, auto, tech, beauty, home, restaurant,
    marketplace). Anything else -- boat parts, fishing gear, extreme sports
    gear, or literally whatever the client actually said -- used to collapse
    into a generic "default" filler catalog (tote bags, desk trays) with no
    relation to the real business. This asks the model directly for a small
    set of realistic sample products for the client's actual niche, so the
    placeholder catalog is at least topically relevant instead of random.

    This intentionally uses the SYNC OpenAI client and stays a plain
    function (not async), even though it is called from async agent code.
    semantic_seed_catalog() is called from several places across
    agents.py/ai_site_planner.py/main.py that are not all async; threading
    async through that whole chain is a much bigger, riskier change than a
    single occasional blocking call on the rare "unmatched niche" path (most
    requests hit a known category and never reach this function at all).

    Returns None (never raises) if no API key is configured, the openai
    package is unavailable, or the call fails for any reason -- callers must
    fall back to the static default library with zero behavior change.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or not OpenAI or not context.strip():
        return None
    try:
        client = OpenAI(api_key=api_key, timeout=12.0)
        model = os.getenv("OPENAI_SEED_CATALOG_MODEL") or os.getenv("OPENAI_MODEL") or "gpt-4o-mini"
        response = client.chat.completions.create(
            model=model,
            temperature=0.4,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You write short sample product/service catalogs for a website "
                        "builder. Given a business description in any language and any "
                        "niche -- it can be anything: boat parts, fishing gear, extreme "
                        "sports equipment, car accessories, bathroom fixtures, literally "
                        "anything -- return realistic, specific sample items for THAT "
                        "niche. Never fall back to generic filler like 'featured item' or "
                        "unrelated products. Reply in the same language as the business "
                        "description. Return strict JSON: {\"items\": [{\"name\": str, "
                        "\"category\": str, \"description\": str, \"price\": number, "
                        "\"image_search_query\": \"2-4 English keywords for stock photo "
                        "search\"}]}"
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Business description: {context.strip()[:800]}\n"
                        f"Language: {language}\nReturn exactly {count} items."
                    ),
                },
            ],
        )
        raw = response.choices[0].message.content or "{}"
        parsed = json.loads(raw)
        items = parsed.get("items")
        if not isinstance(items, list) or not items:
            return None
        catalog: List[Dict[str, Any]] = []
        for index, item in enumerate(items[:count]):
            if not isinstance(item, dict) or not item.get("name"):
                continue
            price = float(item.get("price") or 0) or 29.0
            catalog.append({
                "id": f"prod_{index + 1:03d}",
                "sku": f"AI-{index + 1:03d}",
                "name": str(item.get("name"))[:90],
                "description": str(item.get("description") or "")[:400],
                "category": str(item.get("category") or "")[:60],
                "price_type": "fixed",
                "price": price,
                "price_amount": price,
                "currency": "USD",
                "price_label": f"USD {price:.2f}",
                "rating": round(4.5 + (index % 4) * 0.1, 1),
                "badge": "Best Seller" if index == 0 else "New" if index == 1 else "Featured",
                "imageSearchQuery": str(item.get("image_search_query") or item.get("name")),
                "is_active": True,
                "is_featured": index < 4,
                "sort_order": index,
            })
        return catalog or None
    except Exception:
        return None


def semantic_seed_catalog(state: ProjectState, user_input: str, count: int = 6) -> List[Dict[str, Any]]:
    language = state.selectedLanguage if state.selectedLanguage in {"en", "es"} else "en"
    context = " ".join([
        user_input,
        state.businessName or "",
        state.businessDescription or "",
        state.industry or "",
        " ".join(state.servicesProducts),
        state.preferredTone or "",
        state.preferredColors or "",
    ])
    template_records = TEMPLATE_CATALOG.items() if isinstance(TEMPLATE_CATALOG, dict) else enumerate(TEMPLATE_CATALOG)
    for template_id, template in template_records:
        if not isinstance(template, dict):
            continue
        for internal_token in [template_id, template.get("id"), template.get("catalogType"), template.get("websiteType"), template.get("name")]:
            if internal_token:
                context = re.sub(re.escape(str(internal_token)), " ", context, flags=re.IGNORECASE)
    profile = infer_seed_profile(context)
    if profile == "marketplace":
        products = [
            SEED_PRODUCT_LIBRARY["tech"][0],
            SEED_PRODUCT_LIBRARY["fashion"][0],
            SEED_PRODUCT_LIBRARY["auto"][5],
            SEED_PRODUCT_LIBRARY["tech"][2],
            SEED_PRODUCT_LIBRARY["jewelry"][4],
            SEED_PRODUCT_LIBRARY["tech"][5],
        ][:count]
    elif profile == "default":
        # infer_seed_profile() only recognizes a handful of hardcoded niches.
        # Anything else used to fall straight into the generic "default"
        # filler (tote bags, desk trays) with no relation to the real
        # business. Try the LLM first so the client's actual words (boat
        # parts, fishing gear, whatever they said) drive the sample catalog;
        # fall back to the static default library if AI is unavailable.
        ai_catalog = generate_ai_seed_catalog(context, state.selectedLanguage or language, count)
        if ai_catalog:
            return [attach_image_asset(item, context=context) for item in ai_catalog]
        products = SEED_PRODUCT_LIBRARY["default"][:count]
    else:
        products = SEED_PRODUCT_LIBRARY.get(profile, SEED_PRODUCT_LIBRARY["default"])[:count]
    catalog: List[Dict[str, Any]] = []
    for index, product in enumerate(products):
        price = float(product["price"])
        item = {
            "id": f"prod_{index + 1:03d}",
            "sku": f"{profile[:3].upper()}-{index + 1:03d}",
            "name": localized_seed(product["name"], language),
            "description": localized_seed(product["description"], language),
            "category": localized_seed(product["category"], language),
            "price_type": "fixed",
            "price": price,
            "price_amount": price,
            "currency": "USD",
            "price_label": f"USD {price:.2f}",
            "rating": round(4.5 + (index % 4) * 0.1, 1),
            "badge": "Best Seller" if index == 0 else "New" if index == 1 else "Featured",
            "imageSearchQuery": product["keyword"],
            "image_url": unsplash_seed_url(product["keyword"]),
            "is_active": True,
            "is_featured": index < 4,
            "sort_order": index,
        }
        catalog.append(attach_image_asset(item, context=context))
    return catalog


def state_is_commerce_seed_target(state: ProjectState, user_input: str = "") -> bool:
    commerce_types = {"marketplace", "online_store", "premium_product", "restaurant", "fashion", "digital_products", "luxury"}
    if state.websiteType in commerce_types:
        return True
    text = normalize_text(" ".join([
        user_input,
        state.businessDescription or "",
        state.industry or "",
        " ".join(state.servicesProducts),
        state.selectedTemplateId or "",
        state.catalogType or "",
        state.salesFlow or "",
    ]))
    if re.search(r"\b(legal|abogado|clinic|clinica|booking|cita|b2b|industrial|consultoria|service_area|home_services)\b", text):
        return False
    return bool(re.search(r"\b(tienda|store|shop|marketplace|catalogo|producto|productos|vender|comprar|online|ecommerce|restaurant|menu)\b", text))


class BaseAgent:
    name = "base"

    async def run(self, state: ProjectState, user_input: str) -> AgentResult:
        raise NotImplementedError


class IntakeExtractionAgent(BaseAgent):
    name = "intake_extractor"

    async def run(self, state: ProjectState, user_input: str) -> AgentResult:
        text = user_input.strip()
        lower = normalize_text(text)
        updates: Dict[str, object] = {}

        if any(
            phrase in lower
            for phrase in [
                "sell online",
                "vender online",
                "vender productos online",
                "tienda online",
                "online store",
                "ecommerce",
            ]
        ):
            updates["websiteIntent"] = state.websiteIntent or "sell products online"
            updates["salesFlow"] = state.salesFlow or "online_sales"
        elif any(phrase in lower for phrase in ["show catalog", "mostrar catalogo", "mostrar catalogo", "catalogo"]):
            updates["websiteIntent"] = state.websiteIntent or "show catalog"
            updates["salesFlow"] = state.salesFlow or "catalog_or_quotes"
        elif any(phrase in lower for phrase in ["booking", "reservas", "citas", "appointments"]):
            updates["websiteIntent"] = state.websiteIntent or "booking"
            updates["salesFlow"] = state.salesFlow or "booking"
        elif any(phrase in lower for phrase in ["business info", "presentar empresa", "company site", "pagina de empresa"]):
            updates["websiteIntent"] = state.websiteIntent or "business information site"

        name_match = re.search(
            r"(?:se llama|se llamara|se llamará|llamada|called|name is|nombre es|sera|será)\s+([a-z0-9 '&.-]{2,50}?)(?:\s+(?:vendo|vende|sell|con|ubicad[ao]|en usa|desde)|[.,;\n]|$)",
            text,
            re.IGNORECASE,
        )
        if name_match and not state.businessName:
            updates["businessName"] = name_match.group(1).strip(" .")

        if not state.businessDescription and len(text) > 40:
            updates["businessDescription"] = text
            updates["websiteIntent"] = updates.get("websiteIntent") or state.websiteIntent or text[:180]

        if "cyberpunk" in lower or "neon" in lower:
            updates["preferredColors"] = "cyberpunk neon"
            updates["preferredTone"] = state.preferredTone or "bold, futuristic, high-energy"
        elif "minimal" in lower or "limpio" in lower:
            updates["preferredColors"] = "minimal clean"

        if any(word in lower for word in ["usa", "united states", "estados unidos"]):
            updates["location"] = state.location or "United States"

        products = split_items(state.servicesProducts)
        candidate_products = []
        product_match = re.search(
            r"(?:vendo|vender|sell|productos?|catalogo|catálogo)\s+(.{8,220})",
            text,
            re.IGNORECASE,
        )
        if product_match:
            candidate_products = split_items(product_match.group(1))
        if candidate_products and len(products) < 3:
            updates["servicesProducts"] = candidate_products[:12]

        if any(word in lower for word in ["online", "ecommerce", "tienda", "marketplace", "vender"]):
            updates["salesFlow"] = "online_sales"
            updates["websiteIntent"] = updates.get("websiteIntent") or state.websiteIntent or "sell products online"

        return AgentResult(
            agentName=self.name,
            updates=updates,
            reasoningSummary="Extracted usable business fields from the natural-language intake.",
            confidence=0.72,
        )


class StrategyAgent(BaseAgent):
    name = "strategist"

    async def run(self, state: ProjectState, user_input: str) -> AgentResult:
        text = normalize_text(" ".join([
            user_input,
            state.websiteIntent or "",
            state.businessDescription or "",
            state.industry or "",
            " ".join(state.servicesProducts),
            state.preferredTone or "",
            state.preferredColors or "",
            state.salesFlow or "",
        ]))

        ai_template_id = normalize_template_id(state.primaryOfferingCategory)
        if ai_template_id in TEMPLATE_CATALOG:
            template_id = ai_template_id
            reason = "AI planner primary offering category"
        else:
            template_id, reason = self._select_template_id(text, len(state.servicesProducts), state.selectedTemplateId)
        template = TEMPLATE_CATALOG[template_id]
        website_type = template["websiteType"]
        template_name = template["name"]
        catalog_type = template["catalogType"]
        target_audience = state.targetAudience or template["audience"]

        return AgentResult(
            agentName=self.name,
            updates={
                "websiteType": website_type,
                "selectedTemplateId": template_id,
                "selectedTemplateName": template_name,
                "catalogType": catalog_type,
                "targetAudience": target_audience,
            },
            reasoningSummary=f"Selected {template_name}: {reason}",
            confidence=0.88,
        )

    def _select_template_id(self, text: str, product_count: int, existing_template_id: str | None) -> tuple[str, str]:
        scores = {template_id: 0 for template_id in TEMPLATE_CATALOG}
        reasons: Dict[str, List[str]] = {template_id: [] for template_id in TEMPLATE_CATALOG}

        def add(template_id: str, points: int, reason: str) -> None:
            template_id = normalize_template_id(template_id)
            if template_id not in TEMPLATE_CATALOG:
                return
            scores[template_id] += points
            reasons[template_id].append(reason)

        existing_template_id = normalize_template_id(existing_template_id)
        if existing_template_id in TEMPLATE_CATALOG:
            add(existing_template_id, 18, "existing valid template signal")

        multi_vendor_marketplace = suggests_multi_vendor_marketplace(text)
        broad_marketplace = suggests_broad_marketplace(text, product_count)

        if multi_vendor_marketplace:
            add("mega-marketplace", 150, "broad multi-category catalog")
        elif broad_marketplace:
            add("mega-retail-store", 150, "broad single-owner retail catalog")

        if re.search(r"\b(online_sales|sell online|vender online|tienda online|online store|ecommerce)\b", text):
            add("mega-retail-store", 78, "online selling intent")
        if re.search(r"\b(show catalog|mostrar catalogo|catalog_or_quotes|catalogo|catálogo)\b", text):
            add("mega-retail-store", 58, "catalog browsing intent")

        if re.search(r"\b(ebay|listing|listados|vendedores|seller|subasta|auction|usado|condition)\b", text):
            add("listing-marketplace-pro", 120, "listing and seller comparison flow")

        if suggests_jewelry_or_handmade_accessories(text) and not broad_marketplace:
            add("fashion-drop-pro", 125, "focused jewelry and handmade accessory store")

        if suggests_handmade_beauty_or_home_goods(text) and not broad_marketplace:
            add("premium-product-store", 118, "handmade beauty/home-craft boutique (soap, candles, bath goods)")

        if re.search(r"\b(ropa|fashion|moda|boutique|streetwear|zapatos|sneaker|apparel|clothing|drop|lookbook)\b", text) and not broad_marketplace:
            add("fashion-drop-pro", 95, "fashion and collection browsing")

        focused_product = re.search(
            r"\b(un producto|solo un producto|una linea|linea de|linea premium|producto premium|flagship|high ticket|exclusivo|parachoques|modelo)\b",
            text,
        )
        if focused_product and scores["mega-marketplace"] < 100:
            add("premium-product-store", 118, "focused premium product line")

        if re.search(r"\b(lujo|luxury|joyeria|jewelry|reloj|watch|arte|coleccionable|carro de lujo|private viewing)\b", text):
            add("luxury-high-ticket-pro", 120, "high-ticket private-showroom offer")

        if re.search(r"\b(restaurante|restaurant|menu|comida|food|pizza|burger|cafe|bar|plato|pedido)\b", text):
            add("restaurant-food-business", 130, "restaurant and menu flow")

        if re.search(r"\b(cita|booking|reserva|agenda|appointment|barber|salon|calendario)\b", text):
            add("booking-appointment-pro", 125, "appointment booking flow")

        if re.search(r"\b(cursos?|courses?|academy|academia|clases?|coaching|bootcamp|training|formacion)\b", text):
            add("education-course-academy-pro", 124, "course and education offer")

        if re.search(
            r"\b(digital|download|descarga|ebook|software|membresia|membership)\b|"
            r"\b(digital templates|templates digitales|plantillas digitales)\b",
            text,
        ):
            add("digital-products-store", 118, "digital product delivery")

        if re.search(r"\b(real estate|inmueble|propiedad|casa|apartamento|terreno|listing|renta|alquiler)\b", text):
            add("real-estate-listings-pro", 124, "search-first listings")

        if re.search(r"\b(clinica|clinic|medico|medical|dental|wellness|terapia|estetica|treatment)\b", text):
            add("medical-wellness-clinic-pro", 122, "clinic trust and appointment flow")

        if re.search(r"\b(abogado|legal|law|contador|tax|impuesto|consultoria|insurance|seguro|asesoria)\b", text):
            add("legal-professional-services-pro", 135, "professional authority and consultation")

        if re.search(r"\b(saas|software|enterprise|b2b|automatizacion|automation|dashboard|crm|erp|api|integraciones|plataforma)\b", text):
            add("b2b-saas-enterprise-pro", 122, "B2B software decision flow")

        if re.search(r"\b(fabrica|manufactura|industrial|maquinaria|repuestos industriales|herramientas|supplier|bulk|rfq)\b", text):
            add("manufacturing-industrial-supplier-pro", 122, "industrial supplier RFQ flow")

        if re.search(r"\b(servicio|service|contractor|limpieza|repair|reparacion|roofing|cotizacion|cotización|quote)\b", text):
            add("local-services-pro-plus", 95, "service quote flow")

        if re.search(r"\b(plomeria|electricista|landscaping|construccion|hvac|home service|casa)\b", text):
            add("home-services-premium", 115, "local home-service trust flow")

        if re.search(r"\b(empresa|company|corporate|nosotros|servicios profesionales|consulting firm)\b", text):
            add("corporate-company-pro", 90, "company presentation flow")

        if re.search(r"\b(landing|lead|captar|conversion|campana|campaña|oferta unica)\b", text):
            add("lead-funnel-pro", 95, "single-offer lead capture")

        if max(scores.values()) <= 0:
            return "corporate-company-pro", "not enough commerce-specific context, using a professional company structure"

        winner = max(scores, key=lambda template_id: scores[template_id])
        return winner, "; ".join(reasons[winner][:3]) or "best scoring strategy"


class ArtDirectorAgent(BaseAgent):
    name = "art_director"

    async def run(self, state: ProjectState, user_input: str) -> AgentResult:
        text = normalize_text(" ".join([user_input, state.preferredColors or "", state.preferredTone or ""]))

        if any(term in text for term in ["cyberpunk", "neon", "futurista"]):
            palette_style = "tecnologico"
            typography = {"heading": "Orbitron", "body": "Inter"}
            direction = "Cyberpunk neon marketplace with high-contrast commerce UI."
        elif any(term in text for term in ["luxury", "lujo", "premium", "elegante"]):
            palette_style = "elegante"
            typography = {"heading": "Playfair Display", "body": "Inter"}
            direction = "Premium editorial visual system."
        elif any(term in text for term in ["organic", "organico", "natural", "earth", "tierra"]):
            palette_style = "organico"
            typography = {"heading": "Fraunces", "body": "Inter"}
            direction = "Organic visual system with grounded, natural harmony."
        elif any(term in text for term in ["warm", "calido", "welcoming", "acogedor", "terracotta"]):
            palette_style = "calido"
            typography = {"heading": "Manrope", "body": "Inter"}
            direction = "Warm visual system with an approachable split-complementary harmony."
        else:
            palette_style = "elegante"
            typography = {"heading": "Inter", "body": "Inter"}
            direction = "Clean commercial UI with a niche-aware, accessible palette."

        niche_hint = " ".join(filter(None, [
            state.industry or "",
            state.businessDescription or "",
            " ".join(state.servicesProducts),
        ]))
        colors = build_palette(
            state.colorProvenance.anchorColor,
            palette_style,
            niche_hint,
        )
        typography_scale = build_typography_scale(palette_style)

        return AgentResult(
            agentName=self.name,
            updates={"colors": colors, "typography": typography, "typographyScale": typography_scale},
            reasoningSummary=direction,
            confidence=0.8,
        )


class CopywriterAgent(BaseAgent):
    name = "copywriter"

    async def run(self, state: ProjectState, user_input: str) -> AgentResult:
        name = state.businessName or "Your Brand"
        language = state.selectedLanguage
        template = state.selectedTemplateName or "website"

        if language == "es":
            if state.websiteType == "marketplace":
                headline = f"{name}: un marketplace para descubrir productos fuera de lo común"
                subheadline = "Explora categorías, ofertas y hallazgos seleccionados en una experiencia rápida, visual y lista para comprar."
                cta = "Explorar productos"
            elif state.websiteType == "premium_product":
                headline = f"{name}: presentación premium para una oferta que merece atención"
                subheadline = "Una experiencia visual refinada para explicar valor, detalles, modelos y confianza antes de comprar."
                cta = "Ver colección"
            elif state.websiteType == "fashion":
                headline = f"{name}: colecciones con estilo, drops y piezas listas para destacar"
                subheadline = "Una tienda visual para presentar looks, novedades, categorías y compras rápidas desde cualquier dispositivo."
                cta = "Ver colección"
            elif state.websiteType == "restaurant":
                headline = f"{name}: menú claro, visual y listo para recibir pedidos"
                subheadline = "Platos, especiales, horarios y contacto organizados para que el cliente decida rápido."
                cta = "Ver menú"
            elif state.websiteType == "booking":
                headline = f"{name}: servicios fáciles de explorar y reservar"
                subheadline = "Presenta servicios, disponibilidad, confianza y un camino directo para agendar."
                cta = "Reservar ahora"
            elif state.websiteType in ["services", "home_services", "legal", "clinic"]:
                headline = f"{name}: servicios profesionales con confianza desde el primer vistazo"
                subheadline = "Una página clara para explicar lo que haces, demostrar credibilidad y convertir visitas en solicitudes."
                cta = "Solicitar información"
            elif state.websiteType in ["b2b", "industrial"]:
                headline = f"{name}: soluciones claras para compradores que necesitan decidir con confianza"
                subheadline = "Catálogo, especificaciones, beneficios y llamadas a acción pensadas para ventas consultivas."
                cta = "Solicitar cotización"
            elif state.websiteType == "digital_products":
                headline = f"{name}: productos digitales listos para vender y entregar"
                subheadline = "Presenta bundles, módulos, beneficios y acceso inmediato con una experiencia simple de compra."
                cta = "Ver productos"
            else:
                headline = f"{name}: una presencia digital clara y profesional"
                subheadline = "Contenido, secciones y llamados a la acción pensados para convertir visitantes en clientes."
                cta = "Empezar"
        else:
            if state.websiteType == "marketplace":
                headline = f"{name}: a marketplace for uncommon finds"
                subheadline = "Browse categories, deals and curated products in a fast, visual shopping experience."
                cta = "Explore products"
            elif state.websiteType == "premium_product":
                headline = f"{name}: a premium showcase for a focused offer"
                subheadline = "A refined product experience built around value, details, models and buyer confidence."
                cta = "View collection"
            elif state.websiteType == "fashion":
                headline = f"{name}: style-led collections, drops and standout pieces"
                subheadline = "A visual store built for looks, new arrivals, categories and fast mobile shopping."
                cta = "View collection"
            elif state.websiteType == "restaurant":
                headline = f"{name}: a clear visual menu ready for orders"
                subheadline = "Dishes, specials, hours and contact details organized so customers can decide fast."
                cta = "View menu"
            elif state.websiteType == "booking":
                headline = f"{name}: services made easy to explore and book"
                subheadline = "Show services, availability, trust signals and a direct path to appointments."
                cta = "Book now"
            elif state.websiteType in ["services", "home_services", "legal", "clinic"]:
                headline = f"{name}: professional services with trust from the first view"
                subheadline = "A clear page for explaining your offer, proving credibility and turning visits into requests."
                cta = "Request info"
            elif state.websiteType in ["b2b", "industrial"]:
                headline = f"{name}: clear solutions for buyers who need confidence"
                subheadline = "Catalog, specs, benefits and calls to action built for consultative sales."
                cta = "Request quote"
            elif state.websiteType == "digital_products":
                headline = f"{name}: digital products ready to sell and deliver"
                subheadline = "Present bundles, modules, benefits and instant access with a simple buying experience."
                cta = "View products"
            else:
                headline = f"{name}: a clear professional web presence"
                subheadline = "Content, sections and calls to action designed to turn visitors into customers."
                cta = "Get started"

        return AgentResult(
            agentName=self.name,
            updates={
                "generatedCopy": {
                    "hero": {
                        "headline": headline,
                        "subheadline": subheadline,
                        "primaryCta": cta,
                    },
                    "templateUse": template,
                }
            },
            reasoningSummary="Created public-facing copy from strategy instead of pasting raw intake text.",
            confidence=0.84,
        )


class CatalogAgent(BaseAgent):
    name = "catalog"

    async def run(self, state: ProjectState, user_input: str) -> AgentResult:
        if state_is_commerce_seed_target(state, user_input):
            catalog = semantic_seed_catalog(state, user_input, count=6)
            summary = "Generated niche-specific editable seed catalog with prices, descriptions and product image URLs."
        else:
            services = split_items(state.servicesProducts) or ["Consultation", "Service package", "Custom request", "Follow-up"]
            catalog = []
            for index, service in enumerate(services[:6]):
                catalog.append({
                    "id": f"svc_{index + 1:03d}",
                    "sku": f"SVC-{index + 1:03d}",
                    "name": service[:80],
                    "description": "Editable service entry focused on outcomes, trust and the next contact step.",
                    "category": "Services",
                    "price_type": "quote_only",
                    "price": "",
                    "price_amount": "",
                    "currency": "USD",
                    "price_label": "Quote required",
                    "is_active": True,
                    "is_featured": index < 4,
                    "sort_order": index,
                })
            summary = "Structured the service intake into editable non-commerce catalog entries."

        return AgentResult(
            agentName=self.name,
            updates={"catalogItems": catalog, "catalogSource": "seed_fallback"},
            reasoningSummary=summary,
            confidence=0.84,
        )


class ValidationAgent(BaseAgent):
    name = "validator"

    async def run(self, state: ProjectState, user_input: str) -> AgentResult:
        missing = []
        if not state.businessName:
            missing.append("businessName")
        if not state.businessDescription and not state.servicesProducts:
            missing.append("businessDescription")
        if not state.websiteType:
            missing.append("websiteType")

        ready = len(missing) == 0
        return AgentResult(
            agentName=self.name,
            updates={
                "missingImportantFields": missing,
                "confidence": 0.9 if ready else 0.62,
            },
            reasoningSummary="Validated whether the state has enough information for a first draft.",
            confidence=0.9 if ready else 0.62,
        )


class ReviewIssue(BaseModel):
    model_config = ConfigDict(extra="forbid")

    agent: Literal["copywriter", "catalog", "strategist"]
    detail: str = Field(min_length=8, max_length=500)
    suggested_template_id: Optional[str] = None


class ReviewerVerdict(BaseModel):
    model_config = ConfigDict(extra="forbid")

    passed: bool
    severity: Literal["none", "minor", "critical"]
    issues: List[ReviewIssue] = Field(default_factory=list)


class ReviewerAgent(BaseAgent):
    name = "reviewer"

    def __init__(self) -> None:
        self.model = os.getenv("OPENAI_REVIEWER_MODEL") or os.getenv("OPENAI_MODEL") or "gpt-4o-mini"
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.client = AsyncOpenAI(api_key=self.api_key) if AsyncOpenAI and self.api_key else None

    async def run(self, state: ProjectState, user_input: str) -> AgentResult:
        if not self.client:
            return AgentResult(
                agentName=self.name,
                updates={},
                reasoningSummary="Reviewer skipped because OPENAI_API_KEY or OpenAI SDK is not configured.",
                warnings=["OPENAI_API_KEY missing or OpenAI SDK unavailable"],
                confidence=0.0,
            )

        payload = {
            "businessName": state.businessName,
            "businessDescription": state.businessDescription,
            "industry": state.industry,
            "servicesProducts": state.servicesProducts,
            "selectedTemplateName": state.selectedTemplateName,
            "selectedTemplateId": state.selectedTemplateId,
            "websiteType": state.websiteType,
            "catalogType": state.catalogType,
            "salesFlow": state.salesFlow,
            "generatedCopy": state.generatedCopy,
            "catalogItems": state.catalogItems[:16],
            "notes": state.notes[-8:],
            "templateCatalog": [
                {
                    "templateId": template_id,
                    "name": template.get("name"),
                    "websiteType": template.get("websiteType"),
                    "catalogType": template.get("catalogType"),
                    "audience": template.get("audience"),
                }
                for template_id, template in TEMPLATE_CATALOG.items()
            ],
        }
        messages = [
            {"role": "system", "content": self._system_prompt()},
            {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
        ]

        try:
            try:
                response = await self.client.chat.completions.create(
                    model=self.model,
                    temperature=0.0,
                    response_format=self._strict_response_format(),
                    messages=messages,
                )
            except Exception:
                response = await self.client.chat.completions.create(
                    model=self.model,
                    temperature=0.0,
                    response_format={"type": "json_object"},
                    messages=messages,
                )
            raw = response.choices[0].message.content or "{}"
            verdict = self._parse_verdict(json.loads(raw))
            verdict = self._filter_verdict_issues(verdict)
            summary = (
                "Reviewer verdict: "
                f"severity={verdict.severity}; passed={verdict.passed}; "
                f"issues={json.dumps([issue.model_dump() for issue in verdict.issues], ensure_ascii=False)}"
            )
            return AgentResult(
                agentName=self.name,
                updates={
                    "generatedCopy": {
                        **(state.generatedCopy or {}),
                        "reviewerVerdict": verdict.model_dump(),
                    }
                },
                reasoningSummary=summary,
                confidence=0.92 if verdict.passed else 0.78,
            )
        except (json.JSONDecodeError, ValidationError, Exception) as error:
            return AgentResult(
                agentName=self.name,
                updates={},
                reasoningSummary="Reviewer failed; generation continued without review.",
                warnings=[str(error)],
                confidence=0.0,
            )

    @staticmethod
    def _parse_verdict(parsed: Any) -> ReviewerVerdict:
        if isinstance(parsed, dict):
            try:
                return ReviewerVerdict.model_validate(parsed)
            except ValidationError:
                issues_payload = parsed.get("issues")
                if isinstance(issues_payload, list):
                    normalized_issues = []
                    severities = []
                    for issue in issues_payload:
                        if not isinstance(issue, dict):
                            continue
                        severity = str(issue.get("severity") or "").strip()
                        if severity in {"none", "minor", "critical"}:
                            severities.append(severity)
                        detail = str(issue.get("detail") or "")
                        if not ReviewerAgent._looks_actionable_issue(detail):
                            continue
                        normalized_issues.append({
                            "agent": issue.get("agent"),
                            "detail": detail,
                            "suggested_template_id": issue.get("suggested_template_id") or issue.get("suggestedTemplateId"),
                        })
                    root_severity = parsed.get("severity")
                    if root_severity not in {"none", "minor", "critical"}:
                        root_severity = "critical" if "critical" in severities else "minor" if normalized_issues else "none"
                    if not normalized_issues:
                        root_severity = "none"
                    return ReviewerVerdict.model_validate({
                        "passed": bool(parsed.get("passed", root_severity == "none")),
                        "severity": root_severity,
                        "issues": normalized_issues,
                    })
        raise ValueError("Reviewer response was not a JSON object")

    @staticmethod
    def _filter_verdict_issues(verdict: ReviewerVerdict) -> ReviewerVerdict:
        issues = [
            issue
            for issue in verdict.issues
            if ReviewerAgent._looks_actionable_issue(issue.detail)
        ]
        if not issues:
            return ReviewerVerdict(passed=True, severity="none", issues=[])
        return ReviewerVerdict(
            passed=verdict.passed and verdict.severity == "none",
            severity=verdict.severity,
            issues=issues,
        )

    @staticmethod
    def _looks_actionable_issue(detail: str) -> bool:
        text = normalize_text(detail)
        if not text:
            return False
        negative_markers = [
            "generic",
            "unrelated",
            "wrong",
            "incorrect",
            "incorrectly",
            "mismatch",
            "does not",
            "do not",
            "not align",
            "not specific",
            "too generic",
            "placeholder",
            "incoherent",
            "inconsistent",
            "contradict",
            "missing",
            "lacks",
            "should",
            "could apply",
            "raw intake",
        ]
        return any(marker in text for marker in negative_markers)

    @staticmethod
    def _strict_response_format() -> Dict[str, Any]:
        return {
            "type": "json_schema",
            "json_schema": {
                "name": "kreaton_reviewer_verdict",
                "strict": True,
                "schema": ReviewerVerdict.model_json_schema(),
            },
        }

    @staticmethod
    def _system_prompt() -> str:
        return """
You are LYRA's final QA reviewer for KREATON.

Review the finished ProjectState after copy, catalog, template strategy and validation.
Return ONLY valid JSON.

Evaluate exactly these risks:
1. Copy specificity: the headline/subheadline must mention something specific to the real business or offer. Generic copy that could apply to any company is an issue for agent "copywriter".
2. Catalog coherence: catalog items must match the client's described niche. Unrelated products, mixed-in wrong categories, generic bundles, or placeholders are issues for agent "catalog".
3. Template fit: selectedTemplateName/websiteType/catalogType must make sense for the client's requested business model. Wrong marketplace/service/store direction is an issue for agent "strategist".
When you create a "strategist" issue, you MUST include suggested_template_id with one exact templateId from templateCatalog that better fits the business. If no template clearly fits, omit the strategist issue.

Severity rules:
- "none": no meaningful issue.
- "minor": imperfect but usable; do not block generation.
- "critical": a customer would see a clearly wrong or generic result, especially unrelated catalog items, raw intake pasted as public copy, or a template type that contradicts the requested business.

Issue agent must be exactly one of: "copywriter", "catalog", "strategist".
Keep each issue detail concrete and actionable.
Do not include positive observations in issues. If an area passes, omit it from issues entirely.
""".strip()
