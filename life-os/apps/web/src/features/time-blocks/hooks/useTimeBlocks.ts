import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  changeTimeBlockStatus,
  checkTimeBlockOverlap,
  completeTimeBlock,
  createTimeBlock,
  deleteTimeBlock,
  duplicateTimeBlock,
  getDailyTimeSummary,
  getTimeBlock,
  moveTimeBlock,
  queryTimeBlocks,
  resizeTimeBlock,
  updateTimeBlock,
  type ChangeTimeBlockStatusRequestDto,
  type CheckOverlapRequestDto,
  type CreateTimeBlockRequestDto,
  type DuplicateTimeBlockRequestDto,
  type DailyTimeSummaryDto,
  type MoveTimeBlockRequestDto,
  type ResizeTimeBlockRequestDto,
  type TimeBlockQueryParams,
  type UpdateTimeBlockRequestDto,
} from "../api/timeBlocksApi";
import type { LocalDate } from "@lib/localDateTime";

export const TIME_BLOCKS_QUERY_KEY = ["time-blocks"] as const;
export const TODAY_QUERY_KEY = ["today"] as const;
export const CALENDAR_QUERY_KEY = ["calendar"] as const;
export const DAILY_TIME_SUMMARY_QUERY_KEY = ["reports", "time"] as const;

/** Query hook to fetch a list of time blocks. */
export function useTimeBlocks(params: TimeBlockQueryParams = {}, enabled: boolean = true) {
  return useQuery({
    queryKey: [...TIME_BLOCKS_QUERY_KEY, params],
    queryFn: ({ signal }) => queryTimeBlocks(params, signal),
    enabled,
  });
}

/** Query hook for the selected Account-local day's time goal and allocation summary. */
export function useDailyTimeSummary(date: LocalDate, timeZone: string, enabled: boolean = true) {
  return useQuery<DailyTimeSummaryDto>({
    queryKey: [...DAILY_TIME_SUMMARY_QUERY_KEY, date, timeZone],
    queryFn: ({ signal }) => getDailyTimeSummary(date, timeZone, signal),
    enabled,
  });
}

/** Query hook to fetch a single time block by ID. */
export function useTimeBlock(id: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: [...TIME_BLOCKS_QUERY_KEY, "detail", id],
    queryFn: ({ signal }) => (id ? getTimeBlock(id, signal) : Promise.reject("No ID provided")),
    enabled: enabled && id !== null,
  });
}

/** Mutation hook to create a time block. Invalidates time-blocks, Today, and calendar queries. */
export function useCreateTimeBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateTimeBlockRequestDto) => createTimeBlock(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TIME_BLOCKS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: TODAY_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: CALENDAR_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: DAILY_TIME_SUMMARY_QUERY_KEY });
    },
  });
}

/** Mutation hook to update a time block. Invalidates time-blocks, Today, and calendar queries. */
export function useUpdateTimeBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateTimeBlockRequestDto }) =>
      updateTimeBlock(id, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TIME_BLOCKS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: TODAY_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: CALENDAR_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: DAILY_TIME_SUMMARY_QUERY_KEY });
    },
  });
}

/** Mutation hook to move a time block. Invalidates time-blocks, Today, and calendar queries. */
export function useMoveTimeBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: MoveTimeBlockRequestDto }) =>
      moveTimeBlock(id, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TIME_BLOCKS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: TODAY_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: CALENDAR_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: DAILY_TIME_SUMMARY_QUERY_KEY });
    },
  });
}

/** Mutation hook to resize a time block. Invalidates time-blocks, Today, and calendar queries. */
export function useResizeTimeBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: ResizeTimeBlockRequestDto }) =>
      resizeTimeBlock(id, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TIME_BLOCKS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: TODAY_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: CALENDAR_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: DAILY_TIME_SUMMARY_QUERY_KEY });
    },
  });
}

/** Mutation hook to change time block status. Invalidates time-blocks, Today, and calendar queries. */
export function useChangeTimeBlockStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: ChangeTimeBlockStatusRequestDto }) =>
      changeTimeBlockStatus(id, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TIME_BLOCKS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: TODAY_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: CALENDAR_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: DAILY_TIME_SUMMARY_QUERY_KEY });
    },
  });
}

/** Mutation hook to mark a time block as COMPLETED. Invalidates time-blocks, Today, and calendar queries. */
export function useCompleteTimeBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version?: number }) =>
      completeTimeBlock(id, version),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TIME_BLOCKS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: TODAY_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: CALENDAR_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: DAILY_TIME_SUMMARY_QUERY_KEY });
    },
  });
}

/** Mutation hook to duplicate a time block. Invalidates time-blocks, Today, and calendar queries. */
export function useDuplicateTimeBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request?: DuplicateTimeBlockRequestDto }) =>
      duplicateTimeBlock(id, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TIME_BLOCKS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: TODAY_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: CALENDAR_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: DAILY_TIME_SUMMARY_QUERY_KEY });
    },
  });
}

/** Mutation hook to delete a time block. Invalidates time-blocks, Today, and calendar queries. */
export function useDeleteTimeBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTimeBlock(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TIME_BLOCKS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: TODAY_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: CALENDAR_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: DAILY_TIME_SUMMARY_QUERY_KEY });
    },
  });
}

/** Mutation hook to preflight check overlap. */
export function useCheckTimeBlockOverlap() {
  return useMutation({
    mutationFn: (request: CheckOverlapRequestDto) => checkTimeBlockOverlap(request),
  });
}
