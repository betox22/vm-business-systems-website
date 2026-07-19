# Phase 4 - Screen Map and Component Hierarchy

Template: Mega Marketplace
Phase: Frontend Architecture and UI/UX
Status: draft

## Goal

Define the frontend structure before visual design. Mega Marketplace must behave
like a real multi-vendor marketplace, not a single static landing page.

## Product Areas

Phase 4 has three separate product areas:

1. Public Storefront
2. Vendor Portal
3. Admin Marketplace

Each area has different users, permissions, data, and navigation.

## Public Storefront

Used by buyers and guests.

### Screens

- Home marketplace
- Catalog / search
- Category page
- Product detail
- Cart
- Checkout
- Login / register
- Customer account
- Customer orders
- Customer order detail

### Main Components

```text
PublicStorefrontShell
├── MarketplaceHeader
│   ├── Logo
│   ├── SearchBar
│   ├── DepartmentMenu
│   ├── AccountMenu
│   └── CartButton
├── PromoRail
├── CategoryGrid
├── ProductRail
├── ProductGrid
│   └── ProductCard
├── VendorSpotlight
├── TrustAndDeliveryStrip
└── MarketplaceFooter
```

## Customer Account

Used by logged-in buyers.

### Screens

- Account overview
- Order list
- Order detail
- Address book
- Saved items
- Profile settings

### Main Components

```text
CustomerAccountShell
├── AccountSidebar
├── AccountOverview
├── OrderList
├── OrderDetail
├── AddressBook
├── SavedItems
└── ProfileSettings
```

## Vendor Portal

Used by approved marketplace sellers.

### Screens

- Vendor dashboard
- Product manager
- Create product
- Edit product
- Inventory
- Vendor orders
- Vendor order detail
- Sales summary
- Ledger / payouts
- Vendor store settings

### Main Components

```text
VendorDashboardShell
├── VendorSidebar
├── VendorTopbar
├── VendorStatsCards
├── VendorProductTable
├── ProductEditorForm
├── InventoryPanel
├── VendorOrderTable
├── VendorOrderDetail
├── VendorLedgerTable
└── VendorSettingsForm
```

## Admin Marketplace

Used by the platform operator.

### Screens

- Admin dashboard
- Vendor applications
- Vendor management
- Product moderation
- Global orders
- Global order detail
- Commission settings
- Platform ledger
- Customer management
- Marketplace settings

### Main Components

```text
AdminDashboardShell
├── AdminSidebar
├── AdminTopbar
├── PlatformStatsCards
├── VendorApprovalQueue
├── VendorManagementTable
├── ProductModerationQueue
├── GlobalOrdersTable
├── GlobalOrderDetail
├── CommissionSettings
├── PlatformLedgerView
└── MarketplaceSettingsForm
```

## Shared Components

These components must be reusable across public, customer, vendor, and admin
areas.

```text
Shared
├── Button
├── IconButton
├── Badge
├── StatusPill
├── DataTable
├── EmptyState
├── LoadingSkeleton
├── Pagination
├── SearchInput
├── FilterPanel
├── MoneyDisplay
├── RatingStars
├── ProductImage
├── FileUploader
├── ConfirmDialog
└── Toast
```

## Data Ownership Rules

Frontend must respect backend ownership boundaries.

- Guests see only active and published products/vendors.
- Customers see only their own cart, profile, saved items, and orders.
- Vendors see only products, order items, vendor orders, and ledger entries
  scoped to their own `vendor_id`.
- Admins see marketplace-wide data.

Frontend must never assume authorization. Backend policies remain the source of
truth.

## Backend Responsibility

The frontend can display:

- products
- filters
- subtotals
- vendor groups
- order states
- ledger summaries

The backend must own:

- final prices
- stock checks
- commission calculation
- checkout split
- vendor ledger
- role authorization
- ownership authorization
- payment state

## Build Order

1. Define frontend route map.
2. Define shared component contracts.
3. Define frontend data models.
4. Define cart state grouped by vendor.
5. Build storefront screens.
6. Build customer account screens.
7. Build vendor portal screens.
8. Build admin marketplace screens.
9. Apply premium visual design.

Do not start visual styling before route and component contracts are clear.
