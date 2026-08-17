import { useEffect, useRef } from "react";

import {
  Button,
  LiveRegion,
  ProgressRing,
  type ProgressSize,
  type ProgressTone,
} from "@components/ui";
import { useAnnouncer } from "@hooks/useAnnouncer";

import "./timer-ring.css";

/**
 * TimerRing (LOS-0427).
 *
 * A duration display on `ProgressRing` (LOS-0322): the ring's own
 * `centerText` carries the running clock, which is what gives it tabular
 * numerals for free — `ProgressRing` already sets `--lifeos-font-numeric`
 * on that span so the digits do not jitter the layout as they change.
 *
 * `status`, `totalSeconds` and `remainingSeconds` are all plain controlled
 * props — this component has no `setInterval` of its own, the same
 * "component supplies the mechanism, caller supplies the state" split every
 * other stateful pattern in this epic already uses. The actual tick lives in
 * whatever owns the focus session; this only ever renders whatever second it
 * is told.
 *
 * Announcements are the one place that split does not hold literally: a
 * live region driven straight from `remainingSeconds` would announce every
 * tick, which the tone guide explicitly forbids (`useAnnouncer`'s own doc
 * comment names this exact failure). `status` transitions are announced —
 * paused, resumed, completed — never the countdown itself.
 */

export type TimerRingStatus = "idle" | "running" | "paused" | "completed";

export interface TimerRingProps {
  /** What is being timed, e.g. "Focus session". */
  readonly label: string;
  readonly labelHidden?: boolean;
  readonly totalSeconds: number;
  readonly remainingSeconds: number;
  readonly status: TimerRingStatus;
  /** Drives the spoken duration text. Never read from the browser directly. */
  readonly locale: string;
  readonly size?: ProgressSize;
  /** Shown, and enabled, only while `status` is `"idle"`. */
  readonly onStart?: () => void;
  /** Shown, and enabled, only while `status` is `"running"`. */
  readonly onPause?: () => void;
  /** Shown, and enabled, only while `status` is `"paused"`. */
  readonly onResume?: () => void;
  /** Shown, and enabled, while `status` is `"paused"` or `"completed"`. */
  readonly onReset?: () => void;
  readonly startLabel?: string;
  readonly pauseLabel?: string;
  readonly resumeLabel?: string;
  readonly resetLabel?: string;
  readonly className?: string;
}

const STATUS_LABEL: Record<TimerRingStatus, string> = {
  idle: "Ready",
  running: "Running",
  paused: "Paused",
  completed: "Completed",
};

const STATUS_TONE: Record<TimerRingStatus, ProgressTone> = {
  idle: "primary",
  running: "primary",
  paused: "warning",
  completed: "success",
};

export function TimerRing({
  label,
  labelHidden = false,
  totalSeconds,
  remainingSeconds,
  status,
  locale,
  size = "lg",
  onStart,
  onPause,
  onResume,
  onReset,
  startLabel = "Start",
  pauseLabel = "Pause",
  resumeLabel = "Resume",
  resetLabel = "Reset",
  className,
}: TimerRingProps) {
  const { message, announce } = useAnnouncer();
  const previousStatusRef = useRef(status);

  useEffect(() => {
    if (previousStatusRef.current === status) {
      return;
    }
    previousStatusRef.current = status;

    if (status === "paused") {
      announce(`${label} paused.`);
    } else if (status === "running") {
      announce(`${label} resumed.`);
    } else if (status === "completed") {
      announce(`${label} completed.`);
    }
  }, [status, label, announce]);

  const clampedRemaining = Math.min(Math.max(remainingSeconds, 0), Math.max(totalSeconds, 0));
  const elapsed = totalSeconds - clampedRemaining;

  return (
    <div
      className={[
        "lifeos-timer-ring",
        status === "running" && "lifeos-timer-ring--running",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <ProgressRing
        label={label}
        labelHidden={labelHidden}
        value={elapsed}
        max={totalSeconds}
        tone={STATUS_TONE[status]}
        size={size}
        centerText={formatClock(clampedRemaining)}
        valueText={`${spokenRemaining(clampedRemaining, locale)} remaining, ${STATUS_LABEL[
          status
        ].toLowerCase()}.`}
      />

      <p className="lifeos-timer-ring__status">{STATUS_LABEL[status]}</p>

      <div className="lifeos-timer-ring__actions">
        {status === "idle" && onStart ? <Button onClick={onStart}>{startLabel}</Button> : null}
        {status === "running" && onPause ? (
          <Button variant="secondary" onClick={onPause}>
            {pauseLabel}
          </Button>
        ) : null}
        {status === "paused" && onResume ? <Button onClick={onResume}>{resumeLabel}</Button> : null}
        {(status === "paused" || status === "completed") && onReset ? (
          <Button variant="secondary" onClick={onReset}>
            {resetLabel}
          </Button>
        ) : null}
      </div>

      <LiveRegion message={message} />
    </div>
  );
}

function formatClock(totalSeconds: number): string {
  const whole = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const seconds = whole % 60;
  const pad = (part: number) => String(part).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/**
 * A locale-aware spoken duration at second granularity — `lib/duration.ts`'s
 * `formatDurationMinutes` stops at whole minutes, which is right for a
 * stored `Estimate` but would round a running countdown's seconds away
 * entirely. Kept local rather than added to that module: an `Estimate` and a
 * live countdown are different domain concepts that only happen to share an
 * `Intl.NumberFormat` implementation technique.
 */
function spokenRemaining(totalSeconds: number, locale: string): string {
  const whole = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(whole / 60);
  const seconds = whole % 60;

  const parts: string[] = [];
  if (minutes > 0) {
    parts.push(formatUnit(minutes, "minute", locale));
  }
  if (seconds > 0 || minutes === 0) {
    parts.push(formatUnit(seconds, "second", locale));
  }
  return parts.join(" ");
}

function formatUnit(value: number, unit: "minute" | "second", locale: string): string {
  return new Intl.NumberFormat(locale, { style: "unit", unit, unitDisplay: "short" }).format(value);
}
