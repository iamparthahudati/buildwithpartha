import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import {
  createProject,
  updateProject,
  archiveProject,
  restoreProject,
  deleteProject,
  type CreateProjectRequestDto,
  type UpdateProjectRequestDto,
  type ArchiveProjectRequestDto,
  type RestoreProjectRequestDto,
} from "../api/projectsApi";
import { invalidateProjectsQueries } from "./useProjects";
import type { Project } from "../model/project";

export function useCreateProject(): UseMutationResult<Project, Error, CreateProjectRequestDto> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateProjectRequestDto) => createProject(request),
    onSuccess: () => {
      void invalidateProjectsQueries(queryClient);
    },
  });
}

export function useUpdateProject(): UseMutationResult<
  Project,
  Error,
  { readonly id: string; readonly request: UpdateProjectRequestDto }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }) => updateProject(id, request),
    onSuccess: () => {
      void invalidateProjectsQueries(queryClient);
    },
  });
}

export function useArchiveProject(): UseMutationResult<
  Project,
  Error,
  { readonly id: string; readonly request: ArchiveProjectRequestDto }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }) => archiveProject(id, request),
    onSuccess: () => {
      void invalidateProjectsQueries(queryClient);
    },
  });
}

export function useRestoreProject(): UseMutationResult<
  Project,
  Error,
  { readonly id: string; readonly request: RestoreProjectRequestDto }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }) => restoreProject(id, request),
    onSuccess: () => {
      void invalidateProjectsQueries(queryClient);
    },
  });
}

export function useDeleteProject(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => {
      void invalidateProjectsQueries(queryClient);
    },
  });
}
