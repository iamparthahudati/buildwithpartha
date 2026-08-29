import { useState } from "react";
import { CalendarPlus, Clock3, Play } from "lucide-react";

import { Alert, EmptyState, ErrorState, InlineMessage } from "@components/feedback";
import { Badge, Button, Skeleton, Surface, Text, VisuallyHidden } from "@components/ui";
import type { FocusSessionStatus } from "@features/focus";
import { TimeBlockRow, type TimeBlock } from "@features/time-blocks";
import { formatDurationMinutes } from "@lib/duration";

import type { TaskStatus } from "../model/task";
import "./scheduling-panel.css";

export interface SchedulingPanelTask {
  readonly id: string;
  readonly title: string;
  readonly status: TaskStatus;
  readonly archivedAt?: string | null;
  readonly deletedAt?: string | null;
}

export interface SchedulingPanelActiveFocusSession {
  readonly id: string;
  readonly taskId: string | null;
  readonly timeBlockId: string | null;
  readonly status: Exclude<FocusSessionStatus, "completed">;
  /** Safe display context supplied by the shared focus-session projection. */
  readonly taskTitle?: string | null;
}

export interface SchedulingPanelProps {
  readonly task: SchedulingPanelTask;
  readonly timeBlocks?: readonly TimeBlock[];
  /** Confirmed actual duration derived from Focus Sessions. `null` means no recorded time. */
  readonly spentMinutes?: number | null;
  readonly loading?: boolean;
  readonly error?: string | null;
  readonly onRetry?: () => void;
  readonly readOnly?: boolean;
  readonly readOnlyReason?: string;
  /** Temporarily disables otherwise-authorized actions, for example while offline. */
  readonly disabled?: boolean;
  readonly disabledReason?: string;
  readonly scheduling?: boolean;
  readonly scheduleError?: string | null;
  readonly onSchedule?: () => void;
  readonly onRetrySchedule?: () => void;
  readonly onResolveScheduleConflict?: () => void;
  readonly activeFocusSession?: SchedulingPanelActiveFocusSession | null;
  readonly startingFocus?: boolean;
  readonly startingTimeBlockId?: string | null;
  readonly focusError?: string | null;
  readonly onRetryFocus?: () => void;
  readonly onStartFocus?: (timeBlockId?: string) => void | Promise<void>;
  readonly onOpenActiveFocus?: () => void;
  readonly locale?: string;
  readonly timeZone?: string;
  readonly now?: Date;
  readonly className?: string;
}

const DEFAULT_LOAD_ERROR =
  "We couldn't load scheduling details. The rest of this Task is still available.";
const DEFAULT_SCHEDULE_ERROR =
  "We couldn't open scheduling right now. The linked Time Blocks are still shown.";
const DEFAULT_FOCUS_ERROR =
  "We couldn't start this Focus Session. No time was recorded. Try again.";
const DEFAULT_READ_ONLY_REASON =
  "You can view this Task's schedule and time, but you don't have permission to change them.";
const DEFAULT_DISABLED_REASON =
  "Scheduling and focus actions aren't available right now. Confirmed details are still shown.";

function taskLifecycleReason(task: SchedulingPanelTask): string | null {
  if (task.deletedAt)
    return "This Task was deleted. Scheduling and focus actions aren't available.";
  if (task.archivedAt)
    return "This Task is archived. Restore it before changing its schedule or starting focus.";
  if (task.status === "DONE")
    return "This Task is done. Reopen it before changing its schedule or starting focus.";
  if (task.status === "CANCELLED")
    return "This Task is cancelled. Reopen it before changing its schedule or starting focus.";
  return null;
}

function focusDisabledReason(
  task: SchedulingPanelTask,
  activeFocusSession: SchedulingPanelActiveFocusSession | null | undefined,
  readOnly: boolean,
  readOnlyReason: string,
  disabled: boolean,
  disabledReason: string,
): string | null {
  const lifecycleReason = taskLifecycleReason(task);
  if (lifecycleReason) return lifecycleReason;
  if (task.status === "BLOCKED")
    return "Resolve this Task's blockers before starting a Focus Session.";
  if (readOnly) return readOnlyReason;
  if (disabled) return disabledReason;
  if (activeFocusSession)
    return activeFocusSession.taskId === task.id
      ? "A Focus Session for this Task is already active."
      : "Another Focus Session is active. Complete or cancel it before starting this Task.";
  return null;
}

export function SchedulingPanel({
  task,
  timeBlocks = [],
  spentMinutes = null,
  loading = false,
  error = null,
  onRetry,
  readOnly = false,
  readOnlyReason = DEFAULT_READ_ONLY_REASON,
  disabled = false,
  disabledReason = DEFAULT_DISABLED_REASON,
  scheduling = false,
  scheduleError = null,
  onSchedule,
  onRetrySchedule,
  onResolveScheduleConflict,
  activeFocusSession = null,
  startingFocus = false,
  startingTimeBlockId = null,
  focusError = null,
  onRetryFocus,
  onStartFocus,
  onOpenActiveFocus,
  locale = "en-US",
  timeZone = "UTC",
  now = new Date(),
  className,
}: SchedulingPanelProps) {
  const [internalStartingTarget, setInternalStartingTarget] = useState<string | null>(null);
  const [internalFocusError, setInternalFocusError] = useState<string | null>(null);

  if (loading) {
    return <SchedulingPanelSkeleton {...(className ? { className } : {})} />;
  }

  const lifecycleReason = taskLifecycleReason(task);
  const mutationsDisabled = readOnly || disabled || Boolean(lifecycleReason);
  const scheduleDisabledReason = lifecycleReason ?? (readOnly ? readOnlyReason : disabledReason);
  const startDisabledReason = focusDisabledReason(
    task,
    activeFocusSession,
    readOnly,
    readOnlyReason,
    disabled,
    disabledReason,
  );
  const conflictCount = timeBlocks.filter((timeBlock) => timeBlock.hasConflict).length;
  const currentFocusError = focusError ?? internalFocusError;
  const focusRequestPending =
    startingFocus || startingTimeBlockId !== null || internalStartingTarget !== null;

  async function startFocus(timeBlockId?: string) {
    if (!onStartFocus || startDisabledReason || startingFocus || internalStartingTarget !== null) {
      return;
    }

    const target = timeBlockId ?? "task";
    setInternalFocusError(null);
    setInternalStartingTarget(target);
    try {
      await onStartFocus(timeBlockId);
    } catch {
      setInternalFocusError(DEFAULT_FOCUS_ERROR);
    } finally {
      setInternalStartingTarget(null);
    }
  }

  const taskStartPending = startingFocus || internalStartingTarget === "task";
  const taskStartDisabledReason =
    startDisabledReason ??
    (focusRequestPending && !taskStartPending ? "A Focus Session is starting." : null);
  const taskStartDisabled = Boolean(taskStartDisabledReason);
  const scheduleAction = onSchedule ? (
    <Button
      size="sm"
      variant="secondary"
      iconStart={CalendarPlus}
      loading={scheduling}
      loadingLabel={`Opening scheduling for ${task.title}`}
      disabled={mutationsDisabled}
      {...(mutationsDisabled ? { title: scheduleDisabledReason } : {})}
      onClick={onSchedule}
    >
      Schedule
    </Button>
  ) : null;

  return (
    <Surface
      as="section"
      title="Schedule and focus"
      titleLevel={2}
      titleAction={timeBlocks.length > 0 ? scheduleAction : undefined}
      className={["lifeos-scheduling-panel", className].filter(Boolean).join(" ")}
    >
      {error ? (
        <ErrorState
          scope="region"
          title="Scheduling details couldn't load"
          description={error || DEFAULT_LOAD_ERROR}
          {...(onRetry ? { onRetry } : {})}
        />
      ) : (
        <>
          <div className="lifeos-scheduling-panel__summary">
            <div className="lifeos-scheduling-panel__time-spent">
              <Clock3 aria-hidden="true" className="lifeos-scheduling-panel__summary-icon" />
              <div>
                <Text tone="secondary" size="xs">
                  Time spent
                </Text>
                <Text weight="semibold" className="lifeos-scheduling-panel__duration">
                  {spentMinutes == null
                    ? "Not recorded"
                    : formatDurationMinutes(spentMinutes, locale)}
                </Text>
                <Text tone="muted" size="xs">
                  Confirmed Focus Session time
                </Text>
              </div>
            </div>

            <div className="lifeos-scheduling-panel__focus-action">
              {activeFocusSession ? (
                <Badge tone={activeFocusSession.status === "paused" ? "warning" : "primary"}>
                  {activeFocusSession.status === "paused" ? "Focus paused" : "In focus"}
                </Badge>
              ) : null}
              {activeFocusSession && onOpenActiveFocus ? (
                <Button variant="primary" size="sm" iconStart={Play} onClick={onOpenActiveFocus}>
                  Open focus
                </Button>
              ) : onStartFocus ? (
                <Button
                  variant="primary"
                  size="sm"
                  iconStart={Play}
                  loading={taskStartPending}
                  loadingLabel={`Starting focus for ${task.title}`}
                  disabled={taskStartDisabled}
                  {...(taskStartDisabled && taskStartDisabledReason
                    ? { title: taskStartDisabledReason }
                    : {})}
                  onClick={() => void startFocus()}
                >
                  Start focus
                </Button>
              ) : null}
            </div>
          </div>

          {readOnly ? <InlineMessage tone="info">{readOnlyReason}</InlineMessage> : null}
          {!readOnly && disabled ? (
            <InlineMessage tone="warning">{disabledReason}</InlineMessage>
          ) : null}
          {!readOnly && !disabled && lifecycleReason ? (
            <InlineMessage tone="info">{lifecycleReason}</InlineMessage>
          ) : null}

          {activeFocusSession ? (
            <Alert
              tone={activeFocusSession.taskId === task.id ? "info" : "warning"}
              heading={
                activeFocusSession.taskId === task.id
                  ? "Focus is already active for this Task"
                  : "Another Focus Session is active"
              }
            >
              {activeFocusSession.taskId === task.id
                ? "Open the active Focus Session to pause, resume, complete, or cancel it."
                : `${activeFocusSession.taskTitle ?? "Another Task"} is using the active Focus Session. Complete or cancel it before starting focus here.`}
            </Alert>
          ) : null}

          {conflictCount > 0 ? (
            <Alert
              tone="warning"
              heading={conflictCount === 1 ? "Schedule conflict" : "Schedule conflicts"}
              {...(onResolveScheduleConflict
                ? {
                    action: (
                      <Button size="sm" variant="secondary" onClick={onResolveScheduleConflict}>
                        Resolve schedule conflict
                      </Button>
                    ),
                  }
                : {})}
            >
              {conflictCount === 1
                ? "One linked Time Block overlaps another scheduled item. Review the named times before continuing."
                : `${conflictCount} linked Time Blocks overlap other scheduled items. Review the named times before continuing.`}
            </Alert>
          ) : null}

          {scheduleError ? (
            <Alert
              tone="danger"
              heading="Scheduling couldn't open"
              {...(onRetrySchedule
                ? {
                    action: (
                      <Button size="sm" variant="secondary" onClick={onRetrySchedule}>
                        Try again
                      </Button>
                    ),
                  }
                : {})}
            >
              {scheduleError || DEFAULT_SCHEDULE_ERROR}
            </Alert>
          ) : null}

          {currentFocusError ? (
            <Alert
              tone="danger"
              heading="Focus couldn't start"
              {...(onRetryFocus
                ? {
                    action: (
                      <Button size="sm" variant="secondary" onClick={onRetryFocus}>
                        Try again
                      </Button>
                    ),
                  }
                : {})}
            >
              {currentFocusError}
            </Alert>
          ) : null}

          <div className="lifeos-scheduling-panel__blocks">
            <div className="lifeos-scheduling-panel__blocks-heading">
              <Text weight="semibold">Linked Time Blocks</Text>
              {timeBlocks.length > 0 ? (
                <Text tone="secondary" size="xs">
                  {timeBlocks.length} {timeBlocks.length === 1 ? "Time Block" : "Time Blocks"}
                </Text>
              ) : null}
            </div>

            {timeBlocks.length === 0 ? (
              <EmptyState
                variant="first-use"
                title="No linked Time Blocks"
                description="Schedule this Task when you want to reserve time for it."
                icon={CalendarPlus}
                {...(scheduleAction ? { primaryAction: scheduleAction } : {})}
              />
            ) : (
              <ul className="lifeos-scheduling-panel__block-list">
                {timeBlocks.map((timeBlock) => {
                  const rowPending =
                    startingTimeBlockId === timeBlock.id || internalStartingTarget === timeBlock.id;
                  const rowDisabledReason =
                    startDisabledReason ??
                    (focusRequestPending && !rowPending ? "A Focus Session is starting." : null);
                  return (
                    <li key={timeBlock.id}>
                      <TimeBlockRow
                        timeBlock={timeBlock}
                        locale={locale}
                        timeZone={timeZone}
                        now={now}
                        startingFocus={rowPending}
                        startFocusDisabled={Boolean(rowDisabledReason)}
                        {...(rowDisabledReason
                          ? { startFocusDisabledReason: rowDisabledReason }
                          : {})}
                        {...(onStartFocus && !activeFocusSession
                          ? { onStartFocus: () => void startFocus(timeBlock.id) }
                          : {})}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </Surface>
  );
}

function SchedulingPanelSkeleton({ className }: { readonly className?: string }) {
  return (
    <Surface
      as="section"
      title="Schedule and focus"
      titleLevel={2}
      className={["lifeos-scheduling-panel", "lifeos-scheduling-panel--loading", className]
        .filter(Boolean)
        .join(" ")}
    >
      <VisuallyHidden>Loading scheduling and focus details.</VisuallyHidden>
      <div className="lifeos-scheduling-panel__summary" aria-hidden="true">
        <Skeleton shape="line" width="9rem" height="3rem" />
        <Skeleton shape="line" width="7rem" height="2rem" />
      </div>
      <div className="lifeos-scheduling-panel__blocks" aria-hidden="true">
        <Skeleton shape="line" width="8rem" height="1.25rem" />
        <TimeBlockRow loading />
        <TimeBlockRow loading />
      </div>
    </Surface>
  );
}
