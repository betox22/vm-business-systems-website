import json
from copy import deepcopy
from unittest.mock import patch

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event, select

from app import agents, main, site_graph_generation, site_graph_llm, site_graph_service
from app.db_models import AdminAuditEvent, GeneratedSite, Product, Store
from app.site_graph_contract import DesignPattern
from app.site_graph_generation_contract import GenerationRequest, SCENARIOS, generation_contract, synthetic_scenario
from app.site_graph_models import DesignReferencePattern, SiteGraphRow
from app.site_graph_patterns import bootstrap_patterns
from test_site_graph import api, block, post


PAYLOAD = {"scenario_id": "studio_goods", "industry_tag": "product", "language": "en", "expected_version": 0}


def proposal(scenario="studio_goods"):
    blocks = [block(content={"headline": "Synthetic studio supplies", "subheadline": "Supplies for everyday desk work."}),
              block("products", 1, "product_grid", {"heading": "Products", "items": deepcopy(SCENARIOS[scenario]["products"])}),
              block("footer", 2, "footer", {"text": "Synthetic graph experiment."})]
    return {"operations": [{"op": "add_block", "block": b} for b in blocks]}


def response_body(raw=None, **overrides):
    return {"id": "chatcmpl-test", "object": "chat.completion", "created": 1, "model": "gpt-6-astra",
            "choices": [{"index": 0, "finish_reason": "stop", "message": {"role": "assistant", "content": raw or json.dumps(proposal())}}], **overrides}


def generate(client, payload=None, token="admin", site_id="generated"):
    return client.post(f"/api/v1/sites/{site_id}/graph/generate", json=PAYLOAD if payload is None else payload,
                       headers={"Authorization": f"Bearer {token}"} if token else {})


@pytest.fixture
def seeded(api):
    client, factory = api
    with factory() as session:
        bootstrap_patterns(session)
    return client, factory


@pytest.fixture
def wire(monkeypatch):
    original = agents.OpenAI
    calls = []
    state = {"status": 200, "body": response_body()}
    def handler(request):
        calls.append({"url": str(request.url), "body": json.loads(request.content), "request": request})
        if state.get("exception"):
            raise state["exception"]
        return httpx.Response(state["status"], json=state["body"])
    def client(**kwargs):
        assert kwargs["timeout"] == agents.OPENAI_REQUEST_TIMEOUT_SECONDS
        return original(http_client=httpx.Client(transport=httpx.MockTransport(handler)), **kwargs)
    monkeypatch.setenv("OPENAI_API_KEY", "synthetic-api-key")
    monkeypatch.setattr(agents, "OpenAI", client)
    monkeypatch.setenv("OPENAI_MODEL", "gpt-6-astra")
    monkeypatch.delenv("OPENAI_BASE_URL", raising=False)
    monkeypatch.setattr(agents.time, "sleep", lambda _: None)
    return calls, state


def test_wire_envelope_only_scenario_patterns_contract_and_no_private_queries(seeded, wire):
    client, factory = seeded
    calls, _ = wire
    marker = "PRIVATE_SITE_MARKER_736"
    with factory() as session:
        session.add(Store(id="private-store", owner_email="private@example.invalid", name=marker, business_type="retail", public_url=""))
        session.add(GeneratedSite(id="private-site", store_id="private-store", owner_email="private@example.invalid",
            business_name=marker, business_type="retail", template_id="x", template_name="x", template_mode="x",
            domain_slug="private", public_url="https://private.invalid", generated_config=json.dumps({"private": marker})))
        session.add(Product(id="private-product", store_id="private-store", name=marker,
            category="private", description=marker, price_cents=None, inventory=0))
        session.add(SiteGraphRow(site_id="private-graph", version=1, blocks=[block(content={"headline": marker})]))
        session.commit()
    statements, before_provider = [], []
    engine = factory.kw["bind"]
    def track(conn, cursor, statement, parameters, context, many):
        statements.append(statement.lower())
    original = site_graph_llm.generate_with_openai
    def spy(envelope):
        before_provider.extend(statements)
        return original(envelope)
    event.listen(engine, "before_cursor_execute", track)
    try:
        with patch.object(site_graph_llm, "generate_with_openai", side_effect=spy):
            result = generate(client)
    finally:
        event.remove(engine, "before_cursor_execute", track)
    assert result.status_code == 200, result.text
    assert len(calls) == 1
    body = calls[0]["body"]
    assert set(body) == {"model", "response_format", "messages"}
    assert body["model"] == "gpt-6-astra"
    assert calls[0]["url"] == "https://api.openai.com/v1/chat/completions"
    envelope = json.loads(body["messages"][1]["content"])
    assert set(envelope) == {"scenario", "patterns", "contract"}
    assert envelope["scenario"] == synthetic_scenario(GenerationRequest(**PAYLOAD))
    assert envelope["contract"] == generation_contract()
    for pattern in envelope["patterns"]:
        assert DesignPattern.model_validate(pattern)
    assert marker not in json.dumps(body)
    for secret in ("private@example.invalid", "private.invalid", "private-store", "private-graph", "synthetic-api-key"):
        assert secret not in json.dumps(body)
    assert not any("generated_sites" in q or " stores" in q or " products" in q for q in statements)
    assert not any("site_graphs.blocks" in q for q in before_provider)
    assert any("design_reference_patterns" in q for q in before_provider)


def test_both_routes_call_same_persistence_function(seeded, wire):
    client, factory = seeded
    with patch.object(site_graph_service, "persist_graph_batch", wraps=site_graph_service.persist_graph_batch) as shared:
        assert post(client).status_code == 200
        assert generate(client).status_code == 200
        assert shared.call_count == 2
        assert [c.kwargs["site_id"] for c in shared.call_args_list] == ["sample", "generated"]
    assert len(wire[0]) == 1
    with factory() as session:
        assert session.get(SiteGraphRow, "generated").version == 1
        assert session.get(SiteGraphRow, "sample").version == 1


@pytest.mark.parametrize("token,status", [(None, 401), ("expired", 401), ("owner", 403), ("support", 403)])
def test_generation_auth_before_provider(seeded, wire, token, status):
    assert generate(seeded[0], token=token).status_code == status
    assert wire[0] == []


@pytest.mark.parametrize("change", [{"url": "https://private.invalid"}, {"site_id": "private"}, {"html": "<body>private</body>"}, {"prompt": "private"}, {"scenario_id": "unapproved"}, {"industry_tag": "https://private.invalid"}, {"expected_version": 2}])
def test_unapproved_input_rejected_and_audited(seeded, wire, change):
    client, factory = seeded
    assert generate(client, {**PAYLOAD, **change}).status_code == 422
    assert wire[0] == []
    with factory() as session:
        assert session.get(SiteGraphRow, "generated") is None
        audit = session.scalar(select(AdminAuditEvent))
        assert json.loads(audit.metadata_json) == {"reason": "invalid_generation_request"}
        assert "private" not in audit.metadata_json


@pytest.mark.parametrize("mode", ["empty", "corrupt"])
def test_bad_patterns_never_reach_provider(seeded, wire, mode):
    client, factory = seeded
    with factory() as session:
        row = session.get(DesignReferencePattern, "editorial_minimal")
        if mode == "empty":
            session.delete(row)
        else:
            row.style_descriptor = {**row.style_descriptor, "imagery_style": "https://private.invalid/image.png"}
        session.commit()
    assert generate(client).status_code == 422
    assert wire[0] == []


@pytest.mark.parametrize("invalid", ["type", "duplicate", "index", "empty_text", "extra_content", "wrong_products", "fixed_embed", "variant", "remove", "markdown", "duplicate_json_key"])
def test_one_invalid_block_rejects_everything_without_raw_audit(seeded, wire, invalid):
    client, factory = seeded
    data = proposal()
    second = data["operations"][1]["block"]
    if invalid == "type": second["type"] = "unknown"
    elif invalid == "duplicate": second["block_id"] = "hero"
    elif invalid == "index": second["order_index"] = 99
    elif invalid == "empty_text": data["operations"][2]["block"]["content"]["text"] = ""
    elif invalid == "extra_content": second["content"]["price"] = 799.99
    elif invalid == "wrong_products": second["content"]["items"][0]["name"] = "PRIVATE_BAD_OUTPUT_MARKER"
    elif invalid == "variant": second["layout_variant"] = "unsupported"
    elif invalid == "remove": data["operations"][1] = {"op": "remove_block", "block_id": "hero"}
    elif invalid == "fixed_embed": data["operations"].append({"op": "add_block", "block": block("cart", 3, "cart_embed", {"module": "fake"})})
    raw = json.dumps(data)
    if invalid == "markdown": raw = "```json\n" + raw + "\n```"
    if invalid == "duplicate_json_key": raw = '{"operations":[],"operations":' + json.dumps(data["operations"]) + '}'
    wire[1]["body"] = response_body(raw)
    result = generate(client)
    assert result.status_code == 422, result.text
    with factory() as session:
        assert session.get(SiteGraphRow, "generated") is None
        audits = session.scalars(select(AdminAuditEvent)).all()
        assert len(audits) == 1 and audits[0].outcome == "rejected"
        assert json.loads(audits[0].metadata_json) == {"reason": "invalid_generated_batch"}
        assert "PRIVATE_BAD_OUTPUT_MARKER" not in result.text + audits[0].metadata_json


def test_existing_graph_not_read_as_context_or_changed(seeded, wire):
    client, factory = seeded
    assert post(client).status_code == 200
    assert generate(client, site_id="sample").status_code == 409
    assert wire[0] == []
    with factory() as session:
        assert session.get(SiteGraphRow, "sample").version == 1


def test_generation_audit_failure_rolls_back(seeded, wire):
    client, factory = seeded
    with patch.object(site_graph_service, "record_admin_audit_event", side_effect=RuntimeError("audit down")):
        assert generate(client).status_code == 500
    with factory() as session:
        assert session.get(SiteGraphRow, "generated") is None


@pytest.mark.parametrize("status,attempts", [(401, 2), (400, 2), (429, 6), (500, 6), (503, 6), (302, 2)])
def test_provider_errors_no_fallback_and_bounded_retry(seeded, wire, status, attempts):
    wire[1]["status"] = status
    wire[1]["body"] = {"error": "PRIVATE_PROVIDER_ERROR"}
    result = generate(seeded[0])
    assert result.status_code == 502
    assert len(wire[0]) == attempts
    assert "PRIVATE_PROVIDER_ERROR" not in result.text
    with seeded[1]() as session:
        assert session.get(SiteGraphRow, "generated") is None
        assert "PRIVATE_PROVIDER_ERROR" not in session.scalar(select(AdminAuditEvent)).metadata_json


@pytest.mark.parametrize("reason", ["length", "content_filter", "tool_calls", "function_call"])
def test_incomplete_or_refused_response_never_saved(seeded, wire, reason):
    wire[1]["body"]["choices"][0]["finish_reason"] = reason
    assert generate(seeded[0]).status_code == 502
    assert len(wire[0]) == 1


def test_missing_key_clear_error_no_call(seeded, wire, monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY")
    result = generate(seeded[0])
    assert result.status_code == 503 and result.json()["detail"] == "provider_not_configured"
    assert wire[0] == []


def test_network_timeout_bounded(seeded, wire):
    wire[1]["exception"] = httpx.ReadTimeout("PRIVATE_PROVIDER_TIMEOUT")
    assert generate(seeded[0]).status_code == 502
    assert len(wire[0]) == 6


def test_feature_disabled_no_generation_route():
    with TestClient(main.app) as client:
        assert generate(client).status_code in (404, 405)


def test_provider_read_session_closed_before_network(seeded, wire):
    original = site_graph_generation.Session
    opened = []
    class TrackedSession(original):
        def __enter__(self):
            opened.append(self)
            return super().__enter__()
        def __exit__(self, *args):
            opened.remove(self)
            return super().__exit__(*args)
    transport = site_graph_llm.generate_with_openai
    def spy(envelope):
        assert opened == []
        return transport(envelope)
    with patch.object(site_graph_generation, "Session", TrackedSession), patch.object(site_graph_llm, "generate_with_openai", side_effect=spy):
        assert generate(seeded[0]).status_code == 200


@pytest.mark.parametrize("invalid", ["missing_choices", "tool_call", "empty", "oversize", "refusal"])
def test_invalid_provider_protocol_rejected(seeded, wire, invalid):
    body = wire[1]["body"]
    message = body["choices"][0]["message"]
    if invalid == "missing_choices": body["choices"] = []
    elif invalid == "tool_call": message["tool_calls"] = [{"id": "call1", "type": "function", "function": {"name": "read_database", "arguments": "{}"}}]
    elif invalid == "empty": message["content"] = ""
    elif invalid == "oversize": message["content"] = "x" * 300000
    elif invalid == "refusal": message["refusal"] = "PRIVATE_REFUSAL"
    assert generate(seeded[0]).status_code == 502
    assert len(wire[0]) == 1
    with seeded[1]() as session:
        assert session.get(SiteGraphRow, "generated") is None


def test_generation_race_does_not_overwrite_winner(seeded, wire):
    client, factory = seeded
    transport = site_graph_llm.generate_with_openai
    def competing_writer(envelope):
        with factory() as session:
            session.add(SiteGraphRow(site_id="generated", version=1, blocks=[block(content={"headline": "Concurrent winner"})]))
            session.commit()
        return transport(envelope)
    with patch.object(site_graph_llm, "generate_with_openai", side_effect=competing_writer):
        assert generate(client).status_code == 409
    with factory() as session:
        row = session.get(SiteGraphRow, "generated")
        assert row.version == 1 and row.blocks[0]["content"]["headline"] == "Concurrent winner"
        events = session.scalars(select(AdminAuditEvent)).all()
        assert len(events) == 1 and events[0].outcome == "rejected"


@pytest.mark.parametrize("scenario,tag", [("studio_goods", "product"), ("outdoor_tools", "commerce"), ("quiet_objects", "luxury")])
def test_closed_scenarios_use_approved_products(seeded, wire, scenario, tag):
    wire[1]["body"] = response_body(json.dumps(proposal(scenario)))
    result = generate(seeded[0], {**PAYLOAD, "scenario_id": scenario, "industry_tag": tag})
    assert result.status_code == 200
    assert result.json()["blocks"][1]["content"]["items"] == SCENARIOS[scenario]["products"]

def test_reuses_agents_transport_without_catalog_pipeline(seeded, wire):
    with patch.object(agents, "create_sync_chat_completion_with_retry", wraps=agents.create_sync_chat_completion_with_retry) as shared, patch.object(agents, "generate_ai_seed_catalog", side_effect=AssertionError("catalog must not run")):
        assert generate(seeded[0]).status_code == 200
        assert shared.call_count == 1
        assert set(shared.call_args.kwargs) == {"model", "response_format", "messages"}


def test_configured_openai_model_is_used(seeded, wire, monkeypatch):
    monkeypatch.setenv("OPENAI_MODEL", "configured-test-model")
    assert generate(seeded[0]).status_code == 200
    assert wire[0][0]["body"]["model"] == "configured-test-model"
