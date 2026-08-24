let enabledTemplateIds = null;

export function setRuntimeTemplateAvailability(templateIds) {
  if (!Array.isArray(templateIds)) {
    enabledTemplateIds = null;
    return;
  }
  enabledTemplateIds = new Set(
    templateIds.map((value) => String(value || "").trim()).filter(Boolean),
  );
}

export function isTemplateAvailableForNewProject(templateId) {
  const normalized = String(templateId || "").trim();
  if (!normalized) return false;
  return enabledTemplateIds === null || enabledTemplateIds.has(normalized);
}

export function filterTemplatesAvailableForNewProject(templates) {
  return (Array.isArray(templates) ? templates : []).filter((template) =>
    isTemplateAvailableForNewProject(template?.templateId),
  );
}

export function resetRuntimeTemplateAvailability() {
  enabledTemplateIds = null;
}
