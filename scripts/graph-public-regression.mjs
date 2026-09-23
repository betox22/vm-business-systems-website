import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const digest = (value) => createHash('sha256').update(value).digest('hex');

export async function verifyPublicBoot(payload) {
  const bundle = await build({ absWorkingDir: root, entryPoints: ['site-viewer.js'], bundle: true,
    write: false, format: 'esm', logLevel: 'silent', plugins: [{ name: 'published-layout', setup(b) {
      b.onResolve({ filter: /^\.\/shared-site-motion\.js/ },
        () => ({ path: path.join(root, 'src/ai-builder/shared-site-motion.js') }));
    } }] });
  const browser = await chromium.launch();
  const results = [];
  try {
    for (const width of [1440, 390, 320]) {
      for (const { page_key: pageKey } of payload.schema.pages) {
        const context = await browser.newContext({
          viewport: { width, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block',
        });
        const requests = [];
        await context.route('**/*', async (route) => {
          const url = new URL(route.request().url());
          if (url.pathname === `/public/sites/${payload.site_id}`) {
            requests.push({ method: route.request().method(), path: url.pathname });
            return route.fulfill({ json: payload });
          }
          if (url.hostname !== 'public-regression.invalid') return route.abort();
          if (url.pathname === '/site-viewer.js') {
            return route.fulfill({ contentType: 'text/javascript', body: bundle.outputFiles[0].text });
          }
          if (url.pathname === '/luma-config.js') {
            return route.fulfill({ contentType: 'text/javascript', body: 'window.LUMA_API_BASE_URL = location.origin;' });
          }
          const file = path.resolve(root, `.${url.pathname}`);
          if (!file.startsWith(path.resolve(root) + path.sep)) return route.abort();
          try { return await route.fulfill({ path: file }); } catch { return route.abort(); }
        });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(`https://public-regression.invalid/site.html?site_id=${encodeURIComponent(payload.site_id)}#${pageKey}`);
        await page.waitForFunction(() => document.querySelector('#publicSite .composed-site-header'));
        await page.waitForLoadState('networkidle');
        assert.deepEqual(errors, []);
        assert.deepEqual(requests, [{ method: 'GET', path: `/public/sites/${payload.site_id}` }]);
        assert.equal(await page.locator('#publicSite .composed-site-footer').count(), 1);
        assert.equal(await page.locator('#publicSite .mega-retail-header, #publicSite .mega-retail-footer').count(), 0);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
        const html = await page.locator('#publicSite').innerHTML();
        results.push({ pageKey, width, bytes: Buffer.byteLength(html), SHA256: digest(html) });
        await context.close();
      }
    }
    return { siteId: payload.site_id, payloadSHA256: digest(JSON.stringify(payload)), results };
  } finally { await browser.close(); }
}
