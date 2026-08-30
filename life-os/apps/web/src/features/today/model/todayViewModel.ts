import type { MetricCardStatus } from "@components/navigation";
import { formatDurationMinutes } from "@lib/duration";
import {
  compareLocalDates,
  formatLocalDate,
  localTimeToMinutes,
  nowLocalTime,
  type LocalDate,
} from "@lib/localDateTime";

import type {
  TodayMetricDto,
  TodayResponse,
  TodayTaskDto,
  TodayTimeBlockDto,
  TodayWidget,
} from "../api/todayApi";
import type { TodayActiveProjectsStatus } from "../components/TodayActiveProjects";
import type { TodayBrainDumpCountStatus } from "../components/TodayBrainCapture";
import type { TodayHabitsStatus } from "../components/TodayHabits";
import type { ProductPriority, TodayNextUpStatus } from "../components/TodayNextUp";
import type { TodayMetricsData } from "../components/TodayMetricStrip";
import type { TodayPlanningState } from "../components/TodayScreen";
import type { TodayReviewStatus } from "../components/TodayReviewPrompt";
import type { TodayMitState, TodayPlanTask, TodayTaskListState } from "./todayPlan";
import type { TodayScheduleBlock, TodayScheduleState } from "./todaySchedule";
import type { TodaySprintState, TodayWeekState } from "./todaySprintWeek";

const RETRY_SECTION_MESSAGE = "Other Today sections are still available. Try this section again.";
const DISABLED_TASK_ACTIONS = ["set-mit", "mark-done", "start-focus"] as const;

export interface TodayViewModel extends TodayMetricsData {
  readonly generatedAt: string | null;
  readonly userTimeZone: string | null;
  readonly localDate: LocalDate | null;
  readonly plan: {
    readonly mitState: TodayMitState;
    readonly tasksState: TodayTaskListState;
  };
  readonly nextUpStatus: TodayNextUpStatus;
  readonly scheduleState: TodayScheduleState;
  readonly reviewStatus: TodayReviewStatus;
  readonly sprintState: TodaySprintState;
  readonly weekState: TodayWeekState;
  readonly projectsStatus: TodayActiveProjectsStatus;
  readonly brainDumpCountStatus: TodayBrainDumpCountStatus;
  readonly habitsStatus: TodayHabitsStatus;
  readonly planningState: TodayPlanningState;
}

export function createLoadingTodayViewModel(): TodayViewModel {
  return {
    generatedAt: null,
    userTimeZone: null,
    localDate: null,
    mitStatus: { type: "loading" },
    tasksStatus: { type: "loading" },
    scheduledTimeStatus: { type: "loading" },
    focusTimeStatus: { type: "loading" },
    activeProjectsStatus: { type: "loading" },
    weekProgressStatus: { type: "loading" },
    plan: { mitState: { type: "loading" }, tasksState: { type: "loading" } },
    nextUpStatus: { type: "loading", availability: "no-focus-selected" },
    scheduleState: { type: "loading" },
    reviewStatus: { type: "loading" },
    sprintState: { type: "loading" },
    weekState: { type: "loading" },
    projectsStatus: { type: "loading" },
    brainDumpCountStatus: { type: "loading" },
    habitsStatus: { type: "loading" },
    planningState: { type: "balanced" },
  };
}

export function createErrorTodayViewModel(): TodayViewModel {
  const metricError = (): MetricCardStatus => ({
    type: "error",
    message: "Unavailable",
  });
  return {
    generatedAt: null,
    userTimeZone: null,
    localDate: null,
    mitStatus: metricError(),
    tasksStatus: metricError(),
    scheduledTimeStatus: metricError(),
    focusTimeStatus: metricError(),
    activeProjectsStatus: metricError(),
    weekProgressStatus: metricError(),
    plan: {
      mitState: { type: "error", message: RETRY_SECTION_MESSAGE },
      tasksState: { type: "error", message: RETRY_SECTION_MESSAGE },
    },
    nextUpStatus: {
      type: "error",
      availability: "no-focus-selected",
      message: RETRY_SECTION_MESSAGE,
    },
    scheduleState: { type: "error", message: RETRY_SECTION_MESSAGE },
    reviewStatus: { type: "error", message: RETRY_SECTION_MESSAGE },
    sprintState: { type: "error", message: RETRY_SECTION_MESSAGE },
    weekState: { type: "error", message: RETRY_SECTION_MESSAGE },
    projectsStatus: { type: "error", message: RETRY_SECTION_MESSAGE },
    brainDumpCountStatus: { type: "error", message: "Brain Dump count couldn't load." },
    habitsStatus: { type: "error", message: "Habits couldn't load." },
    planningState: { type: "balanced" },
  };
}

/** Maps the stable modular API contract into the already-composed screen contracts. */
export function mapTodayResponse(
  response: TodayResponse,
  locale: string,
  now: Date = new Date(),
): TodayViewModel {
  const mitState = mapMit(response, locale);
  const tasksState = mapTasks(response, locale);
  const scheduleState = mapSchedule(response);
  const activeProjectsStatus = mapActiveProjects(response);

  return {
    generatedAt: response.generatedAt,
    userTimeZone: response.userTimeZone,
    localDate: response.localDate,
    mitStatus: mapMitMetric(response),
    tasksStatus: mapTasksMetric(response),
    scheduledTimeStatus: mapScheduleMetric(response, locale),
    focusTimeStatus: mapFocusMetric(response, locale),
    activeProjectsStatus: mapProjectsMetric(response),
    weekProgressStatus: mapWeekMetric(response),
    plan: { mitState, tasksState },
    nextUpStatus: mapNextUp(response, locale),
    scheduleState,
    reviewStatus: mapReview(response, now),
    sprintState: mapSprint(response),
    weekState: mapWeek(response),
    projectsStatus: activeProjectsStatus,
    brainDumpCountStatus: mapBrainDump(response),
    habitsStatus: mapHabits(response),
    planningState:
      response.schedule.status === "SUCCESS" && (response.schedule.data?.conflicts.length ?? 0) > 0
        ? { type: "overloaded", reviewPlanHref: "/life-os/app/week-planner" }
        : { type: "balanced" },
  };
}

function mapHabits(response: TodayResponse): TodayHabitsStatus {
  if (response.habits.status === "ERROR") {
    return { type: "error", message: "Habits couldn't load." };
  }
  return { type: "ready", habits: response.habits.data?.habits ?? [] };
}

export function formatTodayLastUpdated(
  generatedAt: string,
  locale: string,
  timeZone: string,
): string {
  const instant = new Date(generatedAt);
  if (Number.isNaN(instant.getTime())) return "an earlier update";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(instant);
}

function mapMit(response: TodayResponse, locale: string): TodayMitState {
  if (response.mit.status === "ERROR") {
    return { type: "error", message: RETRY_SECTION_MESSAGE };
  }
  if (response.mit.status !== "SUCCESS" || response.mit.data === null) {
    return { type: "empty" };
  }
  return {
    type: "ready",
    task: mapMitTask(response.mit.data, response.localDate, locale),
  };
}

function mapTasks(response: TodayResponse, locale: string): TodayTaskListState {
  if (response.tasks.status === "ERROR") {
    return { type: "error", message: RETRY_SECTION_MESSAGE };
  }
  const tasks = response.tasks.data?.tasks ?? [];
  if (response.tasks.status !== "SUCCESS" || tasks.length === 0) {
    return { type: "empty" };
  }
  const mitTaskId = response.mit.status === "SUCCESS" ? response.mit.data?.taskId : undefined;
  return {
    type: "ready",
    tasks: tasks.map((task) => mapTask(task, response.localDate, locale, task.id === mitTaskId)),
  };
}

function mapMitTask(
  task: NonNullable<TodayResponse["mit"]["data"]>,
  localDate: LocalDate,
  locale: string,
): TodayPlanTask {
  return {
    id: task.taskId,
    title: task.title,
    href: taskHref(task.taskId),
    priority: priority(task.priority),
    status: task.completed ? "DONE" : task.focusActive ? "IN_PROGRESS" : "TO_DO",
    ...(task.projectId && task.projectName
      ? {
          project: {
            name: task.projectName,
            href: projectHref(task.projectId),
          },
        }
      : {}),
    ...(task.dueDate ? { dueLabel: dueLabel(task.dueDate, localDate, locale, false) } : {}),
    isMit: true,
    disabledActions: DISABLED_TASK_ACTIONS,
  };
}

function mapTask(
  task: TodayTaskDto,
  localDate: LocalDate,
  locale: string,
  isMit: boolean,
): TodayPlanTask {
  return {
    id: task.id,
    title: task.title,
    href: taskHref(task.id),
    priority: priority(task.priority),
    status: taskStatus(task),
    ...(task.projectId && task.projectName
      ? { project: { name: task.projectName, href: projectHref(task.projectId) } }
      : {}),
    ...(task.dueDate
      ? { dueLabel: dueLabel(task.dueDate, localDate, locale, task.isOverdue) }
      : {}),
    ...(isMit ? { isMit: true } : {}),
    disabledActions: DISABLED_TASK_ACTIONS,
  };
}

function mapSchedule(response: TodayResponse): TodayScheduleState {
  if (response.schedule.status === "ERROR") {
    return { type: "error", message: RETRY_SECTION_MESSAGE };
  }
  const blocks = response.schedule.data?.blocks ?? [];
  if (response.schedule.status !== "SUCCESS" || blocks.length === 0) {
    return { type: "empty" };
  }
  const currentId = response.currentNextBlock.data?.current?.id;
  const nextId = response.currentNextBlock.data?.next?.id;
  const conflicts = response.schedule.data?.conflicts ?? [];
  return {
    type: "ready",
    blocks: blocks.map((block) => mapScheduleBlock(block, currentId, nextId, conflicts)),
  };
}

function mapScheduleBlock(
  block: TodayTimeBlockDto,
  currentId: string | undefined,
  nextId: string | undefined,
  conflicts: readonly {
    readonly firstBlockId: string;
    readonly secondBlockId: string;
    readonly description: string;
  }[],
): TodayScheduleBlock {
  return {
    id: block.id,
    title: block.title,
    href: `/life-os/app/time-blocks/${encodeURIComponent(block.id)}`,
    startTime: block.startTime,
    endTime: block.endTime,
    state: block.completed
      ? "completed"
      : block.id === currentId
        ? "current"
        : block.id === nextId
          ? "next"
          : "upcoming",
    ...(block.category ? { category: block.category } : {}),
    ...(block.projectId && block.projectName
      ? {
          project: {
            id: block.projectId,
            name: block.projectName,
            href: projectHref(block.projectId),
          },
        }
      : {}),
    ...(() => {
      const descriptions = conflicts
        .filter(
          (conflict) => conflict.firstBlockId === block.id || conflict.secondBlockId === block.id,
        )
        .map((conflict) => conflict.description);
      return descriptions.length > 0 ? { conflictDescriptions: descriptions } : {};
    })(),
  };
}

function mapNextUp(response: TodayResponse, locale: string): TodayNextUpStatus {
  if (response.mit.status === "SUCCESS" && response.mit.data && !response.mit.data.completed) {
    return { type: "hidden" };
  }
  const availability =
    response.mit.status === "SUCCESS" && response.mit.data?.completed
      ? "focus-completed"
      : "no-focus-selected";
  if (response.tasks.status === "ERROR") {
    return { type: "error", availability, message: RETRY_SECTION_MESSAGE };
  }
  if (response.tasks.status !== "SUCCESS") return { type: "empty", availability };

  const candidates = (response.tasks.data?.tasks ?? []).filter((task) => !task.completed);
  const task = [...candidates].sort(compareNextTasks)[0];
  if (!task) return { type: "empty", availability };

  return {
    type: "ready",
    availability,
    task: {
      id: task.id,
      title: task.title,
      href: taskHref(task.id),
      ...(task.projectName ? { projectName: task.projectName } : {}),
      priority: priority(task.priority),
      ...(task.dueDate
        ? { timingLabel: dueLabel(task.dueDate, response.localDate, locale, task.isOverdue) }
        : {}),
    },
    rankingExplanation: nextTaskExplanation(task, response.localDate, locale),
  };
}

function mapReview(response: TodayResponse, now: Date): TodayReviewStatus {
  const href = `/life-os/app/reviews/daily/${response.localDate}`;
  const data = response.review.data
    ? {
        morning: { state: reviewState(response.review.data.morningReviewState), href },
        evening: { state: reviewState(response.review.data.eveningReviewState), href },
        suggestedPeriod:
          Number(nowLocalTime(response.userTimeZone, now).slice(0, 2)) < 15
            ? ("morning" as const)
            : ("evening" as const),
      }
    : undefined;
  if (response.review.status === "ERROR") {
    return { type: "error", message: RETRY_SECTION_MESSAGE, ...(data ? { data } : {}) };
  }
  return {
    type: "ready",
    data:
      data ??
      ({
        morning: { state: "NOT_STARTED", href },
        evening: { state: "NOT_STARTED", href },
      } as const),
  };
}

function mapSprint(response: TodayResponse): TodaySprintState {
  if (response.sprint.status === "ERROR") {
    return { type: "error", message: RETRY_SECTION_MESSAGE };
  }
  if (response.sprint.status !== "SUCCESS" || response.sprint.data === null) {
    return { type: "empty" };
  }
  return { type: "ready", sprint: response.sprint.data };
}

function mapWeek(response: TodayResponse): TodayWeekState {
  if (response.week.status === "ERROR") {
    return { type: "error", message: RETRY_SECTION_MESSAGE };
  }
  const week = response.week.data;
  if (response.week.status !== "SUCCESS" || !week?.startDate || !week.endDate || !week.days) {
    return { type: "empty" };
  }
  return {
    type: "ready",
    week: {
      startDate: week.startDate,
      endDate: week.endDate,
      days: week.days.map((day) => ({
        ...day,
        ...(day.localDate === response.localDate ? { isToday: true } : {}),
      })),
      goals: week.outcomes,
      plannedMinutes: week.plannedMinutes ?? 0,
      capacityMinutes: week.capacityMinutes ?? 0,
    },
  };
}

function mapActiveProjects(response: TodayResponse): TodayActiveProjectsStatus {
  if (response.activeProjects.status === "ERROR") {
    return { type: "error", message: RETRY_SECTION_MESSAGE };
  }
  const projects = response.activeProjects.data?.projects ?? [];
  if (response.activeProjects.status !== "SUCCESS" || projects.length === 0) {
    return { type: "empty" };
  }
  const [first, ...rest] = projects.map((project) => ({
    id: project.id,
    name: project.name,
    href: projectHref(project.id),
    completedTasksCount: project.completedTasksCount,
    totalTasksCount: project.totalTasksCount,
  }));
  return { type: "ready", projects: [first!, ...rest] };
}

function mapBrainDump(response: TodayResponse): TodayBrainDumpCountStatus {
  if (response.brainDump.status === "ERROR") {
    return { type: "error", message: "Brain Dump count couldn't load." };
  }
  return {
    type: "ready",
    unprocessedCount: Math.max(0, response.brainDump.data?.unprocessedCount ?? 0),
  };
}

function mapMitMetric(response: TodayResponse): MetricCardStatus {
  return metricForWidget(
    response.mit,
    response,
    "mit",
    () => ({
      type: "ready",
      value: response.mit.data?.completed ? "Complete" : "Selected",
    }),
    "No focus chosen yet.",
  );
}

function mapTasksMetric(response: TodayResponse): MetricCardStatus {
  const tasks = response.tasks.data?.tasks ?? [];
  return metricForWidget(
    response.tasks,
    response,
    "tasks",
    () =>
      tasks.length === 0
        ? { type: "empty", message: "No tasks planned for today." }
        : {
            type: "ready",
            value: `${tasks.filter((task) => task.completed).length} of ${tasks.length}`,
          },
    "No tasks planned for today.",
  );
}

function mapScheduleMetric(response: TodayResponse, locale: string): MetricCardStatus {
  const blocks = response.schedule.data?.blocks ?? [];
  return metricForWidget(
    response.schedule,
    response,
    "scheduled-time",
    () => {
      const minutes = blocks.reduce((sum, block) => sum + timeBlockMinutes(block), 0);
      return minutes > 0
        ? { type: "ready", value: formatDurationMinutes(minutes, locale) }
        : { type: "empty", message: "No Time Blocks scheduled today." };
    },
    "No Time Blocks scheduled today.",
  );
}

function mapFocusMetric(response: TodayResponse, locale: string): MetricCardStatus {
  return metricForWidget(
    response.focusSummary,
    response,
    "focus-time",
    () => {
      const actual = Math.max(0, response.focusSummary.data?.actualFocusMinutesToday ?? 0);
      const planned = Math.max(
        0,
        response.focusSummary.data?.comparisonMinutes ??
          response.focusSummary.data?.plannedFocusMinutesToday ??
          0,
      );
      const denominatorLabel =
        response.focusSummary.data?.comparisonSource === "DAILY_TARGET"
          ? "daily target"
          : "planned focus";
      if (actual === 0 && planned === 0) {
        return { type: "empty", message: "No focus time recorded today." };
      }
      return {
        type: "ready",
        value:
          planned > 0
            ? `${formatDurationMinutes(actual, locale)} of ${formatDurationMinutes(planned, locale)} ${denominatorLabel}`
            : formatDurationMinutes(actual, locale),
      };
    },
    "No focus time recorded today.",
  );
}

function mapProjectsMetric(response: TodayResponse): MetricCardStatus {
  const count = response.activeProjects.data?.projects.length ?? 0;
  return metricForWidget(
    response.activeProjects,
    response,
    "active-projects",
    () =>
      count > 0
        ? { type: "ready", value: String(count) }
        : { type: "empty", message: "No active projects yet." },
    "No active projects yet.",
  );
}

function mapWeekMetric(response: TodayResponse): MetricCardStatus {
  const completed = response.week.data?.completedTasksCount ?? 0;
  const total = response.week.data?.totalTasksCount ?? 0;
  return metricForWidget(
    response.week,
    response,
    "week-progress",
    () =>
      total > 0
        ? { type: "ready", value: `${completed} of ${total}` }
        : { type: "empty", message: "No Weekly Plan yet." },
    "No Weekly Plan yet.",
  );
}

function metricForWidget<T>(
  widget: TodayWidget<T>,
  response: TodayResponse,
  key: string,
  fallback: () => MetricCardStatus,
  emptyMessage: string,
): MetricCardStatus {
  if (widget.status === "ERROR") return { type: "error", message: "Unavailable" };
  if (widget.status === "EMPTY") return { type: "empty", message: emptyMessage };
  const explicit = explicitMetric(response, key);
  return explicit ? { type: "ready", value: metricValue(explicit) } : fallback();
}

function explicitMetric(response: TodayResponse, key: string): TodayMetricDto | undefined {
  if (response.metrics.status !== "SUCCESS") return undefined;
  const normalizedKey = key.replaceAll("_", "-").toLowerCase();
  return response.metrics.data?.metrics.find(
    (metric) => metric.key.replaceAll("_", "-").toLowerCase() === normalizedKey,
  );
}

function metricValue(metric: TodayMetricDto): string {
  if (!metric.unit) return metric.value;
  return /^[%°]/.test(metric.unit)
    ? `${metric.value}${metric.unit}`
    : `${metric.value} ${metric.unit}`;
}

function taskStatus(task: TodayTaskDto): TodayPlanTask["status"] {
  if (task.completed || task.status === "DONE") return "DONE";
  if (task.status === "IN_PROGRESS" || task.status === "BLOCKED") return task.status;
  return "TO_DO";
}

function priority(value: string): ProductPriority {
  return value === "P1" || value === "P2" || value === "P3" || value === "P4" ? value : "P2";
}

function reviewState(value: string): "NOT_STARTED" | "DRAFT" | "FINALIZED" | "SKIPPED" {
  if (value === "DRAFT" || value === "IN_PROGRESS") return "DRAFT";
  if (value === "FINALIZED" || value === "COMPLETED") return "FINALIZED";
  if (value === "SKIPPED") return "SKIPPED";
  return "NOT_STARTED";
}

function dueLabel(
  dueDate: LocalDate,
  localDate: LocalDate,
  locale: string,
  overdue: boolean,
): string {
  const formatted = formatLocalDate(dueDate, locale);
  if (dueDate === localDate) return `Due today, ${formatted}`;
  if (overdue || compareLocalDates(dueDate, localDate) < 0) return `Overdue, ${formatted}`;
  return `Due ${formatted}`;
}

function compareNextTasks(first: TodayTaskDto, second: TodayTaskDto): number {
  const priorityDifference = priorityRank(first.priority) - priorityRank(second.priority);
  if (priorityDifference !== 0) return priorityDifference;
  if (first.dueDate && second.dueDate) return compareLocalDates(first.dueDate, second.dueDate);
  if (first.dueDate) return -1;
  if (second.dueDate) return 1;
  return 0;
}

function nextTaskExplanation(task: TodayTaskDto, localDate: LocalDate, locale: string): string {
  const priorityFact = `${priority(task.priority)} priority`;
  return task.dueDate
    ? `${priorityFact}; ${dueLabel(task.dueDate, localDate, locale, task.isOverdue).toLowerCase()}.`
    : `${priorityFact}; no due date is recorded.`;
}

function priorityRank(value: string): number {
  const ranks: Readonly<Record<ProductPriority, number>> = { P1: 1, P2: 2, P3: 3, P4: 4 };
  return ranks[priority(value)];
}

function timeBlockMinutes(block: TodayTimeBlockDto): number {
  const start = localTimeToMinutes(block.startTime);
  const end = localTimeToMinutes(block.endTime);
  return end >= start ? end - start : 24 * 60 - start + end;
}

function taskHref(taskId: string): string {
  return `/life-os/app/tasks/${encodeURIComponent(taskId)}`;
}

function projectHref(projectId: string): string {
  return `/life-os/app/projects/${encodeURIComponent(projectId)}`;
}
