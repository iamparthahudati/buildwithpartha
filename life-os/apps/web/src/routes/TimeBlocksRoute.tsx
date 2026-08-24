import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { useProjects } from "@features/projects";
import { useTasks } from "@features/tasks";
import {
  localDateTimeToInstantIso,
  TimeBlocksScreen,
  useCompleteTimeBlock,
  useCreateTimeBlock,
  useDeleteTimeBlock,
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
  const [searchParams, setSearchParams] = useSearchParams();

  const timeZone = user?.timeZone ?? "UTC";
  const locale = user?.locale ?? "en-US";
  const today = todayLocalDate(timeZone);

  const rawDate = searchParams.get("date");
  const currentDate: LocalDate = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : today;

  const rawView = searchParams.get("view");
  const viewMode: TimeBlocksViewMode = rawView === "week" ? "week" : "day";

  const queryParams: TimeBlockQueryParams = useMemo(
    () => ({
      date: currentDate,
      timeZone,
    }),
    [currentDate, timeZone],
  );

  const timeBlocksQuery = useTimeBlocks(queryParams, user !== null);
  const projectsQuery = useProjects({ size: 100, archived: false }, user !== null);
  const tasksQuery = useTasks({ size: 100, archived: false }, user !== null);

  const createMutation = useCreateTimeBlock();
  const updateMutation = useUpdateTimeBlock();
  const moveMutation = useMoveTimeBlock();
  const resizeMutation = useResizeTimeBlock();
  const completeMutation = useCompleteTimeBlock();
  const duplicateMutation = useDuplicateTimeBlock();
  const deleteMutation = useDeleteTimeBlock();

  const projectOptions: readonly TimeBlockProjectOption[] = useMemo(
    () =>
      (projectsQuery.data?.items ?? []).map((p) => ({
        id: p.id,
        name: p.name,
      })),
    [projectsQuery.data?.items],
  );

  const taskOptions: readonly TimeBlockTaskOption[] = useMemo(
    () =>
      (tasksQuery.data?.items ?? []).map((t) => ({
        id: t.id,
        title: t.title,
      })),
    [tasksQuery.data?.items],
  );

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

  const handleCreateSubmit = async (formData: TimeBlockFormData) => {
    const startAt = localDateTimeToInstantIso(formData.date, formData.startTime, formData.timeZone);
    const endAt = localDateTimeToInstantIso(formData.date, formData.endTime, formData.timeZone);

    await createMutation.mutateAsync({
      title: formData.title,
      category: formData.category,
      status: formData.status,
      startAt,
      endAt,
      sourceTimeZone: formData.timeZone,
      notes: formData.notes,
      projectId: formData.projectId,
      taskId: formData.taskId,
      allowOverlap: formData.allowOverlap,
    });
    toast.push({ tone: "success", message: "Time block created." });
  };

  const handleEditSubmit = async (formData: TimeBlockFormData) => {
    if (!formData.id) return;
    const startAt = localDateTimeToInstantIso(formData.date, formData.startTime, formData.timeZone);
    const endAt = localDateTimeToInstantIso(formData.date, formData.endTime, formData.timeZone);

    await updateMutation.mutateAsync({
      id: formData.id,
      request: {
        title: formData.title,
        category: formData.category,
        status: formData.status,
        startAt,
        endAt,
        sourceTimeZone: formData.timeZone,
        notes: formData.notes,
        projectId: formData.projectId,
        taskId: formData.taskId,
        version: formData.version ?? 1,
        allowOverlap: formData.allowOverlap,
      },
    });
    toast.push({ tone: "success", message: "Time block saved." });
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

  const blocksList = timeBlocksQuery.data?.items;

  return (
    <TimeBlocksScreen
      {...(blocksList ? { blocks: blocksList } : {})}
      loading={timeBlocksQuery.isPending}
      error={
        timeBlocksQuery.isError
          ? (timeBlocksQuery.error?.message ?? "Failed to load time blocks.")
          : null
      }
      initialDate={currentDate}
      {...(searchParams.get("selected")
        ? { initialSelectedBlockId: searchParams.get("selected")! }
        : {})}
      initialViewMode={viewMode}
      timeZone={timeZone}
      locale={locale}
      projects={projectOptions}
      tasks={taskOptions}
      categories={DEFAULT_CATEGORIES}
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
      onStartFocus={() => {
        toast.push({ tone: "info", message: "Focus session started." });
      }}
    />
  );
}
