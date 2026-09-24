import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

async function renderBento(editable) {
  const source = await readFile(new URL('../site-viewer.js', import.meta.url), 'utf8');
  const start = source.indexOf('function renderMegaRetailPublicBento(');
  const end = source.indexOf('\nfunction renderMegaRetailPublicDeals(', start);
  assert.ok(start >= 0 && end > start);
  const render = runInNewContext(`${source.slice(start, end)}; renderMegaRetailPublicBento`, {
    resolveMegaRetailDepartmentTiles: () => [
      { category: 'Home', media: { url: '/home.png', source: 'test' } },
      { category: 'Kitchen', media: { url: '/kitchen.png', source: 'test' } },
    ],
    motionDataAttributes: () => '',
    escapeAttribute: (value) => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;'),
    escapeHtml: (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'),
    megaRetailPublicIcon: () => '<svg></svg>',
  });
  return render(
    { business: { name: 'Test store' } },
    { editable },
    [], [], [], false,
    { explore: 'Explore', featured: 'Featured', department: 'Department', discover: 'Discover' },
  );
}

test('Mega Retail public hero uses generated CTA only for the primary tile', async () => {
  const html = await renderBento({ primary_button: 'Browse home goods' });
  assert.match(html, /class="mega-retail-tile is-primary[^>]*>[\s\S]*?data-motion-cta>Browse home goods <svg>/);
  assert.match(html, /class="mega-retail-tile is-medium[^>]*>[\s\S]*?>Explore <svg>/);
  assert.equal((html.match(/Browse home goods/g) || []).length, 1);
});

test('Mega Retail public hero keeps the localized fallback when no CTA is provided', async () => {
  const html = await renderBento({});
  assert.equal((html.match(/>Explore <svg>/g) || []).length, 2);
});

test('Mega Retail public hero escapes generated CTA copy', async () => {
  const html = await renderBento({ primary_button: '<Browse & buy>' });
  assert.match(html, /&lt;Browse &amp; buy&gt;/);
  assert.doesNotMatch(html, />\s*<Browse & buy>/);
});
