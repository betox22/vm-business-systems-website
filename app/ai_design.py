import json

from openai import OpenAI

from .config import get_settings
from .schemas import GeneratedStoreConfig, StoreDesign


STORE_DESIGN_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["palette", "typography", "sections", "tone"],
    "properties": {
        "palette": {
            "type": "object",
            "additionalProperties": False,
            "required": ["background", "surface", "primary", "secondary", "text"],
            "properties": {
                "background": {"type": "string"},
                "surface": {"type": "string"},
                "primary": {"type": "string"},
                "secondary": {"type": "string"},
                "text": {"type": "string"},
            },
        },
        "typography": {
            "type": "object",
            "additionalProperties": False,
            "required": ["heading", "body"],
            "properties": {
                "heading": {"type": "string"},
                "body": {"type": "string"},
            },
        },
        "sections": {
            "type": "array",
            "items": {
                "type": "string",
                "enum": [
                    "hero",
                    "productos_destacados",
                    "categorias",
                    "sobre_nosotros",
                    "testimonios",
                    "contacto",
                ],
            },
        },
        "tone": {"type": "string"},
    },
}

STORE_CONFIG_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": [
        "schema_version",
        "store_type",
        "store",
        "theme",
        "layout_mode",
        "integrations",
        "custom_logic",
        "sections",
        "products",
    ],
    "properties": {
        "schema_version": {"type": "string"},
        "store_type": {"type": "string", "enum": ["retail", "funnel", "service"]},
        "store": {
            "type": "object",
            "additionalProperties": False,
            "required": ["name", "headline", "description", "currency", "whatsapp", "instagram"],
            "properties": {
                "name": {"type": "string"},
                "headline": {"type": "string"},
                "description": {"type": "string"},
                "currency": {"type": "string"},
                "whatsapp": {"type": "string"},
                "instagram": {"type": "string"},
            },
        },
        "theme": {
            "type": "object",
            "additionalProperties": False,
            "required": ["palette_id", "colors", "font_pairing_id", "fonts"],
            "properties": {
                "palette_id": {"type": "string"},
                "colors": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["background", "primary", "secondary", "text_color"],
                    "properties": {
                        "background": {"type": "string"},
                        "primary": {"type": "string"},
                        "secondary": {"type": "string"},
                        "text_color": {"type": "string"},
                    },
                },
                "font_pairing_id": {"type": "string"},
                "fonts": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["heading", "body"],
                    "properties": {
                        "heading": {"type": "string"},
                        "body": {"type": "string"},
                    },
                },
            },
        },
        "layout_mode": {
            "type": "object",
            "additionalProperties": True,
        },
        "integrations": {
            "type": "object",
            "additionalProperties": True,
        },
        "custom_logic": {
            "type": "object",
            "additionalProperties": True,
        },
        "sections": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["type", "order", "content"],
                "properties": {
                    "type": {
                        "type": "string",
                        "enum": [
                            "HeroBanner_Tipo1",
                            "ProductGrid_4Columnas",
                            "Categorias_Bloques",
                            "SobreNosotros_Simple",
                            "Contacto_Simple",
                        ],
                    },
                    "order": {"type": "integer"},
                    "content": {"type": "object", "additionalProperties": True},
                },
            },
        },
        "products": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["name", "price", "tag", "image"],
                "properties": {
                    "name": {"type": "string"},
                    "price": {"type": "number"},
                    "tag": {"type": "string"},
                    "image": {"type": "string"},
                },
            },
        },
    },
}


def generate_store_design(description: str) -> StoreDesign:
    settings = get_settings()
    client = OpenAI()
    response = client.responses.create(
        model=settings.openai_model,
        input=[
            {
                "role": "system",
                "content": (
                    "Eres un director de arte para tiendas online. "
                    "Devuelve solo JSON valido con estructura visual usable."
                ),
            },
            {
                "role": "user",
                "content": (
                    "Genera la estructura de pagina para esta tienda: "
                    f"{description}"
                ),
            },
        ],
        text={
            "format": {
                "type": "json_schema",
                "name": "store_design",
                "schema": STORE_DESIGN_SCHEMA,
                "strict": True,
            }
        },
    )
    return StoreDesign.model_validate(json.loads(response.output_text))


def generate_store_config(description: str) -> GeneratedStoreConfig:
    settings = get_settings()
    client = OpenAI()
    response = client.responses.create(
        model=settings.openai_model,
        input=[
            {
                "role": "system",
                "content": (
                    "Eres un estratega y diseñador senior de tiendas online. "
                    "Tu objetivo es crear configuraciones listas para que un "
                    "operador interno genere paginas web y tiendas online para clientes. "
                    "No generes restaurantes ni menus. Usa retail, funnel o service."
                ),
            },
            {
                "role": "user",
                "content": (
                    "Crea un JSON completo de tienda online basado en esta descripcion: "
                    f"{description}. Incluye textos comerciales, secciones, tema, "
                    "layout_mode, integrations y custom_logic seguro en reglas JSON."
                ),
            },
        ],
        text={
            "format": {
                "type": "json_schema",
                "name": "generated_store_config",
                "schema": STORE_CONFIG_SCHEMA,
                "strict": True,
            }
        },
    )
    return GeneratedStoreConfig.model_validate(json.loads(response.output_text))
