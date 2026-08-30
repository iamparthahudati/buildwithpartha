import { Archive, Bell, BellOff, CalendarClock, Pencil, Play, RotateCcw } from "lucide-react";

import { EmptyState, ErrorState } from "@components/feedback";
import { Badge, Button, Heading, Icon, SkeletonCard, Text } from "@components/ui";
import type { LocalDate } from "@lib/localDateTime";

import {
  formatHabitCadence,
  formatHabitRate,
  formatHabitReminderTime,
  formatHabitTarget,
  type Habit,
  type HabitStreakStatistics,
} from "../model/habit";
import { HabitEntryControl } from "./HabitEntryControl";
import "./habit-card.css";

export interface HabitCardProps {
  readonly habit?: Habit;
  readonly localDate?: LocalDate;
  readonly completedCount?: number;
  readonly statistics?: HabitStreakStatistics;
  readonly paused?: boolean;
  readonly loading?: boolean;
  readonly error?: string;
  readonly pendingAction?: "entry" | "pause" | "resume" | "archive" | "restore";
  readonly locale?: string;
  readonly onRetry?: () => void;
  readonly onSelect?: (habit: Habit) => void;
  readonly onIncrement?: (habit: Habit, localDate: LocalDate) => void;
  readonly onDecrement?: (habit: Habit, localDate: LocalDate) => void;
  readonly onEdit?: (habit: Habit) => void;
  readonly onPause?: (habit: Habit) => void;
  readonly onResume?: (habit: Habit) => void;
  readonly onArchive?: (habit: Habit) => void;
  readonly onRestore?: (habit: Habit) => void;
  readonly className?: string;
}

export function HabitCard({
  habit,
  localDate,
  completedCount = 0,
  statistics,
  paused = false,
  loading = false,
  error,
  pendingAction,
  locale = "en-US",
  onRetry,
  onSelect,
  onIncrement,
  onDecrement,
  onEdit,
  onPause,
  onResume,
  onArchive,
  onRestore,
  className,
}: HabitCardProps) {
  if (loading) return <SkeletonCard {...(className ? { className } : {})} />;
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
  if (!habit) {
    return (
      <EmptyState
        variant="first-use"
        title="No Habit selected"
        description="Choose a Habit to view its current entry and history."
        {...(className ? { className } : {})}
      />
    );
  }

  const state = habit.archived ? "Archived" : paused ? "Paused" : "Active";
  const stateTone = habit.archived ? "neutral" : paused ? "warning" : "success";
  const color = habit.color ?? "blue";

  return (
    <article
      aria-label={`Habit: ${habit.name}`}
      className={[
        "habit-card",
        `habit-card--color-${color}`,
        habit.archived && "is-archived",
        paused && "is-paused",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="habit-card__header">
        <span className="habit-card__accent" aria-hidden="true" />
        <div className="habit-card__heading">
          {onSelect ? (
            <button
              type="button"
              className="habit-card__title-button"
              onClick={() => onSelect(habit)}
            >
              <Heading level={3} size="md">
                {habit.name}
              </Heading>
            </button>
          ) : (
            <Heading level={3} size="md">
              {habit.name}
            </Heading>
          )}
          <div className="habit-card__badges">
            <Badge tone={stateTone}>{state}</Badge>
            <Badge tone="info">{formatHabitCadence(habit.cadence)}</Badge>
          </div>
        </div>
        {habit.description ? (
          <Text tone="muted" size="sm">
            {habit.description}
          </Text>
        ) : null}
      </header>

      <dl className="habit-card__facts">
        <div>
          <dt>Target</dt>
          <dd>{formatHabitTarget(habit)}</dd>
        </div>
        <div>
          <dt>Timezone</dt>
          <dd>{habit.timeZone.replaceAll("_", " ")}</dd>
        </div>
        <div>
          <dt>Reminder</dt>
          <dd className="habit-card__fact-with-icon">
            <Icon icon={habit.reminderEnabled ? Bell : BellOff} decorative size="sm" />
            {habit.reminderEnabled && habit.reminderTime
              ? formatHabitReminderTime(habit.reminderTime, locale)
              : "Off"}
          </dd>
        </div>
      </dl>

      {statistics ? (
        <div className="habit-card__statistics" aria-label="Habit statistics">
          <div>
            <strong>{statistics.currentStreak}</strong>
            <span>Current streak</span>
          </div>
          <div>
            <strong>{statistics.longestStreak}</strong>
            <span>Longest streak</span>
          </div>
          <div>
            <strong>{formatHabitRate(statistics.completionRate, locale)}</strong>
            <span>Completion rate</span>
          </div>
        </div>
      ) : null}

      {localDate ? (
        <HabitEntryControl
          habit={habit}
          localDate={localDate}
          completedCount={completedCount}
          paused={paused}
          pending={pendingAction === "entry"}
          {...(onIncrement ? { onIncrement } : {})}
          {...(onDecrement ? { onDecrement } : {})}
        />
      ) : null}

      <footer className="habit-card__actions">
        {onEdit ? (
          <Button size="sm" variant="ghost" iconStart={Pencil} onClick={() => onEdit(habit)}>
            Edit
          </Button>
        ) : null}
        {!habit.archived && !paused && onPause ? (
          <Button
            size="sm"
            variant="secondary"
            iconStart={CalendarClock}
            loading={pendingAction === "pause"}
            loadingLabel="Pausing Habit…"
            onClick={() => onPause(habit)}
          >
            Pause
          </Button>
        ) : null}
        {!habit.archived && paused && onResume ? (
          <Button
            size="sm"
            variant="secondary"
            iconStart={Play}
            loading={pendingAction === "resume"}
            loadingLabel="Resuming Habit…"
            onClick={() => onResume(habit)}
          >
            Resume
          </Button>
        ) : null}
        {!habit.archived && onArchive ? (
          <Button
            size="sm"
            variant="ghost"
            iconStart={Archive}
            loading={pendingAction === "archive"}
            loadingLabel="Archiving Habit…"
            onClick={() => onArchive(habit)}
          >
            Archive
          </Button>
        ) : null}
        {habit.archived && onRestore ? (
          <Button
            size="sm"
            variant="secondary"
            iconStart={RotateCcw}
            loading={pendingAction === "restore"}
            loadingLabel="Restoring Habit…"
            onClick={() => onRestore(habit)}
          >
            Restore
          </Button>
        ) : null}
      </footer>
    </article>
  );
}
