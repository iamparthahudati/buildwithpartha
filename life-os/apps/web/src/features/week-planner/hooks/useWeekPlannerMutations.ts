import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createWeeklyPlan,
  finalizeWeeklyPlan,
  reopenWeeklyPlan,
  updateWeeklyPlan,
  type CreateWeeklyPlanRequestDto,
  type UpdateWeeklyPlanRequestDto,
  type WeeklyPlanCapacityRequestDto,
  type WeeklyPlanItemRequestDto,
  type WeeklyPlanOutcomeRequestDto,
  type WeeklyPlanResponseDto,
} from "../api/weekPlannerApi";
import type { TaskAllocationValue, WeeklyOutcome } from "../model/weekPlanner";

export interface UseWeekPlannerMutationsParams {
  readonly rawPlan: WeeklyPlanResponseDto | null;
  readonly targetWeekDate: string;
}

export function useWeekPlannerMutations({
  rawPlan,
  targetWeekDate,
}: UseWeekPlannerMutationsParams) {
  const queryClient = useQueryClient();

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["weekly-plans"] }),
      queryClient.invalidateQueries({ queryKey: ["today"] }),
      queryClient.invalidateQueries({ queryKey: ["calendar"] }),
      queryClient.invalidateQueries({ queryKey: ["tasks"] }),
      queryClient.invalidateQueries({ queryKey: ["time-blocks"] }),
      queryClient.invalidateQueries({ queryKey: ["daily-time-summary"] }),
    ]);
  };

  const getOrCreateCapacities = (): WeeklyPlanCapacityRequestDto[] => {
    if (!rawPlan) return [];
    return rawPlan.capacities.map((c) => ({
      localDate: c.localDate,
      availableMinutes: c.availableMinutes,
    }));
  };

  const getOrCreateOutcomes = (): WeeklyPlanOutcomeRequestDto[] => {
    if (!rawPlan) return [];
    return rawPlan.outcomes.map((o, idx) => ({
      ...(o.id ? { id: o.id } : {}),
      title: o.title,
      position: idx,
    }));
  };

  const getOrCreateItems = (): WeeklyPlanItemRequestDto[] => {
    if (!rawPlan) return [];
    return rawPlan.items.map((i, idx) => ({
      ...(i.id ? { id: i.id } : {}),
      taskId: i.taskId,
      ...(i.outcomeId ? { outcomeId: i.outcomeId } : {}),
      ...(i.plannedDate ? { plannedDate: i.plannedDate } : {}),
      plannedMinutes: i.plannedMinutes,
      position: idx,
    }));
  };

  const updateOrSavePlan = async (
    newCapacities: readonly WeeklyPlanCapacityRequestDto[],
    newOutcomes: readonly WeeklyPlanOutcomeRequestDto[],
    newItems: readonly WeeklyPlanItemRequestDto[],
  ): Promise<WeeklyPlanResponseDto> => {
    if (!rawPlan) {
      const createReq: CreateWeeklyPlanRequestDto = {
        weekDate: targetWeekDate,
        capacities: newCapacities,
        outcomes: newOutcomes,
        items: newItems,
      };
      return createWeeklyPlan(createReq);
    } else {
      const updateReq: UpdateWeeklyPlanRequestDto = {
        capacities: newCapacities,
        outcomes: newOutcomes,
        items: newItems,
        version: rawPlan.version,
      };
      return updateWeeklyPlan(rawPlan.id, updateReq);
    }
  };

  const updateDayCapacityMutation = useMutation({
    mutationFn: async ({
      dayLocalDate,
      availableMinutes,
    }: {
      dayLocalDate: string;
      availableMinutes: number;
    }) => {
      const currentCaps = getOrCreateCapacities();
      const existingIdx = currentCaps.findIndex((c) => c.localDate === dayLocalDate);
      const updatedCaps = [...currentCaps];

      if (existingIdx >= 0) {
        updatedCaps[existingIdx] = { localDate: dayLocalDate, availableMinutes };
      } else {
        updatedCaps.push({ localDate: dayLocalDate, availableMinutes });
      }

      return updateOrSavePlan(updatedCaps, getOrCreateOutcomes(), getOrCreateItems());
    },
    onSuccess: invalidateAll,
  });

  const allocateTaskMutation = useMutation({
    mutationFn: async ({
      taskId,
      allocation,
    }: {
      taskId: string;
      allocation: TaskAllocationValue;
    }) => {
      const currentItems = getOrCreateItems();
      const existingIdx = currentItems.findIndex((i) => i.taskId === taskId);
      const updatedItems = [...currentItems];

      if (existingIdx >= 0) {
        const item = updatedItems[existingIdx]!;
        updatedItems[existingIdx] = {
          ...item,
          ...(allocation.outcomeId ? { outcomeId: allocation.outcomeId } : { outcomeId: null }),
          ...(allocation.localDate ? { plannedDate: allocation.localDate } : { plannedDate: null }),
          plannedMinutes: allocation.plannedMinutes,
        };
      } else {
        updatedItems.push({
          taskId,
          ...(allocation.outcomeId ? { outcomeId: allocation.outcomeId } : {}),
          ...(allocation.localDate ? { plannedDate: allocation.localDate } : {}),
          plannedMinutes: allocation.plannedMinutes,
          position: updatedItems.length,
        });
      }

      return updateOrSavePlan(getOrCreateCapacities(), getOrCreateOutcomes(), updatedItems);
    },
    onSuccess: invalidateAll,
  });

  const unallocateTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const currentItems = getOrCreateItems();
      const updatedItems = currentItems
        .filter((i) => i.taskId !== taskId)
        .map((item, idx) => ({ ...item, position: idx }));

      return updateOrSavePlan(getOrCreateCapacities(), getOrCreateOutcomes(), updatedItems);
    },
    onSuccess: invalidateAll,
  });

  const createOutcomeMutation = useMutation({
    mutationFn: async (title: string) => {
      const currentOutcomes = getOrCreateOutcomes();
      const updatedOutcomes = [...currentOutcomes, { title, position: currentOutcomes.length }];

      return updateOrSavePlan(getOrCreateCapacities(), updatedOutcomes, getOrCreateItems());
    },
    onSuccess: invalidateAll,
  });

  const reorderOutcomesMutation = useMutation({
    mutationFn: async (reorderedOutcomes: readonly WeeklyOutcome[]) => {
      const currentOutcomes = getOrCreateOutcomes();
      const updatedOutcomes: WeeklyPlanOutcomeRequestDto[] = reorderedOutcomes.map((o, idx) => {
        const existing = currentOutcomes.find((co) => co.id === o.id);
        return {
          ...(existing?.id ? { id: existing.id } : o.id ? { id: o.id } : {}),
          title: o.title,
          position: idx,
        };
      });

      return updateOrSavePlan(getOrCreateCapacities(), updatedOutcomes, getOrCreateItems());
    },
    onSuccess: invalidateAll,
  });

  const finalizePlanMutation = useMutation({
    mutationFn: async () => {
      if (!rawPlan) throw new Error("Cannot finalize non-existent plan");
      return finalizeWeeklyPlan(rawPlan.id, rawPlan.version);
    },
    onSuccess: invalidateAll,
  });

  const reopenPlanMutation = useMutation({
    mutationFn: async () => {
      if (!rawPlan) throw new Error("Cannot reopen non-existent plan");
      return reopenWeeklyPlan(rawPlan.id, rawPlan.version);
    },
    onSuccess: invalidateAll,
  });

  const isPending =
    updateDayCapacityMutation.isPending ||
    allocateTaskMutation.isPending ||
    unallocateTaskMutation.isPending ||
    createOutcomeMutation.isPending ||
    reorderOutcomesMutation.isPending ||
    finalizePlanMutation.isPending ||
    reopenPlanMutation.isPending;

  const error =
    updateDayCapacityMutation.error?.message ??
    allocateTaskMutation.error?.message ??
    unallocateTaskMutation.error?.message ??
    createOutcomeMutation.error?.message ??
    reorderOutcomesMutation.error?.message ??
    finalizePlanMutation.error?.message ??
    reopenPlanMutation.error?.message ??
    null;

  return {
    updateDayCapacity: (dayLocalDate: string, availableMinutes: number) =>
      updateDayCapacityMutation.mutateAsync({ dayLocalDate, availableMinutes }),
    allocateTask: (taskId: string, allocation: TaskAllocationValue) =>
      allocateTaskMutation.mutateAsync({ taskId, allocation }),
    unallocateTask: (taskId: string) => unallocateTaskMutation.mutateAsync(taskId),
    createOutcome: (title: string) => createOutcomeMutation.mutateAsync(title),
    reorderOutcomes: (outcomes: readonly WeeklyOutcome[]) =>
      reorderOutcomesMutation.mutateAsync(outcomes),
    finalizePlan: () => finalizePlanMutation.mutateAsync(),
    reopenPlan: () => reopenPlanMutation.mutateAsync(),
    isPending,
    error,
  };
}
