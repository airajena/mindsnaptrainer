"use client";

import { useEffect, useState } from "react";
import { generatePattern } from "@/engine/generator";
import type { SessionConfig } from "@/engine/types";
import { ResultBoard } from "@/features/board/result-board";
import { randomSeed } from "@/platform/seed";

/**
 * Live preview of board size and density: a random sample that re-rolls on
 * change. Seed 1 during SSR, re-rolled after mount, so hydration matches.
 */
export function PreviewBoard({ config }: { config: SessionConfig }) {
  const n = config.boardSize;
  const k = config.modeId === "capacity" ? Math.min(8, Math.floor((n * n) / 2)) : config.cellCount;
  const [seed, setSeed] = useState(1);

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-roll the sample whenever size, count or style change.
  useEffect(() => {
    setSeed(randomSeed());
  }, [n, k, config.patternStyle]);

  const pattern = generatePattern(
    { boardSize: n, cellCount: k, patternStyle: config.patternStyle },
    seed,
  );

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="flex items-center justify-between">
        <span className="label-caps text-label text-text-muted">Preview</span>
        <span className="font-mono text-small text-text-faint tabular">
          {n}×{n} · {k} cells
        </span>
      </figcaption>
      <div className="preview-slot">
        <ResultBoard
          n={n}
          pattern={pattern}
          selection={[]}
          view="actual"
          label={`Preview: a ${n} by ${n} board with ${k} lit squares`}
        />
      </div>
    </figure>
  );
}
