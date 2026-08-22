import assert from "node:assert/strict";
import test from "node:test";

import {
  bathBodyCategoryLabel,
  bathBodyStockImageUrl,
  isBathBodyCatalogContext,
  shouldExpandInstantCatalog,
} from "../src/ai-builder/catalog-preview-policy.js";

test("Bath All Day products are recognized as bath and body, not generic makeup", () => {
  assert.equal(isBathBodyCatalogContext("jabones artesanales, velas aromáticas y bombas de baño"), true);
  assert.equal(isBathBodyCatalogContext("brochas, sombras y maquillaje"), false);
});

test("soap, candle and bath bomb resolve to distinct relevant stock images", () => {
  const soap = bathBodyStockImageUrl("jabones artesanales");
  const candle = bathBodyStockImageUrl("velas aromáticas");
  const bathBomb = bathBodyStockImageUrl("bombas de baño");
  assert.match(soap, /1663108275588/);
  assert.match(candle, /1742544637816/);
  assert.match(bathBomb, /1540555700478/);
  assert.equal(new Set([soap, candle, bathBomb]).size, 3);
});

test("Mega Retail does not expand a focused captured catalog with generic departments", () => {
  const offerings = ["Jabones artesanales", "Velas aromaticas", "Bombas de bano"];
  assert.equal(shouldExpandInstantCatalog({ items: offerings, sourceIsBroad: false, templateIsBroad: true }), false);
  assert.deepEqual(offerings.map((item) => bathBodyCategoryLabel(item, "es")), [
    "Jabones artesanales",
    "Velas aromáticas",
    "Bombas de baño",
  ]);
});

test("a genuinely broad catalog can still receive broad template expansion", () => {
  assert.equal(shouldExpandInstantCatalog({ items: ["Producto"], sourceIsBroad: true, templateIsBroad: true }), true);
});
