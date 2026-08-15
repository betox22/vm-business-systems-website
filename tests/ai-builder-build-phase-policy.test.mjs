import assert from "node:assert/strict";
import test from "node:test";

import { remainingBuildPhaseVisibilityMs } from "../src/ai-builder/build-phase-policy.js";

test("keeps a new build phase visible for the remaining minimum window", () => {
  assert.equal(remainingBuildPhaseVisibilityMs(1_000, 1_125, 450), 325);
});

test("does not delay a build phase already visible long enough", () => {
  assert.equal(remainingBuildPhaseVisibilityMs(1_000, 1_600, 450), 0);
});
