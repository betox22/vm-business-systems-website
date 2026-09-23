import pytest

from app.section_composer import _load_eligible_sections


@pytest.mark.parametrize(
    ("archetype", "section_id"),
    [
        ("retail", "mega-retail-store--home--hero"),
        ("services", "local-services-pro-plus--home--home-service-hero"),
        ("restaurant", "restaurant-food-business--home--restaurant-hero"),
        ("premium_luxury", "luxury-high-ticket-pro--home--luxury-hero"),
        ("booking", "booking-appointment-pro--home--booking-hero"),
        ("corporate", "corporate-company-pro--home--corporate-hero"),
        ("services", "home-services-premium--home--home-service-hero"),
        ("lead_generation", "lead-funnel-pro--home--funnel-hero"),
        ("marketplace", "listing-marketplace-pro--home--hero"),
        ("b2b", "b2b-saas-enterprise-pro--home--enterprise-hero"),
        ("b2b", "b2b-saas-enterprise-pro--home--hero"),
        ("digital", "digital-products-store--home--digital-hero"),
        ("education", "education-course-academy-pro--home--academy-hero"),
        ("fashion", "fashion-drop-pro--home--fashion-hero"),
        ("professional_services", "legal-professional-services-pro--home--professional-hero"),
        ("industrial", "manufacturing-industrial-supplier-pro--home--industrial-hero"),
        ("medical", "medical-wellness-clinic-pro--home--clinic-hero"),
        ("marketplace", "mega-marketplace--deals--deals-hero"),
        ("marketplace", "mega-marketplace--home--marketplace-hero"),
        ("premium_product", "premium-product-store--home--premium-hero"),
        ("real_estate", "real-estate-listings-pro--home--listing-hero"),
    ],
)
def test_certified_hero_requires_its_archetype(archetype, section_id):
    assert section_id in _load_eligible_sections({archetype}, require_complete_bindings=True)
    assert section_id not in _load_eligible_sections(set(), require_complete_bindings=True)


def test_shared_shell_is_eligible_without_archetype():
    sections = _load_eligible_sections(set(), require_complete_bindings=True)
    assert sections["shared--header"]["source_template"] == "shared"
    assert sections["shared--footer"]["source_template"] == "shared"


@pytest.mark.parametrize(("archetype", "section_id"), [
    ("retail", "mega-retail-store--home--catalog"),
    ("digital", "digital-products-store--catalog--digital-catalog"),
    ("corporate", "corporate-company-pro--catalog--services-grid"),
])
def test_certified_catalog_requires_archetype_and_live_products(archetype, section_id):
    section = _load_eligible_sections({archetype}, require_complete_bindings=True)[section_id]
    assert section["collection_bindings"]["catalog_items"]["source"] == "storefront_products"
    assert section["image_slots"] == []
    assert section_id not in _load_eligible_sections(set(), require_complete_bindings=True)
