import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";

import { ConfirmDialog, ErrorState, InlineMessage } from "@components/feedback";
import {
  Button,
  Checkbox,
  Heading,
  IconButton,
  LiveRegion,
  ProgressBar,
  Skeleton,
  Surface,
  Text,
  TextInput,
  VisuallyHidden,
} from "@components/ui";

import "./subtask-checklist.css";

export interface SubtaskChecklistItem {
  readonly id: string;
  readonly title: string;
  readonly completed: boolean;
  readonly position: number;
  readonly version?: number;
}

export type SubtaskChecklistOperation = "add" | "edit" | "toggle" | "reorder" | "delete";

export interface SubtaskChecklistOperationTarget {
  readonly operation: SubtaskChecklistOperation;
  readonly subtaskId?: string;
}

export interface SubtaskChecklistOperationError extends SubtaskChecklistOperationTarget {
  /** Safe, user-facing copy. Technical API details stay outside this component. */
  readonly message: string;
  readonly onRetry?: () => void;
}

export interface SubtaskChecklistProps {
  readonly subtasks?: readonly SubtaskChecklistItem[];
  readonly loading?: boolean;
  /** Safe detail for a region-level load failure. */
  readonly error?: string | null;
  readonly onRetry?: () => void;
  readonly readOnly?: boolean;
  readonly readOnlyReason?: string;
  /** Caller-owned request state, merged with promises returned by the action callbacks. */
  readonly pendingOperations?: readonly SubtaskChecklistOperationTarget[];
  /** Caller-owned partial failures. Successful Subtasks stay available around them. */
  readonly operationErrors?: readonly SubtaskChecklistOperationError[];
  readonly onAdd?: (title: string) => void | Promise<void>;
  readonly onEdit?: (subtaskId: string, title: string) => void | Promise<void>;
  readonly onToggle?: (subtaskId: string, completed: boolean) => void | Promise<void>;
  readonly onReorder?: (orderedSubtaskIds: readonly string[]) => void | Promise<void>;
  readonly onDelete?: (subtaskId: string) => void | Promise<void>;
  readonly className?: string;
}

interface InternalOperationError extends SubtaskChecklistOperationError {
  readonly key: string;
}

const OPERATION_FAILURE_COPY: Record<SubtaskChecklistOperation, string> = {
  add: "We couldn't add this Subtask. Your title is still here. Try again.",
  edit: "We couldn't save this Subtask. Your changes are still here. Try again.",
  toggle: "We couldn't change this Subtask. The saved checklist is still shown. Try again.",
  reorder: "We couldn't move this Subtask. The saved order is still shown. Try again.",
  delete: "We couldn't delete this Subtask. It is still in the checklist. Try again.",
};

function operationKey(operation: SubtaskChecklistOperation, subtaskId?: string): string {
  return `${operation}:${subtaskId ?? "checklist"}`;
}

function sameTarget(
  left: SubtaskChecklistOperationTarget,
  operation: SubtaskChecklistOperation,
  subtaskId?: string,
): boolean {
  return left.operation === operation && left.subtaskId === subtaskId;
}

export function SubtaskChecklist({
  subtasks = [],
  loading = false,
  error = null,
  onRetry,
  readOnly = false,
  readOnlyReason = "Subtasks are read-only for this Task.",
  pendingOperations = [],
  operationErrors = [],
  onAdd,
  onEdit,
  onToggle,
  onReorder,
  onDelete,
  className,
}: SubtaskChecklistProps) {
  const instructionsId = useId();
  const [newTitle, setNewTitle] = useState("");
  const [newTitleError, setNewTitleError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingTitleError, setEditingTitleError] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const editButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const focusEditButtonId = useRef<string | null>(null);
  const [deletingSubtask, setDeletingSubtask] = useState<SubtaskChecklistItem | null>(null);
  const [internalPendingKeys, setInternalPendingKeys] = useState<readonly string[]>([]);
  const [internalErrors, setInternalErrors] = useState<readonly InternalOperationError[]>([]);
  const [announcement, setAnnouncement] = useState("");

  const orderedSubtasks = useMemo(
    () =>
      subtasks
        .map((subtask, sourceIndex) => ({ subtask, sourceIndex }))
        .sort(
          (left, right) =>
            left.subtask.position - right.subtask.position || left.sourceIndex - right.sourceIndex,
        )
        .map(({ subtask }) => subtask),
    [subtasks],
  );

  const completedCount = orderedSubtasks.filter((subtask) => subtask.completed).length;
  const totalCount = orderedSubtasks.length;
  const allComplete = totalCount > 0 && completedCount === totalCount;

  useEffect(() => {
    if (editingId) {
      editInputRef.current?.focus();
      return;
    }
    if (!focusEditButtonId.current) return;
    editButtonRefs.current.get(focusEditButtonId.current)?.focus();
    focusEditButtonId.current = null;
  }, [editingId]);

  function isPending(operation: SubtaskChecklistOperation, subtaskId?: string): boolean {
    return (
      internalPendingKeys.includes(operationKey(operation, subtaskId)) ||
      pendingOperations.some((target) => sameTarget(target, operation, subtaskId))
    );
  }

  function errorsForSubtask(subtaskId: string): readonly SubtaskChecklistOperationError[] {
    return [...operationErrors, ...internalErrors].filter(
      (operationError) => operationError.subtaskId === subtaskId,
    );
  }

  function checklistErrors(operation: SubtaskChecklistOperation) {
    return [...operationErrors, ...internalErrors].filter((operationError) =>
      sameTarget(operationError, operation),
    );
  }

  async function runOperation(
    operation: SubtaskChecklistOperation,
    subtaskId: string | undefined,
    action: () => void | Promise<void>,
    successAnnouncement: string,
  ): Promise<boolean> {
    const key = operationKey(operation, subtaskId);
    setInternalErrors((current) => current.filter((item) => item.key !== key));
    setInternalPendingKeys((current) => (current.includes(key) ? current : [...current, key]));

    try {
      await action();
      setAnnouncement(successAnnouncement);
      return true;
    } catch {
      setInternalErrors((current) => [
        ...current.filter((item) => item.key !== key),
        {
          key,
          operation,
          ...(subtaskId === undefined ? {} : { subtaskId }),
          message: OPERATION_FAILURE_COPY[operation],
          onRetry: () => void runOperation(operation, subtaskId, action, successAnnouncement),
        },
      ]);
      return false;
    } finally {
      setInternalPendingKeys((current) => current.filter((item) => item !== key));
    }
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newTitle.trim();
    if (!title) {
      setNewTitleError("Enter a Subtask title.");
      return;
    }
    if (!onAdd) return;

    setNewTitleError(null);
    const saved = await runOperation(
      "add",
      undefined,
      () => onAdd(title),
      `Subtask added: ${title}.`,
    );
    if (saved) setNewTitle("");
  }

  function beginEdit(subtask: SubtaskChecklistItem) {
    setEditingId(subtask.id);
    setEditingTitle(subtask.title);
    setEditingTitleError(null);
  }

  function cancelEdit(returnFocusTo?: string) {
    setEditingId(null);
    setEditingTitle("");
    setEditingTitleError(null);
    if (returnFocusTo) focusEditButtonId.current = returnFocusTo;
  }

  async function handleEdit(event: FormEvent<HTMLFormElement>, subtask: SubtaskChecklistItem) {
    event.preventDefault();
    const title = editingTitle.trim();
    if (!title) {
      setEditingTitleError("Enter a Subtask title.");
      return;
    }
    if (!onEdit) return;

    setEditingTitleError(null);
    const saved = await runOperation(
      "edit",
      subtask.id,
      () => onEdit(subtask.id, title),
      `Subtask saved: ${title}.`,
    );
    if (saved) cancelEdit(subtask.id);
  }

  function handleToggle(subtask: SubtaskChecklistItem) {
    if (!onToggle) return;
    const completed = !subtask.completed;
    void runOperation(
      "toggle",
      subtask.id,
      () => onToggle(subtask.id, completed),
      completed ? `Subtask marked done: ${subtask.title}.` : `Subtask reopened: ${subtask.title}.`,
    );
  }

  function moveSubtask(subtask: SubtaskChecklistItem, direction: -1 | 1) {
    if (!onReorder) return;
    const currentIndex = orderedSubtasks.findIndex((item) => item.id === subtask.id);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= orderedSubtasks.length) return;

    const nextOrder = orderedSubtasks.map((item) => item.id);
    [nextOrder[currentIndex], nextOrder[nextIndex]] = [
      nextOrder[nextIndex]!,
      nextOrder[currentIndex]!,
    ];
    const directionLabel = direction < 0 ? "up" : "down";
    void runOperation(
      "reorder",
      subtask.id,
      () => onReorder(nextOrder),
      `${subtask.title} moved ${directionLabel}.`,
    );
  }

  function handleReorderKeyDown(event: KeyboardEvent<HTMLElement>, subtask: SubtaskChecklistItem) {
    if (!event.altKey || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
    if (event.target instanceof HTMLInputElement && event.target.type === "text") return;
    event.preventDefault();
    moveSubtask(subtask, event.key === "ArrowUp" ? -1 : 1);
  }

  async function handleDelete() {
    if (!deletingSubtask || !onDelete) return;
    const deleted = await runOperation(
      "delete",
      deletingSubtask.id,
      () => onDelete(deletingSubtask.id),
      `Subtask deleted: ${deletingSubtask.title}.`,
    );
    if (deleted) setDeletingSubtask(null);
  }

  const classes = ["lifeos-subtask-checklist", readOnly && "is-read-only", className]
    .filter(Boolean)
    .join(" ");

  if (loading) {
    return <SubtaskChecklistSkeleton {...(className ? { className } : {})} />;
  }

  if (error) {
    return (
      <Surface as="section" title="Subtasks" className={classes}>
        <ErrorState
          scope="region"
          title="Subtasks couldn't load"
          description={error || "Task details are still available."}
          {...(onRetry ? { onRetry } : {})}
        />
      </Surface>
    );
  }

  const addErrors = checklistErrors("add");
  const deletingErrors = deletingSubtask
    ? errorsForSubtask(deletingSubtask.id).filter((item) => item.operation === "delete")
    : [];

  return (
    <Surface as="section" title="Subtasks" className={classes}>
      <div className="lifeos-subtask-checklist__intro">
        <Text tone="secondary" size="sm">
          Break this Task into smaller ordered actions.
        </Text>
        <Text numeric size="sm" weight="semibold">
          {completedCount} of {totalCount} done
        </Text>
      </div>

      {totalCount > 0 ? (
        <ProgressBar
          label="Subtask progress"
          value={completedCount}
          max={totalCount}
          valueText={`${completedCount} of ${totalCount} Subtasks done`}
          showValue
          tone={allComplete ? "success" : "primary"}
          size="sm"
        />
      ) : null}

      {readOnly ? <InlineMessage tone="info">{readOnlyReason}</InlineMessage> : null}

      {totalCount === 0 ? (
        <div className="lifeos-subtask-checklist__empty">
          <Heading level={3} size="sm">
            No Subtasks yet
          </Heading>
          <Text tone="secondary" size="sm">
            Add a Subtask when this Task needs a smaller action you can track separately.
          </Text>
        </div>
      ) : (
        <>
          {onReorder && !readOnly ? (
            <Text id={instructionsId} tone="muted" size="xs">
              Move Subtasks with the arrow buttons, or press Alt+Up/Down Arrow from a Subtask row.
            </Text>
          ) : null}
          <ol
            className="lifeos-subtask-checklist__list"
            {...(onReorder && !readOnly ? { "aria-describedby": instructionsId } : {})}
          >
            {orderedSubtasks.map((subtask, index) => {
              const toggling = isPending("toggle", subtask.id);
              const editing = editingId === subtask.id;
              const editingPending = isPending("edit", subtask.id);
              const reorderPending = isPending("reorder", subtask.id);
              const deletingPending = isPending("delete", subtask.id);
              const itemPending = toggling || editingPending || reorderPending || deletingPending;
              const itemErrors = errorsForSubtask(subtask.id).filter(
                (item) => item.operation !== "delete",
              );

              return (
                <li
                  key={subtask.id}
                  className={[
                    "lifeos-subtask-checklist__item",
                    subtask.completed && "is-completed",
                    itemPending && "is-pending",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-busy={itemPending || undefined}
                >
                  {editing ? (
                    <form
                      className="lifeos-subtask-checklist__edit-form"
                      noValidate
                      onSubmit={(event) => void handleEdit(event, subtask)}
                    >
                      <TextInput
                        ref={editInputRef}
                        label={`Edit ${subtask.title}`}
                        labelHidden
                        value={editingTitle}
                        {...(editingTitleError ? { error: editingTitleError } : {})}
                        onChange={(event) => {
                          setEditingTitle(event.target.value);
                          setEditingTitleError(null);
                        }}
                        disabled={editingPending}
                      />
                      <div className="lifeos-subtask-checklist__edit-actions">
                        <Button
                          type="submit"
                          variant="primary"
                          size="sm"
                          loading={editingPending}
                          loadingLabel="Saving Subtask"
                        >
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => cancelEdit(subtask.id)}
                          disabled={editingPending}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <Checkbox
                        label={subtask.title}
                        checked={subtask.completed}
                        onChange={() => handleToggle(subtask)}
                        disabled={readOnly || !onToggle || itemPending}
                        className="lifeos-subtask-checklist__checkbox"
                        {...(onReorder && !readOnly
                          ? {
                              "aria-keyshortcuts": "Alt+ArrowUp Alt+ArrowDown",
                              onKeyDown: (event: KeyboardEvent<HTMLInputElement>) =>
                                handleReorderKeyDown(event, subtask),
                            }
                          : {})}
                      />
                      {onEdit || onReorder || onDelete ? (
                        <div
                          className="lifeos-subtask-checklist__item-actions"
                          role="group"
                          aria-label={`Actions for ${subtask.title}`}
                        >
                          {onEdit ? (
                            <IconButton
                              ref={(node) => {
                                if (node) editButtonRefs.current.set(subtask.id, node);
                                else editButtonRefs.current.delete(subtask.id);
                              }}
                              icon={Pencil}
                              label={`Edit ${subtask.title}`}
                              size="sm"
                              onClick={() => beginEdit(subtask)}
                              disabled={readOnly || itemPending}
                              {...(onReorder && !readOnly
                                ? {
                                    "aria-keyshortcuts": "Alt+ArrowUp Alt+ArrowDown",
                                    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) =>
                                      handleReorderKeyDown(event, subtask),
                                  }
                                : {})}
                            />
                          ) : null}
                          {onReorder ? (
                            <>
                              <IconButton
                                icon={ArrowUp}
                                label={`Move ${subtask.title} up`}
                                size="sm"
                                onClick={() => moveSubtask(subtask, -1)}
                                disabled={readOnly || itemPending || index === 0}
                                aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
                                onKeyDown={(event) => handleReorderKeyDown(event, subtask)}
                              />
                              <IconButton
                                icon={ArrowDown}
                                label={`Move ${subtask.title} down`}
                                size="sm"
                                onClick={() => moveSubtask(subtask, 1)}
                                disabled={readOnly || itemPending || index === totalCount - 1}
                                aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
                                onKeyDown={(event) => handleReorderKeyDown(event, subtask)}
                              />
                            </>
                          ) : null}
                          {onDelete ? (
                            <IconButton
                              icon={Trash2}
                              label={`Delete ${subtask.title}`}
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeletingSubtask(subtask)}
                              disabled={readOnly || itemPending}
                              {...(onReorder && !readOnly
                                ? {
                                    "aria-keyshortcuts": "Alt+ArrowUp Alt+ArrowDown",
                                    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) =>
                                      handleReorderKeyDown(event, subtask),
                                  }
                                : {})}
                            />
                          ) : null}
                        </div>
                      ) : null}
                    </>
                  )}

                  {!editing && toggling ? (
                    <InlineMessage tone="info" announce="status">
                      Saving Subtask state…
                    </InlineMessage>
                  ) : null}

                  {!editing && reorderPending ? (
                    <InlineMessage tone="info" announce="status">
                      Saving Subtask order…
                    </InlineMessage>
                  ) : null}

                  {itemErrors.map((operationError, errorIndex) => (
                    <OperationErrorMessage
                      key={`${operationError.operation}:${errorIndex}`}
                      error={operationError}
                    />
                  ))}
                </li>
              );
            })}
          </ol>
        </>
      )}

      {allComplete ? (
        <InlineMessage tone="success" announce="status">
          All Subtasks are done. The Task stays open until you mark it done separately.
        </InlineMessage>
      ) : null}

      {!readOnly && onAdd ? (
        <form className="lifeos-subtask-checklist__add-form" noValidate onSubmit={handleAdd}>
          <TextInput
            label="Subtask title"
            labelHidden
            placeholder="Add a Subtask"
            value={newTitle}
            {...(newTitleError ? { error: newTitleError } : {})}
            onChange={(event) => {
              setNewTitle(event.target.value);
              setNewTitleError(null);
            }}
            disabled={isPending("add")}
          />
          <Button
            type="submit"
            variant="secondary"
            iconStart={Plus}
            loading={isPending("add")}
            loadingLabel="Adding Subtask"
          >
            Add subtask
          </Button>
          {addErrors.map((operationError, errorIndex) => (
            <OperationErrorMessage
              key={`${operationError.operation}:${errorIndex}`}
              error={operationError}
            />
          ))}
        </form>
      ) : null}

      <LiveRegion message={announcement} />

      <ConfirmDialog
        open={deletingSubtask !== null}
        onClose={() => {
          if (!deletingSubtask || !isPending("delete", deletingSubtask.id)) {
            setDeletingSubtask(null);
          }
        }}
        onConfirm={() => void handleDelete()}
        title={`Delete “${deletingSubtask?.title ?? "Subtask"}”?`}
        description="This Subtask will be permanently deleted from this Task. This can't be undone. The Task's checklist progress will be recalculated."
        confirmLabel="Delete subtask"
        pending={deletingSubtask ? isPending("delete", deletingSubtask.id) : false}
        pendingLabel="Deleting Subtask"
        {...(deletingErrors[0] ? { error: deletingErrors[0].message } : {})}
      />
    </Surface>
  );
}

function OperationErrorMessage({ error }: { readonly error: SubtaskChecklistOperationError }) {
  return (
    <div className="lifeos-subtask-checklist__operation-error">
      <InlineMessage tone="danger" announce="alert">
        {error.message}
      </InlineMessage>
      {error.onRetry ? (
        <Button variant="link" size="sm" onClick={error.onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

function SubtaskChecklistSkeleton({ className }: { readonly className?: string }) {
  return (
    <Surface
      as="section"
      title="Subtasks"
      className={["lifeos-subtask-checklist", "is-loading", className].filter(Boolean).join(" ")}
    >
      <div className="lifeos-subtask-checklist__intro" aria-hidden="true">
        <Skeleton width="55%" />
        <Skeleton width="5rem" />
      </div>
      <Skeleton shape="block" height="0.5rem" />
      <div className="lifeos-subtask-checklist__skeleton-list" aria-hidden="true">
        <Skeleton shape="block" height="3rem" />
        <Skeleton shape="block" height="3rem" />
        <Skeleton shape="block" height="3rem" />
      </div>
      <VisuallyHidden>Loading Subtasks.</VisuallyHidden>
    </Surface>
  );
}
