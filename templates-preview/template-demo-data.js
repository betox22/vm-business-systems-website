const TEMPLATE_DEMOS = {
  "b2b-saas-enterprise-pro": {
    schema: {
      active_template: { id: "b2b-saas-enterprise-pro" },
      selected_template: { id: "b2b-saas-enterprise-pro" },
      layout_mode: { id: "saas-gradient" },
      business: {
        name: "Nexora Cloud",
        description: "Automatiza operaciones, conecta tus herramientas y convierte datos complejos en decisiones claras para todo tu equipo.",
        industry: "B2B SaaS",
        selectedLanguage: "es",
      },
      theme: {
        colors: { background: "#f7f8ff", surface: "#ffffff", primary: "#5b4bdb", secondary: "#d9e2ff", accent: "#12b8a6", text: "#101828" },
        fonts: { heading: "Inter", body: "Inter" },
      },
      brand: { colorProvenance: { anchorColor: "#5b4bdb", anchorSource: "explicit_client" } },
      navigation: [
        { page_key: "home", label: "Inicio" },
        { page_key: "product", label: "Producto" },
        { page_key: "pricing", label: "Precios" },
        { page_key: "customers", label: "Clientes" },
        { page_key: "docs", label: "Docs" },
        { page_key: "contact", label: "Demo" },
        { page_key: "login", label: "Ingresar" },
      ],
      pages: [
        {
          page_key: "home",
          title: "Inicio",
          order: 0,
          sections: [
            { type: "EnterpriseHero", order: 0, editable: { badge: "Plataforma de operaciones con IA", headline: "Tu equipo avanza con una sola fuente de verdad", subtitle: "Automatiza procesos, detecta oportunidades y mantén cada proyecto bajo control desde un dashboard creado para crecer.", primary_button: "Empezar gratis", secondary_button: "Ver el producto" } },
            { type: "EnterpriseSolutions", order: 1, editable: { title: "Automatización conectada", text: "Flujos inteligentes que eliminan tareas repetitivas sin perder control." } },
            { type: "EnterpriseUseCases", order: 2, editable: { title: "Visibilidad en tiempo real", text: "Métricas útiles para ventas, operaciones y experiencia del cliente." } },
            { type: "EnterpriseIntegrations", order: 3, editable: { title: "Integraciones sin fricción", text: "Conecta CRM, soporte, pagos y datos en un solo espacio." } },
          ],
        },
        { page_key: "product", title: "Producto", order: 1, sections: [] },
        { page_key: "pricing", title: "Precios", order: 2, sections: [] },
        { page_key: "customers", title: "Clientes", order: 3, sections: [] },
        { page_key: "docs", title: "Docs", order: 4, sections: [] },
        { page_key: "contact", title: "Solicitar demo", order: 5, sections: [] },
        { page_key: "login", title: "Ingresar", order: 6, sections: [] },
      ],
      global_components: { footer_text: "© 2026 Nexora Cloud. Operaciones claras, equipos más rápidos." },
    },
    catalog_items: [
      { id: "feature-1", name: "Automatización conectada", description: "Flujos inteligentes que eliminan tareas repetitivas sin perder control." },
      { id: "feature-2", name: "Visibilidad en tiempo real", description: "Métricas útiles para ventas, operaciones y experiencia del cliente." },
      { id: "feature-3", name: "Integraciones sin fricción", description: "Conecta CRM, soporte, pagos y datos en un solo espacio." },
      { id: "starter", name: "Starter", category: "Plan", description: "Para equipos que están organizando sus primeros flujos.", price: 19, price_amount: 19, price_label: "$19 / mes", recurring: true, billing_interval: "monthly" },
      { id: "growth", name: "Growth", category: "Plan", description: "Automatización avanzada para equipos en expansión.", price: 49, price_amount: 49, price_label: "$49 / mes", recurring: true, billing_interval: "monthly" },
      { id: "scale", name: "Scale", category: "Plan", description: "Gobernanza, seguridad y soporte para organizaciones complejas.", price: 99, price_amount: 99, price_label: "$99 / mes", recurring: true, billing_interval: "monthly" },
    ],
  },
  "mega-retail-store": {
    schema: {
      active_template: { id: "mega-retail-store" },
      selected_template: { id: "mega-retail-store" },
      layout_mode: { id: "retail-bento" },
      business: {
        name: "Distrito Uno",
        description: "Tecnología, hogar, estilo y bienestar seleccionados para hacer tu día más simple.",
        industry: "Retail",
        selectedLanguage: "es",
      },
      theme: {
        colors: { background: "#f5f6f8", surface: "#ffffff", primary: "#155eef", secondary: "#dbe8ff", accent: "#f97316", text: "#101828" },
        fonts: { heading: "Inter", body: "Inter" },
      },
      brand: { colorProvenance: { anchorColor: "#155eef", anchorSource: "explicit_client" } },
      client_media: { photoUrls: [] },
      contact: { whatsapp: "+1 305 555 0186", instagram: "distritouno.store", facebook: "distritouno.store" },
      navigation: [
        { page_key: "home", label: "Inicio" },
        { page_key: "catalog", label: "Catálogo" },
        { page_key: "deals", label: "Ofertas" },
        { page_key: "contact", label: "Contacto" },
      ],
      pages: [
        {
          page_key: "home",
          title: "Inicio",
          order: 0,
          sections: [
            { type: "MarketplaceHero", order: 0, editable: { headline: "Todo lo que buscas, en un solo lugar", subtitle: "Descubre novedades para tu espacio, tu estilo y tu rutina con entrega rápida y compra protegida." } },
            { type: "CategoryRail", order: 1, editable: {} },
            { type: "DealRow", order: 2, editable: {} },
            { type: "TrustStrip", order: 3, editable: {} },
          ],
        },
        { page_key: "catalog", title: "Catálogo", order: 1, sections: [] },
        { page_key: "deals", title: "Ofertas", order: 2, sections: [] },
        { page_key: "contact", title: "Contacto", order: 3, sections: [] },
      ],
      global_components: {
        footer_text: "© 2026 Distrito Uno. Compra fácil, entrega confiable.",
        mega_retail_features: { whatsapp: true, newsletter: true, socials: true },
      },
    },
    catalog_items: [
      { id: "audio", name: "Auriculares Pulse Pro", category: "Tecnología", description: "Audio inmersivo, cancelación de ruido y batería para todo el día.", price_label: "$89", badge: "-20%", image_url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=84" },
      { id: "lamp", name: "Lámpara Halo", category: "Hogar", description: "Luz regulable y diseño limpio para transformar cualquier rincón.", price_label: "$64", image_url: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=84" },
      { id: "sneaker", name: "Urban Runner", category: "Moda", description: "Comodidad ligera para moverte todo el día.", price_label: "$72", badge: "Nuevo", image_url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=84" },
      { id: "care", name: "Ritual Daily Care", category: "Belleza", description: "Un set esencial para una rutina simple y efectiva.", price_label: "$38", image_url: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=84" },
      { id: "bottle", name: "Botella Trail", category: "Aire libre", description: "Hidratación térmica para trabajo, gimnasio o aventura.", price_label: "$29", image_url: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=84" },
      { id: "speaker", name: "Parlante Mini Wave", category: "Tecnología", description: "Sonido portátil con conexión rápida y diseño resistente.", price_label: "$49", image_url: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=900&q=84" },
    ],
  },
};

const requestedTemplate = new URLSearchParams(window.location.search).get("template") || "b2b-saas-enterprise-pro";
const selectedDemo = TEMPLATE_DEMOS[requestedTemplate] || TEMPLATE_DEMOS["b2b-saas-enterprise-pro"];
const originalFetch = window.fetch.bind(window);

window.fetch = (input, init) => {
  const url = typeof input === "string" ? input : input?.url || "";
  if (url.includes("/public/resolve-site") || url.includes("/public/sites/")) {
    return Promise.resolve(new Response(JSON.stringify(selectedDemo), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
  }
  return originalFetch(input, init);
};

window.LUMA_API_BASE_URL = window.location.origin;
