import json

from app.ai_site_planner import AIWebGenerationResponse, site_plan_to_updates
from app.main import build_schema_from_state
from app.models import ProjectState


PHONEHUB_BRIEF = (
    "Quiero vender telefonos y accesorios, las marcas van a ser Xiaomi, Apple, "
    "Samsung y Oppo. El negocio se llama PhoneHub. Vendo en linea con envio a domicilio."
)


def _phonehub_plan() -> AIWebGenerationResponse:
    return AIWebGenerationResponse.model_validate({
        "reasoningSummary": "Tienda de telefonos y accesorios con envio a domicilio.",
        "publicBusinessDescription": "Telefonos y accesorios para comprar en linea con entrega a domicilio.",
        "templateId": "mega-retail-store",
        "primaryCatalogType": "single_vendor_dense_catalog",
        "confidenceScore": 0.94,
        "alternativeCatalogTypes": ["premium_editorial_catalog"],
        "primaryOfferingCategory": "mega-retail-store",
        "secondaryOfferingCategories": [],
        "websiteType": "online_store",
        "catalogStrategy": "single_vendor_dense_catalog",
        "salesFlow": "online_sales",
        "targetAudience": "Personas que buscan telefonos y accesorios con entrega a domicilio",
        "brand_identity": {
            "palette_style": "tecnologico",
            "font_family_headings": "Space Grotesk",
            "font_family_body": "Inter",
            "logo_config": {
                "requires_ai_generation": False,
                "generation_prompt": "Identidad profesional y original para PhoneHub, con simbolo tecnologico propio, tipografia limpia y sin referencias ni semejanzas con marcas registradas existentes.",
            },
        },
        "pages": [{
            "pageId": "home",
            "title": "Inicio",
            "slug": "/",
            "sections": [{
                "sectionId": "hero",
                "componentType": "hero_marketplace_search",
                "copy": {
                    "headline": "Tu proximo telefono, directo a tu puerta",
                    "subheadline": "Compara telefonos y accesorios con entrega a domicilio.",
                    "ctaPrimary": "Ver telefonos",
                },
            }],
        }],
        "catalogCategories": ["Telefonos", "Accesorios"],
        "catalogItems": [
            {
                "id": "phones",
                "name": "Telefonos",
                "description": "Opciones para distintas necesidades y presupuestos.",
                "category": "Telefonos",
                "price": None,
                "price_amount": None,
                "price_label": "Precio por confirmar",
                "price_type": "quote_only",
                "imageSearchQuery": "smartphones retail display",
            },
            {
                "id": "accessories",
                "name": "Accesorios",
                "description": "Accesorios compatibles para proteger y aprovechar tu telefono.",
                "category": "Accesorios",
                "price": None,
                "price_amount": None,
                "price_label": "Precio por confirmar",
                "price_type": "quote_only",
                "imageSearchQuery": "smartphone accessories retail",
            },
        ],
        "confidence": 0.94,
    })


def test_phonehub_pipeline_preserves_verified_content_only() -> None:
    state = ProjectState(
        businessName="PhoneHub",
        businessDescription=PHONEHUB_BRIEF,
        industry="technology",
        servicesProducts=["Telefonos", "Accesorios"],
        brandsCarried=["Xiaomi", "Apple", "Samsung", "Oppo"],
        salesFlow="online_sales",
        selectedLanguage="es",
        contactInfo={},
    )
    state.update_safe(site_plan_to_updates(_phonehub_plan(), state))
    schema = build_schema_from_state(state)
    serialized = json.dumps(schema, ensure_ascii=False)
    catalog = schema["catalog_items"]

    assert state.selectedLanguage == "es"
    assert schema["business"]["selectedLanguage"] == "es"
    assert schema["business"]["description"] == state.publicBusinessDescription
    assert PHONEHUB_BRIEF not in serialized
    assert schema["contact"].get("instagram") in {None, ""}
    assert {"Telefonos", "Accesorios"} <= {item["name"] for item in catalog}
    assert not ({"Xiaomi", "Apple", "Samsung", "Oppo"} & {item["name"] for item in catalog})
    assert all(item.get("price") is None for item in catalog)
    assert all(item.get("price_amount") is None for item in catalog)
    assert all(item.get("price_type") == "quote_only" for item in catalog)
    assert all(item.get("price_label") == "Precio por confirmar" for item in catalog)
