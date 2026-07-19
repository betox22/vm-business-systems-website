# Wireframe - Checkout

Template: Mega Marketplace  
Area: Public Storefront  
Screen: Checkout  
Status: draft

## Purpose

Convert a vendor-grouped cart into a confirmed parent order and child vendor
orders using backend-controlled quote, stock validation, payment state, and
idempotency.

## Primary User Goals

- Confirm shipping/contact information.
- Review vendor-grouped items.
- Confirm totals from backend quote.
- Place one order confidently.
- Receive one customer confirmation with vendor-level fulfillment detail.

## Layout Structure

```text
PublicStorefrontShell
├── MarketplaceHeader
├── CheckoutPage
│   ├── CheckoutSteps
│   │   ├── ContactStep
│   │   ├── ShippingStep
│   │   ├── PaymentStep
│   │   └── ReviewStep
│   └── CheckoutSummaryPanel
│       ├── VendorOrderPreview
│       ├── QuoteTotals
│       └── PlaceOrderButton
└── MarketplaceFooter
```

## Required Sections

### CheckoutSteps

Minimum steps:

- contact
- shipping
- payment
- review

Rules:

- guest checkout can exist, but customer account persistence is preferred
- address validation must happen before place order
- payment provider integration remains isolated from UI state

### CheckoutSummaryPanel

Required content:

- backend quote id if exposed
- items grouped by vendor
- subtotal
- shipping
- taxes
- total
- warnings for unavailable items

Rules:

- Place order disabled until quote is current.
- Any cart mutation returns the user to quote pending.

## Data Requirements

Reads:

- `GET /api/v1/checkout/cart`
- `POST /api/v1/checkout/quote`

Writes:

- `POST /api/v1/checkout/place-order`

Required headers:

- `Idempotency-Key`

## States

### Loading

Load cart and quote.

### Quote Pending

Block place order until backend quote returns.

### Payment Pending

Show payment-specific state without creating duplicate orders.

### Placing Order

Disable all purchase actions.

### Success

Show:

- parent order number
- vendor order groups
- email confirmation notice
- continue shopping
- view order

### Error

Show specific error:

- out of stock
- price changed
- payment failed
- address invalid
- server error

## Mobile Rules

- Steps stack vertically.
- Summary is collapsible but totals remain visible.
- Place order button stays visible only after required fields are valid.

## Security And Trust Rules

- Must send `Idempotency-Key`.
- Must not create orders from stale quote.
- Must never calculate commission or vendor payout in frontend.
- Must not store payment secrets client-side.

