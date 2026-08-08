function hashText(value) {
  let hash = 2166136261;
  for (const character of String(value || "")) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function pickVariantSeed(businessName = "", niche = "", offset = 0, count = 3) {
  const total = Math.max(1, Number(count) || 1);
  const normalizedOffset = Math.max(0, Number(offset) || 0);
  return (hashText(`${String(businessName).trim().toLowerCase()}|${String(niche).trim().toLowerCase()}`) + normalizedOffset) % total;
}

export function isExplicitRedesignRequest(value = "") {
  return /\b(otro\s+diseno|otro\s+diseño|redisen[oa]|rediseñ[oa]|cambia\s+el\s+diseno|cambia\s+el\s+diseño|different\s+design|another\s+design|redesign)\b/i.test(String(value || ""));
}
