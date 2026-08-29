import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useProjects } from "@features/projects";
import { useTaskDetail, useTasks } from "@features/tasks";
import {
  localDateTimeToInstantIso,
  TimeBlocksScreen,
  useCompleteTimeBlock,
  useCheckTimeBlockOverlap,
  useCreateTimeBlock,
  useDeleteTimeBlock,
  useDailyTimeSummary,
  useDuplicateTimeBlock,
  useMoveTimeBlock,
  useResizeTimeBlock,
  useTimeBlocks,
  useUpdateTimeBlock,
  type TimeBlock,
  type TimeBlockCategoryOption,
  type TimeBlockFormData,
  type TimeBlockProjectOption,
  type TimeBlockQueryParams,
  type TimeBlockTaskOption,
  type TimeBlocksViewMode,
} from "@features/time-blocks";
import { ApiError } from "@lib/apiClient";
import { todayLocalDate, type LocalDate, type LocalTime } from "@lib/localDateTime";
import { useAuthSession } from "@state/authSession";
import { useToast } from "@state/toastQueue";

const DEFAULT_CATEGORIES: readonly TimeBlockCategoryOption[] = [
  { value: "Focus", label: "Focus", color: "blue", icon: "target" },
  { value: "Meeting", label: "Meeting", color: "purple", icon: "users" },
  { value: "Planning", label: "Planning", color: "green", icon: "calendar" },
  { value: "Admin", label: "Admin", color: "gray", icon: "file-text" },
  { value: "Personal", label: "Personal", color: "amber", icon: "user" },
  { value: "Health", label: "Health", color: "emerald", icon: "heart" },
  { value: "Leisure", label: "Leisure", color: "indigo", icon: "coffee" },
];

export function TimeBlocksRoute() {
  const { user } = useAuthSession();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const timeZone = user?.timeZone ?? "UTC";
  const locale = user?.locale ?? "en-US";
  const today = todayLocalDate(timeZone);

  const rawDate = searchParams.get("date");
  const currentDate: LocalDate = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : today;

  const rawView = searchParams.get("view");
  const viewMode: TimeBlocksViewMode = rawView === "week" ? "week" : "day";
  const selectedBlockId = searchParams.get("selected");
  const linkedTaskId = selectedBlockId ? "" : (searchParams.get("taskId") ?? "");

  const queryParams: TimeBlockQueryParams = useMemo(
    () => ({
      date: currentDate,
      timeZone,
    }),
    [currentDate, timeZone],
  );

  const timeBlocksQuery = useTimeBlocks(queryParams, user !== null);
  const timeSummaryQuery = useDailyTimeSummary(currentDate, timeZone, user !== null);
  const projectsQuery = useProjects({ size: 100, archived: false }, user !== null);
  const tasksQuery = useTasks({ size: 100, archived: false }, user !== null);
  const linkedTaskQuery = useTaskDetail(linkedTaskId, user !== null && Boolean(linkedTaskId));

  const createMutation = useCreateTimeBlock();
  const updateMutation = useUpdateTimeBlock();
  const moveMutation = useMoveTimeBlock();
  const resizeMutation = useResizeTimeBlock();
  const completeMutation = useCompleteTimeBlock();
  const duplicateMutation = useDuplicateTimeBlock();
  const deleteMutation = useDeleteTimeBlock();
  const overlapMutation = useCheckTimeBlockOverlap();
  const [formError, setFormError] = useState<string | null>(null);
  const [formConflictDescriptions, setFormConflictDescriptions] = useState<readonly string[]>([]);

  const projectOptions: readonly TimeBlockProjectOption[] = useMemo(
    () =>
      (projectsQuery.data?.items ?? []).map((p) => ({
        id: p.id,
        name: p.name,
      })),
    [projectsQuery.data?.items],
  );

  const taskOptions: readonly TimeBlockTaskOption[] = useMemo(() => {
    const options = (tasksQuery.data?.items ?? []).map((t) => ({
      id: t.id,
      title: t.title,
    }));
    const linkedTask = linkedTaskQuery.data?.task;
    if (linkedTask && !options.some((task) => task.id === linkedTask.id)) {
      options.push({ id: linkedTask.id, title: linkedTask.title });
    }
    return options;
  }, [linkedTaskQuery.data?.task, tasksQuery.data?.items]);

  if (user === null) {
    return null;
  }

  const handleDateChange = (newDate: LocalDate) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("date", newDate);
      return next;
    });
  };

  const handleViewModeChange = (newView: TimeBlocksViewMode) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("view", newView);
      return next;
    });
  };

  const resetFormState = () => {
    setFormError(null);
    setFormConflictDescriptions([]);
  };

  const preflightOverlap = async (formData: TimeBlockFormData, excludeId?: string) => {
    const startAt = localDateTimeToInstantIso(formData.date, formData.startTime, formData.timeZone);
    const endAt = localDateTimeToInstantIso(formData.date, formData.endTime, formData.timeZone);

    if (formData.allowOverlap) {
      return { allowed: true, startAt, endAt } as const;
    }

    const result = await overlapMutation.mutateAsync({
      startAt,
      endAt,
      ...(excludeId ? { excludeId } : {}),
    });
    if (!result.hasConflict) {
      return { allowed: true, startAt, endAt } as const;
    }

    setFormConflictDescriptions(
      result.conflictingBlocks.map((block) => `Overlaps with ${block.title}.`),
    );
    return { allowed: false, startAt, endAt } as const;
  };

  const handleSubmitError = (error: unknown) => {
    if (
      error instanceof ApiError &&
      error.status === 409 &&
      error.problem?.code === "TIME_BLOCK_OVERLAP_CONFLICT"
    ) {
      setFormConflictDescriptions(["Another Time Block now overlaps with this time."]);
    } else {
      setFormError(error instanceof Error ? error.message : "The time block couldn't be saved.");
    }
    return false;
  };

  const handleCreateSubmit = async (formData: TimeBlockFormData) => {
    resetFormState();
    try {
      const preflight = await preflightOverlap(formData);
      if (!preflight.allowed) return false;

      await createMutation.mutateAsync({
        title: formData.title,
        category: formData.category,
        status: formData.status,
        startAt: preflight.startAt,
        endAt: preflight.endAt,
        sourceTimeZone: formData.timeZone,
        notes: formData.notes,
        projectId: formData.projectId,
        taskId: formData.taskId,
        allowOverlap: formData.allowOverlap,
      });
      toast.push({ tone: "success", message: "Time block created." });
      return true;
    } catch (error) {
      return handleSubmitError(error);
    }
  };

  const handleEditSubmit = async (formData: TimeBlockFormData) => {
    if (!formData.id) return;
    resetFormState();
    try {
      const preflight = await preflightOverlap(formData, formData.id);
      if (!preflight.allowed) return false;

      await updateMutation.mutateAsync({
        id: formData.id,
        request: {
          title: formData.title,
          category: formData.category,
          status: formData.status,
          startAt: preflight.startAt,
          endAt: preflight.endAt,
          sourceTimeZone: formData.timeZone,
          notes: formData.notes,
          projectId: formData.projectId,
          taskId: formData.taskId,
          version: formData.version ?? 1,
          allowOverlap: formData.allowOverlap,
        },
      });
      toast.push({ tone: "success", message: "Time block saved." });
      return true;
    } catch (error) {
      return handleSubmitError(error);
    }
  };

  const handleMoveBlock = async (blockId: string, newStart: LocalTime, newEnd: LocalTime) => {
    const targetBlock = timeBlocksQuery.data?.items.find((b) => b.id === blockId);
    const date = targetBlock?.date ?? currentDate;
    const startAt = localDateTimeToInstantIso(date, newStart, timeZone);
    const endAt = localDateTimeToInstantIso(date, newEnd, timeZone);

    await moveMutation.mutateAsync({
      id: blockId,
      request: {
        startAt,
        endAt,
        version: targetBlock?.version ?? 1,
      },
    });
    toast.push({ tone: "success", message: "Time block moved." });
  };

  const handleResizeBlock = async (blockId: string, newEnd: LocalTime) => {
    const targetBlock = timeBlocksQuery.data?.items.find((b) => b.id === blockId);
    const date = targetBlock?.date ?? currentDate;
    const startAt = localDateTimeToInstantIso(date, targetBlock?.startTime ?? "09:00", timeZone);
    const endAt = localDateTimeToInstantIso(date, newEnd, timeZone);

    await resizeMutation.mutateAsync({
      id: blockId,
      request: {
        startAt,
        endAt,
        version: targetBlock?.version ?? 1,
      },
    });
    toast.push({ tone: "success", message: "Time block resized." });
  };

  const handleCompleteBlock = async (block: TimeBlock) => {
    await completeMutation.mutateAsync({
      id: block.id,
      version: block.version ?? 1,
    });
    toast.push({ tone: "success", message: "Time block completed." });
  };

  const handleDuplicateBlock = async (block: TimeBlock) => {
    await duplicateMutation.mutateAsync({ id: block.id });
    toast.push({ tone: "success", message: "Time block duplicated." });
  };

  const handleDeleteConfirm = async (block: TimeBlock) => {
    await deleteMutation.mutateAsync(block.id);
    toast.push({ tone: "success", message: "Time block deleted." });
  };

  const blocksList = timeBlocksQuery.data?.items ?? [];

  return (
    <TimeBlocksScreen
      blocks={blocksList}
      loading={timeBlocksQuery.isPending}
      error={
        timeBlocksQuery.isError
          ? (timeBlocksQuery.error?.message ?? "Failed to load time blocks.")
          : null
      }
      initialDate={currentDate}
      {...(selectedBlockId ? { initialSelectedBlockId: selectedBlockId } : {})}
      {...(linkedTaskId ? { initialCreateTaskId: linkedTaskId } : {})}
      initialViewMode={viewMode}
      timeZone={timeZone}
      locale={locale}
      projects={projectOptions}
      tasks={taskOptions}
      categories={DEFAULT_CATEGORIES}
      {...(timeSummaryQuery.data ? { timeSummary: timeSummaryQuery.data } : {})}
      timeSummaryLoading={timeSummaryQuery.isPending}
      timeSummaryError={
        timeSummaryQuery.isError
          ? (timeSummaryQuery.error?.message ?? "Time summary couldn't load.")
          : null
      }
      formPending={
        createMutation.isPending || updateMutation.isPending || overlapMutation.isPending
      }
      formError={formError}
      formConflictDescriptions={formConflictDescriptions}
      onResolveFormConflict={() => setFormConflictDescriptions([])}
      onFormReset={resetFormState}
      onTimeSummaryRetry={() => void timeSummaryQuery.refetch()}
      onEditFocusTarget={() => navigate("/life-os/app/settings/focus")}
      onRetry={() => void timeBlocksQuery.refetch()}
      onDateChange={handleDateChange}
      onViewModeChange={handleViewModeChange}
      onCreateBlockSubmit={handleCreateSubmit}
      onEditBlockSubmit={handleEditSubmit}
      onMoveBlock={handleMoveBlock}
      onResizeBlock={handleResizeBlock}
      onCompleteBlock={handleCompleteBlock}
      onDuplicateBlock={handleDuplicateBlock}
      onDeleteBlockConfirm={handleDeleteConfirm}
      onStartFocus={(block) =>
        navigate(`/life-os/app/focus?timeBlockId=${encodeURIComponent(block.id)}`)
      }
    />
  );
}
