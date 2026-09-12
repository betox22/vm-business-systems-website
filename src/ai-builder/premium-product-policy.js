export const PREMIUM_IMAGE_ROLES = Object.freeze({
  hero: "hero_editorial",
  product: "product_packshot",
  category: "category_lifestyle",
  detail: "detail_texture",
});

function objectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function premiumSectionImage(section = {}, expectedRole = "") {
  const editable = objectValue(section.editable);
  const media = objectValue(editable.media || section.media);
  const assets = [
    objectValue(editable.imageAsset),
    objectValue(media.imageAsset),
    objectValue(section.imageAsset),
  ];
  const role = String(editable.imageRole || media.imageRole || assets.find((asset) => asset.role)?.role || "");
  const exactAsset = assets.find((asset) => asset.url && (!expectedRole || asset.role === expectedRole));
  if (exactAsset) return String(exactAsset.url);
  if (expectedRole && role && role !== expectedRole) return "";
  return String(
    editable.image_url ||
    editable.imageUrl ||
    media.image_url ||
    media.imageUrl ||
    "",
  ).trim();
}

export function limitPremiumHeadline(value, maximumWords = 12) {
  const words = String(value || "").trim().split(/\s+/).filter(Boolean);
  return words.length > maximumWords
    ? words.slice(0, maximumWords).join(" ").replace(/[.,;:]+$/, "")
    : words.join(" ");
}

export function premiumHomeSectionRank(type) {
  return {
    PremiumHero: 0,
    TrustStrip: 1,
    ProductGrid: 2,
    FeaturedProducts: 2,
    ProductStory: 3,
    FeatureShowcase: 4,
    ProofPanel: 5,
    Testimonials: 5,
    CTA: 6,
  }[String(type || "")] ?? 4;
}

export function orderPremiumHomeSections(sections = []) {
  return [...sections]
    .map((section, index) => ({ section, index }))
    .sort((a, b) => premiumHomeSectionRank(a.section?.type) - premiumHomeSectionRank(b.section?.type) || a.index - b.index)
    .map(({ section }, index) => ({ ...section, order: index + 1 }));
}
