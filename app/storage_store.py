import base64
import json
import re
from datetime import UTC, datetime
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import ProxyHandler, Request, build_opener

from .config import get_settings
from .schemas import AssetUploadPayload
from .supabase_store import SupabaseNotConfiguredError

BUCKET = "site-assets"
MAX_IMAGE_BYTES = 10 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
}

_NO_PROXY_OPENER = build_opener(ProxyHandler({}))


def upload_site_asset(payload: AssetUploadPayload) -> dict[str, Any]:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise SupabaseNotConfiguredError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required."
        )

    mime_type, content = _decode_data_url(payload.data_url)
    content_type = (payload.content_type or mime_type).lower()
    if content_type not in ALLOWED_IMAGE_TYPES or mime_type not in ALLOWED_IMAGE_TYPES:
        raise ValueError("Only image uploads are allowed.")
    if len(content) > MAX_IMAGE_BYTES:
        raise ValueError("Image is too large. Maximum size is 10 MB.")

    path = _asset_path(payload, content_type)
    _upload_object(path, content, content_type)
    public_url = (
        f"{settings.supabase_url.rstrip('/')}/storage/v1/object/public/"
        f"{BUCKET}/{quote(path, safe='/')}"
    )
    asset = _record_asset(payload, public_url, path, content_type, len(content))
    return {
        "url": public_url,
        "path": path,
        "bucket": BUCKET,
        "asset_id": asset.get("id") if asset else None,
    }


def _decode_data_url(value: str) -> tuple[str, bytes]:
    match = re.fullmatch(r"data:([^;,]+);base64,(.+)", value.strip(), flags=re.DOTALL)
    if not match:
        raise ValueError("Upload must be a base64 data URL.")
    try:
        return match.group(1).lower(), base64.b64decode(match.group(2), validate=True)
    except ValueError as error:
        raise ValueError("Upload data is not valid base64.") from error


def _asset_path(payload: AssetUploadPayload, content_type: str) -> str:
    business = _safe_segment(payload.business_id or "unassigned")
    site = _safe_segment(payload.site_id or "intake")
    asset_type = _safe_segment(payload.asset_type)
    timestamp = datetime.now(UTC).strftime("%Y%m%d%H%M%S%f")
    filename = _safe_filename(payload.file_name, content_type)
    return f"{business}/{site}/{asset_type}/{timestamp}-{filename}"


def _safe_segment(value: str) -> str:
    compact = re.sub(r"[^a-zA-Z0-9_-]+", "-", value or "").strip("-")
    return compact[:80] or "unassigned"


def _safe_filename(value: str, content_type: str) -> str:
    filename = re.sub(r"[^a-zA-Z0-9._-]+", "-", value or "").strip(".-")
    filename = filename[:120] or "asset"
    if "." not in filename:
        filename = f"{filename}.{_extension_for_mime(content_type)}"
    return filename


def _extension_for_mime(content_type: str) -> str:
    return {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
        "image/svg+xml": "svg",
    }.get(content_type, "img")


def _upload_object(path: str, content: bytes, content_type: str) -> None:
    settings = get_settings()
    url = f"{settings.supabase_url.rstrip('/')}/storage/v1/object/{BUCKET}/{quote(path, safe='/')}"
    request = Request(
        url,
        data=content,
        method="POST",
        headers={
            "apikey": settings.supabase_service_role_key or "",
            "authorization": f"Bearer {settings.supabase_service_role_key}",
            "content-type": content_type,
            "x-upsert": "true",
        },
    )
    try:
        with _NO_PROXY_OPENER.open(request, timeout=30) as response:
            response.read()
    except HTTPError as error:
        details = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Supabase asset upload failed: {details}") from error
    except URLError as error:
        raise RuntimeError(f"Supabase asset upload unavailable: {error.reason}") from error


def _record_asset(
    payload: AssetUploadPayload,
    public_url: str,
    path: str,
    content_type: str,
    size_bytes: int,
) -> dict[str, Any] | None:
    record = {
        "business_id": _uuid_or_none(payload.business_id),
        "site_id": _uuid_or_none(payload.site_id),
        "asset_type": payload.asset_type,
        "label": payload.label or payload.file_name,
        "url": public_url,
        "metadata": {
            "bucket": BUCKET,
            "path": path,
            "content_type": content_type,
            "size_bytes": size_bytes,
        },
    }
    asset = _insert("assets", record)
    if payload.site_id:
        _insert("site_assets", record)
    return asset


def _insert(table: str, payload: dict[str, Any]) -> dict[str, Any]:
    settings = get_settings()
    clean_payload = {key: value for key, value in payload.items() if value is not None}
    body = json.dumps(clean_payload).encode("utf-8")
    request = Request(
        f"{settings.supabase_url.rstrip('/')}/rest/v1/{table}",
        data=body,
        method="POST",
        headers={
            "apikey": settings.supabase_service_role_key or "",
            "authorization": f"Bearer {settings.supabase_service_role_key}",
            "content-type": "application/json",
            "prefer": "return=representation",
        },
    )
    try:
        with _NO_PROXY_OPENER.open(request, timeout=20) as response:
            decoded = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        details = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Supabase insert failed for {table}: {details}") from error
    except URLError as error:
        raise RuntimeError(f"Supabase insert unavailable for {table}: {error.reason}") from error
    return decoded[0] if decoded else {}


def _uuid_or_none(value: str | None) -> str | None:
    if not value:
        return None
    if re.fullmatch(
        r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}",
        value,
    ):
        return value
    return None
