/**
 * Tasks assigned to a milestone (LOS-0826).
 */

export type MilestoneTaskStatus = "TO_DO" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELLED";

export type MilestoneTaskPriority = "P1" | "P2" | "P3" | "P4";

export interface MilestoneTaskSummary {
  readonly taskId: string;
  readonly title: string;
  readonly status: MilestoneTaskStatus;
  readonly priority: MilestoneTaskPriority;
  readonly estimateMinutes: number;
}

/** A milestone id mapped to the tasks currently assigned to it. */
export type TasksByMilestone = Readonly<Record<string, readonly MilestoneTaskSummary[]>>;
