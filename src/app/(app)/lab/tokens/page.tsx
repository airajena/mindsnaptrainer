import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TEST_HOOKS } from "@/lib/flags";

export const metadata: Metadata = { title: "Tokens", robots: { index: false } };

const COLORS = [
  "bg",
  "bg-subtle",
  "surface",
  "surface-2",
  "border",
  "border-strong",
  "text",
  "text-muted",
  "text-faint",
  "accent",
  "accent-hover",
  "accent-ink",
  "cell",
  "cell-edge",
  "cell-lit",
  "hit",
  "miss",
  "false",
  "danger",
] as const;

const TYPE = [
  ["display", "text-display"],
  ["h1", "text-h1"],
  ["h2", "text-h2"],
  ["body", "text-body"],
  ["small", "text-small"],
] as const;

/** Dev-only style page: every token rendered, so drift is visible at a glance. */
export default function TokensPage() {
  if (!TEST_HOOKS) notFound();

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-12 px-gutter py-12">
      <h1 className="text-h1">Design tokens</h1>

      <section className="flex flex-col gap-4">
        <h2 className="label-caps text-label text-text-muted">Colour</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {COLORS.map((name) => (
            <li key={name} className="flex items-center gap-3">
              <span
                className="size-10 rounded-button border border-border"
                style={{ background: `var(--${name})` }}
              />
              <code className="font-mono text-small text-text-muted">--{name}</code>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="label-caps text-label text-text-muted">Type</h2>
        {TYPE.map(([name, cls]) => (
          <p key={name} className={cls}>
            {name} — See it. Hold it. Rebuild it.
          </p>
        ))}
        <p className="font-mono text-score tabular">16 / 18</p>
        <p className="label-caps text-label text-text-muted">Round 3 / 10</p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="label-caps text-label text-text-muted">Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="h-12 rounded-button bg-accent px-6 font-medium text-accent-ink hover:bg-accent-hover"
          >
            Primary
          </button>
          <button
            type="button"
            className="h-12 rounded-button border border-border bg-surface-2 px-6 font-medium hover:border-border-strong"
          >
            Secondary
          </button>
        </div>
      </section>
    </main>
  );
}
