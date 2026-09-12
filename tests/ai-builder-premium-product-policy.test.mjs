import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  limitPremiumHeadline,
  orderPremiumHomeSections,
  premiumSectionImage,
  PREMIUM_IMAGE_ROLES,
} from "../src/ai-builder/premium-product-policy.js";

test("premium hero and story only consume their assigned image roles", () => {
  const hero = {
    editable: {
      imageRole: PREMIUM_IMAGE_ROLES.hero,
      imageAsset: { role: PREMIUM_IMAGE_ROLES.hero, url: "https://images.example/hero.jpg" },
    },
  };
  const story = {
    editable: {
      imageRole: PREMIUM_IMAGE_ROLES.detail,
      imageAsset: { role: PREMIUM_IMAGE_ROLES.detail, url: "https://images.example/detail.jpg" },
    },
  };

  assert.equal(premiumSectionImage(hero, PREMIUM_IMAGE_ROLES.hero), "https://images.example/hero.jpg");
  assert.equal(premiumSectionImage(story, PREMIUM_IMAGE_ROLES.detail), "https://images.example/detail.jpg");
  assert.equal(premiumSectionImage(hero, PREMIUM_IMAGE_ROLES.detail), "");
});

test("premium headline is capped at twelve words without changing short headlines", () => {
  assert.equal(limitPremiumHeadline("Telefonos y accesorios elegidos para acompañarte todos los dias"), "Telefonos y accesorios elegidos para acompañarte todos los dias");
  assert.equal(
    limitPremiumHeadline("Uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce"),
    "Uno dos tres cuatro cinco seis siete ocho nueve diez once doce",
  );
});

test("premium home rhythm is hero trust products story differentiators proof and CTA", () => {
  const ordered = orderPremiumHomeSections([
    { id: "cta", type: "CTA" },
    { id: "story", type: "ProductStory" },
    { id: "products", type: "ProductGrid" },
    { id: "hero", type: "PremiumHero" },
    { id: "proof", type: "ProofPanel" },
    { id: "features", type: "FeatureShowcase" },
    { id: "trust", type: "TrustStrip" },
  ]);

  assert.deepEqual(ordered.map((section) => section.id), ["hero", "trust", "products", "story", "features", "proof", "cta"]);
  assert.deepEqual(ordered.map((section) => section.order), [1, 2, 3, 4, 5, 6, 7]);
});

test("both renderers use section-role media instead of the first catalog image", () => {
  for (const file of ["src/ai-builder/renderers.js", "site-viewer.js"]) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    const premiumHero = source.slice(source.indexOf("function renderPremiumHero"), source.indexOf("function renderProductStory"));
    const productStory = source.slice(source.indexOf("function renderProductStory"), source.indexOf("function renderFeatureShowcase"));
    assert.match(premiumHero, /premiumSectionImage\(section, PREMIUM_IMAGE_ROLES\.hero\)/);
    assert.match(productStory, /premiumSectionImage\(section, PREMIUM_IMAGE_ROLES\.detail\)/);
    assert.doesNotMatch(premiumHero, /find\(\(item\) => item\.image_url\)/);
    assert.doesNotMatch(productStory, /find\(\(item\) => item\.image_url\)/);
  }
});
