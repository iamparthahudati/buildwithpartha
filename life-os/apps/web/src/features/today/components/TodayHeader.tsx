import { Plus } from "lucide-react";

import { Button, Heading, Text } from "@components/ui";
import { formatLocalDate, nowLocalTime, todayLocalDate } from "@lib/localDateTime";

import "./today-header.css";

/**
 * TodayHeader (LOS-0608).
 *
 * The greeting band at the top of the Today screen. Renders a time-sensitive
 * greeting derived from the wall-clock hour in the user's own confirmed
 * timezone — "Good morning / afternoon / evening, {displayName}" — plus
 * the full local date and a compact Quick Add trigger.
 *
 * "Local" is always relative to `timeZone`, not the browser's zone, following
 * the same rule `TopBar` uses for its date label and `lib/localDateTime.ts`
 * enforces as the canonical date/time boundary.
 *
 * The Quick Add trigger is a caller-supplied callback: `TodayHeader` owns only
 * the button that opens the dialog, not the dialog itself. `AppRouter` already
 * mounts `QuickAddDialog` at shell level; this button complements the TopBar
 * trigger with a contextually visible inline path for the most common Today
 * action.
 *
 * `now` is injectable so tests can pin the hour without mocking the entire
 * module, the same pattern `TopBar` already uses.
 */

/** Maps the wall-clock hour to one of the three greeting periods. */
function resolveGreetingPeriod(localTime: string): "morning" | "afternoon" | "evening" {
  const [hourStr = "0"] = localTime.split(":");
  const hour = Number(hourStr);
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export interface TodayHeaderProps {
  /** The authenticated user's display name. */
  readonly displayName: string;
  /** The user's confirmed IANA timezone. Required for local date/time. */
  readonly timeZone: string;
  /** The user's confirmed locale for formatting the date. */
  readonly locale: string;
  /** Optional subtitle shown below the date, e.g. a day-of-week summary hint. */
  readonly subtitle?: string;
  /** Fired when the Quick Add trigger is clicked. */
  readonly onQuickAddClick: () => void;
  /** Injected for deterministic tests. Defaults to `new Date()`. */
  readonly now?: Date;
  readonly className?: string;
}

export function TodayHeader({
  displayName,
  timeZone,
  locale,
  subtitle,
  onQuickAddClick,
  now,
  className,
}: TodayHeaderProps) {
  const nowDate = now ?? new Date();
  const localTime = nowLocalTime(timeZone, nowDate);
  const period = resolveGreetingPeriod(localTime);
  const localDate = todayLocalDate(timeZone, nowDate);
  const formattedDate = formatLocalDate(localDate, locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const greeting = `Good ${period}, ${displayName}`;

  const rootClasses = ["lifeos-today-header", className].filter(Boolean).join(" ");

  return (
    <div className={rootClasses}>
      <div className="lifeos-today-header__text">
        <Heading level={1} className="lifeos-today-header__greeting">
          {greeting}
        </Heading>
        <Text tone="secondary" size="sm" className="lifeos-today-header__date">
          {formattedDate}
          {timeZone ? <span className="lifeos-today-header__tz"> · {timeZone}</span> : null}
        </Text>
        {subtitle ? (
          <Text tone="secondary" size="sm" className="lifeos-today-header__subtitle">
            {subtitle}
          </Text>
        ) : null}
      </div>

      <div className="lifeos-today-header__actions">
        <Button variant="secondary" size="sm" onClick={onQuickAddClick}>
          <Plus aria-hidden="true" />
          Quick Add
        </Button>
      </div>
    </div>
  );
}
