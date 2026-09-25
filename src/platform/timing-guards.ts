import type { VoidReason } from "@/engine/types";
import { isPageHidden, onPageHidden } from "./visibility";

/**
 * Watches for anything that compromises a timed exposure (PRD §13.4) and
 * reports it once: the page being hidden, or the board resizing / rotating.
 * Arm at countdown start, disarm when the pattern is hidden.
 */
export function watchTimingGuards(
  board: HTMLElement,
  onVoid: (reason: VoidReason) => void,
): () => void {
  let fired = false;
  const fire = (reason: VoidReason) => {
    if (fired) return;
    fired = true;
    onVoid(reason);
  };

  if (isPageHidden()) {
    fire("hidden");
    return () => {};
  }

  const offHidden = onPageHidden(() => fire("hidden"));

  // ResizeObserver delivers an initial observation on observe(); only a
  // change from that first size counts as a resize.
  let initial: { w: number; h: number } | null = null;
  const ro = new ResizeObserver((entries) => {
    const box = entries[entries.length - 1]?.contentRect;
    if (!box) return;
    if (initial === null) {
      initial = { w: box.width, h: box.height };
      return;
    }
    if (Math.abs(box.width - initial.w) > 0.5 || Math.abs(box.height - initial.h) > 0.5) {
      fire("resize");
    }
  });
  ro.observe(board);
  // Orientation can change without the board size changing (square boards).
  const onOrientation = () => fire("resize");
  screen.orientation?.addEventListener?.("change", onOrientation);

  return () => {
    offHidden();
    ro.disconnect();
    screen.orientation?.removeEventListener?.("change", onOrientation);
  };
}
