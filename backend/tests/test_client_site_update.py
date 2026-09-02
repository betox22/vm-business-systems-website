from __future__ import annotations

import json
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import main
from app.db import Base, get_session
from app.db_models import GeneratedSite, Store


OWNER = {"id": "owner-user", "email": "owner@example.com"}
OTHER_OWNER = {"id": "other-user", "email": "other@example.com"}


def _schema(headline: str) -> dict:
    return {
        "business": {"name": "Owner Shop", "industry": "retail"},
        "selected_template": {"id": "premium-product-store", "name": "Premium Product Store"},
        "pages": [{"page_key": "home", "sections": [{"type": "Hero", "editable": {"headline": headline}}]}],
        "catalog_items": [],
    }


def _client_and_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(bind=engine)
    session = session_factory()
    session.add(Store(
        id="store-owner",
        owner_user_id=OWNER["id"],
        owner_email=OWNER["email"],
        name="Owner Shop",
        business_type="retail",
        public_url="owner-shop.usekreaton.com",
    ))
    session.add(GeneratedSite(
        id="site-owner",
        store_id="store-owner",
        owner_user_id=OWNER["id"],
        owner_email=OWNER["email"],
        business_name="Owner Shop",
        business_type="retail",
        template_id="premium-product-store",
        template_name="Premium Product Store",
        template_mode="generated",
        domain_slug="owner-shop",
        public_url="owner-shop-site.usekreaton.com",
        status="draft",
        generated_config=json.dumps(_schema("Original headline")),
    ))
    session.commit()

    def override_get_session():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    main.app.dependency_overrides[get_session] = override_get_session
    return engine, session_factory, TestClient(main.app)


def test_authenticated_owner_edit_survives_database_reload():
    engine, session_factory, client = _client_and_session()
    updated = _schema("A headline saved by the owner")
    try:
        with (
            patch.object(main, "supabase_auth_configured", return_value=True),
            patch.object(main, "fetch_supabase_user", return_value=OWNER),
            client,
        ):
            response = client.put(
                "/api/client/sites/site-owner",
                headers={"Authorization": "Bearer owner-token"},
                json={"schema": updated, "businessId": "store-owner"},
            )
            reloaded = client.get(
                "/api/client/projects/site-owner",
                headers={"Authorization": "Bearer owner-token"},
            )

        assert response.status_code == 200
        assert response.json()["storage_status"] == "stored"
        assert reloaded.status_code == 200
        assert reloaded.json()["schema"]["pages"][0]["sections"][0]["editable"]["headline"] == "A headline saved by the owner"
        with session_factory() as db:
            stored = db.scalar(select(GeneratedSite).where(GeneratedSite.id == "site-owner"))
            assert json.loads(stored.generated_config) == updated
    finally:
        main.app.dependency_overrides.pop(get_session, None)
        engine.dispose()


def test_authenticated_owner_cannot_edit_another_owners_site():
    engine, _session_factory, client = _client_and_session()
    try:
        with (
            patch.object(main, "supabase_auth_configured", return_value=True),
            patch.object(main, "fetch_supabase_user", return_value=OTHER_OWNER),
            client,
        ):
            response = client.put(
                "/api/client/sites/site-owner",
                headers={"Authorization": "Bearer other-token"},
                json={"schema": _schema("Intruder edit"), "businessId": "store-owner"},
            )
        assert response.status_code == 404
    finally:
        main.app.dependency_overrides.pop(get_session, None)
        engine.dispose()


def test_owner_save_rejects_mismatched_business_id():
    engine, _session_factory, client = _client_and_session()
    try:
        with (
            patch.object(main, "supabase_auth_configured", return_value=True),
            patch.object(main, "fetch_supabase_user", return_value=OWNER),
            client,
        ):
            response = client.put(
                "/api/client/sites/site-owner",
                headers={"Authorization": "Bearer owner-token"},
                json={"schema": _schema("Valid edit"), "businessId": "store-someone-else"},
            )
        assert response.status_code == 409
    finally:
        main.app.dependency_overrides.pop(get_session, None)
        engine.dispose()
