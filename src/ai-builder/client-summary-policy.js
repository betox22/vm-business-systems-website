function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function naturalList(items, language) {
  const cleanItems = (Array.isArray(items) ? items : []).map(clean).filter(Boolean).slice(0, 3);
  if (!cleanItems.length) return "";
  try {
    return new Intl.ListFormat(language || "en", { style: "long", type: "conjunction" }).format(cleanItems);
  } catch {
    return cleanItems.join(", ");
  }
}

const SALES_COPY = {
  en: { online_sales: "sell online", quote_request: "receive quote requests", booking: "accept bookings", lead_capture: "connect with new customers", informational: "present the business clearly" },
  es: { online_sales: "vender en línea", quote_request: "recibir solicitudes de cotización", booking: "aceptar reservas", lead_capture: "conectar con nuevos clientes", informational: "presentar el negocio con claridad" },
  fr: { online_sales: "vendre en ligne", quote_request: "recevoir des demandes de devis", booking: "accepter des reservations", lead_capture: "attirer de nouveaux clients", informational: "presenter clairement l'entreprise" },
  pt: { online_sales: "vender online", quote_request: "receber pedidos de orcamento", booking: "aceitar reservas", lead_capture: "conectar-se com novos clientes", informational: "apresentar o negocio com clareza" },
};

export function naturalBusinessSummary({ language = "en", businessName = "", industry = "", location = "", salesFlow = "", offers = [] } = {}) {
  const name = clean(businessName);
  const offerList = naturalList(offers, language);
  const sales = (SALES_COPY[language] || SALES_COPY.en)[clean(salesFlow)] || "";
  const place = clean(location);
  const sector = clean(industry).replace(/_/g, " ");
  const copy = {
    en: {
      intro: name ? `I understand that ${name}` : "I understand that your business",
      offers: offerList ? ` offers ${offerList}` : sector ? ` works in ${sector}` : " is taking shape",
      sales: sales ? ` and will ${sales}` : "",
      location: place ? ` from ${place}` : "",
    },
    es: {
      intro: name ? `Entendí que ${name}` : "Entendí que tu negocio",
      offers: offerList ? ` ofrece ${offerList}` : sector ? ` pertenece al sector ${sector}` : " ya está tomando forma",
      sales: sales ? ` y busca ${sales}` : "",
      location: place ? ` desde ${place}` : "",
    },
    fr: {
      intro: name ? `J'ai compris que ${name}` : "J'ai compris que votre entreprise",
      offers: offerList ? ` propose ${offerList}` : sector ? ` travaille dans le secteur ${sector}` : " prend forme",
      sales: sales ? ` et souhaite ${sales}` : "",
      location: place ? ` depuis ${place}` : "",
    },
    pt: {
      intro: name ? `Entendi que ${name}` : "Entendi que seu negocio",
      offers: offerList ? ` oferece ${offerList}` : sector ? ` atua no setor ${sector}` : " ja esta tomando forma",
      sales: sales ? ` e pretende ${sales}` : "",
      location: place ? ` a partir de ${place}` : "",
    },
  }[language] || null;
  const selected = copy || {
    intro: name ? `I understand that ${name}` : "I understand that your business",
    offers: offerList ? ` offers ${offerList}` : sector ? ` works in ${sector}` : " is taking shape",
    sales: sales ? ` and will ${sales}` : "",
    location: place ? ` from ${place}` : "",
  };
  return `${selected.intro}${selected.offers}${selected.sales}${selected.location}.`;
}
