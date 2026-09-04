import { Alert } from "@components/feedback";
import { Button } from "@components/ui";

import {
  useServiceWorkerUpdate,
  type UseServiceWorkerUpdateOptions,
} from "../hooks/useServiceWorkerUpdate";
import "./updatePromptToast.css";

export interface UpdatePromptToastProps {
  readonly options?: UseServiceWorkerUpdateOptions | undefined;
  readonly className?: string | undefined;
}

/**
 * UpdatePromptToast (LOS-1315).
 *
 * Prompts the user when a new Service Worker / app shell version is waiting to activate.
 */
export function UpdatePromptToast({ options, className }: UpdatePromptToastProps) {
  const { isUpdateAvailable, applyUpdate, dismissUpdate } = useServiceWorkerUpdate(options);

  if (!isUpdateAvailable) {
    return null;
  }

  return (
    <div
      className={["lifeos-update-prompt-toast", className].filter(Boolean).join(" ")}
      role="region"
      aria-label="Application update"
    >
      <Alert
        tone="info"
        heading="New version available"
        announce="status"
        onDismiss={dismissUpdate}
        dismissLabel="Dismiss update notification"
        action={
          <Button size="sm" variant="primary" onClick={applyUpdate}>
            Update now
          </Button>
        }
      >
        A new version of LifeOS is ready. Update now to load the latest app shell.
      </Alert>
    </div>
  );
}
