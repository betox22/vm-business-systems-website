const state = {
  businessId: new URLSearchParams(window.location.search).get("business_id") || "",
  products: [],
  selectedItemId: "",
  query: "",
  statusFilter: "all",
  saving: false,
  authenticated: false,
  notice: "",
  epoch: 0,
  loginRevealed: false,
  editorOpen: false,
};
const apiBase = resolveApiBase();
const content = document.querySelector("#sellerContent");
const loginScreen = document.querySelector("#sellerLoginScreen");
const loginForm = document.querySelector("#sellerLoginForm");
const loginStatus = document.querySelector("#sellerLoginStatus");
const welcomeCopy = document.querySelector(".welcome-copy");
const manualNotice = "Los productos nuevos y duplicados se guardan en comercio, pero todavia no aparecen en la pagina publica generada por IA. Esta limitacion no impide guardar tu catalogo aqui.";
clearLegacyTokenStorage();
configureLoginEntry();

function configureLoginEntry() {
  const existingStore = Boolean(state.businessId);
  welcomeCopy.hidden = existingStore;
  loginScreen.dataset.existingStore = String(existingStore);
  const reveal = existingStore || state.loginRevealed;
  if (reveal) loginForm.classList.remove("login-collapsed");
  else loginForm.classList.add("login-collapsed");
  loginForm.setAttribute("aria-hidden", String(!reveal));
}

function resolveApiBase() {
  if (window.LUMA_API_BASE_URL) return String(window.LUMA_API_BASE_URL).replace(/\/$/, "");
  const saved = localStorage.getItem("lumaApiBaseUrl");
  if (saved) return saved.replace(/\/$/, "");
  if (["localhost", "127.0.0.1"].includes(window.location.hostname)) return "http://127.0.0.1:8010";
  return "https://luma-api.vmbusinesssystems.com";
}
function productsPath(id = "") {
  return `/api/v1/store-owner/${encodeURIComponent(state.businessId)}/products${id ? `/${encodeURIComponent(id)}` : ""}`;
}
function clearLegacyTokenStorage() {
  localStorage.removeItem("lumaClientAccessToken");
  localStorage.removeItem("lumaClientRefreshToken");
}
function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function money(value) {
  return value == null ? "Requiere cotizacion" : `$${Number(value).toFixed(2)}`;
}
async function apiRequest(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options, credentials: "include",
    headers: { ...(options.body ? { "content-type": "application/json" } : {}), ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof data.detail === "string" ? data.detail : "Revisa los datos del formulario.";
    const error = new Error(response.status === 403 ? "No eres el dueno de esta tienda." : detail);
    error.status = response.status;
    if (response.status === 401 && !path.endsWith("/login")) resetView();
    throw error;
  }
  return data;
}
function resetView() {
  state.epoch++;
  state.authenticated = false;
  state.products = [];
  state.selectedItemId = "";
  state.editorOpen = false;
  state.notice = "";
  content.innerHTML = "";
  document.querySelector("#editDesignButton").hidden = true;
  document.querySelector("#designProjectDialog")?.close?.();
  document.querySelector("#designProjectChoices").textContent = "";
  document.querySelector("#sellerStoreName").textContent = "Mi tienda";
  showLogin("Inicia sesion para continuar.");
}
function showLogin(message = "", revealForm = false) {
  loginScreen.classList.remove("hidden");
  state.loginRevealed = state.loginRevealed || revealForm;
  configureLoginEntry();
  loginStatus.textContent = message;
}
async function establishCookieSession(accessToken, refreshToken = "") {
  await apiRequest("/api/client/auth/session", {
    method: "POST", body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken }),
  });
  // A successful Set-Cookie response is not proof that the browser accepted it.
  await apiRequest("/api/client/auth/me");
  clearLegacyTokenStorage();
}
async function loginSeller(event) {
  event.preventDefault();
  const button = loginForm.querySelector('button[type="submit"]');
  button.disabled = true;
  loginStatus.textContent = "Validando acceso...";
  try {
    const result = await apiRequest("/api/client/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: loginForm.elements.email.value.trim(),
        password: loginForm.elements.password.value, businessId: state.businessId || null }),
    });
    await establishCookieSession(result.access_token, result.refresh_token);
    await loadPortal();
  } catch (error) {
    showLogin(error.message);
  } finally {
    loginForm.elements.password.value = "";
    button.disabled = false;
  }
}
async function loadPortal() {
  const epoch = ++state.epoch;
  try {
    await apiRequest("/api/client/auth/me");
    if (epoch !== state.epoch) return;
    if (!state.businessId) throw new Error("Falta business_id. Abre el enlace de administracion de tu tienda.");
    const result = await apiRequest(productsPath());
    if (epoch !== state.epoch) return;
    state.authenticated = true;
    document.querySelector("#editDesignButton").hidden = false;
    state.products = result.products;
    loginScreen.classList.add("hidden");
    document.querySelector("#sellerStoreName").textContent = "Mi catalogo";
    document.querySelector("#sellerStoreMeta").textContent = state.businessId;
    renderCatalog();
  } catch (error) {
    if (epoch !== state.epoch && error.status !== 401) return;
    state.authenticated = false;
    document.querySelector("#editDesignButton").hidden = true;
    state.products = [];
    content.innerHTML = "";
    showLogin(error.message);
  }
}
async function captureAuthRedirect() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  const token = params.get("access_token") || query.get("access_token");
  if (!token) return false;
  const refresh = params.get("refresh_token") || query.get("refresh_token") || "";
  const url = new URL(window.location.href);
  url.hash = "";
  for (const key of ["access_token", "refresh_token", "expires_in", "expires_at", "token_type", "type"]) url.searchParams.delete(key);
  window.history.replaceState({}, "", url);
  try {
    await establishCookieSession(token, refresh);
    await loadPortal();
  } catch (error) { showLogin(error.message); }
  return true;
}
function selectedItem() {
  return state.products.find(item => item.id === state.selectedItemId);
}
function catalogItems() {
  const query = state.query.toLowerCase().trim();
  return state.products.filter(item =>
    (state.statusFilter === "all" || (state.statusFilter === "active" ? item.status === "Published" : item.status === "Archived")) &&
    [item.name, item.description, item.sku, item.categoryId].some(value => String(value || "").toLowerCase().includes(query)));
}
function catalogTable(rows) {
  if (!rows.length) return `<div class="empty-state" role="status">${state.products.length ? "Sin resultados para el filtro." : "Todavia no hay productos importados en esta tienda."}</div>`;
  return `<table class="inventory-table" aria-label="Inventario de productos"><thead><tr><th scope="col">Producto / SKU</th><th scope="col">Precio</th><th scope="col">Stock</th><th scope="col">Estado</th><th scope="col">Acciones</th></tr></thead><tbody>${rows.map(item => `<tr class="${item.status === "Archived" ? "is-inactive" : ""}">
    <td class="inventory-product"><div class="product-cell"><div class="product-thumb">${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="" loading="lazy">` : "<span>Sin foto</span>"}</div><div><strong>${escapeHtml(item.name)}</strong><span class="muted">${escapeHtml(item.sku)}</span><small>${escapeHtml(item.categoryId)}</small></div></div></td>
    <td data-label="Precio">${item.quoteOnly || item.price == null ? '<span class="quote-label">Requiere cotizacion</span>' : inlineInventoryCell(item, "price")}</td>
    <td data-label="Stock">${inlineInventoryCell(item, "stock")}</td>
    <td data-label="Estado"><span class="status-pill ${item.status === "Archived" ? "off" : ""}">${escapeHtml(item.status)}</span></td>
    <td class="inventory-actions"><div class="catalog-card-actions">
    <button class="secondary-button compact" data-edit-item="${escapeHtml(item.id)}" type="button">Editar</button>
    <button class="secondary-button compact" data-toggle-active="${escapeHtml(item.id)}" type="button">${item.status === "Published" ? "Archivar" : "Activar"}</button>
    <button class="text-button" data-duplicate-item="${escapeHtml(item.id)}" type="button">Duplicar</button>
    </div></td></tr>`).join("")}</tbody></table>`;
}
function inlineInventoryCell(item, field) {
  const value = field === "price" ? Number(item.price).toFixed(2) : item.stock;
  const label = `${field === "price" ? "Precio" : "Stock"} de ${item.name}`;
  return `<div class="inventory-cell"><div class="inventory-control">${field === "price" ? '<span aria-hidden="true">$</span>' : ""}<input type="text" inputmode="${field === "price" ? "decimal" : "numeric"}" aria-label="${escapeHtml(label)}" data-inventory-id="${escapeHtml(item.id)}" data-field="${field}" value="${escapeHtml(value)}"><button type="button" data-save-cell aria-label="Guardar ${escapeHtml(label.toLowerCase())}" title="Guardar" hidden>&#10003;</button></div><span class="cell-status" role="status" aria-live="polite"></span></div>`;
}
function inlineInventoryPayload(item, field, text) {
  const raw = text.trim().replace(",", ".");
  if (field === "price") {
    if (item.quoteOnly || item.price == null) throw new Error("Este producto requiere cotizacion.");
    if (!/^\d+(\.\d{1,2})?$/.test(raw) || !Number.isFinite(Number(raw)) || Number(raw) <= 0) throw new Error("Indica un precio positivo, con hasta 2 decimales.");
    return { price: Number(raw) };
  }
  if (field !== "stock" || !/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw)) || Number(raw) > 2147483647) throw new Error("Indica un stock entero de cero o mas.");
  return { stock: Number(raw) };
}
function cellMessage(input, text, status = "") {
  const cell = input.closest(".inventory-cell");
  cell.dataset.status = status;
  cell.querySelector(".cell-status").textContent = text;
  input.setAttribute("aria-invalid", String(status === "error"));
}
function cancelInventoryEdit(input) {
  if (state.saving) return;
  const item = state.products.find(product => product.id === input.dataset.inventoryId);
  if (!item) return;
  input.value = input.dataset.field === "price" ? Number(item.price).toFixed(2) : String(item.stock);
  input.closest(".inventory-cell").querySelector("button").hidden = true;
  cellMessage(input, "Cancelado");
}
function lockInventory(locked) {
  content.querySelectorAll("button, input, select, textarea, summary").forEach(element => {
    element.disabled = locked;
  });
  document.querySelector("#refreshButton").disabled = locked;
}
async function saveInventoryCell(input) {
  if (!state.authenticated || state.saving) return;
  const item = state.products.find(product => product.id === input.dataset.inventoryId);
  if (!item) return;
  let payload;
  try { payload = inlineInventoryPayload(item, input.dataset.field, input.value); }
  catch (error) { cellMessage(input, error.message, "error"); return; }
  const epoch = state.epoch;
  state.saving = true;
  lockInventory(true);
  cellMessage(input, "Guardando...", "saving");
  try {
    const saved = await apiRequest(productsPath(item.id), { method: "PATCH", body: JSON.stringify(payload) });
    if (epoch !== state.epoch || !state.authenticated) return;
    Object.assign(item, saved);
    input.value = input.dataset.field === "price" ? Number(item.price).toFixed(2) : String(item.stock);
    input.closest(".inventory-cell").querySelector("button").hidden = true;
    cellMessage(input, "Guardado", "saved");
    // Keep the secondary form in sync without replacing the focused table.
    if (state.selectedItemId === item.id) {
      const form = document.querySelector("#catalogItemForm");
      const formField = input.dataset.field === "price" ? "priceValue" : "inventoryQuantity";
      form.elements[formField].value = item[input.dataset.field] ?? "";
    }
  } catch (error) {
    if (epoch === state.epoch && state.authenticated) cellMessage(input, error.message || "No se pudo guardar. Reintenta.", "error");
  } finally {
    state.saving = false;
    lockInventory(false);
    if (epoch === state.epoch && input.isConnected) input.focus();
  }
}
content.addEventListener("input", event => {
  if (!event.target.matches("[data-inventory-id]")) return;
  event.target.closest(".inventory-cell").querySelector("button").hidden = false;
  cellMessage(event.target, "Sin guardar", "dirty");
});
content.addEventListener("keydown", event => {
  if (!event.target.matches("[data-inventory-id]") || event.isComposing) return;
  if (event.key === "Enter") { event.preventDefault(); saveInventoryCell(event.target); }
  if (event.key === "Escape") { event.preventDefault(); cancelInventoryEdit(event.target); }
});
function renderEditor(item) {
  return `<details class="editor-card" id="productEditor" ${state.editorOpen || item ? "open" : ""}><summary class="panel-header">${item ? "Editar producto" : "Nuevo producto"}</summary>
    <form id="catalogItemForm" class="editor-form">
      ${!item ? `<p role="note">${manualNotice}</p>` : ""}
      <label>Nombre<input name="name" minlength="2" maxlength="160" required value="${escapeHtml(item?.name || "")}"></label>
      <label>Descripcion<textarea name="description" maxlength="1200" rows="3">${escapeHtml(item?.description || "")}</textarea></label>
      <div class="form-grid-2"><label>SKU<input name="sku" value="${escapeHtml(item?.sku || "")}"></label>
      <label>Categoria<input name="category" required value="${escapeHtml(item?.categoryId || "")}"></label></div>
      <div class="form-grid-2"><label>Tipo de precio<select name="priceType">
      <option value="fixed" ${!item?.quoteOnly ? "selected" : ""}>Precio fijo</option>
      <option value="starting_at">Desde</option>
      <option value="quote_only" ${item?.quoteOnly ? "selected" : ""}>Cotizar</option></select></label>
      <label>Precio<input name="priceValue" type="number" step="0.01" min="0.01" value="${escapeHtml(item?.price ?? "")}"></label></div>
      <label>Stock<input name="inventoryQuantity" type="number" min="0" step="1" required value="${escapeHtml(item?.stock ?? "")}"></label>
      <label>URL de imagen<input name="imageUrl" type="url" value="${escapeHtml(item?.imageUrl || "")}"></label>
      <label class="switch-row">Activo<input name="isActive" type="checkbox" ${!item || item.status === "Published" ? "checked" : ""}></label>
      <p id="catalogSaveStatus" role="status" aria-live="polite"></p>
      <div class="inline-actions"><button class="primary-button" type="submit">Guardar</button>
      <button class="secondary-button" data-clear-editor type="button">Nuevo producto</button></div>
    </form></details>`;
}
function renderCatalog() {
  if (!state.authenticated) return;
  document.querySelector("#sellerTitle").textContent = "Catalogo";
  document.querySelector("#sellerSubtitle").textContent = "Productos, precios, inventario e imagenes.";
  content.innerHTML = `<p role="status" aria-live="polite">${escapeHtml(state.notice)}</p>
    <section class="catalog-layout"><article class="panel"><div class="panel-header"><h2>Inventario <span class="inventory-count">${state.products.length}</span></h2><button class="primary-button" data-new-product type="button">Nuevo producto</button></div>
    <div class="catalog-toolbar"><input id="catalogSearch" aria-label="Buscar productos" placeholder="Buscar producto, SKU o categoria" value="${escapeHtml(state.query)}">
    <select id="catalogStatus" aria-label="Estado"><option value="all">Todos</option><option value="active">Activos</option><option value="inactive">Archivados</option></select></div>
    <div id="catalogRows">${catalogTable(catalogItems())}</div></article>${renderEditor(selectedItem())}</section>`;
  document.querySelector("#catalogStatus").value = state.statusFilter;
  document.querySelector("#catalogSearch").addEventListener("input", event => {
    state.query = event.target.value;
    document.querySelector("#catalogRows").innerHTML = catalogTable(catalogItems());
  });
  document.querySelector("#catalogStatus").addEventListener("change", event => {
    state.statusFilter = event.target.value;
    document.querySelector("#catalogRows").innerHTML = catalogTable(catalogItems());
  });
  document.querySelector("#catalogItemForm").addEventListener("submit", saveCatalogItem);
}
function payloadFromForm(form) {
  const fields = form.elements;
  const priceType = fields.priceType.value;
  // Do not silently coerce the unsupported "Desde" contract while its UX decision is pending.
  if (priceType === "starting_at") throw new Error('El precio "Desde" no tiene contrato de guardado. Su tratamiento esta pendiente de aprobacion.');
  const stockText = fields.inventoryQuantity.value.trim();
  const stock = Number(stockText);
  if (!stockText || !Number.isInteger(stock) || stock < 0) throw new Error("Indica un stock entero de cero o mas.");
  const quoteOnly = priceType === "quote_only";
  const price = quoteOnly ? null : Number(fields.priceValue.value);
  if (!quoteOnly && (!Number.isFinite(price) || price <= 0)) throw new Error("Indica un precio positivo.");
  const payload = { name: fields.name.value.trim(), description: fields.description.value.trim(),
    categoryId: fields.category.value.trim(), price, quoteOnly, stock, imageUrl: fields.imageUrl.value.trim(),
    active: fields.isActive.checked, published: fields.isActive.checked };
  const sku = fields.sku.value.trim();
  if (sku) payload.sku = sku;
  return payload;
}
function duplicatePayload(item) {
  return { name: `${item.name} copia`.slice(0, 160), description: item.description,
    categoryId: item.categoryId, price: item.quoteOnly ? null : item.price, quoteOnly: item.quoteOnly,
    stock: item.stock, imageUrl: item.imageUrl, active: false, published: false };
}
async function saveCatalogItem(event) {
  event.preventDefault();
  if (state.saving) return;
  const form = event.currentTarget;
  let payload;
  try { payload = payloadFromForm(form); }
  catch (error) { document.querySelector("#catalogSaveStatus").textContent = error.message; return; }
  const creating = !state.selectedItemId;
  await mutateProduct(productsPath(state.selectedItemId), creating ? "POST" : "PATCH", payload, creating);
}
async function mutateProduct(path, method, payload, creating = false) {
  if (state.saving) return;
  const epoch = state.epoch;
  state.saving = true;
  lockInventory(true);
  try {
    const result = await apiRequest(path, { method, body: JSON.stringify(payload) });
    const refreshed = await apiRequest(productsPath());
    if (epoch !== state.epoch || !state.authenticated) return;
    state.products = refreshed.products;
    state.selectedItemId = result.id;
    state.notice = creating ? manualNotice : "Cambios guardados en comercio.";
    renderCatalog();
  } catch (error) {
    if (error.status === 401) showLogin("Tu sesion ha caducado. Inicia sesion de nuevo.");
    else {
      const status = document.querySelector("#catalogSaveStatus");
      if (status) status.textContent = error.message;
    }
  } finally {
    state.saving = false;
    lockInventory(false);
  }
}
content.addEventListener("click", event => {
  if (!state.authenticated || state.saving) return;
  const button = event.target.closest("button");
  if (!button) return;
  if (button.hasAttribute("data-save-cell")) { saveInventoryCell(button.closest(".inventory-cell").querySelector("input")); return; }
  const id = button.dataset.editItem || button.dataset.toggleActive || button.dataset.duplicateItem;
  const item = state.products.find(product => product.id === id);
  if (button.hasAttribute("data-clear-editor") || button.hasAttribute("data-new-product")) { state.selectedItemId = ""; state.editorOpen = true; renderCatalog(); document.querySelector("#productEditor").scrollIntoView({ block: "start", behavior: "smooth" }); }
  if (!item) return;
  if (button.dataset.editItem) { state.selectedItemId = id; state.editorOpen = true; renderCatalog(); document.querySelector("#productEditor").scrollIntoView({ block: "start", behavior: "smooth" }); }
  if (button.dataset.toggleActive) {
    const active = item.status !== "Published";
    mutateProduct(productsPath(id), "PATCH", { active, published: active });
  }
  if (button.dataset.duplicateItem) mutateProduct(productsPath(), "POST", duplicatePayload(item), true);
});
loginForm.addEventListener("submit", loginSeller);
function continueWithSellerGoogle() {
  const authUrl = window.LUMA_SUPABASE_AUTH_URL;
  if (!authUrl) {
    loginStatus.textContent = "El acceso con Google no esta configurado. Recarga la pagina.";
    return;
  }
  const returnTo = encodeURIComponent(window.location.href);
  window.location.href = `${authUrl}?provider=google&redirect_to=${returnTo}`;
}
document.querySelector("#sellerGoogleLoginButton")?.addEventListener("click", continueWithSellerGoogle);
document.querySelector("#existingAccessButton")?.addEventListener("click", () => showLogin("", true));
document.querySelector("#sellerLogoutButton").addEventListener("click", async () => {
  resetView();
  try { await apiRequest("/api/client/auth/logout", { method: "POST" }); showLogin("Sesion cerrada."); }
  catch { showLogin("No se pudo cerrar la sesion del servidor. Vuelve a intentarlo."); }
});
document.querySelector("#refreshButton").addEventListener("click", loadPortal);
function projectsForStore(projects, storeId) {
  return projects.filter(project => project.store_id === storeId);
}
function projectEditorUrl(projectId) {
  const url = new URL("/client/setup/", window.location.origin);
  url.searchParams.set("project_id", projectId);
  return url.href;
}
async function openStoreDesign() {
  if (!state.authenticated) return;
  const button = document.querySelector("#editDesignButton");
  const dialog = document.querySelector("#designProjectDialog");
  const choices = document.querySelector("#designProjectChoices");
  const epoch = state.epoch;
  button.disabled = true;
  try {
    const result = await apiRequest("/api/client/projects");
    // Rolling deployments: older listings omit store_id; the owner-checked detail has it.
    for (const project of result.projects || []) {
      if (project.store_id != null) continue;
      const detail = await apiRequest(`/api/client/projects/${encodeURIComponent(project.id)}`);
      if (epoch !== state.epoch || !state.authenticated) return;
      project.store_id = detail.business_id;
    }
    if (epoch !== state.epoch || !state.authenticated) return;
    const projects = projectsForStore(result.projects || [], state.businessId);
    if (projects.length === 1) { window.location.href = projectEditorUrl(projects[0].id); return; }
    choices.innerHTML = projects.length ? projects.map(project => `<button class="secondary-button design-project-choice" type="button" data-design-project="${escapeHtml(project.id)}"><strong>${escapeHtml(project.business_name)}</strong><span>${escapeHtml(project.template_name)} · ${escapeHtml(project.status)}</span></button>`).join("") : '<p>No hay paginas asociadas a esta tienda.</p>';
    dialog.showModal();
  } catch (error) {
    if (epoch !== state.epoch || !state.authenticated) return;
    choices.textContent = error.message;
    dialog.showModal();
  } finally { button.disabled = false; }
}
document.querySelector("#editDesignButton")?.addEventListener("click", openStoreDesign);
document.querySelector("#designProjectChoices")?.addEventListener("click", event => {
  const button = event.target.closest("[data-design-project]");
  if (button && state.authenticated) window.location.href = projectEditorUrl(button.dataset.designProject);
});
(async () => { if (!await captureAuthRedirect()) await loadPortal(); })();
