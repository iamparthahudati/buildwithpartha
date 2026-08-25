export type GoalProgressType = "PERCENTAGE" | "NUMERIC" | "MILESTONE" | "BINARY";

export type GoalStatus =
  "NOT_STARTED" | "IN_PROGRESS" | "PAUSED" | "COMPLETED" | "CANCELLED" | "ARCHIVED";

export type CheckInCadence = "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY" | "MANUAL";

export type GoalLinkTargetType = "PROJECT" | "TASK" | "HABIT";

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  category: string;
  progressType: GoalProgressType;
  targetValue?: number;
  currentValue: number;
  unit?: string;
  targetDate?: string;
  status: GoalStatus;
  checkInCadence: CheckInCadence;
  archived: boolean;
  progressPercentage: number;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
}

export interface GoalCheckIn {
  id: string;
  goalId: string;
  userId: string;
  value: number;
  note?: string;
  recordedAt: string;
  createdAt?: string;
}

export interface GoalLink {
  id: string;
  goalId: string;
  userId: string;
  targetType: GoalLinkTargetType;
  targetId: string;
  createdAt?: string;
  targetTitle?: string;
  targetStatus?: string;
}

export interface GoalDetail {
  goal: Goal;
  progressPercentage: number;
  checkIns: GoalCheckIn[];
  links: GoalLink[];
}

export interface GoalSummaryCounts {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  pausedGoals: number;
  archivedGoals: number;
  averageProgressPercentage: number;
}

export function calculateGoalProgressPercentage(
  goal: Pick<Goal, "progressType" | "currentValue" | "targetValue" | "status">,
): number {
  if (goal.status === "COMPLETED") return 100;
  if (goal.status === "NOT_STARTED" && goal.currentValue === 0) return 0;

  switch (goal.progressType) {
    case "PERCENTAGE":
      return Math.min(100, Math.max(0, Math.round(goal.currentValue)));
    case "NUMERIC":
    case "MILESTONE":
      if (!goal.targetValue || goal.targetValue <= 0) return 0;
      return Math.min(100, Math.max(0, Math.round((goal.currentValue / goal.targetValue) * 100)));
    case "BINARY":
      return goal.currentValue >= 1 ? 100 : 0;
    default:
      return 0;
  }
}

export function formatGoalProgressValue(
  goal: Pick<Goal, "progressType" | "currentValue" | "targetValue" | "unit" | "status">,
): string {
  const unitSuffix = goal.unit ? ` ${goal.unit}` : "";
  switch (goal.progressType) {
    case "PERCENTAGE":
      return `${Math.round(goal.currentValue)}%`;
    case "NUMERIC":
      return goal.targetValue !== undefined
        ? `${goal.currentValue.toLocaleString()} / ${goal.targetValue.toLocaleString()}${unitSuffix}`
        : `${goal.currentValue.toLocaleString()}${unitSuffix}`;
    case "MILESTONE":
      return goal.targetValue !== undefined
        ? `${goal.currentValue} / ${goal.targetValue} milestones`
        : `${goal.currentValue} milestones`;
    case "BINARY":
      return goal.status === "COMPLETED" || goal.currentValue >= 1
        ? "Completed (1/1)"
        : "Pending (0/1)";
    default:
      return `${goal.currentValue}`;
  }
}

export function getGoalProgressExplanation(
  goal: Pick<Goal, "progressType" | "currentValue" | "targetValue" | "unit" | "status">,
  linkedWorkCount = 0,
): string {
  const unitText = goal.unit ? ` ${goal.unit}` : "";
  let baseText = "";

  switch (goal.progressType) {
    case "PERCENTAGE":
      baseText = `Progress is direct percentage: current value (${Math.round(
        goal.currentValue,
      )}%) of target (100%).`;
      break;
    case "NUMERIC":
      if (goal.targetValue && goal.targetValue > 0) {
        const pct = Math.round((goal.currentValue / goal.targetValue) * 100);
        baseText = `Progress is calculated as current value (${goal.currentValue}${unitText}) divided by target (${goal.targetValue}${unitText}) = ${pct}%.`;
      } else {
        baseText = `Progress is current recorded value (${goal.currentValue}${unitText}).`;
      }
      break;
    case "MILESTONE":
      if (goal.targetValue && goal.targetValue > 0) {
        const pct = Math.round((goal.currentValue / goal.targetValue) * 100);
        baseText = `Progress is calculated as completed milestones (${goal.currentValue}) divided by target milestone total (${goal.targetValue}) = ${pct}%.`;
      } else {
        baseText = `Progress is current completed milestone count (${goal.currentValue}).`;
      }
      break;
    case "BINARY":
      baseText =
        goal.status === "COMPLETED" || goal.currentValue >= 1
          ? "Binary goal: Marked 100% complete."
          : "Binary goal: 0% complete until completed.";
      break;
  }

  if (linkedWorkCount > 0) {
    baseText += ` Additionally tracked with ${linkedWorkCount} linked work item(s).`;
  }

  return baseText;
}
