from __future__ import annotations

import re
from typing import Any, Dict, List

from .models import AgentResult, ProjectState, WebsiteType


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
    return bool(re.search(
        r"\b(bisuteria|bijouterie|joyeria|jewelry|jewellery|collar|collares|pulsera|pulseras|arete|aretes|zarcillo|zarcillos|anillo|anillos|cadena|cadenas|dije|dijes|charm|charms|hecho a mano|hechos a mano|artesanal|artesanales|handmade accessories|handmade jewelry)\b",
        text,
    ))


def suggests_focused_commerce(text: str) -> bool:
    return suggests_jewelry_or_handmade_accessories(text) or bool(re.search(
        r"\b(ropa|fashion|moda|boutique|streetwear|zapatos|sneaker|apparel|clothing|beauty|belleza|skincare|cosmeticos|velas|candles|decoracion|ceramica|manualidades|crafts|productos artesanales|coleccion propia)\b",
        text,
    ))


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
    return broad_words or product_count >= 5


def suggests_multi_vendor_marketplace(text: str) -> bool:
    return bool(re.search(
        r"\b(multi vendedor|multi-vendedor|multi seller|multiseller|vendedores externos|external sellers|third party sellers|otros vendedores|seller onboarding|vendor onboarding|vendor payout|payouts|comisiones a vendedores)\b",
        text,
    ))


def unsplash_seed_url(keyword: str) -> str:
    clean = re.sub(r"[^a-z0-9]+", "-", (keyword or "premium-product").lower()).strip("-")
    return f"https://images.unsplash.com/featured/600x600/?{clean or 'premium-product'}"


def infer_seed_profile(text: str) -> str:
    text = normalize_text(text)
    if suggests_broad_marketplace(text) or re.search(r"\b(tipo amazon|como amazon|mega tienda|catalogo variado|productos variados|muchas categorias|todo tipo|de todo)\b", text):
        return "marketplace"
    if re.search(r"\b(restaurante|restaurant|menu|food|comida|pizza|bar|bakery)\b", text):
        return "restaurant"
    if re.search(r"\b(cafe|coffee|espresso|cold brew)\b", text):
        return "coffee"
    if suggests_jewelry_or_handmade_accessories(text):
        return "jewelry"
    if re.search(r"\b(parachoques|bumper|4x4|off road|off-road|repuestos|automotriz|camioneta|truck|auto accessories)\b", text):
        return "auto"
    if re.search(r"\b(ropa|fashion|moda|streetwear|sneaker|zapato|camiseta|clothing|boutique)\b", text):
        return "fashion"
    if re.search(r"\b(beauty|belleza|skincare|cosmet|maquillaje|spa)\b", text):
        return "beauty"
    if re.search(r"\b(decor|hogar|home|furniture|muebles|interior|lampara|casa)\b", text):
        return "home"
    if re.search(r"\b(tech|tecnologia|gadget|electron|gaming|usb|phone|laptop|anime|juguete|toy|curioso|raro|inusual|cyberpunk)\b", text):
        return "tech"
    return "default"


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
    "default": [
        {"name": {"es": "Pack Inicial Signature", "en": "Signature Starter Pack"}, "category": {"es": "Destacados", "en": "Featured"}, "price": 39.0, "keyword": "premium-product-pack", "description": {"es": "Oferta inicial pulida que presenta la marca con beneficio claro y buena presentacion.", "en": "A polished starter offer that introduces the brand with a clear benefit and strong presentation."}},
        {"name": {"es": "Bundle Favorito del Cliente", "en": "Customer Favorite Bundle"}, "category": {"es": "Combos", "en": "Bundles"}, "price": 58.0, "keyword": "customer-favorite-bundle", "description": {"es": "Combo practico que une productos utiles en una opcion simple.", "en": "A practical bundle that combines useful products into one simple choice."}},
        {"name": {"es": "Upgrade Premium", "en": "Premium Upgrade"}, "category": {"es": "Premium", "en": "Premium"}, "price": 74.0, "keyword": "premium-upgrade-product", "description": {"es": "Opcion elevada para clientes que buscan mejor material, presentacion o soporte.", "en": "An elevated option for customers who want better materials, presentation, or support."}},
        {"name": {"es": "Drop de Edicion Limitada", "en": "Limited Edition Drop"}, "category": {"es": "Limitado", "en": "Limited"}, "price": 49.0, "keyword": "limited-edition-product", "description": {"es": "Oferta de escasez para lanzamientos y temporadas sin depender de descuentos fuertes.", "en": "A scarcity-based offer for launches and seasonal campaigns without heavy discounts."}},
        {"name": {"es": "Esencial de Uso Diario", "en": "Everyday Essential"}, "category": {"es": "Esenciales", "en": "Essentials"}, "price": 22.0, "keyword": "everyday-essential-product", "description": {"es": "Producto simple de uso diario pensado para recompra y checkout facil.", "en": "A simple everyday product positioned for repeat use and easy checkout."}},
        {"name": {"es": "Seleccion Lista para Regalo", "en": "Gift Ready Selection"}, "category": {"es": "Regalos", "en": "Gifts"}, "price": 35.0, "keyword": "gift-ready-product", "description": {"es": "Opcion de regalo curada con presentacion limpia y atractivo amplio.", "en": "A curated gift option with clean presentation and broad appeal."}},
    ],
}


def localized_seed(value: Dict[str, str], language: str) -> str:
    return value.get(language) or value.get("es") or value.get("en") or next(iter(value.values()), "")


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
        state.selectedTemplateId or "",
        state.catalogType or "",
    ])
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
    else:
        products = SEED_PRODUCT_LIBRARY.get(profile, SEED_PRODUCT_LIBRARY["default"])[:count]
    catalog: List[Dict[str, Any]] = []
    for index, product in enumerate(products):
        price = float(product["price"])
        catalog.append({
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
        })
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

        name_match = re.search(
            r"(?:se llama|se llamara|se llamará|llamada|called|name is|nombre es|sera|será)\s+([a-z0-9 '&.-]{2,50}?)(?:\s+(?:vendo|vende|sell|con|ubicad[ao]|en usa|desde)|[.,;\n]|$)",
            text,
            re.IGNORECASE,
        )
        if name_match and not state.businessName:
            updates["businessName"] = name_match.group(1).strip(" .")

        if not state.businessDescription and len(text) > 40:
            updates["businessDescription"] = text

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
            state.businessDescription or "",
            state.industry or "",
            " ".join(state.servicesProducts),
            state.preferredTone or "",
            state.preferredColors or "",
            state.salesFlow or "",
        ]))

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

        if re.search(r"\b(ebay|listing|listados|vendedores|seller|subasta|auction|usado|condition)\b", text):
            add("listing-marketplace-pro", 120, "listing and seller comparison flow")

        if suggests_jewelry_or_handmade_accessories(text) and not broad_marketplace:
            add("fashion-drop-pro", 125, "focused jewelry and handmade accessory store")

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

        if re.search(r"\b(cita|booking|reserva|agenda|appointment|barber|salon|spa|calendario)\b", text):
            add("booking-appointment-pro", 125, "appointment booking flow")

        if re.search(r"\b(curso|course|academy|academia|clase|coaching|bootcamp|training|formacion)\b", text):
            add("education-course-academy-pro", 124, "course and education offer")

        if re.search(r"\b(digital|download|descarga|template|plantilla|ebook|software|membresia|membership|bundle)\b", text):
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
            colors = {
                "background": "#050513",
                "surface": "#101124",
                "primary": "#00E7FF",
                "secondary": "#FF2BD6",
                "accent": "#B9FF00",
                "text": "#F8FAFC",
            }
            typography = {"heading": "Orbitron", "body": "Inter"}
            direction = "Cyberpunk neon marketplace with high-contrast commerce UI."
        elif any(term in text for term in ["luxury", "lujo", "premium", "elegante"]):
            colors = {
                "background": "#F7F4EE",
                "surface": "#FFFFFF",
                "primary": "#111827",
                "secondary": "#C7A46A",
                "accent": "#0F766E",
                "text": "#111827",
            }
            typography = {"heading": "Playfair Display", "body": "Inter"}
            direction = "Premium editorial visual system."
        else:
            colors = {
                "background": "#F8FAFC",
                "surface": "#FFFFFF",
                "primary": "#0F172A",
                "secondary": "#E2E8F0",
                "accent": "#14B8A6",
                "text": "#111827",
            }
            typography = {"heading": "Inter", "body": "Inter"}
            direction = "Clean commercial UI with strong readability."

        return AgentResult(
            agentName=self.name,
            updates={"colors": colors, "typography": typography},
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
            updates={"catalogItems": catalog},
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
