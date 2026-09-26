import Link from "next/link";
import { buttonClass } from "@/components/button";
import { HERO } from "./content";
import { DemoSlot } from "./demo-slot";
import { TryLink } from "./try-link";

/** Hero: headline is the LCP element (text, not an image). The demo is a client island. */
export function Hero() {
  return (
    <section
      id="hero"
      className="grid items-center gap-10 pt-6 pb-10 md:pt-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-16 lg:pt-12"
    >
      <div className="flex flex-col gap-6">
        <p className="label-caps text-label text-text-muted">{HERO.eyebrow}</p>
        <h1 className="text-display">{HERO.headline}</h1>
        <p className="prose-width text-body text-text-muted md:text-[1.125rem]">{HERO.sub}</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/train" className={buttonClass("primary", "lg", "cta-glow")}>
            {HERO.primary}
          </Link>
          <TryLink>{HERO.secondary}</TryLink>
        </div>
        <ul
          className="flex flex-wrap gap-x-5 gap-y-2 text-small text-text-muted"
          aria-label="Highlights"
        >
          {HERO.proof.map((p) => (
            <li key={p} className="flex items-center gap-2">
              <span aria-hidden className="size-1.5 rounded-full bg-text-faint" />
              {p}
            </li>
          ))}
        </ul>
      </div>
      <div className="justify-self-center lg:justify-self-end">
        <DemoSlot />
      </div>
    </section>
  );
}
