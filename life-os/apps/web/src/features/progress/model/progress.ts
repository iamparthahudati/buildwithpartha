export type PeriodPreset =
  "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "THIS_QUARTER" | "THIS_YEAR" | "CUSTOM";

export type FocusComparisonSource = "PLANNED_BLOCKS" | "DAILY_TARGET_FALLBACK" | "NONE";

export interface CategoryMinutes {
  category: string;
  actualMinutes: number;
  percentage: number | null;
}

export interface TaskProgressSummary {
  totalCount: number;
  completedCount: number;
  dueCount: number;
  overdueCount: number;
  highPriorityCount: number;
  blockedCount: number;
  completionRatePercentage: number | null;
}

export interface FocusProgressSummary {
  plannedFocusMinutes: number;
  actualFocusMinutes: number;
  actualBreakMinutes: number;
  comparisonMinutes: number | null;
  comparisonSource: FocusComparisonSource;
  plannedVsActualRatio: number | null;
  categoryBreakdown: CategoryMinutes[];
}

export interface ProjectProgressSummary {
  totalCount: number;
  statusCounts: Record<string, number>;
  averageProgressPercentage: number | null;
}

export interface GoalProgressSummary {
  totalCount: number;
  averageProgressPercentage: number | null;
  goalsWithRecentCheckinCount: number;
}

export interface HabitProgressSummary {
  totalCount: number;
  completionRatePercentage: number | null;
}

export interface ReviewProgressSummary {
  dailyStreakDays: number;
  finalizedReviewsCount: number;
}

export interface ProgressReport {
  metricDictionaryVersion: string;
  generatedAt: string;
  timeZone: string;
  startDate: string;
  endDate: string;
  projectId?: string;
  labelId?: string;
  category?: string;
  taskProgress: TaskProgressSummary;
  focusProgress: FocusProgressSummary;
  projectProgress: ProjectProgressSummary;
  goalProgress: GoalProgressSummary;
  habitProgress: HabitProgressSummary;
  reviewProgress: ReviewProgressSummary;
  summaryText: string;
}

export interface ProgressFilterParams {
  periodPreset: PeriodPreset;
  startDate: string;
  endDate: string;
  timeZone: string;
  projectId?: string | undefined;
  labelId?: string | undefined;
  category?: string | undefined;
}

/**
 * Computes ISO YYYY-MM-DD date range for a given period preset based on today's date in local time.
 */
export function getPeriodPresetDates(
  preset: PeriodPreset,
  referenceDate: Date = new Date(),
): { startDate: string; endDate: string } {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const day = referenceDate.getDate();

  const formatDate = (d: Date): string => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  if (preset === "TODAY") {
    const todayStr = formatDate(referenceDate);
    return { startDate: todayStr, endDate: todayStr };
  }

  if (preset === "THIS_WEEK") {
    // ISO Monday-start week
    const dayOfWeek = referenceDate.getDay();
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    const monday = new Date(year, month, day + diffToMonday);
    const sunday = new Date(year, month, day + diffToMonday + 6);
    return { startDate: formatDate(monday), endDate: formatDate(sunday) };
  }

  if (preset === "THIS_MONTH") {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    return { startDate: formatDate(firstDay), endDate: formatDate(lastDay) };
  }

  if (preset === "THIS_QUARTER") {
    const quarterStartMonth = Math.floor(month / 3) * 3;
    const firstDay = new Date(year, quarterStartMonth, 1);
    const lastDay = new Date(year, quarterStartMonth + 3, 0);
    return { startDate: formatDate(firstDay), endDate: formatDate(lastDay) };
  }

  if (preset === "THIS_YEAR") {
    const firstDay = new Date(year, 0, 1);
    const lastDay = new Date(year, 11, 31);
    return { startDate: formatDate(firstDay), endDate: formatDate(lastDay) };
  }

  // CUSTOM fallback to current month
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  return { startDate: formatDate(firstDay), endDate: formatDate(lastDay) };
}

/**
 * Ensures non-causal claims enforcement (Section 2.3 of Analytics Metric Dictionary).
 * Sanitizes copy to prevent unsupported causal claims (e.g. "x caused y").
 */
export function sanitizeNonCausalCopy(text: string): string {
  if (!text) return "";
  return text
    .replace(/\bcaused\b/gi, "coincided with")
    .replace(/\bbecause of\b/gi, "during periods with")
    .replace(/\bled to\b/gi, "was followed by");
}
