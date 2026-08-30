import { Archive, Check, Pencil, Play, RotateCcw } from "lucide-react";

import { ErrorState } from "@components/feedback";
import { Badge, Button, IconButton, ProgressBar, Skeleton, Text } from "@components/ui";
import type { LocalDate } from "@lib/localDateTime";

import { formatHabitTarget, type Habit } from "../model/habit";
import "./habit-row.css";

export interface HabitRowProps {
  readonly habit?: Habit;
  readonly localDate?: LocalDate;
  readonly completedCount?: number;
  readonly paused?: boolean;
  readonly loading?: boolean;
  readonly error?: string;
  readonly disabled?: boolean;
  readonly onRetry?: () => void;
  readonly onSelect?: (habit: Habit) => void;
  readonly onLog?: (habit: Habit, localDate: LocalDate) => void;
  readonly onEdit?: (habit: Habit) => void;
  readonly onPause?: (habit: Habit) => void;
  readonly onResume?: (habit: Habit) => void;
  readonly onArchive?: (habit: Habit) => void;
  readonly onRestore?: (habit: Habit) => void;
  readonly className?: string;
}

export function HabitRow({
  habit,
  localDate,
  completedCount = 0,
  paused = false,
  loading = false,
  error,
  disabled = false,
  onRetry,
  onSelect,
  onLog,
  onEdit,
  onPause,
  onResume,
  onArchive,
  onRestore,
  className,
}: HabitRowProps) {
  if (loading) {
    return <Skeleton shape="block" height="5rem" {...(className ? { className } : {})} />;
  }
  if (error) {
    return (
      <ErrorState
        scope="region"
        title="This Habit couldn't load"
        description={error}
        {...(onRetry ? { onRetry } : {})}
        {...(className ? { className } : {})}
      />
    );
  }
  if (!habit) return null;

  const state = habit.archived ? "Archived" : paused ? "Paused" : "Active";
  const stateTone = habit.archived ? "neutral" : paused ? "warning" : "success";
  const inactive = disabled || paused || habit.archived;

  return (
    <div
      aria-label={`Habit row: ${habit.name}`}
      className={["habit-row", inactive && "is-disabled", className].filter(Boolean).join(" ")}
    >
      <button
        type="button"
        className="habit-row__identity"
        disabled={!onSelect}
        onClick={() => onSelect?.(habit)}
      >
        <Text weight="semibold">{habit.name}</Text>
        <Text size="xs" tone="muted">
          {formatHabitTarget(habit)}
        </Text>
      </button>

      <Badge tone={stateTone}>{state}</Badge>

      <div className="habit-row__progress">
        <ProgressBar
          label={`${habit.name} completion`}
          labelHidden
          value={completedCount}
          max={habit.targetCount}
          valueText={`${completedCount} of ${habit.targetCount} completions logged`}
          size="sm"
          tone={completedCount >= habit.targetCount ? "success" : "primary"}
        />
        <Text size="xs" tone="muted">
          {completedCount} / {habit.targetCount}
        </Text>
      </div>

      <div className="habit-row__actions">
        {localDate && onLog ? (
          <Button
            size="sm"
            variant="primary"
            iconStart={Check}
            disabled={inactive}
            onClick={() => onLog(habit, localDate)}
          >
            Log habit
          </Button>
        ) : null}
        {onEdit ? (
          <IconButton
            icon={Pencil}
            label={`Edit ${habit.name}`}
            size="sm"
            variant="ghost"
            onClick={() => onEdit(habit)}
          />
        ) : null}
        {!habit.archived && !paused && onPause ? (
          <Button size="sm" variant="ghost" onClick={() => onPause(habit)}>
            Pause
          </Button>
        ) : null}
        {!habit.archived && paused && onResume ? (
          <IconButton
            icon={Play}
            label={`Resume ${habit.name}`}
            size="sm"
            variant="ghost"
            onClick={() => onResume(habit)}
          />
        ) : null}
        {!habit.archived && onArchive ? (
          <IconButton
            icon={Archive}
            label={`Archive ${habit.name}`}
            size="sm"
            variant="ghost"
            onClick={() => onArchive(habit)}
          />
        ) : null}
        {habit.archived && onRestore ? (
          <IconButton
            icon={RotateCcw}
            label={`Restore ${habit.name}`}
            size="sm"
            variant="ghost"
            onClick={() => onRestore(habit)}
          />
        ) : null}
      </div>
    </div>
  );
}
