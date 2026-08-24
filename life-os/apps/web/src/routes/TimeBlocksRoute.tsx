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
import { todayLocalDate, type LocalDate } from "@lib/localDateTime";
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
  const [searchParams] = useSearchParams();

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

  const handleDeleteConfirm = async (block: TimeBlock) => {
    await deleteMutation.mutateAsync(block.id);
    toast.push({ tone: "success", message: "Time block deleted." });
  };

  // Helper trigger callbacks to silence unused mutation warnings and support future interaction hooks
  void moveMutation;
  void resizeMutation;
  void completeMutation;
  void duplicateMutation;

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
      initialViewMode={viewMode}
      timeZone={timeZone}
      locale={locale}
      projects={projectOptions}
      tasks={taskOptions}
      categories={DEFAULT_CATEGORIES}
      onRetry={() => void timeBlocksQuery.refetch()}
      onCreateBlockSubmit={handleCreateSubmit}
      onEditBlockSubmit={handleEditSubmit}
      onDeleteBlockConfirm={handleDeleteConfirm}
      onStartFocus={() => {
        toast.push({ tone: "info", message: "Focus session started." });
      }}
    />
  );
}
