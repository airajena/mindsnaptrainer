import { ResultBoard } from "@/features/board/result-board";

/** Idle demo pattern (5×5, 6 cells) that shimmers until the visitor taps. */
export const IDLE_PATTERN = [1, 7, 8, 13, 19, 21] as const;

/**
 * The demo's idle state. Rendered by the server as the static placeholder
 * AND by the hydrated demo, with identical markup — so swapping one for the
 * other can't shift layout.
 */
export function DemoIdle({ onPlay }: { onPlay?: () => void }) {
  return (
    <div className="demo-stage">
      <div className="demo-board-wrap">
        <ResultBoard
          n={5}
          pattern={IDLE_PATTERN}
          selection={[]}
          view="actual"
          label="Demo board, 5 by 5"
          className="demo-idle"
          indexVar
        />
        <button type="button" id="demo-play" onClick={onPlay} className="demo-play">
          <span className="demo-play-label">Tap to play</span>
        </button>
      </div>
      <p className="demo-caption">
        5×5 · 6 squares · 1.5 s. Tap the board, watch, then rebuild it.
      </p>
    </div>
  );
}
