# Wireframe - Vendor Ledger

Template: Mega Marketplace  
Area: Vendor Portal  
Screen: VendorLedger  
Status: draft

## Purpose

Show vendors how marketplace payouts are calculated using append-only ledger
entries.

## Primary User Goals

- See pending, available, and paid balances.
- Understand commission deductions.
- Review ledger entries by order.
- Export payout history if enabled.

## Layout Structure

```text
VendorDashboardShell
├── VendorSidebar
├── VendorTopbar
└── VendorLedgerMain
    ├── LedgerBalanceCards
    ├── LedgerFilters
    ├── VendorLedgerTable
    └── PayoutMethodPanel
```

## LedgerBalanceCards

Required values:

- pending gross
- pending commission
- pending net
- available payout
- paid total

## VendorLedgerTable Columns

- date
- vendor order number
- type
- gross amount
- commission amount
- net amount
- status

## Data Requirements

Reads:

- `GET /api/v1/vendor/ledger`
- `GET /api/v1/vendor/ledger?status=pending`

Writes:

- none in this phase

## States

- loading
- empty
- error
- ready

## Security Rules

- Ledger entries are append-only.
- Vendor cannot edit ledger values.
- Backend owns commission and payout math.

