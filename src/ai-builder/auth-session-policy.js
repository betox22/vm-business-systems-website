function decodeJwtPayload(token = "") {
  const segments = String(token || "").split(".");
  if (segments.length !== 3 || !segments[1]) return null;
  try {
    const base64 = segments[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export function isUnexpiredAccessToken(token, nowSeconds = Date.now() / 1000) {
  const payload = decodeJwtPayload(token);
  const expiresAt = Number(payload?.exp);
  return Number.isFinite(expiresAt) && expiresAt > nowSeconds;
}

export function hasValidPersistedCredential(
  { accessTokens = [], previewTokens = [], clientEmails = [] } = {},
  nowSeconds = Date.now() / 1000,
) {
  if (clientEmails.some((email) => Boolean(String(email || "").trim()))) return true;
  if (previewTokens.some((token) => Boolean(String(token || "").trim()))) return true;
  return accessTokens.some((token) => isUnexpiredAccessToken(token, nowSeconds));
}

export function generationAuthAction({ hasCredential, workspaceUnlocked }) {
  if (!hasCredential) return "prompt_auth";
  return workspaceUnlocked ? "continue" : "unlock_and_continue";
}
