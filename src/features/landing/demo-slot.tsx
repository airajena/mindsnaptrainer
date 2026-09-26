"use client";

import dynamic from "next/dynamic";
import { DemoIdle } from "./demo-idle";
import { PauseOffscreen } from "./pause-offscreen";
import "./landing.css";

// The engine, Board and timing pipeline load after first paint, so they never
// block LCP. Until then the identical static idle board is shown.
const DemoGame = dynamic(() => import("./demo-game").then((m) => m.DemoGame), {
  ssr: false,
  loading: () => <DemoIdle />,
});

export function DemoSlot() {
  return (
    <PauseOffscreen id="demo" className="demo-slot" aria-label="Try it: a 5 by 5 demo round">
      <DemoGame />
    </PauseOffscreen>
  );
}
