from __future__ import annotations

import re
from typing import Dict, List

from .models import AgentResult, ProjectState, WebsiteType


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
        ]))

        website_type: WebsiteType = "online_store"
        template_id = "modern-store"
        template_name = "Modern Store"
        catalog_type = "standard_catalog"

        broad_terms = [
            "amazon",
            "marketplace",
            "muchos productos",
            "productos variados",
            "de todo",
            "categorias",
            "categorías",
            "cosas raras",
            "accesorios",
        ]
        focused_terms = ["un producto", "linea", "línea", "premium", "exclusivo", "flagship"]

        if any(term in text for term in broad_terms) or len(state.servicesProducts) >= 5:
            website_type = "marketplace"
            template_id = "mega-marketplace"
            template_name = "Mega Marketplace"
            catalog_type = "broad_multi_category_catalog"
        elif any(term in text for term in focused_terms):
            website_type = "premium_product"
            template_id = "premium-showcase"
            template_name = "Premium Showcase"
            catalog_type = "focused_product_line"
        elif any(term in text for term in ["ropa", "fashion", "moda", "zapatos", "streetwear"]):
            website_type = "fashion"
            template_id = "fashion-drop"
            template_name = "Fashion Drop"
            catalog_type = "fashion_collections"
        elif any(term in text for term in ["restaurante", "menu", "comida", "food"]):
            website_type = "restaurant"
            template_id = "restaurant-menu"
            template_name = "Restaurant Menu"
            catalog_type = "restaurant_menu"
        elif any(term in text for term in ["cita", "booking", "reserva", "agenda", "barber"]):
            website_type = "booking"
            template_id = "appointment-booking"
            template_name = "Appointment Booking"
            catalog_type = "bookable_services"
        elif any(term in text for term in ["servicio", "quote", "cotizacion", "cotización"]):
            website_type = "services"
            template_id = "local-services"
            template_name = "Local Services"
            catalog_type = "service_catalog"

        return AgentResult(
            agentName=self.name,
            updates={
                "websiteType": website_type,
                "selectedTemplateId": template_id,
                "selectedTemplateName": template_name,
                "catalogType": catalog_type,
            },
            reasoningSummary=f"Selected {template_name} because the intake points to {catalog_type}.",
            confidence=0.82,
        )


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
