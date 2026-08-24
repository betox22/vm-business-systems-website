import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../operations/index.html", import.meta.url), "utf8");
const js = readFileSync(new URL("../operations/operations.js", import.meta.url), "utf8");

test("VM Operations exposes the complete real operations navigation", () => {
  for (const view of ["overview", "requests", "businesses", "clients", "orders", "sites", "products", "payments", "templates", "audit", "config"]) {
    assert.match(html, new RegExp(`data-view="${view}"`));
  }
});

test("the general admin integrates the real visual template management tools", () => {
  assert.match(js, /templatePreviewUrl/);
  assert.match(js, /templateProfilePayload/);
  assert.match(js, /templateUpdatePayload/);
  assert.match(js, /data-template-toggle/);
  assert.match(js, /data-edit-template/);
});

test("VM Operations does not ship the legacy fake customer records", () => {
  for (const fake of ["Dulce Aurora", "Luna Market", "Nova Tech", "REQ-2041"]) {
    assert.equal(html.includes(fake) || js.includes(fake), false);
  }
  assert.match(js, /No mostramos registros de demostración/);
});

test("Listo remains an external isolated product", () => {
  assert.match(js, /https:\/\/listo\.vmbusinesssystems\.com\/admin\//);
  assert.match(js, /Administración aislada/);
  assert.match(html, /class="product-nav-link"[^>]+href="https:\/\/listo\.vmbusinesssystems\.com\/admin\/"/);
  assert.match(html, /Administrar Listo/);
  assert.match(html, /target="_blank" rel="noopener noreferrer"/);
});

test("Google login keeps the recognizable provider identity", () => {
  assert.match(html, /id="googleLoginButton"[^>]*class="google-button"/);
  assert.match(html, /class="google-mark"/);
  for (const color of ["#4285F4", "#34A853", "#FBBC05", "#EA4335"]) {
    assert.match(html, new RegExp(color));
  }
});

test("Google session can continue with a bearer token when the cross-site cookie is blocked", () => {
  assert.match(js, /internalAuthHeaders\(sessionStorage/);
  assert.match(js, /captureInternalAuthRedirect\(location,sessionStorage\)/);
  assert.match(js, /clearInternalAccessToken\(sessionStorage\)/);
  assert.match(html, /operations\.js\?v=3/);
});

test("/admin uses the same general operations shell instead of the four-view legacy panel", async () => {
  const { readFile } = await import("node:fs/promises");
  const adminHtml = await readFile(new URL("../admin/index.html", import.meta.url), "utf8");
  assert.match(adminHtml, /VM Operations/);
  assert.match(adminHtml, /data-view="payments"/);
  assert.match(adminHtml, /data-view="templates"/);
  assert.match(adminHtml, /operations\/operations\.js\?v=3/);
  assert.match(adminHtml, /operations\/operations\.css\?v=3/);
  assert.match(adminHtml, /Administrar Listo/);
  assert.match(adminHtml, /class="google-mark"/);
});
