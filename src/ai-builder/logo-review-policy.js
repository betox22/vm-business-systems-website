export function needsGeneratedLogoRequest({ logoPreference = "", logoUrl = "", logoApprovalStatus = "" } = {}) {
  return logoPreference === "generate_ai_logo"
    && !String(logoUrl || "").trim()
    && logoApprovalStatus !== "skipped";
}

export function needsGeneratedLogoApproval({ logoPreference = "", logoUrl = "", logoGenerationStatus = "", logoApprovalStatus = "" } = {}) {
  return logoPreference === "generate_ai_logo"
    && Boolean(String(logoUrl || "").trim())
    && logoGenerationStatus === "generated"
    && logoApprovalStatus !== "approved";
}

export function normalizeGeneratedLogoResponse(result = {}) {
  const status = String(result.status || "").trim();
  const logoUrl = String(result.logoUrl || result.logo_url || "").trim();
  return {
    status: status || (logoUrl ? "generated" : "generation_failed"),
    logoUrl,
    generated: status === "generated" && Boolean(logoUrl),
  };
}

export function applyGeneratedLogoToState(guidedState, result = {}) {
  const normalized = normalizeGeneratedLogoResponse(result);
  guidedState.logoGenerationStatus = normalized.status;
  if (normalized.generated) {
    guidedState.logoUrl = normalized.logoUrl;
    guidedState.hasLogo = true;
    guidedState.logoApprovalStatus = "pending_review";
  }
  return normalized;
}

export function approveGeneratedLogo(guidedState) {
  guidedState.logoApprovalStatus = "approved";
  guidedState.logoGenerationStatus = "generated";
  guidedState.hasLogo = Boolean(String(guidedState.logoUrl || "").trim());
  return guidedState;
}

export function prepareGeneratedLogoRetry(guidedState) {
  guidedState.logoUrl = "";
  guidedState.hasLogo = false;
  guidedState.logoGenerationStatus = "";
  guidedState.logoApprovalStatus = "";
  return guidedState;
}
