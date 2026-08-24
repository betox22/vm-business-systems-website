from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Mapping, Sequence

import httpx

from .db_models import GeneratedSite, Store


class SupabaseAdminDirectoryError(RuntimeError):
    pass


def fetch_supabase_admin_users(*, page_size: int = 1000, max_pages: int = 20) -> List[Dict[str, Any]]:
    """List Auth users server-side with the privileged Supabase credential."""

    supabase_url = str(os.getenv("SUPABASE_URL") or "").strip().rstrip("/")
    service_key = str(os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "").strip()
    if not supabase_url or not service_key:
        raise SupabaseAdminDirectoryError("Supabase Admin API is not configured.")

    users: List[Dict[str, Any]] = []
    for page in range(1, max_pages + 1):
        try:
            response = httpx.get(
                f"{supabase_url}/auth/v1/admin/users",
                params={"page": page, "per_page": page_size},
                headers={
                    "Authorization": f"Bearer {service_key}",
                    "apikey": service_key,
                },
                timeout=15.0,
            )
        except httpx.HTTPError as exc:
            raise SupabaseAdminDirectoryError("Supabase Admin API request failed.") from exc
        if response.status_code != 200:
            raise SupabaseAdminDirectoryError(
                f"Supabase Admin API returned HTTP {response.status_code}."
            )
        try:
            payload = response.json()
        except ValueError as exc:
            raise SupabaseAdminDirectoryError(
                "Supabase Admin API returned invalid JSON."
            ) from exc
        page_users = payload.get("users") if isinstance(payload, dict) else None
        if not isinstance(page_users, list):
            raise SupabaseAdminDirectoryError("Supabase Admin API returned an invalid user list.")
        users.extend(user for user in page_users if isinstance(user, dict))
        if len(page_users) < page_size:
            return users

    raise SupabaseAdminDirectoryError("Supabase user directory exceeded the safe pagination limit.")


def _normalized_email(value: Any) -> str:
    return str(value or "").strip().lower()


def _timestamp(value: Any) -> float:
    text = str(value or "").strip()
    if not text:
        return 0.0
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return 0.0


def _account_status(user: Mapping[str, Any]) -> str:
    if user.get("deleted_at"):
        return "deleted"
    banned_until = _timestamp(user.get("banned_until"))
    if banned_until > datetime.now(timezone.utc).timestamp():
        return "suspended"
    if not (user.get("email_confirmed_at") or user.get("confirmed_at")):
        return "unverified"
    return "active"


def _belongs_to_user(owner_user_id: Any, owner_email: Any, user_id: str, email: str) -> bool:
    clean_owner_id = str(owner_user_id or "").strip()
    return (clean_owner_id and clean_owner_id == user_id) or (
        not clean_owner_id and _normalized_email(owner_email) == email
    )


def _project_item(site: GeneratedSite) -> Dict[str, Any]:
    return {
        "id": site.id,
        "businessName": site.business_name,
        "templateId": site.template_id,
        "templateName": site.template_name,
        "status": site.status,
        "publicUrl": site.public_url,
        "createdAt": site.created_at,
        "updatedAt": site.updated_at,
    }


def build_admin_client_directory(
    users: Iterable[Mapping[str, Any]],
    stores: Sequence[Store],
    sites: Sequence[GeneratedSite],
    *,
    query: str = "",
    status: str = "",
    template_id: str = "",
) -> List[Dict[str, Any]]:
    search = str(query or "").strip().lower()
    status_filter = str(status or "").strip().lower()
    template_filter = str(template_id or "").strip().lower()
    rows: List[Dict[str, Any]] = []

    for user in users:
        user_id = str(user.get("id") or user.get("sub") or "").strip()
        email = _normalized_email(user.get("email"))
        if not user_id:
            continue
        owned_stores = [
            store for store in stores if _belongs_to_user(store.owner_user_id, store.owner_email, user_id, email)
        ]
        owned_sites = [
            site for site in sites if _belongs_to_user(site.owner_user_id, site.owner_email, user_id, email)
        ]
        owned_sites.sort(key=lambda site: (site.updated_at, site.created_at), reverse=True)

        project_items = [_project_item(site) for site in owned_sites]
        business_names = list(
            dict.fromkeys(
                [site.business_name for site in owned_sites if site.business_name]
                + [store.name for store in owned_stores if store.name]
            )
        )
        template_ids = list(dict.fromkeys(site.template_id for site in owned_sites if site.template_id))
        project_statuses = list(dict.fromkeys(site.status for site in owned_sites if site.status))
        account_status = _account_status(user)
        row = {
            "id": user_id,
            "email": email,
            "createdAt": user.get("created_at"),
            "lastSignInAt": user.get("last_sign_in_at"),
            "accountStatus": account_status,
            "businessName": business_names[0] if business_names else "",
            "businessNames": business_names,
            "templateIds": template_ids,
            "projectStatuses": project_statuses,
            "projectCount": len(project_items),
            "projects": project_items,
        }

        searchable = " ".join([email, *business_names, *template_ids]).lower()
        if search and search not in searchable:
            continue
        if template_filter and template_filter not in {item.lower() for item in template_ids}:
            continue
        if status_filter:
            status_matches = account_status == status_filter or status_filter in {
                item.lower() for item in project_statuses
            }
            if status_filter == "no_projects":
                status_matches = not project_items
            if not status_matches:
                continue
        rows.append(row)

    rows.sort(key=lambda row: _timestamp(row.get("createdAt")), reverse=True)
    return rows
