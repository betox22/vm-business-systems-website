# Commerce Engine Architecture

This document defines the shared commerce layer used by every KREATON template that sells products, services, bookings, tickets, food, or digital goods.

## Core Rule

Templates must not own payment, order, inventory, shipping, tracking, or payout logic.

Each sales template declares the commerce profile it needs, then the platform provides those capabilities through shared backend modules and admin screens.

## Commerce Profiles

### Mega Retail Store

Use when one business owns and manages the catalog.

- Ownership: single owner
- Inventory: owned inventory
- Checkout: one store order
- Payments: one merchant account
- Shipping: store-managed fulfillment and tracking
- Admin: products, categories, inventory, orders, customers, payments, shipping, discounts, staff roles, audit logs

This is for a client who wants a large catalog store with many categories but no external sellers.

### Mega Marketplace

Use when many external sellers can register, publish products, receive orders, and get paid.

- Ownership: multi-vendor
- Inventory: vendor-owned inventory
- Checkout: one customer checkout split into vendor orders
- Payments: platform-controlled marketplace flow
- Shipping: vendor or platform fulfillment depending on policy
- Admin: vendor approval, global orders, commissions, payouts, disputes, audit logs
- Vendor: vendor dashboard, products, inventory, orders, shipments, ledger, payouts

This is a more complex product and must be built after the single-owner commerce engine is stable.

## Shared Backend Modules

All sales templates should use these modules:

- Businesses and sites
- Store admin users and roles
- Catalog items and categories
- Inventory movements
- Carts and cart items
- Orders and order items
- Payments and payment events
- Shipments and tracking events
- Shipping providers
- Payment methods
- Discounts
- Customer accounts
- Audit logs

Marketplace-only modules:

- Vendors
- Vendor orders
- Vendor ledger entries
- Commission rules
- Payouts
- Disputes

## Accounting Separation

KREATON must keep two accounting surfaces fully separate.

### KREATON Billing

This is what KREATON charges the client for using the platform.

Examples:

- Monthly subscription
- Annual subscription
- Setup fee
- Add-ons
- Usage fees
- Optional platform transaction fee
- Domain or managed-service fee

Required records:

- Plans
- Subscriptions
- Subscription invoices
- Subscription payments
- Billing events
- Usage metering
- Feature entitlements
- Credits and adjustments
- Dunning and suspension records
- Billing audit logs

Client-visible reports:

- Current plan
- Renewal date
- Paid invoices
- Open invoices
- Monthly platform charges
- Usage summary
- Feature limits
- Platform fee summary

### Store Commerce Ledger

This is the money the client's store receives from buyers.

Examples:

- Product sales
- Service sales
- Booking deposits
- Shipping collected
- Tax collected
- Refunds
- Payment provider fees
- Payouts to the merchant
- Marketplace vendor payouts

Required records:

- Orders
- Order items
- Payment transactions
- Payment events
- Refunds
- Disputes
- Shipments
- Tracking events
- Payouts
- Vendor ledger entries, only for marketplaces

Client-visible reports:

- Gross sales
- Refunds
- Net sales
- Provider fees
- Pending manual payments
- Payouts
- Disputes
- Order reconciliation

Rule: KREATON subscription revenue must never be mixed with store sales revenue. The client should always be able to see what they owe KREATON and what their own store collected from buyers as two different ledgers.

## Payment Strategy

Build a provider-open payment gateway, but keep the first production scope Stripe-only.

Start with Stripe Checkout for cards and wallet payments because it keeps sensitive payment entry in the provider-controlled flow and reduces PCI risk. Use Stripe webhooks as the source of truth for payment state.

For connected client payouts and future marketplace payouts, use Stripe Connect behind the same gateway interface. The frontend and templates should not know whether the active provider is Stripe, PayPal, or a local method.

Supported payment methods should be managed from admin settings:

- Credit and debit cards
- Apple Pay
- Google Pay
- PayPal
- Manual/local payment methods, held as pending until admin verification

Provider slots reserved for later:

- PayPal: server-side order creation, capture, and webhook reconciliation.
- Local/manual: bank transfer, Zelle, cash, pago movil, or country-specific instructions. These never auto-confirm orders.
- Financing: merchant-approved installments or external BNPL provider. This must be separate from normal payment capture.
- Alternate card processor: Adyen, Square, Braintree, or another processor if Stripe is unavailable in a target country.

When the buyer pays through Stripe, KREATON can collect a platform fee automatically. When the buyer pays directly to the merchant through local/manual instructions, KREATON should bill the merchant through a subscription or platform invoice instead of relying on automatic commission capture.

For multi-vendor marketplaces, use a marketplace payment flow only after the order split, ledger, commission, vendor onboarding, and payout rules are implemented.

## Shipping And Tracking Strategy

Use a shipping adapter so the platform can support different providers without changing templates.

Recommended first adapter:

- EasyPost for rates, labels, tracking, and webhook tracking updates

Fallbacks:

- Manual carrier and tracking number entry
- Shippo or ShipStation adapter
- Direct carrier API adapter when a client has enterprise carrier credentials

Normalized tracking statuses:

- unknown
- pre_transit
- in_transit
- out_for_delivery
- delivered
- available_for_pickup
- return_to_sender
- failure
- cancelled
- error

## Admin Layers

KREATON service admin:

- All client sites
- Billing plans
- Template library
- Global providers
- Global incidents
- System audit logs

Client store admin:

- Products
- Categories
- Inventory
- Orders
- Customers
- Payments
- Shipping and tracking
- Discounts
- Staff access
- Store settings

Vendor dashboard, only for marketplace templates:

- Vendor products
- Vendor inventory
- Vendor orders
- Vendor shipments
- Vendor ledger
- Vendor payouts

## Implementation Order

1. Commerce capability contracts and template metadata.
2. Database schema for catalog, carts, orders, payments, shipments, and audit logs.
3. Client store admin screens for products, orders, payments, and shipping.
4. Single-owner checkout using Stripe Checkout in test mode.
5. Payment webhooks and order status state machine.
6. Shipping adapter and tracking events.
7. Customer account area with order history and tracking.
8. Multi-vendor extension: vendors, vendor orders, commissions, ledger, payouts.

## Non-Negotiables

- Never expose payment provider secrets in frontend code.
- Never store raw card numbers.
- Never trust payment success only from the browser redirect.
- Always reconcile payment and shipment changes through server-side events or verified admin actions.
- Every admin change that affects money, orders, inventory, or provider settings must create an audit log.
