import type { ReactNode } from "react";

import { QueryClientProvider } from "@tanstack/react-query";

import { AuthSessionProvider } from "@state/AuthSessionProvider";

import { queryClient } from "./queryClient";

/**
 * AppProviders (LOS-0508).
 *
 * Composes the query client and the auth session together, in the order
 * `AuthSessionProvider`'s own contract requires: it calls `useQueryClient()`
 * internally, so it must render underneath `QueryClientProvider`.
 *
 * Not yet mounted by `main.tsx`/`App.tsx`: `App.tsx` is still LOS-0201's
 * placeholder foundation view, and real composition — the application shell,
 * routing and where a `RequireAuth`-guarded route actually lives — is
 * LOS-0603's job. This component exists now, fully tested on its own, so
 * that ticket composes it rather than re-deriving the same provider order.
 */
export interface AppProvidersProps {
  readonly children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthSessionProvider>{children}</AuthSessionProvider>
    </QueryClientProvider>
  );
}
