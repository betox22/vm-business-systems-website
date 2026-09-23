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
      industry: 'Industrial design', headline: 'Built for tomorrow', subtitle: 'Purposeful work',
      primary_button: 'Explore', primary_page_key: 'services', secondary_button: 'Contact',
      secondary_page_key: 'contact', image_alt: 'Industrial design workshop',
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
  const first = composedSection({ copy_bindings: { ...composedSection().copy_bindings, headline: 'Owner edit' },
    control_bindings: { account: { label: 'My account', action: 'modal' }, cart: { label: 'Basket' } } });
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

test('composed header and footer replace fixed shells around a real page at variable navigation lengths', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.route('https://composed.test/**', async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname === '/') return route.fulfill({ contentType: 'text/html', body: '<div id="mount"></div>' });
      const match = /^\/templates\/sections\/([a-z0-9-]+)\/(manifest\.json|section\.html|section\.css)$/.exec(pathname);
      if (!match) return route.abort();
      const body = await readFile(path.join(root, 'templates/sections', match[1], match[2]), 'utf8');
      return route.fulfill({ contentType: match[2].endsWith('json') ? 'application/json' : 'text/plain', body });
    });
    await page.goto('https://composed.test/');
    await page.evaluate(await bundledViewer());
    await page.evaluate(await bundledBuilderPreview());
    const base = JSON.parse(await readFile(new URL('./fixtures/graph-presentation.json', import.meta.url), 'utf8'));
    for (const count of [1, 2, 5]) {
      const schema = structuredClone(base);
      schema.active_template = { id: 'corporate-company-pro' };
      schema.pages = Array.from({ length: count }, (_, index) => ({
        page_key: index ? `page_${index}` : 'home', title: index ? `Page ${index}` : 'Home',
        order: index + 1, sections: index ? [] : structuredClone(base.pages[0].sections),
      }));
      schema.navigation = schema.pages.map(({ page_key, title }) => ({ label: title, page_key }));
      const navigation = schema.navigation.map(({ label, page_key }) => ({ label, page_key }));
      const common = { 'business.name': schema.business.name, home_page_key: 'home' };
      schema.pages[0].sections.push(
        { id: 'composed-shared-header', type: 'composed', order: -1, section_id: 'shared--header',
          copy_bindings: { ...common, navigation_label: 'Site navigation' },
          list_bindings: { navigation }, image_bindings: {} },
        { id: 'composed-shared-footer', type: 'composed', order: 1000000, section_id: 'shared--footer',
          copy_bindings: { ...common, footer_navigation_label: 'Site links', footer_text: 'Projection QA catalog' },
          list_bindings: { navigation }, image_bindings: {} },
      );
      const result = await page.evaluate(async (value) => {
        await ComposedViewer.preloadComposedSections(value);
        await ComposedBuilderPreview.preloadComposedSections(value);
        const publicHtml = ComposedViewer.renderWebsite(value, 'home');
        const builderHtml = ComposedBuilderPreview.renderWebsite(value, 'home');
        document.querySelector('#mount').innerHTML = publicHtml;
        const shell = document.querySelector('.rendered-site');
        const header = shell.querySelector('.composed-site-header');
        const footer = shell.querySelector('.composed-site-footer');
        const links = [...header.querySelectorAll('nav a[data-page-link]')];
        return {
          publicHtml, builderHtml, headerCount: shell.querySelectorAll('header').length,
          footerCount: shell.querySelectorAll('footer').length,
          fixedCount: shell.querySelectorAll('.rendered-nav, .rendered-footer').length,
          bodyPresent: shell.textContent.includes('Tools for daily projects'),
          links: links.map((link) => ({ label: link.textContent, pageKey: link.dataset.pageLink })),
          footerLinks: footer.querySelectorAll('nav a[data-page-link]').length,
          noOverflow: document.documentElement.scrollWidth <= window.innerWidth,
          headerDisplay: getComputedStyle(header).display,
          footerDisplay: getComputedStyle(footer).display,
          headerBottom: header.getBoundingClientRect().bottom,
          footerTop: footer.getBoundingClientRect().top,
        };
      }, schema);
      assert.equal(result.headerCount, 1);
      assert.equal(result.footerCount, 1);
      assert.equal(result.fixedCount, 0);
      assert.equal(result.bodyPresent, true);
      assert.deepEqual(result.links, navigation.map(({ label, page_key }) => ({ label, pageKey: page_key })));
      assert.equal(result.footerLinks, count);
      assert.equal(result.noOverflow, true);
      assert.equal(result.headerDisplay, 'flex');
      assert.equal(result.footerDisplay, 'flex');
      assert.ok(result.headerBottom <= result.footerTop);
      assert.match(result.builderHtml, /composed-site-header/);
      assert.match(result.builderHtml, /composed-site-footer/);
      assert.doesNotMatch(result.builderHtml, /class="rendered-nav|class="rendered-footer"/);
      const secondary = await page.evaluate((value) => ComposedViewer.renderWebsite(value, value.pages.at(-1).page_key), schema);
      assert.match(secondary, /composed-site-header/);
      assert.match(secondary, /composed-site-footer/);
      if (count === 1) {
        const unsafe = structuredClone(schema);
        unsafe.pages[0].sections.find((section) => section.section_id === 'shared--header')
          .list_bindings.navigation[0].label = '<img src=x onerror=alert(1)>';
        const escaped = await page.evaluate((value) => ComposedViewer.renderWebsite(value, 'home'), unsafe);
        assert.match(escaped, /&lt;img src=x onerror=alert\(1\)&gt;/);
        assert.doesNotMatch(escaped, /<img src=x onerror=alert\(1\)>/);
        unsafe.pages[0].sections.find((section) => section.section_id === 'shared--header')
          .list_bindings.navigation[0].page_key = 'javascript:alert(1)';
        const rejected = await page.evaluate((value) => ComposedViewer.renderWebsite(value, 'home'), unsafe);
        assert.match(rejected, /class="rendered-nav/);
        assert.doesNotMatch(rejected, /composed-site-header/);
        const commerce = structuredClone(schema);
        commerce.active_template = { id: 'mega-retail-store' };
        commerce.pages[0].sections.find((section) => section.section_id === 'shared--header').control_bindings = {
          search: { label: 'Search products' }, cart: { label: 'Cart' },
          account: { label: 'Account', action: 'modal' },
          departments: { label: 'Departments', items: [{ label: 'Tools', category: 'Tools' }] },
        };
        const retained = await page.evaluate((value) => {
          const publicHtml = ComposedViewer.renderWebsite(value, 'home');
          const builderHtml = ComposedBuilderPreview.renderWebsite(value, 'home');
          return { publicHtml, builderHtml };
        }, commerce);
        assert.match(retained.publicHtml, /composed-site-header/);
        assert.match(retained.publicHtml, /data-cart-open/);
        assert.match(retained.builderHtml, /composed-site-header/);
        assert.doesNotMatch(retained.publicHtml, /class="mega-retail-header/);
      }
    }
  } finally { await browser.close(); }
});

test('published Mega Retail keeps search, cart and account interactions with the composed shell', async () => {
  const browser = await chromium.launch();
  try {
    const baseline = JSON.parse(await readFile(new URL('./fixtures/graph-presentation.json', import.meta.url), 'utf8'));
    baseline.business.name = 'ElectroHub QA';
    baseline.catalog_items = [{ id: 'drill-1', product_id: 'prod-drill-1', business_id: 'store-qa',
      name: 'Cordless drill', category: 'Tools', description: 'Compact drill', price: 25,
      price_type: 'fixed', price_label: '$25', inventory_quantity: 4 }];
    const composed = structuredClone(baseline);
    const navigation = [{ label: 'Home', page_key: 'home' }];
    composed.pages[0].sections.push(
      { id: 'composed-shared-header', type: 'composed', order: -1, section_id: 'shared--header',
        copy_bindings: { 'business.name': 'ElectroHub QA', home_page_key: 'home', navigation_label: 'Site navigation' },
        list_bindings: { navigation }, image_bindings: { brand_logo: '/images/electrohub.png' }, control_bindings: {
          departments: { label: 'Departments', items: [{ label: 'Tools', category: 'Tools' }] },
          search: { label: 'Search products' }, cart: { label: 'Cart' },
          account: { label: 'Account', action: 'modal' },
        } },
      { id: 'composed-shared-footer', type: 'composed', order: 1000000, section_id: 'shared--footer',
        copy_bindings: { 'business.name': 'ElectroHub QA', home_page_key: 'home',
          footer_navigation_label: 'Site links', footer_text: 'ElectroHub QA' },
        list_bindings: { navigation }, image_bindings: { brand_logo: '/images/electrohub.png' }, control_bindings: {} },
    );
    const results = [];
    for (const schema of [baseline, composed]) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.route('https://composed.test/**', async (route) => {
        const pathname = new URL(route.request().url()).pathname;
        if (pathname === '/') return route.fulfill({ contentType: 'text/html', body: '<div id="publicSite"></div>' });
        if (pathname === '/public/sites/site-qa') return route.fulfill({ contentType: 'application/json', body: JSON.stringify({
          site_id: 'site-qa', business_id: 'store-qa', schema, catalog_items: schema.catalog_items,
          commerce: { salesEnabled: true, checkoutModel: 'single_store_checkout' },
        }) });
        const match = /^\/templates\/sections\/([a-z0-9-]+)\/(manifest\.json|section\.html|section\.css)$/.exec(pathname);
        if (!match) return route.abort();
        const body = await readFile(path.join(root, 'templates/sections', match[1], match[2]), 'utf8');
        return route.fulfill({ contentType: match[2].endsWith('json') ? 'application/json' : 'text/plain', body });
      });
      await page.addInitScript(() => { window.LUMA_API_BASE_URL = 'https://composed.test'; });
      await page.goto('https://composed.test/?site_id=site-qa');
      await page.evaluate(await bundledViewer());
      await page.locator('.rendered-site [data-catalog-search-form]').waitFor();
      if (schema === composed) {
        assert.equal(await page.locator('.composed-site-header__brand img').getAttribute('src'), '/images/electrohub.png');
        const layout = await page.evaluate(() => {
          const header = document.querySelector('.composed-site-header');
          const main = document.querySelector('.mega-retail-bento');
          const footer = document.querySelector('.composed-site-footer');
          return { overflow: document.documentElement.scrollWidth > window.innerWidth,
            headerBeforeBody: header.getBoundingClientRect().bottom <= main.getBoundingClientRect().top,
            footerAfterBody: footer.getBoundingClientRect().top >= main.getBoundingClientRect().bottom };
        });
        assert.deepEqual(layout, { overflow: false, headerBeforeBody: true, footerAfterBody: true });
      }
      const search = page.locator('[data-catalog-search-form] input[name="catalog-search"]');
      await search.fill('no match');
      await page.locator('[data-catalog-search-form] button[type="submit"]').click();
      assert.equal(await page.locator('[data-catalog-item]').first().isHidden(), true);
      await search.fill('drill');
      await page.locator('[data-catalog-search-form] button[type="submit"]').click();
      assert.equal(await page.locator('[data-catalog-item]').first().isVisible(), true);
      await page.locator('[data-cart-add]').first().click();
      assert.equal(await page.locator('[data-cart-count]').first().textContent(), '1');
      await page.locator('[data-cart-open]').click();
      assert.equal(await page.locator('.kreaton-cart-line strong').first().textContent(), 'Cordless drill');
      await page.locator('[data-cart-close]').first().click();
      await page.locator('[data-account-open]').click();
      assert.equal(await page.locator('.commerce-modal [name="email"]').count(), 1);
      await page.locator('[data-close-commerce]').click();
      if (schema === composed) {
        const invalid = structuredClone(schema);
        invalid.pages[0].sections.find((section) => section.section_id === 'shared--header')
          .control_bindings.account = { label: 'Account', action: 'page', page_key: 'javascript:alert(1)' };
        const rejected = await page.evaluate((value) => ComposedViewer.renderWebsite(value, 'home'), invalid);
        assert.doesNotMatch(rejected, /composed-site-header/);
        assert.match(rejected, /mega-retail-header/);
        const changed = structuredClone(schema);
        changed.catalog_items[0].category = 'Power tools';
        const liveHeader = await page.evaluate((value) => {
          const before = JSON.stringify(value);
          const html = ComposedViewer.renderWebsite(value, 'home');
          return { html, unchanged: JSON.stringify(value) === before };
        }, changed);
        assert.match(liveHeader.html, /data-catalog-category="power tools"/);
        assert.equal(liveHeader.unchanged, true);
      }
      results.push({ composed: await page.locator('.composed-site-header').count(),
        legacy: await page.locator('.mega-retail-header').count(), errors });
      await page.close();
    }
    assert.deepEqual(results, [
      { composed: 0, legacy: 1, errors: [] },
      { composed: 1, legacy: 0, errors: [] },
    ]);
  } finally { await browser.close(); }
});

test('B2B composed shell navigates without commerce controls', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.route('https://composed.test/**', async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname === '/') return route.fulfill({ contentType: 'text/html', body: '<div id="publicSite"></div>' });
      if (pathname === '/public/sites/site-b2b') return route.fulfill({ contentType: 'application/json', body: JSON.stringify({
        site_id: 'site-b2b', business_id: 'store-b2b', catalog_items: [],
        commerce: { salesEnabled: false, checkoutModel: null },
        schema: {
          business: { name: 'Northstar', selectedLanguage: 'en' }, active_template: { id: 'b2b-saas-enterprise-pro' },
          pages: [
            { page_key: 'home', title: 'Home', order: 1, sections: [
              { id: 'header', type: 'composed', section_id: 'shared--header', order: -1,
                copy_bindings: { 'business.name': 'Northstar', home_page_key: 'home', navigation_label: 'Site navigation' },
                list_bindings: { navigation: [{ label: 'Home', page_key: 'home' }, { label: 'Contact', page_key: 'contact' }] },
                control_bindings: { primary_action: { label: 'Start', page_key: 'contact' } }, image_bindings: {} },
              { id: 'footer', type: 'composed', section_id: 'shared--footer', order: 1000000,
                copy_bindings: { 'business.name': 'Northstar', home_page_key: 'home', footer_navigation_label: 'Site links', footer_text: 'Northstar' },
                list_bindings: { navigation: [{ label: 'Home', page_key: 'home' }, { label: 'Contact', page_key: 'contact' }] },
                image_bindings: {} },
            ] },
            { page_key: 'contact', title: 'Contact', order: 2, sections: [] },
          ],
        },
      }) });
      const match = /^\/templates\/sections\/([a-z0-9-]+)\/(manifest\.json|section\.html|section\.css)$/.exec(pathname);
      if (!match) return route.abort();
      const body = await readFile(path.join(root, 'templates/sections', match[1], match[2]), 'utf8');
      return route.fulfill({ contentType: match[2].endsWith('json') ? 'application/json' : 'text/plain', body });
    });
    await page.addInitScript(() => { window.LUMA_API_BASE_URL = 'https://composed.test'; });
    await page.goto('https://composed.test/?site_id=site-b2b');
    await page.evaluate(await bundledViewer());
    await page.evaluate(await bundledBuilderPreview());
    await page.locator('.composed-site-header__primary').waitFor();
    assert.equal(await page.locator('[data-cart-open], [data-catalog-search-form]').count(), 0);
    const builderHtml = await page.evaluate(async () => {
      const site = await fetch('/public/sites/site-b2b').then((response) => response.json());
      await ComposedBuilderPreview.preloadComposedSections(site.schema);
      return ComposedBuilderPreview.renderWebsite(site.schema, 'home');
    });
    assert.match(builderHtml, /composed-site-header/);
    assert.match(builderHtml, /composed-site-footer/);
    assert.doesNotMatch(builderHtml, /class="b2b-saas-header|class="b2b-saas-footer/);
    await page.locator('.composed-site-header__primary').click();
    assert.equal(new URL(page.url()).hash, '#contact');
    assert.equal(await page.locator('.composed-site-footer').count(), 1);
  } finally { await browser.close(); }
});
