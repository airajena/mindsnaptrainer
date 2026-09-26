"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "zustand";
import { AppHeader } from "@/components/app-header";
import { buttonClass } from "@/components/button";
import {
  groupBySignature,
  type SignatureGroup,
  type StoredSession,
  signatureLabel,
} from "@/engine/history";
import { formatNumber, formatPercent } from "@/lib/format";
import { historyStore, loadHistory } from "@/stores/history-store";
import { LineChart } from "./charts/line-chart";

const dateFmt = () =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Progress (PRD §11.8, P0 basic): tests, per-config trends and bests, session list. */
export function ProgressScreen() {
  const status = useStore(historyStore, (s) => s.status);
  const history = useStore(historyStore, (s) => s.history);

  useEffect(() => {
    void loadHistory();
  }, []);

  const groups = useMemo(() => groupBySignature(history.sessions), [history.sessions]);
  const tests = groups.filter((g) => g.modeId === "capacity" || g.modeId === "speed");
  const fixed = groups.filter((g) => g.modeId === "fixed");

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-gutter pb-12">
      <AppHeader current="progress" />
      <main className="flex flex-col gap-10 pt-4">
        <header className="flex flex-col gap-2">
          <h1 className="text-h1">Progress</h1>
          <p className="text-text-muted">Stored on this device only.</p>
        </header>

        {status !== "ready" ? (
          <p className="text-text-muted" aria-busy="true">
            Loading your history…
          </p>
        ) : history.sessions.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {tests.length > 0 && <TestsSection groups={tests} />}
            {fixed.length > 0 && <ConfigSection groups={fixed} />}
            <SessionList sessions={history.sessions} />
          </>
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <section className="flex flex-col items-start gap-4 rounded-card border border-border bg-surface p-6">
      <h2 className="text-h2">No sessions yet</h2>
      <p className="prose-width text-text-muted">
        Finish a session and it shows up here. A capacity test is the best first step — it gives you
        one number to beat.
      </p>
      <Link href="/train?test=capacity" className={buttonClass("primary", "lg")}>
        Take a capacity test
      </Link>
    </section>
  );
}

function TestsSection({ groups }: { groups: SignatureGroup[] }) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby="tests-h">
      <h2 id="tests-h" className="label-caps text-label text-text-muted">
        Tests
      </h2>
      <ul className="grid gap-4 md:grid-cols-2">
        {groups.map((g) => {
          const speed = g.modeId === "speed";
          const fmt = (v: number) => (speed ? `${Math.round(v)} ms` : `${formatNumber(v)}`);
          const latest = g.series[g.series.length - 1]?.value;
          return (
            <li
              key={g.signature}
              className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-medium">{speed ? "Speed test" : "Capacity test"}</h3>
                <span className="font-mono text-small text-text-muted tabular">
                  {g.label.replace(/^(capacity|speed) · /, "")}
                </span>
              </div>
              <p className="font-mono text-h1 tabular">
                {latest === undefined ? "—" : fmt(latest)}
                {!speed && latest !== undefined && (
                  <span className="ml-2 text-h2 text-text-muted">cells</span>
                )}
              </p>
              <p className="text-small text-text-muted">
                Best {g.best === null ? "—" : fmt(g.best)} · {g.sessions}{" "}
                {g.sessions === 1 ? "test" : "tests"}
              </p>
              {g.series.length > 1 && (
                <LineChart
                  values={g.series.map((p) => p.value)}
                  format={fmt}
                  label={`${speed ? "Speed" : "Capacity"} over time: ${g.series.map((p) => fmt(p.value)).join(", ")}`}
                />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ConfigSection({ groups }: { groups: SignatureGroup[] }) {
  const [selected, setSelected] = useState(groups[0]!.signature);
  const g = groups.find((x) => x.signature === selected) ?? groups[0]!;

  return (
    <section className="flex flex-col gap-4" aria-labelledby="configs-h">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="configs-h" className="label-caps text-label text-text-muted">
          Accuracy over time
        </h2>
        <label className="flex items-center gap-2 text-small text-text-muted">
          Config
          <select
            value={g.signature}
            onChange={(e) => setSelected(e.target.value)}
            className="h-11 rounded-button border border-border bg-surface-2 px-3 font-mono text-text"
          >
            {groups.map((x) => (
              <option key={x.signature} value={x.signature}>
                {x.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-6 rounded-card border border-border bg-surface p-4 md:grid-cols-[1fr_14rem]">
        <LineChart
          values={g.series.map((p) => p.value)}
          min={0}
          max={1}
          format={(v) => formatPercent(v)}
          label={`Mean accuracy per session for ${g.label}: ${g.series.map((p) => formatPercent(p.value)).join(", ")}`}
        />
        <dl className="grid grid-cols-2 content-start gap-4 md:grid-cols-1">
          <div>
            <dt className="label-caps text-label text-text-muted">Best mean accuracy</dt>
            <dd className="font-mono text-h2 tabular">
              {g.best === null ? "—" : formatPercent(g.best)}
            </dd>
          </div>
          <div>
            <dt className="label-caps text-label text-text-muted">Most perfect rounds</dt>
            <dd className="font-mono text-h2 tabular">{g.bestPerfect ?? "—"}</dd>
          </div>
          <div>
            <dt className="label-caps text-label text-text-muted">Sessions</dt>
            <dd className="font-mono text-h2 tabular">{g.sessions}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

function SessionList({ sessions }: { sessions: readonly StoredSession[] }) {
  const [limit, setLimit] = useState(20);
  const sorted = useMemo(
    () => [...sessions].sort((a, b) => b.completedAt - a.completedAt),
    [sessions],
  );
  const fmt = useMemo(dateFmt, []);

  return (
    <section className="flex flex-col gap-4" aria-labelledby="sessions-h">
      <h2 id="sessions-h" className="label-caps text-label text-text-muted">
        Sessions
      </h2>
      <ul className="flex flex-col divide-y divide-border rounded-card border border-border bg-surface">
        {sorted.slice(0, limit).map((s) => (
          <li
            key={s.id}
            className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3 sm:grid-cols-[9rem_1fr_auto]"
          >
            <span className="text-small text-text-muted">{fmt.format(s.completedAt)}</span>
            <span className="order-3 col-span-2 font-mono text-small tabular sm:order-none sm:col-span-1">
              {signatureLabel(s.signature)}
            </span>
            <span className="font-mono tabular">{headline(s)}</span>
          </li>
        ))}
      </ul>
      {sorted.length > limit && (
        <button
          type="button"
          className={buttonClass("secondary", "md", "self-start")}
          onClick={() => setLimit((l) => l + 20)}
        >
          Show more
        </button>
      )}
    </section>
  );
}

function headline(s: StoredSession): string {
  switch (s.mode.kind) {
    case "capacity":
      return s.mode.threshold === null ? "—" : `${formatNumber(s.mode.threshold)} cells`;
    case "speed":
      return s.mode.threshold === null ? "—" : `${s.mode.threshold} ms`;
    case "fixed":
      return formatPercent(s.meanAccuracy);
    default:
      return "";
  }
}
