import copy
import json
import os
from pathlib import Path

import pytest

from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session

from app.db import Base
from app.site_graph_document_validation import (
    validate_materialized_document, DocumentRejected, _verify_candidate, _check_projection,
    read_presentation_authority, REQUIRED_STATES,
)
from graph_presentation_fixture import accepted_candidate


@pytest.fixture(scope="module")
def approved():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        schema, authority = accepted_candidate(session)
        statements = []
        event.listen(engine, "before_cursor_execute", lambda conn, cursor, statement, *args: statements.append(statement))
        authority = read_presentation_authority(session, authority.site_id, actor={"id": "qa-admin", "role": "super_admin"}, contact=schema["contact"])
        before = json.dumps(schema, sort_keys=True)
        try:
            result = validate_materialized_document(schema, authority=authority)
        except DocumentRejected as error:
            raise AssertionError([str(issue) for issue in error.issues[:30]]) from error
        assert result["accepted"] is True
        assert len(result["surfaces"]) == 6
        assert all(surface["schemaUnchanged"] for surface in result["surfaces"])
        assert json.dumps(schema, sort_keys=True) == before
        assert not any(s.lstrip().upper().startswith(("INSERT", "UPDATE", "DELETE")) for s in statements)
        if os.environ.get("GRAPH_ACCEPTANCE_EVIDENCE"):
            directory = Path(os.environ["GRAPH_ACCEPTANCE_EVIDENCE"])
            directory.mkdir(parents=True, exist_ok=True)
            (directory / "validation.json").write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
            (directory / "accepted-document.json").write_text(json.dumps(schema, indent=2), encoding="utf-8")
            (directory / "readonly.json").write_text(json.dumps({"statements": statements, "writes": 0, "schemaUnchanged": True,
                "snapshotHash": authority.snapshot_hash, "bindings": json.loads(authority.bindings_json)}, indent=2), encoding="utf-8")
        yield schema, authority, result
    engine.dispose()


def test_real_six_surface_acceptance_and_no_database_writes(approved):
    _, _, result = approved
    assert result["accepted"] is True
    for surface in result["surfaces"]:
        assert {s["name"] for s in surface["states"]} == REQUIRED_STATES | {"lead-product:qa-item"}
        by_name = {s["name"]: s["html"] for s in surface["states"]}
        for state, text in {"lead-invalid": "Add a message", "lead-pending": "Sending...", "lead-error": "Could not send.",
                            "lead-sent": "Sent. Thank you.", "checkout-pending": "Preparing checkout...",
                            "checkout-error": "Checkout could not be completed.", "cart-empty": "Your cart is empty."}.items():
            assert text in by_name[state], state
        assert any("contact:email" == segment.get("binding") for e in surface["entries"] for segment in e.get("segments", []))
        assert any("product:qa-item:price" == segment.get("binding") for e in surface["entries"] for segment in e.get("segments", []))
        assert any("product:qa-item:stock" == segment.get("binding") for e in surface["entries"] for segment in e.get("segments", []))


@pytest.mark.parametrize("field,value", [("name", "Invented item"), ("price_label", "USD 0.01"), ("inventory_quantity", 100), ("product_id", "another-product")])
def test_product_snapshot_cannot_be_changed(approved, field, value):
    schema, authority, _ = approved
    candidate = copy.deepcopy(schema)
    candidate["catalog_items"][0][field] = value
    with pytest.raises(DocumentRejected, match="Whole presentation rejected"):
        _verify_candidate(candidate, authority)


@pytest.mark.parametrize("binding,value", [("contact:email", "other@example.test"), ("product:qa-item:price", "USD 1.00"), ("product:qa-item:stock", "999"), ("contact:guarantee", "Lifetime warranty")])
def test_typed_exception_requires_exact_server_value(approved, binding, value):
    _, authority, result = approved
    candidate = copy.deepcopy(result)
    candidate["surfaces"][0]["entries"].append({"path": "typed-forgery", "kind": "text", "text": value,
        "segments": [{"text": value, "binding": binding}]})
    with pytest.raises(DocumentRejected) as error:
        _check_projection(candidate, authority)
    assert any(i.rule == "invalid_typed_binding" for i in error.value.issues)


@pytest.mark.parametrize("change", ["missing", "duplicate", "mutated"])
def test_coverage_and_immutability_are_mandatory(approved, change):
    _, authority, result = approved
    candidate = copy.deepcopy(result)
    surface = candidate["surfaces"][0]
    if change == "missing": surface["states"].pop()
    elif change == "duplicate": surface["states"][-1] = surface["states"][0]
    else: surface["schemaUnchanged"] = False
    with pytest.raises(DocumentRejected):
        _check_projection(candidate, authority)


@pytest.mark.parametrize("text", ["qa@example.test", "+12025550123", "USD 25.00", "Free shipping", "Lifetime warranty"])
def test_same_value_outside_typed_destination_is_not_exempt(approved, text):
    schema, authority, _ = approved
    candidate = copy.deepcopy(schema)
    candidate["pages"][0]["sections"][0]["editable"]["headline"] = text
    with pytest.raises(DocumentRejected) as error:
        validate_materialized_document(candidate, authority=authority)
    assert any(i.rule.endswith("_claim") or i.rule == "unapproved_legacy_promise" for i in error.value.issues)


def test_authority_rejects_non_admin_and_uncommitted_product():
    from app.db_models import Product
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        schema, authority = accepted_candidate(session)
        with pytest.raises(DocumentRejected) as error:
            read_presentation_authority(session, authority.site_id, actor={"id": "owner", "role": "client"}, contact=schema["contact"])
        assert error.value.issues[0].rule == "super_admin_required"
        session.get(Product, "projection-product").price_cents = 1
        with pytest.raises(DocumentRejected) as error:
            read_presentation_authority(session, authority.site_id, actor={"id": "admin", "role": "super_admin"}, contact=schema["contact"])
        assert error.value.issues[0].rule == "uncommitted_snapshot"
        session.rollback()
    engine.dispose()


@pytest.mark.parametrize("currency", ["Free shipping", "EUR"])
def test_json_currency_cannot_authorize_prose_or_change_commerce_currency(currency):
    from app.db_models import GeneratedSite
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        schema, authority = accepted_candidate(session)
        row = session.get(GeneratedSite, authority.site_id)
        stored = json.loads(row.generated_config)
        stored["catalog_items"][0]["currency"] = currency
        row.generated_config = json.dumps(stored)
        session.commit()
        with pytest.raises(DocumentRejected) as error:
            read_presentation_authority(session, row.id, actor={"id": "admin", "role": "super_admin"}, contact=schema["contact"])
        assert error.value.issues[0].rule == "unsupported_product_currency"
    engine.dispose()
