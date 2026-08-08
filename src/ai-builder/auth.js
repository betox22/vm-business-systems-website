import {
  CLIENT_INTAKE_SESSION_URL,
  CLIENT_AUTH_ME_URL,
  CLIENT_AUTH_SESSION_URL,
  CLIENT_AUTH_LOGOUT_URL,
  CLIENT_PROJECTS_URL,
  SUPABASE_AUTH_URL,
  SUPPORTED_LANGUAGES,
  GUIDED_DRAFT_STORAGE_KEY,
  GENERATED_SITE_STORAGE_KEY,
  CLIENT_INTAKE_SESSION_STORAGE_KEY,
  CLIENT_WORKSPACE_IDLE_LOCK_MS,
} from './config.js';
import { escapeHtml, escapeAttribute } from './utils.js';
import {
  builderState,
  createEmptyGuidedState,
} from './state.js';
import {
  isPublicClientSetup,
  isEmbeddedClientSetup,
  studioAuthGate,
  studioAuthCloseButton,
  studioGoogleAuthButton,
  studioAppleAuthButton,
  studioEmailAuthButton,
  studioEmailAuthForm,
  studioAuthEmail,
  studioAuthDemoButton,
  guidedHeaderActions,
  guidedChatCard,
  guidedChat,
  guidedStatusText,
  guidedGenerateButton,
  currentInfoPreview,
  guidedBriefReview,
  domainResults,
  startNewProjectButton,
  startNewGeneratedProjectButton,
} from './dom.js';
import {
  applyGuidedStateToForm,
  arrayValue,
  catalogItemsFromSchema,
  compactEmailLabel,
  continuePendingStudioAction,
  fetchWithTimeout,
  formatProjectUpdatedAt,
  guidedAskedSteps,
  guidedCompletionPercent,
  guidedStateForApi,
  handleGuidedGenerateButton,
  isCloudSafeUrl,
  isValidWorkspaceEmail,
  langText,
  mergeGuidedUpdates,
  missingGuidedSteps,
  persistPendingStudioAccountAction,
  prepareWebsiteConfig,
  readErrorMessage,
  refreshQuickChips,
  renderEditor,
  renderGuidedSummary,
  renderLiveSitePreview,
  renderPreview,
  renderRestoredDraftNotice,
  resetAssistantConversation,
  resetGuidedStateForNewAccount,
  reviewAndGenerateFromGuided,
  saveGeneratedSite,
  setAssistantState,
  setSelectedLanguage,
  shortError,
  showGeneratedClientPreview,
  storageLabel,
  storedClientAccessToken,
  syncLyraExperienceMode,
  t,
} from './index.js';

const CLIENT_INTAKE_AUTOSAVE_DELAY_MS = 15000;
const CLIENT_AUTH_SLOW_NOTICE_DELAY_MS = 9000;
let clientAuthSlowNoticeTimer = null;

function authLoadingElements() {
  return {
    content: studioAuthGate?.querySelector("[data-studio-auth-content]") || null,
    loading: studioAuthGate?.querySelector("[data-studio-auth-loading]") || null,
    title: studioAuthGate?.querySelector("[data-studio-auth-loading-title]") || null,
    message: studioAuthGate?.querySelector("[data-studio-auth-loading-message]") || null,
  };
}

function resetStudioAuthLoading() {
  clearTimeout(clientAuthSlowNoticeTimer);
  clientAuthSlowNoticeTimer = null;
  const { content, loading } = authLoadingElements();
  if (content) content.hidden = false;
  if (loading) loading.hidden = true;
  studioAuthGate?.removeAttribute("aria-busy");
}

function showStudioAuthLoading() {
  if (!studioAuthGate) return;
  const { content, loading, title, message } = authLoadingElements();
  clearTimeout(clientAuthSlowNoticeTimer);
  studioAuthGate.hidden = false;
  studioAuthGate.setAttribute("aria-busy", "true");
  document.body.classList.add("studio-auth-open", "client-auth-required");
  if (content) content.hidden = true;
  if (loading) loading.hidden = false;
  if (title) title.textContent = langText({
    en: "Connecting your session",
    es: "Conectando tu sesión",
    fr: "Connexion de votre session",
    pt: "Conectando sua sessão",
  });
  if (message) message.textContent = langText({
    en: "We are securely validating your access.",
    es: "Estamos validando tu acceso seguro.",
    fr: "Nous validons votre accès sécurisé.",
    pt: "Estamos validando seu acesso seguro.",
  });
  clientAuthSlowNoticeTimer = setTimeout(() => {
    if (studioAuthGate?.hidden || loading?.hidden) return;
    if (message) message.textContent = langText({
      en: "This is taking a little longer than usual. Your session is still being checked.",
      es: "Esto está tardando un poco más de lo normal. Tu sesión se sigue verificando.",
      fr: "Cela prend un peu plus de temps que prévu. Votre session est toujours en cours de vérification.",
      pt: "Isso está demorando um pouco mais que o normal. Sua sessão continua sendo verificada.",
    });
  }, CLIENT_AUTH_SLOW_NOTICE_DELAY_MS);
}

export function initClientIntakeSessionGate() {
  if (!isPublicClientSetup) return;
  ensureStudioAuthRedirectCaptured();
  if (storedClientAccessToken()) {
    showStudioAuthLoading();
    resumeClientSessionFromAuthToken();
    return;
  }
  if (!isClientWorkspaceUnlocked()) {
    openStudioAuthGate("start");
    if (studioAuthDemoButton) studioAuthDemoButton.hidden = true;
    if (studioEmailAuthForm) studioEmailAuthForm.hidden = false;
    if (studioAuthEmail) {
      studioAuthEmail.value = builderState.guidedState.contactInfo?.email || localStorage.getItem("lumaPendingClientEmail") || "";
      setTimeout(() => studioAuthEmail.focus(), 80);
    }
    if (guidedStatusText) {
      guidedStatusText.textContent = langText({
        en: "Sign in first so LYRA can protect and save this workspace.",
        es: "Inicia sesión primero para que LYRA proteja y guarde este espacio.",
        fr: "Connectez-vous d'abord pour que LYRA protège et sauvegarde cet espace.",
        pt: "Entre primeiro para a LYRA proteger e salvar este espaço.",
      });
    }
    return;
  }
  const stored = readClientIntakeSession();
  if (stored?.clientEmail) {
    builderState.clientIntakeSession = stored;
    hydrateClientIntakeSession(stored, { silent: true });
    syncClientIntakeSession({ immediate: true, reason: "resume" });
    return;
  }
  openStudioAuthGate("start");
  if (studioAuthDemoButton) studioAuthDemoButton.hidden = true;
  if (studioEmailAuthForm) studioEmailAuthForm.hidden = false;
  if (studioEmailAuthButton) studioEmailAuthButton.hidden = true;
  // Bug fix (2026-07-19): this used to hide Google for the public client
  // flow too (isPublicClientSetup === true), which meant real clients could
  // never see the Google button at all -- only email, which has no identity
  // verification. Google is fully wired now (Supabase Auth, already enabled
  // on the project), so it should always be offered. Apple stays hidden for
  // public clients until it's enabled in Supabase (needs Beto's own Apple
  // Developer Program setup) -- showing it today would just be a dead end.
  if (studioGoogleAuthButton) studioGoogleAuthButton.hidden = false;
  if (studioAppleAuthButton) studioAppleAuthButton.hidden = isPublicClientSetup;
  if (studioAuthEmail) {
    studioAuthEmail.value = builderState.guidedState.contactInfo?.email || localStorage.getItem("lumaPendingClientEmail") || "";
    setTimeout(() => studioAuthEmail.focus(), 80);
  }
  if (guidedStatusText) {
    guidedStatusText.textContent = langText({
      en: "Create or resume your workspace first, so LYRA can save every answer.",
      es: "Crea o recupera tu espacio primero, así LYRA guarda cada respuesta.",
      fr: "Créez ou reprenez votre espace pour que LYRA sauvegarde chaque réponse.",
      pt: "Crie ou recupere seu espaço primeiro para a LYRA salvar cada resposta.",
    });
  }
}

export function isClientWorkspaceUnlocked() {
  return builderState.clientWorkspaceUnlocked;
}

export function markClientWorkspaceUnlocked() {
  builderState.clientWorkspaceUnlocked = true;
  scheduleClientWorkspaceAutoLock();
}

export function clearClientWorkspaceUnlock() {
  builderState.clientWorkspaceUnlocked = false;
  clearTimeout(builderState.clientWorkspaceIdleTimer);
}

export function initClientWorkspaceSecurity() {
  if (!isPublicClientSetup) return;
  scheduleClientWorkspaceAutoLock();
  ["pointerdown", "keydown", "touchstart"].forEach((eventName) => {
    window.addEventListener(eventName, scheduleClientWorkspaceAutoLock, { passive: true });
  });
  window.addEventListener("pagehide", () => {
    clearClientWorkspaceUnlock();
  });
}

export function scheduleClientWorkspaceAutoLock() {
  if (!isPublicClientSetup) return;
  clearTimeout(builderState.clientWorkspaceIdleTimer);
  if (!isClientWorkspaceUnlocked()) return;
  builderState.clientWorkspaceIdleTimer = setTimeout(() => {
    lockClientWorkspace("idle");
  }, CLIENT_WORKSPACE_IDLE_LOCK_MS);
}

export function lockClientWorkspace(reason = "idle") {
  if (!isPublicClientSetup) return;
  clearClientWorkspaceUnlock();
  openStudioAuthGate("start");
  if (studioAuthDemoButton) studioAuthDemoButton.hidden = true;
  if (studioEmailAuthForm) studioEmailAuthForm.hidden = false;
  if (studioEmailAuthButton) studioEmailAuthButton.hidden = true;
  // Bug fix (2026-07-19): this used to hide Google for the public client
  // flow too (isPublicClientSetup === true), which meant real clients could
  // never see the Google button at all -- only email, which has no identity
  // verification. Google is fully wired now (Supabase Auth, already enabled
  // on the project), so it should always be offered. Apple stays hidden for
  // public clients until it's enabled in Supabase (needs Beto's own Apple
  // Developer Program setup) -- showing it today would just be a dead end.
  if (studioGoogleAuthButton) studioGoogleAuthButton.hidden = false;
  if (studioAppleAuthButton) studioAppleAuthButton.hidden = isPublicClientSetup;
  if (guidedStatusText) {
    guidedStatusText.textContent = reason === "idle"
      ? langText({
          en: "Workspace locked after inactivity. Sign in again to continue.",
          es: "Espacio bloqueado por inactividad. Inicia sesión otra vez para continuar.",
          fr: "Espace verrouillé après inactivité. Connectez-vous à nouveau pour continuer.",
          pt: "Espaço bloqueado por inatividade. Entre novamente para continuar.",
        })
      : langText({
          en: "Sign in again to continue.",
          es: "Inicia sesión otra vez para continuar.",
          fr: "Connectez-vous à nouveau pour continuer.",
          pt: "Entre novamente para continuar.",
        });
  }
}

export function readClientIntakeSession() {
  try {
    const raw = localStorage.getItem(CLIENT_INTAKE_SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem(CLIENT_INTAKE_SESSION_STORAGE_KEY);
    return null;
  }
}

export function writeClientIntakeSession(session) {
  const cleanSession = {
    ...(session || {}),
    draft: sanitizeClientSessionDraft(session?.draft || {}),
  };
  builderState.clientIntakeSession = {
    ...(builderState.clientIntakeSession || {}),
    ...cleanSession,
    savedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(CLIENT_INTAKE_SESSION_STORAGE_KEY, JSON.stringify(builderState.clientIntakeSession));
  } catch {
    // Account state is helpful, not required for the live session.
  }
  renderClientAccountControl();
}

export function renderClientAccountControl() {
  if (!isPublicClientSetup || !guidedHeaderActions) return;
  if (!builderState.clientAccountButton) {
    builderState.clientAccountButton = document.createElement("button");
    builderState.clientAccountButton.id = "clientAccountButton";
    builderState.clientAccountButton.className = "secondary-action compact-action client-account-button";
    builderState.clientAccountButton.type = "button";
    builderState.clientAccountButton.addEventListener("click", switchClientAccount);
    guidedHeaderActions.insertBefore(builderState.clientAccountButton, guidedHeaderActions.firstChild);
  }
  if (!builderState.clientProjectsButton) {
    builderState.clientProjectsButton = document.createElement("button");
    builderState.clientProjectsButton.id = "clientProjectsButton";
    builderState.clientProjectsButton.className = "secondary-action compact-action client-projects-button";
    builderState.clientProjectsButton.type = "button";
    builderState.clientProjectsButton.addEventListener("click", openClientProjectsPanel);
    guidedHeaderActions.insertBefore(builderState.clientProjectsButton, builderState.clientAccountButton.nextSibling);
  }
  const session = builderState.clientIntakeSession || readClientIntakeSession();
  const email = session?.clientEmail || localStorage.getItem("lumaPendingClientEmail") || "";
  builderState.clientAccountButton.textContent = email
    ? langText({
        en: `Account: ${compactEmailLabel(email)}`,
        es: `Cuenta: ${compactEmailLabel(email)}`,
        fr: `Compte : ${compactEmailLabel(email)}`,
        pt: `Conta: ${compactEmailLabel(email)}`,
      })
    : langText({ en: "Sign in", es: "Iniciar sesión", fr: "Connexion", pt: "Entrar" });
  builderState.clientProjectsButton.textContent = t("myPages");
  builderState.clientProjectsButton.hidden = !storedClientAccessToken();
}

export function switchClientAccount() {
  const hasSession = Boolean(builderState.clientIntakeSession?.clientEmail || readClientIntakeSession()?.clientEmail || storedClientAccessToken());
  if (hasSession) {
    const ok = window.confirm(langText({
      en: "Switch account? This clears the current business draft from this browser -- the next workspace starts clean.",
      es: "¿Cambiar cuenta? Esto borra el borrador de negocio actual de este navegador -- el siguiente workspace empieza limpio.",
      fr: "Changer de compte ? Cela efface le brouillon d'entreprise actuel de ce navigateur -- le prochain espace démarre à zéro.",
      pt: "Trocar de conta? Isso apaga o rascunho de negócio atual deste navegador -- o próximo workspace começa limpo.",
    }));
    if (!ok) return;
  }
  builderState.clientIntakeSession = null;
  localStorage.removeItem(CLIENT_INTAKE_SESSION_STORAGE_KEY);
  localStorage.removeItem("lumaClientAccessToken");
  localStorage.removeItem("lumaClientRefreshToken");
  localStorage.removeItem("lumaPendingClientEmail");
  sessionStorage.removeItem("lumaClientAccessToken");
  sessionStorage.removeItem("lumaClientRefreshToken");
  resetGuidedStateForNewAccount();
  applyGuidedStateToForm();
  renderGuidedSummary();
  clearClientWorkspaceUnlock();
  renderClientAccountControl();
  openStudioAuthGate("start");
  if (studioAuthDemoButton) studioAuthDemoButton.hidden = true;
  if (studioEmailAuthForm) studioEmailAuthForm.hidden = false;
  if (studioEmailAuthButton) studioEmailAuthButton.hidden = true;
  // Bug fix (2026-07-19): this used to hide Google for the public client
  // flow too (isPublicClientSetup === true), which meant real clients could
  // never see the Google button at all -- only email, which has no identity
  // verification. Google is fully wired now (Supabase Auth, already enabled
  // on the project), so it should always be offered. Apple stays hidden for
  // public clients until it's enabled in Supabase (needs Beto's own Apple
  // Developer Program setup) -- showing it today would just be a dead end.
  if (studioGoogleAuthButton) studioGoogleAuthButton.hidden = false;
  if (studioAppleAuthButton) studioAppleAuthButton.hidden = isPublicClientSetup;
  if (studioAuthEmail) {
    studioAuthEmail.value = "";
    studioAuthEmail.focus();
  }
}

export function captureClientAuthResetIntent() {
  if (!isPublicClientSetup) return;
  const params = new URLSearchParams(window.location.search);
  const shouldReset = ["test-login", "force-login", "logout"].some((key) => {
    const value = params.get(key);
    return value === "" || value === "1" || value === "true";
  });
  if (!shouldReset) return;
  builderState.clientIntakeSession = null;
  clearClientWorkspaceUnlock();
  localStorage.removeItem(GUIDED_DRAFT_STORAGE_KEY);
  localStorage.removeItem(GENERATED_SITE_STORAGE_KEY);
  localStorage.removeItem(CLIENT_INTAKE_SESSION_STORAGE_KEY);
  localStorage.removeItem("lumaPendingGeneratedSite");
  localStorage.removeItem("lumaPendingAuthAction");
  localStorage.removeItem("lumaClientAccessToken");
  localStorage.removeItem("lumaClientRefreshToken");
  sessionStorage.removeItem("lumaClientAccessToken");
  sessionStorage.removeItem("lumaClientRefreshToken");
  sessionStorage.removeItem("vm_portal_preview_token");
  if (params.has("logout")) {
    localStorage.removeItem("lumaPendingClientEmail");
  }
}

export function clientAuthHeaders(extra = {}) {
  const token = storedClientAccessToken();
  return {
    ...extra,
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

export function handleExpiredClientAuth(reason = "unknown", detail = null) {
  console.error("Client OAuth session expired or rejected", {
    reason,
    detail,
    tokenPresent: Boolean(storedClientAccessToken()),
  });
  localStorage.removeItem("lumaClientAccessToken");
  localStorage.removeItem("lumaClientRefreshToken");
  sessionStorage.removeItem("lumaClientAccessToken");
  sessionStorage.removeItem("lumaClientRefreshToken");
  fetch(CLIENT_AUTH_LOGOUT_URL, { method: "POST", credentials: "include" }).catch(() => {});
  closeClientProjectsPanel();
  renderClientAccountControl();
  openStudioAuthGate("start");
}

export async function fetchClientAuthUser() {
  const token = storedClientAccessToken();
  if (!token) {
    console.error("Cannot validate client auth: no stored access token.");
    return null;
  }
  const response = await fetch(CLIENT_AUTH_ME_URL, {
    headers: clientAuthHeaders(),
    credentials: "include",
  });
  if (!response.ok) {
    const message = await readErrorMessage(response);
    console.error("Client auth /me validation failed", {
      status: response.status,
      message,
      tokenPresent: Boolean(token),
    });
    if (response.status === 401) {
      handleExpiredClientAuth("auth-me-401", { status: response.status, message });
    }
    throw new Error(message);
  }
  return response.json();
}

export async function fetchClientProjects() {
  if (!storedClientAccessToken()) return [];
  const response = await fetchWithTimeout(CLIENT_PROJECTS_URL, {
    headers: clientAuthHeaders(),
    credentials: "include",
  }, 12000);
  if (!response.ok) {
    if (response.status === 401) handleExpiredClientAuth();
    throw new Error(await readErrorMessage(response));
  }
  const data = await response.json();
  return Array.isArray(data.projects) ? data.projects : [];
}

export function ensureClientProjectsPanel() {
  if (builderState.clientProjectsPanel) return builderState.clientProjectsPanel;
  builderState.clientProjectsPanel = document.createElement("section");
  builderState.clientProjectsPanel.className = "client-projects-panel";
  builderState.clientProjectsPanel.hidden = true;
  builderState.clientProjectsPanel.setAttribute("aria-label", "Mis páginas");
  builderState.clientProjectsPanel.addEventListener("click", (event) => {
    if (event.target?.closest?.("[data-client-projects-close]")) {
      closeClientProjectsPanel();
      return;
    }
    const continueButton = event.target?.closest?.("[data-client-project-id]");
    if (continueButton) {
      loadClientProject(continueButton.dataset.clientProjectId).catch((error) => {
        console.warn("Could not open client project", error);
        if (storageStatus) storageStatus.textContent = t("loadProjectsError");
      });
      return;
    }
    if (event.target?.closest?.("[data-client-new-project]")) {
      startNewClientProject({ skipConfirm: true });
    }
  });
  document.body.appendChild(builderState.clientProjectsPanel);
  return builderState.clientProjectsPanel;
}

export function renderClientProjectsLoading() {
  const panel = ensureClientProjectsPanel();
  panel.innerHTML = `
    <div class="client-projects-card">
      <div class="client-projects-head">
        <span>${escapeHtml(t("myPages"))}</span>
        <h2>${escapeHtml(langText({ en: "Loading your saved pages", es: "Cargando tus páginas", fr: "Chargement de vos pages", pt: "Carregando suas páginas" }))}</h2>
        <p>${escapeHtml(langText({ en: "LYRA is checking the projects saved under your account.", es: "LYRA está revisando los proyectos guardados en tu cuenta.", fr: "LYRA vérifie les projets enregistrés sur votre compte.", pt: "LYRA está verificando os projetos salvos na sua conta." }))}</p>
      </div>
      <div class="client-projects-skeleton"></div>
    </div>
  `;
  panel.hidden = false;
  document.body.classList.add("client-projects-open");
}

export function renderClientProjectsPanel(projects = []) {
  const panel = ensureClientProjectsPanel();
  const emptyState = `
    <div class="client-projects-empty">
      <strong>${escapeHtml(t("myPages"))}</strong>
      <p>${escapeHtml(t("emptyProjects"))}</p>
    </div>
  `;
  const rows = projects.map((project) => `
    <article class="client-project-card">
      <div>
        <span>${escapeHtml(project.status || "draft")}</span>
        <h3>${escapeHtml(project.business_name || "Untitled page")}</h3>
        <p>${escapeHtml(project.template_name || "Generated website")} · ${escapeHtml(formatProjectUpdatedAt(project.updated_at))}</p>
        ${project.public_url ? `<small>${escapeHtml(project.public_url)}</small>` : ""}
      </div>
      <button type="button" data-client-project-id="${escapeAttribute(project.id)}">${escapeHtml(t("openProject"))}</button>
    </article>
  `).join("");
  panel.innerHTML = `
    <div class="client-projects-card">
      <button class="client-projects-close" type="button" data-client-projects-close aria-label="Close">×</button>
      <div class="client-projects-head">
        <span>${escapeHtml(langText({ en: "Your workspace", es: "Tu espacio", fr: "Votre espace", pt: "Seu espaço" }))}</span>
        <h2>${escapeHtml(langText({ en: "Choose a page to continue", es: "Elige una página para continuar", fr: "Choisissez une page à continuer", pt: "Escolha uma página para continuar" }))}</h2>
        <p>${escapeHtml(langText({
          en: "Each page stays separate under your account.",
          es: "Cada página queda separada dentro de tu cuenta.",
          fr: "Chaque page reste séparée dans votre compte.",
          pt: "Cada página fica separada dentro da sua conta.",
        }))}</p>
      </div>
      <div class="client-projects-list">${rows || emptyState}</div>
      <button class="client-new-project-button" type="button" data-client-new-project>${escapeHtml(t("startNewProject"))}</button>
    </div>
  `;
  panel.hidden = false;
  document.body.classList.add("client-projects-open");
}

export function closeClientProjectsPanel() {
  if (builderState.clientProjectsPanel) builderState.clientProjectsPanel.hidden = true;
  document.body.classList.remove("client-projects-open");
}

export async function openClientProjectsPanel() {
  if (!isPublicClientSetup) return;
  if (!storedClientAccessToken()) {
    openStudioAuthGate("start");
    return;
  }
  renderClientProjectsLoading();
  try {
    builderState.clientProjects = await fetchClientProjects();
    renderClientProjectsPanel(builderState.clientProjects);
  } catch (error) {
    console.warn("Could not load client projects", error);
    if (!storedClientAccessToken()) return;
    if (storageStatus) storageStatus.textContent = t("loadProjectsError");
    renderClientProjectsPanel([]);
  }
}

export async function handleClientProjectsAfterAuth(user, session) {
  if (!isPublicClientSetup || !storedClientAccessToken()) return;
  try {
    builderState.clientProjects = await fetchClientProjects();
  } catch (error) {
    console.warn("Could not load client projects", error);
    return;
  }
  if (builderState.clientProjects.length > 1) {
    renderClientProjectsPanel(builderState.clientProjects);
    guidedStatusText.textContent = langText({
      en: "Choose which page you want to continue, or start a new one.",
      es: "Elige qué página quieres continuar, o crea una nueva.",
      fr: "Choisissez la page à continuer, ou créez-en une nouvelle.",
      pt: "Escolha qual página deseja continuar, ou crie uma nova.",
    });
    return;
  }
  if (builderState.clientProjects.length === 1 && !builderState.currentSchema) {
    await loadClientProject(builderState.clientProjects[0].id, { silent: true, session });
  }
}

export async function loadClientProject(projectId, options = {}) {
  if (!projectId) return;
  if (storageStatus && !options.silent) {
    storageStatus.textContent = langText({
      en: "Opening saved page...",
      es: "Abriendo página guardada...",
      fr: "Ouverture de la page enregistrée...",
      pt: "Abrindo página salva...",
    });
  }
  const response = await fetchWithTimeout(`${CLIENT_PROJECTS_URL}/${encodeURIComponent(projectId)}`, {
    headers: clientAuthHeaders(),
    credentials: "include",
  }, 14000);
  if (!response.ok) {
    if (response.status === 401) handleExpiredClientAuth();
    throw new Error(await readErrorMessage(response));
  }
  const data = await response.json();
  const schema = data.schema || {};
  builderState.currentSchema = prepareWebsiteConfig(schema, { brand: schema.brand || builderState.guidedState.brand || {} }, null);
  builderState.currentSiteId = data.generatedSiteId || data.site_id || projectId;
  builderState.currentBusinessId = data.business_id || builderState.currentBusinessId;
  builderState.currentGenerationId = null;
  builderState.currentCatalogItems = catalogItemsFromSchema(builderState.currentSchema);
  builderState.selectedPageKey = builderState.currentSchema.pages?.[0]?.page_key || "home";
  builderState.selectedVariantId = builderState.currentSchema.design_variants?.[0]?.id || "";
  builderState.guidedState.businessName = builderState.currentSchema.business?.name || builderState.guidedState.businessName;
  builderState.guidedState.businessDescription = builderState.currentSchema.business?.description || builderState.guidedState.businessDescription;
  builderState.guidedState.industry = builderState.currentSchema.business?.industry || builderState.guidedState.industry;
  builderState.guidedState.preferredTone = builderState.currentSchema.business?.tone || builderState.guidedState.preferredTone;
  builderState.guidedState.logoUrl = builderState.currentSchema.brand?.logoUrl || builderState.guidedState.logoUrl;
  builderState.guidedState.logoPreference = builderState.currentSchema.brand?.logoPreference || builderState.guidedState.logoPreference;
  builderState.guidedState.generatedSiteId = builderState.currentSiteId;
  builderState.guidedState.projectId = builderState.currentSiteId;
  builderState.clientIntakeSession = {
    ...(builderState.clientIntakeSession || options.session || {}),
    generatedSiteId: builderState.currentSiteId,
    projectId: builderState.currentSiteId,
    clientEmail: builderState.clientIntakeSession?.clientEmail || options.session?.clientEmail || localStorage.getItem("lumaPendingClientEmail") || "",
    draft: guidedSessionDraftForApi(),
  };
  writeClientIntakeSession(builderState.clientIntakeSession);
  closeClientProjectsPanel();
  saveGeneratedSite({
    schema: builderState.currentSchema,
    business_id: builderState.currentBusinessId,
    site_id: builderState.currentSiteId,
    generatedSiteId: builderState.currentSiteId,
    storage_status: data.storage_status || "stored",
    used_dev_mock: false,
  });
  siteTitle.textContent = builderState.currentSchema.business?.name || "Generated site";
  storageStatus.textContent = storageLabel(data.storage_status || "stored", false);
  renderEditor();
  renderPreview();
  renderGuidedSummary();
  renderLiveSitePreview();
  if (!options.silent) showGeneratedClientPreview();
}

export async function resumeClientSessionFromAuthToken() {
  if (builderState.clientAuthResumePromise) return builderState.clientAuthResumePromise;
  showStudioAuthLoading();
  builderState.clientAuthResumePromise = (async () => {
  try {
    const user = await fetchClientAuthUser();
    const email = user?.email || "";
    if (!email) throw new Error("Authenticated user email missing.");
    const name = user?.userMetadata?.full_name || user?.userMetadata?.name || builderState.guidedState.businessName || "";
    const session = await createOrResumeClientIntakeSession({
      email,
      name,
      reason: "oauth-resume",
    });
    if (storageStatus) {
      storageStatus.textContent = session.restored
        ? langText({
            en: "Session restored. LYRA will keep saving your progress.",
            es: "Sesión recuperada. LYRA seguirá guardando tu progreso.",
            fr: "Session restaurée. LYRA continuera à sauvegarder votre progression.",
            pt: "Sessão recuperada. LYRA continuará salvando seu progresso.",
          })
        : langText({
            en: "Session connected. LYRA will save every answer.",
            es: "Sesión conectada. LYRA guardará cada respuesta.",
            fr: "Session connectée. LYRA sauvegardera chaque réponse.",
            pt: "Sessão conectada. LYRA salvará cada resposta.",
          });
    }
    markClientWorkspaceUnlocked();
    closeStudioAuthGate();
    await handleClientProjectsAfterAuth(user, session);
    return session;
  } catch (error) {
    console.error("Could not resume client OAuth session", {
      message: error?.message || String(error),
      tokenPresent: Boolean(storedClientAccessToken()),
      clientIntakeSessionPresent: Boolean(builderState.clientIntakeSession),
    }, error);
    openStudioAuthGate("start");
    if (studioEmailAuthForm) studioEmailAuthForm.hidden = false;
    if (storageStatus) {
      storageStatus.textContent = langText({
        en: "Could not restore the login session. Continue with email.",
        es: "No se pudo recuperar la sesión. Continúa con email.",
        fr: "Impossible de restaurer la session. Continuez avec email.",
        pt: "Não foi possível recuperar a sessão. Continue com email.",
      });
    }
    return null;
  } finally {
    builderState.clientAuthResumePromise = null;
  }
  })();
  return builderState.clientAuthResumePromise;
}

export function hydrateClientIntakeSession(session, options = {}) {
  if (!session) return;
  builderState.currentRequestId = session.requestId || session.request_id || builderState.currentRequestId;
  builderState.currentSiteId = session.generatedSiteId || session.projectId || session.siteId || builderState.currentSiteId;
  if (session.restored) {
    builderState.restoredGuidedDraftInfo = builderState.restoredGuidedDraftInfo || {
      savedAt: "",
      completionPercent: guidedCompletionPercent(),
      missing: missingGuidedSteps(),
      source: "client_intake_session",
    };
  }
  const draft = sanitizeClientSessionDraft(session.draft || {});
  if (draft.selectedLanguage) setSelectedLanguage(draft.selectedLanguage);
  const normalizedDraft = {
    ...draft,
    servicesProducts: arrayValue(draft.servicesProducts),
    preferredColors: arrayValue(draft.preferredColors),
    photoUrls: arrayValue(draft.photoUrls),
    videoUrls: arrayValue(draft.videoUrls),
    contactInfo: { ...(draft.contactInfo || {}) },
  };
  normalizedDraft.generatedSiteId = session.generatedSiteId || session.projectId || normalizedDraft.generatedSiteId || "";
  normalizedDraft.projectId = session.projectId || session.generatedSiteId || normalizedDraft.projectId || "";
  if (session.clientEmail && !normalizedDraft.contactInfo.email) {
    normalizedDraft.contactInfo.email = session.clientEmail;
  }
  mergeGuidedUpdates(normalizedDraft);
  applyGuidedStateToForm();
  renderGuidedSummary();
  refreshQuickChips();
  renderLiveSitePreview();
  if (!options.silent && session.restored) {
    renderRestoredDraftNotice();
  }
}

export async function createOrResumeClientIntakeSession({ email, name = "", reason = "start", immediateDraft = null, forceNew = false } = {}) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!cleanEmail) throw new Error("Email is required.");
  const storedSession = readClientIntakeSession();
  const lastKnownEmail = String(
    builderState.clientIntakeSession?.clientEmail
      || builderState.clientIntakeSession?.client_email
      || storedSession?.clientEmail
      || storedSession?.client_email
      || localStorage.getItem("lumaPendingClientEmail")
      || ""
  ).trim().toLowerCase();
  if (lastKnownEmail && lastKnownEmail !== cleanEmail) {
    resetGuidedStateForNewAccount({ preserveAuth: Boolean(storedClientAccessToken()) });
  }
  const draft = sanitizeClientSessionDraft(immediateDraft || guidedSessionDraftForApi());
  draft.contactInfo = {
    ...(draft.contactInfo || {}),
    email: draft.contactInfo?.email || cleanEmail,
    name: draft.contactInfo?.name || name || draft.businessName || "",
  };
  const response = await fetchWithTimeout(CLIENT_INTAKE_SESSION_URL, {
    method: "POST",
    headers: clientAuthHeaders({ "content-type": "application/json" }),
    credentials: "include",
    body: JSON.stringify({
      email: cleanEmail,
      name,
      selectedLanguage: builderState.selectedLanguage,
      requestId: forceNew ? null : builderState.currentRequestId,
      generatedSiteId: forceNew ? "" : builderState.currentSiteId || builderState.clientIntakeSession?.generatedSiteId || builderState.clientIntakeSession?.projectId || "",
      projectId: forceNew ? "" : builderState.currentSiteId || builderState.clientIntakeSession?.generatedSiteId || builderState.clientIntakeSession?.projectId || "",
      forceNew,
      draft,
    }),
  }, 18000);
  if (!response.ok) throw new Error(await readErrorMessage(response));
  const session = await response.json();
  writeClientIntakeSession(session);
  localStorage.setItem("lumaPendingClientEmail", cleanEmail);
  hydrateClientIntakeSession(session, { silent: reason === "autosave" });
  return session;
}

export function syncClientIntakeSession({ immediate = false, reason = "autosave" } = {}) {
  if (!isPublicClientSetup || !builderState.clientIntakeSession?.clientEmail) return;
  const currentSnapshot = JSON.stringify(guidedStateForApi());
  if (currentSnapshot === builderState.clientIntakeLastSyncedSnapshot) return;
  clearTimeout(builderState.clientIntakeSyncTimer);
  const run = async () => {
    if (builderState.clientIntakeSyncInFlight) return;
    builderState.clientIntakeSyncInFlight = true;
    try {
      const session = await createOrResumeClientIntakeSession({
        email: builderState.clientIntakeSession.clientEmail,
        name: builderState.guidedState.contactInfo?.name || builderState.guidedState.businessName || "",
        reason,
      });
      if (session.requestId) builderState.currentRequestId = session.requestId;
      builderState.clientIntakeLastSyncedSnapshot = currentSnapshot;
    } catch (error) {
      console.warn("Client intake autosave failed", error);
      if (guidedStatusText) {
        guidedStatusText.textContent = langText({
          en: "Saved in this browser. Cloud sync will retry.",
          es: "Guardado en este navegador. La nube reintentará.",
          fr: "Enregistré dans ce navigateur. La synchronisation réessaiera.",
          pt: "Salvo neste navegador. A nuvem tentará novamente.",
        });
      }
    } finally {
      builderState.clientIntakeSyncInFlight = false;
    }
  };
  if (immediate) {
    run();
  } else {
    builderState.clientIntakeSyncTimer = setTimeout(run, CLIENT_INTAKE_AUTOSAVE_DELAY_MS);
  }
}

export function startNewClientProject(options = {}) {
  if (!isPublicClientSetup) return;
  const hasExistingWork = Boolean(builderState.currentSchema || builderState.guidedState.businessName || builderState.guidedState.businessDescription || builderState.guidedState.websiteIntent);
  if (hasExistingWork && !options.skipConfirm && !window.confirm(t("startNewProjectConfirm"))) return;
  const existingEmail = builderState.clientIntakeSession?.clientEmail || readClientIntakeSession()?.clientEmail || "";
  closeClientProjectsPanel();

  localStorage.removeItem(GUIDED_DRAFT_STORAGE_KEY);
  localStorage.removeItem(GENERATED_SITE_STORAGE_KEY);
  localStorage.removeItem("lumaPendingGeneratedSite");
  localStorage.removeItem("lumaPendingAuthAction");

  builderState.currentSchema = null;
  builderState.selectedPageKey = "home";
  builderState.selectedVariantId = "";
  builderState.selectedStudioSectionId = "";
  builderState.currentRequestId = null;
  builderState.currentSiteId = "";
  builderState.currentBusinessId = "";
  builderState.currentGenerationId = null;
  builderState.currentCatalogItems = [];
  builderState.forcedTemplateSelection = null;
  builderState.restoredGuidedDraftInfo = null;
  builderState.guidedStep = "websiteIntent";
  builderState.lastAskedGuidedField = "";
  builderState.guidedState = createEmptyGuidedState(builderState.selectedLanguage);
  if (existingEmail) builderState.guidedState.contactInfo.email = existingEmail;
  guidedAskedSteps.clear();
  builderState.lastAssistantPromptSignature = "";

  document.body.classList.remove(
    "generated-preview-open",
    "client-preview-mode",
    "draft-adjust-open",
    "review-details-open",
    "final-review-mode",
    "manual-form-open",
    "studio-auth-open",
  );
  syncLyraExperienceMode();
  guidedPanel?.classList.add("active");
  form?.classList.remove("active");
  previewFrame.innerHTML = "";
  applyGuidedStateToForm();
  renderGuidedSummary();
  refreshQuickChips();
  renderLiveSitePreview();
  resetAssistantConversation();
  guidedStatusText.textContent = langText({
    en: "New page started.",
    es: "Nueva página iniciada.",
    fr: "Nouvelle page commencée.",
    pt: "Nova página iniciada.",
  });
  if (existingEmail) {
    createOrResumeClientIntakeSession({
      email: existingEmail,
      name: "",
      reason: "new-project",
      forceNew: true,
    }).catch((error) => console.warn("Could not create new client intake session", error));
  } else {
    initClientIntakeSessionGate();
  }
  guidedReply?.focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function ensureStudioAuthRedirectCaptured() {
  if (builderState.studioAuthRedirectCaptureComplete) return;
  captureStudioAuthRedirect();
}

export function establishServerSession(accessToken, refreshToken) {
  fetch(CLIENT_AUTH_SESSION_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken || "" }),
  }).catch((error) => {
    console.error("Could not establish httpOnly session cookie (non-fatal, header-based auth still works)", error);
  });
}

export function captureStudioAuthRedirect() {
  if (builderState.studioAuthRedirectCaptureComplete) return;
  try {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const queryParams = new URLSearchParams(window.location.search);
    const accessToken = hashParams.get("access_token") || queryParams.get("access_token") || "";
    const refreshToken = hashParams.get("refresh_token") || queryParams.get("refresh_token") || "";
    if (!accessToken) return;
    localStorage.setItem("lumaClientAccessToken", accessToken);
    if (refreshToken) localStorage.setItem("lumaClientRefreshToken", refreshToken);
    // 2026-07-25: also hand the token to the backend so it can set it as an
    // httpOnly cookie (see POST /api/client/auth/session). This runs
    // alongside the existing localStorage/Authorization-header flow rather
    // than replacing it -- if the cookie call fails for any reason (e.g. a
    // third-party-cookie block in some browser), login still works exactly
    // as it did before via the header.
    establishServerSession(accessToken, refreshToken);
    markClientWorkspaceUnlocked();
    restorePendingStudioAfterAuth();
    if (isPublicClientSetup) {
      setTimeout(() => resumeClientSessionFromAuthToken(), 0);
    }
    const cleanUrl = new URL(window.location.href);
    cleanUrl.hash = "";
    ["access_token", "refresh_token", "expires_in", "expires_at", "token_type", "type"].forEach((param) => cleanUrl.searchParams.delete(param));
    window.history.replaceState({}, "", cleanUrl);
  } finally {
    builderState.studioAuthRedirectCaptureComplete = true;
  }
}

export function restorePendingStudioAfterAuth() {
  try {
    const raw = localStorage.getItem("lumaPendingGeneratedSite");
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (!saved.schema) return;
    builderState.currentSchema = prepareWebsiteConfig(saved.schema, { brand: saved.schema.brand || builderState.guidedState.brand || {} }, null);
    builderState.currentSiteId = saved.siteId || builderState.currentSiteId;
    builderState.currentBusinessId = saved.businessId || builderState.currentBusinessId;
    builderState.currentCatalogItems = catalogItemsFromSchema(builderState.currentSchema);
    builderState.selectedPageKey = saved.selectedPageKey || builderState.currentSchema.pages?.[0]?.page_key || "home";
    builderState.selectedVariantId = builderState.currentSchema.design_variants?.[0]?.id || builderState.selectedVariantId || "";
    siteTitle.textContent = builderState.currentSchema.business?.name || "Generated site";
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

export function guidedSessionDraftForApi() {
  const logoUrl = isCloudSafeUrl(builderState.guidedState.logoUrl) ? builderState.guidedState.logoUrl : "";
  const logoPreference = builderState.guidedState.logoPreference || (builderState.guidedState.aiGeneratedLogoRequested ? "generate_ai_logo" : "");
  const fieldMeta = { ...(builderState.guidedState.fieldMeta || {}) };
  if (logoPreference) {
    fieldMeta.logo = fieldMeta.logo || { source: "explicit", confidence: 1 };
    fieldMeta.logoPreference = fieldMeta.logoPreference || { source: "explicit", confidence: 1 };
  }
  return sanitizeClientSessionDraft({
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
    photoUrls: arrayValue(builderState.guidedState.photoUrls).filter(isCloudSafeUrl),
    videoUrls: arrayValue(builderState.guidedState.videoUrls).filter(isCloudSafeUrl),
    logoPalette: arrayValue(builderState.guidedState.logoPalette),
    logoPreference,
    fieldMeta,
    selectedLanguage: builderState.selectedLanguage,
    hasLogo: Boolean(builderState.guidedState.hasLogo || builderState.guidedState.logoUrl),
    hasPhotos: Boolean(builderState.guidedState.hasPhotos || arrayValue(builderState.guidedState.photoUrls).length || arrayValue(builderState.guidedState.videoUrls).length),
    salesMode: builderState.guidedState.salesMode,
    hasLogoPhotos: builderState.guidedState.hasLogoPhotos,
    sectionsPreference: builderState.guidedState.sectionsPreference,
    selectedTemplateId: builderState.guidedState.selectedTemplateId || builderState.forcedTemplateSelection?.templateId || "",
    selectedTemplateName: builderState.guidedState.selectedTemplateName || builderState.forcedTemplateSelection?.name || "",
    catalogType: builderState.guidedState.catalogType || builderState.forcedTemplateSelection?.catalogType || "",
    websiteType: builderState.guidedState.websiteType || "",
    salesFlow: builderState.guidedState.salesFlow || "",
    designVariantOffset: Math.max(0, Number(builderState.guidedState.designVariantOffset) || 0),
  });
}

export function sanitizeClientSessionDraft(raw = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const trimmed = (value, limit = 1200) => String(value || "").trim().slice(0, limit);
  const cleanList = (value, limit = 20) => arrayValue(value).map((item) => String(item || "").trim()).filter(Boolean).slice(0, limit);
  const contactInfo = source.contactInfo && typeof source.contactInfo === "object" ? source.contactInfo : {};
  const fieldMeta = source.fieldMeta && typeof source.fieldMeta === "object" ? source.fieldMeta : {};
  return {
    generatedSiteId: trimmed(source.generatedSiteId || source.siteId || source.projectId, 180),
    projectId: trimmed(source.projectId || source.generatedSiteId || source.siteId, 180),
    websiteIntent: trimmed(source.websiteIntent),
    businessName: trimmed(source.businessName, 180),
    businessDescription: trimmed(source.businessDescription, 1600),
    industry: trimmed(source.industry, 220),
    location: trimmed(source.location, 220),
    servicesProducts: cleanList(source.servicesProducts),
    targetAudience: trimmed(source.targetAudience, 500),
    preferredTone: trimmed(source.preferredTone, 240),
    preferredColors: cleanList(source.preferredColors, 10),
    contactInfo: {
      name: trimmed(contactInfo.name, 180),
      email: trimmed(contactInfo.email, 220),
      phone: trimmed(contactInfo.phone, 80),
      whatsapp: trimmed(contactInfo.whatsapp, 80),
      instagram: trimmed(contactInfo.instagram, 140),
      website: trimmed(contactInfo.website, 220),
      notes: trimmed(contactInfo.notes, 800),
    },
    desiredDomain: trimmed(source.desiredDomain, 240),
    logoUrl: isCloudSafeUrl(source.logoUrl) ? trimmed(source.logoUrl, 1200) : "",
    photoUrls: cleanList(source.photoUrls).filter(isCloudSafeUrl),
    videoUrls: cleanList(source.videoUrls).filter(isCloudSafeUrl),
    logoPalette: cleanList(source.logoPalette, 12),
    fieldMeta,
    selectedLanguage: SUPPORTED_LANGUAGES.includes(source.selectedLanguage) ? source.selectedLanguage : builderState.selectedLanguage,
    hasLogo: Boolean(source.hasLogo || source.logoUrl),
    hasPhotos: Boolean(source.hasPhotos || cleanList(source.photoUrls).length || cleanList(source.videoUrls).length),
    salesMode: trimmed(source.salesMode, 160),
    hasLogoPhotos: trimmed(source.hasLogoPhotos, 180),
    logoPreference: trimmed(source.logoPreference, 180),
    sectionsPreference: trimmed(source.sectionsPreference, 600),
    selectedTemplateId: trimmed(source.selectedTemplateId, 180),
    selectedTemplateName: trimmed(source.selectedTemplateName, 180),
    catalogType: trimmed(source.catalogType, 180),
    websiteType: trimmed(source.websiteType, 180),
    salesFlow: trimmed(source.salesFlow, 180),
    designVariantOffset: Math.max(0, Number(source.designVariantOffset) || 0),
  };
}

export function hasStudioAccountSession() {
  if (isPublicClientSetup && !isClientWorkspaceUnlocked()) return false;
  return Boolean(
    localStorage.getItem("lumaClientAccessToken") ||
    sessionStorage.getItem("lumaClientAccessToken") ||
    builderState.clientIntakeSession?.clientEmail ||
    localStorage.getItem("vm_portal_preview_token") ||
    sessionStorage.getItem("vm_portal_preview_token"),
  );
}

export function revealStudioAuthProviderButtons() {
  const providerActions = studioGoogleAuthButton?.closest(".studio-auth-actions");
  if (providerActions) providerActions.hidden = false;
  if (studioGoogleAuthButton) studioGoogleAuthButton.hidden = false;
  if (studioAppleAuthButton) studioAppleAuthButton.hidden = isPublicClientSetup;
}

export function openStudioAuthGate(action = "continue") {
  if (!studioAuthGate) return;
  resetStudioAuthLoading();
  persistPendingStudioAccountAction(action);
  studioAuthGate.dataset.action = action;
  if (studioAuthCloseButton) studioAuthCloseButton.hidden = action === "start";
  studioAuthGate.hidden = false;
  document.body.classList.add("studio-auth-open");
  if (isPublicClientSetup && action === "start") {
    document.body.classList.add("client-auth-required");
  }
  if (isPublicClientSetup) {
    if (studioEmailAuthForm) studioEmailAuthForm.hidden = false;
    if (studioEmailAuthButton) studioEmailAuthButton.hidden = true;
    // See the 2026-07-19 fix note above other call sites: Google must stay
    // visible for public clients now that it's actually wired up. Apple
    // stays hidden until it's enabled in Supabase.
    revealStudioAuthProviderButtons();
    if (studioAppleAuthButton) studioAppleAuthButton.hidden = true;
    if (studioAuthDemoButton) studioAuthDemoButton.hidden = true;
  }
  setAssistantState("success");
}

export function closeStudioAuthGate() {
  if (!studioAuthGate) return;
  resetStudioAuthLoading();
  studioAuthGate.hidden = true;
  document.body.classList.remove("studio-auth-open");
  document.body.classList.remove("client-auth-required");
}

export async function continueWithDemoSession() {
  const pendingAction = localStorage.getItem("lumaPendingAuthAction") || "";
  sessionStorage.setItem("vm_portal_preview_token", `demo-${Date.now()}`);
  closeStudioAuthGate();
  if (pendingAction === "generate") {
    localStorage.removeItem("lumaPendingAuthAction");
    guidedStatusText.textContent = langText({
      en: "Demo session active. Generating your editable draft...",
      es: "Sesion demo activa. Generando tu borrador editable...",
      fr: "Session demo active. Génération du brouillon modifiable...",
      pt: "Sessao demo ativa. Gerando seu rascunho editavel...",
    });
    await reviewAndGenerateFromGuided();
  }
}

export function continueWithStudioAuth(provider) {
  persistPendingStudioAccountAction(provider);
  const returnTo = encodeURIComponent(window.location.href);
  const supabaseProvider = provider === "apple" ? "apple" : "google";
  window.location.href = `${SUPABASE_AUTH_URL}?provider=${supabaseProvider}&redirect_to=${returnTo}`;
}

export async function continueWithEmailAuth(event) {
  event.preventDefault();
  const email = studioAuthEmail?.value.trim();
  if (!isValidWorkspaceEmail(email)) {
    const message = langText({
      en: "Enter a complete email, for example test@gmail.com.",
      es: "Escribe un correo completo, por ejemplo test@gmail.com.",
      fr: "Entrez un email complet, par exemple test@gmail.com.",
      pt: "Digite um email completo, por exemplo test@gmail.com.",
    });
    if (studioAuthEmail) {
      studioAuthEmail.setCustomValidity(message);
      studioAuthEmail.reportValidity();
      studioAuthEmail.addEventListener("input", () => studioAuthEmail.setCustomValidity(""), { once: true });
    }
    if (storageStatus) storageStatus.textContent = message;
    if (guidedStatusText) guidedStatusText.textContent = message;
    return;
  }
  persistPendingStudioAccountAction("email");
  const submitButton = studioEmailAuthForm?.querySelector("button[type='submit']");
  const previousText = submitButton?.textContent || "";
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = langText({ en: "Opening...", es: "Abriendo...", fr: "Ouverture...", pt: "Abrindo..." });
  }
  try {
    const session = await createOrResumeClientIntakeSession({
      email,
      name: builderState.guidedState.contactInfo?.name || builderState.guidedState.businessName || "",
      reason: "start",
    });
    if (storageStatus) {
      storageStatus.textContent = session.restored
        ? langText({
            en: "Workspace restored. Your answers will keep saving.",
            es: "Espacio recuperado. Tus respuestas seguirán guardándose.",
            fr: "Espace restauré. Vos réponses continueront à être sauvegardées.",
            pt: "Espaço recuperado. Suas respostas continuarão salvas.",
          })
        : langText({
            en: "Workspace created. LYRA will save every answer.",
            es: "Espacio creado. LYRA guardará cada respuesta.",
            fr: "Espace créé. LYRA sauvegardera chaque réponse.",
            pt: "Espaço criado. LYRA salvará cada resposta.",
          });
    }
    markClientWorkspaceUnlocked();
    closeStudioAuthGate();
    const pendingAction = localStorage.getItem("lumaPendingAuthAction") || "";
    if (pendingAction === "generate") {
      localStorage.removeItem("lumaPendingAuthAction");
      await handleGuidedGenerateButton(new Event("submit"));
    }
  } catch (error) {
    if (storageStatus) {
      storageStatus.textContent = `${langText({
        en: "Could not open your workspace",
        es: "No se pudo abrir tu espacio",
        fr: "Impossible d'ouvrir votre espace",
        pt: "Não foi possível abrir seu espaço",
      })}: ${shortError(error.message)}`;
    }
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = previousText || t("saveEmailContinue");
    }
  }
}
