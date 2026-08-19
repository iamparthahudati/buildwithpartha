import { useSyncExternalStore } from "react";

/**
 * useMediaQuery (LOS-0603).
 *
 * The single JS/CSS breakpoint bridge the application shell needs: `Sidebar`
 * (LOS-0601) has no built-in responsive behavior of its own — `drawer` is a
 * caller-chosen mode, not something it infers from viewport width — so
 * `AppShell` needs a real answer to "is this a mobile viewport" to decide
 * which mode to render it in. `useSyncExternalStore` (rather than a
 * `useState`/`useEffect` pair) is the idiomatic subscription to an external
 * browser API like `matchMedia`: the value is correct on every render,
 * including the first, with no separate effect re-sync step.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mediaQueryList = window.matchMedia(query);
      mediaQueryList.addEventListener("change", onChange);
      return () => mediaQueryList.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
