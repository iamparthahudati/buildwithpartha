import { QueryClient } from "@tanstack/react-query";

/**
 * The one `QueryClient` for the application (LOS-0508), added to fulfil
 * `02-ARCHITECTURE.md`'s "TanStack Query owns server state and caching" rule
 * now that a real caller — clearing the cache on logout/account change —
 * needs one. No domain query/mutation hooks exist yet; those arrive with
 * each domain's own tickets and inherit these defaults rather than each
 * re-deciding retry/staleness behavior.
 *
 * Engineering defaults, not a reviewed product requirement: one retry for a
 * failed query (transient network blips are common, a broken endpoint should
 * still fail fast) and none for a mutation (retrying a create/update blind
 * risks a duplicate side effect unless a future ticket adds an idempotency
 * key, `02-ARCHITECTURE.md`'s "Idempotency keys protect retried create
 * operations").
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});
