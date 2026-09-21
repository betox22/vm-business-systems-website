import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const clientSetup = readFileSync(new URL('../client/setup/index.html', import.meta.url), 'utf8');
const studio = readFileSync(new URL('../ai-builder.html', import.meta.url), 'utf8');

test('public client setup keeps Google primary and Apple reserved without email', () => {
  assert.match(clientSetup, /id="studioAuthGate"[^>]*aria-labelledby="studioAuthTitle"/);
  assert.match(clientSetup, /id="studioLegalConsent"/);
  assert.match(clientSetup, /id="studioGoogleAuthButton"/);
  assert.match(clientSetup, /id="studioAppleAuthButton"[^>]*disabled aria-disabled="true"/);
  assert.match(clientSetup, /class="studio-auth-coming-soon"/);
  assert.doesNotMatch(clientSetup, /id="studioEmailAuthForm"|data-magic-link-confirmation/);
});

test('legacy studio retains its existing alternate sign-in controls', () => {
  assert.match(studio, /id="studioEmailAuthForm"/);
  assert.match(studio, /id="studioAppleAuthButton"/);
});
