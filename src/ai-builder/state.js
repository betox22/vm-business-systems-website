import { SUPPORTED_LANGUAGES } from './config.js';

export function normalizeBrowserLanguage(input) {
  const normalized = String(input || 'en').trim().toLowerCase();
  const base = normalized.split('-')[0];
  return SUPPORTED_LANGUAGES.includes(base) ? base : 'en';
}

export function detectBrowserLanguage() {
  const languages = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
  return normalizeBrowserLanguage(languages.find(Boolean) || 'en');
}

export function createEmptyGuidedState(language = detectBrowserLanguage()) {
  return {
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
    videoUrls: [],
    logoPalette: [],
    brand: null,
    selectedLanguage: language,
    hasLogo: false,
    hasPhotos: false,
    salesMode: "",
    salesFlow: "",
    hasLogoPhotos: "",
    aiGeneratedLogoRequested: false,
    logoPreference: "",
    sectionsPreference: "",
    desiredDomain: "",
    revisionMode: "",
    requestedAdjustments: [],
    sitePlan: null,
    sitePlanApproved: false,
    fieldMeta: {},
    generatedSiteId: "",
    projectId: "",
    aiStudioPlan: null,
    designStrategy: null,
  };
}

const initialSelectedLanguage = detectBrowserLanguage();

export const builderState = {
  selectedLanguage: initialSelectedLanguage,
  currentSchema: null,
  selectedPageKey: 'home',
  selectedVariantId: '',
  selectedStudioSectionId: '',
  advancedInspectorOpen: false,
  currentSiteId: null,
  currentBusinessId: null,
  currentGenerationId: null,
  currentRequestId: null,
  currentCatalogItems: [],
  isGeneratingWebsite: false,
  guidedStep: 'websiteIntent',
  guidedHistory: [],
  assistantState: 'neutral',
  assistantVoiceEnabled: localStorage.getItem('gnuDevAssistantVoice') === 'on',
  forcedTemplateSelection: null,
  restoredGuidedDraftInfo: null,
  restoredDraftNoticeCard: null,
  restoredDraftNoticeShown: false,
  guidedBuildStatusCard: null,
  guidedCoachCard: null,
  liveSitePreviewCard: null,
  templateBoardLoading: false,
  templateBoardLoadingSignature: '',
  templateBoardLoadingTimer: null,
  guidedSendLocked: false,
  guidedLastSendAt: 0,
  clientIntakeSession: null,
  clientIntakeSyncTimer: null,
  clientIntakeSyncInFlight: false,
  clientAccountButton: null,
  clientProjectsButton: null,
  clientProjectsPanel: null,
  clientProjects: [],
  clientWorkspaceIdleTimer: null,
  clientWorkspaceUnlocked: false,
  clientAuthResumePromise: null,
  studioAuthRedirectCaptureComplete: false,
  guidedState: createEmptyGuidedState(initialSelectedLanguage),
  pendingServerIntakeGate: null,
  lastAssistantPromptSignature: '',
  builderAvatarAssistant: null,
};

const listeners = new Set();

export function getState() {
  return builderState;
}

export function getGuidedState() {
  return builderState.guidedState;
}

export function setGuidedState(next) {
  builderState.guidedState = next || createEmptyGuidedState(builderState.selectedLanguage);
  notifyStateSubscribers();
  return builderState.guidedState;
}

export function setStateValue(key, value) {
  builderState[key] = value;
  notifyStateSubscribers();
  return value;
}

export function subscribe(listener) {
  if (typeof listener !== 'function') return () => {};
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyStateSubscribers() {
  listeners.forEach((listener) => {
    try {
      listener(builderState);
    } catch (error) {
      console.error('AI builder state subscriber failed', error);
    }
  });
}
