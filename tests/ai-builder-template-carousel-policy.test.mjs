import assert from "node:assert/strict";
import test from "node:test";

import { hasDecidedTemplateSelection } from "../src/ai-builder/template-carousel-policy.js";

test("keeps the carousel visible for provisional template selections", () => {
  assert.equal(hasDecidedTemplateSelection({
    intent: "guided_context_template",
    templateId: "premium-product-store",
  }), false);
});

test("collapses the carousel after LYRA selects a concrete template", () => {
  assert.equal(hasDecidedTemplateSelection({
    intent: "ai_selected_template",
    templateId: "fashion-drop-pro",
  }), true);
});

test("keeps the existing manual visual selection behavior", () => {
  assert.equal(hasDecidedTemplateSelection({
    intent: "client_visual_template_choice",
    templateId: "mega-retail-store",
  }), true);
});
