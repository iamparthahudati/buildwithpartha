import { ArrowLeft, Pencil } from "lucide-react";

import { ErrorState, InlineMessage } from "@components/feedback";
import { PageHeader, Tabs, type TabItem } from "@components/navigation";
import { Button, DateInput, Text } from "@components/ui";
import type { LocalDate } from "@lib/localDateTime";

import type { Habit, HabitHeatmapDay, HabitStatisticsWindow } from "../model/habit";
import { HabitCard } from "./HabitCard";
import { HabitHeatmap } from "./HabitHeatmap";
import { HabitStreakSummary } from "./HabitStreakSummary";
import "./habits-screen.css";

export type HabitDetailView = "overview" | "history" | "statistics";

export interface HabitDetailsScreenProps {
  readonly habit?: Habit;
  readonly date: LocalDate;
  readonly from: LocalDate;
  readonly to: LocalDate;
  readonly view: HabitDetailView;
  readonly completedCount: number;
  readonly paused: boolean;
  readonly days: readonly HabitHeatmapDay[];
  readonly statistics?: HabitStatisticsWindow;
  readonly loading?: boolean;
  readonly historyLoading?: boolean;
  readonly error?: string;
  readonly historyError?: string;
  readonly entryError?: string;
  readonly mutationMessage?: string;
  readonly entryPending?: boolean;
  readonly onBack: () => void;
  readonly onRetry: () => void;
  readonly onHistoryRetry: () => void;
  readonly onDateChange: (date: LocalDate) => void;
  readonly onRangeChange: (from: LocalDate, to: LocalDate) => void;
  readonly onViewChange: (view: HabitDetailView) => void;
  readonly onIncrement: (habit: Habit, date: LocalDate) => void;
  readonly onDecrement: (habit: Habit, date: LocalDate) => void;
  readonly onEdit: (habit: Habit) => void;
  readonly onPause: (habit: Habit) => void;
  readonly onResume: (habit: Habit) => void;
  readonly onArchive: (habit: Habit) => void;
  readonly onRestore: (habit: Habit) => void;
}

export function HabitDetailsScreen({
  habit,
  date,
  from,
  to,
  view,
  completedCount,
  paused,
  days,
  statistics,
  loading = false,
  historyLoading = false,
  error,
  historyError,
  entryError,
  mutationMessage,
  entryPending = false,
  onBack,
  onRetry,
  onHistoryRetry,
  onDateChange,
  onRangeChange,
  onViewChange,
  onIncrement,
  onDecrement,
  onEdit,
  onPause,
  onResume,
  onArchive,
  onRestore,
}: HabitDetailsScreenProps) {
  if (loading) {
    return (
      <div className="habits-screen">
        <HabitCard loading />
      </div>
    );
  }
  if (error || !habit) {
    return (
      <div className="habits-screen">
        <Button variant="ghost" iconStart={ArrowLeft} onClick={onBack}>
          Back to Habits
        </Button>
        <ErrorState
          scope="region"
          title="This Habit couldn't load"
          description={error ?? "The Habit may no longer be available."}
          onRetry={onRetry}
        />
      </div>
    );
  }

  const historyPanel = (
    <HabitHeatmap
      status={historyLoading ? "loading" : historyError ? "error" : days.length ? "ready" : "empty"}
      days={days}
      onRetry={onHistoryRetry}
    />
  );
  const statisticsPanel = (
    <HabitStreakSummary
      status={
        historyLoading
          ? { type: "loading" }
          : historyError
            ? { type: "error", message: historyError, onRetry: onHistoryRetry }
            : statistics && statistics.eligiblePeriods > 0
              ? { type: "ready", statistics }
              : { type: "empty" }
      }
      cadenceLabel={
        habit.cadence === "DAILY" ? "days" : habit.cadence === "WEEKLY" ? "weeks" : "months"
      }
    />
  );
  const tabs: readonly TabItem[] = [
    {
      id: "overview",
      label: "Overview",
      panel: (
        <HabitCard
          habit={habit}
          localDate={date}
          completedCount={completedCount}
          {...(statistics ? { statistics } : {})}
          paused={paused}
          {...(entryPending ? { pendingAction: "entry" as const } : {})}
          onIncrement={onIncrement}
          onDecrement={onDecrement}
          onEdit={onEdit}
          onPause={onPause}
          onResume={onResume}
          onArchive={onArchive}
          onRestore={onRestore}
        />
      ),
    },
    { id: "history", label: "History", panel: historyPanel },
    { id: "statistics", label: "Statistics", panel: statisticsPanel },
  ];

  return (
    <div className="habits-screen">
      <PageHeader
        title={habit.name}
        description="Habit detail, dated history, and pause-aware statistics."
        breadcrumbs={[
          { label: "Habits", href: "/life-os/app/habits" },
          { label: habit.name, href: `/life-os/app/habits/${habit.id}` },
        ]}
        primaryAction={
          <Button iconStart={Pencil} onClick={() => onEdit(habit)}>
            Edit Habit
          </Button>
        }
      />
      {mutationMessage ? (
        <InlineMessage tone="danger" announce="alert">
          {mutationMessage}
        </InlineMessage>
      ) : null}
      {entryError ? (
        <InlineMessage tone="danger" announce="alert">
          {entryError}
        </InlineMessage>
      ) : null}
      <div className="habits-screen__date-row">
        <DateInput
          label="Entry date"
          value={date}
          onChange={(event) => onDateChange(event.target.value)}
        />
        <Text size="sm" tone="muted">
          Entries stay on this local date even if the Habit's timezone changes later.
        </Text>
      </div>
      <div className="habits-screen__range" aria-label="Habit history date range">
        <DateInput
          label="History starts"
          value={from}
          max={to}
          onChange={(event) => onRangeChange(event.target.value, to)}
        />
        <DateInput
          label="History ends"
          value={to}
          min={from}
          onChange={(event) => onRangeChange(from, event.target.value)}
        />
      </div>
      <Tabs
        label="Habit details"
        items={tabs}
        selectedId={view}
        onSelectedIdChange={(id) => onViewChange(id as HabitDetailView)}
      />
    </div>
  );
}
