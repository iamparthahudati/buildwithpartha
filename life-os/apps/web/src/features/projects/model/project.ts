/**
 * Project domain models (LOS-0701, LOS-0702, LOS-0706).
 */

export type ProjectStatus = "PLANNED" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
export type ProjectPriority = "P1" | "P2" | "P3" | "P4";
export type ProjectHealth = "ON_TRACK" | "AT_RISK" | "OFF_TRACK" | "NOT_SET";

export interface Project {
  readonly id: string;
  readonly name: string;
  readonly description?: string | null;
  readonly status: ProjectStatus;
  readonly priority: ProjectPriority;
  readonly health: ProjectHealth;
  readonly color?: string | null;
  readonly icon?: string | null;
  readonly startDate?: string | null; // LocalDate format: YYYY-MM-DD
  readonly deadlineDate?: string | null; // LocalDate format: YYYY-MM-DD
  readonly completedTasksCount: number;
  readonly totalTasksCount: number;
  readonly archivedAt?: string | null; // ISO DateTime
  readonly updatedAt: string; // ISO DateTime
  readonly version: number;
}
