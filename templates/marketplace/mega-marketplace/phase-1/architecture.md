# Phase 1 - System Architecture

Template: Mega Marketplace
Backend decision: Laravel
Database decision: MySQL
Status: Phase 1 draft, pending owner approval

## Exact Stack

### Backend

- Current Laravel-supported PHP version in production
- Current supported Laravel release, pinned when the real backend project is created
- Laravel Sanctum for API authentication
- Laravel Breeze or Jetstream for first-party login/dashboard scaffolding
- Laravel Queues for async jobs
- Laravel Scheduler for payout/accounting tasks
- Laravel Policies and Gates for role and ownership authorization
- Laravel Form Requests for input validation
- Laravel Resources for API response shaping

### Database

- MySQL 8.x
- InnoDB engine
- `utf8mb4` charset
- strict foreign keys
- transactional checkout flow
- append-only vendor ledger

### Frontend

- Decoupled frontend consuming Laravel API
- Recommended: Next.js or React
- Auth mode:
  - Same-site dashboard/frontend: Sanctum cookie session
  - Separate mobile app/API clients later: Sanctum token mode or dedicated OAuth layer

### Security Baseline

- No API secrets in frontend
- Authenticated API routes protected by Sanctum
- Role authorization through policies/gates
- Vendor access always scoped by `vendor_id`
- Checkout writes must be idempotent
- Ledger entries must be append-only
- Product media must be validated server-side
- Admin/vendor mutations must be audit logged in a later phase

## System Modules

1. Identity and access
   - Users
   - Customer accounts
   - Vendor owners
   - Admins
   - Support users

2. Vendor commerce
   - Vendor profiles
   - Vendor status
   - Commission rate
   - Payout tracking

3. Catalog
   - Products
   - Vendor ownership
   - Product status
   - Price and inventory status

4. Checkout
   - Parent customer order
   - Vendor-specific order split
   - Order items assigned to vendors
   - Payment provider references later

5. Accounting
   - Vendor ledger
   - Gross amount
   - Commission amount
   - Net amount
   - Pending, available, paid, reversed states

## Phase Boundaries

Phase 1 defines the architecture and schema only.

Phase 2 will add:

- API routes
- Laravel Sanctum setup
- login/register flow
- RBAC middleware
- policies
- vendor onboarding endpoints

Phase 3 will add:

- cart split service
- checkout transaction
- vendor order creation
- commission calculation
- vendor ledger write service

Phase 4 will add:

- storefront components
- cart state
- vendor dashboard UI
- admin marketplace UI

Do not implement Phase 2 until Phase 1 is approved.
