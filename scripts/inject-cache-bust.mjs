// Rewrites the `ai-builder.js?v=NNN` and `ai-builder.css?v=NNN` cache-busting
// query strings in every staged HTML file to a value derived from the current
// commit, so every deploy gets URLs Cloudflare/GitHub Pages/the browser have
// never seen before.
//
// Root cause this fixes (found 2026-08-10): `?v=162` was a hand-maintained
// number baked directly into ai-builder.html and client/setup/index.html.
// Nothing bumped it automatically, so most frontend deploys reused the same
// `ai-builder.js?v=162` URL as the previous deploy. Cloudflare's edge cache
// (and GitHub Pages' own Fastly cache) key on the full URL including the
// query string, so they kept serving the byte-for-byte old ai-builder.js
// under that URL for a while after every push -- the origin had the fix,
// `fetch('/ai-builder.js')` with no query string proved it, but the actual
// <script src="/ai-builder.js?v=162"> tag the page loads kept resolving to
// a stale cached copy. This produced hours of "the fix is deployed but the
// live site still shows the bug" confusion across multiple unrelated fixes
// that day, not just one.
//
// This script runs after `cp dist/ai-builder.js public-dist/ai-builder.js`
// in .github/workflows/pages.yml, so it only touches the staged copy -- the
// committed source files keep their placeholder value untouched.

import { readFile, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";

const OUT_DIR = "public-dist";
const TARGET_FILES = ["ai-builder.html", "client/setup/index.html"];

function resolveCacheBustValue() {
  try {
    const sha = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
    if (sha) return sha;
  } catch {
    // Fall through to timestamp if git isn't available (e.g. shallow checkout edge case).
  }
  return String(Date.now());
}

const cacheBust = resolveCacheBustValue();
const assets = ["ai-builder.js", "ai-builder.css"];

for (const relativePath of TARGET_FILES) {
  const filePath = `${OUT_DIR}/${relativePath}`;
  let contents;
  try {
    contents = await readFile(filePath, "utf8");
  } catch (error) {
    console.warn(`[inject-cache-bust] skipping ${filePath}: ${error.message}`);
    continue;
  }
  let next = contents;
  const updatedAssets = [];
  for (const asset of assets) {
    const pattern = new RegExp(`${asset.replace(".", "\\.")}\\?v=[^"'\\s]+`, "g");
    const updated = next.replace(pattern, `${asset}?v=${cacheBust}`);
    if (updated !== next) updatedAssets.push(asset);
    next = updated;
  }
  if (next !== contents) {
    await writeFile(filePath, next, "utf8");
    console.log(
      `[inject-cache-bust] ${filePath} -> ${updatedAssets
        .map((asset) => `${asset}?v=${cacheBust}`)
        .join(", ")}`,
    );
  } else {
    console.warn(`[inject-cache-bust] no versioned ai-builder asset found in ${filePath}`);
  }
}
