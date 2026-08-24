from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Dict, MutableMapping

from sqlalchemy import select
from sqlalchemy.orm import Session

from .db_models import DomainReservation, GeneratedSite
from .storage import StorageError


class ProjectNameMismatchError(ValueError):
    pass


class ProjectAssetDeletionError(RuntimeError):
    pass


@dataclass(frozen=True)
class ProjectDeletionResult:
    project_id: str
    business_name: str
    deleted_assets: int
    deleted_intake_sessions: int

    def as_response(self) -> Dict[str, Any]:
        return {
            "deleted": True,
            "project_id": self.project_id,
            "business_name": self.business_name,
            "deleted_assets": self.deleted_assets,
            "deleted_intake_sessions": self.deleted_intake_sessions,
        }


def _confirmed_name(value: str) -> str:
    return " ".join(str(value or "").split()).casefold()


def _intake_session_keys_for_project(
    intake_sessions: MutableMapping[str, Dict[str, Any]],
    owner_email: str,
    project_id: str,
) -> list[str]:
    clean_email = str(owner_email or "").strip().lower()
    clean_project_id = str(project_id or "").strip()
    expected_key = f"{clean_email}:{clean_project_id or 'active'}"
    keys: list[str] = []
    for key, value in intake_sessions.items():
        session_email = str(value.get("clientEmail") or value.get("client_email") or "").strip().lower()
        draft = value.get("draft") if isinstance(value.get("draft"), dict) else {}
        session_project_ids = {
            str(value.get(field) or "").strip()
            for field in ("projectId", "generatedSiteId", "siteId")
        }
        session_project_ids.update(
            str(draft.get(field) or "").strip()
            for field in ("projectId", "generatedSiteId", "siteId")
        )
        owner_matches = not clean_email or session_email == clean_email or key.startswith(f"{clean_email}:")
        if (clean_project_id in session_project_ids or key == expected_key) and owner_matches:
            keys.append(key)
    return keys


def delete_generated_project(
    session: Session,
    *,
    site: GeneratedSite,
    confirmed_business_name: str,
    intake_sessions: MutableMapping[str, Dict[str, Any]],
    asset_deleter: Callable[..., int],
) -> ProjectDeletionResult:
    """Delete one already-authorized project and its owned side effects."""

    if _confirmed_name(confirmed_business_name) != _confirmed_name(site.business_name):
        raise ProjectNameMismatchError("Business name does not match this project.")

    try:
        deleted_assets = asset_deleter(business_id=site.store_id, site_id=site.id)
    except StorageError as exc:
        raise ProjectAssetDeletionError("Could not remove the project's stored assets.") from exc

    intake_session_keys = _intake_session_keys_for_project(
        intake_sessions,
        site.owner_email,
        site.id,
    )
    reservations = session.scalars(
        select(DomainReservation).where(DomainReservation.generated_site_id == site.id)
    ).all()
    for reservation in reservations:
        reservation.generated_site_id = None

    result = ProjectDeletionResult(
        project_id=site.id,
        business_name=site.business_name,
        deleted_assets=deleted_assets,
        deleted_intake_sessions=len(intake_session_keys),
    )
    session.delete(site)
    try:
        session.commit()
    except Exception:
        session.rollback()
        raise

    for key in intake_session_keys:
        intake_sessions.pop(key, None)
    return result
