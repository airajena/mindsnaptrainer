"use client";

import { XIcon } from "lucide-react";
import { useEffect } from "react";
import { useStore } from "zustand";
import { dismissNotice, noticeStore } from "@/stores/notice-store";
import { hydrateSettings, settingsStore } from "@/stores/settings-store";

/**
 * Client-side app effects: load settings after mount (never during SSR, so
 * no hydration mismatch), apply the reduced-motion override, show notices.
 */
export function AppEffects() {
  const reducedMotion = useStore(settingsStore, (s) => s.reducedMotion);
  const notices = useStore(noticeStore, (s) => s.notices);

  useEffect(() => {
    hydrateSettings();
  }, []);

  useEffect(() => {
    if (reducedMotion === "reduce") document.documentElement.dataset.motion = "reduce";
    else delete document.documentElement.dataset.motion;
  }, [reducedMotion]);

  if (notices.length === 0) return null;
  return (
    <ul
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 px-gutter pt-[calc(env(safe-area-inset-top)+0.75rem)]"
      aria-live="polite"
    >
      {notices.map((n) => (
        <li
          key={n.id}
          className="pointer-events-auto flex max-w-md items-center gap-3 rounded-card border border-border-strong bg-surface-2 py-2 pr-1 pl-4 text-small"
        >
          <span>{n.text}</span>
          <button
            type="button"
            onClick={() => dismissNotice(n.id)}
            className="grid size-10 shrink-0 place-items-center rounded-button text-text-muted hover:text-text"
          >
            <XIcon className="size-4" aria-hidden />
            <span className="sr-only">Dismiss</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
