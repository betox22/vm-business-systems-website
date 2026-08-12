const EXPLICIT_META_SOURCES = new Set(["explicit", "explicit_user_choice"]);

function normalizedColorValues(values) {
  const source = Array.isArray(values) ? values : values ? [values] : [];
  return source.map((value) => String(value || "").trim()).filter(Boolean);
}

export function buildColorProvenance({
  preferredColors = [],
  logoPalette = [],
  localBrand = {},
  preferredColorMeta = {},
  structuredFormInput = false,
} = {}) {
  const explicitPreferred = structuredFormInput || EXPLICIT_META_SOURCES.has(preferredColorMeta?.source)
    ? normalizedColorValues(preferredColors)
    : [];
  const logoColors = normalizedColorValues(logoPalette);
  const localColors = normalizedColorValues([
    localBrand?.primaryColor,
    localBrand?.secondaryColor,
    localBrand?.accentColor,
  ]);
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
  append(localColors, "local_suggestion");
  const anchor = entries[0] || null;
  return {
    anchorColor: anchor?.color || null,
    anchorSource: anchor?.source || "unknown",
    colors: entries,
  };
}
