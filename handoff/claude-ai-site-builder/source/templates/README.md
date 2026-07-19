# AI Store Builder Templates

This package includes reusable website templates for an AI website/store builder.
Most entries are structural/reference templates. Runtime-enabled templates are
tracked separately so Lyra only executes templates that have real HTML/CSS/JS or
renderer support.

## Files

- `all-templates.json`  
  All 12 templates in one JSON file.

- `templates/*.json`  
  One file per template.

- `types.ts`  
  TypeScript types for the template structure.

- `templateRegistry.ts`  
  TypeScript registry with helper functions.

- `templateRegistry.js`  
  JavaScript/CommonJS version.

- `ai-generator-system-prompt.txt`  
  System prompt for the AI generator so it uses templates instead of inventing every page from zero.

- `sample-template-selection.json`  
  Example of how the AI can select a template from business input.

## Recommended flow

1. User talks to the AI assistant.
2. Assistant detects business type.
3. App calls `suggestTemplateFromBusinessType(userInput)`.
4. App loads the selected template.
5. AI fills placeholders like:
   - `{{business_name}}`
   - `{{hero_headline}}`
   - `{{services}}`
   - `{{featured_products}}`
   - `{{testimonials}}`
6. App renders the final site using your section components.

## Template categories

### Ecommerce

- Minimal Store
- Bold Fashion Store
- Marketplace Style
- Luxury Product Store
- Digital Products Store

### Landing

- Startup Landing
- Personal Brand Landing
- Event / Promo Landing

### Services

- Local Business Pro
- Appointment Booking
- Professional Services
- Restaurant / Food Business
- Contractor Before / After

## Important implementation note

These are structure templates, not visual HTML pages yet.

Your app needs section components matching the `section.type` values, for example:

- `hero_product`
- `featured_products`
- `service_cards`
- `quote_form`
- `food_hero`
- `startup_hero`

That is the correct architecture because the AI should generate content, while your app controls design quality.

## Runtime vs reference assets

Template preview images are not executable templates. They are reference assets
used to guide visual direction while real template packs are built one by one.

Use `template-runtime-registry.json` as the source of truth for what Lyra can
use as an executable runtime template. If `runtimeEnabled` is not `true`, the
asset must stay isolated from runtime fallback generation.

Current runtime-enabled packs:

- `mega-marketplace`: multi-vendor marketplace with external sellers, seller
  onboarding, split orders, commissions, and vendor payout logic.
- `mega-retail-store`: large single-owner retail catalog with many categories,
  one store-owned inventory model, one cart, and one checkout flow.
- `premium-product-store`: premium single-owner product line store with
  categories, product details, internal specs/compare, cart, checkout, customer
  account, store owner admin, payment method configuration, and tracking hooks.

Runtime templates must include backend contracts. Sales templates must expose
catalog, cart, checkout, orders, customer account, store admin, payment method
configuration, shipping/tracking, and audit-log paths. Informational templates
must expose at least users, admin content updates, media, publish status, and
audit log.

See `TEMPLATE_PIPELINE.md` for the conversion process.


## Version 2 additions

This version adds stronger customer-visible differences:

- Different catalog models per template
- Different card behavior per template
- Different filter logic per template
- Different detail page logic per template
- Customer selection cards
- Template selection guide
- Renderer notes

Use `catalogModel.catalogType` to render the correct catalog UI.
