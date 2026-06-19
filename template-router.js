(function () {
  const TEMPLATE_LIBRARY_URL = "/templates/all-templates.json";
  let templateCache = null;
  const PRO_TEMPLATES = [
    {
      id: "apple-premium-product",
      name: "Premium Product / Apple Style",
      category: "ecommerce",
      bestFor: ["premium products", "technology", "beauty devices", "single hero product", "luxury retail"],
      style: {
        tone: "minimal, premium, confident, product-led",
        layoutDensity: "low",
        imageStyle: "large cinematic product visuals, generous whitespace, close detail shots",
        defaultColors: { background: "#fbfbfd", surface: "#ffffff", primary: "#111827", secondary: "#6b7280", accent: "#0071e3" },
        fonts: { heading: "Inter", body: "Inter" },
      },
      sections: [
        { type: "announcement_bar", fields: { text: "{{smart_offer_or_launch_note}}", linkLabel: "{{announcement_link_label}}", linkUrl: "{{announcement_link_url}}" } },
        { type: "header_minimal", fields: { logo: "{{logo_url}}", businessName: "{{business_name}}", navItems: ["Overview", "Products", "Why it matters", "Contact"], ctaLabel: "{{primary_cta_label}}" } },
        { type: "hero_centered_product", fields: { eyebrow: "{{hero_eyebrow}}", headline: "{{ai_generated_product_headline}}", subheadline: "{{ai_generated_product_slogan}}", image: "{{hero_image}}", primaryButton: { label: "{{primary_cta_label}}", url: "/catalog" }, secondaryButton: { label: "{{secondary_cta_label}}", url: "/about" } } },
        { type: "feature_spotlight", fields: { title: "{{signature_benefit_title}}", text: "{{signature_benefit_text}}", highlights: "{{product_benefits}}" } },
        { type: "featured_products", fields: { title: "{{catalog_section_title}}", products: "{{featured_products}}", columns: 3 } },
        { type: "trust_strip", fields: { items: "{{trust_points}}" } },
        { type: "footer", fields: { businessName: "{{business_name}}", description: "{{short_description}}", socialLinks: "{{social_links}}" } },
      ],
      aiPrompt: "Use a premium Apple-level product presentation layout without copying any brand. Generate a cinematic centered hero, refined product slogan, large product visual area, editorial story sections, feature spotlight, curated small catalog, comparison/spec strip, calm CTAs, and premium trust copy. This template is for small catalogs, flagship products, luxury portfolios, technology products, beauty devices, creator portfolios, and high-presentation offers. Preserve the premium structure; only adapt colors, copy, products, imagery, and CTAs to the business.",
      catalogModel: {
        catalogType: "premium_editorial_catalog",
        productCardStyle: "large editorial cards with product imagery, short benefit, price, refined CTA, and minimal metadata",
        collectionLayout: "cinematic hero product story, feature spotlights, curated small catalog, comparison/spec strip",
        filters: ["category", "new", "best_seller"],
        productDetailModel: "gallery-first premium product detail with benefits, specs, social proof, sticky CTA",
        upsellModel: "complete the set and recommended accessories",
        customerFeeling: "Apple-style premium product page, polished and simple",
      },
      visualDifference: "Hero-first, spacious, cinematic product storytelling with minimal navigation and premium copy.",
      clientSelectionCard: { title: "Premium Product", category: "ecommerce", bestForLabel: "Apple-style products, tech, premium brands", difference: "Spacious product storytelling, refined sections, premium CTAs.", previewTags: ["apple", "premium", "product-led"] },
      pages: [
        { name: "Home", purpose: "Premium product story and conversion", usesSections: ["header_minimal", "hero_centered_product", "feature_spotlight", "featured_products", "trust_strip", "footer"] },
        { name: "Catalog", purpose: "Curated premium catalog", catalogType: "editorial_minimal_grid", layout: "featured hero product plus curated cards", filters: ["category", "new", "best_seller"] },
        { name: "Product", purpose: "Premium product detail", layout: "large gallery, benefits, specs, trust, sticky CTA", upsell: "recommended accessories" },
      ],
      editableSlots: ["headline", "slogan", "hero image", "logo", "colors", "benefits", "products", "CTAs", "section order"],
    },
    {
      id: "mega-marketplace",
      name: "Mega Marketplace / Amazon Style",
      category: "ecommerce",
      bestFor: ["large catalog", "electronics", "general store", "multi-category retail", "dropshipping"],
      style: {
        tone: "organized, practical, deal-focused, fast",
        layoutDensity: "high",
        imageStyle: "product thumbnails, category cards, deal banners",
        defaultColors: { background: "#f3f4f6", surface: "#ffffff", primary: "#111827", secondary: "#4b5563", accent: "#f59e0b" },
        fonts: { heading: "Inter", body: "Inter" },
      },
      sections: [
        { type: "marketplace_header", fields: { logo: "{{logo_url}}", businessName: "{{business_name}}", searchPlaceholder: "{{search_placeholder}}", navItems: ["Deals", "Categories", "Best Sellers", "Support"] } },
        { type: "hero_deals", fields: { headline: "{{deal_headline}}", subheadline: "{{deal_subheadline}}", deals: "{{featured_deals}}" } },
        { type: "category_tiles", fields: { title: "{{category_title}}", categories: "{{product_categories}}" } },
        { type: "deal_carousel", fields: { title: "{{deal_row_title}}", products: "{{deal_products}}" } },
        { type: "product_grid", fields: { title: "{{best_seller_title}}", products: "{{featured_products}}", columns: 5 } },
        { type: "trust_strip", fields: { items: "{{marketplace_trust_points}}" } },
        { type: "footer", fields: { businessName: "{{business_name}}", description: "{{short_description}}", legalLinks: ["Privacy", "Terms", "Returns"] } },
      ],
      aiPrompt: "Use a search-first mega marketplace layout inspired by large retailers, without copying any brand. Generate a dense shopping homepage with a utility header, prominent search, category rail, daily deal hero, compact deal rows, best sellers, sidebar filters, ratings, shipping badges, comparison cues, trust modules, and editable product/category text. Preserve this structure; only adapt colors, copy, products, imagery, and CTAs to the business.",
      catalogModel: {
        catalogType: "dense_marketplace_catalog",
        productCardStyle: "compact marketplace cards with discount, rating, shipping badge, compare, quick CTA",
        collectionLayout: "search bar, category rail, deal rows, sidebar filters, dense product grid",
        filters: ["category", "brand", "price", "rating", "availability", "shipping_speed"],
        productDetailModel: "marketplace detail with specs, reviews, Q&A, shipping estimate, bundles",
        upsellModel: "frequently bought together, deal bundles, recently viewed",
        customerFeeling: "Amazon-style product discovery and comparison",
      },
      visualDifference: "Dense search-first shopping experience with categories, filters, deals, ratings and quick comparison.",
      clientSelectionCard: { title: "Mega Marketplace", category: "ecommerce", bestForLabel: "large stores, many products, categories", difference: "Dense catalog, search, deals, ratings, filters.", previewTags: ["amazon", "marketplace", "dense"] },
      pages: [
        { name: "Home", purpose: "Marketplace discovery hub", usesSections: ["marketplace_header", "marketplace_search_hero", "category_rail", "deal_row", "best_seller_grid", "trust_strip", "footer"] },
        { name: "Catalog", purpose: "Search-first catalog", catalogType: "dense_marketplace_catalog", layout: "left filters, category pills, sort bar, compact product grid, ratings, delivery badges", filters: ["category", "brand", "price", "rating", "shipping_speed"] },
        { name: "Product", purpose: "Marketplace product detail", layout: "image gallery, price box, specs, reviews, Q&A, shipping estimate, bundles", upsell: "frequently bought together and related products" },
        { name: "Checkout", purpose: "Cart and checkout readiness", layout: "cart summary, delivery options, payment setup, customer support" },
      ],
      editableSlots: ["search labels", "categories", "deal hero", "deal rows", "product rows", "filters", "ratings", "shipping badges", "trust badges", "colors", "logo", "navigation", "checkout CTA"],
    },
    {
      id: "listing-marketplace-pro",
      name: "Listing Marketplace / eBay Style",
      category: "ecommerce",
      bestFor: ["multi-seller marketplace", "used products", "classifieds", "resale", "listings"],
      style: {
        tone: "direct, comparison-friendly, seller-trust oriented",
        layoutDensity: "high",
        imageStyle: "listing thumbnails, seller badges, condition labels",
        defaultColors: { background: "#f8fafc", surface: "#ffffff", primary: "#172554", secondary: "#64748b", accent: "#2563eb" },
        fonts: { heading: "Inter", body: "Inter" },
      },
      sections: [
        { type: "listing_header", fields: { logo: "{{logo_url}}", businessName: "{{business_name}}", searchPlaceholder: "{{search_placeholder}}", navItems: ["Listings", "Sellers", "Offers", "Help"] } },
        { type: "hero_listings", fields: { headline: "{{listing_headline}}", subheadline: "{{listing_subheadline}}", primaryButton: "{{primary_cta_label}}" } },
        { type: "saved_searches", fields: { title: "{{saved_search_title}}", searches: "{{product_categories}}" } },
        { type: "listing_grid", fields: { title: "{{listing_grid_title}}", products: "{{featured_products}}" } },
        { type: "seller_trust", fields: { title: "{{seller_trust_title}}", items: "{{trust_points}}" } },
        { type: "footer", fields: { businessName: "{{business_name}}", description: "{{short_description}}" } },
      ],
      aiPrompt: "Use an eBay-style listing marketplace. Generate listing-focused headlines, seller trust copy, condition labels, category searches, and editable listing/product text.",
      catalogModel: {
        catalogType: "listing_marketplace_catalog",
        productCardStyle: "horizontal listing cards with seller, condition, location, price, message/offer button",
        collectionLayout: "saved searches, filters, listing feed, seller trust panels",
        filters: ["category", "condition", "seller", "location", "price", "availability"],
        productDetailModel: "listing detail with seller profile, condition, location, message seller, related listings",
        upsellModel: "similar listings and seller recommendations",
        customerFeeling: "eBay-style listings and comparison marketplace",
      },
      visualDifference: "Listing-first marketplace with seller data, product condition, offer CTA, location and saved searches.",
      clientSelectionCard: { title: "Listing Marketplace", category: "ecommerce", bestForLabel: "eBay-style listings, used products, sellers", difference: "Seller listings, condition filters, comparison feed.", previewTags: ["ebay", "listings", "multi-seller"] },
      pages: [
        { name: "Home", purpose: "Listing marketplace entry", usesSections: ["listing_header", "hero_listings", "saved_searches", "listing_grid", "seller_trust", "footer"] },
        { name: "Listings", purpose: "Searchable listing feed", catalogType: "listing_marketplace_catalog", layout: "filters and listing feed", filters: ["category", "condition", "seller", "location", "price"] },
        { name: "Listing detail", purpose: "Seller and item detail", layout: "image, seller info, condition, offer CTA", upsell: "similar listings" },
      ],
      editableSlots: ["listing headline", "seller trust", "condition labels", "categories", "products/listings", "CTAs", "filters"],
    },
    {
      id: "fashion-drop-pro",
      name: "Fashion Drop / Shopify Boutique",
      category: "ecommerce",
      bestFor: ["fashion", "streetwear", "beauty", "accessories", "boutique", "drops"],
      style: {
        tone: "editorial, bold, visual, collection-led",
        layoutDensity: "medium",
        imageStyle: "lookbook photography, collection banners, lifestyle crops",
        defaultColors: { background: "#fff7fb", surface: "#ffffff", primary: "#18181b", secondary: "#71717a", accent: "#db2777" },
        fonts: { heading: "Inter", body: "Inter" },
      },
      sections: [
        { type: "fashion_header", fields: { logo: "{{logo_url}}", businessName: "{{business_name}}", navItems: ["New Drop", "Collections", "Lookbook", "Contact"] } },
        { type: "hero_editorial", fields: { eyebrow: "{{drop_eyebrow}}", headline: "{{drop_headline}}", subheadline: "{{drop_slogan}}", image: "{{hero_image}}" } },
        { type: "collection_drop", fields: { title: "{{collection_title}}", products: "{{featured_products}}" } },
        { type: "lookbook_banner", fields: { title: "{{lookbook_title}}", text: "{{lookbook_text}}", images: "{{lookbook_images}}" } },
        { type: "social_proof", fields: { title: "{{social_title}}", items: "{{testimonials}}" } },
        { type: "footer", fields: { businessName: "{{business_name}}", description: "{{short_description}}" } },
      ],
      aiPrompt: "Use a premium Shopify boutique fashion layout without copying any brand. Generate a bold editorial clothing drop with a strong lifestyle hero, collection navigation, featured drop story, lookbook strip, large product cards, size/fit guidance, complete-the-look upsells, and confident fashion CTAs. This template is for clothing stores, boutiques, streetwear, sneakers, accessories, fashion drops, and visual brands. Preserve the fashion structure; only adapt colors, copy, imagery, products, collections, and CTAs to the business.",
      catalogModel: {
        catalogType: "lookbook_collection_catalog",
        productCardStyle: "editorial cards with collection tag, lifestyle image, product name, drop price, quick shop",
        collectionLayout: "editorial drop hero, collection navigation, lookbook strip, new arrivals grid, fit guide, complete-the-look",
        filters: ["collection", "size", "color", "new_drop", "best_seller"],
        productDetailModel: "fashion PDP with gallery, size guide, fit notes, styled-with products",
        upsellModel: "complete the look and related drops",
        customerFeeling: "Shopify boutique with editorial fashion energy",
      },
      visualDifference: "Editorial fashion layout with lifestyle hero, collection storytelling, lookbook strip, large visual product cards, fit/size guide and complete-the-look modules.",
      clientSelectionCard: { title: "Fashion Drop", category: "ecommerce", bestForLabel: "fashion, boutique, beauty, accessories", difference: "Editorial drops, lookbook, visual collection storytelling.", previewTags: ["shopify", "fashion", "lookbook"] },
      pages: [
        { name: "Home", purpose: "Fashion drop launch", usesSections: ["fashion_header", "hero_editorial", "collection_drop", "lookbook_banner", "social_proof", "footer"] },
        { name: "Shop", purpose: "Collection shopping", catalogType: "lookbook_collection_catalog", layout: "collection drops and lookbook grid", filters: ["collection", "size", "color"] },
        { name: "Product", purpose: "Fashion product detail", layout: "gallery, fit notes, size guide, styled-with", upsell: "complete the look" },
      ],
      editableSlots: ["drop name", "slogan", "collections", "lookbook images", "products", "sizes/colors", "fit guide", "complete-the-look", "CTAs", "social proof"],
    },
    {
      id: "corporate-company-pro",
      name: "Corporate Company / Professional Website",
      category: "business",
      bestFor: ["company website", "corporate", "b2b", "agency", "consulting", "professional firm", "industrial business"],
      style: {
        tone: "credible, polished, strategic, institutional",
        layoutDensity: "medium",
        imageStyle: "team, office, project, operations and brand photography",
        defaultColors: { background: "#f7f8fb", surface: "#ffffff", primary: "#102033", secondary: "#607086", accent: "#2563eb" },
        fonts: { heading: "Inter", body: "Inter" },
      },
      sections: [
        { type: "corporate_header", fields: { logo: "{{logo_url}}", businessName: "{{business_name}}", navItems: ["Company", "Services", "Process", "Contact"], ctaLabel: "{{primary_cta_label}}" } },
        { type: "corporate_hero", fields: { headline: "{{ai_generated_company_headline}}", subheadline: "{{ai_generated_company_positioning}}", image: "{{hero_image}}", primaryButton: "{{primary_cta_label}}", secondaryButton: "{{secondary_cta_label}}" } },
        { type: "corporate_services", fields: { title: "{{services_title}}", services: "{{featured_services}}" } },
        { type: "corporate_process", fields: { title: "{{process_title}}", steps: "{{process_steps}}" } },
        { type: "corporate_proof", fields: { title: "{{proof_title}}", metrics: "{{trust_points}}" } },
        { type: "contact", fields: { title: "{{contact_title}}", text: "{{contact_text}}" } },
      ],
      aiPrompt: "Use a polished corporate website layout, not a store and not a marketplace. Generate credible company positioning, service/capability sections, process steps, proof points, client trust language, leadership/team copy, and a contact CTA. This template is for companies, agencies, B2B services, consultants, industrial businesses, firms, and organizations that need a professional web presence. Preserve the corporate structure; only adapt colors, copy, services, imagery, and CTAs to the business.",
      catalogModel: {
        catalogType: "company_services_catalog",
        productCardStyle: "capability cards with outcome, proof point, and consultation CTA",
        collectionLayout: "corporate hero, services, process, proof, team/trust, contact",
        filters: ["service", "industry", "capability"],
        productDetailModel: "service detail with scope, process, proof, and consultation CTA",
        upsellModel: "related services and strategic packages",
        customerFeeling: "professional corporate website built for trust and inquiries",
      },
      visualDifference: "Institutional website with strong positioning, service capabilities, process, proof points and contact conversion. No shopping UI.",
      clientSelectionCard: { title: "Corporate Company", category: "business", bestForLabel: "companies, firms, B2B, agencies", difference: "Professional presence, services, process, proof and contact.", previewTags: ["company", "corporate", "services"] },
      pages: [
        { name: "Home", purpose: "Company positioning and inquiry conversion", usesSections: ["corporate_header", "corporate_hero", "corporate_services", "corporate_process", "corporate_proof", "contact"] },
        { name: "Services", purpose: "Capabilities and service details", catalogType: "company_services_catalog", layout: "capability cards and consultation CTA", filters: ["service", "industry"] },
        { name: "Company", purpose: "About, credibility, team and proof", layout: "story, metrics, process, leadership" },
        { name: "Contact", purpose: "Consultation or inquiry request", layout: "contact details, inquiry CTA, location" },
      ],
      editableSlots: ["headline", "positioning", "services", "process", "proof points", "team", "photos", "contact info", "CTAs", "section order"],
    },
    {
      id: "lead-funnel-pro",
      name: "Landing / Lead Funnel Pro",
      category: "business",
      bestFor: ["landing page", "lead generation", "consulting", "course", "clinic", "campaign", "high-ticket services", "quote requests"],
      style: {
        tone: "persuasive, focused, benefit-led, conversion-oriented",
        layoutDensity: "medium",
        imageStyle: "hero proof image, outcome visuals, client transformation and trust assets",
        defaultColors: { background: "#fffdf8", surface: "#ffffff", primary: "#171717", secondary: "#6b5f52", accent: "#f97316" },
        fonts: { heading: "Inter", body: "Inter" },
      },
      sections: [
        { type: "funnel_header", fields: { logo: "{{logo_url}}", businessName: "{{business_name}}", navItems: ["Offer", "Benefits", "Proof", "FAQ"], ctaLabel: "{{primary_cta_label}}" } },
        { type: "funnel_hero", fields: { headline: "{{ai_generated_offer_headline}}", subheadline: "{{ai_generated_offer_positioning}}", primaryButton: "{{primary_cta_label}}", secondaryButton: "{{secondary_cta_label}}", image: "{{hero_image}}" } },
        { type: "funnel_benefits", fields: { title: "{{benefits_title}}", benefits: "{{ai_generated_benefits}}" } },
        { type: "funnel_offer", fields: { title: "{{offer_title}}", offerItems: "{{featured_services}}", guarantee: "{{guarantee_text}}" } },
        { type: "funnel_proof", fields: { title: "{{proof_title}}", testimonials: "{{proof_points}}" } },
        { type: "funnel_faq", fields: { title: "{{faq_title}}", questions: "{{faq_items}}" } },
        { type: "contact", fields: { title: "{{contact_title}}", text: "{{contact_text}}" } },
      ],
      aiPrompt: "Use a high-converting lead funnel landing page, not a store and not a marketplace. Generate a sharp promise, benefit-driven copy, offer stack, proof/testimonials, objections/FAQ, urgency only when appropriate, and one primary lead capture CTA. This template is for service offers, campaigns, courses, clinics, consultants, financing, insurance, high-ticket packages, and businesses that need leads or quote requests. Preserve the funnel structure; only adapt copy, visuals, colors, offer details, proof points, and CTAs to the business.",
      catalogModel: {
        catalogType: "lead_funnel_offer_catalog",
        productCardStyle: "offer cards with benefit, outcome, quote/apply CTA and optional bonus",
        collectionLayout: "promise hero, benefits, offer stack, proof, FAQ, lead capture",
        filters: ["offer", "audience", "outcome"],
        productDetailModel: "offer detail with outcome, who it is for, what is included, proof and apply CTA",
        upsellModel: "bonus modules, packages and follow-up consultation",
        customerFeeling: "focused landing page built to request a quote, apply, book or start",
      },
      visualDifference: "Conversion-first landing page with one offer, strong promise, benefits, offer stack, proof, FAQ and direct lead capture. No shopping UI.",
      clientSelectionCard: { title: "Lead Funnel", category: "business", bestForLabel: "offers, campaigns, services, courses, clinics", difference: "One offer, strong CTA, benefits, proof and FAQ.", previewTags: ["landing", "leads", "funnel"] },
      pages: [
        { name: "Home", purpose: "Lead capture conversion", usesSections: ["funnel_header", "funnel_hero", "funnel_benefits", "funnel_offer", "funnel_proof", "funnel_faq", "contact"] },
        { name: "Offer", purpose: "Offer details and benefits", catalogType: "lead_funnel_offer_catalog", layout: "offer stack with lead CTA", filters: ["offer", "outcome"] },
        { name: "Proof", purpose: "Testimonials, outcomes and objections", layout: "proof, FAQ, trust and guarantee" },
        { name: "Contact", purpose: "Lead capture or quote request", layout: "form, WhatsApp, phone and next step" },
      ],
      editableSlots: ["promise headline", "benefits", "offer stack", "bonuses", "proof", "testimonials", "FAQ", "guarantee", "contact info", "CTAs", "section order"],
    },
    {
      id: "home-services-premium",
      name: "Local Services Premium",
      category: "services",
      bestFor: ["contractors", "cleaning", "construction", "hvac", "electricians", "plumbers", "mechanics", "landscaping", "security", "home services"],
      style: {
        tone: "trusted local expert, direct, premium, quote-focused",
        layoutDensity: "medium-high",
        imageStyle: "real jobsite photos, team in uniform, before and after proof, service vehicles, local trust",
        defaultColors: { background: "#f5f7f2", surface: "#ffffff", primary: "#15231d", secondary: "#5c6b61", accent: "#f59e0b" },
        fonts: { heading: "Inter", body: "Inter" },
      },
      sections: [
        { type: "home_service_header", fields: { logo: "{{logo_url}}", businessName: "{{business_name}}", navItems: ["Services", "Areas", "Work", "Reviews", "Quote"], ctaLabel: "{{quote_cta_label}}" } },
        { type: "home_service_hero", fields: { headline: "{{local_service_headline}}", subheadline: "{{local_service_slogan}}", phone: "{{phone}}", primaryButton: "{{quote_cta_label}}", secondaryButton: "{{call_cta_label}}" } },
        { type: "home_service_categories", fields: { title: "{{service_section_title}}", services: "{{featured_products}}" } },
        { type: "home_service_area", fields: { title: "{{service_area_title}}", text: "{{service_area_text}}", areas: "{{service_areas}}" } },
        { type: "before_after_gallery", fields: { title: "{{before_after_title}}", images: "{{photo_urls}}" } },
        { type: "trust_reviews", fields: { title: "{{trust_title}}", items: "{{testimonials}}" } },
        { type: "quote_panel", fields: { title: "{{contact_title}}", text: "{{contact_text}}" } },
      ],
      aiPrompt: "Use a premium local service website layout for contractors, cleaning, construction, HVAC, plumbing, electrical, mechanics, landscaping, security or other local pros. Make the hero phone/WhatsApp and quote CTA obvious. Generate service categories, service area copy, before/after proof, trust/reviews, emergency or same-day wording when appropriate, and a clear quote request flow. Do not make it look like a marketplace or generic company site.",
      catalogModel: {
        catalogType: "home_services_quote_catalog",
        productCardStyle: "service cards with problem solved, service area, quote-only CTA, trust note and optional starting price",
        collectionLayout: "local hero with phone, service categories, areas served, before/after proof, reviews, quote panel",
        filters: ["service_type", "service_area", "urgency", "quote_only", "availability"],
        productDetailModel: "service detail with scope, what is included, preparation, before/after proof, quote CTA",
        upsellModel: "maintenance plans, emergency add-ons, bundles and recurring service",
        customerFeeling: "reliable local pro ready to call or request a quote",
      },
      visualDifference: "Premium local service conversion page with phone-first hero, quote CTAs, service areas, before/after proof, trust reviews and no ecommerce cart.",
      clientSelectionCard: { title: "Local Services Premium", category: "services", bestForLabel: "contractors, cleaning, HVAC, repairs, local pros", difference: "Phone-first local service page with proof, areas and quote flow.", previewTags: ["local", "quotes", "services"] },
      pages: [
        { name: "Home", purpose: "Local service quote conversion", usesSections: ["home_service_header", "home_service_hero", "home_service_categories", "home_service_area", "before_after_gallery", "trust_reviews", "quote_panel"] },
        { name: "Services", purpose: "Service catalog", catalogType: "home_services_quote_catalog", layout: "service cards with quote CTA", filters: ["service_type", "area", "urgency"] },
        { name: "Areas", purpose: "Service area proof", layout: "cities, neighborhoods, emergency notes and response expectations" },
        { name: "Work", purpose: "Before and after gallery", layout: "proof gallery and customer outcomes" },
        { name: "Quote", purpose: "Quote request", layout: "contact, phone, WhatsApp, quote expectations" },
      ],
      editableSlots: ["services", "service areas", "phone", "WhatsApp", "quote CTA", "before/after photos", "reviews", "trust badges", "response time", "contact info"],
    },
    {
      id: "local-services-pro-plus",
      name: "Local Services Pro",
      category: "services",
      bestFor: ["contractors", "cleaning", "mechanics", "barbers", "clinics", "local services"],
      style: {
        tone: "trustworthy, local, clear, action-oriented",
        layoutDensity: "medium",
        imageStyle: "real work photos, service area visuals, team/trust images",
        defaultColors: { background: "#f8fafc", surface: "#ffffff", primary: "#0f766e", secondary: "#475569", accent: "#14b8a6" },
        fonts: { heading: "Inter", body: "Inter" },
      },
      sections: [
        { type: "service_header", fields: { logo: "{{logo_url}}", businessName: "{{business_name}}", navItems: ["Services", "Service Area", "Reviews", "Contact"], ctaLabel: "{{quote_cta_label}}" } },
        { type: "hero_service", fields: { headline: "{{service_headline}}", subheadline: "{{service_slogan}}", primaryButton: "{{quote_cta_label}}", secondaryButton: "{{call_cta_label}}" } },
        { type: "service_cards", fields: { title: "{{service_section_title}}", services: "{{featured_products}}" } },
        { type: "service_area", fields: { title: "{{service_area_title}}", text: "{{service_area_text}}", areas: "{{service_areas}}" } },
        { type: "reviews_trust", fields: { title: "{{trust_title}}", items: "{{testimonials}}" } },
        { type: "contact_quote", fields: { title: "{{contact_title}}", text: "{{contact_text}}" } },
      ],
      aiPrompt: "Use a local service conversion layout. Generate clear service headlines, quote CTAs, service area copy, trust/review copy, and contact wording. Make every service editable.",
      catalogModel: {
        catalogType: "service_area_catalog",
        productCardStyle: "service cards with outcome, starting price/quote label, service area note, CTA",
        collectionLayout: "hero quote CTA, service cards, service area, reviews, contact form",
        filters: ["service_type", "service_area", "availability", "quote_only"],
        productDetailModel: "service detail with scope, process, before/after proof, quote CTA",
        upsellModel: "related services and maintenance plans",
        customerFeeling: "local pro service page built for quote requests",
      },
      visualDifference: "Trust-first local service layout with quote CTAs, service area, reviews and practical service cards.",
      clientSelectionCard: { title: "Local Services Pro", category: "services", bestForLabel: "contractors, cleaning, repairs, local pros", difference: "Quote-first, trust-heavy, service area focused.", previewTags: ["services", "quotes", "local"] },
      pages: [
        { name: "Home", purpose: "Local service conversion", usesSections: ["service_header", "hero_service", "service_cards", "service_area", "reviews_trust", "contact_quote"] },
        { name: "Services", purpose: "Service catalog", catalogType: "service_area_catalog", layout: "service cards with quote CTA", filters: ["service_type", "area", "availability"] },
        { name: "Contact", purpose: "Quote request", layout: "contact form, phone, WhatsApp, service area", upsell: "related services" },
      ],
      editableSlots: ["services", "service areas", "quote CTAs", "reviews", "trust badges", "photos", "contact info"],
    },
    {
      id: "booking-appointment-pro",
      name: "Booking / Appointment",
      category: "services",
      bestFor: ["barbershop", "salon", "spa", "clinic", "classes", "consultations"],
      style: {
        tone: "calm, scheduled, clear, professional",
        layoutDensity: "medium",
        imageStyle: "service photos, staff cards, schedule cards",
        defaultColors: { background: "#f7f3ed", surface: "#ffffff", primary: "#27272a", secondary: "#71717a", accent: "#b45309" },
        fonts: { heading: "Inter", body: "Inter" },
      },
      sections: [
        { type: "booking_header", fields: { logo: "{{logo_url}}", businessName: "{{business_name}}", navItems: ["Services", "Availability", "Team", "Contact"], ctaLabel: "{{booking_cta_label}}" } },
        { type: "hero_booking", fields: { headline: "{{booking_headline}}", subheadline: "{{booking_slogan}}", primaryButton: "{{booking_cta_label}}" } },
        { type: "service_menu", fields: { title: "{{service_menu_title}}", services: "{{featured_products}}" } },
        { type: "availability_panel", fields: { title: "{{availability_title}}", times: "{{availability_times}}" } },
        { type: "staff_or_process", fields: { title: "{{staff_title}}", items: "{{staff_or_steps}}" } },
        { type: "contact_booking", fields: { title: "{{contact_title}}", text: "{{contact_text}}" } },
      ],
      aiPrompt: "Use a booking-first appointment layout. Generate service menu copy, booking CTA, availability wording, staff/process copy, and confirmation-focused text.",
      catalogModel: {
        catalogType: "booking_menu_catalog",
        productCardStyle: "appointment cards with duration, price/starting at, staff/availability, book CTA",
        collectionLayout: "booking hero, service menu, availability panel, staff/process, contact",
        filters: ["service", "duration", "staff", "availability", "price"],
        productDetailModel: "service detail with duration, what is included, staff, preparation notes, booking CTA",
        upsellModel: "add-ons and package bundles",
        customerFeeling: "appointment site with clear booking flow",
      },
      visualDifference: "Booking-first layout with service menu, availability panel, staff/process blocks and direct reservation CTA.",
      clientSelectionCard: { title: "Booking / Appointment", category: "services", bestForLabel: "barbers, salons, clinics, classes", difference: "Schedule-focused, service menu, staff/process, booking CTA.", previewTags: ["booking", "appointments", "service menu"] },
      pages: [
        { name: "Home", purpose: "Booking conversion", usesSections: ["booking_header", "hero_booking", "service_menu", "availability_panel", "staff_or_process", "contact_booking"] },
        { name: "Services", purpose: "Bookable service menu", catalogType: "booking_menu_catalog", layout: "service cards with duration and booking CTA", filters: ["service", "duration", "staff"] },
        { name: "Booking", purpose: "Appointment request", layout: "availability, contact, confirmation expectations", upsell: "packages and add-ons" },
      ],
      editableSlots: ["services", "durations", "prices", "staff", "availability", "booking CTA", "contact", "photos"],
    },
  ];

  const INTENT_RULES = [
    {
      intent: "amazon_marketplace",
      templateId: "mega-marketplace",
      catalogType: "dense_marketplace_catalog",
      keywords: ["tipo amazon", "como amazon", "amazon style", "mega marketplace", "marketplace", "muchas categorias", "muchas categorías", "muchos productos", "busqueda y filtros", "búsqueda y filtros", "multi category", "multi-categoria"],
    },
    {
      intent: "classified_marketplace",
      templateId: "listing-marketplace-pro",
      catalogType: "listing_marketplace_catalog",
      keywords: ["tipo ebay", "como ebay", "ebay style", "productos usados", "listings", "clasificados", "vendedores", "condicion del producto", "condición del producto"],
    },
    {
      intent: "restaurant",
      templateId: "restaurant-food-business",
      catalogType: "menu_catalog",
      keywords: ["restaurante", "restaurant", "food truck", "cafeteria", "cafetería", "catering", "menu", "menú"],
    },
    {
      intent: "appointments",
      templateId: "booking-appointment-pro",
      catalogType: "booking_menu_catalog",
      keywords: ["barberia", "barbería", "barbershop", "salon", "spa", "citas", "reservas", "appointments"],
    },
    {
      intent: "home_local_service",
      templateId: "home-services-premium",
      catalogType: "home_services_quote_catalog",
      keywords: ["contratista", "contractor", "construccion", "construcción", "construction", "limpieza", "cleaning", "plomeria", "plomería", "plumbing", "electricista", "electrician", "hvac", "aire acondicionado", "air conditioning", "mecanico", "mecánico", "mechanic", "landscaping", "jardineria", "jardinería", "seguridad", "security", "servicio local", "local service", "reparacion", "reparación", "repair", "presupuesto", "cotizacion", "cotización", "quote", "same day", "emergencia", "emergency"],
    },
    {
      intent: "corporate_company",
      templateId: "corporate-company-pro",
      catalogType: "company_services_catalog",
      keywords: ["empresa", "company", "corporate", "corporativo", "pagina web", "página web", "website", "b2b", "agencia", "agency", "consulting", "consultoria", "consultoría", "firma", "industrial", "manufacturing", "business website"],
    },
    {
      intent: "lead_funnel",
      templateId: "lead-funnel-pro",
      catalogType: "lead_funnel_offer_catalog",
      keywords: ["landing", "landing page", "funnel", "embudo", "captar clientes", "captar leads", "leads", "campaña", "campaign", "oferta", "offer", "paquete", "programa", "curso", "course", "clinica", "clínica", "estetica", "estética", "seguro", "insurance", "financiamiento", "financing", "aplicar", "apply", "book call", "agenda una llamada", "solicitar cotizacion", "solicitar cotización", "alta conversion", "alta conversión"],
    },
    {
      intent: "local_service",
      templateId: "local-services-pro-plus",
      catalogType: "service_area_catalog",
      keywords: ["limpieza", "cleaning", "servicios locales", "quote", "cotizacion", "cotización"],
    },
    {
      intent: "professional_services",
      templateId: "professional-services",
      catalogType: "practice_area_catalog",
      keywords: ["abogado", "lawyer", "contador", "accountant", "seguros", "consultoria", "consultoría", "real estate"],
    },
    {
      intent: "contractor",
      templateId: "contractor-before-after",
      catalogType: "project_gallery_catalog",
      keywords: ["contractor", "remodelacion", "remodelación", "construction", "pintura", "flooring", "roofing", "antes y despues", "antes y después"],
    },
    {
      intent: "digital_products",
      templateId: "digital-products-store",
      catalogType: "digital_offer_catalog",
      keywords: ["curso", "courses", "ebook", "templates", "software", "membresia", "membresía"],
    },
    {
      intent: "fashion",
      templateId: "fashion-drop-pro",
      catalogType: "lookbook_collection_catalog",
      keywords: ["ropa", "fashion", "boutique", "tipo nike", "streetwear", "sneakers", "cyberpunk", "futurista", "neon", "neón", "gaming", "super cool"],
    },
    {
      intent: "minimal_premium",
      templateId: "apple-premium-product",
      catalogType: "premium_editorial_catalog",
      keywords: ["tipo apple", "apple style", "minimal", "premium", "limpio", "simple", "producto premium", "minimalista", "portafolio", "portfolio", "producto estrella", "productos extravagantes", "presentacion excelente", "excelente presentacion"],
    },
    {
      intent: "luxury",
      templateId: "luxury-product-store",
      catalogType: "luxury_gallery_catalog",
      keywords: ["lujo", "luxury", "joyeria", "joyería", "perfumes", "relojes", "cuero"],
    },
    {
      intent: "startup",
      templateId: "startup-landing",
      catalogType: "pricing_plan_catalog",
      keywords: ["app", "saas", "startup", "plataforma", "ai tool"],
    },
    {
      intent: "event",
      templateId: "event-promo-landing",
      catalogType: "ticket_or_offer_catalog",
      keywords: ["evento", "webinar", "promo", "lanzamiento", "tickets"],
    },
    {
      intent: "personal_brand",
      templateId: "personal-brand-landing",
      catalogType: "service_package_catalog",
      keywords: ["coach", "consultor", "freelancer", "speaker", "marca personal"],
    },
  ];

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  async function loadTemplates() {
    if (templateCache) return templateCache;
    const response = await fetch(TEMPLATE_LIBRARY_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Could not load templates: ${response.status}`);
    const templates = await response.json();
    templateCache = addSyntheticTemplates(mergeProTemplates(Array.isArray(templates) ? templates : []));
    return templateCache;
  }

  function mergeProTemplates(templates) {
    const byId = new Map();
    [...templates, ...PRO_TEMPLATES].forEach((template) => {
      if (!template?.id) return;
      byId.set(template.id, template);
    });
    return [
      ...PRO_TEMPLATES.map((template) => byId.get(template.id)).filter(Boolean),
      ...templates.filter((template) => template?.id && !PRO_TEMPLATES.some((pro) => pro.id === template.id)),
    ];
  }

  function addSyntheticTemplates(templates) {
    if (templates.some((template) => template.id === "classified-marketplace")) return templates;
    const base = templates.find((template) => template.id === "marketplace-style") || templates[0] || {};
    const classified = structuredClone(base);
    classified.id = "classified-marketplace";
    classified.name = "Classified Marketplace";
    classified.category = "ecommerce";
    classified.bestFor = ["used products", "classified listings", "multi-seller catalog"];
    classified.aiPrompt = "Build an eBay-style classified marketplace with seller listings, condition labels, search, filters, and trust.";
    classified.visualDifference = "Listing-first marketplace with seller cards, product condition, location, saved searches, and offer CTAs.";
    classified.catalogModel = {
      ...(classified.catalogModel || {}),
      catalogType: "listing_marketplace_catalog",
      productCardStyle: "listing cards with seller, condition, location, price, offer button",
      collectionLayout: "search-first classified listings with filters and seller trust",
      filters: ["category", "condition", "seller", "location", "price", "availability"],
      productDetailModel: "classified listing detail with seller info, condition, message seller, related listings",
      upsellModel: "similar listings and seller recommendations",
      customerFeeling: "eBay-style listings, second-hand discovery, seller marketplace",
    };
    classified.clientSelectionCard = {
      title: "Classified Marketplace",
      category: "ecommerce",
      bestForLabel: "used products, sellers, listings",
      difference: classified.visualDifference,
      previewTags: ["listing_marketplace_catalog", "seller listings", "condition filters"],
    };
    return [...templates, classified];
  }

  async function selectTemplateFromPrompt(userPrompt) {
    const templates = await loadTemplates();
    const normalized = normalizeText(userPrompt);
    const matchedRule = selectBestIntentRule(normalized);
    const rule = matchedRule || {
      intent: "default_minimal",
      templateId: "apple-premium-product",
      catalogType: "premium_editorial_catalog",
      keywords: [],
    };
    const template = templates.find((item) => item.id === rule.templateId) || templates.find((item) => item.id === "minimal-store") || templates[0];
    const catalogType = template?.catalogModel?.catalogType || rule.catalogType;
    return {
      templateId: template?.id || rule.templateId,
      template,
      intent: rule.intent,
      catalogType,
      reason: matchedRule
        ? `Matched keywords for ${rule.intent}`
        : "No exact intent matched; using a safe minimal ecommerce template",
    };
  }

  async function getTemplateCandidates(userPrompt, limit = 3) {
    const templates = await loadTemplates();
    const normalized = normalizeText(userPrompt);
    const scored = INTENT_RULES.map((rule) => {
      const matches = rule.keywords.filter((keyword) => normalized.includes(normalizeText(keyword)));
      const score = matches.reduce((total, keyword) => total + Math.max(1, normalizeText(keyword).split(" ").length), 0);
      return { rule, score, matches };
    })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    const primary = scored.length
      ? scored
      : [{ rule: { intent: "default_minimal", templateId: "apple-premium-product", catalogType: "premium_editorial_catalog" }, score: 0, matches: [] }];

    const selected = [];
    const addRule = (rule, score = 0, reason = "") => {
      if (!rule?.templateId || selected.some((item) => item.templateId === rule.templateId)) return;
      const template = templates.find((item) => item.id === rule.templateId) || templates.find((item) => item.id === "minimal-store") || templates[0];
      selected.push({
        templateId: template?.id || rule.templateId,
        template,
        intent: rule.intent,
        catalogType: template?.catalogModel?.catalogType || rule.catalogType,
        score,
        reason: reason || (score > 0 ? `Matched keywords for ${rule.intent}` : "Recommended alternative"),
      });
    };

    primary.forEach((item) => addRule(item.rule, item.score));

    const primaryCatalogType = selected[0]?.catalogType || primary[0]?.rule?.catalogType || "";
    const fallbackIds = normalized.includes("marketplace") || /marketplace|listing|dense/.test(primaryCatalogType)
      ? ["mega-marketplace", "listing-marketplace-pro", "fashion-drop-pro"]
      : normalized.includes("servicio") || normalized.includes("service") || /service|booking/.test(primaryCatalogType)
        ? ["home-services-premium", "lead-funnel-pro", "local-services-pro-plus", "booking-appointment-pro"]
        : ["lead-funnel-pro", "corporate-company-pro", "apple-premium-product", "fashion-drop-pro"];

    fallbackIds.forEach((templateId) => {
      const template = templates.find((item) => item.id === templateId);
      if (!template) return;
      addRule({
        intent: "visual_alternative",
        templateId,
        catalogType: template.catalogModel?.catalogType || "premium_editorial_catalog",
      }, 0);
    });

    return selected.slice(0, Math.max(1, limit));
  }

  function selectBestIntentRule(normalizedPrompt) {
    const scored = INTENT_RULES.map((rule) => {
      const matches = rule.keywords.filter((keyword) => normalizedPrompt.includes(normalizeText(keyword)));
      const exactWeight = matches.reduce((score, keyword) => score + Math.max(1, normalizeText(keyword).split(" ").length), 0);
      return { rule, score: exactWeight, matches };
    })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);
    return scored[0]?.rule || null;
  }

  async function getTemplateById(templateId) {
    const templates = await loadTemplates();
    return templates.find((item) => item.id === templateId) || null;
  }

  window.TemplateRouter = {
    loadTemplates,
    getTemplateById,
    selectTemplateFromPrompt,
    getTemplateCandidates,
    normalizeText,
    intentRules: INTENT_RULES,
  };
})();
