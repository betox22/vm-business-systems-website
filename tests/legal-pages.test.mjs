import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pairs = [
  ["terms-of-service.md", "terms-of-service.html"],
  ["terminos-de-servicio.md", "terminos-de-servicio.html"],
  ["privacy-policy.md", "privacy-policy.html"],
  ["politica-de-privacidad.md", "politica-de-privacidad.html"],
  ["disclaimers.md", "disclaimers.html"],
  ["descargos-de-responsabilidad.md", "descargos-de-responsabilidad.html"],
];

const normalize = (value) => value.replace(/\*\*/g, "").replace(/\*/g, "").replace(/^\s*-\s+/gm, "").replace(/\s+/g, " ").trim();
const decode = (value) => value.replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"');

for (const [markdownName, htmlName] of pairs) {
  test(`${htmlName} preserves the complete legal source text`, async () => {
    const markdown = await readFile(`docs/legal/${markdownName}`, "utf8");
    const html = await readFile(htmlName, "utf8");
    const article = html.match(/<article class="legal-document">([\s\S]*?)<\/article>/)?.[1] || "";
    const renderedText = decode(article.replace(/<[^>]+>/g, " "));
    assert.equal(normalize(renderedText), normalize(markdown));
    assert.match(html, /rel="alternate" hreflang="en"/);
    assert.match(html, /rel="alternate" hreflang="es"/);
    assert.match(html, /class="legal-notice"/);
  });
}

test("every published application surface loads the shared legal footer", async () => {
  const pages = [
    "index.html", "services.html", "solutions.html", "plans.html", "contact.html",
    "access.html", "client-portal.html", "client-portal-preview.html", "landing.html",
    "ai-builder.html", "site.html", "admin.html", "admin/index.html",
    "admin/builder/index.html", "operations/index.html", "client/setup/index.html",
    "client/portal/index.html", "start/index.html",
  ];
  for (const page of pages) {
    assert.match(await readFile(page, "utf8"), /\/js\/legal-footer\.js/, page);
  }
});
