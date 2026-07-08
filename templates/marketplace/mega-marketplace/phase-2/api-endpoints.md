# Phase 2 - API Gateway and Endpoint Design

Template: Mega Marketplace
Backend: Laravel
Auth: Laravel Sanctum
Status: Phase 2 draft, pending owner approval

## API Style

- Base path: `/api/v1`
- Format: JSON only
- Authenticated routes: `auth:sanctum`
- Role routes: `role:admin`, `role:vendor`, `role:customer`
- Public storefront reads can be added later under `/api/v1/storefront`
- Checkout write operations must use an `Idempotency-Key` header

## Authentication

| Method | Endpoint | Auth | Role | Purpose |
|---|---|---:|---|---|
| POST | `/auth/register` | No | Guest | Create customer account |
| POST | `/auth/login` | No | Guest | Login and return Sanctum token |
| GET | `/auth/me` | Yes | Any | Return current authenticated user |
| POST | `/auth/logout` | Yes | Any | Revoke current token/session |

## Vendor Onboarding

| Method | Endpoint | Auth | Role | Purpose |
|---|---|---:|---|---|
| POST | `/vendors/applications` | Yes | Customer/Vendor | Start or update vendor application |
| GET | `/vendors/me` | Yes | Vendor/Admin | Return current user's vendor profile |
| PATCH | `/vendors/{vendor}` | Yes | Vendor/Admin | Update vendor profile, scoped by ownership |
| POST | `/vendors/{vendor}/submit-review` | Yes | Vendor/Admin | Submit vendor for marketplace review |
| GET | `/admin/vendor-applications` | Yes | Admin | List pending vendor applications |
| PATCH | `/admin/vendors/{vendor}/approve` | Yes | Admin | Approve vendor |
| PATCH | `/admin/vendors/{vendor}/suspend` | Yes | Admin | Suspend vendor |

## Vendor Catalog Management

These endpoints are not the whole catalog system yet, but they define the protected path for vendors.

| Method | Endpoint | Auth | Role | Purpose |
|---|---|---:|---|---|
| GET | `/vendor/products` | Yes | Vendor/Admin | List products owned by vendor |
| POST | `/vendor/products` | Yes | Vendor/Admin | Create vendor product |
| GET | `/vendor/products/{product}` | Yes | Vendor/Admin | View product if owned by vendor |
| PATCH | `/vendor/products/{product}` | Yes | Vendor/Admin | Update product if owned by vendor |
| DELETE | `/vendor/products/{product}` | Yes | Vendor/Admin | Soft-delete product if owned by vendor |

## Customer Checkout

| Method | Endpoint | Auth | Role | Purpose |
|---|---|---:|---|---|
| GET | `/checkout/cart` | Yes | Customer | Return current cart |
| POST | `/checkout/cart/items` | Yes | Customer | Add product to cart |
| PATCH | `/checkout/cart/items/{cartItem}` | Yes | Customer | Update quantity |
| DELETE | `/checkout/cart/items/{cartItem}` | Yes | Customer | Remove item |
| POST | `/checkout/quote` | Yes | Customer | Price/tax/shipping quote before order |
| POST | `/checkout/place-order` | Yes | Customer | Create order through transactional checkout service |
| GET | `/orders/{order}` | Yes | Customer/Admin | View order if owned by customer or admin |

## Required Headers

For authenticated API token requests:

```http
Authorization: Bearer {SANCTUM_TOKEN}
Accept: application/json
Content-Type: application/json
```

For checkout mutation requests:

```http
Idempotency-Key: uuid-generated-by-client
```

## Response Rules

- Do not expose password hashes, internal payout notes, private vendor metadata, or payment secrets.
- Vendor users can only see their own vendor and products.
- Customer users can only see their own cart and orders.
- Admin endpoints must never be mounted under public/client navigation.

## Phase 3 Boundary

`POST /checkout/place-order` is defined here, but the actual multi-vendor split logic belongs to Phase 3.
