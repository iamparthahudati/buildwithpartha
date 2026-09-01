import { apiBlobRequest, apiRequest } from "@lib/apiClient";
import {
  mapResponseToAttachment,
  type AttachmentEntityType,
  type AttachmentListResponse,
  type AttachmentResponse,
  type ClientAttachment,
} from "../model/attachment";

export interface ListAttachmentsResult {
  readonly enabled: boolean;
  readonly attachments: readonly ClientAttachment[];
}

export async function listAttachments(
  entityType: AttachmentEntityType,
  entityId: string,
  signal?: AbortSignal,
): Promise<ListAttachmentsResult> {
  try {
    const res = await apiRequest<AttachmentListResponse>(
      `/attachments?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`,
      { ...(signal ? { signal } : {}), suppressAuthenticationRecovery: false },
    );
    const attachments = (res.items ?? [])
      .filter((item) => item.status !== "DELETED")
      .map(mapResponseToAttachment);
    return { enabled: true, attachments };
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      (error as { status: number }).status === 404
    ) {
      return { enabled: false, attachments: [] };
    }
    throw error;
  }
}

export async function getAttachment(id: string, signal?: AbortSignal): Promise<ClientAttachment> {
  const res = await apiRequest<AttachmentResponse>(
    `/attachments/${encodeURIComponent(id)}`,
    signal ? { signal } : {},
  );
  return mapResponseToAttachment(res);
}

export async function uploadAttachment(
  entityType: AttachmentEntityType,
  entityId: string,
  file: File,
): Promise<ClientAttachment> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("entityType", entityType);
  formData.append("entityId", entityId);

  const res = await apiRequest<AttachmentResponse>("/attachments", {
    method: "POST",
    body: formData,
  });
  return mapResponseToAttachment(res);
}

export async function downloadAttachment(id: string, fileName?: string): Promise<void> {
  const blob = await apiBlobRequest(`/attachments/${encodeURIComponent(id)}/download`);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  if (fileName) {
    anchor.download = fileName;
  }
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function deleteAttachment(id: string): Promise<void> {
  await apiRequest<void>(`/attachments/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
