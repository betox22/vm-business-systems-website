import itertools
import json
from copy import deepcopy
from unittest.mock import patch

import pytest
from pydantic import ValidationError
from sqlalchemy import select

from app import site_graph_service
from app.db_models import AdminAuditEvent
from app.site_graph_contract import Block, OperationsRequest, SiteGraph, TrustFactsContent
from app.site_graph_generation_contract import ProposedGraph, generation_contract
from app.site_graph_models import SiteGraphRow
from app.site_graph_preview import render_graph
from test_site_graph import api, block, post
from test_site_graph_generation import seeded, wire, generate, proposal, response_body
from test_site_graph_business_generation import BUSINESS_PAYLOAD, business_proposal, with_claim, script

FACTS = {
    "contact": {"phone": "+1 (305) 555-0123", "whatsapp": "+58 412 555-0123", "email": "qa@example.invalid", "address": "123 Main Street, Miami"},
    "experience_years": 0,
    "certifications": ["QA Certification & Training"],
    "guarantee": 'QA warranty: "one year"',
    "promotion": {"text": "10% discount for QA only", "valid_until": "2020-02-29"},
}


def trust(content=None, index=0):
    return {**block("trust", index, "trust_facts"), "content": deepcopy(FACTS if content is None else content)}


@pytest.mark.parametrize("fields", [subset for n in range(6) for subset in itertools.combinations(FACTS, n)])
def test_g01_partial_combinations(fields):
    data = {key: FACTS[key] for key in fields}
    assert Block.model_validate(trust(data)).content == data


@pytest.mark.parametrize("fields", [subset for n in range(5) for subset in itertools.combinations(FACTS["contact"], n)])
def test_g01_partial_contact_combinations(fields):
    data = {"contact": {key: FACTS["contact"][key] for key in fields}}
    assert Block.model_validate(trust(data)).content == data


def test_g02_null_normalization_and_boundaries():
    assert Block.model_validate(trust({key: None for key in FACTS})).content == {}
    assert TrustFactsContent(experience_years=150, certifications=["x" * 160] * 10, guarantee="x" * 400)
    assert Block.model_validate(trust({"contact": {"phone": None}, "certifications": []})).content == {"contact": {}, "certifications": []}


@pytest.mark.parametrize("data", [
    {"extra": 1}, {"contact": {"extra": "x"}}, {"promotion": {"text": "x", "extra": "x"}},
    {"promotion": {}}, {"promotion": {"text": None}}, {"certifications": ["x"] * 11},
    {"certifications": ["x" * 161]}, {"guarantee": "x" * 401}, {"guarantee": " "},
    {"certifications": [1]}, {"contact": []}, {"guarantee": 1},
] + [{"experience_years": x} for x in [-1, 151, True, 1.0, "1"]])
def test_g02_invalid_types_limits_and_extras(data):
    with pytest.raises(ValidationError):
        Block.model_validate(trust(data))


@pytest.mark.parametrize("data", [
    {"contact": {"phone": "+" + " " * 34 + "1234567"}},
    {"contact": {"email": "a" * 250 + "@test.invalid"}},
    {"contact": {"address": "x" * 401}},
    {"promotion": {"text": "x" * 401}},
])
def test_g02_remaining_string_limits(data):
    with pytest.raises(ValidationError):
        Block.model_validate(trust(data))


def test_g02_only_default_variant():
    with pytest.raises(ValidationError):
        Block.model_validate({**trust(), "layout_variant": "editorial"})


@pytest.mark.parametrize("value", ["<script>x</script>", "https://example.com", "example.com", "www.test.com", "javascript:alert(1)", "data:text/plain,x", "x\nscript", "x\x00y"])
@pytest.mark.parametrize("field", ["address", "guarantee", "certifications", "promotion"])
def test_g03_resources_and_markup_rejected(value, field):
    data = {"contact": {"address": value}} if field == "address" else {field: [value] if field == "certifications" else {"text": value} if field == "promotion" else value}
    with pytest.raises(ValidationError):
        Block.model_validate(trust(data))


@pytest.mark.parametrize("field,value", [
    ("phone", "123"), ("phone", "1" * 16), ("phone", "123+456789"), ("phone", "１２３４５６７８"),
    ("phone", "12345678\n"), ("whatsapp", "https://wa.me/12345678"),
    ("email", "a@@b.com"), ("email", "a b@test.com"), ("email", "a@test"),
    ("email", "<a@test.com>"), ("email", "mailto:a@test.com"), ("email", "a@test.com\n"),
])
def test_g03_contact_formats(field, value):
    with pytest.raises(ValidationError):
        Block.model_validate(trust({"contact": {field: value}}))


@pytest.mark.parametrize("value", ["2023-02-29", "2024-13-01", "2024-01-32", "20240101", "01/02/2024", "2024-01-01T00:00:00Z", 1700000000, "2024-1-1"])
def test_g04_invalid_dates(value):
    with pytest.raises(ValidationError):
        Block.model_validate(trust({"promotion": {"text": "QA", "valid_until": value}}))


def test_g04_valid_dates_remain_json_strings():
    for value in ("2024-02-29", "2000-01-01", "2100-12-31"):
        assert Block.model_validate(trust({"promotion": {"text": "QA", "valid_until": value}})).content["promotion"]["valid_until"] == value


@pytest.mark.parametrize("model", [SiteGraph, OperationsRequest])
def test_g05_conditional_schema_no_dangling_refs_and_provider_exclusion(model):
    schema = model.model_json_schema()
    def visit(value):
        if isinstance(value, dict):
            if "$ref" in value:
                target = schema
                for part in value["$ref"][2:].split("/"):
                    target = target[part]
            for item in value.values(): visit(item)
        elif isinstance(value, list):
            for item in value: visit(item)
    visit(schema)
    conditional = next(c for c in schema["$defs"]["Block"]["allOf"] if c["if"]["properties"]["type"]["const"] == "trust_facts")
    assert conditional["then"]["properties"]["content"]["additionalProperties"] is False
    assert "trust_facts" not in json.dumps(generation_contract())
    assert "TrustFacts" not in json.dumps(ProposedGraph.model_json_schema())


def test_g06_g09_operations_persist_manual_without_claim_filter(api):
    client, factory = api
    assert post(client, [{"op": "add_block", "block": trust()}]).status_code == 200
    with factory() as session:
        assert session.get(SiteGraphRow, "sample").blocks[0]["content"] == FACTS
    result = post(client, [{"op": "update_block_content", "block_id": "trust", "content": {"experience_years": 15, "guarantee": None}}], version=1)
    assert result.status_code == 200
    assert result.json()["blocks"][0]["content"] == {"experience_years": 15}
    with factory() as session:
        assert session.get(SiteGraphRow, "sample").blocks == result.json()["blocks"]
        for row in session.scalars(select(AdminAuditEvent)):
            assert set(json.loads(row.metadata_json)) == {"count", "version"}
            assert "qa@" not in row.metadata_json


def test_g07_invalid_update_batch_cas_and_rollback(api):
    client, factory = api
    assert post(client, [{"op": "add_block", "block": trust()}]).status_code == 200
    result = post(client, [{"op": "add_block", "block": block("hero", 1)},
        {"op": "update_block_content", "block_id": "trust", "content": {"promotion": {"text": "<script>"}}}], version=1)
    assert result.status_code == 422
    assert post(client, [{"op": "remove_block", "block_id": "trust"}], version=0).status_code == 409
    with patch.object(site_graph_service, "record_admin_audit_event", side_effect=RuntimeError("audit down")):
        assert post(client, [{"op": "update_block_content", "block_id": "trust", "content": {}}], version=1).status_code == 500
    with factory() as session:
        row = session.get(SiteGraphRow, "sample")
        assert row.version == 1 and len(row.blocks) == 1 and row.blocks[0]["content"] == FACTS


@pytest.mark.parametrize("token,status", [(None, 401), ("owner", 403), ("support", 403), ("admin", 200)])
def test_g08_auth(api, token, status):
    assert post(api[0], [{"op": "add_block", "block": trust()}], token=token).status_code == status


def test_g10_adversarial_first_output_rejected_no_writes(seeded, wire):
    bad = proposal()
    bad["operations"].append({"op": "add_block", "block": trust(index=3)})
    wire[1]["body"] = response_body(json.dumps(bad))
    assert generate(seeded[0]).status_code == 422
    assert len(wire[0]) == 1
    assert "trust_facts" not in json.dumps(wire[0][0]["body"])
    with seeded[1]() as session:
        assert session.get(SiteGraphRow, "generated") is None


def test_g10_adversarial_retry_fallback_excludes_trust_and_private_data(seeded, wire, script):
    client, factory = seeded
    assert post(client, [{"op": "add_block", "block": trust({"guarantee": "PRIVATE_MANUAL_MARKER"})}]).status_code == 200
    bad = business_proposal()
    bad["operations"].append({"op": "add_block", "block": trust(index=3)})
    script[0].extend([with_claim(), bad])
    result = generate(client, BUSINESS_PAYLOAD)
    assert result.status_code == 200 and len(wire[0]) == 2
    assert all(b["type"] != "trust_facts" for b in result.json()["blocks"])
    assert "PRIVATE_MANUAL_MARKER" not in json.dumps([c["body"] for c in wire[0]])
    with factory() as session:
        assert session.get(SiteGraphRow, "sample").blocks[0]["content"]["guarantee"] == "PRIVATE_MANUAL_MARKER"


def test_g11_preview_escaping_expiry_zero_and_empty(api, monkeypatch):
    monkeypatch.setenv("KREATON_AI_GRAPH_ENABLED", "1")
    client, _ = api
    assert post(client, [{"op": "add_block", "block": trust()}]).status_code == 200
    result = client.get('/api/admin/internal/graph-preview?site_id=sample', headers={"Authorization": "Bearer admin"})
    assert result.status_code == 200
    assert "default-src 'none'" in result.headers["content-security-policy"]
    assert "style-src 'sha256-" in result.headers["content-security-policy"]
    assert "&amp;" in result.text and "&quot;" in result.text and "2020-02-29" in result.text
    assert '<dd>0</dd>' in result.text and '<a ' not in result.text
    graph = SiteGraph(site_id="empty", version=1, blocks=[trust({})])
    assert 'data-block-type="trust_facts"' not in render_graph(graph)
    graph.blocks[0].content = {"guarantee": '<script>alert("x")</script>'}
    assert '<script>' not in render_graph(graph) and '&lt;script&gt;' in render_graph(graph)
