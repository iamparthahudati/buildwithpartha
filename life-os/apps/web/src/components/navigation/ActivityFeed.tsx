import type { LucideIcon } from "lucide-react";

import { EmptyState, ErrorState, type EmptyStateVariant } from "@components/feedback";
import {
  Heading,
  Icon,
  Link,
  LiveRegion,
  SkeletonText,
  Text,
  type HeadingLevel,
} from "@components/ui";

import { groupActivityEventsByDay } from "./activityGrouping";
import { formatAbsoluteCommentTime, formatRelativeCommentTime } from "./commentTimestamp";
import { Pagination, type PaginationProps } from "./Pagination";
import "./activity-feed.css";

/**
 * ActivityFeed (LOS-0433).
 *
 * Structured actor/action/object rendering: three separate slots, never one
 * pre-formatted sentence string, the same "no domain hardcoded" principle
 * `FilterBar`/`DataTable` already apply to their own caller-supplied slots —
 * this component knows nothing about what actions a Task or a Project can
 * have, only how to lay out whichever actor/action/object triple it is
 * given.
 *
 * `object` is `undefined` for a deleted or otherwise inaccessible record,
 * rendered as plain, non-linked text rather than a broken link — a safe
 * fallback that names the situation without leaking whether the record ever
 * existed, `docs/30-CONTENT-AND-TONE-GUIDE.md`'s own "state unavailability
 * without leaking existence" rule.
 *
 * Grouped, not flat: events are grouped into real nested lists by calendar
 * day (`activityGrouping.ts`), each group a `<li>` of its own containing a
 * day label and a nested `<ul>` — a plain list, unlike `CommandPalette`'s
 * `role="listbox"` grouping (LOS-0426), tolerates this nesting natively
 * without that component's `role="presentation"` workaround. `Pagination`
 * (LOS-0421) composes below exactly like `DataTable` already does: paging
 * decides which events are loaded, grouping is a pure presentation split of
 * whichever page that is.
 *
 * Every icon is decorative — the actor/action/object text already carries
 * the complete meaning, so an icon reinforces rather than announces twice,
 * the same rule `Badge`/`StatusDot` (LOS-0309) already state for color.
 *
 * Timestamps reuse `commentTimestamp.ts` (LOS-0432) directly: a relative
 * visible string, a full absolute string as the accessible label — nothing
 * about that formatting is comment-specific, so there is nothing to
 * duplicate here.
 */

export interface ActivityObjectRef {
  readonly label: string;
  readonly href: string;
}

export interface ActivityEvent {
  readonly id: string;
  readonly actorName: string;
  /** A past-tense verb phrase, e.g. "archived", "commented on", "marked done". */
  readonly action: string;
  /** Omit for a deleted or inaccessible object — renders the safe fallback instead. */
  readonly object?: ActivityObjectRef;
  /** ISO instant. */
  readonly createdAt: string;
  readonly icon?: LucideIcon;
}

export type ActivityFeedStatus =
  | { readonly type: "ready" }
  | { readonly type: "loading" }
  | { readonly type: "error"; readonly message: string; readonly onRetry?: () => void };

export interface ActivityFeedPaginationConfig {
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly onPageChange: PaginationProps["onPageChange"];
}

export interface ActivityFeedProps {
  readonly label: string;
  readonly events: readonly ActivityEvent[];
  readonly locale: string;
  readonly timeZone: string;
  readonly status?: ActivityFeedStatus;
  readonly emptyTitle: string;
  readonly emptyDescription?: string;
  readonly emptyVariant?: EmptyStateVariant;
  readonly pagination?: ActivityFeedPaginationConfig;
  /** Real heading level for each day group's own label. Plain text when omitted. */
  readonly groupHeadingLevel?: HeadingLevel;
  readonly now?: Date;
  readonly className?: string;
}

const LOADING_ROW_COUNT = 4;

export function ActivityFeed({
  label,
  events,
  locale,
  timeZone,
  status = { type: "ready" },
  emptyTitle,
  emptyDescription,
  emptyVariant = "first-use",
  pagination,
  groupHeadingLevel,
  now = new Date(),
  className,
}: ActivityFeedProps) {
  if (status.type === "error") {
    return (
      <ErrorState
        scope="region"
        title="Couldn't load activity."
        description={status.message}
        {...(status.onRetry ? { onRetry: status.onRetry } : {})}
        {...(className !== undefined ? { className } : {})}
      />
    );
  }

  if (status.type === "ready" && events.length === 0) {
    return (
      <EmptyState
        variant={emptyVariant}
        title={emptyTitle}
        {...(emptyDescription !== undefined ? { description: emptyDescription } : {})}
        {...(className !== undefined ? { className } : {})}
      />
    );
  }

  const groups =
    status.type === "ready" ? groupActivityEventsByDay(events, timeZone, locale, now) : [];

  return (
    <div className={["lifeos-activity-feed", className].filter(Boolean).join(" ")}>
      {status.type === "loading" ? (
        <>
          {/* Skeleton is aria-hidden by design; this is what actually announces loading. */}
          <LiveRegion message={`Loading ${label}…`} />
          <ul aria-hidden="true" className="lifeos-activity-feed__loading">
            {Array.from({ length: LOADING_ROW_COUNT }, (_unused, index) => (
              <li key={index} className="lifeos-activity-feed__event">
                <SkeletonText lines={1} />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <ol aria-label={label} className="lifeos-activity-feed__groups">
          {groups.map((group) => (
            <li key={group.date} className="lifeos-activity-feed__group">
              {groupHeadingLevel === undefined ? (
                <Text weight="semibold" size="sm" className="lifeos-activity-feed__group-label">
                  {group.label}
                </Text>
              ) : (
                <Heading
                  level={groupHeadingLevel}
                  size="sm"
                  className="lifeos-activity-feed__group-label"
                >
                  {group.label}
                </Heading>
              )}

              <ul className="lifeos-activity-feed__events">
                {group.events.map((event) => {
                  const relative = formatRelativeCommentTime(event.createdAt, locale, now);
                  const absolute = formatAbsoluteCommentTime(event.createdAt, locale, timeZone);

                  return (
                    <li key={event.id} className="lifeos-activity-feed__event">
                      {event.icon ? (
                        <Icon
                          icon={event.icon}
                          decorative
                          size="sm"
                          className="lifeos-activity-feed__icon"
                        />
                      ) : null}

                      <Text size="sm" className="lifeos-activity-feed__sentence">
                        <Text weight="semibold" size="sm" inline>
                          {event.actorName}
                        </Text>{" "}
                        {event.action}{" "}
                        {event.object ? (
                          <Link href={event.object.href} inline>
                            {event.object.label}
                          </Link>
                        ) : (
                          <Text tone="secondary" size="sm" inline>
                            a deleted item
                          </Text>
                        )}
                      </Text>

                      <time
                        dateTime={event.createdAt}
                        title={absolute}
                        aria-label={absolute}
                        className="lifeos-activity-feed__time"
                      >
                        {relative}
                      </time>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
      )}

      {pagination ? (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onPageChange={pagination.onPageChange}
          label={`${label} pagination`}
        />
      ) : null}
    </div>
  );
}
