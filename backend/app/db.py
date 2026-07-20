from __future__ import annotations

import os
from pathlib import Path
from typing import Iterator

from sqlalchemy import create_engine, inspect
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
    _ensure_additive_columns()


def _ensure_additive_columns() -> None:
    """Apply tiny additive migrations for existing SQLite/Render demo DBs.

    This project does not have Alembic wired yet. `create_all()` will not add
    columns to tables that already exist, so we handle the small nullable columns
    introduced while the prototype is still on SQLite. Managed Postgres should
    use a real migration before production.
    """

    if not DATABASE_URL.startswith("sqlite"):
        return

    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    migrations = {
        "stores": {
            "owner_user_id": "owner_user_id TEXT",
        },
        "generated_sites": {
            "owner_user_id": "owner_user_id TEXT",
        },
        "orders": {
            "items_json": "items_json TEXT DEFAULT '[]'",
            "shipping_address_json": "shipping_address_json TEXT DEFAULT '{}'",
            "customer_snapshot_json": "customer_snapshot_json TEXT DEFAULT '{}'",
            "payment_json": "payment_json TEXT DEFAULT '{}'",
            "inventory_restocked": "inventory_restocked BOOLEAN DEFAULT 0",
        },
    }

    with engine.begin() as connection:
        for table_name, columns in migrations.items():
            if table_name not in existing_tables:
                continue
            existing_columns = {column["name"] for column in inspector.get_columns(table_name)}
            for column_name, ddl in columns.items():
                if column_name not in existing_columns:
                    connection.exec_driver_sql(f"ALTER TABLE {table_name} ADD COLUMN {ddl}")


def get_session() -> Iterator[Session]:
    """FastAPI dependency: yields a session and guarantees it closes."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
