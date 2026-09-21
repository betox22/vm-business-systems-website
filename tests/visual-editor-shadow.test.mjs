import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createSharedCommerceCart, resolveCatalogAction } from '../shared-commerce-cart.js';
import { createSharedSiteMotion, motionDataAttributes } from '../src/ai-builder/shared-site-motion.js';
import { limitPremiumHeadline, premiumSectionImage, PREMIUM_IMAGE_ROLES } from '../src/ai-builder/premium-product-policy.js';
import { resolveMegaRetailDepartmentTiles } from '../src/ai-builder/mega-retail-policy.js';

const pilots = JSON.parse(readFileSync(new URL('./fixtures/visual-editor-shadow.json', import.meta.url)));
const source = readFileSync(new URL('../site-viewer.js', import.meta.url), 'utf8');
function renderer() {
  const context = vm.createContext({ URLSearchParams, URL, console,
    window: { location: { search: '', hostname: 'test.invalid' }, addEventListener() {} },
    document: { querySelector() { return {}; } },
    createSharedCommerceCart, resolveCatalogAction, createSharedSiteMotion, motionDataAttributes,
    limitPremiumHeadline, premiumSectionImage, PREMIUM_IMAGE_ROLES, resolveMegaRetailDepartmentTiles,
  });
  // Execute the real public renderer without its network/bootstrap side effects.
  vm.runInContext(source.replace(/^import .*;\r?$/gm, '').replace('loadPublicSite();', ''), context);
  return schema => { context.schema = structuredClone(schema); return vm.runInContext('renderWebsite(schema, "home")', context); };
}

for (const [template, schema] of Object.entries(pilots)) {
  test(`${template}: shadow metadata has zero effect on public HTML`, () => {
    const render = renderer();
    const baseline = render(schema);
    const shadow = { ...schema, visual_editor: { schema_version: 1, mode: 'shadow', nodes: { test: { properties: { value: 'MUST NOT BE VISIBLE' } } } } };
    assert.equal(render(shadow), baseline);
    assert.doesNotMatch(baseline, /visual_editor|MUST NOT BE VISIBLE/);
    assert.match(baseline, new RegExp(schema.business.name));
  });
}

test('catalog identities do not alter existing renderer selection or content', () => {
  const render = renderer();
  const schema = pilots['mega-retail-store'];
  const identified = structuredClone(schema);
  identified.catalog_items.forEach((item, i) => { item.catalog_uid = `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`; });
  assert.equal(render(identified), render(schema));
});
