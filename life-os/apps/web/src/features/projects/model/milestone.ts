/**
 * Milestone domain models (LOS-0704, LOS-0713).
 */

export type MilestoneStatus = "PLANNED" | "COMPLETED" | "CANCELLED";

export interface Milestone {
  readonly id: string;
  readonly projectId: string;
  readonly title: string;
  readonly date?: string | null; // LocalDate format: YYYY-MM-DD
  readonly status: MilestoneStatus;
  readonly ordering: number;
  readonly createdAt: string; // ISO DateTime
  readonly updatedAt: string; // ISO DateTime
  readonly version: number;
}
