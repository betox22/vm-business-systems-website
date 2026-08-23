from __future__ import annotations

import copy
import json
import os
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

from .models import SupportedLanguage
from .surgical_edit_policy import (
    detect_surgical_edit_intent,
    filter_operations_for_intent,
    synchronize_color_mirrors,
)

try:
    from openai import AsyncOpenAI
except Exception:  # pragma: no cover - dependency may be absent in local dev
    AsyncOpenAI = None  # type: ignore[assignment]


PatchOp = Literal["add", "replace", "remove"]


class SchemaPatchOperation(BaseModel):
    model_config = ConfigDict(extra="ignore")

    op: PatchOp
    path: str = Field(min_length=1, max_length=240)
    value: Any = None


class LyraSchemaPatch(BaseModel):
    model_config = ConfigDict(extra="ignore")

    patchSummary: str = ""
    changedFields: List[str] = Field(default_factory=list)
    operations: List[SchemaPatchOperation] = Field(default_factory=list)


class LyraEditEngine:
    """Targeted schema editor for already generated drafts.

    The engine asks the model for a partial patch only. It never accepts a full
    regenerated schema from the model, which reduces accidental layout churn.
    """

    ALLOWED_ROOTS = {
        "business",
        "brand",
        "theme",
        "navigation",
        "pages",
        "catalog_items",
        "products_services",
        "global_components",
        "contact",
        "quality_rules",
        "revision_history",
        "design_variants",
        "selected_template",
        "active_template",
        "layout_mode",
        "catalog_model",
    }

    def __init__(self) -> None:
        self.model = os.getenv("OPENAI_EDIT_MODEL") or os.getenv("OPENAI_MODEL") or "gpt-4o"
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.client = AsyncOpenAI(api_key=self.api_key) if AsyncOpenAI and self.api_key else None

    async def run(
        self,
        *,
        current_schema: Dict[str, Any],
        instruction: str,
        selected_language: SupportedLanguage = "en",
        user_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        if not current_schema:
            raise ValueError("currentSchema is required.")
        if not instruction.strip():
            raise ValueError("instruction is required.")
        if not self.client:
            raise RuntimeError("OPENAI_API_KEY missing or OpenAI SDK unavailable.")

        payload = {
            "instruction": instruction.strip()[:1800],
            "selectedLanguage": selected_language,
            "userContext": self._compact_context(user_context or {}),
            "currentSchema": self._compact_schema(current_schema),
            "patchRules": {
                "returnPatchOnly": True,
                "preserveUnrequestedFields": True,
                "maxOperations": 16,
                "allowedRootPaths": sorted(self.ALLOWED_ROOTS),
            },
        }
        edit_intent = detect_surgical_edit_intent(instruction, current_schema)
        payload["editIntent"] = edit_intent.as_dict()

        response = await self.client.chat.completions.create(
            model=self.model,
            temperature=0.1,
            messages=[
                {"role": "system", "content": self._system_prompt()},
                {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
            ],
            tools=[self._patch_tool()],
            tool_choice={"type": "function", "function": {"name": "apply_schema_patch"}},
        )
        tool_calls = response.choices[0].message.tool_calls or []
        if not tool_calls:
            raise RuntimeError("Lyra did not return apply_schema_patch.")

        raw_args = tool_calls[0].function.arguments or "{}"
        patch = LyraSchemaPatch.model_validate(json.loads(raw_args))
        root_safe_ops = [op for op in patch.operations[:16] if self._is_allowed_path(op.path)]
        safe_ops = filter_operations_for_intent(root_safe_ops, edit_intent)
        patched_schema = apply_patch_operations(current_schema, safe_ops)
        mirror_paths = synchronize_color_mirrors(current_schema, patched_schema, edit_intent)
        changed_paths = [op.path for op in safe_ops]
        changed_paths.extend(path for path in mirror_paths if path not in changed_paths)

        return {
            "patchedSchema": patched_schema,
            "patchOperations": [op.model_dump() for op in safe_ops],
            "patchSummary": patch.patchSummary,
            "changedFields": changed_paths,
            "editIntent": edit_intent.as_dict(),
            "usedAI": True,
        }

    def _is_allowed_path(self, path: str) -> bool:
        parts = json_pointer_parts(path)
        return bool(parts and parts[0] in self.ALLOWED_ROOTS)

    def _compact_context(self, context: Dict[str, Any]) -> Dict[str, Any]:
        allowed = {
            "businessName",
            "businessDescription",
            "industry",
            "servicesProducts",
            "preferredTone",
            "preferredColors",
            "selectedTemplateId",
            "catalogType",
            "salesFlow",
        }
        return {key: value for key, value in context.items() if key in allowed}

    def _compact_schema(self, schema: Dict[str, Any]) -> Dict[str, Any]:
        """Keep enough context for targeted edits without huge payloads."""
        compact = copy.deepcopy(schema)
        if isinstance(compact.get("revision_history"), list):
            compact["revision_history"] = compact["revision_history"][-4:]
        if isinstance(compact.get("catalog_items"), list):
            compact["catalog_items"] = compact["catalog_items"][:24]
        if isinstance(compact.get("pages"), list):
            for page in compact["pages"]:
                if isinstance(page, dict) and isinstance(page.get("sections"), list):
                    page["sections"] = page["sections"][:12]
        return compact

    @staticmethod
    def _patch_tool() -> Dict[str, Any]:
        return {
            "type": "function",
            "function": {
                "name": "apply_schema_patch",
                "description": "Return only targeted JSON Patch-like operations for a generated website schema.",
                "parameters": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "patchSummary": {"type": "string"},
                        "changedFields": {
                            "type": "array",
                            "items": {"type": "string"},
                        },
                        "operations": {
                            "type": "array",
                            "maxItems": 16,
                            "items": {
                                "type": "object",
                                "additionalProperties": False,
                                "properties": {
                                    "op": {"type": "string", "enum": ["add", "replace", "remove"]},
                                    "path": {"type": "string"},
                                    "value": {
                                        "anyOf": [
                                            {"type": "string"},
                                            {"type": "number"},
                                            {"type": "boolean"},
                                            {"type": "array"},
                                            {"type": "object"},
                                            {"type": "null"},
                                        ]
                                    },
                                },
                                "required": ["op", "path", "value"],
                            },
                        },
                    },
                    "required": ["patchSummary", "changedFields", "operations"],
                },
            },
        }

    @staticmethod
    def _system_prompt() -> str:
        return """
You are Lyra, KREATON's senior website editor.

You receive an existing generated website JSON schema and one user instruction.
Your job is to patch only the requested parts.

Rules:
1. Return only apply_schema_patch tool output. Never return a full schema.
2. Preserve the selected template, layout, page order, unrelated sections, catalog items, business data, and language unless the user explicitly asks to change that exact thing.
3. Obey editIntent exactly. It is an authoritative allowlist, not a suggestion.
4. If the user asks for colors, patch only the requested theme/brand color field.
5. If the user asks for section copy, patch only the targeted section and requested text field.
6. If the user asks about one product, patch only the matching catalog item and requested product field.
7. If the user asks for an image, patch only the targeted section or product image field.
8. If the user asks to fix overlap, clipping, mobile layout, or visual safety, patch section settings only. Do not rewrite unrelated copy.
9. If editIntent is unknown or has no target, return no operations and explain what must be clarified in patchSummary.
10. patchSummary must be in selectedLanguage.
11. Use JSON Pointer paths such as /theme/colors/accent, /pages/0/sections/0/editable/headline, /catalog_items/0/name.
""".strip()


def apply_patch_operations(schema: Dict[str, Any], operations: List[SchemaPatchOperation]) -> Dict[str, Any]:
    next_schema = copy.deepcopy(schema)
    if not operations:
        return next_schema
    for operation in operations:
        try:
            apply_single_operation(next_schema, operation)
        except (KeyError, IndexError, TypeError, ValueError):
            continue
    history = next_schema.get("revision_history")
    if not isinstance(history, list):
        history = []
    history.append(
        {
            "source": "lyra_edit_patch",
            "changed_fields": [op.path for op in operations],
        }
    )
    next_schema["revision_history"] = history[-12:]
    return next_schema


def apply_single_operation(target: Dict[str, Any], operation: SchemaPatchOperation) -> None:
    parts = json_pointer_parts(operation.path)
    if not parts:
        raise ValueError("Empty patch path.")
    parent = target
    for part in parts[:-1]:
        parent = resolve_child(parent, part)
    final = parts[-1]

    if isinstance(parent, list):
        if final == "-":
            if operation.op == "add":
                parent.append(operation.value)
                return
            raise ValueError("Only add supports '-' list path.")
        index = int(final)
        if operation.op == "remove":
            parent.pop(index)
        elif operation.op == "add":
            parent.insert(index, operation.value)
        else:
            parent[index] = operation.value
        return

    if not isinstance(parent, dict):
        raise TypeError("Patch parent must be object or array.")
    if operation.op == "remove":
        parent.pop(final, None)
    else:
        parent[final] = operation.value


def resolve_child(parent: Any, part: str) -> Any:
    if isinstance(parent, list):
        return parent[int(part)]
    if isinstance(parent, dict):
        return parent[part]
    raise TypeError("Cannot resolve child.")


def json_pointer_parts(path: str) -> List[str]:
    if not path.startswith("/"):
        return []
    return [part.replace("~1", "/").replace("~0", "~") for part in path.split("/")[1:]]
