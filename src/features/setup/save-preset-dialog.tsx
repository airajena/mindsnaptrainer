"use client";

import { useState } from "react";
import { Button } from "@/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { presetSignature } from "@/engine/presets";
import type { SessionConfig } from "@/engine/types";
import { savePreset } from "@/stores/settings-store";

export function SavePresetDialog({
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
