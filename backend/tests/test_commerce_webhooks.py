from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
import json
from unittest.mock import MagicMock, patch

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select, func
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects import postgresql
from sqlalchemy.schema import CreateTable

from app import commerce, commerce_webhooks as hooks, db, stripe_webhook_gateway as gateway
from app.db import Base, get_session
from app.db_models import Store, Order, StripeConnectAccount, CommerceStripeEvent as Receipt, CommerceStripeReconciliation as Cursor

PAY = '/api/v1/payments/stripe/webhook'
CONNECT = '/api/v1/payments/stripe/connect-webhook'


@pytest.fixture
def setup(tmp_path, monkeypatch):
    url = f'sqlite:///{tmp_path / "webhooks.db"}'
    engine = create_engine(url, connect_args={'check_same_thread': False})
    Base.metadata.create_all(engine)
    sessions = sessionmaker(engine)
    with sessions() as session:
        session.add(Store(id='store', name='Test', owner_user_id='owner', owner_email='owner@example.test', business_type='retail', public_url='example.test'))
        session.flush()
        session.add(Order(id='order', store_id='store', order_number='ORDER-1', item_count=1, total_cents=10700, status='payment_processing', payment_json=json.dumps({'provider':'stripe', 'sessionId':'cs_test', 'connectedAccountId':'acct_test', 'providerStatus':'session_created'})))
        session.add(StripeConnectAccount(store_id='store', stripe_account_id='acct_test', charges_enabled=True, payouts_enabled=True, details_submitted=True, onboarding_status='complete'))
        session.commit()
    def database():
        with sessions() as session:
            yield session
    app = FastAPI()
    app.include_router(commerce.router)
    app.dependency_overrides[get_session] = database
    monkeypatch.setenv('STRIPE_SECRET_KEY', 'sk_test_placeholder')
    monkeypatch.setenv('STRIPE_STORE_WEBHOOK_SECRET', 'whsec_test')
    monkeypatch.setenv('STRIPE_CONNECT_WEBHOOK_SECRET', 'whsec_connect_test')
    monkeypatch.setenv('STRIPE_CONNECT_V2_WEBHOOK_SECRET', 'whsec_thin_test')
    # Signature boundary is mocked, NOT provider state or SQL persistence.
    with patch.object(commerce, 'construct_event', side_effect=lambda raw, *_: json.loads(raw)), TestClient(app) as http:
        yield http, sessions, url, app
    engine.dispose()


def checkout(**overrides):
    return {'id':'cs_test','metadata':{'order_id':'order','ledger':'store_commerce'},'amount_total':10700,'currency':'usd','livemode':False,'mode':'payment','status':'complete','payment_status':'paid', **overrides}


def payment_event(kind='checkout.session.completed', id='evt_pay', created=100, **overrides):
    return {'id':id,'type':kind,'created':created,'account':'acct_test','livemode':False,'data':{'object':checkout()}, **overrides}


def connect_event(kind='account.updated', id='evt_connect', created=100):
    return {'id':id,'type':kind,'created':created,'account':'acct_test','livemode':False,'data':{'object':{'id':'acct_test'}}}


def account(**overrides):
    return {'id':'acct_test','livemode':False,'charges_enabled':True,'payouts_enabled':True,'details_submitted':True,'requirements':{}, **overrides}


def v2_account(**overrides):
    return {'id':'acct_test','livemode':False,'configuration':{'merchant':{'capabilities':{'card_payments':{'status':'active'},'stripe_balance':{'payouts':{'status':'active'}}}}}, **overrides}


def order_status(sessions):
    with sessions() as session:
        return session.get(Order, 'order').status


@pytest.mark.parametrize('field,value,error', [
    ('amount_total',10699,'payment_amount_mismatch'),('currency','eur','payment_currency_mismatch'),
    ('id','cs_other','session_id_mismatch'),('livemode',True,'session_environment_mismatch'),
    ('mode','subscription','checkout_mode_mismatch'),
])
def test_bad_snapshot_never_marks_paid(setup, field, value, error):
    http, sessions, *_ = setup
    event = payment_event(); event['data']['object'][field] = value
    with patch.object(hooks, 'fetch_checkout') as fetch:
        response = http.post(PAY, json=event)
    assert response.status_code == 200 and response.json()['error'] == error
    fetch.assert_not_called()
    assert order_status(sessions) == 'payment_processing'
    with sessions() as session:
        assert session.scalar(select(Receipt)).status == 'rejected'


@pytest.mark.parametrize('overrides,error', [
    ({'account':'acct_other'},'payment_account_mismatch'),
    ({'account':None},'payment_account_mismatch'),
    ({'livemode':True},'event_environment_mismatch'),
    ({'context':'acct_other'},'payment_context_unsupported'),
])
def test_bad_origin_never_marks_paid(setup, overrides, error):
    http, sessions, *_ = setup
    with patch.object(hooks, 'fetch_checkout') as fetch:
        response = http.post(PAY, json=payment_event(**overrides))
    assert response.json()['error'] == error
    fetch.assert_not_called()
    assert order_status(sessions) == 'payment_processing'


@pytest.mark.parametrize('field,value', [('amount_total',1),('currency','eur'),('livemode',True),('id','cs_other')])
def test_current_resource_must_match_too(setup, field, value):
    http, sessions, *_ = setup
    with patch.object(hooks, 'fetch_checkout', return_value=checkout(**{field:value})):
        assert http.post(PAY,json=payment_event()).json()['result'] == 'rejected'
    assert order_status(sessions) == 'payment_processing'


def test_completed_unpaid_then_async_success_and_duplicate(setup):
    http, sessions, *_ = setup
    first = payment_event(); first['data']['object']['payment_status'] = 'unpaid'
    with patch.object(hooks, 'fetch_checkout', return_value=checkout(payment_status='unpaid')):
        assert http.post(PAY,json=first).json()['result'] == 'applied'
    assert order_status(sessions) == 'payment_processing'
    event = payment_event('checkout.session.async_payment_succeeded',id='evt_success',created=101)
    with patch.object(hooks, 'fetch_checkout', return_value=checkout()) as fetch:
        assert http.post(PAY,json=event).json()['duplicate'] is False
        assert http.post(PAY,json=event).json()['duplicate'] is True
    fetch.assert_called_once_with('cs_test','acct_test')
    assert order_status(sessions) == 'paid'
    with sessions() as session:
        receipt = session.scalar(select(Receipt).where(Receipt.event_id=='evt_success'))
        assert receipt.attempts == 1 and receipt.status == 'applied'


@pytest.mark.parametrize('kind,current,expected,provider', [
    ('checkout.session.expired',checkout(status='expired',payment_status='unpaid'),'cancelled','expired'),
    ('checkout.session.async_payment_failed',checkout(payment_status='unpaid',payment_intent={'status':'requires_payment_method'}),'failed','failed'),
    ('checkout.session.async_payment_failed',checkout(payment_status='unpaid',payment_intent={'status':'processing'}),'payment_processing','processing'),
    ('checkout.session.completed',checkout(payment_status='no_payment_required'),'payment_processing','processing'),
])
def test_expiration_and_async_are_reconciled(setup, kind, current, expected, provider):
    http, sessions, *_ = setup
    event = payment_event(kind); event['data']['object'] = deepcopy(current)
    with patch.object(hooks,'fetch_checkout',return_value=current):
        assert http.post(PAY,json=event).json()['result'] == 'applied'
    with sessions() as session:
        order = session.get(Order,'order')
        assert order.status == expected
        assert json.loads(order.payment_json)['providerStatus'] == provider


def test_old_payment_and_newer_expiration_cannot_reverse_paid(setup):
    http, sessions, *_ = setup
    with patch.object(hooks,'fetch_checkout',return_value=checkout()) as fetch:
        http.post(PAY,json=payment_event(created=200))
        assert http.post(PAY,json=payment_event('checkout.session.expired',id='evt_old',created=100)).json()['result'] == 'stale'
        fetch.assert_called_once()
    # Even a later notification cannot undo a terminal financial state.
    with patch.object(hooks,'fetch_checkout',return_value=checkout(status='expired',payment_status='unpaid')):
        http.post(PAY,json=payment_event('checkout.session.expired',id='evt_later',created=201))
    assert order_status(sessions) == 'paid'


def test_concurrent_payment_and_restart_deduplicate_durably(setup):
    http, sessions, url, app = setup
    with patch.object(hooks,'fetch_checkout',return_value=checkout()) as fetch:
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(lambda _: http.post(PAY,json=payment_event()).json(),range(2)))
        assert sorted(r['duplicate'] for r in results) == [False,True]
        fetch.assert_called_once()
    # Dispose all connections, create a fresh engine and HTTP client on same DB.
    sessions.kw['bind'].dispose()
    engine = create_engine(url,connect_args={'check_same_thread':False})
    fresh = sessionmaker(engine)
    def database():
        with fresh() as session: yield session
    app.dependency_overrides[get_session] = database
    with TestClient(app) as restarted, patch.object(hooks,'fetch_checkout') as fetch:
        assert restarted.post(PAY,json=payment_event()).json()['duplicate'] is True
        fetch.assert_not_called()
    assert order_status(fresh) == 'paid'
    with fresh() as session:
        assert session.scalar(select(func.count()).select_from(Receipt)) == 1
    engine.dispose()


def test_transient_failure_recorded_and_retried(setup):
    http, sessions, *_ = setup
    with patch.object(hooks,'fetch_checkout',side_effect=HTTPException(502,'stripe_checkout_lookup_failed')):
        assert http.post(PAY,json=payment_event()).status_code == 503
    with sessions() as session:
        assert session.scalar(select(Receipt)).status == 'failed'
        assert session.scalar(select(Cursor)).error_code == 'stripe_checkout_lookup_failed'
    with patch.object(hooks,'fetch_checkout',return_value=checkout()):
        assert http.post(PAY,json=payment_event()).json()['result'] == 'applied'
    with sessions() as session:
        receipt = session.scalar(select(Receipt))
        assert receipt.attempts == 2 and receipt.error_code is None


def test_v1_partial_event_fetches_current_and_preserves_absent_detail(setup):
    http, sessions, *_ = setup
    current = account(charges_enabled=False,payouts_enabled=True,requirements={'pending_verification':['individual']})
    del current['details_submitted']
    with patch.object(hooks,'fetch_account',return_value=current) as fetch:
        assert http.post(CONNECT,json=connect_event()).json()['result'] == 'applied'
        fetch.assert_called_once_with('acct_test',v2=False,context=None)
    with sessions() as session:
        saved = session.get(StripeConnectAccount,'store')
        assert saved.charges_enabled is False and saved.payouts_enabled is True
        assert saved.details_submitted is True and saved.onboarding_status == 'verifying'


def test_deauthorized_uses_event_account_not_application_and_stays_revoked(setup):
    http, sessions, *_ = setup
    event = connect_event('account.application.deauthorized',created=200)
    event['data']['object'] = {'id':'ca_APPLICATION_NOT_ACCOUNT'}
    with patch.object(hooks,'fetch_account') as fetch:
        assert http.post(CONNECT,json=event).json()['result'] == 'applied'
        assert http.post(CONNECT,json=event).json()['duplicate'] is True
        assert http.post(CONNECT,json=connect_event(id='old',created=100)).json()['result'] == 'stale'
        assert http.post(CONNECT,json=connect_event(id='new',created=201)).json()['result'] == 'applied'
        fetch.assert_not_called()
    with sessions() as session:
        account_row = session.get(StripeConnectAccount,'store')
        assert not account_row.charges_enabled and not account_row.payouts_enabled
        assert session.scalar(select(Cursor)).state == 'deauthorized'


@pytest.mark.parametrize('kind', [
    'v2.core.account[requirements].updated',
    'v2.core.account[configuration.merchant].capability_status_updated',
    'v2.core.account.closed',
])
def test_v2_thin_fetches_full_event_and_updates_row(setup, kind):
    http, sessions, *_ = setup
    notification = {'id':'evt_thin','type':kind,'context':None}
    full = {**notification,'livemode':False,'created':'2026-09-14T10:00:00.123Z','related_object':{'id':'acct_test','type':'v2.core.account'}}
    current = v2_account()
    current['configuration']['merchant']['capabilities']['card_payments'] = {'status':'restricted','status_details':[{'code':'requirements_past_due','resolution':'provide_info'}]}
    with patch.object(hooks,'fetch_v2_event',return_value=full) as fetch_event, patch.object(hooks,'fetch_account',return_value=current) as fetch:
        result = http.post(CONNECT+'/v2',json=notification)
        assert result.status_code == 200 and result.json()['result'] == 'applied',result.text
        assert http.post(CONNECT+'/v2',json=notification).json()['duplicate'] is True
        fetch_event.assert_called_once_with('evt_thin',None)
        assert fetch.call_count == (0 if kind.endswith('.closed') else 1)
    with sessions() as session:
        saved = session.get(StripeConnectAccount,'store')
        assert not saved.charges_enabled
        assert saved.payouts_enabled is (not kind.endswith('.closed'))
        assert session.scalar(select(Cursor)).reconciled_at is not None


def test_incomplete_account_resource_is_error_not_false(setup):
    http, sessions, *_ = setup
    with patch.object(hooks,'fetch_account',return_value={'id':'acct_test','livemode':False}):
        assert http.post(CONNECT,json=connect_event()).status_code == 503
    with sessions() as session:
        assert session.get(StripeConnectAccount,'store').charges_enabled is True
        assert session.scalar(select(Receipt)).error_code == 'account_capabilities_incomplete'


def test_same_event_id_is_scoped_by_environment_and_origin(setup):
    http, sessions, *_ = setup
    http.post(PAY,json=payment_event(livemode=True))
    http.post(PAY,json=payment_event(account='acct_other'))
    with patch.object(hooks,'fetch_checkout',return_value=checkout()):
        assert http.post(PAY,json=payment_event()).json()['result'] == 'applied'
    with sessions() as session:
        assert session.scalar(select(func.count()).select_from(Receipt)) == 3


def test_signature_failure_has_no_receipt_or_side_effect(setup):
    http, sessions, *_ = setup
    with patch.object(commerce,'construct_event',side_effect=HTTPException(400,'Invalid Stripe signature.')):
        assert http.post(PAY,json=payment_event()).status_code == 400
    with sessions() as session:
        assert session.scalar(select(func.count()).select_from(Receipt)) == 0
    assert order_status(sessions) == 'payment_processing'


def test_additive_tables_safe_on_repeated_startup(setup, monkeypatch):
    _, sessions, *_ = setup
    engine = sessions.kw['bind']
    monkeypatch.setattr(db,'engine',engine)
    db.init_db(); db.init_db()
    assert order_status(sessions) == 'payment_processing'
    with sessions() as session:
        assert session.scalar(select(func.count()).select_from(Store)) == 1


def test_gateway_calls_are_scoped_reads_only():
    sdk = MagicMock()
    with patch.object(gateway,'_client',return_value=sdk):
        gateway.fetch_checkout('cs_test','acct_test')
        gateway.fetch_account('acct_test',v2=True,context='acct_platform')
        gateway.fetch_account('acct_test',v2=False)
        gateway.fetch_v2_event('evt_test','acct_platform')
    sdk.v1.checkout.sessions.retrieve.assert_called_once_with('cs_test',{'expand':['payment_intent']},options={'stripe_account':'acct_test'})
    sdk.v2.core.accounts.retrieve.assert_called_once_with('acct_test',{'include':['configuration.merchant','requirements']},options={'stripe_context':'acct_platform'})
    sdk.v2.core.events.retrieve.assert_called_once_with('evt_test',options={'stripe_context':'acct_platform'})
    sdk.v1.accounts.retrieve.assert_called_once_with('acct_test')


def test_out_of_order_v1_and_v2_share_account_cursor(setup):
    http, sessions, *_ = setup
    newer = connect_event(created=200)
    with patch.object(hooks,'fetch_account',return_value=account(charges_enabled=False,payouts_enabled=False)):
        http.post(CONNECT,json=newer)
    old = {'id':'old_v2','type':'v2.core.account[requirements].updated','context':None}
    full = {**old,'livemode':False,'created':'1970-01-01T00:01:40Z','related_object':{'id':'acct_test'}}
    with patch.object(hooks,'fetch_v2_event',return_value=full), patch.object(hooks,'fetch_account') as fetch:
        assert http.post(CONNECT+'/v2',json=old).json()['result'] == 'stale'
        fetch.assert_not_called()
    with sessions() as session:
        assert session.get(StripeConnectAccount,'store').charges_enabled is False
        assert session.scalar(select(func.count()).select_from(Cursor)) == 1


def test_newer_notification_uses_current_not_stale_snapshot(setup):
    http, sessions, *_ = setup
    event = connect_event()
    event['data']['object'].update(charges_enabled=True,payouts_enabled=True)
    with patch.object(hooks,'fetch_account',return_value=account(charges_enabled=False,payouts_enabled=False)):
        http.post(CONNECT,json=event)
    with sessions() as session:
        assert session.get(StripeConnectAccount,'store').charges_enabled is False


def test_unknown_error_is_sanitized_durable_and_retryable(setup):
    http, sessions, *_ = setup
    with patch.object(hooks,'fetch_checkout',side_effect=RuntimeError('secret token must not be stored')):
        assert http.post(PAY,json=payment_event()).status_code == 503
    with sessions() as session:
        record = session.scalar(select(Receipt))
        assert record.error_code == 'reconciliation_internal_error'
        assert record.status == 'failed'


def test_v2_missing_capability_does_not_clear_flags(setup):
    http, sessions, *_ = setup
    notice = {'id':'thin','type':'v2.core.account[requirements].updated'}
    full = {**notice,'livemode':False,'created':100,'related_object':{'id':'acct_test'}}
    remote = v2_account(); del remote['configuration']['merchant']['capabilities']['stripe_balance']
    with patch.object(hooks,'fetch_v2_event',return_value=full), patch.object(hooks,'fetch_account',return_value=remote):
        assert http.post(CONNECT+'/v2',json=notice).status_code == 503
    with sessions() as session:
        assert session.get(StripeConnectAccount,'store').payouts_enabled is True


def test_environment_configuration_and_missing_signature_secret_fail_closed(setup, monkeypatch):
    http, sessions, *_ = setup
    monkeypatch.delenv('STRIPE_SECRET_KEY')
    assert http.post(PAY,json=payment_event()).status_code == 503
    monkeypatch.delenv('STRIPE_CONNECT_V2_WEBHOOK_SECRET')
    assert http.post(CONNECT+'/v2',json=connect_event()).status_code == 503
    assert order_status(sessions) == 'payment_processing'


def test_new_ledger_permission_sql_does_not_touch_other_tables():
    engine = MagicMock(); engine.dialect.name = 'postgresql'
    hooks.ensure_webhook_storage_permissions(engine)
    sql = '\n'.join(call.args[0] for call in engine.begin.return_value.__enter__.return_value.exec_driver_sql.call_args_list)
    assert 'commerce_stripe_events FROM PUBLIC' in sql
    assert 'commerce_stripe_reconciliations FROM authenticated' in sql
    assert 'FROM anon' in sql
    assert 'ALTER TABLE' not in sql and 'stripe_connect_accounts' not in sql


def test_postgres_timestamp_supports_epoch_milliseconds():
    ddl = str(CreateTable(Cursor.__table__).compile(dialect=postgresql.dialect()))
    assert 'last_event_created BIGINT' in ddl
