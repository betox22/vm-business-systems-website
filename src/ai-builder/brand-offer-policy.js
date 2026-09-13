const BRAND_CLAUSE_RE = /\b(?:las?\s+)?marcas?\s*(?:que\s+(?:vendo|vendemos|manejo|manejamos|trabajo|trabajamos)\s+(?:son|incluyen)?|van\s+a\s+ser|ser[aá]n|son|incluyen|:|-)?\s*/i;
const ENGLISH_BRAND_CLAUSE_RE = /\bbrands?\s*(?:we\s+(?:sell|carry|stock)\s*(?:are|include)?|are|include|:|-)?\s*/i;

function cleanBrand(value) {
  return String(value || "")
    .replace(/^(?:de|la|el|los|las|marca)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

export function splitBrandClause(value) {
  const source = String(value || "");
  const match = BRAND_CLAUSE_RE.exec(source) || ENGLISH_BRAND_CLAUSE_RE.exec(source);
  if (!match) return { offerText: source.trim(), brandsCarried: [] };

  const brandText = source.slice(match.index + match[0].length)
    .split(/[.;\n]|\b(?:el\s+negocio|la\s+tienda|se\s+llama|vendo\s+(?:en|todo)|vendemos\s+(?:en|todo)|env[ií]o|shipping|the\s+business|the\s+store|called)\b/i)[0];
  const brandsCarried = brandText
    .replace(/\s+(?:y|and)\s+/gi, ",")
    .split(",")
    .map(cleanBrand)
    .filter((brand) => brand.length >= 2 && brand.length <= 60);

  return {
    offerText: source.slice(0, match.index).replace(/[\s,;:-]+$/, "").trim(),
    brandsCarried: [...new Set(brandsCarried)],
  };
}

export function extractBrandsCarried(text) {
  return splitBrandClause(text).brandsCarried;
}
