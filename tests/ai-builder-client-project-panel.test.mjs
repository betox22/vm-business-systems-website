import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("project hub fills the viewport and presents resilient preview states", async () => {
  const [css, auth, viewer] = await Promise.all([
    readFile(new URL("ai-builder.css", root), "utf8"),
    readFile(new URL("src/ai-builder/auth.js", root), "utf8"),
    readFile(new URL("site-viewer.js", root), "utf8"),
  ]);

  assert.match(css, /\.client-projects-card\s*\{[^}]*height:\s*100dvh;/s);
  assert.match(css, /\.client-projects-panel\s*\{[^}]*padding:\s*0;/s);
  assert.match(css, /client-project-preview-spin/);
  assert.match(css, /client-new-project-prompt/);
  assert.match(auth, /data-client-project-preview-frame/);
  assert.match(auth, /client-new-project-prompts/);
  assert.match(viewer, /notifyProjectCardPreview\("ready"\)/);
  assert.match(viewer, /notifyProjectCardPreview\("error"\)/);
});
