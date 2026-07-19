# Wireframe - Cart

Template: Mega Marketplace  
Area: Public Storefront  
Screen: Cart  
Status: draft

## Purpose

Show a cart grouped by vendor so the shopper understands shipping, subtotals,
and split fulfillment before checkout.

## Primary User Goals

- Review items.
- Adjust quantities.
- Remove items.
- Understand vendor-level grouping.
- Get backend quote.
- Continue to checkout.

## Layout Structure

```text
PublicStorefrontShell
├── MarketplaceHeader
├── CartPage
│   ├── CartHeader
│   ├── VendorGroupedCartList
│   │   └── VendorCartGroup
│   │       ├── VendorGroupHeader
│   │       ├── CartItemRow
│   │       └── VendorSubtotal
│   └── CartSummaryPanel
│       ├── QuoteStatus
│       ├── EstimatedTotals
│       ├── ShippingNotice
│       └── CheckoutButton
└── MarketplaceFooter
```

## Required Sections

### CartHeader

Required content:

- cart title
- item count
- continue shopping action

### VendorGroupedCartList

Required behavior:

- group items by `vendor_id`
- show vendor name for each group
- show each item with image, name, variant, unit price, quantity, remove action
- show vendor subtotal

Rules:

- Vendor grouping must match backend ownership.
- Quantity updates should be optimistic only if rollback is implemented.

### CartSummaryPanel

Required content:

- item subtotal
- shipping estimate if available
- tax estimate if available
- marketplace fees if shown to customer
- total estimate
- checkout button

Rules:

- Summary must call backend quote.
- Checkout is disabled until quote is ready.
- Stale quote must be refreshed after quantity changes.

## Data Requirements

Reads:

- `GET /api/v1/checkout/cart`
- `POST /api/v1/checkout/quote`

Writes:

- `PATCH /api/v1/checkout/cart/items/{cartItem}`
- `DELETE /api/v1/checkout/cart/items/{cartItem}`
- `POST /api/v1/checkout/quote`

## States

### Loading

Render:

- cart item skeletons grouped under placeholder vendors
- summary skeleton

### Empty

Show:

- empty cart message
- continue shopping action
- trending categories

### Error

Show:

- retry cart load
- support link

### Quote Pending

Show:

- summary calculating state
- disabled checkout button

### Quote Ready

Show:

- backend totals
- checkout enabled

## Mobile Rules

- Vendor groups stack vertically.
- CartSummaryPanel becomes sticky bottom summary or appears after cart items.
- Quantity controls must be thumb-friendly.
- Remove action must not be easy to tap accidentally.

## Security And Trust Rules

- Frontend subtotal is only an estimate.
- Backend quote owns final price, stock, vendor split, shipping, and tax.
- Checkout request must use current quoted cart state.

