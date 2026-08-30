import { Minus, Plus } from "lucide-react";

import { InlineMessage } from "@components/feedback";
import { Button, Link, Surface, Text } from "@components/ui";
import type { LocalDate } from "@lib/localDateTime";

import "./today-habits.css";

export interface TodayHabitItem {
  readonly id: string;
  readonly name: string;
  readonly cadence: "DAILY" | "WEEKLY" | "MONTHLY";
  readonly targetCount: number;
  readonly completedCount: number;
  readonly localDate: LocalDate;
  readonly timeZone: string;
  readonly paused: boolean;
  readonly currentStreak: number;
}

export type TodayHabitsStatus =
  | { readonly type: "loading" }
  | { readonly type: "ready"; readonly habits: readonly TodayHabitItem[] }
  | { readonly type: "error"; readonly message: string };

export interface TodayHabitsProps {
  readonly status: TodayHabitsStatus;
  readonly habitsHref: string;
  readonly onSetCount: (habit: TodayHabitItem, count: number) => void;
  readonly pendingHabitId?: string | null;
  readonly mutationError?: string | null;
  readonly onRetry?: () => void;
  readonly disabled?: boolean;
  readonly className?: string;
}

function cadenceLabel(cadence: TodayHabitItem["cadence"]): string {
  return cadence === "DAILY" ? "Daily" : cadence === "WEEKLY" ? "Weekly" : "Monthly";
}

/** Compact Today projection of canonical Habit entries. */
export function TodayHabits({
  status,
  habitsHref,
  onSetCount,
  pendingHabitId = null,
  mutationError = null,
  onRetry,
  disabled = false,
  className,
}: TodayHabitsProps) {
  return (
    <Surface
      as="section"
      title="Habits"
      titleLevel={2}
      titleAction={
        <Link href={habitsHref} quiet>
          Open Habits
        </Link>
      }
      className={["lifeos-today-habits", className].filter(Boolean).join(" ")}
    >
      {status.type === "loading" ? (
        <div className="lifeos-today-habits__loading" role="status">
          Loading Habits…
        </div>
      ) : status.type === "error" ? (
        <InlineMessage tone="danger" announce="alert">
          {status.message}
          {onRetry ? (
            <Button variant="link" size="sm" onClick={onRetry}>
              Retry Habits
            </Button>
          ) : null}
        </InlineMessage>
      ) : status.habits.length === 0 ? (
        <div className="lifeos-today-habits__empty">
          <Text weight="semibold">No active Habits</Text>
          <Text tone="secondary" size="sm">
            Add a Habit when you want to track a repeatable behavior.
          </Text>
          <Link href={habitsHref}>Add Habit</Link>
        </div>
      ) : (
        <ul className="lifeos-today-habits__list">
          {status.habits.map((habit) => {
            const pending = pendingHabitId === habit.id;
            const metTarget = habit.completedCount >= habit.targetCount;
            return (
              <li key={habit.id} className="lifeos-today-habits__item">
                <div className="lifeos-today-habits__details">
                  <Link href={`${habitsHref}/${encodeURIComponent(habit.id)}`}>{habit.name}</Link>
                  <Text tone="secondary" size="xs">
                    {cadenceLabel(habit.cadence)} · {habit.completedCount} of {habit.targetCount} on{" "}
                    {habit.localDate}
                    {habit.currentStreak > 0
                      ? ` · ${habit.currentStreak} ${habit.currentStreak === 1 ? "period" : "periods"}`
                      : ""}
                  </Text>
                  {habit.paused ? (
                    <Text tone="muted" size="xs">
                      Paused for this local date ({habit.timeZone}).
                    </Text>
                  ) : metTarget ? (
                    <Text tone="success" size="xs">
                      Target met
                    </Text>
                  ) : null}
                </div>
                <div className="lifeos-today-habits__controls">
                  <Button
                    variant="secondary"
                    size="sm"
                    iconStart={Minus}
                    aria-label={`Remove one ${habit.name} completion`}
                    disabled={disabled || pending || habit.paused || habit.completedCount === 0}
                    onClick={() => onSetCount(habit, Math.max(0, habit.completedCount - 1))}
                  >
                    Remove
                  </Button>
                  <Button
                    size="sm"
                    iconStart={Plus}
                    aria-label={`Add one ${habit.name} completion`}
                    loading={pending}
                    loadingLabel={`Saving ${habit.name}`}
                    disabled={disabled || habit.paused}
                    onClick={() => onSetCount(habit, habit.completedCount + 1)}
                  >
                    Log
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {mutationError ? (
        <InlineMessage tone="danger" announce="alert">
          {mutationError}
        </InlineMessage>
      ) : null}
    </Surface>
  );
}
