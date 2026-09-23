from __future__ import annotations

import json
import logging
import re
import time
import uuid
from contextlib import contextmanager
from contextvars import ContextVar
from typing import Any, Callable


_generation_id: ContextVar[str | None] = ContextVar("openai_generation_id", default=None)
_http_attempts: ContextVar[list[int] | None] = ContextVar("openai_http_attempts", default=None)
_logger = logging.getLogger("kreaton.openai_usage")
_logger.setLevel(logging.INFO)
if not _logger.handlers:
    _handler = logging.StreamHandler()
    _handler.setFormatter(logging.Formatter("%(message)s"))
    _logger.addHandler(_handler)
_logger.propagate = False
_valid_id = re.compile(r"^gen_[a-f0-9]{32}$")


def new_generation_id() -> str:
    return f"gen_{uuid.uuid4().hex}"


def bind_generation_id(value: str | None = None):
    return _generation_id.set(value if value and _valid_id.fullmatch(value) else new_generation_id())


def reset_generation_id(token) -> None:
    _generation_id.reset(token)


def current_generation_id() -> str:
    value = _generation_id.get()
    if value is None:
        value = new_generation_id()
        _generation_id.set(value)
    return value


@contextmanager
def count_http_attempts():
    token = _http_attempts.set([0])
    try:
        yield
    finally:
        _http_attempts.reset(token)


def observed_http_client(*, asynchronous: bool):
    from openai import DefaultAsyncHttpxClient, DefaultHttpxClient

    if asynchronous:
        async def on_request(_request):
            counter = _http_attempts.get()
            if counter is not None:
                counter[0] += 1

        return DefaultAsyncHttpxClient(event_hooks={"request": [on_request]})

    def on_request(_request):
        counter = _http_attempts.get()
        if counter is not None:
            counter[0] += 1

    return DefaultHttpxClient(event_hooks={"request": [on_request]})


def _usage(response: Any) -> tuple[int | None, int | None]:
    usage = getattr(response, "usage", None)
    if usage is None:
        return None, None
    input_tokens = getattr(usage, "prompt_tokens", None)
    if input_tokens is None:
        input_tokens = getattr(usage, "input_tokens", None)
    output_tokens = getattr(usage, "completion_tokens", None)
    if output_tokens is None:
        output_tokens = getattr(usage, "output_tokens", None)
    return (input_tokens if isinstance(input_tokens, int) else None,
            output_tokens if isinstance(output_tokens, int) else None)


def record_call(*, stage: str, model: str, started: float, attempts: int, response: Any = None, failed: bool = False) -> None:
    input_tokens, output_tokens = _usage(response)
    http_attempts = _http_attempts.get()
    _logger.info("openai_usage %s", json.dumps({
        "generation_id": current_generation_id(),
        "stage": stage,
        "model": model,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "attempts": max(attempts, http_attempts[0]) if http_attempts else attempts,
        "duration_ms": round((time.perf_counter() - started) * 1000),
        "status": "failed" if failed else "ok",
    }, separators=(",", ":")))


async def call_async(stage: str, model: str, operation: Callable[[], Any]) -> Any:
    started = time.perf_counter()
    with count_http_attempts():
        try:
            response = await operation()
        except Exception:
            record_call(stage=stage, model=model, started=started, attempts=1, failed=True)
            raise
        record_call(stage=stage, model=model, started=started, attempts=1, response=response)
        return response


def call_sync(stage: str, model: str, operation: Callable[[], Any]) -> Any:
    started = time.perf_counter()
    with count_http_attempts():
        try:
            response = operation()
        except Exception:
            record_call(stage=stage, model=model, started=started, attempts=1, failed=True)
            raise
        record_call(stage=stage, model=model, started=started, attempts=1, response=response)
        return response
