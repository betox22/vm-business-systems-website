// Stages only the public static-site files into public-dist/ for Render's
// (and GitHub Pages') static site build. This repo mixes public frontend
// assets (index.html, client/, ai-builder.js, etc.) at the top level with
// things that must never be served over HTTP: the Python backend source
// (backend/), internal docs (project-rebuild-kit/, docs/, KREATON-ROADMAP.md),
// dev/test artifacts (output/, template-test/, .codex_tmp*), raw source not
// meant for direct publishing (src/, _source/, scripts/), and -- discovered
// 2026-08-10 -- an entire internal architecture/planning tree nested inside
// templates/ (Laravel backend snippets, DB schemas, "security-controls.json"
// files, checkout/auth implementation notes) sitting right next to the one
// JSON file in that same directory that actually needs to be public.
//
// Allowlist, not blocklist: earlier versions of this script (and the
// Dockerfile it replaced) worked by exclusion -- copy everything except a
// list of known-private entries. That is the same failure mode that let
// backend/app/main.py and supabase/enable_rls.sql get published on
// vmbusinesssystems.com before the 2026-07-27 fix, and it is exactly what
// let templates/marketplace/mega-marketplace/contracts/security-controls.json
// and dozens of other internal planning files sit publicly reachable this
// whole time: nobody added "templates" to a denylist because *part* of that
// directory genuinely is public. An allowlist has the opposite failure mode,
// which is the one you want here -- a new top-level file or folder added in
// the future is private by default until someone deliberately publishes it.
//
// PUBLIC_TOP_LEVEL_FILES / PUBLIC_TOP_LEVEL_DIRECTORIES below are copied
// wholesale. TEMPLATES_ALLOWLIST is a hand-picked list of exact paths inside
// templates/ (verified against what ai-builder.js, template-router.js, and
// each template.manifest.json's own relative runtime/reference paths
// actually fetch) -- everything else under templates/ (README/architecture
// docs, phase-1..4 backend implementation notes, security-controls.json,
// QA screenshots, unused manifests) stays out.

import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const OUT_DIR = "public-dist";

const PUBLIC_TOP_LEVEL_FILES = [
  "CNAME",
  "admin.css",
  "admin.html",
  "admin.js",
  "ai-builder.css",
  "ai-builder.html",
  "ai-builder.js",
  "client-portal-preview.html",
  "client-portal.html",
  "client-setup.css",
  "client-start.js",
  "client.css",
  "contact.html",
  "index.html",
  "luma-config.js",
  "plans.html",
  "seller-portal.css",
  "seller-portal.js",
  "services.html",
  "site-viewer.js",
  "site.html",
  "solutions.html",
  "template-router.js",
];

// Copied recursively, in full.
const PUBLIC_TOP_LEVEL_DIRECTORIES = [
  "admin",
  "assets",
  "client",
  "css",
  "images",
  "js",
  "public",
  "start",
  "templates-preview",
];

// Exact paths only -- verified 2026-08-10 against every static reference to
// "/templates/..." in ai-builder.js, src/ai-builder/templates.js and
// template-router.js, plus each manifest's own relative runtime/reference
// paths (previewPath/stylePath/scriptPath, commerceCapabilitiesRef,
// backendContractPath). If a future template needs its own manifest/preview
// published, add its exact paths here -- do not allowlist "templates/" itself.
const TEMPLATES_ALLOWLIST = [
  "templates/all-templates.json",
  "templates/commerce-capabilities.json",
  "templates/marketplace/mega-marketplace/template.manifest.json",
  "templates/marketplace/mega-marketplace/phase-5/visual-prototype/preview.html",
  "templates/marketplace/mega-marketplace/phase-5/visual-prototype/styles.css",
  "templates/marketplace/mega-marketplace/phase-5/visual-prototype/prototype.js",
  "templates/retail/mega-retail-store/template.manifest.json",
  "templates/retail/mega-retail-store/phase-5/visual-prototype/preview.html",
  "templates/retail/mega-retail-store/phase-5/visual-prototype/styles.css",
  "templates/retail/mega-retail-store/phase-5/visual-prototype/prototype.js",
  "templates/retail/premium-product-store/template.manifest.json",
  "templates/retail/premium-product-store/contracts/commerce-integration.json",
  "templates/retail/premium-product-store/phase-5/visual-prototype/preview.html",
  "templates/retail/premium-product-store/phase-5/visual-prototype/styles.css",
  "templates/retail/premium-product-store/phase-5/visual-prototype/prototype.js",
];

// Defense in depth: even within the allowlisted set above, refuse to stage
// anything with an extension that has no business being served statically.
const FORBIDDEN_EXTENSIONS = new Set([
  ".py", ".env", ".key", ".pem", ".sql", ".php", ".ts", ".sh",
]);

async function main() {
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  const copied = [];
  const missing = [];

  for (const file of PUBLIC_TOP_LEVEL_FILES) {
    if (!existsSync(file)) {
      missing.push(file);
      continue;
    }
    await cp(file, `${OUT_DIR}/${file}`);
    copied.push(file);
  }

  for (const dir of PUBLIC_TOP_LEVEL_DIRECTORIES) {
    if (!existsSync(dir)) {
      missing.push(dir);
      continue;
    }
    await cp(dir, `${OUT_DIR}/${dir}`, { recursive: true });
    copied.push(`${dir}/`);
  }

  for (const relPath of TEMPLATES_ALLOWLIST) {
    const ext = path.extname(relPath);
    if (FORBIDDEN_EXTENSIONS.has(ext)) {
      throw new Error(
        `Refusing to stage "${relPath}": extension "${ext}" is not allowed in the public build, ` +
        `even though it's in TEMPLATES_ALLOWLIST. Remove it from the allowlist or fix the entry.`
      );
    }
    if (!existsSync(relPath)) {
      missing.push(relPath);
      continue;
    }
    const dest = `${OUT_DIR}/${relPath}`;
    await mkdir(path.dirname(dest), { recursive: true });
    await cp(relPath, dest);
    copied.push(relPath);
  }

  console.log(`Staged ${copied.length} public entries into ${OUT_DIR}/:`);
  console.log(copied.sort().join(", "));

  if (missing.length) {
    // Not fatal -- an allowlisted entry that no longer exists just means the
    // repo moved on (renamed/removed file) and the allowlist above needs a
    // matching update. Surfaced loudly so it doesn't go unnoticed, but a
    // strict repo layout that shouldn't fail the build over.
    console.warn(`Warning: ${missing.length} allowlisted entries were not found and were skipped:`);
    console.warn(missing.sort().join(", "));
  }
}

main().catch((error) => {
  console.error("stage-public-site failed:", error);
  process.exit(1);
});
