"""Fail-closed public checkout eligibility, independent of visual templates."""

import json
import logging
from functools import lru_cache
from pathlib import Path


PROFILE_BY_TEMPLATE = {"mega-retail-store": "mega-retail-store"}
CAPABILITIES_PATH = Path(__file__).resolve().parents[2] / "templates" / "commerce-capabilities.json"


@lru_cache(maxsize=1)
def _profiles():
    try:
        return json.loads(CAPABILITIES_PATH.read_text(encoding="utf-8"))["templateCommerceProfiles"]
    except (OSError, ValueError, KeyError):
        logging.getLogger(__name__).exception("Public commerce capabilities unavailable")
        return {}


def public_commerce_capabilities(template_id, store_id):
    profile = _profiles().get(PROFILE_BY_TEMPLATE.get(template_id), {})
    enabled = bool(store_id and profile.get("salesEnabled") is True
                   and profile.get("checkoutModel") == "single_store_checkout"
                   and profile.get("ownershipModel") == "single_owner"
                   and profile.get("orderSplitRequired") is False)
    return {"salesEnabled": enabled, "businessId": store_id,
            "checkoutModel": "single_store_checkout" if enabled else None}
