# Wireframe - Vendor Orders

Template: Mega Marketplace  
Area: Vendor Portal  
Screen: VendorOrders  
Status: draft

## Purpose

Let each vendor fulfill their own portion of marketplace orders while the
customer still experiences one parent order.

## Primary User Goals

- View assigned vendor orders.
- Open fulfillment details.
- Update fulfillment status.
- See item-level requirements.
- Avoid seeing other vendors' order data.

## Layout Structure

```text
VendorDashboardShell
├── VendorSidebar
├── VendorTopbar
└── VendorOrdersMain
    ├── OrdersToolbar
    │   ├── SearchInput
    │   ├── StatusFilter
    │   └── DateRangeFilter
    ├── VendorOrderTable
    └── VendorOrderDetailPanel
```

## VendorOrderTable Columns

- vendor order number
- parent order reference
- item count
- fulfillment status
- payout status
- created date
- actions

## VendorOrderDetailPanel

Required sections:

- customer-safe shipping summary
- item list
- fulfillment actions
- internal vendor notes
- ledger summary for this vendor order

## Required Actions

- mark processing
- mark shipped
- add tracking
- mark fulfilled
- request support

## Data Requirements

Reads:

- `GET /api/v1/vendor/orders`
- `GET /api/v1/vendor/orders/{vendorOrderNumber}`

Writes:

- `PATCH /api/v1/vendor/orders/{vendorOrderNumber}/status`

## States

- loading
- empty
- error
- updating
- ready

## Security Rules

- Vendor can only access vendor orders scoped to their vendor id.
- Vendor cannot alter parent order totals.
- Vendor cannot alter ledger commission.

