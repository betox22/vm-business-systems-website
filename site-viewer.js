import { createSharedCommerceCart } from "./shared-commerce-cart.js?v=1";

const API_BASE_URL = resolveApiBaseUrl();
const publicSite = document.querySelector("#publicSite");
const viewerParams = new URLSearchParams(window.location.search);
const isProjectCardPreview = viewerParams.get("embed") === "project-card";
let currentPublicSite = null;
let currentPublicSchema = null;
let currentPublicPageKey = "home";
let sharedCart = null;

loadPublicSite();

async function loadPublicSite() {
  const siteId = viewerParams.get("site_id");
  const host = viewerParams.get("host") || window.location.hostname;

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
    currentPublicSchema = { ...site.schema, catalog_items: site.catalog_items || [] };
    sharedCart = createSharedCommerceCart({
      businessId: site.business_id,
      siteId: site.site_id,
      getLabels: () => commerceLabels(currentPublicSite?.schema),
      onCheckout: ({ summary }) => openLeadModal({ catalogItemName: summary || commerceLabels(currentPublicSite?.schema).cart }),
    });
    currentPublicPageKey = window.location.hash.replace(/^#/, "") || currentPublicSchema.pages?.[0]?.page_key || "home";
    applyGeneratedFavicon(site.schema);
    renderCurrentPublicPage();
    notifyProjectCardPreview("ready");
  } catch (error) {
    console.error("Could not load public site preview", { siteId, error });
    notifyProjectCardPreview("error");
    publicSite.innerHTML = isProjectCardPreview
      ? `<div class="public-empty">Your draft is safely stored in KREATON.</div>`
      : `<div class="public-empty">Could not load published site.</div>`;
  }
}

function notifyProjectCardPreview(status) {
  if (!isProjectCardPreview || window.parent === window) return;
  window.parent.postMessage({ type: "kreaton:project-preview", status }, "*");
}

function renderCurrentPublicPage() {
  if (!currentPublicSchema) return;
  publicSite.innerHTML = renderWebsite(currentPublicSchema, currentPublicPageKey);
  bindPublicSiteActions();
}

function applyGeneratedFavicon(schema) {
  const favicon = schema?.global_components?.favicon_url || schema?.brand?.logoUrl || "";
  if (!favicon) return;
  let link = document.querySelector("link[data-generated-favicon]");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    link.dataset.generatedFavicon = "true";
    document.head.appendChild(link);
  }
  link.href = favicon;
}

function resolveApiBaseUrl() {
  if (window.LUMA_API_BASE_URL) {
    return String(window.LUMA_API_BASE_URL).replace(/\/$/, "");
  }
  return "http://127.0.0.1:8010";
}

function renderWebsite(schema, pageKey = "home") {
  const page = schema.pages?.find((item) => item.page_key === pageKey) || schema.pages?.[0];
  const theme = schema.theme || {};
  const logo = schema.brand?.logoUrl || schema.global_components?.logo_url;
  const layoutId = schema.layout_mode?.id || "standard";
  const templateId = schema.active_template?.id || schema.selected_template?.id || "standard";
  if (templateId === "mega-retail-store") {
    return renderMegaRetailPublicWebsite(schema, page, { logo, layoutId, templateId, theme });
  }
  if (templateId === "b2b-saas-enterprise-pro") {
    return renderB2BSaasPublicWebsite(schema, page, { logo, layoutId, templateId, theme });
  }
  const commerceActions = isCommerceSite(schema) ? renderCommerceNavActions(schema) : "";
  return `<div class="rendered-site layout-${escapeAttribute(slugify(layoutId))} template-${escapeAttribute(slugify(templateId))}" style="${themeVars(theme, schema.brand)}">
    <header class="rendered-nav sticky">
      <div class="rendered-nav-brand">${logo ? `<img src="${escapeAttribute(logo)}" alt="${escapeAttribute(schema.business?.name)}">` : renderLogoMark(schema)}</div>
      <nav>${(schema.navigation || [])
        .map((item) => `<a class="${item.page_key === page?.page_key ? "active" : ""}" href="#${escapeAttribute(item.page_key)}" data-page-link="${escapeAttribute(item.page_key)}">${escapeHtml(item.label)}</a>`)
        .join("")}</nav>
      ${commerceActions}
    </header>
    ${(page?.sections || []).sort((a, b) => a.order - b.order).map((section) => renderSection(section, schema)).join("")}
    <footer class="rendered-footer">
      <div>${logo ? `<img src="${escapeAttribute(logo)}" alt="${escapeAttribute(schema.business?.name || "")}">` : renderLogoMark(schema)}</div>
      <span>${escapeHtml(schema.global_components?.footer_text || "")}</span>
    </footer>
  </div>`;
}

function renderB2BSaasPublicWebsite(schema, page, { logo, layoutId, templateId, theme }) {
  const pages = [...(schema.pages || [])].sort((a, b) => a.order - b.order);
  const sections = [...(page?.sections || [])].sort((a, b) => a.order - b.order);
  const labels = b2bSaasPublicLabels(schema);
  const plans = b2bSaasPublicSubscriptionPlans(schema);
  const items = publicCatalogItems(schema);
  const isHome = page?.page_key === "home" || page === pages[0];
  const absorbed = new Set(["EnterpriseHero", "EnterpriseSolutions", "EnterpriseUseCases", "EnterpriseIntegrations", "EnterpriseProof", "EnterprisePricing", "EnterpriseDemo"]);
  const remaining = isHome ? sections.filter((section) => !absorbed.has(section.type)) : sections;
  const hero = sections.find((section) => section.type === "EnterpriseHero") || sections.find((section) => /Hero$/.test(section.type)) || {};
  const themeBrand = { ...(schema.brand || {}), colors: { ...(schema.brand?.colors || {}), ...(theme.colors || {}) }, fontPairing: theme.fonts || schema.brand?.fontPairing };
  return `<div class="rendered-site layout-${escapeAttribute(slugify(layoutId))} template-${escapeAttribute(slugify(templateId))}" style="${themeVars(theme, themeBrand)}">
    ${renderB2BSaasPublicHeader(schema, page, pages, logo, labels, plans)}
    ${isHome ? `${renderB2BSaasPublicHero(schema, hero, pages, items, labels, plans)}${renderB2BSaasPublicLogoRow(labels)}${renderB2BSaasPublicFeatures(schema, sections, items, labels)}${renderB2BSaasPublicPricing(plans, labels)}` : ""}
    ${remaining.map((section) => renderSection(section, schema)).join("")}
    <footer class="b2b-saas-footer"><div>${renderB2BSaasPublicBrand(schema, logo)}</div><span>${escapeHtml(schema.global_components?.footer_text || `© ${new Date().getFullYear()} ${schema.business?.name || ""}`)}</span></footer>
  </div>`;
}

function renderB2BSaasPublicHeader(schema, page, pages, logo, labels, plans) {
  const navigation = b2bSaasPublicNavigationPages(pages);
  const loginPage = b2bSaasPublicFindPage(pages, /(?:^|\b)(?:login|sign[ -]?in|account|cuenta|ingresar)(?:\b|$)/i);
  const contactPage = b2bSaasPublicFindPage(pages, /contact|demo|consulta/i);
  const pricingPage = navigation.find((item) => item.key === "pricing")?.page;
  const startPage = (plans.length ? pricingPage : null) || contactPage || navigation[0]?.page || pages[0];
  return `<header class="b2b-saas-header"><a class="b2b-saas-brand" href="#${escapeAttribute(pages[0]?.page_key || "home")}" data-page-link="${escapeAttribute(pages[0]?.page_key || "home")}">${renderB2BSaasPublicBrand(schema, logo)}</a><nav aria-label="${escapeAttribute(labels.navigation)}">${navigation.map(({ key, page: target }) => `<a class="${target.page_key === page?.page_key ? "active" : ""}" href="#${escapeAttribute(target.page_key)}" data-page-link="${escapeAttribute(target.page_key)}">${escapeHtml(labels.nav[key])}</a>`).join("")}</nav><div class="b2b-saas-header-actions">${loginPage ? `<a class="b2b-saas-login" href="#${escapeAttribute(loginPage.page_key)}" data-page-link="${escapeAttribute(loginPage.page_key)}">${escapeHtml(labels.login)}</a>` : ""}<button class="b2b-saas-start" type="button" data-page-link="${escapeAttribute(startPage?.page_key || "")}">${escapeHtml(labels.start)}</button></div></header>`;
}

function renderB2BSaasPublicBrand(schema, logo) {
  const name = schema.business?.name || "Business";
  if (logo) return `<img src="${escapeAttribute(logo)}" alt="${escapeAttribute(name)}"><strong>${escapeHtml(name)}</strong>`;
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  return `<span class="b2b-saas-monogram" aria-hidden="true">${escapeHtml(initials || "B")}</span><strong>${escapeHtml(name)}</strong>`;
}

function renderB2BSaasPublicHero(schema, section, pages, items, labels, plans) {
  const editable = section.editable || {};
  const [lead, highlight] = b2bSaasPublicHeadlineParts(editable.headline || schema.business?.name || "");
  const navigation = b2bSaasPublicNavigationPages(pages);
  const contactPage = b2bSaasPublicFindPage(pages, /contact|demo|consulta/i);
  const primaryPage = (plans.length ? navigation.find((item) => item.key === "pricing")?.page : null) || contactPage || navigation[0]?.page || pages[0];
  const secondaryPage = navigation.find((item) => item.key === "product")?.page || contactPage || pages[0];
  return `<main class="b2b-saas-hero"><div class="b2b-saas-hero-copy"><span class="b2b-saas-eyebrow">${escapeHtml(editable.badge || labels.eyebrow)}</span><h1>${escapeHtml(lead)}${highlight ? ` <span>${escapeHtml(highlight)}</span>` : ""}</h1><p>${escapeHtml(editable.subtitle || schema.business?.description || "")}</p><div class="b2b-saas-hero-actions"><button class="b2b-saas-primary" type="button" data-page-link="${escapeAttribute(primaryPage?.page_key || "")}">${escapeHtml(editable.primary_button || labels.start)}</button><button class="b2b-saas-secondary" type="button" data-page-link="${escapeAttribute(secondaryPage?.page_key || "")}">${escapeHtml(editable.secondary_button || labels.demo)}</button></div></div>${renderB2BSaasPublicDashboard(schema, items, labels)}</main>`;
}

function renderB2BSaasPublicDashboard(schema, items, labels) {
  const pages = schema.pages || [];
  const sectionCount = pages.reduce((total, item) => total + (item.sections || []).length, 0);
  const sidebar = [...items.map((item) => item.name), ...pages.map((item) => item.title || item.page_key)].filter(Boolean).slice(0, 5);
  const metrics = [[labels.metrics.solutions, items.length], [labels.metrics.pages, pages.length], [labels.metrics.workflows, sectionCount]];
  return `<div class="b2b-saas-dashboard" aria-label="${escapeAttribute(labels.dashboard)}"><div class="b2b-saas-dashboard-bar"><span></span><span></span><span></span><strong>${escapeHtml(schema.business?.name || labels.dashboard)}</strong></div><div class="b2b-saas-dashboard-body"><aside>${sidebar.map((item, index) => `<span class="${index === 0 ? "active" : ""}">${b2bSaasPublicIcon(index)}${escapeHtml(item)}</span>`).join("")}</aside><div class="b2b-saas-metrics">${metrics.map(([label, value], index) => `<article><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong><div class="b2b-saas-mini-chart chart-${index + 1}" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div></article>`).join("")}</div></div></div>`;
}

function renderB2BSaasPublicLogoRow(labels) {
  return `<section class="b2b-saas-logo-row" aria-label="${escapeAttribute(labels.exampleLogos)}"><span>${escapeHtml(labels.teams)}</span><div><strong>Northstar</strong><strong>Vertex</strong><strong>Meridian</strong><strong>Atlas</strong><strong>Aperture</strong></div></section>`;
}

function renderB2BSaasPublicFeatures(schema, sections, items, labels) {
  const features = items.slice(0, 3).map((item) => ({ title: item.name, description: item.description }));
  ["EnterpriseSolutions", "EnterpriseUseCases", "EnterpriseIntegrations"].map((type) => sections.find((section) => section.type === type)?.editable || {}).filter((item) => item.title || item.text).forEach((item) => {
    if (features.length < 3) features.push({ title: item.title, description: item.text });
  });
  if (!features.length && schema.business?.description) features.push({ title: schema.business?.name || labels.product, description: schema.business.description });
  return `<section class="b2b-saas-features"><div class="b2b-saas-section-heading"><span>${escapeHtml(labels.product)}</span><h2>${escapeHtml(labels.featuresTitle)}</h2></div><div>${features.map((feature, index) => `<article><span>${b2bSaasPublicIcon(index)}</span><h3>${escapeHtml(feature.title || schema.business?.name || "")}</h3><p>${escapeHtml(feature.description || schema.business?.description || "")}</p></article>`).join("")}</div></section>`;
}

function renderB2BSaasPublicPricing(plans, labels) {
  if (plans.length !== 3) return "";
  return `<section class="b2b-saas-pricing" id="pricing"><div class="b2b-saas-section-heading"><span>${escapeHtml(labels.pricing)}</span><h2>${escapeHtml(labels.pricingTitle)}</h2></div><div class="b2b-saas-plans">${plans.map((plan, index) => `<article class="${index === 1 ? "featured" : ""}">${index === 1 ? `<span class="b2b-saas-plan-badge">${escapeHtml(labels.popular)}</span>` : ""}<small>${escapeHtml(plan.category || labels.plan)}</small><h3>${escapeHtml(plan.name || "")}</h3><strong>${escapeHtml(plan.price_label || plan.price || "")}</strong>${plan.description ? `<p>${escapeHtml(plan.description)}</p>` : ""}<button type="button" data-open-lead data-item-id="${escapeAttribute(plan.id || "")}" data-item-name="${escapeAttribute(plan.name || "")}">${escapeHtml(plan.button_label || labels.choose)}</button></article>`).join("")}</div></section>`;
}

function b2bSaasPublicNavigationPages(pages = []) {
  const targets = [{ key: "product", re: /product|producto|catalog|solution|soluci/i }, { key: "pricing", re: /pricing|price|precio|\bplan/i }, { key: "customers", re: /customer|client|cliente|\bcase|casos?/i }, { key: "docs", re: /\bdocs?\b|document|resources?|recursos?/i }];
  const used = new Set();
  return targets.map((target) => {
    const page = pages.find((item) => !used.has(item.page_key) && target.re.test(`${item.page_key || ""} ${item.title || ""} ${item.slug || ""}`));
    if (!page) return null;
    used.add(page.page_key);
    return { key: target.key, page };
  }).filter(Boolean);
}

function b2bSaasPublicSubscriptionPlans(schema = {}) {
  const recurring = /^(?:recurring|subscription|monthly|annual|yearly|month|year|mensual|anual|mes|ano)$/i;
  const label = /(?:\/\s*(?:mo|month|mes|yr|year|ano)|\b(?:per month|per year|monthly|annual|yearly|mensual|anual|cada mes|cada ano)\b)/i;
  const plans = publicCatalogItems(schema).filter((item) => {
    const price = Number(item.price_amount ?? item.price);
    const structured = [item.price_type, item.billing_interval, item.billing_period, item.interval, item.cadence].some((value) => recurring.test(String(value || "")));
    return Number.isFinite(price) && price > 0 && (item.recurring === true || item.subscription === true || structured || label.test(String(item.price_label || "")));
  });
  return plans.length >= 3 ? plans.slice(0, 3) : [];
}

function b2bSaasPublicFindPage(pages, pattern) {
  return pages.find((page) => pattern.test(`${page.page_key || ""} ${page.title || ""} ${page.slug || ""}`));
}

function b2bSaasPublicHeadlineParts(value) {
  const words = String(value || "").trim().split(/\s+/).filter(Boolean);
  if (words.length < 4) return [words.slice(0, -1).join(" "), words.at(-1) || ""];
  const size = Math.min(3, Math.max(2, Math.round(words.length * 0.35)));
  return [words.slice(0, -size).join(" "), words.slice(-size).join(" ")];
}

function b2bSaasPublicIcon(index) {
  const paths = ['<path d="M4 12h16M12 4v16"></path><circle cx="12" cy="12" r="8"></circle>', '<path d="M4 18V8l8-4 8 4v10"></path><path d="M8 18v-5h8v5"></path>', '<path d="M5 19V9m7 10V5m7 14v-8"></path>'];
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[index % paths.length]}</svg>`;
}

function b2bSaasPublicLabels(schema = {}) {
  const language = schema.business?.selectedLanguage || schema.business?.selected_language || "en";
  const all = {
    en: { navigation: "Main navigation", nav: { product: "Product", pricing: "Pricing", customers: "Customers", docs: "Docs" }, login: "Sign in", start: "Start free", demo: "View demo", eyebrow: "Built for modern teams", dashboard: "Product dashboard", teams: "Designed for teams moving work forward", exampleLogos: "Example customer names", product: "Product", featuresTitle: "A clearer way to run the work that matters", pricing: "Pricing", pricingTitle: "Simple plans, without surprises", popular: "Most popular", plan: "Plan", choose: "Choose plan", metrics: { solutions: "Solutions", pages: "Pages", workflows: "Workflows" } },
    es: { navigation: "Navegación principal", nav: { product: "Producto", pricing: "Precios", customers: "Clientes", docs: "Docs" }, login: "Iniciar sesión", start: "Empezar gratis", demo: "Ver demo", eyebrow: "Creado para equipos modernos", dashboard: "Panel del producto", teams: "Diseñado para equipos que hacen avanzar el trabajo", exampleLogos: "Nombres de clientes de ejemplo", product: "Producto", featuresTitle: "Una forma más clara de gestionar el trabajo importante", pricing: "Precios", pricingTitle: "Planes simples, sin sorpresas", popular: "Más popular", plan: "Plan", choose: "Elegir plan", metrics: { solutions: "Soluciones", pages: "Páginas", workflows: "Flujos" } },
    fr: { navigation: "Navigation principale", nav: { product: "Produit", pricing: "Tarifs", customers: "Clients", docs: "Docs" }, login: "Se connecter", start: "Commencer", demo: "Voir la démo", eyebrow: "Conçu pour les équipes modernes", dashboard: "Tableau de bord", teams: "Conçu pour les équipes qui avancent", exampleLogos: "Exemples de noms clients", product: "Produit", featuresTitle: "Une manière plus claire de gérer le travail essentiel", pricing: "Tarifs", pricingTitle: "Des offres simples, sans surprise", popular: "Le plus populaire", plan: "Offre", choose: "Choisir", metrics: { solutions: "Solutions", pages: "Pages", workflows: "Flux" } },
    pt: { navigation: "Navegação principal", nav: { product: "Produto", pricing: "Preços", customers: "Clientes", docs: "Docs" }, login: "Entrar", start: "Começar grátis", demo: "Ver demo", eyebrow: "Criado para equipes modernas", dashboard: "Painel do produto", teams: "Criado para equipes que fazem o trabalho avançar", exampleLogos: "Nomes de clientes de exemplo", product: "Produto", featuresTitle: "Uma forma mais clara de gerir o trabalho importante", pricing: "Preços", pricingTitle: "Planos simples, sem surpresas", popular: "Mais popular", plan: "Plano", choose: "Escolher plano", metrics: { solutions: "Soluções", pages: "Páginas", workflows: "Fluxos" } },
  };
  return all[language] || all.en;
}

function renderMegaRetailPublicWebsite(schema, page, { logo, layoutId, templateId, theme }) {
  const pages = [...(schema.pages || [])].sort((a, b) => a.order - b.order);
  const sections = [...(page?.sections || [])].sort((a, b) => a.order - b.order);
  const items = publicCatalogItems(schema);
  const categories = marketplaceCategories(schema).slice(0, 5);
  const labels = megaRetailPublicLabels(schema);
  const hero = sections.find((section) => ["MarketplaceHero", "Hero"].includes(section.type)) || {};
  const clientPhotos = Array.isArray(schema.client_media?.photoUrls) ? schema.client_media.photoUrls.filter(Boolean) : [];
  const provenance = schema.brand?.colorProvenance || schema.colorProvenance || {};
  const hasBrandVisual = Boolean(logo || provenance.anchorColor || schema.brand?.preferredColors?.length);
  const brandTint = /^#[0-9a-f]{6}$/i.test(String(provenance.anchorColor || "")) ? provenance.anchorColor : "var(--site-primary)";
  const whatsappUrl = megaRetailPublicWhatsAppUrl(schema.contact || {});
  const features = megaRetailPublicFeatureFlags(schema);
  const absorbedTypes = new Set(["MarketplaceHero", "Hero", "CategoryRail", "DealRow", "TrustStrip", "ProductGrid"]);
  const remainingSections = sections.filter((section) => !absorbedTypes.has(section.type));
  const isHome = page?.page_key === "home" || page === pages[0];

  return `<div class="rendered-site layout-${escapeAttribute(slugify(layoutId))} template-${escapeAttribute(slugify(templateId))}" style="${themeVars(theme, schema.brand)};--mega-tile-tint:${escapeAttribute(brandTint)}">
    ${renderMegaRetailPublicHeader(schema, logo, categories, labels)}
    ${isHome ? `${renderMegaRetailPublicBento(schema, hero.editable || {}, categories, items, clientPhotos, hasBrandVisual, labels)}${renderMegaRetailPublicDeals(schema, items, labels)}${renderMegaRetailPublicTrust(labels)}` : ""}
    ${remainingSections.map((section) => renderSection(section, schema)).join("")}
    ${renderMegaRetailPublicFooter(schema, pages, logo, labels, features)}
    ${features.whatsapp && whatsappUrl ? `<a class="mega-retail-whatsapp" href="${escapeAttribute(whatsappUrl)}" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">${megaRetailPublicIcon("whatsapp")}</a>` : ""}
  </div>`;
}

function renderMegaRetailPublicHeader(schema, logo, categories, labels) {
  const departmentButtons = categories.slice(0, 5).map((category) => `<button type="button" data-catalog-category="${escapeAttribute(String(category).toLowerCase())}">${escapeHtml(category)}</button>`).join("");
  return `<header class="mega-retail-header"><div class="mega-retail-brand">${logo ? `<img src="${escapeAttribute(logo)}" alt="${escapeAttribute(schema.business?.name || "")}">` : renderLogoMark(schema)}</div><nav class="mega-retail-departments" aria-label="${escapeAttribute(labels.departments)}">${departmentButtons}</nav><form class="mega-retail-search" data-catalog-search-form><input type="search" name="catalog-search" aria-label="${escapeAttribute(labels.search)}" placeholder="${escapeAttribute(labels.search)}"><button type="submit" aria-label="${escapeAttribute(labels.search)}">${megaRetailPublicIcon("search")}</button></form><div class="mega-retail-actions"><button type="button" data-account-open>${escapeHtml(labels.account)}</button><button class="mega-retail-icon-button" type="button" aria-label="${escapeAttribute(labels.favorites)}">${megaRetailPublicIcon("heart")}</button><button class="mega-retail-icon-button" type="button" data-cart-open aria-label="${escapeAttribute(labels.cart)}">${megaRetailPublicIcon("bag")}<span data-cart-count>${sharedCart?.count() || 0}</span></button></div><details class="mega-retail-mobile-departments"><summary>${megaRetailPublicIcon("grid")}<span>${escapeHtml(labels.departments)}</span><span class="mega-retail-menu-chevron" aria-hidden="true"></span></summary><div>${departmentButtons}</div></details></header>`;
}

function renderMegaRetailPublicBento(schema, heroCopy, categories, items, clientPhotos, hasBrandVisual, labels) {
  const tileCategories = categories.length ? categories : labels.fallbackCategories;
  return `<main class="mega-retail-bento">${Array.from({ length: 5 }, (_, index) => {
    const category = tileCategories[index % tileCategories.length];
    const item = items.find((entry) => String(entry.category || "").toLowerCase() === String(category).toLowerCase()) || items[index];
    const media = resolveMegaRetailPublicTileMedia({ clientPhotoUrls: clientPhotos, tileIndex: index, category, categoryImage: item?.image_url || item?.imageUrl, hasBrandVisual });
    const title = index === 0 ? (heroCopy.headline || schema.business?.name || labels.featured) : category;
    const detail = index === 0 ? (heroCopy.subtitle || schema.business?.description || labels.heroText) : (item?.description || labels.discover);
    return `<article class="mega-retail-tile ${index === 0 ? "is-primary" : index === 1 ? "is-medium" : "is-small"} ${media.duotone ? "is-duotone" : ""}" data-image-source="${escapeAttribute(media.source)}"><img src="${escapeAttribute(media.url)}" alt="${escapeAttribute(title)}"><div><span>${escapeHtml(index === 0 ? labels.featured : labels.department)}</span><h${index === 0 ? "1" : "2"}>${escapeHtml(title)}</h${index === 0 ? "1" : "2"}>${index < 2 ? `<p>${escapeHtml(detail)}</p>` : ""}<button type="button" data-catalog-category="${escapeAttribute(String(category || "").toLowerCase())}">${escapeHtml(labels.explore)} ${megaRetailPublicIcon("arrow")}</button></div></article>`;
  }).join("")}</main>`;
}

function renderMegaRetailPublicDeals(schema, items, labels) {
  const commerce = commerceLabels(schema);
  return `<section class="mega-retail-deals"><div class="mega-retail-section-heading"><div><span>${escapeHtml(labels.limited)}</span><h2>${escapeHtml(labels.deals)}</h2></div><button type="button" data-catalog-category="">${escapeHtml(labels.viewAll)} ${megaRetailPublicIcon("arrow")}</button></div><div class="mega-retail-deals-row">${items.slice(0, 10).map((item) => `<article class="mega-retail-product" ${catalogSearchAttributes(item)}><div class="mega-retail-product-image">${renderCatalogImage(item)}${megaRetailPublicDiscountBadge(item)}</div><small>${escapeHtml(item.category || labels.department)}</small><h3>${escapeHtml(item.name || "")}</h3><p>${escapeHtml(item.description || "")}</p><div><strong>${escapeHtml(item.price_label || labels.price)}</strong><button type="button" ${cartTriggerAttributes(item)}>${escapeHtml(commerce.addToCart)}</button></div></article>`).join("")}</div></section>`;
}

function megaRetailPublicDiscountBadge(item = {}) {
  const badge = item.badge || item.deal_label || item.discount_label || "";
  return badge ? `<span class="mega-retail-discount">${escapeHtml(badge)}</span>` : "";
}

function renderMegaRetailPublicTrust(labels) {
  return `<section class="mega-retail-trust">${labels.trust.map((item, index) => `<article>${megaRetailPublicIcon(["truck", "return", "grid", "lock"][index])}<div><strong>${escapeHtml(item[0])}</strong><span>${escapeHtml(item[1])}</span></div></article>`).join("")}</section>`;
}

function renderMegaRetailPublicFooter(schema, pages, logo, labels, features) {
  const socials = megaRetailPublicSocialLinks(schema.contact || {});
  const contactPage = pages.find((item) => /contact/i.test(item.page_key || item.title))?.page_key || pages[0]?.page_key || "home";
  const newsletter = features.newsletter ? `<div><strong>${escapeHtml(labels.newsletter)}</strong><p>${escapeHtml(labels.newsletterText)}</p><div class="mega-retail-newsletter"><input type="email" aria-label="Email" placeholder="email@example.com"><button type="button" data-open-lead aria-label="${escapeAttribute(labels.subscribe)}">${megaRetailPublicIcon("arrow")}</button></div></div>` : "";
  return `<footer class="mega-retail-footer"><div class="mega-retail-footer-grid ${features.newsletter ? "" : "is-three-column"}"><div><div class="mega-retail-footer-brand">${logo ? `<img src="${escapeAttribute(logo)}" alt="">` : renderLogoMark(schema)}</div><p>${escapeHtml(schema.business?.description || labels.tagline)}</p>${features.socials && socials ? `<div class="mega-retail-socials">${socials}</div>` : ""}</div><div><strong>${escapeHtml(labels.help)}</strong>${labels.helpLinks.map((label) => `<a href="#${escapeAttribute(contactPage)}" data-page-link="${escapeAttribute(contactPage)}">${escapeHtml(label)}</a>`).join("")}</div><div><strong>${escapeHtml(labels.company)}</strong>${pages.slice(0, 4).map((item) => `<a href="#${escapeAttribute(item.page_key)}" data-page-link="${escapeAttribute(item.page_key)}">${escapeHtml(item.title || item.page_key)}</a>`).join("")}</div>${newsletter}</div><div class="mega-retail-footer-bottom"><span>${escapeHtml(schema.global_components?.footer_text || `© ${new Date().getFullYear()} ${schema.business?.name || ""}`)}</span><div class="mega-retail-payments"><span>VISA</span><span>MC</span><span>AMEX</span><span>Pay</span></div></div></footer>`;
}

function megaRetailPublicFeatureFlags(schema = {}) {
  const features = schema.global_components?.mega_retail_features || {};
  return { whatsapp: features.whatsapp !== false, newsletter: features.newsletter !== false, socials: features.socials !== false };
}

function megaRetailPublicSocialLinks(contact = {}) {
  return [["instagram", "Instagram"], ["facebook", "Facebook"], ["tiktok", "TikTok"], ["twitter", "Twitter"]].map(([key, label]) => {
    const raw = String(contact[key] || "").trim();
    if (!raw) return "";
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${key === "twitter" ? "x.com" : `${key}.com`}/${raw.replace(/^@/, "")}`;
    return `<a href="${escapeAttribute(url)}" target="_blank" rel="noopener noreferrer" aria-label="${label}">${megaRetailPublicIcon(key)}</a>`;
  }).join("");
}

function megaRetailPublicWhatsAppUrl(contact = {}) {
  const raw = String(contact.whatsapp || "").trim();
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 7 ? `https://wa.me/${digits}` : "";
}

function resolveMegaRetailPublicTileMedia({ clientPhotoUrls = [], tileIndex = 0, category = "", categoryImage = "", hasBrandVisual = false }) {
  const photos = clientPhotoUrls.map((value) => String(value || "").trim()).filter(Boolean);
  if (photos.length) return { url: photos[tileIndex % photos.length], source: "client_photo", duotone: false };
  return { url: String(categoryImage || "").trim() || megaRetailPublicStockImage(category), source: hasBrandVisual ? "brand_duotone" : "stock_category", duotone: Boolean(hasBrandVisual) };
}

function megaRetailPublicStockImage(category = "") {
  const text = String(category).toLowerCase();
  const images = [[/fashion|moda|ropa|style/, "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1400&q=84"], [/home|hogar|decor|furniture/, "https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=1400&q=84"], [/beauty|belleza|skin|cosmetic/, "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1400&q=84"], [/food|comida|gourmet|restaurant/, "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1400&q=84"], [/sport|fitness|outdoor/, "https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&w=1400&q=84"], [/tech|electronic|gadget|computer/, "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1400&q=84"]];
  return (images.find(([pattern]) => pattern.test(text)) || [null, "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1400&q=84"])[1];
}

function megaRetailPublicLabels(schema = {}) {
  const language = schema.business?.selectedLanguage || schema.business?.selected_language || "en";
  const all = {
    en: { departments: "Departments", search: "Search products and departments", account: "Sign in", favorites: "Favorites", cart: "Cart", featured: "Featured", department: "Department", heroText: "Everything you need, in one place.", discover: "Discover the collection", explore: "Explore", limited: "Limited-time picks", deals: "Today's deals", viewAll: "View all", price: "Price on request", tagline: "Everything you need in one place.", help: "Help", company: "Company", newsletter: "Get the best deals", newsletterText: "New arrivals and special offers in your inbox.", subscribe: "Subscribe", helpLinks: ["Shipping", "Returns", "Contact", "Frequently asked questions"], fallbackCategories: ["Technology", "Home", "Fashion", "Beauty", "Outdoor"], trust: [["Fast shipping", "Reliable delivery options"], ["Easy returns", "Simple exchanges and returns"], ["A broad catalog", "Everything in one place"], ["Secure payment", "Protected checkout"]] },
    es: { departments: "Departamentos", search: "Buscar productos y departamentos", account: "Ingresar", favorites: "Favoritos", cart: "Carrito", featured: "Destacado", department: "Departamento", heroText: "Todo lo que buscas, en un solo lugar.", discover: "Descubre la colección", explore: "Explorar", limited: "Selección por tiempo limitado", deals: "Ofertas de hoy", viewAll: "Ver todo", price: "Precio a consultar", tagline: "Todo lo que buscas en un solo lugar.", help: "Ayuda", company: "Empresa", newsletter: "Recibe las mejores ofertas", newsletterText: "Novedades y promociones directo en tu correo.", subscribe: "Suscribirse", helpLinks: ["Envíos", "Devoluciones", "Contacto", "Preguntas frecuentes"], fallbackCategories: ["Tecnología", "Hogar", "Moda", "Belleza", "Aire libre"], trust: [["Envío rápido", "Opciones de entrega confiables"], ["Devoluciones fáciles", "Cambios y devoluciones simples"], ["Catálogo amplio", "Todo en un solo lugar"], ["Pago seguro", "Compra protegida"]] },
  };
  return all[language] || all.en;
}

function megaRetailPublicIcon(name) {
  const paths = { search: '<circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path>', heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"></path>', bag: '<path d="M6 8h12l1 13H5L6 8Z"></path><path d="M9 9V6a3 3 0 0 1 6 0v3"></path>', arrow: '<path d="M5 12h14"></path><path d="m13 6 6 6-6 6"></path>', truck: '<path d="M3 6h11v10H3z"></path><path d="M14 10h4l3 3v3h-7z"></path><circle cx="7" cy="18" r="2"></circle><circle cx="18" cy="18" r="2"></circle>', return: '<path d="m9 14-4-4 4-4"></path><path d="M5 10h9a5 5 0 0 1 5 5v1"></path>', grid: '<rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect>', lock: '<rect x="5" y="10" width="14" height="11" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path>', whatsapp: '<path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4A8 8 0 1 1 20 11.5Z"></path><path d="M9 8.5c.8 2.2 2.3 3.8 4.7 4.7"></path>', instagram: '<rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17.5" cy="6.5" r="1"></circle>', facebook: '<path d="M14 8h3V4h-3a5 5 0 0 0-5 5v3H6v4h3v6h4v-6h3l1-4h-4V9a1 1 0 0 1 1-1Z"></path>', tiktok: '<path d="M15 4v10a4 4 0 1 1-4-4"></path><path d="M15 4c1 3 3 4 5 4"></path>', twitter: '<path d="M4 4l16 16M20 4 4 20"></path>' };
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.grid}</svg>`;
}

function isCommerceSite(schema = {}) {
  const templateId = schema.active_template?.id || schema.selected_template?.id || "";
  const catalogType = schema.catalog_model?.catalogType || schema.catalogModel?.catalogType || schema.layout_mode?.catalog_type || "";
  const salesMode = schema.business?.salesMode || schema.business?.sales_mode || schema.sales_mode || "";
  const intent = schema.business?.websiteIntent || schema.business?.website_intent || schema.business?.intent || "";
  const text = [templateId, catalogType, salesMode, intent, schema.business?.industry, schema.business?.description].join(" ").toLowerCase();
  return /marketplace|ecommerce|commerce|store|shop|retail|online_sales|sell|venta|tienda|productos/.test(text);
}

function commerceLabels(schema = {}) {
  const language = schema?.business?.selectedLanguage || "en";
  const labels = {
    en: { account: "Account", cart: "Cart", cartEyebrow: "Your selection", addToCart: "Add to cart", addedToCart: "added to cart", checkout: "Continue to checkout", continueShopping: "Continue shopping", emptyCart: "Your cart is empty.", emptyHint: "Add something you love and it will appear here.", remove: "Remove", decrease: "Decrease quantity", increase: "Increase quantity", close: "Close cart", signInTitle: "Sign in or create account", name: "Name", email: "Email", continue: "Continue", saved: "Saved", items: "items", total: "Total" },
    es: { account: "Cuenta", cart: "Carrito", cartEyebrow: "Tu seleccion", addToCart: "Agregar al carrito", addedToCart: "agregado al carrito", checkout: "Continuar al pago", continueShopping: "Seguir comprando", emptyCart: "Tu carrito esta vacio.", emptyHint: "Agrega algo que te guste y aparecera aqui.", remove: "Quitar", decrease: "Reducir cantidad", increase: "Aumentar cantidad", close: "Cerrar carrito", signInTitle: "Entrar o crear cuenta", name: "Nombre", email: "Correo", continue: "Continuar", saved: "Guardado", items: "articulos", total: "Total" },
    fr: { account: "Compte", cart: "Panier", cartEyebrow: "Votre selection", addToCart: "Ajouter au panier", addedToCart: "ajoute au panier", checkout: "Continuer vers le paiement", continueShopping: "Continuer vos achats", emptyCart: "Votre panier est vide.", emptyHint: "Ajoutez un article et il apparaitra ici.", remove: "Retirer", decrease: "Reduire la quantite", increase: "Augmenter la quantite", close: "Fermer le panier", signInTitle: "Connexion ou creation de compte", name: "Nom", email: "Email", continue: "Continuer", saved: "Enregistre", items: "articles", total: "Total" },
    pt: { account: "Conta", cart: "Carrinho", cartEyebrow: "Sua selecao", addToCart: "Adicionar ao carrinho", addedToCart: "adicionado ao carrinho", checkout: "Continuar para pagamento", continueShopping: "Continuar comprando", emptyCart: "Seu carrinho esta vazio.", emptyHint: "Adicione algo que voce goste e aparecera aqui.", remove: "Remover", decrease: "Diminuir quantidade", increase: "Aumentar quantidade", close: "Fechar carrinho", signInTitle: "Entrar ou criar conta", name: "Nome", email: "Email", continue: "Continuar", saved: "Salvo", items: "itens", total: "Total" },
  };
  return labels[language] || labels.en;
}

function renderCommerceNavActions(schema) {
  const labels = commerceLabels(schema);
  return `<div class="commerce-actions">
    <button class="commerce-action" data-account-open type="button">${escapeHtml(labels.account)}</button>
    <button class="commerce-action cart-button" data-cart-open type="button">${escapeHtml(labels.cart)} <span data-cart-count>${sharedCart?.count() || 0}</span></button>
  </div>`;
}

function cartTriggerAttributes(item = {}, price = "") {
  return `data-cart-add data-item-id="${escapeAttribute(item.id || item.itemId || item.name || item.title || "")}" data-item-name="${escapeAttribute(item.name || item.title || "Item")}" data-item-price="${escapeAttribute(price || item.price_label || item.priceLabel || item.price || "")}" data-item-image="${escapeAttribute(item.image_url || item.imageUrl || "")}"`;
}

function catalogAction(schema, item = {}, fallbackLabel = "Request info") {
  if (!isCommerceSite(schema)) {
    return {
      attributes: `data-open-lead data-item-id="${escapeAttribute(item.id || "")}" data-item-name="${escapeAttribute(item.name || "")}"`,
      label: item.button_label || fallbackLabel,
    };
  }
  return {
    attributes: cartTriggerAttributes(item, item.price_label || item.price || ""),
    label: commerceLabels(schema).addToCart,
  };
}

function renderSection(section, schema) {
  if (section.type === "Hero") return renderHero(section, schema);
  if (section.type === "PremiumHero") return renderPremiumHero(section, schema);
  if (section.type === "ProductStory") return renderProductStory(section, schema);
  if (section.type === "FeatureShowcase") return renderFeatureShowcase(section, schema);
  if (section.type === "EditorialGallery" || section.type === "PortfolioGallery") return renderPortfolioGallery(section, schema);
  if (section.type === "VideoShowcase") return renderVideoShowcase(section, schema);
  if (section.type === "CourseOffering") return renderCourseOffering(section, schema);
  if (section.type === "SpecStrip") return renderSpecStrip(section, schema);
  if (section.type === "FashionHero") return renderFashionHero(section, schema);
  if (section.type === "FashionCollectionRail") return renderFashionCollectionRail(section, schema);
  if (section.type === "FashionDropStory") return renderFashionDropStory(section, schema);
  if (section.type === "FashionLookbook") return renderFashionLookbook(section, schema);
  if (section.type === "FashionFitGuide") return renderFashionFitGuide(section, schema);
  if (section.type === "CorporateHero") return renderCorporateHero(section, schema);
  if (section.type === "CorporateServices") return renderCorporateServices(section, schema);
  if (section.type === "CorporateProcess") return renderCorporateProcess(section, schema);
  if (section.type === "CorporateProof") return renderCorporateProof(section, schema);
  if (section.type === "RestaurantHero") return renderRestaurantHero(section, schema);
  if (section.type === "RestaurantCategoryRail") return renderRestaurantCategoryRail(section, schema);
  if (section.type === "RestaurantSignatureMenu") return renderRestaurantSignatureMenu(section, schema);
  if (section.type === "RestaurantSpecials") return renderRestaurantSpecials(section, schema);
  if (section.type === "RestaurantInfo") return renderRestaurantInfo(section, schema);
  if (section.type === "RestaurantOrderPanel") return renderRestaurantOrderPanel(section, schema);
  if (section.type === "DigitalHero") return renderDigitalHero(section, schema);
  if (section.type === "DigitalBundle") return renderDigitalBundle(section, schema);
  if (section.type === "DigitalModules") return renderDigitalModules(section, schema);
  if (section.type === "DigitalProof") return renderDigitalProof(section, schema);
  if (section.type === "DigitalAccessPanel") return renderDigitalAccessPanel(section, schema);
  if (section.type === "LuxuryHero") return renderLuxuryHero(section, schema);
  if (section.type === "LuxurySignature") return renderLuxurySignature(section, schema);
  if (section.type === "LuxuryCollection") return renderLuxuryCollection(section, schema);
  if (section.type === "LuxuryProvenance") return renderLuxuryProvenance(section, schema);
  if (section.type === "LuxuryPrivateService") return renderLuxuryPrivateService(section, schema);
  if (section.type === "LuxuryContact") return renderLuxuryContact(section, schema);
  if (section.type === "AcademyHero") return renderAcademyHero(section, schema);
  if (section.type === "AcademyLearningPath") return renderAcademyLearningPath(section, schema);
  if (section.type === "AcademyPrograms") return renderAcademyPrograms(section, schema);
  if (section.type === "AcademyOutcomes") return renderAcademyOutcomes(section, schema);
  if (section.type === "AcademyInstructor") return renderAcademyInstructor(section, schema);
  if (section.type === "AcademyEnroll") return renderAcademyEnroll(section, schema);
  if (section.type === "ClinicHero") return renderClinicHero(section, schema);
  if (section.type === "ClinicServices") return renderClinicServices(section, schema);
  if (section.type === "ClinicTreatmentPath") return renderClinicTreatmentPath(section, schema);
  if (section.type === "ClinicTrust") return renderClinicTrust(section, schema);
  if (section.type === "ClinicResults") return renderClinicResults(section, schema);
  if (section.type === "ClinicTeam") return renderClinicTeam(section, schema);
  if (section.type === "ClinicBooking") return renderClinicBooking(section, schema);
  if (section.type === "ProfessionalHero") return renderProfessionalHero(section, schema);
  if (section.type === "ProfessionalPracticeAreas") return renderProfessionalPracticeAreas(section, schema);
  if (section.type === "ProfessionalProcess") return renderProfessionalProcess(section, schema);
  if (section.type === "ProfessionalProof") return renderProfessionalProof(section, schema);
  if (section.type === "ProfessionalTeam") return renderProfessionalTeam(section, schema);
  if (section.type === "ProfessionalFAQ") return renderProfessionalFAQ(section, schema);
  if (section.type === "ProfessionalConsultation") return renderProfessionalConsultation(section, schema);
  if (section.type === "EnterpriseHero") return renderEnterpriseHero(section, schema);
  if (section.type === "EnterpriseSolutions") return renderEnterpriseSolutions(section, schema);
  if (section.type === "EnterpriseUseCases") return renderEnterpriseUseCases(section, schema);
  if (section.type === "EnterpriseIntegrations") return renderEnterpriseIntegrations(section, schema);
  if (section.type === "EnterpriseProof") return renderEnterpriseProof(section, schema);
  if (section.type === "EnterprisePricing") return renderEnterprisePricing(section, schema);
  if (section.type === "EnterpriseDemo") return renderEnterpriseDemo(section, schema);
  if (section.type === "IndustrialHero") return renderIndustrialHero(section, schema);
  if (section.type === "IndustrialSpecCatalog") return renderIndustrialSpecCatalog(section, schema);
  if (section.type === "IndustrialCapabilities" || section.type === "CapabilitiesEquipment") return renderCapabilitiesEquipment(section, schema);
  if (section.type === "IndustrialCertifications") return renderIndustrialCertifications(section, schema);
  if (section.type === "IndustrialSupplyChain") return renderIndustrialSupplyChain(section, schema);
  if (section.type === "IndustrialQuotePanel" || section.type === "QuoteRequestForm") return renderQuoteRequestForm(section, schema);
  if (section.type === "ListingHero") return renderListingHero(section, schema);
  if (section.type === "ListingFilters") return renderListingFilters(section, schema);
  if (section.type === "ListingFeatured") return renderListingFeatured(section, schema);
  if (section.type === "ListingAreaPanel") return renderListingAreaPanel(section, schema);
  if (section.type === "ListingTrust") return renderListingTrust(section, schema);
  if (section.type === "ListingContact") return renderListingContact(section, schema);
  if (section.type === "HomeServiceHero") return renderHomeServiceHero(section, schema);
  if (section.type === "HomeServiceCategories") return renderHomeServiceCategories(section, schema);
  if (section.type === "HomeServiceAreas") return renderHomeServiceAreas(section, schema);
  if (section.type === "HomeServiceGallery") return renderPortfolioGallery(section, schema);
  if (section.type === "HomeServiceTrust") return renderHomeServiceTrust(section, schema);
  if (section.type === "HomeServiceQuote") return renderHomeServiceQuote(section, schema);
  if (section.type === "BookingHero") return renderBookingHero(section, schema);
  if (section.type === "BookingServices") return renderBookingServices(section, schema);
  if (section.type === "BookingAvailability") return renderBookingAvailability(section, schema);
  if (section.type === "BookingTeam") return renderBookingTeam(section, schema);
  if (section.type === "BookingContact") return renderBookingContact(section, schema);
  if (section.type === "FunnelHero") return renderFunnelHero(section, schema);
  if (section.type === "FunnelBenefits") return renderFunnelBenefits(section, schema);
  if (section.type === "FunnelOffer") return renderFunnelOffer(section, schema);
  if (section.type === "FunnelProof") return renderFunnelProof(section, schema);
  if (section.type === "FunnelFAQ") return renderFunnelFAQ(section, schema);
  if (section.type === "MarketplaceHero") return renderMarketplaceHero(section, schema);
  if (section.type === "CategoryRail") return renderCategoryRail(section, schema);
  if (section.type === "DealRow") return renderDealRow(section, schema);
  if (section.type === "TrustStrip") return renderTrustStrip(section, schema);
  if (["ProductGrid", "ServiceList"].includes(section.type)) return renderProductGrid(section, schema);
  if (["Contact", "Footer"].includes(section.type)) return renderContact(section, schema);
  return renderFeature(section);
}

function publicCatalogItems(schema) {
  return (schema.catalog_items || schema.products_services || [])
    .filter((item) => item.is_active !== false && item.display_in_catalog !== false)
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
}

function renderHero(section, schema) {
  const editable = section.editable || {};
  const image = editable.image_url || schema.catalog_items?.find((item) => item.is_featured && item.image_url)?.image_url || schema.catalog_items?.find((item) => item.image_url)?.image_url || "";
  return `<section class="rendered-hero hero-${escapeAttribute(slugify(section.settings?.layout || "image_right"))} ${sectionClass(section)}">
    <div>
      ${schema.brand?.logoUrl ? `<span class="hero-brand-badge"><img src="${escapeAttribute(schema.brand.logoUrl)}" alt="">${escapeHtml(schema.business?.name || "")}</span>` : ""}
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

function renderPremiumHero(section, schema) {
  const editable = section.editable || {};
  const items = publicCatalogItems(schema);
  const heroItem = items.find((item) => item.is_featured && item.image_url) || items.find((item) => item.image_url);
  const image = editable.image_url || heroItem?.image_url || "";
  const firstItem = items[0];
  return `<section class="premium-hero ${sectionClass(section)}">
    <div class="premium-hero-copy">
      <span class="rendered-kicker">${escapeHtml(schema.business?.industry || schema.business?.tone || "")}</span>
      <h1>${escapeHtml(editable.headline || schema.business?.name || "")}</h1>
      <p>${escapeHtml(editable.subtitle || schema.business?.description || "")}</p>
      <div class="rendered-actions">
        <button class="rendered-button" data-open-lead type="button">${escapeHtml(editable.primary_button || schema.theme?.buttons?.primary_label || "Explore")}</button>
        <button class="rendered-button secondary" data-open-lead type="button">${escapeHtml(editable.secondary_button || schema.theme?.buttons?.secondary_label || "Learn more")}</button>
      </div>
    </div>
    <div class="premium-product-stage">
      ${image ? `<img src="${escapeAttribute(image)}" alt="${escapeAttribute(schema.business?.name || "")}">` : premiumVisualPlaceholder(schema)}
    </div>
    ${firstItem ? `<div class="premium-hero-meta"><span>${escapeHtml(firstItem.name)}</span><strong>${escapeHtml(firstItem.price_label || "")}</strong></div>` : ""}
  </section>`;
}

function renderProductStory(section, schema) {
  const editable = section.editable || {};
  const image = editable.image_url || publicCatalogItems(schema).find((item) => item.image_url)?.image_url || "";
  return `<section class="premium-story ${sectionClass(section)}">
    <div>
      <span class="rendered-kicker">${escapeHtml(schema.business?.tone || "")}</span>
      <h2>${escapeHtml(editable.title || editable.headline || "")}</h2>
      <p>${escapeHtml(editable.text || editable.subtitle || "")}</p>
    </div>
    <div class="premium-story-visual">${image ? `<img src="${escapeAttribute(image)}" alt="">` : premiumVisualPlaceholder(schema)}</div>
  </section>`;
}

function renderFeatureShowcase(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  return `<section class="premium-feature-showcase ${sectionClass(section)}">
    <div class="section-heading">
      <span class="rendered-kicker">${escapeHtml(schema.business?.industry || "")}</span>
      <h2>${escapeHtml(editable.title || "")}</h2>
      ${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}
    </div>
    <div class="premium-feature-grid">
      ${publicCatalogItems(schema).slice(0, 3).map((item, index) => `<article><span class="premium-feature-icon" aria-hidden="true">${premiumFeatureIcon(index)}</span><small>${escapeHtml(index === 0 ? labels.signature : labels.detail)}</small><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p></article>`).join("")}
    </div>
  </section>`;
}

function premiumFeatureIcon(index) {
  const icons = [
    '<svg viewBox="0 0 24 24"><path d="M12 3c3 4 5 6 5 10a5 5 0 0 1-10 0c0-4 2-6 5-10Z"></path><path d="M9 15c1 1 2 1.5 3 1.5"></path></svg>',
    '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 22h4M8 2h8l1 12H7L8 2Z"></path><path d="M12 2c0-1 1-2 2-2"></path></svg>',
    '<svg viewBox="0 0 24 24"><path d="M12 3l1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4L12 3Z"></path><path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14Z"></path></svg>',
  ];
  return icons[index % icons.length];
}

function renderEditorialGallery(section, schema) {
  const editable = section.editable || {};
  return `<section class="premium-gallery-section ${sectionClass(section)}">
    <div class="section-heading">
      <span class="rendered-kicker">${escapeHtml(catalogLocaleLabels(schema).curated)}</span>
      <h2>${escapeHtml(editable.title || "")}</h2>
      ${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}
    </div>
    ${renderPremiumEditorialCatalog(publicCatalogItems(schema), schema)}
  </section>`;
}

function renderSpecStrip(section, schema) {
  const editable = section.editable || {};
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : catalogLocaleLabels(schema).premiumSpecs;
  return `<section class="premium-spec-strip ${sectionClass(section)}"><div><h2>${escapeHtml(editable.title || "")}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div><div>${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div></section>`;
}

function premiumVisualPlaceholder(schema) {
  const initials = String(schema.business?.name || "P").slice(0, 2).toUpperCase();
  return `<div class="premium-visual-placeholder"><span>${escapeHtml(initials)}</span></div>`;
}

function renderFashionHero(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = publicCatalogItems(schema);
  const image = editable.image_url || items.find((item) => item.is_featured && item.image_url)?.image_url || items.find((item) => item.image_url)?.image_url || "";
  return `<section class="fashion-hero ${sectionClass(section)}">
    <div class="fashion-hero-copy">
      <span class="rendered-kicker">${escapeHtml(schema.business?.industry || labels.newDrop)}</span>
      <h1>${escapeHtml(editable.headline || schema.business?.name || "")}</h1>
      <p>${escapeHtml(editable.subtitle || schema.business?.description || "")}</p>
      <div class="rendered-actions">
        <button class="rendered-button" data-open-lead type="button">${escapeHtml(editable.primary_button || schema.theme?.buttons?.primary_label || labels.shopNow)}</button>
        <button class="rendered-button secondary" data-open-lead type="button">${escapeHtml(editable.secondary_button || labels.lookbook)}</button>
      </div>
    </div>
    <div class="fashion-hero-visual">${image ? `<img src="${escapeAttribute(image)}" alt="${escapeAttribute(schema.business?.name || "")}">` : fashionVisualPlaceholder(schema)}</div>
    <div class="fashion-hero-strip">${items.slice(0, 3).map((item) => `<span>${escapeHtml(item.name)}</span>`).join("")}</div>
  </section>`;
}

function renderFashionCollectionRail(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const collections = fashionCollections(schema);
  return `<section class="fashion-collection-section ${sectionClass(section)}">
    <div class="section-heading"><span class="rendered-kicker">${escapeHtml(labels.newDrop)}</span><h2>${escapeHtml(editable.title || labels.collections)}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div class="fashion-collection-rail">${collections.map((collection, index) => `<article><small>0${index + 1}</small><strong>${escapeHtml(collection)}</strong><span>${escapeHtml(index % 2 ? labels.fit : labels.drop)}</span></article>`).join("")}</div>
  </section>`;
}

function renderFashionDropStory(section, schema) {
  const editable = section.editable || {};
  const image = editable.image_url || publicCatalogItems(schema).find((item) => item.image_url)?.image_url || "";
  return `<section class="fashion-drop-story ${sectionClass(section)}">
    <div><span class="rendered-kicker">${escapeHtml(catalogLocaleLabels(schema).newDrop)}</span><h2>${escapeHtml(editable.title || "")}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div class="fashion-story-image">${image ? `<img src="${escapeAttribute(image)}" alt="">` : fashionVisualPlaceholder(schema)}</div>
  </section>`;
}

function renderFashionLookbook(section, schema) {
  const editable = section.editable || {};
  return `<section class="fashion-lookbook-section ${sectionClass(section)}">
    <div class="section-heading"><span class="rendered-kicker">${escapeHtml(catalogLocaleLabels(schema).lookbook)}</span><h2>${escapeHtml(editable.title || "")}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div class="fashion-lookbook-strip">${publicCatalogItems(schema).slice(0, 5).map((item, index) => `<article class="${index === 1 ? "tall" : ""}">${renderCatalogImage(item)}<strong>${escapeHtml(item.name)}</strong></article>`).join("")}</div>
  </section>`;
}

function renderFashionFitGuide(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.fitGuideItems;
  return `<section class="fashion-fit-guide ${sectionClass(section)}">
    <div><h2>${escapeHtml(editable.title || labels.fitGuide)}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div>${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
  </section>`;
}

function fashionCollections(schema) {
  const fromItems = [...new Set(publicCatalogItems(schema).map((item) => item.category).filter(Boolean))];
  const labels = catalogLocaleLabels(schema);
  return [...new Set([...fromItems, ...(labels.fashionCollections || [])])].slice(0, 6);
}

function fashionVisualPlaceholder(schema) {
  const initials = String(schema.business?.name || "FD").slice(0, 2).toUpperCase();
  return `<div class="fashion-visual-placeholder"><span>${escapeHtml(initials)}</span></div>`;
}

function renderCorporateHero(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const image = editable.image_url || publicCatalogItems(schema).find((item) => item.image_url)?.image_url || "";
  return `<section class="corporate-hero ${sectionClass(section)}">
    <div class="corporate-hero-copy">
      <span class="rendered-kicker">${escapeHtml(schema.business?.industry || labels.company)}</span>
      <h1>${escapeHtml(editable.headline || schema.business?.name || "")}</h1>
      <p>${escapeHtml(editable.subtitle || schema.business?.description || "")}</p>
      <div class="rendered-actions">
        <button class="rendered-button" data-open-lead type="button">${escapeHtml(editable.primary_button || labels.requestConsultation)}</button>
        <button class="rendered-button secondary" data-open-lead type="button">${escapeHtml(editable.secondary_button || labels.viewServices)}</button>
      </div>
    </div>
    <div class="corporate-hero-visual">${image ? `<img src="${escapeAttribute(image)}" alt="">` : corporateVisualPlaceholder(schema)}</div>
    <div class="corporate-hero-proof">${labels.corporateProofItems.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
  </section>`;
}

function renderCorporateServices(section, schema) {
  const editable = section.editable || {};
  return `<section class="corporate-services-section ${sectionClass(section)}">
    <div class="section-heading"><span class="rendered-kicker">${escapeHtml(catalogLocaleLabels(schema).services)}</span><h2>${escapeHtml(editable.title || "")}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    ${renderCorporateServicesCatalog(publicCatalogItems(schema), schema)}
  </section>`;
}

function renderCorporateProcess(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.corporateProcessItems;
  return `<section class="corporate-process-section ${sectionClass(section)}">
    <div><span class="rendered-kicker">${escapeHtml(labels.process)}</span><h2>${escapeHtml(editable.title || "")}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div class="corporate-process-list">${items.map((item, index) => `<article><small>0${index + 1}</small><strong>${escapeHtml(item)}</strong></article>`).join("")}</div>
  </section>`;
}

function renderCorporateProof(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.corporateProofItems;
  return `<section class="corporate-proof-section ${sectionClass(section)}">
    <div><span class="rendered-kicker">${escapeHtml(labels.proof)}</span><h2>${escapeHtml(editable.title || "")}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div>${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
  </section>`;
}

function corporateVisualPlaceholder(schema) {
  const initials = String(schema.business?.name || "CO").slice(0, 2).toUpperCase();
  return `<div class="corporate-visual-placeholder"><span>${escapeHtml(initials)}</span></div>`;
}

function renderRestaurantHero(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = publicCatalogItems(schema);
  const heroItem = items.find((item) => item.is_featured && item.image_url) || items.find((item) => item.image_url);
  const image = editable.image_url || heroItem?.image_url || "";
  return `<section class="restaurant-hero ${sectionClass(section)}">
    <div class="restaurant-hero-copy">
      <span class="rendered-kicker">${escapeHtml(schema.business?.industry || labels.menu)}</span>
      <h1>${escapeHtml(editable.headline || schema.business?.name || "")}</h1>
      <p>${escapeHtml(editable.subtitle || schema.business?.description || "")}</p>
      <div class="rendered-actions">
        <button class="rendered-button" data-open-lead type="button">${escapeHtml(editable.primary_button || labels.orderNow)}</button>
        <button class="rendered-button secondary" data-open-lead type="button">${escapeHtml(editable.secondary_button || labels.viewMenu)}</button>
      </div>
      <div class="restaurant-proof-strip">${labels.restaurantProofItems.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
    </div>
    <div class="restaurant-stage">
      <div class="restaurant-stage-visual">${image ? `<img src="${escapeAttribute(image)}" alt="${escapeAttribute(schema.business?.name || "")}">` : restaurantVisualPlaceholder(schema)}</div>
      <article class="restaurant-mini-card"><small>${escapeHtml(labels.pickupDelivery)}</small><strong>${escapeHtml(labels.orderNow)}</strong><span>${escapeHtml(labels.quickOrderNote)}</span></article>
    </div>
  </section>`;
}

function renderRestaurantCategoryRail(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const categories = restaurantMenuCategories(schema, editable.items);
  return `<section class="restaurant-categories-section ${sectionClass(section)}">
    <div class="section-heading"><span class="rendered-kicker">${escapeHtml(labels.menu)}</span><h2>${escapeHtml(editable.title || labels.restaurantCategoriesTitle)}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div class="restaurant-category-rail">${categories.map((category, index) => `<article><small>0${index + 1}</small><strong>${escapeHtml(category)}</strong><span>${escapeHtml(index % 2 ? labels.chefPick : labels.popularDish)}</span></article>`).join("")}</div>
  </section>`;
}

function renderRestaurantSignatureMenu(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  return `<section class="restaurant-menu-section ${sectionClass(section)}">
    <div class="section-heading"><span class="rendered-kicker">${escapeHtml(labels.signatureMenu)}</span><h2>${escapeHtml(editable.title || labels.restaurantSignatureTitle)}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    ${renderRestaurantMenuCatalog(publicCatalogItems(schema), schema)}
  </section>`;
}

function renderRestaurantSpecials(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.restaurantSpecialItems;
  return `<section class="restaurant-specials-section ${sectionClass(section)}">
    <div><span class="rendered-kicker">${escapeHtml(labels.specials)}</span><h2>${escapeHtml(editable.title || labels.restaurantSpecialsTitle)}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div class="restaurant-specials-list">${items.map((item, index) => `<article><small>${escapeHtml(index === 0 ? labels.chefPick : labels.specials)}</small><strong>${escapeHtml(item)}</strong><span>${escapeHtml(labels.editableMenuNote)}</span></article>`).join("")}</div>
  </section>`;
}

function renderRestaurantInfo(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.restaurantInfoItems;
  return `<section class="restaurant-info-section ${sectionClass(section)}">
    <div><span class="rendered-kicker">${escapeHtml(labels.hoursLocation)}</span><h2>${escapeHtml(editable.title || labels.restaurantInfoTitle)}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div>${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
  </section>`;
}

function renderRestaurantOrderPanel(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  return `<section class="restaurant-order-section ${sectionClass(section)}">
    <div class="restaurant-order-card">
      <span class="rendered-kicker">${escapeHtml(labels.orderNow)}</span>
      <h2>${escapeHtml(editable.title || labels.restaurantOrderTitle)}</h2>
      <p>${escapeHtml(editable.text || labels.restaurantOrderText)}</p>
      <div class="rendered-actions">
        <button class="rendered-button" data-open-lead type="button">${escapeHtml(labels.orderNow)}</button>
        <button class="rendered-button secondary" data-open-lead type="button">${escapeHtml(labels.contact)}</button>
      </div>
    </div>
  </section>`;
}

function restaurantMenuCategories(schema, fallback = []) {
  const fromItems = [...new Set(publicCatalogItems(schema).map((item) => item.category).filter(Boolean))];
  const labels = catalogLocaleLabels(schema);
  return [...new Set([...fromItems, ...(Array.isArray(fallback) ? fallback : []), ...(labels.restaurantCategories || [])])].slice(0, 6);
}

function restaurantVisualPlaceholder(schema) {
  const initials = String(schema.business?.name || "RM").slice(0, 2).toUpperCase();
  return `<div class="restaurant-visual-placeholder"><span>${escapeHtml(initials)}</span></div>`;
}

function renderHomeServiceHero(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const image = editable.image_url || publicCatalogItems(schema).find((item) => item.image_url)?.image_url || "";
  const phone = schema.contact?.phone || schema.contact?.whatsapp || labels.callNow;
  return `<section class="home-service-hero ${sectionClass(section)}">
    <div class="home-service-hero-copy">
      <span class="rendered-kicker">${escapeHtml(schema.business?.location || labels.localExperts)}</span>
      <h1>${escapeHtml(editable.headline || schema.business?.name || "")}</h1>
      <p>${escapeHtml(editable.subtitle || schema.business?.description || "")}</p>
      <div class="home-service-actions">
        <button class="rendered-button" data-open-lead type="button">${escapeHtml(editable.primary_button || labels.freeQuote)}</button>
        <button class="rendered-button secondary" data-open-lead type="button">${escapeHtml(editable.secondary_button || labels.callNow)}</button>
      </div>
      <div class="home-service-phone"><strong>${escapeHtml(phone)}</strong><span>${escapeHtml(labels.fastResponse)}</span></div>
    </div>
    <div class="home-service-hero-visual">${image ? `<img src="${escapeAttribute(image)}" alt="">` : homeServiceVisualPlaceholder(schema)}</div>
    <div class="home-service-proof">${labels.homeServiceTrustItems.slice(0, 3).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
  </section>`;
}

function renderHomeServiceCategories(section, schema) {
  const editable = section.editable || {};
  return `<section class="home-service-categories ${sectionClass(section)}">
    <div class="section-heading"><span class="rendered-kicker">${escapeHtml(catalogLocaleLabels(schema).services)}</span><h2>${escapeHtml(editable.title || "")}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    ${renderHomeServicesCatalog(publicCatalogItems(schema), schema)}
  </section>`;
}

function renderHomeServiceAreas(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.serviceAreaItems;
  return `<section class="home-service-areas ${sectionClass(section)}">
    <div><span class="rendered-kicker">${escapeHtml(labels.serviceAreas)}</span><h2>${escapeHtml(editable.title || "")}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div class="home-service-area-map">${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
  </section>`;
}

function renderHomeServiceGallery(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = publicCatalogItems(schema).slice(0, 4);
  return `<section class="home-service-gallery ${sectionClass(section)}">
    <div class="section-heading"><span class="rendered-kicker">${escapeHtml(labels.workProof)}</span><h2>${escapeHtml(editable.title || "")}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div class="home-service-work-grid">${items.map((item, index) => `<article>
      ${renderCatalogImage(item)}
      <div><small>${escapeHtml(index % 2 ? labels.after : labels.before)}</small><strong>${escapeHtml(item.name)}</strong></div>
    </article>`).join("")}</div>
  </section>`;
}

function renderHomeServiceTrust(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.homeServiceTrustItems;
  return `<section class="home-service-trust ${sectionClass(section)}">
    <div><span class="rendered-kicker">${escapeHtml(labels.proof)}</span><h2>${escapeHtml(editable.title || "")}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div>${items.map((item) => `<blockquote>${escapeHtml(item)}</blockquote>`).join("")}</div>
  </section>`;
}

function renderHomeServiceQuote(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const phone = schema.contact?.phone || schema.contact?.whatsapp || labels.callNow;
  return `<section class="home-service-quote ${sectionClass(section)}">
    <div><h2>${escapeHtml(editable.title || labels.freeQuote)}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div class="home-service-quote-card">
      <strong>${escapeHtml(phone)}</strong>
      <span>${escapeHtml(labels.quoteExpectation)}</span>
      <button class="rendered-button" data-open-lead type="button">${escapeHtml(labels.freeQuote)}</button>
    </div>
  </section>`;
}

function homeServiceVisualPlaceholder(schema) {
  const initials = String(schema.business?.name || "LS").slice(0, 2).toUpperCase();
  return `<div class="home-service-visual-placeholder"><span>${escapeHtml(initials)}</span></div>`;
}

function homeServiceWorkPlaceholder(item, schema) {
  const initials = String(item?.name || schema.business?.name || "OK").slice(0, 2).toUpperCase();
  return `<div class="home-service-work-placeholder">${escapeHtml(initials)}</div>`;
}

function renderBookingHero(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const image = editable.image_url || publicCatalogItems(schema).find((item) => item.image_url)?.image_url || "";
  return `<section class="booking-hero ${sectionClass(section)}">
    <div class="booking-hero-copy">
      <span class="rendered-kicker">${escapeHtml(schema.business?.location || labels.appointments)}</span>
      <h1>${escapeHtml(editable.headline || schema.business?.name || "")}</h1>
      <p>${escapeHtml(editable.subtitle || schema.business?.description || "")}</p>
      <div class="rendered-actions">
        <button class="rendered-button" data-open-lead type="button">${escapeHtml(editable.primary_button || labels.bookNow)}</button>
        <button class="rendered-button secondary" data-open-lead type="button">${escapeHtml(editable.secondary_button || labels.viewServices)}</button>
      </div>
    </div>
    <div class="booking-stage">
      <div class="booking-stage-visual">${image ? `<img src="${escapeAttribute(image)}" alt="">` : bookingVisualPlaceholder(schema)}</div>
      <div class="booking-mini-card"><strong>${escapeHtml(labels.nextAvailable)}</strong><span>${escapeHtml(labels.availabilityItems[0])}</span><button data-open-lead type="button">${escapeHtml(labels.bookNow)}</button></div>
    </div>
    <div class="booking-proof-strip">${labels.bookingProofItems.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
  </section>`;
}

function renderBookingServices(section, schema) {
  const editable = section.editable || {};
  return `<section class="booking-services-section ${sectionClass(section)}">
    <div class="section-heading"><span class="rendered-kicker">${escapeHtml(catalogLocaleLabels(schema).services)}</span><h2>${escapeHtml(editable.title || "")}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    ${renderBookingMenuCatalog(publicCatalogItems(schema), schema)}
  </section>`;
}

function renderBookingAvailability(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.availabilityItems;
  return `<section class="booking-availability-section ${sectionClass(section)}">
    <div><span class="rendered-kicker">${escapeHtml(labels.availability)}</span><h2>${escapeHtml(editable.title || "")}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div class="booking-availability-grid">${items.map((item, index) => `<article><small>${escapeHtml(labels.slot)} 0${index + 1}</small><strong>${escapeHtml(item)}</strong><span>${escapeHtml(labels.confirmation)}</span></article>`).join("")}</div>
  </section>`;
}

function renderBookingTeam(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.bookingTeamItems;
  return `<section class="booking-team-section ${sectionClass(section)}">
    <div><span class="rendered-kicker">${escapeHtml(labels.team)}</span><h2>${escapeHtml(editable.title || "")}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div class="booking-team-list">${items.map((item, index) => `<article><small>0${index + 1}</small><strong>${escapeHtml(item)}</strong></article>`).join("")}</div>
  </section>`;
}

function renderBookingContact(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  return `<section class="booking-contact-section ${sectionClass(section)}">
    <div><h2>${escapeHtml(editable.title || labels.bookNow)}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div class="booking-contact-card"><strong>${escapeHtml(labels.confirmation)}</strong><span>${escapeHtml(labels.bookingContactFallback)}</span><button class="rendered-button" data-open-lead type="button">${escapeHtml(labels.bookNow)}</button></div>
  </section>`;
}

function bookingVisualPlaceholder(schema) {
  const initials = String(schema.business?.name || "BK").slice(0, 2).toUpperCase();
  return `<div class="booking-visual-placeholder"><span>${escapeHtml(initials)}</span></div>`;
}

function renderFunnelHero(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const image = editable.image_url || publicCatalogItems(schema).find((item) => item.image_url)?.image_url || "";
  return `<section class="funnel-hero ${sectionClass(section)}">
    <div class="funnel-hero-copy">
      <span class="rendered-kicker">${escapeHtml(schema.business?.industry || labels.offer)}</span>
      <h1>${escapeHtml(editable.headline || schema.business?.name || "")}</h1>
      <p>${escapeHtml(editable.subtitle || schema.business?.description || "")}</p>
      <div class="rendered-actions">
        <button class="rendered-button" data-open-lead type="button">${escapeHtml(editable.primary_button || labels.claimOffer)}</button>
        <button class="rendered-button secondary" data-open-lead type="button">${escapeHtml(editable.secondary_button || labels.seeProof)}</button>
      </div>
    </div>
    <div class="funnel-hero-card">
      <div class="funnel-hero-visual">${image ? `<img src="${escapeAttribute(image)}" alt="">` : funnelVisualPlaceholder(schema)}</div>
      <div class="funnel-mini-form"><strong>${escapeHtml(labels.nextStep)}</strong><span>${escapeHtml(labels.quickRequest)}</span><button data-open-lead type="button">${escapeHtml(labels.claimOffer)}</button></div>
    </div>
    <div class="funnel-proof-strip">${labels.funnelProofItems.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
  </section>`;
}

function renderFunnelBenefits(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.funnelBenefitsItems;
  return `<section class="funnel-benefits-section ${sectionClass(section)}">
    <div class="section-heading"><span class="rendered-kicker">${escapeHtml(labels.benefits)}</span><h2>${escapeHtml(editable.title || "")}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div class="funnel-benefit-grid">${items.map((item, index) => `<article><small>0${index + 1}</small><strong>${escapeHtml(item)}</strong></article>`).join("")}</div>
  </section>`;
}

function renderFunnelOffer(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  return `<section class="funnel-offer-section ${sectionClass(section)}">
    <div><span class="rendered-kicker">${escapeHtml(labels.offer)}</span><h2>${escapeHtml(editable.title || "")}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}${editable.guarantee ? `<strong>${escapeHtml(editable.guarantee)}</strong>` : ""}</div>
    ${renderLeadFunnelOfferCatalog(publicCatalogItems(schema), schema)}
  </section>`;
}

function renderFunnelProof(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.funnelProofItems;
  return `<section class="funnel-proof-section ${sectionClass(section)}">
    <div><span class="rendered-kicker">${escapeHtml(labels.proof)}</span><h2>${escapeHtml(editable.title || "")}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div>${items.map((item) => `<blockquote>${escapeHtml(item)}</blockquote>`).join("")}</div>
  </section>`;
}

function renderFunnelFAQ(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.funnelFaqItems;
  return `<section class="funnel-faq-section ${sectionClass(section)}">
    <div><span class="rendered-kicker">${escapeHtml(labels.faq)}</span><h2>${escapeHtml(editable.title || "")}</h2></div>
    <div class="funnel-faq-list">${items.map((item) => `<article><strong>${escapeHtml(item)}</strong><p>${escapeHtml(labels.faqAnswer)}</p></article>`).join("")}</div>
  </section>`;
}

function funnelVisualPlaceholder(schema) {
  const initials = String(schema.business?.name || "LF").slice(0, 2).toUpperCase();
  return `<div class="funnel-visual-placeholder"><span>${escapeHtml(initials)}</span></div>`;
}

function renderMarketplaceHero(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = publicCatalogItems(schema).slice(0, 4);
  return `<section class="marketplace-hero ${sectionClass(section)}">
    <div class="marketplace-search-panel">
      <div class="marketplace-logo-row"><strong>${escapeHtml(schema.business?.name || "Marketplace")}</strong><span>${escapeHtml(editable.deal_badge || labels.deal)}</span></div>
      <form class="marketplace-search-box" data-catalog-search-form><input type="search" name="catalog-search" aria-label="${escapeAttribute(labels.search)}" placeholder="${escapeAttribute(editable.search_placeholder || labels.searchPlaceholder)}"><button type="submit">${escapeHtml(labels.searchButton)}</button></form>
      <div class="marketplace-chip-row">${marketplaceCategories(schema).slice(0, 6).map((category) => `<button type="button" data-catalog-category="${escapeAttribute(category)}">${escapeHtml(category)}</button>`).join("")}</div>
    </div>
    <div class="marketplace-deal-hero">
      <div><small>${escapeHtml(editable.deal_badge || labels.deal)}</small><h1>${escapeHtml(editable.headline || schema.business?.name || "")}</h1><p>${escapeHtml(editable.subtitle || schema.business?.description || "")}</p><div class="rendered-actions"><a class="rendered-button" href="#catalog" data-page-link="catalog">${escapeHtml(editable.primary_button || labels.shopNow)}</a></div></div>
      <aside><b>${escapeHtml(editable.deal_title || labels.dealTitle)}</b><p>${escapeHtml(editable.deal_text || labels.dealText)}</p><div>${items.map((item) => `<span>${escapeHtml(item.name)}</span>`).join("")}</div></aside>
    </div>
  </section>`;
}

function renderCategoryRail(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  return `<section class="marketplace-category-section ${sectionClass(section)}">
    <div class="section-heading"><span class="rendered-kicker">${escapeHtml(schema.business?.tone || "")}</span><h2>${escapeHtml(editable.title || labels.categories)}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div class="marketplace-category-rail">${marketplaceCategories(schema).map((category, index) => `<article><span>${escapeHtml(category.slice(0, 2).toUpperCase())}</span><strong>${escapeHtml(category)}</strong><small>${escapeHtml(index % 2 ? labels.fastShip : labels.deal)}</small></article>`).join("")}</div>
  </section>`;
}

function renderDealRow(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  return `<section class="marketplace-deal-section ${sectionClass(section)}">
    <div class="section-heading"><span class="rendered-kicker">${escapeHtml(labels.deal)}</span><h2>${escapeHtml(editable.title || labels.dealTitle)}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div class="marketplace-deal-row catalog-count-${Math.min(publicCatalogItems(schema).length, 6)}">${publicCatalogItems(schema).slice(0, 6).map((item, index) => renderCatalogCard(item, "market-card deal-card", index % 2 ? labels.fastShip : labels.deal, schema)).join("")}</div>
  </section>`;
}

function renderTrustStrip(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const trust = [labels.secureCheckout, labels.fastShip, labels.support, labels.easyReturns];
  return `<section class="marketplace-trust-strip ${sectionClass(section)}"><div><h2>${escapeHtml(editable.title || labels.trustTitle)}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div><div>${trust.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div></section>`;
}

function renderProductGrid(section, schema) {
  const editable = section.editable || {};
  const columns = Math.max(2, Math.min(Number(section.settings?.columns || 3), 4));
  const catalogItems = publicCatalogItems(schema);
  const catalogType = schema.catalog_model?.catalogType || schema.layout_mode?.catalog_type || "";
  const customCatalog = catalogType === "dense_marketplace_catalog"
    ? renderMarketplaceCatalog(catalogItems, schema)
    : catalogType === "premium_editorial_catalog"
      ? renderPremiumEditorialCatalog(catalogItems, schema)
        : catalogType === "lookbook_collection_catalog"
          ? renderFashionLookbookCatalog(catalogItems, schema)
        : catalogType === "company_services_catalog"
          ? renderCorporateServicesCatalog(catalogItems, schema)
          : catalogType === "home_services_quote_catalog"
            ? renderHomeServicesCatalog(catalogItems, schema)
            : catalogType === "booking_menu_catalog"
              ? renderBookingMenuCatalog(catalogItems, schema)
              : catalogType === "restaurant_menu_catalog" || catalogType === "menu_catalog"
                ? renderRestaurantMenuCatalog(catalogItems, schema)
                : catalogType === "digital_offer_catalog"
                  ? renderDigitalOfferCatalog(catalogItems, schema)
                  : catalogType === "luxury_high_ticket_catalog"
                    ? renderLuxuryHighTicketCatalog(catalogItems, schema)
                    : catalogType === "education_course_catalog"
                      ? renderEducationCourseCatalog(catalogItems, schema)
                      : catalogType === "medical_wellness_service_catalog"
                        ? renderMedicalWellnessCatalog(catalogItems, schema)
                        : catalogType === "legal_professional_services_catalog"
                          ? renderLegalProfessionalCatalog(catalogItems, schema)
                          : catalogType === "b2b_solution_catalog"
                            ? renderB2BSolutionCatalog(catalogItems, schema)
                            : catalogType === "industrial_supplier_catalog"
                              ? renderIndustrialSupplierCatalog(catalogItems, schema)
                  : catalogType === "real_estate_listing_catalog"
                    ? renderRealEstateListingCatalog(catalogItems, schema)
                  : catalogType === "lead_funnel_offer_catalog"
                    ? renderLeadFunnelOfferCatalog(catalogItems, schema)
      : "";
  return `<section class="rendered-section ${sectionClass(section)}">
    <div class="section-heading">
      <h2>${escapeHtml(editable.title || "Products and services")}</h2>
      ${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}
    </div>
    ${customCatalog || `<div class="rendered-grid columns-${columns}">
      ${catalogItems
        .map((item) => { const action = catalogAction(schema, item); return `<article class="rendered-card">
        ${renderCatalogImage(item)}
        <div>
          <h3>${escapeHtml(item.name)}</h3>
          <p>${escapeHtml(item.description)}</p>
          <strong>${escapeHtml(item.price_label)}</strong>
          <br><button class="rendered-button" ${action.attributes} type="button">${escapeHtml(action.label)}</button>
        </div>
      </article>`; }).join("")}
    </div>`}
  </section>`;
}

function renderPremiumEditorialCatalog(items, schema) {
  const labels = catalogLocaleLabels(schema);
  return `<div class="catalog-premium-editorial">${items.map((item, index) => { const action = catalogAction(schema, item, labels.view); return `<article class="${index === 0 ? "featured" : ""}">
    <div class="premium-card-visual">${renderCatalogImage(item)}</div>
    <div><small>${escapeHtml(index === 0 ? labels.flagship : labels.curated)}</small><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p><strong>${escapeHtml(item.price_label || "")}</strong><button class="rendered-button secondary" ${action.attributes} type="button">${escapeHtml(action.label)}</button></div>
  </article>`; }).join("")}</div>`;
}

function renderMarketplaceCatalog(items, schema) {
  const labels = catalogLocaleLabels(schema);
  const groups = groupCatalogItemsByCategory(items, labels);
  return `<div class="catalog-shell catalog-marketplace">
    <aside><strong>${escapeHtml(labels.searchFilters)}</strong>${groups.map(([category]) => `<a href="#catalog-category-${escapeAttribute(slugify(category))}">${escapeHtml(category)}</a>`).join("")}<span>${escapeHtml(labels.price)}</span><span>${escapeHtml(labels.rating)}</span><span>${escapeHtml(labels.delivery)}</span></aside>
    <div class="marketplace-catalog-main"><div class="marketplace-sort-bar"><b>${escapeHtml(labels.results)}</b><span>${escapeHtml(labels.sortBy)}: ${escapeHtml(labels.featured)}</span></div><div class="marketplace-category-groups">${groups.map(([category, categoryItems]) => `<section id="catalog-category-${escapeAttribute(slugify(category))}" class="marketplace-category-group" data-catalog-group><div class="marketplace-category-heading"><h3>${escapeHtml(category)}</h3><span>${categoryItems.length}</span></div><div class="catalog-results">${categoryItems.map((item, index) => renderCatalogCard(item, "market-card", index % 3 === 0 ? labels.deal : labels.fastShip, schema)).join("")}</div></section>`).join("")}</div></div>
  </div>${renderMarketplaceSubscribe(schema)}`;
}

function groupCatalogItemsByCategory(items, labels) {
  const groups = new Map();
  (Array.isArray(items) ? items : []).forEach((item) => {
    const category = String(item.category || labels.featured || "Featured").trim();
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(item);
  });
  return [...groups.entries()];
}

function renderMarketplaceSubscribe(schema) {
  const copy = marketplaceSubscribeCopy(schema);
  return `<section class="marketplace-subscribe">
    <div>
      <span>${escapeHtml(copy.kicker)}</span>
      <h2>${escapeHtml(copy.title)}</h2>
      <p>${escapeHtml(copy.text)}</p>
    </div>
    <form>
      <input type="email" placeholder="${escapeAttribute(copy.placeholder)}">
      <button class="rendered-button" data-open-lead type="button">${escapeHtml(copy.button)}</button>
    </form>
  </section>`;
}

function marketplaceSubscribeCopy(schema) {
  const language = schema?.business?.selectedLanguage || "en";
  const copies = {
    en: {
      kicker: "Subscriber deals",
      title: "Get drops, offers and rare finds first",
      text: "Customers can subscribe for new arrivals, limited deals and category updates.",
      placeholder: "Email address",
      button: "Subscribe",
    },
    es: {
      kicker: "Ofertas para suscriptores",
      title: "Recibe drops, ofertas y hallazgos primero",
      text: "Los clientes pueden suscribirse para novedades, ofertas limitadas y actualizaciones por categoria.",
      placeholder: "Correo electronico",
      button: "Suscribirme",
    },
    fr: {
      kicker: "Offres abonnees",
      title: "Recevez les nouveautés et offres en premier",
      text: "Les clients peuvent recevoir nouveautés, offres limitées et mises à jour par catégorie.",
      placeholder: "Adresse email",
      button: "S'abonner",
    },
    pt: {
      kicker: "Ofertas para assinantes",
      title: "Receba novidades, ofertas e achados primeiro",
      text: "Clientes podem receber novidades, ofertas limitadas e atualizacoes por categoria.",
      placeholder: "Email",
      button: "Assinar",
    },
  };
  return copies[language] || copies.en;
}

function renderFashionLookbookCatalog(items, schema) {
  const labels = catalogLocaleLabels(schema);
  return `<div class="catalog-lookbook">${items.map((item, index) => { const action = catalogAction(schema, item, labels.view); return `<article class="lookbook-card ${index === 0 ? "wide" : ""}">
    ${renderCatalogImage(item)}
    <span>${escapeHtml(labels.newDrop)}</span><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p><b>${escapeHtml(item.price_label || labels.request)}</b>
    <button class="rendered-button secondary" ${action.attributes} type="button">${escapeHtml(action.label)}</button>
  </article>`; }).join("")}</div>`;
}

function renderCorporateServicesCatalog(items, schema) {
  const labels = catalogLocaleLabels(schema);
  return `<div class="catalog-corporate-services">${items.map((item, index) => `<article>
    <small>${escapeHtml(item.category || `${labels.capability} 0${index + 1}`)}</small>
    <h3>${escapeHtml(item.name)}</h3>
    <p>${escapeHtml(item.description)}</p>
    <button class="rendered-button secondary" data-open-lead data-item-id="${escapeAttribute(item.id || "")}" data-item-name="${escapeAttribute(item.name)}" type="button">${escapeHtml(item.button_label || labels.requestConsultation)}</button>
  </article>`).join("")}</div>`;
}

function renderHomeServicesCatalog(items, schema) {
  const labels = catalogLocaleLabels(schema);
  return `<div class="catalog-home-services">${items.map((item, index) => `<article>
    <small>${escapeHtml(item.category || `${labels.service} 0${index + 1}`)}</small>
    <h3>${escapeHtml(item.name)}</h3>
    <p>${escapeHtml(item.description)}</p>
    <div><span>${escapeHtml(labels.serviceAreaReady)}</span><span>${escapeHtml(labels.quoteOnly)}</span></div>
    <button class="rendered-button" data-open-lead data-item-id="${escapeAttribute(item.id || "")}" data-item-name="${escapeAttribute(item.name)}" type="button">${escapeHtml(item.button_label || labels.freeQuote)}</button>
  </article>`).join("")}</div>`;
}

function renderBookingMenuCatalog(items, schema) {
  const labels = catalogLocaleLabels(schema);
  return `<div class="catalog-booking-pro">${items.map((item, index) => `<article class="${index === 1 ? "featured" : ""}">
    <small>${30 + index * 15} min</small>
    <h3>${escapeHtml(item.name)}</h3>
    <p>${escapeHtml(item.description)}</p>
    <div><span>${escapeHtml(labels.staffPick)}</span><span>${escapeHtml(labels.confirmation)}</span></div>
    <b>${escapeHtml(item.price_label || labels.fromQuote)}</b>
    <button class="rendered-button" data-open-lead data-item-id="${escapeAttribute(item.id || "")}" data-item-name="${escapeAttribute(item.name)}" type="button">${escapeHtml(item.button_label || labels.bookNow)}</button>
  </article>`).join("")}</div>`;
}

function renderRestaurantMenuCatalog(items, schema) {
  const labels = catalogLocaleLabels(schema);
  return `<div class="catalog-restaurant-menu">${items.map((item, index) => { const action = catalogAction(schema, item, labels.orderNow); return `<article class="${index === 0 ? "featured" : ""}">
    <div class="restaurant-menu-card-top"><small>${escapeHtml(item.category || (index % 2 ? labels.chefPick : labels.popularDish))}</small><span>${escapeHtml(index === 0 ? labels.signatureMenu : labels.menu)}</span></div>
    ${renderCatalogImage(item)}
    <h3>${escapeHtml(item.name)}</h3>
    <p>${escapeHtml(item.description)}</p>
    <div class="restaurant-menu-card-bottom">
      <strong>${escapeHtml(item.price_label || labels.menuPrice)}</strong>
      <button class="rendered-button" ${action.attributes} type="button">${escapeHtml(action.label)}</button>
    </div>
  </article>`; }).join("")}</div>`;
}

function renderDigitalHero(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = publicCatalogItems(schema);
  const heroItem = items.find((item) => item.is_featured && item.image_url) || items.find((item) => item.image_url);
  const image = editable.image_url || heroItem?.image_url || "";
  return `<section class="digital-hero ${sectionClass(section)}">
    <div class="digital-hero-copy">
      <span class="rendered-kicker">${escapeHtml(schema.business?.industry || labels.digitalProducts)}</span>
      <h1>${escapeHtml(editable.headline || schema.business?.name || "")}</h1>
      <p>${escapeHtml(editable.subtitle || schema.business?.description || "")}</p>
      <div class="rendered-actions">
        <a class="rendered-button" href="#catalog" data-page-link="catalog">${escapeHtml(editable.primary_button || labels.getAccess)}</a>
        <a class="rendered-button secondary" href="#contact" data-page-link="contact">${escapeHtml(editable.secondary_button || labels.viewProducts)}</a>
      </div>
      <div class="digital-proof-strip">${labels.digitalProofItems.slice(0, 3).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
    </div>
    <div class="digital-stage">
      <div class="digital-stage-visual">${image ? `<img src="${escapeAttribute(image)}" alt="${escapeAttribute(schema.business?.name || "")}">` : digitalVisualPlaceholder(schema)}</div>
      <article class="digital-access-card">
        <small>${escapeHtml(labels.instantAccess)}</small>
        <strong>${escapeHtml(labels.getAccess)}</strong>
        <span>${escapeHtml(labels.digitalAccessShort)}</span>
      </article>
    </div>
  </section>`;
}

function renderDigitalBundle(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  return `<section class="digital-bundle-section ${sectionClass(section)}">
    <div class="section-heading">
      <span class="rendered-kicker">${escapeHtml(labels.digitalProducts)}</span>
      <h2>${escapeHtml(editable.title || labels.digitalBundleTitle)}</h2>
      ${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}
    </div>
    ${renderDigitalOfferCatalog(publicCatalogItems(schema), schema)}
  </section>`;
}

function renderDigitalModules(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.digitalModuleItems;
  return `<section class="digital-modules-section ${sectionClass(section)}">
    <div><span class="rendered-kicker">${escapeHtml(labels.modules)}</span><h2>${escapeHtml(editable.title || labels.digitalModulesTitle)}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div class="digital-module-grid">${items.map((item, index) => `<article><small>0${index + 1}</small><strong>${escapeHtml(item)}</strong><span>${escapeHtml(index % 2 ? labels.downloadable : labels.bonus)}</span></article>`).join("")}</div>
  </section>`;
}

function renderDigitalProof(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.digitalProofItems;
  return `<section class="digital-proof-section ${sectionClass(section)}">
    <div><span class="rendered-kicker">${escapeHtml(labels.proof)}</span><h2>${escapeHtml(editable.title || labels.digitalProofTitle)}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div>${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
  </section>`;
}

function renderDigitalAccessPanel(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  return `<section class="digital-access-section ${sectionClass(section)}">
    <div class="digital-access-panel">
      <span class="rendered-kicker">${escapeHtml(labels.instantAccess)}</span>
      <h2>${escapeHtml(editable.title || labels.digitalAccessTitle)}</h2>
      <p>${escapeHtml(editable.text || labels.digitalAccessText)}</p>
      <div class="rendered-actions">
        <a class="rendered-button" href="#catalog" data-page-link="catalog">${escapeHtml(labels.getAccess)}</a>
        <a class="rendered-button secondary" href="#contact" data-page-link="contact">${escapeHtml(labels.contact)}</a>
      </div>
    </div>
  </section>`;
}

function renderDigitalOfferCatalog(items, schema) {
  const labels = catalogLocaleLabels(schema);
  const commerce = isCommerceSite(schema);
  return `<div class="catalog-digital-pro catalog-count-${Math.min(items.length, 9)}">${items.map((item) => `<article ${catalogSearchAttributes(item)}>
    <div class="digital-card-top"><small>${escapeHtml(item.category || labels.digitalProducts)}</small><span>${escapeHtml(labels.instantAccess)}</span></div>
    ${renderCatalogImage(item)}
    <h3>${escapeHtml(item.name)}</h3>
    <p>${escapeHtml(item.description)}</p>
    <ul><li>${escapeHtml(labels.downloadable)}</li><li>${escapeHtml(labels.bonus)}</li><li>${escapeHtml(labels.lifetime)}</li></ul>
    <div class="digital-card-bottom">
      <strong>${escapeHtml(item.price_label || labels.request)}</strong>
      <button class="rendered-button" ${commerce ? cartTriggerAttributes(item, item.price_label || labels.request) : `data-open-lead data-item-id="${escapeAttribute(item.id || "")}" data-item-name="${escapeAttribute(item.name)}"`} type="button">${escapeHtml(item.button_label || (commerce ? commerceLabels(schema).addToCart : labels.getAccess))}</button>
    </div>
  </article>`).join("")}</div>`;
}

function renderLuxuryHighTicketCatalog(items, schema) {
  const labels = catalogLocaleLabels(schema);
  return `<div class="catalog-luxury-high-ticket">${items.map((item, index) => `<article class="${index === 0 ? "featured" : ""}">
    <div class="luxury-card-top">${renderCatalogImage(item)}</div>
    <div class="luxury-card-bottom">
      <small>${escapeHtml(item.deal_label || (index % 2 ? labels.authenticated : labels.limitedPiece))}</small>
      <h3>${escapeHtml(item.name)}</h3>
      <p>${escapeHtml(item.description)}</p>
      <div><span>${escapeHtml(item.category || labels.collection)}</span><strong>${escapeHtml(item.price_label || labels.priceOnRequest)}</strong></div>
      <button class="rendered-button secondary" data-open-lead data-item-id="${escapeAttribute(item.id || "")}" data-item-name="${escapeAttribute(item.name)}" type="button">${escapeHtml(item.button_label || labels.requestPrivateViewing)}</button>
    </div>
  </article>`).join("")}</div>`;
}

function renderEducationCourseCatalog(items, schema) {
  const labels = catalogLocaleLabels(schema);
  return `<div class="catalog-education-course">${items.map((item, index) => `<article class="${index === 0 ? "featured" : ""}">
    <div class="education-card-top">
      <small>${escapeHtml(item.deal_label || (index % 2 ? labels.beginnerFriendly : labels.certificateReady))}</small>
      <span>${escapeHtml(item.shipping_label || labels.educationDurations?.[index % (labels.educationDurations?.length || 1)] || "")}</span>
    </div>
    <div class="education-card-image">${renderCatalogImage(item)}</div>
    <div class="education-card-body">
      <small>${escapeHtml(item.category || labels.courseAcademy)}</small>
      <h3>${escapeHtml(item.name)}</h3>
      <p>${escapeHtml(item.description)}</p>
      <ul>
        <li>${escapeHtml(labels.structuredModules)}</li>
        <li>${escapeHtml(labels.practicalOutcome)}</li>
        <li>${escapeHtml(labels.flexibleAccess)}</li>
      </ul>
      <div><strong>${escapeHtml(item.price_label || labels.coursePrice)}</strong><button class="rendered-button" data-open-lead data-item-id="${escapeAttribute(item.id || "")}" data-item-name="${escapeAttribute(item.name)}" type="button">${escapeHtml(item.button_label || labels.enrollNow)}</button></div>
    </div>
  </article>`).join("")}</div>`;
}

function renderMedicalWellnessCatalog(items, schema) {
  const labels = catalogLocaleLabels(schema);
  return `<div class="catalog-medical-wellness">${items.map((item, index) => `<article class="${index === 0 ? "featured" : ""}">
    <div class="clinic-card-top">
      <small>${escapeHtml(item.deal_label || (index % 2 ? labels.specialistLed : labels.popularTreatment))}</small>
      <span>${escapeHtml(item.shipping_label || labels.clinicDurations?.[index % (labels.clinicDurations?.length || 1)] || "")}</span>
    </div>
    <div class="clinic-card-visual">${renderCatalogImage(item)}</div>
    <div class="clinic-card-body">
      <small>${escapeHtml(item.category || labels.treatments)}</small>
      <h3>${escapeHtml(item.name)}</h3>
      <p>${escapeHtml(item.description)}</p>
      <ul><li>${escapeHtml(labels.specialistLed)}</li><li>${escapeHtml(labels.personalizedPlan)}</li><li>${escapeHtml(labels.clinicCare)}</li></ul>
      <div><strong>${escapeHtml(item.price_label || labels.consultationBased)}</strong><button class="rendered-button" data-open-lead data-item-id="${escapeAttribute(item.id || "")}" data-item-name="${escapeAttribute(item.name)}" type="button">${escapeHtml(item.button_label || labels.bookConsultation)}</button></div>
    </div>
  </article>`).join("")}</div>`;
}

function renderLegalProfessionalCatalog(items, schema) {
  const labels = catalogLocaleLabels(schema);
  return `<div class="catalog-legal-professional">${items.map((item, index) => `<article class="${index === 0 ? "featured" : ""}">
    <div class="professional-card-top">
      <small>${escapeHtml(item.deal_label || (index % 2 ? labels.seniorAdvisor : labels.confidential))}</small>
      <span>${escapeHtml(item.shipping_label || labels.professionalEngagements?.[index % (labels.professionalEngagements?.length || 1)] || "")}</span>
    </div>
    <div class="professional-card-body">
      <small>${escapeHtml(item.category || labels.professionalFirm)}</small>
      <h3>${escapeHtml(item.name)}</h3>
      <p>${escapeHtml(item.description)}</p>
      <ul><li>${escapeHtml(labels.caseReview)}</li><li>${escapeHtml(labels.confidential)}</li><li>${escapeHtml(labels.businessReady)}</li></ul>
      <div><strong>${escapeHtml(item.price_label || labels.consultationBased)}</strong><button class="rendered-button" data-open-lead data-item-id="${escapeAttribute(item.id || "")}" data-item-name="${escapeAttribute(item.name)}" type="button">${escapeHtml(item.button_label || labels.scheduleConsultation)}</button></div>
    </div>
  </article>`).join("")}</div>`;
}

function renderB2BSolutionCatalog(items, schema) {
  const labels = catalogLocaleLabels(schema);
  return `<div class="catalog-b2b-solutions">${items.map((item, index) => `<article class="${index === 0 ? "featured" : ""}">
    <div class="b2b-card-top"><small>${escapeHtml(item.deal_label || (index % 2 ? labels.integrationReady : labels.enterpriseReady))}</small><span>${escapeHtml(item.shipping_label || labels.enterpriseTimelines?.[index % (labels.enterpriseTimelines?.length || 1)] || "")}</span></div>
    <div class="b2b-card-body"><small>${escapeHtml(item.category || labels.solutions)}</small><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p><ul><li>${escapeHtml(labels.roiFocused)}</li><li>${escapeHtml(labels.integrationReady)}</li><li>${escapeHtml(labels.enterpriseReady)}</li></ul><div><strong>${escapeHtml(item.price_label || labels.customPlan)}</strong><button class="rendered-button" data-open-lead data-item-id="${escapeAttribute(item.id || "")}" data-item-name="${escapeAttribute(item.name)}" type="button">${escapeHtml(item.button_label || labels.requestDemo)}</button></div></div>
  </article>`).join("")}</div>`;
}

function renderIndustrialSupplierCatalog(items, schema) {
  const labels = catalogLocaleLabels(schema);
  return `<div class="catalog-industrial-supplier"><div class="industrial-table-head"><span>SKU</span><span>${escapeHtml(labels.products || "Products")}</span><span>MOQ</span><span>${escapeHtml(labels.delivery)}</span><span>Material</span><span></span></div>${items.map((item, index) => {
    const specs = item.specs || {};
    return `<article class="${index === 0 ? "featured" : ""}"><b>${escapeHtml(specs.sku || item.sku || `IND-${String(index + 1).padStart(3, "0")}`)}</b><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.category || labels.industrialSupplier)} · ${escapeHtml(item.deal_label || labels.certified)}</small><p>${escapeHtml(item.description)}</p></div><span>${escapeHtml(specs.moq || (index % 2 ? "100+" : "25+"))}</span><span>${escapeHtml(specs.lead_time || item.shipping_label || labels.industrialLeadTimes?.[index % (labels.industrialLeadTimes?.length || 1)] || "")}</span><span>${escapeHtml(specs.material || labels.industrialMaterials?.[index % (labels.industrialMaterials?.length || 1)] || labels.specReady)}</span><button class="rendered-button" data-open-lead data-item-id="${escapeAttribute(item.id || "")}" data-item-name="${escapeAttribute(item.name)}" type="button">${escapeHtml(item.button_label || labels.requestQuote)}</button></article>`;
  }).join("")}</div>`;
}

function digitalVisualPlaceholder(schema) {
  const initials = String(schema.business?.name || "DP").slice(0, 2).toUpperCase();
  return `<div class="digital-visual-placeholder">
    <span>${escapeHtml(initials)}</span>
    <small>${escapeHtml(catalogLocaleLabels(schema).instantAccess)}</small>
  </div>`;
}

function renderLuxuryHero(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = publicCatalogItems(schema);
  const heroItem = items.find((item) => item.is_featured && item.image_url) || items.find((item) => item.image_url) || items[0];
  const image = editable.image_url || heroItem?.image_url || "";
  return `<section class="luxury-pro-hero ${sectionClass(section)}">
    <div class="luxury-pro-copy">
      <span class="rendered-kicker">${escapeHtml(editable.badge || labels.limitedSelection)}</span>
      <h1>${escapeHtml(editable.headline || schema.business?.name || "")}</h1>
      <p>${escapeHtml(editable.subtitle || schema.business?.description || "")}</p>
      <div class="rendered-actions">
        <button class="rendered-button" data-open-lead type="button">${escapeHtml(editable.primary_button || labels.requestPrivateViewing)}</button>
        <button class="rendered-button secondary" data-open-lead type="button">${escapeHtml(editable.secondary_button || labels.viewCollection)}</button>
      </div>
      <div class="luxury-proof-strip">${(labels.luxuryProofItems || []).slice(0, 3).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
    </div>
    <div class="luxury-pro-stage">
      <div class="luxury-hero-visual">${image ? `<img src="${escapeAttribute(image)}" alt="${escapeAttribute(heroItem?.name || schema.business?.name || "")}">` : luxuryVisualPlaceholder(schema)}</div>
      <div class="luxury-floating-card"><small>${escapeHtml(labels.signaturePiece)}</small><strong>${escapeHtml(heroItem?.name || schema.business?.name || "")}</strong><span>${escapeHtml(heroItem?.price_label || labels.priceOnRequest)}</span></div>
    </div>
  </section>`;
}

function renderLuxurySignature(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const item = publicCatalogItems(schema)[0];
  const image = editable.image_url || item?.image_url || "";
  const proofItems = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.luxuryProofItems;
  return `<section class="luxury-signature-section ${sectionClass(section)}">
    <div class="luxury-signature-media">${image ? `<img src="${escapeAttribute(image)}" alt="${escapeAttribute(item?.name || "")}">` : luxuryVisualPlaceholder(schema)}</div>
    <div class="luxury-signature-copy"><span class="rendered-kicker">${escapeHtml(labels.authenticated)}</span><h2>${escapeHtml(editable.title || labels.signaturePiece)}</h2><p>${escapeHtml(editable.text || "")}</p><div class="luxury-mini-proof">${proofItems.slice(0, 4).map((proof) => `<span>${escapeHtml(proof)}</span>`).join("")}</div></div>
  </section>`;
}

function renderLuxuryCollection(section, schema) {
  const editable = section.editable || {};
  return `<section class="luxury-collection-section ${sectionClass(section)}">
    <div class="section-heading"><span class="rendered-kicker">${escapeHtml(catalogLocaleLabels(schema).collection)}</span><h2>${escapeHtml(editable.title || "")}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    ${renderLuxuryHighTicketCatalog(publicCatalogItems(schema), schema)}
  </section>`;
}

function renderLuxuryProvenance(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.luxuryProofItems;
  return `<section class="luxury-provenance-section ${sectionClass(section)}">
    <div><span class="rendered-kicker">${escapeHtml(labels.provenance)}</span><h2>${escapeHtml(editable.title || labels.luxuryProvenanceTitle)}</h2><p>${escapeHtml(editable.text || labels.luxuryProvenanceText)}</p></div>
    <div class="luxury-provenance-grid">${items.slice(0, 6).map((item) => `<article><span></span><strong>${escapeHtml(item)}</strong><p>${escapeHtml(labels.privateService)}</p></article>`).join("")}</div>
  </section>`;
}

function renderLuxuryPrivateService(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  return `<section class="luxury-private-section ${sectionClass(section)}">
    <div><span class="rendered-kicker">${escapeHtml(labels.privateInquiry)}</span><h2>${escapeHtml(editable.title || labels.luxuryPrivateTitle)}</h2><p>${escapeHtml(editable.text || labels.luxuryPrivateText)}</p></div>
    <button class="rendered-button" data-open-lead type="button">${escapeHtml(editable.primary_button || labels.requestPrivateViewing)}</button>
  </section>`;
}

function renderLuxuryContact(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  return `<section class="luxury-contact-section ${sectionClass(section)}">
    <div class="luxury-contact-card"><span class="rendered-kicker">${escapeHtml(labels.privateInquiry)}</span><h2>${escapeHtml(editable.title || labels.luxuryContactTitle)}</h2><p>${escapeHtml(editable.text || labels.luxuryContactText)}</p><button class="rendered-button" data-open-lead type="button">${escapeHtml(editable.primary_button || labels.requestPrivateViewing)}</button></div>
  </section>`;
}

function luxuryVisualPlaceholder(schema) {
  const initials = String(schema.business?.name || "LX").slice(0, 2).toUpperCase();
  return `<div class="luxury-visual-placeholder"><span>${escapeHtml(initials)}</span><small>${escapeHtml(catalogLocaleLabels(schema).privateService)}</small></div>`;
}

function renderAcademyHero(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = publicCatalogItems(schema);
  const heroItem = items.find((item) => item.is_featured && item.image_url) || items.find((item) => item.image_url) || items[0];
  const image = editable.image_url || heroItem?.image_url || "";
  return `<section class="academy-pro-hero ${sectionClass(section)}">
    <div class="academy-pro-copy">
      <span class="rendered-kicker">${escapeHtml(editable.badge || labels.courseAcademy)}</span>
      <h1>${escapeHtml(editable.headline || schema.business?.name || "")}</h1>
      <p>${escapeHtml(editable.subtitle || schema.business?.description || "")}</p>
      <div class="rendered-actions">
        <button class="rendered-button" data-open-lead type="button">${escapeHtml(editable.primary_button || labels.enrollNow)}</button>
        <button class="rendered-button secondary" data-open-lead type="button">${escapeHtml(editable.secondary_button || labels.viewCurriculum)}</button>
      </div>
      <div class="academy-proof-strip">${(labels.learningOutcomeItems || []).slice(0, 3).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
    </div>
    <div class="academy-pro-stage">
      <div class="academy-dashboard-card">
        <div class="academy-dashboard-top"><span></span><span></span><span></span></div>
        <div class="academy-dashboard-main">
          <div class="academy-video-frame">${image ? `<img src="${escapeAttribute(image)}" alt="${escapeAttribute(heroItem?.name || schema.business?.name || "")}">` : academyVisualPlaceholder(schema)}</div>
          <div class="academy-progress-panel">
            <small>${escapeHtml(labels.curriculum)}</small>
            ${(labels.learningPathItems || []).slice(0, 4).map((item, index) => `<div><b>0${index + 1}</b><span>${escapeHtml(item)}</span></div>`).join("")}
          </div>
        </div>
      </div>
      <div class="academy-floating-card"><small>${escapeHtml(labels.featuredProgram)}</small><strong>${escapeHtml(heroItem?.name || labels.programsTitle)}</strong><span>${escapeHtml(heroItem?.shipping_label || labels.educationDurations?.[0] || "")}</span></div>
    </div>
  </section>`;
}

function renderAcademyLearningPath(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.learningPathItems;
  return `<section class="academy-path-section ${sectionClass(section)}">
    <div class="section-heading"><span class="rendered-kicker">${escapeHtml(labels.curriculum)}</span><h2>${escapeHtml(editable.title || labels.learningPathTitle)}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div class="academy-path-grid">${items.slice(0, 6).map((item, index) => `<article><span>0${index + 1}</span><strong>${escapeHtml(item)}</strong><p>${escapeHtml(index % 2 ? labels.beginnerFriendly : labels.certificateReady)}</p></article>`).join("")}</div>
  </section>`;
}

function renderAcademyPrograms(section, schema) {
  const editable = section.editable || {};
  return `<section class="academy-programs-section ${sectionClass(section)}">
    <div class="section-heading"><span class="rendered-kicker">${escapeHtml(catalogLocaleLabels(schema).programs)}</span><h2>${escapeHtml(editable.title || "")}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    ${renderEducationCourseCatalog(publicCatalogItems(schema), schema)}
  </section>`;
}

function renderAcademyOutcomes(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.learningOutcomeItems;
  return `<section class="academy-outcomes-section ${sectionClass(section)}">
    <div><span class="rendered-kicker">${escapeHtml(labels.outcomes)}</span><h2>${escapeHtml(editable.title || labels.outcomesTitle)}</h2><p>${escapeHtml(editable.text || labels.outcomesText)}</p></div>
    <div class="academy-outcome-grid">${items.slice(0, 6).map((item) => `<article><span></span><strong>${escapeHtml(item)}</strong><p>${escapeHtml(labels.courseAcademy)}</p></article>`).join("")}</div>
  </section>`;
}

function renderAcademyInstructor(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.instructorTrustItems;
  return `<section class="academy-instructor-section ${sectionClass(section)}">
    <div class="academy-instructor-card">${editable.image_url ? `<img src="${escapeAttribute(editable.image_url)}" alt="${escapeAttribute(editable.title || "")}">` : academyVisualPlaceholder(schema)}</div>
    <div><span class="rendered-kicker">${escapeHtml(labels.instructor)}</span><h2>${escapeHtml(editable.title || labels.instructorTitle)}</h2><p>${escapeHtml(editable.text || labels.instructorText)}</p><div class="academy-mini-proof">${items.slice(0, 4).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div></div>
  </section>`;
}

function renderAcademyEnroll(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  return `<section class="academy-enroll-section ${sectionClass(section)}">
    <div><span class="rendered-kicker">${escapeHtml(labels.enroll)}</span><h2>${escapeHtml(editable.title || labels.enrollmentTitle)}</h2><p>${escapeHtml(editable.text || labels.enrollmentText)}</p></div>
    <button class="rendered-button" data-open-lead type="button">${escapeHtml(editable.primary_button || labels.enrollNow)}</button>
  </section>`;
}

function academyVisualPlaceholder(schema) {
  const initials = String(schema.business?.name || "AC").slice(0, 2).toUpperCase();
  return `<div class="academy-visual-placeholder"><span>${escapeHtml(initials)}</span><small>${escapeHtml(catalogLocaleLabels(schema).courseAcademy)}</small></div>`;
}

function renderClinicHero(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = publicCatalogItems(schema);
  const heroItem = items.find((item) => item.is_featured && item.image_url) || items.find((item) => item.image_url) || items[0];
  const image = editable.image_url || heroItem?.image_url || "";
  return `<section class="clinic-pro-hero ${sectionClass(section)}">
    <div class="clinic-pro-copy">
      <span class="rendered-kicker">${escapeHtml(editable.badge || labels.clinicCare)}</span>
      <h1>${escapeHtml(editable.headline || schema.business?.name || "")}</h1>
      <p>${escapeHtml(editable.subtitle || schema.business?.description || "")}</p>
      <div class="rendered-actions">
        <button class="rendered-button" data-open-lead type="button">${escapeHtml(editable.primary_button || labels.bookConsultation)}</button>
        <button class="rendered-button secondary" data-open-lead type="button">${escapeHtml(editable.secondary_button || labels.viewTreatments)}</button>
      </div>
      <div class="clinic-proof-strip">${(labels.clinicTrustItems || []).slice(0, 3).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
    </div>
    <div class="clinic-pro-stage">
      <div class="clinic-appointment-card">
        <div class="clinic-appointment-top"><span>${escapeHtml(labels.bookConsultation)}</span><b>${escapeHtml(labels.consultationBased)}</b></div>
        <div class="clinic-appointment-media">${image ? `<img src="${escapeAttribute(image)}" alt="${escapeAttribute(heroItem?.name || schema.business?.name || "")}">` : clinicVisualPlaceholder(schema)}</div>
        <div class="clinic-slots">${(labels.clinicDurations || []).slice(0, 3).map((item, index) => `<span class="${index === 1 ? "active" : ""}">${escapeHtml(item)}</span>`).join("")}</div>
      </div>
      <div class="clinic-floating-card"><small>${escapeHtml(labels.popularTreatment)}</small><strong>${escapeHtml(heroItem?.name || labels.treatmentsTitle)}</strong><span>${escapeHtml(heroItem?.shipping_label || labels.clinicDurations?.[0] || "")}</span></div>
    </div>
  </section>`;
}

function renderClinicServices(section, schema) {
  const editable = section.editable || {};
  return `<section class="clinic-services-section ${sectionClass(section)}">
    <div class="section-heading"><span class="rendered-kicker">${escapeHtml(catalogLocaleLabels(schema).treatments)}</span><h2>${escapeHtml(editable.title || "")}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    ${renderMedicalWellnessCatalog(publicCatalogItems(schema), schema)}
  </section>`;
}

function renderClinicTreatmentPath(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.carePathItems;
  return `<section class="clinic-path-section ${sectionClass(section)}">
    <div><span class="rendered-kicker">${escapeHtml(labels.clinicCare)}</span><h2>${escapeHtml(editable.title || labels.carePathTitle)}</h2><p>${escapeHtml(editable.text || labels.carePathText)}</p></div>
    <div class="clinic-path-list">${items.slice(0, 6).map((item, index) => `<article><span>0${index + 1}</span><strong>${escapeHtml(item)}</strong><p>${escapeHtml(index % 2 ? labels.personalizedPlan : labels.specialistLed)}</p></article>`).join("")}</div>
  </section>`;
}

function renderClinicTrust(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.clinicTrustItems;
  return `<section class="clinic-trust-section ${sectionClass(section)}"><div><span class="rendered-kicker">${escapeHtml(labels.clinicCare)}</span><h2>${escapeHtml(editable.title || labels.clinicTrustTitle)}</h2><p>${escapeHtml(editable.text || labels.clinicTrustText)}</p></div><div class="clinic-trust-grid">${items.slice(0, 6).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div></section>`;
}

function renderClinicResults(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.resultItems;
  return `<section class="clinic-results-section ${sectionClass(section)}"><div class="clinic-results-copy"><span class="rendered-kicker">${escapeHtml(labels.results)}</span><h2>${escapeHtml(editable.title || labels.resultsTitle)}</h2><p>${escapeHtml(editable.text || labels.resultsText)}</p></div><div class="clinic-results-board">${items.slice(0, 4).map((item, index) => `<article><b>0${index + 1}</b><strong>${escapeHtml(item)}</strong><span>${escapeHtml(index % 2 ? labels.clinicCare : labels.consultationBased)}</span></article>`).join("")}</div></section>`;
}

function renderClinicTeam(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.clinicTeamItems;
  return `<section class="clinic-team-section ${sectionClass(section)}"><div class="clinic-team-media">${editable.image_url ? `<img src="${escapeAttribute(editable.image_url)}" alt="${escapeAttribute(editable.title || "")}">` : clinicVisualPlaceholder(schema)}</div><div><span class="rendered-kicker">${escapeHtml(labels.specialistLed)}</span><h2>${escapeHtml(editable.title || labels.clinicTeamTitle)}</h2><p>${escapeHtml(editable.text || labels.clinicTeamText)}</p><div class="clinic-mini-proof">${items.slice(0, 4).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div></div></section>`;
}

function renderClinicBooking(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  return `<section class="clinic-booking-section ${sectionClass(section)}"><div><span class="rendered-kicker">${escapeHtml(labels.bookConsultation)}</span><h2>${escapeHtml(editable.title || labels.clinicBookingTitle)}</h2><p>${escapeHtml(editable.text || labels.clinicBookingText)}</p></div><button class="rendered-button" data-open-lead type="button">${escapeHtml(editable.primary_button || labels.bookConsultation)}</button></section>`;
}

function clinicVisualPlaceholder(schema) {
  const initials = String(schema.business?.name || "CL").slice(0, 2).toUpperCase();
  return `<div class="clinic-visual-placeholder"><span>${escapeHtml(initials)}</span><small>${escapeHtml(catalogLocaleLabels(schema).clinicCare)}</small></div>`;
}

function renderProfessionalHero(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = publicCatalogItems(schema);
  const heroItem = items.find((item) => item.is_featured && item.image_url) || items.find((item) => item.image_url) || items[0];
  const image = editable.image_url || heroItem?.image_url || "";
  return `<section class="professional-hero ${sectionClass(section)}">
    <div class="professional-hero-copy">
      <span class="rendered-kicker">${escapeHtml(editable.badge || labels.professionalFirm)}</span>
      <h1>${escapeHtml(editable.headline || schema.business?.name || "")}</h1>
      <p>${escapeHtml(editable.subtitle || schema.business?.description || "")}</p>
      <div class="rendered-actions">
        <button class="rendered-button" data-open-lead type="button">${escapeHtml(editable.primary_button || labels.scheduleConsultation)}</button>
        <button class="rendered-button secondary" data-open-lead type="button">${escapeHtml(editable.secondary_button || labels.viewServices)}</button>
      </div>
      <div class="professional-proof-strip">${(labels.professionalProofItems || []).slice(0, 3).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
    </div>
    <div class="professional-stage">
      <div class="professional-case-card">
        <div class="professional-case-top"><span>${escapeHtml(labels.scheduleConsultation)}</span><b>${escapeHtml(labels.confidential)}</b></div>
        <div class="professional-case-visual">${image ? `<img src="${escapeAttribute(image)}" alt="${escapeAttribute(heroItem?.name || schema.business?.name || "")}">` : professionalVisualPlaceholder(schema)}</div>
        <div class="professional-document-list">${(labels.professionalProcessItems || []).slice(0, 4).map((item, index) => `<span><b>0${index + 1}</b>${escapeHtml(item)}</span>`).join("")}</div>
      </div>
      <div class="professional-floating-card"><small>${escapeHtml(labels.caseReview)}</small><strong>${escapeHtml(heroItem?.name || labels.practiceAreasTitle)}</strong><span>${escapeHtml(heroItem?.shipping_label || labels.professionalEngagements?.[0] || "")}</span></div>
    </div>
  </section>`;
}

function renderProfessionalPracticeAreas(section, schema) {
  const editable = section.editable || {};
  return `<section class="professional-services-section ${sectionClass(section)}">
    <div class="section-heading"><span class="rendered-kicker">${escapeHtml(catalogLocaleLabels(schema).services)}</span><h2>${escapeHtml(editable.title || "")}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    ${renderLegalProfessionalCatalog(publicCatalogItems(schema), schema)}
  </section>`;
}

function renderProfessionalProcess(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.professionalProcessItems;
  return `<section class="professional-process-section ${sectionClass(section)}"><div><span class="rendered-kicker">${escapeHtml(labels.process)}</span><h2>${escapeHtml(editable.title || labels.professionalProcessTitle)}</h2><p>${escapeHtml(editable.text || labels.professionalProcessText)}</p></div><div class="professional-process-list">${items.slice(0, 6).map((item, index) => `<article><span>0${index + 1}</span><strong>${escapeHtml(item)}</strong><p>${escapeHtml(index % 2 ? labels.businessReady : labels.confidential)}</p></article>`).join("")}</div></section>`;
}

function renderProfessionalProof(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.professionalProofItems;
  return `<section class="professional-proof-section ${sectionClass(section)}"><div><span class="rendered-kicker">${escapeHtml(labels.proof)}</span><h2>${escapeHtml(editable.title || labels.professionalProofTitle)}</h2><p>${escapeHtml(editable.text || labels.professionalProofText)}</p></div><div class="professional-proof-grid">${items.slice(0, 6).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div></section>`;
}

function renderProfessionalTeam(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.professionalTeamItems;
  return `<section class="professional-team-section ${sectionClass(section)}"><div class="professional-team-media">${editable.image_url ? `<img src="${escapeAttribute(editable.image_url)}" alt="${escapeAttribute(editable.title || "")}">` : professionalVisualPlaceholder(schema)}</div><div><span class="rendered-kicker">${escapeHtml(labels.seniorAdvisor)}</span><h2>${escapeHtml(editable.title || labels.professionalTeamTitle)}</h2><p>${escapeHtml(editable.text || labels.professionalTeamText)}</p><div class="professional-mini-proof">${items.slice(0, 4).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div></div></section>`;
}

function renderProfessionalFAQ(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.professionalFaqItems;
  return `<section class="professional-faq-section ${sectionClass(section)}"><div class="section-heading"><span class="rendered-kicker">${escapeHtml(labels.faq)}</span><h2>${escapeHtml(editable.title || labels.professionalFaqTitle)}</h2></div><div class="professional-faq-list">${items.slice(0, 5).map((item) => `<article><strong>${escapeHtml(item)}</strong><p>${escapeHtml(labels.professionalConsultationText)}</p></article>`).join("")}</div></section>`;
}

function renderProfessionalConsultation(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  return `<section class="professional-consultation-section ${sectionClass(section)}"><div><span class="rendered-kicker">${escapeHtml(labels.scheduleConsultation)}</span><h2>${escapeHtml(editable.title || labels.professionalConsultationTitle)}</h2><p>${escapeHtml(editable.text || labels.professionalConsultationText)}</p></div><button class="rendered-button" data-open-lead type="button">${escapeHtml(editable.primary_button || labels.scheduleConsultation)}</button></section>`;
}

function professionalVisualPlaceholder(schema) {
  const initials = String(schema.business?.name || "PF").slice(0, 2).toUpperCase();
  return `<div class="professional-visual-placeholder"><span>${escapeHtml(initials)}</span><small>${escapeHtml(catalogLocaleLabels(schema).professionalFirm)}</small></div>`;
}

function renderEnterpriseHero(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = publicCatalogItems(schema);
  const heroItem = items.find((item) => item.is_featured && item.image_url) || items.find((item) => item.image_url) || items[0];
  const image = editable.image_url || heroItem?.image_url || "";
  return `<section class="enterprise-hero ${sectionClass(section)}"><div class="enterprise-hero-copy"><span class="rendered-kicker">${escapeHtml(editable.badge || labels.enterprisePlatform)}</span><h1>${escapeHtml(editable.headline || schema.business?.name || "")}</h1><p>${escapeHtml(editable.subtitle || schema.business?.description || "")}</p><div class="rendered-actions"><button class="rendered-button" data-open-lead type="button">${escapeHtml(editable.primary_button || labels.requestDemo)}</button><button class="rendered-button secondary" data-open-lead type="button">${escapeHtml(editable.secondary_button || labels.viewSolutions)}</button></div><div class="enterprise-metric-strip">${(labels.enterpriseProofItems || []).slice(0, 3).map((item, index) => `<span><b>${index === 0 ? "99%" : index === 1 ? "2x" : "24/7"}</b>${escapeHtml(item)}</span>`).join("")}</div></div><div class="enterprise-dashboard"><div class="enterprise-dashboard-top"><span></span><span></span><span></span><b>${escapeHtml(labels.integrations)}</b></div><div class="enterprise-dashboard-main">${image ? `<img src="${escapeAttribute(image)}" alt="${escapeAttribute(heroItem?.name || schema.business?.name || "")}">` : enterpriseVisualPlaceholder(schema)}</div><div class="enterprise-dashboard-grid">${(labels.enterpriseIntegrationItems || []).slice(0, 6).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div></div></section>`;
}

function renderEnterpriseSolutions(section, schema) {
  const editable = section.editable || {};
  return `<section class="enterprise-solutions-section ${sectionClass(section)}"><div class="section-heading"><span class="rendered-kicker">${escapeHtml(catalogLocaleLabels(schema).solutions)}</span><h2>${escapeHtml(editable.title || "")}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>${renderB2BSolutionCatalog(publicCatalogItems(schema), schema)}</section>`;
}

function renderEnterpriseUseCases(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.enterpriseUseCaseItems;
  return `<section class="enterprise-use-cases-section ${sectionClass(section)}"><div><span class="rendered-kicker">${escapeHtml(labels.useCases)}</span><h2>${escapeHtml(editable.title || labels.enterpriseUseCasesTitle)}</h2><p>${escapeHtml(editable.text || labels.enterpriseUseCasesText)}</p></div><div class="enterprise-use-case-grid">${items.slice(0, 6).map((item, index) => `<article><b>0${index + 1}</b><strong>${escapeHtml(item)}</strong><span>${escapeHtml(index % 2 ? labels.integrationReady : labels.roiFocused)}</span></article>`).join("")}</div></section>`;
}

function renderEnterpriseIntegrations(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.enterpriseIntegrationItems;
  return `<section class="enterprise-integrations-section ${sectionClass(section)}"><div><span class="rendered-kicker">${escapeHtml(labels.integrations)}</span><h2>${escapeHtml(editable.title || labels.enterpriseIntegrationsTitle)}</h2><p>${escapeHtml(editable.text || labels.enterpriseIntegrationsText)}</p></div><div class="enterprise-integration-map">${items.slice(0, 8).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div></section>`;
}

function renderEnterpriseProof(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.enterpriseProofItems;
  return `<section class="enterprise-proof-section ${sectionClass(section)}"><div><span class="rendered-kicker">${escapeHtml(labels.proof)}</span><h2>${escapeHtml(editable.title || labels.enterpriseProofTitle)}</h2><p>${escapeHtml(editable.text || labels.enterpriseProofText)}</p></div><div class="enterprise-proof-grid">${items.slice(0, 6).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div></section>`;
}

function renderEnterprisePricing(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  return `<section class="enterprise-pricing-section ${sectionClass(section)}"><div class="section-heading"><span class="rendered-kicker">${escapeHtml(labels.customPlan)}</span><h2>${escapeHtml(editable.title || labels.enterprisePricingTitle)}</h2><p>${escapeHtml(editable.text || labels.enterprisePricingText)}</p></div>${renderB2BSolutionCatalog(publicCatalogItems(schema).slice(0, 3), schema)}</section>`;
}

function renderEnterpriseDemo(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  return `<section class="enterprise-demo-section ${sectionClass(section)}"><div><span class="rendered-kicker">${escapeHtml(labels.requestDemo)}</span><h2>${escapeHtml(editable.title || labels.enterpriseDemoTitle)}</h2><p>${escapeHtml(editable.text || labels.enterpriseDemoText)}</p></div><button class="rendered-button" data-open-lead type="button">${escapeHtml(editable.primary_button || labels.requestDemo)}</button></section>`;
}

function enterpriseVisualPlaceholder(schema) {
  const initials = String(schema.business?.name || "B2").slice(0, 2).toUpperCase();
  return `<div class="enterprise-visual-placeholder"><span>${escapeHtml(initials)}</span><small>${escapeHtml(catalogLocaleLabels(schema).enterprisePlatform)}</small></div>`;
}

function renderIndustrialHero(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = publicCatalogItems(schema);
  const heroItem = items.find((item) => item.is_featured && item.image_url) || items.find((item) => item.image_url) || items[0];
  const image = editable.image_url || heroItem?.image_url || "";
  return `<section class="industrial-hero ${sectionClass(section)}"><div class="industrial-hero-copy"><span class="rendered-kicker">${escapeHtml(editable.badge || labels.industrialSupplier)}</span><h1>${escapeHtml(editable.headline || schema.business?.name || "")}</h1><p>${escapeHtml(editable.subtitle || schema.business?.description || "")}</p><div class="rendered-actions"><button class="rendered-button" data-open-lead type="button">${escapeHtml(editable.primary_button || labels.requestQuote)}</button><button class="rendered-button secondary" data-open-lead type="button">${escapeHtml(editable.secondary_button || labels.viewSpecs)}</button></div><div class="industrial-proof-strip">${(labels.industrialCertificationItems || []).slice(0, 3).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div></div><div class="industrial-rfq-dashboard"><div class="industrial-dashboard-top"><span></span><span></span><span></span><b>${escapeHtml(labels.requestQuote)}</b></div><div class="industrial-dashboard-body"><div class="industrial-product-visual">${image ? `<img src="${escapeAttribute(image)}" alt="${escapeAttribute(heroItem?.name || schema.business?.name || "")}">` : industrialVisualPlaceholder(schema)}</div><div class="industrial-spec-table">${(items.length ? items : [{ name: labels.industrialCatalogTitle }, { name: labels.certifications }, { name: labels.supplyChain }]).slice(0, 4).map((item, index) => `<div><b>${escapeHtml(item.specs?.sku || `IND-${String(index + 1).padStart(3, "0")}`)}</b><span>${escapeHtml(item.name)}</span><small>${escapeHtml(item.shipping_label || labels.industrialLeadTimes?.[index % (labels.industrialLeadTimes?.length || 1)] || "")}</small></div>`).join("")}</div></div></div></section>`;
}

function renderIndustrialSpecCatalog(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  return `<section class="industrial-catalog-section ${sectionClass(section)}"><div class="industrial-catalog-header"><div><span class="rendered-kicker">${escapeHtml(labels.viewSpecs)}</span><h2>${escapeHtml(editable.title || "")}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div><div class="industrial-catalog-stats"><span>${escapeHtml(labels.quoteRequired)}</span><span>${escapeHtml(labels.moqReady)}</span><span>${escapeHtml(labels.certified)}</span></div></div>${renderIndustrialSupplierCatalog(publicCatalogItems(schema), schema)}</section>`;
}

function renderIndustrialCapabilities(section, schema) {
  return renderCapabilitiesEquipment(section, schema);
}

function renderCapabilitiesEquipment(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.industrialCapabilityItems;
  return `<section class="industrial-capabilities-section capabilities-equipment ${sectionClass(section)}"><div><span class="rendered-kicker">${escapeHtml(labels.capabilities)}</span><h2>${escapeHtml(editable.title || labels.industrialCapabilitiesTitle)}</h2><p>${escapeHtml(editable.text || labels.industrialCapabilitiesText)}</p></div><div class="industrial-capability-board">${items.slice(0, 8).map((item, index) => { const entry = typeof item === "object" ? item : { title: item }; return `<div><b>${escapeHtml(entry.icon || String(index + 1).padStart(2, "0"))}</b><strong>${escapeHtml(entry.title || entry.name || "")}</strong><span>${escapeHtml(entry.description || (index % 2 ? labels.bulkReady : labels.specReady))}</span></div>`; }).join("")}</div></section>`;
}

function renderIndustrialCertifications(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.industrialCertificationItems;
  return `<section class="industrial-certifications-section ${sectionClass(section)}"><div><span class="rendered-kicker">${escapeHtml(labels.certifications)}</span><h2>${escapeHtml(editable.title || labels.industrialCertificationsTitle)}</h2><p>${escapeHtml(editable.text || labels.industrialCertificationsText)}</p></div><div class="industrial-doc-stack">${items.slice(0, 6).map((item, index) => `<article><b>DOC-${String(index + 1).padStart(2, "0")}</b><span>${escapeHtml(item)}</span><small>PDF / QA</small></article>`).join("")}</div></section>`;
}

function renderIndustrialSupplyChain(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.industrialSupplyItems;
  return `<section class="industrial-supply-section ${sectionClass(section)}"><div class="section-heading"><span class="rendered-kicker">${escapeHtml(labels.supplyChain)}</span><h2>${escapeHtml(editable.title || labels.industrialSupplyTitle)}</h2><p>${escapeHtml(editable.text || labels.industrialSupplyText)}</p></div><div class="industrial-supply-line">${items.slice(0, 6).map((item, index) => `<article><small>STEP ${index + 1}</small><strong>${escapeHtml(item)}</strong></article>`).join("")}</div></section>`;
}

function renderIndustrialQuotePanel(section, schema) {
  return renderQuoteRequestForm(section, schema);
}

function renderQuoteRequestForm(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const defaults = schema.business?.selectedLanguage === "es" ? [{ name: "need", label: "Que necesitas" }, { name: "quantity", label: "Cantidad aproximada" }, { name: "target_date", label: "Fecha deseada", type: "date" }, { name: "notes", label: "Notas", type: "textarea" }] : [{ name: "need", label: "What do you need" }, { name: "quantity", label: "Approximate quantity" }, { name: "target_date", label: "Desired date", type: "date" }, { name: "notes", label: "Notes", type: "textarea" }];
  const fields = Array.isArray(editable.fields) && editable.fields.length ? editable.fields : defaults;
  return `<section class="industrial-quote-section quote-request-form ${sectionClass(section)}"><div class="industrial-quote-card"><div><span class="rendered-kicker">${escapeHtml(labels.requestQuote)}</span><h2>${escapeHtml(editable.title || labels.industrialQuoteTitle)}</h2><p>${escapeHtml(editable.text || labels.industrialQuoteText)}</p></div><div class="industrial-rfq-fields">${fields.slice(0, 8).map((field, index) => { const entry = typeof field === "object" ? field : { label: field }; const label = entry.label || entry.name || defaults[index]?.label || "Details"; const control = entry.type === "textarea" ? `<textarea name="${escapeAttribute(entry.name || slugify(label))}" placeholder="${escapeAttribute(entry.placeholder || label)}" ${entry.required ? "required" : ""}></textarea>` : `<input type="${escapeAttribute(entry.type || "text")}" name="${escapeAttribute(entry.name || slugify(label))}" placeholder="${escapeAttribute(entry.placeholder || label)}" ${entry.required ? "required" : ""}>`; return `<label><span>${escapeHtml(label)}</span>${control}</label>`; }).join("")}</div><button class="rendered-button" data-open-lead type="button">${escapeHtml(editable.primary_button || labels.requestQuote)}</button></div></section>`;
}

function industrialVisualPlaceholder(schema) {
  const initials = String(schema.business?.name || "IN").slice(0, 2).toUpperCase();
  return `<div class="industrial-visual-placeholder"><span>${escapeHtml(initials)}</span><small>${escapeHtml(catalogLocaleLabels(schema).industrialSupplier)}</small></div>`;
}

function renderListingHero(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = publicCatalogItems(schema);
  const image = editable.image_url || items.find((item) => item.image_url)?.image_url || "";
  return `<section class="listing-pro-hero ${sectionClass(section)}">
    <div class="listing-pro-copy">
      <span class="rendered-kicker">${escapeHtml(schema.business?.location || labels.areas)}</span>
      <h1>${escapeHtml(editable.headline || schema.business?.name || "")}</h1>
      <p>${escapeHtml(editable.subtitle || schema.business?.description || "")}</p>
      <label class="listing-search-bar"><span>${escapeHtml(labels.search)}</span><input readonly placeholder="${escapeAttribute(editable.search_placeholder || labels.listingSearchPlaceholder)}"><button data-open-lead type="button">${escapeHtml(editable.primary_button || labels.searchListings)}</button></label>
      <div class="listing-quick-filters">${listingCategories(schema).slice(0, 4).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
    </div>
    <div class="listing-pro-stage">
      <div class="listing-map-card">${image ? `<img src="${escapeAttribute(image)}" alt="${escapeAttribute(schema.business?.name || "")}">` : listingVisualPlaceholder(schema)}</div>
      <article class="listing-floating-card"><small>${escapeHtml(labels.featuredListing)}</small><strong>${escapeHtml(items[0]?.name || labels.featuredListingsTitle)}</strong><span>${escapeHtml(items[0]?.shipping_label || labels.listingLocations?.[0] || "")}</span><b>${escapeHtml(items[0]?.price_label || labels.listingPrice)}</b></article>
    </div>
  </section>`;
}

function renderListingFilters(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const categories = Array.isArray(editable.items) && editable.items.length ? editable.items : listingCategories(schema);
  return `<section class="listing-filter-section ${sectionClass(section)}">
    <div><span class="rendered-kicker">${escapeHtml(labels.searchFilters)}</span><h2>${escapeHtml(editable.title || labels.listingFiltersTitle)}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div class="listing-filter-grid">${categories.slice(0, 6).map((item, index) => `<article><strong>${escapeHtml(item)}</strong><span>${escapeHtml(index % 2 ? labels.availableNow : labels.featuredListing)}</span></article>`).join("")}</div>
  </section>`;
}

function renderListingFeatured(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  return `<section class="listing-featured-section ${sectionClass(section)}">
    <div class="section-heading"><span class="rendered-kicker">${escapeHtml(labels.listings)}</span><h2>${escapeHtml(editable.title || labels.featuredListingsTitle)}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    ${renderRealEstateListingCatalog(publicCatalogItems(schema), schema)}
  </section>`;
}

function renderListingAreaPanel(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const locations = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.listingLocations;
  return `<section class="listing-area-section ${sectionClass(section)}">
    <div><span class="rendered-kicker">${escapeHtml(labels.areas)}</span><h2>${escapeHtml(editable.title || labels.listingAreaTitle)}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div class="listing-area-map">${locations.slice(0, 6).map((item, index) => `<span style="--x:${18 + (index * 13) % 64}%;--y:${18 + (index * 19) % 58}%">${escapeHtml(item)}</span>`).join("")}</div>
  </section>`;
}

function renderListingTrust(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.listingTrustItems;
  return `<section class="listing-trust-section ${sectionClass(section)}"><div><span class="rendered-kicker">${escapeHtml(labels.trustTitle)}</span><h2>${escapeHtml(editable.title || labels.listingTrustTitle)}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div><div>${items.slice(0, 6).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div></section>`;
}

function renderListingContact(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  return `<section class="listing-contact-section ${sectionClass(section)}"><div class="listing-contact-card"><span class="rendered-kicker">${escapeHtml(labels.inquireNow)}</span><h2>${escapeHtml(editable.title || labels.listingContactTitle)}</h2><p>${escapeHtml(editable.text || labels.listingContactText)}</p><div class="rendered-actions"><button class="rendered-button" data-open-lead type="button">${escapeHtml(labels.inquireNow)}</button><button class="rendered-button secondary" data-open-lead type="button">${escapeHtml(labels.contact)}</button></div></div></section>`;
}

function renderRealEstateListingCatalog(items, schema) {
  const labels = catalogLocaleLabels(schema);
  return `<div class="catalog-real-estate-listings">${items.map((item, index) => `<article class="${index === 0 ? "featured" : ""}">
    <div class="listing-image">${renderCatalogImage(item)}</div>
    <div class="listing-card-body"><div class="listing-card-top"><small>${escapeHtml(item.deal_label || labels.availableNow)}</small><span>${escapeHtml(item.category || labels.listings)}</span></div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p><div class="listing-spec-row"><span>${escapeHtml(item.shipping_label || labels.listingLocations?.[index % labels.listingLocations.length] || "")}</span><span>${escapeHtml(index % 2 ? "3 bd" : "2 bd")}</span><span>${escapeHtml(index % 3 ? "2 ba" : "1 ba")}</span></div><div class="listing-card-bottom"><strong>${escapeHtml(item.price_label || labels.listingPrice)}</strong><button class="rendered-button" data-open-lead data-item-id="${escapeAttribute(item.id || "")}" data-item-name="${escapeAttribute(item.name)}" type="button">${escapeHtml(item.button_label || labels.inquireNow)}</button></div></div>
  </article>`).join("")}</div>`;
}

function listingCategories(schema) {
  const fromItems = [...new Set(publicCatalogItems(schema).map((item) => item.category).filter(Boolean))];
  const labels = catalogLocaleLabels(schema);
  return [...new Set([...fromItems, ...(labels.listingCategories || [])])];
}

function listingVisualPlaceholder(schema) {
  const initials = String(schema.business?.name || "LS").slice(0, 2).toUpperCase();
  return `<div class="listing-visual-placeholder"><span>${escapeHtml(initials)}</span><small>${escapeHtml(catalogLocaleLabels(schema).listings)}</small></div>`;
}

function renderLeadFunnelOfferCatalog(items, schema) {
  const labels = catalogLocaleLabels(schema);
  return `<div class="catalog-lead-offers">${items.slice(0, 3).map((item, index) => `<article class="${index === 1 ? "featured" : ""}">
    <small>${escapeHtml(index === 1 ? labels.bestValue : labels.offer)}</small>
    <h3>${escapeHtml(item.name)}</h3>
    <p>${escapeHtml(item.description)}</p>
    <ul><li>${escapeHtml(labels.outcomeFocused)}</li><li>${escapeHtml(labels.fastNextStep)}</li><li>${escapeHtml(labels.editableOffer)}</li></ul>
    <button class="rendered-button" data-open-lead data-item-id="${escapeAttribute(item.id || "")}" data-item-name="${escapeAttribute(item.name)}" type="button">${escapeHtml(item.button_label || labels.claimOffer)}</button>
  </article>`).join("")}</div>`;
}

function renderCatalogCard(item, className, badge, schema) {
  const labels = catalogLocaleLabels(schema);
  const commerce = commerceLabels(schema);
  const isMarket = String(className || "").includes("market-card") || isCommerceSite(schema);
  const priceLabel = item.price_label || labels.request;
  const actionAttributes = isMarket
    ? cartTriggerAttributes(item, priceLabel)
    : `data-open-lead data-item-id="${escapeAttribute(item.id || "")}" data-item-name="${escapeAttribute(item.name)}"`;
  const actionLabel = isMarket ? commerce.addToCart : (item.button_label || labels.view);
  return `<article class="${className}" ${catalogSearchAttributes(item)}>
    ${renderCatalogImage(item)}
    ${badge ? `<small>${escapeHtml(badge)}</small>` : ""}
    ${item.category ? `<small>${escapeHtml(item.category)}</small>` : ""}
    <h3>${escapeHtml(item.name)}</h3>
    <p>${escapeHtml(item.description)}</p>
    <div class="market-meta"><span>${"★".repeat(Math.max(1, Math.min(5, Math.round(Number(item.rating) || 4))))} ${escapeHtml(item.rating || "4.6")}</span><span>${escapeHtml(item.shipping_label || labels.fastShip)}</span></div>
    <b>${escapeHtml(priceLabel)}</b>
    <button class="rendered-button" ${actionAttributes} type="button">${escapeHtml(actionLabel)}</button>
  </article>`;
}

function catalogSearchAttributes(item = {}) {
  const searchText = [item.name, item.category, item.description, item.sku].filter(Boolean).join(" ").toLowerCase();
  return `data-catalog-item data-catalog-search="${escapeAttribute(searchText)}" data-catalog-item-category="${escapeAttribute(String(item.category || "").toLowerCase())}"`;
}

function renderCatalogImage(item = {}) {
  return `${renderResilientImage(item.image_url || item.imageUrl, item.name || item.title, item.name || item.title)}${renderImageAttribution(item)}`;
}

function renderImageAttribution(item = {}) {
  const asset = item.image_asset || item.imageAsset || {};
  if (asset.source !== "unsplash_api") return "";
  const photographer = asset.photographer_name || "Unsplash contributor";
  const profileUrl = asset.photographer_profile_url || "https://unsplash.com";
  return `<a class="image-attribution" href="${escapeAttribute(profileUrl)}" target="_blank" rel="noopener noreferrer">Photo: ${escapeHtml(photographer)} / Unsplash</a>`;
}

function renderPortfolioGallery(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = (Array.isArray(editable.items) && editable.items.length ? editable.items : publicCatalogItems(schema)).slice(0, 8);
  const beforeAfter = section.settings?.layout === "before_after" || editable.before_after === true || items.some((item) => item.beforeImageUrl || item.afterImageUrl);
  return `<section class="home-service-gallery portfolio-gallery ${beforeAfter ? "is-before-after" : ""} ${sectionClass(section)}"><div class="section-heading"><span class="rendered-kicker">${escapeHtml(labels.workProof || labels.curated)}</span><h2>${escapeHtml(editable.title || "")}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div><div class="home-service-work-grid">${items.map((item) => `<article>${beforeAfter && (item.beforeImageUrl || item.afterImageUrl) ? `<div class="portfolio-before-after"><figure>${renderResilientImage(item.beforeImageUrl || item.image_url, item.name, `${item.name || "Project"} before`)}<figcaption>${escapeHtml(labels.before)}</figcaption></figure><figure>${renderResilientImage(item.afterImageUrl || item.image_url, item.name, `${item.name || "Project"} after`)}<figcaption>${escapeHtml(labels.after)}</figcaption></figure></div>` : renderResilientImage(item.image_url || item.imageUrl, item.name || item.title, item.name || item.title)}${renderImageAttribution(item)}<div><strong>${escapeHtml(item.name || item.title || "")}</strong>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}${item.price_label || item.price ? `<b>${escapeHtml(item.price_label || item.price)}</b>` : ""}</div></article>`).join("")}</div></section>`;
}

function renderVideoShowcase(section) {
  const editable = section.editable || {};
  const embedUrl = safeVideoEmbedUrl(editable.videoUrl || editable.video_url || editable.url || "");
  if (!embedUrl) return `<section class="video-showcase ${sectionClass(section)}"><div class="section-heading"><h2>${escapeHtml(editable.title || "Video")}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div><p class="video-unavailable">Video URL unavailable or unsupported.</p></section>`;
  return `<section class="video-showcase ${sectionClass(section)}"><div class="section-heading"><h2>${escapeHtml(editable.title || "Video")}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div><div class="video-embed"><iframe src="${escapeAttribute(embedUrl)}" title="${escapeAttribute(editable.title || "Video")}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div></section>`;
}

function renderCourseOffering(section, schema) {
  const editable = section.editable || {};
  const embedUrl = safeVideoEmbedUrl(editable.videoUrl || editable.video_url || "");
  const includes = Array.isArray(editable.includes) ? editable.includes.slice(0, 8) : [];
  const commerce = editable.ctaMode === "purchase" && isCommerceSite(schema);
  const actionAttributes = commerce
    ? cartTriggerAttributes({ ...editable, id: editable.itemId || section.id || editable.title || "course", name: editable.title || "Course" }, editable.priceLabel || "")
    : `data-open-lead data-item-id="${escapeAttribute(editable.itemId || section.id || "course")}" data-item-name="${escapeAttribute(editable.title || "Course")}"`;
  return `<section class="course-offering ${sectionClass(section)}">
    <div class="course-offering-media">
      ${embedUrl
        ? `<div class="video-embed"><iframe src="${escapeAttribute(embedUrl)}" title="${escapeAttribute(editable.title || "Course")}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`
        : `<div class="course-video-placeholder"><span>${escapeHtml(schema.business?.name || "LYRA")}</span><strong>${escapeHtml(editable.title || "Course")}</strong></div>`}
    </div>
    <div class="course-offering-copy">
      <span class="rendered-kicker">${escapeHtml(editable.audience || "Course")}</span>
      <h2>${escapeHtml(editable.title || "Course")}</h2>
      <p>${escapeHtml(editable.description || editable.text || "")}</p>
      ${includes.length ? `<ul>${includes.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
      <div class="course-offering-action">${editable.priceLabel ? `<strong>${escapeHtml(editable.priceLabel)}</strong>` : ""}<button class="rendered-button" ${actionAttributes} type="button">${escapeHtml(editable.ctaLabel || "Learn more")}</button></div>
    </div>
  </section>`;
}

function safeVideoEmbedUrl(value) {
  try {
    const url = new URL(String(value || ""));
    const host = url.hostname.toLowerCase();
    if (host === "youtu.be") { const id = url.pathname.split("/").filter(Boolean)[0]; return /^[a-zA-Z0-9_-]{6,}$/.test(id || "") ? `https://www.youtube.com/embed/${id}` : ""; }
    if (["youtube.com", "www.youtube.com"].includes(host)) { const id = url.searchParams.get("v") || (url.pathname.match(/^\/(?:embed|shorts)\/([a-zA-Z0-9_-]+)/) || [])[1]; return /^[a-zA-Z0-9_-]{6,}$/.test(id || "") ? `https://www.youtube.com/embed/${id}` : ""; }
    if (["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(host)) { const id = (url.pathname.match(/\/(?:video\/)?(\d+)/) || [])[1]; return id ? `https://player.vimeo.com/video/${id}` : ""; }
  } catch (_error) { return ""; }
  return "";
}

function marketplaceCategories(schema) {
  const fromItems = [...new Set(publicCatalogItems(schema).map((item) => item.category).filter(Boolean))];
  const fallback = catalogLocaleLabels(schema).fallbackCategories;
  return fromItems.length ? fromItems : fallback;
}

function catalogLocaleLabels(schema) {
  const language = schema?.business?.selectedLanguage || "en";
  const labels = {
    en: {
      searchFilters: "Search & filters", price: "Price", rating: "Rating", delivery: "Delivery", deal: "Deal", fastShip: "Fast ship",
      search: "Search", searchPlaceholder: "Search products, brands, or categories", searchButton: "Search", shopNow: "Shop now", categories: "Categories", dealTitle: "Top picks", dealText: "Featured products, deals, and fast shipping options.", results: "Results", sortBy: "Sort by", featured: "Featured", secureCheckout: "Secure checkout", support: "Support", easyReturns: "Easy returns", trustTitle: "Marketplace trust", view: "View", request: "Ask now", signature: "Signature", detail: "Detail", curated: "Curated", flagship: "Flagship", premiumSpecs: ["Presentation", "Quality", "Support", "Delivery"],
      searchFilters: "Search & filters", listings: "Listings", areas: "Areas", searchListings: "Search listings", viewListings: "View listings", inquireNow: "Inquire now", featuredListing: "Featured listing", newListing: "New listing", availableNow: "Available now", listingPrice: "Price on request", listingSearchPlaceholder: "Search by location, type, price or keyword", listingFiltersTitle: "Search with the right filters", listingFiltersText: "Help customers narrow options by category, location, price and availability.", featuredListingsTitle: "Featured listings", featuredListingsText: "Active listings with price, location, specs and inquiry CTAs.", listingAreaTitle: "Explore the best areas", listingAreaText: "Area cards and location notes make discovery feel local.", listingTrustTitle: "Confidence before the inquiry", listingTrustText: "Verified details, contact paths and updated availability.", listingContactTitle: "Ask about a listing", listingContactText: "Send listing, budget, location and preferred contact method.", listingCategories: ["Homes", "Rentals", "Commercial", "Land", "Cars", "Featured"], listingLocations: ["Downtown", "North area", "West district", "Near schools", "Waterfront", "Business zone"], listingTrustItems: ["Verified details", "Updated availability", "Clear pricing", "Local support", "Fast response", "Easy comparison"],
      newDrop: "New drop", limitedSelection: "Limited selection", collection: "Collection", provenance: "Provenance", privateInquiry: "Private inquiry", requestPrivateViewing: "Request private viewing", viewCollection: "View collection", priceOnRequest: "Price on request", limitedPiece: "Limited piece", authenticated: "Authenticated", privateService: "Private service", signaturePiece: "Signature piece", luxuryProvenanceTitle: "Provenance, authenticity and service", luxuryProvenanceText: "Confidence signals for high-ticket buyers before they inquire.", luxuryPrivateTitle: "Private appointment", luxuryPrivateText: "Request availability, preferred piece and contact method.", luxuryContactTitle: "Request a private consultation", luxuryContactText: "Send the piece, occasion, preferred timing and contact method.", luxuryProofItems: ["Verified provenance", "Limited availability", "Private advisor", "Insured handling", "Secure inquiry", "Concierge follow-up"], courseAcademy: "Course academy", programs: "Programs", curriculum: "Curriculum", enroll: "Enroll", enrollNow: "Enroll now", viewCurriculum: "View curriculum", coursePrice: "Enrollment price", featuredProgram: "Featured program", beginnerFriendly: "Beginner friendly", certificateReady: "Certificate-ready", outcomes: "Outcomes", instructor: "Instructor", outcomesTitle: "What students should be able to do", outcomesText: "Clear results, skills and confidence markers.", instructorTitle: "Expert guidance", instructorText: "Instructor credibility, method and support.", learningPathItems: ["Foundation", "Practice", "Apply", "Feedback", "Complete", "Next step"], learningOutcomeItems: ["Clear skill progression", "Practical assignments", "Editable curriculum", "Student-ready proof", "Support notes", "Launch-ready offer"], instructorTrustItems: ["Expert-led lessons", "Structured modules", "Support path", "Student outcomes"], educationDurations: ["4 weeks", "6 modules", "Live cohort", "Self-paced"], clinicCare: "Personalized care", treatments: "Treatments", results: "Results", bookConsultation: "Book consultation", viewTreatments: "View treatments", consultationBased: "Consultation-based", popularTreatment: "Popular treatment", specialistLed: "Specialist-led", personalizedPlan: "Personalized plan", treatmentsTitle: "Treatments and services", carePathTitle: "Clear care path", carePathText: "Consultation, plan, treatment and follow-up in one easy path.", carePathItems: ["Consultation", "Personal plan", "Treatment", "Progress check", "Aftercare", "Next visit"], clinicTrustTitle: "Trust and safety first", clinicTrustText: "Credentials, expectations and response details before booking.", clinicTrustItems: ["Specialist guidance", "Safety-first process", "Clear expectations", "Private consultation", "Aftercare notes", "Fast response"], resultsTitle: "Results with realistic expectations", resultsText: "Proof, transformation notes and follow-up details.", resultItems: ["Visible progress", "Before/after proof", "Personal plan", "Follow-up support"], clinicTeamTitle: "Specialists who guide the process", clinicTeamText: "Clinical standards, provider credibility and care philosophy.", clinicTeamItems: ["Credentialed team", "Consultation-first", "Patient education", "Care follow-up"], clinicBookingTitle: "Book a consultation or ask a question", clinicBookingText: "Send the preferred treatment, concern, schedule and contact method.", clinicDurations: ["30 min consult", "45 min session", "Personal plan", "Follow-up ready"], structuredModules: "Structured modules", practicalOutcome: "Practical outcome", flexibleAccess: "Flexible access", collections: "Collections", lookbook: "Lookbook", fit: "Fit guide", drop: "Drop", fitGuide: "Fit guide", fitGuideItems: ["Size and fit notes", "Styling suggestions", "Care details", "Shipping and returns"], fashionCollections: ["New arrivals", "Essentials", "Statement pieces", "Accessories", "Limited drop", "Best sellers"],
      instantAccess: "Instant access", downloadable: "Downloadable content", bonus: "Bonus resources", lifetime: "Lifetime access", getAccess: "Get access", digitalProducts: "Digital products", viewProducts: "View products", modules: "Modules", digitalAccessShort: "Downloads, modules and support notes.", digitalBundleTitle: "Digital offers built to sell", digitalModulesTitle: "What customers get inside", digitalProofTitle: "Trust before checkout", digitalAccessTitle: "Get access and start immediately", digitalAccessText: "Customers know exactly what they receive, how access works and where to get support.", digitalModuleItems: ["Core training", "Downloadable resources", "Templates and tools", "Bonus material", "Access instructions", "Support notes"], digitalProofItems: ["Instant access", "Editable modules", "Clear license", "Support-ready", "Bundle value", "Simple checkout"],
      company: "Company", services: "Services", process: "Process", proof: "Proof", capability: "Capability", requestConsultation: "Request consultation", viewServices: "View services", corporateProcessItems: ["Discovery", "Strategy", "Delivery", "Support"], corporateProofItems: ["Reliable delivery", "Clear communication", "Professional standards"],
      localExperts: "Local experts", callNow: "Call now", freeQuote: "Free quote", before: "Before", after: "After", fastResponse: "Fast local response", serviceAreas: "Service areas", workProof: "Work proof", service: "Service", quoteOnly: "Quote only", serviceAreaReady: "Area-ready", quoteExpectation: "Tell us what you need and get a clear next step.", serviceAreaItems: ["Nearby neighborhoods", "Same-day options", "Emergency calls", "Recurring service", "Licensed work", "Clear estimates"], homeServiceTrustItems: ["Licensed and insured", "Clear estimates", "On-time arrivals", "Before/after proof", "Local references", "Clean follow-up"],
      appointments: "Appointments", availability: "Availability", team: "Team", bookNow: "Book now", nextAvailable: "Next available", slot: "Slot", confirmation: "Confirmation-ready", staffPick: "Staff pick", fromQuote: "From quote", bookingContactFallback: "Confirm the preferred service, time and contact method.", availabilityItems: ["Today / tomorrow windows", "Morning appointments", "Afternoon appointments", "Weekend options", "Consultation calls", "Follow-up visits"], bookingTeamItems: ["Pick a service", "Choose a preferred time", "Receive confirmation", "Arrive prepared"], bookingProofItems: ["Clear durations", "Easy confirmation", "Service details upfront"],
      menu: "Menu", specials: "Specials", hoursLocation: "Hours & location", orderNow: "Order now", viewMenu: "View menu", contact: "Contact", signatureMenu: "Signature menu", popularDish: "Popular dish", chefPick: "Chef pick", pickupDelivery: "Pickup / delivery", quickOrderNote: "Confirm by phone, WhatsApp or email.", editableMenuNote: "Editable from the catalog manager.", menuPrice: "Menu price", restaurantProofItems: ["Editable menu", "Featured combos", "Fast contact"], restaurantCategories: ["Starters", "Mains", "Drinks", "Desserts", "Specials", "Chef picks"], restaurantCategoriesTitle: "Explore the menu by category", restaurantSignatureTitle: "Signature dishes ready to order", restaurantSpecialsTitle: "Specials and combos", restaurantInfoTitle: "Hours, location and service options", restaurantOrderTitle: "Place an order or ask a question", restaurantOrderText: "Send the preferred dishes, pickup or delivery option, and contact method.", restaurantSpecialItems: ["Chef recommendation", "Family combo", "Pickup special", "Delivery-ready"], restaurantInfoItems: ["Open hours", "Pickup", "Delivery", "Dine-in", "Catering", "WhatsApp orders"],
      offer: "Offer", benefits: "Benefits", faq: "FAQ", claimOffer: "Claim this offer", seeProof: "See proof", nextStep: "Next step", quickRequest: "Answer a few details and request the first draft.", bestValue: "Best value", outcomeFocused: "Outcome-focused structure", fastNextStep: "Fast contact path", editableOffer: "Editable offer details", faqAnswer: "This can be adjusted from the editor before publishing.", funnelBenefitsItems: ["Clear promise", "Focused offer", "Simple next step"], funnelProofItems: ["Built around conversion", "Designed for lead capture", "Easy to edit"], funnelFaqItems: ["What happens after I request it?", "Can I change the offer later?", "Can this work without online checkout?"],
      fallbackCategories: ["Electronics", "Home", "Fashion", "Beauty", "Sports", "Deals"],
    },
    es: {
      searchFilters: "Busqueda y filtros", price: "Precio", rating: "Calificacion", delivery: "Entrega", deal: "Oferta", fastShip: "Envio rapido",
      search: "Buscar", searchPlaceholder: "Buscar productos, marcas o categorias", searchButton: "Buscar", shopNow: "Comprar ahora", categories: "Categorias", dealTitle: "Productos destacados", dealText: "Productos destacados, ofertas y opciones de envio rapido.", results: "Resultados", sortBy: "Ordenar por", featured: "Destacados", secureCheckout: "Checkout seguro", support: "Soporte", easyReturns: "Devoluciones simples", trustTitle: "Confianza marketplace", view: "Ver", request: "Consultar", signature: "Principal", detail: "Detalle", curated: "Curado", flagship: "Producto estrella", premiumSpecs: ["Presentacion", "Calidad", "Soporte", "Entrega"],
      searchFilters: "Busqueda y filtros", listings: "Listings", areas: "Zonas", searchListings: "Buscar listings", viewListings: "Ver listings", inquireNow: "Consultar ahora", featuredListing: "Listing destacado", newListing: "Nuevo listing", availableNow: "Disponible", listingPrice: "Precio a consultar", listingSearchPlaceholder: "Buscar por ubicacion, tipo, precio o palabra clave", listingFiltersTitle: "Busca con filtros claros", listingFiltersText: "Ayuda al cliente a comparar por categoria, zona, precio y disponibilidad.", featuredListingsTitle: "Listings destacados", featuredListingsText: "Listings activos con precio, ubicacion, detalles y CTA de consulta.", listingAreaTitle: "Explora las mejores zonas", listingAreaText: "Tarjetas de zona y notas de ubicacion hacen la busqueda mas clara.", listingTrustTitle: "Confianza antes de consultar", listingTrustText: "Detalles verificados, contacto claro y disponibilidad actualizada.", listingContactTitle: "Pregunta por un listing", listingContactText: "Envia el listing, presupuesto, ubicacion y metodo de contacto.", listingCategories: ["Casas", "Alquileres", "Comercial", "Terrenos", "Autos", "Destacados"], listingLocations: ["Centro", "Zona norte", "Distrito oeste", "Cerca de escuelas", "Frente al agua", "Zona comercial"], listingTrustItems: ["Detalles verificados", "Disponibilidad actualizada", "Precios claros", "Soporte local", "Respuesta rapida", "Comparacion simple"],
      newDrop: "Nuevo drop", limitedSelection: "Seleccion limitada", collection: "Coleccion", provenance: "Provenance", privateInquiry: "Consulta privada", requestPrivateViewing: "Solicitar cita privada", viewCollection: "Ver coleccion", priceOnRequest: "Precio bajo consulta", limitedPiece: "Pieza limitada", authenticated: "Autenticada", privateService: "Servicio privado", signaturePiece: "Pieza protagonista", luxuryProvenanceTitle: "Provenance, autenticidad y servicio", luxuryProvenanceText: "Senales de confianza para compradores de alto valor antes de consultar.", luxuryPrivateTitle: "Cita privada", luxuryPrivateText: "Solicita disponibilidad, pieza preferida y metodo de contacto.", luxuryContactTitle: "Solicita una consulta privada", luxuryContactText: "Envia la pieza, ocasion, horario preferido y metodo de contacto.", luxuryProofItems: ["Provenance verificada", "Disponibilidad limitada", "Asesor privado", "Manejo asegurado", "Consulta segura", "Seguimiento concierge"], courseAcademy: "Academia de cursos", programs: "Programas", curriculum: "Curriculum", enroll: "Inscripcion", enrollNow: "Inscribirme", viewCurriculum: "Ver curriculum", coursePrice: "Precio de inscripcion", featuredProgram: "Programa destacado", beginnerFriendly: "Ideal para empezar", certificateReady: "Con certificado", outcomes: "Resultados", instructor: "Instructor", outcomesTitle: "Lo que el estudiante debe lograr", outcomesText: "Resultados, habilidades y senales claras de avance.", instructorTitle: "Guia experta", instructorText: "Credibilidad del instructor, metodo y soporte.", learningPathItems: ["Base", "Practica", "Aplicacion", "Soporte", "Resultado", "Siguiente paso"], learningOutcomeItems: ["Progreso claro", "Practicas accionables", "Curriculum editable", "Prueba para estudiantes", "Notas de soporte", "Oferta lista"], instructorTrustItems: ["Clases expertas", "Modulos estructurados", "Ruta de soporte", "Resultados"], educationDurations: ["4 semanas", "6 modulos", "Cohorte en vivo", "A tu ritmo"], clinicCare: "Cuidado personalizado", treatments: "Tratamientos", results: "Resultados", bookConsultation: "Agendar consulta", viewTreatments: "Ver tratamientos", consultationBased: "Segun consulta", popularTreatment: "Tratamiento popular", specialistLed: "Guiado por especialista", personalizedPlan: "Plan personalizado", treatmentsTitle: "Tratamientos y servicios", carePathTitle: "Ruta clara de atencion", carePathText: "Consulta, plan, tratamiento y seguimiento en un camino simple.", carePathItems: ["Consulta", "Plan personal", "Tratamiento", "Revision", "Cuidado posterior", "Proxima visita"], clinicTrustTitle: "Confianza y seguridad primero", clinicTrustText: "Credenciales, expectativas y respuesta antes de reservar.", clinicTrustItems: ["Guia especializada", "Proceso seguro", "Expectativas claras", "Consulta privada", "Cuidado posterior", "Respuesta rapida"], resultsTitle: "Resultados con expectativas reales", resultsText: "Pruebas, notas de transformacion y seguimiento.", resultItems: ["Progreso visible", "Antes/despues", "Plan personal", "Seguimiento"], clinicTeamTitle: "Especialistas que guian el proceso", clinicTeamText: "Estandares clinicos, credibilidad y filosofia de atencion.", clinicTeamItems: ["Equipo certificado", "Consulta primero", "Educacion al paciente", "Seguimiento"], clinicBookingTitle: "Agenda una consulta o pregunta", clinicBookingText: "Envia tratamiento, inquietud, horario y metodo de contacto.", clinicDurations: ["Consulta 30 min", "Sesion 45 min", "Plan personal", "Seguimiento"], structuredModules: "Modulos estructurados", practicalOutcome: "Resultado practico", flexibleAccess: "Acceso flexible", collections: "Colecciones", lookbook: "Lookbook", fit: "Guia de tallas", drop: "Drop", fitGuide: "Guia de tallas", fitGuideItems: ["Notas de talla y ajuste", "Sugerencias de estilo", "Cuidados de la prenda", "Envios y devoluciones"], fashionCollections: ["Novedades", "Esenciales", "Piezas destacadas", "Accesorios", "Drop limitado", "Mas vendidos"],
      instantAccess: "Acceso inmediato", downloadable: "Contenido descargable", bonus: "Recursos extra", lifetime: "Acceso de por vida", getAccess: "Obtener acceso", digitalProducts: "Productos digitales", viewProducts: "Ver productos", modules: "Modulos", digitalAccessShort: "Descargas, modulos y notas de soporte.", digitalBundleTitle: "Ofertas digitales listas para vender", digitalModulesTitle: "Que recibe el cliente", digitalProofTitle: "Confianza antes del checkout", digitalAccessTitle: "Obten acceso y empieza de inmediato", digitalAccessText: "El cliente sabe exactamente que recibe, como entra y donde pide soporte.", digitalModuleItems: ["Entrenamiento principal", "Recursos descargables", "Plantillas y herramientas", "Material bonus", "Instrucciones de acceso", "Notas de soporte"], digitalProofItems: ["Acceso inmediato", "Modulos editables", "Licencia clara", "Soporte listo", "Valor del bundle", "Checkout simple"],
      company: "Empresa", services: "Servicios", process: "Proceso", proof: "Prueba", capability: "Capacidad", requestConsultation: "Solicitar consulta", viewServices: "Ver servicios", corporateProcessItems: ["Diagnostico", "Estrategia", "Entrega", "Soporte"], corporateProofItems: ["Entrega confiable", "Comunicacion clara", "Estandares profesionales"],
      localExperts: "Expertos locales", callNow: "Llamar ahora", freeQuote: "Cotizacion gratis", before: "Antes", after: "Despues", fastResponse: "Respuesta local rapida", serviceAreas: "Areas de servicio", workProof: "Trabajos", service: "Servicio", quoteOnly: "Cotizacion", serviceAreaReady: "Disponible por zona", quoteExpectation: "Cuenta que necesitas y recibe el siguiente paso claro.", serviceAreaItems: ["Zonas cercanas", "Opciones el mismo dia", "Emergencias", "Servicio recurrente", "Trabajo autorizado", "Estimados claros"], homeServiceTrustItems: ["Licencia y seguro", "Estimados claros", "Llegadas puntuales", "Antes/despues", "Referencias locales", "Seguimiento limpio"],
      appointments: "Citas", availability: "Disponibilidad", team: "Equipo", bookNow: "Reservar ahora", nextAvailable: "Proxima disponibilidad", slot: "Horario", confirmation: "Listo para confirmar", staffPick: "Recomendado", fromQuote: "Desde cotizacion", bookingContactFallback: "Confirma el servicio, horario y metodo de contacto preferido.", availabilityItems: ["Hoy / manana", "Citas en la manana", "Citas en la tarde", "Opciones fin de semana", "Consultas por llamada", "Visitas de seguimiento"], bookingTeamItems: ["Elige un servicio", "Selecciona horario preferido", "Recibe confirmacion", "Llega preparado"], bookingProofItems: ["Duraciones claras", "Confirmacion simple", "Detalles antes de reservar"],
      menu: "Menu", specials: "Especiales", hoursLocation: "Horarios y ubicacion", orderNow: "Ordenar ahora", viewMenu: "Ver menu", contact: "Contacto", signatureMenu: "Menu destacado", popularDish: "Popular", chefPick: "Chef recomienda", pickupDelivery: "Pickup / delivery", quickOrderNote: "Confirma por telefono, WhatsApp o email.", editableMenuNote: "Editable desde el catalog manager.", menuPrice: "Precio del menu", restaurantProofItems: ["Menu editable", "Combos destacados", "Contacto rapido"], restaurantCategories: ["Entradas", "Platos fuertes", "Bebidas", "Postres", "Especiales", "Favoritos"], restaurantCategoriesTitle: "Explora el menu por categoria", restaurantSignatureTitle: "Platos destacados listos para pedir", restaurantSpecialsTitle: "Especiales y combos", restaurantInfoTitle: "Horarios, ubicacion y opciones de servicio", restaurantOrderTitle: "Haz un pedido o pregunta", restaurantOrderText: "Envia platos preferidos, opcion de pickup o delivery y metodo de contacto.", restaurantSpecialItems: ["Recomendacion del chef", "Combo familiar", "Especial pickup", "Listo para delivery"], restaurantInfoItems: ["Horarios", "Pickup", "Delivery", "En el local", "Catering", "Pedidos por WhatsApp"],
      offer: "Oferta", benefits: "Beneficios", faq: "Preguntas", claimOffer: "Solicitar esta oferta", seeProof: "Ver pruebas", nextStep: "Siguiente paso", quickRequest: "Responde unos datos y solicita la primera version.", bestValue: "Mejor opcion", outcomeFocused: "Estructura enfocada en resultados", fastNextStep: "Contacto rapido", editableOffer: "Oferta editable", faqAnswer: "Esto se puede ajustar desde el editor antes de publicar.", funnelBenefitsItems: ["Promesa clara", "Oferta enfocada", "Siguiente paso simple"], funnelProofItems: ["Construida para convertir", "Disenada para captar clientes", "Facil de editar"], funnelFaqItems: ["Que pasa despues de solicitar?", "Puedo cambiar la oferta luego?", "Sirve sin checkout online?"],
      fallbackCategories: ["Electronica", "Hogar", "Moda", "Belleza", "Deportes", "Ofertas"],
    },
    fr: {
      searchFilters: "Recherche et filtres", price: "Prix", rating: "Note", delivery: "Livraison", deal: "Offre", fastShip: "Livraison rapide",
      search: "Recherche", searchPlaceholder: "Rechercher produits, marques ou categories", searchButton: "Rechercher", shopNow: "Acheter", categories: "Categories", dealTitle: "Selections", dealText: "Produits mis en avant, offres et options de livraison rapide.", results: "Resultats", sortBy: "Trier par", featured: "Mis en avant", secureCheckout: "Paiement securise", support: "Support", easyReturns: "Retours simples", trustTitle: "Confiance marketplace", view: "Voir", request: "Demander", signature: "Signature", detail: "Detail", curated: "Soigne", flagship: "Produit phare", premiumSpecs: ["Presentation", "Qualite", "Support", "Livraison"],
      searchFilters: "Recherche et filtres", listings: "Annonces", areas: "Zones", searchListings: "Rechercher", viewListings: "Voir les annonces", inquireNow: "Demander", featuredListing: "Annonce en avant", newListing: "Nouvelle annonce", availableNow: "Disponible", listingPrice: "Prix sur demande", listingSearchPlaceholder: "Rechercher par lieu, type, prix ou mot-cle", listingFiltersTitle: "Rechercher avec les bons filtres", listingFiltersText: "Aidez les clients a comparer par categorie, zone, prix et disponibilite.", featuredListingsTitle: "Annonces en avant", featuredListingsText: "Annonces actives avec prix, localisation, details et CTA.", listingAreaTitle: "Explorer les meilleures zones", listingAreaText: "Cartes de zones et notes locales pour clarifier la recherche.", listingTrustTitle: "Confiance avant la demande", listingTrustText: "Details verifies, contact clair et disponibilite mise a jour.", listingContactTitle: "Demander une annonce", listingContactText: "Envoyez l'annonce, le budget, la localisation et le contact prefere.", listingCategories: ["Maisons", "Locations", "Commercial", "Terrain", "Voitures", "En avant"], listingLocations: ["Centre", "Zone nord", "Quartier ouest", "Pres des ecoles", "Bord de l'eau", "Zone business"], listingTrustItems: ["Details verifies", "Disponibilite a jour", "Prix clairs", "Support local", "Reponse rapide", "Comparaison simple"],
      newDrop: "Nouvelle collection", courseAcademy: "Academie de cours", programs: "Programmes", curriculum: "Programme", enroll: "Inscription", enrollNow: "S'inscrire", viewCurriculum: "Voir le programme", coursePrice: "Prix d'inscription", featuredProgram: "Programme phare", beginnerFriendly: "Pour debuter", certificateReady: "Certificat pret", outcomes: "Resultats", instructor: "Instructeur", outcomesTitle: "Ce que l'etudiant doit savoir faire", outcomesText: "Resultats, competences et progression claire.", instructorTitle: "Guidage expert", instructorText: "Credibilite, methode et support.", learningPathItems: ["Bases", "Pratique", "Application", "Support", "Resultat", "Suite"], learningOutcomeItems: ["Progression claire", "Exercices pratiques", "Programme modifiable", "Preuve etudiante", "Notes support", "Offre prete"], instructorTrustItems: ["Cours experts", "Modules structures", "Support", "Resultats"], educationDurations: ["4 semaines", "6 modules", "Cohorte live", "A son rythme"], clinicCare: "Soin personnalise", treatments: "Soins", results: "Resultats", bookConsultation: "Reserver une consultation", viewTreatments: "Voir les soins", consultationBased: "Selon consultation", popularTreatment: "Soin populaire", specialistLed: "Guide par specialiste", personalizedPlan: "Plan personnalise", treatmentsTitle: "Soins et services", carePathTitle: "Parcours de soin clair", carePathText: "Consultation, plan, soin et suivi dans un parcours simple.", carePathItems: ["Consultation", "Plan personnel", "Soin", "Suivi", "Apres-soin", "Prochaine visite"], clinicTrustTitle: "Confiance et securite", clinicTrustText: "Diplomes, attentes et reponse avant reservation.", clinicTrustItems: ["Guidage specialise", "Processus securise", "Attentes claires", "Consultation privee", "Apres-soin", "Reponse rapide"], resultsTitle: "Resultats realistes", resultsText: "Preuves, notes de transformation et suivi.", resultItems: ["Progres visible", "Avant/apres", "Plan personnel", "Suivi"], clinicTeamTitle: "Specialistes qui guident le processus", clinicTeamText: "Standards cliniques, credibilite et philosophie de soin.", clinicTeamItems: ["Equipe certifiee", "Consultation d'abord", "Education patient", "Suivi"], clinicBookingTitle: "Reserver ou poser une question", clinicBookingText: "Envoyez soin, besoin, horaire et contact.", clinicDurations: ["Consultation 30 min", "Session 45 min", "Plan personnel", "Suivi pret"], structuredModules: "Modules structures", practicalOutcome: "Resultat pratique", flexibleAccess: "Acces flexible", collections: "Collections", lookbook: "Lookbook", fit: "Guide des tailles", drop: "Drop", fitGuide: "Guide des tailles", fitGuideItems: ["Notes de taille", "Suggestions de style", "Conseils d'entretien", "Livraison et retours"], fashionCollections: ["Nouveautes", "Essentiels", "Pieces fortes", "Accessoires", "Drop limite", "Meilleures ventes"],
      instantAccess: "Acces immediat", downloadable: "Contenu telechargeable", bonus: "Ressources bonus", lifetime: "Acces a vie", getAccess: "Obtenir l'acces", digitalProducts: "Produits digitaux", viewProducts: "Voir les produits", modules: "Modules", digitalAccessShort: "Telechargements, modules et notes de support.", digitalBundleTitle: "Offres digitales pretes a vendre", digitalModulesTitle: "Ce que le client recoit", digitalProofTitle: "Confiance avant paiement", digitalAccessTitle: "Obtenir l'acces et commencer tout de suite", digitalAccessText: "Le client sait exactement ce qu'il recoit, comment acceder et ou demander du support.", digitalModuleItems: ["Formation principale", "Ressources telechargeables", "Modeles et outils", "Bonus", "Instructions d'acces", "Notes de support"], digitalProofItems: ["Acces immediat", "Modules modifiables", "Licence claire", "Support pret", "Valeur du bundle", "Paiement simple"],
      company: "Entreprise", services: "Services", process: "Processus", proof: "Preuve", capability: "Capacite", requestConsultation: "Demander une consultation", viewServices: "Voir les services", corporateProcessItems: ["Diagnostic", "Strategie", "Livraison", "Support"], corporateProofItems: ["Livraison fiable", "Communication claire", "Standards professionnels"],
      localExperts: "Experts locaux", callNow: "Appeler", freeQuote: "Devis gratuit", before: "Avant", after: "Apres", fastResponse: "Reponse locale rapide", serviceAreas: "Zones desservies", workProof: "Realisations", service: "Service", quoteOnly: "Sur devis", serviceAreaReady: "Zone couverte", quoteExpectation: "Expliquez le besoin et recevez une prochaine etape claire.", serviceAreaItems: ["Quartiers proches", "Options le jour meme", "Urgences", "Service recurrent", "Travail autorise", "Devis clairs"], homeServiceTrustItems: ["Assure et autorise", "Devis clairs", "Arrivees ponctuelles", "Avant/apres", "References locales", "Suivi propre"],
      appointments: "Rendez-vous", availability: "Disponibilite", team: "Equipe", bookNow: "Reserver", nextAvailable: "Prochaine disponibilite", slot: "Creneau", confirmation: "Pret a confirmer", staffPick: "Recommande", fromQuote: "Sur devis", bookingContactFallback: "Confirmez le service, le creneau et le mode de contact prefere.", availabilityItems: ["Aujourd'hui / demain", "Matin", "Apres-midi", "Week-end", "Appels de consultation", "Suivis"], bookingTeamItems: ["Choisir un service", "Choisir un creneau", "Recevoir confirmation", "Arriver prepare"], bookingProofItems: ["Durees claires", "Confirmation simple", "Details avant reservation"],
      menu: "Menu", specials: "Specialites", hoursLocation: "Horaires et adresse", orderNow: "Commander", viewMenu: "Voir le menu", contact: "Contact", signatureMenu: "Menu signature", popularDish: "Populaire", chefPick: "Choix du chef", pickupDelivery: "Retrait / livraison", quickOrderNote: "Confirmation par telephone, WhatsApp ou email.", editableMenuNote: "Modifiable depuis le gestionnaire de catalogue.", menuPrice: "Prix du menu", restaurantProofItems: ["Menu modifiable", "Menus en avant", "Contact rapide"], restaurantCategories: ["Entrees", "Plats", "Boissons", "Desserts", "Specialites", "Choix du chef"], restaurantCategoriesTitle: "Explorer le menu par categorie", restaurantSignatureTitle: "Plats signature prets a commander", restaurantSpecialsTitle: "Offres et menus", restaurantInfoTitle: "Horaires, adresse et options de service", restaurantOrderTitle: "Commander ou poser une question", restaurantOrderText: "Envoyez les plats souhaites, retrait ou livraison et le contact prefere.", restaurantSpecialItems: ["Recommandation du chef", "Menu famille", "Offre pickup", "Pret pour livraison"], restaurantInfoItems: ["Horaires", "Retrait", "Livraison", "Sur place", "Traiteur", "Commandes WhatsApp"],
      offer: "Offre", benefits: "Benefices", faq: "FAQ", claimOffer: "Demander cette offre", seeProof: "Voir les preuves", nextStep: "Etape suivante", quickRequest: "Repondez a quelques details et demandez la premiere version.", bestValue: "Meilleure option", outcomeFocused: "Structure orientee resultat", fastNextStep: "Contact rapide", editableOffer: "Offre modifiable", faqAnswer: "Cela peut etre ajuste dans l'editeur avant publication.", funnelBenefitsItems: ["Promesse claire", "Offre ciblee", "Prochaine etape simple"], funnelProofItems: ["Concu pour convertir", "Pense pour capter des prospects", "Facile a modifier"], funnelFaqItems: ["Que se passe-t-il apres la demande?", "Puis-je modifier l'offre ensuite?", "Cela fonctionne sans paiement en ligne?"],
      fallbackCategories: ["Electronique", "Maison", "Mode", "Beaute", "Sport", "Offres"],
    },
    pt: {
      searchFilters: "Busca e filtros", price: "Preco", rating: "Avaliacao", delivery: "Entrega", deal: "Oferta", fastShip: "Entrega rapida",
      search: "Buscar", searchPlaceholder: "Buscar produtos, marcas ou categorias", searchButton: "Buscar", shopNow: "Comprar agora", categories: "Categorias", dealTitle: "Destaques", dealText: "Produtos em destaque, ofertas e opcoes de entrega rapida.", results: "Resultados", sortBy: "Ordenar por", featured: "Destaques", secureCheckout: "Checkout seguro", support: "Suporte", easyReturns: "Devolucoes simples", trustTitle: "Confianca marketplace", view: "Ver", request: "Consultar", signature: "Principal", detail: "Detalhe", curated: "Curado", flagship: "Produto principal", premiumSpecs: ["Apresentacao", "Qualidade", "Suporte", "Entrega"],
      searchFilters: "Busca e filtros", listings: "Anuncios", areas: "Areas", searchListings: "Buscar anuncios", viewListings: "Ver anuncios", inquireNow: "Consultar agora", featuredListing: "Anuncio destaque", newListing: "Novo anuncio", availableNow: "Disponivel", listingPrice: "Preco sob consulta", listingSearchPlaceholder: "Buscar por localizacao, tipo, preco ou palavra-chave", listingFiltersTitle: "Busca com filtros claros", listingFiltersText: "Ajude o cliente a comparar por categoria, area, preco e disponibilidade.", featuredListingsTitle: "Anuncios em destaque", featuredListingsText: "Anuncios ativos com preco, localizacao, detalhes e CTA de consulta.", listingAreaTitle: "Explore as melhores areas", listingAreaText: "Cards de area e notas locais deixam a busca clara.", listingTrustTitle: "Confianca antes da consulta", listingTrustText: "Detalhes verificados, contato claro e disponibilidade atualizada.", listingContactTitle: "Perguntar sobre um anuncio", listingContactText: "Envie o anuncio, orcamento, localizacao e metodo de contato.", listingCategories: ["Casas", "Alugueis", "Comercial", "Terrenos", "Carros", "Destaques"], listingLocations: ["Centro", "Zona norte", "Distrito oeste", "Perto de escolas", "Frente a agua", "Zona comercial"], listingTrustItems: ["Detalhes verificados", "Disponibilidade atualizada", "Precos claros", "Suporte local", "Resposta rapida", "Comparacao simples"],
      newDrop: "Novo drop", courseAcademy: "Academia de cursos", programs: "Programas", curriculum: "Curriculo", enroll: "Inscricao", enrollNow: "Inscrever-se", viewCurriculum: "Ver curriculo", coursePrice: "Preco de inscricao", featuredProgram: "Programa destaque", beginnerFriendly: "Para iniciantes", certificateReady: "Com certificado", outcomes: "Resultados", instructor: "Instrutor", outcomesTitle: "O que o aluno deve conseguir fazer", outcomesText: "Resultados, habilidades e progresso claro.", instructorTitle: "Guia especialista", instructorText: "Credibilidade, metodo e suporte.", learningPathItems: ["Base", "Pratica", "Aplicacao", "Suporte", "Resultado", "Proximo passo"], learningOutcomeItems: ["Progressao clara", "Atividades praticas", "Curriculo editavel", "Prova para alunos", "Notas de suporte", "Oferta pronta"], instructorTrustItems: ["Aulas especialistas", "Modulos estruturados", "Suporte", "Resultados"], educationDurations: ["4 semanas", "6 modulos", "Turma ao vivo", "No seu ritmo"], clinicCare: "Cuidado personalizado", treatments: "Tratamentos", results: "Resultados", bookConsultation: "Agendar consulta", viewTreatments: "Ver tratamentos", consultationBased: "Sob consulta", popularTreatment: "Tratamento popular", specialistLed: "Com especialista", personalizedPlan: "Plano personalizado", treatmentsTitle: "Tratamentos e servicos", carePathTitle: "Caminho de cuidado claro", carePathText: "Consulta, plano, tratamento e acompanhamento em um caminho simples.", carePathItems: ["Consulta", "Plano pessoal", "Tratamento", "Revisao", "Pos-cuidado", "Proxima visita"], clinicTrustTitle: "Confianca e seguranca", clinicTrustText: "Credenciais, expectativas e resposta antes de agendar.", clinicTrustItems: ["Guia especializada", "Processo seguro", "Expectativas claras", "Consulta privada", "Pos-cuidado", "Resposta rapida"], resultsTitle: "Resultados realistas", resultsText: "Provas, notas de transformacao e acompanhamento.", resultItems: ["Progresso visivel", "Antes/depois", "Plano pessoal", "Acompanhamento"], clinicTeamTitle: "Especialistas que guiam o processo", clinicTeamText: "Padroes clinicos, credibilidade e filosofia de cuidado.", clinicTeamItems: ["Equipe certificada", "Consulta primeiro", "Educacao do paciente", "Acompanhamento"], clinicBookingTitle: "Agende uma consulta ou pergunte", clinicBookingText: "Envie tratamento, duvida, horario e contato.", clinicDurations: ["Consulta 30 min", "Sessao 45 min", "Plano pessoal", "Acompanhamento"], structuredModules: "Modulos estruturados", practicalOutcome: "Resultado pratico", flexibleAccess: "Acesso flexivel", collections: "Colecoes", lookbook: "Lookbook", fit: "Guia de tamanhos", drop: "Drop", fitGuide: "Guia de tamanhos", fitGuideItems: ["Notas de tamanho e caimento", "Sugestoes de estilo", "Cuidados com a peca", "Envios e devolucoes"], fashionCollections: ["Novidades", "Essenciais", "Pecas destaque", "Acessorios", "Drop limitado", "Mais vendidos"],
      instantAccess: "Acesso imediato", downloadable: "Conteudo para download", bonus: "Recursos bonus", lifetime: "Acesso vitalicio", getAccess: "Obter acesso", digitalProducts: "Produtos digitais", viewProducts: "Ver produtos", modules: "Modulos", digitalAccessShort: "Downloads, modulos e notas de suporte.", digitalBundleTitle: "Ofertas digitais prontas para vender", digitalModulesTitle: "O que o cliente recebe", digitalProofTitle: "Confianca antes do checkout", digitalAccessTitle: "Obtenha acesso e comece imediatamente", digitalAccessText: "O cliente sabe exatamente o que recebe, como acessar e onde pedir suporte.", digitalModuleItems: ["Treinamento principal", "Recursos para download", "Templates e ferramentas", "Material bonus", "Instrucoes de acesso", "Notas de suporte"], digitalProofItems: ["Acesso imediato", "Modulos editaveis", "Licenca clara", "Suporte pronto", "Valor do bundle", "Checkout simples"],
      company: "Empresa", services: "Servicos", process: "Processo", proof: "Prova", capability: "Capacidade", requestConsultation: "Solicitar consulta", viewServices: "Ver servicos", corporateProcessItems: ["Diagnostico", "Estrategia", "Entrega", "Suporte"], corporateProofItems: ["Entrega confiavel", "Comunicacao clara", "Padroes profissionais"],
      localExperts: "Especialistas locais", callNow: "Ligar agora", freeQuote: "Orcamento gratis", before: "Antes", after: "Depois", fastResponse: "Resposta local rapida", serviceAreas: "Areas atendidas", workProof: "Trabalhos", service: "Servico", quoteOnly: "Orcamento", serviceAreaReady: "Area atendida", quoteExpectation: "Conte o que precisa e receba o proximo passo claro.", serviceAreaItems: ["Bairros proximos", "Opcoes no mesmo dia", "Emergencias", "Servico recorrente", "Trabalho autorizado", "Estimativas claras"], homeServiceTrustItems: ["Licenciado e segurado", "Estimativas claras", "Pontualidade", "Antes/depois", "Referencias locais", "Acompanhamento claro"],
      appointments: "Agendamentos", availability: "Disponibilidade", team: "Equipe", bookNow: "Agendar agora", nextAvailable: "Proxima disponibilidade", slot: "Horario", confirmation: "Pronto para confirmar", staffPick: "Recomendado", fromQuote: "Sob orcamento", bookingContactFallback: "Confirme o servico, horario e metodo de contato preferido.", availabilityItems: ["Hoje / amanha", "Horarios de manha", "Horarios a tarde", "Fim de semana", "Chamadas de consulta", "Retornos"], bookingTeamItems: ["Escolha um servico", "Escolha horario preferido", "Receba confirmacao", "Chegue preparado"], bookingProofItems: ["Duracoes claras", "Confirmacao simples", "Detalhes antes de agendar"],
      menu: "Menu", specials: "Especiais", hoursLocation: "Horarios e localizacao", orderNow: "Pedir agora", viewMenu: "Ver menu", contact: "Contato", signatureMenu: "Menu destaque", popularDish: "Popular", chefPick: "Chef indica", pickupDelivery: "Pickup / delivery", quickOrderNote: "Confirme por telefone, WhatsApp ou email.", editableMenuNote: "Editavel no gerenciador de catalogo.", menuPrice: "Preco do menu", restaurantProofItems: ["Menu editavel", "Combos destaque", "Contato rapido"], restaurantCategories: ["Entradas", "Pratos principais", "Bebidas", "Sobremesas", "Especiais", "Chef indica"], restaurantCategoriesTitle: "Explore o menu por categoria", restaurantSignatureTitle: "Pratos destaque prontos para pedir", restaurantSpecialsTitle: "Especiais e combos", restaurantInfoTitle: "Horarios, localizacao e servico", restaurantOrderTitle: "Fazer pedido ou perguntar", restaurantOrderText: "Envie os pratos desejados, pickup ou delivery e metodo de contato.", restaurantSpecialItems: ["Indicacao do chef", "Combo familia", "Especial pickup", "Pronto para delivery"], restaurantInfoItems: ["Horarios", "Pickup", "Delivery", "No local", "Catering", "Pedidos por WhatsApp"],
      offer: "Oferta", benefits: "Beneficios", faq: "FAQ", claimOffer: "Solicitar esta oferta", seeProof: "Ver provas", nextStep: "Proximo passo", quickRequest: "Responda alguns detalhes e solicite a primeira versao.", bestValue: "Melhor opcao", outcomeFocused: "Estrutura focada em resultado", fastNextStep: "Contato rapido", editableOffer: "Oferta editavel", faqAnswer: "Isso pode ser ajustado no editor antes de publicar.", funnelBenefitsItems: ["Promessa clara", "Oferta focada", "Proximo passo simples"], funnelProofItems: ["Criado para converter", "Pensado para capturar leads", "Facil de editar"], funnelFaqItems: ["O que acontece depois da solicitacao?", "Posso mudar a oferta depois?", "Funciona sem checkout online?"],
      fallbackCategories: ["Eletronicos", "Casa", "Moda", "Beleza", "Esportes", "Ofertas"],
    },
  };
  const professionalLabels = {
    en: {
      professionalFirm: "Professional firm", scheduleConsultation: "Schedule consultation", consultationBased: "Consultation-based", confidential: "Confidential", seniorAdvisor: "Senior advisor", caseReview: "Case review", businessReady: "Business-ready", practiceAreasTitle: "Practice areas and services", professionalProcessTitle: "A clear advisory process", professionalProcessText: "Review, strategy, action plan and follow-up.", professionalProcessItems: ["Initial review", "Document check", "Strategy call", "Action plan", "Follow-up", "Ongoing advisory"], professionalProofTitle: "Proof clients need before contact", professionalProofText: "Credentials, confidentiality and professional standards.", professionalProofItems: ["Confidential process", "Senior review", "Clear next steps", "Business-ready advice", "Document support", "Responsive contact"], professionalTeamTitle: "Advisors who handle the details", professionalTeamText: "Show the people and standards behind the service.", professionalTeamItems: ["Experienced advisors", "Private consultation", "Clear documentation", "Follow-through"], professionalFaqTitle: "Questions before consultation", professionalFaqItems: ["What should I prepare?", "How does the first consultation work?", "Can you review documents?", "Can this become ongoing advisory?"], professionalConsultationTitle: "Request a consultation or document review", professionalConsultationText: "Send the service needed, urgency, preferred schedule and contact method.", professionalEngagements: ["Initial review", "Document review", "Strategy call", "Ongoing advisory"],
    },
    es: {
      professionalFirm: "Firma profesional", scheduleConsultation: "Agendar consulta", consultationBased: "Segun consulta", confidential: "Confidencial", seniorAdvisor: "Asesor senior", caseReview: "Revision de caso", businessReady: "Listo para empresa", practiceAreasTitle: "Areas de practica y servicios", professionalProcessTitle: "Un proceso de asesoria claro", professionalProcessText: "Revision, estrategia, plan de accion y seguimiento.", professionalProcessItems: ["Revision inicial", "Chequeo documental", "Llamada estrategica", "Plan de accion", "Seguimiento", "Asesoria continua"], professionalProofTitle: "Confianza antes del contacto", professionalProofText: "Credenciales, confidencialidad y estandares profesionales.", professionalProofItems: ["Proceso confidencial", "Revision senior", "Pasos claros", "Asesoria empresarial", "Soporte documental", "Contacto rapido"], professionalTeamTitle: "Asesores que manejan los detalles", professionalTeamText: "Muestra las personas y estandares detras del servicio.", professionalTeamItems: ["Asesores expertos", "Consulta privada", "Documentacion clara", "Seguimiento"], professionalFaqTitle: "Preguntas antes de la consulta", professionalFaqItems: ["Que debo preparar?", "Como funciona la primera consulta?", "Pueden revisar documentos?", "Puede ser asesoria continua?"], professionalConsultationTitle: "Solicita una consulta o revision documental", professionalConsultationText: "Envia el servicio requerido, urgencia, horario y metodo de contacto.", professionalEngagements: ["Revision inicial", "Revision documental", "Llamada estrategica", "Asesoria continua"],
    },
    fr: {
      professionalFirm: "Cabinet professionnel", scheduleConsultation: "Reserver une consultation", consultationBased: "Selon consultation", confidential: "Confidentiel", seniorAdvisor: "Conseiller senior", caseReview: "Analyse du dossier", businessReady: "Pret pour entreprise", practiceAreasTitle: "Services et domaines d'expertise", professionalProcessTitle: "Un processus de conseil clair", professionalProcessText: "Analyse, strategie, plan d'action et suivi.", professionalProcessItems: ["Analyse initiale", "Verification documents", "Appel strategie", "Plan d'action", "Suivi", "Conseil continu"], professionalProofTitle: "Preuves avant contact", professionalProofText: "Credentials, confidentialite et standards professionnels.", professionalProofItems: ["Processus confidentiel", "Analyse senior", "Etapes claires", "Conseil entreprise", "Support documents", "Contact rapide"], professionalTeamTitle: "Des conseillers qui gerent les details", professionalTeamText: "Montrez les personnes et standards derriere le service.", professionalTeamItems: ["Conseillers experimentes", "Consultation privee", "Documentation claire", "Suivi"], professionalFaqTitle: "Questions avant la consultation", professionalFaqItems: ["Que dois-je preparer?", "Comment se passe la premiere consultation?", "Pouvez-vous analyser des documents?", "Accompagnement continu possible?"], professionalConsultationTitle: "Demander une consultation ou analyse", professionalConsultationText: "Envoyez le service requis, l'urgence, le moment prefere et le contact.", professionalEngagements: ["Analyse initiale", "Analyse documents", "Appel strategie", "Conseil continu"],
    },
    pt: {
      professionalFirm: "Firma profissional", scheduleConsultation: "Agendar consulta", consultationBased: "Sob consulta", confidential: "Confidencial", seniorAdvisor: "Consultor senior", caseReview: "Revisao do caso", businessReady: "Pronto para empresa", practiceAreasTitle: "Areas de atuacao e servicos", professionalProcessTitle: "Um processo de consultoria claro", professionalProcessText: "Revisao, estrategia, plano de acao e acompanhamento.", professionalProcessItems: ["Revisao inicial", "Analise documental", "Chamada estrategica", "Plano de acao", "Acompanhamento", "Consultoria continua"], professionalProofTitle: "Confianca antes do contato", professionalProofText: "Credenciais, confidencialidade e padroes profissionais.", professionalProofItems: ["Processo confidencial", "Revisao senior", "Passos claros", "Consultoria empresarial", "Suporte documental", "Contato rapido"], professionalTeamTitle: "Consultores que cuidam dos detalhes", professionalTeamText: "Mostre pessoas e padroes por tras do servico.", professionalTeamItems: ["Consultores experientes", "Consulta privada", "Documentacao clara", "Acompanhamento"], professionalFaqTitle: "Perguntas antes da consulta", professionalFaqItems: ["O que devo preparar?", "Como funciona a primeira consulta?", "Podem revisar documentos?", "Pode virar consultoria continua?"], professionalConsultationTitle: "Solicite consulta ou revisao documental", professionalConsultationText: "Envie o servico, urgencia, horario preferido e contato.", professionalEngagements: ["Revisao inicial", "Revisao documental", "Chamada estrategica", "Consultoria continua"],
    },
  };
  const enterpriseLabels = {
    en: { enterprisePlatform: "Enterprise platform", requestDemo: "Request demo", viewSolutions: "View solutions", solutions: "Solutions", useCases: "Use cases", integrations: "Integrations", customPlan: "Custom plan", enterpriseReady: "Enterprise-ready", integrationReady: "Integration-ready", roiFocused: "ROI-focused", enterpriseSolutionsTitle: "Solutions built for operational teams", enterpriseUseCasesTitle: "Use cases by workflow", enterpriseUseCasesText: "Show how the solution fits key business teams.", enterpriseUseCaseItems: ["Automate manual work", "Centralize reporting", "Connect business tools", "Improve team visibility", "Reduce operational delays", "Scale service delivery"], enterpriseIntegrationsTitle: "Integrations and rollout", enterpriseIntegrationsText: "APIs, CRM, ERP, payments, analytics and support workflows.", enterpriseIntegrationItems: ["CRM", "ERP", "Payments", "Analytics", "Support desk", "Custom API"], enterpriseProofTitle: "Business proof before the demo", enterpriseProofText: "Security, rollout, ROI and support signals.", enterpriseProofItems: ["Secure workflows", "Implementation support", "Clear ROI path", "Admin controls", "API-ready", "Team onboarding"], enterprisePricingTitle: "Packages that can start simple and scale", enterprisePricingText: "Starter, growth and enterprise packages.", enterpriseDemoTitle: "Book a demo or request a solution review", enterpriseDemoText: "Send team size, current tools, workflow problem and preferred contact method.", enterpriseTimelines: ["Demo first", "2 week setup", "API-ready", "Managed rollout"] },
    es: { enterprisePlatform: "Plataforma empresarial", requestDemo: "Solicitar demo", viewSolutions: "Ver soluciones", solutions: "Soluciones", useCases: "Casos de uso", integrations: "Integraciones", customPlan: "Plan personalizado", enterpriseReady: "Listo para empresa", integrationReady: "Listo para integrar", roiFocused: "Enfocado en ROI", enterpriseSolutionsTitle: "Soluciones para equipos operativos", enterpriseUseCasesTitle: "Casos de uso por flujo de trabajo", enterpriseUseCasesText: "Muestra como encaja la solucion en equipos clave.", enterpriseUseCaseItems: ["Automatizar trabajo manual", "Centralizar reportes", "Conectar herramientas", "Mejorar visibilidad", "Reducir demoras", "Escalar operaciones"], enterpriseIntegrationsTitle: "Integraciones e implementacion", enterpriseIntegrationsText: "APIs, CRM, ERP, pagos, analitica y soporte.", enterpriseIntegrationItems: ["CRM", "ERP", "Pagos", "Analitica", "Soporte", "API personalizada"], enterpriseProofTitle: "Pruebas antes de la demo", enterpriseProofText: "Seguridad, implementacion, ROI y soporte.", enterpriseProofItems: ["Flujos seguros", "Soporte de implementacion", "Ruta clara de ROI", "Controles admin", "API lista", "Onboarding"], enterprisePricingTitle: "Paquetes para empezar simple y escalar", enterprisePricingText: "Paquetes starter, growth y enterprise.", enterpriseDemoTitle: "Agenda una demo o revision de solucion", enterpriseDemoText: "Envia tamano del equipo, herramientas actuales, problema y contacto.", enterpriseTimelines: ["Demo primero", "Setup 2 semanas", "API lista", "Implementacion guiada"] },
    fr: { enterprisePlatform: "Plateforme entreprise", requestDemo: "Demander une demo", viewSolutions: "Voir les solutions", solutions: "Solutions", useCases: "Cas d'usage", integrations: "Integrations", customPlan: "Plan personnalise", enterpriseReady: "Pret entreprise", integrationReady: "Pret integration", roiFocused: "Oriente ROI", enterpriseSolutionsTitle: "Solutions pour equipes operationnelles", enterpriseUseCasesTitle: "Cas d'usage par workflow", enterpriseUseCasesText: "Montrez l'adaptation aux equipes cles.", enterpriseUseCaseItems: ["Automatiser le travail manuel", "Centraliser les rapports", "Connecter les outils", "Ameliorer la visibilite", "Reduire les delais", "Scaler les operations"], enterpriseIntegrationsTitle: "Integrations et deploiement", enterpriseIntegrationsText: "APIs, CRM, ERP, paiements, analytics et support.", enterpriseIntegrationItems: ["CRM", "ERP", "Paiements", "Analytics", "Support", "API custom"], enterpriseProofTitle: "Preuves avant la demo", enterpriseProofText: "Securite, deploiement, ROI et support.", enterpriseProofItems: ["Workflows securises", "Support deploiement", "ROI clair", "Controles admin", "API prete", "Onboarding"], enterprisePricingTitle: "Packages simples a scaler", enterprisePricingText: "Starter, growth et enterprise.", enterpriseDemoTitle: "Reserver une demo ou analyse solution", enterpriseDemoText: "Envoyez equipe, outils, probleme et contact.", enterpriseTimelines: ["Demo d'abord", "Setup 2 semaines", "API prete", "Deploiement guide"] },
    pt: { enterprisePlatform: "Plataforma empresarial", requestDemo: "Solicitar demo", viewSolutions: "Ver solucoes", solutions: "Solucoes", useCases: "Casos de uso", integrations: "Integracoes", customPlan: "Plano personalizado", enterpriseReady: "Pronto para empresa", integrationReady: "Pronto para integrar", roiFocused: "Focado em ROI", enterpriseSolutionsTitle: "Solucoes para equipes operacionais", enterpriseUseCasesTitle: "Casos de uso por workflow", enterpriseUseCasesText: "Mostre como a solucao se encaixa em equipes chave.", enterpriseUseCaseItems: ["Automatizar trabalho manual", "Centralizar relatorios", "Conectar ferramentas", "Melhorar visibilidade", "Reduzir atrasos", "Escalar operacoes"], enterpriseIntegrationsTitle: "Integracoes e implementacao", enterpriseIntegrationsText: "APIs, CRM, ERP, pagamentos, analytics e suporte.", enterpriseIntegrationItems: ["CRM", "ERP", "Pagamentos", "Analytics", "Suporte", "API custom"], enterpriseProofTitle: "Provas antes da demo", enterpriseProofText: "Seguranca, implementacao, ROI e suporte.", enterpriseProofItems: ["Workflows seguros", "Suporte de implementacao", "ROI claro", "Controles admin", "API pronta", "Onboarding"], enterprisePricingTitle: "Pacotes para comecar simples e escalar", enterprisePricingText: "Starter, growth e enterprise.", enterpriseDemoTitle: "Agende uma demo ou revisao da solucao", enterpriseDemoText: "Envie equipe, ferramentas, problema e contato.", enterpriseTimelines: ["Demo primeiro", "Setup 2 semanas", "API pronta", "Implementacao guiada"] },
  };
  const industrialLabels = {
    en: { industrialSupplier: "Industrial supplier", requestQuote: "Request quote", viewSpecs: "View specs", capabilities: "Capabilities", certifications: "Certifications", supplyChain: "Supply chain", quoteRequired: "Quote required", certified: "Certified", bulkReady: "Bulk-ready", specReady: "Spec-ready", moqReady: "MOQ-ready", industrialCapabilitiesTitle: "Capabilities buyers need to verify", industrialCapabilitiesText: "Custom specs, bulk ordering, quality control and B2B support.", industrialCapabilityItems: ["Custom specs", "Bulk ordering", "Quality control", "Fast sourcing", "Replacement parts", "B2B support"], industrialCertificationsTitle: "Certifications, quality and documentation", industrialCertificationsText: "Documentation, safety data, warranty and compliance notes.", industrialCertificationItems: ["ISO-ready docs", "Material specs", "Warranty notes", "Safety data", "Compliance support", "Batch tracking"], industrialSupplyTitle: "Supply chain and fulfillment", industrialSupplyText: "Lead times, MOQ planning, freight support and repeat orders.", industrialSupplyItems: ["Lead times", "MOQ planning", "Freight support", "Warehouse-ready", "Vendor sourcing", "Repeat orders"], industrialQuoteTitle: "Request a quote with specs", industrialQuoteText: "Send product, quantities, material, deadline and delivery needs.", industrialLeadTimes: ["Quote first", "Bulk order", "2-4 week lead", "Custom spec"], industrialMaterials: ["Steel", "Aluminum", "Composite", "Safety-rated"] },
    es: { industrialSupplier: "Proveedor industrial", requestQuote: "Solicitar cotizacion", viewSpecs: "Ver especificaciones", capabilities: "Capacidades", certifications: "Certificaciones", supplyChain: "Cadena de suministro", quoteRequired: "Cotizacion requerida", certified: "Certificado", bulkReady: "Listo por volumen", specReady: "Specs listas", industrialCapabilitiesTitle: "Capacidades que compras necesita validar", industrialCapabilitiesText: "Specs personalizadas, compras por volumen, control de calidad y soporte B2B.", industrialCapabilityItems: ["Specs personalizadas", "Ordenes por volumen", "Control de calidad", "Sourcing rapido", "Repuestos", "Soporte B2B"], industrialCertificationsTitle: "Certificaciones, calidad y documentacion", industrialCertificationsText: "Documentacion, datos de seguridad, garantia y cumplimiento.", industrialCertificationItems: ["Docs ISO", "Specs de material", "Garantia", "Datos de seguridad", "Soporte compliance", "Trazabilidad"], industrialSupplyTitle: "Suministro y fulfillment", industrialSupplyText: "Tiempos, MOQ, flete y ordenes recurrentes.", industrialSupplyItems: ["Tiempos de entrega", "Plan MOQ", "Soporte de flete", "Listo para almacen", "Sourcing", "Ordenes repetidas"], industrialQuoteTitle: "Solicita una cotizacion con especificaciones", industrialQuoteText: "Envia producto, cantidades, material, fecha limite y entrega.", industrialLeadTimes: ["Cotizar primero", "Orden por volumen", "2-4 semanas", "Spec personalizada"], industrialMaterials: ["Acero", "Aluminio", "Compuesto", "Certificado"] },
    fr: { industrialSupplier: "Fournisseur industriel", requestQuote: "Demander un devis", viewSpecs: "Voir les specs", capabilities: "Capacites", certifications: "Certifications", supplyChain: "Supply chain", quoteRequired: "Devis requis", certified: "Certifie", bulkReady: "Pret volume", specReady: "Specs pretes", industrialCapabilitiesTitle: "Capacites a verifier", industrialCapabilitiesText: "Specs custom, commandes volume, qualite et support B2B.", industrialCapabilityItems: ["Specs custom", "Commandes volume", "Controle qualite", "Sourcing rapide", "Pieces rechange", "Support B2B"], industrialCertificationsTitle: "Certifications, qualite et documentation", industrialCertificationsText: "Docs, securite, garantie et conformite.", industrialCertificationItems: ["Docs ISO", "Specs materiaux", "Garantie", "Donnees securite", "Support conformite", "Tracabilite"], industrialSupplyTitle: "Supply chain et fulfillment", industrialSupplyText: "Delais, MOQ, fret et commandes recurrentes.", industrialSupplyItems: ["Delais", "Plan MOQ", "Support fret", "Pret entrepot", "Sourcing", "Commandes repetees"], industrialQuoteTitle: "Demander un devis avec specs", industrialQuoteText: "Envoyez produit, quantites, materiau, delai et livraison.", industrialLeadTimes: ["Devis d'abord", "Commande volume", "2-4 semaines", "Spec custom"], industrialMaterials: ["Acier", "Aluminium", "Composite", "Certifie"] },
    pt: { industrialSupplier: "Fornecedor industrial", requestQuote: "Solicitar cotacao", viewSpecs: "Ver especificacoes", capabilities: "Capacidades", certifications: "Certificacoes", supplyChain: "Cadeia de suprimentos", quoteRequired: "Cotacao requerida", certified: "Certificado", bulkReady: "Pronto para volume", specReady: "Specs prontas", industrialCapabilitiesTitle: "Capacidades que compras precisa validar", industrialCapabilitiesText: "Specs customizadas, compras em volume, qualidade e suporte B2B.", industrialCapabilityItems: ["Specs customizadas", "Pedidos em volume", "Controle de qualidade", "Sourcing rapido", "Pecas reposicao", "Suporte B2B"], industrialCertificationsTitle: "Certificacoes, qualidade e documentacao", industrialCertificationsText: "Documentacao, seguranca, garantia e compliance.", industrialCertificationItems: ["Docs ISO", "Specs de material", "Garantia", "Dados seguranca", "Suporte compliance", "Rastreabilidade"], industrialSupplyTitle: "Suprimentos e fulfillment", industrialSupplyText: "Prazos, MOQ, frete e pedidos recorrentes.", industrialSupplyItems: ["Prazos", "Planejamento MOQ", "Suporte frete", "Pronto para estoque", "Sourcing", "Pedidos repetidos"], industrialQuoteTitle: "Solicite cotacao com especificacoes", industrialQuoteText: "Envie produto, quantidades, material, prazo e entrega.", industrialLeadTimes: ["Cotar primeiro", "Pedido volume", "2-4 semanas", "Spec custom"], industrialMaterials: ["Aco", "Aluminio", "Composto", "Certificado"] },
  };
  return { ...labels.en, ...(labels[language] || {}), ...professionalLabels.en, ...(professionalLabels[language] || {}), ...enterpriseLabels.en, ...(enterpriseLabels[language] || {}), ...industrialLabels.en, ...(industrialLabels[language] || {}) };
}

function stableCatalogImageUrl(seed = "") {
  const text = String(seed || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const fallbacks = [
    [/bracelet|pulsera|pearl|perla|charm/, "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=900&q=82"],
    [/earring|arete/, "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=900&q=82"],
    [/ring|anillo/, "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=900&q=82"],
    [/necklace|collar|jewel|joya|bisuter|crystal|cristal|gift|regalo/, "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=82"],
    [/streetwear|jacket|chaqueta|fashion|moda|ropa|sneaker|denim|cap/, "https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=900&q=82"],
    [/usb|phone|gadget|tech|keyboard|lamp|projector|electronics/, "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=82"],
    [/truck|bumper|4x4|off-road|auto|car|automotive/, "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=82"],
    [/coffee|espresso|brew|latte|cafe/, "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=82"],
    [/restaurant|food|menu|pizza|dish|comida/, "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=82"],
    [/spa-bath-towel|bath-towel|toalla|towel/, "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=82"],
    [/handmade-soap|soap-bar|jabon|jabón|jabones|soap/, "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=82"],
    [/bath-salts|sales-de-bano|sales de bano|sales de baño/, "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=82"],
    [/bath-sponge|bano-sponge|natural-bath-sponge|esponja/, "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=82"],
    [/body-oil|aceite-corporal|body oil/, "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=82"],
    [/bath-bomb|bath bomb|bombas-de-bano|bombas de bano|bombas de baño/, "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=82"],
    [/aromatic-candle|scented-candle|candle|candles|vela|velas/, "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=82"],
    [/soap|jabon|jabón|jabones|bath|bath-bomb|bath bomb|bombas-de-bano|bombas de bano|bombas de baño|body-care|body care|candle|candles|vela|velas|beauty|skincare|cosmetic|belleza|makeup|spa/, "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=82"],
    [/home|decor|furniture|mueble|hogar/, "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=82"],
  ];
  return (fallbacks.find(([pattern]) => pattern.test(text)) || [null, "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=82"])[1];
}

function resolveCatalogImageUrl(url, fallbackText = "") {
  const raw = String(url || "").trim();
  if (!raw) return stableCatalogImageUrl(fallbackText);
  if (/images\.unsplash\.com\/featured\/600x600|source\.unsplash\.com/i.test(raw)) {
    const query = raw.split("?").slice(1).join("?").replace(/[=&]/g, " ");
    return stableCatalogImageUrl(`${query} ${fallbackText}`);
  }
  return raw;
}

function renderResilientImage(url, alt = "", fallbackText = "") {
  const initials = String(fallbackText || alt || "Item").slice(0, 2).toUpperCase();
  const placeholder = `<div class="card-placeholder">${escapeHtml(initials)}</div>`;
  const resolvedUrl = resolveCatalogImageUrl(url, `${fallbackText} ${alt}`);
  if (!resolvedUrl) return placeholder;
  return `<div class="image-shell"><img src="${escapeAttribute(resolvedUrl)}" alt="${escapeAttribute(alt)}" loading="lazy" decoding="async" onerror="this.closest('.image-shell').classList.add('image-failed')">${placeholder}</div>`;
}

function renderFeature(section) {
  const editable = section.editable || {};
  return `<section class="rendered-section feature-band ${sectionClass(section)}">
    <div class="section-heading">
      <h2>${escapeHtml(editable.title || editable.headline || section.type)}</h2>
      <p>${escapeHtml(editable.text || editable.subtitle || "")}</p>
    </div>
  </section>`;
}

function renderContact(section, schema) {
  const editable = section.editable || {};
  return `<section id="contact" class="rendered-section contact-panel ${sectionClass(section)}">
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

function sectionClass(section) {
  const headingSize = slugify(section.settings?.heading_size || "medium");
  const spacing = slugify(section.settings?.spacing || "balanced");
  const container = slugify(section.settings?.container_width || "standard");
  const density = slugify(section.settings?.card_density || "comfortable");
  const gap = slugify(section.settings?.card_gap || "comfortable");
  return `heading-${headingSize} spacing-${spacing} container-${container} density-${density} gap-${gap}`;
}

function bindPublicSiteActions() {
  publicSite.querySelectorAll("[data-page-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      currentPublicPageKey = link.dataset.pageLink || "home";
      window.history.replaceState(null, "", `#${currentPublicPageKey}`);
      renderCurrentPublicPage();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
  const applyCatalogFilter = (value = "") => {
    const query = String(value || "").trim().toLowerCase();
    publicSite.querySelectorAll("[data-catalog-item]").forEach((item) => {
      const searchable = String(item.dataset.catalogSearch || "").toLowerCase();
      const category = String(item.dataset.catalogItemCategory || "").toLowerCase();
      item.hidden = Boolean(query) && !searchable.includes(query) && category !== query;
    });
    publicSite.querySelectorAll("[data-catalog-group]").forEach((group) => {
      group.hidden = Boolean(query) && !group.querySelector("[data-catalog-item]:not([hidden])");
    });
  };
  publicSite.querySelectorAll("[data-catalog-search-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      applyCatalogFilter(new FormData(form).get("catalog-search") || "");
    });
  });
  publicSite.querySelectorAll("[data-catalog-category]").forEach((button) => {
    button.addEventListener("click", () => {
      applyCatalogFilter(button.dataset.catalogCategory || "");
      button.closest("details")?.removeAttribute("open");
    });
  });
  publicSite.querySelectorAll("[data-open-lead]").forEach((button) => {
    button.addEventListener("click", () => openLeadModal({
      catalogItemId: button.dataset.itemId || "",
      catalogItemName: button.dataset.itemName || "",
    }));
  });
  sharedCart?.bind(publicSite);
  publicSite.querySelectorAll("[data-account-open]").forEach((button) => {
    button.addEventListener("click", () => openAccountModal());
  });
}

function openAccountModal() {
  const existing = document.querySelector(".commerce-modal");
  if (existing) existing.remove();
  const labels = commerceLabels(currentPublicSite?.schema);
  document.body.insertAdjacentHTML("beforeend", `<div class="commerce-modal" role="dialog" aria-modal="true">
    <form class="commerce-modal-card">
      <div class="commerce-modal-head"><strong>${escapeHtml(labels.signInTitle)}</strong><button data-close-commerce type="button" aria-label="Close">x</button></div>
      <label>${escapeHtml(labels.name)}<input name="name" autocomplete="name"></label>
      <label>${escapeHtml(labels.email)}<input name="email" type="email" autocomplete="email"></label>
      <span class="commerce-status"></span>
      <button class="rendered-button" type="submit">${escapeHtml(labels.continue)}</button>
    </form>
  </div>`);
  const modal = document.querySelector(".commerce-modal");
  modal.querySelector("[data-close-commerce]").addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.remove();
  });
  modal.querySelector("form").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    localStorage.setItem("lumaShopperProfile", JSON.stringify({
      name: data.get("name")?.toString() || "",
      email: data.get("email")?.toString() || "",
    }));
    event.currentTarget.querySelector(".commerce-status").textContent = labels.saved;
    setTimeout(() => modal.remove(), 800);
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

function themeVars(theme = {}, brandInput = null) {
  const colors = theme.colors || {};
  const fonts = theme.fonts || {};
  const brand = normalizeBrand(brandInput || { colors, fontPairing: fonts, borderRadius: `${theme.radius || 10}px`, shadowStyle: theme.shadow });
  const brandColors = brandToThemeColors(brand);
  return [
    `--brand-primary:${brandColors.primary}`,
    `--brand-secondary:${brandColors.secondary}`,
    `--brand-accent:${brandColors.accent}`,
    `--brand-background:${brandColors.background}`,
    `--brand-surface:${brandColors.surface}`,
    `--brand-text:${brandColors.text}`,
    `--brand-muted:${brandColors.muted}`,
    `--brand-border:${brandColors.border}`,
    `--brand-button:${brandColors.button}`,
    `--brand-button-text:${brandColors.buttonText}`,
    `--brand-radius:${brand.borderRadius}`,
    `--brand-shadow:${brand.shadowStyle}`,
    `--site-bg:${brandColors.background}`,
    `--site-surface:${brandColors.surface}`,
    `--site-primary:${brandColors.primary}`,
    `--site-secondary:${brandColors.secondary}`,
    `--site-accent:${brandColors.accent}`,
    `--site-text:${brandColors.text}`,
    `--site-muted:${brandColors.muted}`,
    `--site-border:${brandColors.border}`,
    `--site-heading:${JSON.stringify(brand.fontPairing.heading || "Inter")}`,
    `--site-body:${JSON.stringify(brand.fontPairing.body || "Inter")}`,
  ].join(";");
}

function normalizeBrand(brandInput = {}) {
  const colors = brandInput.colors || {};
  const primary = colors.primary || brandInput.primaryColor || "#0E7C66";
  const button = colors.button || brandInput.buttonColor || primary;
  return {
    logoUrl: brandInput.logoUrl || brandInput.logo_url || "",
    primaryColor: primary,
    secondaryColor: colors.secondary || brandInput.secondaryColor || "#E3F3EE",
    accentColor: colors.accent || brandInput.accentColor || primary,
    backgroundColor: colors.background || brandInput.backgroundColor || "#F8FAF9",
    surfaceColor: colors.surface || brandInput.surfaceColor || "#FFFFFF",
    textColor: colors.text || brandInput.textColor || "#111827",
    mutedTextColor: colors.muted || brandInput.mutedTextColor || "#667085",
    borderColor: colors.border || brandInput.borderColor || "#D9E2DF",
    buttonColor: button,
    buttonTextColor: colors.buttonText || brandInput.buttonTextColor || contrastColor(button),
    fontPairing: typeof brandInput.fontPairing === "string" ? { heading: brandInput.fontPairing, body: "Inter" } : (brandInput.fontPairing || { heading: "Inter", body: "Inter" }),
    borderRadius: String(brandInput.borderRadius || "10px"),
    shadowStyle: brandInput.shadowStyle || "0 18px 48px rgba(16, 24, 40, 0.10)",
  };
}

function brandToThemeColors(brand) {
  return {
    background: brand.backgroundColor,
    surface: brand.surfaceColor,
    primary: brand.primaryColor,
    secondary: brand.secondaryColor,
    accent: brand.accentColor,
    text: brand.textColor,
    muted: brand.mutedTextColor,
    border: brand.borderColor,
    button: brand.buttonColor,
    buttonText: brand.buttonTextColor,
  };
}

function contrastColor(color) {
  const rgb = hexToRgb(color);
  const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
  return luminance > 0.55 ? "#111827" : "#ffffff";
}

function hexToRgb(hex) {
  const normalized = String(hex || "").replace("#", "");
  if (normalized.length !== 6) return [14, 124, 102];
  return [0, 2, 4].map((index) => parseInt(normalized.slice(index, index + 2), 16));
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
