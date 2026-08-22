const CLIENT_PROJECT_RUNTIME_DEFAULTS = Object.freeze({
  currentSchema: null,
  currentRequestId: null,
  currentSiteId: null,
  currentBusinessId: null,
  currentGenerationId: null,
  currentCatalogItems: [],
  selectedPageKey: "home",
  selectedVariantId: "",
  selectedStudioSectionId: "",
  forcedTemplateSelection: null,
  clientIntakeSession: null,
  restoredGuidedDraftInfo: null,
  restoredDraftNoticeShown: false,
  restoredDraftNoticeCard: null,
  guidedStep: "websiteIntent",
  lastAskedGuidedField: "",
  hasBackendIntakeSignal: false,
  backendReadyToGenerate: false,
  backendMissingFields: [],
  clientIntakeLastSyncedSnapshot: "",
});

export function clearClientProjectRuntimeState(state, emptyGuidedState) {
  Object.entries(CLIENT_PROJECT_RUNTIME_DEFAULTS).forEach(([key, value]) => {
    state[key] = Array.isArray(value) ? [...value] : value;
  });
  state.guidedState = emptyGuidedState;
  return state;
}

export function advanceClientProjectSessionEpoch(state) {
  state.clientIntakeSessionEpoch = Number(state.clientIntakeSessionEpoch || 0) + 1;
  return state.clientIntakeSessionEpoch;
}

export function isCurrentClientProjectSessionEpoch(requestEpoch, currentEpoch) {
  return Number(requestEpoch || 0) === Number(currentEpoch || 0);
}
