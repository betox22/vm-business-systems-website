const TOKEN_KEY = "vmInternalAdminAccessToken";

export function captureInternalAuthRedirect(locationLike, storage) {
  const hash = new URLSearchParams(String(locationLike?.hash || "").replace(/^#/, ""));
  const token = hash.get("access_token") || "";
  const error = hash.get("error_description") || hash.get("error") || "";
  if (token && storage) storage.setItem(TOKEN_KEY, token);
  return { token, error };
}

export function internalAccessToken(storage) {
  return String(storage?.getItem(TOKEN_KEY) || "").trim();
}

export function internalAuthHeaders(storage, headers = {}) {
  const token = internalAccessToken(storage);
  return token ? { ...headers, Authorization: `Bearer ${token}` } : { ...headers };
}

export function clearInternalAccessToken(storage) {
  storage?.removeItem(TOKEN_KEY);
}
