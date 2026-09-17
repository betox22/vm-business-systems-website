from __future__ import annotations

import os
from typing import Any, Dict, Iterable, Optional

import stripe
from fastapi import HTTPException


STRIPE_API_VERSION = "2026-02-25.clover"


def _client() -> stripe.StripeClient:
    key = os.getenv("STRIPE_SECRET_KEY", "").strip()
    if not key:
        raise HTTPException(status_code=503, detail="STRIPE_SECRET_KEY is not configured.")
    return stripe.StripeClient(key, stripe_version=STRIPE_API_VERSION)


def checkout_session(
    *,
    mode: str,
    line_items: Iterable[Dict[str, Any]],
    success_url: str,
    cancel_url: str,
    metadata: Dict[str, str],
    customer_email: str = "",
    stripe_account: Optional[str] = None,
    application_fee_amount: Optional[int] = None,
    subscription_metadata: Optional[Dict[str, str]] = None,
    trial_period_days: Optional[int] = None,
) -> Dict[str, Any]:
    params: Dict[str, Any] = {
        "mode": mode,
        "line_items": list(line_items),
        "success_url": success_url,
        "cancel_url": cancel_url,
        "metadata": metadata,
    }
    if customer_email:
        params["customer_email"] = customer_email
    if application_fee_amount is not None:
        params["payment_intent_data"] = {"application_fee_amount": application_fee_amount}
    if subscription_metadata:
        params["subscription_data"] = {"metadata": subscription_metadata}
    if trial_period_days is not None:
        if mode != "subscription" or isinstance(trial_period_days, bool) or not isinstance(trial_period_days, int) or not 1 <= trial_period_days <= 730:
            raise HTTPException(status_code=422, detail="Trial requires subscription mode and 1..730 days.")
        params.setdefault("subscription_data", {})["trial_period_days"] = trial_period_days
    try:
        session = _client().v1.checkout.sessions.create(params, options={"stripe_account": stripe_account} if stripe_account else None)
    except stripe.StripeError as exc:
        raise HTTPException(status_code=502, detail=f"Stripe checkout session failed: {exc.user_message or str(exc)}") from exc
    return {"id": session.id, "url": session.url, "customer": getattr(session, "customer", None), "subscription": getattr(session, "subscription", None)}


def construct_event(raw_body: bytes, signature: str, secret: str) -> Dict[str, Any]:
    try:
        return stripe.Webhook.construct_event(raw_body, signature, secret)
    except (ValueError, stripe.SignatureVerificationError) as exc:
        raise HTTPException(status_code=400, detail="Invalid Stripe signature.") from exc


def create_connected_account(*, email: str, display_name: str, country: str) -> str:
    """Create a new Accounts v2 merchant with Stripe-hosted full dashboard.

    Stripe collects requirements and the connected merchant owns fees/losses;
    KREATON never receives or holds the merchant's sale proceeds.
    """
    params = {
        "contact_email": email,
        "display_name": display_name,
        "identity": {"country": country.lower()},
        "dashboard": "full",
        "defaults": {"responsibilities": {"fees_collector": "stripe", "losses_collector": "stripe"}},
        "configuration": {"merchant": {"capabilities": {"card_payments": {"requested": True}}}},
    }
    try:
        account = _client().v2.core.accounts.create(params)
    except stripe.StripeError as exc:
        raise HTTPException(status_code=502, detail=f"Stripe connected account creation failed: {exc.user_message or str(exc)}") from exc
    return account.id


def create_account_link(*, account_id: str, refresh_url: str, return_url: str) -> str:
    try:
        link = _client().v2.core.account_links.create(
            {
                "account": account_id,
                "use_case": {
                    "type": "account_onboarding",
                    "account_onboarding": {
                        "configurations": ["merchant"],
                        "collection_options": {"fields": "eventually_due", "future_requirements": "include"},
                        "refresh_url": refresh_url,
                        "return_url": return_url,
                    },
                },
            }
        )
    except stripe.StripeError as exc:
        raise HTTPException(status_code=502, detail=f"Stripe onboarding link failed: {exc.user_message or str(exc)}") from exc
    return link.url


def create_billing_portal(*, customer_id: str, return_url: str) -> str:
    try:
        portal = _client().v1.billing_portal.sessions.create({"customer": customer_id, "return_url": return_url})
    except stripe.StripeError as exc:
        raise HTTPException(status_code=502, detail=f"Stripe billing portal failed: {exc.user_message or str(exc)}") from exc
    return portal.url
