const SUPPORTED_LANGUAGES = ["en", "es", "fr", "pt"];
const PUBLIC_BACKEND_URL = "";

const LANDING_COPY = {
  en: {
    title: "Create your online store or business website by talking to AI",
    kicker: "AI guided website setup",
    subtitle:
      "Tell Luma what kind of site you want — marketplace, restaurant menu, booking page, service business, digital products, or online store — and get an editable draft built around your brand.",
    start: "Start with Luma",
    how: "Choose a template",
    language: "Language",
    trustVoice: "Type or use voice",
    trustAssets: "Upload logo and photos",
    trustEditable: "Review and edit before generating",
    bubbleTitle: "Luma is ready",
    bubbleText: "A friendly chat collects the details and turns them into a website draft.",
    howTitle: "A Faster Way To Start Online",
    step1Title: "Talk, don't build",
    step1Text: "Describe your business naturally. Luma turns your answers into a website brief.",
    step2Title: "AI-generated design",
    step2Text: "Get layout, copy, colors, sections, and catalog suggestions.",
    step3Title: "Editable before publishing",
    step3Text: "Review and adjust everything before your site goes live.",
  },
  es: {
    title: "Crea tu tienda online o pagina de negocio hablando con IA",
    kicker: "Configuración guiada con IA",
    subtitle:
      "Dile a Luma que tipo de sitio quieres: marketplace, menu de restaurante, pagina de reservas, servicios, productos digitales o tienda online, y recibe un borrador editable alrededor de tu marca.",
    start: "Empezar con Luma",
    how: "Elegir template",
    language: "Idioma",
    trustVoice: "Escribe o usa voz",
    trustAssets: "Sube logo y fotos",
    trustEditable: "Revisa y edita antes de generar",
    bubbleTitle: "Luma está lista",
    bubbleText: "Un chat amigable recoge los detalles y los convierte en una primera versión web.",
    howTitle: "Una Forma Más Rápida De Empezar Online",
    step1Title: "Habla, no construyas",
    step1Text: "Describe tu negocio de forma natural. Luma convierte tus respuestas en una estructura para tu página.",
    step2Title: "Diseño generado con IA",
    step2Text: "Obtén diseño, textos, colores, secciones y sugerencias de catálogo.",
    step3Title: "Editable antes de publicar",
    step3Text: "Revisa y ajusta todo antes de publicar.",
  },
  fr: {
    title: "Créez votre boutique ou site professionnel en parlant à l'IA",
    kicker: "Configuration guidée par IA",
    subtitle:
      "Dites à Luma quel type de site vous voulez: marketplace, menu restaurant, réservation, services, produits numériques ou boutique, et obtenez un brouillon modifiable autour de votre marque.",
    start: "Commencer avec Luma",
    how: "Choisir un template",
    language: "Langue",
    trustVoice: "Écrire ou utiliser la voix",
    trustAssets: "Ajouter logo et photos",
    trustEditable: "Relire et modifier avant de générer",
    bubbleTitle: "Luma est prête",
    bubbleText: "Un chat convivial collecte les détails et les transforme en brouillon de site.",
    howTitle: "Une Façon Plus Rapide De Démarrer",
    step1Title: "Parlez, ne construisez pas",
    step1Text: "Décrivez naturellement votre activité. Luma transforme vos réponses en brief de site.",
    step2Title: "Design généré par IA",
    step2Text: "Obtenez mise en page, textes, couleurs, sections et suggestions de catalogue.",
    step3Title: "Modifiable avant publication",
    step3Text: "Relisez et ajustez tout avant la mise en ligne.",
  },
  pt: {
    title: "Crie sua loja online ou site de negócio conversando com IA",
    kicker: "Configuração guiada por IA",
    subtitle:
      "Diga à Luma que tipo de site você quer: marketplace, menu de restaurante, agendamentos, serviços, produtos digitais ou loja online, e receba um rascunho editável para sua marca.",
    start: "Começar com Luma",
    how: "Escolher template",
    language: "Idioma",
    trustVoice: "Digite ou use voz",
    trustAssets: "Envie logo e fotos",
    trustEditable: "Revise e edite antes de gerar",
    bubbleTitle: "Luma está pronta",
    bubbleText: "Um chat amigável coleta os detalhes e transforma tudo em um rascunho de site.",
    howTitle: "Uma Forma Mais Rápida De Começar",
    step1Title: "Converse, não construa",
    step1Text: "Descreva seu negócio naturalmente. Luma transforma suas respostas em um briefing de site.",
    step2Title: "Design gerado por IA",
    step2Text: "Receba layout, textos, cores, seções e sugestões de catálogo.",
    step3Title: "Editável antes de publicar",
    step3Text: "Revise e ajuste tudo antes do site entrar no ar.",
  },
};

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
const chooseTemplateButton = document.querySelector("#chooseTemplateButton");
const chatModal = document.querySelector("#clientChatModal");
const chatFrame = document.querySelector("#clientChatFrame");
const closeChatButton = document.querySelector("#closeClientChat");

function applyCopy() {
  const copy = LANDING_COPY[selectedLanguage] || LANDING_COPY.en;
  document.documentElement.lang = selectedLanguage;
  document.querySelectorAll("[data-client-i18n]").forEach((item) => {
    item.textContent = copy[item.dataset.clientI18n] || item.textContent;
  });
  startButton.href = `/client/setup/?lang=${selectedLanguage}`;
}

languageSelect.value = selectedLanguage;
languageSelect.addEventListener("change", () => {
  selectedLanguage = normalizeBrowserLanguage(languageSelect.value);
  applyCopy();
});

applyCopy();

startButton.addEventListener("click", (event) => {
  event.preventDefault();
  openLumaChat();
});
manualButton?.addEventListener("click", (event) => {
  event.preventDefault();
  openLumaChat(true);
});
chooseTemplateButton?.addEventListener("click", (event) => {
  event.preventDefault();
  document.querySelector("#intentCards")?.scrollIntoView({ behavior: "smooth", block: "start" });
});
document.querySelectorAll("[data-intent-prompt]").forEach((card) => {
  card.querySelector("button")?.addEventListener("click", () => {
    openLumaChat(false, {
      prompt: card.dataset.intentPrompt || "",
      templateId: card.dataset.templateId || "",
      catalogType: card.dataset.catalogType || "",
      intent: card.querySelector("strong")?.textContent || "",
    });
  });
});

closeChatButton.addEventListener("click", closeLumaChat);
window.addEventListener("message", (event) => {
  if (event.data?.type === "luma-close") closeLumaChat();
  if (event.data?.type === "luma-generated-preview") {
    chatModal.classList.add("preview-open");
    document.body.classList.add("client-preview-open");
  }
});

function openLumaChat(manual = false, intent = {}) {
  const apiQuery = PUBLIC_BACKEND_URL ? `&api=${encodeURIComponent(PUBLIC_BACKEND_URL)}` : "";
  const intentQuery = [
    intent.prompt ? `prompt=${encodeURIComponent(intent.prompt)}` : "",
    intent.templateId ? `templateId=${encodeURIComponent(intent.templateId)}` : "",
    intent.catalogType ? `catalogType=${encodeURIComponent(intent.catalogType)}` : "",
    intent.intent ? `intent=${encodeURIComponent(intent.intent)}` : "",
  ].filter(Boolean).join("&");
  const nextSrc = `/client/setup/?lang=${selectedLanguage}&embedded=1${apiQuery}${manual ? "&manual=1" : ""}${intentQuery ? `&${intentQuery}` : ""}`;
  if (chatFrame.getAttribute("src") !== nextSrc) {
    chatFrame.src = nextSrc;
  }
  chatModal.hidden = false;
  chatModal.classList.remove("preview-open");
  document.body.classList.add("client-chat-open");
  document.body.classList.remove("client-preview-open");
}

function closeLumaChat() {
  chatModal.hidden = true;
  chatModal.classList.remove("preview-open");
  document.body.classList.remove("client-chat-open");
  document.body.classList.remove("client-preview-open");
}
