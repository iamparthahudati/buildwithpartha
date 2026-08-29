/** Brain Dump item domain model (LOS-1205, extended for conversion in LOS-1206). */

export type BrainDumpItemStatus = "UNPROCESSED" | "CONVERTED" | "DEFERRED" | "ARCHIVED";

/** Destination entity a Brain Dump item can be converted into (LOS-1206). */
export type BrainDumpConvertTargetType = "TASK" | "NOTE" | "PROJECT" | "GOAL";

export interface BrainDumpItem {
  readonly id: string;
  readonly userId: string;
  readonly content: string;
  readonly status: BrainDumpItemStatus;
  readonly archived: boolean;
  readonly version: number;
  /** Destination type once converted; null while still unprocessed (LOS-1206). */
  readonly convertedToType: BrainDumpConvertTargetType | null;
  /** Identifier of the created entity once converted; null otherwise (LOS-1206). */
  readonly convertedToId: string | null;
  /** Timestamp of the conversion; null while still unprocessed (LOS-1206). */
  readonly convertedAt: string | null;
  /** Timestamp of archival; null while active (LOS-1206). */
  readonly archivedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface BrainDumpPageResponse<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly size: number;
  readonly totalItems: number;
  readonly totalPages: number;
}

/** Human-facing labels for each conversion destination (LOS-1206). */
export const BRAIN_DUMP_TARGET_LABELS: Record<BrainDumpConvertTargetType, string> = {
  TASK: "Task",
  NOTE: "Note",
  PROJECT: "Project",
  GOAL: "Goal",
};

const TARGET_ROUTE_SEGMENTS: Record<BrainDumpConvertTargetType, string> = {
  TASK: "tasks",
  NOTE: "notes",
  PROJECT: "projects",
  GOAL: "goals",
};

/**
 * Builds the in-app route to a converted entity — the "transactional result
 * link" surfaced after a Brain Dump item is converted (LOS-1206).
 */
export function convertedEntityPath(type: BrainDumpConvertTargetType, id: string): string {
  return `/life-os/app/${TARGET_ROUTE_SEGMENTS[type]}/${id}`;
}
