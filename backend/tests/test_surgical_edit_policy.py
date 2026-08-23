from __future__ import annotations

import copy

from app.lyra_edit_engine import SchemaPatchOperation, apply_patch_operations
from app.surgical_edit_policy import (
    detect_surgical_edit_intent,
    filter_operations_for_intent,
    synchronize_color_mirrors,
)


def sample_schema():
    return {
        "business": {"name": "Bath All Day", "industry": "beauty"},
        "theme": {
            "colors": {
                "primary": "#0e7c66",
                "secondary": "#f59e0b",
                "background": "#ffffff",
                "text": "#111827",
            },
            "fonts": {"heading": "Space Grotesk", "body": "Inter"},
        },
        "selected_template": {"id": "premium-product-store"},
        "pages": [
            {
                "page_key": "home",
                "sections": [
                    {
                        "id": "hero-main",
                        "type": "PremiumHero",
                        "editable": {
                            "headline": "Rituales para todos los dias",
                            "subtitle": "Jabones y velas artesanales",
                            "image_url": "https://images.example/hero-old.jpg",
                        },
                    },
                    {
                        "id": "story",
                        "type": "AboutStory",
                        "editable": {"headline": "Nuestra historia", "text": "Hecho a mano."},
                    },
                ],
            }
        ],
        "catalog_items": [
            {
                "id": "soap",
                "name": "Jabon Lavanda",
                "description": "Suave y artesanal",
                "price": 12,
                "image_url": "https://images.example/soap-old.jpg",
            },
            {
                "id": "candle",
                "name": "Vela Calma",
                "description": "Aroma sereno",
                "price": 18,
                "image_url": "https://images.example/candle.jpg",
            },
        ],
        "contact": {"email": "hello@bathallday.test"},
    }


def apply_filtered(schema, instruction, operations):
    intent = detect_surgical_edit_intent(instruction, schema)
    safe = filter_operations_for_intent(operations, intent)
    result = apply_patch_operations(schema, safe)
    synchronize_color_mirrors(schema, result, intent)
    return intent, safe, result


def test_color_edit_rejects_unrelated_copy_and_catalog_changes():
    original = sample_schema()
    operations = [
        SchemaPatchOperation(op="replace", path="/theme/colors/primary", value="#2563eb"),
        SchemaPatchOperation(op="replace", path="/pages/0/sections/0/editable/headline", value="Changed too"),
        SchemaPatchOperation(op="replace", path="/catalog_items/0/name", value="Changed too"),
    ]

    intent, safe, result = apply_filtered(original, "Cambia el color a azul", operations)

    assert intent.kind == "color"
    assert [operation.path for operation in safe] == ["/theme/colors/primary"]
    expected = copy.deepcopy(original)
    expected["theme"]["colors"]["primary"] = "#2563eb"
    expected["brand"] = {"primaryColor": "#2563eb", "buttonColor": "#2563eb"}
    expected["revision_history"] = [
        {"source": "lyra_edit_patch", "changed_fields": ["/theme/colors/primary"]}
    ]
    assert result == expected


def test_section_text_edit_is_limited_to_the_named_section_and_field():
    original = sample_schema()
    operations = [
        SchemaPatchOperation(op="replace", path="/pages/0/sections/0/editable/headline", value="Tu pausa empieza aqui"),
        SchemaPatchOperation(op="replace", path="/pages/0/sections/1/editable/text", value="Changed too"),
        SchemaPatchOperation(op="replace", path="/theme/colors/primary", value="#000000"),
    ]

    intent, safe, result = apply_filtered(
        original,
        'Cambia el titulo del hero a "Tu pausa empieza aqui"',
        operations,
    )

    assert intent.kind == "section_text"
    assert [operation.path for operation in safe] == ["/pages/0/sections/0/editable/headline"]
    expected = copy.deepcopy(original)
    expected["pages"][0]["sections"][0]["editable"]["headline"] = "Tu pausa empieza aqui"
    expected["revision_history"] = [
        {
            "source": "lyra_edit_patch",
            "changed_fields": ["/pages/0/sections/0/editable/headline"],
        }
    ]
    assert result == expected


def test_product_rename_cannot_modify_another_product_or_its_price():
    original = sample_schema()
    operations = [
        SchemaPatchOperation(op="replace", path="/catalog_items/0/name", value="Jabon de Lavanda"),
        SchemaPatchOperation(op="replace", path="/catalog_items/0/price", value=99),
        SchemaPatchOperation(op="replace", path="/catalog_items/1/name", value="Changed too"),
    ]

    intent, safe, result = apply_filtered(
        original,
        'El nombre del producto "Jabon Lavanda" esta mal, cambialo a "Jabon de Lavanda"',
        operations,
    )

    assert intent.kind == "product"
    assert [operation.path for operation in safe] == ["/catalog_items/0/name"]
    expected = copy.deepcopy(original)
    expected["catalog_items"][0]["name"] = "Jabon de Lavanda"
    expected["revision_history"] = [
        {"source": "lyra_edit_patch", "changed_fields": ["/catalog_items/0/name"]}
    ]
    assert result == expected


def test_hero_image_edit_cannot_touch_product_images_or_copy():
    original = sample_schema()
    operations = [
        SchemaPatchOperation(
            op="replace",
            path="/pages/0/sections/0/editable/image_url",
            value="https://images.example/hero-new.jpg",
        ),
        SchemaPatchOperation(op="replace", path="/catalog_items/0/image_url", value="https://images.example/wrong.jpg"),
        SchemaPatchOperation(op="replace", path="/pages/0/sections/0/editable/headline", value="Changed too"),
    ]

    intent, safe, result = apply_filtered(
        original,
        "Cambia la imagen del hero por https://images.example/hero-new.jpg",
        operations,
    )

    assert intent.kind == "image"
    assert [operation.path for operation in safe] == ["/pages/0/sections/0/editable/image_url"]
    expected = copy.deepcopy(original)
    expected["pages"][0]["sections"][0]["editable"]["image_url"] = "https://images.example/hero-new.jpg"
    expected["revision_history"] = [
        {
            "source": "lyra_edit_patch",
            "changed_fields": ["/pages/0/sections/0/editable/image_url"],
        }
    ]
    assert result == expected
