import { useState } from "react";

import { Button } from "@components/ui";
import {
  HabitArchiveDialog,
  HabitCard,
  HabitEntryControl,
  HabitFormDialog,
  HabitHeatmap,
  HabitPauseDialog,
  HabitRow,
  HabitStreakSummary,
  type Habit,
  type HabitFormValues,
  type HabitHeatmapDay,
} from "@features/habits";
import { addLocalDays } from "@lib/localDateTime";

const HABIT: Habit = {
  id: "habit-demo-1",
  userId: "user-demo",
  name: "Read",
  description: "Read deliberately for a while.",
  cadence: "DAILY",
  targetCount: 2,
  timeZone: "Asia/Kolkata",
  color: "green",
  reminderEnabled: true,
  reminderTime: "20:00",
  archived: false,
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-30T00:00:00Z",
  version: 3,
};

const STATISTICS = {
  currentStreak: 5,
  longestStreak: 12,
  eligiblePeriods: 28,
  metTargetPeriods: 21,
  completionRate: 0.75,
};

const HEATMAP_DAYS: readonly HabitHeatmapDay[] = Array.from({ length: 42 }, (_, index) => ({
  localDate: addLocalDays("2026-07-20", index),
  completedCount: index % 7 === 0 ? 0 : index % 3,
  targetCount: 2,
  ...(index === 18 || index === 19 ? { paused: true } : {}),
}));

export function HabitCardDemo() {
  const [count, setCount] = useState(1);
  return (
    <div style={{ maxWidth: 640 }}>
      <HabitCard
        habit={HABIT}
        localDate="2026-08-30"
        completedCount={count}
        statistics={STATISTICS}
        onIncrement={() => setCount((value) => value + 1)}
        onDecrement={() => setCount((value) => Math.max(0, value - 1))}
        onEdit={() => {}}
        onPause={() => {}}
        onArchive={() => {}}
      />
    </div>
  );
}

export function HabitRowDemo() {
  return (
    <div style={{ maxWidth: 880 }}>
      <HabitRow
        habit={HABIT}
        localDate="2026-08-30"
        completedCount={1}
        onLog={() => {}}
        onEdit={() => {}}
        onPause={() => {}}
        onArchive={() => {}}
      />
    </div>
  );
}

export function HabitEntryControlDemo() {
  const [count, setCount] = useState(0);
  return (
    <div style={{ maxWidth: 420 }}>
      <HabitEntryControl
        habit={HABIT}
        localDate="2026-08-30"
        completedCount={count}
        onIncrement={() => setCount((value) => value + 1)}
        onDecrement={() => setCount((value) => Math.max(0, value - 1))}
      />
    </div>
  );
}

export function HabitStreakSummaryDemo() {
  return (
    <HabitStreakSummary status={{ type: "ready", statistics: STATISTICS }} cadenceLabel="days" />
  );
}

export function HabitHeatmapDemo() {
  return <HabitHeatmap status="ready" days={HEATMAP_DAYS} />;
}

export function HabitFormDialogDemo() {
  const [open, setOpen] = useState(false);
  const [lastValues, setLastValues] = useState<HabitFormValues>();
  return (
    <div className="specimen-stack">
      <Button onClick={() => setOpen(true)}>Add Habit</Button>
      {lastValues ? <p>Last submitted Habit: {lastValues.name}</p> : null}
      <HabitFormDialog
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={(values) => {
          setLastValues(values);
          setOpen(false);
        }}
      />
    </div>
  );
}

export function HabitLifecycleDialogsDemo() {
  const [dialog, setDialog] = useState<"pause" | "archive" | null>(null);
  return (
    <div className="specimen-stack">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <Button variant="secondary" onClick={() => setDialog("pause")}>
          Pause Habit
        </Button>
        <Button variant="secondary" onClick={() => setDialog("archive")}>
          Archive Habit
        </Button>
      </div>
      <HabitPauseDialog
        open={dialog === "pause"}
        habit={HABIT}
        defaultStartDate="2026-08-30"
        onClose={() => setDialog(null)}
        onSubmit={() => setDialog(null)}
      />
      <HabitArchiveDialog
        open={dialog === "archive"}
        habit={HABIT}
        onClose={() => setDialog(null)}
        onArchive={() => setDialog(null)}
      />
    </div>
  );
}

export function HabitStatesDemo() {
  return (
    <div className="specimen-stack">
      <HabitCard habit={HABIT} paused localDate="2026-08-30" completedCount={0} />
      <HabitCard habit={{ ...HABIT, id: "habit-demo-archived", archived: true }} />
      <HabitCard loading />
      <HabitCard error="This Habit couldn't load. Other Habits are still available." />
    </div>
  );
}
