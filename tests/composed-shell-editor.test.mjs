import test from 'node:test';
import assert from 'node:assert/strict';
import { renderComposedShellEditor } from '../src/ai-builder/composed-shell-editor.js';

test('shared commerce header exposes editable labels without editing route identities', () => {
  const html = renderComposedShellEditor({
    id: 'header', type: 'composed', section_id: 'shared--header',
    copy_bindings: { 'business.name': 'ElectroHub', navigation_label: 'Site navigation' },
    list_bindings: { navigation: [{ label: 'Home', page_key: 'home' }] },
    control_bindings: {
      search: { label: 'Find products' }, cart: { label: 'Basket' },
      account: { label: 'My account', action: 'modal' },
      departments: { label: 'Departments', items: [{ label: 'Tools', category: 'Tools' }] },
    },
  }, 2, 0);
  assert.match(html, /pages\.0\.sections\.2\.control_bindings\.search\.label/);
  assert.match(html, /pages\.0\.sections\.2\.control_bindings\.cart\.label/);
  assert.match(html, /pages\.0\.sections\.2\.control_bindings\.account\.label/);
  assert.match(html, /pages\.0\.sections\.2\.control_bindings\.departments\.items\.0\.label/);
  assert.match(html, /pages\.0\.sections\.2\.list_bindings\.navigation\.0\.label/);
  assert.doesNotMatch(html, /\.page_key|\.category|copy_bindings\.business\.name/);
});

test('shared footer exposes newsletter and social bindings with escaped values', () => {
  const html = renderComposedShellEditor({
    id: 'footer', type: 'composed', section_id: 'shared--footer',
    copy_bindings: { 'business.name': 'Studio', footer_text: 'Studio updates', footer_navigation_label: 'Links' },
    list_bindings: { navigation: [{ label: 'Home', page_key: 'home' }] },
    control_bindings: { newsletter: { title: 'News', text: 'Updates', button_label: 'Subscribe' },
      social_links: [{ label: '<Instagram>', url: 'https://instagram.com/studio' }] },
  }, 1, 0);
  assert.match(html, /pages\.0\.sections\.1\.control_bindings\.newsletter\.text/);
  assert.match(html, /pages\.0\.sections\.1\.control_bindings\.social_links\.0\.url/);
  assert.match(html, /&lt;Instagram&gt;/);
  assert.doesNotMatch(html, /<Instagram>/);
  assert.equal(renderComposedShellEditor({ type: 'composed', section_id: 'other' }, 1, 0), '');
});
