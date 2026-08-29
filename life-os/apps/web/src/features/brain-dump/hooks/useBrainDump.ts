import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";
import { invalidateActivityQueries } from "@features/activity";
import {
  queryBrainDumpItems,
  captureBrainDumpItem,
  updateBrainDumpContent,
  deferBrainDumpItem,
  archiveBrainDumpItem,
  restoreBrainDumpItem,
  deleteBrainDumpItem,
  convertBrainDumpByTarget,
  type BrainDumpQueryParams,
  type CaptureBrainDumpRequestDto,
  type UpdateBrainDumpContentRequestDto,
  type ConvertBrainDumpRequest,
} from "../api/brainDumpApi";
import type {
  BrainDumpConvertTargetType,
  BrainDumpItem,
  BrainDumpPageResponse,
} from "../model/brainDumpItem";
import { buildConvertRequest, initialConvertFields } from "../model/brainDumpConversion";

export const BRAIN_DUMP_QUERY_KEY = ["brain-dump"] as const;

export const brainDumpQueryKeys = {
  all: BRAIN_DUMP_QUERY_KEY,
  list: (params: BrainDumpQueryParams) => [...BRAIN_DUMP_QUERY_KEY, "list", params] as const,
};

export function invalidateBrainDumpQueries(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: BRAIN_DUMP_QUERY_KEY });
}

export function useBrainDumpItems(
  params: BrainDumpQueryParams = {},
  enabled = true,
): UseQueryResult<BrainDumpPageResponse<BrainDumpItem>, Error> {
  return useQuery({
    queryKey: brainDumpQueryKeys.list(params),
    queryFn: ({ signal }) => queryBrainDumpItems(params, signal),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    enabled,
  });
}

export function useCaptureBrainDumpItem(): UseMutationResult<
  BrainDumpItem,
  Error,
  CaptureBrainDumpRequestDto
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CaptureBrainDumpRequestDto) => captureBrainDumpItem(request),
    onSuccess: () => {
      void invalidateBrainDumpQueries(queryClient);
      void invalidateActivityQueries(queryClient);
    },
  });
}

export function useUpdateBrainDumpContent(): UseMutationResult<
  BrainDumpItem,
  Error,
  { readonly id: string; readonly request: UpdateBrainDumpContentRequestDto }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }) => updateBrainDumpContent(id, request),
    onSuccess: () => {
      void invalidateBrainDumpQueries(queryClient);
    },
  });
}

export function useDeferBrainDumpItem(): UseMutationResult<
  BrainDumpItem,
  Error,
  { readonly id: string; readonly version: number }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, version }) => deferBrainDumpItem(id, version),
    onSuccess: () => {
      void invalidateBrainDumpQueries(queryClient);
    },
  });
}

export function useArchiveBrainDumpItem(): UseMutationResult<
  BrainDumpItem,
  Error,
  { readonly id: string; readonly version: number }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, version }) => archiveBrainDumpItem(id, version),
    onSuccess: () => {
      void invalidateBrainDumpQueries(queryClient);
    },
  });
}

export function useRestoreBrainDumpItem(): UseMutationResult<
  BrainDumpItem,
  Error,
  { readonly id: string; readonly version: number }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, version }) => restoreBrainDumpItem(id, version),
    onSuccess: () => {
      void invalidateBrainDumpQueries(queryClient);
    },
  });
}

export function useDeleteBrainDumpItem(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBrainDumpItem(id),
    onSuccess: () => {
      void invalidateBrainDumpQueries(queryClient);
      void invalidateActivityQueries(queryClient);
    },
  });
}

/**
 * Converts a single Brain Dump item into a destination entity (LOS-1206).
 *
 * Returns the updated item, whose `convertedToType`/`convertedToId` back the
 * transactional result link. The backend conversion is idempotent, so a retry
 * after a timeout returns the already-created entity without duplicating it.
 */
export function useConvertBrainDumpItem(): UseMutationResult<
  BrainDumpItem,
  Error,
  { readonly id: string } & ConvertBrainDumpRequest
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) => convertBrainDumpByTarget(id, payload),
    onSuccess: () => {
      void invalidateBrainDumpQueries(queryClient);
      void invalidateActivityQueries(queryClient);
    },
  });
}

/** Per-item outcome of a batch conversion (LOS-1206). */
export interface BatchConvertItemResult {
  readonly id: string;
  readonly content: string;
  readonly ok: boolean;
  readonly item?: BrainDumpItem;
  readonly error?: string;
}

export interface BatchConvertResult {
  readonly target: BrainDumpConvertTargetType;
  readonly results: readonly BatchConvertItemResult[];
  readonly successCount: number;
  readonly failureCount: number;
}

export interface BatchConvertInput {
  readonly items: readonly BrainDumpItem[];
  readonly target: BrainDumpConvertTargetType;
}

/**
 * Converts many items to a single destination type, reporting a partial
 * result: each item succeeds or fails independently (`Promise.allSettled`),
 * so one failure never rolls back the items that converted. Failed items can
 * be retried safely thanks to backend idempotency.
 */
export async function runBatchConvert({
  items,
  target,
}: BatchConvertInput): Promise<BatchConvertResult> {
  const settled = await Promise.allSettled(
    items.map((item) => {
      const request = buildConvertRequest(
        target as never,
        initialConvertFields(item.content),
        item.version,
      );
      return convertBrainDumpByTarget(item.id, {
        target,
        request,
      } as ConvertBrainDumpRequest);
    }),
  );

  const results: BatchConvertItemResult[] = settled.map((outcome, index) => {
    const source = items[index]!;
    if (outcome.status === "fulfilled") {
      return { id: source.id, content: source.content, ok: true, item: outcome.value };
    }
    const reason = outcome.reason;
    const message = reason instanceof Error ? reason.message : "Conversion failed. Try again.";
    return { id: source.id, content: source.content, ok: false, error: message };
  });

  const successCount = results.filter((result) => result.ok).length;
  return {
    target,
    results,
    successCount,
    failureCount: results.length - successCount,
  };
}

export function useBrainDumpBatchConvert(): UseMutationResult<
  BatchConvertResult,
  Error,
  BatchConvertInput
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: runBatchConvert,
    onSuccess: () => {
      void invalidateBrainDumpQueries(queryClient);
      void invalidateActivityQueries(queryClient);
    },
  });
}
