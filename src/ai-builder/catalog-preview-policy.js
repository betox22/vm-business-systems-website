function normalized(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function isBathBodyCatalogContext(value) {
  const text = normalized(value);
  return /\b(jabon|jabones|soaps?|bath bombs?|bombas? de bano|vela|velas|candle|candles|sales de bano|bath salts|body oil|aceite corporal)\b/.test(text);
}

export function bathBodyStockImageUrl(value) {
  const text = normalized(value);
  if (/\b(vela|velas|candle|candles)\b/.test(text)) {
    return "https://images.unsplash.com/photo-1742544637816-44a0e7f016c6?auto=format&fit=crop&w=900&q=82";
  }
  if (/\b(bath bombs?|bombas? de bano)\b/.test(text)) {
    return "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=900&q=82";
  }
  if (/\b(jabon|jabones|soaps?)\b/.test(text)) {
    return "https://images.unsplash.com/photo-1663108275588-f39db09701e1?auto=format&fit=crop&w=900&q=82";
  }
  return "";
}

export function bathBodyCategoryLabel(value, language = "en") {
  const text = normalized(value);
  const labels = {
    en: { soap: "Artisan soaps", candle: "Scented candles", bathBomb: "Bath bombs", bath: "Bath essentials" },
    es: { soap: "Jabones artesanales", candle: "Velas aromáticas", bathBomb: "Bombas de baño", bath: "Cuidado para el baño" },
    fr: { soap: "Savons artisanaux", candle: "Bougies parfumees", bathBomb: "Bombes de bain", bath: "Essentiels pour le bain" },
    pt: { soap: "Sabonetes artesanais", candle: "Velas aromaticas", bathBomb: "Bombas de banho", bath: "Cuidados para o banho" },
  };
  const copy = labels[language] || labels.en;
  if (/\b(vela|velas|candle|candles)\b/.test(text)) return copy.candle;
  if (/\b(bath bombs?|bombas? de bano)\b/.test(text)) return copy.bathBomb;
  if (/\b(jabon|jabones|soaps?)\b/.test(text)) return copy.soap;
  return isBathBodyCatalogContext(text) ? copy.bath : "";
}

export function shouldExpandInstantCatalog({ items = [], sourceIsBroad = false, templateIsBroad = false } = {}) {
  const concreteItems = (Array.isArray(items) ? items : []).filter((item) => String(item || "").trim());
  if (concreteItems.length >= 2 && !sourceIsBroad) return false;
  return Boolean(sourceIsBroad || templateIsBroad);
}
