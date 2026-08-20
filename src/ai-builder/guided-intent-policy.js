function textValue(value) {
  return String(value || "").trim();
}

function offeringCount(value) {
  if (Array.isArray(value)) return value.filter((item) => textValue(item)).length;
  return textValue(value) ? 1 : 0;
}

export function hasCompleteBusinessBrief(state = {}) {
  return Boolean(
    textValue(state.businessName)
    && textValue(state.businessDescription)
    && offeringCount(state.servicesProducts) > 0
  );
}

export function resolveWebsiteIntentBackfill({
  websiteIntent = "",
  message = "",
  businessDescription = "",
  messageIsRich = false,
} = {}) {
  const existing = textValue(websiteIntent);
  if (existing) return existing;
  const richMessage = messageIsRich ? textValue(message) : "";
  return richMessage || textValue(businessDescription);
}

export function isWebsiteIntentSatisfied(state = {}) {
  return Boolean(textValue(state.websiteIntent) || hasCompleteBusinessBrief(state));
}

export function missingRequiredGuidedSteps(state = {}, requiredSteps = []) {
  return requiredSteps.filter((step) => {
    if (step === "websiteIntent") return !isWebsiteIntentSatisfied(state);
    const value = state[step];
    if (Array.isArray(value)) return offeringCount(value) === 0;
    if (value && typeof value === "object") return Object.keys(value).length === 0;
    return !textValue(value);
  });
}

export function websiteIntentQuestionKey(state = {}) {
  return !textValue(state.websiteIntent) && hasCompleteBusinessBrief(state)
    ? "websiteIntentFollowUp"
    : "websiteIntent";
}
