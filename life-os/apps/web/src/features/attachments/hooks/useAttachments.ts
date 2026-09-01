import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { listAttachments, type ListAttachmentsResult } from "../api/attachmentsApi";
import type { AttachmentEntityType, ClientAttachment } from "../model/attachment";

export const attachmentsQueryKeys = {
  all: ["attachments"] as const,
  entity: (entityType: AttachmentEntityType, entityId: string) =>
    [...attachmentsQueryKeys.all, entityType, entityId] as const,
};

export interface UseAttachmentsResult {
  readonly enabled: boolean;
  readonly attachments: readonly ClientAttachment[];
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly error: Error | null;
  readonly refetch: () => void;
  readonly query: UseQueryResult<ListAttachmentsResult, Error>;
}

export function useAttachments(
  entityType: AttachmentEntityType,
  entityId: string,
  options: { enabled?: boolean } = {},
): UseAttachmentsResult {
  const isQueryEnabled = Boolean(entityId) && (options.enabled ?? true);

  const query = useQuery<ListAttachmentsResult, Error>({
    queryKey: attachmentsQueryKeys.entity(entityType, entityId),
    queryFn: ({ signal }) => listAttachments(entityType, entityId, signal),
    enabled: isQueryEnabled,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  return {
    enabled: query.data?.enabled ?? false,
    attachments: query.data?.attachments ?? [],
    isLoading: query.isPending,
    isError: query.isError,
    error: query.error ?? null,
    refetch: () => void query.refetch(),
    query,
  };
}
