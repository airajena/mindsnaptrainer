import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy & about",
  description:
    "What MindSnap Trainer stores (only on your device), where, and how to delete it. An independent practice tool.",
  alternates: { canonical: "/privacy" },
};

/** Privacy & About (PRD §11.10): plain language. */
export default function PrivacyPage() {
  return (
    <article className="flex max-w-[64ch] flex-col gap-10 py-12">
      <header className="flex flex-col gap-3">
        <p className="label-caps text-label text-text-muted">Privacy &amp; about</p>
        <h1 className="text-h1">Your data stays on your device.</h1>
        <p className="text-text-muted">
          No account, no cookies, no analytics, no ads. The app makes no requests to anyone else
          while you use it.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-h2">What's stored</h2>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-text-muted">
          <li>
            <span className="text-text">Settings and your saved presets</span> — in this browser's
            local storage.
          </li>
          <li>
            <span className="text-text">Completed sessions</span> — in this browser's IndexedDB: the
            config, each round's pattern and your selection, the order and timing of your taps, and
            the measured exposure time. That's what powers your progress charts.
          </li>
          <li>Unfinished sessions aren't stored. Reloading mid-session discards it.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h2">Where it goes</h2>
        <p className="text-text-muted">
          Nowhere. It never leaves this device. There's no server, no sync and no backup — so
          clearing your browser data, or using a different browser or device, starts fresh. Fonts
          and every other asset are served from this site; there are no third-party requests.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h2">How to delete it</h2>
        <p className="text-text-muted">
          Open{" "}
          <Link href="/train" className="text-text underline underline-offset-4">
            Train
          </Link>
          , tap the settings icon, then <span className="text-text">Delete all data</span>. That
          wipes history, presets and settings from this device. Clearing site data in your browser
          does the same.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h2">About</h2>
        <p className="text-text-muted">
          MindSnap Trainer is an independent tool for practising rapid visual memory: a grid flashes
          a pattern for a precise time, then you rebuild it. It isn't affiliated with, endorsed by
          or connected to Matiks or any other game. Presets are named by their parameters, like
          “Competition · 8×8 · 18 · 1.0 s”.
        </p>
        <p className="text-text-muted">
          Timing is frame-accurate: the pattern is shown and hidden on exact display frames, and
          every exposure is measured. Browsers can measure frames, not photons, so the reported time
          is the time your screen was told to show the pattern.
        </p>
      </section>
    </article>
  );
}
