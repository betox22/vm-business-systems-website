import assert from "node:assert/strict";
import test from "node:test";

import { constructionPreviewModel } from "../src/ai-builder/construction-preview-policy.js";
import { TEMPLATE_PREVIEW_CHOICES } from "../src/ai-builder/templates.js";

test("mirrors the approved flagship design maturity catalog", () => {
  const flagship = TEMPLATE_PREVIEW_CHOICES
    .filter((template) => template.design_maturity === "flagship")
    .map((template) => template.templateId)
    .sort();

  assert.deepEqual(flagship, [
    "b2b-saas-enterprise-pro",
    "booking-appointment-pro",
    "fashion-drop-pro",
    "listing-marketplace-pro",
    "local-services-pro-plus",
    "mega-marketplace",
    "mega-retail-store",
    "premium-product-store",
  ]);
});

test("shows an abstract sketch after the first business message", () => {
  const model = constructionPreviewModel({
    guidedState: {
      businessDescription: "Quiero crear una tienda de productos artesanales.",
      servicesProducts: ["Jabones"],
    },
    selection: { templateId: "premium-product-store" },
  });

  assert.equal(model.level, 1);
  assert.equal(model.mode, "sketch");
  assert.ok(model.progress < 100);
});

test("shows the real template after category and concrete offers are known", () => {
  const model = constructionPreviewModel({
    guidedState: {
      businessName: "Bath All Day",
      businessDescription: "Tienda de cuidado personal artesanal con venta online.",
      industry: "beauty",
      servicesProducts: ["Jabones artesanales", "Velas aromáticas", "Bombas de baño"],
      preferredTone: "premium",
    },
    selection: { templateId: "premium-product-store" },
  });

  assert.equal(model.level, 2);
  assert.equal(model.mode, "template");
  assert.equal(model.offers.length, 3);
});

test("exposes a visible busy state while the final website is generated", () => {
  const model = constructionPreviewModel({
    guidedState: {
      businessName: "Bath All Day",
      businessDescription: "Handmade soaps, candles and bath bombs.",
      industry: "beauty",
      servicesProducts: ["Handmade soaps", "Candles", "Bath bombs"],
    },
    selection: { templateId: "premium-product-store" },
    isGenerating: true,
  });

  assert.equal(model.mode, "template");
  assert.equal(model.isGenerating, true);
});
