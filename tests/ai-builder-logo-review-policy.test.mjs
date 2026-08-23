import assert from "node:assert/strict";
import test from "node:test";

import { clearClientProjectRuntimeState } from "../src/ai-builder/client-project-start-policy.js";
import {
  applyGeneratedLogoToState,
  approveGeneratedLogo,
  needsGeneratedLogoApproval,
  needsGeneratedLogoRequest,
  prepareGeneratedLogoRetry,
} from "../src/ai-builder/logo-review-policy.js";

test("start new clears every logo field from the previous project", () => {
  const state = {
    guidedState: {
      businessName: "Old project",
      logoUrl: "https://old.example/logo.png",
      logoBrief: "Use OLD initials",
      logoPreference: "generate_ai_logo",
      logoGenerationStatus: "generated",
      logoApprovalStatus: "approved",
      aiGeneratedLogoRequested: true,
      hasLogo: true,
      logoPalette: ["#123456"],
    },
  };

  clearClientProjectRuntimeState(state, { businessName: "", contactInfo: {} });

  assert.equal(state.guidedState.logoUrl, "");
  assert.equal(state.guidedState.logoBrief, "");
  assert.equal(state.guidedState.logoPreference, "");
  assert.equal(state.guidedState.logoGenerationStatus, "");
  assert.equal(state.guidedState.logoApprovalStatus, "");
  assert.equal(state.guidedState.aiGeneratedLogoRequested, false);
  assert.equal(JSON.stringify(state).includes("OLD"), false);
});

test("generated logo must be approved before final generation continues", () => {
  const guidedState = { logoPreference: "generate_ai_logo", logoUrl: "", logoApprovalStatus: "" };
  assert.equal(needsGeneratedLogoRequest(guidedState), true);

  const result = applyGeneratedLogoToState(guidedState, {
    status: "generated",
    logoUrl: "https://storage.example/new-logo.png",
  });
  assert.equal(result.generated, true);
  assert.equal(needsGeneratedLogoApproval(guidedState), true);

  approveGeneratedLogo(guidedState);
  assert.equal(needsGeneratedLogoApproval(guidedState), false);
  assert.equal(guidedState.logoApprovalStatus, "approved");

  prepareGeneratedLogoRetry(guidedState);
  assert.equal(guidedState.logoUrl, "");
  assert.equal(needsGeneratedLogoRequest(guidedState), true);
});
