import { useEffect, useRef } from "react";

import { useAutoDismissTimer } from "@hooks/useAutoDismissTimer";
import type { ToastEntry } from "@state/toastQueue";

import { Alert } from "./Alert";
import "./toast.css";

/**
 * Toast (LOS-0409): one entry from the queue, rendered.
 *
 * Composes `Alert` rather than redrawing its own box, icon and dismiss
 * button — a toast is an `Alert` plus timing, not a different visual
 * language. Unlike a general `Alert`, a toast is *always* a reaction to
 * something that just happened (nobody renders one as static page content,
 * which is what `Alert` itself is for), so it always announces — the tone
 * decides how urgently, the same info/success → polite, warning/danger →
 * assertive split the rest of the product uses.
 */

const ASSERTIVE_TONES = new Set<ToastEntry["tone"]>(["warning", "danger"]);

export interface ToastProps {
  readonly entry: ToastEntry;
  readonly onDismiss: (id: string) => void;
  readonly dismissLabel?: string;
}

export function Toast({ entry, onDismiss, dismissLabel = "Dismiss notification" }: ToastProps) {
  // Tracks whether the pointer or focus is currently on this toast, so a
  // refresh arriving mid-hover restarts the countdown paused rather than
  // running — the timer hook restarts unconditionally on `resetToken`, and it
  // has no way to know the pointer never left.
  const pausedRef = useRef(false);

  const { pause, resume } = useAutoDismissTimer(
    entry.durationMs,
    () => onDismiss(entry.id),
    entry.updatedAt,
  );

  // The timer hook always resumes on a reset; if the pointer or focus never
  // actually left, that resumption is wrong and is corrected here.
  useEffect(() => {
    if (pausedRef.current) {
      pause();
    }
  }, [entry.updatedAt, pause]);

  return (
    <div
      className="lifeos-toast"
      onPointerEnter={() => {
        pausedRef.current = true;
        pause();
      }}
      onPointerLeave={() => {
        pausedRef.current = false;
        resume();
      }}
      onFocus={() => {
        pausedRef.current = true;
        pause();
      }}
      onBlur={() => {
        pausedRef.current = false;
        resume();
      }}
    >
      <Alert
        tone={entry.tone}
        {...(entry.heading === undefined ? {} : { heading: entry.heading })}
        onDismiss={() => onDismiss(entry.id)}
        dismissLabel={dismissLabel}
        announce={ASSERTIVE_TONES.has(entry.tone) ? "alert" : "status"}
      >
        {entry.message}
      </Alert>
    </div>
  );
}
