import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiRequest } from "@lib/apiClient";
import {
  mapGoalResponse,
  mapGoalCheckInResponse,
  mapGoalLinkResponse,
  mapGoalDetailResponse,
  queryGoals,
  getGoal,
  getGoalDetail,
  createGoal,
  updateGoal,
  pauseGoal,
  completeGoal,
  archiveGoal,
  restoreGoal,
  deleteGoal,
  recordCheckIn,
  getCheckIns,
  deleteCheckIn,
  addGoalLink,
  getGoalLinks,
  deleteGoalLink,
  type GoalResponseDto,
  type GoalQueryResponseDto,
  type GoalCheckInResponseDto,
  type GoalLinkResponseDto,
} from "../api/goalsApi";

vi.mock("@lib/apiClient", () => ({
  apiRequest: vi.fn(),
}));

const mockApiRequest = vi.mocked(apiRequest);

const MOCK_GOAL_DTO: GoalResponseDto = {
  id: "goal-123",
  userId: "user-456",
  title: "Read 12 Books",
  description: "Read 1 book per month",
  category: "LEARNING",
  progressType: "NUMERIC",
  targetValue: 12,
  currentValue: 4,
  unit: "books",
  targetDate: "2026-12-31",
  status: "IN_PROGRESS",
  checkInCadence: "MONTHLY",
  archived: false,
  progressPercentage: 33,
  createdAt: "2026-08-01T10:00:00Z",
  updatedAt: "2026-08-20T12:00:00Z",
  version: 2,
};

const MOCK_CHECKIN_DTO: GoalCheckInResponseDto = {
  id: "checkin-1",
  goalId: "goal-123",
  userId: "user-456",
  value: 4,
  note: "Finished book 4",
  recordedAt: "2026-08-20T12:00:00Z",
  createdAt: "2026-08-20T12:00:00Z",
};

const MOCK_LINK_DTO: GoalLinkResponseDto = {
  id: "link-1",
  goalId: "goal-123",
  userId: "user-456",
  targetType: "PROJECT",
  targetId: "proj-1",
  targetTitle: "Reading List App",
  targetStatus: "ACTIVE",
  createdAt: "2026-08-01T10:00:00Z",
};

describe("goalsApi", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("mappers", () => {
    it("maps GoalResponseDto to Goal domain model", () => {
      const goal = mapGoalResponse(MOCK_GOAL_DTO);
      expect(goal.id).toBe("goal-123");
      expect(goal.title).toBe("Read 12 Books");
      expect(goal.progressType).toBe("NUMERIC");
      expect(goal.targetValue).toBe(12);
      expect(goal.currentValue).toBe(4);
      expect(goal.unit).toBe("books");
      expect(goal.status).toBe("IN_PROGRESS");
      expect(goal.version).toBe(2);
    });

    it("maps GoalCheckInResponseDto to GoalCheckIn domain model", () => {
      const checkIn = mapGoalCheckInResponse(MOCK_CHECKIN_DTO);
      expect(checkIn.id).toBe("checkin-1");
      expect(checkIn.goalId).toBe("goal-123");
      expect(checkIn.value).toBe(4);
      expect(checkIn.note).toBe("Finished book 4");
    });

    it("maps GoalLinkResponseDto to GoalLink domain model", () => {
      const link = mapGoalLinkResponse(MOCK_LINK_DTO);
      expect(link.id).toBe("link-1");
      expect(link.targetType).toBe("PROJECT");
      expect(link.targetId).toBe("proj-1");
      expect(link.targetTitle).toBe("Reading List App");
    });

    it("maps GoalDetailResponseDto to GoalDetail domain model", () => {
      const detail = mapGoalDetailResponse({
        goal: MOCK_GOAL_DTO,
        progressPercentage: 33,
        checkIns: [MOCK_CHECKIN_DTO],
        links: [MOCK_LINK_DTO],
      });
      expect(detail.goal.id).toBe("goal-123");
      expect(detail.progressPercentage).toBe(33);
      expect(detail.checkIns).toHaveLength(1);
      expect(detail.links).toHaveLength(1);
    });
  });

  describe("queryGoals", () => {
    it("constructs correct query parameters and calls GET /goals", async () => {
      const mockQueryResponse: GoalQueryResponseDto = {
        page: {
          items: [MOCK_GOAL_DTO],
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
          averageProgressPercentage: 33,
        },
      };

      mockApiRequest.mockResolvedValueOnce(mockQueryResponse);

      const result = await queryGoals({
        q: "Read",
        status: ["IN_PROGRESS"],
        category: "LEARNING",
        progressType: ["NUMERIC"],
        archived: false,
        page: 0,
        size: 10,
        sortBy: "title",
        sortDirection: "ASC",
      });

      expect(mockApiRequest).toHaveBeenCalledWith(
        "/goals?q=Read&status=IN_PROGRESS&category=LEARNING&progressType=NUMERIC&archived=false&page=0&size=10&sortBy=title&sortDirection=ASC",
        { method: "GET" },
      );
      expect(result.items).toHaveLength(1);
      expect(result.summary.activeGoals).toBe(1);
      expect(result.summary.averageProgressPercentage).toBe(33);
    });

    it("defaults NaN average progress percentage to 0", async () => {
      const mockQueryResponse: GoalQueryResponseDto = {
        page: {
          items: [],
          page: 0,
          size: 10,
          totalItems: 0,
          totalPages: 0,
          first: true,
          last: true,
        },
        summary: {
          totalGoals: 0,
          activeGoals: 0,
          completedGoals: 0,
          pausedGoals: 0,
          archivedGoals: 0,
          averageProgressPercentage: Number.NaN,
        },
      };

      mockApiRequest.mockResolvedValueOnce(mockQueryResponse);

      const result = await queryGoals();
      expect(result.summary.averageProgressPercentage).toBe(0);
    });
  });

  describe("getGoal and getGoalDetail", () => {
    it("fetches single goal", async () => {
      mockApiRequest.mockResolvedValueOnce(MOCK_GOAL_DTO);
      const goal = await getGoal("goal-123");
      expect(mockApiRequest).toHaveBeenCalledWith("/goals/goal-123", { method: "GET" });
      expect(goal.id).toBe("goal-123");
    });

    it("fetches goal detail aggregate", async () => {
      mockApiRequest.mockResolvedValueOnce({
        goal: MOCK_GOAL_DTO,
        progressPercentage: 33,
        checkIns: [MOCK_CHECKIN_DTO],
        links: [MOCK_LINK_DTO],
      });
      const detail = await getGoalDetail("goal-123");
      expect(mockApiRequest).toHaveBeenCalledWith("/goals/goal-123/detail", { method: "GET" });
      expect(detail.goal.id).toBe("goal-123");
      expect(detail.checkIns).toHaveLength(1);
      expect(detail.links).toHaveLength(1);
    });
  });

  describe("lifecycle and mutations", () => {
    it("creates goal via POST /goals", async () => {
      mockApiRequest.mockResolvedValueOnce(MOCK_GOAL_DTO);
      const created = await createGoal({
        title: "Read 12 Books",
        category: "LEARNING",
        progressType: "NUMERIC",
        targetValue: 12,
      });
      expect(mockApiRequest).toHaveBeenCalledWith("/goals", {
        method: "POST",
        body: {
          title: "Read 12 Books",
          category: "LEARNING",
          progressType: "NUMERIC",
          targetValue: 12,
        },
      });
      expect(created.id).toBe("goal-123");
    });

    it("updates goal via PUT /goals/{id}", async () => {
      mockApiRequest.mockResolvedValueOnce({ ...MOCK_GOAL_DTO, version: 3 });
      const updated = await updateGoal("goal-123", {
        title: "Read 15 Books",
        category: "LEARNING",
        version: 2,
      });
      expect(mockApiRequest).toHaveBeenCalledWith("/goals/goal-123", {
        method: "PUT",
        body: {
          title: "Read 15 Books",
          category: "LEARNING",
          version: 2,
        },
      });
      expect(updated.version).toBe(3);
    });

    it("pauses goal via POST /goals/{id}/pause", async () => {
      mockApiRequest.mockResolvedValueOnce({ ...MOCK_GOAL_DTO, status: "PAUSED" });
      const paused = await pauseGoal("goal-123", { version: 2 });
      expect(mockApiRequest).toHaveBeenCalledWith("/goals/goal-123/pause", {
        method: "POST",
        body: { version: 2 },
      });
      expect(paused.status).toBe("PAUSED");
    });

    it("completes goal via POST /goals/{id}/complete", async () => {
      mockApiRequest.mockResolvedValueOnce({ ...MOCK_GOAL_DTO, status: "COMPLETED" });
      const completed = await completeGoal("goal-123", { version: 2 });
      expect(mockApiRequest).toHaveBeenCalledWith("/goals/goal-123/complete", {
        method: "POST",
        body: { version: 2 },
      });
      expect(completed.status).toBe("COMPLETED");
    });

    it("archives goal via POST /goals/{id}/archive", async () => {
      mockApiRequest.mockResolvedValueOnce({ ...MOCK_GOAL_DTO, archived: true });
      const archived = await archiveGoal("goal-123", { version: 2 });
      expect(mockApiRequest).toHaveBeenCalledWith("/goals/goal-123/archive", {
        method: "POST",
        body: { version: 2 },
      });
      expect(archived.archived).toBe(true);
    });

    it("restores goal via POST /goals/{id}/restore", async () => {
      mockApiRequest.mockResolvedValueOnce({ ...MOCK_GOAL_DTO, archived: false });
      const restored = await restoreGoal("goal-123", { version: 2 });
      expect(mockApiRequest).toHaveBeenCalledWith("/goals/goal-123/restore", {
        method: "POST",
        body: { version: 2 },
      });
      expect(restored.archived).toBe(false);
    });

    it("deletes goal via DELETE /goals/{id}", async () => {
      mockApiRequest.mockResolvedValueOnce(undefined);
      await deleteGoal("goal-123");
      expect(mockApiRequest).toHaveBeenCalledWith("/goals/goal-123", { method: "DELETE" });
    });
  });

  describe("check-ins and links endpoints", () => {
    it("records check-in via POST /goals/{id}/check-ins", async () => {
      mockApiRequest.mockResolvedValueOnce(MOCK_CHECKIN_DTO);
      const checkIn = await recordCheckIn("goal-123", { value: 4, note: "Done" });
      expect(mockApiRequest).toHaveBeenCalledWith("/goals/goal-123/check-ins", {
        method: "POST",
        body: { value: 4, note: "Done" },
      });
      expect(checkIn.id).toBe("checkin-1");
    });

    it("lists check-ins via GET /goals/{id}/check-ins", async () => {
      mockApiRequest.mockResolvedValueOnce({
        items: [MOCK_CHECKIN_DTO],
        page: 0,
        size: 20,
        totalItems: 1,
        totalPages: 1,
        first: true,
        last: true,
      });
      const res = await getCheckIns("goal-123", 0, 20);
      expect(mockApiRequest).toHaveBeenCalledWith("/goals/goal-123/check-ins?page=0&size=20", {
        method: "GET",
      });
      expect(res.items).toHaveLength(1);
    });

    it("deletes check-in via DELETE /goals/{id}/check-ins/{checkInId}", async () => {
      mockApiRequest.mockResolvedValueOnce(undefined);
      await deleteCheckIn("goal-123", "checkin-1");
      expect(mockApiRequest).toHaveBeenCalledWith("/goals/goal-123/check-ins/checkin-1", {
        method: "DELETE",
      });
    });

    it("adds link via POST /goals/{id}/links", async () => {
      mockApiRequest.mockResolvedValueOnce(MOCK_LINK_DTO);
      const link = await addGoalLink("goal-123", { targetType: "PROJECT", targetId: "proj-1" });
      expect(mockApiRequest).toHaveBeenCalledWith("/goals/goal-123/links", {
        method: "POST",
        body: { targetType: "PROJECT", targetId: "proj-1" },
      });
      expect(link.id).toBe("link-1");
    });

    it("lists links via GET /goals/{id}/links", async () => {
      mockApiRequest.mockResolvedValueOnce([MOCK_LINK_DTO]);
      const links = await getGoalLinks("goal-123");
      expect(mockApiRequest).toHaveBeenCalledWith("/goals/goal-123/links", { method: "GET" });
      expect(links).toHaveLength(1);
    });

    it("deletes link via DELETE /goals/{id}/links/{linkId}", async () => {
      mockApiRequest.mockResolvedValueOnce(undefined);
      await deleteGoalLink("goal-123", "link-1");
      expect(mockApiRequest).toHaveBeenCalledWith("/goals/goal-123/links/link-1", {
        method: "DELETE",
      });
    });
  });
});
