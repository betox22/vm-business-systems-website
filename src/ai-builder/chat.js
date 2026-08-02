import { ASSISTANT_AVATAR_FALLBACK, ASSISTANT_AVATARS, LUMA_AGENT_URL } from './config.js';
import { escapeHtml, escapeAttribute } from './utils.js';
import { builderState } from './state.js';
import {
  createOrResumeClientIntakeSession,
  guidedSessionDraftForApi,
  isClientWorkspaceUnlocked,
  readClientIntakeSession,
} from './auth.js';
import { form, statusText, storageStatus, guidedPanel, guidedChatCard, guidedChat, guidedReply, guidedSendButton, guidedStatusText, guidedStepLabel, guidedGenerateButton, guidedMicButton, assistantAudioToggle, voiceStatusText, guidedThinking, guidedProgressBar, quickChipRow, guidedBriefReview, isPublicClientSetup, isEmbeddedClientSetup, builderAvatarRoot, builderAvatarManager } from './dom.js';
import {
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
  mergeGuidedUpdates,
  mergeTemplateSelectionIntoSchema,
  normalizeTemplateIntentText,
  questionSignature,
  refreshAiStudioPlanFromContext,
  removeGuidedBuildStatusCard,
  renderLumaReadyCard,
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
  updateAssetPromptVisibility,
  setAssistantState,
  t,
  langText,
  renderGuidedSummary,
  renderLiveSitePreview,
  renderPreview,
  renderEditor,
  showGeneratedClientPreview,
  saveGeneratedSite,
  catalogItemsFromSchema,
  prepareWebsiteConfig,
  arrayValue,
  shortError,
  applyGuidedStateToForm,
  resetAssistantConversation,
  syncLyraExperienceMode,
  isCloudSafeUrl,
  readErrorMessage,
  handleGuidedGenerateButton,
  refreshQuickChips,
  resetGuidedStateForNewAccount,
  guidedCompletionPercent,
  guidedAskedSteps,
  missingGuidedSteps,
  guidedStateForApi,
  setSelectedLanguage,
  GUIDED_QUESTIONS,
  GUIDED_STEPS,
  SMART_GUIDED_STEP_PRIORITY,
  OPTIONAL_GUIDED_STEPS,
  REQUIRED_GUIDED_STEPS,
} from './index.js';

export function guidedQuestion(step) {
  return publicAssistantCopy(GUIDED_QUESTIONS[builderState.selectedLanguage]?.[step] || GUIDED_QUESTIONS.en[step] || GUIDED_QUESTIONS.en.review);
}

export function ensureGuidedCoachCard() {
  if (builderState.guidedCoachCard || !guidedChatCard || !guidedChat) return builderState.guidedCoachCard;
  builderState.guidedCoachCard = document.createElement("section");
  builderState.guidedCoachCard.className = "luma-coach-card";
  builderState.guidedCoachCard.setAttribute("aria-live", "polite");
  guidedChatCard.insertBefore(builderState.guidedCoachCard, guidedChat);
  return builderState.guidedCoachCard;
}

export function renderGuidedCoachCard() {
  if (isPublicClientSetup) {
    builderState.guidedCoachCard?.remove();
    builderState.guidedCoachCard = null;
    return;
  }
  const card = ensureGuidedCoachCard();
  if (!card) return;
  const stage = guidedStage(builderState.guidedStep);
  const completion = guidedCompletionPercent();
  const templateName = builderState.forcedTemplateSelection?.template?.clientSelectionCard?.title
    || builderState.forcedTemplateSelection?.template?.name
    || builderState.forcedTemplateSelection?.templateId
    || "";
  const nextAction = builderState.guidedStep === "review"
    ? langText({ en: "Ready for review", es: "Listo para revisar", fr: "Prêt à vérifier", pt: "Pronto para revisar" })
    : guidedQuestion(builderState.guidedStep);
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

export function initBuilderAvatarAssistant() {
  if (!builderAvatarRoot || !window.AvatarAssistant || !builderAvatarManager) return;
  builderState.builderAvatarAssistant = new window.AvatarAssistant({
    root: builderAvatarRoot,
    manager: builderAvatarManager,
    name: "LYRA",
    imageUrl: ASSISTANT_AVATAR_FALLBACK,
    imagePaths: {
      idle: ASSISTANT_AVATAR_FALLBACK,
      neutral: ASSISTANT_AVATARS.neutral,
      happy: ASSISTANT_AVATARS.happy,
      thinking: ASSISTANT_AVATARS.thinking,
      listening: ASSISTANT_AVATARS.listening,
      speaking: ASSISTANT_AVATARS.speaking,
      building: ASSISTANT_AVATARS.building,
      optimize: ASSISTANT_AVATARS.optimize,
      confused: ASSISTANT_AVATARS.thinking,
      success: ASSISTANT_AVATARS.success,
      alert: ASSISTANT_AVATARS.alert,
    },
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

export function avatarStateFromAssistantState(state) {
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

export function normalizeAssistantState(state) {
  return ["neutral", "happy", "thinking", "listening", "speaking", "alert", "success"].includes(state)
    ? state
    : "neutral";
}

export function toggleAssistantAudio() {
  builderState.assistantVoiceEnabled = !builderState.assistantVoiceEnabled;
  localStorage.setItem("gnuDevAssistantVoice", builderState.assistantVoiceEnabled ? "on" : "off");
  updateAssistantAudioToggle();
}

export function updateAssistantAudioToggle() {
  assistantAudioToggle.textContent = builderState.assistantVoiceEnabled ? t("voiceOutputOn") : t("voiceOutputOff");
  assistantAudioToggle.setAttribute("aria-label", builderState.assistantVoiceEnabled ? t("voiceOutputOn") : t("voiceOutputOff"));
  assistantAudioToggle.dataset.enabled = builderState.assistantVoiceEnabled ? "true" : "false";
  assistantAudioToggle.classList.toggle("active", builderState.assistantVoiceEnabled);
}

export function speakAssistantMessage(message) {
  if (!builderState.assistantVoiceEnabled || !("speechSynthesis" in window) || !message) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = languageToSpeechLocale(builderState.selectedLanguage);
  utterance.rate = 0.96;
  utterance.pitch = 1.02;
  utterance.addEventListener("start", () => setAssistantState("speaking"));
  utterance.addEventListener("end", () => setAssistantState(builderState.guidedStep === "review" ? "success" : "happy"));
  utterance.addEventListener("error", () => setAssistantState("alert"));
  window.speechSynthesis.speak(utterance);
}

export function initVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const supported = Boolean(SpeechRecognition);
  guidedMicButton.disabled = !supported;
  guidedMicButton.hidden = !supported;
  voiceStatusText.textContent = supported ? "" : t("voiceUnsupported");
}

export function startVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    voiceStatusText.textContent = t("voiceUnsupported");
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = languageToSpeechLocale(builderState.selectedLanguage);
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
    if (builderState.assistantState === "listening") setAssistantState("neutral");
  });
  recognition.start();
}

export function initGuidedIntake() {
  importQuickFormToGuidedState();
  if (isPublicClientSetup && !isClientWorkspaceUnlocked()) {
    renderGuidedSummary();
    resetAssistantConversation();
    return;
  }
  restoreGuidedDraft();
  applyPromptFromQuery();
  restoreGeneratedSite();
  renderGuidedSummary();
  resetAssistantConversation();
}

export function setIntakeMode(mode) {
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

export function switchBackToChat() {
  importQuickFormToGuidedState();
  document.body.classList.remove("manual-form-open");
  setIntakeMode("guided");
}

export async function sendGuidedReply() {
  const message = guidedReply.value.trim();
  if (!message) return;
  appendChatMessage("user", message);
  guidedReply.value = "";
  if (shouldResetRestoredWorkspaceForMessage(message)) {
    const email = builderState.clientIntakeSession?.clientEmail
      || builderState.clientIntakeSession?.client_email
      || readClientIntakeSession()?.clientEmail
      || readClientIntakeSession()?.client_email
      || localStorage.getItem("lumaPendingClientEmail")
      || "";
    resetGuidedStateForNewAccount();
    if (email) {
      builderState.guidedState.contactInfo.email = email;
      localStorage.setItem("lumaPendingClientEmail", email);
      try {
        await createOrResumeClientIntakeSession({
          email,
          name: "",
          reason: "new-brief",
          forceNew: true,
          immediateDraft: guidedSessionDraftForApi(),
        });
      } catch (error) {
        console.warn("Could not reset restored client intake session", error);
      }
    }
    appendChatMessage("assistant", langText({
      en: "I started a clean workspace for this new project.",
      es: "Empecé un espacio limpio para este nuevo proyecto.",
      fr: "J'ai lancé un nouvel espace propre pour ce projet.",
      pt: "Comecei um espaço limpo para este novo projeto.",
    }), "success");
  }
  const broadLocalUpdates = inferGuidedUpdatesFromAnyMessage(message);
  const stepUpdates = inferGuidedUpdates(builderState.guidedStep, message);
  const localContextUpdates = { ...broadLocalUpdates, ...stepUpdates };
  if (builderState.guidedStep === "websiteIntent" && !localContextUpdates.websiteIntent) {
    localContextUpdates.websiteIntent = extractWebsiteIntent(message) || message.slice(0, 180);
  }
  if (!localContextUpdates.businessDescription && !builderState.guidedState.businessDescription && isRichIntakeMessage(message)) {
    localContextUpdates.businessDescription = message;
  }
  Object.assign(localContextUpdates, completeGuidedBriefFromMessage(message, localContextUpdates));
  mergeGuidedUpdates(localContextUpdates);
  syncTemplateSelectionFromGuidedContext(message);
  const localStudioPlan = refreshAiStudioPlanFromContext(message);
  if (builderState.guidedStep === "review") {
    const adjustmentLabel = langText({
      en: "Client requested adjustments",
      es: "Ajustes pedidos por el cliente",
      fr: "Ajustements demandés par le client",
      pt: "Ajustes solicitados pelo cliente",
    });
    if (builderState.currentSchema) {
      builderState.guidedState.revisionMode = "targeted_edit";
    }
    builderState.guidedState.requestedAdjustments = [
      ...arrayValue(builderState.guidedState.requestedAdjustments),
      `${adjustmentLabel}: ${message}`,
    ];
    if (builderState.currentSchema) {
      await applyDraftAdjustmentFromChat(message, localContextUpdates);
    } else {
      appendChatMessage(
        "assistant",
        langText({
          en: "Perfect, I added that to the plan. Anything else you want to change or add before I generate?",
          es: "Perfecto, agregué eso al plan. ¿Quieres modificar algo más o agregar otro detalle antes de generar?",
          fr: "Parfait, j'ai ajouté cela au plan. Voulez-vous modifier ou ajouter autre chose avant de générer?",
          pt: "Perfeito, adicionei isso ao plano. Quer mudar ou adicionar mais alguma coisa antes de gerar?",
        }),
        "success",
      );
    }
    guidedStatusText.textContent = langText({
      en: builderState.currentSchema ? "Draft updated." : "Extra details saved.",
      es: builderState.currentSchema ? "Borrador actualizado." : "Detalles adicionales guardados.",
      fr: builderState.currentSchema ? "Brouillon mis à jour." : "Détails supplémentaires enregistrés.",
      pt: builderState.currentSchema ? "Rascunho atualizado." : "Detalhes adicionais salvos.",
    });
    renderGuidedSummary();
    refreshQuickChips();
    saveGuidedDraft();
    return;
  }
  guidedStatusText.textContent = t("sendingAssistant");
  setThinking(true);

  try {
    const response = await fetch(LUMA_AGENT_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        current: guidedStateForApi(),
        message,
        currentStep: builderState.guidedStep,
        current_step: builderState.guidedStep,
        history: builderState.guidedHistory,
        selectedTemplateId: builderState.forcedTemplateSelection?.templateId || "",
        sitePlan: builderState.guidedState.sitePlan || null,
        previousSchema: builderState.currentSchema || null,
      }),
    });
    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }
    const result = await response.json();
    const assistantMessage = result.assistantMessage || result.message;
    const emotion = result.emotion || (result.readyToGenerate ? "success" : "speaking");
    const updatedFields = result.updatedFields || result.updates || {};
    builderState.guidedHistory.push({ role: "user", content: message });
    builderState.guidedHistory.push({ role: "assistant", content: assistantMessage });
    mergeGuidedUpdates(updatedFields);
    await applyLumaAgentDecision(result);
    const planAfterAgent = refreshAiStudioPlanFromContext(message);
    const serverNextStep = result.next_step || result.nextStep || "";
    builderState.guidedStep = result.readyToGenerate ? "review" : normalizeNextGuidedStep(serverNextStep || builderState.guidedStep);
    const serverNextQuestion = result.nextQuestion || result.next_question;
    const nextQuestion = result.readyToGenerate ? "" : chooseNextQuestionText(serverNextQuestion, builderState.guidedStep);
    const usedDevFallback = Boolean(result.used_dev_fallback || result.usedDevFallback);
    const finalAssistantMessage = sanitizeAssistantTemplateClaim(assistantMessage, planAfterAgent);
    const publicAssistantMessage = composeAssistantReply(finalAssistantMessage, nextQuestion, usedDevFallback);
    appendUnderstandingCard({ updates: updatedFields, sourceMessage: message });
    appendChatMessage("assistant", publicAssistantMessage, usedDevFallback ? "alert" : emotion);
    guidedStatusText.textContent = usedDevFallback
      ? t("devFallbackMissingKey")
      : t("summaryUpdated");
  } catch (error) {
    const updates = localContextUpdates;
    mergeGuidedUpdates(updates);
    syncTemplateSelectionFromGuidedContext(message);
    refreshAiStudioPlanFromContext(message);
    builderState.guidedStep = nextSmartGuidedStep(builderState.guidedStep);
    console.warn("LYRA intake assistant request failed; continuing locally.", error);
    appendUnderstandingCard({ updates, sourceMessage: message });
    appendChatMessage(
      "assistant",
      composeAssistantReply(
        t("localFallbackMessage"),
        guidedQuestion(builderState.guidedStep),
        true,
      ),
      "speaking",
    );
    guidedStatusText.textContent = t("localFallback");
  }
  setThinking(false);
  if (builderState.guidedStep === "review") {
    builderState.guidedState.sitePlan = buildSitePlan(builderState.forcedTemplateSelection);
    builderState.guidedState.sitePlan.aiStudioPlan = builderState.guidedState.aiStudioPlan || localStudioPlan;
  }
  renderGuidedSummary();
  refreshQuickChips();
}

export function sanitizeAssistantTemplateClaim(message = "", plan = {}) {
  const text = String(message || "");
  const templateName = plan?.recommendedTemplateName || localizedTemplateName(templatePreviewMeta(plan?.recommendedTemplateId || ""));
  if (!templateName || !/selected .* as the base|use .* as the base|mapped .* as/i.test(text)) return text;
  return langText({
    en: `I mapped this to ${templateName}. I will use that proven structure as the base and adapt the copy, products, colors and flow professionally.`,
    es: `Lo mapeé como ${templateName}. Usaré esa estructura probada como base y adaptaré textos, productos, colores y flujo de forma profesional.`,
    fr: `Je l'ai associé à ${templateName}. J'utiliserai cette structure éprouvée comme base et j'adapterai les textes, produits, couleurs et parcours.`,
    pt: `Mapeei isso como ${templateName}. Vou usar essa estrutura validada como base e adaptar textos, produtos, cores e fluxo profissionalmente.`,
  });
}

export function skipGuidedQuestion() {
  appendChatMessage("user", t("skipMessage"));
  guidedAskedSteps.set(builderState.guidedStep, 1);
  builderState.guidedStep = nextSmartGuidedStep(builderState.guidedStep);
  appendChatMessage("assistant", guidedQuestion(builderState.guidedStep), "speaking");
  renderGuidedSummary();
}

export function appendUnderstandingCard({ updates = {}, sourceMessage = "" } = {}) {
  if (isPublicClientSetup) return;
  const filledItems = understandingItems().filter((item) => item.status === "detected");
  const missingItems = understandingItems().filter((item) => item.status === "missing");
  const changedKeys = Object.keys(updates || {}).filter((key) => key in builderState.guidedState);
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

export function understandingItems() {
  return [
    understandingItem("businessName", t("businessName"), builderState.guidedState.businessName, true),
    understandingItem("websiteIntent", t("websiteIntent"), builderState.guidedState.websiteIntent || builderState.forcedTemplateSelection?.templateId, true),
    understandingItem("industry", t("industry"), builderState.guidedState.industry, true),
    understandingItem("location", t("location"), builderState.guidedState.location, false),
    understandingItem("servicesProducts", t("servicesProducts"), arrayValue(builderState.guidedState.servicesProducts).slice(0, 3).join(", "), true),
    understandingItem("preferredTone", t("preferredTone"), builderState.guidedState.preferredTone, false),
    understandingItem("preferredColors", t("preferredColors"), arrayValue(builderState.guidedState.preferredColors).slice(0, 4).join(", "), false),
    understandingItem("salesMode", t("salesMode"), builderState.guidedState.salesMode, false),
    understandingItem("contactInfo", t("contactInfo"), contactInfoCompactLabel(builderState.guidedState.contactInfo), true),
    understandingItem("hasLogoPhotos", t("hasLogoPhotos"), builderState.guidedState.hasLogoPhotos || (builderState.guidedState.hasLogo ? t("logoUrl") : ""), false),
  ];
}

export function understandingItem(key, label, value, priority) {
  return {
    key,
    label,
    value,
    priority,
    status: value ? "detected" : "missing",
  };
}

export function normalizeGuidedStepForCurrentState(step) {
  const normalized = normalizeNextGuidedStep(step);
  if (normalized !== "review") return normalized;
  if (builderState.currentSchema) return "review";
  const requiredMissing = REQUIRED_GUIDED_STEPS.filter((item) => !isGuidedStepAnswered(item));
  if (requiredMissing.length) return requiredMissing[0];
  if (!hasEnoughContextForTemplatePreview()) return nextSmartGuidedStep("websiteIntent");
  return "review";
}

export function renderSitePlanInChatIfNeeded() {
  if (builderState.guidedStep !== "review" || !guidedChat) return;
  guidedChat.querySelectorAll(".site-plan-card, .luma-ready-card").forEach((card) => card.remove());
  if (!isPublicClientSetup && (builderState.forcedTemplateSelection?.templateId || builderState.guidedState.sitePlan?.templateId)) {
    guidedChat.appendChild(renderSitePlanCard());
  }
  guidedChat.appendChild(renderLumaReadyCard());
  guidedChat.scrollTop = guidedChat.scrollHeight;
}

export function keepChatting() {
  document.body.classList.remove("review-details-open", "final-review-mode", "ready-chat-mode");
  const nextMissing = nextSmartGuidedStep(builderState.guidedStep, { allowReview: false });
  builderState.guidedStep = nextMissing || "review";
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

export function renderGuidedStepRail(stepIndex) {
  const items = document.querySelectorAll("#guidedRailSteps .guided-rail-step");
  if (!items.length) return;
  items.forEach((item) => {
    const index = Number(item.dataset.stepIndex || 0);
    item.classList.toggle("active", index === stepIndex);
    item.classList.toggle("done", index < stepIndex);
  });
}

export function appendChatMessage(role, message, emotion = "neutral") {
  const cleanMessage = role === "assistant" || role === "system" ? sanitizeAssistantMessage(message) : message;
  if ((role === "assistant" || role === "system") && shouldSuppressAssistantMessage(cleanMessage)) {
    return;
  }
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

export function shouldSuppressAssistantMessage(message) {
  const text = String(message || "").trim();
  if (!text) return true;
  if (/homeServiceHeadline is not a function/i.test(text)) {
    if (guidedStatusText) {
      guidedStatusText.textContent = langText({
        en: "Recovered a stale template error. You can generate again.",
        es: "Se corrigió un error viejo de plantilla. Ya puedes generar otra vez.",
        fr: "Une ancienne erreur de template a été corrigée. Vous pouvez regénérer.",
        pt: "Um erro antigo de template foi corrigido. Você pode gerar novamente.",
      });
    }
    return true;
  }
  const recentMessages = [...guidedChat.querySelectorAll(".chat-message.assistant span, .chat-message.system span")]
    .slice(-5)
    .map((node) => node.textContent?.trim())
    .filter(Boolean);
  return recentMessages.includes(text);
}

export function trackAssistantPrompt(message) {
  const signature = questionSignature(message);
  if (signature && signature === builderState.lastAssistantPromptSignature) return;
  builderState.lastAssistantPromptSignature = signature;
  if (!builderState.guidedStep || builderState.guidedStep === "review") return;
  if (message.includes(guidedQuestion(builderState.guidedStep)) || /[?¿]/.test(message)) {
    guidedAskedSteps.set(builderState.guidedStep, (guidedAskedSteps.get(builderState.guidedStep) || 0) + 1);
  }
}

export function nextSmartGuidedStep(referenceStep = builderState.guidedStep, options = {}) {
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

export function composeAssistantReply(message, nextQuestion, usedFallback = false) {
  const cleanMessage = sanitizeAssistantMessage(message || "");
  const cleanQuestion = sanitizeAssistantMessage(nextQuestion || "");
  const base = usedFallback && !cleanMessage ? t("localFallbackMessage") : cleanMessage;
  if (!cleanQuestion) return base || t("localFallbackMessage");
  if (!base || isDuplicateQuestion(base, cleanQuestion) || base.includes(cleanQuestion)) return cleanQuestion;
  return `${base}\n\n${cleanQuestion}`;
}

export function sanitizeAssistantMessage(message) {
  return String(message || "")
    .replace(/Development fallback:?\s*/gi, "")
    .replace(/Load failed\.?/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function nextGuidedStep(step) {
  const index = GUIDED_STEPS.indexOf(step);
  for (let i = Math.min((index < 0 ? 0 : index) + 1, GUIDED_STEPS.length - 1); i < GUIDED_STEPS.length; i += 1) {
    const candidate = GUIDED_STEPS[i];
    if (candidate === "review" || !isGuidedStepAnswered(candidate)) return candidate;
  }
  return "review";
}

export function normalizeNextGuidedStep(step) {
  const candidate = GUIDED_STEPS.includes(step) ? step : nextGuidedStep(builderState.guidedStep);
  if (candidate === "review") return "review";
  return isGuidedStepAnswered(candidate) ? nextGuidedStep(candidate) : candidate;
}

export function isGuidedStepAnswered(step) {
  if (step === "websiteIntent") return Boolean(builderState.guidedState.websiteIntent);
  if (step === "businessName") return Boolean(builderState.guidedState.businessName);
  if (step === "businessDescription") return Boolean(builderState.guidedState.businessDescription);
  if (step === "industry") return Boolean(builderState.guidedState.industry);
  if (step === "location") return Boolean(builderState.guidedState.location);
  if (step === "servicesProducts") return arrayValue(builderState.guidedState.servicesProducts).length > 0;
  if (step === "targetAudience") return Boolean(builderState.guidedState.targetAudience);
  if (step === "preferredTone") return Boolean(builderState.guidedState.preferredTone);
  if (step === "preferredColors") {
    return arrayValue(builderState.guidedState.preferredColors).length > 0 || arrayValue(builderState.guidedState.logoPalette).length > 0;
  }
  if (step === "contactInfo") return Object.keys(builderState.guidedState.contactInfo || {}).length > 0;
  if (step === "salesMode") return Boolean(builderState.guidedState.salesMode);
  if (step === "hasLogoPhotos") {
    return Boolean(builderState.guidedState.hasLogoPhotos || builderState.guidedState.hasLogo || builderState.guidedState.hasPhotos || builderState.guidedState.aiGeneratedLogoRequested || builderState.guidedState.logoPreference);
  }
  if (step === "desiredDomain") return Boolean(builderState.guidedState.desiredDomain);
  return false;
}

export function isRichIntakeMessage(text) {
  return text.length > 80 || /nombre|negocio|tienda|ubic|productos|servicios|contact|telefono|teléfono|whatsapp|instagram|colores|vende|ofrece|audiencia|clientes|location|products|services|email|phone|colors/i.test(text);
}

export function ensureServerIntakeGate() {
  let gate = document.querySelector("#serverIntakeGate");
  if (gate) return gate;
  gate = document.createElement("div");
  gate.id = "serverIntakeGate";
  gate.className = "server-intake-gate";
  gate.innerHTML = `
    <p class="server-intake-question"></p>
    <textarea name="server_intake_reply" rows="2" placeholder="Type your answer..."></textarea>
  `;
  form.prepend(gate);
  return gate;
}

export async function applyDraftAdjustmentFromChat(message, localContextUpdates = {}) {
  guidedStatusText.textContent = langText({
    en: "Applying that to the draft...",
    es: "Aplicando eso al borrador...",
    fr: "Application au brouillon...",
    pt: "Aplicando isso ao rascunho...",
  });
  setThinking(true);
  builderAvatarManager?.setState("thinking", { source: "draft-adjustment" });
  try {
    applyGuidedStateToForm();
    syncTemplateSelectionFromGuidedContext(message);
    const payload = await collectPayload();
    const text = normalizeTemplateIntentText([
      message,
      payload.business_description,
      payload.industry,
      arrayValue(payload.services_products).join(" "),
      payload.preferred_tone,
      arrayValue(payload.preferred_colors).join(" "),
    ].join(" "));
    const templateSelection = await selectTemplateForPayload(payload);
    const explicitTemplateSwitch = explicitlyRequestsTemplateSwitch(text);
    const serverEdit = builderState.currentSchema && !explicitTemplateSwitch
      ? await requestLyraSchemaEdit(message, payload, localContextUpdates, templateSelection).catch((error) => {
          console.warn("Lyra server edit unavailable; falling back to local patch.", error);
          return null;
        })
      : null;
    if (serverEdit?.patchedSchema) {
      builderState.currentSchema = prepareWebsiteConfig(serverEdit.patchedSchema, payload, templateSelection);
      if (briefRequestsCyberpunk(text)) builderState.currentSchema = applyCyberpunkVisualDirection(builderState.currentSchema);
      builderState.currentCatalogItems = catalogItemsFromSchema(builderState.currentSchema);
      builderState.selectedPageKey = builderState.currentSchema.pages?.[0]?.page_key || "home";
      builderState.selectedVariantId = builderState.currentSchema.design_variants?.[0]?.id || builderState.selectedVariantId || "";
      saveGeneratedSite({
        business_id: builderState.currentBusinessId,
        site_id: builderState.currentSiteId,
        generation_id: builderState.currentGenerationId,
        storage_status: builderState.currentSiteId ? "ai_revision_preview" : "ai_revision_preview_unsaved",
        schema: builderState.currentSchema,
        used_dev_mock: false,
      });
      renderEditor();
      renderPreview();
      showGeneratedClientPreview();
      document.body.classList.add("draft-adjust-open");
      guidedPanel.classList.add("active");
      appendChatMessage(
        "assistant",
        serverEdit.patchSummary || draftAdjustmentReply(false, templateSelection),
        "success",
      );
      builderAvatarManager?.setState("success", { source: "draft-adjustment" });
      return;
    }

    const shouldRebuildFromTemplate = shouldRebuildDraftFromTemplate(message, payload, templateSelection);
    const nextSchema = shouldRebuildFromTemplate
      ? buildInstantTemplateSchema(payload, templateSelection)
      : applyTargetedSchemaPatch(builderState.currentSchema, message, payload, localContextUpdates, templateSelection);
    const mergedSchema = templateSelection ? mergeTemplateSelectionIntoSchema(nextSchema, templateSelection) : nextSchema;
    builderState.currentSchema = prepareWebsiteConfig(mergedSchema, payload, templateSelection);
    if (briefRequestsCyberpunk(text)) builderState.currentSchema = applyCyberpunkVisualDirection(builderState.currentSchema);
    builderState.currentCatalogItems = catalogItemsFromSchema(builderState.currentSchema);
    builderState.selectedPageKey = builderState.currentSchema.pages?.[0]?.page_key || "home";
    builderState.selectedVariantId = builderState.currentSchema.design_variants?.[0]?.id || builderState.selectedVariantId || "";
    saveGeneratedSite({
      business_id: builderState.currentBusinessId,
      site_id: builderState.currentSiteId,
      generation_id: builderState.currentGenerationId,
      storage_status: builderState.currentSiteId ? "local_revision_preview" : "local_revision_preview_unsaved",
      schema: builderState.currentSchema,
      used_dev_mock: false,
    });
    renderEditor();
    renderPreview();
    showGeneratedClientPreview();
    document.body.classList.add("draft-adjust-open");
    guidedPanel.classList.add("active");
    appendChatMessage(
      "assistant",
      draftAdjustmentReply(shouldRebuildFromTemplate, templateSelection),
      "success",
    );
    builderAvatarManager?.setState("success", { source: "draft-adjustment" });
  } catch (error) {
    console.warn("Draft adjustment could not be applied locally.", error);
    appendChatMessage(
      "assistant",
      langText({
        en: "I understood the change, but I could not apply it visually in this pass. I saved it as a specific revision instruction so the next generation changes only that.",
        es: "Entendí el cambio, pero no pude aplicarlo visualmente en este pase. Lo dejé guardado como instrucción específica para que la próxima generación cambie sólo eso.",
        fr: "J'ai compris le changement, mais je n'ai pas pu l'appliquer visuellement maintenant. Je l'ai gardé comme instruction précise pour la prochaine génération.",
        pt: "Entendi a mudança, mas não consegui aplicar visualmente agora. Deixei como instrução específica para a próxima geração mudar só isso.",
      }),
      "alert",
    );
    builderAvatarManager?.setState("alert", { source: "draft-adjustment" });
  } finally {
    setThinking(false);
  }
}

export function closeDraftAdjustmentChat() {
  document.body.classList.remove("draft-adjust-open", "guided-modal-open", "review-details-open", "final-review-mode");
  guidedPanel.classList.remove("active");
  document.body.classList.add("generated-preview-open", "client-preview-mode");
  syncLyraExperienceMode();
  storageStatus.textContent = langText({
    en: "Draft preview is still open.",
    es: "El preview del borrador sigue abierto.",
    fr: "L'apercu du brouillon reste ouvert.",
    pt: "O preview do rascunho continua aberto.",
  });
}

export function assistantVisibleCopy(value) {
  return String(value ?? "")
    .replace(/\bLuma\b/g, "LYRA")
    .replace(/\bGNU Dev\b/g, "LYRA")
    .replace(/gnu-dev-assistant/g, "nixie_idle");
}

export function publicAssistantCopy(value) {
  return isPublicClientSetup ? assistantVisibleCopy(value) : value;
}
