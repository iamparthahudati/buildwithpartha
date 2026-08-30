import { useMemo } from "react";

import {
  ChartFrame,
  type ChartFrameStatus,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@components/navigation";
import { Text } from "@components/ui";
import { formatLocalDate } from "@lib/localDateTime";

import { habitHeatmapLevel, type HabitHeatmapDay } from "../model/habit";
import "./habit-heatmap.css";

export interface HabitHeatmapProps {
  readonly status: ChartFrameStatus;
  readonly days?: readonly HabitHeatmapDay[];
  readonly title?: string;
  readonly summary?: string;
  readonly locale?: string;
  readonly onRetry?: () => void;
  readonly className?: string;
}

function dayDescription(day: HabitHeatmapDay, locale: string): string {
  const date = formatLocalDate(day.localDate, locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  if (day.paused) return `${date}: paused`;
  if (day.completedCount >= day.targetCount) {
    return `${date}: target met, ${day.completedCount} of ${day.targetCount} completions`;
  }
  return `${date}: ${day.completedCount} of ${day.targetCount} completions`;
}

export function HabitHeatmap({
  status,
  days = [],
  title = "Habit consistency",
  summary,
  locale = "en-US",
  onRetry,
  className,
}: HabitHeatmapProps) {
  const table = useMemo(
    () => (
      <Table caption={`${title} by local date`} density="compact">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Date</TableHeaderCell>
            <TableHeaderCell>Completions</TableHeaderCell>
            <TableHeaderCell>Target</TableHeaderCell>
            <TableHeaderCell>Result</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {days.map((day) => (
            <TableRow key={day.localDate}>
              <TableHeaderCell scope="row">
                {formatLocalDate(day.localDate, locale)}
              </TableHeaderCell>
              <TableCell>{day.completedCount.toLocaleString(locale)}</TableCell>
              <TableCell>{day.targetCount.toLocaleString(locale)}</TableCell>
              <TableCell>
                {day.paused
                  ? "Paused"
                  : day.completedCount >= day.targetCount
                    ? "Target met"
                    : "Target not met"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    ),
    [days, locale, title],
  );

  const metDays = days.filter((day) => !day.paused && day.completedCount >= day.targetCount).length;
  const eligibleDays = days.filter((day) => !day.paused).length;
  const chartSummary =
    summary ??
    (status === "ready"
      ? `${metDays} of ${eligibleDays} shown local dates met the target. Paused dates are excluded.`
      : undefined);

  return (
    <ChartFrame
      title={title}
      status={status}
      {...(chartSummary ? { summary: chartSummary } : {})}
      loadingLabel="Loading Habit consistency…"
      emptyTitle="Not enough Habit history yet"
      emptyDescription="Log this Habit to build a consistency history."
      errorTitle="Habit consistency couldn't load"
      errorDescription="Other Habit details are still available."
      {...(onRetry ? { onRetry } : {})}
      dataTable={table}
      minHeight="10rem"
      className={["habit-heatmap", className].filter(Boolean).join(" ")}
    >
      <div role="img" aria-label={chartSummary ?? title} className="habit-heatmap__visual">
        <ol className="habit-heatmap__days" aria-hidden="true">
          {days.map((day) => (
            <li
              key={day.localDate}
              className={[
                "habit-heatmap__day",
                `habit-heatmap__day--level-${habitHeatmapLevel(day)}`,
                day.paused && "is-paused",
              ]
                .filter(Boolean)
                .join(" ")}
              title={dayDescription(day, locale)}
            />
          ))}
        </ol>
        <div className="habit-heatmap__legend" aria-hidden="true">
          <Text size="xs" tone="muted">
            Less
          </Text>
          {[0, 1, 2, 3, 4].map((level) => (
            <span key={level} className={`habit-heatmap__day habit-heatmap__day--level-${level}`} />
          ))}
          <Text size="xs" tone="muted">
            Target met
          </Text>
        </div>
      </div>
    </ChartFrame>
  );
}
