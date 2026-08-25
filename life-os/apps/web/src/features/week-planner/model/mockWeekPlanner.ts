import type {
  WeekCapacitySummaryData,
  WeekDayPlan,
  WeeklyOutcome,
  WeekPlannerConflict,
  WeekPlannerDayOption,
  WeekPlannerTask,
  WeekPlannerTaskAllocation,
} from "./weekPlanner";

export const MOCK_WEEK_DAYS: readonly WeekDayPlan[] = Object.freeze([
  {
    localDate: "2026-08-17",
    dayOfWeek: "Mon",
    plannedMinutes: 480,
    availableMinutes: 480,
    totalTasksCount: 4,
    completedTasksCount: 3,
    timeBlocksCount: 3,
    categoryBreakdown: [
      { category: "Deep Work", minutes: 300, color: "var(--lifeos-color-category-focus)" },
      { category: "Meetings", minutes: 120, color: "var(--lifeos-color-category-meeting)" },
      { category: "Admin", minutes: 60, color: "var(--lifeos-color-category-admin)" },
    ],
  },
  {
    localDate: "2026-08-18",
    dayOfWeek: "Tue",
    plannedMinutes: 600,
    availableMinutes: 480,
    totalTasksCount: 6,
    completedTasksCount: 2,
    timeBlocksCount: 4,
    isOvercapacity: true,
    hasConflict: true,
    categoryBreakdown: [
      { category: "Deep Work", minutes: 420, color: "var(--lifeos-color-category-focus)" },
      { category: "Meetings", minutes: 180, color: "var(--lifeos-color-category-meeting)" },
    ],
  },
  {
    localDate: "2026-08-19",
    dayOfWeek: "Wed",
    plannedMinutes: 360,
    availableMinutes: 480,
    totalTasksCount: 3,
    completedTasksCount: 1,
    timeBlocksCount: 2,
    categoryBreakdown: [
      { category: "Deep Work", minutes: 240, color: "var(--lifeos-color-category-focus)" },
      { category: "Admin", minutes: 120, color: "var(--lifeos-color-category-admin)" },
    ],
  },
  {
    localDate: "2026-08-20",
    dayOfWeek: "Thu",
    plannedMinutes: 420,
    availableMinutes: 480,
    totalTasksCount: 4,
    completedTasksCount: 0,
    timeBlocksCount: 3,
    isToday: true,
    isSelected: true,
    categoryBreakdown: [
      { category: "Deep Work", minutes: 300, color: "var(--lifeos-color-category-focus)" },
      { category: "Meetings", minutes: 120, color: "var(--lifeos-color-category-meeting)" },
    ],
  },
  {
    localDate: "2026-08-21",
    dayOfWeek: "Fri",
    plannedMinutes: 240,
    availableMinutes: 480,
    totalTasksCount: 2,
    completedTasksCount: 0,
    timeBlocksCount: 1,
    categoryBreakdown: [
      { category: "Admin", minutes: 240, color: "var(--lifeos-color-category-admin)" },
    ],
  },
  {
    localDate: "2026-08-22",
    dayOfWeek: "Sat",
    plannedMinutes: 0,
    availableMinutes: 0,
    totalTasksCount: 0,
    completedTasksCount: 0,
    timeBlocksCount: 0,
  },
  {
    localDate: "2026-08-23",
    dayOfWeek: "Sun",
    plannedMinutes: 0,
    availableMinutes: 0,
    totalTasksCount: 0,
    completedTasksCount: 0,
    timeBlocksCount: 0,
  },
]);

export const MOCK_WEEK_CAPACITY_SUMMARY: WeekCapacitySummaryData = Object.freeze({
  totalPlannedMinutes: 2100,
  totalAvailableMinutes: 2400,
  overcapacityMinutes: 120,
  totalTasksCount: 19,
  completedTasksCount: 6,
  daysCount: 7,
  hasConflicts: true,
  categoryBreakdown: [
    { category: "Deep Work", minutes: 1260, color: "var(--lifeos-color-category-focus)" },
    { category: "Meetings", minutes: 420, color: "var(--lifeos-color-category-meeting)" },
    { category: "Admin", minutes: 420, color: "var(--lifeos-color-category-admin)" },
  ],
});

export const MOCK_WEEKLY_OUTCOMES: readonly WeeklyOutcome[] = Object.freeze([
  {
    id: "outcome-1",
    title: "Launch v2.0 dashboard & core analytics reporting",
    selected: true,
    itemCount: 4,
  },
  {
    id: "outcome-2",
    title: "Refactor session authentication & cookie security",
    selected: true,
    itemCount: 3,
  },
  {
    id: "outcome-3",
    title: "Finalize Q3 product roadmap & team capacity allocation",
    selected: false,
    itemCount: 2,
  },
]);

export const MOCK_UNSCHEDULED_TASKS: readonly WeekPlannerTask[] = Object.freeze([
  {
    id: "task-unscheduled-1",
    title: "Audit Web Vitals and optimize bundle size for mobile layout",
    status: "TO_DO",
    priority: "P1",
    projectName: "Web Performance",
    estimateMinutes: 90,
    dueDate: "2026-08-21",
    isCarryOverCandidate: true,
  },
  {
    id: "task-unscheduled-2",
    title: "Write integration tests for PostgreSQL migration V20",
    status: "TO_DO",
    priority: "P2",
    projectName: "API Foundation",
    estimateMinutes: 120,
    dueDate: "2026-08-22",
  },
  {
    id: "task-unscheduled-3",
    title: "Update design tokens for high-contrast accessibility mode",
    status: "IN_PROGRESS",
    priority: "P2",
    projectName: "Design System",
    estimateMinutes: 60,
  },
  {
    id: "task-unscheduled-4",
    title: "Draft weekly review summary template for executive sync",
    status: "TO_DO",
    priority: "P3",
    projectName: "Product Operations",
    estimateMinutes: 45,
    isCarryOverCandidate: true,
  },
  {
    id: "task-unscheduled-5",
    title: "Review security scanner findings for third-party dependencies",
    status: "BLOCKED",
    priority: "P1",
    projectName: "Security",
    estimateMinutes: 60,
  },
]);

export const MOCK_ALLOCATED_TASKS: readonly WeekPlannerTaskAllocation[] = Object.freeze([
  {
    taskId: "task-alloc-1",
    taskTitle: "Design Week Planner outcomes & unscheduled queue interface",
    localDate: "2026-08-17",
    outcomeId: "outcome-1",
    outcomeTitle: "Launch v2.0 dashboard & core analytics reporting",
    plannedMinutes: 120,
    status: "DONE",
    priority: "P1",
    projectName: "Web Application",
  },
  {
    taskId: "task-alloc-2",
    taskTitle: "Implement Flyway V20 migration for weekly plan persistence",
    localDate: "2026-08-18",
    outcomeId: "outcome-2",
    outcomeTitle: "Refactor session authentication & cookie security",
    plannedMinutes: 180,
    status: "DONE",
    priority: "P1",
    projectName: "API Foundation",
  },
  {
    taskId: "task-alloc-3",
    taskTitle: "Build WeekStrip and capacity summary visual components",
    localDate: "2026-08-18",
    outcomeId: "outcome-1",
    outcomeTitle: "Launch v2.0 dashboard & core analytics reporting",
    plannedMinutes: 240,
    status: "DONE",
    priority: "P2",
    projectName: "Web Application",
  },
  {
    taskId: "task-alloc-4",
    taskTitle: "Compose Week Planner screen with responsive matrix layout",
    localDate: "2026-08-20",
    outcomeId: "outcome-1",
    outcomeTitle: "Launch v2.0 dashboard & core analytics reporting",
    plannedMinutes: 180,
    status: "IN_PROGRESS",
    priority: "P1",
    projectName: "Web Application",
  },
  {
    taskId: "task-alloc-5",
    taskTitle: "Configure CSRF cookie protection & token authorization headers",
    localDate: "2026-08-20",
    outcomeId: "outcome-2",
    outcomeTitle: "Refactor session authentication & cookie security",
    plannedMinutes: 120,
    status: "TO_DO",
    priority: "P2",
    projectName: "API Foundation",
  },
  {
    taskId: "task-alloc-6",
    taskTitle: "Conduct accessibility audit and keyboard focus order check",
    localDate: "2026-08-21",
    outcomeId: "outcome-1",
    outcomeTitle: "Launch v2.0 dashboard & core analytics reporting",
    plannedMinutes: 90,
    status: "TO_DO",
    priority: "P2",
    projectName: "Web Application",
  },
]);

export const MOCK_DAY_OPTIONS: readonly WeekPlannerDayOption[] = Object.freeze([
  { localDate: "2026-08-17", label: "Mon, Aug 17" },
  { localDate: "2026-08-18", label: "Tue, Aug 18 (Overcapacity)" },
  { localDate: "2026-08-19", label: "Wed, Aug 19" },
  { localDate: "2026-08-20", label: "Thu, Aug 20 (Today)" },
  { localDate: "2026-08-21", label: "Fri, Aug 21" },
  { localDate: "2026-08-22", label: "Sat, Aug 22" },
  { localDate: "2026-08-23", label: "Sun, Aug 23" },
]);

export const MOCK_WEEK_CONFLICTS: readonly WeekPlannerConflict[] = Object.freeze([
  {
    id: "conflict-1",
    type: "OVERCAPACITY",
    message: "Tuesday, Aug 18 is overcapacity by 2 hours (600m planned / 480m available).",
    severity: "warning",
    date: "2026-08-18",
  },
  {
    id: "conflict-2",
    type: "UNALLOCATED_OUTCOME",
    message: "Outcome 'Finalize Q3 product roadmap' has no allocated tasks scheduled this week.",
    severity: "warning",
  },
]);

export const MOCK_OVERCAPACITY_DAYS: readonly WeekDayPlan[] = Object.freeze(
  MOCK_WEEK_DAYS.map((day) =>
    day.localDate === "2026-08-18"
      ? { ...day, isOvercapacity: true, plannedMinutes: 720, availableMinutes: 480 }
      : day,
  ),
);

export const MOCK_OVERCAPACITY_SUMMARY: WeekCapacitySummaryData = Object.freeze({
  ...MOCK_WEEK_CAPACITY_SUMMARY,
  totalPlannedMinutes: 2760,
  totalAvailableMinutes: 2400,
  overcapacityMinutes: 360,
  hasConflicts: true,
});
