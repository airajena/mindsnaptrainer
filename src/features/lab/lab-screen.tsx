"use client";

import { useEffect, useState } from "react";
import { LatencyMeter } from "./latency-meter";
import { TimingBench } from "./timing-bench";
import "./lab.css";

/** Dev-only test bench for the two things that make or break the product: timing and input. */
export function LabScreen() {
  const [longTasks, setLongTasks] = useState<number[]>([]);
  // Read after mount: rendering it during SSR would cause a hydration mismatch.
  const [userAgent, setUserAgent] = useState("");

  useEffect(() => {
    setUserAgent(navigator.userAgent);
    if (!PerformanceObserver.supportedEntryTypes?.includes("longtask")) return;
    const po = new PerformanceObserver((list) => {
      const d = list.getEntries().map((e) => e.duration);
      setLongTasks((prev) => [...prev, ...d]);
    });
    po.observe({ type: "longtask" });
    return () => po.disconnect();
  }, []);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-12 px-gutter py-8">
      <header className="flex flex-col gap-2">
        <p className="label-caps text-label text-text-muted">Dev only</p>
        <h1 className="text-h1">Lab</h1>
        <p className="font-mono text-small text-text-muted tabular" data-testid="env">
          {userAgent}
        </p>
        <p className="font-mono text-small tabular" data-testid="long-tasks">
          Long tasks (&gt; 50 ms) since load: {longTasks.length}
          {longTasks.length > 0 && ` · max ${Math.max(...longTasks).toFixed(0)} ms`}
        </p>
      </header>
      <div className="grid gap-12 lg:grid-cols-2">
        <TimingBench />
        <LatencyMeter />
      </div>
    </main>
  );
}
