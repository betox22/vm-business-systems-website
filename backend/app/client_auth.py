from __future__ import annotations

import os
from typing import Any, Dict, Optional

import httpx
from fastapi import Cookie, Header, HTTPException


def authenticated_client_user(
    authorization: str, session_cookie: str = "", *, required: bool = True
) -> Optional[Dict[str, Any]]:
    token = authorization[7:].strip() if authorization.lower().startswith("bearer ") else ""
    token = token or (session_cookie or "").strip()
    if not token:
        if required:
            raise HTTPException(status_code=401, detail="Missing access token.")
        return None
    if not supabase_auth_configured():
        if required:
            raise HTTPException(status_code=503, detail="Account login is not configured on the server yet.")
        return None
    user = fetch_supabase_user(token)
    if not user:
        if required:
            raise HTTPException(status_code=401, detail="Invalid or expired session.")
        return None
    return user


def require_client_user(
    authorization: str = Header(default=""),
    luma_client_session: str = Cookie(default=""),
) -> Dict[str, Any]:
    return authenticated_client_user(authorization, luma_client_session)


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
