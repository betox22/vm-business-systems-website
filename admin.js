let stores = [
  {
    id: "luna",
    name: "Luna Market",
    owner: "Maria Gonzalez",
    domain: "luna.misas.com",
    status: "Activa",
    plan: "Pro",
  },
  {
    id: "cafe",
    name: "Cafe Norte",
    owner: "Carlos Perez",
    domain: "cafenorte.com",
    status: "Activa",
    plan: "Starter",
  },
  {
    id: "nova",
    name: "Nova Tech",
    owner: "Ana Torres",
    domain: "nova.misas.com",
    status: "Revision",
    plan: "Pro",
  },
];

let orders = [
  {
    id: "ORD-1001",
    storeId: "luna",
    customer: "Valeria R.",
    total: 64.5,
    status: "new",
    items: "Bolso urbano, Set diario",
    date: "Hoy 10:42",
  },
  {
    id: "ORD-1002",
    storeId: "luna",
    customer: "Miguel A.",
    total: 24.99,
    status: "paid",
    items: "Set diario premium",
    date: "Hoy 09:18",
  },
  {
    id: "ORD-1003",
    storeId: "cafe",
    customer: "Daniela M.",
    total: 38,
    status: "processing",
    items: "Cafe premium x2, Taza",
    date: "Ayer 17:03",
  },
  {
    id: "ORD-1004",
    storeId: "nova",
    customer: "Retail Box",
    total: 210,
    status: "pending_payment",
    items: "Audifonos, Cargador USB-C",
    date: "Ayer 14:12",
  },
  {
    id: "ORD-1005",
    storeId: "cafe",
    customer: "Laura C.",
    total: 18.9,
    status: "shipped",
    items: "Cafe molido",
    date: "05 Jun",
  },
];

let domains = [];
let planLimits = [];
let subscriptions = [];
let adminSecurity = {
  tokenConfigured: false,
};
let domainSearch = {
  query: "",
  provider: "",
  exactAvailability: false,
  results: [],
};
let cloudBusinesses = [];
let cloudSites = [];
let cloudCatalogItems = [];
let cloudGenerations = [];
let selectedBusinessId = "";
let lastPublishedUrl = "";

let pages = [
  { storeId: "luna", title: "Home", slug: "/", type: "Home", status: "Publicada" },
  { storeId: "luna", title: "Catalogo", slug: "/catalogo", type: "Catalog", status: "Publicada" },
  { storeId: "luna", title: "Contacto", slug: "/contacto", type: "Contact", status: "Borrador" },
  { storeId: "cafe", title: "Home", slug: "/", type: "Home", status: "Publicada" },
  { storeId: "cafe", title: "Menu de cafe", slug: "/catalogo", type: "Catalog", status: "Publicada" },
  { storeId: "nova", title: "Home", slug: "/", type: "Home", status: "Revision" },
];

let requests = [
  {
    id: "REQ-2041",
    client: "Dulce Aurora",
    contact: "ventas@dulceaurora.com",
    phone: "+58 412 000 0000",
    industry: "Reposteria artesanal",
    location: "Caracas, Venezuela",
    description: "Postres artesanales, tortas por encargo y cajas de regalo elegantes para celebraciones y empresas.",
    products: ["Tortas personalizadas", "Brownies premium", "Cajas de regalo", "Postres para eventos"],
    colors: ["rosa pastel", "dorado", "marfil"],
    tone: "Elegante, cercano y dulce",
    social: { instagram: "@dulceaurora" },
    status: "ready_for_ai",
    budget: "Landing + catalogo",
    submitted: "Hoy 11:18",
  },
  {
    id: "REQ-2040",
    client: "Luna Market",
    contact: "maria@lunamarket.com",
    phone: "+1 555 0100",
    industry: "Accesorios y regalos",
    location: "Miami, FL",
    description: "Boutique online de accesorios seleccionados, regalos y productos de estilo diario.",
    products: ["Handbags", "Gift sets", "Limited edition accessories"],
    colors: ["verde profundo", "marfil"],
    tone: "Elegant, clear, warm",
    social: { instagram: "@lunamarket" },
    status: "in_review",
    budget: "Tienda completa",
    submitted: "Ayer 16:42",
  },
  {
    id: "REQ-2039",
    client: "Nova Tech",
    contact: "ana@nova.com",
    phone: "+1 555 0130",
    industry: "Electronica",
    location: "Orlando, FL",
    description: "Tienda de electronica practica para accesorios moviles, audifonos y cargadores.",
    products: ["Audifonos", "Cargadores USB-C", "Accesorios moviles"],
    colors: ["azul confianza", "minimalista"],
    tone: "Moderno, confiable y directo",
    social: { instagram: "@novatech" },
    status: "waiting_assets",
    budget: "Catalogo",
    submitted: "05 Jun",
  },
];

const statusLabels = {
  new: "Nuevo",
  pending_payment: "Pendiente pago",
  paid: "Pagado",
  processing: "En proceso",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const requestStatusLabels = {
  new: "Nueva",
  ready_to_generate: "Lista para generar",
  ready_for_ai: "Lista para generar",
  in_review: "En revision",
  waiting_assets: "Faltan assets",
  completed: "Completada",
};

const views = {
  dashboard: {
    title: "Inicio",
    subtitle: "Control central de clientes, tiendas, pedidos y publicaciones.",
    render: renderDashboard,
  },
  requests: {
    title: "Solicitudes",
    subtitle: "Clientes que pidieron una pagina o tienda y esperan produccion.",
    render: renderRequests,
  },
  stores: {
    title: "Tiendas",
    subtitle: "Clientes, dominios, planes y estado de cada tienda.",
    render: renderStores,
  },
  storeDetail: {
    title: "Detalle de tienda",
    subtitle: "Publicacion, dominio, catalogo y estado operativo del negocio.",
    render: renderStoreDetail,
  },
  orders: {
    title: "Pedidos",
    subtitle: "Pedidos separados por tienda, cliente y estado.",
    render: renderOrders,
  },
  pages: {
    title: "Paginas web",
    subtitle: "Home, catalogo, contacto y subpaginas publicadas por tienda.",
    render: renderPages,
  },
  builder: {
    title: "Constructor AI",
    subtitle: "Genera y edita tiendas desde la informacion del cliente.",
    render: renderBuilder,
  },
  products: {
    title: "Productos",
    subtitle: "Catalogos conectados a las tiendas publicadas.",
    render: () => placeholder("Productos", "Aqui va el CRUD de productos por tienda."),
  },
  payments: {
    title: "Pagos",
    subtitle: "Conciliacion de pedidos pagados, pendientes y fallidos.",
    render: () => placeholder("Pagos", "Aqui se conectan pasarelas y comprobantes."),
  },
  settings: {
    title: "Configuracion",
    subtitle: "Planes, dominios, permisos y seguridad de la plataforma.",
    render: renderSettings,
  },
};

const content = document.querySelector("#content");
const title = document.querySelector("#viewTitle");
const subtitle = document.querySelector("#viewSubtitle");
const storeFilter = document.querySelector("#storeFilter");

let currentView = "dashboard";

function adminHeaders(extra = {}) {
  const token = localStorage.getItem("lumaAdminToken") || "";
  return {
    ...extra,
    ...(token ? { "x-admin-token": token } : {}),
  };
}

function promptForAdminToken() {
  const token = window.prompt("Admin token");
  if (!token) return;
  localStorage.setItem("lumaAdminToken", token.trim());
  loadCloudOverview();
}

init();

function init() {
  refreshStoreFilter("all");

  document.querySelectorAll(".nav-list button").forEach((button) => {
    button.addEventListener("click", () => {
      currentView = button.dataset.view;
      document
        .querySelectorAll(".nav-list button")
        .forEach((item) => item.classList.toggle("active", item === button));
      render();
    });
  });

  storeFilter.addEventListener("change", render);
  document.querySelector("#newStoreButton").addEventListener("click", () => {
    currentView = "builder";
    setActiveNav("builder");
    render();
  });
  render();
  loadCloudOverview();
}

async function loadCloudOverview() {
  try {
    const response = await fetch("/api/admin/overview", { headers: adminHeaders() });
    if (response.status === 401) {
      promptForAdminToken();
      return;
    }
    if (!response.ok) throw new Error(await response.text());
    const overview = await response.json();
    applyCloudOverview(overview);
    refreshStoreFilter(storeFilter.value || "all");
    render();
  } catch (error) {
    console.warn("Could not load cloud overview", error);
  }
}

function applyCloudOverview(overview) {
  const businesses = overview.businesses || [];
  const sites = overview.sites || [];
  const catalogItems = overview.catalog_items || [];
  const generations = overview.ai_generations || [];
  cloudBusinesses = businesses;
  cloudSites = sites;
  cloudCatalogItems = catalogItems;
  cloudGenerations = generations;
  domains = overview.domains || [];
  planLimits = overview.plan_limits || [];
  subscriptions = overview.subscriptions || [];
  adminSecurity = overview.security || { tokenConfigured: false };
  const businessById = Object.fromEntries(businesses.map((business) => [business.id, business]));
  const siteByBusiness = sites.reduce((acc, site) => {
    if (site.business_id && !acc[site.business_id]) acc[site.business_id] = site;
    return acc;
  }, {});

  requests = (overview.client_requests || []).map((request) => ({
    id: request.id,
    requestNumber: request.request_number || request.id,
    client: request.business_name || request.client_name || "Nuevo cliente",
    contact: request.contact_email || "",
    phone: request.contact_phone || "",
    industry: request.industry || "",
    location: request.location || "",
    description: request.description || "",
    products: arrayFromJson(request.services_products),
    colors: arrayFromJson(request.preferred_colors),
    tone: request.tone_style || "",
    social: request.social_links || {},
    status: request.status || "new",
    budget: request.selected_language ? `Idioma: ${request.selected_language}` : "",
    submitted: formatDate(request.created_at),
  }));

  stores = businesses.map((business) => {
    const site = siteByBusiness[business.id];
    return {
      id: business.id,
      name: business.business_name || site?.name || "Sitio sin nombre",
      owner: business.contact_info?.name || business.contact_info?.email || "Cliente",
      domain: primaryDomainForBusiness(business.id) || site?.public_slug || `${slugify(business.business_name || site?.name || "sitio")}.local`,
      status: site?.status === "published" ? "Publicada" : "Borrador",
      plan: business.plan_code || business.selected_language || "starter",
      siteId: site?.id || "",
    };
  });

  pages = sites.flatMap((site) => {
    const schemaPages = site.schema?.pages || [];
    return schemaPages.map((page) => ({
      storeId: site.business_id,
      title: page.title || page.page_key,
      slug: page.slug || "/",
      type: page.page_key || "page",
      status: site.status === "published" ? "Publicada" : "Borrador",
    }));
  });

  if (!pages.length) {
    pages = sites.map((site) => ({
      storeId: site.business_id,
      title: site.name,
      slug: "/",
      type: "Home",
      status: site.status === "published" ? "Publicada" : "Borrador",
    }));
  }

  orders = [];
  stores.forEach((store) => {
    store.catalogCount = catalogItems.filter((item) => item.business_id === store.id || item.site_id === store.siteId).length;
    store.generationCount = generations.filter((item) => item.business_id === store.id || item.site_id === store.siteId).length;
  });
}

function arrayFromJson(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("es", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function slugify(value) {
  return String(value || "sitio")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function render() {
  const view = views[currentView];
  title.textContent = view.title;
  subtitle.textContent = view.subtitle;
  content.innerHTML = view.render();
  content.querySelectorAll("[data-go-view]").forEach((button) => {
    button.addEventListener("click", () => {
      currentView = button.dataset.goView;
      setActiveNav(currentView);
      render();
    });
  });
  content.querySelectorAll("[data-build-request]").forEach((button) => {
    button.addEventListener("click", () => {
      const request = requests.find((item) => item.id === button.dataset.buildRequest);
      if (request) {
        sessionStorage.setItem("selectedClientRequest", JSON.stringify(request));
      }
      currentView = "builder";
      setActiveNav("builder");
      render();
    });
  });
  content.querySelectorAll("[data-view-store]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedBusinessId = button.dataset.viewStore;
      currentView = "storeDetail";
      setActiveNav("stores");
      render();
    });
  });
  content.querySelectorAll("[data-publish-site]").forEach((button) => {
    button.addEventListener("click", () => publishSiteFromAdmin(button.dataset.publishSite));
  });
  content.querySelectorAll("[data-copy-url]").forEach((button) => {
    button.addEventListener("click", () => copyText(button.dataset.copyUrl));
  });
  content.querySelector("#domainForm")?.addEventListener("submit", saveDomainFromForm);
  content.querySelector("#domainSearchForm")?.addEventListener("submit", searchDomainsFromForm);
  content.querySelectorAll("[data-activate-domain]").forEach((button) => {
    button.addEventListener("click", () => activateDomain(button.dataset.activateDomain));
  });
  content.querySelectorAll("[data-use-domain]").forEach((button) => {
    button.addEventListener("click", () => useSuggestedDomain(button.dataset.useDomain));
  });
  content.querySelector("#saveAdminTokenButton")?.addEventListener("click", saveAdminTokenFromSettings);
  content.querySelector("#clearAdminTokenButton")?.addEventListener("click", clearAdminTokenFromSettings);
}

function selectedStoreIds() {
  return storeFilter.value === "all"
    ? stores.map((store) => store.id)
    : [storeFilter.value];
}

function filteredOrders() {
  const selected = new Set(selectedStoreIds());
  return orders.filter((order) => selected.has(order.storeId));
}

function filteredPages() {
  const selected = new Set(selectedStoreIds());
  return pages.filter((page) => selected.has(page.storeId));
}

function renderDashboard() {
  const visibleOrders = filteredOrders();
  const paidTotal = visibleOrders
    .filter((order) => order.status === "paid")
    .reduce((sum, order) => sum + order.total, 0);

  return `
    <section class="metric-grid">
      ${metric("Tiendas activas", stores.filter((store) => store.status === "Activa").length, "Clientes operando")}
      ${metric("Solicitudes", requests.filter((request) => request.status !== "in_review").length, "Pendientes de accion")}
      ${metric("Pedidos abiertos", visibleOrders.filter((order) => !["delivered", "cancelled"].includes(order.status)).length, "Requieren seguimiento")}
      ${metric("Pagados", visibleOrders.filter((order) => order.status === "paid").length, `$${paidTotal.toFixed(2)} confirmados`)}
    </section>
    <section class="section-grid">
      <article class="data-card">
        <div class="card-header">
          <h2>Trabajo pendiente</h2>
          <button class="text-button" data-go-view="requests" type="button">Ver solicitudes</button>
        </div>
        ${requestsTable(requests)}
      </article>
      <article class="data-card">
        <div class="card-header"><h2>Tiendas recientes</h2><span>Estado</span></div>
        ${storesTable(stores)}
      </article>
    </section>
    <section class="data-card wide-card">
      <div class="card-header">
        <h2>Pedidos recientes</h2>
        <button class="text-button" data-go-view="orders" type="button">Ver pedidos</button>
      </div>
      ${ordersTable(visibleOrders.slice(0, 6))}
    </section>
  `;
}

function renderRequests() {
  return `<section class="data-card">
    <div class="card-header">
      <h2>Solicitudes de clientes</h2>
      <button class="primary-button" data-build-request="${requests[0]?.id || ""}" type="button">Generar con AI</button>
    </div>
    ${requestsTable(requests)}
  </section>`;
}

function renderStores() {
  return `<section class="card-list">
    ${stores
      .map(
        (store) => `<article class="store-card">
          <strong>${store.name}</strong>
          <span>Cliente: ${store.owner}</span>
          <span>Dominio: ${store.domain}</span>
          <span>Plan: ${store.plan}</span>
          <span>Estado: ${store.status}</span>
          <div class="card-actions">
            <button class="text-button" data-view-store="${escapeAttribute(store.id)}" type="button">Ver detalle</button>
            ${store.siteId ? `<button class="text-button" data-publish-site="${escapeAttribute(store.siteId)}" type="button">Publicar</button>` : ""}
          </div>
        </article>`,
      )
      .join("")}
  </section>`;
}

function renderStoreDetail() {
  const store = stores.find((item) => item.id === selectedBusinessId) || stores[0];
  if (!store) {
    return placeholder("Sin tiendas", "Aun no hay negocios cargados desde Supabase.");
  }
  selectedBusinessId = store.id;
  const business = cloudBusinesses.find((item) => item.id === store.id) || {};
  const site = cloudSites.find((item) => item.business_id === store.id) || {};
  const storeDomains = domains.filter((item) => item.business_id === store.id);
  const catalog = cloudCatalogItems.filter((item) => item.business_id === store.id || item.site_id === store.siteId);
  const storePages = pages.filter((item) => item.storeId === store.id);
  const publicUrl = site.id ? `/site.html?site_id=${encodeURIComponent(site.id)}` : "";
  const activeDomain = storeDomains.find((item) => item.status === "active");
  const domainUrl = activeDomain ? `https://${activeDomain.domain}` : "";
  const finalUrl = domainUrl || publicUrl;
  const publishState = site.status !== "published"
    ? "Borrador"
    : activeDomain
      ? "Publicado con dominio"
      : "Publicado sin dominio";
  return `
    <section class="detail-header data-card">
      <div>
        <button class="text-button" data-go-view="stores" type="button">Volver a tiendas</button>
        <h2>${escapeHtml(store.name)}</h2>
        <p>${escapeHtml(business.business_description || "Negocio generado desde intake/AI.")}</p>
      </div>
      <div class="detail-actions">
        ${site.id ? `<button class="primary-button" data-publish-site="${escapeAttribute(site.id)}" type="button">Publicar ahora</button>` : ""}
        ${finalUrl ? `<button class="secondary-link" data-copy-url="${escapeAttribute(finalUrl)}" type="button">Copiar link final</button>` : ""}
        ${publicUrl ? `<a class="secondary-link" href="${escapeAttribute(publicUrl)}" target="_blank" rel="noreferrer">Abrir por site_id</a>` : ""}
        ${domainUrl ? `<a class="secondary-link" href="${escapeAttribute(domainUrl)}" target="_blank" rel="noreferrer">Abrir dominio</a>` : ""}
      </div>
    </section>

    <section class="metric-grid">
      ${metric("Estado", publishState, "Publicacion")}
      ${metric("Plan", store.plan, "Limites aplicados luego")}
      ${metric("Catalogo", catalog.length, "Items conectados")}
      ${metric("Dominios", storeDomains.length, `${storeDomains.filter((item) => item.status === "active").length} activos`)}
    </section>

    <section class="section-grid">
      <article class="data-card">
        <div class="card-header"><h2>Publicacion</h2><span>${escapeHtml(site.status || "sin sitio")}</span></div>
        <div class="settings-form">
          <p><strong>Site ID:</strong> ${escapeHtml(site.id || "No generado")}</p>
          <p><strong>URL temporal:</strong> ${publicUrl ? `<code>${escapeHtml(publicUrl)}</code>` : "No disponible"}</p>
          <p><strong>Dominio activo:</strong> ${activeDomain ? `<code>${escapeHtml(activeDomain.domain)}</code>` : "Pendiente"}</p>
          <p><strong>Link final:</strong> ${finalUrl ? `<code>${escapeHtml(finalUrl)}</code>` : "Pendiente"}</p>
          <p class="settings-note">El link por dominio funciona cuando el dominio esta activo y el hosting apunta al resolver publico.</p>
        </div>
      </article>
      <article class="data-card">
        <div class="card-header"><h2>Cliente</h2><span>${escapeHtml(business.industry || "")}</span></div>
        <div class="settings-form">
          <p><strong>Contacto:</strong> ${escapeHtml(store.owner)}</p>
          <p><strong>Ubicacion:</strong> ${escapeHtml(business.location || "")}</p>
          <p><strong>Idioma:</strong> ${escapeHtml(business.selected_language || "")}</p>
          <p><strong>Tono:</strong> ${escapeHtml(business.preferred_tone || "")}</p>
        </div>
      </article>
    </section>

    <section class="section-grid">
      <article class="data-card">
        <div class="card-header"><h2>Dominios de esta tienda</h2><span>${storeDomains.length}</span></div>
        ${domainsTable(storeDomains)}
      </article>
      <article class="data-card">
        <div class="card-header"><h2>Paginas</h2><span>${storePages.length}</span></div>
        ${storePagesTable(storePages)}
      </article>
    </section>

    <section class="data-card wide-card">
      <div class="card-header"><h2>Catalogo conectado</h2><span>${catalog.length} items</span></div>
      ${catalogItemsTable(catalog)}
    </section>
  `;
}

function openNewStoreModal() {
  const name = window.prompt("Nombre de la nueva tienda", "Nueva Tienda");
  if (!name || !name.trim()) {
    return;
  }

  const owner = window.prompt("Nombre del cliente", "Cliente nuevo");
  if (!owner || !owner.trim()) {
    return;
  }

  const id = slugify(name);
  const uniqueId = stores.some((store) => store.id === id)
    ? `${id}-${stores.length + 1}`
    : id;
  const domain = `${uniqueId}.misas.com`;

  stores.push({
    id: uniqueId,
    name: name.trim(),
    owner: owner.trim(),
    domain,
    status: "Revision",
    plan: "Starter",
  });

  pages.push(
    {
      storeId: uniqueId,
      title: "Home",
      slug: "/",
      type: "Home",
      status: "Borrador",
    },
    {
      storeId: uniqueId,
      title: "Catalogo",
      slug: "/catalogo",
      type: "Catalog",
      status: "Borrador",
    },
    {
      storeId: uniqueId,
      title: "Contacto",
      slug: "/contacto",
      type: "Contact",
      status: "Borrador",
    },
  );

  refreshStoreFilter(uniqueId);
  currentView = "stores";
  setActiveNav("stores");
  render();
}

function renderOrders() {
  const groups = ["new", "pending_payment", "paid", "processing", "shipped"];
  const visibleOrders = filteredOrders();
  return `<section class="kanban">
    ${groups
      .map((status) => {
        const groupOrders = visibleOrders.filter((order) => order.status === status);
        return `<article class="kanban-column">
          <h3>${statusLabels[status]} (${groupOrders.length})</h3>
          ${groupOrders.map(orderCard).join("") || "<p>Sin pedidos.</p>"}
        </article>`;
      })
      .join("")}
  </section>`;
}

function renderPages() {
  return `<section class="card-list">
    ${filteredPages()
      .map((page) => {
        const store = stores.find((item) => item.id === page.storeId);
        return `<article class="page-card">
          <strong>${page.title}</strong>
          <span class="page-type">${page.type}</span>
          <span>Tienda: ${store?.name || page.storeId}</span>
          <span>Ruta: ${page.slug}</span>
          <span>Estado: ${page.status}</span>
        </article>`;
      })
      .join("")}
  </section>`;
}

function renderBuilder() {
  return `<section class="builder-module">
    <div class="builder-intro">
      <div>
        <h2>Constructor AI</h2>
        <p>Convierte una solicitud del cliente en una tienda editable. La generacion usa OpenAI solo desde backend.</p>
      </div>
      <a class="primary-link" href="/admin/builder/" target="_blank" rel="noreferrer">Abrir en pantalla completa</a>
    </div>
    <iframe title="Constructor AI" src="/ai-builder.html?guided=0"></iframe>
  </section>`;
}

function renderSettings() {
  const selectedStoreOptions = stores
    .map((store) => `<option value="${escapeAttribute(store.id)}">${escapeHtml(store.name)}</option>`)
    .join("");
  const siteOptions = [
    '<option value="">Auto: usar el sitio publicado del negocio</option>',
    ...stores
      .filter((store) => store.siteId)
      .map((store) => `<option value="${escapeAttribute(store.siteId)}">${escapeHtml(store.name)} - sitio principal</option>`),
  ].join("");

  return `
    <section class="metric-grid settings-metrics">
      ${metric("Negocios", stores.length, "Tenants registrados")}
      ${metric("Dominios", domains.length, `${domains.filter((item) => item.status === "active").length} activos`)}
      ${metric("Planes", planLimits.length || 3, "Starter, Business, Pro")}
      ${metric("Admin token", adminSecurity.tokenConfigured ? "Activo" : "Demo", adminSecurity.tokenConfigured ? "API protegida" : "Configuralo antes de vender")}
    </section>

    <section class="section-grid settings-grid">
      <article class="data-card">
        <div class="card-header">
          <h2>Buscar dominio</h2>
          <span>Disponibilidad preliminar</span>
        </div>
        <form id="domainSearchForm" class="settings-form">
          <label>Nombre deseado
            <input name="domainQuery" placeholder="luna market, barber pro, mitienda.com" required>
          </label>
          <button class="primary-button" type="submit">Buscar opciones</button>
          <p class="settings-note">Esto genera opciones rapido. Antes de vender o comprar se confirma disponibilidad y precio con registrador real.</p>
        </form>
        ${domainSearchResults()}
      </article>

      <article class="data-card">
        <div class="card-header">
          <h2>Agregar dominio</h2>
          <span>Subdominio o dominio propio</span>
        </div>
        <form id="domainForm" class="settings-form">
          <label>Negocio
            <select name="businessId" required>${selectedStoreOptions}</select>
          </label>
          <label>Sitio
            <select name="siteId">${siteOptions}</select>
          </label>
          <label>Dominio
            <input id="domainInput" name="domain" placeholder="cliente.vmbusinesssystems.com" required>
          </label>
          <label>Tipo
            <select name="domainType">
              <option value="subdomain">Subdominio</option>
              <option value="custom">Dominio propio</option>
            </select>
          </label>
          <button class="primary-button" type="submit">Guardar dominio</button>
          <p class="settings-note">Despues de guardar, copia el token TXT en DNS y marca activo cuando este verificado.</p>
        </form>
      </article>

      <article class="data-card">
        <div class="card-header">
          <h2>Seguridad admin</h2>
          <span>${adminSecurity.tokenConfigured ? "Protegido" : "Pendiente"}</span>
        </div>
        <div class="settings-form">
          <label>Token local del panel
            <input id="adminTokenInput" type="password" placeholder="Pega ADMIN_API_TOKEN">
          </label>
          <div class="inline-actions">
            <button id="saveAdminTokenButton" class="primary-button" type="button">Guardar token</button>
            <button id="clearAdminTokenButton" class="secondary-link" type="button">Limpiar</button>
          </div>
          <p class="settings-note">Esto no crea el token del servidor; solo guarda en este navegador el token que definamos en el backend.</p>
        </div>
      </article>
    </section>

    <section class="data-card wide-card">
      <div class="card-header"><h2>Dominios</h2><span>${domains.length} configurados</span></div>
      ${domainsTable(domains)}
    </section>

    <section class="section-grid">
      <article class="data-card">
        <div class="card-header"><h2>Planes y limites</h2><span>Capacidad comercial</span></div>
        ${plansTable(planLimits)}
      </article>
      <article class="data-card">
        <div class="card-header"><h2>Suscripciones</h2><span>${subscriptions.length} registros</span></div>
        ${subscriptionsTable(subscriptions)}
      </article>
    </section>
  `;
}

async function saveDomainFromForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = {
    businessId: form.elements.businessId.value,
    siteId: form.elements.siteId.value || null,
    domain: form.elements.domain.value.trim(),
    domainType: form.elements.domainType.value,
  };
  try {
    const response = await fetch("/api/admin/domains", {
      method: "POST",
      headers: adminHeaders({ "content-type": "application/json" }),
      body: JSON.stringify(payload),
    });
    if (response.status === 401) {
      promptForAdminToken();
      return;
    }
    if (!response.ok) throw new Error(await response.text());
    await loadCloudOverview();
  } catch (error) {
    window.alert(`No se pudo guardar el dominio: ${shortMessage(error)}`);
  }
}

async function searchDomainsFromForm(event) {
  event.preventDefault();
  const query = event.currentTarget.elements.domainQuery.value.trim();
  if (!query) return;
  domainSearch = {
    query,
    provider: "checking",
    exactAvailability: false,
    results: [],
  };
  render();
  try {
    const response = await fetch(`/api/admin/domain-search?q=${encodeURIComponent(query)}`, {
      headers: adminHeaders(),
    });
    if (response.status === 401) {
      promptForAdminToken();
      return;
    }
    if (!response.ok) throw new Error(await response.text());
    const result = await response.json();
    domainSearch = {
      query: result.query,
      provider: result.provider,
      exactAvailability: Boolean(result.exact_availability || result.exactAvailability),
      results: result.results || [],
    };
    render();
  } catch (error) {
    domainSearch = {
      query,
      provider: "error",
      exactAvailability: false,
      results: [{ domain: query, status: shortMessage(error), available_hint: false }],
    };
    render();
  }
}

function useSuggestedDomain(domain) {
  const input = content.querySelector("#domainInput");
  if (input) input.value = domain;
}

async function activateDomain(domainId) {
  if (!domainId) return;
  try {
    const response = await fetch(`/api/admin/domains/${encodeURIComponent(domainId)}/activate`, {
      method: "POST",
      headers: adminHeaders(),
    });
    if (response.status === 401) {
      promptForAdminToken();
      return;
    }
    if (!response.ok) throw new Error(await response.text());
    await loadCloudOverview();
  } catch (error) {
    window.alert(`No se pudo activar el dominio: ${shortMessage(error)}`);
  }
}

async function publishSiteFromAdmin(siteId) {
  if (!siteId) return;
  try {
    const response = await fetch(`/sites/${encodeURIComponent(siteId)}/publish-complete`, {
      method: "POST",
      headers: adminHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({}),
    });
    if (response.status === 401) {
      promptForAdminToken();
      return;
    }
    if (!response.ok) throw new Error(await response.text());
    const result = await response.json();
    lastPublishedUrl = result.finalUrl || result.final_url || result.public_url || "";
    await loadCloudOverview();
    window.alert(`Publicado: ${lastPublishedUrl || result.site_id}`);
  } catch (error) {
    window.alert(`No se pudo publicar: ${shortMessage(error)}`);
  }
}

async function copyText(value) {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    window.alert("Link copiado.");
  } catch {
    window.prompt("Copia el link:", value);
  }
}

function saveAdminTokenFromSettings() {
  const value = content.querySelector("#adminTokenInput")?.value.trim();
  if (!value) return;
  localStorage.setItem("lumaAdminToken", value);
  loadCloudOverview();
}

function clearAdminTokenFromSettings() {
  localStorage.removeItem("lumaAdminToken");
  loadCloudOverview();
}

function requestsTable(rows) {
  return `<table>
    <thead><tr><th>Solicitud</th><th>Cliente</th><th>Tipo</th><th>Estado</th><th>Accion</th></tr></thead>
    <tbody>${rows
      .map(
        (request) => `<tr>
          <td><strong>${request.id}</strong><br><small>${request.submitted}</small></td>
          <td>${request.client}<br><small>${request.contact}</small></td>
          <td>${request.industry}<br><small>${request.budget}</small></td>
          <td><span class="status status-${request.status}">${requestStatusLabels[request.status]}</span></td>
          <td><button class="text-button" data-build-request="${request.id}" type="button">Generar</button></td>
        </tr>`,
      )
      .join("")}</tbody>
  </table>`;
}

function ordersTable(rows) {
  return `<table>
    <thead><tr><th>Pedido</th><th>Tienda</th><th>Cliente</th><th>Total</th><th>Estado</th></tr></thead>
    <tbody>${rows
      .map((order) => {
        const store = stores.find((item) => item.id === order.storeId);
        return `<tr>
          <td><strong>${order.id}</strong><br><small>${order.date}</small></td>
          <td>${store?.name || order.storeId}</td>
          <td>${order.customer}<br><small>${order.items}</small></td>
          <td>$${order.total.toFixed(2)}</td>
          <td>${statusBadge(order.status)}</td>
        </tr>`;
      })
      .join("")}</tbody>
  </table>`;
}

function storesTable(rows) {
  return `<table>
    <thead><tr><th>Tienda</th><th>Dominio</th><th>Plan</th></tr></thead>
    <tbody>${rows
      .map(
        (store) => `<tr>
          <td><strong>${store.name}</strong><br><small>${store.owner}</small></td>
          <td>${store.domain}</td>
          <td>${store.plan}</td>
        </tr>`,
      )
      .join("")}</tbody>
  </table>`;
}

function domainsTable(rows) {
  if (!rows.length) {
    return `<div class="empty-state">Todavia no hay dominios. Agrega uno para publicar por subdominio o dominio propio.</div>`;
  }
  return `<table>
    <thead><tr><th>Dominio</th><th>Negocio</th><th>Estado</th><th>Verificacion DNS</th><th>Accion</th></tr></thead>
    <tbody>${rows
      .map((domain) => {
        const store = stores.find((item) => item.id === domain.business_id);
        return `<tr>
          <td><strong>${escapeHtml(domain.domain)}</strong><br><small>${escapeHtml(domain.domain_type)}</small></td>
          <td>${escapeHtml(store?.name || domain.business_id)}</td>
          <td><span class="status status-${escapeAttribute(domain.status)}">${escapeHtml(domain.status)}</span></td>
          <td><code>${escapeHtml(domain.verification_token || "Sin token")}</code></td>
          <td>${
            domain.status === "active"
              ? '<span class="muted-cell">Activo</span>'
              : `<button class="text-button" data-activate-domain="${escapeAttribute(domain.id)}" type="button">Marcar activo</button>`
          }</td>
        </tr>`;
      })
      .join("")}</tbody>
  </table>`;
}

function storePagesTable(rows) {
  if (!rows.length) {
    return `<div class="empty-state">Este sitio aun no tiene paginas registradas.</div>`;
  }
  return `<table>
    <thead><tr><th>Pagina</th><th>Ruta</th><th>Estado</th></tr></thead>
    <tbody>${rows
      .map((page) => `<tr>
        <td><strong>${escapeHtml(page.title)}</strong><br><small>${escapeHtml(page.type)}</small></td>
        <td>${escapeHtml(page.slug)}</td>
        <td>${escapeHtml(page.status)}</td>
      </tr>`)
      .join("")}</tbody>
  </table>`;
}

function catalogItemsTable(rows) {
  if (!rows.length) {
    return `<div class="empty-state">El catalogo aparecera aqui cuando el sitio tenga productos/servicios guardados.</div>`;
  }
  return `<table>
    <thead><tr><th>Item</th><th>Precio</th><th>Estado</th></tr></thead>
    <tbody>${rows
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
      .map((item) => `<tr>
        <td><strong>${escapeHtml(item.name)}</strong><br><small>${escapeHtml(item.description || "")}</small></td>
        <td>${escapeHtml(item.price_label || item.price_type || "")}</td>
        <td>${item.is_active === false ? "Inactivo" : "Activo"}${item.is_featured ? " · destacado" : ""}</td>
      </tr>`)
      .join("")}</tbody>
  </table>`;
}

function domainSearchResults() {
  if (domainSearch.provider === "checking") {
    return `<div class="domain-results"><p class="settings-note">Buscando opciones...</p></div>`;
  }
  if (!domainSearch.results.length) {
    return `<div class="domain-results"><p class="settings-note">Busca un nombre para ver sugerencias .com, .store, .shop y mas.</p></div>`;
  }
  return `<div class="domain-results">
    <div class="domain-result-head">
      <strong>Resultados para ${escapeHtml(domainSearch.query)}</strong>
      <span>${domainSearch.exactAvailability ? "Disponibilidad real" : "Sugerencias rapidas"}</span>
    </div>
    ${domainSearch.results
      .map((item) => {
        const hintedAvailable = Boolean(item.available_hint);
        const included = Boolean(item.included_in_package);
        const review = Boolean(item.requires_review);
        const label = included
          ? "Disponible e incluido"
          : review
            ? "Disponible, requiere revision"
            : hintedAvailable
              ? "Candidato para revisar/comprar"
              : "No disponible";
        const actionLabel = included || hintedAvailable ? "Usar" : "Revisar";
        return `<article class="domain-result ${hintedAvailable ? "available" : "taken"}">
          <div>
            <strong>${escapeHtml(item.domain)}</strong>
            <span>${label}</span>
            <small>${escapeHtml(item.confidence || "dns_hint")}</small>
          </div>
          <button class="text-button" data-use-domain="${escapeAttribute(item.domain)}" type="button">${actionLabel}</button>
        </article>`;
      })
      .join("")}
  </div>`;
}

function plansTable(rows) {
  if (!rows.length) {
    return `<div class="empty-state">Los planes apareceran aqui cuando Supabase responda.</div>`;
  }
  return `<table>
    <thead><tr><th>Plan</th><th>Precio</th><th>Limites</th></tr></thead>
    <tbody>${rows
      .map((plan) => `<tr>
        <td><strong>${escapeHtml(plan.name || plan.plan_code)}</strong><br><small>${escapeHtml(plan.plan_code)}</small></td>
        <td>$${Number(plan.monthly_price || 0).toFixed(2)}/mes<br><small>Setup $${Number(plan.setup_price || 0).toFixed(2)}</small></td>
        <td>${Number(plan.max_sites || 0)} sitios · ${Number(plan.max_catalog_items || 0)} items<br><small>${Number(plan.storage_mb || 0)} MB · dominio propio: ${plan.custom_domain_enabled ? "si" : "no"}</small></td>
      </tr>`)
      .join("")}</tbody>
  </table>`;
}

function subscriptionsTable(rows) {
  if (!rows.length) {
    return `<div class="empty-state">Sin suscripciones todavia. Se conectara a Stripe/PayPal en la fase de cobro.</div>`;
  }
  return `<table>
    <thead><tr><th>Negocio</th><th>Plan</th><th>Estado</th></tr></thead>
    <tbody>${rows
      .map((subscription) => {
        const store = stores.find((item) => item.id === subscription.business_id);
        return `<tr>
          <td>${escapeHtml(store?.name || subscription.business_id)}</td>
          <td>${escapeHtml(subscription.plan_code)}</td>
          <td><span class="status status-${escapeAttribute(subscription.status)}">${escapeHtml(subscription.status)}</span></td>
        </tr>`;
      })
      .join("")}</tbody>
  </table>`;
}

function orderCard(order) {
  const store = stores.find((item) => item.id === order.storeId);
  return `<article class="order-card">
    <strong>${order.id} · $${order.total.toFixed(2)}</strong>
    <span>${store?.name || order.storeId}</span>
    <span>${order.customer}</span>
    <span>${order.items}</span>
    <span>${order.date}</span>
  </article>`;
}

function metric(label, value, note) {
  return `<article class="metric-card">
    <span class="metric-label">${label}</span>
    <strong class="metric-value">${value}</strong>
    <small class="metric-note">${note}</small>
  </article>`;
}

function statusBadge(status) {
  return `<span class="status status-${status}">${statusLabels[status] || status}</span>`;
}

function placeholder(heading, text) {
  return `<article class="data-card">
    <div class="card-header"><h2>${heading}</h2></div>
    <div style="padding:16px"><p>${text}</p></div>
  </article>`;
}

function primaryDomainForBusiness(businessId) {
  const active = domains.find((domain) => domain.business_id === businessId && domain.status === "active");
  const pending = domains.find((domain) => domain.business_id === businessId);
  return active?.domain || pending?.domain || "";
}

function shortMessage(error) {
  return String(error?.message || error || "Error desconocido").slice(0, 240);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function refreshStoreFilter(selectedId = storeFilter.value) {
  storeFilter.innerHTML = [
    '<option value="all">Todas las tiendas</option>',
    ...stores.map((store) => `<option value="${store.id}">${store.name}</option>`),
  ].join("");
  storeFilter.value = selectedId;
}

function setActiveNav(view) {
  document.querySelectorAll(".nav-list button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
