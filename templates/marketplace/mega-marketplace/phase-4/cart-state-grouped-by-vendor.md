# Phase 4 - Cart State Grouped by Vendor

Template: Mega Marketplace
Status: draft

## Purpose

The cart must reflect marketplace reality:

- one customer cart
- many products
- products can belong to different vendors
- checkout must show vendor groups
- backend remains the source of truth for price, stock, tax, shipping, split
  orders, commission, and ledger

The frontend cart state is only a local working state before backend quote and
checkout.

## Core Rule

The cart UI must always group items by `vendorId`.

This is required because Phase 3 backend splits one checkout into multiple
vendor orders.

## Frontend Responsibilities

Frontend can:

- add product to cart
- update quantity
- remove item
- group items by vendor
- show estimated subtotals
- show vendor group summaries
- prepare checkout payload
- generate an idempotency key

Frontend must not:

- calculate final payment total
- decide stock truth
- calculate commission
- create vendor orders
- write ledger entries
- trust local prices as final

## Checkout Flow

1. Customer adds products to cart.
2. Frontend groups products by vendor.
3. Customer opens cart.
4. Frontend shows each vendor group separately.
5. Customer clicks checkout.
6. Frontend sends cart lines to backend quote endpoint.
7. Backend returns final quote.
8. Customer confirms.
9. Frontend sends `POST /api/v1/checkout/place-order` with:
   - validated item list
   - `Idempotency-Key` header
10. Backend creates parent order, vendor orders, order items, and vendor ledger.

## Cart State Shape

```json
{
  "version": 1,
  "currency": "USD",
  "items": [
    {
      "productId": "123",
      "vendorId": "55",
      "vendorName": "Vendor Name",
      "name": "Product Name",
      "quantity": 2,
      "unitPrice": 19.99,
      "currency": "USD",
      "imageUrl": "https://example.com/product.webp"
    }
  ],
  "updatedAt": "2026-07-08T00:00:00.000Z"
}
```

## Vendor Group Shape

```json
{
  "vendorId": "55",
  "vendorName": "Vendor Name",
  "items": [],
  "subtotal": 39.98,
  "currency": "USD"
}
```

## UI Requirements

The cart screen must show:

- vendor group name
- products under that vendor
- quantity controls
- remove item action
- vendor subtotal
- marketplace subtotal
- backend quote status
- checkout button

On mobile:

- single column
- sticky checkout summary at bottom only if it does not block item controls
- vendor groups stacked vertically

On desktop:

- cart items left
- checkout summary right
- vendor groups visually separated

## API Contract

Quote endpoint:

```http
POST /api/v1/checkout/quote
```

Place order endpoint:

```http
POST /api/v1/checkout/place-order
Idempotency-Key: {uuid}
```

Payload:

```json
{
  "items": [
    {
      "product_id": "123",
      "quantity": 2
    }
  ]
}
```

The backend can later require address/payment fields after the payment phase is
approved.
