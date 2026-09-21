"""Connect state projection and creation guards; no payment or fee decisions."""
from contextlib import contextmanager
import os
from threading import RLock
from urllib.parse import urlsplit

from fastapi import HTTPException
from sqlalchemy import select

from .db_models import Store


# Bounded locks serialize local threads (including SQLite); PostgreSQL row locks
# below also serialize different backend workers for the same Store.
_STORE_LOCKS = [RLock() for _ in range(64)]


@contextmanager
def locked_store(session, business_id):
    with _STORE_LOCKS[hash(business_id) % len(_STORE_LOCKS)]:
        try:
            store = session.scalar(select(Store).where(Store.id == business_id)
                                   .with_for_update().execution_options(populate_existing=True))
            if store is None:
                raise HTTPException(status_code=404, detail="Business not found.")
            yield store
        except Exception:
            session.rollback()
            raise


def onboarding_urls():
    urls = []
    for name in ("STRIPE_CONNECT_REFRESH_URL", "STRIPE_CONNECT_RETURN_URL"):
        value = os.getenv(name, "").strip()
        try:
            parsed = urlsplit(value)
            valid = (parsed.scheme == "https" and bool(parsed.hostname)
                     and not parsed.username and not parsed.password and not parsed.fragment
                     and not any(c.isspace() or ord(c) < 32 for c in value)
                     and "\\" not in value)
            _ = parsed.port
        except ValueError:
            valid = False
        if not valid:
            raise HTTPException(status_code=503, detail=f"{name} debe ser una URL HTTPS valida, sin credenciales ni fragmentos.")
        urls.append(value)
    return tuple(urls)


def reconcile_account(account, remote):
    if remote.get("id") != account.stripe_account_id:
        raise HTTPException(status_code=502, detail="Stripe devolvio una cuenta distinta.")
    merchant = (remote.get("configuration") or {}).get("merchant") or {}
    capabilities = merchant.get("capabilities") or {}
    card = capabilities.get("card_payments") or {}
    payouts = (capabilities.get("stripe_balance") or {}).get("payouts") or {}
    if not card.get("status"):
        # An incomplete provider response must not overwrite known state.
        raise HTTPException(status_code=502, detail="Stripe devolvio un estado incompleto. Intenta de nuevo.")
    closed = bool(remote.get("closed"))
    account.charges_enabled = card["status"] == "active" and not closed
    account.payouts_enabled = payouts.get("status") == "active" and not closed
    details = [detail for capability in (card, payouts)
               for detail in capability.get("status_details", [])]
    resolutions = {detail.get("resolution") for detail in details}
    codes = {detail.get("code") for detail in details}
    pending_codes = {"determining_status", "requirements_pending_verification"}
    if closed or "contact_stripe" in resolutions or any(str(code).startswith("unsupported_") for code in codes):
        status = "restricted"
    elif "provide_info" in resolutions:
        status = "requirements_due"
    elif account.charges_enabled:
        status = "complete"
    elif codes and codes <= pending_codes:
        status = "verifying"
    else:
        status = "restricted"
    account.onboarding_status = status


def account_status(business_id, account):
    return {
        "businessId": business_id,
        "connected": bool(account),
        "accountId": account.stripe_account_id if account else None,
        "onboardingStatus": account.onboarding_status if account else "not_started",
        "chargesEnabled": account.charges_enabled if account else False,
        "payoutsEnabled": account.payouts_enabled if account else False,
        "updatedAt": account.updated_at if account else None,
    }
