import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  CLIENT_AUTH_VALIDATION_ATTEMPTS,
  CLIENT_AUTH_VALIDATION_TIMEOUT_MS,
  canDismissClientAuthGate,
  shouldRetryClientAuthValidation,
  visibleClientAccountEmail,
} from "../src/ai-builder/client-auth-validation-policy.js";

test("pending or rejected auth never exposes a cached account identity", () => {
  assert.equal(visibleClientAccountEmail("unknown", "owner@example.com"), "");
  assert.equal(visibleClientAccountEmail("validating", "owner@example.com"), "");
  assert.equal(visibleClientAccountEmail("rejected", "owner@example.com"), "");
  assert.equal(visibleClientAccountEmail("authenticated", "owner@example.com"), "owner@example.com");
});

test("the protected gate cannot be dismissed before authentication resolves", () => {
  assert.equal(canDismissClientAuthGate({ status: "validating" }), false);
  assert.equal(canDismissClientAuthGate({ status: "rejected" }), false);
  assert.equal(canDismissClientAuthGate({ status: "authenticated" }), true);
  assert.equal(canDismissClientAuthGate({ status: "demo", hasPreviewSession: true }), true);
});

test("OAuth resume validates with a deadline before restoring pending project content", () => {
  const source = readFileSync(new URL("../src/ai-builder/auth.js", import.meta.url), "utf8");
  const css = readFileSync(new URL("../ai-builder.css", import.meta.url), "utf8");
  const fetchUser = source.slice(
    source.indexOf("export async function fetchClientAuthUser"),
    source.indexOf("export async function fetchClientProjects"),
  );
  const captureRedirect = source.slice(
    source.indexOf("export function captureStudioAuthRedirect"),
    source.indexOf("export function restorePendingStudioAfterAuth"),
  );
  const resume = source.slice(
    source.indexOf("export async function resumeClientSessionFromAuthToken"),
    source.indexOf("export function hydrateClientIntakeSession"),
  );

  assert.equal(CLIENT_AUTH_VALIDATION_TIMEOUT_MS, 20000);
  assert.equal(CLIENT_AUTH_VALIDATION_ATTEMPTS, 2);
  assert.match(fetchUser, /fetchWithTimeout\(CLIENT_AUTH_ME_URL/);
  assert.match(fetchUser, /CLIENT_AUTH_VALIDATION_TIMEOUT_MS/);
  assert.match(fetchUser, /shouldRetryClientAuthValidation/);
  assert.doesNotMatch(captureRedirect, /restorePendingStudioAfterAuth\(\)/);
  assert.doesNotMatch(captureRedirect, /markClientWorkspaceUnlocked\(\)/);
  assert.ok(
    resume.indexOf('builderState.clientAuthStatus = "authenticated"')
      < resume.indexOf("restorePendingStudioAfterAuth()"),
  );
  assert.match(css, /#studioAuthCloseButton\[hidden\]\s*\{\s*display:\s*none\s*!important;/);
});

test("auth validation retries transient backend failures but never retries a rejected token", () => {
  assert.equal(shouldRetryClientAuthValidation({ attempt: 1, status: 0 }), true);
  assert.equal(shouldRetryClientAuthValidation({ attempt: 1, status: 503 }), true);
  assert.equal(shouldRetryClientAuthValidation({ attempt: 1, status: 401 }), false);
  assert.equal(shouldRetryClientAuthValidation({ attempt: 2, status: 503 }), false);
});

test("client intake autosave cannot run while auth is pending or rejected", () => {
  const source = readFileSync(new URL("../src/ai-builder/auth.js", import.meta.url), "utf8");
  const autosave = source.slice(
    source.indexOf("export function syncClientIntakeSession"),
    source.indexOf("export function startNewClientProject"),
  );

  assert.match(autosave, /builderState\.clientAuthStatus !== "authenticated"/);
});

test("startup never hydrates a cached project without a persisted access token", () => {
  const source = readFileSync(new URL("../src/ai-builder/auth.js", import.meta.url), "utf8");
  const startup = source.slice(
    source.indexOf("export function initClientIntakeSessionGate"),
    source.indexOf("export function isClientWorkspaceUnlocked"),
  );

  assert.doesNotMatch(startup, /hydrateClientIntakeSession\(/);
  assert.match(startup, /clearClientWorkspaceUnlock\(\)/);
  assert.match(startup, /openStudioAuthGate\("start"\)/);
  assert.match(startup, /studioAuthEmail\.value = ""/);
});
