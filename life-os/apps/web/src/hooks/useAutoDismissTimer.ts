import { useCallback, useEffect, useRef } from "react";

/**
 * A countdown that can be paused and resumed without losing its remaining
 * time (LOS-0409).
 *
 * Built for `Toast`'s auto-dismiss, but not toast-specific: anything that
 * counts down and must stop counting while the user is looking at it —
 * WCAG 2.2.1 requires exactly this for any timing that isn't essential —
 * needs the same shape. A naive pause that just clears the timer and a naive
 * resume that just starts a fresh one of the same length both break the
 * promise "pause" makes: the first loses no time (it never expires), the
 * second forgets how much time had already elapsed. This tracks the
 * remainder explicitly so a resume picks up where the pause left off.
 *
 * `durationMs: null` never starts a timer at all — the persistent-toast case,
 * for a message that should only close when its own dismiss control is used.
 *
 * `resetToken` restarts the countdown at its full length whenever it changes,
 * independently of `durationMs`. A refreshed toast (the same notification
 * pushed again while it is still showing) needs a full restart even when its
 * duration is the same 6 seconds it always was — comparing only `durationMs`
 * would see no change and let the old, already-elapsed countdown keep
 * running.
 */
export function useAutoDismissTimer(
  durationMs: number | null,
  onExpire: () => void,
  resetToken?: unknown,
): {
  readonly pause: () => void;
  readonly resume: () => void;
} {
  const remainingRef = useRef(durationMs ?? 0);
  const startedAtRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Kept current without retriggering the reset effect below on every
  // caller re-render — only a real duration or reset-token change should
  // restart the countdown.
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  const stop = useCallback(() => {
    if (timerRef.current !== undefined) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const pause = useCallback(() => {
    if (durationMs === null || startedAtRef.current === null) {
      return;
    }
    stop();
    remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startedAtRef.current));
    startedAtRef.current = null;
  }, [durationMs, stop]);

  const resume = useCallback(() => {
    if (durationMs === null || timerRef.current !== undefined) {
      return;
    }
    startedAtRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      timerRef.current = undefined;
      onExpireRef.current();
    }, remainingRef.current);
  }, [durationMs]);

  useEffect(() => {
    remainingRef.current = durationMs ?? 0;
    startedAtRef.current = null;
    stop();
    resume();
    return stop;
  }, [durationMs, resetToken, resume, stop]);

  return { pause, resume };
}
