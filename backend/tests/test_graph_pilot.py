import copy
import json

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app import site_graph_pilot as pilot, site_graph_persistence as persistence, site_graph_llm
from app.db import Base, get_session
from app.db_models import AdminAuditEvent, GeneratedSite, Product
from app.site_graph_api import create_graph_router
from app.site_graph_generation import neutral_fallback
from app.site_graph_models import GraphPresentationReceipt, SiteGraphRow
from app.site_graph_storage import init_graph_storage
from graph_presentation_fixture import accepted_candidate

PATH = "/api/admin/internal/graph-pilot/projection-site"
PAYLOAD = {"generation": {"input_mode": "business", "business_name": "Projection QA",
    "business_category": "Tools", "industry_tag": "commerce", "language": "en", "expected_version": 0,
    "products": [{"name": "Hand tool", "description": "Steel handle."}], "provided_facts": []},
    "contact": {"email": "private-contact@example.test", "phone": "+12025550123"}}


@pytest.fixture
def setup(tmp_path, monkeypatch):
    monkeypatch.setenv("KREATON_AI_GRAPH_ENABLED", "1")
    monkeypatch.setenv("KREATON_GRAPH_PROVENANCE_KEY", "synthetic-pilot-provenance-key-at-least-32-characters")
    engine = create_engine(f"sqlite:///{tmp_path / 'pilot.sqlite'}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    init_graph_storage(engine)
    with Session(engine) as session:
        accepted_candidate(session)
    app = FastAPI()

    def identity(authorization, cookie):
        token = authorization.removeprefix("Bearer ") or cookie
        if token not in ("admin", "support", "owner"):
            raise HTTPException(401, "Invalid session")
        return {"id": f"private-actor-{token}", "role": "super_admin" if token == "admin" else token}

    def session():
        with Session(engine) as db:
            yield db

    app.include_router(create_graph_router(identity))
    app.dependency_overrides[get_session] = session
    client = TestClient(app)
    yield engine, client
    engine.dispose()


@pytest.fixture
def fast_validation(monkeypatch):
    def projection(document, *, authority):
        pilot.validate_materialized_document_original(document, authority=authority)
        return {"accepted": True, "rendererDigest": "a" * 64, "surfaces": [
            {"renderer": renderer, "viewport": {"width": width}, "states": [],
             "html": "<h1>Reviewed</h1>"} for renderer in ("builder", "public") for width in (1440, 390, 320)]}

    from app.site_graph_document_validation import _verify_candidate
    monkeypatch.setattr(pilot, "validate_materialized_document_original", _verify_candidate, raising=False)
    monkeypatch.setattr(pilot, "validate_materialized_document", projection)

    def normalized(schema, provenance, *, authority):
        persistence.verify_graph_provenance(schema, provenance, authority=authority)
        return {"document": copy.deepcopy(schema), "validation": projection(schema, authority=authority)}

    monkeypatch.setattr(persistence, "normalize_and_validate_graph_document", normalized)


def post(client, payload=None, token="admin"):
    return client.post(PATH + "/generate", json=payload or PAYLOAD,
        headers={"Authorization": f"Bearer {token}"} if token else {})


def snapshot(engine):
    with Session(engine) as session:
        return {model.__tablename__: [{c.name: getattr(row, c.name) for c in model.__table__.columns}
            for row in session.scalars(select(model))] for model in
            (GeneratedSite, Product, SiteGraphRow, GraphPresentationReceipt)}


@pytest.mark.parametrize("token,status", [(None, 401), ("bad", 401), ("owner", 403), ("support", 403)])
def test_pilot_roles(setup, token, status):
    engine, client = setup
    before = snapshot(engine)
    assert post(client, token=token).status_code == status
    assert client.get(PATH + "/review", headers={"Authorization": f"Bearer {token}"} if token else {}).status_code == status
    assert snapshot(engine) == before


def test_flag_closed_on_registered_router(setup, monkeypatch):
    _, client = setup
    monkeypatch.delenv("KREATON_AI_GRAPH_ENABLED")
    assert post(client).status_code == 404
    assert client.get(PATH + "/review", headers={"Authorization": "Bearer admin"}).status_code == 404


def test_http_pipeline_provider_envelope_and_readonly_catalog(setup, fast_validation, monkeypatch):
    engine, client = setup
    before = snapshot(engine)
    calls = []

    def provider(envelope):
        calls.append(copy.deepcopy(envelope))
        serialized = json.dumps(envelope)
        assert set(envelope) == {"scenario", "patterns", "contract"}
        for marker in ("private-contact", "private-actor", "projection-site", "projection-store", "qa-owner"):
            assert marker not in serialized
        return neutral_fallback(pilot.PilotRequest.model_validate(PAYLOAD).generation)

    monkeypatch.setattr(site_graph_llm, "generate_with_openai", provider)
    response = post(client)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["initial_accepted"] and body["validation"]["accepted"]
    assert len(body["validation"]["surfaces"]) == 6
    assert body["graph_persisted"] is False and len(calls) == 1
    after = snapshot(engine)
    assert before["products"] == after["products"]
    assert before["site_graphs"] == after["site_graphs"] == []
    assert json.loads(before["generated_sites"][0]["generated_config"])["catalog_items"] == json.loads(
        after["generated_sites"][0]["generated_config"])["catalog_items"]
    review = client.get(PATH + "/review", headers={"Authorization": "Bearer admin"})
    assert review.status_code == 200 and "Reviewed" in review.text
    assert review.headers["cache-control"] == "no-store"
    assert "script-src 'none'" in review.headers["content-security-policy"]
    with Session(engine) as session:
        product = session.get(Product, "projection-product")
        product.inventory += 1
        session.commit()
    assert client.get(PATH + "/review", headers={"Authorization": "Bearer admin"}).status_code == 409


def test_identity_mismatch_never_calls_provider(setup, monkeypatch):
    engine, client = setup
    before = snapshot(engine)
    monkeypatch.setattr(site_graph_llm, "generate_with_openai", lambda _: pytest.fail("Provider must not run"))
    payload = copy.deepcopy(PAYLOAD)
    payload["generation"]["products"][0]["name"] = "Invented tool"
    assert post(client, payload).status_code == 409
    assert snapshot(engine) == before


def test_provider_failure_sanitized_no_writes(setup, monkeypatch):
    engine, client = setup
    before = snapshot(engine)

    def unavailable(_):
        raise site_graph_llm.GenerationFailure("provider_unavailable", 503)

    monkeypatch.setattr(site_graph_llm, "generate_with_openai", unavailable)
    response = post(client)
    assert response.status_code == 503
    assert snapshot(engine) == before
    with Session(engine) as session:
        audit = list(session.scalars(select(AdminAuditEvent)))
        assert len(audit) == 1
        assert "private-contact" not in str(audit[0].__dict__)


def test_no_generation_of_contact_or_extra_embeds(setup, fast_validation, monkeypatch):
    engine, client = setup
    before = snapshot(engine)
    raw = json.loads(neutral_fallback(pilot.PilotRequest.model_validate(PAYLOAD).generation))
    raw["operations"].append({"op": "add_block", "block": {"block_id": "cart", "type": "cart_embed",
        "content": {"module": "shared-commerce-cart"}, "layout_variant": "default", "order_index": 3}})
    monkeypatch.setattr(site_graph_llm, "generate_with_openai", lambda _: json.dumps(raw))
    assert post(client).status_code == 409
    assert snapshot(engine) == before


def test_changed_snapshot_during_generation_rejected(setup, fast_validation, monkeypatch):
    engine, client = setup
    before = snapshot(engine)

    def provider(_):
        with Session(engine) as session:
            product = session.get(Product, "projection-product")
            product.inventory = 99
            session.commit()
        return neutral_fallback(pilot.PilotRequest.model_validate(PAYLOAD).generation)

    monkeypatch.setattr(site_graph_llm, "generate_with_openai", provider)
    assert post(client).status_code == 409
    after = snapshot(engine)
    for table in ("generated_sites", "site_graphs", "graph_presentation_receipts"):
        assert after[table] == before[table]


def test_retry_does_not_commit_before_atomic_persistence(setup, fast_validation, monkeypatch):
    engine, client = setup
    raw = neutral_fallback(pilot.PilotRequest.model_validate(PAYLOAD).generation)
    bad = json.loads(raw)
    bad["operations"][0]["block"]["content"]["headline"] = "Free shipping on every order"
    count = 0

    def provider(_):
        nonlocal count
        count += 1
        if count == 2:
            with Session(engine) as session:
                assert list(session.scalars(select(AdminAuditEvent))) == []
        return json.dumps(bad) if count == 1 else raw

    monkeypatch.setattr(site_graph_llm, "generate_with_openai", provider)
    response = post(client)
    assert response.status_code == 200, response.text
    assert response.json()["semantic_retries"] == 1
    with Session(engine) as session:
        assert len(list(session.scalars(select(AdminAuditEvent)))) == 2
