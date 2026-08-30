import { Minus, Plus } from "lucide-react";

import { InlineMessage } from "@components/feedback";
import { Button, IconButton, LiveRegion, ProgressBar, Skeleton, Text } from "@components/ui";
import { formatLocalDate, type LocalDate } from "@lib/localDateTime";

import type { Habit } from "../model/habit";
import "./habit-entry-control.css";

export interface HabitEntryControlProps {
  readonly habit: Habit;
  readonly localDate: LocalDate;
  readonly completedCount: number;
  readonly locale?: string;
  readonly paused?: boolean;
  readonly loading?: boolean;
  readonly pending?: boolean;
  readonly error?: string;
  readonly disabled?: boolean;
  readonly onIncrement?: (habit: Habit, localDate: LocalDate) => void;
  readonly onDecrement?: (habit: Habit, localDate: LocalDate) => void;
  readonly onRetry?: () => void;
  readonly className?: string;
}

export function HabitEntryControl({
  habit,
  localDate,
  completedCount,
  locale = "en-US",
  paused = false,
  loading = false,
  pending = false,
  error,
  disabled = false,
  onIncrement,
  onDecrement,
  onRetry,
  className,
}: HabitEntryControlProps) {
  const formattedDate = formatLocalDate(localDate, locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const inactive = disabled || paused || habit.archived;
  const targetMet = completedCount >= habit.targetCount;
  const valueText = `${completedCount} of ${habit.targetCount} completions logged`;

  if (loading) {
    return (
      <div
        className={["habit-entry-control", className].filter(Boolean).join(" ")}
        aria-label={`Loading ${habit.name} entry for ${formattedDate}`}
      >
        <LiveRegion message={`Loading ${habit.name} entry…`} />
        <Skeleton shape="block" height="5rem" />
      </div>
    );
  }

  return (
    <section
      aria-label={`${habit.name} entry for ${formattedDate}`}
      className={[
        "habit-entry-control",
        targetMet && "is-complete",
        inactive && "is-disabled",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="habit-entry-control__heading">
        <Text size="sm" weight="medium">
          {formattedDate}
        </Text>
        <Text size="sm" weight="bold" className="habit-entry-control__count">
          {completedCount} / {habit.targetCount}
        </Text>
      </div>

      <ProgressBar
        label={`${habit.name} completion for ${formattedDate}`}
        labelHidden
        value={completedCount}
        max={habit.targetCount}
        valueText={valueText}
        tone={targetMet ? "success" : "primary"}
        size="sm"
      />

      {error ? (
        <div className="habit-entry-control__message">
          <InlineMessage tone="danger" announce="alert">
            {error}
          </InlineMessage>
          {onRetry ? (
            <Button size="sm" variant="secondary" onClick={onRetry}>
              Try again
            </Button>
          ) : null}
        </div>
      ) : paused ? (
        <InlineMessage tone="warning">This Habit is paused on this date.</InlineMessage>
      ) : habit.archived ? (
        <InlineMessage tone="info">Restore this Habit before logging entries.</InlineMessage>
      ) : targetMet ? (
        <InlineMessage tone="success">Target met for this period.</InlineMessage>
      ) : null}

      <div className="habit-entry-control__actions">
        <IconButton
          icon={Minus}
          label={`Remove one completion from ${habit.name} on ${formattedDate}`}
          size="md"
          variant="secondary"
          disabled={inactive || pending || completedCount === 0 || !onDecrement}
          onClick={() => onDecrement?.(habit, localDate)}
        />
        <Button
          variant="primary"
          size="sm"
          iconStart={Plus}
          loading={pending}
          loadingLabel={`Logging ${habit.name}…`}
          disabled={inactive || !onIncrement}
          onClick={() => onIncrement?.(habit, localDate)}
        >
          Log habit
        </Button>
      </div>
    </section>
  );
}
