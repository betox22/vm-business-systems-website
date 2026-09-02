import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../css/corporate-premium.css', import.meta.url), 'utf8');
const i18n = await readFile(new URL('../js/corporate-i18n.js', import.meta.url), 'utf8');

test('la página principal presenta ListoKDS como producto real', async () => {
  assert.match(html, /vm-product-listokds/);
  assert.match(html, /https:\/\/listokds\.vmbusinesssystems\.com\//);
  assert.match(html, /images\/listokds-product-dashboard\.png/);
  assert.match(css, /\.vm-product-listokds/);
  await access(new URL('../images/listokds-product-dashboard.png', import.meta.url));
});

test('la tarjeta ListoKDS tiene contenido español e inglés', () => {
  assert.match(i18n, /listokdsBody: "Mesas, pedidos, cocina y caja/);
  assert.match(i18n, /listokdsBody: "Tables, orders, kitchen and checkout/);
  assert.match(i18n, /discoverListokds: "Discover ListoKDS"/);
});

