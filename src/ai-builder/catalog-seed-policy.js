const PLACEHOLDER_CATALOG_NAME_RE = /^(?:item|product|producto|service|servicio|featured item|new arrival|limited find|customer favorite|signature item|featured offer|popular choice|main offer)(?:\s+\d+)?$/i;
const UNSTABLE_CATALOG_IMAGE_RE = /featured\/600x600|\/source\/|photo-1523275335684-37898b6baf30/i;

function cleanCatalogText(value = "", maxLength = 180) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function pendingCatalogCopy(name, language = "en") {
  const copy = {
    es: {
      description: `Conoce ${name}. Detalles y precio por confirmar con el negocio.`,
      priceLabel: "Precio por confirmar",
    },
    fr: {
      description: `Decouvrez ${name}. Details et prix a confirmer avec l'entreprise.`,
      priceLabel: "Prix a confirmer",
    },
    pt: {
      description: `Conheca ${name}. Detalhes e preco a confirmar com a empresa.`,
      priceLabel: "Preco a confirmar",
    },
    en: {
      description: `Explore ${name}. Details and pricing will be confirmed by the business.`,
      priceLabel: "Price to confirm",
    },
  };
  return copy[language] || copy.en;
}

export function hasRealCatalogIdentity(item = {}) {
  const source = typeof item === "string" ? { name: item } : item || {};
  const name = String(source.name || source.title || "").trim();
  return Boolean(name) && !PLACEHOLDER_CATALOG_NAME_RE.test(name);
}

export function shouldUseSemanticSeedIdentity(item = {}, catalogSource = "") {
  return catalogSource !== "ai_generated" && !hasRealCatalogIdentity(item);
}

export function mergeSemanticSeedCatalog(
  existingItems = [],
  seedItems = [],
  language = "en",
  _contextText = "",
  options = {},
) {
  const existing = Array.isArray(existingItems) ? existingItems.filter(Boolean) : [];
  const seeds = Array.isArray(seedItems) ? seedItems.filter(Boolean) : [];
  const preserveAiGeneratedIdentity = options.catalogSource === "ai_generated";
  const imageUrlForQuery = typeof options.imageUrlForQuery === "function"
    ? options.imageUrlForQuery
    : () => "";
  const base = existing.length ? existing : seeds;

  const merged = base.slice(0, 6).map((item, index) => {
    const seed = seeds.length ? seeds[index % seeds.length] : {};
    const source = typeof item === "string" ? { name: item } : { ...item };
    const hasRealIdentity = hasRealCatalogIdentity(source);
    const useSeedIdentity = shouldUseSemanticSeedIdentity(source, options.catalogSource);
    const protectRealMetadata = options.catalogSource === "seed_fallback" && hasRealIdentity;
    const name = useSeedIdentity
      ? cleanCatalogText(seed.name || seed.title, 90)
      : cleanCatalogText(source.name || source.title, 90);
    const pendingCopy = pendingCatalogCopy(name, language);
    const rawPrice = protectRealMetadata
      ? Number.NaN
      : Number(source.price_amount ?? source.price_value ?? source.price ?? seed.price);
    const hasPrice = Number.isFinite(rawPrice) && rawPrice > 0;
    const query = cleanCatalogText(
      source.imageSearchQuery
        || source.image_search_query
        || (useSeedIdentity ? seed.imageSearchQuery : name),
      160,
    );
    const sourceImage = cleanCatalogText(source.image_url || source.imageUrl, 1000);
    const resolvedImage = sourceImage && !UNSTABLE_CATALOG_IMAGE_RE.test(sourceImage)
      ? sourceImage
      : imageUrlForQuery(query);

    return {
      ...source,
      id: source.id || seed.id || `prod_${String(index + 1).padStart(3, "0")}`,
      sku: source.sku || seed.sku || `SKU-${String(index + 1).padStart(3, "0")}`,
      name,
      description: protectRealMetadata
        ? pendingCopy.description
        : useSeedIdentity
          ? seed.description
          : source.description,
      category: protectRealMetadata
        ? name
        : useSeedIdentity
          ? seed.category
          : source.category,
      price: hasPrice ? rawPrice : null,
      price_type: protectRealMetadata
        ? "quote_only"
        : source.price_type && source.price_type !== "quote_only"
          ? source.price_type
          : "fixed",
      price_value: hasPrice ? rawPrice : null,
      price_amount: hasPrice ? rawPrice : null,
      currency: source.currency || "USD",
      price_label: protectRealMetadata
        ? pendingCopy.priceLabel
        : source.price_label && !/price editable|precio editable|price to be set|consultar/i.test(source.price_label)
          ? source.price_label
          : hasPrice
            ? `USD ${rawPrice.toFixed(2)}`
            : "",
      rating: protectRealMetadata ? source.rating : Number(source.rating || seed.rating || 4.7),
      review_count: protectRealMetadata ? source.review_count : source.review_count || seed.review_count,
      badge: protectRealMetadata ? source.badge : source.badge || seed.badge,
      deal_label: protectRealMetadata ? source.deal_label || "" : source.deal_label || seed.deal_label || "",
      shipping_label: protectRealMetadata ? source.shipping_label : source.shipping_label || seed.shipping_label,
      button_label: source.button_label || seed.button_label,
      inventory_quantity: protectRealMetadata ? source.inventory_quantity : source.inventory_quantity ?? seed.inventory_quantity,
      track_inventory: protectRealMetadata ? source.track_inventory : source.track_inventory ?? seed.track_inventory,
      imageSearchQuery: query,
      image_url: useSeedIdentity ? seed.image_url : resolvedImage,
      is_active: source.is_active !== false,
      is_featured: source.is_featured ?? index < 4,
      sort_order: Number(source.sort_order ?? index),
    };
  });

  while (!preserveAiGeneratedIdentity && merged.length < 4 && seeds[merged.length]) {
    merged.push({ ...seeds[merged.length], sort_order: merged.length });
  }
  return merged.slice(0, 6);
}
