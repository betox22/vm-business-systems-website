import json
import os
from copy import deepcopy
from pathlib import Path
from uuid import uuid4
from unittest.mock import patch

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, event, select
from sqlalchemy.orm import Session

from app import main, client_auth
from app.catalog_sync import sync_site_catalog_to_commerce, apply_commerce_overlay
from app.db import Base, get_session
from app.db_models import GeneratedSite, Product
from app.editor_identity_migration import plan_identity_migration, apply_identity_migration, rollback_identity_migration, product_snapshot
from app.visual_editor_shadow import build_shadow, validate_shadow, maybe_add_shadow, ShadowDocument
from test_catalog_sync import db, site, products, item
from test_client_site_update import OWNER, _client_and_session
from app.models import WebsiteGenerationRequest

PILOTS = json.loads((Path(__file__).parents[2] / "tests/fixtures/visual-editor-shadow.json").read_text())


@pytest.fixture
def staging(monkeypatch):
    monkeypatch.setenv("KREATON_VISUAL_EDITOR_SHADOW", "1")
    monkeypatch.setenv("KREATON_ENVIRONMENT", "test")


@pytest.mark.parametrize("template", list(PILOTS))
def test_pilots_generate_shadow_only_and_survive_reopen(db, staging, template, tmp_path):
    schema = deepcopy(PILOTS[template])
    row = main.persist_generated_site(db, user=OWNER, request=WebsiteGenerationRequest(businessName=schema["business"]["name"]), schema=schema)
    saved = json.loads(row.generated_config)
    doc = validate_shadow(saved)
    assert doc.mode == "shadow" and doc.nodes
    ids = [p.id for p in products(db)]
    db.expire_all()
    loaded = json.loads(db.get(GeneratedSite, row.id).generated_config)
    assert loaded == saved
    assert build_shadow(loaded, template) == saved
    sync_site_catalog_to_commerce(db, row)
    db.commit()
    assert [p.id for p in products(db)] == ids
    assert json.loads(row.generated_config)["visual_editor"] == saved["visual_editor"]
    public = main._public_site_payload(row, db)
    assert "visual_editor" not in public["schema"]
    assert public["catalog_items"] == public["schema"]["catalog_items"]
    directory = Path(os.environ.get("KREATON_SHADOW_EVIDENCE_DIR", tmp_path))
    directory.mkdir(parents=True, exist_ok=True)
    (directory / f"{template}.json").write_text(json.dumps({
        "test_data_only": True, "template": template, "mode": doc.mode,
        "node_count": len(doc.nodes), "schema": saved, "public_payload": public,
        "products": product_snapshot(products(db)), "repeated_save_same_product_ids": True,
    }, indent=2), encoding="utf-8")
    (directory / "contract-schema.json").write_text(json.dumps(ShadowDocument.model_json_schema(), indent=2), encoding="utf-8")


@pytest.mark.parametrize("corruption", ["active", "cycle", "missing", "unreachable", "duplicate_parent", "literal_and_binding", "unsafe_url", "responsive", "foreign_binding", "stale"])
def test_invalid_nodes_and_contract_fail_closed(corruption):
    schema = build_shadow(deepcopy(PILOTS["corporate-company-pro"]), "corporate-company-pro")
    doc = schema["visual_editor"]
    root = doc["roots"][0]
    node = doc["nodes"][root]
    if corruption == "active": doc["mode"] = "active"
    elif corruption == "cycle": node["children"].append(root)
    elif corruption == "missing": node["children"].append(str(uuid4()))
    elif corruption == "unreachable": doc["roots"].pop()
    elif corruption == "duplicate_parent": doc["roots"].append(root)
    elif corruption == "literal_and_binding": node["bindings"]["label"] = {"source": "document", "entity_id": root, "field": "label"}
    elif corruption == "unsafe_url": node.update(type="image", properties={"value": "javascript:alert(1)"})
    elif corruption == "responsive": node["responsive"] = {"mobile": {"columns": 0}}
    elif corruption == "foreign_binding": node["bindings"]["label"] = {"source": "catalog", "entity_id": str(uuid4()), "field": "price"}; node["properties"] = {}
    else: schema["pages"].reverse(); schema["pages"][0]["title"] = "Changed without identity operation"
    with pytest.raises(ValueError): validate_shadow(schema)


def test_shadow_requires_both_opt_ins_and_only_pilots(monkeypatch):
    schema = deepcopy(PILOTS["corporate-company-pro"])
    monkeypatch.setenv("KREATON_VISUAL_EDITOR_SHADOW", "1")
    monkeypatch.setenv("KREATON_ENVIRONMENT", "production")
    assert maybe_add_shadow(schema, "corporate-company-pro") == schema
    with pytest.raises(HTTPException):
        maybe_add_shadow(build_shadow(schema, "corporate-company-pro"), "corporate-company-pro")
    monkeypatch.setenv("KREATON_ENVIRONMENT", "staging")
    monkeypatch.setenv("KREATON_VISUAL_EDITOR_SHADOW", "0")
    assert maybe_add_shadow(schema, "corporate-company-pro") == schema
    monkeypatch.setenv("KREATON_VISUAL_EDITOR_SHADOW", "1")
    assert maybe_add_shadow(schema, "fashion-drop-pro") == schema
    assert "visual_editor" not in maybe_add_shadow(schema, "corporate-company-pro")
    assert "visual_editor" in maybe_add_shadow(schema, "corporate-company-pro", new_site=True)


def legacy_fixture(db):
    row = site(db, catalog=[item()])
    db.add(Product(store_id=row.store_id, site_id=row.id, name="Drill", category="tools", description="Cordless drill",
                   image_url="https://example.com/drill.jpg", sku="DRILL", price_cents=2499,
                   source="ai_generated", status="Published", catalog_index=0))
    db.commit()
    return row


def test_legacy_plan_apply_repeat_and_rollback_are_identity_only(db, staging, tmp_path):
    row = legacy_fixture(db)
    before = row.generated_config
    before_products = product_snapshot(products(db))
    sql = []
    def record(conn, cursor, statement, parameters, context, many): sql.append(statement)
    event.listen(db.bind, "before_cursor_execute", record)
    manifest = plan_identity_migration(db, row.id)
    event.remove(db.bind, "before_cursor_execute", record)
    assert manifest["status"] == "review_required"
    assert not any(s.lstrip().upper().startswith(("INSERT", "UPDATE", "DELETE")) for s in sql)
    assert row.generated_config == before and product_snapshot(products(db)) == before_products
    with pytest.raises(HTTPException): apply_identity_migration(db, manifest)
    assert apply_identity_migration(db, manifest, approved=True) == "applied"
    db.commit()
    assert products(db)[0].id == before_products[0]["id"]
    assert apply_identity_migration(db, manifest, approved=True) == "already_applied"
    db.commit()
    db.expire_all()
    assert plan_identity_migration(db, row.id)["status"] == "already_shadow"
    rollback_identity_migration(db, manifest)
    db.commit()
    assert row.generated_config == before and product_snapshot(products(db)) == before_products
    directory = Path(os.environ.get("KREATON_SHADOW_EVIDENCE_DIR", tmp_path))
    directory.mkdir(parents=True, exist_ok=True)
    (directory / "test-only-migration-manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")


@pytest.mark.parametrize("kind", ["source_changed", "commerce_changed", "ambiguous", "owner_edited"])
def test_migration_refuses_unproven_or_changed_data(db, staging, kind):
    row = legacy_fixture(db)
    manifest = plan_identity_migration(db, row.id)
    if kind == "source_changed": row.generated_config = json.dumps({"catalog_items": [item("Different")]})
    elif kind == "commerce_changed": products(db)[0].price_cents += 1
    elif kind == "ambiguous": db.add(Product(store_id="store", site_id=row.id, name="duplicate", category="tools", price_cents=2499, catalog_index=0, status="Published"))
    else: products(db)[0].source = "owner_edited"
    db.commit()
    with pytest.raises(HTTPException): apply_identity_migration(db, manifest, approved=True)
    assert all(p.catalog_uid is None for p in products(db))
    if kind in {"ambiguous", "owner_edited"}: assert plan_identity_migration(db, row.id)["status"] == "blocked"


def test_rollback_refuses_to_overwrite_later_commerce_changes(db, staging):
    row = legacy_fixture(db)
    manifest = plan_identity_migration(db, row.id)
    apply_identity_migration(db, manifest, approved=True)
    db.commit()
    products(db)[0].price_cents = 4000
    db.commit()
    with pytest.raises(HTTPException): rollback_identity_migration(db, manifest)
    assert products(db)[0].price_cents == 4000 and products(db)[0].catalog_uid


def test_enrolled_save_and_foreign_or_duplicate_ids_are_rejected(db):
    row = legacy_fixture(db)
    row.generated_config = json.dumps({**json.loads(row.generated_config), "visual_editor": {"mode": "shadow"}})
    with pytest.raises(HTTPException) as error: sync_site_catalog_to_commerce(db, row)
    assert error.value.status_code == 409
    other = site(db, "new", catalog=[item()])
    other.generated_config = json.dumps({"catalog_items": [item()], "visual_editor": {"mode": "shadow"}})
    sync_site_catalog_to_commerce(db, other)
    db.commit()
    schema = json.loads(other.generated_config)
    for items, status in [([item(catalog_uid=str(uuid4()))], 409), (schema["catalog_items"] * 2, 422), ([item()], 409)]:
        other.generated_config = json.dumps({"catalog_items": items, "visual_editor": {"mode": "shadow"}})
        with pytest.raises(HTTPException) as error: sync_site_catalog_to_commerce(db, other)
        assert error.value.status_code == status
        db.rollback()


def test_reorder_preserves_rows_and_overlay_uses_uid_not_position(db):
    row = site(db, catalog=[item("First"), item("Second")])
    row.generated_config = json.dumps({**json.loads(row.generated_config), "visual_editor": {"mode": "shadow"}})
    sync_site_catalog_to_commerce(db, row)
    db.commit()
    before = {p.catalog_uid: p.id for p in products(db)}
    schema = json.loads(row.generated_config)
    schema["catalog_items"].reverse()
    row.generated_config = json.dumps(schema)
    sync_site_catalog_to_commerce(db, row)
    db.commit()
    assert {p.catalog_uid: p.id for p in products(db)} == before
    for p in products(db): p.catalog_index = 999; p.name += " edited"
    db.commit()
    assert [p["name"] for p in apply_commerce_overlay(schema["catalog_items"], row, db)] == ["Second edited", "First edited"]


@pytest.mark.parametrize("editor", [None, {}, {"revision": 1}])
def test_legacy_without_mode_ignores_uid_and_keeps_released_behavior(db, staging, editor):
    row = legacy_fixture(db)
    old_id = products(db)[0].id
    schema = json.loads(row.generated_config)
    if editor is not None:
        schema["visual_editor"] = editor
    assert maybe_add_shadow(schema, row.template_id) == schema
    schema["catalog_items"][0]["catalog_uid"] = "not-an-enrollment"
    row.generated_config = json.dumps(schema)
    before = row.generated_config
    sync_site_catalog_to_commerce(db, row)
    db.commit()
    assert row.generated_config == before
    assert db.get(Product, old_id).status == "Archived"
    assert len(products(db)) == 2
    assert all(p.catalog_uid is None for p in products(db))
    assert products(db)[1].catalog_index == 0
    overlaid = apply_commerce_overlay(schema["catalog_items"], row, db)
    assert overlaid[0]["name"] == products(db)[1].name


def test_owner_api_returns_identity_and_refuses_shadow_loss(staging):
    engine, factory, client = _client_and_session()
    try:
        with patch.object(client_auth, "supabase_auth_configured", return_value=True), patch.object(client_auth, "fetch_supabase_user", return_value=OWNER):
            headers = {"Authorization": "Bearer test-owner"}
            schema = deepcopy(PILOTS["mega-retail-store"])
            schema = maybe_add_shadow(schema, "mega-retail-store", new_site=True)
            response = client.put("/api/client/sites/site-owner", headers=headers, json={"schema": schema})
            assert response.status_code == 200, response.text
            saved = response.json()["schema"]
            validate_shadow(saved)
            assert all(p.get("catalog_uid") for p in saved["catalog_items"])
            assert client.put("/api/client/sites/site-owner", headers=headers, json={"schema": saved}).status_code == 200
            without = deepcopy(saved); without.pop("visual_editor")
            assert client.put("/api/client/sites/site-owner", headers=headers, json={"schema": without}).status_code == 409
            replaced = deepcopy(saved); replaced["visual_editor"]["document_id"] = str(uuid4())
            assert client.put("/api/client/sites/site-owner", headers=headers, json={"schema": replaced}).status_code == 409
            public = client.get("/public/sites/site-owner").json()
            assert "visual_editor" not in public["schema"]
    finally:
        client.close(); main.app.dependency_overrides.pop(get_session, None); engine.dispose()


def test_shadow_survives_engine_restart(tmp_path, staging):
    url = f"sqlite:///{tmp_path / 'shadow-pilots.db'}"
    engine = create_engine(url)
    Base.metadata.create_all(engine)
    saved = {}
    with Session(engine) as session:
        for template, original in PILOTS.items():
            schema = deepcopy(original)
            row = main.persist_generated_site(session, user=OWNER, request=WebsiteGenerationRequest(businessName=schema["business"]["name"]), schema=schema)
            saved[row.id] = row.generated_config
        snapshots = product_snapshot(list(session.scalars(select(Product))))
    engine.dispose()
    restarted = create_engine(url)
    try:
        with Session(restarted) as session:
            for site_id, config in saved.items():
                row = session.get(GeneratedSite, site_id)
                assert row.generated_config == config
                validate_shadow(json.loads(config))
            assert product_snapshot(list(session.scalars(select(Product)))) == snapshots
    finally:
        restarted.dispose()


def test_migration_is_disabled_without_test_environment(db, monkeypatch):
    row = legacy_fixture(db)
    monkeypatch.setenv("KREATON_VISUAL_EDITOR_SHADOW", "1")
    monkeypatch.setenv("KREATON_ENVIRONMENT", "production")
    with pytest.raises(HTTPException): plan_identity_migration(db, row.id)
    assert products(db)[0].catalog_uid is None


def test_product_uid_unique_index_and_nullable_legacy_rows(db):
    from sqlalchemy.exc import IntegrityError
    row = site(db, catalog=[item()])
    row.generated_config = json.dumps({**json.loads(row.generated_config), "visual_editor": {"mode": "shadow"}})
    sync_site_catalog_to_commerce(db, row)
    db.commit()
    uid = products(db)[0].catalog_uid
    db.add(Product(store_id=row.store_id, site_id=row.id, name="Duplicate", category="tools", price_cents=1, catalog_uid=uid))
    with pytest.raises(IntegrityError): db.commit()
    db.rollback()
    for name in ("Legacy A", "Legacy B"):
        db.add(Product(store_id=row.store_id, site_id=row.id, name=name, category="tools", price_cents=1))
    db.commit()
    assert len(products(db)) == 3
