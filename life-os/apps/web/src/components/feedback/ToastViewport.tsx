import { useToast } from "@state/toastQueue";

import { Toast } from "./Toast";
import "./toast-viewport.css";

/**
 * ToastViewport (LOS-0409): renders the current queue from `ToastProvider`.
 *
 * Mounted once, wherever the app wants its toast stack to sit — separate from
 * the provider so an app can decide that placement without touching where the
 * provider itself wraps the tree.
 *
 * A named landmark rather than a live region on the whole stack: each `Toast`
 * already announces itself individually through `Alert`'s own role, and an
 * outer `aria-live` region here would announce every entry a second time —
 * exactly the duplicate-announcement failure LOS-0408 named.
 */
export function ToastViewport() {
  const { visible, dismiss } = useToast();

  if (visible.length === 0) {
    return null;
  }

  return (
    <div className="lifeos-toast-viewport" role="region" aria-label="Notifications">
      {visible.map((entry) => (
        <Toast key={entry.id} entry={entry} onDismiss={dismiss} />
      ))}
    </div>
  );
}
