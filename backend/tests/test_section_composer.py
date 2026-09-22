import json
from types import SimpleNamespace

import pytest

from app import section_composer


@pytest.fixture
def composer_library(tmp_path, monkeypatch):
    def add(section_id, requirement=None, fields=None, slots=None):
        directory = tmp_path / section_id
        directory.mkdir()
        (directory / "manifest.json").write_text(json.dumps({
            "id": section_id,
            "section_type": "hero",
            "source_template": "Test Template",
            "eligibility": {"requires_archetype": requirement},
            "required_copy_fields": fields if fields is not None else ["headline", "subtitle"],
            "image_slots": slots if slots is not None else [{
                "slot_id": "hero_image",
                "image_role": "hero_candidate",
                "min": 0,
                "max": 1,
            }],
            "animation_profile": "none",
            "html_partial": f"{section_id}/section.html",
            "css_partial": f"{section_id}/section.css",
        }), encoding="utf-8")

    add("open-hero")
    add("maker-hero", requirement="maker")
    monkeypatch.setattr(section_composer, "SECTION_LIBRARY_DIR", tmp_path)
    monkeypatch.setenv("OPENAI_API_KEY", "test-only-key")
    return add


@pytest.fixture
def openai_reply(monkeypatch):
    calls = []

    def set_reply(payload):
        class Client:
            def __init__(self, **kwargs):
                calls.append({"client": kwargs})
                self.chat = SimpleNamespace(completions=SimpleNamespace(create=self.create))

            def create(self, **kwargs):
                calls.append({"request": kwargs})
                return SimpleNamespace(choices=[SimpleNamespace(
                    finish_reason="stop",
                    message=SimpleNamespace(content=json.dumps(payload), refusal=None, tool_calls=None),
                )])

        monkeypatch.setattr(section_composer.agents, "OpenAI", Client)
        return calls

    return set_reply


def proposal(section_id="open-hero", copy=None, role="hero_candidate"):
    return {"sections": [{
        "section_id": section_id,
        "copy": copy if copy is not None else [
            {"field": "headline", "value": "Built for makers"},
            {"field": "subtitle", "value": "Tools and supplies"},
        ],
        "image_requests": [{"slot_id": "hero_image", "image_role": role, "category": "workshop tools"}],
    }]}


def test_compose_layout_selects_eligible_section_and_returns_copy_and_image_request(composer_library, openai_reply, monkeypatch):
    calls = openai_reply(proposal("maker-hero"))
    monkeypatch.setenv("OPENAI_COMPOSER_MODEL", "composer-test-model")

    result = section_composer.compose_layout({"name": "BuildRight"}, ["maker"])

    assert result == {"sections": [{
        "section_id": "maker-hero",
        "copy": {"headline": "Built for makers", "subtitle": "Tools and supplies"},
        "image_requests": [{"slot_id": "hero_image", "image_role": "hero_candidate", "category": "workshop tools"}],
    }]}
    request = calls[-1]["request"]
    assert request["model"] == "composer-test-model"
    assert set(request["response_format"]["json_schema"]["schema"]["properties"]["sections"]["items"]["properties"]["section_id"]["enum"]) == {"open-hero", "maker-hero"}
    envelope = json.loads(request["messages"][1]["content"])
    assert envelope["business_schema"] == {"name": "BuildRight"}
    assert all("html_partial" not in section and "css_partial" not in section for section in envelope["eligible_sections"])


def test_compose_layout_rejects_section_outside_filtered_catalog(composer_library, openai_reply):
    openai_reply(proposal("maker-hero"))

    with pytest.raises(ValueError, match="Invalid section_id"):
        section_composer.compose_layout({"name": "BuildRight"}, [])


def test_compose_layout_rejects_missing_required_copy_field(composer_library, openai_reply):
    openai_reply(proposal(copy=[{"field": "headline", "value": "Built for makers"}]))

    with pytest.raises(ValueError, match="Invalid copy fields"):
        section_composer.compose_layout({"name": "BuildRight"}, [])


def test_compose_layout_rejects_invalid_image_role(composer_library, openai_reply):
    openai_reply(proposal(role="unapproved_role"))

    with pytest.raises(ValueError, match="image_role"):
        section_composer.compose_layout({"name": "BuildRight"}, [])


def test_compose_layout_rejects_wrong_slot_role_and_image_url(composer_library, openai_reply):
    openai_reply(proposal(role="portrait"))
    with pytest.raises(ValueError, match="Invalid image role"):
        section_composer.compose_layout({"name": "BuildRight"}, [])

    openai_reply({"sections": [{
        **proposal()["sections"][0],
        "image_requests": [{"slot_id": "hero_image", "image_role": "hero_candidate", "category": "https://example.com/image.jpg"}],
    }]})
    with pytest.raises(ValueError, match="category"):
        section_composer.compose_layout({"name": "BuildRight"}, [])


def test_compose_layout_requires_configuration_without_api_call(composer_library, monkeypatch):
    monkeypatch.delenv("OPENAI_COMPOSER_MODEL", raising=False)
    monkeypatch.delenv("OPENAI_MODEL", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    with pytest.raises(RuntimeError, match="not configured"):
        section_composer.compose_layout({"name": "BuildRight"}, [])


def test_compose_layout_uses_default_model(composer_library, openai_reply, monkeypatch):
    calls = openai_reply(proposal())
    monkeypatch.delenv("OPENAI_COMPOSER_MODEL", raising=False)
    monkeypatch.delenv("OPENAI_MODEL", raising=False)

    section_composer.compose_layout({"name": "BuildRight"}, [])

    assert calls[-1]["request"]["model"] == "gpt-6-astra"


def test_real_section_library_contains_catalog_and_hero_sections():
    manifests = section_composer._load_eligible_sections(set())

    assert "mega-retail-store--home--hero" in manifests
    assert "mega-retail-store--home--catalog" in manifests
    assert manifests["mega-retail-store--home--hero"]["required_copy_fields"]
