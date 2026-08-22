function normalized(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function isBathBodyCatalogContext(value) {
  const text = normalized(value);
  return /\b(jabon|jabones|soap|bath bomb|bombas? de bano|vela|velas|candle|candles|sales de bano|bath salts|body oil|aceite corporal)\b/.test(text);
}

export function bathBodyStockImageUrl(value) {
  const text = normalized(value);
  if (/\b(vela|velas|candle|candles)\b/.test(text)) {
    return "https://images.unsplash.com/photo-1742544637816-44a0e7f016c6?auto=format&fit=crop&w=900&q=82";
  }
  if (/\b(bath bomb|bombas? de bano)\b/.test(text)) {
    return "https://images.unsplash.com/photo-1777748219969-eb14767165f4?auto=format&fit=crop&w=900&q=82";
  }
  if (/\b(jabon|jabones|soap)\b/.test(text)) {
    return "https://images.unsplash.com/photo-1663108275588-f39db09701e1?auto=format&fit=crop&w=900&q=82";
  }
  return "";
}
