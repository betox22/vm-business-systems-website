export const BACKEND_THEME_SOURCE = "backend_generated";

export function shouldPreserveBackendTheme(schema = {}) {
  return schema?.generation_metadata?.theme_source === BACKEND_THEME_SOURCE;
}

export function applyAuthoritativeThemeToBrand(schema = {}, brand = {}) {
  if (!shouldPreserveBackendTheme(schema)) return brand;

  const colors = schema?.theme?.colors || {};
  const fonts = schema?.theme?.fonts || {};
  return {
    ...brand,
    primaryColor: colors.primary || brand.primaryColor,
    secondaryColor: colors.secondary || brand.secondaryColor,
    accentColor: colors.accent || brand.accentColor,
    backgroundColor: colors.background || brand.backgroundColor,
    surfaceColor: colors.surface || brand.surfaceColor,
    textColor: colors.text || brand.textColor,
    mutedTextColor: colors.muted || brand.mutedTextColor,
    borderColor: colors.border || brand.borderColor,
    buttonColor: colors.button || colors.primary || brand.buttonColor,
    buttonTextColor: colors.buttonText || brand.buttonTextColor,
    fontPairing: {
      ...(brand.fontPairing || {}),
      ...fonts,
    },
    paletteSource: BACKEND_THEME_SOURCE,
  };
}
