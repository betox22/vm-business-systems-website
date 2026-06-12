const SUPPORTED_LANGUAGES = ["en", "es", "fr", "pt"];
const PUBLIC_BACKEND_URL = "";

const LANDING_COPY = {
  en: {
    title: "Build your website with Luma",
    kicker: "AI website assistant",
    subtitle:
      "Tell Luma about your business. It will guide you step by step and create an editable first draft for your website or online store.",
    start: "Start with Luma",
    how: "Choose a template",
    language: "Language",
    trustVoice: "Chat or voice",
    trustAssets: "Logo and photos optional",
    trustEditable: "Editable before publishing",
    bubbleTitle: "Hi, I'm Luma",
    bubbleText: "I will ask a few simple questions and prepare your first website draft.",
    howTitle: "A Faster Way To Start Online",
    step1Title: "Talk, don't build",
    step1Text: "Describe your business naturally. Luma turns your answers into a website brief.",
    step2Title: "AI-generated design",
    step2Text: "Get layout, copy, colors, sections, and catalog suggestions.",
    step3Title: "Editable before publishing",
    step3Text: "Review and adjust everything before your site goes live.",
  },
  es: {
    title: "Crea tu pagina con Luma",
    kicker: "Asistente web con IA",
    subtitle:
      "Cuéntale a Luma sobre tu negocio. Te guiará paso a paso y creará una primera versión editable de tu página o tienda online.",
    start: "Iniciar con Luma",
    how: "Elegir template",
    language: "Idioma",
    trustVoice: "Chat o voz",
    trustAssets: "Logo y fotos opcionales",
    trustEditable: "Editable antes de publicar",
    bubbleTitle: "Hola, soy Luma",
    bubbleText: "Te haré unas preguntas simples y prepararé tu primer borrador web.",
    howTitle: "Una Forma Más Rápida De Empezar Online",
    step1Title: "Habla, no construyas",
    step1Text: "Describe tu negocio de forma natural. Luma convierte tus respuestas en una estructura para tu página.",
    step2Title: "Diseño generado con IA",
    step2Text: "Obtén diseño, textos, colores, secciones y sugerencias de catálogo.",
    step3Title: "Editable antes de publicar",
    step3Text: "Revisa y ajusta todo antes de publicar.",
  },
  fr: {
    title: "Créez votre site avec Luma",
    kicker: "Assistant web IA",
    subtitle:
      "Parlez de votre activité à Luma. Luma vous guide étape par étape et crée un premier brouillon modifiable de votre site ou boutique.",
    start: "Commencer avec Luma",
    how: "Choisir un template",
    language: "Langue",
    trustVoice: "Chat ou voix",
    trustAssets: "Logo et photos optionnels",
    trustEditable: "Modifiable avant publication",
    bubbleTitle: "Bonjour, je suis Luma",
    bubbleText: "Je pose quelques questions simples et prépare votre premier brouillon.",
    howTitle: "Une Façon Plus Rapide De Démarrer",
    step1Title: "Parlez, ne construisez pas",
    step1Text: "Décrivez naturellement votre activité. Luma transforme vos réponses en brief de site.",
    step2Title: "Design généré par IA",
    step2Text: "Obtenez mise en page, textes, couleurs, sections et suggestions de catalogue.",
    step3Title: "Modifiable avant publication",
    step3Text: "Relisez et ajustez tout avant la mise en ligne.",
  },
  pt: {
    title: "Crie seu site com Luma",
    kicker: "Assistente web com IA",
    subtitle:
      "Conte para a Luma sobre seu negócio. Ela guia você passo a passo e cria um primeiro rascunho editável do seu site ou loja.",
    start: "Começar com Luma",
    how: "Escolher template",
    language: "Idioma",
    trustVoice: "Chat ou voz",
    trustAssets: "Logo e fotos opcionais",
    trustEditable: "Editável antes de publicar",
    bubbleTitle: "Olá, eu sou a Luma",
    bubbleText: "Vou fazer algumas perguntas simples e preparar seu primeiro rascunho.",
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
const chatModal = document.querySelector("#clientChatModal");
const chatFrame = document.querySelector("#clientChatFrame");
const closeChatButton = document.querySelector("#closeClientChat");
const decorativeMascotImages = document.querySelectorAll(".mascot-card img");

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

decorativeMascotImages.forEach((image) => {
  image.setAttribute("draggable", "false");
  image.addEventListener("contextmenu", (event) => event.preventDefault());
});

startButton.addEventListener("click", (event) => {
  event.preventDefault();
  openLumaChat();
});
manualButton?.addEventListener("click", (event) => {
  event.preventDefault();
  openLumaChat(true);
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
