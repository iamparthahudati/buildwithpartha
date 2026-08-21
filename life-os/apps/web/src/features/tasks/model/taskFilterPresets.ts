/**
 * URL-compatible Task summary filter presets (LOS-0811).
 *
 * A preset owns only the query keys represented by the summary cards:
 * `status` and `overdue`. Applying one preserves every other Tasks-screen
 * filter (search, Project, priority, Label, dates, sort and view), while
 * dropping `page` because a changed result set must start on its first page.
 *
 * The functions take and return `URLSearchParams` without reading or writing
 * browser history. LOS-0812/0813 can therefore compose them with React Router
 * without this feature model becoming a second source of route state.
 */

export type TaskFilterPresetId = "ALL" | "TO_DO" | "IN_PROGRESS" | "DONE" | "BLOCKED" | "OVERDUE";

export interface TaskFilterPresetDefinition {
  readonly id: TaskFilterPresetId;
  readonly label: string;
}

export const TASK_FILTER_PRESETS: readonly TaskFilterPresetDefinition[] = Object.freeze([
  { id: "ALL", label: "All" },
  { id: "TO_DO", label: "To Do" },
  { id: "IN_PROGRESS", label: "In progress" },
  { id: "DONE", label: "Done" },
  { id: "BLOCKED", label: "Blocked" },
  { id: "OVERDUE", label: "Overdue" },
]);

const STATUS_PRESETS = new Set<TaskFilterPresetId>(["TO_DO", "IN_PROGRESS", "DONE", "BLOCKED"]);

/**
 * Applies a summary preset to a copy of the current query parameters.
 * The source instance is never mutated.
 */
export function applyTaskFilterPreset(
  current: URLSearchParams,
  preset: TaskFilterPresetId,
): URLSearchParams {
  const next = new URLSearchParams(current);

  next.delete("status");
  next.delete("overdue");
  next.delete("page");

  if (STATUS_PRESETS.has(preset)) {
    next.set("status", preset);
  } else if (preset === "OVERDUE") {
    next.set("overdue", "true");
  }

  return next;
}

/**
 * Resolves the active summary preset from its owned URL keys.
 *
 * `null` means the URL has a valid custom combination that no single summary
 * card represents (for example `status=CANCELLED`, several statuses, or a
 * status combined with `overdue=true`). Unknown values also return `null`
 * rather than silently presenting the broad "All" card as active.
 */
export function readTaskFilterPreset(params: URLSearchParams): TaskFilterPresetId | null {
  const statuses = params.getAll("status");
  const overdue = params.get("overdue");

  if (statuses.length === 0 && (overdue === null || overdue === "false")) {
    return "ALL";
  }

  if (statuses.length === 0 && overdue === "true") {
    return "OVERDUE";
  }

  if (statuses.length !== 1 || overdue !== null) {
    return null;
  }

  const status = statuses[0];
  return status !== undefined && STATUS_PRESETS.has(status as TaskFilterPresetId)
    ? (status as TaskFilterPresetId)
    : null;
}
