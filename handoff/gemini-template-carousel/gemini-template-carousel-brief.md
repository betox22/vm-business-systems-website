# KREATON Template Carousel Brief For Gemini

Goal: create a premium carousel component that can be inserted into the KREATON public/client experience.

Use the provided template previews as the source of truth. Do not invent unrelated layouts. The carousel should show the available website/store directions, let users compare them visually, and make it clear that LYRA will adapt the selected structure with AI.

## Product Context

- Platform name: KREATON
- Assistant name: LYRA
- Product: AI website/store builder
- User flow: client logs in, describes what they want, LYRA selects the best template architecture, adapts copy/colors/catalog, then generates an editable website draft.
- The carousel should be visual and premium, not a technical list.
- The carousel must not say "Apple style", "Amazon style", "Shopify style", or use protected brand comparisons in visible UI.
- Internally the code can keep IDs like `apple-premium-product` or `mega-marketplace`, but visible labels should be generic.

## Carousel Requirements

Create a responsive carousel with:

- large image preview
- template name
- short use-case description
- catalog type badge
- recommended-for chips
- primary action: `Use this structure`
- secondary action: `Preview`
- mobile swipe support
- desktop arrows and dot indicators
- no admin links
- clean premium styling

## Templates

### 1. Mega Marketplace

- templateId: `mega-marketplace`
- catalogType: `dense_marketplace_catalog`
- image: `/templates-preview/screenshots/amazon.png`
- visible name: `Mega Marketplace`
- description: Large catalog marketplace with search, categories, deals, filters, dense product cards, cart/register-ready commerce.
- best for: many unrelated categories, broad catalog, online store, multi-category products, deals.

### 2. Listing Marketplace

- templateId: `listing-marketplace-pro`
- catalogType: `listing_marketplace_catalog`
- image: `/templates-preview/screenshots/ebay.png`
- visible name: `Listing Marketplace`
- description: Seller/listing layout with condition labels, offers, comparison, listing cards, and inquiry/buy actions.
- best for: classifieds, vendors, resale, listings, inventory comparison.

### 3. Fashion Drop

- templateId: `fashion-drop-pro`
- catalogType: `lookbook_collection_catalog`
- image: `/templates-preview/screenshots/premium.png`
- visible name: `Fashion Drop`
- description: Editorial boutique storefront with visual hero, collections, lookbook, and launch/drop energy.
- best for: clothing, accessories, beauty, boutique, lifestyle products.

### 4. Premium Product

- templateId: `apple-premium-product`
- catalogType: `premium_editorial_catalog`
- image: `/templates-preview/screenshots/apple.png`
- visible name: `Premium Product Showcase`
- description: One-product or focused-line launch page with spacious hero, refined copy, premium sections, and conversion CTA.
- best for: one product, luxury tech, gadgets, focused product line, portfolio product.

### 5. Luxury High Ticket

- templateId: `luxury-high-ticket-pro`
- catalogType: `luxury_high_ticket_catalog`
- image: `/templates-preview/screenshots/premium.png`
- visible name: `Luxury High Ticket`
- description: Private showroom style for jewelry, watches, art, luxury cars, collectibles, and high-value pieces.
- best for: luxury, exclusive inventory, private consultation, high-ticket sales.

### 6. Corporate Company

- templateId: `corporate-company-pro`
- catalogType: `company_services_catalog`
- image: `/templates-preview/screenshots/services.png`
- visible name: `Corporate Company`
- description: Professional company website with positioning, services, process, proof, and contact.
- best for: agencies, consultants, local companies, B2B service providers.

### 7. Lead Funnel

- templateId: `lead-funnel-pro`
- catalogType: `lead_funnel_offer_catalog`
- image: `/templates-preview/screenshots/services.png`
- visible name: `Lead Funnel`
- description: Focused landing page for one offer, benefits, proof, FAQ, objection handling, and lead capture.
- best for: ads, campaigns, one offer, service lead generation.

### 8. Local Services

- templateId: `local-services-pro-plus`
- catalogType: `service_area_catalog`
- image: `/templates-preview/screenshots/services.png`
- visible name: `Local Services`
- description: Quote-focused service website with service cards, trust, service area, reviews, and contact CTA.
- best for: cleaning, repair, contractors, landscaping, local service businesses.

### 9. Booking

- templateId: `booking-appointment-pro`
- catalogType: `booking_menu_catalog`
- image: `/templates-preview/screenshots/booking.png`
- visible name: `Booking`
- description: Appointment-first layout with service menu, availability, staff/process, and booking CTA.
- best for: barbershop, salon, spa, clinic, consultations, appointments.

### 10. Restaurant Menu

- templateId: `restaurant-food-business`
- catalogType: `restaurant_menu_catalog`
- image: `/templates-preview/screenshots/services.png`
- visible name: `Restaurant Menu`
- description: Restaurant-first site with menu categories, signature dishes, specials, hours, and order/contact CTA.
- best for: restaurants, cafes, bakeries, food trucks, ghost kitchens.

### 11. Digital Products

- templateId: `digital-products-store`
- catalogType: `digital_offer_catalog`
- image: `/templates-preview/screenshots/premium.png`
- visible name: `Digital Products`
- description: Creator/SaaS-style product site with bundles, modules, proof, access panels, and instant access CTA.
- best for: courses, templates, software, memberships, downloads.

### 12. B2B SaaS / Enterprise

- templateId: `b2b-saas-enterprise-pro`
- catalogType: `b2b_solution_catalog`
- image: `/templates-preview/screenshots/b2b.png`
- visible name: `B2B SaaS / Enterprise`
- description: Enterprise software style for SaaS, automation, IT services, integrations, dashboards, and B2B systems.
- best for: software, automation, AI tools, IT services, enterprise demos.

### 13. Industrial Supplier

- templateId: `manufacturing-industrial-supplier-pro`
- catalogType: `industrial_supplier_catalog`
- image: `/templates-preview/screenshots/industrial.png`
- visible name: `Industrial Supplier`
- description: Technical B2B supplier style for machinery, parts, tools, safety equipment, specs, MOQ, and RFQs.
- best for: manufacturing, wholesale, parts, tools, bulk quoting.

### 14. Legal / Professional

- templateId: `legal-professional-services-pro`
- catalogType: `legal_professional_services_catalog`
- image: `/templates-preview/screenshots/professional.png`
- visible name: `Legal / Professional`
- description: Premium professional firm style for legal, accounting, tax, consulting, insurance, and B2B advisory.
- best for: law firms, accountants, insurance, consultants.

### 15. Clinic / Wellness

- templateId: `medical-wellness-clinic-pro`
- catalogType: `medical_wellness_service_catalog`
- image: `/templates-preview/screenshots/clinic.png`
- visible name: `Clinic / Wellness`
- description: Premium clinic style for medical, aesthetic, dental, wellness, therapy, and consultation-based businesses.
- best for: clinics, spas, aesthetics, dental, therapy.

### 16. Course Academy

- templateId: `education-course-academy-pro`
- catalogType: `education_course_catalog`
- image: `/templates-preview/screenshots/education.png`
- visible name: `Course Academy`
- description: Premium academy style for courses, coaching programs, bootcamps, classes, and training centers.
- best for: courses, coaching, schools, bootcamps, academies.

### 17. Real Estate / Listings

- templateId: `real-estate-listings-pro`
- catalogType: `real_estate_listing_catalog`
- image: `/templates-preview/screenshots/ebay.png`
- visible name: `Real Estate / Listings`
- description: Search-first listing site with filters, location, price/spec cards, area panels, and inquiry CTAs.
- best for: real estate, rentals, vehicles, inventory listings.

## Existing Source Files Included

- `templates-preview/index.html`: current preview page and sample HTML structures.
- `templates-preview/templates-preview.css`: current preview styling.
- `templates-preview/templates-preview.js`: current tab/preview logic.
- `templates-preview/screenshots/*`: current screenshot previews.

## Integration Target

The generated carousel should be easy to insert later into:

- `/start/`
- `/client/setup/`
- or a future template selection step inside LYRA.

Preferred output:

- one standalone HTML snippet
- one CSS block
- one vanilla JS block
- no framework dependency
- no CDN dependency

Use these data attributes for integration:

```html
data-template-id="mega-marketplace"
data-catalog-type="dense_marketplace_catalog"
```

Primary action should generate links like:

```html
/client/setup/?guided=1&templateId=mega-marketplace&catalogType=dense_marketplace_catalog
```

