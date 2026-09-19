"""Internal-only graph-to-legacy pilot. No commerce writes or graph persistence."""
import copy
import hashlib
import html
import json
from html.parser import HTMLParser

from fastapi import HTTPException
from sqlalchemy.orm import Session

from .db_models import GeneratedSite
from .site_graph_contract import StrictModel, TrustContact
from .site_graph_document_validation import (
    ROOT, DocumentIssue, DocumentRejected, read_presentation_authority, validate_materialized_document,
)
from .site_graph_generation import _generate_batch, build_generation_envelope
from .site_graph_generation_contract import BusinessGenerationRequest
from .site_graph_llm import GenerationFailure
from .site_graph_normalization import issue_graph_provenance
from .site_graph_persistence import (
    _reject_audit, _require_internal, persist_v1_document, read_validated_v1_document,
)


class PilotRequest(StrictModel):
    generation: BusinessGenerationRequest
    contact: TrustContact


def _reject(reason):
    raise DocumentRejected([DocumentIssue("pilot", "$", reason)])


def convert_proposal(batch, request, authority):
    blocks = [operation.block for operation in batch.operations]
    if [block.type for block in blocks] != ["hero", "product_grid", "footer"]:
        _reject("unsupported_pilot_blocks")
    hero, grid, footer = [block.content for block in blocks]
    es = request.generation.language == "es"
    return {
        "business": {"name": request.generation.business_name, "description": "",
                     "selectedLanguage": request.generation.language},
        "active_template": {"id": "mega-retail-store"},
        "theme": {"colors": {}, "fonts": {}}, "brand": {},
        "global_components": {"footer_text": footer["text"], "mega_retail_features": {"newsletter": False}},
        "navigation": [{"page_key": "home", "label": "Inicio" if es else "Home"}],
        "pages": [{"page_key": "home", "title": "Inicio" if es else "Home", "slug": "/", "order": 1,
                   "sections": [
                       {"id": "hero", "type": "MarketplaceHero", "order": 1, "editable": {
                           "headline": hero["headline"], "subtitle": hero["subheadline"],
                           "primary_button": "Explorar" if es else "Explore"}},
                       {"id": "catalog", "type": "ProductGrid", "order": 2, "editable": {
                           "title": grid["heading"], "text": grid["section_text"]}},
                       {"id": "contact", "type": "Contact", "order": 3, "editable": {
                           "title": "Contacto" if es else "Contact",
                           "text": "Habla con el equipo" if es else "Talk with the team"}},
                   ]}],
        "catalog_items": json.loads(authority.catalog_json),
        "contact": json.loads(authority.contact_json),
    }


def run_pilot(engine, *, site_id, request: PilotRequest, actor, request_id=""):
    _require_internal(actor)
    persistence_started = False
    try:
        with Session(engine, autoflush=False) as session:
            authority = read_presentation_authority(session, site_id, actor=actor,
                contact=request.contact.model_dump(exclude_none=True))
            site = session.get(GeneratedSite, site_id)
            if site.template_id != "mega-retail-store" or site.business_name != request.generation.business_name:
                _reject("business_identity_mismatch")
        catalog = json.loads(authority.catalog_json)
        declared = [(p.name, p.description or "") for p in request.generation.products]
        stored = [(p["name"], p.get("description") or "") for p in catalog]
        if declared != stored:
            _reject("readonly_product_identity_mismatch")
        envelope = build_generation_envelope(engine, request.generation)
        retry_events = []

        def collect_retry(_session, **event):
            retry_events.append(copy.deepcopy(event["metadata"]))

        # No Session, actor or contact is passed to the provider. The proposal
        # stays in memory; semantic retries cannot commit the caller's work.
        batch, outcome = _generate_batch(None, request.generation, envelope, site_id=site_id,
            actor=actor, request_id=request_id, retry_audit=collect_retry)
        document = convert_proposal(batch, request, authority)
        initial = validate_materialized_document(document, authority=authority)
        provenance = issue_graph_provenance(document, authority=authority)
        persistence_started = True
        result = persist_v1_document(engine, site_id=site_id, schema=document, provenance=provenance,
            actor=actor, request_id=request_id, generation_metadata={"generationOutcome": outcome,
                "semanticRetries": len(retry_events), "rule_ids": sorted({
                    rule for event in retry_events for rule in event["rule_ids"]})})
        result["document"] = read_validated_v1_document(engine, site_id=site_id, actor=actor)
        result["generation_outcome"] = outcome
        result["semantic_retries"] = len(retry_events)
        result["initial_accepted"] = initial["accepted"]
        return result
    except Exception as exc:
        if not persistence_started:
            _reject_audit(engine, actor, site_id, request_id,
                exc.code if isinstance(exc, GenerationFailure) else "pilot_rejected")
        if isinstance(exc, (DocumentRejected, GenerationFailure, HTTPException)):
            raise
        _reject("pilot_unavailable")


class _ShellStyles(HTMLParser):
    def __init__(self):
        super().__init__()
        self.inside = False
        self.styles = []

    def handle_starttag(self, tag, attrs):
        if tag == "style":
            self.inside = True

    def handle_endtag(self, tag):
        if tag == "style":
            self.inside = False

    def handle_data(self, data):
        if self.inside:
            self.styles.append(data)


def review_pilot(engine, *, site_id, actor):
    document = read_validated_v1_document(engine, site_id=site_id, actor=actor)
    with Session(engine, autoflush=False) as session:
        authority = read_presentation_authority(session, site_id, actor=actor, contact=document["contact"])
    validation = validate_materialized_document(document, authority=authority)
    # Refuse a stale response if Product, site or renderer changed while Chromium ran.
    current = read_validated_v1_document(engine, site_id=site_id, actor=actor)
    if current != document:
        _reject("presentation_changed_during_review")
    surface = next(s for s in validation["surfaces"] if s["renderer"] == "public" and s["viewport"]["width"] == 1440)
    parser = _ShellStyles()
    parser.feed((ROOT / "site.html").read_text(encoding="utf-8"))
    css = "\n".join((ROOT / name).read_text(encoding="utf-8") for name in
                    ("ai-builder.css", "storefront-checkout.css")) + "\n" + "\n".join(parser.styles)
    title = html.escape(document["business"]["name"], quote=True)
    page = (f'<!doctype html><html lang="{document["business"]["selectedLanguage"]}"><head>'
            f'<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            f'<title>{title} | Internal review</title><style>{css}</style></head>'
            f'<body><div id="projectionRoot">{surface["html"]}</div></body></html>')
    return page, hashlib.sha256(surface["html"].encode()).hexdigest()
