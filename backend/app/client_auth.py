from __future__ import annotations

import os
from typing import Any, Dict, Optional

import httpx


def supabase_auth_configured() -> bool:
    return bool(os.getenv("SUPABASE_URL")) and bool(os.getenv("SUPABASE_SERVICE_ROLE_KEY"))


def fetch_supabase_user(access_token: str) -> Optional[Dict[str, Any]]:
    """Ask Supabase Auth to validate a client access token and return its user.

    This proxies to Supabase's own `GET /auth/v1/user` instead of verifying the
    JWT locally. That keeps this backend from having to manage Supabase's
    signing keys/JWKS at all, and -- unlike a local signature check -- it also
    respects live session state (a token from a session the user has since
    logged out of correctly fails here, since Supabase checks that too, not
    just the signature). Mirrors the sync-client pattern already used in
    storage.py/agents.py in this backend.
    """

    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not service_key or not access_token:
        return None
    try:
        response = httpx.get(
            f"{supabase_url.rstrip('/')}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {access_token}",
                "apikey": service_key,
            },
            timeout=10.0,
        )
    except httpx.HTTPError:
        return None
    if response.status_code != 200:
        return None
    return response.json()
