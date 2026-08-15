export const MIN_GUIDED_BUILD_PHASE_VISIBLE_MS = 450;

export function remainingBuildPhaseVisibilityMs(startedAt, now, minimumMs = MIN_GUIDED_BUILD_PHASE_VISIBLE_MS) {
  const elapsed = Math.max(0, Number(now) - Number(startedAt));
  return Math.max(0, Number(minimumMs) - elapsed);
}
