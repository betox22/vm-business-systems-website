import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import ProxyHandler, Request, build_opener

from .config import get_settings

_NO_PROXY_OPENER = build_opener(ProxyHandler({}))
ADMIN_ROLES = {"owner", "admin", "staff"}


class AuthError(RuntimeError):
    pass


class AuthNotConfiguredError(RuntimeError):
    pass


def login_admin(email: str, password: str) -> dict[str, Any]:
    settings = get_settings()
    _require_supabase_auth(settings)
    url = f"{settings.supabase_url.rstrip('/')}/auth/v1/token?grant_type=password"
    request = Request(
        url,
        data=json.dumps({"email": email, "password": password}).encode("utf-8"),
        method="POST",
        headers={
            "apikey": settings.supabase_service_role_key or "",
            "authorization": f"Bearer {settings.supabase_service_role_key}",
            "content-type": "application/json",
        },
    )
    payload = _json_request(request, "Supabase login failed")
    user = payload.get("user") or {}
    access_token = payload.get("access_token") or ""
    if not access_token or not is_admin_user(user):
        raise AuthError("Admin access is not enabled for this user.")
    return {
        "access_token": access_token,
        "refresh_token": payload.get("refresh_token") or "",
        "expires_in": payload.get("expires_in") or 0,
        "user": {
            "id": user.get("id") or "",
            "email": user.get("email") or email,
            "role": admin_role_for_user(user) or "admin",
        },
    }


def verify_admin_bearer(access_token: str) -> dict[str, Any]:
    if not access_token:
        raise AuthError("Missing bearer token.")
    user = get_supabase_user(access_token)
    if not is_admin_user(user):
        raise AuthError("Admin access is not enabled for this user.")
    return user


def get_supabase_user(access_token: str) -> dict[str, Any]:
    settings = get_settings()
    _require_supabase_auth(settings)
    request = Request(
        f"{settings.supabase_url.rstrip('/')}/auth/v1/user",
        method="GET",
        headers={
            "apikey": settings.supabase_service_role_key or "",
            "authorization": f"Bearer {access_token}",
            "content-type": "application/json",
        },
    )
    return _json_request(request, "Supabase user lookup failed")


def is_admin_user(user: dict[str, Any]) -> bool:
    if not user.get("id"):
        return False
    email = (user.get("email") or "").strip().lower()
    allowed = allowed_admin_emails()
    if email and email in allowed:
        return True
    return bool(admin_role_for_user(user))


def admin_role_for_user(user: dict[str, Any]) -> str:
    user_id = user.get("id") or ""
    email = (user.get("email") or "").strip().lower()
    rows = select_business_members(user_id, email)
    for row in rows:
        if row.get("status") == "active" and row.get("role") in ADMIN_ROLES:
            return row.get("role") or "admin"
    return ""


def select_business_members(user_id: str, email: str) -> list[dict[str, Any]]:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return []
    filters = []
    if user_id:
        filters.append(f"user_id=eq.{quote(user_id)}")
    if email:
        filters.append(f"email=eq.{quote(email)}")
    if not filters:
        return []
    query = f"or=({','.join(filters)})&select=id,business_id,user_id,email,role,status&limit=50"
    request = Request(
        f"{settings.supabase_url.rstrip('/')}/rest/v1/business_members?{query}",
        method="GET",
        headers={
            "apikey": settings.supabase_service_role_key or "",
            "authorization": f"Bearer {settings.supabase_service_role_key}",
            "content-type": "application/json",
        },
    )
    try:
        return _json_request(request, "Supabase member lookup failed")
    except AuthError:
        return []


def allowed_admin_emails() -> set[str]:
    raw = get_settings().admin_allowed_emails or ""
    return {item.strip().lower() for item in raw.split(",") if item.strip()}


def _require_supabase_auth(settings) -> None:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise AuthNotConfiguredError("Supabase auth is not configured.")


def _json_request(request: Request, error_prefix: str) -> Any:
    try:
        with _NO_PROXY_OPENER.open(request, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        details = error.read().decode("utf-8", errors="replace")
        raise AuthError(f"{error_prefix}: {details}") from error
    except URLError as error:
        raise AuthError(f"{error_prefix}: {error.reason}") from error
