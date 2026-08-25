import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, AlertTriangle, RotateCcw } from "lucide-react";

import { Alert, ConfirmDialog, EmptyState, ErrorState } from "@components/feedback";
import { PageHeader } from "@components/navigation";
import { Badge, Button, Heading, IconButton, Text, type BadgeTone } from "@components/ui";

import {
  formatMinutesToHours,
  type TaskAllocationValue,
  type WeekCapacitySummaryData,
  type WeekDayPlan,
  type WeeklyOutcome,
  type WeekPlanStatus,
  type WeekPlannerConflict,
  type WeekPlannerDayOption,
  type WeekPlannerTask,
  type WeekPlannerTaskAllocation,
} from "../model/weekPlanner";
import { TaskAllocationDialog } from "./TaskAllocationDialog";
import { WeekCapacitySummary } from "./WeekCapacitySummary";
import { WeekDayCapacityDialog } from "./WeekDayCapacityDialog";
import { WeeklyOutcomes } from "./WeeklyOutcomes";
import { WeekStrip } from "./WeekStrip";
import { UnscheduledTaskQueue } from "./UnscheduledTaskQueue";
import "./week-planner-screen.css";

export interface WeekPlannerScreenProps {
  readonly weekLabel?: string;
  readonly days?: readonly WeekDayPlan[];
  readonly capacitySummary?: WeekCapacitySummaryData;
  readonly outcomes?: readonly WeeklyOutcome[];
  readonly unscheduledTasks?: readonly WeekPlannerTask[];
  readonly allocatedTasks?: readonly WeekPlannerTaskAllocation[];
  readonly dayOptions?: readonly WeekPlannerDayOption[];
  readonly conflicts?: readonly WeekPlannerConflict[];
  readonly selectedDate?: string;
  readonly status?: WeekPlanStatus;
  readonly loading?: boolean;
  readonly error?: string | null;
  readonly actionPending?: boolean;
  readonly actionError?: string | null;
  readonly isOffline?: boolean;
  readonly locale?: string;
  readonly timeZone?: string;
  readonly onNavigateWeek?: (direction: "prev" | "next" | "today") => void;
  readonly onSelectDate?: (date: string) => void;
  readonly onUpdateDayCapacity?: (
    dayLocalDate: string,
    availableMinutes: number,
  ) => Promise<void> | void;
  readonly onSelectOutcome?: (outcomeId: string, selected: boolean) => void;
  readonly onCreateOutcome?: (title: string) => Promise<void> | void;
  readonly onReorderOutcomes?: (outcomes: readonly WeeklyOutcome[]) => Promise<void> | void;
  readonly onAllocateTask?: (
    taskId: string,
    allocation: TaskAllocationValue,
  ) => Promise<void> | void;
  readonly onUnallocateTask?: (taskId: string) => Promise<void> | void;
  readonly onCarryOverTask?: (taskId: string) => Promise<void> | void;
  readonly onFinalizePlan?: () => Promise<void> | void;
  readonly onReopenPlan?: () => Promise<void> | void;
  readonly onRetry?: () => void;
  readonly className?: string;
}

export function WeekPlannerScreen({
  weekLabel = "Aug 17 – Aug 23, 2026",
  days = [],
  capacitySummary,
  outcomes = [],
  unscheduledTasks = [],
  allocatedTasks = [],
  dayOptions = [],
  conflicts = [],
  selectedDate = "2026-08-20",
  status = "DRAFT",
  loading = false,
  error = null,
  actionPending = false,
  actionError = null,
  isOffline = false,
  locale = "en-US",
  onNavigateWeek,
  onSelectDate,
  onUpdateDayCapacity,
  onSelectOutcome,
  onCreateOutcome,
  onReorderOutcomes,
  onAllocateTask,
  onUnallocateTask,
  onCarryOverTask,
  onFinalizePlan,
  onReopenPlan,
  onRetry,
  className,
}: WeekPlannerScreenProps) {
  const [adjustingDay, setAdjustingDay] = useState<WeekDayPlan | null>(null);
  const [allocatingTask, setAllocatingTask] = useState<WeekPlannerTask | null>(null);
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);

  const activeSelectedDate = useMemo(() => {
    if (selectedDate && days.some((d) => d.localDate === selectedDate)) {
      return selectedDate;
    }
    return days.find((d) => d.isToday)?.localDate ?? days[0]?.localDate ?? selectedDate;
  }, [days, selectedDate]);

  const selectedDayPlan = useMemo(
    () => days.find((d) => d.localDate === activeSelectedDate),
    [days, activeSelectedDate],
  );

  const selectedDayAllocatedTasks = useMemo(
    () => allocatedTasks.filter((t) => t.localDate === activeSelectedDate),
    [allocatedTasks, activeSelectedDate],
  );

  const isFinalized = status === "FINALIZED";
  const hasConflicts = conflicts.length > 0 || (capacitySummary?.hasConflicts ?? false);

  const rootClass = ["lifeos-week-planner-screen", className].filter(Boolean).join(" ");

  const handleFinalizeConfirm = async () => {
    if (onFinalizePlan) {
      await onFinalizePlan();
    }
    setFinalizeDialogOpen(false);
  };

  const handleReopenConfirm = async () => {
    if (onReopenPlan) {
      await onReopenPlan();
    }
    setReopenDialogOpen(false);
  };

  const statusTone: BadgeTone = isFinalized ? "success" : "info";

  return (
    <div className={rootClass}>
      <PageHeader
        title="Week Planner"
        description="Plan weekly capacity, set high-level outcomes, schedule tasks, and resolve workload conflicts."
        primaryAction={
          <div className="lifeos-week-planner-screen__header-actions">
            <Badge tone={statusTone}>{isFinalized ? "FINALIZED" : "DRAFT PLAN"}</Badge>

            <div className="lifeos-week-planner-screen__week-nav">
              <IconButton
                icon={ChevronLeft}
                label="Previous week"
                variant="ghost"
                size="sm"
                onClick={() => onNavigateWeek?.("prev")}
              />
              <Text inline size="sm" className="lifeos-week-planner-screen__week-label">
                {weekLabel}
              </Text>
              <IconButton
                icon={ChevronRight}
                label="Next week"
                variant="ghost"
                size="sm"
                onClick={() => onNavigateWeek?.("next")}
              />
              <Button variant="secondary" size="sm" onClick={() => onNavigateWeek?.("today")}>
                This week
              </Button>
            </div>

            {!isFinalized ? (
              <Button
                variant="primary"
                size="sm"
                disabled={actionPending || loading}
                onClick={() => setFinalizeDialogOpen(true)}
              >
                Finalize plan
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                disabled={actionPending || loading}
                onClick={() => setReopenDialogOpen(true)}
              >
                <RotateCcw className="w-4 h-4 mr-1" aria-hidden="true" />
                Reopen plan
              </Button>
            )}
          </div>
        }
      />

      {isOffline && (
        <Alert
          tone="warning"
          heading="Offline mode"
          className="lifeos-week-planner-screen__offline-banner"
        >
          You are working offline. Plan updates will sync once network connection is restored.
        </Alert>
      )}

      {error && (
        <ErrorState
          scope="page"
          title="Unable to load week plan"
          description={error}
          {...(onRetry ? { onRetry } : {})}
          className="lifeos-week-planner-screen__error-banner"
        />
      )}

      {actionError && (
        <Alert
          tone="danger"
          heading="Action failed"
          className="lifeos-week-planner-screen__error-banner"
        >
          {actionError}
        </Alert>
      )}

      {hasConflicts && !loading && !error && (
        <div
          className="lifeos-week-planner-screen__conflicts-card"
          role="region"
          aria-label="Planning conflicts alert"
        >
          <div className="lifeos-week-planner-screen__conflicts-header">
            <AlertTriangle className="text-warning-base" aria-hidden="true" />
            <Heading level={2} size="xs">
              Planning conflicts detected ({conflicts.length})
            </Heading>
          </div>
          <ul className="lifeos-week-planner-screen__conflicts-list">
            {conflicts.map((conflict) => (
              <li key={conflict.id} className="lifeos-week-planner-screen__conflict-item">
                {conflict.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="lifeos-week-planner-screen__capacity-region">
        <WeekStrip
          days={days}
          selectedDate={activeSelectedDate}
          locale={locale}
          loading={loading}
          {...(error ? { error } : {})}
          {...(onRetry ? { onRetry } : {})}
          {...(onSelectDate ? { onSelectDate } : {})}
          onAdjustCapacity={(day) => setAdjustingDay(day)}
        />
        <WeekCapacitySummary
          {...(capacitySummary ? { summary: capacitySummary } : {})}
          loading={loading}
          {...(error ? { error } : {})}
          locale={locale}
          {...(onRetry ? { onRetry } : {})}
        />
      </div>

      <div className="lifeos-week-planner-screen__main-grid">
        <div className="lifeos-week-planner-screen__left-col">
          <WeeklyOutcomes
            outcomes={outcomes}
            editable={!isFinalized && !actionPending}
            onToggleOutcome={(id, selected) => onSelectOutcome?.(id, selected)}
            onAddOutcome={(title) => onCreateOutcome?.(title)}
            onMoveOutcome={(id, dir) => {
              const index = outcomes.findIndex((o) => o.id === id);
              if (index === -1) return;
              const targetIndex = dir === "up" ? index - 1 : index + 1;
              if (targetIndex < 0 || targetIndex >= outcomes.length) return;
              const copy = [...outcomes];
              const temp = copy[index]!;
              copy[index] = copy[targetIndex]!;
              copy[targetIndex] = temp;
              onReorderOutcomes?.(copy);
            }}
          />

          <div
            className="lifeos-week-planner-screen__day-schedule"
            role="region"
            aria-label="Day schedule"
          >
            <div className="lifeos-week-planner-screen__day-schedule-header">
              <Heading level={2} size="xs">
                Scheduled for {selectedDayPlan?.dayOfWeek ?? ""}, {activeSelectedDate}
              </Heading>
              {selectedDayPlan && (
                <Text inline size="xs" tone="secondary">
                  {formatMinutesToHours(selectedDayPlan.plannedMinutes)} /{" "}
                  {formatMinutesToHours(selectedDayPlan.availableMinutes)}
                </Text>
              )}
            </div>

            {selectedDayAllocatedTasks.length === 0 ? (
              <EmptyState
                variant="first-use"
                title="No tasks scheduled for this day"
                description="Allocate tasks from the unscheduled queue or carry over items from previous days."
              />
            ) : (
              <div className="lifeos-week-planner-screen__allocated-tasks-list">
                {selectedDayAllocatedTasks.map((task) => (
                  <div
                    key={task.taskId}
                    className="lifeos-week-planner-screen__allocated-task-card"
                  >
                    <div className="lifeos-week-planner-screen__allocated-task-top">
                      <Text inline size="sm" weight="medium">
                        {task.taskTitle}
                      </Text>
                      <Badge tone="neutral">{formatMinutesToHours(task.plannedMinutes)}</Badge>
                    </div>
                    <div className="lifeos-week-planner-screen__allocated-task-meta">
                      {task.projectName && <Badge tone="info">{task.projectName}</Badge>}
                      <Badge tone={task.status === "DONE" ? "success" : "neutral"}>
                        {task.status}
                      </Badge>
                      <Badge tone="neutral">{task.priority}</Badge>
                      {task.outcomeTitle && (
                        <Text inline size="xs" tone="secondary">
                          Goal: {task.outcomeTitle}
                        </Text>
                      )}
                    </div>
                    {!isFinalized && (
                      <div className="lifeos-week-planner-screen__allocated-task-actions">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setAllocatingTask({
                              id: task.taskId,
                              title: task.taskTitle,
                              status: task.status,
                              priority: task.priority,
                              ...(task.projectName ? { projectName: task.projectName } : {}),
                              estimateMinutes: task.plannedMinutes,
                            })
                          }
                        >
                          Move / Edit
                        </Button>
                        {onUnallocateTask && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onUnallocateTask(task.taskId)}
                          >
                            Unallocate
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lifeos-week-planner-screen__right-col">
          <UnscheduledTaskQueue
            tasks={unscheduledTasks}
            days={dayOptions}
            outcomes={outcomes}
            onAllocateTask={(taskId, val) => onAllocateTask?.(taskId, val)}
            onCarryTask={(taskId) => onCarryOverTask?.(taskId)}
          />
        </div>
      </div>

      {adjustingDay && (
        <WeekDayCapacityDialog
          open={Boolean(adjustingDay)}
          day={adjustingDay}
          onClose={() => setAdjustingDay(null)}
          onSubmit={(dayLocalDate, availableMinutes) => {
            if (onUpdateDayCapacity) {
              void onUpdateDayCapacity(dayLocalDate, availableMinutes);
            }
            setAdjustingDay(null);
          }}
        />
      )}

      {allocatingTask && (
        <TaskAllocationDialog
          open={Boolean(allocatingTask)}
          task={allocatingTask}
          mode="move"
          days={dayOptions}
          outcomes={outcomes}
          onClose={() => setAllocatingTask(null)}
          onSubmit={(taskId, value) => {
            if (onAllocateTask) {
              void onAllocateTask(taskId, value);
            }
            setAllocatingTask(null);
          }}
        />
      )}

      <ConfirmDialog
        open={finalizeDialogOpen}
        onClose={() => setFinalizeDialogOpen(false)}
        onConfirm={handleFinalizeConfirm}
        title="Finalize week plan?"
        description="Finalizing will freeze your weekly outcomes, day allocations, and capacity targets into an immutable revision snapshot."
        confirmLabel="Finalize plan"
        cancelLabel="Keep editing"
      />

      <ConfirmDialog
        open={reopenDialogOpen}
        onClose={() => setReopenDialogOpen(false)}
        onConfirm={handleReopenConfirm}
        title="Reopen week plan?"
        description="Reopening will create a new editable successor revision while preserving your historical snapshot."
        confirmLabel="Reopen plan"
        cancelLabel="Keep finalized"
      />
    </div>
  );
}
