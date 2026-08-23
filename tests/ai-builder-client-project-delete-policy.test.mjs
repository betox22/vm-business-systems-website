import assert from "node:assert/strict";
import test from "node:test";

import {
  clientProjectDeletePayload,
  removeClientProject,
  unfinishedClientProject,
} from "../src/ai-builder/client-project-delete-policy.js";

test("delete payload uses the real project id and business name", () => {
  assert.deepEqual(
    clientProjectDeletePayload({ id: "site_1", business_name: "Bath All Day" }),
    { projectId: "site_1", businessName: "Bath All Day" },
  );
  assert.equal(clientProjectDeletePayload({ id: "site_1" }), null);
});

test("deleting a project immediately removes only that card", () => {
  const projects = [{ id: "site_1" }, { id: "site_2" }, { id: "site_3" }];
  assert.deepEqual(removeClientProject(projects, "site_2"), [{ id: "site_1" }, { id: "site_3" }]);
});

test("unfinished project banner prefers an explicit project then the newest draft", () => {
  const projects = [
    { id: "published", status: "published" },
    { id: "draft", status: "draft" },
  ];
  assert.equal(unfinishedClientProject(projects)?.id, "draft");
  assert.equal(unfinishedClientProject(projects, projects[0])?.id, "published");
});
