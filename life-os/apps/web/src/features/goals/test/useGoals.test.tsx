import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  useGoals,
  useGoal,
  useGoalDetail,
  useCreateGoal,
  useUpdateGoal,
  usePauseGoal,
  useCompleteGoal,
  useArchiveGoal,
  useRestoreGoal,
  useDeleteGoal,
  useRecordCheckIn,
  useDeleteCheckIn,
  useAddGoalLink,
  useDeleteGoalLink,
} from "../index";
import * as goalsApi from "../api/goalsApi";
import type { Goal } from "../model/goal";

vi.mock("../api/goalsApi", () => ({
  queryGoals: vi.fn(),
  getGoal: vi.fn(),
  getGoalDetail: vi.fn(),
  createGoal: vi.fn(),
  updateGoal: vi.fn(),
  pauseGoal: vi.fn(),
  completeGoal: vi.fn(),
  archiveGoal: vi.fn(),
  restoreGoal: vi.fn(),
  deleteGoal: vi.fn(),
  recordCheckIn: vi.fn(),
  getCheckIns: vi.fn(),
  deleteCheckIn: vi.fn(),
  addGoalLink: vi.fn(),
  getGoalLinks: vi.fn(),
  deleteGoalLink: vi.fn(),
  mapGoalResponse: vi.fn(),
  mapGoalCheckInResponse: vi.fn(),
  mapGoalLinkResponse: vi.fn(),
  mapGoalDetailResponse: vi.fn(),
  mapGoalSummary: vi.fn(),
}));

const mockQueryGoals = vi.mocked(goalsApi.queryGoals);
const mockGetGoal = vi.mocked(goalsApi.getGoal);
const mockGetGoalDetail = vi.mocked(goalsApi.getGoalDetail);
const mockCreateGoal = vi.mocked(goalsApi.createGoal);
const mockUpdateGoal = vi.mocked(goalsApi.updateGoal);
const mockPauseGoal = vi.mocked(goalsApi.pauseGoal);
const mockCompleteGoal = vi.mocked(goalsApi.completeGoal);
const mockArchiveGoal = vi.mocked(goalsApi.archiveGoal);
const mockRestoreGoal = vi.mocked(goalsApi.restoreGoal);
const mockDeleteGoal = vi.mocked(goalsApi.deleteGoal);
const mockRecordCheckIn = vi.mocked(goalsApi.recordCheckIn);
const mockDeleteCheckIn = vi.mocked(goalsApi.deleteCheckIn);
const mockAddGoalLink = vi.mocked(goalsApi.addGoalLink);
const mockDeleteGoalLink = vi.mocked(goalsApi.deleteGoalLink);

const MOCK_GOAL: Goal = {
  id: "goal-101",
  userId: "user-1",
  title: "Run 100km",
  description: "Cardio goal",
  category: "HEALTH",
  progressType: "NUMERIC",
  targetValue: 100,
  currentValue: 25,
  unit: "km",
  targetDate: "2026-12-31",
  status: "IN_PROGRESS",
  checkInCadence: "WEEKLY",
  archived: false,
  progressPercentage: 25,
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

describe("useGoals and mutations", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("useGoals", () => {
    it("fetches goals and summary counts", async () => {
      mockQueryGoals.mockResolvedValueOnce({
        items: [MOCK_GOAL],
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
          totalGoals: 1,
          activeGoals: 1,
          completedGoals: 0,
          pausedGoals: 0,
          archivedGoals: 0,
          averageProgressPercentage: 25,
        },
      });

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useGoals({ page: 0 }), { wrapper: Wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.items).toHaveLength(1);
      expect(result.current.data?.items[0]?.title).toBe("Run 100km");
      expect(result.current.data?.summary?.totalGoals).toBe(1);
    });
  });

  describe("useGoal and useGoalDetail", () => {
    it("fetches single goal", async () => {
      mockGetGoal.mockResolvedValueOnce(MOCK_GOAL);
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useGoal("goal-101"), { wrapper: Wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.id).toBe("goal-101");
    });

    it("fetches goal detail", async () => {
      mockGetGoalDetail.mockResolvedValueOnce({
        goal: MOCK_GOAL,
        progressPercentage: 25,
        checkIns: [],
        links: [],
      });
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useGoalDetail("goal-101"), { wrapper: Wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.goal.title).toBe("Run 100km");
    });
  });

  describe("mutations", () => {
    it("creates goal", async () => {
      mockCreateGoal.mockResolvedValueOnce(MOCK_GOAL);
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCreateGoal(), { wrapper: Wrapper });

      result.current.mutate({ title: "Run 100km", category: "HEALTH" });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockCreateGoal).toHaveBeenCalled();
    });

    it("updates goal", async () => {
      mockUpdateGoal.mockResolvedValueOnce({ ...MOCK_GOAL, title: "Updated" });
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useUpdateGoal(), { wrapper: Wrapper });

      result.current.mutate({
        id: "goal-101",
        request: { title: "Updated", category: "HEALTH", version: 1 },
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockUpdateGoal).toHaveBeenCalledWith("goal-101", {
        title: "Updated",
        category: "HEALTH",
        version: 1,
      });
    });

    it("pauses goal", async () => {
      mockPauseGoal.mockResolvedValueOnce({ ...MOCK_GOAL, status: "PAUSED" });
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => usePauseGoal(), { wrapper: Wrapper });

      result.current.mutate({ id: "goal-101", request: { version: 1 } });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockPauseGoal).toHaveBeenCalledWith("goal-101", { version: 1 });
    });

    it("completes goal", async () => {
      mockCompleteGoal.mockResolvedValueOnce({ ...MOCK_GOAL, status: "COMPLETED" });
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCompleteGoal(), { wrapper: Wrapper });

      result.current.mutate({ id: "goal-101", request: { version: 1 } });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockCompleteGoal).toHaveBeenCalledWith("goal-101", { version: 1 });
    });

    it("archives goal", async () => {
      mockArchiveGoal.mockResolvedValueOnce({ ...MOCK_GOAL, archived: true });
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useArchiveGoal(), { wrapper: Wrapper });

      result.current.mutate({ id: "goal-101", request: { version: 1 } });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockArchiveGoal).toHaveBeenCalledWith("goal-101", { version: 1 });
    });

    it("restores goal", async () => {
      mockRestoreGoal.mockResolvedValueOnce({ ...MOCK_GOAL, archived: false });
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useRestoreGoal(), { wrapper: Wrapper });

      result.current.mutate({ id: "goal-101", request: { version: 1 } });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockRestoreGoal).toHaveBeenCalledWith("goal-101", { version: 1 });
    });

    it("deletes goal", async () => {
      mockDeleteGoal.mockResolvedValueOnce(undefined);
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useDeleteGoal(), { wrapper: Wrapper });

      result.current.mutate("goal-101");
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockDeleteGoal).toHaveBeenCalledWith("goal-101");
    });

    it("records check-in", async () => {
      mockRecordCheckIn.mockResolvedValueOnce({
        id: "check-1",
        goalId: "goal-101",
        userId: "user-1",
        value: 30,
        recordedAt: "2026-08-25T10:00:00Z",
      });
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useRecordCheckIn(), { wrapper: Wrapper });

      result.current.mutate({ goalId: "goal-101", request: { value: 30 } });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockRecordCheckIn).toHaveBeenCalledWith("goal-101", { value: 30 });
    });

    it("deletes check-in", async () => {
      mockDeleteCheckIn.mockResolvedValueOnce(undefined);
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useDeleteCheckIn(), { wrapper: Wrapper });

      result.current.mutate({ goalId: "goal-101", checkInId: "check-1" });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockDeleteCheckIn).toHaveBeenCalledWith("goal-101", "check-1");
    });

    it("adds goal link", async () => {
      mockAddGoalLink.mockResolvedValueOnce({
        id: "link-1",
        goalId: "goal-101",
        userId: "user-1",
        targetType: "PROJECT",
        targetId: "proj-1",
      });
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useAddGoalLink(), { wrapper: Wrapper });

      result.current.mutate({
        goalId: "goal-101",
        request: { targetType: "PROJECT", targetId: "proj-1" },
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAddGoalLink).toHaveBeenCalledWith("goal-101", {
        targetType: "PROJECT",
        targetId: "proj-1",
      });
    });

    it("deletes goal link", async () => {
      mockDeleteGoalLink.mockResolvedValueOnce(undefined);
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useDeleteGoalLink(), { wrapper: Wrapper });

      result.current.mutate({ goalId: "goal-101", linkId: "link-1" });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockDeleteGoalLink).toHaveBeenCalledWith("goal-101", "link-1");
    });
  });
});
