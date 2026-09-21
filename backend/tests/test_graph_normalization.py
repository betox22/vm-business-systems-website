import copy
import json
import os
from dataclasses import replace, asdict
from pathlib import Path

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session

from app.db import Base
from app import site_graph_normalization as normalization
from app.site_graph_document_validation import DocumentRejected
from graph_presentation_fixture import accepted_candidate


@pytest.fixture
def candidate(monkeypatch):
    monkeypatch.setenv(normalization.KEY_ENV, "synthetic-test-key-not-a-production-secret-2026")
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        schema, authority = accepted_candidate(session)
        yield schema, authority, session
    engine.dispose()


def test_real_normalize_twice_then_validate_all_six_surfaces_readonly(candidate, monkeypatch):
    schema, authority, session = candidate
    receipt = normalization.issue_graph_provenance(schema, authority=authority)
    statements = []
    event.listen(session.bind, "before_cursor_execute", lambda c, cursor, statement, *args: statements.append(statement))
    calls = []
    real_run = normalization.subprocess.run
    real_validate = normalization.validate_materialized_document

    def run(*args, **kwargs):
        assert normalization.KEY_ENV not in kwargs["env"]
        assert "DATABASE_URL" not in kwargs["env"]
        calls.append(Path(args[0][1]).name)
        return real_run(*args, **kwargs)

    def validate(document, **kwargs):
        assert calls == ["graph-normalization.mjs"]
        assert document == schema and document is not schema
        calls.append("whole-document-after-normalization")
        return real_validate(document, **kwargs)

    monkeypatch.setattr(normalization.subprocess, "run", run)
    monkeypatch.setattr(normalization, "validate_materialized_document", validate)
    before = copy.deepcopy(schema)
    result = normalization.normalize_and_validate_graph_document(schema, receipt, authority=authority)
    assert result["accepted"] and result["validation"]["accepted"]
    assert result["document"] == before == schema
    assert len(result["normalization"]["trace"]) == 8
    assert all(s["unchanged"] for s in result["normalization"]["trace"])
    assert len(result["validation"]["surfaces"]) == 6
    assert all(s["schemaUnchanged"] and not s["violations"] for s in result["validation"]["surfaces"])
    assert not any(s.lstrip().upper().startswith(("INSERT", "UPDATE", "DELETE")) for s in statements)
    directory = os.environ.get("GRAPH_STEP2_EVIDENCE")
    if directory:
        folder = Path(directory)
        folder.mkdir(parents=True, exist_ok=True)
        for name in ("document", "normalization", "validation", "provenance"):
            (folder / f"{name}.json").write_text(json.dumps(result[name], ensure_ascii=False), encoding="utf-8")
        (folder / "server-pipeline.json").write_text(json.dumps({"calls": calls, "writes": 0,
            "keySource": "pytest synthetic environment; never configured in Render", "accepted": True}, indent=2), encoding="utf-8")


@pytest.mark.parametrize("tamper", ["signature", "document", "site", "store", "snapshot", "version", "extra", "boolean", "boolean-version", "float-version"])
def test_untrusted_provenance_never_enters_runtime(candidate, monkeypatch, tamper):
    schema, authority, _ = candidate
    receipt = normalization.issue_graph_provenance(schema, authority=authority)
    if tamper == "signature": receipt["signature"] = "0" * 64
    elif tamper == "document": schema["global_components"]["footer_text"] = "Changed"
    elif tamper == "site": receipt["site_id"] = "another-site"
    elif tamper == "store": receipt["store_id"] = "another-store"
    elif tamper == "snapshot": authority = replace(authority, snapshot_hash="f" * 64)
    elif tamper == "version": receipt["version"] = 2
    elif tamper == "extra": receipt["verified"] = True
    elif tamper == "boolean": receipt = {"verified": True, "version": 1}
    elif tamper == "boolean-version": receipt["version"] = True
    elif tamper == "float-version": receipt["version"] = 1.0
    monkeypatch.setattr(normalization.subprocess, "run", lambda *a, **k: pytest.fail("unverified document reached Chromium"))
    with pytest.raises(DocumentRejected):
        normalization.normalize_and_validate_graph_document(schema, receipt, authority=authority)


def test_missing_key_fails_closed_without_default(candidate, monkeypatch):
    schema, authority, _ = candidate
    monkeypatch.delenv(normalization.KEY_ENV)
    with pytest.raises(DocumentRejected) as error:
        normalization.issue_graph_provenance(schema, authority=authority)
    assert error.value.issues[0].rule == "provenance_key_unconfigured"


def test_json_number_canonicalization_preserves_values_without_silent_js_rounding():
    assert normalization._canonical({"price": 25.0}) == normalization._canonical({"price": 25})
    assert normalization._canonical({"value": True}) != normalization._canonical({"value": 1})
    for value in (2**53, float("nan"), float("inf")):
        with pytest.raises(ValueError):
            normalization._canonical({"value": value})


@pytest.mark.parametrize("text", ["Free shipping", "Lifetime warranty", "Secure payment", "20% discount", "qa@example.test", "USD 25.00"])
def test_signed_origin_does_not_authorize_claims_after_normalization(candidate, monkeypatch, text):
    schema, authority, _ = candidate
    schema["pages"][0]["sections"][0]["editable"]["headline"] = text
    receipt = normalization.issue_graph_provenance(schema, authority=authority)
    calls = []
    real_validate = normalization.validate_materialized_document

    def validate(document, **kwargs):
        calls.append("post-normalization")
        assert document["pages"][0]["sections"][0]["editable"]["headline"] == text
        return real_validate(document, **kwargs)

    monkeypatch.setattr(normalization, "validate_materialized_document", validate)
    with pytest.raises(DocumentRejected) as error:
        normalization.normalize_and_validate_graph_document(schema, receipt, authority=authority)
    assert calls == ["post-normalization"]
    assert any(i.rule.endswith("_claim") or i.rule == "unapproved_legacy_promise" for i in error.value.issues)
    directory = os.environ.get("GRAPH_STEP2_EVIDENCE")
    if directory:
        slug = {"Free shipping": "shipping", "Lifetime warranty": "warranty", "Secure payment": "payment",
                "20% discount": "promotion", "qa@example.test": "contact-in-prose", "USD 25.00": "price-in-prose"}[text]
        (Path(directory) / f"rejected-{slug}.json").write_text(json.dumps({"accepted": False,
            "validatedAfterNormalization": True, "issues": [asdict(i) for i in error.value.issues]}, indent=2), encoding="utf-8")


def test_incomplete_or_mutating_runtime_output_is_rejected_before_render(candidate, monkeypatch):
    from types import SimpleNamespace
    schema, authority, _ = candidate
    receipt = normalization.issue_graph_provenance(schema, authority=authority)
    monkeypatch.setattr(normalization, "validate_materialized_document", lambda *a, **k: pytest.fail("bad normalization reached presentation"))
    for value in ({"document": schema, "unchanged": True, "trace": []},
                  {"document": {**schema, "pages": []}, "unchanged": False}):
        monkeypatch.setattr(normalization.subprocess, "run", lambda *a, **k: SimpleNamespace(stdout=json.dumps(value)))
        with pytest.raises(DocumentRejected):
            normalization.normalize_and_validate_graph_document(schema, receipt, authority=authority)
