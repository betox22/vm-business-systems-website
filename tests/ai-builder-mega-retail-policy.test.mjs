import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  isMegaRetailTemplate,
  NEUTRAL_PRODUCT_PLACEHOLDER,
  megaRetailFeatureFlags,
  megaRetailStockImage,
  megaRetailWhatsAppUrl,
  resolveMegaRetailDepartmentTiles,
  resolveMegaRetailTileMedia,
} from "../src/ai-builder/mega-retail-policy.js";

test("departments without an exact catalog image use the neutral product placeholder", () => {
  assert.equal(megaRetailStockImage("Electrical Supplies"), NEUTRAL_PRODUCT_PLACEHOLDER);
  assert.equal(megaRetailStockImage("Plumbing Supplies"), NEUTRAL_PRODUCT_PLACEHOLDER);
});

test("mega retail tile images prioritize client photos over brand treatment and stock", () => {
  const client = resolveMegaRetailTileMedia({ clientPhotoUrls: ["https://client.example/real.jpg"], categoryImage: "https://stock.example/category.jpg", hasBrandVisual: true });
  assert.deepEqual(client, { url: "https://client.example/real.jpg", source: "client_photo", duotone: false });

  const branded = resolveMegaRetailTileMedia({ categoryImage: "https://stock.example/category.jpg", hasBrandVisual: true });
  assert.deepEqual(branded, { url: "https://stock.example/category.jpg", source: "brand_duotone", duotone: true });

  const stock = resolveMegaRetailTileMedia({ category: "technology" });
  assert.equal(stock.source, "neutral_placeholder");
  assert.equal(stock.url, NEUTRAL_PRODUCT_PLACEHOLDER);
});

test("complete mega retail site schemas never reuse unrelated positional product images as department banners", () => {
  const cases = [
    ["Hardware Center", ["Electrical Supplies", "Plumbing Supplies", "Power Tools", "Fasteners", "Safety Equipment"]],
    ["Plumbing Services", ["Drain Cleaning", "Pipe Repair", "Water Heaters", "Valves", "Emergency Service"]],
    ["Veterinary Clinic", ["Preventive Care", "Vaccinations", "Diagnostics", "Dental Care", "Surgery"]],
    ["Business Law Firm", ["Contract Review", "Company Formation", "Compliance", "Disputes", "Legal Consultation"]],
  ];
  const unrelatedPhotoIds = [
    "photo-1515562141207", "photo-1503376780353",
    "photo-1484101403633", "photo-1596462502278",
  ];

  for (const [businessName, categories] of cases) {
    const schema = {
      business: { name: businessName, description: `${businessName} professional catalog`, selectedLanguage: "en" },
      active_template: { id: "mega-retail-store" },
      selected_template: { id: "mega-retail-store" },
      layout_mode: { id: "standard" },
      theme: {}, brand: {}, global_components: {},
      catalog_categories: categories,
      catalog_items: [{
        name: "Unrelated legacy item",
        category: "Legacy Other",
        description: "Must never supply a department banner by array position.",
        image_url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70",
      }],
      pages: [{
        page_key: "home", title: "Home", order: 0,
        sections: [{ type: "Hero", editable: { headline: businessName, subtitle: "Specialized services and products" } }],
      }],
    };

    const tiles = resolveMegaRetailDepartmentTiles({
      categories: schema.catalog_categories,
      items: schema.catalog_items,
    });
    const bannerUrls = tiles.map(({ media }) => media.url);

    assert.equal(bannerUrls.length, 5, businessName);
    assert.ok(bannerUrls.every((url) => url === NEUTRAL_PRODUCT_PLACEHOLDER), businessName);
    unrelatedPhotoIds.forEach((photoId) => {
      assert.ok(bannerUrls.every((url) => !url.includes(photoId)), `${businessName}: ${photoId}`);
    });
  }
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
