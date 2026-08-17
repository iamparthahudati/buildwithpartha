import { useCallback, useEffect, useRef, type CompositionEvent, type KeyboardEvent } from "react";

/**
 * The debounce/submit/IME mechanics behind `SearchField` (LOS-0402), kept as
 * its own hook so the timing logic is testable with fake timers independent
 * of any markup, and reusable by a future control that wants the same
 * trigger behaviour with a different visual shape (a command palette's
 * search field, LOS-0426, is the obvious candidate).
 *
 * `value` is owned by the caller, exactly like every other LifeOS field —
 * this hook only decides *when* to call `onSearch` for the value that
 * already exists, never what the value is.
 */

export type SearchFieldMode = "debounced" | "submit";

export interface UseSearchFieldOptions {
  readonly mode?: SearchFieldMode;
  /** Quiet time after the last keystroke before a debounced search fires. */
  readonly debounceMs?: number;
  readonly onSearch: (query: string) => void;
}

export interface UseSearchFieldResult {
  /** Fires `onSearch` immediately and cancels any pending debounce. */
  readonly submit: () => void;
  /** Spread onto the field: tracks IME composition and Enter-to-submit. */
  readonly fieldProps: {
    readonly onCompositionStart: () => void;
    readonly onCompositionEnd: (event: CompositionEvent<HTMLInputElement>) => void;
    readonly onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  };
}

const DEFAULT_DEBOUNCE_MS = 300;

export function useSearchField(
  value: string,
  options: UseSearchFieldOptions,
): UseSearchFieldResult {
  const { mode = "debounced", debounceMs = DEFAULT_DEBOUNCE_MS, onSearch } = options;

  // A ref, not state: composing is read inside a timer callback and an event
  // handler, neither of which should cause or wait for a re-render.
  const composingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const clearPending = useCallback(() => {
    if (timerRef.current !== undefined) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const submit = useCallback(() => {
    clearPending();
    onSearch(value);
  }, [clearPending, onSearch, value]);

  useEffect(() => {
    if (mode !== "debounced") {
      return;
    }

    // A composing IME sends intermediate, not-yet-real characters through
    // `value` on every keystroke; searching on one of those would be
    // searching for text the user never actually typed. The composition ends
    // with one more committed value change, which this effect re-runs for
    // once `composingRef.current` is already false — so nothing is lost,
    // only delayed until there is a real value to search for.
    if (composingRef.current) {
      return;
    }

    timerRef.current = setTimeout(() => {
      timerRef.current = undefined;
      onSearch(value);
    }, debounceMs);

    return clearPending;
  }, [value, mode, debounceMs, onSearch, clearPending]);

  // Unmounting mid-debounce must not fire a search into a component that no
  // longer exists to receive it.
  useEffect(() => clearPending, [clearPending]);

  const handleCompositionStart = useCallback(() => {
    composingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback(() => {
    composingRef.current = false;
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      // Not Escape: clearing/closing on Escape is the field's own concern,
      // and Enter should also work as an override in debounced mode, so a
      // user who does not want to wait for the pause can submit immediately.
      if (event.key === "Enter") {
        submit();
      }
    },
    [submit],
  );

  return {
    submit,
    fieldProps: {
      onCompositionStart: handleCompositionStart,
      onCompositionEnd: handleCompositionEnd,
      onKeyDown: handleKeyDown,
    },
  };
}
