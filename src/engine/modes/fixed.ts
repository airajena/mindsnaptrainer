import type { RoundConfig, SessionConfig } from "../types";
import type { Mode } from "./index";

/** Custom config and presets: the same parameters every round. */
export const fixedMode: Mode<null> = {
  id: "fixed",
  init: () => null,
  plan: (_state, config: SessionConfig): RoundConfig => ({
    boardSize: config.boardSize,
    cellCount: config.cellCount,
    exposureMs: config.exposureMs,
    patternStyle: config.patternStyle,
    selectionLimit: config.selectionLimit,
    autoSubmit: config.autoSubmit,
    recallLimitMs: config.recallLimitMs,
  }),
  update: (state) => state,
  isDone: (_state, counted, config) => counted >= config.rounds,
  summarize: () => ({ kind: "fixed" }),
};
