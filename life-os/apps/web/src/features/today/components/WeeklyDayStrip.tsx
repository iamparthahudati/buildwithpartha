import { ProgressBar, Text } from "@components/ui";
import { formatLocalDate } from "@lib/localDateTime";

import type { TodayWeekDay } from "../model/todaySprintWeek";

export interface WeeklyDayStripProps {
  readonly days: readonly TodayWeekDay[];
  readonly locale: string;
  readonly className?: string;
}

/** Seven local-date summaries in the user's configured week order (LOS-0611). */
export function WeeklyDayStrip({ days, locale, className }: WeeklyDayStripProps) {
  const numberFormatter = new Intl.NumberFormat(locale);

  return (
    <ol
      className={["lifeos-weekly-day-strip", className].filter(Boolean).join(" ")}
      aria-label="Weekly plan by day"
    >
      {days.map((day) => {
        const completed = Math.max(0, day.completedTasksCount);
        const total = Math.max(0, day.totalTasksCount);
        const shortWeekday = formatLocalDate(day.localDate, locale, { weekday: "short" });
        const dayOfMonth = formatLocalDate(day.localDate, locale, { day: "numeric" });
        const fullDate = formatLocalDate(day.localDate, locale, { dateStyle: "full" });
        const valueText = `${numberFormatter.format(completed)} of ${numberFormatter.format(total)} planned tasks done`;

        return (
          <li
            key={day.localDate}
            className={["lifeos-weekly-day-strip__day", day.isToday && "is-today"]
              .filter(Boolean)
              .join(" ")}
            {...(day.isToday ? { "aria-current": "date" as const } : {})}
          >
            <time dateTime={day.localDate} aria-label={fullDate}>
              <Text inline size="xs" tone="secondary" className="lifeos-weekly-day-strip__weekday">
                {shortWeekday}
              </Text>
              <Text inline size="sm" weight="semibold" numeric>
                {dayOfMonth}
              </Text>
            </time>
            {total > 0 ? (
              <ProgressBar
                label={`${fullDate} task completion`}
                labelHidden
                value={completed}
                max={total}
                valueText={valueText}
                size="sm"
              />
            ) : (
              <Text size="xs" tone="muted" className="lifeos-weekly-day-strip__empty">
                No tasks
              </Text>
            )}
            <Text size="xs" tone="secondary" numeric className="lifeos-weekly-day-strip__count">
              {total > 0
                ? `${numberFormatter.format(completed)}/${numberFormatter.format(total)}`
                : "—"}
            </Text>
          </li>
        );
      })}
    </ol>
  );
}
