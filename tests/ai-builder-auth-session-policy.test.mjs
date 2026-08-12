import assert from 'node:assert/strict';
import test from 'node:test';

import {
  generationAuthAction,
  hasValidPersistedCredential,
  isUnexpiredAccessToken,
} from '../src/ai-builder/auth-session-policy.js';


function jwtWithExpiration(expiration) {
  const encode = (value) => Buffer.from(JSON.stringify(value))
    .toString('base64url');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ exp: expiration })}.signature`;
}


test('accepts an unexpired persisted JWT and rejects expired or malformed tokens', () => {
  const now = 2_000_000_000;

  assert.equal(isUnexpiredAccessToken(jwtWithExpiration(now + 60), now), true);
  assert.equal(isUnexpiredAccessToken(jwtWithExpiration(now), now), false);
  assert.equal(isUnexpiredAccessToken(jwtWithExpiration(now - 60), now), false);
  assert.equal(isUnexpiredAccessToken('not-a-jwt', now), false);
});


test('accepts any stored valid access token and existing preview sessions', () => {
  const now = 2_000_000_000;
  const validToken = jwtWithExpiration(now + 60);
  const expiredToken = jwtWithExpiration(now - 60);

  assert.equal(hasValidPersistedCredential({ accessTokens: [expiredToken, validToken] }, now), true);
  assert.equal(hasValidPersistedCredential({ accessTokens: [expiredToken] }, now), false);
  assert.equal(hasValidPersistedCredential({ previewTokens: ['demo-session'] }, now), true);
});


test('email intake login with pending generation continues without JWT or preview token', () => {
  const hasCredential = hasValidPersistedCredential({
    accessTokens: [],
    previewTokens: [],
    clientEmails: ['client@example.com'],
  });

  assert.equal(hasCredential, true);
  assert.equal(generationAuthAction({ hasCredential, workspaceUnlocked: true }), 'continue');
  assert.notEqual(generationAuthAction({ hasCredential, workspaceUnlocked: true }), 'prompt_auth');
});


test('generation prompts only without credentials and otherwise unlocks when needed', () => {
  assert.equal(generationAuthAction({ hasCredential: false, workspaceUnlocked: false }), 'prompt_auth');
  assert.equal(generationAuthAction({ hasCredential: true, workspaceUnlocked: false }), 'unlock_and_continue');
  assert.equal(generationAuthAction({ hasCredential: true, workspaceUnlocked: true }), 'continue');
});
