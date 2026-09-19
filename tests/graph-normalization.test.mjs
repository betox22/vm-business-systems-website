import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { normalizeDocument } from '../scripts/graph-normalization.mjs';
import { projectDocument } from '../scripts/graph-presentation.mjs';
import { GRAPH_NORMALIZATION_CONTRACT, registerServerVerifiedGraphDocument, preservedGraphDocument } from '../src/ai-builder/graph-normalization-policy.js';

async function fixture() {
  const schema = JSON.parse(await readFile(new URL('./fixtures/graph-presentation.json', import.meta.url), 'utf8'));
  schema.theme = { colors: {}, fonts: {} };
  schema.global_components.mega_retail_features = { newsletter: false };
  schema.pages[0].sections.push({ id: 'contact', type: 'Contact', order: 3, editable: { title: 'Contact', text: 'Talk with the team' } });
  schema.contact = { email: 'qa@example.test' };
  return schema;
}

test('two rounds through every real normalization entry preserve v1 and Contact exactly', async () => {
  const schema = await fixture();
  const before = JSON.stringify(schema);
  const result = await normalizeDocument(schema, { verifiedContract: GRAPH_NORMALIZATION_CONTRACT,
    sourceTransform(source) {
      for (const marker of [
        'function buildRetailInstantPages(copy, name, description, payload = {}) {',
        'function mergeLockedTemplatePage(lockedPage, existingPage = null) {',
      ]) { assert.ok(source.includes(marker)); source = source.replace(marker, `${marker}\nthrow new Error('Legacy reconstruction reached for v1');`); }
      return source;
    },
  });
  assert.equal(JSON.stringify(schema), before);
  assert.equal(JSON.stringify(result.document), before);
  assert.equal(result.trace.length, 8);
  assert.ok(result.trace.every(s => s.unchanged && s.pages.length === 1 && s.pages[0].sections.some(b => b.type === 'Contact')));
  for (const rendering of result.renderings) {
    assert.ok(rendering.html.includes('qa@example.test'));
    assert.ok(!rendering.html.includes('Fast shipping'));
    assert.ok(!rendering.html.includes("Today's deals"));
  }
});

test('editable JSON markers do not establish provenance; verified objects cannot be modified in place', async () => {
  const schema = await fixture();
  schema.graph_pivot = { version: 1, verified: true, contract: GRAPH_NORMALIZATION_CONTRACT };
  assert.equal(preservedGraphDocument(schema), null);
  registerServerVerifiedGraphDocument(schema, GRAPH_NORMALIZATION_CONTRACT);
  const normalized = preservedGraphDocument(schema);
  assert.deepEqual(preservedGraphDocument(normalized), schema);
  assert.equal(preservedGraphDocument(structuredClone(schema)), null);
  schema.pages[0].sections[0].editable.headline = 'Changed';
  assert.throws(() => preservedGraphDocument(schema), /changed/);
  assert.throws(() => registerServerVerifiedGraphDocument(normalized, 'v2'), /Unsupported/);
});

test('post-normalization renderer labels, aria and modal claims still reject the complete document', async () => {
  const schema = await fixture();
  Object.assign(schema.catalog_items[0], { price_type: 'fixed', price_label: 'USD 25.00', price: 25,
    inventory_quantity: 7, business_id: 'qa-store', product_id: 'qa-product' });
  const normalized = await normalizeDocument(schema, { verifiedContract: GRAPH_NORMALIZATION_CONTRACT });
  assert.deepEqual(normalized.document, schema);
  const result = await projectDocument(normalized.document, {
    trusted: { siteId: 'qa-site', businessId: 'qa-store' },
    sourceTransform(source, filename) {
      const aria = 'aria-label="${escapeAttribute(labels.cart)}"';
      assert.ok(source.includes(aria));
      source = source.replaceAll(aria, 'aria-label="Guaranteed secure payment"');
      if (!filename.endsWith('site-viewer.js')) return source;
      for (const [from, to] of [
        ['status.textContent = "Sent. Thank you."', 'status.textContent = "Free shipping for everyone"'],
        ['saved: "Saved"', 'saved: "Lifetime warranty"'],
        ['emptyCart: "Your cart is empty."', 'emptyCart: "20% discount while empty"'],
      ]) { assert.ok(source.includes(from)); source = source.replace(from, to); }
      return source;
    },
  });
  const checked = spawnSync('python', ['-c', `import json,sys
from dataclasses import asdict
from app.site_graph_document_validation import _check_projection, DocumentRejected
try: _check_projection(json.load(sys.stdin))
except DocumentRejected as e: print(json.dumps([asdict(i) for i in e.issues]))
else: raise SystemExit('accepted poisoned post-normalization document')`], {
    cwd: fileURLToPath(new URL('../backend/', import.meta.url)), input: JSON.stringify(result), encoding: 'utf8', maxBuffer: 80_000_000,
  });
  assert.equal(checked.status, 0, checked.stderr);
  const issues = JSON.parse(checked.stdout);
  const evidence = [];
  for (const surface of result.surfaces) {
    for (const [state, text] of [
      ['', 'Guaranteed secure payment'], ['lead-sent:', 'Free shipping for everyone'],
      ['account-saved:', 'Lifetime warranty'], ['cart-empty:', '20% discount while empty'],
    ]) {
      const entries = surface.entries.filter(e => e.path.startsWith(state) && e.text.includes(text));
      assert.ok(entries.length, `${surface.renderer}:${surface.viewport.width}:${text} missing`);
      const rejected = issues.filter(i => i.surface === `${surface.renderer}:${surface.viewport.width}` &&
        i.rule.endsWith('_claim') && entries.some(e => e.path === i.path));
      assert.ok(rejected.length, `missing rejection of ${text}`);
      evidence.push({ surface: `${surface.renderer}:${surface.viewport.width}`, text, issues: rejected });
    }
  }
  if (process.env.GRAPH_POST_NORMALIZATION_EVIDENCE) await writeFile(process.env.GRAPH_POST_NORMALIZATION_EVIDENCE,
    JSON.stringify({ accepted: false, normalizedBeforeValidation: true, evidence }, null, 2));
});

test('legacy normalization JSON and real rendered HTML remain byte-identical to the pre-step2 implementation', async () => {
  const source = process.env.GRAPH_PUBLIC_PAYLOAD
    ? JSON.parse((await readFile(process.env.GRAPH_PUBLIC_PAYLOAD, 'utf8')).replace(/^\uFEFF/, ''))
    : { schema: await fixture() };
  const before = await normalizeDocument(source.schema, { baseline: true });
  const after = await normalizeDocument(source.schema);
  assert.equal(JSON.stringify(after.document), JSON.stringify(before.document));
  assert.deepEqual(after.trace, before.trace);
  assert.equal(after.renderings.length, before.renderings.length);
  const rows = after.renderings.map((r, i) => {
    const old = before.renderings[i];
    assert.equal(r.html, old.html, `${r.renderer}:${r.pageKey}:${r.width}`);
    assert.equal(r.sha256, old.sha256);
    return { renderer: r.renderer, page: r.pageKey, width: r.width, bytes: Buffer.byteLength(r.html),
      beforeSHA256: old.sha256, afterSHA256: r.sha256, byteIdentical: true };
  });
  if (process.env.GRAPH_NORMALIZATION_EVIDENCE) await writeFile(process.env.GRAPH_NORMALIZATION_EVIDENCE,
    JSON.stringify({ payloadSHA256: createHash('sha256').update(JSON.stringify(source)).digest('hex'),
      normalizedBeforeSHA256: before.documentSHA256, normalizedAfterSHA256: after.documentSHA256,
      documentByteIdentical: true, trace: after.trace, renderings: rows }, null, 2));
});
