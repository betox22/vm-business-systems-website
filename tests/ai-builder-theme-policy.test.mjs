import assert from "node:assert/strict";
import test from "node:test";

import { buildColorProvenance } from "../src/ai-builder/color-provenance.js";
import {
  applyAuthoritativeThemeToBrand,
  shouldPreserveBackendTheme,
} from "../src/ai-builder/theme-policy.js";

test("backend-generated theme colors and fonts override the local brand", () => {
  const schema = {
    generation_metadata: { theme_source: "backend_generated" },
    theme: {
      colors: {
        background: "#FFF7ED",
        surface: "#FFFFFF",
        primary: "#7C2D12",
        secondary: "#FDBA74",
        accent: "#0F766E",
        text: "#1C1917",
      },
      fonts: { heading: "Playfair Display", body: "Source Sans 3" },
    },
  };
  const localBrand = {
    primaryColor: "#2563EB",
    secondaryColor: "#DBEAFE",
    accentColor: "#7C3AED",
    backgroundColor: "#F8FAFC",
    surfaceColor: "#FFFFFF",
    textColor: "#111827",
    buttonColor: "#2563EB",
    fontPairing: { heading: "Inter", body: "Inter" },
  };

  const result = applyAuthoritativeThemeToBrand(schema, localBrand);

  assert.equal(shouldPreserveBackendTheme(schema), true);
  assert.equal(result.primaryColor, "#7C2D12");
  assert.equal(result.secondaryColor, "#FDBA74");
  assert.equal(result.accentColor, "#0F766E");
  assert.equal(result.backgroundColor, "#FFF7ED");
  assert.equal(result.textColor, "#1C1917");
  assert.deepEqual(result.fontPairing, { heading: "Playfair Display", body: "Source Sans 3" });
});

test("local fallback without backend marker keeps the existing brand unchanged", () => {
  const localBrand = {
    primaryColor: "#2563EB",
    accentColor: "#7C3AED",
    fontPairing: { heading: "Inter", body: "Inter" },
  };

  const result = applyAuthoritativeThemeToBrand(
    { generation_metadata: {}, theme: { colors: { primary: "#7C2D12" } } },
    localBrand,
  );

  assert.equal(shouldPreserveBackendTheme({ generation_metadata: {} }), false);
  assert.strictEqual(result, localBrand);
});

test("color provenance prioritizes explicit client colors, then logo, then local suggestions", () => {
  const result = buildColorProvenance({
    preferredColors: ["#112233"],
    logoPalette: ["#445566", "#112233"],
    localBrand: { primaryColor: "#778899" },
    preferredColorMeta: { source: "explicit_user_choice", confidence: 1 },
  });

  assert.equal(result.anchorColor, "#112233");
  assert.equal(result.anchorSource, "explicit_client");
  assert.deepEqual(result.colors, [
    { color: "#112233", source: "explicit_client" },
    { color: "#445566", source: "logo_extracted" },
    { color: "#778899", source: "local_suggestion" },
  ]);
});

test("delegated color choice does not outrank an extracted logo palette", () => {
  const result = buildColorProvenance({
    preferredColors: ["Lyra decide"],
    logoPalette: ["#445566"],
    localBrand: { primaryColor: "#778899" },
    preferredColorMeta: { source: "explicit_delegation", confidence: 1 },
  });

  assert.equal(result.anchorColor, "#445566");
  assert.equal(result.anchorSource, "logo_extracted");
  assert.equal(result.colors.some((item) => item.color === "Lyra decide"), false);
});
