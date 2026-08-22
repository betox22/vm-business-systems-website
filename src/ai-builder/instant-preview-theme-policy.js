function normalized(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function semanticInstantPreviewPalette(preferredColors = []) {
  const preference = normalized(Array.isArray(preferredColors) ? preferredColors.join(" ") : preferredColors);
  if (!preference) return null;
  if (!/\b(bano|banos|tina|tinas|bath|tub|agua|water|acuatico|aquatic|mar|ocean)\b/.test(preference)) return null;
  return {
    background: "#f3fbfc",
    surface: "#ffffff",
    primary: "#176b87",
    secondary: "#bfe5e9",
    accent: "#46b6c7",
    text: "#102a36",
  };
}

export function applyInstantPreviewPaletteToBrand(brand = {}, palette = null) {
  if (!palette) return brand;
  return {
    ...brand,
    primaryColor: palette.primary,
    secondaryColor: palette.secondary,
    accentColor: palette.accent,
    backgroundColor: palette.background,
    textColor: palette.text,
    buttonColor: palette.primary,
    buttonTextColor: "#ffffff",
  };
}
