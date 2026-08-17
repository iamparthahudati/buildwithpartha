import { createContext, useContext } from "react";

import type { MessageTone } from "@components/ui";

/**
 * The Toast queue's shared shape (LOS-0409).
 *
 * Kept apart from `ToastProvider.tsx` so this file exports only types/data and
 * that one only its component, the same reason `dividerListContext.ts` and
 * `formFieldRegistry.ts` sit apart from the components that read them.
 */

export interface ToastEntry {
  readonly id: string;
  readonly tone: MessageTone;
  readonly heading?: string;
  readonly message: string;
  /** `null` is a persistent toast: it never auto-dismisses. */
  readonly durationMs: number | null;
  /** Bumped on every push, including a refresh, so a consumer's countdown can tell a refresh from an unrelated re-render even when the duration itself is unchanged. */
  readonly updatedAt: number;
}

export interface ToastOptions {
  readonly tone: MessageTone;
  readonly heading?: string;
  readonly message: string;
  /**
   * Reusing an `id` refreshes the existing toast — resets its countdown and
   * replaces its content — instead of stacking a duplicate. Defaults to
   * `${tone}:${message}`, so two pushes of the identical notification dedupe
   * on their own even when the caller never names an id.
   */
  readonly id?: string;
  /** Milliseconds before auto-dismiss. `null` is the persistent, critical-error case. Defaults to 6000. */
  readonly durationMs?: number | null;
}

export interface ToastQueueState {
  readonly visible: readonly ToastEntry[];
  /** Waiting for a slot once `visible` is at its cap — the literal "queued" in the ticket's name. */
  readonly pending: readonly ToastEntry[];
}

export interface ToastQueueContextValue extends ToastQueueState {
  /** Returns the entry's id, useful for dismissing it later by hand. */
  readonly push: (options: ToastOptions) => string;
  readonly dismiss: (id: string) => void;
}

export const ToastQueueContext = createContext<ToastQueueContextValue | undefined>(undefined);

/**
 * The one way application code pushes a toast. Throws outside a
 * `ToastProvider` rather than silently doing nothing, the same reasoning
 * `IconButton`'s required `label` uses a type error instead of a review
 * comment: a toast nobody can see is a bug worth surfacing immediately.
 */
export function useToast(): ToastQueueContextValue {
  const value = useContext(ToastQueueContext);
  if (value === undefined) {
    throw new Error("useToast must be used within a ToastProvider.");
  }
  return value;
}
