import pytest
from app.public_commerce import public_commerce_capabilities
from app.main import _public_site_payload
from app.db_models import GeneratedSite


@pytest.mark.parametrize("template", ["mega-marketplace", "sales-template-default", "premium-product-store", "b2b-saas-enterprise-pro", "unknown", "", None])
def test_no_implicit_sales_fallback(template):
    assert public_commerce_capabilities(template, "store-test")["salesEnabled"] is False


def test_mega_retail_public_payload_exposes_capabilities_not_owner():
    site = GeneratedSite(id="site-test", template_id="mega-retail-store", store_id="store-test", generated_config="{}")
    payload = _public_site_payload(site)
    assert payload["commerce"] == {"salesEnabled": True, "businessId": "store-test", "checkoutModel": "single_store_checkout"}
    assert "owner_email" not in payload
    assert public_commerce_capabilities("mega-retail-store", None)["salesEnabled"] is False
