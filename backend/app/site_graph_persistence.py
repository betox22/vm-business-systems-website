"""Internal v1 unit of work. Graph proposals and commerce rows are never persisted here."""
import copy
import hashlib
import hmac
import json
import logging
import os
import time

from fastapi import HTTPException
from sqlalchemy import inspect, select, text
from sqlalchemy.orm import Session

from .admin_audit import record_admin_audit_event, stage_admin_audit_event
from .db_models import GeneratedSite
from .site_graph_document_validation import ROOT, DocumentIssue, DocumentRejected, read_presentation_authority
from .site_graph_models import GraphPresentationReceipt
from .site_graph_normalization import (
    CONTRACT, _canonical, _key, issue_graph_provenance, normalize_and_validate_graph_document,
    verify_graph_provenance,
)
from .site_graph_snapshot import storage_snapshot

MARKER = "_kreaton_graph_presentation"
logger = logging.getLogger(__name__)


def _reject(reason):
    raise DocumentRejected([DocumentIssue("persistence", "$", reason)])


def _require_internal(actor):
    if os.getenv("KREATON_AI_GRAPH_ENABLED") != "1":
        raise HTTPException(404, "Experimental graph unavailable")
    if actor.get("role") != "super_admin" or not actor.get("id"):
        raise HTTPException(403, "Only super_admin may persist experimental graphs")


def presentation_revision():
    # Hash a conservative superset of both renderers' transitive source dependencies.
    paths = set((ROOT / "src/ai-builder").rglob("*.js"))
    paths.update((ROOT / "scripts").glob("graph-*.mjs"))
    paths.update((ROOT / "backend/app").glob("site_graph_*.py"))
    paths.update(ROOT / name for name in (
        "site-viewer.js", "site.html", "shared-commerce-cart.js", "storefront-checkout.js",
        "storefront-checkout.css", "ai-builder.css", "package-lock.json",
    ))
    digest = hashlib.sha256()
    for path in sorted(paths):
        digest.update(path.relative_to(ROOT).as_posix().encode() + b"\0")
        digest.update(path.read_bytes())
        digest.update(b"\0")
    return digest.hexdigest()


def _critical_section(session, site_id):
    dialect = session.bind.dialect.name
    if dialect == "sqlite":
        session.execute(text("BEGIN IMMEDIATE"))
    elif dialect == "postgresql":
        session.execute(text("SET LOCAL lock_timeout = '5s'"))
    else:
        _reject("unsupported_transaction_dialect")
    site = session.scalar(select(GeneratedSite).where(GeneratedSite.id == site_id)
                          .with_for_update().execution_options(populate_existing=True))
    if site is None:
        _reject("site_missing")
    if dialect == "postgresql":
        # Lock site before Product, matching legacy save order. Existing commerce
        # writers do not share an advisory lock; SHARE also covers phantoms.
        # Chromium runs BEFORE this short critical section.
        session.execute(text("LOCK TABLE products IN SHARE MODE"))
    return site


def _receipt_fields(row):
    return {column.name: getattr(row, column.name) for column in row.__table__.columns if column.name != "signature"}


def _receipt_signature(fields):
    return hmac.new(_key(), b"kreaton-persisted-presentation-v1\0" + _canonical(fields), hashlib.sha256).hexdigest()


def _reject_audit(engine, actor, site_id, request_id, reason):
    try:
        with Session(engine) as audit_session:
            record_admin_audit_event(audit_session, actor=actor, action="admin.graph.presentation.rejected",
                target_type="generated_site", target_id=site_id, outcome="failure", request_id=request_id,
                metadata={"reason": reason, "contract": CONTRACT})
    except Exception:
        logger.error("graph_presentation_rejection_audit_unavailable")


def persist_v1_document(engine, *, site_id, schema, provenance, actor, request_id="", generation_metadata=None):
    _require_internal(actor)
    try:
        if MARKER in schema:
            _reject("reserved_presentation_metadata")
        revision = presentation_revision()
        with Session(engine, autoflush=False) as read_session:
            authority = read_presentation_authority(read_session, site_id, actor=actor, contact=schema.get("contact"))
        validated = normalize_and_validate_graph_document(schema, provenance, authority=authority)
        document = validated["document"]
        if presentation_revision() != revision:
            _reject("renderer_changed_during_validation")
        with Session(engine, autoflush=False, expire_on_commit=False) as session:
            try:
                site = _critical_section(session, site_id)
                fresh = read_presentation_authority(session, site_id, actor=actor, contact=document["contact"])
                verify_graph_provenance(document, provenance, authority=fresh)
                if presentation_revision() != revision:
                    _reject("renderer_changed_before_write")
                original = json.loads(site.generated_config)
                stored = copy.deepcopy(document)
                # Catalog JSON remains exactly as stored. The read projection is
                # reconstituted from Product, never synced back to commerce.
                stored["catalog_items"] = original["catalog_items"]
                stored[MARKER] = {"contract": CONTRACT}
                site.generated_config = json.dumps(stored, ensure_ascii=False, allow_nan=False)
                session.flush()
                row = session.get(GraphPresentationReceipt, site_id)
                if row is None:
                    row = GraphPresentationReceipt(site_id=site_id)
                    session.add(row)
                row.contract = CONTRACT
                row.document_sha256 = hashlib.sha256(_canonical(document)).hexdigest()
                row.snapshot_sha256 = storage_snapshot(session, site_id)
                row.renderer_revision = revision
                row.renderer_digest = validated["validation"]["rendererDigest"]
                row.validated_at = int(time.time())
                row.signature = _receipt_signature(_receipt_fields(row))
                stage_admin_audit_event(session, actor=actor, action="admin.graph.presentation.persisted",
                    target_type="generated_site", target_id=site_id, outcome="success", request_id=request_id,
                    metadata={"contract": CONTRACT, "rendererRevision": revision})
                if generation_metadata is not None:
                    stage_admin_audit_event(session, actor=actor, action="admin.graph.pilot.generated",
                        target_type="generated_site", target_id=site_id, outcome="success", request_id=request_id,
                        metadata=generation_metadata)
                session.flush()
                session.commit()
            except Exception:
                session.rollback()
                raise
        return {"site_id": site_id, "document": document, "validation": validated["validation"],
                "renderer_revision": revision, "graph_persisted": False}
    except Exception as error:
        reason = "validation_rejected" if isinstance(error, DocumentRejected) else "transaction_failed"
        _reject_audit(engine, actor, site_id, request_id, reason)
        if isinstance(error, DocumentRejected):
            raise
        _reject("transaction_failed")


def _materialized_document(session, site):
    schema = json.loads(site.generated_config)
    schema.pop(MARKER, None)
    authority = read_presentation_authority(session, site.id,
        actor={"id": "internal-presentation-reader", "role": "super_admin"}, contact=schema.get("contact"))
    schema["catalog_items"] = json.loads(authority.catalog_json)
    return schema


def read_validated_v1_document(engine, *, site_id, actor):
    """Read only a current certificate; never silently reapprove changed content."""
    _require_internal(actor)
    with Session(engine, autoflush=False) as session:
        site = _critical_section(session, site_id)
        receipt = session.get(GraphPresentationReceipt, site_id)
        if receipt is None or receipt.contract != CONTRACT:
            _reject("presentation_not_validated")
        if not hmac.compare_digest(receipt.signature, _receipt_signature(_receipt_fields(receipt))):
            _reject("invalid_presentation_receipt")
        if receipt.snapshot_sha256 != storage_snapshot(session, site_id):
            _reject("presentation_snapshot_changed")
        if receipt.renderer_revision != presentation_revision():
            _reject("presentation_renderer_changed")
        document = _materialized_document(session, site)
        if hashlib.sha256(_canonical(document)).hexdigest() != receipt.document_sha256:
            _reject("presentation_document_changed")
        return document


def revalidate_v1_document(engine, *, site_id, actor, request_id=""):
    _require_internal(actor)
    with Session(engine, autoflush=False) as session:
        site = session.get(GeneratedSite, site_id)
        if site is None or session.get(GraphPresentationReceipt, site_id) is None:
            _reject("presentation_not_validated")
        document = _materialized_document(session, site)
        authority = read_presentation_authority(session, site_id, actor=actor, contact=document["contact"])
        provenance = issue_graph_provenance(document, authority=authority)
    return persist_v1_document(engine, site_id=site_id, schema=document, provenance=provenance,
                               actor=actor, request_id=request_id)


def block_legacy_graph_access(site, session=None):
    """Deny-only guard: no JSON flag can authorize a legacy read or write."""
    try:
        marked = MARKER in json.loads(site.generated_config or "{}")
    except (ValueError, TypeError):
        marked = False
    registered = False
    if session is not None:
        with session.no_autoflush:
            connection = session.connection()
            if inspect(connection).has_table(GraphPresentationReceipt.__tablename__):
                registered = session.get(GraphPresentationReceipt, site.id) is not None
    if marked or registered:
        raise HTTPException(409, "Experimental presentation requires internal revalidation; legacy access is disabled.",
                            headers={"Cache-Control": "no-store"})
