import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const clientSetup = readFileSync(new URL('../client/setup/index.html', import.meta.url), 'utf8');
const studio = readFileSync(new URL('../ai-builder.html', import.meta.url), 'utf8');

test('public client setup offers Google without the email or disabled Apple choices', () => {
  assert.match(clientSetup, /id="studioAuthGate"[^>]*aria-labelledby="studioAuthTitle"/);
  assert.match(clientSetup, /id="studioLegalConsent"/);
  assert.match(clientSetup, /id="studioGoogleAuthButton"/);
  assert.doesNotMatch(clientSetup, /id="studioEmailAuthForm"|id="studioAppleAuthButton"|data-magic-link-confirmation/);
});

test('legacy studio retains its existing alternate sign-in controls', () => {
  assert.match(studio, /id="studioEmailAuthForm"/);
  assert.match(studio, /id="studioAppleAuthButton"/);
});
