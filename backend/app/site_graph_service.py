import time

from fastapi import HTTPException
from sqlalchemy import update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .admin_audit import record_admin_audit_event
from .site_graph_contract import OperationsRequest, SiteGraph, apply_operations
from .site_graph_models import SiteGraphRow


def persist_graph_batch(session: Session, *, site_id: str, batch: OperationsRequest,
                        actor: dict, request_id: str = "",
                        action: str = "admin.graph.operations") -> SiteGraph:
    row = session.get(SiteGraphRow, site_id)
    version = row.version if row else 0
    if version != batch.expected_version:
        raise HTTPException(409, "Graph version conflict")
    graph = SiteGraph(site_id=site_id, version=version, blocks=row.blocks if row else [])
    try:
        result = apply_operations(graph, batch)
    except ValueError as exc:
        raise HTTPException(422, "Invalid graph operations") from exc
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
        # The existing audit helper commits the mutation and event together.
        record_admin_audit_event(session, actor=actor, action=action,
            target_type="site_graph", target_id=site_id, outcome="success",
            request_id=request_id, metadata={"version": result.version, "count": len(batch.operations)})
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(409, "Graph creation conflict") from exc
    except Exception:
        session.rollback()
        raise
    return result
