from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from . import site_graph_patterns, site_graph_service, site_graph_llm
from .admin_audit import record_admin_audit_event
from .site_graph_contract import DesignPattern
from .site_graph_generation_contract import (
    BusinessGenerationRequest,
    GenerationInput,
    SemanticGenerationError,
    generation_contract,
    generation_scenario,
    validate_generated_batch,
    validate_generation_request,
)
from .site_graph_llm import GenerationFailure
from .site_graph_models import SiteGraphRow


def build_generation_envelope(engine, request: GenerationInput, retry_feedback=None) -> dict:
    with Session(bind=engine, autoflush=False) as read_session:
        if engine.dialect.name == "postgresql":
            read_session.execute(text("SET TRANSACTION READ ONLY"))
        patterns = site_graph_patterns.get_seed_patterns(request.industry_tag, read_session)
        validated = [DesignPattern.model_validate(p.model_dump()).model_dump(mode="json") for p in patterns]
    if not validated:
        raise GenerationFailure("no_matching_patterns", 422)
    return {
        "scenario": generation_scenario(request),
        "patterns": validated,
        "contract": generation_contract(retry_feedback),
    }


NEUTRAL_COPY = {
    ("en", "product"): ("Explore what we offer", "Thoughtfully presented options for everyday needs.", "Our selection", "Discover the available products.", "Find the option that suits you."),
    ("en", "commerce"): ("A simple way to browse", "See the products available from this business.", "Available products", "Browse the current selection.", "Choose what works for you."),
    ("en", "luxury"): ("A considered collection", "Explore a carefully presented selection.", "The collection", "Discover each available product.", "Explore at your own pace."),
    ("es", "product"): ("Descubrí lo que ofrecemos", "Opciones presentadas con claridad para necesidades cotidianas.", "Nuestra selección", "Conocé los productos disponibles.", "Encontrá la opción adecuada para vos."),
    ("es", "commerce"): ("Una forma simple de elegir", "Mirá los productos disponibles de este negocio.", "Productos disponibles", "Recorré la selección actual.", "Explorá la selección disponible."),
    ("es", "luxury"): ("Una colección cuidada", "Explorá una selección presentada con atención.", "La colección", "Descubrí cada producto disponible.", "Recorré la propuesta a tu ritmo."),
}


def neutral_fallback(request: BusinessGenerationRequest) -> str:
    import json
    headline, subheadline, heading, section_text, footer = NEUTRAL_COPY[(request.language, request.industry_tag)]

    def block(block_id, order, kind, content):
        return {"op": "add_block", "block": {"block_id": block_id, "type": kind,
                "order_index": order, "layout_variant": "default", "content": content}}

    description = "Conocé esta opción." if request.language == "es" else "Explore this option."
    items = [{"name": product.name, "description": description} for product in request.products]
    return json.dumps({"operations": [
        block("hero", 0, "hero", {"headline": headline, "subheadline": subheadline}),
        block("products", 1, "product_grid", {"heading": heading, "section_text": section_text, "items": items}),
        block("footer", 2, "footer", {"text": footer}),
    ]})


def _feedback(exc):
    if exc.findings:
        return [{"path": f.path, "rule_id": f.rule_id, "unsupported_claim": f.excerpt,
                 "instruction": "Remove this claim from creative prose. Facts authorize only exact mandatory product names, never prose."}
                for f in exc.findings[:10]]
    return [{"path": "$.operations[1].block.content.items", "rule_id": "product_identity",
             "unsupported_claim": "Product names do not match the request.",
             "instruction": "Use every supplied product name exactly once."}]


def _generate_batch(session, request, envelope, *, site_id, actor, request_id, retry_audit=None):
    raw = site_graph_llm.generate_with_openai(envelope)
    try:
        return validate_generated_batch(raw, request, site_id), "admin.graph.generated"
    except SemanticGenerationError as first:
        if not isinstance(request, BusinessGenerationRequest):
            raise GenerationFailure("invalid_generated_batch", 422) from first
        feedback = _feedback(first)
        (retry_audit or record_admin_audit_event)(
            session, actor=actor, action="admin.graph.generation_retry",
            target_type="site_graph", target_id=site_id, outcome="rejected",
            request_id=request_id,
            metadata={"reason": "semantic_policy", "policy": "CLAIM_RULES_V1",
                      "rule_ids": sorted({entry["rule_id"] for entry in feedback})},
        )
        retry_envelope = {**envelope, "contract": generation_contract(feedback)}
        # Provider exceptions intentionally bypass the neutral fallback.
        retry_raw = site_graph_llm.generate_with_openai(retry_envelope)
        try:
            return validate_generated_batch(retry_raw, request, site_id), "admin.graph.generated"
        except (ValueError, TypeError, RecursionError):
            try:
                batch = validate_generated_batch(neutral_fallback(request), request, site_id)
            except (ValueError, TypeError, RecursionError) as exc:
                raise GenerationFailure("invalid_neutral_fallback", 422) from exc
            return batch, "admin.graph.generated_neutral_fallback"
    except (ValueError, TypeError, RecursionError) as exc:
        raise GenerationFailure("invalid_generated_batch", 422) from exc


def generate_graph(session: Session, *, site_id: str, payload, actor: dict, request_id: str = ""):
    try:
        try:
            request = validate_generation_request(payload)
        except ValidationError as exc:
            raise GenerationFailure("invalid_generation_request", 422) from exc
        # Check identity only, never fetch existing blocks as LLM context.
        with Session(bind=session.get_bind(), autoflush=False) as lookup:
            if lookup.scalar(select(SiteGraphRow.site_id).where(SiteGraphRow.site_id == site_id)) is not None:
                raise GenerationFailure("graph_already_exists", 409)
        try:
            envelope = build_generation_envelope(session.get_bind(), request)
        except ValidationError as exc:
            raise GenerationFailure("invalid_design_pattern", 422) from exc
        batch, action = _generate_batch(session, request, envelope, site_id=site_id,
                                        actor=actor, request_id=request_id)
        return site_graph_service.persist_graph_batch(session, site_id=site_id, batch=batch,
            actor=actor, request_id=request_id, action=action)
    except (GenerationFailure, HTTPException) as exc:
        session.rollback()
        code = exc.code if isinstance(exc, GenerationFailure) else "graph_persistence_conflict"
        status = exc.status if isinstance(exc, GenerationFailure) else exc.status_code
        record_admin_audit_event(session, actor=actor, action="admin.graph.generation_rejected",
            target_type="site_graph", target_id=site_id, outcome="rejected", request_id=request_id,
            metadata={"reason": code})
        raise HTTPException(status, code) from None
