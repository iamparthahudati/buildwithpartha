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
