import { Alert, ToastViewport } from "@components/feedback";
import { Button } from "@components/ui";
import { ToastProvider } from "@state/ToastProvider";
import { useToast } from "@state/toastQueue";

/**
 * Interactive demos for the messaging catalog entries. Live apart from the
 * entry registry so that file exports only data and this one only
 * components, which keeps React Fast Refresh working.
 */

function ToastButtons() {
  const { push } = useToast();

  return (
    <div className="specimen-row">
      <Button variant="secondary" onClick={() => push({ tone: "success", message: "Task added." })}>
        Push success
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          push({ tone: "danger", message: "We couldn't save this Task.", durationMs: null })
        }
      >
        Push persistent error
      </Button>
      <Button
        variant="secondary"
        onClick={() => push({ tone: "info", message: "Syncing…", id: "sync" })}
      >
        Push (dedupes on repeat)
      </Button>
    </div>
  );
}

export function ToastDemo() {
  return (
    <ToastProvider maxVisible={2}>
      <div className="specimen-stack">
        <ToastButtons />
        <Alert tone="info">
          Toasts are pinned to the corner of the whole page, not scoped to this specimen — that is
          how a real toast behaves. A third at once queues until one of the first two is dismissed
          or times out; pushing the dedupe button again refreshes the same toast instead of stacking
          a duplicate.
        </Alert>
      </div>
      <ToastViewport />
    </ToastProvider>
  );
}
