"""Experimental admin-only graph operations, absent unless explicitly enabled."""
import base64
import hashlib

from typing import Any

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
from .site_graph_preview import render_graph


def create_graph_router(resolve_admin):
    router = APIRouter(include_in_schema=False)

    def identity(request: Request):
        return resolve_admin(request.headers.get("authorization", ""), request.cookies.get(ADMIN_SESSION_COOKIE_NAME, ""))

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
    def preview(site_id: Identifier, request: Request, actor=Depends(identity), session: Session = Depends(get_session)):
        require_admin_permission(actor, "sites:read")
        row = session.get(SiteGraphRow, site_id)
        if row is None:
            raise HTTPException(404, "Graph not found")
        html = render_graph(SiteGraph(site_id=site_id, version=row.version, blocks=row.blocks))
        css = html.split("<style>", 1)[1].split("</style>", 1)[0]
        style_hash = base64.b64encode(hashlib.sha256(css.encode()).digest()).decode()
        record_admin_audit_event(session, actor=actor, action="admin.graph.preview",
            target_type="site_graph", target_id=site_id, outcome="success",
            request_id=getattr(request.state, "request_id", ""))
        return HTMLResponse(html, headers={"Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow",
            "Content-Security-Policy": f"default-src 'none'; style-src 'sha256-{style_hash}'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"})

    return router
