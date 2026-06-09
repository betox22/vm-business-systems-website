const API_BASE_URL = resolveApiBaseUrl();
const publicSite = document.querySelector("#publicSite");
let currentPublicSite = null;

loadPublicSite();

async function loadPublicSite() {
  const params = new URLSearchParams(window.location.search);
  const siteId = params.get("site_id");
  const host = params.get("host") || window.location.hostname;

  try {
    const url = siteId
      ? `${API_BASE_URL}/public/sites/${encodeURIComponent(siteId)}`
      : `${API_BASE_URL}/public/resolve-site?host=${encodeURIComponent(host)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const site = await response.json();
    currentPublicSite = site;
    publicSite.innerHTML = renderWebsite({ ...site.schema, catalog_items: site.catalog_items || [] });
    bindPublicSiteActions();
  } catch (error) {
    publicSite.innerHTML = `<div class="public-empty">Could not load published site.</div>`;
  }
}

function resolveApiBaseUrl() {
  if (window.LUMA_API_BASE_URL) {
    return String(window.LUMA_API_BASE_URL).replace(/\/$/, "");
  }
  return "http://127.0.0.1:8010";
}

function renderWebsite(schema) {
  const page = schema.pages?.[0];
  const theme = schema.theme || {};
  const logo = schema.global_components?.logo_url;
  return `<div class="rendered-site" style="${themeVars(theme)}">
    <header class="rendered-nav sticky">
      <div>${logo ? `<img src="${escapeAttribute(logo)}" alt="${escapeAttribute(schema.business?.name)}">` : renderLogoMark(schema)}</div>
      <nav>${(schema.navigation || [])
        .map((item) => `<a href="#${escapeAttribute(item.page_key)}">${escapeHtml(item.label)}</a>`)
        .join("")}</nav>
    </header>
    ${(page?.sections || []).sort((a, b) => a.order - b.order).map((section) => renderSection(section, schema)).join("")}
    <footer class="rendered-footer">
      <strong>${escapeHtml(schema.business?.name || "")}</strong>
      <span>${escapeHtml(schema.global_components?.footer_text || "")}</span>
    </footer>
  </div>`;
}

function renderSection(section, schema) {
  if (section.type === "Hero") return renderHero(section, schema);
  if (["ProductGrid", "ServiceList"].includes(section.type)) return renderProductGrid(section, schema);
  if (["Contact", "Footer"].includes(section.type)) return renderContact(section, schema);
  return renderFeature(section);
}

function renderHero(section, schema) {
  const editable = section.editable || {};
  const image = editable.image_url || schema.catalog_items?.find((item) => item.is_featured && item.image_url)?.image_url || schema.catalog_items?.find((item) => item.image_url)?.image_url || "";
  return `<section class="rendered-hero hero-${escapeAttribute(slugify(section.settings?.layout || "image_right"))}">
    <div>
      <span class="rendered-kicker">${escapeHtml(schema.business?.industry || "")}</span>
      <h1>${escapeHtml(editable.headline || schema.business?.name || "")}</h1>
      <p>${escapeHtml(editable.subtitle || schema.business?.description || "")}</p>
      <div class="rendered-actions">
        <button class="rendered-button" data-open-lead type="button">${escapeHtml(editable.primary_button || schema.theme?.buttons?.primary_label || "Contact")}</button>
      </div>
    </div>
    <div class="rendered-visual">${image ? `<img src="${escapeAttribute(image)}" alt="">` : visualPlaceholder(schema)}</div>
  </section>`;
}

function renderProductGrid(section, schema) {
  const editable = section.editable || {};
  const columns = Math.max(2, Math.min(Number(section.settings?.columns || 3), 4));
  return `<section class="rendered-section">
    <div class="section-heading">
      <h2>${escapeHtml(editable.title || "Products and services")}</h2>
      ${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}
    </div>
    <div class="rendered-grid columns-${columns}">
      ${(schema.catalog_items || [])
        .filter((item) => item.is_active !== false)
        .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
        .map((item) => `<article class="rendered-card">
        ${item.image_url ? `<img src="${escapeAttribute(item.image_url)}" alt="${escapeAttribute(item.name)}">` : `<div class="card-placeholder">${escapeHtml((item.name || "").slice(0, 2))}</div>`}
        <div>
          <h3>${escapeHtml(item.name)}</h3>
          <p>${escapeHtml(item.description)}</p>
          <strong>${escapeHtml(item.price_label)}</strong>
          <br><button class="rendered-button" data-open-lead data-item-id="${escapeAttribute(item.id || "")}" data-item-name="${escapeAttribute(item.name)}" type="button">${escapeHtml(item.button_label || "Request info")}</button>
        </div>
      </article>`).join("")}
    </div>
  </section>`;
}

function renderFeature(section) {
  const editable = section.editable || {};
  return `<section class="rendered-section feature-band">
    <div class="section-heading">
      <h2>${escapeHtml(editable.title || editable.headline || section.type)}</h2>
      <p>${escapeHtml(editable.text || editable.subtitle || "")}</p>
    </div>
  </section>`;
}

function renderContact(section, schema) {
  const editable = section.editable || {};
  return `<section id="contact" class="rendered-section contact-panel">
    <div>
      <h2>${escapeHtml(editable.title || "Contact")}</h2>
      <p>${escapeHtml(editable.text || "Reach out for more information.")}</p>
    </div>
    <div class="contact-list">${Object.entries(schema.contact || {})
      .filter(([, value]) => value)
      .map(([key, value]) => `<p><strong>${escapeHtml(key)}</strong><span>${escapeHtml(value)}</span></p>`)
      .join("")}
      <button class="rendered-button" data-open-lead type="button">Send request</button>
    </div>
  </section>`;
}

function bindPublicSiteActions() {
  publicSite.querySelectorAll("[data-open-lead]").forEach((button) => {
    button.addEventListener("click", () => openLeadModal({
      catalogItemId: button.dataset.itemId || "",
      catalogItemName: button.dataset.itemName || "",
    }));
  });
}

function openLeadModal(context = {}) {
  const existing = document.querySelector(".lead-modal");
  if (existing) existing.remove();
  const businessName = currentPublicSite?.schema?.business?.name || "this business";
  const itemText = context.catalogItemName ? ` about ${context.catalogItemName}` : "";
  document.body.insertAdjacentHTML("beforeend", `<div class="lead-modal" role="dialog" aria-modal="true">
    <form class="lead-modal-card">
      <div>
        <strong>Contact ${escapeHtml(businessName)}</strong>
        <button data-close-lead type="button" aria-label="Close">×</button>
      </div>
      <p>Send a quick request${escapeHtml(itemText)}. The business will receive it in their admin panel.</p>
      <label>Name<input name="customerName" autocomplete="name" placeholder="Your name"></label>
      <label>Email<input name="email" type="email" autocomplete="email" placeholder="you@example.com"></label>
      <label>Phone<input name="phone" autocomplete="tel" placeholder="Phone or WhatsApp"></label>
      <label>Message<textarea name="message" rows="4" required>${context.catalogItemName ? `I am interested in ${context.catalogItemName}.` : ""}</textarea></label>
      <input name="catalogItemId" type="hidden" value="${escapeAttribute(context.catalogItemId || "")}">
      <input name="catalogItemName" type="hidden" value="${escapeAttribute(context.catalogItemName || "")}">
      <span class="lead-status"></span>
      <button class="rendered-button" type="submit">Send request</button>
    </form>
  </div>`);
  const modal = document.querySelector(".lead-modal");
  modal.querySelector("[data-close-lead]").addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.remove();
  });
  modal.querySelector("form").addEventListener("submit", submitLeadForm);
  modal.querySelector("input, textarea")?.focus();
}

async function submitLeadForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const status = form.querySelector(".lead-status");
  const data = new FormData(form);
  const message = data.get("message")?.toString().trim() || "";
  const customerName = data.get("customerName")?.toString().trim() || "";
  const email = data.get("email")?.toString().trim() || "";
  const phone = data.get("phone")?.toString().trim() || "";
  if (!message || (!customerName && !email && !phone)) {
    status.textContent = "Add a message and at least one contact detail.";
    return;
  }
  status.textContent = "Sending...";
  const response = await fetch(`${API_BASE_URL}/public/leads`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      siteId: currentPublicSite?.site_id,
      businessId: currentPublicSite?.business_id,
      customerName,
      email,
      phone,
      message,
      catalogItemId: data.get("catalogItemId")?.toString() || "",
      catalogItemName: data.get("catalogItemName")?.toString() || "",
    }),
  });
  if (!response.ok) {
    status.textContent = "Could not send. Please try again.";
    return;
  }
  status.textContent = "Sent. Thank you.";
  form.reset();
  setTimeout(() => document.querySelector(".lead-modal")?.remove(), 900);
}

function renderLogoMark(schema) {
  const name = schema.business?.name || "Site";
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("");
  return `<div class="logo-lockup"><span>${escapeHtml(initials)}</span><div><strong>${escapeHtml(name)}</strong><small>brand mark</small></div></div>`;
}

function visualPlaceholder(schema) {
  const name = schema.business?.name || "AI";
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("");
  return `<div class="visual-placeholder"><span>${escapeHtml(initials)}</span><small>${escapeHtml(schema.business?.industry || "Brand preview")}</small></div>`;
}

function themeVars(theme) {
  const colors = theme.colors || {};
  const fonts = theme.fonts || {};
  return [
    `--site-bg:${colors.background || "#F8FAF9"}`,
    `--site-surface:${colors.surface || "#FFFFFF"}`,
    `--site-primary:${colors.primary || "#0E7C66"}`,
    `--site-secondary:${colors.secondary || "#E3F3EE"}`,
    `--site-text:${colors.text || "#111827"}`,
    `--site-muted:${colors.muted || "#667085"}`,
    `--site-heading:${JSON.stringify(fonts.heading || "Inter")}`,
    `--site-body:${JSON.stringify(fonts.body || "Inter")}`,
  ].join(";");
}

function slugify(value) {
  return String(value || "default").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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
