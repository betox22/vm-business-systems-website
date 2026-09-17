import json
from unittest.mock import patch, MagicMock

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.db import Base
from app.db_models import Store, Product, Order
from app.commerce_webhooks import process_payment_event
from app import stripe_gateway


@pytest.fixture
def case(monkeypatch):
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_fixture")
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with Session(engine) as s:
        s.add(Store(id="s", owner_email="x@example.test", name="Test", business_type="retail", public_url="test"))
        s.add(Product(id="p", store_id="s", name="Item", category="a", price_cents=1000, inventory=3))
        s.add(Order(id="o", store_id="s", order_number="O", item_count=2, total_cents=2000,
            status="payment_processing", items_json=json.dumps([{"productId":"p","quantity":2}]),
            payment_json=json.dumps({"provider":"stripe","sessionId":"cs_test_1","connectedAccountId":"acct_test"})))
        s.commit()
        obj = dict(id="cs_test_1", metadata={"order_id":"o","ledger":"store_commerce"}, livemode=False,
                   amount_total=2000, currency="usd", mode="payment", status="complete", payment_status="paid")
        event = dict(id="evt_1", type="checkout.session.completed", account="acct_test", livemode=False, data={"object":obj})
        yield s, obj, event
    engine.dispose()


@pytest.mark.parametrize("kind", ["completed", "async_payment_succeeded"])
def test_paid_events(case, kind):
    s,obj,event=case
    event["type"]="checkout.session."+kind
    with patch("app.commerce_webhooks.retrieve_store_checkout", return_value=obj):
        assert process_payment_event(s,event)["status"]=="paid"
        assert process_payment_event(s,event)["status"]=="paid"
    assert s.get(Product,"p").inventory==3


@pytest.mark.parametrize("kind,status", [("expired","cancelled"),("async_payment_failed","failed")])
def test_failure_releases_inventory_once_and_survives_new_session(case, kind, status):
    s,obj,event=case
    event["type"]="checkout.session."+kind
    obj.update(status="expired" if kind=="expired" else "complete",payment_status="unpaid",payment_intent={"status":"requires_payment_method"})
    with patch("app.commerce_webhooks.retrieve_store_checkout", return_value=obj):
        assert process_payment_event(s,event)["status"]==status
        with Session(s.get_bind()) as restarted:
            process_payment_event(restarted,event)
            assert restarted.get(Product,"p").inventory==5
        s.expire_all()
    assert s.get(Product,"p").inventory==5
    assert s.get(Order,"o").inventory_restocked


def test_completed_unpaid_does_not_mark_paid(case):
    s,obj,event=case
    obj["payment_status"]="unpaid"
    with patch("app.commerce_webhooks.retrieve_store_checkout", return_value=obj):
        assert process_payment_event(s,event)["status"]=="payment_processing"


@pytest.mark.parametrize("field,value", [("amount_total",1),("currency","eur"),("id","cs_other"),("livemode",True)])
def test_invalid_payment_rejected(case,field,value):
    s,obj,event=case
    obj[field]=value
    with pytest.raises(HTTPException), patch("app.commerce_webhooks.retrieve_store_checkout") as fetch:
        process_payment_event(s,event)
    fetch.assert_not_called()
    assert s.get(Order,"o").status=="payment_processing"


def test_old_expiration_cannot_revert_paid(case):
    s,obj,event=case
    with patch("app.commerce_webhooks.retrieve_store_checkout", return_value=obj):
        process_payment_event(s,event)
        event["type"]="checkout.session.expired"
        process_payment_event(s,event)
    assert s.get(Order,"o").status=="paid"
    assert s.get(Product,"p").inventory==3


def test_new_connected_accounts_use_express_without_changing_responsibility():
    client=MagicMock()
    client.v2.core.accounts.create.return_value.id="acct_new"
    with patch.object(stripe_gateway,"_client",return_value=client):
        assert stripe_gateway.create_connected_account(email="test@example.test",display_name="Test",country="US")=="acct_new"
    params=client.v2.core.accounts.create.call_args.args[0]
    assert params["dashboard"]=="express"
    assert params["defaults"]["responsibilities"]=={"fees_collector":"stripe","losses_collector":"stripe"}


def test_wrong_connected_account_never_updates_order(case):
    s, obj, event = case
    event["account"] = "acct_wrong"
    with patch("app.commerce_webhooks.retrieve_store_checkout") as fetch, pytest.raises(HTTPException):
        process_payment_event(s, event)
    fetch.assert_not_called()
    assert s.get(Order, "o").status == "payment_processing"


def test_success_after_restock_is_not_silently_fulfilled(case):
    s, obj, event = case
    s.get(Order, "o").inventory_restocked = True
    s.commit()
    with patch("app.commerce_webhooks.retrieve_store_checkout", return_value=obj), pytest.raises(HTTPException) as error:
        process_payment_event(s, event)
    assert error.value.status_code == 409


def test_return_status_requires_same_store_and_reveals_only_paid(case):
    from fastapi import Response
    from app.commerce import checkout_return_status
    s, obj, event = case
    response = Response()
    assert checkout_return_status("s", "cs_test_1", response, s) == {"paid": False}
    assert response.headers["Cache-Control"] == "no-store"
    with patch("app.commerce_webhooks.retrieve_store_checkout", return_value=obj):
        process_payment_event(s, event)
    assert checkout_return_status("s", "cs_test_1", response, s) == {"paid": True}
    with pytest.raises(HTTPException):
        checkout_return_status("another-store", "cs_test_1", response, s)
