const demoPortalPayload = {
  overview: {
    success: true,
    status: "ok",
    client: {
      client_id: "demo-client-los-andes",
      business_id: "los-andes-central",
      branch_code: "principal",
      license_ids: ["LISTO-DEV-001"],
      display_name: "Comercial Los Andes, C.A.",
      software_name: "Listo",
      product_family: "listo",
      country_code: "US",
      base_currency_code: "USD",
      plan_code: "demo",
      allowed_devices: 5,
    },
    summary: {
      devices_total: 2,
      backups_total: 12,
      latest_device_seen_at: "2026-05-10T21:40:00.000Z",
      latest_backup_at: "2026-05-10T22:23:57.376719Z",
      latest_backup_status: "uploaded",
    },
    tenant_contexts: [
      {
        business_id: "los-andes-central",
        branch_code: "principal",
        last_activity_at: "2026-05-10T22:23:57.376719Z",
        source: "device+backup",
      },
      {
        business_id: "los-andes-central",
        branch_code: "deposito",
        last_activity_at: "2026-05-10T18:05:00.000Z",
        source: "device",
      },
    ],
    latest_backup: {
      backup_id: "flow_auto_2026-05-10_22-23-57-376719",
      backup_type: "automatico",
      status: "uploaded",
      storage_path:
        "clients/demo-client-los-andes/businesses/los-andes-central/branches/principal/backups/2026/05/flow_auto_2026-05-10_22-23-57-376719.flowbackup",
      verified_at: "2026-05-10T22:24:02.000Z",
      sha256: "80c302d88e23fa416387b7a0d04c3f97628138174cea0a5e8c4927d3b952916a",
      tenant_scope: {
        businessId: "los-andes-central",
        branchCode: "principal",
      },
    },
    latest_release: {
      version: "0.1.0",
      storage_path: "listo/windows/preview/Listo-Setup-0.1.0.exe",
      platforms: [
        {
          platform: "web",
          label: "Abrir Web",
          url: "https://app.vmbusinesssystems.com/listo",
          status: "preview",
        },
        {
          platform: "windows",
          label: "Windows",
          storage_path: "listo/windows/preview/Listo-Setup-0.1.0.exe",
          status: "preview",
        },
        {
          platform: "android",
          label: "Android APK",
          storage_path: "listo/android/preview/listo-0.1.0.apk",
          status: "preparado",
        },
        {
          platform: "ios",
          label: "iOS",
          status: "pendiente",
        },
      ],
    },
    activation: {
      activation_code: "LISTO-DEV-001",
      qr_payload:
        "LISTO:ACTIVATE:LISTO-DEV-001:demo-client-los-andes:los-andes-central",
      expires_in_minutes: 30,
      allowed_devices: 5,
      offline_grace_days: 7,
    },
    business_profile: {
      country_code: "US",
      country_name: "United States",
      base_currency_code: "USD",
      primary_tax_label: "Sales tax",
      primary_tax_rate: 0,
      secondary_tax_label: "Additional tax",
      secondary_tax_rate: 0,
      compliance_profile: "generic",
    },
    current_exchange_rate: {
      currency_code: "USD",
      quote_currency_code: "VES",
      rate_value: 499.8608,
      valid_date: "2026-05-08T00:00:00.000Z",
      fetched_at: "2026-05-10T22:30:00.000Z",
      source_name: "Banco Central de Venezuela",
      source_type: "bcv_website",
      source_url: "https://www.bcv.org.ve/",
    },
    current_exchange_rate_error: null,
  },
  devices: {
    devices: [
      {
        device_display_name: "Caja principal",
      device_identifier: "LISTO-WINDOWS-DEMO-001",
        platform: "windows-x64",
        status: "active",
        business_id: "los-andes-central",
        branch_code: "principal",
        last_seen_at: "2026-05-10T21:40:00.000Z",
      },
      {
        device_display_name: "Servidor de respaldo",
        device_identifier: "LISTO-ANDROID-DEMO-002",
        platform: "android",
        status: "active",
        business_id: "los-andes-central",
        branch_code: "deposito",
        last_seen_at: "2026-05-10T18:05:00.000Z",
      },
    ],
  },
  backups: {
    backups: [
      {
        backup_id: "flow_auto_2026-05-10_22-23-57-376719",
        status: "uploaded",
        storage_path:
          "clients/demo-client-los-andes/businesses/los-andes-central/branches/principal/backups/2026/05/flow_auto_2026-05-10_22-23-57-376719.flowbackup",
        backup_type: "automatico",
        file_size_bytes: 950272,
        created_at: "2026-05-10T22:23:57.376719Z",
        verified_at: "2026-05-10T22:24:02.000Z",
        sha256: "80c302d88e23fa416387b7a0d04c3f97628138174cea0a5e8c4927d3b952916a",
        tenant_scope: {
          businessId: "los-andes-central",
          branchCode: "principal",
        },
      },
      {
        backup_id: "flow_manual_2026-05-10_16-10-18-120111",
        status: "uploaded",
        storage_path:
          "clients/demo-client-los-andes/businesses/los-andes-central/branches/principal/backups/2026/05/flow_manual_2026-05-10_16-10-18-120111.flowbackup",
        backup_type: "manual",
        file_size_bytes: 948800,
        created_at: "2026-05-10T16:10:18.120111Z",
      },
      {
        backup_id: "flow_auto_2026-05-09_21-00-03-001112",
        status: "uploaded",
        storage_path:
          "clients/demo-client-los-andes/businesses/los-andes-central/branches/deposito/backups/2026/05/flow_auto_2026-05-09_21-00-03-001112.flowbackup",
        backup_type: "automatico",
        file_size_bytes: 947120,
        created_at: "2026-05-09T21:00:03.001112Z",
      },
    ],
  },
};

const portalElements = {
  gatewayUrl: document.getElementById("gatewayUrl"),
  flowWebUrl: document.getElementById("flowWebUrl"),
  clientId: document.getElementById("clientId"),
  businessId: document.getElementById("businessId"),
  branchCode: document.getElementById("branchCode"),
  portalToken: document.getElementById("portalToken"),
  loadButtons: [
    document.getElementById("portalLoadButtonHero"),
    document.getElementById("portalLoadButtonCard"),
  ].filter(Boolean),
  demoButtons: [
    document.getElementById("portalDemoButtonHero"),
    document.getElementById("portalDemoButtonCard"),
  ].filter(Boolean),
  printButtons: [
    document.getElementById("portalPrintButtonHero"),
    document.getElementById("portalPrintButtonCard"),
  ].filter(Boolean),
  openFlowButtons: [
    document.getElementById("portalOpenFlowButtonHero"),
    document.getElementById("portalOpenFlowButtonCard"),
  ].filter(Boolean),
  downloadInstallerButtons: [
    document.getElementById("portalDownloadInstallerButtonHero"),
    document.getElementById("portalDownloadInstallerButtonCard"),
  ].filter(Boolean),
  logoutButton: document.getElementById("portalLogoutButton"),
  clearButton: document.getElementById("portalClearButton"),
  diagnosticBox: document.getElementById("portalDiagnosticBox"),
  dashboardTitle: document.getElementById("portalDashboardTitle"),
  dashboardSubtitle: document.getElementById("portalDashboardSubtitle"),
  sessionRoleBadge: document.getElementById("portalSessionRoleBadge"),
  sessionIdentity: document.getElementById("portalSessionIdentity"),
  clientMetric: document.getElementById("portalClientMetric"),
  licenseMetric: document.getElementById("portalLicenseMetric"),
  devicesMetric: document.getElementById("portalDevicesMetric"),
  devicesCaption: document.getElementById("portalDevicesCaption"),
  backupsMetric: document.getElementById("portalBackupsMetric"),
  backupsCaption: document.getElementById("portalBackupsCaption"),
  releaseMetric: document.getElementById("portalReleaseMetric"),
  releaseCaption: document.getElementById("portalReleaseCaption"),
  activationCode: document.getElementById("portalActivationCode"),
  activationQrPayload: document.getElementById("portalActivationQrPayload"),
  activationMeta: document.getElementById("portalActivationMeta"),
  businessProfile: document.getElementById("portalBusinessProfile"),
  platformsList: document.getElementById("portalPlatformsList"),
  rateTitle: document.getElementById("portalRateTitle"),
  rateValue: document.getElementById("portalRateValue"),
  rateMeta: document.getElementById("portalRateMeta"),
  rateCaption: document.getElementById("portalRateCaption"),
  tenantContexts: document.getElementById("portalTenantContexts"),
  latestBackup: document.getElementById("portalLatestBackup"),
  devicesList: document.getElementById("portalDevicesList"),
  backupsList: document.getElementById("portalBackupsList"),
  siteLoadLatestButton: document.getElementById("portalSiteLoadLatestButton"),
  siteLoadDemoButton: document.getElementById("portalSiteLoadDemoButton"),
  siteSaveButton: document.getElementById("portalSiteSaveButton"),
  sitePublishButton: document.getElementById("portalSitePublishButton"),
  siteAddCatalogButton: document.getElementById("portalSiteAddCatalogButton"),
  siteEditorStatus: document.getElementById("portalSiteEditorStatus"),
  sitePageList: document.getElementById("portalSitePageList"),
  siteSectionList: document.getElementById("portalSiteSectionList"),
  siteEditorForm: document.getElementById("portalSiteEditorForm"),
  siteCatalogList: document.getElementById("portalSiteCatalogList"),
  sitePreview: document.getElementById("portalSitePreview"),
};

const portalStorageKeys = {
  gatewayUrl: "vm_portal_gateway_url",
  flowWebUrl: "vm_portal_flow_web_url",
  clientId: "vm_portal_client_id",
  businessId: "vm_portal_business_id",
  branchCode: "vm_portal_branch_code",
  previewToken: "vm_portal_preview_token",
  previewInfo: "vm_portal_preview_info",
  siteDraft: "vm_portal_site_draft",
  generatedSite: "lumaGeneratedSite",
};

const defaultPortalGatewayUrl = "https://api.vmbusinesssystems.com";
const defaultFlowWebUrl = "http://localhost:7357";

const seededDemoTenant = {
  clientId: demoPortalPayload.overview.client.client_id,
  businessId: demoPortalPayload.overview.client.business_id,
  branchCode: demoPortalPayload.overview.client.branch_code,
};

const portalRuntimeState = {
  overview: null,
  devices: null,
  backups: null,
  source: "demo",
};

const portalSiteState = {
  schema: null,
  selectedPageKey: "home",
  selectedSectionId: "",
};

function setPortalText(element, value) {
  if (element) {
    element.textContent = value;
  }
}

function portalEmptyBox(message) {
  return `<div class="portal-empty-box">${message}</div>`;
}

function portalEscaped(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function portalClone(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function portalSiteDefaultSchema() {
  return {
    schema_version: "1.0",
    business: {
      name: "Luna Studio",
      description: "Estudio creativo para marcas que quieren vender mejor en línea.",
      industry: "Servicios creativos",
      location: "Miami, FL",
      selectedLanguage: "es",
    },
    theme: {
      colors: {
        background: "#f7fbff",
        primary: "#0f766e",
        secondary: "#7c3aed",
        text: "#0f172a",
      },
      buttons: {
        primary_label: "Solicitar propuesta",
        secondary_label: "Ver servicios",
      },
    },
    global_components: {
      logo_url: "",
      footer_text: "Sitio creado con Luma AI Builder.",
    },
    contact: {
      phone: "+1 555 0100",
      email: "hola@lunastudio.com",
      instagram: "@lunastudio",
    },
    navigation: [
      { label: "Inicio", page_key: "home" },
      { label: "Catálogo", page_key: "catalog" },
      { label: "Contacto", page_key: "contact" },
    ],
    pages: [
      {
        page_key: "home",
        title: "Inicio",
        sections: [
          {
            id: "hero",
            type: "Hero",
            order: 1,
            editable: {
              headline: "Una web elegante para vender con claridad",
              subtitle: "Presenta tu marca, muestra tus servicios y convierte visitas en clientes.",
              primary_button: "Empezar ahora",
              secondary_button: "Explorar catálogo",
              image_url: "",
            },
          },
          {
            id: "services",
            type: "ServiceList",
            order: 2,
            editable: {
              title: "Servicios principales",
              subtitle: "Paquetes listos para marcas que quieren avanzar rápido.",
            },
          },
        ],
      },
      {
        page_key: "catalog",
        title: "Catálogo",
        sections: [
          {
            id: "catalog-grid",
            type: "ProductGrid",
            order: 1,
            editable: {
              title: "Catálogo editable",
              subtitle: "Activa, destaca y actualiza cada producto desde tu portal.",
            },
          },
        ],
      },
      {
        page_key: "contact",
        title: "Contacto",
        sections: [
          {
            id: "contact",
            type: "Contact",
            order: 1,
            editable: {
              title: "Hablemos de tu proyecto",
              subtitle: "Escríbenos y te respondemos con el próximo paso.",
              button_label: "Contactar",
            },
          },
        ],
      },
    ],
    catalog_items: [
      {
        id: "starter-site",
        name: "Página inicial",
        description: "Landing profesional editable para validar la marca rápido.",
        price_label: "Desde $299",
        button_label: "Solicitar",
        image_url: "",
        is_active: true,
        is_featured: true,
      },
      {
        id: "store-pack",
        name: "Tienda online",
        description: "Catálogo, secciones de venta y base para recibir pedidos.",
        price_label: "Cotizar",
        button_label: "Ver detalles",
        image_url: "",
        is_active: true,
        is_featured: false,
      },
    ],
  };
}

function portalSiteNormalizeSchema(input) {
  const schema = portalClone(input || portalSiteDefaultSchema());
  schema.business = schema.business || {};
  schema.theme = schema.theme || {};
  schema.theme.colors = schema.theme.colors || {};
  schema.theme.buttons = schema.theme.buttons || {};
  schema.global_components = schema.global_components || {};
  schema.contact = schema.contact || {};
  schema.pages = Array.isArray(schema.pages) && schema.pages.length
    ? schema.pages
    : portalSiteDefaultSchema().pages;
  schema.navigation = Array.isArray(schema.navigation) ? schema.navigation : [];
  schema.catalog_items = Array.isArray(schema.catalog_items)
    ? schema.catalog_items
    : Array.isArray(schema.products_services)
      ? schema.products_services
      : [];
  schema.catalog_items = schema.catalog_items.map((item, index) => ({
    id: item.id || item.sku || `catalog-${index + 1}`,
    sku: item.sku || `SKU-${index + 1}`,
    name: item.name || item.title || `Item ${index + 1}`,
    description: item.description || "",
    category: item.category || "",
    variants: item.variants || "",
    price_type: item.price_type || "fixed",
    price_value: item.price_value ?? item.price_amount ?? item.priceAmount ?? "",
    price_amount: item.price_amount ?? item.price_value ?? item.priceAmount ?? "",
    currency: item.currency || "USD",
    price_label: item.price_label || item.price || item.priceText || "",
    button_label: item.button_label || "Ver detalle",
    image_url: item.image_url || item.imageUrl || "",
    inventory_quantity: item.inventory_quantity ?? item.stock ?? "",
    track_inventory: Boolean(item.track_inventory || item.inventory_quantity || item.stock),
    is_active: item.is_active !== false,
    is_featured: Boolean(item.is_featured || item.featured),
  }));
  return schema;
}

function portalSiteSetStatus(message) {
  setPortalText(portalElements.siteEditorStatus, message);
}

function portalSiteReadSavedPayload(raw) {
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  if (parsed.schema) return parsed.schema;
  if (parsed.result?.schema) {
    const schema = portalClone(parsed.result.schema);
    if (Array.isArray(parsed.result.catalog_items)) {
      schema.catalog_items = parsed.result.catalog_items;
    }
    return schema;
  }
  if (parsed.pages || parsed.business) return parsed;
  return null;
}

function portalSiteLoadLatest() {
  try {
    const raw =
      localStorage.getItem(portalStorageKeys.siteDraft) ||
      localStorage.getItem(portalStorageKeys.generatedSite);
    const schema = portalSiteReadSavedPayload(raw);
    if (!schema) {
      portalSiteSetStatus("No encontré un borrador de Luma todavía. Puedes cargar el demo web.");
      return;
    }
    portalSiteState.schema = portalSiteNormalizeSchema(schema);
    portalSiteState.selectedPageKey = portalSiteState.schema.pages[0]?.page_key || "home";
    portalSiteState.selectedSectionId = portalSiteState.schema.pages[0]?.sections?.[0]?.id || "";
    portalSiteRender();
    portalSiteSetStatus("Borrador cargado desde Luma.");
  } catch {
    portalSiteSetStatus("No se pudo leer el borrador guardado.");
  }
}

function portalSiteLoadDemo() {
  portalSiteState.schema = portalSiteNormalizeSchema(portalSiteDefaultSchema());
  portalSiteState.selectedPageKey = "home";
  portalSiteState.selectedSectionId = "hero";
  portalSiteRender();
  portalSiteSetStatus("Demo web cargado para probar edición visual.");
}

function portalSiteCurrentPage() {
  return portalSiteState.schema?.pages?.find((page) => page.page_key === portalSiteState.selectedPageKey) ||
    portalSiteState.schema?.pages?.[0] ||
    null;
}

function portalSiteCurrentSection() {
  const page = portalSiteCurrentPage();
  return page?.sections?.find((section) => section.id === portalSiteState.selectedSectionId) ||
    page?.sections?.[0] ||
    null;
}

function portalSiteRender() {
  if (!portalSiteState.schema) {
    return;
  }
  portalSiteRenderPages();
  portalSiteRenderSections();
  portalSiteRenderForm();
  portalSiteRenderCatalog();
  portalSiteRenderPreview();
}

function portalSiteRenderPages() {
  if (!portalElements.sitePageList) return;
  portalElements.sitePageList.innerHTML = portalSiteState.schema.pages
    .map((page) => `
      <button type="button" class="${page.page_key === portalSiteState.selectedPageKey ? "active" : ""}" data-portal-site-page="${portalEscaped(page.page_key)}">
        <strong>${portalEscaped(page.title || page.page_key)}</strong>
        <span>${portalEscaped(page.page_key)}</span>
      </button>
    `)
    .join("");
}

function portalSiteRenderSections() {
  if (!portalElements.siteSectionList) return;
  const page = portalSiteCurrentPage();
  const sections = [...(page?.sections || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
  portalElements.siteSectionList.innerHTML = sections.length
    ? sections
        .map((section) => `
          <button type="button" class="${section.id === portalSiteState.selectedSectionId ? "active" : ""}" data-portal-site-section="${portalEscaped(section.id)}">
            <strong>${portalEscaped(section.editable?.title || section.type || "Sección")}</strong>
            <span>${portalEscaped(section.type || section.id)}</span>
          </button>
        `)
        .join("")
    : portalEmptyBox("Esta página todavía no tiene secciones editables.");
}

function portalSiteRenderForm() {
  if (!portalElements.siteEditorForm) return;
  const section = portalSiteCurrentSection();
  if (!section) {
    portalElements.siteEditorForm.innerHTML = portalEmptyBox("Selecciona una sección para editar.");
    return;
  }
  const editable = section.editable || {};
  const fields = Object.entries(editable);
  portalElements.siteEditorForm.innerHTML = `
    <div class="portal-site-section-title">
      <strong>${portalEscaped(section.type || "Sección")}</strong>
      <span>${portalEscaped(section.id || "")}</span>
    </div>
    ${fields.length ? fields.map(([key, value]) => portalSiteFieldHtml("section", key, value)).join("") : portalEmptyBox("Esta sección no tiene campos editables todavía.")}
    <div class="portal-site-form-split">
      ${portalSiteFieldHtml("business", "name", portalSiteState.schema.business.name || "", "Nombre del negocio")}
      ${portalSiteFieldHtml("business", "description", portalSiteState.schema.business.description || "", "Descripción")}
      ${portalSiteFieldHtml("business", "location", portalSiteState.schema.business.location || "", "Ubicación")}
      ${portalSiteFieldHtml("theme", "primary", portalSiteState.schema.theme.colors.primary || "", "Color principal")}
      ${portalSiteFieldHtml("theme", "secondary", portalSiteState.schema.theme.colors.secondary || "", "Color secundario")}
      ${portalSiteFieldHtml("theme", "background", portalSiteState.schema.theme.colors.background || "", "Fondo")}
      ${portalSiteFieldHtml("theme", "text", portalSiteState.schema.theme.colors.text || "", "Color de texto")}
      ${portalSiteFieldHtml("global", "logo_url", portalSiteState.schema.global_components.logo_url || "", "Logo / imagen URL")}
      ${portalSiteFieldHtml("global", "footer_text", portalSiteState.schema.global_components.footer_text || "", "Texto del footer")}
      ${portalSiteFieldHtml("contact", "phone", portalSiteState.schema.contact.phone || "", "Teléfono")}
      ${portalSiteFieldHtml("contact", "email", portalSiteState.schema.contact.email || "", "Email")}
    </div>
  `;
}

function portalSiteFieldHtml(scope, key, value, label) {
  const displayLabel = label || key.replaceAll("_", " ");
  const stringValue = Array.isArray(value) ? value.join("\n") : String(value ?? "");
  const isLong = stringValue.length > 70 || /description|subtitle|footer|notes/i.test(key);
  const field = isLong
    ? `<textarea rows="3" data-portal-site-scope="${scope}" data-portal-site-key="${portalEscaped(key)}">${portalEscaped(stringValue)}</textarea>`
    : `<input type="text" value="${portalEscaped(stringValue)}" data-portal-site-scope="${scope}" data-portal-site-key="${portalEscaped(key)}" />`;
  return `
    <label class="portal-site-field">
      <span>${portalEscaped(displayLabel)}</span>
      ${field}
    </label>
  `;
}

function portalSiteRenderCatalog() {
  if (!portalElements.siteCatalogList) return;
  const items = portalSiteState.schema.catalog_items || [];
  portalElements.siteCatalogList.innerHTML = items.length
    ? items
        .map((item, index) => `
          <article class="portal-site-catalog-item" data-portal-catalog-index="${index}">
            <div class="portal-card-topline">
              <strong>${portalEscaped(item.name)}</strong>
              <button type="button" class="portal-site-delete" data-portal-catalog-delete="${index}">Eliminar</button>
            </div>
            <label>SKU <input type="text" value="${portalEscaped(item.sku)}" data-portal-catalog-field="sku" data-portal-catalog-index="${index}" /></label>
            <label>Nombre <input type="text" value="${portalEscaped(item.name)}" data-portal-catalog-field="name" data-portal-catalog-index="${index}" /></label>
            <label>Descripción <textarea rows="2" data-portal-catalog-field="description" data-portal-catalog-index="${index}">${portalEscaped(item.description)}</textarea></label>
            <div class="portal-site-form-split">
              <label>Categoría <input type="text" value="${portalEscaped(item.category || "")}" data-portal-catalog-field="category" data-portal-catalog-index="${index}" /></label>
              <label>Variantes <input type="text" value="${portalEscaped(item.variants || "")}" data-portal-catalog-field="variants" data-portal-catalog-index="${index}" /></label>
            </div>
            <div class="portal-site-form-split">
              <label>Tipo de precio <select data-portal-catalog-field="price_type" data-portal-catalog-index="${index}">
                ${["fixed", "starting_at", "quote_only"].map((option) => `<option value="${option}" ${item.price_type === option ? "selected" : ""}>${option}</option>`).join("")}
              </select></label>
              <label>Monto <input type="text" value="${portalEscaped(item.price_value ?? item.price_amount ?? "")}" data-portal-catalog-field="price_value" data-portal-catalog-index="${index}" /></label>
              <label>Moneda <input type="text" value="${portalEscaped(item.currency || "USD")}" data-portal-catalog-field="currency" data-portal-catalog-index="${index}" /></label>
              <label>Precio <input type="text" value="${portalEscaped(item.price_label)}" data-portal-catalog-field="price_label" data-portal-catalog-index="${index}" /></label>
              <label>Botón <input type="text" value="${portalEscaped(item.button_label)}" data-portal-catalog-field="button_label" data-portal-catalog-index="${index}" /></label>
              <label>Inventario <input type="number" min="0" value="${portalEscaped(item.inventory_quantity ?? "")}" data-portal-catalog-field="inventory_quantity" data-portal-catalog-index="${index}" /></label>
            </div>
            <label>Imagen URL <input type="text" value="${portalEscaped(item.image_url)}" data-portal-catalog-field="image_url" data-portal-catalog-index="${index}" /></label>
            <div class="portal-site-toggle-row">
              <label><input type="checkbox" ${item.track_inventory ? "checked" : ""} data-portal-catalog-field="track_inventory" data-portal-catalog-index="${index}" /> Controlar inventario</label>
              <label><input type="checkbox" ${item.is_active ? "checked" : ""} data-portal-catalog-field="is_active" data-portal-catalog-index="${index}" /> Activo</label>
              <label><input type="checkbox" ${item.is_featured ? "checked" : ""} data-portal-catalog-field="is_featured" data-portal-catalog-index="${index}" /> Destacado</label>
            </div>
          </article>
        `)
        .join("")
    : portalEmptyBox("Agrega productos o servicios para que aparezcan en la página.");
}

function portalSiteRenderPreview() {
  if (!portalElements.sitePreview) return;
  const schema = portalSiteState.schema;
  const page = portalSiteCurrentPage();
  const colors = schema.theme?.colors || {};
  const activeItems = (schema.catalog_items || []).filter((item) => item.is_active !== false);
  portalElements.sitePreview.style.setProperty("--site-primary", colors.primary || "#0f766e");
  portalElements.sitePreview.style.setProperty("--site-secondary", colors.secondary || "#7c3aed");
  portalElements.sitePreview.style.setProperty("--site-bg", colors.background || "#f8fbff");
  portalElements.sitePreview.style.setProperty("--site-text", colors.text || "#0f172a");
  portalElements.sitePreview.innerHTML = `
    <div class="portal-rendered-site">
      <header>
        <strong>${portalEscaped(schema.business?.name || "Website")}</strong>
        <nav>${(schema.navigation || []).map((item) => `<span>${portalEscaped(item.label || item.page_key)}</span>`).join("")}</nav>
      </header>
      ${(page?.sections || []).map((section) => portalSitePreviewSection(section, schema, activeItems)).join("")}
      <footer>${portalEscaped(schema.global_components?.footer_text || schema.business?.name || "")}</footer>
    </div>
  `;
}

function portalSitePreviewSection(section, schema, activeItems) {
  const editable = section.editable || {};
  if (section.type === "Hero") {
    return `
      <section class="portal-rendered-hero">
        <div>
          <span>${portalEscaped(schema.business?.industry || "Website")}</span>
          <h1>${portalEscaped(editable.headline || schema.business?.name || "")}</h1>
          <p>${portalEscaped(editable.subtitle || schema.business?.description || "")}</p>
          <button type="button">${portalEscaped(editable.primary_button || schema.theme?.buttons?.primary_label || "Contactar")}</button>
        </div>
        <div class="portal-rendered-visual">${editable.image_url ? `<img src="${portalEscaped(editable.image_url)}" alt="">` : portalEscaped(schema.business?.name || "Preview")}</div>
      </section>
    `;
  }
  if (["ProductGrid", "ServiceList"].includes(section.type)) {
    return `
      <section class="portal-rendered-section">
        <h2>${portalEscaped(editable.title || "Catálogo")}</h2>
        <p>${portalEscaped(editable.subtitle || "")}</p>
        <div class="portal-rendered-catalog">
          ${activeItems
            .map((item) => `
              <article>
                ${item.image_url ? `<img src="${portalEscaped(item.image_url)}" alt="">` : "<div></div>"}
                <strong>${portalEscaped(item.name)}</strong>
                <p>${portalEscaped(item.description)}</p>
                <span>${portalEscaped(item.price_label)}</span>
              </article>
            `)
            .join("")}
        </div>
      </section>
    `;
  }
  return `
    <section class="portal-rendered-section">
      <h2>${portalEscaped(editable.title || section.type || "Sección")}</h2>
      <p>${portalEscaped(editable.subtitle || editable.text || "")}</p>
    </section>
  `;
}

function portalSiteSaveDraft() {
  if (!portalSiteState.schema) {
    portalSiteSetStatus("Carga un sitio antes de guardar.");
    return;
  }
  localStorage.setItem(
    portalStorageKeys.siteDraft,
    JSON.stringify({
      schema: portalSiteState.schema,
      savedAt: new Date().toISOString(),
      source: "client-portal-editor",
    }),
  );
  portalSiteSetStatus("Borrador guardado en este navegador.");
}

function portalSitePublishDraft() {
  portalSiteSaveDraft();
  portalSiteSetStatus("Borrador listo. La publicación real queda preparada para conectarse al gateway del cliente.");
}

function portalSiteHandleFieldInput(event) {
  const target = event.target;
  if (!portalSiteState.schema || !target?.dataset?.portalSiteScope) return;
  const scope = target.dataset.portalSiteScope;
  const key = target.dataset.portalSiteKey;
  const section = portalSiteCurrentSection();
  if (scope === "section" && section) {
    section.editable = section.editable || {};
    section.editable[key] = target.value;
  }
  if (scope === "business") {
    portalSiteState.schema.business[key] = target.value;
  }
  if (scope === "theme") {
    portalSiteState.schema.theme.colors[key] = target.value;
  }
  if (scope === "global") {
    portalSiteState.schema.global_components[key] = target.value;
  }
  if (scope === "contact") {
    portalSiteState.schema.contact[key] = target.value;
  }
  portalSiteRenderPages();
  portalSiteRenderSections();
  portalSiteRenderPreview();
}

function portalSiteHandleCatalogInput(event) {
  const target = event.target;
  if (!portalSiteState.schema || target?.dataset?.portalCatalogIndex === undefined) return;
  const index = Number(target.dataset.portalCatalogIndex);
  const field = target.dataset.portalCatalogField;
  const item = portalSiteState.schema.catalog_items[index];
  if (!item || !field) return;
  item[field] = target.type === "checkbox" ? target.checked : target.value;
  if (field === "price_value") item.price_amount = target.value;
  portalSiteRenderPreview();
}

function portalSiteAddCatalogItem() {
  if (!portalSiteState.schema) portalSiteLoadDemo();
  portalSiteState.schema.catalog_items.push({
    id: `item-${Date.now()}`,
    sku: `SKU-${Date.now()}`,
    name: "Nuevo producto",
    description: "Describe aquí lo que vendes.",
    category: "",
    variants: "",
    price_type: "fixed",
    price_value: "",
    price_amount: "",
    currency: "USD",
    price_label: "Precio editable",
    button_label: "Ver producto",
    image_url: "",
    inventory_quantity: "",
    track_inventory: true,
    is_active: true,
    is_featured: false,
  });
  portalSiteRenderCatalog();
  portalSiteRenderPreview();
  portalSiteSetStatus("Producto agregado al catálogo.");
}

function portalSiteDeleteCatalogItem(index) {
  if (!portalSiteState.schema) return;
  portalSiteState.schema.catalog_items.splice(index, 1);
  portalSiteRenderCatalog();
  portalSiteRenderPreview();
  portalSiteSetStatus("Producto eliminado del borrador.");
}

function loadPortalState() {
  const params = new URLSearchParams(window.location.search);
  portalElements.gatewayUrl.value =
    params.get("gateway") ||
    localStorage.getItem(portalStorageKeys.gatewayUrl) ||
    defaultPortalGatewayUrl;
  portalElements.flowWebUrl.value =
    params.get("flow_web_url") ||
    localStorage.getItem(portalStorageKeys.flowWebUrl) ||
    defaultFlowWebUrl;
  portalElements.clientId.value =
    params.get("client_id") ||
    localStorage.getItem(portalStorageKeys.clientId) ||
    "";
  portalElements.businessId.value =
    params.get("business_id") ||
    localStorage.getItem(portalStorageKeys.businessId) ||
    "";
  portalElements.branchCode.value =
    params.get("branch_code") ||
    localStorage.getItem(portalStorageKeys.branchCode) ||
    "";
}

function currentPreviewSession() {
  if (window.vmPortalPreviewSession) {
    return window.vmPortalPreviewSession;
  }

  try {
    return JSON.parse(
      sessionStorage.getItem(portalStorageKeys.previewInfo) ||
        localStorage.getItem(portalStorageKeys.previewInfo) ||
        "{}",
    );
  } catch {
    return {};
  }
}

function applySessionChrome() {
  const session = currentPreviewSession();
  const roleLabel = session.role_label || "Sesion temporal";
  const displayName = session.display_name || session.email || "Acceso interno";

  setPortalText(portalElements.sessionRoleBadge, roleLabel);
  setPortalText(
    portalElements.sessionIdentity,
    `${displayName} · ${session.email || "sin email"}${
      session.role ? ` · rol ${session.role}` : ""
    }`,
  );

  document.body.dataset.portalRole = session.role || "preview";
}

function savePortalState() {
  localStorage.setItem(
    portalStorageKeys.gatewayUrl,
    portalElements.gatewayUrl.value.trim(),
  );
  localStorage.setItem(
    portalStorageKeys.flowWebUrl,
    portalElements.flowWebUrl.value.trim(),
  );
  localStorage.setItem(
    portalStorageKeys.clientId,
    portalElements.clientId.value.trim(),
  );
  localStorage.setItem(
    portalStorageKeys.businessId,
    portalElements.businessId.value.trim(),
  );
  localStorage.setItem(
    portalStorageKeys.branchCode,
    portalElements.branchCode.value.trim(),
  );
}

function useDemoDefaults() {
  portalElements.clientId.value = seededDemoTenant.clientId;
  portalElements.businessId.value = seededDemoTenant.businessId;
  portalElements.branchCode.value = seededDemoTenant.branchCode;
}

function portalHeaders() {
  const previewToken =
    sessionStorage.getItem(portalStorageKeys.previewToken) ||
    localStorage.getItem(portalStorageKeys.previewToken) ||
    "";
  if (previewToken) {
    return { Authorization: `Bearer ${previewToken}` };
  }

  const token = portalElements.portalToken.value.trim();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function portalQuery() {
  const query = new URLSearchParams();
  const clientId = portalElements.clientId.value.trim();
  const businessId = portalElements.businessId.value.trim();
  const branchCode = portalElements.branchCode.value.trim();
  if (clientId) {
    query.set("client_id", clientId);
  }
  if (businessId) {
    query.set("business_id", businessId);
  }
  if (branchCode) {
    query.set("branch_code", branchCode);
  }
  return query;
}

async function fetchPortalJson(path) {
  const gatewayBase = portalElements.gatewayUrl.value.trim().replace(/\/$/, "");
  if (!gatewayBase) {
    throw new Error("Falta la URL del gateway para consultar el portal.");
  }

  const response = await fetch(
    `${gatewayBase}${path}?${portalQuery().toString()}`,
    {
      headers: portalHeaders(),
    },
  );
  const payload = await response.json();
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || "No se pudo cargar la información del portal.");
  }
  return payload;
}

async function fetchPortalPayloadOrThrow() {
  const [overview, devices, backups] = await Promise.all([
    fetchPortalJson("/portal/overview"),
    fetchPortalJson("/portal/devices"),
    fetchPortalJson("/portal/backups"),
  ]);

  return { overview, devices, backups };
}

function renderTenantContexts(items) {
  if (!items.length) {
    portalElements.tenantContexts.innerHTML = portalEmptyBox(
      "No hay contextos tenant resumidos para este filtro todavía.",
    );
    return;
  }

  portalElements.tenantContexts.innerHTML = items
    .map(
      (item) => `
        <article class="portal-list-card">
          <div class="portal-card-topline">
            <strong>${portalEscaped(item.business_id)} · ${portalEscaped(item.branch_code)}</strong>
            <span class="portal-inline-pill">${portalEscaped(item.source)}</span>
          </div>
          <p>Última actividad: ${portalEscaped(item.last_activity_at || "sin fecha")}</p>
        </article>
      `,
    )
    .join("");
}

function renderDevices(items) {
  if (!items.length) {
    portalElements.devicesList.innerHTML = portalEmptyBox(
      "No hay equipos registrados para este cliente o filtro.",
    );
    return;
  }

  portalElements.devicesList.innerHTML = items
    .map(
      (item) => `
        <article class="portal-list-card">
          <div class="portal-card-topline">
            <strong>${portalEscaped(item.device_display_name)}</strong>
            <span class="portal-inline-pill">${portalEscaped(item.status)}</span>
          </div>
          <p>${portalEscaped(item.device_identifier)}</p>
          <div class="portal-pill-row">
            <span class="portal-inline-pill">${portalEscaped(item.platform)}</span>
            <span class="portal-inline-pill">${portalEscaped(item.business_id || "sin empresa")}</span>
            <span class="portal-inline-pill">${portalEscaped(item.branch_code || "sin sucursal")}</span>
          </div>
          <p>Última señal: ${portalEscaped(item.last_seen_at || "-")}</p>
        </article>
      `,
    )
    .join("");
}

function renderBackups(items) {
  if (!items.length) {
    portalElements.backupsList.innerHTML = portalEmptyBox(
      "No hay respaldos cloud para este cliente o filtro.",
    );
    return;
  }

  portalElements.backupsList.innerHTML = items
    .map(
      (item) => `
        <article class="portal-list-card">
          <div class="portal-card-topline">
            <strong>${portalEscaped(item.backup_id)}</strong>
            <span class="portal-inline-pill">${portalEscaped(item.status)}</span>
          </div>
          <p>${portalEscaped(item.storage_path)}</p>
          <div class="portal-pill-row">
            <span class="portal-inline-pill">${portalEscaped(item.backup_type)}</span>
            <span class="portal-inline-pill">${portalEscaped(String(item.file_size_bytes))} bytes</span>
          </div>
          <p>Creado: ${portalEscaped(item.created_at || "-")}</p>
        </article>
      `,
    )
    .join("");
}

function renderLatestBackup(item) {
  if (!item) {
    portalElements.latestBackup.innerHTML = portalEmptyBox(
      "Todavía no hay un respaldo válido resumido para este cliente.",
    );
    return;
  }

  portalElements.latestBackup.innerHTML = `
    <article class="portal-list-card portal-latest-card">
      <div class="portal-card-topline">
        <strong>${portalEscaped(item.backup_id)}</strong>
        <span class="portal-inline-pill">${portalEscaped(item.status)}</span>
      </div>
      <p>${portalEscaped(item.storage_path)}</p>
      <div class="portal-pill-row">
        <span class="portal-inline-pill">${portalEscaped(item.backup_type)}</span>
        <span class="portal-inline-pill">${portalEscaped(item.tenant_scope?.businessId || "-")}</span>
        <span class="portal-inline-pill">${portalEscaped(item.tenant_scope?.branchCode || "-")}</span>
      </div>
      <p>Verificado: ${portalEscaped(item.verified_at || "-")}</p>
      <p>Hash: ${portalEscaped(item.sha256 || "-")}</p>
    </article>
  `;
}

function renderCurrentExchangeRate(rate, errorMessage) {
  if (!rate) {
    setPortalText(portalElements.rateTitle, "Tasa de cambio");
    setPortalText(portalElements.rateValue, "--");
    setPortalText(
      portalElements.rateMeta,
      errorMessage || "Sin consulta central todavía.",
    );
    setPortalText(
      portalElements.rateCaption,
      errorMessage
        ? "La consulta central no respondió; revise gateway, conectividad o fuente configurada."
        : "La referencia central aparecerá aquí para validar tasa, hora de consulta y estado del servicio.",
    );
    return;
  }

  const pair = `${rate.currency_code || "USD"}/${rate.quote_currency_code || "VES"}`;
  setPortalText(portalElements.rateTitle, `Tasa ${pair}`);
  setPortalText(
    portalElements.rateValue,
    typeof rate.rate_value === "number"
      ? rate.rate_value.toFixed(4)
      : String(rate.rate_value || "--"),
  );
  setPortalText(
    portalElements.rateMeta,
    `Fecha valor: ${rate.valid_date || "-"} · Consultada: ${rate.fetched_at || "-"}`,
  );
  setPortalText(
    portalElements.rateCaption,
    `${rate.source_name || "Fuente central"} · ${rate.source_type || "sin tipo"} · ${rate.source_url || "sin URL"}`,
  );
}

function setPortalDiagnostic(value) {
  setPortalText(
    portalElements.diagnosticBox,
    typeof value === "string" ? value : JSON.stringify(value, null, 2),
  );
}

function scrollPortalToSummary() {
  const target =
    portalElements.clientMetric?.closest(".portal-live-section") ||
    portalElements.clientMetric?.closest(".section");
  if (target) {
    target.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
}

function renderPortalPayload(overview, devices, backups, sourceLabel) {
  portalRuntimeState.overview = overview;
  portalRuntimeState.devices = devices;
  portalRuntimeState.backups = backups;
  portalRuntimeState.source = sourceLabel;

  const session = overview.session || currentPreviewSession();
  const displayName =
    overview.client?.display_name ||
    overview.client?.client_id ||
    "-";
  const softwareName =
    overview.client?.software_name ||
    (overview.latest_release?.version
      ? `Listo ${overview.latest_release.version}`
      : "Sin software resumido");

  setPortalText(
    portalElements.dashboardTitle,
    displayName,
  );
  setPortalText(
    portalElements.dashboardSubtitle,
    `${softwareName} · ${overview.client?.business_id || "-"} · ${overview.client?.branch_code || "-"}${
      session?.role_label ? ` · ${session.role_label}` : ""
    }`,
  );

  setPortalText(portalElements.clientMetric, displayName);
  setPortalText(
    portalElements.licenseMetric,
    overview.client?.license_ids?.length
      ? `${softwareName} · Licencias: ${overview.client.license_ids.join(", ")}`
      : `${softwareName} · Sin licencias resumidas todavía.`,
  );
  setPortalText(
    portalElements.devicesMetric,
    String(overview.summary?.devices_total || 0),
  );
  setPortalText(
    portalElements.devicesCaption,
    overview.summary?.latest_device_seen_at
      ? `Última señal: ${overview.summary.latest_device_seen_at}`
      : "Sin señales de equipos todavía.",
  );
  setPortalText(
    portalElements.backupsMetric,
    String(overview.summary?.backups_total || 0),
  );
  setPortalText(
    portalElements.backupsCaption,
    overview.summary?.latest_backup_at
      ? `Último respaldo: ${overview.summary.latest_backup_at}`
      : "Sin respaldo resumido todavía.",
  );
  setPortalText(
    portalElements.releaseMetric,
    overview.latest_release?.version || "Sin release",
  );
  setPortalText(
    portalElements.releaseCaption,
    overview.latest_release?.storage_path || "Sin release publicado todavía.",
  );
  renderListoActivation(overview);
  renderCurrentExchangeRate(
    overview.current_exchange_rate || null,
    overview.current_exchange_rate_error || "",
  );

  renderTenantContexts(overview.tenant_contexts || []);
  renderLatestBackup(overview.latest_backup || null);
  renderDevices(devices.devices || []);
  renderBackups(backups.backups || []);

  setPortalDiagnostic({
    source: sourceLabel,
    overview,
    devices,
    backups,
    session,
  });
}

function currentPortalRoleForFlow() {
  const session = currentPreviewSession();
  const role = String(session.role || "").trim().toLowerCase();
  if (role === "client" || role === "representative" || role === "admin") {
    return role;
  }
  return "client";
}

function buildFlowWebUrl() {
  const flowWebBase = portalElements.flowWebUrl.value.trim();
  const gatewayBase = portalElements.gatewayUrl.value.trim();
  if (!flowWebBase) {
    throw new Error(
      "Falta la URL base de Listo Web. Configúrala en herramientas internas.",
    );
  }

  const url = new URL(flowWebBase);
  url.searchParams.set("portal_role", currentPortalRoleForFlow());
  url.searchParams.set("portal_autologin", "true");
  if (gatewayBase) {
    url.searchParams.set("gateway_url", gatewayBase);
  }

  const clientId = portalElements.clientId.value.trim();
  const businessId = portalElements.businessId.value.trim();
  const branchCode = portalElements.branchCode.value.trim();

  if (clientId) {
    url.searchParams.set("client_id", clientId);
  }
  if (businessId) {
    url.searchParams.set("business_id", businessId);
  }
  if (branchCode) {
    url.searchParams.set("branch_code", branchCode);
  }

  return url.toString();
}

function openPendingWindow(title, message) {
  const pendingWindow = window.open("about:blank", "_blank", "noopener");
  if (!pendingWindow) {
    return null;
  }

  pendingWindow.document.write(`
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>${portalEscaped(title)}</title>
        <style>
          body {
            margin: 0;
            font-family: "Segoe UI", sans-serif;
            background: #0f172a;
            color: #e2e8f0;
            display: grid;
            place-items: center;
            min-height: 100vh;
          }

          main {
            max-width: 560px;
            padding: 32px;
            border-radius: 24px;
            background: rgba(15, 23, 42, 0.94);
            border: 1px solid rgba(148, 163, 184, 0.25);
            box-shadow: 0 22px 60px rgba(15, 23, 42, 0.4);
          }

          h1 {
            margin: 0 0 12px;
            font-size: 24px;
          }

          p {
            margin: 0;
            line-height: 1.6;
            color: #cbd5e1;
          }
        </style>
      </head>
      <body>
        <main>
          <h1>${portalEscaped(title)}</h1>
          <p>${portalEscaped(message)}</p>
        </main>
      </body>
    </html>
  `);
  pendingWindow.document.close();
  return pendingWindow;
}

function openFlowWeb() {
  try {
    savePortalState();
    const targetUrl = buildFlowWebUrl();
    const pendingWindow = openPendingWindow(
      "Abriendo Listo Web",
      "Preparando Listo Web con el negocio y el rol del portal...",
    );
    if (pendingWindow) {
      pendingWindow.location.replace(targetUrl);
    } else {
      window.open(targetUrl, "_blank", "noopener");
    }

    const flowWebBase = portalElements.flowWebUrl.value.trim();
    const isLocalFlowWeb = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(
      flowWebBase,
    );
    setPortalDiagnostic({
      action: "open-flow-web",
      target: targetUrl,
      local_runtime_expected: isLocalFlowWeb,
      reminder: isLocalFlowWeb
        ? "Si la nueva pestaña da error, levanta Listo Web con Flutter en el puerto configurado."
        : null,
      message:
        "Listo Web se abrió en una nueva pestaña con rol y negocio cargados desde el portal.",
    });
  } catch (error) {
    setPortalDiagnostic({
      success: false,
      action: "open-flow-web",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function downloadInstaller() {
  try {
    savePortalState();
    setPortalDiagnostic("Preparando descarga protegida del instalador...");
    const payload = await fetchPortalJson("/portal/releases/windows/download");
    const target = payload?.download?.download_url || "";
    if (!/^https?:\/\//i.test(target)) {
      throw new Error(
        "El gateway no devolvió una URL válida para la descarga protegida del instalador.",
      );
    }

    setPortalDiagnostic({
      action: "download-installer",
      target,
      release: payload.release || null,
      expires_in_seconds: payload.download?.expires_in_seconds || null,
      message:
        "Se preparó la URL firmada del instalador Windows. Si la descarga no abre sola, el portal forzará la navegación directa.",
    });

    const popup = window.open(target, "_blank", "noopener");
    if (popup) {
      return;
    }

    window.location.assign(target);
  } catch (error) {
    setPortalDiagnostic({
      success: false,
      action: "download-installer",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function loadPortal() {
  try {
    savePortalState();
    setPortalDiagnostic("Cargando portal real...");
    const { overview, devices, backups } = await fetchPortalPayloadOrThrow();

    renderPortalPayload(overview, devices, backups, "real");
    scrollPortalToSummary();
  } catch (error) {
    setPortalDiagnostic({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function loadSeededDemoPortal() {
  try {
    useDemoDefaults();
    savePortalState();
    setPortalDiagnostic(
      "Intentando cargar el tenant demo real desde la nube...",
    );
    const { overview, devices, backups } = await fetchPortalPayloadOrThrow();
    renderPortalPayload(overview, devices, backups, "real-demo");
    scrollPortalToSummary();
  } catch (error) {
    loadDemoPortal();
    setPortalDiagnostic({
      source: "demo-fallback",
      message:
        "No se pudo abrir el tenant demo real desde la nube. Se mostró el demo visual embebido como respaldo.",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function loadDemoPortal() {
  useDemoDefaults();
  savePortalState();
  renderPortalPayload(
    demoPortalPayload.overview,
    demoPortalPayload.devices,
    demoPortalPayload.backups,
    "demo",
  );
  scrollPortalToSummary();
}

function clearPortal() {
  portalElements.flowWebUrl.value =
    localStorage.getItem(portalStorageKeys.flowWebUrl) || defaultFlowWebUrl;
  portalElements.clientId.value = "";
  portalElements.businessId.value = "";
  portalElements.branchCode.value = "";
  portalElements.portalToken.value = "";
  localStorage.removeItem(portalStorageKeys.clientId);
  localStorage.removeItem(portalStorageKeys.businessId);
  localStorage.removeItem(portalStorageKeys.branchCode);
  setPortalText(portalElements.clientMetric, "-");
  setPortalText(portalElements.licenseMetric, "Sin datos cargados todavía.");
  setPortalText(portalElements.devicesMetric, "0");
  setPortalText(portalElements.devicesCaption, "Sin señales registradas aún.");
  setPortalText(portalElements.backupsMetric, "0");
  setPortalText(portalElements.backupsCaption, "Sin respaldo resumido todavía.");
  setPortalText(portalElements.releaseMetric, "-");
  setPortalText(portalElements.releaseCaption, "Sin release publicado cargado.");
  renderCurrentExchangeRate(null, "");
  portalElements.tenantContexts.innerHTML = portalEmptyBox(
    "No hay contextos tenant resumidos para este filtro todavía.",
  );
  portalElements.latestBackup.innerHTML = portalEmptyBox(
    "Todavía no hay un respaldo válido resumido para este cliente.",
  );
  portalElements.devicesList.innerHTML = portalEmptyBox(
    "No hay equipos registrados para este cliente o filtro.",
  );
  portalElements.backupsList.innerHTML = portalEmptyBox(
    "No hay respaldos cloud para este cliente o filtro.",
  );
  setPortalDiagnostic("Sin cargar.");
}

loadPortalState();
if (!portalElements.clientId.value.trim()) {
  useDemoDefaults();
}

portalElements.loadButtons.forEach((button) => {
  button.addEventListener("click", loadPortal);
});

portalElements.demoButtons.forEach((button) => {
  button.addEventListener("click", loadDemoPortal);
});

portalElements.printButtons.forEach((button) => {
  button.addEventListener("click", () => window.print());
});

portalElements.openFlowButtons.forEach((button) => {
  button.addEventListener("click", openFlowWeb);
});

portalElements.downloadInstallerButtons.forEach((button) => {
  button.addEventListener("click", downloadInstaller);
});

if (portalElements.clearButton) {
  portalElements.clearButton.addEventListener("click", clearPortal);
}

if (portalElements.logoutButton) {
  portalElements.logoutButton.addEventListener("click", () => {
    sessionStorage.removeItem(portalStorageKeys.previewToken);
    sessionStorage.removeItem(portalStorageKeys.previewInfo);
    localStorage.removeItem(portalStorageKeys.previewToken);
    localStorage.removeItem(portalStorageKeys.previewInfo);
    window.location.replace("client-portal.html");
  });
}

if (portalElements.siteLoadLatestButton) {
  portalElements.siteLoadLatestButton.addEventListener("click", portalSiteLoadLatest);
}

if (portalElements.siteLoadDemoButton) {
  portalElements.siteLoadDemoButton.addEventListener("click", portalSiteLoadDemo);
}

if (portalElements.siteSaveButton) {
  portalElements.siteSaveButton.addEventListener("click", portalSiteSaveDraft);
}

if (portalElements.sitePublishButton) {
  portalElements.sitePublishButton.addEventListener("click", portalSitePublishDraft);
}

if (portalElements.siteAddCatalogButton) {
  portalElements.siteAddCatalogButton.addEventListener("click", portalSiteAddCatalogItem);
}

if (portalElements.sitePageList) {
  portalElements.sitePageList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-portal-site-page]");
    if (!button || !portalSiteState.schema) return;
    portalSiteState.selectedPageKey = button.dataset.portalSitePage;
    const page = portalSiteCurrentPage();
    portalSiteState.selectedSectionId = page?.sections?.[0]?.id || "";
    portalSiteRender();
  });
}

if (portalElements.siteSectionList) {
  portalElements.siteSectionList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-portal-site-section]");
    if (!button || !portalSiteState.schema) return;
    portalSiteState.selectedSectionId = button.dataset.portalSiteSection;
    portalSiteRender();
  });
}

if (portalElements.siteEditorForm) {
  portalElements.siteEditorForm.addEventListener("input", portalSiteHandleFieldInput);
}

if (portalElements.siteCatalogList) {
  portalElements.siteCatalogList.addEventListener("input", portalSiteHandleCatalogInput);
  portalElements.siteCatalogList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-portal-catalog-delete]");
    if (!button) return;
    portalSiteDeleteCatalogItem(Number(button.dataset.portalCatalogDelete));
  });
}

if (portalElements.sitePreview) {
  portalSiteLoadLatest();
}

function renderListoActivation(overview) {
  const activation = overview.activation || {};
  const profile = overview.business_profile || {};
  const platforms = overview.latest_release?.platforms || [];

  setPortalText(
    portalElements.activationCode,
    activation.activation_code || "Sin código emitido",
  );
  setPortalText(
    portalElements.activationQrPayload,
    activation.qr_payload || "Sin QR de activación generado.",
  );
  setPortalText(
    portalElements.activationMeta,
    activation.activation_code
      ? `Vence en ${activation.expires_in_minutes || 30} min · ${activation.allowed_devices || 1} equipo(s) · gracia offline ${activation.offline_grace_days || 7} días`
      : "El QR se emitirá desde el gateway cuando la licencia esté aprobada.",
  );

  if (portalElements.businessProfile) {
    portalElements.businessProfile.innerHTML = `
      <div class="portal-key-value"><span>País</span><strong>${portalEscaped(profile.country_name || profile.country_code || "-")}</strong></div>
      <div class="portal-key-value"><span>Moneda base</span><strong>${portalEscaped(profile.base_currency_code || "-")}</strong></div>
      <div class="portal-key-value"><span>Impuesto principal</span><strong>${portalEscaped(profile.primary_tax_label || "Configurable")}</strong></div>
      <div class="portal-key-value"><span>Cumplimiento</span><strong>${portalEscaped(profile.compliance_profile || "generic")}</strong></div>
    `;
  }

  if (portalElements.platformsList) {
    portalElements.platformsList.innerHTML = platforms.length
      ? platforms
          .map(
            (item) => `
              <div class="portal-platform-pill">
                <strong>${portalEscaped(item.label || item.platform)}</strong>
                <span>${portalEscaped(item.status || "preparado")}</span>
              </div>
            `,
          )
          .join("")
      : portalEmptyBox("Sin plataformas configuradas todavía.");
  }
}

applySessionChrome();

if (
  sessionStorage.getItem(portalStorageKeys.previewToken) ||
  localStorage.getItem(portalStorageKeys.previewToken)
) {
  loadSeededDemoPortal();
} else {
  loadDemoPortal();
}
