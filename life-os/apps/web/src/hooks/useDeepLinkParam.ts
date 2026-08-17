import { useCallback, useEffect, useState } from "react";

/**
 * Syncs one value with a URL query parameter, using the History API directly
 * rather than a router (LOS-0414).
 *
 * No routing library is wired into LifeOS yet — `routes/index.ts` is still
 * the reserved placeholder LOS-0201 left it as. `history.pushState` and the
 * `popstate` event are the primitive any router eventually sits on top of,
 * so building on them directly gives `DetailPanel` a real, working deep link
 * today: the URL genuinely changes, a copied link genuinely reopens the same
 * record, and the browser's own Back button genuinely closes the panel —
 * without inventing a second, throwaway navigation model this hook would
 * have to be rewritten away from once real routing lands.
 *
 * `close` calls `history.back()` rather than pushing a new "removed" state.
 * `open` pushes exactly one entry, so closing is stepping back off it —
 * which is also what makes the browser's own Back button behave identically
 * to clicking the panel's own close control, the ticket's "stable close/back
 * behavior".
 */

function readParam(paramName: string): string | null {
  return new URLSearchParams(window.location.search).get(paramName);
}

export interface DeepLinkParam {
  readonly value: string | null;
  readonly open: (value: string) => void;
  readonly close: () => void;
}

export function useDeepLinkParam(paramName: string): DeepLinkParam {
  const [value, setValue] = useState<string | null>(() => readParam(paramName));

  useEffect(() => {
    function handlePopState() {
      setValue(readParam(paramName));
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [paramName]);

  const open = useCallback(
    (nextValue: string) => {
      const url = new URL(window.location.href);
      url.searchParams.set(paramName, nextValue);
      window.history.pushState({}, "", url);
      setValue(nextValue);
    },
    [paramName],
  );

  const close = useCallback(() => {
    if (readParam(paramName) === null) {
      return;
    }
    window.history.back();
  }, [paramName]);

  return { value, open, close };
}
