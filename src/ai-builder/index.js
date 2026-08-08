import {
  API_BASE_URL,
  API_URL,
  INTAKE_ASSISTANT_URL,
  LUMA_AGENT_URL,
  LYRA_EDIT_URL,
  CLIENT_REQUESTS_URL,
  CLIENT_INTAKE_SESSION_URL,
  CLIENT_AUTH_ME_URL,
  CLIENT_AUTH_SESSION_URL,
  CLIENT_AUTH_LOGOUT_URL,
  CLIENT_PROJECTS_URL,
  ASSET_UPLOAD_URL,
  SUPABASE_AUTH_URL,
  SUPPORTED_LANGUAGES,
  ASSISTANT_AVATAR_FALLBACK,
  ASSISTANT_AVATARS,
  LANGUAGE_NAMES,
  GUIDED_DRAFT_STORAGE_KEY,
  GENERATED_SITE_STORAGE_KEY,
  CLIENT_INTAKE_SESSION_STORAGE_KEY,
  CLIENT_WORKSPACE_IDLE_LOCK_MS,
} from './config.js';
import { I18N } from './i18n.js';
import {
  TEMPLATE_PREVIEW_CHOICES,
  normalizeTemplateId,
  templateExecutionStatus,
  withTemplateExecutionStatus,
  runtimeTemplateSelection,
  stripReferenceTemplateRuntimePayload,
  TEMPLATE_PRESETS,
  DEFAULT_BRAND,
  DESIGN_QUALITY_RULES,
} from './templates.js';
import { escapeHtml, escapeAttribute } from './utils.js';
import { pickVariantSeed } from './variants.js';
import {
  renderWebsite as renderWebsiteMarkup,
  marketplaceItems,
  catalogLocaleLabels,
  resolveColor,
  stableCatalogImageUrl,
} from './renderers.js';
import {
  builderState,
  createEmptyGuidedState,
  normalizeBrowserLanguage,
} from './state.js';
import {
  isLegacyBuilderPage,
  form,
  statusText,
  storageStatus,
  siteTitle,
  editorMount,
  previewFrame,
  studioSelectionToolbar,
  studioProgressList,
  studioAdjustButton,
  studioLumaMessage,
  studioSuggestedList,
  studioRecentList,
  studioAuthGate,
  studioAuthCloseButton,
  studioGoogleAuthButton,
  studioAppleAuthButton,
  studioEmailAuthButton,
  studioEmailAuthForm,
  studioAuthEmail,
  studioAuthDemoButton,
  quickModeButton,
  guidedModeButton,
  guidedPanel,
  guidedChatCard,
  liveSitePreviewMount,
  guidedChat,
  guidedReply,
  guidedSendButton,
  guidedStatusText,
  guidedStepLabel,
  guidedGenerateButton,
  guidedCloseButton,
  guidedMicButton,
  assistantAudioToggle,
  voiceStatusText,
  guidedThinking,
  guidedProgressBar,
  reviewDetailsButton,
  keepChattingButton,
  currentInfoPreview,
  currentInfoMeta,
  quickChipRow,
  guidedLogoUpload,
  guidedPhotoUpload,
  guidedLogoPreview,
  guidedPhotoPreview,
  brandKitPanel,
  guidedAssetPrompt,
  chatLogoUploadButton,
  chatPhotoUploadButton,
  guidedBriefReview,
  summaryLogoUploadButton,
  summaryPhotoUploadButton,
  editDetailsButton,
  checkDomainButton,
  domainCheckStatus,
  domainResults,
  languageSelector,
  summaryLanguageSelector,
  isPublicClientSetup,
  isEmbeddedClientSetup,
  switchManualFormButton,
  backToChatButton,
  submitDraftReviewButton,
  adjustWithLumaButton,
  startNewProjectButton,
  startNewGeneratedProjectButton,
  guidedHeaderActions,
  builderAvatarRoot,
  builderAvatarManager,
} from './dom.js';
import {
  captureClientAuthResetIntent,
  captureStudioAuthRedirect,
  clearClientWorkspaceUnlock,
  clientAuthHeaders,
  closeClientProjectsPanel,
  closeStudioAuthGate,
  continueWithDemoSession,
  continueWithEmailAuth,
  continueWithStudioAuth,
  createOrResumeClientIntakeSession,
  ensureClientProjectsPanel,
  ensureStudioAuthRedirectCaptured,
  establishServerSession,
  fetchClientAuthUser,
  fetchClientProjects,
  guidedSessionDraftForApi,
  handleClientProjectsAfterAuth,
  handleExpiredClientAuth,
  hasStudioAccountSession,
  hydrateClientIntakeSession,
  initClientIntakeSessionGate,
  initClientWorkspaceSecurity,
  isClientWorkspaceUnlocked,
  loadClientProject,
  lockClientWorkspace,
  markClientWorkspaceUnlocked,
  openClientProjectsPanel,
  openStudioAuthGate,
  readClientIntakeSession,
  renderClientAccountControl,
  renderClientProjectsLoading,
  renderClientProjectsPanel,
  restorePendingStudioAfterAuth,
  resumeClientSessionFromAuthToken,
  revealStudioAuthProviderButtons,
  sanitizeClientSessionDraft,
  scheduleClientWorkspaceAutoLock,
  startNewClientProject,
  switchClientAccount,
  syncClientIntakeSession,
  writeClientIntakeSession,
} from './auth.js';
import {
  addSectionPurpose,
  addStudioSection,
  brandKitEditor,
  checkDesiredDomainOptions,
  compactCollectedPreview,
  createDomainOrderIfNeeded,
  createSectionByType,
  domainStatusLabel,
  ensureLiveSitePreviewCard,
  ensurePurposefulSections,
  handleStudioSelectionAction,
  hasSectionPurpose,
  improveSectionCopy,
  keepEssentialSections,
  livePreviewFallbackItems,
  livePreviewItemMicrocopy,
  livePreviewNavItems,
  livePreviewPayload,
  livePreviewPublicCopy,
  normalizeEditedValue,
  normalizeSectionSettings,
  renderAiContractPreview,
  renderAssetPreviews,
  renderBrandKit,
  renderDomainResults,
  renderGuidedBriefReview,
  renderLumaReadyCard,
  renderNeutralLiveWorkspace,
  renderSelectedDomainState,
  renderStudioLyraInsights,
  renderStudioProgress,
  renderWebsite,
  requireStudioAccount,
  reviewWebsiteConfigBeforeRender,
  sectionEditor,
  sectionQuickInspector,
  selectStudioSection,
  selectedStudioSection,
  setPreviewButton,
  setStudioProgressPhase,
  shouldShowAssetPrompt,
  studioInsightItems,
  studioInspector,
  studioProgressItems,
  studioRecentChanges,
  studioSuggestedImprovements,
  translatePreviewNav,
  updateAssetPromptVisibility,
  uploadAssetFile,
  uploadAssetOrFallback,
  wantsToUploadAssets,
} from './editor.js';
import {
  appendChatMessage,
  appendUnderstandingCard,
  applyDraftAdjustmentFromChat,
  assistantVisibleCopy,
  avatarStateFromAssistantState,
  closeDraftAdjustmentChat,
  composeAssistantReply,
  ensureGuidedCoachCard,
  ensureServerIntakeGate,
  guidedQuestion,
  initBuilderAvatarAssistant,
  initGuidedIntake,
  initVoiceInput,
  isGuidedStepAnswered,
  isRichIntakeMessage,
  keepChatting,
  nextGuidedStep,
  nextSmartGuidedStep,
  normalizeAssistantState,
  normalizeGuidedStepForCurrentState,
  normalizeNextGuidedStep,
  publicAssistantCopy,
  renderGuidedCoachCard,
  renderGuidedStepRail,
  renderSitePlanInChatIfNeeded,
  sanitizeAssistantMessage,
  sanitizeAssistantTemplateClaim,
  sendGuidedReply,
  setIntakeMode,
  shouldSuppressAssistantMessage,
  skipGuidedQuestion,
  speakAssistantMessage,
  startVoiceInput,
  switchBackToChat,
  toggleAssistantAudio,
  trackAssistantPrompt,
  understandingItem,
  understandingItems,
  updateAssistantAudioToggle,
} from './chat.js';
export {
  adjustGeneratedDraftWithLuma,
  adminHeaders,
  aiBuildFocusLine,
  aiCatalogStrategyLine,
  aiSourceSignalList,
  aiVisualStrategyLine,
  brandPalette,
  cleanShortText,
  cssEscape,
  ensureSitePlan,
  fileToOptimizedDataUrl,
  fontPairingLabel,
  humanizePlanFeature,
  inferCommerceIndustry,
  inputField,
  isGenericText,
  isWeakCta,
  isWeakHeadline,
  livePreviewTemplateSelection,
  localizedTemplateDescription,
  meaningfulOfferItems,
  normalizeBrand,
  normalizeGenericText,
  openReviewDetails,
  pageIndex,
  pageQuickInspector,
  primaryCtaForStrategy,
  professionalHeadline,
  professionalSubtitle,
  publicProductFocus,
  resequence,
  selectField,
  selectedPage,
  slugify,
  syncGuidedStateFromSummary,
  textareaField,
  wantsAiGeneratedLogo,
};
export {
  applyCyberpunkVisualDirection,
  applyLumaAgentDecision,
  applyPromptFromQuery,
  applyTargetedSchemaPatch,
  briefRequestsCyberpunk,
  buildInstantTemplateSchema,
  buildSitePlan,
  chooseNextQuestionText,
  collectPayload,
  completeGuidedBriefFromMessage,
  contactInfoCompactLabel,
  draftAdjustmentReply,
  explicitlyRequestsTemplateSwitch,
  extractWebsiteIntent,
  guidedStage,
  hasEnoughContextForTemplatePreview,
  importQuickFormToGuidedState,
  inferGuidedUpdates,
  inferGuidedUpdatesFromAnyMessage,
  isDuplicateQuestion,
  languageToSpeechLocale,
  localizedTemplateName,
  mergeTemplateSelectionIntoSchema,
  normalizeTemplateIntentText,
  questionSignature,
  refreshAiStudioPlanFromContext,
  removeGuidedBuildStatusCard,
  renderSitePlanCard,
  requestLyraSchemaEdit,
  restoreGeneratedSite,
  restoreGuidedDraft,
  saveGuidedDraft,
  selectTemplateForPayload,
  setThinking,
  shouldRebuildDraftFromTemplate,
  shouldResetRestoredWorkspaceForMessage,
  syncTemplateSelectionFromGuidedContext,
  templatePreviewMeta,
};
export {
  addSectionPurpose,
  addStudioSection,
  brandKitEditor,
  checkDesiredDomainOptions,
  compactCollectedPreview,
  createDomainOrderIfNeeded,
  createSectionByType,
  domainStatusLabel,
  ensureLiveSitePreviewCard,
  ensurePurposefulSections,
  handleStudioSelectionAction,
  hasSectionPurpose,
  improveSectionCopy,
  keepEssentialSections,
  livePreviewFallbackItems,
  livePreviewItemMicrocopy,
  livePreviewNavItems,
  livePreviewPayload,
  livePreviewPublicCopy,
  normalizeEditedValue,
  normalizeSectionSettings,
  renderAiContractPreview,
  renderAssetPreviews,
  renderBrandKit,
  renderDomainResults,
  renderGuidedBriefReview,
  renderLumaReadyCard,
  renderNeutralLiveWorkspace,
  renderSelectedDomainState,
  renderStudioLyraInsights,
  renderStudioProgress,
  renderWebsite,
  requireStudioAccount,
  reviewWebsiteConfigBeforeRender,
  sectionEditor,
  sectionQuickInspector,
  selectStudioSection,
  selectedStudioSection,
  setPreviewButton,
  setStudioProgressPhase,
  shouldShowAssetPrompt,
  studioInsightItems,
  studioInspector,
  studioProgressItems,
  studioRecentChanges,
  studioSuggestedImprovements,
  translatePreviewNav,
  updateAssetPromptVisibility,
  uploadAssetFile,
  uploadAssetOrFallback,
  wantsToUploadAssets,
} from './editor.js';
export {
  appendChatMessage,
  appendUnderstandingCard,
  applyDraftAdjustmentFromChat,
  assistantVisibleCopy,
  avatarStateFromAssistantState,
  closeDraftAdjustmentChat,
  composeAssistantReply,
  ensureGuidedCoachCard,
  ensureServerIntakeGate,
  guidedQuestion,
  initBuilderAvatarAssistant,
  initGuidedIntake,
  initVoiceInput,
  isGuidedStepAnswered,
  isRichIntakeMessage,
  keepChatting,
  nextGuidedStep,
  nextSmartGuidedStep,
  normalizeAssistantState,
  normalizeGuidedStepForCurrentState,
  normalizeNextGuidedStep,
  publicAssistantCopy,
  renderGuidedCoachCard,
  renderGuidedStepRail,
  renderSitePlanInChatIfNeeded,
  sanitizeAssistantMessage,
  sanitizeAssistantTemplateClaim,
  sendGuidedReply,
  setIntakeMode,
  shouldSuppressAssistantMessage,
  skipGuidedQuestion,
  speakAssistantMessage,
  startVoiceInput,
  switchBackToChat,
  toggleAssistantAudio,
  trackAssistantPrompt,
  understandingItem,
  understandingItems,
  updateAssistantAudioToggle,
} from './chat.js';

function adminHeaders(extra = {}) {
  const token = localStorage.getItem("lumaAdminToken") || "";
  return {
    ...extra,
    ...(token ? { "x-admin-token": token } : {}),
  };
}

export const GUIDED_QUESTIONS = {
  en: {
    websiteIntent: "Tell me what you want to build in one rich paragraph: what the business sells or does, who buys, the style/colors, location, and whether it should sell online, book appointments, collect leads, or present the company. I will choose the best structure and ask only for what is missing.",
    businessName: "First, what is the name of your business?",
    businessDescription: "Tell me what it sells or does in one message. I will use it as design strategy, not as literal page copy.",
    industry: "What industry or category best fits it?",
    location: "Where is it located or where does it serve customers?",
    servicesProducts: "I only need one clarification: what are the main product categories or services?",
    targetAudience: "Who is the main customer? You can also let AI decide.",
    preferredTone: "What style should it feel like: elegant, modern, friendly, premium? Or should AI decide?",
    preferredColors: "Any preferred colors, or do you want to upload a logo so I can extract a palette from it?",
    contactInfo: "What contact details should appear on the site, and what email should we use to save your draft/account? You can also continue with Google or Apple before generating.",
    salesMode: "Should the site support online sales, quote requests, in-person visits, or a mix?",
    hasLogoPhotos: "Do you have a logo to upload? If not, we can continue with your business name in text for now.",
    desiredDomain: "What domain would you like? You can write a name like lunastore.com or skip it for now.",
    review: "I have enough to create the first draft.",
  },
  es: {
    websiteIntent: "Descríbeme en un párrafo qué quieres construir: qué vende o hace el negocio, para quién, estilo/colores, ubicación y si debe vender online, reservar citas, captar clientes o sólo presentar la empresa. Yo elegiré la mejor estructura y sólo preguntaré lo que falte.",
    businessName: "Primero, ¿cómo se llama tu negocio?",
    businessDescription: "Dime qué vende o qué hace en un solo mensaje. Lo usaré como estrategia de diseño, no como texto literal para la página.",
    industry: "En que industria o categoria lo pondrias?",
    location: "Donde atiende o donde esta ubicado?",
    servicesProducts: "Sólo necesito aclarar algo: ¿cuáles son las categorías principales de productos o servicios?",
    targetAudience: "A quien le vendes principalmente? Tambien puedes dejar que IA decida.",
    preferredTone: "Que estilo quieres: elegante, moderno, cercano, premium? O dejo que IA decida?",
    preferredColors: "¿Tienes colores preferidos o quieres subir un logo para sacar una paleta desde ahí?",
    contactInfo: "Que contacto quieres mostrar en la pagina y que email usamos para guardar tu borrador/cuenta? Tambien puedes continuar con Google o Apple antes de generar.",
    salesMode: "¿Quieres ventas online, solicitudes de cotización, visitas presenciales o una mezcla?",
    hasLogoPhotos: "¿Tienes un logo para subir? Si no, seguimos con el nombre de tu negocio en texto por ahora.",
    desiredDomain: "Que dominio te gustaria? Puedes escribir algo como lunastore.com o saltarlo por ahora.",
    review: "Ya tengo suficiente para crear el primer borrador.",
  },
  fr: {
    websiteIntent: "Décrivez en un paragraphe ce que vous voulez créer : ce que l'entreprise vend ou fait, pour qui, le style/couleurs, la localisation, et si le site doit vendre en ligne, réserver, capter des leads ou présenter l'entreprise. Je choisirai la meilleure structure et demanderai seulement ce qui manque.",
    businessName: "Quel est le nom de l'entreprise?",
    businessDescription: "Dites-moi ce qu'elle vend ou propose en un seul message. Je l'utiliserai comme stratégie de design, pas comme texte littéral.",
    industry: "Dans quel secteur ou catégorie la placeriez-vous?",
    location: "Où se trouve-t-elle ou où sert-elle ses clients?",
    servicesProducts: "J'ai seulement besoin d'une précision : quelles sont les principales catégories de produits ou services ?",
    targetAudience: "Qui est le client principal? Vous pouvez aussi laisser l'IA décider.",
    preferredTone: "Quel style voulez-vous: élégant, moderne, chaleureux, premium? Ou l'IA décide?",
    preferredColors: "Avez-vous des couleurs préférées, ou voulez-vous importer un logo pour que j'en extraie une palette?",
    contactInfo: "Quelles coordonnées afficher sur le site, et quel email utiliser pour sauvegarder le brouillon/compte? Vous pouvez aussi continuer avec Google ou Apple avant de générer.",
    salesMode: "Le site doit-il proposer la vente en ligne, les demandes de devis, les visites en personne, ou un mélange?",
    hasLogoPhotos: "Avez-vous un logo à importer ? Sinon, nous continuons avec le nom de votre entreprise en texte.",
    desiredDomain: "Quel domaine souhaitez-vous? Vous pouvez écrire lunastore.com ou ignorer pour l'instant.",
    review: "J'ai assez d'informations pour créer le premier brouillon.",
  },
  pt: {
    websiteIntent: "Descreva em um parágrafo o que você quer criar: o que o negócio vende ou faz, para quem, estilo/cores, localização, e se deve vender online, agendar, captar contatos ou apresentar a empresa. Eu escolho a melhor estrutura e pergunto apenas o que faltar.",
    businessName: "Qual é o nome do negócio?",
    businessDescription: "Diga o que ele vende ou faz em uma mensagem. Vou usar isso como estratégia de design, não como texto literal da página.",
    industry: "Em qual setor ou categoria ele se encaixa?",
    location: "Onde fica ou onde atende clientes?",
    servicesProducts: "Só preciso esclarecer uma coisa: quais são as principais categorias de produtos ou serviços?",
    targetAudience: "Quem é o cliente principal? Você também pode deixar a IA decidir.",
    preferredTone: "Qual estilo você quer: elegante, moderno, próximo, premium? Ou a IA decide?",
    preferredColors: "Tem cores preferidas, ou quer enviar um logo para eu extrair uma paleta dele?",
    contactInfo: "Quais contatos devem aparecer no site, e qual email usamos para salvar seu rascunho/conta? Você também pode continuar com Google ou Apple antes de gerar.",
    salesMode: "O site deve aceitar vendas online, pedidos de orçamento, visitas presenciais, ou uma mistura?",
    hasLogoPhotos: "Você tem um logo para enviar? Caso não, seguimos com o nome do negócio em texto por enquanto.",
    desiredDomain: "Qual domínio você gostaria? Pode escrever lunastore.com ou pular por enquanto.",
    review: "Já tenho o suficiente para criar o primeiro rascunho.",
  },
};


export const GUIDED_STEPS = [
  "websiteIntent",
  "businessName",
  "businessDescription",
  "servicesProducts",
  "preferredColors",
  "contactInfo",
  "review",
];

export const REQUIRED_GUIDED_STEPS = [
  "websiteIntent",
  "businessName",
  "businessDescription",
];

export const SMART_GUIDED_STEP_PRIORITY = [
  "websiteIntent",
  "businessName",
  "businessDescription",
  "servicesProducts",
  "preferredColors",
  "contactInfo",
];

export const OPTIONAL_GUIDED_STEPS = new Set([]);

export const guidedAskedSteps = new Map();

function bootLegacyBuilderPage() {
  document.body.classList.toggle("embedded-chat", isEmbeddedClientSetup);

  registerCriticalGuidedControls();
  safeBootStep("avatar", initBuilderAvatarAssistant);
  safeBootStep("language", initLanguageControls);
  safeBootStep("voice", initVoiceInput);
  safeBootStep("audio-toggle", updateAssistantAudioToggle);
  safeBootStep("assistant-state", () => setAssistantState("happy"));
  safeBootStep("client-auth-reset", captureClientAuthResetIntent);
  safeBootStep("auth-redirect", captureStudioAuthRedirect);
  safeBootStep("request-hydration", hydrateFromSelectedRequest);
  safeBootStep("guided-intake", initGuidedIntake);
  safeBootStep("guided-media-drop", initGuidedMediaDrop);
  safeBootStep("studio-lyra-panel", renderStudioLyraInsights);
  safeBootStep("client-session", initClientIntakeSessionGate);
  safeBootStep("client-account-control", renderClientAccountControl);
  safeBootStep("client-workspace-security", initClientWorkspaceSecurity);

function safeBootStep(label, callback) {
  try {
    callback();
  } catch (error) {
    console.error(`LYRA boot step failed: ${label}`, error);
    if (guidedStatusText) {
      guidedStatusText.textContent = langText({
        en: "LYRA loaded with a recoverable issue. You can keep answering.",
        es: "LYRA cargó con un problema recuperable. Puedes seguir respondiendo.",
        fr: "LYRA a chargé avec un problème récupérable. Vous pouvez continuer.",
        pt: "A LYRA carregou com um problema recuperável. Você pode continuar.",
      });
    }
  }
}

function registerCriticalGuidedControls() {
  document.addEventListener("click", (event) => {
    const target = event.target?.closest?.("#guidedSendButton, #guidedSkipButton, #switchManualFormButton, #backToChatButton, #guidedGenerateButton, [data-chat-generate]");
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (target.id === "guidedSendButton") {
      handleGuidedSendAction(event);
    } else if (target.id === "guidedSkipButton") {
      skipGuidedQuestion();
    } else if (target.id === "switchManualFormButton") {
      switchToManualForm();
    } else if (target.id === "backToChatButton") {
      switchBackToChat();
    } else if (target.id === "guidedGenerateButton" || target.matches?.("[data-chat-generate]")) {
      handleGuidedGenerateButton(event);
    }
  }, true);
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.target?.id !== "guidedReply") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    handleGuidedSendAction(event);
  }, true);
}

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
  if (!builderState.currentSchema) return;
  await navigator.clipboard.writeText(JSON.stringify(builderState.currentSchema, null, 2));
  storageStatus.textContent = "JSON copied";
});

document.querySelector("#saveSchemaButton").addEventListener("click", (event) => requireStudioAccount(event, "save", saveCurrentSchema));
document.querySelector("#publishButton").addEventListener("click", (event) => requireStudioAccount(event, "publish", publishCurrentSite));
document.querySelector("#clientPreviewButton").addEventListener("click", () => {
  document.body.classList.add("client-preview-mode");
});
document.querySelector("#exitClientPreviewButton").addEventListener("click", () => {
  document.body.classList.remove("client-preview-mode", "draft-adjust-open");
});
submitDraftReviewButton?.addEventListener("click", (event) => requireStudioAccount(event, "review", submitGeneratedDraftForReview));
adjustWithLumaButton?.addEventListener("click", adjustGeneratedDraftWithLuma);
studioAdjustButton?.addEventListener("click", adjustGeneratedDraftWithLuma);
startNewProjectButton?.addEventListener("click", startNewClientProject);
startNewGeneratedProjectButton?.addEventListener("click", startNewClientProject);
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
studioAuthDemoButton?.addEventListener("click", continueWithDemoSession);
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
    if (document.body.classList.contains("draft-adjust-open")) {
      closeDraftAdjustmentChat();
      return;
    }
    if (builderState.currentSchema) {
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
    window.location.href = `/start/?lang=${builderState.selectedLanguage}`;
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
guidedSendButton?.addEventListener("pointerdown", handleGuidedSendAction);
guidedSendButton?.addEventListener("click", handleGuidedSendAction);
document.addEventListener("click", (event) => {
  if (event.target?.closest?.("#guidedSendButton")) {
    handleGuidedSendAction(event);
  }
});
document.querySelector("#guidedSkipButton").addEventListener("click", skipGuidedQuestion);
window.handleGuidedGenerateButton = handleGuidedGenerateButton;
guidedGenerateButton.addEventListener("pointerdown", handleGuidedGenerateButton);
guidedGenerateButton.addEventListener("click", handleGuidedGenerateButton);
document.addEventListener("click", (event) => {
  if (event.target?.closest?.("#guidedGenerateButton")) {
    handleGuidedGenerateButton(event);
  }
}, true);
guidedReply.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    handleGuidedSendAction(event);
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
summaryLogoUploadButton?.addEventListener("click", () => guidedLogoUpload.click());
summaryPhotoUploadButton?.addEventListener("click", () => guidedPhotoUpload.click());
editDetailsButton?.addEventListener("click", openReviewDetails);
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
}

if (isLegacyBuilderPage) {
  bootLegacyBuilderPage();
}

function initLanguageControls() {
  const params = new URLSearchParams(window.location.search);
  builderState.selectedLanguage = normalizeBrowserLanguage(
    params.get("lang") || (navigator.languages || [navigator.language || "en"])[0]
  );
  builderState.guidedState.selectedLanguage = builderState.selectedLanguage;
  languageSelector.value = builderState.selectedLanguage;
  summaryLanguageSelector.value = builderState.selectedLanguage;
  applyI18n();
}

export function setSelectedLanguage(value) {
  const previousLanguage = builderState.selectedLanguage;
  builderState.selectedLanguage = normalizeBrowserLanguage(value);
  builderState.guidedState.selectedLanguage = builderState.selectedLanguage;
  languageSelector.value = builderState.selectedLanguage;
  summaryLanguageSelector.value = builderState.selectedLanguage;
  applyI18n();
  updateBuilderAvatarLabels();
  renderGuidedSummary();
  if (previousLanguage !== builderState.selectedLanguage) {
    resetAssistantConversation();
  }
}

export function t(key) {
  return publicAssistantCopy(I18N[builderState.selectedLanguage]?.[key] || I18N.en[key] || key);
}

export function langText(map, language = builderState.selectedLanguage) {
  return publicAssistantCopy(map[language] || map.en || "");
}



function guidedStage(step = builderState.guidedStep) {
  if (step === "websiteIntent") {
    return {
      index: 1,
      title: langText({ en: "Define the business goal", es: "Definir el objetivo", fr: "Définir l'objectif", pt: "Definir o objetivo" }),
      body: langText({
        en: "Start with the outcome. LYRA will decide whether this should be a store, catalog, booking flow, lead page, company site or marketplace.",
        es: "Empieza por el objetivo. LYRA decide si conviene tienda, catalogo, reservas, captacion, pagina de empresa o marketplace.",
        fr: "Commencez par l'objectif. LYRA décide si le mieux est boutique, catalogue, réservation, leads, site d'entreprise ou marketplace.",
        pt: "Comece pelo objetivo. A LYRA decide se deve ser loja, catálogo, agendamento, captação, site empresarial ou marketplace.",
      }),
      examples: [
        langText({ en: "Sell products online", es: "Vender productos online", fr: "Vendre en ligne", pt: "Vender online" }),
        langText({ en: "Show a catalog and receive quotes", es: "Mostrar catalogo y recibir cotizaciones", fr: "Catalogue et devis", pt: "Mostrar catalogo e receber orçamentos" }),
        langText({ en: "Explain my company and get leads", es: "Explicar mi empresa y captar clientes", fr: "Présenter l'entreprise et capter des leads", pt: "Explicar a empresa e captar contatos" }),
      ],
    };
  }
  if (["businessName", "businessDescription", "industry", "location", "servicesProducts"].includes(step)) {
    return {
      index: 2,
      title: langText({ en: "Understand the business", es: "Entender el negocio", fr: "Comprendre l'entreprise", pt: "Entender o negócio" }),
      body: langText({
        en: "Give LYRA the raw business details. One rich paragraph is enough; it will extract what matters.",
        es: "Dale a LYRA los datos reales del negocio. Un párrafo completo sirve; LYRA extrae lo importante.",
        fr: "Donnez les détails bruts. Un paragraphe riche suffit; LYRA extrait l'essentiel.",
        pt: "Dê os dados reais do negócio. Um parágrafo completo basta; a LYRA extrai o essencial.",
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
        en: "Now LYRA chooses the visual personality, sales flow and assets. You can answer or let AI decide.",
        es: "Ahora LYRA define personalidad visual, forma de venta y recursos. Puedes responder o dejar que IA decida.",
        fr: "LYRA définit la personnalité visuelle, le flux de vente et les assets. Vous pouvez répondre ou laisser l'IA décider.",
        pt: "Agora a LYRA define visual, venda e assets. Você pode responder ou deixar a IA decidir.",
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
  const plan = builderState.guidedState.sitePlan || (builderState.forcedTemplateSelection?.templateId ? buildSitePlan() : null);
  return {
    index: 5,
    title: langText({ en: "Review and generate", es: "Revisar y generar", fr: "Vérifier et générer", pt: "Revisar e gerar" }),
    body: langText({
      en: "LYRA has enough to create the first editable website draft. Review or ask for one more change.",
      es: "LYRA ya tiene suficiente para crear el primer borrador editable. Revisa o pide un último ajuste.",
      fr: "LYRA a assez d'informations pour créer le premier brouillon modifiable. Vérifiez ou demandez un dernier ajustement.",
      pt: "A LYRA já tem o suficiente para criar o primeiro rascunho editável. Revise ou peça um último ajuste.",
    }),
    examples: [
      plan ? langText({ en: "Approve site plan", es: "Aprobar plan del sitio", fr: "Approuver le plan", pt: "Aprovar plano" }) : langText({ en: "Generate draft", es: "Generar borrador", fr: "Générer le brouillon", pt: "Gerar rascunho" }),
      langText({ en: "Ask for a change", es: "Pedir un cambio", fr: "Demander un changement", pt: "Pedir uma mudança" }),
    ],
  };
}







export function renderLiveSitePreview() {
  const card = ensureLiveSitePreviewCard();
  if (!card) return;
  card.classList.remove("template-board-card-host", "template-board-loading-host", "selected-template-card-host", "live-render-card-host");
  syncTemplateSelectionFromGuidedContext();
  if (shouldShowCanvasTemplateCarousel()) {
    if (shouldRenderTemplateBoardSkeleton()) {
      renderCanvasTemplateSkeleton(card);
      return;
    }
    renderCanvasTemplateCarousel(card);
    return;
  }
  if (shouldShowSelectedTemplatePreview()) {
    renderSelectedTemplateCanvasPreview(card);
    return;
  }
  if (!hasEnoughContextForTemplatePreview()) {
    card.innerHTML = renderNeutralLiveWorkspace();
    return;
  }
  if (renderAiContractPreview(card)) {
    return;
  }
  const payload = livePreviewPayload();
  const selection = livePreviewTemplateSelection();
  let schema = buildInstantTemplateSchema(payload, selection);
  schema = prepareWebsiteConfig(schema, payload, selection);
  card.classList.add("live-render-card-host");
  card.innerHTML = `
    <div class="live-template-preview-shell">
      ${renderWebsite(schema, schema.pages?.[0]?.page_key || "home")}
    </div>
  `;
}



function shouldShowCanvasTemplateCarousel() {
  if (!isPublicClientSetup || builderState.currentSchema) return false;
  if (!hasEnoughContextForTemplatePreview()) return false;
  const pages = Array.isArray(builderState.guidedState.sitePlan?.pages) ? builderState.guidedState.sitePlan.pages : [];
  if (pages.some((page) => Array.isArray(page.sections) && page.sections.some((section) => section?.componentType))) return false;
  if (builderState.forcedTemplateSelection?.intent === "client_visual_template_choice") return false;
  return true;
}

function templateBoardLoadingKey() {
  const selection = livePreviewTemplateSelection();
  return [
    builderState.selectedLanguage,
    builderState.guidedStep,
    selection?.templateId || "",
    selection?.catalogType || "",
    builderState.guidedState.websiteIntent || "",
    builderState.guidedState.businessDescription || "",
    arrayValue(builderState.guidedState.servicesProducts).join("|"),
  ].join("::");
}

function shouldRenderTemplateBoardSkeleton() {
  const key = templateBoardLoadingKey();
  if (key !== builderState.templateBoardLoadingSignature) {
    builderState.templateBoardLoadingSignature = key;
    builderState.templateBoardLoading = true;
    if (builderState.templateBoardLoadingTimer) clearTimeout(builderState.templateBoardLoadingTimer);
    builderState.templateBoardLoadingTimer = setTimeout(() => {
      builderState.templateBoardLoading = false;
      if (shouldShowCanvasTemplateCarousel()) renderLiveSitePreview();
    }, 560);
    return true;
  }
  return builderState.templateBoardLoading;
}

function renderCanvasTemplateSkeleton(card) {
  card.classList.add("template-board-loading-host");
  const skeletonCards = Array.from({ length: 5 }).map((_, index) => `
    <article class="template-skeleton-card" aria-hidden="true" style="--skeleton-delay: ${index * 90}ms">
      <div class="template-skeleton-preview"></div>
      <div class="template-skeleton-body">
        <span class="template-skeleton-pill"></span>
        <strong></strong>
        <small></small>
        <small></small>
        <em></em>
      </div>
    </article>
  `).join("");
  card.innerHTML = `
    <section class="template-choice-panel template-board-panel template-skeleton-panel" aria-busy="true" aria-live="polite">
      <div class="template-choice-heading template-carousel-heading">
        <strong>${escapeHtml(langText({
          en: "Preparing premium template options",
          es: "Preparando opciones premium",
          fr: "Preparation des options premium",
          pt: "Preparando opcoes premium",
        }))}</strong>
        <span>${escapeHtml(langText({
          en: "LYRA is matching your business context to the strongest editable template bases.",
          es: "LYRA esta cruzando el contexto del negocio con las mejores bases editables.",
          fr: "LYRA rapproche le contexte business des meilleures bases modifiables.",
          pt: "A LYRA esta combinando o contexto do negocio com as melhores bases editaveis.",
        }))}</span>
      </div>
      <div class="template-board-grid template-skeleton-grid">
        ${skeletonCards}
      </div>
    </section>
  `;
}

function renderCanvasTemplateCarousel(card) {
  card.classList.add("template-board-card-host");
  const selection = livePreviewTemplateSelection();
  const selectedId = selection?.templateId || "";
  const choices = canvasTemplateChoices(selectedId).slice(0, 5);
  if (!choices.length) {
    card.innerHTML = renderNeutralLiveWorkspace();
    return;
  }
  const shouldAnimateCards = !window.__lyraTemplateBoardAnimated;
  card.innerHTML = `
    <section class="template-choice-panel template-board-panel">
      <div class="template-choice-heading template-carousel-heading">
        <strong>${escapeHtml(langText({
          en: "Select the structure LYRA should use",
          es: "Selecciona la estructura que LYRA debe usar",
          fr: "Selectionnez la structure que LYRA doit utiliser",
          pt: "Selecione a estrutura que a LYRA deve usar",
        }))}</strong>
        <span>${escapeHtml(langText({
          en: "These are real template bases. LYRA will adapt copy, colors, products and flow after you choose one.",
          es: "Estas son bases reales. LYRA adaptara textos, colores, productos y flujo despues de elegir una.",
          fr: "Ce sont de vraies bases. LYRA adaptera textes, couleurs, produits et parcours apres le choix.",
          pt: "Estas sao bases reais. A LYRA adapta textos, cores, produtos e fluxo depois da escolha.",
        }))}</span>
      </div>
      <div class="template-board-grid template-coverflow-track ${shouldAnimateCards ? "template-board-grid-enter" : ""}" aria-label="Template options">
        ${choices.map((choice, index) => `
          <article class="template-choice-card template-board-card template-coverflow-card template-carousel-card ${choice.templateId === selectedId ? "active-card recommended" : index === 0 ? "recommended" : ""}" style="--template-card-index: ${index};" data-template-choice="${escapeAttribute(choice.templateId)}" data-catalog-type="${escapeAttribute(choice.catalogType || "")}" tabindex="0">
            <div class="template-board-image">
              ${templateLivePreviewMarkup(choice)}
            </div>
            <div class="template-board-body">
              <div class="template-board-meta">
                <span class="template-status-pill">${escapeHtml(choice.templateId === selectedId || index === 0 ? langText({ en: "Recommended", es: "Recomendada", fr: "Recommandee", pt: "Recomendada" }) : langText({ en: "Alternative", es: "Alternativa", fr: "Alternative", pt: "Alternativa" }))}</span>
                <div class="template-board-badges" aria-label="${escapeAttribute(langText({ en: "Template categories", es: "Categorias del template", fr: "Categories du template", pt: "Categorias do template" }))}">
                  ${templateCardBadges(choice).map((badge, badgeIndex) => `<em data-badge-tone="${badgeIndex % 3}">${escapeHtml(badge)}</em>`).join("")}
                </div>
              </div>
              <strong>${escapeHtml(localizedTemplateName(choice))}</strong>
              <small>${escapeHtml(localizedTemplateDescription(choice))}</small>
              <button type="button" data-template-preview="${escapeAttribute(choice.templateId)}">${escapeHtml(langText({ en: "Preview", es: "Previsualizar", fr: "Previsualiser", pt: "Previsualizar" }))}</button>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
  window.__lyraTemplateBoardAnimated = true;
  const panel = card.querySelector(".template-board-panel");
  initTemplateCarousel(card.querySelector(".template-board-grid"));
  panel?.addEventListener("click", (event) => {
    const button = event.target?.closest?.("[data-template-preview]");
    if (!button) return;
    const templateId = button.dataset.templatePreview || "";
    if (!templateId) return;
    event.preventDefault();
    event.stopPropagation();
    window.Lyra?.selectTemplate(templateId);
  });
}

function canvasTemplateChoices(selectedTemplateId = "") {
  const selected = templatePreviewMeta(selectedTemplateId);
  const selectedCatalog = selected?.catalogType || "";
  const selectedText = `${selectedTemplateId} ${selectedCatalog}`;
  const ordered = [];
  const usedImages = new Set();
  const add = (templateId, options = {}) => {
    const choice = templatePreviewMeta(templateId);
    if (!choice || ordered.some((item) => item.templateId === choice.templateId)) return;
    if (usedImages.has(choice.image) && !options.allowDuplicateImage) return;
    usedImages.add(choice.image);
    ordered.push(choice);
  };

  add(selectedTemplateId);
  if (/legal|professional|consulting|tax|insurance|advisor/.test(selectedText)) {
    ["legal-professional-services-pro", "corporate-company-pro", "b2b-saas-enterprise-pro", "booking-appointment-pro", "medical-wellness-clinic-pro"].forEach(add);
  } else if (/clinic|medical|wellness|dental/.test(selectedText)) {
    ["medical-wellness-clinic-pro", "booking-appointment-pro", "local-services-pro-plus", "corporate-company-pro", "lead-funnel-pro"].forEach(add);
  } else if (/single_vendor_dense|retail|dense|mega/.test(selectedText)) {
    ["mega-retail-store", "mega-marketplace", "listing-marketplace-pro", "fashion-drop-pro", "digital-products-store"].forEach(add);
  } else if (/listing|classified|real_estate|real-estate/.test(selectedText)) {
    ["listing-marketplace-pro", "real-estate-listings-pro", "mega-marketplace", "mega-retail-store", "corporate-company-pro"].forEach(add);
  } else if (/restaurant|menu|food/.test(selectedText)) {
    ["restaurant-food-business", "booking-appointment-pro", "lead-funnel-pro", "home-services-premium", "local-services-pro-plus"].forEach(add);
  } else if (/booking|appointment/.test(selectedText)) {
    ["booking-appointment-pro", "local-services-pro-plus", "home-services-premium", "lead-funnel-pro", "corporate-company-pro"].forEach(add);
  } else if (/industrial|manufacturing|supplier/.test(selectedText)) {
    ["manufacturing-industrial-supplier-pro", "b2b-saas-enterprise-pro", "corporate-company-pro", "lead-funnel-pro", "mega-retail-store"].forEach(add);
  } else if (/b2b|saas|enterprise|solution/.test(selectedText)) {
    ["b2b-saas-enterprise-pro", "corporate-company-pro", "lead-funnel-pro", "manufacturing-industrial-supplier-pro", "premium-product-store"].forEach(add);
  } else if (/fashion|lookbook|collection/.test(selectedText)) {
    ["fashion-drop-pro", "luxury-high-ticket-pro", "premium-product-store", "mega-retail-store", "listing-marketplace-pro"].forEach(add);
  } else {
    rankedFallbackChoices(selectedTemplateId).forEach((choice) => add(choice.templateId));
  }

  TEMPLATE_PREVIEW_CHOICES.forEach((choice) => {
    if (ordered.length < 5) add(choice.templateId);
  });
  TEMPLATE_PREVIEW_CHOICES.forEach((choice) => {
    if (ordered.length < 5) add(choice.templateId, { allowDuplicateImage: true });
  });
  return ordered;
}

function shouldShowSelectedTemplatePreview() {
  return Boolean(
    isPublicClientSetup &&
    !builderState.currentSchema &&
    builderState.forcedTemplateSelection?.intent === "client_visual_template_choice" &&
    templatePreviewMeta(builderState.forcedTemplateSelection.templateId)
  );
}

function renderSelectedTemplateCanvasPreview(card) {
  card.classList.add("selected-template-card-host");
  const choice = templatePreviewMeta(builderState.forcedTemplateSelection.templateId);
  card.innerHTML = `
    <section class="selected-template-preview canvas-fade-in">
      <div class="selected-template-preview-copy">
        <span>${escapeHtml(langText({ en: "Selected architecture", es: "Arquitectura seleccionada", fr: "Architecture selectionnee", pt: "Arquitetura selecionada" }))}</span>
        <h2>${escapeHtml(localizedTemplateName(choice))}</h2>
        <p>${escapeHtml(langText({
          en: "This is the real template base. LYRA will now adapt it to the business copy, colors, catalog and conversion flow.",
          es: "Esta es la base real del template. LYRA ahora la adaptara al negocio, textos, colores, catalogo y flujo de conversion.",
          fr: "C'est la vraie base du template. LYRA l'adaptera au business, textes, couleurs, catalogue et conversion.",
          pt: "Esta e a base real do template. A LYRA vai adapta-la ao negocio, textos, cores, catalogo e conversao.",
        }))}</p>
      </div>
      <div class="selected-template-preview-frame">
        <img src="${escapeAttribute(choice.image)}" alt="${escapeAttribute(localizedTemplateName(choice))}">
      </div>
      <div class="selected-template-preview-actions">
        <button type="button" data-change-template>${escapeHtml(langText({ en: "Choose another base", es: "Elegir otra base", fr: "Choisir une autre base", pt: "Escolher outra base" }))}</button>
        <button type="button" data-chat-generate>${escapeHtml(langText({ en: "Generate editable site", es: "Generar sitio editable", fr: "Generer le site modifiable", pt: "Gerar site editavel" }))}</button>
      </div>
    </section>
  `;
  card.querySelector("[data-change-template]")?.addEventListener("click", () => {
    builderState.forcedTemplateSelection = {
      ...builderState.forcedTemplateSelection,
      intent: "ai_studio_plan",
    };
    renderLiveSitePreview();
  });
  card.querySelector("[data-chat-generate]")?.addEventListener("click", handleGuidedGenerateButton);
}

function hasEnoughContextForTemplatePreview() {
  const intent = normalizeTemplateIntentText(builderState.guidedState.websiteIntent);
  const description = normalizeTemplateIntentText(builderState.guidedState.businessDescription);
  const offerItems = meaningfulOfferItems(builderState.guidedState.servicesProducts);
  const services = offerItems.join(" ");
  const commerceSignal = normalizeTemplateIntentText(`${intent} ${description} ${services}`);
  const hasIntent = /tienda|store|shop|marketplace|catalogo|servicio|service|reserva|booking|restaurante|restaurant|pagina|website|landing|amazon|ebay|abogado|abogados|legal|lawyer|bufet|firma|consultoria|consulting|clinica|clinic|empresa|company/.test(commerceSignal);
  const hasConcreteOffer = offerItems.length >= 2
    || description.length >= 45
    || commerceSignal.split(/\s+/).length >= 16
    || /abogado|abogados|legal|lawyer|bufet|firma|consultoria|consulting|clinica|clinic|servicio|service/.test(commerceSignal)
    || textSuggestsBroadMarketplace(commerceSignal)
    || textSuggestsFocusedProductLine(commerceSignal);
  return Boolean(hasIntent && hasConcreteOffer);
}

function meaningfulOfferItems(value) {
  return arrayValue(value)
    .map((item) => cleanExtractedPhrase(item, 70))
    .filter((item) => item && !isGenericCommerceIntent(item) && !isWeakOfferItem(item));
}

function isWeakOfferItem(value) {
  const text = normalizeTemplateIntentText(value);
  if (!text) return true;
  if (/^(online|internet|web|ecommerce|e-commerce|venta|ventas|sell|selling|products?|productos?|services?|servicios?|catalogo|catalog|marketplace)$/i.test(text)) return true;
  return /^(aceptar|recibir|tomar|hacer|gestionar)?\s*(pedidos?|orders?|ordenes|online orders)$/i.test(text)
    || /^(vender|venta|ventas)\s*(online|en linea)?$/i.test(text);
}



function livePreviewTemplateSelection() {
  const profile = livePreviewTemplateProfile();
  const meta = templatePreviewMeta(profile.templateId) || templatePreviewMeta("mega-retail-store");
  const forcedMatchesProfile = builderState.forcedTemplateSelection?.templateId === profile.templateId;
  return {
    templateId: meta?.templateId || profile.templateId || "mega-retail-store",
    template: forcedMatchesProfile && builderState.forcedTemplateSelection?.template
      ? builderState.forcedTemplateSelection.template
      : { id: meta?.templateId || profile.templateId || "mega-retail-store", name: localizedTemplateName(meta), catalogModel: { catalogType: meta?.catalogType || profile.catalogType || "single_vendor_dense_catalog" } },
    intent: forcedMatchesProfile ? builderState.forcedTemplateSelection?.intent || "live_preview_template" : "live_preview_template",
    catalogType: meta?.catalogType || profile.catalogType || "single_vendor_dense_catalog",
    reason: "Live preview selected from guided context",
  };
}



function livePreviewTemplateProfile() {
  const templateId = inferLivePreviewTemplateId();
  const meta = templatePreviewMeta(templateId) || templatePreviewMeta("mega-retail-store");
  const catalogType = builderState.forcedTemplateSelection?.templateId === templateId
    ? builderState.forcedTemplateSelection?.catalogType || meta?.catalogType || ""
    : meta?.catalogType || "";
  const common = {
    templateId,
    label: localizedTemplateName(meta),
    image: meta?.image || "/templates-preview/screenshots/premium.png",
    itemLabels: [
      langText({ en: "Offer", es: "Oferta", fr: "Offre", pt: "Oferta" }),
      langText({ en: "Featured", es: "Destacado", fr: "Phare", pt: "Destaque" }),
      langText({ en: "CTA", es: "Accion", fr: "Action", pt: "Acao" }),
    ],
    sectionKicker: langText({ en: "Page structure", es: "Estructura de pagina", fr: "Structure de page", pt: "Estrutura da pagina" }),
    sectionTitle: langText({ en: "Editable sections ready for this business", es: "Secciones editables listas para este negocio", fr: "Sections modifiables pour cette entreprise", pt: "Secoes editaveis para este negocio" }),
  };
  if (/mega-retail-store/.test(templateId) || /single_vendor_dense|dense_retail|retail/.test(catalogType)) {
    return {
      ...common,
      kind: "retail",
      kicker: langText({ en: "Search-first retail store", es: "Tienda retail con busqueda", fr: "Boutique retail avec recherche", pt: "Loja retail com busca" }),
      cta: langText({ en: "Shop catalog", es: "Ver catalogo", fr: "Voir catalogue", pt: "Ver catalogo" }),
      sectionKicker: langText({ en: "Retail catalog structure", es: "Estructura de catalogo retail", fr: "Structure catalogue retail", pt: "Estrutura de catalogo retail" }),
      sectionTitle: langText({ en: "Categories, offers and owned product discovery", es: "Categorias, ofertas y productos propios", fr: "Categories, offres et produits propres", pt: "Categorias, ofertas e produtos proprios" }),
      itemLabels: [
        langText({ en: "Category", es: "Categoria", fr: "Categorie", pt: "Categoria" }),
        langText({ en: "Deal", es: "Oferta", fr: "Offre", pt: "Oferta" }),
        langText({ en: "Product", es: "Producto", fr: "Produit", pt: "Produto" }),
      ],
    };
  }
  if (/mega-marketplace|marketplace-style/.test(templateId) || /dense_marketplace/.test(catalogType)) {
    return {
      ...common,
      kind: "marketplace",
      kicker: langText({ en: "Search-first catalog", es: "Catalogo con busqueda", fr: "Catalogue avec recherche", pt: "Catalogo com busca" }),
      cta: langText({ en: "Shop deals", es: "Ver ofertas", fr: "Voir offres", pt: "Ver ofertas" }),
      sectionKicker: langText({ en: "Catalog structure", es: "Estructura del catalogo", fr: "Structure catalogue", pt: "Estrutura do catalogo" }),
      sectionTitle: langText({ en: "Categories, offers and product discovery", es: "Categorias, ofertas y descubrimiento de productos", fr: "Categories, offres et decouverte produit", pt: "Categorias, ofertas e descoberta de produtos" }),
      itemLabels: [
        langText({ en: "Category", es: "Categoria", fr: "Categorie", pt: "Categoria" }),
        langText({ en: "Deal", es: "Oferta", fr: "Offre", pt: "Oferta" }),
        langText({ en: "Product", es: "Producto", fr: "Produit", pt: "Produto" }),
      ],
    };
  }
  if (/listing|real-estate/.test(templateId) || /listing|classified|real_estate/.test(catalogType)) {
    return {
      ...common,
      kind: "listings",
      kicker: langText({ en: "Seller listings", es: "Listados de vendedores", fr: "Annonces vendeurs", pt: "Anuncios de vendedores" }),
      cta: langText({ en: "Compare listings", es: "Comparar listados", fr: "Comparer", pt: "Comparar" }),
      sectionKicker: langText({ en: "Listing flow", es: "Flujo de listados", fr: "Flux annonces", pt: "Fluxo de anuncios" }),
      sectionTitle: langText({ en: "Seller trust, filters and comparison", es: "Confianza, filtros y comparacion", fr: "Confiance, filtres et comparaison", pt: "Confianca, filtros e comparacao" }),
      itemLabels: [
        langText({ en: "Listing", es: "Listado", fr: "Annonce", pt: "Anuncio" }),
        langText({ en: "Condition", es: "Condicion", fr: "Etat", pt: "Condicao" }),
        langText({ en: "Seller", es: "Vendedor", fr: "Vendeur", pt: "Vendedor" }),
      ],
    };
  }
  if (/fashion/.test(templateId) || /lookbook|collection/.test(catalogType)) {
    return {
      ...common,
      kind: "fashion",
      kicker: langText({ en: "Editorial collection", es: "Coleccion editorial", fr: "Collection editoriale", pt: "Colecao editorial" }),
      cta: langText({ en: "Explore drop", es: "Ver coleccion", fr: "Voir collection", pt: "Ver colecao" }),
      sectionKicker: langText({ en: "Collection story", es: "Historia de coleccion", fr: "Histoire collection", pt: "Historia da colecao" }),
      sectionTitle: langText({ en: "Drops, looks and visual product cards", es: "Drops, looks y productos visuales", fr: "Drops, looks et fiches visuelles", pt: "Drops, looks e cards visuais" }),
      itemLabels: [
        langText({ en: "Collection", es: "Coleccion", fr: "Collection", pt: "Colecao" }),
        langText({ en: "Look", es: "Look", fr: "Look", pt: "Look" }),
        langText({ en: "Drop", es: "Drop", fr: "Drop", pt: "Drop" }),
      ],
    };
  }
  if (/restaurant/.test(templateId) || /restaurant|menu|food/.test(catalogType)) {
    return {
      ...common,
      kind: "restaurant",
      kicker: langText({ en: "Menu and ordering", es: "Menu y pedidos", fr: "Menu et commande", pt: "Menu e pedidos" }),
      cta: langText({ en: "View menu", es: "Ver menu", fr: "Voir menu", pt: "Ver menu" }),
      sectionKicker: langText({ en: "Menu system", es: "Sistema de menu", fr: "Systeme menu", pt: "Sistema de menu" }),
      sectionTitle: langText({ en: "Signature dishes, specials and ordering", es: "Platos, especiales y pedidos", fr: "Plats, specials et commande", pt: "Pratos, especiais e pedidos" }),
      itemLabels: [
        langText({ en: "Dish", es: "Plato", fr: "Plat", pt: "Prato" }),
        langText({ en: "Special", es: "Especial", fr: "Special", pt: "Especial" }),
        langText({ en: "Order", es: "Pedido", fr: "Commande", pt: "Pedido" }),
      ],
    };
  }
  if (/booking|services|clinic|legal|corporate|lead-funnel|local/.test(templateId) || /service|booking|lead|company|legal|medical/.test(catalogType)) {
    return {
      ...common,
      kind: "service",
      kicker: langText({ en: "Trust and conversion", es: "Confianza y conversion", fr: "Confiance et conversion", pt: "Confianca e conversao" }),
      cta: langText({ en: "Request quote", es: "Solicitar cotizacion", fr: "Demander devis", pt: "Pedir orcamento" }),
      sectionKicker: langText({ en: "Service path", es: "Ruta del servicio", fr: "Parcours service", pt: "Caminho do servico" }),
      sectionTitle: langText({ en: "Proof, process and fast contact", es: "Prueba, proceso y contacto rapido", fr: "Preuves, processus et contact", pt: "Prova, processo e contato rapido" }),
      itemLabels: [
        langText({ en: "Service", es: "Servicio", fr: "Service", pt: "Servico" }),
        langText({ en: "Proof", es: "Prueba", fr: "Preuve", pt: "Prova" }),
        langText({ en: "Process", es: "Proceso", fr: "Processus", pt: "Processo" }),
      ],
    };
  }
  return {
    ...common,
    kind: "premium",
    kicker: langText({ en: "Premium showcase", es: "Presentacion premium", fr: "Presentation premium", pt: "Apresentacao premium" }),
    cta: langText({ en: "Explore product", es: "Ver producto", fr: "Voir produit", pt: "Ver produto" }),
    sectionKicker: langText({ en: "Product story", es: "Historia del producto", fr: "Histoire produit", pt: "Historia do produto" }),
    sectionTitle: langText({ en: "Hero, story and feature highlights", es: "Hero, historia y detalles clave", fr: "Hero, histoire et points forts", pt: "Hero, historia e destaques" }),
  };
}

function inferLivePreviewTemplateId() {
  const text = guidedTemplateContextText();
  const inferred = inferTemplateIdFromText(text);
  if (inferred) return inferred;
  const aiSelectedTemplateId = resolvedAiTemplateId();
  if (aiSelectedTemplateId) return aiSelectedTemplateId;
  if (builderState.forcedTemplateSelection?.templateId) return builderState.forcedTemplateSelection.templateId;
  return "mega-retail-store";
}

function resolvedAiTemplateId() {
  if (
    builderState.forcedTemplateSelection?.intent === "client_visual_template_choice"
    && isConcreteTemplateId(builderState.forcedTemplateSelection.templateId)
  ) {
    return builderState.forcedTemplateSelection.templateId;
  }
  const candidates = [
    builderState.guidedState.designStrategy?.selectedTemplateId,
    builderState.guidedState.designStrategy?.diagnosis?.recommendedTemplateId,
    builderState.guidedState.sitePlan?.templateId,
    builderState.forcedTemplateSelection?.templateId,
  ];
  return candidates.find((templateId) => isConcreteTemplateId(templateId)) || "";
}

function isConcreteTemplateId(templateId) {
  const value = String(templateId || "").trim();
  return Boolean(value && !/^default_|pending|unknown|collecting|provisional/i.test(value));
}

function guidedTemplateContextText(extra = "") {
  return [
    builderState.guidedState.websiteIntent,
    builderState.guidedState.businessName,
    builderState.guidedState.industry,
    builderState.guidedState.businessDescription,
    arrayValue(builderState.guidedState.servicesProducts).join(" "),
    builderState.guidedState.targetAudience,
    builderState.guidedState.preferredTone,
    arrayValue(builderState.guidedState.preferredColors).join(" "),
    builderState.guidedState.salesMode,
    extra,
  ].join(" ").toLowerCase();
}

function normalizeTemplateIntentText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function textSuggestsBroadMarketplace(value) {
  const text = normalizeTemplateIntentText(value);
  const explicitBroad = /\b(amazon|tipo amazon|como amazon|mega tienda|mega store|mega marketplace|marketplace tipo amazon|marketplace estilo amazon)\b/.test(text);
  const explicitMarketplace = /\b(marketplace|market place|mercado online|multi vendedor|multi-vendedor|multi seller|multiseller)\b/.test(text)
    && !/\b(tipo ebay|como ebay|ebay|clasificados|classifieds|listados|listings|segunda mano|usado|used)\b/.test(text);
  const crossCategoryBroad = /(ropa|accesorios).*(carros|autos|juguetes|anime|gadgets)/.test(text)
    || /(carros|autos|juguetes|anime|gadgets).*(ropa|accesorios)/.test(text);
  const broadCatalog = /\b(de todo|todo tipo|variedad|variado|variados|productos variados|catalogo grande|catalogo variado|muchos productos|muchas categorias|multi categoria|cosas raras|cosas inusuales|inusual|unusual|nada comun|poco comun|dificil de encontrar|curiosidades|gadgets|anime|juguetes)\b/.test(text)
    || crossCategoryBroad;
  if (explicitBroad || explicitMarketplace) return true;
  if (textSuggestsFocusedCommerceStore(text) && !crossCategoryBroad) return false;
  return broadCatalog;
}

function textSuggestsMultiVendorMarketplace(value) {
  const text = normalizeTemplateIntentText(value);
  return /\b(multi vendedor|multi-vendedor|multi seller|multiseller|vendedores externos|external sellers|third party sellers|otros vendedores|que otros vendan|plataforma para vendedores|seller onboarding|vendor onboarding|vendor payout|payouts|comisiones a vendedores|marketplace multi vendor|marketplace multi-vendedor|varios vendedores independientes)\b/.test(text);
}

function textSuggestsMegaRetailStore(value) {
  const text = normalizeTemplateIntentText(value);
  if (!text || textSuggestsMultiVendorMarketplace(text)) return false;
  const explicitRetail = /\b(tipo amazon|como amazon|amazon|mega tienda|mega store|tienda grande|catalogo grande|catalogo variado|productos variados|muchos productos|muchas categorias|de todo|todo tipo|inventario propio|mi tienda|mis productos|yo vendo|voy a vender|una sola tienda|un solo vendedor|single vendor|owned inventory)\b/.test(text);
  return explicitRetail || textSuggestsBroadMarketplace(text);
}

function textSuggestsJewelryAccessoryStore(value) {
  const text = normalizeTemplateIntentText(value);
  const automotiveAccessory = /\b(accesorios? (para|de) (carros|autos|automotriz|automotrices|camionetas|motos|4x4)|auto accessories|car accessories)\b/.test(text);
  if (automotiveAccessory) return false;
  // NOTE: bare "artesanal"/"hecho a mano" (handmade, with no jewelry-specific
  // word nearby) is intentionally excluded — it's a generic craft signal shared
  // by many product types (soap, candles, pottery, jewelry), not a jewelry
  // indicator on its own. See textSuggestsHandmadeCraftGoods.
  return /\b(bisuteria|bijouterie|joyeria|jewelry|jewellery|accesorios hechos a mano|accesorios artesanales|collar|collares|necklace|necklaces|pulsera|pulseras|bracelet|bracelets|arete|aretes|zarcillo|zarcillos|earring|earrings|anillo|anillos|rings?|cadena|cadenas|dije|dijes|charm|charms|handmade accessories|handmade jewelry)\b/.test(text)
    || (/\baccesorios?\b/.test(text) && /\b(moda|fashion|boutique|bisuteria|joyeria|collar|pulsera|arete|anillo)\b/.test(text));
}

function textSuggestsHandmadeCraftGoods(value) {
  const text = normalizeTemplateIntentText(value);
  return /\b(artesanal|artesanales|artesania|artesanía|hecho a mano|hechos a mano|handmade|jabon|jabones|soap|bath bomb|bath bombs|bomba de bano|bombas de bano|velas|candles|manualidades|crafts)\b/.test(text);
}

function textSuggestsProfessionalService(value) {
  const text = normalizeTemplateIntentText(value);
  return /\b(abogado|abogados|bufete|lawyer|law firm|legal|contador|accountant|tax|taxes|impuestos|consulting|consultoria|consultoría|seguros|insurance|asesor|advisor|financiero|compliance|firma profesional|inmigracion|inmigración|contratos|defensa civil)\b/.test(text);
}

function textSuggestsFocusedCommerceStore(value) {
  const text = normalizeTemplateIntentText(value);
  if (!text) return false;
  return textSuggestsJewelryAccessoryStore(text)
    || /\b(ropa|fashion|moda|boutique|streetwear|zapato|sneaker|apparel|clothing|beauty|belleza|skincare|cosmeticos|cosméticos|velas|candles|decoracion|decoración|ceramica|cerámica|arte hecho a mano|manualidades|crafts|productos artesanales|artesania|artesanía|coleccion propia|coleccion de|colección de)\b/.test(text);
}

function textSuggestsBeautyCommerceStore(value) {
  const text = normalizeTemplateIntentText(value);
  if (!text || textSuggestsBroadMarketplace(text) || textSuggestsMultiVendorMarketplace(text)) return false;
  const beautyProduct = /\b(jabones?|soap|velas?|candles?|bath|bano|baño|bath bombs?|bombas de bano|bombas de baño|body care|cuidado personal|skincare|cosmeticos|cosméticos|spa products|productos de spa)\b/.test(text);
  const commerceIntent = /\b(vender|venta|ventas|tienda|store|shop|catalogo|catálogo|productos|online|ecommerce|e-commerce|checkout|carrito)\b/.test(text);
  return beautyProduct && commerceIntent;
}

function textSuggestsFocusedProductLine(value) {
  const text = normalizeTemplateIntentText(value);
  const vehicleProductLine = /\b(pickup|camioneta|camionetas)\b/.test(text)
    && /\b(truck|camioneta|camionetas|4x4|off road|automotriz|automotive|vehiculo|autos?|carros?)\b/.test(text);
  return (/\b(linea de|linea para|product line|same niche|mismo nicho|mismo tipo|una categoria|varios modelos|modelos para|parachoques|bumper|4x4|off road)\b/.test(text)
    || vehicleProductLine)
    && !textSuggestsBroadMarketplace(text);
}

function textSuggestsSingleProductShowcase(value) {
  const text = normalizeTemplateIntentText(value);
  return /\b(un solo producto|solo un producto|producto unico|producto estrella|flagship|single product|one product|producto premium|showcase|presentacion premium|portafolio|portfolio)\b/.test(text)
    && !textSuggestsBroadMarketplace(text);
}

function textSuggestsPremiumProductPreference(value) {
  const text = normalizeTemplateIntentText(value);
  if (!text || textSuggestsBroadMarketplace(text)) return false;
  return textSuggestsSingleProductShowcase(text)
    || textSuggestsFocusedProductLine(text)
    || /\b(linea de|coleccion de|producto especializado|producto de nicho|flagship|single product|one product|limited collection|curated collection)\b/.test(text);
}

function templateIntentScorecard(value, payload = {}) {
  const text = normalizeTemplateIntentText([
    value,
    payload.business_name,
    payload.business_description,
    payload.industry,
    arrayValue(payload.services_products).join(" "),
    payload.target_audience,
    payload.preferred_tone,
    arrayValue(payload.preferred_colors).join(" "),
    payload.salesMode || builderState.guidedState.salesMode,
  ].join(" "));
  const products = meaningfulOfferItems(payload.services_products || []);
  if (!text) return [];
  const scoreFor = (templateId, score, reason) => ({ templateId, score, reason });
  const scores = [];
  const has = (pattern) => pattern.test(text);

  if (textSuggestsMultiVendorMarketplace(text)) scores.push(scoreFor("mega-marketplace", 145, "explicit multi-vendor marketplace reference"));
  if (textSuggestsMegaRetailStore(text)) scores.push(scoreFor("mega-retail-store", 140, "large single-owner retail catalog"));
  if (textSuggestsProfessionalService(text)) scores.push(scoreFor("legal-professional-services-pro", 135, "professional services trust flow"));
  if (textSuggestsBeautyCommerceStore(text)) {
    scores.push(textSuggestsHandmadeCraftGoods(text)
      ? scoreFor("premium-product-store", 122, "handmade beauty/home-craft boutique (soap, candles, bath goods)")
      : scoreFor("mega-retail-store", 122, "beauty and personal-care retail catalog"));
  }
  if (textSuggestsBroadMarketplace(text) && !textSuggestsMultiVendorMarketplace(text)) scores.push(scoreFor("mega-retail-store", 105, "broad owned catalog"));
  if (textSuggestsBroadMarketplace(text) && textSuggestsMultiVendorMarketplace(text)) scores.push(scoreFor("mega-marketplace", 105, "broad multi-vendor catalog"));
  if (products.length >= 10 && !textSuggestsFocusedCommerceStore(text) && !textSuggestsProfessionalService(text) && !has(/\b(restaurante|restaurant|menu|comida|food|cafe|cafeteria|barber|barberia|salon|spa|clinica|clinic|servicio|service|contractor|curso|course)\b/)) {
    scores.push(scoreFor(textSuggestsMultiVendorMarketplace(text) ? "mega-marketplace" : "mega-retail-store", 55, "many independent product categories"));
  }

  if (has(/\b(tipo ebay|como ebay|clasificados|classifieds|listados|listings|vendedores|seller|usado|used|segunda mano)\b/)) scores.push(scoreFor("listing-marketplace-pro", 120, "seller/listing marketplace"));
  if (has(/\b(real estate|bienes raices|bienes raices|inmuebles|propiedades|casas|apartamentos|alquiler|renta|rentals|zillow|realtor|mls|autotrader|auto trader|vehiculos|vehiculos usados|carros usados)\b/)) scores.push(scoreFor("real-estate-listings-pro", 126, "searchable listing business"));
  if (has(/\b(restaurante|restaurant|food truck|cafeteria|cafeteria|catering|menu|menu|comida|pizza|tacos|bakery|panaderia|bar|delivery de comida|pickup de comida|ordenar comida|pedir comida|pedido de comida)\b/)) scores.push(scoreFor("restaurant-food-business", 125, "restaurant/menu flow"));
  if (has(/\b(barber|barberia|barberia|barbershop|salon|spa|citas|reservas|appointments|booking|agenda|agendar|calendar|calendario)\b/)) scores.push(scoreFor("booking-appointment-pro", 120, "appointment booking flow"));
  if (has(/\b(clinica|clinica|clinic|med spa|medical spa|spa medico|estetica|estetica|aesthetic|dental|dentist|doctor|wellness|salud|health|therapy|terapia|nutricion|laser|botox|facial|skincare|dermatology|fisio|physio|chiropractor|consulta medica)\b/)) scores.push(scoreFor("medical-wellness-clinic-pro", 118, "clinic/wellness trust flow"));
  if (has(/\b(abogado|lawyer|legal|law firm|contador|accountant|tax|taxes|impuestos|consulting|consultoria|seguros|insurance|asesor|advisor|financiero|compliance|firma profesional)\b/)) scores.push(scoreFor("legal-professional-services-pro", 115, "professional services trust flow"));
  if (has(/\b(b2b saas|saas|enterprise|software empresarial|automatizacion|automation|platform|plataforma|dashboard|crm|erp|integraciones|api|managed services|it services|business systems|request demo|demo|workflow)\b/)) scores.push(scoreFor("b2b-saas-enterprise-pro", 115, "B2B software/enterprise flow"));
  if (has(/\b(manufacturing|manufacturer|industrial|industrial supplier|fabrica|fabricante|manufactura|maquinaria|machinery|repuestos industriales|parts supplier|tools supplier|herramientas industriales|safety equipment|bulk order|b2b procurement|rfq|proveedor industrial|suministros industriales)\b/)) scores.push(scoreFor("manufacturing-industrial-supplier-pro", 114, "industrial supplier flow"));
  if (has(/\b(curso|cursos|course|courses|academy|academia|escuela online|bootcamp|training|formacion|clases|classes|lessons|masterclass|workshop|taller|coaching program|certificacion)\b/)) scores.push(scoreFor("education-course-academy-pro", 112, "course/academy flow"));
  if (has(/\b(digital|ebook|e-book|templates|plantillas|descarga|download|pdf|pack|membresia|membership|digital products|productos digitales)\b/)) scores.push(scoreFor("digital-products-store", 105, "digital product flow"));
  if (has(/\b(contratista|contractor|construccion|construction|limpieza|cleaning|plomeria|plumbing|electricista|electrician|hvac|aire acondicionado|mechanic|mecanico|landscaping|seguridad|security|servicio local|local service|reparacion|repair|presupuesto|cotizacion|quote|emergencia)\b/)) scores.push(scoreFor("home-services-premium", 108, "local service quote flow"));
  if (textSuggestsJewelryAccessoryStore(text) && !textSuggestsBroadMarketplace(text)) scores.push(scoreFor("fashion-drop-pro", 118, "focused jewelry/accessory boutique"));
  if (has(/\b(ropa|fashion|moda|boutique|streetwear|zapato|sneaker|apparel|clothing|drop|lookbook)\b/) && !textSuggestsBroadMarketplace(text)) scores.push(scoreFor("fashion-drop-pro", 104, "fashion/lookbook commerce"));
  if (has(/\b(lujo|luxury|high ticket|alta gama|exclusivo|joyeria|joyería|jewelry|jewellery|perfumes|fragancia|relojes|watches|cuero|arte|coleccionable|private appointment|cita privada|precio a consultar)\b/)) scores.push(scoreFor("luxury-high-ticket-pro", 110, "luxury/high-ticket showroom"));
  if (textSuggestsFocusedProductLine(text) || textSuggestsSingleProductShowcase(text) || textSuggestsPremiumProductPreference(text)) scores.push(scoreFor("premium-product-store", 108, "focused product line"));
  if (has(/\b(landing|landing page|funnel|embudo|captar clientes|captar leads|leads|campana|campaign|oferta|offer|book call|agenda una llamada|alta conversion)\b/)) scores.push(scoreFor("lead-funnel-pro", 95, "lead capture funnel"));
  if (has(/\b(empresa|company|corporate|corporativo|pagina web|website|agencia|agency|firma|business website|organizacion|organization)\b/)) scores.push(scoreFor("corporate-company-pro", 90, "company website"));

  return scores
    .filter((item) => item.score > 0 && templatePreviewMeta(item.templateId))
    .sort((a, b) => b.score - a.score);
}

function bestTemplateIdFromContext(value, payload = {}) {
  return templateIntentScorecard(value, payload)[0]?.templateId || "";
}

function isGenericCommerceIntent(value) {
  const text = normalizeTemplateIntentText(value);
  if (!text || textSuggestsBroadMarketplace(text) || textSuggestsFocusedProductLine(text) || textSuggestsSingleProductShowcase(text)) return false;
  const generic = /^(sell products online|vender productos online|venta online|ventas online|online sales|online store|tienda online|tienda|store|shop|ecommerce|e-commerce|catalogo|catalog|marketplace|vender|comprar online)$/;
  return generic.test(text) || (text.split(/\s+/).length <= 5 && /\b(vender|venta|online|store|shop|tienda|ecommerce|catalogo|catalog|marketplace)\b/.test(text));
}

function inferTemplateIdFromText(value) {
  const text = normalizeTemplateIntentText(value);
  if (!text) return "";
  const scoredTemplateId = bestTemplateIdFromContext(text);
  if (scoredTemplateId) return scoredTemplateId;
  if (textSuggestsMultiVendorMarketplace(text)) return "mega-marketplace";
  if (textSuggestsBeautyCommerceStore(text)) return textSuggestsHandmadeCraftGoods(text) ? "premium-product-store" : "mega-retail-store";
  if (textSuggestsMegaRetailStore(text) || textSuggestsBroadMarketplace(text)) return "mega-retail-store";
  if (textSuggestsFocusedProductLine(text)) return "premium-product-store";
  if (/tipo ebay|como ebay|clasificados|listados|vendedores|usado|seller|listing/.test(text)) return "listing-marketplace-pro";
  if (/restaurante|restaurant|menu|comida|food|cafe|cafeteria|delivery de comida|ordenar comida|pedir comida|pedido de comida/.test(text)) return "restaurant-food-business";
  if (/barber|barberia|salon|spa|cita|booking|reserva|appointment/.test(text)) return "booking-appointment-pro";
  if (/abogado|legal|lawyer|contador|tax|impuestos|consultoria|consulting|seguros|asesor/.test(text)) return "legal-professional-services-pro";
  if (/clinica|clinic|med spa|wellness|dental|doctor|estetica|salud|therapy|skincare/.test(text)) return "medical-wellness-clinic-pro";
  if (/saas|software|enterprise|automatizacion|platform|plataforma|dashboard|crm|erp|integraciones|api/.test(text)) return "b2b-saas-enterprise-pro";
  if (/industrial|manufactur|fabrica|maquinaria|repuestos|proveedor industrial|suministros/.test(text)) return "manufacturing-industrial-supplier-pro";
  if (/curso|course|academy|academia|bootcamp|training|clases|masterclass|workshop/.test(text)) return "education-course-academy-pro";
  if (/digital|ebook|templates|plantillas|descarga|download|membresia|membership/.test(text)) return "digital-products-store";
  if (/servicio|service|contractor|limpieza|roofing|repair|reparacion|cotizacion|quote/.test(text)) return "local-services-pro-plus";
  if (textSuggestsJewelryAccessoryStore(text) || /ropa|fashion|moda|boutique|streetwear|zapato|sneaker|accesorio/.test(text)) return "fashion-drop-pro";
  if (/lujo|luxury|alta gama|exclusivo|joyeria|relojes|arte|coleccionable/.test(text)) return "luxury-high-ticket-pro";
  if (textSuggestsPremiumProductPreference(text)) return "premium-product-store";
  if (/empresa|company|corporate|corporativo|pagina web|website|agencia|firma/.test(text)) return "corporate-company-pro";
  return "";
}

function syncTemplateSelectionFromGuidedContext(extra = "") {
  const text = guidedTemplateContextText(extra);
  const inferredTemplateId = inferTemplateIdFromText(text);
  if (!inferredTemplateId || builderState.forcedTemplateSelection?.templateId === inferredTemplateId) return;
  const shouldOverride = !builderState.forcedTemplateSelection?.templateId
    || textSuggestsBroadMarketplace(text)
    || textSuggestsFocusedProductLine(text)
    || textSuggestsSingleProductShowcase(text)
    || builderState.forcedTemplateSelection.intent === "default_minimal"
    || builderState.forcedTemplateSelection.intent === "provisional_needs_catalog_context"
    || builderState.forcedTemplateSelection.intent === "guided_context_template";
  if (!shouldOverride) return;
  const meta = templatePreviewMeta(inferredTemplateId);
  builderState.forcedTemplateSelection = {
    templateId: inferredTemplateId,
    template: builderState.forcedTemplateSelection?.templateId === inferredTemplateId ? builderState.forcedTemplateSelection.template : null,
    catalogType: meta?.catalogType || "",
    intent: "guided_context_template",
    reason: "Updated from the full guided intake context",
  };
  builderState.guidedState.sitePlan = null;
  builderState.guidedState.sitePlanApproved = false;
}



function publicProductFocus(items = [], fallback = "") {
  const cleanItems = arrayValue(items)
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 2);
  if (cleanItems.length) {
    const joiner = builderState.selectedLanguage === "en" ? " and " : builderState.selectedLanguage === "fr" ? " et " : " y ";
    return cleanItems.join(joiner);
  }
  return fallback || langText({
    en: "the right products and services",
    es: "los productos y servicios correctos",
    fr: "les bons produits et services",
    pt: "os produtos e servicos certos",
  });
}





function livePreviewTemplateModules(profile, items) {
  const safeItems = items.length ? items : livePreviewFallbackItems();
  if (profile.kind === "marketplace") {
    return `
      <section class="live-page-search"><span>${escapeHtml(langText({ en: "Search products, categories, brands", es: "Buscar productos, categorias, marcas", fr: "Rechercher produits, categories, marques", pt: "Buscar produtos, categorias, marcas" }))}</span><b>${escapeHtml(langText({ en: "Deals", es: "Ofertas", fr: "Offres", pt: "Ofertas" }))}</b></section>
      <section class="live-page-rail">${safeItems.slice(0, 5).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</section>
    `;
  }
  if (profile.kind === "fashion") {
    return `<section class="live-page-lookbook">${safeItems.slice(0, 4).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</section>`;
  }
  if (profile.kind === "restaurant") {
    return `<section class="live-page-menu">${safeItems.slice(0, 4).map((item, index) => `<span><b>${escapeHtml(item)}</b><em>${escapeHtml(index % 2 ? "popular" : "signature")}</em></span>`).join("")}</section>`;
  }
  if (profile.kind === "service") {
    return `<section class="live-page-proof-row"><span>${escapeHtml(langText({ en: "Process", es: "Proceso", fr: "Processus", pt: "Processo" }))}</span><span>${escapeHtml(langText({ en: "Trust proof", es: "Prueba de confianza", fr: "Preuve de confiance", pt: "Prova de confianca" }))}</span><span>${escapeHtml(langText({ en: "Fast contact", es: "Contacto rapido", fr: "Contact rapide", pt: "Contato rapido" }))}</span></section>`;
  }
  return `<section class="live-page-premium-strip"><span>${escapeHtml(langText({ en: "Hero", es: "Hero", fr: "Hero", pt: "Hero" }))}</span><span>${escapeHtml(langText({ en: "Story", es: "Historia", fr: "Histoire", pt: "Historia" }))}</span><span>${escapeHtml(langText({ en: "Feature", es: "Detalle", fr: "Detail", pt: "Detalhe" }))}</span></section>`;
}





function applyI18n() {
  document.documentElement.lang = builderState.selectedLanguage;
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
  if (!builderState.builderAvatarAssistant) return;
  builderState.builderAvatarAssistant.labels = {
    idle: t("assistantSubtitle"),
    listening: langText({ en: "I'm listening to your idea.", es: "Estoy escuchando tu idea.", fr: "J'écoute votre idée.", pt: "Estou ouvindo sua ideia." }),
    thinking: t("thinking"),
    speaking: langText({ en: "Guiding you step by step.", es: "Te guio paso a paso.", fr: "Je vous guide étape par étape.", pt: "Vou guiar você passo a passo." }),
    happy: langText({ en: "Ready to help.", es: "Listo para ayudarte.", fr: "Prête à vous aider.", pt: "Pronta para ajudar." }),
    confused: langText({ en: "I need a little more context.", es: "Necesito un poco mas de contexto.", fr: "J'ai besoin d'un peu plus de contexte.", pt: "Preciso de um pouco mais de contexto." }),
    success: langText({ en: "Your draft is ready.", es: "Tu borrador esta listo.", fr: "Votre brouillon est prêt.", pt: "Seu rascunho está pronto." }),
  };
  builderState.builderAvatarAssistant.setState(builderAvatarManager?.getState() || "idle");
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





export function setAssistantState(state) {
  builderState.assistantState = normalizeAssistantState(state);
  document.body.dataset.assistantState = builderState.assistantState;
  builderAvatarManager?.setState(avatarStateFromAssistantState(builderState.assistantState), { source: "guided-assistant" });
  document.querySelectorAll(".assistant-avatar").forEach((avatar) => {
    avatar.dataset.state = builderState.assistantState;
    avatar.src = ASSISTANT_AVATARS[builderState.assistantState] || ASSISTANT_AVATAR_FALLBACK;
    avatar.onerror = () => {
      avatar.onerror = null;
      avatar.src = ASSISTANT_AVATAR_FALLBACK;
    };
  });
}













function languageToSpeechLocale(language) {
  return {
    en: "en-US",
    es: "es-US",
    fr: "fr-FR",
    pt: "pt-BR",
  }[language] || "en-US";
}























export function compactEmailLabel(email) {
  const text = String(email || "").trim();
  if (text.length <= 24) return text;
  const [name, domain] = text.split("@");
  if (!domain) return `${text.slice(0, 21)}...`;
  return `${name.slice(0, 10)}...@${domain}`;
}



export function storedClientAccessToken() {
  return localStorage.getItem("lumaClientAccessToken") || sessionStorage.getItem("lumaClientAccessToken") || "";
}







export function formatProjectUpdatedAt(value) {
  if (!value) return langText({ en: "No recent edits", es: "Sin ediciones recientes", fr: "Aucune édition récente", pt: "Sem edições recentes" });
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  try {
    return new Intl.DateTimeFormat(builderState.selectedLanguage || "en", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}























// Bug fix (2026-07-18): GUIDED_DRAFT_STORAGE_KEY ("lumaGuidedDraft") is a
// single browser-wide key, not scoped per account/email. Before this guard,
// createOrResumeClientIntakeSession() would happily send whatever stale
// builderState.guidedState was already in memory (business name, colors, catalog,
// builderState.selectedLanguage...) as the "draft" for a *different* email the moment
// someone signed in with another account on the same browser -- so the new
// account looked like it already "knew" the previous person's business, and
// its saved language silently overrode the language of the live
// conversation. See docs/AGENT_LOG.md for the full trace.
export function resetGuidedStateForNewAccount(options = {}) {
  const preserveAuth = Boolean(options.preserveAuth);
  builderState.guidedState = createEmptyGuidedState(builderState.selectedLanguage);
  builderState.currentSchema = null;
  builderState.currentRequestId = null;
  builderState.currentSiteId = null;
  builderState.currentBusinessId = null;
  builderState.currentGenerationId = null;
  builderState.currentCatalogItems = [];
  builderState.selectedPageKey = "home";
  builderState.selectedVariantId = "";
  builderState.forcedTemplateSelection = null;
  builderState.clientIntakeSession = null;
  builderState.restoredGuidedDraftInfo = null;
  builderState.restoredDraftNoticeShown = false;
  builderState.restoredDraftNoticeCard?.remove();
  builderState.restoredDraftNoticeCard = null;
  removeGuidedBuildStatusCard();
  builderState.guidedStep = "websiteIntent";
  try {
    localStorage.removeItem(GUIDED_DRAFT_STORAGE_KEY);
    localStorage.removeItem(GENERATED_SITE_STORAGE_KEY);
    localStorage.removeItem(CLIENT_INTAKE_SESSION_STORAGE_KEY);
    localStorage.removeItem("lumaPendingGeneratedSite");
    if (!preserveAuth) {
      localStorage.removeItem("lumaPendingClientEmail");
      localStorage.removeItem("lumaClientAccessToken");
      localStorage.removeItem("lumaClientRefreshToken");
      sessionStorage.removeItem("lumaClientAccessToken");
      sessionStorage.removeItem("lumaClientRefreshToken");
    }
  } catch {
    // Best-effort only -- an in-memory reset already protects this session.
  }
  // Bug fix (2026-07-18 follow-up): the reset above only cleared the JS
  // model and localStorage -- it never repainted the page. That's fine when
  // called from switchClientAccount() (which repaints manually right after),
  // but createOrResumeClientIntakeSession() calls this mid-request and only
  // repaints later via hydrateClientIntakeSession(), which only runs AFTER a
  // network round-trip succeeds. Until then (or if that request fails/times
  // out), the old account's chat transcript, form fields, template preview,
  // and page title stayed frozen on screen -- looking exactly like "it still
  // has my data" even though the underlying state was already clean. Forcing
  // an immediate repaint here closes that gap regardless of network timing.
  if (typeof siteTitle !== "undefined" && siteTitle) siteTitle.textContent = "";
  applyGuidedStateToForm();
  renderGuidedSummary();
  resetAssistantConversation();
}

function isNewProjectBriefMessage(message) {
  const text = String(message || "").trim();
  if (!isRichIntakeMessage(text)) return false;
  return /\b(quiero|necesito|vamos a|deseo|crear|hacer|build|create|make)\b[\s\S]{0,80}\b(p[aá]gina|website|site|tienda|store|marketplace|cat[aá]logo|catalog)\b/i.test(text);
}

function shouldResetRestoredWorkspaceForMessage(message) {
  if (!isPublicClientSetup || builderState.currentSchema) return false;
  const restored = Boolean(builderState.restoredGuidedDraftInfo || builderState.clientIntakeSession?.restored || readClientIntakeSession()?.restored);
  if (!restored || !isNewProjectBriefMessage(message)) return false;
  const incomingName = extractBusinessName(message).toLowerCase();
  const existingName = String(builderState.guidedState.businessName || "").trim().toLowerCase();
  if (incomingName && existingName && incomingName !== existingName) return true;
  return Boolean(builderState.guidedState.businessDescription || builderState.guidedState.websiteIntent || builderState.guidedState.selectedTemplateId || builderState.guidedState.catalogType);
}





function applyPromptFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const prompt = params.get("prompt") || params.get("description") || "";
  if (!prompt.trim()) return;
  builderState.guidedState.websiteIntent = prompt.trim();
  builderState.guidedState.businessDescription = prompt.trim();
  builderState.guidedState.preferredTone = builderState.guidedState.preferredTone || extractStyleHint(prompt);
  builderState.guidedState.industry = builderState.guidedState.industry || inferIndustryFromPrompt(prompt);
  if (params.get("templateId")) {
    builderState.forcedTemplateSelection = {
      templateId: params.get("templateId"),
      catalogType: params.get("catalogType") || "",
      intent: params.get("intent") || "manual_template",
      reason: "Template selected from customer template gallery",
    };
  }
  builderState.guidedStep = "businessName";
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
  if (textSuggestsProfessionalService(text)) return langText({ en: "Professional services", es: "Servicios profesionales", fr: "Services professionnels", pt: "Serviços profissionais" });
  if (textSuggestsBroadMarketplace(text) || /tienda|store|shop|producto|productos|vender|ecommerce|amazon|ebay|cyberpunk|gamer/.test(text)) return langText({ en: "Online store / ecommerce", es: "Tienda online / ecommerce", fr: "Boutique en ligne / ecommerce", pt: "Loja online / ecommerce" });
  if (/barber|barberia|barbería|salon|spa|\b(cita|citas|reserva|reservas)\b/.test(text)) return langText({ en: "Appointment services", es: "Servicios con citas", fr: "Services avec rendez-vous", pt: "Serviços com agendamento" });
  if (/curso|course|ebook|digital|software|membres/.test(text)) return langText({ en: "Digital products", es: "Productos digitales", fr: "Produits numériques", pt: "Produtos digitais" });
  if (/contractor|construction|remodel|pintura|roofing|flooring/.test(text)) return langText({ en: "Contractor", es: "Construccion / contractor", fr: "Construction / entrepreneur", pt: "Construção / empreiteiro" });
  return "";
}

export function resetAssistantConversation() {
  guidedChat.innerHTML = "";
  builderState.guidedHistory = [];
  setAssistantState("happy");
  renderGuidedCoachCard();
  let askedPrompt = false;
  if (builderState.restoredGuidedDraftInfo) {
    renderRestoredDraftNotice({ force: true });
  }
  if (builderState.guidedStep === "websiteIntent") {
    appendChatMessage(
      "assistant",
      `${guidedQuestion(builderState.guidedStep)}\n\n${langText({
        en: "You can answer naturally, for example: a large catalog store, a restaurant menu, a booking site for a barbershop, or a cyberpunk online store.",
        es: "Puedes responder natural, por ejemplo: una tienda con catalogo grande, un menu de restaurante, una barberia con citas, o una tienda cyberpunk.",
        fr: "Vous pouvez répondre naturellement, par exemple : grand catalogue, menu de restaurant, site de reservation pour salon, ou boutique cyberpunk.",
        pt: "Você pode responder naturalmente, por exemplo: loja com catalogo grande, menu de restaurante, site de reservas para barbearia ou loja cyberpunk.",
      })}`,
      "speaking",
    );
    askedPrompt = true;
  } else if (builderState.forcedTemplateSelection?.templateId && builderState.guidedState.websiteIntent) {
    appendTemplateDetectionMessage({
      templateId: builderState.forcedTemplateSelection.templateId,
      template: builderState.forcedTemplateSelection.template || null,
      intent: builderState.forcedTemplateSelection.intent || "manual_template",
      catalogType: builderState.forcedTemplateSelection.catalogType || "",
      reason: builderState.forcedTemplateSelection.reason || "Template selected from landing page",
    });
  }
  if (!askedPrompt && builderState.guidedStep && builderState.guidedStep !== "review") {
    appendChatMessage("assistant", guidedQuestion(builderState.guidedStep), "speaking");
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



function saveGuidedDraft() {
  if (!isPublicClientSetup) return;
  try {
    localStorage.setItem(
      GUIDED_DRAFT_STORAGE_KEY,
      JSON.stringify({
        guidedState: guidedStateForApi(),
        guidedStep: builderState.guidedStep,
        selectedLanguage: builderState.selectedLanguage,
        completionPercent: guidedCompletionPercent(),
        missingSteps: missingGuidedSteps(),
        savedAt: new Date().toISOString(),
      }),
    );
  } catch {
    // Draft autosave should never block the user flow.
  }
  syncClientIntakeSession({ reason: "autosave" });
}

function restoreGuidedDraft() {
  if (!isPublicClientSetup) return;
  try {
    const raw = localStorage.getItem(GUIDED_DRAFT_STORAGE_KEY);
    if (!raw) return;
    const draft = JSON.parse(raw);
    if (draft.selectedLanguage) setSelectedLanguage(draft.selectedLanguage);
    if (draft.guidedState) {
      builderState.guidedState = {
        ...builderState.guidedState,
        ...draft.guidedState,
        servicesProducts: arrayValue(draft.guidedState.servicesProducts),
        preferredColors: arrayValue(draft.guidedState.preferredColors),
        photoUrls: arrayValue(draft.guidedState.photoUrls),
        videoUrls: arrayValue(draft.guidedState.videoUrls),
        logoPalette: arrayValue(draft.guidedState.logoPalette),
        brand: draft.guidedState.brand || null,
        contactInfo: draft.guidedState.contactInfo || {},
      };
    }
    const missing = missingGuidedSteps();
    const savedStep = draft.guidedStep || builderState.guidedStep;
    builderState.guidedStep = savedStep === "review" && missing.length ? missing[0] : normalizeNextGuidedStep(savedStep);
    builderState.restoredGuidedDraftInfo = {
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
  renderRestoredDraftNotice({ force: true });
}

export function renderRestoredDraftNotice({ force = false } = {}) {
  if (!builderState.restoredGuidedDraftInfo || !guidedChatCard || !guidedChat) return;
  if (builderState.restoredDraftNoticeShown && !force) return;
  builderState.restoredDraftNoticeShown = true;
  const missingLabels = arrayValue(builderState.restoredGuidedDraftInfo.missing)
    .slice(0, 3)
    .map((step) => t(step))
    .join(", ");
  const savedAt = formatDraftSavedAt(builderState.restoredGuidedDraftInfo.savedAt);
  if (!builderState.restoredDraftNoticeCard) {
    builderState.restoredDraftNoticeCard = document.createElement("section");
    builderState.restoredDraftNoticeCard.className = "draft-restore-card";
  }
  builderState.restoredDraftNoticeCard.innerHTML = `
    <div>
      <strong>${escapeHtml(langText({
        en: "Saved draft found",
        es: "Borrador guardado encontrado",
        fr: "Brouillon enregistre trouve",
        pt: "Rascunho salvo encontrado",
      }))}</strong>
      <span>${escapeHtml(langText({
        en: `This workspace is ${builderState.restoredGuidedDraftInfo.completionPercent}% complete${savedAt ? ` from ${savedAt}` : ""}${missingLabels ? `. Missing: ${missingLabels}.` : "."}`,
        es: `Este espacio va en ${builderState.restoredGuidedDraftInfo.completionPercent}%${savedAt ? ` desde ${savedAt}` : ""}${missingLabels ? `. Falta: ${missingLabels}.` : "."}`,
        fr: `Cet espace est complete a ${builderState.restoredGuidedDraftInfo.completionPercent}%${savedAt ? ` depuis ${savedAt}` : ""}${missingLabels ? `. Il manque: ${missingLabels}.` : "."}`,
        pt: `Este espaco esta ${builderState.restoredGuidedDraftInfo.completionPercent}% completo${savedAt ? ` desde ${savedAt}` : ""}${missingLabels ? `. Falta: ${missingLabels}.` : "."}`,
      }))}</span>
    </div>
    <div class="draft-restore-actions">
      <button type="button" data-draft-continue>${escapeHtml(langText({ en: "Continue", es: "Continuar", fr: "Continuer", pt: "Continuar" }))}</button>
      <button type="button" data-draft-new>${escapeHtml(langText({ en: "Start new", es: "Nuevo", fr: "Nouveau", pt: "Novo" }))}</button>
    </div>
  `;
  builderState.restoredDraftNoticeCard.querySelector("[data-draft-continue]")?.addEventListener("click", () => {
    builderState.restoredDraftNoticeCard?.remove();
    builderState.restoredDraftNoticeCard = null;
  });
  builderState.restoredDraftNoticeCard.querySelector("[data-draft-new]")?.addEventListener("click", () => {
    builderState.restoredDraftNoticeCard?.remove();
    builderState.restoredDraftNoticeCard = null;
    startNewClientProject();
  });
  if (builderState.restoredDraftNoticeCard.parentElement !== guidedChatCard) {
    guidedChatCard.insertBefore(builderState.restoredDraftNoticeCard, guidedChat);
  }
}

function guidedBuildPhases() {
  return [
    {
      key: "save",
      label: langText({ en: "Saving your details", es: "Guardando tus datos", fr: "Enregistrement de vos infos", pt: "Salvando seus dados" }),
      body: langText({
        en: "Keeping your answers safe in your workspace.",
        es: "Guardamos tus respuestas de forma segura en tu espacio.",
        fr: "Vos reponses sont enregistrees en toute securite.",
        pt: "Guardamos suas respostas com seguranca no seu espaco.",
      }),
    },
    {
      key: "strategy",
      label: langText({ en: "Choosing your style", es: "Eligiendo tu estilo", fr: "Choix de votre style", pt: "Escolhendo seu estilo" }),
      body: langText({
        en: "Matching your business with the look and layout that fit it best.",
        es: "Buscando el diseno y la estructura que mejor le quedan a tu negocio.",
        fr: "Recherche du design et de la structure qui vous conviennent le mieux.",
        pt: "Buscando o design e a estrutura que mais combinam com seu negocio.",
      }),
    },
    {
      key: "generate",
      label: langText({ en: "Writing your content", es: "Escribiendo tu contenido", fr: "Redaction de votre contenu", pt: "Escrevendo seu conteudo" }),
      body: langText({
        en: "Writing your homepage, products and page text.",
        es: "Escribiendo tu pagina de inicio, productos y textos.",
        fr: "Redaction de votre page d'accueil, produits et textes.",
        pt: "Escrevendo sua pagina inicial, produtos e textos.",
      }),
    },
    {
      key: "render",
      label: langText({ en: "Building your preview", es: "Armando tu vista previa", fr: "Preparation de votre apercu", pt: "Montando sua previa" }),
      body: langText({
        en: "Putting together your editable preview so you can review it right away.",
        es: "Armando tu vista previa editable para que la revises enseguida.",
        fr: "Assemblage de votre apercu modifiable pour le revoir immediatement.",
        pt: "Montando sua previa editavel para voce revisar na hora.",
      }),
    },
  ];
}

function ensureGuidedBuildStatusCard() {
  if (!guidedChatCard || !guidedChat) return null;
  if (!builderState.guidedBuildStatusCard) {
    builderState.guidedBuildStatusCard = document.createElement("section");
    builderState.guidedBuildStatusCard.className = "guided-build-card";
    builderState.guidedBuildStatusCard.setAttribute("aria-live", "polite");
  }
  if (builderState.guidedBuildStatusCard.parentElement !== guidedChatCard) {
    guidedChatCard.appendChild(builderState.guidedBuildStatusCard);
  }
  return builderState.guidedBuildStatusCard;
}

function setGuidedBuildPhase(phase, detail = "") {
  if (!isPublicClientSetup) return;
  const card = ensureGuidedBuildStatusCard();
  if (!card) return;
  document.body.classList.add("lyra-build-mode");
  const phases = guidedBuildPhases();
  const activeIndex = phase === "ready"
    ? phases.length
    : Math.max(0, phases.findIndex((item) => item.key === phase));
  const activePhase = phases[Math.min(activeIndex, phases.length - 1)] || phases[0];
  const isError = phase === "error";
  const isReady = phase === "ready";
  card.classList.toggle("is-error", isError);
  card.classList.toggle("is-ready", isReady);
  card.innerHTML = `
    <div class="guided-build-head">
      <span>${escapeHtml(langText({ en: "Building your website", es: "Creando tu sitio", fr: "Creation de votre site", pt: "Criando seu site" }))}</span>
      <strong>${escapeHtml(isError
        ? langText({ en: "Generation stopped", es: "Generacion detenida", fr: "Generation arretee", pt: "Geracao interrompida" })
        : isReady
          ? langText({ en: "Preview ready", es: "Preview listo", fr: "Apercu pret", pt: "Preview pronto" })
          : activePhase.label)}</strong>
      <em>${escapeHtml(isReady ? "100%" : `${Math.min(95, Math.round(((activeIndex + 1) / phases.length) * 100))}%`)}</em>
    </div>
    <p>${escapeHtml(detail || (isError
      ? langText({ en: "Nothing was lost — your answers are saved. Let's try again.", es: "No se perdio nada, tus respuestas quedaron guardadas. Intentemos de nuevo.", fr: "Rien n'est perdu, vos reponses sont enregistrees. Reessayons.", pt: "Nada foi perdido, suas respostas ficaram salvas. Vamos tentar de novo." })
      : isReady
        ? langText({ en: "The editable draft is ready to review.", es: "El borrador editable esta listo para revisar.", fr: "Le brouillon modifiable est pret a etre revise.", pt: "O rascunho editavel esta pronto para revisar." })
        : activePhase.body))}</p>
    ${isError
      ? `<div class="guided-build-actions"><button type="button" data-guided-build-retry>${escapeHtml(langText({ en: "Try again", es: "Reintentar", fr: "Reessayer", pt: "Tentar novamente" }))}</button></div>`
      : `<div class="guided-build-steps">
      ${phases.map((item, index) => {
        const state = isReady || index < activeIndex ? "done" : index === activeIndex ? "active" : "pending";
        return `<span class="${state}">${escapeHtml(item.label)}</span>`;
      }).join("")}
    </div>`}
  `;
  card.querySelector("[data-guided-build-retry]")?.addEventListener("click", () => {
    window.handleGuidedGenerateButton?.();
  });
  requestAnimationFrame(() => {
    card.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
}

function removeGuidedBuildStatusCard() {
  document.body.classList.remove("lyra-build-mode");
  builderState.guidedBuildStatusCard?.remove();
  builderState.guidedBuildStatusCard = null;
}

function formatDraftSavedAt(value) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat(builderState.selectedLanguage, {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

export function saveGeneratedSite(result) {
  if (!isPublicClientSetup) return;
  try {
    localStorage.setItem(
      GENERATED_SITE_STORAGE_KEY,
      JSON.stringify({
        result,
        selectedPageKey: builderState.selectedPageKey,
        selectedVariantId: builderState.selectedVariantId,
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
    builderState.currentSchema = prepareWebsiteConfig(result.schema, { brand: result.schema.brand || builderState.guidedState.brand || {} }, null);
    builderState.currentSiteId = result.generatedSiteId || result.projectId || result.site_id || null;
    builderState.currentBusinessId = result.business_id || null;
    builderState.currentGenerationId = result.generation_id || null;
    builderState.currentCatalogItems = catalogItemsFromSchema(builderState.currentSchema);
    builderState.selectedPageKey = saved.selectedPageKey || builderState.currentSchema.pages?.[0]?.page_key || "home";
    builderState.selectedVariantId = saved.selectedVariantId || builderState.currentSchema.design_variants?.[0]?.id || "";
    siteTitle.textContent = builderState.currentSchema.business?.name || "Generated site";
    storageStatus.textContent = storageLabel(result.storage_status, result.used_dev_mock);
  } catch {
    localStorage.removeItem(GENERATED_SITE_STORAGE_KEY);
  }
}









export function continuePendingStudioAction() {
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

async function handleGuidedSendAction(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  const now = Date.now();
  if (builderState.guidedSendLocked || now - builderState.guidedLastSendAt < 350) return;
  builderState.guidedLastSendAt = now;
  builderState.guidedSendLocked = true;
  try {
    await sendGuidedReply();
  } finally {
    builderState.guidedSendLocked = false;
  }
}



async function applyLumaAgentDecision(result = {}) {
  const selectedTemplateId = result.selectedTemplateId || result.selected_template_id || "";
  const localPlan = refreshAiStudioPlanFromContext();
  const effectiveTemplateId = shouldPreferLocalStudioTemplate(selectedTemplateId, localPlan)
    ? localPlan.recommendedTemplateId
    : selectedTemplateId;
  if (effectiveTemplateId && window.TemplateRouter?.getTemplateById) {
    let template = null;
    try {
      template = await window.TemplateRouter.getTemplateById(effectiveTemplateId);
    } catch (error) {
      console.warn("LYRA selected template could not be loaded.", error);
    }
    builderState.forcedTemplateSelection = {
      templateId: effectiveTemplateId,
      template,
      intent: shouldPreferLocalStudioTemplate(selectedTemplateId, localPlan) ? "ai_studio_plan_override" : (result.intent || "luma_agent_template"),
      catalogType: shouldPreferLocalStudioTemplate(selectedTemplateId, localPlan)
        ? localPlan.recommendedCatalogType
        : result.catalogType || result.catalog_type || template?.catalogModel?.catalogType || "",
      reason: shouldPreferLocalStudioTemplate(selectedTemplateId, localPlan)
        ? localPlan.reasoningSummary
        : result.selectedTemplateReason || result.selected_template_reason || "Selected by LYRA from the conversation",
    };
  } else if (!selectedTemplateId && result.intent === "collect_info") {
    builderState.forcedTemplateSelection = {
      templateId: localPlan.recommendedTemplateId || "",
      template: null,
      intent: localPlan.recommendedTemplateId ? "ai_studio_plan" : "luma_agent_collecting_context",
      catalogType: localPlan.recommendedCatalogType || "",
      reason: localPlan.recommendedTemplateId
        ? localPlan.reasoningSummary
        : "LYRA is still collecting enough context before choosing a structure",
    };
  }

  if (result.designStrategy) {
    builderState.guidedState.designStrategy = result.designStrategy;
  }
  if (result.sitePlan) {
    builderState.guidedState.sitePlan = {
      ...result.sitePlan,
      aiStudioPlan: localPlan,
    };
    builderState.guidedState.sitePlanApproved = false;
  } else if (!selectedTemplateId) {
    builderState.guidedState.sitePlan = localPlan.recommendedTemplateId ? buildSitePlan(builderState.forcedTemplateSelection) : null;
    if (builderState.guidedState.sitePlan) builderState.guidedState.sitePlan.aiStudioPlan = localPlan;
    builderState.guidedState.sitePlanApproved = false;
  }
}



function shouldPreferLocalStudioTemplate(serverTemplateId, localPlan = {}) {
  if (!localPlan?.recommendedTemplateId) return false;
  if (!serverTemplateId) return true;
  if (serverTemplateId === localPlan.recommendedTemplateId) return false;
  const planSignal = `${localPlan.websiteType || ""} ${localPlan.recommendedCatalogType || ""} ${localPlan.reasoningSummary || ""}`;
  return /mega_marketplace|marketplace|broad catalog|muchos productos|de todo|varied|catalog|booking|restaurant|service|quote|premium_showcase/i.test(planSignal);
}

async function handleWebsiteIntentAnswer(message) {
  guidedStatusText.textContent = langText({
    en: "Detecting the best template...",
    es: "Detectando el mejor template...",
    fr: "Détection du meilleur template...",
    pt: "Detectando o melhor template...",
  });
  setThinking(true);
  builderState.guidedState.websiteIntent = message;
  if (!builderState.guidedState.industry) builderState.guidedState.industry = inferIndustryFromPrompt(message);
  if (!builderState.guidedState.preferredTone) builderState.guidedState.preferredTone = extractStyleHint(message);
  const inferredUpdates = inferGuidedUpdatesFromAnyMessage(message);
  if (isGenericCommerceIntent(message)) {
    builderState.forcedTemplateSelection = {
      templateId: "",
      template: null,
      intent: "provisional_needs_catalog_context",
      catalogType: "",
      reason: "Commerce intent detected; waiting for product range before selecting the visual base",
    };
    builderState.guidedStep = nextSmartGuidedStep("websiteIntent");
    appendUnderstandingCard({ updates: { websiteIntent: message }, sourceMessage: message });
    appendChatMessage("assistant", guidedQuestion(builderState.guidedStep), "speaking");
    guidedStatusText.textContent = langText({
      en: "Commerce intent noted. LYRA will choose the template after understanding the product range.",
      es: "Intencion de venta detectada. LYRA elegira el template al entender el tipo de productos.",
      fr: "Intention de vente notee. LYRA choisira le template apres avoir compris la gamme de produits.",
      pt: "Intencao de venda detectada. A LYRA escolhera o template apos entender os produtos.",
    });
    setThinking(false);
    renderGuidedSummary();
    refreshQuickChips();
    saveGuidedDraft();
    return;
  }
  mergeGuidedUpdates(inferredUpdates);
  builderState.guidedState.websiteIntent = message;
  let selection = {
    templateId: "",
    template: null,
    intent: "default_pending",
    catalogType: "",
    reason: "Waiting for enough business context before locking a template",
  };
  try {
    selection = await withTimeout(selectTemplateFromFreeText(message), 2500);
  } catch (error) {
    console.warn("LYRA template intent detection failed; continuing locally.", error);
  }
  builderState.forcedTemplateSelection = selection;
  appendTemplateDetectionMessage(selection);
  builderState.guidedStep = nextSmartGuidedStep("websiteIntent");
  appendUnderstandingCard({ updates: inferGuidedUpdatesFromAnyMessage(message), sourceMessage: message });
  appendChatMessage("assistant", guidedQuestion(builderState.guidedStep), "speaking");
  guidedStatusText.textContent = selection?.templateId
    ? langText({
      en: "Template selected. Continue with the business details.",
      es: "Template seleccionado. Sigamos con los datos del negocio.",
      fr: "Template sélectionné. Continuons avec les détails de l'entreprise.",
      pt: "Template selecionado. Vamos continuar com os dados do negócio.",
    })
    : langText({
      en: "Goal noted. LYRA will choose the structure after understanding the offer.",
      es: "Objetivo entendido. LYRA elegira la estructura despues de entender la oferta.",
      fr: "Objectif note. LYRA choisira la structure apres avoir compris l'offre.",
      pt: "Objetivo entendido. A LYRA escolhera a estrutura depois de entender a oferta.",
    });
  setThinking(false);
  renderGuidedSummary();
  refreshQuickChips();
  saveGuidedDraft();
  if (selection?.templateId) {
    appendTemplatePreviewChoices(selection, message).catch((error) => {
      console.warn("Template preview choices failed; setup can continue.", error);
    });
  }
}

function withTimeout(promise, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("Operation timed out")), timeoutMs);
    Promise.resolve(promise)
      .then((value) => {
        window.clearTimeout(timeout);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timeout);
        reject(error);
      });
  });
}

async function selectTemplateFromFreeText(message) {
  const inferredTemplateId = inferTemplateIdFromText(message);
  if (inferredTemplateId) {
    const template = window.TemplateRouter?.getTemplateById
      ? await window.TemplateRouter.getTemplateById(inferredTemplateId)
      : null;
    return {
      templateId: inferredTemplateId,
      template,
      intent: "guided_context_template",
      catalogType: template?.catalogModel?.catalogType || templatePreviewMeta(inferredTemplateId)?.catalogType || "",
      reason: "Selected from the customer description",
    };
  }
  if (isGenericCommerceIntent(message) || !inferredTemplateId) {
    return {
      templateId: "",
      template: null,
      intent: "provisional_needs_catalog_context",
      catalogType: "",
      reason: "Waiting for the product range before selecting a visual base",
    };
  }
  if (!window.TemplateRouter?.selectTemplateFromPrompt) {
    return {
      templateId: "mega-retail-store",
      template: null,
      intent: "default_retail_discovery",
      catalogType: "single_vendor_dense_catalog",
      reason: "Template router unavailable; using retail discovery template",
    };
  }
  return window.TemplateRouter.selectTemplateFromPrompt(message);
}

async function getTemplatePreviewCandidates(selection, sourceMessage = "") {
  const candidates = [];
  const addCandidate = (candidate) => {
    if (!candidate?.templateId || candidates.some((item) => item.templateId === candidate.templateId)) return;
    const meta = templatePreviewMeta(candidate.templateId) || {};
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
      const ranked = await window.TemplateRouter.getTemplateCandidates(sourceMessage || builderState.guidedState.websiteIntent || "", 3);
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
  const commerceHeavy = /marketplace|dense|listing|retail|single_vendor/.test(selectedCatalog);
  const listingHeavy = /real_estate|listing/.test(selectedCatalog);
  const restaurantHeavy = /restaurant|menu|food/.test(selectedCatalog);
  const digitalHeavy = /digital|pricing|software|course/.test(selectedCatalog);
  const serviceHeavy = /service|booking/.test(selectedCatalog);
  const ordered = commerceHeavy
    ? listingHeavy
      ? ["real-estate-listings-pro", "listing-marketplace-pro", "mega-marketplace", "mega-retail-store"]
      : ["mega-retail-store", "mega-marketplace", "listing-marketplace-pro", "fashion-drop-pro"]
    : restaurantHeavy
      ? ["restaurant-food-business", "lead-funnel-pro", "home-services-premium", "booking-appointment-pro"]
    : digitalHeavy
      ? ["digital-products-store", "lead-funnel-pro", "premium-product-store", "corporate-company-pro"]
    : serviceHeavy
      ? ["home-services-premium", "lead-funnel-pro", "local-services-pro-plus", "booking-appointment-pro"]
      : ["lead-funnel-pro", "corporate-company-pro", "premium-product-store", "fashion-drop-pro"];
  return ordered.map((templateId) => templatePreviewMeta(templateId)).filter(Boolean);
}

function templatePreviewMeta(templateId) {
  const id = normalizeTemplateId(templateId);
  return withTemplateExecutionStatus(TEMPLATE_PREVIEW_CHOICES.find((choice) => normalizeTemplateId(choice.templateId) === id) || null);
}

function localizedTemplateName(choice) {
  return choice?.names?.[builderState.selectedLanguage] || choice?.name || choice?.template?.clientSelectionCard?.title || choice?.template?.name || choice?.templateId || "";
}

function localizedTemplateDescription(choice) {
  return choice?.descriptions?.[builderState.selectedLanguage] || choice?.description || choice?.template?.clientSelectionCard?.difference || choice?.template?.visualDifference || "";
}

function localizedTemplateBadgeSet(map, language = builderState.selectedLanguage) {
  const value = map[language] || map.en || [];
  const badges = Array.isArray(value) ? value : [value];
  return badges.map((badge) => publicAssistantCopy(badge)).filter(Boolean);
}

function templateCardBadges(choice) {
  const catalogType = String(choice?.catalogType || "").toLowerCase();
  if (/dense_marketplace/.test(catalogType)) return localizedTemplateBadgeSet({
    en: ["E-commerce", "Deals", "Search-first"],
    es: ["E-commerce", "Ofertas", "Busqueda"],
    fr: ["E-commerce", "Offres", "Recherche"],
    pt: ["E-commerce", "Ofertas", "Busca"],
  });
  if (/listing/.test(catalogType)) return localizedTemplateBadgeSet({
    en: ["Marketplace", "Listings", "Offers"],
    es: ["Marketplace", "Listados", "Ofertas"],
    fr: ["Marketplace", "Annonces", "Offres"],
    pt: ["Marketplace", "Anuncios", "Ofertas"],
  });
  if (/lookbook|collection/.test(catalogType)) return localizedTemplateBadgeSet({
    en: ["Fashion", "Lookbook", "Drops"],
    es: ["Moda", "Lookbook", "Drops"],
    fr: ["Mode", "Lookbook", "Drops"],
    pt: ["Moda", "Lookbook", "Drops"],
  });
  if (/premium|luxury/.test(catalogType)) return localizedTemplateBadgeSet({
    en: ["Premium", "Showcase", "Editorial"],
    es: ["Premium", "Showcase", "Editorial"],
    fr: ["Premium", "Showcase", "Editorial"],
    pt: ["Premium", "Showcase", "Editorial"],
  });
  if (/industrial|supplier/.test(catalogType)) return localizedTemplateBadgeSet({
    en: ["B2B", "RFQ", "Materials"],
    es: ["B2B", "Cotizacion", "Materiales"],
    fr: ["B2B", "Devis", "Materiaux"],
    pt: ["B2B", "Orcamento", "Materiais"],
  });
  if (/b2b|solution/.test(catalogType)) return localizedTemplateBadgeSet({
    en: ["B2B", "SaaS", "Systems"],
    es: ["B2B", "SaaS", "Sistemas"],
    fr: ["B2B", "SaaS", "Systemes"],
    pt: ["B2B", "SaaS", "Sistemas"],
  });
  if (/medical|wellness/.test(catalogType)) return localizedTemplateBadgeSet({
    en: ["Clinic", "Booking", "Trust"],
    es: ["Clinica", "Reservas", "Confianza"],
    fr: ["Clinique", "Reservations", "Confiance"],
    pt: ["Clinica", "Agendas", "Confianca"],
  });
  if (/legal|professional|company/.test(catalogType)) return localizedTemplateBadgeSet({
    en: ["Services", "Authority", "Leads"],
    es: ["Servicios", "Autoridad", "Leads"],
    fr: ["Services", "Autorite", "Leads"],
    pt: ["Servicos", "Autoridade", "Leads"],
  });
  if (/restaurant|menu/.test(catalogType)) return localizedTemplateBadgeSet({
    en: ["Menu", "Orders", "Local"],
    es: ["Menu", "Pedidos", "Local"],
    fr: ["Menu", "Commandes", "Local"],
    pt: ["Menu", "Pedidos", "Local"],
  });
  if (/booking/.test(catalogType)) return localizedTemplateBadgeSet({
    en: ["Booking", "Services", "Calendar"],
    es: ["Reservas", "Servicios", "Calendario"],
    fr: ["Reservations", "Services", "Calendrier"],
    pt: ["Agendas", "Servicos", "Calendario"],
  });
  if (/digital/.test(catalogType)) return localizedTemplateBadgeSet({
    en: ["Digital", "Bundles", "Instant access"],
    es: ["Digital", "Bundles", "Acceso inmediato"],
    fr: ["Digital", "Bundles", "Acces immediat"],
    pt: ["Digital", "Bundles", "Acesso imediato"],
  });
  if (/service|quote/.test(catalogType)) return localizedTemplateBadgeSet({
    en: ["Services", "Quote", "Local"],
    es: ["Servicios", "Cotizacion", "Local"],
    fr: ["Services", "Devis", "Local"],
    pt: ["Servicos", "Orcamento", "Local"],
  });
  return localizedTemplateBadgeSet({
    en: ["Website", "Editable", "AI-ready"],
    es: ["Web", "Editable", "IA lista"],
    fr: ["Site", "Modifiable", "IA prete"],
    pt: ["Site", "Editavel", "IA pronta"],
  });
}

const TEMPLATE_PREVIEW_PALETTES = Object.freeze({
  "premium-product-store": { paper: "#f7f6ff", ink: "#10101a", accent: "#6d5dfc" },
  "luxury-high-ticket-pro": { paper: "#11100f", ink: "#f7efe2", accent: "#d6a84f" },
  "education-course-academy-pro": { paper: "#eef5ff", ink: "#101d33", accent: "#3275e7" },
  "medical-wellness-clinic-pro": { paper: "#e8f4f0", ink: "#102624", accent: "#006b63" },
  "legal-professional-services-pro": { paper: "#eef1f6", ink: "#131b2b", accent: "#1f3a63" },
  "b2b-saas-enterprise-pro": { paper: "#edf7ff", ink: "#101d33", accent: "#0f7cc7" },
  "manufacturing-industrial-supplier-pro": { paper: "#f4f1e9", ink: "#1d2528", accent: "#ef6b32" },
  "mega-retail-store": { paper: "#eef2ff", ink: "#101a33", accent: "#2563eb" },
  "mega-marketplace": { paper: "#f4eee7", ink: "#261c17", accent: "#d8643d" },
  "listing-marketplace-pro": { paper: "#f0f7f5", ink: "#12231f", accent: "#0f8c78" },
  "fashion-drop-pro": { paper: "#f4f1e9", ink: "#1d1616", accent: "#c9262f" },
  "corporate-company-pro": { paper: "#f2f6fb", ink: "#14213a", accent: "#335c81" },
  "lead-funnel-pro": { paper: "#eef8f0", ink: "#16231c", accent: "#1f9d55" },
  "restaurant-food-business": { paper: "#fff7e8", ink: "#2c2116", accent: "#ec8c37" },
  "digital-products-store": { paper: "#f5f0ff", ink: "#211a33", accent: "#8b5cf6" },
  "real-estate-listings-pro": { paper: "#eff6f7", ink: "#13252a", accent: "#147c8c" },
  "home-services-premium": { paper: "#f0f8f3", ink: "#16231c", accent: "#16803f" },
  "local-services-pro-plus": { paper: "#fff7ed", ink: "#2a1c12", accent: "#e46a2a" },
  "booking-appointment-pro": { paper: "#faf5fc", ink: "#2b2134", accent: "#a579db" },
});

// Illustrative accent palette per template, used only for the live mini
// preview in the template picker (before generation). Real copy/colors are
// decided by LYRA per-business once generation runs (see state.colors in
// backend/app/main.py::build_schema_from_state) -- this is a style hint, not
// the final result. It keeps related templates visually distinct without
// depending on a small shared stock-image pool.
function templateAccentPalette(catalogType, templateId = "") {
  const override = TEMPLATE_PREVIEW_PALETTES[normalizeTemplateId(templateId)];
  if (override) return override;
  const type = String(catalogType || "").toLowerCase();
  if (/premium|luxury/.test(type)) return { paper: "#f7f6ff", ink: "#10101a", accent: "#6d5dfc" };
  if (/dense_marketplace|listing/.test(type)) return { paper: "#f4eee7", ink: "#261c17", accent: "#d8643d" };
  if (/single_vendor_dense/.test(type)) return { paper: "#eef2ff", ink: "#101a33", accent: "#2563eb" };
  if (/lookbook|collection/.test(type)) return { paper: "#f4f1e9", ink: "#1d1616", accent: "#c9262f" };
  if (/education/.test(type)) return { paper: "#eef5ff", ink: "#101d33", accent: "#3275e7" };
  if (/medical|wellness/.test(type)) return { paper: "#e8f4f0", ink: "#102624", accent: "#006b63" };
  if (/legal|professional|company/.test(type)) return { paper: "#eef1f6", ink: "#131b2b", accent: "#1f3a63" };
  if (/industrial|supplier/.test(type)) return { paper: "#f4f1e9", ink: "#1d2528", accent: "#ef6b32" };
  if (/b2b|solution/.test(type)) return { paper: "#eef5ff", ink: "#101d33", accent: "#3275e7" };
  if (/restaurant|menu/.test(type)) return { paper: "#fff7e8", ink: "#2c2116", accent: "#ec8c37" };
  if (/booking/.test(type)) return { paper: "#faf5fc", ink: "#2b2134", accent: "#a579db" };
  if (/digital/.test(type)) return { paper: "#f5f0ff", ink: "#211a33", accent: "#8b5cf6" };
  if (/lead_funnel|service|quote/.test(type)) return { paper: "#eef8f0", ink: "#16231c", accent: "#1f9d55" };
  return { paper: "#f2f2ec", ink: "#111111", accent: "#101828" };
}

// Renders a small live DOM mockup (mini nav / mini hero / mini cards) styled
// with the template's illustrative palette, instead of a static screenshot.
// Several TEMPLATE_PREVIEW_CHOICES entries reuse the same stock photo (see
// docs/AGENT_LOG.md), which makes distinct templates look identical in the
// picker. This gives every card a distinct, on-brand preview even when the
// photo is shared.
function templateLivePreviewMarkup(choice) {
  const palette = templateAccentPalette(choice?.catalogType, choice?.templateId);
  const brand = escapeHtml((builderState.guidedState.businessName || "").slice(0, 18) || langText({
    en: "YOUR BRAND", es: "TU MARCA", fr: "VOTRE MARQUE", pt: "SUA MARCA",
  }));
  return `
    <div class="template-live-preview" style="--tlp-paper:${palette.paper};--tlp-ink:${palette.ink};--tlp-accent:${palette.accent};">
      <div class="tlp-nav"><b>${brand}</b><i></i><i></i><em></em></div>
      <div class="tlp-hero">
        <span class="tlp-copy"><b></b><b></b><i></i></span>
        <span class="tlp-image"><i></i><i></i><i></i></span>
      </div>
      <div class="tlp-cards"><i></i><i></i><i></i></div>
    </div>
  `;
}

function buildAiStudioPlanFromGuidedState(extra = "") {
  const contextText = guidedTemplateContextText(extra);
  const payload = guidedStatePayloadForPlanning();
  const templateId = inferDesignerTemplateIdFromPayload(payload) || inferTemplateIdFromText(contextText) || builderState.forcedTemplateSelection?.templateId || "";
  const templateMeta = templatePreviewMeta(templateId);
  const catalogType = templateMeta?.catalogType || builderState.forcedTemplateSelection?.catalogType || "";
  const websiteType = inferWebsiteTypeFromContext(contextText, catalogType);
  const salesFlow = inferSalesFlowForPlan(contextText, websiteType);
  const requiredFeatures = inferRequiredFeaturesForPlan(contextText, websiteType, catalogType);
  const missingImportantFields = missingImportantFieldsForPlan();
  const reasoningSummary = explainTemplateDecision(templateId, websiteType, contextText);
  const pages = buildPlanPagesForContext(templateId, websiteType, catalogType);
  return {
    version: 2,
    decisionState: missingImportantFields.length ? "enough_to_plan_with_optional_gaps" : "ready_to_generate",
    websiteType,
    recommendedTemplateId: templateId,
    recommendedTemplateName: localizedTemplateName(templateMeta) || builderState.forcedTemplateSelection?.template?.name || templateId,
    recommendedCatalogType: catalogType,
    reasoningSummary,
    salesFlow,
    requiredFeatures,
    pages,
    missingImportantFields,
    copyPolicy: "Use intake as private strategy. Rewrite all visible copy as polished customer-facing content.",
    editabilityContract: [
      "Every visible text block must be editable.",
      "Every catalog item, category, price label and image must be editable.",
      "Colors, fonts, buttons, page order and section order must remain editable.",
      "Future chat changes must patch only the requested area unless the client asks for a full redesign.",
    ],
  };
}

function guidedStatePayloadForPlanning() {
  return {
    business_name: builderState.guidedState.businessName,
    business_description: builderState.guidedState.businessDescription || builderState.guidedState.websiteIntent,
    industry: builderState.guidedState.industry,
    services_products: arrayValue(builderState.guidedState.servicesProducts),
    target_audience: builderState.guidedState.targetAudience,
    preferred_tone: builderState.guidedState.preferredTone,
    preferred_colors: arrayValue(builderState.guidedState.preferredColors),
    salesMode: builderState.guidedState.salesMode,
  };
}

function refreshAiStudioPlanFromContext(extra = "") {
  const plan = buildAiStudioPlanFromGuidedState(extra);
  builderState.guidedState.aiStudioPlan = plan;
  builderState.guidedState.designStrategy = {
    ...(builderState.guidedState.designStrategy || {}),
    diagnosis: plan,
    selectedTemplateId: plan.recommendedTemplateId,
    selectedTemplateReason: plan.reasoningSummary,
    selectedCatalogType: plan.recommendedCatalogType,
    designerRole: "senior ecommerce strategist, UX architect and brand designer",
    templateUsePolicy: "Choose the closest proven template as architecture, then adapt copy, colors, sections, catalog and CTAs to the client's business.",
  };
  if (plan.recommendedTemplateId && builderState.forcedTemplateSelection?.templateId !== plan.recommendedTemplateId) {
    builderState.forcedTemplateSelection = {
      templateId: plan.recommendedTemplateId,
      template: null,
      catalogType: plan.recommendedCatalogType,
      intent: "ai_studio_plan",
      reason: plan.reasoningSummary,
    };
    builderState.guidedState.sitePlan = null;
    builderState.guidedState.sitePlanApproved = false;
  } else if (builderState.forcedTemplateSelection?.templateId) {
    builderState.forcedTemplateSelection = {
      ...builderState.forcedTemplateSelection,
      catalogType: builderState.forcedTemplateSelection.catalogType || plan.recommendedCatalogType,
      reason: builderState.forcedTemplateSelection.reason || plan.reasoningSummary,
    };
  }
  return plan;
}

function inferWebsiteTypeFromContext(contextText, catalogType = "") {
  const text = normalizeTemplateIntentText(`${contextText} ${catalogType}`);
  if (/restaurant|restaurante|menu|comida|food|cafe|delivery/.test(text)) return "restaurant_menu";
  if (/booking|appointment|reserva|cita|barber|salon|spa/.test(text)) return "booking_site";
  if (textSuggestsMultiVendorMarketplace(text) || /dense_marketplace_catalog/.test(text)) return "mega_marketplace";
  if (textSuggestsMegaRetailStore(text) || /single_vendor_dense|dense_retail|retail|amazon|de todo|todo tipo|variad[oa]s?|muchos productos|catalogo grande|multi.?category|multi.?categoria/.test(text)) return "mega_retail_store";
  if (/listing|classified|real estate|inmueble|rental|alquiler|carros usados/.test(text)) return "listing_marketplace";
  if (/digital|download|curso|course|ebook|membership|membresia/.test(text)) return "digital_products";
  if (/quote|cotizacion|cotización|service|servicio|contractor|legal|clinic|industrial/.test(text)) return "service_or_quote_site";
  if (/premium_editorial|flagship|single product|producto unico|mismo nicho|linea de|showcase/.test(text)) return "premium_showcase_store";
  if (/store|shop|tienda|ecommerce|venta online|vender online|catalog/.test(text)) return "online_store";
  return "business_website";
}

function inferSalesFlowForPlan(contextText, websiteType) {
  const text = normalizeTemplateIntentText(contextText);
  if (/quote|cotizacion|cotización|presupuesto|consulta|inquiry/.test(text) || /service|quote/.test(websiteType)) return "quote_or_lead_request";
  if (/booking|appointment|reserva|cita/.test(text) || websiteType === "booking_site") return "appointment_booking";
  if (/restaurant|restaurante|menu|comida|food|cafe|cafeteria|delivery de comida/.test(text) || websiteType === "restaurant_menu") return "menu_order_or_contact";
  if (/marketplace|store|shop|tienda|vender|venta online|checkout|carrito/.test(text) || /store|marketplace|digital/.test(websiteType)) return "online_sales";
  return "lead_capture";
}

function inferRequiredFeaturesForPlan(contextText, websiteType, catalogType = "") {
  const text = normalizeTemplateIntentText(`${contextText} ${websiteType} ${catalogType}`);
  const features = new Set(["editable_pages", "editable_sections", "editable_brand_system", "contact_capture"]);
  if (/marketplace|dense|catalog|store|shop|tienda|product|producto/.test(text)) {
    ["catalog_manager", "categories", "search", "filters", "product_cards"].forEach((feature) => features.add(feature));
  }
  if (/online_sales|checkout|carrito|cart|shop|store|tienda|marketplace|digital/.test(text)) {
    ["cart", "checkout_path", "customer_account", "featured_deals"].forEach((feature) => features.add(feature));
  }
  if (/marketplace|dense|retail|amazon|muchos productos|de todo|todo tipo/.test(text)) {
    ["deal_sections", "best_sellers", "newsletter_or_deal_subscription", "ratings_reviews", "wishlist_ready"].forEach((feature) => features.add(feature));
  }
  if (/booking|appointment|reserva|cita/.test(text)) features.add("booking_request_flow");
  if (/restaurant|menu|food|comida/.test(text)) features.add("menu_categories");
  if (/quote|cotizacion|cotización|service|servicio|industrial|legal|clinic/.test(text)) features.add("quote_request_flow");
  return [...features];
}

function missingImportantFieldsForPlan() {
  const missing = [];
  if (!builderState.guidedState.businessName) missing.push("businessName");
  if (!builderState.guidedState.businessDescription && !arrayValue(builderState.guidedState.servicesProducts).length) missing.push("businessDescription");
  if (!builderState.guidedState.websiteIntent && !builderState.guidedState.salesMode) missing.push("websiteIntent");
  return missing;
}

function explainTemplateDecision(templateId, websiteType, contextText) {
  if (templateId === "mega-retail-store" || websiteType === "mega_retail_store") {
    return langText({
      en: "The offer reads as a broad catalog owned by one business, so the best base is a search-first retail store with categories, deals, filters, account and cart logic.",
      es: "La oferta se entiende como un catalogo amplio de un solo negocio, asi que la mejor base es una tienda retail con busqueda, categorias, ofertas, filtros, cuenta y carrito.",
      fr: "L'offre ressemble a un grand catalogue gere par une seule entreprise; la meilleure base est donc une boutique retail avec recherche, categories, offres, filtres, compte et panier.",
      pt: "A oferta parece um catalogo amplo de um unico negocio; a melhor base e uma loja retail com busca, categorias, ofertas, filtros, conta e carrinho.",
    });
  }
  if (templateId === "mega-marketplace") {
    return langText({
      en: "The offer reads as a broad, varied catalog, so the best base is a search-first marketplace with categories, deals, filters, account and cart logic.",
      es: "La oferta se entiende como un catalogo amplio y variado, asi que la mejor base es un marketplace con busqueda, categorias, ofertas, filtros, cuenta y carrito.",
      fr: "L'offre ressemble a un catalogue large et varie; la meilleure base est donc un marketplace avec recherche, categories, offres, filtres, compte et panier.",
      pt: "A oferta parece um catalogo amplo e variado; a melhor base e um marketplace com busca, categorias, ofertas, filtros, conta e carrinho.",
    });
  }
  if (normalizeTemplateId(templateId) === "premium-product-store") {
    return langText({
      en: "The offer is focused enough for a premium product presentation with stronger story, proof, feature sections and conversion.",
      es: "La oferta es suficientemente enfocada para una presentacion premium con historia, prueba, secciones de beneficios y conversion.",
      fr: "L'offre est assez focalisee pour une presentation premium avec histoire, preuves, benefices et conversion.",
      pt: "A oferta e focada o suficiente para uma apresentacao premium com historia, prova, beneficios e conversao.",
    });
  }
  if (templateId === "restaurant-food-business") return langText({ en: "The business needs menu discovery and ordering/contact, so LYRA should use a restaurant menu architecture.", es: "El negocio necesita menu, descubrimiento y pedido/contacto, asi que LYRA debe usar arquitectura de restaurante.", fr: "Le business demande menu, decouverte et commande/contact.", pt: "O negocio precisa de menu, descoberta e pedido/contato." });
  if (templateId === "booking-appointment-pro") return langText({ en: "The core action is scheduling, so LYRA should make booking and services the main conversion path.", es: "La accion central es agendar, asi que LYRA debe poner reservas y servicios como conversion principal.", fr: "L'action principale est la reservation.", pt: "A acao principal e agendamento." });
  if (templateId) return langText({
    en: `LYRA selected ${localizedTemplateName(templatePreviewMeta(templateId)) || templateId} because it best matches ${websiteType.replace(/_/g, " ")}.`,
    es: `LYRA selecciono ${localizedTemplateName(templatePreviewMeta(templateId)) || templateId} porque encaja mejor con ${websiteType.replace(/_/g, " ")}.`,
    fr: `LYRA a choisi ${localizedTemplateName(templatePreviewMeta(templateId)) || templateId} car il correspond a ${websiteType.replace(/_/g, " ")}.`,
    pt: `A LYRA escolheu ${localizedTemplateName(templatePreviewMeta(templateId)) || templateId} porque combina melhor com ${websiteType.replace(/_/g, " ")}.`,
  });
  return langText({
    en: "LYRA is still identifying the strongest template from the business context.",
    es: "LYRA todavia esta identificando la plantilla mas fuerte segun el contexto del negocio.",
    fr: "LYRA identifie encore le meilleur template selon le contexte.",
    pt: "A LYRA ainda esta identificando o melhor template pelo contexto.",
  });
}

function buildPlanPagesForContext(templateId, websiteType, catalogType) {
  if (templateId === "mega-retail-store" || websiteType === "mega_retail_store") {
    return [
      { key: "home", title: "Home", purpose: "Search, categories, deals, best sellers and trust modules", sections: ["retail_header", "search_hero", "category_rail", "deal_row", "best_seller_grid", "subscribe"] },
      { key: "catalog", title: "Catalog", purpose: "Dense searchable owned product catalog", sections: ["filters", "sort", "product_grid", "ratings", "shipping_badges"] },
      { key: "deals", title: "Deals", purpose: "Promotions, drops and featured offers", sections: ["daily_deals", "featured_collections", "newsletter"] },
      { key: "account", title: "Account / Cart", purpose: "Customer account, cart, checkout path and saved items", sections: ["cart", "wishlist", "checkout", "order_contact"] },
    ];
  }
  if (templateId === "mega-marketplace" || websiteType === "mega_marketplace") {
    return [
      { key: "home", title: "Home", purpose: "Search, categories, deals, best sellers and trust modules", sections: ["marketplace_header", "search_hero", "category_rail", "deal_row", "best_seller_grid", "subscribe"] },
      { key: "catalog", title: "Catalog", purpose: "Dense searchable product catalog", sections: ["filters", "sort", "product_grid", "ratings", "shipping_badges"] },
      { key: "deals", title: "Deals", purpose: "Promotions, drops and featured offers", sections: ["daily_deals", "featured_collections", "newsletter"] },
      { key: "account", title: "Account / Cart", purpose: "Customer account, cart, checkout path and saved items", sections: ["cart", "wishlist", "checkout", "order_contact"] },
    ];
  }
  if (normalizeTemplateId(templateId) === "premium-product-store" || websiteType === "premium_showcase_store") {
    return [
      { key: "home", title: "Home", purpose: "Cinematic product story and premium CTA", sections: ["premium_hero", "feature_spotlight", "proof", "cta"] },
      { key: "catalog", title: "Collection", purpose: "Curated product line or models", sections: ["featured_products", "specs", "comparison"] },
      { key: "story", title: "Story", purpose: "Brand/product positioning and benefits", sections: ["editorial_story", "gallery", "trust"] },
      { key: "buy", title: "Buy / Contact", purpose: "Purchase, quote or lead action", sections: ["checkout_or_inquiry", "faq", "support"] },
    ];
  }
  return buildSitePlan({ templateId, catalogType, template: builderState.forcedTemplateSelection?.template || {} }).pages;
}

function buildSitePlan(selection = builderState.forcedTemplateSelection) {
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
  const currentTemplateId = builderState.forcedTemplateSelection?.templateId || builderState.guidedState.sitePlan?.templateId || "";
  if (!builderState.guidedState.sitePlan || builderState.guidedState.sitePlan.templateId !== currentTemplateId) {
    builderState.guidedState.sitePlan = buildSitePlan();
    builderState.guidedState.sitePlanApproved = false;
  }
  return builderState.guidedState.sitePlan;
}

function renderSitePlanCard() {
  const plan = ensureSitePlan();
  const card = document.createElement("section");
  card.className = `site-plan-card ${builderState.guidedState.sitePlanApproved ? "approved" : ""}`;
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
      <button type="button" data-site-plan-approve>${escapeHtml(builderState.guidedState.sitePlanApproved ? langText({ en: "Approved", es: "Aprobado", fr: "Approuvé", pt: "Aprovado" }) : langText({ en: "Approve this structure", es: "Aprobar estructura", fr: "Approuver la structure", pt: "Aprovar estrutura" }))}</button>
      <button type="button" data-site-plan-adjust>${escapeHtml(langText({ en: "Ask LYRA to change it", es: "Pedir cambio a LYRA", fr: "Demander un changement", pt: "Pedir mudança à LYRA" }))}</button>
    </div>
  `;
  card.querySelector("[data-site-plan-approve]")?.addEventListener("click", () => {
    builderState.guidedState.sitePlanApproved = true;
    builderState.guidedState.sitePlan = { ...builderState.guidedState.sitePlan, approved: true };
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
    builderState.guidedStep = "review";
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
  if (!document.body.classList.contains("lyra-debug-mode")) return;
  if (!selection?.templateId) {
    appendChatMessage("assistant", langText({
      en: "I understand the general goal. I will choose the visual structure after I know what you sell or offer.",
      es: "Entiendo el objetivo general. Elegire la estructura visual cuando sepa que vendes u ofreces.",
      fr: "Je comprends l'objectif general. Je choisirai la structure visuelle apres avoir compris l'offre.",
      pt: "Entendi o objetivo geral. Vou escolher a estrutura visual depois de entender o que voce vende ou oferece.",
    }), "thinking");
    return;
  }
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
  if (isPublicClientSetup) {
    renderLiveSitePreview();
    return;
  }
  const selectedId = selection?.templateId || "";
  const choices = await getTemplatePreviewCandidates(selection, sourceMessage);
  const card = document.createElement("div");
  card.className = "template-choice-panel template-carousel-panel";
  const heading = document.createElement("div");
  heading.className = "template-choice-heading template-carousel-heading";
  heading.innerHTML = `<strong>${escapeHtml(langText({
    en: "Select an architecture",
    es: "Selecciona una arquitectura",
    fr: "Selectionnez une architecture",
    pt: "Selecione uma arquitetura",
  }))}</strong><span>${escapeHtml(langText({
    en: "Choose the base. LYRA adapts copy, catalog, colors and user flow.",
    es: "Elige la base. LYRA adapta textos, catalogo, colores y flujo de usuario.",
    fr: "Choisissez la base. LYRA adapte textes, catalogue, couleurs et parcours.",
    pt: "Escolha a base. A LYRA adapta textos, catalogo, cores e fluxo.",
  }))}</span>`;
  const grid = document.createElement("div");
  grid.className = "template-choice-grid template-carousel-track template-coverflow-track";
  grid.setAttribute("aria-label", "Template carousel");
  choices.forEach((choice, index) => {
    const item = document.createElement("article");
    item.className = `template-choice-card template-carousel-card template-coverflow-card ${choice.templateId === selectedId || index === 0 ? "active-card recommended" : ""}`;
    item.dataset.templateChoice = choice.templateId;
    item.dataset.catalogType = choice.catalogType || "";
    item.tabIndex = 0;
    item.innerHTML = `
      <div class="template-carousel-image" role="img" aria-label="${escapeAttribute(localizedTemplateName(choice))} preview">
        ${templateLivePreviewMarkup(choice)}
      </div>
      <div class="template-carousel-body">
        <span>${escapeHtml(choice.templateId === selectedId || index === 0 ? langText({ en: "Recommended", es: "Recomendada", fr: "Recommandee", pt: "Recomendada" }) : langText({ en: "Alternative", es: "Alternativa", fr: "Alternative", pt: "Alternativa" }))}</span>
        <strong>${escapeHtml(localizedTemplateName(choice))}</strong>
        <small>${escapeHtml(localizedTemplateDescription(choice))}</small>
        <em>${escapeHtml(choice.catalogType || "")}</em>
        <button type="button" data-template-preview="${escapeAttribute(choice.templateId)}">${escapeHtml(langText({ en: "Preview", es: "Previsualizar", fr: "Previsualiser", pt: "Previsualizar" }))}</button>
      </div>
    `;
    item.querySelector("[data-template-preview]")?.addEventListener("click", (event) => {
      event.stopPropagation();
      chooseTemplatePreview(choice, { hideCarousel: true, fadeCanvas: true });
    });
    item.addEventListener("click", () => {
      item.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      updateTemplateCarouselActiveCard(grid);
    });
    grid.appendChild(item);
  });
  card.append(heading, grid);
  guidedChat.appendChild(card);
  initTemplateCarousel(grid);
  guidedChat.scrollTop = guidedChat.scrollHeight;
}

function initTemplateCarousel(track) {
  if (!track || track.dataset.carouselReady === "1") return;
  track.dataset.carouselReady = "1";
  let rafId = 0;
  const schedule = () => {
    cancelAnimationFrame(rafId);
    updateTemplateCarouselActiveCard(track);
    rafId = requestAnimationFrame(() => updateTemplateCarouselActiveCard(track));
  };
  track.addEventListener("click", (event) => {
    if (event.target?.closest?.("[data-template-preview]")) return;
    const card = event.target?.closest?.(".template-carousel-card");
    if (!card) return;
    card.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    schedule();
  });
  track.addEventListener("keydown", (event) => {
    if (!["Enter", " "].includes(event.key)) return;
    const card = event.target?.closest?.(".template-carousel-card");
    if (!card) return;
    event.preventDefault();
    card.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    schedule();
  });
  track.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  schedule();
}

function updateTemplateCarouselActiveCard(track) {
  if (!track) return;
  const cards = [...track.querySelectorAll(".template-carousel-card")];
  if (!cards.length) return;
  const trackRect = track.getBoundingClientRect();
  const center = trackRect.left + trackRect.width / 2;
  let active = cards[0];
  let smallestDistance = Infinity;
  cards.forEach((card) => {
    const rect = card.getBoundingClientRect();
    const cardCenter = rect.left + rect.width / 2;
    const distance = Math.abs(center - cardCenter);
    if (distance < smallestDistance) {
      active = card;
      smallestDistance = distance;
    }
  });
  cards.forEach((card) => {
    const rect = card.getBoundingClientRect();
    const cardCenter = rect.left + rect.width / 2;
    const cardWidth = Math.max(1, rect.width);
    const rawOffset = (cardCenter - center) / cardWidth;
    const offset = Math.max(-2.4, Math.min(2.4, rawOffset));
    const distance = Math.min(2.4, Math.abs(offset));
    const rotate = -offset * 17;
    const scale = Math.max(0.78, 1 - distance * 0.085);
    const depth = Math.max(-30, 26 - distance * 24);
    const shift = -offset * 14;
    const opacity = Math.max(0.62, 1 - distance * 0.16);
    const brightness = Math.max(0.86, 1 - distance * 0.055);
    const saturate = Math.max(0.78, 1 - distance * 0.07);
    card.style.setProperty("--coverflow-rotate", `${rotate.toFixed(2)}deg`);
    card.style.setProperty("--coverflow-scale", scale.toFixed(3));
    card.style.setProperty("--coverflow-depth", `${depth.toFixed(1)}px`);
    card.style.setProperty("--coverflow-shift", `${shift.toFixed(1)}px`);
    card.style.setProperty("--coverflow-opacity", opacity.toFixed(3));
    card.style.setProperty("--coverflow-brightness", brightness.toFixed(3));
    card.style.setProperty("--coverflow-saturate", saturate.toFixed(3));
    card.style.setProperty("--coverflow-z", String(Math.round(100 - distance * 18)));
    card.classList.toggle("active-card", card === active);
    card.setAttribute("aria-current", card === active ? "true" : "false");
  });
}

async function chooseTemplatePreview(choice, options = {}) {
  const template = window.TemplateRouter?.getTemplateById
    ? await window.TemplateRouter.getTemplateById(choice.templateId)
    : null;
  builderState.forcedTemplateSelection = {
    templateId: choice.templateId,
    template,
    catalogType: choice.catalogType,
    intent: "client_visual_template_choice",
    reason: "Client selected a visual template preview in guided setup",
    executionStatus: templateExecutionStatus(choice.templateId),
  };
  builderState.guidedState.websiteIntent = builderState.guidedState.websiteIntent || localizedTemplateName(choice);
  document.querySelectorAll(".template-choice-card.selected").forEach((card) => card.classList.remove("selected"));
  document.querySelector(`[data-template-choice="${cssEscape(choice.templateId)}"]`)?.classList.add("selected");
  if (options.hideCarousel) {
    document.querySelectorAll(".template-carousel-panel").forEach((panel) => {
      panel.classList.add("template-carousel-panel-hidden");
    });
  }
  if (options.fadeCanvas && liveSitePreviewMount) {
    liveSitePreviewMount.classList.remove("canvas-fade-in");
    void liveSitePreviewMount.offsetWidth;
    liveSitePreviewMount.classList.add("canvas-fade-in");
  }
  renderLiveSitePreview();
  appendChatMessage(
    "user",
    langText({
      en: `Use ${localizedTemplateName(choice)}`,
      es: `Usar ${localizedTemplateName(choice)}`,
      fr: `Utiliser ${localizedTemplateName(choice)}`,
      pt: `Usar ${localizedTemplateName(choice)}`,
    }),
  );
  appendTemplateDetectionMessage(builderState.forcedTemplateSelection);
  renderGuidedCoachCard();
  renderGuidedSummary();
  saveGuidedDraft();
}

window.Lyra = {
  ...(window.Lyra || {}),
  async selectTemplate(templateId) {
    const choice = templatePreviewMeta(templateId);
    if (!choice) return null;
    await chooseTemplatePreview(choice, { hideCarousel: true, fadeCanvas: true });
    return builderState.forcedTemplateSelection;
  },
};



function letAiDecide(field) {
  const decision = t("letAiDecide");
  if (field === "preferredColors") {
    builderState.guidedState.preferredColors = [decision];
  } else if (field === "sectionsPreference") {
    builderState.guidedState.sectionsPreference = decision;
  } else {
    builderState.guidedState[field] = decision;
  }
  builderState.guidedStep = field === "sectionsPreference" ? "review" : nextSmartGuidedStep(field);
  appendChatMessage("user", `${field}: ${decision}`);
  appendChatMessage("assistant", guidedQuestion(builderState.guidedStep), builderState.guidedStep === "review" ? "success" : "speaking");
  renderGuidedSummary();
}

function insertQuickChip(value) {
  const translated = translateChip(value);
  if (builderState.guidedStep === "websiteIntent") {
    guidedReply.value = translated;
    updateAssetPromptVisibility();
    handleGuidedSendAction();
    return;
  }
  if (value === "Yes, correct") {
    builderState.guidedStep = nextSmartGuidedStep(builderState.guidedStep);
    appendChatMessage("user", translated);
    appendChatMessage("assistant", guidedQuestion(builderState.guidedStep), builderState.guidedStep === "review" ? "success" : "speaking");
    renderGuidedSummary();
    refreshQuickChips();
    return;
  }
  if (value === "Change style") {
    builderState.guidedStep = "preferredTone";
    guidedReply.value = "";
    appendChatMessage("user", translated);
    appendChatMessage("assistant", guidedQuestion(builderState.guidedStep), "speaking");
    renderGuidedSummary();
    refreshQuickChips();
    guidedReply.focus();
    return;
  }
  if (value === "Upload logo") {
    guidedLogoUpload.click();
    return;
  }
  if (value === "Continue without logo") {
    builderState.guidedState.hasLogoPhotos = langText({
      en: "Continue without a logo",
      es: "Seguir sin logo",
      fr: "Continuer sans logo",
      pt: "Continuar sem logo",
    });
    builderState.guidedState.logoPreference = "text_only";
    builderState.guidedState.aiGeneratedLogoRequested = false;
    builderState.guidedStep = nextSmartGuidedStep("hasLogoPhotos");
    appendChatMessage("user", translated);
    appendChatMessage("assistant", guidedQuestion(builderState.guidedStep), builderState.guidedStep === "review" ? "success" : "speaking");
    renderGuidedSummary();
    refreshQuickChips();
    return;
  }
  if (value === "Review details") {
    openReviewDetails();
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

export function refreshQuickChips() {
  const chipsByStep = {
    websiteIntent: ["Sell online", "Show catalog", "Booking", "Request quotes"],
    preferredTone: ["Elegant", "Modern", "Warm", "Let AI decide"],
    preferredColors: ["Let AI choose", "Use my logo colors", "I have specific colors"],
    salesMode: ["Sell online", "Request quotes", "Calls/messages", "Not sure"],
    targetAudience: ["Local customers", "Families", "Professionals", "Let AI decide"],
    hasLogoPhotos: ["Upload logo", "Continue without logo"],
    review: [],
  };
  const chips = (chipsByStep[builderState.guidedStep] || []).slice(0, 4);
  quickChipRow.innerHTML = chips
    .map((chip) => `<button data-chip="${escapeAttribute(chip)}" type="button">${escapeHtml(translateChip(chip))}</button>`)
    .join("");
  quickChipRow.querySelectorAll("[data-chip]").forEach((button) => {
    button.addEventListener("click", () => insertQuickChip(button.dataset.chip));
  });
  updateAssetPromptVisibility();
}





function wantsAiGeneratedLogo(value, options = {}) {
  const text = String(value || "").toLowerCase();
  const logoContext = options.assumeLogoContext || /logo|brand mark|marca visual|identidad visual|brand identity/.test(text);
  const directCreateRequest = /no tengo logo|sin logo|crea(?:r)?(?:me)?(?: un)? logo|crear(?: un)? logo|generate(?: a)? logo|make(?: a)? logo|haz(?:me)?(?: un)? logo|diseñ(?:a|ar)(?: un)? logo|disena(?:r)?(?: un)? logo|gen[eé]rame(?: un)? logo/.test(text);
  const delegatedCreation = /(?:lyra|ia|ai|tu|t[uú]|you)\s+(?:decide|elige|choose|hazlo|create it)|(?:decide|elige|hazlo|crealo|créalo|generalo|gen[eé]ralo)\s+(?:tu|t[uú]|lyra|ia|ai|you)|sorpr[eé]ndeme|surprise me|you decide/.test(text);
  return directCreateRequest || (logoContext && delegatedCreation);
}

function logoPreferenceFromText(value, options = {}) {
  return wantsAiGeneratedLogo(value, options) ? "generate_ai_logo" : "";
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
      "Show catalog": "Mostrar catalogo",
      "Business info site": "Pagina informativa",
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
      "Continue without logo": "Seguir sin logo",
      "Review details": "Revisar detalles",
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
      "Show catalog": "Afficher un catalogue",
      "Business info site": "Site d'information",
      Marketplace: "Marketplace",
      Booking: "Réservation",
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
      "Continue without logo": "Continuer sans logo",
      "Review details": "Vérifier les détails",
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
      "Show catalog": "Mostrar catalogo",
      "Business info site": "Site informativo",
      Marketplace: "Marketplace",
      Booking: "Agendamento",
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
      "Continue without logo": "Continuar sem logo",
      "Review details": "Revisar detalhes",
    },
  };
  return dictionary[builderState.selectedLanguage]?.[value] || value;
}

async function handleGuidedLogoUpload() {
  const file = guidedLogoUpload.files?.[0];
  if (!file) return;
  await processGuidedLogoFile(file);
}

async function processGuidedLogoFile(file) {
  if (!file || !file.type?.startsWith("image/")) return;
  const localLogoUrl = await fileToDataUrl(file);
  let storedLogoUrl = localLogoUrl;
  try {
    storedLogoUrl = await uploadAssetOrFallback(file, "logo", "Uploaded logo");
  } catch {
    storedLogoUrl = localLogoUrl;
  }
  builderState.guidedState.logoUrl = storedLogoUrl || localLogoUrl;
  builderState.guidedState.hasLogo = true;
  const brand = await analyzeLogoBrand(localLogoUrl, {
    logoUrl: builderState.guidedState.logoUrl,
    businessName: builderState.guidedState.businessName,
    industry: builderState.guidedState.industry,
    tone: builderState.guidedState.preferredTone,
  });
  const palette = brand.extractedColors || [];
  builderState.guidedState.logoPalette = palette;
  builderState.guidedState.brand = brand;
  if (palette.length) {
    builderState.guidedState.preferredColors = palette;
  }
  builderState.guidedState.hasLogoPhotos = builderState.guidedState.hasPhotos ? "Logo and photos uploaded" : "Logo uploaded";
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
  await processGuidedPhotoFiles(files.filter((file) => file.type?.startsWith("image/")));
  await processGuidedVideoFiles(files.filter((file) => file.type?.startsWith("video/")));
}

async function processGuidedPhotoFiles(files) {
  files = arrayValue(files).filter((file) => file?.size > 0 && file.type?.startsWith("image/"));
  if (!files.length) return;
  const urls = [];
  for (const file of files) {
    urls.push(await fileToDataUrl(file));
  }
  builderState.guidedState.photoUrls = [...arrayValue(builderState.guidedState.photoUrls), ...urls];
  builderState.guidedState.hasPhotos = true;
  builderState.guidedState.hasLogoPhotos = builderState.guidedState.hasLogo ? "Logo and photos uploaded" : "Photos uploaded";
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

async function processGuidedVideoFiles(files) {
  files = arrayValue(files).filter((file) => file?.size > 0 && file.type?.startsWith("video/"));
  if (!files.length) return;
  const urls = [];
  for (const file of files) {
    try {
      const uploaded = await uploadAssetFile(file, "video", `Uploaded video ${urls.length + 1}`);
      if (uploaded?.url) {
        urls.push(uploaded.url);
      }
    } catch (error) {
      console.warn("Video upload failed; keeping it as a session-only reference.", error);
    }
  }
  builderState.guidedState.videoUrls = [...arrayValue(builderState.guidedState.videoUrls), ...urls];
  builderState.guidedState.hasPhotos = true;
  builderState.guidedState.hasLogoPhotos = builderState.guidedState.hasLogo ? "Logo, photos and videos uploaded" : "Photos/videos uploaded";
  appendChatMessage(
    "assistant",
    urls.length
      ? langText({
          en: "Video received and saved as a visual reference for the draft.",
          es: "Video recibido y guardado como referencia visual para el borrador.",
          fr: "Video recue et enregistree comme reference visuelle pour le brouillon.",
          pt: "Video recebido e salvo como referencia visual para o rascunho.",
        })
      : langText({
          en: "I received the video as a session reference. For publishing, upload a smaller file or use cloud storage later.",
          es: "Recibí el video como referencia de esta sesión. Para publicar, luego usa un archivo más pequeño o almacenamiento en la nube.",
          fr: "J'ai recu la video comme reference de session. Pour publier, utilisez ensuite un fichier plus petit ou un stockage cloud.",
          pt: "Recebi o video como referencia desta sessao. Para publicar, depois use um arquivo menor ou armazenamento em nuvem.",
        }),
    "success",
  );
  renderGuidedSummary();
  saveGuidedDraft();
}

function initGuidedMediaDrop() {
  if (!isPublicClientSetup || !guidedPanel || !guidedChatCard) return;
  const dropTargets = [guidedPanel, guidedChatCard, guidedChat].filter(Boolean);
  let dragDepth = 0;
  const setActive = (active) => {
    guidedChatCard.dataset.dropLabel = langText({
      en: "Drop images or videos for LYRA",
      es: "Suelta imágenes o videos para LYRA",
      fr: "Déposez images ou vidéos pour LYRA",
      pt: "Solte imagens ou videos para a LYRA",
    });
    guidedPanel.classList.toggle("media-drop-active", active);
    setAssistantState(active ? "listening" : "neutral");
  };
  dropTargets.forEach((target) => {
    target.addEventListener("dragenter", (event) => {
      if (!event.dataTransfer?.types?.includes("Files")) return;
      event.preventDefault();
      event.stopPropagation();
      dragDepth += 1;
      setActive(true);
    });
    target.addEventListener("dragover", (event) => {
      if (!event.dataTransfer?.types?.includes("Files")) return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "copy";
      setActive(true);
    });
    target.addEventListener("dragleave", (event) => {
      event.stopPropagation();
      dragDepth = Math.max(0, dragDepth - 1);
      if (!dragDepth) setActive(false);
    });
    target.addEventListener("drop", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      dragDepth = 0;
      setActive(false);
      const files = Array.from(event.dataTransfer?.files || []);
      await receiveGuidedDroppedFiles(files);
    });
  });
}

async function receiveGuidedDroppedFiles(files) {
  const supported = arrayValue(files).filter((file) => file?.type?.startsWith("image/") || file?.type?.startsWith("video/"));
  if (!supported.length) {
    appendChatMessage("assistant", langText({
      en: "Drop images or videos here and I will use them as visual references.",
      es: "Arrastra imágenes o videos aquí y los usaré como referencias visuales.",
      fr: "Deposez ici des images ou videos et je les utiliserai comme references visuelles.",
      pt: "Arraste imagens ou videos aqui e eu usarei como referencias visuais.",
    }), "alert");
    return;
  }
  const images = supported.filter((file) => file.type.startsWith("image/"));
  const videos = supported.filter((file) => file.type.startsWith("video/"));
  const logoFile = images.find((file) => /logo|brand|marca/i.test(file.name || ""))
    || (!builderState.guidedState.logoUrl && builderState.guidedStep === "preferredColors" && images.length === 1 ? images[0] : null);
  const photoFiles = images.filter((file) => file !== logoFile);
  if (logoFile) await processGuidedLogoFile(logoFile);
  if (photoFiles.length) await processGuidedPhotoFiles(photoFiles);
  if (videos.length) await processGuidedVideoFiles(videos);
  guidedStatusText.textContent = langText({
    en: "Media received. LYRA will use it as visual direction.",
    es: "Archivo recibido. LYRA lo usará como dirección visual.",
    fr: "Media recu. LYRA l'utilisera comme direction visuelle.",
    pt: "Arquivo recebido. A LYRA usara como direcao visual.",
  });
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
  const briefText = [
    input.businessName,
    input.industry,
    input.tone,
    arrayValue(input.preferredColors).join(" "),
  ].join(" ");
  if (briefRequestsCyberpunk(briefText)) {
    return {
      ...DEFAULT_BRAND,
      logoUrl: input.logoUrl || "",
      primaryColor: "#00f5ff",
      secondaryColor: "#ff2bd6",
      accentColor: "#a855f7",
      backgroundColor: "#070714",
      surfaceColor: "#111126",
      textColor: "#f8fbff",
      mutedTextColor: "#a7b0ff",
      borderColor: "rgba(0, 245, 255, 0.24)",
      buttonColor: "#00f5ff",
      buttonTextColor: "#050814",
      styleDirection: "cyberpunk neon marketplace",
      fontPairing: { heading: "Space Grotesk", body: "Inter" },
      borderRadius: "10px",
      shadowStyle: "0 22px 70px rgba(0, 245, 255, 0.22)",
      extractedColors: [],
      paletteSource: "ai_style_keyword",
    };
  }
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





function applyBrandToCurrentSchema(brand) {
  if (!builderState.currentSchema || !brand) return;
  builderState.currentSchema = applyBrandSystemToSchema(builderState.currentSchema, brand);
  builderState.currentCatalogItems = catalogItemsFromSchema(builderState.currentSchema);
  renderEditor();
  renderPreview();
}

export async function reviewAndGenerateFromGuided() {
  syncGuidedStateFromSummary();
  normalizeGuidedStateBeforeGenerate();
  applyGuidedStateToForm();
  const previousText = guidedGenerateButton.textContent;
  setGuidedGenerateControlsBusy(true, langText({
    en: "Saving request...",
    es: "Guardando solicitud...",
    fr: "Enregistrement de la demande...",
    pt: "Salvando solicitação...",
  }));
  setGuidedBuildPhase("save");
  guidedStatusText.textContent = t("savingRequest");

  try {
    const saved = await saveGuidedClientRequest();
    if (saved.request_id) builderState.currentRequestId = saved.request_id;
    guidedStatusText.textContent =
      saved.storage_status === "stored"
        ? `Client request saved: ${saved.request_number || saved.request_id}`
        : t("requestNotSaved");
  } catch (error) {
    guidedStatusText.textContent = t("requestNotSaved");
  }

  setGuidedGenerateControlsBusy(true, t("generating"));
  setGuidedBuildPhase("strategy");
  guidedStatusText.textContent = t("generatingLong");
  const generated = await generateWebsite(guidedGenerateButton);
  if (generated && builderState.currentSchema) {
    setGuidedBuildPhase("ready");
    const successMessage = langText({
      en: "Draft generated. You can review and edit it now.",
      es: "Borrador generado. Ya puedes revisarlo y editarlo.",
      fr: "Brouillon généré. Vous pouvez maintenant le réviser et le modifier.",
      pt: "Rascunho gerado. Agora você pode revisar e editar.",
    });
    guidedStatusText.textContent = successMessage;
    appendChatMessage("assistant", successMessage, "success");
    showGeneratedClientPreview();
  } else if (generated === "needs_more_info") {
    guidedStatusText.textContent = langText({
      en: "LYRA needs one more detail before generating. Answer the question above and try again.",
      es: "LYRA necesita un dato más antes de generar. Responde la pregunta de arriba e intenta otra vez.",
      fr: "LYRA a besoin d'un détail de plus avant de générer. Répondez à la question ci-dessus puis réessayez.",
      pt: "A LYRA precisa de mais um detalhe antes de gerar. Responda à pergunta acima e tente novamente.",
    });
  } else {
    setGuidedBuildPhase("error");
    guidedStatusText.textContent = langText({
      en: "LYRA could not create a draft yet. Try again or keep chatting with more details.",
      es: "LYRA no pudo crear el borrador todavía. Intenta otra vez o agrega más detalles.",
      fr: "LYRA n'a pas encore pu créer de brouillon. Réessayez ou ajoutez plus de détails.",
      pt: "A LYRA ainda não conseguiu criar o rascunho. Tente novamente ou adicione mais detalhes.",
    });
  }
  guidedGenerateButton.textContent = previousText || t("reviewGenerate");
  setGuidedGenerateControlsBusy(false);
}

function setGuidedGenerateControlsBusy(isBusy, label = "") {
  const readyLabel = langText({
    en: "Generate website now",
    es: "Generar pagina ahora",
    fr: "Generer maintenant",
    pt: "Gerar site agora",
  });
  document.querySelectorAll("[data-chat-generate]").forEach((button) => {
    button.disabled = Boolean(isBusy);
    button.setAttribute("aria-busy", isBusy ? "true" : "false");
    button.textContent = isBusy ? label || t("generating") : readyLabel;
  });
  if (guidedGenerateButton) {
    guidedGenerateButton.disabled = Boolean(isBusy);
    guidedGenerateButton.setAttribute("aria-busy", isBusy ? "true" : "false");
    if (isBusy) guidedGenerateButton.textContent = label || t("generating");
  }
}

export async function handleGuidedGenerateButton(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  if (builderState.isGeneratingWebsite) return;
  if (isPublicClientSetup && !hasStudioAccountSession()) {
    promptAccountBeforeGenerate();
    return;
  }
  syncGuidedStateFromSummary();
  normalizeGuidedStateBeforeGenerate();
  const requiredMissing = REQUIRED_GUIDED_STEPS.filter((step) => !isGuidedStepAnswered(step));
  if (requiredMissing.length) {
    const nextMissing = requiredMissing[0];
    builderState.guidedStep = nextMissing;
    document.body.classList.remove("review-details-open", "final-review-mode");
    appendChatMessage("assistant", langText({
      en: `I still need one key detail before generating:\n\n${guidedQuestion(nextMissing)}`,
      es: `Todavía necesito un dato clave antes de generar:\n\n${guidedQuestion(nextMissing)}`,
      fr: `Il me manque encore un détail clé avant de générer :\n\n${guidedQuestion(nextMissing)}`,
      pt: `Ainda preciso de um detalhe importante antes de gerar:\n\n${guidedQuestion(nextMissing)}`,
    }), "alert");
    guidedStatusText.textContent = langText({
      en: "Answer the missing detail, then generate.",
      es: "Responde ese dato y luego genera.",
      fr: "Répondez à ce détail, puis générez.",
      pt: "Responda esse detalhe e depois gere.",
    });
    renderGuidedSummary();
    refreshQuickChips();
    guidedReply.focus();
    return;
  }
  builderState.guidedStep = "review";
  document.body.classList.remove("review-details-open");
  renderGuidedSummary();
  setGuidedGenerateControlsBusy(true, t("generating"));
  setGuidedBuildPhase("save");
  guidedStatusText.textContent = t("generatingLong");
  builderState.isGeneratingWebsite = true;
  try {
    await reviewAndGenerateFromGuided();
  } catch (error) {
    console.error("Guided website generation failed", error);
    const message = `${t("generateError")}: ${shortError(error?.message || error)}`;
    guidedStatusText.textContent = message;
    appendChatMessage("assistant", langText({
      en: `${message}. I could not finish the draft from this click. Try again or add one more detail and I will retry.`,
      es: `${message}. No pude terminar el borrador con este click. Intenta otra vez o agrega un detalle más y lo vuelvo a intentar.`,
      fr: `${message}. Je n'ai pas pu terminer le brouillon avec ce clic. Réessayez ou ajoutez un détail et je recommence.`,
      pt: `${message}. Não consegui terminar o rascunho com este clique. Tente novamente ou adicione mais um detalhe e eu tento de novo.`,
    }), "alert");
  } finally {
    builderState.isGeneratingWebsite = false;
    setGuidedGenerateControlsBusy(false);
    guidedGenerateButton.textContent = t("reviewGenerate");
  }
}

function promptAccountBeforeGenerate() {
  syncGuidedStateFromSummary();
  normalizeGuidedStateBeforeGenerate();
  applyGuidedStateToForm();
  persistPendingStudioAccountAction("generate");
  openStudioAuthGate("generate");
  const email = builderState.guidedState.contactInfo?.email || builderState.guidedState.contactInfo?.contact || "";
  if (studioAuthEmail && email) studioAuthEmail.value = email;
  appendChatMessage("assistant", langText({
    en: "Before I generate it, connect an account so your draft is saved and you can come back later. You can use Google, Apple, or email.",
    es: "Antes de generarla, conecta una cuenta para guardar tu borrador y poder volver luego. Puedes usar Google, Apple o email.",
    fr: "Avant de générer, connectez un compte pour sauvegarder le brouillon et revenir plus tard. Vous pouvez utiliser Google, Apple ou email.",
    pt: "Antes de gerar, conecte uma conta para salvar o rascunho e voltar depois. Você pode usar Google, Apple ou email.",
  }), "success");
  guidedStatusText.textContent = langText({
    en: "Connect an account to save and generate the draft.",
    es: "Conecta una cuenta para guardar y generar el borrador.",
    fr: "Connectez un compte pour sauvegarder et générer le brouillon.",
    pt: "Conecte uma conta para salvar e gerar o rascunho.",
  });
}

function normalizeGuidedStateBeforeGenerate() {
  const services = meaningfulOfferItems(builderState.guidedState.servicesProducts);
  if (!services.length) {
    services.push(
      builderState.guidedState.industry ||
        builderState.guidedState.businessDescription ||
        langText({
          en: "AI-defined offer",
          es: "oferta definida por IA",
          fr: "offre definie par IA",
          pt: "oferta definida por IA",
        })
    );
  }
  builderState.guidedState.businessName = builderState.guidedState.businessName || t("newClientWebsite");
  builderState.guidedState.industry = builderState.guidedState.industry || t("generalBusiness");
  builderState.guidedState.businessDescription =
    builderState.guidedState.businessDescription ||
    langText({
      en: `Professional website for ${builderState.guidedState.businessName} focused on ${services.join(", ") || builderState.guidedState.industry}.`,
      es: `Pagina profesional para ${builderState.guidedState.businessName} enfocada en ${services.join(", ") || builderState.guidedState.industry}.`,
      fr: `Site professionnel pour ${builderState.guidedState.businessName} axé sur ${services.join(", ") || builderState.guidedState.industry}.`,
      pt: `Site profissional para ${builderState.guidedState.businessName} focado em ${services.join(", ") || builderState.guidedState.industry}.`,
    });
  builderState.guidedState.servicesProducts = services;
  builderState.guidedState.targetAudience = builderState.guidedState.targetAudience || t("letAiDecide");
  builderState.guidedState.preferredTone = builderState.guidedState.preferredTone || t("letAiDecide");
  builderState.guidedState.preferredColors = arrayValue(builderState.guidedState.preferredColors).length
    ? arrayValue(builderState.guidedState.preferredColors)
    : arrayValue(builderState.guidedState.logoPalette).length
      ? arrayValue(builderState.guidedState.logoPalette)
      : [t("letAiDecide")];
  if (builderState.guidedState.aiGeneratedLogoRequested && !builderState.guidedState.logoPreference) {
    builderState.guidedState.logoPreference = "generate_ai_logo";
  }
  builderState.guidedState.contactInfo = builderState.guidedState.contactInfo || {};
  builderState.guidedState.salesMode = builderState.guidedState.salesMode || t("letAiDecide");
  if (!builderState.guidedState.industry || builderState.guidedState.industry === t("generalBusiness")) {
    builderState.guidedState.industry = inferCommerceIndustry(builderState.guidedState);
  }
  const aiStudioPlan = refreshAiStudioPlanFromContext();
  builderState.guidedState.sitePlan = builderState.guidedState.sitePlan || buildSitePlan(builderState.forcedTemplateSelection);
  if (builderState.guidedState.sitePlan) builderState.guidedState.sitePlan.aiStudioPlan = aiStudioPlan;
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
  if (builderState.clientIntakeSession?.clientEmail) {
    const session = await createOrResumeClientIntakeSession({
      email: builderState.clientIntakeSession.clientEmail,
      name: builderState.guidedState.contactInfo?.name || builderState.guidedState.businessName || "",
      reason: "final-save",
    });
    return {
      request_id: session.requestId,
      request_number: session.requestNumber,
      storage_status: session.storageStatus,
    };
  }
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
  builderState.guidedState = {
    ...builderState.guidedState,
    businessName: data.get("business_name")?.toString().trim() || builderState.guidedState.businessName,
    businessDescription: data.get("business_description")?.toString().trim() || builderState.guidedState.businessDescription,
    industry: data.get("industry")?.toString().trim() || builderState.guidedState.industry,
    location: data.get("location")?.toString().trim() || builderState.guidedState.location,
    servicesProducts: splitCommaOrLines(data.get("services_products")?.toString() || "").length
      ? splitCommaOrLines(data.get("services_products")?.toString() || "")
      : builderState.guidedState.servicesProducts,
    targetAudience: data.get("target_audience")?.toString().trim() || builderState.guidedState.targetAudience,
    preferredTone: data.get("preferred_tone")?.toString().trim() || builderState.guidedState.preferredTone,
    preferredColors: splitCommaOrLines(data.get("preferred_colors")?.toString() || "").length
      ? splitCommaOrLines(data.get("preferred_colors")?.toString() || "")
      : builderState.guidedState.preferredColors,
    contactInfo: Object.keys(parseKeyValueLines(data.get("contact_info")?.toString() || "")).length
      ? parseKeyValueLines(data.get("contact_info")?.toString() || "")
      : builderState.guidedState.contactInfo,
    logoUrl: data.get("logo_url")?.toString().trim() || builderState.guidedState.logoUrl,
    photoUrls: splitLines(data.get("photo_urls")?.toString() || "").length
      ? splitLines(data.get("photo_urls")?.toString() || "")
      : builderState.guidedState.photoUrls,
    selectedLanguage: builderState.selectedLanguage,
    hasLogo: Boolean((data.get("logo_url")?.toString().trim() || builderState.guidedState.logoUrl)),
    hasPhotos: Boolean(splitLines(data.get("photo_urls")?.toString() || "").length || builderState.guidedState.photoUrls.length),
    desiredDomain: data.get("desired_domain")?.toString().trim() || builderState.guidedState.desiredDomain,
  };
}

export function applyGuidedStateToForm() {
  setInputValue("business_name", builderState.guidedState.businessName);
  setInputValue("business_description", builderState.guidedState.businessDescription);
  setInputValue("industry", builderState.guidedState.industry);
  setInputValue("location", builderState.guidedState.location);
  setInputValue("services_products", arrayValue(builderState.guidedState.servicesProducts).join("\n"));
  setInputValue("target_audience", builderState.guidedState.targetAudience);
  setInputValue("preferred_tone", builderState.guidedState.preferredTone);
  setInputValue("preferred_colors", arrayValue(builderState.guidedState.preferredColors).join(", "));
  setInputValue("contact_info", contactInfoToLines(builderState.guidedState.contactInfo));
  setInputValue("desired_domain", builderState.guidedState.desiredDomain);
  setInputValue("logo_url", builderState.guidedState.logoUrl);
  setInputValue("logo_preference", builderState.guidedState.logoPreference || (builderState.guidedState.aiGeneratedLogoRequested ? "generate_ai_logo" : ""));
  setInputValue("photo_urls", arrayValue(builderState.guidedState.photoUrls).join("\n"));
}

export function renderGuidedSummary() {
  syncTemplateSelectionFromGuidedContext();
  builderState.guidedStep = normalizeGuidedStepForCurrentState(builderState.guidedStep);
  syncLyraExperienceMode();
  document.querySelectorAll("[data-summary-field]").forEach((field) => {
    const key = field.dataset.summaryField;
    const value = builderState.guidedState[key];
    if (key === "selectedLanguage") {
      field.value = builderState.selectedLanguage;
    } else if (Array.isArray(value)) {
      field.value = value.join("\n");
    } else if (key === "contactInfo") {
      field.value = contactInfoToLines(value);
    } else {
      field.value = value || "";
    }
  });
  const stepIndex = displayStepIndex(builderState.guidedStep);
  const isFinalReview = builderState.guidedStep === "review";
  if (isFinalReview && builderState.assistantState !== "success") setAssistantState("success");
  guidedStepLabel.textContent = isFinalReview ? t("reviewStep") : `${t("step")} ${stepIndex} ${t("of")} 7`;
  guidedProgressBar.style.width = `${Math.min(100, Math.round((stepIndex / 7) * 100))}%`;
  renderGuidedStepRail(stepIndex);
  document.body.classList.toggle("ready-chat-mode", isFinalReview);
  document.body.classList.remove("final-review-mode");
  guidedGenerateButton.textContent = isFinalReview ? t("generateMyWebsite") : t("reviewGenerate");
  currentInfoPreview.textContent = compactCollectedPreview();
  currentInfoMeta.textContent = conversationProgressLabel();
  renderGuidedCoachCard();
  renderLiveSitePreview();
  renderGuidedBriefReview();
  renderAssetPreviews();
  renderSelectedDomainState();
  updateAssetPromptVisibility();
  renderSitePlanInChatIfNeeded();
  saveGuidedDraft();
}

export function syncLyraExperienceMode() {
  if (!isPublicClientSetup) return;
  const hasGeneratedResult = Boolean(
    builderState.currentSchema ||
    document.body.classList.contains("generated-preview-open") ||
    document.body.classList.contains("client-preview-mode")
  );
  document.body.classList.toggle("lyra-result-mode", hasGeneratedResult);
  document.body.classList.toggle("lyra-conversation-mode", !hasGeneratedResult);
}





function aiBuildFocusLine() {
  const name = builderState.guidedState.businessName || t("newClientWebsite");
  const products = arrayValue(builderState.guidedState.servicesProducts).filter(Boolean).slice(0, 3);
  if (products.length) {
    return langText({
      en: `${name}: LYRA is shaping the site around ${products.join(", ")}.`,
      es: `${name}: LYRA esta armando el sitio alrededor de ${products.join(", ")}.`,
      fr: `${name} : LYRA structure le site autour de ${products.join(", ")}.`,
      pt: `${name}: a LYRA esta montando o site em torno de ${products.join(", ")}.`,
    });
  }
  return langText({
    en: `${name}: LYRA will use the conversation as strategy, not as raw page copy.`,
    es: `${name}: LYRA usara la conversacion como estrategia, no como texto crudo en la pagina.`,
    fr: `${name} : LYRA utilisera la conversation comme strategie, pas comme texte brut.`,
    pt: `${name}: a LYRA usara a conversa como estrategia, nao como texto bruto.`,
  });
}

function aiCatalogStrategyLine(plan) {
  const catalog = `${plan.catalogType || builderState.forcedTemplateSelection?.catalogType || ""}`.toLowerCase();
  if (/single_vendor_dense|dense_retail|retail/.test(catalog)) {
    return langText({
      en: "The products look varied but owned by one business, so LYRA is using a search-first retail store structure instead of a multi-vendor marketplace.",
      es: "Los productos se ven variados pero de un solo negocio, asi que LYRA usa una tienda retail con busqueda, no un marketplace multi-vendedor.",
      fr: "Les produits semblent varies mais geres par une seule entreprise; LYRA utilise donc une boutique retail avec recherche.",
      pt: "Os produtos parecem variados mas de um unico negocio, entao a LYRA usa uma loja retail com busca.",
    });
  }
  if (/dense_marketplace|marketplace/.test(catalog)) {
    return langText({
      en: "The products look varied, so LYRA is using a search-first marketplace structure instead of a single-product landing.",
      es: "Los productos se ven variados, asi que LYRA usa una estructura tipo marketplace con busqueda, no una landing de producto unico.",
      fr: "Les produits semblent varies, donc LYRA utilise une structure marketplace avec recherche.",
      pt: "Os produtos parecem variados, entao a LYRA usa uma estrutura marketplace com busca.",
    });
  }
  if (/premium_editorial/.test(catalog)) {
    return langText({
      en: "The offer looks focused, so LYRA is using a premium product-line presentation with strong story and conversion sections.",
      es: "La oferta se ve enfocada, asi que LYRA usa una presentacion premium de linea de producto con historia y conversion.",
      fr: "L'offre semble ciblee, donc LYRA utilise une presentation premium de gamme produit.",
      pt: "A oferta parece focada, entao a LYRA usa uma apresentacao premium de linha de produto.",
    });
  }
  if (/service|booking|lead|legal|medical/.test(catalog)) {
    return langText({
      en: "The request is service-led, so LYRA is prioritizing trust, proof, process and a clear contact path.",
      es: "La solicitud es de servicios, asi que LYRA prioriza confianza, prueba, proceso y contacto claro.",
      fr: "La demande est orientee service, donc LYRA priorise confiance, preuves et contact clair.",
      pt: "O pedido e de servicos, entao a LYRA prioriza confianca, prova, processo e contato.",
    });
  }
  return langText({
    en: "LYRA is matching the structure to the business type and will keep the generated site editable.",
    es: "LYRA esta ajustando la estructura al tipo de negocio y mantendra el sitio editable.",
    fr: "LYRA adapte la structure au type d'entreprise et gardera le site modifiable.",
    pt: "A LYRA esta ajustando a estrutura ao tipo de negocio e mantera o site editavel.",
  });
}

function aiVisualStrategyLine(plan) {
  const colorSource = arrayValue(builderState.guidedState.logoPalette).length
    ? langText({ en: "logo palette", es: "paleta del logo", fr: "palette du logo", pt: "paleta do logo" })
    : arrayValue(builderState.guidedState.preferredColors).length
      ? arrayValue(builderState.guidedState.preferredColors).join(", ")
      : t("letAiDecide");
  return langText({
    en: `Design direction: ${builderState.guidedState.preferredTone || "AI-selected"} tone, ${colorSource} colors, customer-facing copy rewritten from the conversation.`,
    es: `Direccion visual: tono ${builderState.guidedState.preferredTone || "elegido por IA"}, colores ${colorSource}, copy comercial reescrito desde la conversacion.`,
    fr: `Direction visuelle : ton ${builderState.guidedState.preferredTone || "choisi par IA"}, couleurs ${colorSource}, copy reecrit depuis la conversation.`,
    pt: `Direcao visual: tom ${builderState.guidedState.preferredTone || "escolhido por IA"}, cores ${colorSource}, copy comercial reescrito da conversa.`,
  });
}

function aiSourceSignalList() {
  const signals = [];
  if (builderState.guidedState.businessDescription) signals.push(langText({ en: "business description", es: "descripcion del negocio", fr: "description business", pt: "descricao do negocio" }));
  if (arrayValue(builderState.guidedState.servicesProducts).length) signals.push(langText({ en: "products/services", es: "productos/servicios", fr: "produits/services", pt: "produtos/servicos" }));
  if (builderState.guidedState.salesMode) signals.push(langText({ en: "sales flow", es: "flujo de venta", fr: "flux de vente", pt: "fluxo de venda" }));
  if (builderState.guidedState.logoUrl || arrayValue(builderState.guidedState.logoPalette).length) signals.push(langText({ en: "logo and palette", es: "logo y paleta", fr: "logo et palette", pt: "logo e paleta" }));
  if (builderState.guidedState.contactInfo && Object.keys(builderState.guidedState.contactInfo).length) signals.push(langText({ en: "contact routes", es: "vias de contacto", fr: "contacts", pt: "contatos" }));
  return signals.length ? signals : [langText({ en: "conversation context", es: "contexto de la conversacion", fr: "contexte conversation", pt: "contexto da conversa" })];
}

function humanizePlanFeature(feature) {
  const labels = {
    editable_pages: { en: "Editable pages", es: "Paginas editables", fr: "Pages modifiables", pt: "Paginas editaveis" },
    editable_sections: { en: "Editable sections", es: "Secciones editables", fr: "Sections modifiables", pt: "Secoes editaveis" },
    editable_brand_system: { en: "Editable brand", es: "Marca editable", fr: "Marque modifiable", pt: "Marca editavel" },
    contact_capture: { en: "Contact capture", es: "Captura contacto", fr: "Capture contact", pt: "Captura contato" },
    catalog_manager: { en: "Catalog manager", es: "Catalogo editable", fr: "Catalogue modifiable", pt: "Catalogo editavel" },
    categories: { en: "Categories", es: "Categorias", fr: "Categories", pt: "Categorias" },
    search: { en: "Search", es: "Busqueda", fr: "Recherche", pt: "Busca" },
    filters: { en: "Filters", es: "Filtros", fr: "Filtres", pt: "Filtros" },
    product_cards: { en: "Product cards", es: "Tarjetas producto", fr: "Fiches produit", pt: "Cards produto" },
    cart: { en: "Cart", es: "Carrito", fr: "Panier", pt: "Carrinho" },
    checkout_path: { en: "Checkout path", es: "Ruta de pago", fr: "Parcours paiement", pt: "Fluxo pagamento" },
    customer_account: { en: "Customer account", es: "Cuenta cliente", fr: "Compte client", pt: "Conta cliente" },
    featured_deals: { en: "Featured deals", es: "Ofertas destacadas", fr: "Offres en avant", pt: "Ofertas destaque" },
    deal_sections: { en: "Deal sections", es: "Secciones ofertas", fr: "Sections offres", pt: "Secoes ofertas" },
    best_sellers: { en: "Best sellers", es: "Mas vendidos", fr: "Meilleures ventes", pt: "Mais vendidos" },
    newsletter_or_deal_subscription: { en: "Deal subscription", es: "Suscripcion ofertas", fr: "Abonnement offres", pt: "Assinatura ofertas" },
    ratings_reviews: { en: "Ratings/reviews", es: "Ratings/reseñas", fr: "Avis/notes", pt: "Avaliacoes" },
    wishlist_ready: { en: "Wishlist ready", es: "Favoritos listo", fr: "Favoris prêt", pt: "Favoritos pronto" },
    booking_request_flow: { en: "Booking flow", es: "Flujo reservas", fr: "Flux reservation", pt: "Fluxo agenda" },
    menu_categories: { en: "Menu categories", es: "Categorias menu", fr: "Categories menu", pt: "Categorias menu" },
    quote_request_flow: { en: "Quote flow", es: "Flujo cotizacion", fr: "Flux devis", pt: "Fluxo orcamento" },
  };
  return langText(labels[feature] || {
    en: String(feature || "").replace(/_/g, " "),
    es: String(feature || "").replace(/_/g, " "),
    fr: String(feature || "").replace(/_/g, " "),
    pt: String(feature || "").replace(/_/g, " "),
  });
}













function openReviewDetails() {
  syncGuidedStateFromSummary();
  document.body.classList.add("review-details-open");
  document.querySelectorAll(".summary-panel .mobile-review-details").forEach((details) => {
    details.open = true;
  });
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

// Persistent step rail (2026-07-18, ai-builder.html only -- #guidedRailSteps
// does not exist on client/setup/index.html, hence the null guard). Purely
// presentational: reuses the stepIndex already computed by
// renderGuidedSummary() from the real builderState.guidedStep/displayStepIndex() state,
// no separate step-tracking logic.


function completedFieldCount() {
  return [
    builderState.guidedState.websiteIntent,
    builderState.guidedState.businessName,
    builderState.guidedState.businessDescription,
    builderState.guidedState.industry,
    builderState.guidedState.location,
    arrayValue(builderState.guidedState.servicesProducts).length,
    builderState.guidedState.targetAudience,
    builderState.guidedState.preferredTone,
    arrayValue(builderState.guidedState.preferredColors).length,
    Object.keys(builderState.guidedState.contactInfo || {}).length,
    builderState.guidedState.salesMode,
  ].filter(Boolean).length;
}

export function missingGuidedSteps() {
  const requiredMissing = REQUIRED_GUIDED_STEPS.filter((step) => !isGuidedStepAnswered(step));
  if (requiredMissing.length) return requiredMissing;
  return SMART_GUIDED_STEP_PRIORITY.filter((step) => {
    if (!OPTIONAL_GUIDED_STEPS.has(step)) return false;
    if (step === "desiredDomain") return false;
    if (isGuidedStepAnswered(step)) return false;
    return (guidedAskedSteps.get(step) || 0) < 1;
  });
}

export function guidedCompletionPercent() {
  const requiredCompleted = REQUIRED_GUIDED_STEPS.filter((step) => isGuidedStepAnswered(step)).length;
  const optionalSteps = SMART_GUIDED_STEP_PRIORITY.filter((step) => OPTIONAL_GUIDED_STEPS.has(step) && step !== "desiredDomain");
  const optionalCompleted = optionalSteps.filter((step) => isGuidedStepAnswered(step) || (guidedAskedSteps.get(step) || 0) > 0).length;
  const requiredScore = (requiredCompleted / REQUIRED_GUIDED_STEPS.length) * 82;
  const optionalScore = optionalSteps.length ? (optionalCompleted / optionalSteps.length) * 18 : 18;
  return Math.min(100, Math.round(requiredScore + optionalScore));
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
    } else if (["servicesProducts", "preferredColors", "photoUrls", "videoUrls"].includes(key)) {
      builderState.guidedState[key] = splitCommaOrLines(field.value);
    } else if (key === "contactInfo") {
      builderState.guidedState[key] = parseKeyValueLines(field.value);
    } else {
      builderState.guidedState[key] = field.value.trim();
    }
  });
}

export function mergeGuidedUpdates(updates) {
  Object.entries(updates).forEach(([key, value]) => {
    if (!(key in builderState.guidedState)) return;
    if (key === "businessName" && isInvalidBusinessNameUpdate(value)) return;
    if (key === "fieldMeta") {
      builderState.guidedState.fieldMeta = { ...(builderState.guidedState.fieldMeta || {}), ...(value || {}) };
    } else if (key === "contactInfo") {
      builderState.guidedState.contactInfo = { ...builderState.guidedState.contactInfo, ...(value || {}) };
    } else if (key === "servicesProducts") {
      const incoming = meaningfulOfferItems(value);
      const existing = meaningfulOfferItems(builderState.guidedState.servicesProducts);
      if (!incoming.length && existing.length) return;
      builderState.guidedState.servicesProducts = [...new Set([...existing, ...incoming])];
    } else if (["servicesProducts", "preferredColors", "photoUrls", "videoUrls"].includes(key)) {
      builderState.guidedState[key] = arrayValue(value);
    } else {
      builderState.guidedState[key] = value || builderState.guidedState[key];
    }
  });
}

function isInvalidBusinessNameUpdate(value) {
  const text = String(value || "").trim();
  return text.length > 70 || /(\n|productos?|servicios?|ubicaci[oó]n|contacto|telefono|tel[eé]fono|whatsapp|instagram|colores?|vende|ofrece)/i.test(text);
}

function isPlaceholderBusinessName(value) {
  return /^(your business|tu negocio|votre entreprise|seu negocio|seu negócio|new client website|nueva pagina|nueva página)$/i.test(String(value || "").trim());
}

export function guidedStateForApi() {
  const logoUrl = isCloudSafeUrl(builderState.guidedState.logoUrl) ? builderState.guidedState.logoUrl : "";
  const photoUrls = arrayValue(builderState.guidedState.photoUrls).filter(isCloudSafeUrl);
  const videoUrls = arrayValue(builderState.guidedState.videoUrls).filter(isCloudSafeUrl);
  const aiStudioPlan = refreshAiStudioPlanFromContext();
  const sitePlan = builderState.guidedState.sitePlan || (builderState.forcedTemplateSelection?.templateId ? buildSitePlan() : null);
  if (sitePlan && aiStudioPlan) sitePlan.aiStudioPlan = aiStudioPlan;
  const logoPreference = builderState.guidedState.logoPreference || (builderState.guidedState.aiGeneratedLogoRequested ? "generate_ai_logo" : "");
  const fieldMeta = { ...(builderState.guidedState.fieldMeta || {}) };
  if (logoPreference) {
    fieldMeta.logo = fieldMeta.logo || { source: "explicit", confidence: 1 };
    fieldMeta.logoPreference = fieldMeta.logoPreference || { source: "explicit", confidence: 1 };
  }
  const payload = {
    generatedSiteId: builderState.currentSiteId || builderState.clientIntakeSession?.generatedSiteId || builderState.clientIntakeSession?.projectId || builderState.guidedState.generatedSiteId || "",
    projectId: builderState.currentSiteId || builderState.clientIntakeSession?.projectId || builderState.clientIntakeSession?.generatedSiteId || builderState.guidedState.projectId || "",
    websiteIntent: builderState.guidedState.websiteIntent,
    businessName: builderState.guidedState.businessName,
    businessDescription: builderState.guidedState.businessDescription,
    industry: builderState.guidedState.industry,
    location: builderState.guidedState.location,
    servicesProducts: arrayValue(builderState.guidedState.servicesProducts),
    targetAudience: builderState.guidedState.targetAudience,
    preferredTone: builderState.guidedState.preferredTone,
    preferredColors: arrayValue(builderState.guidedState.preferredColors),
    contactInfo: builderState.guidedState.contactInfo || {},
    desiredDomain: builderState.guidedState.desiredDomain,
    logoUrl,
    photoUrls,
    videoUrls,
    logoPalette: arrayValue(builderState.guidedState.logoPalette),
    logoPreference,
    salesFlow: builderState.guidedState.salesFlow || "",
    fieldMeta,
    brand: normalizeBrand(builderState.guidedState.brand || { logoUrl, extractedColors: arrayValue(builderState.guidedState.logoPalette) }),
    designStrategy: {
      ...createDesignStrategy({
        business_name: builderState.guidedState.businessName,
        business_description: builderState.guidedState.businessDescription,
        website_intent: builderState.guidedState.websiteIntent,
        industry: builderState.guidedState.industry,
        target_audience: builderState.guidedState.targetAudience,
        preferred_tone: builderState.guidedState.preferredTone,
        salesMode: builderState.guidedState.salesFlow || builderState.guidedState.salesMode,
      }),
      ...(builderState.guidedState.designStrategy || {}),
      aiStudioPlan,
    },
    qualityRules: DESIGN_QUALITY_RULES,
    selectedLanguage: builderState.selectedLanguage,
    hasLogo: Boolean(builderState.guidedState.hasLogo || builderState.guidedState.logoUrl),
    hasPhotos: Boolean(builderState.guidedState.hasPhotos || arrayValue(builderState.guidedState.photoUrls).length || arrayValue(builderState.guidedState.videoUrls).length),
    salesMode: builderState.guidedState.salesFlow || builderState.guidedState.salesMode,
    hasLogoPhotos: builderState.guidedState.hasLogoPhotos,
    sectionsPreference: builderState.guidedState.sectionsPreference,
    aiStudioPlan,
    sitePlan,
    sitePlanApproved: Boolean(builderState.guidedState.sitePlanApproved),
    designVariantOffset: Math.max(0, Number(builderState.guidedState.designVariantOffset) || 0),
    publicCopyPolicy: {
      mode: "designer_rewrite",
      visibleCopyMustBeOriginal: true,
      intakeIsStrategyOnly: true,
      forbiddenLiteralSources: ["businessDescription", "chat answers", "client notes", "internal requirements"],
      instruction:
        "Treat all intake answers as private creative direction. Do not paste them into visible website copy. Rewrite them into concise, polished, customer-facing titles, slogans, paragraphs, CTAs, product descriptions, and section labels in builderState.selectedLanguage.",
    },
    source: "ai_guided_setup",
    status: "ready_to_generate",
    brandContextNote:
      "Intake answers describe what the client wants and should guide design strategy only. Never copy internal context, raw client notes, requirements, or rough answers literally into visible website copy.",
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





export async function fetchWithTimeout(url, options = {}, timeoutMs = 18000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Request timed out. Check your connection and try again.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function isCloudSafeUrl(value) {
  const text = String(value || "");
  return Boolean(text) && !text.startsWith("data:") && !text.startsWith("blob:");
}







function setThinking(active) {
  guidedThinking.classList.toggle("active", active);
  if (active) {
    setAssistantState("thinking");
  } else if (builderState.assistantState === "thinking") {
    setAssistantState(builderState.guidedStep === "review" ? "success" : "neutral");
  }
}



function chooseNextQuestionText(serverQuestion, step) {
  if (step === "review") return guidedQuestion("review");
  const fallback = guidedQuestion(step);
  const candidate = String(serverQuestion || "").trim();
  if (!candidate) return fallback;
  if (questionTargetsAnsweredField(candidate)) return fallback;
  if (isDuplicateQuestion(candidate, fallback)) return fallback;
  return candidate;
}

function questionTargetsAnsweredField(question) {
  const text = questionSignature(question);
  const checks = [
    ["businessName", /\b(name|nombre|nom|nome|llama|called|business)\b/],
    ["businessDescription", /\b(sells|does|vende|hace|description|descripcion|descricao|propose)\b/],
    ["servicesProducts", /\b(products|services|productos|servicios|categories|categorias)\b/],
    ["preferredColors", /\b(colors|colores|couleurs|cores|palette|paleta)\b/],
    ["preferredTone", /\b(style|tone|estilo|tono|visual|premium|modern)\b/],
    ["salesMode", /\b(online|sales|sell|venta|vender|quote|cotizacion|devis)\b/],
    ["hasLogoPhotos", /\b(logo|photo|photos|foto|fotos|image|imagen)\b/],
    ["contactInfo", /\b(contact|email|phone|whatsapp|telefono|correo)\b/],
  ];
  return checks.some(([step, pattern]) => pattern.test(text) && isGuidedStepAnswered(step));
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







function hasEnoughContextForFirstDraft() {
  const hasName = Boolean(builderState.guidedState.businessName);
  const hasOffer = Boolean(builderState.guidedState.businessDescription) || arrayValue(builderState.guidedState.servicesProducts).length > 0;
  const hasGoal = Boolean(builderState.guidedState.websiteIntent || builderState.guidedState.salesMode || builderState.forcedTemplateSelection?.templateId);
  return hasName && hasOffer && hasGoal;
}

function completeGuidedBriefFromMessage(message, pendingUpdates = {}) {
  const text = String(message || "").trim();
  const updates = {};
  const merged = {
    ...builderState.guidedState,
    ...pendingUpdates,
    contactInfo: { ...(builderState.guidedState.contactInfo || {}), ...(pendingUpdates.contactInfo || {}) },
  };
  const combinedText = normalizeTemplateIntentText([
    text,
    merged.websiteIntent,
    merged.businessDescription,
    arrayValue(merged.servicesProducts).join(" "),
  ].join(" "));

  const explicitName = extractBusinessName(text);
  if (explicitName && (!merged.businessName || isPlaceholderBusinessName(merged.businessName))) {
    updates.businessName = explicitName;
  }

  if (!merged.websiteIntent && isRichIntakeMessage(text)) {
    updates.websiteIntent = extractWebsiteIntent(text) || text.slice(0, 180);
  }

  if (!merged.businessDescription && isRichIntakeMessage(text)) {
    updates.businessDescription = text;
  }

  const inferredServices = extractServicesProducts(text);
  if (!arrayValue(merged.servicesProducts).length && inferredServices.length) {
    updates.servicesProducts = inferredServices;
  }

  const salesMode = extractSalesMode(combinedText);
  if (!merged.salesMode && salesMode) updates.salesMode = salesMode;

  if (!merged.preferredTone && briefRequestsCyberpunk(text)) {
    updates.preferredTone = langText({
      en: "Cyberpunk, neon, high-energy marketplace",
      es: "Cyberpunk, neon, marketplace energetico",
      fr: "Cyberpunk, neon, marketplace energique",
      pt: "Cyberpunk, neon, marketplace energetico",
    });
  }

  if (!arrayValue(merged.preferredColors).length && briefRequestsCyberpunk(text)) {
    updates.preferredColors = ["cyberpunk", "neon cyan", "magenta", "deep black"];
  }

  if (wantsAiGeneratedLogo(text)) {
    updates.aiGeneratedLogoRequested = true;
    updates.logoPreference = "generate_ai_logo";
    updates.hasLogoPhotos = langText({
      en: "Client has no logo and wants LYRA to create a simple brand mark from the business name and style.",
      es: "El cliente no tiene logo y quiere que LYRA cree una marca simple con el nombre y el estilo.",
      fr: "Le client n'a pas de logo et veut que LYRA crée une marque simple avec le nom et le style.",
      pt: "O cliente nao tem logo e quer que a LYRA crie uma marca simples com o nome e o estilo.",
    });
  }

  return updates;
}

function shouldAdvanceToDesignerPlan(message) {
  if (builderState.guidedStep === "review") return false;
  if (!isRichIntakeMessage(message)) return false;
  return hasEnoughContextForFirstDraft();
}

// The public client-setup flow is driven by the backend's own LLM intake
// engine, which decides what to ask next using its own field priority order.
// The backend response for this endpoint does not include a next_step field,
// so builderState.guidedStep just advances through the frontend's own fixed
// local sequence (see normalizeNextGuidedStep) - it does NOT reliably reflect
// which question is actually on screen. That mismatch means a reply can get
// mapped to the wrong field here. To keep this safe until the two step
// trackers are properly unified, we never let this local guess overwrite a
// field that already holds a real value - it only fills in gaps.
function hasExistingGuidedValue(key) {
  const value = builderState.guidedState[key];
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;
  return Boolean(String(value || "").trim());
}

function inferGuidedUpdates(step, message) {
  if (step === "servicesProducts") {
    return hasExistingGuidedValue("servicesProducts") ? {} : { servicesProducts: splitCommaOrLines(message) };
  }
  if (step === "preferredColors") {
    return hasExistingGuidedValue("preferredColors") ? {} : { preferredColors: splitCommaOrLines(message) };
  }
  if (step === "contactInfo") {
    return hasExistingGuidedValue("contactInfo") ? {} : { contactInfo: parseKeyValueLines(message.includes(":") ? message : `notes: ${message}`) };
  }
  if (step === "hasLogoPhotos" && wantsAiGeneratedLogo(message, { assumeLogoContext: true })) {
    return {
      hasLogoPhotos: message,
      aiGeneratedLogoRequested: true,
      logoPreference: "generate_ai_logo",
    };
  }
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
  const key = keyByStep[step];
  if (!key) return {};
  return hasExistingGuidedValue(key) ? {} : { [key]: message };
}

function inferGuidedUpdatesFromAnyMessage(message) {
  const text = String(message || "").trim();
  const lower = text.toLowerCase();
  const updates = {};

  if (!builderState.guidedState.websiteIntent && isRichIntakeMessage(text)) {
    updates.websiteIntent = extractWebsiteIntent(text);
  }
  if (!builderState.guidedState.businessDescription && text.length > 45) {
    updates.businessDescription = text;
  }

  const businessName = extractBusinessName(text);
  if (businessName && (!builderState.guidedState.businessName || isPlaceholderBusinessName(builderState.guidedState.businessName))) {
    updates.businessName = businessName;
  }

  const industry = inferIndustryFromPrompt(text);
  if (industry && !builderState.guidedState.industry) updates.industry = industry;

  const location = extractLocation(text);
  if (location && !builderState.guidedState.location) updates.location = location;

  const services = extractServicesProducts(text);
  if (services.length && !arrayValue(builderState.guidedState.servicesProducts).length) {
    updates.servicesProducts = services;
  }

  const audience = extractTargetAudience(text);
  if (audience && !builderState.guidedState.targetAudience) updates.targetAudience = audience;

  const tone = extractToneFromText(text);
  if (tone && !builderState.guidedState.preferredTone) updates.preferredTone = tone;

  const colors = extractColorsFromText(text);
  if (colors.length && !arrayValue(builderState.guidedState.preferredColors).length) {
    updates.preferredColors = colors;
  } else if (briefRequestsCyberpunk(text) && !arrayValue(builderState.guidedState.preferredColors).length) {
    updates.preferredColors = ["cyberpunk", "neon cyan", "magenta"];
    if (!updates.preferredTone && !builderState.guidedState.preferredTone) updates.preferredTone = "Cyberpunk, neon, energetic, modern";
  }

  const contactInfo = extractContactInfo(text);
  if (Object.keys(contactInfo).length) {
    updates.contactInfo = contactInfo;
  }

  const salesMode = extractSalesMode(lower);
  if (salesMode && !builderState.guidedState.salesMode) updates.salesMode = salesMode;

  if (/logo|foto|fotos|imagen|imagenes|photo|photos|image|images/.test(lower) && !builderState.guidedState.hasLogoPhotos) {
    const wantsGeneratedLogo = wantsAiGeneratedLogo(text, { assumeLogoContext: true });
    if (wantsGeneratedLogo) updates.aiGeneratedLogoRequested = true;
    if (wantsGeneratedLogo) updates.logoPreference = "generate_ai_logo";
    updates.hasLogoPhotos = wantsGeneratedLogo
      ? langText({
          en: "Client has no logo and wants LYRA to create a simple brand mark from the business name and style.",
          es: "El cliente no tiene logo y quiere que LYRA cree una marca simple con el nombre y el estilo.",
          fr: "Le client n'a pas de logo et veut que LYRA crée une marque simple avec le nom et le style.",
          pt: "O cliente nao tem logo e quer que a LYRA crie uma marca simples com o nome e o estilo.",
        })
      : langText({
          en: "Client mentioned logo/photos",
          es: "El cliente mencionó logo/fotos",
          fr: "Le client a mentionné logo/photos",
          pt: "O cliente mencionou logo/fotos",
        });
  }

  return updates;
}



function extractWebsiteIntent(text) {
  if (/marketplace|amazon|ebay/i.test(text)) return "Marketplace / online store";
  if (/restaurante|restaurant|menu|menú/i.test(text)) return "Restaurant menu website";
  if (/\b(cita|citas|reserva|reservas|booking|appointment)\b/i.test(text)) return "Booking website";
  if (/tienda|store|shop|ecommerce|venta online|vender online/i.test(text)) return "Online store";
  if (/servicio|services|cotizacion|cotización|quote/i.test(text)) return "Service business website";
  return text.slice(0, 180);
}

function extractBusinessName(text) {
  const patterns = [
    /(?:nombre(?: del negocio)?|negocio|tienda|marca|empresa)\s*(?:es|se llama|:|-)\s*([^.,;\n]+)/i,
    /(?:con el nombre|con nombre|nombre)\s+([^.,;\n]+)/i,
    /(?:se llamar[aá]|se va a llamar|sera llamado|será llamado)\s+([^.,;\n]+)/i,
    /(?:business(?: name)?|store|brand|company)\s*(?:is|called|:|-)\s*([^.,;\n]+)/i,
    /(?:llamad[oa]|named)\s+([^.,;\n]+)/i,
    /(?:se llama|called)\s+([^.,;\n]+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const name = match[1].split(/\s+(?:y\s+)?(?:voy\s+a\s+vender|vamos\s+a\s+vender|va\s+a\s+vender|quiero\s+vender|necesito\s+vender|vende|vendo|vendemos|vender|ofrece|ofrecemos|hace|tiene|con|para|debe|sera|será|ser|vamos|va|ubicad[ao]|en\s+usa|desde|despacho|env[ií]o|no\s+tengo|sin\s+logo|pero|quiero|necesito|necesitamos|menu|men[uú]|pedidos?|direcci[oó]n|colores?)\b/i)[0];
      return cleanExtractedPhrase(name, 56);
    }
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
  if (isGenericCommerceIntent(text)) return [];
  if (textSuggestsBroadMarketplace(text)) {
    const candidates = [
      ["ropa", "fashion"],
      ["accesorios", "accessories"],
      ["carros", "auto accessories"],
      ["autos", "auto accessories"],
      ["automotriz", "auto accessories"],
      ["regalos", "gifts"],
      ["hogar", "home goods"],
      ["juguetes", "toys"],
      ["anime", "anime collectibles"],
      ["gadgets", "gadgets"],
      ["cosas raras", "rare finds"],
      ["inusual", "unusual products"],
      ["unusual", "unusual products"],
    ];
    const normalized = normalizeTemplateIntentText(text);
    const inferred = candidates
      .filter(([needle]) => normalized.includes(needle))
      .map(([, label]) => label);
    return [...new Set(inferred)].slice(0, 8);
  }
  const productLine = text.match(/(?:l[ií]nea|linea|colecci[oó]n|collection)\s+(?:de|para)\s+([^.;,\n]+)/i)?.[1];
  if (productLine) {
    return splitOfferItems(productLine).slice(0, 8);
  }
  const patterns = [
    /(?:productos?|servicios?|vende\b|vender\b|vendo\b|vendemos\b|venta de|ofrece\b|ofrecemos\b|catalogo|cat[aá]logo)\s*(?:son|es|:|-)?\s*([^.;\n]+)/i,
    /(?:tienda|store|shop)(?:\s+online)?\s+(?:para|for)\s+([^.;\n]+)/i,
    /(?:tienda|negocio|marca|empresa)\s+de\s+([^.;\n]+)/i,
    /(?:pagina|p[aá]gina|web|site)\s+de\s+([^.;\n]+)/i,
    /(?:products?|services?|sells|offers|catalog)\s*(?:are|is|:|-)?\s*([^.;\n]+)/i,
    /(?:store|shop|business|brand|website)\s+(?:for|of)\s+([^.;\n]+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const items = splitOfferItems(match[1])
        .filter((item) => item.length > 1 && meaningfulOfferItems([item]).length > 0)
        .slice(0, 8);
      if (items.length) return items;
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
  const styles = ["elegante", "moderno", "premium", "minimalista", "lujoso", "juvenil", "profesional", "futurista", "cyberpunk", "neon", "neón", "oscuro", "dark", "friendly", "modern", "luxury", "minimal", "bold", "clean"];
  const found = styles.filter((style) => new RegExp(`\\b${escapeRegExp(style)}\\b`, "i").test(text));
  const normalized = [...splitCommaOrLines(styleHint), ...found]
    .map((item) => cleanExtractedPhrase(item.replace(/neón/i, "neon"), 32).toLowerCase())
    .filter(Boolean);
  return [...new Set(normalized)].join(", ");
}

function extractColorsFromText(text) {
  const hexColors = text.match(/#[0-9a-f]{3,8}\b/gi) || [];
  const colorVocabulary = [
    "rojo", "azul", "verde", "negro", "blanco", "gris", "dorado", "amarillo", "naranja", "morado", "violeta", "rosa", "beige",
    "calido", "calidos", "cálido", "cálidos", "oscuro", "cyberpunk", "neon", "neón", "cyan", "magenta",
    "red", "blue", "green", "black", "white", "gray", "grey", "gold", "yellow", "orange", "purple", "pink", "dark",
  ];
  const colorNames = colorVocabulary.filter((color) => new RegExp(`\\b${escapeRegExp(color)}\\b`, "i").test(text));
  const colorPhrase = cleanColorSegment(text.match(/(?:colores?|colors?|paleta|palette)\s*(?:son|es|:|-)?\s*([^.;\n]+)/i)?.[1] || "");
  const phraseTokens = splitCommaOrLines(colorPhrase)
    .flatMap((item) => {
      const found = colorVocabulary.filter((color) => new RegExp(`\\b${escapeRegExp(color)}\\b`, "i").test(item));
      return found.length ? found : [item];
    });
  return [...new Set([...hexColors, ...phraseTokens, ...colorNames].map((item) => cleanExtractedPhrase(item.replace(/neón/i, "neon"), 32).toLowerCase()).filter(Boolean))].slice(0, 8);
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
  if (/\b(cita|citas|reserva|reservas|booking|appointment|agendar|agenda|consulta|consultas)\b/.test(lower)) modes.push(langText({ en: "appointments/bookings", es: "citas/reservas", fr: "rendez-vous/réservations", pt: "agendamentos/reservas" }));
  if (/captar clientes|captar leads|lead|leads|contact request|solicitudes de contacto/.test(lower)) modes.push(langText({ en: "lead capture", es: "captacion de clientes", fr: "capture de prospects", pt: "captacao de clientes" }));
  return [...new Set(modes)].join(", ");
}

function cleanOfferSegment(value) {
  return String(value || "")
    .split(/\b(?:se\s+llam(?:a|ara|ará)|la\s+marca|el\s+negocio|no\s+tengo|sin\s+logo|colores?|colors?|paleta|palette|vendo\s+online|vender\s+online|venta\s+online|desde|ubicad[ao]|despacho|env[ií]o|contacto|whatsapp|direcci[oó]n|pedidos?|men[uú]\s+online|necesitamos?|quiero\s+estilo|quiero\s+que|quiero\s+captar|captar\s+clientes|agendar\s+consultas|agenda\s+consultas|debe\s+ser|should\s+be|located|shipping)\b/i)[0]
    .replace(/\b(categor[ií]as|categorias)\s+desde\b/i, "")
    .replace(/\b(de todo tipo|todo tipo|varios tipos|muchos tipos)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitOfferItems(value) {
  const segment = cleanOfferSegment(value);
  if (!segment) return [];
  const lower = normalizeTemplateIntentText(segment);
  const knownGroups = [
    ["entradas", /\bentradas?\b/],
    ["platos principales", /\bplatos?\s+principales\b/],
    ["bebidas", /\bbebidas?\b/],
    ["postres", /\bpostres?\b/],
    ["bisuteria hecha a mano", /\b(bisuteria|bijouterie|joyeria|jewelry|handmade jewelry|hecho a mano|artesanal)\b/],
    ["collares", /\b(collares?|necklaces?)\b/],
    ["pulseras", /\b(pulseras?|bracelets?)\b/],
    ["aretes", /\b(aretes?|zarcillos?|earrings?)\b/],
    ["ropa", /\bropa\b/],
    ["accesorios", /\baccesorios?\b/],
    ["auto accessories", /\b(automotriz|autos?|carros?|camionetas?|4x4)\b/],
    ["regalos", /\bregalos?\b/],
    ["hogar", /\bhogar\b/],
    ["juguetes", /\bjuguetes?\b/],
    ["anime collectibles", /\banime\b/],
    ["gadgets", /\bgadgets?\b/],
  ];
  const matched = knownGroups.filter(([, regex]) => regex.test(lower)).map(([label]) => label);
  if (matched.length >= 2) return [...new Set(matched)];
  return splitCommaOrLines(segment.replace(/\s+(?:y|and)\s+/gi, ", "))
    .map((item) => cleanExtractedPhrase(item, 64))
    .filter(Boolean);
}

function cleanColorSegment(value) {
  return String(value || "")
    .split(/\b(?:vendo\s+online|vender\s+online|venta\s+online|desde|ubicad[ao]|despacho|env[ií]o|contacto|whatsapp|direcci[oó]n|pedidos?|men[uú]\s+online|no\s+tengo|sin\s+logo|pero|y\s+vendo)\b/i)[0]
    .replace(/\s+/g, " ")
    .trim();
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

export function arrayValue(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  return splitCommaOrLines(String(value));
}

export function shortError(message) {
  return String(message || "").slice(0, 180);
}

export async function readErrorMessage(response) {
  const text = await response.text();
  try {
    const data = JSON.parse(text);
    return data.detail || data.message || text;
  } catch {
    return text;
  }
}



function handleServerNeedsMoreInfo(result = {}) {
  builderState.pendingServerIntakeGate = {
    missing_fields: arrayValue(result.missing_fields),
    next_question: result.next_question || "",
  };
  const gate = ensureServerIntakeGate();
  const question = gate.querySelector(".server-intake-question");
  const field = gate.querySelector("[name='server_intake_reply']");
  if (question) question.textContent = builderState.pendingServerIntakeGate.next_question;
  gate.hidden = false;
  if (field) {
    field.value = "";
    field.focus();
  }
  const message = builderState.pendingServerIntakeGate.next_question || t("reviewGenerate");
  statusText.textContent = message;
  if (isPublicClientSetup) {
    guidedStatusText.textContent = message;
    appendChatMessage("assistant", message, "alert");
  }
  builderAvatarManager?.setState("speaking", { source: "server-needs-more-info" });
}

async function generateWebsite(triggerButton = document.querySelector("#generateButton")) {
  setStudioProgressPhase("understanding");
  const payload = await collectPayload();
  setStudioProgressPhase("brand");
  setGuidedBuildPhase("strategy");
  const templateSelection = await selectTemplateForPayload(payload);
  attachTemplateSelection(payload, templateSelection);
  enrichPayloadDesignStrategy(payload, templateSelection);
  setStudioProgressPhase("homepage");
  setGuidedBuildPhase("generate");
  const button = triggerButton;
  button.disabled = true;
  button.textContent = t("generating");
  statusText.textContent = t("generatingLong");
  if (isPublicClientSetup) guidedStatusText.textContent = t("generatingLong");
  builderAvatarManager?.setState("thinking", { source: "generate-website" });

  const GENERATION_ATTEMPTS = 2;
  let error = null;
  try {
  for (let attempt = 1; attempt <= GENERATION_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: clientAuthHeaders({ "content-type": "application/json" }),
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const responseError = await readErrorMessage(response);
        throw new Error(responseError || "Website generation failed.");
      }

      const result = await response.json();
      if (result.needs_more_info) {
        handleServerNeedsMoreInfo(result);
        return "needs_more_info";
      }
      setStudioProgressPhase("shop");
      setGuidedBuildPhase("render");
      const finalTemplateSelection = await resolveGeneratedTemplateSelection(result.schema, templateSelection);
      if (finalTemplateSelection) {
        result.schema = mergeTemplateSelectionIntoSchema(result.schema, finalTemplateSelection);
      }
      statusText.textContent = result.used_dev_mock
        ? "Development mock used because OPENAI_API_KEY is missing on the server."
        : t("generatedOpenAI");
      applyGenerationResult(result, payload, finalTemplateSelection);
      setStudioProgressPhase("mobile");
      await createDomainOrderIfNeeded(payload, result);
      setStudioProgressPhase("ready");
      setGuidedBuildPhase("ready");
      return true;
    } catch (attemptError) {
      error = attemptError;
      if (attempt < GENERATION_ATTEMPTS) {
        const retryMessage = langText({
          en: "That took longer than expected. Trying once more automatically...",
          es: "Eso tardó más de lo esperado. Reintentando automáticamente...",
          fr: "Cela a pris plus de temps que prévu. Nouvelle tentative automatique...",
          pt: "Isso demorou mais do que o esperado. Tentando novamente automaticamente...",
        });
        statusText.textContent = retryMessage;
        if (isPublicClientSetup) guidedStatusText.textContent = retryMessage;
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
  }
  {
    builderAvatarManager?.setState("confused", { source: "generate-error" });
    setStudioProgressPhase("homepage");
    setGuidedBuildPhase("error");
    if (isPublicClientSetup) {
      const message = langText({
        en: "The AI generator did not finish this request. I will not show a local fallback because it could be the wrong template. Please try again in a moment.",
        es: "El generador de IA no terminó esta solicitud. No voy a mostrar un borrador local porque podría usar la plantilla equivocada. Intenta otra vez en un momento.",
        fr: "Le générateur IA n'a pas terminé cette demande. Je ne vais pas afficher de brouillon local car il pourrait utiliser le mauvais template. Réessayez dans un instant.",
        pt: "O gerador de IA não terminou esta solicitação. Não vou mostrar um rascunho local porque poderia usar o template errado. Tente novamente em instantes.",
      });
      statusText.textContent = message;
      guidedStatusText.textContent = message;
      appendChatMessage("assistant", message, "alert");
      return false;
    }
    const runtimeFallbackSelection = runtimeTemplateSelection(templateSelection);
    const fallbackPayload = runtimeFallbackSelection ? payload : stripReferenceTemplateRuntimePayload(payload);
    const fallbackResult = buildInstantTemplateResult(fallbackPayload, error, runtimeFallbackSelection);
    applyGenerationResult(fallbackResult, fallbackPayload, runtimeFallbackSelection);
    setStudioProgressPhase("ready");
    const message = isPublicClientSetup
      ? `${langText({
          en: runtimeFallbackSelection ? "I created a fast editable draft from the selected template while the AI service recovers." : "I created a safe editable draft while the AI service recovers.",
          es: runtimeFallbackSelection ? "Creé un borrador editable rápido desde la plantilla elegida mientras se recupera el servicio de IA." : "Creé un borrador editable seguro mientras se recupera el servicio de IA.",
          fr: runtimeFallbackSelection ? "J'ai créé un brouillon modifiable rapide depuis le template choisi pendant que le service IA récupère." : "J'ai créé un brouillon modifiable sûr pendant que le service IA récupère.",
          pt: runtimeFallbackSelection ? "Criei um rascunho editável rápido a partir do template escolhido enquanto o serviço de IA se recupera." : "Criei um rascunho editável seguro enquanto o serviço de IA se recupera.",
        })}`
      : `${t("generateError")}: ${shortError(error.message)}. Showing a fast editable draft instead.`;
    statusText.textContent = message;
    guidedStatusText.textContent = message;
    return true;
  }
  } finally {
    button.disabled = false;
    button.textContent = button.id === "guidedGenerateButton" ? t("reviewGenerate") : t("generateButton");
  }
}

function enrichPayloadDesignStrategy(payload, templateSelection) {
  const executionStatus = templateExecutionStatus(templateSelection?.templateId || "");
  payload.designStrategy = {
    ...(payload.designStrategy || {}),
    designerMode: true,
    templateUsePolicy: "Use the selected template as a reference architecture only. Adapt content, copy, palette, sections, product taxonomy, and CTAs to the business brief.",
    selectedTemplateReason: templateSelection?.reason || "",
    selectedTemplateId: templateSelection?.templateId || "",
    selectedCatalogType: templateSelection?.catalogType || "",
    templateExecutionPolicy: executionStatus,
    catalogComplexity: inferCatalogComplexity(payload),
    publicCopyPolicy: "Never paste intake answers verbatim into the website. Rewrite as polished customer-facing copy in the selected language.",
  };
}

function inferCatalogComplexity(payload = {}) {
  const text = normalizeTemplateIntentText(`${payload.business_description || ""} ${arrayValue(payload.services_products).join(" ")} ${payload.industry || ""}`);
  const products = meaningfulOfferItems(payload.services_products);
  if (textSuggestsBroadMarketplace(text) || (products.length >= 10 && !textSuggestsFocusedCommerceStore(text))) return "broad_multi_category_catalog";
  if (textSuggestsFocusedProductLine(text) || products.length <= 2) return "focused_product_line";
  return "standard_catalog";
}



async function selectTemplateForPayload(payload) {
  if (!window.TemplateRouter?.selectTemplateFromPrompt) return null;
  const prompt = [
    payload.business_name,
    payload.business_description,
    payload.industry,
    arrayValue(payload.services_products).join(" "),
    payload.target_audience,
    payload.preferred_tone,
    arrayValue(payload.preferred_colors).join(" "),
    payload.salesMode || builderState.guidedState.salesMode,
  ].join(" ");

  const explicitForcedTemplate = builderState.forcedTemplateSelection?.templateId
    && builderState.forcedTemplateSelection?.intent === "client_visual_template_choice"
    ? builderState.forcedTemplateSelection
    : null;
  if (explicitForcedTemplate?.templateId && window.TemplateRouter.getTemplateById) {
    const template = await window.TemplateRouter.getTemplateById(explicitForcedTemplate.templateId);
    if (template) {
      return {
        ...explicitForcedTemplate,
        template,
        catalogType: explicitForcedTemplate.catalogType || template.catalogModel?.catalogType || "",
      };
    }
  }

  const inferredTemplateId = inferDesignerTemplateIdFromPayload(payload) || inferTemplateIdFromText(prompt);
  if (inferredTemplateId && window.TemplateRouter.getTemplateById) {
    const template = await window.TemplateRouter.getTemplateById(inferredTemplateId);
    if (template) {
      return {
        templateId: inferredTemplateId,
        template,
        intent: "guided_context_template",
        catalogType: template.catalogModel?.catalogType || templatePreviewMeta(inferredTemplateId)?.catalogType || "",
        reason: "Selected from the current business context",
      };
    }
  }

  const studioPlanTemplateId = builderState.guidedState.aiStudioPlan?.recommendedTemplateId || builderState.guidedState.designStrategy?.diagnosis?.recommendedTemplateId || "";
  if (studioPlanTemplateId && window.TemplateRouter.getTemplateById) {
    const template = await window.TemplateRouter.getTemplateById(studioPlanTemplateId);
    if (template) {
      return {
        templateId: studioPlanTemplateId,
        template,
        intent: "ai_studio_plan",
        catalogType: builderState.guidedState.aiStudioPlan?.recommendedCatalogType
          || builderState.guidedState.designStrategy?.diagnosis?.recommendedCatalogType
          || template.catalogModel?.catalogType
          || templatePreviewMeta(studioPlanTemplateId)?.catalogType
          || "",
        reason: builderState.guidedState.aiStudioPlan?.reasoningSummary
          || builderState.guidedState.designStrategy?.diagnosis?.reasoningSummary
          || "Selected by LYRA's AI Studio plan",
      };
    }
  }
  const aiSelectedTemplateId = resolvedAiTemplateId();
  if (aiSelectedTemplateId && window.TemplateRouter.getTemplateById) {
    const template = await window.TemplateRouter.getTemplateById(aiSelectedTemplateId);
    if (template) {
      return {
        templateId: aiSelectedTemplateId,
        template,
        intent: builderState.forcedTemplateSelection?.intent || builderState.guidedState.designStrategy?.diagnosis?.decisionState || "ai_selected_template",
        catalogType: builderState.forcedTemplateSelection?.catalogType
          || builderState.guidedState.sitePlan?.catalogType
          || builderState.guidedState.designStrategy?.selectedCatalogType
          || builderState.guidedState.designStrategy?.diagnosis?.recommendedCatalogType
          || template.catalogModel?.catalogType
          || templatePreviewMeta(aiSelectedTemplateId)?.catalogType
          || "",
        reason: builderState.forcedTemplateSelection?.reason
          || builderState.guidedState.designStrategy?.selectedTemplateReason
          || builderState.guidedState.designStrategy?.diagnosis?.reasoningSummary
          || "Selected by LYRA from the guided conversation",
      };
    }
  }
  if (builderState.forcedTemplateSelection?.templateId && window.TemplateRouter.getTemplateById) {
    const template = await window.TemplateRouter.getTemplateById(builderState.forcedTemplateSelection.templateId);
    if (template) {
      return {
        ...builderState.forcedTemplateSelection,
        template,
        catalogType: builderState.forcedTemplateSelection.catalogType || template.catalogModel?.catalogType || "",
      };
    }
  }
  const fallbackTemplateId = inferDesignerTemplateIdFromPayload(payload);
  if (fallbackTemplateId && window.TemplateRouter.getTemplateById) {
    const template = await window.TemplateRouter.getTemplateById(fallbackTemplateId);
    if (template) {
      return {
        templateId: fallbackTemplateId,
        template,
        intent: "designer_mode_template_reference",
        catalogType: template.catalogModel?.catalogType || templatePreviewMeta(fallbackTemplateId)?.catalogType || "",
        reason: "Designer-mode fallback selected from catalog complexity and business type",
      };
    }
  }
  try {
    return await window.TemplateRouter.selectTemplateFromPrompt(prompt);
  } catch (error) {
    console.warn("Template selection failed", error);
    return null;
  }
}

function inferDesignerTemplateIdFromPayload(payload = {}) {
  const text = normalizeTemplateIntentText([
    payload.business_name,
    payload.business_description,
    payload.industry,
    arrayValue(payload.services_products).join(" "),
    payload.target_audience,
    payload.preferred_tone,
    arrayValue(payload.preferred_colors).join(" "),
    payload.salesMode || builderState.guidedState.salesMode,
  ].join(" "));
  const products = meaningfulOfferItems(payload.services_products);
  if (textSuggestsProfessionalService(text)) return "legal-professional-services-pro";
  if (textSuggestsMultiVendorMarketplace(text)) {
    return "mega-marketplace";
  }
  if (textSuggestsBeautyCommerceStore(text)) {
    return textSuggestsHandmadeCraftGoods(text) ? "premium-product-store" : "mega-retail-store";
  }
  if (textSuggestsMegaRetailStore(text) || textSuggestsBroadMarketplace(text) || (products.length >= 10 && !textSuggestsFocusedCommerceStore(text) && !textSuggestsProfessionalService(text))) {
    return "mega-retail-store";
  }
  if (textSuggestsFocusedProductLine(text)) return "premium-product-store";
  const scoredTemplateId = bestTemplateIdFromContext(text, payload);
  if (scoredTemplateId) return scoredTemplateId;
  if (/restaurant|restaurante|menu|comida|food|cafe|cafeteria|delivery/.test(text)) return "restaurant-food-business";
  if (/barber|barberia|salon|spa|booking|reserva|cita|appointment/.test(text)) return "booking-appointment-pro";
  if (/legal|abogado|lawyer|contador|tax|impuestos|consultoria|consulting|seguros/.test(text)) return "legal-professional-services-pro";
  if (/clinic|clinica|wellness|dental|doctor|estetica|salud|therapy|skincare/.test(text)) return "medical-wellness-clinic-pro";
  if (/saas|software|enterprise|automatizacion|plataforma|dashboard|crm|erp|api/.test(text)) return "b2b-saas-enterprise-pro";
  if (/industrial|manufactur|fabrica|maquinaria|repuestos|herramientas|suministros/.test(text)) return "manufacturing-industrial-supplier-pro";
  if (/curso|course|academy|academia|bootcamp|training|clases|masterclass/.test(text)) return "education-course-academy-pro";
  if (/digital|ebook|templates|plantillas|descarga|download|membresia|membership/.test(text)) return "digital-products-store";
  if (textSuggestsJewelryAccessoryStore(text) || /ropa|fashion|moda|boutique|streetwear|zapato|sneaker|accesorio/.test(text)) return "fashion-drop-pro";
  if (textSuggestsSingleProductShowcase(text) || textSuggestsPremiumProductPreference(text)) {
    return "premium-product-store";
  }
  if (/servicio|service|contractor|limpieza|roofing|repair|reparacion|cotizacion|quote/.test(text)) return "local-services-pro-plus";
  if (/empresa|company|corporate|corporativo|pagina web|website|agencia|firma/.test(text)) return "corporate-company-pro";
  return "";
}

function attachTemplateSelection(payload, selection) {
  if (!selection) return payload;
  const normalizedTemplateId = normalizeTemplateId(selection.templateId);
  const executionStatus = templateExecutionStatus(normalizedTemplateId);
  payload.templateId = normalizedTemplateId;
  payload.templateIntent = selection.intent;
  payload.catalogType = selection.catalogType;
  payload.selectedTemplate = selection.template || {};
  payload.templateInstructions = buildTemplateInstructions(selection);
  payload.templateExecution = executionStatus;
  return payload;
}

function buildTemplateInstructions(selection) {
  const template = selection?.template || {};
  const normalizedTemplateId = normalizeTemplateId(selection?.templateId || template.id || "");
  const executionStatus = templateExecutionStatus(normalizedTemplateId);
  const sections = Array.isArray(template.sections)
    ? template.sections.map((section) => section.type).filter(Boolean).join(", ")
    : "";
  const pages = Array.isArray(template.pages)
    ? template.pages.map((page) => `${page.name || page.page_key || "Page"}: ${page.purpose || page.layout || ""}`).join(" | ")
    : "";
  const catalog = template.catalogModel || {};
  return {
    templateId: normalizedTemplateId,
    intent: selection?.intent || "",
    executionStatus,
    name: template.name || "",
    visualDifference: template.visualDifference || "",
    aiPrompt: template.aiPrompt || "",
    editableSlots: template.editableSlots || [],
    copyGenerationRules: [
      "If executionStatus.runtimeEnabled is false, treat the template as visual reference only. Do not assume the reference image is an executable page.",
      "If payload.sitePlan exists, treat it as the approved structure contract for pages, major sections, and conversion flow.",
      "Generate a strong brand headline, slogan, section titles, CTAs, product/service descriptions, trust copy, and footer copy from the business context.",
      "All generated visible copy must remain editable in the JSON under section.editable, catalog_items, theme, navigation, business, or global_components.",
      "Never paste businessDescription, chat answers, intake notes, internal requirements, or client wording verbatim into visible page copy.",
      "Use businessDescription and chat intake only as strategic context. Rewrite every visible headline, paragraph, CTA and section title as polished customer-facing marketing copy.",
      "If the client answer contains rough notes, product lists, spelling mistakes, internal instructions, or phrases like 'quiero', 'debe', 'necesito', convert them into professional copy or keep them out of the page.",
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
      "Use this template as the structural base. Replace placeholders with business-specific titles, slogans, section copy, products, services, colors, images, and CTAs. Intake text is design strategy only: do not copy it verbatim into visible website copy. Keep every generated element editable, and preserve the unique layout pattern instead of turning all templates into the same generic page.",
  };
}

function buildRevisionInstructions() {
  const requestedAdjustments = arrayValue(builderState.guidedState.requestedAdjustments);
  if (builderState.guidedState.revisionMode !== "targeted_edit" || !builderState.currentSchema || !requestedAdjustments.length) return null;
  return {
    mode: "targeted_edit",
    requestedAdjustments,
    preserveExistingDraft: true,
    preserveTemplate: true,
    preservePageOrder: true,
    preserveUnrequestedSections: true,
    preserveCatalogItems: true,
    preserveLanguage: true,
    selectedLanguage: builderState.selectedLanguage,
    previousSchema: builderState.currentSchema,
    instruction:
      "This is a revision of an already liked draft. Apply only the specific requested changes. Do not redesign, re-theme, reorder pages, replace unrelated copy, change catalog items, change business data, or switch templates unless the client explicitly asked for that exact change.",
  };
}



async function requestLyraSchemaEdit(message, payload = {}, localContextUpdates = {}, templateSelection = null) {
  const response = await fetch(LYRA_EDIT_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      currentSchema: builderState.currentSchema,
      instruction: message,
      selectedLanguage: builderState.selectedLanguage,
      userContext: {
        businessName: builderState.guidedState.businessName || payload.business_name,
        businessDescription: builderState.guidedState.businessDescription || payload.business_description,
        industry: builderState.guidedState.industry || payload.industry,
        servicesProducts: builderState.guidedState.servicesProducts || payload.services_products,
        preferredTone: builderState.guidedState.preferredTone || payload.preferred_tone,
        preferredColors: builderState.guidedState.preferredColors || payload.preferred_colors,
        selectedTemplateId: templateSelection?.templateId || builderState.guidedState.sitePlan?.templateId || builderState.currentSchema?.selected_template?.id,
        catalogType: templateSelection?.catalogType || builderState.guidedState.sitePlan?.catalogType || builderState.currentSchema?.catalog_model?.catalogType,
        salesFlow: builderState.guidedState.salesFlow || payload.sales_flow,
        ...localContextUpdates,
      },
    }),
  });
  if (!response.ok) {
    const error = await readErrorMessage(response);
    throw new Error(error || "Lyra edit failed.");
  }
  return response.json();
}

function explicitlyRequestsTemplateSwitch(text) {
  return /cambia(?:r)?(?: la)? plantilla|otra plantilla|plantilla diferente|switch template|change template|different template|nuevo layout|layout diferente|otra estructura|estructura diferente/.test(text);
}

function shouldRebuildDraftFromTemplate(message, payload = {}, templateSelection = null) {
  const text = normalizeTemplateIntentText([
    message,
    payload.business_description,
    payload.industry,
    arrayValue(payload.services_products).join(" "),
    payload.templateIntent,
    templateSelection?.templateId,
    templateSelection?.catalogType,
  ].join(" "));
  const currentTemplateId = builderState.currentSchema?.selected_template?.id || builderState.currentSchema?.active_template?.id || builderState.currentSchema?.layout_mode?.template_id || "";
  const nextTemplateId = templateSelection?.templateId || inferDesignerTemplateIdFromPayload(payload) || inferTemplateIdFromText(text);
  return Boolean(
    /template|plantilla|estructura|layout|marketplace|catalogo|catálogo|tienda|store|shop|cyberpunk|neon|estilo|style|diseño|diseno/.test(text)
      || textSuggestsBroadMarketplace(text)
      || textSuggestsFocusedProductLine(text)
      || (nextTemplateId && nextTemplateId !== currentTemplateId)
  );
}

function applyTargetedSchemaPatch(schema, message, payload = {}, localContextUpdates = {}, templateSelection = null) {
  let nextSchema = structuredClone(schema);
  const text = normalizeTemplateIntentText(message);
  const revisionFlags = draftRevisionFlags(text);
  if (briefRequestsCyberpunk(message)) {
    nextSchema = applyCyberpunkVisualDirection(nextSchema);
  }
  if (localContextUpdates.businessName || payload.business_name) {
    nextSchema.business = { ...(nextSchema.business || {}), name: payload.business_name || localContextUpdates.businessName || nextSchema.business?.name };
  }
  if (arrayValue(localContextUpdates.servicesProducts).length) {
    nextSchema.catalog_items = mergeCatalogFromOfferItems(nextSchema.catalog_items, localContextUpdates.servicesProducts, payload);
  }
  if (/headline|titulo|título|slogan|hero|texto principal|copy|copia/.test(text)) {
    nextSchema = updatePrimaryHeroCopy(nextSchema, message, payload, templateSelection);
  }
  if (/bot[oó]n|button|cta|llamada|call to action/.test(text)) {
    nextSchema = updatePrimaryCtaCopy(nextSchema, message);
  }
  if (revisionFlags.visualSafety || revisionFlags.visualPolish || revisionFlags.copyRefresh) {
    nextSchema = applyReviewVisualPatch(nextSchema, message, payload, templateSelection, revisionFlags);
  }
  nextSchema = ensureSemanticSeedContent(nextSchema, payload, templateSelection);
  nextSchema.revision_history = [
    ...arrayValue(nextSchema.revision_history).slice(-8),
    {
      requested_at: new Date().toISOString(),
      request: cleanShortText(message, 260),
      applied_locally: true,
      flags: revisionFlags,
    },
  ];
  return nextSchema;
}

function draftRevisionFlags(text) {
  return {
    visualSafety: /montad|encim|sobrepuest|solap|overlap|clip|cortad|descuadr|tapad|una sobre otra|no se ve|gigante|muy grande|demasiado grande|texto grande|se rompe/.test(text),
    visualPolish: /pro|premium|profesional|pulid|elegante|limpio|ordenad|mejor|mejora|bonito|feo|mediocre|visual|diseñ|disen|layout|estructura|espaci/.test(text),
    copyRefresh: /texto|copy|titulo|título|headline|slogan|frase|mensaje|redacci|copia|no pegues|notas/.test(text),
  };
}

function applyReviewVisualPatch(schema, message, payload = {}, templateSelection = null, flags = {}) {
  const nextSchema = structuredClone(schema);
  const text = normalizeTemplateIntentText(message);
  const selectedTemplateId = nextSchema.selected_template?.id || nextSchema.active_template?.id || templateSelection?.templateId || "";
  const selectedCatalogType = nextSchema.catalog_model?.catalogType || nextSchema.layout_mode?.catalog_type || templateSelection?.catalogType || "";
  nextSchema.layout_mode = {
    ...(nextSchema.layout_mode || {}),
    visual_safety: "no_overlap",
    revision_mode: "targeted_client_edit",
  };
  nextSchema.pages = arrayValue(nextSchema.pages).map((page) => ({
    ...page,
    sections: arrayValue(page.sections).map((section) => {
      const sectionType = section.type || "";
      const isHeroSection = /Hero/i.test(sectionType);
      const isVisualSection = /Hero|Signature|Feature|Story|ProductGrid|Collection|Provenance/i.test(sectionType);
      if (!isVisualSection) return section;
      const settings = {
        ...(section.settings || {}),
        mobile_stack: true,
        visual_safety: "no_overlap",
      };
      if (isHeroSection) {
        settings.heading_size = "safe";
        settings.spacing = "balanced";
        settings.container_width = settings.container_width || "wide";
      }
      const editable = { ...(section.editable || {}) };
      if (isHeroSection) {
        const currentHeadline = editable.headline || "";
        const shouldReplaceHeadline = flags.visualSafety
          || flags.copyRefresh
          || isUnsafeHeroHeadline(currentHeadline, selectedTemplateId, selectedCatalogType);
        if (shouldReplaceHeadline) {
          editable.headline = safeRevisionHeadline(nextSchema, payload, templateSelection);
        }
        if (editable.subtitle || flags.copyRefresh || flags.visualSafety) {
          editable.subtitle = safeRevisionSubtitle(nextSchema, payload, templateSelection);
        }
      }
      if (flags.visualSafety && editable.text) {
        editable.text = cleanShortText(editable.text, 220);
      }
      if (/color|paleta|cyberpunk|neon|neón|oscuro|dark|claro|minimal/.test(text) && briefRequestsCyberpunk(message)) {
        settings.background = settings.background || "#070714";
        settings.text_color = settings.text_color || "#f8fbff";
      }
      return { ...section, editable, settings };
    }),
  }));
  return nextSchema;
}

function isUnsafeHeroHeadline(headline, templateId = "", catalogType = "") {
  const value = String(headline || "").trim();
  if (!value) return true;
  const normalized = normalizeTemplateIntentText(value);
  const isEditorialTemplate = /luxury|premium|fashion|editorial|high-ticket|product-store/.test(`${templateId} ${catalogType}`);
  if (/quiero|necesito|debe|puede|para venderlo|lo que quiero/.test(normalized)) return true;
  if (/\n/.test(value)) return true;
  if (isEditorialTemplate && value.length > 42) return true;
  return value.length > 70;
}

function safeRevisionHeadline(schema, payload = {}, templateSelection = null) {
  const language = payload.selectedLanguage || schema.business?.selectedLanguage || builderState.selectedLanguage || "en";
  const name = payload.business_name || schema.business?.name || builderState.guidedState.businessName || "Kreaton";
  const key = `${templateSelection?.templateId || schema.selected_template?.id || schema.active_template?.id || ""} ${templateSelection?.catalogType || schema.catalog_model?.catalogType || ""}`;
  if (/luxury|high-ticket/.test(key)) {
    return langTextFor(language, {
      en: `${name}: private collection`,
      es: `${name}: colección privada`,
      fr: `${name}: collection privée`,
      pt: `${name}: coleção privada`,
    });
  }
  if (/premium|product-store|editorial/.test(key)) {
    return langTextFor(language, {
      en: `${name}, designed to stand out`,
      es: `${name}, diseñado para destacar`,
      fr: `${name}, conçu pour se distinguer`,
      pt: `${name}, criado para se destacar`,
    });
  }
  if (/marketplace|retail|store|catalog/.test(key)) {
    return langTextFor(language, {
      en: `${name}: find it fast`,
      es: `${name}: encuentra todo rápido`,
      fr: `${name}: trouvez vite ce qu'il faut`,
      pt: `${name}: encontre tudo rápido`,
    });
  }
  return langTextFor(language, {
    en: `${name} built with clarity`,
    es: `${name} con una presencia clara`,
    fr: `${name} avec une présence claire`,
    pt: `${name} com presença clara`,
  });
}

function safeRevisionSubtitle(schema, payload = {}, templateSelection = null) {
  const language = payload.selectedLanguage || schema.business?.selectedLanguage || builderState.selectedLanguage || "en";
  const description = payload.business_description || schema.business?.description || "";
  const key = `${templateSelection?.templateId || schema.selected_template?.id || schema.active_template?.id || ""} ${templateSelection?.catalogType || schema.catalog_model?.catalogType || ""}`;
  const context = cleanShortText(description, 130);
  if (/luxury|high-ticket/.test(key)) {
    return langTextFor(language, {
      en: "A curated buying experience with clear categories, private inquiry, and a polished path from discovery to request.",
      es: "Una experiencia de compra curada, con categorías claras, consulta privada y una ruta elegante desde descubrir hasta solicitar.",
      fr: "Une expérience d'achat soignée, avec catégories claires, demande privée et parcours élégant.",
      pt: "Uma experiência de compra curada, com categorias claras, consulta privada e caminho elegante até o pedido.",
    });
  }
  if (context) return context;
  return langTextFor(language, {
    en: "A focused, editable draft with cleaner spacing, stronger hierarchy, and a safer responsive layout.",
    es: "Un borrador editable con mejor espaciado, jerarquía más clara y layout responsive más seguro.",
    fr: "Un brouillon modifiable avec meilleur espacement, hiérarchie claire et mise en page responsive sûre.",
    pt: "Um rascunho editável com melhor espaçamento, hierarquia clara e layout responsivo mais seguro.",
  });
}

function langTextFor(language, options = {}) {
  return options[language] || options.en || Object.values(options).find(Boolean) || "";
}

function mergeCatalogFromOfferItems(existingItems = [], offerItems = [], payload = {}) {
  const labels = instantLocaleCopy(payload.selectedLanguage || builderState.selectedLanguage || "en");
  const categoryContext = [
    payload.business_description,
    payload.industry,
    payload.templateIntent,
    arrayValue(payload.services_products).join(" "),
    arrayValue(offerItems).join(" "),
  ].join(" ");
  const existing = arrayValue(existingItems);
  const known = new Set(existing.map((item) => normalizeTemplateIntentText(item.name || item.title || item)));
  const additions = meaningfulOfferItems(offerItems)
    .filter((item) => !known.has(normalizeTemplateIntentText(item)))
    .map((name, index) => ({
      id: `chat_item_${Date.now()}_${index}`,
      sku: `CHAT-${existing.length + index + 1}`,
      name,
      description: labels.itemDescription(payload.business_name || builderState.guidedState.businessName || labels.newStore),
      category: marketplaceCategoryForIndex(existing.length + index, labels, categoryContext, payload.selectedLanguage || builderState.selectedLanguage || "en"),
      price_type: "fixed",
      price_amount: "",
      currency: "USD",
      price_label: labels.priceNotSet,
      button_label: labels.viewProduct,
      inventory_quantity: "",
      track_inventory: true,
      image_url: "",
      is_active: true,
      is_featured: existing.length + index < 3,
      sort_order: existing.length + index,
    }));
  return [...existing, ...additions];
}

const SEMANTIC_SEED_PRODUCT_LIBRARY = {
  jewelry: [
    { name: { en: "Aurora Crystal Layered Necklace", es: "Collar Aurora de Cristal" }, category: { en: "Necklaces", es: "Collares" }, price: 42.0, keyword: "handmade-crystal-necklace", description: { en: "A luminous layered necklace designed for everyday shine and special looks. Lightweight, gift-ready, and easy to combine with minimalist or bold outfits.", es: "Collar en capas con brillo delicado para uso diario y looks especiales. Ligero, listo para regalo y facil de combinar con estilos minimalistas o llamativos." } },
    { name: { en: "Luna Pearl Charm Bracelet", es: "Pulsera Luna con Dijes Perla" }, category: { en: "Bracelets", es: "Pulseras" }, price: 34.5, keyword: "pearl-charm-bracelet", description: { en: "A polished bracelet with soft pearl accents and adjustable comfort. Built for customers who want a refined detail without feeling too formal.", es: "Pulsera pulida con detalles tipo perla y ajuste comodo. Pensada para clientes que quieren un detalle refinado sin sentirse demasiado formal." } },
    { name: { en: "Noir Statement Earrings", es: "Aretes Noir Statement" }, category: { en: "Earrings", es: "Aretes" }, price: 29.99, keyword: "statement-earrings", description: { en: "Bold earrings that frame the face with a clean boutique finish. Ideal for evening outfits, events, and high-impact product photography.", es: "Aretes llamativos que enmarcan el rostro con acabado boutique. Ideales para salidas, eventos y fotos de producto de alto impacto." } },
    { name: { en: "Sol Minimal Ring Set", es: "Set de Anillos Sol Minimal" }, category: { en: "Rings", es: "Anillos" }, price: 26.0, keyword: "minimal-ring-set", description: { en: "A stackable ring set with a clean metallic look. Customers can wear one piece alone or combine the full set for a curated finish.", es: "Set de anillos apilables con acabado metalico limpio. El cliente puede usar una pieza sola o combinar el set completo para un look curado." } },
    { name: { en: "Celeste Gift Jewelry Box", es: "Caja Regalo Celeste de Bisuteria" }, category: { en: "Gift sets", es: "Sets de regalo" }, price: 58.0, keyword: "jewelry-gift-box", description: { en: "A ready-to-gift accessory set with coordinated pieces and premium presentation. Perfect for birthdays, holidays, and quick online gifting.", es: "Set de accesorios listo para regalar con piezas coordinadas y presentacion premium. Perfecto para cumpleanos, temporadas y regalos online rapidos." } },
    { name: { en: "Muse Custom Initial Charm", es: "Charm Muse con Inicial Personalizada" }, category: { en: "Custom pieces", es: "Piezas personalizadas" }, price: 21.5, keyword: "custom-initial-charm", description: { en: "A personal charm made to add identity to chains, bracelets, or gift sets. Small, memorable, and ideal for repeat purchases.", es: "Charm personal para agregar identidad a cadenas, pulseras o sets de regalo. Pequeno, memorable e ideal para compras recurrentes." } },
  ],
  fashion: [
    { name: { en: "NeoFlex Street Jacket", es: "Chaqueta Street NeoFlex" }, category: { en: "Outerwear", es: "Abrigos" }, price: 79.0, keyword: "streetwear-jacket", description: { en: "A lightweight statement jacket with urban energy and everyday comfort. Designed as the hero piece for drops, bundles, and social-first product pages.", es: "Chaqueta ligera con energia urbana y comodidad diaria. Disenada como pieza protagonista para drops, combos y paginas enfocadas en redes." } },
    { name: { en: "Core Graphic Oversized Tee", es: "Camiseta Grafica Core Oversized" }, category: { en: "T-shirts", es: "Camisetas" }, price: 32.0, keyword: "oversized-graphic-tshirt", description: { en: "A soft oversized tee with a strong graphic presence. Easy to style, easy to photograph, and built for repeat seasonal drops.", es: "Camiseta oversized suave con presencia grafica fuerte. Facil de combinar, facil de fotografiar y lista para drops por temporada." } },
    { name: { en: "Pulse Utility Crossbody", es: "Bolso Cruzado Pulse Utility" }, category: { en: "Accessories", es: "Accesorios" }, price: 46.5, keyword: "utility-crossbody-bag", description: { en: "Compact storage with a clean fashion profile for daily carry. Fits essentials while keeping the outfit intentional and modern.", es: "Almacenamiento compacto con perfil moderno para uso diario. Guarda lo esencial y mantiene el outfit intencional y actual." } },
    { name: { en: "Volt Ribbed Crop Top", es: "Top Crop Acanalado Volt" }, category: { en: "Tops", es: "Tops" }, price: 27.99, keyword: "ribbed-crop-top", description: { en: "A fitted staple with strong color potential and a premium hand feel. Ideal for lookbook grids, bundles, and quick-size selection.", es: "Pieza ajustada basica con potencial de color y tacto premium. Ideal para lookbooks, combos y seleccion rapida de tallas." } },
    { name: { en: "Apex Cargo Denim", es: "Jean Cargo Apex" }, category: { en: "Denim", es: "Denim" }, price: 68.0, keyword: "cargo-denim-jeans", description: { en: "Structured cargo denim with utility details and a clean silhouette. A practical best-seller candidate for customers who want style and function.", es: "Denim cargo estructurado con detalles utilitarios y silueta limpia. Candidato a best seller para clientes que buscan estilo y funcion." } },
    { name: { en: "Orbit Sneaker Low", es: "Sneaker Orbit Low" }, category: { en: "Footwear", es: "Calzado" }, price: 89.0, keyword: "modern-sneakers", description: { en: "A versatile sneaker with a crisp profile for everyday movement. Built to anchor outfits across casual, streetwear, and travel looks.", es: "Sneaker versatil con perfil limpio para movimiento diario. Pensado para completar looks casuales, streetwear y de viaje." } },
  ],
  coffee: [
    { name: { en: "Single Origin Espresso Blend", es: "Blend Espresso Origen Unico" }, category: { en: "Coffee beans", es: "Cafe en grano" }, price: 18.5, keyword: "single-origin-coffee-beans", description: { en: "A balanced espresso blend with cocoa notes, smooth body, and a clean finish. Built for customers who want cafe-quality coffee at home.", es: "Blend espresso balanceado con notas de cacao, cuerpo suave y final limpio. Ideal para clientes que quieren cafe de calidad en casa." } },
    { name: { en: "Cold Brew Concentrate", es: "Concentrado Cold Brew" }, category: { en: "Ready to drink", es: "Listo para tomar" }, price: 14.99, keyword: "cold-brew-coffee", description: { en: "A smooth cold brew concentrate made for fast morning routines and premium iced drinks. Mix with water, milk, or signature syrups.", es: "Concentrado cold brew suave para rutinas rapidas y bebidas frias premium. Mezcla con agua, leche o siropes de autor." } },
    { name: { en: "Ceramic Pour-Over Kit", es: "Kit Pour Over Ceramico" }, category: { en: "Brewing gear", es: "Equipo de preparacion" }, price: 38.0, keyword: "ceramic-pour-over-coffee", description: { en: "A clean brewing kit for slow coffee rituals and giftable home setups. Helps customers control extraction, aroma, and presentation.", es: "Kit de preparacion limpio para rituales de cafe lento y regalos de casa. Ayuda a controlar extraccion, aroma y presentacion." } },
    { name: { en: "Vanilla Oat Latte Pack", es: "Pack Latte Avena Vainilla" }, category: { en: "Bundles", es: "Combos" }, price: 24.0, keyword: "vanilla-oat-latte", description: { en: "A ready-to-enjoy latte bundle with cozy vanilla notes and dairy-free flexibility. Designed for repeat orders and seasonal campaigns.", es: "Combo latte listo para disfrutar con notas de vainilla y opcion sin lacteos. Disenado para recompra y campanas de temporada." } },
    { name: { en: "House Roast Subscription", es: "Suscripcion House Roast" }, category: { en: "Subscriptions", es: "Suscripciones" }, price: 29.0, keyword: "coffee-subscription-box", description: { en: "Fresh roasted coffee delivered on a recurring schedule. A strong retention product for customers who never want to run out.", es: "Cafe recien tostado entregado de forma recurrente. Producto fuerte de retencion para clientes que no quieren quedarse sin cafe." } },
    { name: { en: "Signature Tasting Flight", es: "Flight de Cata Signature" }, category: { en: "Gift sets", es: "Sets de regalo" }, price: 36.0, keyword: "coffee-tasting-set", description: { en: "A curated tasting box with multiple roast profiles and clear flavor notes. Perfect for gifting, discovery, and premium product storytelling.", es: "Caja de cata curada con varios perfiles de tueste y notas claras. Perfecta para regalos, descubrimiento y narrativa premium." } },
  ],
  auto: [
    { name: { en: "TrailGuard 4x4 Front Bumper", es: "Parachoques Frontal TrailGuard 4x4" }, category: { en: "Bumpers", es: "Parachoques" }, price: 649.0, keyword: "off-road-front-bumper", description: { en: "Heavy-duty front protection built for 4x4 trucks, trail routes, and aggressive styling. Designed for buyers comparing durability, fitment, and finish.", es: "Proteccion frontal reforzada para camionetas 4x4, rutas off-road y estilo agresivo. Pensada para compradores que comparan resistencia, ajuste y acabado." } },
    { name: { en: "RaptorLine Skid Plate Kit", es: "Kit Protector RaptorLine Skid Plate" }, category: { en: "Protection", es: "Proteccion" }, price: 289.0, keyword: "truck-skid-plate", description: { en: "Underbody protection for rocky terrain and work-ready trucks. A practical upgrade for customers who want confidence beyond the pavement.", es: "Proteccion inferior para terrenos rocosos y camionetas de trabajo. Mejora practica para clientes que quieren confianza fuera del asfalto." } },
    { name: { en: "AeroMax LED Light Bar", es: "Barra LED AeroMax" }, category: { en: "Lighting", es: "Iluminacion" }, price: 159.99, keyword: "led-light-bar-truck", description: { en: "High-output lighting for night trails, job sites, and rugged builds. Adds visibility, presence, and a strong visual upgrade.", es: "Iluminacion potente para rutas nocturnas, trabajo y builds robustas. Agrega visibilidad, presencia y mejora visual fuerte." } },
    { name: { en: "Overland Recovery Strap Set", es: "Set de Eslingas Overland Recovery" }, category: { en: "Recovery", es: "Rescate" }, price: 74.5, keyword: "off-road-recovery-strap", description: { en: "Recovery straps and hardware packed for trail safety and quick response. A high-trust add-on for off-road shoppers.", es: "Eslingas y herrajes para seguridad de ruta y respuesta rapida. Complemento de alta confianza para compradores off-road." } },
    { name: { en: "RidgeFit Fender Flares", es: "Extensiones Fender RidgeFit" }, category: { en: "Exterior", es: "Exterior" }, price: 219.0, keyword: "truck-fender-flares", description: { en: "Bold fender coverage with a clean molded look for wider wheels and rugged stance. Built for model-based catalog filtering.", es: "Cobertura de guardafangos con acabado limpio para rines anchos y presencia robusta. Ideal para catalogo filtrado por modelo." } },
    { name: { en: "CabinVault Cargo Organizer", es: "Organizador de Cabina CabinVault" }, category: { en: "Interior", es: "Interior" }, price: 54.99, keyword: "car-cargo-organizer", description: { en: "A practical organizer for tools, cables, emergency kits, and travel gear. Helps increase average order value with simple utility.", es: "Organizador practico para herramientas, cables, kit de emergencia y viaje. Ayuda a subir el ticket promedio con utilidad simple." } },
  ],
  tech: [
    { name: { en: "HoloGrip MagSafe Phone Stand", es: "Base Magnetica HoloGrip para Telefono" }, category: { en: "Mobile accessories", es: "Accesorios moviles" }, price: 19.99, keyword: "magsafe-phone-stand", description: { en: "A compact magnetic stand for desk setups, video calls, and hands-free viewing. Small, useful, and easy to sell as an impulse add-on.", es: "Base magnetica compacta para escritorio, videollamadas y uso manos libres. Pequena, util y facil de vender como complemento." } },
    { name: { en: "PulseDrive USB-C Turbo Cable", es: "Cable USB-C Turbo PulseDrive" }, category: { en: "Charging", es: "Carga" }, price: 12.5, keyword: "usb-c-fast-charging-cable", description: { en: "Braided fast-charge cable built for daily use and clean merchandising. A reliable essential for tech shoppers and bundle offers.", es: "Cable trenzado de carga rapida para uso diario y merchandising limpio. Esencial confiable para compradores tech y combos." } },
    { name: { en: "Mini Nebula Projector", es: "Mini Proyector Nebula" }, category: { en: "Entertainment", es: "Entretenimiento" }, price: 129.0, keyword: "mini-portable-projector", description: { en: "A portable projector for rooms, trips, and quick entertainment setups. Strong visual product for marketplace hero placements.", es: "Proyector portatil para habitaciones, viajes y entretenimiento rapido. Producto visual fuerte para destacados de marketplace." } },
    { name: { en: "Retro Reactor Keycap Set", es: "Set de Keycaps Retro Reactor" }, category: { en: "Gaming", es: "Gaming" }, price: 49.0, keyword: "mechanical-keyboard-keycaps", description: { en: "A limited-run mechanical keyboard keycap set with bright desk appeal. Built for gamers, creators, and customization shoppers.", es: "Set limitado de keycaps para teclado mecanico con alto impacto visual. Pensado para gamers, creadores y compradores de personalizacion." } },
    { name: { en: "CyberLamp Ambient Desk Light", es: "Lampara de Escritorio CyberLamp" }, category: { en: "Desk setup", es: "Setup de escritorio" }, price: 59.0, keyword: "rgb-desk-lamp", description: { en: "Customizable ambient lighting for desks, rooms, and streaming spaces. Adds mood, color, and a strong upsell for tech carts.", es: "Luz ambiental personalizable para escritorios, habitaciones y streaming. Agrega atmosfera, color y mejora el valor del carrito." } },
    { name: { en: "GlowPatch Sticker Pack", es: "Pack de Stickers GlowPatch" }, category: { en: "Collectibles", es: "Coleccionables" }, price: 9.99, keyword: "holographic-sticker-pack", description: { en: "A weatherproof glow-style sticker pack for laptops, bottles, cars, and gifts. Affordable, collectible, and ideal for checkout add-ons.", es: "Pack de stickers estilo glow resistente para laptops, botellas, carros y regalos. Accesible, coleccionable e ideal como add-on." } },
  ],
  beauty: [
    { name: { en: "GlowReset Vitamin C Serum", es: "Serum Vitamina C GlowReset" }, category: { en: "Skincare", es: "Cuidado facial" }, price: 28.0, keyword: "vitamin-c-serum", description: { en: "A brightening serum positioned for daily routines and visible glow. Strong for educational product pages and subscription bundles.", es: "Serum iluminador para rutinas diarias y brillo visible. Ideal para paginas educativas de producto y combos de suscripcion." } },
    { name: { en: "HydraCloud Moisture Cream", es: "Crema Hidratante HydraCloud" }, category: { en: "Moisturizers", es: "Hidratantes" }, price: 32.5, keyword: "moisturizing-face-cream", description: { en: "A rich but lightweight moisturizer for soft skin and simple routine building. Easy to pair with cleansers, serums, and bundles.", es: "Hidratante rica pero ligera para piel suave y rutina simple. Facil de combinar con limpiadores, serums y kits." } },
    { name: { en: "SilkFinish Lip Oil", es: "Lip Oil SilkFinish" }, category: { en: "Lips", es: "Labios" }, price: 16.99, keyword: "lip-oil-beauty", description: { en: "A glossy lip oil with a soft finish and giftable look. Designed for quick purchases, social content, and shade collections.", es: "Aceite labial con brillo suave y apariencia lista para regalo. Disenado para compras rapidas, contenido social y colecciones de tonos." } },
    { name: { en: "CleanSkin Travel Kit", es: "Kit de Viaje CleanSkin" }, category: { en: "Kits", es: "Kits" }, price: 44.0, keyword: "skincare-travel-kit", description: { en: "A travel-ready routine kit with essentials packed for convenience. A strong starter product for new customers.", es: "Kit de rutina listo para viaje con esenciales practicos. Producto ideal para iniciar a nuevos clientes." } },
    { name: { en: "Rose Quartz Face Roller", es: "Rodillo Facial Rose Quartz" }, category: { en: "Tools", es: "Herramientas" }, price: 22.0, keyword: "rose-quartz-face-roller", description: { en: "A soothing beauty tool for self-care rituals and premium product photography. Pairs naturally with serums and creams.", es: "Herramienta de belleza calmante para rituales de cuidado y fotografia premium. Combina naturalmente con serums y cremas." } },
    { name: { en: "NightRepair Mask", es: "Mascarilla NightRepair" }, category: { en: "Masks", es: "Mascarillas" }, price: 25.0, keyword: "night-face-mask-skincare", description: { en: "A replenishing night mask designed for soft, rested-looking skin. Good for routine bundles, promotions, and repeat purchases.", es: "Mascarilla nocturna reparadora para piel suave y descansada. Buena para combos de rutina, promociones y recompra." } },
  ],
  home: [
    { name: { en: "Nordic Arc Table Lamp", es: "Lampara de Mesa Nordic Arc" }, category: { en: "Lighting", es: "Iluminacion" }, price: 68.0, keyword: "nordic-table-lamp", description: { en: "A sculptural lamp with warm light and a clean silhouette. Strong visual anchor for home decor collections and lifestyle shots.", es: "Lampara escultorica con luz calida y silueta limpia. Ancla visual fuerte para colecciones de hogar y fotos lifestyle." } },
    { name: { en: "LinenSoft Throw Blanket", es: "Manta LinenSoft" }, category: { en: "Textiles", es: "Textiles" }, price: 39.99, keyword: "linen-throw-blanket", description: { en: "A soft throw blanket for sofas, bedrooms, and giftable home styling. Simple, tactile, and easy to bundle with cushions.", es: "Manta suave para sofas, habitaciones y regalos de hogar. Simple, tactil y facil de combinar con cojines." } },
    { name: { en: "CasaMist Ceramic Diffuser", es: "Difusor Ceramico CasaMist" }, category: { en: "Wellness", es: "Bienestar" }, price: 45.0, keyword: "ceramic-aroma-diffuser", description: { en: "A quiet ceramic diffuser for calm rooms and daily rituals. Adds lifestyle value and pairs well with oils and gift sets.", es: "Difusor ceramico silencioso para espacios tranquilos y rituales diarios. Agrega valor lifestyle y combina con aceites y regalos." } },
    { name: { en: "OakGrid Desk Organizer", es: "Organizador de Escritorio OakGrid" }, category: { en: "Organization", es: "Organizacion" }, price: 31.5, keyword: "wood-desk-organizer", description: { en: "A clean organizer for workspaces, shelves, and entry tables. Useful, photogenic, and built for productivity-focused shoppers.", es: "Organizador limpio para escritorios, repisas y entradas. Util, fotogenico y pensado para compradores enfocados en productividad." } },
    { name: { en: "MarbleDot Coaster Set", es: "Set de Posavasos MarbleDot" }, category: { en: "Dining", es: "Mesa" }, price: 18.0, keyword: "marble-coaster-set", description: { en: "A refined coaster set for coffee tables and dining spaces. Small enough for add-ons, polished enough for gift positioning.", es: "Set de posavasos refinado para mesas de cafe y comedor. Pequeno para add-ons y pulido para posicionarlo como regalo." } },
    { name: { en: "UrbanLeaf Planter Duo", es: "Duo de Macetas UrbanLeaf" }, category: { en: "Decor", es: "Decoracion" }, price: 36.0, keyword: "modern-indoor-planter", description: { en: "A modern planter pair for shelves, desks, and indoor greenery. Helps the store tell a warmer home lifestyle story.", es: "Par de macetas modernas para repisas, escritorios y plantas interiores. Ayuda a contar una historia de hogar mas calida." } },
  ],
  restaurant: [
    { name: { en: "Smoked Brisket Tacos", es: "Tacos de Brisket Ahumado" }, category: { en: "Mains", es: "Principales" }, price: 16.0, keyword: "brisket-tacos", description: { en: "Slow-smoked brisket served in warm tortillas with fresh toppings and house sauce. A strong signature item for pickup, delivery, and specials.", es: "Brisket ahumado lentamente en tortillas calientes con toppings frescos y salsa de la casa. Plato fuerte para pickup, delivery y especiales." } },
    { name: { en: "Citrus Avocado Salad", es: "Ensalada Citrus Avocado" }, category: { en: "Starters", es: "Entradas" }, price: 12.5, keyword: "avocado-citrus-salad", description: { en: "Fresh greens, avocado, citrus, and crunchy texture for a bright starter. Designed to balance heavier menu items and attract lighter orders.", es: "Verdes frescos, aguacate, citricos y textura crujiente para una entrada brillante. Equilibra platos fuertes y atrae pedidos ligeros." } },
    { name: { en: "Truffle Mushroom Flatbread", es: "Flatbread de Hongos Trufados" }, category: { en: "Specials", es: "Especiales" }, price: 18.0, keyword: "mushroom-flatbread", description: { en: "Crisp flatbread with mushrooms, melted cheese, and truffle aroma. Premium enough for specials, approachable enough for repeat orders.", es: "Flatbread crujiente con hongos, queso fundido y aroma de trufa. Premium para especiales y accesible para pedidos recurrentes." } },
    { name: { en: "House Lime Refresher", es: "Refrescante de Lima de la Casa" }, category: { en: "Drinks", es: "Bebidas" }, price: 6.5, keyword: "lime-mocktail", description: { en: "A bright house drink with lime, herbs, and a clean finish. Easy to promote with combos, lunch offers, and online ordering.", es: "Bebida de la casa con lima, hierbas y final limpio. Facil de promocionar con combos, almuerzos y pedidos online." } },
    { name: { en: "Chef's Dessert Jar", es: "Postre del Chef en Jar" }, category: { en: "Desserts", es: "Postres" }, price: 8.0, keyword: "dessert-jar", description: { en: "A layered dessert jar built for delivery stability and strong photos. Sweet, portable, and ideal for upsells.", es: "Postre en capas pensado para delivery y fotos atractivas. Dulce, portable e ideal para agregar al pedido." } },
    { name: { en: "Family Combo Box", es: "Combo Familiar Box" }, category: { en: "Combos", es: "Combos" }, price: 42.0, keyword: "family-meal-box", description: { en: "A shareable meal box with mains, sides, and drinks for simple group ordering. Built to raise average ticket value.", es: "Caja para compartir con principales, acompanantes y bebidas para pedidos grupales. Disenada para subir el ticket promedio." } },
  ],
  default: [
    { name: { en: "Studio Carry Tote", es: "Bolso Tote Studio" }, category: { en: "Accessories", es: "Accesorios" }, price: 39.0, keyword: "minimal-canvas-tote-bag", description: { en: "A clean everyday tote with sturdy handles and a polished retail look. Useful as a real starter product for lifestyle, gift, or boutique stores.", es: "Bolso tote limpio para uso diario, con asas resistentes y apariencia retail pulida. Sirve como producto inicial real para tiendas lifestyle, regalos o boutique." } },
    { name: { en: "Ceramic Desk Tray", es: "Bandeja Ceramica de Escritorio" }, category: { en: "Home office", es: "Oficina en casa" }, price: 28.0, keyword: "ceramic-desk-tray", description: { en: "A refined tray for keys, jewelry, stationery, or daily essentials. Small, photogenic, and easy to position as an add-on purchase.", es: "Bandeja refinada para llaves, bisuteria, papeleria o esenciales diarios. Pequena, fotogenica y facil de vender como complemento." } },
    { name: { en: "Soft Linen Pouch", es: "Pouch de Lino Soft" }, category: { en: "Storage", es: "Organizacion" }, price: 24.0, keyword: "linen-zip-pouch", description: { en: "A soft zip pouch for travel, cosmetics, accessories, or small tools. Practical enough for repeat use and clean enough for premium presentation.", es: "Pouch suave con cierre para viaje, cosmeticos, accesorios o herramientas pequenas. Practico para uso recurrente y limpio para presentacion premium." } },
    { name: { en: "Matte Gift Card Set", es: "Set de Tarjetas Regalo Matte" }, category: { en: "Gift details", es: "Detalles de regalo" }, price: 18.0, keyword: "minimal-gift-card-set", description: { en: "A tasteful card set for wrapping, thank-you notes, and curated orders. Adds a personal touch without turning the catalog into fake bundles.", es: "Set de tarjetas sobrias para envoltorios, notas de agradecimiento y pedidos curados. Agrega detalle personal sin convertir el catalogo en combos falsos." } },
    { name: { en: "Modern Display Stand", es: "Base de Exhibicion Moderna" }, category: { en: "Display", es: "Exhibicion" }, price: 34.0, keyword: "minimal-product-display-stand", description: { en: "A compact display stand for showcasing small products, samples, or featured pieces. Helps a new store look organized and ready to sell.", es: "Base compacta para exhibir productos pequenos, muestras o piezas destacadas. Ayuda a que una tienda nueva se vea ordenada y lista para vender." } },
    { name: { en: "Signature Care Kit", es: "Kit de Cuidado Signature" }, category: { en: "Care", es: "Cuidado" }, price: 22.0, keyword: "product-care-kit", description: { en: "A simple care kit for keeping products clean, stored, and ready to use. Works as a realistic accessory item across many store types.", es: "Kit simple para mantener productos limpios, guardados y listos para usar. Funciona como accesorio realista para varios tipos de tienda." } },
  ],
};

function ensureSemanticSeedContent(schema, payload = {}, templateSelection = null) {
  if (!schema) return schema;
  const nextSchema = structuredClone(schema);
  const language = nextSchema.business?.selectedLanguage || payload.selectedLanguage || builderState.selectedLanguage || "en";
  const contextText = semanticSeedContextText(nextSchema, payload, templateSelection);
  const templateText = `${templateSelection?.templateId || ""} ${templateSelection?.catalogType || ""} ${nextSchema.selected_template?.id || ""} ${nextSchema.layout_mode?.template_id || ""} ${nextSchema.catalog_model?.catalogType || ""}`;
  const templateCommerce = /marketplace|retail|online_store|product|fashion|luxury|restaurant|menu|digital|ecommerce|dense_marketplace|dense_retail|single_vendor/i.test(`${templateText} ${nextSchema.site_type || ""}`);
  const serviceOnlyTemplate = /legal|professional_services|clinic|medical|home_services|service_area|booking|b2b|industrial|company_services|lead_funnel/i.test(templateText)
    && !/restaurant|menu|digital|product|fashion|marketplace|retail|luxury/i.test(templateText);
  const clientCommerce = /tienda|store|shop|marketplace|catalogo|producto|productos|vender|comprar|restaurant|menu|online/i.test(contextText);
  const shouldSeedCatalog = templateCommerce || (clientCommerce && !serviceOnlyTemplate);
  if (!shouldSeedCatalog) return nextSchema;

  const profileKey = inferSemanticSeedProfile(contextText, templateText);
  const copyKit = semanticSeedCopyKit(profileKey, nextSchema.business?.name || payload.business_name || builderState.guidedState.businessName || "Kreaton Store", language, templateText);
  // Bug fix (2026-07-19): inferSemanticSeedProfile() only recognizes ~9
  // hardcoded niches (jewelry, fashion, coffee, auto, tech, beauty, home,
  // restaurant, marketplace). Anything else the client actually describes
  // -- boat parts, fishing gear, extreme sports, whatever -- fell into
  // "default", which returned a fixed, unrelated catalog (tote bags, desk
  // trays) with no connection to the real business. When the client has
  // already named real products/services in the conversation, build the
  // seed items from THEIR OWN WORDS instead of the generic library, so an
  // unmatched niche still looks like their business. Only falls back to
  // the generic placeholder when there is truly nothing to go on yet
  // (empty conversation). See AGENT_LOG.md for the matching backend fix.
  const seedItems = profileKey === "default"
    ? (buildContextDerivedSeedProducts(contextText, language) || buildSemanticSeedProducts(profileKey, language))
    : buildSemanticSeedProducts(profileKey, language);
  const existing = arrayValue(nextSchema.catalog_items || nextSchema.products_services);
  const catalogSource = catalogSourceFromSchema(nextSchema);
  const mergedCatalog = mergeSemanticSeedCatalog(existing, seedItems, language, contextText, {
    catalogSource,
  });

  nextSchema.catalog_items = mergedCatalog;
  if (Array.isArray(nextSchema.products_services)) {
    nextSchema.products_services = mergedCatalog;
  }
  nextSchema.business = {
    ...(nextSchema.business || {}),
    industry: isWeakSeedCopy(nextSchema.business?.industry, payload) ? copyKit.industry : nextSchema.business?.industry,
    description: isWeakSeedCopy(nextSchema.business?.description, payload) ? copyKit.businessDescription : nextSchema.business?.description,
  };
  nextSchema.pages = fillSemanticSeedPageCopy(nextSchema.pages, copyKit, payload);
  nextSchema.seed_content_rules = {
    ...(nextSchema.seed_content_rules || {}),
    niche: profileKey,
    catalog_count: mergedCatalog.length,
    no_lorem: true,
    no_generic_products: true,
    unsplash_featured_urls: true,
    catalog_source: catalogSource || "unknown",
  };
  return nextSchema;
}

function semanticSeedContextText(schema = {}, payload = {}, templateSelection = null) {
  return normalizeTemplateIntentText([
    payload.business_name,
    payload.business_description,
    payload.industry,
    arrayValue(payload.services_products).join(" "),
    payload.target_audience,
    payload.preferred_tone,
    arrayValue(payload.preferred_colors).join(" "),
    schema.business?.name,
    schema.business?.description,
    schema.business?.industry,
    arrayValue(schema.catalog_items || schema.products_services).map((item) => item.name || item.title || item).join(" "),
  ].join(" "));
}

function inferSemanticSeedProfile(contextText = "", templateText = "") {
  const text = normalizeTemplateIntentText(contextText);
  if (textSuggestsBroadMarketplace(text) || textSuggestsMegaRetailStore(text)) return "marketplace";
  if (/restaurant|restaurante|menu|food|comida|cafe|coffee|bakery|bar|pizza|taco/.test(text)) return /coffee|cafe/.test(text) ? "coffee" : "restaurant";
  if (textSuggestsJewelryAccessoryStore(text)) return "jewelry";
  if (/parachoques|bumper|4x4|off road|off-road|auto parts|repuestos|automotriz|camioneta|truck|motos?|car accessories/.test(text)) return "auto";
  if (/ropa|fashion|moda|streetwear|sneaker|zapato|camiseta|clothing|apparel|boutique/.test(text)) return "fashion";
  if (/beauty|belleza|skincare|cosmet|maquillaje|spa|bath|bano|baño|jabon|jabón|soap|vela|velas|candle|personal care|cuidado personal/.test(text)) return "beauty";
  if (/decor|hogar|home|furniture|muebles|interior|lampara|casa/.test(text)) return "home";
  if (/tech|tecnologia|gadget|electron|gaming|usb|phone|laptop|anime|juguete|toy|curioso|raro|inusual|cyberpunk/.test(text)) return "tech";
  if (/luxury|lujo|premium|exclusive|exclusivo|alta gama|private|privado/.test(text)) return "default";
  return "default";
}

function buildSemanticSeedProducts(profileKey = "default", language = builderState.selectedLanguage) {
  const products = profileKey === "marketplace"
    ? [
      SEMANTIC_SEED_PRODUCT_LIBRARY.tech[0],
      SEMANTIC_SEED_PRODUCT_LIBRARY.fashion[0],
      SEMANTIC_SEED_PRODUCT_LIBRARY.auto[5],
      SEMANTIC_SEED_PRODUCT_LIBRARY.tech[2],
      SEMANTIC_SEED_PRODUCT_LIBRARY.home[0],
      SEMANTIC_SEED_PRODUCT_LIBRARY.tech[5],
    ]
    : SEMANTIC_SEED_PRODUCT_LIBRARY[profileKey] || SEMANTIC_SEED_PRODUCT_LIBRARY.default;
  return products.slice(0, 6).map((product, index) => {
    const name = localizedSeedValue(product.name, language);
    const category = localizedSeedValue(product.category, language);
    const description = localizedSeedValue(product.description, language);
    return {
      id: `prod_${String(index + 1).padStart(3, "0")}`,
      sku: `${profileKey.slice(0, 3).toUpperCase()}-${String(index + 1).padStart(3, "0")}`,
      name,
      description,
      category,
      price: Number(product.price),
      price_type: "fixed",
      price_value: Number(product.price),
      price_amount: Number(product.price),
      currency: "USD",
      price_label: `USD ${Number(product.price).toFixed(2)}`,
      rating: Number((4.5 + (index % 4) * 0.1).toFixed(1)),
      review_count: 36 + index * 29,
      badge: index === 0 ? "Best Seller" : index === 1 ? "New" : index === 2 ? "Fast Ship" : "Featured",
      deal_label: index === 0 ? "Best Seller" : index % 2 === 0 ? "Featured" : "",
      shipping_label: index % 2 === 0 ? "Fast ship" : "Ready to ship",
      button_label: language === "es" ? "Agregar al carrito" : language === "fr" ? "Ajouter" : language === "pt" ? "Adicionar" : "Add to cart",
      inventory_quantity: 18 + index * 7,
      track_inventory: true,
      imageSearchQuery: product.keyword,
      image_url: unsplashSeedUrl(product.keyword),
      is_active: true,
      is_featured: index < 4,
      sort_order: index,
    };
  });
}

function buildContextDerivedSeedProducts(contextText = "", language = builderState.selectedLanguage) {
  const offerItems = meaningfulOfferItems(builderState.guidedState.servicesProducts);
  if (!offerItems.length) return null;
  const addLabel = language === "es" ? "Agregar al carrito" : language === "fr" ? "Ajouter" : language === "pt" ? "Adicionar" : "Add to cart";
  const businessName = builderState.guidedState.businessName || "";
  return offerItems.slice(0, 6).map((rawName, index) => {
    const name = cleanShortText(rawName, 90) || rawName;
    return {
      id: `prod_${String(index + 1).padStart(3, "0")}`,
      sku: `CTX-${String(index + 1).padStart(3, "0")}`,
      name,
      description: langText({
        en: `A featured offer from ${businessName || "this business"}. Edit this with the real details.`,
        es: `Una oferta destacada de ${businessName || "este negocio"}. Edita esto con los detalles reales.`,
        fr: `Une offre en vedette de ${businessName || "cette entreprise"}. Modifiez avec les vrais details.`,
        pt: `Uma oferta em destaque de ${businessName || "este negocio"}. Edite com os detalhes reais.`,
      }, language),
      category: langText({ en: "Featured", es: "Destacado", fr: "En vedette", pt: "Destaque" }, language),
      price: 29,
      price_type: "fixed",
      price_value: 29,
      price_amount: 29,
      currency: "USD",
      price_label: "USD 29.00",
      rating: Number((4.5 + (index % 4) * 0.1).toFixed(1)),
      review_count: 36 + index * 29,
      badge: index === 0 ? "Best Seller" : index === 1 ? "New" : index === 2 ? "Fast Ship" : "Featured",
      deal_label: index === 0 ? "Best Seller" : "",
      shipping_label: index % 2 === 0 ? "Fast ship" : "Ready to ship",
      button_label: addLabel,
      inventory_quantity: 18 + index * 7,
      track_inventory: true,
      imageSearchQuery: name,
      image_url: unsplashSeedUrl(name),
      is_active: true,
      is_featured: index < 4,
      sort_order: index,
    };
  });
}

function localizedSeedValue(value, language = builderState.selectedLanguage) {
  if (!value || typeof value !== "object") return String(value || "");
  return value[language] || value.es || value.en || Object.values(value).find(Boolean) || "";
}

function unsplashSeedUrl(keyword = "") {
  const clean = String(keyword || "premium-product")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "premium-product";
  return stableCatalogImageUrl(clean);
}

function mergeSemanticSeedCatalog(existingItems = [], seedItems = [], language = builderState.selectedLanguage, contextText = "", options = {}) {
  const existing = arrayValue(existingItems);
  const preserveAiGeneratedIdentity = options.catalogSource === "ai_generated";
  const genericCount = existing.filter((item) => isGenericSeedProduct(item, contextText)).length;
  const needsReplacement = !preserveAiGeneratedIdentity && (existing.length < 4 || genericCount >= Math.max(1, Math.ceil(existing.length / 2)));
  const base = preserveAiGeneratedIdentity ? existing : needsReplacement ? seedItems : existing;
  const merged = base.slice(0, 6).map((item, index) => {
    const seed = seedItems[index % seedItems.length];
    const source = typeof item === "string" ? { name: item } : { ...item };
    const sourceIsGeneric = isGenericSeedProduct(source, contextText);
    const useSeedIdentity = !preserveAiGeneratedIdentity && (needsReplacement || sourceIsGeneric);
    const price = Number(source.price_amount ?? source.price_value ?? source.price ?? seed.price);
    return {
      ...source,
      id: source.id || seed.id || `prod_${String(index + 1).padStart(3, "0")}`,
      sku: source.sku || seed.sku || `SKU-${String(index + 1).padStart(3, "0")}`,
      name: useSeedIdentity ? seed.name : cleanShortText(source.name || source.title || (preserveAiGeneratedIdentity ? "" : seed.name), 90),
      description: useSeedIdentity || (!preserveAiGeneratedIdentity && isWeakSeedCopy(source.description, {})) ? seed.description : source.description,
      category: useSeedIdentity || (!preserveAiGeneratedIdentity && (!source.category || isGenericText(source.category))) ? seed.category : source.category,
      price: Number.isFinite(price) && price > 0 ? price : seed.price,
      price_type: source.price_type && source.price_type !== "quote_only" ? source.price_type : "fixed",
      price_value: Number.isFinite(price) && price > 0 ? price : seed.price,
      price_amount: Number.isFinite(price) && price > 0 ? price : seed.price,
      currency: source.currency || "USD",
      price_label: source.price_label && !/price editable|precio editable|price to be set|consultar/i.test(source.price_label)
        ? source.price_label
        : `USD ${(Number.isFinite(price) && price > 0 ? price : seed.price).toFixed(2)}`,
      rating: Number(source.rating || seed.rating || 4.7),
      review_count: source.review_count || seed.review_count,
      badge: source.badge || seed.badge,
      deal_label: source.deal_label || seed.deal_label || "",
      shipping_label: source.shipping_label || seed.shipping_label,
      button_label: source.button_label || seed.button_label,
      inventory_quantity: source.inventory_quantity ?? seed.inventory_quantity,
      track_inventory: source.track_inventory ?? seed.track_inventory,
      imageSearchQuery: source.imageSearchQuery || source.image_search_query || seed.imageSearchQuery,
      image_url: preserveAiGeneratedIdentity
        ? source.image_url || source.imageUrl || seed.image_url
        : (useSeedIdentity || shouldReplaceCatalogSeedImage(source, seed, contextText))
          ? seed.image_url
          : source.image_url || source.imageUrl || seed.image_url,
      is_active: source.is_active !== false,
      is_featured: source.is_featured ?? index < 4,
      sort_order: Number(source.sort_order ?? index),
    };
  });
  while (!preserveAiGeneratedIdentity && merged.length < 4 && seedItems[merged.length]) {
    merged.push({ ...seedItems[merged.length], sort_order: merged.length });
  }
  return merged.slice(0, 6);
}

function shouldReplaceCatalogSeedImage(source = {}, seed = {}, contextText = "") {
  const raw = String(source.image_url || source.imageUrl || "").trim();
  if (!raw) return true;
  if (/featured\/600x600|\/source\/|photo-1523275335684-37898b6baf30/i.test(raw)) return true;
  if (isGenericSeedProduct(source, contextText)) return true;
  const query = normalizeTemplateIntentText(source.imageSearchQuery || source.image_search_query || source.category || source.name || "");
  return !query && Boolean(seed.image_url);
}

function isGenericSeedProduct(item = {}, contextText = "") {
  const source = typeof item === "string" ? { name: item } : item || {};
  const name = normalizeTemplateIntentText(source.name || source.title || source);
  const description = normalizeTemplateIntentText(source.description || source.text || "");
  const price = source.price_amount ?? source.price_value ?? source.price;
  const image = source.image_url || source.imageUrl || "";
  const nameIsRawContext = name && contextText && contextText.includes(name) && name.split(/\s+/).length > 7;
  return !name
    || /^(item|product|producto|service|servicio|featured item|new arrival|limited find|customer favorite|signature item|featured offer|popular choice|main offer)(\s+\d+)?$/.test(name)
    || /^(signature starter pack|pack inicial signature|customer favorite bundle|bundle favorito del cliente|premium upgrade|upgrade premium|limited edition drop|drop de edicion limitada|everyday essential|esencial de uso diario|gift ready selection|seleccion lista para regalo)$/.test(name)
    || /price to be set|precio editable|editable product|lorem|placeholder/.test(description)
    || nameIsRawContext
    || !description
    || price === "" || price === null || price === undefined;
}

function isWeakSeedCopy(value, payload = {}) {
  const text = String(value || "").trim();
  if (!text) return true;
  const normalized = normalizeTemplateIntentText(text);
  const raw = normalizeTemplateIntentText([
    payload.business_description,
    arrayValue(payload.services_products).join(" "),
    payload.target_audience,
  ].join(" "));
  return isGenericText(text)
    || /lorem|placeholder|your business|your site|producto 1|product 1|price to be set|editable product/i.test(text)
    || text.length > 260
    || (raw && normalized.length > 60 && raw.includes(normalized.slice(0, 60)));
}

function semanticSeedCopyKit(profileKey = "default", businessName = "Kreaton Store", language = builderState.selectedLanguage, templateText = "") {
  const name = cleanShortText(businessName, 48);
  const ecommerce = /marketplace|retail|store|shop|catalog|product|fashion|luxury/i.test(templateText);
  const kits = {
    es: {
      jewelry: { industry: "Bisuteria y accesorios", headline: `${name}: piezas hechas para destacar`, subtitle: "Accesorios curados con brillo, detalle y una ruta simple para comprar o pedir una pieza especial.", productTitle: "Piezas listas para vender", productText: "Un catalogo inicial con nombres, precios, fotos y descripciones persuasivas para editar.", primary: "Ver coleccion", secondary: "Pedir asesoria" },
      fashion: { industry: "Moda y accesorios", headline: `${name}: una tienda visual para comprar con confianza`, subtitle: "Colecciones claras, piezas destacadas y una experiencia lista para convertir visitas en compras.", productTitle: "Drop destacado", productText: "Productos iniciales creados para verse reales desde el primer preview.", primary: "Comprar ahora", secondary: "Ver categorias" },
      coffee: { industry: "Cafe y bebidas", headline: `${name}: cafe con identidad propia`, subtitle: "Productos de cafe con narrativa clara, combos vendibles y una experiencia pensada para recompra.", productTitle: "Favoritos de la casa", productText: "Cafe, kits y bundles listos para editar y publicar.", primary: "Comprar cafe", secondary: "Ver combos" },
      auto: { industry: "Repuestos y accesorios automotrices", headline: `${name}: equipamiento listo para rutas exigentes`, subtitle: "Catalogo de accesorios, proteccion y piezas utiles con precios claros, filtros y camino rapido al carrito.", productTitle: "Piezas destacadas", productText: "Productos semilla con categoria, precio, imagen y copy comercial.", primary: "Ver catalogo", secondary: "Consultar compatibilidad" },
      tech: { industry: "Tecnologia y gadgets", headline: `${name}: hallazgos tech que se compran rapido`, subtitle: "Gadgets, accesorios y productos curiosos organizados para descubrir, comparar y agregar al carrito.", productTitle: "Deals destacados", productText: "Productos iniciales listos para un marketplace visual y editable.", primary: "Explorar deals", secondary: "Ver categorias" },
      beauty: { industry: "Belleza y cuidado personal", headline: `${name}: belleza clara, deseable y facil de comprar`, subtitle: "Rutinas, kits y productos destacados con copy orientado a beneficios y recompra.", productTitle: "Rutina destacada", productText: "Catalogo semilla con productos reales, precios e imagenes.", primary: "Comprar rutina", secondary: "Ver productos" },
      home: { industry: "Hogar y decoracion", headline: `${name}: piezas para elevar cada espacio`, subtitle: "Decoracion, organizacion y accesorios de hogar presentados con claridad comercial y visuales limpios.", productTitle: "Seleccion para el hogar", productText: "Productos iniciales listos para editar y convertir en tienda.", primary: "Ver seleccion", secondary: "Explorar ambientes" },
      marketplace: { industry: "Tienda multi-categoria", headline: `${name}: hallazgos raros, utiles y listos para descubrir`, subtitle: "Una experiencia tipo gran tienda con categorias variadas, ofertas visibles y productos listos para agregar al carrito.", productTitle: "Deals y hallazgos destacados", productText: "Un catalogo mixto con productos reales para mostrar variedad desde el primer preview.", primary: "Explorar deals", secondary: "Ver categorias" },
      restaurant: { industry: "Restaurante y menu", headline: `${name}: menu listo para pedir`, subtitle: "Platos destacados, combos y bebidas con precios claros y una experiencia simple para ordenar.", productTitle: "Especiales de la casa", productText: "Items de menu creados para publicar, ajustar y vender.", primary: "Ver menu", secondary: "Ordenar ahora" },
      default: { industry: ecommerce ? "Comercio online" : "Negocio profesional", headline: `${name}: una experiencia lista para vender`, subtitle: "Catalogo inicial con productos especificos, precios realistas y mensajes pulidos para editar antes de publicar.", productTitle: "Productos destacados", productText: "Seleccion semilla creada por Lyra segun el nicho detectado.", primary: "Ver catalogo", secondary: "Contactar" },
    },
    en: {
      jewelry: { industry: "Jewelry and accessories", headline: `${name}: pieces made to stand out`, subtitle: "Curated accessories with polish, detail, and a simple path to shop or request a special piece.", productTitle: "Ready-to-sell pieces", productText: "An initial catalog with names, prices, images, and persuasive editable descriptions.", primary: "View collection", secondary: "Ask for guidance" },
      fashion: { industry: "Fashion and accessories", headline: `${name}: a visual store built for confident shopping`, subtitle: "Clear collections, highlighted pieces, and a buying path designed to turn visits into orders.", productTitle: "Featured drop", productText: "Seed products created to feel real from the first preview.", primary: "Shop now", secondary: "View categories" },
      coffee: { industry: "Coffee and drinks", headline: `${name}: coffee with a clear identity`, subtitle: "Coffee products with strong storytelling, sellable bundles, and a repeat-purchase experience.", productTitle: "House favorites", productText: "Coffee, kits, and bundles ready to edit and publish.", primary: "Shop coffee", secondary: "View bundles" },
      auto: { industry: "Automotive parts and accessories", headline: `${name}: equipment for serious routes`, subtitle: "Accessories, protection, and useful parts with clear prices, filters, and a fast path to cart.", productTitle: "Featured parts", productText: "Seed products with category, price, image, and commercial copy.", primary: "View catalog", secondary: "Check fitment" },
      tech: { industry: "Technology and gadgets", headline: `${name}: tech finds made for fast discovery`, subtitle: "Gadgets, accessories, and curious products organized to discover, compare, and add to cart.", productTitle: "Featured deals", productText: "Initial products ready for a visual editable marketplace.", primary: "Explore deals", secondary: "View categories" },
      beauty: { industry: "Beauty and personal care", headline: `${name}: beauty that is clear and easy to shop`, subtitle: "Routines, kits, and hero products with benefit-driven copy and repeat purchase potential.", productTitle: "Featured routine", productText: "Seed catalog with real products, prices, and images.", primary: "Shop routine", secondary: "View products" },
      home: { industry: "Home and decor", headline: `${name}: pieces that elevate every space`, subtitle: "Decor, organization, and home accessories presented with clear commerce and clean visuals.", productTitle: "Home selection", productText: "Initial products ready to edit into a working store.", primary: "View selection", secondary: "Explore rooms" },
      marketplace: { industry: "Multi-category retail", headline: `${name}: uncommon finds ready to discover`, subtitle: "A big-store experience with varied categories, visible deals, and products ready to add to cart.", productTitle: "Deals and featured finds", productText: "A mixed seed catalog with real products to show variety from the first preview.", primary: "Explore deals", secondary: "View categories" },
      restaurant: { industry: "Restaurant and menu", headline: `${name}: a menu ready to order`, subtitle: "Signature dishes, combos, and drinks with clear prices and a simple ordering experience.", productTitle: "House specials", productText: "Menu items created to publish, adjust, and sell.", primary: "View menu", secondary: "Order now" },
      default: { industry: ecommerce ? "Online commerce" : "Professional business", headline: `${name}: an experience ready to sell`, subtitle: "An initial catalog with specific products, realistic prices, and polished messages ready to edit before publishing.", productTitle: "Featured products", productText: "Seed selection created by Lyra from the detected niche.", primary: "View catalog", secondary: "Contact" },
    },
  };
  const set = kits[language] || kits.en;
  return set[profileKey] || set.default;
}

function fillSemanticSeedPageCopy(pages = [], copyKit = {}, payload = {}) {
  return arrayValue(pages).map((page) => ({
    ...page,
    sections: arrayValue(page.sections).map((section) => {
      const editable = { ...(section.editable || {}) };
      if (/Hero|MarketplaceHero|PremiumHero|FashionHero|RestaurantHero/i.test(section.type || "")) {
        if (isWeakSeedCopy(editable.headline, payload)) editable.headline = copyKit.headline;
        if (isWeakSeedCopy(editable.subtitle || editable.text, payload)) editable.subtitle = copyKit.subtitle;
        if (!editable.primary_button || isWeakCta(editable.primary_button)) editable.primary_button = copyKit.primary;
        if (!editable.secondary_button || isWeakCta(editable.secondary_button)) editable.secondary_button = copyKit.secondary;
      }
      if (/ProductGrid|ServiceList|DealRow|CategoryRail/i.test(section.type || "")) {
        if (isWeakSeedCopy(editable.title || editable.headline, payload)) editable.title = copyKit.productTitle;
        if (isWeakSeedCopy(editable.text || editable.subtitle, payload)) editable.text = copyKit.productText;
      }
      return { ...section, editable };
    }),
  }));
}

function updatePrimaryHeroCopy(schema, message, payload = {}, templateSelection = null) {
  const copy = instantLocaleCopy(payload.selectedLanguage || builderState.selectedLanguage || "en");
  const description = professionalPublicDescription({
    payload,
    template: templateSelection?.template || schema.selected_template || {},
    catalogType: templateSelection?.catalogType || schema.catalog_model?.catalogType || "",
    copy,
    name: payload.business_name || schema.business?.name || copy.newStore,
    products: payload.services_products,
    language: payload.selectedLanguage || builderState.selectedLanguage || "en",
  });
  const page = arrayValue(schema.pages).find((item) => item.page_key === "home") || schema.pages?.[0];
  const hero = page?.sections?.find((section) => /Hero/i.test(section.type));
  if (hero) {
    hero.editable = {
      ...(hero.editable || {}),
      headline: hero.editable?.headline || copy.marketplaceHeadline?.(payload.business_name || schema.business?.name || copy.newStore) || schema.business?.name,
      subtitle: description,
    };
  }
  return schema;
}

function updatePrimaryCtaCopy(schema, message) {
  const match = String(message || "").match(/(?:bot[oó]n|button|cta|dice|decir|texto)\s*(?:principal)?\s*(?:a|por|:)?\s*["“]?([^"”]{3,40})["”]?/i);
  const label = cleanExtractedPhrase(match?.[1] || "", 40);
  if (!label) return schema;
  arrayValue(schema.pages).forEach((page) => {
    arrayValue(page.sections).forEach((section) => {
      if (/Hero|ProductGrid|MarketplaceHero/i.test(section.type)) {
        section.editable = { ...(section.editable || {}), primary_button: label };
      }
    });
  });
  return schema;
}

function draftAdjustmentReply(rebuiltFromTemplate, templateSelection = null) {
  const templateName = templateSelection?.template?.name || localizedTemplateName(templatePreviewMeta(templateSelection?.templateId || "")) || "";
  if (rebuiltFromTemplate) {
    return langText({
      en: `Done. I rebuilt the draft using the best matching structure${templateName ? `: ${templateName}` : ""}, then kept it editable.`,
      es: `Listo. Reorganicé el borrador usando la estructura que mejor encaja${templateName ? `: ${templateName}` : ""}, y sigue editable.`,
      fr: `C'est fait. J'ai reconstruit le brouillon avec la structure la plus adaptée${templateName ? `: ${templateName}` : ""}, en gardant tout modifiable.`,
      pt: `Pronto. Reorganizei o rascunho usando a estrutura que melhor encaixa${templateName ? `: ${templateName}` : ""}, mantendo tudo editável.`,
    });
  }
  return langText({
    en: "Done. I applied that change to the draft on the left. Tell me the next specific adjustment.",
    es: "Listo. Apliqué ese cambio al borrador de la izquierda. Dime el siguiente ajuste específico.",
    fr: "C'est fait. J'ai appliqué ce changement au brouillon à gauche. Dites-moi le prochain ajustement précis.",
    pt: "Pronto. Apliquei essa mudança ao rascunho à esquerda. Diga o próximo ajuste específico.",
  });
}

function mergeTemplateSelectionIntoSchema(schema, selection) {
  if (!schema || !selection) return schema;
  const backendTemplateId = schemaTemplateId(schema);
  const selectedTemplateId = normalizeTemplateId(selection.templateId);
  const isExplicitClientChoice = selection.intent === "client_visual_template_choice";
  if (backendTemplateId && backendTemplateId !== selectedTemplateId && !isExplicitClientChoice) {
    return schema;
  }
  const templateInstructions = buildTemplateInstructions(selection);
  const executionStatus = templateExecutionStatus(selection.templateId);
  schema.selected_template = {
    id: selection.templateId,
    name: selection.template?.name || selection.templateId,
    category: selection.template?.category || "",
    intent: selection.intent,
    reason: selection.reason,
    executionStatus,
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
    execution_status: executionStatus.status,
    runtime_enabled: executionStatus.runtimeEnabled,
  };
  return schema;
}

function schemaTemplateId(schema = {}) {
  return normalizeTemplateId(
    schema.selected_template?.id
    || schema.active_template?.id
    || schema.layout_mode?.template_id
    || "",
  );
}

async function resolveGeneratedTemplateSelection(schema = {}, clientSelection = null) {
  if (clientSelection?.intent === "client_visual_template_choice") return clientSelection;

  const backendTemplateId = schemaTemplateId(schema);
  if (!isConcreteTemplateId(backendTemplateId)) return clientSelection;

  let template = null;
  if (window.TemplateRouter?.getTemplateById) {
    try {
      template = await window.TemplateRouter.getTemplateById(backendTemplateId);
    } catch (error) {
      console.warn("Could not load the backend-selected template", error);
    }
  }

  const catalogType = schema.catalog_model?.catalogType
    || schema.layout_mode?.catalog_type
    || template?.catalogModel?.catalogType
    || clientSelection?.catalogType
    || "";
  return {
    ...(clientSelection || {}),
    templateId: backendTemplateId,
    template: template || {
      id: backendTemplateId,
      name: schema.selected_template?.name || schema.active_template?.name || backendTemplateId,
      category: schema.selected_template?.category || "",
      catalogModel: { catalogType },
    },
    catalogType,
    intent: "backend_schema_template",
    reason: schema.selected_template?.reason || "Selected by LYRA's backend plan",
  };
}

function applyGenerationResult(result, payload = {}, templateSelection = null) {
  syncCatalogSourceMetadata(result);
  try {
    result.schema = prepareWebsiteConfig(result.schema, payload, templateSelection);
  } catch (renderError) {
    // A template-specific presentation failure must not strand the client in a
    // loading state after the backend has already produced a valid response.
    console.error("Could not prepare the generated template; showing the emergency editable draft.", renderError);
    result.schema = buildEmergencyEditableSchema(payload, renderError);
    result.storage_status = "instant_template_fallback";
    result.error = String(renderError?.message || renderError || "");
  }
  builderState.currentSchema = result.schema;
  builderState.currentSiteId = result.generatedSiteId || result.projectId || result.site_id || null;
  builderState.currentBusinessId = result.business_id || null;
  builderState.currentGenerationId = result.generation_id || null;
  builderState.currentCatalogItems = catalogItemsFromSchema(builderState.currentSchema);
  builderState.selectedPageKey = builderState.currentSchema.pages[0]?.page_key || "home";
  builderState.selectedVariantId = builderState.currentSchema.design_variants?.[0]?.id || "";
  saveGeneratedSite(result);
  if (builderState.currentSiteId) {
    builderState.guidedState.generatedSiteId = builderState.currentSiteId;
    builderState.guidedState.projectId = builderState.currentSiteId;
    builderState.clientIntakeSession = {
      ...(builderState.clientIntakeSession || {}),
      generatedSiteId: builderState.currentSiteId,
      projectId: builderState.currentSiteId,
      clientEmail: builderState.clientIntakeSession?.clientEmail || builderState.guidedState.contactInfo?.email || localStorage.getItem("lumaPendingClientEmail") || "",
      draft: guidedSessionDraftForApi(),
    };
    writeClientIntakeSession(builderState.clientIntakeSession);
  }
  siteTitle.textContent = builderState.currentSchema.business?.name || "Generated site";
  storageStatus.textContent = storageLabel(result.storage_status, result.used_dev_mock);
  renderEditor();
  renderPreview();
  if (!isPublicClientSetup) {
    // The admin builder keeps the guided intake as a full-screen overlay.
    // Once a schema exists, release the editor toolbar before rendering it.
    document.body.classList.remove("guided-modal-open");
    guidedPanel.classList.remove("active");
  }
  showGeneratedClientPreview();
  syncLyraExperienceMode();
  builderState.guidedState.revisionMode = "";
  builderState.guidedState.requestedAdjustments = [];
  builderAvatarManager?.setState("success", { source: "preview-generated" });
}

function syncCatalogSourceMetadata(result = {}) {
  if (!result?.schema || !result.catalog_source) return result;
  result.schema.generation_metadata = {
    ...(result.schema.generation_metadata || {}),
    catalog_source: result.catalog_source,
  };
  return result;
}

function catalogSourceFromSchema(schema = {}) {
  return String(
    schema?.generation_metadata?.catalog_source
    || schema?.generation_metadata?.catalogSource
    || schema?.catalog_source
    || schema?.catalogSource
    || ""
  );
}

export function prepareWebsiteConfig(schema, payload = {}, templateSelection = null) {
  if (!schema) return schema;
  const brand = normalizeBrand(payload.brand || builderState.guidedState.brand || schema.brand || {
    logoUrl: payload.assets?.find((asset) => asset.asset_type === "logo")?.url || schema.global_components?.logo_url || "",
    preferredColors: payload.preferred_colors,
  });
  let nextSchema = applyBrandSystemToSchema(structuredClone(schema), brand);
  nextSchema = applyDesignIntelligence(nextSchema, payload, templateSelection);
  nextSchema = ensureSemanticSeedContent(nextSchema, payload, templateSelection);
  nextSchema.quality_rules = DESIGN_QUALITY_RULES;
  nextSchema.design_score = scoreWebsiteConfig(nextSchema);
  nextSchema.designScore = nextSchema.design_score.total;
  for (let attempt = 0; attempt < 3 && nextSchema.design_score.total < 85; attempt += 1) {
    nextSchema = improveWebsiteConfig(nextSchema);
    nextSchema = applyDesignIntelligence(nextSchema, payload, templateSelection, { reviewOnly: true });
    nextSchema = ensureSemanticSeedContent(nextSchema, payload, templateSelection);
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
  const input = brandInput || {};
  const brand = { ...DEFAULT_BRAND, ...input };
  const colors = input.colors || {};
  brand.logoUrl = brand.logoUrl || input.logo_url || input.logo || "";
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
  nextSchema = enforceSelectedTemplateArchitecture(nextSchema, payload, templateSelection);
  nextSchema = orderSectionsByStrategy(nextSchema, layoutStrategy);
  nextSchema = applyProfessionalLayoutSettings(nextSchema, strategy);
  nextSchema = reviewWebsiteConfigBeforeRender(nextSchema, strategy);
  return nextSchema;
}

function enforceSelectedTemplateArchitecture(schema, payload = {}, templateSelection = null) {
  const templateId = `${templateSelection?.templateId || payload.templateId || schema.selected_template?.id || schema.layout_mode?.template_id || ""}`;
  const catalogType = `${templateSelection?.catalogType || payload.catalogType || schema.catalog_model?.catalogType || schema.layout_mode?.catalog_type || ""}`;
  const brief = [
    payload.business_name,
    payload.business_description,
    payload.industry,
    arrayValue(payload.services_products).join(" "),
    payload.target_audience,
    payload.preferred_tone,
    arrayValue(payload.preferred_colors).join(" "),
  ].join(" ");
  let nextSchema = lockSchemaToExecutableTemplate(schema, payload, templateSelection, { templateId, catalogType, brief });
  if (/mega-retail-store/i.test(templateId) || /single_vendor_dense_catalog|dense_retail_catalog/i.test(catalogType) || textSuggestsMegaRetailStore(brief)) {
    const copy = instantLocaleCopy(payload.selectedLanguage || builderState.selectedLanguage || "en");
    const name = payload.business_name || schema.business?.name || copy.newStore;
    const description = professionalPublicDescription({
      payload,
      template: templateSelection?.template || schema.selected_template || { id: "mega-retail-store", category: "ecommerce" },
      catalogType: "single_vendor_dense_catalog",
      copy,
      name,
      products: arrayValue(payload.services_products).length ? arrayValue(payload.services_products) : arrayValue(schema.products_services).map((item) => item.name),
      language: payload.selectedLanguage || builderState.selectedLanguage || "en",
    });
    const retailPages = buildRetailInstantPages(copy, name, description, payload);
    const retailPageKeys = new Set(retailPages.map((page) => page.page_key));
    const existingPages = arrayValue(schema.pages).filter((page) => page.page_key && !retailPageKeys.has(page.page_key));
    nextSchema = {
      ...nextSchema,
      site_type: "online_store",
      selected_template: {
        ...(nextSchema.selected_template || {}),
        id: "mega-retail-store",
        name: nextSchema.selected_template?.name || "Mega Retail Store",
        intent: "mega_retail_store",
      },
      catalog_model: {
        ...(nextSchema.catalog_model || {}),
        catalogType: "single_vendor_dense_catalog",
      },
      layout_mode: {
        ...(nextSchema.layout_mode || {}),
        template_id: "mega-retail-store",
        catalog_type: "single_vendor_dense_catalog",
        intent: "mega_retail_store",
        navigation: { ...(nextSchema.layout_mode?.navigation || {}), show_cart: true, show_header: true, sticky_header: true },
        checkout: { ...(nextSchema.layout_mode?.checkout || {}), mode: "single_store_checkout", primary_action: copy.shopNow },
      },
      navigation: [
        { label: copy.home, page_key: "home" },
        { label: copy.deals, page_key: "deals" },
        { label: copy.categories, page_key: "categories" },
        { label: copy.catalog, page_key: "catalog" },
        { label: copy.support, page_key: "support" },
      ],
      pages: [...retailPages, ...existingPages],
    };
  } else if (/mega-marketplace/i.test(templateId) || /dense_marketplace_catalog/i.test(catalogType) || textSuggestsMultiVendorMarketplace(brief)) {
    const copy = instantLocaleCopy(payload.selectedLanguage || builderState.selectedLanguage || "en");
    const name = payload.business_name || schema.business?.name || copy.newStore;
    const description = professionalPublicDescription({
      payload,
      template: templateSelection?.template || schema.selected_template || { id: "mega-marketplace", category: "marketplace" },
      catalogType: "dense_marketplace_catalog",
      copy,
      name,
      products: arrayValue(payload.services_products).length ? arrayValue(payload.services_products) : arrayValue(schema.products_services).map((item) => item.name),
      language: payload.selectedLanguage || builderState.selectedLanguage || "en",
    });
    const marketplacePages = buildMarketplaceInstantPages(copy, name, description, payload);
    const marketplacePageKeys = new Set(marketplacePages.map((page) => page.page_key));
    const existingPages = arrayValue(schema.pages).filter((page) => page.page_key && !marketplacePageKeys.has(page.page_key));
    nextSchema = {
      ...nextSchema,
      site_type: "online_store",
      selected_template: {
        ...(nextSchema.selected_template || {}),
        id: "mega-marketplace",
        name: nextSchema.selected_template?.name || "Mega Marketplace",
        intent: "amazon_marketplace",
      },
      catalog_model: {
        ...(nextSchema.catalog_model || {}),
        catalogType: "dense_marketplace_catalog",
      },
      layout_mode: {
        ...(nextSchema.layout_mode || {}),
        template_id: "mega-marketplace",
        catalog_type: "dense_marketplace_catalog",
        intent: "amazon_marketplace",
        navigation: { ...(nextSchema.layout_mode?.navigation || {}), show_cart: true, show_header: true, sticky_header: true },
        checkout: { ...(nextSchema.layout_mode?.checkout || {}), mode: "cart_setup_required", primary_action: copy.shopNow },
      },
      navigation: [
        { label: copy.home, page_key: "home" },
        { label: copy.deals, page_key: "deals" },
        { label: copy.categories, page_key: "categories" },
        { label: copy.catalog, page_key: "catalog" },
        { label: copy.support, page_key: "support" },
      ],
      pages: [...marketplacePages, ...existingPages],
    };
  }
  if (briefRequestsCyberpunk(brief)) {
    nextSchema = applyCyberpunkVisualDirection(nextSchema);
  }
  return nextSchema;
}

function lockSchemaToExecutableTemplate(schema, payload = {}, templateSelection = null, context = {}) {
  const template = templateSelection?.template || payload.selectedTemplate || schema.selected_template || {};
  const templateId = context.templateId || templateSelection?.templateId || payload.templateId || schema.selected_template?.id || schema.layout_mode?.template_id || template.id || "";
  const catalogType = context.catalogType || templateSelection?.catalogType || payload.catalogType || schema.catalog_model?.catalogType || schema.layout_mode?.catalog_type || template.catalogModel?.catalogType || "";
  if (!templateId && !catalogType) return schema;

  const copy = instantLocaleCopy(payload.selectedLanguage || schema.business?.selectedLanguage || builderState.selectedLanguage || "en");
  const name = payload.business_name || schema.business?.name || copy.newStore;
  const products = arrayValue(payload.services_products).length
    ? arrayValue(payload.services_products)
    : arrayValue(schema.catalog_items || schema.products_services).map((item) => item.name || item.title || item).filter(Boolean);
  const description = professionalPublicDescription({
    payload: {
      ...payload,
      business_name: name,
      services_products: products,
      business_description: payload.business_description || schema.business?.description || "",
      preferred_tone: payload.preferred_tone || schema.business?.tone || "",
    },
    template,
    catalogType,
    copy,
    name,
    products,
    language: payload.selectedLanguage || schema.business?.selectedLanguage || builderState.selectedLanguage || "en",
  });
  const lockedPages = executablePagesForTemplate(templateId, catalogType, copy, name, description, payload);
  if (!lockedPages.length) return schema;

  const existingByKey = new Map(arrayValue(schema.pages).map((page) => [page.page_key, page]));
  const mergedPages = lockedPages.map((page) => mergeLockedTemplatePage(page, existingByKey.get(page.page_key)));
  const customPages = arrayValue(schema.pages).filter((page) => page.page_key && !mergedPages.some((locked) => locked.page_key === page.page_key));
  return {
    ...schema,
    pages: [...mergedPages, ...customPages.map((page, index) => ({ ...page, order: mergedPages.length + index + 1 }))],
    selected_template: {
      ...(schema.selected_template || {}),
      ...(template || {}),
      id: normalizeTemplatePresetId(templateId, catalogType),
      name: template.name || schema.selected_template?.name || localizedTemplateName(templatePreviewMeta(templateId)) || templateId,
      architecture_locked: true,
      editable_content_only: true,
    },
    active_template: {
      ...(schema.active_template || {}),
      id: normalizeTemplatePresetId(templateId, catalogType),
      architecture_locked: true,
    },
    layout_mode: {
      ...(schema.layout_mode || {}),
      template_id: normalizeTemplatePresetId(templateId, catalogType),
      catalog_type: catalogType || schema.layout_mode?.catalog_type || schema.catalog_model?.catalogType || "",
      architecture_locked: true,
      navigation: {
        ...(schema.layout_mode?.navigation || {}),
        show_header: true,
        sticky_header: true,
        show_cart: /marketplace|store|shop|ecommerce|catalog|retail|product/i.test(`${templateId} ${catalogType}`),
      },
    },
    catalog_model: {
      ...(schema.catalog_model || {}),
      ...(template.catalogModel || {}),
      catalogType: catalogType || template.catalogModel?.catalogType || schema.catalog_model?.catalogType || "",
    },
    template_lock: {
      enabled: true,
      template_id: normalizeTemplatePresetId(templateId, catalogType),
      rule: "AI may edit copy, products, media, colors, CTAs, and ordering only inside the selected executable template. It must not invent a new layout.",
    },
  };
}

function normalizeTemplatePresetId(templateId = "", catalogType = "") {
  templateId = normalizeTemplateId(templateId);
  if (/mega-retail-store/i.test(templateId) || /single_vendor_dense_catalog|dense_retail_catalog/i.test(catalogType)) return "mega-retail-store";
  if (/mega-marketplace|marketplace-style/i.test(templateId) || /dense_marketplace_catalog/i.test(catalogType)) return "mega-marketplace";
  if (/premium-product-store/i.test(templateId) || /premium_editorial_catalog/i.test(catalogType)) return "premium-product-store";
  return templateId || "";
}

function mergeLockedTemplatePage(lockedPage, existingPage = null) {
  if (!existingPage) return lockedPage;
  const existingSections = new Map(arrayValue(existingPage.sections).map((section) => [section.id || section.type, section]));
  return {
    ...lockedPage,
    title: existingPage.title || lockedPage.title,
    slug: existingPage.slug || lockedPage.slug,
    sections: arrayValue(lockedPage.sections).map((lockedSection) => {
      const existing = existingSections.get(lockedSection.id) || existingSections.get(lockedSection.type);
      if (!existing) return lockedSection;
      return {
        ...lockedSection,
        editable: {
          ...(lockedSection.editable || {}),
          ...(existing.editable || {}),
        },
        settings: {
          ...(lockedSection.settings || {}),
          ...(existing.settings || {}),
          layout: lockedSection.settings?.layout || existing.settings?.layout,
        },
      };
    }),
  };
}

function executablePagesForTemplate(templateId = "", catalogType = "", copy, name, description, payload = {}) {
  const key = `${templateId} ${catalogType}`.toLowerCase();
  if (/mega-retail-store|single_vendor_dense_catalog|dense_retail_catalog/.test(key)) return buildRetailInstantPages(copy, name, description, payload);
  if (/mega-marketplace|marketplace-style|dense_marketplace_catalog/.test(key)) return buildMarketplaceInstantPages(copy, name, description, payload);
  if (/premium-product-store|apple-premium-product|premium_editorial_catalog/.test(key)) return buildPremiumProductInstantPages(copy, name, description, payload);
  if (/luxury-high-ticket-pro|luxury_high_ticket_catalog/.test(key)) return buildLuxuryHighTicketInstantPages(copy, name, description, payload);
  if (/education-course-academy-pro|education_course_catalog/.test(key)) return buildEducationAcademyInstantPages(copy, name, description, payload);
  if (/medical-wellness-clinic-pro|medical_wellness_service_catalog/.test(key)) return buildMedicalWellnessInstantPages(copy, name, description, payload);
  if (/legal-professional-services-pro|legal_professional_services_catalog/.test(key)) return buildLegalProfessionalInstantPages(copy, name, description, payload);
  if (/b2b-saas-enterprise-pro|b2b_solution_catalog/.test(key)) return buildB2BEnterpriseInstantPages(copy, name, description, payload);
  if (/manufacturing-industrial-supplier-pro|industrial_supplier_catalog/.test(key)) return buildManufacturingIndustrialInstantPages(copy, name, description, payload);
  if (/fashion-drop-pro|bold-fashion-store|lookbook_collection_catalog/.test(key)) return buildFashionDropInstantPages(copy, name, description, payload);
  if (/corporate-company-pro|company_services_catalog/.test(key)) return buildCorporateCompanyInstantPages(copy, name, description, payload);
  if (/home-services-premium|local-services-pro-plus|home_services_quote_catalog|service_area_catalog/.test(key)) return buildHomeServicesPremiumInstantPages(copy, name, description, payload);
  if (/booking-appointment-pro|booking_menu_catalog/.test(key)) return buildBookingAppointmentInstantPages(copy, name, description, payload);
  if (/restaurant-food-business|restaurant_menu_catalog|menu_catalog/.test(key)) return buildRestaurantMenuInstantPages(copy, name, description, payload);
  if (/digital-products-store|digital_offer_catalog/.test(key)) return buildDigitalProductsInstantPages(copy, name, description, payload);
  if (/real-estate-listings-pro|real_estate_listing_catalog/.test(key)) return buildRealEstateListingsInstantPages(copy, name, description, payload);
  if (/lead-funnel-pro|lead_funnel_offer_catalog/.test(key)) return buildLeadFunnelInstantPages(copy, name, description, payload);
  return [];
}

function runtimeCompositionIndex(name, payload = {}, recipeCount = 3) {
  return pickVariantSeed(
    name || payload.business_name || payload.businessName || "",
    payload.industry || payload.niche || payload.business?.industry || "",
    payload.designVariantOffset ?? builderState.guidedState.designVariantOffset ?? 0,
    recipeCount,
  );
}

function resequenceSections(sections = []) {
  return sections.map((section, index) => ({ ...section, order: index + 1 }));
}

function briefRequestsCyberpunk(value = "") {
  return /cyberpunk|neon|neón|futurista|future|gaming|gamer|super cool|sci.?fi|techno/i.test(String(value || ""));
}

function applyCyberpunkVisualDirection(schema) {
  const colors = {
    background: "#070714",
    surface: "#111126",
    primary: "#00f5ff",
    secondary: "#ff2bd6",
    text: "#f8fbff",
    muted: "#a7b0ff",
  };
  const brand = normalizeBrand({
    ...(schema.brand || {}),
    colors,
    primaryColor: colors.primary,
    secondaryColor: colors.secondary,
    accentColor: colors.secondary,
    backgroundColor: colors.background,
    surfaceColor: colors.surface,
    textColor: colors.text,
    mutedTextColor: colors.muted,
    buttonColor: colors.primary,
    buttonTextColor: "#050814",
    styleDirection: "cyberpunk neon marketplace",
    fontPairing: { heading: "Space Grotesk", body: "Inter" },
    borderRadius: "10px",
    shadowStyle: "0 22px 70px rgba(0, 245, 255, 0.22)",
  });
  return {
    ...schema,
    brand,
    theme: {
      ...(schema.theme || {}),
      colors,
      fonts: brand.fontPairing,
      radius: 10,
      shadow: brand.shadowStyle,
      buttons: {
        ...(schema.theme?.buttons || {}),
        background: colors.primary,
        text: "#050814",
        radius: "10px",
      },
    },
    design_variants: arrayValue(schema.design_variants).map((variant, index) => ({
      ...variant,
      name: index === 0 ? "Cyberpunk marketplace" : variant.name,
      background_style: index === 0 ? "dark neon commerce grid" : variant.background_style,
      theme: {
        ...(variant.theme || {}),
        colors,
        fonts: brand.fontPairing,
      },
    })),
  };
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
  let schema;
  try {
    schema = buildInstantTemplateSchema(payload, templateSelection);
  } catch (templateError) {
    console.warn("Selected instant template failed; using emergency editable draft.", templateError);
    schema = buildEmergencyEditableSchema(payload, templateError);
  }
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

function buildEmergencyEditableSchema(payload = {}, error = null) {
  const language = payload.selectedLanguage || builderState.selectedLanguage || "en";
  const copy = instantLocaleCopy(language);
  const name = payload.business_name || copy.newStore || "New website";
  const products = sanitizePublicProductList(
    arrayValue(payload.services_products).length ? arrayValue(payload.services_products) : copy.defaultProducts,
    payload,
    copy,
    language,
    "emergency_editable",
  );
  const brand = normalizeBrand(payload.brand || createBrandSystem({
    extractedColors: payload.logoPalette,
    preferredColors: payload.preferred_colors,
    businessName: name,
    industry: payload.industry,
    tone: payload.preferred_tone,
  }));
  const description = professionalPublicDescription({
    payload,
    template: { id: "emergency-editable", category: "business" },
    catalogType: "editorial_minimal_grid",
    copy,
    name,
    products,
    language,
  });
  return {
    schema_version: "1.0",
    site_type: "business_website",
    business: {
      name,
      description,
      industry: payload.industry || copy.generalBusiness,
      location: payload.location || "",
      target_audience: payload.target_audience || "",
      tone: payload.preferred_tone || copy.defaultTone,
      selectedLanguage: language,
    },
    theme: {
      colors: brandToThemeColors(brand),
      fonts: brand.fontPairing,
      buttons: {
        primary_label: copy.request || copy.shopNow,
        secondary_label: copy.contactRequest,
        background: brand.buttonColor,
        text: brand.buttonTextColor,
        radius: brand.borderRadius,
      },
      radius: Number.parseInt(brand.borderRadius, 10) || 10,
      shadow: brand.shadowStyle,
    },
    brand,
    selected_template: {
      id: "emergency-editable",
      name: "Emergency editable draft",
      architecture_locked: false,
    },
    layout_mode: {
      id: "emergency_editable",
      template_id: "emergency-editable",
      catalog_type: "editorial_minimal_grid",
      navigation: { show_header: true, sticky_header: true, show_cart: false },
    },
    navigation: [
      { label: copy.home, page_key: "home" },
      { label: copy.services || copy.catalog, page_key: "catalog" },
      { label: copy.contactRequest, page_key: "contact" },
    ],
    products_services: products.map((item, index) => ({
      id: `emergency_${index + 1}`,
      name: item,
      description: copy.itemDescription(name),
      price_type: "quote_only",
      price_label: copy.askPrice || "",
      button_label: copy.request || copy.contactRequest,
      is_active: true,
      is_featured: index < 3,
      sort_order: index + 1,
    })),
    pages: buildDefaultInstantPages(copy, name, description, payload),
    fallback_error: String(error?.message || error || ""),
  };
}

function professionalPublicDescription({ payload = {}, template = {}, catalogType = "", copy = {}, name = "", products = [], language = builderState.selectedLanguage }) {
  const templateText = `${catalogType} ${template.id || ""} ${template.category || ""}`.toLowerCase();
  const focus = productFocusForLanguage(products, payload.industry, language);
  const descriptions = {
    en: {
      marketplace: `A search-first shopping experience for ${focus}, with clear categories, featured finds, and a fast path to buy or ask.`,
      fashion: `A visual storefront for ${focus}, built around collections, product storytelling, and a clean path to shop.`,
      restaurant: "A warm menu experience with signature items, specials, hours, location, and a simple ordering path.",
      service: `A trust-first service website for ${focus}, with proof, process, contact options, and quote-ready sections.`,
      premium: `A polished brand experience for ${focus}, with refined messaging, strong visuals, and editable story sections.`,
      company: `A professional business website for ${focus}, built around clarity, trust, services, and direct contact.`,
    },
    es: {
      marketplace: `Una experiencia de compra con busqueda clara para ${focus}, con categorias ordenadas, destacados y una ruta rapida para comprar o preguntar.`,
      fashion: `Una tienda visual para ${focus}, pensada alrededor de colecciones, narrativa de producto y una ruta clara para comprar.`,
      restaurant: "Una experiencia calida de menu con platos destacados, especiales, horarios, ubicacion y pedidos simples.",
      service: `Una pagina enfocada en confianza para ${focus}, con pruebas, proceso, contacto y secciones listas para cotizar.`,
      premium: `Una experiencia de marca pulida para ${focus}, con mensaje refinado, visuales fuertes y secciones editables.`,
      company: `Una pagina profesional para ${focus}, enfocada en claridad, confianza, servicios y contacto directo.`,
    },
    fr: {
      marketplace: `Une experience d'achat claire pour ${focus}, avec categories, selections et parcours rapide vers l'achat ou la demande.`,
      fashion: `Une boutique visuelle pour ${focus}, construite autour des collections, du storytelling produit et d'un achat clair.`,
      restaurant: "Une experience menu chaleureuse avec plats signature, offres, horaires, adresse et commande simple.",
      service: `Un site de service axe confiance pour ${focus}, avec preuves, processus, contact et demande de devis.`,
      premium: `Une experience de marque soignee pour ${focus}, avec message raffine, visuels forts et sections modifiables.`,
      company: `Un site professionnel pour ${focus}, centre sur la clarte, la confiance, les services et le contact direct.`,
    },
    pt: {
      marketplace: `Uma experiencia de compra clara para ${focus}, com categorias, destaques e caminho rapido para comprar ou perguntar.`,
      fashion: `Uma loja visual para ${focus}, feita em torno de colecoes, narrativa de produto e compra clara.`,
      restaurant: "Uma experiencia acolhedora de menu com destaques, especiais, horarios, localizacao e pedido simples.",
      service: `Um site focado em confianca para ${focus}, com provas, processo, contato e secoes prontas para orcamento.`,
      premium: `Uma experiencia de marca polida para ${focus}, com mensagem refinada, visual forte e secoes editaveis.`,
      company: `Um site profissional para ${focus}, focado em clareza, confianca, servicos e contato direto.`,
    },
  };
  const lang = descriptions[language] ? language : "en";
  const set = descriptions[lang];
  if (/marketplace|dense|listing|store|shop|catalog/.test(templateText)) return set.marketplace;
  if (/fashion|lookbook|collection/.test(templateText)) return set.fashion;
  if (/restaurant|menu|food/.test(templateText)) return set.restaurant;
  if (/service|booking|clinic|legal|professional|home_services|quote/.test(templateText)) return set.service;
  if (/company|corporate|b2b|industrial|enterprise/.test(templateText)) return set.company;
  return set.premium || copy.defaultDescription || name;
}

function productFocusForLanguage(products = [], fallback = "", language = builderState.selectedLanguage) {
  const clean = arrayValue(products)
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 2);
  if (clean.length) {
    const joiner = language === "en" ? " and " : language === "fr" ? " et " : " y ";
    return clean.join(joiner);
  }
  const fallbacks = {
    en: "the right products and services",
    es: "los productos y servicios correctos",
    fr: "les bons produits et services",
    pt: "os produtos e servicos certos",
  };
  return fallback || fallbacks[language] || fallbacks.en;
}

function sanitizePublicProductList(products = [], payload = {}, copy = {}, language = builderState.selectedLanguage, templateHint = "") {
  const sourceText = `${payload.business_description || ""} ${payload.industry || ""} ${arrayValue(products).join(" ")} ${templateHint || ""}`;
  const sourceSuggestsBroadMarketplace = textSuggestsBroadMarketplace(sourceText);
  const usesMarketplaceTemplate = /mega-marketplace|marketplace-style|dense_marketplace_catalog/i.test(templateHint);
  const usesMegaRetailTemplate = /mega-retail-store|single_vendor_dense_catalog|dense_retail_catalog/i.test(templateHint);
  const cleaned = arrayValue(products)
    .map((item) => cleanPublicItemLabel(item))
    .filter(Boolean)
    .slice(0, 8);
  if (sourceSuggestsBroadMarketplace || usesMarketplaceTemplate || usesMegaRetailTemplate) {
    const inferred = inferredPublicCatalogLabels({ text: sourceText, language });
    return [
      ...new Set([
        ...cleaned.filter((item) => item.split(/\s+/).length <= 4),
        ...inferred,
        ...marketplaceSeedCatalogLabels(sourceText, language),
      ]),
    ].slice(0, 12);
  }
  if (cleaned.length >= 2 && !sourceSuggestsBroadMarketplace) return cleaned;
  const inferred = inferredPublicCatalogLabels({
    text: sourceText,
    language,
  });
  if (inferred.length) {
    return sourceSuggestsBroadMarketplace
      ? [...new Set([...inferred, ...cleaned.filter((item) => item.split(/\s+/).length <= 3)])].slice(0, 6)
      : inferred;
  }
  return cleaned.length ? cleaned : arrayValue(copy.defaultProducts).slice(0, 4);
}

function marketplaceSeedCatalogLabels(text = "", language = builderState.selectedLanguage) {
  const lower = String(text || "").toLowerCase();
  const sets = {
    es: {
      variety: ["Gadget destacado", "Accesorio automotriz", "Coleccionable anime", "Regalo curioso", "Organizador para auto", "Accesorio para el hogar", "Producto viral", "Set de novedades", "Herramienta util", "Decoracion tematica", "Combo sorpresa", "Oferta limitada"],
      jewelry: ["Collar artesanal", "Pulsera ajustable", "Aretes llamativos", "Set de bisuteria", "Anillo decorativo", "Charm personalizado", "Accesorio para regalo", "Coleccion de temporada", "Pieza minimalista", "Pulsera de cuentas", "Aretes de fiesta", "Pack especial"],
      fashion: ["Chaqueta destacada", "Camiseta grafica", "Accesorio urbano", "Bolso compacto", "Gorra de temporada", "Set streetwear", "Pieza limitada", "Look completo", "Sneaker destacado", "Oferta de moda", "Drop nuevo", "Combo de accesorios"],
      default: ["Producto destacado", "Oferta especial", "Nuevo lanzamiento", "Best seller", "Pack recomendado", "Accesorio esencial", "Producto premium", "Combo ahorro", "Seleccion popular", "Edicion limitada", "Hallazgo especial", "Categoria estrella"],
    },
    en: {
      variety: ["Featured gadget", "Auto accessory", "Anime collectible", "Curious gift", "Car organizer", "Home accessory", "Viral product", "New finds set", "Useful tool", "Theme decor", "Surprise bundle", "Limited offer"],
      jewelry: ["Handmade necklace", "Adjustable bracelet", "Statement earrings", "Jewelry set", "Decorative ring", "Custom charm", "Gift accessory", "Seasonal collection", "Minimal piece", "Beaded bracelet", "Party earrings", "Special pack"],
      fashion: ["Featured jacket", "Graphic tee", "Urban accessory", "Compact bag", "Seasonal cap", "Streetwear set", "Limited piece", "Complete look", "Featured sneaker", "Fashion deal", "New drop", "Accessory bundle"],
      default: ["Featured product", "Special offer", "New arrival", "Best seller", "Recommended pack", "Essential accessory", "Premium item", "Savings bundle", "Popular pick", "Limited edition", "Special find", "Category star"],
    },
    fr: {
      variety: ["Gadget vedette", "Accessoire auto", "Objet anime", "Cadeau original", "Organiseur voiture", "Accessoire maison", "Produit viral", "Nouveautes", "Outil utile", "Decoration theme", "Pack surprise", "Offre limitee"],
      jewelry: ["Collier artisanal", "Bracelet reglable", "Boucles statement", "Set bijoux", "Bague decorative", "Charm personnalise", "Accessoire cadeau", "Collection saison", "Piece minimaliste", "Bracelet perles", "Boucles fete", "Pack special"],
      fashion: ["Veste vedette", "T-shirt graphique", "Accessoire urbain", "Sac compact", "Casquette saison", "Set streetwear", "Piece limitee", "Look complet", "Sneaker vedette", "Offre mode", "Nouveau drop", "Pack accessoires"],
      default: ["Produit vedette", "Offre speciale", "Nouveaute", "Best seller", "Pack recommande", "Accessoire essentiel", "Produit premium", "Pack economie", "Choix populaire", "Edition limitee", "Trouvaille speciale", "Categorie phare"],
    },
    pt: {
      variety: ["Gadget destaque", "Acessorio automotivo", "Colecionavel anime", "Presente curioso", "Organizador de carro", "Acessorio para casa", "Produto viral", "Set de novidades", "Ferramenta util", "Decoracao tematica", "Combo surpresa", "Oferta limitada"],
      jewelry: ["Colar artesanal", "Pulseira ajustavel", "Brincos marcantes", "Kit bijuteria", "Anel decorativo", "Charm personalizado", "Acessorio presente", "Colecao sazonal", "Peca minimalista", "Pulseira de contas", "Brincos festa", "Pack especial"],
      fashion: ["Jaqueta destaque", "Camiseta grafica", "Acessorio urbano", "Bolsa compacta", "Bone sazonal", "Set streetwear", "Peca limitada", "Look completo", "Sneaker destaque", "Oferta moda", "Novo drop", "Combo acessorios"],
      default: ["Produto destaque", "Oferta especial", "Lancamento", "Mais vendido", "Pack recomendado", "Acessorio essencial", "Produto premium", "Combo economia", "Escolha popular", "Edicao limitada", "Achado especial", "Categoria estrela"],
    },
  };
  const set = sets[language] || sets.en;
  if (textSuggestsJewelryAccessoryStore(lower)) return set.jewelry;
  if (/ropa|moda|fashion|camisa|zapato|sneaker|clothing|apparel|streetwear/.test(lower)) return set.fashion;
  if (/carro|auto|automotriz|camioneta|anime|gadget|juguete|regalo|raro|curioso|hogar|home|toy|gift|collectible/.test(lower)) return set.variety;
  return set.default;
}

function marketplacePriceForIndex(index) {
  const prices = [19.99, 24.5, 34.99, 49, 12.5, 79, 9.99, 59, 129, 17.99, 89, 39.99];
  return prices[index % prices.length];
}

function cleanPublicItemLabel(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length > 48) return "";
  if (/[.!?¿]/.test(text)) return "";
  if (textSuggestsBroadMarketplace(text) && text.split(/\s+/).length > 3) return "";
  if (/\b(quiero|necesito|debe|deberia|página|pagina|website|marketplace|cliente|contacto|ubicaci[oó]n|telefono|tel[eé]fono|whatsapp|productos?|servicios?|vendo|vende|ofrece|online|etc)\b/i.test(text) && text.split(/\s+/).length > 3) {
    return "";
  }
  return text;
}

function inferredPublicCatalogLabels({ text = "", language = builderState.selectedLanguage } = {}) {
  const lower = String(text || "").toLowerCase();
  const labels = {
    es: {
      jewelry: ["Collares artesanales", "Pulseras", "Aretes y zarcillos"],
      fashion: ["Ropa seleccionada", "Accesorios", "Novedades"],
      marketplace: ["Hallazgos especiales", "Gadgets utiles", "Coleccionables"],
      restaurant: ["Platos destacados", "Especiales", "Bebidas"],
      service: ["Servicio principal", "Paquetes", "Consulta"],
      default: ["Oferta destacada", "Categorias clave", "Novedades"],
    },
    en: {
      jewelry: ["Handmade necklaces", "Bracelets", "Earrings"],
      fashion: ["Selected apparel", "Accessories", "New arrivals"],
      marketplace: ["Special finds", "Useful gadgets", "Collectibles"],
      restaurant: ["Signature dishes", "Specials", "Drinks"],
      service: ["Main service", "Packages", "Consultation"],
      default: ["Featured offer", "Key categories", "New arrivals"],
    },
    fr: {
      jewelry: ["Colliers artisanaux", "Bracelets", "Boucles d'oreilles"],
      fashion: ["Vetements selectionnes", "Accessoires", "Nouveautes"],
      marketplace: ["Trouvailles speciales", "Gadgets utiles", "Objets de collection"],
      restaurant: ["Plats signature", "Specials", "Boissons"],
      service: ["Service principal", "Forfaits", "Consultation"],
      default: ["Offre phare", "Categories cles", "Nouveautes"],
    },
    pt: {
      jewelry: ["Colares artesanais", "Pulseiras", "Brincos"],
      fashion: ["Roupas selecionadas", "Acessorios", "Novidades"],
      marketplace: ["Achados especiais", "Gadgets uteis", "Colecionaveis"],
      restaurant: ["Pratos destaque", "Especiais", "Bebidas"],
      service: ["Servico principal", "Pacotes", "Consulta"],
      default: ["Oferta destaque", "Categorias chave", "Novidades"],
    },
  };
  const set = labels[language] || labels.en;
  if (textSuggestsJewelryAccessoryStore(lower)) return set.jewelry;
  if (/ropa|moda|fashion|camisa|zapato|sneaker|clothing|apparel/.test(lower)) return set.fashion;
  if (/comida|restaurante|menu|food|restaurant|cafe/.test(lower)) return set.restaurant;
  if (/servicio|service|consulta|booking|cita|quote|cotiz/.test(lower)) return set.service;
  if (/carro|anime|gadget|juguete|curioso|raro|marketplace|store|shop|tienda|producto/.test(lower)) return set.marketplace;
  return set.default;
}

function buildInstantTemplateSchema(payload, templateSelection) {
  const language = payload.selectedLanguage || builderState.selectedLanguage || "en";
  const template = templateSelection?.template || payload.selectedTemplate || {};
  const catalogType = templateSelection?.catalogType || template.catalogModel?.catalogType || payload.catalogType || "editorial_minimal_grid";
  const templateInstructions = templateSelection
    ? buildTemplateInstructions(templateSelection)
    : payload.templateInstructions || {};
  const copy = instantLocaleCopy(language);
  const name = payload.business_name || copy.newStore;
  const products = sanitizePublicProductList(
    arrayValue(payload.services_products).length ? arrayValue(payload.services_products) : copy.defaultProducts,
    payload,
    copy,
    language,
    `${catalogType} ${template.id || ""}`,
  );
  const description = professionalPublicDescription({ payload, template, catalogType, copy, name, products, language });
  const salesText = `${payload.salesMode || ""} ${payload.sales_mode || ""} ${payload.templateIntent || ""} ${template.category || ""} ${template.id || ""}`.toLowerCase();
  const isMegaRetailTemplate = catalogType === "single_vendor_dense_catalog" || catalogType === "dense_retail_catalog" || /mega-retail-store/i.test(template.id || "");
  const isMarketplaceTemplate = catalogType === "dense_marketplace_catalog" || /mega-marketplace|marketplace-style/i.test(template.id || "");
  const isOnlineShop = /sell online|online sales|shop|store|tienda|ecommerce|cart|checkout|vender|comprar|marketplace/.test(salesText) || isMarketplaceTemplate || isMegaRetailTemplate;
  const categoryContext = [
    payload.business_description,
    payload.industry,
    payload.templateIntent,
    arrayValue(payload.services_products).join(" "),
    products.join(" "),
    template.id,
    catalogType,
  ].join(" ");
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
    category: marketplaceCategoryForIndex(index, copy, categoryContext, language),
    rating: (4.3 + ((index % 5) * 0.12)).toFixed(1),
    review_count: 42 + index * 31,
    shipping_label: index % 2 === 0 ? copy.fastDelivery : copy.freeShipping,
    deal_label: index % 3 === 0 ? copy.todayDeal : "",
    price_type: isOnlineShop ? "fixed" : "quote_only",
    price_amount: (isMarketplaceTemplate || isMegaRetailTemplate) ? marketplacePriceForIndex(index) : "",
    currency: "USD",
    price_label: (isMarketplaceTemplate || isMegaRetailTemplate) ? `USD ${marketplacePriceForIndex(index).toFixed(2)}` : (isOnlineShop ? copy.priceNotSet : copy.askPrice),
    button_label: isOnlineShop ? copy.viewProduct : copy.request,
    inventory_quantity: (isMarketplaceTemplate || isMegaRetailTemplate) ? 24 + index * 3 : "",
    track_inventory: isOnlineShop,
    image_url: "",
    is_active: true,
    is_featured: index < 3,
    sort_order: index,
  }));
  const isPremiumTemplate = catalogType === "premium_editorial_catalog" || /premium-product-store|apple-premium-product/i.test(template.id || "");
  const isFashionTemplate = catalogType === "lookbook_collection_catalog" || /fashion-drop-pro/i.test(template.id || "");
  const isCorporateTemplate = catalogType === "company_services_catalog" || /corporate-company-pro/i.test(template.id || "");
  const isLeadFunnelTemplate = catalogType === "lead_funnel_offer_catalog" || /lead-funnel-pro/i.test(template.id || "");
  const isHomeServicesTemplate = catalogType === "home_services_quote_catalog" || catalogType === "service_area_catalog" || /home-services-premium|local-services-pro-plus/i.test(template.id || "");
  const isBookingTemplate = catalogType === "booking_menu_catalog" || /booking-appointment-pro/i.test(template.id || "");
  const isRestaurantTemplate = catalogType === "restaurant_menu_catalog" || catalogType === "menu_catalog" || /restaurant-food-business/i.test(template.id || "");
  const isDigitalTemplate = catalogType === "digital_offer_catalog" || /digital-products-store/i.test(template.id || "");
  const isRealEstateListingTemplate = catalogType === "real_estate_listing_catalog" || /real-estate-listings-pro/i.test(template.id || "");
  const isLuxuryHighTicketTemplate = catalogType === "luxury_high_ticket_catalog" || /luxury-high-ticket-pro/i.test(template.id || "");
  const isEducationTemplate = catalogType === "education_course_catalog" || /education-course-academy-pro/i.test(template.id || "");
  const isClinicTemplate = catalogType === "medical_wellness_service_catalog" || /medical-wellness-clinic-pro/i.test(template.id || "");
  const isProfessionalTemplate = catalogType === "legal_professional_services_catalog" || /legal-professional-services-pro/i.test(template.id || "");
  const isB2BTemplate = catalogType === "b2b_solution_catalog" || /b2b-saas-enterprise-pro/i.test(template.id || "");
  const isManufacturingTemplate = catalogType === "industrial_supplier_catalog" || /manufacturing-industrial-supplier-pro/i.test(template.id || "");
  const isBusinessWebsite = isCorporateTemplate || isLeadFunnelTemplate || isHomeServicesTemplate || isBookingTemplate || isRestaurantTemplate || isRealEstateListingTemplate || isLuxuryHighTicketTemplate || isEducationTemplate || isClinicTemplate || isProfessionalTemplate || isB2BTemplate || isManufacturingTemplate;
  const primaryCta = isManufacturingTemplate ? copy.requestQuote : isB2BTemplate ? copy.requestDemo : isProfessionalTemplate ? copy.scheduleConsultation : isClinicTemplate ? copy.bookConsultation : isEducationTemplate ? copy.enrollNow : isLuxuryHighTicketTemplate ? copy.requestPrivateViewing : isRealEstateListingTemplate ? copy.searchListings : isDigitalTemplate ? copy.getAccess : isRestaurantTemplate ? copy.orderNow : isBookingTemplate ? copy.bookNow : isHomeServicesTemplate ? copy.freeQuote : isCorporateTemplate ? copy.requestConsultation : isLeadFunnelTemplate ? copy.claimOffer : copy.shopNow;
  const secondaryCta = isManufacturingTemplate ? copy.viewSpecs : isB2BTemplate ? copy.viewSolutions : isProfessionalTemplate ? copy.viewServices : isClinicTemplate ? copy.viewTreatments : isEducationTemplate ? copy.viewCurriculum : isLuxuryHighTicketTemplate ? copy.viewCollection : isRealEstateListingTemplate ? copy.viewListings : isDigitalTemplate ? copy.viewProducts : isRestaurantTemplate ? copy.viewMenu : isBookingTemplate ? copy.viewServices : isHomeServicesTemplate ? copy.callNow : isLeadFunnelTemplate ? copy.seeProof : copy.viewCatalog;
  if (isLeadFunnelTemplate || isHomeServicesTemplate || isBookingTemplate || isRestaurantTemplate) {
    catalogItems.forEach((item) => {
      item.price_type = "quote_only";
      item.category = isRestaurantTemplate ? restaurantCategoryForIndex(item.sort_order || 0, copy) : item.category;
      item.price_label = isRestaurantTemplate ? copy.menuPrice : isBookingTemplate ? copy.fromQuote : copy.askPrice;
      item.button_label = isRestaurantTemplate ? copy.orderNow : isBookingTemplate ? copy.bookNow : isHomeServicesTemplate ? copy.freeQuote : copy.claimOffer;
      item.track_inventory = false;
    });
  }
  if (isDigitalTemplate) {
    catalogItems.forEach((item, index) => {
      item.price_type = "fixed";
      item.category = digitalCategoryForIndex(index, copy);
      item.price_label = item.price_label && item.price_label !== copy.priceNotSet ? item.price_label : copy.digitalPrice;
      item.button_label = copy.getAccess;
      item.track_inventory = false;
      item.shipping_label = copy.instantAccess;
    });
  }
  if (isRealEstateListingTemplate) {
    catalogItems.forEach((item, index) => {
      item.price_type = "quote_only";
      item.category = listingCategoryForIndex(index, copy);
      item.price_label = item.price_label && item.price_label !== copy.priceNotSet ? item.price_label : copy.listingPrice;
      item.button_label = copy.inquireNow;
      item.shipping_label = listingLocationForIndex(index, copy);
      item.deal_label = index === 0 ? copy.featuredListing : index % 2 ? copy.newListing : copy.availableNow;
      item.track_inventory = false;
    });
  }
  if (isFashionTemplate) {
    catalogItems.forEach((item, index) => {
      item.price_type = isOnlineShop ? "fixed" : "quote_only";
      item.category = fashionCategoryForIndex(index, copy, `${payload.business_description || ""} ${payload.industry || ""} ${arrayValue(payload.services_products).join(" ")}`);
      item.price_label = item.price_label && item.price_label !== copy.priceNotSet ? item.price_label : copy.priceNotSet;
      item.button_label = isOnlineShop ? copy.viewProduct : copy.privateInquiry || copy.request;
      item.shipping_label = index % 2 ? copy.limitedSelection : copy.newDrop;
      item.deal_label = index === 0 ? copy.signaturePiece || copy.newDrop : index % 2 ? copy.limitedSelection : "";
      item.track_inventory = isOnlineShop;
    });
  }
  if (isLuxuryHighTicketTemplate) {
    catalogItems.forEach((item, index) => {
      item.price_type = "quote_only";
      item.category = luxuryCategoryForIndex(index, copy);
      item.price_label = copy.priceOnRequest;
      item.button_label = copy.requestPrivateViewing;
      item.shipping_label = copy.privateService;
      item.deal_label = index === 0 ? copy.signaturePiece : index % 2 ? copy.authenticated : copy.limitedPiece;
      item.track_inventory = false;
    });
  }
  if (isEducationTemplate) {
    catalogItems.forEach((item, index) => {
      item.price_type = "fixed";
      item.category = educationCategoryForIndex(index, copy);
      item.price_label = item.price_label && item.price_label !== copy.priceNotSet ? item.price_label : copy.coursePrice;
      item.button_label = copy.enrollNow;
      item.shipping_label = educationDurationForIndex(index, copy);
      item.deal_label = index === 0 ? copy.featuredProgram : index % 2 ? copy.beginnerFriendly : copy.certificateReady;
      item.track_inventory = false;
    });
  }
  if (isClinicTemplate) {
    catalogItems.forEach((item, index) => {
      item.price_type = "quote_only";
      item.category = clinicCategoryForIndex(index, copy);
      item.price_label = copy.consultationBased;
      item.button_label = copy.bookConsultation;
      item.shipping_label = clinicDurationForIndex(index, copy);
      item.deal_label = index === 0 ? copy.popularTreatment : index % 2 ? copy.specialistLed : copy.personalizedPlan;
      item.track_inventory = false;
    });
  }
  if (isProfessionalTemplate) {
    catalogItems.forEach((item, index) => {
      item.price_type = "quote_only";
      item.category = professionalCategoryForIndex(index, copy);
      item.price_label = copy.consultationBased;
      item.button_label = copy.scheduleConsultation;
      item.shipping_label = professionalEngagementForIndex(index, copy);
      item.deal_label = index === 0 ? copy.confidential : index % 2 ? copy.seniorAdvisor : copy.caseReview;
      item.track_inventory = false;
    });
  }
  if (isB2BTemplate) {
    catalogItems.forEach((item, index) => {
      item.price_type = "quote_only";
      item.category = enterpriseCategoryForIndex(index, copy);
      item.price_label = copy.customPlan;
      item.button_label = copy.requestDemo;
      item.shipping_label = enterpriseTimelineForIndex(index, copy);
      item.deal_label = index === 0 ? copy.enterpriseReady : index % 2 ? copy.integrationReady : copy.roiFocused;
      item.track_inventory = false;
    });
  }
  if (isManufacturingTemplate) {
    catalogItems.forEach((item, index) => {
      item.price_type = "quote_only";
      item.category = industrialCategoryForIndex(index, copy);
      item.price_label = copy.quoteRequired;
      item.button_label = copy.requestQuote;
      item.shipping_label = industrialLeadTimeForIndex(index, copy);
      item.deal_label = index === 0 ? copy.certified : index % 2 ? copy.bulkReady : copy.specReady;
      item.track_inventory = false;
      item.specs = {
        sku: `IND-${String(index + 1).padStart(3, "0")}`,
        moq: index % 2 ? "100+" : "25+",
        material: copy.industrialMaterials?.[index % (copy.industrialMaterials?.length || 1)] || copy.specReady,
        lead_time: item.shipping_label,
      };
    });
  }
  const instantPages = isMegaRetailTemplate
    ? buildRetailInstantPages(copy, name, description, payload)
    : isMarketplaceTemplate
      ? buildMarketplaceInstantPages(copy, name, description, payload)
    : isPremiumTemplate
      ? buildPremiumProductInstantPages(copy, name, description, payload)
      : isLuxuryHighTicketTemplate
        ? buildLuxuryHighTicketInstantPages(copy, name, description, payload)
        : isEducationTemplate
          ? buildEducationAcademyInstantPages(copy, name, description, payload)
          : isClinicTemplate
            ? buildMedicalWellnessInstantPages(copy, name, description, payload)
            : isProfessionalTemplate
              ? buildLegalProfessionalInstantPages(copy, name, description, payload)
              : isB2BTemplate
                ? buildB2BEnterpriseInstantPages(copy, name, description, payload)
                : isManufacturingTemplate
                  ? buildManufacturingIndustrialInstantPages(copy, name, description, payload)
            : isFashionTemplate
            ? buildFashionDropInstantPages(copy, name, description, payload)
            : isCorporateTemplate
              ? buildCorporateCompanyInstantPages(copy, name, description, payload)
              : isHomeServicesTemplate
                ? buildHomeServicesPremiumInstantPages(copy, name, description, payload)
                : isBookingTemplate
                  ? buildBookingAppointmentInstantPages(copy, name, description, payload)
                  : isRestaurantTemplate
                    ? buildRestaurantMenuInstantPages(copy, name, description, payload)
                    : isDigitalTemplate
                      ? buildDigitalProductsInstantPages(copy, name, description, payload)
                      : isRealEstateListingTemplate
                        ? buildRealEstateListingsInstantPages(copy, name, description, payload)
              : isLeadFunnelTemplate
                ? buildLeadFunnelInstantPages(copy, name, description, payload)
            : buildDefaultInstantPages(copy, name, description, payload);
  return {
    schema_version: "1.0",
    site_type: isBusinessWebsite ? "business_website" : "online_store",
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
        primary_label: primaryCta,
        secondary_label: secondaryCta,
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
      navigation: { show_cart: !isBusinessWebsite, show_header: true, sticky_header: true },
      checkout: { mode: isBusinessWebsite ? "lead_capture" : isOnlineShop ? "cart_setup_required" : "quote_or_cart", primary_action: primaryCta },
    },
    integrations: { contact: { whatsapp_enabled: true, email_enabled: true }, analytics: { enabled: false, provider: "" }, payments: { enabled: false, mode: "setup_required" } },
    custom_logic: { enabled: false, risk_level: "restricted", automations: "" },
    site_plan: payload.sitePlan || buildSitePlan(templateSelection),
    navigation: isMegaRetailTemplate ? [
      { label: copy.home, page_key: "home" },
      { label: copy.deals, page_key: "catalog" },
      { label: copy.categories, page_key: "catalog" },
      { label: copy.support, page_key: "contact" },
    ] : isMarketplaceTemplate ? [
      { label: copy.home, page_key: "home" },
      { label: copy.deals, page_key: "catalog" },
      { label: copy.categories, page_key: "catalog" },
      { label: copy.support, page_key: "contact" },
    ] : isPremiumTemplate ? [
      { label: copy.overview, page_key: "home" },
      { label: copy.products, page_key: "catalog" },
      { label: copy.story, page_key: "about" },
      { label: copy.contact, page_key: "contact" },
    ] : isLuxuryHighTicketTemplate ? [
      { label: copy.collection, page_key: "home" },
      { label: copy.products, page_key: "catalog" },
      { label: copy.provenance, page_key: "about" },
      { label: copy.privateInquiry, page_key: "contact" },
    ] : isClinicTemplate ? [
      { label: copy.treatments, page_key: "home" },
      { label: copy.services, page_key: "catalog" },
      { label: copy.results, page_key: "about" },
      { label: copy.bookConsultation, page_key: "contact" },
    ] : isProfessionalTemplate ? [
      { label: copy.services, page_key: "home" },
      { label: copy.process, page_key: "about" },
      { label: copy.proof, page_key: "about" },
      { label: copy.scheduleConsultation, page_key: "contact" },
    ] : isManufacturingTemplate ? [
      { label: copy.products, page_key: "home" },
      { label: copy.capabilities, page_key: "about" },
      { label: copy.certifications, page_key: "about" },
      { label: copy.requestQuote, page_key: "contact" },
    ] : isB2BTemplate ? [
      { label: copy.solutions, page_key: "home" },
      { label: copy.useCases, page_key: "about" },
      { label: copy.integrations, page_key: "about" },
      { label: copy.requestDemo, page_key: "contact" },
    ] : isFashionTemplate ? [
      { label: copy.newDrop, page_key: "home" },
      { label: copy.collections, page_key: "catalog" },
      { label: copy.lookbook, page_key: "about" },
      { label: copy.contact, page_key: "contact" },
    ] : isCorporateTemplate ? [
      { label: copy.company, page_key: "home" },
      { label: copy.services, page_key: "catalog" },
      { label: copy.process, page_key: "about" },
      { label: copy.contact, page_key: "contact" },
    ] : isLeadFunnelTemplate ? [
      { label: copy.offer, page_key: "home" },
      { label: copy.benefits, page_key: "catalog" },
      { label: copy.proof, page_key: "about" },
      { label: copy.contact, page_key: "contact" },
    ] : isRestaurantTemplate ? [
      { label: copy.menu, page_key: "home" },
      { label: copy.specials, page_key: "catalog" },
      { label: copy.hoursLocation, page_key: "about" },
      { label: copy.orderNow, page_key: "contact" },
    ] : isDigitalTemplate ? [
      { label: copy.offer, page_key: "home" },
      { label: copy.products, page_key: "catalog" },
      { label: copy.modules, page_key: "about" },
      { label: copy.getAccess, page_key: "contact" },
    ] : isRealEstateListingTemplate ? [
      { label: copy.search, page_key: "home" },
      { label: copy.listings, page_key: "catalog" },
      { label: copy.areas, page_key: "about" },
      { label: copy.inquireNow, page_key: "contact" },
    ] : isHomeServicesTemplate ? [
      { label: copy.services, page_key: "home" },
      { label: copy.serviceAreas, page_key: "catalog" },
      { label: copy.workProof, page_key: "about" },
      { label: copy.freeQuote, page_key: "contact" },
    ] : isBookingTemplate ? [
      { label: copy.services, page_key: "home" },
      { label: copy.availability, page_key: "catalog" },
      { label: copy.team, page_key: "about" },
      { label: copy.bookNow, page_key: "contact" },
    ] : [
      { label: copy.home, page_key: "home" },
      { label: copy.shop, page_key: "catalog" },
      { label: copy.about, page_key: "about" },
      { label: copy.contact, page_key: "contact" },
    ],
    pages: instantPages,
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
        theme: { colors, fonts: brand.fontPairing, buttons: { primary_label: primaryCta, secondary_label: secondaryCta, background: brand.buttonColor, text: brand.buttonTextColor, radius: brand.borderRadius }, radius: Number.parseInt(brand.borderRadius, 10) || 10, shadow: brand.shadowStyle },
        layout_mode_id: template.id || "instant_storefront",
        hero_layout: isPremiumTemplate ? "premium_center_stage" : isLuxuryHighTicketTemplate ? "private_luxury_showroom" : isClinicTemplate ? "clinic_care_stage" : isProfessionalTemplate ? "professional_authority" : isB2BTemplate ? "enterprise_dashboard" : isFashionTemplate ? "fashion_editorial_drop" : isCorporateTemplate ? "corporate_editorial" : isLeadFunnelTemplate ? "conversion_funnel" : isHomeServicesTemplate ? "local_service_quote" : isBookingTemplate ? "appointment_booking" : isRestaurantTemplate ? "restaurant_menu_story" : isDigitalTemplate ? "digital_product_launch" : "split_showcase",
        product_layout: catalogType,
      },
    ],
    products_services: catalogItems,
    catalog_items: catalogItems,
    contact: payload.contact_info || {},
    editable_fields: ["headline", "subtitle", "title", "text", "primary_button", "secondary_button", "image_url", "images"],
  };
}

function buildDefaultInstantPages(copy, name, description, payload = {}) {
  return [
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
  ];
}

function buildPremiumProductInstantPages(copy, name, description, payload = {}) {
  const heroImage = payload.assets?.find((asset) => asset.asset_type === "photo")?.url || "";
  const composition = runtimeCompositionIndex(name, payload);
  const recipes = [
    { hero: "split_showcase", order: ["premium_hero", "premium_story", "premium_feature", "premium_gallery", "premium_specs"] },
    { hero: "centered_bold", order: ["premium_hero", "premium_gallery", "premium_feature", "premium_story", "premium_specs"] },
    { hero: "asymmetric_grid", order: ["premium_hero", "premium_specs", "premium_story", "premium_gallery", "premium_feature"] },
  ];
  const recipe = recipes[composition];
  const pages = [
    {
      page_key: "home",
      title: copy.overview,
      slug: "/",
      order: 1,
      sections: [
        {
          id: "premium_hero",
          type: "PremiumHero",
          order: 1,
          editable: {
            headline: copy.premiumHeadline(name),
            subtitle: copy.premiumSubheadline(description),
            primary_button: copy.premiumPrimary,
            secondary_button: copy.premiumSecondary,
            image_url: heroImage,
            images: [],
          },
          variant: recipe.hero,
          settings: { layout: recipe.hero, spacing: "cinematic", container_width: "wide" },
        },
        {
          id: "premium_story",
          type: "ProductStory",
          order: 2,
          editable: {
            title: copy.premiumStoryTitle,
            text: copy.premiumStoryText,
            image_url: heroImage,
            images: [],
          },
          variant: composition === 2 ? "image_left" : "feature_band",
          settings: { layout: "editorial_split", spacing: "spacious", container_width: "wide" },
        },
        {
          id: "premium_feature",
          type: "FeatureShowcase",
          order: 3,
          editable: {
            title: copy.premiumFeatureTitle,
            text: copy.premiumFeatureText,
            images: [],
          },
          variant: composition === 1 ? "card_grid" : "feature_band",
          settings: { layout: "feature_focus", spacing: "spacious", container_width: "wide" },
        },
        {
          id: "premium_gallery",
          type: "EditorialGallery",
          order: 4,
          editable: {
            title: copy.premiumGalleryTitle,
            text: copy.premiumGalleryText,
            images: [],
          },
          settings: { layout: "premium_cards", columns: 3, spacing: "balanced", container_width: "wide" },
        },
        {
          id: "premium_specs",
          type: "SpecStrip",
          order: 5,
          editable: {
            title: copy.premiumSpecsTitle,
            text: copy.premiumSpecsText,
            items: copy.premiumSpecItems,
          },
          settings: { layout: "quiet_specs", spacing: "balanced", container_width: "wide" },
        },
      ],
    },
    {
      page_key: "catalog",
      title: copy.products,
      slug: copy.shopSlug,
      order: 2,
      sections: [
        {
          id: "premium_catalog",
          type: "ProductGrid",
          order: 1,
          editable: { title: copy.premiumGalleryTitle, text: copy.premiumGalleryText, images: [] },
          settings: { layout: "premium_editorial", columns: 3, spacing: "spacious", container_width: "wide" },
        },
      ],
    },
    {
      page_key: "about",
      title: copy.story,
      slug: copy.aboutSlug,
      order: 3,
      sections: [{ id: "about", type: "ProductStory", order: 1, editable: { title: copy.aboutBrand, text: description, image_url: heroImage }, settings: { layout: "editorial_split", container_width: "wide" } }],
    },
    {
      page_key: "contact",
      title: copy.contact,
      slug: copy.contactSlug,
      order: 4,
      sections: [{ id: "contact", type: "Contact", order: 1, editable: { title: copy.letsTalk, text: copy.contactText }, settings: { layout: "simple", container_width: "wide" } }],
    },
  ];
  const home = pages.find((page) => page.page_key === "home");
  const byId = new Map(home.sections.map((section) => [section.id, section]));
  home.sections = resequenceSections(recipe.order.map((id) => byId.get(id)).filter(Boolean));
  return pages;
}

function buildLuxuryHighTicketInstantPages(copy, name, description, payload = {}) {
  const heroImage = payload.assets?.find((asset) => asset.asset_type === "photo")?.url || "";
  return [
    {
      page_key: "home",
      title: copy.collection,
      slug: "/",
      order: 1,
      sections: [
        {
          id: "luxury_hero",
          type: "LuxuryHero",
          order: 1,
          editable: {
            headline: copy.luxuryHeadline(name),
            subtitle: copy.luxurySubheadline(description),
            primary_button: copy.requestPrivateViewing,
            secondary_button: copy.viewCollection,
            image_url: heroImage,
            badge: copy.limitedSelection,
            images: [],
          },
          settings: { layout: "private_showroom", spacing: "cinematic", container_width: "wide" },
        },
        {
          id: "luxury_signature",
          type: "LuxurySignature",
          order: 2,
          editable: {
            title: copy.signaturePiece,
            text: copy.luxurySignatureText,
            image_url: heroImage,
            items: copy.luxuryProofItems,
            images: [],
          },
          settings: { layout: "signature_piece", spacing: "spacious", container_width: "wide" },
        },
        {
          id: "luxury_collection",
          type: "LuxuryCollection",
          order: 3,
          editable: {
            title: copy.luxuryCollectionTitle,
            text: copy.luxuryCollectionText,
            images: [],
          },
          settings: { layout: "editorial_collection", columns: 3, spacing: "spacious", container_width: "wide" },
        },
        {
          id: "luxury_provenance",
          type: "LuxuryProvenance",
          order: 4,
          editable: {
            title: copy.luxuryProvenanceTitle,
            text: copy.luxuryProvenanceText,
            items: copy.luxuryProofItems,
            images: [],
          },
          settings: { layout: "provenance_grid", spacing: "spacious", container_width: "wide" },
        },
        {
          id: "luxury_private_service",
          type: "LuxuryPrivateService",
          order: 5,
          editable: {
            title: copy.luxuryPrivateTitle,
            text: copy.luxuryPrivateText,
            primary_button: copy.requestPrivateViewing,
            images: [],
          },
          settings: { layout: "concierge_cta", spacing: "spacious", container_width: "wide" },
        },
      ],
    },
    {
      page_key: "catalog",
      title: copy.products,
      slug: copy.shopSlug,
      order: 2,
      sections: [
        {
          id: "luxury_catalog",
          type: "ProductGrid",
          order: 1,
          editable: { title: copy.luxuryCollectionTitle, text: copy.luxuryCollectionText, images: [] },
          settings: { layout: "luxury_high_ticket", columns: 3, spacing: "spacious", container_width: "wide" },
        },
      ],
    },
    {
      page_key: "about",
      title: copy.provenance,
      slug: copy.aboutSlug,
      order: 3,
      sections: [
        {
          id: "provenance",
          type: "LuxuryProvenance",
          order: 1,
          editable: { title: copy.luxuryProvenanceTitle, text: copy.luxuryProvenanceText, items: copy.luxuryProofItems, images: [] },
          settings: { layout: "provenance_grid", spacing: "spacious", container_width: "wide" },
        },
      ],
    },
    {
      page_key: "contact",
      title: copy.privateInquiry,
      slug: copy.contactSlug,
      order: 4,
      sections: [
        {
          id: "private_inquiry",
          type: "LuxuryContact",
          order: 1,
          editable: { title: copy.luxuryContactTitle, text: copy.luxuryContactText, primary_button: copy.requestPrivateViewing, images: [] },
          settings: { layout: "private_inquiry", spacing: "spacious", container_width: "wide" },
        },
      ],
    },
  ];
}

function buildFashionDropInstantPages(copy, name, description, payload = {}) {
  const heroImage = payload.assets?.find((asset) => asset.asset_type === "photo")?.url || "";
  return [
    {
      page_key: "home",
      title: copy.newDrop,
      slug: "/",
      order: 1,
      sections: [
        {
          id: "fashion_hero",
          type: "FashionHero",
          order: 1,
          editable: {
            headline: copy.fashionHeadline(name),
            subtitle: copy.fashionSubheadline(description),
            primary_button: copy.shopTheDrop,
            secondary_button: copy.viewLookbook,
            image_url: heroImage,
            images: [],
          },
          settings: { layout: "editorial_drop", spacing: "cinematic", container_width: "wide" },
        },
        {
          id: "fashion_collections",
          type: "FashionCollectionRail",
          order: 2,
          editable: { title: copy.collections, text: copy.collectionsText },
          settings: { layout: "collection_tiles", spacing: "balanced", container_width: "wide" },
        },
        {
          id: "fashion_drop_story",
          type: "FashionDropStory",
          order: 3,
          editable: { title: copy.dropStoryTitle, text: copy.dropStoryText, image_url: heroImage },
          settings: { layout: "split_editorial", spacing: "spacious", container_width: "wide" },
        },
        {
          id: "fashion_lookbook",
          type: "FashionLookbook",
          order: 4,
          editable: { title: copy.lookbook, text: copy.lookbookText },
          settings: { layout: "horizontal_lookbook", spacing: "balanced", container_width: "wide" },
        },
        {
          id: "fashion_products",
          type: "ProductGrid",
          order: 5,
          editable: { title: copy.newArrivals, text: copy.newArrivalsText, images: [] },
          settings: { layout: "fashion_drop_grid", columns: 3, spacing: "spacious", container_width: "wide" },
        },
        {
          id: "fashion_fit",
          type: "FashionFitGuide",
          order: 6,
          editable: { title: copy.fitGuideTitle, text: copy.fitGuideText, items: copy.fitGuideItems },
          settings: { layout: "fit_guide", spacing: "balanced", container_width: "wide" },
        },
      ],
    },
    {
      page_key: "catalog",
      title: copy.collections,
      slug: copy.shopSlug,
      order: 2,
      sections: [
        {
          id: "fashion_catalog",
          type: "ProductGrid",
          order: 1,
          editable: { title: copy.collections, text: copy.newArrivalsText, images: [] },
          settings: { layout: "fashion_drop_grid", columns: 3, spacing: "spacious", container_width: "wide" },
        },
      ],
    },
    {
      page_key: "about",
      title: copy.lookbook,
      slug: copy.aboutSlug,
      order: 3,
      sections: [{ id: "lookbook", type: "FashionLookbook", order: 1, editable: { title: copy.lookbook, text: copy.lookbookText }, settings: { layout: "horizontal_lookbook", container_width: "wide" } }],
    },
    {
      page_key: "contact",
      title: copy.contact,
      slug: copy.contactSlug,
      order: 4,
      sections: [{ id: "contact", type: "Contact", order: 1, editable: { title: copy.letsTalk, text: copy.contactText }, settings: { layout: "simple", container_width: "wide" } }],
    },
  ];
}

function buildCorporateCompanyInstantPages(copy, name, description, payload = {}) {
  const heroImage = payload.assets?.find((asset) => asset.asset_type === "photo")?.url || "";
  return [
    {
      page_key: "home",
      title: copy.company,
      slug: "/",
      order: 1,
      sections: [
        {
          id: "corporate_hero",
          type: "CorporateHero",
          order: 1,
          editable: {
            headline: copy.corporateHeadline(name),
            subtitle: copy.corporateSubheadline(description),
            primary_button: copy.requestConsultation,
            secondary_button: copy.viewServices,
            image_url: heroImage,
            images: [],
          },
          settings: { layout: "corporate_editorial" },
        },
        {
          id: "corporate_services",
          type: "CorporateServices",
          order: 2,
          editable: { title: copy.corporateServicesTitle, text: copy.corporateServicesText, images: [] },
          settings: { layout: "capabilities", columns: 3 },
        },
        {
          id: "corporate_process",
          type: "CorporateProcess",
          order: 3,
          editable: { title: copy.corporateProcessTitle, text: copy.corporateProcessText, items: copy.corporateProcessItems },
          settings: { layout: "numbered_steps" },
        },
        {
          id: "corporate_proof",
          type: "CorporateProof",
          order: 4,
          editable: { title: copy.corporateProofTitle, text: copy.corporateProofText, items: copy.corporateProofItems },
          settings: { layout: "proof_panel" },
        },
      ],
    },
    {
      page_key: "catalog",
      title: copy.services,
      slug: copy.servicesSlug,
      order: 2,
      sections: [
        {
          id: "services_grid",
          type: "ProductGrid",
          order: 1,
          editable: { title: copy.corporateServicesTitle, text: copy.corporateServicesText, images: [] },
          settings: { layout: "company_services", columns: 3 },
        },
      ],
    },
    {
      page_key: "about",
      title: copy.process,
      slug: copy.processSlug,
      order: 3,
      sections: [
        { id: "process", type: "CorporateProcess", order: 1, editable: { title: copy.corporateProcessTitle, text: copy.corporateProcessText, items: copy.corporateProcessItems }, settings: { layout: "numbered_steps" } },
        { id: "proof", type: "CorporateProof", order: 2, editable: { title: copy.corporateProofTitle, text: copy.corporateProofText, items: copy.corporateProofItems }, settings: { layout: "proof_panel" } },
      ],
    },
    {
      page_key: "contact",
      title: copy.contact,
      slug: copy.contactSlug,
      order: 4,
      sections: [{ id: "contact", type: "Contact", order: 1, editable: { title: copy.letsTalk, text: copy.corporateContactText }, settings: { layout: "simple" } }],
    },
  ];
}

function buildRestaurantMenuInstantPages(copy, name, description, payload = {}) {
  const heroImage = payload.assets?.find((asset) => asset.asset_type === "photo")?.url || "";
  return [
    {
      page_key: "home",
      title: copy.menu,
      slug: "/",
      order: 1,
      sections: [
        {
          id: "restaurant_hero",
          type: "RestaurantHero",
          order: 1,
          editable: {
            headline: copy.restaurantHeadline(name),
            subtitle: copy.restaurantSubheadline(description),
            primary_button: copy.orderNow,
            secondary_button: copy.viewMenu,
            image_url: heroImage,
            images: [],
          },
          settings: { layout: "restaurant_menu_story", spacing: "cinematic", container_width: "wide" },
        },
        {
          id: "restaurant_categories",
          type: "RestaurantCategoryRail",
          order: 2,
          editable: { title: copy.restaurantCategoriesTitle, text: copy.restaurantCategoriesText, items: copy.restaurantCategories },
          settings: { layout: "menu_category_rail", spacing: "balanced", container_width: "wide" },
        },
        {
          id: "restaurant_signature",
          type: "RestaurantSignatureMenu",
          order: 3,
          editable: { title: copy.restaurantSignatureTitle, text: copy.restaurantSignatureText, images: [] },
          settings: { layout: "signature_menu", columns: 3, spacing: "spacious", container_width: "wide" },
        },
        {
          id: "restaurant_specials",
          type: "RestaurantSpecials",
          order: 4,
          editable: { title: copy.restaurantSpecialsTitle, text: copy.restaurantSpecialsText, items: copy.restaurantSpecialItems },
          settings: { layout: "specials_strip", spacing: "balanced", container_width: "wide" },
        },
        {
          id: "restaurant_info",
          type: "RestaurantInfo",
          order: 5,
          editable: { title: copy.restaurantInfoTitle, text: copy.restaurantInfoText, items: copy.restaurantInfoItems },
          settings: { layout: "hours_location", spacing: "balanced", container_width: "wide" },
        },
        {
          id: "restaurant_order",
          type: "RestaurantOrderPanel",
          order: 6,
          editable: { title: copy.restaurantOrderTitle, text: copy.restaurantOrderText },
          settings: { layout: "order_panel", spacing: "balanced", container_width: "wide" },
        },
      ],
    },
    {
      page_key: "catalog",
      title: copy.specials,
      slug: copy.menuSlug,
      order: 2,
      sections: [
        {
          id: "restaurant_menu_catalog",
          type: "ProductGrid",
          order: 1,
          editable: { title: copy.restaurantSignatureTitle, text: copy.restaurantSignatureText, images: [] },
          settings: { layout: "restaurant_menu", columns: 3, spacing: "spacious", container_width: "wide" },
        },
      ],
    },
    {
      page_key: "about",
      title: copy.hoursLocation,
      slug: copy.hoursSlug,
      order: 3,
      sections: [
        { id: "restaurant_info_page", type: "RestaurantInfo", order: 1, editable: { title: copy.restaurantInfoTitle, text: copy.restaurantInfoText, items: copy.restaurantInfoItems }, settings: { layout: "hours_location", container_width: "wide" } },
        { id: "restaurant_specials_page", type: "RestaurantSpecials", order: 2, editable: { title: copy.restaurantSpecialsTitle, text: copy.restaurantSpecialsText, items: copy.restaurantSpecialItems }, settings: { layout: "specials_strip", container_width: "wide" } },
      ],
    },
    {
      page_key: "contact",
      title: copy.orderNow,
      slug: copy.contactSlug,
      order: 4,
      sections: [{ id: "restaurant_order_page", type: "RestaurantOrderPanel", order: 1, editable: { title: copy.restaurantOrderTitle, text: copy.restaurantOrderText }, settings: { layout: "order_panel", container_width: "wide" } }],
    },
  ];
}

function buildEducationAcademyInstantPages(copy, name, description, payload = {}) {
  const heroImage = payload.assets?.find((asset) => asset.asset_type === "photo")?.url || "";
  return [
    {
      page_key: "home",
      title: copy.academy,
      slug: "/",
      order: 1,
      sections: [
        {
          id: "academy_hero",
          type: "AcademyHero",
          order: 1,
          editable: {
            headline: copy.educationHeadline(name),
            subtitle: copy.educationSubheadline(description),
            primary_button: copy.enrollNow,
            secondary_button: copy.viewCurriculum,
            image_url: heroImage,
            badge: copy.courseAcademy,
            images: [],
          },
          settings: { layout: "academy_platform", spacing: "spacious", container_width: "wide" },
        },
        {
          id: "academy_path",
          type: "AcademyLearningPath",
          order: 2,
          editable: {
            title: copy.learningPathTitle,
            text: copy.learningPathText,
            items: copy.learningPathItems,
            images: [],
          },
          settings: { layout: "module_roadmap", spacing: "balanced", container_width: "wide" },
        },
        {
          id: "academy_programs",
          type: "AcademyPrograms",
          order: 3,
          editable: {
            title: copy.programsTitle,
            text: copy.programsText,
            images: [],
          },
          settings: { layout: "program_cards", columns: 3, spacing: "balanced", container_width: "wide" },
        },
        {
          id: "academy_outcomes",
          type: "AcademyOutcomes",
          order: 4,
          editable: {
            title: copy.outcomesTitle,
            text: copy.outcomesText,
            items: copy.learningOutcomeItems,
            images: [],
          },
          settings: { layout: "outcome_grid", spacing: "balanced", container_width: "wide" },
        },
        {
          id: "academy_instructor",
          type: "AcademyInstructor",
          order: 5,
          editable: {
            title: copy.instructorTitle,
            text: copy.instructorText,
            items: copy.instructorTrustItems,
            image_url: heroImage,
            images: [],
          },
          settings: { layout: "instructor_trust", spacing: "spacious", container_width: "wide" },
        },
        {
          id: "academy_enroll",
          type: "AcademyEnroll",
          order: 6,
          editable: {
            title: copy.enrollmentTitle,
            text: copy.enrollmentText,
            primary_button: copy.enrollNow,
            images: [],
          },
          settings: { layout: "enrollment_cta", spacing: "spacious", container_width: "wide" },
        },
      ],
    },
    {
      page_key: "programs",
      title: copy.programs,
      slug: copy.programsSlug,
      order: 2,
      sections: [
        {
          id: "program_catalog",
          type: "ProductGrid",
          order: 1,
          editable: { title: copy.programsTitle, text: copy.programsText, images: [] },
          settings: { layout: "education_course", columns: 3, spacing: "balanced", container_width: "wide" },
        },
      ],
    },
    {
      page_key: "curriculum",
      title: copy.curriculum,
      slug: copy.curriculumSlug,
      order: 3,
      sections: [
        {
          id: "curriculum_path",
          type: "AcademyLearningPath",
          order: 1,
          editable: { title: copy.learningPathTitle, text: copy.learningPathText, items: copy.learningPathItems, images: [] },
          settings: { layout: "module_roadmap", spacing: "spacious", container_width: "wide" },
        },
      ],
    },
    {
      page_key: "enroll",
      title: copy.enroll,
      slug: copy.enrollSlug,
      order: 4,
      sections: [
        {
          id: "enroll_contact",
          type: "AcademyEnroll",
          order: 1,
          editable: { title: copy.enrollmentTitle, text: copy.enrollmentText, primary_button: copy.enrollNow, images: [] },
          settings: { layout: "enrollment_cta", spacing: "spacious", container_width: "wide" },
        },
      ],
    },
  ];
}

function buildMedicalWellnessInstantPages(copy, name, description, payload = {}) {
  const heroImage = payload.assets?.find((asset) => asset.asset_type === "photo")?.url || "";
  return [
    {
      page_key: "home",
      title: copy.treatments,
      slug: "/",
      order: 1,
      sections: [
        {
          id: "clinic_hero",
          type: "ClinicHero",
          order: 1,
          editable: {
            headline: copy.clinicHeadline(name),
            subtitle: copy.clinicSubheadline(description),
            primary_button: copy.bookConsultation,
            secondary_button: copy.viewTreatments,
            image_url: heroImage,
            badge: copy.clinicCare,
            images: [],
          },
          settings: { layout: "clinic_care_stage", spacing: "spacious", container_width: "wide" },
        },
        {
          id: "clinic_services",
          type: "ClinicServices",
          order: 2,
          editable: { title: copy.treatmentsTitle, text: copy.treatmentsText, images: [] },
          settings: { layout: "treatment_cards", columns: 3, spacing: "balanced", container_width: "wide" },
        },
        {
          id: "clinic_path",
          type: "ClinicTreatmentPath",
          order: 3,
          editable: { title: copy.carePathTitle, text: copy.carePathText, items: copy.carePathItems, images: [] },
          settings: { layout: "care_path", spacing: "balanced", container_width: "wide" },
        },
        {
          id: "clinic_trust",
          type: "ClinicTrust",
          order: 4,
          editable: { title: copy.clinicTrustTitle, text: copy.clinicTrustText, items: copy.clinicTrustItems, images: [] },
          settings: { layout: "trust_credentials", spacing: "balanced", container_width: "wide" },
        },
        {
          id: "clinic_results",
          type: "ClinicResults",
          order: 5,
          editable: { title: copy.resultsTitle, text: copy.resultsText, items: copy.resultItems, images: [] },
          settings: { layout: "results_proof", spacing: "balanced", container_width: "wide" },
        },
        {
          id: "clinic_team",
          type: "ClinicTeam",
          order: 6,
          editable: { title: copy.clinicTeamTitle, text: copy.clinicTeamText, items: copy.clinicTeamItems, image_url: heroImage, images: [] },
          settings: { layout: "specialist_team", spacing: "spacious", container_width: "wide" },
        },
        {
          id: "clinic_booking",
          type: "ClinicBooking",
          order: 7,
          editable: { title: copy.clinicBookingTitle, text: copy.clinicBookingText, primary_button: copy.bookConsultation, images: [] },
          settings: { layout: "booking_cta", spacing: "spacious", container_width: "wide" },
        },
      ],
    },
    {
      page_key: "catalog",
      title: copy.services,
      slug: copy.servicesSlug,
      order: 2,
      sections: [
        {
          id: "clinic_catalog",
          type: "ProductGrid",
          order: 1,
          editable: { title: copy.treatmentsTitle, text: copy.treatmentsText, images: [] },
          settings: { layout: "medical_wellness", columns: 3, spacing: "balanced", container_width: "wide" },
        },
      ],
    },
    {
      page_key: "about",
      title: copy.results,
      slug: copy.resultsSlug,
      order: 3,
      sections: [
        { id: "results", type: "ClinicResults", order: 1, editable: { title: copy.resultsTitle, text: copy.resultsText, items: copy.resultItems, images: [] }, settings: { layout: "results_proof", container_width: "wide" } },
        { id: "team", type: "ClinicTeam", order: 2, editable: { title: copy.clinicTeamTitle, text: copy.clinicTeamText, items: copy.clinicTeamItems, image_url: heroImage, images: [] }, settings: { layout: "specialist_team", container_width: "wide" } },
      ],
    },
    {
      page_key: "contact",
      title: copy.bookConsultation,
      slug: copy.contactSlug,
      order: 4,
      sections: [
        { id: "booking", type: "ClinicBooking", order: 1, editable: { title: copy.clinicBookingTitle, text: copy.clinicBookingText, primary_button: copy.bookConsultation, images: [] }, settings: { layout: "booking_cta", container_width: "wide" } },
      ],
    },
  ];
}

function buildLegalProfessionalInstantPages(copy, name, description, payload = {}) {
  const heroImage = payload.assets?.find((asset) => asset.asset_type === "photo")?.url || "";
  return [
    {
      page_key: "home",
      title: copy.services,
      slug: "/",
      order: 1,
      sections: [
        {
          id: "professional_hero",
          type: "ProfessionalHero",
          order: 1,
          editable: {
            headline: copy.professionalHeadline(name),
            subtitle: copy.professionalSubheadline(description),
            primary_button: copy.scheduleConsultation,
            secondary_button: copy.viewServices,
            image_url: heroImage,
            badge: copy.professionalFirm,
            images: [],
          },
          settings: { layout: "professional_authority", spacing: "spacious", container_width: "wide" },
        },
        {
          id: "professional_services",
          type: "ProfessionalPracticeAreas",
          order: 2,
          editable: { title: copy.practiceAreasTitle, text: copy.practiceAreasText, images: [] },
          settings: { layout: "practice_area_cards", columns: 3, spacing: "balanced", container_width: "wide" },
        },
        {
          id: "professional_process",
          type: "ProfessionalProcess",
          order: 3,
          editable: { title: copy.professionalProcessTitle, text: copy.professionalProcessText, items: copy.professionalProcessItems, images: [] },
          settings: { layout: "advisory_process", spacing: "balanced", container_width: "wide" },
        },
        {
          id: "professional_proof",
          type: "ProfessionalProof",
          order: 4,
          editable: { title: copy.professionalProofTitle, text: copy.professionalProofText, items: copy.professionalProofItems, images: [] },
          settings: { layout: "trust_proof", spacing: "balanced", container_width: "wide" },
        },
        {
          id: "professional_team",
          type: "ProfessionalTeam",
          order: 5,
          editable: { title: copy.professionalTeamTitle, text: copy.professionalTeamText, items: copy.professionalTeamItems, image_url: heroImage, images: [] },
          settings: { layout: "advisor_team", spacing: "spacious", container_width: "wide" },
        },
        {
          id: "professional_faq",
          type: "ProfessionalFAQ",
          order: 6,
          editable: { title: copy.professionalFaqTitle, items: copy.professionalFaqItems, images: [] },
          settings: { layout: "firm_faq", spacing: "balanced", container_width: "wide" },
        },
        {
          id: "professional_consultation",
          type: "ProfessionalConsultation",
          order: 7,
          editable: { title: copy.professionalConsultationTitle, text: copy.professionalConsultationText, primary_button: copy.scheduleConsultation, images: [] },
          settings: { layout: "consultation_cta", spacing: "spacious", container_width: "wide" },
        },
      ],
    },
    {
      page_key: "catalog",
      title: copy.services,
      slug: copy.servicesSlug,
      order: 2,
      sections: [
        {
          id: "professional_catalog",
          type: "ProductGrid",
          order: 1,
          editable: { title: copy.practiceAreasTitle, text: copy.practiceAreasText, images: [] },
          settings: { layout: "legal_professional", columns: 3, spacing: "balanced", container_width: "wide" },
        },
      ],
    },
    {
      page_key: "about",
      title: copy.process,
      slug: copy.processSlug,
      order: 3,
      sections: [
        { id: "process", type: "ProfessionalProcess", order: 1, editable: { title: copy.professionalProcessTitle, text: copy.professionalProcessText, items: copy.professionalProcessItems, images: [] }, settings: { layout: "advisory_process", container_width: "wide" } },
        { id: "proof", type: "ProfessionalProof", order: 2, editable: { title: copy.professionalProofTitle, text: copy.professionalProofText, items: copy.professionalProofItems, images: [] }, settings: { layout: "trust_proof", container_width: "wide" } },
      ],
    },
    {
      page_key: "contact",
      title: copy.scheduleConsultation,
      slug: copy.contactSlug,
      order: 4,
      sections: [
        { id: "consultation", type: "ProfessionalConsultation", order: 1, editable: { title: copy.professionalConsultationTitle, text: copy.professionalConsultationText, primary_button: copy.scheduleConsultation, images: [] }, settings: { layout: "consultation_cta", container_width: "wide" } },
      ],
    },
  ];
}

function buildB2BEnterpriseInstantPages(copy, name, description, payload = {}) {
  const heroImage = payload.assets?.find((asset) => asset.asset_type === "photo")?.url || "";
  return [
    {
      page_key: "home",
      title: copy.solutions,
      slug: "/",
      order: 1,
      sections: [
        { id: "enterprise_hero", type: "EnterpriseHero", order: 1, editable: { headline: copy.enterpriseHeadline(name), subtitle: copy.enterpriseSubheadline(description), primary_button: copy.requestDemo, secondary_button: copy.viewSolutions, image_url: heroImage, badge: copy.enterprisePlatform, images: [] }, settings: { layout: "enterprise_dashboard", spacing: "spacious", container_width: "wide" } },
        { id: "enterprise_solutions", type: "EnterpriseSolutions", order: 2, editable: { title: copy.enterpriseSolutionsTitle, text: copy.enterpriseSolutionsText, images: [] }, settings: { layout: "solution_cards", columns: 3, spacing: "balanced", container_width: "wide" } },
        { id: "enterprise_use_cases", type: "EnterpriseUseCases", order: 3, editable: { title: copy.enterpriseUseCasesTitle, text: copy.enterpriseUseCasesText, items: copy.enterpriseUseCaseItems, images: [] }, settings: { layout: "use_case_matrix", spacing: "balanced", container_width: "wide" } },
        { id: "enterprise_integrations", type: "EnterpriseIntegrations", order: 4, editable: { title: copy.enterpriseIntegrationsTitle, text: copy.enterpriseIntegrationsText, items: copy.enterpriseIntegrationItems, images: [] }, settings: { layout: "integration_map", spacing: "balanced", container_width: "wide" } },
        { id: "enterprise_proof", type: "EnterpriseProof", order: 5, editable: { title: copy.enterpriseProofTitle, text: copy.enterpriseProofText, items: copy.enterpriseProofItems, images: [] }, settings: { layout: "roi_proof", spacing: "balanced", container_width: "wide" } },
        { id: "enterprise_pricing", type: "EnterprisePricing", order: 6, editable: { title: copy.enterprisePricingTitle, text: copy.enterprisePricingText, images: [] }, settings: { layout: "pricing_packages", spacing: "balanced", container_width: "wide" } },
        { id: "enterprise_demo", type: "EnterpriseDemo", order: 7, editable: { title: copy.enterpriseDemoTitle, text: copy.enterpriseDemoText, primary_button: copy.requestDemo, images: [] }, settings: { layout: "demo_cta", spacing: "spacious", container_width: "wide" } },
      ],
    },
    { page_key: "catalog", title: copy.solutions, slug: copy.solutionsSlug, order: 2, sections: [{ id: "enterprise_catalog", type: "ProductGrid", order: 1, editable: { title: copy.enterpriseSolutionsTitle, text: copy.enterpriseSolutionsText, images: [] }, settings: { layout: "b2b_solution", columns: 3, spacing: "balanced", container_width: "wide" } }] },
    { page_key: "about", title: copy.useCases, slug: copy.useCasesSlug, order: 3, sections: [
      { id: "use_cases", type: "EnterpriseUseCases", order: 1, editable: { title: copy.enterpriseUseCasesTitle, text: copy.enterpriseUseCasesText, items: copy.enterpriseUseCaseItems, images: [] }, settings: { layout: "use_case_matrix", container_width: "wide" } },
      { id: "integrations", type: "EnterpriseIntegrations", order: 2, editable: { title: copy.enterpriseIntegrationsTitle, text: copy.enterpriseIntegrationsText, items: copy.enterpriseIntegrationItems, images: [] }, settings: { layout: "integration_map", container_width: "wide" } },
    ] },
    { page_key: "contact", title: copy.requestDemo, slug: copy.contactSlug, order: 4, sections: [{ id: "demo", type: "EnterpriseDemo", order: 1, editable: { title: copy.enterpriseDemoTitle, text: copy.enterpriseDemoText, primary_button: copy.requestDemo, images: [] }, settings: { layout: "demo_cta", container_width: "wide" } }] },
  ];
}

function buildManufacturingIndustrialInstantPages(copy, name, description, payload = {}) {
  const heroImage = payload.assets?.find((asset) => asset.asset_type === "photo")?.url || "";
  return [
    {
      page_key: "home",
      title: copy.industrialSupplier,
      slug: "/",
      order: 1,
      sections: [
        { id: "industrial_hero", type: "IndustrialHero", order: 1, editable: { headline: copy.industrialHeadline(name), subtitle: copy.industrialSubheadline(description), primary_button: copy.requestQuote, secondary_button: copy.viewSpecs, image_url: heroImage, badge: copy.industrialSupplier, images: [] }, settings: { layout: "industrial_rfq_dashboard", spacing: "spacious", container_width: "wide" } },
        { id: "industrial_catalog", type: "IndustrialSpecCatalog", order: 2, editable: { title: copy.industrialCatalogTitle, text: copy.industrialCatalogText, images: [] }, settings: { layout: "spec_cards", columns: 3, spacing: "compact", container_width: "wide" } },
        { id: "industrial_capabilities", type: "IndustrialCapabilities", order: 3, editable: { title: copy.industrialCapabilitiesTitle, text: copy.industrialCapabilitiesText, items: copy.industrialCapabilityItems, images: [] }, settings: { layout: "capability_matrix", spacing: "balanced", container_width: "wide" } },
        { id: "industrial_certifications", type: "IndustrialCertifications", order: 4, editable: { title: copy.industrialCertificationsTitle, text: copy.industrialCertificationsText, items: copy.industrialCertificationItems, images: [] }, settings: { layout: "certification_grid", spacing: "balanced", container_width: "wide" } },
        { id: "industrial_supply", type: "IndustrialSupplyChain", order: 5, editable: { title: copy.industrialSupplyTitle, text: copy.industrialSupplyText, items: copy.industrialSupplyItems, images: [] }, settings: { layout: "supply_timeline", spacing: "balanced", container_width: "wide" } },
        { id: "industrial_quote", type: "IndustrialQuotePanel", order: 6, editable: { title: copy.industrialQuoteTitle, text: copy.industrialQuoteText, primary_button: copy.requestQuote, images: [] }, settings: { layout: "rfq_panel", spacing: "spacious", container_width: "wide" } },
      ],
    },
    { page_key: "catalog", title: copy.products, slug: copy.shopSlug, order: 2, sections: [{ id: "industrial_products", type: "ProductGrid", order: 1, editable: { title: copy.industrialCatalogTitle, text: copy.industrialCatalogText, images: [] }, settings: { layout: "industrial_specs", columns: 3, spacing: "compact", container_width: "wide" } }] },
    { page_key: "about", title: copy.capabilities, slug: "/capabilities", order: 3, sections: [
      { id: "capabilities", type: "IndustrialCapabilities", order: 1, editable: { title: copy.industrialCapabilitiesTitle, text: copy.industrialCapabilitiesText, items: copy.industrialCapabilityItems, images: [] }, settings: { layout: "capability_matrix", container_width: "wide" } },
      { id: "certifications", type: "IndustrialCertifications", order: 2, editable: { title: copy.industrialCertificationsTitle, text: copy.industrialCertificationsText, items: copy.industrialCertificationItems, images: [] }, settings: { layout: "certification_grid", container_width: "wide" } },
      { id: "supply", type: "IndustrialSupplyChain", order: 3, editable: { title: copy.industrialSupplyTitle, text: copy.industrialSupplyText, items: copy.industrialSupplyItems, images: [] }, settings: { layout: "supply_timeline", container_width: "wide" } },
    ] },
    { page_key: "contact", title: copy.requestQuote, slug: copy.contactSlug, order: 4, sections: [{ id: "quote", type: "IndustrialQuotePanel", order: 1, editable: { title: copy.industrialQuoteTitle, text: copy.industrialQuoteText, primary_button: copy.requestQuote, images: [] }, settings: { layout: "rfq_panel", container_width: "wide" } }] },
  ];
}

function buildDigitalProductsInstantPages(copy, name, description, payload = {}) {
  const heroImage = payload.assets?.find((asset) => asset.asset_type === "photo")?.url || "";
  return [
    {
      page_key: "home",
      title: copy.offer,
      slug: "/",
      order: 1,
      sections: [
        {
          id: "digital_hero",
          type: "DigitalHero",
          order: 1,
          editable: {
            headline: copy.digitalHeadline(name),
            subtitle: copy.digitalSubheadline(description),
            primary_button: copy.getAccess,
            secondary_button: copy.viewProducts,
            image_url: heroImage,
            images: [],
          },
          settings: { layout: "digital_product_launch", spacing: "cinematic", container_width: "wide" },
        },
        {
          id: "digital_bundle",
          type: "DigitalBundle",
          order: 2,
          editable: { title: copy.digitalBundleTitle, text: copy.digitalBundleText, images: [] },
          settings: { layout: "bundle_cards", columns: 3, spacing: "spacious", container_width: "wide" },
        },
        {
          id: "digital_modules",
          type: "DigitalModules",
          order: 3,
          editable: { title: copy.digitalModulesTitle, text: copy.digitalModulesText, items: copy.digitalModuleItems },
          settings: { layout: "module_grid", spacing: "balanced", container_width: "wide" },
        },
        {
          id: "digital_proof",
          type: "DigitalProof",
          order: 4,
          editable: { title: copy.digitalProofTitle, text: copy.digitalProofText, items: copy.digitalProofItems },
          settings: { layout: "proof_panel", spacing: "balanced", container_width: "wide" },
        },
        {
          id: "digital_access",
          type: "DigitalAccessPanel",
          order: 5,
          editable: { title: copy.digitalAccessTitle, text: copy.digitalAccessText },
          settings: { layout: "access_panel", spacing: "balanced", container_width: "wide" },
        },
      ],
    },
    {
      page_key: "catalog",
      title: copy.products,
      slug: copy.shopSlug,
      order: 2,
      sections: [
        {
          id: "digital_catalog",
          type: "ProductGrid",
          order: 1,
          editable: { title: copy.digitalBundleTitle, text: copy.digitalBundleText, images: [] },
          settings: { layout: "digital_offer_cards", columns: 3, spacing: "spacious", container_width: "wide" },
        },
      ],
    },
    {
      page_key: "about",
      title: copy.modules,
      slug: copy.modulesSlug,
      order: 3,
      sections: [
        { id: "digital_modules_page", type: "DigitalModules", order: 1, editable: { title: copy.digitalModulesTitle, text: copy.digitalModulesText, items: copy.digitalModuleItems }, settings: { layout: "module_grid", container_width: "wide" } },
        { id: "digital_proof_page", type: "DigitalProof", order: 2, editable: { title: copy.digitalProofTitle, text: copy.digitalProofText, items: copy.digitalProofItems }, settings: { layout: "proof_panel", container_width: "wide" } },
      ],
    },
    {
      page_key: "contact",
      title: copy.getAccess,
      slug: copy.contactSlug,
      order: 4,
      sections: [{ id: "digital_access_page", type: "DigitalAccessPanel", order: 1, editable: { title: copy.digitalAccessTitle, text: copy.digitalAccessText }, settings: { layout: "access_panel", container_width: "wide" } }],
    },
  ];
}

function buildRealEstateListingsInstantPages(copy, name, description, payload = {}) {
  const heroImage = payload.assets?.find((asset) => asset.asset_type === "photo")?.url || "";
  return [
    {
      page_key: "home",
      title: copy.search,
      slug: "/",
      order: 1,
      sections: [
        {
          id: "listing_hero",
          type: "ListingHero",
          order: 1,
          editable: {
            headline: copy.listingHeadline(name),
            subtitle: description || copy.listingSubheadline(),
            primary_button: copy.searchListings,
            secondary_button: copy.viewListings,
            search_placeholder: copy.listingSearchPlaceholder,
            image_url: heroImage,
            images: [],
          },
          settings: { layout: "search_map", spacing: "compact", container_width: "wide" },
        },
        {
          id: "listing_filters",
          type: "ListingFilters",
          order: 2,
          editable: { title: copy.listingFiltersTitle, text: copy.listingFiltersText, items: copy.listingCategories },
          settings: { layout: "filter_bar", spacing: "compact", container_width: "wide" },
        },
        {
          id: "featured_listings",
          type: "ListingFeatured",
          order: 3,
          editable: { title: copy.featuredListingsTitle, text: copy.featuredListingsText, images: [] },
          settings: { layout: "listing_cards", columns: 3, spacing: "balanced", container_width: "wide" },
        },
        {
          id: "area_map",
          type: "ListingAreaPanel",
          order: 4,
          editable: { title: copy.listingAreaTitle, text: copy.listingAreaText, items: copy.listingLocations },
          settings: { layout: "map_panel", spacing: "balanced", container_width: "wide" },
        },
        {
          id: "listing_trust",
          type: "ListingTrust",
          order: 5,
          editable: { title: copy.listingTrustTitle, text: copy.listingTrustText, items: copy.listingTrustItems },
          settings: { layout: "trust_row", spacing: "compact", container_width: "wide" },
        },
        {
          id: "listing_contact",
          type: "ListingContact",
          order: 6,
          editable: { title: copy.listingContactTitle, text: copy.listingContactText, images: [] },
          settings: { layout: "inquiry_panel", spacing: "balanced", container_width: "wide" },
        },
      ],
    },
    {
      page_key: "catalog",
      title: copy.listings,
      slug: copy.listingsSlug,
      order: 2,
      sections: [
        {
          id: "listings_catalog",
          type: "ProductGrid",
          order: 1,
          editable: { title: copy.featuredListingsTitle, text: copy.featuredListingsText, images: [] },
          settings: { layout: "listing_catalog", columns: 3, spacing: "compact", container_width: "wide", card_density: "comfortable", card_gap: "comfortable" },
        },
      ],
    },
    {
      page_key: "about",
      title: copy.areas,
      slug: copy.areasSlug,
      order: 3,
      sections: [
        { id: "areas", type: "ListingAreaPanel", order: 1, editable: { title: copy.listingAreaTitle, text: copy.listingAreaText, items: copy.listingLocations }, settings: { layout: "map_panel", container_width: "wide" } },
        { id: "trust", type: "ListingTrust", order: 2, editable: { title: copy.listingTrustTitle, text: copy.listingTrustText, items: copy.listingTrustItems }, settings: { layout: "trust_row", container_width: "wide" } },
      ],
    },
    {
      page_key: "contact",
      title: copy.inquireNow,
      slug: copy.contactSlug,
      order: 4,
      sections: [{ id: "contact", type: "ListingContact", order: 1, editable: { title: copy.listingContactTitle, text: copy.listingContactText }, settings: { layout: "inquiry_panel", container_width: "wide" } }],
    },
  ];
}

function normalizeHomeServiceInstantCopy(input = {}, language = builderState.selectedLanguage) {
  const base = instantLocaleCopy(language);
  const source = input && typeof input === "object" ? input : {};
  const merged = { ...base, ...source };
  const textValue = (key) => {
    const value = merged[key];
    return typeof value === "string" && value.trim() ? value : base[key] || "";
  };
  const listValue = (key) => {
    const values = arrayValue(merged[key]).filter(Boolean);
    return values.length ? values : arrayValue(base[key]);
  };
  return {
    ...merged,
    services: textValue("services") || base.services || "Services",
    servicesSlug: textValue("servicesSlug") || "/services",
    serviceAreas: textValue("serviceAreas") || base.serviceAreas || "Service areas",
    workProof: textValue("workProof") || base.workProof || "Work proof",
    workSlug: textValue("workSlug") || "/work",
    contactSlug: textValue("contactSlug") || "/contact",
    freeQuote: textValue("freeQuote") || textValue("request") || "Request quote",
    callNow: textValue("callNow") || "Call now",
    askPrice: textValue("askPrice") || "Ask for price",
    homeServiceHeadline: typeof merged.homeServiceHeadline === "function"
      ? merged.homeServiceHeadline
      : typeof base.homeServiceHeadline === "function"
        ? base.homeServiceHeadline
        : (businessName) => `${businessName} handles the job right the first time`,
    homeServiceSubheadline: typeof merged.homeServiceSubheadline === "function"
      ? merged.homeServiceSubheadline
      : typeof base.homeServiceSubheadline === "function"
        ? base.homeServiceSubheadline
        : (value) => value || "Trusted service with clear communication, proof, and an easy quote path.",
    homeServiceCategoriesTitle: textValue("homeServiceCategoriesTitle"),
    homeServiceCategoriesText: textValue("homeServiceCategoriesText"),
    homeServiceAreasTitle: textValue("homeServiceAreasTitle"),
    homeServiceAreasText: textValue("homeServiceAreasText"),
    serviceAreaItems: listValue("serviceAreaItems"),
    beforeAfterTitle: textValue("beforeAfterTitle"),
    beforeAfterText: textValue("beforeAfterText"),
    homeServiceTrustTitle: textValue("homeServiceTrustTitle"),
    homeServiceTrustText: textValue("homeServiceTrustText"),
    homeServiceTrustItems: listValue("homeServiceTrustItems"),
    homeServiceQuoteTitle: textValue("homeServiceQuoteTitle"),
    homeServiceQuoteText: textValue("homeServiceQuoteText"),
  };
}

function buildHomeServicesPremiumInstantPages(copy, name, description, payload = {}) {
  copy = normalizeHomeServiceInstantCopy(copy, payload.selectedLanguage || builderState.selectedLanguage || "en");
  const heroImage = payload.assets?.find((asset) => asset.asset_type === "photo")?.url || "";
  const homeHeadline = typeof copy.homeServiceHeadline === "function"
    ? copy.homeServiceHeadline(name)
    : String(copy.homeServiceHeadline || `${name} handles the job right the first time`);
  const homeSubheadline = typeof copy.homeServiceSubheadline === "function"
    ? copy.homeServiceSubheadline(description)
    : String(copy.homeServiceSubheadline || description || "Trusted local service with clear communication, proof, and an easy quote path.");
  return [
    {
      page_key: "home",
      title: copy.services,
      slug: "/",
      order: 1,
      sections: [
        {
          id: "home_service_hero",
          type: "HomeServiceHero",
          order: 1,
          editable: {
            headline: homeHeadline,
            subtitle: homeSubheadline,
            primary_button: copy.freeQuote,
            secondary_button: copy.callNow,
            image_url: heroImage,
            images: [],
          },
          settings: { layout: "phone_first_quote" },
        },
        {
          id: "home_service_categories",
          type: "HomeServiceCategories",
          order: 2,
          editable: { title: copy.homeServiceCategoriesTitle, text: copy.homeServiceCategoriesText, images: [] },
          settings: { layout: "service_tiles", columns: 3 },
        },
        {
          id: "home_service_areas",
          type: "HomeServiceAreas",
          order: 3,
          editable: { title: copy.homeServiceAreasTitle, text: copy.homeServiceAreasText, items: copy.serviceAreaItems, images: [] },
          settings: { layout: "area_map_panel" },
        },
        {
          id: "home_service_gallery",
          type: "HomeServiceGallery",
          order: 4,
          editable: { title: copy.beforeAfterTitle, text: copy.beforeAfterText, images: [] },
          settings: { layout: "before_after" },
        },
        {
          id: "home_service_trust",
          type: "HomeServiceTrust",
          order: 5,
          editable: { title: copy.homeServiceTrustTitle, text: copy.homeServiceTrustText, items: copy.homeServiceTrustItems, images: [] },
          settings: { layout: "review_panel" },
        },
        {
          id: "home_service_quote",
          type: "HomeServiceQuote",
          order: 6,
          editable: { title: copy.homeServiceQuoteTitle, text: copy.homeServiceQuoteText, images: [] },
          settings: { layout: "quote_panel" },
        },
      ],
    },
    {
      page_key: "catalog",
      title: copy.serviceAreas,
      slug: copy.servicesSlug,
      order: 2,
      sections: [
        { id: "services_grid", type: "ProductGrid", order: 1, editable: { title: copy.homeServiceCategoriesTitle, text: copy.homeServiceCategoriesText, images: [] }, settings: { layout: "home_services_quote", columns: 3 } },
        { id: "areas", type: "HomeServiceAreas", order: 2, editable: { title: copy.homeServiceAreasTitle, text: copy.homeServiceAreasText, items: copy.serviceAreaItems, images: [] }, settings: { layout: "area_map_panel" } },
      ],
    },
    {
      page_key: "about",
      title: copy.workProof,
      slug: copy.workSlug,
      order: 3,
      sections: [
        { id: "work", type: "HomeServiceGallery", order: 1, editable: { title: copy.beforeAfterTitle, text: copy.beforeAfterText, images: [] }, settings: { layout: "before_after" } },
        { id: "trust", type: "HomeServiceTrust", order: 2, editable: { title: copy.homeServiceTrustTitle, text: copy.homeServiceTrustText, items: copy.homeServiceTrustItems, images: [] }, settings: { layout: "review_panel" } },
      ],
    },
    {
      page_key: "contact",
      title: copy.freeQuote,
      slug: copy.contactSlug,
      order: 4,
      sections: [{ id: "quote", type: "HomeServiceQuote", order: 1, editable: { title: copy.homeServiceQuoteTitle, text: copy.homeServiceQuoteText, images: [] }, settings: { layout: "quote_panel" } }],
    },
  ];
}

function buildBookingAppointmentInstantPages(copy, name, description, payload = {}) {
  copy = normalizeBookingInstantCopy(copy, payload.selectedLanguage || builderState.selectedLanguage || "en");
  const heroImage = payload.assets?.find((asset) => asset.asset_type === "photo")?.url || "";
  return [
    {
      page_key: "home",
      title: copy.bookNow,
      slug: "/",
      order: 1,
      sections: [
        {
          id: "booking_hero",
          type: "BookingHero",
          order: 1,
          editable: {
            headline: copy.bookingHeadline(name),
            subtitle: copy.bookingSubheadline(description),
            primary_button: copy.bookNow,
            secondary_button: copy.viewServices,
            image_url: heroImage,
            images: [],
          },
          settings: { layout: "appointment_stage" },
        },
        {
          id: "booking_services",
          type: "BookingServices",
          order: 2,
          editable: { title: copy.bookingServicesTitle, text: copy.bookingServicesText, images: [] },
          settings: { layout: "service_menu", columns: 3 },
        },
        {
          id: "booking_availability",
          type: "BookingAvailability",
          order: 3,
          editable: { title: copy.availabilityTitle, text: copy.availabilityText, items: copy.availabilityItems, images: [] },
          settings: { layout: "schedule_cards" },
        },
        {
          id: "booking_team",
          type: "BookingTeam",
          order: 4,
          editable: { title: copy.bookingTeamTitle, text: copy.bookingTeamText, items: copy.bookingTeamItems, images: [] },
          settings: { layout: "staff_process" },
        },
        {
          id: "booking_contact",
          type: "BookingContact",
          order: 5,
          editable: { title: copy.bookingContactTitle, text: copy.bookingContactText, images: [] },
          settings: { layout: "booking_panel" },
        },
      ],
    },
    {
      page_key: "catalog",
      title: copy.availability,
      slug: copy.servicesSlug,
      order: 2,
      sections: [
        { id: "services_grid", type: "ProductGrid", order: 1, editable: { title: copy.bookingServicesTitle, text: copy.bookingServicesText, images: [] }, settings: { layout: "booking_menu", columns: 3 } },
        { id: "availability", type: "BookingAvailability", order: 2, editable: { title: copy.availabilityTitle, text: copy.availabilityText, items: copy.availabilityItems, images: [] }, settings: { layout: "schedule_cards" } },
      ],
    },
    {
      page_key: "about",
      title: copy.team,
      slug: copy.teamSlug,
      order: 3,
      sections: [
        { id: "team", type: "BookingTeam", order: 1, editable: { title: copy.bookingTeamTitle, text: copy.bookingTeamText, items: copy.bookingTeamItems, images: [] }, settings: { layout: "staff_process" } },
      ],
    },
    {
      page_key: "contact",
      title: copy.bookNow,
      slug: copy.contactSlug,
      order: 4,
      sections: [{ id: "booking_contact", type: "BookingContact", order: 1, editable: { title: copy.bookingContactTitle, text: copy.bookingContactText, images: [] }, settings: { layout: "booking_panel" } }],
    },
  ];
}

function normalizeBookingInstantCopy(input = {}, language = builderState.selectedLanguage) {
  const source = input && typeof input === "object" ? input : {};
  const locale = catalogLocaleLabels({ business: { selectedLanguage: language || "en" } });
  const functionValue = (key, fallback) => typeof source[key] === "function"
    ? source[key]
    : typeof locale[key] === "function"
      ? locale[key]
      : fallback;
  const textValue = (key, fallback = "") => typeof source[key] === "string" && source[key].trim()
    ? source[key]
    : typeof locale[key] === "string" && locale[key].trim()
      ? locale[key]
      : fallback;
  const listValue = (key, fallback = []) => {
    const values = arrayValue(source[key]).filter(Boolean);
    if (values.length) return values;
    const localized = arrayValue(locale[key]).filter(Boolean);
    return localized.length ? localized : fallback;
  };

  return {
    ...source,
    fromQuote: textValue("fromQuote", source.askPrice || "Price on request"),
    bookingHeadline: functionValue("bookingHeadline", (businessName) => `Book ${businessName} with a clear next step`),
    bookingSubheadline: functionValue("bookingSubheadline", (value) => value || "Choose a service, preferred time, and contact method in one simple booking flow."),
    bookingServicesTitle: textValue("bookingServicesTitle", "Choose the right appointment"),
    bookingServicesText: textValue("bookingServicesText", "Show duration, service details, and what the client should expect before booking."),
    availabilityTitle: textValue("availabilityTitle", "Availability that feels simple"),
    availabilityText: textValue("availabilityText", "Make open windows, preparation notes, and confirmation expectations clear."),
    availabilityItems: listValue("availabilityItems", ["Today / tomorrow windows", "Morning appointments", "Afternoon appointments"]),
    bookingTeamTitle: textValue("bookingTeamTitle", "A smoother visit from start to finish"),
    bookingTeamText: textValue("bookingTeamText", "Explain the staff, process, and preparation so clients know what happens next."),
    bookingTeamItems: listValue("bookingTeamItems", ["Pick a service", "Choose a preferred time", "Receive confirmation"]),
    bookingContactTitle: textValue("bookingContactTitle", "Reserve the next available time"),
    bookingContactText: textValue("bookingContactText", "Send the preferred service, day, and contact method to request confirmation."),
  };
}

function buildLeadFunnelInstantPages(copy, name, description, payload = {}) {
  const heroImage = payload.assets?.find((asset) => asset.asset_type === "photo")?.url || "";
  return [
    {
      page_key: "home",
      title: copy.offer,
      slug: "/",
      order: 1,
      sections: [
        {
          id: "funnel_hero",
          type: "FunnelHero",
          order: 1,
          editable: {
            headline: copy.funnelHeadline(name),
            subtitle: copy.funnelSubheadline(description),
            primary_button: copy.claimOffer,
            secondary_button: copy.seeProof,
            image_url: heroImage,
            images: [],
          },
          settings: { layout: "conversion_funnel" },
        },
        {
          id: "funnel_benefits",
          type: "FunnelBenefits",
          order: 2,
          editable: {
            title: copy.funnelBenefitsTitle,
            text: copy.funnelBenefitsText,
            items: copy.funnelBenefitsItems,
            images: [],
          },
          settings: { layout: "benefit_stack", columns: 3 },
        },
        {
          id: "funnel_offer",
          type: "FunnelOffer",
          order: 3,
          editable: {
            title: copy.funnelOfferTitle,
            text: copy.funnelOfferText,
            guarantee: copy.funnelGuarantee,
            images: [],
          },
          settings: { layout: "offer_stack" },
        },
        {
          id: "funnel_proof",
          type: "FunnelProof",
          order: 4,
          editable: {
            title: copy.funnelProofTitle,
            text: copy.funnelProofText,
            items: copy.funnelProofItems,
            images: [],
          },
          settings: { layout: "proof_wall" },
        },
        {
          id: "funnel_faq",
          type: "FunnelFAQ",
          order: 5,
          editable: {
            title: copy.funnelFaqTitle,
            items: copy.funnelFaqItems,
            images: [],
          },
          settings: { layout: "objection_handling" },
        },
      ],
    },
    {
      page_key: "catalog",
      title: copy.benefits,
      slug: copy.offerSlug,
      order: 2,
      sections: [
        {
          id: "offer_stack",
          type: "ProductGrid",
          order: 1,
          editable: { title: copy.funnelOfferTitle, text: copy.funnelOfferText, images: [] },
          settings: { layout: "lead_offer_stack", columns: 3 },
        },
      ],
    },
    {
      page_key: "about",
      title: copy.proof,
      slug: copy.proofSlug,
      order: 3,
      sections: [
        {
          id: "proof",
          type: "FunnelProof",
          order: 1,
          editable: { title: copy.funnelProofTitle, text: copy.funnelProofText, items: copy.funnelProofItems, images: [] },
          settings: { layout: "proof_wall" },
        },
        {
          id: "faq",
          type: "FunnelFAQ",
          order: 2,
          editable: { title: copy.funnelFaqTitle, items: copy.funnelFaqItems, images: [] },
          settings: { layout: "objection_handling" },
        },
      ],
    },
    {
      page_key: "contact",
      title: copy.contact,
      slug: copy.contactSlug,
      order: 4,
      sections: [
        {
          id: "contact",
          type: "Contact",
          order: 1,
          editable: { title: copy.letsTalk, text: copy.funnelContactText, images: [] },
          settings: { layout: "lead_capture" },
        },
      ],
    },
  ];
}

function retailCopyForInstant(copy, language = builderState.selectedLanguage) {
  const localized = {
    en: {
      headline: (name) => `${name} store`,
      dealText: "A high-density retail draft with categories, offers, ratings and checkout-ready product cards.",
      trustText: "Clear delivery, secure checkout, inventory validation, support and simple returns.",
      catalogText: "Products ready to organize, edit, price, activate and publish.",
    },
    es: {
      headline: (name) => `${name} tienda online`,
      dealText: "Borrador retail de alta densidad con categorias, ofertas, calificaciones y productos listos para checkout.",
      trustText: "Entrega clara, checkout seguro, validacion de inventario, soporte y devoluciones simples.",
      catalogText: "Productos listos para organizar, editar, colocar precio, activar y publicar.",
    },
    fr: {
      headline: (name) => `Boutique ${name}`,
      dealText: "Brouillon retail dense avec categories, offres, notes et fiches produits pretes pour le checkout.",
      trustText: "Livraison claire, paiement securise, validation d'inventaire, support et retours simples.",
      catalogText: "Produits prets a organiser, modifier, tarifer, activer et publier.",
    },
    pt: {
      headline: (name) => `${name} loja online`,
      dealText: "Rascunho retail de alta densidade com categorias, ofertas, avaliacoes e produtos prontos para checkout.",
      trustText: "Entrega clara, checkout seguro, validacao de inventario, suporte e devolucoes simples.",
      catalogText: "Produtos prontos para organizar, editar, precificar, ativar e publicar.",
    },
  };
  const text = localized[language] || localized.en;
  return {
    ...copy,
    marketplaceHeadline: text.headline,
    dealText: text.dealText,
    dealsText: text.dealText,
    trustText: text.trustText,
    catalogText: text.catalogText,
  };
}

function buildRetailInstantPages(copy, name, description, payload = {}) {
  const language = payload.selectedLanguage || builderState.selectedLanguage || "en";
  return buildMarketplaceInstantPages(retailCopyForInstant(copy, language), name, description, payload)
    .map((page) => ({
      ...page,
      sections: arrayValue(page.sections).map((section) => ({
        ...section,
        id: String(section.id || "").replace(/marketplace/g, "retail"),
        settings: {
          ...(section.settings || {}),
          layout: String(section.settings?.layout || "").replace(/marketplace/g, "retail"),
          ownership_model: "single_owner",
        },
      })),
    }));
}

function buildMarketplaceInstantPages(copy, name, description, payload = {}) {
  const productGridSettings = { layout: "marketplace_grid", columns: 4, spacing: "balanced", container_width: "wide", card_density: "compact", card_gap: "tight" };
  const composition = runtimeCompositionIndex(name, payload);
  const recipes = [
    { hero: "split_showcase", homeOrder: ["marketplace_hero", "category_rail", "deal_row", "marketplace_catalog", "trust_strip"], feature: "image_right" },
    { hero: "centered_bold", homeOrder: ["marketplace_hero", "deal_row", "marketplace_catalog", "category_rail", "trust_strip", "marketplace_testimonials"], feature: "card_grid" },
    { hero: "asymmetric_grid", homeOrder: ["marketplace_hero", "category_rail", "marketplace_catalog", "marketplace_gallery", "deal_row", "trust_strip"], feature: "image_left" },
  ];
  const recipe = recipes[composition];
  const pages = [
    {
      page_key: "home",
      title: copy.home,
      slug: "/",
      order: 1,
      sections: [
        {
          id: "marketplace_hero",
          type: "MarketplaceHero",
          order: 1,
          editable: {
            headline: copy.marketplaceHeadline(name),
            subtitle: description,
            primary_button: copy.shopDeals,
            secondary_button: copy.viewCategories,
            search_placeholder: copy.searchPlaceholder,
            deal_badge: copy.todayDeal,
            deal_title: copy.dealTitle,
            deal_text: copy.dealText,
            image_url: payload.assets?.find((asset) => asset.asset_type === "photo")?.url || "",
            images: [],
          },
          variant: recipe.hero,
          settings: { layout: recipe.hero, spacing: "compact", container_width: "wide" },
        },
        {
          id: "category_rail",
          type: "CategoryRail",
          order: 2,
          editable: { title: copy.shopByCategory, text: copy.categoryRailText },
          settings: { layout: "category_tiles", spacing: "compact", container_width: "wide" },
        },
        {
          id: "deal_row",
          type: "DealRow",
          order: 3,
          editable: { title: copy.todayDeals, text: copy.dealsText },
          settings: { layout: "deal_row", spacing: "compact", container_width: "wide" },
        },
        {
          id: "marketplace_catalog",
          type: "ProductGrid",
          order: 4,
          editable: { title: copy.bestSellers, text: copy.catalogText, images: [] },
          settings: productGridSettings,
        },
        {
          id: "trust_strip",
          type: "TrustStrip",
          order: 5,
          editable: { title: copy.whyBuyHere, text: copy.trustText },
          settings: { layout: "marketplace_trust", spacing: "compact", container_width: "wide" },
        },
        ...(composition === 1 ? [{
          id: "marketplace_testimonials",
          type: "Testimonials",
          editable: { title: copy.whyBuyHere, text: copy.trustText, images: [] },
          variant: recipe.feature,
          settings: { layout: "feature", spacing: "balanced", container_width: "wide" },
        }] : []),
        ...(composition === 2 ? [{
          id: "marketplace_gallery",
          type: "Gallery",
          editable: { title: copy.bestSellers, text: copy.catalogText, images: [] },
          variant: recipe.feature,
          settings: { layout: "gallery", columns: 3, spacing: "balanced", container_width: "wide" },
        }] : []),
      ],
    },
    {
      page_key: "deals",
      title: copy.deals,
      slug: "/deals",
      order: 2,
      sections: [
        {
          id: "deals_hero",
          type: "MarketplaceHero",
          order: 1,
          editable: {
            headline: copy.todayDeals,
            subtitle: copy.dealsText,
            primary_button: copy.shopDeals,
            secondary_button: copy.viewCategories,
            search_placeholder: copy.searchPlaceholder,
            deal_badge: copy.todayDeal,
            deal_title: copy.dealTitle,
            deal_text: copy.dealText,
            images: [],
          },
          settings: { layout: "marketplace_search", spacing: "compact", container_width: "wide" },
        },
        {
          id: "deals_row",
          type: "DealRow",
          order: 2,
          editable: { title: copy.todayDeals, text: copy.dealsText },
          settings: { layout: "deal_row", spacing: "compact", container_width: "wide" },
        },
        {
          id: "deals_grid",
          type: "ProductGrid",
          order: 3,
          editable: { title: copy.bestSellers, text: copy.catalogText, images: [] },
          settings: productGridSettings,
        },
      ],
    },
    {
      page_key: "categories",
      title: copy.categories,
      slug: "/categories",
      order: 3,
      sections: [
        {
          id: "categories_rail",
          type: "CategoryRail",
          order: 1,
          editable: { title: copy.shopByCategory, text: copy.categoryRailText },
          settings: { layout: "category_tiles", spacing: "compact", container_width: "wide" },
        },
        {
          id: "categories_grid",
          type: "ProductGrid",
          order: 2,
          editable: { title: copy.catalog, text: copy.catalogText, images: [] },
          settings: productGridSettings,
        },
      ],
    },
    {
      page_key: "catalog",
      title: copy.shop,
      slug: copy.shopSlug,
      order: 4,
      sections: [
        {
          id: "catalog_search",
          type: "MarketplaceHero",
          order: 1,
          editable: {
            headline: copy.catalog,
            subtitle: copy.catalogText,
            primary_button: copy.shopDeals,
            secondary_button: copy.viewCategories,
            search_placeholder: copy.searchPlaceholder,
            deal_badge: copy.bestSellers,
            deal_title: copy.todayDeals,
            deal_text: copy.dealsText,
            images: [],
          },
          settings: { layout: "marketplace_search", spacing: "compact", container_width: "wide" },
        },
        {
          id: "catalog_grid",
          type: "ProductGrid",
          order: 2,
          editable: { title: copy.catalog, text: copy.catalogText, images: [] },
          settings: { ...productGridSettings, spacing: "compact" },
        },
      ],
    },
    {
      page_key: "about",
      title: copy.about,
      slug: copy.aboutSlug,
      order: 5,
      sections: [{ id: "about", type: "About", order: 1, editable: { title: copy.aboutBrand, text: description }, settings: { layout: "feature", container_width: "wide" } }],
    },
    {
      page_key: "support",
      title: copy.support,
      slug: "/support",
      order: 6,
      sections: [
        {
          id: "support_trust",
          type: "TrustStrip",
          order: 1,
          editable: { title: copy.whyBuyHere, text: copy.trustText },
          settings: { layout: "marketplace_trust", spacing: "compact", container_width: "wide" },
        },
        {
          id: "contact",
          type: "Contact",
          order: 2,
          editable: { title: copy.letsTalk, text: copy.contactText },
          settings: { layout: "simple", container_width: "wide" },
        },
      ],
    },
  ];
  const home = pages.find((page) => page.page_key === "home");
  const byId = new Map(home.sections.map((section) => [section.id, section]));
  home.sections = resequenceSections(recipe.homeOrder.map((id) => byId.get(id)).filter(Boolean));
  for (const page of pages) {
    for (const section of page.sections || []) {
      if (section.type === "MarketplaceHero" && !section.variant) section.variant = recipe.hero;
      if (["About", "Testimonials"].includes(section.type) && !section.variant) section.variant = recipe.feature;
    }
  }
  return pages;
}

function marketplaceCategoryForIndex(index, copy, contextText = "", language = builderState.selectedLanguage) {
  const normalized = normalizeTemplateIntentText(contextText);
  const localized = {
    en: {
      jewelry: ["Necklaces", "Bracelets", "Earrings", "Custom pieces", "Gift sets", "New arrivals"],
      fashion: ["New arrivals", "Accessories", "Outfits", "Statement pieces", "Limited drop", "Best sellers"],
      variety: ["Featured", "Auto accessories", "Collectibles", "Home finds", "Gifts", "Deals"],
    },
    es: {
      jewelry: ["Collares", "Pulseras", "Aretes", "Piezas personalizadas", "Sets de regalo", "Novedades"],
      fashion: ["Novedades", "Accesorios", "Looks", "Piezas destacadas", "Drop limitado", "Mas vendidos"],
      variety: ["Destacados", "Accesorios auto", "Coleccionables", "Hogar", "Regalos", "Ofertas"],
    },
    fr: {
      jewelry: ["Colliers", "Bracelets", "Boucles", "Pieces personnalisees", "Sets cadeaux", "Nouveautes"],
      fashion: ["Nouveautes", "Accessoires", "Looks", "Pieces fortes", "Drop limite", "Meilleures ventes"],
      variety: ["Selections", "Accessoires auto", "Objets de collection", "Maison", "Cadeaux", "Offres"],
    },
    pt: {
      jewelry: ["Colares", "Pulseiras", "Brincos", "Pecas personalizadas", "Kits presente", "Novidades"],
      fashion: ["Novidades", "Acessorios", "Looks", "Pecas destaque", "Drop limitado", "Mais vendidos"],
      variety: ["Destaques", "Acessorios auto", "Colecionaveis", "Casa", "Presentes", "Ofertas"],
    },
  };
  const set = localized[language] || localized.en;
  let categories = copy.marketplaceCategories || ["Featured", "Deals", "New", "Popular"];
  if (textSuggestsJewelryAccessoryStore(normalized)) {
    categories = set.jewelry;
  } else if (/ropa|moda|fashion|camisa|zapato|sneaker|clothing|apparel|streetwear|lookbook/.test(normalized)) {
    categories = set.fashion;
  } else if (/carro|auto|automotriz|anime|gadget|juguete|regalo|raro|curioso|hogar|home|gift|collectible|variedad|varied|variado/.test(normalized)) {
    categories = set.variety;
  }
  return categories[index % categories.length];
}

function fashionCategoryForIndex(index, copy, contextText = "") {
  if (textSuggestsJewelryAccessoryStore(contextText)) {
    const jewelryCategories = copy.jewelryCategories || ["Necklaces", "Bracelets", "Earrings", "Rings", "Sets", "Custom pieces"];
    return jewelryCategories[index % jewelryCategories.length];
  }
  const categories = copy.fashionCollections || ["New arrivals", "Essentials", "Statement pieces", "Accessories", "Limited drop", "Best sellers"];
  return categories[index % categories.length];
}

function restaurantCategoryForIndex(index, copy) {
  const categories = copy.restaurantCategories || ["Starters", "Mains", "Drinks", "Desserts"];
  return categories[index % categories.length];
}

function digitalCategoryForIndex(index, copy) {
  const categories = copy.digitalCategories || ["Course", "Template", "Toolkit", "Membership"];
  return categories[index % categories.length];
}

function listingCategoryForIndex(index, copy) {
  const categories = copy.listingCategories || ["Homes", "Rentals", "Commercial", "Featured"];
  return categories[index % categories.length];
}

function luxuryCategoryForIndex(index, copy) {
  const categories = copy.luxuryCategories || ["Watches", "Jewelry", "Art", "Collectibles", "Private collection", "Limited pieces"];
  return categories[index % categories.length];
}

function educationCategoryForIndex(index, copy) {
  const categories = copy.educationCategories || ["Foundation", "Advanced", "Workshop", "Coaching", "Certification", "Membership"];
  return categories[index % categories.length];
}

function educationDurationForIndex(index, copy) {
  const durations = copy.educationDurations || ["4 weeks", "6 modules", "Live cohort", "Self-paced"];
  return durations[index % durations.length];
}

function clinicCategoryForIndex(index, copy) {
  const categories = copy.clinicCategories || ["Aesthetic care", "Wellness", "Dental", "Therapy", "Nutrition", "Consultation"];
  return categories[index % categories.length];
}

function clinicDurationForIndex(index, copy) {
  const durations = copy.clinicDurations || ["30 min consult", "45 min session", "Personal plan", "Follow-up ready"];
  return durations[index % durations.length];
}

function professionalCategoryForIndex(index, copy) {
  const categories = copy.professionalCategories || ["Legal", "Tax", "Accounting", "Insurance", "Consulting", "Compliance"];
  return categories[index % categories.length];
}

function professionalEngagementForIndex(index, copy) {
  const engagements = copy.professionalEngagements || ["Initial review", "Document review", "Strategy call", "Ongoing advisory"];
  return engagements[index % engagements.length];
}

function enterpriseCategoryForIndex(index, copy) {
  const categories = copy.enterpriseCategories || ["Automation", "Analytics", "CRM", "Operations", "Integrations", "Security"];
  return categories[index % categories.length];
}

function enterpriseTimelineForIndex(index, copy) {
  const timelines = copy.enterpriseTimelines || ["Demo first", "2 week setup", "API-ready", "Managed rollout"];
  return timelines[index % timelines.length];
}

function industrialCategoryForIndex(index, copy) {
  const categories = copy.industrialCategories || ["Machinery", "Parts", "Tools", "Safety", "Materials", "Maintenance"];
  return categories[index % categories.length];
}

function industrialLeadTimeForIndex(index, copy) {
  const timelines = copy.industrialLeadTimes || ["Quote first", "Bulk order", "2-4 week lead", "Custom spec"];
  return timelines[index % timelines.length];
}

export function listingLocationForIndex(index, copy) {
  const locations = copy.listingLocations || ["Central area", "North side", "West district", "Near downtown"];
  return locations[index % locations.length];
}

export function marketplaceCategories(schema) {
  const items = marketplaceItems(schema);
  const fromItems = [...new Set(items.map((item) => item.category).filter(Boolean))];
  if (fromItems.length > 0) return fromItems;
  const copy = instantLocaleCopy(schema?.business?.selectedLanguage || builderState.selectedLanguage || "en");
  return [...new Set([...fromItems, ...(copy.marketplaceCategories || [])])];
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
      menu: "Menu",
      specials: "Specials",
      hoursLocation: "Hours & location",
      orderNow: "Order now",
      viewMenu: "View menu",
      menuSlug: "/menu",
      hoursSlug: "/hours-location",
      menuPrice: "Menu price",
      restaurantHeadline: (name) => `${name} menu, made easy to order`,
      restaurantSubheadline: (description) => description || "A warm restaurant site with signature dishes, menu categories, specials, hours, location and a simple ordering path.",
      restaurantCategoriesTitle: "Explore the menu by category",
      restaurantCategoriesText: "Give customers fast paths to starters, mains, drinks, desserts, specials and favorites.",
      restaurantCategories: ["Starters", "Mains", "Drinks", "Desserts", "Specials", "Chef picks"],
      restaurantSignatureTitle: "Signature dishes ready to order",
      restaurantSignatureText: "Highlight the dishes, combos and customer favorites that should sell first.",
      restaurantSpecialsTitle: "Specials and combos",
      restaurantSpecialsText: "Use this section for lunch specials, family combos, happy hour, delivery offers or chef recommendations.",
      restaurantSpecialItems: ["Chef recommendation", "Family combo", "Pickup special", "Delivery-ready"],
      restaurantInfoTitle: "Hours, location and service options",
      restaurantInfoText: "Show open hours, pickup, delivery, dine-in, service area and how customers should place an order.",
      restaurantInfoItems: ["Open hours", "Pickup", "Delivery", "Dine-in", "Catering", "WhatsApp orders"],
      restaurantOrderTitle: "Place an order or ask a question",
      restaurantOrderText: "Send the preferred dishes, pickup or delivery option, and contact method. The business can confirm by phone, WhatsApp or email.",
      clinicCare: "Personalized care",
      treatments: "Treatments",
      results: "Results",
      bookConsultation: "Book consultation",
      viewTreatments: "View treatments",
      consultationBased: "Consultation-based",
      popularTreatment: "Popular treatment",
      specialistLed: "Specialist-led",
      personalizedPlan: "Personalized plan",
      clinicHeadline: (name) => `${name} care designed around your next step`,
      clinicSubheadline: (description) => description || "A calm, professional clinic website built around trust, treatments, results, specialists, and easy booking.",
      treatmentsTitle: "Treatments and services",
      treatmentsText: "Present the services customers can request, compare, and book with clear next steps.",
      carePathTitle: "A clear path from first question to care",
      carePathText: "Show how the clinic evaluates needs, recommends the right treatment, and follows up with confidence.",
      carePathItems: ["Initial consultation", "Personalized plan", "Treatment session", "Progress check", "Aftercare guidance", "Next visit"],
      clinicTrustTitle: "Trust signals patients look for",
      clinicTrustText: "Use credentials, safety notes, specialist experience, transparent expectations and response times.",
      clinicTrustItems: ["Specialist guidance", "Safety-first process", "Clear expectations", "Private consultation", "Aftercare notes", "Fast response"],
      resultsTitle: "Results with realistic expectations",
      resultsText: "Use this area for before/after proof, transformation notes, case examples or expected outcomes.",
      resultItems: ["Visible progress", "Before/after proof", "Personal plan", "Follow-up support", "Clear preparation", "Aftercare included"],
      clinicTeamTitle: "Specialists who guide the process",
      clinicTeamText: "Introduce the provider, clinical standards, certifications or care philosophy behind the services.",
      clinicTeamItems: ["Credentialed team", "Consultation-first", "Patient education", "Care follow-up"],
      clinicBookingTitle: "Book a consultation or ask a question",
      clinicBookingText: "Send the treatment, concern, preferred schedule and contact method. The clinic can confirm next steps.",
      clinicCategories: ["Aesthetic care", "Wellness", "Dental", "Therapy", "Nutrition", "Consultation"],
      clinicDurations: ["30 min consult", "45 min session", "Personal plan", "Follow-up ready"],
      professionalFirm: "Professional firm",
      scheduleConsultation: "Schedule consultation",
      confidential: "Confidential",
      seniorAdvisor: "Senior advisor",
      caseReview: "Case review",
      businessReady: "Business-ready",
      professionalHeadline: (name) => `${name} guidance for decisions that matter`,
      professionalSubheadline: (description) => description || "A premium professional services website built around trust, clear practice areas, process, proof, and consultation requests.",
      practiceAreasTitle: "Practice areas and services",
      practiceAreasText: "Show the services clients can review, compare and request with a clear consultation path.",
      professionalProcessTitle: "A clear advisory process",
      professionalProcessText: "Help clients understand how the firm reviews the situation, recommends next steps and follows through.",
      professionalProcessItems: ["Initial review", "Document check", "Strategy call", "Action plan", "Follow-up", "Ongoing advisory"],
      professionalProofTitle: "Proof clients need before they contact you",
      professionalProofText: "Use credentials, confidentiality, response expectations and professional standards.",
      professionalProofItems: ["Confidential process", "Senior review", "Clear next steps", "Business-ready advice", "Document support", "Responsive contact"],
      professionalTeamTitle: "Advisors who handle the details",
      professionalTeamText: "Introduce the attorney, accountant, consultant or advisor standards behind the service.",
      professionalTeamItems: ["Experienced advisors", "Private consultation", "Clear documentation", "Follow-through"],
      professionalFaqTitle: "Questions before the consultation",
      professionalFaqItems: ["What should I prepare?", "How does the first consultation work?", "Can you review documents?", "Can this become ongoing advisory?"],
      professionalConsultationTitle: "Request a consultation or document review",
      professionalConsultationText: "Send the service needed, urgency, preferred schedule and contact method. The firm can confirm the next step.",
      professionalCategories: ["Legal", "Tax", "Accounting", "Insurance", "Consulting", "Compliance"],
      professionalEngagements: ["Initial review", "Document review", "Strategy call", "Ongoing advisory"],
      enterprisePlatform: "Enterprise platform",
      requestDemo: "Request demo",
      viewSolutions: "View solutions",
      solutions: "Solutions",
      useCases: "Use cases",
      integrations: "Integrations",
      customPlan: "Custom plan",
      enterpriseReady: "Enterprise-ready",
      integrationReady: "Integration-ready",
      roiFocused: "ROI-focused",
      enterpriseHeadline: (name) => `${name} systems that help teams move faster`,
      enterpriseSubheadline: (description) => description || "A premium B2B website for software, automation, integrations, dashboards and enterprise services.",
      enterpriseSolutionsTitle: "Solutions built for operational teams",
      enterpriseSolutionsText: "Present products, services or packages as clear business solutions with demo-first next steps.",
      enterpriseUseCasesTitle: "Use cases by workflow",
      enterpriseUseCasesText: "Show how the solution fits sales, operations, support, finance, leadership or field teams.",
      enterpriseUseCaseItems: ["Automate manual work", "Centralize reporting", "Connect business tools", "Improve team visibility", "Reduce operational delays", "Scale service delivery"],
      enterpriseIntegrationsTitle: "Integrations and rollout",
      enterpriseIntegrationsText: "Make technical buyers comfortable with APIs, CRM, ERP, payments, analytics and support workflows.",
      enterpriseIntegrationItems: ["CRM", "ERP", "Payments", "Analytics", "Support desk", "Custom API"],
      enterpriseProofTitle: "Business proof before the demo",
      enterpriseProofText: "Use security, implementation, ROI, response time and support signals.",
      enterpriseProofItems: ["Secure workflows", "Implementation support", "Clear ROI path", "Admin controls", "API-ready", "Team onboarding"],
      enterprisePricingTitle: "Packages that can start simple and scale",
      enterprisePricingText: "Use this area for starter, growth and enterprise packages without exposing internal costs.",
      enterpriseDemoTitle: "Book a demo or request a solution review",
      enterpriseDemoText: "Send team size, current tools, workflow problem and preferred contact method. The team can qualify the lead.",
      enterpriseCategories: ["Automation", "Analytics", "CRM", "Operations", "Integrations", "Security"],
      enterpriseTimelines: ["Demo first", "2 week setup", "API-ready", "Managed rollout"],
      industrialSupplier: "Industrial supplier",
      requestQuote: "Request quote",
      viewSpecs: "View specs",
      capabilities: "Capabilities",
      certifications: "Certifications",
      supplyChain: "Supply chain",
      quoteRequired: "Quote required",
      certified: "Certified",
      bulkReady: "Bulk-ready",
      specReady: "Spec-ready",
      moqReady: "MOQ-ready",
      industrialHeadline: (name) => `${name} supply built for serious operations`,
      industrialSubheadline: (description) => description || "A technical industrial supplier website with RFQ flow, specs, MOQ, lead times, certifications and supply-chain confidence.",
      industrialCatalogTitle: "Technical products and industrial supply",
      industrialCatalogText: "Present parts, equipment and materials with specs buyers can verify before requesting a quote.",
      industrialCapabilitiesTitle: "Capabilities buyers need to verify",
      industrialCapabilitiesText: "Show custom specs, bulk ordering, sourcing, quality control and support for repeat procurement.",
      industrialCapabilityItems: ["Custom specs", "Bulk ordering", "Quality control", "Fast sourcing", "Replacement parts", "B2B support"],
      industrialCertificationsTitle: "Certifications, quality and documentation",
      industrialCertificationsText: "Give procurement teams confidence with documentation, safety data, warranty and compliance notes.",
      industrialCertificationItems: ["ISO-ready docs", "Material specs", "Warranty notes", "Safety data", "Compliance support", "Batch tracking"],
      industrialSupplyTitle: "Supply chain and fulfillment",
      industrialSupplyText: "Make lead times, MOQ planning, freight support and repeat orders easy to understand.",
      industrialSupplyItems: ["Lead times", "MOQ planning", "Freight support", "Warehouse-ready", "Vendor sourcing", "Repeat orders"],
      industrialQuoteTitle: "Request a quote with specs",
      industrialQuoteText: "Send product, quantities, material, deadline and delivery needs. The supplier can respond with availability and pricing.",
      industrialCategories: ["Machinery", "Parts", "Tools", "Safety", "Materials", "Maintenance"],
      industrialLeadTimes: ["Quote first", "Bulk order", "2-4 week lead", "Custom spec"],
      industrialMaterials: ["Steel", "Aluminum", "Composite", "Safety-rated"],
      solutionsSlug: "/solutions",
      useCasesSlug: "/use-cases",
      home: "Home",
      overview: "Overview",
      products: "Products",
      story: "Story",
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
      deals: "Deals",
      categories: "Categories",
      support: "Support",
      fastDelivery: "Fast delivery",
      freeShipping: "Free shipping",
      todayDeal: "Today deal",
      marketplaceHeadline: (name) => `${name} marketplace`,
      shopDeals: "Shop deals",
      viewCategories: "View categories",
      searchPlaceholder: "Search products, brands, or categories",
      dealTitle: "Top picks ready to sell",
      dealText: "A marketplace-style draft with categories, deals, ratings, and checkout-ready product cards.",
      shopByCategory: "Shop by category",
      categoryRailText: "Quick paths for customers to compare products faster.",
      todayDeals: "Today's deals",
      dealsText: "Limited rows, featured offers, and fast-discovery product cards.",
      bestSellers: "Best sellers",
      whyBuyHere: "Why customers buy here",
      trustText: "Clear delivery, secure checkout, support, and simple returns.",
      marketplaceCategories: ["Electronics", "Home", "Fashion", "Beauty", "Sports", "Deals"],
      listings: "Listings",
      areas: "Areas",
      listingsSlug: "/listings",
      areasSlug: "/areas",
      searchListings: "Search listings",
      viewListings: "View listings",
      inquireNow: "Inquire now",
      featuredListing: "Featured listing",
      newListing: "New listing",
      availableNow: "Available now",
      listingPrice: "Price on request",
      listingHeadline: (name) => `Find the right listing with ${name}`,
      listingSubheadline: () => "Search premium listings by location, price, category and specs with a clear inquiry path.",
      listingSearchPlaceholder: "Search by location, type, price or keyword",
      listingFiltersTitle: "Search with the right filters",
      listingFiltersText: "Help customers narrow options by category, location, price and availability before they inquire.",
      featuredListingsTitle: "Featured listings",
      featuredListingsText: "A polished selection of active listings with price, location, specs and inquiry CTAs.",
      listingAreaTitle: "Explore the best areas",
      listingAreaText: "Use area cards, neighborhood notes or service zones to make discovery feel local and clear.",
      listingTrustTitle: "Confidence before the inquiry",
      listingTrustText: "Show verified details, clear contact paths and updated availability before the customer reaches out.",
      listingContactTitle: "Ask about a listing",
      listingContactText: "Send the preferred listing, budget, location and contact method. The business can respond with availability or next steps.",
      listingCategories: ["Homes", "Rentals", "Commercial", "Land", "Cars", "Featured"],
      listingLocations: ["Downtown", "North area", "West district", "Near schools", "Waterfront", "Business zone"],
      listingTrustItems: ["Verified details", "Updated availability", "Clear pricing", "Local support", "Fast response", "Easy comparison"],
      company: "Company",
      services: "Services",
      process: "Process",
      servicesSlug: "/services",
      processSlug: "/company",
      requestConsultation: "Request consultation",
      viewServices: "View services",
      corporateHeadline: (name) => `${name} builds work clients can trust`,
      corporateSubheadline: (description) => description || "A professional company website focused on clarity, services, proof, and direct inquiries.",
      corporateServicesTitle: "Services and capabilities",
      corporateServicesText: "A clear overview of what the company does, who it helps, and the outcomes clients can expect.",
      corporateProcessTitle: "A simple process from first conversation to delivery",
      corporateProcessText: "Show how the company evaluates needs, recommends the right path, and delivers with accountability.",
      corporateProcessItems: ["Understand the goal", "Plan the right solution", "Deliver with clear communication", "Support the next step"],
      corporateProofTitle: "Built on trust and measurable work",
      corporateProofText: "Use this section for credibility, experience, certifications, client types, or operating standards.",
      corporateProofItems: ["Reliable delivery", "Clear communication", "Professional standards"],
      corporateContactText: "Send a message to discuss services, availability, pricing, or a custom project.",
      offer: "Offer",
      benefits: "Benefits",
      proof: "Proof",
      faq: "FAQ",
      offerSlug: "/offer",
      proofSlug: "/proof",
      claimOffer: "Start now",
      seeProof: "See proof",
      funnelHeadline: (name) => `${name} turns interest into real customers`,
      funnelSubheadline: (description) => description || "A focused landing page built around one clear offer, proof, and a direct next step.",
      funnelBenefitsTitle: "Why this offer works",
      funnelBenefitsText: "Show the most important outcomes clearly so visitors understand the value before they contact you.",
      funnelBenefitsItems: ["Clear promise", "Simple next step", "Built for qualified leads", "Easy to edit", "Proof-first structure", "Fast launch"],
      funnelOfferTitle: "Everything needed to take the next step",
      funnelOfferText: "Present the offer, package, consultation, or service in a focused stack that keeps attention on conversion.",
      funnelGuarantee: "Clear expectations before the customer commits.",
      funnelProofTitle: "Proof that removes doubt",
      funnelProofText: "Use results, testimonials, standards, or before-and-after outcomes to build confidence.",
      funnelProofItems: ["Specific customer outcome", "Simple process", "Fast response", "Clear pricing conversation"],
      funnelFaqTitle: "Questions before starting",
      funnelFaqItems: [
        { question: "What happens after I send a request?", answer: "The business follows up with the next step, quote, booking, or consultation." },
        { question: "Can the offer be customized?", answer: "Yes. The offer, copy, sections, and contact path are editable." },
        { question: "Is this a store?", answer: "No. This version is focused on leads, applications, bookings, or quote requests." },
      ],
      funnelContactText: "Send a request and the business can follow up with the next step, quote, or booking details.",
      premiumHeadline: (name) => `Meet ${name}`,
      premiumSubheadline: (description) => description || "A refined product experience built to feel simple, confident, and memorable.",
      premiumPrimary: "Explore products",
      premiumSecondary: "See the story",
      premiumStoryTitle: "Designed around the details",
      premiumStoryText: "A focused product story with clean copy, quiet confidence, and enough space for every feature to feel intentional.",
      premiumFeatureTitle: "One flagship experience",
      premiumFeatureText: "Use this section for the signature benefit, craft story, performance promise, or strongest reason to buy.",
      premiumGalleryTitle: "Curated essentials",
      premiumGalleryText: "A smaller catalog presented with more care, stronger imagery, and clearer product value.",
      premiumSpecsTitle: "Everything important, easy to compare",
      premiumSpecsText: "Highlight materials, warranty, delivery, support, personalization, or service quality without clutter.",
      premiumSpecItems: ["Refined presentation", "Editable product story", "Premium support", "Ready to publish"],
      collection: "Collection",
      provenance: "Provenance",
      privateInquiry: "Private inquiry",
      viewCollection: "View collection",
      requestPrivateViewing: "Request private viewing",
      priceOnRequest: "Price on request",
      limitedPiece: "Limited piece",
      authenticated: "Authenticated",
      privateService: "Private service",
      signaturePiece: "Signature piece",
      luxuryHeadline: (name) => `${name}: private pieces for selected clients`,
      luxurySubheadline: (description) => description || "A private showroom for high-ticket pieces with provenance, editorial presentation, and appointment-led inquiries.",
      luxurySignatureText: "Lead with one remarkable piece, the story behind it, and why it deserves private attention.",
      luxuryCollectionTitle: "Curated private collection",
      luxuryCollectionText: "Present limited pieces with stronger imagery, provenance cues, and a clear private inquiry path.",
      luxuryProvenanceTitle: "Provenance, authenticity and service",
      luxuryProvenanceText: "Luxury customers need confidence before they inquire. Use this section for sourcing, certification, materials, care and private support.",
      luxuryPrivateTitle: "A private appointment, handled with care",
      luxuryPrivateText: "Invite serious buyers to request availability, preferred piece, budget range, and contact method before a private follow-up.",
      luxuryContactTitle: "Request a private consultation",
      luxuryContactText: "Send the piece, occasion, preferred timing and contact method. A client advisor can respond with availability and next steps.",
      luxuryProofItems: ["Verified provenance", "Limited availability", "Private advisor", "Insured handling", "Secure inquiry", "Concierge follow-up"],
      luxuryCategories: ["Watches", "Jewelry", "Art", "Collectibles", "Private collection", "Limited pieces"],
      academy: "Academy",
      programs: "Programs",
      curriculum: "Curriculum",
      enroll: "Enroll",
      programsSlug: "/programs",
      curriculumSlug: "/curriculum",
      enrollSlug: "/enroll",
      courseAcademy: "Course academy",
      enrollNow: "Enroll now",
      viewCurriculum: "View curriculum",
      coursePrice: "Enrollment price",
      featuredProgram: "Featured program",
      beginnerFriendly: "Beginner friendly",
      certificateReady: "Certificate-ready",
      educationHeadline: (name) => `${name}: learn with a clear path`,
      educationSubheadline: (description) => description || "A premium academy website with courses, modules, outcomes, instructor trust and an enrollment path.",
      learningPathTitle: "A clear learning path from first lesson to result",
      learningPathText: "Show the roadmap, modules and milestones so students understand exactly how progress happens.",
      learningPathItems: ["Start with the foundation", "Practice with guided modules", "Apply the method", "Get feedback or support", "Complete the outcome", "Take the next step"],
      programsTitle: "Programs built around real outcomes",
      programsText: "Present courses, coaching packages, bootcamps or memberships with duration, level and enrollment CTAs.",
      outcomesTitle: "What students should be able to do",
      outcomesText: "Turn the course promise into concrete results, skills and confidence markers.",
      learningOutcomeItems: ["Clear skill progression", "Practical assignments", "Editable curriculum", "Student-ready proof", "Support notes", "Launch-ready offer"],
      instructorTitle: "Expert guidance, structured for action",
      instructorText: "Use this space for instructor credibility, teaching method, student support, certifications or community value.",
      instructorTrustItems: ["Expert-led lessons", "Structured modules", "Support path", "Student outcomes", "Flexible access", "Editable offer"],
      enrollmentTitle: "Ready to start learning?",
      enrollmentText: "Invite students to enroll, request access, ask about cohorts, or choose the right program.",
      educationCategories: ["Foundation", "Advanced", "Workshop", "Coaching", "Certification", "Membership"],
      educationDurations: ["4 weeks", "6 modules", "Live cohort", "Self-paced"],
      modules: "Modules",
      modulesSlug: "/modules",
      viewProducts: "View products",
      digitalPrice: "Price editable",
      digitalHeadline: (name) => `${name} digital products, ready for instant access`,
      digitalSubheadline: (description) => description || "A polished digital product store for courses, templates, software, memberships and downloadable packs.",
      digitalBundleTitle: "Digital offers built to sell",
      digitalBundleText: "Present products as clear bundles with instant access, deliverables, bonuses and support notes.",
      digitalModulesTitle: "What customers get inside",
      digitalModulesText: "Show modules, downloads, lessons, templates, licenses and support in a clean structure.",
      digitalModuleItems: ["Core training", "Downloadable resources", "Templates and tools", "Bonus material", "Access instructions", "Support notes"],
      digitalProofTitle: "Trust before checkout",
      digitalProofText: "Use proof, outcomes, guarantees or creator credibility to make the purchase feel safe.",
      digitalProofItems: ["Instant access", "Editable modules", "Clear license", "Support-ready", "Bundle value", "Simple checkout"],
      digitalAccessTitle: "Get access and start immediately",
      digitalAccessText: "After purchase or request, customers know exactly what they receive, how access works and where to get support.",
      digitalCategories: ["Course", "Template", "Toolkit", "Membership", "Software", "Bundle"],
      newDrop: "New drop",
      collections: "Collections",
      lookbook: "Lookbook",
      fashionHeadline: (name) => `${name} new drop`,
      fashionSubheadline: (description) => description || "A visual clothing store built around collections, styling, and quick shopping.",
      shopTheDrop: "Shop the drop",
      viewLookbook: "View lookbook",
      collectionsText: "Organize products by drop, fit, color, season, or collection.",
      dropStoryTitle: "Built for the way it is worn",
      dropStoryText: "Use this section to explain the mood, materials, fit, and visual story behind the collection.",
      lookbookText: "Show outfits, lifestyle moments, campaign photos, or product combinations that help customers imagine the look.",
      newArrivals: "New arrivals",
      newArrivalsText: "A shopping section for the current drop, best sellers, and pieces ready to buy.",
      fitGuideTitle: "Fit, sizes and styling",
      fitGuideText: "Give customers the confidence to choose the right size, material, fit, and complete look.",
      fitGuideItems: ["Size guide", "Fit notes", "Materials", "Complete the look"],
      jewelryCategories: ["Necklaces", "Bracelets", "Earrings", "Rings", "Gift sets", "Custom pieces"],
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
      menu: "Menu",
      specials: "Especiales",
      hoursLocation: "Horarios y ubicacion",
      orderNow: "Ordenar ahora",
      viewMenu: "Ver menu",
      menuSlug: "/menu",
      hoursSlug: "/horarios-ubicacion",
      menuPrice: "Precio del menu",
      restaurantHeadline: (name) => `${name}: menu claro y facil de ordenar`,
      restaurantSubheadline: (description) => description || "Pagina calida para restaurante con platos destacados, categorias de menu, especiales, horarios, ubicacion y pedido simple.",
      restaurantCategoriesTitle: "Explora el menu por categoria",
      restaurantCategoriesText: "Crea rutas rapidas hacia entradas, platos fuertes, bebidas, postres, especiales y favoritos.",
      restaurantCategories: ["Entradas", "Platos fuertes", "Bebidas", "Postres", "Especiales", "Favoritos"],
      restaurantSignatureTitle: "Platos destacados listos para pedir",
      restaurantSignatureText: "Muestra los platos, combos y favoritos que deberian venderse primero.",
      restaurantSpecialsTitle: "Especiales y combos",
      restaurantSpecialsText: "Usa esta seccion para almuerzos, combos familiares, happy hour, delivery o recomendaciones del chef.",
      restaurantSpecialItems: ["Recomendacion del chef", "Combo familiar", "Especial pickup", "Listo para delivery"],
      restaurantInfoTitle: "Horarios, ubicacion y opciones de servicio",
      restaurantInfoText: "Muestra horarios, pickup, delivery, consumo en local, zona de servicio y como debe ordenar el cliente.",
      restaurantInfoItems: ["Horarios", "Pickup", "Delivery", "En el local", "Catering", "Pedidos por WhatsApp"],
      restaurantOrderTitle: "Haz un pedido o pregunta",
      restaurantOrderText: "Envia platos preferidos, opcion de pickup o delivery y metodo de contacto. El negocio puede confirmar por telefono, WhatsApp o email.",
      clinicCare: "Cuidado personalizado",
      treatments: "Tratamientos",
      results: "Resultados",
      bookConsultation: "Agendar consulta",
      viewTreatments: "Ver tratamientos",
      consultationBased: "Segun consulta",
      popularTreatment: "Tratamiento popular",
      specialistLed: "Guiado por especialista",
      personalizedPlan: "Plan personalizado",
      clinicHeadline: (name) => `${name} cuida cada paso de tu tratamiento`,
      clinicSubheadline: (description) => description || "Una pagina profesional para clinicas y wellness enfocada en confianza, tratamientos, resultados, especialistas y reservas.",
      treatmentsTitle: "Tratamientos y servicios",
      treatmentsText: "Presenta los servicios que el cliente puede revisar, comparar y reservar con pasos claros.",
      carePathTitle: "Un camino claro desde la primera pregunta hasta la atencion",
      carePathText: "Muestra como la clinica evalua necesidades, recomienda el tratamiento correcto y da seguimiento.",
      carePathItems: ["Consulta inicial", "Plan personalizado", "Sesion de tratamiento", "Revision de progreso", "Guia de cuidado", "Proxima visita"],
      clinicTrustTitle: "Senales de confianza que el paciente busca",
      clinicTrustText: "Usa credenciales, seguridad, experiencia, expectativas claras y tiempos de respuesta.",
      clinicTrustItems: ["Guia especializada", "Proceso seguro", "Expectativas claras", "Consulta privada", "Cuidado posterior", "Respuesta rapida"],
      resultsTitle: "Resultados con expectativas reales",
      resultsText: "Usa esta seccion para antes/despues, notas de transformacion, casos o resultados esperados.",
      resultItems: ["Progreso visible", "Prueba antes/despues", "Plan personal", "Seguimiento", "Preparacion clara", "Cuidado posterior"],
      clinicTeamTitle: "Especialistas que guian el proceso",
      clinicTeamText: "Presenta al proveedor, estandares clinicos, certificaciones o filosofia de atencion.",
      clinicTeamItems: ["Equipo certificado", "Consulta primero", "Educacion al paciente", "Seguimiento"],
      clinicBookingTitle: "Agenda una consulta o haz una pregunta",
      clinicBookingText: "Envia el tratamiento, inquietud, horario preferido y metodo de contacto. La clinica confirma el siguiente paso.",
      clinicCategories: ["Estetica", "Wellness", "Dental", "Terapia", "Nutricion", "Consulta"],
      clinicDurations: ["Consulta 30 min", "Sesion 45 min", "Plan personal", "Seguimiento"],
      professionalFirm: "Firma profesional",
      scheduleConsultation: "Agendar consulta",
      confidential: "Confidencial",
      seniorAdvisor: "Asesor senior",
      caseReview: "Revision de caso",
      businessReady: "Listo para empresa",
      professionalHeadline: (name) => `${name} asesoria para decisiones importantes`,
      professionalSubheadline: (description) => description || "Una pagina profesional premium enfocada en confianza, areas de practica, proceso, pruebas y solicitudes de consulta.",
      practiceAreasTitle: "Areas de practica y servicios",
      practiceAreasText: "Muestra los servicios que el cliente puede revisar, comparar y solicitar con una ruta clara de consulta.",
      professionalProcessTitle: "Un proceso de asesoria claro",
      professionalProcessText: "Ayuda al cliente a entender como se revisa su situacion, se recomiendan pasos y se da seguimiento.",
      professionalProcessItems: ["Revision inicial", "Chequeo de documentos", "Llamada estrategica", "Plan de accion", "Seguimiento", "Asesoria continua"],
      professionalProofTitle: "Confianza antes del contacto",
      professionalProofText: "Usa credenciales, confidencialidad, expectativas de respuesta y estandares profesionales.",
      professionalProofItems: ["Proceso confidencial", "Revision senior", "Pasos claros", "Asesoria empresarial", "Soporte documental", "Contacto rapido"],
      professionalTeamTitle: "Asesores que manejan los detalles",
      professionalTeamText: "Presenta al abogado, contador, consultor o asesor y los estandares detras del servicio.",
      professionalTeamItems: ["Asesores expertos", "Consulta privada", "Documentacion clara", "Seguimiento"],
      professionalFaqTitle: "Preguntas antes de la consulta",
      professionalFaqItems: ["Que debo preparar?", "Como funciona la primera consulta?", "Pueden revisar documentos?", "Puede ser asesoria continua?"],
      professionalConsultationTitle: "Solicita una consulta o revision de documentos",
      professionalConsultationText: "Envia el servicio requerido, urgencia, horario preferido y metodo de contacto. La firma confirma el siguiente paso.",
      professionalCategories: ["Legal", "Impuestos", "Contabilidad", "Seguros", "Consultoria", "Compliance"],
      professionalEngagements: ["Revision inicial", "Revision documental", "Llamada estrategica", "Asesoria continua"],
      enterprisePlatform: "Plataforma empresarial",
      requestDemo: "Solicitar demo",
      viewSolutions: "Ver soluciones",
      solutions: "Soluciones",
      useCases: "Casos de uso",
      integrations: "Integraciones",
      customPlan: "Plan personalizado",
      enterpriseReady: "Listo para empresa",
      integrationReady: "Listo para integrar",
      roiFocused: "Enfocado en ROI",
      enterpriseHeadline: (name) => `${name} sistemas para que los equipos avancen mas rapido`,
      enterpriseSubheadline: (description) => description || "Una pagina B2B premium para software, automatizacion, integraciones, dashboards y servicios empresariales.",
      enterpriseSolutionsTitle: "Soluciones para equipos operativos",
      enterpriseSolutionsText: "Presenta productos, servicios o paquetes como soluciones de negocio con siguiente paso hacia demo.",
      enterpriseUseCasesTitle: "Casos de uso por flujo de trabajo",
      enterpriseUseCasesText: "Muestra como la solucion encaja en ventas, operaciones, soporte, finanzas, direccion o equipos de campo.",
      enterpriseUseCaseItems: ["Automatizar trabajo manual", "Centralizar reportes", "Conectar herramientas", "Mejorar visibilidad", "Reducir demoras", "Escalar operaciones"],
      enterpriseIntegrationsTitle: "Integraciones e implementacion",
      enterpriseIntegrationsText: "Da confianza tecnica con APIs, CRM, ERP, pagos, analitica y flujos de soporte.",
      enterpriseIntegrationItems: ["CRM", "ERP", "Pagos", "Analitica", "Soporte", "API personalizada"],
      enterpriseProofTitle: "Pruebas antes de la demo",
      enterpriseProofText: "Usa seguridad, implementacion, ROI, respuesta y soporte como senales de confianza.",
      enterpriseProofItems: ["Flujos seguros", "Soporte de implementacion", "Ruta clara de ROI", "Controles admin", "API lista", "Onboarding"],
      enterprisePricingTitle: "Paquetes para empezar simple y escalar",
      enterprisePricingText: "Usa esta area para paquetes starter, growth y enterprise sin mostrar costos internos.",
      enterpriseDemoTitle: "Agenda una demo o revision de solucion",
      enterpriseDemoText: "Envia tamano del equipo, herramientas actuales, problema del flujo y metodo de contacto.",
      enterpriseCategories: ["Automatizacion", "Analitica", "CRM", "Operaciones", "Integraciones", "Seguridad"],
      enterpriseTimelines: ["Demo primero", "Setup 2 semanas", "API lista", "Implementacion guiada"],
      industrialSupplier: "Proveedor industrial",
      requestQuote: "Solicitar cotizacion",
      viewSpecs: "Ver especificaciones",
      capabilities: "Capacidades",
      certifications: "Certificaciones",
      supplyChain: "Cadena de suministro",
      quoteRequired: "Cotizacion requerida",
      certified: "Certificado",
      bulkReady: "Listo por volumen",
      specReady: "Specs listas",
      moqReady: "MOQ listo",
      industrialHeadline: (name) => `${name} suministro para operaciones serias`,
      industrialSubheadline: (description) => description || "Pagina tecnica de proveedor industrial con cotizaciones, especificaciones, MOQ, tiempos de entrega, certificaciones y confianza B2B.",
      industrialCatalogTitle: "Productos tecnicos y suministro industrial",
      industrialCatalogText: "Presenta repuestos, equipos y materiales con datos que compras puede verificar antes de cotizar.",
      industrialCapabilitiesTitle: "Capacidades que compras necesita validar",
      industrialCapabilitiesText: "Muestra specs personalizadas, compras por volumen, sourcing, control de calidad y soporte recurrente.",
      industrialCapabilityItems: ["Specs personalizadas", "Ordenes por volumen", "Control de calidad", "Sourcing rapido", "Repuestos", "Soporte B2B"],
      industrialCertificationsTitle: "Certificaciones, calidad y documentacion",
      industrialCertificationsText: "Da confianza con documentacion, datos de seguridad, garantia y cumplimiento.",
      industrialCertificationItems: ["Docs ISO", "Specs de material", "Garantia", "Datos de seguridad", "Soporte compliance", "Trazabilidad"],
      industrialSupplyTitle: "Suministro y fulfillment",
      industrialSupplyText: "Explica tiempos, MOQ, flete y ordenes recurrentes de forma clara.",
      industrialSupplyItems: ["Tiempos de entrega", "Plan MOQ", "Soporte de flete", "Listo para almacen", "Sourcing", "Ordenes repetidas"],
      industrialQuoteTitle: "Solicita una cotizacion con especificaciones",
      industrialQuoteText: "Envia producto, cantidades, material, fecha limite y entrega. El proveedor responde con disponibilidad y precio.",
      industrialCategories: ["Maquinaria", "Repuestos", "Herramientas", "Seguridad", "Materiales", "Mantenimiento"],
      industrialLeadTimes: ["Cotizar primero", "Orden por volumen", "2-4 semanas", "Spec personalizada"],
      industrialMaterials: ["Acero", "Aluminio", "Compuesto", "Certificado"],
      solutionsSlug: "/soluciones",
      useCasesSlug: "/casos-de-uso",
      home: "Inicio",
      overview: "Vista general",
      products: "Productos",
      story: "Historia",
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
      deals: "Ofertas",
      categories: "Categorias",
      support: "Soporte",
      fastDelivery: "Entrega rapida",
      freeShipping: "Envio gratis",
      todayDeal: "Oferta del dia",
      marketplaceHeadline: (name) => `${name} marketplace`,
      shopDeals: "Ver ofertas",
      viewCategories: "Ver categorias",
      searchPlaceholder: "Buscar productos, marcas o categorias",
      dealTitle: "Productos listos para vender",
      dealText: "Borrador tipo marketplace con categorias, ofertas, calificaciones y productos listos para checkout.",
      shopByCategory: "Compra por categoria",
      categoryRailText: "Rutas rapidas para que el cliente compare productos sin perder tiempo.",
      todayDeals: "Ofertas de hoy",
      dealsText: "Filas de ofertas, productos destacados y descubrimiento rapido.",
      bestSellers: "Mas vendidos",
      whyBuyHere: "Por que comprar aqui",
      trustText: "Entrega clara, checkout seguro, soporte y devoluciones simples.",
      marketplaceCategories: ["Electronica", "Hogar", "Moda", "Belleza", "Deportes", "Ofertas"],
      listings: "Listings",
      areas: "Zonas",
      listingsSlug: "/listings",
      areasSlug: "/zonas",
      searchListings: "Buscar listings",
      viewListings: "Ver listings",
      inquireNow: "Consultar ahora",
      featuredListing: "Listing destacado",
      newListing: "Nuevo listing",
      availableNow: "Disponible",
      listingPrice: "Precio a consultar",
      listingHeadline: (name) => `Encuentra el listing ideal con ${name}`,
      listingSubheadline: () => "Busca propiedades, alquileres, autos o clasificados por ubicacion, precio, categoria y detalles.",
      listingSearchPlaceholder: "Buscar por ubicacion, tipo, precio o palabra clave",
      listingFiltersTitle: "Busca con filtros claros",
      listingFiltersText: "Ayuda al cliente a comparar por categoria, zona, precio y disponibilidad antes de consultar.",
      featuredListingsTitle: "Listings destacados",
      featuredListingsText: "Una seleccion pulida de listings activos con precio, ubicacion, detalles y CTA de consulta.",
      listingAreaTitle: "Explora las mejores zonas",
      listingAreaText: "Usa tarjetas de zona, notas de ubicacion o areas de servicio para que la busqueda sea clara.",
      listingTrustTitle: "Confianza antes de consultar",
      listingTrustText: "Muestra detalles verificados, contacto claro y disponibilidad actualizada.",
      listingContactTitle: "Pregunta por un listing",
      listingContactText: "Envia el listing, presupuesto, ubicacion y metodo de contacto. El negocio puede responder con disponibilidad o siguiente paso.",
      listingCategories: ["Casas", "Alquileres", "Comercial", "Terrenos", "Autos", "Destacados"],
      listingLocations: ["Centro", "Zona norte", "Distrito oeste", "Cerca de escuelas", "Frente al agua", "Zona comercial"],
      listingTrustItems: ["Detalles verificados", "Disponibilidad actualizada", "Precios claros", "Soporte local", "Respuesta rapida", "Comparacion simple"],
      company: "Empresa",
      services: "Servicios",
      process: "Proceso",
      servicesSlug: "/servicios",
      processSlug: "/empresa",
      requestConsultation: "Solicitar consulta",
      viewServices: "Ver servicios",
      corporateHeadline: (name) => `${name} presenta una empresa clara y confiable`,
      corporateSubheadline: (description) => description || "Una pagina profesional enfocada en claridad, servicios, confianza y contacto directo.",
      corporateServicesTitle: "Servicios y capacidades",
      corporateServicesText: "Una vista clara de lo que hace la empresa, a quien ayuda y que resultados puede entregar.",
      corporateProcessTitle: "Un proceso simple desde la primera conversacion hasta la entrega",
      corporateProcessText: "Muestra como la empresa entiende la necesidad, recomienda el camino correcto y entrega con responsabilidad.",
      corporateProcessItems: ["Entender el objetivo", "Planificar la solucion correcta", "Entregar con comunicacion clara", "Acompanar el proximo paso"],
      corporateProofTitle: "Construido sobre confianza y trabajo medible",
      corporateProofText: "Usa esta seccion para credibilidad, experiencia, certificaciones, tipos de clientes o estandares de trabajo.",
      corporateProofItems: ["Entrega confiable", "Comunicacion clara", "Estandares profesionales"],
      corporateContactText: "Envia un mensaje para hablar de servicios, disponibilidad, precios o un proyecto personalizado.",
      offer: "Oferta",
      benefits: "Beneficios",
      proof: "Prueba",
      faq: "Preguntas",
      offerSlug: "/oferta",
      proofSlug: "/prueba",
      claimOffer: "Empezar ahora",
      seeProof: "Ver prueba",
      funnelHeadline: (name) => `${name} convierte interes en clientes reales`,
      funnelSubheadline: (description) => description || "Una landing enfocada en una oferta clara, prueba y un siguiente paso directo.",
      funnelBenefitsTitle: "Por que esta oferta funciona",
      funnelBenefitsText: "Muestra los resultados principales para que el visitante entienda el valor antes de contactar.",
      funnelBenefitsItems: ["Promesa clara", "Siguiente paso simple", "Pensado para leads calificados", "Facil de editar", "Estructura con prueba", "Lanzamiento rapido"],
      funnelOfferTitle: "Todo lo necesario para dar el siguiente paso",
      funnelOfferText: "Presenta la oferta, paquete, consulta o servicio en una estructura enfocada en conversion.",
      funnelGuarantee: "Expectativas claras antes de que el cliente se comprometa.",
      funnelProofTitle: "Prueba que elimina dudas",
      funnelProofText: "Usa resultados, testimonios, estandares o antes/despues para crear confianza.",
      funnelProofItems: ["Resultado especifico para el cliente", "Proceso simple", "Respuesta rapida", "Conversacion clara sobre precios"],
      funnelFaqTitle: "Preguntas antes de empezar",
      funnelFaqItems: [
        { question: "Que pasa despues de enviar la solicitud?", answer: "El negocio responde con el proximo paso, cotizacion, cita o consulta." },
        { question: "La oferta se puede personalizar?", answer: "Si. La oferta, textos, secciones y ruta de contacto son editables." },
        { question: "Esto es una tienda?", answer: "No. Esta version esta enfocada en leads, solicitudes, reservas o cotizaciones." },
      ],
      funnelContactText: "Envia una solicitud y el negocio puede responder con el siguiente paso, cotizacion o detalles de reserva.",
      premiumHeadline: (name) => `Conoce ${name}`,
      premiumSubheadline: (description) => description || "Una experiencia de producto refinada, simple, segura y memorable.",
      premiumPrimary: "Explorar productos",
      premiumSecondary: "Ver historia",
      premiumStoryTitle: "Diseñado alrededor de los detalles",
      premiumStoryText: "Una historia de producto enfocada, con textos limpios, confianza visual y espacio para que cada beneficio se entienda.",
      premiumFeatureTitle: "Una experiencia protagonista",
      premiumFeatureText: "Usa esta sección para el beneficio principal, la historia de fabricación, la promesa de rendimiento o la razón más fuerte para comprar.",
      premiumGalleryTitle: "Selección curada",
      premiumGalleryText: "Un catálogo pequeño presentado con más cuidado, mejor jerarquía visual y valor claro.",
      premiumSpecsTitle: "Lo importante, fácil de comparar",
      premiumSpecsText: "Destaca materiales, garantía, entrega, soporte, personalización o calidad del servicio sin llenar la página de ruido.",
      premiumSpecItems: ["Presentación refinada", "Historia editable", "Soporte premium", "Listo para publicar"],
      collection: "Coleccion",
      provenance: "Provenance",
      privateInquiry: "Consulta privada",
      viewCollection: "Ver coleccion",
      requestPrivateViewing: "Solicitar cita privada",
      priceOnRequest: "Precio bajo consulta",
      limitedPiece: "Pieza limitada",
      authenticated: "Autenticada",
      privateService: "Servicio privado",
      signaturePiece: "Pieza protagonista",
      luxuryHeadline: (name) => `${name}: piezas exclusivas para clientes privados`,
      luxurySubheadline: (description) => description || "Un showroom privado para piezas de alto valor con provenance, presentacion editorial y consultas por cita.",
      luxurySignatureText: "Presenta una pieza protagonista, su historia y la razon por la que merece atencion privada.",
      luxuryCollectionTitle: "Coleccion privada curada",
      luxuryCollectionText: "Muestra piezas limitadas con mejor imagen, senales de autenticidad y ruta clara hacia consulta privada.",
      luxuryProvenanceTitle: "Provenance, autenticidad y servicio",
      luxuryProvenanceText: "El cliente de lujo necesita confianza antes de consultar. Usa esta seccion para origen, certificacion, materiales, cuidado y soporte privado.",
      luxuryPrivateTitle: "Una cita privada, manejada con cuidado",
      luxuryPrivateText: "Invita a compradores serios a solicitar disponibilidad, pieza preferida, rango de presupuesto y metodo de contacto.",
      luxuryContactTitle: "Solicita una consulta privada",
      luxuryContactText: "Envia la pieza, ocasion, horario preferido y metodo de contacto. Un asesor puede responder con disponibilidad y proximos pasos.",
      luxuryProofItems: ["Provenance verificada", "Disponibilidad limitada", "Asesor privado", "Manejo asegurado", "Consulta segura", "Seguimiento concierge"],
      luxuryCategories: ["Relojes", "Joyeria", "Arte", "Coleccionables", "Coleccion privada", "Piezas limitadas"],
      academy: "Academia",
      programs: "Programas",
      curriculum: "Curriculum",
      enroll: "Inscripcion",
      programsSlug: "/programas",
      curriculumSlug: "/curriculum",
      enrollSlug: "/inscripcion",
      courseAcademy: "Academia de cursos",
      enrollNow: "Inscribirme",
      viewCurriculum: "Ver curriculum",
      coursePrice: "Precio de inscripcion",
      featuredProgram: "Programa destacado",
      beginnerFriendly: "Ideal para empezar",
      certificateReady: "Con certificado",
      educationHeadline: (name) => `${name}: aprende con un camino claro`,
      educationSubheadline: (description) => description || "Una pagina de academia premium con cursos, modulos, resultados, confianza del instructor y ruta de inscripcion.",
      learningPathTitle: "Un camino claro desde la primera clase hasta el resultado",
      learningPathText: "Muestra el recorrido, modulos e hitos para que el estudiante entienda como va a avanzar.",
      learningPathItems: ["Empieza por la base", "Practica con modulos guiados", "Aplica el metodo", "Recibe soporte", "Completa el resultado", "Da el siguiente paso"],
      programsTitle: "Programas creados alrededor de resultados reales",
      programsText: "Presenta cursos, coaching, bootcamps o membresias con duracion, nivel y CTA de inscripcion.",
      outcomesTitle: "Lo que el estudiante debe lograr",
      outcomesText: "Convierte la promesa del curso en resultados, habilidades y senales claras de avance.",
      learningOutcomeItems: ["Progreso claro", "Practicas accionables", "Curriculum editable", "Prueba para estudiantes", "Notas de soporte", "Oferta lista para lanzar"],
      instructorTitle: "Guia experta, estructurada para actuar",
      instructorText: "Usa este espacio para credibilidad del instructor, metodo de ensenanza, soporte, certificaciones o valor de comunidad.",
      instructorTrustItems: ["Clases guiadas por expertos", "Modulos estructurados", "Ruta de soporte", "Resultados del estudiante", "Acceso flexible", "Oferta editable"],
      enrollmentTitle: "Listo para empezar a aprender?",
      enrollmentText: "Invita al estudiante a inscribirse, pedir acceso, consultar cohortes o elegir el programa correcto.",
      educationCategories: ["Base", "Avanzado", "Workshop", "Coaching", "Certificacion", "Membresia"],
      educationDurations: ["4 semanas", "6 modulos", "Cohorte en vivo", "A tu ritmo"],
      modules: "Modulos",
      modulesSlug: "/modulos",
      viewProducts: "Ver productos",
      digitalPrice: "Precio editable",
      digitalHeadline: (name) => `${name}: productos digitales con acceso inmediato`,
      digitalSubheadline: (description) => description || "Tienda pulida para cursos, plantillas, software, membresias y packs descargables.",
      digitalBundleTitle: "Ofertas digitales listas para vender",
      digitalBundleText: "Presenta productos como bundles claros con acceso inmediato, entregables, bonos y soporte.",
      digitalModulesTitle: "Que recibe el cliente",
      digitalModulesText: "Muestra modulos, descargas, lecciones, plantillas, licencias y soporte de forma clara.",
      digitalModuleItems: ["Entrenamiento principal", "Recursos descargables", "Plantillas y herramientas", "Material bonus", "Instrucciones de acceso", "Notas de soporte"],
      digitalProofTitle: "Confianza antes del checkout",
      digitalProofText: "Usa prueba social, resultados, garantia o autoridad del creador para que la compra se sienta segura.",
      digitalProofItems: ["Acceso inmediato", "Modulos editables", "Licencia clara", "Soporte listo", "Valor del bundle", "Checkout simple"],
      digitalAccessTitle: "Obtén acceso y empieza de inmediato",
      digitalAccessText: "Despues de comprar o solicitar, el cliente sabe exactamente que recibe, como entra y donde pide soporte.",
      digitalCategories: ["Curso", "Plantilla", "Toolkit", "Membresia", "Software", "Bundle"],
      newDrop: "Nuevo drop",
      collections: "Colecciones",
      lookbook: "Lookbook",
      fashionHeadline: (name) => `Nuevo drop de ${name}`,
      fashionSubheadline: (description) => description || "Una tienda visual de ropa pensada para colecciones, estilo y compra rápida.",
      shopTheDrop: "Comprar el drop",
      viewLookbook: "Ver lookbook",
      collectionsText: "Organiza productos por drop, fit, color, temporada o colección.",
      dropStoryTitle: "Diseñado para como se usa",
      dropStoryText: "Usa esta sección para explicar el mood, materiales, fit y la historia visual de la colección.",
      lookbookText: "Muestra outfits, momentos lifestyle, fotos de campaña o combinaciones para que el cliente imagine el look.",
      newArrivals: "Nuevas piezas",
      newArrivalsText: "Una sección de compra para el drop actual, más vendidos y piezas listas para vender.",
      fitGuideTitle: "Fit, tallas y estilo",
      fitGuideText: "Dale confianza al cliente para escoger talla, material, fit y completar el look.",
      fitGuideItems: ["Guía de tallas", "Notas de fit", "Materiales", "Completa el look"],
      jewelryCategories: ["Collares", "Pulseras", "Aretes y zarcillos", "Anillos", "Sets de regalo", "Piezas personalizadas"],
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
      menu: "Menu",
      specials: "Specialites",
      hoursLocation: "Horaires et adresse",
      orderNow: "Commander",
      viewMenu: "Voir le menu",
      menuSlug: "/menu",
      hoursSlug: "/horaires-adresse",
      menuPrice: "Prix du menu",
      restaurantHeadline: (name) => `${name}: un menu simple a commander`,
      restaurantSubheadline: (description) => description || "Un site restaurant chaleureux avec plats signature, categories de menu, offres, horaires, adresse et commande simple.",
      restaurantCategoriesTitle: "Explorer le menu par categorie",
      restaurantCategoriesText: "Creez des chemins rapides vers entrees, plats, boissons, desserts, offres et favoris.",
      restaurantCategories: ["Entrees", "Plats", "Boissons", "Desserts", "Specialites", "Choix du chef"],
      restaurantSignatureTitle: "Plats signature prets a commander",
      restaurantSignatureText: "Mettez en avant les plats, menus et favoris qui doivent vendre en premier.",
      restaurantSpecialsTitle: "Offres et menus",
      restaurantSpecialsText: "Utilisez cette section pour formules dejeuner, menus famille, happy hour, livraison ou recommandations du chef.",
      restaurantSpecialItems: ["Recommandation du chef", "Menu famille", "Offre pickup", "Pret pour livraison"],
      restaurantInfoTitle: "Horaires, adresse et options de service",
      restaurantInfoText: "Affichez horaires, retrait, livraison, sur place, zone desservie et comment commander.",
      restaurantInfoItems: ["Horaires", "Retrait", "Livraison", "Sur place", "Traiteur", "Commandes WhatsApp"],
      restaurantOrderTitle: "Commander ou poser une question",
      restaurantOrderText: "Envoyez les plats souhaites, retrait ou livraison et le contact prefere. L'entreprise peut confirmer par telephone, WhatsApp ou email.",
      clinicCare: "Soin personnalise",
      treatments: "Soins",
      results: "Resultats",
      bookConsultation: "Reserver une consultation",
      viewTreatments: "Voir les soins",
      consultationBased: "Selon consultation",
      popularTreatment: "Soin populaire",
      specialistLed: "Guide par specialiste",
      personalizedPlan: "Plan personnalise",
      clinicHeadline: (name) => `${name} accompagne chaque etape de votre soin`,
      clinicSubheadline: (description) => description || "Un site professionnel de clinique ou wellness axe sur la confiance, les soins, les resultats, les specialistes et la reservation.",
      treatmentsTitle: "Soins et services",
      treatmentsText: "Presentez les services que le client peut consulter, comparer et reserver clairement.",
      carePathTitle: "Un parcours clair de la premiere question au soin",
      carePathText: "Montrez comment la clinique evalue les besoins, recommande le bon soin et assure le suivi.",
      carePathItems: ["Consultation initiale", "Plan personnalise", "Session de soin", "Suivi des progres", "Conseils apres-soin", "Prochaine visite"],
      clinicTrustTitle: "Signaux de confiance attendus",
      clinicTrustText: "Ajoutez diplomes, securite, experience, attentes claires et delais de reponse.",
      clinicTrustItems: ["Guidage specialise", "Processus securise", "Attentes claires", "Consultation privee", "Apres-soin", "Reponse rapide"],
      resultsTitle: "Resultats avec attentes realistes",
      resultsText: "Utilisez cette section pour avant/apres, cas, notes de transformation ou resultats attendus.",
      resultItems: ["Progres visible", "Preuve avant/apres", "Plan personnel", "Suivi", "Preparation claire", "Apres-soin inclus"],
      clinicTeamTitle: "Specialistes qui guident le processus",
      clinicTeamText: "Presentez le praticien, les standards, certifications ou philosophie de soin.",
      clinicTeamItems: ["Equipe certifiee", "Consultation d'abord", "Education patient", "Suivi"],
      clinicBookingTitle: "Reserver ou poser une question",
      clinicBookingText: "Envoyez le soin, le besoin, l'horaire prefere et le contact. La clinique confirme la suite.",
      clinicCategories: ["Esthetique", "Wellness", "Dentaire", "Therapie", "Nutrition", "Consultation"],
      clinicDurations: ["Consultation 30 min", "Session 45 min", "Plan personnel", "Suivi pret"],
      professionalFirm: "Cabinet professionnel",
      scheduleConsultation: "Reserver une consultation",
      confidential: "Confidentiel",
      seniorAdvisor: "Conseiller senior",
      caseReview: "Analyse du dossier",
      businessReady: "Pret pour entreprise",
      professionalHeadline: (name) => `${name} vous guide dans les decisions importantes`,
      professionalSubheadline: (description) => description || "Un site professionnel premium axe sur la confiance, les services, le processus, les preuves et les demandes de consultation.",
      practiceAreasTitle: "Services et domaines d'expertise",
      practiceAreasText: "Presentez les services que les clients peuvent comprendre, comparer et demander clairement.",
      professionalProcessTitle: "Un processus de conseil clair",
      professionalProcessText: "Expliquez comment le cabinet analyse la situation, recommande les prochaines etapes et assure le suivi.",
      professionalProcessItems: ["Analyse initiale", "Verification documents", "Appel strategie", "Plan d'action", "Suivi", "Conseil continu"],
      professionalProofTitle: "Preuves avant la prise de contact",
      professionalProofText: "Ajoutez credentials, confidentialite, attentes de reponse et standards professionnels.",
      professionalProofItems: ["Processus confidentiel", "Analyse senior", "Etapes claires", "Conseil entreprise", "Support documents", "Contact rapide"],
      professionalTeamTitle: "Des conseillers qui gerent les details",
      professionalTeamText: "Presentez avocat, comptable, consultant ou conseiller et les standards du service.",
      professionalTeamItems: ["Conseillers experimentes", "Consultation privee", "Documentation claire", "Suivi"],
      professionalFaqTitle: "Questions avant la consultation",
      professionalFaqItems: ["Que dois-je preparer?", "Comment se passe la premiere consultation?", "Pouvez-vous analyser des documents?", "Peut-on faire un accompagnement continu?"],
      professionalConsultationTitle: "Demander une consultation ou analyse de documents",
      professionalConsultationText: "Envoyez le service requis, l'urgence, le moment prefere et le contact. Le cabinet confirme la suite.",
      professionalCategories: ["Juridique", "Fiscalite", "Comptabilite", "Assurance", "Conseil", "Conformite"],
      professionalEngagements: ["Analyse initiale", "Analyse documents", "Appel strategie", "Conseil continu"],
      enterprisePlatform: "Plateforme entreprise",
      requestDemo: "Demander une demo",
      viewSolutions: "Voir les solutions",
      solutions: "Solutions",
      useCases: "Cas d'usage",
      integrations: "Integrations",
      customPlan: "Plan personnalise",
      enterpriseReady: "Pret entreprise",
      integrationReady: "Pret integration",
      roiFocused: "Oriente ROI",
      enterpriseHeadline: (name) => `${name} aide les equipes a avancer plus vite`,
      enterpriseSubheadline: (description) => description || "Un site B2B premium pour logiciel, automatisation, integrations, dashboards et services entreprise.",
      enterpriseSolutionsTitle: "Solutions pour equipes operationnelles",
      enterpriseSolutionsText: "Presentez produits, services ou packages comme solutions business avec demande de demo.",
      enterpriseUseCasesTitle: "Cas d'usage par workflow",
      enterpriseUseCasesText: "Montrez comment la solution s'adapte aux ventes, operations, support, finance ou direction.",
      enterpriseUseCaseItems: ["Automatiser le travail manuel", "Centraliser les rapports", "Connecter les outils", "Ameliorer la visibilite", "Reduire les delais", "Scaler les operations"],
      enterpriseIntegrationsTitle: "Integrations et deploiement",
      enterpriseIntegrationsText: "Rassurez les acheteurs techniques avec APIs, CRM, ERP, paiements, analytics et support.",
      enterpriseIntegrationItems: ["CRM", "ERP", "Paiements", "Analytics", "Support", "API custom"],
      enterpriseProofTitle: "Preuves avant la demo",
      enterpriseProofText: "Utilisez securite, implementation, ROI, reponse et support comme preuves.",
      enterpriseProofItems: ["Workflows securises", "Support deploiement", "ROI clair", "Controles admin", "API prete", "Onboarding equipe"],
      enterprisePricingTitle: "Packages simples a scaler",
      enterprisePricingText: "Starter, growth et enterprise sans exposer les couts internes.",
      enterpriseDemoTitle: "Reserver une demo ou analyse solution",
      enterpriseDemoText: "Envoyez taille d'equipe, outils actuels, probleme workflow et contact.",
      enterpriseCategories: ["Automatisation", "Analytics", "CRM", "Operations", "Integrations", "Securite"],
      enterpriseTimelines: ["Demo d'abord", "Setup 2 semaines", "API prete", "Deploiement guide"],
      industrialSupplier: "Fournisseur industriel",
      requestQuote: "Demander un devis",
      viewSpecs: "Voir les specs",
      capabilities: "Capacites",
      certifications: "Certifications",
      supplyChain: "Supply chain",
      quoteRequired: "Devis requis",
      certified: "Certifie",
      bulkReady: "Pret volume",
      specReady: "Specs pretes",
      moqReady: "MOQ pret",
      industrialHeadline: (name) => `${name} fournitures pour operations serieuses`,
      industrialSubheadline: (description) => description || "Site fournisseur industriel technique avec devis, specs, MOQ, delais, certifications et confiance B2B.",
      industrialCatalogTitle: "Produits techniques et fournitures industrielles",
      industrialCatalogText: "Presentez pieces, equipements et materiaux avec specs verifiables avant devis.",
      industrialCapabilitiesTitle: "Capacites a verifier avant achat",
      industrialCapabilitiesText: "Montrez specs custom, commandes volume, sourcing, qualite et support recurrent.",
      industrialCapabilityItems: ["Specs custom", "Commandes volume", "Controle qualite", "Sourcing rapide", "Pieces rechange", "Support B2B"],
      industrialCertificationsTitle: "Certifications, qualite et documentation",
      industrialCertificationsText: "Rassurez avec docs, donnees securite, garantie et conformite.",
      industrialCertificationItems: ["Docs ISO", "Specs materiaux", "Garantie", "Donnees securite", "Support conformite", "Traçabilite"],
      industrialSupplyTitle: "Supply chain et fulfillment",
      industrialSupplyText: "Clarifiez delais, MOQ, fret et commandes recurrentes.",
      industrialSupplyItems: ["Delais", "Plan MOQ", "Support fret", "Pret entrepot", "Sourcing vendeur", "Commandes repetees"],
      industrialQuoteTitle: "Demander un devis avec specs",
      industrialQuoteText: "Envoyez produit, quantites, materiau, delai et livraison. Le fournisseur repond avec disponibilite et prix.",
      industrialCategories: ["Machines", "Pieces", "Outils", "Securite", "Materiaux", "Maintenance"],
      industrialLeadTimes: ["Devis d'abord", "Commande volume", "2-4 semaines", "Spec custom"],
      industrialMaterials: ["Acier", "Aluminium", "Composite", "Certifie"],
      solutionsSlug: "/solutions",
      useCasesSlug: "/cas-usage",
      home: "Accueil",
      overview: "Aperçu",
      products: "Produits",
      story: "Histoire",
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
      deals: "Offres",
      categories: "Categories",
      support: "Support",
      fastDelivery: "Livraison rapide",
      freeShipping: "Livraison gratuite",
      todayDeal: "Offre du jour",
      marketplaceHeadline: (name) => `Marketplace ${name}`,
      shopDeals: "Voir les offres",
      viewCategories: "Voir les categories",
      searchPlaceholder: "Rechercher produits, marques ou categories",
      dealTitle: "Selections pretes a vendre",
      dealText: "Brouillon marketplace avec categories, offres, notes et fiches produits pretes pour le checkout.",
      shopByCategory: "Acheter par categorie",
      categoryRailText: "Chemins rapides pour comparer les produits plus vite.",
      todayDeals: "Offres du jour",
      dealsText: "Rangees d'offres, produits mis en avant et decouverte rapide.",
      bestSellers: "Meilleures ventes",
      whyBuyHere: "Pourquoi acheter ici",
      trustText: "Livraison claire, paiement securise, support et retours simples.",
      marketplaceCategories: ["Electronique", "Maison", "Mode", "Beaute", "Sport", "Offres"],
      listings: "Annonces",
      areas: "Zones",
      listingsSlug: "/annonces",
      areasSlug: "/zones",
      searchListings: "Rechercher",
      viewListings: "Voir les annonces",
      inquireNow: "Demander",
      featuredListing: "Annonce en avant",
      newListing: "Nouvelle annonce",
      availableNow: "Disponible",
      listingPrice: "Prix sur demande",
      listingHeadline: (name) => `Trouvez la bonne annonce avec ${name}`,
      listingSubheadline: () => "Recherchez par localisation, prix, categorie et details avec un chemin de demande clair.",
      listingSearchPlaceholder: "Rechercher par lieu, type, prix ou mot-cle",
      listingFiltersTitle: "Rechercher avec les bons filtres",
      listingFiltersText: "Aidez les clients a comparer par categorie, zone, prix et disponibilite.",
      featuredListingsTitle: "Annonces en avant",
      featuredListingsText: "Une selection claire d'annonces actives avec prix, localisation, details et CTA.",
      listingAreaTitle: "Explorer les meilleures zones",
      listingAreaText: "Utilisez des cartes de zones et notes locales pour clarifier la recherche.",
      listingTrustTitle: "Confiance avant la demande",
      listingTrustText: "Affichez details verifies, contact clair et disponibilite mise a jour.",
      listingContactTitle: "Demander une annonce",
      listingContactText: "Envoyez l'annonce, le budget, la localisation et le contact prefere.",
      listingCategories: ["Maisons", "Locations", "Commercial", "Terrain", "Voitures", "En avant"],
      listingLocations: ["Centre", "Zone nord", "Quartier ouest", "Pres des ecoles", "Bord de l'eau", "Zone business"],
      listingTrustItems: ["Details verifies", "Disponibilite a jour", "Prix clairs", "Support local", "Reponse rapide", "Comparaison simple"],
      company: "Entreprise",
      services: "Services",
      process: "Processus",
      servicesSlug: "/services",
      processSlug: "/entreprise",
      requestConsultation: "Demander une consultation",
      viewServices: "Voir les services",
      corporateHeadline: (name) => `${name} presente une entreprise claire et fiable`,
      corporateSubheadline: (description) => description || "Un site professionnel centre sur la clarte, les services, la preuve et le contact direct.",
      corporateServicesTitle: "Services et capacites",
      corporateServicesText: "Un apercu clair de ce que fait l'entreprise, des clients aides et des resultats attendus.",
      corporateProcessTitle: "Un processus simple du premier echange a la livraison",
      corporateProcessText: "Montrez comment l'entreprise comprend le besoin, recommande la bonne approche et livre avec responsabilite.",
      corporateProcessItems: ["Comprendre l'objectif", "Planifier la bonne solution", "Livrer avec une communication claire", "Accompagner la suite"],
      corporateProofTitle: "Construit sur la confiance et un travail mesurable",
      corporateProofText: "Utilisez cette section pour la credibilite, l'experience, les certifications, les types de clients ou les standards.",
      corporateProofItems: ["Livraison fiable", "Communication claire", "Standards professionnels"],
      corporateContactText: "Envoyez un message pour discuter des services, disponibilites, prix ou d'un projet sur mesure.",
      offer: "Offre",
      benefits: "Benefices",
      proof: "Preuves",
      faq: "FAQ",
      offerSlug: "/offre",
      proofSlug: "/preuves",
      claimOffer: "Commencer",
      seeProof: "Voir les preuves",
      funnelHeadline: (name) => `${name} transforme l'interet en vrais clients`,
      funnelSubheadline: (description) => description || "Une landing centree sur une offre claire, des preuves et une prochaine etape directe.",
      funnelBenefitsTitle: "Pourquoi cette offre fonctionne",
      funnelBenefitsText: "Montrez les resultats importants pour que le visiteur comprenne la valeur avant de contacter.",
      funnelBenefitsItems: ["Promesse claire", "Prochaine etape simple", "Leads qualifies", "Facile a modifier", "Structure orientee preuves", "Lancement rapide"],
      funnelOfferTitle: "Tout pour passer a l'etape suivante",
      funnelOfferText: "Presentez l'offre, le forfait, la consultation ou le service dans une structure orientee conversion.",
      funnelGuarantee: "Des attentes claires avant l'engagement du client.",
      funnelProofTitle: "Des preuves qui reduisent le doute",
      funnelProofText: "Utilisez resultats, temoignages, standards ou avant/apres pour creer la confiance.",
      funnelProofItems: ["Resultat client specifique", "Processus simple", "Reponse rapide", "Discussion claire sur les prix"],
      funnelFaqTitle: "Questions avant de commencer",
      funnelFaqItems: [
        { question: "Que se passe-t-il apres la demande ?", answer: "L'entreprise repond avec la prochaine etape, le devis, le rendez-vous ou la consultation." },
        { question: "L'offre peut-elle etre personnalisee ?", answer: "Oui. L'offre, les textes, sections et contact sont modifiables." },
        { question: "Est-ce une boutique ?", answer: "Non. Cette version vise les leads, demandes, reservations ou devis." },
      ],
      funnelContactText: "Envoyez une demande et l'entreprise pourra repondre avec la prochaine etape, un devis ou une reservation.",
      premiumHeadline: (name) => `Découvrez ${name}`,
      premiumSubheadline: (description) => description || "Une expérience produit raffinée, simple, confiante et mémorable.",
      premiumPrimary: "Explorer les produits",
      premiumSecondary: "Voir l'histoire",
      premiumStoryTitle: "Conçu autour des détails",
      premiumStoryText: "Une histoire produit ciblée, avec un texte clair, une confiance discrète et assez d'espace pour chaque bénéfice.",
      premiumFeatureTitle: "Une expérience phare",
      premiumFeatureText: "Utilisez cette section pour le bénéfice signature, l'histoire de fabrication, la promesse de performance ou la meilleure raison d'acheter.",
      premiumGalleryTitle: "Sélection soignée",
      premiumGalleryText: "Un petit catalogue présenté avec plus de soin, une meilleure hiérarchie visuelle et une valeur claire.",
      premiumSpecsTitle: "L'essentiel, facile à comparer",
      premiumSpecsText: "Mettez en avant matériaux, garantie, livraison, support, personnalisation ou qualité de service sans surcharge.",
      premiumSpecItems: ["Présentation raffinée", "Histoire modifiable", "Support premium", "Prêt à publier"],
      academy: "Academie",
      programs: "Programmes",
      curriculum: "Programme",
      enroll: "Inscription",
      programsSlug: "/programmes",
      curriculumSlug: "/programme",
      enrollSlug: "/inscription",
      courseAcademy: "Academie de cours",
      enrollNow: "S'inscrire",
      viewCurriculum: "Voir le programme",
      coursePrice: "Prix d'inscription",
      featuredProgram: "Programme phare",
      beginnerFriendly: "Pour debuter",
      certificateReady: "Certificat pret",
      educationHeadline: (name) => `${name}: apprendre avec un parcours clair`,
      educationSubheadline: (description) => description || "Un site d'academie premium avec cours, modules, resultats, credibilite de l'instructeur et inscription.",
      learningPathTitle: "Un parcours clair de la premiere lecon au resultat",
      learningPathText: "Montrez les modules, jalons et etapes pour que l'etudiant comprenne sa progression.",
      learningPathItems: ["Bases", "Pratique guidee", "Application", "Support", "Resultat", "Prochaine etape"],
      programsTitle: "Programmes construits autour de resultats reels",
      programsText: "Presentez cours, coaching, bootcamps ou abonnements avec duree, niveau et CTA.",
      outcomesTitle: "Ce que l'etudiant doit savoir faire",
      outcomesText: "Transformez la promesse du cours en resultats, competences et signaux de progression.",
      learningOutcomeItems: ["Progression claire", "Exercices pratiques", "Programme modifiable", "Preuve etudiante", "Notes support", "Offre prete"],
      instructorTitle: "Guidage expert, structure pour agir",
      instructorText: "Utilisez cet espace pour la credibilite, la methode, le support ou la communaute.",
      instructorTrustItems: ["Cours experts", "Modules structures", "Parcours support", "Resultats etudiants", "Acces flexible", "Offre modifiable"],
      enrollmentTitle: "Pret a commencer?",
      enrollmentText: "Invitez l'etudiant a s'inscrire, demander l'acces, poser une question ou choisir le bon programme.",
      educationCategories: ["Bases", "Avance", "Workshop", "Coaching", "Certification", "Abonnement"],
      educationDurations: ["4 semaines", "6 modules", "Cohorte live", "A son rythme"],
      modules: "Modules",
      modulesSlug: "/modules",
      viewProducts: "Voir les produits",
      digitalPrice: "Prix modifiable",
      digitalHeadline: (name) => `${name}: produits digitaux avec acces immediat`,
      digitalSubheadline: (description) => description || "Boutique soignee pour cours, templates, logiciel, abonnements et packs telechargeables.",
      digitalBundleTitle: "Offres digitales pretes a vendre",
      digitalBundleText: "Presentez les produits en bundles clairs avec acces immediat, livrables, bonus et support.",
      digitalModulesTitle: "Ce que le client recoit",
      digitalModulesText: "Affichez modules, telechargements, lecons, templates, licences et support dans une structure claire.",
      digitalModuleItems: ["Formation principale", "Ressources telechargeables", "Templates et outils", "Bonus", "Instructions d'acces", "Notes de support"],
      digitalProofTitle: "Confiance avant le paiement",
      digitalProofText: "Utilisez preuves, resultats, garantie ou credibilite du createur pour rassurer l'achat.",
      digitalProofItems: ["Acces immediat", "Modules modifiables", "Licence claire", "Support pret", "Valeur du bundle", "Paiement simple"],
      digitalAccessTitle: "Obtenir l'acces et commencer tout de suite",
      digitalAccessText: "Apres achat ou demande, le client sait exactement ce qu'il recoit, comment acceder et ou demander support.",
      digitalCategories: ["Cours", "Template", "Toolkit", "Abonnement", "Logiciel", "Bundle"],
      newDrop: "Nouveau drop",
      collections: "Collections",
      lookbook: "Lookbook",
      fashionHeadline: (name) => `Nouveau drop ${name}`,
      fashionSubheadline: (description) => description || "Une boutique mode visuelle construite autour des collections, du style et de l'achat rapide.",
      shopTheDrop: "Acheter le drop",
      viewLookbook: "Voir le lookbook",
      collectionsText: "Organisez les produits par drop, coupe, couleur, saison ou collection.",
      dropStoryTitle: "Pensé pour être porté",
      dropStoryText: "Utilisez cette section pour expliquer l'ambiance, les matières, la coupe et l'histoire visuelle de la collection.",
      lookbookText: "Montrez des tenues, moments lifestyle, photos de campagne ou combinaisons de produits.",
      newArrivals: "Nouveautés",
      newArrivalsText: "Une section shopping pour le drop actuel, les meilleures ventes et les pièces prêtes à acheter.",
      fitGuideTitle: "Coupe, tailles et style",
      fitGuideText: "Aidez les clients à choisir la bonne taille, matière, coupe et tenue complète.",
      fitGuideItems: ["Guide tailles", "Notes coupe", "Matières", "Composer le look"],
      jewelryCategories: ["Colliers", "Bracelets", "Boucles d'oreilles", "Bagues", "Coffrets cadeau", "Pieces personnalisees"],
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
      menu: "Menu",
      specials: "Especiais",
      hoursLocation: "Horarios e localizacao",
      orderNow: "Pedir agora",
      viewMenu: "Ver menu",
      menuSlug: "/menu",
      hoursSlug: "/horarios-localizacao",
      menuPrice: "Preco do menu",
      restaurantHeadline: (name) => `${name}: menu claro e facil de pedir`,
      restaurantSubheadline: (description) => description || "Site acolhedor para restaurante com pratos destaque, categorias, especiais, horarios, localizacao e pedido simples.",
      restaurantCategoriesTitle: "Explore o menu por categoria",
      restaurantCategoriesText: "Crie caminhos rapidos para entradas, pratos principais, bebidas, sobremesas, especiais e favoritos.",
      restaurantCategories: ["Entradas", "Pratos principais", "Bebidas", "Sobremesas", "Especiais", "Chef indica"],
      restaurantSignatureTitle: "Pratos destaque prontos para pedir",
      restaurantSignatureText: "Mostre pratos, combos e favoritos que devem vender primeiro.",
      restaurantSpecialsTitle: "Especiais e combos",
      restaurantSpecialsText: "Use esta secao para almocos, combos familiares, happy hour, delivery ou indicacoes do chef.",
      restaurantSpecialItems: ["Indicacao do chef", "Combo familia", "Especial pickup", "Pronto para delivery"],
      restaurantInfoTitle: "Horarios, localizacao e servico",
      restaurantInfoText: "Mostre horarios, retirada, delivery, consumo no local, area atendida e como o cliente deve pedir.",
      restaurantInfoItems: ["Horarios", "Pickup", "Delivery", "No local", "Catering", "Pedidos por WhatsApp"],
      restaurantOrderTitle: "Fazer pedido ou perguntar",
      restaurantOrderText: "Envie os pratos desejados, opcao de pickup ou delivery e metodo de contato. O negocio pode confirmar por telefone, WhatsApp ou email.",
      clinicCare: "Cuidado personalizado",
      treatments: "Tratamentos",
      results: "Resultados",
      bookConsultation: "Agendar consulta",
      viewTreatments: "Ver tratamentos",
      consultationBased: "Sob consulta",
      popularTreatment: "Tratamento popular",
      specialistLed: "Com especialista",
      personalizedPlan: "Plano personalizado",
      clinicHeadline: (name) => `${name} cuida de cada etapa do seu tratamento`,
      clinicSubheadline: (description) => description || "Um site profissional de clinica ou wellness focado em confianca, tratamentos, resultados, especialistas e agendamento.",
      treatmentsTitle: "Tratamentos e servicos",
      treatmentsText: "Apresente os servicos que o cliente pode revisar, comparar e agendar com passos claros.",
      carePathTitle: "Um caminho claro da primeira pergunta ao cuidado",
      carePathText: "Mostre como a clinica avalia necessidades, recomenda o tratamento certo e acompanha o cliente.",
      carePathItems: ["Consulta inicial", "Plano personalizado", "Sessao de tratamento", "Revisao de progresso", "Orientacao pos-cuidado", "Proxima visita"],
      clinicTrustTitle: "Sinais de confianca para o paciente",
      clinicTrustText: "Use credenciais, seguranca, experiencia, expectativas claras e tempos de resposta.",
      clinicTrustItems: ["Guia especializada", "Processo seguro", "Expectativas claras", "Consulta privada", "Pos-cuidado", "Resposta rapida"],
      resultsTitle: "Resultados com expectativas reais",
      resultsText: "Use esta secao para antes/depois, notas de transformacao, casos ou resultados esperados.",
      resultItems: ["Progresso visivel", "Prova antes/depois", "Plano pessoal", "Acompanhamento", "Preparacao clara", "Pos-cuidado incluso"],
      clinicTeamTitle: "Especialistas que guiam o processo",
      clinicTeamText: "Apresente o profissional, padroes clinicos, certificacoes ou filosofia de cuidado.",
      clinicTeamItems: ["Equipe certificada", "Consulta primeiro", "Educacao do paciente", "Acompanhamento"],
      clinicBookingTitle: "Agende uma consulta ou pergunte",
      clinicBookingText: "Envie o tratamento, duvida, horario preferido e metodo de contato. A clinica confirma o proximo passo.",
      clinicCategories: ["Estetica", "Wellness", "Dental", "Terapia", "Nutricao", "Consulta"],
      clinicDurations: ["Consulta 30 min", "Sessao 45 min", "Plano pessoal", "Acompanhamento"],
      professionalFirm: "Firma profissional",
      scheduleConsultation: "Agendar consulta",
      confidential: "Confidencial",
      seniorAdvisor: "Consultor senior",
      caseReview: "Revisao do caso",
      businessReady: "Pronto para empresa",
      professionalHeadline: (name) => `${name} orienta decisoes importantes`,
      professionalSubheadline: (description) => description || "Um site profissional premium focado em confianca, areas de servico, processo, provas e pedidos de consulta.",
      practiceAreasTitle: "Areas de atuacao e servicos",
      practiceAreasText: "Mostre os servicos que o cliente pode revisar, comparar e solicitar com uma rota clara de consulta.",
      professionalProcessTitle: "Um processo de consultoria claro",
      professionalProcessText: "Ajude o cliente a entender como a firma revisa a situacao, recomenda proximos passos e acompanha.",
      professionalProcessItems: ["Revisao inicial", "Analise documental", "Chamada estrategica", "Plano de acao", "Acompanhamento", "Consultoria continua"],
      professionalProofTitle: "Confianca antes do contato",
      professionalProofText: "Use credenciais, confidencialidade, expectativas de resposta e padroes profissionais.",
      professionalProofItems: ["Processo confidencial", "Revisao senior", "Passos claros", "Consultoria empresarial", "Suporte documental", "Contato rapido"],
      professionalTeamTitle: "Consultores que cuidam dos detalhes",
      professionalTeamText: "Apresente advogado, contador, consultor ou assessor e os padroes do servico.",
      professionalTeamItems: ["Consultores experientes", "Consulta privada", "Documentacao clara", "Acompanhamento"],
      professionalFaqTitle: "Perguntas antes da consulta",
      professionalFaqItems: ["O que devo preparar?", "Como funciona a primeira consulta?", "Podem revisar documentos?", "Pode virar consultoria continua?"],
      professionalConsultationTitle: "Solicite uma consulta ou revisao documental",
      professionalConsultationText: "Envie o servico requerido, urgencia, horario preferido e metodo de contato. A firma confirma o proximo passo.",
      professionalCategories: ["Juridico", "Impostos", "Contabilidade", "Seguros", "Consultoria", "Compliance"],
      professionalEngagements: ["Revisao inicial", "Revisao documental", "Chamada estrategica", "Consultoria continua"],
      enterprisePlatform: "Plataforma empresarial",
      requestDemo: "Solicitar demo",
      viewSolutions: "Ver solucoes",
      solutions: "Solucoes",
      useCases: "Casos de uso",
      integrations: "Integracoes",
      customPlan: "Plano personalizado",
      enterpriseReady: "Pronto para empresa",
      integrationReady: "Pronto para integrar",
      roiFocused: "Focado em ROI",
      enterpriseHeadline: (name) => `${name} sistemas para equipes avancarem mais rapido`,
      enterpriseSubheadline: (description) => description || "Um site B2B premium para software, automacao, integracoes, dashboards e servicos empresariais.",
      enterpriseSolutionsTitle: "Solucoes para equipes operacionais",
      enterpriseSolutionsText: "Apresente produtos, servicos ou pacotes como solucoes de negocio com proximo passo para demo.",
      enterpriseUseCasesTitle: "Casos de uso por workflow",
      enterpriseUseCasesText: "Mostre como a solucao se encaixa em vendas, operacoes, suporte, financeiro ou lideranca.",
      enterpriseUseCaseItems: ["Automatizar trabalho manual", "Centralizar relatorios", "Conectar ferramentas", "Melhorar visibilidade", "Reduzir atrasos", "Escalar operacoes"],
      enterpriseIntegrationsTitle: "Integracoes e implementacao",
      enterpriseIntegrationsText: "De confianca tecnica com APIs, CRM, ERP, pagamentos, analytics e suporte.",
      enterpriseIntegrationItems: ["CRM", "ERP", "Pagamentos", "Analytics", "Suporte", "API custom"],
      enterpriseProofTitle: "Provas antes da demo",
      enterpriseProofText: "Use seguranca, implementacao, ROI, resposta e suporte como sinais de confianca.",
      enterpriseProofItems: ["Workflows seguros", "Suporte de implementacao", "ROI claro", "Controles admin", "API pronta", "Onboarding"],
      enterprisePricingTitle: "Pacotes para comecar simples e escalar",
      enterprisePricingText: "Use starter, growth e enterprise sem expor custos internos.",
      enterpriseDemoTitle: "Agende uma demo ou revisao da solucao",
      enterpriseDemoText: "Envie tamanho da equipe, ferramentas atuais, problema do fluxo e contato.",
      enterpriseCategories: ["Automacao", "Analytics", "CRM", "Operacoes", "Integracoes", "Seguranca"],
      enterpriseTimelines: ["Demo primeiro", "Setup 2 semanas", "API pronta", "Implementacao guiada"],
      industrialSupplier: "Fornecedor industrial",
      requestQuote: "Solicitar cotacao",
      viewSpecs: "Ver especificacoes",
      capabilities: "Capacidades",
      certifications: "Certificacoes",
      supplyChain: "Cadeia de suprimentos",
      quoteRequired: "Cotacao requerida",
      certified: "Certificado",
      bulkReady: "Pronto para volume",
      specReady: "Specs prontas",
      moqReady: "MOQ pronto",
      industrialHeadline: (name) => `${name} suprimentos para operacoes serias`,
      industrialSubheadline: (description) => description || "Site tecnico de fornecedor industrial com cotacoes, especificacoes, MOQ, prazos, certificacoes e confianca B2B.",
      industrialCatalogTitle: "Produtos tecnicos e suprimento industrial",
      industrialCatalogText: "Apresente pecas, equipamentos e materiais com dados que compras pode verificar antes de cotar.",
      industrialCapabilitiesTitle: "Capacidades que compras precisa validar",
      industrialCapabilitiesText: "Mostre specs customizadas, compras em volume, sourcing, controle de qualidade e suporte recorrente.",
      industrialCapabilityItems: ["Specs customizadas", "Pedidos em volume", "Controle de qualidade", "Sourcing rapido", "Pecas reposicao", "Suporte B2B"],
      industrialCertificationsTitle: "Certificacoes, qualidade e documentacao",
      industrialCertificationsText: "De confianca com documentacao, dados de seguranca, garantia e compliance.",
      industrialCertificationItems: ["Docs ISO", "Specs de material", "Garantia", "Dados seguranca", "Suporte compliance", "Rastreabilidade"],
      industrialSupplyTitle: "Suprimentos e fulfillment",
      industrialSupplyText: "Explique prazos, MOQ, frete e pedidos recorrentes com clareza.",
      industrialSupplyItems: ["Prazos", "Planejamento MOQ", "Suporte frete", "Pronto para estoque", "Sourcing", "Pedidos repetidos"],
      industrialQuoteTitle: "Solicite cotacao com especificacoes",
      industrialQuoteText: "Envie produto, quantidades, material, prazo e entrega. O fornecedor responde com disponibilidade e preco.",
      industrialCategories: ["Maquinas", "Pecas", "Ferramentas", "Seguranca", "Materiais", "Manutencao"],
      industrialLeadTimes: ["Cotar primeiro", "Pedido volume", "2-4 semanas", "Spec custom"],
      industrialMaterials: ["Aco", "Aluminio", "Composto", "Certificado"],
      solutionsSlug: "/solucoes",
      useCasesSlug: "/casos-de-uso",
      home: "Início",
      overview: "Visão geral",
      products: "Produtos",
      story: "História",
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
      deals: "Ofertas",
      categories: "Categorias",
      support: "Suporte",
      fastDelivery: "Entrega rapida",
      freeShipping: "Frete gratis",
      todayDeal: "Oferta do dia",
      marketplaceHeadline: (name) => `${name} marketplace`,
      shopDeals: "Ver ofertas",
      viewCategories: "Ver categorias",
      searchPlaceholder: "Buscar produtos, marcas ou categorias",
      dealTitle: "Produtos prontos para vender",
      dealText: "Rascunho tipo marketplace com categorias, ofertas, avaliacoes e cards prontos para checkout.",
      shopByCategory: "Comprar por categoria",
      categoryRailText: "Caminhos rapidos para o cliente comparar produtos.",
      todayDeals: "Ofertas de hoje",
      dealsText: "Linhas de ofertas, produtos em destaque e descoberta rapida.",
      bestSellers: "Mais vendidos",
      whyBuyHere: "Por que comprar aqui",
      trustText: "Entrega clara, checkout seguro, suporte e devolucoes simples.",
      marketplaceCategories: ["Eletronicos", "Casa", "Moda", "Beleza", "Esportes", "Ofertas"],
      listings: "Anuncios",
      areas: "Areas",
      listingsSlug: "/anuncios",
      areasSlug: "/areas",
      searchListings: "Buscar anuncios",
      viewListings: "Ver anuncios",
      inquireNow: "Consultar agora",
      featuredListing: "Anuncio destaque",
      newListing: "Novo anuncio",
      availableNow: "Disponivel",
      listingPrice: "Preco sob consulta",
      listingHeadline: (name) => `Encontre o anuncio ideal com ${name}`,
      listingSubheadline: () => "Busque imoveis, alugueis, carros ou classificados por localizacao, preco, categoria e detalhes.",
      listingSearchPlaceholder: "Buscar por localizacao, tipo, preco ou palavra-chave",
      listingFiltersTitle: "Busca com filtros claros",
      listingFiltersText: "Ajude o cliente a comparar por categoria, area, preco e disponibilidade.",
      featuredListingsTitle: "Anuncios em destaque",
      featuredListingsText: "Uma selecao de anuncios ativos com preco, localizacao, detalhes e CTA de consulta.",
      listingAreaTitle: "Explore as melhores areas",
      listingAreaText: "Use cards de area e notas locais para deixar a busca clara.",
      listingTrustTitle: "Confianca antes da consulta",
      listingTrustText: "Mostre detalhes verificados, contato claro e disponibilidade atualizada.",
      listingContactTitle: "Perguntar sobre um anuncio",
      listingContactText: "Envie o anuncio, orcamento, localizacao e metodo de contato preferido.",
      listingCategories: ["Casas", "Alugueis", "Comercial", "Terrenos", "Carros", "Destaques"],
      listingLocations: ["Centro", "Zona norte", "Distrito oeste", "Perto de escolas", "Frente a agua", "Zona comercial"],
      listingTrustItems: ["Detalhes verificados", "Disponibilidade atualizada", "Precos claros", "Suporte local", "Resposta rapida", "Comparacao simples"],
      company: "Empresa",
      services: "Servicos",
      process: "Processo",
      servicesSlug: "/servicos",
      processSlug: "/empresa",
      requestConsultation: "Solicitar consulta",
      viewServices: "Ver servicos",
      corporateHeadline: (name) => `${name} apresenta uma empresa clara e confiavel`,
      corporateSubheadline: (description) => description || "Um site profissional focado em clareza, servicos, prova e contato direto.",
      corporateServicesTitle: "Servicos e capacidades",
      corporateServicesText: "Uma visao clara do que a empresa faz, quem ajuda e quais resultados pode entregar.",
      corporateProcessTitle: "Um processo simples da primeira conversa ate a entrega",
      corporateProcessText: "Mostre como a empresa entende a necessidade, recomenda o caminho certo e entrega com responsabilidade.",
      corporateProcessItems: ["Entender o objetivo", "Planejar a solucao certa", "Entregar com comunicacao clara", "Apoiar o proximo passo"],
      corporateProofTitle: "Construido com confianca e trabalho mensuravel",
      corporateProofText: "Use esta secao para credibilidade, experiencia, certificacoes, tipos de clientes ou padroes de trabalho.",
      corporateProofItems: ["Entrega confiavel", "Comunicacao clara", "Padroes profissionais"],
      corporateContactText: "Envie uma mensagem para falar sobre servicos, disponibilidade, precos ou um projeto personalizado.",
      offer: "Oferta",
      benefits: "Beneficios",
      proof: "Prova",
      faq: "FAQ",
      offerSlug: "/oferta",
      proofSlug: "/prova",
      claimOffer: "Comecar agora",
      seeProof: "Ver prova",
      funnelHeadline: (name) => `${name} transforma interesse em clientes reais`,
      funnelSubheadline: (description) => description || "Uma landing focada em uma oferta clara, prova e proximo passo direto.",
      funnelBenefitsTitle: "Por que esta oferta funciona",
      funnelBenefitsText: "Mostre os resultados principais para que o visitante entenda o valor antes de entrar em contato.",
      funnelBenefitsItems: ["Promessa clara", "Proximo passo simples", "Feito para leads qualificados", "Facil de editar", "Estrutura com prova", "Lancamento rapido"],
      funnelOfferTitle: "Tudo para dar o proximo passo",
      funnelOfferText: "Apresente a oferta, pacote, consulta ou servico em uma estrutura focada em conversao.",
      funnelGuarantee: "Expectativas claras antes do cliente se comprometer.",
      funnelProofTitle: "Prova que reduz duvidas",
      funnelProofText: "Use resultados, depoimentos, padroes ou antes/depois para criar confianca.",
      funnelProofItems: ["Resultado especifico para o cliente", "Processo simples", "Resposta rapida", "Conversa clara sobre preco"],
      funnelFaqTitle: "Perguntas antes de comecar",
      funnelFaqItems: [
        { question: "O que acontece depois de enviar a solicitacao?", answer: "O negocio responde com o proximo passo, orcamento, agendamento ou consulta." },
        { question: "A oferta pode ser personalizada?", answer: "Sim. A oferta, textos, secoes e caminho de contato sao editaveis." },
        { question: "Isso e uma loja?", answer: "Nao. Esta versao foca em leads, solicitacoes, reservas ou orcamentos." },
      ],
      funnelContactText: "Envie uma solicitacao e o negocio pode responder com o proximo passo, orcamento ou detalhes de agendamento.",
      premiumHeadline: (name) => `Conheça ${name}`,
      premiumSubheadline: (description) => description || "Uma experiência de produto refinada, simples, confiante e memorável.",
      premiumPrimary: "Explorar produtos",
      premiumSecondary: "Ver história",
      premiumStoryTitle: "Criado em torno dos detalhes",
      premiumStoryText: "Uma história de produto focada, com texto limpo, confiança visual e espaço para cada benefício aparecer.",
      premiumFeatureTitle: "Uma experiência principal",
      premiumFeatureText: "Use esta seção para o benefício principal, história de fabricação, promessa de desempenho ou motivo mais forte para comprar.",
      premiumGalleryTitle: "Seleção curada",
      premiumGalleryText: "Um catálogo menor apresentado com mais cuidado, melhor hierarquia visual e valor claro.",
      premiumSpecsTitle: "O importante, fácil de comparar",
      premiumSpecsText: "Destaque materiais, garantia, entrega, suporte, personalização ou qualidade do serviço sem poluir a página.",
      premiumSpecItems: ["Apresentação refinada", "História editável", "Suporte premium", "Pronto para publicar"],
      academy: "Academia",
      programs: "Programas",
      curriculum: "Curriculo",
      enroll: "Inscricao",
      programsSlug: "/programas",
      curriculumSlug: "/curriculo",
      enrollSlug: "/inscricao",
      courseAcademy: "Academia de cursos",
      enrollNow: "Inscrever-se",
      viewCurriculum: "Ver curriculo",
      coursePrice: "Preco de inscricao",
      featuredProgram: "Programa destaque",
      beginnerFriendly: "Para iniciantes",
      certificateReady: "Com certificado",
      educationHeadline: (name) => `${name}: aprenda com um caminho claro`,
      educationSubheadline: (description) => description || "Um site premium de academia com cursos, modulos, resultados, confianca do instrutor e inscricao.",
      learningPathTitle: "Um caminho claro da primeira aula ao resultado",
      learningPathText: "Mostre roteiro, modulos e marcos para que o aluno entenda como vai evoluir.",
      learningPathItems: ["Base", "Pratica guiada", "Aplicacao", "Suporte", "Resultado", "Proximo passo"],
      programsTitle: "Programas criados para resultados reais",
      programsText: "Apresente cursos, coaching, bootcamps ou assinaturas com duracao, nivel e CTA.",
      outcomesTitle: "O que o aluno deve conseguir fazer",
      outcomesText: "Transforme a promessa do curso em resultados, habilidades e sinais claros de progresso.",
      learningOutcomeItems: ["Progressao clara", "Atividades praticas", "Curriculo editavel", "Prova para alunos", "Notas de suporte", "Oferta pronta"],
      instructorTitle: "Guia especialista, estruturada para agir",
      instructorText: "Use este espaco para credibilidade, metodo, suporte, certificacoes ou comunidade.",
      instructorTrustItems: ["Aulas com especialista", "Modulos estruturados", "Caminho de suporte", "Resultados dos alunos", "Acesso flexivel", "Oferta editavel"],
      enrollmentTitle: "Pronto para comecar?",
      enrollmentText: "Convide o aluno a se inscrever, pedir acesso, consultar turmas ou escolher o programa certo.",
      educationCategories: ["Base", "Avancado", "Workshop", "Coaching", "Certificacao", "Assinatura"],
      educationDurations: ["4 semanas", "6 modulos", "Turma ao vivo", "No seu ritmo"],
      modules: "Modulos",
      modulesSlug: "/modulos",
      viewProducts: "Ver produtos",
      digitalPrice: "Preco editavel",
      digitalHeadline: (name) => `${name}: produtos digitais com acesso imediato`,
      digitalSubheadline: (description) => description || "Loja polida para cursos, templates, software, assinaturas e packs baixaveis.",
      digitalBundleTitle: "Ofertas digitais prontas para vender",
      digitalBundleText: "Apresente produtos como bundles claros com acesso imediato, entregaveis, bonus e suporte.",
      digitalModulesTitle: "O que o cliente recebe",
      digitalModulesText: "Mostre modulos, downloads, aulas, templates, licencas e suporte em uma estrutura clara.",
      digitalModuleItems: ["Treinamento principal", "Recursos baixaveis", "Templates e ferramentas", "Material bonus", "Instrucoes de acesso", "Notas de suporte"],
      digitalProofTitle: "Confianca antes do checkout",
      digitalProofText: "Use provas, resultados, garantia ou autoridade do criador para tornar a compra segura.",
      digitalProofItems: ["Acesso imediato", "Modulos editaveis", "Licenca clara", "Suporte pronto", "Valor do bundle", "Checkout simples"],
      digitalAccessTitle: "Obtenha acesso e comece agora",
      digitalAccessText: "Depois da compra ou solicitacao, o cliente sabe exatamente o que recebe, como acessar e onde pedir suporte.",
      digitalCategories: ["Curso", "Template", "Toolkit", "Assinatura", "Software", "Bundle"],
      newDrop: "Novo drop",
      collections: "Coleções",
      lookbook: "Lookbook",
      fashionHeadline: (name) => `Novo drop ${name}`,
      fashionSubheadline: (description) => description || "Uma loja visual de roupas feita para coleções, estilo e compra rápida.",
      shopTheDrop: "Comprar o drop",
      viewLookbook: "Ver lookbook",
      collectionsText: "Organize produtos por drop, caimento, cor, temporada ou coleção.",
      dropStoryTitle: "Criado para a forma de usar",
      dropStoryText: "Use esta seção para explicar o mood, materiais, caimento e história visual da coleção.",
      lookbookText: "Mostre looks, momentos lifestyle, fotos de campanha ou combinações de produtos.",
      newArrivals: "Novidades",
      newArrivalsText: "Uma seção de compra para o drop atual, mais vendidos e peças prontas para vender.",
      fitGuideTitle: "Caimento, tamanhos e estilo",
      fitGuideText: "Dê confiança ao cliente para escolher tamanho, material, caimento e completar o look.",
      fitGuideItems: ["Guia de tamanhos", "Notas de caimento", "Materiais", "Complete o look"],
      jewelryCategories: ["Colares", "Pulseiras", "Brincos", "Aneis", "Kits presente", "Pecas personalizadas"],
    },
  };
  return { ...copies.en, ...(copies[language] || {}) };
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

export function showGeneratedClientPreview() {
  if (!isPublicClientSetup) return;
  if (isEmbeddedClientSetup) {
    window.parent.postMessage({ type: "luma-generated-preview" }, "*");
  }
  document.body.classList.add("generated-preview-open", "client-preview-mode");
  document.body.classList.remove("review-details-open", "final-review-mode", "manual-form-open", "draft-adjust-open");
  syncLyraExperienceMode();
  guidedPanel.classList.remove("active");
  storageStatus.textContent = builderState.currentSiteId ? t("generatedOpenAI") : t("generatedOpenAI");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function submitGeneratedDraftForReview() {
  if (!builderState.currentSchema) {
    storageStatus.textContent = langText({ en: "Generate a draft first.", es: "Primero genera un borrador.", fr: "Générez d'abord un brouillon.", pt: "Gere primeiro um rascunho." });
    return;
  }
  if (!builderState.currentSiteId) {
    storageStatus.textContent = langText({
      en: "The fast draft is visible here, but it does not have a site_id for review yet.",
      es: "El borrador rapido se ve aqui, pero no tiene site_id para revisión todavía.",
      fr: "Le brouillon rapide est visible ici, mais il n'a pas encore de site_id pour révision.",
      pt: "O rascunho rápido está visível aqui, mas ainda não tem site_id para revisão.",
    });
    return;
  }
  const contact = builderState.guidedState.contactInfo || {};
  const customerName = builderState.guidedState.businessName || builderState.currentSchema.business?.name || "Client";
  const message = langText({
    en: `Client submitted draft for review.\nBusiness: ${customerName}\nIndustry: ${builderState.guidedState.industry || ""}\nDesired domain: ${builderState.guidedState.desiredDomain || ""}\nSite ID: ${builderState.currentSiteId}`,
    es: `Cliente envió borrador para revisión.\nNegocio: ${customerName}\nIndustria: ${builderState.guidedState.industry || ""}\nDominio deseado: ${builderState.guidedState.desiredDomain || ""}\nSite ID: ${builderState.currentSiteId}`,
    fr: `Client a envoyé le brouillon pour révision.\nEntreprise: ${customerName}\nSecteur: ${builderState.guidedState.industry || ""}\nDomaine souhaité: ${builderState.guidedState.desiredDomain || ""}\nSite ID: ${builderState.currentSiteId}`,
    pt: `Cliente enviou o rascunho para revisão.\nNegócio: ${customerName}\nSetor: ${builderState.guidedState.industry || ""}\nDomínio desejado: ${builderState.guidedState.desiredDomain || ""}\nSite ID: ${builderState.currentSiteId}`,
  });
  submitDraftReviewButton.disabled = true;
  submitDraftReviewButton.textContent = langText({ en: "Sending...", es: "Enviando...", fr: "Envoi...", pt: "Enviando..." });
  try {
    const response = await fetch(`${API_BASE_URL}/public/leads`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        siteId: builderState.currentSiteId,
        businessId: builderState.currentBusinessId,
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
      window.parent.postMessage({ type: "luma-draft-submitted", siteId: builderState.currentSiteId }, "*");
    }
  } catch (error) {
    storageStatus.textContent = `${langText({ en: "Could not send", es: "No se pudo enviar", fr: "Impossible d'envoyer", pt: "Não foi possível enviar" })}: ${shortError(error.message)}`;
  } finally {
    submitDraftReviewButton.disabled = false;
    submitDraftReviewButton.textContent = langText({ en: "Send for review", es: "Enviar para revisión", fr: "Envoyer pour révision", pt: "Enviar para revisão" });
  }
}













export function persistPendingStudioAccountAction(action) {
  try {
    localStorage.setItem("lumaPendingAuthAction", action);
    if (builderState.currentSchema) {
      localStorage.setItem("lumaPendingGeneratedSite", JSON.stringify({
        schema: builderState.currentSchema,
        siteId: builderState.currentSiteId,
        businessId: builderState.currentBusinessId,
        selectedPageKey: builderState.selectedPageKey,
        savedAt: new Date().toISOString(),
      }));
    }
  } catch {
    // Storage can fail for large drafts; the live session still keeps the draft.
  }
}





export function isValidWorkspaceEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || "").trim());
}

function adjustGeneratedDraftWithLuma() {
  document.body.classList.add("generated-preview-open", "client-preview-mode", "draft-adjust-open");
  document.body.classList.remove("review-details-open", "final-review-mode", "manual-form-open");
  syncLyraExperienceMode();
  guidedPanel.classList.add("active");
  document.body.classList.remove("guided-modal-open");
  builderState.guidedStep = "review";
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



function salesFlowFromIntakeFollowupAnswer(value = "") {
  const text = normalizeTemplateIntentText(value);
  if (!text) return "";
  if (/\b(online_sales|online sales|vender online|venta online|sell online|ecommerce|e-commerce|tienda online|shop online)\b/.test(text)) return "online_sales";
  if (/\b(booking|bookings|book appointment|appointment|appointments|reserva|reservas|cita|citas|agendar|agenda)\b/.test(text)) return "booking";
  if (/\b(quote_request|quote|quotes|cotizacion|cotización|cotizaciones|presupuesto|presupuestos)\b/.test(text)) return "quote_request";
  if (/\b(lead_capture|lead|leads|captar clientes|captar prospectos|contactos)\b/.test(text)) return "lead_capture";
  if (/\b(informational|informativo|presentar informacion|presentar información|solo informacion|solo información)\b/.test(text)) return "informational";
  return "";
}

async function collectPayload() {
  if (isPublicClientSetup) syncTemplateSelectionFromGuidedContext();
  const aiStudioPlan = isPublicClientSetup ? refreshAiStudioPlanFromContext() : builderState.guidedState.aiStudioPlan;
  const data = new FormData(form);
  const intakeFollowupAnswer = data.get("server_intake_reply")?.toString().trim() || "";
  const intakeFollowupField = builderState.pendingServerIntakeGate?.missing_fields?.[0] || "";
  const baseIndustryValue = data.get("industry")?.toString().trim() || builderState.guidedState.industry || "";
  const followupSalesFlowValue = (intakeFollowupField === "sales_flow" || intakeFollowupField === "niche")
    ? salesFlowFromIntakeFollowupAnswer(intakeFollowupAnswer)
    : "";
  const industryValue = intakeFollowupField === "niche" && intakeFollowupAnswer
    ? [baseIndustryValue, intakeFollowupAnswer].filter(Boolean).join(". ")
    : baseIndustryValue;
  const preferredToneValue = data.get("preferred_tone")?.toString().trim()
    || (intakeFollowupField === "brand_style" ? intakeFollowupAnswer : "");
  const preferredColorsValue = splitCommaOrLines(data.get("preferred_colors")?.toString() || "");
  const rawLogoPreferenceValue = data.get("logo_preference")?.toString().trim()
    || builderState.guidedState.logoPreference
    || (intakeFollowupField === "logo" ? intakeFollowupAnswer : "");
  const logoPreferenceValue = logoPreferenceFromText(rawLogoPreferenceValue, { assumeLogoContext: true })
    || rawLogoPreferenceValue;
  if (logoPreferenceValue) {
    builderState.guidedState.logoPreference = logoPreferenceValue;
    if (logoPreferenceValue === "generate_ai_logo") builderState.guidedState.aiGeneratedLogoRequested = true;
  }
  const fieldMeta = { ...(builderState.guidedState.fieldMeta || {}) };
  if (intakeFollowupField === "niche" && intakeFollowupAnswer) {
    builderState.guidedState.industry = industryValue;
    fieldMeta.industry = { source: "explicit_user_choice", confidence: 1 };
    fieldMeta.niche = { source: "explicit_user_choice", confidence: 1 };
  }
  if (followupSalesFlowValue) {
    builderState.guidedState.salesFlow = followupSalesFlowValue;
    builderState.guidedState.salesMode = followupSalesFlowValue;
    fieldMeta.salesFlow = { source: "explicit_user_choice", confidence: 1 };
    fieldMeta.sales_flow = { source: "explicit_user_choice", confidence: 1 };
  }
  if (logoPreferenceValue) {
    fieldMeta.logo = fieldMeta.logo || { source: "explicit", confidence: 1 };
    fieldMeta.logoPreference = fieldMeta.logoPreference || { source: "explicit", confidence: 1 };
  }
  builderState.guidedState.fieldMeta = fieldMeta;
  const resolvedSalesFlow = followupSalesFlowValue || builderState.guidedState.salesFlow || builderState.guidedState.salesMode || data.get("sales_flow")?.toString().trim() || "";
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
  arrayValue(builderState.guidedState.videoUrls).filter(isCloudSafeUrl).forEach((url, index) => {
    assets.push({ asset_type: "video", label: `Video ${index + 1}`, url });
  });

  const logoFile = data.get("logo_file");
  if (logoFile instanceof File && logoFile.size > 0) {
    assets.push({ asset_type: "logo", label: "Uploaded logo", url: await uploadAssetOrFallback(logoFile, "logo", "Uploaded logo") });
  }

  const photoFiles = data.getAll("photo_files").filter((file) => file instanceof File && file.size > 0);
  for (const [index, file] of photoFiles.entries()) {
    const assetType = file.type?.startsWith("video/") ? "video" : "photo";
    assets.push({ asset_type: assetType, label: `Uploaded ${assetType} ${index + 1}`, url: await uploadAssetOrFallback(file, assetType, `Uploaded ${assetType} ${index + 1}`) });
  }

  const sitePlan = builderState.guidedState.sitePlan || (builderState.forcedTemplateSelection?.templateId ? buildSitePlan(builderState.forcedTemplateSelection) : null);
  if (sitePlan && aiStudioPlan) sitePlan.aiStudioPlan = aiStudioPlan;

  const payload = {
    generatedSiteId: builderState.currentSiteId || builderState.clientIntakeSession?.generatedSiteId || builderState.clientIntakeSession?.projectId || builderState.guidedState.generatedSiteId || "",
    projectId: builderState.currentSiteId || builderState.clientIntakeSession?.projectId || builderState.clientIntakeSession?.generatedSiteId || builderState.guidedState.projectId || "",
    business_name: data.get("business_name")?.toString().trim(),
    business_description: data.get("business_description")?.toString().trim(),
    industry: industryValue,
    location: data.get("location")?.toString().trim(),
    services_products: splitCommaOrLines(data.get("services_products")?.toString() || ""),
    target_audience: data.get("target_audience")?.toString().trim(),
    preferred_tone: preferredToneValue,
    preferred_colors: preferredColorsValue.length
      ? preferredColorsValue
      : arrayValue(builderState.guidedState.logoPalette),
    brandStyle: preferredToneValue,
    contact_info: contactInfo,
    logoPreference: logoPreferenceValue,
    fieldMeta,
    intakeFollowupAnswer,
    salesFlow: resolvedSalesFlow,
    desiredDomain: data.get("desired_domain")?.toString().trim() || builderState.guidedState.desiredDomain || "",
    selectedLanguage: builderState.selectedLanguage,
    request_id: builderState.currentRequestId,
    catalog_items: catalogItemsFromForm(),
    assets,
    logoPalette: arrayValue(builderState.guidedState.logoPalette),
    brand: normalizeBrand(builderState.guidedState.brand || {
      logoUrl: assets.find((asset) => asset.asset_type === "logo")?.url || "",
      extractedColors: arrayValue(builderState.guidedState.logoPalette),
      preferredColors: preferredColorsValue,
      industry: industryValue,
      tone: preferredToneValue,
    }),
    designStrategy: {
      ...createDesignStrategy({
        business_name: data.get("business_name")?.toString().trim(),
        business_description: data.get("business_description")?.toString().trim(),
        industry: industryValue,
        target_audience: data.get("target_audience")?.toString().trim(),
        preferred_tone: preferredToneValue,
        salesMode: resolvedSalesFlow,
      }),
      aiStudioPlan,
      selectedTemplateId: aiStudioPlan?.recommendedTemplateId || "",
      selectedTemplateReason: aiStudioPlan?.reasoningSummary || "",
      selectedCatalogType: aiStudioPlan?.recommendedCatalogType || "",
    },
    aiStudioPlan,
    qualityRules: DESIGN_QUALITY_RULES,
    requestedAdjustments: arrayValue(builderState.guidedState.requestedAdjustments),
    sitePlan,
    sitePlanApproved: Boolean(builderState.guidedState.sitePlanApproved),
    designVariantOffset: Math.max(0, Number(builderState.guidedState.designVariantOffset) || 0),
    brandContextNote:
      "Intake answers are client intent and design strategy context. Use them to create polished website copy, but do not copy internal planning answers literally unless they are natural public-facing text.",
  };
  const revisionInstructions = buildRevisionInstructions();
  if (revisionInstructions) {
    payload.revisionMode = revisionInstructions.mode;
    payload.requestedAdjustments = revisionInstructions.requestedAdjustments;
    payload.revisionInstructions = revisionInstructions;
    payload.previousSchema = builderState.currentSchema;
  }
  return payload;
}

async function saveCurrentSchema() {
  if (!builderState.currentSchema) {
    storageStatus.textContent = "Generate a site before saving.";
    return;
  }
  if (!builderState.currentSiteId) {
    storageStatus.textContent = "Cannot save: database did not return a site id.";
    return;
  }
  const response = await fetch(`${API_BASE_URL}/sites/${builderState.currentSiteId}/schema`, {
    method: "PUT",
    headers: adminHeaders({ "content-type": "application/json" }),
    body: JSON.stringify({ schema: builderState.currentSchema, catalog_items: catalogItemsForApi() }),
  });
  if (response.status === 401) {
    storageStatus.textContent = "Admin token required to save.";
    return;
  }
  const result = await response.json();
  storageStatus.textContent = result.storage_status === "stored" ? "Saved to database" : result.storage_status;
}

async function publishCurrentSite() {
  if (!builderState.currentSchema) {
    storageStatus.textContent = "Generate a site before publishing.";
    return;
  }
  if (!builderState.currentSiteId) {
    storageStatus.textContent = "Cannot publish: database did not return a site id.";
    return;
  }
  const response = await fetch(`${API_BASE_URL}/sites/${builderState.currentSiteId}/publish`, {
    method: "POST",
    headers: adminHeaders({ "content-type": "application/json" }),
    body: JSON.stringify({ schema: builderState.currentSchema, catalog_items: catalogItemsForApi() }),
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

export function storageLabel(status, usedDevMock) {
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
    builderState.currentRequestId = request.id;
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

export function catalogItemsFromSchema(schema) {
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
  return builderState.currentCatalogItems.map((item, index) => ({
    ...item,
    price_value: item.price_value === "" || item.price_value === undefined ? null : Number(item.price_value),
    sort_order: item.sort_order || index + 1,
    is_active: item.is_active !== false,
    is_featured: Boolean(item.is_featured),
  }));
}

export function renderEditor() {
  if (!builderState.currentSchema) return;
  editorMount.classList.toggle("advanced-inspector-open", builderState.advancedInspectorOpen);
  const pageOptions = builderState.currentSchema.pages
    .map(
      (page) =>
        `<option value="${escapeAttribute(page.page_key)}" ${page.page_key === builderState.selectedPageKey ? "selected" : ""}>${escapeHtml(page.title)}</option>`,
    )
    .join("");

  editorMount.innerHTML = `
    ${studioInspector()}
    <div class="editor-group">
      <h3>Design options</h3>
      <div class="variant-grid">${designVariantCards()}</div>
    </div>
    ${brandKitEditor(builderState.currentSchema.brand, builderState.currentSchema.design_score)}
    <div class="editor-group">
      <label>Editing page<select id="pageSelector">${pageOptions}</select></label>
      <div class="row-actions">
        <button class="small-button" data-move-page="up">Move page up</button>
        <button class="small-button" data-move-page="down">Move page down</button>
      </div>
    </div>
    <div class="editor-group">
      <h3>Brand</h3>
      ${inputField("Business name", "business.name", builderState.currentSchema.business.name)}
      ${textareaField("Description", "business.description", builderState.currentSchema.business.description)}
      ${inputField("Logo URL", "global_components.logo_url", builderState.currentSchema.global_components.logo_url || "")}
      ${inputField("Brand primary", "brand.primaryColor", builderState.currentSchema.brand?.primaryColor || "")}
      ${inputField("Brand accent", "brand.accentColor", builderState.currentSchema.brand?.accentColor || "")}
      ${inputField("Button color", "brand.buttonColor", builderState.currentSchema.brand?.buttonColor || "")}
    </div>
    <div class="editor-group">
      <h3>Colors</h3>
      ${inputField("Background", "theme.colors.background", builderState.currentSchema.theme.colors.background)}
      ${inputField("Primary", "theme.colors.primary", builderState.currentSchema.theme.colors.primary)}
      ${inputField("Secondary", "theme.colors.secondary", builderState.currentSchema.theme.colors.secondary)}
      ${inputField("Text", "theme.colors.text", builderState.currentSchema.theme.colors.text)}
    </div>
    <div class="editor-group">
      <h3>Contact</h3>
      ${Object.entries(builderState.currentSchema.contact || {})
        .map(([key, value]) => inputField(key, `contact.${key}`, value))
        .join("")}
    </div>
    <div class="editor-group">
      <h3>Catalog Manager</h3>
      <p class="mini-note">The public site renders products from catalog_items, not hardcoded page JSON.</p>
      ${builderState.currentCatalogItems.map(catalogItemEditor).join("")}
      <button class="small-button" id="addCatalogItemButton" type="button">Add catalog item</button>
    </div>
    <div class="editor-group">
      <h3>Sections</h3>
      ${selectedPage().sections.map(sectionEditor).join("")}
      <button class="small-button" id="addSectionButton" type="button">Add section</button>
    </div>
  `;

  editorMount.querySelector("#toggleAdvancedInspector")?.addEventListener("click", () => {
    builderState.advancedInspectorOpen = !builderState.advancedInspectorOpen;
    renderEditor();
  });
  editorMount.querySelectorAll("[data-studio-add-product]").forEach((button) => {
    button.addEventListener("click", addStudioCatalogItem);
  });

  editorMount.querySelector("#pageSelector").addEventListener("change", (event) => {
    builderState.selectedPageKey = event.target.value;
    renderEditor();
    renderPreview();
  });

  editorMount.querySelectorAll("[data-variant-id]").forEach((button) => {
    button.addEventListener("click", () => {
      builderState.selectedVariantId = button.dataset.variantId;
      renderEditor();
      renderPreview();
    });
  });

  editorMount.querySelectorAll("[data-path]").forEach((input) => {
    input.addEventListener("input", () => {
      setPath(builderState.currentSchema, input.dataset.path, normalizeEditedValue(input.dataset.path, input.value));
      if (input.dataset.path.startsWith("brand.") || input.dataset.path === "global_components.logo_url") {
        builderState.currentSchema.brand = normalizeBrand({
          ...(builderState.currentSchema.brand || {}),
          logoUrl: builderState.currentSchema.global_components?.logo_url || builderState.currentSchema.brand?.logoUrl || "",
        });
        builderState.currentSchema = applyBrandSystemToSchema(builderState.currentSchema, builderState.currentSchema.brand);
      }
      renderPreview();
    });
  });

  editorMount.querySelectorAll("[data-catalog-path]").forEach((input) => {
    input.addEventListener("input", () => {
      const value = input.type === "checkbox" ? input.checked : input.value;
      setPath({ catalog_items: builderState.currentCatalogItems }, input.dataset.catalogPath, value);
      renderPreview();
    });
  });

  editorMount.querySelectorAll("[data-catalog-image-upload]").forEach((input) => {
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      const imageUrl = await uploadAssetOrFallback(file, "catalog", "Catalog item image");
      setPath({ catalog_items: builderState.currentCatalogItems }, input.dataset.catalogImageUpload, imageUrl);
      renderEditor();
      renderPreview();
    });
  });

  editorMount.querySelectorAll("[data-remove-catalog-item]").forEach((button) => {
    button.addEventListener("click", () => {
      builderState.currentCatalogItems = builderState.currentCatalogItems.filter((item) => item.id !== button.dataset.removeCatalogItem);
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
      setPath(builderState.currentSchema, input.dataset.sectionPath, normalizeEditedValue(input.dataset.sectionPath, input.value));
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
    builderState.currentCatalogItems.push({
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
      sort_order: builderState.currentCatalogItems.length + 1,
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

export function renderPreview() {
  if (!builderState.currentSchema) return;
  applyGeneratedFavicon(builderState.currentSchema);
  previewFrame.innerHTML = renderWebsite(schemaForPreview(), builderState.selectedPageKey);
  renderStudioProgress();
  previewFrame.querySelectorAll("[data-page-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      builderState.selectedPageKey = link.dataset.pageLink;
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

function renderSchemaPreviewInto(schema, containerElement, payload = {}, templateSelection = null) {
  if (!schema || !containerElement) return null;
  const preparedSchema = prepareWebsiteConfig(schema, payload, templateSelection);
  const defaultPageKey = preparedSchema.pages?.find((page) => page.page_key === "home")?.page_key
    || preparedSchema.pages?.[0]?.page_key
    || "home";
  const hadClientPreviewMode = document.body.classList.contains("client-preview-mode");
  const previousSchema = builderState.currentSchema;

  const renderPage = (pageKey = defaultPageKey) => {
    builderState.currentSchema = preparedSchema;
    document.body.classList.add("client-preview-mode");
    try {
      containerElement.innerHTML = renderWebsite(preparedSchema, pageKey);
    } finally {
      builderState.currentSchema = previousSchema;
      document.body.classList.toggle("client-preview-mode", hadClientPreviewMode);
    }
    containerElement.querySelectorAll("[data-page-link]").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        renderPage(link.dataset.pageLink || defaultPageKey);
      });
    });
  };

  renderPage(defaultPageKey);
  return preparedSchema;
}

window.KreatonBuilderRenderer = {
  ...(window.KreatonBuilderRenderer || {}),
  prepareWebsiteConfig,
  renderSchemaPreviewInto,
};





function pageQuickInspector() {
  return `<div class="studio-inspector-grid">
    ${inputField("Business name", "business.name", builderState.currentSchema.business?.name || "")}
    ${inputField("Logo URL", "global_components.logo_url", builderState.currentSchema.global_components?.logo_url || "")}
    ${inputField("Brand primary", "brand.primaryColor", builderState.currentSchema.brand?.primaryColor || "")}
    ${inputField("Button color", "brand.buttonColor", builderState.currentSchema.brand?.buttonColor || "")}
  </div>`;
}





















function addStudioCatalogItem() {
  if (!builderState.currentSchema) return;
  builderState.currentSchema.catalog_items = arrayValue(builderState.currentSchema.catalog_items);
  builderState.currentSchema.catalog_items.push({
    id: `item_${Date.now()}`,
    sku: `SKU-${builderState.currentSchema.catalog_items.length + 1}`,
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
    is_featured: builderState.currentSchema.catalog_items.length < 3,
    sort_order: builderState.currentSchema.catalog_items.length,
  });
  builderState.currentSchema = prepareWebsiteConfig(builderState.currentSchema, { brand: builderState.currentSchema.brand || builderState.guidedState.brand || {} }, null);
  builderState.currentCatalogItems = catalogItemsFromSchema(builderState.currentSchema);
  renderEditor();
  renderPreview();
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
  const variants = builderState.currentSchema.design_variants || [];
  if (!variants.length) {
    return `<p class="empty">Generate again to receive 3 AI design options.</p>`;
  }
  return variants
    .map(
      (variant, index) => {
        const preset = TEMPLATE_PRESETS[index % TEMPLATE_PRESETS.length];
        return `<button class="variant-card ${variant.id === builderState.selectedVariantId ? "active" : ""}" data-variant-id="${escapeAttribute(variant.id)}" type="button">
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
  if (!variant) return ensureStorefrontExperience(structuredClone(builderState.currentSchema));
  const preset = selectedTemplatePreset();
  const schema = structuredClone(builderState.currentSchema);
  schema.theme = variant.theme || schema.theme;
  if (Array.isArray(builderState.currentCatalogItems) && builderState.currentCatalogItems.length) {
    schema.catalog_items = builderState.currentCatalogItems;
  }
  schema.layout_mode = { ...schema.layout_mode, id: variant.layout_mode_id || schema.layout_mode?.id };
  schema.active_design_variant = variant;
  if (!schema.active_template?.id && !schema.selected_template?.id) {
    schema.active_template = preset;
  }
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

  const language = schema.business?.selectedLanguage || builderState.selectedLanguage || "en";
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
  const variants = builderState.currentSchema?.design_variants || [];
  return variants.find((variant) => variant.id === builderState.selectedVariantId) || variants[0] || null;
}

function selectedTemplatePreset() {
  const variants = builderState.currentSchema?.design_variants || [];
  const index = Math.max(0, variants.findIndex((variant) => variant.id === builderState.selectedVariantId));
  return TEMPLATE_PRESETS[index % TEMPLATE_PRESETS.length];
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
  return builderState.currentSchema.pages.find((page) => page.page_key === builderState.selectedPageKey) || builderState.currentSchema.pages[0];
}

function pageIndex() {
  return builderState.currentSchema.pages.findIndex((page) => page.page_key === builderState.selectedPageKey);
}

function movePage(direction) {
  const index = pageIndex();
  const next = direction === "up" ? index - 1 : index + 1;
  if (next < 0 || next >= builderState.currentSchema.pages.length) return;
  const pages = builderState.currentSchema.pages;
  [pages[index], pages[next]] = [pages[next], pages[index]];
  resequence(pages);
}

function resequence(items) {
  items.forEach((item, index) => {
    item.order = index + 1;
  });
}

function moveCatalogItem(id, direction) {
  const index = builderState.currentCatalogItems.findIndex((item) => item.id === id);
  const next = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || next < 0 || next >= builderState.currentCatalogItems.length) return;
  [builderState.currentCatalogItems[index], builderState.currentCatalogItems[next]] = [builderState.currentCatalogItems[next], builderState.currentCatalogItems[index]];
  resequenceCatalog();
}

function resequenceCatalog() {
  builderState.currentCatalogItems.forEach((item, index) => {
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



function slugify(value) {
  return String(value || "default").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
