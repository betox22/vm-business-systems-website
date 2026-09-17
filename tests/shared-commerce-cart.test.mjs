import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  SHARED_CART_COMPONENT,
  addCartLine,
  cartCheckoutSummary,
  cartItemCount,
  cartStorageKey,
  resolveCatalogAction,
} from "../shared-commerce-cart.js";

const viewer = readFileSync(new URL("../site-viewer.js", import.meta.url), "utf8");
const editorRenderers = readFileSync(new URL("../src/ai-builder/renderers.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../ai-builder.css", import.meta.url), "utf8");
const siteHtml = readFileSync(new URL("../site.html", import.meta.url), "utf8");
const stageScript = readFileSync(new URL("../scripts/stage-public-site.mjs", import.meta.url), "utf8");

test("cart state is isolated by business and generated site", () => {
  const bath = cartStorageKey({ businessId: "bath", siteId: "site-a" });
  const fashion = cartStorageKey({ businessId: "fashion", siteId: "site-b" });
  assert.equal(bath, "kreaton:cart:bath:site-a");
  assert.equal(fashion, "kreaton:cart:fashion:site-b");
  assert.notEqual(bath, fashion);
  assert.doesNotMatch(bath, /lumaPublicCart/);
});

test("the shared cart owns quantity and checkout summary behavior", () => {
  let items = addCartLine([], { id: "soap", name: "Lavender Soap", price: "$12" });
  items = addCartLine(items, { id: "soap", name: "Lavender Soap", price: "$12" });
  items = addCartLine(items, { id: "candle", name: "Calm Candle", price: "$18" });
  assert.equal(cartItemCount(items), 3);
  assert.equal(cartCheckoutSummary(items), "2 x Lavender Soap, 1 x Calm Candle");
});

test("every commerce template delegates to one component instead of template cart copies", () => {
  assert.equal(SHARED_CART_COMPONENT, "kreaton-shared-cart");
  assert.match(viewer, /createSharedCommerceCart/);
  assert.match(viewer, /sharedCart\?\.bind\(publicSite\)/);
  assert.doesNotMatch(viewer, /function openCartDrawer/);
  assert.doesNotMatch(viewer, /lumaPublicCart/);
  assert.doesNotMatch(css, /\.template-[^\n{]*(?:kreaton-cart|commerce-cart)/);
  for (const templateId of ["premium-product-store", "mega-retail-store", "fashion-drop-pro"]) {
    assert.equal(viewer.includes(`function open${templateId}Cart`), false);
  }
});

test("premium, mega retail, and fashion catalogs all emit the shared cart contract", () => {
  assert.match(viewer, /function catalogAction\(schema, item/);
  assert.match(viewer, /function renderPremiumEditorialCatalog[\s\S]*?catalogAction\(schema, item, labels\.view\)/);
  assert.match(viewer, /function renderFashionLookbookCatalog[\s\S]*?catalogAction\(schema, item, labels\.view\)/);
  assert.match(viewer, /function renderMegaRetailPublicDeals[\s\S]*?catalogAction\(schema, item\)/);
  assert.ok((css.match(/\.kreaton-cart-overlay\s*\{/g) || []).length >= 1);
});

test("quote-only catalog actions always request availability and never enter the cart", () => {
  for (const language of ["en", "es", "fr", "pt"]) {
    const action = resolveCatalogAction(
      { id: "phone", name: "Phone", price_type: "quote_only", price_label: "Price to confirm" },
      { language, commerce: true },
    );
    assert.equal(action.mode, "inquiry");
    assert.match(action.attributes, /data-open-lead/);
    assert.doesNotMatch(action.attributes, /data-cart-add/);
  }
  assert.equal(
    resolveCatalogAction({ name: "Telefono", price_type: "quote_only" }, { language: "es" }).label,
    "Consultar disponibilidad",
  );
  assert.match(css, /mega-retail-product[^\n]*button\[data-open-lead\][^\n]*width:\s*100%/);
});

test("fixed-price catalog actions keep the shared cart contract", () => {
  const action = resolveCatalogAction(
    { id: "phone", name: "Phone", price_type: "fixed", price: 499 },
    { language: "en", commerce: true },
  );
  assert.equal(action.mode, "cart");
  assert.match(action.attributes, /data-cart-add/);
  assert.equal(action.label, "Add to cart");
});

test("all public and editor commerce catalog renderers delegate CTA policy", () => {
  for (const source of [viewer, editorRenderers]) {
    assert.match(source, /resolveCatalogAction/);
    assert.match(source, /function renderMegaRetail[^\n]*Deals[\s\S]*?catalogAction\(schema, item\)/);
    assert.match(source, /function renderDigitalOfferCatalog[\s\S]*?catalogAction\(schema, item/);
    assert.match(source, /function renderCatalogCard[\s\S]*?catalogAction\(schema, item/);
    assert.doesNotMatch(source, /cartTriggerAttributes/);
  }
});

test("the shared module is published and loaded before the public renderer", () => {
  assert.match(siteHtml, /type="module" src="site-viewer\.js\?v=38"/);
  assert.match(viewer, /from "\.\/shared-commerce-cart\.js\?v=3"/);
  assert.match(stageScript, /"shared-commerce-cart\.js"/);
});
