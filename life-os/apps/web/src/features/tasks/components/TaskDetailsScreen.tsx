import { useState } from "react";

import { Alert, ErrorState, InlineMessage } from "@components/feedback";
import {
  ActivityFeed,
  AttachmentList,
  AttachmentUploader,
  CommentComposer,
  CommentList,
  Tabs,
  type ActivityEvent,
  type ActivityFeedStatus,
  type Attachment,
  type BreadcrumbItem,
  type Comment,
  type CommentListStatus,
  type TabItem,
} from "@components/navigation";
import { CountBadge, Link, SkeletonCard, Surface } from "@components/ui";

import { DependencyEditor, type DependencyEditorProps } from "./DependencyEditor";
import { SchedulingPanel, type SchedulingPanelProps } from "./SchedulingPanel";
import { SubtaskChecklist, type SubtaskChecklistProps } from "./SubtaskChecklist";
import {
  TaskDetailsHeader,
  type TaskDetailsHeaderProps,
  type TaskDetailsHeaderTask,
} from "./TaskDetailsHeader";
import "./task-details-screen.css";

export type TaskDetailsTabId =
  "details" | "subtasks" | "dependencies" | "comments" | "attachments" | "activity";

export type TaskDetailsHeaderConfig = Omit<
  TaskDetailsHeaderProps,
  | "task"
  | "loading"
  | "deleted"
  | "locale"
  | "timeZone"
  | "now"
  | "backHref"
  | "backLabel"
  | "breadcrumbs"
  | "className"
>;

export type TaskDetailsSubtasksConfig = Omit<SubtaskChecklistProps, "className">;
export type TaskDetailsDependenciesConfig = Omit<DependencyEditorProps, "task" | "className">;
export type TaskDetailsSchedulingConfig = Omit<
  SchedulingPanelProps,
  "task" | "locale" | "timeZone" | "now" | "className"
>;

export interface TaskDetailsCommentsConfig {
  readonly comments?: readonly Comment[];
  /** Aggregate count remains accurate when the section collection is loaded independently. */
  readonly count?: number;
  readonly status?: CommentListStatus;
  readonly addPending?: boolean;
  readonly addError?: string;
  readonly onAdd?: (body: string) => void | Promise<void>;
  readonly onEdit?: (id: string, body: string) => void;
  readonly editPending?: boolean;
  readonly editError?: string;
  readonly onDelete?: (id: string) => void;
  readonly deletePending?: boolean;
  readonly deleteError?: string;
}

export type TaskDetailsAttachmentsStatus =
  | { readonly type: "ready" }
  | { readonly type: "loading" }
  | { readonly type: "error"; readonly message: string; readonly onRetry?: () => void };

export interface TaskDetailsAttachmentsConfig {
  /** The optional Files gate. When false, the tab is absent rather than advertising an off feature. */
  readonly enabled: boolean;
  readonly attachments?: readonly Attachment[];
  /** Aggregate count remains accurate when the optional collection is loaded independently. */
  readonly count?: number;
  readonly status?: TaskDetailsAttachmentsStatus;
  readonly uploading?: boolean;
  readonly onUpload?: (files: readonly File[]) => void | Promise<void>;
  readonly onCancel?: (id: string) => void;
  readonly onRetryUpload?: (id: string) => void;
  readonly onDownload?: (id: string) => void;
  readonly onDelete?: (id: string) => void;
  readonly deletePending?: boolean;
  readonly deleteError?: string;
}

export interface TaskDetailsActivityConfig {
  readonly events?: readonly ActivityEvent[];
  /** Aggregate count remains accurate when the feed is loaded independently. */
  readonly count?: number;
  readonly status?: ActivityFeedStatus;
  readonly page?: number;
  readonly pageSize?: number;
  readonly total?: number;
  readonly onPageChange?: (page: number) => void;
}

export interface TaskDetailsScreenProps {
  readonly task?: TaskDetailsHeaderTask;
  readonly loading?: boolean;
  /** Known soft-deleted state. The safe deleted header is retained without interactive tabs. */
  readonly deleted?: boolean;
  /** Not found and permission loss deliberately share one non-revealing state. */
  readonly unavailable?: boolean;
  /** Safe, UI-owned detail only; never pass raw server or exception text. */
  readonly error?: string | null;
  readonly correlationId?: string;
  readonly onRetry?: () => void;
  readonly onReturnToList?: () => void;
  readonly selectedTab?: TaskDetailsTabId;
  readonly onTabChange?: (tab: TaskDetailsTabId) => void;
  readonly backgroundRefreshing?: boolean;
  /** Safe, UI-owned failure for a lifecycle mutation that leaves confirmed details visible. */
  readonly mutationError?: string | null;
  readonly onDismissMutationError?: () => void;
  readonly offline?: boolean;
  readonly lastUpdatedLabel?: string;
  readonly readOnly?: boolean;
  readonly readOnlyReason?: string;
  readonly locale?: string;
  readonly timeZone?: string;
  readonly now?: Date;
  /** Exact list URL, including filters/page, for direct-route return. */
  readonly backHref?: string;
  readonly backLabel?: string;
  readonly breadcrumbs?: readonly BreadcrumbItem[];
  readonly header?: TaskDetailsHeaderConfig;
  readonly subtasks?: TaskDetailsSubtasksConfig;
  readonly dependencies?: TaskDetailsDependenciesConfig;
  readonly scheduling?: TaskDetailsSchedulingConfig;
  readonly comments?: TaskDetailsCommentsConfig;
  readonly attachments?: TaskDetailsAttachmentsConfig;
  readonly activity?: TaskDetailsActivityConfig;
  readonly className?: string;
}

const DEFAULT_READ_ONLY_REASON =
  "You can view this Task, but changes aren't available in its current state.";

function countBadge(count: number, label: string) {
  return count > 0 ? <CountBadge count={count} label={label} tone="neutral" /> : undefined;
}

export function TaskDetailsScreen({
  task,
  loading = false,
  deleted = false,
  unavailable = false,
  error = null,
  correlationId,
  onRetry,
  onReturnToList,
  selectedTab: controlledTab,
  onTabChange,
  backgroundRefreshing = false,
  mutationError = null,
  onDismissMutationError,
  offline = false,
  lastUpdatedLabel,
  readOnly = false,
  readOnlyReason = DEFAULT_READ_ONLY_REASON,
  locale = "en-US",
  timeZone = "UTC",
  now = new Date(),
  backHref = "/life-os/app/tasks",
  backLabel = "Tasks",
  breadcrumbs,
  header = {},
  subtasks = {},
  dependencies = {},
  scheduling = {},
  comments = {},
  attachments = { enabled: false },
  activity = {},
  className,
}: TaskDetailsScreenProps) {
  const [internalTab, setInternalTab] = useState<TaskDetailsTabId>("details");
  const [commentDraft, setCommentDraft] = useState("");
  const selectedTab =
    controlledTab === "attachments" && !attachments.enabled
      ? "details"
      : (controlledTab ?? internalTab);
  const classes = ["lifeos-task-details-screen", className].filter(Boolean).join(" ");

  function selectTab(id: string) {
    const next = id as TaskDetailsTabId;
    setInternalTab(next);
    onTabChange?.(next);
  }

  async function addComment() {
    const body = commentDraft.trim();
    if (!body || !comments.onAdd) return;
    await comments.onAdd(body);
    setCommentDraft("");
  }

  if (loading) {
    return (
      <div className={classes} aria-busy="true">
        <TaskDetailsHeader loading />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (unavailable) {
    return (
      <div className={classes}>
        <ErrorState
          scope="page"
          title="This Task isn't available"
          description="It may have been removed, or you may not have access. Return to Tasks to continue."
          {...(onReturnToList
            ? { onGoBack: onReturnToList, goBackLabel: `Back to ${backLabel.toLowerCase()}` }
            : {
                action: (
                  <Link href={backHref} quiet>
                    Back to {backLabel.toLowerCase()}
                  </Link>
                ),
              })}
        />
      </div>
    );
  }

  if (error || (!task && !deleted)) {
    return (
      <div className={classes}>
        <ErrorState
          scope="page"
          title="Task details couldn't load"
          description={
            error || "LifeOS couldn't load this Task right now. Return to Tasks or try again."
          }
          {...(correlationId ? { correlationId } : {})}
          {...(onRetry ? { onRetry } : {})}
          {...(onReturnToList
            ? { onGoBack: onReturnToList, goBackLabel: `Back to ${backLabel.toLowerCase()}` }
            : {
                action: (
                  <Link href={backHref} quiet>
                    Back to {backLabel.toLowerCase()}
                  </Link>
                ),
              })}
        />
      </div>
    );
  }

  const taskIsDeleted = deleted || Boolean(task?.deletedAt);
  const taskIsArchived = Boolean(task?.archivedAt);
  const mutationsLocked = readOnly || offline || taskIsDeleted || taskIsArchived;
  const headerMutationsLocked = readOnly || offline || taskIsDeleted;
  const resolvedReadOnlyReason = offline
    ? "You're offline. Confirmed Task details remain available, but changes require a connection."
    : taskIsArchived
      ? "This Task is archived. Restore it before making changes."
      : readOnlyReason;
  const resolvedHeader: TaskDetailsHeaderConfig = headerMutationsLocked
    ? {
        ...(header.conflictError ? { conflictError: header.conflictError } : {}),
        ...(header.onLoadLatest ? { onLoadLatest: header.onLoadLatest } : {}),
      }
    : header;

  if (!task || taskIsDeleted) {
    return (
      <div className={classes}>
        <TaskDetailsHeader
          {...(task ? { task } : {})}
          deleted
          locale={locale}
          timeZone={timeZone}
          now={now}
          backHref={backHref}
          backLabel={backLabel}
          {...(breadcrumbs ? { breadcrumbs } : {})}
        />
      </div>
    );
  }

  const commentsList = comments.comments ?? [];
  const attachmentList = attachments.attachments ?? [];
  const activityEvents = activity.events ?? [];
  const subtaskList = subtasks.subtasks ?? [];
  const dependencyCount =
    (dependencies.blockers?.length ?? 0) + (dependencies.dependents?.length ?? 0);
  const canWriteComments = !mutationsLocked && Boolean(comments.onAdd);
  const attachmentsStatus = attachments.status ?? { type: "ready" };
  const subtaskReadOnlyReason = mutationsLocked
    ? resolvedReadOnlyReason
    : (subtasks.readOnlyReason ?? readOnlyReason);
  const dependencyReadOnlyReason = mutationsLocked
    ? resolvedReadOnlyReason
    : (dependencies.readOnlyReason ?? readOnlyReason);
  const schedulingReadOnlyReason = mutationsLocked
    ? resolvedReadOnlyReason
    : (scheduling.readOnlyReason ?? readOnlyReason);
  const tabItems: readonly TabItem[] = [
    {
      id: "details",
      label: "Details",
      panel: (
        <SchedulingPanel
          {...scheduling}
          task={task}
          readOnly={mutationsLocked || Boolean(scheduling.readOnly)}
          readOnlyReason={schedulingReadOnlyReason}
          locale={locale}
          timeZone={timeZone}
          now={now}
        />
      ),
    },
    {
      id: "subtasks",
      label: "Subtasks",
      badge: countBadge(subtaskList.length, "Subtasks"),
      panel: (
        <SubtaskChecklist
          {...subtasks}
          subtasks={subtaskList}
          readOnly={mutationsLocked || Boolean(subtasks.readOnly)}
          readOnlyReason={subtaskReadOnlyReason}
        />
      ),
    },
    {
      id: "dependencies",
      label: "Dependencies",
      badge: countBadge(dependencyCount, "Task dependencies"),
      panel: (
        <DependencyEditor
          {...dependencies}
          task={task}
          readOnly={mutationsLocked || Boolean(dependencies.readOnly)}
          readOnlyReason={dependencyReadOnlyReason}
        />
      ),
    },
    {
      id: "comments",
      label: "Comments",
      badge: countBadge(comments.count ?? commentsList.length, "comments"),
      panel: (
        <Surface
          as="section"
          title="Comments"
          titleLevel={2}
          className="lifeos-task-details-screen__tab-surface"
        >
          {mutationsLocked ? (
            <InlineMessage tone="info">{resolvedReadOnlyReason}</InlineMessage>
          ) : null}
          {canWriteComments ? (
            <CommentComposer
              label="Add a comment"
              value={commentDraft}
              onChange={setCommentDraft}
              onSubmit={() => void addComment()}
              {...(comments.addPending !== undefined ? { pending: comments.addPending } : {})}
              {...(comments.addError ? { error: comments.addError } : {})}
            />
          ) : null}
          <CommentList
            label="Task comments"
            comments={commentsList}
            locale={locale}
            timeZone={timeZone}
            status={comments.status ?? { type: "ready" }}
            emptyTitle="No comments yet"
            emptyDescription="Add a comment when this Task needs context or a decision."
            now={now}
            {...(!mutationsLocked && comments.onEdit ? { onEdit: comments.onEdit } : {})}
            {...(comments.editPending !== undefined ? { editPending: comments.editPending } : {})}
            {...(comments.editError ? { editError: comments.editError } : {})}
            {...(!mutationsLocked && comments.onDelete ? { onDelete: comments.onDelete } : {})}
            {...(comments.deletePending !== undefined
              ? { deletePending: comments.deletePending }
              : {})}
            {...(comments.deleteError ? { deleteError: comments.deleteError } : {})}
          />
        </Surface>
      ),
    },
    ...(attachments.enabled
      ? [
          {
            id: "attachments",
            label: "Attachments",
            badge: countBadge(attachments.count ?? attachmentList.length, "attachments"),
            panel: (
              <Surface
                as="section"
                title="Attachments"
                titleLevel={2}
                className="lifeos-task-details-screen__tab-surface"
              >
                {mutationsLocked ? (
                  <InlineMessage tone="info">{resolvedReadOnlyReason}</InlineMessage>
                ) : null}
                {!mutationsLocked && attachments.onUpload ? (
                  <AttachmentUploader
                    label="Add task attachment"
                    acceptedTypes={["image/png", "image/jpeg", "application/pdf"]}
                    acceptedTypesLabel="PNG, JPEG, or PDF"
                    maxFileSizeBytes={10 * 1024 * 1024}
                    locale={locale}
                    {...(attachments.uploading !== undefined
                      ? { disabled: attachments.uploading }
                      : {})}
                    onFilesSelected={(files) => void attachments.onUpload?.(files)}
                  />
                ) : null}
                {attachmentsStatus.type === "loading" ? (
                  <SkeletonCard />
                ) : attachmentsStatus.type === "error" ? (
                  <ErrorState
                    scope="region"
                    title="Attachments couldn't load"
                    description={attachmentsStatus.message}
                    {...(attachmentsStatus.onRetry ? { onRetry: attachmentsStatus.onRetry } : {})}
                  />
                ) : (
                  <AttachmentList
                    label="Task attachments"
                    attachments={attachmentList}
                    locale={locale}
                    emptyTitle="No attachments yet"
                    emptyDescription="Add a file when this Task needs supporting material."
                    {...(!mutationsLocked && attachments.onCancel
                      ? { onCancel: attachments.onCancel }
                      : {})}
                    {...(!mutationsLocked && attachments.onRetryUpload
                      ? { onRetry: attachments.onRetryUpload }
                      : {})}
                    {...(attachments.onDownload ? { onDownload: attachments.onDownload } : {})}
                    {...(!mutationsLocked && attachments.onDelete
                      ? { onDelete: attachments.onDelete }
                      : {})}
                    {...(attachments.deletePending !== undefined
                      ? { deletePending: attachments.deletePending }
                      : {})}
                    {...(attachments.deleteError ? { deleteError: attachments.deleteError } : {})}
                  />
                )}
              </Surface>
            ),
          } satisfies TabItem,
        ]
      : []),
    {
      id: "activity",
      label: "Activity",
      badge: countBadge(activity.count ?? activityEvents.length, "activity events"),
      panel: (
        <Surface
          as="section"
          title="Activity"
          titleLevel={2}
          className="lifeos-task-details-screen__tab-surface"
        >
          <ActivityFeed
            label="Task activity"
            events={activityEvents}
            locale={locale}
            timeZone={timeZone}
            status={activity.status ?? { type: "ready" }}
            emptyTitle="No activity yet"
            emptyDescription="Changes to this Task will appear here."
            groupHeadingLevel={3}
            now={now}
            {...(activity.onPageChange && activity.page && activity.pageSize && activity.total
              ? {
                  pagination: {
                    page: activity.page,
                    pageSize: activity.pageSize,
                    total: activity.total,
                    onPageChange: activity.onPageChange,
                  },
                }
              : {})}
          />
        </Surface>
      ),
    },
  ];

  return (
    <div className={classes}>
      {offline ? (
        <Alert tone="warning" heading="You're offline">
          Confirmed Task details remain available
          {lastUpdatedLabel ? ` from ${lastUpdatedLabel}` : ""}. Reconnect to make changes.
        </Alert>
      ) : null}
      {backgroundRefreshing ? (
        <InlineMessage tone="info" announce="status">
          Updating Task details. Confirmed data remains visible.
        </InlineMessage>
      ) : null}
      {mutationError ? (
        <Alert
          tone="danger"
          heading="Task couldn't be changed"
          announce="alert"
          {...(onDismissMutationError ? { onDismiss: onDismissMutationError } : {})}
        >
          {mutationError}
        </Alert>
      ) : null}

      <TaskDetailsHeader
        {...resolvedHeader}
        task={task}
        locale={locale}
        timeZone={timeZone}
        now={now}
        backHref={backHref}
        backLabel={backLabel}
        {...(breadcrumbs ? { breadcrumbs } : {})}
      />

      <Tabs
        items={tabItems}
        selectedId={selectedTab}
        onSelectedIdChange={selectTab}
        label="Task details tabs"
      />
    </div>
  );
}
