from __future__ import annotations

import os
from typing import Any, Dict, Optional

from fastapi import Response


ADMIN_SESSION_COOKIE_NAME = "kreaton_admin_session"
ADMIN_SESSION_COOKIE_MAX_AGE = 60 * 60 * 8
ADMIN_ROLES = frozenset({"super_admin", "support"})

ADMIN_ROLE_PERMISSIONS = {
    "super_admin": (
        "clients:read",
        "sites:read",
        "sites:delete",
        "templates:read",
        "templates:write",
        "subscriptions:read",
        "subscriptions:write",
        "roles:read",
        "roles:write",
        "audit:read",
    ),
    "support": (
        "clients:read",
        "sites:read",
        "templates:read",
        "subscriptions:read",
        "audit:read",
    ),
}


def admin_identity_from_user(user: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Return a trusted admin identity from Supabase app_metadata only."""

    app_metadata = user.get("app_metadata")
    if not isinstance(app_metadata, dict):
        return None
    role = str(app_metadata.get("kreaton_role") or "").strip().lower()
    if role not in ADMIN_ROLES:
        return None
    return {
        "id": str(user.get("id") or user.get("sub") or "").strip(),
        "email": str(user.get("email") or "").strip().lower(),
        "role": role,
        "permissions": list(ADMIN_ROLE_PERMISSIONS[role]),
    }


def set_admin_session_cookie(response: Response, access_token: str) -> None:
    response.set_cookie(
        key=ADMIN_SESSION_COOKIE_NAME,
        value=access_token,
        max_age=ADMIN_SESSION_COOKIE_MAX_AGE,
        httponly=True,
        secure=True,
        samesite="none",
        path="/api/admin",
        domain=os.getenv("SESSION_COOKIE_DOMAIN", ".vmbusinesssystems.com"),
    )


def clear_admin_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=ADMIN_SESSION_COOKIE_NAME,
        path="/api/admin",
        domain=os.getenv("SESSION_COOKIE_DOMAIN", ".vmbusinesssystems.com"),
        secure=True,
        samesite="none",
    )
