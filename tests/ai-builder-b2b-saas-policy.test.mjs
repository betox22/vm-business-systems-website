import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { renderB2BSaasWebsite } from "../src/ai-builder/b2b-saas-renderer.js";
import {
  b2bSaasHasRealPricing,
  b2bSaasNavigationPages,
  b2bSaasSubscriptionPlans,
  isB2BSaasTemplate,
} from "../src/ai-builder/b2b-saas-policy.js";

function schemaWithCatalog(catalogItems) {
  return {
    business: { name: "Nimbus Ops", description: "Operations software for growing service teams.", selectedLanguage: "en" },
    pages: [
      { page_key: "home", title: "Home", order: 1, sections: [{ type: "EnterpriseHero", order: 1, editable: { headline: "Run every workflow from one clear platform", subtitle: "Bring operations, reporting and team execution together." } }] },
      { page_key: "product", title: "Product", order: 2, sections: [] },
      { page_key: "contact", title: "Contact", order: 3, sections: [] },
    ],
    catalog_items: catalogItems,
    global_components: {},
    brand: {},
  };
}

const renderHelpers = {
  marketplaceItems: (schema) => schema.catalog_items || [],
  renderLogoMark: () => '<span class="rendered-logo-mark">NO</span>',
  renderSection: () => "",
  renderStudioFloatingCatalog: () => "",
  themeVars: () => "",
};

test("B2B SaaS pricing is omitted when the business has no verified recurring plans", () => {
  const schema = schemaWithCatalog([
    { id: "a", name: "Workflow setup", description: "One-time implementation", price: 500, price_type: "fixed" },
    { id: "b", name: "Data migration", description: "One-time migration", price: 900, price_type: "fixed" },
    { id: "c", name: "Training", description: "Team workshop", price: 300, price_type: "fixed" },
  ]);
  assert.equal(b2bSaasHasRealPricing(schema), false);
  assert.deepEqual(b2bSaasSubscriptionPlans(schema), []);
  const html = renderB2BSaasWebsite(schema, schema.pages[0], {}, { logo: "", layoutId: "standard", templateId: "b2b-saas-enterprise-pro", theme: {} }, renderHelpers);
  assert.doesNotMatch(html, /class="b2b-saas-pricing"/);
  assert.doesNotMatch(html, /Most popular/);
});

test("B2B SaaS pricing renders exactly three plans only with explicit recurring evidence", () => {
  const plans = [
    { id: "starter", name: "Starter", description: "For small teams", price: 29, price_type: "monthly", price_label: "$29/month" },
    { id: "growth", name: "Growth", description: "For scaling teams", price: 79, recurring: true, price_label: "$79/month" },
    { id: "scale", name: "Scale", description: "For larger organizations", price: 149, billing_interval: "month", price_label: "$149/month" },
  ];
  const schema = schemaWithCatalog(plans);
  assert.equal(b2bSaasHasRealPricing(schema), true);
  assert.deepEqual(b2bSaasSubscriptionPlans(schema), plans);
  const html = renderB2BSaasWebsite(schema, schema.pages[0], {}, { logo: "", layoutId: "standard", templateId: "b2b-saas-enterprise-pro", theme: {} }, renderHelpers);
  assert.match(html, /class="b2b-saas-pricing"/);
  assert.match(html, /Most popular/);
});

test("B2B SaaS navigation uses only real matching pages", () => {
  const pages = [
    { page_key: "home", title: "Home" },
    { page_key: "solutions", title: "Product solutions" },
    { page_key: "company", title: "About us" },
    { page_key: "docs", title: "Documentation" },
  ];
  assert.deepEqual(b2bSaasNavigationPages(pages).map((item) => item.key), ["product", "docs"]);
});

test("B2B SaaS specialization is exact and its new CSS leaves all other templates untouched", () => {
  assert.equal(isB2BSaasTemplate("b2b-saas-enterprise-pro"), true);
  const otherTemplates = [
    "premium-product-store", "luxury-high-ticket-pro", "education-course-academy-pro",
    "medical-wellness-clinic-pro", "legal-professional-services-pro", "manufacturing-industrial-supplier-pro",
    "mega-retail-store", "mega-marketplace", "listing-marketplace-pro", "fashion-drop-pro",
    "corporate-company-pro", "lead-funnel-pro", "restaurant-food-business", "digital-products-store",
    "real-estate-listings-pro", "home-services-premium", "local-services-pro-plus", "booking-appointment-pro",
  ];
  otherTemplates.forEach((templateId) => assert.equal(isB2BSaasTemplate(templateId), false, templateId));

  const css = fs.readFileSync(new URL("../ai-builder.css", import.meta.url), "utf8");
  const block = css.split("/* B2B SaaS enterprise */")[1]?.split("/* End B2B SaaS enterprise */")[0] || "";
  assert.ok(block.length > 4000);
  const selectors = [...block.matchAll(/(?:^|\})\s*([^{}]+)\{/gm)]
    .map((match) => match[1].trim())
    .filter((selector) => !selector.startsWith("@"));
  selectors.forEach((selector) => assert.match(selector, /\.template-b2b-saas-enterprise-pro/, selector));
  assert.doesNotMatch(block, /\.template-mega-retail-store/);
});
