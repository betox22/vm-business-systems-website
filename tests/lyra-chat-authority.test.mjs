import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const indexSource = readFileSync(new URL('../src/ai-builder/index.js', import.meta.url), 'utf8');
const chatSource = readFileSync(new URL('../src/ai-builder/chat.js', import.meta.url), 'utf8');
const start = indexSource.indexOf('function inferGuidedUpdates(step, message) {');
const end = indexSource.indexOf('function inferGuidedUpdatesFromAnyMessage(', start);
const inferGuidedUpdates = runInNewContext(`${indexSource.slice(start, end)}; inferGuidedUpdates`, {
  hasExistingGuidedValue: () => false,
  extractWebsiteIntent: () => '',
});

test('a natural correction is never stored verbatim as industry', () => {
  assert.deepEqual({ ...inferGuidedUpdates('industry', 'Eso ya estaba en la descripción anterior.') }, {});
});

test('an unclassified site-intent answer is not stored verbatim', () => {
  assert.deepEqual({ ...inferGuidedUpdates('websiteIntent', 'Eso ya estaba en la descripción anterior.') }, {});
});

test('the client displays the single authoritative server reply and restores failed local replies', () => {
  assert.match(chatSource, /appendChatMessage\("assistant", finalAssistantMessage, usedDevFallback \? "alert" : emotion\)/);
  assert.doesNotMatch(chatSource, /composeAssistantReply\(/);
  assert.match(chatSource, /catch \(error\) \{\s*console\.error\("LYRA could not prepare the intake reply\.", error\);[\s\S]*?guidedReply\.value = message;/);
});

test('a local extraction exception keeps the answer available for retry', async () => {
  const reply = { value: 'Eso ya estaba en la descripción anterior.' };
  const messages = [];
  const state = {
    guidedState: { industry: '' },
    guidedStep: 'industry',
    preparedPlanToken: 'previous',
    preparedPlanTemplateId: 'template',
  };
  const start = chatSource.indexOf('export async function sendGuidedReply() {');
  const end = chatSource.indexOf('export function sanitizeAssistantTemplateClaim(', start);
  const send = runInNewContext(
    `${chatSource.slice(start, end).replace('export async function', 'async function')}; sendGuidedReply`,
    {
      guidedReply: reply,
      builderState: state,
      appendChatMessage: (role, text) => messages.push({ role, text }),
      shouldResetRestoredWorkspaceForMessage: () => false,
      applyDetectedBriefLanguage: () => {},
      structuredClone,
      inferGuidedUpdatesFromAnyMessage: () => { throw new Error('extractor failure'); },
      guidedStatusText: { textContent: '' },
      langText: ({ en }) => en,
      t: () => 'retry',
      refreshQuickChips: () => {},
      console: { error: () => {} },
    },
  );

  await assert.doesNotReject(send());
  assert.equal(reply.value, 'Eso ya estaba en la descripción anterior.');
  assert.equal(state.guidedStep, 'industry');
  assert.equal(state.preparedPlanToken, 'previous');
  assert.match(messages.at(-1).text, /please retry/);
});
