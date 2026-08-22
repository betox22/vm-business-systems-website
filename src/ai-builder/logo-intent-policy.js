const LOGO_CONTEXT_RE = /logo|brand mark|marca visual|identidad visual|brand identity/i;
const DIRECT_LOGO_REQUEST_RE = /(?:no tengo|sin) logo|(?:quiero|quisiera|necesito|me gustaria|me gustaría|podrias|podrías|puedes|quiero que|we need|i want|i need|could you|can you).{0,32}\blogo\b|crea(?:r)?(?:me)?(?: un)? logo|crear(?: un)? logo|generate(?: a)? logo|make(?: a)? logo|haz(?:me)?(?: un)? logo|diseñ(?:a|ar)(?: un)? logo|disena(?:r)?(?: un)? logo|gen[eé]rame(?: un)? logo/i;
const DELEGATED_LOGO_RE = /(?:lyra|ia|ai|tu|t[uú]|you)\s+(?:decide|elige|choose|hazlo|create it)|(?:decide|elige|hazlo|crealo|créalo|generalo|gen[eé]ralo)\s+(?:tu|t[uú]|lyra|ia|ai|you)|sorpr[eé]ndeme|surprise me|you decide/i;

export function wantsAiGeneratedLogo(value, options = {}) {
  const text = String(value || "").trim();
  const logoContext = Boolean(options.assumeLogoContext) || LOGO_CONTEXT_RE.test(text);
  return DIRECT_LOGO_REQUEST_RE.test(text) || (logoContext && DELEGATED_LOGO_RE.test(text));
}

export function logoRequestUpdate(value, options = {}) {
  const text = String(value || "").trim();
  if (!wantsAiGeneratedLogo(text, options)) return null;
  return {
    hasLogoPhotos: text,
    logoBrief: text,
    aiGeneratedLogoRequested: true,
    logoPreference: "generate_ai_logo",
  };
}
