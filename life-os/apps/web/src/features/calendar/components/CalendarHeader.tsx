import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";

import { Button, Heading, IconButton } from "@components/ui";
import type { LocalDate } from "@lib/localDateTime";

import { formatCalendarPeriod, shiftCalendarPeriod, type CalendarView } from "../model/calendar";
import "./calendar-header.css";

export interface CalendarHeaderProps {
  readonly date: LocalDate;
  readonly today: LocalDate;
  readonly view: CalendarView;
  readonly locale?: string;
  readonly weekStartsOn?: 0 | 1;
  readonly onDateChange: (date: LocalDate) => void;
  readonly onViewChange: (view: CalendarView) => void;
  readonly onAdd?: () => void;
  readonly className?: string;
}

const VIEW_LABEL: Record<CalendarView, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
};

export function CalendarHeader({
  date,
  today,
  view,
  locale = "en-US",
  weekStartsOn = 1,
  onDateChange,
  onViewChange,
  onAdd,
  className,
}: CalendarHeaderProps) {
  const periodLabel = formatCalendarPeriod(date, view, locale, weekStartsOn);

  return (
    <header className={["lifeos-calendar-header", className].filter(Boolean).join(" ")}>
      <div className="lifeos-calendar-header__period">
        <div className="lifeos-calendar-header__navigation" role="group" aria-label="Calendar date">
          <IconButton
            icon={ChevronLeft}
            label={`Previous ${view}`}
            size="sm"
            onClick={() => onDateChange(shiftCalendarPeriod(date, view, -1))}
          />
          <Button size="sm" onClick={() => onDateChange(today)} disabled={date === today}>
            Today
          </Button>
          <IconButton
            icon={ChevronRight}
            label={`Next ${view}`}
            size="sm"
            onClick={() => onDateChange(shiftCalendarPeriod(date, view, 1))}
          />
        </div>
        <Heading level={2} size="md" className="lifeos-calendar-header__title">
          {periodLabel}
        </Heading>
      </div>

      <div className="lifeos-calendar-header__actions">
        <div className="lifeos-calendar-header__views" role="group" aria-label="Calendar view">
          {(["day", "week", "month"] as const).map((option) => (
            <Button
              key={option}
              size="sm"
              variant="ghost"
              aria-pressed={option === view}
              {...(option === view ? { className: "is-pressed" } : {})}
              onClick={() => onViewChange(option)}
            >
              {VIEW_LABEL[option]}
            </Button>
          ))}
        </div>
        {onAdd ? (
          <Button size="sm" variant="primary" iconStart={CalendarPlus} onClick={onAdd}>
            Add Time Block
          </Button>
        ) : null}
      </div>
    </header>
  );
}
