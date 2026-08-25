import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import {
  addSprintTask,
  completeSprint,
  createSprint,
  removeSprintTask,
  startSprint,
  updateSprint,
  updateSprintTask,
  type AddSprintTaskRequestDto,
  type CompleteSprintRequestDto,
  type CreateSprintRequestDto,
  type RemoveSprintTaskRequestDto,
  type SprintResponseDto,
  type UpdateSprintRequestDto,
  type UpdateSprintTaskRequestDto,
} from "../api/sprintsApi";
import { invalidateSprintQueries } from "./useSprints";

function useSprintMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<SprintResponseDto>,
): UseMutationResult<SprintResponseDto, Error, TVariables> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void invalidateSprintQueries(queryClient);
    },
  });
}

export function useCreateSprint() {
  return useSprintMutation<CreateSprintRequestDto>(createSprint);
}

export function useUpdateSprint() {
  return useSprintMutation<{ readonly id: string; readonly request: UpdateSprintRequestDto }>(
    ({ id, request }) => updateSprint(id, request),
  );
}

export function useAddSprintTask() {
  return useSprintMutation<{ readonly id: string; readonly request: AddSprintTaskRequestDto }>(
    ({ id, request }) => addSprintTask(id, request),
  );
}

export function useUpdateSprintTask() {
  return useSprintMutation<{
    readonly id: string;
    readonly taskId: string;
    readonly request: UpdateSprintTaskRequestDto;
  }>(({ id, taskId, request }) => updateSprintTask(id, taskId, request));
}

export function useRemoveSprintTask() {
  return useSprintMutation<{
    readonly id: string;
    readonly taskId: string;
    readonly request: RemoveSprintTaskRequestDto;
  }>(({ id, taskId, request }) => removeSprintTask(id, taskId, request));
}

export function useStartSprint() {
  return useSprintMutation<{ readonly id: string; readonly version: number }>(({ id, version }) =>
    startSprint(id, version),
  );
}

export function useCompleteSprint() {
  return useSprintMutation<{
    readonly id: string;
    readonly request: CompleteSprintRequestDto;
  }>(({ id, request }) => completeSprint(id, request));
}
