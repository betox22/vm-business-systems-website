import assert from "node:assert/strict";
import test from "node:test";

import {
  captureInternalAuthRedirect,
  clearInternalAccessToken,
  internalAccessToken,
  internalAuthHeaders,
} from "../admin/internal-session-policy.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.get(key) || null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

test("Google callback token survives blocked cross-site cookies in the current tab", () => {
  const storage = memoryStorage();
  const result = captureInternalAuthRedirect(
    { hash: "#access_token=supabase-token&type=oauth" },
    storage,
  );

  assert.equal(result.token, "supabase-token");
  assert.equal(internalAccessToken(storage), "supabase-token");
  assert.deepEqual(internalAuthHeaders(storage, { Accept: "application/json" }), {
    Accept: "application/json",
    Authorization: "Bearer supabase-token",
  });
});

test("OAuth errors remain visible and logout removes the tab credential", () => {
  const storage = memoryStorage();
  storage.setItem("vmInternalAdminAccessToken", "supabase-token");

  const result = captureInternalAuthRedirect(
    { hash: "#error=access_denied&error_description=Access+denied" },
    storage,
  );
  assert.equal(result.error, "Access denied");

  clearInternalAccessToken(storage);
  assert.equal(internalAccessToken(storage), "");
  assert.deepEqual(internalAuthHeaders(storage), {});
});
