from __future__ import annotations

import base64
import os
import re
import uuid
from typing import Tuple

import httpx


class StorageError(Exception):
    """Raised when an asset cannot be uploaded to the configured storage provider."""


def supabase_storage_configured() -> bool:
    return bool(os.getenv("SUPABASE_URL")) and bool(os.getenv("SUPABASE_SERVICE_ROLE_KEY"))


def _supabase_bucket() -> str:
    return os.getenv("SUPABASE_STORAGE_BUCKET", "site-assets")


def _supabase_private_bucket() -> str:
    return os.getenv("SUPABASE_PRIVATE_BUCKET", "private-assets")


def parse_data_url(data_url: str) -> Tuple[bytes, str]:
    """Split a `data:<mime>;base64,<payload>` string into (bytes, mime_type)."""

    match = re.match(r"^data:([^;,]+)?(;base64)?,(.*)$", data_url or "", re.S)
    if not match:
        raise StorageError("Invalid data URL.")
    mime_type = match.group(1) or "application/octet-stream"
    is_base64 = bool(match.group(2))
    payload = match.group(3) or ""
    if not is_base64:
        raise StorageError("Only base64-encoded data URLs are supported.")
    try:
        return base64.b64decode(payload), mime_type
    except Exception as error:
        raise StorageError(f"Could not decode file data: {error}") from error


def _safe_segment(value: str, fallback: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9._-]+", "-", str(value or "").strip())
    return cleaned.strip("-") or fallback


def upload_asset_to_supabase(
    *,
    business_id: str,
    site_id: str,
    asset_type: str,
    file_name: str,
    content_type: str,
    data: bytes,
) -> str:
    """Upload raw bytes to Supabase Storage and return a public URL.

    Uses the Supabase Storage REST API directly (POST /storage/v1/object/{bucket}/{path})
    with the service role key, so no extra SDK dependency is needed. This intentionally
    stays a plain sync function using httpx's sync client, matching the sync-call pattern
    already used elsewhere in this backend (see generate_ai_seed_catalog in agents.py) so
    it can be called from both sync and async call sites without threading async through
    the whole chain.
    """

    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not service_key:
        raise StorageError("Supabase storage is not configured on the server.")

    bucket = _supabase_bucket()
    business_segment = _safe_segment(business_id, "no-business")
    site_segment = _safe_segment(site_id, "no-site")
    type_segment = _safe_segment(asset_type, "asset")
    name_segment = _safe_segment(file_name, "file")
    object_path = f"{business_segment}/{site_segment}/{type_segment}/{uuid.uuid4().hex[:12]}-{name_segment}"

    upload_url = f"{supabase_url.rstrip('/')}/storage/v1/object/{bucket}/{object_path}"
    headers = {
        "Authorization": f"Bearer {service_key}",
        "apikey": service_key,
        "Content-Type": content_type or "application/octet-stream",
        "x-upsert": "true",
    }

    try:
        response = httpx.post(upload_url, headers=headers, content=data, timeout=20.0)
    except httpx.HTTPError as error:
        raise StorageError(f"Could not reach Supabase storage: {error}") from error

    if response.status_code >= 400:
        raise StorageError(
            f"Supabase storage upload failed ({response.status_code}): {response.text[:300]}"
        )

    return f"{supabase_url.rstrip('/')}/storage/v1/object/public/{bucket}/{object_path}"


def _upload_to_supabase_bucket(
    *,
    bucket: str,
    object_path: str,
    content_type: str,
    data: bytes,
) -> None:
    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not service_key:
        raise StorageError("Supabase storage is not configured on the server.")

    try:
        response = httpx.post(
            f"{supabase_url.rstrip('/')}/storage/v1/object/{bucket}/{object_path}",
            headers={
                "Authorization": f"Bearer {service_key}",
                "apikey": service_key,
                "Content-Type": content_type or "application/octet-stream",
                "x-upsert": "true",
            },
            content=data,
            timeout=20.0,
        )
    except httpx.HTTPError as error:
        raise StorageError(f"Could not reach Supabase storage: {error}") from error
    if response.status_code >= 400:
        raise StorageError(f"Supabase storage upload failed ({response.status_code}): {response.text[:300]}")


def upload_private_asset_to_supabase(
    *,
    business_id: str,
    site_id: str,
    asset_type: str,
    file_name: str,
    content_type: str,
    data: bytes,
) -> str:
    """Upload an original asset and return only its private object path."""

    object_path = "/".join((
        _safe_segment(business_id, "no-business"),
        _safe_segment(site_id, "no-site"),
        _safe_segment(asset_type, "asset"),
        f"{uuid.uuid4().hex[:12]}-{_safe_segment(file_name, 'file')}",
    ))
    _upload_to_supabase_bucket(
        bucket=_supabase_private_bucket(),
        object_path=object_path,
        content_type=content_type,
        data=data,
    )
    return object_path


def create_signed_url(bucket: str, object_path: str, expires_in: int = 300) -> str:
    """Return a short-lived download URL for an object in a private bucket."""

    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not service_key:
        raise StorageError("Supabase storage is not configured on the server.")
    try:
        response = httpx.post(
            f"{supabase_url.rstrip('/')}/storage/v1/object/sign/{bucket}/{object_path}",
            headers={"Authorization": f"Bearer {service_key}", "apikey": service_key},
            json={"expiresIn": max(30, min(int(expires_in), 3600))},
            timeout=15.0,
        )
    except httpx.HTTPError as error:
        raise StorageError(f"Could not reach Supabase storage: {error}") from error
    if response.status_code >= 400:
        raise StorageError(f"Supabase signed URL failed ({response.status_code}): {response.text[:300]}")
    signed_path = str(response.json().get("signedURL") or "").strip()
    if not signed_path:
        raise StorageError("Supabase did not return a signed URL.")
    return signed_path if signed_path.startswith("http") else f"{supabase_url.rstrip('/')}{signed_path}"


def download_private_asset_from_supabase(object_path: str) -> bytes:
    """Read a private object with the service role. Never expose this URL."""

    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not service_key:
        raise StorageError("Supabase storage is not configured on the server.")
    try:
        response = httpx.get(
            f"{supabase_url.rstrip('/')}/storage/v1/object/{_supabase_private_bucket()}/{object_path}",
            headers={"Authorization": f"Bearer {service_key}", "apikey": service_key},
            timeout=20.0,
        )
    except httpx.HTTPError as error:
        raise StorageError(f"Could not reach Supabase storage: {error}") from error
    if response.status_code >= 400:
        raise StorageError(f"Supabase private download failed ({response.status_code}): {response.text[:300]}")
    return response.content
