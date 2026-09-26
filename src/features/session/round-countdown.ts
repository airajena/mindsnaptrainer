import type { RoundPlan, SessionConfig } from "@/engine/types";
import type { CountdownStyle } from "@/platform/countdown";

/**
 * Which countdown a round gets.
 *
 * With automatic round start, rounds flow back to back: only the first round
 * of the session (right after pressing Start) plays the configured countdown;
 * every later round gets just the ~0.3 s fixation dot ("off"). The dot stays:
 * it gives the eyes a target, and the frame period is measured during it.
 * A replay after a void is started by a tap, so it gets the full countdown
 * again to re-orient. "Tap to start" always uses the configured countdown.
 */
export function roundCountdown(
  setting: CountdownStyle,
  roundStart: SessionConfig["roundStart"],
  plan: Pick<RoundPlan, "index" | "attempt">,
): CountdownStyle {
  if (roundStart === "auto" && plan.index > 0 && plan.attempt === 0) return "off";
  return setting;
}
