import assert from "node:assert/strict";
import test from "node:test";

import {
  declaredCatalogPrice,
  truthfulCatalogPricing,
} from "../src/ai-builder/catalog-pricing-policy.js";

test("Mega Retail client offerings without a declared price remain quote-only", () => {
  for (const offering of ["telefonos", "laptops", "audifonos", "cargadores"] ) {
    const result = truthfulCatalogPricing(offering, "es");
    assert.equal(result.price_type, "quote_only");
    assert.equal(result.price_amount, null);
    assert.equal(result.price_label, "Precio por confirmar");
    assert.equal(result.track_inventory, false);
  }
});

test("an explicit client price is preserved without inventing a replacement", () => {
  assert.equal(declaredCatalogPrice("Cargador USB-C - USD 24.50"), 24.5);
  assert.deepEqual(truthfulCatalogPricing("Cargador USB-C - USD 24.50", "es"), {
    price_type: "fixed",
    price_amount: 24.5,
    price_label: "USD 24.50",
    track_inventory: false,
  });
});

test("model numbers are not mistaken for prices", () => {
  assert.equal(declaredCatalogPrice("Galaxy S23"), null);
  assert.equal(declaredCatalogPrice("iPhone 15 Pro"), null);
});
