# Wireframe - Vendor Dashboard

Template: Mega Marketplace  
Area: Vendor Portal  
Screen: VendorDashboard  
Status: draft

## Purpose

Give each approved vendor a clean operational overview of sales, orders,
inventory issues, and pending earnings.

## Primary User Goals

- See today's sales and pending orders.
- Identify products needing attention.
- Track pending ledger balance.
- Jump to product manager, orders, or payouts.

## Layout Structure

```text
VendorDashboardShell
├── VendorSidebar
├── VendorTopbar
└── VendorDashboardMain
    ├── VendorStatusBanner
    ├── VendorStatsCards
    ├── PendingOrdersPanel
    ├── InventoryAlertsPanel
    ├── SalesTrendPanel
    └── LedgerSummaryPanel
```

## Required Sections

### VendorStatusBanner

Shows account status:

- approved
- pending review
- suspended
- missing payout setup

Rules:

- Suspended vendors cannot create or edit active products.
- Pending vendors can view onboarding state but not publish products.

### VendorStatsCards

Required metrics:

- gross sales
- open vendor orders
- active products
- pending payout

Metrics must come from vendor-scoped backend endpoints.

### PendingOrdersPanel

Shows newest vendor orders requiring action.

Required fields:

- vendor order number
- customer-safe destination summary
- item count
- status
- created date

### InventoryAlertsPanel

Shows:

- low stock
- out of stock
- inactive products
- rejected products

## Data Requirements

Reads:

- `GET /api/v1/vendors/me`
- `GET /api/v1/vendor/summary`
- `GET /api/v1/vendor/orders?status=pending`
- `GET /api/v1/vendor/ledger?status=pending`

Writes:

- none

## States

- loading
- empty
- error
- forbidden
- ready

## Security Rules

- Vendor dashboard must never show marketplace-wide totals.
- Vendor metrics must be scoped by authenticated vendor id.
- Customer private details must be minimized.

