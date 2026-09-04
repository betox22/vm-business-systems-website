export const CLIENT_AUTH_VALIDATION_TIMEOUT_MS = 20000;
export const CLIENT_AUTH_VALIDATION_ATTEMPTS = 2;

export function shouldRetryClientAuthValidation({ attempt = 1, status = 0 } = {}) {
  if (attempt >= CLIENT_AUTH_VALIDATION_ATTEMPTS) return false;
  return status === 0 || status === 408 || status === 429 || status >= 500;
}

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
