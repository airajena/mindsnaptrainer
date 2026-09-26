"use client";

import { useState } from "react";
import { useStore } from "zustand";
import { Button } from "@/components/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { SwitchRow } from "@/features/setup/field";
import { safeLocal } from "@/platform/storage/local";
import { pushNotice } from "@/stores/notice-store";
import { resetSettings, settingsStore, updateSettings } from "@/stores/settings-store";

/**
 * Settings (PRD §11.9) in a sheet: bottom on phones, right-hand on wider
 * screens. Loaded on demand by <SettingsButton> (settings-button.tsx).
 */
export function SettingsSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="sheet">
        <SettingsBody />
      </DialogContent>
    </Dialog>
  );
}

function SettingsBody() {
  const s = useStore(settingsStore);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <>
      <DialogTitle>Settings</DialogTitle>
      <DialogDescription>Saved on this device only.</DialogDescription>

      <section className="flex flex-col gap-1">
        <h3 className="label-caps mt-2 text-label text-text-muted">Training</h3>
        <div className="flex flex-col gap-2 py-2">
          <span className="text-small text-text-muted">Countdown</span>
          <Segmented
            value={s.countdown}
            onChange={(countdown) => updateSettings({ countdown })}
            options={[
              { value: "standard", label: "3-2-1" },
              { value: "quick", label: "Quick" },
              { value: "off", label: "Off" },
            ]}
            label="Countdown"
            className="w-full"
          />
        </div>
        <SwitchRow
          label="Memorize progress bar"
          helper="Off means nothing moves during the exposure."
        >
          <Switch
            checked={s.progressBar}
            onCheckedChange={(progressBar) => updateSettings({ progressBar })}
          />
        </SwitchRow>
        <SwitchRow label="Swipe to select" helper="Drag across cells to select several.">
          <Switch checked={s.swipe} onCheckedChange={(swipe) => updateSettings({ swipe })} />
        </SwitchRow>
        <SwitchRow label="Auto-advance results" helper="Next round after 2.5 s.">
          <Switch
            checked={s.autoAdvance}
            onCheckedChange={(autoAdvance) => updateSettings({ autoAdvance })}
          />
        </SwitchRow>
        <SwitchRow label="Haptics" helper="Light tick on select, where supported.">
          <Switch checked={s.haptics} onCheckedChange={(haptics) => updateSettings({ haptics })} />
        </SwitchRow>
      </section>

      <section className="flex flex-col gap-1">
        <h3 className="label-caps mt-2 text-label text-text-muted">Display</h3>
        <div className="flex min-h-11 items-center justify-between gap-4">
          <span>Theme</span>
          <span className="text-small text-text-muted">Dark · light theme coming soon</span>
        </div>
        <SwitchRow label="Reduce motion" helper="Always, instead of following your system setting.">
          <Switch
            checked={s.reducedMotion === "reduce"}
            onCheckedChange={(on) => updateSettings({ reducedMotion: on ? "reduce" : "system" })}
          />
        </SwitchRow>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="label-caps mt-2 text-label text-text-muted">Your data</h3>
        <p className="text-small text-text-muted">
          History and settings live only in this browser. Nothing is sent anywhere.
        </p>
        <Button
          variant="secondary"
          className="self-start text-danger"
          onClick={() => setConfirmDelete(true)}
        >
          Delete all data
        </Button>
      </section>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete all data?"
        description="This wipes your history, saved presets and settings from this device. It can't be undone."
        confirmLabel="Delete everything"
        destructive
        onConfirm={() => void deleteAllData()}
      />
    </>
  );
}

export async function deleteAllData(): Promise<void> {
  const { clearHistory } = await import("@/stores/history-store");
  await clearHistory();
  for (const key of safeLocal.keys()) {
    if (key.startsWith("mindsnap:") || key.startsWith("quarantine:")) safeLocal.remove(key);
  }
  resetSettings();
  pushNotice(`deleted-${Date.now()}`, "All data deleted.");
}
