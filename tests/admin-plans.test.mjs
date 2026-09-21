import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { plansMarkup } from '../operations/plans.js';

const plan = { planId:'level_a', displayName:'<script>test</script>', stripePriceId:'price_test', trialDays:7, active:true };
test('plan registry escapes display data and support is read-only', () => {
  const html = plansMarkup([plan], false);
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('data-new-plan'));
  assert.ok(html.includes('>Ver</button>'));
  assert.ok(html.includes('price_test'));
});
test('superadmin has plan creation and edit commands', () => {
  const html = plansMarkup([plan], true);
  assert.ok(html.includes('data-new-plan'));
  assert.ok(html.includes('>Editar</button>'));
});
test('plan navigation uses existing authenticated admin API and new price endpoint', async () => {
  const operations = await readFile(new URL('../operations/operations.js', import.meta.url), 'utf8');
  const plans = await readFile(new URL('../operations/plans.js', import.meta.url), 'utf8');
  assert.ok(operations.includes('adminApi("/api/admin/plans")'));
  assert.ok(plans.includes('/price'));
  assert.ok(plans.includes('version: plan.version'));
});
