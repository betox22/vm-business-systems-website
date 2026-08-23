import assert from "node:assert/strict";
import test from "node:test";

import {
  applySurgicalSchemaEdit,
  detectSurgicalEditIntent,
} from "../src/ai-builder/surgical-edit-policy.js";

function sampleSchema() {
  return {
    business: { name: "Bath All Day", industry: "beauty" },
    theme: {
      colors: { primary: "#0e7c66", secondary: "#f59e0b", background: "#ffffff", text: "#111827" },
      fonts: { heading: "Space Grotesk", body: "Inter" },
    },
    selected_template: { id: "premium-product-store" },
    pages: [{
      page_key: "home",
      sections: [
        {
          id: "hero-main",
          type: "PremiumHero",
          editable: {
            headline: "Rituales para todos los dias",
            subtitle: "Jabones y velas artesanales",
            image_url: "https://images.example/hero-old.jpg",
          },
        },
        { id: "story", type: "AboutStory", editable: { headline: "Nuestra historia", text: "Hecho a mano." } },
      ],
    }],
    catalog_items: [
      { id: "soap", name: "Jabon Lavanda", description: "Suave y artesanal", price: 12, image_url: "https://images.example/soap-old.jpg" },
      { id: "candle", name: "Vela Calma", description: "Aroma sereno", price: 18, image_url: "https://images.example/candle.jpg" },
    ],
    contact: { email: "hello@bathallday.test" },
  };
}

function expectedWith(original, mutate) {
  const expected = structuredClone(original);
  mutate(expected);
  return expected;
}

test("color correction changes only the requested color token", () => {
  const original = sampleSchema();
  const result = applySurgicalSchemaEdit(original, "Cambia el color a azul");
  const expected = expectedWith(original, (schema) => {
    schema.theme.colors.primary = "#2563eb";
    schema.brand = { primaryColor: "#2563eb", buttonColor: "#2563eb" };
  });
  assert.equal(result.intent.kind, "color");
  assert.deepEqual(result.changedPaths, ["/theme/colors/primary", "/brand/primaryColor", "/brand/buttonColor"]);
  assert.deepEqual(result.schema, expected);
});

test("section text correction changes only the named section field", () => {
  const original = sampleSchema();
  const result = applySurgicalSchemaEdit(original, 'Cambia el titulo del hero a "Tu pausa empieza aqui"');
  const expected = expectedWith(original, (schema) => {
    schema.pages[0].sections[0].editable.headline = "Tu pausa empieza aqui";
  });
  assert.equal(result.intent.kind, "section_text");
  assert.deepEqual(result.changedPaths, ["/pages/0/sections/0/editable/headline"]);
  assert.deepEqual(result.schema, expected);
});

test("product correction renames only the matching product", () => {
  const original = sampleSchema();
  const result = applySurgicalSchemaEdit(
    original,
    'El nombre del producto "Jabon Lavanda" esta mal, cambialo a "Jabon de Lavanda"',
  );
  const expected = expectedWith(original, (schema) => { schema.catalog_items[0].name = "Jabon de Lavanda"; });
  assert.equal(result.intent.kind, "product");
  assert.deepEqual(result.changedPaths, ["/catalog_items/0/name"]);
  assert.deepEqual(result.schema, expected);
});

test("image correction changes only the requested hero image", () => {
  const original = sampleSchema();
  const result = applySurgicalSchemaEdit(
    original,
    "Cambia la imagen del hero por https://images.example/hero-new.jpg",
  );
  const expected = expectedWith(original, (schema) => {
    schema.pages[0].sections[0].editable.image_url = "https://images.example/hero-new.jpg";
  });
  assert.equal(result.intent.kind, "image");
  assert.deepEqual(result.changedPaths, ["/pages/0/sections/0/editable/image_url"]);
  assert.deepEqual(result.schema, expected);
});

test("unknown correction is a no-op instead of a broad regeneration", () => {
  const original = sampleSchema();
  const result = applySurgicalSchemaEdit(original, "No me convence");
  assert.equal(detectSurgicalEditIntent("No me convence", original).kind, "unknown");
  assert.deepEqual(result.changedPaths, []);
  assert.deepEqual(result.schema, original);
});
