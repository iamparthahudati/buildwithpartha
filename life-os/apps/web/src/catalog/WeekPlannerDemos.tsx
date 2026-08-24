import { useState } from "react";
import {
  WeekCapacitySummary,
  WeekDayCapacityDialog,
  WeekStrip,
  type WeekCapacitySummaryData,
  type WeekDayPlan,
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
