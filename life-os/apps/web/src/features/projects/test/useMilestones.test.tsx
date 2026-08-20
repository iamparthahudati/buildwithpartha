import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  useMilestones,
  useCreateMilestone,
  useUpdateMilestone,
  useUpdateMilestoneStatus,
  useDeleteMilestone,
} from "../index";
import * as milestonesApi from "../api/milestonesApi";
import type { Milestone } from "../model/milestone";

vi.mock("../api/milestonesApi", () => ({
  getMilestones: vi.fn(),
  createMilestone: vi.fn(),
  updateMilestone: vi.fn(),
  updateMilestoneStatus: vi.fn(),
  deleteMilestone: vi.fn(),
  mapMilestoneResponse: vi.fn(),
}));

const mockGetMilestones = vi.mocked(milestonesApi.getMilestones);
const mockCreateMilestone = vi.mocked(milestonesApi.createMilestone);
const mockUpdateMilestone = vi.mocked(milestonesApi.updateMilestone);
const mockUpdateMilestoneStatus = vi.mocked(milestonesApi.updateMilestoneStatus);
const mockDeleteMilestone = vi.mocked(milestonesApi.deleteMilestone);

const MOCK_MILESTONE: Milestone = {
  id: "m-101",
  projectId: "proj-101",
  title: "Phase 1 Beta",
  date: "2026-08-30",
  status: "PLANNED",
  ordering: 1,
  createdAt: "2026-08-01T10:00:00Z",
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

describe("useMilestones and mutations", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("useMilestones", () => {
    it("fetches milestones for project", async () => {
      mockGetMilestones.mockResolvedValueOnce([MOCK_MILESTONE]);

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useMilestones("proj-101"), { wrapper: Wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0]?.title).toBe("Phase 1 Beta");
    });
  });

  describe("useCreateMilestone", () => {
    it("calls createMilestone and invalidates query cache", async () => {
      mockCreateMilestone.mockResolvedValueOnce(MOCK_MILESTONE);

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCreateMilestone(), { wrapper: Wrapper });

      result.current.mutate({
        projectId: "proj-101",
        request: { title: "Phase 1 Beta", status: "PLANNED" },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockCreateMilestone).toHaveBeenCalledWith("proj-101", {
        title: "Phase 1 Beta",
        status: "PLANNED",
      });
    });
  });

  describe("useUpdateMilestone", () => {
    it("calls updateMilestone and invalidates query cache", async () => {
      mockUpdateMilestone.mockResolvedValueOnce({ ...MOCK_MILESTONE, title: "Updated Title" });

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useUpdateMilestone(), { wrapper: Wrapper });

      result.current.mutate({
        projectId: "proj-101",
        milestoneId: "m-101",
        request: { title: "Updated Title", version: 1 },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockUpdateMilestone).toHaveBeenCalledWith("proj-101", "m-101", {
        title: "Updated Title",
        version: 1,
      });
    });
  });

  describe("useUpdateMilestoneStatus", () => {
    it("calls updateMilestoneStatus and invalidates cache", async () => {
      mockUpdateMilestoneStatus.mockResolvedValueOnce({
        ...MOCK_MILESTONE,
        status: "COMPLETED",
      });

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useUpdateMilestoneStatus(), { wrapper: Wrapper });

      result.current.mutate({
        projectId: "proj-101",
        milestoneId: "m-101",
        request: { status: "COMPLETED", version: 1 },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockUpdateMilestoneStatus).toHaveBeenCalledWith("proj-101", "m-101", {
        status: "COMPLETED",
        version: 1,
      });
    });
  });

  describe("useDeleteMilestone", () => {
    it("calls deleteMilestone and invalidates cache", async () => {
      mockDeleteMilestone.mockResolvedValueOnce(undefined);

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useDeleteMilestone(), { wrapper: Wrapper });

      result.current.mutate({ projectId: "proj-101", milestoneId: "m-101" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockDeleteMilestone).toHaveBeenCalledWith("proj-101", "m-101");
    });
  });
});
