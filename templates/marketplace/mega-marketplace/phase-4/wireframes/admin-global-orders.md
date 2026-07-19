# Wireframe - Admin Global Orders

Template: Mega Marketplace  
Area: Admin Marketplace  
Screen: GlobalOrders  
Status: draft

## Purpose

Give admins a marketplace-wide order view while preserving the parent order to
vendor order relationship.

## Primary User Goals

- Search all orders.
- Inspect parent order status.
- Inspect vendor order splits.
- Identify fulfillment or payment problems.
- Support customer/vendor disputes.

## Layout Structure

```text
AdminDashboardShell
├── AdminSidebar
├── AdminTopbar
└── GlobalOrdersMain
    ├── GlobalOrdersToolbar
    ├── ParentOrderTable
    └── GlobalOrderDetailPanel
```

## ParentOrderTable Columns

- order number
- customer
- total
- vendor order count
- payment status
- fulfillment status
- created date
- actions

## GlobalOrderDetailPanel Sections

- parent order summary
- customer summary
- vendor order split
- payment state
- ledger entries
- support notes

## Data Requirements

Reads:

- `GET /api/v1/admin/orders`
- `GET /api/v1/admin/orders/{orderNumber}`

Writes:

- support actions are out of scope for this phase

## States

- loading
- empty
- error
- forbidden
- ready

## Security Rules

- Requires admin role.
- Customer sensitive data should be minimized and audited.
- Admin cannot manually edit ledger totals from order screen.

