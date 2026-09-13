import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../seller-portal.js', import.meta.url), 'utf8');
function boot(search, fetch = () => new Promise(() => {})) {
  const nodes = new Map();
  function node(selector) {
    if (!nodes.has(selector)) {
      const classes = new Set(selector === '#sellerLoginForm' ? ['login-collapsed'] : []);
      const attributes = new Map(); const handlers = new Map();
      nodes.set(selector, { dataset: {}, hidden: false, textContent: '', innerHTML: '', attributes, handlers,
        classList: { add: value => classes.add(value), remove: value => classes.delete(value), contains: value => classes.has(value) },
        setAttribute: (key, value) => attributes.set(key, value),
        addEventListener: (key, handler) => handlers.set(key, handler), querySelectorAll: () => [],
      });
    }
    return nodes.get(selector);
  }
  const context = vm.createContext({ URL, URLSearchParams, fetch,
    window: { location: { search, hash: '', hostname: 'usekreaton.com' } },
    localStorage: { getItem: () => null, removeItem() {} }, document: { querySelector: node } });
  vm.runInContext(source, context);
  return { node, context };
}
test('existing business immediately shows login and hides entire welcome before auth resolves', () => {
  const { node } = boot('?business_id=owned');
  assert.equal(node('.welcome-copy').hidden, true);
  assert.equal(node('#sellerLoginForm').classList.contains('login-collapsed'), false);
  assert.equal(node('#sellerLoginForm').attributes.get('aria-hidden'), 'false');
  assert.equal(node('#sellerLoginScreen').dataset.existingStore, 'true');
});
test('no business keeps welcome and collapsed form until existing-access click', () => {
  const { node } = boot('');
  assert.equal(node('.welcome-copy').hidden, false);
  assert.equal(node('#sellerLoginForm').classList.contains('login-collapsed'), true);
  assert.equal(node('#sellerLoginForm').attributes.get('aria-hidden'), 'true');
  node('#existingAccessButton').handlers.get('click')();
  assert.equal(node('.welcome-copy').hidden, false);
  assert.equal(node('#sellerLoginForm').classList.contains('login-collapsed'), false);
});
test('unauthorized response preserves the correct entry for both URL modes', async () => {
  for (const search of ['', '?business_id=owned']) {
    const { node } = boot(search, async () => ({ ok: false, status: 401, json: async () => ({ detail: 'Expired' }) }));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(node('.welcome-copy').hidden, Boolean(search));
    assert.equal(node('#sellerLoginForm').classList.contains('login-collapsed'), !search);
  }
});
test('empty business_id preserves welcome and a manually revealed login stays revealed', () => {
  const { node, context } = boot('?business_id=');
  assert.equal(node('.welcome-copy').hidden, false);
  node('#existingAccessButton').handlers.get('click')();
  vm.runInContext('showLogin("Login failed")', context);
  assert.equal(node('#sellerLoginForm').classList.contains('login-collapsed'), false);
});
