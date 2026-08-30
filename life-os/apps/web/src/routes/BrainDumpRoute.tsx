import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";

import type { AppShellOutletContext } from "@components/layout";
import { useToast } from "@state/toastQueue";
import { useAuthSession } from "@state/authSession";
import {
  BrainDumpScreen,
  BRAIN_DUMP_TARGET_LABELS,
  useBrainDumpItems,
  useCaptureBrainDumpItem,
  useDeferBrainDumpItem,
  useArchiveBrainDumpItem,
  useRestoreBrainDumpItem,
  useDeleteBrainDumpItem,
  useConvertBrainDumpItem,
  useBrainDumpBatchConvert,
  useBrainDumpCaptureQueue,
  type BrainDumpConvertResultState,
  type BrainDumpConvertSubmit,
  type BrainDumpConvertTargetType,
  type BrainDumpItem,
  type BrainDumpStatusFilter,
  type BrainDumpCaptureStatus,
} from "@features/brain-dump";

/**
 * BrainDumpRoute (LOS-1205, conversion workflow LOS-1206).
 *
 * Integration layer between the `BrainDumpScreen` component and the API hooks.
 * URL search params persist filter state so the inbox position survives
 * navigation. The route owns capture status and conversion result state so a
 * converted item's transactional result link, and any conversion error, are
 * surfaced honestly.
 */
export function BrainDumpRoute() {
  const { user } = useAuthSession();
  const outletContext = useOutletContext<AppShellOutletContext | null>();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [captureStatus, setCaptureStatus] = useState<BrainDumpCaptureStatus>({ type: "idle" });

  // Conversion workflow state (LOS-1206).
  const [convertResult, setConvertResult] = useState<BrainDumpConvertResultState | null>(null);
  const [convertError, setConvertError] = useState<string | null>(null);

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
  const convertMutation = useConvertBrainDumpItem();
  const batchMutation = useBrainDumpBatchConvert();

  // Offline capture queue (LOS-1207): persists captures made while offline and
  // flushes them automatically when connectivity returns.
  const localCaptureQueue = useBrainDumpCaptureQueue({
    userId: user?.id ?? "",
    isOnline,
    enabled: user !== null && outletContext?.brainDumpCaptureQueue === undefined,
  });
  const captureQueue = outletContext?.brainDumpCaptureQueue ?? localCaptureQueue;

  // Handlers
  const handleCapture = async (content: string) => {
    if (!isOnline) {
      captureQueue.enqueue(content);
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

  const handleFlushQueue = async () => {
    const { sent, remaining } = await captureQueue.flush();
    if (sent > 0 && remaining === 0) {
      toast.push({ tone: "success", message: "Queued captures synced." });
    } else if (remaining > 0) {
      toast.push({
        tone: "warning",
        message: `${sent} synced, ${remaining} still queued — try again when back online.`,
      });
    }
  };

  const handleDiscardQueued = () => {
    captureQueue.discardAll();
    toast.push({ tone: "info", message: "Queued captures discarded." });
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

  const handleConvertSubmit = async (payload: BrainDumpConvertSubmit) => {
    const label = BRAIN_DUMP_TARGET_LABELS[payload.target];
    setConvertError(null);
    try {
      const updated = await convertMutation.mutateAsync(payload);
      if (updated.convertedToType && updated.convertedToId) {
        setConvertResult({
          itemId: payload.id,
          type: updated.convertedToType,
          id: updated.convertedToId,
        });
        toast.push({ tone: "success", message: `Converted to ${label}.` });
      } else {
        setConvertError(`Converted, but the new ${label} link is unavailable.`);
      }
    } catch {
      // The item is preserved; the conversion is idempotent, so retrying is safe.
      setConvertError(`Failed to convert to ${label}. Your item is unchanged — try again.`);
    }
  };

  const handleConvertDismiss = () => {
    setConvertResult(null);
    setConvertError(null);
  };

  const handleBatchConvert = async (
    items: readonly BrainDumpItem[],
    target: BrainDumpConvertTargetType,
  ) => {
    const label = BRAIN_DUMP_TARGET_LABELS[target];
    try {
      const result = await batchMutation.mutateAsync({ items, target });
      if (result.failureCount === 0) {
        toast.push({ tone: "success", message: `Converted ${result.successCount} to ${label}.` });
      } else {
        toast.push({
          tone: "warning",
          message: `${result.successCount} converted, ${result.failureCount} failed.`,
        });
      }
    } catch {
      toast.push({ tone: "danger", message: `Failed to convert items to ${label}.` });
    }
  };

  const handleBatchDismiss = () => {
    batchMutation.reset();
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
      queuedCount={captureQueue.queuedCount}
      flushing={captureQueue.isFlushing}
      onFlushQueue={handleFlushQueue}
      onDiscardQueued={handleDiscardQueued}
      onDefer={handleDefer}
      onArchiveToggle={handleArchiveToggle}
      onDelete={handleDelete}
      onConvertSubmit={handleConvertSubmit}
      convertPending={convertMutation.isPending}
      convertError={convertError}
      convertResult={convertResult}
      onConvertDismiss={handleConvertDismiss}
      onBatchConvert={handleBatchConvert}
      batchPending={batchMutation.isPending}
      batchResult={batchMutation.data ?? null}
      onBatchDismiss={handleBatchDismiss}
    />
  );
}
