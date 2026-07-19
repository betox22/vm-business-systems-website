# Wireframe - Admin Product Moderation

Template: Mega Marketplace  
Area: Admin Marketplace  
Screen: ProductModeration  
Status: draft

## Purpose

Let admins review submitted products before publication when moderation is
enabled.

## Primary User Goals

- Inspect product submissions.
- Approve safe products.
- Reject incomplete or non-compliant products.
- Flag vendors with repeated problems.

## Layout Structure

```text
AdminDashboardShell
├── AdminSidebar
├── AdminTopbar
└── ProductModerationMain
    ├── ModerationToolbar
    ├── ProductModerationQueue
    └── ProductReviewPanel
```

## ProductModerationQueue Columns

- image
- product name
- vendor
- category
- submitted date
- moderation status
- actions

## ProductReviewPanel Sections

- product images
- title and description
- category
- price
- inventory
- compliance notes
- moderation actions

## Required Actions

- approve product
- reject product
- request edits
- flag vendor

## Data Requirements

Reads:

- `GET /api/v1/admin/products/moderation`
- `GET /api/v1/admin/products/{product}`

Writes:

- `PATCH /api/v1/admin/products/{product}/approve`
- `PATCH /api/v1/admin/products/{product}/reject`
- `PATCH /api/v1/admin/products/{product}/request-edits`

## States

- loading
- empty
- error
- updating
- ready

## Security Rules

- Requires admin role.
- Moderation state must be backend-owned.
- Public storefront must not show products pending approval.

