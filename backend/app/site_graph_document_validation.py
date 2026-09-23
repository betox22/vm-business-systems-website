"""Internal, fail-closed whole-document gate. No persistence or API exposure."""
import json
import os
import subprocess
import hashlib
from copy import deepcopy
from dataclasses import dataclass
from pathlib import Path

from .site_graph_claims import normalize, scan_claims
from .site_graph_contract import TrustContact
from .site_graph_snapshot import storage_snapshot

ROOT = Path(__file__).resolve().parents[2]
PRESENTATION_VERSION = "mega-retail-dom-v1"
REQUIRED_STATES = frozenset({
    "initial", "departments-open", "search-empty", "image-failed", "account-open", "account-saved",
    "lead-open", "lead-invalid", "lead-pending", "lead-error", "lead-sent", "cart-empty", "cart-added",
    "cart-full", "cart-increased", "cart-decreased", "checkout-open", "checkout-invalid",
    "checkout-pending", "checkout-error", "checkout-unavailable", "cart-removed",
})
# These legacy promises are not all matched by CLAIM_RULES_V1. Never silently bless them.
UNAPPROVED_SHELL = (
    "fast shipping", "reliable delivery", "easy returns", "simple exchanges",
    "secure payment", "protected checkout", "limited-time", "special offers",
    "envio rapido", "entrega confiable", "devoluciones faciles", "cambios y devoluciones",
    "pago seguro", "compra protegida", "tiempo limitado",
)


@dataclass(frozen=True)
class DocumentIssue:
    surface: str
    path: str
    rule: str


class DocumentRejected(ValueError):
    def __init__(self, issues):
        self.issues = tuple(issues)
        super().__init__("Whole presentation rejected")


_AUTHORITY_SEAL = object()


@dataclass(frozen=True)
class PresentationAuthority:
    site_id: str
    store_id: str
    catalog_json: str
    contact_json: str
    bindings_json: str
    snapshot_hash: str
    _seal: object


def read_presentation_authority(session, site_id, *, actor, contact):
    """Read-only evidence from Product rows and explicitly supplied manual contact, not candidate metadata."""
    from sqlalchemy import select
    from .db_models import GeneratedSite, Product
    from .catalog_sync import apply_commerce_overlay
    if actor.get("role") != "super_admin" or not actor.get("id"):
        raise DocumentRejected([DocumentIssue("authority", "$", "super_admin_required")])
    manual = TrustContact.model_validate(contact).model_dump(exclude_none=True)
    if session.new or session.dirty or session.deleted:
        raise DocumentRejected([DocumentIssue("authority", "$", "uncommitted_snapshot")])
    with session.no_autoflush:
        site = session.get(GeneratedSite, site_id)
        if site is None or not site.store_id:
            raise DocumentRejected([DocumentIssue("authority", "$", "missing_site_store")])
        stored = json.loads(site.generated_config)
        catalog = stored.get("catalog_items", [])
        # Commerce serves and charges USD today; JSON cannot supply arbitrary prose as a currency prefix.
        if not isinstance(catalog, list) or any(not isinstance(item, dict) or (item.get("currency") or "USD") != "USD" for item in catalog):
            raise DocumentRejected([DocumentIssue("authority", "$", "unsupported_product_currency")])
        products = list(session.scalars(select(Product).where(
            Product.site_id == site_id, Product.store_id == site.store_id, Product.status == "Published"
        ).order_by(Product.catalog_index)))
        if not 1 <= len(catalog) <= 12 or len(products) != len(catalog) or [p.catalog_index for p in products] != list(range(len(catalog))):
            raise DocumentRejected([DocumentIssue("authority", "$", "catalog_mapping")])
        if any(p.inventory < 0 or (p.quote_only and p.price_cents is not None) or
               (not p.quote_only and (p.price_cents is None or p.price_cents <= 0)) for p in products):
            raise DocumentRejected([DocumentIssue("authority", "$", "invalid_product")])
        catalog = apply_commerce_overlay(catalog, site, session)
        for item, product in zip(catalog, products):
            if (item.get("inventory_quantity") != product.inventory or
                item.get("name") != product.name or item.get("description") != product.description or
                (not product.quote_only and (item.get("product_id") != product.id or item.get("business_id") != site.store_id))):
                raise DocumentRejected([DocumentIssue("authority", "$", "overlay_binding_missing")])
        ids = [item.get("id") for item in catalog]
        if any(not isinstance(i, str) or not i for i in ids) or len(set(ids)) != len(ids):
            raise DocumentRejected([DocumentIssue("authority", "$", "catalog_identity")])
        bindings = {f"contact:{key}": {"value": value, "kind": "manual_contact"} for key, value in manual.items()}
        for item in catalog:
            for field, key in [("price", "price_label"), ("stock", "inventory_quantity")]:
                bindings[f'product:{item["id"]}:{field}'] = {"value": str(item[key]), "kind": "product"}
        catalog_json = json.dumps(catalog, sort_keys=True, ensure_ascii=False)
        contact_json = json.dumps(manual, sort_keys=True, ensure_ascii=False)
        digest = hashlib.sha256((storage_snapshot(session, site_id) + catalog_json + contact_json).encode()).hexdigest()
        return PresentationAuthority(site_id, site.store_id, catalog_json, contact_json,
                                     json.dumps(bindings, ensure_ascii=False), digest, _AUTHORITY_SEAL)


def _verify_candidate(schema, authority):
    if authority._seal is not _AUTHORITY_SEAL:
        raise DocumentRejected([DocumentIssue("authority", "$", "invalid_authority")])
    if schema.get("catalog_items") != json.loads(authority.catalog_json) or schema.get("contact") != json.loads(authority.contact_json):
        raise DocumentRejected([DocumentIssue("authority", "$", "readonly_data_changed")])
    pages = schema.get("pages", [])
    if len(pages) != 1 or pages[0].get("page_key") != "home":
        raise DocumentRejected([DocumentIssue("authority", "$", "home_required")])
    sections = pages[0].get("sections", [])
    body = [section for section in sections if section.get("type") != "composed"]
    shell = [section for section in sections if section.get("type") == "composed"]
    if sorted(section.get("type") for section in body) != ["Contact", "MarketplaceHero", "ProductGrid"]:
        raise DocumentRejected([DocumentIssue("authority", "$", "unsupported_sections")])
    if len(shell) != 2 or {section.get("section_id") for section in shell} != {"shared--header", "shared--footer"}:
        raise DocumentRejected([DocumentIssue("authority", "$", "unsupported_shell")])
    from .section_composition import ensure_shared_commerce_shell
    without_shell = deepcopy(schema)
    without_shell["pages"][0]["sections"] = body
    expected = ensure_shared_commerce_shell(without_shell)
    expected_shell = [section for section in expected["pages"][0]["sections"] if section.get("type") == "composed"]
    if shell != expected_shell:
        raise DocumentRejected([DocumentIssue("authority", "$", "shell_binding_mismatch")])
    if schema.get("business", {}).get("selectedLanguage") not in ("en", "es"):
        raise DocumentRejected([DocumentIssue("authority", "$", "unsupported_language")])
    if schema.get("global_components", {}).get("mega_retail_features", {}).get("newsletter") is not False:
        raise DocumentRejected([DocumentIssue("authority", "$", "newsletter_out_of_scope")])


def _check_projection(projection, authority=None):
    if projection.get("version") != PRESENTATION_VERSION:
        raise DocumentRejected([DocumentIssue("runtime", "$", "projection_version")])
    surfaces = projection.get("surfaces", [])
    expected = {(renderer, width) for renderer in ("builder", "public") for width in (1440, 390, 320)}
    actual = [(s.get("renderer"), s.get("viewport", {}).get("width")) for s in surfaces]
    if len(actual) != len(expected) or set(actual) != expected:
        raise DocumentRejected([DocumentIssue("runtime", "$", "projection_incomplete")])
    issues = set()
    bindings = json.loads(authority.bindings_json) if authority else {}
    for surface in surfaces:
        name = f'{surface["renderer"]}:{surface["viewport"]["width"]}'
        if authority:
            states = surface.get("states", [])
            names = [s.get("name") for s in states]
            expected_states = REQUIRED_STATES | {f'lead-product:{item["id"]}' for item in json.loads(authority.catalog_json)}
            if len(names) != len(expected_states) or set(names) != expected_states or any(not s.get("entries") or not s.get("html") for s in states):
                issues.add(DocumentIssue(name, "$", "interaction_coverage_incomplete"))
            if surface.get("schemaUnchanged") is not True:
                issues.add(DocumentIssue(name, "$", "renderer_mutated_document"))
        if not surface.get("entries") or not surface.get("html"):
            issues.add(DocumentIssue(name, "$", "empty_projection"))
        for violation in surface.get("violations", []):
            issues.add(DocumentIssue(name, violation["path"], violation["reason"]))
        for entry in surface.get("entries", []):
            value = entry["text"]
            if entry.get("segments"):
                prose = []
                for segment in entry["segments"]:
                    binding = segment.get("binding")
                    if binding:
                        expected_binding = bindings.get(binding)
                        if not expected_binding or segment["text"] != expected_binding["value"]:
                            issues.add(DocumentIssue(name, entry["path"], "invalid_typed_binding"))
                        prose.append(" ")
                    else:
                        prose.append(segment["text"])
                value = ("" if entry["kind"] == "subtree" else " ").join(prose)
            for claim in scan_claims(value, entry["path"]):
                issues.add(DocumentIssue(name, claim.path, claim.rule_id))
            if any(phrase in normalize(value) for phrase in UNAPPROVED_SHELL):
                issues.add(DocumentIssue(name, entry["path"], "unapproved_legacy_promise"))
    if issues:
        raise DocumentRejected(sorted(issues, key=lambda issue: (issue.surface, issue.path, issue.rule)))
    return projection


def validate_materialized_document(schema: dict, *, authority=None) -> dict:
    """Only renderer output generated server-side is eligible; never accept a client manifest."""
    try:
        if authority:
            _verify_candidate(schema, authority)
        request = {"schema": schema, "trusted": {"siteId": authority.site_id, "businessId": authority.store_id,
                   "snapshotHash": authority.snapshot_hash}} if authority else schema
        serialized = json.dumps(request, ensure_ascii=False, allow_nan=False)
        if len(serialized.encode("utf-8")) > 1_000_000:
            raise ValueError("document_too_large")
        result = subprocess.run(
            ["node", str(ROOT / "scripts" / "graph-presentation.mjs")],
            input=serialized, capture_output=True, encoding="utf-8", timeout=90,
            cwd=ROOT, check=True,
            env={key: value for key, value in os.environ.items() if key.upper() in {
                "PATH", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "TMPDIR", "HOME", "USERPROFILE",
                "LOCALAPPDATA", "PLAYWRIGHT_BROWSERS_PATH",
            }},
        )
        projection = json.loads(result.stdout)
    except DocumentRejected:
        raise
    except (OSError, ValueError, subprocess.SubprocessError):
        raise DocumentRejected([DocumentIssue("runtime", "$", "presentation_unavailable")]) from None
    result = _check_projection(projection, authority)
    return {**result, "accepted": True, "snapshotHash": authority.snapshot_hash if authority else None}
