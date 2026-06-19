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

function digitalVisualPlaceholder(schema) {
  const initials = String(schema.business?.name || "DP").slice(0, 2).toUpperCase();
  return `<div class="digital-visual-placeholder">
    <span>${escapeHtml(initials)}</span>
    <small>${escapeHtml(catalogLocaleLabels(schema).instantAccess)}</small>
  </div>`;
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
      newDrop: "New drop", collections: "Collections", lookbook: "Lookbook", fit: "Fit guide", drop: "Drop", fitGuide: "Fit guide", fitGuideItems: ["Size and fit notes", "Styling suggestions", "Care details", "Shipping and returns"], fashionCollections: ["New arrivals", "Essentials", "Statement pieces", "Accessories", "Limited drop", "Best sellers"],
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
      newDrop: "Nuevo drop", collections: "Colecciones", lookbook: "Lookbook", fit: "Guia de tallas", drop: "Drop", fitGuide: "Guia de tallas", fitGuideItems: ["Notas de talla y ajuste", "Sugerencias de estilo", "Cuidados de la prenda", "Envios y devoluciones"], fashionCollections: ["Novedades", "Esenciales", "Piezas destacadas", "Accesorios", "Drop limitado", "Mas vendidos"],
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
      newDrop: "Nouvelle collection", collections: "Collections", lookbook: "Lookbook", fit: "Guide des tailles", drop: "Drop", fitGuide: "Guide des tailles", fitGuideItems: ["Notes de taille", "Suggestions de style", "Conseils d'entretien", "Livraison et retours"], fashionCollections: ["Nouveautes", "Essentiels", "Pieces fortes", "Accessoires", "Drop limite", "Meilleures ventes"],
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
      newDrop: "Novo drop", collections: "Colecoes", lookbook: "Lookbook", fit: "Guia de tamanhos", drop: "Drop", fitGuide: "Guia de tamanhos", fitGuideItems: ["Notas de tamanho e caimento", "Sugestoes de estilo", "Cuidados com a peca", "Envios e devolucoes"], fashionCollections: ["Novidades", "Essenciais", "Pecas destaque", "Acessorios", "Drop limitado", "Mais vendidos"],
      instantAccess: "Acesso imediato", downloadable: "Conteudo para download", bonus: "Recursos bonus", lifetime: "Acesso vitalicio", getAccess: "Obter acesso", digitalProducts: "Produtos digitais", viewProducts: "Ver produtos", modules: "Modulos", digitalAccessShort: "Downloads, modulos e notas de suporte.", digitalBundleTitle: "Ofertas digitais prontas para vender", digitalModulesTitle: "O que o cliente recebe", digitalProofTitle: "Confianca antes do checkout", digitalAccessTitle: "Obtenha acesso e comece imediatamente", digitalAccessText: "O cliente sabe exatamente o que recebe, como acessar e onde pedir suporte.", digitalModuleItems: ["Treinamento principal", "Recursos para download", "Templates e ferramentas", "Material bonus", "Instrucoes de acesso", "Notas de suporte"], digitalProofItems: ["Acesso imediato", "Modulos editaveis", "Licenca clara", "Suporte pronto", "Valor do bundle", "Checkout simples"],
      company: "Empresa", services: "Servicos", process: "Processo", proof: "Prova", capability: "Capacidade", requestConsultation: "Solicitar consulta", viewServices: "Ver servicos", corporateProcessItems: ["Diagnostico", "Estrategia", "Entrega", "Suporte"], corporateProofItems: ["Entrega confiavel", "Comunicacao clara", "Padroes profissionais"],
      localExperts: "Especialistas locais", callNow: "Ligar agora", freeQuote: "Orcamento gratis", before: "Antes", after: "Depois", fastResponse: "Resposta local rapida", serviceAreas: "Areas atendidas", workProof: "Trabalhos", service: "Servico", quoteOnly: "Orcamento", serviceAreaReady: "Area atendida", quoteExpectation: "Conte o que precisa e receba o proximo passo claro.", serviceAreaItems: ["Bairros proximos", "Opcoes no mesmo dia", "Emergencias", "Servico recorrente", "Trabalho autorizado", "Estimativas claras"], homeServiceTrustItems: ["Licenciado e segurado", "Estimativas claras", "Pontualidade", "Antes/depois", "Referencias locais", "Acompanhamento claro"],
      appointments: "Agendamentos", availability: "Disponibilidade", team: "Equipe", bookNow: "Agendar agora", nextAvailable: "Proxima disponibilidade", slot: "Horario", confirmation: "Pronto para confirmar", staffPick: "Recomendado", fromQuote: "Sob orcamento", bookingContactFallback: "Confirme o servico, horario e metodo de contato preferido.", availabilityItems: ["Hoje / amanha", "Horarios de manha", "Horarios a tarde", "Fim de semana", "Chamadas de consulta", "Retornos"], bookingTeamItems: ["Escolha um servico", "Escolha horario preferido", "Receba confirmacao", "Chegue preparado"], bookingProofItems: ["Duracoes claras", "Confirmacao simples", "Detalhes antes de agendar"],
      menu: "Menu", specials: "Especiais", hoursLocation: "Horarios e localizacao", orderNow: "Pedir agora", viewMenu: "Ver menu", contact: "Contato", signatureMenu: "Menu destaque", popularDish: "Popular", chefPick: "Chef indica", pickupDelivery: "Pickup / delivery", quickOrderNote: "Confirme por telefone, WhatsApp ou email.", editableMenuNote: "Editavel no gerenciador de catalogo.", menuPrice: "Preco do menu", restaurantProofItems: ["Menu editavel", "Combos destaque", "Contato rapido"], restaurantCategories: ["Entradas", "Pratos principais", "Bebidas", "Sobremesas", "Especiais", "Chef indica"], restaurantCategoriesTitle: "Explore o menu por categoria", restaurantSignatureTitle: "Pratos destaque prontos para pedir", restaurantSpecialsTitle: "Especiais e combos", restaurantInfoTitle: "Horarios, localizacao e servico", restaurantOrderTitle: "Fazer pedido ou perguntar", restaurantOrderText: "Envie os pratos desejados, pickup ou delivery e metodo de contato.", restaurantSpecialItems: ["Indicacao do chef", "Combo familia", "Especial pickup", "Pronto para delivery"], restaurantInfoItems: ["Horarios", "Pickup", "Delivery", "No local", "Catering", "Pedidos por WhatsApp"],
      offer: "Oferta", benefits: "Beneficios", faq: "FAQ", claimOffer: "Solicitar esta oferta", seeProof: "Ver provas", nextStep: "Proximo passo", quickRequest: "Responda alguns detalhes e solicite a primeira versao.", bestValue: "Melhor opcao", outcomeFocused: "Estrutura focada em resultado", fastNextStep: "Contato rapido", editableOffer: "Oferta editavel", faqAnswer: "Isso pode ser ajustado no editor antes de publicar.", funnelBenefitsItems: ["Promessa clara", "Oferta focada", "Proximo passo simples"], funnelProofItems: ["Criado para converter", "Pensado para capturar leads", "Facil de editar"], funnelFaqItems: ["O que acontece depois da solicitacao?", "Posso mudar a oferta depois?", "Funciona sem checkout online?"],
      fallbackCategories: ["Eletronicos", "Casa", "Moda", "Beleza", "Esportes", "Ofertas"],
    },
  };
  return labels[language] || labels.en;
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
