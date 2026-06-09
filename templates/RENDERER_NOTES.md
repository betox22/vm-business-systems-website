# Renderer Notes for Template Differences

The templates must not all render as the same grid.

Each template includes:

- `catalogModel.catalogType`
- `catalogModel.productCardStyle`
- `catalogModel.collectionLayout`
- `catalogModel.filters`
- `catalogModel.productDetailModel`
- `catalogModel.upsellModel`
- `visualDifference`
- `clientSelectionCard`
- `pages`

## Recommended frontend strategy

Create different catalog renderers by `catalogType`.

Examples:

- `editorial_minimal_grid`
  Clean product grid, lots of whitespace, quick add.

- `lookbook_collection_catalog`
  Fashion lookbook, full-width collection banners, size/color swatches.

- `dense_marketplace_catalog`
  Search-first marketplace, sidebar filters, ratings, discount badges, compare.

- `luxury_gallery_catalog`
  Large gallery cards, slow-scroll premium layout, craftsmanship storytelling.

- `digital_offer_catalog`
  Offer cards with modules, previews, instant access, bundles.

- `booking_menu_catalog`
  Service cards with duration, staff, price, and booking CTA.

- `menu_catalog`
  Restaurant menu categories, dietary tags, item modifiers, order CTA.

- `project_gallery_catalog`
  Before/after image cards and project detail pages.

## Important

The AI should only fill content.

The app should decide the visual layout from `catalogType`.

That is what will make the templates feel truly different.
