export function normalizeDraftOwnerIdentity(value = "") {
  return String(value || "").trim().toLowerCase();
}

export function scopedGuidedDraftKey(baseKey, ownerIdentity) {
  const owner = normalizeDraftOwnerIdentity(ownerIdentity);
  if (!owner) return "";
  return `${String(baseKey || "lumaGuidedDraft")}::${encodeURIComponent(owner)}`;
}

export function writeScopedGuidedDraft(storage, baseKey, ownerIdentity, draft) {
  const owner = normalizeDraftOwnerIdentity(ownerIdentity);
  const key = scopedGuidedDraftKey(baseKey, owner);
  if (!storage || !key) return false;
  storage.setItem(key, JSON.stringify({ ...draft, ownerIdentity: owner }));
  return true;
}

export function readScopedGuidedDraft(storage, baseKey, ownerIdentity) {
  const owner = normalizeDraftOwnerIdentity(ownerIdentity);
  const key = scopedGuidedDraftKey(baseKey, owner);
  if (!storage || !key) return null;
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw);
    return normalizeDraftOwnerIdentity(draft?.ownerIdentity) === owner ? draft : null;
  } catch {
    return null;
  }
}

export function removeScopedGuidedDraft(storage, baseKey, ownerIdentity) {
  const key = scopedGuidedDraftKey(baseKey, ownerIdentity);
  if (storage && key) storage.removeItem(key);
}
