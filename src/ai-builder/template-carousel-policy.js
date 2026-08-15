export const PROVISIONAL_TEMPLATE_SELECTION_INTENTS = new Set([
  "default_minimal",
  "provisional_needs_catalog_context",
  "guided_context_template",
]);

export function isConcreteTemplateId(templateId) {
  const value = String(templateId || "").trim();
  return Boolean(value && !/^default_|pending|unknown|collecting|provisional/i.test(value));
}

export function hasDecidedTemplateSelection(selection) {
  const intent = String(selection?.intent || "").trim();
  return Boolean(
    intent &&
    isConcreteTemplateId(selection?.templateId) &&
    !PROVISIONAL_TEMPLATE_SELECTION_INTENTS.has(intent)
  );
}
