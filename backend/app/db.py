from __future__ import annotations

import os
from pathlib import Path
from typing import Iterator

from sqlalchemy import MetaData, Table, create_engine, inspect
from sqlalchemy.schema import CreateTable
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
    from .admin_audit import ensure_admin_audit_append_only

    Base.metadata.create_all(bind=engine)
    ensure_admin_audit_append_only(engine)
    _ensure_additive_columns()


def _ensure_additive_columns() -> None:
    """Apply tiny additive migrations for existing application databases.

    This project does not have Alembic wired yet. `create_all()` will not add
    columns to tables that already exist, so we handle the small nullable columns
    introduced while the prototype still has no Alembic migration pipeline.
    """

    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    migrations = {
        "stores": {"tax_rate_bps": "tax_rate_bps INTEGER NOT NULL DEFAULT 0"},
        "products": {
            "description": "description TEXT",
            "image_url": "image_url VARCHAR",
            "sku": "sku VARCHAR",
            "quote_only": "quote_only BOOLEAN NOT NULL DEFAULT FALSE",
            "source": "source VARCHAR NOT NULL DEFAULT 'owner_edited'",
            "site_id": "site_id VARCHAR REFERENCES generated_sites(id) ON DELETE SET NULL",
            "price_is_approximate": "price_is_approximate BOOLEAN NOT NULL DEFAULT FALSE",
            "catalog_index": "catalog_index INTEGER",
        },
        "platform_subscriptions": {
            "plan_id": "plan_id VARCHAR NOT NULL DEFAULT ''",
            "trial_end": "trial_end BIGINT",
            "manual_payment_reference": "manual_payment_reference VARCHAR",
            "legal_consent_version": "legal_consent_version VARCHAR",
            "legal_consent_language": "legal_consent_language VARCHAR",
            "legal_accepted_at": "legal_accepted_at BIGINT",
        },
    }
    if engine.dialect.name == "sqlite":
        migrations.update({
            "stores": {**migrations["stores"], "owner_user_id": "owner_user_id TEXT"},
            "generated_sites": {"owner_user_id": "owner_user_id TEXT"},
            "orders": {
                "items_json": "items_json TEXT DEFAULT '[]'",
                "shipping_address_json": "shipping_address_json TEXT DEFAULT '{}'",
                "customer_snapshot_json": "customer_snapshot_json TEXT DEFAULT '{}'",
                "payment_json": "payment_json TEXT DEFAULT '{}'",
                "inventory_restocked": "inventory_restocked BOOLEAN DEFAULT 0",
            },
        })

    with engine.begin() as connection:
        if engine.dialect.name == "postgresql":
            connection.exec_driver_sql("SET LOCAL lock_timeout = '5s'")
            # Serialize concurrent startup migrations, then inspect fresh state.
            connection.exec_driver_sql("SELECT pg_advisory_xact_lock(827361902)")
            inspector = inspect(connection)
        for table_name, columns in migrations.items():
            if table_name not in existing_tables:
                continue
            existing_columns = {column["name"] for column in inspector.get_columns(table_name)}
            for column_name, ddl in columns.items():
                if column_name not in existing_columns:
                    connection.exec_driver_sql(f"ALTER TABLE {table_name} ADD COLUMN {ddl}")
        if "products" in existing_tables and engine.dialect.name == "postgresql":
            price = next(c for c in inspect(connection).get_columns("products") if c["name"] == "price_cents")
            if not price["nullable"]:
                connection.exec_driver_sql("ALTER TABLE products ALTER COLUMN price_cents DROP NOT NULL")

    if "products" in existing_tables and engine.dialect.name == "sqlite":
        _ensure_sqlite_product_price_nullable()


def _ensure_sqlite_product_price_nullable() -> None:
    """SQLite cannot drop a column's NOT NULL constraint with ALTER COLUMN."""
    with engine.connect() as connection:
        price = next(c for c in inspect(connection).get_columns("products") if c["name"] == "price_cents")
        if price["nullable"]:
            return
        foreign_keys = connection.exec_driver_sql("PRAGMA foreign_keys").scalar()
        connection.commit()
        connection.exec_driver_sql("PRAGMA foreign_keys=OFF")
        connection.commit()
        try:
            connection.exec_driver_sql("BEGIN IMMEDIATE")
            columns = inspect(connection).get_columns("products")
            if next(c for c in columns if c["name"] == "price_cents")["nullable"]:
                connection.commit()
                return
            metadata = MetaData()
            original = Table("products", metadata, autoload_with=connection)
            replacement = original.to_metadata(metadata, name="products__nullable_price")
            replacement.c.price_cents.nullable = True
            # Preserve user-created indexes/triggers, including ones outside the ORM.
            auxiliary_sql = connection.exec_driver_sql(
                "SELECT sql FROM sqlite_master WHERE tbl_name='products' "
                "AND type IN ('index','trigger') AND sql IS NOT NULL"
            ).scalars().all()
            connection.execute(CreateTable(replacement))
            names = ", ".join(connection.dialect.identifier_preparer.quote(c.name) for c in original.columns)
            connection.exec_driver_sql(f"INSERT INTO products__nullable_price ({names}) SELECT {names} FROM products")
            connection.exec_driver_sql("DROP TABLE products")
            connection.exec_driver_sql("ALTER TABLE products__nullable_price RENAME TO products")
            for sql in auxiliary_sql:
                connection.exec_driver_sql(sql)
            if connection.exec_driver_sql("PRAGMA foreign_key_check").first():
                raise RuntimeError("Foreign key validation failed during products migration.")
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.exec_driver_sql(f"PRAGMA foreign_keys={int(foreign_keys)}")
            connection.commit()


def get_session() -> Iterator[Session]:
    """FastAPI dependency: yields a session and guarantees it closes."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
