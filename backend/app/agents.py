from __future__ import annotations

import re
from typing import Dict, List

from .models import AgentResult, ProjectState, WebsiteType


TEMPLATE_CATALOG: Dict[str, Dict[str, str]] = {
    "mega-marketplace": {
        "name": "Mega Marketplace",
        "websiteType": "marketplace",
        "catalogType": "dense_marketplace_catalog",
        "audience": "Shoppers comparing many categories, deals, novelty products and fast-buy options.",
    },
    "listing-marketplace-pro": {
        "name": "Listing Marketplace",
        "websiteType": "marketplace",
        "catalogType": "listing_marketplace_catalog",
        "audience": "Buyers comparing listings, sellers, conditions, prices and availability.",
    },
    "apple-premium-product": {
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
            scores[template_id] += points
            reasons[template_id].append(reason)

        if existing_template_id in TEMPLATE_CATALOG:
            add(existing_template_id, 18, "existing valid template signal")

        broad_patterns = [
            r"\bamazon\b",
            r"\bmarketplace\b",
            r"\bmega\s*(tienda|store|marketplace)\b",
            r"\bmuchos productos\b",
            r"\bproductos variados\b",
            r"\bvarias categorias\b",
            r"\bcategorias\b",
            r"\bcategorias?\b",
            r"\bde todo\b",
            r"\bcosas raras\b",
            r"\bvariety\b",
            r"\bvarios\b",
        ]
        if any(re.search(pattern, text) for pattern in broad_patterns) or product_count >= 5:
            add("mega-marketplace", 150, "broad multi-category catalog")

        if re.search(r"\b(ebay|listing|listados|vendedores|seller|subasta|auction|usado|condition)\b", text):
            add("listing-marketplace-pro", 120, "listing and seller comparison flow")

        if re.search(r"\b(ropa|fashion|moda|boutique|streetwear|zapatos|sneaker|apparel|clothing|drop|lookbook)\b", text):
            add("fashion-drop-pro", 95, "fashion and collection browsing")

        focused_product = re.search(
            r"\b(un producto|solo un producto|una linea|linea de|linea premium|producto premium|flagship|high ticket|exclusivo|parachoques|modelo)\b",
            text,
        )
        if focused_product and scores["mega-marketplace"] < 100:
            add("apple-premium-product", 118, "focused premium product line")

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

        if re.search(r"\b(clinica|clinic|medico|medical|dental|wellness|terapia|estetica|treatment|consulta)\b", text):
            add("medical-wellness-clinic-pro", 122, "clinic trust and appointment flow")

        if re.search(r"\b(abogado|legal|law|contador|tax|impuesto|consultoria|insurance|seguro|asesoria)\b", text):
            add("legal-professional-services-pro", 120, "professional authority and consultation")

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
        products = split_items(state.servicesProducts)
        if not products:
            products = ["Featured item", "New arrival", "Limited find", "Customer favorite"]

        categories = ["Electronics", "Lifestyle", "Auto", "Collectibles", "Home", "Accessories"]
        catalog = []
        for index, product in enumerate(products[:12]):
            catalog.append({
                "id": f"ai_item_{index + 1}",
                "sku": f"AI-{index + 1:03d}",
                "name": product.title()[:80],
                "description": "Curated item ready for editing, pricing and publishing.",
                "category": categories[index % len(categories)],
                "price_type": "fixed",
                "price_amount": "",
                "currency": "USD",
                "price_label": "Price to be set",
                "is_active": True,
                "is_featured": index < 4,
                "sort_order": index,
            })

        return AgentResult(
            agentName=self.name,
            updates={"catalogItems": catalog},
            reasoningSummary="Structured the product/service input into editable catalog items.",
            confidence=0.76,
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
