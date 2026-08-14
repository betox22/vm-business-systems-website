export function isStrongNewBusinessBrief({
  message = "",
  isRich = false,
  businessName = "",
  offerings = [],
  salesMode = "",
} = {}) {
  const text = String(message || "").trim();
  if (!text) return false;
  const explicitBuildRequest = /\b(crear|hacer|build|create|make)\b[\s\S]{0,80}\b(p[aá]gina|website|site|tienda|store|marketplace|cat[aá]logo|catalog)\b/i.test(text)
    || /\b(quiero|necesito|deseo|want|need)\b\s+(?:(?:crear|hacer|build|create|make)\s+)?(?:una?|mi|a|my|an)\s+(p[aá]gina|website|site|tienda|store|marketplace|cat[aá]logo|catalog)\b/i.test(text);
  if (explicitBuildRequest) {
    return true;
  }

  const hasBusinessAction = /\b(vendo|vendemos|ofrezco|ofrecemos|hago|hacemos|fabrico|fabricamos|sell|selling|offer|offering|make|making|provide|providing)\b/i.test(text);
  return Boolean(
    isRich
    && text.length >= 80
    && String(businessName || "").trim()
    && Array.isArray(offerings)
    && offerings.filter(Boolean).length >= 2
    && (String(salesMode || "").trim() || hasBusinessAction)
  );
}

export function resolveBackendMissingSteps({
  backendMissingFields = [],
  mapField = (field) => field,
  lastAskedField = "",
  guidedStep = "",
} = {}) {
  const reported = Array.isArray(backendMissingFields)
    ? backendMissingFields.map((field) => String(field || "").trim()).filter(Boolean)
    : [];
  if (reported.length) {
    return [...new Set(reported.map((field) => mapField(field) || field))];
  }
  const fallback = lastAskedField || (guidedStep && guidedStep !== "review" ? guidedStep : "backendClarification");
  return fallback ? [fallback] : [];
}
