import assert from "node:assert/strict";
import test from "node:test";

import {
  readScopedGuidedDraft,
  scopedGuidedDraftKey,
  writeScopedGuidedDraft,
} from "../src/ai-builder/guided-draft-storage-policy.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test("two accounts in the same browser never restore each other's guided draft", () => {
  const storage = memoryStorage();
  const baseKey = "lumaGuidedDraft";
  writeScopedGuidedDraft(storage, baseKey, "first@example.com", {
    guidedState: { businessName: "First Business" },
  });

  assert.equal(readScopedGuidedDraft(storage, baseKey, "second@example.com"), null);
  assert.equal(readScopedGuidedDraft(storage, baseKey, ""), null);
  assert.equal(
    readScopedGuidedDraft(storage, baseKey, "FIRST@example.com")?.guidedState?.businessName,
    "First Business",
  );
  assert.notEqual(
    scopedGuidedDraftKey(baseKey, "first@example.com"),
    scopedGuidedDraftKey(baseKey, "second@example.com"),
  );
});

test("an unowned legacy browser-wide draft is never restored for an authenticated account", () => {
  const storage = memoryStorage();
  storage.setItem("lumaGuidedDraft", JSON.stringify({ guidedState: { businessName: "Leaked Draft" } }));
  assert.equal(readScopedGuidedDraft(storage, "lumaGuidedDraft", "new@example.com"), null);
});
