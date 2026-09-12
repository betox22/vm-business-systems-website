import assert from "node:assert/strict";
import test from "node:test";

import { logoRequestUpdate, wantsAiGeneratedLogo } from "../src/ai-builder/logo-intent-policy.js";

test("natural Spanish logo request preserves the requested BAD initials", () => {
  const message = "Quiero un logo con las iniciales BAD para Bath All Day";
  assert.equal(wantsAiGeneratedLogo(message), true);
  assert.deepEqual(logoRequestUpdate(message), {
    hasLogoPhotos: message,
    logoBrief: message,
    aiGeneratedLogoRequested: true,
    logoPreference: "generate_ai_logo",
  });
});

test("a color answer is not misclassified as a logo request", () => {
  assert.equal(wantsAiGeneratedLogo("morado y azul"), false);
  assert.equal(logoRequestUpdate("morado y azul"), null);
});
