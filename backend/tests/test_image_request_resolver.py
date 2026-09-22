import base64
from types import SimpleNamespace
from unittest.mock import Mock

import httpx
import pytest

from app import image_assets, image_request_resolver


@pytest.fixture(autouse=True)
def clear_unsplash_cache():
    image_assets._UNSPLASH_SEARCH_CACHE.clear()
    yield
    image_assets._UNSPLASH_SEARCH_CACHE.clear()


def test_stock_image_uses_category_to_search_unsplash(monkeypatch):
    monkeypatch.setenv("UNSPLASH_ACCESS_KEY", "test-key")
    response = Mock()
    response.raise_for_status.return_value = None
    response.json.return_value = {"results": [{
        "id": "photo-1",
        "urls": {"regular": "https://images.unsplash.com/photo-1"},
        "user": {"name": "Photographer", "links": {"html": "https://unsplash.com/@photographer"}},
        "links": {},
    }]}
    search = Mock(return_value=response)
    monkeypatch.setattr(image_assets.httpx, "get", search)

    result = image_request_resolver.resolve_image_requests(
        [{"slot_id": "hero", "image_role": "hero_candidate", "category": "workshop tools"}],
        {},
    )

    assert result == [{
        "slot_id": "hero",
        "image_role": "hero_candidate",
        "asset_url": "https://images.unsplash.com/photo-1",
        "source": "stock",
    }]
    assert "workshop tools" in search.call_args.kwargs["params"]["query"]
    assert search.call_args.kwargs["params"]["orientation"] == "landscape"


def test_stock_failure_uses_existing_fallback(monkeypatch):
    monkeypatch.setenv("UNSPLASH_ACCESS_KEY", "test-key")
    search = Mock(side_effect=httpx.ConnectError("offline"))
    monkeypatch.setattr(image_assets.httpx, "get", search)

    result = image_request_resolver.resolve_image_requests(
        [{"slot_id": "product", "image_role": "product_card", "category": "specialized parts"}],
        {},
    )

    assert result == [{
        "slot_id": "product",
        "image_role": "product_card",
        "asset_url": "/images/product-placeholder.svg",
        "source": "stock",
    }]
    search.assert_called_once()


def test_empty_stock_result_uses_existing_fallback(monkeypatch):
    monkeypatch.setenv("UNSPLASH_ACCESS_KEY", "test-key")
    response = Mock()
    response.raise_for_status.return_value = None
    response.json.return_value = {"results": []}
    monkeypatch.setattr(image_assets.httpx, "get", Mock(return_value=response))

    result = image_request_resolver.resolve_image_requests(
        [{"slot_id": "product", "image_role": "product_card", "category": "specialized parts"}],
        {},
    )

    assert result[0]["asset_url"] == "/images/product-placeholder.svg"
    assert result[0]["source"] == "stock"


def test_texture_generation_uploads_image_without_product_details(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    image_bytes = b"test-png-data"
    images = Mock()
    images.generate.return_value = SimpleNamespace(data=[
        SimpleNamespace(b64_json=base64.b64encode(image_bytes).decode("ascii"))
    ])
    client = Mock(return_value=SimpleNamespace(images=images))
    upload = Mock(return_value="https://storage.example.com/texture.png")
    monkeypatch.setattr(image_request_resolver, "OpenAI", client)
    monkeypatch.setattr(image_request_resolver, "upload_asset_to_supabase", upload)

    result = image_request_resolver.resolve_image_requests(
        [{"slot_id": "texture", "image_role": "texture_atmosphere", "category": "3d printing"}],
        {
            "business_id": "store-test",
            "site_id": "site-test",
            "industry": "3d printing",
            "business_name": "Client Brand",
            "products": [{"name": "Secret Model 500"}],
        },
    )

    assert result == [{
        "slot_id": "texture",
        "image_role": "texture_atmosphere",
        "asset_url": "https://storage.example.com/texture.png",
        "source": "generated",
    }]
    prompt = images.generate.call_args.kwargs["prompt"]
    assert "layered polymer filament" in prompt
    assert "Secret Model 500" not in prompt
    assert "Client Brand" not in prompt
    assert "No identifiable products" in prompt
    assert upload.call_args.kwargs["data"] == image_bytes
    assert upload.call_args.kwargs["business_id"] == "store-test"
    assert upload.call_args.kwargs["site_id"] == "site-test"


def test_texture_requires_storage_identity_before_api_call(monkeypatch):
    client = Mock()
    monkeypatch.setattr(image_request_resolver, "OpenAI", client)

    with pytest.raises(ValueError, match="business_id"):
        image_request_resolver.resolve_image_requests(
            [{"slot_id": "texture", "image_role": "texture_atmosphere", "category": "workshop"}],
            {},
        )

    client.assert_not_called()
