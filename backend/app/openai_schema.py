from __future__ import annotations

from copy import deepcopy
from typing import Any, Dict


def _allows_null(schema: Dict[str, Any]) -> bool:
    schema_type = schema.get("type")
    if schema_type == "null":
        return True
    if isinstance(schema_type, list) and "null" in schema_type:
        return True
    return any(
        isinstance(option, dict) and _allows_null(option)
        for keyword in ("anyOf", "oneOf")
        for option in schema.get(keyword, [])
    )


def _make_nullable(schema: Dict[str, Any]) -> Dict[str, Any]:
    if _allows_null(schema):
        return schema

    schema_type = schema.get("type")
    if isinstance(schema_type, str):
        schema["type"] = [schema_type, "null"]
        return schema
    if isinstance(schema_type, list):
        schema["type"] = [*schema_type, "null"]
        return schema

    wrapped = dict(schema)
    title = wrapped.pop("title", None)
    description = wrapped.pop("description", None)
    nullable: Dict[str, Any] = {"anyOf": [wrapped, {"type": "null"}]}
    if title is not None:
        nullable["title"] = title
    if description is not None:
        nullable["description"] = description
    return nullable


def make_openai_strict_schema(schema: Dict[str, Any]) -> Dict[str, Any]:
    """Convert Pydantic JSON Schema into OpenAI strict structured-output form."""

    normalized = deepcopy(schema)

    def visit(node: Any) -> Any:
        if isinstance(node, list):
            return [visit(item) for item in node]
        if not isinstance(node, dict):
            return node

        original_required = set(node.get("required", []))
        properties = node.get("properties")
        if isinstance(properties, dict):
            normalized_properties: Dict[str, Any] = {}
            for name, property_schema in properties.items():
                original_property = property_schema if isinstance(property_schema, dict) else {}
                normalized_property = visit(property_schema)
                if name not in original_required and _allows_null(original_property):
                    normalized_property = _make_nullable(normalized_property)
                normalized_properties[name] = normalized_property
            node["properties"] = normalized_properties
            node["required"] = list(normalized_properties)

        for key, value in list(node.items()):
            if key not in {"properties", "required"}:
                node[key] = visit(value)

        # Structured outputs always include every field, so defaults are neither
        # needed nor accepted by OpenAI's strict JSON Schema subset.
        node.pop("default", None)
        return node

    return visit(normalized)
