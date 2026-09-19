import copy
import json
import subprocess

import pytest

from app.site_graph_document_validation import (
    DocumentRejected, PRESENTATION_VERSION, ROOT, _check_projection, validate_materialized_document,
)


def projection(text="Browse the catalog", kind="text"):
    return {"version": PRESENTATION_VERSION, "surfaces": [
        {"renderer": renderer, "viewport": {"width": width}, "html": "<main>catalog</main>",
         "entries": [{"path": "$/main", "kind": kind, "text": text}], "violations": []}
        for renderer in ("builder", "public") for width in (1440, 390, 320)
    ]}


@pytest.mark.parametrize("kind", ["text", "attribute", "css", "subtree", "subtree_spaced"])
@pytest.mark.parametrize("claim", ["Free shipping", "Lifetime warranty", "Secure payment", "Easy returns", "10% discount", "Certified tools"])
def test_every_final_presentation_channel_rejects_entire_document(kind, claim):
    candidate = projection()
    candidate["surfaces"][-1]["entries"].append({"path": "$/empty/aria", "kind": kind, "text": claim})
    before = copy.deepcopy(candidate)
    with pytest.raises(DocumentRejected) as error:
        _check_projection(candidate)
    assert error.value.issues
    assert candidate == before
    assert str(error.value) == "Whole presentation rejected"
    assert claim not in str(error.value)


def test_neutral_projection_passes():
    candidate = projection()
    assert _check_projection(candidate) is candidate


def test_incomplete_and_active_content_fail_closed():
    candidate = projection()
    candidate["surfaces"].pop()
    with pytest.raises(DocumentRejected):
        _check_projection(candidate)
    candidate = projection()
    candidate["surfaces"][0]["violations"] = [{"path": "$", "reason": "active_attribute"}]
    with pytest.raises(DocumentRejected):
        _check_projection(candidate)


def test_runtime_unavailable_fails_closed(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "must-not-reach-browser-runtime")
    monkeypatch.setenv("DATABASE_URL", "must-not-reach-browser-runtime")
    def unavailable(*args, **kwargs):
        assert "OPENAI_API_KEY" not in kwargs["env"]
        assert "DATABASE_URL" not in kwargs["env"]
        raise subprocess.TimeoutExpired("node", 90)
    monkeypatch.setattr(subprocess, "run", unavailable)
    with pytest.raises(DocumentRejected) as error:
        validate_materialized_document({})
    assert error.value.issues[0].rule == "presentation_unavailable"


def test_real_chromium_legacy_defaults_reject_whole_document():
    schema = json.loads((ROOT / "tests/fixtures/graph-presentation.json").read_text())
    before = copy.deepcopy(schema)
    with pytest.raises(DocumentRejected) as error:
        validate_materialized_document(schema)
    assert schema == before
    rules = {issue.rule for issue in error.value.issues}
    assert "promotion_claim" in rules
    assert "unapproved_legacy_promise" in rules
    assert {issue.surface.split(":")[0] for issue in error.value.issues} == {"builder", "public"}
