# Wireframe - Vendor Product Manager

Template: Mega Marketplace  
Area: Vendor Portal  
Screen: VendorProductManager  
Status: draft

## Purpose

Let vendors create, edit, activate, deactivate, price, stock, and manage
marketplace products without admin-level access.

## Primary User Goals

- Add a product.
- Edit product data.
- Manage price and inventory.
- Activate or pause listings.
- See moderation status.

## Layout Structure

```text
VendorDashboardShell
├── VendorSidebar
├── VendorTopbar
└── ProductManagerMain
    ├── ProductManagerToolbar
    │   ├── SearchInput
    │   ├── StatusFilter
    │   ├── CategoryFilter
    │   └── CreateProductButton
    ├── VendorProductTable
    └── ProductEditorDrawer
```

## Required Product Table Columns

- image
- product name
- SKU
- category
- price
- stock
- status
- moderation state
- updated date
- actions

## Product Editor Required Fields

- name
- SKU
- description
- category
- images
- price
- inventory quantity
- shipping weight/dimensions if needed
- active/inactive

## Required Actions

- create product
- edit product
- duplicate product
- activate/deactivate product
- delete draft product
- submit for moderation if required

## Data Requirements

Reads:

- `GET /api/v1/vendor/products`

Writes:

- `POST /api/v1/vendor/products`
- `PATCH /api/v1/vendor/products/{product}`
- `DELETE /api/v1/vendor/products/{product}`

## States

- loading
- empty
- error
- saving
- ready

## Security Rules

- Vendor can only mutate products owned by their vendor id.
- Frontend must not expose admin moderation controls.
- Backend must enforce ownership and publication rules.

