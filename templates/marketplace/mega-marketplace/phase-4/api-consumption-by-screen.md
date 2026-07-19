# Phase 4 - API Consumption by Screen

Template: Mega Marketplace
Status: draft

## Purpose

Define which API endpoints each frontend screen consumes.

The frontend must not invent marketplace data. Every marketplace screen should
either:

- consume backend data
- display a local pending state
- show an empty/loading/error state

## Public Storefront

### Marketplace Home

Purpose:

- show marketplace search entry
- show departments
- show deal rails
- show featured/trending products
- show trust and delivery messaging

Reads:

```http
GET /api/v1/storefront/home
GET /api/v1/storefront/departments
GET /api/v1/storefront/products?featured=1
GET /api/v1/storefront/products?sort=trending
```

Writes:

```http
POST /api/v1/checkout/cart/items
```

### Catalog / Search

Purpose:

- searchable product grid
- category/filter navigation
- sorting
- pagination

Reads:

```http
GET /api/v1/storefront/products?query=&category=&min_price=&max_price=&rating=&sort=&page=
GET /api/v1/storefront/departments
GET /api/v1/storefront/filters
```

Writes:

```http
POST /api/v1/checkout/cart/items
```

### Category Page

Purpose:

- browse products inside one department/category

Reads:

```http
GET /api/v1/storefront/categories/{categorySlug}
GET /api/v1/storefront/products?category={categorySlug}&page=
GET /api/v1/storefront/filters?category={categorySlug}
```

Writes:

```http
POST /api/v1/checkout/cart/items
```

### Product Detail

Purpose:

- show product details
- vendor info
- variants/options later
- reviews later
- add to cart

Reads:

```http
GET /api/v1/storefront/products/{productSlug}
GET /api/v1/storefront/products/{productSlug}/related
```

Writes:

```http
POST /api/v1/checkout/cart/items
```

## Cart and Checkout

### Cart

Purpose:

- show cart grouped by vendor
- update quantities
- remove items
- show estimated subtotal
- request authoritative backend quote

Reads:

```http
GET /api/v1/checkout/cart
POST /api/v1/checkout/quote
```

Writes:

```http
PATCH /api/v1/checkout/cart/items/{cartItem}
DELETE /api/v1/checkout/cart/items/{cartItem}
POST /api/v1/checkout/quote
```

### Checkout

Purpose:

- collect/confirm address and payment method
- get final backend quote
- place order

Reads:

```http
GET /api/v1/checkout/cart
POST /api/v1/checkout/quote
```

Writes:

```http
POST /api/v1/checkout/place-order
```

Required header:

```http
Idempotency-Key: {uuid}
```

## Customer Account

### Account Overview

Reads:

```http
GET /api/v1/auth/me
GET /api/v1/account/summary
```

### Customer Orders

Reads:

```http
GET /api/v1/account/orders
GET /api/v1/account/orders/{orderNumber}
```

### Address Book

Reads:

```http
GET /api/v1/account/addresses
```

Writes:

```http
POST /api/v1/account/addresses
PATCH /api/v1/account/addresses/{address}
DELETE /api/v1/account/addresses/{address}
```

## Vendor Portal

### Vendor Dashboard

Reads:

```http
GET /api/v1/vendors/me
GET /api/v1/vendor/summary
GET /api/v1/vendor/orders?status=pending
GET /api/v1/vendor/ledger?status=pending
```

### Product Manager

Reads:

```http
GET /api/v1/vendor/products?status=&query=&page=
```

Writes:

```http
POST /api/v1/vendor/products
PATCH /api/v1/vendor/products/{product}
DELETE /api/v1/vendor/products/{product}
```

### Vendor Orders

Reads:

```http
GET /api/v1/vendor/orders?status=&page=
GET /api/v1/vendor/orders/{vendorOrderNumber}
```

Writes:

```http
PATCH /api/v1/vendor/orders/{vendorOrderNumber}/status
```

### Vendor Ledger / Payouts

Reads:

```http
GET /api/v1/vendor/ledger?status=&page=
GET /api/v1/vendor/payouts
```

## Admin Marketplace

### Admin Dashboard

Reads:

```http
GET /api/v1/admin/summary
GET /api/v1/admin/vendor-applications?status=pending
GET /api/v1/admin/orders?status=placed
```

### Vendor Applications

Reads:

```http
GET /api/v1/admin/vendor-applications
GET /api/v1/admin/vendors/{vendor}
```

Writes:

```http
PATCH /api/v1/admin/vendors/{vendor}/approve
PATCH /api/v1/admin/vendors/{vendor}/suspend
PATCH /api/v1/admin/vendors/{vendor}/reject
```

### Product Moderation

Reads:

```http
GET /api/v1/admin/products/moderation?status=pending_review
```

Writes:

```http
PATCH /api/v1/admin/products/{product}/approve
PATCH /api/v1/admin/products/{product}/reject
```

### Global Orders

Reads:

```http
GET /api/v1/admin/orders?status=&vendor=&page=
GET /api/v1/admin/orders/{orderNumber}
```

### Platform Ledger

Reads:

```http
GET /api/v1/admin/ledger?vendor=&status=&page=
GET /api/v1/admin/commissions/summary
```

## Required Frontend States

Every screen must support:

- loading
- empty
- error
- unauthorized
- forbidden
- success/action complete

Do not ship screens that only work in the happy path.
