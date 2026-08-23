import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Link2Off, Plus } from "lucide-react";

import { Dialog, ErrorState, InlineMessage } from "@components/feedback";
import { Combobox, type ComboboxOption } from "@components/forms";
import {
  Badge,
  Button,
  Heading,
  IconButton,
  Link,
  LiveRegion,
  Skeleton,
  Surface,
  Text,
  VisuallyHidden,
} from "@components/ui";

import {
  dependencyEditorErrorMessage,
  type DependencyEditorErrorReason,
} from "../model/dependencyEditorErrors";
import type { TaskPriority, TaskStatus } from "../model/task";
import {
  TASK_PRIORITY_BADGE_TONE,
  TASK_PRIORITY_LABEL,
  TASK_STATUS_BADGE_TONE,
  TASK_STATUS_LABEL,
} from "../model/taskPresentation";
import "./dependency-editor.css";

export interface DependencyEditorTask {
  readonly id: string;
  readonly title: string;
  readonly status: TaskStatus;
  readonly priority: TaskPriority;
  readonly href?: string;
}

export type DependencyRelationship = "BLOCKER" | "DEPENDENT";
export type DependencyEditorOperation = "add" | "remove";

export interface DependencyEditorOperationError {
  readonly operation: DependencyEditorOperation;
  readonly relationship: DependencyRelationship;
  readonly taskId?: string;
  readonly reason?: DependencyEditorErrorReason;
  /** Safe user-facing copy. Technical API details stay outside this component. */
  readonly message?: string;
  readonly onRetry?: () => void;
}

export interface DependencyEditorProps {
  readonly task: Pick<DependencyEditorTask, "id" | "title">;
  readonly blockers?: readonly DependencyEditorTask[];
  readonly dependents?: readonly DependencyEditorTask[];
  /** Search results or locally available Tasks that may become blockers. */
  readonly blockerOptions?: readonly DependencyEditorTask[];
  readonly loading?: boolean;
  readonly error?: string | null;
  readonly onRetry?: () => void;
  readonly readOnly?: boolean;
  readonly readOnlyReason?: string;
  /** Temporarily disables otherwise-authorized mutation controls, for example while offline. */
  readonly disabled?: boolean;
  readonly disabledReason?: string;
  readonly searchLoading?: boolean;
  readonly onSearchQueryChange?: (query: string) => void;
  readonly pendingAdd?: boolean;
  readonly pendingRemovals?: readonly {
    readonly taskId: string;
    readonly relationship: DependencyRelationship;
  }[];
  readonly operationErrors?: readonly DependencyEditorOperationError[];
  readonly onAddBlocker?: (taskId: string) => void | Promise<void>;
  readonly onRemoveDependency?: (
    taskId: string,
    relationship: DependencyRelationship,
  ) => void | Promise<void>;
  /** Used when a Task has no href, for example in an embedded details panel. */
  readonly onOpenTask?: (taskId: string) => void;
  readonly className?: string;
}

interface InternalOperationError extends DependencyEditorOperationError {
  readonly key: string;
}

const INTERNAL_ADD_FAILURE =
  "We couldn't add this blocker. Your selection is still here. Try again.";
const INTERNAL_REMOVE_FAILURE =
  "We couldn't unlink this Task dependency. The saved relationship is still shown. Try again.";

function operationKey(
  operation: DependencyEditorOperation,
  relationship: DependencyRelationship,
  taskId?: string,
): string {
  return `${operation}:${relationship}:${taskId ?? "editor"}`;
}

function isTerminal(status: TaskStatus): boolean {
  return status === "DONE" || status === "CANCELLED";
}

export function DependencyEditor({
  task,
  blockers = [],
  dependents = [],
  blockerOptions = [],
  loading = false,
  error = null,
  onRetry,
  readOnly = false,
  readOnlyReason = "Task dependencies are read-only for this Task.",
  disabled = false,
  disabledReason = "Task dependencies can't be changed right now.",
  searchLoading = false,
  onSearchQueryChange,
  pendingAdd = false,
  pendingRemovals = [],
  operationErrors = [],
  onAddBlocker,
  onRemoveDependency,
  onOpenTask,
  className,
}: DependencyEditorProps) {
  const comboboxId = `${useId()}-blocker`;
  const addTriggerRef = useRef<HTMLButtonElement>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedBlockerId, setSelectedBlockerId] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [internalPendingAdd, setInternalPendingAdd] = useState(false);
  const [internalPendingRemovals, setInternalPendingRemovals] = useState<readonly string[]>([]);
  const [internalErrors, setInternalErrors] = useState<readonly InternalOperationError[]>([]);
  const [announcement, setAnnouncement] = useState("");

  const blockerIds = useMemo(() => new Set(blockers.map((blocker) => blocker.id)), [blockers]);
  const candidateById = useMemo(
    () => new Map(blockerOptions.map((candidate) => [candidate.id, candidate])),
    [blockerOptions],
  );
  const comboboxOptions: readonly ComboboxOption[] = blockerOptions.map((candidate) => {
    const currentTask = candidate.id === task.id;
    const existingBlocker = blockerIds.has(candidate.id);
    const suffix = currentTask
      ? "current Task"
      : existingBlocker
        ? "already a blocker"
        : TASK_STATUS_LABEL[candidate.status];
    return {
      value: candidate.id,
      label: `${candidate.title} — ${suffix}`,
      disabled: currentTask || existingBlocker,
    };
  });

  const allErrors = [...operationErrors, ...internalErrors];
  const addErrors = allErrors.filter(
    (operationError) =>
      operationError.operation === "add" &&
      (operationError.taskId === undefined || operationError.taskId === selectedBlockerId),
  );
  const addPending = pendingAdd || internalPendingAdd;
  const mutationsDisabled = readOnly || disabled;
  const unresolvedBlockers = blockers.filter((blocker) => !isTerminal(blocker.status));

  useEffect(() => {
    if (!addDialogOpen) return;
    document.getElementById(comboboxId)?.focus();
  }, [addDialogOpen, comboboxId]);

  function changeQuery(nextQuery: string) {
    setQuery(nextQuery);
    setSelectionError(null);
    onSearchQueryChange?.(nextQuery);
  }

  function closeAddDialog() {
    if (addPending) return;
    setAddDialogOpen(false);
    setQuery("");
    setSelectedBlockerId(null);
    setSelectionError(null);
    setInternalErrors((current) => current.filter((item) => item.operation !== "add"));
  }

  async function addBlocker() {
    if (!selectedBlockerId) {
      setSelectionError("Choose a Task to add as a blocker.");
      return;
    }
    if (!onAddBlocker || addPending) return;

    const selectedTask = candidateById.get(selectedBlockerId);
    const key = operationKey("add", "BLOCKER", selectedBlockerId);
    setInternalErrors((current) => current.filter((item) => item.key !== key));
    setInternalPendingAdd(true);

    try {
      await onAddBlocker(selectedBlockerId);
      setAnnouncement(`Blocker added: ${selectedTask?.title ?? "Task"}.`);
      closeAddDialogAfterSave();
    } catch {
      setInternalErrors((current) => [
        ...current.filter((item) => item.key !== key),
        {
          key,
          operation: "add",
          relationship: "BLOCKER",
          taskId: selectedBlockerId,
          message: INTERNAL_ADD_FAILURE,
          onRetry: () => void addBlocker(),
        },
      ]);
    } finally {
      setInternalPendingAdd(false);
    }
  }

  function closeAddDialogAfterSave() {
    setAddDialogOpen(false);
    setQuery("");
    setSelectedBlockerId(null);
    setSelectionError(null);
    setInternalErrors((current) => current.filter((item) => item.operation !== "add"));
  }

  function removalPending(taskId: string, relationship: DependencyRelationship): boolean {
    const key = operationKey("remove", relationship, taskId);
    return (
      internalPendingRemovals.includes(key) ||
      pendingRemovals.some(
        (pending) => pending.taskId === taskId && pending.relationship === relationship,
      )
    );
  }

  async function removeDependency(
    dependencyTask: DependencyEditorTask,
    relationship: DependencyRelationship,
  ) {
    if (!onRemoveDependency || removalPending(dependencyTask.id, relationship)) return;
    const key = operationKey("remove", relationship, dependencyTask.id);
    setInternalErrors((current) => current.filter((item) => item.key !== key));
    setInternalPendingRemovals((current) => (current.includes(key) ? current : [...current, key]));

    try {
      await onRemoveDependency(dependencyTask.id, relationship);
      setAnnouncement(`Task dependency unlinked: ${dependencyTask.title}.`);
    } catch {
      setInternalErrors((current) => [
        ...current.filter((item) => item.key !== key),
        {
          key,
          operation: "remove",
          relationship,
          taskId: dependencyTask.id,
          message: INTERNAL_REMOVE_FAILURE,
          onRetry: () => void removeDependency(dependencyTask, relationship),
        },
      ]);
    } finally {
      setInternalPendingRemovals((current) => current.filter((item) => item !== key));
    }
  }

  const classes = ["lifeos-dependency-editor", className].filter(Boolean).join(" ");

  if (loading) {
    return <DependencyEditorSkeleton {...(className ? { className } : {})} />;
  }

  if (error) {
    return (
      <Surface as="section" title="Dependencies" className={classes}>
        <ErrorState
          scope="region"
          title="Task dependencies couldn't load"
          description={error || "Task details are still available."}
          {...(onRetry ? { onRetry } : {})}
        />
      </Surface>
    );
  }

  return (
    <Surface
      as="section"
      title="Dependencies"
      titleAction={
        onAddBlocker && !readOnly ? (
          <Button
            ref={addTriggerRef}
            size="sm"
            variant="secondary"
            iconStart={Plus}
            onClick={() => setAddDialogOpen(true)}
            disabled={disabled}
          >
            Add blocker
          </Button>
        ) : undefined
      }
      className={classes}
    >
      <Text tone="secondary" size="sm">
        Link the Tasks that must finish before this Task can move forward.
      </Text>

      {readOnly ? <InlineMessage tone="info">{readOnlyReason}</InlineMessage> : null}
      {disabled ? <InlineMessage tone="warning">{disabledReason}</InlineMessage> : null}

      {unresolvedBlockers.length > 0 ? (
        <InlineMessage tone="warning">
          {unresolvedBlockers.length === 1
            ? "This Task has 1 unresolved blocker. Open it to review or mark it done."
            : `This Task has ${unresolvedBlockers.length} unresolved blockers. Open them to review or mark them done.`}
        </InlineMessage>
      ) : blockers.length > 0 ? (
        <InlineMessage tone="success">
          All blockers are resolved. This Task can move forward.
        </InlineMessage>
      ) : null}

      <DependencyList
        title="Blocked by"
        emptyTitle="No blockers"
        emptyDescription="This Task can proceed without another Task dependency."
        relationship="BLOCKER"
        tasks={blockers}
        mutationsDisabled={mutationsDisabled}
        {...(onRemoveDependency ? { onRemoveDependency: removeDependency } : {})}
        {...(onOpenTask ? { onOpenTask } : {})}
        removalPending={removalPending}
        operationErrors={allErrors}
      />

      <DependencyList
        title="Blocks"
        emptyTitle="Doesn't block other Tasks"
        emptyDescription="No other Task is waiting for this Task to finish."
        relationship="DEPENDENT"
        tasks={dependents}
        mutationsDisabled={mutationsDisabled}
        {...(onRemoveDependency ? { onRemoveDependency: removeDependency } : {})}
        {...(onOpenTask ? { onOpenTask } : {})}
        removalPending={removalPending}
        operationErrors={allErrors}
      />

      <LiveRegion message={announcement} />

      <Dialog
        open={addDialogOpen}
        onClose={closeAddDialog}
        title="Add blocker"
        description={`Choose a Task that must finish before “${task.title}” can move forward.`}
        size="md"
        dismissible={!addPending}
        className="lifeos-dependency-editor__dialog"
      >
        <div className="lifeos-dependency-editor__dialog-content">
          <Combobox
            id={comboboxId}
            label="Task blocker"
            description="The current Task and existing blockers can't be selected."
            value={selectedBlockerId}
            onValueChange={(value) => {
              setSelectedBlockerId(value);
              setSelectionError(null);
              setInternalErrors((current) => current.filter((item) => item.operation !== "add"));
            }}
            query={query}
            onQueryChange={changeQuery}
            options={comboboxOptions}
            placeholder="Search Tasks"
            loading={searchLoading}
            loadingLabel="Searching Tasks…"
            noResultsMessage={
              query.trim()
                ? `No Tasks match “${query.trim()}”. Try fewer words.`
                : "Type to search Tasks."
            }
            {...(selectionError ? { error: selectionError } : {})}
            disabled={addPending}
          />

          {addErrors.map((operationError, index) => (
            <OperationErrorMessage
              key={`${operationError.taskId ?? "add"}:${index}`}
              error={operationError}
            />
          ))}

          <div className="lifeos-dependency-editor__dialog-actions">
            <Button variant="secondary" onClick={closeAddDialog} disabled={addPending}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => void addBlocker()}
              loading={addPending}
              loadingLabel="Adding blocker"
            >
              Add blocker
            </Button>
          </div>
        </div>
      </Dialog>
    </Surface>
  );
}

interface DependencyListProps {
  readonly title: string;
  readonly emptyTitle: string;
  readonly emptyDescription: string;
  readonly relationship: DependencyRelationship;
  readonly tasks: readonly DependencyEditorTask[];
  readonly mutationsDisabled: boolean;
  readonly onRemoveDependency?: (
    task: DependencyEditorTask,
    relationship: DependencyRelationship,
  ) => void;
  readonly onOpenTask?: (taskId: string) => void;
  readonly removalPending: (taskId: string, relationship: DependencyRelationship) => boolean;
  readonly operationErrors: readonly DependencyEditorOperationError[];
}

function DependencyList({
  title,
  emptyTitle,
  emptyDescription,
  relationship,
  tasks,
  mutationsDisabled,
  onRemoveDependency,
  onOpenTask,
  removalPending,
  operationErrors,
}: DependencyListProps) {
  const headingId = useId();

  return (
    <section className="lifeos-dependency-editor__group" aria-labelledby={headingId}>
      <div className="lifeos-dependency-editor__group-heading">
        <Heading level={3} size="sm" id={headingId}>
          {title}
        </Heading>
        <Text numeric tone="muted" size="xs">
          {tasks.length}
        </Text>
      </div>

      {tasks.length === 0 ? (
        <div className="lifeos-dependency-editor__empty">
          <Heading level={4} size="xs">
            {emptyTitle}
          </Heading>
          <Text tone="secondary" size="sm">
            {emptyDescription}
          </Text>
        </div>
      ) : (
        <ul className="lifeos-dependency-editor__list">
          {tasks.map((dependencyTask) => {
            const pending = removalPending(dependencyTask.id, relationship);
            const errors = operationErrors.filter(
              (operationError) =>
                operationError.operation === "remove" &&
                operationError.relationship === relationship &&
                operationError.taskId === dependencyTask.id,
            );
            const unresolved = relationship === "BLOCKER" && !isTerminal(dependencyTask.status);

            return (
              <li
                key={dependencyTask.id}
                className={["lifeos-dependency-editor__item", pending && "is-pending"]
                  .filter(Boolean)
                  .join(" ")}
                aria-busy={pending || undefined}
              >
                <div className="lifeos-dependency-editor__identity">
                  <Heading level={4} size="xs" className="lifeos-dependency-editor__task-title">
                    {dependencyTask.href ? (
                      <Link href={dependencyTask.href}>{dependencyTask.title}</Link>
                    ) : (
                      dependencyTask.title
                    )}
                  </Heading>
                  <div className="lifeos-dependency-editor__badges">
                    <Badge tone={TASK_STATUS_BADGE_TONE[dependencyTask.status]}>
                      {TASK_STATUS_LABEL[dependencyTask.status]}
                    </Badge>
                    <Badge tone={TASK_PRIORITY_BADGE_TONE[dependencyTask.priority]}>
                      {TASK_PRIORITY_LABEL[dependencyTask.priority]}
                    </Badge>
                    {unresolved ? <Badge tone="warning">Unresolved blocker</Badge> : null}
                    {relationship === "BLOCKER" && !unresolved ? (
                      <Badge tone="success">Resolved blocker</Badge>
                    ) : null}
                  </div>
                </div>

                <div
                  className="lifeos-dependency-editor__item-actions"
                  role="group"
                  aria-label={`Actions for ${dependencyTask.title}`}
                >
                  {!dependencyTask.href && onOpenTask ? (
                    <Button
                      variant="link"
                      size="sm"
                      iconEnd={ArrowUpRight}
                      onClick={() => onOpenTask(dependencyTask.id)}
                    >
                      {unresolved ? "Open blocker" : "Open task"}
                    </Button>
                  ) : null}
                  {onRemoveDependency ? (
                    <IconButton
                      icon={Link2Off}
                      label={`Unlink ${dependencyTask.title} as ${relationship === "BLOCKER" ? "a blocker" : "a dependent"}`}
                      size="sm"
                      variant="ghost"
                      onClick={() => onRemoveDependency(dependencyTask, relationship)}
                      disabled={mutationsDisabled || pending}
                    />
                  ) : null}
                </div>

                {pending ? (
                  <InlineMessage tone="info" announce="status">
                    Unlinking Task dependency…
                  </InlineMessage>
                ) : null}

                {errors.map((operationError, index) => (
                  <OperationErrorMessage
                    key={`${operationError.relationship}:${operationError.taskId}:${index}`}
                    error={operationError}
                  />
                ))}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function OperationErrorMessage({ error }: { readonly error: DependencyEditorOperationError }) {
  const message =
    error.message ??
    (error.reason
      ? dependencyEditorErrorMessage(error.reason)
      : error.operation === "remove"
        ? INTERNAL_REMOVE_FAILURE
        : INTERNAL_ADD_FAILURE);
  return (
    <div className="lifeos-dependency-editor__operation-error">
      <InlineMessage tone="danger" announce="alert">
        {message}
      </InlineMessage>
      {error.onRetry ? (
        <Button variant="link" size="sm" onClick={error.onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

function DependencyEditorSkeleton({ className }: { readonly className?: string }) {
  return (
    <Surface
      as="section"
      title="Dependencies"
      className={["lifeos-dependency-editor", "is-loading", className].filter(Boolean).join(" ")}
    >
      <div aria-hidden="true" className="lifeos-dependency-editor__skeleton">
        <Skeleton width="70%" />
        <Skeleton shape="block" height="2.75rem" />
        <Skeleton width="35%" />
        <Skeleton shape="block" height="4.5rem" />
        <Skeleton width="30%" />
        <Skeleton shape="block" height="4.5rem" />
      </div>
      <VisuallyHidden>Loading Task dependencies.</VisuallyHidden>
    </Surface>
  );
}
