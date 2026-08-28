import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { invalidateActivityQueries } from "@features/activity";
import {
  createGoal,
  updateGoal,
  pauseGoal,
  completeGoal,
  archiveGoal,
  restoreGoal,
  deleteGoal,
  recordCheckIn,
  deleteCheckIn,
  addGoalLink,
  deleteGoalLink,
  type CreateGoalRequestDto,
  type UpdateGoalRequestDto,
  type PauseGoalRequestDto,
  type CompleteGoalRequestDto,
  type ArchiveGoalRequestDto,
  type RestoreGoalRequestDto,
  type AddCheckInRequestDto,
  type AddGoalLinkRequestDto,
} from "../api/goalsApi";
import { invalidateGoalsQueries } from "./useGoals";
import type { Goal, GoalCheckIn, GoalLink } from "../model/goal";

export function useCreateGoal(): UseMutationResult<Goal, Error, CreateGoalRequestDto> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateGoalRequestDto) => createGoal(request),
    onSuccess: () => {
      void invalidateGoalsQueries(queryClient);
      void invalidateActivityQueries(queryClient);
    },
  });
}

export function useUpdateGoal(): UseMutationResult<
  Goal,
  Error,
  { readonly id: string; readonly request: UpdateGoalRequestDto }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }) => updateGoal(id, request),
    onSuccess: () => {
      void invalidateGoalsQueries(queryClient);
      void invalidateActivityQueries(queryClient);
    },
  });
}

export function usePauseGoal(): UseMutationResult<
  Goal,
  Error,
  { readonly id: string; readonly request: PauseGoalRequestDto }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }) => pauseGoal(id, request),
    onSuccess: () => {
      void invalidateGoalsQueries(queryClient);
      void invalidateActivityQueries(queryClient);
    },
  });
}

export function useCompleteGoal(): UseMutationResult<
  Goal,
  Error,
  { readonly id: string; readonly request: CompleteGoalRequestDto }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }) => completeGoal(id, request),
    onSuccess: () => {
      void invalidateGoalsQueries(queryClient);
      void invalidateActivityQueries(queryClient);
    },
  });
}

export function useArchiveGoal(): UseMutationResult<
  Goal,
  Error,
  { readonly id: string; readonly request: ArchiveGoalRequestDto }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }) => archiveGoal(id, request),
    onSuccess: () => {
      void invalidateGoalsQueries(queryClient);
      void invalidateActivityQueries(queryClient);
    },
  });
}

export function useRestoreGoal(): UseMutationResult<
  Goal,
  Error,
  { readonly id: string; readonly request: RestoreGoalRequestDto }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }) => restoreGoal(id, request),
    onSuccess: () => {
      void invalidateGoalsQueries(queryClient);
      void invalidateActivityQueries(queryClient);
    },
  });
}

export function useDeleteGoal(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteGoal(id),
    onSuccess: () => {
      void invalidateGoalsQueries(queryClient);
      void invalidateActivityQueries(queryClient);
    },
  });
}

export function useRecordCheckIn(): UseMutationResult<
  GoalCheckIn,
  Error,
  { readonly goalId: string; readonly request: AddCheckInRequestDto }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, request }) => recordCheckIn(goalId, request),
    onSuccess: () => {
      void invalidateGoalsQueries(queryClient);
      void invalidateActivityQueries(queryClient);
    },
  });
}

export function useDeleteCheckIn(): UseMutationResult<
  void,
  Error,
  { readonly goalId: string; readonly checkInId: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, checkInId }) => deleteCheckIn(goalId, checkInId),
    onSuccess: () => {
      void invalidateGoalsQueries(queryClient);
      void invalidateActivityQueries(queryClient);
    },
  });
}

export function useAddGoalLink(): UseMutationResult<
  GoalLink,
  Error,
  { readonly goalId: string; readonly request: AddGoalLinkRequestDto }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, request }) => addGoalLink(goalId, request),
    onSuccess: () => {
      void invalidateGoalsQueries(queryClient);
      void invalidateActivityQueries(queryClient);
    },
  });
}

export function useDeleteGoalLink(): UseMutationResult<
  void,
  Error,
  { readonly goalId: string; readonly linkId: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, linkId }) => deleteGoalLink(goalId, linkId),
    onSuccess: () => {
      void invalidateGoalsQueries(queryClient);
      void invalidateActivityQueries(queryClient);
    },
  });
}
