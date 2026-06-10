import json
import re
from decimal import Decimal, InvalidOperation
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import ProxyHandler, Request, build_opener

from .config import get_settings


SUPPORTED_TLDS = [".com", ".net", ".co", ".store", ".shop", ".online", ".site"]
_NO_PROXY_OPENER = build_opener(ProxyHandler({}))


def clean_domain_query(value: str) -> str:
    cleaned = value.strip().lower()
    cleaned = re.sub(r"^https?://", "", cleaned)
    cleaned = cleaned.split("/", 1)[0].split(":", 1)[0]
    cleaned = cleaned.removeprefix("www.")
    cleaned = re.sub(r"[^a-z0-9.-]+", "-", cleaned)
    cleaned = re.sub(r"-+", "-", cleaned).strip("-.")
    return cleaned[:80]


def domain_candidates(query: str) -> list[str]:
    cleaned = clean_domain_query(query)
    if not cleaned:
        return []
    base = cleaned.split(".", 1)[0]
    candidates = [cleaned] if "." in cleaned else []
    candidates.extend(f"{base}{tld}" for tld in SUPPORTED_TLDS)
    return list(dict.fromkeys(candidates))[:20]


def search_domains(query: str) -> dict[str, Any]:
    settings = get_settings()
    candidates = domain_candidates(query)
    if not candidates:
        return {
            "query": "",
            "provider": "suggestions",
            "exact_availability": False,
            "results": [],
        }

    if (
        settings.domain_provider.lower() == "cloudflare"
        and settings.cloudflare_account_id
        and settings.cloudflare_api_token
    ):
        return search_cloudflare_domains(candidates)

    return {
        "query": clean_domain_query(query),
        "provider": "suggestions",
        "exact_availability": False,
        "results": [suggestion_result(domain) for domain in candidates],
    }


def search_cloudflare_domains(candidates: list[str]) -> dict[str, Any]:
    settings = get_settings()
    url = (
        "https://api.cloudflare.com/client/v4/accounts/"
        f"{settings.cloudflare_account_id}/registrar/domain-check"
    )
    body = json.dumps({"domains": candidates}).encode("utf-8")
    request = Request(
        url,
        data=body,
        method="POST",
        headers={
            "authorization": f"Bearer {settings.cloudflare_api_token}",
            "content-type": "application/json",
        },
    )
    try:
        with _NO_PROXY_OPENER.open(request, timeout=20) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        details = error.read().decode("utf-8")
        raise RuntimeError(f"Cloudflare domain check failed: {details}") from error
    except URLError as error:
        raise RuntimeError(f"Cloudflare domain check unavailable: {error.reason}") from error

    domains = payload.get("result", {}).get("domains", [])
    by_name = {item.get("name"): item for item in domains}
    return {
        "query": candidates[0],
        "provider": "cloudflare",
        "exact_availability": True,
        "results": [cloudflare_result(domain, by_name.get(domain, {})) for domain in candidates],
    }


def cloudflare_result(domain: str, item: dict[str, Any]) -> dict[str, Any]:
    registrable = bool(item.get("registrable"))
    pricing = item.get("pricing") or {}
    registration_cost = money_to_decimal(pricing.get("registration_cost"))
    renewal_cost = money_to_decimal(pricing.get("renewal_cost"))
    settings = get_settings()
    included = registrable and registration_cost is not None and registration_cost <= Decimal(str(settings.domain_included_max_usd))
    requires_review = registrable and not included
    reason = item.get("reason") or ""
    tier = item.get("tier") or "standard"
    if reason == "domain_premium" or tier == "premium":
        requires_review = True
        included = False

    if registrable and included:
        public_status = "available_included"
    elif registrable and requires_review:
        public_status = "available_requires_review"
    else:
        public_status = "not_available"

    return {
        "domain": item.get("name") or domain,
        "status": public_status,
        "available_hint": registrable,
        "included_in_package": included,
        "requires_review": requires_review,
        "registrable": registrable,
        "reason": reason,
        "tier": tier,
        "confidence": "authoritative_cloudflare",
        "next_step": "collect_payment_then_register" if included else "manual_review_or_choose_another",
        "internal_pricing": {
            "currency": pricing.get("currency", "USD"),
            "registration_cost": str(registration_cost) if registration_cost is not None else "",
            "renewal_cost": str(renewal_cost) if renewal_cost is not None else "",
        },
    }


def suggestion_result(domain: str) -> dict[str, Any]:
    return {
        "domain": domain,
        "status": "needs_registrar_check",
        "available_hint": True,
        "included_in_package": False,
        "requires_review": False,
        "registrable": None,
        "reason": "",
        "tier": "unknown",
        "confidence": "suggestion_only",
        "next_step": "check_registrar_before_purchase",
    }


def money_to_decimal(value: Any) -> Decimal | None:
    if value in {None, ""}:
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        return None
