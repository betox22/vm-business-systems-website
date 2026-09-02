const LOGO_CONTEXT_RE = /logo|brand mark|marca visual|identidad visual|brand identity/i;
const EXPLICIT_LOGO_SKIP_RE = /\b(?:continuar|seguir|prefiero|quiero|vamos a seguir|proceed|continue)\b.{0,36}\b(?:sin|without)\s+(?:un\s+|a\s+)?logo\b|\b(?:sin|without)\s+(?:un\s+|a\s+)?logo\b.{0,36}\b(?:por ahora|for now|de momento|ahora)\b/i;
const DIRECT_LOGO_REQUEST_RE = /(?:quiero|quisiera|necesito|me gustaria|me gustaría|podrias|podrías|puedes|quiero que|we need|i want|i need|could you|can you).{0,40}\b(?:crear|crees|diseñ(?:a|ar|es)|disen(?:a|ar|es)|generar|hacer|make|create|design|generate)(?:me)?\b.{0,24}\blogo\b|\b(?:crea(?:r)?(?:me)?|haz(?:me)?|diseñ(?:a|ar)|disena(?:r)?|gen[eé]rame|generate|make|design)(?:\s+(?:un|a))?\s+logo\b/i;
const DELEGATED_LOGO_RE = /(?:lyra|ia|ai|tu|t[uú]|you)\s+(?:decide|elige|choose|hazlo|create it)|(?:decide|elige|hazlo|crealo|créalo|generalo|gen[eé]ralo)\s+(?:tu|t[uú]|lyra|ia|ai|you)|sorpr[eé]ndeme|surprise me|you decide/i;

export function wantsAiGeneratedLogo(value, options = {}) {
  const text = String(value || "").trim();
  if (EXPLICIT_LOGO_SKIP_RE.test(text)) return false;
  const logoContext = Boolean(options.assumeLogoContext) || LOGO_CONTEXT_RE.test(text);
  return DIRECT_LOGO_REQUEST_RE.test(text) || (logoContext && DELEGATED_LOGO_RE.test(text));
}

export function logoRequestUpdate(value, options = {}) {
  const text = String(value || "").trim();
  if (EXPLICIT_LOGO_SKIP_RE.test(text)) {
    return {
      hasLogoPhotos: text,
      logoBrief: "",
      aiGeneratedLogoRequested: false,
      logoPreference: "text_only",
    };
  }
  if (!wantsAiGeneratedLogo(text, options)) return null;
  return {
    hasLogoPhotos: text,
    logoBrief: text,
    aiGeneratedLogoRequested: true,
    logoPreference: "generate_ai_logo",
  };
}
