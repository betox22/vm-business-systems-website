export function quickChipsNeedAssistantPrompt({
  chips = [],
  guidedStep = "",
  lastAssistantStep = "",
  lastAssistantText = "",
} = {}) {
  if (!Array.isArray(chips) || chips.length === 0) return false;
  if (!String(guidedStep || "").trim()) return false;
  if (!String(lastAssistantText || "").trim()) return true;
  return String(lastAssistantStep || "").trim() !== String(guidedStep || "").trim();
}
