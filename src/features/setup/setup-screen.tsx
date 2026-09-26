"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useStore } from "zustand";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULT_SESSION_CONFIG, normalizeSessionConfig } from "@/engine/config";
import { findPreset } from "@/engine/presets";
import type { SessionConfig } from "@/engine/types";
import { MAX_SAVED_PRESETS, settingsStore, updateSettings } from "@/stores/settings-store";
import { ConfigForm } from "./config-form";
import { DifficultyReadout } from "./difficulty-readout";
import { PresetPicker } from "./preset-picker";
import { PreviewBoard } from "./preview-board";
import { TestPicker } from "./test-picker";
import "./setup.css";

// Radix Dialog loads on demand (prefetched at idle by TrainScreen).
const SavePresetDialog = dynamic(
  () => import("./save-preset-dialog").then((m) => m.SavePresetDialog),
  { ssr: false },
);

type Tab = "presets" | "tests" | "custom";

const DEFAULT_TEST: SessionConfig = {
  ...DEFAULT_SESSION_CONFIG,
  modeId: "capacity",
  rounds: 30,
  feedback: "end",
};

/** Setup (PRD §11.2). The last used config is restored on return. */
export function SetupScreen({ onStart }: { onStart: (config: SessionConfig) => void }) {
  const hydrated = useStore(settingsStore, (s) => s.hydrated);
  const saved = useStore(settingsStore, (s) => s.savedPresets.length);
  const [tab, setTab] = useState<Tab>("presets");
  const [fixed, setFixed] = useState<SessionConfig>(settingsStore.getState().lastConfig);
  const [test, setTest] = useState<SessionConfig>(DEFAULT_TEST);
  const [saveOpen, setSaveOpen] = useState(false);
  // Set once the visitor (or a deep link) picks something. Settings load
  // asynchronously, and a late restore must never overwrite their choice.
  const touched = useRef(false);
  const restored = useRef(false);

  // Deep links from the landing / progress pages apply immediately:
  // /train?test=capacity|speed, ?tab=custom, ?preset=<id>.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const test = params.get("test");
    const preset = findPreset(params.get("preset") ?? "");
    if (test === "capacity" || test === "speed") {
      setTest((c) => normalizeSessionConfig({ ...c, modeId: test }));
      setTab("tests");
    } else if (params.get("tab") === "custom") {
      setTab("custom");
    } else if (preset) {
      setFixed(preset.config);
      setTab("presets");
    } else {
      return;
    }
    touched.current = true;
  }, []);

  // Restore the last used config once settings have loaded — unless the
  // visitor has already made a choice.
  useEffect(() => {
    if (!hydrated || restored.current) return;
    restored.current = true;
    if (touched.current) return;
    const { lastConfig, lastTab } = settingsStore.getState();
    if (lastConfig.modeId === "capacity" || lastConfig.modeId === "speed") {
      setTest(lastConfig);
      setTab("tests");
    } else {
      setFixed(lastConfig);
      setTab(lastTab === "tests" ? "presets" : lastTab);
    }
  }, [hydrated]);

  const config = tab === "tests" ? test : fixed;
  const patchFixed = (p: Partial<SessionConfig>) => {
    touched.current = true;
    setFixed((c) => normalizeSessionConfig({ ...c, ...p, modeId: "fixed" }));
  };
  const patchTest = (p: Partial<SessionConfig>) => {
    touched.current = true;
    setTest((c) => normalizeSessionConfig({ ...c, ...p }));
  };
  const pickPreset = (c: SessionConfig) => {
    touched.current = true;
    setFixed(c);
  };
  const changeTab = (t: string) => {
    touched.current = true;
    setTab(t as Tab);
    updateSettings({ lastTab: t as Tab });
  };

  const startLabel =
    config.modeId === "capacity"
      ? "Start capacity test"
      : config.modeId === "speed"
        ? "Start speed test"
        : "Start training";

  return (
    <div className="setup mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-gutter">
      <AppHeader current="train" />
      <h1 className="sr-only">Set up a training session</h1>

      <div className="grid flex-1 gap-8 pt-2 pb-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-12">
        <div className="flex min-w-0 flex-col gap-6">
          <Tabs value={tab} onValueChange={changeTab} className="flex flex-col gap-6">
            <TabsList aria-label="Mode">
              <TabsTrigger value="presets">Presets</TabsTrigger>
              <TabsTrigger value="tests">Tests</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>
            <TabsContent value="presets">
              <PresetPicker config={fixed} onPick={pickPreset} />
            </TabsContent>
            <TabsContent value="tests">
              <TestPicker config={test} onChange={patchTest} />
            </TabsContent>
            <TabsContent value="custom" className="flex flex-col gap-6">
              <ConfigForm config={fixed} onChange={patchFixed} />
              <Button
                variant="secondary"
                className="self-start"
                disabled={saved >= MAX_SAVED_PRESETS}
                onClick={() => setSaveOpen(true)}
              >
                {saved >= MAX_SAVED_PRESETS
                  ? `Preset limit reached (${MAX_SAVED_PRESETS})`
                  : "Save as preset"}
              </Button>
            </TabsContent>
          </Tabs>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
          <PreviewBoard config={config} />
          <DifficultyReadout config={config} />
          <div className="hidden lg:block">
            <Button size="lg" className="w-full" onClick={() => onStart(config)}>
              {startLabel}
            </Button>
          </div>
        </aside>
      </div>

      {/* Mobile: sticky Start in the thumb zone, above the home indicator. */}
      <div className="sticky bottom-0 -mx-gutter border-t border-border bg-bg/95 px-gutter pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur lg:hidden">
        <Button size="lg" className="w-full" onClick={() => onStart(config)}>
          {startLabel}
        </Button>
      </div>

      {saveOpen && <SavePresetDialog open onOpenChange={setSaveOpen} config={fixed} />}
    </div>
  );
}
