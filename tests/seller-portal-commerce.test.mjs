import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../seller-portal.js', import.meta.url), 'utf8');
function harness(fetch = async () => ({ ok: true, json: async () => ({ products: [] }) }), config = {}) {
  const element = { innerHTML: '', textContent: '', addEventListener() {}, classList: { add() {}, remove() {} }, setAttribute() {}, querySelectorAll() { return []; } };
  const context = vm.createContext({ URL, URLSearchParams, fetch,
    window: { location: { search: '?business_id=owned', hostname: 'usekreaton.com' }, ...config },
    localStorage: { getItem() { return null; }, removeItem() {} },
    document: { querySelector() { return element; } },
  });
  vm.runInContext(source.replace('(async () => { if (!await captureAuthRedirect()) await loadPortal(); })();', ''), context);
  return { run: code => vm.runInContext(code, context), context };
}
function form(overrides = {}) {
  const values = { name: 'Drill', description: 'Real description', category: 'Tools', sku: 'SKU-REAL', priceType: 'fixed', priceValue: '25', inventoryQuantity: '3', imageUrl: 'https://example.com/drill.jpg', ...overrides };
  return { elements: { ...Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { value }])), isActive: { checked: true } } };
}
test('portal maps real product fields and never sends unsupported metadata', () => {
  const h = harness(); h.context.form = form();
  const result = JSON.parse(h.run('JSON.stringify(payloadFromForm(form))'));
  assert.deepEqual(result, { name: 'Drill', description: 'Real description', categoryId: 'Tools', sku: 'SKU-REAL', price: 25, quoteOnly: false, stock: 3, imageUrl: 'https://example.com/drill.jpg', active: true, published: true });
});
test('quote only sends null price and omitted SKU stays omitted', () => {
  const h = harness(); h.context.form = form({ priceType: 'quote_only', priceValue: '25', sku: '' });
  const result = JSON.parse(h.run('JSON.stringify(payloadFromForm(form))'));
  assert.equal(result.price, null); assert.equal(result.quoteOnly, true); assert.equal('sku' in result, false);
});
test('blank or fractional stock is rejected instead of invented or rounded', () => {
  const h = harness();
  for (const stock of ['', '1.5', '-1']) { h.context.form = form({ inventoryQuantity: stock }); assert.throws(() => h.run('payloadFromForm(form)'), /stock entero/); }
});
test('starting at is not silently coerced while awaiting product decision', () => {
  const h = harness(); h.context.form = form({ priceType: 'starting_at' });
  assert.throws(() => h.run('payloadFromForm(form)'), /pendiente de aprobacion/);
});
test('duplicate uses existing POST contract, archived and no SKU', () => {
  const h = harness();
  const result = JSON.parse(h.run('JSON.stringify(duplicatePayload({name:"Drill", sku:"original",price:25,quoteOnly:false,stock:2,categoryId:"tools",description:"real",imageUrl:"url"}))'));
  assert.equal(result.active, false); assert.equal(result.published, false); assert.equal('sku' in result, false); assert.equal(result.price, 25);
});
test('host precedence and cookie credentials', async () => {
  const calls = []; const h = harness(async (url, options) => { calls.push({ url, options }); return { ok: true, json: async () => ({}) }; });
  assert.equal(h.run('resolveApiBase()'), 'https://luma-api.vmbusinesssystems.com');
  h.run('window.LUMA_API_BASE_URL = "https://override.example/"');
  assert.equal(h.run('resolveApiBase()'), 'https://override.example');
  await h.run('apiRequest(productsPath(), {method:"GET"})');
  assert.equal(calls[0].options.credentials, 'include');
  assert.equal(calls[0].url, 'https://luma-api.vmbusinesssystems.com/api/v1/store-owner/owned/products');
  assert.equal(calls[0].options.headers.Authorization, undefined);
});
test('session exchange is followed by cookie-only me verification', async () => {
  const calls = []; const h = harness(async url => { calls.push(url); return { ok: true, json: async () => ({}) }; });
  await h.run('establishCookieSession("test", "refresh")');
  assert.deepEqual(calls.map(url => new URL(url).pathname), ['/api/client/auth/session', '/api/client/auth/me']);
});
test('failed cookie verification rejects access', async () => {
  const h = harness(async url => ({ ok: !url.endsWith('/me'), status: 401, json: async () => ({ detail: 'Expired' }) }));
  await assert.rejects(h.run('establishCookieSession("test")'), /Expired/);
  assert.equal(h.run('state.authenticated'), false);
});
test('no phantom endpoints, unsupported controls, or checkout API calls survive', () => {
  for (const text of ['/api/client/portal', '/api/client/catalog-items', '/api/client/assets/upload', '/checkout/', '/payments/', 'data-toggle-featured', 'data-delete-item', 'name="salePrice"', 'name="imageFile"', 'memberships']) assert.equal(source.includes(text), false, text);
  assert.match(source, /todavia no aparecen en la pagina publica/);
});
test('successful save reloads products from API and preserves the manual-product notice', async () => {
  const calls = []; const h = harness(async (url, options) => { calls.push({url, options}); return {ok: true, json: async () => options.method === 'POST' ? {id: 'new'} : {products: [{id:'new', name:'New', quoteOnly:true, stock:0, status:'Archived'}]}}; });
  h.run('state.authenticated=true');
  await h.run('mutateProduct(productsPath(), "POST", {name:"New", quoteOnly:true,price:null, stock:0,active:false,published:false}, true)');
  assert.equal(calls.length, 2); assert.equal(calls[0].options.method, 'POST');
  assert.equal(h.run('state.products[0].id'), 'new');
  assert.match(h.run('state.notice'), /todavia no aparecen/);
});
