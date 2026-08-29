import { useState } from "react";
import {
  GoalCard,
  GoalRow,
  ProgressEditor,
  CheckInFormDialog,
  CheckInHistory,
  GoalLinkedWorkList,
  GoalMetricSummary,
  GoalsScreen,
  GoalDetailsScreen,
  type Goal,
  type GoalCheckIn,
  type GoalLink,
  type GoalSummaryCounts,
} from "@features/goals";
import { Button } from "@components/ui";

const MOCK_GOAL_PERCENTAGE: Goal = {
  id: "goal-demo-1",
  userId: "user-demo",
  title: "Launch LifeOS Product Suite",
  description: "Complete design tokens, composed UI, and backend domain APIs for v1 release.",
  category: "LEARNING",
  progressType: "PERCENTAGE",
  targetValue: 100,
  currentValue: 75,
  status: "IN_PROGRESS",
  checkInCadence: "WEEKLY",
  archived: false,
  progressPercentage: 75,
  targetDate: "2026-09-30",
};

const MOCK_GOAL_NUMERIC: Goal = {
  id: "goal-demo-2",
  userId: "user-demo",
  title: "Save Emergency Fund",
  category: "FINANCIAL",
  progressType: "NUMERIC",
  targetValue: 10000,
  currentValue: 6500,
  unit: "USD",
  status: "IN_PROGRESS",
  checkInCadence: "MONTHLY",
  archived: false,
  progressPercentage: 65,
  targetDate: "2026-12-31",
};

const MOCK_CHECKINS: GoalCheckIn[] = [
  {
    id: "ci-101",
    goalId: "goal-demo-1",
    userId: "user-demo",
    value: 75,
    note: "Completed sprint 14 features & goal component suite",
    recordedAt: "2026-08-25T10:00:00Z",
  },
  {
    id: "ci-100",
    goalId: "goal-demo-1",
    userId: "user-demo",
    value: 60,
    note: "Finished task scheduling focus panel integration",
    recordedAt: "2026-08-18T10:00:00Z",
  },
];

const MOCK_LINKS: GoalLink[] = [
  {
    id: "gl-1",
    goalId: "goal-demo-1",
    userId: "user-demo",
    targetType: "PROJECT",
    targetId: "proj-1",
    targetTitle: "LifeOS Platform Foundation",
    targetStatus: "IN_PROGRESS",
  },
  {
    id: "gl-2",
    goalId: "goal-demo-1",
    userId: "user-demo",
    targetType: "TASK",
    targetId: "task-1103",
    targetTitle: "LOS-1103 Build goal components",
    targetStatus: "IN_PROGRESS",
  },
];

const MOCK_SUMMARY: GoalSummaryCounts = {
  totalGoals: 8,
  activeGoals: 5,
  completedGoals: 2,
  pausedGoals: 1,
  archivedGoals: 0,
  averageProgressPercentage: 68,
};

export function GoalCardDemo() {
  return (
    <div style={{ maxWidth: 640 }}>
      <GoalCard goal={MOCK_GOAL_PERCENTAGE} linkedWorkCount={2} />
    </div>
  );
}

export function GoalRowDemo() {
  return (
    <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 12 }}>
      <GoalRow goal={MOCK_GOAL_PERCENTAGE} />
      <GoalRow goal={MOCK_GOAL_NUMERIC} />
    </div>
  );
}

export function ProgressEditorDemo() {
  return (
    <div style={{ maxWidth: 540 }}>
      <ProgressEditor goal={MOCK_GOAL_NUMERIC} onSaveProgress={() => {}} />
    </div>
  );
}

export function CheckInFormDialogDemo() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Button onClick={() => setOpen(true)}>Open Check-in Dialog</Button>
      <CheckInFormDialog
        open={open}
        goal={MOCK_GOAL_PERCENTAGE}
        onClose={() => setOpen(false)}
        onSubmit={() => {
          setOpen(false);
        }}
      />
    </div>
  );
}

export function CheckInHistoryDemo() {
  return (
    <div style={{ maxWidth: 640 }}>
      <CheckInHistory checkIns={MOCK_CHECKINS} unit="%" />
    </div>
  );
}

export function GoalLinkedWorkListDemo() {
  const [links, setLinks] = useState(MOCK_LINKS);

  return (
    <div style={{ maxWidth: 640 }}>
      <GoalLinkedWorkList
        links={links}
        onAddLink={() => {
          setLinks((prev) => [
            ...prev,
            {
              id: `gl-${Date.now()}`,
              goalId: MOCK_GOAL_PERCENTAGE.id,
              userId: "user-demo",
              targetType: "PROJECT",
              targetId: "proj-2",
              targetTitle: `Linked Project: proj-2`,
            },
          ]);
        }}
        onRemoveLink={(linkId) => {
          setLinks((prev) => prev.filter((l) => l.id !== linkId));
        }}
      />
    </div>
  );
}

export function GoalMetricSummaryDemo() {
  return (
    <div style={{ maxWidth: 840 }}>
      <GoalMetricSummary counts={MOCK_SUMMARY} />
    </div>
  );
}

export function GoalsScreenDemo() {
  return (
    <GoalsScreen goals={[MOCK_GOAL_PERCENTAGE, MOCK_GOAL_NUMERIC]} summaryCounts={MOCK_SUMMARY} />
  );
}

export function GoalDetailsScreenDemo() {
  return (
    <GoalDetailsScreen goal={MOCK_GOAL_PERCENTAGE} checkIns={MOCK_CHECKINS} links={MOCK_LINKS} />
  );
}
