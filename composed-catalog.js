const catalogVariants = new Map([
  ["mega-retail-store--home--catalog", "retail"],
  ["digital-products-store--catalog--digital-catalog", "digital"],
  ["corporate-company-pro--catalog--services-grid", "services"],
]);

export const CATALOG_ITEM_FIELDS = ["id", "businessId", "name", "categoryId", "description", "price",
  "quoteOnly", "currency", "stock", "imageUrl", "status", "active", "published"];

const escapeHtml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

const safeImageUrl = (value) => typeof value === "string"
  && /^(https?:\/\/[^\s<>"']+|\/(?!\/)[^\s<>"']+)$/i.test(value);

function validProduct(product, businessId) {
  return product && typeof product === "object" && !Array.isArray(product)
    && typeof product.id === "string" && product.id.length > 0
    && product.businessId === businessId
    && typeof product.name === "string" && product.name.trim().length > 0
    && typeof product.categoryId === "string"
    && typeof product.description === "string"
    && typeof product.quoteOnly === "boolean"
    && (product.quoteOnly ? product.price === null
      : typeof product.price === "number" && Number.isFinite(product.price) && product.price > 0)
    && typeof product.currency === "string" && /^[A-Z]{3}$/.test(product.currency)
    && Number.isSafeInteger(product.stock) && product.stock >= 0
    && product.status === "Published" && product.active === true && product.published === true
    && (product.imageUrl == null || safeImageUrl(product.imageUrl));
}

function productPrice(product, quoteLabel, language) {
  if (product.quoteOnly) return quoteLabel;
  return new Intl.NumberFormat(language, {
    style: "currency", currency: product.currency, minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(product.price);
}

function productAction(product, variant, copy, runtime, priceLabel) {
  if (variant === "retail" && !product.quoteOnly && product.stock === 0) {
    return `<button type="button" disabled>${escapeHtml(copy.sold_out_label)}</button>`;
  }
  const data = `data-item-id="${escapeHtml(product.id)}" data-item-name="${escapeHtml(product.name)}"`;
  if (variant === "retail" && !product.quoteOnly && runtime.salesEnabled === true) {
    return `<button type="button" data-cart-add ${data} data-item-price="${escapeHtml(priceLabel)}" data-item-image="${escapeHtml(product.imageUrl || "")}">${escapeHtml(copy.add_label)}</button>`;
  }
  const label = product.quoteOnly ? copy.quote_label : copy.view_label;
  return `<button type="button" data-open-lead ${data}>${escapeHtml(label)}</button>`;
}

export function renderCatalogItems(sectionId, products, copy, runtime = {}) {
  const variant = catalogVariants.get(sectionId);
  const businessId = runtime.businessId;
  if (!variant || !Array.isArray(products) || typeof businessId !== "string" || !businessId) return null;
  const requiredLabels = variant === "retail"
    ? ["empty_message", "quote_label", "sold_out_label", "add_label", "view_label"]
    : ["empty_message", "quote_label", "view_label"];
  if (!copy || requiredLabels.some((field) => typeof copy[field] !== "string" || !copy[field].trim())) return null;
  if (products.some((product) => !validProduct(product, businessId))) return null;
  const ids = products.map((product) => product.id);
  if (new Set(ids).size !== ids.length) return null;
  if (!products.length) return `<p class="composed-catalog__empty">${escapeHtml(copy.empty_message)}</p>`;
  const language = typeof runtime.language === "string" && /^[a-z]{2}(?:-[A-Z]{2})?$/.test(runtime.language)
    ? runtime.language : "en";
  return products.map((product) => {
    const priceLabel = productPrice(product, copy.quote_label, language);
    const image = product.imageUrl
      ? `<img src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(product.name)}" loading="lazy" decoding="async">`
      : `<span class="composed-catalog__initial" aria-hidden="true">${escapeHtml(product.name[0].toUpperCase())}</span>`;
    const search = [product.name, product.categoryId, product.description].join(" ").toLowerCase();
    return `<article class="composed-catalog__card composed-catalog__card--${variant}" data-catalog-item data-catalog-search="${escapeHtml(search)}" data-catalog-item-category="${escapeHtml(product.categoryId.toLowerCase())}">
      <div class="composed-catalog__image">${image}</div>
      <div class="composed-catalog__details"><small>${escapeHtml(product.categoryId)}</small><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(product.description)}</p>
      <div class="composed-catalog__bottom"><strong>${escapeHtml(priceLabel)}</strong>${productAction(product, variant, copy, runtime, priceLabel)}</div></div>
    </article>`;
  }).join("");
}

export const isCatalogSection = (sectionId) => catalogVariants.has(sectionId);
