import assert from 'node:assert/strict';
import test from 'node:test';

import { applyAuthoritativeThemeToBrand } from '../src/ai-builder/theme-policy.js';


test('backend semantic colors remain attached to the authoritative brand', () => {
  const brand = applyAuthoritativeThemeToBrand({
    generation_metadata: { theme_source: 'backend_generated' },
    theme: {
      colors: {
        primary: '#123456',
        success: '#237A45',
        warning: '#A86816',
        error: '#B43C32',
        info: '#286CB0',
      },
    },
  }, {});

  assert.equal(brand.successColor, '#237A45');
  assert.equal(brand.warningColor, '#A86816');
  assert.equal(brand.errorColor, '#B43C32');
  assert.equal(brand.infoColor, '#286CB0');
});
