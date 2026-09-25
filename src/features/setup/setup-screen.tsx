"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "zustand";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULT_SESSION_CONFIG, normalizeSessionConfig } from "@/engine/config";
import { presetSignature } from "@/engine/presets";
import type { SessionConfig } from "@/engine/types";
import {
  MAX_SAVED_PRESETS,
  savePreset,
  settingsStore,
  updateSettings,
} from "@/stores/settings-store";
import { ConfigForm } from "./config-form";
import { DifficultyReadout } from "./difficulty-readout";
import { PresetPicker } from "./preset-picker";
import { PreviewBoard } from "./preview-board";
import { TestPicker } from "./test-picker";
import "./setup.css";

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
  const restored = useRef(false);

  // Restore once settings have loaded from storage (after mount).
  useEffect(() => {
    if (!hydrated || restored.current) return;
    restored.current = true;
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
  const patchFixed = (p: Partial<SessionConfig>) =>
    setFixed((c) => normalizeSessionConfig({ ...c, ...p, modeId: "fixed" }));
  const patchTest = (p: Partial<SessionConfig>) =>
    setTest((c) => normalizeSessionConfig({ ...c, ...p }));
  const changeTab = (t: string) => {
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
              <PresetPicker config={fixed} onPick={(c) => setFixed(c)} />
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

      <SavePresetDialog open={saveOpen} onOpenChange={setSaveOpen} config={fixed} />
    </div>
  );
}

function SavePresetDialog({
  open,
  onOpenChange,
  config,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: SessionConfig;
}) {
  const [name, setName] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Save preset</DialogTitle>
        <DialogDescription>
          {presetSignature(config)} · {config.rounds} rounds
        </DialogDescription>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            savePreset(name || presetSignature(config), config);
            setName("");
            onOpenChange(false);
          }}
        >
          <label className="flex flex-col gap-2 text-small text-text-muted">
            Name
            <input
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              placeholder={presetSignature(config)}
              className="h-12 rounded-button border border-border bg-surface-2 px-3 text-body text-text placeholder:text-text-faint"
            />
          </label>
          <DialogFooter>
            <Button variant="secondary" size="lg" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="lg">
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
