import { useCallback, useEffect, useState } from "react";

import { registerServiceWorker } from "../model/serviceWorkerRegistration";

export interface UseServiceWorkerUpdateOptions {
  readonly enabled?: boolean | undefined;
  readonly scriptUrl?: string | undefined;
  readonly scope?: string | undefined;
  readonly onUpdateAvailable?: (() => void) | undefined;
}

export interface UseServiceWorkerUpdateResult {
  readonly isUpdateAvailable: boolean;
  readonly registration: ServiceWorkerRegistration | null;
  readonly applyUpdate: () => void;
  readonly dismissUpdate: () => void;
}

export function useServiceWorkerUpdate(
  options: UseServiceWorkerUpdateOptions = {},
): UseServiceWorkerUpdateResult {
  const enabled = options.enabled ?? true;
  const { scriptUrl, scope, onUpdateAvailable } = options;
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState<boolean>(false);

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    let cancelled = false;

    void registerServiceWorker({
      scriptUrl,
      scope,
      onUpdateFound: (reg) => {
        const installingWorker = reg.installing;
        if (!installingWorker) {
          return;
        }

        installingWorker.addEventListener("statechange", () => {
          if (
            installingWorker.state === "installed" &&
            navigator.serviceWorker.controller &&
            !cancelled
          ) {
            setIsUpdateAvailable(true);
            onUpdateAvailable?.();
          }
        });
      },
    }).then((reg) => {
      if (cancelled || !reg) {
        return;
      }
      setRegistration(reg);

      if (reg.waiting && navigator.serviceWorker.controller) {
        setIsUpdateAvailable(true);
        onUpdateAvailable?.();
      }
    });

    const handleControllerChange = () => {
      window.location.reload();
    };

    navigator.serviceWorker?.addEventListener("controllerchange", handleControllerChange);

    return () => {
      cancelled = true;
      navigator.serviceWorker?.removeEventListener("controllerchange", handleControllerChange);
    };
  }, [enabled, scriptUrl, scope, onUpdateAvailable]);

  const applyUpdate = useCallback(() => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
  }, [registration]);

  const dismissUpdate = useCallback(() => {
    setIsUpdateAvailable(false);
  }, []);

  return {
    isUpdateAvailable,
    registration,
    applyUpdate,
    dismissUpdate,
  };
}
