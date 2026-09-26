"use client";

import { buttonClass } from "@/components/button";

/** "Try it right here": scrolls to the demo board and moves focus to its play button. */
export function TryLink({ children }: { children: React.ReactNode }) {
  return (
    // biome-ignore lint/a11y/useValidAnchor: a real in-page link (#demo) that works without JS; the handler only adds smooth scroll + focus.
    <a
      href="#demo"
      className={buttonClass("secondary", "lg")}
      onClick={(e) => {
        const demo = document.getElementById("demo");
        if (!demo) return;
        e.preventDefault();
        // Instant, not smooth: keeps any scroll animation from overlapping a
        // round the visitor starts right away (main-thread work during the
        // exposure can drop frames and void it).
        demo.scrollIntoView({ behavior: "auto", block: "center" });
        // If the demo is still loading, its placeholder button is about to be
        // replaced; leave a request so the real one takes focus on mount.
        demo.dataset.focusRequested = "true";
        document.getElementById("demo-play")?.focus({ preventScroll: true });
      }}
    >
      {children}
    </a>
  );
}
