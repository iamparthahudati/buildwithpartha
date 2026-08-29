import { Clock, Plus } from "lucide-react";
import { Button, Icon, Skeleton, Surface, Text } from "@components/ui";
import { EmptyState, ErrorState } from "@components/feedback";
import type { TimeBlock } from "../model/timeBlock";
import { TimeBlockRow } from "./TimeBlockRow";
import "./upcoming-blocks.css";

export type UpcomingBlocksStatus = "ready" | "loading" | "empty" | "error";

export interface UpcomingBlocksProps {
  readonly blocks?: readonly TimeBlock[];
  readonly status?: UpcomingBlocksStatus;
  readonly title?: string;
  readonly locale?: string;
  readonly timeZone?: string;
  readonly now?: Date;
  readonly onStartFocus?: (block: TimeBlock) => void;
  readonly onComplete?: (block: TimeBlock) => void;
  readonly onEdit?: (block: TimeBlock) => void;
  readonly onDuplicate?: (block: TimeBlock) => void;
  readonly onDelete?: (block: TimeBlock) => void;
  readonly onCreateBlock?: () => void;
  readonly onRetry?: () => void;
  readonly className?: string;
}

export function UpcomingBlocks({
  blocks = [],
  status = "ready",
  title = "Upcoming time blocks",
  locale = "en-US",
  timeZone,
  now,
  onStartFocus,
  onComplete,
  onEdit,
  onDuplicate,
  onDelete,
  onCreateBlock,
  onRetry,
  className = "",
}: UpcomingBlocksProps) {
  if (status === "loading") {
    return (
      <Surface as="section" className={`upcoming-blocks ${className}`.trim()} aria-label={title}>
        <div className="upcoming-blocks__header">
          <Skeleton width="160px" height="24px" />
        </div>
        <div className="upcoming-blocks__list">
          <Skeleton width="100%" height="64px" />
          <Skeleton width="100%" height="64px" />
        </div>
      </Surface>
    );
  }

  if (status === "error") {
    return (
      <Surface as="section" className={`upcoming-blocks ${className}`.trim()}>
        <ErrorState
          title="Unable to load upcoming blocks"
          description="There was a problem loading your scheduled time blocks."
          {...(onRetry ? { onRetry } : {})}
          scope="region"
        />
      </Surface>
    );
  }

  const effectiveStatus = status === "empty" || blocks.length === 0 ? "empty" : "ready";

  if (effectiveStatus === "empty") {
    return (
      <Surface as="section" className={`upcoming-blocks ${className}`.trim()} aria-label={title}>
        <div className="upcoming-blocks__header">
          <div className="upcoming-blocks__title-group">
            <Icon icon={Clock} decorative size="md" className="upcoming-blocks__icon" />
            <Text size="md" weight="medium">
              {title}
            </Text>
          </div>
          {onCreateBlock && (
            <Button variant="secondary" size="sm" onClick={onCreateBlock}>
              <Icon icon={Plus} decorative size="sm" />
              Add block
            </Button>
          )}
        </div>
        <EmptyState
          variant="first-use"
          icon={Clock}
          title="No upcoming blocks"
          description="You have no more time blocks scheduled for today."
          primaryAction={
            onCreateBlock ? (
              <Button variant="primary" size="sm" onClick={onCreateBlock}>
                Schedule time block
              </Button>
            ) : undefined
          }
        />
      </Surface>
    );
  }

  return (
    <Surface as="section" className={`upcoming-blocks ${className}`.trim()} aria-label={title}>
      <div className="upcoming-blocks__header">
        <div className="upcoming-blocks__title-group">
          <Icon icon={Clock} decorative size="md" className="upcoming-blocks__icon" />
          <Text size="md" weight="medium">
            {title}
          </Text>
        </div>
        {onCreateBlock && (
          <Button variant="secondary" size="sm" onClick={onCreateBlock}>
            <Icon icon={Plus} decorative size="sm" />
            Add block
          </Button>
        )}
      </div>

      <div className="upcoming-blocks__list" role="list">
        {blocks.map((block) => (
          <div key={block.id} role="listitem" className="upcoming-blocks__item">
            <TimeBlockRow
              timeBlock={block}
              locale={locale}
              {...(timeZone ? { timeZone } : {})}
              {...(now ? { now } : {})}
              {...(onStartFocus ? { onStartFocus: () => onStartFocus(block) } : {})}
              {...(onComplete ? { onComplete: () => onComplete(block) } : {})}
              {...(onEdit ? { onEdit: () => onEdit(block) } : {})}
              {...(onDuplicate ? { onDuplicate: () => onDuplicate(block) } : {})}
              {...(onDelete ? { onDelete: () => onDelete(block) } : {})}
            />
          </div>
        ))}
      </div>
    </Surface>
  );
}
