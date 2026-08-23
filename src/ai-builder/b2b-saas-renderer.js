import { escapeAttribute, escapeHtml } from "./utils.js";
import { b2bSaasNavigationPages, b2bSaasSubscriptionPlans } from "./b2b-saas-policy.js";

export function renderB2BSaasWebsite(schema, page, context, options, helpers) {
  const { logo, layoutId, templateId, theme } = options;
  const {
    inlineEditAttrs = () => "",
    marketplaceItems,
    renderSection,
    renderStudioFloatingCatalog,
    sectionAttrs = () => "",
    themeVars,
  } = helpers;
  const pages = [...(schema.pages || [])].sort((a, b) => a.order - b.order);
  const sections = [...(page?.sections || [])].sort((a, b) => a.order - b.order);
  const labels = b2bSaasLabels(schema);
  const plans = b2bSaasSubscriptionPlans(schema);
  const items = marketplaceItems(schema);
  const isHome = page?.page_key === "home" || page === pages[0];
  const absorbed = new Set(["EnterpriseHero", "EnterpriseSolutions", "EnterpriseUseCases", "EnterpriseIntegrations", "EnterpriseProof", "EnterprisePricing", "EnterpriseDemo"]);
  const remaining = isHome ? sections.filter((section) => !absorbed.has(section.type)) : sections;
  const hero = sections.find((section) => section.type === "EnterpriseHero") || sections.find((section) => /Hero$/.test(section.type)) || {};
  const className = `rendered-site layout-${slugify(layoutId)} template-${slugify(templateId)}`;

  return `<div class="${escapeAttribute(className)}" style="${themeVars(theme, b2bSaasThemeBrand(theme, schema.brand))}">
    ${renderStudioFloatingCatalog(schema, context)}
    <div class="rendered-page-switcher"><span>${escapeHtml(schema.business?.name || "Website")}</span><div>${pages.map((item) => pageLink(item, item.page_key === page?.page_key)).join("")}</div></div>
    ${renderHeader(schema, page, pages, logo, labels, plans)}
    ${isHome ? `${renderHero(schema, hero, pages, items, labels, plans, { inlineEditAttrs, sectionAttrs })}${renderLogoRow(labels)}${renderFeatures(schema, sections, items, labels)}${renderPricing(plans, labels)}` : ""}
    ${remaining.map((section) => renderSection(section, schema)).join("")}
    <footer class="b2b-saas-footer"><div>${renderBrand(schema, logo)}</div><span>${escapeHtml(schema.global_components?.footer_text || `© ${new Date().getFullYear()} ${schema.business?.name || ""}`)}</span></footer>
  </div>`;
}

function renderHeader(schema, page, pages, logo, labels, plans) {
  const navigation = b2bSaasNavigationPages(pages);
  const loginPage = findPage(pages, /(?:^|\b)(?:login|sign[ -]?in|account|cuenta|ingresar)(?:\b|$)/i);
  const contactPage = findPage(pages, /contact|demo|consulta/i);
  const pricingPage = navigation.find((item) => item.key === "pricing")?.page;
  const startPage = (plans.length ? pricingPage : null) || contactPage || navigation[0]?.page || pages[0];
  return `<header class="b2b-saas-header">
    <a class="b2b-saas-brand" href="#" data-page-link="${escapeAttribute(pages[0]?.page_key || "home")}">${renderBrand(schema, logo)}</a>
    <nav aria-label="${escapeAttribute(labels.navigation)}">${navigation.map(({ key, page: target }) => `<a class="${target.page_key === page?.page_key ? "active" : ""}" href="#" data-page-link="${escapeAttribute(target.page_key)}">${escapeHtml(labels.nav[key])}</a>`).join("")}</nav>
    <div class="b2b-saas-header-actions">${loginPage ? `<a class="b2b-saas-login" href="#" data-page-link="${escapeAttribute(loginPage.page_key)}">${escapeHtml(labels.login)}</a>` : ""}<button class="b2b-saas-start" type="button" data-page-link="${escapeAttribute(startPage?.page_key || "")}">${escapeHtml(labels.start)}</button></div>
  </header>`;
}

function renderBrand(schema, logo) {
  const name = schema.business?.name || "Business";
  if (logo) return `<img src="${escapeAttribute(logo)}" alt="${escapeAttribute(name)}"><strong>${escapeHtml(name)}</strong>`;
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  return `<span class="b2b-saas-monogram" aria-hidden="true">${escapeHtml(initials || "B")}</span><strong>${escapeHtml(name)}</strong>`;
}

function renderHero(schema, section, pages, items, labels, plans, helpers) {
  const { inlineEditAttrs, sectionAttrs } = helpers;
  const editable = section.editable || {};
  const [lead, highlight] = headlineParts(inlineEditableValue(editable, "headline", schema.business?.name || ""));
  const navigation = b2bSaasNavigationPages(pages);
  const contactPage = findPage(pages, /contact|demo|consulta/i);
  const primaryPage = (plans.length ? navigation.find((item) => item.key === "pricing")?.page : null) || contactPage || navigation[0]?.page || pages[0];
  const secondaryPage = navigation.find((item) => item.key === "product")?.page || contactPage || pages[0];
  return `<main class="b2b-saas-hero" ${sectionAttrs(section)}><div class="b2b-saas-hero-copy"><span class="b2b-saas-eyebrow" ${inlineEditAttrs(schema, section, "badge")}>${escapeHtml(inlineEditableValue(editable, "badge", labels.eyebrow))}</span><h1 ${inlineEditAttrs(schema, section, "headline")}>${escapeHtml(lead)}${highlight ? ` <span>${escapeHtml(highlight)}</span>` : ""}</h1><p ${inlineEditAttrs(schema, section, "subtitle")}>${escapeHtml(inlineEditableValue(editable, "subtitle", schema.business?.description || ""))}</p><div class="b2b-saas-hero-actions"><button class="b2b-saas-primary" type="button" data-page-link="${escapeAttribute(primaryPage?.page_key || "")}" ${inlineEditAttrs(schema, section, "primary_button")}>${escapeHtml(inlineEditableValue(editable, "primary_button", labels.start))}</button><button class="b2b-saas-secondary" type="button" data-page-link="${escapeAttribute(secondaryPage?.page_key || "")}" ${inlineEditAttrs(schema, section, "secondary_button")}>${escapeHtml(inlineEditableValue(editable, "secondary_button", labels.demo))}</button></div></div>${renderDashboard(schema, items, labels)}</main>`;
}

function inlineEditableValue(editable, field, fallback = "") {
  return Object.prototype.hasOwnProperty.call(editable || {}, field) ? editable[field] : fallback;
}

function renderDashboard(schema, items, labels) {
  const pages = schema.pages || [];
  const sectionCount = pages.reduce((total, item) => total + (item.sections || []).length, 0);
  const sidebar = [...items.map((item) => item.name), ...pages.map((item) => item.title || item.page_key)].filter(Boolean).slice(0, 5);
  const metrics = [[labels.metrics.solutions, items.length], [labels.metrics.pages, pages.length], [labels.metrics.workflows, sectionCount]];
  return `<div class="b2b-saas-dashboard" aria-label="${escapeAttribute(labels.dashboard)}"><div class="b2b-saas-dashboard-bar"><span></span><span></span><span></span><strong>${escapeHtml(schema.business?.name || labels.dashboard)}</strong></div><div class="b2b-saas-dashboard-body"><aside>${sidebar.map((item, index) => `<span class="${index === 0 ? "active" : ""}">${icon(index)}${escapeHtml(item)}</span>`).join("")}</aside><div class="b2b-saas-metrics">${metrics.map(([label, value], index) => `<article><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong><div class="b2b-saas-mini-chart chart-${index + 1}" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div></article>`).join("")}</div></div></div>`;
}

function renderLogoRow(labels) {
  return `<section class="b2b-saas-logo-row" aria-label="${escapeAttribute(labels.exampleLogos)}"><span>${escapeHtml(labels.teams)}</span><div><strong>Northstar</strong><strong>Vertex</strong><strong>Meridian</strong><strong>Atlas</strong><strong>Aperture</strong></div></section>`;
}

function renderFeatures(schema, sections, items, labels) {
  const features = items.slice(0, 3).map((item) => ({ title: item.name, description: item.description }));
  const fallbacks = ["EnterpriseSolutions", "EnterpriseUseCases", "EnterpriseIntegrations"].map((type) => sections.find((section) => section.type === type)?.editable || {}).filter((item) => item.title || item.text);
  [...fallbacks].forEach((item) => {
    if (features.length < 3) features.push({ title: item.title, description: item.text });
  });
  if (!features.length && schema.business?.description) features.push({ title: schema.business?.name || labels.product, description: schema.business.description });
  return `<section class="b2b-saas-features"><div class="b2b-saas-section-heading"><span>${escapeHtml(labels.product)}</span><h2>${escapeHtml(labels.featuresTitle)}</h2></div><div>${features.map((feature, index) => `<article><span>${icon(index)}</span><h3>${escapeHtml(feature.title || schema.business?.name || "")}</h3><p>${escapeHtml(feature.description || schema.business?.description || "")}</p></article>`).join("")}</div></section>`;
}

function renderPricing(plans, labels) {
  if (plans.length !== 3) return "";
  return `<section class="b2b-saas-pricing" id="pricing"><div class="b2b-saas-section-heading"><span>${escapeHtml(labels.pricing)}</span><h2>${escapeHtml(labels.pricingTitle)}</h2></div><div class="b2b-saas-plans">${plans.map((plan, index) => `<article class="${index === 1 ? "featured" : ""}">${index === 1 ? `<span class="b2b-saas-plan-badge">${escapeHtml(labels.popular)}</span>` : ""}<small>${escapeHtml(plan.category || labels.plan)}</small><h3>${escapeHtml(plan.name || "")}</h3><strong>${escapeHtml(plan.price_label || plan.price || "")}</strong>${plan.description ? `<p>${escapeHtml(plan.description)}</p>` : ""}<button type="button" data-item-id="${escapeAttribute(plan.id || "")}" data-item-name="${escapeAttribute(plan.name || "")}">${escapeHtml(plan.button_label || labels.choose)}</button></article>`).join("")}</div></section>`;
}

function pageLink(page, active) {
  return `<a class="${active ? "active" : ""}" href="#" data-page-link="${escapeAttribute(page.page_key)}">${escapeHtml(page.title || page.page_key)}</a>`;
}

function findPage(pages, pattern) {
  return pages.find((page) => pattern.test(`${page.page_key || ""} ${page.title || ""} ${page.slug || ""}`));
}

function headlineParts(value) {
  const words = String(value || "").trim().split(/\s+/).filter(Boolean);
  if (words.length < 4) return [words.slice(0, -1).join(" "), words.at(-1) || ""];
  const size = Math.min(3, Math.max(2, Math.round(words.length * 0.35)));
  return [words.slice(0, -size).join(" "), words.slice(-size).join(" ")];
}

function slugify(value) {
  return String(value || "default").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function b2bSaasThemeBrand(theme = {}, brand = {}) {
  return {
    ...(brand || {}),
    colors: { ...(brand?.colors || {}), ...(theme.colors || {}) },
    fontPairing: theme.fonts || brand?.fontPairing,
  };
}

function icon(index) {
  const paths = ['<path d="M4 12h16M12 4v16"></path><circle cx="12" cy="12" r="8"></circle>', '<path d="M4 18V8l8-4 8 4v10"></path><path d="M8 18v-5h8v5"></path>', '<path d="M5 19V9m7 10V5m7 14v-8"></path>'];
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[index % paths.length]}</svg>`;
}

function b2bSaasLabels(schema = {}) {
  const language = schema.business?.selectedLanguage || schema.business?.selected_language || "en";
  const all = {
    en: { navigation: "Main navigation", nav: { product: "Product", pricing: "Pricing", customers: "Customers", docs: "Docs" }, login: "Sign in", start: "Start free", demo: "View demo", eyebrow: "Built for modern teams", dashboard: "Product dashboard", teams: "Designed for teams moving work forward", exampleLogos: "Example customer names", product: "Product", featuresTitle: "A clearer way to run the work that matters", pricing: "Pricing", pricingTitle: "Simple plans, without surprises", popular: "Most popular", plan: "Plan", choose: "Choose plan", metrics: { solutions: "Solutions", pages: "Pages", workflows: "Workflows" } },
    es: { navigation: "Navegación principal", nav: { product: "Producto", pricing: "Precios", customers: "Clientes", docs: "Docs" }, login: "Iniciar sesión", start: "Empezar gratis", demo: "Ver demo", eyebrow: "Creado para equipos modernos", dashboard: "Panel del producto", teams: "Diseñado para equipos que hacen avanzar el trabajo", exampleLogos: "Nombres de clientes de ejemplo", product: "Producto", featuresTitle: "Una forma más clara de gestionar el trabajo importante", pricing: "Precios", pricingTitle: "Planes simples, sin sorpresas", popular: "Más popular", plan: "Plan", choose: "Elegir plan", metrics: { solutions: "Soluciones", pages: "Páginas", workflows: "Flujos" } },
    fr: { navigation: "Navigation principale", nav: { product: "Produit", pricing: "Tarifs", customers: "Clients", docs: "Docs" }, login: "Se connecter", start: "Commencer", demo: "Voir la démo", eyebrow: "Conçu pour les équipes modernes", dashboard: "Tableau de bord", teams: "Conçu pour les équipes qui avancent", exampleLogos: "Exemples de noms clients", product: "Produit", featuresTitle: "Une manière plus claire de gérer le travail essentiel", pricing: "Tarifs", pricingTitle: "Des offres simples, sans surprise", popular: "Le plus populaire", plan: "Offre", choose: "Choisir", metrics: { solutions: "Solutions", pages: "Pages", workflows: "Flux" } },
    pt: { navigation: "Navegação principal", nav: { product: "Produto", pricing: "Preços", customers: "Clientes", docs: "Docs" }, login: "Entrar", start: "Começar grátis", demo: "Ver demo", eyebrow: "Criado para equipes modernas", dashboard: "Painel do produto", teams: "Criado para equipes que fazem o trabalho avançar", exampleLogos: "Nomes de clientes de exemplo", product: "Produto", featuresTitle: "Uma forma mais clara de gerir o trabalho importante", pricing: "Preços", pricingTitle: "Planos simples, sem surpresas", popular: "Mais popular", plan: "Plano", choose: "Escolher plano", metrics: { solutions: "Soluções", pages: "Páginas", workflows: "Fluxos" } },
  };
  return all[language] || all.en;
}
