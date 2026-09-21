import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("authenticated home is separate from chat and keeps real project previews", async () => {
  const [css, setupCss, auth, index, viewer, worker] = await Promise.all([
    readFile(new URL("ai-builder.css", root), "utf8"),
    readFile(new URL("client-setup.css", root), "utf8"),
    readFile(new URL("src/ai-builder/auth.js", root), "utf8"),
    readFile(new URL("src/ai-builder/index.js", root), "utf8"),
    readFile(new URL("site-viewer.js", root), "utf8"),
    readFile(new URL("cloudflare/subdomain-proxy-worker.js", root), "utf8"),
  ]);

  assert.match(css, /\.client-projects-card\s*\{[^}]*height:\s*100dvh;/s);
  assert.match(setupCss, /\.client-projects-panel\.is-dashboard/);
  assert.match(setupCss, /client-dashboard-composer/);
  assert.match(setupCss, /client-dashboard-chat-title/);
  assert.match(auth, /client-dashboard-rotating-ideas/);
  assert.match(setupCss, /@keyframes lyra-card-enter/);
  assert.match(setupCss, /@keyframes lyra-message-enter/);
  assert.match(setupCss, /@keyframes lyra-idea-cycle/);
  assert.match(setupCss, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /client-project-preview-spin/);
  assert.match(auth, /data-client-project-preview-frame/);
  assert.match(auth, /document\.body\.appendChild\(builderState\.clientProjectsPanel\)/);
  assert.doesNotMatch(auth, /guidedLayoutHost\.insertBefore\(builderState\.clientProjectsPanel/);
  assert.match(auth, /lyra:dashboard-start/);
  assert.match(auth, /data-client-dashboard-idea/);
  assert.match(auth, /data-client-dashboard-resume/);
  assert.match(auth, /hydrateClientIntakeSession\(session, \{ silent: true \}\)/);
  assert.match(auth, /renderClientProjectsPanel\(\[\], \{ loadError: true \}\)/);
  assert.match(auth, /builderState\.authenticatedClientEmail/);
  assert.match(index, /await startNewClientProject\(\{ silentGreeting: true \}\)/);
  assert.match(index, /if \(session === false\) return/);
  assert.match(index, /if \(!session\)/);
  assert.match(index, /await handleGuidedSendAction\(\)/);
  assert.match(auth, /CLIENT_PROJECT_PREVIEW_TIMEOUT_MS/);
  assert.match(auth, /setClientProjectPreviewState\(iframe, "error"\)/);
  assert.match(viewer, /notifyProjectCardPreview\("ready"\)/);
  assert.match(viewer, /notifyProjectCardPreview\("error"\)/);
  assert.match(worker, /response\.headers\.delete\("X-Frame-Options"\)/);
  assert.match(worker, /frame-ancestors 'self' https:\/\/usekreaton\.com https:\/\/www\.usekreaton\.com/);
});
