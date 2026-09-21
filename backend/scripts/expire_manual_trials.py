"""Run the existing KB-4 expiry scan with database access, without HTTP or Stripe."""
import argparse
import json
import os
from pathlib import Path
import sys
from uuid import uuid4


def batch_limit(value):
    limit = int(value)
    if not 1 <= limit <= 500:
        raise argparse.ArgumentTypeError("limit must be between 1 and 500")
    return limit


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=batch_limit, default=100)
    args = parser.parse_args(argv)
    request_id = f"cron-manual-trials-{uuid4().hex}"
    if not os.environ.get("DATABASE_URL", "").strip():
        print(json.dumps({"status": "error", "error": "missing_database_url",
            "requestId": request_id}), file=sys.stderr)
        return 2

    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    try:
        from app.db import SessionLocal
        from app.manual_trial_expiry import expire_manual_trials

        with SessionLocal() as session:
            result = expire_manual_trials(session,
                {"id": "system:manual-trial-expiry", "role": "system"},
                request_id, limit=args.limit)
    except Exception as error:
        # Exception messages can contain DB credentials, SQL parameters or customer data.
        print(json.dumps({"status": "error", "error": type(error).__name__,
            "requestId": request_id,
            "message": "Expiry scan failed; earlier per-subscription commits may remain. Retry is safe."}),
            file=sys.stderr)
        return 1
    print(json.dumps({"status": "ok", "requestId": request_id, **result}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
