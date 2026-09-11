import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { renderMarkdown } from "../scripts/build-legal-pages.mjs";

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
const count = (value, pattern) => [...value.matchAll(pattern)].length;

function markdownBulletGroups(markdown) {
  const blocks = markdown.replaceAll("\r\n", "\n").trim().split(/\n\s*\n/);
  let groups = 0;
  let inList = false;
  for (const block of blocks) {
    const isBullet = block.trimStart().startsWith("- ");
    if (isBullet && !inList) groups += 1;
    inList = isBullet;
  }
  return groups;
}

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

    const headingCount = count(article, /<h[23] id="[^"]+">/g);
    const toc = html.match(/<nav class="legal-toc"[\s\S]*?<\/nav>/)?.[0] || "";
    assert.equal(count(toc, /<li(?: class="is-subsection")?><a href="#section-/g), headingCount);

    const topLevelNumbers = [...article.matchAll(/<h2 id="[^"]+">(\d+)\./g)].map((match) => Number(match[1]));
    assert.deepEqual(topLevelNumbers, Array.from({ length: topLevelNumbers.length }, (_, index) => index + 1));

    const markdownBullets = count(markdown, /^\s*-\s+/gm);
    assert.equal(count(article, /<li>/g), markdownBullets);
    assert.equal(count(article, /<ul>/g), markdownBulletGroups(markdown));
  });
}

test("wrapped headings and bullet continuations remain single semantic blocks", () => {
  const wrapped = `**1. A Heading That Wraps Across\nMultiple Physical Lines**\n\n- A bullet that wraps after the first\n  physical line and remains complete.\n\n- A second wrapped bullet\n  also remains complete.\n\n**2. Final Section**`;
  const { body, sections } = renderMarkdown(wrapped);
  assert.equal(sections.length, 2);
  assert.match(body, /<h2[^>]*>1\. A Heading That Wraps Across Multiple Physical Lines<\/h2>/);
  assert.match(body, /<ul><li>A bullet that wraps after the first physical line and remains complete\.<\/li><li>A second wrapped bullet also remains complete\.<\/li><\/ul>/);
  assert.equal(count(body, /<li>/g), 2);
  assert.equal(count(body, /<ul>/g), 1);
});

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
