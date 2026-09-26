"use client";

import { type ReactNode, useEffect, useRef } from "react";

/**
 * Pauses decorative CSS loops inside while off-screen (IntersectionObserver
 * toggles `data-paused`; CSS sets animation-play-state). No scroll listeners.
 */
export function PauseOffscreen({
  children,
  className,
  id,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  "aria-label"?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => {
      el.dataset.paused = entry?.isIntersecting ? "false" : "true";
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} id={id} className={className} aria-label={ariaLabel} data-paused="true">
      {children}
    </section>
  );
}
