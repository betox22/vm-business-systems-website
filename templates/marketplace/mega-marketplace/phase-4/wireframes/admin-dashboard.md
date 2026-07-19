# Wireframe - Admin Dashboard

Template: Mega Marketplace  
Area: Admin Marketplace  
Screen: AdminDashboard  
Status: draft

## Purpose

Give the platform operator a high-level control center for marketplace health,
vendor risk, orders, moderation, and ledger exposure.

## Primary User Goals

- Monitor platform activity.
- Review vendor applications.
- See order volume and issue states.
- Track moderation queue.
- Watch commission and payout exposure.

## Layout Structure

```text
AdminDashboardShell
├── AdminSidebar
├── AdminTopbar
└── AdminDashboardMain
    ├── PlatformStatsCards
    ├── VendorApprovalQueueSummary
    ├── ProductModerationSummary
    ├── GlobalOrderSummary
    ├── PlatformLedgerSummary
    └── RiskAlertsPanel
```

## Required Metrics

- marketplace gross volume
- commission earned
- pending vendor payouts
- active vendors
- pending vendor applications
- products pending moderation
- open customer issues if support exists

## Data Requirements

Reads:

- `GET /api/v1/admin/summary`
- `GET /api/v1/admin/vendor-applications?status=pending`
- `GET /api/v1/admin/orders?status=placed`

Writes:

- none

## States

- loading
- empty
- error
- forbidden
- ready

## Security Rules

- Requires admin role.
- No admin data should be embedded in public storefront pages.
- All metrics must come from backend admin endpoints.

