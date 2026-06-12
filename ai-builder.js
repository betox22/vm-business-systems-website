const API_BASE_URL = resolveApiBaseUrl();
const API_URL = `${API_BASE_URL}/ai/website-builder`;
const INTAKE_ASSISTANT_URL = `${API_BASE_URL}/api/ai/intake-assistant`;
const CLIENT_REQUESTS_URL = `${API_BASE_URL}/client-requests`;
const ASSET_UPLOAD_URL = `${API_BASE_URL}/api/admin/assets/upload`;
const SUPPORTED_LANGUAGES = ["en", "es", "fr", "pt"];
const ASSISTANT_AVATAR_FALLBACK = "/public/brand/gnu-dev-assistant.png";
const ASSISTANT_AVATARS = {
  neutral: "/public/brand/gnu-dev-neutral.png",
  happy: "/public/brand/gnu-dev-happy.png",
  thinking: "/public/brand/gnu-dev-thinking.png",
  listening: "/public/brand/gnu-dev-listening.png",
  speaking: "/public/brand/gnu-dev-speaking.png",
  alert: "/public/brand/gnu-dev-alert.png",
  success: "/public/brand/gnu-dev-success.png",
};
const LANGUAGE_NAMES = {
  en: "English",
  es: "Español",
  fr: "Français",
  pt: "Português",
};
const GUIDED_DRAFT_STORAGE_KEY = "lumaGuidedDraft";
const GENERATED_SITE_STORAGE_KEY = "lumaGeneratedSite";

function adminHeaders(extra = {}) {
  const token = localStorage.getItem("lumaAdminToken") || "";
  return {
    ...extra,
    ...(token ? { "x-admin-token": token } : {}),
  };
}

function resolveApiBaseUrl() {
  const params = new URLSearchParams(window.location.search);
  const apiFromQuery = params.get("api");
  if (apiFromQuery) {
    localStorage.setItem("lumaApiBaseUrl", apiFromQuery);
    return apiFromQuery.replace(/\/$/, "");
  }
  if (window.LUMA_API_BASE_URL) {
    localStorage.removeItem("lumaApiBaseUrl");
    return String(window.LUMA_API_BASE_URL).replace(/\/$/, "");
  }
  if (window.location.hostname.endsWith("trycloudflare.com")) return window.location.origin;
  const savedApi = localStorage.getItem("lumaApiBaseUrl");
  if (savedApi) return savedApi.replace(/\/$/, "");
  return "http://127.0.0.1:8010";
}
const I18N = {
  en: {
    languageLabel: "Website language",
    quickForm: "Quick Form",
    guidedSetup: "Let Luma help me",
    assistantSubtitle: "AI website assistant",
    onlineStatus: "Online",
    assistantIntro: "Hi, I’m Luma. I’ll help you create your website or store step by step. You can type or use your voice.",
    intentDetected: "Great. I detected this direction:",
    selectedTemplate: "Selected template",
    catalogType: "Catalog type",
    currentInfo: "A few details collected so far.",
    finalReviewTitle: "Your website brief",
    generateMyWebsite: "Generate my website",
    keepChatting: "Keep chatting",
    thinking: "Luma is thinking...",
    micButton: "Use voice",
    voiceOutputOn: "Voice on",
    voiceOutputOff: "Voice off",
    voiceUnsupported: "Voice input is not supported in this browser.",
    voiceListening: "Listening... speak now.",
    voiceReady: "Voice transcript ready. Review it and press Send.",
    summaryHelper: "Review the essentials. Tap any field to edit it before Luma generates your draft.",
    reviewDetails: "Review brief",
    selectedLanguage: "Selected language",
    businessName: "Client/business name",
    businessDescription: "Business description",
    industry: "Industry",
    location: "Location",
    servicesProducts: "Services/products",
    targetAudience: "Target audience",
    preferredTone: "Preferred tone/style",
    preferredColors: "Preferred colors",
    contactInfo: "Contact info",
    desiredDomain: "Desired domain",
    checkDomain: "Check domain availability",
    checkingDomain: "Checking domain options...",
    domainCheckEmpty: "Write a domain or business name first.",
    domainExact: "Real registrar availability",
    domainSuggestions: "Preliminary suggestions",
    logoUrl: "Logo URL optional",
    uploadLogo: "Upload logo optional",
    photoUrls: "Photo URLs optional",
    uploadPhotos: "Upload photos optional",
    salesMode: "Sales flow",
    hasLogoPhotos: "Logo/photos",
    websiteIntent: "Website type",
    reply: "Reply",
    pageTitle: "AI Website Builder",
    liveSummary: "Live summary",
    generateButton: "Generate Website with AI",
    reviewGenerate: "Generate my website",
    switchToManualForm: "Switch to manual form",
    backToChat: "Back to chat",
    send: "Send",
    skip: "Skip",
    decideStyle: "Style: Let AI decide",
    decideColors: "Colors: Let AI decide",
    decideAudience: "Audience: Let AI decide",
    decideSections: "Sections: Let AI decide",
    serverKeyNotice: "You can switch back to chat any time.",
    assistantServerNotice: "Your details stay ready for review before generating.",
    replyPlaceholder: "Type your answer...",
    photoUrlsPlaceholder: "One image URL per line",
    salesModePlaceholder: "online sales, quotes, or both",
    sendingAssistant: "Luma is reviewing your answer...",
    summaryUpdated: "Details updated.",
    devFallbackMissingKey: "Development fallback: OPENAI_API_KEY is missing on the server.",
    localFallback: "Saved locally for now.",
    localFallbackMessage: "Development fallback: I saved this locally for now.",
    savingRequest: "Saving completed intake as client_request...",
    requestNotSaved: "Saved in this session. You can still generate your website draft.",
    generatedOpenAI: "Generated with OpenAI through the backend.",
    generating: "Generating...",
    generatingLong: "Luma is designing your website. This can take about a minute.",
    generateError: "Could not generate",
    reviewStep: "Review",
    step: "Step",
    of: "of",
    skipMessage: "Skip",
    letAiDecide: "Let AI decide",
    newClientWebsite: "New client website",
    generalBusiness: "General business",
    featuredOffer: "Featured offer",
    mainService: "Main service",
    contactRequest: "Contact request",
  },
  es: {
    languageLabel: "Idioma del sitio",
    quickForm: "Formulario rapido",
    guidedSetup: "Que Luma me ayude",
    assistantSubtitle: "Asistente web con IA",
    onlineStatus: "En linea",
    assistantIntro: "Hola, soy Luma. Te ayudare a crear tu pagina o tienda paso a paso. Puedes escribir o usar tu voz.",
    intentDetected: "Perfecto. Detecte esta direccion:",
    selectedTemplate: "Template seleccionado",
    catalogType: "Tipo de catalogo",
    currentInfo: "Algunos detalles recopilados hasta ahora.",
    finalReviewTitle: "Resumen de tu pagina",
    generateMyWebsite: "Generar mi pagina",
    keepChatting: "Seguir conversando",
    thinking: "Luma esta pensando...",
    micButton: "Usar voz",
    voiceOutputOn: "Voz activada",
    voiceOutputOff: "Voz apagada",
    voiceUnsupported: "La entrada por voz no esta disponible en este navegador.",
    voiceListening: "Escuchando... habla ahora.",
    voiceReady: "Transcripcion lista. Revisala y presiona Enviar.",
    summaryHelper: "Revisa lo esencial. Toca cualquier campo para editarlo antes de que Luma genere tu primera version.",
    reviewDetails: "Revisar resumen",
    selectedLanguage: "Idioma seleccionado",
    businessName: "Nombre del negocio",
    businessDescription: "Descripcion del negocio",
    industry: "Industria",
    location: "Ubicacion",
    servicesProducts: "Productos/servicios",
    targetAudience: "Audiencia objetivo",
    preferredTone: "Tono/estilo preferido",
    preferredColors: "Colores preferidos",
    contactInfo: "Informacion de contacto",
    desiredDomain: "Dominio deseado",
    checkDomain: "Verificar disponibilidad",
    checkingDomain: "Buscando opciones de dominio...",
    domainCheckEmpty: "Escribe primero un dominio o nombre de negocio.",
    domainExact: "Disponibilidad real del registrador",
    domainSuggestions: "Sugerencias preliminares",
    logoUrl: "URL del logo opcional",
    uploadLogo: "Subir logo opcional",
    photoUrls: "URLs de fotos opcionales",
    uploadPhotos: "Subir fotos opcional",
    salesMode: "Flujo de venta",
    hasLogoPhotos: "Logo/fotos",
    websiteIntent: "Tipo de sitio",
    reply: "Respuesta",
    pageTitle: "Constructor de paginas con IA",
    liveSummary: "Resumen en vivo",
    generateButton: "Generar sitio con IA",
    reviewGenerate: "Generar mi pagina",
    switchToManualForm: "Usar formulario manual",
    backToChat: "Volver al chat",
    send: "Enviar",
    skip: "Saltar",
    decideStyle: "Estilo: que IA decida",
    decideColors: "Colores: que IA decida",
    decideAudience: "Audiencia: que IA decida",
    decideSections: "Secciones: que IA decida",
    serverKeyNotice: "Puedes volver al chat cuando quieras.",
    assistantServerNotice: "Tus detalles quedan listos para revisar antes de generar.",
    replyPlaceholder: "Escribe tu respuesta...",
    photoUrlsPlaceholder: "Una URL de imagen por linea",
    salesModePlaceholder: "ventas online, cotizaciones, o ambos",
    sendingAssistant: "Luma esta revisando tu respuesta...",
    summaryUpdated: "Detalles actualizados.",
    devFallbackMissingKey: "Fallback de desarrollo: falta OPENAI_API_KEY en el servidor.",
    localFallback: "Guardado localmente por ahora.",
    localFallbackMessage: "Fallback de desarrollo: guarde esto localmente por ahora.",
    savingRequest: "Guardando intake completado como client_request...",
    requestNotSaved: "Guardado en esta sesion. Igual puedes generar tu primera version.",
    generatedOpenAI: "Generado con OpenAI desde el backend.",
    generating: "Generando...",
    generatingLong: "Luma esta disenando tu pagina. Esto puede tardar cerca de un minuto.",
    generateError: "No se pudo generar",
    reviewStep: "Revision",
    step: "Paso",
    of: "de",
    skipMessage: "Saltar",
    letAiDecide: "Que IA decida",
    newClientWebsite: "Nuevo sitio de cliente",
    generalBusiness: "Negocio general",
    featuredOffer: "Oferta destacada",
    mainService: "Servicio principal",
    contactRequest: "Solicitud de contacto",
  },
  fr: {
    languageLabel: "Langue du site",
    quickForm: "Formulaire rapide",
    guidedSetup: "Luma m'accompagne",
    assistantSubtitle: "Assistant de création de site",
    onlineStatus: "En ligne",
    assistantIntro: "Bonjour, je suis Luma. Je vais vous aider à créer votre site ou boutique étape par étape. Vous pouvez écrire ou utiliser votre voix.",
    currentInfo: "Quelques détails collectés jusqu'ici.",
    finalReviewTitle: "Brief de votre site",
    generateMyWebsite: "Générer mon site",
    keepChatting: "Continuer la discussion",
    thinking: "Luma réfléchit...",
    micButton: "Utiliser la voix",
    voiceOutputOn: "Voix activée",
    voiceOutputOff: "Voix désactivée",
    voiceUnsupported: "La saisie vocale n'est pas prise en charge dans ce navigateur.",
    voiceListening: "Écoute en cours... parlez maintenant.",
    voiceReady: "Transcription prête. Vérifiez-la puis appuyez sur Envoyer.",
    summaryHelper: "Vérifiez l'essentiel. Touchez un champ pour le modifier avant que Luma génère le brouillon.",
    reviewDetails: "Vérifier le brief",
    selectedLanguage: "Langue sélectionnée",
    businessName: "Nom de l'entreprise",
    businessDescription: "Description de l'entreprise",
    industry: "Secteur",
    location: "Emplacement",
    servicesProducts: "Produits/services",
    targetAudience: "Public cible",
    preferredTone: "Ton/style préféré",
    preferredColors: "Couleurs préférées",
    contactInfo: "Coordonnées",
    desiredDomain: "Domaine souhaité",
    checkDomain: "Vérifier le domaine",
    checkingDomain: "Recherche d'options de domaine...",
    domainCheckEmpty: "Écrivez d'abord un domaine ou un nom d'entreprise.",
    domainExact: "Disponibilité réelle du registraire",
    domainSuggestions: "Suggestions préliminaires",
    logoUrl: "URL du logo optionnelle",
    uploadLogo: "Importer un logo optionnel",
    photoUrls: "URLs de photos optionnelles",
    uploadPhotos: "Importer des photos optionnelles",
    salesMode: "Parcours de vente",
    hasLogoPhotos: "Logo/photos",
    websiteIntent: "Type de site",
    reply: "Réponse",
    pageTitle: "Générateur de site IA",
    liveSummary: "Résumé en direct",
    generateButton: "Générer le site avec l'IA",
    reviewGenerate: "Générer mon site",
    switchToManualForm: "Utiliser le formulaire manuel",
    backToChat: "Retour au chat",
    send: "Envoyer",
    skip: "Passer",
    decideStyle: "Style : laisser l'IA décider",
    decideColors: "Couleurs : laisser l'IA décider",
    decideAudience: "Audience : laisser l'IA décider",
    decideSections: "Sections : laisser l'IA décider",
    serverKeyNotice: "Vous pouvez revenir au chat à tout moment.",
    assistantServerNotice: "Vos détails sont prêts à vérifier avant la génération.",
    replyPlaceholder: "Écrivez votre réponse...",
    photoUrlsPlaceholder: "Une URL d'image par ligne",
    salesModePlaceholder: "vente en ligne, devis, ou les deux",
    sendingAssistant: "Luma analyse votre réponse...",
    summaryUpdated: "Détails mis à jour.",
    devFallbackMissingKey: "Fallback de développement : OPENAI_API_KEY manque sur le serveur.",
    localFallback: "Enregistré localement pour le moment.",
    localFallbackMessage: "Fallback de développement : j'ai enregistré ceci localement pour le moment.",
    savingRequest: "Enregistrement de l'intake comme client_request...",
    requestNotSaved: "Enregistré dans cette session. Vous pouvez quand même générer le brouillon.",
    generatedOpenAI: "Généré avec OpenAI via le backend.",
    generating: "Génération...",
    generateError: "Impossible de générer",
    reviewStep: "Vérification",
    step: "Étape",
    of: "sur",
    skipMessage: "Passer",
    letAiDecide: "Laisser l'IA décider",
    newClientWebsite: "Nouveau site client",
    generalBusiness: "Entreprise générale",
    featuredOffer: "Offre phare",
    mainService: "Service principal",
    contactRequest: "Demande de contact",
  },
  pt: {
    languageLabel: "Idioma do site",
    quickForm: "Formulario rapido",
    guidedSetup: "Luma me ajuda",
    assistantSubtitle: "Assistente de criação de sites",
    onlineStatus: "Online",
    assistantIntro: "Olá, sou a Luma. Vou ajudar você a criar seu site ou loja passo a passo. Você pode digitar ou usar a voz.",
    currentInfo: "Alguns detalhes coletados até agora.",
    finalReviewTitle: "Resumo do seu site",
    generateMyWebsite: "Gerar meu site",
    keepChatting: "Continuar conversando",
    thinking: "Luma está pensando...",
    micButton: "Usar voz",
    voiceOutputOn: "Voz ativada",
    voiceOutputOff: "Voz desligada",
    voiceUnsupported: "Entrada por voz não é compatível com este navegador.",
    voiceListening: "Ouvindo... fale agora.",
    voiceReady: "Transcrição pronta. Revise e pressione Enviar.",
    summaryHelper: "Revise o essencial. Toque em qualquer campo para editar antes da Luma gerar o rascunho.",
    reviewDetails: "Revisar resumo",
    selectedLanguage: "Idioma selecionado",
    businessName: "Nome do negócio",
    businessDescription: "Descrição do negócio",
    industry: "Setor",
    location: "Localização",
    servicesProducts: "Produtos/serviços",
    targetAudience: "Público-alvo",
    preferredTone: "Tom/estilo preferido",
    preferredColors: "Cores preferidas",
    contactInfo: "Informações de contato",
    desiredDomain: "Domínio desejado",
    checkDomain: "Verificar domínio",
    checkingDomain: "Buscando opções de domínio...",
    domainCheckEmpty: "Digite primeiro um domínio ou nome do negócio.",
    domainExact: "Disponibilidade real do registrador",
    domainSuggestions: "Sugestões preliminares",
    logoUrl: "URL do logo opcional",
    uploadLogo: "Enviar logo opcional",
    photoUrls: "URLs de fotos opcionais",
    uploadPhotos: "Enviar fotos opcionais",
    salesMode: "Fluxo de venda",
    hasLogoPhotos: "Logo/fotos",
    websiteIntent: "Tipo de site",
    reply: "Resposta",
    pageTitle: "Criador de sites com IA",
    liveSummary: "Resumo ao vivo",
    generateButton: "Gerar site com IA",
    reviewGenerate: "Gerar meu site",
    switchToManualForm: "Usar formulario manual",
    backToChat: "Voltar ao chat",
    send: "Enviar",
    skip: "Pular",
    decideStyle: "Estilo: deixar a IA decidir",
    decideColors: "Cores: deixar a IA decidir",
    decideAudience: "Público: deixar a IA decidir",
    decideSections: "Seções: deixar a IA decidir",
    serverKeyNotice: "Você pode voltar ao chat quando quiser.",
    assistantServerNotice: "Seus detalhes ficam prontos para revisar antes de gerar.",
    replyPlaceholder: "Digite sua resposta...",
    photoUrlsPlaceholder: "Uma URL de imagem por linha",
    salesModePlaceholder: "vendas online, orçamentos, ou ambos",
    sendingAssistant: "Luma está revisando sua resposta...",
    summaryUpdated: "Detalhes atualizados.",
    devFallbackMissingKey: "Fallback de desenvolvimento: OPENAI_API_KEY não está configurada no servidor.",
    localFallback: "Salvo localmente por enquanto.",
    localFallbackMessage: "Fallback de desenvolvimento: salvei isto localmente por enquanto.",
    savingRequest: "Salvando intake concluído como client_request...",
    requestNotSaved: "Salvo nesta sessão. Você ainda pode gerar o rascunho do site.",
    generatedOpenAI: "Gerado com OpenAI pelo backend.",
    generating: "Gerando...",
    generateError: "Não foi possível gerar",
    reviewStep: "Revisão",
    step: "Etapa",
    of: "de",
    skipMessage: "Pular",
    letAiDecide: "Deixar a IA decidir",
    newClientWebsite: "Novo site de cliente",
    generalBusiness: "Negócio geral",
    featuredOffer: "Oferta em destaque",
    mainService: "Serviço principal",
    contactRequest: "Solicitação de contato",
  },
};

const GUIDED_QUESTIONS = {
  en: {
    websiteIntent: "What kind of website do you want to create?",
    businessName: "First, what is the name of your business?",
    businessDescription: "Tell me in one sentence what it sells or does.",
    industry: "What industry or category best fits it?",
    location: "Where is it located or where does it serve customers?",
    servicesProducts: "Which main products or services should the site show?",
    targetAudience: "Who is the main customer? You can also let AI decide.",
    preferredTone: "What style should it feel like: elegant, modern, friendly, premium? Or should AI decide?",
    preferredColors: "Any preferred colors? You can write words like luxury, pastel, neon, or let AI decide.",
    contactInfo: "What contact details should appear: email, phone, Instagram, or WhatsApp?",
    salesMode: "Should the site support online sales, quote requests, or both?",
    hasLogoPhotos: "Do you have a logo or photos ready to use?",
    desiredDomain: "What domain would you like? You can write a name like lunastore.com or skip it for now.",
    review: "Review the summary. If it looks right, generate the site.",
  },
  es: {
    websiteIntent: "Que tipo de pagina quieres crear?",
    businessName: "Primero, ¿cómo se llama tu negocio?",
    businessDescription: "Perfecto. ¿Qué vende o qué ofrece tu negocio?",
    industry: "En que industria o categoria lo pondrias?",
    location: "Donde atiende o donde esta ubicado?",
    servicesProducts: "Que productos o servicios principales quieres mostrar?",
    targetAudience: "A quien le vendes principalmente? Tambien puedes dejar que IA decida.",
    preferredTone: "Que estilo quieres: elegante, moderno, cercano, premium? O dejo que IA decida?",
    preferredColors: "Tienes colores preferidos? Puedes escribir lujo, pastel, neon, o dejar que IA decida.",
    contactInfo: "Que contacto quieres mostrar: email, telefono, Instagram o WhatsApp?",
    salesMode: "Quieres ventas online, solicitudes de cotizacion, o ambos?",
    hasLogoPhotos: "Tienes logo o fotos listas para usar?",
    desiredDomain: "Que dominio te gustaria? Puedes escribir algo como lunastore.com o saltarlo por ahora.",
    review: "Revisa el resumen. Si esta bien, genera el sitio.",
  },
  fr: {
    websiteIntent: "Quel type de site voulez-vous creer?",
    businessName: "Quel est le nom de l'entreprise?",
    businessDescription: "Décrivez en une phrase ce qu'elle vend ou propose.",
    industry: "Dans quel secteur ou catégorie la placeriez-vous?",
    location: "Où se trouve-t-elle ou où sert-elle ses clients?",
    servicesProducts: "Quels produits ou services principaux faut-il afficher?",
    targetAudience: "Qui est le client principal? Vous pouvez aussi laisser l'IA décider.",
    preferredTone: "Quel style voulez-vous: élégant, moderne, chaleureux, premium? Ou l'IA décide?",
    preferredColors: "Des couleurs préférées? Vous pouvez écrire luxe, pastel, néon, ou laisser l'IA décider.",
    contactInfo: "Quelles coordonnées afficher: email, téléphone, Instagram ou WhatsApp?",
    salesMode: "Le site doit-il proposer la vente en ligne, les demandes de devis, ou les deux?",
    hasLogoPhotos: "Avez-vous un logo ou des photos prêts à utiliser?",
    desiredDomain: "Quel domaine souhaitez-vous? Vous pouvez écrire lunastore.com ou ignorer pour l'instant.",
    review: "Vérifiez le résumé. Si tout est bon, générez le site.",
  },
  pt: {
    websiteIntent: "Que tipo de site voce quer criar?",
    businessName: "Qual é o nome do negócio?",
    businessDescription: "Conte em uma frase o que ele vende ou faz.",
    industry: "Em qual setor ou categoria ele se encaixa?",
    location: "Onde fica ou onde atende clientes?",
    servicesProducts: "Quais produtos ou serviços principais devem aparecer?",
    targetAudience: "Quem é o cliente principal? Você também pode deixar a IA decidir.",
    preferredTone: "Qual estilo você quer: elegante, moderno, próximo, premium? Ou a IA decide?",
    preferredColors: "Tem cores preferidas? Pode escrever luxo, pastel, neon, ou deixar a IA decidir.",
    contactInfo: "Quais contatos devem aparecer: email, telefone, Instagram ou WhatsApp?",
    salesMode: "O site deve aceitar vendas online, pedidos de orçamento, ou ambos?",
    hasLogoPhotos: "Você tem logo ou fotos prontas para usar?",
    desiredDomain: "Qual domínio você gostaria? Pode escrever lunastore.com ou pular por enquanto.",
    review: "Revise o resumo. Se estiver certo, gere o site.",
  },
};

let selectedLanguage = detectBrowserLanguage();

let currentSchema = null;
let selectedPageKey = "home";
let selectedVariantId = "";
let currentSiteId = null;
let currentBusinessId = null;
let currentGenerationId = null;
let currentRequestId = null;
let currentCatalogItems = [];
let guidedStep = "websiteIntent";
let guidedHistory = [];
let assistantState = "neutral";
let assistantVoiceEnabled = localStorage.getItem("gnuDevAssistantVoice") === "on";
let forcedTemplateSelection = null;
let guidedState = {
  websiteIntent: "",
  businessName: "",
  businessDescription: "",
  industry: "",
  location: "",
  servicesProducts: [],
  targetAudience: "",
  preferredTone: "",
  preferredColors: [],
  contactInfo: {},
  logoUrl: "",
  photoUrls: [],
  selectedLanguage,
  hasLogo: false,
  hasPhotos: false,
  salesMode: "",
  hasLogoPhotos: "",
  sectionsPreference: "",
  desiredDomain: "",
};

const GUIDED_STEPS = [
  "websiteIntent",
  "businessName",
  "businessDescription",
  "industry",
  "location",
  "servicesProducts",
  "targetAudience",
  "preferredTone",
  "preferredColors",
  "contactInfo",
  "salesMode",
  "hasLogoPhotos",
  "desiredDomain",
  "review",
];

const TEMPLATE_PRESETS = [
  {
    id: "editorial-boutique",
    name: "Editorial boutique",
    heroLayout: "image_left",
    productLayout: "masonry",
    density: "spacious",
  },
  {
    id: "operational-catalog",
    name: "Catalogo operativo",
    heroLayout: "compact_catalog",
    productLayout: "grid",
    density: "balanced",
  },
  {
    id: "bold-landing",
    name: "Landing bold",
    heroLayout: "centered_hero",
    productLayout: "boutique_grid",
    density: "compact",
  },
];

const form = document.querySelector("#intakeForm");
const statusText = document.querySelector("#statusText");
const storageStatus = document.querySelector("#storageStatus");
const siteTitle = document.querySelector("#siteTitle");
const editorMount = document.querySelector("#editorMount");
const previewFrame = document.querySelector("#previewFrame");
const quickModeButton = document.querySelector("#quickModeButton");
const guidedModeButton = document.querySelector("#guidedModeButton");
const guidedPanel = document.querySelector("#guidedPanel");
const guidedChat = document.querySelector("#guidedChat");
const guidedReply = document.querySelector("#guidedReply");
const guidedStatusText = document.querySelector("#guidedStatusText");
const guidedStepLabel = document.querySelector("#guidedStepLabel");
const guidedGenerateButton = document.querySelector("#guidedGenerateButton");
const guidedCloseButton = document.querySelector("#guidedCloseButton");
const guidedMicButton = document.querySelector("#guidedMicButton");
const assistantAudioToggle = document.querySelector("#assistantAudioToggle");
const voiceStatusText = document.querySelector("#voiceStatusText");
const guidedThinking = document.querySelector("#guidedThinking");
const guidedProgressBar = document.querySelector("#guidedProgressBar");
const reviewDetailsButton = document.querySelector("#reviewDetailsButton");
const keepChattingButton = document.querySelector("#keepChattingButton");
const currentInfoPreview = document.querySelector("#currentInfoPreview");
const currentInfoMeta = document.querySelector("#currentInfoMeta");
const quickChipRow = document.querySelector("#quickChipRow");
const guidedLogoUpload = document.querySelector("#guidedLogoUpload");
const guidedPhotoUpload = document.querySelector("#guidedPhotoUpload");
const guidedLogoPreview = document.querySelector("#guidedLogoPreview");
const guidedPhotoPreview = document.querySelector("#guidedPhotoPreview");
const checkDomainButton = document.querySelector("#checkDomainButton");
const domainCheckStatus = document.querySelector("#domainCheckStatus");
const domainResults = document.querySelector("#domainResults");
const languageSelector = document.querySelector("#languageSelector");
const summaryLanguageSelector = document.querySelector("#summaryLanguageSelector");
const isPublicClientSetup = document.body.dataset.context === "client-setup";
const isEmbeddedClientSetup = new URLSearchParams(window.location.search).get("embedded") === "1";
const switchManualFormButton = document.querySelector("#switchManualFormButton");
const backToChatButton = document.querySelector("#backToChatButton");
const submitDraftReviewButton = document.querySelector("#submitDraftReviewButton");
const adjustWithLumaButton = document.querySelector("#adjustWithLumaButton");
const builderAvatarRoot = document.querySelector("#builderAvatarAssistant");
const builderAvatarManager = window.AvatarStateManager ? new window.AvatarStateManager("idle") : null;
let builderAvatarAssistant = null;

document.body.classList.toggle("embedded-chat", isEmbeddedClientSetup);

initBuilderAvatarAssistant();
initLanguageControls();
initVoiceInput();
updateAssistantAudioToggle();
setAssistantState("happy");
hydrateFromSelectedRequest();
initGuidedIntake();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await generateWebsite();
});

document.querySelector("#desktopButton").addEventListener("click", () => {
  previewFrame.classList.remove("mobile");
  setPreviewButton("desktopButton");
});

document.querySelector("#mobileButton").addEventListener("click", () => {
  previewFrame.classList.add("mobile");
  setPreviewButton("mobileButton");
});

document.querySelector("#copySchemaButton").addEventListener("click", async () => {
  if (!currentSchema) return;
  await navigator.clipboard.writeText(JSON.stringify(currentSchema, null, 2));
  storageStatus.textContent = "JSON copied";
});

document.querySelector("#saveSchemaButton").addEventListener("click", saveCurrentSchema);
document.querySelector("#publishButton").addEventListener("click", publishCurrentSite);
document.querySelector("#clientPreviewButton").addEventListener("click", () => {
  document.body.classList.add("client-preview-mode");
});
document.querySelector("#exitClientPreviewButton").addEventListener("click", () => {
  document.body.classList.remove("client-preview-mode");
});
submitDraftReviewButton?.addEventListener("click", submitGeneratedDraftForReview);
adjustWithLumaButton?.addEventListener("click", adjustGeneratedDraftWithLuma);

quickModeButton.addEventListener("click", () => setIntakeMode("quick"));
guidedModeButton.addEventListener("click", () => setIntakeMode("guided"));
guidedCloseButton.addEventListener("click", () => {
  if (isPublicClientSetup) {
    if (isEmbeddedClientSetup) {
      window.parent.postMessage({ type: "luma-close" }, "*");
      return;
    }
    window.location.href = `/start/?lang=${selectedLanguage}`;
    return;
  }
  setIntakeMode("quick");
});
switchManualFormButton?.addEventListener("click", switchToManualForm);
backToChatButton?.addEventListener("click", switchBackToChat);
assistantAudioToggle.addEventListener("click", toggleAssistantAudio);
reviewDetailsButton.addEventListener("click", openReviewDetails);
keepChattingButton.addEventListener("click", keepChatting);
checkDomainButton?.addEventListener("click", checkDesiredDomainOptions);
document.querySelector("#guidedSendButton").addEventListener("click", sendGuidedReply);
document.querySelector("#guidedSkipButton").addEventListener("click", skipGuidedQuestion);
guidedGenerateButton.addEventListener("click", handleGuidedGenerateButton);
guidedReply.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    sendGuidedReply();
  }
});
builderAvatarManager?.bindTyping(guidedReply);
document.querySelectorAll("[data-ai-decide]").forEach((button) => {
  button.addEventListener("click", () => letAiDecide(button.dataset.aiDecide));
});
document.querySelectorAll("[data-summary-field]").forEach((field) => {
  field.addEventListener("input", syncGuidedStateFromSummary);
});
quickChipRow.querySelectorAll("[data-chip]").forEach((button) => {
  button.addEventListener("click", () => insertQuickChip(button.dataset.chip));
});
guidedLogoUpload.addEventListener("change", handleGuidedLogoUpload);
guidedPhotoUpload.addEventListener("change", handleGuidedPhotoUpload);
guidedMicButton.addEventListener("click", startVoiceInput);
languageSelector.addEventListener("change", () => setSelectedLanguage(languageSelector.value));
summaryLanguageSelector.addEventListener("change", () => setSelectedLanguage(summaryLanguageSelector.value));
window.addEventListener("load", () => {
  const params = new URLSearchParams(window.location.search);
  if (isPublicClientSetup || params.get("guided") !== "0") {
    setIntakeMode("guided");
  }
  if (isPublicClientSetup && params.get("manual") === "1") {
    switchToManualForm();
  }
});

function initLanguageControls() {
  const params = new URLSearchParams(window.location.search);
  selectedLanguage = normalizeBrowserLanguage(
    params.get("lang") || (navigator.languages || [navigator.language || "en"])[0]
  );
  guidedState.selectedLanguage = selectedLanguage;
  languageSelector.value = selectedLanguage;
  summaryLanguageSelector.value = selectedLanguage;
  applyI18n();
}

function setSelectedLanguage(value) {
  const previousLanguage = selectedLanguage;
  selectedLanguage = normalizeBrowserLanguage(value);
  guidedState.selectedLanguage = selectedLanguage;
  languageSelector.value = selectedLanguage;
  summaryLanguageSelector.value = selectedLanguage;
  applyI18n();
  updateBuilderAvatarLabels();
  renderGuidedSummary();
  if (previousLanguage !== selectedLanguage) {
    resetAssistantConversation();
  }
}

function normalizeBrowserLanguage(input) {
  const normalized = String(input || "en").trim().toLowerCase();
  const base = normalized.split("-")[0];
  return SUPPORTED_LANGUAGES.includes(base) ? base : "en";
}

function detectBrowserLanguage() {
  const languages = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
  return normalizeBrowserLanguage(languages.find(Boolean) || "en");
}

function t(key) {
  return I18N[selectedLanguage]?.[key] || I18N.en[key] || key;
}

function guidedQuestion(step) {
  return GUIDED_QUESTIONS[selectedLanguage]?.[step] || GUIDED_QUESTIONS.en[step] || GUIDED_QUESTIONS.en.review;
}

function applyI18n() {
  document.documentElement.lang = selectedLanguage;
  document.title = t("pageTitle");
  document.querySelectorAll("[data-i18n]").forEach((item) => {
    item.textContent = t(item.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((item) => {
    item.placeholder = t(item.dataset.i18nPlaceholder);
  });
  document.querySelectorAll("[data-i18n-label]").forEach((label) => {
    setLabelText(label, t(label.dataset.i18nLabel));
  });
  initVoiceInput();
  updateAssistantAudioToggle();
  updateBuilderAvatarLabels();
}

function updateBuilderAvatarLabels() {
  if (!builderAvatarAssistant) return;
  builderAvatarAssistant.labels = {
    idle: t("assistantSubtitle"),
    listening: selectedLanguage === "es" ? "Estoy escuchando tu idea." : "I'm listening to your idea.",
    thinking: t("thinking"),
    speaking: selectedLanguage === "es" ? "Te guio paso a paso." : "Guiding you step by step.",
    happy: selectedLanguage === "es" ? "Listo para ayudarte." : "Ready to help.",
    confused: selectedLanguage === "es" ? "Necesito un poco mas de contexto." : "I need a little more context.",
    success: selectedLanguage === "es" ? "Tu borrador esta listo." : "Your draft is ready.",
  };
  builderAvatarAssistant.setState(builderAvatarManager?.getState() || "idle");
}

function setLabelText(label, value) {
  const textNodes = Array.from(label.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE);
  let target = textNodes.find((node) => node.textContent.trim().length > 0);
  if (!target) {
    target = document.createTextNode("");
    label.insertBefore(target, label.firstChild);
  }
  textNodes.forEach((node) => {
    if (node !== target && node.textContent.trim().length > 0) {
      node.textContent = "";
    }
  });
  target.textContent = `${value} `;
}

function initBuilderAvatarAssistant() {
  if (!builderAvatarRoot || !window.AvatarAssistant || !builderAvatarManager) return;
  builderAvatarAssistant = new window.AvatarAssistant({
    root: builderAvatarRoot,
    manager: builderAvatarManager,
    name: isPublicClientSetup ? "Luma" : "GNU Dev",
    compact: true,
    labels: {
      idle: t("assistantSubtitle"),
      listening: selectedLanguage === "es" ? "Estoy escuchando tu idea." : "I'm listening to your idea.",
      thinking: t("thinking"),
      speaking: selectedLanguage === "es" ? "Te guio paso a paso." : "Guiding you step by step.",
      happy: selectedLanguage === "es" ? "Listo para ayudarte." : "Ready to help.",
      confused: selectedLanguage === "es" ? "Necesito un poco mas de contexto." : "I need a little more context.",
      success: selectedLanguage === "es" ? "Tu borrador esta listo." : "Your draft is ready.",
    },
  });
  document.body.classList.add("avatar-assistant-ready");
}

function avatarStateFromAssistantState(state) {
  return {
    neutral: "idle",
    happy: "happy",
    thinking: "thinking",
    listening: "listening",
    speaking: "speaking",
    alert: "confused",
    success: "success",
  }[state] || "idle";
}

function setAssistantState(state) {
  assistantState = normalizeAssistantState(state);
  document.body.dataset.assistantState = assistantState;
  builderAvatarManager?.setState(avatarStateFromAssistantState(assistantState), { source: "guided-assistant" });
  document.querySelectorAll(".assistant-avatar").forEach((avatar) => {
    avatar.dataset.state = assistantState;
    avatar.src = ASSISTANT_AVATARS[assistantState] || ASSISTANT_AVATAR_FALLBACK;
    avatar.onerror = () => {
      avatar.onerror = null;
      avatar.src = ASSISTANT_AVATAR_FALLBACK;
    };
  });
}

function normalizeAssistantState(state) {
  return ["neutral", "happy", "thinking", "listening", "speaking", "alert", "success"].includes(state)
    ? state
    : "neutral";
}

function toggleAssistantAudio() {
  assistantVoiceEnabled = !assistantVoiceEnabled;
  localStorage.setItem("gnuDevAssistantVoice", assistantVoiceEnabled ? "on" : "off");
  updateAssistantAudioToggle();
}

function updateAssistantAudioToggle() {
  assistantAudioToggle.textContent = assistantVoiceEnabled ? t("voiceOutputOn") : t("voiceOutputOff");
  assistantAudioToggle.setAttribute("aria-label", assistantVoiceEnabled ? t("voiceOutputOn") : t("voiceOutputOff"));
  assistantAudioToggle.dataset.enabled = assistantVoiceEnabled ? "true" : "false";
  assistantAudioToggle.classList.toggle("active", assistantVoiceEnabled);
}

function speakAssistantMessage(message) {
  if (!assistantVoiceEnabled || !("speechSynthesis" in window) || !message) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = languageToSpeechLocale(selectedLanguage);
  utterance.rate = 0.96;
  utterance.pitch = 1.02;
  utterance.addEventListener("start", () => setAssistantState("speaking"));
  utterance.addEventListener("end", () => setAssistantState(guidedStep === "review" ? "success" : "happy"));
  utterance.addEventListener("error", () => setAssistantState("alert"));
  window.speechSynthesis.speak(utterance);
}

function initVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const supported = Boolean(SpeechRecognition);
  guidedMicButton.disabled = !supported;
  guidedMicButton.hidden = !supported;
  voiceStatusText.textContent = supported ? "" : t("voiceUnsupported");
}

function startVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    voiceStatusText.textContent = t("voiceUnsupported");
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = languageToSpeechLocale(selectedLanguage);
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  voiceStatusText.textContent = t("voiceListening");
  guidedMicButton.classList.add("listening");
  setAssistantState("listening");
  recognition.addEventListener("result", (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript || "";
    guidedReply.value = transcript;
    voiceStatusText.textContent = t("voiceReady");
    setAssistantState("happy");
  });
  recognition.addEventListener("error", () => {
    voiceStatusText.textContent = t("voiceUnsupported");
    guidedMicButton.classList.remove("listening");
    setAssistantState("alert");
  });
  recognition.addEventListener("end", () => {
    guidedMicButton.classList.remove("listening");
    if (assistantState === "listening") setAssistantState("neutral");
  });
  recognition.start();
}

function languageToSpeechLocale(language) {
  return {
    en: "en-US",
    es: "es-US",
    fr: "fr-FR",
    pt: "pt-BR",
  }[language] || "en-US";
}

function initGuidedIntake() {
  importQuickFormToGuidedState();
  restoreGuidedDraft();
  applyPromptFromQuery();
  restoreGeneratedSite();
  renderGuidedSummary();
  resetAssistantConversation();
}

function applyPromptFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const prompt = params.get("prompt") || params.get("description") || "";
  if (!prompt.trim()) return;
  guidedState.websiteIntent = prompt.trim();
  guidedState.businessDescription = prompt.trim();
  guidedState.preferredTone = guidedState.preferredTone || extractStyleHint(prompt);
  guidedState.industry = guidedState.industry || inferIndustryFromPrompt(prompt);
  if (params.get("templateId")) {
    forcedTemplateSelection = {
      templateId: params.get("templateId"),
      catalogType: params.get("catalogType") || "",
      intent: params.get("intent") || "manual_template",
      reason: "Template selected from customer template gallery",
    };
  }
  guidedStep = "businessName";
  applyGuidedStateToForm();
}

function extractStyleHint(prompt) {
  const text = String(prompt || "").toLowerCase();
  const styles = ["cyberpunk", "futurista", "neon", "neón", "premium", "minimal", "lujo", "elegante", "moderno", "shopify", "amazon", "ebay"];
  return styles.filter((style) => text.includes(style)).join(", ");
}

function inferIndustryFromPrompt(prompt) {
  const text = String(prompt || "").toLowerCase();
  if (/restaurante|restaurant|menu|menú|comida|food/.test(text)) return selectedLanguage === "es" ? "Restaurante / comida" : "Restaurant / food";
  if (/barber|barberia|barbería|salon|spa|cita|reserva/.test(text)) return selectedLanguage === "es" ? "Servicios con citas" : "Appointment services";
  if (/curso|course|ebook|digital|software|membres/.test(text)) return selectedLanguage === "es" ? "Productos digitales" : "Digital products";
  if (/contractor|construction|remodel|pintura|roofing|flooring/.test(text)) return selectedLanguage === "es" ? "Construccion / contractor" : "Contractor";
  if (/tienda|store|shop|producto|vender|ecommerce|amazon|ebay|cyberpunk|gamer/.test(text)) return selectedLanguage === "es" ? "Tienda online / ecommerce" : "Online store / ecommerce";
  return "";
}

function resetAssistantConversation() {
  guidedChat.innerHTML = "";
  guidedHistory = [];
  setAssistantState("happy");
  appendChatMessage("assistant", guidedQuestion(guidedStep), "happy");
  if (guidedStep === "websiteIntent") {
    appendChatMessage(
      "assistant",
      selectedLanguage === "es"
        ? "Puedes escribir algo como: quiero algo tipo Amazon, quiero un menu de restaurante, una barberia con citas, o una tienda cyberpunk super cool."
        : "You can type examples like: I want something like Amazon, I want a restaurant menu, a booking site for a barbershop, or a cyberpunk online store.",
      "speaking",
    );
  } else if (forcedTemplateSelection?.templateId && guidedState.websiteIntent) {
    appendTemplateDetectionMessage({
      templateId: forcedTemplateSelection.templateId,
      template: forcedTemplateSelection.template || null,
      intent: forcedTemplateSelection.intent || "manual_template",
      catalogType: forcedTemplateSelection.catalogType || "",
      reason: forcedTemplateSelection.reason || "Template selected from landing page",
    });
  }
}

function setIntakeMode(mode) {
  const guided = mode === "guided";
  quickModeButton.classList.toggle("active", !guided);
  guidedModeButton.classList.toggle("active", guided);
  form.classList.toggle("active", !guided);
  guidedPanel.classList.toggle("active", guided);
  document.body.classList.toggle("guided-modal-open", guided);
  document.body.classList.remove("review-details-open", "final-review-mode");
  if (!guided && "speechSynthesis" in window) window.speechSynthesis.cancel();
  if (!guided) setAssistantState("neutral");
  if (guided) {
    importQuickFormToGuidedState();
    setAssistantState("happy");
    renderGuidedSummary();
    refreshQuickChips();
  }
}

function switchToManualForm() {
  applyGuidedStateToForm();
  document.body.classList.add("manual-form-open");
  document.body.classList.remove("review-details-open", "final-review-mode");
  form.classList.add("active");
  guidedPanel.classList.remove("active");
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  setAssistantState("neutral");
}

function switchBackToChat() {
  importQuickFormToGuidedState();
  document.body.classList.remove("manual-form-open");
  setIntakeMode("guided");
}

function saveGuidedDraft() {
  if (!isPublicClientSetup) return;
  try {
    localStorage.setItem(
      GUIDED_DRAFT_STORAGE_KEY,
      JSON.stringify({
        guidedState: guidedStateForApi(),
        guidedStep,
        selectedLanguage,
        savedAt: new Date().toISOString(),
      }),
    );
  } catch {
    // Draft autosave should never block the user flow.
  }
}

function restoreGuidedDraft() {
  if (!isPublicClientSetup) return;
  try {
    const raw = localStorage.getItem(GUIDED_DRAFT_STORAGE_KEY);
    if (!raw) return;
    const draft = JSON.parse(raw);
    if (draft.selectedLanguage) setSelectedLanguage(draft.selectedLanguage);
    if (draft.guidedState) {
      guidedState = {
        ...guidedState,
        ...draft.guidedState,
        servicesProducts: arrayValue(draft.guidedState.servicesProducts),
        preferredColors: arrayValue(draft.guidedState.preferredColors),
        photoUrls: arrayValue(draft.guidedState.photoUrls),
        contactInfo: draft.guidedState.contactInfo || {},
      };
    }
    guidedStep = draft.guidedStep || guidedStep;
    applyGuidedStateToForm();
  } catch {
    localStorage.removeItem(GUIDED_DRAFT_STORAGE_KEY);
  }
}

function saveGeneratedSite(result) {
  if (!isPublicClientSetup) return;
  try {
    localStorage.setItem(
      GENERATED_SITE_STORAGE_KEY,
      JSON.stringify({
        result,
        selectedPageKey,
        selectedVariantId,
        savedAt: new Date().toISOString(),
      }),
    );
  } catch {
    // Generated previews can be large; if storage is full, keep the live preview only.
  }
}

function restoreGeneratedSite() {
  if (!isPublicClientSetup) return;
  try {
    const raw = localStorage.getItem(GENERATED_SITE_STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    const result = saved.result || {};
    if (!result.schema) return;
    currentSchema = result.schema;
    currentSiteId = result.site_id || null;
    currentBusinessId = result.business_id || null;
    currentGenerationId = result.generation_id || null;
    currentCatalogItems = catalogItemsFromSchema(currentSchema);
    selectedPageKey = saved.selectedPageKey || currentSchema.pages?.[0]?.page_key || "home";
    selectedVariantId = saved.selectedVariantId || currentSchema.design_variants?.[0]?.id || "";
    siteTitle.textContent = currentSchema.business?.name || "Generated site";
    storageStatus.textContent = storageLabel(result.storage_status, result.used_dev_mock);
  } catch {
    localStorage.removeItem(GENERATED_SITE_STORAGE_KEY);
  }
}

async function sendGuidedReply() {
  const message = guidedReply.value.trim();
  if (!message) return;
  appendChatMessage("user", message);
  guidedReply.value = "";
  if (guidedStep === "websiteIntent") {
    await handleWebsiteIntentAnswer(message);
    return;
  }
  if (guidedStep === "review" && currentSchema) {
    const adjustmentLabel = selectedLanguage === "es" ? "Ajustes pedidos por el cliente" : "Client requested adjustments";
    guidedState.businessDescription = [
      guidedState.businessDescription,
      `${adjustmentLabel}: ${message}`,
    ].filter(Boolean).join("\n\n");
    appendChatMessage(
      "assistant",
      selectedLanguage === "es"
        ? "Perfecto, ya agregué esos ajustes al brief. Presiona “Generar mi página” para crear una nueva versión con esos cambios."
        : "Perfect, I added those adjustments to the brief. Press “Generate my website” to create a new version with those changes.",
      "success",
    );
    guidedStatusText.textContent = selectedLanguage === "es" ? "Ajustes listos para regenerar." : "Adjustments ready to regenerate.";
    renderGuidedSummary();
    refreshQuickChips();
    saveGuidedDraft();
    return;
  }
  guidedStatusText.textContent = t("sendingAssistant");
  setThinking(true);

  try {
    const response = await fetch(INTAKE_ASSISTANT_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        current: guidedStateForApi(),
        message,
        current_step: guidedStep,
        history: guidedHistory,
      }),
    });
    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }
    const result = await response.json();
    const assistantMessage = result.assistantMessage || result.message;
    const emotion = result.emotion || (result.readyToGenerate ? "success" : "speaking");
    const updatedFields = result.updatedFields || result.updates || {};
    guidedHistory.push({ role: "user", content: message });
    guidedHistory.push({ role: "assistant", content: assistantMessage });
    mergeGuidedUpdates(updatedFields);
    guidedStep = result.next_step || nextGuidedStep(guidedStep);
    if (result.readyToGenerate) guidedStep = "review";
    const nextQuestion = result.nextQuestion || result.next_question;
    const combinedAssistantMessage =
      nextQuestion && nextQuestion !== assistantMessage ? `${assistantMessage} ${nextQuestion}` : assistantMessage;
    appendChatMessage("assistant", combinedAssistantMessage, result.used_dev_fallback ? "alert" : emotion);
    guidedStatusText.textContent = result.used_dev_fallback
      ? t("devFallbackMissingKey")
      : t("summaryUpdated");
  } catch (error) {
    const updates = inferGuidedUpdates(guidedStep, message);
    mergeGuidedUpdates(updates);
    guidedStep = nextGuidedStep(guidedStep);
    appendChatMessage(
      "assistant",
      `${t("localFallbackMessage")} ${shortError(error.message)}`,
      "alert",
    );
    appendChatMessage("assistant", guidedQuestion(guidedStep), "speaking");
    guidedStatusText.textContent = t("localFallback");
  }
  setThinking(false);
  renderGuidedSummary();
  refreshQuickChips();
}

async function handleWebsiteIntentAnswer(message) {
  guidedStatusText.textContent = selectedLanguage === "es" ? "Detectando el mejor template..." : "Detecting the best template...";
  setThinking(true);
  try {
    const selection = await selectTemplateFromFreeText(message);
    forcedTemplateSelection = selection;
    guidedState.websiteIntent = message;
    if (!guidedState.businessDescription) guidedState.businessDescription = message;
    if (!guidedState.industry) guidedState.industry = inferIndustryFromPrompt(message);
    if (!guidedState.preferredTone) guidedState.preferredTone = extractStyleHint(message);
    appendTemplateDetectionMessage(selection);
    guidedStep = "businessName";
    appendChatMessage("assistant", guidedQuestion(guidedStep), "speaking");
    guidedStatusText.textContent = selectedLanguage === "es" ? "Template detectado. Sigamos con los datos del negocio." : "Template detected. Let us continue with the business details.";
  } catch (error) {
    guidedState.websiteIntent = message;
    guidedState.businessDescription = guidedState.businessDescription || message;
    guidedStep = "businessName";
    appendChatMessage("assistant", `${t("localFallbackMessage")} ${shortError(error.message)}`, "alert");
    appendChatMessage("assistant", guidedQuestion(guidedStep), "speaking");
    guidedStatusText.textContent = t("localFallback");
  }
  setThinking(false);
  renderGuidedSummary();
  refreshQuickChips();
}

async function selectTemplateFromFreeText(message) {
  if (!window.TemplateRouter?.selectTemplateFromPrompt) {
    return {
      templateId: "minimal-store",
      template: null,
      intent: "default_minimal",
      catalogType: "editorial_minimal_grid",
      reason: "Template router unavailable; using default template",
    };
  }
  return window.TemplateRouter.selectTemplateFromPrompt(message);
}

function appendTemplateDetectionMessage(selection) {
  const templateName = selection.template?.name || selection.templateId;
  const explanation = selection.template?.catalogModel?.customerFeeling || selection.template?.visualDifference || selection.reason;
  const lines = [
    t("intentDetected"),
    `${t("selectedTemplate")}: ${templateName}`,
    `${t("catalogType")}: ${selection.catalogType}`,
    explanation,
  ];
  appendChatMessage("assistant", lines.join("\n"), "success");
}

function skipGuidedQuestion() {
  appendChatMessage("user", t("skipMessage"));
  guidedStep = nextGuidedStep(guidedStep);
  appendChatMessage("assistant", guidedQuestion(guidedStep), "speaking");
  renderGuidedSummary();
}

function letAiDecide(field) {
  const decision = t("letAiDecide");
  if (field === "preferredColors") {
    guidedState.preferredColors = [decision];
  } else if (field === "sectionsPreference") {
    guidedState.sectionsPreference = decision;
  } else {
    guidedState[field] = decision;
  }
  guidedStep = field === "sectionsPreference" ? "review" : nextGuidedStep(field);
  appendChatMessage("user", `${field}: ${decision}`);
  appendChatMessage("assistant", guidedQuestion(guidedStep), guidedStep === "review" ? "success" : "speaking");
  renderGuidedSummary();
}

function insertQuickChip(value) {
  const translated = translateChip(value);
  guidedReply.value = guidedReply.value ? `${guidedReply.value}, ${translated}` : translated;
  guidedReply.focus();
}

function refreshQuickChips() {
  const chipsByStep = {
    websiteIntent: ["Online store", "Marketplace", "Restaurant", "Services", "Booking", "Digital products"],
    preferredTone: ["Elegant", "Modern", "Premium", "Warm", "Professional", "Let AI decide"],
    preferredColors: ["Let AI choose", "Use my logo colors", "I have specific colors"],
    salesMode: ["Sell online", "Request quotes", "Calls/messages", "All of the above", "Not sure"],
    targetAudience: ["Local customers", "Families", "Professionals", "Businesses", "Let AI decide"],
  };
  const chips = chipsByStep[guidedStep] || [];
  quickChipRow.innerHTML = chips
    .map((chip) => `<button data-chip="${escapeAttribute(chip)}" type="button">${escapeHtml(translateChip(chip))}</button>`)
    .join("");
  quickChipRow.querySelectorAll("[data-chip]").forEach((button) => {
    button.addEventListener("click", () => insertQuickChip(button.dataset.chip));
  });
}

function translateChip(value) {
  const dictionary = {
    es: {
      Elegant: "Elegante",
      Modern: "Moderno",
      Premium: "Premium",
      Warm: "Calido",
      Bold: "Llamativo",
      Fun: "Divertido",
      Professional: "Profesional",
      "Let AI decide": "Que IA decida",
      "Let AI choose": "Que IA elija",
      "Online store": "Tienda online",
      Marketplace: "Marketplace",
      Restaurant: "Restaurante",
      Services: "Servicios",
      Booking: "Reservas",
      "Digital products": "Productos digitales",
      "Use my logo colors": "Usar colores de mi logo",
      "I have specific colors": "Tengo colores especificos",
      "Sell online": "Vender online",
      "Request quotes": "Recibir cotizaciones",
      "Calls/messages": "Llamadas/mensajes",
      "All of the above": "Todo lo anterior",
      "Not sure": "No estoy seguro",
      "Local customers": "Clientes locales",
      Families: "Familias",
      Professionals: "Profesionales",
      Businesses: "Empresas",
    },
    fr: {
      Elegant: "Élégant",
      Modern: "Moderne",
      Premium: "Premium",
      Warm: "Chaleureux",
      Bold: "Audacieux",
      Fun: "Amusant",
      Professional: "Professionnel",
      "Let AI decide": "Laisser l'IA décider",
      "Let AI choose": "Laisser l'IA choisir",
      "Use my logo colors": "Utiliser les couleurs du logo",
      "I have specific colors": "J'ai des couleurs précises",
      "Sell online": "Vendre en ligne",
      "Request quotes": "Demander des devis",
      "Calls/messages": "Appels/messages",
      "All of the above": "Tout ce qui précède",
      "Not sure": "Je ne suis pas sûr",
      "Local customers": "Clients locaux",
      Families: "Familles",
      Professionals: "Professionnels",
      Businesses: "Entreprises",
    },
    pt: {
      Elegant: "Elegante",
      Modern: "Moderno",
      Premium: "Premium",
      Warm: "Acolhedor",
      Bold: "Marcante",
      Fun: "Divertido",
      Professional: "Profissional",
      "Let AI decide": "Deixar a IA decidir",
      "Let AI choose": "Deixar a IA escolher",
      "Use my logo colors": "Usar as cores do logo",
      "I have specific colors": "Tenho cores especificas",
      "Sell online": "Vender online",
      "Request quotes": "Solicitar orçamentos",
      "Calls/messages": "Ligações/mensagens",
      "All of the above": "Tudo isso",
      "Not sure": "Não tenho certeza",
      "Local customers": "Clientes locais",
      Families: "Famílias",
      Professionals: "Profissionais",
      Businesses: "Empresas",
    },
  };
  return dictionary[selectedLanguage]?.[value] || value;
}

async function handleGuidedLogoUpload() {
  const file = guidedLogoUpload.files?.[0];
  if (!file) return;
  guidedState.logoUrl = await fileToDataUrl(file);
  guidedState.hasLogo = true;
  guidedState.hasLogoPhotos = guidedState.hasPhotos ? "Logo and photos uploaded" : "Logo uploaded";
  renderGuidedSummary();
}

async function handleGuidedPhotoUpload() {
  const files = Array.from(guidedPhotoUpload.files || []).filter((file) => file.size > 0);
  if (!files.length) return;
  const urls = [];
  for (const file of files) {
    urls.push(await fileToDataUrl(file));
  }
  guidedState.photoUrls = [...arrayValue(guidedState.photoUrls), ...urls];
  guidedState.hasPhotos = true;
  guidedState.hasLogoPhotos = guidedState.hasLogo ? "Logo and photos uploaded" : "Photos uploaded";
  renderGuidedSummary();
}

function renderAssetPreviews() {
  guidedLogoPreview.src = guidedState.logoUrl || "";
  guidedLogoPreview.classList.toggle("active", Boolean(guidedState.logoUrl));
  guidedPhotoPreview.innerHTML = arrayValue(guidedState.photoUrls)
    .slice(0, 4)
    .map((url) => `<img src="${escapeAttribute(url)}" alt="">`)
    .join("");
}

async function reviewAndGenerateFromGuided() {
  syncGuidedStateFromSummary();
  normalizeGuidedStateBeforeGenerate();
  applyGuidedStateToForm();
  guidedGenerateButton.disabled = true;
  guidedGenerateButton.textContent = "Saving request...";
  guidedStatusText.textContent = t("savingRequest");

  try {
    const saved = await saveGuidedClientRequest();
    if (saved.request_id) currentRequestId = saved.request_id;
    guidedStatusText.textContent =
      saved.storage_status === "stored"
        ? `Client request saved: ${saved.request_number || saved.request_id}`
        : t("requestNotSaved");
  } catch (error) {
    guidedStatusText.textContent = t("requestNotSaved");
  }

  guidedGenerateButton.textContent = t("generating");
  guidedStatusText.textContent = t("generatingLong");
  await generateWebsite(guidedGenerateButton);
  guidedGenerateButton.textContent = t("reviewGenerate");
  guidedGenerateButton.disabled = false;
}

async function handleGuidedGenerateButton() {
  syncGuidedStateFromSummary();
  if (guidedStep !== "review") {
    guidedStep = "review";
    document.body.classList.remove("review-details-open");
    renderGuidedSummary();
    return;
  }
  await reviewAndGenerateFromGuided();
}

function normalizeGuidedStateBeforeGenerate() {
  const services = arrayValue(guidedState.servicesProducts);
  guidedState.businessName = guidedState.businessName || t("newClientWebsite");
  guidedState.industry = guidedState.industry || t("generalBusiness");
  guidedState.businessDescription =
    guidedState.businessDescription ||
    `Professional website for ${guidedState.businessName} focused on ${services.join(", ") || guidedState.industry}.`;
  guidedState.servicesProducts = services.length ? services : [t("featuredOffer"), t("mainService"), t("contactRequest")];
  guidedState.targetAudience = guidedState.targetAudience || t("letAiDecide");
  guidedState.preferredTone = guidedState.preferredTone || t("letAiDecide");
  guidedState.preferredColors = arrayValue(guidedState.preferredColors).length
    ? arrayValue(guidedState.preferredColors)
    : [t("letAiDecide")];
  guidedState.contactInfo = guidedState.contactInfo || {};
  guidedState.salesMode = guidedState.salesMode || t("letAiDecide");
  if (!guidedState.industry || guidedState.industry === t("generalBusiness")) {
    guidedState.industry = inferCommerceIndustry(guidedState);
  }
}

function inferCommerceIndustry(state) {
  const text = [
    state.businessDescription,
    state.salesMode,
    arrayValue(state.servicesProducts).join(" "),
  ]
    .join(" ")
    .toLowerCase();
  if (/(tienda|store|shop|venta|vender|comprar|producto|catalogo|catálogo|online sales|ecommerce|boutique)/.test(text)) {
    return selectedLanguage === "es" ? "Tienda online / ecommerce" : "Online store / ecommerce";
  }
  return t("generalBusiness");
}

async function saveGuidedClientRequest() {
  const response = await fetch(CLIENT_REQUESTS_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(guidedStateForApi()),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return response.json();
}

function importQuickFormToGuidedState() {
  const data = new FormData(form);
  guidedState = {
    ...guidedState,
    businessName: data.get("business_name")?.toString().trim() || guidedState.businessName,
    businessDescription: data.get("business_description")?.toString().trim() || guidedState.businessDescription,
    industry: data.get("industry")?.toString().trim() || guidedState.industry,
    location: data.get("location")?.toString().trim() || guidedState.location,
    servicesProducts: splitCommaOrLines(data.get("services_products")?.toString() || "").length
      ? splitCommaOrLines(data.get("services_products")?.toString() || "")
      : guidedState.servicesProducts,
    targetAudience: data.get("target_audience")?.toString().trim() || guidedState.targetAudience,
    preferredTone: data.get("preferred_tone")?.toString().trim() || guidedState.preferredTone,
    preferredColors: splitCommaOrLines(data.get("preferred_colors")?.toString() || "").length
      ? splitCommaOrLines(data.get("preferred_colors")?.toString() || "")
      : guidedState.preferredColors,
    contactInfo: Object.keys(parseKeyValueLines(data.get("contact_info")?.toString() || "")).length
      ? parseKeyValueLines(data.get("contact_info")?.toString() || "")
      : guidedState.contactInfo,
    logoUrl: data.get("logo_url")?.toString().trim() || guidedState.logoUrl,
    photoUrls: splitLines(data.get("photo_urls")?.toString() || "").length
      ? splitLines(data.get("photo_urls")?.toString() || "")
      : guidedState.photoUrls,
    selectedLanguage,
    hasLogo: Boolean((data.get("logo_url")?.toString().trim() || guidedState.logoUrl)),
    hasPhotos: Boolean(splitLines(data.get("photo_urls")?.toString() || "").length || guidedState.photoUrls.length),
    desiredDomain: data.get("desired_domain")?.toString().trim() || guidedState.desiredDomain,
  };
}

function applyGuidedStateToForm() {
  setInputValue("business_name", guidedState.businessName);
  setInputValue("business_description", guidedState.businessDescription);
  setInputValue("industry", guidedState.industry);
  setInputValue("location", guidedState.location);
  setInputValue("services_products", arrayValue(guidedState.servicesProducts).join("\n"));
  setInputValue("target_audience", guidedState.targetAudience);
  setInputValue("preferred_tone", guidedState.preferredTone);
  setInputValue("preferred_colors", arrayValue(guidedState.preferredColors).join(", "));
  setInputValue("contact_info", contactInfoToLines(guidedState.contactInfo));
  setInputValue("desired_domain", guidedState.desiredDomain);
  setInputValue("logo_url", guidedState.logoUrl);
  setInputValue("photo_urls", arrayValue(guidedState.photoUrls).join("\n"));
}

function renderGuidedSummary() {
  document.querySelectorAll("[data-summary-field]").forEach((field) => {
    const key = field.dataset.summaryField;
    const value = guidedState[key];
    if (key === "selectedLanguage") {
      field.value = selectedLanguage;
    } else if (Array.isArray(value)) {
      field.value = value.join("\n");
    } else if (key === "contactInfo") {
      field.value = contactInfoToLines(value);
    } else {
      field.value = value || "";
    }
  });
  const stepIndex = displayStepIndex(guidedStep);
  const isFinalReview = guidedStep === "review";
  if (isFinalReview && assistantState !== "success") setAssistantState("success");
  guidedStepLabel.textContent = isFinalReview ? t("reviewStep") : `${t("step")} ${stepIndex} ${t("of")} 7`;
  guidedProgressBar.style.width = `${Math.min(100, Math.round((stepIndex / 7) * 100))}%`;
  document.body.classList.toggle("final-review-mode", isFinalReview);
  guidedGenerateButton.textContent = isFinalReview ? t("generateMyWebsite") : t("reviewGenerate");
  currentInfoPreview.textContent = compactCollectedPreview();
  currentInfoMeta.textContent = `${Math.min(100, Math.round((completedFieldCount() / 10) * 100))}%`;
  renderAssetPreviews();
  renderSelectedDomainState();
  saveGuidedDraft();
}

function renderSelectedDomainState() {
  if (!domainCheckStatus || !guidedState.desiredDomain || domainResults?.children.length) return;
  domainCheckStatus.textContent = selectedLanguage === "es"
    ? "Puedes verificar disponibilidad antes de generar."
    : "You can check availability before generating.";
}

async function checkDesiredDomainOptions() {
  syncGuidedStateFromSummary();
  const query = guidedState.desiredDomain || guidedState.businessName || "";
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
    domainCheckStatus.textContent = selectedLanguage === "es"
      ? `No se pudo verificar: ${shortError(error.message)}`
      : `Could not check domain: ${shortError(error.message)}`;
  } finally {
    checkDomainButton.disabled = false;
  }
}

function renderDomainResults(result) {
  const rows = result.results || [];
  domainCheckStatus.textContent = result.exact_availability || result.exactAvailability
    ? t("domainExact")
    : t("domainSuggestions");
  if (!rows.length) {
    domainResults.innerHTML = `<p class="mini-note">${selectedLanguage === "es" ? "No encontramos opciones." : "No options found."}</p>`;
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
      guidedState.desiredDomain = button.dataset.domainChoice;
      renderGuidedSummary();
      domainCheckStatus.textContent = selectedLanguage === "es"
        ? `Dominio seleccionado: ${button.dataset.domainChoice}`
        : `Selected domain: ${button.dataset.domainChoice}`;
    });
  });
}

function domainStatusLabel(item) {
  const status = item.status || "";
  if (status === "available_included") return selectedLanguage === "es" ? "Disponible en el paquete" : "Available in package";
  if (status === "available_requires_review") return selectedLanguage === "es" ? "Disponible, requiere revision" : "Available, needs review";
  if (status === "not_available") return selectedLanguage === "es" ? "No disponible" : "Not available";
  if (status === "needs_registrar_check") return selectedLanguage === "es" ? "Sugerencia, confirmar antes de pagar" : "Suggestion, confirm before payment";
  return status || (selectedLanguage === "es" ? "Opcion sugerida" : "Suggested option");
}

function openReviewDetails() {
  syncGuidedStateFromSummary();
  document.body.classList.add("review-details-open");
  renderGuidedSummary();
}

function keepChatting() {
  document.body.classList.remove("review-details-open", "final-review-mode");
  if (guidedStep === "review") {
    guidedStep = "contactInfo";
    appendChatMessage("assistant", guidedQuestion(guidedStep), "speaking");
  }
  renderGuidedSummary();
}

function displayStepIndex(step) {
  if (["businessName", "businessDescription", "industry"].includes(step)) return 1;
  if (step === "servicesProducts") return 2;
  if (step === "location") return 3;
  if (step === "salesMode") return 4;
  if (["preferredTone", "targetAudience"].includes(step)) return 5;
  if (["preferredColors", "hasLogoPhotos"].includes(step)) return 6;
  return 7;
}

function completedFieldCount() {
  return [
    guidedState.websiteIntent,
    guidedState.businessName,
    guidedState.businessDescription,
    guidedState.industry,
    guidedState.location,
    arrayValue(guidedState.servicesProducts).length,
    guidedState.targetAudience,
    guidedState.preferredTone,
    arrayValue(guidedState.preferredColors).length,
    Object.keys(guidedState.contactInfo || {}).length,
    guidedState.salesMode,
  ].filter(Boolean).length;
}

function compactCollectedPreview() {
  const parts = [
    forcedTemplateSelection?.templateId,
    guidedState.businessName,
    guidedState.industry,
    guidedState.location,
    arrayValue(guidedState.servicesProducts).slice(0, 2).join(", "),
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : t("currentInfo");
}

function syncGuidedStateFromSummary() {
  document.querySelectorAll("[data-summary-field]").forEach((field) => {
    const key = field.dataset.summaryField;
    if (key === "selectedLanguage") {
      setSelectedLanguage(field.value);
    } else if (["servicesProducts", "preferredColors", "photoUrls"].includes(key)) {
      guidedState[key] = splitCommaOrLines(field.value);
    } else if (key === "contactInfo") {
      guidedState[key] = parseKeyValueLines(field.value);
    } else {
      guidedState[key] = field.value.trim();
    }
  });
}

function mergeGuidedUpdates(updates) {
  Object.entries(updates).forEach(([key, value]) => {
    if (!(key in guidedState)) return;
    if (key === "contactInfo") {
      guidedState.contactInfo = { ...guidedState.contactInfo, ...(value || {}) };
    } else if (["servicesProducts", "preferredColors", "photoUrls"].includes(key)) {
      guidedState[key] = arrayValue(value);
    } else {
      guidedState[key] = value || guidedState[key];
    }
  });
}

function guidedStateForApi() {
  const logoUrl = isCloudSafeUrl(guidedState.logoUrl) ? guidedState.logoUrl : "";
  const photoUrls = arrayValue(guidedState.photoUrls).filter(isCloudSafeUrl);
  return {
    businessName: guidedState.businessName,
    businessDescription: guidedState.businessDescription,
    industry: guidedState.industry,
    location: guidedState.location,
    servicesProducts: arrayValue(guidedState.servicesProducts),
    targetAudience: guidedState.targetAudience,
    preferredTone: guidedState.preferredTone,
    preferredColors: arrayValue(guidedState.preferredColors),
    contactInfo: guidedState.contactInfo || {},
    desiredDomain: guidedState.desiredDomain,
    logoUrl,
    photoUrls,
    selectedLanguage,
    hasLogo: Boolean(guidedState.hasLogo || guidedState.logoUrl),
    hasPhotos: Boolean(guidedState.hasPhotos || arrayValue(guidedState.photoUrls).length),
    salesMode: guidedState.salesMode,
    hasLogoPhotos: guidedState.hasLogoPhotos,
    sectionsPreference: guidedState.sectionsPreference,
    source: "ai_guided_setup",
    status: "ready_to_generate",
  };
}

function isCloudSafeUrl(value) {
  const text = String(value || "");
  return Boolean(text) && !text.startsWith("data:");
}

function appendChatMessage(role, message, emotion = "neutral") {
  const bubble = document.createElement("div");
  const state = role === "user" ? "neutral" : normalizeAssistantState(emotion);
  bubble.className = `chat-message ${role} state-${state}`;
  if (role === "assistant" || role === "system") {
    setAssistantState(state);
    const avatar = document.createElement("img");
    avatar.className = "assistant-avatar tiny";
    avatar.src = ASSISTANT_AVATARS[state] || ASSISTANT_AVATAR_FALLBACK;
    avatar.onerror = () => {
      avatar.onerror = null;
      avatar.src = ASSISTANT_AVATAR_FALLBACK;
    };
    avatar.dataset.state = state;
    avatar.alt = "";
    const text = document.createElement("span");
    text.textContent = message;
    bubble.append(avatar, text);
    speakAssistantMessage(message);
  } else {
    bubble.textContent = message;
  }
  guidedChat.appendChild(bubble);
  guidedChat.scrollTop = guidedChat.scrollHeight;
}

function setThinking(active) {
  guidedThinking.classList.toggle("active", active);
  if (active) {
    setAssistantState("thinking");
  } else if (assistantState === "thinking") {
    setAssistantState(guidedStep === "review" ? "success" : "neutral");
  }
}

function nextGuidedStep(step) {
  const index = GUIDED_STEPS.indexOf(step);
  return GUIDED_STEPS[Math.min((index < 0 ? 0 : index) + 1, GUIDED_STEPS.length - 1)];
}

function inferGuidedUpdates(step, message) {
  if (step === "servicesProducts") return { servicesProducts: splitCommaOrLines(message) };
  if (step === "preferredColors") return { preferredColors: splitCommaOrLines(message) };
  if (step === "contactInfo") return { contactInfo: parseKeyValueLines(message.includes(":") ? message : `notes: ${message}`) };
  const keyByStep = {
    websiteIntent: "websiteIntent",
    businessName: "businessName",
    businessDescription: "businessDescription",
    industry: "industry",
    location: "location",
    targetAudience: "targetAudience",
    preferredTone: "preferredTone",
    salesMode: "salesMode",
    hasLogoPhotos: "hasLogoPhotos",
    desiredDomain: "desiredDomain",
  };
  return keyByStep[step] ? { [keyByStep[step]]: message } : {};
}

function contactInfoToLines(value) {
  return Object.entries(value || {})
    .filter(([, item]) => item)
    .map(([key, item]) => `${key}: ${item}`)
    .join("\n");
}

function arrayValue(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  return splitCommaOrLines(String(value));
}

function shortError(message) {
  return String(message || "").slice(0, 180);
}

async function readErrorMessage(response) {
  const text = await response.text();
  try {
    const data = JSON.parse(text);
    return data.detail || data.message || text;
  } catch {
    return text;
  }
}

async function generateWebsite(triggerButton = document.querySelector("#generateButton")) {
  const payload = await collectPayload();
  const templateSelection = await selectTemplateForPayload(payload);
  attachTemplateSelection(payload, templateSelection);
  const button = triggerButton;
  button.disabled = true;
  button.textContent = t("generating");
  statusText.textContent = t("generatingLong");
  if (isPublicClientSetup) guidedStatusText.textContent = t("generatingLong");
  builderAvatarManager?.setState("thinking", { source: "generate-website" });

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const error = await readErrorMessage(response);
      throw new Error(error || "Website generation failed.");
    }

    const result = await response.json();
    if (templateSelection) {
      result.schema = mergeTemplateSelectionIntoSchema(result.schema, templateSelection);
    }
    statusText.textContent = result.used_dev_mock
      ? "Development mock used because OPENAI_API_KEY is missing on the server."
      : t("generatedOpenAI");
    applyGenerationResult(result);
    await createDomainOrderIfNeeded(payload, result);
  } catch (error) {
    builderAvatarManager?.setState("confused", { source: "generate-error" });
    const fallbackResult = buildInstantTemplateResult(payload, error, templateSelection);
    applyGenerationResult(fallbackResult);
    const message = `${t("generateError")}: ${shortError(error.message)}. Showing a fast editable draft instead.`;
    statusText.textContent = message;
    guidedStatusText.textContent = message;
  } finally {
    button.disabled = false;
    button.textContent = button.id === "guidedGenerateButton" ? t("reviewGenerate") : t("generateButton");
  }
}

async function createDomainOrderIfNeeded(payload, result) {
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
      clientRequestId: currentRequestId,
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
      guidedStatusText.textContent = selectedLanguage === "es"
        ? "Pagina generada. Dominio guardado para revisar/pagar antes de registrarlo."
        : "Website generated. Domain saved for review/payment before registration.";
    }
  } catch (error) {
    console.warn("Domain order could not be saved", error);
    guidedStatusText.textContent = selectedLanguage === "es"
      ? "Pagina generada. No se pudo guardar la orden de dominio; puedes hacerlo desde admin."
      : "Website generated. Could not save the domain order; you can do it from admin.";
  }
}

async function selectTemplateForPayload(payload) {
  if (!window.TemplateRouter?.selectTemplateFromPrompt) return null;
  if (forcedTemplateSelection?.templateId && window.TemplateRouter.getTemplateById) {
    const template = await window.TemplateRouter.getTemplateById(forcedTemplateSelection.templateId);
    if (template) {
      return {
        ...forcedTemplateSelection,
        template,
        catalogType: forcedTemplateSelection.catalogType || template.catalogModel?.catalogType || "",
      };
    }
  }
  const prompt = [
    payload.business_name,
    payload.business_description,
    payload.industry,
    arrayValue(payload.services_products).join(" "),
    payload.target_audience,
    payload.preferred_tone,
    arrayValue(payload.preferred_colors).join(" "),
  ].join(" ");
  try {
    return await window.TemplateRouter.selectTemplateFromPrompt(prompt);
  } catch (error) {
    console.warn("Template selection failed", error);
    return null;
  }
}

function attachTemplateSelection(payload, selection) {
  if (!selection) return payload;
  payload.templateId = selection.templateId;
  payload.templateIntent = selection.intent;
  payload.catalogType = selection.catalogType;
  payload.selectedTemplate = selection.template || {};
  return payload;
}

function mergeTemplateSelectionIntoSchema(schema, selection) {
  if (!schema || !selection) return schema;
  schema.selected_template = {
    id: selection.templateId,
    name: selection.template?.name || selection.templateId,
    category: selection.template?.category || "",
    intent: selection.intent,
    reason: selection.reason,
    visualDifference: selection.template?.visualDifference || "",
    clientSelectionCard: selection.template?.clientSelectionCard || {},
    sections: selection.template?.sections || [],
    pages: selection.template?.pages || [],
  };
  schema.catalog_model = selection.template?.catalogModel || { catalogType: selection.catalogType };
  schema.layout_mode = {
    ...(schema.layout_mode || {}),
    template_id: selection.templateId,
    catalog_type: selection.catalogType,
    intent: selection.intent,
  };
  return schema;
}

function applyGenerationResult(result) {
  currentSchema = result.schema;
  currentSiteId = result.site_id || null;
  currentBusinessId = result.business_id || null;
  currentGenerationId = result.generation_id || null;
  currentCatalogItems = catalogItemsFromSchema(currentSchema);
  selectedPageKey = currentSchema.pages[0]?.page_key || "home";
  selectedVariantId = currentSchema.design_variants?.[0]?.id || "";
  saveGeneratedSite(result);
  siteTitle.textContent = currentSchema.business.name;
  storageStatus.textContent = storageLabel(result.storage_status, result.used_dev_mock);
  renderEditor();
  renderPreview();
  showGeneratedClientPreview();
  builderAvatarManager?.setState("success", { source: "preview-generated" });
}

function buildInstantTemplateResult(payload, error, templateSelection) {
  const schema = buildInstantTemplateSchema(payload, templateSelection);
  return {
    business_id: null,
    site_id: null,
    generation_id: null,
    storage_status: "instant_template_fallback",
    schema,
    used_dev_mock: false,
    error: String(error?.message || error || ""),
  };
}

function buildInstantTemplateSchema(payload, templateSelection) {
  const language = payload.selectedLanguage || selectedLanguage || "en";
  const isSpanish = language === "es";
  const template = templateSelection?.template || payload.selectedTemplate || {};
  const catalogType = templateSelection?.catalogType || template.catalogModel?.catalogType || payload.catalogType || "editorial_minimal_grid";
  const name = payload.business_name || (isSpanish ? "Nueva tienda" : "New store");
  const description = payload.business_description || (isSpanish ? "Una marca preparada para vender en linea." : "A brand ready to sell online.");
  const products = arrayValue(payload.services_products).length
    ? arrayValue(payload.services_products)
    : isSpanish
      ? ["Producto destacado", "Servicio principal", "Oferta especial"]
      : ["Featured product", "Main service", "Special offer"];
  const colors = chooseInstantPalette(payload);
  const catalogItems = products.map((item, index) => ({
    id: `instant_${index + 1}`,
    name: item,
    description: isSpanish
      ? `Una opcion destacada de ${name}, lista para presentar al cliente con detalles, beneficios y llamada a la accion.`
      : `A featured option from ${name}, ready to present with details, benefits, and a clear call to action.`,
    price_label: isSpanish ? "Consultar precio" : "Ask for price",
    button_label: isSpanish ? "Solicitar" : "Request",
    image_url: "",
    is_active: true,
    is_featured: index < 3,
    sort_order: index,
  }));
  return {
    schema_version: "1.0",
    site_type: "online_store",
    business: {
      name,
      description,
      industry: payload.industry || (isSpanish ? "Tienda online" : "Online store"),
      location: payload.location || "",
      target_audience: payload.target_audience || "",
      tone: payload.preferred_tone || (isSpanish ? "Profesional y cercano" : "Professional and friendly"),
      selectedLanguage: language,
    },
    theme: {
      colors,
      fonts: { heading: "Inter", body: "Inter" },
      buttons: {
        primary_label: isSpanish ? "Comprar ahora" : "Shop now",
        secondary_label: isSpanish ? "Ver catalogo" : "View catalog",
      },
      radius: 10,
    },
    layout_mode: {
      id: template.id || "instant_storefront",
      template_id: template.id || "",
      catalog_type: catalogType,
      intent: templateSelection?.intent || payload.templateIntent || "",
      navigation: { show_cart: true, show_header: true, sticky_header: true },
      checkout: { mode: "quote_or_cart", primary_action: isSpanish ? "Solicitar pedido" : "Request order" },
    },
    integrations: { contact: { whatsapp_enabled: true, email_enabled: true }, analytics: { enabled: false, provider: "" }, payments: { enabled: false, mode: "setup_required" } },
    custom_logic: { enabled: false, risk_level: "restricted", automations: "" },
    navigation: [
      { label: isSpanish ? "Inicio" : "Home", page_key: "home" },
      { label: isSpanish ? "Tienda" : "Shop", page_key: "catalog" },
      { label: isSpanish ? "Nosotros" : "About", page_key: "about" },
      { label: isSpanish ? "Contacto" : "Contact", page_key: "contact" },
    ],
    pages: [
      {
        page_key: "home",
        title: isSpanish ? "Inicio" : "Home",
        slug: "/",
        order: 1,
        sections: [
          {
            id: "hero",
            type: "Hero",
            order: 1,
            editable: {
              headline: name,
              subtitle: description,
              primary_button: isSpanish ? "Ver tienda" : "View shop",
              secondary_button: isSpanish ? "Contactar" : "Contact",
              image_url: payload.assets?.find((asset) => asset.asset_type === "photo")?.url || "",
              images: [],
            },
            settings: { layout: "split_showcase" },
          },
          {
            id: "featured",
            type: "ProductGrid",
            order: 2,
            editable: {
              title: isSpanish ? "Productos destacados" : "Featured products",
              text: isSpanish ? "Una seleccion inicial para mostrar la oferta del negocio." : "An initial selection to show the business offer.",
              images: [],
            },
            settings: { layout: "featured", columns: 3 },
          },
        ],
      },
      {
        page_key: "catalog",
        title: isSpanish ? "Tienda" : "Shop",
        slug: isSpanish ? "/tienda" : "/shop",
        order: 2,
        sections: [
          {
            id: "catalog_grid",
            type: "ProductGrid",
            order: 1,
            editable: {
              title: isSpanish ? "Catalogo" : "Catalog",
              text: isSpanish ? "Productos y servicios listos para editar, activar y publicar." : "Products and services ready to edit, activate, and publish.",
              images: [],
            },
            settings: { layout: "grid", columns: 3 },
          },
        ],
      },
      {
        page_key: "about",
        title: isSpanish ? "Nosotros" : "About",
        slug: isSpanish ? "/nosotros" : "/about",
        order: 3,
        sections: [{ id: "about", type: "About", order: 1, editable: { title: isSpanish ? "Sobre la marca" : "About the brand", text: description }, settings: { layout: "feature" } }],
      },
      {
        page_key: "contact",
        title: isSpanish ? "Contacto" : "Contact",
        slug: isSpanish ? "/contacto" : "/contact",
        order: 4,
        sections: [{ id: "contact", type: "Contact", order: 1, editable: { title: isSpanish ? "Hablemos" : "Let us talk", text: isSpanish ? "Contacta al negocio para comprar, cotizar o solicitar informacion." : "Contact the business to buy, quote, or request information." }, settings: { layout: "simple" } }],
      },
    ],
    global_components: {
      logo_url: payload.assets?.find((asset) => asset.asset_type === "logo")?.url || "",
      footer_text: isSpanish ? `${name} - Pagina generada como borrador editable.` : `${name} - Editable draft website.`,
    },
    selected_template: {
      id: template.id || "",
      name: template.name || "",
      category: template.category || "",
      intent: templateSelection?.intent || "",
      reason: templateSelection?.reason || "",
      visualDifference: template.visualDifference || "",
      clientSelectionCard: template.clientSelectionCard || {},
      sections: template.sections || [],
      pages: template.pages || [],
    },
    catalog_model: template.catalogModel || { catalogType },
    design_variants: [
      {
        id: "instant-modern",
        name: template.name || (isSpanish ? "Moderno comercial" : "Modern commercial"),
        description: template.visualDifference || (isSpanish ? "Base rapida, limpia y editable para validar la tienda." : "Fast, clean, editable base to validate the store."),
        theme: { colors, fonts: { heading: "Inter", body: "Inter" }, buttons: { primary_label: isSpanish ? "Comprar ahora" : "Shop now", secondary_label: isSpanish ? "Contactar" : "Contact" }, radius: 10 },
        layout_mode_id: template.id || "instant_storefront",
        hero_layout: "split_showcase",
        product_layout: catalogType,
      },
    ],
    products_services: catalogItems,
    catalog_items: catalogItems,
    contact: payload.contact_info || {},
    editable_fields: ["headline", "subtitle", "title", "text", "primary_button", "secondary_button", "image_url", "images"],
  };
}

function chooseInstantPalette(payload) {
  const preferred = arrayValue(payload.preferred_colors).join(" ").toLowerCase();
  const allText = [
    preferred,
    payload.preferred_tone,
    payload.business_description,
    payload.industry,
  ].join(" ").toLowerCase();
  if (/cyberpunk|neon|neón|futurista|gaming|gamer|super cool/.test(allText)) {
    return { background: "#070714", surface: "#111126", primary: "#00f5ff", secondary: "#ff2bd6", text: "#f8fbff", muted: "#9ca3ff" };
  }
  if (/pink|rosa|boutique|fashion|moda|beauty|belleza/.test(allText)) {
    return { background: "#fff7fb", surface: "#ffffff", primary: "#c0266c", secondary: "#fde7f1", text: "#1f1720", muted: "#7a6670" };
  }
  if (/tech|tecnologia|technology|software|digital/.test(allText)) {
    return { background: "#f5fbff", surface: "#ffffff", primary: "#155eef", secondary: "#e0f2fe", text: "#111827", muted: "#64748b" };
  }
  return { background: "#f8fafc", surface: "#ffffff", primary: "#0e7c66", secondary: "#e3f3ee", text: "#101828", muted: "#667085" };
}

function showGeneratedClientPreview() {
  if (!isPublicClientSetup) return;
  if (isEmbeddedClientSetup) {
    window.parent.postMessage({ type: "luma-generated-preview" }, "*");
  }
  document.body.classList.add("generated-preview-open", "client-preview-mode");
  document.body.classList.remove("review-details-open", "final-review-mode", "manual-form-open");
  guidedPanel.classList.remove("active");
  storageStatus.textContent = currentSiteId ? t("generatedOpenAI") : t("generatedOpenAI");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function submitGeneratedDraftForReview() {
  if (!currentSchema) {
    storageStatus.textContent = selectedLanguage === "es" ? "Primero genera un borrador." : "Generate a draft first.";
    return;
  }
  if (!currentSiteId) {
    storageStatus.textContent =
      selectedLanguage === "es"
        ? "El borrador rapido se ve aqui, pero no tiene site_id para revisión todavía."
        : "The fast draft is visible here, but it does not have a site_id for review yet.";
    return;
  }
  const contact = guidedState.contactInfo || {};
  const customerName = guidedState.businessName || currentSchema.business?.name || "Client";
  const message =
    selectedLanguage === "es"
      ? `Cliente envió borrador para revisión.\nNegocio: ${customerName}\nIndustria: ${guidedState.industry || ""}\nDominio deseado: ${guidedState.desiredDomain || ""}\nSite ID: ${currentSiteId}`
      : `Client submitted draft for review.\nBusiness: ${customerName}\nIndustry: ${guidedState.industry || ""}\nDesired domain: ${guidedState.desiredDomain || ""}\nSite ID: ${currentSiteId}`;
  submitDraftReviewButton.disabled = true;
  submitDraftReviewButton.textContent = selectedLanguage === "es" ? "Enviando..." : "Sending...";
  try {
    const response = await fetch(`${API_BASE_URL}/public/leads`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        siteId: currentSiteId,
        businessId: currentBusinessId,
        customerName,
        email: contact.email || contact.correo || "",
        phone: contact.phone || contact.whatsapp || "",
        message,
        source: "client_generated_draft_review",
      }),
    });
    if (!response.ok) throw new Error(await readErrorMessage(response));
    storageStatus.textContent = selectedLanguage === "es"
      ? "Enviado para revisión. Tu solicitud ya aparece en el admin."
      : "Sent for review. Your request is now visible in admin.";
    if (isEmbeddedClientSetup) {
      window.parent.postMessage({ type: "luma-draft-submitted", siteId: currentSiteId }, "*");
    }
  } catch (error) {
    storageStatus.textContent = `${selectedLanguage === "es" ? "No se pudo enviar" : "Could not send"}: ${shortError(error.message)}`;
  } finally {
    submitDraftReviewButton.disabled = false;
    submitDraftReviewButton.textContent = selectedLanguage === "es" ? "Enviar para revisión" : "Send for review";
  }
}

function adjustGeneratedDraftWithLuma() {
  document.body.classList.remove("generated-preview-open", "client-preview-mode");
  guidedPanel.classList.add("active");
  document.body.classList.add("guided-modal-open");
  guidedStep = "review";
  const message = selectedLanguage === "es"
    ? "Claro. Dime qué quieres cambiar del borrador: colores, secciones, textos, productos, estilo o cualquier detalle. Luego genero una nueva versión con esos ajustes."
    : "Of course. Tell me what you want to change in the draft: colors, sections, copy, products, style, or any detail. Then I can generate a new version with those adjustments.";
  appendChatMessage("assistant", message, "thinking");
  guidedStatusText.textContent = selectedLanguage === "es"
    ? "Describe los ajustes que quieres hacer."
    : "Describe the adjustments you want.";
  guidedReply.focus();
  if (isEmbeddedClientSetup) {
    window.parent.postMessage({ type: "luma-adjusting-draft" }, "*");
  }
}

async function collectPayload() {
  const data = new FormData(form);
  const contactInfo = parseKeyValueLines(data.get("contact_info")?.toString() || "");
  const logoUrl = data.get("logo_url")?.toString().trim();
  const photoUrls = splitLines(data.get("photo_urls")?.toString() || "");
  const assets = [];

  if (logoUrl) {
    assets.push({ asset_type: "logo", label: "Logo", url: logoUrl });
  }
  photoUrls.forEach((url, index) => {
    assets.push({ asset_type: "photo", label: `Photo ${index + 1}`, url });
  });

  const logoFile = data.get("logo_file");
  if (logoFile instanceof File && logoFile.size > 0) {
    assets.push({ asset_type: "logo", label: "Uploaded logo", url: await uploadAssetOrFallback(logoFile, "logo", "Uploaded logo") });
  }

  const photoFiles = data.getAll("photo_files").filter((file) => file instanceof File && file.size > 0);
  for (const [index, file] of photoFiles.entries()) {
    assets.push({ asset_type: "photo", label: `Uploaded photo ${index + 1}`, url: await uploadAssetOrFallback(file, "photo", `Uploaded photo ${index + 1}`) });
  }

  return {
    business_name: data.get("business_name")?.toString().trim(),
    business_description: data.get("business_description")?.toString().trim(),
    industry: data.get("industry")?.toString().trim(),
    location: data.get("location")?.toString().trim(),
    services_products: splitCommaOrLines(data.get("services_products")?.toString() || ""),
    target_audience: data.get("target_audience")?.toString().trim(),
    preferred_tone: data.get("preferred_tone")?.toString().trim(),
    preferred_colors: splitCommaOrLines(data.get("preferred_colors")?.toString() || ""),
    contact_info: contactInfo,
    desiredDomain: data.get("desired_domain")?.toString().trim() || guidedState.desiredDomain || "",
    selectedLanguage,
    request_id: currentRequestId,
    catalog_items: catalogItemsFromForm(),
    assets,
  };
}

async function saveCurrentSchema() {
  if (!currentSchema) {
    storageStatus.textContent = "Generate a site before saving.";
    return;
  }
  if (!currentSiteId) {
    storageStatus.textContent = "Cannot save: database did not return a site id.";
    return;
  }
  const response = await fetch(`${API_BASE_URL}/sites/${currentSiteId}/schema`, {
    method: "PUT",
    headers: adminHeaders({ "content-type": "application/json" }),
    body: JSON.stringify({ schema: currentSchema, catalog_items: catalogItemsForApi() }),
  });
  if (response.status === 401) {
    storageStatus.textContent = "Admin token required to save.";
    return;
  }
  const result = await response.json();
  storageStatus.textContent = result.storage_status === "stored" ? "Saved to database" : result.storage_status;
}

async function publishCurrentSite() {
  if (!currentSchema) {
    storageStatus.textContent = "Generate a site before publishing.";
    return;
  }
  if (!currentSiteId) {
    storageStatus.textContent = "Cannot publish: database did not return a site id.";
    return;
  }
  const response = await fetch(`${API_BASE_URL}/sites/${currentSiteId}/publish`, {
    method: "POST",
    headers: adminHeaders({ "content-type": "application/json" }),
    body: JSON.stringify({ schema: currentSchema, catalog_items: catalogItemsForApi() }),
  });
  if (response.status === 401) {
    storageStatus.textContent = "Admin token required to publish.";
    return;
  }
  const result = await response.json();
  storageStatus.innerHTML = result.public_url
    ? `Published · <a href="${escapeAttribute(result.public_url)}" target="_blank" rel="noreferrer">Open public URL</a>`
    : result.storage_status;
}

function storageLabel(status, usedDevMock) {
  const mockLabel = usedDevMock ? " · development mock" : "";
  if (status === "stored") return `Saved draft to database${mockLabel}`;
  if (status === "supabase_not_configured") return `Generated, database not configured${mockLabel}`;
  if (status === "instant_template_fallback") return "Fast editable draft shown while AI generation is unavailable";
  return `${status}${mockLabel}`;
}

function hydrateFromSelectedRequest() {
  const raw = sessionStorage.getItem("selectedClientRequest");
  if (!raw) return;
  try {
    const request = JSON.parse(raw);
    currentRequestId = request.id;
    if (request.selectedLanguage || request.selected_language) {
      setSelectedLanguage(request.selectedLanguage || request.selected_language);
    }
    setInputValue("business_name", request.client);
    setInputValue("industry", request.industry);
    setInputValue("location", request.location || "");
    setInputValue("business_description", request.description || "");
    setInputValue("services_products", (request.products || []).join("\n"));
    setInputValue("target_audience", request.budget || "");
    setInputValue("preferred_tone", request.tone || "");
    setInputValue("preferred_colors", (request.colors || []).join(", "));
    setInputValue(
      "contact_info",
      [
        `email: ${request.contact || ""}`,
        `phone: ${request.phone || ""}`,
        `instagram: ${request.social?.instagram || ""}`,
      ].join("\n"),
    );
    statusText.textContent = `Loaded request ${request.id}.`;
  } catch {
    statusText.textContent = "Could not load selected request.";
  }
}

function setInputValue(name, value) {
  const field = form.elements.namedItem(name);
  if (!field) return;
  field.value = value;
}

function catalogItemsFromForm() {
  return splitCommaOrLines(new FormData(form).get("services_products")?.toString() || "").map((name, index) => ({
    id: `seed_${index + 1}`,
    name,
    description: "",
    price_type: "quote_only",
    price_value: null,
    price_label: "Ask for pricing",
    image_url: "",
    button_label: "Request info",
    is_active: true,
    is_featured: index < 3,
    sort_order: index + 1,
  }));
}

function catalogItemsFromSchema(schema) {
  return (schema.products_services || []).map((item, index) => ({
    id: item.id || `catalog_${index + 1}`,
    name: item.name || "Catalog item",
    description: item.description || "",
    price_type: item.price_type || "quote_only",
    price_value: item.price_value ?? null,
    price_label: item.price_label || "",
    image_url: item.image_url || "",
    button_label: item.button_label || "Request info",
    is_active: item.is_active !== false,
    is_featured: item.is_featured ?? index < 3,
    sort_order: item.sort_order || index + 1,
  }));
}

function catalogItemsForApi() {
  return currentCatalogItems.map((item, index) => ({
    ...item,
    price_value: item.price_value === "" || item.price_value === undefined ? null : Number(item.price_value),
    sort_order: item.sort_order || index + 1,
    is_active: item.is_active !== false,
    is_featured: Boolean(item.is_featured),
  }));
}

function renderEditor() {
  if (!currentSchema) return;
  const pageOptions = currentSchema.pages
    .map(
      (page) =>
        `<option value="${escapeAttribute(page.page_key)}" ${page.page_key === selectedPageKey ? "selected" : ""}>${escapeHtml(page.title)}</option>`,
    )
    .join("");

  editorMount.innerHTML = `
    <div class="editor-group">
      <h3>Design options</h3>
      <div class="variant-grid">${designVariantCards()}</div>
    </div>
    <div class="editor-group">
      <label>Editing page<select id="pageSelector">${pageOptions}</select></label>
      <div class="row-actions">
        <button class="small-button" data-move-page="up">Move page up</button>
        <button class="small-button" data-move-page="down">Move page down</button>
      </div>
    </div>
    <div class="editor-group">
      <h3>Brand</h3>
      ${inputField("Business name", "business.name", currentSchema.business.name)}
      ${textareaField("Description", "business.description", currentSchema.business.description)}
      ${inputField("Logo URL", "global_components.logo_url", currentSchema.global_components.logo_url || "")}
    </div>
    <div class="editor-group">
      <h3>Colors</h3>
      ${inputField("Background", "theme.colors.background", currentSchema.theme.colors.background)}
      ${inputField("Primary", "theme.colors.primary", currentSchema.theme.colors.primary)}
      ${inputField("Secondary", "theme.colors.secondary", currentSchema.theme.colors.secondary)}
      ${inputField("Text", "theme.colors.text", currentSchema.theme.colors.text)}
    </div>
    <div class="editor-group">
      <h3>Contact</h3>
      ${Object.entries(currentSchema.contact || {})
        .map(([key, value]) => inputField(key, `contact.${key}`, value))
        .join("")}
    </div>
    <div class="editor-group">
      <h3>Catalog Manager</h3>
      <p class="mini-note">The public site renders products from catalog_items, not hardcoded page JSON.</p>
      ${currentCatalogItems.map(catalogItemEditor).join("")}
      <button class="small-button" id="addCatalogItemButton" type="button">Add catalog item</button>
    </div>
    <div class="editor-group">
      <h3>Sections</h3>
      ${selectedPage().sections.map(sectionEditor).join("")}
      <button class="small-button" id="addSectionButton" type="button">Add section</button>
    </div>
  `;

  editorMount.querySelector("#pageSelector").addEventListener("change", (event) => {
    selectedPageKey = event.target.value;
    renderEditor();
    renderPreview();
  });

  editorMount.querySelectorAll("[data-variant-id]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedVariantId = button.dataset.variantId;
      renderEditor();
      renderPreview();
    });
  });

  editorMount.querySelectorAll("[data-path]").forEach((input) => {
    input.addEventListener("input", () => {
      setPath(currentSchema, input.dataset.path, normalizeEditedValue(input.dataset.path, input.value));
      renderPreview();
    });
  });

  editorMount.querySelectorAll("[data-catalog-path]").forEach((input) => {
    input.addEventListener("input", () => {
      const value = input.type === "checkbox" ? input.checked : input.value;
      setPath({ catalog_items: currentCatalogItems }, input.dataset.catalogPath, value);
      renderPreview();
    });
  });

  editorMount.querySelectorAll("[data-catalog-image-upload]").forEach((input) => {
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      const imageUrl = await uploadAssetOrFallback(file, "catalog", "Catalog item image");
      setPath({ catalog_items: currentCatalogItems }, input.dataset.catalogImageUpload, imageUrl);
      renderEditor();
      renderPreview();
    });
  });

  editorMount.querySelectorAll("[data-remove-catalog-item]").forEach((button) => {
    button.addEventListener("click", () => {
      currentCatalogItems = currentCatalogItems.filter((item) => item.id !== button.dataset.removeCatalogItem);
      resequenceCatalog();
      renderEditor();
      renderPreview();
    });
  });

  editorMount.querySelectorAll("[data-move-catalog-item]").forEach((button) => {
    button.addEventListener("click", () => {
      moveCatalogItem(button.dataset.moveCatalogItem, button.dataset.direction);
      renderEditor();
      renderPreview();
    });
  });

  editorMount.querySelectorAll("[data-section-path]").forEach((input) => {
    input.addEventListener("input", () => {
      setPath(currentSchema, input.dataset.sectionPath, normalizeEditedValue(input.dataset.sectionPath, input.value));
      renderPreview();
    });
  });

  editorMount.querySelectorAll("[data-remove-section]").forEach((button) => {
    button.addEventListener("click", () => {
      const page = selectedPage();
      page.sections = page.sections.filter((section) => section.id !== button.dataset.removeSection);
      resequence(page.sections);
      renderEditor();
      renderPreview();
    });
  });

  editorMount.querySelector("#addSectionButton").addEventListener("click", () => {
    const page = selectedPage();
    page.sections.push({
      id: `section_${Date.now()}`,
      type: "FeatureBand",
      order: page.sections.length + 1,
      editable: { title: "New section", text: "Edit this content." },
      settings: {},
    });
    renderEditor();
    renderPreview();
  });

  editorMount.querySelector("#addCatalogItemButton").addEventListener("click", () => {
    currentCatalogItems.push({
      id: `catalog_${Date.now()}`,
      name: "New item",
      description: "Edit this product or service.",
      price_type: "quote_only",
      price_value: "",
      price_label: "Ask for pricing",
      image_url: "",
      button_label: "Request info",
      is_active: true,
      is_featured: false,
      sort_order: currentCatalogItems.length + 1,
    });
    renderEditor();
    renderPreview();
  });

  editorMount.querySelectorAll("[data-move-page]").forEach((button) => {
    button.addEventListener("click", () => {
      movePage(button.dataset.movePage);
      renderEditor();
      renderPreview();
    });
  });
}

function renderPreview() {
  if (!currentSchema) return;
  previewFrame.innerHTML = renderWebsite(schemaForPreview(), selectedPageKey);
  previewFrame.querySelectorAll("[data-page-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      selectedPageKey = link.dataset.pageLink;
      renderEditor();
      renderPreview();
    });
  });
}

function designVariantCards() {
  const variants = currentSchema.design_variants || [];
  if (!variants.length) {
    return `<p class="empty">Generate again to receive 3 AI design options.</p>`;
  }
  return variants
    .map(
      (variant, index) => {
        const preset = TEMPLATE_PRESETS[index % TEMPLATE_PRESETS.length];
        return `<button class="variant-card ${variant.id === selectedVariantId ? "active" : ""}" data-variant-id="${escapeAttribute(variant.id)}" type="button">
        <span class="variant-swatch" style="background:${resolveColor(variant.theme?.colors?.primary, "#008060")}"></span>
        <strong>${escapeHtml(variant.name)}</strong>
        <small>${escapeHtml(preset.name)} · ${escapeHtml(variant.description)}</small>
      </button>`;
      },
    )
    .join("");
}

function schemaForPreview() {
  const variant = selectedVariant();
  if (!variant) return ensureStorefrontExperience(structuredClone(currentSchema));
  const preset = selectedTemplatePreset();
  const schema = structuredClone(currentSchema);
  schema.theme = variant.theme || schema.theme;
  if (Array.isArray(currentCatalogItems) && currentCatalogItems.length) {
    schema.catalog_items = currentCatalogItems;
  }
  schema.layout_mode = { ...schema.layout_mode, id: variant.layout_mode_id || schema.layout_mode?.id };
  schema.active_design_variant = variant;
  schema.active_template = preset;
  schema.pages = schema.pages.map((page) => ({
    ...page,
    sections: page.sections.map((section) => {
      if (section.type === "Hero") {
        return { ...section, settings: { ...section.settings, layout: preset.heroLayout || variant.hero_layout || section.settings?.layout || "image_right" } };
      }
      if (["ProductGrid", "ServiceList"].includes(section.type)) {
        return {
          ...section,
          settings: {
            ...section.settings,
            layout: preset.productLayout || variant.product_layout || section.settings?.layout || "grid",
            spacing: section.settings?.spacing || preset.density,
          },
        };
      }
      return section;
    }),
  }));
  return ensureStorefrontExperience(schema);
}

function ensureStorefrontExperience(schema) {
  if (!schema) return schema;
  schema.pages = Array.isArray(schema.pages) ? schema.pages : [];
  schema.navigation = Array.isArray(schema.navigation) ? schema.navigation : [];
  schema.catalog_items = normalizePreviewCatalogItems(schema);
  const catalogItems = schema.catalog_items.filter((item) => item.is_active !== false);
  if (!catalogItems.length) return schema;

  const language = schema.business?.selectedLanguage || selectedLanguage || "en";
  const labels = {
    en: { nav: "Shop", title: "Shop", subtitle: "Explore the products and options available from this business." },
    es: { nav: "Tienda", title: "Tienda", subtitle: "Explora los productos y opciones disponibles para comprar o solicitar." },
    fr: { nav: "Boutique", title: "Boutique", subtitle: "Decouvrez les produits et options disponibles." },
    pt: { nav: "Loja", title: "Loja", subtitle: "Explore os produtos e opcoes disponiveis." },
  }[language] || { nav: "Shop", title: "Shop", subtitle: "Explore the products and options available from this business." };

  let catalogPage = schema.pages.find((page) =>
    /catalog|shop|store|tienda|boutique|loja|products|productos|produits|produtos|services|servicios/i.test(
      `${page.page_key || ""} ${page.title || ""} ${page.slug || ""}`,
    ),
  );
  if (!catalogPage) {
    catalogPage = {
      page_key: "catalog",
      title: labels.title,
      slug: language === "es" ? "/tienda" : "/shop",
      order: schema.pages.length + 1,
      sections: [],
    };
    schema.pages.push(catalogPage);
  }
  catalogPage.sections = Array.isArray(catalogPage.sections) ? catalogPage.sections : [];

  const hasCatalogSection = catalogPage.sections.some((section) => ["ProductGrid", "ServiceList"].includes(section.type));
  if (!hasCatalogSection) {
    catalogPage.sections.unshift({
      id: "catalog_auto",
      type: "ProductGrid",
      order: 1,
      editable: {
        title: labels.title,
        headline: labels.title,
        subtitle: labels.subtitle,
        text: labels.subtitle,
        primary_button: "",
        secondary_button: "",
        image_url: "",
        images: [],
      },
      settings: { layout: "grid", source: "catalog", columns: 3 },
    });
  }

  const homePage = schema.pages.find((page) => /home|inicio/i.test(`${page.page_key || ""} ${page.title || ""}`)) || schema.pages[0];
  if (homePage) {
    homePage.sections = Array.isArray(homePage.sections) ? homePage.sections : [];
    const homeHasCatalog = homePage.sections.some((section) => ["ProductGrid", "ServiceList"].includes(section.type));
    if (!homeHasCatalog) {
      homePage.sections.push({
        id: "featured_catalog_auto",
        type: "ProductGrid",
        order: homePage.sections.length + 1,
        editable: {
          title: language === "es" ? "Productos destacados" : "Featured products",
          headline: language === "es" ? "Productos destacados" : "Featured products",
          subtitle: "",
          text: "",
          primary_button: "",
          secondary_button: "",
          image_url: "",
          images: [],
        },
        settings: { layout: "featured", source: "catalog", columns: 3 },
      });
    }
  }

  if (!schema.navigation.some((item) => item.page_key === catalogPage.page_key)) {
    const navItem = { label: labels.nav, page_key: catalogPage.page_key };
    schema.navigation.length ? schema.navigation.splice(1, 0, navItem) : schema.navigation.push(navItem);
  }

  schema.pages = schema.pages
    .map((page, index) => ({ ...page, order: Number(page.order || index + 1) }))
    .sort((a, b) => a.order - b.order);
  return schema;
}

function normalizePreviewCatalogItems(schema) {
  const existing = Array.isArray(schema.catalog_items) && schema.catalog_items.length
    ? schema.catalog_items
    : Array.isArray(schema.products_services)
      ? schema.products_services
      : [];
  return existing.map((item, index) => {
    if (typeof item === "string") {
      return {
        id: `item_${index + 1}`,
        name: item,
        description: "",
        price_label: "",
        button_label: selectedLanguage === "es" ? "Consultar" : "Ask now",
        is_active: true,
        is_featured: index < 3,
        sort_order: index,
      };
    }
    return {
      id: item.id || `item_${index + 1}`,
      name: item.name || item.title || `Item ${index + 1}`,
      description: item.description || item.text || "",
      price_label: item.price_label || item.price || item.priceLabel || "",
      button_label: item.button_label || item.cta || (selectedLanguage === "es" ? "Consultar" : "Ask now"),
      image_url: item.image_url || item.imageUrl || "",
      is_active: item.is_active !== false,
      is_featured: item.is_featured ?? index < 3,
      sort_order: Number(item.sort_order ?? index),
    };
  });
}

function selectedVariant() {
  const variants = currentSchema?.design_variants || [];
  return variants.find((variant) => variant.id === selectedVariantId) || variants[0] || null;
}

function selectedTemplatePreset() {
  const variants = currentSchema?.design_variants || [];
  const index = Math.max(0, variants.findIndex((variant) => variant.id === selectedVariantId));
  return TEMPLATE_PRESETS[index % TEMPLATE_PRESETS.length];
}

function renderWebsite(schema, pageKey) {
  const page = schema.pages.find((item) => item.page_key === pageKey) || schema.pages[0];
  const theme = schema.theme;
  const logo = schema.global_components.logo_url;
  const layoutId = schema.layout_mode?.id || "standard";
  const templateId = schema.active_template?.id || "standard";
  return `<div class="rendered-site layout-${escapeAttribute(slugify(layoutId))} template-${escapeAttribute(slugify(templateId))}" style="${themeVars(theme)}">
    <div class="rendered-page-switcher">
      <span>${escapeHtml(schema.business.name || "Website")}</span>
      <div>${schema.pages
        .sort((a, b) => a.order - b.order)
        .map((item) => `<a class="${item.page_key === page.page_key ? "active" : ""}" href="#" data-page-link="${escapeAttribute(item.page_key)}">${escapeHtml(item.title || item.page_key)}</a>`)
        .join("")}</div>
    </div>
    <header class="rendered-nav ${schema.layout_mode?.navigation?.sticky_header ? "sticky" : ""}">
      <div>${logo ? `<img src="${escapeAttribute(logo)}" alt="${escapeAttribute(schema.business.name)}">` : renderLogoMark(schema)}</div>
      <nav>${schema.navigation
        .map((item) => `<a class="${item.page_key === page.page_key ? "active" : ""}" href="#" data-page-link="${escapeAttribute(item.page_key)}">${escapeHtml(item.label)}</a>`)
        .join("")}</nav>
    </header>
    ${page.sections
      .sort((a, b) => a.order - b.order)
      .map((section) => renderSection(section, schema))
      .join("")}
    <footer class="rendered-footer">
      <strong>${escapeHtml(schema.business.name)}</strong>
      <span>${escapeHtml(schema.global_components.footer_text || "")}</span>
    </footer>
  </div>`;
}

function renderSection(section, schema) {
  const renderers = {
    Hero: renderHero,
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

function renderHero(section, schema) {
  const editable = section.editable || {};
  const heroItem = (schema.catalog_items || schema.products_services || []).find((item) => item.is_featured && item.image_url) ||
    (schema.catalog_items || schema.products_services || []).find((item) => item.image_url);
  const image = editable.image_url || heroItem?.image_url || "";
  const layout = section.settings?.layout || "split_showcase";
  return `<section class="rendered-hero hero-${escapeAttribute(slugify(layout))} ${sectionClass(section)}" ${sectionVars(section)}>
    <div>
      <span class="rendered-kicker">${escapeHtml(schema.business.industry || schema.business.location || "Featured")}</span>
      <h1>${escapeHtml(editable.headline || schema.business.name)}</h1>
      <p>${escapeHtml(editable.subtitle || schema.business.description)}</p>
      <div class="rendered-actions">
        <a class="rendered-button" href="#">${escapeHtml(editable.primary_button || schema.theme.buttons.primary_label)}</a>
        ${(editable.secondary_button || schema.theme.buttons.secondary_label) ? `<a class="rendered-button secondary" href="#">${escapeHtml(editable.secondary_button || schema.theme.buttons.secondary_label)}</a>` : ""}
      </div>
    </div>
    <div class="rendered-visual">
      ${image ? `<img src="${escapeAttribute(image)}" alt="">` : visualPlaceholder(schema)}
    </div>
  </section>`;
}

function renderProductGrid(section, schema) {
  const editable = section.editable || {};
  const columns = Math.max(2, Math.min(Number(section.settings?.columns || 3), 4));
  const catalogItems = (schema.catalog_items || schema.products_services || [])
    .filter((item) => item.is_active !== false)
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  const catalogType = schema.catalog_model?.catalogType || schema.layout_mode?.catalog_type || "editorial_minimal_grid";
  const customCatalog = renderCatalogByType(catalogType, catalogItems, schema);
  return `<section class="rendered-section section-${escapeAttribute(slugify(section.settings?.layout || "grid"))} ${sectionClass(section)}" ${sectionVars(section)}>
    <div class="section-heading">
      <span class="rendered-kicker">${escapeHtml(schema.business.tone || "Selected")}</span>
      <h2>${escapeHtml(editable.title || editable.headline || "Products and services")}</h2>
      ${editable.text || editable.subtitle ? `<p>${escapeHtml(editable.text || editable.subtitle)}</p>` : ""}
    </div>
    ${customCatalog || `<div class="rendered-grid columns-${columns}">
      ${catalogItems
        .map(
          (item) => `<article class="rendered-card">
            ${item.image_url ? `<img src="${escapeAttribute(item.image_url)}" alt="${escapeAttribute(item.name)}">` : `<div class="card-placeholder">${escapeHtml(item.name.slice(0, 2))}</div>`}
            <div>
              <h3>${escapeHtml(item.name)}</h3>
              <p>${escapeHtml(item.description)}</p>
              <strong>${escapeHtml(item.price_label)}</strong>
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
    dense_marketplace_catalog: renderMarketplaceCatalog,
    listing_marketplace_catalog: renderClassifiedMarketplaceCatalog,
    editorial_minimal_grid: renderMinimalProductGrid,
    lookbook_collection_catalog: renderFashionLookbookCatalog,
    luxury_gallery_catalog: renderLuxuryGalleryCatalog,
    digital_offer_catalog: renderDigitalOfferCatalog,
    menu_catalog: renderRestaurantMenuCatalog,
    online_ordering_catalog: renderRestaurantMenuCatalog,
    booking_menu_catalog: renderBookingMenuCatalog,
    service_area_catalog: renderLocalServiceCatalog,
    practice_area_catalog: renderProfessionalServicesCatalog,
    project_gallery_catalog: renderBeforeAfterProjectCatalog,
    pricing_plan_catalog: renderPricingPlanCatalog,
    ticket_or_offer_catalog: renderEventTicketCatalog,
    service_package_catalog: renderPersonalBrandServicesCatalog,
  };
  return (renderers[catalogType] || renderMinimalProductGrid)(items, schema, catalogType);
}

function renderMarketplaceCatalog(items) {
  return `<div class="catalog-shell catalog-marketplace">
    <aside><strong>Search & filters</strong><span>Category</span><span>Brand</span><span>Price</span><span>Rating</span><span>Delivery</span></aside>
    <div class="catalog-results">${items.map((item, index) => renderCatalogCard(item, "market-card", `${index % 3 === 0 ? "Deal" : "Fast ship"}`)).join("")}</div>
  </div>`;
}

function renderClassifiedMarketplaceCatalog(items) {
  return `<div class="catalog-shell catalog-classified">
    ${items.map((item, index) => `<article class="listing-card">
      <div>${item.image_url ? `<img src="${escapeAttribute(item.image_url)}" alt="${escapeAttribute(item.name)}">` : `<span>${escapeHtml(item.name.slice(0, 2))}</span>`}</div>
      <section><strong>${escapeHtml(item.name)}</strong><p>${escapeHtml(item.description)}</p><small>Seller verified · ${index % 2 ? "Used" : "New"} · Local pickup</small></section>
      <aside><b>${escapeHtml(item.price_label || "Make offer")}</b><a class="rendered-button" href="#">${escapeHtml(item.button_label || "Contact seller")}</a></aside>
    </article>`).join("")}
  </div>`;
}

function renderMinimalProductGrid(items) {
  return `<div class="catalog-minimal">${items.map((item) => renderCatalogCard(item, "minimal-card", item.price_label)).join("")}</div>`;
}

function renderFashionLookbookCatalog(items) {
  return `<div class="catalog-lookbook">${items.map((item, index) => `<article class="lookbook-card ${index === 0 ? "wide" : ""}">
    ${item.image_url ? `<img src="${escapeAttribute(item.image_url)}" alt="${escapeAttribute(item.name)}">` : `<div>${escapeHtml(item.name.slice(0, 2))}</div>`}
    <span>New drop</span><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p><b>${escapeHtml(item.price_label)}</b>
  </article>`).join("")}</div>`;
}

function renderLuxuryGalleryCatalog(items) {
  return `<div class="catalog-luxury">${items.map((item) => `<article>
    <div>${item.image_url ? `<img src="${escapeAttribute(item.image_url)}" alt="${escapeAttribute(item.name)}">` : ""}</div>
    <small>Limited selection</small><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p><b>${escapeHtml(item.price_label)}</b>
  </article>`).join("")}</div>`;
}

function renderDigitalOfferCatalog(items) {
  return `<div class="catalog-digital">${items.map((item) => `<article>
    <span>Instant access</span><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p>
    <ul><li>Downloadable content</li><li>Bonus resources</li><li>Lifetime access</li></ul>
    <b>${escapeHtml(item.price_label)}</b><a class="rendered-button" href="#">${escapeHtml(item.button_label || "Get access")}</a>
  </article>`).join("")}</div>`;
}

function renderRestaurantMenuCatalog(items) {
  return `<div class="catalog-menu">${items.map((item, index) => `<article>
    <div><small>${index % 2 ? "Main" : "Popular"}</small><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p></div>
    <strong>${escapeHtml(item.price_label || "Market price")}</strong>
  </article>`).join("")}</div>`;
}

function renderBookingMenuCatalog(items) {
  return `<div class="catalog-booking">${items.map((item, index) => `<article>
    <small>${30 + index * 15} min</small><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p>
    <b>${escapeHtml(item.price_label || "From quote")}</b><a class="rendered-button" href="#">Book</a>
  </article>`).join("")}</div>`;
}

function renderLocalServiceCatalog(items) {
  return `<div class="catalog-services">${items.map((item) => renderCatalogCard(item, "service-card-pro", "Free quote")).join("")}</div>`;
}

function renderProfessionalServicesCatalog(items) {
  return `<div class="catalog-practice">${items.map((item) => `<article><span>Practice area</span><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p><a class="rendered-button secondary" href="#">Schedule consultation</a></article>`).join("")}</div>`;
}

function renderBeforeAfterProjectCatalog(items) {
  return `<div class="catalog-projects">${items.map((item) => `<article><div><span>Before</span><span>After</span></div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p><a class="rendered-button" href="#">View project</a></article>`).join("")}</div>`;
}

function renderPricingPlanCatalog(items) {
  return `<div class="catalog-pricing">${items.map((item, index) => `<article class="${index === 1 ? "featured" : ""}"><small>Plan</small><h3>${escapeHtml(item.name)}</h3><b>${escapeHtml(item.price_label || "Custom")}</b><p>${escapeHtml(item.description)}</p><a class="rendered-button" href="#">Start</a></article>`).join("")}</div>`;
}

function renderEventTicketCatalog(items) {
  return `<div class="catalog-tickets">${items.map((item) => `<article><span>Ticket / offer</span><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p><b>${escapeHtml(item.price_label)}</b><a class="rendered-button" href="#">Reserve</a></article>`).join("")}</div>`;
}

function renderPersonalBrandServicesCatalog(items) {
  return `<div class="catalog-packages">${items.map((item) => `<article><small>Package</small><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p><a class="rendered-button secondary" href="#">Apply now</a></article>`).join("")}</div>`;
}

function renderCatalogCard(item, className, badge) {
  return `<article class="${className}">
    ${item.image_url ? `<img src="${escapeAttribute(item.image_url)}" alt="${escapeAttribute(item.name)}">` : `<div class="card-placeholder">${escapeHtml(item.name.slice(0, 2))}</div>`}
    ${badge ? `<small>${escapeHtml(badge)}</small>` : ""}
    <h3>${escapeHtml(item.name)}</h3>
    <p>${escapeHtml(item.description)}</p>
    <b>${escapeHtml(item.price_label)}</b>
    <a class="rendered-button" href="#">${escapeHtml(item.button_label || "View")}</a>
  </article>`;
}

function renderFeatureBand(section) {
  const editable = section.editable || {};
  const layout = section.settings?.layout || "feature";
  return `<section class="rendered-section feature-band feature-${escapeAttribute(slugify(layout))} ${sectionClass(section)}" ${sectionVars(section)}>
    <div class="section-heading">
      <span class="rendered-kicker">${escapeHtml(section.type)}</span>
      <h2>${escapeHtml(editable.title || editable.headline || section.type)}</h2>
      <p>${escapeHtml(editable.text || editable.subtitle || "")}</p>
    </div>
  </section>`;
}

function renderGallery(section) {
  const images = section.editable?.images || [];
  return `<section class="rendered-section ${sectionClass(section)}" ${sectionVars(section)}>
    <h2>${escapeHtml(section.editable?.title || "Gallery")}</h2>
    <div class="rendered-grid">${images
      .map((url) => `<article class="rendered-card"><img src="${escapeAttribute(url)}" alt=""></article>`)
      .join("")}</div>
  </section>`;
}

function renderContact(section, schema) {
  const editable = section.editable || {};
  return `<section class="rendered-section contact-panel ${sectionClass(section)}" ${sectionVars(section)}>
    <div>
      <span class="rendered-kicker">${escapeHtml(schema.business.location || "Contact")}</span>
      <h2>${escapeHtml(editable.title || "Contact")}</h2>
      <p>${escapeHtml(editable.text || "Reach out for more information.")}</p>
    </div>
    <div class="contact-list">${Object.entries(schema.contact || {})
      .filter(([, value]) => value)
      .map(([key, value]) => `<p><strong>${escapeHtml(key)}</strong><span>${escapeHtml(value)}</span></p>`)
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
  return `heading-${headingSize} spacing-${spacing}`;
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

function catalogItemEditor(item, index) {
  const basePath = `catalog_items.${index}`;
  return `<div class="editor-group catalog-item-editor">
    <h4>${index + 1}. ${escapeHtml(item.name || "Catalog item")}</h4>
    <div class="control-grid">
      ${inputField("Name", `${basePath}.name`, item.name, "data-catalog-path")}
      ${selectGenericField("Price type", `${basePath}.price_type`, item.price_type || "quote_only", ["fixed", "starting_at", "quote_only"], "data-catalog-path")}
      ${inputField("Price value", `${basePath}.price_value`, item.price_value ?? "", "data-catalog-path")}
      ${inputField("Price label", `${basePath}.price_label`, item.price_label, "data-catalog-path")}
      ${inputField("Image URL", `${basePath}.image_url`, item.image_url, "data-catalog-path")}
      <label>Upload image<input data-catalog-image-upload="${escapeAttribute(`${basePath}.image_url`)}" type="file" accept="image/*"></label>
      ${checkboxField("Active", `${basePath}.is_active`, item.is_active !== false, "data-catalog-path")}
      ${checkboxField("Featured", `${basePath}.is_featured`, Boolean(item.is_featured), "data-catalog-path")}
    </div>
    ${textareaField("Description", `${basePath}.description`, item.description, "data-catalog-path")}
    ${inputField("Button", `${basePath}.button_label`, item.button_label, "data-catalog-path")}
    <div class="row-actions">
      <button class="small-button" data-move-catalog-item="${escapeAttribute(item.id)}" data-direction="up" type="button">Move up</button>
      <button class="small-button" data-move-catalog-item="${escapeAttribute(item.id)}" data-direction="down" type="button">Move down</button>
      <button class="small-button" data-remove-catalog-item="${escapeAttribute(item.id)}" type="button">Delete</button>
    </div>
  </div>`;
}

function sectionEditor(section, index) {
  const editable = section.editable || {};
  const basePath = `pages.${pageIndex()}.sections.${index}`;
  const settings = section.settings || {};
  return `<div class="editor-group">
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

function inputField(label, path, value, attr = "data-path") {
  return `<label>${escapeHtml(label)}<input ${attr}="${escapeAttribute(path)}" value="${escapeAttribute(value || "")}"></label>`;
}

function textareaField(label, path, value, attr = "data-path") {
  return `<label>${escapeHtml(label)}<textarea rows="3" ${attr}="${escapeAttribute(path)}">${escapeHtml(value || "")}</textarea></label>`;
}

function selectField(label, path, value, options) {
  return `<label>${escapeHtml(label)}<select data-section-path="${escapeAttribute(path)}">${options
    .map((option) => `<option value="${escapeAttribute(option)}" ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`)
    .join("")}</select></label>`;
}

function selectGenericField(label, path, value, options, attr) {
  return `<label>${escapeHtml(label)}<select ${attr}="${escapeAttribute(path)}">${options
    .map((option) => `<option value="${escapeAttribute(option)}" ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`)
    .join("")}</select></label>`;
}

function checkboxField(label, path, checked, attr) {
  return `<label class="checkbox-row"><input ${attr}="${escapeAttribute(path)}" type="checkbox" ${checked ? "checked" : ""}>${escapeHtml(label)}</label>`;
}

function selectedPage() {
  return currentSchema.pages.find((page) => page.page_key === selectedPageKey) || currentSchema.pages[0];
}

function pageIndex() {
  return currentSchema.pages.findIndex((page) => page.page_key === selectedPageKey);
}

function movePage(direction) {
  const index = pageIndex();
  const next = direction === "up" ? index - 1 : index + 1;
  if (next < 0 || next >= currentSchema.pages.length) return;
  const pages = currentSchema.pages;
  [pages[index], pages[next]] = [pages[next], pages[index]];
  resequence(pages);
}

function resequence(items) {
  items.forEach((item, index) => {
    item.order = index + 1;
  });
}

function moveCatalogItem(id, direction) {
  const index = currentCatalogItems.findIndex((item) => item.id === id);
  const next = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || next < 0 || next >= currentCatalogItems.length) return;
  [currentCatalogItems[index], currentCatalogItems[next]] = [currentCatalogItems[next], currentCatalogItems[index]];
  resequenceCatalog();
}

function resequenceCatalog() {
  currentCatalogItems.forEach((item, index) => {
    item.sort_order = index + 1;
  });
}

function setPath(target, path, value) {
  const parts = path.split(".");
  let cursor = target;
  parts.slice(0, -1).forEach((part) => {
    const key = Number.isInteger(Number(part)) ? Number(part) : part;
    if (cursor[key] === undefined) {
      cursor[key] = {};
    }
    cursor = cursor[key];
  });
  cursor[parts.at(-1)] = value;
}

function parseKeyValueLines(value) {
  return Object.fromEntries(
    splitLines(value).map((line) => {
      const [key, ...rest] = line.split(":");
      return [key.trim(), rest.join(":").trim()];
    }),
  );
}

function splitCommaOrLines(value) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitLines(value) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

async function uploadAssetOrFallback(file, assetType, label) {
  try {
    const uploaded = await uploadAssetFile(file, assetType, label);
    if (uploaded?.url) return uploaded.url;
  } catch (error) {
    console.warn("Asset upload failed, using development fallback.", error);
    if (storageStatus) {
      storageStatus.textContent = "Asset storage unavailable. Using development image fallback.";
    }
  }
  return fileToDataUrl(file);
}

async function uploadAssetFile(file, assetType, label) {
  const dataUrl = await fileToDataUrl(file);
  const response = await fetch(ASSET_UPLOAD_URL, {
    method: "POST",
    headers: adminHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      businessId: currentBusinessId,
      siteId: currentSiteId,
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

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function setPreviewButton(activeId) {
  ["desktopButton", "mobileButton"].forEach((id) => {
    document.querySelector(`#${id}`).classList.toggle("active", id === activeId);
  });
}

function slugify(value) {
  return String(value || "default").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function themeVars(theme) {
  return [
    `--site-bg:${resolveColor(theme.colors.background, "#F8FAF9")}`,
    `--site-surface:${resolveColor(theme.colors.surface, "#FFFFFF")}`,
    `--site-primary:${resolveColor(theme.colors.primary, "#0E7C66")}`,
    `--site-secondary:${resolveColor(theme.colors.secondary, "#E3F3EE")}`,
    `--site-text:${resolveColor(theme.colors.text, "#111827")}`,
    `--site-muted:${resolveColor(theme.colors.muted, "#667085")}`,
    `--site-heading:${JSON.stringify(theme.fonts.heading)}`,
    `--site-body:${JSON.stringify(theme.fonts.body)}`,
  ].join(";");
}

function normalizeEditedValue(path, value) {
  if (!path.startsWith("theme.colors.") && !path.endsWith(".settings.background") && !path.endsWith(".settings.text_color")) {
    return value;
  }
  return resolveColor(value, value);
}

function resolveColor(value, fallback) {
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
