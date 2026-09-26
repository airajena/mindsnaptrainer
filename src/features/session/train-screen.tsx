"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { useStore } from "zustand";
import { SessionErrorBoundary } from "@/components/error-boundary";
import type { PhaseKind, SessionConfig, SessionState } from "@/engine/types";
import { SetupScreen } from "@/features/setup/setup-screen";
import { TEST_HOOKS } from "@/lib/flags";
import { formatPercent } from "@/lib/format";
import { parseSeed, randomSeed } from "@/platform/seed";
import { createSessionStore } from "@/stores/session-store";
import { hydrateSettings, setLastConfig } from "@/stores/settings-store";
import { PhaseResult } from "./phase-result";
import { SessionContext } from "./session-context";
import { SessionStage } from "./session-stage";
import { SessionSummary } from "./session-summary";
import { useSessionGuard } from "./use-session-guard";
import "./train.css";

// Dialogs (Radix) stay out of /train's first-load JS but are prefetched at
// idle during setup, so nothing is fetched mid-session (TECH_PLAN §10).
const ConfirmDialog = dynamic(
  () => import("@/components/confirm-dialog").then((m) => m.ConfirmDialog),
  { ssr: false },
);
const prefetchDialogs = () => {
  void import("@/components/confirm-dialog");
  void import("@/features/settings/settings-sheet");
  void import("@/features/setup/save-preset-dialog");
};

const TIMED: ReadonlySet<PhaseKind> = new Set(["countdown", "memorize"]);

/** /train: setup → session phases → summary, all in one route (no navigation jank). */
export function TrainScreen() {
  return (
    <SessionErrorBoundary>
      <TrainScreenInner />
    </SessionErrorBoundary>
  );
}

function TrainScreenInner() {
  const [session] = useState(() => createSessionStore());
  const kind = useStore(session.store, (s) => s.state.phase.kind);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [callouts, setCallouts] = useState<string[]>([]);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    void hydrateSettings();
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200));
    idle(prefetchDialogs);
  }, []);

  const start = useCallback(
    (config: SessionConfig) => {
      setLastConfig(config);
      // `?seed=` fixes the session seed in dev/test builds only (e2e, bug reports).
      const fixed = TEST_HOOKS
        ? parseSeed(new URLSearchParams(window.location.search).get("seed"))
        : null;
      session.dispatch({ type: "START_SESSION", config, seed: fixed ?? randomSeed() });
    },
    [session],
  );

  const requestEnd = useCallback(() => {
    // Covering the board mid-exposure would corrupt the timing: void first.
    if (TIMED.has(session.get().phase.kind)) session.dispatch({ type: "VOID", reason: "hidden" });
    setConfirmEnd(true);
  }, [session]);

  useSessionGuard(kind, requestEnd);

  // Save completed sessions once, announce phase changes for screen readers.
  useEffect(
    () =>
      session.store.subscribe(({ state }, { state: prev }) => {
        if (state.phase.kind === prev.phase.kind && state.phase.kind !== "ready") return;
        setAnnouncement(announce(state));
        if (state.phase.kind === "complete" && prev.phase.kind !== "complete") {
          setCallouts([]);
          // History (IndexedDB + schemas) loads only now — never mid-session,
          // and it stays out of /train's first-load JS.
          void import("@/stores/history-store")
            .then((m) => m.recordSession(state))
            .then(setCallouts);
        }
      }),
    [session],
  );

  let screen: React.ReactNode;
  switch (kind) {
    case "setup":
      screen = <SetupScreen onStart={start} />;
      break;
    case "complete":
      screen = (
        <SessionSummary
          callouts={callouts}
          onTrainAgain={() => {
            const config = session.get().config;
            if (config) start(config);
          }}
          onChangeSettings={() => session.dispatch({ type: "ABORT" })}
        />
      );
      break;
    case "result":
      screen = <PhaseResult onRequestEnd={requestEnd} />;
      break;
    case "ready":
    case "countdown":
    case "memorize":
    case "recall":
    case "void":
      screen = <SessionStage onRequestEnd={requestEnd} />;
      break;
    default: {
      const never: never = kind;
      screen = never;
    }
  }

  return (
    <SessionContext value={session}>
      {screen}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
      <ConfirmDialog
        open={confirmEnd}
        onOpenChange={setConfirmEnd}
        title="End session?"
        description="Rounds you've played in this session won't be saved."
        confirmLabel="End session"
        cancelLabel="Keep training"
        destructive
        onConfirm={() => session.dispatch({ type: "ABORT" })}
      />
    </SessionContext>
  );
}

function announce(state: SessionState): string {
  const p = state.phase;
  const total = state.config?.modeId === "fixed" ? ` of ${state.config.rounds}` : "";
  switch (p.kind) {
    case "ready":
      return `Round ${p.plan.index + 1}${total}. Tap the board or press Space to start.`;
    case "countdown":
      return "Get ready.";
    case "memorize":
      return "";
    case "recall":
      return `Recall. Select ${p.plan.config.cellCount} squares.`;
    case "result":
      return `${p.result.hits} of ${p.result.pattern.length}, ${formatPercent(p.result.accuracy)} accuracy.`;
    case "void":
      return "Timing interrupted. This round doesn't count.";
    case "complete":
      return `Session complete. Mean accuracy ${formatPercent(p.summary.meanAccuracy)}.`;
    case "setup":
      return "";
    default:
      return "";
  }
}
