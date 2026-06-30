const SUPPORTED_LANGUAGES = ["en", "es", "fr", "pt"];
const PUBLIC_BACKEND_URL = resolvePublicApiBaseUrl();
const PUBLIC_BUILD_ID = "20260613-0937af2";

const LANDING_COPY = {
  en: {
    title: "Launch a professional website or store from one conversation",
    kicker: "AI website and store builder",
    subtitle:
      "Show LYRA your business idea, brand, products, services and goals. LYRA chooses the right structure, prepares copy and catalog details, then hands you an editable draft.",
    start: "Start with LYRA",
    viewExamples: "View examples",
    how: "View examples",
    language: "Language",
    trustTemplates: "Pro templates",
    trustAi: "AI guided brief",
    trustVoice: "Chat or voice",
    trustAssets: "Logo and photos optional",
    trustEditable: "Fully editable",
    guideKicker: "Your AI guide",
    guideTitle: "LYRA collects the details and builds the first draft.",
    guideText: "Answer naturally. LYRA detects what is missing, suggests the best template and keeps the final site editable.",
    guideStep1: "Understands your business",
    guideStep2: "Chooses the right template",
    guideStep3: "Drafts pages, sections and catalog",
    examplesKicker: "What LYRA can build",
    examplesTitle: "Real starting points, adapted by AI to each business.",
    examplesText: "These are not fixed forms. They are structured bases LYRA can choose, rewrite and personalize around the client's industry, tone, catalog and goals.",
    sampleMarketplace: "Marketplace store",
    sampleMarketplaceText: "Catalog, promos, search and product categories.",
    samplePremium: "Premium product",
    samplePremiumText: "Editorial product storytelling and clean conversion.",
    sampleRestaurant: "Restaurant and menu",
    sampleRestaurantText: "Menu sections, specials and local ordering flow.",
    cardMarketplaceTitle: "Mega catalog store",
    cardMarketplaceText: "Large catalog, departments, offers and fast product discovery.",
    cardPremiumTitle: "Premium product launch",
    cardPremiumText: "Focused product story, strong visuals and high-end presentation.",
    cardIndustrialTitle: "Industrial supplier",
    cardIndustrialText: "Quote-first catalog, capabilities, specs and procurement flow.",
    cardServicesTitle: "Service business",
    cardServicesText: "Trust, packages, service areas and quote requests.",
    cardBookingTitle: "Appointment booking",
    cardBookingText: "Services, schedules, staff highlights and booking CTAs.",
    cardCompanyTitle: "Company website",
    cardCompanyText: "Authority, offerings, proof and lead capture without a store.",
    tagMarketplace: "Marketplace",
    tagPremium: "Premium",
    tagB2B: "B2B",
    tagServices: "Services",
    tagBooking: "Booking",
    tagCompany: "Company",
    useThisDirection: "Use this direction",
    bubbleTitle: "Hi, I'm LYRA",
    bubbleText: "I will ask a few simple questions and prepare your first website draft.",
    bubbleLines: [
      "Tell me what you want to build, and I will shape the first draft.",
      "You can type or use voice. I will guide the process.",
      "When we have enough details, I will generate your editable website.",
    ],
    howTitle: "A Faster Way To Start Online",
    step1Title: "Talk, don't build",
    step1Text: "Describe your business naturally. LYRA turns your answers into a website brief.",
    step2Title: "AI-generated design",
    step2Text: "Get layout, copy, colors, sections, and catalog suggestions.",
    step3Title: "Editable before publishing",
    step3Text: "Review and adjust everything before your site goes live.",
    feedbackOpen: "Feedback",
    feedbackTitle: "Help us improve LYRA",
    feedbackText: "After testing, tell us what felt confusing, missing, slow, or useful.",
    feedbackName: "Name",
    feedbackEmail: "Email",
    feedbackRating: "Overall impression",
    feedbackStage: "What did you test?",
    feedbackMessage: "What should we improve?",
    feedbackSubmit: "Send feedback",
    feedbackClose: "Close",
    feedbackNamePlaceholder: "Your name",
    feedbackEmailPlaceholder: "you@email.com",
    feedbackMessagePlaceholder: "Write anything you noticed...",
    feedbackSent: "Thanks. Your feedback was sent.",
    feedbackLocal: "Saved locally for now. The server did not confirm receipt.",
    feedbackSending: "Sending feedback...",
  },
  es: {
    title: "Lanza una pagina o tienda profesional desde una conversacion",
    kicker: "Constructor de paginas y tiendas con IA",
    subtitle:
      "Muestrale a LYRA tu idea de negocio, marca, productos, servicios y objetivos. LYRA elige la estructura correcta, prepara textos y catalogo, y te entrega un borrador editable.",
    start: "Iniciar con LYRA",
    viewExamples: "Ver ejemplos",
    how: "Ver ejemplos",
    language: "Idioma",
    trustTemplates: "Plantillas pro",
    trustAi: "Brief guiado por IA",
    trustVoice: "Chat o voz",
    trustAssets: "Logo y fotos opcionales",
    trustEditable: "Totalmente editable",
    guideKicker: "Tu guia con IA",
    guideTitle: "LYRA recopila los detalles y construye el primer borrador.",
    guideText: "Responde de forma natural. LYRA detecta lo que falta, sugiere la mejor plantilla y mantiene la pagina editable.",
    guideStep1: "Entiende tu negocio",
    guideStep2: "Elige la plantilla correcta",
    guideStep3: "Crea paginas, secciones y catalogo",
    examplesKicker: "Lo que LYRA puede crear",
    examplesTitle: "Puntos de partida reales, adaptados por IA a cada negocio.",
    examplesText: "No son formularios fijos. Son bases estructuradas que LYRA puede elegir, reescribir y personalizar segun industria, tono, catalogo y objetivos.",
    sampleMarketplace: "Tienda marketplace",
    sampleMarketplaceText: "Catalogo, promos, busqueda y categorias.",
    samplePremium: "Producto premium",
    samplePremiumText: "Historia editorial del producto y conversion limpia.",
    sampleRestaurant: "Restaurante y menu",
    sampleRestaurantText: "Secciones de menu, especiales y flujo local.",
    cardMarketplaceTitle: "Tienda de mega catalogo",
    cardMarketplaceText: "Catalogo grande, departamentos, ofertas y descubrimiento rapido.",
    cardPremiumTitle: "Lanzamiento premium de producto",
    cardPremiumText: "Historia de producto, visuales fuertes y presentacion de alto nivel.",
    cardIndustrialTitle: "Proveedor industrial",
    cardIndustrialText: "Catalogo para cotizar, capacidades, fichas y flujo de compras.",
    cardServicesTitle: "Negocio de servicios",
    cardServicesText: "Confianza, paquetes, zonas de servicio y solicitudes de cotizacion.",
    cardBookingTitle: "Reservas y citas",
    cardBookingText: "Servicios, horarios, equipo y botones para reservar.",
    cardCompanyTitle: "Pagina empresarial",
    cardCompanyText: "Autoridad, servicios, pruebas y captacion sin tienda.",
    tagMarketplace: "Marketplace",
    tagPremium: "Premium",
    tagB2B: "B2B",
    tagServices: "Servicios",
    tagBooking: "Reservas",
    tagCompany: "Empresa",
    useThisDirection: "Usar esta direccion",
    bubbleTitle: "Hola, soy LYRA",
    bubbleText: "Te haré unas preguntas simples y prepararé tu primer borrador web.",
    bubbleLines: [
      "Dime qué quieres crear y preparo la primera versión.",
      "Puedes escribir o usar voz. Yo te voy guiando paso a paso.",
      "Cuando tenga lo necesario, generaré tu página editable.",
    ],
    howTitle: "Una Forma Más Rápida De Empezar Online",
    step1Title: "Habla, no construyas",
    step1Text: "Describe tu negocio de forma natural. LYRA convierte tus respuestas en una estructura para tu página.",
    step2Title: "Diseño generado con IA",
    step2Text: "Obtén diseño, textos, colores, secciones y sugerencias de catálogo.",
    step3Title: "Editable antes de publicar",
    step3Text: "Revisa y ajusta todo antes de publicar.",
    feedbackOpen: "Feedback",
    feedbackTitle: "Ayúdanos a mejorar LYRA",
    feedbackText: "Después de probar, dinos qué fue confuso, qué faltó, qué tardó o qué te gustó.",
    feedbackName: "Nombre",
    feedbackEmail: "Correo",
    feedbackRating: "Impresión general",
    feedbackStage: "¿Qué probaste?",
    feedbackMessage: "¿Qué deberíamos mejorar?",
    feedbackSubmit: "Enviar feedback",
    feedbackClose: "Cerrar",
    feedbackNamePlaceholder: "Tu nombre",
    feedbackEmailPlaceholder: "tu@email.com",
    feedbackMessagePlaceholder: "Escribe cualquier cosa que notaste...",
    feedbackSent: "Gracias. Tu feedback fue enviado.",
    feedbackLocal: "Guardado localmente por ahora. El servidor no confirmó recepción.",
    feedbackSending: "Enviando feedback...",
  },
  fr: {
    title: "Lancez un site ou une boutique professionnelle depuis une conversation",
    kicker: "Créateur de sites et boutiques IA",
    subtitle:
      "Expliquez à LYRA votre idée, votre marque, vos produits, vos services et vos objectifs. LYRA choisit la bonne structure, prépare les textes et le catalogue, puis livre un brouillon modifiable.",
    start: "Commencer avec LYRA",
    viewExamples: "Voir des exemples",
    how: "Voir des exemples",
    language: "Langue",
    trustTemplates: "Templates pro",
    trustAi: "Brief guidé par IA",
    trustVoice: "Chat ou voix",
    trustAssets: "Logo et photos optionnels",
    trustEditable: "Entièrement modifiable",
    guideKicker: "Votre guide IA",
    guideTitle: "LYRA collecte les détails et construit le premier brouillon.",
    guideText: "Répondez naturellement. LYRA détecte ce qui manque, suggère le meilleur template et garde le site modifiable.",
    guideStep1: "Comprend votre activité",
    guideStep2: "Choisit le bon template",
    guideStep3: "Crée pages, sections et catalogue",
    examplesKicker: "Ce que LYRA peut créer",
    examplesTitle: "Des bases réelles, adaptées par IA à chaque activité.",
    examplesText: "Ce ne sont pas des formulaires fixes. Ce sont des structures que LYRA peut choisir, réécrire et personnaliser selon l'industrie, le ton, le catalogue et les objectifs.",
    sampleMarketplace: "Boutique marketplace",
    sampleMarketplaceText: "Catalogue, promotions, recherche et catégories.",
    samplePremium: "Produit premium",
    samplePremiumText: "Storytelling produit éditorial et conversion claire.",
    sampleRestaurant: "Restaurant et menu",
    sampleRestaurantText: "Sections de menu, offres et parcours local.",
    cardMarketplaceTitle: "Grand catalogue ecommerce",
    cardMarketplaceText: "Grand catalogue, rayons, offres et découverte rapide.",
    cardPremiumTitle: "Lancement produit premium",
    cardPremiumText: "Histoire produit, visuels forts et présentation haut de gamme.",
    cardIndustrialTitle: "Fournisseur industriel",
    cardIndustrialText: "Catalogue orienté devis, capacités, fiches et achat B2B.",
    cardServicesTitle: "Entreprise de services",
    cardServicesText: "Confiance, forfaits, zones de service et demandes de devis.",
    cardBookingTitle: "Réservation",
    cardBookingText: "Services, horaires, équipe et appels à réserver.",
    cardCompanyTitle: "Site d'entreprise",
    cardCompanyText: "Autorité, offres, preuves et capture de leads sans boutique.",
    tagMarketplace: "Marketplace",
    tagPremium: "Premium",
    tagB2B: "B2B",
    tagServices: "Services",
    tagBooking: "Réservation",
    tagCompany: "Entreprise",
    useThisDirection: "Utiliser cette direction",
    bubbleTitle: "Bonjour, je suis LYRA",
    bubbleText: "Je pose quelques questions simples et prépare votre premier brouillon.",
    bubbleLines: [
      "Dites-moi ce que vous voulez créer et je prépare le premier brouillon.",
      "Vous pouvez écrire ou utiliser la voix. Je vous guide étape par étape.",
      "Quand les détails sont prêts, je génère votre site modifiable.",
    ],
    howTitle: "Une Façon Plus Rapide De Démarrer",
    step1Title: "Parlez, ne construisez pas",
    step1Text: "Décrivez naturellement votre activité. LYRA transforme vos réponses en brief de site.",
    step2Title: "Design généré par IA",
    step2Text: "Obtenez mise en page, textes, couleurs, sections et suggestions de catalogue.",
    step3Title: "Modifiable avant publication",
    step3Text: "Relisez et ajustez tout avant la mise en ligne.",
    feedbackOpen: "Feedback",
    feedbackTitle: "Aidez-nous à améliorer LYRA",
    feedbackText: "Après le test, dites-nous ce qui était confus, manquant, lent ou utile.",
    feedbackName: "Nom",
    feedbackEmail: "Email",
    feedbackRating: "Impression générale",
    feedbackStage: "Qu'avez-vous testé ?",
    feedbackMessage: "Que devons-nous améliorer ?",
    feedbackSubmit: "Envoyer",
    feedbackClose: "Fermer",
    feedbackNamePlaceholder: "Votre nom",
    feedbackEmailPlaceholder: "vous@email.com",
    feedbackMessagePlaceholder: "Écrivez ce que vous avez remarqué...",
    feedbackSent: "Merci. Votre feedback a été envoyé.",
    feedbackLocal: "Enregistré localement pour le moment. Le serveur n'a pas confirmé.",
    feedbackSending: "Envoi...",
  },
  pt: {
    title: "Lance um site ou loja profissional a partir de uma conversa",
    kicker: "Criador de sites e lojas com IA",
    subtitle:
      "Mostre para a LYRA sua ideia, marca, produtos, serviços e objetivos. A LYRA escolhe a estrutura certa, prepara textos e catálogo, e entrega um rascunho editável.",
    start: "Começar com LYRA",
    viewExamples: "Ver exemplos",
    how: "Ver exemplos",
    language: "Idioma",
    trustTemplates: "Templates pro",
    trustAi: "Brief guiado por IA",
    trustVoice: "Chat ou voz",
    trustAssets: "Logo e fotos opcionais",
    trustEditable: "Totalmente editável",
    guideKicker: "Seu guia com IA",
    guideTitle: "A LYRA coleta os detalhes e cria o primeiro rascunho.",
    guideText: "Responda naturalmente. A LYRA detecta o que falta, sugere o melhor template e mantém o site editável.",
    guideStep1: "Entende seu negócio",
    guideStep2: "Escolhe o template certo",
    guideStep3: "Cria páginas, seções e catálogo",
    examplesKicker: "O que a LYRA pode criar",
    examplesTitle: "Pontos de partida reais, adaptados por IA a cada negócio.",
    examplesText: "Não são formulários fixos. São bases estruturadas que a LYRA pode escolher, reescrever e personalizar conforme indústria, tom, catálogo e objetivos.",
    sampleMarketplace: "Loja marketplace",
    sampleMarketplaceText: "Catálogo, promoções, busca e categorias.",
    samplePremium: "Produto premium",
    samplePremiumText: "História editorial do produto e conversão limpa.",
    sampleRestaurant: "Restaurante e menu",
    sampleRestaurantText: "Seções de menu, especiais e fluxo local.",
    cardMarketplaceTitle: "Loja de mega catalogo",
    cardMarketplaceText: "Catálogo grande, departamentos, ofertas e descoberta rápida.",
    cardPremiumTitle: "Lancamento premium de produto",
    cardPremiumText: "História do produto, visuais fortes e apresentação premium.",
    cardIndustrialTitle: "Fornecedor industrial",
    cardIndustrialText: "Catálogo para cotação, capacidades, fichas e compra B2B.",
    cardServicesTitle: "Negócio de serviços",
    cardServicesText: "Confiança, pacotes, áreas atendidas e pedidos de orçamento.",
    cardBookingTitle: "Agendamento",
    cardBookingText: "Serviços, horários, equipe e botões para reservar.",
    cardCompanyTitle: "Site empresarial",
    cardCompanyText: "Autoridade, ofertas, provas e captação sem loja.",
    tagMarketplace: "Marketplace",
    tagPremium: "Premium",
    tagB2B: "B2B",
    tagServices: "Serviços",
    tagBooking: "Agendamento",
    tagCompany: "Empresa",
    useThisDirection: "Usar esta direção",
    bubbleTitle: "Olá, eu sou a LYRA",
    bubbleText: "Vou fazer algumas perguntas simples e preparar seu primeiro rascunho.",
    bubbleLines: [
      "Conte o que você quer criar e eu preparo o primeiro rascunho.",
      "Você pode digitar ou usar voz. Eu guio tudo passo a passo.",
      "Quando tiver detalhes suficientes, gero seu site editável.",
    ],
    howTitle: "Uma Forma Mais Rápida De Começar",
    step1Title: "Converse, não construa",
    step1Text: "Descreva seu negócio naturalmente. LYRA transforma suas respostas em um briefing de site.",
    step2Title: "Design gerado por IA",
    step2Text: "Receba layout, textos, cores, seções e sugestões de catálogo.",
    step3Title: "Editável antes de publicar",
    step3Text: "Revise e ajuste tudo antes do site entrar no ar.",
    feedbackOpen: "Feedback",
    feedbackTitle: "Ajude-nos a melhorar a LYRA",
    feedbackText: "Depois de testar, diga o que foi confuso, faltou, demorou ou ajudou.",
    feedbackName: "Nome",
    feedbackEmail: "Email",
    feedbackRating: "Impressão geral",
    feedbackStage: "O que você testou?",
    feedbackMessage: "O que devemos melhorar?",
    feedbackSubmit: "Enviar feedback",
    feedbackClose: "Fechar",
    feedbackNamePlaceholder: "Seu nome",
    feedbackEmailPlaceholder: "voce@email.com",
    feedbackMessagePlaceholder: "Escreva qualquer coisa que percebeu...",
    feedbackSent: "Obrigado. Seu feedback foi enviado.",
    feedbackLocal: "Salvo localmente por enquanto. O servidor não confirmou.",
    feedbackSending: "Enviando feedback...",
  },
};

function resolvePublicApiBaseUrl() {
  if (window.LUMA_API_BASE_URL) return String(window.LUMA_API_BASE_URL).replace(/\/$/, "");
  const saved = localStorage.getItem("lumaApiBaseUrl");
  if (saved) return saved.replace(/\/$/, "");
  if (["localhost", "127.0.0.1"].includes(window.location.hostname)) return "http://127.0.0.1:8010";
  return "https://kreaton-lyra-api.onrender.com";
}

function normalizeBrowserLanguage(input) {
  const normalized = String(input || "en").trim().toLowerCase().split("-")[0];
  return SUPPORTED_LANGUAGES.includes(normalized) ? normalized : "en";
}

function initialLanguage() {
  const params = new URLSearchParams(window.location.search);
  return normalizeBrowserLanguage(
    params.get("lang") || (navigator.languages || [navigator.language || "en"])[0]
  );
}

let selectedLanguage = initialLanguage();
const languageSelect = document.querySelector("#clientLanguage");
const startButton = document.querySelector("#startWithGnuDev");
const manualButton = document.querySelector("#useManualForm");
const chatModal = document.querySelector("#clientChatModal");
const chatFrame = document.querySelector("#clientChatFrame");
const closeChatButton = document.querySelector("#closeClientChat");
const landingAvatarRoot = document.querySelector("#landingAvatarAssistant");
const feedbackButton = document.querySelector("#testerFeedbackButton");
const feedbackPanel = document.querySelector("#testerFeedbackPanel");
const feedbackCloseButton = document.querySelector("#testerFeedbackClose");
const feedbackForm = document.querySelector("#testerFeedbackForm");
const feedbackStatus = document.querySelector("#testerFeedbackStatus");
const lumaGuideButton = document.querySelector("[data-start-luma]");
const templateIntentButtons = document.querySelectorAll("[data-template-intent]");
const landingAvatarManager = window.AvatarStateManager ? new window.AvatarStateManager("idle") : null;
let lumaLineIndex = 0;
let lumaSpeechTimer;
let landingAvatar;

function applyCopy() {
  const copy = LANDING_COPY[selectedLanguage] || LANDING_COPY.en;
  document.documentElement.lang = selectedLanguage;
  document.querySelectorAll("[data-client-i18n]").forEach((item) => {
    item.textContent = copy[item.dataset.clientI18n] || item.textContent;
  });
  document.querySelectorAll("[data-client-i18n-placeholder]").forEach((item) => {
    item.placeholder = copy[item.dataset.clientI18nPlaceholder] || item.placeholder;
  });
  startButton.href = `/client/setup/?lang=${selectedLanguage}&build=${PUBLIC_BUILD_ID}`;
  lumaLineIndex = 0;
  configureLandingAvatar();
  startLandingLumaLoop();
}

languageSelect.value = selectedLanguage;
languageSelect.addEventListener("change", () => {
  selectedLanguage = normalizeBrowserLanguage(languageSelect.value);
  applyCopy();
});

applyCopy();
startLandingLumaLoop();

startButton.addEventListener("click", (event) => {
  event.preventDefault();
  setLandingLumaState("happy");
  goToIntegratedSetup();
});
lumaGuideButton?.addEventListener("click", (event) => {
  event.preventDefault();
  setLandingLumaState("happy");
  goToIntegratedSetup();
});
templateIntentButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setLandingLumaState("thinking");
    goToIntegratedSetup(false, {
      intent: button.dataset.templateIntent || "",
      templateId: button.dataset.templateId || "",
      catalogType: button.dataset.catalogType || "",
      prompt: button.closest(".landing-showcase-card")?.querySelector("strong")?.textContent || "",
    });
  });
});
manualButton?.addEventListener("click", (event) => {
  event.preventDefault();
  goToIntegratedSetup(true);
});

closeChatButton.addEventListener("click", closeLumaChat);
feedbackButton?.addEventListener("click", openTesterFeedback);
feedbackCloseButton?.addEventListener("click", closeTesterFeedback);
feedbackForm?.addEventListener("submit", submitTesterFeedback);
window.addEventListener("message", (event) => {
  if (event.data?.type === "luma-close") closeLumaChat();
  if (event.data?.type === "luma-generated-preview") {
    chatModal.classList.add("preview-open");
    document.body.classList.add("client-preview-open");
  }
});

function openTesterFeedback() {
  if (!feedbackPanel) return;
  feedbackPanel.hidden = false;
  feedbackPanel.querySelector("textarea, input, select")?.focus();
  setLandingLumaState("listening");
}

function closeTesterFeedback() {
  if (!feedbackPanel) return;
  feedbackPanel.hidden = true;
  setLandingLumaState("idle");
}

async function submitTesterFeedback(event) {
  event.preventDefault();
  if (!feedbackForm) return;
  const copy = LANDING_COPY[selectedLanguage] || LANDING_COPY.en;
  const data = new FormData(feedbackForm);
  const feedback = {
    name: String(data.get("name") || "").trim(),
    email: String(data.get("email") || "").trim(),
    rating: String(data.get("rating") || "").trim(),
    stage: String(data.get("stage") || "").trim(),
    message: String(data.get("message") || "").trim(),
    language: selectedLanguage,
    pageUrl: window.location.href,
    createdAt: new Date().toISOString(),
  };
  if (!feedback.message) {
    feedbackStatus.textContent = copy.feedbackMessagePlaceholder;
    return;
  }
  feedbackStatus.textContent = copy.feedbackSending;
  setLandingLumaState("thinking");
  try {
    const response = await fetch(`${PUBLIC_BACKEND_URL}/public/leads`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        customerName: feedback.name || "Tester",
        email: feedback.email,
        phone: "",
        message: [
          "LYRA beta feedback",
          `Rating: ${feedback.rating}`,
          `Stage: ${feedback.stage}`,
          `Language: ${feedback.language}`,
          `URL: ${feedback.pageUrl}`,
          "",
          feedback.message,
        ].join("\n"),
        source: "luma_public_tester_feedback",
      }),
    });
    if (!response.ok) throw new Error(await response.text());
    feedbackStatus.textContent = copy.feedbackSent;
    feedbackForm.reset();
    setLandingLumaState("success");
  } catch {
    const saved = JSON.parse(localStorage.getItem("lumaTesterFeedback") || "[]");
    saved.push(feedback);
    localStorage.setItem("lumaTesterFeedback", JSON.stringify(saved.slice(-20)));
    feedbackStatus.textContent = copy.feedbackLocal;
    setLandingLumaState("alert");
  }
}

function buildSetupUrl(manual = false, intent = {}, embedded = false) {
  const apiQuery = PUBLIC_BACKEND_URL ? `&api=${encodeURIComponent(PUBLIC_BACKEND_URL)}` : "";
  const intentQuery = [
    intent.prompt ? `prompt=${encodeURIComponent(intent.prompt)}` : "",
    intent.templateId ? `templateId=${encodeURIComponent(intent.templateId)}` : "",
    intent.catalogType ? `catalogType=${encodeURIComponent(intent.catalogType)}` : "",
    intent.intent ? `intent=${encodeURIComponent(intent.intent)}` : "",
  ].filter(Boolean).join("&");
  return `/client/setup/?lang=${selectedLanguage}${embedded ? "&embedded=1" : ""}&build=${PUBLIC_BUILD_ID}${apiQuery}${manual ? "&manual=1" : ""}${intentQuery ? `&${intentQuery}` : ""}`;
}

function goToIntegratedSetup(manual = false, intent = {}) {
  window.location.href = buildSetupUrl(manual, intent, false);
}

function openLumaChat(manual = false, intent = {}) {
  const nextSrc = buildSetupUrl(manual, intent, true);
  if (chatFrame.getAttribute("src") !== nextSrc) {
    chatFrame.src = nextSrc;
  }
  chatModal.hidden = false;
  chatModal.classList.remove("preview-open");
  document.body.classList.add("client-chat-open");
  document.body.classList.remove("client-preview-open");
  window.setTimeout(() => setLandingLumaState("thinking"), 420);
}

function closeLumaChat() {
  chatModal.hidden = true;
  chatModal.classList.remove("preview-open");
  document.body.classList.remove("client-chat-open");
  document.body.classList.remove("client-preview-open");
  setLandingLumaState("idle");
  startLandingLumaLoop();
}

function startLandingLumaLoop() {
  window.clearTimeout(lumaSpeechTimer);
  const copy = LANDING_COPY[selectedLanguage] || LANDING_COPY.en;
  const lines = copy.bubbleLines || [];
  if (!landingAvatarManager || !lines.length || document.body.classList.contains("client-chat-open")) return;
  setLandingLumaState("speaking");
  if (landingAvatar?.labels) {
    landingAvatar.labels.speaking = lines[lumaLineIndex % lines.length];
    landingAvatar.setState("speaking");
  }
  lumaLineIndex += 1;
  lumaSpeechTimer = window.setTimeout(() => {
    setLandingLumaState("idle");
    lumaSpeechTimer = window.setTimeout(startLandingLumaLoop, 6200);
  }, 3600);
}

function setLandingLumaState(state) {
  landingAvatarManager?.setState(state, { source: "landing" });
}

function configureLandingAvatar() {
  if (!landingAvatarRoot || !window.AvatarAssistant || !landingAvatarManager) return;
  const copy = LANDING_COPY[selectedLanguage] || LANDING_COPY.en;
  const labels = {
    idle: copy.bubbleText,
    happy: copy.bubbleTitle,
    speaking: copy.bubbleLines?.[0] || copy.bubbleText,
    listening: copy.trustVoice,
    thinking: selectedLanguage === "es" ? "Preparando el chat..." : "Preparing the chat...",
    confused: selectedLanguage === "es" ? "Puedo ayudarte a aclararlo." : "I can help clarify it.",
    success: selectedLanguage === "es" ? "Listo para generar." : "Ready to generate.",
    building: selectedLanguage === "es" ? "Construyendo tu borrador..." : "Building your draft...",
    optimize: selectedLanguage === "es" ? "Optimizando la experiencia..." : "Optimizing the experience...",
    alert: selectedLanguage === "es" ? "Revisemos este detalle." : "Let's review this detail.",
  };
  if (!landingAvatar) {
    landingAvatar = new window.AvatarAssistant({
      root: landingAvatarRoot,
      manager: landingAvatarManager,
      name: "LYRA",
      imageUrl: "/assets/nixie_idle.png",
      imagePaths: {
        idle: "/assets/nixie_idle.png",
        listening: "/assets/nixie_listening.png",
        thinking: "/assets/nixie_thinking.png",
        speaking: "/assets/nixie_speaking.png",
        building: "/assets/nixie_building.png",
        optimize: "/assets/nixie_optimize.png",
        happy: "/assets/nixie_success.png",
        confused: "/assets/nixie_thinking.png",
        success: "/assets/nixie_success.png",
        alert: "/assets/nixie_alert.png",
      },
      labels,
    });
  } else {
    landingAvatar.labels = labels;
    landingAvatar.setState(landingAvatarManager.getState());
  }
}
