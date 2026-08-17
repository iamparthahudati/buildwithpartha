import { useEffect, useState, type ReactNode } from "react";

import {
  Alert,
  ConfirmDialog,
  DetailPanel,
  Dialog,
  Drawer,
  ToastViewport,
} from "@components/feedback";
import { Button, Text, TextInput } from "@components/ui";
import { useDeepLinkParam } from "@hooks/useDeepLinkParam";
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

export function DialogDemo() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  return (
    <>
      <Button onClick={() => setOpen(true)}>Add project</Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Add project"
        description="Projects group related outcomes and Tasks."
      >
        <div className="specimen-stack">
          <TextInput
            label="Project name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <div className="specimen-row">
            <Button onClick={() => setOpen(false)}>Add project</Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

export function ConfirmDialogDemo() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [failNext, setFailNext] = useState(true);

  function handleConfirm() {
    setPending(true);
    setError(undefined);

    setTimeout(() => {
      setPending(false);
      if (failNext) {
        setError("Something went wrong. Try again.");
        setFailNext(false);
      } else {
        setOpen(false);
      }
    }, 700);
  }

  return (
    <>
      <Button
        variant="danger"
        onClick={() => {
          setError(undefined);
          setOpen(true);
        }}
      >
        Archive project
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        title={'Archive "Website refresh"?'}
        description="The Project will leave active views. Its Tasks remain available according to their current status. You can restore the Project from Archived."
        confirmLabel="Archive project"
        pending={pending}
        pendingLabel="Archiving"
        {...(error ? { error } : {})}
      />
    </>
  );
}

export function ConfirmDialogTypedDemo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Delete Label
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => setOpen(false)}
        title={'Delete Label "Learning"?'}
        description="The Label will be removed from 6 records. The records will not be deleted. This can't be undone."
        confirmLabel="Delete Label"
        typedConfirmation="Learning"
      />
    </>
  );
}

export function NestedDialogDemo() {
  const [outerOpen, setOuterOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <Button variant="danger" onClick={() => setOuterOpen(true)}>
        Delete project
      </Button>
      <Dialog
        open={outerOpen}
        onClose={() => setOuterOpen(false)}
        title={'Delete "Portfolio refresh"?'}
      >
        <div className="specimen-stack">
          <p>Its Tasks remain available according to their current status.</p>
          <div className="specimen-row">
            <Button variant="danger" onClick={() => setConfirmOpen(true)}>
              Delete project
            </Button>
            <Button variant="secondary" onClick={() => setOuterOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>

        <Dialog
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          title="This can't be undone"
          dismissible={false}
          size="sm"
        >
          <div className="specimen-stack">
            <p>
              Escape and a backdrop click are disabled here — try them, then use one of the two
              buttons below.
            </p>
            <div className="specimen-row">
              <Button
                variant="danger"
                onClick={() => {
                  setConfirmOpen(false);
                  setOuterOpen(false);
                }}
              >
                Delete permanently
              </Button>
              <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Dialog>
      </Dialog>
    </>
  );
}

export function DrawerDemo() {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");

  return (
    <>
      <Button onClick={() => setOpen(true)}>Edit notes</Button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Edit notes"
        description="Changes save automatically once you close this panel."
        isDirty={notes.trim() !== ""}
      >
        <TextInput
          label="Notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          description="Type something, then try Escape or the backdrop — the discard confirmation only appears while there is something to lose."
        />
      </Drawer>
    </>
  );
}

const TASK_FIXTURES: Readonly<Record<string, string>> = Object.freeze({
  "task-1": "Due Friday. Estimated 30 minutes.",
  "task-2": "No due date. Estimated 2 hours.",
});

/**
 * `undefined` while "loading", `null` once known not to resolve — the exact
 * three-way shape `DetailPanel` expects, produced here with a fake delay
 * standing in for a real fetch.
 */
function useFixtureTask(id: string | null): ReactNode | null | undefined {
  const [content, setContent] = useState<ReactNode | null | undefined>(undefined);

  // Reset to "loading" the instant `id` changes, adjusted during render
  // rather than in the effect below — the same pattern ConfirmDialog
  // (LOS-0413) uses, since setting state synchronously inside an effect body
  // risks a visible flash of the previous id's content first.
  const [lastId, setLastId] = useState(id);
  if (id !== lastId) {
    setLastId(id);
    setContent(undefined);
  }

  useEffect(() => {
    if (id === null) {
      return;
    }
    const timer = setTimeout(() => {
      setContent(id in TASK_FIXTURES ? <Text>{TASK_FIXTURES[id]}</Text> : null);
    }, 400);
    return () => clearTimeout(timer);
  }, [id]);

  return content;
}

export function DetailPanelDemo() {
  const { value: taskId, open, close } = useDeepLinkParam("catalog-task");
  const content = useFixtureTask(taskId);

  return (
    <div className="specimen-stack">
      <div className="specimen-row">
        <Button variant="secondary" onClick={() => open("task-1")}>
          Open "Prepare weekly review"
        </Button>
        <Button variant="secondary" onClick={() => open("task-missing")}>
          Open a deleted/inaccessible Task
        </Button>
      </div>
      <Text tone="secondary" size="sm">
        The URL's query string now reflects the open Task — reload this page or use the browser's
        own Back button and the panel stays in sync.
      </Text>

      <DetailPanel
        open={taskId !== null}
        onClose={close}
        title={taskId === "task-1" ? "Prepare weekly review" : "Task"}
        content={content}
      />
    </div>
  );
}
