import { CATALOG_ITEM_FIELDS, isCatalogSection, renderCatalogItems } from "./composed-catalog.js";

const composedSectionCache = new Map();
const pendingSectionLoads = new Map();

function sectionIds(schema) {
  return [...new Set((schema.pages || [])
    .flatMap((page) => page.sections || [])
    .filter((section) => section.type === "composed")
    .map((section) => section.section_id))];
}

export function hasUnloadedComposedSections(schema) {
  return sectionIds(schema).some((sectionId) => !composedSectionCache.has(sectionId));
}

async function loadComposedSection(sectionId) {
  if (composedSectionCache.has(sectionId)) return;
  if (pendingSectionLoads.has(sectionId)) return pendingSectionLoads.get(sectionId);
  if (typeof sectionId !== "string" || !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(sectionId)) {
    composedSectionCache.set(sectionId, null);
    return;
  }
  const loading = (async () => {
    const base = `/templates/sections/${sectionId}/`;
    try {
      const manifestResponse = await fetch(`${base}manifest.json`);
      if (!manifestResponse.ok) throw new Error(`Manifest ${manifestResponse.status}`);
      const manifest = await manifestResponse.json();
      if (manifest.id !== sectionId || manifest.section_type === "quote_upload"
        || manifest.html_partial !== `${sectionId}/section.html`
        || manifest.css_partial !== `${sectionId}/section.css`) throw new Error("Unsupported section manifest");
      const [htmlResponse, cssResponse] = await Promise.all([
        fetch(`/templates/sections/${manifest.html_partial}`),
        fetch(`/templates/sections/${manifest.css_partial}`),
      ]);
      if (!htmlResponse.ok || !cssResponse.ok) throw new Error("Section partial unavailable");
      const [html, css] = await Promise.all([htmlResponse.text(), cssResponse.text()]);
      if (isCatalogSection(sectionId)) {
        const collection = manifest.collection_bindings?.catalog_items;
        if (collection?.source !== "storefront_products"
          || JSON.stringify(collection.item_fields) !== JSON.stringify(CATALOG_ITEM_FIELDS)
          || manifest.image_slots?.length !== 0) throw new Error("Invalid catalog contract");
        if (!document.querySelector("style[data-composed-catalog]")) {
          const sharedResponse = await fetch("/templates/sections/shared-catalog.css");
          if (!sharedResponse.ok) throw new Error("Shared catalog CSS unavailable");
          const sharedStyle = document.createElement("style");
          sharedStyle.dataset.composedCatalog = "";
          sharedStyle.textContent = await sharedResponse.text();
          document.head.appendChild(sharedStyle);
        }
      }
      composedSectionCache.set(sectionId, { manifest, html });
      const style = document.createElement("style");
      style.dataset.composedSection = sectionId;
      style.textContent = `@scope ([data-composed-section="${sectionId}"]) {${css}}`;
      document.head.appendChild(style);
    } catch (error) {
      composedSectionCache.set(sectionId, null);
      console.warn(`Composed section unavailable: ${sectionId}`, error);
    }
  })();
  pendingSectionLoads.set(sectionId, loading);
  try {
    await loading;
  } finally {
    pendingSectionLoads.delete(sectionId);
  }
}

export async function preloadComposedSections(schema) {
  await Promise.all(sectionIds(schema).map(loadComposedSection));
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

const safePageKey = (value) => typeof value === "string" && /^[a-z0-9][a-z0-9_-]*$/i.test(value);
const safeLabel = (value) => typeof value === "string" && value.trim().length > 0 && value.length <= 160;

function renderHeaderControls(bindings = {}, runtime = {}) {
  if (!bindings || typeof bindings !== "object" || Array.isArray(bindings)
    || Object.keys(bindings).some((key) => !["search", "cart", "account", "departments", "primary_action"].includes(key))) return null;
  const search = bindings.search;
  const cart = bindings.cart;
  const account = bindings.account;
  const departments = bindings.departments;
  const primary = bindings.primary_action;
  if ((search && !safeLabel(search.label)) || (cart && !safeLabel(cart.label))
    || (account && (!safeLabel(account.label) || !["modal", "page"].includes(account.action)
      || (account.action === "page" && !safePageKey(account.page_key))))
    || (primary && (!safeLabel(primary.label) || !safePageKey(primary.page_key)))
    || (departments && (!safeLabel(departments.label) || !Array.isArray(departments.items)
      || departments.items.length > 20 || departments.items.some((item) => !safeLabel(item?.label)
        || !safeLabel(item?.category))))) return null;
  if (!Object.keys(bindings).length) return "";
  const icons = {
    search: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    cart: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8h12l1 13H5L6 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></svg>',
  };
  const departmentButtons = departments?.items.map((item) => `<button type="button" data-catalog-category="${escapeAttribute(item.category.toLowerCase())}">${escapeHtml(item.label)}</button>`).join("") || "";
  const count = Number.isSafeInteger(runtime.cartCount) && runtime.cartCount >= 0 ? runtime.cartCount : 0;
  return `<div class="composed-site-header__controls">
    ${departments?.items.length ? `<nav class="composed-site-header__departments" aria-label="${escapeAttribute(departments.label)}">${departmentButtons}</nav>` : ""}
    ${search ? `<form class="composed-site-header__search" data-catalog-search-form><label><span class="sr-only">${escapeHtml(search.label)}</span><input type="search" name="catalog-search" placeholder="${escapeAttribute(search.label)}" aria-label="${escapeAttribute(search.label)}"></label><button type="submit" aria-label="${escapeAttribute(search.label)}">${icons.search}</button></form>` : ""}
    ${account ? account.action === "modal" ? `<button class="composed-site-header__account" type="button" data-account-open>${escapeHtml(account.label)}</button>` : `<a class="composed-site-header__account" href="#${escapeAttribute(account.page_key)}" data-page-link="${escapeAttribute(account.page_key)}">${escapeHtml(account.label)}</a>` : ""}
    ${cart ? `<button class="composed-site-header__cart" type="button" data-cart-open aria-label="${escapeAttribute(cart.label)}">${icons.cart}<span>${escapeHtml(cart.label)}</span><span data-cart-count aria-live="polite">${count}</span></button>` : ""}
    ${primary ? `<button class="composed-site-header__primary" type="button" data-page-link="${escapeAttribute(primary.page_key)}">${escapeHtml(primary.label)}</button>` : ""}
    ${departments?.items.length ? `<details class="composed-site-header__mobile-departments"><summary>${escapeHtml(departments.label)}</summary><div>${departmentButtons}</div></details>` : ""}
  </div>`;
}

function renderFooterExtras(bindings = {}) {
  if (!bindings || typeof bindings !== "object" || Array.isArray(bindings)
    || Object.keys(bindings).some((key) => !["newsletter", "social_links", "help_links"].includes(key))) return null;
  const newsletter = bindings.newsletter;
  const socials = bindings.social_links || [];
  const help = bindings.help_links || [];
  if ((newsletter && (![newsletter.title, newsletter.text, newsletter.button_label].every(safeLabel)))
    || !Array.isArray(socials) || socials.length > 10
    || socials.some((item) => !safeLabel(item?.label) || typeof item.url !== "string"
      || !/^https:\/\/[^\s<>"']+$/i.test(item.url))
    || !Array.isArray(help) || help.length > 20
    || help.some((item) => !safeLabel(item?.label) || !safePageKey(item?.page_key))) return null;
  if (!newsletter && !socials.length && !help.length) return "";
  return `<div class="composed-site-footer__extras">
    ${help.length ? `<div class="composed-site-footer__links">${help.map((item) => `<a href="#${escapeAttribute(item.page_key)}" data-page-link="${escapeAttribute(item.page_key)}">${escapeHtml(item.label)}</a>`).join("")}</div>` : ""}
    ${socials.length ? `<div class="composed-site-footer__links">${socials.map((item) => `<a href="${escapeAttribute(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.label)}</a>`).join("")}</div>` : ""}
    ${newsletter ? `<div class="composed-site-footer__newsletter"><strong>${escapeHtml(newsletter.title)}</strong><p>${escapeHtml(newsletter.text)}</p><label><span class="sr-only">Email</span><input type="email" placeholder="email@example.com"></label><button type="button" data-open-lead>${escapeHtml(newsletter.button_label)}</button></div>` : ""}
  </div>`;
}

export function renderComposedSection(section, runtime = {}) {
  const sectionId = section.section_id;
  const cached = composedSectionCache.get(sectionId);
  if (!cached) return "";
  const copy = section.copy_bindings || {};
  const images = section.image_bindings || {};
  const required = cached.manifest.required_copy_fields || [];
  if (required.some((field) => typeof copy[field] !== "string")) return "";
  const collections = cached.manifest.collection_bindings || {};
  const renderedCollections = {};
  for (const [field, contract] of Object.entries(collections)) {
    if (field === "catalog_items" && isCatalogSection(sectionId)) {
      renderedCollections[field] = renderCatalogItems(sectionId, runtime.catalogProducts, copy, runtime);
      if (renderedCollections[field] === null) return "";
      continue;
    }
    const items = section.list_bindings?.[field];
    if (!Array.isArray(items) || items.length < contract.min || items.length > contract.max
      || contract.item_fields?.join(",") !== "label,page_key"
      || items.some((item) => !item || typeof item.label !== "string" || !item.label.trim()
        || typeof item.page_key !== "string" || !/^[a-z0-9][a-z0-9_-]*$/i.test(item.page_key))) return "";
    renderedCollections[field] = items.map((item) => `<a href="#${escapeAttribute(item.page_key)}" data-page-link="${escapeAttribute(item.page_key)}">${escapeHtml(item.label)}</a>`).join("");
  }
  if (cached.manifest.control_slots?.brand_mark) {
    const logo = section.image_bindings?.brand_logo;
    if (logo && (typeof logo !== "string" || !/^(https?:\/\/|\/[^/]|data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/]+=*$)/i.test(logo))) return "";
    renderedCollections.brand_mark = logo ? `<img src="${escapeAttribute(logo)}" alt="" loading="eager">` : "";
  }
  if (cached.manifest.control_slots?.header_controls) {
    renderedCollections.header_controls = renderHeaderControls(section.control_bindings || {}, runtime);
  }
  if (cached.manifest.control_slots?.footer_extras) {
    renderedCollections.footer_extras = renderFooterExtras(section.control_bindings || {});
  }
  if (Object.values(renderedCollections).some((value) => value === null)) return "";
  if (isComposedShellSection(section) && !/^[a-z0-9][a-z0-9_-]*$/i.test(copy.home_page_key || "")) return "";
  const imageSlots = new Set((cached.manifest.image_slots || []).map((slot) => slot.slot_id));
  let invalid = false;
  const html = cached.html.replace(/\{\{([^{}]+)\}\}/g, (_, field) => {
    if (Object.hasOwn(renderedCollections, field)) return renderedCollections[field];
    if (imageSlots.has(field)) {
      const url = images[field];
      if (typeof url !== "string" || !/^(https?:\/\/|\/[^/])/i.test(url)) {
        invalid = true;
        return "";
      }
      return escapeAttribute(url);
    }
    if (typeof copy[field] !== "string") {
      invalid = true;
      return "";
    }
    return escapeHtml(copy[field]);
  });
  if (invalid) return "";
  const template = document.createElement("template");
  template.innerHTML = html;
  template.content.querySelectorAll("script, iframe, object, embed").forEach((node) => node.remove());
  template.content.querySelectorAll("*").forEach((node) => {
    for (const attribute of [...node.attributes]) {
      if (/^on/i.test(attribute.name) || (["href", "src", "action"].includes(attribute.name)
        && /^\s*(?:javascript:|data:)/i.test(attribute.value))) node.removeAttribute(attribute.name);
    }
  });
  return `<div data-composed-section="${escapeAttribute(sectionId)}">${template.innerHTML}</div>`;
}

export function isComposedShellSection(section) {
  return section.type === "composed" && ["shared--header", "shared--footer"].includes(section.section_id);
}

export function renderComposedShell(schema, sectionId, runtime = {}) {
  const home = schema.pages?.find((page) => page.page_key === "home") || schema.pages?.[0];
  const section = home?.sections?.find((item) => item.type === "composed" && item.section_id === sectionId);
  if (!section) return null;
  if (sectionId !== "shared--header" || !section.control_bindings?.departments) {
    return renderComposedSection(section, runtime) || null;
  }
  const liveCategories = [...new Map((schema.catalog_items || [])
    .filter((item) => item && item.is_active !== false && typeof item.category === "string" && item.category.trim())
    .map((item) => [item.category.trim().toLowerCase(), item.category.trim()])).values()].slice(0, 5);
  if (!liveCategories.length) return renderComposedSection(section, runtime) || null;
  const configured = Array.isArray(section.control_bindings.departments.items)
    ? section.control_bindings.departments.items : [];
  const departments = { ...section.control_bindings.departments, items: liveCategories.map((category) => ({
    label: configured.find((item) => typeof item?.category === "string"
      && item.category.toLowerCase() === category.toLowerCase())?.label || category,
    category,
  })) };
  return renderComposedSection({ ...section, control_bindings: {
    ...section.control_bindings, departments,
  } }, runtime) || null;
}
