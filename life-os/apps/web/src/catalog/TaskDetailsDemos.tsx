import { useState } from "react";

import { Button, Select, Text } from "@components/ui";
import {
  TaskDetailsScreen,
  TaskDetailsSheet,
  type SubtaskChecklistItem,
  type TaskDetailsHeaderTask,
  type TaskDetailsTabId,
} from "@features/tasks";
import type { TimeBlock } from "@features/time-blocks";
import type { Attachment, Comment } from "@components/navigation";
import type { ActivityTypeFilter } from "@features/activity";

const NOW = new Date("2026-08-23T10:00:00Z");

const TASK: TaskDetailsHeaderTask = {
  id: "task-weekly-review",
  title: "Prepare weekly review",
  description: "Collect confirmed decisions and choose the actions that move forward.",
  status: "IN_PROGRESS",
  priority: "P1",
  project: {
    id: "project-learning-plan",
    name: "Learning plan",
    href: "/life-os/app/projects/project-learning-plan",
  },
  dueAt: "2026-08-24T12:00:00Z",
  estimateMinutes: 90,
  spentMinutes: 35,
  progress: 50,
  labels: [{ id: "label-learning", name: "Learning" }],
  isMit: true,
  blockerCount: 1,
};

const LINKED_TIME_BLOCK: TimeBlock = {
  id: "time-block-weekly-planning",
  title: "Weekly planning",
  startTime: "15:00",
  endTime: "16:00",
  status: "SCHEDULED",
  task: {
    id: TASK.id,
    title: TASK.title,
    href: `/life-os/app/tasks/${TASK.id}`,
  },
};

type DemoState =
  | "ready"
  | "empty"
  | "partial"
  | "refreshing"
  | "offline"
  | "archived"
  | "deleted"
  | "loading"
  | "unavailable"
  | "error";

export function TaskDetailsScreenDemo() {
  const [demoState, setDemoState] = useState<DemoState>("ready");
  const [selectedTab, setSelectedTab] = useState<TaskDetailsTabId>("details");
  const [result, setResult] = useState("Ready for interaction.");
  const [activityFilter, setActivityFilter] = useState<ActivityTypeFilter>("ALL");
  const [subtasks, setSubtasks] = useState<readonly SubtaskChecklistItem[]>([
    { id: "subtask-notes", title: "Collect notes", completed: true, position: 0 },
    { id: "subtask-decisions", title: "List open decisions", completed: false, position: 1 },
  ]);
  const [comments, setComments] = useState<readonly Comment[]>([
    {
      id: "comment-context",
      authorName: "You",
      body: "Keep the final decision concise.",
      createdAt: "2026-08-23T08:00:00Z",
    },
  ]);
  const [attachments, setAttachments] = useState<readonly Attachment[]>([
    {
      id: "attachment-notes",
      fileName: "weekly-review-notes.pdf",
      fileSizeBytes: 24_576,
      status: "ready",
    },
    {
      id: "attachment-reference",
      fileName: "reference.png",
      fileSizeBytes: 131_072,
      status: "scanning",
    },
  ]);

  const empty = demoState === "empty";
  const partial = demoState === "partial";
  const archivedTask =
    demoState === "archived" ? { ...TASK, archivedAt: "2026-08-22T10:00:00Z" } : TASK;
  const activityEvents = [
    {
      id: "activity-created",
      type: "TASK" as const,
      actorName: "You",
      action: "created",
      object: { label: TASK.title, href: `/life-os/app/tasks/${TASK.id}` },
      createdAt: "2026-08-23T07:00:00Z",
    },
    {
      id: "activity-commented",
      type: "COMMENT" as const,
      actorName: "You",
      action: "commented on",
      object: { label: TASK.title, href: `/life-os/app/tasks/${TASK.id}` },
      createdAt: "2026-08-23T08:00:00Z",
    },
  ].filter((event) => activityFilter === "ALL" || event.type === activityFilter);

  return (
    <div className="specimen-stack" style={{ width: "100%" }}>
      <div className="specimen-row">
        <Select
          label="Task Details state"
          value={demoState}
          onChange={(event) => {
            setDemoState(event.target.value as DemoState);
            setSelectedTab("details");
          }}
          options={[
            { value: "ready", label: "Populated" },
            { value: "empty", label: "First-use empty regions" },
            { value: "partial", label: "Partial region failures" },
            { value: "refreshing", label: "Background refresh" },
            { value: "offline", label: "Offline confirmed data" },
            { value: "archived", label: "Archived read-only" },
            { value: "deleted", label: "Deleted" },
            { value: "loading", label: "Loading" },
            { value: "unavailable", label: "Unavailable" },
            { value: "error", label: "Service error" },
          ]}
        />
        <Text size="sm" tone="secondary" aria-live="polite">
          {result}
        </Text>
      </div>

      <TaskDetailsScreen
        task={
          demoState === "deleted" ? { ...TASK, deletedAt: "2026-08-23T09:00:00Z" } : archivedTask
        }
        loading={demoState === "loading"}
        unavailable={demoState === "unavailable"}
        error={demoState === "error" ? "LifeOS couldn't load this Task right now." : null}
        backgroundRefreshing={demoState === "refreshing"}
        offline={demoState === "offline"}
        lastUpdatedLabel="10:30"
        selectedTab={selectedTab}
        onTabChange={setSelectedTab}
        backHref="/life-os/app/tasks?status=IN_PROGRESS&page=2&view=table"
        header={{
          onEdit: () => setResult("Edit task opened."),
          onStartFocus: () => setResult("Focus request started."),
          onToggleMit: () => setResult("MIT selection changed."),
          onMarkDone: () => setResult("Task marked done."),
          onDuplicate: () => setResult("Task duplicated."),
          onArchive: () => setResult("Task archived."),
          onRestore: () => setResult("Task restored."),
          onDelete: () => setResult("Delete confirmation requested."),
        }}
        subtasks={{
          subtasks: empty ? [] : subtasks,
          ...(partial
            ? { error: "Subtasks couldn't refresh. Confirmed Task details remain available." }
            : {}),
          onAdd: (title) =>
            setSubtasks((current) => [
              ...current,
              {
                id: `subtask-${current.length + 1}`,
                title,
                completed: false,
                position: current.length,
              },
            ]),
          onEdit: (id, title) =>
            setSubtasks((current) =>
              current.map((item) => (item.id === id ? { ...item, title } : item)),
            ),
          onToggle: (id, completed) =>
            setSubtasks((current) =>
              current.map((item) => (item.id === id ? { ...item, completed } : item)),
            ),
          onReorder: (orderedIds) =>
            setSubtasks((current) =>
              orderedIds
                .map((id) => current.find((item) => item.id === id))
                .filter((item): item is SubtaskChecklistItem => Boolean(item))
                .map((item, position) => ({ ...item, position })),
            ),
          onDelete: (id) => setSubtasks((current) => current.filter((item) => item.id !== id)),
        }}
        dependencies={{
          blockers: empty
            ? []
            : [
                {
                  id: "task-organize-documents",
                  title: "Organize tax documents",
                  status: "TO_DO",
                  priority: "P2",
                  href: "/life-os/app/tasks/task-organize-documents",
                },
              ],
          dependents: [],
          blockerOptions: [
            {
              id: "task-compare-hosting",
              title: "Compare hosting options",
              status: "IN_PROGRESS",
              priority: "P2",
            },
          ],
          ...(partial
            ? {
                operationErrors: [
                  {
                    operation: "remove" as const,
                    relationship: "BLOCKER" as const,
                    taskId: "task-organize-documents",
                    message:
                      "We couldn't unlink this Task dependency. The saved relationship is still shown.",
                  },
                ],
              }
            : {}),
          onAddBlocker: () => setResult("Blocker added."),
          onRemoveDependency: () => setResult("Task dependency unlinked."),
        }}
        scheduling={{
          timeBlocks: empty ? [] : [LINKED_TIME_BLOCK],
          spentMinutes: empty ? null : 35,
          ...(partial
            ? {
                scheduleError:
                  "We couldn't open scheduling. Confirmed Time Blocks remain available.",
              }
            : {}),
          onSchedule: () => setResult("Scheduling opened."),
          onStartFocus: () => setResult("Focus request started."),
        }}
        comments={{
          comments: empty ? [] : comments,
          ...(partial
            ? { status: { type: "error" as const, message: "Task details are still available." } }
            : {}),
          onAdd: (body) =>
            setComments((current) => [
              ...current,
              {
                id: `comment-${current.length + 1}`,
                authorName: "You",
                body,
                createdAt: NOW.toISOString(),
              },
            ]),
          onEdit: (id, body) =>
            setComments((current) =>
              current.map((comment) =>
                comment.id === id ? { ...comment, body, editedAt: NOW.toISOString() } : comment,
              ),
            ),
          onDelete: (id) =>
            setComments((current) => current.filter((comment) => comment.id !== id)),
        }}
        attachments={{
          enabled: true,
          attachments: empty ? [] : attachments,
          ...(partial
            ? { status: { type: "error" as const, message: "Task details are still available." } }
            : {}),
          onUpload: (files) =>
            setAttachments((current) => [
              ...current,
              ...files.map((file, index) => ({
                id: `attachment-${current.length + index + 1}`,
                fileName: file.name,
                fileSizeBytes: file.size,
                status: "scanning" as const,
              })),
            ]),
          onDownload: () => setResult("Authorized download requested."),
          onDelete: (id) =>
            setAttachments((current) => current.filter((attachment) => attachment.id !== id)),
        }}
        activity={{
          events: empty ? [] : activityEvents,
          count: empty ? 0 : 22,
          filter: activityFilter,
          onFilterChange: setActivityFilter,
          page: 1,
          pageSize: 20,
          total: empty ? 0 : 22,
          onPageChange: (page) => setResult(`Activity page ${page} requested.`),
          emptyTitle:
            activityFilter === "ALL"
              ? "No activity yet"
              : `No ${activityFilter.toLowerCase()} changes on this page`,
          ...(partial
            ? { status: { type: "error" as const, message: "Task details are still available." } }
            : {}),
        }}
        now={NOW}
        timeZone="Asia/Kolkata"
      />
    </div>
  );
}

export function TaskDetailsSheetDemo() {
  const [open, setOpen] = useState(false);

  return (
    <div className="specimen-stack">
      <Text tone="secondary" size="sm">
        The mocked Tasks list stays mounted while the responsive sheet is open.
      </Text>
      <Button type="button" onClick={() => setOpen(true)}>
        Open Prepare weekly review
      </Button>
      <TaskDetailsSheet
        open={open}
        onClose={() => setOpen(false)}
        task={TASK}
        scheduling={{ timeBlocks: [LINKED_TIME_BLOCK], spentMinutes: 35 }}
        backHref="/life-os/app/tasks?status=IN_PROGRESS&page=2&view=table"
        now={NOW}
        timeZone="Asia/Kolkata"
      />
    </div>
  );
}
