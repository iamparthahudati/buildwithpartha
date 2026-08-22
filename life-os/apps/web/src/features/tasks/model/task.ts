/**
 * Task list projection used by TaskRow and TaskCard (LOS-0809).
 *
 * This is deliberately a presentation projection rather than a duplicate of
 * the task API response. The Tasks screen will compose canonical Task fields
 * with Project context, comment counts and derived blocker information before
 * handing a row to either responsive renderer.
 */

export type TaskStatus = "TO_DO" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELLED";
export type TaskPriority = "P1" | "P2" | "P3" | "P4";

export interface TaskProjectContext {
  readonly id: string;
  readonly name: string;
  readonly href?: string;
}

export interface TaskListItem {
  readonly id: string;
  readonly title: string;
  readonly status: TaskStatus;
  readonly priority: TaskPriority;
  readonly project?: TaskProjectContext | null;
  /** UTC instant from the API. It is formatted only in the confirmed user timezone. */
  readonly dueAt?: string | null;
  readonly progress: number;
  readonly commentCount: number;
  readonly isMit?: boolean;
  readonly blockerCount?: number;
  /** Server-derived when available. The component derives it only as a mock fallback. */
  readonly overdue?: boolean;
  readonly archivedAt?: string | null;
  readonly href?: string;
}

/**
 * Screen-owned Task record (LOS-0812). This is the list projection plus the
 * fields TaskForm, bulk actions and later API mapping need, without pretending
 * to be a verbatim API DTO.
 */
export interface TaskRecord {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly status: TaskStatus;
  readonly priority: TaskPriority;
  readonly project: TaskProjectContext | null;
  readonly dueAt: string | null;
  readonly estimateMinutes: number | null;
  readonly progress: number;
  readonly mitDate: string | null;
  readonly isMit: boolean;
  readonly commentCount: number;
  readonly blockerCount: number;
  readonly overdue: boolean;
  readonly archivedAt: string | null;
  readonly labelIds: readonly string[];
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly href?: string;
}

export function toTaskListItem(task: TaskRecord): TaskListItem {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    ...(task.project ? { project: task.project } : {}),
    dueAt: task.dueAt,
    progress: task.progress,
    commentCount: task.commentCount,
    isMit: task.isMit,
    blockerCount: task.blockerCount,
    overdue: task.overdue,
    archivedAt: task.archivedAt,
    ...(task.href ? { href: task.href } : {}),
  };
}
