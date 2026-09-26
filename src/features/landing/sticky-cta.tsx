"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonClass } from "@/components/button";

/**
 * Mobile-only bottom bar with "Start training", shown once the hero has
 * scrolled out of view (IntersectionObserver — no scroll listeners). The
 * slide is a CSS transform transition (see DECISIONS D23: no Motion).
 */
export function StickyCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("hero");
    if (!hero || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setVisible(!entry?.isIntersecting));
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  return (
    <div
      className="sticky-cta fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 px-gutter pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur md:hidden"
      data-visible={visible}
      aria-hidden={!visible}
      inert={!visible}
    >
      <Link href="/train" className={buttonClass("primary", "lg", "w-full")}>
        Start training
      </Link>
    </div>
  );
}
