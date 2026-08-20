import { Clock3 } from "lucide-react";

import { InlineMessage } from "@components/feedback";
import { Badge, Button, Heading, Icon, Link, Surface, Text } from "@components/ui";

import {
  formatTodayScheduleTime,
  type TodayScheduleBlock as TodayScheduleBlockModel,
  type TodayScheduleBlockState,
} from "../model/todaySchedule";

const STATE_LABEL: Readonly<Record<TodayScheduleBlockState, string>> = Object.freeze({
  current: "Current",
  next: "Next",
  upcoming: "Upcoming",
  completed: "Completed",
});

const STATE_TONE = Object.freeze({
  current: "primary",
  next: "neutral",
  upcoming: "neutral",
  completed: "success",
} as const);

export interface TodayScheduleBlockProps {
  readonly block: TodayScheduleBlockModel;
  readonly locale: string;
  readonly onStartFocus: (blockId: string) => void;
  readonly starting?: boolean;
  readonly startDisabled?: boolean;
  readonly startDisabledReason?: string;
}

/** One responsive, actionable Time Block row inside `TodaySchedule`. */
export function TodayScheduleBlock({
  block,
  locale,
  onStartFocus,
  starting = false,
  startDisabled = false,
  startDisabledReason,
}: TodayScheduleBlockProps) {
  const canStart = block.state === "current" || block.state === "next";
  const conflicts = block.conflictDescriptions ?? [];
  const timeRange = `${formatTodayScheduleTime(block.startTime, locale)} – ${formatTodayScheduleTime(block.endTime, locale)}`;

  return (
    <Surface
      as="li"
      padding="md"
      interactive
      className={[
        "lifeos-today-schedule-block",
        `lifeos-today-schedule-block--${block.state}`,
        conflicts.length > 0 && "lifeos-today-schedule-block--conflict",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="lifeos-today-schedule-block__time">
        <Icon icon={Clock3} decorative size="sm" />
        <span>{timeRange}</span>
      </div>

      <div className="lifeos-today-schedule-block__content">
        <div className="lifeos-today-schedule-block__heading-row">
          <Heading level={3} size="sm">
            <Link href={block.href} quiet>
              {block.title}
            </Link>
          </Heading>
          <Badge tone={STATE_TONE[block.state]}>{STATE_LABEL[block.state]}</Badge>
          {conflicts.length > 0 ? <Badge tone="danger">Conflict</Badge> : null}
        </div>

        {block.project || block.category ? (
          <div className="lifeos-today-schedule-block__context">
            {block.project ? (
              <Link href={block.project.href} inline>
                {block.project.name}
              </Link>
            ) : null}
            {block.project && block.category ? <span aria-hidden="true">·</span> : null}
            {block.category ? (
              <Text inline tone="secondary" size="sm">
                {block.category}
              </Text>
            ) : null}
          </div>
        ) : null}

        {conflicts.map((description, index) => (
          <InlineMessage
            key={`${block.id}-conflict-${index}`}
            tone="warning"
            className="lifeos-today-schedule-block__conflict"
          >
            {description}
          </InlineMessage>
        ))}
      </div>

      <div className="lifeos-today-schedule-block__actions">
        {canStart ? (
          <Button
            size="sm"
            variant="primary"
            loading={starting}
            loadingLabel={`Starting focus for ${block.title}`}
            disabled={startDisabled}
            {...(startDisabled && startDisabledReason ? { title: startDisabledReason } : {})}
            onClick={() => onStartFocus(block.id)}
          >
            Start focus
          </Button>
        ) : null}
        <Link href={block.href}>Open</Link>
      </div>
    </Surface>
  );
}
