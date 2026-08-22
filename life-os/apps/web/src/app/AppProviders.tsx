import type { ReactNode } from "react";

import { QueryClientProvider } from "@tanstack/react-query";

import { AuthSessionProvider } from "@state/AuthSessionProvider";
import { ToastProvider } from "@state/ToastProvider";

import { queryClient } from "./queryClient";

/**
 * AppProviders (LOS-0508, extended by LOS-0603).
 *
 * Composes every provider `AppRouter`'s tree needs, in the order each one's
 * own contract requires: `AuthSessionProvider` calls `useQueryClient()`
 * internally, so it must render underneath `QueryClientProvider`.
 * `ToastProvider` (LOS-0409) only owns the toast queue's state — nothing
 * mounted it anywhere before this ticket, since `ToastViewport` (the surface
 * that actually renders it) had nowhere to live until `AppShell` existed to
 * host it. Ordered outermost here since toasts are meant to survive an
 * account switch/logout, unlike the query cache and session `AuthSession`
 * already clears on those events.
 */
export interface AppProvidersProps {
  readonly children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ToastProvider>
      <QueryClientProvider client={queryClient}>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </QueryClientProvider>
    </ToastProvider>
  );
}
