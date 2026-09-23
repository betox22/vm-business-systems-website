import asyncio
import json
import logging
from types import SimpleNamespace
from unittest.mock import patch

from app.agents import create_chat_completion_with_retry, create_sync_chat_completion_with_retry
from app.openai_usage import (
    bind_generation_id, call_async, call_sync, count_http_attempts,
    observed_http_client, record_call, reset_generation_id,
)


class CaptureHandler(logging.Handler):
    def __init__(self):
        super().__init__()
        self.records = []

    def emit(self, record):
        self.records.append(record.getMessage())


def test_usage_records_real_response_tokens_and_application_attempts(monkeypatch):
    import app.openai_usage as usage

    events = CaptureHandler()
    monkeypatch.setattr(usage._logger, "handlers", [events])
    token = bind_generation_id("gen_" + "a" * 32)
    response = SimpleNamespace(usage=SimpleNamespace(prompt_tokens=120, completion_tokens=30))
    attempts = 0

    class Completions:
        async def create(self, **_kwargs):
            nonlocal attempts
            attempts += 1
            if attempts == 1:
                raise TimeoutError()
            return response

    try:
        result = asyncio.run(create_chat_completion_with_retry(
            SimpleNamespace(chat=SimpleNamespace(completions=Completions())),
            stage="site_plan", model="resolved-model",
        ))
    finally:
        reset_generation_id(token)
    assert result is response
    event = json.loads(events.records[0].split(" ", 1)[1])
    assert event["generation_id"] == "gen_" + "a" * 32
    assert (event["stage"], event["model"]) == ("site_plan", "resolved-model")
    assert (event["input_tokens"], event["output_tokens"], event["attempts"]) == (120, 30, 2)
    assert event["duration_ms"] >= 0


def test_image_usage_without_provider_counts_stays_null(monkeypatch):
    import app.openai_usage as usage

    events = CaptureHandler()
    monkeypatch.setattr(usage._logger, "handlers", [events])
    response = SimpleNamespace(data=[SimpleNamespace(b64_json="ignored")])
    assert call_sync("texture_generation", "image-model", lambda: response) is response
    event = json.loads(events.records[0].split(" ", 1)[1])
    assert event["input_tokens"] is None
    assert event["output_tokens"] is None
    assert event["attempts"] == 1


def test_failed_call_records_no_business_text(monkeypatch):
    import app.openai_usage as usage

    events = CaptureHandler()
    monkeypatch.setattr(usage._logger, "handlers", [events])

    def fail():
        raise RuntimeError("secret business description")

    try:
        call_sync("niche_classification", "model", fail)
    except RuntimeError:
        pass
    event = json.loads(events.records[0].split(" ", 1)[1])
    assert event["status"] == "failed"
    assert "secret business description" not in events.records[0]


def test_sync_and_async_calls_share_bound_generation_id(monkeypatch):
    import app.openai_usage as usage

    events = CaptureHandler()
    monkeypatch.setattr(usage._logger, "handlers", [events])
    token = bind_generation_id("gen_" + "b" * 32)

    async def respond():
        return SimpleNamespace(usage=SimpleNamespace(input_tokens=8, output_tokens=3))

    class Completions:
        def create(self, **_kwargs):
            return SimpleNamespace(usage=SimpleNamespace(prompt_tokens=5, completion_tokens=2))

    try:
        asyncio.run(call_async("guided_intake", "model-a", respond))
        create_sync_chat_completion_with_retry(
            SimpleNamespace(chat=SimpleNamespace(completions=Completions())),
            stage="template_selection", model="model-b",
        )
    finally:
        reset_generation_id(token)
    parsed = [json.loads(line.split(" ", 1)[1]) for line in events.records]
    assert [event["generation_id"] for event in parsed] == ["gen_" + "b" * 32] * 2
    assert (parsed[0]["input_tokens"], parsed[0]["output_tokens"]) == (8, 3)


def test_sdk_http_retries_are_counted_without_changing_retry_policy(monkeypatch):
    import app.openai_usage as usage

    events = CaptureHandler()
    monkeypatch.setattr(usage._logger, "handlers", [events])
    client = observed_http_client(asynchronous=False)
    try:
        with count_http_attempts():
            for _ in range(3):
                client.event_hooks["request"][0](None)
            record_call(stage="copywriting", model="model", started=usage.time.perf_counter(), attempts=1)
    finally:
        client.close()
    event = json.loads(events.records[0].split(" ", 1)[1])
    assert event["attempts"] == 3


def test_astra_omits_unsupported_temperature_without_changing_other_models():
    calls = []

    class Completions:
        async def create(self, **kwargs):
            calls.append(kwargs)
            return SimpleNamespace(usage=None)

    client = SimpleNamespace(chat=SimpleNamespace(completions=Completions()))
    asyncio.run(create_chat_completion_with_retry(client, model="gpt-6-astra", temperature=0.25))
    asyncio.run(create_chat_completion_with_retry(client, model="gpt-4o", temperature=0.25))
    assert "temperature" not in calls[0]
    assert calls[1]["temperature"] == 0.25


def test_sync_astra_omits_unsupported_temperature_without_changing_other_models():
    calls = []

    class Completions:
        def create(self, **kwargs):
            calls.append(kwargs)
            return SimpleNamespace(usage=None)

    client = SimpleNamespace(chat=SimpleNamespace(completions=Completions()))
    create_sync_chat_completion_with_retry(client, model="gpt-6-astra", temperature=0.15)
    create_sync_chat_completion_with_retry(client, model="gpt-4o", temperature=0.15)
    assert "temperature" not in calls[0]
    assert calls[1]["temperature"] == 0.15


def test_planner_and_reviewer_use_long_timeout(monkeypatch):
    from app import agents, ai_site_planner

    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    with patch.object(agents, "AsyncOpenAI") as agent_client, patch.object(ai_site_planner, "AsyncOpenAI") as planner_client:
        agents.CopywriterAgent()
        assert agent_client.call_args.kwargs["timeout"] == agents.OPENAI_REQUEST_TIMEOUT_SECONDS
        agents.ReviewerAgent()
        assert agent_client.call_args.kwargs["timeout"] == agents.OPENAI_LONG_REQUEST_TIMEOUT_SECONDS
        ai_site_planner.OpenAISitePlanAgent()
        assert planner_client.call_args.kwargs["timeout"] == agents.OPENAI_LONG_REQUEST_TIMEOUT_SECONDS
