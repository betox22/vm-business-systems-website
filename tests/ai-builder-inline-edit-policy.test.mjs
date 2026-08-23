import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderB2BSaasWebsite } from "../src/ai-builder/b2b-saas-renderer.js";
import {
  constrainInlinePaste,
  inlineEditCatalogPath,
  inlineEditConfig,
  inlineEditEnterAction,
  inlineEditNavigationPath,
  inlineEditPageTitlePath,
  inlineEditPlaceholder,
  inlineEditPath,
  inlineEditPersistentPath,
  inlineEditSectionItemPath,
  normalizeInlineEditText,
} from "../src/ai-builder/inline-edit-policy.js";

function schemaWithHero(type = "PremiumHero") {
  const hero = {
    id: `${type.toLowerCase()}-1`,
    type,
    order: 1,
    editable: {
      badge: "Purpose-built operations",
      headline: "A sharper headline",
      subtitle: "A specific supporting promise.",
      primary_button: "Start now",
      secondary_button: "See the product",
    },
  };
  return {
    hero,
    schema: {
      business: { name: "Northstar", description: "Operations software for service teams.", selectedLanguage: "en" },
      pages: [{ page_key: "home", title: "Home", order: 1, sections: [hero] }],
      catalog_items: [],
      global_components: {},
      brand: {},
    },
  };
}

test("inline fields resolve to the same schema paths used by the inspector", () => {
  const { hero, schema } = schemaWithHero();
  assert.equal(inlineEditPath(schema, hero, "badge"), "pages.0.sections.0.editable.badge");
  assert.equal(inlineEditPath(schema, hero, "headline"), "pages.0.sections.0.editable.headline");
  assert.equal(inlineEditPath(schema, hero, "subtitle"), "pages.0.sections.0.editable.subtitle");
  assert.equal(inlineEditPath(schema, hero, "primary_button"), "pages.0.sections.0.editable.primary_button");
  assert.equal(inlineEditPath(schema, hero, "image_url"), "");
});

test("coverage paths map only to persistent section, catalog, navigation, footer, and contact data", () => {
  const { hero, schema } = schemaWithHero();
  const about = { id: "about", type: "About", editable: { title: "Our story", text: "Made with care." } };
  const faq = { id: "faq", type: "FAQ", editable: { title: "Questions", items: [{ question: "Why us?", answer: "Because it works." }] } };
  const feature = { id: "feature", type: "FeatureBand", editable: { items: [{ name: "Fast setup", description: "Ready quickly." }] } };
  const product = { id: "product-1", name: "Calm Kit", description: "A complete ritual." };
  const nav = { page_key: "home", label: "Home" };
  schema.pages[0].sections.push(about, faq, feature);
  schema.catalog_items.push(product);
  schema.navigation = [nav];

  assert.equal(inlineEditPath(schema, about, "title"), "pages.0.sections.1.editable.title");
  assert.equal(inlineEditPath(schema, about, "text"), "pages.0.sections.1.editable.text");
  assert.equal(inlineEditSectionItemPath(schema, faq, 0, "question"), "pages.0.sections.2.editable.items.0.question");
  assert.equal(inlineEditSectionItemPath(schema, faq, 0, "answer"), "pages.0.sections.2.editable.items.0.answer");
  assert.equal(inlineEditSectionItemPath(schema, feature, 0, "name"), "pages.0.sections.3.editable.items.0.name");
  assert.equal(inlineEditCatalogPath(schema, product, "name"), "catalog_items.0.name");
  assert.equal(inlineEditCatalogPath(schema, product, "description"), "catalog_items.0.description");
  assert.equal(inlineEditNavigationPath(schema, nav), "navigation.0.label");
  assert.equal(inlineEditPageTitlePath(schema, schema.pages[0]), "pages.0.title");
  assert.equal(inlineEditPersistentPath("global_components.footer_text", "footer_text"), "global_components.footer_text");
  assert.equal(inlineEditPersistentPath("contact.whatsapp", "contact_value"), "contact.whatsapp");

  assert.equal(inlineEditPersistentPath("theme.colors.primary", "text"), "");
  assert.equal(inlineEditPersistentPath("dashboard.metrics.0", "item_title"), "");
  assert.equal(inlineEditCatalogPath(schema, product, "price"), "");
  assert.equal(inlineEditSectionItemPath(schema, hero, 0, "image_url"), "");
});

test("single-line and controlled multiline fields normalize without losing their contract", () => {
  assert.equal(
    normalizeInlineEditText("  Built\nfor   growing teams  ", inlineEditConfig("headline"), "Original"),
    "Built for growing teams",
  );
  assert.equal(
    normalizeInlineEditText("First promise\n\nSecond promise\nThird promise\nIgnored", inlineEditConfig("subtitle")),
    "First promise\nSecond promise\nThird promise",
  );
  assert.equal(normalizeInlineEditText("   ", inlineEditConfig("primary_button"), "Start now"), "Start now");
});

test("keyboard and paste policies keep single-line CTAs safe and multiline copy controlled", () => {
  assert.equal(inlineEditEnterAction(inlineEditConfig("primary_button"), {}, "Start now", ""), "commit");
  assert.equal(inlineEditEnterAction(inlineEditConfig("subtitle"), {}, "Line one", ""), "newline");
  assert.equal(inlineEditEnterAction(inlineEditConfig("subtitle"), { ctrlKey: true }, "Line one", ""), "commit");
  assert.equal(inlineEditEnterAction(inlineEditConfig("subtitle"), {}, "One\nTwo\nThree", ""), "block");
  assert.equal(constrainInlinePaste("Buy\nnow", inlineEditConfig("primary_button"), 20), "Buy now");
  assert.equal(constrainInlinePaste("One\nTwo\nThree\nFour", inlineEditConfig("subtitle"), 100), "One\nTwo\nThree");
});

test("inline placeholders are localized and always provide an empty-state affordance", () => {
  assert.equal(inlineEditPlaceholder("headline", "es"), "Escribe el titular aqui");
  assert.equal(inlineEditPlaceholder("subtitle", "en"), "Write supporting text here");
});

test("B2B Hero exposes reusable edit contracts for badge, copy, and navigation CTAs", () => {
  const { hero, schema } = schemaWithHero("EnterpriseHero");
  const attrs = (targetSchema, section, field) => {
    const config = inlineEditConfig(field);
    return `data-inline-edit-path="${inlineEditPath(targetSchema, section, field)}" data-inline-edit-field="${field}" data-inline-edit-mode="${config.mode}"`;
  };
  const html = renderB2BSaasWebsite(
    schema,
    schema.pages[0],
    {},
    { logo: "", layoutId: "standard", templateId: "b2b-saas-enterprise-pro", theme: {} },
    {
      inlineEditAttrs: attrs,
      marketplaceItems: () => [],
      renderSection: () => "",
      renderStudioFloatingCatalog: () => "",
      sectionAttrs: (section) => `data-studio-section="${section.id}" data-studio-section-type="${section.type}"`,
      themeVars: () => "",
    },
  );
  assert.match(html, new RegExp(`data-studio-section="${hero.id}"`));
  assert.match(html, /data-inline-edit-path="pages\.0\.sections\.0\.editable\.badge"/);
  assert.match(html, /data-inline-edit-path="pages\.0\.sections\.0\.editable\.headline"/);
  assert.match(html, /data-inline-edit-path="pages\.0\.sections\.0\.editable\.subtitle"/);
  assert.match(html, /data-page-link="[^\"]+" data-inline-edit-path="pages\.0\.sections\.0\.editable\.primary_button"/);
  assert.match(html, /data-inline-edit-field="subtitle" data-inline-edit-mode="multiline"/);
});

test("B2B full-content renderer exposes real paths but leaves decorative dashboard copy static", () => {
  const { hero, schema } = schemaWithHero("EnterpriseHero");
  const solutions = { id: "solutions", type: "EnterpriseSolutions", order: 2, editable: { title: "Operational clarity", text: "Connect every workflow." } };
  const cta = { id: "demo", type: "EnterpriseDemo", order: 3, editable: { title: "See it in action", text: "Bring your real process.", primary_button: "Book a demo" } };
  schema.pages[0].sections.push(solutions, cta);
  schema.pages.push({ page_key: "catalog", title: "Products", order: 2, sections: [] });
  schema.catalog_items.push({ id: "workflow", name: "Workflow Hub", description: "One place for operations." });
  schema.global_components.footer_text = "Northstar, built for operators.";
  const attrsForPath = (_schema, path, field) => path ? `data-inline-edit-path="${path}" data-inline-edit-field="${field}"` : "";
  const attrs = (targetSchema, section, field) => attrsForPath(targetSchema, inlineEditPath(targetSchema, section, field), field);
  const html = renderB2BSaasWebsite(
    schema,
    schema.pages[0],
    {},
    { logo: "", layoutId: "standard", templateId: "b2b-saas-enterprise-pro", theme: {} },
    {
      inlineEditAttrs: attrs,
      inlineEditAttrsForPath: attrsForPath,
      marketplaceItems: (targetSchema) => targetSchema.catalog_items,
      renderSection: () => "",
      renderStudioFloatingCatalog: () => "",
      sectionAttrs: (section) => `data-studio-section="${section.id}" data-studio-section-type="${section.type}"`,
      themeVars: () => "",
    },
  );

  assert.match(html, /data-inline-edit-path="pages\.0\.sections\.1\.editable\.title"/);
  assert.match(html, /data-inline-edit-path="catalog_items\.0\.name"/);
  assert.match(html, /data-inline-edit-path="catalog_items\.0\.description"/);
  assert.match(html, /data-inline-edit-path="pages\.0\.sections\.2\.editable\.primary_button"/);
  assert.match(html, /data-inline-edit-path="pages\.1\.title"/);
  assert.match(html, /data-inline-edit-path="global_components\.footer_text"/);
  assert.doesNotMatch(html, /data-inline-edit-path="dashboard\./);
  assert.doesNotMatch(html, /data-inline-edit-path="labels\./);
});

test("inline editing reserves outline space without reflow and preserves the native CTA background", () => {
  const css = readFileSync(new URL("../ai-builder.css", import.meta.url), "utf8");
  assert.match(css, /h1\[data-inline-edit-path\],[\s\S]*p\[data-inline-edit-path\][\s\S]*padding:\s*0;[\s\S]*outline-offset:\s*4px/);
  assert.match(css, /is-inline-editing:not\(a\):not\(button\)/);
  assert.match(css, /a\[data-inline-edit-path\]\.is-inline-editing,[\s\S]*button\[data-inline-edit-path\]\.is-inline-editing/);
  assert.match(css, /\.is-inline-selected:not\(\.is-inline-editing\)/);
  assert.match(css, /\[data-inline-edit-path\]\.is-inline-empty::before/);
  assert.match(css, /\[data-inline-edit-path\]:focus-visible/);
  const editingRule = css.match(/\[data-inline-edit-path\]\.is-inline-editing\s*\{([^}]+)\}/)?.[1] || "";
  assert.doesNotMatch(editingRule, /font-(?:family|size|style|weight)|line-height|letter-spacing/);
});

test("inline editing inherits the owning card radius instead of forcing one generic corner", () => {
  const css = readFileSync(new URL("../ai-builder.css", import.meta.url), "utf8");
  assert.match(css, /border-radius:\s*var\(--inline-edit-radius,\s*6px\)/);
  assert.match(css, /\.premium-feature-grid article\s*\{\s*--inline-edit-radius:\s*28px;/);
  assert.match(css, /\.catalog-premium-editorial article\s*\{\s*--inline-edit-radius:\s*32px;/);
  assert.match(css, /\.template-b2b-saas-enterprise-pro \.b2b-saas-features article\s*\{\s*--inline-edit-radius:\s*28px;/);
  assert.match(css, /\.template-b2b-saas-enterprise-pro \.b2b-saas-plans article\s*\{\s*--inline-edit-radius:\s*18px;/);
});

test("editorial elevation is scoped to Premium showcase and B2B solution cards", () => {
  const css = readFileSync(new URL("../ai-builder.css", import.meta.url), "utf8");
  const renderer = readFileSync(new URL("../src/ai-builder/renderers.js", import.meta.url), "utf8");
  const publicRenderer = readFileSync(new URL("../site-viewer.js", import.meta.url), "utf8");
  assert.match(renderer, /class="premium-feature-icon" aria-hidden="true"/);
  assert.match(publicRenderer, /class="premium-feature-icon" aria-hidden="true"/);
  assert.match(css, /\.premium-feature-grid article::after,/);
  assert.match(css, /\.premium-feature-grid article:hover,/);
  assert.match(css, /\.template-b2b-saas-enterprise-pro \.b2b-saas-features article:hover/);
  assert.match(css, /\.premium-feature-grid article:nth-child\(2\)/);
  assert.match(css, /\.template-b2b-saas-enterprise-pro \.b2b-saas-features article:nth-child\(3\)/);
  assert.doesNotMatch(css, /\.site-preview article:hover\s*\{/);
});
