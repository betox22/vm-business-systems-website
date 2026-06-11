const state = {
  businessId: new URLSearchParams(window.location.search).get("business_id") || "",
  currentView: "catalog",
  overview: null,
  accessToken: localStorage.getItem("lumaClientAccessToken") || "",
  demoAccess: new URLSearchParams(window.location.search).get("demo") === "1",
  selectedItemId: "",
  query: "",
  statusFilter: "all",
  saving: false,
};

const apiBase = resolveApiBase();
const content = document.querySelector("#sellerContent");
const title = document.querySelector("#sellerTitle");
const subtitle = document.querySelector("#sellerSubtitle");
const storeName = document.querySelector("#sellerStoreName");
const storeMeta = document.querySelector("#sellerStoreMeta");
const navButtons = document.querySelectorAll("[data-seller-view]");
const loginScreen = document.querySelector("#sellerLoginScreen");
const loginForm = document.querySelector("#sellerLoginForm");
const loginStatus = document.querySelector("#sellerLoginStatus");
const demoAccessButton = document.querySelector("#sellerDemoAccessButton");
const existingAccessButton = document.querySelector("#existingAccessButton");
const logoutButton = document.querySelector("#sellerLogoutButton");

captureAuthRedirect();

function resolveApiBase() {
  if (window.LUMA_API_BASE_URL) return String(window.LUMA_API_BASE_URL).replace(/\/$/, "");
  const saved = localStorage.getItem("lumaApiBaseUrl");
  if (saved) return saved.replace(/\/$/, "");
  if (["localhost", "127.0.0.1"].includes(window.location.hostname)) return "http://127.0.0.1:8010";
  return "https://luma-api.vmbusinesssystems.com";
}

function apiUrl(path) {
  return `${apiBase}${path}`;
}

function authHeaders(extra = {}) {
  return {
    ...extra,
    ...(state.accessToken ? { authorization: `Bearer ${state.accessToken}` } : {}),
  };
}

function captureAuthRedirect() {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const queryParams = new URLSearchParams(window.location.search);
  const accessToken = hashParams.get("access_token") || queryParams.get("access_token") || "";
  const refreshToken = hashParams.get("refresh_token") || queryParams.get("refresh_token") || "";
  if (!accessToken) return;
  state.accessToken = accessToken;
  localStorage.setItem("lumaClientAccessToken", accessToken);
  if (refreshToken) localStorage.setItem("lumaClientRefreshToken", refreshToken);
  const cleanUrl = new URL(window.location.href);
  cleanUrl.hash = "";
  cleanUrl.searchParams.delete("access_token");
  cleanUrl.searchParams.delete("refresh_token");
  cleanUrl.searchParams.delete("expires_in");
  cleanUrl.searchParams.delete("expires_at");
  cleanUrl.searchParams.delete("token_type");
  cleanUrl.searchParams.delete("type");
  window.history.replaceState({}, "", cleanUrl);
}

function money(value) {
  if (value === null || value === undefined || value === "") return "";
  const number = Number(value);
  if (Number.isNaN(number)) return "";
  return `$${number.toFixed(2)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

async function loadPortal() {
  if (!state.accessToken && !state.demoAccess) {
    showLogin();
    return;
  }
  if (!state.businessId) {
    renderError("Falta business_id. Abre este panel desde el admin de una tienda.");
    return;
  }
  hideLogin();
  renderLoading();
  try {
    const response = await fetch(apiUrl(`/api/client/portal?business_id=${encodeURIComponent(state.businessId)}`), {
      headers: authHeaders(),
    });
    if (response.status === 401 || response.status === 403) {
      clearSession();
      showLogin("Tu sesion no tiene acceso a esta tienda.", true);
      return;
    }
    if (!response.ok) throw new Error(await response.text());
    state.overview = await response.json();
    renderShell();
  } catch (error) {
    renderError(`No se pudo cargar el portal: ${shortError(error)}`);
  }
}

function showLogin(message = "", revealForm = false) {
  loginScreen.classList.remove("hidden");
  loginStatus.textContent = message;
  loginForm.classList.toggle("login-collapsed", !revealForm);
  loginForm.setAttribute("aria-hidden", revealForm ? "false" : "true");
  content.innerHTML = "";
}

function hideLogin() {
  loginScreen.classList.add("hidden");
}

function clearSession() {
  state.accessToken = "";
  localStorage.removeItem("lumaClientAccessToken");
  localStorage.removeItem("lumaClientRefreshToken");
}

async function loginSeller(event) {
  event.preventDefault();
  const form = event.currentTarget;
  loginStatus.textContent = "Validando acceso...";
  try {
    const response = await fetch(apiUrl("/api/client/auth/login"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: form.elements.email.value.trim(),
        password: form.elements.password.value,
        businessId: state.businessId || null,
      }),
    });
    if (!response.ok) throw new Error(await response.text());
    const result = await response.json();
    state.accessToken = result.accessToken;
    localStorage.setItem("lumaClientAccessToken", result.accessToken);
    if (result.refreshToken) localStorage.setItem("lumaClientRefreshToken", result.refreshToken);
    if (!state.businessId && result.memberships?.[0]?.business_id) {
      state.businessId = result.memberships[0].business_id;
      const url = new URL(window.location.href);
      url.searchParams.set("business_id", state.businessId);
      window.history.replaceState({}, "", url);
    }
    await loadPortal();
  } catch (error) {
    loginStatus.textContent = `No se pudo entrar: ${shortError(error)}`;
  }
}

function renderLoading() {
  content.innerHTML = `<div class="panel"><div class="empty-state">Cargando panel del vendedor...</div></div>`;
}

function renderError(message) {
  content.innerHTML = `<div class="portal-error">${escapeHtml(message)}</div>`;
}

function shortError(error) {
  try {
    const parsed = JSON.parse(error.message);
    return parsed.detail || error.message;
  } catch {
    return error.message || "Error desconocido";
  }
}

function renderShell() {
  const business = state.overview.business || {};
  const member = state.overview.member || {};
  storeName.textContent = business.business_name || "Mi tienda";
  storeMeta.textContent = `${roleLabel(member.role || "owner")} · ${[business.industry, business.location].filter(Boolean).join(" · ") || "Panel de cliente"}`;
  navButtons.forEach((button) => button.classList.toggle("active", button.dataset.sellerView === state.currentView));

  const titles = {
    catalog: ["Catalogo", "Productos, precios, stock, ofertas e imagenes."],
    leads: ["Pedidos y solicitudes", "Contactos recibidos desde la pagina publicada."],
    settings: ["Datos de tienda", "Informacion visible y estado de publicacion."],
  };
  title.textContent = titles[state.currentView][0];
  subtitle.textContent = titles[state.currentView][1];

  if (state.currentView === "catalog") content.innerHTML = renderCatalog();
  if (state.currentView === "leads") content.innerHTML = renderLeads();
  if (state.currentView === "settings") content.innerHTML = renderSettings();
  bindViewEvents();
}

function catalogItems() {
  const query = state.query.trim().toLowerCase();
  return (state.overview.catalog_items || [])
    .filter((item) => {
      if (state.statusFilter === "active" && item.is_active === false) return false;
      if (state.statusFilter === "inactive" && item.is_active !== false) return false;
      if (state.statusFilter === "featured" && !item.is_featured) return false;
      if (!query) return true;
      return [item.name, item.description, item.metadata?.sku, item.metadata?.category]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    })
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
}

function selectedItem() {
  return (state.overview.catalog_items || []).find((item) => item.id === state.selectedItemId) || null;
}

function can(permission) {
  return (state.overview?.permissions || []).includes(permission);
}

function roleLabel(role) {
  const labels = {
    owner: "Dueno",
    manager: "Manager",
    catalog_manager: "Catalogo",
    seller: "Vendedor",
    fulfillment: "Despacho",
    viewer: "Lectura",
  };
  return labels[role] || "Cliente";
}

function renderCatalog() {
  const all = state.overview.catalog_items || [];
  const active = all.filter((item) => item.is_active !== false);
  const featured = all.filter((item) => item.is_featured);
  const sale = all.filter((item) => item.metadata?.sale_price || item.metadata?.sale_label);

  return `
    <section class="metric-grid">
      ${metric("Productos", all.length)}
      ${metric("Activos", active.length)}
      ${metric("Destacados", featured.length)}
      ${metric("Ofertas", sale.length)}
    </section>
    <section class="catalog-layout">
      <article class="panel">
        <div class="panel-header">
          <h2>Inventario</h2>
          ${can("catalog:create") ? `<button class="primary-button" data-new-item type="button">Nuevo producto</button>` : ""}
        </div>
        <div class="catalog-toolbar">
          <input id="catalogSearch" placeholder="Buscar producto, SKU o categoria" value="${escapeAttribute(state.query)}">
          <select id="catalogStatus">
            <option value="all" ${state.statusFilter === "all" ? "selected" : ""}>Todos</option>
            <option value="active" ${state.statusFilter === "active" ? "selected" : ""}>Activos</option>
            <option value="inactive" ${state.statusFilter === "inactive" ? "selected" : ""}>Inactivos</option>
            <option value="featured" ${state.statusFilter === "featured" ? "selected" : ""}>Destacados</option>
          </select>
        </div>
        ${catalogTable(catalogItems())}
      </article>
      ${can("catalog:update") || can("catalog:create") ? renderEditor(selectedItem()) : renderReadOnlyPanel()}
    </section>
  `;
}

function metric(label, value) {
  return `<article class="metric-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`;
}

function catalogTable(rows) {
  if (!rows.length) return `<div class="empty-state">No hay productos con ese filtro.</div>`;
  return `<div class="catalog-card-list">
      ${rows.map((item) => {
        const metadata = item.metadata || {};
        const inventory = metadata.inventory_quantity ?? "Sin control";
        const price = item.price_label || money(item.price_value) || "Cotizar";
        const salePrice = metadata.sale_price ? money(metadata.sale_price) : "";
        const tags = Array.isArray(metadata.tags) ? metadata.tags : [];
        return `<article class="catalog-card ${item.is_active === false ? "is-inactive" : ""}">
          <div class="catalog-card-media">
            ${item.image_url ? `<img src="${escapeAttribute(item.image_url)}" alt="">` : `<span>Sin foto</span>`}
          </div>
          <div class="catalog-card-main">
            <div class="catalog-card-head">
              <div>
                <strong>${escapeHtml(item.name)}</strong>
                <span class="muted">${escapeHtml(metadata.sku || "Sin SKU")} ${metadata.category ? `· ${escapeHtml(metadata.category)}` : ""}</span>
              </div>
              <div class="catalog-price">
                <strong>${escapeHtml(price)}</strong>
                ${salePrice ? `<span>${escapeHtml(salePrice)}</span>` : ""}
              </div>
            </div>
            <p>${escapeHtml(item.description || "Sin descripcion visible.")}</p>
            <div class="catalog-meta-row">
              <span>Stock: ${escapeHtml(inventory)}</span>
              <span>Orden: ${escapeHtml(item.sort_order ?? 0)}</span>
              <span>Boton: ${escapeHtml(item.button_label || "Comprar")}</span>
            </div>
            <div class="catalog-badges">
              <span class="status-pill ${item.is_active === false ? "off" : ""}">${item.is_active === false ? "Inactivo" : "Activo"}</span>
              ${item.is_featured ? `<span class="sale-pill">Destacado</span>` : ""}
              ${metadata.sale_label ? `<span class="sale-pill">${escapeHtml(metadata.sale_label)}</span>` : ""}
              ${tags.slice(0, 4).map((tag) => `<span class="tag-pill">${escapeHtml(tag)}</span>`).join("")}
            </div>
          </div>
          <div class="catalog-card-actions">
            ${can("catalog:update") ? `<button class="secondary-button compact" data-edit-item="${escapeAttribute(item.id)}" type="button">Editar</button>` : ""}
            ${can("catalog:update") ? `<button class="secondary-button compact" data-toggle-active="${escapeAttribute(item.id)}" type="button">${item.is_active === false ? "Activar" : "Pausar"}</button>` : ""}
            ${can("catalog:update") ? `<button class="secondary-button compact" data-toggle-featured="${escapeAttribute(item.id)}" type="button">${item.is_featured ? "Quitar destacado" : "Destacar"}</button>` : ""}
            ${can("catalog:create") ? `<button class="text-button" data-duplicate-item="${escapeAttribute(item.id)}" type="button">Duplicar</button>` : ""}
          </div>
        </article>`;
      }).join("")}
    </div>`;
}

function renderEditor(item) {
  const metadata = item?.metadata || {};
  const canCreate = can("catalog:create");
  const canUpdate = can("catalog:update");
  const canDelete = can("catalog:delete");
  const canUpload = can("assets:upload");
  const canSave = item ? canUpdate : canCreate;
  return `<aside class="editor-card">
    <div class="panel-header">
      <h2>${item ? "Editar producto" : "Nuevo producto"}</h2>
      ${item && canDelete ? `<button class="text-button danger" data-delete-item="${escapeAttribute(item.id)}" type="button">Eliminar</button>` : ""}
    </div>
    <form id="catalogItemForm" class="editor-form">
      <label>Nombre
        <input name="name" value="${escapeAttribute(item?.name || "")}" required>
      </label>
      <label>Descripcion
        <textarea name="description" rows="3">${escapeHtml(item?.description || "")}</textarea>
      </label>
      <div class="form-grid-2">
        <label>SKU
          <input name="sku" value="${escapeAttribute(metadata.sku || "")}">
        </label>
        <label>Categoria
          <input name="category" value="${escapeAttribute(metadata.category || "")}">
        </label>
      </div>
      <div class="form-grid-2">
        <label>Tipo de precio
          <select name="priceType">
            <option value="fixed" ${item?.price_type === "fixed" ? "selected" : ""}>Precio fijo</option>
            <option value="starting_at" ${item?.price_type === "starting_at" ? "selected" : ""}>Desde</option>
            <option value="quote_only" ${item?.price_type === "quote_only" ? "selected" : ""}>Cotizar</option>
          </select>
        </label>
        <label>Precio
          <input name="priceValue" type="number" step="0.01" value="${escapeAttribute(item?.price_value ?? "")}">
        </label>
      </div>
      <label>Etiqueta visible del precio
        <input name="priceLabel" placeholder="$29.99, Desde $50, Cotizar" value="${escapeAttribute(item?.price_label || "")}">
      </label>
      <label>Texto del boton
        <input name="buttonLabel" placeholder="Comprar, Reservar, Cotizar" value="${escapeAttribute(item?.button_label || "Comprar")}">
      </label>
      <div class="form-grid-2">
        <label>Precio antes
          <input name="compareAtPrice" type="number" step="0.01" value="${escapeAttribute(metadata.compare_at_price ?? "")}">
        </label>
        <label>Precio oferta
          <input name="salePrice" type="number" step="0.01" value="${escapeAttribute(metadata.sale_price ?? "")}">
        </label>
      </div>
      <label>Etiqueta de oferta
        <input name="saleLabel" placeholder="Oferta limitada, Liquidacion, 2x1" value="${escapeAttribute(metadata.sale_label || "")}">
      </label>
      <div class="form-grid-2">
        <label>Stock
          <input name="inventoryQuantity" type="number" step="1" value="${escapeAttribute(metadata.inventory_quantity ?? "")}">
        </label>
        <label>Orden
          <input name="sortOrder" type="number" step="1" value="${escapeAttribute(item?.sort_order ?? 0)}">
        </label>
      </div>
      <div class="form-grid-2">
        <label>Oferta inicia
          <input name="saleStartsAt" type="date" value="${escapeAttribute(metadata.sale_starts_at || "")}">
        </label>
        <label>Oferta termina
          <input name="saleEndsAt" type="date" value="${escapeAttribute(metadata.sale_ends_at || "")}">
        </label>
      </div>
      <label>Tags
        <input name="tags" placeholder="nuevo, premium, cyberpunk" value="${escapeAttribute((Array.isArray(metadata.tags) ? metadata.tags : []).join(", "))}">
      </label>
      ${canUpload ? `<label>Imagen
        <input name="imageFile" type="file" accept="image/*">
      </label>` : ""}
      <label>URL de imagen
        <input name="imageUrl" value="${escapeAttribute(item?.image_url || "")}">
      </label>
      <div class="form-grid-2">
        <label class="switch-row">Activo <input name="isActive" type="checkbox" ${item?.is_active === false ? "" : "checked"}></label>
        <label class="switch-row">Destacado <input name="isFeatured" type="checkbox" ${item?.is_featured ? "checked" : ""}></label>
      </div>
      <div class="inline-actions">
        ${canSave ? `<button class="primary-button" type="submit">${state.saving ? "Guardando..." : "Guardar"}</button>` : ""}
        <button class="secondary-button" data-clear-editor type="button">Limpiar</button>
      </div>
    </form>
  </aside>`;
}

function renderReadOnlyPanel() {
  return `<aside class="editor-card">
    <div class="panel-header"><h2>Acceso limitado</h2></div>
    <div class="panel-body">
      <p>Tu rol puede revisar el catalogo, pero no crear ni editar productos.</p>
    </div>
  </aside>`;
}

function renderLeads() {
  const leads = state.overview.leads || [];
  return `<section class="panel">
    <div class="panel-header"><h2>Solicitudes recibidas</h2><span class="muted">${leads.length} registros</span></div>
    <div class="panel-body">
      <div class="leads-grid">
        ${leads.map((lead) => `<article class="lead-card">
          <strong>${escapeHtml(lead.customer_name || "Cliente sin nombre")}</strong>
          <span>${escapeHtml([lead.email, lead.phone].filter(Boolean).join(" · "))}</span>
          <p>${escapeHtml(lead.message || "")}</p>
          <span>${escapeHtml(lead.status || "new")} · ${escapeHtml(formatDate(lead.created_at))}</span>
        </article>`).join("") || `<div class="empty-state">Todavia no hay solicitudes.</div>`}
      </div>
    </div>
  </section>`;
}

function renderSettings() {
  const business = state.overview.business || {};
  const domains = state.overview.domains || [];
  const sites = state.overview.sites || [];
  const member = state.overview.member || {};
  return `<section class="metric-grid">
    ${metric("Sitios", sites.length)}
    ${metric("Dominios", domains.length)}
    ${metric("Plan", business.plan_code || "starter")}
    ${metric("Rol", roleLabel(member.role || "owner"))}
  </section>
  <section class="panel">
    <div class="panel-header"><h2>Informacion del negocio</h2><span class="muted">Solo lectura por ahora</span></div>
    <div class="panel-body">
      <p><strong>${escapeHtml(business.business_name || "")}</strong></p>
      <p>${escapeHtml(business.business_description || "")}</p>
      <p>${escapeHtml([business.industry, business.location].filter(Boolean).join(" · "))}</p>
    </div>
  </section>`;
}

function bindViewEvents() {
  document.querySelector("#catalogSearch")?.addEventListener("input", (event) => {
    state.query = event.currentTarget.value;
    renderShell();
  });
  document.querySelector("#catalogStatus")?.addEventListener("change", (event) => {
    state.statusFilter = event.currentTarget.value;
    renderShell();
  });
  document.querySelector("[data-new-item]")?.addEventListener("click", () => {
    state.selectedItemId = "";
    renderShell();
  });
  document.querySelectorAll("[data-edit-item]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedItemId = button.dataset.editItem;
      renderShell();
    });
  });
  document.querySelectorAll("[data-toggle-active]").forEach((button) => {
    button.addEventListener("click", () => toggleCatalogItem(button.dataset.toggleActive, "isActive"));
  });
  document.querySelectorAll("[data-toggle-featured]").forEach((button) => {
    button.addEventListener("click", () => toggleCatalogItem(button.dataset.toggleFeatured, "isFeatured"));
  });
  document.querySelectorAll("[data-duplicate-item]").forEach((button) => {
    button.addEventListener("click", () => duplicateCatalogItem(button.dataset.duplicateItem));
  });
  document.querySelector("[data-clear-editor]")?.addEventListener("click", () => {
    state.selectedItemId = "";
    renderShell();
  });
  document.querySelector("[data-delete-item]")?.addEventListener("click", deleteSelectedItem);
  document.querySelector("#catalogItemForm")?.addEventListener("submit", saveCatalogItem);
}

async function saveCatalogItem(event) {
  event.preventDefault();
  if (state.saving) return;
  const form = event.currentTarget;
  state.saving = true;
  try {
    const data = await payloadFromForm(form);
    const itemId = state.selectedItemId;
    const response = await fetch(apiUrl(`/api/client/catalog-items${itemId ? `/${encodeURIComponent(itemId)}` : ""}?business_id=${encodeURIComponent(state.businessId)}`), {
      method: itemId ? "PATCH" : "POST",
      headers: authHeaders({ "content-type": "application/json" }),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(await response.text());
    const result = await response.json();
    state.selectedItemId = result.id;
    await refreshOverview();
  } catch (error) {
    window.alert(`No se pudo guardar: ${shortError(error)}`);
  } finally {
    state.saving = false;
    renderShell();
  }
}

async function payloadFromForm(form) {
  const imageFile = form.elements.imageFile?.files?.[0];
  let imageUrl = form.elements.imageUrl.value.trim();
  if (imageFile) {
    imageUrl = await uploadImage(imageFile);
  }
  return {
    name: form.elements.name.value.trim(),
    description: form.elements.description.value.trim(),
    sku: form.elements.sku.value.trim(),
    category: form.elements.category.value.trim(),
    priceType: form.elements.priceType.value,
    priceValue: numberOrNull(form.elements.priceValue.value),
    priceLabel: form.elements.priceLabel.value.trim(),
    buttonLabel: form.elements.buttonLabel.value.trim() || "Comprar",
    compareAtPrice: numberOrNull(form.elements.compareAtPrice.value),
    salePrice: numberOrNull(form.elements.salePrice.value),
    saleLabel: form.elements.saleLabel.value.trim(),
    saleStartsAt: form.elements.saleStartsAt.value,
    saleEndsAt: form.elements.saleEndsAt.value,
    tags: tagsFromInput(form.elements.tags.value),
    inventoryQuantity: integerOrNull(form.elements.inventoryQuantity.value),
    sortOrder: Number(form.elements.sortOrder.value || 0),
    imageUrl,
    isActive: form.elements.isActive.checked,
    isFeatured: form.elements.isFeatured.checked,
  };
}

function payloadFromItem(item, overrides = {}) {
  const metadata = item.metadata || {};
  return {
    name: item.name || "Producto",
    description: item.description || "",
    sku: metadata.sku || "",
    category: metadata.category || "",
    priceType: item.price_type || "fixed",
    priceValue: item.price_value ?? null,
    priceLabel: item.price_label || "",
    buttonLabel: item.button_label || "Comprar",
    compareAtPrice: metadata.compare_at_price ?? null,
    salePrice: metadata.sale_price ?? null,
    saleLabel: metadata.sale_label || "",
    saleStartsAt: metadata.sale_starts_at || "",
    saleEndsAt: metadata.sale_ends_at || "",
    tags: Array.isArray(metadata.tags) ? metadata.tags : [],
    inventoryQuantity: metadata.inventory_quantity ?? null,
    sortOrder: Number(item.sort_order || 0),
    imageUrl: item.image_url || "",
    isActive: item.is_active !== false,
    isFeatured: Boolean(item.is_featured),
    ...overrides,
  };
}

async function toggleCatalogItem(itemId, field) {
  const item = (state.overview.catalog_items || []).find((entry) => entry.id === itemId);
  if (!item || state.saving) return;
  const nextValue = field === "isActive" ? item.is_active === false : !item.is_featured;
  state.saving = true;
  try {
    const response = await fetch(apiUrl(`/api/client/catalog-items/${encodeURIComponent(itemId)}?business_id=${encodeURIComponent(state.businessId)}`), {
      method: "PATCH",
      headers: authHeaders({ "content-type": "application/json" }),
      body: JSON.stringify(payloadFromItem(item, { [field]: nextValue })),
    });
    if (!response.ok) throw new Error(await response.text());
    await refreshOverview();
  } catch (error) {
    window.alert(`No se pudo actualizar: ${shortError(error)}`);
  } finally {
    state.saving = false;
    renderShell();
  }
}

async function duplicateCatalogItem(itemId) {
  const item = (state.overview.catalog_items || []).find((entry) => entry.id === itemId);
  if (!item || state.saving) return;
  state.saving = true;
  try {
    const payload = payloadFromItem(item, {
      name: `${item.name || "Producto"} copia`,
      sku: "",
      isActive: false,
      isFeatured: false,
      sortOrder: Number(item.sort_order || 0) + 1,
    });
    const response = await fetch(apiUrl(`/api/client/catalog-items?business_id=${encodeURIComponent(state.businessId)}`), {
      method: "POST",
      headers: authHeaders({ "content-type": "application/json" }),
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(await response.text());
    const result = await response.json();
    state.selectedItemId = result.id;
    await refreshOverview();
  } catch (error) {
    window.alert(`No se pudo duplicar: ${shortError(error)}`);
  } finally {
    state.saving = false;
    renderShell();
  }
}

async function uploadImage(file) {
  const dataUrl = await fileToDataUrl(file);
  const response = await fetch(apiUrl(`/api/client/assets/upload?business_id=${encodeURIComponent(state.businessId)}`), {
    method: "POST",
    headers: authHeaders({ "content-type": "application/json" }),
    body: JSON.stringify({
      businessId: state.businessId,
      assetType: "catalog",
      fileName: file.name,
      contentType: file.type || "image/jpeg",
      dataUrl,
      label: "Catalog item image",
    }),
  });
  if (!response.ok) throw new Error(await response.text());
  const result = await response.json();
  return result.url;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function deleteSelectedItem() {
  if (!state.selectedItemId) return;
  if (!window.confirm("Eliminar este producto del catalogo?")) return;
  try {
    const response = await fetch(apiUrl(`/api/client/catalog-items/${encodeURIComponent(state.selectedItemId)}?business_id=${encodeURIComponent(state.businessId)}`), {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!response.ok) throw new Error(await response.text());
    state.selectedItemId = "";
    await refreshOverview();
  } catch (error) {
    window.alert(`No se pudo eliminar: ${shortError(error)}`);
  }
}

async function refreshOverview() {
  const response = await fetch(apiUrl(`/api/client/portal?business_id=${encodeURIComponent(state.businessId)}`), {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error(await response.text());
  state.overview = await response.json();
}

function numberOrNull(value) {
  if (value === "") return null;
  const number = Number(value);
  return Number.isNaN(number) ? null : number;
}

function integerOrNull(value) {
  if (value === "") return null;
  const number = Number.parseInt(value, 10);
  return Number.isNaN(number) ? null : number;
}

function tagsFromInput(value) {
  return String(value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function formatDate(value) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.currentView = button.dataset.sellerView;
    renderShell();
  });
});

loginForm.addEventListener("submit", loginSeller);
existingAccessButton?.addEventListener("click", () => {
  loginForm.classList.remove("login-collapsed");
  loginForm.setAttribute("aria-hidden", "false");
  loginForm.elements.email?.focus();
});
demoAccessButton?.addEventListener("click", () => {
  state.demoAccess = true;
  const url = new URL(window.location.href);
  url.searchParams.set("demo", "1");
  window.history.replaceState({}, "", url);
  loadPortal();
});
logoutButton.addEventListener("click", () => {
  clearSession();
  state.demoAccess = false;
  showLogin("Sesion cerrada.", true);
});
document.querySelector("#refreshButton").addEventListener("click", loadPortal);

loadPortal();
