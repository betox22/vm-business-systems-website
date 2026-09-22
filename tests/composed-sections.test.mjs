import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { runInNewContext } from 'node:vm';
import { normalizeDocument } from '../scripts/graph-normalization.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const sectionId = 'corporate-company-pro--home--corporate-hero';

function composedSection(overrides = {}) {
  return {
    id: 'custom-hero', type: 'composed', order: 2, section_id: sectionId,
    copy_bindings: {
      'business.industry': 'Industrial design', headline: 'Built for tomorrow',
      subtitle: 'Purposeful work', primary_button: 'Explore', secondary_button: 'Contact',
    },
    image_bindings: { image_1: 'https://images.example.test/workshop.jpg' },
    ...overrides,
  };
}

async function bundledViewer() {
  const output = await build({ absWorkingDir: root, entryPoints: ['site-viewer.js'], bundle: true,
    write: false, format: 'iife', globalName: 'ComposedViewer', logLevel: 'silent',
    plugins: [{ name: 'motion-path', setup(builder) {
      builder.onResolve({ filter: /^\.\/shared-site-motion\.js/ }, () => ({ path: path.join(root, 'src/ai-builder/shared-site-motion.js') }));
    } }],
  });
  return output.outputFiles[0].text;
}

async function bundledBuilderPreview() {
  const output = await build({ absWorkingDir: root, bundle: true, write: false,
    format: 'iife', logLevel: 'silent',
    alias: { '@kreaton/shared-commerce-cart': path.join(root, 'shared-commerce-cart.js') },
    stdin: { resolveDir: root, contents: `import { renderWebsite } from './src/ai-builder/renderers.js';
import { hasUnloadedComposedSections, preloadComposedSections } from './composed-sections.js';
globalThis.ComposedBuilderPreview = { renderWebsite, hasUnloadedComposedSections, preloadComposedSections };` },
  });
  return output.outputFiles[0].text;
}

test('published viewer renders real composed HTML, bindings and scoped CSS', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.route('https://composed.test/**', async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname === '/') return route.fulfill({ contentType: 'text/html', body: '<h1 id="outside">Outside</h1>' });
      const match = /^\/templates\/sections\/([a-z0-9-]+)\/(manifest\.json|section\.html|section\.css)$/.exec(pathname);
      if (!match) return route.abort();
      const body = await readFile(path.join(root, 'templates/sections', match[1], match[2]), 'utf8');
      return route.fulfill({ contentType: match[2].endsWith('json') ? 'application/json' : 'text/plain', body });
    });
    await page.goto('https://composed.test/');
    await page.evaluate(await bundledViewer());
    const schema = { pages: [{ page_key: 'home', sections: [composedSection()] }], business: { name: 'Example' } };
    const result = await page.evaluate(async (value) => {
      await ComposedViewer.preloadComposedSections(value);
      document.body.insertAdjacentHTML('beforeend', ComposedViewer.renderWebsite(value));
      const section = document.querySelector('div[data-composed-section]');
      return {
        headline: section.querySelector('h1').textContent,
        subtitle: section.querySelector('p').textContent,
        image: section.querySelector('img').getAttribute('src'),
        css: document.querySelector(`style[data-composed-section="${value.pages[0].sections[0].section_id}"]`)?.textContent,
        insideFont: getComputedStyle(section.querySelector('h1')).fontSize,
        outsideFont: getComputedStyle(document.querySelector('#outside')).fontSize,
      };
    }, schema);
    assert.equal(result.headline, 'Built for tomorrow');
    assert.equal(result.subtitle, 'Purposeful work');
    assert.equal(result.image, 'https://images.example.test/workshop.jpg');
    assert.match(result.css, /@scope/);
    assert.notEqual(result.insideFont, result.outsideFont);
    const unsafe = await page.evaluate((value) => {
      value.pages[0].sections[0].copy_bindings.headline = '<script>alert(1)</script>';
      return ComposedViewer.renderWebsite(value);
    }, schema);
    assert.match(unsafe, /&lt;script&gt;/);
    assert.doesNotMatch(unsafe, /<script>alert/);
    const catalog = { pages: [{ page_key: 'home', sections: [composedSection({
      section_id: 'corporate-company-pro--catalog--services-grid',
      copy_bindings: { 'business.tone': 'Focused', title: 'Services', text: 'Our work',
        'product.name': 'Prototype', 'product.description': 'A design service',
        'product.price_label': '$25', 'product.category': 'Design' },
    })] }] };
    const catalogResult = await page.evaluate(async (value) => {
      await ComposedViewer.preloadComposedSections(value);
      document.body.insertAdjacentHTML('beforeend', ComposedViewer.renderWebsite(value));
      const section = document.querySelector('div[data-composed-section="corporate-company-pro--catalog--services-grid"]');
      return { title: section.querySelector('h2').textContent, onerror: section.querySelector('img').hasAttribute('onerror') };
    }, catalog);
    assert.equal(catalogResult.title, 'Services');
    assert.equal(catalogResult.onerror, false);
    const quote = { pages: [{ page_key: 'home', sections: [composedSection({ section_id: 'quote-upload--custom-order' })] }] };
    assert.equal(await page.evaluate(async (value) => {
      await ComposedViewer.preloadComposedSections(value);
      return ComposedViewer.renderWebsite(value).includes('data-composed-section=');
    }, quote), false);
  } finally { await browser.close(); }
});

test('builder reconstruction retains composed sections and edited bindings', async () => {
  const source = await readFile(path.join(root, 'src/ai-builder/index.js'), 'utf8');
  const start = source.indexOf('function mergeLockedTemplatePage(');
  const end = source.indexOf('\nfunction executablePagesForTemplate(', start);
  assert.ok(start > 0 && end > start);
  const mergePage = runInNewContext(`${source.slice(start, end)}; mergeLockedTemplatePage`, {
    arrayValue: (value) => Array.isArray(value) ? value : [],
    slugify: (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  });
  const first = composedSection({ copy_bindings: { ...composedSection().copy_bindings, headline: 'Owner edit' } });
  const second = composedSection({ id: 'custom-footer', section_id: 'corporate-company-pro--global--footer' });
  const result = mergePage(
    { page_key: 'home', sections: [{ id: 'locked-hero', type: 'Hero', order: 1 }] },
    { page_key: 'home', sections: [first, second] },
  );
  assert.deepEqual(JSON.parse(JSON.stringify(result.sections.slice(1))), [first, second]);
});

test('builder normalization keeps multiple composed sections through every real stage', async () => {
  const schema = JSON.parse(await readFile(new URL('./fixtures/graph-presentation.json', import.meta.url), 'utf8'));
  const first = composedSection({ copy_bindings: { ...composedSection().copy_bindings, headline: 'Owner edit' } });
  const second = composedSection({ id: 'custom-footer', section_id: 'premium-product-store--home--premium-cta' });
  schema.pages[0].sections.push(first, second);

  const result = await normalizeDocument(schema);
  const sections = result.document.pages[0].sections.filter((section) => section.type === 'composed');

  assert.deepEqual(sections.map((section) => section.id), [first.id, second.id]);
  assert.deepEqual(sections.map((section) => section.copy_bindings), [first.copy_bindings, second.copy_bindings]);
  assert.ok(result.trace.every((step) => step.pages[0].sections.filter((section) => section.type === 'composed').length === 2));
});

test('live editor renderPreview paints composed copy and image after preload', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.route('https://composed.test/**', async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname === '/') return route.fulfill({ contentType: 'text/html', body: '<div id="preview"></div>' });
      const match = /^\/templates\/sections\/([a-z0-9-]+)\/(manifest\.json|section\.html|section\.css)$/.exec(pathname);
      if (!match) return route.abort();
      const body = await readFile(path.join(root, 'templates/sections', match[1], match[2]), 'utf8');
      return route.fulfill({ contentType: match[2].endsWith('json') ? 'application/json' : 'text/plain', body });
    });
    await page.goto('https://composed.test/');
    await page.evaluate(await bundledBuilderPreview());
    const source = await readFile(path.join(root, 'src/ai-builder/index.js'), 'utf8');
    const start = source.indexOf('export function renderPreview() {');
    const end = source.indexOf('\nfunction bindCatalogSearchInteractions(', start);
    assert.ok(start > 0 && end > start);
    const renderPreviewSource = source.slice(start, end).replace('export function', 'function');
    const schema = JSON.parse(await readFile(new URL('./fixtures/graph-presentation.json', import.meta.url), 'utf8'));
    schema.pages[0].sections.push(composedSection());
    await page.evaluate(({ code, value }) => {
      const previewFrame = document.querySelector('#preview');
      const builderState = { currentSchema: value, selectedPageKey: 'home', selectedStudioSectionId: '' };
      const noop = () => {};
      const dependencies = {
        builderState, previewFrame, studioSelectionToolbar: { hidden: false },
        renderWebsite: ComposedBuilderPreview.renderWebsite,
        hasUnloadedComposedSections: ComposedBuilderPreview.hasUnloadedComposedSections,
        preloadComposedSections: ComposedBuilderPreview.preloadComposedSections,
        schemaForPreview: () => value, cssEscape: (text) => text,
        clearInlineEditState: noop, applyGeneratedFavicon: noop, restoreInlineEditSelection: noop,
        renderStudioProgress: noop, renderEditor: noop, selectStudioSection: noop,
        bindInlineEditing: noop, bindSharedPreviewMotion: noop, bindCatalogSearchInteractions: noop,
      };
      const renderPreview = new Function(...Object.keys(dependencies), `${code}; return renderPreview;`)(...Object.values(dependencies));
      renderPreview();
    }, { code: renderPreviewSource, value: schema });
    await page.waitForFunction(() => document.querySelector('#preview [data-composed-section] h1')?.textContent === 'Built for tomorrow');
    assert.equal(await page.locator('#preview [data-composed-section] img').first().getAttribute('src'), 'https://images.example.test/workshop.jpg');
    assert.match(await page.locator('style[data-composed-section]').first().textContent(), /@scope/);
  } finally { await browser.close(); }
});
