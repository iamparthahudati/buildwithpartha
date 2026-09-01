import type { Attachment as ComponentAttachment, AttachmentStatus } from "@components/navigation";

export type { AttachmentStatus };
export type AttachmentEntityType = "TASK" | "PROJECT";

export type BackendAttachmentStatus = "PENDING_SCAN" | "CLEAN" | "QUARANTINED" | "DELETED";

export interface AttachmentResponse {
  readonly id: string;
  readonly entityType: AttachmentEntityType;
  readonly entityId: string;
  readonly fileName: string;
  readonly sanitizedFileName: string;
  readonly contentType: string;
  readonly fileSizeBytes: number;
  readonly status: BackendAttachmentStatus;
  readonly scanResult?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AttachmentListResponse {
  readonly items: readonly AttachmentResponse[];
}

export interface ClientAttachment extends ComponentAttachment {
  readonly entityType?: AttachmentEntityType;
  readonly entityId?: string;
  readonly contentType?: string;
  readonly createdAt?: string;
}

export function mapBackendStatusToUi(status: BackendAttachmentStatus): AttachmentStatus {
  switch (status) {
    case "PENDING_SCAN":
      return "scanning";
    case "CLEAN":
      return "ready";
    case "QUARANTINED":
      return "blocked";
    case "DELETED":
    default:
      return "failed";
  }
}

export function mapResponseToAttachment(res: AttachmentResponse): ClientAttachment {
  return {
    id: res.id,
    fileName: res.sanitizedFileName || res.fileName,
    fileSizeBytes: res.fileSizeBytes,
    status: mapBackendStatusToUi(res.status),
    entityType: res.entityType,
    entityId: res.entityId,
    contentType: res.contentType,
    createdAt: res.createdAt,
  };
}
