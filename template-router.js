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
      id: "luxury-high-ticket-pro",
      name: "Luxury High Ticket Pro",
      category: "ecommerce",
      bestFor: ["jewelry", "watches", "art", "collectibles", "luxury cars", "private client sales", "high-ticket retail"],
      style: {
        tone: "exclusive, editorial, calm, private-client",
        layoutDensity: "low",
        imageStyle: "cinematic product closeups, gallery lighting, premium materials, private showroom feel",
        defaultColors: { background: "#0d0a07", surface: "#17110c", primary: "#f7efe2", secondary: "#b8a98f", accent: "#d6a84f" },
        fonts: { heading: "Playfair Display", body: "Inter" },
      },
      sections: [
        { type: "luxury_header", fields: { logo: "{{logo_url}}", businessName: "{{business_name}}", navItems: ["Collection", "Pieces", "Provenance", "Private inquiry"], ctaLabel: "{{private_cta_label}}" } },
        { type: "luxury_hero", fields: { eyebrow: "{{luxury_eyebrow}}", headline: "{{ai_generated_private_luxury_headline}}", subheadline: "{{ai_generated_private_luxury_slogan}}", image: "{{hero_image}}", primaryButton: "{{private_cta_label}}", secondaryButton: "{{collection_cta_label}}" } },
        { type: "signature_piece", fields: { title: "{{signature_piece_title}}", text: "{{signature_piece_story}}", image: "{{signature_piece_image}}", proofPoints: "{{provenance_points}}" } },
        { type: "curated_collection", fields: { title: "{{collection_section_title}}", products: "{{featured_products}}", columns: 3 } },
        { type: "provenance_panel", fields: { title: "{{provenance_title}}", items: "{{authenticity_points}}" } },
        { type: "private_service", fields: { title: "{{private_service_title}}", text: "{{private_service_text}}", ctaLabel: "{{private_cta_label}}" } },
        { type: "footer", fields: { businessName: "{{business_name}}", description: "{{short_description}}", socialLinks: "{{social_links}}" } },
      ],
      aiPrompt: "Use a luxury high-ticket private-client layout, not a generic store. Generate a cinematic editorial hero, exclusive headline, curated collection, signature piece story, provenance/authenticity section, concierge/private appointment CTA, price-on-request language, scarcity and trust cues. This template is for jewelry, watches, art, collectibles, luxury cars, premium perfumes, leather goods, high-ticket boutiques and private client sales. Preserve the luxury structure; only adapt colors, copy, products, imagery, and CTAs to the business.",
      catalogModel: {
        catalogType: "luxury_high_ticket_catalog",
        productCardStyle: "large editorial cards with high-end imagery, category, authenticity/scarcity badge, price on request, and private inquiry CTA",
        collectionLayout: "private showroom hero, signature piece story, curated collection, provenance, concierge inquiry",
        filters: ["category", "collection", "availability", "provenance", "appointment"],
        productDetailModel: "gallery-first high-ticket detail with provenance, materials, availability, appointment request, private notes",
        upsellModel: "matching pieces, private collection, client advisor recommendations",
        customerFeeling: "private luxury showroom with editorial confidence",
      },
      visualDifference: "Dark editorial luxury showroom with provenance, price-on-request, curated collection and private appointment flow.",
      clientSelectionCard: { title: "Luxury High Ticket", category: "ecommerce", bestForLabel: "jewelry, watches, art, cars, premium pieces", difference: "Private showroom, provenance, limited pieces, appointment CTA.", previewTags: ["luxury", "high-ticket", "private"] },
      pages: [
        { name: "Home", purpose: "Private luxury showroom entry", usesSections: ["luxury_header", "luxury_hero", "signature_piece", "curated_collection", "provenance_panel", "private_service", "footer"] },
        { name: "Collection", purpose: "Curated high-ticket catalog", catalogType: "luxury_high_ticket_catalog", layout: "large editorial cards with private inquiry", filters: ["category", "availability", "provenance"] },
        { name: "Provenance", purpose: "Authenticity, materials, sourcing and client confidence", layout: "proof panels, service details, standards" },
        { name: "Private Inquiry", purpose: "Appointment and concierge request", layout: "private consultation CTA, contact, preferred piece notes" },
      ],
      editableSlots: ["headline", "slogan", "hero image", "signature piece", "products", "provenance points", "private service copy", "logo", "colors", "CTAs", "section order"],
    },
    {
      id: "education-course-academy-pro",
      name: "Education / Course Academy Pro",
      category: "education",
      bestFor: ["online courses", "academies", "coaching programs", "bootcamps", "training centers", "memberships"],
      style: {
        tone: "clear, expert, motivating, structured",
        layoutDensity: "medium",
        imageStyle: "premium learning dashboard, instructor portraits, module previews, progress cards",
        defaultColors: { background: "#f7fbff", surface: "#ffffff", primary: "#0f172a", secondary: "#475569", accent: "#2563eb" },
        fonts: { heading: "Inter", body: "Inter" },
      },
      sections: [
        { type: "academy_header", fields: { logo: "{{logo_url}}", businessName: "{{business_name}}", navItems: ["Programs", "Outcomes", "Instructor", "Enroll"], ctaLabel: "{{enroll_cta_label}}" } },
        { type: "academy_hero", fields: { headline: "{{ai_generated_course_headline}}", subheadline: "{{ai_generated_course_slogan}}", image: "{{hero_image}}", primaryButton: "{{enroll_cta_label}}", secondaryButton: "{{curriculum_cta_label}}" } },
        { type: "learning_path", fields: { title: "{{learning_path_title}}", modules: "{{course_modules}}" } },
        { type: "course_catalog", fields: { title: "{{programs_title}}", products: "{{featured_products}}", columns: 3 } },
        { type: "outcomes_panel", fields: { title: "{{outcomes_title}}", items: "{{learning_outcomes}}" } },
        { type: "instructor_trust", fields: { title: "{{instructor_title}}", text: "{{instructor_text}}", items: "{{trust_points}}" } },
        { type: "enrollment_cta", fields: { title: "{{enrollment_title}}", text: "{{enrollment_text}}", ctaLabel: "{{enroll_cta_label}}" } },
        { type: "footer", fields: { businessName: "{{business_name}}", description: "{{short_description}}", socialLinks: "{{social_links}}" } },
      ],
      aiPrompt: "Use a premium education and course academy layout, not a generic product store. Generate a learning-focused homepage with a strong course promise, module roadmap, program cards, outcomes, instructor credibility, student proof, enrollment CTA, access notes, and editable curriculum/service details. This template is for online courses, academies, coaching programs, bootcamps, training centers, paid communities and learning memberships. Preserve the academy structure; only adapt colors, copy, programs, imagery and CTAs to the business.",
      catalogModel: {
        catalogType: "education_course_catalog",
        productCardStyle: "program cards with level, duration, outcome, access label, editable price and enroll CTA",
        collectionLayout: "academy hero, learning path, program catalog, outcomes, instructor trust, enrollment CTA",
        filters: ["level", "topic", "duration", "format", "access"],
        productDetailModel: "course detail with modules, lessons, outcomes, instructor, bonuses, enrollment CTA",
        upsellModel: "coaching add-on, bundle paths, advanced modules, membership access",
        customerFeeling: "premium academy with clear curriculum and confident learning path",
      },
      visualDifference: "Structured academy site with module roadmap, outcomes, instructor credibility and enrollment flow.",
      clientSelectionCard: { title: "Course Academy", category: "education", bestForLabel: "courses, coaching, bootcamps, academies", difference: "Learning path, modules, outcomes, instructor trust and enrollment CTA.", previewTags: ["academy", "course", "learning"] },
      pages: [
        { name: "Home", purpose: "Academy pitch and enrollment", usesSections: ["academy_header", "academy_hero", "learning_path", "course_catalog", "outcomes_panel", "instructor_trust", "enrollment_cta", "footer"] },
        { name: "Programs", purpose: "Course and program catalog", catalogType: "education_course_catalog", layout: "program cards with module counts, outcomes and enroll CTA", filters: ["level", "topic", "duration", "format"] },
        { name: "Curriculum", purpose: "Learning roadmap and modules", layout: "module roadmap, lessons, milestones, bonuses" },
        { name: "Enroll", purpose: "Enrollment inquiry or checkout", layout: "contact, access notes, cohort details, next step" },
      ],
      editableSlots: ["headline", "slogan", "hero image", "course modules", "programs", "outcomes", "instructor copy", "trust proof", "prices", "logo", "colors", "CTAs", "section order"],
    },
    {
      id: "medical-wellness-clinic-pro",
      name: "Medical / Wellness Clinic Pro",
      category: "services",
      bestFor: ["clinics", "med spas", "aesthetic clinics", "dental offices", "wellness centers", "nutrition", "therapy", "skin care"],
      style: {
        tone: "calm, clinical, trustworthy, appointment-focused",
        layoutDensity: "medium",
        imageStyle: "bright clinic visuals, treatment plan cards, specialist portraits, result proof, appointment panels",
        defaultColors: { background: "#f6fbfb", surface: "#ffffff", primary: "#082f49", secondary: "#4b6673", accent: "#0f9f9a" },
        fonts: { heading: "Inter", body: "Inter" },
      },
      sections: [
        { type: "clinic_header", fields: { logo: "{{logo_url}}", businessName: "{{business_name}}", navItems: ["Treatments", "Results", "Team", "Book"], ctaLabel: "{{book_consultation_label}}" } },
        { type: "clinic_hero", fields: { headline: "{{ai_generated_clinic_headline}}", subheadline: "{{ai_generated_clinic_slogan}}", image: "{{hero_image}}", primaryButton: "{{book_consultation_label}}", secondaryButton: "{{view_treatments_label}}" } },
        { type: "clinic_services", fields: { title: "{{treatments_title}}", products: "{{featured_products}}", columns: 3 } },
        { type: "clinic_treatment_path", fields: { title: "{{care_path_title}}", steps: "{{care_path_steps}}" } },
        { type: "clinic_trust", fields: { title: "{{trust_title}}", items: "{{medical_trust_points}}" } },
        { type: "clinic_results", fields: { title: "{{results_title}}", text: "{{results_text}}", items: "{{result_points}}" } },
        { type: "clinic_team", fields: { title: "{{team_title}}", text: "{{team_text}}", items: "{{team_points}}" } },
        { type: "clinic_booking", fields: { title: "{{booking_title}}", text: "{{booking_text}}", ctaLabel: "{{book_consultation_label}}" } },
        { type: "footer", fields: { businessName: "{{business_name}}", description: "{{short_description}}", socialLinks: "{{social_links}}" } },
      ],
      aiPrompt: "Use a premium medical, aesthetic, dental or wellness clinic layout, not a generic lead form. Generate calm professional copy, treatment/service cards, appointment-first CTAs, trust and credentials, care path, result proof, specialist/team section, booking CTA, safety language and editable treatment details. This template is for clinics, med spas, dental offices, aesthetic centers, wellness studios, nutrition, therapy, dermatology, laser, facial and consultation-based businesses. Preserve the clinic structure; only adapt colors, copy, services, imagery and CTAs to the business.",
      catalogModel: {
        catalogType: "medical_wellness_service_catalog",
        productCardStyle: "treatment cards with category, session length, starting/consultation price, trust badge and book consultation CTA",
        collectionLayout: "clinic hero, treatment catalog, care path, proof/results, specialist trust, appointment panel",
        filters: ["treatment", "specialty", "duration", "consultation", "availability"],
        productDetailModel: "treatment detail with benefits, preparation, aftercare, duration, specialist, consultation CTA",
        upsellModel: "treatment plans, follow-up sessions, maintenance packages, complementary services",
        customerFeeling: "premium clinic that feels safe, expert, calm and easy to book",
      },
      visualDifference: "Clean clinic/wellness site with appointment panel, treatment catalog, care path, result proof and specialist trust.",
      clientSelectionCard: { title: "Clinic / Wellness", category: "services", bestForLabel: "clinics, med spa, dental, wellness, aesthetics", difference: "Trust-first treatment pages, result proof, team and booking CTA.", previewTags: ["clinic", "wellness", "booking"] },
      pages: [
        { name: "Home", purpose: "Clinic trust and booking conversion", usesSections: ["clinic_header", "clinic_hero", "clinic_services", "clinic_treatment_path", "clinic_trust", "clinic_results", "clinic_team", "clinic_booking", "footer"] },
        { name: "Treatments", purpose: "Editable treatment and service catalog", catalogType: "medical_wellness_service_catalog", layout: "treatment cards with duration, category, consultation CTA", filters: ["treatment", "specialty", "duration"] },
        { name: "Results", purpose: "Proof, safety and transformation confidence", layout: "before/after proof, safety notes, expectations" },
        { name: "Book", purpose: "Consultation request and contact", layout: "booking CTA, contact info, preferred treatment notes" },
      ],
      editableSlots: ["headline", "slogan", "hero image", "treatments", "care path", "result proof", "team copy", "prices", "logo", "colors", "CTAs", "contact info", "section order"],
    },
    {
      id: "legal-professional-services-pro",
      name: "Legal / Professional Services Pro",
      category: "services",
      bestFor: ["law firms", "accounting", "tax advisors", "consultants", "insurance advisors", "financial services", "B2B advisory", "professional firms"],
      style: {
        tone: "serious, trustworthy, precise, consultation-focused",
        layoutDensity: "medium",
        imageStyle: "premium advisory firm visuals, document review panels, consultant portraits, proof badges, consultation dashboard",
        defaultColors: { background: "#f7f3ec", surface: "#ffffff", primary: "#111827", secondary: "#5f6673", accent: "#b8843c" },
        fonts: { heading: "Inter", body: "Inter" },
      },
      sections: [
        { type: "professional_header", fields: { logo: "{{logo_url}}", businessName: "{{business_name}}", navItems: ["Services", "Process", "Proof", "Consultation"], ctaLabel: "{{consultation_cta_label}}" } },
        { type: "professional_hero", fields: { headline: "{{ai_generated_professional_headline}}", subheadline: "{{ai_generated_professional_slogan}}", image: "{{hero_image}}", primaryButton: "{{consultation_cta_label}}", secondaryButton: "{{services_cta_label}}" } },
        { type: "practice_areas", fields: { title: "{{practice_areas_title}}", products: "{{featured_products}}", columns: 3 } },
        { type: "professional_process", fields: { title: "{{process_title}}", steps: "{{advisory_process_steps}}" } },
        { type: "professional_proof", fields: { title: "{{proof_title}}", items: "{{professional_trust_points}}" } },
        { type: "professional_team", fields: { title: "{{team_title}}", text: "{{team_text}}", items: "{{team_points}}" } },
        { type: "professional_faq", fields: { title: "{{faq_title}}", items: "{{faq_items}}" } },
        { type: "consultation_cta", fields: { title: "{{consultation_title}}", text: "{{consultation_text}}", ctaLabel: "{{consultation_cta_label}}" } },
        { type: "footer", fields: { businessName: "{{business_name}}", description: "{{short_description}}", socialLinks: "{{social_links}}" } },
      ],
      aiPrompt: "Use a premium legal, accounting, consulting or professional services firm layout, not a generic company page. Generate serious trust-first copy, practice/service area cards, consultation CTAs, process steps, credentials, confidentiality cues, team/advisor proof, FAQ and editable service details. This template is for law firms, tax/accounting firms, insurance advisors, financial consultants, immigration, contracts, compliance, real estate legal, B2B advisory and professional firms. Preserve the professional-services structure; only adapt colors, copy, services, imagery and CTAs to the business.",
      catalogModel: {
        catalogType: "legal_professional_services_catalog",
        productCardStyle: "practice-area cards with category, engagement type, confidentiality/trust badge, consultation price label and schedule CTA",
        collectionLayout: "authority hero, practice areas, advisory process, proof, team, FAQ, consultation CTA",
        filters: ["practice_area", "industry", "engagement_type", "consultation", "availability"],
        productDetailModel: "service detail with who it helps, documents needed, process, expected next step, advisor and consultation CTA",
        upsellModel: "ongoing advisory, retainer, document review, strategy call, compliance package",
        customerFeeling: "premium professional firm that feels serious, confidential and easy to contact",
      },
      visualDifference: "Sober advisory-firm site with consultation dashboard, practice areas, process, proof, credentials, FAQ and lead capture.",
      clientSelectionCard: { title: "Legal / Professional", category: "services", bestForLabel: "law, tax, accounting, consulting, insurance, B2B advisory", difference: "Authority-first services, confidential consultation, proof and process.", previewTags: ["legal", "consulting", "B2B"] },
      pages: [
        { name: "Home", purpose: "Professional authority and consultation conversion", usesSections: ["professional_header", "professional_hero", "practice_areas", "professional_process", "professional_proof", "professional_team", "professional_faq", "consultation_cta", "footer"] },
        { name: "Services", purpose: "Editable practice areas and service catalog", catalogType: "legal_professional_services_catalog", layout: "practice cards with engagement type and consultation CTA", filters: ["practice_area", "industry", "engagement_type"] },
        { name: "Process", purpose: "How the firm reviews, advises and follows through", layout: "consultation steps, document review, strategy and follow-up" },
        { name: "Consultation", purpose: "Lead capture for consultation or document review", layout: "consultation CTA, contact info, preferred service notes" },
      ],
      editableSlots: ["headline", "slogan", "hero image", "practice areas", "process steps", "proof points", "team copy", "FAQ", "prices", "logo", "colors", "CTAs", "contact info", "section order"],
    },
    {
      id: "b2b-saas-enterprise-pro",
      name: "B2B SaaS / Enterprise Services Pro",
      category: "b2b",
      bestFor: ["B2B SaaS", "enterprise software", "automation", "IT services", "platforms", "integrations", "business systems", "managed services"],
      style: {
        tone: "strategic, technical, confident, enterprise-ready",
        layoutDensity: "medium",
        imageStyle: "enterprise dashboards, product UI panels, integration maps, ROI cards, demo request flows",
        defaultColors: { background: "#f5f7fb", surface: "#ffffff", primary: "#0f172a", secondary: "#475569", accent: "#2563eb" },
        fonts: { heading: "Inter", body: "Inter" },
      },
      sections: [
        { type: "enterprise_header", fields: { logo: "{{logo_url}}", businessName: "{{business_name}}", navItems: ["Solutions", "Use cases", "Integrations", "Pricing", "Demo"], ctaLabel: "{{request_demo_label}}" } },
        { type: "enterprise_hero", fields: { headline: "{{ai_generated_enterprise_headline}}", subheadline: "{{ai_generated_enterprise_slogan}}", image: "{{hero_image}}", primaryButton: "{{request_demo_label}}", secondaryButton: "{{solutions_cta_label}}" } },
        { type: "enterprise_solutions", fields: { title: "{{solutions_title}}", products: "{{featured_products}}", columns: 3 } },
        { type: "enterprise_use_cases", fields: { title: "{{use_cases_title}}", items: "{{use_cases}}" } },
        { type: "enterprise_integrations", fields: { title: "{{integrations_title}}", items: "{{integration_points}}" } },
        { type: "enterprise_proof", fields: { title: "{{proof_title}}", items: "{{enterprise_trust_points}}" } },
        { type: "enterprise_pricing", fields: { title: "{{pricing_title}}", products: "{{pricing_plans}}" } },
        { type: "enterprise_demo", fields: { title: "{{demo_title}}", text: "{{demo_text}}", ctaLabel: "{{request_demo_label}}" } },
        { type: "footer", fields: { businessName: "{{business_name}}", description: "{{short_description}}", socialLinks: "{{social_links}}" } },
      ],
      aiPrompt: "Use a premium B2B SaaS or enterprise services layout, not a generic company page. Generate a strategic homepage with a strong enterprise value proposition, demo-first CTA, solution cards, use cases, integration map, ROI/proof panel, security/trust signals, pricing/package cards and lead qualification copy. This template is for SaaS platforms, automation services, IT systems, business software, managed services, integrations, dashboards and enterprise B2B offers. Preserve the enterprise structure; only adapt colors, copy, services, products, imagery and CTAs to the business.",
      catalogModel: {
        catalogType: "b2b_solution_catalog",
        productCardStyle: "solution cards with use case, implementation timeline, enterprise badge, custom pricing label and request demo CTA",
        collectionLayout: "enterprise hero, solution catalog, use cases, integrations, ROI proof, pricing, demo request",
        filters: ["solution", "industry", "team_size", "deployment", "integration"],
        productDetailModel: "solution detail with outcome, workflow, integrations, implementation, security and demo CTA",
        upsellModel: "implementation package, onboarding, support tier, integrations, enterprise plan",
        customerFeeling: "enterprise-grade SaaS site with clear demo path and business ROI",
      },
      visualDifference: "Enterprise software-style site with dashboard hero, use cases, integrations, ROI proof, pricing packages and demo CTA.",
      clientSelectionCard: { title: "B2B SaaS / Enterprise", category: "b2b", bestForLabel: "software, automation, systems, IT, platforms", difference: "Demo-first enterprise site with dashboards, integrations, use cases and pricing.", previewTags: ["B2B", "SaaS", "enterprise"] },
      pages: [
        { name: "Home", purpose: "Enterprise value proposition and demo conversion", usesSections: ["enterprise_header", "enterprise_hero", "enterprise_solutions", "enterprise_use_cases", "enterprise_integrations", "enterprise_proof", "enterprise_pricing", "enterprise_demo", "footer"] },
        { name: "Solutions", purpose: "Editable B2B solution catalog", catalogType: "b2b_solution_catalog", layout: "solution cards with use case, timeline and demo CTA", filters: ["solution", "industry", "deployment"] },
        { name: "Use Cases", purpose: "Industry workflows and business outcomes", layout: "use case cards, ROI points, integration notes" },
        { name: "Demo", purpose: "Lead qualification and demo request", layout: "demo CTA, contact info, team size and integration needs" },
      ],
      editableSlots: ["headline", "slogan", "hero image", "solutions", "use cases", "integrations", "proof points", "pricing", "logo", "colors", "CTAs", "contact info", "section order"],
    },
    {
      id: "manufacturing-industrial-supplier-pro",
      name: "Manufacturing / Industrial Supplier Pro",
      category: "b2b",
      bestFor: ["manufacturing", "industrial supplier", "machinery", "parts", "tools", "safety equipment", "B2B procurement", "wholesale supply"],
      style: {
        tone: "technical, rugged, precise, procurement-ready",
        layoutDensity: "high",
        imageStyle: "industrial product specs, RFQ panels, certification badges, warehouse and supply chain visuals",
        defaultColors: { background: "#f4f1e8", surface: "#ffffff", primary: "#111827", secondary: "#525252", accent: "#f5b301" },
        fonts: { heading: "Inter", body: "Inter" },
      },
      sections: [
        { type: "industrial_header", fields: { logo: "{{logo_url}}", businessName: "{{business_name}}", navItems: ["Products", "Capabilities", "Certifications", "Supply chain", "Request quote"], ctaLabel: "{{request_quote_label}}" } },
        { type: "industrial_hero", fields: { headline: "{{ai_generated_industrial_headline}}", subheadline: "{{ai_generated_industrial_slogan}}", image: "{{hero_image}}", primaryButton: "{{request_quote_label}}", secondaryButton: "{{view_specs_label}}" } },
        { type: "industrial_spec_catalog", fields: { title: "{{industrial_catalog_title}}", products: "{{featured_products}}", columns: 3 } },
        { type: "industrial_capabilities", fields: { title: "{{capabilities_title}}", items: "{{capability_points}}" } },
        { type: "industrial_certifications", fields: { title: "{{certifications_title}}", items: "{{certification_points}}" } },
        { type: "industrial_supply_chain", fields: { title: "{{supply_chain_title}}", items: "{{supply_chain_points}}" } },
        { type: "industrial_quote_panel", fields: { title: "{{quote_title}}", text: "{{quote_text}}", ctaLabel: "{{request_quote_label}}" } },
        { type: "footer", fields: { businessName: "{{business_name}}", description: "{{short_description}}", socialLinks: "{{social_links}}" } },
      ],
      aiPrompt: "Use a premium industrial supplier and manufacturing layout, not a generic business website. Generate technical procurement copy, RFQ-first CTAs, dense product/spec cards, MOQ and lead-time language, certification/documentation panels, capabilities, supply chain proof, wholesale/bulk ordering cues and editable industrial catalog details. This template is for manufacturers, industrial suppliers, machinery, parts, tools, safety equipment, wholesale B2B supply and procurement workflows. Preserve the technical industrial structure; only adapt colors, copy, products, imagery and CTAs to the business.",
      catalogModel: {
        catalogType: "industrial_supplier_catalog",
        productCardStyle: "technical spec cards with SKU, material/capacity fields, MOQ, lead time, certification badge, quote-only price and RFQ CTA",
        collectionLayout: "industrial hero, technical catalog, capabilities, certifications, supply chain, quote request",
        filters: ["category", "material", "capacity", "lead_time", "certification", "bulk_order"],
        productDetailModel: "industrial product detail with specs, documentation, MOQ, lead time, compatibility, safety notes and RFQ CTA",
        upsellModel: "bulk orders, replacement parts, maintenance kits, warranty, vendor-managed supply",
        customerFeeling: "serious B2B supplier with technical confidence and a fast quote path",
      },
      visualDifference: "Industrial procurement site with RFQ dashboard, spec-table cards, certifications, supply-chain modules and quote flow.",
      clientSelectionCard: { title: "Industrial Supplier", category: "b2b", bestForLabel: "manufacturing, parts, machinery, tools, wholesale supply", difference: "Technical catalog, MOQ, lead times, certifications and request-quote flow.", previewTags: ["industrial", "RFQ", "B2B"] },
      pages: [
        { name: "Home", purpose: "Industrial supply proof and RFQ conversion", usesSections: ["industrial_header", "industrial_hero", "industrial_spec_catalog", "industrial_capabilities", "industrial_certifications", "industrial_supply_chain", "industrial_quote_panel", "footer"] },
        { name: "Products", purpose: "Editable technical product catalog", catalogType: "industrial_supplier_catalog", layout: "spec cards with SKU, MOQ, lead time and RFQ CTA", filters: ["category", "material", "lead_time", "certification"] },
        { name: "Capabilities", purpose: "Manufacturing, sourcing and supply capabilities", layout: "capabilities grid, process proof, fulfillment details" },
        { name: "Request Quote", purpose: "RFQ lead capture for technical requirements", layout: "quote CTA, specs needed, contact info, procurement notes" },
      ],
      editableSlots: ["headline", "slogan", "hero image", "product specs", "MOQ labels", "lead times", "certifications", "capabilities", "supply chain proof", "logo", "colors", "CTAs", "contact info", "section order"],
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
        tone: "calm, premium, scheduled, clear, professional",
        layoutDensity: "medium-high",
        imageStyle: "service photos, staff portraits, appointment cards, calm premium spaces",
        defaultColors: { background: "#f7f3ed", surface: "#ffffff", primary: "#1f1b16", secondary: "#786f66", accent: "#b45309" },
        fonts: { heading: "Inter", body: "Inter" },
      },
      sections: [
        { type: "booking_header", fields: { logo: "{{logo_url}}", businessName: "{{business_name}}", navItems: ["Services", "Availability", "Team", "Booking"], ctaLabel: "{{booking_cta_label}}" } },
        { type: "booking_hero", fields: { headline: "{{booking_headline}}", subheadline: "{{booking_slogan}}", primaryButton: "{{booking_cta_label}}", secondaryButton: "{{service_menu_cta}}" } },
        { type: "booking_service_menu", fields: { title: "{{service_menu_title}}", services: "{{featured_products}}" } },
        { type: "booking_availability", fields: { title: "{{availability_title}}", times: "{{availability_times}}", rules: "{{booking_rules}}" } },
        { type: "booking_team_process", fields: { title: "{{staff_title}}", items: "{{staff_or_steps}}" } },
        { type: "booking_contact_panel", fields: { title: "{{contact_title}}", text: "{{contact_text}}" } },
      ],
      aiPrompt: "Use a premium booking-first appointment layout for barbers, salons, spas, clinics, classes and consultations. Generate service menu copy, durations, booking CTA, availability wording, staff/process copy, confirmation expectations, cancellation/prep notes and clear contact fallback. Make it feel like a real appointment flow, not a generic service page.",
      catalogModel: {
        catalogType: "booking_menu_catalog",
        productCardStyle: "appointment cards with duration, price/starting at, staff/availability, book CTA",
        collectionLayout: "booking hero, service menu, availability panel, staff/process, contact",
        filters: ["service", "duration", "staff", "availability", "price"],
        productDetailModel: "service detail with duration, what is included, staff, preparation notes, booking CTA",
        upsellModel: "add-ons and package bundles",
        customerFeeling: "appointment site with clear booking flow",
      },
      visualDifference: "Premium booking layout with appointment hero, service menu, availability cards, staff/process, confirmation notes and direct booking CTA.",
      clientSelectionCard: { title: "Booking / Appointment", category: "services", bestForLabel: "barbers, salons, clinics, classes", difference: "Appointment-first, premium service menu, availability and booking CTA.", previewTags: ["booking", "appointments", "schedule"] },
      pages: [
        { name: "Home", purpose: "Booking conversion", usesSections: ["booking_header", "hero_booking", "service_menu", "availability_panel", "staff_or_process", "contact_booking"] },
        { name: "Services", purpose: "Bookable service menu", catalogType: "booking_menu_catalog", layout: "service cards with duration and booking CTA", filters: ["service", "duration", "staff"] },
        { name: "Booking", purpose: "Appointment request", layout: "availability, contact, confirmation expectations", upsell: "packages and add-ons" },
      ],
      editableSlots: ["services", "durations", "prices", "staff", "availability", "booking CTA", "contact", "photos"],
    },
    {
      id: "restaurant-food-business",
      name: "Restaurant Menu Pro",
      category: "restaurant",
      bestFor: ["restaurants", "cafes", "food trucks", "bakeries", "bars", "catering", "delivery kitchens"],
      style: {
        tone: "warm, appetizing, premium, easy to order",
        layoutDensity: "medium-high",
        imageStyle: "food photography, menu cards, signature dishes, cozy location details",
        defaultColors: { background: "#fff7ed", surface: "#ffffff", primary: "#2a130b", secondary: "#7c5f4a", accent: "#ef4444" },
        fonts: { heading: "Inter", body: "Inter" },
      },
      sections: [
        { type: "restaurant_header", fields: { logo: "{{logo_url}}", businessName: "{{business_name}}", navItems: ["Menu", "Specials", "Hours", "Order"], ctaLabel: "{{order_cta_label}}" } },
        { type: "restaurant_hero", fields: { headline: "{{restaurant_headline}}", subheadline: "{{restaurant_slogan}}", primaryButton: "{{order_cta_label}}", secondaryButton: "{{view_menu_cta}}" } },
        { type: "menu_categories", fields: { title: "{{menu_category_title}}", categories: "{{menu_categories}}" } },
        { type: "signature_dishes", fields: { title: "{{signature_menu_title}}", products: "{{featured_products}}" } },
        { type: "combo_offer", fields: { title: "{{specials_title}}", items: "{{featured_specials}}" } },
        { type: "ordering_info", fields: { title: "{{ordering_title}}", text: "{{ordering_text}}" } },
        { type: "restaurant_contact", fields: { title: "{{contact_title}}", text: "{{contact_text}}" } },
      ],
      aiPrompt: "Use a premium restaurant menu website, not a generic marketplace. Generate appetizing restaurant copy, clear menu categories, signature dishes, specials or combos, pickup/delivery/order CTAs, hours, location, contact details and simple ordering expectations. If online ordering is requested, keep the first draft order-ready but editable; otherwise use WhatsApp/phone/contact order requests. Preserve the restaurant menu structure; only adapt colors, copy, dishes, photos, ordering style and CTAs.",
      catalogModel: {
        catalogType: "restaurant_menu_catalog",
        productCardStyle: "menu cards with category, description, price or market label, popular/chef badges and order CTA",
        collectionLayout: "food hero, category rail, signature dishes, specials, ordering info, hours and location",
        filters: ["category", "dietary", "price", "availability", "popular"],
        productDetailModel: "dish detail with ingredients, portion, dietary notes, add-ons and order CTA",
        upsellModel: "combos, sides, drinks and chef recommendations",
        customerFeeling: "restaurant menu that makes ordering simple and appetizing",
      },
      visualDifference: "Restaurant-first layout with warm food hero, menu categories, signature dishes, specials, pickup/delivery CTAs, hours and location.",
      clientSelectionCard: { title: "Restaurant Menu", category: "restaurant", bestForLabel: "restaurants, cafes, food trucks, catering", difference: "Menu categories, specials, order CTA, hours and location.", previewTags: ["restaurant", "menu", "ordering"] },
      pages: [
        { name: "Home", purpose: "Restaurant intro and ordering conversion", usesSections: ["restaurant_header", "restaurant_hero", "menu_categories", "signature_dishes", "combo_offer", "ordering_info", "restaurant_contact"] },
        { name: "Menu", purpose: "Menu catalog", catalogType: "restaurant_menu_catalog", layout: "category rail and menu cards", filters: ["category", "dietary", "popular"] },
        { name: "Specials", purpose: "Combos and featured dishes", layout: "signature specials and chef recommendations" },
        { name: "Contact", purpose: "Hours, location and ordering contact", layout: "hours, pickup/delivery notes, phone, WhatsApp, location" },
      ],
      editableSlots: ["menu categories", "dishes", "prices", "photos", "combos", "pickup/delivery", "hours", "location", "contact info", "order CTAs", "section order"],
    },
    {
      id: "digital-products-store",
      name: "Digital Products Pro",
      category: "digital",
      bestFor: ["courses", "ebooks", "templates", "software", "memberships", "creator products", "downloadable packs"],
      style: {
        tone: "modern, expert, productized, fast-access, conversion-focused",
        layoutDensity: "medium",
        imageStyle: "digital product mockups, course modules, dashboard cards, creator bundles, clean proof panels",
        defaultColors: { background: "#f7fbff", surface: "#ffffff", primary: "#111827", secondary: "#475569", accent: "#6366f1" },
        fonts: { heading: "Inter", body: "Inter" },
      },
      sections: [
        { type: "digital_header", fields: { logo: "{{logo_url}}", businessName: "{{business_name}}", navItems: ["Offer", "Products", "Modules", "Access"], ctaLabel: "{{access_cta_label}}" } },
        { type: "digital_hero", fields: { headline: "{{digital_headline}}", subheadline: "{{digital_slogan}}", primaryButton: "{{access_cta_label}}", secondaryButton: "{{view_products_cta}}" } },
        { type: "digital_bundle", fields: { title: "{{bundle_title}}", products: "{{featured_products}}" } },
        { type: "digital_modules", fields: { title: "{{modules_title}}", modules: "{{included_modules}}" } },
        { type: "digital_proof", fields: { title: "{{proof_title}}", items: "{{trust_points}}" } },
        { type: "digital_access", fields: { title: "{{access_title}}", text: "{{access_text}}" } },
      ],
      aiPrompt: "Use a premium digital products website, not a generic store. Generate a productized offer for courses, ebooks, templates, software, memberships or downloadable packs. Show instant access, modules included, bonuses, license/support notes, proof, FAQ-style objections, product cards and clear buy/get-access CTAs. Preserve the digital product structure; only adapt copy, colors, products, modules, pricing labels and CTAs to the business.",
      catalogModel: {
        catalogType: "digital_offer_catalog",
        productCardStyle: "digital offer cards with instant access, included modules, bonuses, license/support note, price and get-access CTA",
        collectionLayout: "expert hero, offer bundle, module grid, product cards, proof, access panel",
        filters: ["product_type", "level", "access", "bundle", "support"],
        productDetailModel: "digital product detail with modules, deliverables, bonuses, license, access and guarantee",
        upsellModel: "bundles, pro templates, memberships, support packages and premium access",
        customerFeeling: "premium creator or software store built for immediate access and trust",
      },
      visualDifference: "Digital product layout with expert hero, instant-access offer cards, modules, bonuses, proof and access CTA.",
      clientSelectionCard: { title: "Digital Products", category: "digital", bestForLabel: "courses, ebooks, templates, software, memberships", difference: "Instant access, bundles, modules, proof and digital CTAs.", previewTags: ["digital", "course", "software"] },
      pages: [
        { name: "Home", purpose: "Digital product offer and conversion", usesSections: ["digital_header", "digital_hero", "digital_bundle", "digital_modules", "digital_proof", "digital_access"] },
        { name: "Products", purpose: "Digital product catalog", catalogType: "digital_offer_catalog", layout: "offer cards with bundles and access notes", filters: ["product_type", "level", "bundle"] },
        { name: "Access", purpose: "Modules, bonuses and what happens after purchase", layout: "module grid, bonuses, support, license notes" },
        { name: "Contact", purpose: "Questions, support and custom access", layout: "contact, support note, access questions" },
      ],
      editableSlots: ["headline", "slogan", "digital products", "modules", "bonuses", "pricing labels", "access notes", "support", "license", "proof", "CTAs", "section order"],
    },
    {
      id: "real-estate-listings-pro",
      name: "Real Estate / Listings Pro",
      category: "listings",
      bestFor: ["real estate", "rentals", "cars", "classifieds", "equipment", "premium listings", "property marketplace"],
      style: {
        tone: "trustworthy, searchable, premium, location-aware, comparison-friendly",
        layoutDensity: "medium-high",
        imageStyle: "large listing photos, map panels, filter chips, specs, location and price badges",
        defaultColors: { background: "#f6f8fb", surface: "#ffffff", primary: "#0f172a", secondary: "#475569", accent: "#0ea5e9" },
        fonts: { heading: "Inter", body: "Inter" },
      },
      sections: [
        { type: "listings_header", fields: { logo: "{{logo_url}}", businessName: "{{business_name}}", navItems: ["Search", "Featured", "Areas", "Contact"], ctaLabel: "{{inquire_cta_label}}" } },
        { type: "listings_hero", fields: { headline: "{{listing_headline}}", subheadline: "{{listing_slogan}}", searchPlaceholder: "{{listing_search_placeholder}}", primaryButton: "{{search_cta_label}}" } },
        { type: "listing_filters", fields: { categories: "{{listing_categories}}", priceRanges: "{{price_ranges}}", locations: "{{locations}}" } },
        { type: "featured_listings", fields: { title: "{{featured_listings_title}}", products: "{{featured_products}}" } },
        { type: "area_map", fields: { title: "{{area_title}}", text: "{{area_text}}" } },
        { type: "listing_trust", fields: { title: "{{trust_title}}", items: "{{trust_points}}" } },
        { type: "listing_contact", fields: { title: "{{contact_title}}", text: "{{contact_text}}" } },
      ],
      aiPrompt: "Use a premium real-estate/listings website layout, not a generic product store. Generate searchable listing copy for properties, cars, rentals, equipment, or premium classifieds. Include a large search hero, filters, location/area emphasis, listing cards with price, location and specs, featured listings, map/area panel, trust signals, and inquiry CTAs. Preserve this listing structure; only adapt copy, colors, listing types, specs, locations, prices and CTAs to the business.",
      catalogModel: {
        catalogType: "real_estate_listing_catalog",
        productCardStyle: "large listing cards with photo, price, location, specs, badges and inquire CTA",
        collectionLayout: "search hero, filters, featured listings, map/area panel, trust, inquiry panel",
        filters: ["location", "price", "type", "bedrooms_or_specs", "status"],
        productDetailModel: "listing detail with gallery, specs, location, seller/agent info and inquiry CTA",
        upsellModel: "similar listings, featured areas and saved searches",
        customerFeeling: "premium listing marketplace with strong search and comparison flow",
      },
      visualDifference: "Search-first listing layout with filters, map/area panel, listing specs, price/location badges and inquiry CTAs.",
      clientSelectionCard: { title: "Real Estate / Listings", category: "listings", bestForLabel: "properties, rentals, cars, classifieds", difference: "Search, filters, location, map feel and listing cards.", previewTags: ["listings", "real estate", "classifieds"] },
      pages: [
        { name: "Home", purpose: "Listing search and discovery", usesSections: ["listings_header", "listings_hero", "listing_filters", "featured_listings", "area_map", "listing_trust", "listing_contact"] },
        { name: "Listings", purpose: "Searchable listing catalog", catalogType: "real_estate_listing_catalog", layout: "filters, cards, price, location and specs", filters: ["location", "price", "type", "status"] },
        { name: "Areas", purpose: "Locations, neighborhoods or service area", layout: "map-style area panel and location cards" },
        { name: "Contact", purpose: "Inquiry, showing request or seller contact", layout: "lead form, phone, WhatsApp, email" },
      ],
      editableSlots: ["headline", "search placeholder", "listing categories", "locations", "price ranges", "listings", "photos", "prices", "specs", "badges", "map/area text", "inquiry CTAs", "contact info", "section order"],
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
      intent: "real_estate_listings",
      templateId: "real-estate-listings-pro",
      catalogType: "real_estate_listing_catalog",
      keywords: ["real estate", "bienes raices", "bienes raíces", "inmuebles", "propiedades", "casas", "apartamentos", "alquiler", "renta", "rentals", "zillow", "realtor", "mls", "carros", "autos", "vehiculos", "vehículos", "auto trader", "autotrader", "clasificados premium", "listings premium", "equipos usados", "maquinaria"],
    },
    {
      intent: "restaurant",
      templateId: "restaurant-food-business",
      catalogType: "restaurant_menu_catalog",
      keywords: ["restaurante", "restaurant", "food truck", "cafeteria", "cafetería", "catering", "menu", "menú", "comida", "pizza", "tacos", "bakery", "panaderia", "panadería", "bar", "delivery", "pickup", "ordenar", "pedidos"],
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
      intent: "legal_professional_services",
      templateId: "legal-professional-services-pro",
      catalogType: "legal_professional_services_catalog",
      keywords: ["abogado", "lawyer", "legal", "law firm", "firma legal", "contador", "accountant", "tax", "taxes", "impuestos", "consulting", "consultoria", "consultoría", "seguros", "insurance", "asesor", "advisor", "financiero", "financial", "compliance", "inmigracion", "inmigración", "real estate attorney", "contracts", "contratos", "bookkeeping", "payroll", "nomina", "nómina", "firma profesional", "professional firm"],
    },
    {
      intent: "b2b_enterprise_saas",
      templateId: "b2b-saas-enterprise-pro",
      catalogType: "b2b_solution_catalog",
      keywords: ["b2b saas", "saas", "enterprise", "software empresarial", "software para empresas", "automatizacion", "automatización", "automation", "platform", "plataforma", "dashboard", "crm", "erp", "integraciones", "integrations", "api", "managed services", "it services", "business systems", "sistemas empresariales", "request demo", "demo", "demo request", "workflow", "workflows", "productividad empresarial", "enterprise services"],
    },
    {
      intent: "manufacturing_industrial_supplier",
      templateId: "manufacturing-industrial-supplier-pro",
      catalogType: "industrial_supplier_catalog",
      keywords: ["manufacturing", "manufacturer", "industrial", "industrial supplier", "fabrica", "fábrica", "fabricante", "manufactura", "maquinaria", "machinery", "industrial parts", "repuestos industriales", "parts supplier", "tools supplier", "herramientas industriales", "safety equipment", "equipo de seguridad", "wholesale supply", "bulk order", "b2b procurement", "procurement", "rfq", "request quote", "solicitar cotizacion", "solicitar cotización", "proveedor industrial", "suministros industriales", "supply chain", "warehouse supply"],
    },
    {
      intent: "corporate_company",
      templateId: "corporate-company-pro",
      catalogType: "company_services_catalog",
      keywords: ["empresa", "company", "corporate", "corporativo", "pagina web", "página web", "website", "b2b", "agencia", "agency", "consulting", "consultoria", "consultoría", "firma", "business website"],
    },
    {
      intent: "education_academy",
      templateId: "education-course-academy-pro",
      catalogType: "education_course_catalog",
      keywords: ["curso", "cursos", "course", "courses", "academy", "academia", "escuela online", "online school", "bootcamp", "training", "formacion", "formación", "clases", "classes", "lessons", "cohort", "cohorte", "masterclass", "workshop", "taller", "coaching program", "programa de coaching", "membresia educativa", "membresía educativa", "learn", "aprender", "certificacion", "certificación"],
    },
    {
      intent: "medical_wellness",
      templateId: "medical-wellness-clinic-pro",
      catalogType: "medical_wellness_service_catalog",
      keywords: ["clinica", "clínica", "clinic", "med spa", "medical spa", "spa medico", "spa médico", "estetica", "estética", "aesthetic", "aesthetics", "dental", "dentist", "doctor", "wellness", "salud", "health", "therapy", "terapia", "nutricion", "nutrición", "laser", "láser", "botox", "facial", "skincare", "dermatology", "dermatologia", "dermatología", "fisio", "physio", "chiropractor", "consulta medica", "consulta médica", "cita medica", "cita médica", "tratamientos faciales", "tratamiento facial"],
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
      keywords: ["curso", "cursos", "course", "courses", "ebook", "e-book", "templates", "plantillas", "software", "app", "saas", "membresia", "membresía", "membership", "digital", "descarga", "download", "pdf", "pack", "coaching online", "masterclass"],
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
      templateId: "luxury-high-ticket-pro",
      catalogType: "luxury_high_ticket_catalog",
      keywords: ["lujo", "luxury", "high ticket", "alta gama", "exclusivo", "exclusiva", "joyeria", "joyería", "perfumes", "fragancia", "relojes", "watches", "cuero", "arte", "art", "coleccionable", "collectible", "carros de lujo", "luxury cars", "private appointment", "cita privada", "precio bajo consulta", "precio a consultar"],
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
    const fallbackIds = normalized.includes("restaurant") || normalized.includes("restaurante") || normalized.includes("comida") || /restaurant|menu|food/.test(primaryCatalogType)
      ? ["restaurant-food-business", "lead-funnel-pro", "home-services-premium", "booking-appointment-pro"]
      : normalized.includes("digital") || normalized.includes("curso") || /digital|pricing|software|course/.test(primaryCatalogType)
        ? ["digital-products-store", "lead-funnel-pro", "apple-premium-product", "corporate-company-pro"]
      : normalized.includes("marketplace") || /real_estate|listing|dense/.test(primaryCatalogType)
      ? ["real-estate-listings-pro", "mega-marketplace", "listing-marketplace-pro", "fashion-drop-pro"]
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
