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
});
