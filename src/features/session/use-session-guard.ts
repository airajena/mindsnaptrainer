"use client";

import { useEffect, useRef } from "react";
import type { PhaseKind } from "@/engine/types";
import { holdWakeLock } from "@/platform/wake-lock";

const IN_SESSION: ReadonlySet<PhaseKind> = new Set([
  "ready",
  "countdown",
  "memorize",
  "recall",
  "result",
  "void",
]);

/**
 * Guards a running session (PRD §14, TECH_PLAN §11):
 * - browser Back opens "End session?" instead of navigating away (a history
 *   entry is pushed on session start and re-pushed on popstate);
 * - Esc opens the same dialog;
 * - a Screen Wake Lock is held so the phone doesn't dim mid-round.
 */
export function useSessionGuard(kind: PhaseKind, requestEnd: () => void): void {
  const inSession = IN_SESSION.has(kind);
  const requestEndRef = useRef(requestEnd);
  requestEndRef.current = requestEnd;

  useEffect(() => {
    if (!inSession) return;

    const releaseWakeLock = holdWakeLock();
    history.pushState({ mindsnapSession: true }, "");

    const onPopState = () => {
      // Stay on the page: restore our entry and ask.
      history.pushState({ mindsnapSession: true }, "");
      requestEndRef.current();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) {
        e.preventDefault();
        requestEndRef.current();
      }
    };

    window.addEventListener("popstate", onPopState);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      releaseWakeLock();
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [inSession]);
}
