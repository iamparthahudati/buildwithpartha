import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link2, Plus, Trash2, AlertTriangle, Check, RotateCcw } from "lucide-react";
import { Button, IconButton, Select, Text, TextInput, Textarea } from "@components/ui";
import { Combobox } from "@components/forms";
import { InlineMessage } from "@components/feedback";
import type { Note } from "../model/note";
import "./note-form.css";

export interface NoteFormData {
  readonly title: string;
  readonly body: string;
  readonly labelIds: readonly string[];
  readonly links: readonly {
    readonly targetType: "PROJECT" | "TASK" | "GOAL";
    readonly targetId: string;
  }[];
}

export type NoteAutosaveStatus =
  | { readonly type: "saved" }
  | { readonly type: "saving" }
  | { readonly type: "offline-unsaved" }
  | { readonly type: "conflict"; readonly message?: string }
  | { readonly type: "idle" };

export interface NoteFormProps {
  readonly note?: Note | null;
  readonly isPending?: boolean;
  readonly isOnline?: boolean;
  readonly status?: NoteAutosaveStatus;
  readonly labels?: readonly { readonly id: string; readonly name: string }[];
  readonly availableProjects?: readonly { readonly id: string; readonly title: string }[];
  readonly availableTasks?: readonly { readonly id: string; readonly title: string }[];
  readonly availableGoals?: readonly { readonly id: string; readonly title: string }[];
  readonly onSubmit: (data: NoteFormData) => void;
  readonly onCancel?: (() => void) | undefined;
  readonly onResolveConflict?: ((choice: "server" | "draft") => void) | undefined;
  readonly className?: string;
}

export function NoteForm({
  note,
  isPending = false,
  isOnline = true,
  status = { type: "idle" },
  labels = [],
  availableProjects = [],
  availableTasks = [],
  availableGoals = [],
  onSubmit,
  onCancel,
  onResolveConflict,
  className,
}: NoteFormProps) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [body, setBody] = useState(note?.body ?? "");
  const [selectedLabels, setSelectedLabels] = useState<readonly string[]>(note?.labelIds ?? []);
  const [links, setLinks] = useState<
    readonly { targetType: "PROJECT" | "TASK" | "GOAL"; targetId: string }[]
  >(note?.links.map((l) => ({ targetType: l.targetType, targetId: l.targetId })) ?? []);

  // For adding new link
  const [newLinkType, setNewLinkType] = useState<"PROJECT" | "TASK" | "GOAL">("PROJECT");
  const [newLinkId, setNewLinkId] = useState<string | null>(null);

  const [labelsQuery, setLabelsQuery] = useState("");
  const [linksQuery, setLinksQuery] = useState("");
  const [prevNote, setPrevNote] = useState<Note | null | undefined>(note);

  const rootClass = ["lifeos-note-form", className].filter(Boolean).join(" ");
  const isConflict = status.type === "conflict";
  const disabled = isPending || isConflict;

  // Track changes to trigger autosave
  const lastSubmittedRef = useRef({ title, body, selectedLabels, links });

  // Update form fields when note changes (e.g. initial load or reset)
  if (note !== prevNote) {
    setPrevNote(note);
    setTitle(note?.title ?? "");
    setBody(note?.body ?? "");
    setSelectedLabels(note?.labelIds ?? []);
    const mappedLinks =
      note?.links.map((l) => ({ targetType: l.targetType, targetId: l.targetId })) ?? [];
    setLinks(mappedLinks);
  }

  // Update ref when note changes
  useEffect(() => {
    if (note) {
      lastSubmittedRef.current = {
        title: note.title,
        body: note.body,
        selectedLabels: note.labelIds,
        links: note.links.map((l) => ({ targetType: l.targetType, targetId: l.targetId })),
      };
    }
  }, [note]);

  // Debounced Autosave (1.5 seconds)
  useEffect(() => {
    if (isConflict) return;

    const currentValues = { title, body, selectedLabels, links };
    const changed =
      currentValues.title !== lastSubmittedRef.current.title ||
      currentValues.body !== lastSubmittedRef.current.body ||
      JSON.stringify(currentValues.selectedLabels) !==
        JSON.stringify(lastSubmittedRef.current.selectedLabels) ||
      JSON.stringify(currentValues.links) !== JSON.stringify(lastSubmittedRef.current.links);

    if (!changed) return;

    const handler = setTimeout(() => {
      lastSubmittedRef.current = currentValues;
      onSubmit({
        title,
        body,
        labelIds: selectedLabels,
        links,
      });
    }, 1500);

    return () => clearTimeout(handler);
  }, [title, body, selectedLabels, links, isConflict, onSubmit]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isConflict) return;

    lastSubmittedRef.current = { title, body, selectedLabels, links };
    onSubmit({
      title,
      body,
      labelIds: selectedLabels,
      links,
    });
  };

  const handleAddLink = () => {
    if (!newLinkId) return;
    if (links.some((l) => l.targetType === newLinkType && l.targetId === newLinkId)) {
      return;
    }
    const updatedLinks = [...links, { targetType: newLinkType, targetId: newLinkId }];
    setLinks(updatedLinks);
    setNewLinkId(null);
    setLinksQuery("");
  };

  const handleRemoveLink = (index: number) => {
    const updatedLinks = links.filter((_, i) => i !== index);
    setLinks(updatedLinks);
  };

  // Get options for Combobox based on newLinkType
  const linkTargetOptions = () => {
    switch (newLinkType) {
      case "PROJECT":
        return availableProjects.map((p) => ({ value: p.id, label: p.title }));
      case "TASK":
        return availableTasks.map((t) => ({ value: t.id, label: t.title }));
      case "GOAL":
        return availableGoals.map((g) => ({ value: g.id, label: g.title }));
      default:
        return [];
    }
  };

  // Resolve target name for existing links
  const resolveTargetName = (type: string, id: string) => {
    switch (type) {
      case "PROJECT":
        return availableProjects.find((p) => p.id === id)?.title ?? "Unknown Project";
      case "TASK":
        return availableTasks.find((t) => t.id === id)?.title ?? "Unknown Task";
      case "GOAL":
        return availableGoals.find((g) => g.id === id)?.title ?? "Unknown Goal";
      default:
        return "Unknown";
    }
  };

  const renderStatus = () => {
    switch (status.type) {
      case "saving":
        return (
          <InlineMessage tone="info" announce="status">
            Saving...
          </InlineMessage>
        );
      case "saved":
        return (
          <InlineMessage tone="success" announce="status">
            Saved
          </InlineMessage>
        );
      case "offline-unsaved":
        return (
          <InlineMessage tone="warning" announce="status">
            Not saved — reconnect and choose Save note
          </InlineMessage>
        );
      case "conflict":
        return (
          <div className="lifeos-note-form__conflict-alert" role="alert">
            <AlertTriangle size={18} className="lifeos-note-form__conflict-icon" />
            <div className="lifeos-note-form__conflict-text">
              <Text weight="semibold" size="xs">
                Sync conflict
              </Text>
              <Text size="xs" tone="secondary">
                {status.message ??
                  "This Note changed elsewhere. Load the latest details before trying again."}
              </Text>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <form className={rootClass} onSubmit={handleSubmit} noValidate>
      <div className="lifeos-note-form__main">
        <TextInput
          label="Title"
          placeholder="Note title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={disabled}
          required
        />

        <Textarea
          label="Body"
          placeholder="Write your note here (Markdown supported)..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={12}
          disabled={disabled}
          autoGrow
        />
      </div>

      <div className="lifeos-note-form__sidebar">
        <Combobox
          label="Labels"
          multiple={true}
          value={selectedLabels}
          onValueChange={setSelectedLabels}
          query={labelsQuery}
          onQueryChange={setLabelsQuery}
          options={labels.map((l) => ({ value: l.id, label: l.name }))}
          placeholder="Select labels..."
          description="Tag your note with labels"
        />

        <div className="lifeos-note-form__links-section">
          <Text weight="semibold" size="xs" className="lifeos-note-form__section-title">
            Links
          </Text>

          {links.length > 0 && (
            <div className="lifeos-note-form__links-list">
              {links.map((link, idx) => (
                <div
                  key={`${link.targetType}-${link.targetId}-${idx}`}
                  className="lifeos-note-form__link-row"
                >
                  <Link2 size={14} className="lifeos-note-form__link-row-icon" />
                  <div className="lifeos-note-form__link-row-text">
                    <span className="lifeos-note-form__link-row-type">
                      {link.targetType.toLowerCase()}:
                    </span>{" "}
                    {resolveTargetName(link.targetType, link.targetId)}
                  </div>
                  <IconButton
                    icon={Trash2}
                    label="Remove link"
                    size="sm"
                    onClick={() => handleRemoveLink(idx)}
                    disabled={disabled}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="lifeos-note-form__add-link-panel">
            <Select
              label="Link Type"
              value={newLinkType}
              onChange={(e) => {
                setNewLinkType(e.target.value as any);
                setNewLinkId(null);
                setLinksQuery("");
              }}
              options={[
                { value: "PROJECT", label: "Project" },
                { value: "TASK", label: "Task" },
                { value: "GOAL", label: "Goal" },
              ]}
              disabled={disabled}
            />

            <Combobox
              label="Target Entity"
              multiple={false}
              value={newLinkId}
              onValueChange={setNewLinkId}
              query={linksQuery}
              onQueryChange={setLinksQuery}
              options={linkTargetOptions()}
              placeholder={`Select ${newLinkType.toLowerCase()}...`}
              disabled={disabled}
            />

            <Button
              type="button"
              variant="secondary"
              size="sm"
              iconStart={Plus}
              onClick={handleAddLink}
              disabled={disabled || !newLinkId}
            >
              Add Link
            </Button>
          </div>
        </div>

        <div className="lifeos-note-form__status-area">
          {renderStatus()}

          {!isOnline && status.type !== "offline-unsaved" && (
            <InlineMessage tone="warning">
              Offline. Changes stay in this tab until you save them online.
            </InlineMessage>
          )}
        </div>

        <div className="lifeos-note-form__footer-actions">
          {isConflict && onResolveConflict ? (
            <div className="lifeos-note-form__conflict-actions">
              <Button
                type="button"
                variant="primary"
                size="sm"
                iconStart={RotateCcw}
                onClick={() => onResolveConflict("server")}
              >
                Use Server Version
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                iconStart={Check}
                onClick={() => onResolveConflict("draft")}
              >
                Use My Draft
              </Button>
            </div>
          ) : (
            <div className="lifeos-note-form__normal-actions">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={isPending}
                disabled={disabled}
              >
                Save note
              </Button>
              {onCancel && (
                <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
