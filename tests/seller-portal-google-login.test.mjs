import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../seller-portal.js', import.meta.url), 'utf8');
const config = readFileSync(new URL('../luma-config.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../client/portal/index.html', import.meta.url), 'utf8');
function harness(url, fetch = async () => ({ ok: true, json: async () => ({ products: [] }) })) {
  const nodes = new Map();
  function element(selector) {
    if (!nodes.has(selector)) nodes.set(selector, { dataset: {}, hidden: false, innerHTML: '', textContent: '', value: '',
      classList: { add() {}, remove() {} }, handlers: new Map(),
      setAttribute() {}, addEventListener(key, handler) { this.handlers.set(key, handler); }, querySelectorAll() {return [];} });
    return nodes.get(selector);
  }
  const window = { location: new URL(url), history: { replaceState(_state, _title, target) { window.location = new URL(target); } } };
  const context = vm.createContext({ window, document: { querySelector: element }, URL, URLSearchParams, fetch,
    localStorage: {getItem: () => null, removeItem() {}} });
  vm.runInContext(config, context);
  vm.runInContext(source.replace('(async () => { if (!await captureAuthRedirect()) await loadPortal(); })();', ''), context);
  return { context, window, element, run: code => vm.runInContext(code, context) };
}
test('classic global authorization URL matches the builder configuration', () => {
  const builder = readFileSync(new URL('../src/ai-builder/config.js', import.meta.url), 'utf8');
  const h = harness('https://usekreaton.com/client/portal/');
  assert.equal(h.window.LUMA_SUPABASE_AUTH_URL, builder.match(/export const SUPABASE_AUTH_URL = "([^"]+)"/)[1]);
  assert.ok(html.indexOf('/luma-config.js') < html.indexOf('/seller-portal.js'));
});
test('Google click redirects without submitting password and preserves entire portal URL', () => {
  const original = 'https://usekreaton.com/client/portal/?business_id=store%2Fone&lang=es';
  const h = harness(original);
  h.element('#sellerGoogleLoginButton').handlers.get('click')();
  const redirect = new URL(h.window.location.href);
  assert.equal(redirect.origin + redirect.pathname, h.window.LUMA_SUPABASE_AUTH_URL);
  assert.equal(redirect.searchParams.get('provider'), 'google');
  assert.equal(redirect.searchParams.get('redirect_to'), original);
  assert.match(html, /id="sellerGoogleLoginButton"[^>]*type="button"/);
});
test('simulated Google return exchanges cookie, validates and loads the correct business', async () => {
  const calls=[]; let session=false;
  const h = harness('https://usekreaton.com/client/portal/?business_id=owner-store#access_token=fake-access&refresh_token=fake-refresh&token_type=bearer', async (url, options) => {
    const path = new URL(url).pathname; calls.push({path, options});
    if (path.endsWith('/session')) session=true;
    else assert.equal(session,true);
    return {ok:true,json:async()=>path.endsWith('/products') ? {products:[{id:'real-product',name:'Owner item',stock:3,status:'Published'}]} : {id:'owner'}};
  });
  assert.equal(await h.run('captureAuthRedirect()'),true);
  assert.equal(h.run('state.businessId'),'owner-store');
  assert.equal(h.run('state.authenticated'),true);
  assert.equal(h.run('state.products[0].id'),'real-product');
  assert.equal(h.window.location.hash,'');
  assert.equal(h.window.location.searchParams.get('business_id'),'owner-store');
  assert.deepEqual(calls.map(call=>call.path), ['/api/client/auth/session','/api/client/auth/me','/api/client/auth/me','/api/v1/store-owner/owner-store/products']);
  assert.deepEqual(JSON.parse(calls[0].options.body),{access_token:'fake-access',refresh_token:'fake-refresh'});
  for (const call of calls) assert.equal(call.options.credentials,'include');
});
test('Google button precedes secondary password submit inside the same login form', () => {
  const form = html.slice(html.indexOf('<form id="sellerLoginForm"'),html.indexOf('</form>'));
  assert.ok(form.indexOf('sellerGoogleLoginButton') < form.indexOf('name="email"'));
  assert.match(form,/class="secondary-button dark" type="submit"/);
  const h = harness('https://usekreaton.com/client/portal/');
  h.window.LUMA_SUPABASE_AUTH_URL='';
  h.run('continueWithSellerGoogle()');
  assert.match(h.element('#sellerLoginStatus').textContent,/no esta configurado/);
});
