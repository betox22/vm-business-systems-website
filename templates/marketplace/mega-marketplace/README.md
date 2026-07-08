# Mega Marketplace Template

Internal template source for a high-density, multi-vendor marketplace experience.

This template must not reference third-party marketplace brands in UI copy, file
names, prompts, or generated output. It is directionally intended for broad
catalog businesses with many categories, sellers, filters, deals, cart,
checkout, user accounts, vendor areas, and marketplace administration.

## Status

- Runtime enabled: no
- Phase: architecture and template contract
- Safe to connect to Lyra: after Phase 1 data model is confirmed

## Intended Use

Use this template when the client describes:

- A broad catalog with many product categories
- Multiple vendors or sellers
- Search-first shopping
- Deals, featured products, trending products, or category browsing
- Shipping, cart, checkout, customer accounts, and order tracking

Do not use this template for:

- A single premium product
- A professional services brochure
- A restaurant menu
- Appointment booking only
- A portfolio or simple company website

## Required Platform Layers

1. Presentation layer
   - Public storefront pages
   - Product listing pages
   - Product detail pages
   - Cart and checkout UI
   - Customer account UI
   - Vendor dashboard UI

2. Schema layer
   - Strict JSON template manifest
   - Strict section and data-binding contracts
   - No raw HTML from AI output
   - No unvalidated CSS or script injection from AI output

3. Commerce layer
   - Cart
   - Checkout
   - Order splitting by vendor
   - Order items
   - Commission calculation
   - Vendor ledger

4. Security layer
   - Authentication
   - Role-based access control
   - Vendor ownership checks
   - Audit logs
   - Safe media uploads
   - Idempotent checkout operations

5. Operations layer
   - Admin marketplace controls
   - Vendor onboarding
   - Product approval workflow
   - Dispute/refund hooks
   - Payout readiness tracking

## Design Direction

The visual system should feel:

- Dense but organized
- Fast to scan
- Search-first
- Commerce-ready
- Mobile-first
- Professional enough for real buyers and vendors

Avoid placeholder layouts that only change colors. This template needs real
marketplace structure: navigation, search, departments, deal rails, product
cards, trust signals, cart entry, account entry, and vendor-aware checkout.

## Phase Gate

Before implementing runtime code for this template, confirm the backend language:

- Python/FastAPI
- PHP/Laravel

Then complete Phase 1: system architecture and MySQL database design.
