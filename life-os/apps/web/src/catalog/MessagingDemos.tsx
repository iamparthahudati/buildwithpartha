import { useEffect, useState, type ReactNode } from "react";
import { FolderKanban, ListTodo, Plus } from "lucide-react";

import {
  Alert,
  CommandPalette,
  ConfirmDialog,
  DetailPanel,
  Dialog,
  Drawer,
  FormDialog,
  ToastViewport,
  useCommandPaletteShortcut,
  type CommandPaletteGroup,
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

export function FormDialogDemo() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [failNext, setFailNext] = useState(true);

  function handleSubmit() {
    setPending(true);
    setError(undefined);

    setTimeout(() => {
      setPending(false);
      if (failNext) {
        setError('A project named "' + name + '" already exists.');
        setFailNext(false);
      } else {
        setOpen(false);
        setName("");
        setFailNext(true);
      }
    }, 700);
  }

  return (
    <>
      <Button
        onClick={() => {
          setError(undefined);
          setOpen(true);
        }}
      >
        Add project
      </Button>
      <FormDialog
        open={open}
        onClose={() => {
          setOpen(false);
          setName("");
        }}
        onSubmit={handleSubmit}
        title="Add project"
        description="Projects group related outcomes and Tasks."
        submitLabel="Add project"
        isDirty={name.trim() !== ""}
        pending={pending}
        pendingLabel="Adding"
        {...(error ? { error } : {})}
      >
        <TextInput
          label="Project name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          description="Try Escape or the backdrop once you've typed something, then submit to see the first attempt fail before a retry succeeds."
        />
      </FormDialog>
    </>
  );
}

interface CommandPaletteDatum {
  readonly id: string;
  readonly label: string;
  readonly icon: typeof FolderKanban;
  readonly shortcut?: string;
  readonly disabled?: boolean;
}

const COMMAND_PALETTE_DATA: readonly {
  readonly id: string;
  readonly heading: string;
  readonly items: readonly CommandPaletteDatum[];
}[] = [
  {
    id: "projects",
    heading: "Projects",
    items: [
      { id: "project-kitchen", label: "Kitchen remodel", icon: FolderKanban },
      { id: "project-home", label: "Home records cleanup", icon: FolderKanban },
      { id: "project-learning", label: "Learning plan", icon: FolderKanban },
      { id: "project-archived", label: "Archived plan", icon: FolderKanban, disabled: true },
    ],
  },
  {
    id: "actions",
    heading: "Actions",
    items: [
      { id: "action-new-task", label: "New task", icon: Plus, shortcut: "⌘N" },
      { id: "action-new-project", label: "New project", icon: FolderKanban, shortcut: "⌘⇧N" },
      { id: "action-view-tasks", label: "View all tasks", icon: ListTodo },
    ],
  },
];

export function CommandPaletteDemo() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [committedQuery, setCommittedQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  // Cmd/Ctrl+K opens this from anywhere on the page, including while typing
  // in the "Project name" field of the FormDialog demo above.
  useCommandPaletteShortcut(() => setOpen(true));

  function handleSearch(nextQuery: string) {
    setLoading(true);
    setTimeout(() => {
      setCommittedQuery(nextQuery);
      setLoading(false);
    }, 300);
  }

  const needle = committedQuery.trim().toLowerCase();
  const groups: readonly CommandPaletteGroup[] = COMMAND_PALETTE_DATA.map((group) => ({
    id: group.id,
    heading: group.heading,
    items: group.items
      .filter((item) => needle === "" || item.label.toLowerCase().includes(needle))
      .map((item) => ({
        id: item.id,
        label: item.label,
        icon: item.icon,
        ...(item.shortcut ? { shortcut: item.shortcut } : {}),
        ...(item.disabled ? { disabled: true } : {}),
        onSelect: () => setSelected(item.label),
      })),
  }));

  return (
    <>
      <Button
        onClick={() => {
          setQuery("");
          setCommittedQuery("");
          setOpen(true);
        }}
      >
        Open command palette
      </Button>
      <Text size="xs" tone="secondary">
        Or press ⌘K / Ctrl+K, even from inside another field on this page.
        {selected ? ` Last selected: "${selected}".` : ""}
      </Text>
      <CommandPalette
        open={open}
        onClose={() => setOpen(false)}
        query={query}
        onQueryChange={setQuery}
        onSearch={handleSearch}
        groups={groups}
        loading={loading}
        placeholder="Search projects or run a command…"
      />
    </>
  );
}
