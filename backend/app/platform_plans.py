"""KREATON plan registry; existing subscriptions retain their own Stripe Price."""
from __future__ import annotations

import hashlib
import json
import os

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select, insert as insert_row
from sqlalchemy.orm import Session

from .admin_audit import record_admin_audit_event
from .db_models import PlatformPlan, AdminAuditEvent
from .stripe_gateway import create_plan_price, read_plan_price


class PlanCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    planId: str = Field(pattern=r"^[a-z0-9][a-z0-9_]{0,79}$")
    displayName: str = Field(min_length=1, max_length=120)
    stripePriceId: str = Field(pattern=r"^price_[A-Za-z0-9]+$")
    trialDays: int = Field(ge=0, le=730)
    active: bool = True


class PlanEdit(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    version: int = Field(ge=1)
    displayName: str = Field(min_length=1, max_length=120)
    trialDays: int = Field(ge=0, le=730)
    active: bool


class PlanPriceEdit(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: int = Field(ge=1)
    amountCents: int = Field(gt=0, le=99999999)


def bootstrap_plans(engine):
    # Idempotent import of the already configured test plan, never an overwrite.
    price = os.getenv("STRIPE_KREATON_LEVEL_A_PRICE_ID", "").strip()
    with engine.begin() as connection:
        if engine.dialect.name == "postgresql":
            connection.exec_driver_sql("SET LOCAL lock_timeout = '5s'")
            connection.exec_driver_sql("REVOKE ALL ON platform_plans FROM PUBLIC")
            for role in ("anon", "authenticated"):
                if connection.exec_driver_sql("SELECT 1 FROM pg_roles WHERE rolname = %s", (role,)).scalar():
                    connection.exec_driver_sql(f"REVOKE ALL ON platform_plans FROM {role}")
        if not price:
            return
        from .billing import kreaton_trial_days
        if engine.dialect.name == "postgresql":
            from sqlalchemy.dialects.postgresql import insert
        elif engine.dialect.name == "sqlite":
            from sqlalchemy.dialects.sqlite import insert
        else:
            raise RuntimeError("Unsupported plan registry dialect")
        result = connection.execute(insert(PlatformPlan).values(
            product="kreaton", plan_id="level_a", display_name="Level A",
            stripe_price_id=price, trial_days=kreaton_trial_days(), active=True,
        ).on_conflict_do_nothing(index_elements=["product", "plan_id"]))
        if result.rowcount == 1:
            connection.execute(insert_row(AdminAuditEvent).values(
                actor_user_id="migration:kb3", actor_role="system", actor_email="",
                action="system.plan.imported", target_type="platform_plan", target_id="level_a",
                outcome="success", request_id="kb3-bootstrap",
                metadata_json=json.dumps({"source": "configured_level_a", "stripePriceId": price})))


def resolve_plan(session: Session, plan_id: str, *, manual: bool):
    plan = session.get(PlatformPlan, ("kreaton", plan_id))
    if plan:
        if not plan.active:
            raise HTTPException(409, "This plan is inactive.")
        return plan.stripe_price_id, plan.trial_days
    # Compatibility with KB-1/KB-2 until each old plan is imported. A registry
    # entry, including an inactive one, ALWAYS takes precedence over env values.
    from .billing import kreaton_trial_days
    name = f"STRIPE_KREATON_{plan_id.upper()}_PRICE_ID"
    price = os.getenv(name, "").strip()
    if not price and session.scalar(select(PlatformPlan.plan_id).where(PlatformPlan.product == "kreaton").limit(1)):
        raise HTTPException(404, "Plan not found.")
    if not price and not manual:
        raise HTTPException(503, f"{name} is not configured.")
    return price, kreaton_trial_days()


def plan_dict(plan):
    return {"product": plan.product, "planId": plan.plan_id, "displayName": plan.display_name,
            "stripePriceId": plan.stripe_price_id, "trialDays": plan.trial_days,
            "active": plan.active, "version": plan.version,
            "createdAt": plan.created_at, "updatedAt": plan.updated_at}


def audit_plan(session, actor, request_id, action, plan, before=None):
    result = plan_dict(plan)
    record_admin_audit_event(session, actor=actor, request_id=request_id, action=action,
        target_type="platform_plan", target_id=plan.plan_id, outcome="success",
        metadata={"before": before, "after": result})
    return result


def create_plan(session, payload, actor, request_id):
    if session.get(PlatformPlan, ("kreaton", payload.planId)):
        raise HTTPException(409, "Plan already exists.")
    read_plan_price(payload.stripePriceId)
    plan = PlatformPlan(product="kreaton", plan_id=payload.planId,
        display_name=payload.displayName.strip(), stripe_price_id=payload.stripePriceId,
        trial_days=payload.trialDays, active=payload.active)
    session.add(plan)
    session.flush()
    return audit_plan(session, actor, request_id, "admin.plan.created", plan)


def update_plan(session, plan_id, payload, actor, request_id):
    plan = session.scalar(select(PlatformPlan).where(
        PlatformPlan.product == "kreaton", PlatformPlan.plan_id == plan_id).with_for_update())
    if not plan:
        raise HTTPException(404, "Plan not found.")
    if plan.version != payload.version:
        raise HTTPException(409, "Plan changed. Refresh before saving.")
    before = plan_dict(plan)
    if isinstance(payload, PlanPriceEdit):
        # Stripe retries reuse the same key even if the DB transaction rolled back.
        key = hashlib.sha256(json.dumps([plan_id, plan.version, payload.amountCents]).encode()).hexdigest()
        plan.stripe_price_id = create_plan_price(plan.stripe_price_id, payload.amountCents, key)
        action = "admin.plan.price_replaced"
    else:
        plan.display_name = payload.displayName.strip()
        plan.trial_days = payload.trialDays
        plan.active = payload.active
        action = "admin.plan.updated"
    plan.version += 1
    session.flush()
    return audit_plan(session, actor, request_id, action, plan, before)
