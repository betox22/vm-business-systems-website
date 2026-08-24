from __future__ import annotations

import os
from typing import Any, Dict, Optional

from fastapi import HTTPException, Response


OPERATIONS_SESSION_COOKIE_NAME = "vm_operations_session"
OPERATIONS_SESSION_COOKIE_MAX_AGE = 60 * 60 * 8
OPERATIONS_ROLES = frozenset({"vm_super_admin", "vm_operations", "vm_finance", "vm_support"})

OPERATIONS_ROLE_PERMISSIONS = {
    "vm_super_admin": (
        "overview:read", "requests:read", "businesses:read", "orders:read",
        "sites:read", "products:read", "payments:read", "config:read", "audit:read",
    ),
    "vm_operations": (
        "overview:read", "requests:read", "businesses:read", "orders:read",
        "sites:read", "products:read", "config:read", "audit:read",
    ),
    "vm_finance": ("overview:read", "businesses:read", "orders:read", "payments:read", "audit:read"),
    "vm_support": ("overview:read", "requests:read", "businesses:read", "orders:read", "sites:read"),
}


def operations_identity_from_user(user: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Resolve the corporate role without granting KREATON support broad access."""

    metadata = user.get("app_metadata")
    if not isinstance(metadata, dict):
        return None
    role = str(metadata.get("vm_role") or "").strip().lower()
    legacy_bridge = False
    if not role and str(metadata.get("kreaton_role") or "").strip().lower() == "super_admin":
        # Transitional owner bridge. Remove after vm_role is assigned in Supabase.
        role = "vm_super_admin"
        legacy_bridge = True
    if role not in OPERATIONS_ROLES:
        return None
    return {
        "id": str(user.get("id") or user.get("sub") or "").strip(),
        "email": str(user.get("email") or "").strip().lower(),
        "role": role,
        "permissions": list(OPERATIONS_ROLE_PERMISSIONS[role]),
        "legacyRoleBridge": legacy_bridge,
    }


def require_operations_permission(identity: Dict[str, Any], permission: str) -> None:
    if permission not in identity.get("permissions", []):
        raise HTTPException(status_code=403, detail="Operations permission denied.")


def set_operations_session_cookie(response: Response, access_token: str) -> None:
    response.set_cookie(
        key=OPERATIONS_SESSION_COOKIE_NAME,
        value=access_token,
        max_age=OPERATIONS_SESSION_COOKIE_MAX_AGE,
        httponly=True,
        secure=True,
        samesite="none",
        path="/api/operations",
        domain=os.getenv("SESSION_COOKIE_DOMAIN", ".vmbusinesssystems.com"),
    )


def clear_operations_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=OPERATIONS_SESSION_COOKIE_NAME,
        path="/api/operations",
        domain=os.getenv("SESSION_COOKIE_DOMAIN", ".vmbusinesssystems.com"),
        secure=True,
        samesite="none",
    )
