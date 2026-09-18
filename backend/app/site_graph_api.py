"""Experimental admin-only graph operations, absent unless explicitly enabled."""
import time
import base64
import hashlib

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from sqlalchemy import update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .admin_auth import ADMIN_SESSION_COOKIE_NAME, require_admin_permission
from .admin_audit import record_admin_audit_event
from .db import get_session
from .site_graph_contract import Identifier, OperationsRequest, SiteGraph, apply_operations
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
        row = session.get(SiteGraphRow, site_id)
        version = row.version if row else 0
        if version != batch.expected_version:
            raise HTTPException(409, "Graph version conflict")
        graph = SiteGraph(site_id=site_id, version=version, blocks=row.blocks if row else [])
        try:
            result = apply_operations(graph, batch)
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc
        blocks = [block.model_dump() for block in result.blocks]
        try:
            if row is None:
                session.add(SiteGraphRow(site_id=site_id, version=result.version, blocks=blocks))
                session.flush()
            else:
                changed = session.execute(update(SiteGraphRow).where(
                    SiteGraphRow.site_id == site_id, SiteGraphRow.version == batch.expected_version
                ).values(version=result.version, blocks=blocks, updated_at=int(time.time())))
                if changed.rowcount != 1:
                    session.rollback()
                    raise HTTPException(409, "Graph version conflict")
            # Existing audit helper commits both this mutation and its event atomically.
            record_admin_audit_event(session, actor=actor, action="admin.graph.operations",
                target_type="site_graph", target_id=site_id, outcome="success",
                request_id=getattr(request.state, "request_id", ""),
                metadata={"version": result.version, "count": len(batch.operations)})
        except IntegrityError as exc:
            session.rollback()
            raise HTTPException(409, "Graph creation conflict") from exc
        except Exception:
            session.rollback()
            raise
        return result

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
