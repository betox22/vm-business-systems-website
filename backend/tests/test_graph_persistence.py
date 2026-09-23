import copy
import ast
import json
import os
import subprocess
from dataclasses import asdict
from pathlib import Path
from threading import Thread

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, select, text
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError

from app import site_graph_persistence as persistence
from app.db import Base, get_session
from app.db_models import AdminAuditEvent, GeneratedSite, Product
from app.site_graph_document_validation import DocumentRejected, read_presentation_authority
from app.site_graph_document_validation import ROOT
from app.site_graph_models import GraphBase, GraphPresentationReceipt, SiteGraphRow
from app.site_graph_normalization import KEY_ENV, issue_graph_provenance
from graph_presentation_fixture import accepted_candidate

ACTOR = {"id": "qa-admin", "role": "super_admin"}
SITE = "projection-site"


@pytest.fixture
def fixture(tmp_path, monkeypatch):
    monkeypatch.setenv("KREATON_AI_GRAPH_ENABLED", "1")
    monkeypatch.setenv(KEY_ENV, "synthetic-test-key-not-a-production-secret-2026")
    engine = create_engine(f"sqlite:///{tmp_path / 'atomic.db'}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    GraphBase.metadata.create_all(engine)
    with Session(engine) as session:
        schema, authority = accepted_candidate(session)
    schema["pages"][0]["sections"][0]["editable"]["headline"] = "Tools for the everyday workshop"
    schema["global_components"]["footer_text"] = "Explore our collection"
    next(section for section in schema["pages"][0]["sections"]
         if section.get("section_id") == "shared--footer")["copy_bindings"]["footer_text"] = "Explore our collection"
    receipt = issue_graph_provenance(schema, authority=authority)
    yield engine, schema, receipt
    engine.dispose()


def rows(engine):
    with Session(engine) as session:
        def values(model):
            return [{c.name: getattr(row, c.name) for c in model.__table__.columns}
                    for row in session.scalars(select(model))]
        return {model.__tablename__: values(model) for model in
                (GeneratedSite, Product, SiteGraphRow, GraphPresentationReceipt, AdminAuditEvent)}


def save(fixture):
    engine, schema, provenance = fixture
    return persistence.persist_v1_document(engine, site_id=SITE, schema=schema,
                                           provenance=provenance, actor=ACTOR)


@pytest.fixture
def fast_validator(monkeypatch):
    # Transaction fault tests isolate persistence; the integration test below uses Chromium.
    def validate(schema, provenance, *, authority):
        persistence.verify_graph_provenance(schema, provenance, authority=authority)
        return {"document": copy.deepcopy(schema), "validation": {"accepted": True, "rendererDigest": "a" * 64}}
    monkeypatch.setattr(persistence, "normalize_and_validate_graph_document", validate)
    return validate


def assert_only_rejection(before, after):
    for name in ("generated_sites", "products", "site_graphs", "graph_presentation_receipts"):
        assert after[name] == before[name], name
    added = after["admin_audit_events"][len(before["admin_audit_events"]):]
    assert len(added) == 1 and added[0]["action"] == "admin.graph.presentation.rejected"
    metadata = json.loads(added[0]["metadata_json"])
    assert set(metadata) == {"contract", "reason"}
    assert not any(s in added[0]["metadata_json"] for s in ("qa@example.test", "Main Street", "Free shipping", "private DB detail"))


def test_real_browser_validation_atomic_save_reopen_and_product_revalidation(fixture):
    engine, schema, _ = fixture
    before = rows(engine)
    commits = []
    event.listen(engine, "commit", lambda connection: commits.append(True))
    result = save(fixture)
    assert len(commits) == 1
    after = rows(engine)
    assert after["products"] == before["products"]
    assert after["site_graphs"] == before["site_graphs"] == []
    assert after["generated_sites"][0]["status"] == before["generated_sites"][0]["status"]
    assert json.loads(after["generated_sites"][0]["generated_config"])["catalog_items"] == json.loads(before["generated_sites"][0]["generated_config"])["catalog_items"]
    assert len(after["graph_presentation_receipts"]) == 1
    assert after["admin_audit_events"][0]["action"] == "admin.graph.presentation.persisted"
    assert persistence.read_validated_v1_document(engine, site_id=SITE, actor=ACTOR) == schema
    assert result["validation"]["accepted"] and len(result["validation"]["surfaces"]) == 6
    with Session(engine) as session:
        session.get(Product, "projection-product").price_cents = 3000
        session.commit()
    with pytest.raises(DocumentRejected, match="Whole presentation"):
        persistence.read_validated_v1_document(engine, site_id=SITE, actor=ACTOR)
    refreshed = persistence.revalidate_v1_document(engine, site_id=SITE, actor=ACTOR)
    reopened = persistence.read_validated_v1_document(engine, site_id=SITE, actor=ACTOR)
    assert reopened["catalog_items"][0]["price"] == 30
    assert refreshed["validation"]["accepted"]
    directory = os.getenv("GRAPH_STEP3_EVIDENCE")
    if directory:
        folder = Path(directory)
        folder.mkdir(parents=True, exist_ok=True)
        for name, value in [("validation", result["validation"]), ("document", result["document"]),
                            ("revalidation", refreshed["validation"]), ("revalidated-document", reopened),
                            ("database-before", before), ("database-after", after), ("database-revalidated", rows(engine))]:
            (folder / f"{name}.json").write_text(json.dumps(value, ensure_ascii=False), encoding="utf-8")


@pytest.mark.parametrize("mutation", ["product", "site", "insert", "sku"])
def test_concurrent_committed_writer_invalidates_snapshot_before_any_write(fixture, fast_validator, monkeypatch, mutation):
    engine, _, _ = fixture
    concurrent = []
    def writer():
        with Session(engine) as session:
            if mutation == "product": session.get(Product, "projection-product").inventory = 9
            elif mutation == "sku": session.get(Product, "projection-product").sku = "CHANGED"
            elif mutation == "site": session.get(GeneratedSite, SITE).status = "draft"
            else:
                session.add(Product(id="new-row", store_id="projection-store", site_id=SITE, name="Other",
                                    category="Tools", price_cents=100, inventory=1, status="Archived"))
            session.commit()
        concurrent.append(rows(engine))
    def validating(*args, **kwargs):
        result = fast_validator(*args, **kwargs)
        worker = Thread(target=writer)
        worker.start()
        worker.join(timeout=10)
        assert not worker.is_alive() and concurrent
        return result
    monkeypatch.setattr(persistence, "normalize_and_validate_graph_document", validating)
    with pytest.raises(DocumentRejected): save(fixture)
    assert_only_rejection(concurrent[0], rows(engine))


@pytest.mark.parametrize("failure_point", ["receipt", "success_audit", "commit"])
def test_database_failure_after_site_update_rolls_everything_back(fixture, fast_validator, failure_point):
    engine, _, _ = fixture
    before = rows(engine)
    fired = []
    def fail(connection, cursor, statement, *args):
        needle = "INSERT INTO " + ("graph_presentation_receipts" if failure_point == "receipt" else "admin_audit_events")
        if failure_point != "commit" and statement.startswith(needle) and not fired:
            fired.append(True)
            raise RuntimeError("private DB detail qa@example.test")
    def commit_fail(connection):
        if failure_point == "commit" and not fired:
            fired.append(True)
            raise RuntimeError("private DB detail")
    event.listen(engine, "before_cursor_execute", fail)
    event.listen(engine, "commit", commit_fail)
    try:
        with pytest.raises(DocumentRejected): save(fixture)
    finally:
        event.remove(engine, "before_cursor_execute", fail)
        event.remove(engine, "commit", commit_fail)
    assert fired
    assert_only_rejection(before, rows(engine))


def test_real_claim_rejection_only_writes_sanitized_separate_audit(fixture):
    engine, schema, _ = fixture
    schema["global_components"]["footer_text"] = "Free shipping for everyone"
    next(section for section in schema["pages"][0]["sections"]
         if section.get("section_id") == "shared--footer")["copy_bindings"]["footer_text"] = "Free shipping for everyone"
    with Session(engine) as session:
        authority = read_presentation_authority(session, SITE, actor=ACTOR, contact=schema["contact"])
    receipt = issue_graph_provenance(schema, authority=authority)
    before = rows(engine)
    with pytest.raises(DocumentRejected) as error:
        save((engine, schema, receipt))
    assert_only_rejection(before, rows(engine))
    if directory := os.getenv("GRAPH_STEP3_EVIDENCE"):
        (Path(directory) / "claim-rejection.json").write_text(json.dumps({"accepted": False,
            "issues": [asdict(issue) for issue in error.value.issues], "database": rows(engine)}), encoding="utf-8")


@pytest.mark.parametrize("table", ["graph_presentation_receipts", "admin_audit_events"])
def test_real_database_trigger_failure_rolls_back_site_and_success_audit(fixture, fast_validator, table):
    engine, _, _ = fixture
    condition = "WHEN NEW.action = 'admin.graph.presentation.persisted'" if table == "admin_audit_events" else ""
    with engine.begin() as connection:
        connection.execute(text(f"CREATE TRIGGER qa_fail BEFORE INSERT ON {table} {condition} "
                                "BEGIN SELECT RAISE(ABORT, 'QA database failure'); END"))
    before = rows(engine)
    with pytest.raises(DocumentRejected): save(fixture)
    after = rows(engine)
    assert_only_rejection(before, after)
    if directory := os.getenv("GRAPH_STEP3_EVIDENCE"):
        (Path(directory) / f"database-failure-{table}.json").write_text(json.dumps({
            "failure": "SQLite trigger RAISE(ABORT) during INSERT after GeneratedSite UPDATE",
            "before": before, "after": after, "rolledBack": True,
        }, indent=2), encoding="utf-8")


def test_renderer_revision_changes_block_read_and_write(fixture, fast_validator, monkeypatch):
    engine, _, _ = fixture
    save(fixture)
    monkeypatch.setattr(persistence, "presentation_revision", lambda: "b" * 64)
    with pytest.raises(DocumentRejected) as error:
        persistence.read_validated_v1_document(engine, site_id=SITE, actor=ACTOR)
    assert error.value.issues[0].rule == "presentation_renderer_changed"


def test_renderer_changes_mid_validation_reject_without_content_write(fixture, fast_validator, monkeypatch):
    engine, _, _ = fixture
    before = rows(engine)
    versions = iter(["a" * 64, "b" * 64])
    monkeypatch.setattr(persistence, "presentation_revision", lambda: next(versions))
    with pytest.raises(DocumentRejected): save(fixture)
    assert_only_rejection(before, rows(engine))


def test_receipt_tamper_cannot_authorize_read(fixture, fast_validator):
    engine, _, _ = fixture
    save(fixture)
    with Session(engine) as session:
        session.get(GraphPresentationReceipt, SITE).renderer_revision = "c" * 64
        session.commit()
    with pytest.raises(DocumentRejected) as error:
        persistence.read_validated_v1_document(engine, site_id=SITE, actor=ACTOR)
    assert error.value.issues[0].rule == "invalid_presentation_receipt"


def test_existing_proposed_graph_is_not_modified(fixture, fast_validator):
    engine, _, _ = fixture
    with Session(engine) as session:
        session.add(SiteGraphRow(site_id=SITE, version=3, blocks=[]))
        session.commit()
    before = rows(engine)["site_graphs"]
    save(fixture)
    assert rows(engine)["site_graphs"] == before


def test_legacy_public_payload_is_byte_identical_to_original_function(fixture):
    from app import main
    import hashlib
    engine, _, _ = fixture
    source = subprocess.check_output(["git", "show", "27660558106041c57d891cc68c0a5154600b0d80:backend/app/main.py"],
                                     cwd=ROOT, encoding="utf-8")
    function = next(n for n in ast.parse(source).body if isinstance(n, ast.FunctionDef) and n.name == "_public_site_payload")
    namespace = dict(vars(main))
    exec(compile(ast.Module(body=[function], type_ignores=[]), "baseline-public-payload", "exec"), namespace)
    with Session(engine) as session:
        site = session.get(GeneratedSite, SITE)
        if payload_path := os.getenv("GRAPH_PUBLIC_PAYLOAD"):
            payload = json.loads(Path(payload_path).read_text(encoding="utf-8-sig"))
            session.query(Product).delete()
            site.generated_config = json.dumps(payload["schema"])
            site.business_name = payload["business_name"]
            site.template_name = payload["template_name"]
            site.public_url = payload["public_url"]
            session.commit()
        before = json.dumps(namespace["_public_site_payload"](site, session), ensure_ascii=False).encode()
        after = json.dumps(main._public_site_payload(site, session), ensure_ascii=False).encode()
    assert before == after
    if directory := os.getenv("GRAPH_STEP3_EVIDENCE"):
        (Path(directory) / "legacy-backend-regression.json").write_text(json.dumps({
            "byteIdentical": True, "bytes": len(after), "beforeSHA256": hashlib.sha256(before).hexdigest(),
            "afterSHA256": hashlib.sha256(after).hexdigest(), "realPayloadReplay": bool(payload_path),
        }, indent=2), encoding="utf-8")


def test_no_legacy_commit_or_catalog_sync_is_called(fixture, fast_validator, monkeypatch):
    from app import main, catalog_sync, site_graph_service
    for module, name in [(main, "persist_generated_site"), (main, "sync_site_catalog_to_commerce"),
                         (catalog_sync, "sync_site_catalog_to_commerce"), (site_graph_service, "persist_graph_batch")]:
        monkeypatch.setattr(module, name, lambda *a, **kw: pytest.fail("legacy writer invoked"))
    save(fixture)


def test_concurrent_writer_cannot_enter_final_critical_section(fixture, fast_validator):
    engine, _, _ = fixture
    blocked = []
    attempted = []
    def writer():
        other = create_engine(engine.url, connect_args={"timeout": 0.05})
        try:
            with Session(other) as session:
                session.get(Product, "projection-product").inventory = 99
                session.commit()
        except OperationalError:
            blocked.append(True)
        finally:
            other.dispose()
    def intercept(connection, cursor, statement, *args):
        if statement.startswith("UPDATE generated_sites") and not attempted:
            attempted.append(True)
            thread = Thread(target=writer)
            thread.start()
            thread.join(timeout=5)
            assert not thread.is_alive()
    event.listen(engine, "before_cursor_execute", intercept)
    try:
        save(fixture)
    finally:
        event.remove(engine, "before_cursor_execute", intercept)
    assert blocked == [True]
    assert rows(engine)["products"][0]["inventory"] == 7


def test_postgresql_lock_protocol_is_bounded_and_matches_legacy_write_order():
    from types import SimpleNamespace
    statements = []
    class Probe:
        bind = SimpleNamespace(dialect=SimpleNamespace(name="postgresql"))
        def execute(self, statement): statements.append(str(statement))
        def scalar(self, statement):
            statements.append(str(statement))
            return object()
    persistence._critical_section(Probe(), SITE)
    assert statements[0] == "SET LOCAL lock_timeout = '5s'"
    assert "FOR UPDATE" in statements[1]
    assert statements[2] == "LOCK TABLE products IN SHARE MODE"


def test_legacy_routes_cannot_strip_registration_or_serve_unvalidated_content(fixture, fast_validator, monkeypatch):
    from app import main
    engine, schema, _ = fixture
    save(fixture)
    def sessions():
        with Session(engine) as session: yield session
    main.app.dependency_overrides[get_session] = sessions
    monkeypatch.setattr(main, "init_db", lambda: None)
    monkeypatch.setattr(main, "authenticated_client_user", lambda *a: {"id": "qa-owner", "email": "qa@example.test"})
    monkeypatch.setattr(main, "_enforce_rate_limit", lambda *a, **kw: None)
    try:
        with TestClient(main.app) as client:
            assert client.get(f"/public/sites/{SITE}").status_code == 409
            assert client.get("/public/resolve-site?host=projection.invalid").status_code == 409
            assert client.get(f"/api/client/projects/{SITE}").status_code == 409
            response = client.put(f"/api/client/sites/{SITE}", json={"schema": schema})
            assert response.status_code == 409, response.text
            with Session(engine) as session:
                site = session.get(GeneratedSite, SITE)
                stored = json.loads(site.generated_config)
                stored.pop(persistence.MARKER)
                site.generated_config = json.dumps(stored)
                session.commit()
            assert client.get(f"/public/sites/{SITE}").status_code == 409
    finally:
        main.app.dependency_overrides.pop(get_session, None)


@pytest.mark.parametrize("invalid", ["flag", "role", "signature"])
def test_invalid_entry_never_writes_business_data(fixture, fast_validator, monkeypatch, invalid):
    engine, schema, receipt = fixture
    before = rows(engine)
    actor = ACTOR
    if invalid == "flag": monkeypatch.delenv("KREATON_AI_GRAPH_ENABLED")
    elif invalid == "role": actor = {"id": "owner", "role": "support"}
    else: receipt["signature"] = "0" * 64
    with pytest.raises((HTTPException, DocumentRejected)):
        persistence.persist_v1_document(engine, site_id=SITE, schema=schema, provenance=receipt, actor=actor)
    if invalid == "signature": assert_only_rejection(before, rows(engine))
    else: assert rows(engine) == before
