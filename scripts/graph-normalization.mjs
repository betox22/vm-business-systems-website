import { build } from 'esbuild';
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const names = ['lockSchemaToExecutableTemplate', 'enforceSelectedTemplateArchitecture', 'applyDesignIntelligence', 'prepareWebsiteConfig'];
const baselineCommit = '27660558106041c57d891cc68c0a5154600b0d80';

export async function normalizeDocument(schema, { verifiedContract, baseline = false, sourceTransform, payload = {} } = {}) {
  const bundle = await build({ absWorkingDir: root, bundle: true, write: false, format: 'iife', logLevel: 'silent',
    alias: { '@kreaton/shared-commerce-cart': path.join(root, 'shared-commerce-cart.js') },
    stdin: { resolveDir: root, contents: `import {${names.join(',')}} from './src/ai-builder/index.js';
import {registerServerVerifiedGraphDocument} from './src/ai-builder/graph-normalization-policy.js';
import {renderWebsite as builderRenderer} from './src/ai-builder/renderers.js';
import {renderWebsite as publicRenderer} from './site-viewer.js';
import {createInternalGraphPresentationContext} from './src/ai-builder/mega-retail-policy.js';
globalThis.normalizationAPI={${names.join(',')},registerServerVerifiedGraphDocument,builderRenderer,publicRenderer,createInternalGraphPresentationContext};` },
    plugins: [{ name: 'normalization-verification', setup(b) {
      b.onResolve({ filter: /^\.\/shared-site-motion\.js/ }, args => args.resolveDir === root.replace(/[\\/]$/, '')
        ? { path: path.join(root, 'src/ai-builder/shared-site-motion.js') } : undefined);
      b.onLoad({ filter: /[\\/]ai-builder[\\/]index\.js$/ }, async args => {
        let source = baseline
          ? execFileSync('git', ['show', `${baselineCommit}:src/ai-builder/index.js`], { cwd: root, encoding: 'utf8', maxBuffer: 5_000_000 })
          : await readFile(args.path, 'utf8');
        if (baseline) for (const name of names.slice(0, 3)) source = source.replace(`function ${name}(`, `export function ${name}(`);
        if (sourceTransform) source = sourceTransform(source);
        return { contents: source, loader: 'js' };
      });
      b.onResolve({ filter: /mega-retail-policy\.js(?:\?.*)?$/ }, () => ({ path: path.join(root, 'src/ai-builder/mega-retail-policy.js') }));
    } }],
  });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce', locale: 'en-US', serviceWorkers: 'block' });
    await page.route('**/*', route => route.request().url() === 'https://normalization.invalid/'
      ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head></head><body></body></html>' }) : route.abort());
    await page.clock.install({ time: new Date('2026-09-19T12:00:00Z') });
    await page.clock.pauseAt(new Date('2026-09-19T12:00:01Z'));
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('https://normalization.invalid/');
    await page.evaluate(() => {
      const meta = document.createElement('meta'); meta.httpEquiv = 'Content-Security-Policy';
      meta.content = "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src 'none'; connect-src 'none'; font-src 'none'; base-uri 'none'";
      document.head.append(meta);
      Math.random = () => 0.375;
    });
    await page.evaluate(bundle.outputFiles[0].text);
    const output = await page.evaluate(({ schema, verifiedContract, names, payload }) => {
      let value = structuredClone(schema);
      const original = JSON.stringify(value);
      if (verifiedContract) normalizationAPI.registerServerVerifiedGraphDocument(value, verifiedContract);
      const trace = [];
      for (let round = 1; round <= 2; round++) {
        for (const name of names) {
          const before = JSON.stringify(value);
          value = normalizationAPI[name](value, payload, null);
          trace.push({ round, function: name, unchanged: before === JSON.stringify(value),
            pages: value.pages.map(p => ({ key: p.page_key, sections: p.sections.map(s => ({ id: s.id, type: s.type })) })) });
        }
      }
      return { document: value, trace, unchanged: JSON.stringify(value) === original };
    }, { schema, verifiedContract, names, payload });
    const renderings = [];
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const renderer of ['builderRenderer', 'publicRenderer']) {
        for (const { page_key: pageKey } of output.document.pages) {
          const html = await page.evaluate(({ schema, renderer, pageKey, verifiedContract }) => {
            const context = { isClientPreviewMode: true };
            if (verifiedContract) context.graphPresentation = normalizationAPI.createInternalGraphPresentationContext();
            document.body.innerHTML = normalizationAPI[renderer](structuredClone(schema), pageKey, context);
            return document.body.innerHTML;
          }, { schema: output.document, renderer, pageKey, verifiedContract });
          renderings.push({ width, renderer, pageKey, html, sha256: createHash('sha256').update(html).digest('hex') });
        }
      }
    }
    if (errors.length) throw new Error('normalization_runtime_error');
    return { ...output, renderings, normalizerDigest: createHash('sha256').update(bundle.outputFiles[0].text).digest('hex'),
      documentSHA256: createHash('sha256').update(JSON.stringify(output.document)).digest('hex') };
  } finally { await browser.close(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    let input = '';
    for await (const chunk of process.stdin) { input += chunk; if (input.length > 1_000_000) throw Error('document_too_large'); }
    const request = JSON.parse(input);
    process.stdout.write(JSON.stringify(await normalizeDocument(request.schema, { verifiedContract: request.verifiedContract })));
  } catch { process.stderr.write('normalization_failed\n'); process.exitCode = 1; }
}
