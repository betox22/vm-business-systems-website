import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../seller-portal.js', import.meta.url), 'utf8');
function harness(fetch) {
  const elements = new Map();
  const element = selector => {
    if (!elements.has(selector)) elements.set(selector, { innerHTML: '', dataset: {}, textContent: '', addEventListener() {}, classList: { add() {}, remove() {} }, setAttribute() {}, querySelectorAll() { return []; }, focus() {} });
    return elements.get(selector);
  };
  const context = vm.createContext({ URL, URLSearchParams, AbortSignal, fetch,
    window: { location: { search: '?business_id=owned', hostname: 'usekreaton.com', href: 'https://usekreaton.com/client/portal/?business_id=owned' } },
    localStorage: { getItem() {}, removeItem() {} }, document: { querySelector: element },
  });
  vm.runInContext(source.replace('(async () => { if (!await captureAuthRedirect()) await loadPortal(); })();', ''), context);
  const run = code => vm.runInContext(code, context);
  run('state.authenticated=true; state.view="payments"');
  return { run, elements };
}
const ok = data => ({ ok: true, json: async () => data });
for (const [status, charges, title] of [
  ['not_started', false, 'Sin conectar'], ['requirements_due', false, 'Requiere datos'],
  ['pending', false, 'Requiere datos'], ['verifying', false, 'Verificando'],
  ['complete', true, 'Cobros habilitados'], ['restricted', false, 'Cuenta restringida'],
]) test(`Stripe view: ${status}`, async () => {
  const h = harness(async () => ok({ connected: status !== 'not_started', onboardingStatus: status, chargesEnabled: charges }));
  await h.run('loadStripeStatus()');
  const html = h.elements.get('#sellerContent').innerHTML;
  assert.ok(html.includes(title));
  assert.match(html, /disabled aria-describedby="stripeOAuthNote">Conectar cuenta existente/);
  assert.match(html, /Proximamente/);
  assert.equal(h.run('state.stripeBusy'), false);
});
test('entry GET is read-only; manual refresh POST keeps cookie and timestamp', async () => {
  const calls = [];
  const h = harness(async (url, options) => { calls.push({url, options}); return ok({connected: true, onboardingStatus: 'complete', chargesEnabled: true, updatedAt: 123}); });
  await h.run('loadStripeStatus()'); await h.run('loadStripeStatus(true)');
  assert.ok(calls[0].url.endsWith('/owned/stripe-connect')); assert.equal(calls[0].options.method, 'GET');
  assert.ok(calls[1].url.endsWith('/owned/stripe-connect/refresh')); assert.equal(calls[1].options.method, 'POST');
  assert.equal(calls[1].options.credentials, 'include'); assert.ok(calls[1].options.signal);
  assert.equal(h.run('state.stripe.updatedAt'), 123);
});
test('network failure preserves last state and offers retry without enabling creation', async () => {
  const h = harness(async () => { throw new Error('Sin conexion'); });
  h.run('state.stripe={connected:true, accountId:"acct_saved", chargesEnabled:true}');
  await h.run('loadStripeStatus(true)');
  assert.match(h.elements.get('#sellerContent').innerHTML, /Sin conexion/);
  assert.match(h.elements.get('#sellerContent').innerHTML, /ultimo estado conocido/);
  assert.equal(h.run('state.stripe.accountId'), 'acct_saved');
  assert.equal(h.run('state.stripeBusy'), false);
});
test('logout while request pending never restores payment data', async () => {
  let resolve;
  const h = harness(() => new Promise(r => resolve = r));
  const pending = h.run('loadStripeStatus()'); h.run('resetView()');
  resolve(ok({connected: true, accountId: 'stale'})); await pending;
  assert.equal(h.run('state.stripe'), null); assert.equal(h.elements.get('#sellerContent').innerHTML, '');
});
test('double click only sends one onboarding, country explicit, approved Stripe redirect', async () => {
  let resolve; const calls = [];
  const h = harness((url, options) => { calls.push({url, options}); return new Promise(r => resolve = r); });
  h.run('state.stripe={connected:false}; state.stripeCountry="CA"');
  const pending = h.run('startStripeOnboarding()'); await h.run('startStripeOnboarding()');
  assert.equal(calls.length, 1); assert.deepEqual(JSON.parse(calls[0].options.body), {countryCode:'CA'});
  resolve(ok({onboardingUrl:'https://connect.stripe.com/setup/test'})); await pending;
  assert.equal(h.run('window.location.href'), 'https://connect.stripe.com/setup/test');
});
test('no automatic creation without country or from error state; inventory untouched', async () => {
  let calls = 0; const h = harness(async () => { calls++; return ok({}); });
  h.run('state.stripe={connected:false}; state.products=[{id:"kept"}]; state.query="drill"');
  await h.run('startStripeOnboarding()');
  assert.equal(calls, 0); assert.equal(h.run('state.products[0].id'), 'kept'); assert.equal(h.run('state.query'), 'drill');
});
