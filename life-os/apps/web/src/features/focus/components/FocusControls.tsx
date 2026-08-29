import { Check, CirclePause, Play, SkipForward, X } from "lucide-react";

import { Button } from "@components/ui";

export type FocusModePhase = "focus" | "break";
export type FocusModeStatus = "idle" | "running" | "paused" | "completed" | "cancelled";
export type FocusModePendingAction =
  | "start"
  | "pause"
  | "resume"
  | "complete"
  | "cancel"
  | "skip-break"
  | "save-note"
  | "settings"
  | "notification";

export interface FocusControlsProps {
  readonly status: FocusModeStatus;
  readonly phase: FocusModePhase;
  readonly pendingAction?: FocusModePendingAction;
  readonly disabled?: boolean;
  readonly onStart?: () => void;
  readonly onPause?: () => void;
  readonly onResume?: () => void;
  readonly onComplete?: () => void;
  readonly onCancel?: () => void;
  readonly onSkipBreak?: () => void;
}

export function FocusControls({
  status,
  phase,
  pendingAction,
  disabled = false,
  onStart,
  onPause,
  onResume,
  onComplete,
  onCancel,
  onSkipBreak,
}: FocusControlsProps) {
  const anyPending = pendingAction !== undefined;

  if (status === "idle" || status === "completed" || status === "cancelled") {
    return onStart ? (
      <Button
        iconStart={Play}
        onClick={onStart}
        disabled={disabled || anyPending}
        loading={pendingAction === "start"}
        loadingLabel="Starting Focus Session"
      >
        {status === "idle" ? "Start focus" : "Start another session"}
      </Button>
    ) : null;
  }

  return (
    <div className="lifeos-focus-mode__controls" aria-label="Focus Session controls">
      {status === "running" && onPause ? (
        <Button
          variant="secondary"
          iconStart={CirclePause}
          onClick={onPause}
          disabled={disabled || anyPending}
          loading={pendingAction === "pause"}
          loadingLabel="Pausing Focus Session"
        >
          Pause
        </Button>
      ) : null}
      {status === "paused" && onResume ? (
        <Button
          iconStart={Play}
          onClick={onResume}
          disabled={disabled || anyPending}
          loading={pendingAction === "resume"}
          loadingLabel="Resuming Focus Session"
        >
          Resume
        </Button>
      ) : null}
      {phase === "break" && onSkipBreak ? (
        <Button
          variant="secondary"
          iconStart={SkipForward}
          onClick={onSkipBreak}
          disabled={disabled || anyPending}
          loading={pendingAction === "skip-break"}
          loadingLabel="Skipping break"
        >
          Skip break
        </Button>
      ) : null}
      {onComplete ? (
        <Button
          variant="secondary"
          iconStart={Check}
          onClick={onComplete}
          disabled={disabled || anyPending}
        >
          Complete session
        </Button>
      ) : null}
      {onCancel ? (
        <Button variant="ghost" iconStart={X} onClick={onCancel} disabled={disabled || anyPending}>
          Cancel session
        </Button>
      ) : null}
    </div>
  );
}
