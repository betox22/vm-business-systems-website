const PRICE_LABELS = {
  en: "Price to confirm",
  es: "Precio por confirmar",
  fr: "Prix a confirmer",
  pt: "Preco a confirmar",
};

export function priceConfirmationLabel(language = "en") {
  return PRICE_LABELS[language] || PRICE_LABELS.en;
}

export function withoutInventedCommerceMetadata(item = {}, language = "en") {
  const {
    rating: _rating,
    review_count: _reviewCount,
    inventory_quantity: _inventoryQuantity,
    stock: _stock,
    ...cleaned
  } = item || {};
  return {
    ...cleaned,
    price: null,
    price_value: null,
    price_amount: null,
    price_type: "quote_only",
    price_label: priceConfirmationLabel(language),
    track_inventory: false,
  };
}
