import assert from "node:assert/strict";
import test from "node:test";

import {
  clientProjectDomain,
  clientProjectPreviewPath,
  clientProjectStatusClass,
  clientProjectVisualHue,
} from "../src/ai-builder/client-project-card-policy.js";

test("builds a same-site real project preview URL", () => {
  assert.equal(clientProjectPreviewPath("site bath/all"), "/site.html?site_id=site%20bath%2Fall");
  assert.equal(clientProjectPreviewPath(""), "");
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
