/**
 * Whether "Back" can safely mean the browser's own history (LOS-0417).
 *
 * A pure function, same reasoning as `breadcrumbsCollapse.ts`/`menuPosition.ts`:
 * testable without touching `window.history` or `document.referrer` directly.
 *
 * `history.back()` is only safe when the page was actually reached from
 * somewhere else inside this app. A page opened directly — a bookmark, a
 * typed URL, a shared link, a new tab — has no in-app history to return to;
 * calling it there either does nothing or leaves the browser on whatever
 * came before the app entirely, which is not "back" from the user's point of
 * view. `document.referrer` being same-origin is what distinguishes the two:
 * it is set by the browser itself on real in-app navigation and empty (or a
 * different origin) otherwise, so nothing here has to track navigation state
 * of its own the way a router eventually would.
 */
export function canGoBackWithinApp(referrer: string, currentOrigin: string): boolean {
  if (referrer === "") {
    return false;
  }

  try {
    return new URL(referrer).origin === currentOrigin;
  } catch {
    return false;
  }
}
