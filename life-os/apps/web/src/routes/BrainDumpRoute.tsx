import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { useToast } from "@state/toastQueue";
import { useAuthSession } from "@state/authSession";
import {
  BrainDumpScreen,
  useBrainDumpItems,
  useCaptureBrainDumpItem,
  useDeferBrainDumpItem,
  useArchiveBrainDumpItem,
  useRestoreBrainDumpItem,
  useDeleteBrainDumpItem,
  useConvertBrainDumpToTask,
  useConvertBrainDumpToNote,
  useConvertBrainDumpToProject,
  useConvertBrainDumpToGoal,
  type BrainDumpItem,
  type BrainDumpStatusFilter,
  type BrainDumpCaptureStatus,
} from "@features/brain-dump";

/**
 * BrainDumpRoute (LOS-1205).
 *
 * Integration layer between the `BrainDumpScreen` component and the API hooks.
 * URL search params persist filter state so the inbox position survives
 * navigation. The route owns capture status so text is preserved on error.
 */
export function BrainDumpRoute() {
  const { user } = useAuthSession();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [captureStatus, setCaptureStatus] = useState<BrainDumpCaptureStatus>({ type: "idle" });

  // Browser online/offline tracking
  const [isOnline, setIsOnline] = useState(() =>
    typeof window !== "undefined" ? window.navigator.onLine : true,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // URL param helpers
  const searchQuery = searchParams.get("q") ?? "";
  const statusFilter = (searchParams.get("status") ?? "UNPROCESSED") as BrainDumpStatusFilter;
  const showArchived = searchParams.get("archived") === "true";

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

  // Build query params that match the selected status filter
  const apiQueryParams = useMemo(() => {
    const params: Record<string, unknown> = {
      archived: showArchived,
      page: 0,
      size: 100,
      sortBy: "createdAt",
      sortDirection: "DESC" as const,
    };
    if (searchQuery) params.q = searchQuery;
    if (statusFilter !== "ALL") params.status = statusFilter;
    return params;
  }, [searchQuery, statusFilter, showArchived]);

  const itemsQuery = useBrainDumpItems(apiQueryParams, user !== null);

  // Mutations
  const captureMutation = useCaptureBrainDumpItem();
  const deferMutation = useDeferBrainDumpItem();
  const archiveMutation = useArchiveBrainDumpItem();
  const restoreMutation = useRestoreBrainDumpItem();
  const deleteMutation = useDeleteBrainDumpItem();
  const convertToTaskMutation = useConvertBrainDumpToTask();
  const convertToNoteMutation = useConvertBrainDumpToNote();
  const convertToProjectMutation = useConvertBrainDumpToProject();
  const convertToGoalMutation = useConvertBrainDumpToGoal();

  // Handlers
  const handleCapture = async (content: string) => {
    if (!isOnline) {
      setCaptureStatus({ type: "offline-queued" });
      return;
    }
    setCaptureStatus({ type: "saving" });
    try {
      await captureMutation.mutateAsync({ content });
      setCaptureStatus({ type: "saved", message: "Brain Dump item captured." });
    } catch {
      setCaptureStatus({
        type: "error",
        message: "Failed to capture item. Your text is preserved — try again.",
      });
    }
  };

  const handleDefer = async (item: BrainDumpItem) => {
    try {
      await deferMutation.mutateAsync({ id: item.id, version: item.version });
      toast.push({ tone: "success", message: "Brain Dump item deferred." });
    } catch {
      toast.push({ tone: "danger", message: "Failed to defer item." });
    }
  };

  const handleArchiveToggle = async (item: BrainDumpItem) => {
    try {
      if (item.archived) {
        await restoreMutation.mutateAsync({ id: item.id, version: item.version });
        toast.push({ tone: "success", message: "Brain Dump item restored." });
      } else {
        await archiveMutation.mutateAsync({ id: item.id, version: item.version });
        toast.push({ tone: "success", message: "Brain Dump item archived." });
      }
    } catch {
      toast.push({ tone: "danger", message: "Failed to update item." });
    }
  };

  const handleDelete = async (item: BrainDumpItem) => {
    try {
      await deleteMutation.mutateAsync(item.id);
      toast.push({ tone: "success", message: "Brain Dump item deleted." });
    } catch {
      toast.push({ tone: "danger", message: "Failed to delete item." });
    }
  };

  const handleConvertToTask = async (item: BrainDumpItem) => {
    try {
      await convertToTaskMutation.mutateAsync({ id: item.id });
      toast.push({ tone: "success", message: "Converted to Task." });
    } catch {
      toast.push({ tone: "danger", message: "Failed to convert to Task." });
    }
  };

  const handleConvertToNote = async (item: BrainDumpItem) => {
    try {
      await convertToNoteMutation.mutateAsync({ id: item.id });
      toast.push({ tone: "success", message: "Converted to Note." });
    } catch {
      toast.push({ tone: "danger", message: "Failed to convert to Note." });
    }
  };

  const handleConvertToProject = async (item: BrainDumpItem) => {
    try {
      await convertToProjectMutation.mutateAsync({ id: item.id });
      toast.push({ tone: "success", message: "Converted to Project." });
    } catch {
      toast.push({ tone: "danger", message: "Failed to convert to Project." });
    }
  };

  const handleConvertToGoal = async (item: BrainDumpItem) => {
    try {
      await convertToGoalMutation.mutateAsync({ id: item.id });
      toast.push({ tone: "success", message: "Converted to Goal." });
    } catch {
      toast.push({ tone: "danger", message: "Failed to convert to Goal." });
    }
  };

  if (user === null) return null;

  return (
    <BrainDumpScreen
      items={itemsQuery.data?.items ?? []}
      loading={itemsQuery.isPending}
      error={itemsQuery.isError ? (itemsQuery.error?.message ?? "Failed to load items.") : null}
      searchQuery={searchQuery}
      onSearchQueryChange={(q) => updateUrlParams({ q })}
      statusFilter={statusFilter}
      onStatusFilterChange={(status) => updateUrlParams({ status })}
      showArchived={showArchived}
      onShowArchivedChange={(show) => updateUrlParams({ archived: show ? "true" : null })}
      captureStatus={captureStatus}
      isOnline={isOnline}
      onCapture={handleCapture}
      onDefer={handleDefer}
      onArchiveToggle={handleArchiveToggle}
      onDelete={handleDelete}
      onConvertToTask={handleConvertToTask}
      onConvertToNote={handleConvertToNote}
      onConvertToProject={handleConvertToProject}
      onConvertToGoal={handleConvertToGoal}
    />
  );
}
