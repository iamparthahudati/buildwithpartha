import { useState } from "react";
import { Plus } from "lucide-react";

import {
  Badge,
  Button,
  Heading,
  SkeletonCard,
  Surface,
  Text,
  PRIORITY_TONE,
  TASK_STATUS_TONE,
} from "@components/ui";
import { Alert, EmptyState, ErrorState } from "@components/feedback";
import {
  Tabs,
  DataTable,
  AttachmentUploader,
  AttachmentList,
  CommentComposer,
  CommentList,
  Pagination,
  ActivityFeed,
  type TabItem,
  type DataTableColumn,
  type Attachment,
  type Comment,
  type CommentListStatus,
  type ActivityEvent,
  type ActivityFeedStatus,
  type BreadcrumbItem,
  type MenuItemDescriptor,
  type ChartDatum,
} from "@components/navigation";
import { ActivityTypeFilterControl, type ActivityTypeFilter } from "@features/activity";
import { formatLocalDate } from "@lib/localDateTime";

import type { Project } from "../model/project";
import type { Milestone, MilestoneStatus } from "../model/milestone";
import { ProjectDetailsHeader } from "./ProjectDetailsHeader";
import { ProjectOverview, type ProjectOverviewTask } from "./ProjectOverview";
import { ProjectTimeline } from "./ProjectTimeline";
import type { MilestoneFormData } from "./MilestoneFormDialog";
import "./project-details-screen.css";

export interface ProjectDetailsScreenProps {
  readonly project?: Project;
  readonly milestones?: readonly Milestone[];
  readonly ownerName?: string;
  readonly estimatedHours?: number;
  readonly actualHours?: number;
  readonly labels?: readonly string[];
  readonly topTasks?: readonly ProjectOverviewTask[];
  readonly tasksTotalCount?: number;
  readonly tasksLoading?: boolean;
  readonly activityEvents?: readonly ActivityEvent[];
  readonly activityTabEvents?: readonly ActivityEvent[];
  readonly activityStatus?: ActivityFeedStatus;
  readonly activityCount?: number;
  readonly activityPage?: number;
  readonly activityPageSize?: number;
  readonly activityTotal?: number;
  readonly onActivityPageChange?: (page: number) => void;
  readonly activityFilter?: ActivityTypeFilter;
  readonly onActivityFilterChange?: (filter: ActivityTypeFilter) => void;
  readonly activityEmptyTitle?: string;
  readonly statusBreakdown?: readonly ChartDatum[];
  readonly priorityBreakdown?: readonly ChartDatum[];
  readonly attachments?: readonly Attachment[];
  readonly comments?: readonly Comment[];
  readonly commentsStatus?: CommentListStatus;
  readonly commentsCount?: number;
  readonly commentsPage?: number;
  readonly commentsPageSize?: number;
  readonly commentsTotal?: number;
  readonly onCommentsPageChange?: (page: number) => void;
  readonly selectedTab?: string;
  readonly onTabChange?: (tab: string) => void;
  readonly loading?: boolean;
  readonly notFound?: boolean;
  readonly forbidden?: boolean;
  readonly error?: Error | string | null;
  readonly onRetry?: () => void;
  readonly onGoBack?: () => void;
  readonly locale?: string;
  readonly timeZone?: string;
  readonly now?: Date;
  readonly backHref?: string;
  readonly backLabel?: string;
  readonly breadcrumbs?: readonly BreadcrumbItem[];
  readonly onAddTask?: () => void;
  readonly onEditProject?: () => void;
  readonly onArchiveProject?: () => void;
  readonly onRestoreProject?: () => void;
  readonly onCompleteProject?: () => void;
  readonly onCancelProject?: () => void;
  readonly onDeleteProject?: () => void;
  readonly secondaryActions?: readonly MenuItemDescriptor[];
  readonly onAddMilestone?: (data: MilestoneFormData) => Promise<void> | void;
  readonly onUpdateMilestone?: (
    milestoneId: string,
    data: MilestoneFormData,
  ) => Promise<void> | void;
  readonly onMilestoneStatusChange?: (
    milestoneId: string,
    status: MilestoneStatus,
  ) => Promise<void> | void;
  readonly onDeleteMilestone?: (milestoneId: string) => Promise<void> | void;
  readonly onUploadAttachment?: (files: readonly File[]) => Promise<void> | void;
  readonly onDeleteAttachment?: (attachmentId: string) => Promise<void> | void;
  readonly onDownloadAttachment?: (attachmentId: string) => void;
  readonly onAddComment?: (content: string) => Promise<void> | void;
  readonly addCommentPending?: boolean;
  readonly addCommentError?: string;
  readonly onEditComment?: (commentId: string, body: string) => Promise<void> | void;
  readonly editCommentPending?: boolean;
  readonly editCommentError?: string;
  readonly onDeleteComment?: (commentId: string) => Promise<void> | void;
  readonly deleteCommentPending?: boolean;
  readonly deleteCommentError?: string;
  readonly className?: string;
}

const TASK_STATUS_LABEL: Record<string, string> = {
  PLANNED: "Planned",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  BLOCKED: "Blocked",
};

export function ProjectDetailsScreen({
  project,
  milestones = [],
  ownerName = "You",
  estimatedHours,
  actualHours,
  labels = [],
  topTasks = [],
  tasksTotalCount,
  tasksLoading = false,
  activityEvents = [],
  activityTabEvents,
  activityStatus = { type: "ready" },
  activityCount,
  activityPage = 1,
  activityPageSize = 20,
  activityTotal,
  onActivityPageChange,
  activityFilter = "ALL",
  onActivityFilterChange,
  activityEmptyTitle = "No activity recorded",
  statusBreakdown = [],
  priorityBreakdown = [],
  attachments = [],
  comments = [],
  commentsStatus = { type: "ready" },
  commentsCount,
  commentsPage = 1,
  commentsPageSize = 20,
  commentsTotal,
  onCommentsPageChange,
  selectedTab: controlledTab,
  onTabChange,
  loading = false,
  notFound = false,
  forbidden = false,
  error = null,
  onRetry,
  onGoBack,
  locale = "en-US",
  timeZone = "UTC",
  now = new Date(),
  backHref = "/life-os/app/projects",
  backLabel = "Projects",
  breadcrumbs,
  onAddTask,
  onEditProject,
  onArchiveProject,
  onRestoreProject,
  onCompleteProject,
  onCancelProject,
  onDeleteProject,
  secondaryActions,
  onAddMilestone,
  onUpdateMilestone,
  onMilestoneStatusChange,
  onDeleteMilestone,
  onUploadAttachment,
  onDeleteAttachment,
  onDownloadAttachment,
  onAddComment,
  addCommentPending = false,
  addCommentError,
  onEditComment,
  editCommentPending = false,
  editCommentError,
  onDeleteComment,
  deleteCommentPending = false,
  deleteCommentError,
  className,
}: ProjectDetailsScreenProps) {
  const [internalTab, setInternalTab] = useState("overview");
  const [newCommentText, setNewCommentText] = useState("");

  const currentTab = controlledTab ?? internalTab;

  const handleTabSelect = (tabId: string) => {
    if (onTabChange) {
      onTabChange(tabId);
    } else {
      setInternalTab(tabId);
    }
  };

  const handleCommentSubmit = async () => {
    if (!newCommentText.trim() || !onAddComment) return;
    try {
      await onAddComment(newCommentText.trim());
      setNewCommentText("");
    } catch {
      // The route supplies safe error copy; keep the draft available for retry.
    }
  };

  if (loading) {
    return (
      <div className={["lifeos-project-details-screen", className].filter(Boolean).join(" ")}>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className={["lifeos-project-details-screen", className].filter(Boolean).join(" ")}>
        <ErrorState
          scope="page"
          title="Project not found"
          description="The requested project does not exist or you do not have permission to view it."
          {...(onGoBack ? { onGoBack } : {})}
        />
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className={["lifeos-project-details-screen", className].filter(Boolean).join(" ")}>
        <ErrorState
          scope="page"
          title="Access denied"
          description="You do not have permission to access this project details page."
          {...(onGoBack ? { onGoBack } : {})}
        />
      </div>
    );
  }

  if (error || !project) {
    const errorMessage = typeof error === "string" ? error : error?.message;
    return (
      <div className={["lifeos-project-details-screen", className].filter(Boolean).join(" ")}>
        <ErrorState
          scope="page"
          title="Failed to load project details"
          description={errorMessage || "An unexpected error occurred while loading project data."}
          {...(onRetry ? { onRetry } : {})}
        />
      </div>
    );
  }

  const isArchived = Boolean(project.archivedAt);
  const visibleTaskCount = tasksTotalCount ?? topTasks.length;

  // Column config for Tasks tab
  const taskColumns: readonly DataTableColumn<ProjectOverviewTask>[] = [
    {
      key: "title",
      header: "Task",
      render: (task) => (
        <Text weight="medium" size="sm">
          {task.title}
        </Text>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (task) => (
        <Badge tone={TASK_STATUS_TONE[task.status] ?? "neutral"}>
          {TASK_STATUS_LABEL[task.status] ?? task.status}
        </Badge>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      render: (task) => (
        <Badge tone={PRIORITY_TONE[task.priority] ?? "neutral"}>{task.priority}</Badge>
      ),
    },
    {
      key: "dueDate",
      header: "Due Date",
      render: (task) =>
        task.dueDate ? (
          <Text size="sm" tone="secondary">
            {formatLocalDate(task.dueDate, locale)}
          </Text>
        ) : (
          <Text size="sm" tone="muted">
            No deadline
          </Text>
        ),
    },
    {
      key: "assignee",
      header: "Assignee",
      render: (task) => (
        <Text size="sm" tone="secondary">
          {task.assigneeName ?? "Unassigned"}
        </Text>
      ),
    },
  ];

  // Tab definitions
  const tabItems: readonly TabItem[] = [
    {
      id: "overview",
      label: "Overview",
      panel: (
        <ProjectOverview
          project={project}
          ownerName={ownerName}
          labels={labels}
          topTasks={topTasks}
          activityEvents={activityEvents}
          activityStatus={activityStatus}
          statusBreakdown={statusBreakdown}
          priorityBreakdown={priorityBreakdown}
          now={now}
          locale={locale}
          timeZone={timeZone}
          {...(estimatedHours !== undefined ? { estimatedHours } : {})}
          {...(actualHours !== undefined ? { actualHours } : {})}
          {...(onAddTask ? { onAddTask } : {})}
          {...(onEditProject ? { onEditProject } : {})}
        />
      ),
    },
    {
      id: "tasks",
      label: "Tasks",
      badge: visibleTaskCount > 0 ? <Badge tone="neutral">{visibleTaskCount}</Badge> : undefined,
      panel: (
        <Surface
          as="section"
          aria-label="Project tasks"
          className="lifeos-project-details-screen__files-tab"
        >
          <div className="lifeos-project-details-screen__tasks-header">
            <Heading level={2} size="md">
              Tasks ({visibleTaskCount})
            </Heading>
            {!isArchived && onAddTask ? (
              <Button variant="primary" iconStart={Plus} onClick={onAddTask}>
                Add task
              </Button>
            ) : null}
          </div>

          {tasksLoading ? (
            <SkeletonCard aria-label="Loading project tasks" />
          ) : visibleTaskCount === 0 ? (
            <EmptyState
              variant="first-use"
              title="No tasks in this project"
              description="Create your first task to start tracking work items."
              primaryAction={
                !isArchived && onAddTask ? (
                  <Button variant="primary" iconStart={Plus} onClick={onAddTask}>
                    Add task
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <DataTable<ProjectOverviewTask>
              label="Project tasks list"
              columns={taskColumns}
              rows={topTasks}
              getRowId={(task) => task.id}
              emptyTitle="No tasks in this project"
            />
          )}
        </Surface>
      ),
    },
    {
      id: "timeline",
      label: "Timeline",
      badge: milestones.length > 0 ? <Badge tone="neutral">{milestones.length}</Badge> : undefined,
      panel: (
        <ProjectTimeline
          projectId={project.id}
          milestones={milestones}
          now={now}
          locale={locale}
          timeZone={timeZone}
          isArchived={isArchived}
          {...(project.startDate ? { projectStartDate: project.startDate } : {})}
          {...(project.deadlineDate ? { projectDeadlineDate: project.deadlineDate } : {})}
          {...(onAddMilestone ? { onAddMilestone } : {})}
          {...(onUpdateMilestone ? { onUpdateMilestone } : {})}
          {...(onMilestoneStatusChange ? { onStatusChange: onMilestoneStatusChange } : {})}
          {...(onDeleteMilestone ? { onDeleteMilestone } : {})}
        />
      ),
    },
    {
      id: "files",
      label: "Files",
      badge:
        attachments.length > 0 ? <Badge tone="neutral">{attachments.length}</Badge> : undefined,
      panel: (
        <Surface
          as="section"
          aria-label="Project files"
          className="lifeos-project-details-screen__files-tab"
        >
          <Heading level={2} size="md">
            Files & Attachments
          </Heading>
          {!isArchived && onUploadAttachment ? (
            <AttachmentUploader
              label="Upload project attachment"
              acceptedTypes={["image/png", "image/jpeg", "application/pdf"]}
              acceptedTypesLabel="PNG, JPEG, or PDF"
              maxFileSizeBytes={10 * 1024 * 1024}
              locale={locale}
              onFilesSelected={(files) => void onUploadAttachment(files)}
            />
          ) : null}
          <AttachmentList
            attachments={attachments}
            label="Project attachments list"
            emptyTitle="No files attached"
            emptyDescription="Upload documents, specifications, or assets linked to this project."
            locale={locale}
            {...(onDeleteAttachment ? { onDelete: onDeleteAttachment } : {})}
            {...(onDownloadAttachment ? { onDownload: onDownloadAttachment } : {})}
          />
        </Surface>
      ),
    },
    {
      id: "notes",
      label: "Notes",
      badge:
        (commentsCount ?? comments.length) > 0 ? (
          <Badge tone="neutral">{commentsCount ?? comments.length}</Badge>
        ) : undefined,
      panel: (
        <Surface
          as="section"
          aria-label="Project notes"
          className="lifeos-project-details-screen__notes-tab"
        >
          <Heading level={2} size="md">
            Notes & Discussion
          </Heading>
          {!isArchived && onAddComment ? (
            <CommentComposer
              label="Add project note"
              value={newCommentText}
              onChange={setNewCommentText}
              onSubmit={() => void handleCommentSubmit()}
              pending={addCommentPending}
              {...(addCommentError ? { error: addCommentError } : {})}
            />
          ) : null}
          <CommentList
            comments={comments}
            label="Project notes list"
            emptyTitle="No notes yet"
            emptyDescription="Record notes, design decisions, or team discussion for this project."
            locale={locale}
            timeZone={timeZone}
            status={commentsStatus}
            {...(!isArchived && onEditComment ? { onEdit: onEditComment } : {})}
            editPending={editCommentPending}
            {...(editCommentError ? { editError: editCommentError } : {})}
            {...(onDeleteComment ? { onDelete: onDeleteComment } : {})}
            deletePending={deleteCommentPending}
            {...(deleteCommentError ? { deleteError: deleteCommentError } : {})}
          />
          {onCommentsPageChange && (commentsTotal ?? 0) > commentsPageSize ? (
            <Pagination
              page={commentsPage}
              pageSize={commentsPageSize}
              total={commentsTotal ?? 0}
              onPageChange={onCommentsPageChange}
              label="Project comments pagination"
            />
          ) : null}
        </Surface>
      ),
    },
    {
      id: "activity",
      label: "Activity",
      badge:
        (activityCount ?? activityEvents.length) > 0 ? (
          <Badge tone="neutral">{activityCount ?? activityEvents.length}</Badge>
        ) : undefined,
      panel: (
        <Surface
          as="section"
          aria-label="Project activity"
          className="lifeos-project-details-screen__activity-tab"
        >
          <Heading level={2} size="md">
            Recent Activity
          </Heading>
          {onActivityFilterChange ? (
            <ActivityTypeFilterControl value={activityFilter} onChange={onActivityFilterChange} />
          ) : null}
          <ActivityFeed
            events={activityTabEvents ?? activityEvents}
            label="Project event history"
            status={activityStatus}
            emptyTitle={activityEmptyTitle}
            now={now}
            locale={locale}
            timeZone={timeZone}
            {...(onActivityPageChange &&
            activityTotal !== undefined &&
            activityTotal > activityPageSize
              ? {
                  pagination: {
                    page: activityPage,
                    pageSize: activityPageSize,
                    total: activityTotal,
                    onPageChange: onActivityPageChange,
                  },
                }
              : {})}
          />
        </Surface>
      ),
    },
  ];

  return (
    <div className={["lifeos-project-details-screen", className].filter(Boolean).join(" ")}>
      {isArchived ? (
        <Alert tone="warning" className="lifeos-project-details-screen__archived-banner">
          This project was archived on{" "}
          {project.archivedAt
            ? formatLocalDate(project.archivedAt.slice(0, 10), locale)
            : "a past date"}
          . Restore it to add tasks or update milestones.
        </Alert>
      ) : null}

      <ProjectDetailsHeader
        project={project}
        ownerName={ownerName}
        now={now}
        locale={locale}
        timeZone={timeZone}
        backHref={backHref}
        backLabel={backLabel}
        {...(estimatedHours !== undefined ? { estimatedHours } : {})}
        {...(breadcrumbs ? { breadcrumbs } : {})}
        {...(onAddTask ? { onAddTask } : {})}
        {...(onEditProject ? { onEdit: onEditProject } : {})}
        {...(onArchiveProject ? { onArchive: onArchiveProject } : {})}
        {...(onRestoreProject ? { onRestore: onRestoreProject } : {})}
        {...(onCompleteProject ? { onComplete: onCompleteProject } : {})}
        {...(onCancelProject ? { onCancel: onCancelProject } : {})}
        {...(onDeleteProject ? { onDelete: onDeleteProject } : {})}
        {...(secondaryActions ? { secondaryActions } : {})}
      />

      <div className="lifeos-project-details-screen__tabs">
        <Tabs
          items={tabItems}
          selectedId={currentTab}
          onSelectedIdChange={handleTabSelect}
          label="Project details tabs"
        />
      </div>
    </div>
  );
}
