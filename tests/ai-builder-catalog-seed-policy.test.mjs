import assert from "node:assert/strict";
import test from "node:test";

import {
  hasRealCatalogIdentity,
  mergeSemanticSeedCatalog,
  shouldUseSemanticSeedIdentity,
} from "../src/ai-builder/catalog-seed-policy.js";

test("keeps real client offerings even when their copy is incomplete", () => {
  assert.equal(hasRealCatalogIdentity({ name: "Impresoras 3D", category: "3D Printers" }), true);
  assert.equal(hasRealCatalogIdentity({ name: "Cursos online de como hacer los productos" }), true);
});

test("allows semantic seeds only for genuinely empty or placeholder identities", () => {
  assert.equal(hasRealCatalogIdentity({}), false);
  assert.equal(hasRealCatalogIdentity({ name: "Product 1" }), false);
  assert.equal(hasRealCatalogIdentity({ name: "Featured item" }), false);
});

test("never substitutes a real product identity even when backend reports seed_fallback", () => {
  assert.equal(
    shouldUseSemanticSeedIdentity({ name: "Impresoras 3D", category: "Impresoras 3D" }, "seed_fallback"),
    false,
  );
  assert.equal(shouldUseSemanticSeedIdentity({ name: "Product 1" }, "seed_fallback"), true);
});

test("mergeSemanticSeedCatalog protects real metadata and resolves its own image query", () => {
  const [result] = mergeSemanticSeedCatalog(
    [{
      name: "Impresoras 3D",
      category: "Desk setup",
      description: "Customizable ambient lighting for desks.",
      price: 59,
      image_url: "",
      imageSearchQuery: "professional 3D printer product photo",
    }],
    [{
      name: "CyberLamp Ambient Desk Light",
      category: "Desk setup",
      description: "Customizable ambient lighting for desks.",
      price: 59,
      image_url: "https://seed.example/cyberlamp.jpg",
      imageSearchQuery: "rgb desk lamp",
    }],
    "es",
    "impresoras 3D y materiales",
    {
      catalogSource: "seed_fallback",
      imageUrlForQuery: (query) => `https://images.example/${encodeURIComponent(query)}`,
    },
  );

  assert.equal(result.name, "Impresoras 3D");
  assert.equal(result.category, "Impresoras 3D");
  assert.match(result.description, /Impresoras 3D/);
  assert.equal(result.price, null);
  assert.equal(result.price_label, "Precio por confirmar");
  assert.equal(
    result.image_url,
    "https://images.example/professional%203D%20printer%20product%20photo",
  );
  assert.notEqual(result.image_url, "https://seed.example/cyberlamp.jpg");
});

test("ai-generated real items never inherit unverified commerce metadata from seeds", () => {
  const [result] = mergeSemanticSeedCatalog(
    [{
      name: "Telefonos",
      category: "Telefonos y accesorios",
      description: "Modelos seleccionados para entrega a domicilio.",
      content_origin: "ai_enriched",
      imageSearchQuery: "smartphone retail display",
    }],
    [{
      name: "Magnetic Desk Stand",
      price: 49.99,
      rating: 4.9,
      review_count: 812,
      badge: "Best seller",
      shipping_label: "Free next-day shipping",
      inventory_quantity: 99,
    }],
    "es",
    "telefonos y accesorios",
    { catalogSource: "ai_generated" },
  );

  assert.equal(result.name, "Telefonos");
  assert.equal(result.price, null);
  assert.equal(result.price_type, "quote_only");
  assert.equal(result.price_label, "Precio por confirmar");
  assert.equal(result.rating, null);
  assert.equal(result.review_count, null);
  assert.equal(result.badge, "");
  assert.equal(result.shipping_label, "");
  assert.equal(result.inventory_quantity, null);
});
