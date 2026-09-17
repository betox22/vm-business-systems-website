from __future__ import annotations

import json
import os
import re
import time
from typing import Any, Dict, Literal, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from .client_auth import fetch_supabase_user, supabase_auth_configured
from .db import get_session
from .db_models import PlatformSubscription, Store, StripeEvent
from .stripe_gateway import checkout_session, construct_event, create_billing_portal


router = APIRouter(prefix="/api/v1/billing", tags=["billing"])
Product = Literal["kreaton", "listo_pos", "listo_kds"]
PaymentMethod = Literal["stripe", "manual"]


PRICE_ENV = {
    "listo_pos": "STRIPE_LISTO_POS_MONTHLY_PRICE_ID",
    "listo_kds": "STRIPE_LISTO_KDS_MONTHLY_PRICE_ID",
}


class SubscriptionCheckoutRequest(BaseModel):
    product: Product
    planId: str = Field(default="", max_length=80)
    manualPaymentReference: Optional[str] = Field(default=None, max_length=240)
    businessRef: str = Field(min_length=1, max_length=160)
    countryCode: str = Field(default="US", min_length=2, max_length=2)
    paymentMethod: PaymentMethod = "stripe"
    ownerEmail: str = Field(default="", max_length=200)
    successUrl: str
    cancelUrl: str
    legalConsent: bool = False
    legalConsentVersion: str = Field(default="", max_length=120)
    legalConsentLanguage: Literal["en", "es"] = "en"

    @model_validator(mode="after")
    def validate_kreaton_plan(self):
        if self.product == "kreaton":
            if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_]*", self.planId):
                raise ValueError("KREATON requires planId (letters, digits and underscores).")
            self.planId = self.planId.lower()
        return self


def kreaton_trial_days() -> int:
    # Provisional 7-day trial until the business chooses its duration; 0 disables it.
    raw = os.getenv("STRIPE_KREATON_TRIAL_DAYS", "7").strip()
    if not re.fullmatch(r"[0-9]+", raw) or not 0 <= int(raw) <= 730:
        raise HTTPException(status_code=503, detail="STRIPE_KREATON_TRIAL_DAYS must be an integer from 0 to 730.")
    return int(raw)


class BillingPortalRequest(BaseModel):
    product: Product
    businessRef: str
    returnUrl: str


def _user(authorization: str) -> Dict[str, Any]:
    token = authorization[7:].strip() if authorization.lower().startswith("bearer ") else ""
    if not token:
        raise HTTPException(status_code=401, detail="Missing access token.")
    if not supabase_auth_configured():
        raise HTTPException(status_code=503, detail="Account login is not configured on the server yet.")
    user = fetch_supabase_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")
    return user


def _record(session: Session, payload: SubscriptionCheckoutRequest, email: str) -> PlatformSubscription:
    statement = select(PlatformSubscription).where(PlatformSubscription.product == payload.product, PlatformSubscription.business_ref == payload.businessRef)
    if payload.product == "kreaton":
        statement = statement.with_for_update()
    record = session.scalar(statement)
    if record and payload.product == "kreaton":
        if record.payment_method != payload.paymentMethod:
            raise HTTPException(status_code=409, detail="Payment method changes require an explicit subscription migration.")
        if payload.paymentMethod == "manual" and record.status != "pending_manual_confirmation":
            raise HTTPException(status_code=409, detail="This manual subscription is no longer pending confirmation.")
    if not record:
        record = PlatformSubscription(product=payload.product, business_ref=payload.businessRef)
        if payload.product == "kreaton" and payload.paymentMethod == "manual":
            # Manual trial uses the local request time, not a Stripe subscription date.
            record.trial_end = int(time.time()) + kreaton_trial_days() * 86400
        session.add(record)
    record.owner_email = email
    record.country_code = payload.countryCode.upper()
    record.payment_method = payload.paymentMethod
    if payload.product == "kreaton":
        record.plan_id = payload.planId
        if payload.paymentMethod == "manual" and "manualPaymentReference" in payload.model_fields_set:
            record.manual_payment_reference = (payload.manualPaymentReference or "").strip() or None
        record.legal_consent_version = payload.legalConsentVersion.strip()
        record.legal_consent_language = payload.legalConsentLanguage
        record.legal_accepted_at = int(time.time())
    return record


def _authorize_product(session: Session, payload: SubscriptionCheckoutRequest, user: Dict[str, Any], listo_billing_key: str) -> None:
    if payload.product == "kreaton":
        if not payload.legalConsent:
            raise HTTPException(status_code=400, detail="Terms of Service and Privacy Policy acceptance is required.")
        if not payload.legalConsentVersion.strip():
            raise HTTPException(status_code=400, detail="Legal consent version is required.")
        store = session.get(Store, payload.businessRef)
        user_id = str(user.get("id") or "").strip()
        user_email = str(user.get("email") or "").strip().lower()
        if not store or not ((user_id and user_id == str(store.owner_user_id or "")) or (user_email and user_email == store.owner_email.lower())):
            raise HTTPException(status_code=403, detail="KREATON project does not belong to this account.")
        return
    expected = os.getenv("LISTO_BILLING_API_KEY", "").strip()
    if not expected or listo_billing_key != expected:
        raise HTTPException(status_code=403, detail="Listo billing integration is not authorized.")
    if "@" not in payload.ownerEmail:
        raise HTTPException(status_code=400, detail="ownerEmail is required for Listo billing.")


@router.post("/subscriptions/checkout")
async def subscription_checkout(
    payload: SubscriptionCheckoutRequest,
    authorization: str = Header(default=""),
    listo_billing_key: str = Header(default="", alias="X-Listo-Billing-Key"),
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    user = _user(authorization) if payload.product == "kreaton" else {}
    _authorize_product(session, payload, user, listo_billing_key)
    if payload.product == "kreaton":
        # Serialize first creation as well as retries for the same store.
        session.execute(select(Store.id).where(Store.id == payload.businessRef).with_for_update())
    owner_email = str(user.get("email") or payload.ownerEmail).strip().lower()
    record = _record(session, payload, owner_email)
    if payload.paymentMethod == "manual":
        record.status = "pending_manual_confirmation"
        record.stripe_price_id = None
        session.commit()
        return {"subscriptionId": record.id, "paymentMethod": "manual", "status": record.status}

    price_env = f"STRIPE_KREATON_{payload.planId.upper()}_PRICE_ID" if payload.product == "kreaton" else PRICE_ENV[payload.product]
    price_id = os.getenv(price_env, "").strip()
    if not price_id:
        raise HTTPException(status_code=503, detail=f"{price_env} is not configured.")
    trial_options = {}
    if payload.product == "kreaton":
        days = kreaton_trial_days()
        if days:
            trial_options["trial_period_days"] = days
        # Materialize the record ID before copying it into Stripe metadata.
        session.flush()
    stripe_session = checkout_session(
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=payload.successUrl,
        cancel_url=payload.cancelUrl,
        customer_email=record.owner_email,
        metadata={"ledger": "platform_billing", "platform_subscription_id": record.id, "product": payload.product, "business_ref": payload.businessRef},
        subscription_metadata={"ledger": "platform_billing", "platform_subscription_id": record.id, "product": payload.product, "business_ref": payload.businessRef},
        **trial_options,
    )
    record.stripe_price_id = price_id
    record.status = "checkout_pending"
    session.commit()
    return {"subscriptionId": record.id, "paymentMethod": "stripe", "status": record.status, "checkoutUrl": stripe_session["url"]}


@router.post("/subscriptions/portal")
async def subscription_portal(payload: BillingPortalRequest, authorization: str = Header(default=""), session: Session = Depends(get_session)) -> Dict[str, Any]:
    user = _user(authorization)
    record = session.scalar(select(PlatformSubscription).where(PlatformSubscription.product == payload.product, PlatformSubscription.business_ref == payload.businessRef))
    if not record or record.owner_email.lower() != str(user.get("email") or "").lower():
        raise HTTPException(status_code=404, detail="Subscription not found.")
    if not record.stripe_customer_id:
        raise HTTPException(status_code=409, detail="Stripe customer is not available yet.")
    return {"portalUrl": create_billing_portal(customer_id=record.stripe_customer_id, return_url=payload.returnUrl)}


def process_billing_event(session: Session, event: Dict[str, Any]) -> None:
    event_id = str(event.get("id") or "")
    if not event_id or session.get(StripeEvent, event_id):
        return
    event_type = str(event.get("type") or "")
    obj = event.get("data", {}).get("object", {})
    metadata = obj.get("metadata") or {}
    record_id = metadata.get("platform_subscription_id")
    record = session.get(PlatformSubscription, record_id) if record_id else None
    subscription_ref = obj.get("subscription") or (obj.get("parent") or {}).get("subscription_details", {}).get("subscription")
    if not record and subscription_ref:
        record = session.scalar(select(PlatformSubscription).where(PlatformSubscription.stripe_subscription_id == str(subscription_ref)))
    if not record and obj.get("id") and event_type.startswith("customer.subscription."):
        record = session.scalar(select(PlatformSubscription).where(PlatformSubscription.stripe_subscription_id == str(obj["id"])))
    if record and not (record.product == "kreaton" and record.payment_method == "manual"):
        # Zero-amount trial invoices and late Checkout events must not end a known trial.
        in_trial = record.product == "kreaton" and record.status == "trialing" and (record.trial_end or 0) > int(time.time())
        if event_type == "checkout.session.completed":
            record.stripe_customer_id = str(obj.get("customer") or "") or record.stripe_customer_id
            record.stripe_subscription_id = str(obj.get("subscription") or "") or record.stripe_subscription_id
            if not in_trial:
                record.status = "active"
        elif event_type in {"invoice.paid", "invoice.payment_succeeded"}:
            if not in_trial:
                record.status = "active"
        elif event_type == "invoice.payment_failed":
            record.status = "past_due"
        elif event_type == "customer.subscription.deleted":
            record.status = "cancelled"
        elif event_type == "customer.subscription.updated" or (record.product == "kreaton" and event_type == "customer.subscription.created"):
            record.status = str(obj.get("status") or record.status)
            record.current_period_end = obj.get("current_period_end")
            if record.product == "kreaton":
                record.stripe_subscription_id = str(obj.get("id") or "") or record.stripe_subscription_id
                if "trial_end" in obj:
                    record.trial_end = obj["trial_end"]
    session.add(StripeEvent(event_id=event_id, event_type=event_type, livemode=bool(event.get("livemode"))))
    session.commit()


@router.post("/stripe/webhook")
async def billing_webhook(request: Request, stripe_signature: Optional[str] = Header(default=None, alias="Stripe-Signature"), session: Session = Depends(get_session)) -> Dict[str, bool]:
    secret = os.getenv("STRIPE_BILLING_WEBHOOK_SECRET", "").strip()
    if not secret:
        raise HTTPException(status_code=503, detail="STRIPE_BILLING_WEBHOOK_SECRET is not configured.")
    event = construct_event(await request.body(), stripe_signature or "", secret)
    process_billing_event(session, json.loads(json.dumps(event)))
    return {"received": True}
