import io
import unittest

from PIL import Image

from app.logo_generation import add_watermark, build_logo_prompts


class LogoGenerationTests(unittest.TestCase):
    def test_builds_three_distinct_logo_prompts(self) -> None:
        prompts = build_logo_prompts("Bath All Day", "beauty", "organic", "#87A96B", "#FFFFFF")

        self.assertEqual(len(prompts), 3)
        self.assertEqual(len(set(prompts)), 3)
        self.assertTrue(all("Bath All Day" in prompt for prompt in prompts))
        self.assertTrue(all("#87A96B" in prompt for prompt in prompts))

    def test_watermark_makes_smaller_jpeg_preview(self) -> None:
        source = Image.new("RGB", (1400, 1000), color=(36, 88, 120))
        original = io.BytesIO()
        source.save(original, format="PNG")

        preview = add_watermark(original.getvalue())
        with Image.open(io.BytesIO(preview)) as image:
            self.assertEqual(image.format, "JPEG")
            self.assertLessEqual(max(image.size), 640)
        self.assertNotEqual(preview, original.getvalue())


if __name__ == "__main__":
    unittest.main()
