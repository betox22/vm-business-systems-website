import json
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import main, site_graph_api, site_graph_service
from app.db import Base, get_session
from app.db_models import AdminAuditEvent
from app.site_graph_api import create_graph_router
from app.site_graph_contract import Block, DesignPattern, OperationsRequest, SiteGraph, apply_operations
from app.site_graph_models import GraphBase, SiteGraphRow, DesignReferencePattern
from app.site_graph_patterns import SEEDS, bootstrap_patterns, get_seed_patterns
from app.site_graph_preview import render_graph


def block(id="hero", index=0, type="hero", content=None):
    return {"block_id": id, "type": type, "content": content or {"headline": "Graph sample"}, "layout_variant": "default", "order_index": index}


@pytest.fixture
def api():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    GraphBase.metadata.create_all(engine)
    factory = sessionmaker(engine)
    app = FastAPI()
    app.middleware("http")(main.add_security_headers)
    # Exercise the real existing auth resolver, mocking only Supabase network validation.
    app.include_router(create_graph_router(main._authenticated_admin_identity))
    def sessions():
        with factory() as session:
            yield session
    app.dependency_overrides[get_session] = sessions
    def user(token):
        if token not in ("admin", "support", "owner"):
            return None
        return {"id": token, "email": f"{token}@test.invalid", "app_metadata": {"kreaton_role": "super_admin" if token == "admin" else token}}
    with patch.object(main, "supabase_auth_configured", return_value=True), patch.object(main, "fetch_supabase_user", side_effect=user):
        with TestClient(app, raise_server_exceptions=False) as client:
            yield client, factory
    engine.dispose()


def post(client, operations=None, version=0, token="admin"):
    return client.post("/api/v1/sites/sample/graph/operations", json={"expected_version": version,
        "operations": operations or [{"op": "add_block", "block": block()}]},
        headers={"Authorization": f"Bearer {token}"} if token else {})


@pytest.mark.parametrize("kind", ["hero", "product_grid", "footer", "cart_embed", "checkout_embed"])
def test_valid_blocks(kind):
    content = {"module": "shared-commerce-cart" if kind == "cart_embed" else "storefront-checkout"} if kind.endswith("embed") else {"custom": {"nested": [1, True, None]}}
    assert Block(**block(type=kind, content=content)).type == kind


@pytest.mark.parametrize("change", [{"type": "script"}, {"order_index": -1}, {"block_id": "<script>"}, {"unexpected": 1}, {"type": "cart_embed", "content": {"module": "evil"}}])
def test_invalid_blocks(change):
    with pytest.raises(ValidationError):
        Block(**{**block(), **change})


def test_duplicate_ids_and_noncontiguous_order():
    for blocks in ([block(), block(index=1)], [block(index=1)]):
        with pytest.raises(ValidationError):
            SiteGraph(site_id="sample", version=1, blocks=blocks)


@pytest.mark.parametrize("field,value", [("imagery_style", "https://example.com/a.png"), ("palette_roles", "<div>"), ("density", "site_abc")])
def test_pattern_rejects_source_material(field, value):
    data = SEEDS[0].model_dump()
    data["style_descriptor"][field] = value
    with pytest.raises(ValidationError):
        DesignPattern(**data)


def test_pattern_rejects_extra_and_free_tags():
    for data in ({**SEEDS[0].model_dump(), "html": "x"}, {**SEEDS[0].model_dump(), "industry_tags": ["site_abc"]}):
        with pytest.raises(ValidationError):
            DesignPattern(**data)


def test_seed_bootstrap_idempotent_and_lookup(api):
    _, factory = api
    with factory() as session:
        bootstrap_patterns(session)
        bootstrap_patterns(session)
        assert len(session.scalars(select(DesignReferencePattern)).all()) == 3
        assert [p.pattern_id for p in get_seed_patterns(" PRODUCT ", session)] == ["editorial_minimal"]
        assert get_seed_patterns("unknown", session) == []


@pytest.mark.parametrize("token,status", [(None, 401), ("expired", 401), ("owner", 403), ("support", 403), ("admin", 200)])
def test_auth(api, token, status):
    assert post(api[0], token=token).status_code == status


def test_all_operations_persistence_and_stale_version(api):
    client, factory = api
    assert post(client).json()["version"] == 1
    operations = [{"op": "add_block", "block": block("footer", 1, "footer", {"text": "End"})},
        {"op": "move_block", "block_id": "footer", "order_index": 0},
        {"op": "update_block_content", "block_id": "hero", "content": {"headline": "Changed"}},
        {"op": "update_block_variant", "block_id": "hero", "layout_variant": "editorial"},
        {"op": "remove_block", "block_id": "footer"}]
    result = post(client, operations, 1)
    assert result.status_code == 200, result.text
    assert result.json()["blocks"][0]["content"]["headline"] == "Changed"
    assert post(client, version=1).status_code == 409
    with factory() as session:
        assert session.get(SiteGraphRow, "sample").version == 2
        events = session.scalars(select(AdminAuditEvent)).all()
        assert len(events) == 2
        assert "Changed" not in events[-1].metadata_json


def test_invalid_batch_atomic(api):
    client, factory = api
    operations = [{"op": "add_block", "block": block()}, {"op": "remove_block", "block_id": "missing"}]
    assert post(client, operations).status_code == 422
    with factory() as session:
        assert session.get(SiteGraphRow, "sample") is None
        assert session.scalars(select(AdminAuditEvent)).all() == []


def test_audit_failure_rolls_back(api):
    client, factory = api
    with patch.object(site_graph_service, "record_admin_audit_event", side_effect=RuntimeError("audit failed")):
        assert post(client).status_code == 500
    with factory() as session:
        assert session.get(SiteGraphRow, "sample") is None


def test_preview_three_types_cookie_auth_and_escaping(api):
    client, _ = api
    blocks = [block(content={"headline": "<script>alert(1)</script>"}),
        block("products", 1, "product_grid", {"heading": "Products", "items": [{"name": "Sample", "description": "Synthetic"}]}),
        block("footer", 2, "footer", {"text": "Internal preview"})]
    assert post(client, [{"op": "add_block", "block": b} for b in blocks]).status_code == 200
    url = "/api/admin/internal/graph-preview?site_id=sample"
    assert client.get(url).status_code == 401
    client.cookies.set("kreaton_admin_session", "support", path="/api/admin")
    with patch.dict("os.environ", {"KREATON_AI_GRAPH_ENABLED": "1"}):
        result = client.get(url)
    assert result.status_code == 200
    assert "<script>" not in result.text and "&lt;script&gt;" in result.text
    for kind in ("hero", "product_grid", "footer"):
        assert f'data-block-type="{kind}"' in result.text
    assert result.headers["cache-control"] == "no-store"
    assert "default-src 'none'" in result.headers["content-security-policy"]
    assert "style-src 'sha256-" in result.headers["content-security-policy"]
    assert "unsafe-inline" not in result.headers["content-security-policy"]


def test_fixed_embeds_do_not_execute():
    graph = SiteGraph(site_id="test", version=1, blocks=[block(type="cart_embed", content={"module": "shared-commerce-cart"})])
    html = render_graph(graph)
    assert "not executed in preview" in html
    assert "<script" not in html


def test_default_application_does_not_publish_graph_routes():
    with TestClient(main.app) as client:
        # Existing static mount returns 405 for otherwise-unregistered POST paths.
        assert client.post("/api/v1/sites/sample/graph/operations", json={}).status_code in (404, 405)
        assert client.get("/api/admin/internal/graph-preview?site_id=sample").status_code == 404


def test_postgres_jsonb_and_array():
    from sqlalchemy.dialects import postgresql
    dialect = postgresql.dialect()
    assert str(SiteGraphRow.__table__.c.blocks.type.compile(dialect=dialect)) == "JSONB"
    assert str(DesignReferencePattern.__table__.c.industry_tags.type.compile(dialect=dialect)) == "VARCHAR[]"


def test_versioned_schema_matches_models():
    path = Path(__file__).parents[2] / "schemas" / "site-graph-v1.json"
    for name, model in [("site-graph", SiteGraph), ("graph-operations", OperationsRequest), ("design-pattern", DesignPattern)]:
        schema = json.loads(path.with_name(f"{name}-v1.json").read_text())
        assert schema.pop("$schema") == "https://json-schema.org/draft/2020-12/schema"
        assert schema == model.model_json_schema()


def test_storage_initialization_additive_and_repeatable():
    from sqlalchemy import inspect, text
    from app.site_graph_storage import init_graph_storage
    engine = create_engine("sqlite://")
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE unrelated (id INTEGER PRIMARY KEY)"))
        conn.execute(text("INSERT INTO unrelated VALUES (7)"))
    init_graph_storage(engine)
    init_graph_storage(engine)
    assert set(inspect(engine).get_table_names()) == {"unrelated", "site_graphs", "design_reference_patterns", "graph_presentation_receipts"}
    with engine.connect() as conn:
        assert conn.execute(text("SELECT id FROM unrelated")).scalar() == 7
        assert conn.execute(text("SELECT count(*) FROM design_reference_patterns")).scalar() == 3


def test_failed_audit_rolls_back_existing_version(api):
    client, factory = api
    assert post(client).status_code == 200
    with patch.object(site_graph_service, "record_admin_audit_event", side_effect=RuntimeError("audit failed")):
        result = post(client, [{"op": "update_block_content", "block_id": "hero", "content": {"headline": "Must rollback"}}], 1)
        assert result.status_code == 500
    with factory() as session:
        row = session.get(SiteGraphRow, "sample")
        assert row.version == 1
        assert row.blocks[0]["content"]["headline"] == "Graph sample"


def test_concurrent_writers_only_one_wins(tmp_path):
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier
    from app.admin_auth import admin_identity_from_user
    engine = create_engine("sqlite:///" + str(tmp_path / "race.sqlite"), connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    GraphBase.metadata.create_all(engine)
    factory = sessionmaker(engine)
    with factory() as session:
        session.add(SiteGraphRow(site_id="sample", version=1, blocks=[block()]))
        session.commit()
    app = FastAPI()
    actor = admin_identity_from_user({"id": "qa", "app_metadata": {"kreaton_role": "super_admin"}})
    app.include_router(create_graph_router(lambda *args: actor))
    def sessions():
        with factory() as session:
            yield session
    app.dependency_overrides[get_session] = sessions
    barrier = Barrier(2)
    original = site_graph_service.apply_operations
    def simultaneous(graph, batch):
        barrier.wait(timeout=10)
        return original(graph, batch)
    def write(value):
        with TestClient(app) as client:
            return post(client, [{"op": "update_block_content", "block_id": "hero", "content": {"headline": value}}], 1).status_code
    with patch.object(site_graph_service, "apply_operations", side_effect=simultaneous), ThreadPoolExecutor(2) as pool:
        assert sorted(pool.map(write, ["First", "Second"])) == [200, 409]
    with factory() as session:
        assert session.get(SiteGraphRow, "sample").version == 2
        assert len(session.scalars(select(AdminAuditEvent)).all()) == 1
