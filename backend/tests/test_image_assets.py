import unittest

from app.ai_site_planner import AIWebGenerationResponse, site_plan_to_updates
from app.image_assets import resolve_product_category, resolve_product_image_url


class ImageAssetTests(unittest.TestCase):
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
                "primary_color": "#9CAF88",
                "secondary_color": "#FFFFFF",
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


if __name__ == "__main__":
    unittest.main()
