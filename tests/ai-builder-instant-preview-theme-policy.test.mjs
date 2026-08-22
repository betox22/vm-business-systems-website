import assert from "node:assert/strict";
import test from "node:test";

import {
  applyInstantPreviewPaletteToBrand,
  semanticInstantPreviewPalette,
} from "../src/ai-builder/instant-preview-theme-policy.js";

test("a bath and tub color intention produces an aquatic instant-preview palette", () => {
  const palette = semanticInstantPreviewPalette(["algo que haga alusion a banos y tinas"]);
  assert.deepEqual(palette, {
    background: "#f3fbfc",
    surface: "#ffffff",
    primary: "#176b87",
    secondary: "#bfe5e9",
    accent: "#46b6c7",
    text: "#102a36",
  });
  const brand = applyInstantPreviewPaletteToBrand({ primaryColor: "#0e7c66" }, palette);
  assert.equal(brand.primaryColor, "#176b87");
  assert.equal(brand.buttonColor, "#176b87");
});

test("unrelated prose does not override the regular brand preview", () => {
  assert.equal(semanticInstantPreviewPalette(["que se vea elegante y moderno"]), null);
});
