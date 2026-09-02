const DECLARED_PRICE_RE = /(?:\b(?:usd|eur|dolares?|dólares?|euros?|bs\.?|ves)\b|[$€])\s*(\d+(?:[.,]\d{1,2})?)|(\d+(?:[.,]\d{1,2})?)\s*(?:\b(?:usd|eur|dolares?|dólares?|euros?|bs\.?|ves)\b|[$€])/i;

export function declaredCatalogPrice(value = "") {
  const match = String(value || "").match(DECLARED_PRICE_RE);
  if (!match) return null;
  const amount = Number(String(match[1] || match[2]).replace(",", "."));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export function truthfulCatalogPricing(value = "", language = "en") {
  const amount = declaredCatalogPrice(value);
  if (amount !== null) {
    return {
      price_type: "fixed",
      price_amount: amount,
      price_label: `USD ${amount.toFixed(2)}`,
      track_inventory: false,
    };
  }
  const label = {
    es: "Precio por confirmar",
    fr: "Prix a confirmer",
    pt: "Preco a confirmar",
  }[language] || "Price to confirm";
  return {
    price_type: "quote_only",
    price_amount: null,
    price_label: label,
    track_inventory: false,
  };
}
