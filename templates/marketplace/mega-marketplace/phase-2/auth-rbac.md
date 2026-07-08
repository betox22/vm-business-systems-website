# Phase 2 - Authentication and RBAC

Template: Mega Marketplace
Backend: Laravel
Auth package: Laravel Sanctum

## Decision

Use Laravel Sanctum for the first production version.

Sanctum is the correct first step because this marketplace needs:

- web dashboard login
- API access for decoupled frontend
- future mobile app support
- token revocation
- simple role-gated routes

If a full third-party OAuth2 authorization server is needed later, add Laravel Passport as a separate phase. Do not start with Passport unless external OAuth clients are a confirmed requirement.

## Roles

Initial roles:

- `admin`
- `vendor`
- `customer`
- `support`

The Phase 1 schema stores this in `users.default_role`.

This is enough for the first version. Later, if roles become complex, add normalized tables:

- `roles`
- `permissions`
- `role_user`
- `permission_role`

## Authorization Rules

### Admin

- Can approve, reject, suspend, and manage vendors
- Can view marketplace-wide orders
- Can manage platform settings
- Can inspect vendor ledger entries

### Vendor

- Can manage only own vendor profile
- Can manage only own products
- Can view only own order items
- Can view only own ledger entries

### Customer

- Can manage own profile
- Can manage own cart
- Can place checkout
- Can view own orders

### Support

- Can view support-relevant customer/order data
- Should not have payout or destructive permissions by default

## Middleware Strategy

Use two layers:

1. `auth:sanctum`
   - confirms the user is logged in

2. `role:admin,vendor,customer`
   - confirms the user has an allowed role

Ownership checks must not be handled by role middleware alone.
Use Laravel policies for vendor/product/order ownership checks.

## Minimum Laravel Files

The snippets included in this folder are:

- `routes/api.php`
- `app/Http/Controllers/Api/V1/AuthController.php`
- `app/Http/Middleware/EnsureRole.php`
- `app/Http/Requests/Auth/RegisterRequest.php`
- `app/Http/Requests/Auth/LoginRequest.php`
- `bootstrap/app.middleware-fragment.php`
- `app/Models/User.sanctum-fragment.php`

These are snippets for the future Laravel project, not active runtime files in the current static/frontend app.
