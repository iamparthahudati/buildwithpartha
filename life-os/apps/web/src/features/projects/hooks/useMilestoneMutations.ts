import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import {
  createMilestone,
  updateMilestone,
  updateMilestoneStatus,
  deleteMilestone,
  type CreateMilestoneRequestDto,
  type UpdateMilestoneRequestDto,
  type UpdateMilestoneStatusRequestDto,
} from "../api/milestonesApi";
import { invalidateProjectsQueries } from "./useProjects";
import type { Milestone } from "../model/milestone";

export function useCreateMilestone(): UseMutationResult<
  Milestone,
  Error,
  { readonly projectId: string; readonly request: CreateMilestoneRequestDto }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, request }) => createMilestone(projectId, request),
    onSuccess: () => {
      void invalidateProjectsQueries(queryClient);
    },
  });
}

export function useUpdateMilestone(): UseMutationResult<
  Milestone,
  Error,
  {
    readonly projectId: string;
    readonly milestoneId: string;
    readonly request: UpdateMilestoneRequestDto;
  }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, milestoneId, request }) =>
      updateMilestone(projectId, milestoneId, request),
    onSuccess: () => {
      void invalidateProjectsQueries(queryClient);
    },
  });
}

export function useUpdateMilestoneStatus(): UseMutationResult<
  Milestone,
  Error,
  {
    readonly projectId: string;
    readonly milestoneId: string;
    readonly request: UpdateMilestoneStatusRequestDto;
  }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, milestoneId, request }) =>
      updateMilestoneStatus(projectId, milestoneId, request),
    onSuccess: () => {
      void invalidateProjectsQueries(queryClient);
    },
  });
}

export function useDeleteMilestone(): UseMutationResult<
  void,
  Error,
  { readonly projectId: string; readonly milestoneId: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, milestoneId }) => deleteMilestone(projectId, milestoneId),
    onSuccess: () => {
      void invalidateProjectsQueries(queryClient);
    },
  });
}
