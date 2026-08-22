import assert from "node:assert/strict";
import test from "node:test";

import { quickChipsNeedAssistantPrompt } from "../src/ai-builder/quick-chip-context-policy.js";

const colorChips = ["Let AI choose", "Use my logo colors", "I have specific colors"];

test("chips without a visible LYRA message require an assistant prompt", () => {
  assert.equal(quickChipsNeedAssistantPrompt({
    chips: colorChips,
    guidedStep: "preferredColors",
    lastAssistantStep: "",
    lastAssistantText: "",
  }), true);
});

test("chips from a new step cannot reuse an unrelated assistant message", () => {
  assert.equal(quickChipsNeedAssistantPrompt({
    chips: colorChips,
    guidedStep: "preferredColors",
    lastAssistantStep: "hasLogoPhotos",
    lastAssistantText: "I noted the BAD logo you requested.",
  }), true);
});

test("chips stay attached to the visible LYRA prompt for their step", () => {
  assert.equal(quickChipsNeedAssistantPrompt({
    chips: colorChips,
    guidedStep: "preferredColors",
    lastAssistantStep: "preferredColors",
    lastAssistantText: "Do you have preferred colors, or should I choose them for you?",
  }), false);
});

test("steps without chips never inject an extra assistant prompt", () => {
  assert.equal(quickChipsNeedAssistantPrompt({
    chips: [],
    guidedStep: "review",
    lastAssistantStep: "preferredColors",
    lastAssistantText: "Do you have preferred colors?",
  }), false);
});
