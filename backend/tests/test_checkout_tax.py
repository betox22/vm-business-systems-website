import asyncio
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import Mock, patch

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app import commerce, stripe_gateway
from app.db import Base
from app.db_models import Store, Product, Order


@pytest.mark.parametrize('cents,quantity,rate,expected_tax', [(10000, 1, None, 0), (10000, 1, 0, 0), (10000, 1, 700, 700), (1999, 3, 825, 495), (1, 1, 700, 0)])
def test_order_tax_reaches_stripe_sdk(cents, quantity, rate, expected_tax):
    engine = create_engine('sqlite://')
    Base.metadata.create_all(engine)
    commerce.CARTS.clear()
    sdk = Mock()
    sdk.v1.checkout.sessions.create.return_value = SimpleNamespace(id='cs_test_tax', url='https://example.invalid/checkout')
    try:
        with Session(engine) as session:
            settings = {} if rate is None else {'tax_rate_bps': rate}
            session.add(Store(id='tax-test', name='Test', business_type='retail', owner_email='test@example.invalid', public_url='example.invalid', **settings))
            session.flush()
            session.add(Product(id='tax-product', store_id='tax-test', name='Test product', category='test', price_cents=cents, inventory=10, status='Published'))
            session.commit()
            quote = asyncio.run(commerce.add_cart_item(commerce.AddCartItemRequest(businessId='tax-test', cartId='tax-cart', productId='tax-product', quantity=quantity), session=session))
            order = commerce.create_order_from_cart(session, 'tax-cart', 'tax-test', commerce.CustomerInfo(email='buyer@example.invalid', firstName='Test', lastName='Buyer'), commerce.ShippingAddress(line1='Test', city='Test', region='FL', postalCode='33101'), 'payment_processing', {})
            api_order = commerce.order_to_api(order)
            session.get(Store, 'tax-test').tax_rate_bps = 1500
            session.commit()
            assert commerce.order_to_api(session.get(Order, order.id)) == api_order
            with patch.dict('os.environ', {'STRIPE_SECRET_KEY': 'sk_test_placeholder'}), patch.object(stripe_gateway, '_client', return_value=sdk):
                commerce.stripe_checkout_session(api_order, 'https://example.invalid/success', 'https://example.invalid/cancel')
            lines = sdk.v1.checkout.sessions.create.call_args.args[0]['line_items']
            charged = sum(line['price_data']['unit_amount'] * line['quantity'] for line in lines)
            assert charged == session.get(Order, order.id).total_cents == commerce.price_to_cents(quote['total'])
            assert charged == cents * quantity + expected_tax
            taxes = [line for line in lines if line['price_data']['product_data']['name'] == 'Tax']
            assert len(taxes) == bool(expected_tax)
            if expected_tax:
                assert taxes[0]['price_data']['unit_amount'] == expected_tax
                assert taxes[0]['quantity'] == 1
    finally:
        commerce.CARTS.clear()
        engine.dispose()


@pytest.mark.parametrize('tax', ['0.00', '0.01', '8.25'])
def test_stripe_uses_order_tax_not_a_second_fixed_rate(tax):
    order = {'id': 'test', 'orderNumber': 'TEST', 'items': [{'name': 'Test', 'unitPrice': 10, 'quantity': 2}], 'taxAmount': Decimal(tax), 'total': Decimal('20') + Decimal(tax)}
    with patch.dict('os.environ', {'STRIPE_SECRET_KEY': 'sk_test_placeholder'}), patch.object(commerce, 'create_stripe_session', return_value={}) as stripe:
        commerce.stripe_checkout_session(order, 'https://example.invalid/success', 'https://example.invalid/cancel')
    lines = stripe.call_args.kwargs['line_items']
    assert sum(line['price_data']['unit_amount'] * line['quantity'] for line in lines) == commerce.price_to_cents(order['total'])


def test_inconsistent_total_is_rejected_before_stripe_call():
    order = {'id': 'test', 'orderNumber': 'TEST', 'items': [{'name': 'Test', 'unitPrice': 10, 'quantity': 1}], 'taxAmount': 0.70, 'total': 12}
    with patch.dict('os.environ', {'STRIPE_SECRET_KEY': 'sk_test_placeholder'}), patch.object(commerce, 'create_stripe_session') as stripe:
        with pytest.raises(HTTPException) as error:
            commerce.stripe_checkout_session(order, 'https://example.invalid/success', 'https://example.invalid/cancel')
        assert error.value.status_code == 409
        stripe.assert_not_called()


def test_legacy_store_tax_migration_is_additive_and_repeatable(monkeypatch):
    from app import db
    engine = create_engine('sqlite://')
    try:
        with engine.begin() as connection:
            connection.exec_driver_sql('CREATE TABLE stores (id TEXT PRIMARY KEY, owner_user_id TEXT)')
            connection.exec_driver_sql("INSERT INTO stores (id) VALUES ('legacy')")
        monkeypatch.setattr(db, 'engine', engine)
        db._ensure_additive_columns()
        db._ensure_additive_columns()
        with engine.connect() as connection:
            assert connection.exec_driver_sql('SELECT tax_rate_bps FROM stores').scalar_one() == 0
    finally:
        engine.dispose()
