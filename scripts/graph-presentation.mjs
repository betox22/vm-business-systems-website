import { build } from 'esbuild';
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { collectPresentation } from './graph-presentation-dom.mjs';
import { enumeratePresentationStates } from './graph-presentation-states.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
export const PRESENTATION_VERSION = 'mega-retail-dom-v1';

export async function projectDocument(schema, { sourceTransform, trusted, onSurface } = {}) {
  if (JSON.stringify(schema).length > 1_000_000) throw new Error('document_too_large');
  if (schema?.pages?.length !== 1 || schema.pages[0].page_key !== 'home' ||
      (schema.active_template?.id || schema.selected_template?.id) !== 'mega-retail-store') {
    throw new Error('unsupported_presentation_scope');
  }
  const bundle = await build({
    absWorkingDir: root, bundle: true, write: false, metafile: true, format: 'iife',
    stdin: { contents: `import {renderWebsite as builder} from './src/ai-builder/renderers.js';
import {renderWebsite as publicRenderer, mountInternalGraphPresentation} from './site-viewer.js';
import {preloadComposedSections} from './composed-sections.js';
import {createInternalGraphPresentationContext} from './src/ai-builder/mega-retail-policy.js';
globalThis.graphPresentationRenderers = {builder, public: publicRenderer};
globalThis.mountGraphPresentation = mountInternalGraphPresentation;
globalThis.makeGraphPresentationContext = createInternalGraphPresentationContext;
globalThis.preloadGraphPresentationSections = preloadComposedSections;`, resolveDir: root },
    alias: { '@kreaton/shared-commerce-cart': path.join(root, 'shared-commerce-cart.js') },
    plugins: [{ name: 'source-mutation-tests', setup(b) {
      // Test-only dependency injection; the stdin/server entry never accepts this option.
      if (sourceTransform) b.onLoad({ filter: /(?:site-viewer|renderers)\.js$/ }, async (args) => ({
        contents: sourceTransform(await readFile(args.path, 'utf8'), args.path), loader: 'js',
      }));
    } }, { name: 'staged-motion-location', setup(b) {
      b.onResolve({ filter: /mega-retail-policy\.js(?:\?.*)?$/ }, () => ({ path: path.join(root, 'src/ai-builder/mega-retail-policy.js') }));
      b.onResolve({ filter: /^\.\/shared-site-motion\.js/ }, (args) => args.resolveDir === root.replace(/[\\/]$/, '')
        ? { path: path.join(root, 'src/ai-builder/shared-site-motion.js') } : undefined);
    } }],
    logLevel: 'silent',
  });
  const script = bundle.outputFiles[0].text;
  const css = await readFile(path.join(root, 'ai-builder.css'), 'utf8') + '\n' + await readFile(path.join(root, 'storefront-checkout.css'), 'utf8');
  const publicShell = await readFile(path.join(root, 'site.html'), 'utf8');
  const digest = createHash('sha256').update(script).update(css).update(collectPresentation.toString())
    .update(enumeratePresentationStates.toString()).update(publicShell).digest('hex');
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ serviceWorkers: 'block', locale: 'en-US' });
    const blocked = [];
    await context.route('**/*', async (route) => {
      const url = route.request().url();
      if (url === 'https://presentation.invalid/') {
        return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head></head><body></body></html>' });
      }
      const asset = /^https:\/\/presentation\.invalid\/templates\/sections\/([a-z0-9-]+)\/(manifest\.json|section\.html|section\.css)$/.exec(url);
      if (asset) return route.fulfill({ path: path.join(root, 'templates', 'sections', asset[1], asset[2]) });
      blocked.push({ type: route.request().resourceType() });
      return route.abort();
    });
    const page = await context.newPage();
    await page.clock.install({ time: new Date('2026-09-19T12:00:00Z') });
    await page.clock.pauseAt(new Date('2026-09-19T12:00:01Z'));
    const errors = [];
    page.on('pageerror', () => errors.push('renderer_runtime_error'));
    await page.goto('https://presentation.invalid/');
    await page.evaluate(script);
    await page.evaluate(async (documentSchema) => {
      await globalThis.preloadGraphPresentationSections(documentSchema);
    }, schema);
    // DevTools executes the trusted bundle; CSP denies scripts in candidate HTML.
    await page.evaluate(() => {
      const meta = document.createElement('meta');
      meta.httpEquiv = 'Content-Security-Policy';
      meta.content = "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src 'none'; font-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'";
      document.head.append(meta);
    });
    await page.evaluate((cssText) => {
      const style = document.createElement('style'); style.textContent = cssText; document.head.append(style);
    }, css);
    await page.evaluate(html => {
      const shell = new DOMParser().parseFromString(html, 'text/html');
      shell.querySelectorAll('style').forEach(style => document.head.append(style.cloneNode(true)));
    }, publicShell);
    const surfaces = [];
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 320, height: 800 }]) {
      await page.setViewportSize(viewport);
      for (const renderer of ['builder', 'public']) {
        const rendered = await page.evaluate(({ schema, renderer, trusted }) => {
          const documentCopy = structuredClone(schema);
          document.body.innerHTML = '<div id="projectionRoot"></div>';
          const target = document.querySelector('#projectionRoot');
          localStorage.clear(); sessionStorage.clear();
          if (trusted) {
            const site = { schema: documentCopy, catalog_items: documentCopy.catalog_items,
              site_id: trusted.siteId, business_id: trusted.businessId,
              commerce: { businessId: trusted.businessId, salesEnabled: true, checkoutModel: 'single_store_checkout' } };
            globalThis.presentationHarness = mountGraphPresentation(site, target,
              { graphPresentation: makeGraphPresentationContext(), isClientPreviewMode: true }, graphPresentationRenderers[renderer]);
          } else target.innerHTML = globalThis.graphPresentationRenderers[renderer](documentCopy, 'home', { isClientPreviewMode: true });
          const html = target.innerHTML;
          // Include collapsed details; inventory intentionally does not filter by visibility.
          target.querySelectorAll('details').forEach((element) => { element.open = true; });
          const mutationPaths = [];
          const compare = (a, b, path = '$') => {
            if (JSON.stringify(a) === JSON.stringify(b)) return;
            if (a && b && typeof a === 'object' && typeof b === 'object') {
              for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) compare(a[key], b[key], `${path}.${key}`);
            } else mutationPaths.push(path);
          };
          compare(schema, documentCopy);
          return { html, schemaUnchanged: !mutationPaths.length, mutationPaths };
        }, { schema, renderer, trusted });
        if (onSurface) await onSurface(page, { renderer, viewport });
        if (trusted) {
          const states = await enumeratePresentationStates(page, schema.catalog_items);
          const entries = states.flatMap(state => state.entries.map(entry => ({ ...entry, path: `${state.name}:${entry.path}` })));
          const violations = states.flatMap(state => state.violations.map(v => ({ ...v, path: `${state.name}:${v.path}` })));
          surfaces.push({ renderer, viewport, ...rendered, states, entries, violations });
        } else {
          const projection = await page.evaluate(collectPresentation, await page.$('#projectionRoot'));
          surfaces.push({ renderer, viewport, ...rendered, ...projection });
        }
      }
    }
    if (errors.length) throw new Error('renderer_runtime_error');
    return { version: PRESENTATION_VERSION, rendererDigest: digest,
      dependencies: Object.keys(bundle.metafile.inputs).sort(), surfaces, blockedRequests: blocked };
  } finally { await browser.close(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    let input = '';
    for await (const chunk of process.stdin) {
      input += chunk;
      if (input.length > 1_000_000) throw new Error('document_too_large');
    }
    const request = JSON.parse(input);
    process.stdout.write(JSON.stringify(await projectDocument(request.schema || request, { trusted: request.trusted })));
  } catch (_) {
    process.stderr.write('presentation_failed\n');
    process.exitCode = 1;
  }
}
