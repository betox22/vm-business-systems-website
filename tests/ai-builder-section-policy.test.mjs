import assert from 'node:assert/strict';
import test from 'node:test';

import { keepEssentialSections } from '../src/ai-builder/section-policy.js';


test('keeps VideoShowcase and Contact with the real six-section limit', () => {
  const sections = [
    { type: 'Hero' },
    { type: 'ProductGrid' },
    { type: 'About' },
    { type: 'VideoShowcase' },
    { type: 'Contact' },
  ];

  const selected = keepEssentialSections(sections, 6);
  const types = selected.map((section) => section.type);

  assert.equal(types.includes('VideoShowcase'), true);
  assert.equal(types.includes('Contact'), true);
  assert.ok(selected.length <= 6);
});


test('Contact never replaces a reusable planner section at full capacity', () => {
  const sections = [
    { type: 'Hero' },
    { type: 'ProductGrid' },
    { type: 'ServiceList' },
    { type: 'FeatureBand' },
    { type: 'Testimonials' },
    { type: 'About' },
    { type: 'VideoShowcase' },
    { type: 'Contact' },
  ];

  const selected = keepEssentialSections(sections, 6);
  const types = selected.map((section) => section.type);

  assert.equal(types.includes('VideoShowcase'), true);
  assert.equal(types.includes('Contact'), true);
  assert.equal(selected.length, 6);
});
