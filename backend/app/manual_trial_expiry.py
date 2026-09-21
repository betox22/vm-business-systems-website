"""Bounded, repeatable safety net, invoked by an authenticated super-admin."""
import time

from sqlalchemy import select

from .admin_audit import record_admin_audit_event
from .db_models import PlatformSubscription


def expire_manual_trials(session, actor, request_id, *, limit=100, now=None):
    cutoff = int(time.time()) if now is None else now
    eligible = (
        PlatformSubscription.product == "kreaton",
        PlatformSubscription.payment_method == "manual",
        PlatformSubscription.stripe_subscription_id.is_(None),
        PlatformSubscription.status.in_(("pending_manual_confirmation", "trialing")),
        PlatformSubscription.trial_end.is_not(None),
        PlatformSubscription.trial_end <= cutoff,
    )
    ids = session.scalars(select(PlatformSubscription.id).where(*eligible)
        .order_by(PlatformSubscription.trial_end, PlatformSubscription.id).limit(limit)).all()
    expired = []
    for sub_id in ids:
        # Recheck under a row lock: confirmation and concurrent workers cannot
        # race an expiry. Each mutation and its audit event commit together.
        row = session.scalar(select(PlatformSubscription).where(
            PlatformSubscription.id == sub_id, *eligible).with_for_update())
        if not row:
            continue
        previous = row.status
        row.status = "past_due"
        record_admin_audit_event(session, actor=actor, request_id=request_id,
            action="admin.subscription.manual_trial_expired", target_type="platform_subscription",
            target_id=row.id, outcome="success", metadata={"fromStatus": previous,
                "toStatus": "past_due", "trialEnd": row.trial_end, "source": "local_manual_trial"})
        expired.append(sub_id)
    record_admin_audit_event(session, actor=actor, request_id=request_id,
        action="admin.subscription.expiry_scan", target_type="platform_subscription",
        target_id="kreaton_manual", outcome="success", metadata={"expiredCount": len(expired), "cutoff": cutoff})
    return {"expiredIds": expired, "expiredCount": len(expired), "batchLimit": limit, "cutoff": cutoff}
