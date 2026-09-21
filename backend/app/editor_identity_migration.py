"""Explicit staging-only identity migration. Planning never writes; caller owns transactions."""

import json
from copy import deepcopy
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import select

from .db_models import GeneratedSite, Product
from .visual_editor_shadow import PILOT_TEMPLATES, build_shadow, fingerprint, require_staging, validate_shadow


def product_snapshot(products):
    return [{column.name: getattr(p, column.name) for column in Product.__table__.columns}
            for p in sorted(products, key=lambda p: p.id)]


def _read(session, site_id, lock=False):
    query = select(GeneratedSite).where(GeneratedSite.id == site_id)
    site = session.scalar(query.with_for_update() if lock else query)
    if site is None or site.template_id not in PILOT_TEMPLATES:
        raise HTTPException(409, "Identity migration supports only existing pilot sites.")
    query = select(Product).where(Product.site_id == site.id).order_by(Product.id)
    products = list(session.scalars(query.with_for_update() if lock else query))
    if any(p.store_id != site.store_id for p in products):
        raise HTTPException(409, "Cross-store product association.")
    return site, products


def plan_identity_migration(session, site_id):
    require_staging()
    with session.no_autoflush:
        site, products = _read(session, site_id)
        schema = json.loads(site.generated_config)
        if "visual_editor" in schema:
            validate_shadow(schema)
            return {"version": "editor_identity_v1", "site_id": site.id, "status": "already_shadow"}
        catalog = schema.get("catalog_items", [])
        if not isinstance(catalog, list):
            raise HTTPException(422, "Catalog must be a list.")
        candidates = [p for p in products if p.status == "Published"]
        blockers, assignments = [], []
        if len(candidates) != len(catalog):
            blockers.append("Published product count differs from catalog; manual review required.")
        for index, item in enumerate(catalog):
            matches = [p for p in candidates if p.catalog_index == index]
            if len(matches) != 1 or not isinstance(item, dict):
                blockers.append(f"Index {index}: missing or ambiguous Product.")
                continue
            product = matches[0]
            # Evidence for a candidate, not name-based matching. Owner-modified rows need separate review.
            if product.source != "ai_generated":
                blockers.append(f"Index {index}: owner-edited Product requires explicit review.")
                continue
            if any(getattr(product, field) != item.get(field) for field in ("name", "category", "description", "image_url", "sku")):
                blockers.append(f"Index {index}: source metadata differs; historical ordering is unproven.")
                continue
            if item.get("catalog_uid") and item["catalog_uid"] != product.catalog_uid:
                blockers.append(f"Index {index}: conflicting identity.")
                continue
            assignments.append({"catalog_index": index, "product_id": product.id,
                                "catalog_uid": product.catalog_uid or str(uuid4())})
        if any(p.catalog_uid is None and p not in candidates for p in products):
            blockers.append("Unidentified historical rows require separate review before sync can resume.")
        manifest = {
            "version": "editor_identity_v1", "manifest_id": str(uuid4()), "site_id": site.id,
            "store_id": site.store_id, "template_id": site.template_id,
            "status": "blocked" if blockers else "review_required", "blockers": blockers,
            "before_config": site.generated_config, "config_hash": fingerprint(site.generated_config),
            "before_products": product_snapshot(products), "products_hash": fingerprint(product_snapshot(products)),
            "assignments": assignments,
        }
        if not blockers:
            proposed = deepcopy(schema)
            for assignment in assignments:
                proposed["catalog_items"][assignment["catalog_index"]]["catalog_uid"] = assignment["catalog_uid"]
            manifest["after_config"] = json.dumps(build_shadow(proposed, site.template_id, manifest["manifest_id"]), ensure_ascii=False)
            after_products = deepcopy(manifest["before_products"])
            for assignment in assignments:
                next(p for p in after_products if p["id"] == assignment["product_id"])["catalog_uid"] = assignment["catalog_uid"]
            manifest["after_products_hash"] = fingerprint(after_products)
            manifest["after_config_hash"] = fingerprint(manifest["after_config"])
        return manifest


def apply_identity_migration(session, manifest, *, approved=False):
    require_staging()
    if not approved or manifest.get("version") != "editor_identity_v1" or manifest.get("status") != "review_required":
        raise HTTPException(409, "An explicitly approved, unblocked manifest is required.")
    site, products = _read(session, manifest["site_id"], lock=True)
    if site.store_id != manifest["store_id"] or site.template_id != manifest["template_id"]:
        raise HTTPException(409, "Site ownership/template changed since dry-run.")
    current_hashes = (fingerprint(site.generated_config), fingerprint(product_snapshot(products)))
    if current_hashes == (manifest["after_config_hash"], manifest["after_products_hash"]):
        return "already_applied"
    if current_hashes != (manifest["config_hash"], manifest["products_hash"]):
        raise HTTPException(409, "Site or commerce data changed since dry-run; nothing applied.")
    after = json.loads(manifest["after_config"])
    validate_shadow(after)
    # Enforce identity-only changes even if a manifest was edited after review.
    stripped = deepcopy(after)
    stripped.pop("visual_editor")
    before = json.loads(manifest["before_config"])
    for item, old in zip(stripped.get("catalog_items", []), before.get("catalog_items", [])):
        if "catalog_uid" not in old:
            item.pop("catalog_uid", None)
    if stripped != before or fingerprint(manifest["after_config"]) != manifest["after_config_hash"]:
        raise HTTPException(409, "Manifest contains non-identity changes.")
    proposed_products = deepcopy(product_snapshot(products))
    selected = set()
    for assignment in manifest["assignments"]:
        product = next((p for p in products if p.id == assignment["product_id"]), None)
        if product is None or product.id in selected or product.catalog_index != assignment["catalog_index"]:
            raise HTTPException(409, "Invalid identity assignment.")
        selected.add(product.id)
        item = after["catalog_items"][assignment["catalog_index"]]
        if item["catalog_uid"] != assignment["catalog_uid"]:
            raise HTTPException(409, "Manifest binding differs from schema.")
        next(p for p in proposed_products if p["id"] == product.id)["catalog_uid"] = assignment["catalog_uid"]
    if fingerprint(proposed_products) != manifest["after_products_hash"]:
        raise HTTPException(409, "Product manifest hash differs.")
    for assignment in manifest["assignments"]:
        next(p for p in products if p.id == assignment["product_id"]).catalog_uid = assignment["catalog_uid"]
    site.generated_config = manifest["after_config"]
    session.flush()
    return "applied"


def rollback_identity_migration(session, manifest):
    require_staging()
    site, products = _read(session, manifest["site_id"], lock=True)
    if (fingerprint(site.generated_config), fingerprint(product_snapshot(products))) != (manifest["after_config_hash"], manifest["after_products_hash"]):
        raise HTTPException(409, "Data changed after migration; automatic rollback refused.")
    for product in products:
        old = next(p for p in manifest["before_products"] if p["id"] == product.id)
        product.catalog_uid = old["catalog_uid"]
    site.generated_config = manifest["before_config"]
    session.flush()
