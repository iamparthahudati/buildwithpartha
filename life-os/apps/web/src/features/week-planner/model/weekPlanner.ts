export interface WeekDayCategoryAllocation {
  readonly category: string;
  readonly minutes: number;
  readonly color?: string;
}

export interface WeekDayPlan {
  readonly localDate: string;
  readonly dayOfWeek?: string;
  readonly isToday?: boolean;
  readonly isSelected?: boolean;
  readonly plannedMinutes: number;
  readonly availableMinutes: number;
  readonly totalTasksCount: number;
  readonly completedTasksCount: number;
  readonly timeBlocksCount?: number;
  readonly hasConflict?: boolean;
  readonly isOvercapacity?: boolean;
  readonly categoryBreakdown?: readonly WeekDayCategoryAllocation[];
}

export interface WeekCapacitySummaryData {
  readonly totalPlannedMinutes: number;
  readonly totalAvailableMinutes: number;
  readonly overcapacityMinutes?: number;
  readonly totalTasksCount: number;
  readonly completedTasksCount: number;
  readonly daysCount?: number;
  readonly hasConflicts?: boolean;
  readonly categoryBreakdown?: readonly WeekDayCategoryAllocation[];
}

/** Format minutes into human-readable hours and minutes (e.g., 90 -> "1h 30m", 480 -> "8h", 45 -> "45m"). */
export function formatMinutesToHours(minutes: number): string {
  const safeMinutes = Math.max(0, Math.round(minutes));
  if (safeMinutes === 0) {
    return "0m";
  }
  const hours = Math.floor(safeMinutes / 60);
  const remainingMins = safeMinutes % 60;

  if (hours > 0 && remainingMins > 0) {
    return `${hours}h ${remainingMins}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${remainingMins}m`;
}

/** Calculate capacity percentage safely handling zero available capacity. */
export function calculateCapacityPercentage(
  plannedMinutes: number,
  availableMinutes: number,
): number {
  const safePlanned = Math.max(0, plannedMinutes);
  const safeAvailable = Math.max(0, availableMinutes);
  if (safeAvailable <= 0) {
    return safePlanned > 0 ? 100 : 0;
  }
  return Math.min(999, Math.round((safePlanned / safeAvailable) * 100));
}
