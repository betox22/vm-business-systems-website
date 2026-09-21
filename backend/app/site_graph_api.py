"""Experimental admin-only graph operations, absent unless explicitly enabled."""
import base64
import hashlib

from typing import Any, Literal

from fastapi import APIRouter, Body, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from .admin_auth import ADMIN_SESSION_COOKIE_NAME, require_admin_permission
from .admin_audit import record_admin_audit_event
from .db import get_session
from .site_graph_contract import Identifier, OperationsRequest, SiteGraph
from . import site_graph_service
from .site_graph_generation import generate_graph
from .site_graph_models import SiteGraphRow
from .site_graph_preview import VISUAL_RESOURCE_PATTERNS, VisualPattern, render_graph
from .site_graph_pilot import PilotRequest, review_pilot, run_pilot
from .site_graph_document_validation import DocumentRejected
from .site_graph_llm import GenerationFailure
from .site_graph_persistence import _require_internal


def create_graph_router(resolve_admin):
    router = APIRouter(include_in_schema=False)

    def identity(request: Request):
        return resolve_admin(request.headers.get("authorization", ""), request.cookies.get(ADMIN_SESSION_COOKIE_NAME, ""))

    def pilot_identity(request: Request):
        # Check the flag on every request as well as at router registration.
        import os
        if os.getenv("KREATON_AI_GRAPH_ENABLED") != "1":
            raise HTTPException(404, "Experimental graph unavailable")
        actor = identity(request)
        _require_internal(actor)
        return actor

    @router.post("/api/admin/internal/graph-pilot/{site_id}/generate")
    def pilot_generate(site_id: Identifier, payload: PilotRequest, request: Request,
                       actor=Depends(pilot_identity), session: Session = Depends(get_session)):
        from fastapi.responses import JSONResponse
        try:
            result = run_pilot(session.get_bind(), site_id=site_id, request=payload, actor=actor,
                request_id=getattr(request.state, "request_id", ""))
        except GenerationFailure as exc:
            raise HTTPException(exc.status, exc.code, headers={"Cache-Control": "no-store"}) from None
        except DocumentRejected:
            raise HTTPException(409, "Internal document rejected", headers={"Cache-Control": "no-store"}) from None
        return JSONResponse({key: value for key, value in result.items() if key != "validation"} | {
            "validation": {"accepted": result["validation"]["accepted"],
                "rendererDigest": result["validation"]["rendererDigest"],
                "surfaces": [{"renderer": s["renderer"], "viewport": s["viewport"],
                    "states": len(s.get("states", []))} for s in result["validation"]["surfaces"]]},
            "review_url": f"/api/admin/internal/graph-pilot/{site_id}/review",
        }, headers={"Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow"})

    @router.get("/api/admin/internal/graph-pilot/{site_id}/review", response_class=HTMLResponse)
    def pilot_review(site_id: Identifier, actor=Depends(pilot_identity), session: Session = Depends(get_session)):
        try:
            page, digest = review_pilot(session.get_bind(), site_id=site_id, actor=actor)
        except DocumentRejected:
            raise HTTPException(409, "Internal document requires revalidation", headers={"Cache-Control": "no-store"}) from None
        return HTMLResponse(page, headers={"Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow",
            "X-Graph-Projection-SHA256": digest,
            "Content-Security-Policy": "default-src 'none'; script-src 'none'; connect-src 'none'; "
                "style-src 'unsafe-inline'; img-src 'none'; font-src 'none'; form-action 'none'; "
                "base-uri 'none'; frame-ancestors 'none'"})

    @router.post("/api/v1/sites/{site_id}/graph/operations", response_model=SiteGraph)
    def operations(site_id: Identifier, batch: OperationsRequest, request: Request,
                   actor=Depends(identity), session: Session = Depends(get_session)):
        if actor.get("role") != "super_admin":
            raise HTTPException(403, "Only super_admin may edit experimental graphs")
        return site_graph_service.persist_graph_batch(session, site_id=site_id, batch=batch,
            actor=actor, request_id=getattr(request.state, "request_id", ""))

    @router.post("/api/v1/sites/{site_id}/graph/generate", response_model=SiteGraph)
    def generate(site_id: Identifier, request: Request, payload: Any = Body(...),
                 actor=Depends(identity), session: Session = Depends(get_session)):
        if actor.get("role") != "super_admin":
            raise HTTPException(403, "Only super_admin may generate experimental graphs")
        return generate_graph(session, site_id=site_id, payload=payload, actor=actor,
                              request_id=getattr(request.state, "request_id", ""))

    @router.get("/api/admin/internal/graph-preview", response_class=HTMLResponse)
    def preview(site_id: Identifier, request: Request, actor=Depends(identity), session: Session = Depends(get_session),
                pattern: VisualPattern | None = None, fixture: Literal["hardware_qa", "objects_qa"] | None = None):
        require_admin_permission(actor, "sites:read")
        is_visual = pattern in VISUAL_RESOURCE_PATTERNS
        if is_visual and actor.get("role") != "super_admin":
            raise HTTPException(403, "Only super_admin may view visual previews")
        if fixture is not None and pattern is None:
            raise HTTPException(422, "A fixture requires an explicit pattern")
        row = session.get(SiteGraphRow, site_id)
        if row is None:
            raise HTTPException(404, "Graph not found")
        try:
            html = render_graph(SiteGraph(site_id=site_id, version=row.version, blocks=row.blocks), pattern, fixture)
        except ValueError:
            raise HTTPException(422, "Graph does not match the requested preview fixture") from None
        css = html.split("<style>", 1)[1].split("</style>", 1)[0]
        style_hash = base64.b64encode(hashlib.sha256(css.encode()).digest()).decode()
        record_admin_audit_event(session, actor=actor, action="admin.graph.preview",
            target_type="site_graph", target_id=site_id, outcome="success",
            request_id=getattr(request.state, "request_id", ""))
        asset_policy = "; img-src data:; font-src data:" if is_visual else ""
        return HTMLResponse(html, headers={"Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow",
            "Content-Security-Policy": f"default-src 'none'; style-src 'sha256-{style_hash}'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'" + asset_policy})

    return router
