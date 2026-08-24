import { useState } from "react";

import { useTaskDetail } from "@features/tasks";
import { useTimeBlock } from "@features/time-blocks";
import { useUserPreferences } from "@features/user";

import { FocusModeSurface, type BrowserNotificationPermission } from "./FocusModeSurface";
import type { FocusModeSettings } from "./FocusSettingsDialog";
import type { FocusSessionContext } from "./SessionContext";
import { useFocusSession } from "../hooks/useFocusSession";

export interface IntegratedFocusModeProps {
  readonly locale: string;
  readonly taskId?: string;
  readonly timeBlockId?: string;
}

function readNotificationPermission(): BrowserNotificationPermission {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

export function IntegratedFocusMode({ locale, taskId, timeBlockId }: IntegratedFocusModeProps) {
  const focus = useFocusSession();
  const preferences = useUserPreferences();
  const defaultSettings: FocusModeSettings = {
    focusMinutes: preferences.data?.planningDefaults.focusDurationMinutes ?? 25,
    breakMinutes: preferences.data?.planningDefaults.breakDurationMinutes ?? 5,
  };
  const [settings, setSettings] = useState(defaultSettings);
  const [previousDefaults, setPreviousDefaults] = useState(defaultSettings);
  const [interruptionNote, setInterruptionNote] = useState("");
  const [notificationPermission, setNotificationPermission] = useState(readNotificationPermission);
  const [requestingNotification, setRequestingNotification] = useState(false);

  if (
    defaultSettings.focusMinutes !== previousDefaults.focusMinutes ||
    defaultSettings.breakMinutes !== previousDefaults.breakMinutes
  ) {
    setPreviousDefaults(defaultSettings);
    if (!focus.session) setSettings(defaultSettings);
  }

  const displayedSession = focus.session ?? focus.terminalSession;
  const contextTaskId = displayedSession?.taskId ?? taskId ?? null;
  const contextTimeBlockId = displayedSession?.timeBlockId ?? timeBlockId ?? null;
  const taskQuery = useTaskDetail(contextTaskId ?? "", contextTaskId !== null);
  const timeBlockQuery = useTimeBlock(contextTimeBlockId, contextTimeBlockId !== null);

  const context: FocusSessionContext | undefined =
    contextTaskId || contextTimeBlockId
      ? {
          ...(contextTaskId
            ? {
                task: {
                  title: taskQuery.data?.task.title ?? "Linked Task",
                  href: `/life-os/app/tasks/${encodeURIComponent(contextTaskId)}`,
                },
              }
            : {}),
          ...(contextTimeBlockId
            ? {
                timeBlock: {
                  title: timeBlockQuery.data?.title ?? "Linked Time Block",
                  localTime: timeBlockQuery.data
                    ? `${timeBlockQuery.data.startTime}–${timeBlockQuery.data.endTime}`
                    : "Schedule details loading",
                  href: `/life-os/app/time-blocks?selected=${encodeURIComponent(contextTimeBlockId)}`,
                },
              }
            : {}),
        }
      : undefined;

  const status =
    displayedSession?.status === "RUNNING"
      ? "running"
      : displayedSession?.status === "PAUSED"
        ? "paused"
        : displayedSession?.status === "COMPLETED"
          ? "completed"
          : displayedSession?.status === "CANCELLED"
            ? "cancelled"
            : "idle";
  const phase = displayedSession?.phase === "BREAK" ? "break" : "focus";
  const totalSeconds = focus.session
    ? focus.totalSeconds
    : displayedSession
      ? displayedSession.phase === "FOCUS"
        ? displayedSession.plannedFocusDurationSeconds
        : displayedSession.plannedBreakDurationSeconds
      : settings.focusMinutes * 60;
  const remainingSeconds = focus.session ? focus.remainingSeconds : 0;
  const pendingAction = requestingNotification ? ("notification" as const) : focus.pendingAction;

  const requestNotificationPermission = async () => {
    if (typeof Notification === "undefined") return;
    setRequestingNotification(true);
    try {
      setNotificationPermission(await Notification.requestPermission());
    } finally {
      setRequestingNotification(false);
    }
  };

  return (
    <FocusModeSurface
      locale={locale}
      status={status}
      phase={phase}
      totalSeconds={totalSeconds}
      remainingSeconds={remainingSeconds}
      settings={settings}
      {...(context ? { context } : {})}
      interruptionNote={interruptionNote}
      notificationPermission={notificationPermission}
      loading={focus.isLoading}
      {...(focus.loadError ? { loadError: focus.loadError } : {})}
      {...(focus.disabledReason ? { disabledReason: focus.disabledReason } : {})}
      {...(focus.message ? { syncMessage: focus.message } : {})}
      {...(pendingAction ? { pendingAction } : {})}
      {...(focus.terminalSession
        ? {
            recordedFocusMinutes: Math.floor(focus.terminalSession.actualFocusDurationSeconds / 60),
          }
        : {})}
      onRetry={() => void focus.retry()}
      onStart={() =>
        void focus
          .start(settings.focusMinutes * 60, taskId, timeBlockId, settings.breakMinutes * 60)
          .catch(() => undefined)
      }
      onPause={() => void focus.pause().catch(() => undefined)}
      onResume={() => void focus.resume().catch(() => undefined)}
      onComplete={() => void focus.complete().catch(() => undefined)}
      onCancel={() => void focus.cancel().catch(() => undefined)}
      onSkipBreak={() => void focus.skipBreak().catch(() => undefined)}
      onSettingsChange={setSettings}
      onInterruptionNoteChange={setInterruptionNote}
      onSaveInterruption={() => {
        void focus
          .saveInterruption(interruptionNote)
          .then(() => setInterruptionNote(""))
          .catch(() => undefined);
      }}
      onRequestNotificationPermission={() => void requestNotificationPermission()}
    />
  );
}
