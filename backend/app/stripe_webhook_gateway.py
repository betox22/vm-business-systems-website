"""Read-only provider calls for commerce webhook reconciliation (SDK 14)."""
import stripe
from fastapi import HTTPException

from .stripe_gateway import _client


def fetch_checkout(session_id, account_id):
    try:
        result = _client().v1.checkout.sessions.retrieve(
            session_id, {"expand": ["payment_intent"]},
            options={"stripe_account": account_id} if account_id else None,
        )
        return result.to_dict_recursive()
    except stripe.StripeError as exc:
        raise HTTPException(502, "stripe_checkout_lookup_failed") from exc


def fetch_account(account_id, *, v2, context=None):
    try:
        client = _client()
        if v2:
            result = client.v2.core.accounts.retrieve(
                account_id, {"include": ["configuration.merchant", "requirements"]},
                options={"stripe_context": context} if context else None,
            )
        else:
            result = client.v1.accounts.retrieve(account_id)
        return result.to_dict_recursive()
    except stripe.StripeError as exc:
        raise HTTPException(502, "stripe_account_lookup_failed") from exc


def fetch_v2_event(event_id, context=None):
    try:
        result = _client().v2.core.events.retrieve(
            event_id, options={"stripe_context": context} if context else None,
        )
        return result.to_dict_recursive()
    except stripe.StripeError as exc:
        raise HTTPException(502, "stripe_event_lookup_failed") from exc
