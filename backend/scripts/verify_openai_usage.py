from __future__ import annotations

import json
import logging
import os
import sys

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import main
from app.db import Base
from app.openai_usage import new_generation_id


class UsageCapture(logging.Handler):
    def __init__(self):
        super().__init__()
        self.events = []

    def emit(self, record):
        message = record.getMessage()
        if message.startswith("openai_usage "):
            self.events.append(json.loads(message.split(" ", 1)[1]))


def run() -> int:
    if not os.getenv("OPENAI_API_KEY"):
        print("OPENAI_API_KEY not configured")
        return 2
    logging.getLogger("kreaton").setLevel(logging.CRITICAL)
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine)

    def get_session():
        with sessions() as session:
            yield session

    main.app.dependency_overrides[main.get_session] = get_session
    capture = UsageCapture()
    usage_logger = logging.getLogger("kreaton.openai_usage")
    usage_logger.addHandler(capture)
    client = TestClient(main.app)
    current = {"selectedLanguage": "en"}
    generation_id = new_generation_id()
    messages = [
        "My business is Northstar Tea Lab, a small specialty tea shop for local customers. "
        "We sell Jasmine green tea, Assam black tea, and Mint herbal tea through online checkout. "
        "I want a calm modern site in forest green and white. Please use text only and skip a logo.",
        "To confirm: customers buy these three teas online. The style is calm and modern, "
        "the colors are forest green and white, and I do not want a generated logo.",
        "The business name is Northstar Tea Lab. We sell Jasmine green tea, Assam black tea, "
        "and Mint herbal tea online. Please generate the website without a logo.",
    ]
    try:
        data = {}
        for index, message in enumerate(messages, start=1):
            chat = client.post("/api/luma/chat", json={"current": current, "message": message},
                               headers={"X-Generation-ID": generation_id})
            print(f"chat_turn={index} status={chat.status_code}")
            if chat.status_code != 200:
                return 3
            data = chat.json()
            current = {**current, **data["updatedFields"]}
            print(f"next_step={data.get('next_step')} missing={data.get('missingImportantFields')}")
            if data.get("readyToGenerate"):
                break
        print(f"generation_id={generation_id}")
        print(f"chat_generation_id={data.get('generationId')}")
        print(f"ready_to_generate={data.get('readyToGenerate')}")
        if not data.get("readyToGenerate"):
            return 4
        details = data["updatedFields"]
        payload = {**details, "preparedPlanToken": data.get("preparedPlanToken", ""), "selectedLanguage": "en"}
        print(f"prepared_plan_available={bool(data.get('preparedPlanToken'))}")
        site = client.post("/ai/website-builder", json=payload,
                           headers={"X-Generation-ID": generation_id})
        print(f"site_status={site.status_code}")
        if site.status_code == 200:
            result = site.json()
            print(f"site_generation_id={result.get('generation_id')}")
            print(f"catalog_source={result.get('catalog_source')}")
            print(f"page_count={len(result.get('schema', {}).get('pages', []))}")
            return 0 if result.get("generation_id") == generation_id else 5
        return 6
    finally:
        print("stage | model | input | output | attempts | duration_ms | status")
        for event in capture.events:
            print(" | ".join(str(event[key]) for key in (
                "stage", "model", "input_tokens", "output_tokens", "attempts", "duration_ms", "status",
            )))
        usage_logger.removeHandler(capture)
        main.app.dependency_overrides.pop(main.get_session, None)
        engine.dispose()


if __name__ == "__main__":
    sys.exit(run())
