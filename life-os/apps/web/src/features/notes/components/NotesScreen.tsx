import { useState, useMemo } from "react";
import { Plus, Pin, Archive, Trash2, ChevronLeft, Edit3, Eye, FileText } from "lucide-react";

import { PageHeader, Tabs, type TabItem } from "@components/navigation";
import { SearchField } from "@components/forms";
import { ConfirmDialog } from "@components/feedback";
import { Button, Heading, IconButton, Select, Text, Badge, Link } from "@components/ui";

import type { Note } from "../model/note";
import type { NoteFormData, NoteAutosaveStatus } from "./NoteForm";
import { NoteCard } from "./NoteCard";
import { NoteForm } from "./NoteForm";
import { SafeMarkdown } from "./SafeMarkdown";
import "./notes-screen.css";

export interface NotesScreenProps {
  readonly notes: readonly Note[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly searchQuery: string;
  readonly onSearchQueryChange: (q: string) => void;
  readonly selectedLabelId: string | null;
  readonly onLabelFilterChange: (id: string | null) => void;
  readonly statusTab: "ACTIVE" | "ARCHIVED";
  readonly onStatusTabChange: (tab: "ACTIVE" | "ARCHIVED") => void;
  readonly selectedNote: Note | null;
  readonly isCreatingNewNote: boolean;
  readonly onSelectNote: (note: Note | null) => void;
  readonly onCreateNoteTrigger: () => void;
  readonly onSubmitNote: (data: NoteFormData) => void;
  readonly onDeleteNote: (note: Note) => void;
  readonly onPinToggle: (note: Note) => void;
  readonly onArchiveToggle: (note: Note) => void;
  readonly isOnline?: boolean;
  readonly autosaveStatus?: NoteAutosaveStatus;
  readonly onResolveConflict?: (choice: "server" | "draft") => void;
  readonly labels: readonly { readonly id: string; readonly name: string }[];
  readonly availableProjects: readonly { readonly id: string; readonly title: string }[];
  readonly availableTasks: readonly { readonly id: string; readonly title: string }[];
  readonly availableGoals: readonly { readonly id: string; readonly title: string }[];
}

export function NotesScreen({
  notes,
  loading,
  error,
  searchQuery,
  onSearchQueryChange,
  selectedLabelId,
  onLabelFilterChange,
  statusTab,
  onStatusTabChange,
  selectedNote,
  isCreatingNewNote,
  onSelectNote,
  onCreateNoteTrigger,
  onSubmitNote,
  onDeleteNote,
  onPinToggle,
  onArchiveToggle,
  isOnline = true,
  autosaveStatus = { type: "idle" },
  onResolveConflict,
  labels,
  availableProjects,
  availableTasks,
  availableGoals,
}: NotesScreenProps) {
  const [detailMode, setDetailMode] = useState<"edit" | "preview">("edit");
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [searchDraft, setSearchDraft] = useState(searchQuery);

  // Group notes into pinned and other notes (only applies to ACTIVE view)
  const { pinnedNotes, otherNotes } = useMemo(() => {
    const pinned = notes.filter((n) => n.pinned && !n.archived);
    const others = notes.filter((n) => !n.pinned && !n.archived);
    return { pinnedNotes: pinned, otherNotes: others };
  }, [notes]);

  const activeLabelMap = useMemo(() => new Map(labels.map((l) => [l.id, l])), [labels]);

  const resolveLinksForNote = (note: Note) => {
    return note.links.map((link) => {
      let title = "Unknown Entity";
      let href = "#";
      if (link.targetType === "PROJECT") {
        title = availableProjects.find((p) => p.id === link.targetId)?.title ?? "Project";
        href = `/life-os/app/projects/${link.targetId}`;
      } else if (link.targetType === "TASK") {
        title = availableTasks.find((t) => t.id === link.targetId)?.title ?? "Task";
        href = `/life-os/app/tasks/${link.targetId}`;
      } else if (link.targetType === "GOAL") {
        title = availableGoals.find((g) => g.id === link.targetId)?.title ?? "Goal";
        href = `/life-os/app/goals/${link.targetId}`;
      }
      return {
        id: link.id,
        targetType: link.targetType,
        targetId: link.targetId,
        title,
        href,
      };
    });
  };

  const handleNoteCardClick = (note: Note) => {
    setDetailMode("edit");
    onSelectNote(note);
  };

  // Render the list of notes for a tab panel
  const renderNoteList = (notesToRender: readonly Note[]) => {
    if (loading) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <NoteCard loading />
          <NoteCard loading />
        </div>
      );
    }

    if (error) {
      return <Text tone="danger">{error}</Text>;
    }

    if (notesToRender.length === 0) {
      return (
        <div className="lifeos-notes-screen__empty-state">
          <FileText size={48} className="lifeos-notes-screen__empty-icon" />
          <Text size="sm" tone="secondary">
            No notes found.
          </Text>
        </div>
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {notesToRender.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            labels={note.labelIds.map((id) => activeLabelMap.get(id)).filter(Boolean) as any}
            resolvedLinks={resolveLinksForNote(note)}
            onPinToggle={onPinToggle}
            onArchiveToggle={onArchiveToggle}
            onDelete={setNoteToDelete}
            onClick={handleNoteCardClick}
          />
        ))}
      </div>
    );
  };

  const tabItems: readonly TabItem[] = [
    {
      id: "ACTIVE",
      label: "Active",
      panel: (
        <div className="lifeos-notes-screen__notes-list">
          {pinnedNotes.length > 0 && (
            <div
              className="lifeos-notes-screen__list-section"
              style={{ marginBottom: "var(--lifeos-space-4)" }}
            >
              <div className="lifeos-notes-screen__section-title">Pinned</div>
              {renderNoteList(pinnedNotes)}
            </div>
          )}
          <div className="lifeos-notes-screen__list-section">
            {pinnedNotes.length > 0 && (
              <div className="lifeos-notes-screen__section-title">All Notes</div>
            )}
            {renderNoteList(otherNotes)}
          </div>
        </div>
      ),
    },
    {
      id: "ARCHIVED",
      label: "Archived",
      panel: (
        <div className="lifeos-notes-screen__notes-list">
          {renderNoteList(notes.filter((n) => n.archived))}
        </div>
      ),
    },
  ];

  const hasSelected = selectedNote !== null || isCreatingNewNote;

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 24, height: "100%" }}>
        <PageHeader
          title="Notes"
          description="Capture thoughts, checklists, and references."
          primaryAction={
            <Button variant="primary" iconStart={Plus} onClick={onCreateNoteTrigger}>
              Create Note
            </Button>
          }
        />

        <div className="lifeos-notes-screen">
          {/* Sidebar */}
          <div
            className={["lifeos-notes-screen__sidebar", hasSelected && "is-hidden"]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="lifeos-notes-screen__toolbar">
              <SearchField
                label="Search notes"
                placeholder="Search title or body..."
                value={searchDraft}
                onValueChange={(val) => {
                  setSearchDraft(val);
                  if (val === "") onSearchQueryChange("");
                }}
                onSearch={onSearchQueryChange}
              />
              <Select
                label="Label"
                value={selectedLabelId ?? "ALL"}
                onChange={(e) =>
                  onLabelFilterChange(e.target.value === "ALL" ? null : e.target.value)
                }
                options={[
                  { value: "ALL", label: "All Labels" },
                  ...labels.map((l) => ({ value: l.id, label: l.name })),
                ]}
              />
            </div>

            <Tabs
              label="Note Statuses"
              items={tabItems}
              selectedId={statusTab}
              onSelectedIdChange={(id) => onStatusTabChange(id as any)}
            />
          </div>

          {/* Details Panel */}
          <div
            className={["lifeos-notes-screen__detail", !hasSelected && "is-hidden"]
              .filter(Boolean)
              .join(" ")}
          >
            {hasSelected ? (
              <>
                <div className="lifeos-notes-screen__detail-header">
                  <div className="lifeos-notes-screen__detail-header-top">
                    <div className="lifeos-notes-screen__detail-header-left">
                      <IconButton
                        icon={ChevronLeft}
                        label="Back to notes list"
                        onClick={() => onSelectNote(null)}
                        className="lifeos-notes-screen__back-btn"
                      />
                      <h2 className="lifeos-notes-screen__detail-title">
                        {isCreatingNewNote ? "New Note" : selectedNote?.title || "Untitled Note"}
                      </h2>
                    </div>

                    {!isCreatingNewNote && selectedNote && (
                      <div className="lifeos-notes-screen__detail-actions">
                        <IconButton
                          icon={selectedNote.pinned ? Pin : Pin}
                          label={selectedNote.pinned ? "Unpin note" : "Pin note"}
                          onClick={() => onPinToggle(selectedNote)}
                          variant={selectedNote.pinned ? "primary" : "secondary"}
                        />
                        <IconButton
                          icon={Archive}
                          label={selectedNote.archived ? "Restore note" : "Archive note"}
                          onClick={() => onArchiveToggle(selectedNote)}
                        />
                        <IconButton
                          icon={Trash2}
                          label="Delete note"
                          onClick={() => setNoteToDelete(selectedNote)}
                        />
                      </div>
                    )}
                  </div>

                  {!isCreatingNewNote && (
                    <div className="lifeos-notes-screen__detail-mode-tabs">
                      <button
                        type="button"
                        className={[
                          "lifeos-notes-screen__detail-mode-btn",
                          detailMode === "edit" && "is-active",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => setDetailMode("edit")}
                      >
                        <Edit3 size={14} />
                        Edit
                      </button>
                      <button
                        type="button"
                        className={[
                          "lifeos-notes-screen__detail-mode-btn",
                          detailMode === "preview" && "is-active",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => setDetailMode("preview")}
                      >
                        <Eye size={14} />
                        Preview
                      </button>
                    </div>
                  )}
                </div>

                <div className="lifeos-notes-screen__detail-content">
                  {detailMode === "edit" || isCreatingNewNote ? (
                    <NoteForm
                      note={isCreatingNewNote ? null : selectedNote}
                      isOnline={isOnline}
                      status={autosaveStatus}
                      labels={labels}
                      availableProjects={availableProjects}
                      availableTasks={availableTasks}
                      availableGoals={availableGoals}
                      onSubmit={onSubmitNote}
                      onCancel={() => onSelectNote(null)}
                      onResolveConflict={onResolveConflict}
                    />
                  ) : (
                    selectedNote && (
                      <div className="lifeos-notes-screen__preview-body">
                        <div className="lifeos-notes-screen__preview-meta">
                          {selectedNote.labelIds.length > 0 && (
                            <div className="lifeos-notes-screen__preview-meta-row">
                              <div className="lifeos-notes-screen__preview-meta-label">Labels</div>
                              <div className="lifeos-notes-screen__preview-meta-content">
                                {selectedNote.labelIds.map((id) => {
                                  const label = activeLabelMap.get(id);
                                  return label ? (
                                    <Badge key={label.id} tone="neutral">
                                      {label.name}
                                    </Badge>
                                  ) : null;
                                })}
                              </div>
                            </div>
                          )}

                          {selectedNote.links.length > 0 && (
                            <div className="lifeos-notes-screen__preview-meta-row">
                              <div className="lifeos-notes-screen__preview-meta-label">Links</div>
                              <div className="lifeos-notes-screen__preview-meta-content lifeos-notes-screen__preview-links-list">
                                {resolveLinksForNote(selectedNote).map((link) => (
                                  <Link
                                    key={link.id}
                                    href={link.href}
                                    className="lifeos-notes-screen__preview-link-item"
                                  >
                                    <span style={{ fontWeight: 600, textTransform: "capitalize" }}>
                                      {link.targetType.toLowerCase()}:
                                    </span>{" "}
                                    {link.title}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="lifeos-notes-screen__preview-meta-row">
                            <div className="lifeos-notes-screen__preview-meta-label">Updated</div>
                            <div className="lifeos-notes-screen__preview-meta-content">
                              {new Date(selectedNote.updatedAt).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                        </div>

                        <SafeMarkdown text={selectedNote.body} />
                      </div>
                    )
                  )}
                </div>
              </>
            ) : (
              <div className="lifeos-notes-screen__empty-state">
                <FileText size={64} className="lifeos-notes-screen__empty-icon" />
                <Heading level={3}>No Note Selected</Heading>
                <Text tone="secondary">
                  Select a note from the list, or create a new one to get started.
                </Text>
                <Button
                  variant="secondary"
                  iconStart={Plus}
                  onClick={onCreateNoteTrigger}
                  style={{ marginTop: "var(--lifeos-space-2)" }}
                >
                  Create Note
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {noteToDelete && (
        <ConfirmDialog
          open={noteToDelete !== null}
          title="Delete note"
          description={`Are you sure you want to delete "${noteToDelete.title || "Untitled Note"}"? This action cannot be undone.`}
          confirmLabel="Delete"
          onClose={() => setNoteToDelete(null)}
          onConfirm={() => {
            onDeleteNote(noteToDelete);
            setNoteToDelete(null);
          }}
        />
      )}
    </>
  );
}
