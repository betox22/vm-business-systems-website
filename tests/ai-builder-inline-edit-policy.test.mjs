import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderB2BSaasWebsite } from "../src/ai-builder/b2b-saas-renderer.js";
import {
  constrainInlinePaste,
  inlineEditConfig,
  inlineEditEnterAction,
  inlineEditPlaceholder,
  inlineEditPath,
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
