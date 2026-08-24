import {
  adminCapabilities,
  dashboardStats,
  flattenClientProjects,
  templateUpdatePayload,
} from "./kreaton-admin-policy.js";

const API_BASE = String(window.LUMA_API_BASE_URL || "").replace(/\/$/, "");
const SUPABASE_URL = "https://rzdidqclbvnqqlcaueoh.supabase.co";
// Public Supabase anon credential. Authorization still comes from RLS and trusted app_metadata roles.
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6ZGlkcWNsYnZucXFsY2F1ZW9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxOTY3NzUsImV4cCI6MjA5Mzc3Mjc3NX0.R6gl2jmRRaXDzOzh_QdsAlzdzvdSyfp0muCEJGnJku0";

const state = {
  identity: null,
  view: "clients",
  clients: [],
  templates: [],
  audit: [],
  auditPagination: null,
  clientFilters: { q: "", status: "", templateId: "" },
  auditFilters: { q: "", outcome: "" },
  confirmAction: null,
};

const viewMeta = {
  clients: ["DIRECTORIO", "Clientes", "Cuentas, negocios y estado de actividad."],
  projects: ["SITIOS", "Proyectos", "Todos los sitios creados por tus clientes."],
  templates: ["CATÁLOGO", "Plantillas", "Disponibilidad para proyectos nuevos."],
  audit: ["SEGURIDAD", "Auditoría", "Trazabilidad de cada acción administrativa."],
};

const iconPaths = {
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  pages: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  layout: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M9 21V9"/>',
  activity: '<path d="M3 12h4l3-9 4 18 3-9h4"/>',
  logout: '<path d="M10 17l5-5-5-5M15 12H3"/><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>',
  refresh: '<path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 4v5h5M4 13a8.1 8.1 0 0 0 15.5 2M20 20v-5h-5"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  external: '<path d="M15 3h6v6M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  alert: '<path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0ZM12 9v4M12 17h.01"/>',
  check: '<path d="m20 6-11 11-5-5"/>',
  store: '<path d="M3 9 5 3h14l2 6M5 13v8h14v-8"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/>',
};

function icon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || iconPaths.pages}</svg>`;
}

function hydrateIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((node) => {
    node.innerHTML = icon(node.dataset.icon);
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function apiUrl(path) {
  return `${API_BASE}${path}`;
}

async function api(path, options = {}) {
  const response = await fetch(apiUrl(path), {
    credentials: "include",
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  let body = {};
  try { body = await response.json(); } catch {}
  if (!response.ok) {
    const error = new Error(body.detail || "No se pudo completar la solicitud.");
    error.status = response.status;
    throw error;
  }
  return body;
}

function callbackToken() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const token = params.get("access_token") || "";
  if (token) history.replaceState({}, document.title, window.location.pathname + window.location.search);
  return token;
}

async function exchangeAdminSession(token) {
  return api("/api/admin/auth/session", {
    method: "POST",
    body: JSON.stringify({ access_token: token }),
  });
}

function setLoginStatus(message, success = false) {
  const node = document.querySelector("#loginStatus");
  node.textContent = message;
  node.classList.toggle("success", success);
}

async function startEmailLogin(email) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      options: {
        emailRedirectTo: window.location.href.split("#")[0],
        shouldCreateUser: false,
      },
    }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.msg || body.message || "No se pudo enviar el enlace.");
  }
}

function startGoogleLogin() {
  const redirect = encodeURIComponent(window.location.href.split("#")[0]);
  window.location.assign(`${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${redirect}`);
}

async function boot() {
  hydrateIcons();
  const token = callbackToken();
  try {
    state.identity = token ? await exchangeAdminSession(token) : await api("/api/admin/auth/me", { method: "GET" });
    showApp();
  } catch (error) {
    showLogin(error.status === 403 ? error.message : "");
  }
}

function showLogin(message = "") {
  state.identity = null;
  document.querySelector("#appShell").classList.add("hidden");
  document.querySelector("#loginScreen").classList.remove("hidden");
  setLoginStatus(message);
}

function showApp() {
  document.querySelector("#loginScreen").classList.add("hidden");
  document.querySelector("#appShell").classList.remove("hidden");
  const email = state.identity.email || "Cuenta autorizada";
  document.querySelector("#sessionEmail").textContent = email;
  document.querySelector("#sessionRole").textContent = roleLabel(state.identity.role);
  document.querySelector("#roleBadge").textContent = roleLabel(state.identity.role);
  document.querySelector("#sessionAvatar").textContent = email.slice(0, 1).toUpperCase();
  loadView("clients");
}

function roleLabel(role) {
  return role === "super_admin" ? "Super admin" : "Soporte";
}

function formatDate(value, withTime = false) {
  if (!value) return "Sin actividad";
  const numeric = Number(value);
  const date = Number.isFinite(numeric) && numeric > 0
    ? new Date(numeric < 1e12 ? numeric * 1000 : numeric)
    : new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin actividad";
  return new Intl.DateTimeFormat("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

function statusBadge(value) {
  const status = String(value || "neutral").toLowerCase();
  const labels = {
    active: "Activa", published: "Publicado", draft: "Borrador",
    unverified: "Sin verificar", suspended: "Suspendida", deleted: "Eliminada",
    success: "Correcto", failure: "Falló", denied: "Denegado",
  };
  const css = labels[status] ? status : "neutral";
  return `<span class="status-badge ${css}">${escapeHtml(labels[status] || value || "Sin estado")}</span>`;
}

function publicUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

async function fetchAllClients(filters = {}) {
  const clients = [];
  let page = 1;
  while (page <= 20) {
    const params = new URLSearchParams({ page: String(page), per_page: "100" });
    if (filters.q) params.set("q", filters.q);
    if (filters.status) params.set("status", filters.status);
    if (filters.templateId) params.set("template_id", filters.templateId);
    const body = await api(`/api/admin/clients?${params}`);
    clients.push(...(body.clients || []));
    if (!body.pagination?.hasNext) break;
    page += 1;
  }
  return clients;
}

async function ensureClients() {
  state.clients = await fetchAllClients(state.clientFilters);
}

async function ensureTemplates() {
  if (!adminCapabilities(state.identity).canReadTemplates) {
    state.templates = [];
    return;
  }
  const body = await api("/api/admin/templates");
  state.templates = body.templates || [];
}

async function ensureAudit() {
  const params = new URLSearchParams({ per_page: "75" });
  if (state.auditFilters.q) params.set("q", state.auditFilters.q);
  if (state.auditFilters.outcome) params.set("outcome", state.auditFilters.outcome);
  const body = await api(`/api/admin/audit?${params}`);
  state.audit = body.events || [];
  state.auditPagination = body.pagination || null;
}

async function loadView(view = state.view) {
  state.view = view;
  window.scrollTo(0, 0);
  setViewChrome();
  renderLoading();
  try {
    if (view === "clients") await ensureClients();
    if (view === "projects") state.clients = await fetchAllClients();
    if (view === "templates") await ensureTemplates();
    if (view === "audit") await ensureAudit();
    renderView();
    requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, 0)));
  } catch (error) {
    if (error.status === 401 || error.status === 403 && !state.identity) {
      showLogin("Tu sesión terminó. Vuelve a entrar.");
      return;
    }
    renderError(error.message);
  }
}

function setViewChrome() {
  const [eyebrow, title, subtitle] = viewMeta[state.view];
  document.querySelector("#viewEyebrow").textContent = eyebrow;
  document.querySelector("#viewTitle").textContent = title;
  document.querySelector("#viewSubtitle").textContent = subtitle;
  document.querySelectorAll("#mainNav button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.view);
  });
}

function renderLoading() {
  document.querySelector("#viewContent").innerHTML = '<div class="surface loading-state"><div class="spinner" aria-label="Cargando"></div></div>';
}

function renderError(message) {
  document.querySelector("#viewContent").innerHTML = `<div class="surface error-state"><div><div class="empty-icon">${icon("alert")}</div><h3>No pudimos cargar esta vista</h3><p>${escapeHtml(message)}</p><button class="primary-button" data-retry type="button">Reintentar</button></div></div>`;
}

function renderStats() {
  const stats = dashboardStats(state.clients, state.templates);
  const entries = [
    ["users", stats.clients, "Clientes cargados"],
    ["pages", stats.projects, "Proyectos"],
    ["store", stats.published, "Publicados"],
    ["layout", stats.disabledTemplates, "Plantillas pausadas"],
  ];
  document.querySelector("#statsBar").innerHTML = entries.map(([name, value, label]) => `
    <article class="stat"><div class="stat-icon">${icon(name)}</div><div><strong>${value}</strong><span>${label}</span></div></article>
  `).join("");
}

function renderView() {
  renderStats();
  if (state.view === "clients") renderClients();
  if (state.view === "projects") renderProjects();
  if (state.view === "templates") renderTemplates();
  if (state.view === "audit") renderAudit();
}

function templateFilterOptions() {
  const ids = [...new Set(state.clients.flatMap((client) => client.templateIds || []))].sort();
  return ids.map((id) => `<option value="${escapeHtml(id)}" ${state.clientFilters.templateId === id ? "selected" : ""}>${escapeHtml(id)}</option>`).join("");
}

function clientToolbar() {
  return `<form class="toolbar" id="clientFilterForm">
    <div class="search-field">${icon("search")}<input name="q" value="${escapeHtml(state.clientFilters.q)}" placeholder="Buscar email o negocio"></div>
    <select name="status" aria-label="Estado"><option value="">Todos los estados</option><option value="active">Activas</option><option value="unverified">Sin verificar</option><option value="suspended">Suspendidas</option><option value="no_projects">Sin proyectos</option></select>
    <select name="templateId" aria-label="Plantilla"><option value="">Todas las plantillas</option>${templateFilterOptions()}</select>
    <button class="primary-button filter-button" type="submit">Aplicar</button>
  </form>`;
}

function renderClients() {
  const rows = state.clients.map((client) => `<tr>
    <td data-label="Cliente"><div class="primary-cell"><span class="row-avatar">${escapeHtml((client.email || "K")[0].toUpperCase())}</span><div><strong>${escapeHtml(client.businessName || "Sin proyecto")}</strong><small>${escapeHtml(client.email)}</small></div></div></td>
    <td data-label="Estado">${statusBadge(client.accountStatus)}</td>
    <td data-label="Proyectos"><strong>${Number(client.projectCount || 0)}</strong></td>
    <td data-label="Plantilla">${client.templateIds?.[0] ? `<span class="template-tag">${escapeHtml(client.templateIds[0])}</span>` : "—"}</td>
    <td data-label="Registro">${formatDate(client.createdAt)}</td>
    <td data-label="Actividad">${formatDate(client.lastSignInAt)}</td>
  </tr>`).join("");
  document.querySelector("#viewContent").innerHTML = `<section class="surface">
    <header class="surface-header"><div><h2>Directorio de clientes</h2><p>Incluye cuentas que aún no han creado un proyecto.</p></div><span class="surface-count">${state.clients.length} cuentas</span></header>
    ${clientToolbar()}
    ${rows ? `<table class="data-table"><thead><tr><th>Cliente</th><th>Estado</th><th>Proyectos</th><th>Plantilla</th><th>Registro</th><th>Última actividad</th></tr></thead><tbody>${rows}</tbody></table>` : emptyMarkup("users", "No hay clientes para estos filtros", "Prueba otra búsqueda o elimina los filtros activos.")}
  </section>`;
  const form = document.querySelector("#clientFilterForm");
  form.elements.status.value = state.clientFilters.status;
}

function renderProjects() {
  const capabilities = adminCapabilities(state.identity);
  const projects = flattenClientProjects(state.clients);
  const rows = projects.map((project) => {
    const url = publicUrl(project.publicUrl);
    return `<tr>
      <td data-label="Proyecto"><div class="primary-cell"><span class="row-avatar">${icon("pages")}</span><div><strong>${escapeHtml(project.businessName || "Proyecto sin nombre")}</strong><small>${escapeHtml(project.id)}</small></div></div></td>
      <td data-label="Cliente">${escapeHtml(project.ownerEmail)}</td>
      <td data-label="Plantilla"><span class="template-tag">${escapeHtml(project.templateName || project.templateId || "Sin plantilla")}</span></td>
      <td data-label="Estado">${statusBadge(project.status)}</td>
      <td data-label="Edición">${formatDate(project.updatedAt || project.createdAt)}</td>
      <td data-label="Acciones"><div class="action-group">${url ? `<a class="table-action" href="${escapeHtml(url)}" target="_blank" rel="noopener">Abrir</a>` : ""}${capabilities.canDeleteProjects ? `<button class="table-action danger" data-delete-project="${escapeHtml(project.id)}" type="button">Eliminar</button>` : ""}</div></td>
    </tr>`;
  }).join("");
  document.querySelector("#viewContent").innerHTML = `<section class="surface">
    <header class="surface-header"><div><h2>Proyectos de clientes</h2><p>${capabilities.canDeleteProjects ? "El borrado exige confirmar el nombre exacto." : "El equipo de soporte tiene acceso de solo lectura."}</p></div><span class="surface-count">${projects.length} proyectos</span></header>
    ${rows ? `<table class="data-table"><thead><tr><th>Proyecto</th><th>Cliente</th><th>Plantilla</th><th>Estado</th><th>Última edición</th><th></th></tr></thead><tbody>${rows}</tbody></table>` : emptyMarkup("pages", "Todavía no hay proyectos", "Los proyectos aparecerán aquí cuando un cliente genere su primer sitio.")}
  </section>`;
}

function renderTemplates() {
  const capabilities = adminCapabilities(state.identity);
  if (!capabilities.canReadTemplates) {
    document.querySelector("#viewContent").innerHTML = `<section class="surface locked-view"><div><div class="locked-icon">${icon("lock")}</div><h2>Vista reservada a super admins</h2><p>Soporte puede consultar clientes, proyectos y auditoría. Cambiar la disponibilidad de plantillas requiere acceso total.</p></div></section>`;
    return;
  }
  const cards = state.templates.map((template) => `<article class="template-card ${template.enabled ? "" : "disabled"}">
    <div class="template-card-header"><div><h3>${escapeHtml(template.name)}</h3><p>${escapeHtml(template.templateId)}</p></div>${statusBadge(template.enabled ? "active" : "suspended")}</div>
    <div class="template-meta"><span class="template-tag">${escapeHtml(template.websiteType)}</span><span class="template-tag">${escapeHtml(template.catalogType)}</span><span class="template-tag">${escapeHtml(template.designMaturity)}</span></div>
    <p>${escapeHtml(template.audience || "Audiencia general")}</p>
    <footer><small>${template.reason ? escapeHtml(template.reason) : "Sin override activo"}</small><label class="switch" title="${template.enabled ? "Desactivar" : "Activar"}"><input data-template-toggle="${escapeHtml(template.templateId)}" type="checkbox" ${template.enabled ? "checked" : ""}><span></span></label></footer>
  </article>`).join("");
  document.querySelector("#viewContent").innerHTML = `<section class="surface">
    <header class="surface-header"><div><h2>Disponibilidad de plantillas</h2><p>Los sitios existentes siguen funcionando aunque una plantilla se pause.</p></div><span class="surface-count">${state.templates.filter((item) => item.enabled).length} activas</span></header>
    <div class="template-grid">${cards}</div>
  </section>`;
}

function renderAudit() {
  const rows = state.audit.map((event) => `<article class="audit-row">
    <div class="audit-actor"><strong>${escapeHtml(event.actor?.email || event.actor?.id || "Sistema")}</strong><small>${escapeHtml(roleLabel(event.actor?.role))}</small></div>
    <div class="audit-action"><strong>${escapeHtml(actionLabel(event.action))}</strong><small>${escapeHtml(event.action)} · ${escapeHtml(event.target?.id)}</small></div>
    <div>${statusBadge(event.outcome)}</div>
    <time class="audit-time">${formatDate(event.createdAt, true)}</time>
  </article>`).join("");
  document.querySelector("#viewContent").innerHTML = `<section class="surface">
    <header class="surface-header"><div><h2>Registro administrativo</h2><p>Eventos append-only, ordenados del más reciente al más antiguo.</p></div><span class="surface-count">${state.auditPagination?.total || 0} eventos</span></header>
    <form class="toolbar audit-toolbar" id="auditFilterForm"><div class="search-field">${icon("search")}<input name="q" value="${escapeHtml(state.auditFilters.q)}" placeholder="Buscar actor, acción u objetivo"></div><select name="outcome" aria-label="Resultado"><option value="">Todos los resultados</option><option value="success">Correctos</option><option value="failure">Fallidos</option><option value="denied">Denegados</option></select><button class="primary-button filter-button" type="submit">Aplicar</button></form>
    ${rows ? `<div class="audit-list">${rows}</div>` : emptyMarkup("activity", "No hay eventos para estos filtros", "Las acciones administrativas aparecerán aquí.")}
  </section>`;
  document.querySelector("#auditFilterForm").elements.outcome.value = state.auditFilters.outcome;
}

function actionLabel(action) {
  const labels = {
    "admin.auth.session_started": "Inicio de sesión",
    "admin.auth.session_ended": "Cierre de sesión",
    "admin.clients.queried": "Consulta de clientes",
    "admin.project.deleted": "Proyecto eliminado",
    "admin.templates.queried": "Consulta de plantillas",
    "admin.template.enabled": "Plantilla activada",
    "admin.template.disabled": "Plantilla pausada",
    "admin.audit.queried": "Consulta de auditoría",
  };
  return labels[action] || action;
}

function emptyMarkup(iconName, title, description) {
  return `<div class="empty-state"><div><div class="empty-icon">${icon(iconName)}</div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p></div></div>`;
}

function openDeleteModal(project) {
  state.confirmAction = async (value) => {
    await api(`/api/admin/clients/${encodeURIComponent(project.id)}`, {
      method: "DELETE",
      body: JSON.stringify({ businessName: value }),
    });
    state.clients = state.clients.map((client) => ({
      ...client,
      projects: (client.projects || []).filter((item) => item.id !== project.id),
      projectCount: (client.projects || []).filter((item) => item.id !== project.id).length,
    }));
    closeModal();
    renderView();
    toast(`${project.businessName} fue eliminado.`);
  };
  showModal({
    iconName: "trash",
    title: "Eliminar proyecto",
    description: `Esta acción elimina “${project.businessName}”, sus sesiones y assets asociados. No se puede deshacer.`,
    label: `Escribe “${project.businessName}” para confirmar`,
    button: "Eliminar definitivamente",
    placeholder: project.businessName,
  });
}

function openTemplateModal(template, desiredEnabled, checkbox) {
  state.confirmAction = async (reason) => {
    const payload = templateUpdatePayload(desiredEnabled, reason);
    const body = await api(`/api/admin/templates/${encodeURIComponent(template.templateId)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    const updated = body.template;
    state.templates = state.templates.map((item) => item.templateId === updated.templateId ? updated : item);
    closeModal();
    renderView();
    toast(`${template.name} ahora está ${desiredEnabled ? "activa" : "pausada"}.`);
  };
  showModal({
    iconName: desiredEnabled ? "check" : "alert",
    title: desiredEnabled ? "Activar plantilla" : "Pausar plantilla",
    description: desiredEnabled
      ? `${template.name} volverá a ofrecerse en proyectos nuevos.`
      : `${template.name} dejará de ofrecerse en proyectos nuevos. Los sitios existentes no cambian.`,
    label: "Motivo del cambio",
    button: desiredEnabled ? "Activar plantilla" : "Pausar plantilla",
    placeholder: "Ej. revisión visual o control de calidad",
    onCancel: () => { checkbox.checked = template.enabled; },
  });
}

function showModal({ iconName, title, description, label, button, placeholder, onCancel = null }) {
  const modal = document.querySelector("#confirmModal");
  modal.dataset.cancelHandler = onCancel ? "custom" : "";
  modal._cancelHandler = onCancel;
  document.querySelector("#confirmIcon").innerHTML = icon(iconName);
  document.querySelector("#confirmTitle").textContent = title;
  document.querySelector("#confirmDescription").textContent = description;
  document.querySelector("#confirmInputLabel").textContent = label;
  document.querySelector("#acceptConfirmButton").textContent = button;
  document.querySelector("#confirmInput").value = "";
  document.querySelector("#confirmInput").placeholder = placeholder || "";
  document.querySelector("#confirmStatus").textContent = "";
  modal.classList.remove("hidden");
  setTimeout(() => document.querySelector("#confirmInput").focus(), 0);
}

function closeModal(runCancel = false) {
  const modal = document.querySelector("#confirmModal");
  if (runCancel && typeof modal._cancelHandler === "function") modal._cancelHandler();
  modal._cancelHandler = null;
  modal.classList.add("hidden");
  state.confirmAction = null;
}

function toast(message, error = false) {
  const node = document.createElement("div");
  node.className = `toast ${error ? "error" : ""}`;
  node.textContent = message;
  document.querySelector("#toastRegion").append(node);
  setTimeout(() => node.remove(), 4200);
}

document.querySelector("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = new FormData(event.currentTarget).get("email")?.toString().trim();
  setLoginStatus("Enviando enlace seguro…", true);
  try {
    await startEmailLogin(email);
    setLoginStatus(`Revisa ${email}. Te enviamos un enlace para entrar.`, true);
  } catch (error) {
    setLoginStatus(error.message);
  }
});

document.querySelector("#googleLoginButton").addEventListener("click", startGoogleLogin);
document.querySelector("#logoutButton").addEventListener("click", async () => {
  try { await api("/api/admin/auth/logout", { method: "POST" }); } finally { showLogin("Sesión cerrada."); }
});
document.querySelector("#refreshButton").addEventListener("click", () => loadView());
document.querySelector("#mainNav").addEventListener("click", (event) => {
  const button = event.target.closest("[data-view]");
  if (button) loadView(button.dataset.view);
});

document.querySelector("#viewContent").addEventListener("click", (event) => {
  if (event.target.closest("[data-retry]")) loadView();
  const deleteButton = event.target.closest("[data-delete-project]");
  if (deleteButton) {
    const project = flattenClientProjects(state.clients).find((item) => item.id === deleteButton.dataset.deleteProject);
    if (project) openDeleteModal(project);
  }
});

document.querySelector("#viewContent").addEventListener("change", (event) => {
  const toggle = event.target.closest("[data-template-toggle]");
  if (!toggle) return;
  const template = state.templates.find((item) => item.templateId === toggle.dataset.templateToggle);
  if (template) openTemplateModal(template, toggle.checked, toggle);
});

document.querySelector("#viewContent").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (event.target.id === "clientFilterForm") {
    const data = new FormData(event.target);
    state.clientFilters = {
      q: String(data.get("q") || "").trim(),
      status: String(data.get("status") || ""),
      templateId: String(data.get("templateId") || ""),
    };
    await loadView("clients");
  }
  if (event.target.id === "auditFilterForm") {
    const data = new FormData(event.target);
    state.auditFilters = {
      q: String(data.get("q") || "").trim(),
      outcome: String(data.get("outcome") || ""),
    };
    await loadView("audit");
  }
});

document.querySelector("#cancelConfirmButton").addEventListener("click", () => closeModal(true));
document.querySelector("#confirmModal").addEventListener("click", (event) => {
  if (event.target === event.currentTarget) closeModal(true);
});
document.querySelector("#acceptConfirmButton").addEventListener("click", async () => {
  if (!state.confirmAction) return;
  const button = document.querySelector("#acceptConfirmButton");
  const status = document.querySelector("#confirmStatus");
  button.disabled = true;
  status.textContent = "";
  try {
    await state.confirmAction(document.querySelector("#confirmInput").value);
  } catch (error) {
    status.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !document.querySelector("#confirmModal").classList.contains("hidden")) closeModal(true);
});

boot();
