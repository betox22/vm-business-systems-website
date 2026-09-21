import base64
import hashlib
import json
import subprocess
from copy import deepcopy
from pathlib import Path

import pytest

from app.site_graph_bold_preview import ASSETS, PRODUCT_PHOTOS
from app.site_graph_contract import SiteGraph
from app.site_graph_models import SiteGraphRow
from app.site_graph_preview import render_graph
from test_site_graph import api, block, post


def fixture_blocks():
    return [block('qa-hero', 0, 'hero', {'headline': 'FORGE SUPPLY / QA', 'subheadline': 'Herramientas para dar forma a tus ideas.'}),
            block('qa-products', 1, 'product_grid', {'heading': 'Manos a la obra', 'section_text': 'Tres herramientas para tu mesa de trabajo.', 'items': [{'name': name, 'description': 'Herramienta manual del catalogo de prueba.'} for name in PRODUCT_PHOTOS]}),
            block('qa-trust', 2, 'trust_facts', {'contact': {'phone': '+1 202 555 0100', 'whatsapp': '+1 202 555 0100', 'email': 'qa@example.test', 'address': 'Taller de prueba, Calle Modelo 12'}, 'experience_years': 0, 'certifications': ['Declaracion sintetica de prueba'], 'guarantee': 'Condiciones declaradas para este escenario de prueba.', 'promotion': {'text': 'Demostracion de informacion manual.', 'valid_until': '2020-01-01'}}),
            block('qa-footer', 3, 'footer', {'text': 'FORGE SUPPLY / QA - Escenario sintetico interno.'}),
            block('qa-cart', 4, 'cart_embed', {'module': 'shared-commerce-cart'}),
            block('qa-checkout', 5, 'checkout_embed', {'module': 'storefront-checkout'})]


def graph(blocks=None):
    return SiteGraph(site_id='sample', version=1, blocks=fixture_blocks() if blocks is None else blocks)


def test_legacy_output_is_identical_to_release():
    source = subprocess.check_output(['git', 'show', '9569e9b:backend/app/site_graph_preview.py'], cwd=Path(__file__).parents[2], text=True)
    scope = {'__name__': 'app._legacy_preview', '__package__': 'app'}
    exec(compile(source, 'legacy_preview', 'exec'), scope)
    for blocks in (fixture_blocks(), [], [block(content={'headline': '<b>Unsafe</b>'})]):
        assert render_graph(graph(blocks)) == scope['render_graph'](graph(blocks))


@pytest.mark.parametrize('token,status', [(None, 401), ('expired', 401), ('owner', 403), ('support', 403), ('admin', 200)])
def test_bold_auth_only(api, monkeypatch, token, status):
    monkeypatch.setenv('KREATON_AI_GRAPH_ENABLED', '1')
    client, _ = api
    post(client)
    response = client.get('/api/admin/internal/graph-preview?site_id=sample&pattern=bold_commerce', headers={'Authorization': f'Bearer {token}'} if token else {})
    assert response.status_code == status


@pytest.mark.parametrize('query', ['pattern=other', 'fixture=other', 'fixture=hardware_qa', 'pattern=bold_commerce&fixture=hardware_qa'])
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
    response = client.get('/api/admin/internal/graph-preview?site_id=sample&pattern=bold_commerce&fixture=hardware_qa', headers={'Authorization': 'Bearer admin'})
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
        assert session.scalars(select(AdminAuditEvent).where(AdminAuditEvent.action == 'admin.graph.preview')).one().outcome == 'success'
    legacy = client.get('/api/admin/internal/graph-preview?site_id=sample', headers={'Authorization': 'Bearer support'})
    assert legacy.status_code == 200
    assert 'img-src' not in legacy.headers['content-security-policy']


def test_asset_hashes_and_budget():
    manifest = json.loads((ASSETS / 'manifest.json').read_text())
    for item in manifest.values():
        data = (ASSETS / item['file']).read_bytes()
        if item['file'] in {'OFL.txt', 'lucide-LICENSE', 'shopping-cart.svg', 'credit-card.svg'}:
            data = data.replace(b'\r\n', b'\n')
        assert hashlib.sha256(data).hexdigest() == item['sha256']
    html = render_graph(graph(), 'bold_commerce', 'hardware_qa')
    assert len(html.encode()) < 1_500_000
    assert html.count('<img ') == 4
    assert 'font/ttf;base64,' in html
    assert 'CC BY-SA 3.0' in html


def test_bold_cookie_auth_and_missing_graph(api, monkeypatch):
    monkeypatch.setenv('KREATON_AI_GRAPH_ENABLED', '1')
    client, _ = api
    post(client)
    client.cookies.set('kreaton_admin_session', 'admin', path='/api/admin')
    assert client.get('/api/admin/internal/graph-preview?site_id=sample&pattern=bold_commerce').status_code == 200
    assert client.get('/api/admin/internal/graph-preview?site_id=missing&pattern=bold_commerce').status_code == 404


def test_bold_route_absent_with_flag_off():
    from app import main
    from fastapi.testclient import TestClient
    with TestClient(main.app) as client:
        assert client.get('/api/admin/internal/graph-preview?site_id=sample&pattern=bold_commerce&fixture=hardware_qa').status_code == 404


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
        render_graph(graph(blocks), 'bold_commerce', 'hardware_qa')


def test_fixture_reordering_uses_names_not_position():
    blocks = fixture_blocks()
    blocks[1]['content']['items'].reverse()
    html = render_graph(graph(blocks), 'bold_commerce', 'hardware_qa')
    assert html.index('alt="Sargento"') < html.index('alt="Martillo de una"')


def test_untrusted_content_never_controls_resources():
    attack = '<script src="https://evil.test/a"></script><img src=x onerror=alert(1)>'
    blocks = [block('hero', 0, 'hero', {'headline': attack, 'subheadline': attack, 'image': 'https://evil.test/image', 'style': '</style><script>x</script>'}),
              block('grid', 1, 'product_grid', {'heading': attack, 'section_text': attack, 'items': [{'name': attack, 'description': attack, 'image_url': 'https://evil.test/a'}, None]}),
              block('footer', 2, 'footer', {'text': attack}),
              block('trust', 3, 'trust_facts', {'guarantee': 'A & B "test"'})]
    html = render_graph(graph(blocks), 'bold_commerce')
    assert '<script' not in html and '<img' not in html
    assert html.count('<style>') == html.count('</style>') == 1
    assert '&lt;script' in html and 'A &amp; B &quot;test&quot;' in html
    assert 'https://evil.test/image' not in html


@pytest.mark.parametrize('content', [{}, {'contact': {}}, {'experience_years': 0}, {'promotion': {'text': 'Manual', 'valid_until': '2020-01-01'}}])
def test_trust_empty_zero_and_expiry(content):
    b = block('trust', 0, 'trust_facts')
    b['content'] = content
    html = render_graph(graph([b]), 'bold_commerce')
    assert ('data-block-type="trust_facts"' in html) == bool(content.get('experience_years') is not None or content.get('promotion'))
    if 'experience_years' in content: assert '<dd>0</dd>' in html
    if 'promotion' in content: assert '2020-01-01' in html


def test_order_heading_anchors_embeds_and_no_execution():
    blocks = fixture_blocks()
    blocks.append(block('second-hero', 6, 'hero', {'headline': 'Second'}))
    value = graph(blocks)
    before = deepcopy(value.model_dump())
    html = render_graph(value, 'bold_commerce')
    assert value.model_dump() == before
    positions = [html.index(f'id="{b.block_id}"') for b in value.blocks]
    assert positions == sorted(positions)
    assert html.count('<h1>') == 1 and '<h2>Second</h2>' in html
    assert 'href="#qa-products"' in html
    assert html.count('type="button" disabled') == 2
    for marker in ('<script', '<form', 'data-cart-add', 'localStorage', 'fetch(', '/api/v1/checkout'):
        assert marker not in html
    assert 'Ver productos' not in render_graph(graph([block()]), 'bold_commerce')


def test_long_text_twelve_products_empty_and_partial():
    blocks = [block(content={'headline': 'W' * 400}), block('grid', 1, 'product_grid', {'items': [{'name': str(i), 'description': 'D' * 400} for i in range(12)]})]
    html = render_graph(graph(blocks), 'bold_commerce')
    assert html.count('<article') == 12 and 'W' * 400 in html
    assert 'D' * 400 in html
    assert '<main></main>' in render_graph(graph([]), 'bold_commerce')
    assert '<article' not in render_graph(graph([block(type='product_grid', content={'items': None})]), 'bold_commerce')
