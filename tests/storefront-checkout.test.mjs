import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../storefront-checkout.js', import.meta.url), 'utf8');
const { checkoutLines, createCheckoutAttempt } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const catalog = [{ id: 'json-id', product_id: 'prod-real', business_id: 'store-real', price_type: 'fixed' }];
const items = [{ id: 'json-id', quantity: 2 }];
const response = (body, ok = true) => ({ ok, json: async () => body });

test('checkout uses actual product and store IDs, never JSON IDs', () => {
  assert.deepEqual(checkoutLines(items, catalog, 'store-real'), [{ productId: 'prod-real', quantity: 2 }]);
  for (const changes of [{ product_id: null }, { price_type: 'quote_only' }, { business_id: 'another-store' }]) {
    assert.throws(() => checkoutLines(items, [{ ...catalog[0], ...changes }], 'store-real'));
  }
  assert.throws(() => checkoutLines(items, [...catalog, ...catalog], 'store-real'));
  assert.throws(() => checkoutLines([{ id: 'old', quantity: 1 }], catalog, 'store-real'));
});

test('all cart lines reach backend before real session creation with customer and shipping', async () => {
  const calls = [];
  let id = 0;
  const run = createCheckoutAttempt({ apiBase: 'https://api.example', businessId: 'store-real',
    lines: [{ productId: 'p1', quantity: 2 }, { productId: 'p2', quantity: 1 }], uuid: () => `uuid-${++id}`,
    fetchRef: async (url, options) => { calls.push({ url, ...options, body: JSON.parse(options.body) }); return response({ payment: { checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_example' } }); },
  });
  const details = { customer: { email: 'test@example.com', firstName: 'Test', lastName: 'Buyer' }, shippingAddress: { line1: '510 Townsend St', city: 'San Francisco', region: 'CA', postalCode: '94103', country: 'US' }, successUrl: 'https://store.example/?checkout=returned', cancelUrl: 'https://store.example/?checkout=cancelled' };
  const result = await run(details);
  assert.deepEqual(calls.map(c => c.url.split('/checkout/')[1]), ['cart/items', 'cart/items', 'create-session']);
  assert.deepEqual(calls[2].body, { ...details, businessId: 'store-real', cartId: 'uuid-1' });
  assert.equal(calls[2].headers['Idempotency-Key'], 'uuid-2');
  assert.equal(result.checkoutUrl, 'https://checkout.stripe.com/c/pay/cs_test_example');
});

test('ambiguous session failure retries same key without adding cart twice', async () => {
  const calls = []; let fail = true;
  const run = createCheckoutAttempt({ apiBase: '', businessId: 's', lines: [{ productId: 'p', quantity: 1 }], uuid: () => 'stable', fetchRef: async (url, opts) => {
    calls.push([url, opts]);
    if (url.endsWith('create-session') && fail) { fail = false; throw new Error('Network timeout'); }
    return response({ payment: { checkoutUrl: 'https://checkout.stripe.com/c/pay/test' } });
  } });
  await assert.rejects(run({ customer: { email: 'a@example.com' } }), /timeout/);
  await run({ customer: { email: 'changed@example.com' } });
  assert.equal(calls.filter(([url]) => url.endsWith('cart/items')).length, 1);
  assert.equal(calls[1][1].body, calls[2][1].body);
  assert.deepEqual(calls[1][1].headers, calls[2][1].headers);
});

test('cart failure never creates an order and retry starts fresh cart', async () => {
  const calls = []; let id = 0;
  const run = createCheckoutAttempt({ apiBase: '', businessId: 's', lines: [{ productId: 'p', quantity: 1 }], uuid: () => `cart-${++id}`, fetchRef: async (url, opts) => { calls.push([url, JSON.parse(opts.body)]); return response({ detail: 'Insufficient stock' }, false); } });
  await assert.rejects(run({}), /Insufficient stock/);
  await assert.rejects(run({}), /Insufficient stock/);
  assert.equal(calls.length, 2);
  assert.notEqual(calls[0][1].cartId, calls[1][1].cartId);
  assert(calls.every(([url]) => url.endsWith('cart/items')));
});

test('public viewer gates checkout and preserves lead fallback; all address fields required', async () => {
  const viewer = await readFile(new URL('../site-viewer.js', import.meta.url), 'utf8');
  assert.match(viewer, /site\.commerce\?\.salesEnabled === true/);
  assert.match(viewer, /else \{\s*openLeadModal/);
  for (const name of ['email', 'firstName', 'lastName', 'line1', 'city', 'region', 'postalCode', 'country']) assert(source.includes(`field("${name}"`));
  assert.match(source, /maxlength=.*required/);
  assert.match(source, /role="dialog" aria-modal="true"/);
});
