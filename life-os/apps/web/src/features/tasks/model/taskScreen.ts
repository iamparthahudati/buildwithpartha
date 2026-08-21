/**
 * Pure Tasks screen helpers (LOS-0812).
 *
 * Filter, sort, summary and bulk-apply live here so the composed screen and
 * later URL/API integration share one contract instead of re-implementing
 * list behavior in the route.
 */

import type { TaskSummaryCounts } from "../components/TaskSummaryMetrics";
import {
  applyTaskFilterPreset,
  readTaskFilterPreset,
  type TaskFilterPresetId,
} from "./taskFilterPresets";
import type { TaskPriority, TaskRecord, TaskStatus } from "./task";
import { isTaskOverdue, isTaskTerminal } from "./taskPresentation";

export interface TaskProjectOption {
  readonly id: string;
  readonly name: string;
}

export type TasksViewTab = TaskFilterPresetId | "ARCHIVED";

export type TasksViewMode = "list" | "grid" | "table";

export interface TaskListFilters {
  readonly tab: TasksViewTab;
  readonly search: string;
  readonly priority: string;
  readonly projectId: string;
}

export type BulkTaskAction =
  | { readonly type: "STATUS"; readonly status: TaskStatus }
  | { readonly type: "PRIORITY"; readonly priority: TaskPriority }
  | { readonly type: "PROJECT"; readonly projectId: string }
  | { readonly type: "ADD_LABEL"; readonly labelId: string }
  | { readonly type: "REMOVE_LABEL"; readonly labelId: string }
  | { readonly type: "SCHEDULE"; readonly dueAt: string }
  | { readonly type: "CLEAR_SCHEDULE" }
  | { readonly type: "ARCHIVE" };

export interface BulkItemFailure {
  readonly taskId: string;
  readonly title: string;
  readonly errorCode: string;
}

export interface BulkActionOutcome {
  readonly requested: number;
  readonly succeeded: number;
  readonly failed: readonly BulkItemFailure[];
}

export interface TaskSortState {
  readonly optionId: string;
  readonly direction: "asc" | "desc";
}

export const TASKS_VIEW_TABS: readonly { id: TasksViewTab; label: string }[] = Object.freeze([
  { id: "ALL", label: "All" },
  { id: "TO_DO", label: "To Do" },
  { id: "IN_PROGRESS", label: "In progress" },
  { id: "BLOCKED", label: "Blocked" },
  { id: "DONE", label: "Done" },
  { id: "OVERDUE", label: "Overdue" },
  { id: "ARCHIVED", label: "Archived" },
]);

export const TASK_SORT_OPTIONS = Object.freeze([
  { id: "title", label: "Title" },
  { id: "status", label: "Status" },
  { id: "priority", label: "Priority" },
  { id: "dueAt", label: "Due" },
  { id: "updatedAt", label: "Last updated" },
]);

export const DEFAULT_TASK_SORT: TaskSortState = Object.freeze({
  optionId: "updatedAt",
  direction: "desc",
});

const BULK_ERROR_COPY: Readonly<Record<string, string>> = Object.freeze({
  RESOURCE_NOT_FOUND: "This task is no longer available.",
  ACCESS_DENIED: "You can't change this task.",
  CONCURRENCY_CONFLICT: "This task changed. Reload and try again.",
  VALIDATION_FAILED: "This change isn't valid for this task.",
  INTERNAL_ERROR: "We couldn't update this task. Try again.",
});

export function describeBulkError(errorCode: string): string {
  return BULK_ERROR_COPY[errorCode] ?? "We couldn't update this task. Try again.";
}

export function applyTasksViewTab(current: URLSearchParams, tab: TasksViewTab): URLSearchParams {
  if (tab === "ARCHIVED") {
    const next = new URLSearchParams(current);
    next.delete("status");
    next.delete("overdue");
    next.delete("page");
    next.set("archived", "true");
    return next;
  }

  const withoutArchived = new URLSearchParams(current);
  withoutArchived.delete("archived");
  return applyTaskFilterPreset(withoutArchived, tab);
}

export function readTasksViewTab(params: URLSearchParams): TasksViewTab | null {
  if (params.get("archived") === "true") {
    return "ARCHIVED";
  }
  return readTaskFilterPreset(params);
}

export function countTaskSummary(tasks: readonly TaskRecord[], now: Date): TaskSummaryCounts {
  const active = tasks.filter((task) => !task.archivedAt);
  return {
    total: active.length,
    toDo: active.filter((task) => task.status === "TO_DO").length,
    inProgress: active.filter((task) => task.status === "IN_PROGRESS").length,
    done: active.filter((task) => task.status === "DONE").length,
    blocked: active.filter((task) => task.status === "BLOCKED").length,
    overdue: active.filter((task) => isTaskOverdue(toOverdueProjection(task), now)).length,
  };
}

export function filterTasks(
  tasks: readonly TaskRecord[],
  filters: TaskListFilters,
  now: Date,
): readonly TaskRecord[] {
  const query = filters.search.trim().toLowerCase();

  return tasks.filter((task) => {
    if (filters.tab === "ARCHIVED") {
      if (!task.archivedAt) return false;
    } else {
      if (task.archivedAt) return false;
      if (filters.tab === "OVERDUE") {
        if (!isTaskOverdue(toOverdueProjection(task), now)) return false;
      } else if (filters.tab !== "ALL" && task.status !== filters.tab) {
        return false;
      }
    }

    if (filters.priority !== "ALL" && task.priority !== filters.priority) {
      return false;
    }

    if (filters.projectId === "NONE") {
      if (task.project) return false;
    } else if (filters.projectId !== "ALL" && task.project?.id !== filters.projectId) {
      return false;
    }

    if (query !== "") {
      const haystack = [task.title, task.description ?? "", task.project?.name ?? ""]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });
}

export function sortTasks(
  tasks: readonly TaskRecord[],
  sort: TaskSortState,
): readonly TaskRecord[] {
  const list = [...tasks];
  const direction = sort.direction === "asc" ? 1 : -1;

  list.sort((left, right) => {
    const compared = compareTasks(left, right, sort.optionId);
    if (compared !== 0) {
      return compared * direction;
    }
    return left.id.localeCompare(right.id);
  });

  return list;
}

export function paginateTasks(
  tasks: readonly TaskRecord[],
  page: number,
  pageSize: number,
): readonly TaskRecord[] {
  const start = Math.max(0, (page - 1) * pageSize);
  return tasks.slice(start, start + pageSize);
}

export function applyBulkToTasks(
  tasks: readonly TaskRecord[],
  selectedIds: ReadonlySet<string>,
  action: BulkTaskAction,
  context: {
    readonly nowIso: string;
    readonly projects: readonly TaskProjectOption[];
    readonly failIds?: ReadonlySet<string>;
  },
): {
  readonly tasks: readonly TaskRecord[];
  readonly outcome: BulkActionOutcome;
} {
  const failed: BulkItemFailure[] = [];
  const next = tasks.map((task) => {
    if (!selectedIds.has(task.id)) {
      return task;
    }
    if (context.failIds?.has(task.id)) {
      failed.push({
        taskId: task.id,
        title: task.title,
        errorCode: "CONCURRENCY_CONFLICT",
      });
      return task;
    }
    return applyBulkActionToTask(task, action, context);
  });

  const requested = selectedIds.size;
  return {
    tasks: next,
    outcome: {
      requested,
      succeeded: requested - failed.length,
      failed,
    },
  };
}

function applyBulkActionToTask(
  task: TaskRecord,
  action: BulkTaskAction,
  context: { readonly nowIso: string; readonly projects: readonly TaskProjectOption[] },
): TaskRecord {
  switch (action.type) {
    case "STATUS":
      return withVersion({
        ...task,
        status: action.status,
        progress: action.status === "DONE" ? 100 : task.progress,
        isMit: isTaskTerminal({ ...task, status: action.status }) ? false : task.isMit,
        mitDate: isTaskTerminal({ ...task, status: action.status }) ? null : task.mitDate,
        updatedAt: context.nowIso,
      });
    case "PRIORITY":
      return withVersion({ ...task, priority: action.priority, updatedAt: context.nowIso });
    case "PROJECT": {
      const project = context.projects.find((option) => option.id === action.projectId);
      return withVersion({
        ...task,
        project: project
          ? { id: project.id, name: project.name, href: `/life-os/app/projects/${project.id}` }
          : task.project,
        updatedAt: context.nowIso,
      });
    }
    case "ADD_LABEL":
      return task.labelIds.includes(action.labelId)
        ? task
        : withVersion({
            ...task,
            labelIds: [...task.labelIds, action.labelId],
            updatedAt: context.nowIso,
          });
    case "REMOVE_LABEL":
      return task.labelIds.includes(action.labelId)
        ? withVersion({
            ...task,
            labelIds: task.labelIds.filter((id) => id !== action.labelId),
            updatedAt: context.nowIso,
          })
        : task;
    case "SCHEDULE":
      return withVersion({
        ...task,
        dueAt: action.dueAt,
        overdue: false,
        updatedAt: context.nowIso,
      });
    case "CLEAR_SCHEDULE":
      return withVersion({ ...task, dueAt: null, overdue: false, updatedAt: context.nowIso });
    case "ARCHIVE":
      return task.archivedAt
        ? task
        : withVersion({
            ...task,
            archivedAt: context.nowIso,
            isMit: false,
            mitDate: null,
            updatedAt: context.nowIso,
          });
  }
}

function withVersion(task: TaskRecord): TaskRecord {
  return { ...task, version: task.version + 1 };
}

function compareTasks(left: TaskRecord, right: TaskRecord, optionId: string): number {
  switch (optionId) {
    case "title":
      return left.title.localeCompare(right.title);
    case "status":
      return left.status.localeCompare(right.status);
    case "priority":
      return left.priority.localeCompare(right.priority);
    case "dueAt":
      return (left.dueAt ?? "9999").localeCompare(right.dueAt ?? "9999");
    case "updatedAt":
    default:
      return left.updatedAt.localeCompare(right.updatedAt);
  }
}

function toOverdueProjection(task: TaskRecord) {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    dueAt: task.dueAt,
    progress: task.progress,
    commentCount: task.commentCount,
    archivedAt: task.archivedAt,
    overdue: task.overdue,
  };
}
