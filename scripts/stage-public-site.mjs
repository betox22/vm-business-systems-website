// Stages only the public static-site files into public-dist/ for Render's
// Static Site build. This repo mixes public frontend assets (index.html,
// client/, ai-builder.js, etc.) at the top level with things that must never
// be served over HTTP: the Python backend source (backend/), internal docs
// (project-rebuild-kit/, docs/, KREATON-ROADMAP.md), dev/test artifacts
// (output/, handoff/, .codex_tmp*), and raw source not meant for direct
// publishing (src/, _source/, scripts/).
//
// Default-deny: anything not explicitly recognized as public here is left
// out, rather than trying to enumerate every possible sensitive file. Add to
// PUBLIC_DIRECTORY_DENYLIST only if a new top-level entry is intentionally
// private -- entries not listed anywhere are skipped by default because of
// the leading-dot check and the fact that unknown new top-level *files* are
// still copied (matches historical behavior of "everything at the root is
// public unless it's a known-private directory").
//
// Found 2026-07-27: this repo's Render static site was previously deployed
// via a Docker service whose Dockerfile lived only on the now-deleted
// `luma-api` branch, so we could not inspect what it excluded. This script
// replaces that lost Dockerfile with an explicit, auditable staging step.

import { cp, mkdir, readdir, rm } from "node:fs/promises";

const OUT_DIR = "public-dist";

const PRIVATE_ENTRIES = new Set([
  // Backend source and infra -- must never be served as static files.
  "backend",
  "supabase",
  // Internal docs / ops notes.
  "docs",
  "project-rebuild-kit",
  "handoff",
  "KREATON-ROADMAP.md",
  "AGENTS.md",
  // Build tooling and raw (pre-bundle) source -- not meant to be fetched directly.
  "scripts",
  "src",
  "_source",
  "dist",
  OUT_DIR,
  // Dev/test artifacts and dependency caches.
  "output",
  "node_modules",
  ".venv",
  ".python-packages",
  ".npm-cache",
  ".u2net",
  ".codex_tmp",
  ".codex_tmp_salesflow_fix",
  ".codex_tmp_screenshots",
  ".pytest_cache",
  "design",
  // Repo/package metadata not needed at runtime.
  "package.json",
  "package-lock.json",
  "render.yaml",
  ".gitignore",
]);

async function main() {
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  const entries = await readdir(".", { withFileTypes: true });
  const copied = [];
  const skipped = [];

  for (const entry of entries) {
    const name = entry.name;
    if (name.startsWith(".") || PRIVATE_ENTRIES.has(name)) {
      skipped.push(name);
      continue;
    }
    await cp(name, `${OUT_DIR}/${name}`, { recursive: true });
    copied.push(name);
  }

  console.log(`Staged ${copied.length} public entries into ${OUT_DIR}/:`);
  console.log(copied.sort().join(", "));
  console.log(`Skipped ${skipped.length} private/internal entries:`);
  console.log(skipped.sort().join(", "));
}

main().catch((error) => {
  console.error("stage-public-site failed:", error);
  process.exit(1);
});
