from __future__ import annotations

import os
from pathlib import Path
from typing import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

"""Shared SQLAlchemy engine/session setup.

This is the persistence seam referenced in `state_manager.py`. Ported from the
Codex `site-source` prototype's Drizzle schema (see docs/AGENT_LOG.md, entry
2026-07-18), adapted from D1/SQLite-over-Cloudflare to plain SQLite via
SQLAlchemy so it runs on the existing Render Python service without new
infrastructure.

Caveat: Render's free web service plan does not provide a persistent disk by
default, so the SQLite file can be wiped on redeploy/restart. This is fine for
now (still strictly better than the current in-memory-only state in
commerce.py, which resets on every restart), but if/when this matters, swap
DATABASE_URL to a managed Postgres instance -- no application code above the
engine needs to change.
"""

BACKEND_DIR = Path(__file__).resolve().parents[1]
DEFAULT_SQLITE_PATH = BACKEND_DIR / "lyra.db"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_SQLITE_PATH}")

_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=_connect_args, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


def init_db() -> None:
    """Create all tables that do not exist yet. Safe to call on every startup."""
    from . import db_models  # noqa: F401  (ensures models are registered on Base)

    Base.metadata.create_all(bind=engine)


def get_session() -> Iterator[Session]:
    """FastAPI dependency: yields a session and guarantees it closes."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
