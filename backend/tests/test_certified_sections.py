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
    ],
)
def test_certified_hero_requires_its_archetype(archetype, section_id):
    assert section_id in _load_eligible_sections({archetype}, require_complete_bindings=True)
    assert section_id not in _load_eligible_sections(set(), require_complete_bindings=True)


def test_shared_shell_is_eligible_without_archetype():
    sections = _load_eligible_sections(set(), require_complete_bindings=True)
    assert sections["shared--header"]["source_template"] == "shared"
    assert sections["shared--footer"]["source_template"] == "shared"
