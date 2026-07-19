# Wireframe - Catalog Search

Template: Mega Marketplace  
Area: Public Storefront  
Screen: CatalogSearch  
Status: draft

## Purpose

Let shoppers search, filter, compare, and add products from a large multi-vendor
catalog without losing orientation.

## Primary User Goals

- Search by product name, category, brand, or keyword.
- Filter results by department, price, rating, vendor, shipping, and availability.
- Sort results.
- Add products to cart quickly.
- Open product detail for deeper evaluation.

## Layout Structure

```text
PublicStorefrontShell
├── MarketplaceHeader
├── CatalogHeader
│   ├── SearchSummary
│   ├── ResultCount
│   └── SortControl
├── CatalogBody
│   ├── FilterSidebar
│   └── ProductResults
│       ├── ActiveFilterChips
│       ├── ProductGrid
│       └── Pagination
└── MarketplaceFooter
```

## Required Sections

### CatalogHeader

Required content:

- current query or category
- result count
- sort control

Required sort options:

- relevance
- featured
- price low to high
- price high to low
- rating
- newest

### FilterSidebar

Required filter groups:

- departments/categories
- price range
- rating
- shipping speed
- vendor
- availability

Behavior:

- desktop filters stay visible on the left
- mobile filters open in a bottom sheet or drawer
- active filters appear as removable chips

### ProductResults

Required behavior:

- every product card supports add-to-cart
- product image opens product detail
- product title opens product detail
- vendor badge opens vendor profile when public vendor pages exist

## Product Card Contract

Each card needs:

- `id`
- `slug`
- `name`
- `primaryImageUrl`
- `price`
- `currency`
- `rating`
- `reviewCount`
- `vendorName`
- `shippingBadge`
- `stockState`

Cards must not invent:

- discounts
- delivery dates
- vendor verification
- review counts

## Data Requirements

Reads:

- `GET /api/v1/storefront/products`
- `GET /api/v1/storefront/departments`
- `GET /api/v1/storefront/filters`

Writes:

- `POST /api/v1/checkout/cart/items`

## States

### Loading

Render:

- filter skeleton
- 8 to 12 product card skeletons
- preserved search/header area

### Empty

Show:

- no results message
- clear filters action
- suggested departments
- search refinement

### Error

Show section-level retry without losing current query/filter state.

### Ready

Filter, sort, pagination, add-to-cart, and product navigation must be active.

## Mobile Rules

- FilterSidebar becomes a drawer.
- SortControl remains visible above product results.
- Product cards use a compact 2-column grid when readable.
- Active filters scroll horizontally.

## Security And Trust Rules

- Filters must only return active public products.
- Add-to-cart must not rely on client stock.
- Product results must be scoped by backend publication rules.

