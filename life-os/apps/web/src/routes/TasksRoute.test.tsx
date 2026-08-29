import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as projectsFeature from "@features/projects";
import * as tasksFeature from "@features/tasks";
import { AuthSessionContext, type AuthSessionValue } from "@state/authSession";
import { ToastProvider } from "@state/ToastProvider";

import { TasksRoute } from "./TasksRoute";

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
    useCreateTask: vi.fn(),
    useUpdateTask: vi.fn(),
    useCompleteTask: vi.fn(),
    useChangeTaskStatus: vi.fn(),
    useArchiveTask: vi.fn(),
    useRestoreTask: vi.fn(),
    useDeleteTask: vi.fn(),
    useDuplicateTask: vi.fn(),
    useToggleTaskMit: vi.fn(),
    useBulkTaskAction: vi.fn(),
    IntegratedTaskDetails: (props: {
      readonly taskId: string;
      readonly backHref: string;
      readonly selectedTab: string;
    }) => (
      <div
        role="dialog"
        aria-label="Integrated task details"
        data-task-id={props.taskId}
        data-back-href={props.backHref}
        data-selected-tab={props.selectedTab}
      />
    ),
  };
});

const mockUseProjects = vi.mocked(projectsFeature.useProjects);
const mockUseTasks = vi.mocked(tasksFeature.useTasks);
const mockUseTaskLabels = vi.mocked(tasksFeature.useTaskLabels);
const mockUseCreateTask = vi.mocked(tasksFeature.useCreateTask);
const mockUseUpdateTask = vi.mocked(tasksFeature.useUpdateTask);
const mockUseCompleteTask = vi.mocked(tasksFeature.useCompleteTask);
const mockUseChangeTaskStatus = vi.mocked(tasksFeature.useChangeTaskStatus);
const mockUseArchiveTask = vi.mocked(tasksFeature.useArchiveTask);
const mockUseRestoreTask = vi.mocked(tasksFeature.useRestoreTask);
const mockUseDeleteTask = vi.mocked(tasksFeature.useDeleteTask);
const mockUseDuplicateTask = vi.mocked(tasksFeature.useDuplicateTask);
const mockUseToggleTaskMit = vi.mocked(tasksFeature.useToggleTaskMit);
const mockUseBulkTaskAction = vi.mocked(tasksFeature.useBulkTaskAction);

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
  const mutateAsync = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    mockUseProjects.mockReturnValue({
      data: { items: [], page: null, summary: null },
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
    mockUseCreateTask.mockReturnValue({ mutateAsync, isPending: false, error: null } as never);
    mockUseUpdateTask.mockReturnValue({ mutateAsync, isPending: false, error: null } as never);
    mockUseCompleteTask.mockReturnValue({ mutateAsync } as never);
    mockUseChangeTaskStatus.mockReturnValue({ mutateAsync } as never);
    mockUseArchiveTask.mockReturnValue({ mutateAsync } as never);
    mockUseRestoreTask.mockReturnValue({ mutateAsync } as never);
    mockUseDeleteTask.mockReturnValue({ mutateAsync } as never);
    mockUseDuplicateTask.mockReturnValue({ mutateAsync } as never);
    mockUseToggleTaskMit.mockReturnValue({ mutateAsync } as never);
    mockUseBulkTaskAction.mockReturnValue({ mutateAsync } as never);
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

  it("opens the list-context sheet without replacing list state", async () => {
    const user = userEvent.setup();
    renderTasksRoute(["/life-os/app/tasks?priority=P1"]);

    await user.click(screen.getByRole("button", { name: "Prepare weekly review" }));

    expect(await screen.findByRole("dialog", { name: "Integrated task details" })).toHaveAttribute(
      "data-back-href",
      "/life-os/app/tasks?priority=P1",
    );
    expect(screen.getByRole("heading", { name: "Tasks", level: 1 })).toBeInTheDocument();
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
});
