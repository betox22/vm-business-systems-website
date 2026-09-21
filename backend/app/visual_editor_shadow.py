"""Version-one shadow contract. No renderer, public editor, or production migration."""

from __future__ import annotations

import hashlib
import json
import os
from copy import deepcopy
from typing import Literal
from uuid import UUID, uuid4

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field, StrictBool, StrictFloat, StrictInt, StrictStr, model_validator

from .catalog_sync import uses_catalog_identity


PILOT_TEMPLATES = frozenset({"corporate-company-pro", "mega-retail-store"})
Scalar = StrictStr | StrictBool | StrictInt | StrictFloat | None


def fingerprint(value) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"), allow_nan=False).encode()).hexdigest()


def staging_enabled() -> bool:
    return os.getenv("KREATON_VISUAL_EDITOR_SHADOW") == "1" and os.getenv("KREATON_ENVIRONMENT") in {"test", "staging"}


def require_staging() -> None:
    if not staging_enabled():
        raise HTTPException(409, "Shadow migration is restricted to explicitly enabled test/staging environments.")


class ContractModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class ResponsiveRule(ContractModel):
    columns: int | None = Field(default=None, ge=1, le=12)
    gap: int | None = Field(default=None, ge=0, le=160)
    width_percent: int | None = Field(default=None, ge=1, le=100)
    align: Literal["start", "center", "end", "stretch"] | None = None
    visible: bool | None = None


class Binding(ContractModel):
    source: Literal["document", "catalog"]
    entity_id: str
    field: str = Field(pattern=r"^[A-Za-z_][A-Za-z0-9_]*$")
    format: Literal["plain", "money"] = "plain"


class EditableNode(ContractModel):
    id: str
    type: Literal["page", "section", "container", "text", "image", "price", "link", "value"]
    component_version: Literal[1] = 1
    properties: dict[str, Scalar] = Field(default_factory=dict)
    children: list[str] = Field(default_factory=list)
    responsive: dict[Literal["mobile", "tablet", "desktop"], ResponsiveRule] = Field(default_factory=dict)
    bindings: dict[str, Binding] = Field(default_factory=dict)

    @model_validator(mode="after")
    def valid_properties(self):
        UUID(self.id)
        if set(self.properties) & set(self.bindings):
            raise ValueError("A property must have exactly one source: literal or binding.")
        allowed = {
            "page": {"label"}, "section": {"label"}, "container": {"label"},
            "text": {"value"}, "image": {"value", "alt"}, "price": {"value"},
            "link": {"value", "label"}, "value": {"value"},
        }[self.type]
        if not (set(self.properties) | set(self.bindings)) <= allowed:
            raise ValueError("Unsupported node property.")
        if self.type in {"text", "image", "link"} and "value" in self.properties and not isinstance(self.properties["value"], str):
            raise ValueError("Text/media/link properties require strings.")
        if self.type in {"image", "link"}:
            url = self.properties.get("value", "")
            if url and not url.startswith(("https://", "http://", "/", "#", "mailto:", "tel:")):
                raise ValueError("Unsafe URL protocol.")
        return self


class MigrationMetadata(ContractModel):
    version: Literal["editor_identity_v1"] = "editor_identity_v1"
    manifest_id: str
    source_hash: str = Field(pattern=r"^[0-9a-f]{64}$")
    # Only a frozen migration map. Never an edit selector or a source of runtime identity.
    legacy_paths: dict[str, str]


class ShadowDocument(ContractModel):
    schema_version: Literal[1] = 1
    document_id: str
    revision: int = Field(default=1, ge=1)
    mode: Literal["shadow"] = "shadow"
    roots: list[str]
    nodes: dict[str, EditableNode]
    migration: MigrationMetadata

    @model_validator(mode="after")
    def valid_graph(self):
        UUID(self.document_id)
        if not self.nodes or len(self.nodes) > 10000:
            raise ValueError("Invalid node count.")
        visited = set()

        def visit(uid, depth):
            if depth > 64 or uid in visited or uid not in self.nodes:
                raise ValueError("Missing node, cycle, multiple parents, or excessive depth.")
            visited.add(uid)
            node = self.nodes[uid]
            if uid != node.id:
                raise ValueError("Node key differs from persistent id.")
            for child in node.children:
                visit(child, depth + 1)

        for uid in self.roots:
            visit(uid, 0)
        if visited != set(self.nodes):
            raise ValueError("Unreachable nodes.")
        for node in self.nodes.values():
            for binding in node.bindings.values():
                UUID(binding.entity_id)
                if binding.source == "document":
                    target = self.nodes.get(binding.entity_id)
                    if target is None or binding.field not in target.properties:
                        raise ValueError("Document binding must resolve to a literal property.")
        if len(self.migration.legacy_paths) != len(self.nodes) or set(self.migration.legacy_paths.values()) != set(self.nodes):
            raise ValueError("Migration map does not cover the graph.")
        return self


def legacy_schema(schema):
    result = deepcopy(schema)
    result.pop("visual_editor", None)
    return result


def validate_shadow(schema) -> ShadowDocument:
    document = ShadowDocument.model_validate(schema["visual_editor"])
    if document.migration.source_hash != fingerprint(legacy_schema(schema)):
        raise ValueError("Shadow source changed. Review migration; positional remapping is forbidden.")
    items = schema.get("catalog_items", [])
    if not isinstance(items, list) or any(not isinstance(item, dict) for item in items):
        raise ValueError("Invalid catalog collection.")
    catalog = {}
    for item in items:
        uid = item.get("catalog_uid")
        if not isinstance(uid, str) or str(UUID(uid)) != uid or uid in catalog:
            raise ValueError("Catalog identity is missing, invalid, or duplicated.")
        catalog[uid] = item
    for node in document.nodes.values():
        for binding in node.bindings.values():
            if binding.source == "catalog":
                target = catalog.get(binding.entity_id)
                if target is None or binding.field not in target:
                    raise ValueError("Unresolved catalog binding.")
    return document


def build_shadow(schema: dict, template_id: str, manifest_id: str | None = None) -> dict:
    """Mirror serialized content in shadow; it does not claim coverage of renderer fallbacks."""
    if template_id not in PILOT_TEMPLATES:
        raise ValueError("Only the two pilot templates support shadow generation.")
    result = deepcopy(schema)
    if "visual_editor" in result:
        validate_shadow(result)
        return result
    nodes, paths, roots = {}, {}, []

    def visit(value, path, label, kind="container", catalog_uid=None, field=None):
        if len(nodes) >= 10000 or path.count("/") > 64:
            raise ValueError("Shadow source exceeds node/depth limits.")
        uid = str(uuid4())
        node = {"id": uid, "type": kind, "properties": {}, "children": [], "bindings": {}, "responsive": {}}
        nodes[uid], paths[path] = node, uid
        if isinstance(value, (dict, list)):
            node["properties"]["label"] = label
            entries = value.items() if isinstance(value, dict) else enumerate(value)
            for key, child in entries:
                if key == "catalog_uid":
                    continue
                segment = str(key).replace("~", "~0").replace("/", "~1")
                child_kind = "container"
                if path == "/pages":
                    child_kind = "page"
                elif path.endswith("/sections"):
                    child_kind = "section"
                child_uid = child.get("catalog_uid") if path == "/catalog_items" and isinstance(child, dict) else catalog_uid
                node["children"].append(visit(child, f"{path}/{segment}", str(key), child_kind, child_uid, str(key)))
        else:
            node["type"] = "text" if isinstance(value, str) else "value"
            if field in {"image_url", "logoUrl", "logo_url"} and isinstance(value, str):
                node["type"] = "image"
            elif field in {"price", "price_amount", "price_value"}:
                node["type"] = "price"
            elif field in {"href", "url"} and isinstance(value, str):
                node["type"] = "link"
            if catalog_uid and field in {"name", "description", "category", "image_url", "price", "price_amount", "price_value", "price_type", "price_label", "inventory_quantity"}:
                node["bindings"]["value"] = {"source": "catalog", "entity_id": catalog_uid, "field": field}
            else:
                node["properties"]["value"] = value
        return uid

    for key in ("pages", "navigation", "global_components", "brand", "theme", "contact", "catalog_items"):
        if key in result:
            roots.append(visit(result[key], f"/{key}", key))
    result["visual_editor"] = {
        "schema_version": 1, "document_id": str(uuid4()), "revision": 1, "mode": "shadow",
        "roots": roots, "nodes": nodes,
        "migration": {"version": "editor_identity_v1", "manifest_id": manifest_id or str(uuid4()),
                      "source_hash": fingerprint(schema), "legacy_paths": paths},
    }
    validate_shadow(result)
    return result


def maybe_add_shadow(schema: dict, template_id: str, *, new_site: bool = False) -> dict:
    if uses_catalog_identity(schema):
        require_staging()
        if template_id not in PILOT_TEMPLATES:
            raise HTTPException(422, "Shadow contract is restricted to pilot templates.")
        validate_shadow(schema)
    if new_site and "visual_editor" not in schema and staging_enabled() and template_id in PILOT_TEMPLATES:
        schema = deepcopy(schema)
        for item in schema.get("catalog_items", []):
            item["catalog_uid"] = str(uuid4())
        return build_shadow(schema, template_id)
    return schema


def require_preserved_shadow(previous: dict, incoming: dict) -> None:
    """Shadow is immutable until typed editor operations are implemented."""
    if uses_catalog_identity(previous) and incoming.get("visual_editor") != previous["visual_editor"]:
        raise HTTPException(409, "Reload before saving: shadow identity cannot be removed or replaced.")
