from __future__ import annotations

import base64
import os
import re
import uuid
from typing import Tuple

import httpx


class StorageError(Exception):
    """Raised when an asset cannot be uploaded to the configured storage provider."""


# This endpoint is called from the public guided-intake flow before a client
# has a real account (same reasoning as /api/luma/chat), so it can't require
# login without breaking that funnel. What it was missing -- and what
# actually matters for an unauthenticated endpoint that writes to Supabase
# Storage with the service-role key -- is a hard cap on what gets accepted:
# no size limit and no MIME whitelist meant anyone could push arbitrarily
# large or arbitrarily typed files into the bucket for free, unmetered.
# SVG is intentionally excluded: it's not a normal photo/logo format here and
# can carry embedded scripts that execute if the stored file is opened
# directly rather than rendered inside an <img> tag.
ALLOWED_IMAGE_MIME_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"}
ALLOWED_VIDEO_MIME_TYPES = {"video/mp4", "video/webm", "video/quicktime"}
MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB
MAX_VIDEO_BYTES = 20 * 1024 * 1024  # 20 MB, above the frontend's 12 MB client-side check


def supabase_storage_configured() -> bool:
    return bool(os.getenv("SUPABASE_URL")) and bool(os.getenv("SUPABASE_SERVICE_ROLE_KEY"))


def validate_upload(*, asset_type: str, content_type: str, data: bytes) -> None:
    """Reject uploads with a disallowed MIME type or an oversized payload.

    Called after parse_data_url so it validates the real decoded byte length
    and the actual declared MIME type, not just whatever the client claims
    up front.
    """

    if not data:
        raise StorageError("Uploaded file is empty.")

    normalized_type = (content_type or "").split(";")[0].strip().lower()
    is_video = str(asset_type or "").strip().lower() == "video"
    allowed = ALLOWED_VIDEO_MIME_TYPES if is_video else ALLOWED_IMAGE_MIME_TYPES
    if normalized_type not in allowed:
        raise StorageError(
            f"Unsupported file type '{normalized_type or 'unknown'}'. "
            f"Allowed types: {', '.join(sorted(allowed))}."
        )

    max_bytes = MAX_VIDEO_BYTES if is_video else MAX_IMAGE_BYTES
    if len(data) > max_bytes:
        raise StorageError(
            f"File is too large ({len(data) / (1024 * 1024):.1f} MB). "
            f"Maximum is {max_bytes // (1024 * 1024)} MB."
        )


def _supabase_bucket() -> str:
    return os.getenv("SUPABASE_STORAGE_BUCKET", "site-assets")


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
