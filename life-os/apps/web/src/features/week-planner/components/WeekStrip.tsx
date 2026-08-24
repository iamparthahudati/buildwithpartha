import { MoreHorizontal } from "lucide-react";
import { Badge, Heading, IconButton, ProgressBar, Skeleton, Text } from "@components/ui";
import { ErrorState } from "@components/feedback";
import { Menu, type MenuItemDescriptor } from "@components/navigation";
import { formatLocalDate } from "@lib/localDateTime";
import {
  calculateCapacityPercentage,
  formatMinutesToHours,
  type WeekDayPlan,
} from "../model/weekPlanner";
import "./week-strip.css";

export interface WeekStripProps {
  readonly days: readonly WeekDayPlan[];
  readonly selectedDate?: string;
  readonly locale?: string;
  readonly loading?: boolean;
  readonly error?: string;
  readonly onRetry?: () => void;
  readonly onSelectDate?: (date: string) => void;
  readonly onAdjustCapacity?: (day: WeekDayPlan) => void;
  readonly onMoveTasks?: (day: WeekDayPlan) => void;
  readonly className?: string;
}

export function WeekStrip({
  days,
  selectedDate,
  locale = "en-US",
  loading = false,
  error,
  onRetry,
  onSelectDate,
  onAdjustCapacity,
  onMoveTasks,
  className,
}: WeekStripProps) {
  const rootClass = ["lifeos-week-strip", className].filter(Boolean).join(" ");

  if (loading) {
    return (
      <div className={[rootClass, "lifeos-week-strip--loading"].join(" ")} aria-busy="true">
        <Text inline size="xs" tone="secondary" className="lifeos-week-strip__loading-label">
          Loading week plan...
        </Text>
        <div className="lifeos-week-strip__grid">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="lifeos-week-strip__skeleton-day">
              <Skeleton shape="line" width="60%" height="0.875rem" />
              <Skeleton shape="line" width="40%" height="1.5rem" />
              <Skeleton shape="line" width="80%" height="0.5rem" />
              <Skeleton shape="line" width="50%" height="0.75rem" />
            </div>
          ))}
        </div>
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

  return (
    <div className={rootClass}>
      <ol className="lifeos-week-strip__grid" aria-label="Seven-day week plan and capacity">
        {days.map((day) => {
          const isOvercapacity = day.isOvercapacity ?? day.plannedMinutes > day.availableMinutes;
          const isSelected =
            day.isSelected ?? (selectedDate ? day.localDate === selectedDate : false);
          const shortWeekday =
            day.dayOfWeek ?? formatLocalDate(day.localDate, locale, { weekday: "short" });
          const dayOfMonth = formatLocalDate(day.localDate, locale, { day: "numeric" });
          const fullDate = formatLocalDate(day.localDate, locale, { dateStyle: "full" });
          const plannedStr = formatMinutesToHours(day.plannedMinutes);
          const availableStr = formatMinutesToHours(day.availableMinutes);
          const capacityPct = calculateCapacityPercentage(day.plannedMinutes, day.availableMinutes);

          const menuItems: MenuItemDescriptor[] = [
            {
              type: "item",
              id: `select-${day.localDate}`,
              label: `Select ${shortWeekday} (${dayOfMonth})`,
              onSelect: () => onSelectDate?.(day.localDate),
            },
            ...(onAdjustCapacity
              ? [
                  {
                    type: "item" as const,
                    id: `adjust-${day.localDate}`,
                    label: `Adjust capacity for ${shortWeekday}`,
                    onSelect: () => onAdjustCapacity(day),
                  },
                ]
              : []),
            ...(onMoveTasks
              ? [
                  {
                    type: "item" as const,
                    id: `move-${day.localDate}`,
                    label: `Move tasks from ${shortWeekday}`,
                    onSelect: () => onMoveTasks(day),
                  },
                ]
              : []),
          ];

          return (
            <li
              key={day.localDate}
              className={[
                "lifeos-week-strip__day",
                day.isToday && "is-today",
                isSelected && "is-selected",
                isOvercapacity && "is-overcapacity",
                day.hasConflict && "has-conflict",
              ]
                .filter(Boolean)
                .join(" ")}
              {...(day.isToday ? { "aria-current": "date" as const } : {})}
            >
              <button
                type="button"
                className="lifeos-week-strip__day-trigger"
                onClick={() => onSelectDate?.(day.localDate)}
                aria-pressed={isSelected}
                aria-label={`${fullDate}: ${plannedStr} planned of ${availableStr} available capacity, ${day.completedTasksCount} of ${day.totalTasksCount} tasks done${
                  isOvercapacity ? ", over capacity" : ""
                }${day.hasConflict ? ", conflict detected" : ""}`}
              >
                <div className="lifeos-week-strip__day-header">
                  <time dateTime={day.localDate} className="lifeos-week-strip__date">
                    <Text inline size="xs" tone="secondary" className="lifeos-week-strip__weekday">
                      {shortWeekday}
                    </Text>
                    <Heading level={3} size="sm" className="lifeos-week-strip__day-number">
                      {dayOfMonth}
                    </Heading>
                  </time>
                  <div className="lifeos-week-strip__badges">
                    {day.isToday && <Badge tone="primary">Today</Badge>}
                    {isOvercapacity && <Badge tone="danger">Over</Badge>}
                    {!isOvercapacity && day.hasConflict && <Badge tone="warning">Conflict</Badge>}
                  </div>
                </div>

                <div className="lifeos-week-strip__capacity-info">
                  <div className="lifeos-week-strip__capacity-text">
                    <Text inline size="xs" weight="semibold" numeric>
                      {plannedStr}
                    </Text>
                    <Text inline size="xs" tone="secondary">
                      {" / "}
                    </Text>
                    <Text inline size="xs" tone="secondary" numeric>
                      {availableStr}
                    </Text>
                  </div>
                  <ProgressBar
                    label={`${fullDate} capacity`}
                    labelHidden
                    value={day.plannedMinutes}
                    max={Math.max(1, day.availableMinutes)}
                    tone={isOvercapacity ? "danger" : day.hasConflict ? "warning" : "primary"}
                    size="sm"
                    valueText={`${capacityPct}% capacity used (${plannedStr} of ${availableStr})`}
                  />
                </div>

                <div className="lifeos-week-strip__task-info">
                  <Text size="xs" tone="secondary" numeric>
                    {day.totalTasksCount > 0
                      ? `${day.completedTasksCount}/${day.totalTasksCount} tasks`
                      : "No tasks"}
                  </Text>
                </div>
              </button>

              <div className="lifeos-week-strip__day-actions">
                <Menu
                  label={`Day actions for ${shortWeekday} ${dayOfMonth}`}
                  trigger={
                    <IconButton
                      icon={MoreHorizontal}
                      label={`Day actions for ${shortWeekday} ${dayOfMonth}`}
                      variant="ghost"
                      size="sm"
                    />
                  }
                  items={menuItems}
                  align="end"
                />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
