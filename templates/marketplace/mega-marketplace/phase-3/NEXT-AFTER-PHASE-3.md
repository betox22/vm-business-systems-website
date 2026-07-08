# What Follows After Phase 3

Phase 3 must be reviewed before moving forward.

## Approve Phase 3 Only If These Are Accepted

- `vendor_orders` is added as a required production table.
- Checkout is transaction-based.
- Product rows are locked during checkout.
- Checkout requires `Idempotency-Key`.
- One customer order can create multiple vendor orders.
- Every vendor order creates append-only ledger entries.
- Commission is calculated from the commission snapshot stored at checkout time.
- Vendor earnings are never recalculated from mutable product/vendor records.

## Phase 4 Scope

After approval, Phase 4 builds frontend architecture and UI:

1. Storefront
   - search-first header
   - department navigation
   - marketplace home
   - catalog filters
   - product detail

2. Cart and checkout
   - cart grouped by vendor
   - item quantity controls
   - vendor subtotal display
   - checkout summary

3. Vendor dashboard
   - product manager
   - order manager
   - fulfillment status
   - sales summary
   - payout/ledger view

4. Admin dashboard
   - vendor approval
   - product moderation
   - marketplace order monitoring
   - commission controls

Do not start Phase 4 until Phase 3 is approved.
