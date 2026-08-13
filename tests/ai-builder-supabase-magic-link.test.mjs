import assert from "node:assert/strict";
import test from "node:test";

import {
  magicLinkFeedback,
  readSupabaseAuthRedirect,
  requestSupabaseMagicLink,
} from "../src/ai-builder/supabase-magic-link.js";

const projectUrl = "https://project.supabase.co";
const anonKey = "public-anon-key";

test("magic-link OTP request sends the expected Supabase contract", async () => {
  let capturedUrl = "";
  let capturedOptions = null;
  const result = await requestSupabaseMagicLink({
    email: "client@example.com",
    redirectTo: "https://usekreaton.com/client/setup/?draft=1",
    projectUrl,
    anonKey,
    fetchImpl: async (url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      return { ok: true, status: 200, json: async () => ({}) };
    },
  });

  assert.equal(capturedUrl, `${projectUrl}/auth/v1/otp`);
  assert.equal(capturedOptions.method, "POST");
  assert.deepEqual(capturedOptions.headers, {
    apikey: anonKey,
    "Content-Type": "application/json",
  });
  assert.deepEqual(JSON.parse(capturedOptions.body), {
    email: "client@example.com",
    options: {
      emailRedirectTo: "https://usekreaton.com/client/setup/?draft=1",
      shouldCreateUser: true,
    },
  });
  assert.deepEqual(result, { ok: true, status: 200, email: "client@example.com" });
  assert.match(magicLinkFeedback(result, result.email, "es").message, /Te enviamos un enlace de acceso/);
  assert.equal(magicLinkFeedback(result, result.email, "es").title, "Revisa tu correo");
});

test("magic-link OTP exposes a real Supabase error and rate-limit state", async () => {
  const result = await requestSupabaseMagicLink({
    email: "client@example.com",
    redirectTo: "https://usekreaton.com/client/setup/",
    projectUrl,
    anonKey,
    fetchImpl: async () => ({
      ok: false,
      status: 429,
      json: async () => ({ message: "For security purposes, you can only request this after 60 seconds." }),
    }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 429);
  assert.equal(result.isRateLimited, true);
  assert.match(result.message, /60 seconds/i);
  assert.equal(magicLinkFeedback(result, "client@example.com", "es").message, "Espera un momento antes de reintentar.");
});

test("magic-link callback reads the same fragment tokens as OAuth", () => {
  assert.deepEqual(readSupabaseAuthRedirect({
    hash: "#access_token=magic-access&refresh_token=magic-refresh&type=magiclink",
    search: "",
  }), {
    accessToken: "magic-access",
    refreshToken: "magic-refresh",
    type: "magiclink",
  });
});
