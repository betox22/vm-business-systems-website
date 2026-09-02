const EXPLICIT_META_SOURCES = new Set(["explicit", "explicit_user_choice"]);

function normalizedColorValues(values) {
  const source = Array.isArray(values) ? values : values ? [values] : [];
  return source.map((value) => String(value || "").trim()).filter(Boolean);
}

function delegatesColorChoice(values) {
  const text = normalizedColorValues(values)
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return /\b(?:let (?:ai|lyra) (?:choose|decide)|(?:ai|lyra|ia|tu|you) (?:decide|elige|choose)|que (?:la )?(?:ia|lyra) (?:decida|elija)|surprise me|sorprendeme)\b/.test(text);
}

export function colorPreferenceUpdate(values) {
  const preferredColors = normalizedColorValues(values);
  if (!preferredColors.length) return {};
  const source = delegatesColorChoice(preferredColors)
    ? "explicit_delegation"
    : "explicit_user_choice";
  return {
    preferredColors,
    fieldMeta: {
      preferredColors: { source, confidence: 1 },
    },
  };
}

export function buildColorProvenance({
  preferredColors = [],
  logoPalette = [],
  preferredColorMeta = {},
  structuredFormInput = false,
} = {}) {
  const explicitPreferred = structuredFormInput || EXPLICIT_META_SOURCES.has(preferredColorMeta?.source)
    ? normalizedColorValues(preferredColors)
    : [];
  const logoColors = normalizedColorValues(logoPalette);
  const entries = [];
  const seen = new Set();
  const append = (colors, source) => {
    colors.forEach((color) => {
      const key = color.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      entries.push({ color, source });
    });
  };

  append(explicitPreferred, "explicit_client");
  append(logoColors, "logo_extracted");
  // Editor preview defaults are visual placeholders, not client color evidence.
  const anchor = entries[0] || null;
  const explicitColors = entries.filter((entry) => entry.source === "explicit_client");
  return {
    anchorColor: anchor?.color || null,
    anchorSource: anchor?.source || "unknown",
    secondaryColor: explicitColors[1]?.color || null,
    colors: entries,
  };
}
