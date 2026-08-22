import "./today-header-section.css";

import { TodayHeader, type TodayHeaderProps } from "./TodayHeader";
import { TodayMetricStrip, type TodayMetricsData } from "./TodayMetricStrip";

/**
 * TodayHeaderSection (LOS-0608).
 *
 * Combines `TodayHeader` and `TodayMetricStrip` in the fixed vertical order
 * specified by the Today wireframe: greeting/date/Quick Add above, metric
 * cards below. Each child remains independently importable for testing and
 * catalog demonstration.
 */
export interface TodayHeaderSectionProps extends TodayHeaderProps, TodayMetricsData {}

export function TodayHeaderSection({
  // TodayHeader props
  displayName,
  timeZone,
  locale,
  subtitle,
  onQuickAddClick,
  now,
  // TodayMetricsData props
  mitStatus,
  tasksStatus,
  scheduledTimeStatus,
  focusTimeStatus,
  activeProjectsStatus,
  weekProgressStatus,
  onRetryMit,
  onRetryTasks,
  onRetryScheduledTime,
  onRetryFocusTime,
  onRetryActiveProjects,
  onRetryWeekProgress,
}: TodayHeaderSectionProps) {
  return (
    <div className="lifeos-today-header-section">
      <TodayHeader
        displayName={displayName}
        timeZone={timeZone}
        locale={locale}
        {...(subtitle !== undefined ? { subtitle } : {})}
        onQuickAddClick={onQuickAddClick}
        {...(now !== undefined ? { now } : {})}
      />
      <TodayMetricStrip
        mitStatus={mitStatus}
        tasksStatus={tasksStatus}
        scheduledTimeStatus={scheduledTimeStatus}
        focusTimeStatus={focusTimeStatus}
        activeProjectsStatus={activeProjectsStatus}
        weekProgressStatus={weekProgressStatus}
        {...(onRetryMit !== undefined ? { onRetryMit } : {})}
        {...(onRetryTasks !== undefined ? { onRetryTasks } : {})}
        {...(onRetryScheduledTime !== undefined ? { onRetryScheduledTime } : {})}
        {...(onRetryFocusTime !== undefined ? { onRetryFocusTime } : {})}
        {...(onRetryActiveProjects !== undefined ? { onRetryActiveProjects } : {})}
        {...(onRetryWeekProgress !== undefined ? { onRetryWeekProgress } : {})}
      />
    </div>
  );
}
