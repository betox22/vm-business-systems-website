# Wireframe - Product Detail

Template: Mega Marketplace  
Area: Public Storefront  
Screen: ProductDetail  
Status: draft

## Purpose

Help shoppers evaluate a product, understand seller trust, choose valid
variants, and add the correct item to cart.

## Primary User Goals

- Inspect product images.
- Read product title, price, rating, and key details.
- Choose variants/options.
- Understand shipping, returns, and vendor trust.
- Add to cart or buy now.
- Discover related items.

## Layout Structure

```text
PublicStorefrontShell
├── MarketplaceHeader
├── ProductDetailMain
│   ├── ProductMediaGallery
│   ├── ProductInfoPanel
│   │   ├── TitleAndRating
│   │   ├── PriceBlock
│   │   ├── VariantSelector
│   │   ├── ShippingAndReturns
│   │   └── AddToCartPanel
│   └── VendorTrustPanel
├── ProductDescriptionTabs
│   ├── Description
│   ├── Specifications
│   ├── Reviews
│   └── Shipping
├── RelatedProductsRail
└── MarketplaceFooter
```

## Required Sections

### ProductMediaGallery

Required behavior:

- primary image with stable aspect ratio
- thumbnail rail
- click/tap thumbnail changes primary image
- fallback image for missing product media

### ProductInfoPanel

Required content:

- product name
- rating and review count
- price
- stock state
- variant selectors if variants exist
- quantity selector
- add to cart
- buy now if checkout flow supports it

Rules:

- Disable add-to-cart if required variant is missing.
- Disable add-to-cart if backend marks product unavailable.
- Show clear validation near the blocked action.

### VendorTrustPanel

Required content:

- vendor name
- vendor rating if available
- fulfillment policy
- seller status if public

Rules:

- Do not expose vendor internal metrics.
- Verification badges must come from backend data.

### ProductDescriptionTabs

Minimum tabs:

- Description
- Specifications
- Reviews
- Shipping

If data is missing:

- hide empty tab or show a useful empty state
- do not show placeholder filler copy

## Data Requirements

Reads:

- `GET /api/v1/storefront/products/{productSlug}`
- `GET /api/v1/storefront/products/{productSlug}/related`

Writes:

- `POST /api/v1/checkout/cart/items`

## States

### Loading

Render:

- gallery skeleton
- title/price skeleton
- buy panel skeleton
- related product skeletons

### Not Found

Show:

- product unavailable message
- search bar
- category suggestions

### Error

Show retry while preserving header/navigation.

### Ready

All media, variants, quantity, and cart actions must be interactive.

## Mobile Rules

- ProductMediaGallery appears first.
- AddToCartPanel becomes sticky at the bottom only after the user scrolls past price.
- Tabs become stacked sections or a mobile tab control.
- VendorTrustPanel moves below purchase actions.

## Security And Trust Rules

- Client must not calculate final checkout eligibility.
- Backend quote is required before checkout.
- Product availability must be rechecked during checkout.

