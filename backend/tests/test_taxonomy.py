import unittest

from app.taxonomy import infer_seed_profile, normalize_niche


class TaxonomyTests(unittest.TestCase):
    def test_infer_seed_profile_maps_bath_brand_to_beauty(self) -> None:
        self.assertEqual(infer_seed_profile("bath all day"), "beauty")

    def test_common_service_aliases_map_to_supported_niches(self) -> None:
        cases = {
            "Beauty salon": "beauty",
            "pet grooming": "pets",
            "tutoring": "education",
            "photography studio": "professional_services",
            "landscaping": "home_services",
        }
        for value, expected in cases.items():
            with self.subTest(value=value):
                self.assertEqual(normalize_niche(value), expected)


if __name__ == "__main__":
    unittest.main()
