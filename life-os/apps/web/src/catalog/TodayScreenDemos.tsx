import { useState } from "react";

import {
  TodayScreen,
  type TodayBrainCaptureRequest,
  type TodayBrainCaptureStatus,
  type TodayPlanTask,
  type TodayScheduleBlockModel,
  type TodayScreenProps,
} from "@features/today";

type TodayScreenDemoState = "first-use" | "normal" | "overloaded" | "partial" | "offline";

const NOOP = () => {};
const NOW = new Date("2026-08-20T04:30:00.000Z");

const PLAN_TASKS: readonly TodayPlanTask[] = [
  {
    id: "launch-outline",
    title: "Draft the launch outline",
    href: "#task-launch-outline",
    priority: "P1",
    status: "IN_PROGRESS",
    project: { name: "Website launch", href: "#project-website-launch" },
    dueLabel: "Due today, 20 Aug 2026",
    isMit: true,
  },
  {
    id: "review-copy",
    title: "Review the landing page copy",
    href: "#task-review-copy",
    priority: "P2",
    status: "TO_DO",
    project: { name: "Website launch", href: "#project-website-launch" },
  },
  {
    id: "organize-notes",
    title: "Organize research notes",
    href: "#task-organize-notes",
    priority: "P3",
    status: "BLOCKED",
    disabledActions: ["start-focus"],
  },
];

const SCHEDULE: readonly TodayScheduleBlockModel[] = [
  {
    id: "plan-day",
    title: "Plan the day",
    href: "#time-block-plan-day",
    startTime: "08:30",
    endTime: "09:00",
    state: "completed",
    category: "Planning",
  },
  {
    id: "launch-outline",
    title: "Draft the launch outline",
    href: "#time-block-launch-outline",
    startTime: "10:00",
    endTime: "11:30",
    state: "current",
    category: "Deep work",
    project: {
      id: "website-launch",
      name: "Website launch",
      href: "#project-website-launch",
    },
  },
  {
    id: "review-copy",
    title: "Review the landing page copy",
    href: "#time-block-review-copy",
    startTime: "14:00",
    endTime: "14:45",
    state: "next",
  },
];

const REVIEW_DATA = {
  morning: { state: "FINALIZED" as const, href: "#morning-review" },
  evening: { state: "DRAFT" as const, href: "#evening-review" },
  suggestedPeriod: "evening" as const,
};

function firstUseProps(
  captureValue: string,
  captureStatus: TodayBrainCaptureStatus,
  onCaptureValueChange: (value: string) => void,
  onCapture: (request: TodayBrainCaptureRequest) => void,
): TodayScreenProps {
  return {
    displayName: "Avery",
    timeZone: "Asia/Kolkata",
    locale: "en-IN",
    now: NOW,
    subtitle: "See what needs attention and choose what to do next.",
    onQuickAddClick: NOOP,
    mitStatus: { type: "empty", message: "No focus chosen yet." },
    tasksStatus: { type: "empty", message: "No tasks planned for today." },
    scheduledTimeStatus: { type: "empty", message: "No Time Blocks scheduled today." },
    focusTimeStatus: { type: "empty", message: "No focus time recorded today." },
    activeProjectsStatus: { type: "empty", message: "No active projects yet." },
    weekProgressStatus: { type: "empty", message: "No Weekly Plan yet." },
    plan: {
      mitState: { type: "empty" },
      tasksState: { type: "empty" },
      onChooseMit: NOOP,
      onChangeMit: NOOP,
      onSetMit: NOOP,
      onMarkDone: NOOP,
      onStartFocus: NOOP,
      onAddTask: NOOP,
    },
    nextUp: {
      status: { type: "empty", availability: "no-focus-selected" },
      sourceLabel: "Open tasks",
      rankingRule: "Priority, then due date, then planned order",
      tasksHref: "#tasks",
    },
    schedule: {
      state: { type: "empty" },
      onAddTimeBlock: NOOP,
      onStartFocus: NOOP,
      timeBlocksHref: "#time-blocks",
    },
    review: {
      status: {
        type: "ready",
        data: {
          morning: { state: "NOT_STARTED", href: "#morning-review" },
          evening: { state: "NOT_STARTED", href: "#evening-review" },
          suggestedPeriod: "morning",
        },
      },
      reviewsHref: "#reviews",
    },
    sprintWeek: {
      sprintState: { type: "empty" },
      weekState: { type: "empty" },
      sprintsHref: "#sprints",
      weekPlannerHref: "#week-planner",
    },
    activeProjects: {
      status: { type: "empty" },
      sourceLabel: "Active Projects",
      projectsHref: "#projects",
      onAddProject: NOOP,
    },
    habits: {
      status: { type: "ready", habits: [] },
      habitsHref: "#habits",
      onSetCount: NOOP,
    },
    brainCapture: {
      value: captureValue,
      onValueChange: onCaptureValueChange,
      onCapture,
      countStatus: { type: "ready", unprocessedCount: 0 },
      captureStatus,
      isOnline: true,
      brainDumpHref: "#brain-dump",
    },
  };
}

function readyProps(
  captureValue: string,
  captureStatus: TodayBrainCaptureStatus,
  onCaptureValueChange: (value: string) => void,
  onCapture: (request: TodayBrainCaptureRequest) => void,
): TodayScreenProps {
  const props = firstUseProps(captureValue, captureStatus, onCaptureValueChange, onCapture);

  return {
    ...props,
    mitStatus: { type: "ready", value: "Selected" },
    tasksStatus: { type: "ready", value: "1 of 3" },
    scheduledTimeStatus: { type: "ready", value: "2 h 45 min" },
    focusTimeStatus: { type: "ready", value: "45 min" },
    activeProjectsStatus: { type: "ready", value: "2" },
    weekProgressStatus: { type: "ready", value: "5 of 8" },
    plan: {
      ...props.plan,
      mitState: { type: "ready", task: PLAN_TASKS[0]! },
      tasksState: { type: "ready", tasks: PLAN_TASKS },
    },
    nextUp: { ...props.nextUp, status: { type: "hidden" } },
    schedule: { ...props.schedule, state: { type: "ready", blocks: SCHEDULE } },
    review: { ...props.review, status: { type: "ready", data: REVIEW_DATA } },
    sprintWeek: {
      ...props.sprintWeek,
      sprintState: {
        type: "ready",
        sprint: {
          sprintId: "august-focus",
          name: "August focus",
          startDate: "2026-08-17",
          endDate: "2026-08-30",
          completedStoryPoints: 5,
          totalStoryPoints: 8,
        },
      },
      weekState: {
        type: "ready",
        week: {
          startDate: "2026-08-17",
          endDate: "2026-08-23",
          days: [
            { localDate: "2026-08-17", completedTasksCount: 2, totalTasksCount: 2 },
            { localDate: "2026-08-18", completedTasksCount: 1, totalTasksCount: 2 },
            { localDate: "2026-08-19", completedTasksCount: 2, totalTasksCount: 2 },
            {
              localDate: "2026-08-20",
              completedTasksCount: 1,
              totalTasksCount: 3,
              isToday: true,
            },
            { localDate: "2026-08-21", completedTasksCount: 0, totalTasksCount: 2 },
            { localDate: "2026-08-22", completedTasksCount: 0, totalTasksCount: 0 },
            { localDate: "2026-08-23", completedTasksCount: 0, totalTasksCount: 0 },
          ],
          goals: [
            { id: "publish-outline", title: "Publish the launch outline", completed: false },
            { id: "review-copy", title: "Review the landing page copy", completed: true },
          ],
          plannedMinutes: 900,
          capacityMinutes: 1_200,
        },
      },
    },
    activeProjects: {
      ...props.activeProjects,
      status: {
        type: "ready",
        projects: [
          {
            id: "website-launch",
            name: "Website launch",
            href: "#project-website-launch",
            completedTasksCount: 3,
            totalTasksCount: 6,
          },
          {
            id: "learning-plan",
            name: "Learning plan",
            href: "#project-learning-plan",
            completedTasksCount: 2,
            totalTasksCount: 5,
          },
        ],
      },
    },
    brainCapture: {
      ...props.brainCapture,
      countStatus: { type: "ready", unprocessedCount: 3 },
    },
  };
}

function propsForState(
  state: TodayScreenDemoState,
  captureValue: string,
  captureStatus: TodayBrainCaptureStatus,
  onCaptureValueChange: (value: string) => void,
  onCapture: (request: TodayBrainCaptureRequest) => void,
): TodayScreenProps {
  if (state === "first-use") {
    return firstUseProps(captureValue, captureStatus, onCaptureValueChange, onCapture);
  }

  const props = readyProps(captureValue, captureStatus, onCaptureValueChange, onCapture);

  if (state === "overloaded") {
    return {
      ...props,
      planningState: { type: "overloaded", reviewPlanHref: "#week-planner" },
      scheduledTimeStatus: { type: "ready", value: "6 h 30 min" },
      schedule: {
        ...props.schedule,
        state: {
          type: "ready",
          blocks: SCHEDULE.map((block) =>
            block.id === "launch-outline"
              ? {
                  ...block,
                  conflictDescriptions: ["This Time Block overlaps Research by 30 minutes."],
                }
              : block,
          ),
        },
      },
      sprintWeek: {
        ...props.sprintWeek,
        weekState:
          props.sprintWeek.weekState.type === "ready"
            ? {
                type: "ready",
                week: {
                  ...props.sprintWeek.weekState.week,
                  plannedMinutes: 1_500,
                  capacityMinutes: 1_200,
                },
              }
            : props.sprintWeek.weekState,
      },
    };
  }

  if (state === "partial") {
    return {
      ...props,
      scheduledTimeStatus: {
        type: "error",
        message: "Scheduled time is temporarily unavailable.",
      },
      plan: {
        ...props.plan,
        tasksState: { type: "error", message: "Other Today sections are still available." },
        onRetryTasks: NOOP,
      },
      activeProjects: {
        ...props.activeProjects,
        status: { type: "error", message: "Try this section again." },
        onRetry: NOOP,
      },
    };
  }

  if (state === "offline") {
    const offlineTasks = PLAN_TASKS.map((task) => ({
      ...task,
      disabledActions: ["set-mit", "mark-done", "start-focus"] as const,
    }));
    return {
      ...props,
      connectionState: { type: "offline", lastUpdatedLabel: "10:42 AM" },
      plan: {
        ...props.plan,
        mitState: { type: "ready", task: offlineTasks[0]! },
        tasksState: { type: "ready", tasks: offlineTasks },
      },
      schedule: {
        ...props.schedule,
        startDisabledReason: "Reconnect to start a Focus Session.",
      },
      brainCapture: { ...props.brainCapture, isOnline: false },
    };
  }

  return props;
}

function TodayScreenDemo({ state }: { readonly state: TodayScreenDemoState }) {
  const [captureValue, setCaptureValue] = useState("");
  const [captureStatus, setCaptureStatus] = useState<TodayBrainCaptureStatus>({ type: "idle" });

  const props = propsForState(
    state,
    captureValue,
    captureStatus,
    (value) => {
      setCaptureValue(value);
      setCaptureStatus({ type: "idle" });
    },
    ({ mode }) => {
      setCaptureValue("");
      setCaptureStatus(
        mode === "queue"
          ? { type: "queued" }
          : { type: "saved", message: "Brain Dump Item added in this mock state." },
      );
    },
  );

  return <TodayScreen {...props} />;
}

export function TodayScreenFirstUseDemo() {
  return <TodayScreenDemo state="first-use" />;
}

export function TodayScreenNormalDemo() {
  return <TodayScreenDemo state="normal" />;
}

export function TodayScreenOverloadedDemo() {
  return <TodayScreenDemo state="overloaded" />;
}

export function TodayScreenPartialFailureDemo() {
  return <TodayScreenDemo state="partial" />;
}

export function TodayScreenOfflineDemo() {
  return <TodayScreenDemo state="offline" />;
}
