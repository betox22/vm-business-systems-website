import unittest

from app.lyra_intake_engine import DetectedIntent, FieldMeta, LyraIntakeDecision, LyraIntakeEngine
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
            servicesProducts=["Lavender soap", "Vanilla candle"],
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
            servicesProducts=["Lavender soap", "Vanilla candle"],
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
            servicesProducts=["Jabón de lavanda", "Vela de vainilla"],
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
            servicesProducts=["Jabón de lavanda", "Vela de vainilla"],
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

    def test_explicit_sales_flow_followup_resolves_unknown_industry(self) -> None:
        engine = LyraIntakeEngine()
        state = ProjectState(
            businessName="Northstar Mobile Notary",
            businessDescription="Mobile document signing appointments for local clients.",
            industry="mobile notary. Take bookings",
            servicesProducts=["Mobile notarization", "Document signing appointment"],
            salesFlow="booking",
            selectedLanguage="en",
            preferredTone="calm and professional",
            logoPreference="explicit_skip",
            fieldMeta={
                "industry": {"source": "explicit_user_choice", "confidence": 1},
                "niche": {"source": "explicit_user_choice", "confidence": 1},
                "salesFlow": {"source": "explicit_user_choice", "confidence": 1},
                "sales_flow": {"source": "explicit_user_choice", "confidence": 1},
                "brand_style": {"source": "explicit", "confidence": 1},
                "preferredTone": {"source": "explicit", "confidence": 1},
                "logo": {"source": "explicit", "confidence": 1},
            },
        )

        self.assertEqual(engine.missing_fields_from_state(state), [])

    def test_informational_business_does_not_require_catalog_depth(self) -> None:
        engine = LyraIntakeEngine()
        state = ProjectState(
            businessName="Northstar Foundation",
            businessDescription="An informational site presenting our community mission.",
            industry="nonprofit",
            salesFlow="informational",
            preferredTone="clear and trustworthy",
            logoPreference="explicit_skip",
            fieldMeta={
                "niche": {"source": "explicit_user_choice", "confidence": 1},
                "sales_flow": {"source": "explicit", "confidence": 1},
                "salesFlow": {"source": "explicit", "confidence": 1},
                "brand_style": {"source": "explicit", "confidence": 1},
                "logo": {"source": "explicit", "confidence": 1},
            },
        )

        self.assertNotIn("services_products", engine.missing_fields_from_state(state))

    def test_services_products_slot_resolves_catalog_depth_gate(self) -> None:
        engine = LyraIntakeEngine()
        state = ProjectState(
            businessName="Bath All Day",
            businessDescription="Handmade bath products sold online.",
            industry="beauty",
            servicesProducts=["Lavender soap"],
            salesFlow="online_sales",
            preferredTone="organic and warm",
            logoPreference="explicit_skip",
            fieldMeta={
                "niche": {"source": "explicit", "confidence": 0.95},
                "sales_flow": {"source": "explicit", "confidence": 0.95},
                "salesFlow": {"source": "explicit", "confidence": 0.95},
                "brand_style": {"source": "explicit", "confidence": 0.95},
                "logo": {"source": "explicit", "confidence": 0.95},
            },
        )
        self.assertIn("services_products", engine.missing_fields_from_state(state))

        payload = _base_payload()
        payload["updatedFields"] = {
            "services_products": {
                "value": ["Lavender soap", "Vanilla candle"],
                "source": "explicit",
                "confidence": 0.95,
            }
        }

        decision = engine._decision_from_tool_payload(payload, state, "Lavender soap and vanilla candle")

        self.assertTrue(decision.canGenerate)
        self.assertEqual(decision.updatedState["servicesProducts"], ["Lavender soap", "Vanilla candle"])
        self.assertEqual(decision.missingCriticalFields, [])

    def test_cross_field_validator_reverts_sales_flow_leaks_from_industry_and_products(self) -> None:
        engine = LyraIntakeEngine()
        state = ProjectState(
            businessName="Bath All Day",
            businessDescription="Handmade soaps, candles, and bath bombs.",
            industry="beauty",
            servicesProducts=["Lavender soap", "Vanilla candle"],
            preferredTone="organic and warm",
            logoPreference="explicit_skip",
            fieldMeta={
                "niche": {"source": "explicit", "confidence": 0.95},
                "industry": {"source": "explicit", "confidence": 0.95},
                "brand_style": {"source": "explicit", "confidence": 0.95},
                "logo": {"source": "explicit", "confidence": 0.95},
            },
        )
        decision = LyraIntakeDecision(
            updatedState={
                "industry": "online store",
                "servicesProducts": ["sell online", "receive quotes"],
                "salesFlow": "online_sales",
            },
            fieldMeta={
                "industry": FieldMeta(source="inferred", confidence=0.9),
                "servicesProducts": FieldMeta(source="inferred", confidence=0.9),
                "salesFlow": FieldMeta(source="explicit", confidence=0.95),
            },
            detectedIntent=DetectedIntent(
                businessModel="online_store",
                commerceMode="single_vendor",
                salesFlow="online_sales",
                niche="beauty",
                confidence=0.95,
            ),
            canGenerate=True,
        )

        repaired = engine.validate_and_repair_decision(
            state=state,
            decision=decision,
            message="I want to sell online",
        )
        applied = engine.apply_decision(state, repaired)

        self.assertNotIn("industry", repaired.updatedState)
        self.assertNotIn("servicesProducts", repaired.updatedState)
        self.assertEqual(repaired.fieldMeta["industry"].source, "needs_review")
        self.assertEqual(repaired.fieldMeta["servicesProducts"].source, "needs_review")
        self.assertEqual(applied.industry, "beauty")
        self.assertEqual(applied.servicesProducts, ["Lavender soap", "Vanilla candle"])
        self.assertEqual(applied.salesFlow, "online_sales")

    def test_cross_field_validator_reverts_logo_reply_from_products_and_copy(self) -> None:
        engine = LyraIntakeEngine()
        original_copy = {"catalog": {"headline": "Small-batch bath essentials"}}
        state = ProjectState(
            businessName="Bath All Day",
            businessDescription="Handmade soaps, candles, and bath bombs.",
            industry="beauty",
            servicesProducts=["Lavender soap", "Bath bomb"],
            salesFlow="online_sales",
            preferredTone="organic and warm",
            generatedCopy=original_copy,
            fieldMeta={
                "niche": {"source": "explicit", "confidence": 0.95},
                "sales_flow": {"source": "explicit", "confidence": 0.95},
                "brand_style": {"source": "explicit", "confidence": 0.95},
            },
        )
        logo_reply = "I do not have a logo, continue without one"
        decision = LyraIntakeDecision(
            updatedState={
                "servicesProducts": [logo_reply],
                "businessDescription": logo_reply,
                "generatedCopy": {"catalog": {"headline": logo_reply}},
            },
            fieldMeta={
                "servicesProducts": FieldMeta(source="inferred", confidence=0.88),
                "businessDescription": FieldMeta(source="inferred", confidence=0.88),
                "generatedCopy": FieldMeta(source="inferred", confidence=0.88),
                "logo": FieldMeta(source="explicit", confidence=0.95),
            },
            detectedIntent=DetectedIntent(
                businessModel="informational",
                commerceMode="no_commerce",
                salesFlow="informational",
                niche="general",
                confidence=0.8,
            ),
        )

        repaired = engine.validate_and_repair_decision(
            state=state,
            decision=decision,
            message=logo_reply,
        )
        applied = engine.apply_decision(state, repaired)

        self.assertNotIn("servicesProducts", repaired.updatedState)
        self.assertNotIn("businessDescription", repaired.updatedState)
        self.assertNotIn("generatedCopy", repaired.updatedState)
        self.assertEqual(repaired.fieldMeta["generatedCopy"].source, "needs_review")
        self.assertEqual(applied.servicesProducts, ["Lavender soap", "Bath bomb"])
        self.assertEqual(applied.businessDescription, "Handmade soaps, candles, and bath bombs.")
        self.assertEqual(applied.generatedCopy, original_copy)
        self.assertEqual(applied.salesFlow, "online_sales")


if __name__ == "__main__":
    unittest.main()
