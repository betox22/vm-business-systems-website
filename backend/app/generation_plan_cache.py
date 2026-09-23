from __future__ import annotations

import hashlib
import json
import secrets
import time

from sqlalchemy import delete
from sqlalchemy.orm import Session

from .db_models import PreparedGenerationRecord
from .models import ProjectState


PLAN_TTL_SECONDS = 1800
PLAN_MAX_BYTES = 262144
INPUT_FIELDS = (
    "businessName",
    "businessDescription",
    "industry",
    "location",
    "servicesProducts",
    "brandsCarried",
    "targetAudience",
    "preferredTone",
    "preferredColors",
    "contactInfo",
    "selectedLanguage",
    "salesFlow",
    "logoPreference",
    "logoBrief",
    "logoPalette",
    "photoUrls",
    "videoUrls",
)


def _fingerprint(state: ProjectState) -> str:
    collection_fields = {"servicesProducts", "brandsCarried", "logoPalette", "photoUrls", "videoUrls", "contactInfo"}
    values = {field: getattr(state, field) for field in INPUT_FIELDS}
    for field in INPUT_FIELDS:
        if field not in collection_fields:
            values[field] = values[field] or ""
    values["logoUrl"] = "" if state.logoPreference == "generate_ai_logo" else state.logoUrl or ""
    values["salesMode"] = state.salesMode or state.salesFlow
    encoded = json.dumps(values, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode()
    return hashlib.sha256(encoded).hexdigest()


def store_prepared_generation(session: Session, source: ProjectState, prepared: ProjectState) -> str:
    state_json = prepared.model_dump_json(exclude={"runtimeAvailableTemplateIds"})
    if len(state_json.encode()) > PLAN_MAX_BYTES:
        return ""
    token = secrets.token_urlsafe(32)
    now = int(time.time())
    session.execute(delete(PreparedGenerationRecord).where(PreparedGenerationRecord.expires_at < now))
    session.add(PreparedGenerationRecord(
        id=hashlib.sha256(token.encode()).hexdigest(),
        input_hash=_fingerprint(source),
        state_json=state_json,
        expires_at=now + PLAN_TTL_SECONDS,
    ))
    session.commit()
    return token


def load_prepared_generation(
    session: Session,
    token: str,
    current: ProjectState,
) -> ProjectState | None:
    if not token or len(token) > 128:
        return None
    record = session.get(PreparedGenerationRecord, hashlib.sha256(token.encode()).hexdigest())
    if not record or record.expires_at <= int(time.time()):
        return None
    if record.input_hash != _fingerprint(current):
        return None
    prepared = ProjectState.model_validate_json(record.state_json)
    if current.selectedTemplateId and prepared.selectedTemplateId != current.selectedTemplateId:
        return None
    if prepared.selectedTemplateId not in (current.runtimeAvailableTemplateIds or []):
        return None
    prepared.runtimeAvailableTemplateIds = current.runtimeAvailableTemplateIds
    prepared.logoUrl = current.logoUrl or prepared.logoUrl
    prepared.logoGenerationStatus = current.logoGenerationStatus or prepared.logoGenerationStatus
    prepared.colorProvenance = current.colorProvenance
    return prepared
