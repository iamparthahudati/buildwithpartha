import { Checkbox } from "@components/ui";

import { CALENDAR_SOURCES, type CalendarSourceType } from "../model/calendar";
import "./calendar-filter-legend.css";

export interface CalendarFilterLegendProps {
  readonly selected: ReadonlySet<CalendarSourceType>;
  readonly counts?: Partial<Record<CalendarSourceType, number>>;
  readonly disabled?: boolean;
  readonly onChange: (selected: ReadonlySet<CalendarSourceType>) => void;
  readonly className?: string;
}

export function CalendarFilterLegend({
  selected,
  counts,
  disabled = false,
  onChange,
  className,
}: CalendarFilterLegendProps) {
  return (
    <fieldset
      disabled={disabled}
      className={["lifeos-calendar-filter-legend", className].filter(Boolean).join(" ")}
    >
      <legend>Show on Calendar</legend>
      <div className="lifeos-calendar-filter-legend__options">
        {CALENDAR_SOURCES.map((source) => {
          const count = counts?.[source.type];
          return (
            <div key={source.type} className="lifeos-calendar-filter-legend__option">
              <span
                aria-hidden="true"
                className={`lifeos-calendar-filter-legend__swatch lifeos-calendar-filter-legend__swatch--${source.colorIndex}`}
              />
              <Checkbox
                label={`${source.label}${count === undefined ? "" : ` (${count})`}`}
                checked={selected.has(source.type)}
                onChange={(event) => {
                  const next = new Set(selected);
                  if (event.target.checked) next.add(source.type);
                  else next.delete(source.type);
                  onChange(next);
                }}
              />
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
