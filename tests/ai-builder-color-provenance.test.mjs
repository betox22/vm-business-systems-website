import assert from "node:assert/strict";
import test from "node:test";

import { buildColorProvenance } from "../src/ai-builder/color-provenance.js";
import { DEFAULT_BRAND } from "../src/ai-builder/templates.js";

test("default preview brand does not become an authoritative color anchor", () => {
  const result = buildColorProvenance({
    preferredColors: [],
    logoPalette: [],
    localBrand: DEFAULT_BRAND,
  });

  assert.equal(result.anchorColor, null);
  assert.equal(result.anchorSource, "unknown");
  assert.deepEqual(result.colors, []);
});
