import assert from 'node:assert/strict';
import test from 'node:test';

import { removeReadyCard, shouldShowReadyCard } from '../src/ai-builder/ready-card-policy.js';

test('business review is shown only before generation begins', () => {
  assert.equal(shouldShowReadyCard({ guidedStep: 'review', isGeneratingWebsite: false, currentSchema: null }), true);
  assert.equal(shouldShowReadyCard({ guidedStep: 'review', isGeneratingWebsite: true, currentSchema: null }), false);
  assert.equal(shouldShowReadyCard({ guidedStep: 'review', isGeneratingWebsite: false, currentSchema: {} }), false);
  assert.equal(shouldShowReadyCard({ guidedStep: 'businessName', isGeneratingWebsite: false, currentSchema: null }), false);
});

test('starting build progress removes an existing review card', () => {
  let removed = false;
  const chat = {
    querySelectorAll(selector) {
      assert.equal(selector, '.luma-ready-card');
      return [{ remove() { removed = true; } }];
    },
  };

  removeReadyCard(chat);
  assert.equal(removed, true);
  assert.doesNotThrow(() => removeReadyCard(null));
});
