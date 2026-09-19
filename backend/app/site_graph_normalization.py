"""Internal normalization contract; no routes, persistence, or automatic provenance fallback."""
import hashlib
import hmac
import json
import os
import subprocess
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

from .site_graph_document_validation import (
    ROOT, DocumentIssue, DocumentRejected, _verify_candidate, validate_materialized_document,
)

CONTRACT = "kreaton.graph-pivot.v1"
KEY_ENV = "KREATON_GRAPH_PROVENANCE_KEY"


class GraphProvenanceV1(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    contract: Literal["kreaton.graph-pivot.v1"]
    version: Literal[1]
    site_id: str = Field(min_length=1, max_length=96)
    store_id: str = Field(min_length=1, max_length=96)
    template_id: Literal["mega-retail-store"]
    page_key: Literal["home"]
    snapshot_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    document_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    signature: str = Field(pattern=r"^[a-f0-9]{64}$")

    @field_validator("version", mode="before")
    @classmethod
    def strict_version(cls, value):
        if type(value) is not int or value != 1:
            raise ValueError("Unsupported provenance version")
        return value


def _reject(rule):
    raise DocumentRejected([DocumentIssue("normalization", "$", rule)])


def _canonical(value):
    # JSON numbers have no int/float distinction; JS serializes 25.0 as 25.
    def canonical_numbers(item):
        if isinstance(item, dict):
            return {k: canonical_numbers(v) for k, v in item.items()}
        if isinstance(item, list):
            return [canonical_numbers(v) for v in item]
        if type(item) in (int, float):
            if abs(item) > 2**53 - 1:
                raise ValueError("Number outside exact JS range")
            return int(item) if item == int(item) else item
        return item
    return json.dumps(canonical_numbers(value), ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False).encode("utf-8")


def _key():
    key = os.environ.get(KEY_ENV, "").encode("utf-8")
    if len(key) < 32:
        _reject("provenance_key_unconfigured")
    return key


def _signature(fields):
    return hmac.new(_key(), b"kreaton-normalization-provenance\0" + _canonical(fields), hashlib.sha256).hexdigest()


def _fields(schema, authority):
    _verify_candidate(schema, authority)
    if schema.get("active_template", {}).get("id") != "mega-retail-store":
        _reject("unsupported_template")
    encoded = _canonical(schema)
    if len(encoded) > 900_000:
        _reject("document_too_large")
    return dict(contract=CONTRACT, version=1, site_id=authority.site_id, store_id=authority.store_id,
                template_id="mega-retail-store", page_key="home", snapshot_sha256=authority.snapshot_hash,
                document_sha256=hashlib.sha256(encoded).hexdigest())


def issue_graph_provenance(schema, *, authority):
    """Attest internal origin, NOT claims acceptance. Validation after normalization is still mandatory."""
    fields = _fields(schema, authority)
    return GraphProvenanceV1(**fields, signature=_signature(fields)).model_dump()


def verify_graph_provenance(schema, provenance, *, authority):
    try:
        receipt = GraphProvenanceV1.model_validate(provenance)
        fields = receipt.model_dump(exclude={"signature"})
        if not hmac.compare_digest(receipt.signature, _signature(fields)):
            _reject("invalid_provenance_signature")
        if fields != _fields(schema, authority):
            _reject("provenance_document_or_snapshot_changed")
    except (ValidationError, TypeError, ValueError) as error:
        if isinstance(error, DocumentRejected):
            raise
        _reject("invalid_provenance_contract")
    return receipt


def normalize_and_validate_graph_document(schema, provenance, *, authority):
    receipt = verify_graph_provenance(schema, provenance, authority=authority)
    try:
        result = subprocess.run(["node", str(ROOT / "scripts/graph-normalization.mjs")],
            input=json.dumps({"schema": schema, "verifiedContract": receipt.contract}, ensure_ascii=False, allow_nan=False),
            capture_output=True, encoding="utf-8", timeout=90, cwd=ROOT, check=True,
            env={k: v for k, v in os.environ.items() if k.upper() in {
                "PATH", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "TMPDIR", "HOME", "USERPROFILE", "LOCALAPPDATA", "PLAYWRIGHT_BROWSERS_PATH",
            }})
        normalized = json.loads(result.stdout)
        document = normalized["document"]
        if _canonical(document) != _canonical(schema) or normalized.get("unchanged") is not True:
            _reject("normalization_changed_document")
        stages = [(s["round"], s["function"]) for s in normalized["trace"]]
        expected = [(round_, name) for round_ in (1, 2) for name in (
            "lockSchemaToExecutableTemplate", "enforceSelectedTemplateArchitecture", "applyDesignIntelligence", "prepareWebsiteConfig")]
        if stages != expected or not all(s.get("unchanged") is True for s in normalized["trace"]):
            _reject("normalization_incomplete")
    except DocumentRejected:
        raise
    except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError):
        _reject("normalization_unavailable")
    # Reuse the whole-document guard on the actual output, not on the input or a prior certificate.
    validation = validate_materialized_document(document, authority=authority)
    return {"document": document, "provenance": receipt.model_dump(), "normalization": normalized,
            "validation": validation, "accepted": True}
