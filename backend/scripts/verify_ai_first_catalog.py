"""Opt-in live CatalogAgent verification. Requires OPENAI_API_KEY and --output.

Run from backend: python scripts/verify_ai_first_catalog.py --output evidence.json
This calls OpenAI for synthetic briefs without persisting any customer sites.
"""

import argparse
import asyncio
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time


BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app import agents
from app.models import ProjectState


CASES = [
    ("BuildRight Hardware", "industrial_supplier", "BuildRight Hardware is a hardware and home improvement superstore."),
    ("Harbor Parts", "marine_parts", "Harbor Parts is a boat spare parts store selling marine engine parts, propellers, bilge pumps and marine electrical components."),
    ("PawCare Vet & Shop", "veterinary", "PawCare Vet & Shop is a veterinary clinic with a retail shop for pet nutrition, grooming supplies and preventive pet care products for dogs and cats."),
    ("Chapter House Books", "bookstore", "Chapter House Books is an independent bookstore selling fiction, nonfiction, children's books and reference books."),
    ("Deskline Office Supply", "office_supplies", "Deskline Office Supply is an office supplies store selling printer paper, writing instruments, filing supplies and everyday office stationery."),
]


async def verify(output_path: Path) -> bool:
    if not os.getenv("OPENAI_API_KEY"):
        raise SystemExit("OPENAI_API_KEY is not configured; no live verification was run.")
    evidence = {
        "started_at_utc": datetime.now(timezone.utc).isoformat(),
        "scope": "Real CatalogAgent -> semantic_seed_catalog -> OpenAI; not full website generation or publication",
        "base_commit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=BACKEND_ROOT, text=True).strip(),
        "agents_sha256": hashlib.sha256((BACKEND_ROOT / "app" / "agents.py").read_bytes()).hexdigest(),
        "mocked_services": [],
        "unsplash_configured": bool(os.getenv("UNSPLASH_ACCESS_KEY")),
        "cases": [],
    }
    real_completion = agents.create_sync_chat_completion_with_retry

    for name, industry, brief in CASES:
        calls = []

        def capture_completion(client, **kwargs):
            record = {"request": kwargs}
            calls.append(record)
            try:
                response = real_completion(client, **kwargs)
                record["response"] = response.model_dump(mode="json")
                return response
            except Exception as error:
                record["error"] = {"type": type(error).__name__, "message": str(error)}
                raise

        state = ProjectState(
            businessName=name,
            businessDescription=brief,
            industry=industry,
            servicesProducts=[],
            websiteType="online_store",
            salesFlow="online_sales",
            selectedLanguage="en",
        )
        started = time.monotonic()
        # Observe the real client response; no response or model output is replaced.
        agents.create_sync_chat_completion_with_retry = capture_completion
        try:
            result = await agents.CatalogAgent().run(state, brief)
        finally:
            agents.create_sync_chat_completion_with_retry = real_completion
        catalog = result.updates["catalogItems"]
        entry = {
            "business_name": name,
            "input": state.model_dump(mode="json", exclude_none=True),
            "legacy_keyword_profile": agents.infer_seed_profile(brief),
            "elapsed_seconds": round(time.monotonic() - started, 3),
            "catalog_source": result.updates["catalogSource"],
            "product_names": [item["name"] for item in catalog],
            "catalog_items": catalog,
            "openai_calls": calls,
        }
        entry["real_ai_verified"] = bool(
            result.updates["catalogSource"] == "ai_generated"
            and len(calls) == 1
            and calls[0].get("response", {}).get("id")
            and calls[0]["request"]["response_format"]["type"] == "json_schema"
            and len(catalog) == 6
        )
        evidence["cases"].append(entry)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({key: entry[key] for key in ["business_name", "catalog_source", "product_names", "elapsed_seconds", "real_ai_verified"]}, ensure_ascii=False), flush=True)

    evidence["completed_at_utc"] = datetime.now(timezone.utc).isoformat()
    evidence["all_real_ai_verified"] = all(case["real_ai_verified"] for case in evidence["cases"])
    output_path.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return evidence["all_real_ai_verified"]


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    arguments = parser.parse_args()
    raise SystemExit(0 if asyncio.run(verify(arguments.output.resolve())) else 1)
