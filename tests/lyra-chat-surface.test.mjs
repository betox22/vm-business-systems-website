import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("pre-generation LYRA conversation is isolated from the preview and project library", async () => {
  const [css, panelCss, auth, html] = await Promise.all([
    readFile(new URL("client-setup.css", root), "utf8"),
    readFile(new URL("ai-builder.css", root), "utf8"),
    readFile(new URL("src/ai-builder/auth.js", root), "utf8"),
    readFile(new URL("client/setup/index.html", root), "utf8"),
  ]);

  const conversationRules = css.slice(css.indexOf("/* The pre-generation conversation is one workspace"));
  assert.ok(conversationRules.length > 0);
  assert.match(conversationRules, /\.guided-progress,[\s\S]*\.guided-live-stage,[\s\S]*\.summary-panel\s*\{\s*display:\s*none\s*!important/);
  assert.match(conversationRules, /\.guided-layout\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\)\s*!important/);
  assert.match(conversationRules, /\.guided-chat-card\s*\{[\s\S]*?height:\s*100%\s*!important/);
  assert.match(conversationRules, /\.guided-panel\.active\s*\{\s*background:\s*#f5f7fa/);
  assert.match(auth, /document\.body\.appendChild\(builderState\.clientProjectsPanel\)/);
  assert.match(auth, /clientProjectsButton\.addEventListener\("click", openClientProjectsPanel\)/);
  assert.match(panelCss, /\.client-projects-panel\s*\{\s*position:\s*fixed/);
  assert.doesNotMatch(panelCss, /\.client-projects-panel\.is-docked/);
  assert.doesNotMatch(auth, /guided-layout--docked-panel|clientProjectsPanel\.classList\.add\("is-docked"\)/);
  assert.match(html, /id="clientProjectsButton"|id="guidedPanel"/);
});
