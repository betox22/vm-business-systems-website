"""Synthetic SQLite fixture; never loads production credentials or customer data."""
import json

from app.db_models import GeneratedSite, Product, Store
from app.site_graph_document_validation import ROOT, read_presentation_authority


def accepted_candidate(session):
    schema = json.loads((ROOT / "tests/fixtures/graph-presentation.json").read_text())
    schema["theme"] = {"colors": {}, "fonts": {}}
    schema["global_components"]["mega_retail_features"] = {"newsletter": False}
    schema["pages"][0]["sections"].append({"id": "contact", "type": "Contact", "order": 3,
                                           "editable": {"title": "Contact", "text": "Talk with the team"}})
    session.add(Store(id="projection-store", name="Projection QA", owner_email="qa@example.test",
                      business_type="retail", public_url="projection.invalid"))
    row = GeneratedSite(id="projection-site", store_id="projection-store", owner_user_id="qa-owner", owner_email="qa@example.test",
                        business_name="Projection QA", business_type="retail", template_id="mega-retail-store",
                        template_name="Mega", template_mode="generated", domain_slug="projection",
                        public_url="projection.invalid", generated_config=json.dumps(schema))
    session.add(row)
    session.flush()
    session.add(Product(id="projection-product", store_id="projection-store", site_id=row.id,
                        catalog_index=0, name="Hand tool", category="Tools", description="Steel handle.",
                        image_url="/images/product-placeholder.svg", sku="QA-TOOL", price_cents=2500,
                        quote_only=False, inventory=7, status="Published"))
    session.commit()
    authority = read_presentation_authority(session, row.id, actor={"id": "qa-admin", "role": "super_admin"},
                                           contact={"email": "qa@example.test", "phone": "+12025550123",
                                                    "address": "12 Main Street"})
    schema["catalog_items"] = json.loads(authority.catalog_json)
    schema["contact"] = json.loads(authority.contact_json)
    return schema, authority
