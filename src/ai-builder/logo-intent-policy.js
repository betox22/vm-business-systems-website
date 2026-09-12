const LOGO_CONTEXT_RE = /logo|brand mark|marca visual|identidad visual|brand identity/i;
const LOGO_SKIP_RE = /(?:continuar|seguir|continua|sigue|continue|proceed).{0,28}(?:sin|without)\s+(?:un\s+|a\s+)?logo|(?:sin|without)\s+(?:un\s+|a\s+)?logo.{0,28}(?:por ahora|for now|de momento|later)|(?:no tengo|i do not have|i don't have)\s+(?:un\s+|a\s+)?logo(?!.*(?:crea|crear|diseña|diseñar|genera|generar|make|create|design|generate))/i;
const DIRECT_LOGO_REQUEST_RE = /(?:quiero|quisiera|necesito|me gustaria|me gustaría|podrias|podrías|puedes|quiero que|we need|i want|i need|could you|can you).{0,40}\blogo\b|\blogo\b.{0,40}(?:crea|crear|diseña|diseñar|genera|generar|make|create|design|generate)|crea(?:r)?(?:me)?(?: un)? logo|crear(?: un)? logo|generate(?: a)? logo|make(?: a)? logo|haz(?:me)?(?: un)? logo|diseñ(?:a|ar)(?: un)? logo|disena(?:r)?(?: un)? logo|gen[eé]rame(?: un)? logo/i;
const DELEGATED_LOGO_RE = /(?:lyra|ia|ai|tu|t[uú]|you)\s+(?:decide|elige|choose|hazlo|create it)|(?:decide|elige|hazlo|crealo|créalo|generalo|gen[eé]ralo)\s+(?:tu|t[uú]|lyra|ia|ai|you)|sorpr[eé]ndeme|surprise me|you decide/i;

export function logoIntentPath(value, options = {}) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (LOGO_SKIP_RE.test(text)) return "explicit_skip";
  const logoContext = Boolean(options.assumeLogoContext) || LOGO_CONTEXT_RE.test(text);
  if (DIRECT_LOGO_REQUEST_RE.test(text) || (logoContext && DELEGATED_LOGO_RE.test(text))) return "wants_generated";
  return "";
}

export function wantsAiGeneratedLogo(value, options = {}) {
  return logoIntentPath(value, options) === "wants_generated";
}

export function logoRequestUpdate(value, options = {}) {
  const text = String(value || "").trim();
  const intent = logoIntentPath(text, options);
  if (!intent) return null;
  if (intent === "explicit_skip") {
    return {
      hasLogoPhotos: text,
      logoBrief: "",
      aiGeneratedLogoRequested: false,
      logoPreference: "explicit_skip",
    };
  }
  return {
    hasLogoPhotos: text,
    logoBrief: text,
    aiGeneratedLogoRequested: true,
    logoPreference: "generate_ai_logo",
  };
}
