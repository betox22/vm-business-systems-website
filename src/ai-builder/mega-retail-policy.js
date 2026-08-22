import { bathBodyStockImageUrl } from './catalog-preview-policy.js';

const STOCK_BY_CATEGORY = [
  [/fashion|moda|ropa|style/, "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1400&q=84"],
  [/home|hogar|decor|furniture/, "https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=1400&q=84"],
  [/beauty|belleza|skin|cosmetic/, "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1400&q=84"],
  [/food|comida|gourmet|restaurant/, "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1400&q=84"],
  [/sport|fitness|outdoor/, "https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&w=1400&q=84"],
  [/tech|electronic|gadget|computer/, "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1400&q=84"],
];

export function isMegaRetailTemplate(templateId) {
  return String(templateId || "") === "mega-retail-store";
}

export function megaRetailStockImage(category = "") {
  const normalized = String(category).toLowerCase();
  const bathBodyImage = bathBodyStockImageUrl(normalized);
  if (bathBodyImage) return bathBodyImage;
  return (STOCK_BY_CATEGORY.find(([pattern]) => pattern.test(normalized)) || [null,
    "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1400&q=84"])[1];
}

export function resolveMegaRetailTileMedia({ clientPhotoUrls = [], tileIndex = 0, category = "", categoryImage = "", hasBrandVisual = false } = {}) {
  const photos = Array.isArray(clientPhotoUrls) ? clientPhotoUrls.map((value) => String(value || "").trim()).filter(Boolean) : [];
  if (photos.length) {
    return { url: photos[tileIndex % photos.length], source: "client_photo", duotone: false };
  }
  const bathBodyImage = bathBodyStockImageUrl(category);
  return {
    url: bathBodyImage || String(categoryImage || "").trim() || megaRetailStockImage(category),
    source: hasBrandVisual ? "brand_duotone" : "stock_category",
    duotone: Boolean(hasBrandVisual),
  };
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
