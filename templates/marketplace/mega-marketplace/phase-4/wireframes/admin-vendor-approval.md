# Wireframe - Admin Vendor Approval

Template: Mega Marketplace  
Area: Admin Marketplace  
Screen: VendorApprovalQueue  
Status: draft

## Purpose

Let admins review, approve, reject, or suspend marketplace vendors.

## Primary User Goals

- Review vendor applications.
- Inspect submitted business details.
- Approve qualified vendors.
- Reject incomplete or risky applications.
- Suspend vendors when necessary.

## Layout Structure

```text
AdminDashboardShell
├── AdminSidebar
├── AdminTopbar
└── VendorApprovalMain
    ├── ApprovalQueueToolbar
    ├── VendorApplicationTable
    └── VendorReviewPanel
```

## VendorApplicationTable Columns

- business name
- owner name
- status
- submitted date
- risk flags
- actions

## VendorReviewPanel Sections

- business profile
- contact information
- payout readiness
- compliance notes
- product category intent
- approval actions

## Required Actions

- approve vendor
- reject vendor
- request more information
- suspend vendor

## Data Requirements

Reads:

- `GET /api/v1/admin/vendor-applications`
- `GET /api/v1/admin/vendors/{vendor}`

Writes:

- `PATCH /api/v1/admin/vendors/{vendor}/approve`
- `PATCH /api/v1/admin/vendors/{vendor}/suspend`
- `PATCH /api/v1/admin/vendors/{vendor}/reject`

## States

- loading
- empty
- error
- updating
- ready

## Security Rules

- Requires admin role.
- Approval actions must create audit trail entries.
- Rejection reason should be stored.

