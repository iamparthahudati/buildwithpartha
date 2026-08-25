import { useState } from "react";
import { Button } from "@components/ui";
import {
  TaskAllocationDialog,
  UnscheduledTaskQueue,
  WeekCapacitySummary,
  WeekDayCapacityDialog,
  WeekStrip,
  WeeklyOutcomes,
  type WeekCapacitySummaryData,
  type WeekDayPlan,
  type WeekPlannerTask,
  type WeeklyOutcome,
} from "@features/week-planner";

const MOCK_DAYS: readonly WeekDayPlan[] = [
  {
    localDate: "2026-08-17",
    dayOfWeek: "Mon",
    plannedMinutes: 480,
    availableMinutes: 480,
    totalTasksCount: 4,
    completedTasksCount: 4,
    timeBlocksCount: 3,
    categoryBreakdown: [
      { category: "Deep Work", minutes: 300 },
      { category: "Meetings", minutes: 120 },
      { category: "Admin", minutes: 60 },
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
    categoryBreakdown: [
      { category: "Deep Work", minutes: 420 },
      { category: "Meetings", minutes: 180 },
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
      { category: "Deep Work", minutes: 240 },
      { category: "Admin", minutes: 120 },
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
    hasConflict: true,
    categoryBreakdown: [
      { category: "Deep Work", minutes: 300 },
      { category: "Meetings", minutes: 120 },
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
    categoryBreakdown: [{ category: "Admin", minutes: 240 }],
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
];

const MOCK_SUMMARY: WeekCapacitySummaryData = {
  totalPlannedMinutes: 2100,
  totalAvailableMinutes: 2400,
  totalTasksCount: 19,
  completedTasksCount: 7,
  daysCount: 7,
  hasConflicts: true,
  categoryBreakdown: [
    { category: "Deep Work", minutes: 1260 },
    { category: "Meetings", minutes: 420 },
    { category: "Admin", minutes: 420 },
  ],
};

const MOCK_SUMMARY_OVERCAPACITY: WeekCapacitySummaryData = {
  totalPlannedMinutes: 2880,
  totalAvailableMinutes: 2400,
  overcapacityMinutes: 480,
  totalTasksCount: 24,
  completedTasksCount: 7,
  daysCount: 7,
  hasConflicts: true,
  categoryBreakdown: [
    { category: "Deep Work", minutes: 1800 },
    { category: "Meetings", minutes: 600 },
    { category: "Admin", minutes: 480 },
  ],
};

const MOCK_DAY_OPTIONS = MOCK_DAYS.map((day) => ({
  localDate: day.localDate,
  label: `${day.dayOfWeek}, ${day.localDate}`,
}));

const INITIAL_OUTCOMES: readonly WeeklyOutcome[] = [
  {
    id: "outcome-accessibility",
    title: "Complete the accessibility review",
    selected: true,
    itemCount: 2,
  },
  {
    id: "outcome-learning",
    title: "Finish the learning plan",
    selected: true,
    itemCount: 1,
  },
  {
    id: "outcome-records",
    title: "Organize home records",
    selected: false,
  },
];

const INITIAL_TASKS: readonly WeekPlannerTask[] = [
  {
    id: "task-review",
    title: "Prepare weekly review",
    status: "TO_DO",
    priority: "P1",
    projectName: "Learning plan",
    estimateMinutes: 60,
  },
  {
    id: "task-hosting",
    title: "Compare hosting options",
    status: "IN_PROGRESS",
    priority: "P2",
    projectName: "Portfolio refresh",
    estimateMinutes: 90,
  },
  {
    id: "task-records",
    title: "Organize tax documents",
    status: "BLOCKED",
    priority: "P2",
    projectName: "Home records cleanup",
    estimateMinutes: 45,
    isCarryOverCandidate: true,
  },
];

export function WeekStripReadyDemo() {
  const [selectedDate, setSelectedDate] = useState("2026-08-20");
  const [dialogDay, setDialogDay] = useState<WeekDayPlan | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <WeekStrip
        days={MOCK_DAYS}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        onAdjustCapacity={(day) => setDialogDay(day)}
      />
      <WeekDayCapacityDialog
        open={Boolean(dialogDay)}
        day={dialogDay}
        onClose={() => setDialogDay(null)}
        onSubmit={(date, mins) => {
          alert(`Updated capacity for ${date} to ${mins} minutes`);
          setDialogDay(null);
        }}
      />
    </div>
  );
}

export function WeekStripLoadingDemo() {
  return <WeekStrip days={[]} loading />;
}

export function WeekCapacitySummaryReadyDemo() {
  return <WeekCapacitySummary summary={MOCK_SUMMARY} />;
}

export function WeekCapacitySummaryOvercapacityDemo() {
  return <WeekCapacitySummary summary={MOCK_SUMMARY_OVERCAPACITY} />;
}

export function WeekCapacitySummaryLoadingDemo() {
  return <WeekCapacitySummary loading />;
}

export function WeeklyOutcomesDemo() {
  const [outcomes, setOutcomes] = useState<readonly WeeklyOutcome[]>(INITIAL_OUTCOMES);

  return (
    <WeeklyOutcomes
      outcomes={outcomes}
      onToggleOutcome={(outcomeId, selected) =>
        setOutcomes((current) =>
          current.map((outcome) => (outcome.id === outcomeId ? { ...outcome, selected } : outcome)),
        )
      }
      onAddOutcome={(title) =>
        setOutcomes((current) => [
          ...current,
          { id: `outcome-${current.length + 1}`, title, selected: true, itemCount: 0 },
        ])
      }
      onMoveOutcome={(outcomeId, direction) =>
        setOutcomes((current) => {
          const index = current.findIndex((outcome) => outcome.id === outcomeId);
          const destination = direction === "up" ? index - 1 : index + 1;
          if (index < 0 || destination < 0 || destination >= current.length) return current;
          const next = [...current];
          [next[index], next[destination]] = [next[destination]!, next[index]!];
          return next;
        })
      }
    />
  );
}

export function UnscheduledTaskQueueDemo() {
  const [tasks, setTasks] = useState<readonly WeekPlannerTask[]>(INITIAL_TASKS);

  function markSaved(taskId: string) {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, mutation: { type: "saved" as const } } : task,
      ),
    );
  }

  return (
    <UnscheduledTaskQueue
      tasks={tasks}
      days={MOCK_DAY_OPTIONS}
      outcomes={INITIAL_OUTCOMES}
      onAllocateTask={markSaved}
      onCarryTask={markSaved}
    />
  );
}

export function UnscheduledTaskQueuePartialErrorDemo() {
  const [tasks, setTasks] = useState<readonly WeekPlannerTask[]>([
    INITIAL_TASKS[0]!,
    {
      ...INITIAL_TASKS[2]!,
      mutation: {
        type: "failed",
        message: "We couldn't carry this Task. Your selection is still here.",
      },
    },
  ]);

  return (
    <UnscheduledTaskQueue
      tasks={tasks}
      days={MOCK_DAY_OPTIONS}
      onRetryTask={(taskId) =>
        setTasks((current) =>
          current.map((task) =>
            task.id === taskId ? { ...task, mutation: { type: "saving" as const } } : task,
          ),
        )
      }
    />
  );
}

export function TaskAllocationMoveDemo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Move task
      </Button>
      <TaskAllocationDialog
        open={open}
        task={INITIAL_TASKS[0]!}
        mode="move"
        days={MOCK_DAY_OPTIONS}
        outcomes={INITIAL_OUTCOMES}
        initialValue={{ localDate: "2026-08-20", plannedMinutes: 60 }}
        onClose={() => setOpen(false)}
        onSubmit={() => setOpen(false)}
      />
    </>
  );
}
