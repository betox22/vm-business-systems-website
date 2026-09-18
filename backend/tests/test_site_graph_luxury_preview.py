import base64
import hashlib
import json
import os
import subprocess
import sys
from copy import deepcopy
from pathlib import Path

import pytest

from app.site_graph_luxury_preview import ASSETS, PRODUCT_PHOTOS
from app.site_graph_contract import SiteGraph
from app.site_graph_models import SiteGraphRow
from app.site_graph_preview import render_graph
from test_site_graph import api, block, post


def fixture_blocks():
    return [block('objects-hero', 0, 'hero', {'headline': 'UMBRAL / QA', 'subheadline': 'Objetos para habitar con calma.'}),
            block('objects-products', 1, 'product_grid', {'heading': 'Formas cotidianas', 'section_text': 'Una seleccion de objetos para la mesa.', 'items': [{'name': 'Jarron blanco', 'description': 'Jarron de silueta redondeada.'}, {'name': 'Duo de recipientes con tapa', 'description': 'Dos recipientes elevados con tapa.'}]}),
            block('objects-trust', 2, 'trust_facts', {'contact': {'phone': '+1 202 555 0100', 'whatsapp': '+1 202 555 0100', 'email': 'qa@example.test', 'address': 'Escenario de prueba, Calle Modelo 12'}, 'experience_years': 0, 'certifications': ['Declaracion sintetica de prueba'], 'guarantee': 'Condiciones declaradas para este escenario de prueba.', 'promotion': {'text': 'Demostracion de informacion manual.', 'valid_until': '2020-01-01'}}),
            block('objects-cart', 3, 'cart_embed', {'module': 'shared-commerce-cart'}),
            block('objects-checkout', 4, 'checkout_embed', {'module': 'storefront-checkout'}),
            block('objects-footer', 5, 'footer', {'text': 'UMBRAL / QA - Escenario sintetico interno.'})]


def graph(blocks=None):
    return SiteGraph(site_id='sample', version=1, blocks=fixture_blocks() if blocks is None else blocks)


def test_legacy_output_is_identical_to_release():
    source = subprocess.check_output(['git', 'show', '10fb54b:backend/app/site_graph_preview.py'], cwd=Path(__file__).parents[2], text=True)
    scope = {'__name__': 'app._legacy_preview', '__package__': 'app'}
    exec(compile(source, 'legacy_preview', 'exec'), scope)
    for blocks in (fixture_blocks(), [], [block(content={'headline': '<b>Unsafe</b>'})]):
        assert render_graph(graph(blocks)) == scope['render_graph'](graph(blocks))


@pytest.mark.parametrize('token,status', [(None, 401), ('expired', 401), ('owner', 403), ('support', 403), ('admin', 200)])
def test_luxury_auth_only(api, monkeypatch, token, status):
    monkeypatch.setenv('KREATON_AI_GRAPH_ENABLED', '1')
    client, _ = api
    post(client)
    response = client.get('/api/admin/internal/graph-preview?site_id=sample&pattern=luxury_quiet', headers={'Authorization': f'Bearer {token}'} if token else {})
    assert response.status_code == status


@pytest.mark.parametrize('query', ['pattern=other', 'fixture=other', 'fixture=objects_qa', 'pattern=luxury_quiet&fixture=objects_qa'])
def test_bad_selection_rejected_without_mutation(api, query):
    client, factory = api
    post(client)
    response = client.get('/api/admin/internal/graph-preview?site_id=sample&' + query, headers={'Authorization': 'Bearer admin'})
    assert response.status_code == 422
    with factory() as session:
        row = session.get(SiteGraphRow, 'sample')
        assert row.version == 1 and row.blocks == [block()]


def test_fixture_route_headers_audit_and_read_only(api, monkeypatch):
    from app.db_models import AdminAuditEvent
    from sqlalchemy import select
    monkeypatch.setenv('KREATON_AI_GRAPH_ENABLED', '1')
    client, factory = api
    assert post(client, [{'op': 'add_block', 'block': b} for b in fixture_blocks()]).status_code == 200
    with factory() as session:
        row = session.get(SiteGraphRow, 'sample')
        timestamps = (row.created_at, row.updated_at)
    response = client.get('/api/admin/internal/graph-preview?site_id=sample&pattern=luxury_quiet&fixture=objects_qa', headers={'Authorization': 'Bearer admin'})
    assert response.status_code == 200
    assert len(response.content) < 1_500_000
    css = response.text.split('<style>')[1].split('</style>')[0]
    digest = base64.b64encode(hashlib.sha256(css.encode()).digest()).decode()
    assert response.headers['content-security-policy'] == f"default-src 'none'; style-src 'sha256-{digest}'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'; img-src data:; font-src data:"
    assert response.headers['cache-control'] == 'no-store'
    assert response.headers['x-robots-tag'] == 'noindex, nofollow'
    with factory() as session:
        row = session.get(SiteGraphRow, 'sample')
        assert row.version == 1 and row.blocks == fixture_blocks()
        assert (row.created_at, row.updated_at) == timestamps
        assert session.scalars(select(AdminAuditEvent).where(AdminAuditEvent.action == 'admin.graph.preview')).one().outcome == 'success'
    legacy = client.get('/api/admin/internal/graph-preview?site_id=sample', headers={'Authorization': 'Bearer support'})
    assert legacy.status_code == 200
    assert 'img-src' not in legacy.headers['content-security-policy']


def test_asset_hashes_and_budget():
    manifest = json.loads((ASSETS / 'manifest.json').read_text())
    for item in manifest.values():
        assert hashlib.sha256((ASSETS / item['file']).read_bytes()).hexdigest() == item['sha256']
    html = render_graph(graph(), 'luxury_quiet', 'objects_qa')
    assert len(html.encode()) < 1_500_000
    assert html.count('<img ') == 3
    assert 'font/otf;base64,' in html
    assert 'Unsplash' in html


def test_luxury_cookie_auth_and_missing_graph(api, monkeypatch):
    monkeypatch.setenv('KREATON_AI_GRAPH_ENABLED', '1')
    client, _ = api
    post(client)
    client.cookies.set('kreaton_admin_session', 'admin', path='/api/admin')
    assert client.get('/api/admin/internal/graph-preview?site_id=sample&pattern=luxury_quiet').status_code == 200
    assert client.get('/api/admin/internal/graph-preview?site_id=missing&pattern=luxury_quiet').status_code == 404


def test_luxury_route_absent_with_flag_off():
    from app import main
    from fastapi.testclient import TestClient
    with TestClient(main.app) as client:
        assert client.get('/api/admin/internal/graph-preview?site_id=sample&pattern=luxury_quiet&fixture=objects_qa').status_code == 404


@pytest.mark.parametrize('change', ['hero_id', 'headline', 'grid_id', 'name', 'duplicate', 'nondict', 'numeric_name'])
def test_fixture_is_identity_bound(change):
    blocks = fixture_blocks()
    if change == 'hero_id': blocks[0]['block_id'] = 'other'
    elif change == 'headline': blocks[0]['content']['headline'] = 'Other business'
    elif change == 'grid_id': blocks[1]['block_id'] = 'other'
    elif change == 'name': blocks[1]['content']['items'][0]['name'] = 'Other tool'
    elif change == 'duplicate': blocks[1]['content']['items'][1] = blocks[1]['content']['items'][0]
    elif change == 'numeric_name': blocks[1]['content']['items'][0]['name'] = 7
    else: blocks[1]['content']['items'][0] = 1
    with pytest.raises(ValueError):
        render_graph(graph(blocks), 'luxury_quiet', 'objects_qa')


def test_fixture_reordering_uses_names_not_position():
    blocks = fixture_blocks()
    blocks[1]['content']['items'].reverse()
    html = render_graph(graph(blocks), 'luxury_quiet', 'objects_qa')
    assert html.index('alt="Duo de recipientes con tapa"') < html.index('alt="Jarron blanco"')


def test_untrusted_content_never_controls_resources():
    attack = '<script src="https://evil.test/a"></script><img src=x onerror=alert(1)>'
    blocks = [block('hero', 0, 'hero', {'headline': attack, 'subheadline': attack, 'image': 'https://evil.test/image', 'style': '</style><script>x</script>'}),
              block('grid', 1, 'product_grid', {'heading': attack, 'section_text': attack, 'items': [{'name': attack, 'description': attack, 'image_url': 'https://evil.test/a'}, None]}),
              block('footer', 2, 'footer', {'text': attack}),
              block('trust', 3, 'trust_facts', {'guarantee': 'A & B "test"'})]
    html = render_graph(graph(blocks), 'luxury_quiet')
    assert '<script' not in html and '<img' not in html
    assert html.count('<style>') == html.count('</style>') == 1
    assert '&lt;script' in html and 'A &amp; B &quot;test&quot;' in html
    assert 'https://evil.test/image' not in html


@pytest.mark.parametrize('content', [{}, {'contact': {}}, {'experience_years': 0}, {'promotion': {'text': 'Manual', 'valid_until': '2020-01-01'}}])
def test_trust_empty_zero_and_expiry(content):
    b = block('trust', 0, 'trust_facts')
    b['content'] = content
    html = render_graph(graph([b]), 'luxury_quiet')
    assert ('data-block-type="trust_facts"' in html) == bool(content.get('experience_years') is not None or content.get('promotion'))
    if 'experience_years' in content: assert '<dd>0</dd>' in html
    if 'promotion' in content: assert '2020-01-01' in html


def test_order_heading_anchors_embeds_and_no_execution():
    blocks = fixture_blocks()
    blocks.append(block('second-hero', 6, 'hero', {'headline': 'Second'}))
    value = graph(blocks)
    before = deepcopy(value.model_dump())
    html = render_graph(value, 'luxury_quiet')
    assert value.model_dump() == before
    positions = [html.index(f'id="{b.block_id}"') for b in value.blocks]
    assert positions == sorted(positions)
    assert html.count('<h1>') == 1 and '<h2>Second</h2>' in html
    assert 'href="#objects-products"' in html
    assert html.count('type="button" disabled') == 2
    for marker in ('<script', '<form', 'data-cart-add', 'localStorage', 'fetch(', '/api/v1/checkout'):
        assert marker not in html
    assert 'Ver coleccion' not in render_graph(graph([block()]), 'luxury_quiet')


def test_long_text_twelve_products_empty_and_partial():
    blocks = [block(content={'headline': 'W' * 400}), block('grid', 1, 'product_grid', {'items': [{'name': str(i), 'description': 'D' * 400} for i in range(12)]})]
    html = render_graph(graph(blocks), 'luxury_quiet')
    assert html.count('<article') == 12 and 'W' * 400 in html
    assert 'D' * 400 in html
    assert '<main></main>' in render_graph(graph([]), 'luxury_quiet')
    assert '<article' not in render_graph(graph([block(type='product_grid', content={'items': None})]), 'luxury_quiet')


def test_shared_visual_policy_is_closed():
    import inspect
    from app import site_graph_api
    from app.site_graph_preview import VISUAL_RESOURCE_PATTERNS
    assert VISUAL_RESOURCE_PATTERNS == frozenset({'bold_commerce', 'luxury_quiet'})
    source = inspect.getsource(site_graph_api)
    assert source.count('is_visual = pattern in VISUAL_RESOURCE_PATTERNS') == 1
    assert 'if is_visual and' in source and 'if is_visual else' in source


@pytest.mark.parametrize('query', ['pattern=editorial_minimal', 'pattern=luxury_quiet&fixture=hardware_qa', 'pattern=bold_commerce&fixture=objects_qa'])
def test_crossed_selection(api, query):
    client, factory = api
    post(client, [{'op': 'add_block', 'block': b} for b in fixture_blocks()])
    with factory() as session:
        row = session.get(SiteGraphRow, 'sample')
        before = (deepcopy(row.blocks), row.version, row.created_at, row.updated_at)
    assert client.get('/api/admin/internal/graph-preview?site_id=sample&' + query, headers={'Authorization': 'Bearer admin'}).status_code == 422
    with factory() as session:
        row = session.get(SiteGraphRow, 'sample')
        assert (row.blocks, row.version, row.created_at, row.updated_at) == before


def test_bold_byte_identical_to_base():
    from test_site_graph_bold_preview import graph as bold_graph
    source = subprocess.check_output(['git', 'show', '10fb54b:backend/app/site_graph_preview.py'], cwd=Path(__file__).parents[2], text=True)
    scope = {'__name__': 'app._base_preview', '__package__': 'app'}
    exec(compile(source, 'base_preview', 'exec'), scope)
    for fixture in (None, 'hardware_qa'):
        assert render_graph(bold_graph(), 'bold_commerce', fixture) == scope['render_graph'](bold_graph(), 'bold_commerce', fixture)


@pytest.mark.parametrize('count', [1, 3, 12])
def test_text_only_counts(count):
    value = graph([block(type='product_grid', content={'items': [{'name': str(i)} for i in range(count)]})])
    html = render_graph(value, 'luxury_quiet')
    assert html.count('<article') == count and '<img' not in html


@pytest.mark.parametrize('flag', [None, '0'])
def test_flag_absent_or_zero_never_registers_visual_route(flag):
    env = {**os.environ, 'DATABASE_URL': 'sqlite://', 'OPENAI_API_KEY': ''}
    if flag is None:
        env.pop('KREATON_AI_GRAPH_ENABLED', None)
    else:
        env['KREATON_AI_GRAPH_ENABLED'] = flag
    script = "from app.main import app; from fastapi.testclient import TestClient; c=TestClient(app); assert all(c.get('/api/admin/internal/graph-preview?site_id=sample&pattern='+p).status_code==404 for p in ('bold_commerce','luxury_quiet'))"
    result = subprocess.run([sys.executable, '-c', script], env=env, capture_output=True, text=True, timeout=30)
    assert result.returncode == 0, result.stdout + result.stderr
