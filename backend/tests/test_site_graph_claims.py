import pytest

from app.site_graph_claims import CLAIM_RULES_V1, scan_claims, unsupported_claims


RULE_CASES = [
    ("experience_duration", "10 años de experiencia", "10 years of experience"),
    ("percentage_claim", "10% de descuento", "10 percent discount"),
    ("price_claim", "$19.99", "20 USD"),
    ("promotion_claim", "Oferta de septiembre", "BOGO"),
    ("guarantee_claim", "Garantía de por vida", "Lifetime warranty"),
    ("free_shipping_claim", "Envío gratis", "Free delivery"),
    ("award_claim", "Ganador del Premio Nacional 2025", "Award-winning service"),
    ("certification_claim", "Certificado ISO 9001", "Licensed service"),
    ("ranking_claim", "Número uno en Miami", "#1 in Miami"),
    ("email_claim", "ventas@example.com", "sales@example.com"),
    ("phone_claim", "+58 412 123 4567", "+1 (305) 555-1234 ext 9"),
    ("address_claim", "Calle 12, Caracas 1010", "123 Main Street, Miami 33101"),
]


@pytest.mark.parametrize("rule_id,spanish,english", RULE_CASES)
def test_g09_each_rule_bilingual_positive_negative_and_specific_support(rule_id, spanish, english):
    for value in (spanish, english):
        findings = scan_claims(value)
        assert rule_id in {f.rule_id for f in findings}, value
        assert unsupported_claims([("$", value)], [])
        assert unsupported_claims([("$", value)], [value]) == []
    assert rule_id not in {f.rule_id for f in scan_claims("Explore the available options.")}


@pytest.mark.parametrize("value", ["10+ years", "Más de 10 años", "over 10 years", "since 2012", "desde 2012", "décadas de experiencia", "decades of experience"])
def test_g09_experience_variants(value):
    assert any(f.rule_id == "experience_duration" for f in scan_claims(value))


@pytest.mark.parametrize("value", ["descuento", "rebaja", "promoción", "sale", "discount", "save", "deal", "2x1", "BOGO", "limited time", "tiempo limitado", "garantizado", "warranty", "entrega gratis", "sin costo de envío", "galardonado", "awarded", "acreditado", "ISO 9001", "the best", "el mejor", "líder en Miami", "leader in Miami", "top-rated"])
def test_g09_registry_covers_design_vocabulary(value):
    assert scan_claims(value), value


@pytest.mark.parametrize("claim,fact", [
    ("20 años de experiencia", "10 años de experiencia"),
    ("20% de descuento", "10% de descuento"),
    ("$29.99", "$19.99"),
    ("20 EUR", "20 USD"),
    ("desde $19.99", "$19.99"),
    ("Más de 10 años de experiencia", "10 años de experiencia"),
    ("10+ years", "10 years"),
    ("since 2012", "12 years"),
    ("Garantía de por vida", "Todos los productos tienen garantía"),
    ("2 years warranty", "warranty"),
    ("Free shipping", "We ship nationally"),
    ("20% discount", "20% discount during September"),
    ("BOGO", "sale"),
    ("10% discount on tools", "10% discount on cups"),
    ("Certified ISO 9001", "Certified team"),
    ("Certificado ISO 9001", "No certificado ISO 9001"),
    ("Winner of National Award 2025", "Winner of Local Award 2024"),
    ("#1 in Miami", "#1 in Caracas"),
    ("Certified ISO 9001", "Certified ISO 27001"),
])
def test_g10_g11_g13_specific_values_comparators_scope_and_conditions(claim, fact):
    assert unsupported_claims([("$", claim)], [fact]), (claim, fact)


@pytest.mark.parametrize("claim,fact,allowed", [
    ("sales@EXAMPLE.COM", "sales@example.com", True),
    ("Sales@example.com", "sales@example.com", False),
    ("ventas@example.com", "soporte@example.com", False),
    ("+1 305 555 1234 ext 9", "+1 (305) 555-1234 ext 9", True),
    ("+1 305 555 1234 ext 8", "+1 (305) 555-1234 ext 9", False),
    ("+1 305 555 1235", "+1 (305) 555-1234", False),
    ("123 Main St, Miami 33101", "123 Main Street, Miami 33101", True),
    ("124 Main Street, Miami 33101", "123 Main Street, Miami 33101", False),
    ("123 Main Street, Miami 33102", "123 Main Street, Miami 33101", False),
    ("123 Main Street, Miami 33101", "Miami", False),
])
def test_g12_exact_contacts(claim, fact, allowed):
    assert bool(unsupported_claims([("$", claim)], [fact])) is not allowed


@pytest.mark.parametrize("value", ["best fit", "leading-edge", "Model X100", "2.5 mm", "free to explore", "road-ready", "block 1", "product 12", "$12345678", "since 2012"])
def test_g14_false_positives(value):
    findings = scan_claims(value)
    if value.startswith("$") or value.startswith("since"):
        assert "phone_claim" not in {f.rule_id for f in findings}
    else:
        assert findings == []


def test_g09_unicode_normalization_and_versioned_rule_objects():
    assert len(CLAIM_RULES_V1) == 12
    assert len({r.rule_id for r in CLAIM_RULES_V1}) == 12
    assert unsupported_claims([("$", "ＧＡＲＡＮＴÍＡ de por vida")], ["garantia de por vida"]) == []
    assert unsupported_claims([("$", "10 años de experiencia")], ["10 years of experience"]) == []


def test_g15_no_category_unlock_or_combining_facts():
    assert unsupported_claims([("$", "20% discount on tools")], ["20%", "discount on tools"])
    assert unsupported_claims([("$", "#1 in Miami")], ["#1", "Miami"])
    assert unsupported_claims([("$", "Certified ISO 9001")], ["Certified", "ISO 27001"])
    assert unsupported_claims([("$", "20% discount")], ["10% discount", "20 years experience"])


@pytest.mark.parametrize("claim", [
    "En septiembre, aprovecha un 10% de descuento en el servicio de instalación. Elige tu próximo proyecto para el hogar.",
    "Aprovecha un 10% de descuento durante septiembre en el servicio de instalación.",
])
def test_conditional_real_percentage_output_matches_english_fact(claim):
    fact = "10% discount during September for installation service"
    assert unsupported_claims([("$", claim)], [fact]) == []
    for rule in ("percentage_claim", "promotion_claim"):
        assert next(f.signature for f in scan_claims(claim) if f.rule_id == rule) == next(f.signature for f in scan_claims(fact) if f.rule_id == rule)


@pytest.mark.parametrize("claim", [
    "Piensa en lo que viene para tu hogar. Envío gratis dentro de Miami en pedidos superiores a 100 USD.",
    "Envío gratis dentro de Miami en pedidos superiores a 100 USD. ¡Dale forma a tu próxima idea!",
])
def test_conditional_real_shipping_and_price_match_english_fact(claim):
    fact = "Free shipping within Miami on orders over 100 USD"
    assert unsupported_claims([("$", claim)], [fact]) == []
    for rule in ("price_claim", "free_shipping_claim"):
        assert next(f.signature for f in scan_claims(claim) if f.rule_id == rule) == next(f.signature for f in scan_claims(fact) if f.rule_id == rule)


@pytest.mark.parametrize("claim,fact", [
    ("10,50 por ciento de descuento", "10.50 percent discount"),
    ("Desde 19,99 USD", "Starting at 19.99 USD"),
    ("Entrega gratuita dentro de Miami en pedidos de al menos 100 euros", "Free delivery within Miami on orders at least 100 EUR"),
])
def test_commerce_bilingual_value_normalization_in_both_directions(claim, fact):
    assert unsupported_claims([("$", claim)], [fact]) == []
    assert unsupported_claims([("$", fact)], [claim]) == []


@pytest.mark.parametrize("claim", [
    "20% de descuento durante septiembre en el servicio de instalación",
    "10% de descuento durante octubre en el servicio de instalación",
    "10% de descuento en el servicio de instalación",
    "10% de descuento durante septiembre en herramientas",
    "No hay 10% de descuento durante septiembre en el servicio de instalación",
])
def test_bilingual_percentage_does_not_lose_conditions(claim):
    assert unsupported_claims([("$", claim)], ["10% discount during September for installation service"])


@pytest.mark.parametrize("claim", [
    "Envío gratis dentro de Miami en pedidos superiores a 90 USD",
    "Envío gratis dentro de Miami en pedidos superiores a 100 EUR",
    "Envío gratis dentro de Miami en pedidos de al menos 100 USD",
    "Envío gratis dentro de Miami en pedidos inferiores a 100 USD",
    "Envío gratis dentro de Caracas en pedidos superiores a 100 USD",
    "Envío gratis dentro de Miami",
    "Envío gratis en pedidos superiores a 100 USD",
    "Envío gratis",
    "No hay envío gratis dentro de Miami en pedidos superiores a 100 USD",
])
def test_bilingual_shipping_does_not_lose_threshold_currency_or_region(claim):
    assert unsupported_claims([("$", claim)], ["Free shipping within Miami on orders over 100 USD"])
