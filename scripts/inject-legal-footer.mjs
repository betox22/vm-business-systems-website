import { readFile, writeFile } from "node:fs/promises";

const pages = [
  "index.html", "services.html", "solutions.html", "plans.html", "contact.html",
  "access.html", "client-portal.html", "client-portal-preview.html", "landing.html",
  "ai-builder.html", "site.html", "admin.html", "admin/index.html",
  "admin/builder/index.html", "operations/index.html", "client/setup/index.html",
  "client/portal/index.html", "start/index.html",
];
const tag = '  <script src="/js/legal-footer.js?v=1"></script>\n';
for (const page of pages) {
  let html = await readFile(page, "utf8");
  if (html.includes("/js/legal-footer.js")) continue;
  html = html.replace(/\s*<\/body>/i, `\n${tag}</body>`);
  await writeFile(page, html, "utf8");
}
