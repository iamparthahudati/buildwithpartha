import { useState } from "react";

import { NumberInput } from "@components/ui";
import { FormDialog } from "@components/feedback";

export interface FocusModeSettings {
  readonly focusMinutes: number;
  readonly breakMinutes: number;
}

export interface FocusSettingsDialogProps {
  readonly open: boolean;
  readonly settings: FocusModeSettings;
  readonly onClose: () => void;
  readonly onSave: (settings: FocusModeSettings) => void;
  readonly pending?: boolean;
  readonly error?: string;
}

export function FocusSettingsDialog({
  open,
  settings,
  onClose,
  onSave,
  pending = false,
  error,
}: FocusSettingsDialogProps) {
  const [draft, setDraft] = useState(settings);
  const [wasOpen, setWasOpen] = useState(open);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft(settings);
  }

  const focusError =
    draft.focusMinutes < 1 || draft.focusMinutes > 1440
      ? "Choose a focus duration from 1 to 1,440 minutes."
      : undefined;
  const breakError =
    draft.breakMinutes < 0 || draft.breakMinutes > 180
      ? "Choose a break duration from 0 to 180 minutes."
      : undefined;

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      onSubmit={() => onSave(draft)}
      title="Session settings"
      description="Choose durations for the next Focus Session. These are not universal targets."
      submitLabel="Apply settings"
      pending={pending}
      pendingLabel="Applying settings"
      submitDisabled={Boolean(focusError || breakError)}
      isDirty={
        draft.focusMinutes !== settings.focusMinutes || draft.breakMinutes !== settings.breakMinutes
      }
      {...(error ? { error } : {})}
    >
      <NumberInput
        label="Focus duration"
        value={draft.focusMinutes}
        onChange={(event) =>
          setDraft((current) => ({ ...current, focusMinutes: Number(event.target.value) }))
        }
        min={1}
        max={1440}
        unit="minutes"
        {...(focusError ? { error: focusError } : {})}
      />
      <NumberInput
        label="Break duration"
        value={draft.breakMinutes}
        onChange={(event) =>
          setDraft((current) => ({ ...current, breakMinutes: Number(event.target.value) }))
        }
        min={0}
        max={180}
        unit="minutes"
        {...(breakError ? { error: breakError } : {})}
      />
    </FormDialog>
  );
}
