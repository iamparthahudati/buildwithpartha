import { Plus } from "lucide-react";

import { EmptyState, ErrorState, InlineMessage } from "@components/feedback";
import { PageHeader, Tabs, type TabItem } from "@components/navigation";
import { Button, DateInput, Heading, LiveRegion, SkeletonCard, Text } from "@components/ui";
import type { LocalDate } from "@lib/localDateTime";

import type { Habit } from "../model/habit";
import { HabitCard } from "./HabitCard";
import { HabitRow } from "./HabitRow";
import "./habits-screen.css";

export type HabitListView = "today" | "list" | "archived";

export interface HabitDayState {
  readonly count: number;
  readonly paused: boolean;
  readonly pending?: boolean;
  readonly error?: string;
}

export interface HabitsScreenProps {
  readonly habits: readonly Habit[];
  readonly archivedHabits: readonly Habit[];
  readonly dayStates: ReadonlyMap<string, HabitDayState>;
  readonly date: LocalDate;
  readonly view: HabitListView;
  readonly loading?: boolean;
  readonly error?: string;
  readonly mutationMessage?: string;
  readonly onRetry: () => void;
  readonly onDateChange: (date: LocalDate) => void;
  readonly onViewChange: (view: HabitListView) => void;
  readonly onAdd: () => void;
  readonly onSelect: (habit: Habit) => void;
  readonly onIncrement: (habit: Habit, date: LocalDate) => void;
  readonly onDecrement: (habit: Habit, date: LocalDate) => void;
  readonly onEdit: (habit: Habit) => void;
  readonly onPause: (habit: Habit) => void;
  readonly onResume: (habit: Habit) => void;
  readonly onArchive: (habit: Habit) => void;
  readonly onRestore: (habit: Habit) => void;
}

export function HabitsScreen({
  habits,
  archivedHabits,
  dayStates,
  date,
  view,
  loading = false,
  error,
  mutationMessage,
  onRetry,
  onDateChange,
  onViewChange,
  onAdd,
  onSelect,
  onIncrement,
  onDecrement,
  onEdit,
  onPause,
  onResume,
  onArchive,
  onRestore,
}: HabitsScreenProps) {
  const empty = (
    <EmptyState
      variant="first-use"
      title="No Habits here yet"
      description="Add a Habit when there is a repeatable behavior you want to track."
      primaryAction={
        <Button variant="primary" onClick={onAdd}>
          Add Habit
        </Button>
      }
    />
  );

  const todayPanel =
    habits.length === 0 ? (
      empty
    ) : (
      <section className="habits-screen__panel" aria-labelledby="habits-today-heading">
        <Heading level={2} size="md" id="habits-today-heading">
          Habits for this date
        </Heading>
        <div className="habits-screen__cards">
          {habits.map((habit) => {
            const state = dayStates.get(habit.id);
            return (
              <HabitCard
                key={habit.id}
                habit={habit}
                localDate={date}
                completedCount={state?.count ?? 0}
                paused={state?.paused ?? false}
                {...(state?.error ? { error: state.error } : {})}
                onRetry={onRetry}
                {...(state?.pending ? { pendingAction: "entry" as const } : {})}
                onSelect={onSelect}
                onIncrement={onIncrement}
                onDecrement={onDecrement}
                onEdit={onEdit}
                onPause={onPause}
                onResume={onResume}
                onArchive={onArchive}
              />
            );
          })}
        </div>
      </section>
    );

  const listPanel =
    habits.length === 0 ? (
      empty
    ) : (
      <section className="habits-screen__panel" aria-labelledby="habits-list-heading">
        <Heading level={2} size="md" id="habits-list-heading">
          Active Habits
        </Heading>
        <div className="habits-screen__rows">
          {habits.map((habit) => {
            const state = dayStates.get(habit.id);
            return (
              <HabitRow
                key={habit.id}
                habit={habit}
                localDate={date}
                completedCount={state?.count ?? 0}
                paused={state?.paused ?? false}
                disabled={state?.pending ?? false}
                {...(state?.error ? { error: state.error } : {})}
                onRetry={onRetry}
                onSelect={onSelect}
                onLog={onIncrement}
                onEdit={onEdit}
                onPause={onPause}
                onResume={onResume}
                onArchive={onArchive}
              />
            );
          })}
        </div>
      </section>
    );

  const archivedPanel =
    archivedHabits.length === 0 ? (
      <EmptyState
        variant="archived"
        title="No archived Habits"
        description="Archived Habits remain recoverable and will appear here."
      />
    ) : (
      <section className="habits-screen__panel" aria-labelledby="habits-archived-heading">
        <Heading level={2} size="md" id="habits-archived-heading">
          Archived Habits
        </Heading>
        <div className="habits-screen__rows">
          {archivedHabits.map((habit) => (
            <HabitRow
              key={habit.id}
              habit={habit}
              onSelect={onSelect}
              onEdit={onEdit}
              onRestore={onRestore}
            />
          ))}
        </div>
      </section>
    );

  const tabs: readonly TabItem[] = [
    { id: "today", label: "Today", panel: todayPanel },
    { id: "list", label: "All Habits", panel: listPanel },
    { id: "archived", label: "Archived", panel: archivedPanel },
  ];

  return (
    <div className="habits-screen">
      <PageHeader
        title="Habits"
        description="Track repeatable behaviors on the local dates where they happened."
        primaryAction={
          <Button variant="primary" iconStart={Plus} onClick={onAdd}>
            Add Habit
          </Button>
        }
      />

      <div className="habits-screen__date-row">
        <DateInput
          label="Habit date"
          value={date}
          onChange={(event) => onDateChange(event.target.value)}
        />
        <Text size="sm" tone="muted">
          Each Habit keeps this date in its own timezone. Changing a timezone never moves saved
          dates.
        </Text>
      </div>

      {mutationMessage ? (
        <InlineMessage tone="danger" announce="alert">
          {mutationMessage}
        </InlineMessage>
      ) : null}
      {loading ? (
        <div className="habits-screen__cards" aria-label="Loading Habits">
          <LiveRegion message="Loading Habits…" />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        <ErrorState
          scope="region"
          title="Habits couldn't load"
          description={error}
          onRetry={onRetry}
        />
      ) : (
        <Tabs
          label="Habit views"
          items={tabs}
          selectedId={view}
          onSelectedIdChange={(id) => onViewChange(id as HabitListView)}
        />
      )}
    </div>
  );
}
