import base64
import json
from types import SimpleNamespace
from unittest.mock import Mock

import pytest

from app import image_assets, image_request_resolver, section_composer
from app.agents import StrategyAgent, detect_business_archetypes


COPY = {
    "headline": "Sube tu STL y lo imprimimos",
    "subtitle": "Cuéntanos qué necesitas para preparar una cotización.",
    "upload_label": "Archivo 3D",
    "name_label": "Nombre",
    "contact_label": "Contacto",
    "material_label": "Material",
    "color_label": "Color",
    "quantity_label": "Cantidad",
    "notes_label": "Notas",
    "submit_label": "Solicitar cotización",
}


@pytest.mark.parametrize("text", [
    "Impresión 3D personalizada",
    "Venta de impresoras 3D y filamento",
    "Taller que recibe archivos STL",
    "3D printing and prototyping",
])
def test_detected_3d_archetype_preserves_existing_template_choice(text):
    assert detect_business_archetypes(text) == {"custom_order_upload"}
    template_id, _ = StrategyAgent()._select_template_id(text.lower(), 1, None)
    assert template_id == "premium-product-store"


def test_custom_order_section_is_only_eligible_for_3d_archetype():
    section_id = "quote-upload--custom-order"
    assert section_id not in section_composer._load_eligible_sections(set())
    manifest = section_composer._load_eligible_sections({"custom_order_upload"})[section_id]
    assert manifest["section_type"] == "quote_upload"
    assert manifest["eligibility"]["requires_archetype"] == "custom_order_upload"
    assert set(manifest["required_copy_fields"]) == set(COPY)
    assert {slot["image_role"] for slot in manifest["image_slots"]} == {
        "process_shot", "texture_atmosphere",
    }


def test_3d_brief_composes_quote_upload_and_resolves_all_images(monkeypatch):
    business_text = "Taller de impresión 3D: sube tu STL y te lo imprimimos."
    archetypes = detect_business_archetypes(business_text)
    section_id = "quote-upload--custom-order"
    proposal = {"sections": [{
        "section_id": section_id,
        "copy": [{"field": field, "value": value} for field, value in COPY.items()],
        "image_requests": [
            {"slot_id": "process_image", "image_role": "process_shot", "category": "3d printing workshop"},
            {"slot_id": "material_texture", "image_role": "texture_atmosphere", "category": "3d printing"},
        ],
    }]}
    composer_calls = []

    class ComposerClient:
        def __init__(self, **kwargs):
            self.chat = SimpleNamespace(completions=SimpleNamespace(create=self.create))

        def create(self, **kwargs):
            composer_calls.append(kwargs)
            return SimpleNamespace(choices=[SimpleNamespace(
                finish_reason="stop",
                message=SimpleNamespace(content=json.dumps(proposal), refusal=None, tool_calls=None),
            )])

    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("UNSPLASH_ACCESS_KEY", "test-key")
    monkeypatch.setattr(section_composer.agents, "OpenAI", ComposerClient)
    monkeypatch.setattr(image_assets, "_search_unsplash_photo", Mock(return_value={
        "url": "https://images.unsplash.com/photo-test",
        "photographer_name": "Test Photographer",
        "photographer_profile_url": "https://unsplash.com/@test",
    }))
    monkeypatch.setattr(image_assets, "_track_unsplash_download", Mock())

    image_bytes = b"generated-texture-data"
    images = Mock()
    images.generate.return_value = SimpleNamespace(data=[SimpleNamespace(
        b64_json=base64.b64encode(image_bytes).decode("ascii"),
    )])
    monkeypatch.setattr(image_request_resolver, "OpenAI", Mock(
        return_value=SimpleNamespace(images=images),
    ))
    upload = Mock(return_value="https://storage.example.com/texture.png")
    monkeypatch.setattr(image_request_resolver, "upload_asset_to_supabase", upload)

    layout = section_composer.compose_layout({"business_name": "Taller 3D", "description": business_text}, archetypes)
    resolved = image_request_resolver.resolve_image_requests(
        layout["sections"][0]["image_requests"],
        {"business_id": "store-test", "site_id": "site-test", "industry": "3d printing"},
    )

    assert layout["sections"][0]["section_id"] == section_id
    assert layout["sections"][0]["copy"] == COPY
    assert resolved == [
        {"slot_id": "process_image", "image_role": "process_shot", "asset_url": "https://images.unsplash.com/photo-test", "source": "stock"},
        {"slot_id": "material_texture", "image_role": "texture_atmosphere", "asset_url": "https://storage.example.com/texture.png", "source": "generated"},
    ]
    envelope = json.loads(composer_calls[0]["messages"][1]["content"])
    assert section_id in {section["section_id"] for section in envelope["eligible_sections"]}
    image_assets._search_unsplash_photo.assert_called_once()
    images.generate.assert_called_once()
    assert upload.call_args.kwargs["data"] == image_bytes
