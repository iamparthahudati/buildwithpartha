import { useState } from "react";
import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { deleteAttachment, downloadAttachment, uploadAttachment } from "../api/attachmentsApi";
import type { AttachmentEntityType, ClientAttachment } from "../model/attachment";
import { attachmentsQueryKeys } from "./useAttachments";

export interface UseAttachmentMutationsResult {
  readonly uploadFiles: (files: readonly File[]) => Promise<void>;
  readonly isUploading: boolean;
  readonly uploadError: string | null;
  readonly downloadFile: (id: string, fileName?: string) => Promise<void>;
  readonly deleteFile: (id: string) => Promise<void>;
  readonly isDeleting: boolean;
  readonly deleteError: string | null;
  readonly inFlightAttachments: readonly ClientAttachment[];
  readonly retryUpload: (id: string) => Promise<void>;
  readonly cancelUpload: (id: string) => void;
  readonly deleteMutation: UseMutationResult<void, Error, string>;
}

export function useAttachmentMutations(
  entityType: AttachmentEntityType,
  entityId: string,
): UseAttachmentMutationsResult {
  const queryClient = useQueryClient();
  const [inFlightAttachments, setInFlightAttachments] = useState<readonly ClientAttachment[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const queryKey = attachmentsQueryKeys.entity(entityType, entityId);

  const uploadMutation = useMutation<ClientAttachment, Error, File>({
    mutationFn: (file) => uploadAttachment(entityType, entityId, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: (id) => deleteAttachment(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const uploadFiles = async (files: readonly File[]) => {
    setUploadError(null);
    for (const file of files) {
      const tempId = `temp-${Math.random().toString(36).slice(2, 9)}`;
      const tempAttachment: ClientAttachment = {
        id: tempId,
        fileName: file.name,
        fileSizeBytes: file.size,
        status: "uploading",
        uploadProgress: 50,
      };

      setInFlightAttachments((prev) => [...prev, tempAttachment]);

      try {
        await uploadMutation.mutateAsync(file);
        setInFlightAttachments((prev) => prev.filter((item) => item.id !== tempId));
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Upload failed.";
        setInFlightAttachments((prev) =>
          prev.map((item) =>
            item.id === tempId ? { ...item, status: "failed", error: errorMsg } : item,
          ),
        );
        setUploadError(errorMsg);
      }
    }
  };

  const retryUpload = async (id: string) => {
    // Retry failed in-flight item if applicable
    const failedItem = inFlightAttachments.find((item) => item.id === id);
    if (failedItem) {
      setInFlightAttachments((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const cancelUpload = (id: string) => {
    setInFlightAttachments((prev) => prev.filter((item) => item.id !== id));
  };

  const downloadFile = async (id: string, fileName?: string) => {
    await downloadAttachment(id, fileName);
  };

  const deleteFile = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  return {
    uploadFiles,
    isUploading: uploadMutation.isPending,
    uploadError,
    downloadFile,
    deleteFile,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error?.message ?? null,
    inFlightAttachments,
    retryUpload,
    cancelUpload,
    deleteMutation,
  };
}
