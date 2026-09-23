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
    current = {
        "businessName": "Northstar Tea Lab",
        "businessDescription": "A small test shop selling three loose-leaf teas online to local customers.",
        "industry": "specialty tea",
        "servicesProducts": ["Jasmine green tea", "Assam black tea", "Mint herbal tea"],
        "salesFlow": "online_sales",
        "salesMode": "online_sales",
        "preferredTone": "calm and modern",
        "preferredColors": "forest green and white",
        "logoPreference": "explicit_skip",
        "selectedLanguage": "en",
        "fieldMeta": {
            key: {"source": "explicit", "confidence": 0.95}
            for key in (
                "business_name", "business_description", "niche", "industry", "salesFlow",
                "sales_flow", "salesMode", "brand_style", "preferredTone", "logo",
            )
        },
    }
    try:
        chat = client.post("/api/luma/chat", json={
            "current": current,
            "message": "I confirm the shop details and want to generate without a logo.",
        }, timeout=240)
        print(f"chat_status={chat.status_code}")
        if chat.status_code != 200:
            return 3
        data = chat.json()
        generation_id = data.get("generationId", "")
        print(f"generation_id={generation_id}")
        print(f"ready_to_generate={data.get('readyToGenerate')}")
        if not data.get("readyToGenerate"):
            print(f"next_step={data.get('next_step')}")
            return 4
        details = data["updatedFields"]
        payload = {
            "preparedPlanToken": data.get("preparedPlanToken", ""),
            "businessName": details.get("businessName"),
            "businessDescription": details.get("businessDescription"),
            "industry": details.get("industry"),
            "servicesProducts": details.get("servicesProducts"),
            "salesFlow": details.get("salesFlow"),
            "salesMode": details.get("salesMode"),
            "preferredTone": details.get("preferredTone"),
            "preferredColors": details.get("preferredColors"),
            "logoPreference": details.get("logoPreference"),
            "selectedLanguage": "en",
            "fieldMeta": details.get("fieldMeta"),
        }
        site = client.post("/ai/website-builder", json=payload,
                           headers={"X-Generation-ID": generation_id}, timeout=300)
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
