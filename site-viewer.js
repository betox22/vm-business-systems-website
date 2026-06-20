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
    applyGeneratedFavicon(site.schema);
    publicSite.innerHTML = renderWebsite({ ...site.schema, catalog_items: site.catalog_items || [] });
    bindPublicSiteActions();
  } catch (error) {
    publicSite.innerHTML = `<div class="public-empty">Could not load published site.</div>`;
  }
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

function renderWebsite(schema) {
  const page = schema.pages?.[0];
  const theme = schema.theme || {};
  const logo = schema.brand?.logoUrl || schema.global_components?.logo_url;
  const layoutId = schema.layout_mode?.id || "standard";
  const templateId = schema.active_template?.id || schema.selected_template?.id || "standard";
  return `<div class="rendered-site layout-${escapeAttribute(slugify(layoutId))} template-${escapeAttribute(slugify(templateId))}" style="${themeVars(theme, schema.brand)}">
    <header class="rendered-nav sticky">
      <div>${logo ? `<img src="${escapeAttribute(logo)}" alt="${escapeAttribute(schema.business?.name)}">` : renderLogoMark(schema)}</div>
      <nav>${(schema.navigation || [])
        .map((item) => `<a href="#${escapeAttribute(item.page_key)}">${escapeHtml(item.label)}</a>`)
        .join("")}</nav>
    </header>
    ${(page?.sections || []).sort((a, b) => a.order - b.order).map((section) => renderSection(section, schema)).join("")}
    <footer class="rendered-footer">
      <div>${logo ? `<img src="${escapeAttribute(logo)}" alt="${escapeAttribute(schema.business?.name || "")}">` : renderLogoMark(schema)}</div>
      <span>${escapeHtml(schema.global_components?.footer_text || "")}</span>
    </footer>
  </div>`;
}

function renderSection(section, schema) {
  if (section.type === "Hero") return renderHero(section, schema);
  if (section.type === "PremiumHero") return renderPremiumHero(section, schema);
  if (section.type === "ProductStory") return renderProductStory(section, schema);
  if (section.type === "FeatureShowcase") return renderFeatureShowcase(section, schema);
  if (section.type === "EditorialGallery") return renderEditorialGallery(section, schema);
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
  if (section.type === "ListingHero") return renderListingHero(section, schema);
  if (section.type === "ListingFilters") return renderListingFilters(section, schema);
  if (section.type === "ListingFeatured") return renderListingFeatured(section, schema);
  if (section.type === "ListingAreaPanel") return renderListingAreaPanel(section, schema);
  if (section.type === "ListingTrust") return renderListingTrust(section, schema);
  if (section.type === "ListingContact") return renderListingContact(section, schema);
  if (section.type === "HomeServiceHero") return renderHomeServiceHero(section, schema);
  if (section.type === "HomeServiceCategories") return renderHomeServiceCategories(section, schema);
  if (section.type === "HomeServiceAreas") return renderHomeServiceAreas(section, schema);
  if (section.type === "HomeServiceGallery") return renderHomeServiceGallery(section, schema);
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
    .filter((item) => item.is_active !== false)
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
      ${publicCatalogItems(schema).slice(0, 3).map((item, index) => `<article><small>${escapeHtml(index === 0 ? labels.signature : labels.detail)}</small><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p></article>`).join("")}
    </div>
  </section>`;
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
    <div class="fashion-lookbook-strip">${publicCatalogItems(schema).slice(0, 5).map((item, index) => `<article class="${index === 1 ? "tall" : ""}">${item.image_url ? `<img src="${escapeAttribute(item.image_url)}" alt="${escapeAttribute(item.name)}">` : fashionVisualPlaceholder(schema)}<strong>${escapeHtml(item.name)}</strong></article>`).join("")}</div>
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
      ${item.image_url ? `<img src="${escapeAttribute(item.image_url)}" alt="${escapeAttribute(item.name)}">` : homeServiceWorkPlaceholder(item, schema)}
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
      <label class="marketplace-search-box"><span>${escapeHtml(labels.search)}</span><input placeholder="${escapeAttribute(editable.search_placeholder || labels.searchPlaceholder)}" readonly><button type="button">${escapeHtml(labels.searchButton)}</button></label>
      <div class="marketplace-chip-row">${marketplaceCategories(schema).slice(0, 6).map((category) => `<span>${escapeHtml(category)}</span>`).join("")}</div>
    </div>
    <div class="marketplace-deal-hero">
      <div><small>${escapeHtml(editable.deal_badge || labels.deal)}</small><h1>${escapeHtml(editable.headline || schema.business?.name || "")}</h1><p>${escapeHtml(editable.subtitle || schema.business?.description || "")}</p><div class="rendered-actions"><button class="rendered-button" data-open-lead type="button">${escapeHtml(editable.primary_button || labels.shopNow)}</button></div></div>
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
    <div class="marketplace-deal-row">${publicCatalogItems(schema).slice(0, 6).map((item, index) => renderCatalogCard(item, "market-card deal-card", index % 2 ? labels.fastShip : labels.deal, schema)).join("")}</div>
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
        .map((item) => `<article class="rendered-card">
        ${renderResilientImage(item.image_url, item.name, item.name)}
        <div>
          <h3>${escapeHtml(item.name)}</h3>
          <p>${escapeHtml(item.description)}</p>
          <strong>${escapeHtml(item.price_label)}</strong>
          <br><button class="rendered-button" data-open-lead data-item-id="${escapeAttribute(item.id || "")}" data-item-name="${escapeAttribute(item.name)}" type="button">${escapeHtml(item.button_label || "Request info")}</button>
        </div>
      </article>`).join("")}
    </div>`}
  </section>`;
}

function renderPremiumEditorialCatalog(items, schema) {
  const labels = catalogLocaleLabels(schema);
  return `<div class="catalog-premium-editorial">${items.map((item, index) => `<article class="${index === 0 ? "featured" : ""}">
    <div class="premium-card-visual">${item.image_url ? `<img src="${escapeAttribute(item.image_url)}" alt="${escapeAttribute(item.name)}">` : premiumVisualPlaceholder(schema)}</div>
    <div><small>${escapeHtml(index === 0 ? labels.flagship : labels.curated)}</small><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p><strong>${escapeHtml(item.price_label || "")}</strong><button class="rendered-button secondary" data-open-lead data-item-id="${escapeAttribute(item.id || "")}" data-item-name="${escapeAttribute(item.name)}" type="button">${escapeHtml(item.button_label || labels.view)}</button></div>
  </article>`).join("")}</div>`;
}

function renderMarketplaceCatalog(items, schema) {
  const labels = catalogLocaleLabels(schema);
  return `<div class="catalog-shell catalog-marketplace">
    <aside><strong>${escapeHtml(labels.searchFilters)}</strong>${marketplaceCategories(schema).slice(0, 5).map((category) => `<span>${escapeHtml(category)}</span>`).join("")}<span>${escapeHtml(labels.price)}</span><span>${escapeHtml(labels.rating)}</span><span>${escapeHtml(labels.delivery)}</span></aside>
    <div class="marketplace-catalog-main"><div class="marketplace-sort-bar"><b>${escapeHtml(labels.results)}</b><span>${escapeHtml(labels.sortBy)}: ${escapeHtml(labels.featured)}</span></div><div class="catalog-results">${items.map((item, index) => renderCatalogCard(item, "market-card", index % 3 === 0 ? labels.deal : labels.fastShip, schema)).join("")}</div></div>
  </div>`;
}

function renderFashionLookbookCatalog(items, schema) {
  const labels = catalogLocaleLabels(schema);
  return `<div class="catalog-lookbook">${items.map((item, index) => `<article class="lookbook-card ${index === 0 ? "wide" : ""}">
    ${item.image_url ? `<img src="${escapeAttribute(item.image_url)}" alt="${escapeAttribute(item.name)}">` : `<div>${escapeHtml(item.name.slice(0, 2))}</div>`}
    <span>${escapeHtml(labels.newDrop)}</span><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p><b>${escapeHtml(item.price_label || labels.request)}</b>
    <button class="rendered-button secondary" data-open-lead data-item-id="${escapeAttribute(item.id || "")}" data-item-name="${escapeAttribute(item.name)}" type="button">${escapeHtml(item.button_label || labels.view)}</button>
  </article>`).join("")}</div>`;
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
  return `<div class="catalog-restaurant-menu">${items.map((item, index) => `<article class="${index === 0 ? "featured" : ""}">
    <div class="restaurant-menu-card-top"><small>${escapeHtml(item.category || (index % 2 ? labels.chefPick : labels.popularDish))}</small><span>${escapeHtml(index === 0 ? labels.signatureMenu : labels.menu)}</span></div>
    ${renderResilientImage(item.image_url, item.name, item.name)}
    <h3>${escapeHtml(item.name)}</h3>
    <p>${escapeHtml(item.description)}</p>
    <div class="restaurant-menu-card-bottom">
      <strong>${escapeHtml(item.price_label || labels.menuPrice)}</strong>
      <button class="rendered-button" data-open-lead data-item-id="${escapeAttribute(item.id || "")}" data-item-name="${escapeAttribute(item.name)}" type="button">${escapeHtml(item.button_label || labels.orderNow)}</button>
    </div>
  </article>`).join("")}</div>`;
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
        <button class="rendered-button" data-open-lead type="button">${escapeHtml(editable.primary_button || labels.getAccess)}</button>
        <button class="rendered-button secondary" data-open-lead type="button">${escapeHtml(editable.secondary_button || labels.viewProducts)}</button>
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
        <button class="rendered-button" data-open-lead type="button">${escapeHtml(labels.getAccess)}</button>
        <button class="rendered-button secondary" data-open-lead type="button">${escapeHtml(labels.contact)}</button>
      </div>
    </div>
  </section>`;
}

function renderDigitalOfferCatalog(items, schema) {
  const labels = catalogLocaleLabels(schema);
  return `<div class="catalog-digital-pro">${items.map((item, index) => `<article class="${index === 0 ? "featured" : ""}">
    <div class="digital-card-top"><small>${escapeHtml(item.category || labels.digitalProducts)}</small><span>${escapeHtml(labels.instantAccess)}</span></div>
    ${renderResilientImage(item.image_url, item.name, item.name)}
    <h3>${escapeHtml(item.name)}</h3>
    <p>${escapeHtml(item.description)}</p>
    <ul><li>${escapeHtml(labels.downloadable)}</li><li>${escapeHtml(labels.bonus)}</li><li>${escapeHtml(labels.lifetime)}</li></ul>
    <div class="digital-card-bottom">
      <strong>${escapeHtml(item.price_label || labels.request)}</strong>
      <button class="rendered-button" data-open-lead data-item-id="${escapeAttribute(item.id || "")}" data-item-name="${escapeAttribute(item.name)}" type="button">${escapeHtml(item.button_label || labels.getAccess)}</button>
    </div>
  </article>`).join("")}</div>`;
}

function renderLuxuryHighTicketCatalog(items, schema) {
  const labels = catalogLocaleLabels(schema);
  return `<div class="catalog-luxury-high-ticket">${items.map((item, index) => `<article class="${index === 0 ? "featured" : ""}">
    <div class="luxury-card-top">${item.image_url ? `<img src="${escapeAttribute(item.image_url)}" alt="${escapeAttribute(item.name)}">` : luxuryVisualPlaceholder(schema)}</div>
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
    ${item.image_url ? `<div class="education-card-image"><img src="${escapeAttribute(item.image_url)}" alt="${escapeAttribute(item.name)}"></div>` : ""}
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
    <div class="clinic-card-visual">${item.image_url ? `<img src="${escapeAttribute(item.image_url)}" alt="${escapeAttribute(item.name)}">` : clinicVisualPlaceholder(schema)}</div>
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
    <div class="listing-image">${item.image_url ? `<img src="${escapeAttribute(item.image_url)}" alt="${escapeAttribute(item.name)}">` : listingVisualPlaceholder(schema)}</div>
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
  return `<article class="${className}">
    ${renderResilientImage(item.image_url, item.name, item.name)}
    ${badge ? `<small>${escapeHtml(badge)}</small>` : ""}
    ${item.category ? `<small>${escapeHtml(item.category)}</small>` : ""}
    <h3>${escapeHtml(item.name)}</h3>
    <p>${escapeHtml(item.description)}</p>
    <div class="market-meta"><span>${"★".repeat(Math.max(1, Math.min(5, Math.round(Number(item.rating) || 4))))} ${escapeHtml(item.rating || "4.6")}</span><span>${escapeHtml(item.shipping_label || labels.fastShip)}</span></div>
    <b>${escapeHtml(item.price_label || labels.request)}</b>
    <button class="rendered-button" data-open-lead data-item-id="${escapeAttribute(item.id || "")}" data-item-name="${escapeAttribute(item.name)}" type="button">${escapeHtml(item.button_label || labels.view)}</button>
  </article>`;
}

function marketplaceCategories(schema) {
  const fromItems = [...new Set(publicCatalogItems(schema).map((item) => item.category).filter(Boolean))];
  const fallback = catalogLocaleLabels(schema).fallbackCategories;
  return [...new Set([...fromItems, ...fallback])];
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
  return { ...labels.en, ...(labels[language] || {}), ...professionalLabels.en, ...(professionalLabels[language] || {}) };
}

function renderResilientImage(url, alt = "", fallbackText = "") {
  const initials = String(fallbackText || alt || "Item").slice(0, 2).toUpperCase();
  const placeholder = `<div class="card-placeholder">${escapeHtml(initials)}</div>`;
  if (!url) return placeholder;
  return `<div class="image-shell"><img src="${escapeAttribute(url)}" alt="${escapeAttribute(alt)}" loading="lazy" decoding="async" onerror="this.closest('.image-shell').classList.add('image-failed')">${placeholder}</div>`;
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
