import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { screen, waitFor } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { IntegratedTaskDetails } from "./IntegratedTaskDetails";

const mocks = vi.hoisted(() => ({
  getTaskDetail: vi.fn(),
  queryTasks: vi.fn(),
  listLabels: vi.fn(),
  addSubtask: vi.fn(),
  updateTask: vi.fn(),
  useComments: vi.fn(),
  useCommentMutations: vi.fn(),
  addComment: vi.fn(),
  editComment: vi.fn(),
  deleteComment: vi.fn(),
  refetchComments: vi.fn(),
}));

vi.mock("@features/comments", () => ({
  useComments: mocks.useComments,
  useCommentMutations: mocks.useCommentMutations,
}));

vi.mock("@features/projects", () => ({
  useProjects: () => ({
    data: {
      items: [{ id: "project-1", name: "Learning plan" }],
      page: null,
      summary: null,
    },
    isPending: false,
  }),
}));

vi.mock("../api/tasksApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/tasksApi")>();
  return {
    ...actual,
    getTaskDetail: mocks.getTaskDetail,
    queryTasks: mocks.queryTasks,
    listLabels: mocks.listLabels,
    addSubtask: mocks.addSubtask,
    updateTask: mocks.updateTask,
  };
});

const DETAIL = {
  task: {
    id: "task-1",
    title: "Prepare weekly review",
    description: "Gather the confirmed decisions.",
    status: "IN_PROGRESS" as const,
    priority: "P1" as const,
    project: { id: "project-1", name: "Project" },
    dueAt: "2026-08-24T12:00:00Z",
    estimateMinutes: 90,
    spentMinutes: 35,
    progress: 50,
    mitDate: null,
    isMit: false,
    commentCount: 3,
    blockerCount: 1,
    overdue: false,
    archivedAt: null,
    deletedAt: null,
    labelIds: ["label-1"],
    version: 7,
    createdAt: "2026-08-20T08:00:00Z",
    updatedAt: "2026-08-23T08:00:00Z",
  },
  subtasks: [
    { id: "subtask-1", title: "Collect notes", completed: false, position: 0, version: 1 },
  ],
  blockers: [
    {
      id: "task-blocker",
      title: "Confirm review inputs",
      status: "TO_DO" as const,
      priority: "P2" as const,
      href: "/life-os/app/tasks/task-blocker",
    },
  ],
  dependents: [],
  counts: {
    linkedTimeBlockCount: 0,
    focusSessionCount: 2,
    commentCount: 3,
    attachmentCount: 0,
    activityEventCount: 4,
  },
  version: 7,
};

function renderIntegrated(props: Partial<ComponentProps<typeof IntegratedTaskDetails>> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { readonly children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderWithUser(
    <IntegratedTaskDetails
      taskId="task-1"
      backHref="/life-os/app/tasks?status=IN_PROGRESS&page=2"
      locale="en-US"
      timeZone="UTC"
      authorId="user-1"
      authorName="Test User"
      onNavigate={vi.fn()}
      {...props}
    />,
    { wrapper: Wrapper },
  );
}

describe("IntegratedTaskDetails", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getTaskDetail.mockResolvedValue(DETAIL);
    mocks.queryTasks.mockResolvedValue({
      items: [],
      page: { items: [], page: 0, size: 20, totalItems: 0, totalPages: 0 },
      summary: { total: 0, toDo: 0, inProgress: 0, done: 0, blocked: 0, overdue: 0 },
    });
    mocks.listLabels.mockResolvedValue([{ id: "label-1", name: "Learning" }]);
    mocks.addSubtask.mockResolvedValue({});
    mocks.updateTask.mockResolvedValue(DETAIL.task);
    mocks.useComments.mockImplementation(
      (_parentType, _parentId, _page, _pageSize, enabled: boolean) => ({
        data: enabled ? { items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 } : undefined,
        isPending: enabled,
        isError: false,
        error: null,
        refetch: mocks.refetchComments,
      }),
    );
    mocks.useCommentMutations.mockReturnValue({
      add: { mutateAsync: mocks.addComment, isPending: false, error: null },
      edit: { mutateAsync: mocks.editComment, isPending: false, error: null },
      remove: { mutateAsync: mocks.deleteComment, isPending: false, error: null },
    });
    mocks.addComment.mockResolvedValue({});
    mocks.editComment.mockResolvedValue({});
    mocks.deleteComment.mockResolvedValue(undefined);
  });

  it("renders the aggregate, exact return context, counts, and optional Files gate accessibly", async () => {
    const { container } = renderIntegrated();

    expect(
      await screen.findByRole("heading", { level: 1, name: "Prepare weekly review" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tasks" })).toHaveAttribute(
      "href",
      "/life-os/app/tasks?status=IN_PROGRESS&page=2",
    );
    expect(screen.getByText("Learning plan")).toBeInTheDocument();
    expect(screen.getByText("Learning")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Comments.*3 comments/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Activity.*4 activity events/ })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /Attachments/ })).not.toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });

  it("wires Subtask writes to the canonical mutation and refresh boundary", async () => {
    const { user } = renderIntegrated({ selectedTab: "subtasks" });
    await screen.findByRole("heading", { level: 2, name: "Subtasks" });

    await user.type(screen.getByRole("textbox", { name: "Subtask title" }), "Draft decisions");
    await user.click(screen.getByRole("button", { name: "Add subtask" }));

    await waitFor(() => expect(mocks.addSubtask).toHaveBeenCalledWith("task-1", "Draft decisions"));
    await waitFor(() => expect(mocks.getTaskDetail).toHaveBeenCalledTimes(2));
  });

  it("wires edit with the aggregate version and routes Schedule and Focus actions", async () => {
    const onNavigate = vi.fn();
    const { user } = renderIntegrated({ onNavigate });
    await screen.findByRole("heading", { level: 1, name: "Prepare weekly review" });

    await user.click(screen.getByRole("button", { name: "Actions for Prepare weekly review" }));
    await user.click(screen.getByRole("menuitem", { name: "Edit task" }));
    const title = screen.getByRole("textbox", { name: "Task title" });
    await user.clear(title);
    await user.type(title, "Prepare monthly review");
    await user.click(screen.getByRole("button", { name: "Save task" }));

    await waitFor(() =>
      expect(mocks.updateTask).toHaveBeenCalledWith(
        "task-1",
        expect.objectContaining({ title: "Prepare monthly review", version: 7 }),
      ),
    );

    await user.click(screen.getByRole("button", { name: "Schedule" }));
    expect(onNavigate).toHaveBeenCalledWith("/life-os/app/time-blocks?taskId=task-1");

    await user.click(screen.getByRole("button", { name: "Start focus" }));
    expect(onNavigate).toHaveBeenCalledWith("/life-os/app/focus?taskId=task-1");
  });

  it("renders paginated Task comments as text and sends the current edit version", async () => {
    const unsafeBody = '<img src=x onerror="alert(1)">';
    mocks.useComments.mockReturnValue({
      data: {
        items: [
          {
            id: "comment-1",
            authorId: "user-1",
            parentType: "TASK",
            parentId: "task-1",
            body: unsafeBody,
            format: "PLAIN_TEXT",
            createdAt: "2026-08-23T08:00:00Z",
            updatedAt: "2026-08-23T08:00:00Z",
            editedAt: null,
            version: 5,
            canEdit: true,
            canDelete: true,
          },
        ],
        page: 1,
        pageSize: 20,
        total: 21,
        totalPages: 2,
      },
      isPending: false,
      isError: false,
      error: null,
      refetch: mocks.refetchComments,
    });
    const { user, container } = renderIntegrated({ selectedTab: "comments" });

    expect(await screen.findByText(unsafeBody)).toBeInTheDocument();
    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Task comments pagination" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit comment by Test User" }));
    const editor = screen.getByRole("textbox", { name: "Edit comment" });
    await user.clear(editor);
    await user.type(editor, "Revised decision");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mocks.editComment).toHaveBeenCalledWith({
      id: "comment-1",
      body: "Revised decision",
      version: 5,
    });
  });

  it("shows an optimistic pending row while a new Task comment is unconfirmed", async () => {
    let resolveAdd: (() => void) | undefined;
    mocks.addComment.mockReturnValue(
      new Promise((resolve) => {
        resolveAdd = () => resolve({});
      }),
    );
    const { user } = renderIntegrated({ selectedTab: "comments" });
    await screen.findByRole("heading", { level: 2, name: "Comments" });

    await user.type(screen.getByRole("textbox", { name: "Add a comment" }), "Pending decision");
    await user.click(screen.getByRole("button", { name: "Add comment" }));

    expect(await screen.findByRole("list", { name: "Task comments" })).toHaveTextContent(
      "Pending decision",
    );
    expect(screen.getByText("(Posting…)")).toBeInTheDocument();
    resolveAdd?.();
    await waitFor(() => expect(screen.queryByText("(Posting…)")).not.toBeInTheDocument());
  });
});
