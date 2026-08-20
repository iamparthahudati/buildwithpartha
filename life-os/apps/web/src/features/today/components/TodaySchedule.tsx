import { CalendarPlus } from "lucide-react";

import { EmptyState, ErrorState } from "@components/feedback";
import { Button, Link, Skeleton, Surface, VisuallyHidden } from "@components/ui";
import { localTimeToMinutes } from "@lib/localDateTime";

import type { TodayScheduleState } from "../model/todaySchedule";
import { TodayScheduleBlock } from "./TodayScheduleBlock";
import "./today-schedule.css";

export interface TodayScheduleProps {
  readonly state: TodayScheduleState;
  readonly locale: string;
  readonly onAddTimeBlock: () => void;
  readonly onStartFocus: (blockId: string) => void;
  readonly onRetry?: () => void;
  readonly timeBlocksHref?: string;
  readonly startingBlockId?: string;
  readonly startDisabledReason?: string;
  readonly className?: string;
}

/**
 * Today's chronological Time Block projection (LOS-0610).
 *
 * It owns presentation and action routing only. LOS-0615 maps the Today API
 * response into this contract and later Time Block/Focus tickets own the
 * canonical mutations.
 */
export function TodaySchedule({
  state,
  locale,
  onAddTimeBlock,
  onStartFocus,
  onRetry,
  timeBlocksHref = "/life-os/app/time-blocks",
  startingBlockId,
  startDisabledReason,
  className,
}: TodayScheduleProps) {
  const resolvedState =
    state.type === "ready" && state.blocks.length === 0 ? { type: "empty" as const } : state;

  return (
    <Surface
      as="section"
      title="Today's schedule"
      titleLevel={2}
      padding="lg"
      titleAction={
        <Button size="sm" variant="secondary" iconStart={CalendarPlus} onClick={onAddTimeBlock}>
          Add time block
        </Button>
      }
      className={["lifeos-today-schedule", className].filter(Boolean).join(" ")}
    >
      {resolvedState.type === "loading" ? (
        <div
          className="lifeos-today-schedule__loading"
          role="status"
          aria-label="Loading today's schedule"
          aria-busy="true"
        >
          <VisuallyHidden>Loading today's schedule.</VisuallyHidden>
          {[0, 1, 2].map((row) => (
            <div key={row} className="lifeos-today-schedule__skeleton-row" aria-hidden="true">
              <Skeleton width="6.5rem" />
              <Skeleton width="55%" />
              <Skeleton width="5.5rem" />
            </div>
          ))}
        </div>
      ) : null}

      {resolvedState.type === "empty" ? (
        <EmptyState
          variant="first-use"
          icon={CalendarPlus}
          title="Plan part of today"
          description="Add a Time Block to reserve time for what matters."
          primaryAction={<Button onClick={onAddTimeBlock}>Add time block</Button>}
        />
      ) : null}

      {resolvedState.type === "error" ? (
        <ErrorState
          scope="region"
          title="Today's schedule couldn't load."
          description={resolvedState.message}
          {...(onRetry ? { onRetry } : {})}
          action={<Link href={timeBlocksHref}>Open Time Blocks</Link>}
        />
      ) : null}

      {resolvedState.type === "ready" ? (
        <>
          <ol className="lifeos-today-schedule__list" aria-label="Time Blocks scheduled today">
            {[...resolvedState.blocks]
              .sort(
                (first, second) =>
                  localTimeToMinutes(first.startTime) - localTimeToMinutes(second.startTime),
              )
              .map((block) => (
                <TodayScheduleBlock
                  key={block.id}
                  block={block}
                  locale={locale}
                  onStartFocus={onStartFocus}
                  starting={startingBlockId === block.id}
                  startDisabled={
                    startingBlockId !== block.id &&
                    (startingBlockId !== undefined || startDisabledReason !== undefined)
                  }
                  {...(startDisabledReason ? { startDisabledReason } : {})}
                />
              ))}
          </ol>
          <div className="lifeos-today-schedule__footer">
            <Link href={timeBlocksHref}>Open Time Blocks</Link>
          </div>
        </>
      ) : null}
    </Surface>
  );
}
