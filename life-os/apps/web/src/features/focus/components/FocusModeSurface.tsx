import { useId, useState } from "react";
import { Bell, Settings } from "lucide-react";

import { TimerRing } from "@components/feedback";
import { ConfirmDialog, InlineMessage } from "@components/feedback";
import { Badge, Button, Heading, SkeletonCard, Surface, Text } from "@components/ui";

import {
  FocusControls,
  type FocusModePendingAction,
  type FocusModePhase,
  type FocusModeStatus,
} from "./FocusControls";
import { FocusSettingsDialog, type FocusModeSettings } from "./FocusSettingsDialog";
import { InterruptionCapture } from "./InterruptionCapture";
import { SessionContext, type FocusSessionContext } from "./SessionContext";
import "./focus-mode-surface.css";

export type BrowserNotificationPermission = "default" | "granted" | "denied" | "unsupported";

export interface FocusModeSurfaceProps {
  readonly locale: string;
  readonly status: FocusModeStatus;
  readonly phase: FocusModePhase;
  readonly totalSeconds: number;
  readonly remainingSeconds: number;
  readonly settings: FocusModeSettings;
  readonly context?: FocusSessionContext;
  readonly interruptionNote?: string;
  readonly notificationPermission?: BrowserNotificationPermission;
  readonly pendingAction?: FocusModePendingAction;
  readonly error?: string;
  readonly disabledReason?: string;
  readonly loading?: boolean;
  readonly loadError?: string;
  readonly recordedFocusMinutes?: number;
  readonly onRetry?: () => void;
  readonly onStart?: () => void;
  readonly onPause?: () => void;
  readonly onResume?: () => void;
  readonly onComplete?: () => void;
  readonly onCancel?: () => void;
  readonly onSkipBreak?: () => void;
  readonly onSettingsChange?: (settings: FocusModeSettings) => void;
  readonly onInterruptionNoteChange?: (note: string) => void;
  readonly onSaveInterruption?: () => void;
  readonly onRequestNotificationPermission?: () => void;
}

export function FocusModeSurface({
  locale,
  status,
  phase,
  totalSeconds,
  remainingSeconds,
  settings,
  context,
  interruptionNote = "",
  notificationPermission = "unsupported",
  pendingAction,
  error,
  disabledReason,
  loading = false,
  loadError,
  recordedFocusMinutes,
  onRetry,
  onStart,
  onPause,
  onResume,
  onComplete,
  onCancel,
  onSkipBreak,
  onSettingsChange,
  onInterruptionNoteChange,
  onSaveInterruption,
  onRequestNotificationPermission,
}: FocusModeSurfaceProps) {
  const titleId = useId();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirming, setConfirming] = useState<"complete" | "cancel" | null>(null);
  const [previousStatus, setPreviousStatus] = useState(status);
  if (status !== previousStatus) {
    setPreviousStatus(status);
    setConfirming(null);
  }
  const active = status === "running" || status === "paused";
  const terminal = status === "completed" || status === "cancelled";
  const timerStatus = status === "cancelled" ? "completed" : status;
  const disabled = Boolean(disabledReason);

  if (loading) {
    return (
      <section className="lifeos-focus-mode" aria-labelledby={titleId} aria-busy="true">
        <Heading level={1} id={titleId}>
          Focus Mode
        </Heading>
        <Text tone="secondary">Loading the active Focus Session…</Text>
        <SkeletonCard lines={5} />
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="lifeos-focus-mode" aria-labelledby={titleId}>
        <Heading level={1} id={titleId}>
          Focus Mode
        </Heading>
        <InlineMessage tone="danger" announce="alert">
          Focus Mode is unavailable. {loadError}
        </InlineMessage>
        {onRetry ? <Button onClick={onRetry}>Retry</Button> : null}
      </section>
    );
  }

  const completionDescription = context?.task
    ? `Complete this Focus Session and record confirmed focus time for “${context.task.title}”. The Task will not be marked done.`
    : "Complete this Focus Session and record its confirmed focus time.";

  return (
    <section className="lifeos-focus-mode" aria-labelledby={titleId}>
      <header className="lifeos-focus-mode__header">
        <div>
          <Heading level={1} id={titleId}>
            Focus Mode
          </Heading>
          <Text tone="secondary">
            {phase === "break" && active
              ? "Take the planned break or skip it when you are ready to continue."
              : "Keep the current action and session controls in one quiet place."}
          </Text>
        </div>
        {onSettingsChange && !active ? (
          <Button variant="secondary" iconStart={Settings} onClick={() => setSettingsOpen(true)}>
            Session settings
          </Button>
        ) : null}
      </header>

      {error ? (
        <InlineMessage tone="danger" announce="alert">
          Focus Session action failed. {error} The current session state is unchanged.
        </InlineMessage>
      ) : null}
      {disabledReason ? <InlineMessage tone="warning">{disabledReason}</InlineMessage> : null}

      <div className="lifeos-focus-mode__layout">
        <Surface as="section" title={phase === "focus" ? "Focus Session" : "Break"} padding="lg">
          <div className="lifeos-focus-mode__timer-panel">
            {terminal ? (
              <div className="lifeos-focus-mode__summary">
                <Badge tone={status === "completed" ? "success" : "neutral"}>
                  {status === "completed" ? "Completed" : "Cancelled"}
                </Badge>
                <Heading level={2} size="md">
                  {status === "completed" ? "Focus Session completed" : "Focus Session cancelled"}
                </Heading>
                <Text tone="secondary">
                  {status === "completed" && recordedFocusMinutes !== undefined
                    ? `${new Intl.NumberFormat(locale).format(recordedFocusMinutes)} min recorded.`
                    : status === "cancelled"
                      ? "This session did not add confirmed time to the linked Task."
                      : "Confirmed focus time was recorded."}
                </Text>
              </div>
            ) : (
              <TimerRing
                label={phase === "focus" ? "Focus Session" : "Break"}
                labelHidden
                totalSeconds={totalSeconds}
                remainingSeconds={remainingSeconds}
                status={timerStatus}
                locale={locale}
                size="lg"
              />
            )}

            <FocusControls
              status={status}
              phase={phase}
              disabled={disabled}
              {...(pendingAction ? { pendingAction } : {})}
              {...(onStart ? { onStart } : {})}
              {...(onPause ? { onPause } : {})}
              {...(onResume ? { onResume } : {})}
              {...(onComplete ? { onComplete: () => setConfirming("complete") } : {})}
              {...(onCancel ? { onCancel: () => setConfirming("cancel") } : {})}
              {...(onSkipBreak ? { onSkipBreak } : {})}
            />
          </div>
        </Surface>

        <div className="lifeos-focus-mode__side">
          <SessionContext {...(context ? { context } : {})} />

          {active && onInterruptionNoteChange && onSaveInterruption ? (
            <InterruptionCapture
              note={interruptionNote}
              onNoteChange={onInterruptionNoteChange}
              onSave={onSaveInterruption}
              pending={pendingAction === "save-note"}
              disabled={disabled}
            />
          ) : null}

          {active ? (
            <Surface as="section" title="Browser notification" padding="sm">
              <div className="lifeos-focus-mode__notification">
                <Bell aria-hidden="true" size={20} />
                <div>
                  {notificationPermission === "granted" ? (
                    <>
                      <Badge tone="success">Allowed</Badge>
                      <Text size="sm" tone="secondary">
                        This browser can alert you when the current phase ends.
                      </Text>
                    </>
                  ) : notificationPermission === "denied" ? (
                    <Text size="sm" tone="secondary">
                      Browser notifications are blocked. You can change this in your browser
                      settings.
                    </Text>
                  ) : notificationPermission === "unsupported" ? (
                    <Text size="sm" tone="secondary">
                      Browser notifications are not available here. The timer remains visible in
                      LifeOS.
                    </Text>
                  ) : (
                    <>
                      <Text size="sm" tone="secondary">
                        Get an alert when this phase ends. Your browser will ask for permission only
                        after you choose.
                      </Text>
                      {onRequestNotificationPermission ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={onRequestNotificationPermission}
                          loading={pendingAction === "notification"}
                          disabled={disabled}
                          loadingLabel="Requesting notification permission"
                        >
                          Allow notifications
                        </Button>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </Surface>
          ) : null}
        </div>
      </div>

      {onSettingsChange ? (
        <FocusSettingsDialog
          open={settingsOpen}
          settings={settings}
          onClose={() => setSettingsOpen(false)}
          onSave={(nextSettings) => {
            onSettingsChange(nextSettings);
            setSettingsOpen(false);
          }}
          pending={pendingAction === "settings"}
        />
      ) : null}

      <ConfirmDialog
        open={confirming === "complete"}
        onClose={() => setConfirming(null)}
        onConfirm={() => onComplete?.()}
        title="Complete this Focus Session?"
        description={completionDescription}
        confirmLabel="Complete session"
        pending={pendingAction === "complete"}
        pendingLabel="Completing Focus Session"
      />
      <ConfirmDialog
        open={confirming === "cancel"}
        onClose={() => setConfirming(null)}
        onConfirm={() => onCancel?.()}
        title="Cancel this Focus Session?"
        description="Cancel the session and keep its truthful duration in history. Confirmed time will not be added to the linked Task."
        confirmLabel="Cancel session"
        pending={pendingAction === "cancel"}
        pendingLabel="Cancelling Focus Session"
      />
    </section>
  );
}
