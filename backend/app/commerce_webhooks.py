"""Reconcile signed store-payment events against Stripe's current state."""
import json
import os
import time

from fastapi import HTTPException
from sqlalchemy import select, update

from .commerce import attempt_automatic_shipping_purchase
from .db_models import Order, Product
from .stripe_gateway import retrieve_store_checkout

PAYMENT_EVENTS = frozenset({
    "checkout.session.completed", "checkout.session.async_payment_succeeded",
    "checkout.session.async_payment_failed", "checkout.session.expired",
})


def require(condition, reason):
    if not condition:
        raise HTTPException(400, reason)


def process_payment_event(session, event):
    if event.get("type") not in PAYMENT_EVENTS:
        return {"received": True, "ignored": True}
    key = os.getenv("STRIPE_SECRET_KEY", "")
    if not key.startswith(("sk_test_", "rk_test_", "sk_live_", "rk_live_")):
        raise HTTPException(503, "Stripe environment is not configured.")
    mode = key.startswith(("sk_live_", "rk_live_"))
    require(event.get("livemode") is mode, "Event environment mismatch.")
    snapshot = (event.get("data") or {}).get("object") or {}
    target = (snapshot.get("metadata") or {}).get("order_id")
    order = session.scalar(select(Order).where(Order.id == target).with_for_update())
    require(order is not None, "Order not found.")
    payment = json.loads(order.payment_json or "{}")
    require(payment.get("provider") == "stripe", "Payment provider mismatch.")
    account = payment.get("connectedAccountId") or None
    require((event.get("account") or None) == account, "Payment account mismatch.")
    require(not event.get("context") or event["context"] == account, "Payment context mismatch.")
    if not payment.get("sessionId"):
        raise HTTPException(503, "Checkout has not been committed yet.")

    def validate(obj):
        require(obj.get("id") == payment["sessionId"], "Checkout session mismatch.")
        require((obj.get("metadata") or {}).get("order_id") == order.id, "Order metadata mismatch.")
        require((obj.get("metadata") or {}).get("ledger") == "store_commerce", "Payment ledger mismatch.")
        require(obj.get("livemode") is mode, "Checkout environment mismatch.")
        require(type(obj.get("amount_total")) is int and obj["amount_total"] == order.total_cents, "Payment amount mismatch.")
        require(obj.get("currency") == "usd" and obj.get("mode") == "payment", "Payment currency or mode mismatch.")

    validate(snapshot)
    current = retrieve_store_checkout(payment["sessionId"], account)
    validate(current)
    if order.status in {"paid", "partially_fulfilled", "fulfilled", "refunded"}:
        return {"received": True, "status": order.status}
    if current.get("status") == "complete" and current.get("payment_status") == "paid":
        if order.inventory_restocked:
            # Do not fulfil a late payment after inventory has been released.
            raise HTTPException(409, "Paid checkout conflicts with released inventory; reconciliation required.")
        state, provider = "paid", "paid"
    elif current.get("status") == "expired" and current.get("payment_status") == "unpaid":
        state, provider = "cancelled", "expired"
    elif event["type"] == "checkout.session.async_payment_failed" and current.get("payment_status") == "unpaid":
        intent = current.get("payment_intent") or {}
        if not isinstance(intent, dict) or not intent.get("status"):
            raise HTTPException(503, "Payment intent state is incomplete.")
        state = "failed" if intent["status"] in {"requires_payment_method", "canceled"} else "payment_processing"
        provider = "failed" if state == "failed" else "processing"
    else:
        state, provider = "payment_processing", "processing"
    if order.status in {"failed", "cancelled"} and state == "payment_processing":
        return {"received": True, "status": order.status}
    if state in {"failed", "cancelled"} and not order.inventory_restocked:
        # Order row lock serializes retries; atomic increments avoid lost stock updates.
        for item in json.loads(order.items_json or "[]"):
            quantity = item.get("quantity")
            if type(quantity) is int and quantity > 0:
                session.execute(update(Product).where(Product.id == item.get("productId"),
                    Product.store_id == order.store_id).values(inventory=Product.inventory + quantity))
        order.inventory_restocked = True
    order.status = state
    if state == "paid":
        # task #54: buy the real shipping label automatically now that the
        # order is genuinely confirmed paid. Never raises -- a failure here
        # flags the order (needs_shipping_attention) for the owner's manual
        # retry instead of breaking payment confirmation.
        attempt_automatic_shipping_purchase(session, order)
    payment.update(providerStatus=provider, webhookReconciledAt=int(time.time()), lastWebhookEvent=event.get("id"))
    order.payment_json = json.dumps(payment)
    session.commit()
    return {"received": True, "status": state}
