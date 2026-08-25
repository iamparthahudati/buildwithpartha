import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { ConfirmDialog, Dialog, EmptyState, ErrorState } from "@components/feedback";
import { PageHeader, Tabs, type TabItem } from "@components/navigation";
import { Button, Icon, SkeletonCard, Text } from "@components/ui";

import type { Sprint, SprintScopeChangeEvent, SprintTask } from "../model/sprint";
import { SprintCard } from "./SprintCard";
import { SprintFormDialog, type SprintFormData } from "./SprintFormDialog";
import {
  SprintRetrospectiveDialog,
  type SprintRetrospectiveData,
} from "./SprintRetrospectiveDialog";
import { SprintScopeChangeHistory } from "./SprintScopeChangeHistory";
import { SprintTaskCommitmentList } from "./SprintTaskCommitmentList";
import {
  SprintTaskDialog,
  type SprintTaskFormData,
  type SprintTaskOption,
} from "./SprintTaskDialog";
import "./sprints-screen.css";

export type SprintsView = "active" | "upcoming" | "completed";

export interface SprintScreenRecord {
  readonly sprint: Sprint;
  readonly tasks: readonly SprintTask[];
  readonly events: readonly SprintScopeChangeEvent[];
}

export interface SprintsScreenProps {
  readonly records?: readonly SprintScreenRecord[];
  readonly loading?: boolean;
  readonly error?: string | null;
  readonly view?: SprintsView;
  readonly selectedSprintId?: string | null;
  readonly taskOptions?: readonly SprintTaskOption[];
  readonly actionPending?: boolean;
  readonly actionError?: string;
  readonly locale?: string;
  readonly timeZone?: string;
  readonly onRetry?: () => void;
  readonly onViewChange?: (view: SprintsView) => void;
  readonly onSelectSprint?: (sprintId: string | null) => void;
  readonly onCreateSprint?: (data: SprintFormData) => Promise<void> | void;
  readonly onUpdateSprint?: (sprint: Sprint, data: SprintFormData) => Promise<void> | void;
  readonly onStartSprint?: (sprint: Sprint) => Promise<void> | void;
  readonly onCompleteSprint?: (
    sprint: Sprint,
    data: SprintRetrospectiveData,
  ) => Promise<void> | void;
  readonly onAddTask?: (
    sprint: Sprint,
    data: SprintTaskFormData,
    position: number,
  ) => Promise<void> | void;
  readonly onUpdateTask?: (
    sprint: Sprint,
    task: SprintTask,
    data: SprintTaskFormData,
    position: number,
  ) => Promise<void> | void;
  readonly onRemoveTask?: (sprint: Sprint, task: SprintTask) => Promise<void> | void;
}

export function SprintsScreen({
  records = [],
  loading = false,
  error = null,
  view = "active",
  selectedSprintId = null,
  taskOptions = [],
  actionPending = false,
  actionError,
  locale = "en-US",
  timeZone = "UTC",
  onRetry,
  onViewChange,
  onSelectSprint,
  onCreateSprint,
  onUpdateSprint,
  onStartSprint,
  onCompleteSprint,
  onAddTask,
  onUpdateTask,
  onRemoveTask,
}: SprintsScreenProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingSprintId, setEditingSprintId] = useState<string | null>(null);
  const [scopeSprintId, setScopeSprintId] = useState<string | null>(null);
  const [taskDialogCommitmentId, setTaskDialogCommitmentId] = useState<string | null | undefined>();
  const [retrospectiveSprintId, setRetrospectiveSprintId] = useState<string | null>(null);
  const [startSprintId, setStartSprintId] = useState<string | null>(null);
  const [removeCommitmentId, setRemoveCommitmentId] = useState<string | null>(null);

  const activeRecords = useMemo(
    () => records.filter((record) => record.sprint.status === "ACTIVE"),
    [records],
  );
  const upcomingRecords = useMemo(
    () =>
      records
        .filter((record) => record.sprint.status === "PLANNED")
        .sort((left, right) => left.sprint.startDate.localeCompare(right.sprint.startDate)),
    [records],
  );
  const completedRecords = useMemo(
    () =>
      records
        .filter((record) => record.sprint.status === "COMPLETED")
        .sort((left, right) => right.sprint.endDate.localeCompare(left.sprint.endDate)),
    [records],
  );

  const recordById = useMemo(
    () => new Map(records.map((record) => [record.sprint.id, record])),
    [records],
  );
  const editingRecord = editingSprintId ? recordById.get(editingSprintId) : undefined;
  const scopeRecord = scopeSprintId ? recordById.get(scopeSprintId) : undefined;
  const retrospectiveRecord = retrospectiveSprintId
    ? recordById.get(retrospectiveSprintId)
    : undefined;
  const startingRecord = startSprintId ? recordById.get(startSprintId) : undefined;
  const editingTask =
    scopeRecord && taskDialogCommitmentId
      ? scopeRecord.tasks.find((task) => task.id === taskDialogCommitmentId)
      : undefined;
  const removingTask =
    scopeRecord && removeCommitmentId
      ? scopeRecord.tasks.find((task) => task.id === removeCommitmentId)
      : undefined;

  function selectSprint(id: string | null) {
    onSelectSprint?.(id);
  }

  function openScope(sprint: Sprint) {
    setScopeSprintId(sprint.id);
    selectSprint(sprint.id);
  }

  function openEdit(sprint: Sprint) {
    setEditingSprintId(sprint.id);
    setFormOpen(true);
    selectSprint(sprint.id);
  }

  function renderView(
    viewRecords: readonly SprintScreenRecord[],
    emptyTitle: string,
    emptyDescription: string,
  ) {
    if (loading) {
      return (
        <div className="sprints-screen__grid" aria-label="Loading Sprints">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      );
    }

    if (error) {
      return (
        <ErrorState
          scope="region"
          title="We couldn't load Sprints"
          description={error}
          {...(onRetry ? { onRetry } : {})}
        />
      );
    }

    if (viewRecords.length === 0) {
      return (
        <EmptyState
          variant="first-use"
          title={emptyTitle}
          description={emptyDescription}
          {...(onCreateSprint
            ? { actionLabel: "Plan a Sprint", onAction: () => setFormOpen(true) }
            : {})}
        />
      );
    }

    const ordered = [...viewRecords].sort((left, right) => {
      if (left.sprint.id === selectedSprintId) return -1;
      if (right.sprint.id === selectedSprintId) return 1;
      return 0;
    });

    return (
      <div className="sprints-screen__grid">
        {ordered.map((record) => (
          <SprintCard
            key={record.sprint.id}
            sprint={record.sprint}
            headingLevel={2}
            {...(onStartSprint
              ? {
                  onStartSprint: (sprint: Sprint) => {
                    setStartSprintId(sprint.id);
                    selectSprint(sprint.id);
                  },
                }
              : {})}
            {...(onCompleteSprint
              ? {
                  onCompleteSprint: (sprint: Sprint) => {
                    setRetrospectiveSprintId(sprint.id);
                    selectSprint(sprint.id);
                  },
                }
              : {})}
            {...(onAddTask || onUpdateTask || onRemoveTask ? { onEditScope: openScope } : {})}
            {...(onUpdateSprint ? { onEditSprint: openEdit } : {})}
            onViewRetrospective={(sprint) => {
              setRetrospectiveSprintId(sprint.id);
              selectSprint(sprint.id);
            }}
          />
        ))}
      </div>
    );
  }

  const tabs: readonly TabItem[] = [
    {
      id: "active",
      label: `Active (${activeRecords.length})`,
      panel: renderView(
        activeRecords,
        "No active Sprint",
        "Start a planned Sprint when you're ready to begin its commitment window.",
      ),
    },
    {
      id: "upcoming",
      label: `Upcoming (${upcomingRecords.length})`,
      panel: renderView(
        upcomingRecords,
        "No upcoming Sprints",
        "Plan a Sprint with a goal, dates, capacity, and committed Tasks.",
      ),
    },
    {
      id: "completed",
      label: `Completed (${completedRecords.length})`,
      panel: renderView(
        completedRecords,
        "No completed Sprints",
        "Completed Sprint metrics and retrospective notes will appear here.",
      ),
    },
  ];

  return (
    <main className="sprints-screen" aria-busy={loading || actionPending}>
      <PageHeader
        title="Sprints"
        description="Plan a focused commitment window, track live Task progress, and capture what you learned."
        {...(onCreateSprint
          ? {
              primaryAction: (
                <Button onClick={() => setFormOpen(true)}>
                  <Icon icon={Plus} decorative size="sm" />
                  Plan a Sprint
                </Button>
              ),
            }
          : {})}
      />

      <Tabs
        items={tabs}
        selectedId={view}
        onSelectedIdChange={(id) => onViewChange?.(id as SprintsView)}
        label="Sprint views"
      />

      <SprintFormDialog
        key={editingRecord?.sprint.id ?? "create-sprint"}
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingSprintId(null);
        }}
        mode={editingRecord ? "edit" : "create"}
        initialValues={
          editingRecord
            ? {
                id: editingRecord.sprint.id,
                name: editingRecord.sprint.name,
                ...(editingRecord.sprint.goal ? { goal: editingRecord.sprint.goal } : {}),
                startDate: editingRecord.sprint.startDate,
                endDate: editingRecord.sprint.endDate,
                targetCapacityPoints: editingRecord.sprint.targetCapacityPoints,
                status: editingRecord.sprint.status,
              }
            : null
        }
        isPending={actionPending}
        {...(actionError ? { error: actionError } : {})}
        onSubmit={async (data) => {
          try {
            if (editingRecord && onUpdateSprint) {
              await onUpdateSprint(editingRecord.sprint, data);
            } else if (onCreateSprint) {
              await onCreateSprint(data);
            }
            setFormOpen(false);
            setEditingSprintId(null);
          } catch {
            // Mutation state supplies the dialog error and the form remains open for correction.
          }
        }}
      />

      <Dialog
        open={scopeRecord !== undefined}
        onClose={() => {
          setScopeSprintId(null);
          setTaskDialogCommitmentId(undefined);
          setRemoveCommitmentId(null);
        }}
        title={`Manage scope — ${scopeRecord?.sprint.name ?? "Sprint"}`}
        size="lg"
      >
        {scopeRecord ? (
          <div className="sprints-screen__scope">
            <SprintTaskCommitmentList
              tasks={scopeRecord.tasks}
              isEditable={scopeRecord.sprint.status !== "COMPLETED"}
              {...(onAddTask ? { onAddTask: () => setTaskDialogCommitmentId(null) } : {})}
              {...(onUpdateTask
                ? { onEditTask: (commitmentId) => setTaskDialogCommitmentId(commitmentId) }
                : {})}
              {...(onRemoveTask
                ? { onRemoveTask: (commitmentId) => setRemoveCommitmentId(commitmentId) }
                : {})}
            />
            <SprintScopeChangeHistory
              events={scopeRecord.events}
              locale={locale}
              timeZone={timeZone}
            />
          </div>
        ) : null}
      </Dialog>

      <SprintTaskDialog
        key={`${scopeSprintId ?? "none"}-${taskDialogCommitmentId ?? "add"}`}
        open={scopeRecord !== undefined && taskDialogCommitmentId !== undefined}
        onClose={() => setTaskDialogCommitmentId(undefined)}
        {...(editingTask ? { initialTask: editingTask } : {})}
        taskOptions={taskOptions.filter(
          (option) =>
            editingTask?.taskId === option.id ||
            !scopeRecord?.tasks.some((task) => task.taskId === option.id),
        )}
        pending={actionPending}
        {...(actionError ? { error: actionError } : {})}
        onSubmit={async (data) => {
          if (!scopeRecord) return;
          try {
            if (editingTask && onUpdateTask) {
              await onUpdateTask(
                scopeRecord.sprint,
                editingTask,
                data,
                scopeRecord.tasks.indexOf(editingTask),
              );
            } else if (onAddTask) {
              await onAddTask(scopeRecord.sprint, data, scopeRecord.tasks.length);
            }
            setTaskDialogCommitmentId(undefined);
          } catch {
            // Mutation state supplies the dialog error and the form remains open for correction.
          }
        }}
      />

      <ConfirmDialog
        open={startingRecord !== undefined}
        onClose={() => setStartSprintId(null)}
        title={`Start “${startingRecord?.sprint.name ?? "Sprint"}”?`}
        description="This makes the Sprint active and records later Task or point changes in scope history. Only one Sprint can be active."
        confirmLabel="Start Sprint"
        pending={actionPending}
        {...(actionError ? { error: actionError } : {})}
        onConfirm={() => {
          if (!startingRecord || !onStartSprint) return;
          void (async () => {
            try {
              await onStartSprint(startingRecord.sprint);
              setStartSprintId(null);
            } catch {
              // Mutation state supplies the confirmation error.
            }
          })();
        }}
      />

      <ConfirmDialog
        open={removingTask !== undefined}
        onClose={() => setRemoveCommitmentId(null)}
        title={`Remove “${removingTask?.title ?? "Task"}” from this Sprint?`}
        description="The Task stays in LifeOS. Its Sprint commitment is removed and the scope change remains in Sprint history."
        confirmLabel="Remove from Sprint"
        pending={actionPending}
        {...(actionError ? { error: actionError } : {})}
        onConfirm={() => {
          if (!scopeRecord || !removingTask || !onRemoveTask) return;
          void (async () => {
            try {
              await onRemoveTask(scopeRecord.sprint, removingTask);
              setRemoveCommitmentId(null);
            } catch {
              // Mutation state supplies the confirmation error.
            }
          })();
        }}
      />

      <SprintRetrospectiveDialog
        open={retrospectiveRecord !== undefined}
        onClose={() => setRetrospectiveSprintId(null)}
        {...(retrospectiveRecord ? { sprint: retrospectiveRecord.sprint } : {})}
        carryOverTargets={upcomingRecords
          .filter((record) => record.sprint.id !== retrospectiveRecord?.sprint.id)
          .map((record) => ({ id: record.sprint.id, name: record.sprint.name }))}
        isPending={actionPending}
        {...(actionError ? { error: actionError } : {})}
        onSubmit={async (data) => {
          if (!retrospectiveRecord || !onCompleteSprint) return;
          try {
            await onCompleteSprint(retrospectiveRecord.sprint, data);
            setRetrospectiveSprintId(null);
          } catch {
            // Mutation state supplies the dialog error and the form remains open for correction.
          }
        }}
      />

      {actionError && !formOpen && !scopeRecord && !startingRecord && !retrospectiveRecord ? (
        <div role="alert" className="sprints-screen__action-error">
          <Text tone="danger">{actionError}</Text>
        </div>
      ) : null}
    </main>
  );
}
