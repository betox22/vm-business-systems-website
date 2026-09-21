export const NEUTRAL_PRODUCT_PLACEHOLDER = "/images/product-placeholder.svg";

const internalContexts = new WeakSet();
const renderingSchemas = new WeakSet();

export function createInternalGraphPresentationContext() {
  const context = Object.freeze({ version: 'graph-presentation-v1' });
  internalContexts.add(context);
  return context;
}

export function withGraphPresentation(schema, context, render) {
  if (!internalContexts.has(context?.graphPresentation)) return render();
  const nested = renderingSchemas.has(schema);
  renderingSchemas.add(schema);
  try { return render(); } finally { if (!nested) renderingSchemas.delete(schema); }
}

export function graphPresentationEnabled(schema) {
  return renderingSchemas.has(schema);
}

export function graphPresentationLabels(schema, legacy) {
  if (!graphPresentationEnabled(schema)) return legacy;
  const es = schema.business?.selectedLanguage === 'es';
  return { ...legacy, limited: es ? 'Coleccion' : 'Collection', deals: es ? 'Catalogo' : 'Catalog',
    newsletter: es ? 'Novedades' : 'Updates', newsletterText: es ? 'Noticias del catalogo.' : 'Catalog updates.',
    helpLinks: [es ? 'Contacto' : 'Contact'], trust: [] };
}

export function graphProductAttributes(schema, item) {
  if (!graphPresentationEnabled(schema)) return '';
  const id = String(item.id || '');
  if (!/^[a-zA-Z0-9_-]{1,96}$/.test(id)) throw new Error('Invalid catalog identity');
  return ` data-graph-product="${id}"`;
}

export function isMegaRetailTemplate(templateId) {
  return String(templateId || "") === "mega-retail-store";
}

export function megaRetailStockImage(category = "") {
  void category;
  return NEUTRAL_PRODUCT_PLACEHOLDER;
}

export function resolveMegaRetailTileMedia({ clientPhotoUrls = [], tileIndex = 0, category = "", categoryImage = "", hasBrandVisual = false } = {}) {
  const photos = Array.isArray(clientPhotoUrls) ? clientPhotoUrls.map((value) => String(value || "").trim()).filter(Boolean) : [];
  if (photos.length) {
    return { url: photos[tileIndex % photos.length], source: "client_photo", duotone: false };
  }
  const resolvedCategoryImage = String(categoryImage || "").trim();
  return {
    url: resolvedCategoryImage || megaRetailStockImage(category),
    source: resolvedCategoryImage ? (hasBrandVisual ? "brand_duotone" : "catalog_category") : "neutral_placeholder",
    duotone: Boolean(hasBrandVisual),
  };
}

export function resolveMegaRetailDepartmentTiles({ categories = [], items = [], clientPhotoUrls = [], hasBrandVisual = false, fallbackCategories = [] } = {}) {
  const tileCategories = categories.length ? categories : fallbackCategories;
  return Array.from({ length: 5 }, (_, tileIndex) => {
    const category = tileCategories[tileIndex % tileCategories.length];
    const item = items.find(
      (entry) => String(entry.category || "").trim().toLowerCase() === String(category || "").trim().toLowerCase(),
    );
    return {
      category,
      item,
      media: resolveMegaRetailTileMedia({
        clientPhotoUrls,
        tileIndex,
        category,
        categoryImage: item?.image_url || item?.imageUrl,
        hasBrandVisual,
      }),
    };
  });
}

export function megaRetailWhatsAppUrl(contact = {}) {
  const raw = String(contact.whatsapp || "").trim();
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 7 ? `https://wa.me/${digits}` : "";
}

export function megaRetailFeatureFlags(schema = {}) {
  const features = schema.global_components?.mega_retail_features || {};
  return {
    whatsapp: features.whatsapp !== false,
    newsletter: features.newsletter !== false,
    socials: features.socials !== false,
  };
}
