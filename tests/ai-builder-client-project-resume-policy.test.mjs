import assert from "node:assert/strict";
import test from "node:test";

import {
  clientProjectEntryDecision,
  savedProjectName,
} from "../src/ai-builder/client-project-resume-policy.js";

test("asks before restoring the only saved project after authentication", () => {
  const project = {
    id: "site-mi-mundo-3d",
    business_name: "mi mundo 3d",
    template_name: "Mega Retail Store",
  };

  const decision = clientProjectEntryDecision({ projects: [project], hasCurrentSchema: false });

  assert.equal(decision.action, "confirm_resume");
  assert.equal(decision.project, project);
  assert.equal(savedProjectName(decision.project), "mi mundo 3d");
  assert.notEqual(decision.action, "hydrate_session");
});

test("hydrates an unfinished intake only when no generated project exists", () => {
  assert.deepEqual(
    clientProjectEntryDecision({ projects: [], hasCurrentSchema: false }),
    { action: "hydrate_session" },
  );
});

test("keeps an already-open workspace during a same-session auth refresh", () => {
  assert.deepEqual(
    clientProjectEntryDecision({
      projects: [{ id: "site-mi-mundo-3d" }],
      hasCurrentSchema: true,
    }),
    { action: "keep_current" },
  );
});
