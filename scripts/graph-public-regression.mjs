import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const BASELINE = '27660558106041c57d891cc68c0a5154600b0d80';
const changedDependencies = new Set(['site-viewer.js', 'storefront-checkout.js', 'src/ai-builder/mega-retail-policy.js']);
const digest = value => createHash('sha256').update(value).digest('hex');

export async function comparePublicBoot(payload) {
  const bundles = {};
  for (const revision of ['before', 'after']) {
    const result = await build({ absWorkingDir: root, entryPoints: ['site-viewer.js'], bundle: true,
      write: false, format: 'esm', logLevel: 'silent', plugins: [{ name: 'published-layout', setup(b) {
        b.onResolve({ filter: /^\.\/shared-site-motion\.js/ }, () => ({ path: path.join(root, 'src/ai-builder/shared-site-motion.js') }));
        b.onLoad({ filter: /\.js(?:\?.*)?$/ }, async args => {
          const rel = path.relative(root, args.path).replaceAll('\\', '/');
          if (revision === 'before' && changedDependencies.has(rel)) {
            return { contents: execFileSync('git', ['show', `${BASELINE}:${rel}`], { cwd: root, encoding: 'utf8' }), loader: 'js' };
          }
          return undefined;
        });
      } }] });
    bundles[revision] = result.outputFiles[0].text;
  }
  const browser = await chromium.launch();
  const results = [];
  try {
    for (const width of [1440, 390, 320]) {
      for (const { page_key: pageKey } of payload.schema.pages) {
        const outputs = {};
        for (const revision of ['before', 'after']) {
          const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
          const requests = [];
          await context.route('**/*', async route => {
            const url = new URL(route.request().url());
            if (url.pathname === `/public/sites/${payload.site_id}`) {
              requests.push({ method: route.request().method(), path: url.pathname });
              return route.fulfill({ json: payload });
            }
            if (url.hostname !== 'public-regression.invalid') return route.abort();
            if (url.pathname === '/site-viewer.js') return route.fulfill({ contentType: 'text/javascript', body: bundles[revision] });
            if (url.pathname === '/luma-config.js') return route.fulfill({ contentType: 'text/javascript', body: 'window.LUMA_API_BASE_URL = location.origin;' });
            const file = path.resolve(root, `.${url.pathname}`);
            if (!file.startsWith(path.resolve(root) + path.sep)) return route.abort();
            try { return await route.fulfill({ path: file }); } catch { return route.abort(); }
          });
          const page = await context.newPage();
          const errors = [];
          page.on('pageerror', error => errors.push(error.message));
          await page.goto(`https://public-regression.invalid/site.html?site_id=${encodeURIComponent(payload.site_id)}#${pageKey}`);
          await page.waitForFunction(() => document.querySelector('#publicSite .mega-retail-header'));
          await page.waitForLoadState('networkidle');
          assert.deepEqual(errors, []);
          assert.deepEqual(requests, [{ method: 'GET', path: `/public/sites/${payload.site_id}` }]);
          outputs[revision] = await page.locator('#publicSite').innerHTML();
          await context.close();
        }
        assert.equal(outputs.after, outputs.before, `${pageKey}:${width} public HTML changed`);
        results.push({ pageKey, width, byteIdentical: true, bytes: Buffer.byteLength(outputs.after),
          beforeSHA256: digest(outputs.before), afterSHA256: digest(outputs.after) });
      }
    }
    return { baseline: BASELINE, siteId: payload.site_id, payloadSHA256: digest(JSON.stringify(payload)),
      entry: 'site.html -> site-viewer.js -> GET /public/sites/{id} -> renderCurrentPublicPage', results };
  } finally { await browser.close(); }
}
