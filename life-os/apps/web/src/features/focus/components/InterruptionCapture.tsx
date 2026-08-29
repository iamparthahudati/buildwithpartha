import { useId } from "react";

import { Button, Surface, Text, Textarea } from "@components/ui";

export interface InterruptionCaptureProps {
  readonly note: string;
  readonly onNoteChange: (note: string) => void;
  readonly onSave: () => void;
  readonly pending?: boolean;
  readonly error?: string;
  readonly disabled?: boolean;
}

export function InterruptionCapture({
  note,
  onNoteChange,
  onSave,
  pending = false,
  error,
  disabled = false,
}: InterruptionCaptureProps) {
  const statusId = useId();
  const normalizedLength = [...note].length;
  const tooLong = normalizedLength > 2000;

  return (
    <Surface as="section" title="Note a distraction" padding="sm">
      <div className="lifeos-focus-mode__note">
        <Text size="sm" tone="secondary">
          Keep a short private note, then return to the current session.
        </Text>
        <Textarea
          label="Distraction note (optional)"
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          rows={2}
          autoGrow
          counterMax={2000}
          disabled={disabled || pending}
          {...(tooLong
            ? { error: "Keep the distraction note to 2,000 characters or fewer." }
            : error
              ? { error }
              : {})}
          aria-describedby={statusId}
        />
        <div className="lifeos-focus-mode__note-actions">
          <Text id={statusId} size="xs" tone="muted">
            Saved notes become private Focus Session content.
          </Text>
          <Button
            size="sm"
            variant="secondary"
            onClick={onSave}
            disabled={disabled || pending || tooLong || note.trim().length === 0}
            loading={pending}
            loadingLabel="Saving distraction note"
          >
            Save distraction
          </Button>
        </div>
      </div>
    </Surface>
  );
}
