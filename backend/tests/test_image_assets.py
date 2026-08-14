import unittest
from unittest.mock import Mock, patch

from app.ai_site_planner import AIWebGenerationResponse, site_plan_to_updates
from app.image_assets import (
    _UNSPLASH_SEARCH_CACHE,
    build_image_asset,
    resolve_product_category,
    resolve_product_image_url,
)
from app.models import ProjectState


def _catalog_plan(items: list[dict]) -> AIWebGenerationResponse:
    return AIWebGenerationResponse.model_validate({
        "reasoningSummary": "Bath product store",
        "templateId": "mega-retail-store",
        "websiteType": "online_store",
        "catalogStrategy": "single_vendor_dense_catalog",
        "salesFlow": "online_sales",
        "targetAudience": "Bath and self-care shoppers",
        "brand_identity": {
            "palette_style": "organico",
            "font_family_headings": "Fraunces",
            "font_family_body": "Inter",
            "logo_config": {
                "requires_ai_generation": False,
                "generation_prompt": "Minimalist flat vector logo for a beauty brand named Bath All Day, organico style, geometric clean shapes, solid colors, no gradients, high detail, white background, trending on Dribbble --vector",
            },
        },
        "pages": [],
        "catalogCategories": ["Bath"],
        "catalogItems": items,
        "confidence": 0.9,
    })


def _catalog_item(name: str, index: int) -> dict:
    return {
        "id": f"prod_{index:03d}",
        "name": name,
        "description": f"Professional public description for {name}.",
        "category": "Bath",
        "price": 10 + index,
        "price_amount": 10 + index,
        "price_label": f"USD {10 + index:.2f}",
        "imageSearchQuery": name.lower(),
    }


class ImageAssetTests(unittest.TestCase):
    def setUp(self) -> None:
        _UNSPLASH_SEARCH_CACHE.clear()
        self._env_patcher = patch.dict("os.environ", {"UNSPLASH_ACCESS_KEY": ""})
        self._env_patcher.start()

    def tearDown(self) -> None:
        self._env_patcher.stop()

    def test_client_named_products_are_preserved_over_invented_llm_catalog(self) -> None:
        state = ProjectState(
            businessName="Bath All Day",
            businessDescription="Handmade soaps, candles and bath bombs.",
            industry="beauty",
            servicesProducts=["Lavender Bar Soap", "Vanilla Bean Candle", "Eucalyptus Bath Bomb"],
            salesFlow="online_sales",
        )
        plan = _catalog_plan([
            _catalog_item("Ocean Mist Body Wash", 1),
            _catalog_item("Rose Clay Mask", 2),
            _catalog_item("Citrus Body Scrub", 3),
            _catalog_item("Herbal Gift Set", 4),
        ])

        catalog = site_plan_to_updates(plan, state)["catalogItems"]

        self.assertEqual(
            [item["name"] for item in catalog[:3]],
            state.servicesProducts,
        )
        self.assertEqual(len(catalog), 4)

    def test_single_client_product_is_preserved_and_seed_catalog_fills_to_four(self) -> None:
        state = ProjectState(
            businessName="Bath All Day",
            businessDescription="Handmade bath and body products.",
            industry="beauty",
            servicesProducts=["Lavender Bar Soap"],
            salesFlow="online_sales",
        )
        plan = _catalog_plan([_catalog_item("Invented Generic Set", 1)])

        updates = site_plan_to_updates(plan, state)
        catalog = updates["catalogItems"]

        self.assertEqual(catalog[0]["name"], "Lavender Bar Soap")
        self.assertGreaterEqual(len(catalog), 4)
        self.assertEqual(updates["catalogSource"], "seed_fallback")

    def test_ai_catalog_reconciles_real_3d_offerings_without_seed_fallback(self) -> None:
        state = ProjectState(
            businessName="Mi Mundo 3D",
            businessDescription="Impresoras 3D, materiales, accesorios y cursos online.",
            industry="technology",
            servicesProducts=[
                "Impresoras 3D",
                "Accesorios para impresoras 3D",
                "Materiales y equipos para imprimir",
                "Cursos online de como hacer los productos",
            ],
            salesFlow="online_sales",
        )
        plan = _catalog_plan([
            {**_catalog_item("Impresora 3D Avanzada", 1), "category": "Impresoras 3D"},
            {**_catalog_item("Kit de Accesorios para Impresoras 3D", 2), "category": "Accesorios"},
            {**_catalog_item("Filamento PLA Premium", 3), "category": "Materiales"},
            {**_catalog_item("Curso Online: Introducción a la Impresión 3D", 4), "category": "Cursos"},
        ])

        updates = site_plan_to_updates(plan, state)

        self.assertEqual(updates["catalogSource"], "ai_generated")
        self.assertEqual([item["name"] for item in updates["catalogItems"]], state.servicesProducts)
        self.assertIn("Impresora 3D Avanzada", updates["catalogItems"][0]["description"])

    def test_vanilla_candle_prefers_product_identity_over_home_description(self) -> None:
        product = {
            "name": "Vanilla Bean Candle",
            "description": "A warm vanilla scented candle for bath and home rituals.",
            "category": "candles",
            "imageSearchQuery": "vanilla bean candle",
        }

        self.assertEqual(resolve_product_category(product, "bath all day jabones velas"), "belleza")

    def test_vanilla_candle_never_uses_dynamic_unsplash_source_url(self) -> None:
        product = {
            "name": "Vanilla Bean Candle",
            "description": "A warm vanilla scented candle for bath and home rituals.",
            "category": "candles",
            "imageSearchQuery": "vanilla bean candle",
            "image_url": "https://source.unsplash.com/900x900/?scented-candle",
        }

        url = resolve_product_image_url(product, "bath all day jabones velas")

        self.assertIn("images.unsplash.com/photo-", url)
        self.assertNotIn("source.unsplash.com", url)

    def test_home_candle_prefers_home_decor_seed_image(self) -> None:
        product = {
            "name": "Aromatic Candle Set",
            "description": "Decor candle set for living room ambience.",
            "category": "home decor",
            "imageSearchQuery": "aromatic-candle-set",
        }

        url = resolve_product_image_url(product, "home decor brand")

        self.assertIn("photo-1484154218962", url)
        self.assertNotIn("photo-1596462502278", url)

    def test_site_plan_ignores_llm_catalog_image_url(self) -> None:
        hallucinated_url = "https://images.unsplash.com/photo-1582719478181-2f4b2f1d4c4e?auto=format&fit=crop&w=900&q=82"
        plan = AIWebGenerationResponse.model_validate({
            "reasoningSummary": "Bath product store",
            "templateId": "mega-retail-store",
            "websiteType": "online_store",
            "catalogStrategy": "single_vendor_dense_catalog",
            "salesFlow": "online_sales",
            "targetAudience": "Bath and self-care shoppers",
            "brand_identity": {
                "palette_style": "organico",
                "font_family_headings": "Fraunces",
                "font_family_body": "Inter",
                "logo_config": {
                    "requires_ai_generation": False,
                    "generation_prompt": "Minimalist flat vector logo for a beauty brand named Bath All Day, organico style, geometric clean shapes, solid colors, no gradients, high detail, white background, trending on Dribbble --vector",
                },
            },
            "pages": [],
            "catalogCategories": ["Soaps"],
            "catalogItems": [{
                "id": "prod_001",
                "name": "Lavender Bliss Soap",
                "description": "A calming handmade lavender soap for relaxing bath rituals.",
                "category": "Soaps",
                "price": 12.99,
                "price_amount": 12.99,
                "price_label": "USD 12.99",
                "imageSearchQuery": "lavender soap",
                "image_url": hallucinated_url,
            }],
            "confidence": 0.9,
        })

        item = site_plan_to_updates(plan)["catalogItems"][0]

        self.assertNotEqual(item["image_url"], hallucinated_url)
        self.assertEqual(item["image_asset"]["source"], "seed_bank")
        self.assertIn("images.unsplash.com/photo-", item["image_url"])

    @patch("app.image_assets.httpx.get")
    def test_missing_unsplash_key_uses_seed_bank_without_network(self, mocked_get) -> None:
        asset = build_image_asset({"name": "Lavender Soap", "imageSearchQuery": "lavender soap"})

        self.assertEqual(asset["source"], "seed_bank")
        mocked_get.assert_not_called()

    @patch("app.image_assets.httpx.get")
    def test_unsplash_api_error_falls_back_to_seed_bank(self, mocked_get) -> None:
        import httpx

        mocked_get.side_effect = httpx.ConnectError("offline")
        with patch.dict("os.environ", {"UNSPLASH_ACCESS_KEY": "test-key"}):
            asset = build_image_asset({"name": "Lavender Soap", "imageSearchQuery": "lavender soap"})

        self.assertEqual(asset["source"], "seed_bank")
        self.assertIn("images.unsplash.com/photo-", asset["url"])

    @patch("app.image_assets.httpx.get")
    def test_unsplash_result_keeps_attribution_tracks_download_and_is_cached(self, mocked_get) -> None:
        search_response = Mock()
        search_response.raise_for_status.return_value = None
        search_response.json.return_value = {
            "results": [{
                "id": "photo-123",
                "urls": {"regular": "https://images.unsplash.com/photo-live"},
                "links": {"download_location": "https://api.unsplash.com/photos/photo-123/download"},
                "user": {"name": "Ada Photo", "links": {"html": "https://unsplash.com/@ada"}},
            }]
        }
        tracking_response = Mock()
        tracking_response.raise_for_status.return_value = None
        mocked_get.side_effect = [search_response, tracking_response, tracking_response]

        with patch.dict("os.environ", {"UNSPLASH_ACCESS_KEY": "test-key"}):
            first = build_image_asset({"name": "Lavender Soap", "imageSearchQuery": "lavender soap"})
            second = build_image_asset({"name": "Lavender Soap", "imageSearchQuery": "lavender soap"})

        self.assertEqual(first["source"], "unsplash_api")
        self.assertEqual(first["photographer_name"], "Ada Photo")
        self.assertIn("utm_source=kreaton", first["photographer_profile_url"])
        self.assertEqual(second["url"], first["url"])
        search_calls = [call for call in mocked_get.call_args_list if call.args and call.args[0].endswith("/search/photos")]
        self.assertEqual(len(search_calls), 1)
        self.assertEqual(mocked_get.call_count, 3)


if __name__ == "__main__":
    unittest.main()
