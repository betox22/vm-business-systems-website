import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const sectionIds = [
  'mega-retail-store--home--catalog',
  'digital-products-store--catalog--digital-catalog',
  'corporate-company-pro--catalog--services-grid',
];
const copy = {
  title: 'Real inventory', subtitle: 'Items available from the store', empty_message: 'No items available',
  quote_label: 'Request a quote', sold_out_label: 'Sold out', add_label: 'Add to cart',
  view_label: 'Ask about this',
};
const product = (index, updates = {}) => ({
  id: `prod-${index}`, businessId: 'owned', name: `Item ${index}`, categoryId: 'Equipment',
  description: `Item ${index} description`, price: 25.5, quoteOnly: false, currency: 'USD',
  stock: 8, imageUrl: `https://images.example.test/${index}.jpg`, status: 'Published',
  active: true, published: true, ...updates,
});

test('three certified catalog sections render N storefront API records without sample data', async () => {
  const bundle = await build({ absWorkingDir: root, entryPoints: ['composed-sections.js'],
    bundle: true, write: false, format: 'iife', globalName: 'CatalogSections', logLevel: 'silent' });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.route('https://catalog.test/**', async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname === '/') return route.fulfill({ contentType: 'text/html', body: '<main id="mount"></main>' });
      if (pathname === '/api/v1/storefront/owned/products') {
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify({
          businessId: 'owned', products: Array.from({ length: 18 }, (_, index) => product(index + 1)),
        }) });
      }
      if (pathname === '/templates/sections/shared-catalog.css') {
        return route.fulfill({ contentType: 'text/css', body: await readFile(path.join(root, 'templates/sections/shared-catalog.css'), 'utf8') });
      }
      const match = /^\/templates\/sections\/([a-z0-9-]+)\/(manifest\.json|section\.html|section\.css)$/.exec(pathname);
      if (!match) return route.abort();
      return route.fulfill({ contentType: match[2].endsWith('json') ? 'application/json' : 'text/plain',
        body: await readFile(path.join(root, 'templates/sections', match[1], match[2]), 'utf8') });
    });
    await page.goto('https://catalog.test/');
    await page.evaluate(bundle.outputFiles[0].text);
    const response = await page.evaluate(async () => (await fetch('/api/v1/storefront/owned/products')).json());
    assert.equal(response.products.length, 18);
    for (const id of sectionIds) {
      const manifest = JSON.parse(await readFile(path.join(root, 'templates/sections', id, 'manifest.json'), 'utf8'));
      const html = await readFile(path.join(root, 'templates/sections', id, 'section.html'), 'utf8');
      assert.equal(manifest.image_slots.length, 0);
      assert.equal(manifest.collection_bindings.catalog_items.source, 'storefront_products');
      assert.doesNotMatch(html, /sample|product\.|data-inline-edit-path|lorem|limited-time|instant access/i);
      const result = await page.evaluate(async ({ id, copy, products }) => {
        const section = { type: 'composed', section_id: id, copy_bindings: copy, image_bindings: {} };
        await CatalogSections.preloadComposedSections({ pages: [{ sections: [section] }] });
        const runtime = { catalogProducts: products, businessId: 'owned', salesEnabled: true, language: 'en' };
        const rendered = CatalogSections.renderComposedSection(section, runtime);
        document.querySelector('#mount').innerHTML = rendered;
        return {
          cardCount: document.querySelectorAll('[data-catalog-item]').length,
          names: [...document.querySelectorAll('.composed-catalog__card h3')].map((item) => item.textContent),
          price: document.querySelector('.composed-catalog__bottom strong')?.textContent,
          image: document.querySelector('.composed-catalog__image img')?.getAttribute('src'),
          cartButtons: document.querySelectorAll('[data-cart-add]').length,
          leadButtons: document.querySelectorAll('[data-open-lead]').length,
          unresolved: /\{\{[^{}]+\}\}/.test(rendered),
          noRuntime: CatalogSections.renderComposedSection(section) === '',
          css: !!document.querySelector('style[data-composed-catalog]'),
        };
      }, { id, copy, products: response.products });
      assert.equal(result.cardCount, 18);
      assert.deepEqual(result.names, response.products.map((item) => item.name));
      assert.match(result.price, /25\.50/);
      assert.equal(result.image, response.products[0].imageUrl);
      assert.equal(result.cartButtons, id === sectionIds[0] ? 18 : 0);
      assert.equal(result.leadButtons, id === sectionIds[0] ? 0 : 18);
      assert.equal(result.unresolved, false);
      assert.equal(result.noRuntime, true);
      assert.equal(result.css, true);
      for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 844 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
      }
      await page.setViewportSize({ width: 1440, height: 900 });
    }
  } finally {
    await browser.close();
  }
});

test('quote-only, no stock, empty catalog and foreign-store data fail without a fabricated price', async () => {
  const { renderCatalogItems } = await import('../composed-catalog.js');
  const runtime = { businessId: 'owned', salesEnabled: true, language: 'en' };
  const items = [product(1, { quoteOnly: true, price: null }), product(2, { stock: 0 })];
  const rendered = renderCatalogItems(sectionIds[0], items, copy, runtime);
  assert.match(rendered, /Request a quote/);
  assert.match(rendered, /data-open-lead/);
  assert.match(rendered, /Sold out/);
  assert.doesNotMatch(rendered, /data-cart-add/);
  assert.doesNotMatch(rendered, /\$0\.00/);
  assert.equal((renderCatalogItems(sectionIds[0], [product(3)], copy, runtime).match(/data-catalog-item(?=\s)/g) || []).length, 1);
  assert.match(renderCatalogItems(sectionIds[0], [], copy, runtime), /No items available/);
  assert.equal(renderCatalogItems(sectionIds[0], [product(1, { businessId: 'other' })], copy, runtime), null);
  assert.equal(renderCatalogItems(sectionIds[0], [product(1, { quoteOnly: true, price: 5 })], copy, runtime), null);
  assert.equal(renderCatalogItems(sectionIds[0], [product(1, { imageUrl: 'javascript:alert(1)' })], copy, runtime), null);
  assert.equal(renderCatalogItems(sectionIds[0], [product(1), product(1)], copy, runtime), null);
  assert.equal(renderCatalogItems(sectionIds[0], [product(1)], { ...copy, add_label: '' }, runtime), null);
  assert.match(renderCatalogItems(sectionIds[2], [product(1, { name: '<script>alert(1)</script>' })], copy, runtime), /&lt;script&gt;/);
});
