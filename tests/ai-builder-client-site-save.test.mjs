import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const indexSource = readFileSync(new URL("../src/ai-builder/index.js", import.meta.url), "utf8");
const chatSource = readFileSync(new URL("../src/ai-builder/chat.js", import.meta.url), "utf8");

test("owner edits persist through the authenticated client site endpoint", () => {
  assert.match(indexSource, /\/api\/client\/sites\/\$\{encodeURIComponent\(payload\.siteId\)\}/);
  assert.match(indexSource, /method:\s*"PUT"/);
  assert.match(indexSource, /headers:\s*clientAuthHeaders/);
  assert.match(indexSource, /return persistGeneratedSiteForClient\(result\)/);
});

test("inline edits and LYRA surgical edits both use the persistent save path", () => {
  const finishInlineEdit = indexSource.match(/function finishInlineEdit\(commit\)[\s\S]*?\n\}/)?.[0] || "";
  assert.match(finishInlineEdit, /saveGeneratedSite\(/);

  const surgicalSaveCalls = chatSource.match(/await saveGeneratedSite\(/g) || [];
  assert.equal(surgicalSaveCalls.length, 2);
});
