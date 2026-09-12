import assert from "node:assert/strict";
import test from "node:test";

import {
  priceConfirmationLabel,
  withoutInventedCommerceMetadata,
} from "../src/ai-builder/catalog-fidelity-policy.js";

test("unknown client pricing never keeps invented price rating or stock", () => {
  const item = withoutInventedCommerceMetadata({
    name: "Telefonos",
    price: 999.99,
    price_amount: 999.99,
    rating: 4.8,
    review_count: 92,
    inventory_quantity: 24,
    stock: 24,
    track_inventory: true,
  }, "es");

  assert.equal(item.price, null);
  assert.equal(item.price_amount, null);
  assert.equal(item.price_type, "quote_only");
  assert.equal(item.price_label, "Precio por confirmar");
  assert.equal(item.track_inventory, false);
  assert.equal("rating" in item, false);
  assert.equal("review_count" in item, false);
  assert.equal("inventory_quantity" in item, false);
  assert.equal("stock" in item, false);
  assert.equal(priceConfirmationLabel("en"), "Price to confirm");
});
