import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as projectsFeature from "@features/projects";
import * as tasksFeature from "@features/tasks";
import { AuthSessionContext, type AuthSessionValue } from "@state/authSession";
import { ToastProvider } from "@state/ToastProvider";

import { TasksRoute } from "./TasksRoute";

const routeMocks = vi.hoisted(() => ({
  createMutate: vi.fn().mockResolvedValue({ id: "task-1" }),
  createSeriesMutate: vi.fn().mockResolvedValue({ id: "series-1" }),
  updateMutate: vi.fn().mockResolvedValue({ id: "task-1" }),
  completeMutate: vi.fn().mockResolvedValue({ id: "task-1" }),
  changeStatusMutate: vi.fn().mockResolvedValue({ id: "task-1" }),
  archiveMutate: vi.fn().mockResolvedValue({ id: "task-1" }),
  restoreMutate: vi.fn().mockResolvedValue({ id: "task-1" }),
  deleteMutate: vi.fn().mockResolvedValue(undefined),
  duplicateMutate: vi.fn().mockResolvedValue({ id: "task-2" }),
  mitMutate: vi.fn().mockResolvedValue({ id: "task-1" }),
  bulkMutate: vi.fn().mockResolvedValue({ succeeded: 2, failed: [], outcome: "UPDATED" }),
}));

vi.mock("@features/projects", async () => {
  const actual = await vi.importActual<typeof projectsFeature>("@features/projects");
  return {
    ...actual,
    useProjects: vi.fn(),
  };
});

vi.mock("@features/tasks", async () => {
  const actual = await vi.importActual<typeof tasksFeature>("@features/tasks");
  return {
    ...actual,
    useTasks: vi.fn(),
    useTaskLabels: vi.fn(),
    useCreateTask: () => ({ mutateAsync: routeMocks.createMutate, isPending: false, error: null }),
    useCreateRecurringSeries: () => ({
      mutateAsync: routeMocks.createSeriesMutate,
      isPending: false,
      error: null,
    }),
    useUpdateTask: () => ({ mutateAsync: routeMocks.updateMutate, isPending: false, error: null }),
    useCompleteTask: () => ({ mutateAsync: routeMocks.completeMutate }),
    useChangeTaskStatus: () => ({ mutateAsync: routeMocks.changeStatusMutate }),
    useArchiveTask: () => ({ mutateAsync: routeMocks.archiveMutate }),
    useRestoreTask: () => ({ mutateAsync: routeMocks.restoreMutate }),
    useDeleteTask: () => ({ mutateAsync: routeMocks.deleteMutate }),
    useDuplicateTask: () => ({ mutateAsync: routeMocks.duplicateMutate }),
    useToggleTaskMit: () => ({ mutateAsync: routeMocks.mitMutate }),
    useBulkTaskAction: () => ({ mutateAsync: routeMocks.bulkMutate }),
    IntegratedTaskDetails: (props: {
      readonly taskId: string;
      readonly backHref: string;
      readonly selectedTab: string;
      readonly onClose: () => void;
      readonly onTabChange: (tab: string) => void;
      readonly onDeleted: () => void;
      readonly onMutationSuccess: (msg: string) => void;
    }) => (
      <div
        role="dialog"
        aria-label="Integrated task details"
        data-task-id={props.taskId}
        data-back-href={props.backHref}
        data-selected-tab={props.selectedTab}
      >
        <button type="button" onClick={props.onClose}>
          Close Details
        </button>
        <button type="button" onClick={() => props.onTabChange("activity")}>
          Switch Tab Activity
        </button>
        <button type="button" onClick={props.onDeleted}>
          Notify Deleted
        </button>
        <button type="button" onClick={() => props.onMutationSuccess("Mutation success message")}>
          Notify Success
        </button>
      </div>
    ),
  };
});

const mockUseProjects = vi.mocked(projectsFeature.useProjects);
const mockUseTasks = vi.mocked(tasksFeature.useTasks);
const mockUseTaskLabels = vi.mocked(tasksFeature.useTaskLabels);

const MOCK_USER = {
  id: "user-1",
  email: "test@example.com",
  displayName: "Test User",
  timeZone: "UTC",
  locale: "en-US",
  weekStart: 1,
};

const MOCK_AUTH_STATE: AuthSessionValue = {
  user: MOCK_USER,
  csrfToken: "mock-csrf-token",
  isBootstrapping: false,
  setSession: vi.fn(),
  clearSession: vi.fn(),
};

const MOCK_TASK: tasksFeature.TaskRecord = {
  id: "task-weekly-review",
  title: "Prepare weekly review",
  description: "Gather open Tasks.",
  status: "IN_PROGRESS",
  priority: "P1",
  project: { id: "project-life-os", name: "LifeOS", href: "/life-os/app/projects/project-life-os" },
  dueAt: "2026-08-22T12:00:00Z",
  estimateMinutes: 90,
  progress: 40,
  mitDate: "2026-08-21",
  isMit: true,
  commentCount: 0,
  blockerCount: 0,
  overdue: false,
  archivedAt: null,
  labelIds: [],
  version: 3,
  createdAt: "2026-08-18T09:00:00Z",
  updatedAt: "2026-08-21T08:00:00Z",
  href: "/life-os/app/tasks/task-weekly-review",
};

function renderTasksRoute(initialEntries = ["/life-os/app/tasks"]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthSessionContext.Provider value={MOCK_AUTH_STATE}>
          <MemoryRouter initialEntries={initialEntries}>
            <Routes>
              <Route path="/life-os/app/tasks" element={<TasksRoute />} />
            </Routes>
          </MemoryRouter>
        </AuthSessionContext.Provider>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe("TasksRoute", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUseProjects.mockReturnValue({
      data: {
        items: [{ id: "project-life-os", name: "LifeOS" }],
        page: null,
        summary: null,
      },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);
    mockUseTaskLabels.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
      error: null,
    } as never);
    mockUseTasks.mockReturnValue({
      data: {
        items: [MOCK_TASK],
        page: { items: [], page: 0, size: 10, totalItems: 1, totalPages: 1 },
        summary: { total: 1, toDo: 0, inProgress: 1, done: 0, blocked: 0, overdue: 0 },
      },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);
  });

  it("renders the Tasks screen from API data", () => {
    renderTasksRoute();

    expect(screen.getByRole("heading", { name: "Tasks", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Prepare weekly review" })).toBeInTheDocument();
  });

  it("passes URL filters to useTasks", () => {
    renderTasksRoute(["/life-os/app/tasks?status=TO_DO&q=review&priority=P1&page=2"]);

    expect(mockUseTasks).toHaveBeenCalledWith(
      expect.objectContaining({
        q: "review",
        status: ["TO_DO"],
        priority: ["P1"],
        archived: false,
        page: 1,
        size: 10,
      }),
      true,
      expect.any(Map),
    );
  });

  it("writes status filters into the URL from a tab", async () => {
    const user = userEvent.setup();
    renderTasksRoute();

    await user.click(screen.getByRole("tab", { name: "In progress" }));

    await waitFor(() => {
      expect(mockUseTasks).toHaveBeenCalledWith(
        expect.objectContaining({ status: ["IN_PROGRESS"] }),
        true,
        expect.any(Map),
      );
    });
  });

  it("refreshes into the integrated sheet with exact list context and selected tab", () => {
    renderTasksRoute([
      "/life-os/app/tasks?status=IN_PROGRESS&q=review&page=2&selected=task-weekly-review&taskTab=subtasks",
    ]);

    expect(screen.getByRole("dialog", { name: "Integrated task details" })).toHaveAttribute(
      "data-task-id",
      "task-weekly-review",
    );
    expect(screen.getByRole("dialog", { name: "Integrated task details" })).toHaveAttribute(
      "data-back-href",
      "/life-os/app/tasks?status=IN_PROGRESS&q=review&page=2",
    );
    expect(screen.getByRole("dialog", { name: "Integrated task details" })).toHaveAttribute(
      "data-selected-tab",
      "subtasks",
    );
  });

  it("handles details sheet tab changes, close, and deletion notifications", async () => {
    const user = userEvent.setup();
    renderTasksRoute(["/life-os/app/tasks?selected=task-weekly-review"]);

    expect(screen.getByRole("dialog", { name: "Integrated task details" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Switch Tab Activity" }));
    await user.click(screen.getByRole("button", { name: "Notify Success" }));
    await user.click(screen.getByRole("button", { name: "Notify Deleted" }));

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Integrated task details" }),
      ).not.toBeInTheDocument();
    });
  });

  it("handles details sheet close button", async () => {
    const user = userEvent.setup();
    renderTasksRoute(["/life-os/app/tasks?selected=task-weekly-review"]);

    await user.click(screen.getByRole("button", { name: "Close Details" }));
    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Integrated task details" }),
      ).not.toBeInTheDocument();
    });
  });

  it("renders the loading state while the query is pending", () => {
    mockUseTasks.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    renderTasksRoute();

    expect(screen.getByText("Loading Tasks…")).toBeInTheDocument();
  });

  it("renders the list error state and retries from the screen", async () => {
    const refetch = vi.fn();
    mockUseTasks.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error("The task list is temporarily unavailable."),
      refetch,
    } as never);

    const user = userEvent.setup();
    renderTasksRoute();

    expect(screen.getByText("Couldn't load this list.")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Try again" })[0]!);
    expect(refetch).toHaveBeenCalled();
  });

  it("creates a non-recurring task when task form submits normal task", async () => {
    const user = userEvent.setup();
    renderTasksRoute();

    await user.click(screen.getAllByRole("button", { name: /Add task/i })[0]!);
    await user.type(screen.getByLabelText("Task title"), "One-off Task");
    const dialog = screen.getByRole("dialog", { name: "Create task" });
    await user.click(within(dialog).getByRole("button", { name: "Add task" }));

    expect(routeMocks.createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ title: "One-off Task" }),
    );
  });

  it("creates a recurring task series when task form submits recurring rule", async () => {
    const user = userEvent.setup();
    renderTasksRoute();

    await user.click(screen.getAllByRole("button", { name: /Add task/i })[0]!);
    await user.type(screen.getByLabelText("Task title"), "Daily Review");
    await user.click(screen.getByRole("checkbox", { name: /Repeat this task/ }));
    const dialog = screen.getByRole("dialog", { name: "Create task" });
    await user.click(within(dialog).getByRole("button", { name: "Add task" }));

    expect(routeMocks.createSeriesMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Daily Review",
        frequency: "DAILY",
        timeZone: "UTC",
      }),
    );
  });
});
