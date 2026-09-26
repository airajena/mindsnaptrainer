"use client";

import { SettingsIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

// The sheet (Radix Dialog, switches, segmented controls) loads on first open,
// keeping it out of every page's first-load JS. /train prefetches it at idle.
const SettingsSheet = dynamic(() => import("./settings-sheet").then((m) => m.SettingsSheet), {
  ssr: false,
});

export function SettingsButton() {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setLoaded(true);
          setOpen(true);
        }}
        className="grid size-11 place-items-center rounded-button text-text-muted hover:bg-surface-2 hover:text-text"
      >
        <SettingsIcon className="size-5" aria-hidden />
        <span className="sr-only">Settings</span>
      </button>
      {loaded && <SettingsSheet open={open} onOpenChange={setOpen} />}
    </>
  );
}
