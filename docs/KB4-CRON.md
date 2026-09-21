# KB-4 direct database cron

Render command (Root Directory: backend): `python scripts/expire_manual_trials.py`.
Build: `pip install -r requirements.txt`. Intended schedule: `0 * * * *`.
This change does not configure or deploy Render.

Requires an explicit DATABASE_URL for the intended database and the backend's
existing dependencies. It does not load a .env file, create tables, run migrations,
call HTTP, use a human admin session, or require INTERNAL_CRON_SECRET/Stripe keys.
Confirm the cron service has its own correct DATABASE_URL before deployment;
configuration is not automatically inherited from the API service.

The script calls app.manual_trial_expiry.expire_manual_trials directly with the
system:manual-trial-expiry actor and role system. Each run has a unique request ID.
Existing business eligibility and audit actions are unchanged. It processes up to
100 rows per run; --limit accepts 1..500. Subsequent runs drain larger backlogs.

Exit codes: 0 successful scan (including no eligible rows), 1 execution/DB failure,
2 missing DATABASE_URL or invalid CLI arguments. Stdout is a JSON success record;
runtime errors are JSON on stderr with exception type, never raw credentials/SQL.
Argument parsing errors use argparse's stderr diagnostic.

The existing function commits each subscription transition with its audit, then
records the final scan. A failure can leave earlier subscriptions committed; the
script reports failure, not total rollback. Subsequent runs safely recheck eligible
rows. It does not retry internally or change the existing transaction ownership.

Historical investigation: neither backend/scripts/expire_manual_trials.py nor
scripts/expire_manual_trials.py is present in reachable local/remote Git history.
An untracked HTTP-based version exists in the separate worktree
kreaton-plans-trial-safety on feature/kreaton-trial-cron, alongside uncommitted
machine-auth changes and setup instructions. Those changes never reached main.
That worktree is untouched; this direct-DB implementation supersedes its HTTP
entrypoint design without merging its authentication changes.

Release gate: inspect diff and test evidence first. Then deploy the script and
verify a real scheduled run plus its audit. Successful build or local tests alone
do not prove that the production cron has run successfully.
