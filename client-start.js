const SUPPORTED_LANGUAGES = ["en", "es", "fr", "pt"];
const PUBLIC_BACKEND_URL = "";

const LANDING_COPY = {
  en: {
    title: "Build your business website with AI",
    kicker: "AI guided website setup",
    subtitle:
      "Talk to Luma, your AI website assistant. Answer a few simple questions, upload your logo or photos if you have them, and get a professional editable website draft in minutes.",
    start: "Start with Luma",
    how: "Use manual form",
    language: "Language",
    adminAccess: "Admin panel",
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
    title: "Crea la página de tu negocio con IA",
    kicker: "Configuración guiada con IA",
    subtitle:
      "Habla con Luma, tu asistente de creación web. Responde unas preguntas simples, sube tu logo o fotos si tienes, y genera una primera versión profesional y editable en minutos.",
    start: "Empezar con Luma",
    how: "Usar formulario manual",
    language: "Idioma",
    adminAccess: "Panel admin",
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
    title: "Créez le site de votre entreprise avec l'IA",
    kicker: "Configuration guidée par IA",
    subtitle:
      "Parlez à Luma, votre assistante web IA. Répondez à quelques questions simples, ajoutez votre logo ou vos photos si vous en avez, et obtenez une première version professionnelle et modifiable en quelques minutes.",
    start: "Commencer avec Luma",
    how: "Utiliser le formulaire",
    language: "Langue",
    adminAccess: "Admin",
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
    title: "Crie o site do seu negócio com IA",
    kicker: "Configuração guiada por IA",
    subtitle:
      "Converse com a Luma, sua assistente web com IA. Responda algumas perguntas simples, envie seu logo ou fotos se tiver, e receba uma primeira versão profissional e editável em minutos.",
    start: "Começar com Luma",
    how: "Usar formulário manual",
    language: "Idioma",
    adminAccess: "Painel admin",
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
manualButton.addEventListener("click", (event) => {
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

function openLumaChat(manual = false) {
  const apiQuery = PUBLIC_BACKEND_URL ? `&api=${encodeURIComponent(PUBLIC_BACKEND_URL)}` : "";
  const nextSrc = `/client/setup/?lang=${selectedLanguage}&embedded=1${apiQuery}${manual ? "&manual=1" : ""}`;
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
