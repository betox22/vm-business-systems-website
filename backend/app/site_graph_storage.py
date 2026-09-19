"""Opt-in additive storage. No existing table or client data is migrated."""
from sqlalchemy import text
from sqlalchemy.orm import Session

from .site_graph_models import GraphBase
from .site_graph_patterns import bootstrap_patterns


def init_graph_storage(engine):
    with engine.begin() as connection:
        GraphBase.metadata.create_all(connection)
        if connection.dialect.name == "postgresql":
            for table in ("site_graphs", "design_reference_patterns", "graph_presentation_receipts"):
                connection.execute(text(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY"))
                connection.execute(text(f"REVOKE ALL ON TABLE {table} FROM PUBLIC"))
                for role in ("anon", "authenticated"):
                    exists = connection.execute(text("SELECT 1 FROM pg_roles WHERE rolname=:role"), {"role": role}).scalar()
                    if exists:
                        connection.execute(text(f"REVOKE ALL ON TABLE {table} FROM {role}"))
        with Session(bind=connection) as session:
            bootstrap_patterns(session)
