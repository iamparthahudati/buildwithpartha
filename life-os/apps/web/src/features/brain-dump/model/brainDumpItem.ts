/** Brain Dump item domain model (LOS-1205). */

export type BrainDumpItemStatus = "UNPROCESSED" | "CONVERTED" | "DEFERRED" | "ARCHIVED";

export interface BrainDumpItem {
  readonly id: string;
  readonly userId: string;
  readonly content: string;
  readonly status: BrainDumpItemStatus;
  readonly archived: boolean;
  readonly version: number;
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
