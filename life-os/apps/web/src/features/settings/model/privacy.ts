/**
 * Privacy and data lifecycle models (LOS-0517, LOS-0518, LOS-0519).
 */

export type ExportStatus = "GENERATING" | "READY" | "EXPIRED" | "DELETED";

export interface ExportItem {
  readonly id: string;
  readonly fileName: string;
  readonly fileSizeBytes: number | null;
  readonly status: ExportStatus;
  readonly expiresAt: string;
  readonly downloadedAt: string | null;
  readonly createdAt: string;
}

export interface ExportListResponse {
  readonly exports: readonly ExportItem[];
}

export interface AccountDeletionRequest {
  readonly currentPassword: string;
  readonly confirmationText: string;
}

export interface AccountDeletionResponse {
  readonly status: string;
  readonly message: string;
  readonly requestedAt: string;
}
