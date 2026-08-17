import { Check, CircleAlert, type LucideIcon } from "lucide-react";

import { Badge, Heading, Icon, Text, type BadgeTone, type HeadingLevel } from "@components/ui";
import { formatLocalDate, type LocalDate } from "@lib/localDateTime";

import "./timeline.css";

/**
 * Timeline (LOS-0430).
 *
 * A vertical sequence of dated milestones, each in exactly one of four
 * states this component itself never computes — `status` is the caller's,
 * the same "component supplies the mechanism, caller supplies the state"
 * split every other stateful pattern in this epic already uses. Whether a
 * `future`-dated entry has quietly become `overdue` depends on "now" and a
 * timezone (`lib/localDateTime.ts`'s whole reason for existing), which only
 * the caller — already holding both — can resolve correctly.
 *
 * Composing `DividerList` (LOS-0330) directly was considered and rejected:
 * its own separator is a horizontal hairline *between* rows, but a
 * timeline's separator is the vertical connecting line *through* each row's
 * own marker column — the two visual languages fight rather than combine,
 * so this uses a plain `<ol>` (order is meaningful here, unlike most lists
 * in this codebase) with its own marker/line CSS instead.
 *
 * "Mobile layout" is the marker-plus-content two-column row reflowing on
 * its own — the content column is already flexible width — with a single
 * breakpoint tightening spacing and stacking the date under the title
 * rather than beside it, the same small-viewport density every other
 * composed component in this epic already applies.
 */

export type TimelineEntryStatus = "completed" | "current" | "future" | "overdue";

export interface TimelineEntry {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly date: LocalDate;
  readonly status: TimelineEntryStatus;
}

export interface TimelineProps {
  readonly entries: readonly TimelineEntry[];
  /** Names the list, e.g. "Project milestones". */
  readonly label: string;
  readonly locale: string;
  /**
   * Renders each entry's title as a real heading at this level, joining the
   * page's own outline — appropriate for a dedicated Timeline tab/page.
   * Omitted, a title stays plain emphasized text (`EmptyState`'s identical
   * `titleLevel` convention, LOS-0410): a handful of milestones inside a
   * Today widget are not a landmark's worth of document structure each.
   */
  readonly titleLevel?: HeadingLevel;
  readonly className?: string;
}

const STATUS_LABEL: Record<TimelineEntryStatus, string> = {
  completed: "Completed",
  current: "In progress",
  future: "Upcoming",
  overdue: "Overdue",
};

const STATUS_TONE: Record<TimelineEntryStatus, BadgeTone> = {
  completed: "success",
  current: "primary",
  future: "neutral",
  overdue: "danger",
};

const STATUS_ICON: Partial<Record<TimelineEntryStatus, LucideIcon>> = {
  completed: Check,
  overdue: CircleAlert,
};

export function Timeline({ entries, label, locale, titleLevel, className }: TimelineProps) {
  return (
    <ol className={["lifeos-timeline", className].filter(Boolean).join(" ")} aria-label={label}>
      {entries.map((entry) => {
        const icon = STATUS_ICON[entry.status];

        return (
          <li
            key={entry.id}
            className={`lifeos-timeline__entry lifeos-timeline__entry--${entry.status}`}
          >
            <span className="lifeos-timeline__marker" aria-hidden="true">
              {icon ? <Icon icon={icon} decorative size="sm" /> : null}
            </span>

            <div className="lifeos-timeline__content">
              <div className="lifeos-timeline__heading-row">
                {titleLevel === undefined ? (
                  <span className="lifeos-timeline__title lifeos-timeline__title--plain">
                    {entry.title}
                  </span>
                ) : (
                  <Heading level={titleLevel} size="sm" className="lifeos-timeline__title">
                    {entry.title}
                  </Heading>
                )}
                <Badge tone={STATUS_TONE[entry.status]}>{STATUS_LABEL[entry.status]}</Badge>
              </div>

              <Text tone="secondary" size="sm" className="lifeos-timeline__date">
                {formatLocalDate(entry.date, locale)}
              </Text>

              {entry.description ? (
                <Text size="sm" className="lifeos-timeline__description">
                  {entry.description}
                </Text>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
