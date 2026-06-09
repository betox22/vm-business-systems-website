(function () {
  const TEMPLATE_LIBRARY_URL = "/templates/all-templates.json";
  let templateCache = null;

  const INTENT_RULES = [
    {
      intent: "amazon_marketplace",
      templateId: "marketplace-style",
      catalogType: "dense_marketplace_catalog",
      keywords: ["tipo amazon", "como amazon", "amazon style", "marketplace", "muchas categorias", "muchas categorías", "muchos productos", "busqueda y filtros", "búsqueda y filtros"],
    },
    {
      intent: "classified_marketplace",
      templateId: "classified-marketplace",
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
      templateId: "appointment-booking",
      catalogType: "booking_menu_catalog",
      keywords: ["barberia", "barbería", "barbershop", "salon", "spa", "citas", "reservas", "appointments"],
    },
    {
      intent: "local_service",
      templateId: "local-business-pro",
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
      templateId: "bold-fashion-store",
      catalogType: "lookbook_collection_catalog",
      keywords: ["ropa", "fashion", "boutique", "tipo nike", "streetwear", "sneakers"],
    },
    {
      intent: "minimal_premium",
      templateId: "minimal-store",
      catalogType: "editorial_minimal_grid",
      keywords: ["tipo apple", "minimal", "premium", "limpio", "simple"],
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
    templateCache = addSyntheticTemplates(Array.isArray(templates) ? templates : []);
    return templateCache;
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
    const matchedRule = INTENT_RULES.find((rule) =>
      rule.keywords.some((keyword) => normalized.includes(normalizeText(keyword))),
    );
    const rule = matchedRule || {
      intent: "default_minimal",
      templateId: "minimal-store",
      catalogType: "editorial_minimal_grid",
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

  window.TemplateRouter = {
    loadTemplates,
    selectTemplateFromPrompt,
    normalizeText,
    intentRules: INTENT_RULES,
  };
})();
