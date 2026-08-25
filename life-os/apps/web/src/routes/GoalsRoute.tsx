import { useCallback, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  GoalsScreen,
  useGoals,
  useCreateGoal,
  useUpdateGoal,
  usePauseGoal,
  useCompleteGoal,
  useArchiveGoal,
  useRestoreGoal,
  useDeleteGoal,
  useRecordCheckIn,
  type GoalFormData,
  type GoalQueryParams,
  type Goal,
} from "@features/goals";
import { useAuthSession } from "@state/authSession";
import { ApiError } from "@lib/apiClient";

const SORT_FIELD_MAP: Record<string, string> = {
  title: "title",
  category: "category",
  status: "status",
  targetDate: "targetDate",
  updatedAt: "updatedAt",
};

export function GoalsRoute() {
  const { user } = useAuthSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [conflictError, setConflictError] = useState<string | null>(null);

  // Read URL parameters
  const statusTab = searchParams.get("status") ?? "ALL";
  const searchQuery = searchParams.get("q") ?? "";
  const categoryFilter = searchParams.get("category") ?? "ALL";
  const progressTypeFilter = searchParams.get("progressType") ?? "ALL";
  const sortOptionId = searchParams.get("sort") ?? "updatedAt";
  const sortDirection = (searchParams.get("dir") === "asc" ? "asc" : "desc") as "asc" | "desc";
  const pageParam = parseInt(searchParams.get("page") ?? "1", 10);
  const currentPage = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const viewMode = (searchParams.get("view") ?? "grid") as "list" | "grid" | "table";
  const selectedGoalId = searchParams.get("selected") ?? null;

  // Build API Query params
  const apiQueryParams: GoalQueryParams = useMemo(() => {
    const isArchivedTab = statusTab === "ARCHIVED";
    const statusArray = statusTab !== "ALL" && !isArchivedTab ? [statusTab] : undefined;
    const categoryVal = categoryFilter !== "ALL" ? categoryFilter : undefined;
    const progressTypeArray = progressTypeFilter !== "ALL" ? [progressTypeFilter] : undefined;
    const sortBy = SORT_FIELD_MAP[sortOptionId] ?? "updatedAt";

    return {
      ...(searchQuery ? { q: searchQuery } : {}),
      ...(statusArray ? { status: statusArray } : {}),
      ...(categoryVal ? { category: categoryVal } : {}),
      ...(progressTypeArray ? { progressType: progressTypeArray } : {}),
      archived: isArchivedTab ? true : false,
      page: currentPage - 1,
      size: 10,
      sortBy,
      sortDirection: sortDirection.toUpperCase() as "ASC" | "DESC",
    };
  }, [
    statusTab,
    searchQuery,
    categoryFilter,
    progressTypeFilter,
    sortOptionId,
    sortDirection,
    currentPage,
  ]);

  const goalsQuery = useGoals(apiQueryParams, user !== null);
  const { data, isPending, isError, error, refetch } = goalsQuery;

  // Mutations
  const createMutation = useCreateGoal();
  const updateMutation = useUpdateGoal();
  const pauseMutation = usePauseGoal();
  const completeMutation = useCompleteGoal();
  const archiveMutation = useArchiveGoal();
  const restoreMutation = useRestoreGoal();
  const deleteMutation = useDeleteGoal();
  const checkInMutation = useRecordCheckIn();

  const updateUrlParams = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(updates).forEach(([key, value]) => {
            if (value === null || value === undefined || value === "") {
              next.delete(key);
            } else {
              next.set(key, value);
            }
          });
          return Object.fromEntries(next.entries());
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const goalsList = useMemo(() => data?.items ?? [], [data?.items]);
  const summaryCounts = data?.summary ?? undefined;
  const totalPages = data?.page?.totalPages ?? 1;
  const totalItems = data?.page?.totalItems ?? 0;

  const selectedGoal = useMemo(() => {
    if (!selectedGoalId) return null;
    return goalsList.find((g) => g.id === selectedGoalId) ?? null;
  }, [selectedGoalId, goalsList]);

  // Handlers for URL state updates
  const handleStatusTabChange = useCallback(
    (tab: string) => {
      updateUrlParams({ status: tab === "ALL" ? null : tab, page: null });
    },
    [updateUrlParams],
  );

  const handleSearchQueryChange = useCallback(
    (q: string) => {
      updateUrlParams({ q: q ? q : null, page: null });
    },
    [updateUrlParams],
  );

  const handleCategoryFilterChange = useCallback(
    (cat: string) => {
      updateUrlParams({ category: cat === "ALL" ? null : cat, page: null });
    },
    [updateUrlParams],
  );

  const handleProgressTypeFilterChange = useCallback(
    (pt: string) => {
      updateUrlParams({ progressType: pt === "ALL" ? null : pt, page: null });
    },
    [updateUrlParams],
  );

  const handleSortChange = useCallback(
    (sort: { optionId: string; direction: "asc" | "desc" }) => {
      updateUrlParams({
        sort: sort.optionId === "updatedAt" ? null : sort.optionId,
        dir: sort.direction === "desc" ? null : sort.direction,
      });
    },
    [updateUrlParams],
  );

  const handleViewModeChange = useCallback(
    (mode: "list" | "grid" | "table") => {
      updateUrlParams({ view: mode === "grid" ? null : mode });
    },
    [updateUrlParams],
  );

  const handlePageChange = useCallback(
    (page: number) => {
      updateUrlParams({ page: page === 1 ? null : String(page) });
    },
    [updateUrlParams],
  );

  const handleSelectGoal = useCallback(
    (goal: Goal | null) => {
      updateUrlParams({ selected: goal ? goal.id : null });
    },
    [updateUrlParams],
  );

  const handleNavigateToGoalDetail = useCallback(
    (goalId: string) => {
      navigate(`/life-os/app/goals/${goalId}`);
    },
    [navigate],
  );

  const handleMutationError = (err: unknown) => {
    if (err instanceof ApiError && err.status === 409) {
      setConflictError(
        "Another change was made to this goal by a concurrent request. Please reload the latest goal state.",
      );
    } else {
      setConflictError(null);
    }
  };

  // Handlers for CRUD operations
  const handleCreateGoal = useCallback(
    async (formData: GoalFormData) => {
      setConflictError(null);
      try {
        await createMutation.mutateAsync({
          title: formData.title,
          description: formData.description ?? null,
          category: formData.category,
          progressType: formData.progressType,
          targetValue: formData.targetValue ?? null,
          currentValue: formData.currentValue ?? 0,
          unit: formData.unit ?? null,
          targetDate: formData.targetDate ?? null,
          status: formData.status,
          checkInCadence: formData.checkInCadence,
        });
      } catch (err) {
        handleMutationError(err);
      }
    },
    [createMutation],
  );

  const handleUpdateGoal = useCallback(
    async (id: string, formData: GoalFormData) => {
      setConflictError(null);
      const existing = goalsList.find((g) => g.id === id);
      try {
        await updateMutation.mutateAsync({
          id,
          request: {
            title: formData.title,
            description: formData.description ?? null,
            category: formData.category,
            progressType: formData.progressType,
            targetValue: formData.targetValue ?? null,
            currentValue: formData.currentValue ?? 0,
            unit: formData.unit ?? null,
            targetDate: formData.targetDate ?? null,
            checkInCadence: formData.checkInCadence,
            version: existing?.version ?? formData.version ?? 1,
          },
        });
      } catch (err) {
        handleMutationError(err);
      }
    },
    [goalsList, updateMutation],
  );

  const handlePauseGoal = useCallback(
    async (id: string) => {
      setConflictError(null);
      const existing = goalsList.find((g) => g.id === id);
      try {
        await pauseMutation.mutateAsync({
          id,
          request: {
            version: existing?.version ?? 1,
          },
        });
      } catch (err) {
        handleMutationError(err);
      }
    },
    [goalsList, pauseMutation],
  );

  const handleResumeGoal = useCallback(
    async (id: string) => {
      setConflictError(null);
      const existing = goalsList.find((g) => g.id === id);
      try {
        await updateMutation.mutateAsync({
          id,
          request: {
            title: existing?.title ?? "",
            description: existing?.description ?? null,
            category: existing?.category ?? "PERSONAL",
            progressType: existing?.progressType ?? "PERCENTAGE",
            targetValue: existing?.targetValue ?? null,
            currentValue: existing?.currentValue ?? 0,
            unit: existing?.unit ?? null,
            targetDate: existing?.targetDate ?? null,
            checkInCadence: existing?.checkInCadence ?? "WEEKLY",
            version: existing?.version ?? 1,
          },
        });
      } catch (err) {
        handleMutationError(err);
      }
    },
    [goalsList, updateMutation],
  );

  const handleCompleteGoal = useCallback(
    async (id: string) => {
      setConflictError(null);
      const existing = goalsList.find((g) => g.id === id);
      try {
        await completeMutation.mutateAsync({
          id,
          request: {
            version: existing?.version ?? 1,
          },
        });
      } catch (err) {
        handleMutationError(err);
      }
    },
    [goalsList, completeMutation],
  );

  const handleArchiveGoal = useCallback(
    async (id: string) => {
      setConflictError(null);
      const existing = goalsList.find((g) => g.id === id);
      try {
        await archiveMutation.mutateAsync({
          id,
          request: {
            version: existing?.version ?? 1,
          },
        });
      } catch (err) {
        handleMutationError(err);
      }
    },
    [goalsList, archiveMutation],
  );

  const handleRestoreGoal = useCallback(
    async (id: string) => {
      setConflictError(null);
      const existing = goalsList.find((g) => g.id === id);
      try {
        await restoreMutation.mutateAsync({
          id,
          request: {
            version: existing?.version ?? 1,
          },
        });
      } catch (err) {
        handleMutationError(err);
      }
    },
    [goalsList, restoreMutation],
  );

  const handleDeleteGoal = useCallback(
    async (id: string) => {
      setConflictError(null);
      try {
        await deleteMutation.mutateAsync(id);
      } catch (err) {
        handleMutationError(err);
      }
    },
    [deleteMutation],
  );

  const handleCheckInGoal = useCallback(
    async (goalId: string, value: number, note?: string) => {
      setConflictError(null);
      try {
        await checkInMutation.mutateAsync({
          goalId,
          request: {
            value,
            ...(note ? { note } : {}),
          },
        });
      } catch (err) {
        handleMutationError(err);
      }
    },
    [checkInMutation],
  );

  if (user === null) {
    return null;
  }

  return (
    <GoalsScreen
      goals={goalsList}
      {...(summaryCounts ? { summaryCounts } : {})}
      loading={isPending}
      error={isError ? (error?.message ?? "Failed to load goals from server.") : null}
      statusTab={statusTab}
      searchQuery={searchQuery}
      categoryFilter={categoryFilter}
      progressTypeFilter={progressTypeFilter}
      sortState={{ optionId: sortOptionId, direction: sortDirection }}
      viewMode={viewMode}
      currentPage={currentPage}
      totalPages={totalPages}
      totalItems={totalItems}
      {...(selectedGoal ? { selectedGoal } : {})}
      onStatusTabChange={handleStatusTabChange}
      onSearchQueryChange={handleSearchQueryChange}
      onCategoryFilterChange={handleCategoryFilterChange}
      onProgressTypeFilterChange={handleProgressTypeFilterChange}
      onSortChange={handleSortChange}
      onViewModeChange={handleViewModeChange}
      onPageChange={handlePageChange}
      onSelectGoal={handleSelectGoal}
      onNavigateToGoalDetail={handleNavigateToGoalDetail}
      onRetry={() => void refetch()}
      onCreateGoal={handleCreateGoal}
      onUpdateGoal={handleUpdateGoal}
      onPauseGoal={handlePauseGoal}
      onResumeGoal={handleResumeGoal}
      onCompleteGoal={handleCompleteGoal}
      onArchiveGoal={handleArchiveGoal}
      onRestoreGoal={handleRestoreGoal}
      onDeleteGoal={handleDeleteGoal}
      onCheckInGoal={handleCheckInGoal}
      conflictError={conflictError}
      onResolveConflict={() => {
        setConflictError(null);
        void refetch();
      }}
    />
  );
}
