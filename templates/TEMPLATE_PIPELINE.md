# Template Runtime Pipeline

This project separates visual references from executable templates.

## Rule

Images under `templates-preview/` are reference assets only. They can guide visual
direction, but Lyra must not treat them as complete runtime templates.

A template is executable only when:

1. It has a manifest or registry entry with `runtimeEnabled: true`.
2. It has real HTML/CSS/JS or renderer blocks wired to the app.
3. It has data contracts for the sections it renders.
4. It has a backend integration contract.
5. It has been checked on desktop and mobile.

## Backend Rule

No template should be considered complete with visuals only.

Every runtime template must declare and implement a minimum backend surface:

- Informational templates need admin/content backend: users, client account,
  page/content updates, media uploads, publish status, and audit log.
- Sales templates need commerce backend: catalog, categories, cart, checkout,
  orders, customer account, store admin, payment method configuration,
  fulfillment/tracking, and audit log.
- Marketplace templates need all sales modules plus vendor onboarding, vendor
  products, split orders, commissions, vendor ledger, payouts, disputes, and
  vendor-scoped dashboards.

Payment providers must always be connected through server-side adapters. Runtime
templates must never expose provider keys, create client-side payment secrets, or
mark an order paid without backend provider confirmation or authorized manual
verification.

## Current Runtime Templates

- `mega-marketplace`
  - Manifest: `templates/marketplace/mega-marketplace/template.manifest.json`
  - Runtime prototype: `templates/marketplace/mega-marketplace/phase-5/visual-prototype/preview.html`
  - Use when the client wants a platform where multiple external sellers can
    list products and the system must split orders, commissions, and payouts.

- `mega-retail-store`
  - Manifest: `templates/retail/mega-retail-store/template.manifest.json`
  - Runtime prototype: `templates/retail/mega-retail-store/phase-5/visual-prototype/preview.html`
  - Use when the client wants a large product catalog managed by one business:
    many categories, owned inventory, one cart, one checkout, and no vendor
    onboarding or seller payout logic.

## Reference-Only Templates

All other carousel images and concept screenshots are currently reference-only.
They should be converted one by one into real template packs before Lyra uses
them as runtime fallbacks.

## Conversion Steps

For each future template:

1. Keep the image in `templates-preview/` as visual reference.
2. Create a real template folder under `templates/<category>/<template-id>/`.
3. Add `template.manifest.json`.
4. Build actual pages/sections, not screenshots.
5. Add data contracts for products, services, bookings, menu items, leads, or listings.
6. Add `contracts/security-controls.json`.
7. Add `contracts/commerce-integration.json` or `contracts/admin-integration.json`.
8. Implement or map the required backend endpoints.
9. Wire the renderer or standalone prototype.
10. Test desktop, mobile, and the required backend endpoints.
11. Mark `runtimeEnabled: true` in `templates/template-runtime-registry.json`.

## Lyra Policy

Lyra may use reference assets to choose a design direction. Lyra may only use
runtime-enabled templates as executable fallback pages.
