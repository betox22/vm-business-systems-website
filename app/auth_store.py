import json
import secrets
import string
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import ProxyHandler, Request, build_opener

from .config import get_settings

_NO_PROXY_OPENER = build_opener(ProxyHandler({}))
ADMIN_ROLES = {"owner", "admin", "staff", "manager"}
CLIENT_ROLES = {"owner", "manager", "catalog_manager", "seller", "fulfillment", "viewer"}
ROLE_PERMISSIONS = {
    "owner": {
      "catalog:read", "catalog:create", "catalog:update", "catalog:delete",
      "assets:upload", "leads:read", "orders:read", "settings:read", "members:manage",
    },
    "manager": {
      "catalog:read", "catalog:create", "catalog:update", "catalog:delete",
      "assets:upload", "leads:read", "orders:read", "settings:read",
    },
    "catalog_manager": {
      "catalog:read", "catalog:create", "catalog:update", "catalog:delete", "assets:upload",
    },
    "seller": {
      "catalog:read", "catalog:update", "assets:upload", "leads:read", "orders:read",
    },
    "fulfillment": {
      "catalog:read", "orders:read", "leads:read",
    },
    "viewer": {
      "catalog:read", "orders:read", "leads:read", "settings:read",
    },
}


class AuthError(RuntimeError):
    pass


class AuthNotConfiguredError(RuntimeError):
    pass


def login_admin(email: str, password: str) -> dict[str, Any]:
    payload = login_supabase(email, password)
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


def login_client(email: str, password: str, business_id: str | None = None) -> dict[str, Any]:
    payload = login_supabase(email, password)
    user = payload.get("user") or {}
    access_token = payload.get("access_token") or ""
    memberships = active_client_memberships(user)
    if business_id:
        memberships = [item for item in memberships if item.get("business_id") == business_id]
    if not access_token or not memberships:
        raise AuthError("Client access is not enabled for this user.")
    return {
        "access_token": access_token,
        "refresh_token": payload.get("refresh_token") or "",
        "expires_in": payload.get("expires_in") or 0,
        "user": {
            "id": user.get("id") or "",
            "email": user.get("email") or email,
        },
        "memberships": memberships,
    }


def login_supabase(email: str, password: str) -> dict[str, Any]:
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
    return _json_request(request, "Supabase login failed")


def create_supabase_auth_user(email: str) -> dict[str, Any]:
    settings = get_settings()
    _require_supabase_auth(settings)
    temporary_password = _temporary_password()
    request = Request(
        f"{settings.supabase_url.rstrip('/')}/auth/v1/admin/users",
        data=json.dumps(
            {
                "email": email,
                "password": temporary_password,
                "email_confirm": False,
                "user_metadata": {"source": "luma_admin_invite"},
            }
        ).encode("utf-8"),
        method="POST",
        headers={
            "apikey": settings.supabase_service_role_key or "",
            "authorization": f"Bearer {settings.supabase_service_role_key}",
            "content-type": "application/json",
        },
    )
    return _json_request(request, "Supabase auth user creation failed")


def verify_admin_bearer(access_token: str) -> dict[str, Any]:
    if not access_token:
        raise AuthError("Missing bearer token.")
    user = get_supabase_user(access_token)
    if not is_admin_user(user):
        raise AuthError("Admin access is not enabled for this user.")
    return user


def verify_client_member(
    access_token: str,
    business_id: str,
    required_permission: str = "catalog:read",
) -> dict[str, Any]:
    if not access_token:
        raise AuthError("Missing bearer token.")
    user = get_supabase_user(access_token)
    member = client_member_for_user(user, business_id)
    if not member:
        raise AuthError("Client access is not enabled for this business.")
    permissions = permissions_for_role(member.get("role") or "viewer")
    if required_permission and required_permission not in permissions:
        raise AuthError("This role does not have permission for that action.")
    return {
        "user": user,
        "member": member,
        "permissions": sorted(permissions),
    }


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


def client_member_for_user(user: dict[str, Any], business_id: str) -> dict[str, Any] | None:
    user_id = user.get("id") or ""
    email = (user.get("email") or "").strip().lower()
    rows = select_business_members(user_id, email)
    for row in rows:
        if (
            row.get("status") == "active"
            and row.get("business_id") == business_id
            and row.get("role") in CLIENT_ROLES
        ):
            return row
    return None


def active_client_memberships(user: dict[str, Any]) -> list[dict[str, Any]]:
    user_id = user.get("id") or ""
    email = (user.get("email") or "").strip().lower()
    rows = select_business_members(user_id, email)
    return [
        row for row in rows
        if row.get("status") == "active" and row.get("role") in CLIENT_ROLES
    ]


def permissions_for_role(role: str) -> set[str]:
    return set(ROLE_PERMISSIONS.get(role, ROLE_PERMISSIONS["viewer"]))


def demo_client_member(role: str = "owner") -> dict[str, Any]:
    normalized_role = role if role in CLIENT_ROLES else "owner"
    return {
        "id": "development-demo-member",
        "business_id": "",
        "user_id": "",
        "email": "",
        "role": normalized_role,
        "status": "active",
    }


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
        rows = _json_request(request, "Supabase member lookup failed")
        return apply_member_role_overrides(rows)
    except AuthError:
        return []


def apply_member_role_overrides(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not rows:
        return rows
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return rows
    member_ids = {row.get("id") for row in rows if row.get("id")}
    if not member_ids:
        return rows
    request = Request(
        f"{settings.supabase_url.rstrip('/')}/rest/v1/audit_logs?"
        "action=eq.business_member_role_set&entity_type=eq.business_member"
        "&select=entity_id,metadata,created_at&order=created_at.desc&limit=1000",
        method="GET",
        headers={
            "apikey": settings.supabase_service_role_key or "",
            "authorization": f"Bearer {settings.supabase_service_role_key}",
            "content-type": "application/json",
        },
    )
    try:
        logs = _json_request(request, "Supabase member role override lookup failed")
    except AuthError:
        return rows
    overrides: dict[str, str] = {}
    for log in logs:
        entity_id = log.get("entity_id")
        if entity_id not in member_ids or entity_id in overrides:
            continue
        role = (log.get("metadata") or {}).get("role")
        if role:
            overrides[entity_id] = role
    for row in rows:
        override = overrides.get(row.get("id"))
        if override:
            row["storage_role"] = row.get("role") or ""
            row["role"] = override
    return rows


def existing_member_user_id(email: str) -> str:
    rows = select_business_members("", email)
    for row in rows:
        if row.get("user_id"):
            return row.get("user_id") or ""
    return ""


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


def _temporary_password() -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return "".join(secrets.choice(alphabet) for _ in range(32))
