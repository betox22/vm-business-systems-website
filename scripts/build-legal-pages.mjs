import { readFile, writeFile } from "node:fs/promises";

const documents = [
  ["terms-of-service.md", "terms-of-service.html", "terminos-de-servicio.html", "en"],
  ["terminos-de-servicio.md", "terminos-de-servicio.html", "terms-of-service.html", "es"],
  ["privacy-policy.md", "privacy-policy.html", "politica-de-privacidad.html", "en"],
  ["politica-de-privacidad.md", "politica-de-privacidad.html", "privacy-policy.html", "es"],
  ["disclaimers.md", "disclaimers.html", "descargos-de-responsabilidad.html", "en"],
  ["descargos-de-responsabilidad.md", "descargos-de-responsabilidad.html", "disclaimers.html", "es"],
];

const escapeHtml = (value) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const inline = (value) => escapeHtml(value)
  .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  .replace(/\*(.+?)\*/g, "<em>$1</em>");

const slug = (value) => value.toLowerCase().normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function renderMarkdown(source) {
  const lines = source.replaceAll("\r\n", "\n").split("\n");
  const sections = [];
  const blocks = [];
  let paragraph = [];
  let list = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const text = paragraph.join(" ");
    const notice = /IMPORTANT NOTICE|AVISO IMPORTANTE/.test(text);
    blocks.push(`<p${notice ? ' class="legal-notice-title"' : ""}>${inline(text)}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (!list.length) return;
    blocks.push(`<ul>${list.map((item) => `<li>${inline(item)}</li>`).join("")}</ul>`);
    list = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushParagraph(); flushList(); continue; }
    const heading = line.match(/^\*\*(\d+(?:\.\d+)*\.?\s+.+)\*\*$/);
    if (heading) {
      flushParagraph(); flushList();
      const id = `section-${slug(heading[1])}`;
      const level = heading[1].match(/^\d+\.\d+/) ? 3 : 2;
      if (level === 2) sections.push({ id, label: heading[1] });
      blocks.push(`<h${level} id="${id}">${inline(heading[1])}</h${level}>`);
      continue;
    }
    if (line.startsWith("- ")) { flushParagraph(); list.push(line.slice(2)); continue; }
    flushList();
    paragraph.push(line);
  }
  flushParagraph(); flushList();

  const noticeIndex = blocks.findIndex((block) => block.includes("legal-notice-title"));
  if (noticeIndex >= 0) {
    blocks.splice(noticeIndex, 1, `<aside class="legal-notice">${blocks[noticeIndex]}</aside>`);
  }
  return { body: blocks.join("\n"), sections };
}

for (const [sourceName, outputName, alternateName, language] of documents) {
  const source = await readFile(`docs/legal/${sourceName}`, "utf8");
  const { body, sections } = renderMarkdown(source);
  const isEnglish = language === "en";
  const title = source.match(/^\*\*(.+?)\*\*/m)?.[1] || (isEnglish ? "Legal document" : "Documento legal");
  const toc = sections.map(({ id, label }) => `<li><a href="#${id}">${inline(label)}</a></li>`).join("");
  const html = `<!doctype html>
<html lang="${language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} | V&amp;M Business Systems</title>
  <meta name="description" content="${escapeHtml(title)} — V&M Business Systems">
  <link rel="alternate" hreflang="${language}" href="/${outputName}">
  <link rel="alternate" hreflang="${isEnglish ? "es" : "en"}" href="/${alternateName}">
  <link rel="stylesheet" href="/css/legal-pages.css">
</head>
<body>
  <header class="legal-header"><a href="/" class="legal-brand" aria-label="V&M Business Systems home"><span>VM</span> V&amp;M Business Systems</a><nav aria-label="${isEnglish ? "Language" : "Idioma"}"><a ${isEnglish ? 'aria-current="page"' : ""} href="/${isEnglish ? outputName : alternateName}">English</a><span aria-hidden="true">/</span><a ${!isEnglish ? 'aria-current="page"' : ""} href="/${isEnglish ? alternateName : outputName}">Español</a></nav></header>
  <main class="legal-layout">
    <nav class="legal-toc" aria-label="${isEnglish ? "Table of contents" : "Tabla de contenidos"}"><strong>${isEnglish ? "Table of contents" : "Tabla de contenidos"}</strong><ol>${toc}</ol></nav>
    <article class="legal-document">${body}</article>
  </main>
  <footer class="legal-footer"><span>© 2026 V&amp;M Business Systems</span><nav><a href="/${isEnglish ? "terms-of-service.html" : "terminos-de-servicio.html"}">${isEnglish ? "Terms of Service" : "Términos de Servicio"}</a><a href="/${isEnglish ? "privacy-policy.html" : "politica-de-privacidad.html"}">${isEnglish ? "Privacy Policy" : "Política de Privacidad"}</a><a href="/${isEnglish ? "disclaimers.html" : "descargos-de-responsabilidad.html"}">${isEnglish ? "Disclaimers" : "Descargos de Responsabilidad"}</a></nav></footer>
</body>
</html>`;
  await writeFile(outputName, html, "utf8");
}
