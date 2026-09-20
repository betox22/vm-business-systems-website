from __future__ import annotations

from typing import Any, Dict, List, Optional

import httpx
from fastapi import HTTPException

"""EasyPost integration for task #54 (real carrier shipping rates + labels).

EasyPost was chosen over talking to each carrier (UPS/USPS/FedEx/DHL)
directly: one REST API, one set of credentials, carrier rates already
negotiated on EasyPost's side. This module talks to their public REST API
directly over httpx (Basic Auth, API key as the username, empty password) --
no new SDK dependency, and the API surface used here is small (create a
Shipment to get rate quotes, buy one specific rate).

IMPORTANT / not yet independently verified: this was written from EasyPost's
publicly documented REST API shape (https://docs.easypost.com), since no
EasyPost account exists for this project yet (that has to be created by the
business owner, not by this agent -- it needs real business/payment details).
EasyPost's test-mode API keys (prefixed `EZTK`) return fake carriers/rates
and never charge real money, which is what this should be exercised against
first. The very first call made with a real key (test or live) should be
treated as the actual integration test -- if EasyPost's response shape has
drifted from what's assumed below, fix it against that real response before
relying on this for real orders.
"""

EASYPOST_API_BASE = "https://api.easypost.com/v2"


def shipping_rates_configured() -> bool:
    import os

    return bool(os.getenv("EASYPOST_API_KEY", "").strip())


def _api_key() -> str:
    import os

    key = os.getenv("EASYPOST_API_KEY", "").strip()
    if not key:
        raise HTTPException(status_code=503, detail="EASYPOST_API_KEY is not configured.")
    return key


def _client() -> httpx.Client:
    return httpx.Client(base_url=EASYPOST_API_BASE, auth=(_api_key(), ""), timeout=15.0)


class ShippingAddressInput(Dict[str, Any]):
    """Shape expected for `from_address`/`to_address`: street1, city, state, zip, country, name (optional)."""


def get_shipping_rates(
    *,
    from_address: Dict[str, str],
    to_address: Dict[str, str],
    weight_oz: float,
    length_in: float,
    width_in: float,
    height_in: float,
) -> Dict[str, Any]:
    """Ask EasyPost for real, priced shipping options.

    Returns `{"shipmentId": ..., "rates": [{"rateId","carrier","service","rateCents","deliveryDays"}, ...]}`.
    Raises HTTPException(502) if EasyPost is unreachable or returns an error,
    and HTTPException(422) if EasyPost returns a shipment with no priceable
    rates (e.g. an address it cannot validate).
    """

    body = {
        "shipment": {
            "from_address": from_address,
            "to_address": to_address,
            "parcel": {
                "weight": max(0.1, float(weight_oz)),
                "length": max(0.1, float(length_in)),
                "width": max(0.1, float(width_in)),
                "height": max(0.1, float(height_in)),
            },
        }
    }
    try:
        with _client() as client:
            response = client.post("/shipments", json=body)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Could not reach the shipping provider.") from exc
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="Shipping provider rejected the rate request.")
    payload = response.json()
    rates = payload.get("rates") or []
    if not rates:
        raise HTTPException(status_code=422, detail="No shipping rates available for this address.")
    return {
        "shipmentId": payload.get("id"),
        "rates": [
            {
                "rateId": rate.get("id"),
                "carrier": rate.get("carrier"),
                "service": rate.get("service"),
                "rateCents": round(float(rate.get("rate") or 0) * 100),
                "deliveryDays": rate.get("delivery_days"),
            }
            for rate in rates
            if rate.get("id") and rate.get("rate") is not None
        ],
    }


def buy_shipment(*, shipment_id: str, rate_id: str) -> Dict[str, Any]:
    """Actually purchase the previously-quoted rate. This is the step that spends real money.

    Returns `{"carrier","service","rateCents","trackingCode","labelUrl"}`.
    Raises HTTPException(502) on any failure -- callers must NOT treat that as
    "order failed" (the customer already paid); it means "flag for manual retry".
    """

    try:
        with _client() as client:
            response = client.post(f"/shipments/{shipment_id}/buy", json={"rate": {"id": rate_id}})
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Could not reach the shipping provider to buy the label.") from exc
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="Shipping provider rejected the label purchase.")
    payload = response.json()
    selected = payload.get("selected_rate") or {}
    label = payload.get("postage_label") or {}
    tracking_code = payload.get("tracking_code")
    label_url = label.get("label_url")
    if not tracking_code or not label_url:
        raise HTTPException(status_code=502, detail="Shipping provider did not return a completed label.")
    return {
        "carrier": selected.get("carrier"),
        "service": selected.get("service"),
        "rateCents": round(float(selected.get("rate") or 0) * 100),
        "trackingCode": tracking_code,
        "labelUrl": label_url,
    }
