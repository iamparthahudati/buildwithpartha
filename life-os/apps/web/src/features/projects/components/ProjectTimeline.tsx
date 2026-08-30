import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, MoreHorizontal, Flag, X } from "lucide-react";

import {
  Badge,
  Button,
  Heading,
  Icon,
  IconButton,
  SkeletonCard,
  Surface,
  Text,
  VisuallyHidden,
  type BadgeTone,
} from "@components/ui";
import { EmptyState, ErrorState, ConfirmDialog } from "@components/feedback";
import {
  Timeline,
  Menu,
  type TimelineEntry,
  type MenuItemDescriptor,
} from "@components/navigation";
import { formatLocalDate, todayLocalDate, compareLocalDates } from "@lib/localDateTime";

import type { Milestone, MilestoneStatus } from "../model/milestone";
import type { TasksByMilestone } from "../model/milestoneTask";
import { MilestoneFormDialog, type MilestoneFormData } from "./MilestoneFormDialog";
import "./project-timeline.css";

export interface AssignableTask {
  readonly id: string;
  readonly title: string;
}

export interface ProjectTimelineProps {
  readonly projectId?: string;
  readonly milestones?: readonly Milestone[];
  readonly loading?: boolean;
  readonly error?: Error | string | null;
  readonly onRetry?: () => void;
  readonly locale?: string;
  readonly timeZone?: string;
  readonly now?: Date;
  readonly isArchived?: boolean;
  readonly readOnly?: boolean;
  readonly projectStartDate?: string | null;
  readonly projectDeadlineDate?: string | null;
  readonly selectedMilestoneId?: string;
  readonly tasksByMilestone?: TasksByMilestone;
  readonly assignableTasks?: readonly AssignableTask[];
  readonly onAssignTask?: (milestoneId: string, taskId: string) => Promise<void> | void;
  readonly onUnassignTask?: (taskId: string) => Promise<void> | void;
  readonly onAddMilestone?: (data: MilestoneFormData) => Promise<void> | void;
  readonly onUpdateMilestone?: (
    milestoneId: string,
    data: MilestoneFormData,
  ) => Promise<void> | void;
  readonly onStatusChange?: (milestoneId: string, status: MilestoneStatus) => Promise<void> | void;
  readonly onDeleteMilestone?: (milestoneId: string) => Promise<void> | void;
  readonly className?: string;
}

const MILESTONE_STATUS_LABEL: Record<MilestoneStatus, string> = {
  PLANNED: "Planned",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const MILESTONE_STATUS_TONE: Record<MilestoneStatus, BadgeTone> = {
  PLANNED: "info",
  COMPLETED: "success",
  CANCELLED: "neutral",
};

export function ProjectTimeline({
  milestones = [],
  loading = false,
  error = null,
  onRetry,
  locale = "en-US",
  timeZone = "UTC",
  now = new Date(),
  isArchived = false,
  readOnly = false,
  projectStartDate,
  projectDeadlineDate,
  selectedMilestoneId,
  tasksByMilestone = {},
  assignableTasks = [],
  onAssignTask,
  onUnassignTask,
  onAddMilestone,
  onUpdateMilestone,
  onStatusChange,
  onDeleteMilestone,
  className,
}: ProjectTimelineProps) {
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [formPending, setFormPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deletingMilestone, setDeletingMilestone] = useState<Milestone | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const milestoneRefs = useRef(new Map<string, HTMLDivElement>());

  const today = useMemo(() => todayLocalDate(timeZone, now), [timeZone, now]);

  useEffect(() => {
    if (!selectedMilestoneId) return;
    milestoneRefs.current.get(selectedMilestoneId)?.focus();
  }, [milestones, selectedMilestoneId]);

  // Sort milestones deterministically by ordering and then creation time
  const sortedMilestones = useMemo(() => {
    return [...milestones].sort((a, b) => {
      if (a.ordering !== b.ordering) return a.ordering - b.ordering;
      if (a.date && b.date) return compareLocalDates(a.date, b.date);
      if (a.date) return -1;
      if (b.date) return 1;
      return a.createdAt.localeCompare(b.createdAt);
    });
  }, [milestones]);

  // Compute summary stats
  const totalCount = sortedMilestones.length;
  const completedCount = sortedMilestones.filter((m) => m.status === "COMPLETED").length;
  const overdueCount = sortedMilestones.filter(
    (m) =>
      m.status === "PLANNED" &&
      Boolean(m.date) &&
      compareLocalDates(m.date!, today) < 0 &&
      !isArchived,
  ).length;

  // Find index of first planned/upcoming milestone for Timeline's "current" marker
  const firstPlannedIndex = sortedMilestones.findIndex((m) => m.status === "PLANNED");

  // Map to Timeline primitive entries
  const timelineEntries: readonly TimelineEntry[] = useMemo(() => {
    return sortedMilestones.map((m, index) => {
      const isOverdue =
        m.status === "PLANNED" &&
        Boolean(m.date) &&
        compareLocalDates(m.date!, today) < 0 &&
        !isArchived;

      let timelineStatus: "completed" | "current" | "future" | "overdue";
      if (m.status === "COMPLETED") {
        timelineStatus = "completed";
      } else if (isOverdue) {
        timelineStatus = "overdue";
      } else if (index === firstPlannedIndex) {
        timelineStatus = "current";
      } else {
        timelineStatus = "future";
      }

      return {
        id: m.id,
        title: m.title,
        date: m.date ?? today,
        status: timelineStatus,
      };
    });
  }, [sortedMilestones, today, isArchived, firstPlannedIndex]);

  const handleOpenAddDialog = () => {
    setEditingMilestone(null);
    setFormError(null);
    setFormDialogOpen(true);
  };

  const handleOpenEditDialog = (milestone: Milestone) => {
    setEditingMilestone(milestone);
    setFormError(null);
    setFormDialogOpen(true);
  };

  const handleFormSubmit = async (data: MilestoneFormData) => {
    setFormPending(true);
    setFormError(null);
    try {
      if (editingMilestone && onUpdateMilestone) {
        await onUpdateMilestone(editingMilestone.id, data);
      } else if (onAddMilestone) {
        await onAddMilestone(data);
      }
      setFormDialogOpen(false);
      setEditingMilestone(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save milestone.");
    } finally {
      setFormPending(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingMilestone || !onDeleteMilestone) return;
    setDeletePending(true);
    try {
      await onDeleteMilestone(deletingMilestone.id);
      setDeletingMilestone(null);
    } catch {
      // Error will be caught or surfaced by parent hook
    } finally {
      setDeletePending(false);
    }
  };

  if (loading) {
    return (
      <Surface
        as="section"
        aria-label="Loading project timeline"
        className={["lifeos-project-timeline", className].filter(Boolean).join(" ")}
      >
        <div className="lifeos-project-timeline__header">
          <SkeletonCard />
        </div>
        <div className="lifeos-project-timeline__list-wrapper">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <VisuallyHidden>Loading project timeline and milestones.</VisuallyHidden>
      </Surface>
    );
  }

  if (error) {
    const errorMessage = typeof error === "string" ? error : error.message;
    return (
      <Surface
        as="section"
        aria-label="Project timeline error"
        className={["lifeos-project-timeline", className].filter(Boolean).join(" ")}
      >
        <ErrorState
          scope="region"
          title="Failed to load project milestones"
          description={errorMessage || "An error occurred while fetching milestone data."}
          {...(onRetry ? { onRetry } : {})}
        />
      </Surface>
    );
  }

  const isInteractive = !isArchived && !readOnly;

  return (
    <Surface
      as="section"
      aria-label="Project timeline and milestones"
      className={["lifeos-project-timeline", className].filter(Boolean).join(" ")}
    >
      <div className="lifeos-project-timeline__header">
        <div className="lifeos-project-timeline__title-block">
          <Heading level={2} size="md">
            Milestones & Timeline
          </Heading>
          <div className="lifeos-project-timeline__summary-strip">
            <Badge tone="neutral">{totalCount} total</Badge>
            <Badge tone="success">{completedCount} completed</Badge>
            {overdueCount > 0 ? <Badge tone="danger">{overdueCount} overdue</Badge> : null}
          </div>
        </div>

        {isInteractive && onAddMilestone ? (
          <div className="lifeos-project-timeline__header-actions">
            <Button variant="primary" iconStart={Plus} onClick={handleOpenAddDialog}>
              Add milestone
            </Button>
          </div>
        ) : null}
      </div>

      {totalCount === 0 ? (
        <EmptyState
          variant="first-use"
          title="No milestones yet"
          description="Add key checkpoints and target dates to track progress along your project timeline."
          primaryAction={
            isInteractive && onAddMilestone ? (
              <Button variant="primary" iconStart={Plus} onClick={handleOpenAddDialog}>
                Add milestone
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="lifeos-project-timeline__list-wrapper">
          {sortedMilestones.map((milestone) => {
            const isOverdue =
              milestone.status === "PLANNED" &&
              Boolean(milestone.date) &&
              compareLocalDates(milestone.date!, today) < 0 &&
              !isArchived;

            const formattedDate = milestone.date
              ? formatLocalDate(milestone.date, locale)
              : "No date target";

            const assignedTasks = tasksByMilestone[milestone.id] ?? [];
            const assignedEstimateHours =
              assignedTasks.reduce((sum, task) => sum + task.estimateMinutes, 0) / 60;
            const assignedIds = new Set(assignedTasks.map((task) => task.taskId));
            const assignCandidates = assignableTasks.filter((task) => !assignedIds.has(task.id));
            const canAssign = isInteractive && Boolean(onAssignTask);
            const canUnassign = isInteractive && Boolean(onUnassignTask);
            const showTasksSection = assignedTasks.length > 0 || canAssign;

            const menuItems: MenuItemDescriptor[] = [];
            if (isInteractive) {
              if (onUpdateMilestone) {
                menuItems.push({
                  type: "item",
                  id: "edit",
                  label: "Edit milestone",
                  onSelect: () => handleOpenEditDialog(milestone),
                });
              }

              if (onStatusChange) {
                if (milestone.status !== "COMPLETED") {
                  menuItems.push({
                    type: "item",
                    id: "complete",
                    label: "Mark completed",
                    onSelect: () => void onStatusChange(milestone.id, "COMPLETED"),
                  });
                }
                if (milestone.status !== "PLANNED") {
                  menuItems.push({
                    type: "item",
                    id: "planned",
                    label: "Mark planned",
                    onSelect: () => void onStatusChange(milestone.id, "PLANNED"),
                  });
                }
                if (milestone.status !== "CANCELLED") {
                  menuItems.push({
                    type: "item",
                    id: "cancel",
                    label: "Cancel milestone",
                    onSelect: () => void onStatusChange(milestone.id, "CANCELLED"),
                  });
                }
              }

              if (onDeleteMilestone) {
                menuItems.push({
                  type: "item",
                  id: "delete",
                  label: "Delete milestone",
                  destructive: true,
                  onSelect: () => setDeletingMilestone(milestone),
                });
              }
            }

            return (
              <div
                key={milestone.id}
                ref={(node) => {
                  if (node) milestoneRefs.current.set(milestone.id, node);
                  else milestoneRefs.current.delete(milestone.id);
                }}
                tabIndex={milestone.id === selectedMilestoneId ? -1 : undefined}
                className={[
                  "lifeos-project-timeline__item-card",
                  milestone.id === selectedMilestoneId && "is-selected",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="lifeos-project-timeline__item-main">
                  <div className="lifeos-project-timeline__item-header">
                    <Icon icon={Flag} decorative size="sm" />
                    <Heading level={3} size="sm">
                      {milestone.title}
                    </Heading>
                    <Badge tone={MILESTONE_STATUS_TONE[milestone.status]}>
                      {MILESTONE_STATUS_LABEL[milestone.status]}
                    </Badge>
                    {isOverdue ? <Badge tone="danger">Overdue</Badge> : null}
                  </div>
                  <Text tone={isOverdue ? "danger" : "secondary"} size="sm">
                    Target: {formattedDate}
                  </Text>
                  {showTasksSection ? (
                    <div className="lifeos-project-timeline__item-tasks">
                      {assignedTasks.length > 0 ? (
                        <>
                          <Text tone="secondary" size="sm">
                            {assignedTasks.length} {assignedTasks.length === 1 ? "task" : "tasks"}
                            {assignedEstimateHours > 0
                              ? ` · ${Number.isInteger(assignedEstimateHours) ? assignedEstimateHours : assignedEstimateHours.toFixed(1)}h`
                              : ""}
                          </Text>
                          <ul className="lifeos-project-timeline__task-list">
                            {assignedTasks.map((task) => (
                              <li key={task.taskId} className="lifeos-project-timeline__task-item">
                                <Text size="sm">{task.title}</Text>
                                <div className="lifeos-project-timeline__task-meta">
                                  <Badge tone="neutral">{task.priority}</Badge>
                                  {canUnassign ? (
                                    <IconButton
                                      icon={X}
                                      label={`Remove ${task.title} from ${milestone.title}`}
                                      variant="ghost"
                                      onClick={() => void onUnassignTask?.(task.taskId)}
                                    />
                                  ) : null}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <Text tone="muted" size="sm">
                          No tasks assigned yet.
                        </Text>
                      )}
                      {canAssign && assignCandidates.length > 0 ? (
                        <Menu
                          trigger={
                            <Button variant="ghost" size="sm" iconStart={Plus}>
                              Add task
                            </Button>
                          }
                          items={assignCandidates.map((task) => ({
                            type: "item",
                            id: task.id,
                            label: task.title,
                            onSelect: () => void onAssignTask?.(milestone.id, task.id),
                          }))}
                          label={`Assign a task to ${milestone.title}`}
                          align="start"
                        />
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {menuItems.length > 0 ? (
                  <div className="lifeos-project-timeline__item-actions">
                    <Menu
                      trigger={
                        <IconButton
                          icon={MoreHorizontal}
                          label={`Actions for ${milestone.title}`}
                          variant="ghost"
                        />
                      }
                      items={menuItems}
                      label={`Actions for ${milestone.title}`}
                      align="end"
                    />
                  </div>
                ) : null}
              </div>
            );
          })}

          <div className="lifeos-project-timeline__visual-timeline">
            <Timeline
              entries={timelineEntries}
              label="Milestones timeline view"
              locale={locale}
              titleLevel={3}
            />
          </div>
        </div>
      )}

      {/* Form Dialog for Add / Edit */}
      <MilestoneFormDialog
        open={formDialogOpen}
        onClose={() => setFormDialogOpen(false)}
        onSubmit={handleFormSubmit}
        initialValues={editingMilestone}
        mode={editingMilestone ? "edit" : "create"}
        isPending={formPending}
        error={formError}
        {...(projectStartDate ? { projectStartDate } : {})}
        {...(projectDeadlineDate ? { projectDeadlineDate } : {})}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deletingMilestone)}
        onClose={() => setDeletingMilestone(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete milestone"
        description={`Are you sure you want to delete "${deletingMilestone?.title ?? "this milestone"}"? This action cannot be undone.`}
        confirmLabel="Delete milestone"
        pending={deletePending}
      />
    </Surface>
  );
}
