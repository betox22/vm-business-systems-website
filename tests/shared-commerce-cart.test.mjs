import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  SHARED_CART_COMPONENT,
  addCartLine,
  cartCheckoutSummary,
  cartItemCount,
  cartStorageKey,
} from "../shared-commerce-cart.js";

const viewer = readFileSync(new URL("../site-viewer.js", import.meta.url), "utf8");
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
  assert.match(viewer, /function renderMegaRetailPublicDeals[\s\S]*?cartTriggerAttributes\(item\)/);
  assert.ok((css.match(/\.kreaton-cart-overlay\s*\{/g) || []).length >= 1);
});

test("the shared module is published and loaded before the public renderer", () => {
  assert.match(siteHtml, /type="module" src="site-viewer\.js\?v=34"/);
  assert.match(viewer, /from "\.\/shared-commerce-cart\.js\?v=1"/);
  assert.match(stageScript, /"shared-commerce-cart\.js"/);
});
