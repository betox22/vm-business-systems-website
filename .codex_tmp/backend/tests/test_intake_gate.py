import unittest

from app.lyra_intake_engine import LyraIntakeEngine
from app.models import ProjectState


def _base_payload() -> dict:
    return {
        "updatedFields": {},
        "detectedIntent": {
            "businessModel": "online_store",
            "commerceMode": "single_vendor",
            "salesFlow": "online_sales",
            "niche": "beauty",
            "confidence": 0.9,
        },
        "missingCriticalFields": [],
        "reasoning": "",
        "nextQuestion": None,
        "canGenerate": False,
        "templateRecommendation": None,
    }


class IntakeGateTests(unittest.TestCase):
    def test_intake_without_colors_or_logo_cannot_generate(self) -> None:
        engine = LyraIntakeEngine()
        state = ProjectState(
            businessName="Bath All Day",
            businessDescription="Online store for bath and body care products.",
            industry="beauty",
            salesFlow="online_sales",
            selectedLanguage="es",
        )

        decision = engine._decision_from_tool_payload(_base_payload(), state)

        self.assertFalse(decision.canGenerate)
        self.assertIn("brand_style", decision.missingCriticalFields)
        self.assertIn("logo", decision.missingCriticalFields)

    def test_intake_with_tu_decide_style_can_generate_when_logo_is_resolved(self) -> None:
        engine = LyraIntakeEngine()
        state = ProjectState(
            businessName="Bath All Day",
            businessDescription="Online store for bath and body care products.",
            industry="beauty",
            salesFlow="online_sales",
            selectedLanguage="es",
        )
        payload = _base_payload()
        payload["updatedFields"] = {
            "brand_style": {
                "value": {"path": "explicit_delegation", "style": "tú decide"},
                "source": "explicit_delegation",
                "confidence": 0.95,
            },
            "logo": {
                "value": {"path": "explicit_skip"},
                "source": "explicit",
                "confidence": 0.95,
            },
        }

        decision = engine._decision_from_tool_payload(payload, state)

        self.assertTrue(decision.canGenerate)
        self.assertEqual(decision.missingCriticalFields, [])


if __name__ == "__main__":
    unittest.main()
