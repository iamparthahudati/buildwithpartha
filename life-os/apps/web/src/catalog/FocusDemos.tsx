import { useState } from "react";

import {
  FocusModeSurface,
  type BrowserNotificationPermission,
  type FocusModePhase,
  type FocusModeSettings,
  type FocusModeStatus,
} from "@features/focus";

export type FocusModeDemoState =
  "idle" | "running" | "paused-break" | "completed" | "unavailable" | "loading";

export function FocusModeSurfaceDemo({ state }: { readonly state: FocusModeDemoState }) {
  const [status, setStatus] = useState<FocusModeStatus>(
    state === "paused-break"
      ? "paused"
      : state === "completed"
        ? "completed"
        : state === "running"
          ? "running"
          : "idle",
  );
  const [phase, setPhase] = useState<FocusModePhase>(state === "paused-break" ? "break" : "focus");
  const [settings, setSettings] = useState<FocusModeSettings>({
    focusMinutes: 25,
    breakMinutes: 5,
  });
  const [note, setNote] = useState("");
  const [notificationPermission, setNotificationPermission] =
    useState<BrowserNotificationPermission>("default");

  return (
    <FocusModeSurface
      locale="en-IN"
      status={status}
      phase={phase}
      totalSeconds={phase === "focus" ? settings.focusMinutes * 60 : settings.breakMinutes * 60}
      remainingSeconds={phase === "focus" ? 1042 : 180}
      settings={settings}
      context={{
        task: { title: "Draft project outline", href: "/life-os/app/tasks/task-outline" },
        timeBlock: {
          title: "Project planning",
          localTime: "2:00 PM–2:30 PM",
          href: "/life-os/app/time-blocks?date=2026-08-24",
        },
      }}
      interruptionNote={note}
      notificationPermission={notificationPermission}
      loading={state === "loading"}
      {...(state === "unavailable"
        ? { loadError: "We couldn't restore the Focus Session. Try again." }
        : {})}
      {...(status === "completed" ? { recordedFocusMinutes: settings.focusMinutes } : {})}
      onRetry={() => setStatus("idle")}
      onStart={() => {
        setPhase("focus");
        setStatus("running");
      }}
      onPause={() => setStatus("paused")}
      onResume={() => setStatus("running")}
      onComplete={() => setStatus("completed")}
      onCancel={() => setStatus("cancelled")}
      onSkipBreak={() => {
        setPhase("focus");
        setStatus("running");
      }}
      onSettingsChange={setSettings}
      onInterruptionNoteChange={setNote}
      onSaveInterruption={() => setNote("")}
      onRequestNotificationPermission={() => setNotificationPermission("granted")}
    />
  );
}
