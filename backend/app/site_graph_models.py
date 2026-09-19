"""Separate metadata: importing contracts never migrates existing site tables."""
import time

from sqlalchemy import ARRAY, JSON, String, CheckConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class GraphBase(DeclarativeBase):
    pass


class SiteGraphRow(GraphBase):
    __tablename__ = "site_graphs"
    __table_args__ = (CheckConstraint("version >= 1", name="site_graph_version_positive"),)
    site_id: Mapped[str] = mapped_column(String(96), primary_key=True)
    version: Mapped[int] = mapped_column(default=1)
    blocks: Mapped[list] = mapped_column(JSON().with_variant(JSONB(), "postgresql"))
    created_at: Mapped[int] = mapped_column(default=lambda: int(time.time()))
    updated_at: Mapped[int] = mapped_column(default=lambda: int(time.time()))


class DesignReferencePattern(GraphBase):
    __tablename__ = "design_reference_patterns"
    pattern_id: Mapped[str] = mapped_column(String(96), primary_key=True)
    name: Mapped[str]
    industry_tags: Mapped[list] = mapped_column(JSON().with_variant(ARRAY(String()), "postgresql"))
    style_descriptor: Mapped[dict] = mapped_column(JSON().with_variant(JSONB(), "postgresql"))


class GraphPresentationReceipt(GraphBase):
    __tablename__ = "graph_presentation_receipts"
    site_id: Mapped[str] = mapped_column(String(96), primary_key=True)
    contract: Mapped[str]
    document_sha256: Mapped[str] = mapped_column(String(64))
    snapshot_sha256: Mapped[str] = mapped_column(String(64))
    renderer_revision: Mapped[str] = mapped_column(String(64))
    renderer_digest: Mapped[str] = mapped_column(String(64))
    signature: Mapped[str] = mapped_column(String(64))
    validated_at: Mapped[int]
