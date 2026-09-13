import json
from unittest.mock import patch

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, event, select
from sqlalchemy.orm import Session

from app import client_auth, main
from app.catalog_sync import sync_site_catalog_to_commerce
from app.db import Base, get_session
from app.db_models import GeneratedSite, Product, Store
from app.models import WebsiteGenerationRequest
from test_client_site_update import OWNER, _client_and_session, _schema
from test_store_owner_session import client


def item(name="Drill", **fields):
    return dict(name=name, category="tools", description="Cordless drill", image_url="https://example.com/drill.jpg",
                sku="DRILL", price_type="fixed", price_amount=24.99, **fields)


def site(db, site_id="one", store_id="store", catalog=None):
    row = GeneratedSite(id=site_id, store_id=store_id, owner_user_id="owner", owner_email="owner@example.com",
                        business_name="Hardware", business_type="retail", template_id="mega-retail-store",
                        template_name="Mega", template_mode="generated", domain_slug=site_id,
                        public_url=f"{site_id}.example.com", generated_config=json.dumps({"catalog_items": catalog or []}))
    db.add(row)
    db.flush()
    return row


@pytest.fixture
def db():
    engine = create_engine("sqlite://")
    event.listen(engine, "connect", lambda con, _: con.execute("PRAGMA foreign_keys=ON"))
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        db.add(Store(id="store", name="Hardware", owner_email="owner@example.com", business_type="retail", public_url="store.example.com"))
        db.commit()
        yield db
    engine.dispose()


def products(db):
    return list(db.scalars(select(Product)))


def test_first_sync_and_regeneration_archive_never_delete(db):
    row = site(db, catalog=[item(), item("Removed", is_active=False)])
    sync_site_catalog_to_commerce(db, row)
    db.commit()
    old = products(db)
    ids = {p.id for p in old}
    assert len(ids) == 2
    assert all(p.source == "ai_generated" and p.site_id == row.id and p.store_id == "store" for p in old)
    assert old[0].description == "Cordless drill" and old[0].sku == "DRILL"
    row.generated_config = json.dumps({"catalog_items": [item("Replacement")]})
    sync_site_catalog_to_commerce(db, row)
    db.commit()
    assert len(products(db)) == 3
    assert all(db.get(Product, pid).status == "Archived" for pid in ids)
    assert [p.name for p in products(db) if p.status == "Published"] == ["Replacement"]
    sync_site_catalog_to_commerce(db, row)
    db.commit()
    assert len(products(db)) == 4
    assert len([p for p in products(db) if p.status == "Published"]) == 1


@pytest.mark.parametrize("fields", [
    {"name": ["Broken"]}, {"price_amount": 0}, {"price_amount": "nan"},
    {"price_type": "quote_only", "price_amount": 25}, {"metadata": ["Broken"]},
])
def test_invalid_catalog_does_not_archive_existing_products(db, fields):
    row = site(db, catalog=[item()])
    sync_site_catalog_to_commerce(db, row)
    db.commit()
    row.generated_config = json.dumps({"catalog_items": [dict(item(), **fields)]})
    with pytest.raises(HTTPException) as error:
        sync_site_catalog_to_commerce(db, row)
    assert error.value.status_code == 422
    db.rollback()
    assert len(products(db)) == 1 and products(db)[0].status == "Published"


def test_two_sites_same_store_and_empty_catalog_are_isolated(db):
    first = site(db, catalog=[item("First")])
    second = site(db, "two", catalog=[item("Second")])
    for row in (first, second):
        sync_site_catalog_to_commerce(db, row)
    db.commit()
    first.generated_config = '{"catalog_items": []}'
    sync_site_catalog_to_commerce(db, first)
    db.commit()
    assert {p.name: p.status for p in products(db)} == {"First": "Archived", "Second": "Published"}


def test_starting_at_and_quote_only(db):
    row = site(db, catalog=[dict(item(), price_type="starting_at", price_amount=15.55),
                            dict(item("Advice"), price_type="quote_only", price_amount=None)])
    sync_site_catalog_to_commerce(db, row)
    db.commit()
    approximate, quote = products(db)
    assert (approximate.price_cents, approximate.quote_only, approximate.price_is_approximate) == (1555, False, True)
    assert (quote.price_cents, quote.quote_only, quote.price_is_approximate) == (None, True, False)


def test_manual_promotion_and_existing_routes_by_store(client):
    iterator = client.app.dependency_overrides[get_session]()
    db = next(iterator)
    try:
        row = site(db, store_id="owned", catalog=[item()])
        sync_site_catalog_to_commerce(db, row)
        db.commit()
        original = products(db)[0]
        original_id = original.id
        client.cookies.set("luma_client_session", "owner-token")
        url = f"/api/v1/store-owner/owned/products/{original_id}"
        assert client.patch(url, json={"price": None}).status_code == 422
        db.refresh(original)
        assert original.source == "ai_generated"
        assert client.patch(url, json={"description": "Owner version", "price": 30}).status_code == 200
        db.refresh(original)
        assert original.source == "owner_edited"
        sync_site_catalog_to_commerce(db, row)
        db.commit()
        assert (original.status, original.description, original.price_cents) == ("Published", "Owner version", 3000)
        for route in ("store-owner", "storefront"):
            response = client.get(f"/api/v1/{route}/owned/products")
            assert response.status_code == 200
            assert len(response.json()["products"]) == 2
        assert client.get("/api/v1/storefront/other/products").json()["products"] == []
        created = client.post("/api/v1/store-owner/owned/products", json={"name": "Manual", "categoryId": "tools", "price": 5, "stock": 1}).json()
        manual = db.get(Product, created["id"])
        assert (manual.source, manual.site_id) == ("owner_edited", None)
    finally:
        iterator.close()


def test_deleting_site_preserves_product_foreign_key_history(db):
    row = site(db, catalog=[item()])
    sync_site_catalog_to_commerce(db, row)
    db.commit()
    pid = products(db)[0].id
    db.delete(row)
    db.commit()
    assert db.get(Product, pid).site_id is None


@pytest.mark.parametrize("fail", [False, True])
def test_generation_import_is_atomic(db, fail):
    schema = _schema("Generated")
    schema["catalog_items"] = [item()]
    def import_then_fail(session, row):
        sync_site_catalog_to_commerce(session, row)
        session.flush()
        raise RuntimeError("simulated failure after product insert")
    with patch.object(main, "sync_site_catalog_to_commerce", side_effect=import_then_fail if fail else sync_site_catalog_to_commerce):
        if fail:
            with pytest.raises(RuntimeError):
                main.persist_generated_site(db, user=OWNER, request=WebsiteGenerationRequest(businessName="Hardware"), schema=schema)
            assert products(db) == []
            assert list(db.scalars(select(GeneratedSite))) == []
        else:
            row = main.persist_generated_site(db, user=OWNER, request=WebsiteGenerationRequest(businessName="Hardware"), schema=schema)
            db.expire_all()
            assert json.loads(row.generated_config) == schema
            assert products(db)[0].site_id == row.id


@pytest.mark.parametrize("fail", [False, True])
def test_owner_endpoint_json_and_catalog_commit_or_rollback_together(fail):
    engine, factory, browser = _client_and_session()
    try:
        with factory() as db:
            row = db.get(GeneratedSite, "site-owner")
            original = _schema("Original")
            original["catalog_items"] = [item("Old")]
            row.generated_config = json.dumps(original)
            sync_site_catalog_to_commerce(db, row)
            db.commit()
            old_id = products(db)[0].id
        changed = _schema("Changed")
        changed["catalog_items"] = [item("New")]
        def import_then_fail(session, row):
            sync_site_catalog_to_commerce(session, row)
            session.flush()
            raise RuntimeError("failure after archive and insert")
        with patch.object(client_auth, "supabase_auth_configured", return_value=True), patch.object(client_auth, "fetch_supabase_user", return_value=OWNER), patch.object(main, "sync_site_catalog_to_commerce", side_effect=import_then_fail if fail else sync_site_catalog_to_commerce):
            if fail:
                with pytest.raises(RuntimeError):
                    browser.put("/api/client/sites/site-owner", headers={"Authorization": "Bearer owner-token"}, json={"schema": changed})
            else:
                response = browser.put("/api/client/sites/site-owner", headers={"Authorization": "Bearer owner-token"}, json={"schema": changed})
                assert response.status_code == 200, response.text
        with factory() as db:
            assert json.loads(db.get(GeneratedSite, "site-owner").generated_config) == (original if fail else changed)
            assert db.get(Product, old_id).status == ("Published" if fail else "Archived")
            assert len(products(db)) == (1 if fail else 2)
    finally:
        browser.close()
        main.app.dependency_overrides.pop(get_session, None)
        engine.dispose()
