import assert from "node:assert/strict";
import test from "node:test";

import {
  adminCapabilities,
  dashboardStats,
  flattenClientProjects,
  templatePreviewUrl,
  templateProfilePayload,
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

test("template gallery uses a real renderer preview and validates editable metadata", () => {
  assert.equal(
    templatePreviewUrl({ templateId: "premium-product-store" }),
    "/templates-preview/live-preview.html?template=premium-product-store",
  );
  assert.deepEqual(templateProfilePayload({
    name: "Premium Product Editorial",
    audience: "Focused product brands",
    previewUrl: "/templates-preview/live-preview.html?template=premium-product-store",
    replacementTemplateId: "mega-retail-store",
    reason: "Visual refresh",
  }), {
    name: "Premium Product Editorial",
    audience: "Focused product brands",
    previewUrl: "/templates-preview/live-preview.html?template=premium-product-store",
    replacementTemplateId: "mega-retail-store",
    reason: "Visual refresh",
  });
  assert.throws(() => templateProfilePayload({
    name: "Premium",
    audience: "Brands",
    previewUrl: "javascript:alert(1)",
    reason: "Unsafe",
  }), /HTTPS/);
});

test("the legacy KREATON module retains its real management contracts", async () => {
  const { readFile } = await import("node:fs/promises");
  const html = await readFile(new URL("../admin/index.html", import.meta.url), "utf8");
  const script = await readFile(new URL("../admin/kreaton-admin.js", import.meta.url), "utf8");
  assert.match(html, /VM Operations/);
  assert.doesNotMatch(html, /url=\/admin\.html/);
  for (const endpoint of ["/api/admin/clients", "/api/admin/templates", "/api/admin/audit"]) {
    assert.ok(script.includes(endpoint), endpoint);
  }
  assert.match(script, /api\/admin\/clients/);
  assert.match(script, /api\/admin\/templates\/\$\{encodeURIComponent\(data\.templateId\)\}\/profile/);
  assert.match(script, /template-visual/);
  assert.match(script, /from "\.\/kreaton-admin-policy\.js\?v=2"/);
  assert.match(script, /internalAuthHeaders\(sessionStorage/);
  assert.match(script, /clearInternalAccessToken\(sessionStorage\)/);
  assert.match(html, /operations\/operations\.js\?v=3/);
  assert.match(html, /data-view="templates"/);
  assert.match(html, /data-view="payments"/);
});

test("every internal entry point routes to the real KREATON admin", async () => {
  const { readFile } = await import("node:fs/promises");
  const landing = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const legacyAdmin = await readFile(new URL("../admin.html", import.meta.url), "utf8");
  assert.match(landing, /href="\/admin\/"/);
  assert.doesNotMatch(landing, /href="admin\.html"/);
  assert.match(legacyAdmin, /window\.location\.replace\("\/admin\/"\)/);
  assert.match(legacyAdmin, /http-equiv="refresh" content="0;url=\/admin\/"/);
});
