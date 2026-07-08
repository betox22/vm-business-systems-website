# Phase 3 - Core Backend Logic

Template: Mega Marketplace
Backend: Laravel
Status: draft, pending owner approval

## Purpose

Phase 3 defines the core transactional backend logic for a multi-vendor
marketplace:

- customer checkout
- cart/order split by vendor
- vendor order creation
- stock validation
- commission calculation
- vendor ledger creation

## Important Structural Correction

Phase 1 intentionally followed the minimum table list requested:

- users
- vendors
- products
- orders
- order_items
- vendor_ledger

For a production-grade marketplace, `vendor_orders` is strongly recommended.

Reason:

- one customer checkout can involve multiple vendors
- each vendor needs its own fulfillment status
- each vendor needs its own vendor-facing order number
- vendor dashboards should not operate directly on the full customer order
- payouts and dispute workflows become cleaner

The schema extension is documented in:

```text
phase-3/schema-extension-vendor-orders.sql
```

## Transaction Boundary

Checkout must be one database transaction:

1. Validate idempotency key.
2. Lock products for update.
3. Validate stock and active vendor status.
4. Create parent customer order.
5. Group lines by vendor.
6. Create one vendor order per vendor.
7. Create order items linked to vendor order.
8. Decrement inventory.
9. Create vendor ledger entries.
10. Commit.

If any step fails, the whole transaction rolls back.

## Service Structure

Controller:

- receives validated request
- passes user, payload, and idempotency key to checkout service
- returns API response

Services:

- `MultiVendorCheckoutService`
  - owns checkout transaction
  - groups cart lines by vendor
  - creates parent order and vendor orders

- `VendorLedgerService`
  - calculates gross, commission, net
  - writes append-only ledger entries

## Money Rules

Initial Phase 3 implementation uses decimal columns from Phase 1.

Production hardening should later move all internal calculations to integer
cents or a dedicated Money value object. That prevents floating-point mistakes.

For now:

- round all calculated money values to 2 decimals
- store commission rate snapshot on order item
- store gross, commission, and net in vendor ledger
- never recalculate old vendor earnings from mutable product/vendor records

## Idempotency Rules

`POST /api/v1/checkout/place-order` must include:

```http
Idempotency-Key: uuid-generated-by-client
```

If the same customer retries with the same idempotency key, return the existing
order instead of creating a duplicate.

## Phase 4 Boundary

Frontend cart state, checkout UI, and vendor dashboard screens belong to Phase 4.
