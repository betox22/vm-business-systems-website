import assert from "node:assert/strict";
import test from "node:test";

import {
  adminCapabilities,
  dashboardStats,
  flattenClientProjects,
  templateUpdatePayload,
} from "../admin/kreaton-admin-policy.js";

const clients = [
  {
    id: "client-1",
    email: "one@example.com",
    accountStatus: "active",
    projects: [
      { id: "site-1", status: "published", updatedAt: "2026-08-24T12:00:00Z" },
      { id: "site-2", status: "draft", updatedAt: "2026-08-23T12:00:00Z" },
    ],
  },
  { id: "client-2", email: "two@example.com", accountStatus: "unverified", projects: [] },
];

test("project rows retain their client owner and sort newest first", () => {
  const rows = flattenClientProjects(clients);
  assert.deepEqual(rows.map((row) => row.id), ["site-1", "site-2"]);
  assert.equal(rows[0].ownerEmail, "one@example.com");
});

test("numeric backend timestamps sort as seconds rather than 1970 milliseconds", () => {
  const rows = flattenClientProjects([{
    id: "client",
    email: "owner@example.com",
    projects: [
      { id: "older", updatedAt: 1780000000 },
      { id: "newer", updatedAt: 1781000000 },
    ],
  }]);
  assert.deepEqual(rows.map((row) => row.id), ["newer", "older"]);
});

test("support can inspect but destructive and template controls stay super-admin only", () => {
  const support = adminCapabilities({
    role: "support",
    permissions: ["clients:read", "sites:read", "templates:read", "audit:read"],
  });
  assert.equal(support.canReadClients, true);
  assert.equal(support.canReadAudit, true);
  assert.equal(support.canDeleteProjects, false);
  assert.equal(support.canManageTemplates, false);
  assert.equal(support.canReadTemplates, false);
});

test("dashboard summary uses real client, project, publication and template state", () => {
  assert.deepEqual(dashboardStats(clients, [{ enabled: true }, { enabled: false }]), {
    clients: 2,
    projects: 2,
    published: 1,
    disabledTemplates: 1,
  });
});

test("template availability changes require a human-readable reason", () => {
  assert.throws(() => templateUpdatePayload(false, "  "), /motivo/);
  assert.deepEqual(templateUpdatePayload(false, "Calidad visual en revisión"), {
    enabled: false,
    reason: "Calidad visual en revisión",
  });
});

test("the static admin shell targets only real stage endpoints", async () => {
  const { readFile } = await import("node:fs/promises");
  const html = await readFile(new URL("../admin/index.html", import.meta.url), "utf8");
  const script = await readFile(new URL("../admin/kreaton-admin.js", import.meta.url), "utf8");
  assert.match(html, /KREATON Operations/);
  assert.doesNotMatch(html, /url=\/admin\.html/);
  for (const endpoint of ["/api/admin/clients", "/api/admin/templates", "/api/admin/audit"]) {
    assert.ok(script.includes(endpoint), endpoint);
  }
  assert.match(script, /api\/admin\/clients/);
});
