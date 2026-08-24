import assert from "node:assert/strict";
import test from "node:test";

import {
  filterTemplatesAvailableForNewProject,
  isTemplateAvailableForNewProject,
  resetRuntimeTemplateAvailability,
  setRuntimeTemplateAvailability,
} from "../src/ai-builder/template-runtime-policy.js";

test("built-in catalog remains available when the runtime endpoint is unavailable", () => {
  resetRuntimeTemplateAvailability();
  assert.equal(isTemplateAvailableForNewProject("premium-product-store"), true);
});

test("disabled templates are removed from new-project choices", () => {
  setRuntimeTemplateAvailability(["premium-product-store", "b2b-saas-enterprise-pro"]);
  assert.equal(isTemplateAvailableForNewProject("mega-retail-store"), false);
  assert.deepEqual(
    filterTemplatesAvailableForNewProject([
      { templateId: "premium-product-store" },
      { templateId: "mega-retail-store" },
    ]),
    [{ templateId: "premium-product-store" }],
  );
  resetRuntimeTemplateAvailability();
});
