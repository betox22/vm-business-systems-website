import json
from copy import deepcopy
from unittest.mock import patch

import pytest
from sqlalchemy import event, select

from app import client_auth, main
from app.catalog_sync import apply_commerce_overlay, sync_site_catalog_to_commerce
from app.db import get_session
from app.db_models import GeneratedSite, Product
from test_catalog_sync import db, item, products, site
from test_client_site_update import OWNER, _client_and_session, _schema


OVERLAID = {"name", "description", "image_url", "price", "price_amount", "price_value",
            "price_type", "price_label", "inventory_quantity"}


def test_real_owner_patch_is_projected_in_both_public_routes_without_writing_json():
    engine, factory, client = _client_and_session()
    schema = _schema("Public title")
    schema["business"]["selectedLanguage"] = "es"
    original = dict(item(), price=24.99, price_value=24.99, price_label="OLD USD 24.99",
                    rating=4.8, badge="Owner badge", specs={"material": "Steel"},
                    recurring=True, subscription=True, billing_interval="month",
                    shipping_label="Owner delivery", sort_order=7, is_featured=True,
                    display_in_catalog=False, button_label="Original CTA", track_inventory=False,
                    imageSearchQuery="drill", image_asset={"source": "unsplash_api", "photographer_name": "Original author"})
    schema["catalog_items"] = [original]
    try:
        with factory() as session:
            row = session.get(GeneratedSite, "site-owner")
            row.generated_config = json.dumps(schema)
            sync_site_catalog_to_commerce(session, row)
            session.commit()
            product = session.scalar(select(Product))
            assert product.catalog_index == 0
            product_id = product.id
            saved_json = row.generated_config
        with patch.object(client_auth, "supabase_auth_configured", return_value=True), patch.object(client_auth, "fetch_supabase_user", return_value=OWNER):
            client.cookies.set("luma_client_session", "owner-token")
            response = client.patch(f"/api/v1/store-owner/store-owner/products/{product_id}", json={
                "name": "Owner drill", "price": 37.25, "description": "Owner description",
                "imageUrl": "https://example.com/owner.jpg", "stock": 12,
            })
            assert response.status_code == 200, response.text
        for path in ("/public/sites/site-owner", "/public/resolve-site?host=owner-shop-site.usekreaton.com"):
            response = client.get(path)
            assert response.status_code == 200, response.text
            payload = response.json()
            assert payload["catalog_items"] == payload["schema"]["catalog_items"]
            updated = payload["catalog_items"][0]
            assert {k: v for k, v in updated.items() if k not in OVERLAID} == {k: v for k, v in original.items() if k not in OVERLAID}
            assert {k: updated[k] for k in OVERLAID} == dict(
                name="Owner drill", description="Owner description", image_url="https://example.com/owner.jpg",
                price=37.25, price_amount=37.25, price_value=37.25,
                price_type="fixed", price_label="USD 37.25", inventory_quantity=12,
            )
        with factory() as session:
            assert session.get(GeneratedSite, "site-owner").generated_config == saved_json
            assert session.get(Product, product_id).source == "owner_edited"
    finally:
        client.close()
        main.app.dependency_overrides.pop(get_session, None)
        engine.dispose()


@pytest.mark.parametrize("mode,price,label", [("quote_only", None, "Price to confirm"), ("starting_at", 18.25, "From USD 18.25")])
def test_price_modes_and_original_objects_untouched(db, mode, price, label):
    catalog = [dict(item(), price_type=mode, price_amount=price)]
    original = deepcopy(catalog)
    row = site(db, catalog=catalog)
    sync_site_catalog_to_commerce(db, row)
    db.commit()
    result = apply_commerce_overlay(catalog, row, db)
    assert (result[0]["price"], result[0]["price_amount"], result[0]["price_value"]) == (price, price, price)
    assert (result[0]["price_type"], result[0]["price_label"]) == (mode, label)
    assert catalog == original and result is not catalog and result[0] is not catalog[0]


@pytest.mark.parametrize("catalog", [None, [], [item()], "null"])
def test_legacy_payload_is_byte_identical(db, catalog):
    row = site(db, catalog=catalog)
    if catalog is None:
        row.generated_config = '{"business":{"name":"Legacy"}}'
    elif catalog == "null":
        row.generated_config = '{"business":{"name":"Legacy"},"catalog_items":null}'
    db.commit()
    before = json.dumps(main._public_site_payload(row), separators=(",", ":"))
    assert json.dumps(main._public_site_payload(row, db), separators=(",", ":")) == before


@pytest.mark.parametrize("case", ["count", "out_of_range", "null", "negative", "duplicate"])
def test_misalignment_leaves_unsafe_items_unchanged_and_warns(db, caplog, case):
    catalog = [item("First"), item("Second")]
    row = site(db, catalog=catalog)
    sync_site_catalog_to_commerce(db, row)
    db.commit()
    first, second = sorted(products(db), key=lambda p: p.catalog_index)
    first.name = "Changed first"
    second.name = "Changed second"
    if case == "count":
        second.status = "Archived"
    else:
        first.catalog_index = {"out_of_range": 5, "null": None, "negative": -1, "duplicate": 1}[case]
    db.commit()
    with caplog.at_level("WARNING", logger="kreaton"):
        result = apply_commerce_overlay(catalog, row, db)
    assert "overlay" in caplog.text
    assert result[0] == catalog[0]
    assert result[1] == catalog[1] if case in {"count", "duplicate"} else result[1]["name"] == "Changed second"


def test_manual_unlinked_other_sites_and_archived_are_not_overlaid(db):
    row = site(db, catalog=[item()])
    other = site(db, "other", catalog=[item("Other")])
    sync_site_catalog_to_commerce(db, other)
    db.add(Product(store_id="store", name="Manual", category="tools", price_cents=500))
    db.commit()
    catalog = [item()]
    assert apply_commerce_overlay(catalog, row, db) == catalog
    sync_site_catalog_to_commerce(db, row)
    db.commit()
    product = db.scalar(select(Product).where(Product.site_id == row.id))
    product.status = "Archived"
    db.commit()
    assert apply_commerce_overlay(catalog, row, db) == catalog


def test_null_owner_values_are_not_filled_from_old_json_and_overlay_emits_no_writes(db):
    catalog = [item()]
    row = site(db, catalog=catalog)
    sync_site_catalog_to_commerce(db, row)
    db.commit()
    product = products(db)[0]
    product.description = None
    product.image_url = None
    db.commit()
    statements = []
    def record(conn, cursor, statement, parameters, context, many):
        statements.append(statement)
    event.listen(db.bind, "before_cursor_execute", record)
    try:
        result = apply_commerce_overlay(catalog, row, db)
        assert result[0]["description"] is None and result[0]["image_url"] is None
        assert not any(s.lstrip().upper().startswith(("UPDATE", "INSERT", "DELETE")) for s in statements)
    finally:
        event.remove(db.bind, "before_cursor_execute", record)
