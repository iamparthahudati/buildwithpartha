import { ChartFrameStatus } from "@components/navigation";
import type { TimeBlock } from "../model/timeBlock";
import { TimeSummaryMetrics, type TimeSummaryMetricsStatus } from "./TimeSummaryMetrics";
import { TimeCategoryBreakdown, type TimeCategoryItem } from "./TimeCategoryBreakdown";
import { TimeGoalProgressCard, type TimeGoalProgressStatus } from "./TimeGoalProgressCard";
import { UpcomingBlocks, type UpcomingBlocksStatus } from "./UpcomingBlocks";
import "./time-summary.css";

export interface TimeSummaryProps {
  readonly metricsStatus: TimeSummaryMetricsStatus;
  readonly breakdownStatus: ChartFrameStatus;
  readonly categories?: readonly TimeCategoryItem[];
  readonly goalStatus: TimeGoalProgressStatus;
  readonly targetMinutes?: number;
  readonly actualMinutes?: number;
  readonly goalTitle?: string;
  readonly comparisonLabel?: string;
  readonly upcomingStatus?: UpcomingBlocksStatus;
  readonly upcomingBlocks?: readonly TimeBlock[];
  readonly locale?: string;
  readonly timeZone?: string;
  readonly now?: Date;
  readonly onStartFocus?: (block?: TimeBlock) => void;
  readonly onCompleteBlock?: (block: TimeBlock) => void;
  readonly onEditBlock?: (block: TimeBlock) => void;
  readonly onDuplicateBlock?: (block: TimeBlock) => void;
  readonly onDeleteBlock?: (block: TimeBlock) => void;
  readonly onCreateBlock?: () => void;
  readonly onEditGoal?: () => void;
  readonly onRetry?: () => void;
  readonly className?: string;
}

export function TimeSummary({
  metricsStatus,
  breakdownStatus,
  categories = [],
  goalStatus,
  targetMinutes = 240,
  actualMinutes = 0,
  goalTitle,
  comparisonLabel,
  upcomingStatus = "ready",
  upcomingBlocks = [],
  locale = "en-US",
  timeZone,
  now,
  onStartFocus,
  onCompleteBlock,
  onEditBlock,
  onDuplicateBlock,
  onDeleteBlock,
  onCreateBlock,
  onEditGoal,
  onRetry,
  className = "",
}: TimeSummaryProps) {
  return (
    <div
      className={`time-summary ${className}`.trim()}
      role="region"
      aria-label="Time summary overview"
    >
      <div className="time-summary__metrics-section">
        <TimeSummaryMetrics status={metricsStatus} locale={locale} />
      </div>

      <div className="time-summary__charts-grid">
        <div className="time-summary__charts-col">
          <TimeCategoryBreakdown
            status={breakdownStatus}
            categories={categories}
            locale={locale}
            {...(onRetry ? { onRetry } : {})}
          />
        </div>
        <div className="time-summary__charts-col">
          <TimeGoalProgressCard
            status={goalStatus}
            targetMinutes={targetMinutes}
            actualMinutes={actualMinutes}
            {...(goalTitle ? { title: goalTitle } : {})}
            {...(comparisonLabel ? { comparisonLabel } : {})}
            locale={locale}
            {...(onRetry ? { onRetry } : {})}
            {...(onEditGoal ? { onEditGoal } : {})}
          />
        </div>
      </div>

      <div className="time-summary__upcoming-section">
        <UpcomingBlocks
          status={upcomingStatus}
          blocks={upcomingBlocks}
          locale={locale}
          {...(timeZone ? { timeZone } : {})}
          {...(now ? { now } : {})}
          {...(onStartFocus ? { onStartFocus: (b) => onStartFocus(b) } : {})}
          {...(onCompleteBlock ? { onComplete: onCompleteBlock } : {})}
          {...(onEditBlock ? { onEdit: onEditBlock } : {})}
          {...(onDuplicateBlock ? { onDuplicate: onDuplicateBlock } : {})}
          {...(onDeleteBlock ? { onDelete: onDeleteBlock } : {})}
          {...(onCreateBlock ? { onCreateBlock } : {})}
          {...(onRetry ? { onRetry } : {})}
        />
      </div>
    </div>
  );
}
