/**
 * Haptic feedback via the Vibration API. Android only in practice; iOS has no
 * Vibration API, so these are silent no-ops there (PRD §23 #7).
 */
function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Some browsers throw when vibration is blocked by permissions policy.
  }
}

export const haptics = {
  /** Light tick on select. */
  tick: () => vibrate(8),
  /** Selection limit reached. */
  reject: () => vibrate([10, 40, 10]),
};
