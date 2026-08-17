import { useCallback, useReducer, type ReactNode } from "react";

import {
  ToastQueueContext,
  type ToastEntry,
  type ToastOptions,
  type ToastQueueState,
} from "./toastQueue";

/**
 * ToastProvider (LOS-0409).
 *
 * Owns the queue; `ToastViewport` (`@components/feedback`) is what actually
 * renders it. Kept separate so an app can mount the provider once near its
 * root while deciding independently where the visible stack should sit —
 * the same split every toast library of this shape uses.
 *
 * `maxVisible` is the literal "queued" in the ticket: past that many at once,
 * a new toast waits in `pending` rather than crowding the screen, and is
 * promoted the moment a slot opens up.
 */

const DEFAULT_DURATION_MS = 6000;
const DEFAULT_MAX_VISIBLE = 3;

type Action =
  | { readonly type: "push"; readonly entry: ToastEntry }
  | { readonly type: "dismiss"; readonly id: string };

function reducer(state: ToastQueueState, action: Action, maxVisible: number): ToastQueueState {
  switch (action.type) {
    case "push": {
      const { entry } = action;

      // A refresh replaces the existing entry in place — same slot, same
      // position — rather than being treated as a new arrival.
      const visibleIndex = state.visible.findIndex((candidate) => candidate.id === entry.id);
      if (visibleIndex !== -1) {
        const visible = [...state.visible];
        visible[visibleIndex] = entry;
        return { visible, pending: state.pending };
      }

      const pendingIndex = state.pending.findIndex((candidate) => candidate.id === entry.id);
      if (pendingIndex !== -1) {
        const pending = [...state.pending];
        pending[pendingIndex] = entry;
        return { visible: state.visible, pending };
      }

      if (state.visible.length < maxVisible) {
        return { visible: [...state.visible, entry], pending: state.pending };
      }
      return { visible: state.visible, pending: [...state.pending, entry] };
    }

    case "dismiss": {
      const wasVisible = state.visible.some((entry) => entry.id === action.id);
      const visible = state.visible.filter((entry) => entry.id !== action.id);
      const pending = state.pending.filter((entry) => entry.id !== action.id);

      // A freed slot is filled from the front of the queue — first waited,
      // first shown.
      if (wasVisible && visible.length < maxVisible && pending.length > 0) {
        const [promoted, ...stillPending] = pending;
        return { visible: [...visible, promoted as ToastEntry], pending: stillPending };
      }
      return { visible, pending };
    }

    default:
      return state;
  }
}

export interface ToastProviderProps {
  readonly children: ReactNode;
  readonly maxVisible?: number;
}

export function ToastProvider({ children, maxVisible = DEFAULT_MAX_VISIBLE }: ToastProviderProps) {
  const [state, dispatch] = useReducer(
    (current: ToastQueueState, action: Action) => reducer(current, action, maxVisible),
    { visible: [], pending: [] },
  );

  const push = useCallback(
    (options: ToastOptions): string => {
      const id = options.id ?? `${options.tone}:${options.message}`;
      dispatch({
        type: "push",
        entry: {
          id,
          tone: options.tone,
          ...(options.heading === undefined ? {} : { heading: options.heading }),
          message: options.message,
          durationMs: options.durationMs === undefined ? DEFAULT_DURATION_MS : options.durationMs,
          updatedAt: Date.now(),
        },
      });
      return id;
    },
    [dispatch],
  );

  const dismiss = useCallback((id: string) => dispatch({ type: "dismiss", id }), [dispatch]);

  return (
    <ToastQueueContext value={{ visible: state.visible, pending: state.pending, push, dismiss }}>
      {children}
    </ToastQueueContext>
  );
}
