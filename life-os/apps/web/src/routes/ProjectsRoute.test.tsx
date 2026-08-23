import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProjectsRoute } from "./ProjectsRoute";
import * as projectsFeature from "@features/projects";
import { AuthSessionContext, type AuthSessionValue } from "@state/authSession";

vi.mock("@features/projects", async () => {
  const actual = await vi.importActual<typeof projectsFeature>("@features/projects");
  return {
    ...actual,
    useProjects: vi.fn(),
    useCreateProject: vi.fn(),
    useUpdateProject: vi.fn(),
    useArchiveProject: vi.fn(),
    useRestoreProject: vi.fn(),
    useDeleteProject: vi.fn(),
  };
});

const mockUseProjects = vi.mocked(projectsFeature.useProjects);
const mockUseCreateProject = vi.mocked(projectsFeature.useCreateProject);
const mockUseUpdateProject = vi.mocked(projectsFeature.useUpdateProject);
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

const MOCK_PROJECT_1: projectsFeature.Project = {
  id: "proj-1",
  name: "Launch Platform v1",
  description: "Deploy foundations",
  status: "ACTIVE",
  priority: "P1",
  health: "ON_TRACK",
  color: "blue",
  icon: "rocket",
  startDate: "2026-08-01",
  deadlineDate: "2026-08-30",
  completedTasksCount: 4,
  totalTasksCount: 10,
  updatedAt: "2026-08-20T12:00:00Z",
  version: 1,
};

function renderProjectsRoute(initialEntries = ["/life-os/app/projects"]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthSessionContext.Provider value={MOCK_AUTH_STATE}>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/life-os/app/projects" element={<ProjectsRoute />} />
          </Routes>
        </MemoryRouter>
      </AuthSessionContext.Provider>
    </QueryClientProvider>,
  );
}

describe("ProjectsRoute", () => {
  const mockMutateAsync = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();

    mockUseProjects.mockReturnValue({
      data: {
        items: [MOCK_PROJECT_1],
        page: {
          items: [],
          page: 0,
          size: 10,
          totalItems: 1,
          totalPages: 1,
          first: true,
          last: true,
        },
        summary: {
          total: 1,
          active: 1,
          completed: 0,
          onHold: 0,
          atRisk: 0,
          averageProgress: 40,
        },
      },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    mockUseCreateProject.mockReturnValue({ mutateAsync: mockMutateAsync } as any);
    mockUseUpdateProject.mockReturnValue({ mutateAsync: mockMutateAsync } as any);
    mockUseArchiveProject.mockReturnValue({ mutateAsync: mockMutateAsync } as any);
    mockUseRestoreProject.mockReturnValue({ mutateAsync: mockMutateAsync } as any);
    mockUseDeleteProject.mockReturnValue({ mutateAsync: mockMutateAsync } as any);
  });

  it("renders Projects screen with header and API project cards", () => {
    renderProjectsRoute();

    expect(screen.getByRole("heading", { name: "Projects", level: 1 })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open project: Launch Platform v1" }),
    ).toBeInTheDocument();
  });

  it("passes parsed URL params to useProjects query hook", () => {
    renderProjectsRoute([
      "/life-os/app/projects?status=ACTIVE&q=Platform&priority=P1&health=ON_TRACK&sort=name&dir=asc&page=2",
    ]);

    expect(mockUseProjects).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ["ACTIVE"],
        q: "Platform",
        priority: ["P1"],
        health: ["ON_TRACK"],
        sortBy: "name",
        sortDirection: "ASC",
        page: 1,
        size: 10,
      }),
      true,
    );
  });

  it("updates URL parameters when status tab is selected", async () => {
    const user = userEvent.setup();
    renderProjectsRoute();

    const activeTab = screen.getByRole("tab", { name: "Active" });
    await user.click(activeTab);

    await waitFor(() => {
      expect(mockUseProjects).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ["ACTIVE"],
        }),
        true,
      );
    });
  });

  it("renders detail panel when selected query param is present", () => {
    renderProjectsRoute(["/life-os/app/projects?selected=proj-1"]);

    expect(screen.getByRole("heading", { name: "Launch Platform v1" })).toBeInTheDocument();
    expect(screen.getAllByText("Deploy foundations").length).toBeGreaterThan(0);
  });

  it("renders loading skeletons when query is pending", () => {
    mockUseProjects.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderProjectsRoute();

    expect(screen.getByTestId("projects-loading")).toBeInTheDocument();
  });

  it("renders error state when query fails and triggers retry on click", async () => {
    const mockRefetch = vi.fn();
    mockUseProjects.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error("Network error fetching projects"),
      refetch: mockRefetch,
    } as any);

    const user = userEvent.setup();
    renderProjectsRoute();

    expect(screen.getByRole("heading", { name: "Failed to load projects" })).toBeInTheDocument();
    expect(screen.getAllByText("Network error fetching projects").length).toBeGreaterThan(0);

    const retryBtns = screen.getAllByRole("button", { name: "Try again" });
    expect(retryBtns[0]).toBeDefined();
    await user.click(retryBtns[0]!);

    expect(mockRefetch).toHaveBeenCalled();
  });
});
