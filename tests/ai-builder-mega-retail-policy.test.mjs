import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  isMegaRetailTemplate,
  megaRetailFeatureFlags,
  megaRetailStockImage,
  megaRetailWhatsAppUrl,
  resolveMegaRetailTileMedia,
} from "../src/ai-builder/mega-retail-policy.js";

test("bath departments use bath-specific media instead of the generic OPEN storefront", () => {
  assert.match(megaRetailStockImage("Bath bombs"), /1540555700478/);
  assert.match(megaRetailStockImage("Artisan soaps"), /1663108275588/);
  assert.match(megaRetailStockImage("Scented candles"), /1742544637816/);
  const protectedBathBomb = resolveMegaRetailTileMedia({
    category: "Bombas de bano",
    categoryImage: "https://images.unsplash.com/photo-1472851294608-062f824d29cc",
  });
  assert.match(protectedBathBomb.url, /1540555700478/);
});

test("mega retail tile images prioritize client photos over brand treatment and stock", () => {
  const client = resolveMegaRetailTileMedia({ clientPhotoUrls: ["https://client.example/real.jpg"], categoryImage: "https://stock.example/category.jpg", hasBrandVisual: true });
  assert.deepEqual(client, { url: "https://client.example/real.jpg", source: "client_photo", duotone: false });

  const branded = resolveMegaRetailTileMedia({ categoryImage: "https://stock.example/category.jpg", hasBrandVisual: true });
  assert.deepEqual(branded, { url: "https://stock.example/category.jpg", source: "brand_duotone", duotone: true });

  const stock = resolveMegaRetailTileMedia({ category: "technology" });
  assert.equal(stock.source, "stock_category");
  assert.match(stock.url, /^https:\/\/images\.unsplash\.com\//);
});

test("WhatsApp is absent without a real value and uses wa.me when provided", () => {
  assert.equal(megaRetailWhatsAppUrl({}), "");
  assert.equal(megaRetailWhatsAppUrl({ whatsapp: "+1 (305) 555-0182" }), "https://wa.me/13055550182");
});

test("mega retail feature switches default on and honor explicit off values", () => {
  assert.deepEqual(megaRetailFeatureFlags({}), { whatsapp: true, newsletter: true, socials: true });
  assert.deepEqual(megaRetailFeatureFlags({ global_components: { mega_retail_features: { whatsapp: false, newsletter: false, socials: false } } }), {
    whatsapp: false,
    newsletter: false,
    socials: false,
  });
});

test("mega retail specialization is exact and leaves the other templates untouched", () => {
  assert.equal(isMegaRetailTemplate("mega-retail-store"), true);
  const otherTemplates = [
    "premium-product-store", "luxury-high-ticket-pro", "education-course-academy-pro",
    "medical-wellness-clinic-pro", "legal-professional-services-pro", "b2b-saas-enterprise-pro",
    "manufacturing-industrial-supplier-pro", "mega-marketplace", "listing-marketplace-pro",
    "fashion-drop-pro", "corporate-company-pro", "lead-funnel-pro", "restaurant-food-business",
    "digital-products-store", "real-estate-listings-pro", "home-services-premium",
    "local-services-pro-plus", "booking-appointment-pro",
  ];
  otherTemplates.forEach((templateId) => assert.equal(isMegaRetailTemplate(templateId), false, templateId));

  const css = fs.readFileSync(new URL("../ai-builder.css", import.meta.url), "utf8");
  const scopedBlock = css.split("/* Mega retail store */")[1]?.split("/* End mega retail store */")[0] || "";
  assert.ok(scopedBlock.length > 1000);
  const selectors = [...scopedBlock.matchAll(/(?:^|\})\s*([^{}]+)\{/gm)]
    .map((match) => match[1].trim())
    .filter((selector) => !selector.startsWith("@"));
  selectors.forEach((selector) => assert.match(selector, /\.template-mega-retail-store/, selector));
  assert.doesNotMatch(scopedBlock, /\.mega-retail-tile\.is-small:last-child/);
  assert.match(scopedBlock, /\.mega-retail-mobile-departments\s*\{[^}]*display:\s*none/);
  assert.match(scopedBlock, /@media \(max-width: 1100px\)[\s\S]*\.mega-retail-mobile-departments\s*\{[^}]*display:\s*block/);
  assert.match(scopedBlock, /\.mega-retail-section-heading button\s*\{[^}]*white-space:\s*nowrap/);
});
