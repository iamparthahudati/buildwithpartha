import { useMemo } from "react";
import { Badge, Heading, ProgressBar, SkeletonCard, Text } from "@components/ui";
import { ErrorState } from "@components/feedback";
import { ChartFrame, DonutChart, type ChartDatum } from "@components/navigation";
import {
  calculateCapacityPercentage,
  formatMinutesToHours,
  type WeekCapacitySummaryData,
} from "../model/weekPlanner";
import "./week-capacity-summary.css";

export interface WeekCapacitySummaryProps {
  readonly summary?: WeekCapacitySummaryData;
  readonly loading?: boolean;
  readonly error?: string;
  readonly locale?: string;
  readonly onRetry?: () => void;
  readonly className?: string;
}

export function WeekCapacitySummary({
  summary,
  loading = false,
  error,
  locale = "en-US",
  onRetry,
  className,
}: WeekCapacitySummaryProps) {
  const rootClass = ["lifeos-week-capacity-summary", className].filter(Boolean).join(" ");

  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  const planned = summary?.totalPlannedMinutes ?? 0;
  const available = summary?.totalAvailableMinutes ?? 0;

  const categoryBreakdown = summary?.categoryBreakdown;
  const chartData: readonly ChartDatum[] = useMemo(() => {
    if (!categoryBreakdown || categoryBreakdown.length === 0) {
      return [{ id: "workload", label: "Planned workload", value: planned }];
    }
    return categoryBreakdown.map((item, index) => ({
      id: `cat-${index}-${item.category}`,
      label: item.category,
      value: item.minutes,
    }));
  }, [categoryBreakdown, planned]);

  if (loading) {
    return (
      <div
        className={[rootClass, "lifeos-week-capacity-summary--loading"].join(" ")}
        aria-busy="true"
      >
        <SkeletonCard />
      </div>
    );
  }

  if (error) {
    return (
      <div className={rootClass}>
        <ErrorState scope="region" title={error} {...(onRetry ? { onRetry } : {})} />
      </div>
    );
  }

  const isOvercapacity = planned > available;
  const overDelta = isOvercapacity ? planned - available : 0;
  const capacityPct = calculateCapacityPercentage(planned, available);

  const plannedStr = formatMinutesToHours(planned);
  const availableStr = formatMinutesToHours(available);
  const overDeltaStr = formatMinutesToHours(overDelta);

  const totalTasks = summary?.totalTasksCount ?? 0;
  const completedTasks = summary?.completedTasksCount ?? 0;
  const taskPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <section className={rootClass} aria-label="Weekly capacity summary">
      <div className="lifeos-week-capacity-summary__header">
        <div>
          <Heading level={2} size="md">
            Weekly Capacity
          </Heading>
          <Text size="xs" tone="secondary">
            Planned workload vs available capacity
          </Text>
        </div>
        <div className="lifeos-week-capacity-summary__header-badges">
          {isOvercapacity ? (
            <Badge tone="danger">Over capacity (+{overDeltaStr})</Badge>
          ) : summary?.hasConflicts ? (
            <Badge tone="warning">Conflicts detected</Badge>
          ) : (
            <Badge tone="success">Balanced plan</Badge>
          )}
        </div>
      </div>

      <div className="lifeos-week-capacity-summary__body">
        <div className="lifeos-week-capacity-summary__metrics-col">
          <div className="lifeos-week-capacity-summary__stat-group">
            <Text size="xs" tone="secondary">
              Workload allocation
            </Text>
            <div className="lifeos-week-capacity-summary__stat-value">
              <Heading level={3} size="lg">
                {plannedStr}
              </Heading>
              <Text inline size="sm" tone="secondary">
                {" / "}
              </Text>
              <Text inline size="sm" tone="secondary" numeric>
                {availableStr} available
              </Text>
            </div>
            <ProgressBar
              label="Weekly workload capacity"
              labelHidden
              value={planned}
              max={Math.max(1, available)}
              tone={isOvercapacity ? "danger" : summary?.hasConflicts ? "warning" : "primary"}
              size="md"
              valueText={`${capacityPct}% of capacity allocated (${plannedStr} of ${availableStr})`}
            />
          </div>

          <div className="lifeos-week-capacity-summary__stat-group">
            <Text size="xs" tone="secondary">
              Task completion
            </Text>
            <div className="lifeos-week-capacity-summary__stat-value">
              <Heading level={3} size="md">
                {numberFormatter.format(completedTasks)}
              </Heading>
              <Text inline size="xs" tone="secondary">
                {" / "}
              </Text>
              <Text inline size="xs" tone="secondary" numeric>
                {numberFormatter.format(totalTasks)} tasks completed ({taskPct}%)
              </Text>
            </div>
            <ProgressBar
              label="Weekly task completion"
              labelHidden
              value={completedTasks}
              max={Math.max(1, totalTasks)}
              tone="success"
              size="sm"
              valueText={`${taskPct}% of planned tasks completed (${completedTasks} of ${totalTasks})`}
            />
          </div>

          {isOvercapacity && (
            <div className="lifeos-week-capacity-summary__alert" role="alert">
              <Text size="xs" weight="semibold" tone="danger">
                Notice: Planned time exceeds available capacity by {overDeltaStr}.
              </Text>
              <Text size="xs" tone="secondary">
                Consider reallocating tasks or extending available hours to resolve workload
                conflict.
              </Text>
            </div>
          )}
        </div>

        <div className="lifeos-week-capacity-summary__chart-col">
          <ChartFrame
            status="ready"
            title="Time Allocation Breakdown"
            summary="Distribution of planned time across categories"
          >
            <DonutChart
              data={chartData}
              label="Weekly planned time allocation"
              locale={locale}
              centerText={`${capacityPct}% used`}
            />
          </ChartFrame>
        </div>
      </div>
    </section>
  );
}
