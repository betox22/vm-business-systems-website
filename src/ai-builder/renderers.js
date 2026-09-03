import { DEFAULT_BRAND } from './templates.js';
import { escapeHtml, escapeAttribute } from './utils.js';
import { listingLocationForIndex, marketplaceCategories } from './index.js';
import { isMegaRetailTemplate, megaRetailFeatureFlags, megaRetailWhatsAppUrl, resolveMegaRetailTileMedia } from './mega-retail-policy.js';
import { isB2BSaasTemplate } from './b2b-saas-policy.js';
import { renderB2BSaasWebsite } from './b2b-saas-renderer.js';
import { bathBodyStockImageUrl } from './catalog-preview-policy.js';
import { motionDataAttributes } from './shared-site-motion.js';
import {
  inlineEditCatalogPath,
  inlineEditConfig,
  inlineEditNavigationPath,
  inlineEditPageTitlePath,
  inlineEditPath,
  inlineEditPersistentPath,
  inlineEditPlaceholder,
  inlineEditSectionCollectionItemPath,
  inlineEditSectionItemPath,
  supportsSharedShellInlineEditing,
} from './inline-edit-policy.js';

function arrayValue(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  return String(value)
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugify(value) {
  return String(value || 'default').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function normalizeBrandForTheme(brandInput = {}) {
  const input = brandInput || {};
  const brand = { ...DEFAULT_BRAND, ...input };
  const colors = input.colors || {};
  brand.logoUrl = brand.logoUrl || input.logo_url || input.logo || '';
  brand.primaryColor = resolveColor(brand.primaryColor || colors.primary, DEFAULT_BRAND.primaryColor);
  brand.secondaryColor = resolveColor(brand.secondaryColor || colors.secondary, DEFAULT_BRAND.secondaryColor);
  brand.accentColor = resolveColor(brand.accentColor || colors.accent, brand.primaryColor);
  brand.backgroundColor = resolveColor(brand.backgroundColor || colors.background, DEFAULT_BRAND.backgroundColor);
  brand.surfaceColor = resolveColor(brand.surfaceColor || colors.surface, DEFAULT_BRAND.surfaceColor);
  brand.textColor = resolveColor(brand.textColor || colors.text, DEFAULT_BRAND.textColor);
  brand.successColor = resolveColor(brand.successColor || colors.success, '#15803D');
  brand.warningColor = resolveColor(brand.warningColor || colors.warning, '#B45309');
  brand.errorColor = resolveColor(brand.errorColor || colors.error, '#B91C1C');
  brand.infoColor = resolveColor(brand.infoColor || colors.info, '#1D4ED8');
  brand.mutedTextColor = resolveColor(brand.mutedTextColor || colors.muted, DEFAULT_BRAND.mutedTextColor);
  brand.borderColor = resolveColor(brand.borderColor || colors.border, mixColorsForTheme(brand.textColor, brand.backgroundColor, 0.14));
  brand.buttonColor = resolveColor(brand.buttonColor || colors.button || brand.primaryColor, brand.primaryColor);
  brand.buttonTextColor = resolveColor(brand.buttonTextColor || colors.buttonText || contrastColorForTheme(brand.buttonColor), contrastColorForTheme(brand.buttonColor));
  brand.fontPairing = typeof brand.fontPairing === 'string' ? fontPairingFromStringForTheme(brand.fontPairing) : (brand.fontPairing || DEFAULT_BRAND.fontPairing);
  brand.borderRadius = String(brand.borderRadius || DEFAULT_BRAND.borderRadius);
  brand.shadowStyle = brand.shadowStyle || DEFAULT_BRAND.shadowStyle;
  return brand;
}

function brandToThemeColorsForTheme(brand) {
  return {
    background: brand.backgroundColor,
    surface: brand.surfaceColor,
    primary: brand.primaryColor,
    secondary: brand.secondaryColor,
    accent: brand.accentColor,
    text: brand.textColor,
    success: brand.successColor,
    warning: brand.warningColor,
    error: brand.errorColor,
    info: brand.infoColor,
    muted: brand.mutedTextColor,
    border: brand.borderColor,
    button: brand.buttonColor,
    buttonText: brand.buttonTextColor,
  };
}

function fontPairingFromStringForTheme(value) {
  const [heading, body] = String(value || '').split(/[+/|,]/).map((part) => part.trim()).filter(Boolean);
  return { heading: heading || 'Inter', body: body || heading || 'Inter' };
}

function hexToRgbForTheme(hex) {
  const clean = String(hex || '').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((char) => char + char).join('') : clean.padEnd(6, '0').slice(0, 6);
  const int = Number.parseInt(full, 16);
  if (Number.isNaN(int)) return [16, 24, 40];
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function rgbToHexForTheme(r, g, b) {
  return '#' + [r, g, b].map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('');
}

function relativeLuminanceForTheme([r, g, b]) {
  const transform = (channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * transform(r) + 0.7152 * transform(g) + 0.0722 * transform(b);
}

function contrastColorForTheme(color) {
  const luminance = relativeLuminanceForTheme(hexToRgbForTheme(resolveColor(color, '#000000')));
  return luminance > 0.55 ? '#101828' : '#FFFFFF';
}

function mixColorsForTheme(a, b, amount = 0.5) {
  const first = hexToRgbForTheme(resolveColor(a, '#000000'));
  const second = hexToRgbForTheme(resolveColor(b, '#ffffff'));
  return rgbToHexForTheme(
    first[0] + (second[0] - first[0]) * amount,
    first[1] + (second[1] - first[1]) * amount,
    first[2] + (second[2] - first[2]) * amount
  );
}

export function renderWebsite(schema, pageKey, context = {}) {
  const page = schema.pages.find((item) => item.page_key === pageKey) || schema.pages[0];
  const theme = schema.theme || {};
  ensureGoogleFontsLoaded(theme);
  schema.business = schema.business || {};
  if (!schema.business.selectedLanguage && !schema.business.selected_language && context.selectedLanguage) {
    schema.business.selectedLanguage = context.selectedLanguage;
  }
  schema.global_components = schema.global_components || {};
  const logo = schema.brand?.logoUrl || schema.global_components.logo_url;
  const layoutId = schema.layout_mode?.id || "standard";
  const templateId = schema.active_template?.id || schema.selected_template?.id || "standard";
  if (isMegaRetailTemplate(templateId)) {
    return renderMegaRetailWebsite(schema, page, context, { logo, layoutId, templateId, theme });
  }
  if (isB2BSaasTemplate(templateId)) {
    return renderB2BSaasWebsite(schema, page, context, { logo, layoutId, templateId, theme }, {
      marketplaceItems,
      renderLogoMark,
      renderSection,
      renderStudioFloatingCatalog,
      inlineEditAttrs,
      inlineEditAttrsForPath,
      sectionAttrs,
      themeVars,
    });
  }
  const commerceActions = isCommerceSite(schema) ? renderCommerceNavActions(schema) : "";
  return `<div class="rendered-site layout-${escapeAttribute(slugify(layoutId))} template-${escapeAttribute(slugify(templateId))}" style="${themeVars(theme, schema.brand)}">
    ${renderStudioFloatingCatalog(schema, context)}
    <div class="rendered-page-switcher">
      <span>${escapeHtml(schema.business.name || "Website")}</span>
      <div>${schema.pages
        .sort((a, b) => a.order - b.order)
        .map((item) => `<a class="${item.page_key === page.page_key ? "active" : ""}" href="#" data-page-link="${escapeAttribute(item.page_key)}">${escapeHtml(item.title || item.page_key)}</a>`)
        .join("")}</div>
    </div>
    <header class="rendered-nav ${schema.layout_mode?.navigation?.sticky_header ? "sticky" : ""}">
      <div class="rendered-nav-brand">${logo ? `<img src="${escapeAttribute(logo)}" alt="${escapeAttribute(schema.business.name)}">` : renderLogoMark(schema)}</div>
      <nav>${schema.navigation
        .map((item) => `<a class="${item.page_key === page.page_key ? "active" : ""}" href="#" data-page-link="${escapeAttribute(item.page_key)}" ${inlineEditAttrsForPath(schema, inlineEditNavigationPath(schema, item), "nav_label")}>${escapeHtml(item.label)}</a>`)
        .join("")}</nav>
      ${commerceActions}
    </header>
    ${page.sections
      .sort((a, b) => a.order - b.order)
      .map((section) => renderSection(section, schema))
      .join("")}
    <footer class="rendered-footer">
      <div>${logo ? `<img src="${escapeAttribute(logo)}" alt="${escapeAttribute(schema.business.name)}">` : renderLogoMark(schema)}</div>
      <span ${inlineEditAttrsForPath(schema, "global_components.footer_text", "footer_text")}>${escapeHtml(schema.global_components.footer_text || "")}</span>
    </footer>
  </div>`;
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
  const language = schema?.business?.selectedLanguage || schema?.business?.selected_language || schema?.selectedLanguage || schema?.selected_language || "en";
  const labels = {
    en: { account: "Account", cart: "Cart", addToCart: "Add to cart" },
    es: { account: "Cuenta", cart: "Carrito", addToCart: "Agregar al carrito" },
    fr: { account: "Compte", cart: "Panier", addToCart: "Ajouter au panier" },
    pt: { account: "Conta", cart: "Carrinho", addToCart: "Adicionar ao carrinho" },
  };
  return labels[language] || labels.en;
}

function renderCommerceNavActions(schema) {
  const labels = commerceLabels(schema);
  return `<div class="commerce-actions">
    <button class="commerce-action" type="button">${escapeHtml(labels.account)}</button>
    <button class="commerce-action cart-button" type="button">${escapeHtml(labels.cart)} <span>0</span></button>
  </div>`;
}

function renderStudioFloatingCatalog(schema, context = {}) {
  if (context.isClientPreviewMode) return "";
  const items = arrayValue(schema.catalog_items || schema.products_services).filter((item) => item.is_active !== false).slice(0, 3);
  if (!items.length) return "";
  return `<div class="studio-floating-catalog" aria-hidden="true">
    <span>Store preview</span>
    <div>${items.map((item) => `<article>
      ${renderCatalogImage(item)}
      <strong>${escapeHtml(item.name || "Product")}</strong>
      <small>${escapeHtml(item.price_label || "Precio editable")}</small>
    </article>`).join("")}</div>
  </div>`;
}

function renderSection(section, schema) {
  if (supportsExpandedInlineEditing(schema) && /FAQ$/i.test(section.type || "")) {
    return renderFunnelFAQ(section, schema);
  }
  const renderers = {
    Hero: renderHero,
    PremiumHero: renderPremiumHero,
    ProductStory: renderProductStory,
    FeatureShowcase: renderFeatureShowcase,
    EditorialGallery: renderPortfolioGallery,
    PortfolioGallery: renderPortfolioGallery,
    VideoShowcase: renderVideoShowcase,
    CourseOffering: renderCourseOffering,
    SpecStrip: renderSpecStrip,
    FashionHero: renderFashionHero,
    FashionCollectionRail: renderFashionCollectionRail,
    FashionDropStory: renderFashionDropStory,
    FashionLookbook: renderFashionLookbook,
    FashionFitGuide: renderFashionFitGuide,
    CorporateHero: renderCorporateHero,
    CorporateServices: renderCorporateServices,
    CorporateProcess: renderCorporateProcess,
    CorporateProof: renderCorporateProof,
    RestaurantHero: renderRestaurantHero,
    RestaurantCategoryRail: renderRestaurantCategoryRail,
    RestaurantSignatureMenu: renderRestaurantSignatureMenu,
    RestaurantSpecials: renderRestaurantSpecials,
    RestaurantInfo: renderRestaurantInfo,
    RestaurantOrderPanel: renderRestaurantOrderPanel,
    DigitalHero: renderDigitalHero,
    DigitalBundle: renderDigitalBundle,
    DigitalModules: renderDigitalModules,
    DigitalProof: renderDigitalProof,
    DigitalAccessPanel: renderDigitalAccessPanel,
    LuxuryHero: renderLuxuryHero,
    LuxurySignature: renderLuxurySignature,
    LuxuryCollection: renderLuxuryCollection,
    LuxuryProvenance: renderLuxuryProvenance,
    LuxuryPrivateService: renderLuxuryPrivateService,
    LuxuryContact: renderLuxuryContact,
    AcademyHero: renderAcademyHero,
    AcademyLearningPath: renderAcademyLearningPath,
    AcademyPrograms: renderAcademyPrograms,
    AcademyOutcomes: renderAcademyOutcomes,
    AcademyInstructor: renderAcademyInstructor,
    AcademyEnroll: renderAcademyEnroll,
    ClinicHero: renderClinicHero,
    ClinicServices: renderClinicServices,
    ClinicTreatmentPath: renderClinicTreatmentPath,
    ClinicTrust: renderClinicTrust,
    ClinicResults: renderClinicResults,
    ClinicTeam: renderClinicTeam,
    ClinicBooking: renderClinicBooking,
    ProfessionalHero: renderProfessionalHero,
    ProfessionalPracticeAreas: renderProfessionalPracticeAreas,
    ProfessionalProcess: renderProfessionalProcess,
    ProfessionalProof: renderProfessionalProof,
    ProfessionalTeam: renderProfessionalTeam,
    ProfessionalFAQ: renderProfessionalFAQ,
    ProfessionalConsultation: renderProfessionalConsultation,
    EnterpriseHero: renderEnterpriseHero,
    EnterpriseSolutions: renderEnterpriseSolutions,
    EnterpriseUseCases: renderEnterpriseUseCases,
    EnterpriseIntegrations: renderEnterpriseIntegrations,
    EnterpriseProof: renderEnterpriseProof,
    EnterprisePricing: renderEnterprisePricing,
    EnterpriseDemo: renderEnterpriseDemo,
    IndustrialHero: renderIndustrialHero,
    IndustrialSpecCatalog: renderIndustrialSpecCatalog,
    IndustrialCapabilities: renderCapabilitiesEquipment,
    CapabilitiesEquipment: renderCapabilitiesEquipment,
    IndustrialCertifications: renderIndustrialCertifications,
    IndustrialSupplyChain: renderIndustrialSupplyChain,
    IndustrialQuotePanel: renderQuoteRequestForm,
    QuoteRequestForm: renderQuoteRequestForm,
    ListingHero: renderListingHero,
    ListingFilters: renderListingFilters,
    ListingFeatured: renderListingFeatured,
    ListingAreaPanel: renderListingAreaPanel,
    ListingTrust: renderListingTrust,
    ListingContact: renderListingContact,
    HomeServiceHero: renderHomeServiceHero,
    HomeServiceCategories: renderHomeServiceCategories,
    HomeServiceAreas: renderHomeServiceAreas,
    HomeServiceGallery: renderPortfolioGallery,
    HomeServiceTrust: renderHomeServiceTrust,
    HomeServiceQuote: renderHomeServiceQuote,
    BookingHero: renderBookingHero,
    BookingServices: renderBookingServices,
    BookingAvailability: renderBookingAvailability,
    BookingTeam: renderBookingTeam,
    BookingContact: renderBookingContact,
    FunnelHero: renderFunnelHero,
    FunnelBenefits: renderFunnelBenefits,
    FunnelOffer: renderFunnelOffer,
    FunnelProof: renderFunnelProof,
    FunnelFAQ: renderFunnelFAQ,
    MarketplaceHero: renderMarketplaceHero,
    CategoryRail: renderCategoryRail,
    DealRow: renderDealRow,
    TrustStrip: renderTrustStrip,
    ProductGrid: renderProductGrid,
    ServiceList: renderProductGrid,
    FeatureBand: renderFeatureBand,
    About: renderFeatureBand,
    Gallery: renderGallery,
    Testimonials: renderFeatureBand,
    Contact: renderContact,
    Footer: renderContact,
  };
  return (renderers[section.type] || renderFeatureBand)(section, schema);
}

export function marketplaceItems(schema) {
  return (schema.catalog_items || schema.products_services || [])
    .filter((item) => item.is_active !== false && item.display_in_catalog !== false)
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
}

function renderHero(section, schema) {
  const editable = section.editable || {};
  const heroItem = (schema.catalog_items || schema.products_services || []).find((item) => item.is_featured && item.image_url) ||
    (schema.catalog_items || schema.products_services || []).find((item) => item.image_url);
  const image = editable.image_url || heroItem?.image_url || "";
  const variant = section.variant || section.settings?.layout || "split_showcase";
  const heroCopy = `<div class="rendered-hero-copy">
      ${schema.brand?.logoUrl ? `<span class="hero-brand-badge"><img src="${escapeAttribute(schema.brand.logoUrl)}" alt="">${escapeHtml(schema.business.name || "")}</span>` : ""}
      <span class="rendered-kicker">${escapeHtml(schema.business.industry || schema.business.location || "Featured")}</span>
      <h1>${escapeHtml(editable.headline || schema.business.name)}</h1>
      <p>${escapeHtml(editable.subtitle || schema.business.description)}</p>
      <div class="rendered-actions">
        <a class="rendered-button" href="#">${escapeHtml(editable.primary_button || schema.theme.buttons.primary_label)}</a>
        ${(editable.secondary_button || schema.theme.buttons.secondary_label) ? `<a class="rendered-button secondary" href="#">${escapeHtml(editable.secondary_button || schema.theme.buttons.secondary_label)}</a>` : ""}
      </div>
    </div>`;
  const visual = `<div class="rendered-visual">
      ${image ? `<img src="${escapeAttribute(image)}" alt="">` : visualPlaceholder(schema)}
    </div>`;
  if (variant === "centered_bold") {
    return `<section class="rendered-hero hero-centered-bold ${sectionClass(section)}" ${sectionAttrs(section)}>
      <div class="rendered-hero-backdrop">${visual}</div>${heroCopy}
    </section>`;
  }
  return `<section class="rendered-hero hero-${escapeAttribute(slugify(variant))} ${sectionClass(section)}" ${sectionAttrs(section)}>${heroCopy}${visual}</section>`;
}

function renderPremiumHero(section, schema) {
  const editable = section.editable || {};
  const items = marketplaceItems(schema);
  const heroItem = items.find((item) => item.is_featured && item.image_url) || items.find((item) => item.image_url);
  const image = editable.image_url || heroItem?.image_url || "";
  const firstItem = items[0];
  const variant = section.variant || section.settings?.layout || "split_showcase";
  return `<section class="premium-hero premium-hero-${escapeAttribute(slugify(variant))} ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="premium-hero-copy">
      <span class="rendered-kicker" ${inlineEditAttrs(schema, section, "badge")}>${escapeHtml(inlineEditableValue(editable, "badge", schema.business?.industry || schema.business?.tone || ""))}</span>
      <h1 ${inlineEditAttrs(schema, section, "headline")}>${escapeHtml(inlineEditableValue(editable, "headline", schema.business?.name || ""))}</h1>
      <p ${inlineEditAttrs(schema, section, "subtitle")}>${escapeHtml(inlineEditableValue(editable, "subtitle", schema.business?.description || ""))}</p>
      <div class="rendered-actions">
        <a class="rendered-button" href="#" ${inlineEditAttrs(schema, section, "primary_button")}>${escapeHtml(inlineEditableValue(editable, "primary_button", schema.theme?.buttons?.primary_label || "Explore"))}</a>
        <a class="rendered-button secondary" href="#" ${inlineEditAttrs(schema, section, "secondary_button")}>${escapeHtml(inlineEditableValue(editable, "secondary_button", schema.theme?.buttons?.secondary_label || "Learn more"))}</a>
      </div>
    </div>
    <div class="premium-product-stage">
      ${image ? `<img src="${escapeAttribute(image)}" alt="${escapeAttribute(schema.business?.name || "")}">` : premiumVisualPlaceholder(schema)}
    </div>
    ${firstItem ? `<div class="premium-hero-meta"><span>${escapeHtml(firstItem.name)}</span><strong>${escapeHtml(productPriceLabel(firstItem, schema))}</strong></div>` : ""}
  </section>`;
}

function renderProductStory(section, schema) {
  const editable = section.editable || {};
  const image = editable.image_url || marketplaceItems(schema).find((item) => item.image_url)?.image_url || "";
  return `<section class="premium-story ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div>
      <span class="rendered-kicker">${escapeHtml(schema.business?.tone || "")}</span>
      <h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(inlineEditableValue(editable, "title", editable.headline || ""))}</h2>
      <p ${inlineEditAttrs(schema, section, "text")}>${escapeHtml(inlineEditableValue(editable, "text", editable.subtitle || ""))}</p>
    </div>
    <div class="premium-story-visual">${image ? `<img src="${escapeAttribute(image)}" alt="">` : premiumVisualPlaceholder(schema)}</div>
  </section>`;
}

function renderFeatureShowcase(section, schema) {
  const editable = section.editable || {};
  const items = marketplaceItems(schema).slice(0, 3);
  return `<section class="premium-feature-showcase ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="section-heading">
      <span class="rendered-kicker">${escapeHtml(schema.business?.industry || "")}</span>
      <h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(inlineEditableValue(editable, "title", ""))}</h2>
      ${Object.prototype.hasOwnProperty.call(editable, "text") ? `<p ${inlineEditAttrs(schema, section, "text")}>${escapeHtml(editable.text)}</p>` : ""}
    </div>
    <div class="premium-feature-grid">
      ${items.map((item, index) => `<article>
        <span class="premium-feature-icon" aria-hidden="true">${premiumFeatureIcon(index)}</span>
        <small>${escapeHtml(index === 0 ? catalogLocaleLabels(schema).signature : catalogLocaleLabels(schema).detail)}</small>
        <h3 ${inlineCatalogEditAttrs(schema, item, "name", "product_name")}>${escapeHtml(item.name)}</h3>
        <p ${inlineCatalogEditAttrs(schema, item, "description", "product_description")}>${escapeHtml(item.description)}</p>
      </article>`).join("")}
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
  return renderPortfolioGallery(section, schema);
}

function renderSpecStrip(section, schema) {
  const editable = section.editable || {};
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : catalogLocaleLabels(schema).premiumSpecs;
  return `<section class="premium-spec-strip ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div>
      <h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(inlineEditableValue(editable, "title", ""))}</h2>
      ${Object.prototype.hasOwnProperty.call(editable, "text") ? `<p ${inlineEditAttrs(schema, section, "text")}>${escapeHtml(editable.text)}</p>` : ""}
    </div>
    <div>${items.map((item, index) => `<span ${inlineSectionItemEditAttrs(schema, section, index, "", "item_title")}>${escapeHtml(item)}</span>`).join("")}</div>
  </section>`;
}

function premiumVisualPlaceholder(schema) {
  const initials = String(schema.business?.name || "P").slice(0, 2).toUpperCase();
  return `<div class="premium-visual-placeholder"><span>${escapeHtml(initials)}</span></div>`;
}

function renderFashionHero(section, schema) {
  const editable = section.editable || {};
  const items = marketplaceItems(schema);
  const image = editable.image_url || items.find((item) => item.image_url)?.image_url || "";
  return `<section class="fashion-hero ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="fashion-hero-copy">
      <span class="rendered-kicker">${escapeHtml(schema.business?.industry || catalogLocaleLabels(schema).newDrop || "New drop")}</span>
      <h1 ${inlineEditAttrs(schema, section, "headline")}>${escapeHtml(editable.headline || schema.business?.name || "")}</h1>
      <p ${inlineEditAttrs(schema, section, "subtitle")}>${escapeHtml(editable.subtitle || schema.business?.description || "")}</p>
      <div class="rendered-actions">
        <a class="rendered-button" href="#" ${inlineEditAttrs(schema, section, "primary_button")}>${escapeHtml(editable.primary_button || schema.theme?.buttons?.primary_label || "Shop")}</a>
        <a class="rendered-button secondary" href="#" ${inlineEditAttrs(schema, section, "secondary_button")}>${escapeHtml(editable.secondary_button || catalogLocaleLabels(schema).lookbook || "Lookbook")}</a>
      </div>
    </div>
    <div class="fashion-hero-visual">${image ? `<img src="${escapeAttribute(image)}" alt="">` : fashionVisualPlaceholder(schema)}</div>
    <div class="fashion-hero-strip">${items.slice(0, 3).map((item) => `<span ${inlineCatalogEditAttrs(schema, item, "name", "product_name")}>${escapeHtml(item.name)}</span>`).join("")}</div>
  </section>`;
}

function renderFashionCollectionRail(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const collections = fashionCollections(schema);
  return `<section class="fashion-collection-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="section-heading"><span class="rendered-kicker">${escapeHtml(labels.newDrop)}</span><h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(editable.title || labels.collections)}</h2>${Object.prototype.hasOwnProperty.call(editable, "text") ? `<p ${inlineEditAttrs(schema, section, "text")}>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div class="fashion-collection-rail">${collections.map((collection, index) => `<article><small>0${index + 1}</small><strong>${escapeHtml(collection)}</strong><span>${escapeHtml(index % 2 ? labels.fit : labels.drop)}</span></article>`).join("")}</div>
  </section>`;
}

function renderFashionDropStory(section, schema) {
  const editable = section.editable || {};
  const image = editable.image_url || marketplaceItems(schema).find((item) => item.image_url)?.image_url || "";
  return `<section class="fashion-drop-story ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="fashion-story-image">${image ? `<img src="${escapeAttribute(image)}" alt="">` : fashionVisualPlaceholder(schema)}</div>
    <div><span class="rendered-kicker">${escapeHtml(schema.business?.tone || "")}</span><h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(editable.title || "")}</h2><p ${inlineEditAttrs(schema, section, "text")}>${escapeHtml(editable.text || "")}</p></div>
  </section>`;
}

function renderFashionLookbook(section, schema) {
  const editable = section.editable || {};
  return `<section class="fashion-lookbook-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="section-heading"><span class="rendered-kicker">${escapeHtml(catalogLocaleLabels(schema).lookbook)}</span><h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(editable.title || "")}</h2>${Object.prototype.hasOwnProperty.call(editable, "text") ? `<p ${inlineEditAttrs(schema, section, "text")}>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div class="fashion-lookbook-strip">${marketplaceItems(schema).slice(0, 5).map((item, index) => `<article class="${index === 1 ? "tall" : ""}">${renderCatalogImage(item)}<strong ${inlineCatalogEditAttrs(schema, item, "name", "product_name")}>${escapeHtml(item.name)}</strong></article>`).join("")}</div>
  </section>`;
}

function renderFashionFitGuide(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.fitGuideItems;
  return `<section class="fashion-fit-guide ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div><h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(editable.title || "")}</h2>${Object.prototype.hasOwnProperty.call(editable, "text") ? `<p ${inlineEditAttrs(schema, section, "text")}>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div>${items.map((item, index) => `<span ${Array.isArray(editable.items) ? inlineSectionItemEditAttrs(schema, section, index, "", "item_title") : ""}>${escapeHtml(item)}</span>`).join("")}</div>
  </section>`;
}

function fashionCollections(schema) {
  const fromItems = [...new Set(marketplaceItems(schema).map((item) => item.category).filter(Boolean))];
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
  const image = editable.image_url || marketplaceItems(schema).find((item) => item.image_url)?.image_url || "";
  return `<section class="corporate-hero ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="corporate-hero-copy">
      <span class="rendered-kicker">${escapeHtml(schema.business?.industry || labels.company)}</span>
      <h1>${escapeHtml(editable.headline || schema.business?.name || "")}</h1>
      <p>${escapeHtml(editable.subtitle || schema.business?.description || "")}</p>
      <div class="rendered-actions">
        <a class="rendered-button" href="#">${escapeHtml(editable.primary_button || labels.requestConsultation)}</a>
        <a class="rendered-button secondary" href="#">${escapeHtml(editable.secondary_button || labels.viewServices)}</a>
      </div>
    </div>
    <div class="corporate-hero-visual">${image ? `<img src="${escapeAttribute(image)}" alt="">` : corporateVisualPlaceholder(schema)}</div>
    <div class="corporate-hero-proof">${labels.corporateProofItems.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
  </section>`;
}

function renderCorporateServices(section, schema) {
  const editable = section.editable || {};
  return `<section class="corporate-services-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="section-heading"><span class="rendered-kicker">${escapeHtml(catalogLocaleLabels(schema).services)}</span><h2>${escapeHtml(editable.title || "")}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    ${renderCorporateServicesCatalog(marketplaceItems(schema), schema)}
  </section>`;
}

function renderCorporateProcess(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.corporateProcessItems;
  return `<section class="corporate-process-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div><span class="rendered-kicker">${escapeHtml(labels.process)}</span><h2>${escapeHtml(editable.title || "")}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div class="corporate-process-list">${items.map((item, index) => `<article><small>0${index + 1}</small><strong>${escapeHtml(item)}</strong></article>`).join("")}</div>
  </section>`;
}

function renderCorporateProof(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.corporateProofItems;
  return `<section class="corporate-proof-section ${sectionClass(section)}" ${sectionAttrs(section)}>
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
  const items = marketplaceItems(schema);
  const heroItem = items.find((item) => item.is_featured && item.image_url) || items.find((item) => item.image_url);
  const image = editable.image_url || heroItem?.image_url || "";
  return `<section class="restaurant-hero ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="restaurant-hero-copy">
      <span class="rendered-kicker" ${inlineEditAttrs(schema, section, "badge")}>${escapeHtml(editable.badge || schema.business?.industry || labels.menu)}</span>
      <h1 ${inlineEditAttrs(schema, section, "headline")}>${escapeHtml(editable.headline || schema.business?.name || "")}</h1>
      <p ${inlineEditAttrs(schema, section, "subtitle")}>${escapeHtml(editable.subtitle || schema.business?.description || "")}</p>
      <div class="rendered-actions">
        <a class="rendered-button" href="#" ${inlineEditAttrs(schema, section, "primary_button")}>${escapeHtml(editable.primary_button || labels.orderNow)}</a>
        <a class="rendered-button secondary" href="#" ${inlineEditAttrs(schema, section, "secondary_button")}>${escapeHtml(editable.secondary_button || labels.viewMenu)}</a>
      </div>
      <div class="restaurant-proof-strip">${labels.restaurantProofItems.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
    </div>
    <div class="restaurant-stage">
      <div class="restaurant-stage-visual">${image ? `<img src="${escapeAttribute(image)}" alt="${escapeAttribute(schema.business?.name || "")}">` : restaurantVisualPlaceholder(schema)}</div>
      <article class="restaurant-mini-card">
        <small>${escapeHtml(labels.pickupDelivery)}</small>
        <strong>${escapeHtml(labels.orderNow)}</strong>
        <span>${escapeHtml(labels.quickOrderNote)}</span>
      </article>
    </div>
  </section>`;
}

function renderRestaurantCategoryRail(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const editableCategories = Array.isArray(editable.items) ? editable.items : [];
  const categories = restaurantMenuCategories(schema, editable.items);
  return `<section class="restaurant-categories-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="section-heading">
      <span class="rendered-kicker">${escapeHtml(labels.menu)}</span>
      <h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(editable.title || labels.restaurantCategoriesTitle)}</h2>
      ${Object.prototype.hasOwnProperty.call(editable, "text") ? `<p ${inlineEditAttrs(schema, section, "text")}>${escapeHtml(editable.text)}</p>` : ""}
    </div>
    <div class="restaurant-category-rail">${categories.map((category, index) => `<article>
      <small>0${index + 1}</small>
      <strong ${editableCategories.includes(category) ? inlineSectionItemEditAttrs(schema, section, editableCategories.indexOf(category), "", "item_title") : ""}>${escapeHtml(category)}</strong>
      <span>${escapeHtml(index % 2 ? labels.chefPick : labels.popularDish)}</span>
    </article>`).join("")}</div>
  </section>`;
}

function renderRestaurantSignatureMenu(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  return `<section class="restaurant-menu-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="section-heading">
      <span class="rendered-kicker">${escapeHtml(labels.signatureMenu)}</span>
      <h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(editable.title || labels.restaurantSignatureTitle)}</h2>
      ${Object.prototype.hasOwnProperty.call(editable, "text") ? `<p ${inlineEditAttrs(schema, section, "text")}>${escapeHtml(editable.text)}</p>` : ""}
    </div>
    ${renderRestaurantMenuCatalog(marketplaceItems(schema), schema)}
  </section>`;
}

function renderRestaurantSpecials(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.restaurantSpecialItems;
  return `<section class="restaurant-specials-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div>
      <span class="rendered-kicker">${escapeHtml(labels.specials)}</span>
      <h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(editable.title || labels.restaurantSpecialsTitle)}</h2>
      ${Object.prototype.hasOwnProperty.call(editable, "text") ? `<p ${inlineEditAttrs(schema, section, "text")}>${escapeHtml(editable.text)}</p>` : ""}
    </div>
    <div class="restaurant-specials-list">${items.map((item, index) => `<article>
      <small>${escapeHtml(index === 0 ? labels.chefPick : labels.specials)}</small>
      <strong ${Array.isArray(editable.items) ? inlineSectionItemEditAttrs(schema, section, index, "", "item_title") : ""}>${escapeHtml(item)}</strong>
      <span>${escapeHtml(labels.editableMenuNote)}</span>
    </article>`).join("")}</div>
  </section>`;
}

function renderRestaurantInfo(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.restaurantInfoItems;
  return `<section class="restaurant-info-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div>
      <span class="rendered-kicker">${escapeHtml(labels.hoursLocation)}</span>
      <h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(editable.title || labels.restaurantInfoTitle)}</h2>
      ${Object.prototype.hasOwnProperty.call(editable, "text") ? `<p ${inlineEditAttrs(schema, section, "text")}>${escapeHtml(editable.text)}</p>` : ""}
    </div>
    <div>${items.map((item, index) => `<span ${Array.isArray(editable.items) ? inlineSectionItemEditAttrs(schema, section, index, "", "item_title") : ""}>${escapeHtml(item)}</span>`).join("")}</div>
  </section>`;
}

function renderRestaurantOrderPanel(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  return `<section class="restaurant-order-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="restaurant-order-card">
      <span class="rendered-kicker">${escapeHtml(labels.orderNow)}</span>
      <h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(editable.title || labels.restaurantOrderTitle)}</h2>
      <p ${inlineEditAttrs(schema, section, "text")}>${escapeHtml(editable.text || labels.restaurantOrderText)}</p>
      <div class="rendered-actions">
        <a class="rendered-button" href="#" ${inlineEditAttrs(schema, section, "primary_button")}>${escapeHtml(editable.primary_button || labels.orderNow)}</a>
        <a class="rendered-button secondary" href="#" ${inlineEditAttrs(schema, section, "secondary_button")}>${escapeHtml(editable.secondary_button || labels.contact)}</a>
      </div>
    </div>
  </section>`;
}

function restaurantMenuCategories(schema, fallback = []) {
  const fromItems = [...new Set(marketplaceItems(schema).map((item) => item.category).filter(Boolean))];
  const labels = catalogLocaleLabels(schema);
  return [...new Set([...fromItems, ...(Array.isArray(fallback) ? fallback : []), ...(labels.restaurantCategories || [])])].slice(0, 6);
}

function restaurantVisualPlaceholder(schema) {
  const initials = String(schema.business?.name || "RM").slice(0, 2).toUpperCase();
  return `<div class="restaurant-visual-placeholder"><span>${escapeHtml(initials)}</span></div>`;
}

function renderDigitalHero(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = marketplaceItems(schema);
  const heroItem = items.find((item) => item.is_featured && item.image_url) || items.find((item) => item.image_url);
  const image = editable.image_url || heroItem?.image_url || "";
  return `<section class="digital-hero ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="digital-hero-copy">
      <span class="rendered-kicker">${escapeHtml(schema.business?.industry || labels.digitalProducts)}</span>
      <h1>${escapeHtml(editable.headline || schema.business?.name || "")}</h1>
      <p>${escapeHtml(editable.subtitle || schema.business?.description || "")}</p>
      <div class="rendered-actions">
        <a class="rendered-button" href="#" data-page-link="catalog">${escapeHtml(editable.primary_button || labels.getAccess)}</a>
        <a class="rendered-button secondary" href="#" data-page-link="contact">${escapeHtml(editable.secondary_button || labels.viewProducts)}</a>
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
  return `<section class="digital-bundle-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="section-heading">
      <span class="rendered-kicker">${escapeHtml(labels.digitalProducts)}</span>
      <h2>${escapeHtml(editable.title || labels.digitalBundleTitle)}</h2>
      ${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}
    </div>
    ${renderDigitalOfferCatalog(marketplaceItems(schema), schema)}
  </section>`;
}

function renderDigitalModules(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.digitalModuleItems;
  return `<section class="digital-modules-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div><span class="rendered-kicker">${escapeHtml(labels.modules)}</span><h2>${escapeHtml(editable.title || labels.digitalModulesTitle)}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div class="digital-module-grid">${items.map((item, index) => `<article><small>0${index + 1}</small><strong>${escapeHtml(item)}</strong><span>${escapeHtml(index % 2 ? labels.downloadable : labels.bonus)}</span></article>`).join("")}</div>
  </section>`;
}

function renderDigitalProof(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.digitalProofItems;
  return `<section class="digital-proof-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div><span class="rendered-kicker">${escapeHtml(labels.proof)}</span><h2>${escapeHtml(editable.title || labels.digitalProofTitle)}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div>${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
  </section>`;
}

function renderDigitalAccessPanel(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  return `<section class="digital-access-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="digital-access-panel">
      <span class="rendered-kicker">${escapeHtml(labels.instantAccess)}</span>
      <h2>${escapeHtml(editable.title || labels.digitalAccessTitle)}</h2>
      <p>${escapeHtml(editable.text || labels.digitalAccessText)}</p>
      <div class="rendered-actions">
        <a class="rendered-button" href="#" data-page-link="catalog">${escapeHtml(labels.getAccess)}</a>
        <a class="rendered-button secondary" href="#" data-page-link="contact">${escapeHtml(labels.contact)}</a>
      </div>
    </div>
  </section>`;
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
  const items = marketplaceItems(schema);
  const heroItem = items.find((item) => item.is_featured && item.image_url) || items.find((item) => item.image_url) || items[0];
  const image = editable.image_url || heroItem?.image_url || "";
  return `<section class="luxury-pro-hero ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="luxury-pro-copy">
      <span class="rendered-kicker" ${inlineEditAttrs(schema, section, "badge")}>${escapeHtml(editable.badge || labels.limitedSelection)}</span>
      <h1 ${inlineEditAttrs(schema, section, "headline")}>${escapeHtml(editable.headline || schema.business?.name || "")}</h1>
      <p ${inlineEditAttrs(schema, section, "subtitle")}>${escapeHtml(editable.subtitle || schema.business?.description || "")}</p>
      <div class="rendered-actions">
        <a class="rendered-button" href="#" ${inlineEditAttrs(schema, section, "primary_button")}>${escapeHtml(editable.primary_button || labels.requestPrivateViewing)}</a>
        <a class="rendered-button secondary" href="#" ${inlineEditAttrs(schema, section, "secondary_button")}>${escapeHtml(editable.secondary_button || labels.viewCollection)}</a>
      </div>
      <div class="luxury-proof-strip">
        ${(labels.luxuryProofItems || []).slice(0, 3).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>
    </div>
    <div class="luxury-pro-stage">
      <div class="luxury-hero-visual">${image ? `<img src="${escapeAttribute(image)}" alt="${escapeAttribute(heroItem?.name || schema.business?.name || "")}">` : luxuryVisualPlaceholder(schema)}</div>
      <div class="luxury-floating-card">
        <small>${escapeHtml(labels.signaturePiece)}</small>
        <strong ${inlineCatalogEditAttrs(schema, heroItem, "name", "product_name")}>${escapeHtml(heroItem?.name || schema.business?.name || "")}</strong>
        <span>${escapeHtml(heroItem?.price_label || labels.priceOnRequest)}</span>
      </div>
    </div>
  </section>`;
}

function renderLuxurySignature(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const item = marketplaceItems(schema)[0];
  const image = editable.image_url || item?.image_url || "";
  const proofItems = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.luxuryProofItems;
  return `<section class="luxury-signature-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="luxury-signature-media">${image ? `<img src="${escapeAttribute(image)}" alt="${escapeAttribute(item?.name || "")}">` : luxuryVisualPlaceholder(schema)}</div>
    <div class="luxury-signature-copy">
      <span class="rendered-kicker">${escapeHtml(labels.authenticated)}</span>
      <h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(editable.title || labels.signaturePiece)}</h2>
      <p ${inlineEditAttrs(schema, section, "text")}>${escapeHtml(editable.text || "")}</p>
      <div class="luxury-mini-proof">${proofItems.slice(0, 4).map((proof, index) => `<span ${Array.isArray(editable.items) ? inlineSectionItemEditAttrs(schema, section, index, "", "item_title") : ""}>${escapeHtml(proof)}</span>`).join("")}</div>
    </div>
  </section>`;
}

function renderLuxuryCollection(section, schema) {
  const editable = section.editable || {};
  return `<section class="luxury-collection-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="section-heading">
      <span class="rendered-kicker">${escapeHtml(catalogLocaleLabels(schema).collection)}</span>
      <h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(editable.title || "")}</h2>
      ${Object.prototype.hasOwnProperty.call(editable, "text") ? `<p ${inlineEditAttrs(schema, section, "text")}>${escapeHtml(editable.text)}</p>` : ""}
    </div>
    ${renderLuxuryHighTicketCatalog(marketplaceItems(schema), schema)}
  </section>`;
}

function renderLuxuryProvenance(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.luxuryProofItems;
  return `<section class="luxury-provenance-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div>
      <span class="rendered-kicker">${escapeHtml(labels.provenance)}</span>
      <h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(editable.title || labels.luxuryProvenanceTitle)}</h2>
      <p ${inlineEditAttrs(schema, section, "text")}>${escapeHtml(editable.text || labels.luxuryProvenanceText)}</p>
    </div>
    <div class="luxury-provenance-grid">
      ${items.slice(0, 6).map((item, index) => `<article><span></span><strong ${Array.isArray(editable.items) ? inlineSectionItemEditAttrs(schema, section, index, "", "item_title") : ""}>${escapeHtml(item)}</strong><p>${escapeHtml(labels.privateService)}</p></article>`).join("")}
    </div>
  </section>`;
}

function renderLuxuryPrivateService(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  return `<section class="luxury-private-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div>
      <span class="rendered-kicker">${escapeHtml(labels.privateInquiry)}</span>
      <h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(editable.title || labels.luxuryPrivateTitle)}</h2>
      <p ${inlineEditAttrs(schema, section, "text")}>${escapeHtml(editable.text || labels.luxuryPrivateText)}</p>
    </div>
    <a class="rendered-button" href="#" ${inlineEditAttrs(schema, section, "primary_button")}>${escapeHtml(editable.primary_button || labels.requestPrivateViewing)}</a>
  </section>`;
}

function renderLuxuryContact(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  return `<section class="luxury-contact-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="luxury-contact-card">
      <span class="rendered-kicker">${escapeHtml(labels.privateInquiry)}</span>
      <h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(editable.title || labels.luxuryContactTitle)}</h2>
      <p ${inlineEditAttrs(schema, section, "text")}>${escapeHtml(editable.text || labels.luxuryContactText)}</p>
      <a class="rendered-button" href="#" ${inlineEditAttrs(schema, section, "primary_button")}>${escapeHtml(editable.primary_button || labels.requestPrivateViewing)}</a>
    </div>
  </section>`;
}

function luxuryVisualPlaceholder(schema) {
  const initials = String(schema.business?.name || "LX").slice(0, 2).toUpperCase();
  return `<div class="luxury-visual-placeholder"><span>${escapeHtml(initials)}</span><small>${escapeHtml(catalogLocaleLabels(schema).privateService)}</small></div>`;
}

function renderAcademyHero(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = marketplaceItems(schema);
  const heroItem = items.find((item) => item.is_featured && item.image_url) || items.find((item) => item.image_url) || items[0];
  const image = editable.image_url || heroItem?.image_url || "";
  return `<section class="academy-pro-hero ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="academy-pro-copy">
      <span class="rendered-kicker" ${inlineEditAttrs(schema, section, "badge")}>${escapeHtml(editable.badge || labels.courseAcademy)}</span>
      <h1 ${inlineEditAttrs(schema, section, "headline")}>${escapeHtml(editable.headline || schema.business?.name || "")}</h1>
      <p ${inlineEditAttrs(schema, section, "subtitle")}>${escapeHtml(editable.subtitle || schema.business?.description || "")}</p>
      <div class="rendered-actions">
        <a class="rendered-button" href="#" ${inlineEditAttrs(schema, section, "primary_button")}>${escapeHtml(editable.primary_button || labels.enrollNow)}</a>
        <a class="rendered-button secondary" href="#" ${inlineEditAttrs(schema, section, "secondary_button")}>${escapeHtml(editable.secondary_button || labels.viewCurriculum)}</a>
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
      <div class="academy-floating-card"><small>${escapeHtml(labels.featuredProgram)}</small><strong ${inlineCatalogEditAttrs(schema, heroItem, "name", "product_name")}>${escapeHtml(heroItem?.name || labels.programsTitle)}</strong><span>${escapeHtml(heroItem?.shipping_label || labels.educationDurations?.[0] || "")}</span></div>
    </div>
  </section>`;
}

function renderAcademyLearningPath(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.learningPathItems;
  return `<section class="academy-path-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="section-heading"><span class="rendered-kicker">${escapeHtml(labels.curriculum)}</span><h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(editable.title || labels.learningPathTitle)}</h2>${Object.prototype.hasOwnProperty.call(editable, "text") ? `<p ${inlineEditAttrs(schema, section, "text")}>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div class="academy-path-grid">${items.slice(0, 6).map((item, index) => `<article><span>0${index + 1}</span><strong ${Array.isArray(editable.items) ? inlineSectionItemEditAttrs(schema, section, index, "", "item_title") : ""}>${escapeHtml(item)}</strong><p>${escapeHtml(index % 2 ? labels.beginnerFriendly : labels.certificateReady)}</p></article>`).join("")}</div>
  </section>`;
}

function renderAcademyPrograms(section, schema) {
  const editable = section.editable || {};
  return `<section class="academy-programs-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="section-heading"><span class="rendered-kicker">${escapeHtml(catalogLocaleLabels(schema).programs)}</span><h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(editable.title || "")}</h2>${Object.prototype.hasOwnProperty.call(editable, "text") ? `<p ${inlineEditAttrs(schema, section, "text")}>${escapeHtml(editable.text)}</p>` : ""}</div>
    ${renderEducationCourseCatalog(marketplaceItems(schema), schema)}
  </section>`;
}

function renderAcademyOutcomes(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.learningOutcomeItems;
  return `<section class="academy-outcomes-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div><span class="rendered-kicker">${escapeHtml(labels.outcomes)}</span><h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(editable.title || labels.outcomesTitle)}</h2><p ${inlineEditAttrs(schema, section, "text")}>${escapeHtml(editable.text || labels.outcomesText)}</p></div>
    <div class="academy-outcome-grid">${items.slice(0, 6).map((item, index) => `<article><span></span><strong ${Array.isArray(editable.items) ? inlineSectionItemEditAttrs(schema, section, index, "", "item_title") : ""}>${escapeHtml(item)}</strong><p>${escapeHtml(labels.courseAcademy)}</p></article>`).join("")}</div>
  </section>`;
}

function renderAcademyInstructor(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.instructorTrustItems;
  return `<section class="academy-instructor-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="academy-instructor-card">${editable.image_url ? `<img src="${escapeAttribute(editable.image_url)}" alt="${escapeAttribute(editable.title || "")}">` : academyVisualPlaceholder(schema)}</div>
    <div><span class="rendered-kicker">${escapeHtml(labels.instructor)}</span><h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(editable.title || labels.instructorTitle)}</h2><p ${inlineEditAttrs(schema, section, "text")}>${escapeHtml(editable.text || labels.instructorText)}</p><div class="academy-mini-proof">${items.slice(0, 4).map((item, index) => `<span ${Array.isArray(editable.items) ? inlineSectionItemEditAttrs(schema, section, index, "", "item_title") : ""}>${escapeHtml(item)}</span>`).join("")}</div></div>
  </section>`;
}

function renderAcademyEnroll(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  return `<section class="academy-enroll-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div><span class="rendered-kicker">${escapeHtml(labels.enroll)}</span><h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(editable.title || labels.enrollmentTitle)}</h2><p ${inlineEditAttrs(schema, section, "text")}>${escapeHtml(editable.text || labels.enrollmentText)}</p></div>
    <a class="rendered-button" href="#" ${inlineEditAttrs(schema, section, "primary_button")}>${escapeHtml(editable.primary_button || labels.enrollNow)}</a>
  </section>`;
}

function academyVisualPlaceholder(schema) {
  const initials = String(schema.business?.name || "AC").slice(0, 2).toUpperCase();
  return `<div class="academy-visual-placeholder"><span>${escapeHtml(initials)}</span><small>${escapeHtml(catalogLocaleLabels(schema).courseAcademy)}</small></div>`;
}

function renderClinicHero(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = marketplaceItems(schema);
  const heroItem = items.find((item) => item.is_featured && item.image_url) || items.find((item) => item.image_url) || items[0];
  const image = editable.image_url || heroItem?.image_url || "";
  return `<section class="clinic-pro-hero ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="clinic-pro-copy">
      <span class="rendered-kicker" ${inlineEditAttrs(schema, section, "badge")}>${escapeHtml(editable.badge || labels.clinicCare)}</span>
      <h1 ${inlineEditAttrs(schema, section, "headline")}>${escapeHtml(editable.headline || schema.business?.name || "")}</h1>
      <p ${inlineEditAttrs(schema, section, "subtitle")}>${escapeHtml(editable.subtitle || schema.business?.description || "")}</p>
      <div class="rendered-actions">
        <a class="rendered-button" href="#" ${inlineEditAttrs(schema, section, "primary_button")}>${escapeHtml(editable.primary_button || labels.bookConsultation)}</a>
        <a class="rendered-button secondary" href="#" ${inlineEditAttrs(schema, section, "secondary_button")}>${escapeHtml(editable.secondary_button || labels.viewTreatments)}</a>
      </div>
      <div class="clinic-proof-strip">${(labels.clinicTrustItems || []).slice(0, 3).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
    </div>
    <div class="clinic-pro-stage">
      <div class="clinic-appointment-card">
        <div class="clinic-appointment-top"><span>${escapeHtml(labels.bookConsultation)}</span><b>${escapeHtml(labels.consultationBased)}</b></div>
        <div class="clinic-appointment-media">${image ? `<img src="${escapeAttribute(image)}" alt="${escapeAttribute(heroItem?.name || schema.business?.name || "")}">` : clinicVisualPlaceholder(schema)}</div>
        <div class="clinic-slots">${(labels.clinicDurations || []).slice(0, 3).map((item, index) => `<span class="${index === 1 ? "active" : ""}">${escapeHtml(item)}</span>`).join("")}</div>
      </div>
      <div class="clinic-floating-card"><small>${escapeHtml(labels.popularTreatment)}</small><strong ${inlineCatalogEditAttrs(schema, heroItem, "name", "product_name")}>${escapeHtml(heroItem?.name || labels.treatmentsTitle)}</strong><span>${escapeHtml(heroItem?.shipping_label || labels.clinicDurations?.[0] || "")}</span></div>
    </div>
  </section>`;
}

function renderClinicServices(section, schema) {
  const editable = section.editable || {};
  return `<section class="clinic-services-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="section-heading"><span class="rendered-kicker">${escapeHtml(catalogLocaleLabels(schema).treatments)}</span><h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(editable.title || "")}</h2>${Object.prototype.hasOwnProperty.call(editable, "text") ? `<p ${inlineEditAttrs(schema, section, "text")}>${escapeHtml(editable.text)}</p>` : ""}</div>
    ${renderMedicalWellnessCatalog(marketplaceItems(schema), schema)}
  </section>`;
}

function renderClinicTreatmentPath(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.carePathItems;
  return `<section class="clinic-path-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div><span class="rendered-kicker">${escapeHtml(labels.clinicCare)}</span><h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(editable.title || labels.carePathTitle)}</h2><p ${inlineEditAttrs(schema, section, "text")}>${escapeHtml(editable.text || labels.carePathText)}</p></div>
    <div class="clinic-path-list">${items.slice(0, 6).map((item, index) => `<article><span>0${index + 1}</span><strong ${Array.isArray(editable.items) ? inlineSectionItemEditAttrs(schema, section, index, "", "item_title") : ""}>${escapeHtml(item)}</strong><p>${escapeHtml(index % 2 ? labels.personalizedPlan : labels.specialistLed)}</p></article>`).join("")}</div>
  </section>`;
}

function renderClinicTrust(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.clinicTrustItems;
  return `<section class="clinic-trust-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div><span class="rendered-kicker">${escapeHtml(labels.clinicCare)}</span><h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(editable.title || labels.clinicTrustTitle)}</h2><p ${inlineEditAttrs(schema, section, "text")}>${escapeHtml(editable.text || labels.clinicTrustText)}</p></div>
    <div class="clinic-trust-grid">${items.slice(0, 6).map((item, index) => `<span ${Array.isArray(editable.items) ? inlineSectionItemEditAttrs(schema, section, index, "", "item_title") : ""}>${escapeHtml(item)}</span>`).join("")}</div>
  </section>`;
}

function renderClinicResults(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.resultItems;
  return `<section class="clinic-results-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="clinic-results-copy"><span class="rendered-kicker">${escapeHtml(labels.results)}</span><h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(editable.title || labels.resultsTitle)}</h2><p ${inlineEditAttrs(schema, section, "text")}>${escapeHtml(editable.text || labels.resultsText)}</p></div>
    <div class="clinic-results-board">${items.slice(0, 4).map((item, index) => `<article><b>${index === 0 ? "01" : `0${index + 1}`}</b><strong ${Array.isArray(editable.items) ? inlineSectionItemEditAttrs(schema, section, index, "", "item_title") : ""}>${escapeHtml(item)}</strong><span>${escapeHtml(index % 2 ? labels.clinicCare : labels.consultationBased)}</span></article>`).join("")}</div>
  </section>`;
}

function renderClinicTeam(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.clinicTeamItems;
  return `<section class="clinic-team-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="clinic-team-media">${editable.image_url ? `<img src="${escapeAttribute(editable.image_url)}" alt="${escapeAttribute(editable.title || "")}">` : clinicVisualPlaceholder(schema)}</div>
    <div><span class="rendered-kicker">${escapeHtml(labels.specialistLed)}</span><h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(editable.title || labels.clinicTeamTitle)}</h2><p ${inlineEditAttrs(schema, section, "text")}>${escapeHtml(editable.text || labels.clinicTeamText)}</p><div class="clinic-mini-proof">${items.slice(0, 4).map((item, index) => `<span ${Array.isArray(editable.items) ? inlineSectionItemEditAttrs(schema, section, index, "", "item_title") : ""}>${escapeHtml(item)}</span>`).join("")}</div></div>
  </section>`;
}

function renderClinicBooking(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  return `<section class="clinic-booking-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div><span class="rendered-kicker">${escapeHtml(labels.bookConsultation)}</span><h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(editable.title || labels.clinicBookingTitle)}</h2><p ${inlineEditAttrs(schema, section, "text")}>${escapeHtml(editable.text || labels.clinicBookingText)}</p></div>
    <a class="rendered-button" href="#" ${inlineEditAttrs(schema, section, "primary_button")}>${escapeHtml(editable.primary_button || labels.bookConsultation)}</a>
  </section>`;
}

function clinicVisualPlaceholder(schema) {
  const initials = String(schema.business?.name || "CL").slice(0, 2).toUpperCase();
  return `<div class="clinic-visual-placeholder"><span>${escapeHtml(initials)}</span><small>${escapeHtml(catalogLocaleLabels(schema).clinicCare)}</small></div>`;
}

function renderProfessionalHero(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = marketplaceItems(schema);
  const heroItem = items.find((item) => item.is_featured && item.image_url) || items.find((item) => item.image_url) || items[0];
  const image = editable.image_url || heroItem?.image_url || "";
  return `<section class="professional-hero ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="professional-hero-copy">
      <span class="rendered-kicker" ${inlineEditAttrs(schema, section, "badge")}>${escapeHtml(editable.badge || labels.professionalFirm)}</span>
      <h1 ${inlineEditAttrs(schema, section, "headline")}>${escapeHtml(editable.headline || schema.business?.name || "")}</h1>
      <p ${inlineEditAttrs(schema, section, "subtitle")}>${escapeHtml(editable.subtitle || schema.business?.description || "")}</p>
      <div class="rendered-actions">
        <a class="rendered-button" href="#" ${inlineEditAttrs(schema, section, "primary_button")}>${escapeHtml(editable.primary_button || labels.scheduleConsultation)}</a>
        <a class="rendered-button secondary" href="#" ${inlineEditAttrs(schema, section, "secondary_button")}>${escapeHtml(editable.secondary_button || labels.viewServices)}</a>
      </div>
      <div class="professional-proof-strip">${(labels.professionalProofItems || []).slice(0, 3).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
    </div>
    <div class="professional-stage">
      <div class="professional-case-card">
        <div class="professional-case-top"><span>${escapeHtml(labels.scheduleConsultation)}</span><b>${escapeHtml(labels.confidential)}</b></div>
        <div class="professional-case-visual">${image ? `<img src="${escapeAttribute(image)}" alt="${escapeAttribute(heroItem?.name || schema.business?.name || "")}">` : professionalVisualPlaceholder(schema)}</div>
        <div class="professional-document-list">${(labels.professionalProcessItems || []).slice(0, 4).map((item, index) => `<span><b>0${index + 1}</b>${escapeHtml(item)}</span>`).join("")}</div>
      </div>
      <div class="professional-floating-card"><small>${escapeHtml(labels.caseReview)}</small><strong ${inlineCatalogEditAttrs(schema, heroItem, "name", "product_name")}>${escapeHtml(heroItem?.name || labels.practiceAreasTitle)}</strong><span>${escapeHtml(heroItem?.shipping_label || labels.professionalEngagements?.[0] || "")}</span></div>
    </div>
  </section>`;
}

function renderProfessionalPracticeAreas(section, schema) {
  const editable = section.editable || {};
  return `<section class="professional-services-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="section-heading"><span class="rendered-kicker">${escapeHtml(catalogLocaleLabels(schema).services)}</span><h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(editable.title || "")}</h2>${Object.prototype.hasOwnProperty.call(editable, "text") ? `<p ${inlineEditAttrs(schema, section, "text")}>${escapeHtml(editable.text)}</p>` : ""}</div>
    ${renderLegalProfessionalCatalog(marketplaceItems(schema), schema)}
  </section>`;
}

function renderProfessionalProcess(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.professionalProcessItems;
  return `<section class="professional-process-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div><span class="rendered-kicker">${escapeHtml(labels.process)}</span><h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(editable.title || labels.professionalProcessTitle)}</h2><p ${inlineEditAttrs(schema, section, "text")}>${escapeHtml(editable.text || labels.professionalProcessText)}</p></div>
    <div class="professional-process-list">${items.slice(0, 6).map((item, index) => `<article><span>0${index + 1}</span><strong ${Array.isArray(editable.items) ? inlineSectionItemEditAttrs(schema, section, index, "", "item_title") : ""}>${escapeHtml(item)}</strong><p>${escapeHtml(index % 2 ? labels.businessReady : labels.confidential)}</p></article>`).join("")}</div>
  </section>`;
}

function renderProfessionalProof(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.professionalProofItems;
  return `<section class="professional-proof-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div><span class="rendered-kicker">${escapeHtml(labels.proof)}</span><h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(editable.title || labels.professionalProofTitle)}</h2><p ${inlineEditAttrs(schema, section, "text")}>${escapeHtml(editable.text || labels.professionalProofText)}</p></div>
    <div class="professional-proof-grid">${items.slice(0, 6).map((item, index) => `<span ${Array.isArray(editable.items) ? inlineSectionItemEditAttrs(schema, section, index, "", "item_title") : ""}>${escapeHtml(item)}</span>`).join("")}</div>
  </section>`;
}

function renderProfessionalTeam(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.professionalTeamItems;
  return `<section class="professional-team-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="professional-team-media">${editable.image_url ? `<img src="${escapeAttribute(editable.image_url)}" alt="${escapeAttribute(editable.title || "")}">` : professionalVisualPlaceholder(schema)}</div>
    <div><span class="rendered-kicker">${escapeHtml(labels.seniorAdvisor)}</span><h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(editable.title || labels.professionalTeamTitle)}</h2><p ${inlineEditAttrs(schema, section, "text")}>${escapeHtml(editable.text || labels.professionalTeamText)}</p><div class="professional-mini-proof">${items.slice(0, 4).map((item, index) => `<span ${Array.isArray(editable.items) ? inlineSectionItemEditAttrs(schema, section, index, "", "item_title") : ""}>${escapeHtml(item)}</span>`).join("")}</div></div>
  </section>`;
}

function renderProfessionalFAQ(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.professionalFaqItems;
  return `<section class="professional-faq-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="section-heading"><span class="rendered-kicker">${escapeHtml(labels.faq)}</span><h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(editable.title || labels.professionalFaqTitle)}</h2></div>
    <div class="professional-faq-list">${items.slice(0, 5).map((item, index) => `<article><strong ${Array.isArray(editable.items) ? inlineSectionItemEditAttrs(schema, section, index, "", "faq_question") : ""}>${escapeHtml(item)}</strong><p>${escapeHtml(labels.professionalConsultationText)}</p></article>`).join("")}</div>
  </section>`;
}

function renderProfessionalConsultation(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  return `<section class="professional-consultation-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div><span class="rendered-kicker">${escapeHtml(labels.scheduleConsultation)}</span><h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(editable.title || labels.professionalConsultationTitle)}</h2><p ${inlineEditAttrs(schema, section, "text")}>${escapeHtml(editable.text || labels.professionalConsultationText)}</p></div>
    <a class="rendered-button" href="#" ${inlineEditAttrs(schema, section, "primary_button")}>${escapeHtml(editable.primary_button || labels.scheduleConsultation)}</a>
  </section>`;
}

function professionalVisualPlaceholder(schema) {
  const initials = String(schema.business?.name || "PF").slice(0, 2).toUpperCase();
  return `<div class="professional-visual-placeholder"><span>${escapeHtml(initials)}</span><small>${escapeHtml(catalogLocaleLabels(schema).professionalFirm)}</small></div>`;
}

function renderEnterpriseHero(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = marketplaceItems(schema);
  const heroItem = items.find((item) => item.is_featured && item.image_url) || items.find((item) => item.image_url) || items[0];
  const image = editable.image_url || heroItem?.image_url || "";
  return `<section class="enterprise-hero ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="enterprise-hero-copy">
      <span class="rendered-kicker">${escapeHtml(editable.badge || labels.enterprisePlatform)}</span>
      <h1>${escapeHtml(editable.headline || schema.business?.name || "")}</h1>
      <p>${escapeHtml(editable.subtitle || schema.business?.description || "")}</p>
      <div class="rendered-actions"><a class="rendered-button" href="#">${escapeHtml(editable.primary_button || labels.requestDemo)}</a><a class="rendered-button secondary" href="#">${escapeHtml(editable.secondary_button || labels.viewSolutions)}</a></div>
      <div class="enterprise-metric-strip">${(labels.enterpriseProofItems || []).slice(0, 3).map((item, index) => `<span><b>${index === 0 ? "99%" : index === 1 ? "2x" : "24/7"}</b>${escapeHtml(item)}</span>`).join("")}</div>
    </div>
    <div class="enterprise-dashboard">
      <div class="enterprise-dashboard-top"><span></span><span></span><span></span><b>${escapeHtml(labels.integrations)}</b></div>
      <div class="enterprise-dashboard-main">${image ? `<img src="${escapeAttribute(image)}" alt="${escapeAttribute(heroItem?.name || schema.business?.name || "")}">` : enterpriseVisualPlaceholder(schema)}</div>
      <div class="enterprise-dashboard-grid">${(labels.enterpriseIntegrationItems || []).slice(0, 6).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
    </div>
  </section>`;
}

function renderEnterpriseSolutions(section, schema) {
  const editable = section.editable || {};
  return `<section class="enterprise-solutions-section ${sectionClass(section)}" ${sectionAttrs(section)}><div class="section-heading"><span class="rendered-kicker">${escapeHtml(catalogLocaleLabels(schema).solutions)}</span><h2>${escapeHtml(editable.title || "")}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>${renderB2BSolutionCatalog(marketplaceItems(schema), schema)}</section>`;
}

function renderEnterpriseUseCases(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.enterpriseUseCaseItems;
  return `<section class="enterprise-use-cases-section ${sectionClass(section)}" ${sectionAttrs(section)}><div><span class="rendered-kicker">${escapeHtml(labels.useCases)}</span><h2>${escapeHtml(editable.title || labels.enterpriseUseCasesTitle)}</h2><p>${escapeHtml(editable.text || labels.enterpriseUseCasesText)}</p></div><div class="enterprise-use-case-grid">${items.slice(0, 6).map((item, index) => `<article><b>0${index + 1}</b><strong>${escapeHtml(item)}</strong><span>${escapeHtml(index % 2 ? labels.integrationReady : labels.roiFocused)}</span></article>`).join("")}</div></section>`;
}

function renderEnterpriseIntegrations(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.enterpriseIntegrationItems;
  return `<section class="enterprise-integrations-section ${sectionClass(section)}" ${sectionAttrs(section)}><div><span class="rendered-kicker">${escapeHtml(labels.integrations)}</span><h2>${escapeHtml(editable.title || labels.enterpriseIntegrationsTitle)}</h2><p>${escapeHtml(editable.text || labels.enterpriseIntegrationsText)}</p></div><div class="enterprise-integration-map">${items.slice(0, 8).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div></section>`;
}

function renderEnterpriseProof(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.enterpriseProofItems;
  return `<section class="enterprise-proof-section ${sectionClass(section)}" ${sectionAttrs(section)}><div><span class="rendered-kicker">${escapeHtml(labels.proof)}</span><h2>${escapeHtml(editable.title || labels.enterpriseProofTitle)}</h2><p>${escapeHtml(editable.text || labels.enterpriseProofText)}</p></div><div class="enterprise-proof-grid">${items.slice(0, 6).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div></section>`;
}

function renderEnterprisePricing(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  return `<section class="enterprise-pricing-section ${sectionClass(section)}" ${sectionAttrs(section)}><div class="section-heading"><span class="rendered-kicker">${escapeHtml(labels.customPlan)}</span><h2>${escapeHtml(editable.title || labels.enterprisePricingTitle)}</h2><p>${escapeHtml(editable.text || labels.enterprisePricingText)}</p></div>${renderB2BSolutionCatalog(marketplaceItems(schema).slice(0, 3), schema)}</section>`;
}

function renderEnterpriseDemo(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  return `<section class="enterprise-demo-section ${sectionClass(section)}" ${sectionAttrs(section)}><div><span class="rendered-kicker">${escapeHtml(labels.requestDemo)}</span><h2>${escapeHtml(editable.title || labels.enterpriseDemoTitle)}</h2><p>${escapeHtml(editable.text || labels.enterpriseDemoText)}</p></div><a class="rendered-button" href="#">${escapeHtml(editable.primary_button || labels.requestDemo)}</a></section>`;
}

function enterpriseVisualPlaceholder(schema) {
  const initials = String(schema.business?.name || "B2").slice(0, 2).toUpperCase();
  return `<div class="enterprise-visual-placeholder"><span>${escapeHtml(initials)}</span><small>${escapeHtml(catalogLocaleLabels(schema).enterprisePlatform)}</small></div>`;
}

function renderIndustrialHero(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = marketplaceItems(schema);
  const heroItem = items.find((item) => item.is_featured && item.image_url) || items.find((item) => item.image_url) || items[0];
  const image = editable.image_url || heroItem?.image_url || "";
  return `<section class="industrial-hero ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="industrial-hero-copy">
      <span class="rendered-kicker">${escapeHtml(editable.badge || labels.industrialSupplier)}</span>
      <h1>${escapeHtml(editable.headline || schema.business?.name || "")}</h1>
      <p>${escapeHtml(editable.subtitle || schema.business?.description || "")}</p>
      <div class="rendered-actions">
        <a class="rendered-button" href="#">${escapeHtml(editable.primary_button || labels.requestQuote)}</a>
        <a class="rendered-button secondary" href="#">${escapeHtml(editable.secondary_button || labels.viewSpecs)}</a>
      </div>
      <div class="industrial-proof-strip">${(labels.industrialCertificationItems || []).slice(0, 3).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
    </div>
    <div class="industrial-rfq-dashboard">
      <div class="industrial-dashboard-top"><span></span><span></span><span></span><b>${escapeHtml(labels.requestQuote)}</b></div>
      <div class="industrial-dashboard-body">
        <div class="industrial-product-visual">${image ? `<img src="${escapeAttribute(image)}" alt="${escapeAttribute(heroItem?.name || schema.business?.name || "")}">` : industrialVisualPlaceholder(schema)}</div>
        <div class="industrial-spec-table">
          ${(items.length ? items : [{ name: labels.industrialCatalogTitle }, { name: labels.certifications }, { name: labels.supplyChain }]).slice(0, 4).map((item, index) => `<div><b>${escapeHtml(item.specs?.sku || `IND-${String(index + 1).padStart(3, "0")}`)}</b><span>${escapeHtml(item.name)}</span><small>${escapeHtml(item.shipping_label || labels.industrialLeadTimes?.[index % (labels.industrialLeadTimes?.length || 1)] || "")}</small></div>`).join("")}
        </div>
      </div>
    </div>
  </section>`;
}

function renderIndustrialSpecCatalog(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  return `<section class="industrial-catalog-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="industrial-catalog-header">
      <div><span class="rendered-kicker">${escapeHtml(labels.viewSpecs)}</span><h2>${escapeHtml(editable.title || "")}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
      <div class="industrial-catalog-stats"><span>${escapeHtml(labels.quoteRequired)}</span><span>${escapeHtml(labels.moqReady)}</span><span>${escapeHtml(labels.certified)}</span></div>
    </div>
    ${renderIndustrialSupplierCatalog(marketplaceItems(schema), schema)}
  </section>`;
}

function renderIndustrialCapabilities(section, schema) {
  return renderCapabilitiesEquipment(section, schema);
}

function renderCapabilitiesEquipment(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.industrialCapabilityItems;
  return `<section class="industrial-capabilities-section capabilities-equipment ${sectionClass(section)}" ${sectionAttrs(section)}><div><span class="rendered-kicker">${escapeHtml(labels.capabilities)}</span><h2>${escapeHtml(editable.title || labels.industrialCapabilitiesTitle)}</h2><p>${escapeHtml(editable.text || labels.industrialCapabilitiesText)}</p></div><div class="industrial-capability-board">${items.slice(0, 8).map((item, index) => {
    const entry = typeof item === "object" ? item : { title: item };
    return `<div><b>${escapeHtml(entry.icon || String(index + 1).padStart(2, "0"))}</b><strong>${escapeHtml(entry.title || entry.name || "")}</strong><span>${escapeHtml(entry.description || (index % 2 ? labels.bulkReady : labels.specReady))}</span></div>`;
  }).join("")}</div></section>`;
}

function renderIndustrialCertifications(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.industrialCertificationItems;
  return `<section class="industrial-certifications-section ${sectionClass(section)}" ${sectionAttrs(section)}><div><span class="rendered-kicker">${escapeHtml(labels.certifications)}</span><h2>${escapeHtml(editable.title || labels.industrialCertificationsTitle)}</h2><p>${escapeHtml(editable.text || labels.industrialCertificationsText)}</p></div><div class="industrial-doc-stack">${items.slice(0, 6).map((item, index) => `<article><b>DOC-${String(index + 1).padStart(2, "0")}</b><span>${escapeHtml(item)}</span><small>PDF / QA</small></article>`).join("")}</div></section>`;
}

function renderIndustrialSupplyChain(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.industrialSupplyItems;
  return `<section class="industrial-supply-section ${sectionClass(section)}" ${sectionAttrs(section)}><div class="section-heading"><span class="rendered-kicker">${escapeHtml(labels.supplyChain)}</span><h2>${escapeHtml(editable.title || labels.industrialSupplyTitle)}</h2><p>${escapeHtml(editable.text || labels.industrialSupplyText)}</p></div><div class="industrial-supply-line">${items.slice(0, 6).map((item, index) => `<article><small>STEP ${index + 1}</small><strong>${escapeHtml(item)}</strong></article>`).join("")}</div></section>`;
}

function renderIndustrialQuotePanel(section, schema) {
  return renderQuoteRequestForm(section, schema);
}

function renderQuoteRequestForm(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const language = schema.business?.selectedLanguage || "en";
  const defaults = language === "es"
    ? [{ name: "need", label: "Que necesitas" }, { name: "quantity", label: "Cantidad aproximada" }, { name: "target_date", label: "Fecha deseada", type: "date" }, { name: "notes", label: "Notas", type: "textarea" }]
    : [{ name: "need", label: "What do you need" }, { name: "quantity", label: "Approximate quantity" }, { name: "target_date", label: "Desired date", type: "date" }, { name: "notes", label: "Notes", type: "textarea" }];
  const fields = Array.isArray(editable.fields) && editable.fields.length ? editable.fields : defaults;
  return `<section class="industrial-quote-section quote-request-form ${sectionClass(section)}" ${sectionAttrs(section)}><div class="industrial-quote-card"><div><span class="rendered-kicker">${escapeHtml(labels.requestQuote)}</span><h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(editable.title || labels.industrialQuoteTitle)}</h2><p ${inlineEditAttrs(schema, section, "text")}>${escapeHtml(editable.text || labels.industrialQuoteText)}</p></div><div class="industrial-rfq-fields">${fields.slice(0, 8).map((field, index) => {
    const entry = typeof field === "object" ? field : { label: field };
    const label = entry.label || entry.name || defaults[index]?.label || "Details";
    const control = entry.type === "textarea"
      ? `<textarea name="${escapeAttribute(entry.name || slugify(label))}" placeholder="${escapeAttribute(entry.placeholder || label)}" ${entry.required ? "required" : ""}></textarea>`
      : `<input type="${escapeAttribute(entry.type || "text")}" name="${escapeAttribute(entry.name || slugify(label))}" placeholder="${escapeAttribute(entry.placeholder || label)}" ${entry.required ? "required" : ""}>`;
    const labelAttrs = inlineEditAttrsForPath(schema, inlineEditSectionCollectionItemPath(schema, section, "fields", index, "label"), "item_title");
    return `<label><span ${labelAttrs}>${escapeHtml(label)}</span>${control}</label>`;
  }).join("")}</div><button class="rendered-button" type="button" data-open-lead ${inlineEditAttrs(schema, section, "primary_button")}>${escapeHtml(editable.primary_button || labels.requestQuote)}</button></div></section>`;
}

function industrialVisualPlaceholder(schema) {
  const initials = String(schema.business?.name || "IN").slice(0, 2).toUpperCase();
  return `<div class="industrial-visual-placeholder"><span>${escapeHtml(initials)}</span><small>${escapeHtml(catalogLocaleLabels(schema).industrialSupplier)}</small></div>`;
}

function renderListingHero(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = marketplaceItems(schema);
  const image = editable.image_url || items.find((item) => item.image_url)?.image_url || "";
  return `<section class="listing-pro-hero ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="listing-pro-copy">
      <span class="rendered-kicker">${escapeHtml(schema.business?.location || labels.areas)}</span>
      <h1>${escapeHtml(editable.headline || schema.business?.name || "")}</h1>
      <p>${escapeHtml(editable.subtitle || schema.business?.description || "")}</p>
      <label class="listing-search-bar">
        <span>${escapeHtml(labels.search)}</span>
        <input readonly value="" placeholder="${escapeAttribute(editable.search_placeholder || labels.listingSearchPlaceholder)}">
        <button type="button">${escapeHtml(editable.primary_button || labels.searchListings)}</button>
      </label>
      <div class="listing-quick-filters">${listingCategories(schema).slice(0, 4).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
    </div>
    <div class="listing-pro-stage">
      <div class="listing-map-card">${image ? `<img src="${escapeAttribute(image)}" alt="${escapeAttribute(schema.business?.name || "")}">` : listingVisualPlaceholder(schema)}</div>
      <article class="listing-floating-card">
        <small>${escapeHtml(labels.featuredListing)}</small>
        <strong>${escapeHtml(items[0]?.name || labels.featuredListingsTitle)}</strong>
        <span>${escapeHtml(items[0]?.shipping_label || listingLocationForIndex(0, labels))}</span>
        <b>${escapeHtml(productPriceLabel(items[0] || { price_label: labels.listingPrice }, schema))}</b>
      </article>
    </div>
  </section>`;
}

function renderListingFilters(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const categories = Array.isArray(editable.items) && editable.items.length ? editable.items : listingCategories(schema);
  return `<section class="listing-filter-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div><span class="rendered-kicker">${escapeHtml(labels.searchFilters)}</span><h2>${escapeHtml(editable.title || labels.listingFiltersTitle)}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div class="listing-filter-grid">${categories.slice(0, 6).map((item, index) => `<article><strong>${escapeHtml(item)}</strong><span>${escapeHtml(index % 2 ? labels.availableNow : labels.featuredListing)}</span></article>`).join("")}</div>
  </section>`;
}

function renderListingFeatured(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  return `<section class="listing-featured-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="section-heading"><span class="rendered-kicker">${escapeHtml(labels.listings)}</span><h2>${escapeHtml(editable.title || labels.featuredListingsTitle)}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    ${renderRealEstateListingCatalog(marketplaceItems(schema), schema)}
  </section>`;
}

function renderListingAreaPanel(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const locations = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.listingLocations;
  return `<section class="listing-area-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div><span class="rendered-kicker">${escapeHtml(labels.areas)}</span><h2>${escapeHtml(editable.title || labels.listingAreaTitle)}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div class="listing-area-map">${locations.slice(0, 6).map((item, index) => `<span style="--x:${18 + (index * 13) % 64}%;--y:${18 + (index * 19) % 58}%">${escapeHtml(item)}</span>`).join("")}</div>
  </section>`;
}

function renderListingTrust(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.listingTrustItems;
  return `<section class="listing-trust-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div><span class="rendered-kicker">${escapeHtml(labels.trustTitle)}</span><h2>${escapeHtml(editable.title || labels.listingTrustTitle)}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div>${items.slice(0, 6).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
  </section>`;
}

function renderListingContact(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  return `<section class="listing-contact-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="listing-contact-card">
      <span class="rendered-kicker">${escapeHtml(labels.inquireNow)}</span>
      <h2>${escapeHtml(editable.title || labels.listingContactTitle)}</h2>
      <p>${escapeHtml(editable.text || labels.listingContactText)}</p>
      <div class="rendered-actions">
        <a class="rendered-button" href="#">${escapeHtml(labels.inquireNow)}</a>
        <a class="rendered-button secondary" href="#">${escapeHtml(labels.contact)}</a>
      </div>
    </div>
  </section>`;
}

function renderRealEstateListingCatalog(items, schema) {
  const labels = catalogLocaleLabels(schema);
  return `<div class="catalog-real-estate-listings">${items.map((item, index) => `<article class="${index === 0 ? "featured" : ""}">
    <div class="listing-image">${renderCatalogImage(item)}</div>
    <div class="listing-card-body">
      <div class="listing-card-top"><small>${escapeHtml(item.deal_label || labels.availableNow)}</small><span>${escapeHtml(item.category || labels.listings)}</span></div>
      <h3>${escapeHtml(item.name)}</h3>
      <p>${escapeHtml(item.description)}</p>
      <div class="listing-spec-row"><span>${escapeHtml(item.shipping_label || listingLocationForIndex(index, labels))}</span><span>${escapeHtml(index % 2 ? "3 bd" : "2 bd")}</span><span>${escapeHtml(index % 3 ? "2 ba" : "1 ba")}</span></div>
      <div class="listing-card-bottom"><strong>${escapeHtml(productPriceLabel(item, schema))}</strong><a class="rendered-button" href="#">${escapeHtml(item.button_label || labels.inquireNow)}</a></div>
    </div>
  </article>`).join("")}</div>`;
}

function listingCategories(schema) {
  const fromItems = [...new Set(marketplaceItems(schema).map((item) => item.category).filter(Boolean))];
  const labels = catalogLocaleLabels(schema);
  return [...new Set([...fromItems, ...(labels.listingCategories || [])])];
}

function listingVisualPlaceholder(schema) {
  const initials = String(schema.business?.name || "LS").slice(0, 2).toUpperCase();
  return `<div class="listing-visual-placeholder"><span>${escapeHtml(initials)}</span><small>${escapeHtml(catalogLocaleLabels(schema).listings)}</small></div>`;
}

function renderHomeServiceHero(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const image = editable.image_url || marketplaceItems(schema).find((item) => item.image_url)?.image_url || "";
  const phone = schema.contact?.phone || schema.contact?.whatsapp || labels.callNow;
  return `<section class="home-service-hero ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="home-service-hero-copy">
      <span class="rendered-kicker">${escapeHtml(schema.business?.location || labels.localExperts)}</span>
      <h1>${escapeHtml(editable.headline || schema.business?.name || "")}</h1>
      <p>${escapeHtml(editable.subtitle || schema.business?.description || "")}</p>
      <div class="home-service-actions">
        <a class="rendered-button" href="#">${escapeHtml(editable.primary_button || labels.freeQuote)}</a>
        <a class="rendered-button secondary" href="#">${escapeHtml(editable.secondary_button || labels.callNow)}</a>
      </div>
      <div class="home-service-phone"><strong>${escapeHtml(phone)}</strong><span>${escapeHtml(labels.fastResponse)}</span></div>
    </div>
    <div class="home-service-hero-visual">${image ? `<img src="${escapeAttribute(image)}" alt="">` : homeServiceVisualPlaceholder(schema)}</div>
    <div class="home-service-proof">${labels.homeServiceTrustItems.slice(0, 3).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
  </section>`;
}

function renderHomeServiceCategories(section, schema) {
  const editable = section.editable || {};
  return `<section class="home-service-categories ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="section-heading"><span class="rendered-kicker">${escapeHtml(catalogLocaleLabels(schema).services)}</span><h2>${escapeHtml(editable.title || "")}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    ${renderHomeServicesCatalog(marketplaceItems(schema), schema)}
  </section>`;
}

function renderHomeServiceAreas(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.serviceAreaItems;
  return `<section class="home-service-areas ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div><span class="rendered-kicker">${escapeHtml(labels.serviceAreas)}</span><h2>${escapeHtml(editable.title || "")}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div class="home-service-area-map">${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
  </section>`;
}

function renderHomeServiceGallery(section, schema) {
  return renderPortfolioGallery(section, schema);
}

function renderPortfolioGallery(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = (Array.isArray(editable.items) && editable.items.length ? editable.items : marketplaceItems(schema)).slice(0, 8);
  const beforeAfter = section.settings?.layout === "before_after" || editable.before_after === true || items.some((item) => item.beforeImageUrl || item.afterImageUrl);
  return `<section class="home-service-gallery portfolio-gallery ${beforeAfter ? "is-before-after" : ""} ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="section-heading"><span class="rendered-kicker">${escapeHtml(labels.workProof)}</span><h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(inlineEditableValue(editable, "title", ""))}</h2>${Object.prototype.hasOwnProperty.call(editable, "text") ? `<p ${inlineEditAttrs(schema, section, "text")}>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div class="home-service-work-grid">${items.map((item, index) => {
      const titleField = Object.prototype.hasOwnProperty.call(item, "name") ? "name" : "title";
      const titleAttrs = inlineCatalogEditAttrs(schema, item, "name", "product_name")
        || inlineSectionItemEditAttrs(schema, section, index, titleField, "item_title");
      const descriptionAttrs = inlineCatalogEditAttrs(schema, item, "description", "product_description")
        || inlineSectionItemEditAttrs(schema, section, index, "description", "item_description");
      return `<article>
        ${beforeAfter && (item.beforeImageUrl || item.afterImageUrl) ? `<div class="portfolio-before-after"><figure>${renderResilientImage(item.beforeImageUrl || item.image_url, item.name, `${item.name || "Project"} before`)}<figcaption>${escapeHtml(labels.before)}</figcaption></figure><figure>${renderResilientImage(item.afterImageUrl || item.image_url, item.name, `${item.name || "Project"} after`)}<figcaption>${escapeHtml(labels.after)}</figcaption></figure></div>` : renderResilientImage(item.image_url || item.imageUrl, item.name || item.title, item.name || item.title)}
        ${renderImageAttribution(item)}
        <div><strong ${titleAttrs}>${escapeHtml(item.name || item.title || "")}</strong>${item.description ? `<p ${descriptionAttrs}>${escapeHtml(item.description)}</p>` : ""}${item.price_label || item.price ? `<b>${escapeHtml(item.price_label || item.price)}</b>` : ""}</div>
      </article>`;
    }).join("")}</div>
  </section>`;
}

function renderVideoShowcase(section, schema) {
  const editable = section.editable || {};
  const videoUrl = editable.videoUrl || editable.video_url || editable.url || "";
  const embedUrl = safeVideoEmbedUrl(videoUrl);
  const heading = `<div class="section-heading"><h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(editable.title || "Video")}</h2>${Object.prototype.hasOwnProperty.call(editable, "text") ? `<p ${inlineEditAttrs(schema, section, "text")}>${escapeHtml(editable.text)}</p>` : ""}</div>`;
  if (!embedUrl) return `<section class="video-showcase ${sectionClass(section)}" ${sectionAttrs(section)}>${heading}<p class="video-unavailable">Video URL unavailable or unsupported.</p></section>`;
  return `<section class="video-showcase ${sectionClass(section)}" ${sectionAttrs(section)}>${heading}<div class="video-embed"><iframe src="${escapeAttribute(embedUrl)}" title="${escapeAttribute(editable.title || "Video")}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div></section>`;
}

function safeVideoEmbedUrl(value) {
  try {
    const url = new URL(String(value || ""));
    const host = url.hostname.toLowerCase();
    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return /^[a-zA-Z0-9_-]{6,}$/.test(id || "") ? `https://www.youtube.com/embed/${id}` : "";
    }
    if (["youtube.com", "www.youtube.com"].includes(host)) {
      const id = url.searchParams.get("v") || (url.pathname.match(/^\/(?:embed|shorts)\/([a-zA-Z0-9_-]+)/) || [])[1];
      return /^[a-zA-Z0-9_-]{6,}$/.test(id || "") ? `https://www.youtube.com/embed/${id}` : "";
    }
    if (["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(host)) {
      const id = (url.pathname.match(/\/(?:video\/)?(\d+)/) || [])[1];
      return id ? `https://player.vimeo.com/video/${id}` : "";
    }
  } catch (_error) {
    return "";
  }
  return "";
}

function renderHomeServiceTrust(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.homeServiceTrustItems;
  return `<section class="home-service-trust ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div><span class="rendered-kicker">${escapeHtml(labels.proof)}</span><h2>${escapeHtml(editable.title || "")}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div>${items.map((item) => `<blockquote>${escapeHtml(item)}</blockquote>`).join("")}</div>
  </section>`;
}

function renderHomeServiceQuote(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const phone = schema.contact?.phone || schema.contact?.whatsapp || labels.callNow;
  return `<section class="home-service-quote ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div><h2>${escapeHtml(editable.title || labels.freeQuote)}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div class="home-service-quote-card">
      <strong>${escapeHtml(phone)}</strong>
      <span>${escapeHtml(labels.quoteExpectation)}</span>
      <a class="rendered-button" href="#">${escapeHtml(labels.freeQuote)}</a>
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
  const image = editable.image_url || marketplaceItems(schema).find((item) => item.image_url)?.image_url || "";
  return `<section class="booking-hero ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="booking-hero-copy">
      <span class="rendered-kicker">${escapeHtml(schema.business?.location || labels.appointments)}</span>
      <h1>${escapeHtml(editable.headline || schema.business?.name || "")}</h1>
      <p>${escapeHtml(editable.subtitle || schema.business?.description || "")}</p>
      <div class="rendered-actions">
        <a class="rendered-button" href="#">${escapeHtml(editable.primary_button || labels.bookNow)}</a>
        <a class="rendered-button secondary" href="#">${escapeHtml(editable.secondary_button || labels.viewServices)}</a>
      </div>
    </div>
    <div class="booking-stage">
      <div class="booking-stage-visual">${image ? `<img src="${escapeAttribute(image)}" alt="">` : bookingVisualPlaceholder(schema)}</div>
      <div class="booking-mini-card"><strong>${escapeHtml(labels.nextAvailable)}</strong><span>${escapeHtml(labels.availabilityItems[0])}</span><button type="button">${escapeHtml(labels.bookNow)}</button></div>
    </div>
    <div class="booking-proof-strip">${labels.bookingProofItems.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
  </section>`;
}

function renderBookingServices(section, schema) {
  const editable = section.editable || {};
  return `<section class="booking-services-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="section-heading"><span class="rendered-kicker">${escapeHtml(catalogLocaleLabels(schema).services)}</span><h2>${escapeHtml(editable.title || "")}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    ${renderBookingMenuCatalog(marketplaceItems(schema), schema)}
  </section>`;
}

function renderBookingAvailability(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.availabilityItems;
  return `<section class="booking-availability-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div><span class="rendered-kicker">${escapeHtml(labels.availability)}</span><h2>${escapeHtml(editable.title || "")}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div class="booking-availability-grid">${items.map((item, index) => `<article><small>${escapeHtml(labels.slot)} 0${index + 1}</small><strong>${escapeHtml(item)}</strong><span>${escapeHtml(labels.confirmation)}</span></article>`).join("")}</div>
  </section>`;
}

function renderBookingTeam(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.bookingTeamItems;
  return `<section class="booking-team-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div><span class="rendered-kicker">${escapeHtml(labels.team)}</span><h2>${escapeHtml(editable.title || "")}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div class="booking-team-list">${items.map((item, index) => `<article><small>0${index + 1}</small><strong>${escapeHtml(item)}</strong></article>`).join("")}</div>
  </section>`;
}

function renderBookingContact(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  return `<section class="booking-contact-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div><h2>${escapeHtml(editable.title || labels.bookNow)}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div class="booking-contact-card"><strong>${escapeHtml(labels.confirmation)}</strong><span>${escapeHtml(labels.bookingContactFallback)}</span><a class="rendered-button" href="#">${escapeHtml(labels.bookNow)}</a></div>
  </section>`;
}

function bookingVisualPlaceholder(schema) {
  const initials = String(schema.business?.name || "BK").slice(0, 2).toUpperCase();
  return `<div class="booking-visual-placeholder"><span>${escapeHtml(initials)}</span></div>`;
}

function renderFunnelHero(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const image = editable.image_url || marketplaceItems(schema).find((item) => item.image_url)?.image_url || "";
  return `<section class="funnel-hero ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="funnel-hero-copy">
      <span class="rendered-kicker">${escapeHtml(schema.business?.industry || labels.offer)}</span>
      <h1>${escapeHtml(editable.headline || schema.business?.name || "")}</h1>
      <p>${escapeHtml(editable.subtitle || schema.business?.description || "")}</p>
      <div class="rendered-actions">
        <a class="rendered-button" href="#">${escapeHtml(editable.primary_button || labels.claimOffer)}</a>
        <a class="rendered-button secondary" href="#">${escapeHtml(editable.secondary_button || labels.seeProof)}</a>
      </div>
    </div>
    <div class="funnel-hero-card">
      <div class="funnel-hero-visual">${image ? `<img src="${escapeAttribute(image)}" alt="">` : funnelVisualPlaceholder(schema)}</div>
      <div class="funnel-mini-form">
        <strong>${escapeHtml(labels.nextStep)}</strong>
        <span>${escapeHtml(labels.quickRequest)}</span>
        <button type="button">${escapeHtml(labels.claimOffer)}</button>
      </div>
    </div>
    <div class="funnel-proof-strip">${(labels.funnelProofItems || []).slice(0, 3).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
  </section>`;
}

function renderFunnelBenefits(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.funnelBenefitsItems;
  return `<section class="funnel-benefits-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="section-heading"><span class="rendered-kicker">${escapeHtml(labels.benefits)}</span><h2>${escapeHtml(editable.title || "")}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div class="funnel-benefit-grid">${items.map((item, index) => `<article><small>0${index + 1}</small><strong>${escapeHtml(item)}</strong></article>`).join("")}</div>
  </section>`;
}

function renderFunnelOffer(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  return `<section class="funnel-offer-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div>
      <span class="rendered-kicker">${escapeHtml(labels.offer)}</span>
      <h2>${escapeHtml(editable.title || "")}</h2>
      ${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}
      ${editable.guarantee ? `<strong>${escapeHtml(editable.guarantee)}</strong>` : ""}
    </div>
    ${renderLeadFunnelOfferCatalog(marketplaceItems(schema), schema)}
  </section>`;
}

function renderFunnelProof(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.funnelProofItems;
  return `<section class="funnel-proof-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div><span class="rendered-kicker">${escapeHtml(labels.proof)}</span><h2>${escapeHtml(editable.title || "")}</h2>${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}</div>
    <div>${items.map((item) => `<blockquote>${escapeHtml(item)}</blockquote>`).join("")}</div>
  </section>`;
}

function renderFunnelFAQ(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = Array.isArray(editable.items) && editable.items.length ? editable.items : labels.funnelFaqItems;
  return `<section class="funnel-faq-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div><span class="rendered-kicker">${escapeHtml(labels.faq)}</span><h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(inlineEditableValue(editable, "title", ""))}</h2></div>
    <div class="funnel-faq-list">${items.map((item, index) => `<article><strong ${inlineSectionItemEditAttrs(schema, section, index, typeof item === "object" ? "question" : "", "faq_question")}>${escapeHtml(item.question || item)}</strong><p ${typeof item === "object" && Object.prototype.hasOwnProperty.call(item, "answer") ? inlineSectionItemEditAttrs(schema, section, index, "answer", "faq_answer") : ""}>${escapeHtml(item.answer || labels.faqAnswer)}</p></article>`).join("")}</div>
  </section>`;
}

function funnelVisualPlaceholder(schema) {
  const initials = String(schema.business?.name || "LF").slice(0, 2).toUpperCase();
  return `<div class="funnel-visual-placeholder"><span>${escapeHtml(initials)}</span></div>`;
}

function renderMarketplaceHero(section, schema) {
  const editable = section.editable || {};
  const items = marketplaceItems(schema);
  const labels = catalogLocaleLabels(schema);
  const topItems = items.slice(0, 4);
  const categories = marketplaceCategories(schema);
  const heroProducts = topItems.map((item, index) => `<article class="marketplace-hero-product-card" ${catalogSearchAttributes(item)}>
        ${renderCatalogImage(item)}
        <small>${escapeHtml(index % 2 ? labels.fastShip : labels.deal)}</small>
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(productPriceLabel(item, schema))}</span>
      </article>`).join("");
  const variant = section.variant || section.settings?.layout || "split_showcase";
  return `<section class="marketplace-hero marketplace-hero-${escapeAttribute(slugify(variant))} ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="marketplace-search-panel">
      <div class="marketplace-logo-row">
        <strong>${escapeHtml(schema.business?.name || "Marketplace")}</strong>
        <span>${escapeHtml(editable.deal_badge || labels.deal)}</span>
      </div>
      <form class="marketplace-search-box" data-catalog-search-form>
        <input type="search" name="catalog-search" aria-label="${escapeAttribute(labels.search)}" placeholder="${escapeAttribute(editable.search_placeholder || labels.searchPlaceholder)}">
        <button type="submit">${escapeHtml(labels.searchButton)}</button>
      </form>
      <div class="marketplace-chip-row">${categories.slice(0, 6).map((category) => `<button type="button" data-catalog-category="${escapeAttribute(category)}">${escapeHtml(category)}</button>`).join("")}</div>
    </div>
    <div class="marketplace-deal-hero marketplace-commerce-home">
      <div class="marketplace-hero-copy">
        <small>${escapeHtml(editable.deal_badge || labels.deal)}</small>
        <h1>${escapeHtml(editable.headline || schema.business?.name || "")}</h1>
        <p>${escapeHtml(editable.subtitle || schema.business?.description || "")}</p>
        <div class="marketplace-mini-stat-row">
          <span>${escapeHtml(labels.secureCheckout)}</span>
          <span>${escapeHtml(labels.fastShip)}</span>
          <span>${escapeHtml(labels.support)}</span>
        </div>
        <div class="rendered-actions">
          <a class="rendered-button" href="#" data-page-link="catalog">${escapeHtml(editable.primary_button || schema.theme?.buttons?.primary_label || labels.shopNow)}</a>
          <a class="rendered-button secondary" href="#" data-page-link="catalog">${escapeHtml(editable.secondary_button || labels.categories)}</a>
        </div>
      </div>
      <aside class="marketplace-hero-products-panel">
        <div class="marketplace-hero-products-head">
          <b>${escapeHtml(editable.deal_title || labels.dealTitle)}</b>
          <span>${escapeHtml(labels.sortBy)}: ${escapeHtml(labels.featured)}</span>
        </div>
        <div class="marketplace-hero-products">${heroProducts}</div>
      </aside>
    </div>
  </section>`;
}

function renderCategoryRail(section, schema) {
  const editable = section.editable || {};
  const categories = marketplaceCategories(schema);
  return `<section class="marketplace-category-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="section-heading">
      <span class="rendered-kicker">${escapeHtml(schema.business?.tone || "")}</span>
      <h2>${escapeHtml(editable.title || catalogLocaleLabels(schema).categories)}</h2>
      ${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}
    </div>
    <div class="marketplace-category-rail">${categories.map((category, index) => `<article>
      <span>${escapeHtml(category.slice(0, 2).toUpperCase())}</span>
      <strong>${escapeHtml(category)}</strong>
      <small>${escapeHtml(index % 2 ? catalogLocaleLabels(schema).fastShip : catalogLocaleLabels(schema).deal)}</small>
    </article>`).join("")}</div>
  </section>`;
}

function renderDealRow(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const items = marketplaceItems(schema).slice(0, 6);
  return `<section class="marketplace-deal-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="section-heading">
      <span class="rendered-kicker">${escapeHtml(labels.deal)}</span>
      <h2>${escapeHtml(editable.title || labels.dealTitle)}</h2>
      ${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}
    </div>
    <div class="marketplace-deal-row catalog-count-${Math.min(items.length, 9)}">${items.map((item, index) => renderCatalogCard(item, "market-card deal-card", index % 2 ? labels.fastShip : labels.deal, schema)).join("")}</div>
  </section>`;
}

function renderTrustStrip(section, schema) {
  const editable = section.editable || {};
  const labels = catalogLocaleLabels(schema);
  const trust = [labels.secureCheckout, labels.fastShip, labels.support, labels.easyReturns];
  return `<section class="marketplace-trust-strip ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div>
      <h2>${escapeHtml(editable.title || labels.trustTitle)}</h2>
      ${editable.text ? `<p>${escapeHtml(editable.text)}</p>` : ""}
    </div>
    <div>${trust.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
  </section>`;
}

function renderProductGrid(section, schema) {
  const editable = section.editable || {};
  const columns = Math.max(2, Math.min(Number(section.settings?.columns || 3), 4));
  const catalogItems = (schema.catalog_items || schema.products_services || [])
    .filter((item) => item.is_active !== false && item.display_in_catalog !== false)
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  const catalogType = schema.catalog_model?.catalogType || schema.layout_mode?.catalog_type || "editorial_minimal_grid";
  const customCatalog = renderCatalogByType(catalogType, catalogItems, schema);
  return `<section class="rendered-section section-${escapeAttribute(slugify(section.settings?.layout || "grid"))} ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="section-heading">
      <span class="rendered-kicker">${escapeHtml(schema.business.tone || "Selected")}</span>
      <h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(inlineEditableValue(editable, "title", editable.headline || "Products and services"))}</h2>
      ${Object.prototype.hasOwnProperty.call(editable, "text") || editable.subtitle ? `<p ${inlineEditAttrs(schema, section, "text")}>${escapeHtml(inlineEditableValue(editable, "text", editable.subtitle || ""))}</p>` : ""}
    </div>
    ${customCatalog || `<div class="rendered-grid columns-${columns}">
      ${catalogItems
        .map(
          (item) => `<article class="rendered-card">
            ${renderCatalogImage(item)}
            <div>
              <h3 ${inlineCatalogEditAttrs(schema, item, "name", "product_name")}>${escapeHtml(item.name)}</h3>
              <p ${inlineCatalogEditAttrs(schema, item, "description", "product_description")}>${escapeHtml(item.description)}</p>
              <strong>${escapeHtml(productPriceLabel(item, schema))}</strong>
              ${productStockBadge(item)}
              <br><a class="rendered-button" href="#">${escapeHtml(item.button_label)}</a>
            </div>
          </article>`,
        )
        .join("")}
    </div>`}
  </section>`;
}

function renderCatalogByType(catalogType, items, schema) {
  const renderers = {
    premium_editorial_catalog: renderPremiumEditorialCatalog,
    single_vendor_dense_catalog: renderMarketplaceCatalog,
    dense_retail_catalog: renderMarketplaceCatalog,
    dense_marketplace_catalog: renderMarketplaceCatalog,
    listing_marketplace_catalog: renderClassifiedMarketplaceCatalog,
    real_estate_listing_catalog: renderRealEstateListingCatalog,
    editorial_minimal_grid: renderMinimalProductGrid,
    lookbook_collection_catalog: renderFashionLookbookCatalog,
    luxury_gallery_catalog: renderLuxuryGalleryCatalog,
    luxury_high_ticket_catalog: renderLuxuryHighTicketCatalog,
    education_course_catalog: renderEducationCourseCatalog,
    medical_wellness_service_catalog: renderMedicalWellnessCatalog,
    legal_professional_services_catalog: renderLegalProfessionalCatalog,
    b2b_solution_catalog: renderB2BSolutionCatalog,
    industrial_supplier_catalog: renderIndustrialSupplierCatalog,
    digital_offer_catalog: renderDigitalOfferCatalog,
    restaurant_menu_catalog: renderRestaurantMenuCatalog,
    menu_catalog: renderRestaurantMenuCatalog,
    online_ordering_catalog: renderRestaurantMenuCatalog,
    booking_menu_catalog: renderBookingMenuCatalog,
    service_area_catalog: renderLocalServiceCatalog,
    company_services_catalog: renderCorporateServicesCatalog,
    home_services_quote_catalog: renderHomeServicesCatalog,
    lead_funnel_offer_catalog: renderLeadFunnelOfferCatalog,
    practice_area_catalog: renderProfessionalServicesCatalog,
    project_gallery_catalog: renderBeforeAfterProjectCatalog,
    pricing_plan_catalog: renderPricingPlanCatalog,
    ticket_or_offer_catalog: renderEventTicketCatalog,
    service_package_catalog: renderPersonalBrandServicesCatalog,
  };
  return (renderers[catalogType] || renderMinimalProductGrid)(items, schema, catalogType);
}

function renderMarketplaceCatalog(items, schema) {
  const labels = catalogLocaleLabels(schema);
  const groups = groupCatalogItemsByCategory(items, labels);
  return `<div class="catalog-shell catalog-marketplace">
    <aside>
      <strong>${labels.searchFilters}</strong>
      ${groups.map(([category]) => `<a href="#catalog-category-${escapeAttribute(slugify(category))}">${escapeHtml(category)}</a>`).join("")}
      <span>${labels.price}</span><span>${labels.rating}</span><span>${labels.delivery}</span>
    </aside>
    <div class="marketplace-catalog-main">
      <div class="marketplace-sort-bar"><b>${escapeHtml(labels.results)}</b><span>${escapeHtml(labels.sortBy)}: ${escapeHtml(labels.featured)}</span></div>
      <div class="marketplace-category-groups">${groups.map(([category, categoryItems]) => `<section id="catalog-category-${escapeAttribute(slugify(category))}" class="marketplace-category-group" data-catalog-group><div class="marketplace-category-heading"><h3>${escapeHtml(category)}</h3><span>${categoryItems.length}</span></div><div class="catalog-results">${categoryItems.map((item, index) => renderCatalogCard(item, "market-card", `${index % 3 === 0 ? labels.deal : labels.fastShip}`, schema)).join("")}</div></section>`).join("")}</div>
    </div>
  </div>${renderMarketplaceSubscribe(schema)}`;
}

function groupCatalogItemsByCategory(items, labels) {
  const groups = new Map();
  arrayValue(items).forEach((item) => {
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
  const language = schema?.business?.selectedLanguage || schema?.business?.selected_language || schema?.selectedLanguage || schema?.selected_language || "en";
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

function renderPremiumEditorialCatalog(items, schema) {
  const labels = catalogLocaleLabels(schema);
  return `<div class="catalog-premium-editorial">
    ${items.map((item, index) => `<article class="${index === 0 ? "featured" : ""}">
      <div class="premium-card-visual">${renderCatalogImage(item)}</div>
      <div>
        <small>${escapeHtml(index === 0 ? labels.flagship : labels.curated)}</small>
        <h3 ${inlineCatalogEditAttrs(schema, item, "name", "product_name")}>${escapeHtml(item.name)}</h3>
        <p ${inlineCatalogEditAttrs(schema, item, "description", "product_description")}>${escapeHtml(item.description)}</p>
        <strong>${escapeHtml(productPriceLabel(item, schema))}</strong>
        <a class="rendered-button secondary" href="#">${escapeHtml(item.button_label || labels.view)}</a>
      </div>
    </article>`).join("")}
  </div>`;
}

function renderClassifiedMarketplaceCatalog(items) {
  const labels = catalogLocaleLabels(arguments[1]);
  return `<div class="catalog-shell catalog-classified">
    ${items.map((item, index) => `<article class="listing-card">
      <div>${renderCatalogImage(item)}</div>
      <section><strong>${escapeHtml(item.name)}</strong><p>${escapeHtml(item.description)}</p><small>${labels.sellerVerified} · ${index % 2 ? labels.used : labels.newItem} · ${labels.localPickup}</small></section>
      <aside><b>${escapeHtml(item.price_label || labels.makeOffer)}</b><a class="rendered-button" href="#">${escapeHtml(item.button_label || labels.contactSeller)}</a></aside>
    </article>`).join("")}
  </div>`;
}

function renderMinimalProductGrid(items) {
  return `<div class="catalog-minimal">${items.map((item) => renderCatalogCard(item, "minimal-card", item.price_label, arguments[1])).join("")}</div>`;
}

function renderFashionLookbookCatalog(items) {
  const schema = arguments[1];
  const labels = catalogLocaleLabels(schema);
  return `<div class="catalog-lookbook">${items.map((item, index) => `<article class="lookbook-card ${index === 0 ? "wide" : ""}">
    ${renderCatalogImage(item)}
    <span ${inlineCatalogEditAttrs(schema, item, "category", "category")}>${escapeHtml(item.category || labels.newDrop)}</span><h3 ${inlineCatalogEditAttrs(schema, item, "name", "product_name")}>${escapeHtml(item.name)}</h3><p ${inlineCatalogEditAttrs(schema, item, "description", "product_description")}>${escapeHtml(item.description)}</p><b>${escapeHtml(item.price_label)}</b>
  </article>`).join("")}</div>`;
}

function renderCorporateServicesCatalog(items, schema) {
  const labels = catalogLocaleLabels(schema);
  return `<div class="catalog-corporate-services">${items.map((item, index) => `<article>
    <small>${escapeHtml(item.category || `${labels.capability} 0${index + 1}`)}</small>
    <h3>${escapeHtml(item.name)}</h3>
    <p>${escapeHtml(item.description)}</p>
    <a class="rendered-button secondary" href="#">${escapeHtml(item.button_label || labels.requestConsultation)}</a>
  </article>`).join("")}</div>`;
}

function renderHomeServicesCatalog(items, schema) {
  const labels = catalogLocaleLabels(schema);
  return `<div class="catalog-home-services">${items.map((item, index) => `<article>
    <small>${escapeHtml(item.category || `${labels.service} 0${index + 1}`)}</small>
    <h3>${escapeHtml(item.name)}</h3>
    <p>${escapeHtml(item.description)}</p>
    <div><span>${escapeHtml(labels.serviceAreaReady)}</span><span>${escapeHtml(labels.quoteOnly)}</span></div>
    <a class="rendered-button" href="#">${escapeHtml(item.button_label || labels.freeQuote)}</a>
  </article>`).join("")}</div>`;
}

function renderLeadFunnelOfferCatalog(items, schema) {
  const labels = catalogLocaleLabels(schema);
  return `<div class="catalog-lead-offers">${items.slice(0, 3).map((item, index) => `<article class="${index === 1 ? "featured" : ""}">
    <small>${escapeHtml(index === 1 ? labels.bestValue : labels.offer)}</small>
    <h3>${escapeHtml(item.name)}</h3>
    <p>${escapeHtml(item.description)}</p>
    <ul>
      <li>${escapeHtml(labels.outcomeFocused)}</li>
      <li>${escapeHtml(labels.fastNextStep)}</li>
      <li>${escapeHtml(labels.editableOffer)}</li>
    </ul>
    <a class="rendered-button ${index === 1 ? "" : "secondary"}" href="#">${escapeHtml(item.button_label || labels.claimOffer)}</a>
  </article>`).join("")}</div>`;
}

function renderLuxuryGalleryCatalog(items) {
  const labels = catalogLocaleLabels(arguments[1]);
  return `<div class="catalog-luxury">${items.map((item) => `<article>
    <div>${renderCatalogImage(item)}</div>
    <small>${labels.limitedSelection}</small><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p><b>${escapeHtml(item.price_label)}</b>
  </article>`).join("")}</div>`;
}

function renderLuxuryHighTicketCatalog(items, schema) {
  const labels = catalogLocaleLabels(schema);
  return `<div class="catalog-luxury-high-ticket">${items.map((item, index) => `<article class="${index === 0 ? "featured" : ""}">
    <div class="luxury-card-top">${renderCatalogImage(item)}</div>
    <div class="luxury-card-bottom">
      <small>${escapeHtml(item.deal_label || (index % 2 ? labels.authenticated : labels.limitedPiece))}</small>
      <h3 ${inlineCatalogEditAttrs(schema, item, "name", "product_name")}>${escapeHtml(item.name)}</h3>
      <p ${inlineCatalogEditAttrs(schema, item, "description", "product_description")}>${escapeHtml(item.description)}</p>
      <div><span ${inlineCatalogEditAttrs(schema, item, "category", "item_title")}>${escapeHtml(item.category || labels.collection)}</span><strong>${escapeHtml(productPriceLabel(item, schema) || labels.priceOnRequest)}</strong></div>
      <a class="rendered-button secondary" href="#" ${inlineCatalogEditAttrs(schema, item, "button_label", "primary_button")}>${escapeHtml(item.button_label || labels.requestPrivateViewing)}</a>
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
      <small ${inlineCatalogEditAttrs(schema, item, "category", "item_title")}>${escapeHtml(item.category || labels.courseAcademy)}</small>
      <h3 ${inlineCatalogEditAttrs(schema, item, "name", "product_name")}>${escapeHtml(item.name)}</h3>
      <p ${inlineCatalogEditAttrs(schema, item, "description", "product_description")}>${escapeHtml(item.description)}</p>
      <ul>
        <li>${escapeHtml(labels.structuredModules)}</li>
        <li>${escapeHtml(labels.practicalOutcome)}</li>
        <li>${escapeHtml(labels.flexibleAccess)}</li>
      </ul>
      <div><strong>${escapeHtml(productPriceLabel(item, schema) || labels.coursePrice)}</strong><a class="rendered-button" href="#" ${inlineCatalogEditAttrs(schema, item, "button_label", "primary_button")}>${escapeHtml(item.button_label || labels.enrollNow)}</a></div>
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
      <small ${inlineCatalogEditAttrs(schema, item, "category", "category")}>${escapeHtml(item.category || labels.treatments)}</small>
      <h3 ${inlineCatalogEditAttrs(schema, item, "name", "product_name")}>${escapeHtml(item.name)}</h3>
      <p ${inlineCatalogEditAttrs(schema, item, "description", "product_description")}>${escapeHtml(item.description)}</p>
      <ul>
        <li>${escapeHtml(labels.specialistLed)}</li>
        <li>${escapeHtml(labels.personalizedPlan)}</li>
        <li>${escapeHtml(labels.clinicCare)}</li>
      </ul>
      <div><strong>${escapeHtml(productPriceLabel(item, schema) || labels.consultationBased)}</strong><a class="rendered-button" href="#" ${inlineCatalogEditAttrs(schema, item, "button_label", "primary_button")}>${escapeHtml(item.button_label || labels.bookConsultation)}</a></div>
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
      <small ${inlineCatalogEditAttrs(schema, item, "category", "category")}>${escapeHtml(item.category || labels.professionalFirm)}</small>
      <h3 ${inlineCatalogEditAttrs(schema, item, "name", "product_name")}>${escapeHtml(item.name)}</h3>
      <p ${inlineCatalogEditAttrs(schema, item, "description", "product_description")}>${escapeHtml(item.description)}</p>
      <ul>
        <li>${escapeHtml(labels.caseReview)}</li>
        <li>${escapeHtml(labels.confidential)}</li>
        <li>${escapeHtml(labels.businessReady)}</li>
      </ul>
      <div><strong>${escapeHtml(productPriceLabel(item, schema) || labels.consultationBased)}</strong><a class="rendered-button" href="#" ${inlineCatalogEditAttrs(schema, item, "button_label", "primary_button")}>${escapeHtml(item.button_label || labels.scheduleConsultation)}</a></div>
    </div>
  </article>`).join("")}</div>`;
}

function renderB2BSolutionCatalog(items, schema) {
  const labels = catalogLocaleLabels(schema);
  return `<div class="catalog-b2b-solutions">${items.map((item, index) => `<article class="${index === 0 ? "featured" : ""}">
    <div class="b2b-card-top"><small>${escapeHtml(item.deal_label || (index % 2 ? labels.integrationReady : labels.enterpriseReady))}</small><span>${escapeHtml(item.shipping_label || labels.enterpriseTimelines?.[index % (labels.enterpriseTimelines?.length || 1)] || "")}</span></div>
    <div class="b2b-card-body"><small>${escapeHtml(item.category || labels.solutions)}</small><h3 ${inlineCatalogEditAttrs(schema, item, "name", "product_name")}>${escapeHtml(item.name)}</h3><p ${inlineCatalogEditAttrs(schema, item, "description", "product_description")}>${escapeHtml(item.description)}</p><ul><li>${escapeHtml(labels.roiFocused)}</li><li>${escapeHtml(labels.integrationReady)}</li><li>${escapeHtml(labels.enterpriseReady)}</li></ul><div><strong>${escapeHtml(productPriceLabel(item, schema) || labels.customPlan)}</strong><a class="rendered-button" href="#">${escapeHtml(item.button_label || labels.requestDemo)}</a></div></div>
  </article>`).join("")}</div>`;
}

function renderIndustrialSupplierCatalog(items, schema) {
  const labels = catalogLocaleLabels(schema);
  return `<div class="catalog-industrial-supplier">
    <div class="industrial-table-head"><span>SKU</span><span>${escapeHtml(labels.products || "Products")}</span><span>MOQ</span><span>${escapeHtml(labels.delivery)}</span><span>Material</span><span></span></div>
    ${items.map((item, index) => {
    const specs = item.specs || {};
    return `<article class="${index === 0 ? "featured" : ""}">
      <b>${escapeHtml(specs.sku || item.sku || `IND-${String(index + 1).padStart(3, "0")}`)}</b>
      <div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.category || labels.industrialSupplier)} · ${escapeHtml(item.deal_label || labels.certified)}</small><p>${escapeHtml(item.description)}</p></div>
      <span>${escapeHtml(specs.moq || (index % 2 ? "100+" : "25+"))}</span>
      <span>${escapeHtml(specs.lead_time || item.shipping_label || labels.industrialLeadTimes?.[index % (labels.industrialLeadTimes?.length || 1)] || "")}</span>
      <span>${escapeHtml(specs.material || labels.industrialMaterials?.[index % (labels.industrialMaterials?.length || 1)] || labels.specReady)}</span>
      <a class="rendered-button" href="#">${escapeHtml(item.button_label || labels.requestQuote)}</a>
    </article>`;
  }).join("")}</div>`;
}

function renderDigitalOfferCatalog(items, schema) {
  const labels = catalogLocaleLabels(schema);
  return `<div class="catalog-digital-pro catalog-count-${Math.min(items.length, 9)}">${items.map((item) => `<article ${catalogSearchAttributes(item)}>
    <div class="digital-card-top">
      <small>${escapeHtml(item.category || labels.digitalProducts)}</small>
      <span>${escapeHtml(labels.instantAccess)}</span>
    </div>
    ${renderCatalogImage(item)}
    <h3>${escapeHtml(item.name)}</h3>
    <p>${escapeHtml(item.description)}</p>
    <ul><li>${escapeHtml(labels.downloadable)}</li><li>${escapeHtml(labels.bonus)}</li><li>${escapeHtml(labels.lifetime)}</li></ul>
    <div class="digital-card-bottom">
      <strong>${escapeHtml(productPriceLabel(item, schema))}</strong>
      <a class="rendered-button" href="#" data-page-link="contact">${escapeHtml(item.button_label || labels.getAccess)}</a>
    </div>
  </article>`).join("")}</div>`;
}

function renderRestaurantMenuCatalog(items, schema) {
  const labels = catalogLocaleLabels(schema);
  return `<div class="catalog-restaurant-menu">${items.map((item, index) => `<article class="${index === 0 ? "featured" : ""}">
    <div class="restaurant-menu-card-top">
      <small ${inlineCatalogEditAttrs(schema, item, "category", "item_title")}>${escapeHtml(item.category || (index % 2 ? labels.chefPick : labels.popularDish))}</small>
      <span>${escapeHtml(index === 0 ? labels.signatureMenu : labels.menu)}</span>
    </div>
    ${renderCatalogImage(item)}
    <h3 ${inlineCatalogEditAttrs(schema, item, "name", "product_name")}>${escapeHtml(item.name)}</h3>
    <p ${inlineCatalogEditAttrs(schema, item, "description", "product_description")}>${escapeHtml(item.description)}</p>
    <div class="restaurant-menu-card-bottom">
      <strong>${escapeHtml(productPriceLabel(item, schema) || labels.menuPrice)}</strong>
      <a class="rendered-button" href="#" ${inlineCatalogEditAttrs(schema, item, "button_label", "primary_button")}>${escapeHtml(item.button_label || labels.orderNow)}</a>
    </div>
  </article>`).join("")}</div>`;
}

function renderBookingMenuCatalog(items) {
  const labels = catalogLocaleLabels(arguments[1]);
  return `<div class="catalog-booking-pro">${items.map((item, index) => `<article class="${index === 1 ? "featured" : ""}">
    <small>${30 + index * 15} min</small>
    <h3>${escapeHtml(item.name)}</h3>
    <p>${escapeHtml(item.description)}</p>
    <div><span>${escapeHtml(labels.staffPick)}</span><span>${escapeHtml(labels.confirmation)}</span></div>
    <b>${escapeHtml(item.price_label || labels.fromQuote)}</b><a class="rendered-button" href="#">${escapeHtml(item.button_label || labels.bookNow)}</a>
  </article>`).join("")}</div>`;
}

function renderLocalServiceCatalog(items) {
  const labels = catalogLocaleLabels(arguments[1]);
  return `<div class="catalog-services">${items.map((item) => renderCatalogCard(item, "service-card-pro", labels.freeQuote, arguments[1])).join("")}</div>`;
}

function renderProfessionalServicesCatalog(items) {
  const labels = catalogLocaleLabels(arguments[1]);
  return `<div class="catalog-practice">${items.map((item) => `<article><span>${labels.practiceArea}</span><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p><a class="rendered-button secondary" href="#">${labels.scheduleConsultation}</a></article>`).join("")}</div>`;
}

function renderBeforeAfterProjectCatalog(items) {
  const labels = catalogLocaleLabels(arguments[1]);
  return `<div class="catalog-projects">${items.map((item) => `<article><div><span>${labels.before}</span><span>${labels.after}</span></div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p><a class="rendered-button" href="#">${labels.viewProject}</a></article>`).join("")}</div>`;
}

function renderPricingPlanCatalog(items) {
  const labels = catalogLocaleLabels(arguments[1]);
  return `<div class="catalog-pricing">${items.map((item, index) => `<article class="${index === 1 ? "featured" : ""}"><small>${labels.plan}</small><h3>${escapeHtml(item.name)}</h3><b>${escapeHtml(item.price_label || labels.custom)}</b><p>${escapeHtml(item.description)}</p><a class="rendered-button" href="#">${labels.start}</a></article>`).join("")}</div>`;
}

function renderEventTicketCatalog(items) {
  const labels = catalogLocaleLabels(arguments[1]);
  return `<div class="catalog-tickets">${items.map((item) => `<article><span>${labels.ticketOffer}</span><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p><b>${escapeHtml(item.price_label)}</b><a class="rendered-button" href="#">${labels.reserve}</a></article>`).join("")}</div>`;
}

function renderPersonalBrandServicesCatalog(items) {
  const labels = catalogLocaleLabels(arguments[1]);
  return `<div class="catalog-packages">${items.map((item) => `<article><small>${labels.package}</small><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p><a class="rendered-button secondary" href="#">${labels.applyNow}</a></article>`).join("")}</div>`;
}

function renderCatalogCard(item, className, badge, schema) {
  const labels = catalogLocaleLabels(schema);
  const commerce = commerceLabels(schema);
  const isMarket = String(className || "").includes("market-card");
  return `<article class="${className}" ${catalogSearchAttributes(item)}>
    ${renderCatalogImage(item)}
    ${badge ? `<small>${escapeHtml(badge)}</small>` : ""}
    ${item.category ? `<small>${escapeHtml(item.category)}</small>` : ""}
    <h3>${escapeHtml(item.name)}</h3>
    <p>${escapeHtml(item.description)}</p>
    ${isMarket ? `<div class="market-meta"><span>${"★".repeat(Math.max(1, Math.min(5, Math.round(Number(item.rating) || 4))))} ${escapeHtml(item.rating || "4.6")}</span><span>${escapeHtml(item.shipping_label || labels.fastShip)}</span></div>` : ""}
    <b>${escapeHtml(productPriceLabel(item, schema))}</b>
    ${productStockBadge(item)}
    <button class="rendered-button" type="button">${escapeHtml(isMarket ? commerce.addToCart : (item.button_label || labels.view))}</button>
  </article>`;
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

function productPriceLabel(item = {}, schema = {}) {
  if (item.price_label && !/precio editable|price editable/i.test(item.price_label)) return item.price_label;
  const amount = item.price_amount ?? item.price_value;
  if (amount !== "" && amount !== null && amount !== undefined && !Number.isNaN(Number(amount))) {
    return `${item.currency || "USD"} ${Number(amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }
  return item.price_type === "quote_only" ? catalogLocaleLabels(schema).request : "Precio editable";
}

function productStockBadge(item = {}) {
  if (!item.track_inventory) return "";
  const quantity = Number(item.inventory_quantity);
  if (Number.isNaN(quantity) || item.inventory_quantity === "") return `<span class="stock-badge stock-unknown">Stock editable</span>`;
  if (quantity <= 0) return `<span class="stock-badge stock-out">Out of stock</span>`;
  if (quantity <= 3) return `<span class="stock-badge stock-low">Only ${quantity} left</span>`;
  return `<span class="stock-badge stock-in">In stock</span>`;
}

export function stableCatalogImageUrl(seed = "") {
  const text = String(seed || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const bathBodyImage = bathBodyStockImageUrl(text);
  if (bathBodyImage) return bathBodyImage;
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
    [/spa-bath-towel|bath-towel|toalla|towel|bath-salts|sales-de-bano|bath-sponge|esponja|body-oil|aceite-corporal/, "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=900&q=82"],
    [/beauty|skincare|cosmetic|belleza|makeup|spa/, "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=82"],
    [/home|decor|furniture|mueble|hogar/, "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=82"],
  ];
  return (fallbacks.find(([pattern]) => pattern.test(text)) || [null, "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=900&q=82"])[1];
}

function resolveCatalogImageUrl(url, fallbackText = "") {
  const raw = String(url || "").trim();
  if (!raw) return stableCatalogImageUrl(fallbackText);
  if (/images\.unsplash\.com\/featured\/600x600|source\.unsplash\.com|photo-1523275335684-37898b6baf30/i.test(raw)) {
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

export function catalogLocaleLabels(schema = {}) {
  const language = schema?.business?.selectedLanguage || schema?.business?.selected_language || schema?.selectedLanguage || schema?.selected_language || "en";
  const labels = {
    en: {
      searchFilters: "Search & filters", category: "Category", brand: "Brand", price: "Price", rating: "Rating", delivery: "Delivery", deal: "Deal", fastShip: "Fast ship",
      search: "Search", searchPlaceholder: "Search products, brands, or categories", searchButton: "Search", shopNow: "Shop now", categories: "Categories", dealTitle: "Top picks", dealText: "Featured products, deals, and fast shipping options.", results: "Results", sortBy: "Sort by", featured: "Featured", secureCheckout: "Secure checkout", support: "Support", easyReturns: "Easy returns", trustTitle: "Marketplace trust", signature: "Signature", detail: "Detail", curated: "Curated", flagship: "Flagship", premiumSpecs: ["Presentation", "Quality", "Support", "Delivery"],
      sellerVerified: "Seller verified", used: "Used", newItem: "New", localPickup: "Local pickup", makeOffer: "Make offer", contactSeller: "Contact seller",
      listings: "Listings", areas: "Areas", searchListings: "Search listings", viewListings: "View listings", inquireNow: "Inquire now", featuredListing: "Featured listing", newListing: "New listing", availableNow: "Available now", listingPrice: "Price on request", listingSearchPlaceholder: "Search by location, type, price or keyword", listingFiltersTitle: "Search with the right filters", listingFiltersText: "Help customers narrow options by category, location, price and availability.", featuredListingsTitle: "Featured listings", featuredListingsText: "Active listings with price, location, specs and inquiry CTAs.", listingAreaTitle: "Explore the best areas", listingAreaText: "Area cards and location notes make discovery feel local.", listingTrustTitle: "Confidence before the inquiry", listingTrustText: "Verified details, contact paths and updated availability.", listingContactTitle: "Ask about a listing", listingContactText: "Send listing, budget, location and preferred contact method.", listingCategories: ["Homes", "Rentals", "Commercial", "Land", "Cars", "Featured"], listingLocations: ["Downtown", "North area", "West district", "Near schools", "Waterfront", "Business zone"], listingTrustItems: ["Verified details", "Updated availability", "Clear pricing", "Local support", "Fast response", "Easy comparison"],
      newDrop: "New drop", limitedSelection: "Limited selection", collection: "Collection", provenance: "Provenance", privateInquiry: "Private inquiry", requestPrivateViewing: "Request private viewing", viewCollection: "View collection", priceOnRequest: "Price on request", limitedPiece: "Limited piece", authenticated: "Authenticated", privateService: "Private service", signaturePiece: "Signature piece", luxuryProvenanceTitle: "Provenance, authenticity and service", luxuryProvenanceText: "Confidence signals for high-ticket buyers before they inquire.", luxuryPrivateTitle: "Private appointment", luxuryPrivateText: "Request availability, preferred piece and contact method.", luxuryContactTitle: "Request a private consultation", luxuryContactText: "Send the piece, occasion, preferred timing and contact method.", luxuryProofItems: ["Verified provenance", "Limited availability", "Private advisor", "Insured handling", "Secure inquiry", "Concierge follow-up"], courseAcademy: "Course academy", programs: "Programs", curriculum: "Curriculum", enroll: "Enroll", enrollNow: "Enroll now", viewCurriculum: "View curriculum", coursePrice: "Enrollment price", featuredProgram: "Featured program", beginnerFriendly: "Beginner friendly", certificateReady: "Certificate-ready", outcomes: "Outcomes", instructor: "Instructor", outcomesTitle: "What students should be able to do", outcomesText: "Clear results, skills and confidence markers.", instructorTitle: "Expert guidance", instructorText: "Instructor credibility, method and support.", learningPathItems: ["Foundation", "Practice", "Apply", "Feedback", "Complete", "Next step"], learningOutcomeItems: ["Clear skill progression", "Practical assignments", "Editable curriculum", "Student-ready proof", "Support notes", "Launch-ready offer"], instructorTrustItems: ["Expert-led lessons", "Structured modules", "Support path", "Student outcomes"], educationDurations: ["4 weeks", "6 modules", "Live cohort", "Self-paced"], clinicCare: "Personalized care", treatments: "Treatments", bookConsultation: "Book consultation", viewTreatments: "View treatments", consultationBased: "Consultation-based", popularTreatment: "Popular treatment", specialistLed: "Specialist-led", personalizedPlan: "Personalized plan", treatmentsTitle: "Treatments and services", carePathTitle: "Clear care path", carePathText: "Consultation, plan, treatment and follow-up in one easy path.", carePathItems: ["Consultation", "Personal plan", "Treatment", "Progress check", "Aftercare", "Next visit"], clinicTrustTitle: "Trust and safety first", clinicTrustText: "Credentials, expectations and response details before booking.", clinicTrustItems: ["Specialist guidance", "Safety-first process", "Clear expectations", "Private consultation", "Aftercare notes", "Fast response"], resultsTitle: "Results with realistic expectations", resultsText: "Proof, transformation notes and follow-up details.", resultItems: ["Visible progress", "Before/after proof", "Personal plan", "Follow-up support"], clinicTeamTitle: "Specialists who guide the process", clinicTeamText: "Clinical standards, provider credibility and care philosophy.", clinicTeamItems: ["Credentialed team", "Consultation-first", "Patient education", "Care follow-up"], clinicBookingTitle: "Book a consultation or ask a question", clinicBookingText: "Send the preferred treatment, concern, schedule and contact method.", clinicDurations: ["30 min consult", "45 min session", "Personal plan", "Follow-up ready"], structuredModules: "Structured modules", practicalOutcome: "Practical outcome", flexibleAccess: "Flexible access", instantAccess: "Instant access", downloadable: "Downloadable content", bonus: "Bonus resources", lifetime: "Lifetime access", getAccess: "Get access",
      digitalProducts: "Digital products", viewProducts: "View products", modules: "Modules", digitalAccessShort: "Downloads, modules and support notes.", digitalBundleTitle: "Digital offers built to sell", digitalModulesTitle: "What customers get inside", digitalProofTitle: "Trust before checkout", digitalAccessTitle: "Get access and start immediately", digitalAccessText: "Customers know exactly what they receive, how access works and where to get support.", digitalModuleItems: ["Core training", "Downloadable resources", "Templates and tools", "Bonus material", "Access instructions", "Support notes"], digitalProofItems: ["Instant access", "Editable modules", "Clear license", "Support-ready", "Bundle value", "Simple checkout"],
      collections: "Collections", lookbook: "Lookbook", fit: "Fit guide", drop: "Drop", fitGuide: "Fit guide", fitGuideItems: ["Size and fit notes", "Styling suggestions", "Care details", "Shipping and returns"], fashionCollections: ["New arrivals", "Essentials", "Statement pieces", "Accessories", "Limited drop", "Best sellers"], jewelryCategories: ["Necklaces", "Bracelets", "Earrings", "Rings", "Gift sets", "Custom pieces"],
      company: "Company", services: "Services", process: "Process", proof: "Proof", capability: "Capability", requestConsultation: "Request consultation", viewServices: "View services", corporateProcessItems: ["Discovery", "Strategy", "Delivery", "Support"], corporateProofItems: ["Reliable delivery", "Clear communication", "Professional standards"],
      localExperts: "Local experts", callNow: "Call now", fastResponse: "Fast local response", serviceAreas: "Service areas", workProof: "Work proof", workSlug: "work", service: "Service", quoteOnly: "Quote only", serviceAreaReady: "Area-ready", quoteExpectation: "Tell us what you need and get a clear next step.", homeServiceHeadline: (name) => `${name} handles the job right the first time`, homeServiceSubheadline: (description) => description || "Trusted local service with clear communication, reliable scheduling, and quote-first service.", homeServiceCategoriesTitle: "Services built for real local needs", homeServiceCategoriesText: "Organize every service into clear quote-ready options that customers can understand quickly.", homeServiceAreasTitle: "Serving the areas that matter", homeServiceAreasText: "Show cities, neighborhoods, response expectations and emergency availability in one clean section.", serviceAreaItems: ["Nearby neighborhoods", "Same-day options", "Emergency calls", "Recurring service", "Licensed work", "Clear estimates"], beforeAfterTitle: "Real work, visible results", beforeAfterText: "Use job photos, before-and-after proof and finished projects to build trust before the first call.", homeServiceTrustTitle: "Why customers call first", homeServiceTrustText: "Trust signals, reviews and response expectations make the next step feel safe.", homeServiceTrustItems: ["Licensed and insured", "Clear estimates", "On-time arrivals", "Before/after proof", "Local references", "Clean follow-up"], homeServiceQuoteTitle: "Request a clear quote", homeServiceQuoteText: "Share the job details, preferred time and location. The business can respond by phone, WhatsApp or email.",
      appointments: "Appointments", availability: "Availability", team: "Team", teamSlug: "team", bookNow: "Book now", nextAvailable: "Next available", slot: "Slot", confirmation: "Confirmation-ready", staffPick: "Staff pick", bookingContactFallback: "Confirm the preferred service, time and contact method.", bookingHeadline: (name) => `Book ${name} without the back-and-forth`, bookingSubheadline: (description) => description || "A clear appointment page with services, availability, staff notes and a simple booking path.", bookingServicesTitle: "Choose the right appointment", bookingServicesText: "Show duration, service details and what the client should expect before booking.", availabilityTitle: "Availability that feels simple", availabilityText: "Make open windows, preparation notes and confirmation expectations clear.", availabilityItems: ["Today / tomorrow windows", "Morning appointments", "Afternoon appointments", "Weekend options", "Consultation calls", "Follow-up visits"], bookingTeamTitle: "A smoother visit from start to finish", bookingTeamText: "Explain the staff, process and preparation so clients know what happens next.", bookingTeamItems: ["Pick a service", "Choose a preferred time", "Receive confirmation", "Arrive prepared"], bookingProofItems: ["Clear durations", "Easy confirmation", "Service details upfront"], bookingContactTitle: "Reserve the next available time", bookingContactText: "Send the preferred service, day and contact method. The business can confirm by phone, WhatsApp or email.",
      menu: "Menu", specials: "Specials", hoursLocation: "Hours & location", orderNow: "Order now", viewMenu: "View menu", contact: "Contact", signatureMenu: "Signature menu", popularDish: "Popular dish", chefPick: "Chef pick", pickupDelivery: "Pickup / delivery", quickOrderNote: "Confirm by phone, WhatsApp or email.", editableMenuNote: "Editable from the catalog manager.", restaurantProofItems: ["Editable menu", "Featured combos", "Fast contact"], restaurantCategories: ["Starters", "Mains", "Drinks", "Desserts", "Specials", "Chef picks"], restaurantCategoriesTitle: "Explore the menu by category", restaurantSignatureTitle: "Signature dishes ready to order", restaurantSpecialsTitle: "Specials and combos", restaurantInfoTitle: "Hours, location and service options", restaurantOrderTitle: "Place an order or ask a question", restaurantOrderText: "Send the preferred dishes, pickup or delivery option, and contact method.",
      offer: "Offer", benefits: "Benefits", faq: "FAQ", claimOffer: "Start now", seeProof: "See proof", nextStep: "Next step", quickRequest: "Send a quick request and get a clear response.", bestValue: "Best value", outcomeFocused: "Outcome-focused", fastNextStep: "Fast next step", editableOffer: "Editable offer", faqAnswer: "This can be adjusted to match the business, offer, and customer objections.", funnelBenefitsItems: ["Clear promise", "Simple next step", "Qualified leads", "Editable sections", "Proof-first structure", "Fast launch"], funnelProofItems: ["Specific outcome", "Simple process", "Fast response", "Clear pricing conversation"], funnelFaqItems: [{ question: "What happens next?", answer: "The business follows up with the next step." }, { question: "Can it be customized?", answer: "Yes, the offer and page content are editable." }, { question: "Is this a store?", answer: "No, it is focused on leads." }],
      main: "Main", popular: "Popular", marketPrice: "Market price", fromQuote: "From quote", book: "Book", freeQuote: "Free quote", practiceArea: "Practice area", scheduleConsultation: "Schedule consultation",
      before: "Before", after: "After", viewProject: "View project", plan: "Plan", custom: "Custom", start: "Start", ticketOffer: "Ticket / offer", reserve: "Reserve", package: "Package", applyNow: "Apply now", view: "View", request: "Ask now",
    },
    es: {
      searchFilters: "Busqueda y filtros", category: "Categoria", brand: "Marca", price: "Precio", rating: "Calificacion", delivery: "Entrega", deal: "Oferta", fastShip: "Envio rapido",
      search: "Buscar", searchPlaceholder: "Buscar productos, marcas o categorias", searchButton: "Buscar", shopNow: "Comprar ahora", categories: "Categorias", dealTitle: "Productos destacados", dealText: "Productos destacados, ofertas y opciones de envio rapido.", results: "Resultados", sortBy: "Ordenar por", featured: "Destacados", secureCheckout: "Checkout seguro", support: "Soporte", easyReturns: "Devoluciones simples", trustTitle: "Confianza marketplace", signature: "Principal", detail: "Detalle", curated: "Curado", flagship: "Producto estrella", premiumSpecs: ["Presentacion", "Calidad", "Soporte", "Entrega"],
      sellerVerified: "Vendedor verificado", used: "Usado", newItem: "Nuevo", localPickup: "Retiro local", makeOffer: "Hacer oferta", contactSeller: "Contactar vendedor",
      listings: "Listings", areas: "Zonas", searchListings: "Buscar listings", viewListings: "Ver listings", inquireNow: "Consultar ahora", featuredListing: "Listing destacado", newListing: "Nuevo listing", availableNow: "Disponible", listingPrice: "Precio a consultar", listingSearchPlaceholder: "Buscar por ubicacion, tipo, precio o palabra clave", listingFiltersTitle: "Busca con filtros claros", listingFiltersText: "Ayuda al cliente a comparar por categoria, zona, precio y disponibilidad.", featuredListingsTitle: "Listings destacados", featuredListingsText: "Listings activos con precio, ubicacion, detalles y CTA de consulta.", listingAreaTitle: "Explora las mejores zonas", listingAreaText: "Tarjetas de zona y notas de ubicacion hacen la busqueda mas clara.", listingTrustTitle: "Confianza antes de consultar", listingTrustText: "Detalles verificados, contacto claro y disponibilidad actualizada.", listingContactTitle: "Pregunta por un listing", listingContactText: "Envia el listing, presupuesto, ubicacion y metodo de contacto.", listingCategories: ["Casas", "Alquileres", "Comercial", "Terrenos", "Autos", "Destacados"], listingLocations: ["Centro", "Zona norte", "Distrito oeste", "Cerca de escuelas", "Frente al agua", "Zona comercial"], listingTrustItems: ["Detalles verificados", "Disponibilidad actualizada", "Precios claros", "Soporte local", "Respuesta rapida", "Comparacion simple"],
      newDrop: "Nuevo drop", limitedSelection: "Seleccion limitada", collection: "Coleccion", provenance: "Provenance", privateInquiry: "Consulta privada", requestPrivateViewing: "Solicitar cita privada", viewCollection: "Ver coleccion", priceOnRequest: "Precio bajo consulta", limitedPiece: "Pieza limitada", authenticated: "Autenticada", privateService: "Servicio privado", signaturePiece: "Pieza protagonista", luxuryProvenanceTitle: "Provenance, autenticidad y servicio", luxuryProvenanceText: "Senales de confianza para compradores de alto valor antes de consultar.", luxuryPrivateTitle: "Cita privada", luxuryPrivateText: "Solicita disponibilidad, pieza preferida y metodo de contacto.", luxuryContactTitle: "Solicita una consulta privada", luxuryContactText: "Envia la pieza, ocasion, horario preferido y metodo de contacto.", luxuryProofItems: ["Provenance verificada", "Disponibilidad limitada", "Asesor privado", "Manejo asegurado", "Consulta segura", "Seguimiento concierge"], courseAcademy: "Academia de cursos", programs: "Programas", curriculum: "Curriculum", enroll: "Inscripcion", enrollNow: "Inscribirme", viewCurriculum: "Ver curriculum", coursePrice: "Precio de inscripcion", featuredProgram: "Programa destacado", beginnerFriendly: "Ideal para empezar", certificateReady: "Con certificado", outcomes: "Resultados", instructor: "Instructor", outcomesTitle: "Lo que el estudiante debe lograr", outcomesText: "Resultados, habilidades y senales claras de avance.", instructorTitle: "Guia experta", instructorText: "Credibilidad del instructor, metodo y soporte.", learningPathItems: ["Base", "Practica", "Aplicacion", "Soporte", "Resultado", "Siguiente paso"], learningOutcomeItems: ["Progreso claro", "Practicas accionables", "Curriculum editable", "Prueba para estudiantes", "Notas de soporte", "Oferta lista"], instructorTrustItems: ["Clases expertas", "Modulos estructurados", "Ruta de soporte", "Resultados"], educationDurations: ["4 semanas", "6 modulos", "Cohorte en vivo", "A tu ritmo"], clinicCare: "Cuidado personalizado", treatments: "Tratamientos", bookConsultation: "Agendar consulta", viewTreatments: "Ver tratamientos", consultationBased: "Segun consulta", popularTreatment: "Tratamiento popular", specialistLed: "Guiado por especialista", personalizedPlan: "Plan personalizado", treatmentsTitle: "Tratamientos y servicios", carePathTitle: "Ruta clara de atencion", carePathText: "Consulta, plan, tratamiento y seguimiento en un camino simple.", carePathItems: ["Consulta", "Plan personal", "Tratamiento", "Revision", "Cuidado posterior", "Proxima visita"], clinicTrustTitle: "Confianza y seguridad primero", clinicTrustText: "Credenciales, expectativas y respuesta antes de reservar.", clinicTrustItems: ["Guia especializada", "Proceso seguro", "Expectativas claras", "Consulta privada", "Cuidado posterior", "Respuesta rapida"], resultsTitle: "Resultados con expectativas reales", resultsText: "Pruebas, notas de transformacion y seguimiento.", resultItems: ["Progreso visible", "Antes/despues", "Plan personal", "Seguimiento"], clinicTeamTitle: "Especialistas que guian el proceso", clinicTeamText: "Estandares clinicos, credibilidad y filosofia de atencion.", clinicTeamItems: ["Equipo certificado", "Consulta primero", "Educacion al paciente", "Seguimiento"], clinicBookingTitle: "Agenda una consulta o pregunta", clinicBookingText: "Envia tratamiento, inquietud, horario y metodo de contacto.", clinicDurations: ["Consulta 30 min", "Sesion 45 min", "Plan personal", "Seguimiento"], structuredModules: "Modulos estructurados", practicalOutcome: "Resultado practico", flexibleAccess: "Acceso flexible", instantAccess: "Acceso inmediato", downloadable: "Contenido descargable", bonus: "Recursos extra", lifetime: "Acceso de por vida", getAccess: "Obtener acceso",
      digitalProducts: "Productos digitales", viewProducts: "Ver productos", modules: "Modulos", digitalAccessShort: "Descargas, modulos y notas de soporte.", digitalBundleTitle: "Ofertas digitales listas para vender", digitalModulesTitle: "Que recibe el cliente", digitalProofTitle: "Confianza antes del checkout", digitalAccessTitle: "Obten acceso y empieza de inmediato", digitalAccessText: "El cliente sabe exactamente que recibe, como entra y donde pide soporte.", digitalModuleItems: ["Entrenamiento principal", "Recursos descargables", "Plantillas y herramientas", "Material bonus", "Instrucciones de acceso", "Notas de soporte"], digitalProofItems: ["Acceso inmediato", "Modulos editables", "Licencia clara", "Soporte listo", "Valor del bundle", "Checkout simple"],
      collections: "Colecciones", lookbook: "Lookbook", fit: "Guia de tallas", drop: "Drop", fitGuide: "Guia de tallas", fitGuideItems: ["Notas de talla y ajuste", "Sugerencias de estilo", "Cuidados de la prenda", "Envios y devoluciones"], fashionCollections: ["Novedades", "Esenciales", "Piezas destacadas", "Accesorios", "Drop limitado", "Mas vendidos"], jewelryCategories: ["Collares", "Pulseras", "Aretes y zarcillos", "Anillos", "Sets de regalo", "Piezas personalizadas"],
      company: "Empresa", services: "Servicios", process: "Proceso", proof: "Prueba", capability: "Capacidad", requestConsultation: "Solicitar consulta", viewServices: "Ver servicios", corporateProcessItems: ["Diagnostico", "Estrategia", "Entrega", "Soporte"], corporateProofItems: ["Entrega confiable", "Comunicacion clara", "Estandares profesionales"],
      localExperts: "Expertos locales", callNow: "Llamar ahora", fastResponse: "Respuesta local rapida", serviceAreas: "Areas de servicio", workProof: "Trabajos", workSlug: "trabajos", service: "Servicio", quoteOnly: "Cotizacion", serviceAreaReady: "Disponible por zona", quoteExpectation: "Cuenta que necesitas y recibe el siguiente paso claro.", homeServiceHeadline: (name) => `${name} resuelve el trabajo bien desde el primer intento`, homeServiceSubheadline: (description) => description || "Servicio local confiable con comunicacion clara, agenda ordenada y cotizacion primero.", homeServiceCategoriesTitle: "Servicios para necesidades locales reales", homeServiceCategoriesText: "Organiza cada servicio en opciones claras para cotizar sin confundir al cliente.", homeServiceAreasTitle: "Atendemos las zonas importantes", homeServiceAreasText: "Muestra ciudades, vecindarios, tiempos de respuesta y disponibilidad de emergencia en una seccion clara.", serviceAreaItems: ["Zonas cercanas", "Opciones el mismo dia", "Emergencias", "Servicio recurrente", "Trabajo autorizado", "Estimados claros"], beforeAfterTitle: "Trabajo real, resultados visibles", beforeAfterText: "Usa fotos, antes/despues y proyectos terminados para generar confianza antes de la llamada.", homeServiceTrustTitle: "Por que llaman primero", homeServiceTrustText: "Senales de confianza, resenas y expectativas de respuesta hacen que el siguiente paso sea seguro.", homeServiceTrustItems: ["Licencia y seguro", "Estimados claros", "Llegadas puntuales", "Antes/despues", "Referencias locales", "Seguimiento limpio"], homeServiceQuoteTitle: "Solicita una cotizacion clara", homeServiceQuoteText: "Comparte el trabajo, horario preferido y ubicacion. El negocio puede responder por telefono, WhatsApp o email.",
      appointments: "Citas", availability: "Disponibilidad", team: "Equipo", teamSlug: "equipo", bookNow: "Reservar ahora", nextAvailable: "Proxima disponibilidad", slot: "Horario", confirmation: "Listo para confirmar", staffPick: "Recomendado", bookingContactFallback: "Confirma el servicio, horario y metodo de contacto preferido.", bookingHeadline: (name) => `Reserva en ${name} sin vueltas`, bookingSubheadline: (description) => description || "Pagina clara de citas con servicios, disponibilidad, notas del equipo y reserva simple.", bookingServicesTitle: "Elige la cita correcta", bookingServicesText: "Muestra duracion, detalles del servicio y que debe esperar el cliente antes de reservar.", availabilityTitle: "Disponibilidad facil de entender", availabilityText: "Muestra horarios, preparacion y expectativas de confirmacion de forma clara.", availabilityItems: ["Hoy / manana", "Citas en la manana", "Citas en la tarde", "Opciones fin de semana", "Consultas por llamada", "Visitas de seguimiento"], bookingTeamTitle: "Una visita mas simple de inicio a fin", bookingTeamText: "Explica equipo, proceso y preparacion para que el cliente sepa que sigue.", bookingTeamItems: ["Elige un servicio", "Selecciona horario preferido", "Recibe confirmacion", "Llega preparado"], bookingProofItems: ["Duraciones claras", "Confirmacion simple", "Detalles antes de reservar"], bookingContactTitle: "Reserva el proximo horario disponible", bookingContactText: "Envia servicio, dia y metodo de contacto preferido. El negocio puede confirmar por telefono, WhatsApp o email.",
      menu: "Menu", specials: "Especiales", hoursLocation: "Horarios y ubicacion", orderNow: "Ordenar ahora", viewMenu: "Ver menu", contact: "Contacto", signatureMenu: "Menu destacado", popularDish: "Popular", chefPick: "Chef recomienda", pickupDelivery: "Pickup / delivery", quickOrderNote: "Confirma por telefono, WhatsApp o email.", editableMenuNote: "Editable desde el catalog manager.", restaurantProofItems: ["Menu editable", "Combos destacados", "Contacto rapido"], restaurantCategories: ["Entradas", "Platos fuertes", "Bebidas", "Postres", "Especiales", "Favoritos"], restaurantCategoriesTitle: "Explora el menu por categoria", restaurantSignatureTitle: "Platos destacados listos para pedir", restaurantSpecialsTitle: "Especiales y combos", restaurantInfoTitle: "Horarios, ubicacion y opciones de servicio", restaurantOrderTitle: "Haz un pedido o pregunta", restaurantOrderText: "Envia platos preferidos, opcion de pickup o delivery y metodo de contacto.",
      offer: "Oferta", benefits: "Beneficios", faq: "Preguntas", claimOffer: "Empezar ahora", seeProof: "Ver prueba", nextStep: "Siguiente paso", quickRequest: "Envia una solicitud rapida y recibe una respuesta clara.", bestValue: "Mejor opcion", outcomeFocused: "Enfocado en resultado", fastNextStep: "Siguiente paso rapido", editableOffer: "Oferta editable", faqAnswer: "Esto se puede ajustar al negocio, la oferta y las dudas del cliente.", funnelBenefitsItems: ["Promesa clara", "Siguiente paso simple", "Leads calificados", "Secciones editables", "Estructura con prueba", "Lanzamiento rapido"], funnelProofItems: ["Resultado especifico", "Proceso simple", "Respuesta rapida", "Conversacion clara sobre precios"], funnelFaqItems: [{ question: "Que pasa despues?", answer: "El negocio responde con el siguiente paso." }, { question: "Se puede personalizar?", answer: "Si, la oferta y el contenido son editables." }, { question: "Esto es una tienda?", answer: "No, esta enfocado en leads." }],
      main: "Principal", popular: "Popular", marketPrice: "Precio de mercado", fromQuote: "Desde cotizacion", book: "Reservar", freeQuote: "Cotizacion gratis", practiceArea: "Area de practica", scheduleConsultation: "Agendar consulta",
      before: "Antes", after: "Despues", viewProject: "Ver proyecto", plan: "Plan", custom: "Personalizado", start: "Empezar", ticketOffer: "Ticket / oferta", reserve: "Reservar", package: "Paquete", applyNow: "Aplicar ahora", view: "Ver", request: "Consultar",
    },
    fr: {
      searchFilters: "Recherche et filtres", category: "Catégorie", brand: "Marque", price: "Prix", rating: "Note", delivery: "Livraison", deal: "Offre", fastShip: "Livraison rapide",
      search: "Recherche", searchPlaceholder: "Rechercher produits, marques ou categories", searchButton: "Rechercher", shopNow: "Acheter", categories: "Categories", dealTitle: "Selections", dealText: "Produits mis en avant, offres et options de livraison rapide.", results: "Resultats", sortBy: "Trier par", featured: "Mis en avant", secureCheckout: "Paiement securise", support: "Support", easyReturns: "Retours simples", trustTitle: "Confiance marketplace", signature: "Signature", detail: "Detail", curated: "Soigne", flagship: "Produit phare", premiumSpecs: ["Presentation", "Qualite", "Support", "Livraison"],
      sellerVerified: "Vendeur vérifié", used: "Occasion", newItem: "Neuf", localPickup: "Retrait local", makeOffer: "Faire une offre", contactSeller: "Contacter le vendeur",
      listings: "Annonces", areas: "Zones", searchListings: "Rechercher", viewListings: "Voir les annonces", inquireNow: "Demander", featuredListing: "Annonce en avant", newListing: "Nouvelle annonce", availableNow: "Disponible", listingPrice: "Prix sur demande", listingSearchPlaceholder: "Rechercher par lieu, type, prix ou mot-cle", listingFiltersTitle: "Rechercher avec les bons filtres", listingFiltersText: "Aidez les clients a comparer par categorie, zone, prix et disponibilite.", featuredListingsTitle: "Annonces en avant", featuredListingsText: "Annonces actives avec prix, localisation, details et CTA.", listingAreaTitle: "Explorer les meilleures zones", listingAreaText: "Cartes de zones et notes locales pour clarifier la recherche.", listingTrustTitle: "Confiance avant la demande", listingTrustText: "Details verifies, contact clair et disponibilite mise a jour.", listingContactTitle: "Demander une annonce", listingContactText: "Envoyez l'annonce, le budget, la localisation et le contact prefere.", listingCategories: ["Maisons", "Locations", "Commercial", "Terrain", "Voitures", "En avant"], listingLocations: ["Centre", "Zone nord", "Quartier ouest", "Pres des ecoles", "Bord de l'eau", "Zone business"], listingTrustItems: ["Details verifies", "Disponibilite a jour", "Prix clairs", "Support local", "Reponse rapide", "Comparaison simple"],
      newDrop: "Nouvelle collection", limitedSelection: "Sélection limitée", courseAcademy: "Academie de cours", programs: "Programmes", curriculum: "Programme", enroll: "Inscription", enrollNow: "S'inscrire", viewCurriculum: "Voir le programme", coursePrice: "Prix d'inscription", featuredProgram: "Programme phare", beginnerFriendly: "Pour debuter", certificateReady: "Certificat pret", outcomes: "Resultats", instructor: "Instructeur", outcomesTitle: "Ce que l'etudiant doit savoir faire", outcomesText: "Resultats, competences et progression claire.", instructorTitle: "Guidage expert", instructorText: "Credibilite, methode et support.", learningPathItems: ["Bases", "Pratique", "Application", "Support", "Resultat", "Suite"], learningOutcomeItems: ["Progression claire", "Exercices pratiques", "Programme modifiable", "Preuve etudiante", "Notes support", "Offre prete"], instructorTrustItems: ["Cours experts", "Modules structures", "Support", "Resultats"], educationDurations: ["4 semaines", "6 modules", "Cohorte live", "A son rythme"], clinicCare: "Soin personnalise", treatments: "Soins", bookConsultation: "Reserver une consultation", viewTreatments: "Voir les soins", consultationBased: "Selon consultation", popularTreatment: "Soin populaire", specialistLed: "Guide par specialiste", personalizedPlan: "Plan personnalise", treatmentsTitle: "Soins et services", carePathTitle: "Parcours de soin clair", carePathText: "Consultation, plan, soin et suivi dans un parcours simple.", carePathItems: ["Consultation", "Plan personnel", "Soin", "Suivi", "Apres-soin", "Prochaine visite"], clinicTrustTitle: "Confiance et securite", clinicTrustText: "Diplomes, attentes et reponse avant reservation.", clinicTrustItems: ["Guidage specialise", "Processus securise", "Attentes claires", "Consultation privee", "Apres-soin", "Reponse rapide"], resultsTitle: "Resultats realistes", resultsText: "Preuves, notes de transformation et suivi.", resultItems: ["Progres visible", "Avant/apres", "Plan personnel", "Suivi"], clinicTeamTitle: "Specialistes qui guident le processus", clinicTeamText: "Standards cliniques, credibilite et philosophie de soin.", clinicTeamItems: ["Equipe certifiee", "Consultation d'abord", "Education patient", "Suivi"], clinicBookingTitle: "Reserver ou poser une question", clinicBookingText: "Envoyez soin, besoin, horaire et contact.", clinicDurations: ["Consultation 30 min", "Session 45 min", "Plan personnel", "Suivi pret"], structuredModules: "Modules structures", practicalOutcome: "Resultat pratique", flexibleAccess: "Acces flexible", instantAccess: "Accès immédiat", downloadable: "Contenu téléchargeable", bonus: "Ressources bonus", lifetime: "Accès à vie", getAccess: "Obtenir l'accès",
      digitalProducts: "Produits digitaux", viewProducts: "Voir les produits", modules: "Modules", digitalAccessShort: "Telechargements, modules et notes de support.", digitalBundleTitle: "Offres digitales pretes a vendre", digitalModulesTitle: "Ce que le client recoit", digitalProofTitle: "Confiance avant paiement", digitalAccessTitle: "Obtenir l'acces et commencer tout de suite", digitalAccessText: "Le client sait exactement ce qu'il recoit, comment acceder et ou demander du support.", digitalModuleItems: ["Formation principale", "Ressources telechargeables", "Modeles et outils", "Bonus", "Instructions d'acces", "Notes de support"], digitalProofItems: ["Acces immediat", "Modules modifiables", "Licence claire", "Support pret", "Valeur du bundle", "Paiement simple"],
      collections: "Collections", lookbook: "Lookbook", fit: "Guide des tailles", drop: "Drop", fitGuide: "Guide des tailles", fitGuideItems: ["Notes de taille", "Suggestions de style", "Conseils d'entretien", "Livraison et retours"], fashionCollections: ["Nouveautes", "Essentiels", "Pieces fortes", "Accessoires", "Drop limite", "Meilleures ventes"], jewelryCategories: ["Colliers", "Bracelets", "Boucles d'oreilles", "Bagues", "Coffrets cadeau", "Pieces personnalisees"],
      company: "Entreprise", services: "Services", process: "Processus", proof: "Preuve", capability: "Capacite", requestConsultation: "Demander une consultation", viewServices: "Voir les services", corporateProcessItems: ["Diagnostic", "Strategie", "Livraison", "Support"], corporateProofItems: ["Livraison fiable", "Communication claire", "Standards professionnels"],
      localExperts: "Experts locaux", callNow: "Appeler", fastResponse: "Reponse locale rapide", serviceAreas: "Zones desservies", workProof: "Realisations", workSlug: "realisations", service: "Service", quoteOnly: "Sur devis", serviceAreaReady: "Zone couverte", quoteExpectation: "Expliquez le besoin et recevez une prochaine etape claire.", homeServiceHeadline: (name) => `${name} realise le travail correctement des le depart`, homeServiceSubheadline: (description) => description || "Service local fiable avec communication claire, planning simple et devis avant intervention.", homeServiceCategoriesTitle: "Services pour des besoins locaux reels", homeServiceCategoriesText: "Organisez chaque service en options claires et faciles a demander.", homeServiceAreasTitle: "Nous couvrons les zones importantes", homeServiceAreasText: "Affichez les villes, quartiers, delais de reponse et options d'urgence.", serviceAreaItems: ["Quartiers proches", "Options le jour meme", "Urgences", "Service recurrent", "Travail autorise", "Devis clairs"], beforeAfterTitle: "Travail reel, resultats visibles", beforeAfterText: "Utilisez photos, avant/apres et projets termines pour creer la confiance.", homeServiceTrustTitle: "Pourquoi les clients appellent d'abord", homeServiceTrustText: "Avis, preuves et delais de reponse rendent la demande plus rassurante.", homeServiceTrustItems: ["Assure et autorise", "Devis clairs", "Arrivees ponctuelles", "Avant/apres", "References locales", "Suivi propre"], homeServiceQuoteTitle: "Demander un devis clair", homeServiceQuoteText: "Partagez le besoin, l'horaire prefere et la localisation. L'entreprise peut repondre par telephone, WhatsApp ou email.",
      appointments: "Rendez-vous", availability: "Disponibilite", team: "Equipe", teamSlug: "equipe", bookNow: "Reserver", nextAvailable: "Prochaine disponibilite", slot: "Creneau", confirmation: "Pret a confirmer", staffPick: "Recommande", bookingContactFallback: "Confirmez le service, le creneau et le mode de contact prefere.", bookingHeadline: (name) => `Reservez ${name} sans aller-retour`, bookingSubheadline: (description) => description || "Page de rendez-vous claire avec services, disponibilite, equipe et reservation simple.", bookingServicesTitle: "Choisissez le bon rendez-vous", bookingServicesText: "Affichez duree, details du service et attentes avant reservation.", availabilityTitle: "Disponibilite facile a comprendre", availabilityText: "Clarifiez les horaires, la preparation et la confirmation.", availabilityItems: ["Aujourd'hui / demain", "Matin", "Apres-midi", "Week-end", "Appels de consultation", "Suivis"], bookingTeamTitle: "Une visite plus fluide", bookingTeamText: "Expliquez l'equipe, le processus et la preparation.", bookingTeamItems: ["Choisir un service", "Choisir un creneau", "Recevoir confirmation", "Arriver prepare"], bookingProofItems: ["Durees claires", "Confirmation simple", "Details avant reservation"], bookingContactTitle: "Reserver le prochain creneau", bookingContactText: "Envoyez le service, le jour et le contact prefere. L'entreprise confirme par telephone, WhatsApp ou email.",
      menu: "Menu", specials: "Specialites", hoursLocation: "Horaires et adresse", orderNow: "Commander", viewMenu: "Voir le menu", contact: "Contact", signatureMenu: "Menu signature", popularDish: "Populaire", chefPick: "Choix du chef", pickupDelivery: "Retrait / livraison", quickOrderNote: "Confirmation par telephone, WhatsApp ou email.", editableMenuNote: "Modifiable depuis le gestionnaire de catalogue.", restaurantProofItems: ["Menu modifiable", "Menus en avant", "Contact rapide"], restaurantCategories: ["Entrees", "Plats", "Boissons", "Desserts", "Specialites", "Choix du chef"], restaurantCategoriesTitle: "Explorer le menu par categorie", restaurantSignatureTitle: "Plats signature prets a commander", restaurantSpecialsTitle: "Offres et menus", restaurantInfoTitle: "Horaires, adresse et options de service", restaurantOrderTitle: "Commander ou poser une question", restaurantOrderText: "Envoyez les plats souhaites, retrait ou livraison et le contact prefere.",
      offer: "Offre", benefits: "Benefices", faq: "FAQ", claimOffer: "Commencer", seeProof: "Voir les preuves", nextStep: "Prochaine etape", quickRequest: "Envoyez une demande rapide et recevez une reponse claire.", bestValue: "Meilleur choix", outcomeFocused: "Oriente resultat", fastNextStep: "Etape rapide", editableOffer: "Offre modifiable", faqAnswer: "Cela peut etre ajuste au business, a l'offre et aux objections client.", funnelBenefitsItems: ["Promesse claire", "Etape simple", "Leads qualifies", "Sections modifiables", "Structure avec preuves", "Lancement rapide"], funnelProofItems: ["Resultat specifique", "Processus simple", "Reponse rapide", "Prix clarifies"], funnelFaqItems: [{ question: "Que se passe-t-il ensuite ?", answer: "L'entreprise repond avec la prochaine etape." }, { question: "Peut-on personnaliser ?", answer: "Oui, l'offre et le contenu sont modifiables." }, { question: "Est-ce une boutique ?", answer: "Non, c'est centre sur les leads." }],
      main: "Principal", popular: "Populaire", marketPrice: "Prix du marché", fromQuote: "Sur devis", book: "Réserver", freeQuote: "Devis gratuit", practiceArea: "Domaine d'expertise", scheduleConsultation: "Planifier une consultation",
      before: "Avant", after: "Après", viewProject: "Voir le projet", plan: "Offre", custom: "Sur mesure", start: "Commencer", ticketOffer: "Billet / offre", reserve: "Réserver", package: "Forfait", applyNow: "Postuler", view: "Voir", request: "Demander",
    },
    pt: {
      searchFilters: "Busca e filtros", category: "Categoria", brand: "Marca", price: "Preço", rating: "Avaliação", delivery: "Entrega", deal: "Oferta", fastShip: "Envio rápido",
      search: "Buscar", searchPlaceholder: "Buscar produtos, marcas ou categorias", searchButton: "Buscar", shopNow: "Comprar agora", categories: "Categorias", dealTitle: "Destaques", dealText: "Produtos em destaque, ofertas e opcoes de entrega rapida.", results: "Resultados", sortBy: "Ordenar por", featured: "Destaques", secureCheckout: "Checkout seguro", support: "Suporte", easyReturns: "Devolucoes simples", trustTitle: "Confianca marketplace", signature: "Principal", detail: "Detalhe", curated: "Curado", flagship: "Produto principal", premiumSpecs: ["Apresentacao", "Qualidade", "Suporte", "Entrega"],
      sellerVerified: "Vendedor verificado", used: "Usado", newItem: "Novo", localPickup: "Retirada local", makeOffer: "Fazer oferta", contactSeller: "Contatar vendedor",
      listings: "Anuncios", areas: "Areas", searchListings: "Buscar anuncios", viewListings: "Ver anuncios", inquireNow: "Consultar agora", featuredListing: "Anuncio destaque", newListing: "Novo anuncio", availableNow: "Disponivel", listingPrice: "Preco sob consulta", listingSearchPlaceholder: "Buscar por localizacao, tipo, preco ou palavra-chave", listingFiltersTitle: "Busca com filtros claros", listingFiltersText: "Ajude o cliente a comparar por categoria, area, preco e disponibilidade.", featuredListingsTitle: "Anuncios em destaque", featuredListingsText: "Anuncios ativos com preco, localizacao, detalhes e CTA de consulta.", listingAreaTitle: "Explore as melhores areas", listingAreaText: "Cards de area e notas locais deixam a busca clara.", listingTrustTitle: "Confianca antes da consulta", listingTrustText: "Detalhes verificados, contato claro e disponibilidade atualizada.", listingContactTitle: "Perguntar sobre um anuncio", listingContactText: "Envie o anuncio, orcamento, localizacao e metodo de contato.", listingCategories: ["Casas", "Alugueis", "Comercial", "Terrenos", "Carros", "Destaques"], listingLocations: ["Centro", "Zona norte", "Distrito oeste", "Perto de escolas", "Frente a agua", "Zona comercial"], listingTrustItems: ["Detalhes verificados", "Disponibilidade atualizada", "Precos claros", "Suporte local", "Resposta rapida", "Comparacao simples"],
      newDrop: "Novo drop", limitedSelection: "Seleção limitada", courseAcademy: "Academia de cursos", programs: "Programas", curriculum: "Curriculo", enroll: "Inscricao", enrollNow: "Inscrever-se", viewCurriculum: "Ver curriculo", coursePrice: "Preco de inscricao", featuredProgram: "Programa destaque", beginnerFriendly: "Para iniciantes", certificateReady: "Com certificado", outcomes: "Resultados", instructor: "Instrutor", outcomesTitle: "O que o aluno deve conseguir fazer", outcomesText: "Resultados, habilidades e progresso claro.", instructorTitle: "Guia especialista", instructorText: "Credibilidade, metodo e suporte.", learningPathItems: ["Base", "Pratica", "Aplicacao", "Suporte", "Resultado", "Proximo passo"], learningOutcomeItems: ["Progressao clara", "Atividades praticas", "Curriculo editavel", "Prova para alunos", "Notas de suporte", "Oferta pronta"], instructorTrustItems: ["Aulas especialistas", "Modulos estruturados", "Suporte", "Resultados"], educationDurations: ["4 semanas", "6 modulos", "Turma ao vivo", "No seu ritmo"], clinicCare: "Cuidado personalizado", treatments: "Tratamentos", bookConsultation: "Agendar consulta", viewTreatments: "Ver tratamentos", consultationBased: "Sob consulta", popularTreatment: "Tratamento popular", specialistLed: "Com especialista", personalizedPlan: "Plano personalizado", treatmentsTitle: "Tratamentos e servicos", carePathTitle: "Caminho de cuidado claro", carePathText: "Consulta, plano, tratamento e acompanhamento em um caminho simples.", carePathItems: ["Consulta", "Plano pessoal", "Tratamento", "Revisao", "Pos-cuidado", "Proxima visita"], clinicTrustTitle: "Confianca e seguranca", clinicTrustText: "Credenciais, expectativas e resposta antes de agendar.", clinicTrustItems: ["Guia especializada", "Processo seguro", "Expectativas claras", "Consulta privada", "Pos-cuidado", "Resposta rapida"], resultsTitle: "Resultados realistas", resultsText: "Provas, notas de transformacao e acompanhamento.", resultItems: ["Progresso visivel", "Antes/depois", "Plano pessoal", "Acompanhamento"], clinicTeamTitle: "Especialistas que guiam o processo", clinicTeamText: "Padroes clinicos, credibilidade e filosofia de cuidado.", clinicTeamItems: ["Equipe certificada", "Consulta primeiro", "Educacao do paciente", "Acompanhamento"], clinicBookingTitle: "Agende uma consulta ou pergunte", clinicBookingText: "Envie tratamento, duvida, horario e contato.", clinicDurations: ["Consulta 30 min", "Sessao 45 min", "Plano pessoal", "Acompanhamento"], structuredModules: "Modulos estruturados", practicalOutcome: "Resultado pratico", flexibleAccess: "Acesso flexivel", instantAccess: "Acesso imediato", downloadable: "Conteúdo baixável", bonus: "Recursos bônus", lifetime: "Acesso vitalício", getAccess: "Obter acesso",
      digitalProducts: "Produtos digitais", viewProducts: "Ver produtos", modules: "Modulos", digitalAccessShort: "Downloads, modulos e notas de suporte.", digitalBundleTitle: "Ofertas digitais prontas para vender", digitalModulesTitle: "O que o cliente recebe", digitalProofTitle: "Confianca antes do checkout", digitalAccessTitle: "Obtenha acesso e comece imediatamente", digitalAccessText: "O cliente sabe exatamente o que recebe, como acessar e onde pedir suporte.", digitalModuleItems: ["Treinamento principal", "Recursos para download", "Templates e ferramentas", "Material bonus", "Instrucoes de acesso", "Notas de suporte"], digitalProofItems: ["Acesso imediato", "Modulos editaveis", "Licenca clara", "Suporte pronto", "Valor do bundle", "Checkout simples"],
      collections: "Colecoes", lookbook: "Lookbook", fit: "Guia de tamanhos", drop: "Drop", fitGuide: "Guia de tamanhos", fitGuideItems: ["Notas de tamanho e caimento", "Sugestoes de estilo", "Cuidados com a peca", "Envios e devolucoes"], fashionCollections: ["Novidades", "Essenciais", "Pecas destaque", "Acessorios", "Drop limitado", "Mais vendidos"], jewelryCategories: ["Colares", "Pulseiras", "Brincos", "Aneis", "Kits presente", "Pecas personalizadas"],
      company: "Empresa", services: "Servicos", process: "Processo", proof: "Prova", capability: "Capacidade", requestConsultation: "Solicitar consulta", viewServices: "Ver servicos", corporateProcessItems: ["Diagnostico", "Estrategia", "Entrega", "Suporte"], corporateProofItems: ["Entrega confiavel", "Comunicacao clara", "Padroes profissionais"],
      localExperts: "Especialistas locais", callNow: "Ligar agora", fastResponse: "Resposta local rapida", serviceAreas: "Areas atendidas", workProof: "Trabalhos", workSlug: "trabalhos", service: "Servico", quoteOnly: "Orcamento", serviceAreaReady: "Area atendida", quoteExpectation: "Conte o que precisa e receba o proximo passo claro.", homeServiceHeadline: (name) => `${name} resolve o servico certo desde o primeiro contato`, homeServiceSubheadline: (description) => description || "Servico local confiavel com comunicacao clara, agenda simples e orcamento primeiro.", homeServiceCategoriesTitle: "Servicos para necessidades locais reais", homeServiceCategoriesText: "Organize cada servico em opcoes claras para solicitar orcamento sem confusao.", homeServiceAreasTitle: "Atendemos as areas importantes", homeServiceAreasText: "Mostre cidades, bairros, expectativa de resposta e disponibilidade de emergencia.", serviceAreaItems: ["Bairros proximos", "Opcoes no mesmo dia", "Emergencias", "Servico recorrente", "Trabalho autorizado", "Estimativas claras"], beforeAfterTitle: "Trabalho real, resultado visivel", beforeAfterText: "Use fotos, antes/depois e projetos finalizados para gerar confianca antes da chamada.", homeServiceTrustTitle: "Por que os clientes ligam primeiro", homeServiceTrustText: "Provas, avaliacoes e expectativa de resposta deixam o proximo passo seguro.", homeServiceTrustItems: ["Licenciado e segurado", "Estimativas claras", "Pontualidade", "Antes/depois", "Referencias locais", "Acompanhamento claro"], homeServiceQuoteTitle: "Solicite um orcamento claro", homeServiceQuoteText: "Compartilhe o servico, horario preferido e localizacao. A empresa pode responder por telefone, WhatsApp ou email.",
      appointments: "Agendamentos", availability: "Disponibilidade", team: "Equipe", teamSlug: "equipe", bookNow: "Agendar agora", nextAvailable: "Proxima disponibilidade", slot: "Horario", confirmation: "Pronto para confirmar", staffPick: "Recomendado", bookingContactFallback: "Confirme o servico, horario e metodo de contato preferido.", bookingHeadline: (name) => `Agende em ${name} sem complicacao`, bookingSubheadline: (description) => description || "Pagina clara de agendamento com servicos, disponibilidade, equipe e reserva simples.", bookingServicesTitle: "Escolha o agendamento certo", bookingServicesText: "Mostre duracao, detalhes do servico e o que o cliente deve esperar.", availabilityTitle: "Disponibilidade facil de entender", availabilityText: "Mostre horarios, preparacao e expectativa de confirmacao.", availabilityItems: ["Hoje / amanha", "Horarios de manha", "Horarios a tarde", "Fim de semana", "Chamadas de consulta", "Retornos"], bookingTeamTitle: "Uma visita mais simples do inicio ao fim", bookingTeamText: "Explique equipe, processo e preparacao.", bookingTeamItems: ["Escolha um servico", "Escolha horario preferido", "Receba confirmacao", "Chegue preparado"], bookingProofItems: ["Duracoes claras", "Confirmacao simples", "Detalhes antes de agendar"], bookingContactTitle: "Reserve o proximo horario", bookingContactText: "Envie servico, dia e contato preferido. A empresa confirma por telefone, WhatsApp ou email.",
      menu: "Menu", specials: "Especiais", hoursLocation: "Horarios e localizacao", orderNow: "Pedir agora", viewMenu: "Ver menu", contact: "Contato", signatureMenu: "Menu destaque", popularDish: "Popular", chefPick: "Chef indica", pickupDelivery: "Pickup / delivery", quickOrderNote: "Confirme por telefone, WhatsApp ou email.", editableMenuNote: "Editavel no gerenciador de catalogo.", restaurantProofItems: ["Menu editavel", "Combos destaque", "Contato rapido"], restaurantCategories: ["Entradas", "Pratos principais", "Bebidas", "Sobremesas", "Especiais", "Chef indica"], restaurantCategoriesTitle: "Explore o menu por categoria", restaurantSignatureTitle: "Pratos destaque prontos para pedir", restaurantSpecialsTitle: "Especiais e combos", restaurantInfoTitle: "Horarios, localizacao e servico", restaurantOrderTitle: "Fazer pedido ou perguntar", restaurantOrderText: "Envie os pratos desejados, pickup ou delivery e metodo de contato.",
      offer: "Oferta", benefits: "Beneficios", faq: "FAQ", claimOffer: "Comecar agora", seeProof: "Ver prova", nextStep: "Proximo passo", quickRequest: "Envie uma solicitacao rapida e receba uma resposta clara.", bestValue: "Melhor opcao", outcomeFocused: "Foco em resultado", fastNextStep: "Proximo passo rapido", editableOffer: "Oferta editavel", faqAnswer: "Isto pode ser ajustado ao negocio, oferta e duvidas do cliente.", funnelBenefitsItems: ["Promessa clara", "Proximo passo simples", "Leads qualificados", "Secoes editaveis", "Estrutura com prova", "Lancamento rapido"], funnelProofItems: ["Resultado especifico", "Processo simples", "Resposta rapida", "Conversa clara sobre preco"], funnelFaqItems: [{ question: "O que acontece depois?", answer: "O negocio responde com o proximo passo." }, { question: "Pode personalizar?", answer: "Sim, a oferta e o conteudo sao editaveis." }, { question: "Isso e uma loja?", answer: "Nao, e focado em leads." }],
      main: "Principal", popular: "Popular", marketPrice: "Preço de mercado", fromQuote: "Sob orçamento", book: "Reservar", freeQuote: "Orçamento grátis", practiceArea: "Área de atuação", scheduleConsultation: "Agendar consulta",
      before: "Antes", after: "Depois", viewProject: "Ver projeto", plan: "Plano", custom: "Personalizado", start: "Começar", ticketOffer: "Ingresso / oferta", reserve: "Reservar", package: "Pacote", applyNow: "Aplicar agora", view: "Ver", request: "Consultar",
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

function renderFeatureBand(section, schema) {
  const editable = section.editable || {};
  const variant = section.variant || section.settings?.layout || "feature_band";
  const image = editable.image_url || marketplaceItems(schema).find((item) => item.image_url)?.image_url || "";
  const heading = `<div class="section-heading">
      <span class="rendered-kicker">${escapeHtml(section.type)}</span>
      <h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(inlineEditableValue(editable, "title", editable.headline || section.type))}</h2>
      <p ${inlineEditAttrs(schema, section, "text")}>${escapeHtml(inlineEditableValue(editable, "text", editable.subtitle || ""))}</p>
    </div>`;
  if (variant === "card_grid") {
    const items = Array.isArray(editable.items) && editable.items.length
      ? editable.items
      : marketplaceItems(schema).slice(0, 3).map((item) => item.name);
    return `<section class="rendered-section feature-band feature-card-grid ${sectionClass(section)}" ${sectionAttrs(section)}>
      ${heading}<div class="feature-band-cards">${items.slice(0, 3).map((item, index) => `<article><strong ${inlineSectionItemEditAttrs(schema, section, index, typeof item === "object" ? (Object.prototype.hasOwnProperty.call(item, "name") ? "name" : "title") : "", "item_title")}>${escapeHtml(item.name || item.title || item)}</strong>${typeof item === "object" && Object.prototype.hasOwnProperty.call(item, "description") ? `<span ${inlineSectionItemEditAttrs(schema, section, index, "description", "item_description")}>${escapeHtml(item.description)}</span>` : `<span>${escapeHtml(editable.text || "")}</span>`}</article>`).join("")}</div>
    </section>`;
  }
  const visual = image ? `<div class="feature-band-visual"><img src="${escapeAttribute(image)}" alt=""></div>` : "";
  return `<section class="rendered-section feature-band feature-${escapeAttribute(slugify(variant))} ${sectionClass(section)}" ${sectionAttrs(section)}>
    ${variant === "image_left" ? `${visual}${heading}` : `${heading}${visual}`}
  </section>`;
}

function renderGallery(section, schema) {
  const editable = section.editable || {};
  const images = Array.isArray(editable.images) && editable.images.length
    ? editable.images
    : marketplaceItems(schema).map((item) => item.image_url).filter(Boolean).slice(0, 3);
  return `<section class="rendered-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <h2>${escapeHtml(editable.title || "Gallery")}</h2>
    <div class="rendered-grid">${images
      .map((url) => `<article class="rendered-card"><img src="${escapeAttribute(url)}" alt=""></article>`)
      .join("")}</div>
  </section>`;
}

function renderContact(section, schema) {
  const editable = section.editable || {};
  return `<section class="rendered-section contact-panel ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div>
      <span class="rendered-kicker">${escapeHtml(schema.business.location || "Contact")}</span>
      <h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(inlineEditableValue(editable, "title", "Contact"))}</h2>
      <p ${inlineEditAttrs(schema, section, "text")}>${escapeHtml(inlineEditableValue(editable, "text", "Reach out for more information."))}</p>
    </div>
    <div class="contact-list">${Object.entries(schema.contact || {})
      .filter(([, value]) => value)
      .map(([key, value]) => `<p><strong>${escapeHtml(key)}</strong><span ${inlineEditAttrsForPath(schema, `contact.${key}`, "contact_value")}>${escapeHtml(value)}</span></p>`)
      .join("")}</div>
  </section>`;
}

function visualPlaceholder(schema) {
  const initials = schema.business.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  return `<div class="visual-placeholder">
    <span>${escapeHtml(initials || "AI")}</span>
    <small>${escapeHtml(schema.active_design_variant?.background_style || schema.business.industry || "Brand preview")}</small>
  </div>`;
}

function renderLogoMark(schema) {
  const initials = schema.business.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  return `<div class="logo-lockup">
    <span>${escapeHtml(initials || "M")}</span>
    <div>
      <strong>${escapeHtml(schema.business.name)}</strong>
      <small>${escapeHtml(schema.active_design_variant?.logo_style || "brand mark")}</small>
    </div>
  </div>`;
}

function sectionClass(section) {
  const headingSize = slugify(section.settings?.heading_size || "medium");
  const spacing = slugify(section.settings?.spacing || "balanced");
  const container = slugify(section.settings?.container_width || "standard");
  const density = slugify(section.settings?.card_density || "comfortable");
  const gap = slugify(section.settings?.card_gap || "comfortable");
  const variant = slugify(section.variant || "default");
  return `heading-${headingSize} spacing-${spacing} container-${container} density-${density} gap-${gap} variant-${variant}`;
}

function sectionVars(section) {
  const styles = [];
  if (section.settings?.background) {
    styles.push(`--section-bg:${resolveColor(section.settings.background, section.settings.background)}`);
  }
  if (section.settings?.text_color) {
    styles.push(`--section-text:${resolveColor(section.settings.text_color, section.settings.text_color)}`);
  }
  return styles.length ? `style="${escapeAttribute(styles.join(";"))}"` : "";
}

function sectionAttrs(section) {
  const attrs = [
    `data-studio-section="${escapeAttribute(section.id || section.type || "section")}"`,
    `data-studio-section-type="${escapeAttribute(section.type || "Section")}"`,
    `data-studio-section-variant="${escapeAttribute(section.variant || "default")}"`,
  ];
  const vars = sectionVars(section);
  if (vars) attrs.push(vars);
  return attrs.join(" ");
}


const FALLBACK_TYPE_SCALE = {
  "--type-caption-size": "clamp(0.5501rem, 0.5314rem + 0.0832vw, 0.5980rem)",
  "--type-small-size": "clamp(0.7492rem, 0.7305rem + 0.0832vw, 0.7971rem)",
  "--type-label-size": "clamp(0.8466rem, 0.8178rem + 0.1280vw, 0.9203rem)",
  "--type-body-size": "clamp(1.0094rem, 0.9886rem + 0.0924vw, 1.0625rem)",
  "--type-button-size": "clamp(1.0732rem, 1.0464rem + 0.1191vw, 1.1417rem)",
  "--type-h6-size": "clamp(1.2464rem, 1.1798rem + 0.2956vw, 1.4163rem)",
  "--type-h5-size": "clamp(1.4616rem, 1.3361rem + 0.5580vw, 1.7825rem)",
  "--type-h4-size": "clamp(1.7049rem, 1.4942rem + 0.9363vw, 2.2433rem)",
  "--type-h3-size": "clamp(2.0334rem, 1.6590rem + 1.6642vw, 2.9903rem)",
  "--type-h2-size": "clamp(2.6176rem, 1.9898rem + 2.7902vw, 4.2220rem)",
  "--type-h1-size": "clamp(3.7448rem, 2.5935rem + 5.1171vw, 6.6872rem)",
  "--type-h1-line-height": "1.05", "--type-h1-tracking": "-0.02em", "--type-h1-weight": "700",
  "--type-h2-line-height": "1.1", "--type-h2-tracking": "-0.02em", "--type-h2-weight": "700",
  "--type-h3-line-height": "1.15", "--type-h3-tracking": "-0.01em", "--type-h3-weight": "600",
  "--type-h4-line-height": "1.2", "--type-h4-tracking": "0em", "--type-h4-weight": "600",
  "--type-h5-line-height": "1.25", "--type-h5-tracking": "0em", "--type-h5-weight": "600",
  "--type-h6-line-height": "1.3", "--type-h6-tracking": "0em", "--type-h6-weight": "600",
  "--type-body-line-height": "1.65", "--type-body-weight": "400",
  "--type-small-line-height": "1.55", "--type-small-weight": "400",
  "--type-caption-line-height": "1.45", "--type-caption-weight": "400",
  "--type-label-line-height": "1.2", "--type-label-weight": "600", "--type-label-tracking": "0.08em", "--type-label-transform": "uppercase",
  "--type-button-line-height": "1.2", "--type-button-weight": "600", "--type-button-tracking": "0.01em",
};

const GOOGLE_FONT_WEIGHTS = { heading: "400;500;600;700;800", body: "400;500;600" };
let lastLoadedFontPairKey = "";

function googleFontFamilyParam(fontName, weights) {
  const family = String(fontName || "").trim();
  if (!family) return "";
  return `family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@${weights}`;
}

function inlineEditAttrs(schema, section, field) {
  return inlineEditAttrsForPath(schema, inlineEditPath(schema, section, field), field);
}

function inlineEditSectionPropertyAttrs(schema, section, property, field) {
  const sectionPath = inlineEditPath(schema, section, "title").replace(/\.title$/, "");
  return inlineEditAttrsForPath(schema, sectionPath ? `${sectionPath}.${property}` : "", field);
}

function inlineCatalogEditAttrs(schema, item, itemField, editField) {
  return inlineEditAttrsForPath(schema, inlineEditCatalogPath(schema, item, itemField), editField);
}

function inlineSectionItemEditAttrs(schema, section, index, itemField, editField) {
  return inlineEditAttrsForPath(schema, inlineEditSectionItemPath(schema, section, index, itemField), editField);
}

function inlineEditAttrsForPath(schema, candidatePath, field) {
  if (!supportsExpandedInlineEditing(schema)) return "";
  const path = inlineEditPersistentPath(candidatePath, field);
  const config = inlineEditConfig(field);
  if (!path || !config) return "";
  const label = field.replaceAll("_", " ");
  const placeholder = inlineEditPlaceholder(field, schema.business?.selectedLanguage);
  return [
    `data-inline-edit-path="${escapeAttribute(path)}"`,
    `data-inline-edit-field="${escapeAttribute(field)}"`,
    `data-inline-edit-mode="${escapeAttribute(config.mode)}"`,
    `data-inline-edit-max-length="${config.maxLength}"`,
    `data-inline-edit-max-lines="${config.maxLines}"`,
    `data-inline-edit-placeholder="${escapeAttribute(placeholder)}"`,
    'tabindex="0"',
    `aria-label="${escapeAttribute(`Edit ${label}`)}"`,
  ].join(" ");
}

function supportsExpandedInlineEditing(schema = {}) {
  const templateId = schema.active_template?.id || schema.selected_template?.id || "";
  return templateId === "b2b-saas-enterprise-pro"
    || templateId === "mega-retail-store"
    || supportsSharedShellInlineEditing(templateId);
}

function inlineEditableValue(editable, field, fallback = "") {
  return Object.prototype.hasOwnProperty.call(editable || {}, field) ? editable[field] : fallback;
}

function renderMegaRetailWebsite(schema, page, context, { logo, layoutId, templateId, theme }) {
  const pages = [...(schema.pages || [])].sort((a, b) => a.order - b.order);
  const sections = [...(page?.sections || [])].sort((a, b) => a.order - b.order);
  const items = marketplaceItems(schema);
  const categories = marketplaceCategories(schema).slice(0, 5);
  const labels = megaRetailLabels(schema);
  const hero = sections.find((section) => ["MarketplaceHero", "Hero"].includes(section.type)) || {};
  const clientPhotos = arrayValue(schema.client_media?.photoUrls || schema.photoUrls);
  const provenance = schema.brand?.colorProvenance || schema.colorProvenance || {};
  const hasBrandVisual = Boolean(logo || provenance.anchorColor || arrayValue(schema.brand?.preferredColors).length);
  const brandTint = /^#[0-9a-f]{6}$/i.test(String(provenance.anchorColor || "")) ? provenance.anchorColor : "var(--site-primary)";
  const whatsappUrl = megaRetailWhatsAppUrl(schema.contact || {});
  const features = megaRetailFeatureFlags(schema);
  const absorbedTypes = new Set(["MarketplaceHero", "Hero", "CategoryRail", "DealRow", "TrustStrip", "ProductGrid"]);
  const remainingSections = sections.filter((section) => !absorbedTypes.has(section.type));

  return `<div class="rendered-site layout-${escapeAttribute(slugify(layoutId))} template-${escapeAttribute(slugify(templateId))}" style="${themeVars(theme, schema.brand)};--mega-tile-tint:${escapeAttribute(brandTint)}">
    ${renderStudioFloatingCatalog(schema, context)}
    <div class="rendered-page-switcher"><span>${escapeHtml(schema.business?.name || "Website")}</span><div>${pages.map((item) => `<a class="${item.page_key === page?.page_key ? "active" : ""}" href="#" data-page-link="${escapeAttribute(item.page_key)}" ${inlineEditAttrsForPath(schema, inlineEditPageTitlePath(schema, item), "nav_label")}>${escapeHtml(item.title || item.page_key)}</a>`).join("")}</div></div>
    ${renderMegaRetailHeader(schema, page, logo, categories, labels, false)}
    ${page?.page_key === "home" || page === pages[0] ? `${renderMegaRetailBento(schema, hero, categories, items, clientPhotos, hasBrandVisual, labels)}${renderMegaRetailDeals(schema, sections, items, labels, false)}${renderMegaRetailTrust(sections, labels)}` : ""}
    ${remainingSections.map((section) => renderSection(section, schema)).join("")}
    ${renderMegaRetailFooter(schema, pages, logo, labels, features)}
    ${features.whatsapp && whatsappUrl ? `<a class="mega-retail-whatsapp" href="${escapeAttribute(whatsappUrl)}" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">${megaRetailIcon("whatsapp")}</a>` : ""}
  </div>`;
}

function renderMegaRetailHeader(schema, page, logo, categories, labels, interactive) {
  const departmentButtons = categories.slice(0, 5).map((category) => `<button type="button" data-catalog-category="${escapeAttribute(String(category).toLowerCase())}">${escapeHtml(category)}</button>`).join("");
  return `<header class="mega-retail-header">
    <div class="mega-retail-brand">${logo ? `<img src="${escapeAttribute(logo)}" alt="${escapeAttribute(schema.business?.name || "")}">` : renderLogoMark(schema)}</div>
    <nav class="mega-retail-departments" aria-label="${escapeAttribute(labels.departments)}">${departmentButtons}</nav>
    <form class="mega-retail-search" data-catalog-search-form><input type="search" name="catalog-search" aria-label="${escapeAttribute(labels.search)}" placeholder="${escapeAttribute(labels.search)}"><button type="submit" aria-label="${escapeAttribute(labels.search)}">${megaRetailIcon("search")}</button></form>
    <div class="mega-retail-actions"><button type="button" ${interactive ? "data-account-open" : ""}>${escapeHtml(labels.account)}</button><button class="mega-retail-icon-button" type="button" aria-label="${escapeAttribute(labels.favorites)}">${megaRetailIcon("heart")}</button><button class="mega-retail-icon-button" type="button" ${interactive ? "data-cart-open" : ""} aria-label="${escapeAttribute(labels.cart)}">${megaRetailIcon("bag")}<span ${interactive ? "data-cart-count" : ""}>0</span></button></div>
    <details class="mega-retail-mobile-departments"><summary>${megaRetailIcon("grid")}<span>${escapeHtml(labels.departments)}</span><span class="mega-retail-menu-chevron" aria-hidden="true"></span></summary><div>${departmentButtons}</div></details>
  </header>`;
}

function renderMegaRetailBento(schema, heroSection, categories, items, clientPhotos, hasBrandVisual, labels) {
  const heroCopy = heroSection.editable || {};
  const tileCategories = categories.length ? categories : labels.fallbackCategories;
  const tiles = Array.from({ length: 5 }, (_, index) => {
    const category = tileCategories[index % tileCategories.length];
    const item = items.find((entry) => String(entry.category || "").toLowerCase() === String(category).toLowerCase()) || items[index];
    const media = resolveMegaRetailTileMedia({ clientPhotoUrls: clientPhotos, tileIndex: index, category, categoryImage: item?.image_url || item?.imageUrl, hasBrandVisual });
    const title = index === 0 ? (heroCopy.headline || schema.business?.name || labels.featured) : category;
    const text = index === 0 ? (heroCopy.subtitle || schema.business?.description || labels.heroText) : (item?.description || labels.discover);
    const className = index === 0 ? "is-primary" : index === 1 ? "is-medium" : "is-small";
    const titleAttrs = index === 0
      ? inlineEditAttrs(schema, heroSection, "headline")
      : inlineCatalogEditAttrs(schema, item, "category", "product_name");
    const textAttrs = index === 0
      ? inlineEditAttrs(schema, heroSection, "subtitle")
      : inlineCatalogEditAttrs(schema, item, "description", "product_description");
    const buttonAttrs = index === 0 ? inlineEditAttrs(schema, heroSection, "primary_button") : "";
    return `<article class="mega-retail-tile ${className} ${media.duotone ? "is-duotone" : ""}" data-image-source="${escapeAttribute(media.source)}" data-motion-item><img src="${escapeAttribute(media.url)}" alt="${escapeAttribute(title)}"><div><span>${escapeHtml(index === 0 ? labels.featured : labels.department)}</span><h${index === 0 ? "1" : "2"} ${index === 0 ? "data-motion-headline" : ""} ${titleAttrs}>${escapeHtml(title)}</h${index === 0 ? "1" : "2"}>${index < 2 ? `<p ${index === 0 ? "data-motion-copy" : ""} ${textAttrs}>${escapeHtml(text)}</p>` : ""}<button type="button" data-catalog-category="${escapeAttribute(String(category || "").toLowerCase())}" ${index === 0 ? "data-motion-cta" : ""} ${buttonAttrs}>${escapeHtml(labels.explore)} ${megaRetailIcon("arrow")}</button></div></article>`;
  });
  return `<main class="mega-retail-bento" ${motionDataAttributes(heroSection.motion)}>${tiles.join("")}</main>`;
}

function renderMegaRetailDeals(schema, sections, items, labels, interactive) {
  const commerce = commerceLabels(schema);
  const source = sections.find((section) => ["DealRow", "ProductGrid"].includes(section.type)) || {};
  return `<section class="mega-retail-deals" ${motionDataAttributes(source.motion)}><div class="mega-retail-section-heading" data-motion-content><div><span>${escapeHtml(labels.limited)}</span><h2>${escapeHtml(labels.deals)}</h2></div><button type="button" data-catalog-category="">${escapeHtml(labels.viewAll)} ${megaRetailIcon("arrow")}</button></div><div class="mega-retail-deals-row">${items.slice(0, 10).map((item) => `<article class="mega-retail-product" ${catalogSearchAttributes(item)} data-motion-item><div class="mega-retail-product-image">${renderCatalogImage(item)}${megaRetailDiscountBadge(item)}</div><small ${inlineCatalogEditAttrs(schema, item, "category", "product_name")}>${escapeHtml(item.category || labels.department)}</small><h3 ${inlineCatalogEditAttrs(schema, item, "name", "product_name")}>${escapeHtml(item.name || "")}</h3><p ${inlineCatalogEditAttrs(schema, item, "description", "product_description")}>${escapeHtml(item.description || "")}</p><div><strong>${escapeHtml(item.price_label || labels.price)}</strong><button type="button" ${interactive ? `data-cart-add data-item-id="${escapeAttribute(item.id || item.name || "")}" data-item-name="${escapeAttribute(item.name || "")}" data-item-price="${escapeAttribute(item.price_label || "")}"` : ""}>${escapeHtml(commerce.addToCart)}</button></div></article>`).join("")}</div></section>`;
}

function megaRetailDiscountBadge(item = {}) {
  const badge = item.badge || item.deal_label || item.discount_label || "";
  return badge ? `<span class="mega-retail-discount">${escapeHtml(badge)}</span>` : "";
}

function renderMegaRetailTrust(sections, labels) {
  const source = sections.find((section) => section.type === "TrustStrip") || {};
  return `<section class="mega-retail-trust" ${motionDataAttributes(source.motion)}>${labels.trust.map((item, index) => `<article data-motion-item>${megaRetailIcon(["truck", "return", "grid", "lock"][index])}<div><strong>${escapeHtml(item[0])}</strong><span>${escapeHtml(item[1])}</span></div></article>`).join("")}</section>`;
}

function renderMegaRetailFooter(schema, pages, logo, labels, features) {
  const socials = megaRetailSocialLinks(schema.contact || {});
  const newsletter = features.newsletter ? `<div><strong>${escapeHtml(labels.newsletter)}</strong><p>${escapeHtml(labels.newsletterText)}</p><div class="mega-retail-newsletter"><input type="email" aria-label="Email" placeholder="email@example.com"><button type="button" data-open-lead aria-label="${escapeAttribute(labels.subscribe)}">${megaRetailIcon("arrow")}</button></div></div>` : "";
  return `<footer class="mega-retail-footer"><div class="mega-retail-footer-grid ${features.newsletter ? "" : "is-three-column"}"><div><div class="mega-retail-footer-brand">${logo ? `<img src="${escapeAttribute(logo)}" alt="">` : renderLogoMark(schema)}</div><p>${escapeHtml(schema.business?.description || labels.tagline)}</p>${features.socials && socials ? `<div class="mega-retail-socials">${socials}</div>` : ""}</div><div><strong>${escapeHtml(labels.help)}</strong>${labels.helpLinks.map((label) => `<a href="#contact" data-page-link="${escapeAttribute(pages.find((item) => /contact/i.test(item.page_key || item.title))?.page_key || pages[0]?.page_key || "home")}">${escapeHtml(label)}</a>`).join("")}</div><div><strong>${escapeHtml(labels.company)}</strong>${pages.slice(0, 4).map((item) => `<a href="#${escapeAttribute(item.page_key)}" data-page-link="${escapeAttribute(item.page_key)}" ${inlineEditAttrsForPath(schema, inlineEditPageTitlePath(schema, item), "nav_label")}>${escapeHtml(item.title || item.page_key)}</a>`).join("")}</div>${newsletter}</div><div class="mega-retail-footer-bottom"><span ${inlineEditAttrsForPath(schema, "global_components.footer_text", "footer_text")}>${escapeHtml(schema.global_components?.footer_text || `© ${new Date().getFullYear()} ${schema.business?.name || ""}`)}</span><div class="mega-retail-payments"><span>VISA</span><span>MC</span><span>AMEX</span><span>Pay</span></div></div></footer>`;
}

function megaRetailSocialLinks(contact = {}) {
  return [["instagram", "Instagram"], ["facebook", "Facebook"], ["tiktok", "TikTok"], ["twitter", "Twitter"]].map(([key, label]) => {
    const raw = String(contact[key] || "").trim();
    if (!raw) return "";
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${key === "twitter" ? "x.com" : `${key}.com`}/${raw.replace(/^@/, "")}`;
    return `<a href="${escapeAttribute(url)}" target="_blank" rel="noopener noreferrer" aria-label="${label}">${megaRetailIcon(key)}</a>`;
  }).join("");
}

function megaRetailLabels(schema = {}) {
  const language = schema.business?.selectedLanguage || schema.business?.selected_language || "en";
  const all = {
    en: { departments: "Departments", search: "Search products and departments", account: "Sign in", favorites: "Favorites", cart: "Cart", featured: "Featured", department: "Department", heroText: "Everything you need, in one place.", discover: "Discover the collection", explore: "Explore", limited: "Limited-time picks", deals: "Today's deals", viewAll: "View all", price: "Price on request", tagline: "Everything you need in one place.", help: "Help", company: "Company", newsletter: "Get the best deals", newsletterText: "New arrivals and special offers in your inbox.", subscribe: "Subscribe", helpLinks: ["Shipping", "Returns", "Contact", "Frequently asked questions"], fallbackCategories: ["Technology", "Home", "Fashion", "Beauty", "Outdoor"], trust: [["Fast shipping", "Reliable delivery options"], ["Easy returns", "Simple exchanges and returns"], ["A broad catalog", "Everything in one place"], ["Secure payment", "Protected checkout"]] },
    es: { departments: "Departamentos", search: "Buscar productos y departamentos", account: "Ingresar", favorites: "Favoritos", cart: "Carrito", featured: "Destacado", department: "Departamento", heroText: "Todo lo que buscas, en un solo lugar.", discover: "Descubre la colección", explore: "Explorar", limited: "Selección por tiempo limitado", deals: "Ofertas de hoy", viewAll: "Ver todo", price: "Precio a consultar", tagline: "Todo lo que buscas en un solo lugar.", help: "Ayuda", company: "Empresa", newsletter: "Recibe las mejores ofertas", newsletterText: "Novedades y promociones directo en tu correo.", subscribe: "Suscribirse", helpLinks: ["Envíos", "Devoluciones", "Contacto", "Preguntas frecuentes"], fallbackCategories: ["Tecnología", "Hogar", "Moda", "Belleza", "Aire libre"], trust: [["Envío rápido", "Opciones de entrega confiables"], ["Devoluciones fáciles", "Cambios y devoluciones simples"], ["Catálogo amplio", "Todo en un solo lugar"], ["Pago seguro", "Compra protegida"]] },
  };
  return all[language] || all.en;
}

function megaRetailIcon(name) {
  const paths = { search: '<circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path>', heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"></path>', bag: '<path d="M6 8h12l1 13H5L6 8Z"></path><path d="M9 9V6a3 3 0 0 1 6 0v3"></path>', arrow: '<path d="M5 12h14"></path><path d="m13 6 6 6-6 6"></path>', truck: '<path d="M3 6h11v10H3z"></path><path d="M14 10h4l3 3v3h-7z"></path><circle cx="7" cy="18" r="2"></circle><circle cx="18" cy="18" r="2"></circle>', return: '<path d="m9 14-4-4 4-4"></path><path d="M5 10h9a5 5 0 0 1 5 5v1"></path>', grid: '<rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect>', lock: '<rect x="5" y="10" width="14" height="11" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path>', whatsapp: '<path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4A8 8 0 1 1 20 11.5Z"></path><path d="M9 8.5c.8 2.2 2.3 3.8 4.7 4.7"></path>', instagram: '<rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17.5" cy="6.5" r="1"></circle>', facebook: '<path d="M14 8h3V4h-3a5 5 0 0 0-5 5v3H6v4h3v6h4v-6h3l1-4h-4V9a1 1 0 0 1 1-1Z"></path>', tiktok: '<path d="M15 4v10a4 4 0 1 1-4-4"></path><path d="M15 4c1 3 3 4 5 4"></path>', twitter: '<path d="M4 4l16 16M20 4 4 20"></path>' };
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.grid}</svg>`;
}

function renderCourseOffering(section, schema) {
  const editable = section.editable || {};
  const embedUrl = safeVideoEmbedUrl(editable.videoUrl || editable.video_url || "");
  const includes = arrayValue(editable.includes).slice(0, 8);
  const actionPage = editable.ctaMode === "purchase" ? "catalog" : "contact";
  return `<section class="course-offering ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="course-offering-media">
      ${embedUrl
        ? `<div class="video-embed"><iframe src="${escapeAttribute(embedUrl)}" title="${escapeAttribute(editable.title || "Course")}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`
        : `<div class="course-video-placeholder"><span>${escapeHtml(schema.business?.name || "LYRA")}</span><strong>${escapeHtml(editable.title || "Course")}</strong></div>`}
    </div>
    <div class="course-offering-copy">
      <span class="rendered-kicker" ${inlineEditSectionPropertyAttrs(schema, section, "audience", "badge")}>${escapeHtml(editable.audience || "Course")}</span>
      <h2 ${inlineEditAttrs(schema, section, "title")}>${escapeHtml(editable.title || "Course")}</h2>
      <p ${Object.prototype.hasOwnProperty.call(editable, "description") ? inlineEditSectionPropertyAttrs(schema, section, "description", "text") : inlineEditAttrs(schema, section, "text")}>${escapeHtml(editable.description || editable.text || "")}</p>
      ${includes.length ? `<ul>${includes.map((item, index) => `<li ${inlineEditAttrsForPath(schema, inlineEditSectionCollectionItemPath(schema, section, "includes", index, ""), "item_title")}>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
      <div class="course-offering-action">
        ${editable.priceLabel ? `<strong>${escapeHtml(editable.priceLabel)}</strong>` : ""}
        <a class="rendered-button" href="#" data-page-link="${actionPage}" ${inlineEditSectionPropertyAttrs(schema, section, "ctaLabel", "primary_button")}>${escapeHtml(editable.ctaLabel || "Learn more")}</a>
      </div>
    </div>
  </section>`;
}

function catalogSearchAttributes(item = {}) {
  const searchText = [item.name, item.category, item.description, item.sku].filter(Boolean).join(" ").toLowerCase();
  return `data-catalog-item data-catalog-search="${escapeAttribute(searchText)}" data-catalog-item-category="${escapeAttribute(String(item.category || "").toLowerCase())}"`;
}

export function ensureGoogleFontsLoaded(theme = {}) {
  if (typeof document === "undefined") return;
  const heading = theme.fonts?.heading || "Inter";
  const body = theme.fonts?.body || "Inter";
  const pairKey = `${heading}|${body}`;
  if (pairKey === lastLoadedFontPairKey) return;
  lastLoadedFontPairKey = pairKey;

  if (!document.querySelector('link[data-lyra-font-preconnect="googleapis"]')) {
    const preconnect1 = document.createElement("link");
    preconnect1.rel = "preconnect";
    preconnect1.href = "https://fonts.googleapis.com";
    preconnect1.dataset.lyraFontPreconnect = "googleapis";
    document.head.appendChild(preconnect1);

    const preconnect2 = document.createElement("link");
    preconnect2.rel = "preconnect";
    preconnect2.href = "https://fonts.gstatic.com";
    preconnect2.crossOrigin = "anonymous";
    preconnect2.dataset.lyraFontPreconnect = "gstatic";
    document.head.appendChild(preconnect2);
  }

  const seen = new Set();
  const families = [];
  [[heading, GOOGLE_FONT_WEIGHTS.heading], [body, GOOGLE_FONT_WEIGHTS.body]].forEach(([name, weights]) => {
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    const param = googleFontFamilyParam(name, weights);
    if (param) families.push(param);
  });
  if (!families.length) return;

  const href = `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
  let link = document.querySelector("link[data-lyra-fonts]");
  if (!link) {
    link = document.createElement("link");
    link.rel = "stylesheet";
    link.dataset.lyraFonts = "true";
    document.head.appendChild(link);
  }
  link.href = href;
}

export function themeVars(theme = {}, brandInput = null) {
  theme.colors = theme.colors || {};
  theme.fonts = theme.fonts || {};
  const brand = normalizeBrandForTheme(brandInput || { colors: theme.colors, fontPairing: theme.fonts, borderRadius: `${theme.radius || 10}px`, shadowStyle: theme.shadow });
  const colors = brandToThemeColorsForTheme(brand);
  const typeScale = Object.keys(theme.fonts.scale || {}).length ? theme.fonts.scale : FALLBACK_TYPE_SCALE;
  const typeVars = Object.entries(typeScale).map(([key, value]) => `${key}:${value}`);
  return [
    `--brand-primary:${colors.primary}`,
    `--brand-secondary:${colors.secondary}`,
    `--brand-accent:${colors.accent}`,
    `--brand-background:${colors.background}`,
    `--brand-surface:${colors.surface}`,
    `--brand-text:${colors.text}`,
    `--brand-muted:${colors.muted}`,
    `--brand-border:${colors.border}`,
    `--brand-button:${colors.button}`,
    `--brand-button-text:${colors.buttonText}`,
    `--brand-radius:${brand.borderRadius}`,
    `--brand-shadow:${brand.shadowStyle}`,
    `--site-bg:${colors.background}`,
    `--site-surface:${colors.surface}`,
    `--site-primary:${colors.primary}`,
    `--site-secondary:${colors.secondary}`,
    `--site-accent:${colors.accent}`,
    `--site-text:${colors.text}`,
    `--site-success:${colors.success}`,
    `--site-warning:${colors.warning}`,
    `--site-error:${colors.error}`,
    `--site-info:${colors.info}`,
    `--site-muted:${colors.muted}`,
    `--site-border:${colors.border}`,
    `--site-button:${colors.button}`,
    `--site-button-text:${colors.buttonText}`,
    `--site-heading:${JSON.stringify(brand.fontPairing.heading || "Inter")}`,
    `--site-body:${JSON.stringify(brand.fontPairing.body || "Inter")}`,
    ...typeVars,
  ].join(";");
}


export function resolveColor(value, fallback) {
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(raw)) return raw;
  if (/^(rgb|hsl)a?\(/i.test(raw)) return raw;

  const normalized = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const palettes = [
    [["negro", "black", "oscuro", "noir"], "#111111"],
    [["dorado", "gold", "oro"], "#C89B3C"],
    [["marfil", "ivory", "crema", "cream"], "#F7F1E7"],
    [["beige", "arena", "sand"], "#E8D9C5"],
    [["verde profundo", "verde elegante", "emerald", "esmeralda"], "#0F5E46"],
    [["verde", "natural", "botanico", "organico"], "#2F6F4E"],
    [["azul confianza", "azul corporativo", "navy", "marino"], "#163B73"],
    [["azul", "blue"], "#2563EB"],
    [["rosa pastel", "pastel rosa", "rose", "rosado"], "#E8A7B8"],
    [["pastel", "soft"], "#F5D7E3"],
    [["rojo", "red"], "#B42318"],
    [["vino", "burgundy", "burdeos"], "#7A263A"],
    [["neon", "electrico"], "#39FF88"],
    [["morado", "purple", "lila"], "#6D4AFF"],
    [["minimalista", "minimal", "limpio"], "#F8FAFC"],
    [["lujo", "luxury", "premium"], "#14110F"],
  ];

  const match = palettes.find(([words]) => words.some((word) => normalized.includes(word)));
  return match ? match[1] : fallback;
}
