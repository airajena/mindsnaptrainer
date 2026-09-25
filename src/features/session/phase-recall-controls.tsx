"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/button";
import { isOnControl, isTyping } from "@/lib/keyboard";
import { useSession, useSessionState } from "./session-context";

/**
 * Clear / Submit in the thumb zone, plus keyboard shortcuts:
 * C clears; Enter submits when focus is outside the board (Enter on the
 * board toggles — the board stops that event).
 */
export function RecallControls() {
  const session = useSession();
  const count = useSessionState((s) => (s.phase.kind === "recall" ? s.phase.selection.length : 0));
  const limitMs = useSessionState((s) =>
    s.phase.kind === "recall" ? s.phase.plan.config.recallLimitMs : null,
  );
  const startedAt = useSessionState((s) => (s.phase.kind === "recall" ? s.phase.startedAt : 0));

  const submit = useCallback(
    () => session.dispatch({ type: "SUBMIT", t: performance.now() }),
    [session],
  );
  const clear = useCallback(
    () => session.dispatch({ type: "CLEAR", t: performance.now() }),
    [session],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        clear();
      } else if (e.key === "Enter" && !isOnControl(e)) {
        e.preventDefault();
        submit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clear, submit]);

  return (
    <>
      {limitMs !== null && <RecallTimer limitMs={limitMs} startedAt={startedAt} />}
      <div className="grid grid-cols-[1fr_2fr] gap-3">
        <Button variant="secondary" size="lg" onClick={clear} disabled={count === 0}>
          Clear
        </Button>
        <Button size="lg" onClick={submit} disabled={count === 0}>
          Submit
        </Button>
      </div>
    </>
  );
}

/**
 * Recall time limit: static text, updated once per second (no moving bar —
 * PRD §11.5). The auto-submit fires at the exact deadline.
 */
function RecallTimer({ limitMs, startedAt }: { limitMs: number; startedAt: number }) {
  const session = useSession();
  const [left, setLeft] = useState(() => Math.ceil(limitMs / 1000));

  useEffect(() => {
    const deadline = startedAt + limitMs;
    const timeout = setTimeout(
      () => session.dispatch({ type: "RECALL_TIMEOUT", t: performance.now() }),
      Math.max(0, deadline - performance.now()),
    );
    const interval = setInterval(() => {
      setLeft(Math.max(0, Math.ceil((deadline - performance.now()) / 1000)));
    }, 1000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [limitMs, startedAt, session]);

  return (
    <p className="text-center font-mono text-small text-text-muted tabular" aria-live="off">
      {left} s left
    </p>
  );
}
