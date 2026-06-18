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
    businessDescription: "Business/design context",
    industry: "Industry",
    location: "Location",
    servicesProducts: "Services/products",
    targetAudience: "Target audience",
    preferredTone: "Preferred tone/style",
    preferredColors: "Colors or logo",
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
    assetPromptTitle: "Logo and photos",
    assetPromptText: "Upload them here and Luma can use them for the draft.",
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
    devFallbackMissingKey: "Luma is using a simplified response while the AI service finishes connecting.",
    localFallback: "Answer saved. Continuing with the setup.",
    localFallbackMessage: "Got it. I saved that detail and will keep going.",
    savingRequest: "Saving completed intake as client_request...",
    requestNotSaved: "Saved in this browser session. You can still generate your website draft.",
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
    businessDescription: "Contexto del negocio",
    industry: "Industria",
    location: "Ubicacion",
    servicesProducts: "Productos/servicios",
    targetAudience: "Audiencia objetivo",
    preferredTone: "Tono/estilo preferido",
    preferredColors: "Colores o logo",
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
    assetPromptTitle: "Logo y fotos",
    assetPromptText: "Súbelos aquí y Luma los usará para diseñar la primera versión.",
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
    devFallbackMissingKey: "Luma está usando una respuesta simplificada mientras el servicio de IA termina de conectar.",
    localFallback: "Respuesta guardada. Seguimos con la configuración.",
    localFallbackMessage: "Listo. Guardé ese detalle y seguimos avanzando.",
    savingRequest: "Guardando intake completado como client_request...",
    requestNotSaved: "Guardado en esta sesión del navegador. Igual puedes generar tu primera versión.",
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
    intentDetected: "Très bien. J'ai détecté cette direction :",
    selectedTemplate: "Template sélectionné",
    catalogType: "Type de catalogue",
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
    assetPromptTitle: "Logo et photos",
    assetPromptText: "Importez-les ici et Luma les utilisera pour le brouillon.",
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
    devFallbackMissingKey: "Luma utilise une réponse simplifiée pendant que le service IA se connecte.",
    localFallback: "Réponse enregistrée. Nous continuons la configuration.",
    localFallbackMessage: "J'ai enregistré votre réponse et nous continuons.",
    savingRequest: "Enregistrement de l'intake comme client_request...",
    requestNotSaved: "Enregistré dans cette session. Vous pouvez quand même générer le brouillon.",
    generatedOpenAI: "Généré avec OpenAI via le backend.",
    generating: "Génération...",
    generatingLong: "Luma conçoit votre site. Cela peut prendre environ une minute.",
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
    intentDetected: "Ótimo. Detectei esta direção:",
    selectedTemplate: "Template selecionado",
    catalogType: "Tipo de catálogo",
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
    assetPromptTitle: "Logo e fotos",
    assetPromptText: "Envie aqui e a Luma usará no primeiro rascunho.",
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
    devFallbackMissingKey: "A Luma está usando uma resposta simplificada enquanto o serviço de IA termina de conectar.",
    localFallback: "Resposta salva. Continuamos a configuração.",
    localFallbackMessage: "Salvei sua resposta e vamos continuar.",
    savingRequest: "Salvando intake concluído como client_request...",
    requestNotSaved: "Salvo nesta sessão. Você ainda pode gerar o rascunho do site.",
    generatedOpenAI: "Gerado com OpenAI pelo backend.",
    generating: "Gerando...",
    generatingLong: "A Luma está criando seu site. Isso pode levar cerca de um minuto.",
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
    businessDescription: "To understand the direction, tell me what the business sells or does. I will use this as design context, not as text to copy literally.",
    industry: "What industry or category best fits it?",
    location: "Where is it located or where does it serve customers?",
    servicesProducts: "Which main products or services should the site show?",
    targetAudience: "Who is the main customer? You can also let AI decide.",
    preferredTone: "What style should it feel like: elegant, modern, friendly, premium? Or should AI decide?",
    preferredColors: "Any preferred colors, or do you want to upload a logo so I can extract a palette from it?",
    contactInfo: "What contact details should appear: email, phone, Instagram, or WhatsApp?",
    salesMode: "Should the site support online sales, quote requests, in-person visits, or a mix?",
    hasLogoPhotos: "Do you have a logo or photos ready to use?",
    desiredDomain: "What domain would you like? You can write a name like lunastore.com or skip it for now.",
    review: "Review the summary. If it looks right, generate the site.",
  },
  es: {
    websiteIntent: "Que tipo de pagina quieres crear?",
    businessName: "Primero, ¿cómo se llama tu negocio?",
    businessDescription: "Para entender la dirección, dime qué vende u ofrece tu negocio. Lo usaré como contexto de diseño, no como texto literal para poner en la página.",
    industry: "En que industria o categoria lo pondrias?",
    location: "Donde atiende o donde esta ubicado?",
    servicesProducts: "Que productos o servicios principales quieres mostrar?",
    targetAudience: "A quien le vendes principalmente? Tambien puedes dejar que IA decida.",
    preferredTone: "Que estilo quieres: elegante, moderno, cercano, premium? O dejo que IA decida?",
    preferredColors: "¿Tienes colores preferidos o quieres subir un logo para sacar una paleta desde ahí?",
    contactInfo: "Que contacto quieres mostrar: email, telefono, Instagram o WhatsApp?",
    salesMode: "¿Quieres ventas online, solicitudes de cotización, visitas presenciales o una mezcla?",
    hasLogoPhotos: "Tienes logo o fotos listas para usar?",
    desiredDomain: "Que dominio te gustaria? Puedes escribir algo como lunastore.com o saltarlo por ahora.",
    review: "Revisa el resumen. Si esta bien, genera el sitio.",
  },
  fr: {
    websiteIntent: "Quel type de site voulez-vous creer?",
    businessName: "Quel est le nom de l'entreprise?",
    businessDescription: "Pour comprendre la direction, dites-moi ce que l'entreprise vend ou propose. Je l'utiliserai comme contexte de design, pas comme texte à copier tel quel.",
    industry: "Dans quel secteur ou catégorie la placeriez-vous?",
    location: "Où se trouve-t-elle ou où sert-elle ses clients?",
    servicesProducts: "Quels produits ou services principaux faut-il afficher?",
    targetAudience: "Qui est le client principal? Vous pouvez aussi laisser l'IA décider.",
    preferredTone: "Quel style voulez-vous: élégant, moderne, chaleureux, premium? Ou l'IA décide?",
    preferredColors: "Avez-vous des couleurs préférées, ou voulez-vous importer un logo pour que j'en extraie une palette?",
    contactInfo: "Quelles coordonnées afficher: email, téléphone, Instagram ou WhatsApp?",
    salesMode: "Le site doit-il proposer la vente en ligne, les demandes de devis, les visites en personne, ou un mélange?",
    hasLogoPhotos: "Avez-vous un logo ou des photos prêts à utiliser?",
    desiredDomain: "Quel domaine souhaitez-vous? Vous pouvez écrire lunastore.com ou ignorer pour l'instant.",
    review: "Vérifiez le résumé. Si tout est bon, générez le site.",
  },
  pt: {
    websiteIntent: "Que tipo de site voce quer criar?",
    businessName: "Qual é o nome do negócio?",
    businessDescription: "Para entender a direção, diga o que o negócio vende ou oferece. Vou usar isso como contexto de design, não como texto literal para o site.",
    industry: "Em qual setor ou categoria ele se encaixa?",
    location: "Onde fica ou onde atende clientes?",
    servicesProducts: "Quais produtos ou serviços principais devem aparecer?",
    targetAudience: "Quem é o cliente principal? Você também pode deixar a IA decidir.",
    preferredTone: "Qual estilo você quer: elegante, moderno, próximo, premium? Ou a IA decide?",
    preferredColors: "Tem cores preferidas, ou quer enviar um logo para eu extrair uma paleta dele?",
    contactInfo: "Quais contatos devem aparecer: email, telefone, Instagram ou WhatsApp?",
    salesMode: "O site deve aceitar vendas online, pedidos de orçamento, visitas presenciais, ou uma mistura?",
    hasLogoPhotos: "Você tem logo ou fotos prontas para usar?",
    desiredDomain: "Qual domínio você gostaria? Pode escrever lunastore.com ou pular por enquanto.",
    review: "Revise o resumo. Se estiver certo, gere o site.",
  },
};

let selectedLanguage = detectBrowserLanguage();

let currentSchema = null;
let selectedPageKey = "home";
let selectedVariantId = "";
let selectedStudioSectionId = "";
let advancedInspectorOpen = false;
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
let restoredGuidedDraftInfo = null;
let guidedCoachCard = null;
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
  logoPalette: [],
  brand: null,
  selectedLanguage,
  hasLogo: false,
  hasPhotos: false,
  salesMode: "",
  hasLogoPhotos: "",
  sectionsPreference: "",
  desiredDomain: "",
  revisionMode: "",
  requestedAdjustments: [],
  sitePlan: null,
  sitePlanApproved: false,
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

const REQUIRED_GUIDED_STEPS = [
  "websiteIntent",
  "businessName",
  "businessDescription",
  "servicesProducts",
  "contactInfo",
];

const SMART_GUIDED_STEP_PRIORITY = [
  "websiteIntent",
  "businessName",
  "businessDescription",
  "servicesProducts",
  "contactInfo",
  "salesMode",
  "industry",
  "location",
  "preferredTone",
  "preferredColors",
  "targetAudience",
  "desiredDomain",
];

const OPTIONAL_GUIDED_STEPS = new Set([
  "industry",
  "location",
  "targetAudience",
  "preferredTone",
  "preferredColors",
  "salesMode",
  "desiredDomain",
]);

const guidedAskedSteps = new Map();
let lastAssistantPromptSignature = "";

const TEMPLATE_PREVIEW_CHOICES = [
  {
    templateId: "apple-premium-product",
    name: "Premium Product",
    names: { en: "Premium Product", es: "Producto premium", fr: "Produit premium", pt: "Produto premium" },
    catalogType: "editorial_minimal_grid",
    image: "/templates-preview/screenshots/apple.png",
    description: "Apple-style product page with spacious hero, refined copy, and premium sections.",
    descriptions: {
      en: "Apple-style product page with spacious hero, refined copy, and premium sections.",
      es: "Pagina tipo Apple: hero amplio, copy refinado y secciones premium.",
      fr: "Page type Apple avec hero spacieux, texte raffine et sections premium.",
      pt: "Pagina estilo Apple com hero amplo, copy refinado e secoes premium.",
    },
  },
  {
    templateId: "mega-marketplace",
    name: "Mega Marketplace",
    names: { en: "Mega Marketplace", es: "Mega marketplace", fr: "Mega marketplace", pt: "Mega marketplace" },
    catalogType: "dense_marketplace_catalog",
    image: "/templates-preview/screenshots/amazon.png",
    description: "Amazon-style catalog with search, categories, deals, filters, and dense products.",
    descriptions: {
      en: "Amazon-style catalog with search, categories, deals, filters, and dense products.",
      es: "Catalogo tipo Amazon con busqueda, categorias, ofertas, filtros y muchos productos.",
      fr: "Catalogue type Amazon avec recherche, categories, offres, filtres et produits denses.",
      pt: "Catalogo tipo Amazon com busca, categorias, ofertas, filtros e muitos produtos.",
    },
  },
  {
    templateId: "listing-marketplace-pro",
    name: "Listing Marketplace",
    names: { en: "Listing Marketplace", es: "Marketplace de listados", fr: "Marketplace d'annonces", pt: "Marketplace de anuncios" },
    catalogType: "listing_marketplace_catalog",
    image: "/templates-preview/screenshots/ebay.png",
    description: "eBay-style listings with sellers, item condition, offers, and comparison layout.",
    descriptions: {
      en: "eBay-style listings with sellers, item condition, offers, and comparison layout.",
      es: "Listados tipo eBay con vendedores, condicion, ofertas y comparacion.",
      fr: "Annonces type eBay avec vendeurs, etat, offres et comparaison.",
      pt: "Listagens tipo eBay com vendedores, condicao, ofertas e comparacao.",
    },
  },
  {
    templateId: "fashion-drop-pro",
    name: "Fashion Drop",
    names: { en: "Fashion Drop", es: "Fashion drop", fr: "Drop mode", pt: "Fashion drop" },
    catalogType: "lookbook_collection_catalog",
    image: "/templates-preview/screenshots/premium.png",
    description: "Shopify boutique style with editorial hero, collections, lookbook, and drop energy.",
    descriptions: {
      en: "Shopify boutique style with editorial hero, collections, lookbook, and drop energy.",
      es: "Boutique tipo Shopify con hero editorial, colecciones, lookbook y energia de lanzamiento.",
      fr: "Boutique type Shopify avec hero editorial, collections, lookbook et energie de lancement.",
      pt: "Boutique tipo Shopify com hero editorial, colecoes, lookbook e energia de lancamento.",
    },
  },
  {
    templateId: "local-services-pro-plus",
    name: "Local Services",
    names: { en: "Local Services", es: "Servicios locales", fr: "Services locaux", pt: "Servicos locais" },
    catalogType: "service_area_catalog",
    image: "/templates-preview/screenshots/services.png",
    description: "Quote-focused service site with service cards, trust, service area, and contact CTA.",
    descriptions: {
      en: "Quote-focused service site with service cards, trust, service area, and contact CTA.",
      es: "Pagina de servicios con cotizaciones, confianza, areas de servicio y CTA de contacto.",
      fr: "Site de services oriente devis, confiance, zone de service et CTA de contact.",
      pt: "Site de servicos focado em orcamentos, confianca, area de atendimento e CTA.",
    },
  },
  {
    templateId: "booking-appointment-pro",
    name: "Booking",
    names: { en: "Booking", es: "Reservas", fr: "Reservations", pt: "Agendamentos" },
    catalogType: "booking_menu_catalog",
    image: "/templates-preview/screenshots/booking.png",
    description: "Appointment-first layout with service menu, availability, staff/process, and booking CTA.",
    descriptions: {
      en: "Appointment-first layout with service menu, availability, staff/process, and booking CTA.",
      es: "Layout enfocado en citas con menu de servicios, disponibilidad, equipo/proceso y CTA.",
      fr: "Layout centre sur les rendez-vous avec services, disponibilite, equipe/processus et CTA.",
      pt: "Layout focado em agendamentos com servicos, disponibilidade, equipe/processo e CTA.",
    },
  },
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

const DEFAULT_BRAND = {
  logoUrl: "",
  primaryColor: "#0e7c66",
  secondaryColor: "#e3f3ee",
  accentColor: "#14b8a6",
  backgroundColor: "#f8fafc",
  surfaceColor: "#ffffff",
  textColor: "#101828",
  mutedTextColor: "#667085",
  borderColor: "#d9e2df",
  buttonColor: "#0e7c66",
  buttonTextColor: "#ffffff",
  styleDirection: "clean professional",
  fontPairing: { heading: "Inter", body: "Inter" },
  borderRadius: "10px",
  shadowStyle: "0 18px 48px rgba(16, 24, 40, 0.10)",
};

const DESIGN_QUALITY_RULES = [
  "Use the uploaded logo as the source of brand identity, not just as an image.",
  "Create only purposeful sections with a clear reason, conversion purpose, priority, content, and visual treatment.",
  "Strong hero, clear headline, clear CTA, consistent spacing, consistent typography, no filler, no repeated sections, no clutter, and accessible contrast.",
  "Avoid arbitrary gradients, childish styling, oversized random cards, and colors that do not come from the brand system.",
  "Choose one design direction and keep every section consistent with it.",
  "Never render sections that have no conversion purpose or meaningful content.",
  "Review and improve headline, CTA, section order, contrast, visual rhythm, mobile layout, and brand consistency before preview.",
];

const form = document.querySelector("#intakeForm");
const statusText = document.querySelector("#statusText");
const storageStatus = document.querySelector("#storageStatus");
const siteTitle = document.querySelector("#siteTitle");
const editorMount = document.querySelector("#editorMount");
const previewFrame = document.querySelector("#previewFrame");
const studioSelectionToolbar = document.querySelector("#studioSelectionToolbar");
const studioProgressList = document.querySelector("#studioProgressList");
const studioAdjustButton = document.querySelector("#studioAdjustButton");
const studioLumaMessage = document.querySelector(".studio-luma-message");
const studioAuthGate = document.querySelector("#studioAuthGate");
const studioAuthCloseButton = document.querySelector("#studioAuthCloseButton");
const studioGoogleAuthButton = document.querySelector("#studioGoogleAuthButton");
const studioAppleAuthButton = document.querySelector("#studioAppleAuthButton");
const studioEmailAuthButton = document.querySelector("#studioEmailAuthButton");
const studioEmailAuthForm = document.querySelector("#studioEmailAuthForm");
const studioAuthEmail = document.querySelector("#studioAuthEmail");
const studioAuthDemoButton = document.querySelector("#studioAuthDemoButton");
const quickModeButton = document.querySelector("#quickModeButton");
const guidedModeButton = document.querySelector("#guidedModeButton");
const guidedPanel = document.querySelector("#guidedPanel");
const guidedChatCard = document.querySelector(".guided-chat-card");
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
const brandKitPanel = document.querySelector("#brandKitPanel");
const guidedAssetPrompt = document.querySelector("#guidedAssetPrompt");
const chatLogoUploadButton = document.querySelector("#chatLogoUploadButton");
const chatPhotoUploadButton = document.querySelector("#chatPhotoUploadButton");
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
captureStudioAuthRedirect();
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

document.querySelector("#saveSchemaButton").addEventListener("click", (event) => requireStudioAccount(event, "save", saveCurrentSchema));
document.querySelector("#publishButton").addEventListener("click", (event) => requireStudioAccount(event, "publish", publishCurrentSite));
document.querySelector("#clientPreviewButton").addEventListener("click", () => {
  document.body.classList.add("client-preview-mode");
});
document.querySelector("#exitClientPreviewButton").addEventListener("click", () => {
  document.body.classList.remove("client-preview-mode");
});
submitDraftReviewButton?.addEventListener("click", (event) => requireStudioAccount(event, "review", submitGeneratedDraftForReview));
adjustWithLumaButton?.addEventListener("click", adjustGeneratedDraftWithLuma);
studioAdjustButton?.addEventListener("click", adjustGeneratedDraftWithLuma);
document.querySelectorAll("[data-studio-add-section]").forEach((button) => {
  button.addEventListener("click", () => addStudioSection(button.dataset.studioAddSection));
});
document.querySelectorAll("[data-studio-add-product]").forEach((button) => {
  button.addEventListener("click", addStudioCatalogItem);
});
studioSelectionToolbar?.querySelectorAll("[data-selection-action]").forEach((button) => {
  button.addEventListener("click", () => handleStudioSelectionAction(button.dataset.selectionAction));
});
studioAuthCloseButton?.addEventListener("click", closeStudioAuthGate);
studioAuthDemoButton?.addEventListener("click", closeStudioAuthGate);
studioGoogleAuthButton?.addEventListener("click", () => continueWithStudioAuth("google"));
studioAppleAuthButton?.addEventListener("click", () => continueWithStudioAuth("apple"));
studioEmailAuthButton?.addEventListener("click", () => {
  if (studioEmailAuthForm) studioEmailAuthForm.hidden = !studioEmailAuthForm.hidden;
  studioAuthEmail?.focus();
});
studioEmailAuthForm?.addEventListener("submit", continueWithEmailAuth);

quickModeButton.addEventListener("click", () => setIntakeMode("quick"));
guidedModeButton.addEventListener("click", () => setIntakeMode("guided"));
guidedCloseButton.addEventListener("click", () => {
  if (isPublicClientSetup) {
    if (currentSchema) {
      showGeneratedClientPreview();
      guidedStatusText.textContent = langText({
        en: "Your generated draft is still here.",
        es: "Tu borrador generado sigue aquí.",
        fr: "Votre brouillon généré est toujours ici.",
        pt: "Seu rascunho gerado continua aqui.",
      });
      return;
    }
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
guidedReply.addEventListener("input", updateAssetPromptVisibility);
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
chatLogoUploadButton?.addEventListener("click", () => guidedLogoUpload.click());
chatPhotoUploadButton?.addEventListener("click", () => guidedPhotoUpload.click());
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
window.addEventListener("beforeunload", () => {
  if (isPublicClientSetup) {
    syncGuidedStateFromSummary();
    saveGuidedDraft();
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

function langText(map, language = selectedLanguage) {
  return map[language] || map.en || "";
}

function guidedQuestion(step) {
  return GUIDED_QUESTIONS[selectedLanguage]?.[step] || GUIDED_QUESTIONS.en[step] || GUIDED_QUESTIONS.en.review;
}

function guidedStage(step = guidedStep) {
  if (step === "websiteIntent") {
    return {
      index: 1,
      title: langText({ en: "Choose the direction", es: "Elegir la dirección", fr: "Choisir la direction", pt: "Escolher a direção" }),
      body: langText({
        en: "Describe the site naturally. Luma will detect the best template and show visual options.",
        es: "Describe la página naturalmente. Luma detecta el mejor template y muestra opciones visuales.",
        fr: "Décrivez le site naturellement. Luma détecte le meilleur template et montre des options visuelles.",
        pt: "Descreva o site naturalmente. A Luma detecta o melhor template e mostra opções visuais.",
      }),
      examples: [
        langText({ en: "Online store like Amazon", es: "Tienda online tipo Amazon", fr: "Boutique type Amazon", pt: "Loja tipo Amazon" }),
        langText({ en: "Booking site for a barbershop", es: "Barbería con citas", fr: "Site de réservation pour salon", pt: "Barbearia com agendamento" }),
        langText({ en: "Cyberpunk fashion store", es: "Tienda cyberpunk de ropa", fr: "Boutique mode cyberpunk", pt: "Loja cyberpunk de roupas" }),
      ],
    };
  }
  if (["businessName", "businessDescription", "industry", "location", "servicesProducts"].includes(step)) {
    return {
      index: 2,
      title: langText({ en: "Understand the business", es: "Entender el negocio", fr: "Comprendre l'entreprise", pt: "Entender o negócio" }),
      body: langText({
        en: "Give Luma the raw business details. One rich paragraph is enough; it will extract what matters.",
        es: "Dale a Luma los datos reales del negocio. Un párrafo completo sirve; Luma extrae lo importante.",
        fr: "Donnez les détails bruts. Un paragraphe riche suffit; Luma extrait l'essentiel.",
        pt: "Dê os dados reais do negócio. Um parágrafo completo basta; a Luma extrai o essencial.",
      }),
      examples: [
        langText({ en: "Name, what it sells, city", es: "Nombre, qué vende, ciudad", fr: "Nom, offre, ville", pt: "Nome, o que vende, cidade" }),
        langText({ en: "Top products or services", es: "Productos o servicios principales", fr: "Produits ou services clés", pt: "Produtos ou serviços principais" }),
      ],
    };
  }
  if (["targetAudience", "preferredTone", "preferredColors", "salesMode", "hasLogoPhotos"].includes(step)) {
    return {
      index: 3,
      title: langText({ en: "Shape the brand", es: "Definir el estilo", fr: "Définir le style", pt: "Definir o estilo" }),
      body: langText({
        en: "Now Luma chooses the visual personality, sales flow and assets. You can answer or let AI decide.",
        es: "Ahora Luma define personalidad visual, forma de venta y recursos. Puedes responder o dejar que IA decida.",
        fr: "Luma définit la personnalité visuelle, le flux de vente et les assets. Vous pouvez répondre ou laisser l'IA décider.",
        pt: "Agora a Luma define visual, venda e assets. Você pode responder ou deixar a IA decidir.",
      }),
      examples: [
        langText({ en: "Premium, minimal, bold, futuristic", es: "Premium, minimal, llamativo, futurista", fr: "Premium, minimal, audacieux, futuriste", pt: "Premium, minimal, chamativo, futurista" }),
        langText({ en: "Upload logo/photos", es: "Subir logo/fotos", fr: "Importer logo/photos", pt: "Enviar logo/fotos" }),
      ],
    };
  }
  if (["contactInfo", "desiredDomain"].includes(step)) {
    return {
      index: 4,
      title: langText({ en: "Prepare launch details", es: "Preparar datos de lanzamiento", fr: "Préparer le lancement", pt: "Preparar lançamento" }),
      body: langText({
        en: "Contact and domain details help make the draft feel real and ready to publish.",
        es: "Contacto y dominio ayudan a que el borrador se sienta real y listo para publicar.",
        fr: "Contact et domaine rendent le brouillon réel et prêt à publier.",
        pt: "Contato e domínio deixam o rascunho real e pronto para publicar.",
      }),
      examples: [
        langText({ en: "WhatsApp, email, Instagram", es: "WhatsApp, email, Instagram", fr: "WhatsApp, email, Instagram", pt: "WhatsApp, email, Instagram" }),
        langText({ en: "Desired domain", es: "Dominio deseado", fr: "Domaine souhaité", pt: "Domínio desejado" }),
      ],
    };
  }
  const plan = guidedState.sitePlan || (forcedTemplateSelection?.templateId ? buildSitePlan() : null);
  return {
    index: 5,
    title: langText({ en: "Review and generate", es: "Revisar y generar", fr: "Vérifier et générer", pt: "Revisar e gerar" }),
    body: langText({
      en: "Luma has enough to create the first editable website draft. Review or ask for one more change.",
      es: "Luma ya tiene suficiente para crear el primer borrador editable. Revisa o pide un último ajuste.",
      fr: "Luma a assez d'informations pour créer le premier brouillon modifiable. Vérifiez ou demandez un dernier ajustement.",
      pt: "A Luma já tem o suficiente para criar o primeiro rascunho editável. Revise ou peça um último ajuste.",
    }),
    examples: [
      plan ? langText({ en: "Approve site plan", es: "Aprobar plan del sitio", fr: "Approuver le plan", pt: "Aprovar plano" }) : langText({ en: "Generate draft", es: "Generar borrador", fr: "Générer le brouillon", pt: "Gerar rascunho" }),
      langText({ en: "Ask for a change", es: "Pedir un cambio", fr: "Demander un changement", pt: "Pedir uma mudança" }),
    ],
  };
}

function ensureGuidedCoachCard() {
  if (guidedCoachCard || !guidedChatCard || !guidedChat) return guidedCoachCard;
  guidedCoachCard = document.createElement("section");
  guidedCoachCard.className = "luma-coach-card";
  guidedCoachCard.setAttribute("aria-live", "polite");
  guidedChatCard.insertBefore(guidedCoachCard, guidedChat);
  return guidedCoachCard;
}

function renderGuidedCoachCard() {
  const card = ensureGuidedCoachCard();
  if (!card) return;
  const stage = guidedStage(guidedStep);
  const completion = guidedCompletionPercent();
  const templateName = forcedTemplateSelection?.template?.clientSelectionCard?.title
    || forcedTemplateSelection?.template?.name
    || forcedTemplateSelection?.templateId
    || "";
  const nextAction = guidedStep === "review"
    ? langText({ en: "Ready for review", es: "Listo para revisar", fr: "Prêt à vérifier", pt: "Pronto para revisar" })
    : guidedQuestion(guidedStep);
  card.innerHTML = `
    <div class="luma-coach-top">
      <span>${escapeHtml(langText({ en: `Phase ${stage.index}`, es: `Fase ${stage.index}`, fr: `Phase ${stage.index}`, pt: `Fase ${stage.index}` }))}</span>
      <strong>${escapeHtml(stage.title)}</strong>
      <em>${escapeHtml(`${completion}%`)}</em>
    </div>
    <p>${escapeHtml(stage.body)}</p>
    ${templateName ? `<div class="luma-coach-template">${escapeHtml(langText({ en: "Selected base", es: "Base seleccionada", fr: "Base sélectionnée", pt: "Base selecionada" }))}: <strong>${escapeHtml(templateName)}</strong></div>` : ""}
    <div class="luma-coach-next">
      <small>${escapeHtml(langText({ en: "Next", es: "Siguiente", fr: "Suivant", pt: "Próximo" }))}</small>
      <span>${escapeHtml(nextAction)}</span>
    </div>
    <div class="luma-coach-examples">
      ${stage.examples.map((example) => `<button type="button" data-coach-example="${escapeAttribute(example)}">${escapeHtml(example)}</button>`).join("")}
    </div>
  `;
  card.querySelectorAll("[data-coach-example]").forEach((button) => {
    button.addEventListener("click", () => {
      guidedReply.value = guidedReply.value ? `${guidedReply.value}, ${button.dataset.coachExample}` : button.dataset.coachExample;
      updateAssetPromptVisibility();
      guidedReply.focus();
    });
  });
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
  renderGuidedCoachCard();
}

function updateBuilderAvatarLabels() {
  if (!builderAvatarAssistant) return;
  builderAvatarAssistant.labels = {
    idle: t("assistantSubtitle"),
    listening: langText({ en: "I'm listening to your idea.", es: "Estoy escuchando tu idea.", fr: "J'écoute votre idée.", pt: "Estou ouvindo sua ideia." }),
    thinking: t("thinking"),
    speaking: langText({ en: "Guiding you step by step.", es: "Te guio paso a paso.", fr: "Je vous guide étape par étape.", pt: "Vou guiar você passo a passo." }),
    happy: langText({ en: "Ready to help.", es: "Listo para ayudarte.", fr: "Prête à vous aider.", pt: "Pronta para ajudar." }),
    confused: langText({ en: "I need a little more context.", es: "Necesito un poco mas de contexto.", fr: "J'ai besoin d'un peu plus de contexte.", pt: "Preciso de um pouco mais de contexto." }),
    success: langText({ en: "Your draft is ready.", es: "Tu borrador esta listo.", fr: "Votre brouillon est prêt.", pt: "Seu rascunho está pronto." }),
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
    imageUrl: "/public/brand/gnu-dev-assistant.png",
    compact: true,
    labels: {
      idle: t("assistantSubtitle"),
      listening: langText({ en: "I'm listening to your idea.", es: "Estoy escuchando tu idea.", fr: "J'écoute votre idée.", pt: "Estou ouvindo sua ideia." }),
      thinking: t("thinking"),
      speaking: langText({ en: "Guiding you step by step.", es: "Te guio paso a paso.", fr: "Je vous guide étape par étape.", pt: "Vou guiar você passo a passo." }),
      happy: langText({ en: "Ready to help.", es: "Listo para ayudarte.", fr: "Prête à vous aider.", pt: "Pronta para ajudar." }),
      confused: langText({ en: "I need a little more context.", es: "Necesito un poco mas de contexto.", fr: "J'ai besoin d'un peu plus de contexte.", pt: "Preciso de um pouco mais de contexto." }),
      success: langText({ en: "Your draft is ready.", es: "Tu borrador esta listo.", fr: "Votre brouillon est prêt.", pt: "Seu rascunho está pronto." }),
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
  if (/restaurante|restaurant|menu|menú|comida|food/.test(text)) return langText({ en: "Restaurant / food", es: "Restaurante / comida", fr: "Restaurant / alimentation", pt: "Restaurante / comida" });
  if (/barber|barberia|barbería|salon|spa|cita|reserva/.test(text)) return langText({ en: "Appointment services", es: "Servicios con citas", fr: "Services avec rendez-vous", pt: "Serviços com agendamento" });
  if (/curso|course|ebook|digital|software|membres/.test(text)) return langText({ en: "Digital products", es: "Productos digitales", fr: "Produits numériques", pt: "Produtos digitais" });
  if (/contractor|construction|remodel|pintura|roofing|flooring/.test(text)) return langText({ en: "Contractor", es: "Construccion / contractor", fr: "Construction / entrepreneur", pt: "Construção / empreiteiro" });
  if (/tienda|store|shop|producto|vender|ecommerce|amazon|ebay|cyberpunk|gamer/.test(text)) return langText({ en: "Online store / ecommerce", es: "Tienda online / ecommerce", fr: "Boutique en ligne / ecommerce", pt: "Loja online / ecommerce" });
  return "";
}

function resetAssistantConversation() {
  guidedChat.innerHTML = "";
  guidedHistory = [];
  setAssistantState("happy");
  renderGuidedCoachCard();
  if (restoredGuidedDraftInfo) {
    appendRestoredDraftMessage();
  }
  appendChatMessage("assistant", guidedQuestion(guidedStep), "happy");
  if (guidedStep === "websiteIntent") {
    appendChatMessage(
      "assistant",
      langText({
        en: "You can type examples like: I want something like Amazon, I want a restaurant menu, a booking site for a barbershop, or a cyberpunk online store.",
        es: "Puedes escribir algo como: quiero algo tipo Amazon, quiero un menu de restaurante, una barberia con citas, o una tienda cyberpunk super cool.",
        fr: "Vous pouvez écrire par exemple : je veux quelque chose comme Amazon, un menu de restaurant, un site de réservation pour un salon, ou une boutique cyberpunk.",
        pt: "Você pode escrever algo como: quero algo tipo Amazon, quero um menu de restaurante, um site de reservas para barbearia, ou uma loja cyberpunk.",
      }),
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
        completionPercent: guidedCompletionPercent(),
        missingSteps: missingGuidedSteps(),
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
        logoPalette: arrayValue(draft.guidedState.logoPalette),
        brand: draft.guidedState.brand || null,
        contactInfo: draft.guidedState.contactInfo || {},
      };
    }
    const missing = missingGuidedSteps();
    const savedStep = draft.guidedStep || guidedStep;
    guidedStep = savedStep === "review" && missing.length ? missing[0] : normalizeNextGuidedStep(savedStep);
    restoredGuidedDraftInfo = {
      savedAt: draft.savedAt || "",
      completionPercent: guidedCompletionPercent(),
      missing,
    };
    applyGuidedStateToForm();
  } catch {
    localStorage.removeItem(GUIDED_DRAFT_STORAGE_KEY);
  }
}

function appendRestoredDraftMessage() {
  const missingLabels = restoredGuidedDraftInfo.missing
    .slice(0, 3)
    .map((step) => t(step))
    .join(", ");
  const savedAt = formatDraftSavedAt(restoredGuidedDraftInfo.savedAt);
  appendChatMessage(
    "assistant",
    langText({
      en: `I found your saved draft${savedAt ? ` from ${savedAt}` : ""}. It is about ${restoredGuidedDraftInfo.completionPercent}% complete${missingLabels ? `. We still need: ${missingLabels}.` : "."} You can keep going without starting over.`,
      es: `Encontré tu borrador guardado${savedAt ? ` de ${savedAt}` : ""}. Va como en ${restoredGuidedDraftInfo.completionPercent}%${missingLabels ? `. Todavía falta: ${missingLabels}.` : "."} Puedes seguir sin empezar de cero.`,
      fr: `J'ai trouvé votre brouillon enregistré${savedAt ? ` de ${savedAt}` : ""}. Il est complété à environ ${restoredGuidedDraftInfo.completionPercent}%${missingLabels ? `. Il manque encore: ${missingLabels}.` : "."} Vous pouvez continuer sans recommencer.`,
      pt: `Encontrei seu rascunho salvo${savedAt ? ` de ${savedAt}` : ""}. Ele está cerca de ${restoredGuidedDraftInfo.completionPercent}% completo${missingLabels ? `. Ainda falta: ${missingLabels}.` : "."} Você pode continuar sem começar do zero.`,
    }),
    "success",
  );
}

function formatDraftSavedAt(value) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat(selectedLanguage, {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "";
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
    currentSchema = prepareWebsiteConfig(result.schema, { brand: result.schema.brand || guidedState.brand || {} }, null);
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

function captureStudioAuthRedirect() {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const queryParams = new URLSearchParams(window.location.search);
  const accessToken = hashParams.get("access_token") || queryParams.get("access_token") || "";
  const refreshToken = hashParams.get("refresh_token") || queryParams.get("refresh_token") || "";
  if (!accessToken) return;
  localStorage.setItem("lumaClientAccessToken", accessToken);
  if (refreshToken) localStorage.setItem("lumaClientRefreshToken", refreshToken);
  restorePendingStudioAfterAuth();
  const cleanUrl = new URL(window.location.href);
  cleanUrl.hash = "";
  ["access_token", "refresh_token", "expires_in", "expires_at", "token_type", "type"].forEach((param) => cleanUrl.searchParams.delete(param));
  window.history.replaceState({}, "", cleanUrl);
}

function restorePendingStudioAfterAuth() {
  try {
    const raw = localStorage.getItem("lumaPendingGeneratedSite");
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (!saved.schema) return;
    currentSchema = prepareWebsiteConfig(saved.schema, { brand: saved.schema.brand || guidedState.brand || {} }, null);
    currentSiteId = saved.siteId || currentSiteId;
    currentBusinessId = saved.businessId || currentBusinessId;
    currentCatalogItems = catalogItemsFromSchema(currentSchema);
    selectedPageKey = saved.selectedPageKey || currentSchema.pages?.[0]?.page_key || "home";
    selectedVariantId = currentSchema.design_variants?.[0]?.id || selectedVariantId || "";
    siteTitle.textContent = currentSchema.business?.name || "Generated site";
    storageStatus.textContent = langText({
      en: "Account connected. Your draft was restored.",
      es: "Cuenta conectada. Tu borrador fue restaurado.",
      fr: "Compte connecté. Votre brouillon a été restauré.",
      pt: "Conta conectada. Seu rascunho foi restaurado.",
    });
    renderEditor();
    renderPreview();
    showGeneratedClientPreview();
    continuePendingStudioAction();
  } catch {
    localStorage.removeItem("lumaPendingGeneratedSite");
  }
}

function continuePendingStudioAction() {
  const action = localStorage.getItem("lumaPendingAuthAction") || "";
  localStorage.removeItem("lumaPendingAuthAction");
  if (action === "save") {
    saveCurrentSchema();
  } else if (action === "review") {
    submitGeneratedDraftForReview();
  } else if (action === "publish") {
    storageStatus.textContent = langText({
      en: "Account connected. Review once more, then publish.",
      es: "Cuenta conectada. Revisa una vez más y luego publica.",
      fr: "Compte connecté. Vérifiez encore une fois, puis publiez.",
      pt: "Conta conectada. Revise mais uma vez e publique.",
    });
  }
}

async function sendGuidedReply() {
  const message = guidedReply.value.trim();
  if (!message) return;
  appendChatMessage("user", message);
  guidedReply.value = "";
  const broadLocalUpdates = inferGuidedUpdatesFromAnyMessage(message);
  mergeGuidedUpdates(broadLocalUpdates);
  if (guidedStep === "websiteIntent") {
    await handleWebsiteIntentAnswer(message);
    return;
  }
  if (guidedStep === "review") {
    const adjustmentLabel = langText({
      en: "Client requested adjustments",
      es: "Ajustes pedidos por el cliente",
      fr: "Ajustements demandés par le client",
      pt: "Ajustes solicitados pelo cliente",
    });
    if (currentSchema) {
      guidedState.revisionMode = "targeted_edit";
    }
    guidedState.requestedAdjustments = [
      ...arrayValue(guidedState.requestedAdjustments),
      `${adjustmentLabel}: ${message}`,
    ];
    appendChatMessage(
      "assistant",
      currentSchema
        ? langText({
            en: "Perfect, I added those adjustments to the brief. Press “Generate my website” to create a new version with only those changes.",
            es: "Perfecto, ya agregué esos ajustes al brief. Presiona “Generar mi página” para crear una nueva versión cambiando solo eso.",
            fr: "Parfait, j'ai ajouté ces ajustements au brief. Appuyez sur « Générer mon site » pour créer une version qui change seulement cela.",
            pt: "Perfeito, adicionei esses ajustes ao briefing. Pressione “Gerar meu site” para criar uma versão mudando apenas isso.",
          })
        : langText({
            en: "Perfect, I added that to the brief. Anything else you want to change or add before I generate?",
            es: "Perfecto, agregué eso al brief. ¿Quieres modificar algo más o agregar otro detalle antes de generar?",
            fr: "Parfait, j'ai ajouté cela au brief. Voulez-vous modifier ou ajouter autre chose avant de générer?",
            pt: "Perfeito, adicionei isso ao briefing. Quer mudar ou adicionar mais alguma coisa antes de gerar?",
          }),
      "success",
    );
    guidedStatusText.textContent = langText({
      en: "Extra details saved.",
      es: "Detalles adicionales guardados.",
      fr: "Détails supplémentaires enregistrés.",
      pt: "Detalhes adicionais salvos.",
    });
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
    mergeGuidedUpdates({ ...broadLocalUpdates, ...updatedFields });
    const serverNextStep = result.next_step || result.nextStep || "";
    guidedStep = result.readyToGenerate ? "review" : nextSmartGuidedStep(serverNextStep || guidedStep);
    const serverNextQuestion = result.nextQuestion || result.next_question;
    const nextQuestion = chooseNextQuestionText(serverNextQuestion, guidedStep);
    const publicAssistantMessage = composeAssistantReply(assistantMessage, nextQuestion, result.used_dev_fallback);
    appendUnderstandingCard({ updates: { ...broadLocalUpdates, ...updatedFields }, sourceMessage: message });
    appendChatMessage("assistant", publicAssistantMessage, result.used_dev_fallback ? "alert" : emotion);
    guidedStatusText.textContent = result.used_dev_fallback
      ? t("devFallbackMissingKey")
      : t("summaryUpdated");
  } catch (error) {
    const updates = { ...broadLocalUpdates, ...inferGuidedUpdates(guidedStep, message) };
    mergeGuidedUpdates(updates);
    guidedStep = nextSmartGuidedStep(guidedStep);
    console.warn("Luma intake assistant request failed; continuing locally.", error);
    appendUnderstandingCard({ updates, sourceMessage: message });
    appendChatMessage("assistant", composeAssistantReply(t("localFallbackMessage"), guidedQuestion(guidedStep), true), "speaking");
    guidedStatusText.textContent = t("localFallback");
  }
  setThinking(false);
  renderGuidedSummary();
  refreshQuickChips();
}

async function handleWebsiteIntentAnswer(message) {
  guidedStatusText.textContent = langText({
    en: "Detecting the best template...",
    es: "Detectando el mejor template...",
    fr: "Détection du meilleur template...",
    pt: "Detectando o melhor template...",
  });
  setThinking(true);
  try {
    const selection = await selectTemplateFromFreeText(message);
    forcedTemplateSelection = selection;
    guidedState.websiteIntent = message;
    if (!guidedState.industry) guidedState.industry = inferIndustryFromPrompt(message);
    if (!guidedState.preferredTone) guidedState.preferredTone = extractStyleHint(message);
    appendTemplateDetectionMessage(selection);
    await appendTemplatePreviewChoices(selection, message);
    guidedStep = nextSmartGuidedStep("websiteIntent");
    appendUnderstandingCard({ updates: inferGuidedUpdatesFromAnyMessage(message), sourceMessage: message });
    appendChatMessage("assistant", guidedQuestion(guidedStep), "speaking");
    guidedStatusText.textContent = langText({
      en: "Template detected. Let us continue with the business details.",
      es: "Template detectado. Sigamos con los datos del negocio.",
      fr: "Template détecté. Continuons avec les détails de l'entreprise.",
      pt: "Template detectado. Vamos continuar com os dados do negócio.",
    });
  } catch (error) {
    guidedState.websiteIntent = message;
    guidedStep = nextSmartGuidedStep("websiteIntent");
    appendChatMessage("assistant", t("localFallbackMessage"), "alert");
    console.warn("Luma template intent detection failed; continuing locally.", error);
    appendUnderstandingCard({ updates: inferGuidedUpdatesFromAnyMessage(message), sourceMessage: message });
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

async function getTemplatePreviewCandidates(selection, sourceMessage = "") {
  const candidates = [];
  const addCandidate = (candidate) => {
    if (!candidate?.templateId || candidates.some((item) => item.templateId === candidate.templateId)) return;
    const meta = templatePreviewMeta(candidate.templateId);
    candidates.push({
      ...meta,
      ...candidate,
      name: candidate.template?.clientSelectionCard?.title || candidate.template?.name || meta.name || candidate.templateId,
      description: candidate.template?.clientSelectionCard?.difference || candidate.template?.visualDifference || meta.description || "",
      image: meta.image || "/templates-preview/screenshots/premium.png",
      catalogType: candidate.catalogType || candidate.template?.catalogModel?.catalogType || meta.catalogType || "",
    });
  };

  addCandidate(selection);
  if (window.TemplateRouter?.getTemplateCandidates) {
    try {
      const ranked = await window.TemplateRouter.getTemplateCandidates(sourceMessage || guidedState.websiteIntent || "", 3);
      ranked.forEach(addCandidate);
    } catch (error) {
      console.warn("Template candidate ranking failed", error);
    }
  }

  rankedFallbackChoices(selection?.templateId).forEach(addCandidate);
  return candidates.slice(0, 3);
}

function rankedFallbackChoices(selectedTemplateId = "") {
  const selected = templatePreviewMeta(selectedTemplateId);
  const selectedCatalog = selected?.catalogType || "";
  const commerceHeavy = /marketplace|dense|listing/.test(selectedCatalog);
  const serviceHeavy = /service|booking/.test(selectedCatalog);
  const ordered = commerceHeavy
    ? ["mega-marketplace", "listing-marketplace-pro", "fashion-drop-pro", "apple-premium-product"]
    : serviceHeavy
      ? ["local-services-pro-plus", "booking-appointment-pro", "apple-premium-product", "fashion-drop-pro"]
      : ["apple-premium-product", "fashion-drop-pro", "mega-marketplace", "local-services-pro-plus"];
  return ordered.map((templateId) => templatePreviewMeta(templateId)).filter(Boolean);
}

function templatePreviewMeta(templateId) {
  return TEMPLATE_PREVIEW_CHOICES.find((choice) => choice.templateId === templateId) || null;
}

function localizedTemplateName(choice) {
  return choice?.names?.[selectedLanguage] || choice?.name || choice?.template?.clientSelectionCard?.title || choice?.template?.name || choice?.templateId || "";
}

function localizedTemplateDescription(choice) {
  return choice?.descriptions?.[selectedLanguage] || choice?.description || choice?.template?.clientSelectionCard?.difference || choice?.template?.visualDifference || "";
}

function buildSitePlan(selection = forcedTemplateSelection) {
  const template = selection?.template || {};
  const catalogType = selection?.catalogType || template.catalogModel?.catalogType || "";
  const isBooking = /booking|appointment/.test(catalogType);
  const isService = /service|quote|practice|project/.test(catalogType);
  const isListing = /listing/.test(catalogType);
  const isMarketplace = /marketplace|dense/.test(catalogType);
  const isDigital = /digital|pricing|ticket/.test(catalogType);
  const shopLabel = isBooking
    ? langText({ en: "Services", es: "Servicios", fr: "Services", pt: "Serviços" })
    : isService
      ? langText({ en: "Services", es: "Servicios", fr: "Services", pt: "Serviços" })
      : isListing
        ? langText({ en: "Listings", es: "Listados", fr: "Annonces", pt: "Anúncios" })
        : isDigital
          ? langText({ en: "Offers", es: "Ofertas", fr: "Offres", pt: "Ofertas" })
          : langText({ en: "Catalog", es: "Catálogo", fr: "Catalogue", pt: "Catálogo" });
  const actionLabel = isBooking
    ? langText({ en: "Booking", es: "Reservas", fr: "Réservation", pt: "Agendamento" })
    : isService
      ? langText({ en: "Quote", es: "Cotización", fr: "Devis", pt: "Orçamento" })
      : langText({ en: "Checkout / Contact", es: "Checkout / Contacto", fr: "Checkout / Contact", pt: "Checkout / Contato" });

  const templatePages = Array.isArray(template.pages) && template.pages.length
    ? template.pages.slice(0, 4).map((page, index) => ({
        key: slugify(page.name || page.page_key || `page-${index + 1}`),
        title: page.name || page.title || `Page ${index + 1}`,
        purpose: page.purpose || page.layout || "",
        sections: arrayValue(page.usesSections || page.sections).slice(0, 6),
      }))
    : [];

  const basePages = templatePages.length ? templatePages : [
    {
      key: "home",
      title: langText({ en: "Home", es: "Inicio", fr: "Accueil", pt: "Início" }),
      purpose: langText({ en: "Brand promise, hero, best offer, trust and primary CTA.", es: "Promesa de marca, hero, mejor oferta, confianza y CTA principal.", fr: "Promesse de marque, hero, offre principale, confiance et CTA.", pt: "Promessa da marca, hero, oferta principal, confiança e CTA." }),
      sections: ["Hero", "Featured", "Trust", "CTA"],
    },
    {
      key: "catalog",
      title: shopLabel,
      purpose: langText({ en: "Products/services with filters, cards and clear actions.", es: "Productos/servicios con filtros, tarjetas y acciones claras.", fr: "Produits/services avec filtres, cartes et actions claires.", pt: "Produtos/serviços com filtros, cards e ações claras." }),
      sections: ["Search", "Categories", "Grid", "Detail CTA"],
    },
    {
      key: "detail",
      title: isService ? langText({ en: "Service detail", es: "Detalle del servicio", fr: "Détail du service", pt: "Detalhe do serviço" }) : langText({ en: "Product detail", es: "Detalle de producto", fr: "Détail produit", pt: "Detalhe do produto" }),
      purpose: langText({ en: "Gallery, benefits, price/quote logic, proof and related items.", es: "Galería, beneficios, lógica de precio/cotización, prueba y relacionados.", fr: "Galerie, bénéfices, prix/devis, preuve et éléments liés.", pt: "Galeria, benefícios, preço/orçamento, prova e relacionados." }),
      sections: ["Gallery", "Benefits", "Proof", "Related"],
    },
    {
      key: "contact",
      title: actionLabel,
      purpose: langText({ en: "Final conversion path with contact, booking, quote or checkout intent.", es: "Ruta final de conversión con contacto, reserva, cotización o compra.", fr: "Parcours final avec contact, réservation, devis ou achat.", pt: "Caminho final com contato, agendamento, orçamento ou compra." }),
      sections: ["Contact", "Form", "Social", "Location"],
    },
  ];

  return {
    version: 1,
    approved: false,
    templateId: selection?.templateId || template.id || "",
    templateName: template.name || selection?.templateId || "",
    catalogType,
    strategy: template.visualDifference || template.catalogModel?.customerFeeling || "",
    pages: basePages,
    rules: [
      "Use this plan as the generation contract.",
      "Generate visible copy from client intent, not literal intake notes.",
      "Keep all pages, sections, products, colors and text editable.",
      "Do not replace this plan unless the client asks for a different structure.",
    ],
  };
}

function ensureSitePlan() {
  const currentTemplateId = forcedTemplateSelection?.templateId || guidedState.sitePlan?.templateId || "";
  if (!guidedState.sitePlan || guidedState.sitePlan.templateId !== currentTemplateId) {
    guidedState.sitePlan = buildSitePlan();
    guidedState.sitePlanApproved = false;
  }
  return guidedState.sitePlan;
}

function renderSitePlanCard() {
  const plan = ensureSitePlan();
  const card = document.createElement("section");
  card.className = `site-plan-card ${guidedState.sitePlanApproved ? "approved" : ""}`;
  card.innerHTML = `
    <div class="site-plan-head">
      <div>
        <span>${escapeHtml(langText({ en: "Site plan", es: "Plan del sitio", fr: "Plan du site", pt: "Plano do site" }))}</span>
        <strong>${escapeHtml(plan.templateName || plan.templateId || langText({ en: "Selected structure", es: "Estructura seleccionada", fr: "Structure sélectionnée", pt: "Estrutura selecionada" }))}</strong>
      </div>
      <em>${escapeHtml(plan.catalogType || "")}</em>
    </div>
    ${plan.strategy ? `<p>${escapeHtml(plan.strategy)}</p>` : ""}
    <div class="site-plan-pages">
      ${plan.pages.map((page, index) => `
        <article>
          <b>${index + 1}</b>
          <div>
            <strong>${escapeHtml(page.title)}</strong>
            <span>${escapeHtml(page.purpose)}</span>
            <small>${escapeHtml(arrayValue(page.sections).join(" · "))}</small>
          </div>
        </article>
      `).join("")}
    </div>
    <div class="site-plan-actions">
      <button type="button" data-site-plan-approve>${escapeHtml(guidedState.sitePlanApproved ? langText({ en: "Approved", es: "Aprobado", fr: "Approuvé", pt: "Aprovado" }) : langText({ en: "Approve this structure", es: "Aprobar estructura", fr: "Approuver la structure", pt: "Aprovar estrutura" }))}</button>
      <button type="button" data-site-plan-adjust>${escapeHtml(langText({ en: "Ask Luma to change it", es: "Pedir cambio a Luma", fr: "Demander un changement", pt: "Pedir mudança à Luma" }))}</button>
    </div>
  `;
  card.querySelector("[data-site-plan-approve]")?.addEventListener("click", () => {
    guidedState.sitePlanApproved = true;
    guidedState.sitePlan = { ...guidedState.sitePlan, approved: true };
    appendChatMessage("user", langText({ en: "I approve this site structure.", es: "Apruebo esta estructura del sitio.", fr: "J'approuve cette structure.", pt: "Aprovo esta estrutura do site." }));
    appendChatMessage("assistant", langText({
      en: "Good. I will use this plan as the structure for the draft and keep it editable.",
      es: "Bien. Usaré este plan como estructura del borrador y lo mantendré editable.",
      fr: "Très bien. J'utiliserai ce plan comme structure du brouillon et il restera modifiable.",
      pt: "Certo. Vou usar este plano como estrutura do rascunho e manter tudo editável.",
    }), "success");
    renderGuidedSummary();
  });
  card.querySelector("[data-site-plan-adjust]")?.addEventListener("click", () => {
    guidedStep = "review";
    guidedReply.value = langText({
      en: "Change the site plan: ",
      es: "Cambia el plan del sitio: ",
      fr: "Change le plan du site : ",
      pt: "Mude o plano do site: ",
    });
    guidedReply.focus();
  });
  return card;
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

async function appendTemplatePreviewChoices(selection, sourceMessage = "") {
  const selectedId = selection?.templateId || "";
  const choices = await getTemplatePreviewCandidates(selection, sourceMessage);
  const card = document.createElement("div");
  card.className = "template-choice-panel";
  const heading = document.createElement("div");
  heading.className = "template-choice-heading";
  heading.innerHTML = `<strong>${escapeHtml(langText({
    en: "Choose a visual base",
    es: "Elige una base visual",
    fr: "Choisissez une base visuelle",
    pt: "Escolha uma base visual",
  }))}</strong><span>${escapeHtml(langText({
    en: "Luma recommends one, but you can switch before generating.",
    es: "Luma recomienda una, pero puedes cambiarla antes de generar.",
    fr: "Luma en recommande une, mais vous pouvez changer avant de générer.",
    pt: "A Luma recomenda uma, mas você pode trocar antes de gerar.",
  }))}</span>`;
  const grid = document.createElement("div");
  grid.className = "template-choice-grid";
  choices.forEach((choice, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `template-choice-card ${choice.templateId === selectedId ? "recommended" : ""}`;
    button.dataset.templateChoice = choice.templateId;
    button.dataset.catalogType = choice.catalogType || "";
    button.innerHTML = `
      <img src="${escapeAttribute(choice.image)}" alt="">
      <span>${escapeHtml(choice.templateId === selectedId || index === 0 ? langText({ en: "Recommended", es: "Recomendada", fr: "Recommandée", pt: "Recomendada" }) : langText({ en: "Alternative", es: "Alternativa", fr: "Alternative", pt: "Alternativa" }))}</span>
      <strong>${escapeHtml(localizedTemplateName(choice))}</strong>
      <small>${escapeHtml(localizedTemplateDescription(choice))}</small>
      <em>${escapeHtml(choice.catalogType || "")}</em>
    `;
    button.addEventListener("click", () => chooseTemplatePreview(choice));
    grid.appendChild(button);
  });
  card.append(heading, grid);
  guidedChat.appendChild(card);
  guidedChat.scrollTop = guidedChat.scrollHeight;
}

async function chooseTemplatePreview(choice) {
  const template = window.TemplateRouter?.getTemplateById
    ? await window.TemplateRouter.getTemplateById(choice.templateId)
    : null;
  forcedTemplateSelection = {
    templateId: choice.templateId,
    template,
    catalogType: choice.catalogType,
    intent: "client_visual_template_choice",
    reason: "Client selected a visual template preview in guided setup",
  };
  guidedState.websiteIntent = guidedState.websiteIntent || localizedTemplateName(choice);
  document.querySelectorAll(".template-choice-card.selected").forEach((card) => card.classList.remove("selected"));
  document.querySelector(`[data-template-choice="${cssEscape(choice.templateId)}"]`)?.classList.add("selected");
  appendChatMessage(
    "user",
    langText({
      en: `Use ${localizedTemplateName(choice)}`,
      es: `Usar ${localizedTemplateName(choice)}`,
      fr: `Utiliser ${localizedTemplateName(choice)}`,
      pt: `Usar ${localizedTemplateName(choice)}`,
    }),
  );
  appendTemplateDetectionMessage(forcedTemplateSelection);
  renderGuidedCoachCard();
  renderGuidedSummary();
  saveGuidedDraft();
}

function skipGuidedQuestion() {
  appendChatMessage("user", t("skipMessage"));
  guidedAskedSteps.set(guidedStep, 1);
  guidedStep = nextSmartGuidedStep(guidedStep);
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
  guidedStep = field === "sectionsPreference" ? "review" : nextSmartGuidedStep(field);
  appendChatMessage("user", `${field}: ${decision}`);
  appendChatMessage("assistant", guidedQuestion(guidedStep), guidedStep === "review" ? "success" : "speaking");
  renderGuidedSummary();
}

function insertQuickChip(value) {
  const translated = translateChip(value);
  if (value === "Yes, correct") {
    guidedStep = nextSmartGuidedStep(guidedStep);
    appendChatMessage("user", translated);
    appendChatMessage("assistant", guidedQuestion(guidedStep), guidedStep === "review" ? "success" : "speaking");
    renderGuidedSummary();
    refreshQuickChips();
    return;
  }
  if (value === "Change style") {
    guidedStep = "preferredTone";
    guidedReply.value = "";
    appendChatMessage("user", translated);
    appendChatMessage("assistant", guidedQuestion(guidedStep), "speaking");
    renderGuidedSummary();
    refreshQuickChips();
    guidedReply.focus();
    return;
  }
  if (value === "Upload logo") {
    guidedLogoUpload.click();
    return;
  }
  if (value === "Generate now") {
    guidedStep = "review";
    renderGuidedSummary();
    handleGuidedGenerateButton();
    return;
  }
  if (value === "Use my logo colors") {
    guidedReply.value = translated;
    updateAssetPromptVisibility();
    guidedLogoUpload.click();
    guidedReply.focus();
    return;
  }
  guidedReply.value = guidedReply.value ? `${guidedReply.value}, ${translated}` : translated;
  updateAssetPromptVisibility();
  guidedReply.focus();
}

function refreshQuickChips() {
  const chipsByStep = {
    websiteIntent: ["Online store", "Marketplace", "Restaurant", "Services", "Booking", "Digital products"],
    preferredTone: ["Elegant", "Modern", "Premium", "Warm", "Professional", "Let AI decide"],
    preferredColors: ["Let AI choose", "Use my logo colors", "I have specific colors"],
    salesMode: ["Sell online", "Request quotes", "Calls/messages", "All of the above", "Not sure"],
    targetAudience: ["Local customers", "Families", "Professionals", "Businesses", "Let AI decide"],
    review: ["Yes, correct", "Change style", "Upload logo", "Generate now"],
  };
  const chips = chipsByStep[guidedStep] || [];
  quickChipRow.innerHTML = chips
    .map((chip) => `<button data-chip="${escapeAttribute(chip)}" type="button">${escapeHtml(translateChip(chip))}</button>`)
    .join("");
  quickChipRow.querySelectorAll("[data-chip]").forEach((button) => {
    button.addEventListener("click", () => insertQuickChip(button.dataset.chip));
  });
  updateAssetPromptVisibility();
}

function shouldShowAssetPrompt() {
  const typed = guidedReply?.value || "";
  return (
    ["preferredColors", "hasLogoPhotos", "review"].includes(guidedStep) ||
    Boolean(guidedState.hasLogoPhotos && !guidedState.hasLogo && !guidedState.hasPhotos) ||
    /logo|foto|fotos|imagen|imagenes|image|photo|photos|brand|marca|color|colors/i.test(typed)
  );
}

function updateAssetPromptVisibility() {
  guidedAssetPrompt?.classList.toggle("active", shouldShowAssetPrompt());
}

function appendUnderstandingCard({ updates = {}, sourceMessage = "" } = {}) {
  const filledItems = understandingItems().filter((item) => item.status === "detected");
  const missingItems = understandingItems().filter((item) => item.status === "missing");
  const changedKeys = Object.keys(updates || {}).filter((key) => key in guidedState);
  if (filledItems.length < 2 && changedKeys.length < 2 && !isRichIntakeMessage(sourceMessage)) return;

  const card = document.createElement("div");
  card.className = "chat-understanding-card";
  const heading = document.createElement("strong");
  heading.textContent = langText({
    en: "This is what I understood",
    es: "Esto es lo que entendí",
    fr: "Voici ce que j'ai compris",
    pt: "Foi isso que entendi",
  });
  const grid = document.createElement("div");
  grid.className = "understanding-grid";
  understandingItems()
    .filter((item) => item.status === "detected" || item.priority)
    .slice(0, 8)
    .forEach((item) => {
      const pill = document.createElement("span");
      pill.className = `understanding-pill ${item.status}`;
      pill.textContent = item.value ? `${item.label}: ${item.value}` : item.label;
      grid.appendChild(pill);
    });
  const footer = document.createElement("p");
  footer.textContent = missingItems.length
    ? langText({
        en: `Still useful to know: ${missingItems.slice(0, 3).map((item) => item.label).join(", ")}.`,
        es: `Todavía sería útil saber: ${missingItems.slice(0, 3).map((item) => item.label).join(", ")}.`,
        fr: `Il serait encore utile de connaître: ${missingItems.slice(0, 3).map((item) => item.label).join(", ")}.`,
        pt: `Ainda seria útil saber: ${missingItems.slice(0, 3).map((item) => item.label).join(", ")}.`,
      })
    : langText({
        en: "I have enough to prepare the first draft. You can review or generate.",
        es: "Ya tengo suficiente para preparar la primera versión. Puedes revisar o generar.",
        fr: "J'ai assez d'informations pour préparer le premier brouillon. Vous pouvez vérifier ou générer.",
        pt: "Já tenho o suficiente para preparar o primeiro rascunho. Você pode revisar ou gerar.",
      });
  card.append(heading, grid, footer);
  guidedChat.appendChild(card);
  guidedChat.scrollTop = guidedChat.scrollHeight;
}

function understandingItems() {
  return [
    understandingItem("businessName", t("businessName"), guidedState.businessName, true),
    understandingItem("websiteIntent", t("websiteIntent"), guidedState.websiteIntent || forcedTemplateSelection?.templateId, true),
    understandingItem("industry", t("industry"), guidedState.industry, true),
    understandingItem("location", t("location"), guidedState.location, false),
    understandingItem("servicesProducts", t("servicesProducts"), arrayValue(guidedState.servicesProducts).slice(0, 3).join(", "), true),
    understandingItem("preferredTone", t("preferredTone"), guidedState.preferredTone, false),
    understandingItem("preferredColors", t("preferredColors"), arrayValue(guidedState.preferredColors).slice(0, 4).join(", "), false),
    understandingItem("salesMode", t("salesMode"), guidedState.salesMode, false),
    understandingItem("contactInfo", t("contactInfo"), contactInfoCompactLabel(guidedState.contactInfo), true),
    understandingItem("hasLogoPhotos", t("hasLogoPhotos"), guidedState.hasLogoPhotos || (guidedState.hasLogo ? t("logoUrl") : ""), false),
  ];
}

function understandingItem(key, label, value, priority) {
  return {
    key,
    label,
    value,
    priority,
    status: value ? "detected" : "missing",
  };
}

function contactInfoCompactLabel(value) {
  const keys = Object.keys(value || {}).filter((key) => value[key]);
  return keys.slice(0, 3).join(", ");
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
      "Yes, correct": "Sí, correcto",
      "Change style": "Cambiar estilo",
      "Upload logo": "Subir logo",
      "Generate now": "Generar ya",
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
      "Yes, correct": "Oui, c'est correct",
      "Change style": "Changer le style",
      "Upload logo": "Importer un logo",
      "Generate now": "Générer maintenant",
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
      "Yes, correct": "Sim, correto",
      "Change style": "Mudar estilo",
      "Upload logo": "Enviar logo",
      "Generate now": "Gerar agora",
    },
  };
  return dictionary[selectedLanguage]?.[value] || value;
}

async function handleGuidedLogoUpload() {
  const file = guidedLogoUpload.files?.[0];
  if (!file) return;
  const localLogoUrl = await fileToDataUrl(file);
  let storedLogoUrl = localLogoUrl;
  try {
    storedLogoUrl = await uploadAssetOrFallback(file, "logo", "Uploaded logo");
  } catch {
    storedLogoUrl = localLogoUrl;
  }
  guidedState.logoUrl = storedLogoUrl || localLogoUrl;
  guidedState.hasLogo = true;
  const brand = await analyzeLogoBrand(localLogoUrl, {
    logoUrl: guidedState.logoUrl,
    businessName: guidedState.businessName,
    industry: guidedState.industry,
    tone: guidedState.preferredTone,
  });
  const palette = brand.extractedColors || [];
  guidedState.logoPalette = palette;
  guidedState.brand = brand;
  if (palette.length) {
    guidedState.preferredColors = palette;
  }
  guidedState.hasLogoPhotos = guidedState.hasPhotos ? "Logo and photos uploaded" : "Logo uploaded";
  applyBrandToCurrentSchema(brand);
  appendChatMessage(
    "assistant",
    palette.length
      ? langText({
          en: `Nice. I extracted this palette from the logo: ${palette.join(", ")}. I will use it as visual direction, not as page text.`,
          es: `Listo. Saqué esta paleta del logo: ${palette.join(", ")}. La usaré como dirección visual, no como texto de la página.`,
          fr: `Parfait. J'ai extrait cette palette du logo: ${palette.join(", ")}. Je l'utiliserai comme direction visuelle, pas comme texte du site.`,
          pt: `Pronto. Extraí esta paleta do logo: ${palette.join(", ")}. Vou usá-la como direção visual, não como texto do site.`,
        })
      : langText({
          en: "Logo uploaded. I will use it as visual direction for the draft.",
          es: "Logo subido. Lo usaré como referencia visual para la primera versión.",
          fr: "Logo importé. Je l'utiliserai comme référence visuelle pour la première version.",
          pt: "Logo enviado. Vou usá-lo como referência visual para o primeiro rascunho.",
        }),
    "success",
  );
  renderBrandKit();
  renderGuidedSummary();
  refreshQuickChips();
  saveGuidedDraft();
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
  appendChatMessage(
    "assistant",
    langText({
      en: "Photos uploaded. I will use them to make the draft feel closer to the real business.",
      es: "Fotos subidas. Las usaré para que la primera versión se sienta más cercana al negocio real.",
      fr: "Photos importées. Je les utiliserai pour rapprocher le brouillon du vrai business.",
      pt: "Fotos enviadas. Vou usá-las para deixar o rascunho mais próximo do negócio real.",
    }),
    "success",
  );
  renderGuidedSummary();
  saveGuidedDraft();
}

async function extractPaletteFromDataUrl(dataUrl) {
  if (!dataUrl || !dataUrl.startsWith("data:image")) return [];
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  const size = 96;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return [];
  context.drawImage(image, 0, 0, size, size);
  const pixels = context.getImageData(0, 0, size, size).data;
  const buckets = new Map();
  for (let i = 0; i < pixels.length; i += 16) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3];
    if (a < 150) continue;
    const brightness = (r + g + b) / 3;
    if (brightness > 244 || brightness < 18) continue;
    const saturation = Math.max(r, g, b) - Math.min(r, g, b);
    if (saturation < 18 && brightness > 210) continue;
    const key = [r, g, b].map((channel) => Math.round(channel / 24) * 24).join(",");
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }
  return Array.from(buckets.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => key.split(",").map(Number))
    .reduce((palette, rgb) => {
      if (palette.length >= 5) return palette;
      const isDifferent = palette.every((hex) => colorDistance(rgb, hexToRgb(hex)) > 54);
      if (isDifferent) palette.push(rgbToHex(...rgb));
      return palette;
    }, []);
}

async function analyzeLogoBrand(dataUrl, context = {}) {
  const extractedColors = await extractPaletteFromDataUrl(dataUrl);
  return createBrandSystem({
    ...context,
    extractedColors,
    logoUrl: context.logoUrl || dataUrl || "",
  });
}

function createBrandSystem(input = {}) {
  const extractedColors = arrayValue(input.extractedColors)
    .map((color) => resolveColor(color, ""))
    .filter(Boolean);
  const preferredColors = arrayValue(input.preferredColors)
    .map((color) => resolveColor(color, ""))
    .filter(Boolean);
  const sourceColors = [...extractedColors, ...preferredColors].filter((color, index, list) => list.indexOf(color) === index);
  const primary = selectAccessibleBrandColor(sourceColors, DEFAULT_BRAND.primaryColor);
  const secondarySource = sourceColors.find((color) => colorDistance(hexToRgb(color), hexToRgb(primary)) > 72) || rotateHue(primary, 26);
  const accent = ensureContrastColor(adjustColor(secondarySource, { saturation: 1.16, lightness: -0.02 }), "#ffffff", 3) || primary;
  const background = mixColors(primary, "#ffffff", 0.06);
  const surface = "#ffffff";
  const text = contrastRatio("#101828", background) >= 7 ? "#101828" : "#0b1220";
  const muted = ensureContrastColor(mixColors(text, background, 0.42), background, 4.5) || "#475467";
  const secondary = mixColors(primary, "#ffffff", 0.84);
  const button = contrastRatio(primary, "#ffffff") >= 4.5 ? primary : darkenUntilContrast(primary, "#ffffff", 4.5);
  const businessText = `${input.businessName || ""} ${input.industry || ""} ${input.tone || ""}`.toLowerCase();
  const isPremium = /premium|luxury|lujo|elegant|elegante|boutique/.test(businessText);
  const isOperational = /service|servicio|repair|clean|limpieza|contractor|professional|legal|account/.test(businessText);
  const radius = isPremium ? "6px" : isOperational ? "8px" : "12px";
  return {
    ...DEFAULT_BRAND,
    logoUrl: input.logoUrl || "",
    primaryColor: primary,
    secondaryColor: secondary,
    accentColor: accent,
    backgroundColor: background,
    surfaceColor: surface,
    textColor: text,
    mutedTextColor: muted,
    borderColor: mixColors(text, background, 0.14),
    buttonColor: button,
    buttonTextColor: contrastColor(button),
    styleDirection: isPremium ? "refined premium" : isOperational ? "trustworthy conversion-focused" : "modern professional",
    fontPairing: isPremium ? { heading: "Playfair Display", body: "Inter" } : { heading: "Inter", body: "Inter" },
    borderRadius: radius,
    shadowStyle: `0 18px 48px ${hexToRgba(text, 0.1)}`,
    extractedColors,
    paletteSource: extractedColors.length ? "uploaded_logo" : "guided_preferences",
  };
}

function selectAccessibleBrandColor(colors, fallback) {
  const ranked = colors
    .map((color) => ({ color, score: brandColorScore(color) }))
    .filter((item) => contrastRatio(item.color, "#ffffff") >= 3 || contrastRatio(item.color, "#101828") >= 3)
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.color || fallback;
}

function brandColorScore(color) {
  const [r, g, b] = hexToRgb(color);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max - min;
  const brightness = (r + g + b) / 3;
  const contrast = Math.max(contrastRatio(color, "#ffffff"), contrastRatio(color, "#101828"));
  return saturation * 1.2 + contrast * 20 - Math.abs(brightness - 118) * 0.35;
}

function ensureContrastColor(color, background, minRatio) {
  if (contrastRatio(color, background) >= minRatio) return color;
  const darker = darkenUntilContrast(color, background, minRatio);
  if (contrastRatio(darker, background) >= minRatio) return darker;
  const lighter = lightenUntilContrast(color, background, minRatio);
  return contrastRatio(lighter, background) >= minRatio ? lighter : color;
}

function darkenUntilContrast(color, background, minRatio) {
  let current = color;
  for (let i = 0; i < 18 && contrastRatio(current, background) < minRatio; i += 1) {
    current = mixColors(current, "#000000", 0.12);
  }
  return current;
}

function lightenUntilContrast(color, background, minRatio) {
  let current = color;
  for (let i = 0; i < 18 && contrastRatio(current, background) < minRatio; i += 1) {
    current = mixColors(current, "#ffffff", 0.12);
  }
  return current;
}

function contrastColor(color) {
  return contrastRatio(color, "#ffffff") >= contrastRatio(color, "#101828") ? "#ffffff" : "#101828";
}

function contrastRatio(a, b) {
  const l1 = relativeLuminance(hexToRgb(resolveColor(a, "#000000")));
  const l2 = relativeLuminance(hexToRgb(resolveColor(b, "#ffffff")));
  const light = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (light + 0.05) / (dark + 0.05);
}

function relativeLuminance(rgb) {
  const [r, g, b] = rgb.map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function mixColors(a, b, amount = 0.5) {
  const first = hexToRgb(resolveColor(a, "#000000"));
  const second = hexToRgb(resolveColor(b, "#ffffff"));
  const mixed = first.map((channel, index) => Math.round(channel * (1 - amount) + second[index] * amount));
  return rgbToHex(mixed[0], mixed[1], mixed[2]);
}

function adjustColor(color, options = {}) {
  const [h, s, l] = rgbToHsl(...hexToRgb(resolveColor(color, DEFAULT_BRAND.primaryColor)));
  return hslToHex(
    h,
    Math.max(0, Math.min(1, s * (options.saturation || 1))),
    Math.max(0, Math.min(1, l + (options.lightness || 0))),
  );
}

function rotateHue(color, degrees) {
  const [h, s, l] = rgbToHsl(...hexToRgb(resolveColor(color, DEFAULT_BRAND.primaryColor)));
  return hslToHex((h + degrees + 360) % 360, s, l);
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}

function hslToHex(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] :
    h < 120 ? [x, c, 0] :
    h < 180 ? [0, c, x] :
    h < 240 ? [0, x, c] :
    h < 300 ? [x, 0, c] : [c, 0, x];
  return rgbToHex(Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255));
}

function hexToRgba(hex, alpha) {
  const [r, g, b] = hexToRgb(resolveColor(hex, "#101828"));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b].map((value) => Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0")).join("")}`;
}

function hexToRgb(hex) {
  const normalized = String(hex || "").replace("#", "");
  if (normalized.length !== 6) return [0, 0, 0];
  return [0, 2, 4].map((index) => parseInt(normalized.slice(index, index + 2), 16));
}

function colorDistance(a, b) {
  return Math.sqrt(
    Math.pow((a[0] || 0) - (b[0] || 0), 2) +
      Math.pow((a[1] || 0) - (b[1] || 0), 2) +
      Math.pow((a[2] || 0) - (b[2] || 0), 2),
  );
}

function renderAssetPreviews() {
  guidedLogoPreview.src = guidedState.logoUrl || "";
  guidedLogoPreview.classList.toggle("active", Boolean(guidedState.logoUrl));
  guidedPhotoPreview.innerHTML = arrayValue(guidedState.photoUrls)
    .slice(0, 4)
    .map((url) => `<img src="${escapeAttribute(url)}" alt="">`)
    .join("");
  renderBrandKit();
}

function renderBrandKit(brand = guidedState.brand) {
  if (!brandKitPanel) return;
  const normalizedBrand = normalizeBrand(brand || (guidedState.logoUrl ? { logoUrl: guidedState.logoUrl } : null));
  brandKitPanel.hidden = !normalizedBrand.logoUrl && !guidedState.logoPalette.length;
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

function applyBrandToCurrentSchema(brand) {
  if (!currentSchema || !brand) return;
  currentSchema = applyBrandSystemToSchema(currentSchema, brand);
  currentCatalogItems = catalogItemsFromSchema(currentSchema);
  renderEditor();
  renderPreview();
}

async function reviewAndGenerateFromGuided() {
  syncGuidedStateFromSummary();
  normalizeGuidedStateBeforeGenerate();
  applyGuidedStateToForm();
  guidedGenerateButton.disabled = true;
  guidedGenerateButton.textContent = langText({
    en: "Saving request...",
    es: "Guardando solicitud...",
    fr: "Enregistrement de la demande...",
    pt: "Salvando solicitação...",
  });
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
    langText({
      en: `Professional website for ${guidedState.businessName} focused on ${services.join(", ") || guidedState.industry}.`,
      es: `Pagina profesional para ${guidedState.businessName} enfocada en ${services.join(", ") || guidedState.industry}.`,
      fr: `Site professionnel pour ${guidedState.businessName} axé sur ${services.join(", ") || guidedState.industry}.`,
      pt: `Site profissional para ${guidedState.businessName} focado em ${services.join(", ") || guidedState.industry}.`,
    });
  guidedState.servicesProducts = services.length ? services : [t("featuredOffer"), t("mainService"), t("contactRequest")];
  guidedState.targetAudience = guidedState.targetAudience || t("letAiDecide");
  guidedState.preferredTone = guidedState.preferredTone || t("letAiDecide");
  guidedState.preferredColors = arrayValue(guidedState.preferredColors).length
    ? arrayValue(guidedState.preferredColors)
    : arrayValue(guidedState.logoPalette).length
      ? arrayValue(guidedState.logoPalette)
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
    return langText({
      en: "Online store / ecommerce",
      es: "Tienda online / ecommerce",
      fr: "Boutique en ligne / ecommerce",
      pt: "Loja online / ecommerce",
    });
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
  currentInfoMeta.textContent = conversationProgressLabel();
  renderGuidedCoachCard();
  renderAssetPreviews();
  renderSelectedDomainState();
  updateAssetPromptVisibility();
  renderSitePlanInChatIfNeeded();
  saveGuidedDraft();
}

function renderSitePlanInChatIfNeeded() {
  if (guidedStep !== "review" || !guidedChat) return;
  guidedChat.querySelectorAll(".site-plan-card").forEach((card) => card.remove());
  guidedChat.appendChild(renderSitePlanCard());
  guidedChat.scrollTop = guidedChat.scrollHeight;
}

function renderSelectedDomainState() {
  if (!domainCheckStatus || !guidedState.desiredDomain || domainResults?.children.length) return;
  domainCheckStatus.textContent = langText({
    en: "You can check availability before generating.",
    es: "Puedes verificar disponibilidad antes de generar.",
    fr: "Vous pouvez vérifier la disponibilité avant de générer.",
    pt: "Você pode verificar a disponibilidade antes de gerar.",
  });
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

function renderDomainResults(result) {
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
      guidedState.desiredDomain = button.dataset.domainChoice;
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

function domainStatusLabel(item) {
  const status = item.status || "";
  const labels = {
    available_included: { en: "Available in package", es: "Disponible en el paquete", fr: "Disponible dans le forfait", pt: "Disponível no pacote" },
    available_requires_review: { en: "Available, needs review", es: "Disponible, requiere revision", fr: "Disponible, vérification requise", pt: "Disponível, precisa de revisão" },
    not_available: { en: "Not available", es: "No disponible", fr: "Non disponible", pt: "Não disponível" },
    needs_registrar_check: { en: "Suggestion, confirm before payment", es: "Sugerencia, confirmar antes de pagar", fr: "Suggestion, confirmer avant paiement", pt: "Sugestão, confirmar antes do pagamento" },
  };
  return labels[status] ? langText(labels[status]) : status || langText({ en: "Suggested option", es: "Opcion sugerida", fr: "Option suggérée", pt: "Opção sugerida" });
}

function openReviewDetails() {
  syncGuidedStateFromSummary();
  document.body.classList.add("review-details-open");
  renderGuidedSummary();
}

function keepChatting() {
  document.body.classList.remove("review-details-open", "final-review-mode");
  const nextMissing = nextSmartGuidedStep(guidedStep, { allowReview: false });
  guidedStep = nextMissing || "review";
  const message = nextMissing
    ? langText({
        en: `We can keep going. The most useful missing detail is this:\n\n${guidedQuestion(nextMissing)}`,
        es: `Podemos seguir. Lo más útil que falta es esto:\n\n${guidedQuestion(nextMissing)}`,
        fr: `Nous pouvons continuer. Le détail manquant le plus utile est celui-ci :\n\n${guidedQuestion(nextMissing)}`,
        pt: `Podemos continuar. O detalhe mais útil que falta é este:\n\n${guidedQuestion(nextMissing)}`,
      })
    : langText({
        en: "What would you like to change or add? You can ask for style changes, upload a logo/photo, add products, change colors, or clarify any detail.",
        es: "¿Qué quieres cambiar o agregar? Puedes pedir cambios de estilo, subir logo/foto, agregar productos, cambiar colores o aclarar cualquier detalle.",
        fr: "Que voulez-vous modifier ou ajouter ? Vous pouvez demander un changement de style, importer un logo/photo, ajouter des produits, changer les couleurs ou clarifier un détail.",
        pt: "O que você quer mudar ou adicionar? Pode pedir mudança de estilo, enviar logo/foto, adicionar produtos, mudar cores ou esclarecer qualquer detalhe.",
      });
  appendChatMessage("assistant", message, "speaking");
  guidedReply.focus();
  renderGuidedSummary();
  refreshQuickChips();
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

function missingGuidedSteps() {
  const requiredMissing = REQUIRED_GUIDED_STEPS.filter((step) => !isGuidedStepAnswered(step));
  if (requiredMissing.length) return requiredMissing;
  return SMART_GUIDED_STEP_PRIORITY.filter((step) => {
    if (!OPTIONAL_GUIDED_STEPS.has(step)) return false;
    if (step === "desiredDomain") return false;
    if (isGuidedStepAnswered(step)) return false;
    return (guidedAskedSteps.get(step) || 0) < 1;
  });
}

function guidedCompletionPercent() {
  const requiredCompleted = REQUIRED_GUIDED_STEPS.filter((step) => isGuidedStepAnswered(step)).length;
  const optionalSteps = SMART_GUIDED_STEP_PRIORITY.filter((step) => OPTIONAL_GUIDED_STEPS.has(step) && step !== "desiredDomain");
  const optionalCompleted = optionalSteps.filter((step) => isGuidedStepAnswered(step) || (guidedAskedSteps.get(step) || 0) > 0).length;
  const requiredScore = (requiredCompleted / REQUIRED_GUIDED_STEPS.length) * 82;
  const optionalScore = optionalSteps.length ? (optionalCompleted / optionalSteps.length) * 18 : 18;
  return Math.min(100, Math.round(requiredScore + optionalScore));
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

function conversationProgressLabel() {
  const missing = missingGuidedSteps();
  if (!missing.length) {
    return langText({
      en: `${guidedCompletionPercent()}% · ready to review`,
      es: `${guidedCompletionPercent()}% · listo para revisar`,
      fr: `${guidedCompletionPercent()}% · prêt à vérifier`,
      pt: `${guidedCompletionPercent()}% · pronto para revisar`,
    });
  }
  return langText({
    en: `${guidedCompletionPercent()}% · missing ${missing.length}`,
    es: `${guidedCompletionPercent()}% · faltan ${missing.length}`,
    fr: `${guidedCompletionPercent()}% · ${missing.length} manquant(s)`,
    pt: `${guidedCompletionPercent()}% · faltam ${missing.length}`,
  });
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
    if (key === "businessName" && isInvalidBusinessNameUpdate(value)) return;
    if (key === "contactInfo") {
      guidedState.contactInfo = { ...guidedState.contactInfo, ...(value || {}) };
    } else if (["servicesProducts", "preferredColors", "photoUrls"].includes(key)) {
      guidedState[key] = arrayValue(value);
    } else {
      guidedState[key] = value || guidedState[key];
    }
  });
}

function isInvalidBusinessNameUpdate(value) {
  const text = String(value || "").trim();
  return text.length > 70 || /(\n|productos?|servicios?|ubicaci[oó]n|contacto|telefono|tel[eé]fono|whatsapp|instagram|colores?|vende|ofrece)/i.test(text);
}

function guidedStateForApi() {
  const logoUrl = isCloudSafeUrl(guidedState.logoUrl) ? guidedState.logoUrl : "";
  const photoUrls = arrayValue(guidedState.photoUrls).filter(isCloudSafeUrl);
  const payload = {
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
    logoPalette: arrayValue(guidedState.logoPalette),
    brand: normalizeBrand(guidedState.brand || { logoUrl, extractedColors: arrayValue(guidedState.logoPalette) }),
    designStrategy: createDesignStrategy({
      business_name: guidedState.businessName,
      business_description: guidedState.businessDescription,
      industry: guidedState.industry,
      target_audience: guidedState.targetAudience,
      preferred_tone: guidedState.preferredTone,
      salesMode: guidedState.salesMode,
    }),
    qualityRules: DESIGN_QUALITY_RULES,
    selectedLanguage,
    hasLogo: Boolean(guidedState.hasLogo || guidedState.logoUrl),
    hasPhotos: Boolean(guidedState.hasPhotos || arrayValue(guidedState.photoUrls).length),
    salesMode: guidedState.salesMode,
    hasLogoPhotos: guidedState.hasLogoPhotos,
    sectionsPreference: guidedState.sectionsPreference,
    sitePlan: guidedState.sitePlan || (forcedTemplateSelection?.templateId ? buildSitePlan() : null),
    sitePlanApproved: Boolean(guidedState.sitePlanApproved),
    source: "ai_guided_setup",
    status: "ready_to_generate",
    brandContextNote:
      "Intake answers describe what the client wants and should guide design strategy. Do not copy internal context literally into visible website copy unless it sounds natural for the brand.",
  };
  const revisionInstructions = buildRevisionInstructions();
  if (revisionInstructions) {
    payload.revisionMode = revisionInstructions.mode;
    payload.requestedAdjustments = revisionInstructions.requestedAdjustments;
    payload.revisionInstructions = {
      ...revisionInstructions,
      previousSchema: undefined,
    };
  }
  return payload;
}

function isCloudSafeUrl(value) {
  const text = String(value || "");
  return Boolean(text) && !text.startsWith("data:");
}

function appendChatMessage(role, message, emotion = "neutral") {
  const cleanMessage = role === "assistant" || role === "system" ? sanitizeAssistantMessage(message) : message;
  if ((role === "assistant" || role === "system") && cleanMessage) {
    trackAssistantPrompt(cleanMessage);
  }
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
    text.textContent = cleanMessage;
    bubble.append(avatar, text);
    speakAssistantMessage(cleanMessage);
  } else {
    bubble.textContent = cleanMessage;
  }
  guidedChat.appendChild(bubble);
  guidedChat.scrollTop = guidedChat.scrollHeight;
}

function trackAssistantPrompt(message) {
  const signature = questionSignature(message);
  if (signature && signature === lastAssistantPromptSignature) return;
  lastAssistantPromptSignature = signature;
  if (!guidedStep || guidedStep === "review") return;
  if (message.includes(guidedQuestion(guidedStep)) || /[?¿]/.test(message)) {
    guidedAskedSteps.set(guidedStep, (guidedAskedSteps.get(guidedStep) || 0) + 1);
  }
}

function setThinking(active) {
  guidedThinking.classList.toggle("active", active);
  if (active) {
    setAssistantState("thinking");
  } else if (assistantState === "thinking") {
    setAssistantState(guidedStep === "review" ? "success" : "neutral");
  }
}

function nextSmartGuidedStep(referenceStep = guidedStep, options = {}) {
  const { allowReview = true } = options;
  const requiredMissing = REQUIRED_GUIDED_STEPS.find((step) => !isGuidedStepAnswered(step));
  if (requiredMissing) return requiredMissing;

  const referenceIndex = SMART_GUIDED_STEP_PRIORITY.indexOf(referenceStep);
  const ordered = referenceIndex >= 0
    ? [
        ...SMART_GUIDED_STEP_PRIORITY.slice(referenceIndex + 1),
        ...SMART_GUIDED_STEP_PRIORITY.slice(0, referenceIndex + 1),
      ]
    : SMART_GUIDED_STEP_PRIORITY;

  const optionalMissing = ordered.find((step) => {
    if (!OPTIONAL_GUIDED_STEPS.has(step)) return false;
    if (isGuidedStepAnswered(step)) return false;
    const askedCount = guidedAskedSteps.get(step) || 0;
    return askedCount < 1;
  });
  if (optionalMissing) return optionalMissing;

  return allowReview ? "review" : "";
}

function chooseNextQuestionText(serverQuestion, step) {
  if (step === "review") return guidedQuestion("review");
  const fallback = guidedQuestion(step);
  const candidate = String(serverQuestion || "").trim();
  if (!candidate) return fallback;
  if (isDuplicateQuestion(candidate, fallback)) return fallback;
  return candidate;
}

function composeAssistantReply(message, nextQuestion, usedFallback = false) {
  const cleanMessage = sanitizeAssistantMessage(message || "");
  const cleanQuestion = sanitizeAssistantMessage(nextQuestion || "");
  const base = usedFallback && !cleanMessage ? t("localFallbackMessage") : cleanMessage;
  if (!cleanQuestion) return base || t("localFallbackMessage");
  if (!base || isDuplicateQuestion(base, cleanQuestion) || base.includes(cleanQuestion)) return cleanQuestion;
  return `${base}\n\n${cleanQuestion}`;
}

function sanitizeAssistantMessage(message) {
  return String(message || "")
    .replace(/Development fallback:?\s*/gi, "")
    .replace(/Load failed\.?/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function isDuplicateQuestion(a, b) {
  const left = questionSignature(a);
  const right = questionSignature(b);
  return Boolean(left && right && (left === right || left.includes(right) || right.includes(left)));
}

function questionSignature(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(what|which|who|where|do|does|want|quieres|tienes|que|cual|como|donde|para|the|a|el|la|los|las|un|una|de|del)\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function nextGuidedStep(step) {
  const index = GUIDED_STEPS.indexOf(step);
  for (let i = Math.min((index < 0 ? 0 : index) + 1, GUIDED_STEPS.length - 1); i < GUIDED_STEPS.length; i += 1) {
    const candidate = GUIDED_STEPS[i];
    if (candidate === "review" || !isGuidedStepAnswered(candidate)) return candidate;
  }
  return "review";
}

function normalizeNextGuidedStep(step) {
  const candidate = GUIDED_STEPS.includes(step) ? step : nextGuidedStep(guidedStep);
  if (candidate === "review") return "review";
  return isGuidedStepAnswered(candidate) ? nextGuidedStep(candidate) : candidate;
}

function isGuidedStepAnswered(step) {
  if (step === "websiteIntent") return Boolean(guidedState.websiteIntent);
  if (step === "businessName") return Boolean(guidedState.businessName);
  if (step === "businessDescription") return Boolean(guidedState.businessDescription);
  if (step === "industry") return Boolean(guidedState.industry);
  if (step === "location") return Boolean(guidedState.location);
  if (step === "servicesProducts") return arrayValue(guidedState.servicesProducts).length > 0;
  if (step === "targetAudience") return Boolean(guidedState.targetAudience);
  if (step === "preferredTone") return Boolean(guidedState.preferredTone);
  if (step === "preferredColors") {
    return arrayValue(guidedState.preferredColors).length > 0 || arrayValue(guidedState.logoPalette).length > 0;
  }
  if (step === "contactInfo") return Object.keys(guidedState.contactInfo || {}).length > 0;
  if (step === "salesMode") return Boolean(guidedState.salesMode);
  if (step === "hasLogoPhotos") {
    return Boolean(guidedState.hasLogoPhotos || guidedState.hasLogo || guidedState.hasPhotos);
  }
  if (step === "desiredDomain") return Boolean(guidedState.desiredDomain);
  return false;
}

function inferGuidedUpdates(step, message) {
  if (step === "servicesProducts") return { servicesProducts: splitCommaOrLines(message) };
  if (step === "preferredColors") return { preferredColors: splitCommaOrLines(message) };
  if (step === "contactInfo") return { contactInfo: parseKeyValueLines(message.includes(":") ? message : `notes: ${message}`) };
  if (step === "businessName" && isRichIntakeMessage(message) && !extractBusinessName(message)) {
    return {};
  }
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

function inferGuidedUpdatesFromAnyMessage(message) {
  const text = String(message || "").trim();
  const lower = text.toLowerCase();
  const updates = {};

  if (!guidedState.websiteIntent && isRichIntakeMessage(text)) {
    updates.websiteIntent = extractWebsiteIntent(text);
  }
  if (!guidedState.businessDescription && text.length > 45) {
    updates.businessDescription = text;
  }

  const businessName = extractBusinessName(text);
  if (businessName && !guidedState.businessName) updates.businessName = businessName;

  const industry = inferIndustryFromPrompt(text);
  if (industry && !guidedState.industry) updates.industry = industry;

  const location = extractLocation(text);
  if (location && !guidedState.location) updates.location = location;

  const services = extractServicesProducts(text);
  if (services.length && !arrayValue(guidedState.servicesProducts).length) {
    updates.servicesProducts = services;
  }

  const audience = extractTargetAudience(text);
  if (audience && !guidedState.targetAudience) updates.targetAudience = audience;

  const tone = extractToneFromText(text);
  if (tone && !guidedState.preferredTone) updates.preferredTone = tone;

  const colors = extractColorsFromText(text);
  if (colors.length && !arrayValue(guidedState.preferredColors).length) {
    updates.preferredColors = colors;
  }

  const contactInfo = extractContactInfo(text);
  if (Object.keys(contactInfo).length) {
    updates.contactInfo = contactInfo;
  }

  const salesMode = extractSalesMode(lower);
  if (salesMode && !guidedState.salesMode) updates.salesMode = salesMode;

  if (/logo|foto|fotos|imagen|imagenes|photo|photos|image|images/.test(lower) && !guidedState.hasLogoPhotos) {
    updates.hasLogoPhotos = langText({
      en: "Client mentioned logo/photos",
      es: "El cliente mencionó logo/fotos",
      fr: "Le client a mentionné logo/photos",
      pt: "O cliente mencionou logo/fotos",
    });
  }

  return updates;
}

function isRichIntakeMessage(text) {
  return text.length > 80 || /nombre|negocio|tienda|ubic|productos|servicios|contact|telefono|teléfono|whatsapp|instagram|colores|vende|ofrece|audiencia|clientes|location|products|services|email|phone|colors/i.test(text);
}

function extractWebsiteIntent(text) {
  if (/marketplace|amazon|ebay/i.test(text)) return "Marketplace / online store";
  if (/restaurante|restaurant|menu|menú/i.test(text)) return "Restaurant menu website";
  if (/cita|reserva|booking|appointment/i.test(text)) return "Booking website";
  if (/tienda|store|shop|ecommerce|venta online|vender online/i.test(text)) return "Online store";
  if (/servicio|services|cotizacion|cotización|quote/i.test(text)) return "Service business website";
  return text.slice(0, 180);
}

function extractBusinessName(text) {
  const patterns = [
    /(?:nombre(?: del negocio)?|negocio|tienda|marca|empresa)\s*(?:es|se llama|:|-)\s*([^.,;\n]+)/i,
    /(?:business(?: name)?|store|brand|company)\s*(?:is|called|:|-)\s*([^.,;\n]+)/i,
    /(?:se llama|called)\s+([^.,;\n]+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return cleanExtractedPhrase(match[1], 56);
  }
  return "";
}

function extractLocation(text) {
  const patterns = [
    /(?:ubicaci[oó]n|ubicado en|est[aá] en|atiende en|localidad|ciudad|zona)\s*(?:es|:|-)?\s*([^.,;\n]+)/i,
    /(?:en|desde)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,2})(?:\s|,|\.|;|$)/,
    /(?:location|located in|serves|city|area)\s*(?:is|:|-)?\s*([^.,;\n]+)/i,
    /(?:in|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})(?:\s|,|\.|;|$)/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return cleanExtractedPhrase(match[1], 70);
  }
  return "";
}

function extractServicesProducts(text) {
  const patterns = [
    /(?:productos?|servicios?|vende|vendo|ofrece|ofrecemos|catalogo|cat[aá]logo)\s*(?:son|es|:|-)?\s*([^.;\n]+)/i,
    /(?:tienda|negocio|marca|empresa)\s+de\s+([^.;\n]+)/i,
    /(?:pagina|p[aá]gina|web|site)\s+de\s+([^.;\n]+)/i,
    /(?:products?|services?|sells|offers|catalog)\s*(?:are|is|:|-)?\s*([^.;\n]+)/i,
    /(?:store|shop|business|brand|website)\s+(?:for|of)\s+([^.;\n]+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return splitCommaOrLines(match[1])
        .map((item) => cleanExtractedPhrase(item, 48))
        .filter((item) => item.length > 1)
        .slice(0, 8);
    }
  }
  return [];
}

function extractTargetAudience(text) {
  const patterns = [
    /(?:audiencia|cliente ideal|clientes?|publico|p[uú]blico|target)\s*(?:es|son|:|-)?\s*([^.;\n]+)/i,
    /(?:para|dirigido a|enfocado en)\s+([^.;\n]+)/i,
    /(?:for|target audience|ideal customer|customers)\s*(?:are|is|:|-)?\s*([^.;\n]+)/i,
    /(?:for|aimed at|focused on)\s+([^.;\n]+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return cleanExtractedPhrase(match[1], 90);
  }
  return "";
}

function extractToneFromText(text) {
  const styleHint = extractStyleHint(text);
  const styles = ["elegante", "moderno", "premium", "minimalista", "lujoso", "juvenil", "profesional", "futurista", "cyberpunk", "neon", "neón", "friendly", "modern", "luxury", "minimal", "bold", "clean"];
  const found = styles.filter((style) => new RegExp(`\\b${escapeRegExp(style)}\\b`, "i").test(text));
  return [...new Set([styleHint, ...found].filter(Boolean))].join(", ");
}

function extractColorsFromText(text) {
  const hexColors = text.match(/#[0-9a-f]{3,8}\b/gi) || [];
  const colorNames = [
    "rojo", "azul", "verde", "negro", "blanco", "gris", "dorado", "amarillo", "naranja", "morado", "violeta", "rosa", "beige",
    "red", "blue", "green", "black", "white", "gray", "grey", "gold", "yellow", "orange", "purple", "pink", "cyan",
  ].filter((color) => new RegExp(`\\b${escapeRegExp(color)}\\b`, "i").test(text));
  const colorPhrase = text.match(/(?:colores?|colors?|paleta|palette)\s*(?:son|es|:|-)?\s*([^.;\n]+)/i)?.[1] || "";
  return [...new Set([...hexColors, ...splitCommaOrLines(colorPhrase), ...colorNames].map((item) => cleanExtractedPhrase(item, 32)).filter(Boolean))].slice(0, 8);
}

function extractContactInfo(text) {
  const contact = {};
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  if (email) contact.email = email;
  const phone = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0];
  if (phone) contact.phone = phone.trim();
  const instagram = text.match(/(?:instagram|ig)\s*(?:es|:|-)?\s*(@?[a-z0-9._]+)/i)?.[1] || text.match(/@[a-z0-9._]{3,}/i)?.[0];
  if (instagram) contact.instagram = instagram.startsWith("@") ? instagram : `@${instagram}`;
  const whatsapp = text.match(/(?:whatsapp|wasap|wsp)\s*(?:es|:|-)?\s*([+\d][\d\s().-]{7,}\d)/i)?.[1];
  if (whatsapp) contact.whatsapp = whatsapp.trim();
  return contact;
}

function extractSalesMode(lower) {
  const modes = [];
  if (/online|ecommerce|e-commerce|env[ií]o|delivery|pago en linea|pago online|comprar/.test(lower)) modes.push(langText({ en: "online sales", es: "ventas online", fr: "vente en ligne", pt: "vendas online" }));
  if (/presencial|tienda fisica|tienda física|in person|local|visita/.test(lower)) modes.push(langText({ en: "in-person visits", es: "visitas presenciales", fr: "visites en personne", pt: "visitas presenciais" }));
  if (/cotizaci[oó]n|cotizar|quote|estimate|presupuesto/.test(lower)) modes.push(langText({ en: "quote requests", es: "solicitudes de cotización", fr: "demandes de devis", pt: "pedidos de orçamento" }));
  if (/cita|reserva|booking|appointment/.test(lower)) modes.push(langText({ en: "appointments/bookings", es: "citas/reservas", fr: "rendez-vous/réservations", pt: "agendamentos/reservas" }));
  return [...new Set(modes)].join(", ");
}

function cleanExtractedPhrase(value, maxLength) {
  return String(value || "")
    .replace(/^(que|de|para|with|for)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength)
    .trim();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
  setStudioProgressPhase("understanding");
  const payload = await collectPayload();
  setStudioProgressPhase("brand");
  const templateSelection = await selectTemplateForPayload(payload);
  attachTemplateSelection(payload, templateSelection);
  setStudioProgressPhase("homepage");
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
    setStudioProgressPhase("shop");
    if (templateSelection) {
      result.schema = mergeTemplateSelectionIntoSchema(result.schema, templateSelection);
    }
    statusText.textContent = result.used_dev_mock
      ? "Development mock used because OPENAI_API_KEY is missing on the server."
      : t("generatedOpenAI");
    applyGenerationResult(result, payload, templateSelection);
    setStudioProgressPhase("mobile");
    await createDomainOrderIfNeeded(payload, result);
    setStudioProgressPhase("ready");
  } catch (error) {
    builderAvatarManager?.setState("confused", { source: "generate-error" });
    setStudioProgressPhase("homepage");
    const fallbackResult = buildInstantTemplateResult(payload, error, templateSelection);
    applyGenerationResult(fallbackResult, payload, templateSelection);
    setStudioProgressPhase("ready");
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
  payload.templateInstructions = buildTemplateInstructions(selection);
  return payload;
}

function buildTemplateInstructions(selection) {
  const template = selection?.template || {};
  const sections = Array.isArray(template.sections)
    ? template.sections.map((section) => section.type).filter(Boolean).join(", ")
    : "";
  const pages = Array.isArray(template.pages)
    ? template.pages.map((page) => `${page.name || page.page_key || "Page"}: ${page.purpose || page.layout || ""}`).join(" | ")
    : "";
  const catalog = template.catalogModel || {};
  return {
    templateId: selection?.templateId || template.id || "",
    intent: selection?.intent || "",
    name: template.name || "",
    visualDifference: template.visualDifference || "",
    aiPrompt: template.aiPrompt || "",
    editableSlots: template.editableSlots || [],
    copyGenerationRules: [
      "If payload.sitePlan exists, treat it as the approved structure contract for pages, major sections, and conversion flow.",
      "Generate a strong brand headline, slogan, section titles, CTAs, product/service descriptions, trust copy, and footer copy from the business description.",
      "All generated visible copy must remain editable in the JSON under section.editable, catalog_items, theme, navigation, business, or global_components.",
      "Use businessDescription and chat intake as strategy/context, not as literal page text unless it reads naturally for a customer.",
      "If the client gave only rough details, invent polished but safe placeholder copy that matches the selected language and mark it as editable.",
      "Keep the selected template's layout personality and catalog model. Do not flatten every template into the same hero/grid structure.",
      "Use website_config.brand and CSS brand tokens for all colors. Do not copy hardcoded template default colors when a logo or brand palette exists.",
    ],
    catalogType: selection?.catalogType || catalog.catalogType || "",
    catalogCardStyle: catalog.productCardStyle || "",
    collectionLayout: catalog.collectionLayout || "",
    productDetailModel: catalog.productDetailModel || "",
    upsellModel: catalog.upsellModel || "",
    customerFeeling: catalog.customerFeeling || "",
    filters: catalog.filters || [],
    sectionOrder: sections,
    pages,
    instruction:
      "Use this template as the structural base. Replace placeholders with business-specific titles, slogans, section copy, products, services, colors, images, and CTAs. Keep every generated element editable, and preserve the unique layout pattern instead of turning all templates into the same generic page.",
  };
}

function buildRevisionInstructions() {
  const requestedAdjustments = arrayValue(guidedState.requestedAdjustments);
  if (guidedState.revisionMode !== "targeted_edit" || !currentSchema || !requestedAdjustments.length) return null;
  return {
    mode: "targeted_edit",
    requestedAdjustments,
    preserveExistingDraft: true,
    preserveTemplate: true,
    preservePageOrder: true,
    preserveUnrequestedSections: true,
    preserveCatalogItems: true,
    preserveLanguage: true,
    selectedLanguage,
    previousSchema: currentSchema,
    instruction:
      "This is a revision of an already liked draft. Apply only the specific requested changes. Do not redesign, re-theme, reorder pages, replace unrelated copy, change catalog items, change business data, or switch templates unless the client explicitly asked for that exact change.",
  };
}

function mergeTemplateSelectionIntoSchema(schema, selection) {
  if (!schema || !selection) return schema;
  const templateInstructions = buildTemplateInstructions(selection);
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
    instructions: templateInstructions,
  };
  schema.active_template = {
    id: selection.templateId,
    name: selection.template?.name || selection.templateId,
    category: selection.template?.category || "",
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

function applyGenerationResult(result, payload = {}, templateSelection = null) {
  result.schema = prepareWebsiteConfig(result.schema, payload, templateSelection);
  currentSchema = result.schema;
  currentSiteId = result.site_id || null;
  currentBusinessId = result.business_id || null;
  currentGenerationId = result.generation_id || null;
  currentCatalogItems = catalogItemsFromSchema(currentSchema);
  selectedPageKey = currentSchema.pages[0]?.page_key || "home";
  selectedVariantId = currentSchema.design_variants?.[0]?.id || "";
  saveGeneratedSite(result);
  siteTitle.textContent = currentSchema.business?.name || "Generated site";
  storageStatus.textContent = storageLabel(result.storage_status, result.used_dev_mock);
  renderEditor();
  renderPreview();
  showGeneratedClientPreview();
  guidedState.revisionMode = "";
  guidedState.requestedAdjustments = [];
  builderAvatarManager?.setState("success", { source: "preview-generated" });
}

function prepareWebsiteConfig(schema, payload = {}, templateSelection = null) {
  if (!schema) return schema;
  const brand = normalizeBrand(payload.brand || guidedState.brand || schema.brand || {
    logoUrl: payload.assets?.find((asset) => asset.asset_type === "logo")?.url || schema.global_components?.logo_url || "",
    preferredColors: payload.preferred_colors,
  });
  let nextSchema = applyBrandSystemToSchema(structuredClone(schema), brand);
  nextSchema = applyDesignIntelligence(nextSchema, payload, templateSelection);
  nextSchema.quality_rules = DESIGN_QUALITY_RULES;
  nextSchema.design_score = scoreWebsiteConfig(nextSchema);
  nextSchema.designScore = nextSchema.design_score.total;
  for (let attempt = 0; attempt < 3 && nextSchema.design_score.total < 85; attempt += 1) {
    nextSchema = improveWebsiteConfig(nextSchema);
    nextSchema = applyDesignIntelligence(nextSchema, payload, templateSelection, { reviewOnly: true });
    nextSchema.design_score = scoreWebsiteConfig(nextSchema);
    nextSchema.designScore = nextSchema.design_score.total;
  }
  return nextSchema;
}

function applyBrandSystemToSchema(schema, brandInput) {
  const brand = normalizeBrand(brandInput);
  schema.brand = brand;
  schema.global_components = {
    ...(schema.global_components || {}),
    logo_url: brand.logoUrl || schema.global_components?.logo_url || "",
    favicon_url: brand.logoUrl || schema.global_components?.favicon_url || "",
  };
  schema.theme = {
    ...(schema.theme || {}),
    colors: brandToThemeColors(brand),
    fonts: brand.fontPairing || DEFAULT_BRAND.fontPairing,
    radius: Number.parseInt(brand.borderRadius, 10) || 10,
    shadow: brand.shadowStyle,
    buttons: {
      ...(schema.theme?.buttons || {}),
      background: brand.buttonColor,
      text: brand.buttonTextColor,
      radius: brand.borderRadius,
    },
  };
  schema.design_variants = arrayValue(schema.design_variants).map((variant) => ({
    ...variant,
    theme: {
      ...(variant.theme || {}),
      colors: brandToThemeColors(brand),
      fonts: brand.fontPairing || DEFAULT_BRAND.fontPairing,
      radius: Number.parseInt(brand.borderRadius, 10) || 10,
      shadow: brand.shadowStyle,
      buttons: {
        ...(variant.theme?.buttons || {}),
        background: brand.buttonColor,
        text: brand.buttonTextColor,
        radius: brand.borderRadius,
      },
    },
  }));
  if (!schema.design_variants.length) {
    schema.design_variants = [{
      id: "brand-system",
      name: "Brand system",
      description: brand.styleDirection,
      theme: schema.theme,
      layout_mode_id: schema.layout_mode?.id || "brand_system",
    }];
  }
  return schema;
}

function normalizeBrand(brandInput = {}) {
  const brand = { ...DEFAULT_BRAND, ...(brandInput || {}) };
  const colors = brandInput.colors || {};
  brand.logoUrl = brand.logoUrl || brandInput.logo_url || brandInput.logo || "";
  brand.primaryColor = resolveColor(brand.primaryColor || colors.primary, DEFAULT_BRAND.primaryColor);
  brand.secondaryColor = resolveColor(brand.secondaryColor || colors.secondary, DEFAULT_BRAND.secondaryColor);
  brand.accentColor = resolveColor(brand.accentColor || colors.accent, brand.primaryColor);
  brand.backgroundColor = resolveColor(brand.backgroundColor || colors.background, DEFAULT_BRAND.backgroundColor);
  brand.surfaceColor = resolveColor(brand.surfaceColor || colors.surface, DEFAULT_BRAND.surfaceColor);
  brand.textColor = resolveColor(brand.textColor || colors.text, DEFAULT_BRAND.textColor);
  brand.mutedTextColor = resolveColor(brand.mutedTextColor || colors.muted, DEFAULT_BRAND.mutedTextColor);
  brand.borderColor = resolveColor(brand.borderColor || colors.border, mixColors(brand.textColor, brand.backgroundColor, 0.14));
  brand.buttonColor = resolveColor(brand.buttonColor || colors.button || brand.primaryColor, brand.primaryColor);
  brand.buttonTextColor = resolveColor(brand.buttonTextColor || colors.buttonText || contrastColor(brand.buttonColor), contrastColor(brand.buttonColor));
  brand.fontPairing = typeof brand.fontPairing === "string" ? fontPairingFromString(brand.fontPairing) : (brand.fontPairing || DEFAULT_BRAND.fontPairing);
  brand.borderRadius = String(brand.borderRadius || DEFAULT_BRAND.borderRadius);
  brand.shadowStyle = brand.shadowStyle || DEFAULT_BRAND.shadowStyle;
  return brand;
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

function brandPalette(brand) {
  return [
    brand.primaryColor,
    brand.secondaryColor,
    brand.accentColor,
    brand.backgroundColor,
    brand.surfaceColor,
    brand.textColor,
    brand.mutedTextColor,
    brand.borderColor,
  ].filter(Boolean);
}

function fontPairingFromString(value) {
  const [heading, body] = String(value || "").split(/[+/|,]/).map((part) => part.trim()).filter(Boolean);
  return { heading: heading || "Inter", body: body || heading || "Inter" };
}

function fontPairingLabel(pairing = {}) {
  return `${pairing.heading || "Inter"} + ${pairing.body || "Inter"}`;
}

function createDesignStrategy(payload = {}, templateSelection = null, schema = {}) {
  const businessContext = analyzeBusinessContext(payload, schema);
  const designDirection = chooseDesignDirection(businessContext, templateSelection, schema);
  const layoutStrategy = createLayoutStrategy(businessContext, designDirection, schema);
  const template = templateSelection?.template || payload.selectedTemplate || schema.selected_template || {};
  const goalText = payload.salesMode || payload.templateIntent || payload.desiredDomain || "";
  const isCommerce = /store|shop|ecommerce|tienda|catalog|marketplace|producto|vender/i.test(`${template.id || ""} ${template.category || ""} ${goalText}`);
  const isLeadGen = /quote|contact|booking|service|cita|consulta|lead/i.test(`${template.id || ""} ${template.category || ""} ${goalText}`);
  return {
    businessGoal: businessContext.mainConversionGoal || (isCommerce ? "Sell or present offers clearly" : isLeadGen ? "Generate qualified inquiries" : "Build trust and guide visitors to contact"),
    targetAudience: businessContext.audience,
    visualDirection: designDirection.replace(/_/g, " "),
    conversionGoal: layoutStrategy.heroPurpose,
    sectionPriority: layoutStrategy.sectionOrder,
    layoutStyle: layoutStrategy.layoutStyle || template.name || schema.layout_mode?.template_id || "brand-led responsive layout",
    brandPersonality: businessContext.brandStyle || schema.brand?.styleDirection || payload.preferred_tone || "professional and confident",
    contentTone: payload.preferred_tone || schema.business?.tone || "clear, specific, customer-focused",
    businessContext,
    designDirection,
    layoutStrategy,
  };
}

function applyDesignIntelligence(schema, payload = {}, templateSelection = null, options = {}) {
  const businessContext = analyzeBusinessContext(payload, schema);
  const designDirection = chooseDesignDirection(businessContext, templateSelection, schema);
  const layoutStrategy = createLayoutStrategy(businessContext, designDirection, schema);
  const strategy = {
    ...createDesignStrategy(payload, templateSelection, schema),
    businessContext,
    designDirection,
    layoutStrategy,
  };
  let nextSchema = {
    ...schema,
    design_strategy: strategy,
    design_intelligence: {
      businessContext,
      designDirection,
      layoutStrategy,
      strictRules: DESIGN_QUALITY_RULES,
    },
  };
  nextSchema = ensurePurposefulSections(nextSchema, strategy, options);
  nextSchema = normalizeCatalogCommerceModel(nextSchema, strategy);
  nextSchema = orderSectionsByStrategy(nextSchema, layoutStrategy);
  nextSchema = applyProfessionalLayoutSettings(nextSchema, strategy);
  nextSchema = reviewWebsiteConfigBeforeRender(nextSchema, strategy);
  return nextSchema;
}

function normalizeCatalogCommerceModel(schema, strategy = {}) {
  const direction = strategy.designDirection || schema.design_intelligence?.designDirection || "";
  const checkoutMode = schema.layout_mode?.checkout?.mode || "";
  const businessGoal = `${strategy.businessContext?.mainConversionGoal || strategy.businessGoal || ""}`;
  const isShop = /ecommerce|marketplace|shop|store|catalog|offer|choose/i.test(`${direction} ${checkoutMode} ${businessGoal}`);
  if (!isShop) return schema;
  const askPricePattern = /ask|consult|consultar|cotizar|quote|precio\?|preguntar/i;
  return {
    ...schema,
    catalog_items: arrayValue(schema.catalog_items || schema.products_services).map((item, index) => {
      const nextItem = typeof item === "string" ? { name: item } : { ...item };
      nextItem.id = nextItem.id || `item_${index + 1}`;
      nextItem.sku = nextItem.sku || `SKU-${index + 1}`;
      nextItem.price_type = nextItem.price_type === "quote_only" ? "fixed" : (nextItem.price_type || "fixed");
      nextItem.currency = nextItem.currency || "USD";
      nextItem.price_value = nextItem.price_value ?? nextItem.price_amount ?? "";
      nextItem.price_amount = nextItem.price_amount ?? nextItem.price_value ?? "";
      if (!nextItem.price_label || askPricePattern.test(nextItem.price_label)) {
        nextItem.price_label = nextItem.price_value ? `${nextItem.currency} ${nextItem.price_value}` : "Precio editable";
      }
      if (!nextItem.button_label || askPricePattern.test(nextItem.button_label)) {
        nextItem.button_label = "Ver producto";
      }
      nextItem.inventory_quantity = nextItem.inventory_quantity ?? nextItem.stock ?? "";
      nextItem.track_inventory = nextItem.track_inventory ?? true;
      nextItem.is_active = nextItem.is_active !== false;
      nextItem.is_featured = nextItem.is_featured ?? index < 3;
      nextItem.sort_order = Number(nextItem.sort_order ?? index);
      return nextItem;
    }),
    layout_mode: {
      ...(schema.layout_mode || {}),
      checkout: {
        ...(schema.layout_mode?.checkout || {}),
        mode: checkoutMode && checkoutMode !== "quote_or_cart" ? checkoutMode : "cart_setup_required",
        primary_action: schema.layout_mode?.checkout?.primary_action || "Comprar ahora",
      },
    },
  };
}

function analyzeBusinessContext(payload = {}, schema = {}) {
  const business = schema.business || {};
  const contact = schema.contact || {};
  const catalog = arrayValue(schema.catalog_items || schema.products_services);
  const products = arrayValue(payload.services_products).length ? arrayValue(payload.services_products) : catalog.map((item) => item.name).filter(Boolean);
  const assets = arrayValue(payload.assets);
  const text = [
    payload.business_name,
    payload.business_description,
    payload.industry,
    payload.preferred_tone,
    payload.salesMode,
    payload.templateIntent,
    business.name,
    business.description,
    business.industry,
    business.tone,
    products.join(" "),
  ].filter(Boolean).join(" ").toLowerCase();
  const industry = payload.industry || business.industry || inferIndustryFromText(text);
  const isCommerce = /shop|store|tienda|ecommerce|catalog|producto|collection|marketplace|menu|order/.test(text);
  const isBooking = /booking|book|appointment|cita|reservation|reserva|consulta|schedule/.test(text);
  const isQuote = /quote|estimate|cotiz|proposal|consulta|service|servicio/.test(text);
  const priceLevel = /luxury|premium|boutique|exclusive|high.?end|lujo|gourmet|signature/.test(text)
    ? "premium"
    : /budget|cheap|discount|deal|econ/.test(text)
      ? "value"
      : "standard";
  const trustFactors = [];
  if (business.location || contact.address) trustFactors.push("local presence");
  if (contact.phone || contact.email || contact.whatsapp) trustFactors.push("direct contact");
  if (assets.some((asset) => asset.asset_type === "logo") || schema.brand?.logoUrl) trustFactors.push("brand identity");
  if (assets.some((asset) => asset.asset_type === "photo") || catalog.some((item) => item.image_url)) trustFactors.push("real visuals");
  if (catalog.length > 1 || products.length > 1) trustFactors.push("clear offer range");
  return {
    industry,
    audience: payload.target_audience || business.target_audience || inferAudience(industry, text),
    offer: payload.business_description || business.description || products.slice(0, 3).join(", ") || "a clear professional offer",
    trustFactors: trustFactors.length ? trustFactors : ["clear offer", "consistent brand", "easy contact"],
    mainConversionGoal: isCommerce ? "Guide visitors to choose an offer" : isBooking ? "Drive bookings or appointments" : isQuote ? "Generate qualified inquiries" : "Build trust and drive contact",
    productsOrServices: products.length ? products : catalog.map((item) => item.name).filter(Boolean),
    priceLevel,
    brandStyle: payload.preferred_tone || business.tone || schema.brand?.styleDirection || "professional",
  };
}

function inferIndustryFromText(text) {
  if (/restaurant|food|menu|cafe|bar|pizza|taco|bakery|comida|restaurante/.test(text)) return "Restaurant";
  if (/software|ai|saas|digital|course|ebook|template|tech|app/.test(text)) return "Digital products";
  if (/real estate|property|broker|inmueble/.test(text)) return "Real estate";
  if (/law|legal|account|finance|insurance|consult/.test(text)) return "Professional services";
  if (/salon|spa|beauty|wellness|fitness|health/.test(text)) return "Wellness";
  if (/shop|store|collection|product|ecommerce|marketplace/.test(text)) return "Commerce";
  return "Local business";
}

function inferAudience(industry, text) {
  if (/b2b|enterprise|business|company|empresa/.test(text)) return "decision-makers comparing professional options";
  if (/family|kids|children|local|neighborhood|vecino/.test(text)) return "local customers looking for a trusted choice";
  if (/premium|luxury|boutique|exclusive/.test(text)) return "quality-conscious customers who value trust and polish";
  if (/digital|course|ebook|template|software|ai/.test(`${industry} ${text}`.toLowerCase())) return "online buyers looking for practical, credible value";
  return "customers who need a clear, trustworthy solution";
}

function chooseDesignDirection(context = {}, templateSelection = null, schema = {}) {
  const template = templateSelection?.template || schema.selected_template || {};
  const catalogType = `${templateSelection?.catalogType || schema.catalog_model?.catalogType || schema.layout_mode?.catalog_type || ""}`.toLowerCase();
  const text = `${context.industry || ""} ${context.offer || ""} ${context.brandStyle || ""} ${template.id || ""} ${template.category || ""} ${catalogType}`.toLowerCase();
  if (/marketplace|classified|listing|directory|dense/.test(text)) return "marketplace";
  if (/restaurant|food|menu|cafe|bar|bakery|order|comida/.test(text)) return "restaurant";
  if (context.priceLevel === "premium" && /shop|store|collection|product|commerce|ecommerce/.test(text)) return "ecommerce_premium";
  if (context.priceLevel === "premium") return "luxury";
  if (/software|saas|ai|tech|digital|app|course|ebook|template/.test(text)) return "modern_tech";
  if (/law|finance|account|insurance|consult|corporate|enterprise/.test(text)) return "corporate";
  if (/salon|spa|health|fitness|repair|agency|service|professional/.test(text)) return "service_professional";
  if (/kids|toy|party|creative|playful|fun|colorful/.test(text)) return "playful";
  if (/minimal|simple|clean|studio|portfolio/.test(text)) return "minimalist";
  return "local_business";
}

function createLayoutStrategy(context = {}, designDirection = "local_business", schema = {}) {
  const scales = {
    luxury: { sectionPadding: "spacious", containerWidth: "narrow", cardGap: "comfortable", typographyScale: "editorial", cardDensity: "airy", maxHomeSections: 5, heroLayout: "editorial_showcase" },
    modern_tech: { sectionPadding: "balanced", containerWidth: "standard", cardGap: "comfortable", typographyScale: "strong", cardDensity: "comfortable", maxHomeSections: 6, heroLayout: "split_showcase" },
    playful: { sectionPadding: "balanced", containerWidth: "standard", cardGap: "comfortable", typographyScale: "friendly", cardDensity: "comfortable", maxHomeSections: 6, heroLayout: "split_showcase" },
    minimalist: { sectionPadding: "spacious", containerWidth: "narrow", cardGap: "relaxed", typographyScale: "quiet", cardDensity: "airy", maxHomeSections: 5, heroLayout: "minimal_statement" },
    local_business: { sectionPadding: "balanced", containerWidth: "standard", cardGap: "comfortable", typographyScale: "clear", cardDensity: "comfortable", maxHomeSections: 6, heroLayout: "trust_first" },
    corporate: { sectionPadding: "balanced", containerWidth: "standard", cardGap: "comfortable", typographyScale: "structured", cardDensity: "comfortable", maxHomeSections: 6, heroLayout: "authority_split" },
    ecommerce_premium: { sectionPadding: "spacious", containerWidth: "wide", cardGap: "relaxed", typographyScale: "editorial", cardDensity: "airy", maxHomeSections: 5, heroLayout: "collection_showcase" },
    marketplace: { sectionPadding: "compact", containerWidth: "wide", cardGap: "tight", typographyScale: "utility", cardDensity: "compact", maxHomeSections: 5, heroLayout: "search_led" },
    restaurant: { sectionPadding: "balanced", containerWidth: "standard", cardGap: "comfortable", typographyScale: "warm", cardDensity: "comfortable", maxHomeSections: 6, heroLayout: "menu_story" },
    service_professional: { sectionPadding: "balanced", containerWidth: "standard", cardGap: "comfortable", typographyScale: "clear", cardDensity: "comfortable", maxHomeSections: 6, heroLayout: "problem_solution" },
  };
  const scale = scales[designDirection] || scales.local_business;
  const isCommerce = /offer|choose|catalog|product|shop|store/i.test(context.mainConversionGoal || "");
  const isBooking = /booking|appointment|book|reservation/i.test(context.mainConversionGoal || "");
  return {
    heroPurpose: isCommerce ? "Present the main offer and move visitors into the catalog" : isBooking ? "Make booking feel clear and low-friction" : "Build immediate trust and invite the next contact action",
    sectionOrder: isCommerce
      ? ["Hero", "ProductGrid", "ServiceList", "Testimonials", "About", "Gallery", "Contact"]
      : ["Hero", "FeatureBand", "ServiceList", "ProductGrid", "Testimonials", "About", "Gallery", "Contact"],
    ctaPlacement: ["hero primary action", "offer cards", "final contact section"],
    trustSignals: context.trustFactors || [],
    productServicePresentation: isCommerce ? "comparison-ready catalog cards with clear labels" : "service cards focused on outcomes and next steps",
    testimonialPlacement: "after offer clarity and before final contact",
    contactBookingFlow: isBooking ? "booking-first CTA with contact fallback" : "direct contact CTA with phone/email support",
    layoutStyle: `${designDirection.replace(/_/g, " ")} ${scale.typographyScale}`,
    spacingScale: scale,
    mobileBreakpoints: { stackAt: 760, compactNavAt: 680, cardColumnsAt: 820 },
  };
}

function ensurePurposefulSections(schema, strategy, options = {}) {
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

function hasSectionPurpose(section, hasCatalog, isHomePage) {
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

function keepEssentialSections(sections, maxSections) {
  const priority = { Hero: 0, ProductGrid: 1, ServiceList: 2, FeatureBand: 3, Testimonials: 4, About: 5, Gallery: 6, Contact: 7, Footer: 8 };
  const sorted = [...sections].sort((a, b) => (priority[a.type] ?? 9) - (priority[b.type] ?? 9));
  const selected = sorted.slice(0, Math.max(3, maxSections));
  const contact = sections.find((section) => section.type === "Contact");
  if (contact && !selected.includes(contact)) selected[selected.length - 1] = contact;
  return selected;
}

function orderSectionsByStrategy(schema, layoutStrategy = {}) {
  const order = layoutStrategy.sectionOrder || ["Hero", "ProductGrid", "ServiceList", "FeatureBand", "Testimonials", "About", "Gallery", "Contact"];
  return {
    ...schema,
    pages: arrayValue(schema.pages).map((page) => ({
      ...page,
      sections: arrayValue(page.sections).sort((a, b) => (order.indexOf(a.type) === -1 ? 99 : order.indexOf(a.type)) - (order.indexOf(b.type) === -1 ? 99 : order.indexOf(b.type))),
    })),
  };
}

function applyProfessionalLayoutSettings(schema, strategy) {
  const scale = strategy.layoutStrategy?.spacingScale || {};
  const direction = strategy.designDirection || "local_business";
  return {
    ...schema,
    pages: arrayValue(schema.pages).map((page) => ({
      ...page,
      sections: arrayValue(page.sections).map((section, index) => addSectionPurpose({
        ...section,
        editable: improveSectionCopy(section, schema, strategy),
        settings: normalizeSectionSettings(section, index, scale, direction),
      }, index, strategy)),
    })),
  };
}

function normalizeSectionSettings(section, index, scale, direction) {
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

function improveSectionCopy(section, schema, strategy) {
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

function reviewWebsiteConfigBeforeRender(schema, strategy) {
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

function professionalHeadline(schema, context = {}) {
  const name = schema.business?.name || "Your brand";
  const offer = cleanShortText(context.offer || schema.business?.description || context.industry || "a better customer experience", 58);
  if (offer && !new RegExp(`^${escapeRegExp(name)}$`, "i").test(offer)) return `${name}: ${offer}`;
  return `${name} built for ${context.audience || "modern customers"}`;
}

function professionalSubtitle(schema, context = {}) {
  const trust = arrayValue(context.trustFactors).slice(0, 2).join(" and ");
  const audience = context.audience || "customers";
  return `A focused ${context.industry || "business"} experience for ${audience}${trust ? `, backed by ${trust}` : ""}.`;
}

function primaryCtaForStrategy(strategy = {}) {
  const goal = `${strategy.businessContext?.mainConversionGoal || strategy.conversionGoal || ""}`.toLowerCase();
  if (/booking|appointment|reservation|book/.test(goal)) return "Book now";
  if (/quote|inquir|contact|proposal/.test(goal)) return "Request a quote";
  if (/offer|catalog|product|shop|choose/.test(goal)) return "View offerings";
  return "Get started";
}

function isWeakHeadline(value, businessName = "") {
  const text = String(value || "").trim();
  if (!text) return true;
  if (businessName && text.toLowerCase() === String(businessName).trim().toLowerCase()) return true;
  return text.length < 16 || isGenericText(text);
}

function isWeakCta(value) {
  return !value || /click here|learn more|submit|button|cta/i.test(String(value));
}

function isGenericText(value) {
  return /lorem|placeholder|generic|products and services|featured product|main service|special offer|your business|welcome to/i.test(String(value || ""));
}

function cleanShortText(value, maxLength = 60) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).replace(/\s+\S*$/, "")}`;
}

function normalizeGenericText(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function addSectionPurpose(section, index, strategy) {
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

function scoreWebsiteConfig(schema) {
  const brand = normalizeBrand(schema.brand || {});
  const pages = arrayValue(schema.pages);
  const sections = pages.flatMap((page) => arrayValue(page.sections));
  const hero = sections.find((section) => section.type === "Hero");
  const hasLogo = Boolean(brand.logoUrl || schema.global_components?.logo_url);
  const hasBrandColors = Boolean(schema.brand?.primaryColor && schema.theme?.colors?.primary);
  const hasPurposes = sections.length && sections.every((section) => section.reason && section.conversion_purpose && section.priority);
  const repeatedTypes = sections.length - new Set(sections.map((section) => `${section.type}:${section.editable?.title || section.editable?.headline || ""}`)).size;
  const contrastOk = contrastRatio(brand.textColor, brand.backgroundColor) >= 4.5 && contrastRatio(brand.buttonColor, brand.buttonTextColor) >= 4.5;
  const designDirection = schema.design_intelligence?.designDirection || schema.design_strategy?.designDirection;
  const layoutStrategy = schema.design_intelligence?.layoutStrategy || schema.design_strategy?.layoutStrategy;
  const genericTextCount = sections.filter((section) => {
    const editable = section.editable || {};
    return [editable.headline, editable.title, editable.subtitle, editable.text].some(isGenericText);
  }).length;
  const weakCtaCount = sections.filter((section) => section.type === "Hero" && isWeakCta(section.editable?.primary_button)).length;
  const hasLayoutSettings = sections.every((section) => section.settings?.spacing && section.settings?.container_width && section.settings?.card_density);
  const purposefulSectionCount = sections.filter((section) => section.type !== "Footer").length;
  const clutterPenalty = Math.max(0, purposefulSectionCount - 7) * 8;
  const metrics = {
    brandConsistency: Math.min(100, 56 + (hasLogo ? 18 : 0) + (hasBrandColors ? 26 : 0)),
    visualHierarchy: hero?.editable?.headline && hero?.editable?.primary_button ? 92 : 68,
    contentClarity: Math.max(55, (sections.filter((section) => section.editable?.text || section.editable?.subtitle || section.editable?.headline).length >= Math.min(3, sections.length) ? 90 : 70) - genericTextCount * 12),
    conversionStrength: Math.max(55, (hero?.editable?.primary_button && sections.some((section) => /Contact|ProductGrid|ServiceList/.test(section.type)) ? 92 : 72) - weakCtaCount * 18),
    spacing: hasLayoutSettings ? 94 : sections.every((section) => section.settings?.spacing || section.type === "Hero") ? 86 : 74,
    accessibility: contrastOk ? 94 : 62,
    templateFit: schema.selected_template?.id || schema.active_template?.id || designDirection ? 90 : 78,
    mobileUsability: pages.length && sections.length < 10 && sections.every((section) => section.settings?.mobile_stack !== false) ? 92 : 76,
    sectionPurpose: hasPurposes ? 95 : 65,
    repetition: Math.max(58, 95 - repeatedTypes * 12),
    designDirection: designDirection ? 94 : 60,
    layoutStrategy: layoutStrategy?.sectionOrder?.length ? 94 : 64,
    clutterControl: Math.max(58, 95 - clutterPenalty),
  };
  const total = Math.round(Object.values(metrics).reduce((sum, value) => sum + value, 0) / Object.keys(metrics).length);
  return { total, metrics };
}

function improveWebsiteConfig(schema) {
  const improved = structuredClone(schema);
  const brand = normalizeBrand(improved.brand || {});
  improved.theme = improved.theme || {};
  improved.theme.colors = brandToThemeColors(brand);
  const strategy = improved.design_strategy || createDesignStrategy({}, null, improved);
  improved.pages = arrayValue(improved.pages).map((page) => ({
    ...page,
    sections: arrayValue(page.sections)
      .filter((section, index, list) => index === list.findIndex((item) => `${item.type}:${item.editable?.title || item.editable?.headline || ""}` === `${section.type}:${section.editable?.title || section.editable?.headline || ""}`))
      .map((section, index) => ({
        ...section,
        editable: improveSectionCopy(section, improved, strategy),
        settings: {
          ...(section.settings || {}),
          spacing: section.settings?.spacing || (index === 0 ? "spacious" : "balanced"),
          heading_size: section.settings?.heading_size || (index === 0 ? "large" : "medium"),
          container_width: section.settings?.container_width || "standard",
          card_density: section.settings?.card_density || "comfortable",
          card_gap: section.settings?.card_gap || "comfortable",
          mobile_stack: true,
        },
      })),
  }));
  improved.design_review = {
    ...(improved.design_review || {}),
    autoImproved: true,
    designScoreTarget: 85,
  };
  return improved;
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
  const template = templateSelection?.template || payload.selectedTemplate || {};
  const catalogType = templateSelection?.catalogType || template.catalogModel?.catalogType || payload.catalogType || "editorial_minimal_grid";
  const templateInstructions = templateSelection
    ? buildTemplateInstructions(templateSelection)
    : payload.templateInstructions || {};
  const copy = instantLocaleCopy(language);
  const name = payload.business_name || copy.newStore;
  const description = payload.business_description || copy.defaultDescription;
  const salesText = `${payload.salesMode || ""} ${payload.sales_mode || ""} ${payload.templateIntent || ""} ${template.category || ""} ${template.id || ""}`.toLowerCase();
  const isOnlineShop = /sell online|online sales|shop|store|tienda|ecommerce|cart|checkout|vender|comprar/.test(salesText);
  const products = arrayValue(payload.services_products).length
    ? arrayValue(payload.services_products)
    : copy.defaultProducts;
  const brand = normalizeBrand(payload.brand || createBrandSystem({
    logoUrl: payload.assets?.find((asset) => asset.asset_type === "logo")?.url || "",
    extractedColors: payload.logoPalette,
    preferredColors: payload.preferred_colors,
    businessName: name,
    industry: payload.industry,
    tone: payload.preferred_tone,
  }));
  const colors = brandToThemeColors(brand);
  const catalogItems = products.map((item, index) => ({
    id: `instant_${index + 1}`,
    sku: `SKU-${index + 1}`,
    name: item,
    description: copy.itemDescription(name),
    price_type: isOnlineShop ? "fixed" : "quote_only",
    price_amount: "",
    currency: "USD",
    price_label: isOnlineShop ? copy.priceNotSet : copy.askPrice,
    button_label: isOnlineShop ? copy.viewProduct : copy.request,
    inventory_quantity: "",
    track_inventory: isOnlineShop,
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
      industry: payload.industry || copy.onlineStore,
      location: payload.location || "",
      target_audience: payload.target_audience || "",
      tone: payload.preferred_tone || copy.defaultTone,
      selectedLanguage: language,
    },
    theme: {
      colors,
      fonts: brand.fontPairing,
      buttons: {
        primary_label: copy.shopNow,
        secondary_label: copy.viewCatalog,
        background: brand.buttonColor,
        text: brand.buttonTextColor,
        radius: brand.borderRadius,
      },
      radius: Number.parseInt(brand.borderRadius, 10) || 10,
      shadow: brand.shadowStyle,
    },
    brand,
    design_strategy: createDesignStrategy(payload, templateSelection, { brand }),
    layout_mode: {
      id: template.id || "instant_storefront",
      template_id: template.id || "",
      catalog_type: catalogType,
      intent: templateSelection?.intent || payload.templateIntent || "",
      navigation: { show_cart: true, show_header: true, sticky_header: true },
      checkout: { mode: isOnlineShop ? "cart_setup_required" : "quote_or_cart", primary_action: isOnlineShop ? copy.shopNow : copy.requestOrder },
    },
    integrations: { contact: { whatsapp_enabled: true, email_enabled: true }, analytics: { enabled: false, provider: "" }, payments: { enabled: false, mode: "setup_required" } },
    custom_logic: { enabled: false, risk_level: "restricted", automations: "" },
    site_plan: payload.sitePlan || buildSitePlan(templateSelection),
    navigation: [
      { label: copy.home, page_key: "home" },
      { label: copy.shop, page_key: "catalog" },
      { label: copy.about, page_key: "about" },
      { label: copy.contact, page_key: "contact" },
    ],
    pages: [
      {
        page_key: "home",
        title: copy.home,
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
              primary_button: copy.viewShop,
              secondary_button: copy.contactVerb,
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
              title: copy.featuredProducts,
              text: copy.featuredText,
              images: [],
            },
            settings: { layout: "featured", columns: 3 },
          },
        ],
      },
      {
        page_key: "catalog",
        title: copy.shop,
        slug: copy.shopSlug,
        order: 2,
        sections: [
          {
            id: "catalog_grid",
            type: "ProductGrid",
            order: 1,
            editable: {
              title: copy.catalog,
              text: copy.catalogText,
              images: [],
            },
            settings: { layout: "grid", columns: 3 },
          },
        ],
      },
      {
        page_key: "about",
        title: copy.about,
        slug: copy.aboutSlug,
        order: 3,
        sections: [{ id: "about", type: "About", order: 1, editable: { title: copy.aboutBrand, text: description }, settings: { layout: "feature" } }],
      },
      {
        page_key: "contact",
        title: copy.contact,
        slug: copy.contactSlug,
        order: 4,
        sections: [{ id: "contact", type: "Contact", order: 1, editable: { title: copy.letsTalk, text: copy.contactText }, settings: { layout: "simple" } }],
      },
    ],
    global_components: {
      logo_url: brand.logoUrl || payload.assets?.find((asset) => asset.asset_type === "logo")?.url || "",
      favicon_url: brand.logoUrl || payload.assets?.find((asset) => asset.asset_type === "logo")?.url || "",
      footer_text: copy.footerText(name),
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
      instructions: templateInstructions,
    },
    catalog_model: template.catalogModel || { catalogType },
    design_variants: [
      {
        id: "instant-modern",
        name: template.name || copy.modernCommercial,
        description: template.visualDifference || copy.fastBase,
        theme: { colors, fonts: brand.fontPairing, buttons: { primary_label: copy.shopNow, secondary_label: copy.contactVerb, background: brand.buttonColor, text: brand.buttonTextColor, radius: brand.borderRadius }, radius: Number.parseInt(brand.borderRadius, 10) || 10, shadow: brand.shadowStyle },
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

function instantLocaleCopy(language) {
  const copies = {
    en: {
      newStore: "New store",
      defaultDescription: "A brand ready to sell online.",
      defaultProducts: ["Featured product", "Main service", "Special offer"],
      itemDescription: (name) => `A featured option from ${name}, ready to present with details, benefits, and a clear call to action.`,
      askPrice: "Ask for price",
      priceNotSet: "Price editable",
      request: "Request",
      viewProduct: "View product",
      onlineStore: "Online store",
      defaultTone: "Professional and friendly",
      shopNow: "Shop now",
      viewCatalog: "View catalog",
      requestOrder: "Request order",
      home: "Home",
      shop: "Shop",
      about: "About",
      contact: "Contact",
      viewShop: "View shop",
      contactVerb: "Contact",
      featuredProducts: "Featured products",
      featuredText: "An initial selection to show the business offer.",
      catalog: "Catalog",
      catalogText: "Products and services ready to edit, activate, and publish.",
      aboutBrand: "About the brand",
      letsTalk: "Let us talk",
      contactText: "Contact the business to buy, quote, or request information.",
      footerText: (name) => `${name} - Editable draft website.`,
      modernCommercial: "Modern commercial",
      fastBase: "Fast, clean, editable base to validate the store.",
      shopSlug: "/shop",
      aboutSlug: "/about",
      contactSlug: "/contact",
    },
    es: {
      newStore: "Nueva tienda",
      defaultDescription: "Una marca preparada para vender en linea.",
      defaultProducts: ["Producto destacado", "Servicio principal", "Oferta especial"],
      itemDescription: (name) => `Una opcion destacada de ${name}, lista para presentar al cliente con detalles, beneficios y llamada a la accion.`,
      askPrice: "Consultar precio",
      priceNotSet: "Precio editable",
      request: "Solicitar",
      viewProduct: "Ver producto",
      onlineStore: "Tienda online",
      defaultTone: "Profesional y cercano",
      shopNow: "Comprar ahora",
      viewCatalog: "Ver catalogo",
      requestOrder: "Solicitar pedido",
      home: "Inicio",
      shop: "Tienda",
      about: "Nosotros",
      contact: "Contacto",
      viewShop: "Ver tienda",
      contactVerb: "Contactar",
      featuredProducts: "Productos destacados",
      featuredText: "Una seleccion inicial para mostrar la oferta del negocio.",
      catalog: "Catalogo",
      catalogText: "Productos y servicios listos para editar, activar y publicar.",
      aboutBrand: "Sobre la marca",
      letsTalk: "Hablemos",
      contactText: "Contacta al negocio para comprar, cotizar o solicitar informacion.",
      footerText: (name) => `${name} - Pagina generada como borrador editable.`,
      modernCommercial: "Moderno comercial",
      fastBase: "Base rapida, limpia y editable para validar la tienda.",
      shopSlug: "/tienda",
      aboutSlug: "/nosotros",
      contactSlug: "/contacto",
    },
    fr: {
      newStore: "Nouvelle boutique",
      defaultDescription: "Une marque prête à vendre en ligne.",
      defaultProducts: ["Produit phare", "Service principal", "Offre spéciale"],
      itemDescription: (name) => `Une option phare de ${name}, prête à être présentée avec détails, bénéfices et appel à l'action.`,
      askPrice: "Demander le prix",
      priceNotSet: "Prix editable",
      request: "Demander",
      viewProduct: "Voir le produit",
      onlineStore: "Boutique en ligne",
      defaultTone: "Professionnel et chaleureux",
      shopNow: "Acheter maintenant",
      viewCatalog: "Voir le catalogue",
      requestOrder: "Demander une commande",
      home: "Accueil",
      shop: "Boutique",
      about: "À propos",
      contact: "Contact",
      viewShop: "Voir la boutique",
      contactVerb: "Contacter",
      featuredProducts: "Produits phares",
      featuredText: "Une première sélection pour présenter l'offre de l'entreprise.",
      catalog: "Catalogue",
      catalogText: "Produits et services prêts à modifier, activer et publier.",
      aboutBrand: "À propos de la marque",
      letsTalk: "Parlons-en",
      contactText: "Contactez l'entreprise pour acheter, demander un devis ou obtenir des informations.",
      footerText: (name) => `${name} - Brouillon de site modifiable.`,
      modernCommercial: "Commercial moderne",
      fastBase: "Base rapide, claire et modifiable pour valider la boutique.",
      shopSlug: "/boutique",
      aboutSlug: "/a-propos",
      contactSlug: "/contact",
    },
    pt: {
      newStore: "Nova loja",
      defaultDescription: "Uma marca pronta para vender online.",
      defaultProducts: ["Produto em destaque", "Serviço principal", "Oferta especial"],
      itemDescription: (name) => `Uma opção em destaque de ${name}, pronta para apresentar detalhes, benefícios e chamada para ação.`,
      askPrice: "Consultar preço",
      priceNotSet: "Preço editável",
      request: "Solicitar",
      viewProduct: "Ver produto",
      onlineStore: "Loja online",
      defaultTone: "Profissional e próximo",
      shopNow: "Comprar agora",
      viewCatalog: "Ver catálogo",
      requestOrder: "Solicitar pedido",
      home: "Início",
      shop: "Loja",
      about: "Sobre",
      contact: "Contato",
      viewShop: "Ver loja",
      contactVerb: "Contato",
      featuredProducts: "Produtos em destaque",
      featuredText: "Uma seleção inicial para mostrar a oferta do negócio.",
      catalog: "Catálogo",
      catalogText: "Produtos e serviços prontos para editar, ativar e publicar.",
      aboutBrand: "Sobre a marca",
      letsTalk: "Vamos conversar",
      contactText: "Entre em contato para comprar, pedir orçamento ou solicitar informações.",
      footerText: (name) => `${name} - Rascunho de site editável.`,
      modernCommercial: "Comercial moderno",
      fastBase: "Base rápida, limpa e editável para validar a loja.",
      shopSlug: "/loja",
      aboutSlug: "/sobre",
      contactSlug: "/contato",
    },
  };
  return copies[language] || copies.en;
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
    storageStatus.textContent = langText({ en: "Generate a draft first.", es: "Primero genera un borrador.", fr: "Générez d'abord un brouillon.", pt: "Gere primeiro um rascunho." });
    return;
  }
  if (!currentSiteId) {
    storageStatus.textContent = langText({
      en: "The fast draft is visible here, but it does not have a site_id for review yet.",
      es: "El borrador rapido se ve aqui, pero no tiene site_id para revisión todavía.",
      fr: "Le brouillon rapide est visible ici, mais il n'a pas encore de site_id pour révision.",
      pt: "O rascunho rápido está visível aqui, mas ainda não tem site_id para revisão.",
    });
    return;
  }
  const contact = guidedState.contactInfo || {};
  const customerName = guidedState.businessName || currentSchema.business?.name || "Client";
  const message = langText({
    en: `Client submitted draft for review.\nBusiness: ${customerName}\nIndustry: ${guidedState.industry || ""}\nDesired domain: ${guidedState.desiredDomain || ""}\nSite ID: ${currentSiteId}`,
    es: `Cliente envió borrador para revisión.\nNegocio: ${customerName}\nIndustria: ${guidedState.industry || ""}\nDominio deseado: ${guidedState.desiredDomain || ""}\nSite ID: ${currentSiteId}`,
    fr: `Client a envoyé le brouillon pour révision.\nEntreprise: ${customerName}\nSecteur: ${guidedState.industry || ""}\nDomaine souhaité: ${guidedState.desiredDomain || ""}\nSite ID: ${currentSiteId}`,
    pt: `Cliente enviou o rascunho para revisão.\nNegócio: ${customerName}\nSetor: ${guidedState.industry || ""}\nDomínio desejado: ${guidedState.desiredDomain || ""}\nSite ID: ${currentSiteId}`,
  });
  submitDraftReviewButton.disabled = true;
  submitDraftReviewButton.textContent = langText({ en: "Sending...", es: "Enviando...", fr: "Envoi...", pt: "Enviando..." });
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
    storageStatus.textContent = langText({
      en: "Sent for review. Your request is now visible in admin.",
      es: "Enviado para revisión. Tu solicitud ya aparece en el admin.",
      fr: "Envoyé pour révision. Votre demande apparaît maintenant dans l'admin.",
      pt: "Enviado para revisão. Sua solicitação já aparece no admin.",
    });
    if (isEmbeddedClientSetup) {
      window.parent.postMessage({ type: "luma-draft-submitted", siteId: currentSiteId }, "*");
    }
  } catch (error) {
    storageStatus.textContent = `${langText({ en: "Could not send", es: "No se pudo enviar", fr: "Impossible d'envoyer", pt: "Não foi possível enviar" })}: ${shortError(error.message)}`;
  } finally {
    submitDraftReviewButton.disabled = false;
    submitDraftReviewButton.textContent = langText({ en: "Send for review", es: "Enviar para revisión", fr: "Envoyer pour révision", pt: "Enviar para revisão" });
  }
}

function requireStudioAccount(event, action, callback) {
  if (event?.preventDefault) event.preventDefault();
  if (!currentSchema) {
    callback?.();
    return;
  }
  if (hasStudioAccountSession()) {
    callback?.();
    return;
  }
  openStudioAuthGate(action);
}

function hasStudioAccountSession() {
  return Boolean(
    localStorage.getItem("lumaClientAccessToken") ||
    sessionStorage.getItem("lumaClientAccessToken") ||
    localStorage.getItem("vm_portal_preview_token") ||
    sessionStorage.getItem("vm_portal_preview_token"),
  );
}

function openStudioAuthGate(action = "continue") {
  if (!studioAuthGate) return;
  persistPendingStudioAccountAction(action);
  studioAuthGate.hidden = false;
  document.body.classList.add("studio-auth-open");
  setAssistantState("success");
}

function closeStudioAuthGate() {
  if (!studioAuthGate) return;
  studioAuthGate.hidden = true;
  document.body.classList.remove("studio-auth-open");
}

function persistPendingStudioAccountAction(action) {
  try {
    localStorage.setItem("lumaPendingAuthAction", action);
    if (currentSchema) {
      localStorage.setItem("lumaPendingGeneratedSite", JSON.stringify({
        schema: currentSchema,
        siteId: currentSiteId,
        businessId: currentBusinessId,
        selectedPageKey,
        savedAt: new Date().toISOString(),
      }));
    }
  } catch {
    // Storage can fail for large drafts; the live session still keeps the draft.
  }
}

function continueWithStudioAuth(provider) {
  persistPendingStudioAccountAction(provider);
  const returnTo = encodeURIComponent(window.location.href);
  const configured = provider === "google" ? window.LUMA_GOOGLE_AUTH_URL : window.LUMA_APPLE_AUTH_URL;
  const fallback = `${API_BASE_URL}/api/client/auth/oauth/${encodeURIComponent(provider)}?return_to=${returnTo}`;
  window.location.href = configured || fallback;
}

function continueWithEmailAuth(event) {
  event.preventDefault();
  const email = studioAuthEmail?.value.trim();
  if (!email) return;
  persistPendingStudioAccountAction("email");
  localStorage.setItem("lumaPendingClientEmail", email);
  if (storageStatus) {
    storageStatus.textContent = langText({
      en: "Email saved. The account step is ready to connect to magic links.",
      es: "Email guardado. El paso de cuenta queda listo para conectar magic links.",
      fr: "Email enregistré. L'étape de compte est prête pour les magic links.",
      pt: "Email salvo. A etapa de conta está pronta para magic links.",
    });
  }
  closeStudioAuthGate();
}

function adjustGeneratedDraftWithLuma() {
  document.body.classList.remove("generated-preview-open", "client-preview-mode");
  guidedPanel.classList.add("active");
  document.body.classList.add("guided-modal-open");
  guidedStep = "review";
  const message = langText({
    en: "Of course. Tell me what you want to change in the draft: colors, sections, copy, products, style, or any detail. Then I can generate a new version with those adjustments.",
    es: "Claro. Dime qué quieres cambiar del borrador: colores, secciones, textos, productos, estilo o cualquier detalle. Luego genero una nueva versión con esos ajustes.",
    fr: "Bien sûr. Dites-moi ce que vous voulez changer dans le brouillon : couleurs, sections, textes, produits, style ou tout autre détail. Ensuite je génère une nouvelle version.",
    pt: "Claro. Diga o que deseja mudar no rascunho: cores, seções, textos, produtos, estilo ou qualquer detalhe. Depois gero uma nova versão.",
  });
  appendChatMessage("assistant", message, "thinking");
  guidedStatusText.textContent = langText({
    en: "Describe the adjustments you want.",
    es: "Describe los ajustes que quieres hacer.",
    fr: "Décrivez les ajustements souhaités.",
    pt: "Descreva os ajustes que deseja.",
  });
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

  const payload = {
    business_name: data.get("business_name")?.toString().trim(),
    business_description: data.get("business_description")?.toString().trim(),
    industry: data.get("industry")?.toString().trim(),
    location: data.get("location")?.toString().trim(),
    services_products: splitCommaOrLines(data.get("services_products")?.toString() || ""),
    target_audience: data.get("target_audience")?.toString().trim(),
    preferred_tone: data.get("preferred_tone")?.toString().trim(),
    preferred_colors: splitCommaOrLines(data.get("preferred_colors")?.toString() || "").length
      ? splitCommaOrLines(data.get("preferred_colors")?.toString() || "")
      : arrayValue(guidedState.logoPalette),
    contact_info: contactInfo,
    desiredDomain: data.get("desired_domain")?.toString().trim() || guidedState.desiredDomain || "",
    selectedLanguage,
    request_id: currentRequestId,
    catalog_items: catalogItemsFromForm(),
    assets,
    logoPalette: arrayValue(guidedState.logoPalette),
    brand: normalizeBrand(guidedState.brand || {
      logoUrl: assets.find((asset) => asset.asset_type === "logo")?.url || "",
      extractedColors: arrayValue(guidedState.logoPalette),
      preferredColors: splitCommaOrLines(data.get("preferred_colors")?.toString() || ""),
      industry: data.get("industry")?.toString().trim(),
      tone: data.get("preferred_tone")?.toString().trim(),
    }),
    designStrategy: createDesignStrategy({
      business_name: data.get("business_name")?.toString().trim(),
      business_description: data.get("business_description")?.toString().trim(),
      industry: data.get("industry")?.toString().trim(),
      target_audience: data.get("target_audience")?.toString().trim(),
      preferred_tone: data.get("preferred_tone")?.toString().trim(),
      salesMode: guidedState.salesMode,
    }),
    qualityRules: DESIGN_QUALITY_RULES,
    requestedAdjustments: arrayValue(guidedState.requestedAdjustments),
    sitePlan: guidedState.sitePlan || (forcedTemplateSelection?.templateId ? buildSitePlan() : null),
    sitePlanApproved: Boolean(guidedState.sitePlanApproved),
    brandContextNote:
      "Intake answers are client intent and design strategy context. Use them to create polished website copy, but do not copy internal planning answers literally unless they are natural public-facing text.",
  };
  const revisionInstructions = buildRevisionInstructions();
  if (revisionInstructions) {
    payload.revisionMode = revisionInstructions.mode;
    payload.requestedAdjustments = revisionInstructions.requestedAdjustments;
    payload.revisionInstructions = revisionInstructions;
    payload.previousSchema = currentSchema;
  }
  return payload;
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
      category: "",
      variants: "",
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
    category: item.category || "",
    variants: item.variants || "",
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
  editorMount.classList.toggle("advanced-inspector-open", advancedInspectorOpen);
  const pageOptions = currentSchema.pages
    .map(
      (page) =>
        `<option value="${escapeAttribute(page.page_key)}" ${page.page_key === selectedPageKey ? "selected" : ""}>${escapeHtml(page.title)}</option>`,
    )
    .join("");

  editorMount.innerHTML = `
    ${studioInspector()}
    <div class="editor-group">
      <h3>Design options</h3>
      <div class="variant-grid">${designVariantCards()}</div>
    </div>
    ${brandKitEditor(currentSchema.brand, currentSchema.design_score)}
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
      ${inputField("Brand primary", "brand.primaryColor", currentSchema.brand?.primaryColor || "")}
      ${inputField("Brand accent", "brand.accentColor", currentSchema.brand?.accentColor || "")}
      ${inputField("Button color", "brand.buttonColor", currentSchema.brand?.buttonColor || "")}
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

  editorMount.querySelector("#toggleAdvancedInspector")?.addEventListener("click", () => {
    advancedInspectorOpen = !advancedInspectorOpen;
    renderEditor();
  });
  editorMount.querySelectorAll("[data-studio-add-product]").forEach((button) => {
    button.addEventListener("click", addStudioCatalogItem);
  });

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
      if (input.dataset.path.startsWith("brand.") || input.dataset.path === "global_components.logo_url") {
        currentSchema.brand = normalizeBrand({
          ...(currentSchema.brand || {}),
          logoUrl: currentSchema.global_components?.logo_url || currentSchema.brand?.logoUrl || "",
        });
        currentSchema = applyBrandSystemToSchema(currentSchema, currentSchema.brand);
      }
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
    page.sections.push(createSectionByType("FeatureBand", page.sections.length + 1));
    renderEditor();
    renderPreview();
  });

  editorMount.querySelector("#addCatalogItemButton").addEventListener("click", () => {
    currentCatalogItems.push({
      id: `catalog_${Date.now()}`,
      name: "New item",
      description: "Edit this product or service.",
      category: "",
      variants: "",
      price_type: "fixed",
      price_value: "",
      price_label: "Precio editable",
      image_url: "",
      button_label: "Ver producto",
      inventory_quantity: "",
      track_inventory: true,
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
  applyGeneratedFavicon(currentSchema);
  previewFrame.innerHTML = renderWebsite(schemaForPreview(), selectedPageKey);
  renderStudioProgress();
  previewFrame.querySelectorAll("[data-page-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      selectedPageKey = link.dataset.pageLink;
      renderEditor();
      renderPreview();
    });
  });
  previewFrame.querySelectorAll("[data-studio-section]").forEach((sectionElement) => {
    sectionElement.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      selectStudioSection(sectionElement.dataset.studioSection);
    });
  });
}

function studioInspector() {
  const selectedSection = selectedStudioSection();
  const title = selectedSection ? `${selectedSection.type} inspector` : "Page inspector";
  return `<div class="editor-group studio-inspector">
    <div class="studio-inspector-head">
      <div>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(selectedSection ? "Edit the selected section from the canvas." : "Select a section on the canvas to edit it directly.")}</p>
      </div>
      <button id="toggleAdvancedInspector" class="small-button" type="button">${advancedInspectorOpen ? "Hide advanced" : "Advanced controls"}</button>
    </div>
    ${selectedSection ? sectionQuickInspector(selectedSection) : pageQuickInspector()}
  </div>`;
}

function sectionQuickInspector(section) {
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
      ${inputField("Email", "contact.email", currentSchema.contact?.email || "")}
      ${inputField("Phone", "contact.phone", currentSchema.contact?.phone || "")}
      ${inputField("WhatsApp", "contact.whatsapp", currentSchema.contact?.whatsapp || "")}
    </div>`;
  }
  return `<div class="studio-inspector-grid">
    ${inputField("Title", `${basePath}.editable.title`, editable.title || editable.headline || "", "data-section-path")}
    ${textareaField("Text", `${basePath}.editable.text`, editable.text || editable.subtitle || "", "data-section-path")}
    ${selectField("Spacing", `${basePath}.settings.spacing`, section.settings?.spacing || "balanced", ["compact", "balanced", "spacious"], "data-section-path")}
  </div>`;
}

function pageQuickInspector() {
  return `<div class="studio-inspector-grid">
    ${inputField("Business name", "business.name", currentSchema.business?.name || "")}
    ${inputField("Logo URL", "global_components.logo_url", currentSchema.global_components?.logo_url || "")}
    ${inputField("Brand primary", "brand.primaryColor", currentSchema.brand?.primaryColor || "")}
    ${inputField("Button color", "brand.buttonColor", currentSchema.brand?.buttonColor || "")}
  </div>`;
}

function selectedStudioSection() {
  const page = selectedPage();
  return arrayValue(page?.sections).find((section) => (section.id || section.type) === selectedStudioSectionId) || null;
}

function handleStudioSelectionAction(action) {
  const page = selectedPage();
  const index = arrayValue(page.sections).findIndex((section) => (section.id || section.type) === selectedStudioSectionId);
  if (index < 0) return;
  if (action === "edit") {
    renderEditor();
    selectStudioSection(selectedStudioSectionId);
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
    selectedStudioSectionId = copy.id;
    resequence(page.sections);
  } else if (action === "delete") {
    page.sections.splice(index, 1);
    selectedStudioSectionId = "";
    studioSelectionToolbar.hidden = true;
    resequence(page.sections);
  } else if (action === "luma") {
    adjustGeneratedDraftWithLuma();
    return;
  }
  renderEditor();
  renderPreview();
  if (selectedStudioSectionId) window.setTimeout(() => selectStudioSection(selectedStudioSectionId), 50);
}

function renderStudioProgress() {
  if (!studioProgressList) return;
  if (!currentSchema) {
    studioProgressList.innerHTML = studioProgressItems([
      ["pending", "Home page"],
      ["pending", "Brand system"],
      ["pending", "Online shop"],
      ["pending", "Contact page"],
    ]);
    return;
  }
  const pages = arrayValue(currentSchema.pages);
  const sections = pages.flatMap((page) => arrayValue(page.sections));
  const catalogItems = arrayValue(currentSchema.catalog_items || currentSchema.products_services);
  const items = [
    [pages.some((page) => page.page_key === "home") || sections.some((section) => section.type === "Hero") ? "done" : "active", "Home page"],
    [currentSchema.brand?.primaryColor || currentSchema.theme?.colors?.primary ? "done" : "active", "Brand system"],
    [catalogItems.length || sections.some((section) => /ProductGrid|ServiceList/.test(section.type)) ? "done" : "active", "Online shop"],
    [sections.some((section) => section.type === "Contact") || currentSchema.contact?.email || currentSchema.contact?.phone ? "done" : "pending", "Contact page"],
  ];
  studioProgressList.innerHTML = studioProgressItems(items);
}

function setStudioProgressPhase(phase) {
  if (!studioProgressList) return;
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
}

function studioProgressItems(items) {
  const icon = { done: "<span></span>", active: "<i></i>", pending: "<em></em>" };
  return items.map(([state, label]) => `<div data-progress-state="${escapeAttribute(state)}">${icon[state] || icon.pending}<strong>${escapeHtml(label)}</strong></div>`).join("");
}

function addStudioSection(type = "FeatureBand") {
  if (!currentSchema) return;
  const page = currentSchema.pages.find((item) => item.page_key === selectedPageKey) || currentSchema.pages[0];
  if (!page) return;
  page.sections = arrayValue(page.sections);
  page.sections.push(createSectionByType(type, page.sections.length + 1));
  currentSchema = prepareWebsiteConfig(currentSchema, { brand: currentSchema.brand || guidedState.brand || {} }, null);
  currentCatalogItems = catalogItemsFromSchema(currentSchema);
  renderEditor();
  renderPreview();
}

function addStudioCatalogItem() {
  if (!currentSchema) return;
  currentSchema.catalog_items = arrayValue(currentSchema.catalog_items);
  currentSchema.catalog_items.push({
    id: `item_${Date.now()}`,
    sku: `SKU-${currentSchema.catalog_items.length + 1}`,
    name: "Nuevo producto",
    description: "Edita la descripción del producto.",
    category: "",
    variants: "",
    price_type: "fixed",
    price_value: "",
    price_amount: "",
    currency: "USD",
    price_label: "Precio editable",
    button_label: "Ver producto",
    inventory_quantity: "",
    track_inventory: true,
    image_url: "",
    is_active: true,
    is_featured: currentSchema.catalog_items.length < 3,
    sort_order: currentSchema.catalog_items.length,
  });
  currentSchema = prepareWebsiteConfig(currentSchema, { brand: currentSchema.brand || guidedState.brand || {} }, null);
  currentCatalogItems = catalogItemsFromSchema(currentSchema);
  renderEditor();
  renderPreview();
}

function createSectionByType(type, order) {
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
      headline: currentSchema?.business?.name || "Nueva propuesta principal",
      subtitle: currentSchema?.business?.description || "Explica en una frase clara por qué vale la pena seguir.",
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

function selectStudioSection(sectionId) {
  selectedStudioSectionId = sectionId || "";
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

function cssEscape(value) {
  if (window.CSS?.escape) return CSS.escape(String(value || ""));
  return String(value || "").replace(/["\\]/g, "\\$&");
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

function brandKitEditor(brandInput, score) {
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
    en: { nav: "Shop", title: "Shop", slug: "/shop", featured: "Featured products", subtitle: "Explore the products and options available from this business." },
    es: { nav: "Tienda", title: "Tienda", slug: "/tienda", featured: "Productos destacados", subtitle: "Explora los productos y opciones disponibles para comprar o solicitar." },
    fr: { nav: "Boutique", title: "Boutique", slug: "/boutique", featured: "Produits phares", subtitle: "Découvrez les produits et options disponibles." },
    pt: { nav: "Loja", title: "Loja", slug: "/loja", featured: "Produtos em destaque", subtitle: "Explore os produtos e opções disponíveis." },
  }[language] || { nav: "Shop", title: "Shop", slug: "/shop", featured: "Featured products", subtitle: "Explore the products and options available from this business." };

  let catalogPage = schema.pages.find((page) =>
    /catalog|shop|store|tienda|boutique|loja|products|productos|produits|produtos|services|servicios/i.test(
      `${page.page_key || ""} ${page.title || ""} ${page.slug || ""}`,
    ),
  );
  if (!catalogPage) {
    catalogPage = {
      page_key: "catalog",
      title: labels.title,
      slug: labels.slug,
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
          title: labels.featured,
          headline: labels.featured,
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
  const labels = catalogLocaleLabels(schema);
  const existing = Array.isArray(schema.catalog_items) && schema.catalog_items.length
    ? schema.catalog_items
    : Array.isArray(schema.products_services)
      ? schema.products_services
      : [];
  return existing.map((item, index) => {
    if (typeof item === "string") {
      return {
        id: `item_${index + 1}`,
        sku: `SKU-${index + 1}`,
        name: item,
        description: "",
        category: "",
        variants: "",
        price_type: "fixed",
        price_value: "",
        price_amount: "",
        currency: "USD",
        price_label: "",
        button_label: labels.view,
        inventory_quantity: "",
        track_inventory: false,
        image_url: "",
        is_active: true,
        is_featured: index < 3,
        sort_order: index,
      };
    }
    return {
      id: item.id || `item_${index + 1}`,
      sku: item.sku || `SKU-${index + 1}`,
      name: item.name || item.title || `Item ${index + 1}`,
      description: item.description || item.text || "",
      category: item.category || "",
      variants: item.variants || "",
      price_type: item.price_type || "fixed",
      price_value: item.price_value ?? item.price_amount ?? item.priceAmount ?? "",
      price_amount: item.price_amount ?? item.price_value ?? item.priceAmount ?? "",
      currency: item.currency || "USD",
      price_label: item.price_label || item.price || item.priceLabel || "",
      button_label: item.button_label || item.cta || labels.view,
      inventory_quantity: item.inventory_quantity ?? item.stock ?? "",
      track_inventory: Boolean(item.track_inventory || item.inventory_quantity || item.stock),
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
  const theme = schema.theme || {};
  schema.business = schema.business || {};
  schema.global_components = schema.global_components || {};
  const logo = schema.brand?.logoUrl || schema.global_components.logo_url;
  const layoutId = schema.layout_mode?.id || "standard";
  const templateId = schema.active_template?.id || schema.selected_template?.id || "standard";
  return `<div class="rendered-site layout-${escapeAttribute(slugify(layoutId))} template-${escapeAttribute(slugify(templateId))}" style="${themeVars(theme, schema.brand)}">
    ${renderStudioFloatingCatalog(schema)}
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
      <div>${logo ? `<img src="${escapeAttribute(logo)}" alt="${escapeAttribute(schema.business.name)}">` : renderLogoMark(schema)}</div>
      <span>${escapeHtml(schema.global_components.footer_text || "")}</span>
    </footer>
  </div>`;
}

function renderStudioFloatingCatalog(schema) {
  if (document.body.classList.contains("client-preview-mode")) return "";
  const items = arrayValue(schema.catalog_items || schema.products_services).filter((item) => item.is_active !== false).slice(0, 3);
  if (!items.length) return "";
  return `<div class="studio-floating-catalog" aria-hidden="true">
    <span>Store preview</span>
    <div>${items.map((item) => `<article>
      ${renderResilientImage(item.image_url, item.name, item.name)}
      <strong>${escapeHtml(item.name || "Product")}</strong>
      <small>${escapeHtml(item.price_label || "Precio editable")}</small>
    </article>`).join("")}</div>
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
  return `<section class="rendered-hero hero-${escapeAttribute(slugify(layout))} ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div>
      ${schema.brand?.logoUrl ? `<span class="hero-brand-badge"><img src="${escapeAttribute(schema.brand.logoUrl)}" alt="">${escapeHtml(schema.business.name || "")}</span>` : ""}
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
  return `<section class="rendered-section section-${escapeAttribute(slugify(section.settings?.layout || "grid"))} ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="section-heading">
      <span class="rendered-kicker">${escapeHtml(schema.business.tone || "Selected")}</span>
      <h2>${escapeHtml(editable.title || editable.headline || "Products and services")}</h2>
      ${editable.text || editable.subtitle ? `<p>${escapeHtml(editable.text || editable.subtitle)}</p>` : ""}
    </div>
    ${customCatalog || `<div class="rendered-grid columns-${columns}">
      ${catalogItems
        .map(
          (item) => `<article class="rendered-card">
            ${renderResilientImage(item.image_url, item.name, item.name)}
            <div>
              <h3>${escapeHtml(item.name)}</h3>
              <p>${escapeHtml(item.description)}</p>
              <strong>${escapeHtml(productPriceLabel(item))}</strong>
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
  const labels = catalogLocaleLabels(arguments[1]);
  return `<div class="catalog-shell catalog-marketplace">
    <aside><strong>${labels.searchFilters}</strong><span>${labels.category}</span><span>${labels.brand}</span><span>${labels.price}</span><span>${labels.rating}</span><span>${labels.delivery}</span></aside>
    <div class="catalog-results">${items.map((item, index) => renderCatalogCard(item, "market-card", `${index % 3 === 0 ? labels.deal : labels.fastShip}`, arguments[1])).join("")}</div>
  </div>`;
}

function renderClassifiedMarketplaceCatalog(items) {
  const labels = catalogLocaleLabels(arguments[1]);
  return `<div class="catalog-shell catalog-classified">
    ${items.map((item, index) => `<article class="listing-card">
      <div>${item.image_url ? `<img src="${escapeAttribute(item.image_url)}" alt="${escapeAttribute(item.name)}">` : `<span>${escapeHtml(item.name.slice(0, 2))}</span>`}</div>
      <section><strong>${escapeHtml(item.name)}</strong><p>${escapeHtml(item.description)}</p><small>${labels.sellerVerified} · ${index % 2 ? labels.used : labels.newItem} · ${labels.localPickup}</small></section>
      <aside><b>${escapeHtml(item.price_label || labels.makeOffer)}</b><a class="rendered-button" href="#">${escapeHtml(item.button_label || labels.contactSeller)}</a></aside>
    </article>`).join("")}
  </div>`;
}

function renderMinimalProductGrid(items) {
  return `<div class="catalog-minimal">${items.map((item) => renderCatalogCard(item, "minimal-card", item.price_label, arguments[1])).join("")}</div>`;
}

function renderFashionLookbookCatalog(items) {
  const labels = catalogLocaleLabels(arguments[1]);
  return `<div class="catalog-lookbook">${items.map((item, index) => `<article class="lookbook-card ${index === 0 ? "wide" : ""}">
    ${item.image_url ? `<img src="${escapeAttribute(item.image_url)}" alt="${escapeAttribute(item.name)}">` : `<div>${escapeHtml(item.name.slice(0, 2))}</div>`}
    <span>${labels.newDrop}</span><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p><b>${escapeHtml(item.price_label)}</b>
  </article>`).join("")}</div>`;
}

function renderLuxuryGalleryCatalog(items) {
  const labels = catalogLocaleLabels(arguments[1]);
  return `<div class="catalog-luxury">${items.map((item) => `<article>
    <div>${item.image_url ? `<img src="${escapeAttribute(item.image_url)}" alt="${escapeAttribute(item.name)}">` : ""}</div>
    <small>${labels.limitedSelection}</small><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p><b>${escapeHtml(item.price_label)}</b>
  </article>`).join("")}</div>`;
}

function renderDigitalOfferCatalog(items) {
  const labels = catalogLocaleLabels(arguments[1]);
  return `<div class="catalog-digital">${items.map((item) => `<article>
    <span>${labels.instantAccess}</span><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p>
    <ul><li>${labels.downloadable}</li><li>${labels.bonus}</li><li>${labels.lifetime}</li></ul>
    <b>${escapeHtml(item.price_label)}</b><a class="rendered-button" href="#">${escapeHtml(item.button_label || labels.getAccess)}</a>
  </article>`).join("")}</div>`;
}

function renderRestaurantMenuCatalog(items) {
  const labels = catalogLocaleLabels(arguments[1]);
  return `<div class="catalog-menu">${items.map((item, index) => `<article>
    <div><small>${index % 2 ? labels.main : labels.popular}</small><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p></div>
    <strong>${escapeHtml(item.price_label || labels.marketPrice)}</strong>
  </article>`).join("")}</div>`;
}

function renderBookingMenuCatalog(items) {
  const labels = catalogLocaleLabels(arguments[1]);
  return `<div class="catalog-booking">${items.map((item, index) => `<article>
    <small>${30 + index * 15} min</small><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p>
    <b>${escapeHtml(item.price_label || labels.fromQuote)}</b><a class="rendered-button" href="#">${labels.book}</a>
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
  return `<article class="${className}">
    ${renderResilientImage(item.image_url, item.name, item.name)}
    ${badge ? `<small>${escapeHtml(badge)}</small>` : ""}
    ${item.category ? `<small>${escapeHtml(item.category)}</small>` : ""}
    <h3>${escapeHtml(item.name)}</h3>
    <p>${escapeHtml(item.description)}</p>
    <b>${escapeHtml(productPriceLabel(item))}</b>
    ${productStockBadge(item)}
    <a class="rendered-button" href="#">${escapeHtml(item.button_label || labels.view)}</a>
  </article>`;
}

function productPriceLabel(item = {}) {
  if (item.price_label && !/precio editable|price editable/i.test(item.price_label)) return item.price_label;
  const amount = item.price_amount ?? item.price_value;
  if (amount !== "" && amount !== null && amount !== undefined && !Number.isNaN(Number(amount))) {
    return `${item.currency || "USD"} ${Number(amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }
  return item.price_type === "quote_only" ? catalogLocaleLabels(currentSchema).request : "Precio editable";
}

function productStockBadge(item = {}) {
  if (!item.track_inventory) return "";
  const quantity = Number(item.inventory_quantity);
  if (Number.isNaN(quantity) || item.inventory_quantity === "") return `<span class="stock-badge stock-unknown">Stock editable</span>`;
  if (quantity <= 0) return `<span class="stock-badge stock-out">Out of stock</span>`;
  if (quantity <= 3) return `<span class="stock-badge stock-low">Only ${quantity} left</span>`;
  return `<span class="stock-badge stock-in">In stock</span>`;
}

function renderResilientImage(url, alt = "", fallbackText = "") {
  const initials = String(fallbackText || alt || "Item").slice(0, 2).toUpperCase();
  const placeholder = `<div class="card-placeholder">${escapeHtml(initials)}</div>`;
  if (!url) return placeholder;
  return `<div class="image-shell"><img src="${escapeAttribute(url)}" alt="${escapeAttribute(alt)}" loading="lazy" decoding="async" onerror="this.closest('.image-shell').classList.add('image-failed')">${placeholder}</div>`;
}

function catalogLocaleLabels(schema) {
  const language = schema?.business?.selectedLanguage || selectedLanguage || "en";
  const labels = {
    en: {
      searchFilters: "Search & filters", category: "Category", brand: "Brand", price: "Price", rating: "Rating", delivery: "Delivery", deal: "Deal", fastShip: "Fast ship",
      sellerVerified: "Seller verified", used: "Used", newItem: "New", localPickup: "Local pickup", makeOffer: "Make offer", contactSeller: "Contact seller",
      newDrop: "New drop", limitedSelection: "Limited selection", instantAccess: "Instant access", downloadable: "Downloadable content", bonus: "Bonus resources", lifetime: "Lifetime access", getAccess: "Get access",
      main: "Main", popular: "Popular", marketPrice: "Market price", fromQuote: "From quote", book: "Book", freeQuote: "Free quote", practiceArea: "Practice area", scheduleConsultation: "Schedule consultation",
      before: "Before", after: "After", viewProject: "View project", plan: "Plan", custom: "Custom", start: "Start", ticketOffer: "Ticket / offer", reserve: "Reserve", package: "Package", applyNow: "Apply now", view: "View", request: "Ask now",
    },
    es: {
      searchFilters: "Busqueda y filtros", category: "Categoria", brand: "Marca", price: "Precio", rating: "Calificacion", delivery: "Entrega", deal: "Oferta", fastShip: "Envio rapido",
      sellerVerified: "Vendedor verificado", used: "Usado", newItem: "Nuevo", localPickup: "Retiro local", makeOffer: "Hacer oferta", contactSeller: "Contactar vendedor",
      newDrop: "Nuevo drop", limitedSelection: "Seleccion limitada", instantAccess: "Acceso inmediato", downloadable: "Contenido descargable", bonus: "Recursos extra", lifetime: "Acceso de por vida", getAccess: "Obtener acceso",
      main: "Principal", popular: "Popular", marketPrice: "Precio de mercado", fromQuote: "Desde cotizacion", book: "Reservar", freeQuote: "Cotizacion gratis", practiceArea: "Area de practica", scheduleConsultation: "Agendar consulta",
      before: "Antes", after: "Despues", viewProject: "Ver proyecto", plan: "Plan", custom: "Personalizado", start: "Empezar", ticketOffer: "Ticket / oferta", reserve: "Reservar", package: "Paquete", applyNow: "Aplicar ahora", view: "Ver", request: "Consultar",
    },
    fr: {
      searchFilters: "Recherche et filtres", category: "Catégorie", brand: "Marque", price: "Prix", rating: "Note", delivery: "Livraison", deal: "Offre", fastShip: "Livraison rapide",
      sellerVerified: "Vendeur vérifié", used: "Occasion", newItem: "Neuf", localPickup: "Retrait local", makeOffer: "Faire une offre", contactSeller: "Contacter le vendeur",
      newDrop: "Nouvelle collection", limitedSelection: "Sélection limitée", instantAccess: "Accès immédiat", downloadable: "Contenu téléchargeable", bonus: "Ressources bonus", lifetime: "Accès à vie", getAccess: "Obtenir l'accès",
      main: "Principal", popular: "Populaire", marketPrice: "Prix du marché", fromQuote: "Sur devis", book: "Réserver", freeQuote: "Devis gratuit", practiceArea: "Domaine d'expertise", scheduleConsultation: "Planifier une consultation",
      before: "Avant", after: "Après", viewProject: "Voir le projet", plan: "Offre", custom: "Sur mesure", start: "Commencer", ticketOffer: "Billet / offre", reserve: "Réserver", package: "Forfait", applyNow: "Postuler", view: "Voir", request: "Demander",
    },
    pt: {
      searchFilters: "Busca e filtros", category: "Categoria", brand: "Marca", price: "Preço", rating: "Avaliação", delivery: "Entrega", deal: "Oferta", fastShip: "Envio rápido",
      sellerVerified: "Vendedor verificado", used: "Usado", newItem: "Novo", localPickup: "Retirada local", makeOffer: "Fazer oferta", contactSeller: "Contatar vendedor",
      newDrop: "Novo drop", limitedSelection: "Seleção limitada", instantAccess: "Acesso imediato", downloadable: "Conteúdo baixável", bonus: "Recursos bônus", lifetime: "Acesso vitalício", getAccess: "Obter acesso",
      main: "Principal", popular: "Popular", marketPrice: "Preço de mercado", fromQuote: "Sob orçamento", book: "Reservar", freeQuote: "Orçamento grátis", practiceArea: "Área de atuação", scheduleConsultation: "Agendar consulta",
      before: "Antes", after: "Depois", viewProject: "Ver projeto", plan: "Plano", custom: "Personalizado", start: "Começar", ticketOffer: "Ingresso / oferta", reserve: "Reservar", package: "Pacote", applyNow: "Aplicar agora", view: "Ver", request: "Consultar",
    },
  };
  return labels[language] || labels.en;
}

function renderFeatureBand(section) {
  const editable = section.editable || {};
  const layout = section.settings?.layout || "feature";
  return `<section class="rendered-section feature-band feature-${escapeAttribute(slugify(layout))} ${sectionClass(section)}" ${sectionAttrs(section)}>
    <div class="section-heading">
      <span class="rendered-kicker">${escapeHtml(section.type)}</span>
      <h2>${escapeHtml(editable.title || editable.headline || section.type)}</h2>
      <p>${escapeHtml(editable.text || editable.subtitle || "")}</p>
    </div>
  </section>`;
}

function renderGallery(section) {
  const images = section.editable?.images || [];
  return `<section class="rendered-section ${sectionClass(section)}" ${sectionAttrs(section)}>
    <h2>${escapeHtml(section.editable?.title || "Gallery")}</h2>
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
  const container = slugify(section.settings?.container_width || "standard");
  const density = slugify(section.settings?.card_density || "comfortable");
  const gap = slugify(section.settings?.card_gap || "comfortable");
  return `heading-${headingSize} spacing-${spacing} container-${container} density-${density} gap-${gap}`;
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
  ];
  const vars = sectionVars(section);
  if (vars) attrs.push(vars);
  return attrs.join(" ");
}

function catalogItemEditor(item, index) {
  const basePath = `catalog_items.${index}`;
  return `<div class="editor-group catalog-item-editor">
    <h4>${index + 1}. ${escapeHtml(item.name || "Catalog item")}</h4>
    <div class="control-grid">
      ${inputField("SKU", `${basePath}.sku`, item.sku || "", "data-catalog-path")}
      ${inputField("Name", `${basePath}.name`, item.name, "data-catalog-path")}
      ${inputField("Category", `${basePath}.category`, item.category || "", "data-catalog-path")}
      ${inputField("Variants", `${basePath}.variants`, item.variants || "", "data-catalog-path")}
      ${selectGenericField("Price type", `${basePath}.price_type`, item.price_type || "quote_only", ["fixed", "starting_at", "quote_only"], "data-catalog-path")}
      ${inputField("Price value", `${basePath}.price_value`, item.price_value ?? "", "data-catalog-path")}
      ${inputField("Currency", `${basePath}.currency`, item.currency || "USD", "data-catalog-path")}
      ${inputField("Price label", `${basePath}.price_label`, item.price_label, "data-catalog-path")}
      ${inputField("Inventory", `${basePath}.inventory_quantity`, item.inventory_quantity ?? "", "data-catalog-path")}
      ${inputField("Image URL", `${basePath}.image_url`, item.image_url, "data-catalog-path")}
      <label>Upload image<input data-catalog-image-upload="${escapeAttribute(`${basePath}.image_url`)}" type="file" accept="image/*"></label>
      ${checkboxField("Track stock", `${basePath}.track_inventory`, Boolean(item.track_inventory), "data-catalog-path")}
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
  return fileToOptimizedDataUrl(file, assetType);
}

async function uploadAssetFile(file, assetType, label) {
  const dataUrl = await fileToOptimizedDataUrl(file, assetType);
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

async function fileToOptimizedDataUrl(file, assetType = "photo") {
  if (!file?.type?.startsWith("image/") || file.type === "image/svg+xml" || file.size < 280000) {
    return fileToDataUrl(file);
  }
  const source = await fileToDataUrl(file);
  const image = await loadImage(source);
  const maxSide = assetType === "logo" ? 900 : assetType === "catalog" ? 1200 : 1600;
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
  canvas.height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
  const context = canvas.getContext("2d", { alpha: assetType === "logo" });
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(assetType === "logo" ? "image/png" : "image/jpeg", assetType === "logo" ? 0.92 : 0.82);
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

function themeVars(theme = {}, brandInput = null) {
  theme.colors = theme.colors || {};
  theme.fonts = theme.fonts || {};
  const brand = normalizeBrand(brandInput || { colors: theme.colors, fontPairing: theme.fonts, borderRadius: `${theme.radius || 10}px`, shadowStyle: theme.shadow });
  const colors = brandToThemeColors(brand);
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
    `--site-muted:${colors.muted}`,
    `--site-border:${colors.border}`,
    `--site-button:${colors.button}`,
    `--site-button-text:${colors.buttonText}`,
    `--site-heading:${JSON.stringify(brand.fontPairing.heading || "Inter")}`,
    `--site-body:${JSON.stringify(brand.fontPairing.body || "Inter")}`,
  ].join(";");
}

function normalizeEditedValue(path, value) {
  if (!path.startsWith("theme.colors.") && !path.startsWith("brand.") && !path.endsWith(".settings.background") && !path.endsWith(".settings.text_color")) {
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
