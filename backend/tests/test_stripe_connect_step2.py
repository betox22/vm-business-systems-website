from concurrent.futures import ThreadPoolExecutor
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
import time

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select, func
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects import postgresql

from app import client_auth, commerce, stripe_gateway
from app.db import Base, get_session
from app.db_models import Store, StripeConnectAccount
from app.stripe_connect import locked_store

PATH = '/api/v1/store-owner/owned/stripe-connect'


@pytest.fixture
def setup(tmp_path, monkeypatch):
    engine = create_engine(f'sqlite:///{tmp_path / "connect.db"}', connect_args={'check_same_thread': False})
    Base.metadata.create_all(engine)
    sessions = sessionmaker(engine)
    with sessions() as db:
        db.add(Store(id='owned', name='Test shop', owner_user_id='owner', owner_email='owner@example.test', business_type='retail', public_url='example.test'))
        db.commit()
    def database():
        with sessions() as db:
            yield db
    app = FastAPI()
    app.include_router(commerce.router)
    app.dependency_overrides[get_session] = database
    monkeypatch.setenv('STRIPE_CONNECT_REFRESH_URL', 'https://example.test/client/portal/?business_id=owned')
    monkeypatch.setenv('STRIPE_CONNECT_RETURN_URL', 'https://example.test/client/portal/?business_id=owned')
    with patch.object(client_auth, 'supabase_auth_configured', return_value=True), patch.object(client_auth, 'fetch_supabase_user', side_effect=lambda token: {'id': token, 'email': f'{token}@example.test'}), TestClient(app) as http:
        http.cookies.set('luma_client_session', 'owner')
        yield http, sessions
    engine.dispose()


def add_account(sessions):
    with sessions() as db:
        db.add(StripeConnectAccount(store_id='owned', stripe_account_id='acct_test', charges_enabled=False, payouts_enabled=False, onboarding_status='pending', updated_at=1))
        db.commit()


def remote(card='active', payout='active', code=None, resolution=None):
    return {'id': 'acct_test', 'configuration': {'merchant': {'capabilities': {
        'card_payments': {'status': card, 'status_details': [{'code': code, 'resolution': resolution}] if code else []},
        'stripe_balance': {'payouts': {'status': payout}},
    }}}}


@pytest.mark.parametrize('card,payout,code,resolution,status,charges,payouts', [
    ('active', 'active', None, None, 'complete', True, True),
    ('active', 'restricted', None, None, 'complete', True, False),
    ('restricted', 'restricted', 'requirements_past_due', 'provide_info', 'requirements_due', False, False),
    ('restricted', 'restricted', 'requirements_pending_verification', 'no_resolution', 'verifying', False, False),
    ('restricted', 'restricted', 'determining_status', 'no_resolution', 'verifying', False, False),
    ('restricted', 'restricted', 'unsupported_country', 'no_resolution', 'restricted', False, False),
])
def test_refresh_reconciles_provider_not_local(setup, card, payout, code, resolution, status, charges, payouts):
    http, sessions = setup
    add_account(sessions)
    sdk = MagicMock()
    sdk.v2.core.accounts.retrieve.return_value.to_dict_recursive.return_value = remote(card, payout, code, resolution)
    with patch.object(stripe_gateway, '_client', return_value=sdk):
        response = http.post(PATH + '/refresh')
    assert response.status_code == 200, response.text
    body = response.json()
    assert body['onboardingStatus'] == status
    assert body['chargesEnabled'] == charges and body['payoutsEnabled'] == payouts
    assert body['refreshedAt'] > 1
    sdk.v2.core.accounts.retrieve.assert_called_once_with('acct_test', {'include': ['configuration.merchant', 'requirements']})
    with sessions() as db:
        account = db.get(StripeConnectAccount, 'owned')
        assert account.onboarding_status == status
        assert account.updated_at == body['refreshedAt']


def test_get_has_no_provider_call_or_write(setup):
    http, sessions = setup
    add_account(sessions)
    with patch.object(commerce, 'retrieve_connected_account') as retrieve:
        response = http.get(PATH)
    assert response.json()['updatedAt'] == 1
    retrieve.assert_not_called()
    with sessions() as db:
        assert db.get(StripeConnectAccount, 'owned').updated_at == 1


@pytest.mark.parametrize('bad', ['', 'http://example.test/return', 'javascript:alert(1)', 'https://', 'https://user:password@example.test/', 'https://example.test/#fragment', 'https://example.test:bad/', 'https://bad host/'])
@pytest.mark.parametrize('name', ['STRIPE_CONNECT_REFRESH_URL', 'STRIPE_CONNECT_RETURN_URL'])
def test_url_preflight_no_partial_account(setup, monkeypatch, name, bad):
    http, sessions = setup
    monkeypatch.setenv(name, bad)
    with patch.object(commerce, 'create_connected_account') as create, patch.object(commerce, 'create_account_link') as link:
        response = http.post(PATH + '/onboarding', json={'countryCode': 'US'})
    assert response.status_code == 503
    create.assert_not_called(); link.assert_not_called()
    with sessions() as db:
        assert db.get(StripeConnectAccount, 'owned') is None


def test_concurrent_onboarding_creates_one_account(setup):
    http, sessions = setup
    def create(**kwargs):
        assert kwargs['idempotency_key'] == 'kreaton-connect-account-v1:owned'
        time.sleep(.1)
        return 'acct_test'
    with patch.object(commerce, 'create_connected_account', side_effect=create) as created, patch.object(commerce, 'create_account_link', return_value='https://connect.stripe.com/test'):
        with ThreadPoolExecutor(max_workers=2) as pool:
            responses = list(pool.map(lambda _: http.post(PATH + '/onboarding', json={'countryCode': 'US'}), range(2)))
    assert [r.status_code for r in responses] == [200, 200]
    assert {r.json()['accountId'] for r in responses} == {'acct_test'}
    assert created.call_count == 1
    with sessions() as db:
        assert db.scalar(select(func.count()).select_from(StripeConnectAccount)) == 1


def test_key_reused_after_provider_timeout_and_link_failure(setup):
    http, sessions = setup
    with patch.object(commerce, 'create_connected_account', side_effect=[HTTPException(502, 'timeout'), 'acct_test']) as create, patch.object(commerce, 'create_account_link', side_effect=[HTTPException(502, 'link failed'), 'https://connect.stripe.com/test']):
        assert http.post(PATH + '/onboarding', json={}).status_code == 502
        assert http.post(PATH + '/onboarding', json={}).status_code == 502
        assert http.post(PATH + '/onboarding', json={}).status_code == 200
    assert create.call_count == 2
    assert create.call_args_list[0].kwargs == create.call_args_list[1].kwargs


def test_gateway_passes_provider_idempotency_option():
    sdk = MagicMock()
    sdk.v2.core.accounts.create.return_value = SimpleNamespace(id='acct_test')
    with patch.object(stripe_gateway, '_client', return_value=sdk):
        stripe_gateway.create_connected_account(email='owner@example.test', display_name='Shop', country='US', idempotency_key='store-stable-key')
    assert sdk.v2.core.accounts.create.call_args.kwargs['options'] == {'idempotency_key': 'store-stable-key'}


def test_postgres_store_lock_statement():
    session = MagicMock()
    with locked_store(session, 'owned'):
        pass
    sql = str(session.scalar.call_args.args[0].compile(dialect=postgresql.dialect()))
    assert 'FOR UPDATE' in sql and 'stores.id =' in sql


@pytest.mark.parametrize('token,status', [(None, 401), ('intruder', 403)])
@pytest.mark.parametrize('route', ['/refresh', '/onboarding'])
def test_mutations_require_owner(setup, token, status, route):
    http, _ = setup
    http.cookies.clear()
    if token: http.cookies.set('luma_client_session', token)
    with patch.object(commerce, 'retrieve_connected_account') as retrieve, patch.object(commerce, 'create_connected_account') as create:
        assert http.post(PATH + route, json={}).status_code == status
    retrieve.assert_not_called(); create.assert_not_called()


def test_refresh_disconnected_does_not_create(setup):
    http, _ = setup
    with patch.object(commerce, 'create_connected_account') as create:
        assert http.post(PATH + '/refresh').status_code == 409
    create.assert_not_called()


@pytest.mark.parametrize('result', [HTTPException(502, 'network failure'), {}, {'id': 'acct_other'}, {'id': 'acct_test'}])
def test_refresh_failure_preserves_local_state(setup, result):
    http, sessions = setup
    add_account(sessions)
    with patch.object(commerce, 'retrieve_connected_account', **({'side_effect': result} if isinstance(result, Exception) else {'return_value': result})):
        assert http.post(PATH + '/refresh').status_code == 502
    with sessions() as db:
        assert db.get(StripeConnectAccount, 'owned').updated_at == 1


def test_gateway_provider_failure_is_502():
    class ProviderError(Exception):
        pass
    sdk = MagicMock()
    sdk.v2.core.accounts.retrieve.side_effect = ProviderError('sensitive provider details')
    with patch.object(stripe_gateway, '_client', return_value=sdk), patch.object(stripe_gateway.stripe, 'StripeError', ProviderError, create=True):
        with pytest.raises(HTTPException) as error:
            stripe_gateway.retrieve_connected_account('acct_test')
    assert error.value.status_code == 502
    assert 'sensitive' not in error.value.detail
