import assert from "node:assert/strict";
import test from "node:test";

import {
  logoRequestUpdate,
  wantsAiGeneratedLogo,
} from "../src/ai-builder/logo-intent-policy.js";

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

test("an explicit request to continue without a logo never requests generation", () => {
  const text = "No tengo logo y prefiero continuar sin logo";
  assert.equal(wantsAiGeneratedLogo(text, { assumeLogoContext: true }), false);
  assert.deepEqual(logoRequestUpdate(text, { assumeLogoContext: true }), {
    hasLogoPhotos: text,
    logoBrief: "",
    aiGeneratedLogoRequested: false,
    logoPreference: "text_only",
  });
});

test("different skip wording remains explicit skip", () => {
  for (const text of [
    "Prefiero seguir sin logo de momento",
    "Continuemos sin un logo por ahora",
    "I want to continue without a logo for now",
  ]) {
    assert.equal(wantsAiGeneratedLogo(text, { assumeLogoContext: true }), false);
    assert.equal(logoRequestUpdate(text, { assumeLogoContext: true }).logoPreference, "text_only");
  }
});

test("a real creation request still requests an AI logo", () => {
  const text = "Quiero que diseñes un logo con las iniciales BAD";
  assert.equal(wantsAiGeneratedLogo(text), true);
  assert.equal(logoRequestUpdate(text).logoPreference, "generate_ai_logo");
});
