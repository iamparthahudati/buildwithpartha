import type { LocalDate } from "@lib/localDateTime";

export type SprintStatus = "PLANNED" | "ACTIVE" | "COMPLETED" | "CANCELLED";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE" | "CANCELLED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface SprintTask {
  readonly id: string;
  readonly sprintId: string;
  readonly taskId: string;
  readonly title: string;
  readonly status: TaskStatus;
  readonly storyPoints: number;
  readonly projectName?: string;
  readonly priority?: TaskPriority;
  readonly isCommitted: boolean;
  readonly addedAt?: string;
}

export type ScopeChangeType = "TASK_ADDED" | "TASK_REMOVED" | "POINTS_CHANGED" | "CAPACITY_CHANGED";

export interface SprintScopeChangeEvent {
  readonly id: string;
  readonly sprintId: string;
  readonly changeType: ScopeChangeType;
  readonly taskId?: string;
  readonly taskTitle?: string;
  readonly pointsDelta?: number;
  readonly reason?: string;
  readonly timestamp: string;
}

export interface Sprint {
  readonly id: string;
  readonly name: string;
  readonly goal?: string;
  readonly startDate: LocalDate;
  readonly endDate: LocalDate;
  readonly status: SprintStatus;
  readonly targetCapacityPoints: number;
  readonly completedStoryPoints: number;
  readonly totalStoryPoints: number;
  readonly retrospectiveNotes?: string;
  readonly whatWentWell?: string;
  readonly whatCouldBeImproved?: string;
  readonly actionItems?: readonly string[];
  readonly completedAt?: string;
}
