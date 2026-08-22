import { AccountDeletionCancelScreen } from "@features/settings";

/**
 * CancelDeletionRoute (LOS-0603).
 * Mounts the LOS-0518 grace-period follow-up's `AccountDeletionCancelScreen`
 * at `/life-os/cancel-deletion`, per that ticket's own deferred note.
 */
export function CancelDeletionRoute() {
  return <AccountDeletionCancelScreen />;
}
