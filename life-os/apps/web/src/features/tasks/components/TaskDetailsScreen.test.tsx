import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";
import type { TimeBlock } from "@features/time-blocks";

import type { TaskDetailsHeaderTask } from "./TaskDetailsHeader";
import { TaskDetailsScreen } from "./TaskDetailsScreen";

const NOW = new Date("2026-08-23T10:00:00Z");

const TASK: TaskDetailsHeaderTask = {
  id: "task-weekly-review",
  title: "Prepare weekly review",
  description: "Collect the confirmed decisions and open actions for this week.",
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
};

const TIME_BLOCK: TimeBlock = {
  id: "time-block-review",
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

const READY_CONFIG = {
  subtasks: {
    subtasks: [
      { id: "subtask-notes", title: "Collect notes", completed: true, position: 0 },
      { id: "subtask-decisions", title: "List decisions", completed: false, position: 1 },
    ],
    onAdd: vi.fn(),
    onEdit: vi.fn(),
    onToggle: vi.fn(),
    onReorder: vi.fn(),
    onDelete: vi.fn(),
  },
  dependencies: {
    blockers: [
      {
        id: "task-organize-documents",
        title: "Organize tax documents",
        status: "TO_DO" as const,
        priority: "P2" as const,
        href: "/life-os/app/tasks/task-organize-documents",
      },
    ],
    dependents: [],
    blockerOptions: [],
    onAddBlocker: vi.fn(),
    onRemoveDependency: vi.fn(),
  },
  scheduling: {
    timeBlocks: [TIME_BLOCK],
    spentMinutes: 35,
    onSchedule: vi.fn(),
    onStartFocus: vi.fn(),
  },
  comments: {
    comments: [
      {
        id: "comment-context",
        authorName: "You",
        body: "Keep the final decision concise.",
        createdAt: "2026-08-23T08:00:00Z",
      },
    ],
    onAdd: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  },
  attachments: {
    enabled: true,
    attachments: [
      {
        id: "attachment-notes",
        fileName: "weekly-review-notes.pdf",
        fileSizeBytes: 1024,
        status: "ready" as const,
      },
    ],
    onUpload: vi.fn(),
    onDownload: vi.fn(),
    onDelete: vi.fn(),
  },
  activity: {
    events: [
      {
        id: "activity-created",
        actorName: "You",
        action: "created",
        object: {
          label: TASK.title,
          href: `/life-os/app/tasks/${TASK.id}`,
        },
        createdAt: "2026-08-23T07:00:00Z",
      },
    ],
  },
} as const;

describe("TaskDetailsScreen", () => {
  it("composes the header and every enabled Task Details tab accessibly", async () => {
    const { container } = renderWithUser(
      <TaskDetailsScreen
        task={TASK}
        {...READY_CONFIG}
        now={NOW}
        timeZone="Asia/Kolkata"
        backHref="/life-os/app/tasks?status=IN_PROGRESS&page=2"
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: TASK.title })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tasks" })).toHaveAttribute(
      "href",
      "/life-os/app/tasks?status=IN_PROGRESS&page=2",
    );
    expect(screen.getByRole("tablist", { name: "Task details tabs" })).toBeInTheDocument();
    for (const name of [
      "Details",
      "Subtasks",
      "Dependencies",
      "Comments",
      "Attachments",
      "Activity",
    ]) {
      expect(screen.getByRole("tab", { name: new RegExp(`^${name}`) })).toBeInTheDocument();
    }
    expect(screen.getByRole("heading", { level: 2, name: "Schedule and focus" })).toBeVisible();

    await expectNoAccessibilityViolations(container);
  });

  it("keeps tab selection keyboard-operable and submits a trimmed comment without an API", async () => {
    const onAdd = vi.fn();
    const { user } = renderWithUser(
      <TaskDetailsScreen
        task={TASK}
        {...READY_CONFIG}
        comments={{ ...READY_CONFIG.comments, comments: [], onAdd }}
        now={NOW}
      />,
    );

    const detailsTab = screen.getByRole("tab", { name: "Details" });
    detailsTab.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: /^Subtasks/ })).toHaveFocus();
    expect(screen.getByRole("heading", { level: 2, name: "Subtasks" })).toBeVisible();

    await user.click(screen.getByRole("tab", { name: "Comments" }));
    const composer = screen.getByRole("textbox", { name: "Add a comment" });
    await user.type(composer, "  Keep the next action explicit.  ");
    await user.keyboard("{Control>}{Enter}{/Control}");

    expect(onAdd).toHaveBeenCalledWith("Keep the next action explicit.");
    expect(composer).toHaveValue("");
  });

  it("renders each composed tab and isolates region failures", () => {
    const { rerender } = renderWithUser(
      <TaskDetailsScreen
        task={TASK}
        selectedTab="subtasks"
        subtasks={{ error: "Saved Subtasks remain unchanged.", onRetry: vi.fn() }}
      />,
    );
    expect(screen.getByText("Subtasks couldn't load")).toBeInTheDocument();

    rerender(
      <TaskDetailsScreen
        task={TASK}
        selectedTab="dependencies"
        dependencies={{ error: "Saved dependencies remain unchanged.", onRetry: vi.fn() }}
      />,
    );
    expect(screen.getByText("Task dependencies couldn't load")).toBeInTheDocument();

    rerender(
      <TaskDetailsScreen
        task={TASK}
        selectedTab="comments"
        comments={{
          status: { type: "error", message: "Task details are still available." },
        }}
      />,
    );
    expect(screen.getByText("Couldn't load comments.")).toBeInTheDocument();

    rerender(
      <TaskDetailsScreen
        task={TASK}
        selectedTab="attachments"
        attachments={{
          enabled: true,
          status: { type: "error", message: "Task details are still available." },
        }}
      />,
    );
    expect(screen.getByText("Attachments couldn't load")).toBeInTheDocument();

    rerender(
      <TaskDetailsScreen
        task={TASK}
        selectedTab="activity"
        activity={{ status: { type: "error", message: "Task details are still available." } }}
      />,
    );
    expect(screen.getByText("Couldn't load activity.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: TASK.title })).toBeInTheDocument();
  });

  it("handles loading, unavailable, service error, and known deleted states", async () => {
    const onReturn = vi.fn();
    const onRetry = vi.fn();
    const { container, rerender, user } = renderWithUser(<TaskDetailsScreen loading />);

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();

    rerender(<TaskDetailsScreen unavailable onReturnToList={onReturn} />);
    await user.click(screen.getByRole("button", { name: "Back to tasks" }));
    expect(onReturn).toHaveBeenCalledTimes(1);

    rerender(
      <TaskDetailsScreen
        error="LifeOS couldn't load this Task right now."
        correlationId="safe-reference"
        onRetry={onRetry}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/safe-reference/)).toBeInTheDocument();

    rerender(
      <TaskDetailsScreen task={{ ...TASK, deletedAt: "2026-08-23T09:00:00Z" }} {...READY_CONFIG} />,
    );
    expect(screen.getByText("This task was deleted")).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();

    await expectNoAccessibilityViolations(container);
  });

  it("keeps confirmed content for background refresh, offline, archived, and empty states", async () => {
    const onRestore = vi.fn();
    const { rerender, user } = renderWithUser(
      <TaskDetailsScreen
        task={TASK}
        {...READY_CONFIG}
        backgroundRefreshing
        offline
        lastUpdatedLabel="10:30"
        selectedTab="comments"
      />,
    );

    expect(screen.getByText("You're offline")).toBeInTheDocument();
    expect(screen.getByText(/Updating Task details/)).toBeInTheDocument();
    expect(screen.getByText("Keep the final decision concise.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: `Actions for ${TASK.title}` }),
    ).not.toBeInTheDocument();

    rerender(
      <TaskDetailsScreen
        task={{ ...TASK, archivedAt: "2026-08-22T10:00:00Z" }}
        header={{ onRestore }}
        selectedTab="subtasks"
      />,
    );
    await user.click(screen.getByRole("button", { name: `Actions for ${TASK.title}` }));
    await user.click(screen.getByRole("menuitem", { name: "Restore task" }));
    expect(onRestore).toHaveBeenCalledTimes(1);
    expect(
      screen
        .getAllByText("This Task is archived. Restore it before making changes.")
        .some((message) => !message.closest("[hidden]")),
    ).toBe(true);

    rerender(
      <TaskDetailsScreen
        task={{ ...TASK, archivedAt: "2026-08-22T10:00:00Z" }}
        selectedTab="comments"
        comments={{
          comments: READY_CONFIG.comments.comments,
          onAdd: vi.fn(),
          onEdit: vi.fn(),
          onDelete: vi.fn(),
        }}
      />,
    );
    expect(screen.queryByRole("textbox", { name: "Add a comment" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Edit comment/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Delete comment/ })).toBeInTheDocument();
    expect(
      screen.getByText(/Restore it to add or edit comments.*still delete a comment permanently/),
    ).toBeInTheDocument();

    rerender(<TaskDetailsScreen task={TASK} selectedTab="comments" />);
    expect(screen.getByText("No comments yet")).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Attachments" })).not.toBeInTheDocument();
  });

  it("normalizes a gated-off Attachments deep link back to Details", () => {
    renderWithUser(<TaskDetailsScreen task={TASK} selectedTab="attachments" />);

    expect(screen.getByRole("tab", { name: "Details" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("tab", { name: "Attachments" })).not.toBeInTheDocument();
  });
});
