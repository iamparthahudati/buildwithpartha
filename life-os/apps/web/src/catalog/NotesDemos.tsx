import { useState } from "react";
import { NoteCard, NoteForm, type Note, type NoteAutosaveStatus } from "@features/notes";

const MOCK_NOTE: Note = {
  id: "note-1",
  userId: "user-1",
  title: "Building Notes list/editor components",
  body: "This is a detailed acceptance note covering the implementation of NoteCard, filters, title/body editor, autosave status, labels/links, pin/archive/delete, long text, conflict/offline drafts, and mobile layout.",
  pinned: false,
  archived: false,
  createdAt: "2026-08-20T10:00:00Z",
  updatedAt: "2026-08-20T12:00:00Z",
  labelIds: ["label-1"],
  links: [
    {
      id: "link-1",
      noteId: "note-1",
      userId: "user-1",
      targetType: "PROJECT",
      targetId: "proj-1",
      createdAt: "2026-08-20T12:00:00Z",
    },
  ],
  version: 1,
};

const MOCK_LABELS = [
  { id: "label-1", name: "Engineering" },
  { id: "label-2", name: "Work" },
  { id: "label-3", name: "Personal" },
];

const MOCK_PROJECTS = [{ id: "proj-1", title: "LifeOS Phase 2" }];
const MOCK_TASKS = [{ id: "task-1", title: "Complete Note integration" }];
const MOCK_GOALS = [{ id: "goal-1", title: "Deliver EPIC-12 on time" }];

export function NoteCardDemo() {
  const [pinnedNote, setPinnedNote] = useState({ ...MOCK_NOTE, pinned: true });
  const [defaultNote, setDefaultNote] = useState(MOCK_NOTE);
  const [archivedNote, setArchivedNote] = useState({ ...MOCK_NOTE, archived: true });

  const resolvedLinks = [
    {
      id: "link-1",
      targetType: "PROJECT" as const,
      targetId: "proj-1",
      title: "LifeOS Phase 2",
      href: "#",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 640 }}>
      <div>
        <h3>Pinned Note</h3>
        <NoteCard
          note={pinnedNote}
          labels={MOCK_LABELS}
          resolvedLinks={resolvedLinks}
          onPinToggle={() => setPinnedNote((curr) => ({ ...curr, pinned: !curr.pinned }))}
        />
      </div>

      <div>
        <h3>Default Note</h3>
        <NoteCard
          note={defaultNote}
          labels={MOCK_LABELS}
          resolvedLinks={resolvedLinks}
          onPinToggle={() => setDefaultNote((curr) => ({ ...curr, pinned: !curr.pinned }))}
          onArchiveToggle={() => setDefaultNote((curr) => ({ ...curr, archived: !curr.archived }))}
          onDelete={() => alert("Delete clicked")}
        />
      </div>

      <div>
        <h3>Archived Note</h3>
        <NoteCard
          note={archivedNote}
          labels={MOCK_LABELS}
          resolvedLinks={resolvedLinks}
          onArchiveToggle={() => setArchivedNote((curr) => ({ ...curr, archived: !curr.archived }))}
        />
      </div>
    </div>
  );
}

export function NoteFormDemo() {
  const [autosaveStatus, setAutosaveStatus] = useState<NoteAutosaveStatus>({ type: "idle" });
  const [isOnline, setIsOnline] = useState(true);

  const handleSubmit = (_data: any) => {
    setAutosaveStatus({ type: "saving" });
    setTimeout(() => {
      setAutosaveStatus({ type: "saved" });
    }, 1000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, maxWidth: 800 }}>
      <div>
        <div style={{ display: "flex", gap: 16, marginBottom: 16, alignItems: "center" }}>
          <h3>Interactive Note Editor</h3>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
            <input
              type="checkbox"
              checked={isOnline}
              onChange={(e) => setIsOnline(e.target.checked)}
            />
            Simulate Online
          </label>
        </div>
        <NoteForm
          note={MOCK_NOTE}
          isOnline={isOnline}
          status={autosaveStatus}
          labels={MOCK_LABELS}
          availableProjects={MOCK_PROJECTS}
          availableTasks={MOCK_TASKS}
          availableGoals={MOCK_GOALS}
          onSubmit={handleSubmit}
          onCancel={() => alert("Cancel clicked")}
        />
      </div>

      <div>
        <h3>Version Conflict Recovery Specimen</h3>
        <NoteForm
          note={MOCK_NOTE}
          status={{ type: "conflict", message: "Stale version: note changed elsewhere." }}
          labels={MOCK_LABELS}
          availableProjects={MOCK_PROJECTS}
          availableTasks={MOCK_TASKS}
          availableGoals={MOCK_GOALS}
          onSubmit={() => {}}
          onResolveConflict={(choice) => alert(`Resolved using ${choice} version`)}
        />
      </div>
    </div>
  );
}
