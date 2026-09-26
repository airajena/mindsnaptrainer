import { ArrowRightIcon, ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import { buttonClass } from "@/components/button";
import { ScoreHeadline, Stat } from "@/components/stat";
import { score } from "@/engine/scoring";
import { ResultBoard } from "@/features/board/result-board";
import { OverlayLegend } from "@/features/session/legend";
import { cn } from "@/lib/cn";
import { formatPercent } from "@/lib/format";
import { FAQ, MODES, PRIVACY, SAMPLE_ROUND, STEPS } from "./content";
import { PauseOffscreen } from "./pause-offscreen";

const STEP_PATTERN = [1, 6, 8, 11, 14];

function SectionHeading({ eyebrow, title, id }: { eyebrow: string; title: string; id: string }) {
  return (
    <header className="flex flex-col gap-3">
      <p className="label-caps text-label text-text-muted">{eyebrow}</p>
      <h2 id={id} className="text-h1 prose-width">
        {title}
      </h2>
    </header>
  );
}

export function HowItWorks() {
  return (
    <PauseOffscreen className="landing-section flex flex-col gap-10" aria-label="How it works">
      <SectionHeading
        eyebrow="How it works"
        title="Three seconds of focus, one precise measurement."
        id="how-h"
      />
      <ol className="grid gap-6 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <li
            key={s.title}
            className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5"
          >
            <div style={{ "--board-size": "7.5rem" } as React.CSSProperties}>
              <ResultBoard
                n={4}
                pattern={i === 1 ? [] : STEP_PATTERN}
                selection={[]}
                view="actual"
                label={`${s.title}: illustration`}
                className={cn("step-board", i === 0 && "step-see", i === 2 && "step-rebuild")}
                indexVar
              />
            </div>
            <h3 className="text-h2">
              <span className="mr-2 font-mono text-text-faint tabular">{i + 1}</span>
              {s.title}
            </h3>
            <p className="text-text-muted">{s.body}</p>
          </li>
        ))}
      </ol>
    </PauseOffscreen>
  );
}

export function Modes() {
  return (
    <section className="landing-section flex flex-col gap-10" aria-labelledby="modes-h">
      <SectionHeading
        eyebrow="Training modes"
        title="Practise the exact format. Measure the real limit."
        id="modes-h"
      />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODES.map((mode) => {
          const inner = (
            <>
              <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <span className="text-h2">{mode.title}</span>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-1 font-mono text-label whitespace-nowrap tabular",
                    mode.soon
                      ? "border-border text-text-faint"
                      : "border-border-strong text-text-muted",
                  )}
                >
                  {mode.tag}
                </span>
              </span>
              <span className="text-text-muted">{mode.body}</span>
              {!mode.soon && (
                <span className="mt-auto flex items-center gap-2 text-small font-medium text-text">
                  Start <ArrowRightIcon className="size-4" aria-hidden />
                </span>
              )}
            </>
          );
          const cls =
            "flex h-full flex-col gap-3 rounded-card border border-border bg-surface p-5 transition-colors duration-[var(--dur-fast)]";
          return (
            <li key={mode.title}>
              {mode.href ? (
                <Link href={mode.href} className={cn(cls, "hover:border-border-strong")}>
                  {inner}
                </Link>
              ) : (
                <div className={cn(cls, "border-dashed")}>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function HonestNumbers() {
  const s = score(SAMPLE_ROUND.pattern, SAMPLE_ROUND.selection);
  return (
    <section
      className="landing-section grid items-center gap-10 lg:grid-cols-2"
      aria-labelledby="numbers-h"
    >
      <div className="flex flex-col gap-6">
        <SectionHeading
          eyebrow="Honest numbers"
          title="See exactly what you got wrong."
          id="numbers-h"
        />
        <p className="prose-width text-text-muted">
          Hits over target is the number you feel. Accuracy counts false taps too, so tapping
          everything never pays. The overlay shows every hit, every miss and every wrong tap — by
          shape, not just colour.
        </p>
        <OverlayLegend />
      </div>
      <figure className="flex flex-col gap-5 rounded-card border border-border bg-surface p-5 sm:p-6">
        <figcaption className="label-caps text-label text-text-muted">
          Sample round · 8×8 · 18 · 1.0 s
        </figcaption>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <ScoreHeadline hits={s.hits} target={SAMPLE_ROUND.pattern.length} />
            <p className="mt-1 text-text-muted">
              <span className="font-mono text-text tabular">{formatPercent(s.accuracy)}</span>{" "}
              accuracy
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-5">
            <Stat label="Hits" value={s.hits} tone="hit" />
            <Stat label="Misses" value={s.misses} tone="miss" />
            <Stat label="False" value={s.falseTaps} tone="false" />
          </dl>
        </div>
        <div
          style={
            {
              "--board-size": "min(22rem, calc(100vw - 2 * var(--gutter) - 3.5rem))",
            } as React.CSSProperties
          }
        >
          <ResultBoard
            n={SAMPLE_ROUND.n}
            pattern={SAMPLE_ROUND.pattern}
            selection={SAMPLE_ROUND.selection}
            view="overlay"
            label={`Sample overlay: ${s.hits} hits, ${s.misses} misses, ${s.falseTaps} false tap`}
          />
        </div>
      </figure>
    </section>
  );
}

export function Thumb() {
  return (
    <section
      className="landing-section grid items-center gap-10 lg:grid-cols-2"
      aria-labelledby="thumb-h"
    >
      <div
        className="order-2 lg:order-1"
        style={
          { "--board-size": "min(20rem, calc(100vw - 2 * var(--gutter)))" } as React.CSSProperties
        }
      >
        <ResultBoard
          n={6}
          pattern={[]}
          selection={[12, 13, 14, 15, 16, 20, 26]}
          view="yours"
          label="A swipe painting a row of cells"
          indexVar
        />
      </div>
      <div className="order-1 flex flex-col gap-6 lg:order-2">
        <SectionHeading
          eyebrow="Built for your thumb"
          title="Responds on touch-down. Swipe to paint."
          id="thumb-h"
        />
        <ul className="flex flex-col gap-3 text-text-muted">
          <li>Cells toggle the instant your finger lands — not when you lift it.</li>
          <li>
            Drag across the board to select a run of cells; the first cell decides add or remove.
          </li>
          <li>
            No accidental zoom, scroll or text selection while you play. No dead zones between
            cells.
          </li>
          <li>Full keyboard play too: arrows, Space, Enter.</li>
        </ul>
      </div>
    </section>
  );
}

export function PrivacyBand() {
  return (
    <section className="landing-section" aria-labelledby="privacy-h">
      <div className="flex flex-col items-start gap-5 rounded-card border border-border bg-bg-subtle p-6 sm:p-10">
        <ShieldCheckIcon className="size-8 text-text" aria-hidden />
        <h2 id="privacy-h" className="text-h1 prose-width">
          {PRIVACY.headline}
        </h2>
        <p className="prose-width text-text-muted">{PRIVACY.body}</p>
        <Link
          href="/privacy"
          className="inline-flex min-h-11 items-center gap-2 font-medium underline-offset-4 hover:underline"
        >
          What's stored and where <ArrowRightIcon className="size-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}

export function Faq() {
  return (
    <section className="landing-section flex flex-col gap-8" aria-labelledby="faq-h">
      <SectionHeading eyebrow="FAQ" title="Questions" id="faq-h" />
      <div className="flex flex-col divide-y divide-border border-y border-border">
        {FAQ.map((f) => (
          <details key={f.q} className="group">
            <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-4 py-3 font-medium">
              {f.q}
              <span
                aria-hidden
                className="font-mono text-text-faint group-open:rotate-45 transition-transform duration-[var(--dur-fast)]"
              >
                +
              </span>
            </summary>
            <p className="prose-width pb-5 text-text-muted">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section
      className="landing-section flex flex-col items-center gap-6 text-center"
      aria-labelledby="cta-h"
    >
      <h2 id="cta-h" className="text-h1 prose-width">
        See it. Hold it. Rebuild it.
      </h2>
      <p className="text-text-muted">Five minutes, no sign-up. Start with the warm-up.</p>
      <Link href="/train" className={buttonClass("primary", "lg", "cta-glow")}>
        Start training
      </Link>
    </section>
  );
}
