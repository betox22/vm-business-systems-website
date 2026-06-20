import json

import httpx
from openai import OpenAI

from .config import get_settings
from .schemas import AiWebsiteBuilderRequest, WebsiteSchema


RENDERABLE_SECTION_TYPES = [
    "Hero",
    "ProductGrid",
    "ServiceList",
    "FeatureBand",
    "About",
    "Gallery",
    "Testimonials",
    "Contact",
    "Footer",
    "PremiumHero",
    "ProductStory",
    "FeatureShowcase",
    "EditorialGallery",
    "SpecStrip",
    "FashionHero",
    "FashionCollectionRail",
    "FashionDropStory",
    "FashionLookbook",
    "FashionFitGuide",
    "CorporateHero",
    "CorporateServices",
    "CorporateProcess",
    "CorporateProof",
    "RestaurantHero",
    "RestaurantCategoryRail",
    "RestaurantSignatureMenu",
    "RestaurantSpecials",
    "RestaurantInfo",
    "RestaurantOrderPanel",
    "DigitalHero",
    "DigitalBundle",
    "DigitalModules",
    "DigitalProof",
    "DigitalAccessPanel",
    "LuxuryHero",
    "LuxurySignature",
    "LuxuryCollection",
    "LuxuryProvenance",
    "LuxuryPrivateService",
    "LuxuryContact",
    "AcademyHero",
    "AcademyLearningPath",
    "AcademyPrograms",
    "AcademyOutcomes",
    "AcademyInstructor",
    "AcademyEnroll",
    "ClinicHero",
    "ClinicServices",
    "ClinicTreatmentPath",
    "ClinicTrust",
    "ClinicResults",
    "ClinicTeam",
    "ClinicBooking",
    "ProfessionalHero",
    "ProfessionalPracticeAreas",
    "ProfessionalProcess",
    "ProfessionalProof",
    "ProfessionalTeam",
    "ProfessionalFAQ",
    "ProfessionalConsultation",
    "EnterpriseHero",
    "EnterpriseSolutions",
    "EnterpriseUseCases",
    "EnterpriseIntegrations",
    "EnterpriseProof",
    "EnterprisePricing",
    "EnterpriseDemo",
    "IndustrialHero",
    "IndustrialSpecCatalog",
    "IndustrialCapabilities",
    "IndustrialCertifications",
    "IndustrialSupplyChain",
    "IndustrialQuotePanel",
    "ListingHero",
    "ListingFilters",
    "ListingFeatured",
    "ListingAreaPanel",
    "ListingTrust",
    "ListingContact",
    "HomeServiceHero",
    "HomeServiceCategories",
    "HomeServiceAreas",
    "HomeServiceGallery",
    "HomeServiceTrust",
    "HomeServiceQuote",
    "BookingHero",
    "BookingServices",
    "BookingAvailability",
    "BookingTeam",
    "BookingContact",
    "FunnelHero",
    "FunnelOffer",
    "FunnelBenefits",
    "FunnelProof",
    "FunnelFAQ",
    "MarketplaceHero",
    "CategoryRail",
    "DealRow",
    "TrustStrip",
]


WEBSITE_SCHEMA_JSON_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": [
        "schema_version",
        "site_type",
        "business",
        "theme",
        "layout_mode",
        "integrations",
        "custom_logic",
        "navigation",
        "pages",
        "global_components",
        "design_variants",
        "selected_template",
        "catalog_model",
        "products_services",
        "contact",
        "editable_fields",
    ],
    "properties": {
        "schema_version": {"type": "string"},
        "site_type": {"type": "string", "enum": ["online_store", "service_site", "portfolio_site"]},
        "business": {
            "type": "object",
            "additionalProperties": False,
            "required": ["name", "description", "industry", "location", "target_audience", "tone"],
            "properties": {
                "name": {"type": "string"},
                "description": {"type": "string"},
                "industry": {"type": "string"},
                "location": {"type": "string"},
                "target_audience": {"type": "string"},
                "tone": {"type": "string"},
            },
        },
        "theme": {
            "type": "object",
            "additionalProperties": False,
            "required": ["colors", "fonts", "buttons", "radius"],
            "properties": {
                "colors": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["background", "surface", "primary", "secondary", "text", "muted"],
                    "properties": {
                        "background": {"type": "string"},
                        "surface": {"type": "string"},
                        "primary": {"type": "string"},
                        "secondary": {"type": "string"},
                        "text": {"type": "string"},
                        "muted": {"type": "string"},
                    },
                },
                "fonts": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["heading", "body"],
                    "properties": {
                        "heading": {"type": "string"},
                        "body": {"type": "string"},
                    },
                },
                "buttons": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["primary_label", "secondary_label"],
                    "properties": {
                        "primary_label": {"type": "string"},
                        "secondary_label": {"type": "string"},
                    },
                },
                "radius": {"type": "integer"},
            },
        },
        "navigation": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["label", "page_key"],
                "properties": {
                    "label": {"type": "string"},
                    "page_key": {"type": "string"},
                },
            },
        },
        "layout_mode": {
            "type": "object",
            "additionalProperties": False,
            "required": ["id", "navigation", "checkout"],
            "properties": {
                "id": {"type": "string"},
                "navigation": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["show_cart", "show_header", "sticky_header"],
                    "properties": {
                        "show_cart": {"type": "boolean"},
                        "show_header": {"type": "boolean"},
                        "sticky_header": {"type": "boolean"},
                    },
                },
                "checkout": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["mode", "primary_action"],
                    "properties": {
                        "mode": {"type": "string"},
                        "primary_action": {"type": "string"},
                    },
                },
            },
        },
        "integrations": {
            "type": "object",
            "additionalProperties": False,
            "required": ["contact", "analytics", "payments"],
            "properties": {
                "contact": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["whatsapp_enabled", "email_enabled"],
                    "properties": {
                        "whatsapp_enabled": {"type": "boolean"},
                        "email_enabled": {"type": "boolean"},
                    },
                },
                "analytics": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["enabled", "provider"],
                    "properties": {
                        "enabled": {"type": "boolean"},
                        "provider": {"type": "string"},
                    },
                },
                "payments": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["enabled", "mode"],
                    "properties": {
                        "enabled": {"type": "boolean"},
                        "mode": {"type": "string"},
                    },
                },
            },
        },
        "custom_logic": {
            "type": "object",
            "additionalProperties": False,
            "required": ["enabled", "risk_level", "automations"],
            "properties": {
                "enabled": {"type": "boolean"},
                "risk_level": {"type": "string", "enum": ["restricted"]},
                "automations": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "required": ["id", "trigger", "conditions", "actions"],
                        "properties": {
                            "id": {"type": "string"},
                            "trigger": {"type": "string"},
                            "conditions": {"type": "array", "items": {"type": "string"}},
                            "actions": {"type": "array", "items": {"type": "string"}},
                        },
                    },
                },
            },
        },
        "pages": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["page_key", "title", "slug", "order", "sections"],
                "properties": {
                    "page_key": {"type": "string"},
                    "title": {"type": "string"},
                    "slug": {"type": "string"},
                    "order": {"type": "integer"},
                    "sections": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "additionalProperties": False,
                            "required": ["id", "type", "order", "editable", "settings"],
                            "properties": {
                                "id": {"type": "string"},
                                "type": {
                                    "type": "string",
                                    "enum": RENDERABLE_SECTION_TYPES,
                                },
                                "order": {"type": "integer"},
                                "editable": {
                                    "type": "object",
                                    "additionalProperties": False,
                                    "required": [
                                        "headline",
                                        "subtitle",
                                        "title",
                                        "text",
                                        "primary_button",
                                        "secondary_button",
                                        "image_url",
                                        "images",
                                    ],
                                    "properties": {
                                        "headline": {"type": "string"},
                                        "subtitle": {"type": "string"},
                                        "title": {"type": "string"},
                                        "text": {"type": "string"},
                                        "primary_button": {"type": "string"},
                                        "secondary_button": {"type": "string"},
                                        "image_url": {"type": "string"},
                                        "images": {
                                            "type": "array",
                                            "items": {"type": "string"},
                                        },
                                    },
                                },
                                "settings": {
                                    "type": "object",
                                    "additionalProperties": False,
                                    "required": ["layout", "source", "columns"],
                                    "properties": {
                                        "layout": {"type": "string"},
                                        "source": {"type": "string"},
                                        "columns": {"type": "integer"},
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        "global_components": {
            "type": "object",
            "additionalProperties": False,
            "required": ["logo_url", "footer_text"],
            "properties": {
                "logo_url": {"type": "string"},
                "footer_text": {"type": "string"},
            },
        },
        "design_variants": {
            "type": "array",
            "minItems": 3,
            "maxItems": 3,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": [
                    "id",
                    "name",
                    "description",
                    "logo_style",
                    "background_style",
                    "theme",
                    "layout_mode_id",
                    "hero_layout",
                    "product_layout",
                    "section_density",
                ],
                "properties": {
                    "id": {"type": "string"},
                    "name": {"type": "string"},
                    "description": {"type": "string"},
                    "logo_style": {"type": "string"},
                    "background_style": {"type": "string"},
                    "theme": {
                        "type": "object",
                        "additionalProperties": False,
                        "required": ["colors", "fonts", "buttons", "radius"],
                        "properties": {
                            "colors": {
                                "type": "object",
                                "additionalProperties": False,
                                "required": ["background", "surface", "primary", "secondary", "text", "muted"],
                                "properties": {
                                    "background": {"type": "string"},
                                    "surface": {"type": "string"},
                                    "primary": {"type": "string"},
                                    "secondary": {"type": "string"},
                                    "text": {"type": "string"},
                                    "muted": {"type": "string"},
                                },
                            },
                            "fonts": {
                                "type": "object",
                                "additionalProperties": False,
                                "required": ["heading", "body"],
                                "properties": {
                                    "heading": {"type": "string"},
                                    "body": {"type": "string"},
                                },
                            },
                            "buttons": {
                                "type": "object",
                                "additionalProperties": False,
                                "required": ["primary_label", "secondary_label"],
                                "properties": {
                                    "primary_label": {"type": "string"},
                                    "secondary_label": {"type": "string"},
                                },
                            },
                            "radius": {"type": "integer"},
                        },
                    },
                    "layout_mode_id": {"type": "string"},
                    "hero_layout": {"type": "string"},
                    "product_layout": {"type": "string"},
                    "section_density": {"type": "string", "enum": ["compact", "balanced", "spacious"]},
                },
            },
        },
        "selected_template": {
            "type": "object",
            "additionalProperties": False,
            "required": ["id", "name", "intent", "catalogType", "visualDifference"],
            "properties": {
                "id": {"type": "string"},
                "name": {"type": "string"},
                "intent": {"type": "string"},
                "catalogType": {"type": "string"},
                "visualDifference": {"type": "string"},
            },
        },
        "catalog_model": {
            "type": "object",
            "additionalProperties": False,
            "required": [
                "catalogType",
                "productCardStyle",
                "collectionLayout",
                "productDetailModel",
                "customerFeeling",
            ],
            "properties": {
                "catalogType": {"type": "string"},
                "productCardStyle": {"type": "string"},
                "collectionLayout": {"type": "string"},
                "productDetailModel": {"type": "string"},
                "customerFeeling": {"type": "string"},
            },
        },
        "products_services": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["name", "description", "price_label", "image_url", "button_label"],
                "properties": {
                    "name": {"type": "string"},
                    "description": {"type": "string"},
                    "price_label": {"type": "string"},
                    "image_url": {"type": "string"},
                    "button_label": {"type": "string"},
                },
            },
        },
        "contact": {
            "type": "object",
            "additionalProperties": False,
            "required": ["email", "phone", "instagram", "address"],
            "properties": {
                "email": {"type": "string"},
                "phone": {"type": "string"},
                "instagram": {"type": "string"},
                "address": {"type": "string"},
            },
        },
        "editable_fields": {"type": "array", "items": {"type": "string"}},
    },
}


def generate_ai_website_schema(payload: AiWebsiteBuilderRequest) -> tuple[WebsiteSchema, bool, str]:
    settings = get_settings()
    selected_language = payload.selected_language or "en"
    if not settings.openai_api_key:
        if settings.allow_dev_ai_mock:
            return _development_mock(payload), True, "development_mock"
        raise RuntimeError("OPENAI_API_KEY is required for AI website generation.")

    client = OpenAI(
        api_key=settings.openai_api_key,
        http_client=httpx.Client(trust_env=False),
    )
    response = client.responses.create(
        model=settings.openai_model,
        input=[
            {
                "role": "system",
                "content": (
                    "You are a world-class graphic designer, brand strategist, ecommerce art director, "
                    "and conversion-focused web designer. Generate an editable website schema, never static "
                    "HTML. Your job is to design the store as if it were being prepared for a professional "
                    "client presentation. Think visually before writing JSON: infer the brand personality, "
                    "business model, catalog complexity, purchase flow, trust needs, and best layout pattern. "
                    "The user's intake answers are strategy notes, not website copy. Never copy rough client "
                    "answers, internal notes, requirements, or planning text verbatim into visible website copy. "
                    "Rewrite everything as polished public-facing copy in the selected language. "
                    "Use the selected template when provided. Do not invent a full page structure from zero "
                    "when selectedTemplate is present: keep its section order and use its catalogModel.catalogType "
                    "as the catalog experience. Fill template placeholders with business-specific copy, products, "
                    "services, categories, CTAs, contact info, images, and colors. The app renderer controls layout "
                    "quality from catalogType, so your job is content, page labels, product/service data, and "
                    "editable text. "
                    "If the selected template is a broad marketplace, create a dense retail discovery experience "
                    "with categories, featured rows, trust strips, search-oriented copy, deal/collection language, "
                    "and operational ecommerce CTAs. If it is a listing marketplace, create seller/listing cues, "
                    "filters, condition/location metadata, and inquiry paths. If it is a premium product template, "
                    "create a focused product-line showcase with large visuals, benefits, proof, specs, and refined "
                    "purchase or inquiry CTAs. Do not mention or imitate any external brand by name. Infer "
                    "price position, likely photography style, audience expectations, trust needs, and the "
                    "emotional color language from the business description. Choose colors because they are "
                    "appropriate for that type of business, not because the user typed them. If preferred "
                    "colors are words such as 'minimalista', 'pastel', 'neon', 'negro y dorado', 'azul "
                    "confianza', 'verde natural', or 'lujo', translate them into tasteful HEX values. If "
                    "the user provides exact HEX values, respect them unless they would harm readability; "
                    "then use them as accent colors. Avoid generic white-and-green templates unless the "
                    "business truly calls for that. The result must feel like a polished Shopify-quality "
                    "storefront: strong hierarchy, clear whitespace, refined typography, purposeful contrast, "
                    "specific copy, and section order designed for sales. Choose layout values intentionally "
                    "from ideas like editorial_luxury, split_showcase, boutique_grid, minimal_catalog, "
                    "bold_launch, trust_first, image_right, image_left, centered_hero, masonry, grid, simple. "
                    "Use warm boutique layouts for food/beauty/fashion/gifts, clean trust layouts for "
                    "services, bold launch layouts for new brands, and efficient catalog layouts for retail. "
                    "Always create Home, Catalog or Services, About, and Contact pages. "
                    "If the business sells products, mentions tienda, store, ecommerce, online sales, catalog, "
                    "inventory, products, accessories, food, fashion, gifts, electronics, beauty, or retail, "
                    "treat it as an online store: create a Catalog/Tienda page, product grids, cart-oriented CTAs, "
                    "product/service cards with price_label values, featured items, and navigation labels that make "
                    "the store feel operational. Do not reduce a store request into a generic service landing page. "
                    "If the user explicitly wants quote requests only, then use service-style CTAs. "
                    "Always make the navigation expose the internal pages clearly. "
                    "If images are not provided, use tasteful visual placeholders and strong product copy, not blank areas. "
                    "Always create Home, Catalog or Services, About, and Contact pages. Generate exactly "
                    "three distinct design_variants at the same time: one safest commercial storefront, one "
                    "more premium/editorial direction, and one bolder/high-conversion direction. The three "
                    "variants must differ in palette, logo_style, background_style, hero_layout, product_layout, "
                    "and section_density. They must not be palette swaps: they need different visual structure, "
                    "different rhythm, different page composition, different logo treatment, and different product "
                    "presentation. Each variant must be usable immediately by a renderer without new AI calls. "
                    "Every editable object must include all required editable keys, even when blank. "
                    "Every settings object must include layout, source, and columns. "
                    "Return selected_template and catalog_model as first-class schema metadata. selected_template.id "
                    "must match the provided templateId when present. catalog_model.catalogType must match the "
                    "provided catalogType when present. "
                    f"The selectedLanguage is '{selected_language}'. All visible website copy, catalog/service "
                    "descriptions, CTAs, navigation labels, section titles, preview content, footer text, "
                    "and generated product/service wording must be written in that language. JSON keys must "
                    "remain in English. Do not mix languages unless the business name, brand terms, or products "
                    "are intentionally in another language."
                ),
            },
            {
                "role": "user",
                "content": (
                    "Create the best possible website schema for this business. Do not merely restate the "
                    "input. Make strong design decisions and generate elevated copy. The theme.colors object "
                    "must always contain valid HEX colors for background, surface, primary, secondary, text, "
                    "and muted. If the user gives color words, interpret them professionally. Also return "
                    "exactly three design_variants so the operator can choose different layouts before editing. "
                    "If templateId, catalogType, selectedTemplate, or templateIntent are present, use them as "
                    "hard guidance and preserve the intended catalog experience. Use rich renderer section types "
                    "that fit the selected template when appropriate, such as MarketplaceHero, CategoryRail, DealRow, "
                    "PremiumHero, FashionHero, RestaurantHero, CorporateHero, ClinicHero, EnterpriseHero, or their "
                    "matching supporting sections. Do not collapse everything into a generic Hero/ProductGrid page. "
                    "Do not copy intake answers literally into headlines or paragraphs; synthesize them into "
                    "professional marketing copy. "
                    f"Generate every visible value in selectedLanguage='{selected_language}'. Keep JSON keys in English.\n"
                    f"{json.dumps(payload.model_dump(), ensure_ascii=False)}"
                ),
            },
        ],
        text={
            "format": {
                "type": "json_schema",
                "name": "editable_website_schema",
                "schema": WEBSITE_SCHEMA_JSON_SCHEMA,
                "strict": True,
            }
        },
    )
    schema = WebsiteSchema.model_validate(json.loads(response.output_text))
    schema.business["selectedLanguage"] = selected_language
    if payload.selected_template:
        schema.selected_template = {
            **payload.selected_template,
            "id": payload.template_id or payload.selected_template.get("id", ""),
            "intent": payload.template_intent,
            "catalogType": payload.catalog_type,
        }
    if payload.catalog_type or payload.selected_template.get("catalogModel"):
        schema.catalog_model = payload.selected_template.get("catalogModel") or {}
        if payload.catalog_type:
            schema.catalog_model["catalogType"] = payload.catalog_type
        schema.layout_mode["template_id"] = payload.template_id
        schema.layout_mode["catalog_type"] = payload.catalog_type or schema.catalog_model.get("catalogType", "")
        schema.layout_mode["intent"] = payload.template_intent
    return schema, False, "openai"


def _localized_copy(language: str) -> dict[str, str | list[str]]:
    copies = {
        "en": {
            "default_items": ["Featured offer", "Premium package", "Custom service"],
            "professional": "professional",
            "contact_us": "Contact us",
            "view_catalog": "View catalog",
            "home": "Home",
            "catalog": "Catalog",
            "about": "About",
            "contact": "Contact",
            "built_for": "built for",
            "modern_customers": "modern customers",
            "get_started": "Get started",
            "featured": "Featured products and services",
            "tell_us": "Tell us what you need.",
            "lets_talk": "Let's talk",
            "send_us": "Send us a message.",
            "send_message": "Send message",
            "buy_now": "Buy now",
            "buy": "Buy",
            "learn_more": "Learn more",
            "order": "Order",
            "view_products": "View products",
            "for": "for",
            "your_customers": "your customers",
            "ask_pricing": "Ask for pricing",
            "request_info": "Request info",
        },
        "es": {
            "default_items": ["Oferta destacada", "Paquete premium", "Servicio personalizado"],
            "professional": "profesional",
            "contact_us": "Contactanos",
            "view_catalog": "Ver catalogo",
            "home": "Inicio",
            "catalog": "Catalogo",
            "about": "Nosotros",
            "contact": "Contacto",
            "built_for": "creado para",
            "modern_customers": "clientes modernos",
            "get_started": "Empezar",
            "featured": "Productos y servicios destacados",
            "tell_us": "Cuentanos que necesitas.",
            "lets_talk": "Hablemos",
            "send_us": "Envianos un mensaje.",
            "send_message": "Enviar mensaje",
            "buy_now": "Comprar ahora",
            "buy": "Comprar",
            "learn_more": "Conocer mas",
            "order": "Ordenar",
            "view_products": "Ver productos",
            "for": "para",
            "your_customers": "tus clientes",
            "ask_pricing": "Consultar precio",
            "request_info": "Solicitar informacion",
        },
        "fr": {
            "default_items": ["Offre phare", "Pack premium", "Service personnalisé"],
            "professional": "professionnel",
            "contact_us": "Nous contacter",
            "view_catalog": "Voir le catalogue",
            "home": "Accueil",
            "catalog": "Catalogue",
            "about": "À propos",
            "contact": "Contact",
            "built_for": "créé pour",
            "modern_customers": "des clients modernes",
            "get_started": "Commencer",
            "featured": "Produits et services en vedette",
            "tell_us": "Dites-nous ce dont vous avez besoin.",
            "lets_talk": "Parlons-en",
            "send_us": "Envoyez-nous un message.",
            "send_message": "Envoyer un message",
            "buy_now": "Acheter maintenant",
            "buy": "Acheter",
            "learn_more": "En savoir plus",
            "order": "Commander",
            "view_products": "Voir les produits",
            "for": "pour",
            "your_customers": "vos clients",
            "ask_pricing": "Demander le prix",
            "request_info": "Demander des infos",
        },
        "pt": {
            "default_items": ["Oferta em destaque", "Pacote premium", "Serviço personalizado"],
            "professional": "profissional",
            "contact_us": "Fale conosco",
            "view_catalog": "Ver catálogo",
            "home": "Início",
            "catalog": "Catálogo",
            "about": "Sobre",
            "contact": "Contato",
            "built_for": "criado para",
            "modern_customers": "clientes modernos",
            "get_started": "Começar",
            "featured": "Produtos e serviços em destaque",
            "tell_us": "Conte o que você precisa.",
            "lets_talk": "Vamos conversar",
            "send_us": "Envie uma mensagem.",
            "send_message": "Enviar mensagem",
            "buy_now": "Comprar agora",
            "buy": "Comprar",
            "learn_more": "Saiba mais",
            "order": "Pedir",
            "view_products": "Ver produtos",
            "for": "para",
            "your_customers": "seus clientes",
            "ask_pricing": "Consultar preço",
            "request_info": "Solicitar informações",
        },
    }
    return copies.get(language, copies["en"])


def _development_mock(payload: AiWebsiteBuilderRequest) -> WebsiteSchema:
    copy = _localized_copy(payload.selected_language)
    preferred = payload.preferred_colors or ["#0E7C66", "#E3F3EE"]
    primary = preferred[0]
    secondary = preferred[1] if len(preferred) > 1 else "#E3F3EE"
    items = payload.services_products or copy["default_items"]

    return WebsiteSchema(
        schema_version="2.0",
        site_type="online_store" if payload.services_products else "service_site",
        business={
            "name": payload.business_name,
            "description": payload.business_description,
            "industry": payload.industry,
            "location": payload.location,
            "target_audience": payload.target_audience,
            "tone": payload.preferred_tone or copy["professional"],
            "selectedLanguage": payload.selected_language,
        },
        theme={
            "colors": {
                "background": "#F8FAF9",
                "surface": "#FFFFFF",
                "primary": primary,
                "secondary": secondary,
                "text": "#111827",
                "muted": "#667085",
            },
            "fonts": {"heading": "Poppins", "body": "Inter"},
            "buttons": {"primary_label": copy["contact_us"], "secondary_label": copy["view_catalog"]},
            "radius": 8,
        },
        layout_mode={
            "id": "standard_business_site",
            "navigation": {"show_cart": False, "show_header": True, "sticky_header": True},
            "checkout": {"mode": "lead_or_inquiry", "primary_action": "contact"},
        },
        integrations={
            "contact": {"whatsapp_enabled": True, "email_enabled": True},
            "analytics": {"enabled": False, "provider": ""},
            "payments": {"enabled": False, "mode": "manual"},
        },
        custom_logic={
            "enabled": True,
            "risk_level": "restricted",
            "automations": [
                {
                    "id": "lead_followup",
                    "trigger": "contact.submitted",
                    "conditions": [],
                    "actions": ["notify_operator"],
                }
            ],
        },
        navigation=[
            {"label": copy["home"], "page_key": "home"},
            {"label": copy["catalog"], "page_key": "catalog"},
            {"label": copy["about"], "page_key": "about"},
            {"label": copy["contact"], "page_key": "contact"},
        ],
        pages=[
            {
                "page_key": "home",
                "title": copy["home"],
                "slug": "/",
                "order": 1,
                "sections": [
                    {
                        "id": "home_hero",
                        "type": "Hero",
                        "order": 1,
                        "editable": {
                            "headline": f"{payload.business_name} {copy['built_for']} {payload.target_audience or copy['modern_customers']}",
                            "subtitle": payload.business_description,
                            "primary_button": copy["get_started"],
                            "secondary_button": copy["view_catalog"],
                            "title": "",
                            "text": "",
                            "image_url": payload.assets[0].url if payload.assets else "",
                            "images": [],
                        },
                        "settings": {"layout": "image_right", "source": "", "columns": 1},
                    },
                    {
                        "id": "home_featured",
                        "type": "ProductGrid",
                        "order": 2,
                        "editable": {
                            "headline": "",
                            "subtitle": "",
                            "title": copy["featured"],
                            "text": "",
                            "primary_button": "",
                            "secondary_button": "",
                            "image_url": "",
                            "images": [],
                        },
                        "settings": {"layout": "grid", "source": "products_services", "columns": 3},
                    },
                    {
                        "id": "home_contact",
                        "type": "Contact",
                        "order": 3,
                        "editable": {
                            "headline": "",
                            "subtitle": "",
                            "title": copy["contact_us"],
                            "text": copy["tell_us"],
                            "primary_button": copy["contact_us"],
                            "secondary_button": "",
                            "image_url": "",
                            "images": [],
                        },
                        "settings": {"layout": "simple", "source": "", "columns": 1},
                    },
                ],
            },
            {
                "page_key": "catalog",
                "title": copy["catalog"],
                "slug": "/catalog",
                "order": 2,
                "sections": [
                    {
                        "id": "catalog_grid",
                        "type": "ProductGrid",
                        "order": 1,
                        "editable": {
                            "headline": "",
                            "subtitle": "",
                            "title": copy["catalog"],
                            "text": "",
                            "primary_button": "",
                            "secondary_button": "",
                            "image_url": "",
                            "images": [],
                        },
                        "settings": {"layout": "grid", "source": "products_services", "columns": 3},
                    }
                ],
            },
            {
                "page_key": "contact",
                "title": copy["contact"],
                "slug": "/contact",
                "order": 3,
                "sections": [
                    {
                        "id": "contact_simple",
                        "type": "Contact",
                        "order": 1,
                        "editable": {
                            "headline": "",
                            "subtitle": "",
                            "title": copy["lets_talk"],
                            "text": copy["send_us"],
                            "primary_button": copy["send_message"],
                            "secondary_button": "",
                            "image_url": "",
                            "images": [],
                        },
                        "settings": {"layout": "simple", "source": "", "columns": 1},
                    }
                ],
            },
        ],
        global_components={"logo_url": _logo_url(payload), "footer_text": payload.business_name},
        design_variants=[
            {
                "id": "boutique_editorial",
                "name": "Boutique editorial",
                "description": "Hero amplio, paleta suave y catalogo con aire premium para una marca cercana.",
                "logo_style": "monogram serif",
                "background_style": "soft editorial bands",
                "theme": {
                    "colors": {
                        "background": "#F7F1E7",
                        "surface": "#FFFFFF",
                        "primary": "#7A3E2C",
                        "secondary": "#E8D9C5",
                        "text": "#1F1713",
                        "muted": "#75665D",
                    },
                    "fonts": {"heading": "Playfair Display", "body": "Inter"},
                    "buttons": {"primary_label": copy["buy_now"], "secondary_label": copy["view_catalog"]},
                    "radius": 8,
                },
                "layout_mode_id": "editorial_luxury",
                "hero_layout": "image_left",
                "product_layout": "masonry",
                "section_density": "spacious",
            },
            {
                "id": "clean_shopify",
                "name": "Shopify limpio",
                "description": "Layout comercial claro, rapido de leer y pensado para conversion directa.",
                "logo_style": "clean wordmark",
                "background_style": "white store shell",
                "theme": {
                    "colors": {
                        "background": "#F8FAF9",
                        "surface": "#FFFFFF",
                        "primary": primary,
                        "secondary": secondary,
                        "text": "#111827",
                        "muted": "#667085",
                    },
                    "fonts": {"heading": "Poppins", "body": "Inter"},
                    "buttons": {"primary_label": copy["buy"], "secondary_label": copy["learn_more"]},
                    "radius": 8,
                },
                "layout_mode_id": "minimal_catalog",
                "hero_layout": "image_right",
                "product_layout": "grid",
                "section_density": "balanced",
            },
            {
                "id": "bold_launch",
                "name": "Lanzamiento bold",
                "description": "Mas contraste, fondo memorable y un hero fuerte para marcas nuevas o promociones.",
                "logo_style": "bold badge mark",
                "background_style": "high contrast launch",
                "theme": {
                    "colors": {
                        "background": "#14110F",
                        "surface": "#201B17",
                        "primary": "#C89B3C",
                        "secondary": "#2E2721",
                        "text": "#FFF8ED",
                        "muted": "#D7C8B5",
                    },
                    "fonts": {"heading": "Montserrat", "body": "Inter"},
                    "buttons": {"primary_label": copy["order"], "secondary_label": copy["view_products"]},
                    "radius": 8,
                },
                "layout_mode_id": "bold_launch",
                "hero_layout": "centered_hero",
                "product_layout": "boutique_grid",
                "section_density": "compact",
            },
        ],
        products_services=[
            {
                "name": item,
                "description": f"{item} {copy['for']} {payload.target_audience or copy['your_customers']}",
                "price_label": copy["ask_pricing"],
                "image_url": "",
                "button_label": copy["request_info"],
            }
            for item in items
        ],
        contact=payload.contact_info,
        editable_fields=[
            "text",
            "sections",
            "colors",
            "logo",
            "photos",
            "contact_info",
            "products_services",
            "buttons",
            "page_order",
        ],
    )


def _logo_url(payload: AiWebsiteBuilderRequest) -> str:
    for asset in payload.assets:
        if asset.asset_type == "logo":
            return asset.url
    return ""
