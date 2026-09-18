"""Versioned, conservative claim matching; not a universal truth detector."""
import re
import unicodedata
from dataclasses import dataclass
from decimal import Decimal
from typing import Callable

CLAIM_RULES_VERSION = "CLAIM_RULES_V1"
CLAIM_POLICY_VERSION = CLAIM_RULES_VERSION


def normalize(value: str) -> str:
    value = unicodedata.normalize("NFKC", value).casefold()
    value = "".join(c for c in unicodedata.normalize("NFKD", value) if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", value).strip()


@dataclass(frozen=True)
class ClaimFinding:
    rule_id: str
    path: str
    excerpt: str
    signature: tuple[str, ...]


@dataclass(frozen=True)
class ClaimRule:
    rule_id: str
    patterns: tuple[re.Pattern, ...]
    extract_signature: Callable
    supports: Callable
    preserve_case: bool = False


def _exact(claim, fact):
    return claim == fact


def _decimal(value):
    return str(Decimal(value.replace(",", ".")).normalize())


def _clause(text, match):
    left = 0
    right = len(text)
    for separator in re.finditer(r"[;!?\n]|(?<!\d)\.(?=\s|$)", text):
        if separator.end() <= match.start():
            left = separator.end()
        elif separator.start() >= match.end():
            right = separator.start()
            break
    return text[left:right].strip()


ALIASES = {
    "descuento": "discount", "descuentos": "discount", "rebaja": "discount",
    "rebajas": "discount", "off": "discount", "save": "discount", "ahorra": "discount",
    "promocion": "offer", "promociones": "offer", "oferta": "offer", "ofertas": "offer",
    "sale": "offer", "deal": "offer", "deals": "offer",
    "anos": "year", "ano": "year", "years": "year", "year": "year",
    "meses": "month", "mes": "month", "months": "month", "month": "month",
    "dias": "day", "dia": "day", "days": "day", "day": "day",
    "semanas": "week", "weeks": "week",
    "experiencia": "experience", "decadas": "decades",
    "septiembre": "september", "octubre": "october", "noviembre": "november",
    "enero": "january", "febrero": "february", "marzo": "march", "abril": "april",
    "mayo": "may", "junio": "june", "julio": "july", "agosto": "august",
    "diciembre": "december", "durante": "during", "hasta": "until",
    "nacional": "national", "local": "local", "premio": "award", "premios": "award",
    "certificacion": "certification", "certificado": "certified",
    "certificada": "certified", "certificados": "certified", "certificadas": "certified",
    "acreditado": "accredited", "acreditada": "accredited",
    "garantia": "warranty", "guarantee": "warranty", "garantizado": "warranty",
    "garantizada": "warranty", "guaranteed": "warranty",
}
STOP = set("we our us have has offers offer tenemos ofrecemos cuenta con somos son es el la los las de del en por para a un una y and the of in for with is are to by at on".split())


def _tokens(value, ignored=()):
    value = normalize(value)
    value = re.sub(r"\b(?:por ciento|percent)\b", "%", value)
    tokens = re.findall(r"[a-z]+|\d+(?:[.,]\d+)?|[%$€£#]", value)
    ignore = STOP | set(ignored)
    return tuple(sorted(ALIASES.get(t, t) for t in tokens if t not in ignore))


def _scope(text, match, ignored=()):
    clause = _clause(text, match)
    # Retain conditions, negations, dates and all numeric qualifiers. A generic
    # or time-limited fact must not grant broader or unconditional authority.
    return _tokens(clause, ignored)


COMMERCE_SCOPE_PHRASES = (
    (r"\b(?:free (?:shipping|delivery)|(?:envios?|entrega) (?:gratis|gratuit[oa])|sin costo de envio)\b", "freeshipping"),
    (r"\b(?:greater than or equal to|at least|al menos|mayores o iguales a|superiores o iguales a)\b", "gte"),
    (r"\b(?:less than or equal to|at most|como maximo|menores o iguales a)\b", "lte"),
    (r"\b(?:more than|greater than|over|mas de|mayores a|superiores a)\b", "gt"),
    (r"\b(?:less than|under|menos de|menores a|inferiores a)\b", "lt"),
    (r"\b(?:within|dentro de)\b", "within"),
    (r"\b(?:starting at|from|desde)\b", "startingat"),
    (r"\b(?:take advantage of|aprovecha|aproveche)\b", ""),
)
COMMERCE_SCOPE_ALIASES = {
    "orders": "order", "pedidos": "order", "pedido": "order",
    "servicio": "service", "servicios": "service", "services": "service",
    "instalacion": "installation", "instalaciones": "installation",
    "dolar": "usd", "dolares": "usd", "euro": "eur", "euros": "eur",
}
MONTHS = "january february march april may june july august september october november december".split()


def _commerce_scope(text, match):
    # Canonicalize only known equivalents. Keep unknown scope and all conditions
    # so an equal amount alone cannot authorize a broader commercial promise.
    clause = _clause(text, match)
    for pattern, replacement in COMMERCE_SCOPE_PHRASES:
        clause = re.sub(pattern, replacement, clause)
    for source, target in ALIASES.items():
        if target in MONTHS:
            clause = re.sub(r"\b" + source + r"\b", target, clause)
    clause = re.sub(r"\b(?:en|in|durante|during)\s+(" + "|".join(MONTHS) + r")\b", r"during \1", clause)
    tokens = _tokens(clause)
    return tuple(sorted(format(Decimal(t.replace(",", ".")).normalize(), "f") if re.fullmatch(r"\d+(?:[.,]\d+)?", t)
                        else COMMERCE_SCOPE_ALIASES.get(t, t) for t in tokens))


def _experience(text, m):
    raw = m.group()
    if re.search(r"\b(?:since|desde)\b", raw):
        core = ("since", re.search(r"\d{4}", raw).group(), "year")
    elif re.search(r"\b(?:decadas|decades)\b", raw):
        core = ("plural", "decades", "year")
    else:
        amount = re.search(r"\d+(?:[.,]\d+)?", raw).group()
        comparator = "more_than" if re.search(r"mas de|more than|over", raw) else "at_least" if "+" in raw or re.search(r"al menos|at least", raw) else "exact"
        core = (comparator, _decimal(amount), "year")
    return core + _scope(text, m, ("years", "year", "anos", "ano", "experience", "experiencia", "more", "than", "over", "mas", "since", "desde", "al", "menos", "least", "decades", "decadas"))


def _percentage(text, m):
    value = re.search(r"\d+(?:[.,]\d+)?", m.group()).group()
    return (_decimal(value),) + _commerce_scope(text, m)


def _price(text, m):
    raw = m.group()
    amount = re.search(r"\d+(?:[.,]\d+)?", raw).group()
    currency = re.search(r"usd|eur|gbp|dolares?|euros?|[$€£]", raw).group()
    currency = {"dolar": "usd", "dolares": "usd", "euro": "eur", "euros": "eur"}.get(currency, currency)
    modifier = "starting_at" if re.search(r"\b(?:desde|from|starting at)\b", raw) else "exact"
    return (_decimal(amount), currency, modifier) + _commerce_scope(text, m)


def _promotion(text, m):
    raw = _clause(text, m)
    mechanic = "bogo" if re.search(r"\b(?:2x1|bogo)\b", raw) else "discount" if re.search(r"descuent|rebaj|discount|\bsave\b|\boff\b", raw) else "limited" if re.search(r"limited time|tiempo limitado", raw) else "offer"
    return (mechanic,) + _commerce_scope(text, m)


def _guarantee(text, m):
    clause = _clause(text, m)
    duration = re.search(r"\d+\s*(?:years?|anos?|months?|meses?|days?|dias?)\b", clause)
    lifetime = bool(re.search(r"\b(?:lifetime|de por vida)\b", clause))
    kind = "lifetime" if lifetime else "duration" if duration else "generic"
    return (kind,) + _scope(text, m)


def _shipping(text, m):
    return ("free_shipping",) + _commerce_scope(text, m)


def _award(text, m):
    return ("award",) + _scope(text, m, ("awarded", "award", "winning", "winner", "ganador", "ganadora", "galardonado", "galardonada", "premiado", "premiada", "premio"))


def _certification(text, m):
    clause = _clause(text, m)
    kind = "iso" if re.search(r"\biso\s*\d", clause) else "license" if re.search(r"\blicensed\b|con licencia", clause) else "accreditation" if re.search(r"acreditad|accredited", clause) else "certification"
    return (kind,) + _scope(text, m, ("certified", "certification", "certificado", "certificada", "certificados", "certificadas", "certificacion", "accredited", "acreditado", "acreditada", "licensed", "licencia"))


def _ranking(text, m):
    raw = m.group()
    rank = "1" if re.search(r"#\s*1|numero (?:uno|1)|number (?:one|1)", raw) else "best" if re.search(r"best|mejor", raw) else "leader" if re.search(r"lider|leader", raw) else "top_rated"
    return (rank,) + _scope(text, m, ("number", "one", "numero", "uno", "best", "mejor", "leader", "lider", "top", "rated"))


def _email(text, m):
    local, domain = m.group().rsplit("@", 1)
    return (local + "@" + domain.casefold(),)


def _phone(text, m):
    raw = m.group()
    parts = re.split(r"\s*(?:ext\.?|extension|x)\s*", raw, flags=re.I)
    digits = re.sub(r"\D", "", parts[0])
    if not 7 <= len(digits) <= 15:
        return None
    return (digits, re.sub(r"\D", "", parts[1]) if len(parts) > 1 else "")


def _address(text, m):
    value = m.group().strip(" ,.")
    replacements = {"st": "street", "ave": "avenue", "rd": "road", "blvd": "boulevard"}
    return tuple(replacements.get(t, t) for t in re.findall(r"[a-z]+|\d+", value))


def _rule(name, pattern, extractor, preserve_case=False):
    return ClaimRule(name, (re.compile(pattern, re.I),), extractor, _exact, preserve_case)


CLAIM_RULES_V1 = (
    _rule("experience_duration", r"\b(?:(?:mas de|more than|over|al menos|at least)\s+)?\d{1,3}\+?\s*(?:anos?|years?)(?:\s+(?:de|of)\s+experienc(?:ia|e))?|\b(?:since|desde)\s+\d{4}\b|\b(?:decadas|decades)(?:\s+(?:de|of)\s+experienc(?:ia|e))", _experience),
    _rule("percentage_claim", r"\b\d{1,3}(?:[.,]\d+)?\s*(?:%|percent\b|por ciento\b)", _percentage),
    _rule("price_claim", r"(?:(?:desde|from|starting at)\s+)?(?:(?:[$€£]|usd|eur|gbp)\s*\d+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?\s*(?:usd|eur|gbp|dolares?|euros?)\b)", _price),
    _rule("promotion_claim", r"\b(?:descuentos?|rebajas?|ofertas?|promocion(?:es)?|sale|discount|save|deals?|bogo|2x1|limited time|tiempo limitado|off)\b", _promotion),
    _rule("guarantee_claim", r"\b(?:garantia|garantizad[oa]s?|warranty|guarantee(?:d)?|lifetime|de por vida)\b", _guarantee),
    _rule("free_shipping_claim", r"\b(?:(?:envio|envios|entrega)\s+(?:gratis|gratuit[oa])|sin costo de envio|free (?:shipping|delivery))\b", _shipping),
    _rule("award_claim", r"\b(?:premiad[oa]|galardonad[oa]|ganador(?:a)? del?|award-winning|awarded|winner of)\b", _award),
    _rule("certification_claim", r"\b(?:certificad[oa]s?|certificacion|certified|certification|acreditad[oa]|accredited|licensed|con licencia|iso\s*\d{3,6})\b", _certification),
    _rule("ranking_claim", r"(?<!\w)#\s*1\b|\b(?:numero\s+(?:uno|1)|number\s+(?:one|1)|(?:el|la)\s+mejor|the\s+best(?!\s+fit\b)|lider\s+en|leader\s+in|top-rated)\b", _ranking),
    _rule("email_claim", r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", _email, True),
    _rule("phone_claim", r"(?<![\w.$€£])\+?\d[\d ()-]{5,}\d(?:\s*(?:ext\.?|extension|x)\s*\d{1,6})?(?!\w)", _phone),
    _rule("address_claim", r"\b(?:\d{1,6}\s+(?:[a-z]+\s+){0,4}(?:street|st|avenue|ave|road|rd|calle|avenida|carrera|carretera|boulevard|blvd)|(?:calle|avenida|carrera|carretera)\s+(?:[a-z]+\s+){0,4}\d{1,6})(?:,?\s+[a-z]+){0,3}(?:\s+\d{4,6}(?:-\d{4})?)?\b", _address),
)


def scan_claims(value: str, path: str = "$") -> list[ClaimFinding]:
    original = unicodedata.normalize("NFKC", value)
    text = normalize(value)
    findings = []
    occupied = []
    for rule in CLAIM_RULES_V1:
        source = original if rule.preserve_case else text
        for pattern in rule.patterns:
            for match in pattern.finditer(source):
                if rule.rule_id == "phone_claim" and any(start < match.end() and end > match.start() for start, end in occupied):
                    continue
                signature = rule.extract_signature(source, match)
                if signature is None:
                    continue
                if rule.rule_id in ("price_claim", "percentage_claim", "experience_duration"):
                    occupied.append(match.span())
                finding = ClaimFinding(rule.rule_id, path, match.group()[:160], signature)
                if finding not in findings:
                    findings.append(finding)
    return findings


def unsupported_claims(values: list[tuple[str, str]], facts: list[str]) -> list[ClaimFinding]:
    allowed = [scan_claims(fact) for fact in facts]
    rules = {rule.rule_id: rule for rule in CLAIM_RULES_V1}
    result = []
    for path, value in values:
        for finding in scan_claims(value, path):
            if not any(any(fact.rule_id == finding.rule_id and rules[finding.rule_id].supports(finding.signature, fact.signature)
                           for fact in individual) for individual in allowed):
                result.append(finding)
    return result
