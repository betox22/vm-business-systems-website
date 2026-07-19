import unittest

from app.taxonomy import infer_seed_profile


class TaxonomyTests(unittest.TestCase):
    def test_infer_seed_profile_maps_bath_brand_to_beauty(self) -> None:
        self.assertEqual(infer_seed_profile("bath all day"), "beauty")


if __name__ == "__main__":
    unittest.main()
