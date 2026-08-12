import asyncio
import json
import unittest
from types import SimpleNamespace
from unittest.mock import patch

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
        self.assertEqual(response.assistantMessage, direct_response)
        self.assertIn("brand_style", response.missingImportantFields)

    def test_empty_user_question_response_keeps_fixed_fallback_message(self):
        request = LumaChatRequest(
            current=_current_state(),
            message="Continue without a logo.",
        )

        with patch.object(main.intake_engine, "client", _FakeOpenAIClient(_tool_payload(None))):
            response = asyncio.run(main.luma_chat(request, _request(49202)))

        self.assertFalse(response.readyToGenerate)
        self.assertEqual(response.assistantMessage, "Got it. I updated what I could confirm.")

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
        self.assertEqual(response.assistantMessage, direct_response)
        self.assertIn("brand_style", response.missingImportantFields)


if __name__ == "__main__":
    unittest.main()
