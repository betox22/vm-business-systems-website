const state = {
  businessId: new URLSearchParams(window.location.search).get("business_id") || "",
  currentView: "catalog",
  overview: null,
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
  if (!state.businessId) {
    renderError("Falta business_id. Abre este panel desde el admin de una tienda.");
    return;
  }
  renderLoading();
  try {
    const response = await fetch(apiUrl(`/api/client/portal?business_id=${encodeURIComponent(state.businessId)}`));
    if (!response.ok) throw new Error(await response.text());
    state.overview = await response.json();
    renderShell();
  } catch (error) {
    renderError(`No se pudo cargar el portal: ${shortError(error)}`);
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
  return `<table>
    <thead><tr><th>Producto</th><th>Precio</th><th>Stock</th><th>Estado</th><th>Accion</th></tr></thead>
    <tbody>
      ${rows.map((item) => {
        const metadata = item.metadata || {};
        return `<tr>
          <td>
            <div class="product-cell">
              <div class="product-thumb">${item.image_url ? `<img src="${escapeAttribute(item.image_url)}" alt="">` : ""}</div>
              <div>
                <strong>${escapeHtml(item.name)}</strong>
                <span class="muted">${escapeHtml(metadata.sku || "Sin SKU")} ${metadata.category ? `· ${escapeHtml(metadata.category)}` : ""}</span>
              </div>
            </div>
          </td>
          <td>
            <strong>${escapeHtml(item.price_label || money(item.price_value) || "Cotizar")}</strong>
            ${metadata.sale_price ? `<span class="sale-pill">Oferta ${escapeHtml(money(metadata.sale_price))}</span>` : ""}
          </td>
          <td>${metadata.inventory_quantity ?? "Sin control"}</td>
          <td>
            <span class="status-pill ${item.is_active === false ? "off" : ""}">${item.is_active === false ? "Inactivo" : "Activo"}</span>
            ${item.is_featured ? `<span class="sale-pill">Destacado</span>` : ""}
          </td>
          <td>${can("catalog:update") ? `<button class="text-button" data-edit-item="${escapeAttribute(item.id)}" type="button">Editar</button>` : `<span class="muted">Solo lectura</span>`}</td>
        </tr>`;
      }).join("")}
    </tbody>
  </table>`;
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
      <div class="form-grid-2">
        <label>Precio antes
          <input name="compareAtPrice" type="number" step="0.01" value="${escapeAttribute(metadata.compare_at_price ?? "")}">
        </label>
        <label>Precio oferta
          <input name="salePrice" type="number" step="0.01" value="${escapeAttribute(metadata.sale_price ?? "")}">
        </label>
      </div>
      <div class="form-grid-2">
        <label>Stock
          <input name="inventoryQuantity" type="number" step="1" value="${escapeAttribute(metadata.inventory_quantity ?? "")}">
        </label>
        <label>Orden
          <input name="sortOrder" type="number" step="1" value="${escapeAttribute(item?.sort_order ?? 0)}">
        </label>
      </div>
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
      headers: { "content-type": "application/json" },
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
    compareAtPrice: numberOrNull(form.elements.compareAtPrice.value),
    salePrice: numberOrNull(form.elements.salePrice.value),
    inventoryQuantity: integerOrNull(form.elements.inventoryQuantity.value),
    sortOrder: Number(form.elements.sortOrder.value || 0),
    imageUrl,
    isActive: form.elements.isActive.checked,
    isFeatured: form.elements.isFeatured.checked,
  };
}

async function uploadImage(file) {
  const dataUrl = await fileToDataUrl(file);
  const response = await fetch(apiUrl(`/api/client/assets/upload?business_id=${encodeURIComponent(state.businessId)}`), {
    method: "POST",
    headers: { "content-type": "application/json" },
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
    });
    if (!response.ok) throw new Error(await response.text());
    state.selectedItemId = "";
    await refreshOverview();
  } catch (error) {
    window.alert(`No se pudo eliminar: ${shortError(error)}`);
  }
}

async function refreshOverview() {
  const response = await fetch(apiUrl(`/api/client/portal?business_id=${encodeURIComponent(state.businessId)}`));
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

document.querySelector("#refreshButton").addEventListener("click", loadPortal);

loadPortal();
