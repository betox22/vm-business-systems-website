import assert from "node:assert/strict";
import test from "node:test";

import {
  CLIENT_PROJECT_PREVIEW_TIMEOUT_MS,
  clientProjectDomain,
  clientProjectPreviewPath,
  clientProjectStatusClass,
  clientProjectVisualHue,
  isClientProjectPreviewMessage,
} from "../src/ai-builder/client-project-card-policy.js";

test("caps project preview loading at seven seconds", () => {
  assert.equal(CLIENT_PROJECT_PREVIEW_TIMEOUT_MS, 7000);
});

test("builds a same-site real project preview URL", () => {
  assert.equal(clientProjectPreviewPath("site bath/all"), "/site.html?site_id=site%20bath%2Fall&embed=project-card");
  assert.equal(clientProjectPreviewPath(""), "");
});

test("accepts only the project-preview lifecycle messages used by the panel", () => {
  assert.equal(isClientProjectPreviewMessage({ type: "kreaton:project-preview", status: "ready" }), true);
  assert.equal(isClientProjectPreviewMessage({ type: "kreaton:project-preview", status: "error" }), true);
  assert.equal(isClientProjectPreviewMessage({ type: "kreaton:project-preview", status: "loading" }), false);
  assert.equal(isClientProjectPreviewMessage({ type: "other", status: "ready" }), false);
});

test("formats project status and domain without inventing links", () => {
  assert.equal(clientProjectStatusClass("published"), "is-published");
  assert.equal(clientProjectStatusClass("draft"), "is-draft");
  assert.equal(clientProjectStatusClass("unknown"), "is-draft");
  assert.equal(clientProjectDomain("https://bath-all-day.usekreaton.com/"), "bath-all-day.usekreaton.com");
  assert.equal(clientProjectDomain(""), "");
});

test("keeps the visual fallback stable per project", () => {
  const project = { id: "site-1", template_name: "Premium Product Store" };
  assert.equal(clientProjectVisualHue(project), clientProjectVisualHue(project));
  assert.ok(clientProjectVisualHue(project) >= 0 && clientProjectVisualHue(project) < 360);
});
