# Phase 3 Lock

Template: Mega Marketplace
Phase: Core Backend Logic
Status: approved and locked
Date: 2026-07-08

## Locked Scope

Phase 3 is closed with these decisions:

- Checkout must run inside a database transaction.
- Checkout must require an `Idempotency-Key`.
- Product rows must be locked during checkout validation.
- Product stock and active vendor status must be validated before order creation.
- One customer checkout can create one parent order and multiple vendor orders.
- `vendor_orders` is required for production marketplace operations.
- Each order item must remain linked to its vendor.
- Vendor commission must be snapshotted at checkout time.
- Vendor ledger entries must be append-only.
- Vendor payout math must not be recalculated from mutable product or vendor records.

## Locked Implementation Direction

The future Laravel backend should use:

- `CheckoutController`
- `PlaceOrderRequest`
- `MultiVendorCheckoutService`
- `VendorLedgerService`
- `VendorOrder` model
- `vendor_orders` schema extension

## Not Included Yet

These belong to later phases:

- Real Laravel project creation
- Real Laravel migrations
- Payment gateway integration
- Tax/shipping provider integration
- Refund and dispute workflow
- Vendor payout execution
- Storefront UI
- Vendor dashboard UI
- Admin dashboard UI

## Next Phase

Phase 4 starts frontend architecture and UI:

- storefront
- catalog
- product detail
- cart grouped by vendor
- checkout UI
- vendor dashboard
- admin dashboard

Do not change Phase 3 decisions without documenting a new revision.
