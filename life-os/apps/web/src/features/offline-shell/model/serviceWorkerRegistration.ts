/**
 * Service Worker Registration and Cache Management (LOS-1315).
 */

export const STATIC_CACHE_PREFIX = "lifeos-shell-";

export interface RegisterServiceWorkerOptions {
  readonly scriptUrl?: string | undefined;
  readonly scope?: string | undefined;
  readonly onUpdateFound?: ((registration: ServiceWorkerRegistration) => void) | undefined;
}

/**
 * Registers the LifeOS service worker in environments supporting navigator.serviceWorker.
 */
export async function registerServiceWorker(
  options: RegisterServiceWorkerOptions = {},
): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !navigator?.serviceWorker) {
    return null;
  }

  const scriptUrl =
    options.scriptUrl ?? `${import.meta.env.VITE_APP_BASE_PATH.replace(/\/$/, "")}/sw.js`;
  const scope = options.scope ?? import.meta.env.VITE_APP_BASE_PATH;

  try {
    const registration = await navigator.serviceWorker.register(scriptUrl, { scope });

    registration.addEventListener("updatefound", () => {
      options.onUpdateFound?.(registration);
    });

    return registration;
  } catch (error) {
    console.warn("Service worker registration failed:", error);
    return null;
  }
}

/**
 * Unregisters any active LifeOS service workers.
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (typeof window === "undefined" || !navigator?.serviceWorker) {
    return false;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const unregisterPromises = registrations.map((registration) => registration.unregister());
    const results = await Promise.all(unregisterPromises);
    return results.some(Boolean);
  } catch (error) {
    console.warn("Failed to unregister service workers:", error);
    return false;
  }
}

/**
 * Clears all versioned static shell caches (e.g. on logout or account switch).
 */
export async function clearShellCaches(): Promise<boolean> {
  if (typeof window === "undefined" || !window?.caches) {
    return false;
  }

  try {
    const keys = await caches.keys();
    const shellKeys = keys.filter((key) => key.startsWith(STATIC_CACHE_PREFIX));
    const deletePromises = shellKeys.map((key) => caches.delete(key));
    const results = await Promise.all(deletePromises);
    return results.every(Boolean);
  } catch (error) {
    console.warn("Failed to clear shell caches:", error);
    return false;
  }
}
