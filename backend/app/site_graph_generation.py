from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from . import site_graph_patterns, site_graph_service, site_graph_llm
from .admin_audit import record_admin_audit_event
from .site_graph_contract import DesignPattern
from .site_graph_generation_contract import GenerationRequest, generation_contract, synthetic_scenario, validate_generated_batch
from .site_graph_llm import GenerationFailure
from .site_graph_models import SiteGraphRow


def build_generation_envelope(engine, request: GenerationRequest) -> dict:
    with Session(bind=engine, autoflush=False) as read_session:
        if engine.dialect.name == "postgresql":
            read_session.execute(text("SET TRANSACTION READ ONLY"))
        patterns = site_graph_patterns.get_seed_patterns(request.industry_tag, read_session)
        validated = [DesignPattern.model_validate(p.model_dump()).model_dump(mode="json") for p in patterns]
    if not validated:
        raise GenerationFailure("no_matching_patterns", 422)
    return {"scenario": synthetic_scenario(request), "patterns": validated, "contract": generation_contract()}


def generate_graph(session: Session, *, site_id: str, payload, actor: dict, request_id: str = ""):
    try:
        try:
            request = GenerationRequest.model_validate(payload)
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
        raw = site_graph_llm.generate_with_openai(envelope)
        try:
            batch = validate_generated_batch(raw, request, site_id)
        except (ValueError, TypeError, RecursionError) as exc:
            raise GenerationFailure("invalid_generated_batch", 422) from exc
        return site_graph_service.persist_graph_batch(session, site_id=site_id, batch=batch,
            actor=actor, request_id=request_id, action="admin.graph.generated")
    except (GenerationFailure, HTTPException) as exc:
        session.rollback()
        code = exc.code if isinstance(exc, GenerationFailure) else "graph_persistence_conflict"
        status = exc.status if isinstance(exc, GenerationFailure) else exc.status_code
        record_admin_audit_event(session, actor=actor, action="admin.graph.generation_rejected",
            target_type="site_graph", target_id=site_id, outcome="rejected", request_id=request_id,
            metadata={"reason": code})
        raise HTTPException(status, code) from None
