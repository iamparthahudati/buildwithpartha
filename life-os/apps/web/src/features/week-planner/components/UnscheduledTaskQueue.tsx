import { useId, useMemo, useState, type ReactNode } from "react";

import { DataTable, type ActiveFilterChip, type DataTableColumn } from "@components/navigation";
import {
  Badge,
  Button,
  Heading,
  PRIORITY_TONE,
  Select,
  TASK_STATUS_TONE,
  Text,
  TextInput,
} from "@components/ui";

import {
  EMPTY_WEEK_PLANNER_TASK_FILTERS,
  filterWeekPlannerTasks,
  formatMinutesToHours,
  type TaskAllocationValue,
  type WeekPlannerDayOption,
  type WeekPlannerTask,
  type WeekPlannerTaskFilters,
  type WeekPlannerTaskPriority,
  type WeekPlannerTaskStatus,
  type WeeklyOutcome,
} from "../model/weekPlanner";
import { PlannerMutationStatus } from "./PlannerMutationStatus";
import { TaskAllocationDialog, type TaskAllocationMode } from "./TaskAllocationDialog";
import "./unscheduled-task-queue.css";

export interface UnscheduledTaskQueueProps {
  readonly tasks?: readonly WeekPlannerTask[];
  readonly days: readonly WeekPlannerDayOption[];
  readonly outcomes?: readonly WeeklyOutcome[];
  readonly loading?: boolean;
  readonly error?: string;
  readonly onRetry?: () => void;
  readonly onAllocateTask?: (taskId: string, value: TaskAllocationValue) => void;
  readonly onCarryTask?: (taskId: string, value: TaskAllocationValue) => void;
  readonly onRetryTask?: (taskId: string) => void;
  readonly editable?: boolean;
  readonly className?: string;
}

const PRIORITY_OPTIONS = [
  { value: "ALL", label: "All priorities" },
  { value: "P1", label: "P1 — High" },
  { value: "P2", label: "P2 — Medium" },
  { value: "P3", label: "P3 — Low" },
  { value: "P4", label: "P4 — Someday" },
] as const;

function taskStatusLabel(status: WeekPlannerTaskStatus) {
  switch (status) {
    case "TO_DO":
      return "To Do";
    case "IN_PROGRESS":
      return "In progress";
    case "BLOCKED":
      return "Blocked";
    case "DONE":
      return "Done";
    case "CANCELLED":
      return "Cancelled";
  }
}

interface TaskActionProps {
  readonly task: WeekPlannerTask;
  readonly editable: boolean;
  readonly onOpen: (task: WeekPlannerTask, mode: TaskAllocationMode) => void;
  readonly canAllocate: boolean;
  readonly canCarry: boolean;
}

function TaskAction({ task, editable, onOpen, canAllocate, canCarry }: TaskActionProps) {
  const pending = task.mutation?.type === "saving";

  if (!editable || pending) {
    return pending ? (
      <Text inline size="sm" tone="secondary">
        Saving…
      </Text>
    ) : null;
  }

  if (task.isCarryOverCandidate && canCarry) {
    return (
      <Button variant="secondary" size="sm" onClick={() => onOpen(task, "carry")}>
        Carry task
      </Button>
    );
  }

  return canAllocate ? (
    <Button variant="secondary" size="sm" onClick={() => onOpen(task, "allocate")}>
      Allocate task
    </Button>
  ) : null;
}

function TaskIdentity({ task }: { readonly task: WeekPlannerTask }) {
  return (
    <div className="lifeos-unscheduled-task-queue__identity">
      <Text weight="medium">{task.title}</Text>
      <div className="lifeos-unscheduled-task-queue__meta">
        {task.projectName ? (
          <Text inline size="xs" tone="secondary">
            {task.projectName}
          </Text>
        ) : null}
        {task.isCarryOverCandidate ? <Badge tone="warning">Carry-over candidate</Badge> : null}
      </div>
    </div>
  );
}

export function UnscheduledTaskQueue({
  tasks = [],
  days,
  outcomes = [],
  loading = false,
  error,
  onRetry,
  onAllocateTask,
  onCarryTask,
  onRetryTask,
  editable = true,
  className,
}: UnscheduledTaskQueueProps) {
  const titleId = useId();
  const [filters, setFilters] = useState<WeekPlannerTaskFilters>(EMPTY_WEEK_PLANNER_TASK_FILTERS);
  const [dialog, setDialog] = useState<{ taskId: string; mode: TaskAllocationMode } | null>(null);
  const filteredTasks = useMemo(() => filterWeekPlannerTasks(tasks, filters), [tasks, filters]);
  const projects = useMemo(
    () =>
      Array.from(
        new Set(tasks.flatMap((task) => (task.projectName ? [task.projectName] : []))),
      ).sort((a, b) => a.localeCompare(b)),
    [tasks],
  );
  const dialogTask = dialog ? (tasks.find((task) => task.id === dialog.taskId) ?? null) : null;

  const activeChips: readonly ActiveFilterChip[] = [
    ...(filters.search
      ? [
          {
            id: "search",
            label: `Search: ${filters.search}`,
            onRemove: () => setFilters((current) => ({ ...current, search: "" })),
          },
        ]
      : []),
    ...(filters.project
      ? [
          {
            id: "project",
            label: `Project: ${filters.project}`,
            onRemove: () => setFilters((current) => ({ ...current, project: "" })),
          },
        ]
      : []),
    ...(filters.priority !== "ALL"
      ? [
          {
            id: "priority",
            label: `Priority: ${filters.priority}`,
            onRemove: () => setFilters((current) => ({ ...current, priority: "ALL" })),
          },
        ]
      : []),
  ];

  function openTask(task: WeekPlannerTask, mode: TaskAllocationMode) {
    setDialog({ taskId: task.id, mode });
  }

  function mutationStatus(task: WeekPlannerTask): ReactNode {
    return (
      <PlannerMutationStatus
        {...(task.mutation ? { mutation: task.mutation } : {})}
        {...(onRetryTask
          ? { onRetry: () => onRetryTask(task.id), retryLabel: `Retry ${task.title}` }
          : {})}
        className="lifeos-unscheduled-task-queue__mutation"
      />
    );
  }

  const columns: readonly DataTableColumn<WeekPlannerTask>[] = [
    { key: "task", header: "Task", render: (task) => <TaskIdentity task={task} />, truncate: true },
    {
      key: "status",
      header: "Status",
      render: (task) => (
        <Badge tone={TASK_STATUS_TONE[task.status] ?? "neutral"}>
          {taskStatusLabel(task.status)}
        </Badge>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      render: (task) => (
        <Badge tone={PRIORITY_TONE[task.priority] ?? "neutral"}>{task.priority}</Badge>
      ),
    },
    {
      key: "estimate",
      header: "Estimate",
      render: (task) =>
        task.estimateMinutes === undefined ? (
          <Text inline size="sm" tone="muted">
            Not set
          </Text>
        ) : (
          <Text inline size="sm" numeric>
            {formatMinutesToHours(task.estimateMinutes)}
          </Text>
        ),
    },
    {
      key: "action",
      header: "Plan",
      render: (task) => (
        <div className="lifeos-unscheduled-task-queue__action">
          <TaskAction
            task={task}
            editable={editable}
            onOpen={openTask}
            canAllocate={Boolean(onAllocateTask)}
            canCarry={Boolean(onCarryTask)}
          />
          {mutationStatus(task)}
        </div>
      ),
    },
  ];

  const hasFilters = activeChips.length > 0;

  return (
    <section
      className={["lifeos-unscheduled-task-queue", className].filter(Boolean).join(" ")}
      aria-labelledby={titleId}
    >
      <div className="lifeos-unscheduled-task-queue__header">
        <div>
          <Heading id={titleId} level={3} size="sm">
            Unscheduled tasks
          </Heading>
          <Text size="sm" tone="secondary">
            Filter the backlog, then allocate or carry each Task with the same controls on any
            device.
          </Text>
        </div>
      </div>

      <DataTable
        label="Unscheduled tasks"
        columns={columns}
        rows={filteredTasks}
        getRowId={(task) => task.id}
        getRowLabel={(task) => task.title}
        status={
          loading
            ? { type: "loading" }
            : error
              ? { type: "error", message: error, ...(onRetry ? { onRetry } : {}) }
              : { type: "ready" }
        }
        emptyTitle={hasFilters ? "No tasks match these filters." : "No unscheduled tasks"}
        emptyDescription={
          hasFilters
            ? "Clear filters or try a broader search."
            : "Tasks that still need a day will appear here."
        }
        emptyVariant={hasFilters ? "filtered" : "first-use"}
        filters={{
          controls: (
            <>
              <TextInput
                label="Search tasks"
                value={filters.search}
                placeholder="Search by Task or Project"
                onClear={() => setFilters((current) => ({ ...current, search: "" }))}
                clearLabel="Clear Task search"
                onChange={(event) =>
                  setFilters((current) => ({ ...current, search: event.target.value }))
                }
              />
              <Select
                label="Project"
                value={filters.project}
                placeholder="All projects"
                options={projects.map((project) => ({ value: project, label: project }))}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, project: event.target.value }))
                }
              />
              <Select
                label="Priority"
                value={filters.priority}
                options={PRIORITY_OPTIONS}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    priority: event.target.value as WeekPlannerTaskPriority | "ALL",
                  }))
                }
              />
            </>
          ),
          activeChips,
          resultCount: `${filteredTasks.length} ${filteredTasks.length === 1 ? "task" : "tasks"}`,
          ...(hasFilters ? { onClearAll: () => setFilters(EMPTY_WEEK_PLANNER_TASK_FILTERS) } : {}),
        }}
        renderCard={(task) => (
          <article className="lifeos-unscheduled-task-queue__card">
            <TaskIdentity task={task} />
            <div className="lifeos-unscheduled-task-queue__card-badges">
              <Badge tone={TASK_STATUS_TONE[task.status] ?? "neutral"}>
                {taskStatusLabel(task.status)}
              </Badge>
              <Badge tone={PRIORITY_TONE[task.priority] ?? "neutral"}>{task.priority}</Badge>
              <Text inline size="sm" tone="secondary" numeric>
                {task.estimateMinutes === undefined
                  ? "Estimate not set"
                  : formatMinutesToHours(task.estimateMinutes)}
              </Text>
            </div>
            <div className="lifeos-unscheduled-task-queue__card-action">
              <TaskAction
                task={task}
                editable={editable}
                onOpen={openTask}
                canAllocate={Boolean(onAllocateTask)}
                canCarry={Boolean(onCarryTask)}
              />
              {mutationStatus(task)}
            </div>
          </article>
        )}
      />

      <TaskAllocationDialog
        open={dialog !== null && dialogTask !== null && dialogTask.mutation?.type !== "saved"}
        task={dialogTask}
        mode={dialog?.mode ?? "allocate"}
        days={days}
        outcomes={outcomes}
        pending={dialogTask?.mutation?.type === "saving"}
        {...(dialogTask?.mutation?.type === "failed" ? { error: dialogTask.mutation.message } : {})}
        onClose={() => setDialog(null)}
        onSubmit={(taskId, value, mode) => {
          if (mode === "carry") {
            onCarryTask?.(taskId, value);
          } else {
            onAllocateTask?.(taskId, value);
          }
        }}
      />
    </section>
  );
}
