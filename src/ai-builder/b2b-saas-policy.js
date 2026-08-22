const NAV_TARGETS = [
  { key: "product", patterns: [/\bproduct/i, /\bproducto/i, /\bcatalog/i, /\bsolution/i, /\bsoluci/i] },
  { key: "pricing", patterns: [/\bpricing/i, /\bprice/i, /\bprecio/i, /\bplan(?:es|s)?\b/i] },
  { key: "customers", patterns: [/\bcustomer/i, /\bclient/i, /\bcliente/i, /\bcase(?:s)?\b/i, /\bcasos?\b/i] },
  { key: "docs", patterns: [/\bdocs?\b/i, /\bdocument/i, /\bresources?\b/i, /\brecursos?\b/i] },
];

const RECURRING_VALUE_RE = /^(?:recurring|subscription|monthly|annual|yearly|month|year|mensual|anual|mes|ano)$/i;
const RECURRING_LABEL_RE = /(?:\/\s*(?:mo|month|mes|yr|year|ano)|\b(?:per month|per year|monthly|annual|yearly|mensual|anual|cada mes|cada ano)\b)/i;

export function isB2BSaasTemplate(templateId) {
  return String(templateId || "") === "b2b-saas-enterprise-pro";
}

export function b2bSaasNavigationPages(pages = []) {
  const available = Array.isArray(pages) ? pages : [];
  const used = new Set();
  return NAV_TARGETS.map((target) => {
    const page = available.find((candidate) => {
      if (!candidate || used.has(candidate.page_key)) return false;
      const text = `${candidate.page_key || ""} ${candidate.title || ""} ${candidate.slug || ""}`;
      return target.patterns.some((pattern) => pattern.test(text));
    });
    if (!page) return null;
    used.add(page.page_key);
    return { key: target.key, page };
  }).filter(Boolean);
}

function numericPrice(item = {}) {
  const value = item.price_amount ?? item.price;
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  const match = String(value || "").replace(/,/g, ".").match(/\d+(?:\.\d+)?/);
  return match && Number(match[0]) > 0 ? Number(match[0]) : null;
}

function hasRecurringEvidence(item = {}) {
  if (item.recurring === true || item.subscription === true) return true;
  const structured = [item.price_type, item.billing_interval, item.billing_period, item.interval, item.cadence]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  if (structured.some((value) => RECURRING_VALUE_RE.test(value))) return true;
  return RECURRING_LABEL_RE.test(String(item.price_label || ""));
}

export function b2bSaasSubscriptionPlans(schema = {}) {
  const items = (schema.catalog_items || schema.products_services || [])
    .filter((item) => item && item.is_active !== false && item.display_in_catalog !== false)
    .filter((item) => numericPrice(item) !== null && hasRecurringEvidence(item));
  return items.length >= 3 ? items.slice(0, 3) : [];
}

export function b2bSaasHasRealPricing(schema = {}) {
  return b2bSaasSubscriptionPlans(schema).length === 3;
}
