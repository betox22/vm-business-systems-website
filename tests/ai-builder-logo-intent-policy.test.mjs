import assert from "node:assert/strict";
import test from "node:test";

import {
  logoIntentPath,
  logoRequestUpdate,
  wantsAiGeneratedLogo,
} from "../src/ai-builder/logo-intent-policy.js";

const SKIP_MESSAGE = "No tengo logo y prefiero continuar sin logo por ahora.";

test("continue without a logo is an explicit skip, never a generation request", () => {
  assert.equal(logoIntentPath(SKIP_MESSAGE, { assumeLogoContext: true }), "explicit_skip");
  assert.equal(wantsAiGeneratedLogo(SKIP_MESSAGE, { assumeLogoContext: true }), false);
  assert.deepEqual(logoRequestUpdate(SKIP_MESSAGE, { assumeLogoContext: true }), {
    hasLogoPhotos: SKIP_MESSAGE,
    logoBrief: "",
    aiGeneratedLogoRequested: false,
    logoPreference: "explicit_skip",
  });
});

test("an explicit logo generation request remains supported", () => {
  const message = "Quiero que diseñes un logo original para PhoneHub.";
  assert.equal(logoIntentPath(message), "wants_generated");
  assert.equal(wantsAiGeneratedLogo(message), true);
  assert.equal(logoRequestUpdate(message).logoPreference, "generate_ai_logo");
});
