import { useCallback, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  GoalDetailsScreen,
  useGoalDetail,
  useUpdateGoal,
  usePauseGoal,
  useCompleteGoal,
  useArchiveGoal,
  useRestoreGoal,
  useDeleteGoal,
  useRecordCheckIn,
  useDeleteCheckIn,
  useAddGoalLink,
  useDeleteGoalLink,
  type GoalFormData,
  type GoalLinkTargetType,
} from "@features/goals";
import { useAuthSession } from "@state/authSession";
import { ApiError } from "@lib/apiClient";

export function GoalDetailsRoute() {
  const { goalId = "" } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthSession();
  const [conflictError, setConflictError] = useState<string | null>(null);

  const goalDetailQuery = useGoalDetail(goalId, user !== null && goalId !== "");
  const { data, isLoading, isError, error, refetch } = goalDetailQuery;

  const updateMutation = useUpdateGoal();
  const pauseMutation = usePauseGoal();
  const completeMutation = useCompleteGoal();
  const archiveMutation = useArchiveGoal();
  const restoreMutation = useRestoreGoal();
  const deleteMutation = useDeleteGoal();
  const checkInMutation = useRecordCheckIn();
  const deleteCheckInMutation = useDeleteCheckIn();
  const addLinkMutation = useAddGoalLink();
  const deleteLinkMutation = useDeleteGoalLink();

  const goal = data?.goal;
  const checkIns = data?.checkIns ?? [];
  const links = data?.links ?? [];

  const handleMutationError = (err: unknown) => {
    if (err instanceof ApiError && err.status === 409) {
      setConflictError(
        "Another change was made to this goal by a concurrent request. Please reload the latest goal state.",
      );
    } else {
      setConflictError(null);
    }
  };

  const handleGoBack = useCallback(() => {
    navigate("/life-os/app/goals");
  }, [navigate]);

  const handleCheckIn = useCallback(
    async (value: number, note?: string) => {
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
    [checkInMutation, goalId],
  );

  const handleDeleteCheckIn = useCallback(
    async (checkInId: string) => {
      setConflictError(null);
      try {
        await deleteCheckInMutation.mutateAsync({ goalId, checkInId });
      } catch (err) {
        handleMutationError(err);
      }
    },
    [deleteCheckInMutation, goalId],
  );

  const handleAddLink = useCallback(
    async (targetType: GoalLinkTargetType, targetId: string) => {
      setConflictError(null);
      try {
        await addLinkMutation.mutateAsync({
          goalId,
          request: { targetType, targetId },
        });
      } catch (err) {
        handleMutationError(err);
      }
    },
    [addLinkMutation, goalId],
  );

  const handleDeleteLink = useCallback(
    async (linkId: string) => {
      setConflictError(null);
      try {
        await deleteLinkMutation.mutateAsync({ goalId, linkId });
      } catch (err) {
        handleMutationError(err);
      }
    },
    [deleteLinkMutation, goalId],
  );

  const handleUpdateGoal = useCallback(
    async (id: string, formData: GoalFormData) => {
      setConflictError(null);
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
            version: goal?.version ?? formData.version ?? 1,
          },
        });
      } catch (err) {
        handleMutationError(err);
      }
    },
    [goal?.version, updateMutation],
  );

  const handlePauseGoal = useCallback(
    async (id: string) => {
      setConflictError(null);
      try {
        await pauseMutation.mutateAsync({
          id,
          request: {
            version: goal?.version ?? 1,
          },
        });
      } catch (err) {
        handleMutationError(err);
      }
    },
    [goal?.version, pauseMutation],
  );

  const handleResumeGoal = useCallback(
    async (id: string) => {
      setConflictError(null);
      if (!goal) return;
      try {
        await updateMutation.mutateAsync({
          id,
          request: {
            title: goal.title,
            description: goal.description ?? null,
            category: goal.category,
            progressType: goal.progressType,
            targetValue: goal.targetValue ?? null,
            currentValue: goal.currentValue,
            unit: goal.unit ?? null,
            targetDate: goal.targetDate ?? null,
            checkInCadence: goal.checkInCadence,
            version: goal.version ?? 1,
          },
        });
      } catch (err) {
        handleMutationError(err);
      }
    },
    [goal, updateMutation],
  );

  const handleCompleteGoal = useCallback(
    async (id: string) => {
      setConflictError(null);
      try {
        await completeMutation.mutateAsync({
          id,
          request: {
            version: goal?.version ?? 1,
          },
        });
      } catch (err) {
        handleMutationError(err);
      }
    },
    [completeMutation, goal?.version],
  );

  const handleArchiveGoal = useCallback(
    async (id: string) => {
      setConflictError(null);
      try {
        await archiveMutation.mutateAsync({
          id,
          request: {
            version: goal?.version ?? 1,
          },
        });
      } catch (err) {
        handleMutationError(err);
      }
    },
    [archiveMutation, goal?.version],
  );

  const handleRestoreGoal = useCallback(
    async (id: string) => {
      setConflictError(null);
      try {
        await restoreMutation.mutateAsync({
          id,
          request: {
            version: goal?.version ?? 1,
          },
        });
      } catch (err) {
        handleMutationError(err);
      }
    },
    [goal?.version, restoreMutation],
  );

  const handleDeleteGoal = useCallback(
    async (id: string) => {
      setConflictError(null);
      try {
        await deleteMutation.mutateAsync(id);
        navigate("/life-os/app/goals");
      } catch (err) {
        handleMutationError(err);
      }
    },
    [deleteMutation, navigate],
  );

  if (user === null) {
    return null;
  }

  return (
    <GoalDetailsScreen
      goal={goal ?? null}
      checkIns={checkIns}
      links={links}
      loading={isLoading}
      notFound={isError && error?.message?.includes("404")}
      forbidden={isError && error?.message?.includes("403")}
      error={isError ? error : null}
      onRetry={() => void refetch()}
      onGoBack={handleGoBack}
      onCheckIn={handleCheckIn}
      onDeleteCheckIn={handleDeleteCheckIn}
      onAddLink={handleAddLink}
      onDeleteLink={handleDeleteLink}
      onUpdateGoal={handleUpdateGoal}
      onPauseGoal={handlePauseGoal}
      onResumeGoal={handleResumeGoal}
      onCompleteGoal={handleCompleteGoal}
      onArchiveGoal={handleArchiveGoal}
      onRestoreGoal={handleRestoreGoal}
      onDeleteGoal={handleDeleteGoal}
      conflictError={conflictError}
      onResolveConflict={() => {
        setConflictError(null);
        void refetch();
      }}
    />
  );
}
