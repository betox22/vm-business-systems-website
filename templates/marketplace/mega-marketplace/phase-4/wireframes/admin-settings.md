# Wireframe - Admin Marketplace Settings

Template: Mega Marketplace  
Area: Admin Marketplace  
Screen: MarketplaceSettings  
Status: draft

## Purpose

Let admins configure marketplace-level policies without changing code.

## Primary User Goals

- Configure commission rate.
- Configure moderation rules.
- Configure public marketplace policies.
- Configure vendor onboarding requirements.
- Configure payment and payout readiness flags.

## Layout Structure

```text
AdminDashboardShell
├── AdminSidebar
├── AdminTopbar
└── MarketplaceSettingsMain
    ├── CommissionSettingsPanel
    ├── VendorOnboardingRulesPanel
    ├── ProductModerationRulesPanel
    ├── StorefrontPolicyPanel
    └── AuditSettingsPanel
```

## Required Settings

- default commission rate
- vendor application mode
- product moderation mode
- return policy summary
- public support contact
- payout hold period if applicable

## Data Requirements

Reads:

- `GET /api/v1/admin/settings`

Writes:

- `PATCH /api/v1/admin/settings`

## States

- loading
- error
- saving
- ready

## Security Rules

- Requires admin role.
- Changes must create audit trail entries.
- Commission changes should not rewrite historical ledger entries.

