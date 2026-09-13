const SPANISH_WORDS = /\b(?:quiero|vendo|vendemos|vender|tienda|negocio|productos|accesorios|marcas|envio|envío|domicilio|linea|línea|se\s+llama|tambien|también|para|con|las|los|una|uno)\b/gi;
const ENGLISH_WORDS = /\b(?:want|sell|selling|store|business|products|accessories|brands|shipping|delivery|online|called|also|for|with|the|and)\b/gi;
const FRENCH_WORDS = /\b(?:veux|vendre|boutique|entreprise|produits|marques|livraison|ligne|appelée|pour|avec|les|des|et)\b/gi;
const PORTUGUESE_WORDS = /\b(?:quero|vender|loja|negócio|negocio|produtos|marcas|entrega|online|chama|para|com|os|as|uma|e)\b/gi;

function countMatches(text, pattern) {
  return (String(text || "").match(pattern) || []).length;
}

export function detectSubstantialBriefLanguage(brief) {
  const text = String(brief || "").trim();
  if (text.length < 60) return "";
  const scores = {
    es: countMatches(text, SPANISH_WORDS),
    en: countMatches(text, ENGLISH_WORDS),
    fr: countMatches(text, FRENCH_WORDS),
    pt: countMatches(text, PORTUGUESE_WORDS),
  };
  const [winner, score] = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  const runnerUp = Math.max(...Object.entries(scores).filter(([key]) => key !== winner).map(([, value]) => value));
  return score >= 3 && score >= runnerUp + 2 ? winner : "";
}

export function resolveBriefLanguage({ manualLanguage = "", brief = "", browserLanguage = "en" } = {}) {
  if (manualLanguage) return manualLanguage;
  return detectSubstantialBriefLanguage(brief) || browserLanguage || "en";
}
