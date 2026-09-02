export const CLIENT_AUTH_VALIDATION_TIMEOUT_MS = 12000;

export function isConfirmedClientAuthStatus(status) {
  return status === "authenticated" || status === "demo";
}

export function visibleClientAccountEmail(status, email) {
  if (status !== "authenticated") return "";
  return String(email || "").trim();
}

export function canDismissClientAuthGate({ status, hasPreviewSession = false } = {}) {
  return isConfirmedClientAuthStatus(status) || Boolean(hasPreviewSession);
}
