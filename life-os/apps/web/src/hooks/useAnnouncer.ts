import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Coalesces status messages so a live region cannot be spammed (LOS-0327).
 *
 * The failure this exists to prevent is specific: a value that updates often —
 * a running timer, a save-on-keystroke indicator, a list refreshing behind a
 * filter — writes to a live region every time it changes, and a screen-reader
 * user hears a stream of interruptions with no way to stop it. The tone guide
 * forbids announcing timer ticks and every autosave for exactly this reason.
 *
 * The first announcement is published immediately, because the first one is
 * usually the meaningful one. Anything arriving inside the quiet window is
 * held, and only the newest survives it — the user hears where things ended
 * up, not every step on the way.
 */

const DEFAULT_QUIET_WINDOW_MS = 500;

export interface Announcer {
  /** The message to render inside a live region. */
  readonly message: string;
  readonly announce: (message: string) => void;
  /** Empties the region, e.g. when the work it described is over. */
  readonly clear: () => void;
}

export function useAnnouncer(quietWindowMs: number = DEFAULT_QUIET_WINDOW_MS): Announcer {
  const [message, setMessage] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pendingRef = useRef<string | undefined>(undefined);

  const stopTimer = useCallback(() => {
    if (timerRef.current !== undefined) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  // A pending announcement must not fire after the component has gone.
  useEffect(() => stopTimer, [stopTimer]);

  const openQuietWindow = useCallback(
    function openWindow() {
      timerRef.current = setTimeout(() => {
        timerRef.current = undefined;
        const held = pendingRef.current;
        pendingRef.current = undefined;

        if (held !== undefined) {
          setMessage(held);
          // Something was held, so the window reopens: a burst that keeps
          // arriving must stay throttled rather than draining one per tick.
          openWindow();
        }
      }, quietWindowMs);
    },
    [quietWindowMs],
  );

  const announce = useCallback(
    (next: string) => {
      if (timerRef.current !== undefined) {
        pendingRef.current = next;
        return;
      }

      setMessage(next);
      openQuietWindow();
    },
    [openQuietWindow],
  );

  const clear = useCallback(() => {
    stopTimer();
    pendingRef.current = undefined;
    setMessage("");
  }, [stopTimer]);

  return { message, announce, clear };
}
