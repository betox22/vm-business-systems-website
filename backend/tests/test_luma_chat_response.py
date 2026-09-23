import asyncio
import json
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from fastapi.testclient import TestClient
from starlette.requests import Request

from app import main
from app.models import LumaChatRequest


def _tool_payload(user_question_response):
    return {
        "updatedFields": {
            "logo": {
                "value": {"path": "explicit_skip"},
                "source": "explicit",
                "confidence": 0.95,
            },
        },
        "detectedIntent": {
            "businessModel": "online_store",
            "commerceMode": "single_vendor",
            "salesFlow": "online_sales",
            "niche": "beauty",
            "confidence": 0.92,
        },
        "missingCriticalFields": ["brand_style"],
        "reasoning": "The client skipped the logo and asked for future help.",
        "userQuestionResponse": user_question_response,
        "nextQuestion": "What visual style or colors would you like?",
        "canGenerate": False,
        "templateRecommendation": None,
    }


def _ready_tool_payload(user_question_response):
    payload = _tool_payload(user_question_response)
    payload["missingCriticalFields"] = []
    payload["canGenerate"] = True
    return payload


class _FakeCompletions:
    def __init__(self, payload):
        self.payload = payload

    async def create(self, **_kwargs):
        tool_call = SimpleNamespace(
            function=SimpleNamespace(arguments=json.dumps(self.payload)),
        )
        return SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(tool_calls=[tool_call]))],
        )


class _FakeOpenAIClient:
    def __init__(self, payload):
        self.chat = SimpleNamespace(completions=_FakeCompletions(payload))


def _request(client_port: int) -> Request:
    return Request({
        "type": "http",
        "method": "POST",
        "path": "/api/luma/chat",
        "headers": [],
        "client": ("127.0.0.1", client_port),
        "scheme": "http",
        "server": ("testserver", 80),
    })


def _current_state(*, include_style: bool = False):
    field_meta = {
        "niche": {"source": "explicit", "confidence": 0.95},
        "industry": {"source": "explicit", "confidence": 0.95},
        "salesFlow": {"source": "explicit", "confidence": 0.95},
        "sales_flow": {"source": "explicit", "confidence": 0.95},
    }
    state = {
        "businessName": "Bath All Day",
        "businessDescription": "Handmade soaps, candles, and bath bombs sold online.",
        "industry": "beauty",
        "servicesProducts": ["Lavender soap", "Vanilla candle", "Bath bomb"],
        "salesFlow": "online_sales",
        "selectedLanguage": "en",
        "fieldMeta": field_meta,
    }
    if include_style:
        state["preferredTone"] = "organic and warm"
        field_meta["brand_style"] = {"source": "explicit", "confidence": 0.95}
        field_meta["preferredTone"] = {"source": "explicit", "confidence": 0.95}
    return state


class LumaChatResponseTests(unittest.TestCase):
    def test_logo_request_during_color_step_is_not_saved_as_a_color(self):
        state = main.normalize_state_payload(_current_state(include_style=True))
        request = LumaChatRequest(
            current=_current_state(include_style=True),
            currentStep="preferredColors",
            message="Quiero un logo con las iniciales BAD para Bath All Day.",
        )

        main.apply_current_step_hint(state, request)

        self.assertIsNone(state.preferredColors)
        self.assertEqual(state.logoPreference, "generate_ai_logo")
        self.assertEqual(state.logoBrief, request.message)
        self.assertEqual(state.fieldMeta["logoBrief"]["source"], "explicit")

    def test_logo_initials_are_acknowledged_and_returned_to_the_client(self):
        payload = _ready_tool_payload(None)
        payload["updatedFields"]["logo"]["value"]["path"] = "wants_generated"
        request = LumaChatRequest(
            current=_current_state(include_style=True),
            currentStep="preferredColors",
            message="Quiero un logo con las iniciales BAD para Bath All Day.",
        )

        async def keep_ready_state(_message, state, **_kwargs):
            return state

        with (
            patch.object(main.intake_engine, "client", _FakeOpenAIClient(payload)),
            patch.object(main.orchestrator, "run", side_effect=keep_ready_state),
        ):
            response = asyncio.run(main.luma_chat(request, _request(49204)))

        self.assertTrue(response.readyToGenerate)
        self.assertEqual(response.next_step, "review")
        self.assertIn("logo initials", response.assistantMessage)
        self.assertEqual(response.updatedFields["logoBrief"], request.message)
        self.assertEqual(response.updatedFields["logoPreference"], "generate_ai_logo")
        self.assertIsNone(response.updatedFields["preferredColors"])

    def test_continue_without_logo_is_explicit_skip_without_initials_claim(self):
        message = "No tengo logo y prefiero continuar sin logo por ahora."
        current = _current_state(include_style=True)
        current["selectedLanguage"] = "es"
        request = LumaChatRequest(
            current=current,
            message=message,
            currentStep="logo",
        )

        async def keep_ready_state(_message, state, **_kwargs):
            return state

        with (
            patch.object(main.intake_engine, "client", _FakeOpenAIClient(_ready_tool_payload(None))),
            patch.object(main.orchestrator, "run", side_effect=keep_ready_state),
        ):
            response = asyncio.run(main.luma_chat(request, _request(49198)))

        self.assertEqual(response.updatedFields["logoPreference"], "text_only")
        self.assertFalse(response.updatedFields["logoBrief"])
        self.assertNotIn("iniciales", response.assistantMessage.lower())
        self.assertNotIn("initials", response.assistantMessage.lower())

    def test_ready_response_answers_user_question_before_generation_summary(self):
        direct_response = "Yes. I can help you add a stronger logo after the first draft is ready."
        request = LumaChatRequest(
            current=_current_state(include_style=True),
            message="Can you help improve the logo later?",
        )

        async def keep_ready_state(_message, state, **_kwargs):
            return state

        with (
            patch.object(main.intake_engine, "client", _FakeOpenAIClient(_ready_tool_payload(direct_response))),
            patch.object(main.orchestrator, "run", side_effect=keep_ready_state),
        ):
            response = asyncio.run(main.luma_chat(request, _request(49200)))

        self.assertTrue(response.readyToGenerate)
        self.assertTrue(response.assistantMessage.startswith(direct_response))
        self.assertIn("Ready. For Bath All Day", response.assistantMessage)

    def test_ready_response_without_user_question_keeps_generation_summary(self):
        request = LumaChatRequest(
            current=_current_state(include_style=True),
            message="Continue without a logo.",
        )

        async def keep_ready_state(_message, state, **_kwargs):
            return state

        with (
            patch.object(main.intake_engine, "client", _FakeOpenAIClient(_ready_tool_payload(None))),
            patch.object(main.orchestrator, "run", side_effect=keep_ready_state),
        ):
            response = asyncio.run(main.luma_chat(request, _request(49199)))

        self.assertTrue(response.readyToGenerate)
        self.assertTrue(response.assistantMessage.startswith("Ready. For Bath All Day"))

    def test_ai_user_question_response_reaches_endpoint_assistant_message(self):
        direct_response = "Yes. We can keep the name in text now and help you add a logo later."
        request = LumaChatRequest(
            current=_current_state(),
            message="I do not have a logo. Can you help me with that later?",
        )

        with patch.object(main.intake_engine, "client", _FakeOpenAIClient(_tool_payload(direct_response))):
            response = asyncio.run(main.luma_chat(request, _request(49201)))

        self.assertFalse(response.readyToGenerate)
        self.assertEqual(response.next_step, "preferredColors")
        self.assertTrue(response.assistantMessage.startswith(direct_response))
        self.assertTrue(response.assistantMessage.endswith(response.nextQuestion))
        self.assertIn("brand_style", response.missingImportantFields)
        self.assertIn("brand_style", response.missingImportantFields)

    def test_empty_user_question_response_keeps_fixed_fallback_message(self):
        request = LumaChatRequest(
            current=_current_state(),
            message="Continue without a logo.",
        )

        with patch.object(main.intake_engine, "client", _FakeOpenAIClient(_tool_payload(None))):
            response = asyncio.run(main.luma_chat(request, _request(49202)))

        self.assertFalse(response.readyToGenerate)
        self.assertTrue(response.assistantMessage.startswith("Got it. I updated what I could confirm."))
        self.assertTrue(response.assistantMessage.endswith(response.nextQuestion))

    def test_ai_response_survives_post_orchestrator_ready_false_path(self):
        direct_response = "Absolutely. We can publish without a logo and add one when you are ready."
        request = LumaChatRequest(
            current=_current_state(include_style=True),
            message="I do not have a logo. Can you help me with that later?",
        )

        async def remove_style_after_intake(_message, state, **_kwargs):
            state.preferredTone = ""
            state.fieldMeta.pop("brand_style", None)
            state.fieldMeta.pop("preferredTone", None)
            return state

        with (
            patch.object(main.intake_engine, "client", _FakeOpenAIClient(_tool_payload(direct_response))),
            patch.object(main.orchestrator, "run", side_effect=remove_style_after_intake),
        ):
            response = asyncio.run(main.luma_chat(request, _request(49203)))

        self.assertFalse(response.readyToGenerate)
        self.assertEqual(response.next_step, "preferredColors")
        self.assertTrue(response.assistantMessage.startswith(direct_response))
        self.assertTrue(response.assistantMessage.endswith(response.nextQuestion))

    def test_bruma_description_resolves_niche_before_asking_again(self):
        payload = _tool_payload("Ya tengo todo lo necesario para generar.")
        payload["updatedFields"] = {}
        payload["detectedIntent"]["niche"] = "general"
        current = {
            "businessName": "Bruma",
            "businessDescription": "Tienda de tés e infusiones artesanales a granel.",
            "salesFlow": "online_sales",
            "selectedLanguage": "es",
            "fieldMeta": {
                "salesFlow": {"source": "explicit", "confidence": 0.95},
                "sales_flow": {"source": "explicit", "confidence": 0.95},
            },
        }
        main.app.dependency_overrides[main.get_session] = lambda: object()
        try:
            with (
                patch.object(main.intake_engine, "client", _FakeOpenAIClient(payload)),
                patch.object(main, "classify_business_niche", return_value="tés e infusiones") as classify,
                patch.object(main, "template_ids_for_generation", return_value=[]),
                patch.object(main, "replacement_template_for_new_project", return_value=None),
            ):
                response = TestClient(main.app).post("/api/luma/chat", json={
                    "current": current,
                    "currentStep": "industry",
                    "message": "Eso ya estaba en la descripción anterior.",
                })
        finally:
            main.app.dependency_overrides.pop(main.get_session, None)

        self.assertEqual(response.status_code, 200)
        result = response.json()
        classify.assert_called_once()
        self.assertEqual(result["updatedFields"]["industry"], "tés e infusiones")
        self.assertNotIn("niche", result["missingImportantFields"])
        self.assertNotEqual(result["next_step"], "industry")
        self.assertNotIn("Ya tengo todo", result["assistantMessage"])
        self.assertTrue(result["assistantMessage"].endswith(result["nextQuestion"]))

    def test_model_ready_claim_cannot_contradict_server_missing_fields(self):
        payload = _tool_payload("I have everything and am ready to generate.")
        request = LumaChatRequest(
            current=_current_state(),
            message="Can we generate now?",
        )

        with patch.object(main.intake_engine, "client", _FakeOpenAIClient(payload)):
            response = asyncio.run(main.luma_chat(request, _request(49205)))

        self.assertFalse(response.readyToGenerate)
        self.assertEqual(response.next_step, "preferredColors")
        self.assertNotIn("ready to generate", response.assistantMessage)
        self.assertTrue(response.assistantMessage.endswith(response.nextQuestion))

    def test_spanish_model_completion_claim_is_not_displayed_while_missing_fields_remain(self):
        payload = _tool_payload("Ya tengo toda la información para crear tu sitio.")
        current = _current_state()
        current["selectedLanguage"] = "es"
        request = LumaChatRequest(current=current, message="¿Podemos generar ahora?")

        with patch.object(main.intake_engine, "client", _FakeOpenAIClient(payload)):
            response = asyncio.run(main.luma_chat(request, _request(49206)))

        self.assertFalse(response.readyToGenerate)
        self.assertNotIn("Ya tengo toda la información", response.assistantMessage)
        self.assertEqual(response.next_step, "preferredColors")
        self.assertTrue(response.assistantMessage.endswith(response.nextQuestion))

    def test_http_response_exposes_the_server_step_and_question(self):
        payload = _tool_payload(None)
        payload["nextQuestion"] = "Can you upload your logo?"
        main.app.dependency_overrides[main.get_session] = lambda: object()
        try:
            with (
                patch.object(main.intake_engine, "client", _FakeOpenAIClient(payload)),
                patch.object(main, "template_ids_for_generation", return_value=[]),
                patch.object(main, "replacement_template_for_new_project", return_value=None),
            ):
                response = TestClient(main.app).post("/api/luma/chat", json={
                    "current": _current_state(),
                    "currentStep": "logo",
                    "message": "Continue without a logo.",
                })
        finally:
            main.app.dependency_overrides.pop(main.get_session, None)

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["next_step"], "preferredColors")
        self.assertEqual(payload["nextQuestion"], "Do you have preferred colors, tone, or style? If you prefer, say “you decide” and I will choose a visual direction that fits the business.")
        self.assertIn("brand_style", payload["missingImportantFields"])
        self.assertFalse(payload["readyToGenerate"])

    def test_niche_and_sales_flow_use_the_question_actually_asked(self):
        missing = ["niche", "sales_flow", "business_name"]
        self.assertEqual(main.next_guided_step(missing, False), "salesMode")
        self.assertIn("sell online", main.intake_engine.fallback_question_for_missing(missing, "en"))
        self.assertEqual(main.next_guided_step(["niche"], False), "industry")
        self.assertIn("products or services", main.intake_engine.fallback_question_for_missing(["niche"], "en"))
        self.assertEqual(main.next_guided_step([], True), "review")

    def test_server_questions_follow_the_selected_language(self):
        self.assertIn("couleurs", main.intake_engine.fallback_question_for_missing(["brand_style"], "fr"))
        self.assertIn("cor", main.intake_engine.fallback_question_for_missing(["brand_style"], "pt"))


if __name__ == "__main__":
    unittest.main()
