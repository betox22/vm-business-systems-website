import { API_BASE_URL, ASSET_UPLOAD_URL } from './config.js';
import { escapeHtml, escapeAttribute } from './utils.js';
import { renderWebsite as renderWebsiteMarkup, resolveColor } from './renderers.js';
import { builderState } from './state.js';
import {
  storageStatus,
  editorMount,
  previewFrame,
  studioSelectionToolbar,
  studioProgressList,
  studioLumaMessage,
  studioSuggestedList,
  studioRecentList,
  guidedChatCard,
  liveSitePreviewMount,
  guidedChat,
  guidedReply,
  guidedStatusText,
  guidedLogoPreview,
  guidedPhotoPreview,
  brandKitPanel,
  guidedAssetPrompt,
  guidedBriefReview,
  checkDomainButton,
  domainCheckStatus,
  domainResults,
  isPublicClientSetup,
} from './dom.js';
import { hasStudioAccountSession, openStudioAuthGate } from './auth.js';
import { assistantVisibleCopy } from './chat.js';
import { keepEssentialSections } from './section-policy.js';
export { keepEssentialSections } from './section-policy.js';
import {
  adjustGeneratedDraftWithLuma,
  adminHeaders,
  aiBuildFocusLine,
  aiCatalogStrategyLine,
  aiSourceSignalList,
  aiVisualStrategyLine,
  arrayValue,
  brandPalette,
  buildSitePlan,
  catalogItemsFromSchema,
  cleanShortText,
  cssEscape,
  ensureSitePlan,
  fileToOptimizedDataUrl,
  fontPairingLabel,
  handleGuidedGenerateButton,
  humanizePlanFeature,
  inferCommerceIndustry,
  inputField,
  isGenericText,
  isWeakCta,
  isWeakHeadline,
  langText,
  livePreviewTemplateSelection,
  localizedTemplateDescription,
  localizedTemplateName,
  meaningfulOfferItems,
  normalizeBrand,
  normalizeGenericText,
  openReviewDetails,
  pageIndex,
  pageQuickInspector,
  prepareWebsiteConfig,
  primaryCtaForStrategy,
  professionalHeadline,
  professionalSubtitle,
  publicProductFocus,
  readErrorMessage,
  refreshAiStudioPlanFromContext,
  renderEditor,
  renderGuidedSummary,
  renderPreview,
  resequence,
  selectField,
  selectedPage,
  setAssistantState,
  shortError,
  slugify,
  syncGuidedStateFromSummary,
  syncTemplateSelectionFromGuidedContext,
  t,
  templatePreviewMeta,
  textareaField,
  wantsAiGeneratedLogo,
} from './index.js';

export function ensureLiveSitePreviewCard() {
  if (!builderState.liveSitePreviewCard) {
    builderState.liveSitePreviewCard = document.createElement("section");
    builderState.liveSitePreviewCard.className = "live-site-preview-card";
    builderState.liveSitePreviewCard.setAttribute("aria-label", "Live website draft preview");
  }
  if (liveSitePreviewMount && builderState.liveSitePreviewCard.parentElement !== liveSitePreviewMount) {
    liveSitePreviewMount.appendChild(builderState.liveSitePreviewCard);
  } else if (!liveSitePreviewMount && guidedChatCard && guidedChat && builderState.liveSitePreviewCard.parentElement !== guidedChatCard) {
    guidedChatCard.insertBefore(builderState.liveSitePreviewCard, guidedChat);
  }
  return builderState.liveSitePreviewCard;
}

export function renderAiContractPreview(card) {
  const renderer = window.KreatonTemplateRenderer;
  const plan = builderState.guidedState.sitePlan || {};
  const pages = Array.isArray(plan.pages) ? plan.pages : [];
  const homePage = pages.find((page) => /home|inicio/i.test(`${page.pageId || page.pageKey || page.title || ""}`)) || pages[0];
  const hasAiBlocks = Boolean(
    renderer?.buildPageHTML &&
    homePage &&
    Array.isArray(homePage.sections) &&
    homePage.sections.some((section) => section?.componentType)
  );
  if (!hasAiBlocks) return false;
  const selection = livePreviewTemplateSelection();
  const pageHtml = renderer.buildPageHTML(homePage, {
    templateId: plan.templateId || plan.recommendedTemplateId || selection?.templateId || "",
    catalogType: plan.catalogType || selection?.catalogType || "",
    catalogItems: Array.isArray(plan.catalogItems) ? plan.catalogItems : [],
    designTokens: plan.designTokens || plan.colors || {},
  });
  if (!pageHtml) return false;
  card.classList.add("live-render-card-host");
  card.innerHTML = `
    <div class="live-template-preview-shell ai-contract-preview-shell canvas-fade-in">
      ${pageHtml}
    </div>
  `;
  return true;
}

export function renderNeutralLiveWorkspace() {
  const offerItems = meaningfulOfferItems(builderState.guidedState.servicesProducts);
  const hasInitialGoal = Boolean(builderState.guidedState.websiteIntent);
  const hasOffer = offerItems.length > 0 || Boolean(builderState.guidedState.businessDescription);
  const hasDirection = hasInitialGoal && hasOffer;
  const steps = [
    {
      title: langText({ en: "Business model", es: "Modelo del negocio", fr: "Modele business", pt: "Modelo do negocio" }),
      text: builderState.guidedState.websiteIntent || langText({ en: "Website, store, marketplace, catalog, booking, leads or company site", es: "Web, tienda, marketplace, catalogo, reservas, captacion o empresa", fr: "Site, boutique, marketplace, catalogue, reservation, leads ou entreprise", pt: "Site, loja, marketplace, catalogo, reservas, leads ou empresa" }),
      active: hasInitialGoal,
    },
    {
      title: langText({ en: "Offer intelligence", es: "Inteligencia de oferta", fr: "Intelligence de l'offre", pt: "Inteligencia da oferta" }),
      text: offerItems.join(", ") || builderState.guidedState.businessDescription || langText({ en: "LYRA is waiting for product, service or catalog context", es: "LYRA espera contexto de productos, servicios o catalogo", fr: "LYRA attend le contexte des produits, services ou catalogue", pt: "LYRA aguarda contexto de produtos, servicos ou catalogo" }),
      active: hasOffer,
    },
    {
      title: langText({ en: "Template decision", es: "Decision de plantilla", fr: "Decision template", pt: "Decisao de template" }),
      text: hasDirection
        ? langText({
            en: "KREATON will match the request against the template library before showing a draft.",
            es: "KREATON cruzara la solicitud con la biblioteca de plantillas antes de mostrar un borrador.",
            fr: "KREATON compare la demande avec la bibliotheque de templates avant d'afficher un brouillon.",
            pt: "KREATON compara o pedido com a biblioteca de templates antes de mostrar um rascunho.",
          })
        : langText({
            en: "No random preview. The visual base appears only when the business context is clear.",
            es: "Sin preview random. La base visual aparece solo cuando el contexto del negocio esta claro.",
            fr: "Pas de preview aleatoire. La base visuelle apparait quand le contexte est clair.",
            pt: "Sem preview aleatorio. A base visual aparece quando o contexto fica claro.",
          }),
      active: hasDirection,
    },
  ];
  return `
    <div class="neutral-live-workspace">
      <div class="neutral-live-orbit" aria-hidden="true">
        <span></span><span></span><span></span>
      </div>
      <section class="neutral-live-copy">
        <span>${escapeHtml(langText({ en: "KREATON AI Studio", es: "KREATON AI Studio", fr: "KREATON AI Studio", pt: "KREATON AI Studio" }))}</span>
        <h2>${escapeHtml(langText({ en: "LYRA is mapping the business before designing", es: "LYRA esta entendiendo el negocio antes de diseñar", fr: "LYRA cartographie le business avant de designer", pt: "LYRA mapeia o negocio antes de desenhar" }))}</h2>
        <p>${escapeHtml(langText({
          en: "Describe the business naturally. LYRA extracts the model, catalog depth, audience, style and sales flow, then chooses the right template family.",
          es: "Describe el negocio de forma natural. LYRA extrae modelo, profundidad de catalogo, publico, estilo y flujo de venta, luego elige la familia de plantilla correcta.",
          fr: "Decrivez l'activite naturellement. LYRA extrait le modele, le catalogue, l'audience, le style et le parcours de vente, puis choisit la bonne famille de template.",
          pt: "Descreva o negocio naturalmente. LYRA extrai modelo, profundidade do catalogo, publico, estilo e venda, depois escolhe a familia de template correta.",
        }))}</p>
      </section>
      <div class="neutral-live-steps">
        ${steps.map((step, index) => `
          <article class="${step.active ? "active" : ""}">
            <b>${index + 1}</b>
            <div>
              <strong>${escapeHtml(step.title)}</strong>
              <span>${escapeHtml(step.text)}</span>
            </div>
          </article>
        `).join("")}
      </div>
    </div>
  `;
}

export function livePreviewPayload() {
  const offerItems = meaningfulOfferItems(builderState.guidedState.servicesProducts);
  return {
    business_name: builderState.guidedState.businessName || langText({ en: "Your business", es: "Tu negocio", fr: "Votre entreprise", pt: "Seu negócio" }),
    business_description: builderState.guidedState.businessDescription || builderState.guidedState.websiteIntent || "",
    industry: builderState.guidedState.industry || inferCommerceIndustry(builderState.guidedState),
    location: builderState.guidedState.location || "",
    services_products: offerItems.length ? offerItems : livePreviewFallbackItems(),
    target_audience: builderState.guidedState.targetAudience || "",
    preferred_tone: builderState.guidedState.preferredTone || "",
    preferred_colors: arrayValue(builderState.guidedState.preferredColors),
    contact_info: builderState.guidedState.contactInfo || {},
    selectedLanguage: builderState.selectedLanguage,
    salesMode: builderState.guidedState.salesMode || builderState.guidedState.websiteIntent || "",
    logoPalette: builderState.guidedState.logoPalette || [],
    assets: [
      ...(builderState.guidedState.logoUrl ? [{ asset_type: "logo", url: builderState.guidedState.logoUrl }] : []),
      ...arrayValue(builderState.guidedState.photoUrls).map((url) => ({ asset_type: "photo", url })),
    ],
    brand: builderState.guidedState.brand,
  };
}

export function livePreviewPublicCopy(profile, items = []) {
  const name = builderState.guidedState.businessName || langText({
    en: "Your business",
    es: "Tu negocio",
    fr: "Votre entreprise",
    pt: "Seu negocio",
  });
  const productFocus = publicProductFocus(items, builderState.guidedState.industry);
  const templates = {
    marketplace: {
      headline: langText({
        en: `${name} makes discovery feel simple`,
        es: `${name} convierte descubrir productos en algo simple`,
        fr: `${name} rend la decouverte simple`,
        pt: `${name} torna a descoberta simples`,
      }),
      subtitle: langText({
        en: `A search-first shopping experience for ${productFocus}, built with clear categories, featured finds, and a fast path to buy or ask.`,
        es: `Una experiencia de compra con busqueda clara para ${productFocus}, con categorias ordenadas, destacados y una ruta rapida para comprar o preguntar.`,
        fr: `Une experience d'achat claire pour ${productFocus}, avec categories, selections et parcours rapide vers l'achat ou la demande.`,
        pt: `Uma experiencia de compra clara para ${productFocus}, com categorias, destaques e caminho rapido para comprar ou perguntar.`,
      }),
      supportingLine: langText({
        en: "LYRA is shaping this as a catalog with search, categories, featured offers and editable product sections.",
        es: "LYRA lo esta armando como catalogo con busqueda, categorias, ofertas destacadas y secciones editables.",
        fr: "LYRA le structure comme catalogue avec recherche, categories, offres et sections modifiables.",
        pt: "A LYRA esta estruturando como catalogo com busca, categorias, ofertas e secoes editaveis.",
      }),
    },
    fashion: {
      headline: langText({
        en: `${name} gets a collection-led storefront`,
        es: `${name} se presenta como una tienda visual por colecciones`,
        fr: `${name} devient une boutique visuelle par collections`,
        pt: `${name} vira uma loja visual por colecoes`,
      }),
      subtitle: langText({
        en: `An editorial storefront for ${productFocus}, with drops, looks, product cards and a clean path to shop.`,
        es: `Una tienda editorial para ${productFocus}, con drops, looks, tarjetas de producto y una ruta clara para comprar.`,
        fr: `Une boutique editoriale pour ${productFocus}, avec drops, looks, fiches produit et achat clair.`,
        pt: `Uma loja editorial para ${productFocus}, com drops, looks, cards de produto e compra clara.`,
      }),
      supportingLine: langText({
        en: "The client notes guide the visual direction; the page copy is rewritten as customer-facing retail copy.",
        es: "Las notas del cliente guian la direccion visual; el texto se reescribe como copy comercial para compradores.",
        fr: "Les notes client guident la direction visuelle; le texte devient un copy commercial.",
        pt: "As notas do cliente guiam a direcao visual; o texto vira copy comercial.",
      }),
    },
    restaurant: {
      headline: langText({
        en: `${name} gets a menu that sells`,
        es: `${name} obtiene un menu pensado para vender`,
        fr: `${name} obtient un menu pense pour vendre`,
        pt: `${name} ganha um menu feito para vender`,
      }),
      subtitle: langText({
        en: "A warm food experience with signature items, specials, hours, location and quick ordering.",
        es: "Una experiencia calida con platos destacados, especiales, horarios, ubicacion y pedidos rapidos.",
        fr: "Une experience chaleureuse avec plats signature, offres, horaires, adresse et commande rapide.",
        pt: "Uma experiencia acolhedora com destaques, especiais, horarios, localizacao e pedidos rapidos.",
      }),
      supportingLine: langText({
        en: "LYRA is turning the intake into a menu structure, not pasting internal notes onto the page.",
        es: "LYRA convierte la informacion en estructura de menu, no pega notas internas en la pagina.",
        fr: "LYRA transforme les infos en structure de menu, sans coller les notes internes.",
        pt: "A LYRA transforma as informacoes em menu, sem colar notas internas.",
      }),
    },
    service: {
      headline: langText({
        en: `${name} gets a trust-first website`,
        es: `${name} obtiene una pagina enfocada en confianza`,
        fr: `${name} obtient un site axe confiance`,
        pt: `${name} ganha um site focado em confianca`,
      }),
      subtitle: langText({
        en: `A clear service page for ${productFocus}, with proof, process, contact options and quote-ready sections.`,
        es: `Una pagina clara para ${productFocus}, con pruebas, proceso, contacto y secciones listas para cotizar.`,
        fr: `Une page claire pour ${productFocus}, avec preuves, processus, contact et demande de devis.`,
        pt: `Uma pagina clara para ${productFocus}, com provas, processo, contato e orcamento.`,
      }),
      supportingLine: langText({
        en: "LYRA is translating the brief into positioning, proof and conversion sections.",
        es: "LYRA traduce el brief en posicionamiento, prueba y secciones de conversion.",
        fr: "LYRA traduit le brief en positionnement, preuves et conversion.",
        pt: "A LYRA traduz o briefing em posicionamento, prova e conversao.",
      }),
    },
    premium: {
      headline: langText({
        en: `${name} gets a polished brand showcase`,
        es: `${name} obtiene una presentacion de marca pulida`,
        fr: `${name} obtient une presentation de marque soignee`,
        pt: `${name} ganha uma apresentacao de marca polida`,
      }),
      subtitle: langText({
        en: `A premium presentation for ${productFocus}, with refined messaging, strong visuals and editable story sections.`,
        es: `Una presentacion premium para ${productFocus}, con mensaje refinado, visuales fuertes y secciones editables.`,
        fr: `Une presentation premium pour ${productFocus}, avec message raffine, visuels forts et sections modifiables.`,
        pt: `Uma apresentacao premium para ${productFocus}, com mensagem refinada, visual forte e secoes editaveis.`,
      }),
      supportingLine: langText({
        en: "The preview uses designer-written copy inferred from the intake, not the raw answer.",
        es: "El preview usa copy escrito como disenador a partir del intake, no la respuesta cruda.",
        fr: "L'apercu utilise un copy deduit du brief, pas la reponse brute.",
        pt: "O preview usa copy criado a partir do briefing, nao a resposta bruta.",
      }),
    },
  };
  return templates[profile.kind] || templates.premium;
}

export function livePreviewNavItems(profile) {
  const sets = {
    marketplace: ["Shop", "Categories", "Deals", "Cart"],
    listings: ["Search", "Listings", "Sellers", "Contact"],
    fashion: ["New drop", "Collections", "Lookbook", "Fit"],
    restaurant: ["Menu", "Specials", "Order", "Location"],
    service: ["Services", "Process", "Proof", "Contact"],
    premium: ["Overview", "Features", "Story", "Buy"],
  };
  return (sets[profile.kind] || sets.premium).map((item) => translatePreviewNav(item));
}

export function translatePreviewNav(item) {
  const dictionary = {
    es: { Shop: "Tienda", Categories: "Categorias", Deals: "Ofertas", Cart: "Carrito", Search: "Buscar", Listings: "Listados", Sellers: "Vendedores", Contact: "Contacto", "New drop": "Nuevo drop", Collections: "Colecciones", Lookbook: "Lookbook", Fit: "Tallas", Menu: "Menu", Specials: "Especiales", Order: "Pedir", Location: "Ubicacion", Services: "Servicios", Process: "Proceso", Proof: "Prueba", Overview: "Inicio", Features: "Detalles", Story: "Historia", Buy: "Comprar" },
    fr: { Shop: "Boutique", Categories: "Categories", Deals: "Offres", Cart: "Panier", Search: "Recherche", Listings: "Annonces", Sellers: "Vendeurs", Contact: "Contact", "New drop": "Nouveautes", Collections: "Collections", Lookbook: "Lookbook", Fit: "Tailles", Menu: "Menu", Specials: "Specials", Order: "Commander", Location: "Adresse", Services: "Services", Process: "Processus", Proof: "Preuves", Overview: "Accueil", Features: "Details", Story: "Histoire", Buy: "Acheter" },
    pt: { Shop: "Loja", Categories: "Categorias", Deals: "Ofertas", Cart: "Carrinho", Search: "Busca", Listings: "Anuncios", Sellers: "Vendedores", Contact: "Contato", "New drop": "Novo drop", Collections: "Colecoes", Lookbook: "Lookbook", Fit: "Tamanhos", Menu: "Menu", Specials: "Especiais", Order: "Pedir", Location: "Localizacao", Services: "Servicos", Process: "Processo", Proof: "Prova", Overview: "Inicio", Features: "Detalhes", Story: "Historia", Buy: "Comprar" },
  };
  return dictionary[builderState.selectedLanguage]?.[item] || item;
}

export function livePreviewItemMicrocopy(profile, index) {
  const copy = {
    marketplace: [
      langText({ en: "Prepared for category browsing and quick discovery.", es: "Preparado para categorias y busqueda rapida.", fr: "Pret pour categories et decouverte rapide.", pt: "Pronto para categorias e descoberta rapida." }),
      langText({ en: "Deal-ready product block.", es: "Bloque listo para ofertas.", fr: "Bloc pret pour offres.", pt: "Bloco pronto para ofertas." }),
      langText({ en: "Filterable and editable.", es: "Filtrable y editable.", fr: "Filtrable et modifiable.", pt: "Filtravel e editavel." }),
    ],
    fashion: [
      langText({ en: "Visual collection card.", es: "Card visual de coleccion.", fr: "Carte collection visuelle.", pt: "Card visual de colecao." }),
      langText({ en: "Lookbook-ready section.", es: "Seccion lista para lookbook.", fr: "Section lookbook.", pt: "Secao pronta para lookbook." }),
      langText({ en: "Drop and fit details.", es: "Drop y detalles de talla.", fr: "Drop et tailles.", pt: "Drop e tamanhos." }),
    ],
    restaurant: [
      langText({ en: "Menu item with order path.", es: "Producto de menu con pedido.", fr: "Plat avec commande.", pt: "Item de menu com pedido." }),
      langText({ en: "Specials and combos.", es: "Especiales y combos.", fr: "Specials et menus.", pt: "Especiais e combos." }),
      langText({ en: "Pickup or delivery CTA.", es: "CTA para pickup o delivery.", fr: "CTA retrait/livraison.", pt: "CTA retirada/entrega." }),
    ],
    service: [
      langText({ en: "Service benefit and proof.", es: "Beneficio y prueba.", fr: "Benefice et preuve.", pt: "Beneficio e prova." }),
      langText({ en: "Process step.", es: "Paso del proceso.", fr: "Etape processus.", pt: "Etapa do processo." }),
      langText({ en: "Quote-ready contact.", es: "Contacto listo para cotizar.", fr: "Contact pret pour devis.", pt: "Contato pronto para orcamento." }),
    ],
  };
  const list = copy[profile.kind] || [
    langText({ en: "Editable section preview.", es: "Seccion editable.", fr: "Section modifiable.", pt: "Secao editavel." }),
    langText({ en: "Premium detail block.", es: "Bloque premium.", fr: "Bloc premium.", pt: "Bloco premium." }),
    langText({ en: "Conversion-ready CTA.", es: "CTA listo para convertir.", fr: "CTA pret a convertir.", pt: "CTA pronto para converter." }),
  ];
  return list[index % list.length];
}

export function livePreviewFallbackItems() {
  return [
    langText({ en: "Main offer", es: "Oferta principal", fr: "Offre principale", pt: "Oferta principal" }),
    langText({ en: "Proof section", es: "Prueba/confianza", fr: "Preuve/confiance", pt: "Prova/confiança" }),
    langText({ en: "Contact CTA", es: "Boton de contacto", fr: "CTA contact", pt: "CTA contato" }),
  ];
}

export function shouldShowAssetPrompt() {
  const typed = guidedReply?.value || "";
  if (wantsAiGeneratedLogo(typed) || wantsAiGeneratedLogo(builderState.guidedState.hasLogoPhotos)) return false;
  return (
    document.body.classList.contains("review-details-open") ||
    builderState.guidedStep === "hasLogoPhotos" ||
    wantsToUploadAssets(typed) ||
    Boolean((builderState.guidedState.hasLogo || builderState.guidedState.hasPhotos) && !wantsAiGeneratedLogo(builderState.guidedState.hasLogoPhotos))
  );
}

export function updateAssetPromptVisibility() {
  guidedAssetPrompt?.classList.toggle("active", shouldShowAssetPrompt());
}

export function wantsToUploadAssets(value) {
  const text = String(value || "").toLowerCase();
  if (wantsAiGeneratedLogo(text)) return false;
  return /subir|cargar|adjuntar|upload|attach|tengo logo|tengo fotos|logo listo|fotos listas|photo ready|photos ready|use my logo|usar mi logo/.test(text);
}

export function renderAssetPreviews() {
  guidedLogoPreview.src = builderState.guidedState.logoUrl || "";
  guidedLogoPreview.classList.toggle("active", Boolean(builderState.guidedState.logoUrl));
  guidedPhotoPreview.innerHTML = arrayValue(builderState.guidedState.photoUrls)
    .slice(0, 4)
    .map((url) => `<img src="${escapeAttribute(url)}" alt="">`)
    .join("");
  renderBrandKit();
}

export function renderBrandKit(brand = builderState.guidedState.brand) {
  if (!brandKitPanel) return;
  const normalizedBrand = normalizeBrand(brand || (builderState.guidedState.logoUrl ? { logoUrl: builderState.guidedState.logoUrl } : null));
  brandKitPanel.hidden = !normalizedBrand.logoUrl && !builderState.guidedState.logoPalette.length;
  if (brandKitPanel.hidden) {
    brandKitPanel.innerHTML = "";
    return;
  }
  const swatches = brandPalette(normalizedBrand)
    .map((color) => `<span class="brand-swatch" style="--swatch:${escapeAttribute(color)}" title="${escapeAttribute(color)}"></span>`)
    .join("");
  brandKitPanel.innerHTML = `
    <div class="brand-kit-head">
      ${normalizedBrand.logoUrl ? `<img src="${escapeAttribute(normalizedBrand.logoUrl)}" alt="">` : ""}
      <div>
        <strong>Brand Kit</strong>
        <span>${escapeHtml(normalizedBrand.styleDirection)}</span>
      </div>
    </div>
    <div class="brand-kit-swatches">${swatches}</div>
    <div class="brand-kit-meta">
      <span>${escapeHtml(fontPairingLabel(normalizedBrand.fontPairing))}</span>
      <span>Radius ${escapeHtml(normalizedBrand.borderRadius)}</span>
      <button class="brand-kit-button" type="button">Button preview</button>
    </div>
  `;
}

export function renderGuidedBriefReview() {
  if (!guidedBriefReview) return;
  syncTemplateSelectionFromGuidedContext();
  const offer = meaningfulOfferItems(builderState.guidedState.servicesProducts).slice(0, 3).join(", ");
  const summary = [
    builderState.guidedState.businessName,
    builderState.guidedState.industry,
    builderState.guidedState.location,
    builderState.guidedState.salesFlow || builderState.guidedState.salesMode,
    offer,
  ].filter(Boolean);
  guidedBriefReview.innerHTML = `
    <section class="business-review-summary">
      <strong>${escapeHtml(langText({ en: "What we understand about your business", es: "Esto entendimos de tu negocio", fr: "Ce que nous avons compris de votre entreprise", pt: "O que entendemos sobre seu negócio" }))}</strong>
      <p>${escapeHtml(summary.join(" · ") || langText({ en: "Add a few details and LYRA will prepare your draft.", es: "Agrega algunos detalles y LYRA preparará tu borrador.", fr: "Ajoutez quelques détails et LYRA préparera votre brouillon.", pt: "Adicione alguns detalhes e a LYRA preparará seu rascunho." }))}</p>
    </section>
  `;
}

export function renderLumaReadyCard() {
  const offer = meaningfulOfferItems(builderState.guidedState.servicesProducts).slice(0, 3).join(", ");
  const summary = [
    builderState.guidedState.businessName,
    builderState.guidedState.industry,
    builderState.guidedState.location,
    builderState.guidedState.salesFlow || builderState.guidedState.salesMode,
    offer,
  ].filter(Boolean);
  const card = document.createElement("section");
  card.className = "luma-ready-card";
  card.innerHTML = `
    <div class="luma-ready-head">
      <strong>${escapeHtml(langText({ en: "This is what I understand about your business", es: "Esto entendimos de tu negocio", fr: "Voici ce que j'ai compris de votre entreprise", pt: "Isto é o que entendi sobre seu negócio" }))}</strong>
    </div>
    <p>${escapeHtml(summary.join(" · "))}</p>
    <div class="luma-ready-actions">
      <button type="button" data-chat-generate>${escapeHtml(langText({ en: "Generate my website", es: "Generar mi web", fr: "Générer mon site", pt: "Gerar meu site" }))}</button>
      <button type="button" data-chat-review>${escapeHtml(langText({ en: "Correct something", es: "Corregir algo", fr: "Corriger quelque chose", pt: "Corrigir algo" }))}</button>
    </div>
  `;
  card.querySelector("[data-chat-generate]")?.addEventListener("click", (event) => handleGuidedGenerateButton(event));
  card.querySelector("[data-chat-review]")?.addEventListener("click", openReviewDetails);
  return card;
}

export function renderSelectedDomainState() {
  if (!domainCheckStatus || !builderState.guidedState.desiredDomain || domainResults?.children.length) return;
  domainCheckStatus.textContent = langText({
    en: "You can check availability before generating.",
    es: "Puedes verificar disponibilidad antes de generar.",
    fr: "Vous pouvez vérifier la disponibilité avant de générer.",
    pt: "Você pode verificar a disponibilidade antes de gerar.",
  });
}

export async function checkDesiredDomainOptions() {
  syncGuidedStateFromSummary();
  const query = builderState.guidedState.desiredDomain || builderState.guidedState.businessName || "";
  if (!query.trim()) {
    domainCheckStatus.textContent = t("domainCheckEmpty");
    domainResults.innerHTML = "";
    return;
  }
  checkDomainButton.disabled = true;
  domainCheckStatus.textContent = t("checkingDomain");
  domainResults.innerHTML = "";
  try {
    const response = await fetch(`${API_BASE_URL}/public/domain-search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error(await readErrorMessage(response));
    renderDomainResults(await response.json());
  } catch (error) {
    domainCheckStatus.textContent = `${langText({
      en: "Could not check domain",
      es: "No se pudo verificar",
      fr: "Impossible de vérifier le domaine",
      pt: "Não foi possível verificar o domínio",
    })}: ${shortError(error.message)}`;
  } finally {
    checkDomainButton.disabled = false;
  }
}

export function renderDomainResults(result) {
  const rows = result.results || [];
  domainCheckStatus.textContent = result.exact_availability || result.exactAvailability
    ? t("domainExact")
    : t("domainSuggestions");
  if (!rows.length) {
    domainResults.innerHTML = `<p class="mini-note">${langText({ en: "No options found.", es: "No encontramos opciones.", fr: "Aucune option trouvée.", pt: "Nenhuma opção encontrada." })}</p>`;
    return;
  }
  domainResults.innerHTML = rows.slice(0, 6).map((item) => {
    const selectable = item.status !== "not_available";
    return `<button class="domain-choice ${selectable ? "selectable" : "blocked"}" data-domain-choice="${escapeAttribute(item.domain)}" type="button" ${selectable ? "" : "disabled"}>
      <strong>${escapeHtml(item.domain)}</strong>
      <span>${escapeHtml(domainStatusLabel(item))}</span>
    </button>`;
  }).join("");
  domainResults.querySelectorAll("[data-domain-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      builderState.guidedState.desiredDomain = button.dataset.domainChoice;
      renderGuidedSummary();
      domainCheckStatus.textContent = langText({
        en: `Selected domain: ${button.dataset.domainChoice}`,
        es: `Dominio seleccionado: ${button.dataset.domainChoice}`,
        fr: `Domaine sélectionné : ${button.dataset.domainChoice}`,
        pt: `Domínio selecionado: ${button.dataset.domainChoice}`,
      });
    });
  });
}

export function domainStatusLabel(item) {
  const status = item.status || "";
  const labels = {
    available_included: { en: "Available in package", es: "Disponible en el paquete", fr: "Disponible dans le forfait", pt: "Disponível no pacote" },
    available_requires_review: { en: "Available, needs review", es: "Disponible, requiere revision", fr: "Disponible, vérification requise", pt: "Disponível, precisa de revisão" },
    not_available: { en: "Not available", es: "No disponible", fr: "Non disponible", pt: "Não disponível" },
    needs_registrar_check: { en: "Suggestion, confirm before payment", es: "Sugerencia, confirmar antes de pagar", fr: "Suggestion, confirmer avant paiement", pt: "Sugestão, confirmar antes do pagamento" },
  };
  return labels[status] ? langText(labels[status]) : status || langText({ en: "Suggested option", es: "Opcion sugerida", fr: "Option suggérée", pt: "Opção sugerida" });
}

export function compactCollectedPreview() {
  const templateMeta = templatePreviewMeta(builderState.forcedTemplateSelection?.templateId || builderState.guidedState.sitePlan?.templateId || "");
  const humanTemplate = localizedTemplateName(templateMeta);
  const parts = [
    builderState.guidedState.businessName,
    humanTemplate,
    builderState.guidedState.industry,
    builderState.guidedState.location,
    arrayValue(builderState.guidedState.servicesProducts).slice(0, 2).join(", "),
  ].filter(Boolean);
  return parts.length
    ? parts.join(" · ")
    : langText({
        en: "LYRA is collecting the essentials.",
        es: "LYRA está reuniendo lo esencial.",
        fr: "LYRA collecte l'essentiel.",
        pt: "A LYRA está reunindo o essencial.",
      });
}

export async function createDomainOrderIfNeeded(payload, result) {
  const requestedDomain = payload.desiredDomain || payload.desired_domain || "";
  if (!requestedDomain.trim() || !result.business_id) return;
  try {
    const search = await fetch(`${API_BASE_URL}/public/domain-search?q=${encodeURIComponent(requestedDomain)}`);
    const searchResult = search.ok ? await search.json() : { results: [] };
    const selectedResult = (searchResult.results || []).find((item) => item.domain === requestedDomain.trim().toLowerCase())
      || (searchResult.results || [])[0]
      || {};
    const orderPayload = {
      businessId: result.business_id,
      siteId: result.site_id,
      clientRequestId: builderState.currentRequestId,
      requestedDomain,
      ownerEmail: payload.contact_info?.email || payload.contact_info?.contact || "",
      ownerName: payload.contact_info?.name || payload.business_name || "",
      packageCode: "starter",
      selectedResult,
    };
    const response = await fetch(`${API_BASE_URL}/domain-orders`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(orderPayload),
    });
    if (!response.ok) throw new Error(await readErrorMessage(response));
    const saved = await response.json();
    if (saved.storage_status === "stored") {
      guidedStatusText.textContent = langText({
        en: "Website generated. Domain saved for review/payment before registration.",
        es: "Pagina generada. Dominio guardado para revisar/pagar antes de registrarlo.",
        fr: "Site généré. Domaine enregistré pour vérification/paiement avant l'enregistrement.",
        pt: "Site gerado. Domínio salvo para revisão/pagamento antes do registro.",
      });
    }
  } catch (error) {
    console.warn("Domain order could not be saved", error);
    guidedStatusText.textContent = langText({
      en: "Website generated. Could not save the domain order; you can do it from admin.",
      es: "Pagina generada. No se pudo guardar la orden de dominio; puedes hacerlo desde admin.",
      fr: "Site généré. Impossible d'enregistrer la commande de domaine; vous pouvez le faire depuis l'admin.",
      pt: "Site gerado. Não foi possível salvar o pedido de domínio; você pode fazer isso no admin.",
    });
  }
}

export function ensurePurposefulSections(schema, strategy, options = {}) {
  const layoutStrategy = strategy.layoutStrategy || {};
  const business = schema.business || {};
  const hasCatalog = arrayValue(schema.catalog_items || schema.products_services).length > 0;
  return {
    ...schema,
    pages: arrayValue(schema.pages).map((page) => {
      const seen = new Set();
      let sections = arrayValue(page.sections)
        .filter((section) => hasSectionPurpose(section, hasCatalog, page.page_key === "home"))
        .filter((section) => {
          const key = `${section.type}:${normalizeGenericText(section.editable?.title || section.editable?.headline || "")}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      if (!sections.some((section) => section.type === "Hero") && page.page_key === "home") {
        sections.unshift({
          type: "Hero",
          editable: {
            headline: professionalHeadline(schema, strategy.businessContext),
            subtitle: business.description || strategy.businessContext?.offer || "",
            primary_button: primaryCtaForStrategy(strategy),
          },
          settings: {},
        });
      }
      if (page.page_key === "home" && !options.reviewOnly) {
        const maxSections = layoutStrategy.spacingScale?.maxHomeSections || 6;
        sections = keepEssentialSections(sections, maxSections);
      }
      return { ...page, sections };
    }),
  };
}

export function hasSectionPurpose(section, hasCatalog, isHomePage) {
  if (!section) return false;
  if (section.type === "Hero" || section.type === "Contact" || section.type === "Footer") return true;
  if ((section.type === "ProductGrid" || section.type === "ServiceList") && hasCatalog) return true;
  if (section.type === "Gallery") return arrayValue(section.editable?.images).length > 0;
  const editable = section.editable || {};
  const text = [editable.title, editable.headline, editable.text, editable.subtitle].filter(Boolean).join(" ");
  if (!text.trim()) return false;
  if (!isHomePage) return true;
  return !/lorem ipsum|placeholder|random section|insert text/i.test(text);
}

export function normalizeSectionSettings(section, index, scale, direction) {
  const settings = { ...(section.settings || {}) };
  if (settings.background && /gradient|random|rainbow/i.test(settings.background)) delete settings.background;
  settings.spacing = section.type === "Hero" ? "spacious" : settings.spacing || scale.sectionPadding || "balanced";
  settings.heading_size = section.type === "Hero" ? "large" : settings.heading_size || (direction === "marketplace" ? "small" : "medium");
  settings.container_width = settings.container_width || (section.type === "Hero" ? scale.containerWidth || "standard" : scale.containerWidth || "standard");
  settings.card_gap = settings.card_gap || scale.cardGap || "comfortable";
  settings.card_density = settings.card_density || scale.cardDensity || "comfortable";
  settings.mobile_stack = true;
  if (section.type === "Hero") settings.layout = settings.layout || scale.heroLayout || "split_showcase";
  if (section.type === "ProductGrid" || section.type === "ServiceList") {
    settings.columns = Number(settings.columns || (direction === "marketplace" ? 4 : direction === "luxury" || direction === "ecommerce_premium" ? 3 : 3));
  }
  return settings;
}

export function improveSectionCopy(section, schema, strategy) {
  const editable = { ...(section.editable || {}) };
  if (section.type === "Hero") {
    if (isWeakHeadline(editable.headline, schema.business?.name)) editable.headline = professionalHeadline(schema, strategy.businessContext);
    if (!editable.subtitle || isGenericText(editable.subtitle)) editable.subtitle = professionalSubtitle(schema, strategy.businessContext);
    if (!editable.primary_button || isWeakCta(editable.primary_button)) editable.primary_button = primaryCtaForStrategy(strategy);
    if (isWeakCta(editable.secondary_button)) editable.secondary_button = "View offerings";
  }
  if ((section.type === "ProductGrid" || section.type === "ServiceList") && isGenericText(editable.title || editable.headline)) {
    editable.title = strategy.designDirection === "restaurant" ? "Menu highlights" : "What you can get here";
  }
  if (section.type === "Contact") {
    editable.title = editable.title && !isGenericText(editable.title) ? editable.title : "Ready for the next step?";
    editable.text = editable.text && !isGenericText(editable.text) ? editable.text : "Send a message and get a clear answer about availability, pricing, or fit.";
  }
  return editable;
}

export function reviewWebsiteConfigBeforeRender(schema, strategy) {
  const improvements = [];
  const reviewed = {
    ...schema,
    global_components: {
      ...(schema.global_components || {}),
      footer_text: schema.global_components?.footer_text || `${schema.business?.name || "Brand"} - ${strategy.businessContext?.mainConversionGoal || "clear next steps"}`,
    },
  };
  reviewed.pages = arrayValue(reviewed.pages).map((page) => ({
    ...page,
    sections: arrayValue(page.sections).map((section) => {
      if (section.type !== "Hero") return section;
      const editable = { ...(section.editable || {}) };
      if (isWeakHeadline(editable.headline, reviewed.business?.name)) {
        editable.headline = professionalHeadline(reviewed, strategy.businessContext);
        improvements.push("Strengthened hero headline");
      }
      if (!editable.primary_button || isWeakCta(editable.primary_button)) {
        editable.primary_button = primaryCtaForStrategy(strategy);
        improvements.push("Clarified primary CTA");
      }
      return { ...section, editable };
    }),
  }));
  reviewed.design_review = {
    reviewedAt: new Date().toISOString(),
    focus: ["headline", "CTA", "section order", "contrast", "visual rhythm", "mobile layout", "brand consistency"],
    improvements,
  };
  return reviewed;
}

export function addSectionPurpose(section, index, strategy) {
  const typePurpose = {
    Hero: "State the offer, establish brand credibility, and drive the primary CTA.",
    ProductGrid: "Help visitors compare offers and choose a next action.",
    ServiceList: "Clarify services and reduce decision friction.",
    FeatureBand: "Explain differentiators that support the conversion goal.",
    About: "Build trust with context and brand story.",
    Testimonials: "Provide proof and reduce risk.",
    Gallery: "Show real visual evidence.",
    Contact: "Convert interest into a request.",
    Footer: "Close with brand recall and contact routes.",
  };
  return {
    ...section,
    reason: section.reason || typePurpose[section.type] || "Support the page narrative with useful information.",
    conversion_purpose: section.conversion_purpose || (index === 0 ? strategy.conversionGoal : typePurpose[section.type] || strategy.businessGoal),
    priority: section.priority || (index === 0 ? "high" : index < 3 ? "medium" : "supporting"),
    visual_treatment: section.visual_treatment || `${strategy.visualDirection}; spacing ${section.settings?.spacing || "balanced"}`,
  };
}

export function requireStudioAccount(event, action, callback) {
  if (event?.preventDefault) event.preventDefault();
  if (!builderState.currentSchema) {
    callback?.();
    return;
  }
  if (hasStudioAccountSession()) {
    callback?.();
    return;
  }
  openStudioAuthGate(action);
}

export function studioInspector() {
  const selectedSection = selectedStudioSection();
  const title = selectedSection ? `${selectedSection.type} inspector` : "Page inspector";
  return `<div class="editor-group studio-inspector">
    <div class="studio-inspector-head">
      <div>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(selectedSection ? "Edit the selected section from the canvas." : "Select a section on the canvas to edit it directly.")}</p>
      </div>
      <button id="toggleAdvancedInspector" class="small-button" type="button">${builderState.advancedInspectorOpen ? "Hide advanced" : "Advanced controls"}</button>
    </div>
    ${selectedSection ? sectionQuickInspector(selectedSection) : pageQuickInspector()}
  </div>`;
}

export function sectionQuickInspector(section) {
  const page = selectedPage();
  const index = page.sections.findIndex((item) => (item.id || item.type) === (section.id || section.type));
  const basePath = `pages.${pageIndex()}.sections.${index}`;
  const editable = section.editable || {};
  if (section.type === "Hero") {
    return `<div class="studio-inspector-grid">
      ${textareaField("Headline", `${basePath}.editable.headline`, editable.headline || "", "data-section-path")}
      ${textareaField("Subtitle", `${basePath}.editable.subtitle`, editable.subtitle || "", "data-section-path")}
      ${inputField("Primary CTA", `${basePath}.editable.primary_button`, editable.primary_button || "", "data-section-path")}
      ${inputField("Image URL", `${basePath}.editable.image_url`, editable.image_url || "", "data-section-path")}
      ${selectField("Layout", `${basePath}.settings.layout`, section.settings?.layout || "split_showcase", ["split_showcase", "image_left", "centered_hero", "minimal_statement"], "data-section-path")}
    </div>`;
  }
  if (section.type === "ProductGrid" || section.type === "ServiceList") {
    return `<div class="studio-inspector-grid">
      ${inputField("Title", `${basePath}.editable.title`, editable.title || editable.headline || "", "data-section-path")}
      ${textareaField("Intro text", `${basePath}.editable.text`, editable.text || editable.subtitle || "", "data-section-path")}
      ${selectField("Columns", `${basePath}.settings.columns`, section.settings?.columns || 3, ["2", "3", "4"], "data-section-path")}
      ${selectField("Card density", `${basePath}.settings.card_density`, section.settings?.card_density || "comfortable", ["compact", "comfortable", "airy"], "data-section-path")}
      <button class="small-button" type="button" data-studio-add-product>Add product</button>
    </div>`;
  }
  if (section.type === "Contact") {
    return `<div class="studio-inspector-grid">
      ${inputField("Title", `${basePath}.editable.title`, editable.title || "", "data-section-path")}
      ${textareaField("Text", `${basePath}.editable.text`, editable.text || "", "data-section-path")}
      ${inputField("Email", "contact.email", builderState.currentSchema.contact?.email || "")}
      ${inputField("Phone", "contact.phone", builderState.currentSchema.contact?.phone || "")}
      ${inputField("WhatsApp", "contact.whatsapp", builderState.currentSchema.contact?.whatsapp || "")}
    </div>`;
  }
  return `<div class="studio-inspector-grid">
    ${inputField("Title", `${basePath}.editable.title`, editable.title || editable.headline || "", "data-section-path")}
    ${textareaField("Text", `${basePath}.editable.text`, editable.text || editable.subtitle || "", "data-section-path")}
    ${selectField("Spacing", `${basePath}.settings.spacing`, section.settings?.spacing || "balanced", ["compact", "balanced", "spacious"], "data-section-path")}
  </div>`;
}

export function selectedStudioSection() {
  const page = selectedPage();
  return arrayValue(page?.sections).find((section) => (section.id || section.type) === builderState.selectedStudioSectionId) || null;
}

export function handleStudioSelectionAction(action) {
  const page = selectedPage();
  const index = arrayValue(page.sections).findIndex((section) => (section.id || section.type) === builderState.selectedStudioSectionId);
  if (index < 0) return;
  if (action === "edit") {
    renderEditor();
    selectStudioSection(builderState.selectedStudioSectionId);
    return;
  }
  if (action === "up" || action === "down") {
    const next = action === "up" ? index - 1 : index + 1;
    if (next >= 0 && next < page.sections.length) {
      [page.sections[index], page.sections[next]] = [page.sections[next], page.sections[index]];
      resequence(page.sections);
    }
  } else if (action === "duplicate") {
    const copy = structuredClone(page.sections[index]);
    copy.id = `${slugify(copy.type)}_${Date.now()}`;
    copy.order = index + 2;
    page.sections.splice(index + 1, 0, copy);
    builderState.selectedStudioSectionId = copy.id;
    resequence(page.sections);
  } else if (action === "delete") {
    page.sections.splice(index, 1);
    builderState.selectedStudioSectionId = "";
    studioSelectionToolbar.hidden = true;
    resequence(page.sections);
  } else if (action === "luma") {
    adjustGeneratedDraftWithLuma();
    return;
  }
  renderEditor();
  renderPreview();
  if (builderState.selectedStudioSectionId) window.setTimeout(() => selectStudioSection(builderState.selectedStudioSectionId), 50);
}

export function renderStudioProgress() {
  if (!studioProgressList) {
    renderStudioLyraInsights();
    return;
  }
  if (!builderState.currentSchema) {
    studioProgressList.innerHTML = studioProgressItems([
      ["pending", "Home page"],
      ["pending", "Brand system"],
      ["pending", "Online shop"],
      ["pending", "Contact page"],
    ]);
    renderStudioLyraInsights();
    return;
  }
  const pages = arrayValue(builderState.currentSchema.pages);
  const sections = pages.flatMap((page) => arrayValue(page.sections));
  const catalogItems = arrayValue(builderState.currentSchema.catalog_items || builderState.currentSchema.products_services);
  const items = [
    [pages.some((page) => page.page_key === "home") || sections.some((section) => section.type === "Hero") ? "done" : "active", "Home page"],
    [builderState.currentSchema.brand?.primaryColor || builderState.currentSchema.theme?.colors?.primary ? "done" : "active", "Brand system"],
    [catalogItems.length || sections.some((section) => /ProductGrid|ServiceList/.test(section.type)) ? "done" : "active", "Online shop"],
    [sections.some((section) => section.type === "Contact") || builderState.currentSchema.contact?.email || builderState.currentSchema.contact?.phone ? "done" : "pending", "Contact page"],
  ];
  studioProgressList.innerHTML = studioProgressItems(items);
  renderStudioLyraInsights();
}

export function setStudioProgressPhase(phase) {
  if (!studioProgressList) {
    renderStudioLyraInsights();
    return;
  }
  const steps = [
    ["understanding", "Understanding business"],
    ["brand", "Building brand kit"],
    ["homepage", "Creating homepage"],
    ["shop", "Creating shop"],
    ["mobile", "Optimizing mobile"],
    ["ready", "Ready"],
  ];
  const activeIndex = Math.max(0, steps.findIndex(([key]) => key === phase));
  studioProgressList.innerHTML = studioProgressItems(steps.map(([key, label], index) => [
    phase === "ready" || index < activeIndex ? "done" : index === activeIndex ? "active" : "pending",
    label,
  ]));
  renderStudioLyraInsights();
}

export function studioProgressItems(items) {
  const icon = { done: "<span></span>", active: "<i></i>", pending: "<em></em>" };
  return items.map(([state, label]) => `<div data-progress-state="${escapeAttribute(state)}">${icon[state] || icon.pending}<strong>${escapeHtml(label)}</strong></div>`).join("");
}

export function renderStudioLyraInsights() {
  if (studioSuggestedList) studioSuggestedList.innerHTML = studioInsightItems(studioSuggestedImprovements());
  if (studioRecentList) studioRecentList.innerHTML = studioInsightItems(studioRecentChanges());
}

export function studioInsightItems(items) {
  const cleaned = arrayValue(items).map((item) => String(item || "").trim()).filter(Boolean).slice(0, 4);
  const fallback = ["Sin cambios recientes."];
  return (cleaned.length ? cleaned : fallback).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

export function studioSuggestedImprovements() {
  if (!builderState.currentSchema) {
    return [
      "Elegir una plantilla base.",
      "Completar marca y productos.",
      "Generar el primer borrador.",
    ];
  }
  const pages = arrayValue(builderState.currentSchema.pages);
  const sections = pages.flatMap((page) => arrayValue(page.sections));
  const catalogItems = arrayValue(builderState.currentSchema.catalog_items || builderState.currentSchema.products_services);
  const suggestions = [];
  if (!builderState.currentSchema.brand?.logoUrl && !builderState.currentSchema.brand?.logo_url) suggestions.push("Subir logo o confirmar identidad visual.");
  if (!catalogItems.length && !sections.some((section) => /ProductGrid|ServiceList/.test(section.type))) suggestions.push("Agregar productos o servicios editables.");
  if (!sections.some((section) => section.type === "Contact") && !builderState.currentSchema.contact?.email && !builderState.currentSchema.contact?.phone) suggestions.push("Completar contacto visible para clientes.");
  if (!sections.some((section) => /Testimonials|Gallery|Proof|Trust/i.test(section.type))) suggestions.push("Agregar prueba visual o testimonios.");
  if (builderState.selectedStudioSectionId) suggestions.unshift("Pulir la sección seleccionada con Lyra.");
  if (!suggestions.length) {
    suggestions.push("Revisar versión móvil antes de publicar.");
    suggestions.push("Guardar cambios y enviar a revisión.");
    suggestions.push("Probar CTA principal desde el preview.");
  }
  return suggestions;
}

export function studioRecentChanges() {
  if (!builderState.currentSchema) return ["Sin cambios recientes."];
  const changes = [];
  arrayValue(builderState.currentSchema.revision_history).slice(-3).reverse().forEach((item) => {
    const request = cleanShortText(item.request || item.message || "", 88);
    if (request) changes.push(`Ajuste aplicado: ${request}`);
  });
  arrayValue(builderState.currentSchema.design_review?.improvements).slice(-2).forEach((item) => {
    const mapped = {
      "Strengthened hero headline": "Titular principal reforzado.",
      "Clarified primary CTA": "CTA principal aclarado.",
    }[item] || item;
    if (mapped) changes.push(mapped);
  });
  const templateName = builderState.currentSchema.selected_template?.name || builderState.currentSchema.active_template?.name || localizedTemplateName(templatePreviewMeta(builderState.currentSchema.layout_mode?.template_id || ""));
  if (templateName) changes.push(`Base activa: ${templateName}.`);
  if (!changes.length) changes.push("Borrador generado y listo para revisar.");
  return changes;
}

export function addStudioSection(type = "FeatureBand") {
  if (!builderState.currentSchema) return;
  const page = builderState.currentSchema.pages.find((item) => item.page_key === builderState.selectedPageKey) || builderState.currentSchema.pages[0];
  if (!page) return;
  page.sections = arrayValue(page.sections);
  page.sections.push(createSectionByType(type, page.sections.length + 1));
  builderState.currentSchema = prepareWebsiteConfig(builderState.currentSchema, { brand: builderState.currentSchema.brand || builderState.guidedState.brand || {} }, null);
  builderState.currentCatalogItems = catalogItemsFromSchema(builderState.currentSchema);
  renderEditor();
  renderPreview();
}

export function createSectionByType(type, order) {
  const base = {
    id: `${slugify(type)}_${Date.now()}`,
    type,
    order,
    editable: {},
    settings: { spacing: "balanced", container_width: "standard", card_density: "comfortable" },
  };
  if (type === "ProductGrid") {
    base.editable = { title: "Productos destacados", text: "Una selección editable del catálogo.", images: [] };
    base.settings = { ...base.settings, layout: "featured", columns: 3 };
  } else if (type === "Hero") {
    base.editable = {
      headline: builderState.currentSchema?.business?.name || "Nueva propuesta principal",
      subtitle: builderState.currentSchema?.business?.description || "Explica en una frase clara por qué vale la pena seguir.",
      primary_button: "Ver productos",
      secondary_button: "Contactar",
      image_url: "",
      images: [],
    };
    base.settings = { ...base.settings, layout: "split_showcase", spacing: "spacious", heading_size: "large" };
  } else if (type === "Gallery") {
    base.editable = { title: "Galería", images: [] };
  } else if (type === "Testimonials") {
    base.editable = { title: "Clientes que confían", text: "Agrega pruebas, comentarios o resultados reales." };
  } else if (type === "Contact") {
    base.editable = { title: "Hablemos", text: "Escríbenos para más información." };
  } else {
    base.editable = { title: "Nueva sección", text: "Edita este bloque para explicar una razón clara para comprar o contactar." };
  }
  return base;
}

export function selectStudioSection(sectionId) {
  builderState.selectedStudioSectionId = sectionId || "";
  previewFrame.querySelectorAll("[data-studio-section].is-selected").forEach((element) => element.classList.remove("is-selected"));
  const element = previewFrame.querySelector(`[data-studio-section="${cssEscape(sectionId)}"]`);
  element?.classList.add("is-selected");
  if (studioSelectionToolbar) studioSelectionToolbar.hidden = !element;
  element?.scrollIntoView({ block: "center", behavior: "smooth" });
  const editorSection = editorMount.querySelector(`[data-editor-section="${cssEscape(sectionId)}"]`);
  editorSection?.scrollIntoView({ block: "start", behavior: "smooth" });
  editorSection?.classList.add("editor-focus-flash");
  window.setTimeout(() => editorSection?.classList.remove("editor-focus-flash"), 900);
  const type = element?.dataset.studioSectionType || "section";
  if (studioLumaMessage) {
    studioLumaMessage.textContent = langText({
      en: `I selected the ${type}. Tell me what to improve, or adjust its controls on the left.`,
      es: `Seleccioné ${type}. Dime qué quieres mejorar o ajusta sus controles a la izquierda.`,
      fr: `J'ai sélectionné ${type}. Dites-moi quoi améliorer ou ajustez ses contrôles à gauche.`,
      pt: `Selecionei ${type}. Diga o que quer melhorar ou ajuste os controles à esquerda.`,
    });
  }
  setAssistantState("listening");
  renderEditor();
}

export function brandKitEditor(brandInput, score) {
  const brand = normalizeBrand(brandInput);
  const swatches = brandPalette(brand)
    .map((color) => `<span class="brand-swatch" style="--swatch:${escapeAttribute(color)}" title="${escapeAttribute(color)}"></span>`)
    .join("");
  const total = score?.total ? `${score.total}/100` : "Not scored yet";
  return `<div class="editor-group brand-kit-editor">
    <h3>Brand Kit</h3>
    <div class="brand-kit-head">
      ${brand.logoUrl ? `<img src="${escapeAttribute(brand.logoUrl)}" alt="">` : ""}
      <div>
        <strong>${escapeHtml(brand.styleDirection)}</strong>
        <span>Design score: ${escapeHtml(total)}</span>
      </div>
    </div>
    <div class="brand-kit-swatches">${swatches}</div>
    <div class="brand-kit-meta">
      <span>${escapeHtml(fontPairingLabel(brand.fontPairing))}</span>
      <span>${escapeHtml(brand.borderRadius)}</span>
      <button class="brand-kit-button" type="button">Button preview</button>
    </div>
  </div>`;
}

export function renderWebsite(schema, pageKey) {
  return renderWebsiteMarkup(schema, pageKey, {
    selectedLanguage: builderState.selectedLanguage,
    isClientPreviewMode: Boolean(document.body?.classList?.contains("client-preview-mode")),
  });
}

export function sectionEditor(section, index) {
  const editable = section.editable || {};
  const basePath = `pages.${pageIndex()}.sections.${index}`;
  const settings = section.settings || {};
  return `<div class="editor-group" data-editor-section="${escapeAttribute(section.id || section.type)}">
    <h4>${index + 1}. ${section.type}</h4>
    <div class="control-grid">
      ${selectField("Layout", `${basePath}.settings.layout`, settings.layout || "", [
        "image_right",
        "image_left",
        "centered_hero",
        "compact_catalog",
        "grid",
        "masonry",
        "boutique_grid",
        "simple",
        "trust_first",
      ])}
      ${selectField("Heading size", `${basePath}.settings.heading_size`, settings.heading_size || "medium", ["small", "medium", "large", "huge"])}
      ${selectField("Spacing", `${basePath}.settings.spacing`, settings.spacing || "balanced", ["compact", "balanced", "spacious"])}
      ${inputField("Columns", `${basePath}.settings.columns`, settings.columns || 3, "data-section-path")}
      ${inputField("Background", `${basePath}.settings.background`, settings.background || "", "data-section-path")}
      ${inputField("Text color", `${basePath}.settings.text_color`, settings.text_color || "", "data-section-path")}
    </div>
    ${Object.entries(editable)
      .map(([key, value]) =>
        typeof value === "string"
          ? textareaField(key, `${basePath}.editable.${key}`, value, "data-section-path")
          : "",
      )
      .join("")}
    <div class="row-actions">
      <button class="small-button" data-remove-section="${escapeAttribute(section.id)}" type="button">Remove section</button>
    </div>
  </div>`;
}

export async function uploadAssetOrFallback(file, assetType, label) {
  try {
    const uploaded = await uploadAssetFile(file, assetType, label);
    if (uploaded?.url) return uploaded.url;
  } catch (error) {
    console.warn("Asset upload failed, using development fallback.", error);
    if (storageStatus) {
      storageStatus.textContent = "Asset storage unavailable. Using development image fallback.";
    }
  }
  if (assetType === "video") return "";
  return fileToOptimizedDataUrl(file, assetType);
}

export async function uploadAssetFile(file, assetType, label) {
  if (assetType === "video" && file.size > 12 * 1024 * 1024) {
    throw new Error("Video file is too large for direct upload.");
  }
  const dataUrl = await fileToOptimizedDataUrl(file, assetType);
  const response = await fetch(ASSET_UPLOAD_URL, {
    method: "POST",
    headers: adminHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      businessId: builderState.currentBusinessId,
      siteId: builderState.currentSiteId,
      assetType,
      fileName: file.name || `${assetType}.png`,
      contentType: file.type || "image/png",
      dataUrl,
      label,
    }),
  });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || `Asset upload failed with ${response.status}`);
  }
  const result = await response.json();
  if (storageStatus) {
    storageStatus.textContent = "Asset uploaded to cloud storage.";
  }
  return result;
}

export function setPreviewButton(activeId) {
  ["desktopButton", "mobileButton"].forEach((id) => {
    document.querySelector(`#${id}`).classList.toggle("active", id === activeId);
  });
}

export function normalizeEditedValue(path, value) {
  if (!path.startsWith("theme.colors.") && !path.startsWith("brand.") && !path.endsWith(".settings.background") && !path.endsWith(".settings.text_color")) {
    return value;
  }
  return resolveColor(value, value);
}
