import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { collectPresentation } from '../scripts/graph-presentation-dom.mjs';
import { projectDocument } from '../scripts/graph-presentation.mjs';
import { createInternalGraphPresentationContext, withGraphPresentation, graphPresentationEnabled } from '../src/ai-builder/mega-retail-policy.js';

test('a JSON provenance marker cannot enable the internal presentation context', () => {
  const schema = { graphPresentation: { version: 'graph-presentation-v1' } };
  assert.equal(withGraphPresentation(schema, { graphPresentation: schema.graphPresentation }, () => graphPresentationEnabled(schema)), false);
  const context = { graphPresentation: createInternalGraphPresentationContext() };
  assert.equal(withGraphPresentation(schema, context, () => graphPresentationEnabled(schema)), true);
  assert.equal(graphPresentationEnabled(schema), false);
  assert.throws(() => withGraphPresentation(schema, context, () => { throw Error('renderer failure'); }));
  assert.equal(graphPresentationEnabled(schema), false);
});

test('actual builder and public Mega Retail renderers enumerate their final defaults', async () => {
  const schema = JSON.parse(await readFile(new URL('./fixtures/graph-presentation.json', import.meta.url)));
  const before = JSON.stringify(schema);
  const result = await projectDocument(schema);
  assert.equal(JSON.stringify(schema), before);
  assert.equal(result.surfaces.length, 6);
  assert.ok(result.dependencies.some((p) => p.endsWith('site-viewer.js')));
  assert.ok(result.dependencies.some((p) => p.endsWith('src/ai-builder/renderers.js')));
  for (const surface of result.surfaces) {
    for (const text of ['Fast shipping', 'Easy returns', 'Secure payment', "Today's deals"]) {
      // The builder honors the supplied Catalog title; public does not.
      if (text === "Today's deals" && surface.renderer === 'builder') continue;
      assert.ok(surface.entries.some((entry) => entry.text.includes(text)), `${surface.renderer}: ${text}`);
    }
    assert.ok(surface.entries.some((entry) => entry.path.endsWith('@aria-label') && entry.text.includes('Search')));
    assert.ok(surface.entries.some((entry) => entry.path.endsWith('@placeholder')));
    // Legacy image onerror handlers are deliberately not granted a blanket exception.
    assert.ok(surface.violations.every((item) => ['active_attribute', 'uncovered_interaction_state'].includes(item.reason)));
  }
});

test('DOM collector includes hidden/empty states, accessible attributes, CSS and split claims', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(`<style>.empty::after {content:"Free shipping"}.split::before{content:"Lifetime "}</style>
      <main><div hidden>Lifetime warranty</div><div class="empty">No products</div>
      <button aria-label="Secure payment" title="10% discount">Free <b>shipping</b></button>
      <img alt="Certified tools"><input placeholder="Free delivery" value="10 USD">
      <span>10<span>%</span></span><p class="split">guarantee</p><details><summary>More</summary>Easy returns</details></main>`);
    const result = await page.evaluate(collectPresentation, await page.$('main'));
    for (const value of ['Lifetime warranty', 'No products', 'Secure payment', '10% discount', 'Certified tools', '10 USD', 'Free shipping', '10%', 'Lifetime guarantee']) {
      assert.ok(result.entries.some((entry) => entry.text.includes(value)), value);
    }
    assert.ok(result.entries.some((entry) => entry.kind === 'css'));
  } finally { await browser.close(); }
});

test('unsupported page scope fails before rendering', async () => {
  await assert.rejects(projectDocument({ pages: [] }), /unsupported_presentation_scope/);
});

test('claims introduced only in real modal and empty-cart states reject the whole document', async () => {
  const schema = JSON.parse(await readFile(new URL('./fixtures/graph-presentation.json', import.meta.url)));
  schema.theme = { colors: {}, fonts: {} };
  schema.global_components.mega_retail_features = { newsletter: false };
  Object.assign(schema.catalog_items[0], { price_type: 'fixed', price_label: 'USD 25.00', price: 25,
    inventory_quantity: 7, business_id: 'qa-store', product_id: 'qa-product' });
  const result = await projectDocument(schema, { trusted: { siteId: 'qa-site', businessId: 'qa-store' },
    sourceTransform(source, filename) {
      if (!filename.endsWith('site-viewer.js')) return source;
      return source.replace('status.textContent = "Sent. Thank you."', 'status.textContent = "Free shipping for everyone"')
        .replace('saved: "Saved"', 'saved: "Lifetime warranty"')
        .replace('emptyCart: "Your cart is empty."', 'emptyCart: "20% discount while empty"');
    } });
  const check = spawnSync('python', ['-c', `import json,sys
from dataclasses import asdict
from app.site_graph_document_validation import _check_projection, DocumentRejected
try: _check_projection(json.load(sys.stdin))
except DocumentRejected as e: print(json.dumps([asdict(i) for i in e.issues]))
else: raise SystemExit('accepted poisoned modal')`], {
    cwd: fileURLToPath(new URL('../backend/', import.meta.url)), input: JSON.stringify(result), encoding: 'utf8', maxBuffer: 80_000_000,
  });
  assert.equal(check.status, 0, check.stderr);
  const issues = JSON.parse(check.stdout);
  for (const surface of result.surfaces) {
    for (const [state, text] of [['lead-sent', 'Free shipping for everyone'], ['account-saved', 'Lifetime warranty'], ['cart-empty', '20% discount while empty']]) {
      const poisoned = surface.entries.filter(e => e.path.startsWith(`${state}:`) && e.text.includes(text));
      assert.ok(poisoned.length, `${surface.renderer}:${state} mutation absent`);
      assert.ok(issues.some(i => i.surface === `${surface.renderer}:${surface.viewport.width}` &&
        i.rule.endsWith('_claim') && poisoned.some(e => e.path === i.path)), `missing rejection of ${state}`);
    }
  }
});

test('real Mega Retail render paths expose adversarial labels, defaults, aria and empty branches', async (t) => {
  const base = JSON.parse(await readFile(new URL('./fixtures/graph-presentation.json', import.meta.url)));
  const mutations = [
    { name: 'shipping label', from: '"Fast shipping"', to: '"Free shipping worldwide"', text: 'Free shipping worldwide' },
    { name: 'returns default', from: '"Easy returns"', to: '"Lifetime warranty on returns"', text: 'Lifetime warranty on returns' },
    { name: 'payment aria', from: 'aria-label="${escapeAttribute(labels.cart)}"', to: 'aria-label="Guaranteed secure payment"', text: 'Guaranteed secure payment', kind: 'attribute' },
    { name: 'empty grid', from: '${items.slice(0, 10).map', to: '${items.length ? "" : "<p>20% discount while empty</p>"}${items.slice(0, 10).map', text: '20% discount while empty', empty: true },
  ];
  for (const mutation of mutations) await t.test(mutation.name, async () => {
    const schema = structuredClone(base);
    if (mutation.empty) schema.catalog_items = [];
    let patched = 0;
    const result = await projectDocument(schema, { sourceTransform(source) {
      assert.ok(source.includes(mutation.from));
      patched++;
      return source.replaceAll(mutation.from, mutation.to);
    } });
    assert.equal(patched, 2);
    for (const surface of result.surfaces) {
      assert.ok(surface.entries.some((entry) => entry.text.includes(mutation.text) && (!mutation.kind || entry.kind === mutation.kind)),
        `${mutation.name} missing from ${surface.renderer}:${surface.viewport.width}`);
    }
    const check = spawnSync('python', ['-c', `import json,sys
from dataclasses import asdict
from app.site_graph_document_validation import _check_projection, DocumentRejected
try:
 _check_projection(json.load(sys.stdin))
except DocumentRejected as error:
 print(json.dumps([asdict(issue) for issue in error.issues]))
else:
 raise SystemExit('adversarial document accepted')`], {
      cwd: fileURLToPath(new URL('../backend/', import.meta.url)), input: JSON.stringify(result), encoding: 'utf8', maxBuffer: 10_000_000,
    });
    assert.equal(check.status, 0, check.stderr);
    const issues = JSON.parse(check.stdout);
    for (const surface of result.surfaces) {
      const poisoned = surface.entries.filter((entry) => entry.text.includes(mutation.text) && (!mutation.kind || entry.kind === mutation.kind));
      assert.ok(issues.some((issue) => issue.surface === `${surface.renderer}:${surface.viewport.width}` && poisoned.some((entry) => entry.path === issue.path)),
        'rejection must identify the poisoned text, not merely another pre-existing default');
    }
  });
});
