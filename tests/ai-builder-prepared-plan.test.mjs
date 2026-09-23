import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/ai-builder/index.js', import.meta.url), 'utf8');
const start = source.indexOf('async function selectTemplateForPayload(payload) {');
const end = source.indexOf('\nfunction inferDesignerTemplateIdFromPayload', start);
assert.ok(start >= 0 && end > start);

async function selectWithState(forcedTemplateSelection = null) {
  const builderState = {
    guidedState: { salesMode: '', aiStudioPlan: { recommendedTemplateId: 'restaurant-food-business' } },
    forcedTemplateSelection,
    preparedPlanTemplateId: 'mega-retail-store',
  };
  const templates = new Map([
    ['mega-retail-store', { id: 'mega-retail-store', catalogModel: { catalogType: 'retail' } }],
    ['restaurant-food-business', { id: 'restaurant-food-business' }],
  ]);
  const context = vm.createContext({
    builderState,
    isPublicClientSetup: true,
    arrayValue: () => [],
    window: { TemplateRouter: {
      getTemplateById: async (id) => templates.get(id),
      selectTemplateFromPrompt: async () => { throw new Error('prompt selection should not run'); },
    } },
    inferDesignerTemplateIdFromPayload: () => { throw new Error('local inference should not run'); },
    inferTemplateIdFromText: () => { throw new Error('local inference should not run'); },
  });
  vm.runInContext(`${source.slice(start, end)}\nglobalThis.selectTemplate = selectTemplateForPayload;`, context);
  return context.selectTemplate({ preparedPlanToken: 'prepared-token' });
}

test('generation keeps the server-prepared template instead of running local inference', async () => {
  const selected = await selectWithState();
  assert.equal(selected.templateId, 'mega-retail-store');
  assert.equal(selected.intent, 'backend_prepared_plan');
});

test('explicit client template choice overrides the server-prepared template', async () => {
  const selected = await selectWithState({
    templateId: 'restaurant-food-business',
    intent: 'client_visual_template_choice',
  });
  assert.equal(selected.templateId, 'restaurant-food-business');
  assert.equal(selected.intent, 'client_visual_template_choice');
});

test('guided generation includes the prepared token in the request payload', () => {
  assert.match(source, /preparedPlanToken: isPublicClientSetup \? builderState\.preparedPlanToken : ""/);
});
