/**
 * Non-sensitive device preference storage for sidebar collapse state (LOS-0601).
 *
 * Persists purely presentation/layout preference per device without storing
 * sensitive user or session data.
 */

export const SIDEBAR_COLLAPSED_STORAGE_KEY = "lifeos:sidebar:collapsed";

/**
 * Safely reads the persisted collapse preference.
 * Returns false if unavailable, running SSR, or storage access throws.
 */
export function getStoredSidebarCollapsed(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const raw = window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
    return raw === "true";
  } catch {
    return false;
  }
}

/**
 * Safely updates the persisted collapse preference.
 * Silently handles exceptions when localStorage is disabled or restricted.
 */
export function setStoredSidebarCollapsed(collapsed: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(collapsed));
  } catch {
    // Graceful fallback when localStorage is blocked or throws
  }
}
