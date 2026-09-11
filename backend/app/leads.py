from __future__ import annotations

import html
import logging
import os
import re
from typing import Any, Dict, Literal

import httpx
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from .db import get_session
from .db_models import Lead


logger = logging.getLogger("kreaton.leads")
router = APIRouter(prefix="/api/v1/leads", tags=["leads"])


class LeadCreate(BaseModel):
    businessName: str = Field(min_length=2, max_length=160)
    taxId: str = Field(default="", max_length=80)
    contactName: str = Field(min_length=2, max_length=160)
    contactEmail: str = Field(default="", max_length=200)
    phone: str = Field(min_length=7, max_length=40)
    solutionType: Literal["solution", "app", "custom"]
    location: str = Field(min_length=2, max_length=160)
    assignedRepresentative: str = Field(default="", max_length=160)
    comment: str = Field(default="", max_length=2000)
    website: str = Field(default="", max_length=200)  # honeypot; hidden from people

    @field_validator("contactEmail")
    @classmethod
    def valid_optional_email(cls, value: str) -> str:
        value = value.strip().lower()
        if value and not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value):
            raise ValueError("Enter a valid email address.")
        return value

    @field_validator("phone")
    @classmethod
    def valid_phone(cls, value: str) -> str:
        value = value.strip()
        if len(re.sub(r"\D", "", value)) < 7 or not re.fullmatch(r"[+()\-\s.0-9]+", value):
            raise ValueError("Enter a valid phone number.")
        return value


def _clean(value: str) -> str:
    return " ".join(value.strip().split())


async def _notify_lead(lead: Lead) -> str:
    api_key = os.getenv("RESEND_API_KEY", "").strip()
    notify_email = os.getenv("LEADS_NOTIFY_EMAIL", "").strip()
    from_email = os.getenv("LEADS_FROM_EMAIL", "").strip()
    if not api_key or not notify_email or not from_email:
        logger.warning("Lead %s saved; email notification skipped because Resend is not configured.", lead.id)
        return "not_configured"

    rows = [
        ("Referencia", lead.id), ("Negocio", lead.business_name), ("RIF / identificación", lead.tax_id or "No indicado"),
        ("Contacto", lead.contact_name), ("Email", lead.contact_email or "No indicado"), ("Teléfono / WhatsApp", lead.phone),
        ("Solución", lead.solution_type), ("País / ciudad", lead.location),
        ("Representante", lead.assigned_representative or "No indicado"), ("Comentario", lead.comment or "Sin comentario"),
    ]
    body = "".join(f"<tr><th align='left'>{html.escape(label)}</th><td>{html.escape(value)}</td></tr>" for label, value in rows)
    message: Dict[str, Any] = {
        "from": from_email,
        "to": [notify_email],
        "subject": f"Nueva solicitud {lead.id}: {lead.business_name}",
        "html": f"<h2>Nueva solicitud comercial</h2><table cellpadding='7'>{body}</table>",
    }
    if lead.contact_email:
        message["reply_to"] = lead.contact_email
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {api_key}", "Idempotency-Key": lead.id},
                json=message,
            )
        if response.is_success:
            return "sent"
        logger.error("Lead %s saved; Resend notification failed status=%s body=%s", lead.id, response.status_code, response.text[:300])
        return "failed"
    except httpx.HTTPError as exc:
        logger.error("Lead %s saved; Resend notification failed: %s", lead.id, exc)
        return "failed"


@router.post("")
async def create_lead(payload: LeadCreate, request: Request, session: Session = Depends(get_session)) -> Dict[str, Any]:
    if payload.website:
        logger.info("Lead honeypot rejected ip=%s", request.client.host if request.client else "unknown")
        return {"received": True, "reference": "SOL-RECIBIDA"}

    lead = Lead(
        business_name=_clean(payload.businessName), tax_id=_clean(payload.taxId), contact_name=_clean(payload.contactName),
        contact_email=payload.contactEmail, phone=payload.phone, solution_type=payload.solutionType,
        location=_clean(payload.location), assigned_representative=_clean(payload.assignedRepresentative), comment=payload.comment.strip(),
    )
    session.add(lead)
    session.commit()
    session.refresh(lead)
    lead.notification_status = await _notify_lead(lead)
    session.commit()
    return {"received": True, "leadId": lead.id, "reference": lead.id.upper().replace("LEAD_", "SOL-")}
