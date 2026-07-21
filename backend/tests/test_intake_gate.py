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
            fieldMeta={
                "sales_flow": {"source": "ai_recommended", "confidence": 0.9},
                "salesFlow": {"source": "ai_recommended", "confidence": 0.9},
            },
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
            fieldMeta={
                "sales_flow": {"source": "ai_recommended", "confidence": 0.9},
                "salesFlow": {"source": "ai_recommended", "confidence": 0.9},
            },
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

    def test_low_confidence_regex_sales_flow_still_blocks_generation(self) -> None:
        engine = LyraIntakeEngine()
        state = ProjectState(
            businessName="Bath All Day",
            businessDescription="Vendo catalogo de jabones y velas.",
            industry="beauty",
            salesFlow="online_sales",
            selectedLanguage="es",
            preferredTone="verde y blanco, minimalista",
            logoPreference="generate_ai_logo",
            fieldMeta={
                "sales_flow": {"source": "inferred", "confidence": 0.5},
                "salesFlow": {"source": "inferred", "confidence": 0.5},
                "brand_style": {"source": "explicit", "confidence": 1},
                "preferredTone": {"source": "explicit", "confidence": 1},
                "logo": {"source": "explicit", "confidence": 1},
                "logoPreference": {"source": "explicit", "confidence": 1},
            },
        )

        missing = engine.missing_fields_from_state(state)

        self.assertIn("sales_flow", missing)

    def test_explicit_user_choice_style_and_logo_resolve_gate(self) -> None:
        engine = LyraIntakeEngine()
        state = ProjectState(
            businessName="Bath All Day",
            businessDescription="Vendo catalogo de jabones y velas.",
            industry="beauty",
            salesFlow="online_sales",
            selectedLanguage="es",
            preferredTone="verde y blanco, minimalista y natural",
            logoPreference="generate_ai_logo",
            fieldMeta={
                "businessName": {"source": "explicit", "confidence": 1},
                "businessDescription": {"source": "explicit", "confidence": 1},
                "niche": {"source": "inferred", "confidence": 0.9},
                "industry": {"source": "inferred", "confidence": 0.9},
                "sales_flow": {"source": "ai_recommended", "confidence": 0.9},
                "salesFlow": {"source": "ai_recommended", "confidence": 0.9},
                "brand_style": {"source": "explicit_user_choice", "confidence": 1},
                "preferredTone": {"source": "explicit_user_choice", "confidence": 1},
                "logo": {"source": "explicit_user_choice", "confidence": 1},
                "logoPreference": {"source": "explicit_user_choice", "confidence": 1},
            },
        )

        missing = engine.missing_fields_from_state(state)

        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
