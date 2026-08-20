import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  useProjects,
  useCreateProject,
  useUpdateProject,
  useArchiveProject,
  useRestoreProject,
  useDeleteProject,
} from "../index";
import * as projectsApi from "../api/projectsApi";
import type { Project } from "../model/project";

vi.mock("../api/projectsApi", () => ({
  queryProjects: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  archiveProject: vi.fn(),
  restoreProject: vi.fn(),
  deleteProject: vi.fn(),
  getProject: vi.fn(),
  mapProjectResponse: vi.fn(),
}));

const mockQueryProjects = vi.mocked(projectsApi.queryProjects);
const mockCreateProject = vi.mocked(projectsApi.createProject);
const mockUpdateProject = vi.mocked(projectsApi.updateProject);
const mockArchiveProject = vi.mocked(projectsApi.archiveProject);
const mockRestoreProject = vi.mocked(projectsApi.restoreProject);
const mockDeleteProject = vi.mocked(projectsApi.deleteProject);

const MOCK_PROJECT: Project = {
  id: "proj-101",
  name: "Hook Test Project",
  description: "Description",
  status: "ACTIVE",
  priority: "P1",
  health: "ON_TRACK",
  color: "blue",
  icon: "rocket",
  startDate: "2026-08-01",
  deadlineDate: "2026-08-31",
  completedTasksCount: 2,
  totalTasksCount: 5,
  updatedAt: "2026-08-20T12:00:00Z",
  version: 1,
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, Wrapper };
}

describe("useProjects and mutations", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("useProjects", () => {
    it("fetches projects and returns items, page, and summary", async () => {
      mockQueryProjects.mockResolvedValueOnce({
        items: [MOCK_PROJECT],
        page: {
          items: [],
          page: 0,
          size: 6,
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
      });

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useProjects({ page: 0 }), { wrapper: Wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.items).toHaveLength(1);
      expect(result.current.data?.items[0]?.name).toBe("Hook Test Project");
      expect(result.current.data?.summary?.total).toBe(1);
    });
  });

  describe("useCreateProject", () => {
    it("calls createProject and invalidates projects cache", async () => {
      mockCreateProject.mockResolvedValueOnce(MOCK_PROJECT);

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCreateProject(), { wrapper: Wrapper });

      result.current.mutate({
        name: "New Project",
        status: "ACTIVE",
        priority: "P1",
        health: "ON_TRACK",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockCreateProject).toHaveBeenCalledWith({
        name: "New Project",
        status: "ACTIVE",
        priority: "P1",
        health: "ON_TRACK",
      });
    });
  });

  describe("useUpdateProject", () => {
    it("calls updateProject and invalidates cache", async () => {
      mockUpdateProject.mockResolvedValueOnce({ ...MOCK_PROJECT, name: "Updated" });

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useUpdateProject(), { wrapper: Wrapper });

      result.current.mutate({
        id: "proj-101",
        request: { name: "Updated", version: 1 },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockUpdateProject).toHaveBeenCalledWith("proj-101", {
        name: "Updated",
        version: 1,
      });
    });
  });

  describe("useArchiveProject", () => {
    it("calls archiveProject", async () => {
      mockArchiveProject.mockResolvedValueOnce({
        ...MOCK_PROJECT,
        archivedAt: "2026-08-20T12:00:00Z",
      });

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useArchiveProject(), { wrapper: Wrapper });

      result.current.mutate({
        id: "proj-101",
        request: { version: 1 },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockArchiveProject).toHaveBeenCalledWith("proj-101", { version: 1 });
    });
  });

  describe("useRestoreProject", () => {
    it("calls restoreProject", async () => {
      mockRestoreProject.mockResolvedValueOnce(MOCK_PROJECT);

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useRestoreProject(), { wrapper: Wrapper });

      result.current.mutate({
        id: "proj-101",
        request: { version: 1 },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockRestoreProject).toHaveBeenCalledWith("proj-101", { version: 1 });
    });
  });

  describe("useDeleteProject", () => {
    it("calls deleteProject", async () => {
      mockDeleteProject.mockResolvedValueOnce(undefined);

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useDeleteProject(), { wrapper: Wrapper });

      result.current.mutate("proj-101");

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockDeleteProject).toHaveBeenCalledWith("proj-101");
    });
  });
});
