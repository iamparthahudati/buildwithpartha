import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProjectDetailsRoute } from "./ProjectDetailsRoute";
import * as projectsFeature from "@features/projects";
import * as tasksFeature from "@features/tasks";
import { AuthSessionContext, type AuthSessionValue } from "@state/authSession";

const commentMocks = vi.hoisted(() => ({
  useComments: vi.fn(),
  useCommentMutations: vi.fn(),
  add: vi.fn(),
  edit: vi.fn(),
  remove: vi.fn(),
  refetch: vi.fn(),
}));

const activityMocks = vi.hoisted(() => ({
  useActivity: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock("@features/activity", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@features/activity")>();
  return { ...actual, useActivity: activityMocks.useActivity };
});

vi.mock("@features/comments", () => ({
  useComments: commentMocks.useComments,
  useCommentMutations: commentMocks.useCommentMutations,
}));

vi.mock("@features/projects", async () => {
  const actual = await vi.importActual<typeof projectsFeature>("@features/projects");
  return {
    ...actual,
    ProjectDetailsScreen: (props: any) => {
      (globalThis as any).__lastDetailsProps = props;
      if (props.loading) return <div data-testid="loading">Loading...</div>;
      if (props.notFound) return <div>Project not found</div>;
      if (props.forbidden) return <div>Access denied</div>;
      if (props.error)
        return (
          <div>
            <span>Failed to load project details</span>
            <span>{String(props.error.message || props.error)}</span>
          </div>
        );
      return (
        <div data-testid="project-details-screen">
          <h1>{props.project?.name}</h1>
          <div role="tablist" aria-label="Project details tabs">
            <button
              role="tab"
              aria-selected={props.selectedTab === "overview"}
              onClick={() => props.onTabChange?.("overview")}
            >
              Overview
            </button>
            <button
              role="tab"
              aria-selected={props.selectedTab === "timeline"}
              onClick={() => props.onTabChange?.("timeline")}
            >
              Timeline
            </button>
            <button
              role="tab"
              aria-selected={props.selectedTab === "tasks"}
              onClick={() => props.onTabChange?.("tasks")}
            >
              Tasks
            </button>
          </div>
        </div>
      );
    },
    useProjectDetail: vi.fn(),
    useCreateMilestone: vi.fn(),
    useUpdateMilestone: vi.fn(),
    useUpdateMilestoneStatus: vi.fn(),
    useDeleteMilestone: vi.fn(),
    useArchiveProject: vi.fn(),
    useRestoreProject: vi.fn(),
    useDeleteProject: vi.fn(),
  };
});

vi.mock("@features/tasks", async () => {
  const actual = await vi.importActual<typeof tasksFeature>("@features/tasks");
  return {
    ...actual,
    useTasks: vi.fn(),
  };
});

const mockUseProjectDetail = vi.mocked(projectsFeature.useProjectDetail);
const mockUseTasks = vi.mocked(tasksFeature.useTasks);
const mockUseCreateMilestone = vi.mocked(projectsFeature.useCreateMilestone);
const mockUseUpdateMilestone = vi.mocked(projectsFeature.useUpdateMilestone);
const mockUseUpdateMilestoneStatus = vi.mocked(projectsFeature.useUpdateMilestoneStatus);
const mockUseDeleteMilestone = vi.mocked(projectsFeature.useDeleteMilestone);
const mockUseArchiveProject = vi.mocked(projectsFeature.useArchiveProject);
const mockUseRestoreProject = vi.mocked(projectsFeature.useRestoreProject);
const mockUseDeleteProject = vi.mocked(projectsFeature.useDeleteProject);

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

const MOCK_PROJECT: projectsFeature.Project = {
  id: "proj-123",
  name: "Launch Platform v1",
  description: "Deploy foundations",
  status: "ACTIVE",
  priority: "P1",
  health: "ON_TRACK",
  color: "blue",
  icon: "rocket",
  startDate: "2026-08-01",
  deadlineDate: "2026-08-30",
  completedTasksCount: 0,
  totalTasksCount: 0,
  updatedAt: "2026-08-20T12:00:00Z",
  version: 1,
};

const EMPTY_TASKS_QUERY = {
  data: {
    items: [],
    page: { items: [], page: 0, size: 100, totalItems: 0, totalPages: 0 },
    summary: { total: 0, toDo: 0, inProgress: 0, blocked: 0, done: 0, overdue: 0 },
  },
  isPending: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
};

const DONE_TASKS_QUERY = {
  data: {
    items: [],
    page: { items: [], page: 0, size: 1, totalItems: 0, totalPages: 0 },
    summary: { total: 0, toDo: 0, inProgress: 0, blocked: 0, done: 0, overdue: 0 },
  },
  isPending: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
};

function mockProjectTasksQueries() {
  mockUseTasks.mockImplementation((params) => {
    if (params?.status?.includes("DONE")) {
      return DONE_TASKS_QUERY as unknown as ReturnType<typeof tasksFeature.useTasks>;
    }
    return EMPTY_TASKS_QUERY as unknown as ReturnType<typeof tasksFeature.useTasks>;
  });
}

function renderRoute(initialPath = "/life-os/app/projects/proj-123") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return {
    user: userEvent.setup(),
    ...render(
      <AuthSessionContext.Provider value={MOCK_AUTH_STATE}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[initialPath]}>
            <Routes>
              <Route path="/life-os/app/projects/:projectId" element={<ProjectDetailsRoute />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </AuthSessionContext.Provider>,
    ),
  };
}

describe("ProjectDetailsRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProjectTasksQueries();
    commentMocks.useComments.mockReturnValue({
      data: { items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 },
      isPending: false,
      isError: false,
      error: null,
      refetch: commentMocks.refetch,
    });
    commentMocks.useCommentMutations.mockReturnValue({
      add: { mutateAsync: commentMocks.add, isPending: false, error: null },
      edit: { mutateAsync: commentMocks.edit, isPending: false, error: null },
      remove: { mutateAsync: commentMocks.remove, isPending: false, error: null },
    });
    commentMocks.add.mockResolvedValue({});
    commentMocks.edit.mockResolvedValue({});
    commentMocks.remove.mockResolvedValue(undefined);
    activityMocks.useActivity.mockReturnValue({
      data: {
        items: [],
        page: 0,
        size: 20,
        totalItems: 0,
        totalPages: 0,
      },
      isPending: false,
      isError: false,
      refetch: activityMocks.refetch,
    });

    mockUseCreateMilestone.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof projectsFeature.useCreateMilestone>);
    mockUseUpdateMilestone.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof projectsFeature.useUpdateMilestone>);
    mockUseUpdateMilestoneStatus.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof projectsFeature.useUpdateMilestoneStatus>);
    mockUseDeleteMilestone.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof projectsFeature.useDeleteMilestone>);
    mockUseArchiveProject.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof projectsFeature.useArchiveProject>);
    mockUseRestoreProject.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof projectsFeature.useRestoreProject>);
    mockUseDeleteProject.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof projectsFeature.useDeleteProject>);
  });

  it("renders loading state when project details are loading", () => {
    mockUseProjectDetail.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof projectsFeature.useProjectDetail>);

    renderRoute();

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("renders project details screen when data is loaded", () => {
    mockUseProjectDetail.mockReturnValue({
      data: { project: MOCK_PROJECT, milestones: [] },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof projectsFeature.useProjectDetail>);

    renderRoute();

    expect(
      screen.getByRole("heading", { level: 1, name: "Launch Platform v1" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: "Project details tabs" })).toBeInTheDocument();
  });

  it("renders error state when fetch fails with error", () => {
    mockUseProjectDetail.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Network error"),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof projectsFeature.useProjectDetail>);

    renderRoute();

    expect(screen.getByText("Failed to load project details")).toBeInTheDocument();
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("handles tab switching and renders tab specified in URL", async () => {
    mockUseProjectDetail.mockReturnValue({
      data: { project: MOCK_PROJECT, milestones: [] },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof projectsFeature.useProjectDetail>);

    const { user } = renderRoute("/life-os/app/projects/proj-123?tab=timeline");

    expect(screen.getByRole("tab", { name: "Timeline", selected: true })).toBeInTheDocument();

    const tasksTab = screen.getByRole("tab", { name: "Tasks" });
    await user.click(tasksTab);
    expect(tasksTab).toHaveAttribute("aria-selected", "true");
  });

  it("handles notFound 404 and forbidden 403 errors", () => {
    mockUseProjectDetail.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("404 Not Found"),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof projectsFeature.useProjectDetail>);

    const { rerender } = renderRoute();
    expect(screen.getByText("Project not found")).toBeInTheDocument();

    mockUseProjectDetail.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("403 Forbidden"),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof projectsFeature.useProjectDetail>);

    rerender(
      <AuthSessionContext.Provider value={MOCK_AUTH_STATE}>
        <QueryClientProvider
          client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
        >
          <MemoryRouter initialEntries={["/life-os/app/projects/proj-123"]}>
            <Routes>
              <Route path="/life-os/app/projects/:projectId" element={<ProjectDetailsRoute />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </AuthSessionContext.Provider>,
    );

    expect(screen.getByText("Access denied")).toBeInTheDocument();
  });

  it("invokes mutation handlers and navigation callbacks", async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({});
    mockUseCreateMilestone.mockReturnValue({ mutateAsync: mockMutateAsync } as any);
    mockUseUpdateMilestone.mockReturnValue({ mutateAsync: mockMutateAsync } as any);
    mockUseUpdateMilestoneStatus.mockReturnValue({ mutateAsync: mockMutateAsync } as any);
    mockUseDeleteMilestone.mockReturnValue({ mutateAsync: mockMutateAsync } as any);
    mockUseArchiveProject.mockReturnValue({ mutateAsync: mockMutateAsync } as any);
    mockUseRestoreProject.mockReturnValue({ mutateAsync: mockMutateAsync } as any);
    mockUseDeleteProject.mockReturnValue({ mutateAsync: mockMutateAsync } as any);

    mockUseProjectDetail.mockReturnValue({
      data: {
        project: MOCK_PROJECT,
        milestones: [{ id: "m-1", title: "M1", version: 1 }],
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderRoute();

    const props = (globalThis as Record<string, any>).__lastDetailsProps;
    expect(props).toBeDefined();

    await props.onAddMilestone({ title: "New M" });
    await props.onUpdateMilestone("m-1", { title: "Updated M" });
    await props.onMilestoneStatusChange("m-1", "COMPLETED");
    await props.onDeleteMilestone("m-1");
    await props.onArchiveProject();
    await props.onRestoreProject();
    await props.onDeleteProject();
    props.onGoBack();

    expect(mockMutateAsync).toHaveBeenCalled();
  });

  it("loads project-scoped tasks and passes them to the details screen", () => {
    mockUseTasks.mockImplementation((params) => {
      if (params?.status?.includes("DONE")) {
        return {
          ...DONE_TASKS_QUERY,
          data: {
            ...DONE_TASKS_QUERY.data,
            page: { ...DONE_TASKS_QUERY.data.page, totalItems: 0 },
          },
        } as unknown as ReturnType<typeof tasksFeature.useTasks>;
      }

      return {
        ...EMPTY_TASKS_QUERY,
        data: {
          items: [
            {
              id: "task-1",
              title: "Draft outline",
              description: null,
              status: "TO_DO",
              priority: "P2",
              project: { id: "proj-123", name: "Launch Platform v1" },
              dueAt: null,
              estimateMinutes: null,
              progress: 0,
              mitDate: null,
              isMit: false,
              commentCount: 0,
              blockerCount: 0,
              overdue: false,
              archivedAt: null,
              labelIds: [],
              version: 1,
              createdAt: "2026-08-21T08:00:00Z",
              updatedAt: "2026-08-21T08:00:00Z",
              href: "/life-os/app/tasks/task-1",
            },
          ],
          page: {
            items: [],
            page: 0,
            size: 100,
            totalItems: 1,
            totalPages: 1,
          },
          summary: EMPTY_TASKS_QUERY.data.summary,
        },
      } as unknown as ReturnType<typeof tasksFeature.useTasks>;
    });

    mockUseProjectDetail.mockReturnValue({
      data: { project: MOCK_PROJECT, milestones: [] },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof projectsFeature.useProjectDetail>);

    renderRoute();

    const props = (globalThis as Record<string, any>).__lastDetailsProps;
    expect(props.topTasks).toEqual([
      expect.objectContaining({
        id: "task-1",
        title: "Draft outline",
        status: "PLANNED",
        priority: "P2",
      }),
    ]);
    expect(props.tasksTotalCount).toBe(1);
    expect(props.project.totalTasksCount).toBe(1);
  });

  it("maps the paginated Comment API and forwards versioned edit/delete writes", async () => {
    commentMocks.useComments.mockReturnValue({
      data: {
        items: [
          {
            id: "comment-1",
            authorId: "user-1",
            parentType: "PROJECT",
            parentId: "proj-123",
            body: '<script>alert("unsafe")</script>',
            format: "PLAIN_TEXT",
            createdAt: "2026-08-23T08:00:00Z",
            updatedAt: "2026-08-23T08:00:00Z",
            editedAt: null,
            version: 4,
            canEdit: true,
            canDelete: true,
          },
        ],
        page: 2,
        pageSize: 20,
        total: 21,
        totalPages: 2,
      },
      isPending: false,
      isError: false,
      error: null,
      refetch: commentMocks.refetch,
    });
    mockUseProjectDetail.mockReturnValue({
      data: { project: MOCK_PROJECT, milestones: [] },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof projectsFeature.useProjectDetail>);

    renderRoute("/life-os/app/projects/proj-123?tab=notes");
    const props = (globalThis as Record<string, any>).__lastDetailsProps;

    expect(props.comments).toEqual([
      expect.objectContaining({
        id: "comment-1",
        authorName: "Test User",
        body: '<script>alert("unsafe")</script>',
      }),
    ]);
    expect(props.commentsTotal).toBe(21);
    expect(props.commentsPage).toBe(2);

    props.onEditComment("comment-1", "Revised");
    props.onDeleteComment("comment-1");
    await vi.waitFor(() => {
      expect(commentMocks.edit).toHaveBeenCalledWith({
        id: "comment-1",
        body: "Revised",
        version: 4,
      });
      expect(commentMocks.remove).toHaveBeenCalledWith({ id: "comment-1", version: 4 });
    });
  });

  it("maps Project Activity, exposes filtering, and converts pagination to one-based UI state", () => {
    activityMocks.useActivity.mockReturnValue({
      data: {
        items: [
          {
            id: "activity-1",
            actorUserId: "user-1",
            eventType: "TASK_UPDATED",
            object: {
              type: "TASK",
              id: "task-1",
              label: "Draft outline",
              href: "/life-os/app/tasks/task-1",
            },
            occurredAt: "2026-08-23T08:00:00Z",
          },
        ],
        page: 1,
        size: 20,
        totalItems: 21,
        totalPages: 2,
      },
      isPending: false,
      isError: false,
      refetch: activityMocks.refetch,
    });
    mockUseProjectDetail.mockReturnValue({
      data: { project: MOCK_PROJECT, milestones: [] },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof projectsFeature.useProjectDetail>);

    renderRoute("/life-os/app/projects/proj-123?tab=activity");
    const props = (globalThis as Record<string, any>).__lastDetailsProps;

    expect(activityMocks.useActivity).toHaveBeenCalledWith("PROJECT", "proj-123", 0, 20, true);
    expect(props.activityEvents).toEqual([
      expect.objectContaining({ actorName: "Test User", action: "updated" }),
    ]);
    expect(props.activityPage).toBe(2);
    expect(props.activityTotal).toBe(21);

    act(() => props.onActivityFilterChange("COMMENT"));
    expect((globalThis as Record<string, any>).__lastDetailsProps.activityFilter).toBe("COMMENT");
  });
});
