import unittest

from app.agents import StrategyAgent


class StrategyAgentTests(unittest.TestCase):
    def test_spanish_plural_cursos_selects_education_template(self) -> None:
        template_id, reason = StrategyAgent()._select_template_id(
            "academia de cursos online de fotografia profesional",
            product_count=3,
            existing_template_id=None,
        )

        self.assertEqual(template_id, "education-course-academy-pro")
        self.assertIn("education", reason)


if __name__ == "__main__":
    unittest.main()
