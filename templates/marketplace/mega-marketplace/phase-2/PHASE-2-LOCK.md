# Phase 2 Lock

Template: Mega Marketplace
Phase: API Gateway and Authentication
Status: approved and locked
Date: 2026-07-08

## Locked Scope

Phase 2 is closed with these decisions:

- Backend framework: Laravel
- Authentication: Laravel Sanctum
- API style: RESTful JSON API under `/api/v1`
- Roles: `admin`, `vendor`, `customer`, `support`
- Route protection:
  - `auth:sanctum` for authenticated API access
  - `role:*` middleware for broad role checks
  - Laravel policies for ownership checks
- Checkout mutation safety:
  - `Idempotency-Key` required for order placement
- Vendor security:
  - vendor users must only access records scoped to their own `vendor_id`

## Not Included Yet

These belong to later phases:

- Multi-vendor cart split implementation
- Vendor payout calculation implementation
- Real Laravel project creation
- Migrations generated from the SQL contract
- Payment provider integration
- Production frontend integration

Do not change Phase 2 decisions casually. If a later requirement forces a
change, document the reason and update the phase lock with a new entry.
