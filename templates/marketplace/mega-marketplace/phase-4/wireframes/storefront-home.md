# Wireframe - Marketplace Home

Template: Mega Marketplace  
Area: Public Storefront  
Screen: MarketplaceHome  
Status: draft

## Purpose

Give shoppers a search-first entry point into a large catalog while exposing
strong category paths, curated deals, and high-trust delivery signals.

This screen must feel like a real marketplace homepage, not a generic landing
page.

## Primary User Goals

- Search for a product immediately.
- Browse by department or category.
- Discover featured deals.
- Continue shopping from recent or popular categories.
- Reach cart, account, and support quickly.

## Layout Structure

```text
PublicStorefrontShell
├── MarketplaceHeader
│   ├── BrandMark
│   ├── DepartmentMenuTrigger
│   ├── SearchBar
│   ├── AccountMenu
│   └── CartButton
├── DeliveryTrustStrip
├── HeroCommerceBand
│   ├── FeaturedOfferPanel
│   ├── CategoryShortcutPanel
│   └── DealCountdownPanel
├── DepartmentGrid
├── FeaturedDealsRail
├── TrendingProductsGrid
├── VendorSpotlightRail
├── RecentlyViewedRail
└── MarketplaceFooter
```

## Required Sections

### MarketplaceHeader

Must remain visible and useful on desktop and mobile.

Required content:

- marketplace brand
- search input
- department/category access
- account entry
- cart count

Required behavior:

- search submits to `/catalog?q={query}`
- department menu opens category navigation
- cart button opens `/cart`
- account menu shows login state if available

### DeliveryTrustStrip

Short horizontal strip for marketplace-level confidence.

Examples:

- secure checkout
- vendor verified
- fast shipping options
- easy returns policy

This strip must use platform policy data, not seller-written marketing copy.

### HeroCommerceBand

This is not a pure marketing hero. It should drive shopping behavior.

Required blocks:

- primary offer or seasonal collection
- 4 to 8 category shortcuts
- one urgency or deal module if available

Rules:

- If no campaign exists, use curated categories instead.
- Do not show fake discount percentages.
- Do not block search visibility.

### DepartmentGrid

Grid of major departments.

Required data:

- department name
- image or icon
- product count if available
- slug

Behavior:

- click navigates to `/categories/{categorySlug}`

### FeaturedDealsRail

Horizontal rail of promoted or high-value products.

Required product card data:

- image
- product name
- price
- rating
- vendor badge
- shipping badge
- add-to-cart action

### TrendingProductsGrid

Main discovery grid.

Desktop:

- 4 to 6 columns depending on viewport width

Tablet:

- 3 columns

Mobile:

- 2 columns for compact product cards
- 1 column only if product content becomes unreadable

## Data Requirements

Reads:

- `GET /api/v1/storefront/home`
- `GET /api/v1/storefront/departments`
- `GET /api/v1/storefront/products?featured=1`
- `GET /api/v1/storefront/products?sort=trending`

Writes:

- `POST /api/v1/checkout/cart/items`

## States

### Loading

Use skeletons matching the final layout:

- header remains visible
- hero commerce band skeleton
- department grid skeleton
- product card skeletons

### Empty

Show category discovery and search. Do not show a blank marketplace.

### Error

Keep search and category navigation available. Show retry action only for
failed content sections.

### Ready

All product actions must be active and connected to cart state.

## Mobile Rules

- Header collapses into brand, search, account, and cart.
- Department menu becomes a drawer.
- HeroCommerceBand becomes stacked commerce modules.
- Product rail scrolls horizontally.
- Product grid keeps stable card heights.

## Security And Trust Rules

- Product prices shown here are informational until backend quote.
- Do not show unpublished products.
- Do not expose vendor admin links.
- Add-to-cart must validate product id and quantity through the API.

